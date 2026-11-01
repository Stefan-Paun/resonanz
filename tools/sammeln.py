"""Sammler: holt Hörgewohnheiten aus Spotify und Genres/Herkunft aus MusicBrainz,
schreibt data/snapshot.json (anonym: kein Anzeigename, keine Playlists, keine E-Mail).

    python3 tools/sammeln.py login     Browser-Login per PKCE, Token in tools/token.json (gitignored)
    python3 tools/sammeln.py           Schnappschuss ziehen (nutzt den gespeicherten Token)
    python3 tools/sammeln.py --ohne-mb Schnappschuss ohne MusicBrainz (schneller, keine Genres)
    python3 tools/sammeln.py --mit-zeiten  Uhrzeiten der zuletzt gehörten Songs behalten (Standard: weg, öffentlich zu privat)
    python3 tools/sammeln.py --nur-ueberschreiben  data/ueberschreibungen.json neu anwenden, ohne Netz

Client-ID: Umgebungsvariable SPOTIFY_CLIENT_ID. Die ID gehört nie ins Repo.
Nur Standardbibliothek, läuft mit Python 3.9+.
"""
from __future__ import annotations

import base64
import hashlib
import http.server
import json
import os
import secrets
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser

HIER = os.path.dirname(os.path.abspath(__file__))
WURZEL = os.path.dirname(HIER)
TOKEN_DATEI = os.path.join(HIER, "token.json")
SNAPSHOT = os.path.join(WURZEL, "data", "snapshot.json")
MB_CACHE = os.path.join(WURZEL, "data", "roh", "musicbrainz-cache.json")

REDIRECT = "http://127.0.0.1:8888/callback"
SCOPES = "user-top-read user-read-recently-played"
API = "https://api.spotify.com/v1"
UA = "Resonanz/0.1 (https://github.com/Stefan-Paun/resonanz)"
ZEITRAEUME = {"short_term": "4w", "medium_term": "6m", "long_term": "1y"}


def client_id() -> str:
    cid = os.environ.get("SPOTIFY_CLIENT_ID", "").strip()
    if not cid:
        sys.exit("SPOTIFY_CLIENT_ID fehlt (export SPOTIFY_CLIENT_ID=...).")
    return cid


# ---------------------------------------------------------------- HTTP

def _req(method: str, url: str, daten: dict | None = None, kopf: dict | None = None, form=False):
    body = None
    h = {"User-Agent": UA, **(kopf or {})}
    if daten is not None:
        if form:
            body = urllib.parse.urlencode(daten).encode()
            h["Content-Type"] = "application/x-www-form-urlencoded"
        else:
            body = json.dumps(daten).encode()
            h["Content-Type"] = "application/json"
    r = urllib.request.Request(url, data=body, method=method, headers=h)
    return urllib.request.urlopen(r, timeout=30)


def _json(method, url, **kw):
    for versuch in range(4):
        try:
            with _req(method, url, **kw) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(int(e.headers.get("Retry-After", 2)) + 1)
                continue
            raise
    raise RuntimeError("zu oft 429: " + url)


# ---------------------------------------------------------------- Login (PKCE)

def login() -> None:
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    state = secrets.token_urlsafe(16)
    url = "https://accounts.spotify.com/authorize?" + urllib.parse.urlencode({
        "client_id": client_id(), "response_type": "code", "redirect_uri": REDIRECT, "scope": SCOPES,
        "code_challenge_method": "S256", "code_challenge": challenge, "state": state})
    ergebnis: dict = {}

    class H(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            ergebnis.update({k: v[0] for k, v in q.items()})
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write("<p style='font:16px system-ui'>Danke, du kannst das Fenster schließen.</p>".encode())

        def log_message(self, *a):
            pass

    srv = http.server.HTTPServer(("127.0.0.1", 8888), H)
    print("Browser öffnet sich für den Spotify-Login …")
    webbrowser.open(url)
    while "code" not in ergebnis and "error" not in ergebnis:
        srv.handle_request()
    srv.server_close()
    if ergebnis.get("state") != state or "code" not in ergebnis:
        sys.exit("Login abgebrochen: " + str(ergebnis.get("error", "state passt nicht")))
    tok = _json("POST", "https://accounts.spotify.com/api/token", daten={
        "grant_type": "authorization_code", "code": ergebnis["code"], "redirect_uri": REDIRECT,
        "client_id": client_id(), "code_verifier": verifier}, form=True)
    tok["expires_at"] = time.time() + tok["expires_in"] - 60
    _token_speichern(tok)
    print("Token gespeichert in", TOKEN_DATEI)


def _token_speichern(tok: dict) -> None:
    tmp = TOKEN_DATEI + ".tmp"
    with os.fdopen(os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), "w") as f:
        json.dump(tok, f)
    os.replace(tmp, TOKEN_DATEI)


def token() -> str:
    if not os.path.exists(TOKEN_DATEI):
        sys.exit("Kein Token. Zuerst: python3 tools/sammeln.py login")
    tok = json.load(open(TOKEN_DATEI))
    if time.time() > tok["expires_at"]:
        neu = _json("POST", "https://accounts.spotify.com/api/token", daten={
            "grant_type": "refresh_token", "refresh_token": tok["refresh_token"], "client_id": client_id()}, form=True)
        tok.update(neu)
        tok["expires_at"] = time.time() + neu["expires_in"] - 60
        _token_speichern(tok)
    return tok["access_token"]


def spotify(pfad: str, **params):
    url = API + pfad + ("?" + urllib.parse.urlencode(params) if params else "")
    return _json("GET", url, kopf={"Authorization": "Bearer " + token()})


# ---------------------------------------------------------------- Spotify → Rohdaten

def _bild(images: list) -> str | None:
    """Kleinstes Bild ab 160 px, sonst das kleinste vorhandene (Spotify-CDN, nur verlinkt)."""
    if not images:
        return None
    passend = [i for i in images if (i.get("width") or 0) >= 160]
    return (min(passend, key=lambda i: i["width"]) if passend else images[-1])["url"]


def _track(t: dict) -> dict:
    return {
        "id": t["id"], "name": t["name"],
        "kuenstler": [{"id": a["id"], "name": a["name"]} for a in t["artists"]],
        "album": t["album"]["name"], "cover": _bild(t["album"].get("images", [])),
        "dauer_ms": t["duration_ms"], "erschienen": t["album"].get("release_date"),
        "url": t["external_urls"].get("spotify"),
    }


def sammeln(mit_mb: bool = True, mit_zeiten: bool = False) -> dict:
    out: dict = {"erstellt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "quelle": "spotify+musicbrainz",
                 "zeitraeume": {}, "kuenstler": {}, "zuletzt": []}
    for rng, kurz in ZEITRAEUME.items():
        a = spotify("/me/top/artists", limit=50, time_range=rng)["items"]
        t = spotify("/me/top/tracks", limit=50, time_range=rng)["items"]
        out["zeitraeume"][kurz] = {
            "kuenstler": [x["id"] for x in a],
            "songs": [_track(x) for x in t],
        }
        for x in a:
            out["kuenstler"].setdefault(x["id"], {"name": x["name"], "bild": _bild(x.get("images", [])),
                                                   "url": x["external_urls"].get("spotify")})
        for x in t:
            for k in x["artists"]:
                out["kuenstler"].setdefault(k["id"], {"name": k["name"], "bild": None, "url": None})
        print(f"  {kurz}: {len(a)} Künstler, {len(t)} Songs")
    rp = spotify("/me/player/recently-played", limit=50)["items"]
    # Uhrzeiten verraten den Tagesrhythmus; öffentlich bleibt nur die Songliste.
    out["zuletzt"] = [{"song": _track(x["track"]), "um": x["played_at"] if mit_zeiten else None} for x in rp]
    print(f"  zuletzt gehört: {len(rp)}")
    if mit_mb:
        musicbrainz_ergaenzen(out["kuenstler"])
    ueberschreibungen_anwenden(out["kuenstler"])
    return out


# ---------------------------------------------------------------- MusicBrainz

def musicbrainz_ergaenzen(kuenstler: dict) -> None:
    """Genre-Tags und Land pro Künstler, mit Cache (1 Anfrage pro Sekunde, wie MusicBrainz es verlangt)."""
    os.makedirs(os.path.dirname(MB_CACHE), exist_ok=True)
    cache = json.load(open(MB_CACHE)) if os.path.exists(MB_CACHE) else {}
    offen = [k for k in kuenstler.values() if k["name"] not in cache]
    print(f"  MusicBrainz: {len(offen)} neu, {len(kuenstler) - len(offen)} aus Cache")
    for i, k in enumerate(offen, 1):
        name = k["name"].replace("\\", " ").replace('"', " ")
        q = urllib.parse.urlencode({"query": f'artist:"{name}"', "fmt": "json", "limit": 3})
        a, fehler = None, None
        for versuch in range(4):
            try:
                d = _json("GET", "https://musicbrainz.org/ws/2/artist?" + q)
                treffer = [x for x in d.get("artists", []) if x["name"].lower() == k["name"].lower()] or d.get("artists", [])
                a = treffer[0] if treffer else None
                fehler = None
                break
            except urllib.error.HTTPError as e:  # 503 = MusicBrainz ist gerade ausgelastet, kurz warten
                fehler = e.code
                if e.code in (429, 503):
                    time.sleep(3 * (versuch + 1))
                    continue
                break
            except Exception as e:
                fehler = type(e).__name__
                time.sleep(3)
        if fehler is not None:  # nicht cachen, beim nächsten Lauf nochmal versuchen
            print("   ", k["name"], "->", fehler)
            time.sleep(1.1)
            continue
        if a and a.get("score", 0) >= 90:
            tags = sorted(a.get("tags", []), key=lambda t: -t["count"])
            cache[k["name"]] = {"tags": [t["name"] for t in tags[:8]], "land": a.get("country"),
                                "gebiet": (a.get("area") or {}).get("name")}
        else:
            cache[k["name"]] = {"tags": [], "land": None, "gebiet": None}
        if i % 10 == 0:
            print(f"    {i}/{len(offen)}")
            json.dump(cache, open(MB_CACHE, "w"), ensure_ascii=False, indent=0)
        time.sleep(1.1)
    json.dump(cache, open(MB_CACHE, "w"), ensure_ascii=False, indent=0)
    for k in kuenstler.values():
        c = cache.get(k["name"], {})
        k["tags"] = c.get("tags", [])
        k["land"] = c.get("land")


def ueberschreibungen_anwenden(kuenstler: dict) -> None:
    """data/ueberschreibungen.json: Tags/Land für Künstler, die MusicBrainz nicht kennt (nach Name)."""
    pfad = os.path.join(WURZEL, "data", "ueberschreibungen.json")
    if not os.path.exists(pfad):
        return
    ueb = json.load(open(pfad))
    for k in kuenstler.values():
        u = ueb.get(k["name"])
        if u:
            k["tags"] = u.get("tags", k.get("tags", []))
            k["land"] = u.get("land", k.get("land"))


# ---------------------------------------------------------------- main

def main(argv: list[str]) -> None:
    if argv[1:2] == ["login"]:
        login()
        return
    if "--nur-ueberschreiben" in argv:  # Überschreibungen ohne Netz neu auf den Schnappschuss anwenden
        daten = json.load(open(SNAPSHOT, encoding="utf-8"))
        ueberschreibungen_anwenden(daten["kuenstler"])
    else:
        print("Sammle …")
        daten = sammeln(mit_mb="--ohne-mb" not in argv, mit_zeiten="--mit-zeiten" in argv)
    os.makedirs(os.path.dirname(SNAPSHOT), exist_ok=True)
    tmp = SNAPSHOT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(daten, f, ensure_ascii=False, indent=1)
    os.replace(tmp, SNAPSHOT)
    ohne = sum(1 for k in daten["kuenstler"].values() if not k.get("tags"))
    print(f"Fertig: {len(daten['kuenstler'])} Künstler ({ohne} ohne Tags), {SNAPSHOT}")


if __name__ == "__main__":
    main(sys.argv)
