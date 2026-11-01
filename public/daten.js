// Aus dem Schnappschuss werden Sterne: Gewicht, Welt, Position am Himmel, Sternbilder.
// Reine Funktionen ohne DOM und ohne three.js, damit sie in Node testbar sind.

import { WELTEN, weltenZuordnen } from "./welten.js";

export const ZEITRAEUME = ["4w", "6m", "1y"];
const GEWICHT_ZEITRAUM = { "4w": 1.0, "6m": 0.85, "1y": 0.7 };

// Wo die Galaxien am Himmel stehen (Azimut, Höhe in Grad). Deutschrap vorne in der Mitte,
// Fokus hoch oben, Streulicht verteilt sich überall dazwischen.
export const GALAXIE_ORT = {
  deutschrap: [0, 20], rap: [-44, 8], nacht: [36, 32], pop: [-34, 44], fokus: [16, 62],
  latino: [-88, 18], elektro: [90, 24], rock: [152, 28],
};

/** Deterministischer Zufall aus einer Zeichenkette, damit der Himmel bei jedem Laden gleich aussieht. */
export function hash01(text, salz = 0) {
  let h = 2166136261 ^ salz;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** Gewicht eines Künstlers in einem Zeitraum: Rang in der Künstlerliste plus eigene Songs dort. 0 = nicht gehört. */
export function gewichtIn(zeitraum, id, snapshot) {
  const z = snapshot.zeitraeume[zeitraum];
  if (!z) return 0;
  const rang = z.kuenstler.indexOf(id);
  let g = rang >= 0 ? (z.kuenstler.length + 1 - (rang + 1)) / z.kuenstler.length : 0;
  let songs = 0;
  for (const s of z.songs) if (s.kuenstler.some((k) => k.id === id)) songs++;
  g += Math.min(songs, 6) * 0.08;
  return Math.min(g, 1.3);
}

/** Alle Sterne mit Gesamtgewicht (0..1), Gewicht pro Zeitraum, Welt und Songs. Hellster zuerst. */
export function sterne(snapshot) {
  const alleSongs = ZEITRAEUME.flatMap((z) => snapshot.zeitraeume[z]?.songs || []);
  const welten = weltenZuordnen(snapshot.kuenstler, alleSongs);
  const liste = Object.entries(snapshot.kuenstler).map(([id, k]) => {
    const je = {};
    let gesamt = 0;
    for (const z of ZEITRAEUME) {
      je[z] = gewichtIn(z, id, snapshot);
      gesamt += je[z] * GEWICHT_ZEITRAUM[z];
    }
    const songs = [];
    const gesehen = new Set();
    for (const s of alleSongs) {
      if (gesehen.has(s.id) || !s.kuenstler.some((x) => x.id === id)) continue;
      gesehen.add(s.id);
      songs.push(s);
    }
    return { id, name: k.name, welt: welten.get(id) || "streulicht", land: k.land || null, tags: k.tags || [],
      bild: k.bild || null, url: k.url || null, gewicht: gesamt, je, songs };
  });
  const max = Math.max(...liste.map((s) => s.gewicht), 0.0001);
  for (const s of liste) s.gewicht = s.gewicht / max;
  liste.sort((a, b) => b.gewicht - a.gewicht);
  return liste;
}

/** Sternbilder: Paare von Künstlern, die auf denselben Songs stehen. n = Anzahl gemeinsamer Songs. */
export function sternbilder(snapshot) {
  const paare = new Map();
  const gesehen = new Set();
  for (const z of ZEITRAEUME) {
    for (const s of snapshot.zeitraeume[z]?.songs || []) {
      if (gesehen.has(s.id)) continue;
      gesehen.add(s.id);
      const ids = s.kuenstler.map((k) => k.id);
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
        const key = [ids[i], ids[j]].sort().join("|");
        paare.set(key, (paare.get(key) || 0) + 1);
      }
    }
  }
  return [...paare].map(([key, n]) => { const [a, b] = key.split("|"); return { a, b, n }; });
}

/** Anzahl Sterne pro Welt, in der Reihenfolge von WELTEN. */
export function weltenZaehlung(liste) {
  const z = new Map(WELTEN.map((w) => [w.id, 0]));
  for (const s of liste) z.set(s.welt, (z.get(s.welt) || 0) + 1);
  return WELTEN.map((w) => ({ ...w, anzahl: z.get(w.id) || 0 }));
}

function gradZuRichtung(az, el) {
  const a = (az * Math.PI) / 180, e = (el * Math.PI) / 180;
  // y ist oben; Azimut 0 blickt nach -z (nach vorne).
  return [Math.cos(e) * Math.sin(a), Math.sin(e), -Math.cos(e) * Math.cos(a)];
}

/**
 * Richtung jedes Sterns am Himmel (Einheitsvektor). Helle Sterne liegen näher am Zentrum ihrer Galaxie,
 * Streulicht verteilt sich tief am Himmel zwischen den Galaxien.
 */
export function positionen(liste) {
  const zaehlung = new Map();
  for (const s of liste) zaehlung.set(s.welt, (zaehlung.get(s.welt) || 0) + 1);
  return liste.map((s) => {
    let az, el;
    if (s.welt === "streulicht" || !GALAXIE_ORT[s.welt]) {
      az = hash01(s.id, 7) * 360 - 180;
      el = -2 + hash01(s.id, 8) * 20;
    } else {
      const [cAz, cEl] = GALAXIE_ORT[s.welt];
      const n = zaehlung.get(s.welt) || 1;
      const streuung = 7 + 5.5 * Math.sqrt(n / 8);
      const r = streuung * (0.12 + 0.88 * Math.pow(1 - s.gewicht, 0.55)) * (0.45 + 0.55 * hash01(s.id, 1));
      const winkel = hash01(s.id, 2) * Math.PI * 2;
      el = cEl + r * Math.sin(winkel) * 0.8;
      az = cAz + (r * Math.cos(winkel)) / Math.max(0.35, Math.cos((el * Math.PI) / 180));
    }
    el = Math.max(-6, Math.min(82, el));
    return gradZuRichtung(az, el);
  });
}

export function galaxieRichtung(weltId) {
  const o = GALAXIE_ORT[weltId];
  return o ? gradZuRichtung(o[0], o[1]) : null;
}

export function dauerText(ms) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ---------------------------------------------------------------- Rückblick-Kapitel

function rang(snapshot, zeitraum, id) {
  const i = snapshot.zeitraeume[zeitraum]?.kuenstler.indexOf(id) ?? -1;
  return i >= 0 ? i + 1 : null;
}

/** Künstler, die in den letzten 4 Wochen hoch stehen, im Jahr aber fehlen oder weit hinten lagen. */
export function aufsteiger(snapshot, max = 6) {
  const out = [];
  for (const [id, k] of Object.entries(snapshot.kuenstler)) {
    const r4 = rang(snapshot, "4w", id), r1 = rang(snapshot, "1y", id);
    if (r4 && r4 <= 25 && (r1 === null || r1 - r4 >= 15)) out.push({ id, name: k.name, jetzt: r4, jahr: r1 });
  }
  return out.sort((a, b) => a.jetzt - b.jetzt).slice(0, max);
}

/** Im Jahr weit vorne, in den letzten 4 Wochen nicht mehr in der Liste. */
export function verblasst(snapshot, max = 6) {
  const out = [];
  for (const [id, k] of Object.entries(snapshot.kuenstler)) {
    const r4 = rang(snapshot, "4w", id), r1 = rang(snapshot, "1y", id);
    if (r1 && r1 <= 25 && r4 === null) out.push({ id, name: k.name, jahr: r1 });
  }
  return out.sort((a, b) => a.jahr - b.jahr).slice(0, max);
}

/** In allen drei Zeiträumen unter den ersten 25, sortiert nach Summe der Plätze. */
export function dauerbrenner(snapshot, max = 8) {
  const out = [];
  for (const [id, k] of Object.entries(snapshot.kuenstler)) {
    const r = ZEITRAEUME.map((z) => rang(snapshot, z, id));
    if (r.every((x) => x && x <= 25)) out.push({ id, name: k.name, plaetze: r, summe: r[0] + r[1] + r[2] });
  }
  return out.sort((a, b) => a.summe - b.summe).slice(0, max);
}

/** Herkunftsländer der Sterne (ISO-Code → Anzahl), häufigste zuerst, ohne Unbekannt. */
export function laender(liste, max = 8) {
  const z = new Map();
  let unbekannt = 0;
  for (const s of liste) { if (s.land) z.set(s.land, (z.get(s.land) || 0) + 1); else unbekannt++; }
  const sortiert = [...z].sort((a, b) => b[1] - a[1]).map(([code, anzahl]) => ({ code, anzahl }));
  return { liste: sortiert.slice(0, max), gesamt: liste.length - unbekannt, unbekannt };
}

/** Erscheinungsjahre der Top-Songs eines Zeitraums: Jahr → Anzahl, plus ältester und neuester Song. */
export function jahrgaenge(snapshot, zeitraum = "1y") {
  const songs = (snapshot.zeitraeume[zeitraum]?.songs || []).filter((s) => s.erschienen);
  const z = new Map();
  for (const s of songs) { const j = +s.erschienen.slice(0, 4); z.set(j, (z.get(j) || 0) + 1); }
  const jahre = [...z].sort((a, b) => a[0] - b[0]).map(([jahr, anzahl]) => ({ jahr, anzahl }));
  const sortiert = [...songs].sort((a, b) => a.erschienen.localeCompare(b.erschienen));
  return { jahre, aeltester: sortiert[0] || null, neuester: sortiert[sortiert.length - 1] || null, gesamt: songs.length };
}

/** Zeitspanne der zuletzt gehörten Songs und die letzten fünf. */
export function zuletzt(snapshot) {
  const l = snapshot.zuletzt || [];
  if (!l.length) return { anzahl: 0, von: null, bis: null, songs: [] };
  const zeiten = l.map((e) => e.um).filter(Boolean).sort();
  return { anzahl: l.length, von: zeiten[0] || null, bis: zeiten[zeiten.length - 1] || null, songs: l.slice(0, 5).map((e) => e.song) };
}

export const LANDNAMEN = {
  DE: "Deutschland", US: "USA", AT: "Österreich", GB: "Großbritannien", CA: "Kanada", AU: "Australien", NO: "Norwegen",
  FR: "Frankreich", PR: "Puerto Rico", IT: "Italien", ES: "Spanien", CO: "Kolumbien", MX: "Mexiko", JP: "Japan", SE: "Schweden",
  NL: "Niederlande", CH: "Schweiz", TR: "Türkei", BR: "Brasilien", RU: "Russland", KR: "Südkorea", AZ: "Aserbaidschan",
  CZ: "Tschechien", IE: "Irland", DK: "Dänemark", BE: "Belgien", PL: "Polen", NG: "Nigeria", JM: "Jamaika", AR: "Argentinien",
  CL: "Chile", DO: "Dominikanische Republik", CU: "Kuba", NZ: "Neuseeland", IS: "Island", FI: "Finnland", PT: "Portugal",
};
