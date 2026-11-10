// Vergleich zweier Himmel: Zuordnung gleicher Künstler, Ähnlichkeit, Listen. Reines Modul ohne DOM, Netz und Uhr.
// Eingabe sind geprüfte Himmel-Objekte aus austausch.js (himmelExportieren / himmelPruefen).

import { ZEITRAEUME } from "./daten.js";

/** Namen vergleichbar machen: Akzente, Groß/Klein, „&“/„and“, führendes „The“, Satzzeichen und Leerraum fallen weg. */
export function normalisiereName(name) {
  let s = String(name ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const original = s;
  s = s.replace(/ß/g, "ss").replace(/&/g, " and ").replace(/^the\s+/, "");
  s = s.replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
  return s || original.replace(/\s+/g, " "); // nur Sonderzeichen („!!!“): lieber der Rohname als leer
}

/** Kosinus-Ähnlichkeit zweier dünner Vektoren (Map Schlüssel → Gewicht). 0 bei leerem Vektor, sonst 0..1. */
export function kosinus(va, vb) {
  let dot = 0, na = 0, nb = 0;
  for (const [k, x] of va) { na += x * x; const y = vb.get(k); if (y) dot += x * y; }
  for (const y of vb.values()) nb += y * y;
  return na && nb ? Math.min(1, dot / Math.sqrt(na * nb)) : 0;
}

/** Ordnet gleiche Künstler zu: zuerst über die Kennung, ersatzweise über den normalisierten Namen. */
export function zuordnen(a, b) {
  const paare = [], restA = [], restB = [];
  const nachId = new Map(b.kuenstler.map((k) => [k.id, k]));
  const benutzt = new Set();
  for (const k of a.kuenstler) {
    const m = nachId.get(k.id);
    if (m && !benutzt.has(m)) { benutzt.add(m); paare.push({ a: k, b: m }); } else restA.push(k);
  }
  const nachName = new Map();
  for (const k of b.kuenstler) {
    if (benutzt.has(k)) continue;
    const n = normalisiereName(k.name);
    if (!nachName.has(n)) nachName.set(n, []);
    nachName.get(n).push(k);
  }
  for (const k of restA.slice()) {
    const liste = nachName.get(normalisiereName(k.name));
    if (liste && liste.length) { const m = liste.shift(); benutzt.add(m); paare.push({ a: k, b: m }); restA.splice(restA.indexOf(k), 1); }
  }
  for (const k of b.kuenstler) if (!benutzt.has(k)) restB.push(k);
  return { paare, nurA: restA, nurB: restB };
}

const nachGewicht = (x, y) => y.gewicht - x.gewicht || x.name.localeCompare(y.name) || (x.id < y.id ? -1 : 1);

/** Genre-Vektor eines Himmels: Liste genres, sonst aus den Künstlern summiert. */
function genreVektor(h) {
  const v = new Map();
  for (const g of h.genres) if (g.gewicht > 0) v.set(g.name, g.gewicht);
  if (!v.size) for (const k of h.kuenstler) for (const g of k.genres) v.set(g, (v.get(g) || 0) + k.gewicht);
  return v;
}

/** Brücken: Genres, in denen beide hören, aber (nur) unterschiedliche Künstler. */
function bruecken(nurA, nurB, max, proGenre) {
  const nach = (liste) => { const m = new Map(); for (const k of liste) for (const g of k.genres) { if (!m.has(g)) m.set(g, []); m.get(g).push(k); } return m; };
  const ga = nach(nurA), gb = nach(nurB), out = [];
  for (const [genre, la] of ga) {
    const lb = gb.get(genre); if (!lb) continue;
    const wa = la.reduce((s, k) => s + k.gewicht, 0), wb = lb.reduce((s, k) => s + k.gewicht, 0);
    out.push({ genre, gewicht: Math.min(wa, wb), a: [...la].sort(nachGewicht).slice(0, proGenre).map((k) => k.name), b: [...lb].sort(nachGewicht).slice(0, proGenre).map((k) => k.name), anzahlA: la.length, anzahlB: lb.length });
  }
  return out.sort((x, y) => y.gewicht - x.gewicht || x.genre.localeCompare(y.genre));
}

/**
 * Vergleicht zwei Himmel. Übereinstimmung = Mittel aus Künstler- und Genre-Ähnlichkeit (beide auch einzeln), je 0..1.
 * Haben beide keine Genre-Daten, zählt nur die Künstler-Ähnlichkeit.
 */
export function vergleichen(a, b, { max = 12, proGenre = 3 } = {}) {
  const z = zuordnen(a, b);
  // gemeinsame Achse: Paare teilen sich einen Schlüssel
  const wa = new Map(), wb = new Map();
  z.paare.forEach((p, i) => { wa.set("p" + i, p.a.gewicht); wb.set("p" + i, p.b.gewicht); });
  z.nurA.forEach((k, i) => wa.set("a" + i, k.gewicht));
  z.nurB.forEach((k, i) => wb.set("b" + i, k.gewicht));
  const kuenstlerAehnlichkeit = kosinus(wa, wb);
  const gA = genreVektor(a), gB = genreVektor(b);
  const genreAehnlichkeit = kosinus(gA, gB);
  const mitGenres = gA.size > 0 || gB.size > 0;
  const uebereinstimmung = mitGenres ? (kuenstlerAehnlichkeit + genreAehnlichkeit) / 2 : kuenstlerAehnlichkeit;
  const gemeinsam = z.paare.map((p) => ({ id: p.a.id, name: p.a.name, a: p.a.gewicht, b: p.b.gewicht, gewicht: Math.min(p.a.gewicht, p.b.gewicht) })).sort(nachGewicht);
  const nurA = [...z.nurA].sort(nachGewicht), nurB = [...z.nurB].sort(nachGewicht);
  const br = bruecken(z.nurA, z.nurB, max, proGenre);
  return {
    nameA: a.name || "", nameB: b.name || "",
    kuenstlerAehnlichkeit, genreAehnlichkeit, uebereinstimmung,
    anzahl: { a: a.kuenstler.length, b: b.kuenstler.length, gemeinsam: gemeinsam.length, nurA: nurA.length, nurB: nurB.length, bruecken: br.length },
    gemeinsam: gemeinsam.slice(0, max), nurA: nurA.slice(0, max), nurB: nurB.slice(0, max), bruecken: br.slice(0, max),
    _paare: z.paare, _nurA: z.nurA, _nurB: z.nurB,
  };
}

/**
 * Baut aus zwei Himmeln einen gemeinsamen Schnappschuss (ohne Songs), damit der vorhandene Himmel ihn zeichnen kann,
 * und eine Map id → "a" | "b" | "beide". Gleiche Künstler tragen die Kennung von A.
 */
export function zusammenfuehren(a, b, erstellt = "") {
  const z = zuordnen(a, b);
  const kuenstler = Object.create(null), gruppe = new Map(), je = new Map();   // ohne Prototyp: eine Kennung "__proto__" aus einer Importdatei darf nichts verbiegen
  const setze = (id, k, g, werte, extraTags = []) => {
    kuenstler[id] = { name: k.name, tags: [...new Set([...k.genres, ...extraTags])], land: k.land || null };
    gruppe.set(id, g); je.set(id, werte);
  };
  for (const p of z.paare) setze(p.a.id, p.a, "beide", Object.fromEntries(ZEITRAEUME.map((t) => [t, p.a.je[t] + p.b.je[t]])), p.b.genres);
  for (const k of z.nurA) setze(k.id, k, "a", k.je);
  for (const k of z.nurB) { const id = kuenstler[k.id] ? "b:" + k.id : k.id; setze(id, k, "b", k.je); }
  const zeitraeume = {};
  for (const t of ZEITRAEUME) {
    const ids = [...je].filter(([, w]) => w[t] > 0).sort((x, y) => y[1][t] - x[1][t] || (x[0] < y[0] ? -1 : 1)).map(([id]) => id);
    zeitraeume[t] = { kuenstler: ids, songs: [] };
  }
  return { snapshot: { erstellt, quelle: "vergleich", zeitraeume, kuenstler, zuletzt: [] }, gruppe };
}
