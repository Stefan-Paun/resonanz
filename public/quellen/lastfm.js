// Last.fm: CSV der üblichen Export-Werkzeuge (Künstler, Album, Titel, Datum) und JSON der API (user.getRecentTracks).
import { csvLesen, spalte } from "./csv.js";
import { eintrag, zeitLesen } from "./format.js";

const SP = {
  kuenstler: ["artist", "artistname", "künstler", "kuenstler"],
  album: ["album", "albumname"],
  titel: ["track", "title", "trackname", "song", "name", "titel"],
  t: ["date", "datum", "timestamp", "uts", "time", "datetime", "utc", "scrobbledat"],
};

/** Spalten bestimmen. Ohne Kopfzeile (4 Spalten, vorn Künstler/Album/Titel, hinten Datum) gilt die übliche Reihenfolge. */
export function lastfmSpalten(zeilen) {
  const kopf = zeilen[0] || [];
  const s = Object.fromEntries(Object.entries(SP).map(([k, v]) => [k, spalte(kopf, v)]));
  if (s.kuenstler >= 0 && s.titel >= 0 && s.t >= 0) return { ...s, kopfzeile: true };
  if (kopf.length >= 4 && Number.isFinite(zeitLesen(kopf[3]))) return { kuenstler: 0, album: 1, titel: 2, t: 3, kopfzeile: false };
  // Reihenfolge Künstler, Titel, Album, Datum? nicht raten: lieber ablehnen
  return null;
}

export function lastfmCsvZeilen(zeilen, sp = lastfmSpalten(zeilen)) {
  if (!sp) throw new Error("Spalten fehlen: erwartet werden Künstler, Album, Titel und Datum.");
  const out = []; let verworfen = 0;
  for (let i = sp.kopfzeile ? 1 : 0; i < zeilen.length; i++) {
    const z = zeilen[i];
    const e = eintrag({ t: zeitLesen(z[sp.t] ?? ""), kuenstler: z[sp.kuenstler], titel: z[sp.titel], album: sp.album >= 0 ? z[sp.album] : null, quelle: "lastfm" });
    if (e) out.push(e); else verworfen++;
  }
  return { streams: out, verworfen };
}

export function lastfmCsvLesen(text, optionen) { return lastfmCsvZeilen(csvLesen(text, optionen)); }

const txt = (v) => (v && typeof v === "object" ? v["#text"] ?? v.name ?? "" : v ?? "");

/** Tracks aus einem API-JSON finden: {recenttracks:{track:[…]}}, eine Liste solcher Seiten oder eine Liste von Tracks. */
export function lastfmTracks(json) {
  if (Array.isArray(json)) return json.flatMap((x) => (x && x.recenttracks ? lastfmTracks(x) : [x]));
  const t = json?.recenttracks?.track ?? json?.scrobbles ?? json?.tracks;
  return Array.isArray(t) ? t : t && typeof t === "object" ? [t] : [];
}

export const istLastfmJson = (json) => {
  const t = lastfmTracks(json);
  return t.length > 0 && t.some((x) => x && typeof x === "object" && (x.artist != null) && (x.name != null || x.track != null || x.title != null) && (x.date != null || x["@attr"] || x.uts != null || x.timestamp != null));
};

export function lastfmJsonLesen(json) {
  const out = []; let verworfen = 0;
  for (const x of lastfmTracks(json)) {
    if (!x || typeof x !== "object" || x["@attr"]?.nowplaying) { verworfen++; continue; } // „läuft gerade“ hat kein Datum
    const d = x.date;
    const t = zeitLesen(d && typeof d === "object" ? d.uts ?? d["#text"] : d ?? x.uts ?? x.timestamp);
    const e = eintrag({ t, kuenstler: txt(x.artist), titel: x.name ?? x.track ?? x.title, album: txt(x.album) || null, quelle: "lastfm" });
    if (e) out.push(e); else verworfen++;
  }
  return { streams: out, verworfen };
}
