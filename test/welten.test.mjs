import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { WELTEN, weltFuer, welt, weltenZuordnen } from "../public/welten.js";

test("Deutschrap: german + rap-artige Tags", () => {
  assert.equal(weltFuer(["hip hop", "rap", "german", "berlin", "pop rap", "trap"]), "deutschrap");
  assert.equal(weltFuer(["german", "hip hop", "rap"]), "deutschrap");
  assert.equal(weltFuer(["deutschrap"]), "deutschrap");
});

test("Deutsch + Pop ohne Rap ist Pop, nicht Deutschrap", () => {
  assert.equal(weltFuer(["german", "pop"]), "pop");
  assert.equal(weltFuer(["schlager", "german"]), "rock");
});

test("Internationaler Rap, Nacht, Latino, Elektro, Fokus", () => {
  assert.equal(weltFuer(["hip hop", "west coast hip hop", "g-funk"]), "rap");
  assert.equal(weltFuer(["r&b", "contemporary r&b", "alternative r&b", "dance-pop", "synth-pop", "pop"]), "nacht");
  assert.equal(weltFuer(["reggaeton", "trap latino", "latin", "latin trap", "hip hop", "pop"]), "latino");
  assert.equal(weltFuer(["phonk", "electronic"]), "elektro");
  assert.equal(weltFuer(["lo-fi"]), "fokus");
  assert.equal(weltFuer(["hard rock", "rock", "australian"]), "rock");
});

test("Großschreibung und Leerraum stören nicht", () => {
  assert.equal(weltFuer([" Hip Hop ", "GERMAN"]), "deutschrap");
});

test("Ohne Tags oder nur unbekannte Tags: Streulicht", () => {
  assert.equal(weltFuer([]), "streulicht");
  assert.equal(weltFuer(undefined), "streulicht");
  assert.equal(weltFuer(["2010s", "english", "berlin"]), "streulicht");
  assert.equal(welt("gibtsnicht").id, "streulicht");
});

test("Jede Welt hat Name, englischen Namen und eine Hex-Farbe", () => {
  for (const w of WELTEN) {
    assert.ok(w.name && w.en, w.id);
    assert.match(w.farbe, /^#[0-9a-f]{6}$/);
  }
  assert.equal(new Set(WELTEN.map((w) => w.id)).size, WELTEN.length);
});

test("Feature-Gäste ohne Tags erben die Welt ihrer Song-Partner", () => {
  const kuenstler = {
    a: { name: "Rapper", tags: ["german", "rap"] },
    b: { name: "Gast", tags: [] },
    c: { name: "Einsam", tags: [] },
  };
  const songs = [{ kuenstler: [{ id: "a" }, { id: "b" }] }];
  const zu = weltenZuordnen(kuenstler, songs);
  assert.equal(zu.get("a"), "deutschrap");
  assert.equal(zu.get("b"), "deutschrap");
  assert.equal(zu.get("c"), "streulicht");
});

test("Schnappschuss: Struktur stimmt und keine persönlichen Felder", () => {
  const d = JSON.parse(readFileSync(new URL("../data/snapshot.json", import.meta.url), "utf8"));
  assert.ok(d.erstellt && d.zeitraeume && d.kuenstler && Array.isArray(d.zuletzt));
  for (const k of ["4w", "6m", "1y"]) {
    assert.ok(d.zeitraeume[k].kuenstler.length > 0, k);
    assert.ok(d.zeitraeume[k].songs.length > 0, k);
  }
  const text = JSON.stringify(d);
  for (const verboten of ["display_name", "email", "@gmail", "playlist", "product", "\"country\":"]) {
    assert.ok(!text.includes(verboten), "enthält " + verboten);
  }
  const songs = Object.values(d.zeitraeume).flatMap((z) => z.songs);
  const zu = weltenZuordnen(d.kuenstler, songs);
  const streu = [...zu.values()].filter((w) => w === "streulicht").length;
  assert.ok(streu / zu.size < 0.25, `zu viele ohne Welt: ${streu}/${zu.size}`);
});

import { kapitelBauen } from "../public/kapitel.js";
import { sterne as sterneAus } from "../public/daten.js";

test("Kapitel: Namen mit HTML werden escaped, ohne Länder und Tags kein Absturz", () => {
  const snap = {
    erstellt: "2026-11-01T00:00:00Z",
    kuenstler: { a: { name: "<img src=x onerror=alert(1)>", tags: [], land: null }, b: { name: "Zweiter & Co", tags: [], land: null } },
    zeitraeume: {
      "4w": { kuenstler: ["a", "b"], songs: [{ id: "s1", name: "<b>Song</b>", kuenstler: [{ id: "a", name: "<img src=x onerror=alert(1)>" }], album: "A", cover: null, dauer_ms: 1000, erschienen: "2024-01-01", url: null }] },
      "6m": { kuenstler: ["b"], songs: [] },
      "1y": { kuenstler: [], songs: [] },
    },
    zuletzt: [],
  };
  const main = { innerHTML: "" };
  const liste = sterneAus(snap);
  const kapitel = kapitelBauen(main, snap, liste, {});
  assert.ok(kapitel.length >= 8);
  assert.ok(!main.innerHTML.includes("<img src=x"), "rohes HTML im Kapiteltext");
  assert.ok(main.innerHTML.includes("&lt;img src=x"), "Name sollte escaped erscheinen");
  assert.ok(main.innerHTML.includes("Zu keinem der 2 Sterne ist eine Herkunft bekannt"));
});

test("Kapitel: leerer Schnappschuss stürzt nicht ab", () => {
  const snap = { erstellt: "2026-11-01T00:00:00Z", kuenstler: {}, zeitraeume: { "4w": { kuenstler: [], songs: [] }, "6m": { kuenstler: [], songs: [] }, "1y": { kuenstler: [], songs: [] } }, zuletzt: [] };
  const main = { innerHTML: "" };
  kapitelBauen(main, snap, sterneAus(snap), {});
  assert.ok(main.innerHTML.includes("Acht Welten"));
});

import { spracheSetzen, tx, landName } from "../public/texte.js";

test("Englische Kapitel: Titel und Texte übersetzt, Länder per Intl", () => {
  const snap = JSON.parse(readFileSync(new URL("../data/snapshot.json", import.meta.url), "utf8"));
  spracheSetzen("en");
  try {
    const main = { innerHTML: "" };
    kapitelBauen(main, snap, sterneAus(snap), {});
    assert.ok(main.innerHTML.includes("Eight worlds, one sky."));
    assert.ok(main.innerHTML.includes("German rap"));
    assert.ok(main.innerHTML.includes("Germany"));
    assert.ok(!main.innerHTML.includes("Sterne stehen"));
    assert.equal(landName("AT"), "Austria");
    assert.equal(tx().ui.z4w, "4 wk");
  } finally { spracheSetzen("de"); }
  assert.equal(landName("AT"), "Österreich");
});
