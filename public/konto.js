// Eigenes Spotify-Konto im Browser: PKCE-Login, Schnappschuss ziehen, Genres von MusicBrainz.
// Nichts davon verlässt den Browser; der Token liegt nur in sessionStorage.

export const SCOPES = "user-top-read user-read-recently-played";
const API = "https://api.spotify.com/v1";
const ZEITRAEUME = { short_term: "4w", medium_term: "6m", long_term: "1y" };
const MB_CACHE_KEY = "resonanz.musicbrainz";

export function redirectUri() { return location.origin + location.pathname; }

function b64url(bytes) { return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function zufall(n = 64) { const a = new Uint8Array(n); crypto.getRandomValues(a); return b64url(a).slice(0, n); }

/** Leitet zu Spotify weiter. Verifier und State bleiben in sessionStorage. */
export async function loginStarten(clientId) {
  const verifier = zufall(64), state = zufall(16);
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  sessionStorage.setItem("resonanz.pkce", JSON.stringify({ verifier, state, clientId }));
  const url = "https://accounts.spotify.com/authorize?" + new URLSearchParams({
    client_id: clientId, response_type: "code", redirect_uri: redirectUri(), scope: SCOPES,
    code_challenge_method: "S256", code_challenge: challenge, state,
  });
  location.assign(url);
}

/** Nach der Rückkehr von Spotify: Code gegen Token tauschen. Gibt den Token zurück oder null. */
export async function rueckkehrVerarbeiten() {
  const q = new URLSearchParams(location.search);
  if (!q.has("code") && !q.has("error")) return null;
  const merk = JSON.parse(sessionStorage.getItem("resonanz.pkce") || "null");
  history.replaceState(null, "", redirectUri()); // Code aus der Adresszeile, bevor irgendwer ihn sieht
  sessionStorage.removeItem("resonanz.pkce");
  if (q.get("error")) throw new Error("Spotify hat abgelehnt: " + q.get("error"));
  if (!merk || merk.state !== q.get("state")) throw new Error("Der Login passt nicht zu dieser Sitzung (state). Bitte noch einmal.");
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code: q.get("code"), redirect_uri: redirectUri(), client_id: merk.clientId, code_verifier: merk.verifier }),
  });
  if (!r.ok) throw new Error("Token-Tausch fehlgeschlagen (" + r.status + "). Stimmt die Redirect-URI in deiner Spotify-App?");
  const tok = await r.json();
  tok.expires_at = Date.now() + tok.expires_in * 1000 - 60000;
  sessionStorage.setItem("resonanz.token", JSON.stringify(tok));
  return tok;
}

export function tokenLesen() {
  const t = JSON.parse(sessionStorage.getItem("resonanz.token") || "null");
  return t && t.expires_at > Date.now() ? t : null;
}

async function spotify(tok, pfad, params) {
  const r = await fetch(API + pfad + "?" + new URLSearchParams(params), { headers: { Authorization: "Bearer " + tok.access_token } });
  if (r.status === 429) { await new Promise((x) => setTimeout(x, (+r.headers.get("Retry-After") || 2) * 1000 + 500)); return spotify(tok, pfad, params); }
  if (r.status === 403) throw new Error("Spotify sagt 403: Dein Konto ist in der App nicht als Nutzer eingetragen (Development Mode, bis zu 5 Nutzer).");
  if (!r.ok) throw new Error("Spotify " + r.status + " bei " + pfad);
  return r.json();
}

const bild = (images) => { if (!images?.length) return null; const p = images.filter((i) => (i.width || 0) >= 160); return (p.length ? p.reduce((a, b) => (a.width < b.width ? a : b)) : images[images.length - 1]).url; };
const track = (t) => ({ id: t.id, name: t.name, kuenstler: t.artists.map((a) => ({ id: a.id, name: a.name })), album: t.album?.name || "", cover: bild(t.album?.images), dauer_ms: t.duration_ms, erschienen: t.album?.release_date || null, url: t.external_urls?.spotify || null });

/** Zieht denselben Schnappschuss wie tools/sammeln.py, nur im Browser. fortschritt(text) meldet den Stand. */
export async function snapshotHolen(tok, fortschritt = () => {}) {
  const out = { erstellt: new Date().toISOString().replace(/\.\d+Z$/, "Z"), quelle: "spotify (eigenes Konto)", zeitraeume: {}, kuenstler: {}, zuletzt: [] };
  for (const [rng, kurz] of Object.entries(ZEITRAEUME)) {
    fortschritt(`Spotify: Top-Listen ${kurz} …`);
    const [a, t] = await Promise.all([spotify(tok, "/me/top/artists", { limit: 50, time_range: rng }), spotify(tok, "/me/top/tracks", { limit: 50, time_range: rng })]);
    out.zeitraeume[kurz] = { kuenstler: a.items.map((x) => x.id), songs: t.items.map(track) };
    for (const x of a.items) out.kuenstler[x.id] ??= { name: x.name, bild: bild(x.images), url: x.external_urls?.spotify || null, tags: [], land: null };
    for (const x of t.items) for (const k of x.artists) out.kuenstler[k.id] ??= { name: k.name, bild: null, url: null, tags: [], land: null };
  }
  fortschritt("Spotify: zuletzt gehört …");
  const rp = await spotify(tok, "/me/player/recently-played", { limit: 50 });
  out.zuletzt = rp.items.map((x) => ({ song: track(x.track), um: x.played_at }));
  return out;
}

/**
 * Genre-Tags und Land von MusicBrainz, eine Anfrage pro Sekunde (so will es MusicBrainz), mit Cache
 * in localStorage. Nimmt die Künstler in Reihenfolge der Listen, höchstens `max`.
 */
export async function genresErgaenzen(snapshot, fortschritt = () => {}, { max = 90, abbruch = { wert: false } } = {}) {
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(MB_CACHE_KEY) || "{}"); } catch { cache = {}; }
  const reihenfolge = [];
  for (const z of Object.values(snapshot.zeitraeume)) for (const id of z.kuenstler) if (!reihenfolge.includes(id)) reihenfolge.push(id);
  for (const id of Object.keys(snapshot.kuenstler)) if (!reihenfolge.includes(id)) reihenfolge.push(id);
  const offen = reihenfolge.filter((id) => !cache[snapshot.kuenstler[id].name]).slice(0, max);
  let i = 0;
  for (const id of offen) {
    if (abbruch.wert) break;
    const k = snapshot.kuenstler[id];
    fortschritt(`Genres von MusicBrainz: ${++i} von ${offen.length} (eine Anfrage pro Sekunde)`);
    try {
      const name = k.name.replace(/["\\]/g, " ");
      const r = await fetch("https://musicbrainz.org/ws/2/artist?" + new URLSearchParams({ query: `artist:"${name}"`, fmt: "json", limit: 3 }), { headers: { Accept: "application/json" } });
      if (r.status === 503 || r.status === 429) { await new Promise((x) => setTimeout(x, 4000)); i--; continue; }
      const d = await r.json();
      const treffer = (d.artists || []).filter((a) => a.name.toLowerCase() === k.name.toLowerCase())[0] || (d.artists || [])[0];
      cache[k.name] = treffer && treffer.score >= 90
        ? { tags: (treffer.tags || []).sort((a, b) => b.count - a.count).slice(0, 8).map((t) => t.name), land: treffer.country || null }
        : { tags: [], land: null };
      try { localStorage.setItem(MB_CACHE_KEY, JSON.stringify(cache)); } catch { /* voll, egal */ }
    } catch { /* Netzfehler: nächster */ }
    await new Promise((x) => setTimeout(x, 1100));
  }
  for (const k of Object.values(snapshot.kuenstler)) {
    const c = cache[k.name];
    if (c) { k.tags = c.tags; k.land = c.land; }
  }
  return snapshot;
}
