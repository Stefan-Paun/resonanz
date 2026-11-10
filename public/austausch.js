// Austauschformat für den Himmelsvergleich: Export als kleine JSON-Datei, strenger Import.
// Reine Funktionen ohne DOM und ohne Netz, damit sie in Node testbar sind.
// Die Datei enthält nur Aggregiertes: Künstler mit Gewichten, Genres, grobe Zeiträume (4w/6m/1y),
// einen Monat als Stand und einen frei getippten Anzeigenamen. Keine Hörzeitpunkte, keine Konto-Kennung.

import { sterne, ZEITRAEUME } from "./daten.js";

export const FORMAT = "resonanz-himmel";
export const VERSION = 1;

export const GRENZEN = {
  bytes: 256 * 1024, kuenstler: 400, genresJeKuenstler: 8, genresGesamt: 120,
  name: 80, genre: 40, anzeigename: 40, id: 64,
};

/** Zulassungsliste: nur diese Felder dürfen in einer Datei stehen (der Test prüft den Export dagegen). */
export const ERLAUBTE_FELDER = {
  datei: ["format", "version", "name", "stand", "kuenstler", "genres"],
  kuenstler: ["id", "name", "gewicht", "je", "genres", "land"],
  je: [...ZEITRAEUME],
  genre: ["name", "gewicht"],
};

// Steuerzeichen, Zeilentrenner, unsichtbare Richtungs- und Nullbreiten-Zeichen
const UNSICHTBAR = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/g;

/** Text säubern: Unicode normalisieren, unsichtbare Zeichen und spitze Klammern weg, Leerraum zusammenfassen. */
export function saubern(s, max) {
  if (typeof s !== "string") return "";
  return s.normalize("NFC").replace(UNSICHTBAR, " ").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

const runden = (x, n) => Math.round(x * 10 ** n) / 10 ** n;
const genreName = (t) => saubern(String(t).toLowerCase(), GRENZEN.genre);
const GENRE_MUELL = /^\d{4}s$/;

/**
 * Baut die Exportdatei (ein Objekt) aus einem Schnappschuss. Gibt nur die Felder aus ERLAUBTE_FELDER zurück.
 * stand: "JJJJ-MM" (nur der Monat, nie ein genauer Zeitpunkt).
 */
export function himmelExportieren(snapshot, anzeigename = "") {
  const liste = sterne(snapshot).slice(0, GRENZEN.kuenstler);
  const gesamt = new Map();
  const kuenstler = liste.map((s) => {
    const genres = [...new Set((s.tags || []).map(genreName).filter((g) => g && !GENRE_MUELL.test(g)))].slice(0, GRENZEN.genresJeKuenstler);
    for (const g of genres) gesamt.set(g, (gesamt.get(g) || 0) + s.gewicht);
    const k = { id: saubern(String(s.id), GRENZEN.id), name: saubern(s.name, GRENZEN.name), gewicht: runden(s.gewicht, 3),
      je: Object.fromEntries(ZEITRAEUME.map((z) => [z, runden(s.je[z] || 0, 2)])), genres };
    if (/^[A-Z]{2}$/.test(s.land || "")) k.land = s.land;
    return k;
  }).filter((k) => k.id && k.name);
  const maxG = Math.max(...gesamt.values(), 0.0001);
  const genres = [...gesamt].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, GRENZEN.genresGesamt)
    .map(([name, g]) => ({ name, gewicht: runden(g / maxG, 3) }));
  const erstellt = typeof snapshot.erstellt === "string" ? snapshot.erstellt : "";
  const stand = /^\d{4}-\d{2}/.test(erstellt) ? erstellt.slice(0, 7) : "";
  return { format: FORMAT, version: VERSION, name: saubern(anzeigename, GRENZEN.anzeigename), stand, kuenstler, genres };
}

const fehl = (grund) => ({ ok: false, grund });
const istObjekt = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const gewichtOk = (x) => typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 2;

/**
 * Prüft eine fremde Datei (Text) streng und gibt eine bereinigte Kopie zurück: {ok:true, himmel} oder {ok:false, grund}.
 * Gründe: zu-gross, kein-json, format, version, struktur, zu-viele.
 * Alles wird feldweise neu aufgebaut; unbekannte Felder (auch __proto__, constructor) kommen nie in die Kopie.
 */
export function himmelPruefen(text) {
  if (typeof text !== "string") return fehl("kein-json");
  if (text.length > GRENZEN.bytes) return fehl("zu-gross");
  let roh;
  try { roh = JSON.parse(text); } catch { return fehl("kein-json"); }
  if (!istObjekt(roh) || roh.format !== FORMAT) return fehl("format");
  if (roh.version !== VERSION) return fehl("version");
  if (!Array.isArray(roh.kuenstler) || !Array.isArray(roh.genres)) return fehl("struktur");
  if (roh.kuenstler.length > GRENZEN.kuenstler || roh.genres.length > GRENZEN.genresGesamt) return fehl("zu-viele");
  if (roh.name !== undefined && typeof roh.name !== "string") return fehl("struktur");
  if (roh.stand !== undefined && (typeof roh.stand !== "string" || !/^\d{4}-\d{2}$/.test(roh.stand))) return fehl("struktur");

  const ids = new Set(), kuenstler = [];
  for (const k of roh.kuenstler) {
    if (!istObjekt(k) || typeof k.id !== "string" || typeof k.name !== "string" || !gewichtOk(k.gewicht)) return fehl("struktur");
    if (k.id.length > GRENZEN.id || k.name.length > GRENZEN.name) return fehl("struktur");
    if (!istObjekt(k.je) || !Array.isArray(k.genres)) return fehl("struktur");
    if (k.genres.length > GRENZEN.genresJeKuenstler) return fehl("zu-viele");
    if (k.land !== undefined && !(typeof k.land === "string" && /^[A-Z]{2}$/.test(k.land))) return fehl("struktur");
    const je = {};
    for (const z of ZEITRAEUME) {
      const w = k.je[z];
      if (w === undefined) { je[z] = 0; continue; }
      if (!gewichtOk(w)) return fehl("struktur");
      je[z] = w;
    }
    const genres = [];
    for (const g of k.genres) {
      if (typeof g !== "string" || g.length > GRENZEN.genre) return fehl("struktur");
      const n = genreName(g);
      if (n && !genres.includes(n)) genres.push(n);
    }
    const id = saubern(k.id, GRENZEN.id), name = saubern(k.name, GRENZEN.name);
    if (!id || !name || ids.has(id)) continue; // leer nach dem Säubern oder doppelt: weglassen
    ids.add(id);
    const neu = { id, name, gewicht: k.gewicht, je, genres };
    if (k.land) neu.land = k.land;
    kuenstler.push(neu);
  }
  const genres = [], gesehen = new Set();
  for (const g of roh.genres) {
    if (!istObjekt(g) || typeof g.name !== "string" || g.name.length > GRENZEN.genre || !gewichtOk(g.gewicht)) return fehl("struktur");
    const n = genreName(g.name);
    if (!n || gesehen.has(n)) continue;
    gesehen.add(n);
    genres.push({ name: n, gewicht: g.gewicht });
  }
  if (!kuenstler.length) return fehl("struktur");
  return { ok: true, himmel: { format: FORMAT, version: VERSION, name: saubern(roh.name || "", GRENZEN.anzeigename), stand: roh.stand || "", kuenstler, genres } };
}
