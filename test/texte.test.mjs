// Übersetzungen: EN und DE müssen dieselbe Form haben, und jeder data-t-Schlüssel in index.html muss existieren.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spracheSetzen, tx } from "../public/texte.js";

function woerterbuch(code) {
  spracheSetzen(code);
  try { return tx(); } finally { spracheSetzen("de"); }
}
const DE = woerterbuch("de");
const EN = woerterbuch("en");

const typ = (w) => (Array.isArray(w) ? "array" : w === null ? "null" : typeof w);

/** Alle Blätter als Pfad → Wert (Arrays gelten als Blatt). */
function blaetter(obj, pfad = "", aus = new Map()) {
  for (const [k, w] of Object.entries(obj)) {
    const p = pfad ? `${pfad}.${k}` : k;
    if (typ(w) === "object") blaetter(w, p, aus); else aus.set(p, w);
  }
  return aus;
}

// Beispielwerte je Funktion (Pfad → Argumente); Pfade ohne Eintrag werden mit "x" aufgerufen.
const kuenstler = { name: "Beispiel", kuenstler: [{ name: "Band" }], erschienen: "2020-05-01" };
const verlauf = { streams: 1234, gezaehlt: 1000, stunden: 56.7, tage: 40, laengsteSerie: 7, von: "2023-01-01", bis: "2024-01-01" };
const vergleich = { nameA: "Ana", nameB: "Ben", anzahl: { gemeinsam: 12, nurA: 30, nurB: 25, bruecken: 4 } };
const prozent = { gesamt: 42, kuenstler: 38, genre: 51 };
const BEISPIELE = {
  "eigener.quelleFehler.keinTitel": ["apple"],
  "eigener.quelleFehler.zeilenMax": [2000000],
  "vergleich.kapitel.text": [vergleich, prozent],
  "vergleich.kapitel.zeilen": [vergleich, prozent],
  "vergleich.kapitel.nurEiner": ["Ana"],
  "vergleich.kapitel.bruecke": ["Rap", "Ana", "Ben"],
  "vergleich.legendeNur": ["Ana"],
  "vergleich.gemerkt": ["Ana"],
  "vergleich.aktiv": ["Ana"],
  "eigener.quelleFortschritt": ["datei.csv", 0.5],
  "eigener.quelleFertig": ["Last.fm", { streams: 1234, stunden: 56.7 }, 3],
  "eigener.geladen": ["himmel.json"],
  "eigener.fehler": ["kaputt"],
  "eigener.gingNicht": ["kaputt"],
  "kapitel.welten.text": [{ anzahl: 5, name: "Rap" }, 20, 25],
  "kapitel.gerade.text": [[{ name: "A", jahr: null, jetzt: 3 }, { name: "B", jahr: 90, jetzt: 4 }], "Rap"],
  "kapitel.dauerbrenner.text": [[{ name: "A", plaetze: [1, 2, 3] }]],
  "kapitel.verblasst.text": [[{ name: "A", jahr: 5 }, { name: "B", jahr: 9 }]],
  "kapitel.herkunft.text": [{ gesamt: 10, unbekannt: 2, liste: [{ code: "AT", anzahl: 4 }, { code: "DE", anzahl: 3 }] }],
  "kapitel.herkunft.leer": [7],
  "kapitel.jahrgaenge.text": [{ gesamt: 50, aeltester: kuenstler, neuester: kuenstler }, 12],
  "kapitel.zuletzt.text": [{ anzahl: 50, von: "2024-05-01T10:00:00Z", bis: "2024-05-01T12:00:00Z" }],
  "kapitel.verlauf.text": [verlauf],
  "kapitel.verlauf.zeilen": [verlauf],
  "kapitel.uhrzeiten.aria": ["Mo 22 Uhr"],
  "kapitel.uhrzeiten.text": [{ spitze: { name: "Mo", stunde: 22 } }, 30],
  "kapitel.monate.text": [{ name: "Mai", jahr: 2023, stunden: 80.4 }, 50],
  "kapitel.hoerzeit.text": [{ topKuenstler: [{ name: "A", stunden: 12.3 }], topSongs: [{ name: "S", n: 99 }] }, 15],
  "ui.ladefehler": ["404"],
  "karte.vorschau": ["Song"],
  "eigener.verlaufStand": [verlauf],
  "eigener.zipFertig": [verlauf],
  "eigener.lese": ["datei.zip", 12],
  "konto.fehler": [403, "/me"],
  "konto.genres": [3, 10],
  "konto.tausch": [400],
};
// Zusätzliche Fälle, damit auch die anderen Zweige der Satzbauer laufen.
const ZUSAETZE = [
  ["kapitel.gerade.text", [[{ name: "A", jahr: 90, jetzt: 3 }]]],
  ["kapitel.zuletzt.text", [{ anzahl: 50 }]],
  ["kapitel.uhrzeiten.text", [{ spitze: { name: "Mo", stunde: 22 } }, 5]],
  ["kapitel.uhrzeiten.text", [{ spitze: { name: "Mo", stunde: 22 } }, 15]],
  ["kapitel.hoerzeit.text", [{ topKuenstler: [], topSongs: [] }, null]],
];

test("Deutsch und Englisch haben dieselbe Schlüsselmenge", () => {
  const de = [...blaetter(DE).keys()].sort();
  const en = [...blaetter(EN).keys()].sort();
  assert.deepEqual(de.filter((k) => !en.includes(k)), [], "fehlt in EN");
  assert.deepEqual(en.filter((k) => !de.includes(k)), [], "fehlt in DE");
  assert.ok(de.length > 100, "Wörterbuch wurde nicht gelesen");
});

test("Jedes Blatt hat in beiden Sprachen denselben Typ, Listen dieselbe Länge", () => {
  const de = blaetter(DE), en = blaetter(EN);
  for (const [k, w] of de) {
    assert.equal(typ(en.get(k)), typ(w), `Typ von ${k}`);
    if (Array.isArray(w)) assert.equal(en.get(k).length, w.length, `Länge von ${k}`);
  }
});

test("Texte sind nicht leer; Platzhalter sind nicht übrig", () => {
  for (const [name, wb] of [["de", DE], ["en", EN]]) {
    for (const [k, w] of blaetter(wb)) {
      const teile = Array.isArray(w) ? w : [w];
      // Leere Spaltentitel (["Messwert", ""]) sind gewollt.
      if (typeof w === "string") assert.ok(w.trim() !== "", `${name}: ${k} ist leer`);
      for (const t of teile.flat()) if (typeof t === "string") assert.ok(!/undefined|\[object|NaN/.test(t), `${name}: ${k}`);
    }
  }
});

test("Funktionen liefern in beiden Sprachen Strings (Zeilenlisten: Paare aus Strings)", () => {
  const aufrufe = [...[...blaetter(DE)].filter(([, w]) => typeof w === "function").map(([k]) => [k, BEISPIELE[k] || ["x", "x"]]), ...ZUSAETZE];
  assert.ok(aufrufe.length >= 15);
  for (const code of ["de", "en"]) {
    spracheSetzen(code);
    try {
      const wb = tx();
      for (const [pfad, args] of aufrufe) {
        const f = pfad.split(".").reduce((o, k) => o[k], wb);
        const r = f(...args);
        if (pfad.endsWith(".zeilen")) {
          assert.ok(Array.isArray(r) && r.length > 0, `${code}: ${pfad}`);
          for (const z of r) { assert.equal(z.length, 2); assert.ok(z.every((s) => (typeof s === "string" || typeof s === "number") && String(s) !== ""), `${code}: ${pfad}`); }
        } else {
          assert.equal(typeof r, "string", `${code}: ${pfad}`);
          assert.ok(r.length > 0 && !/undefined|\[object|NaN/.test(r), `${code}: ${pfad}: ${r}`);
        }
      }
    } finally { spracheSetzen("de"); }
  }
});

test("Alle data-t / data-t-aria aus index.html gibt es in beiden Sprachen", () => {
  const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  const t = [...html.matchAll(/\sdata-t="([^"]+)"/g)].map((m) => m[1]);
  const aria = [...html.matchAll(/\sdata-t-aria="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(t.length > 0 && aria.length > 0, "keine Schlüssel gefunden");
  for (const [name, wb] of [["de", DE], ["en", EN]]) {
    for (const k of [...t, ...aria]) assert.equal(typeof wb.ui[k], "string", `${name}: ui.${k} fehlt`);
  }
});
