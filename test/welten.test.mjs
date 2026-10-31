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
