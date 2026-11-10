import test from "node:test";
import assert from "node:assert/strict";
import { normalisiereName, kosinus, zuordnen, vergleichen, zusammenfuehren } from "../public/vergleich.js";
import { himmelExportieren } from "../public/austausch.js";
import { sterne } from "../public/daten.js";

// Erfundene Profile direkt im Austauschformat.
const k = (id, name, gewicht, genres, je) => ({ id, name, gewicht, genres, je: je || { "4w": gewicht, "6m": gewicht, "1y": gewicht } });
const himmel = (name, kuenstler, genres) => ({ format: "resonanz-himmel", version: 1, name, stand: "2026-10", kuenstler,
  genres: genres || summiere(kuenstler) });
function summiere(ks) {
  const m = new Map();
  for (const x of ks) for (const g of x.genres) m.set(g, (m.get(g) || 0) + x.gewicht);
  const max = Math.max(...m.values(), 1);
  return [...m].map(([name, g]) => ({ name, gewicht: g / max }));
}
const A = () => himmel("Ana", [k("a1", "Nova Fuchs", 1, ["rap", "german"]), k("a2", "Die Lampen", 0.7, ["indie rock"]), k("a3", "Mira Tal", 0.4, ["lo-fi"])]);
const B = () => himmel("Ben", [k("b1", "NOVA FUCHS", 0.9, ["rap"]), k("b2", "Kai Stein", 0.8, ["indie rock", "alternative"]), k("b3", "Zed", 0.3, ["techno"])]);

test("Namens-Normalisierung: Akzente, Groß/Klein, &, The, Satzzeichen", () => {
  assert.equal(normalisiereName("Beyoncé"), "beyonce");
  assert.equal(normalisiereName("  BEYONCE "), "beyonce");
  assert.equal(normalisiereName("The Weeknd"), "weeknd");
  assert.equal(normalisiereName("Simon & Garfunkel"), normalisiereName("Simon and Garfunkel"));
  assert.equal(normalisiereName("Guns N' Roses"), normalisiereName("Guns N Roses"));
  assert.equal(normalisiereName("Sigur Rós"), "sigur ros");
  assert.equal(normalisiereName("Fußgänger"), "fussganger");
  assert.equal(normalisiereName("Tokio  Hotel"), "tokio hotel");
  assert.equal(normalisiereName("!!!"), "!!!"); // nur Sonderzeichen: nicht leer
  assert.equal(normalisiereName("Ｋａｉ"), "kai"); // Vollbreite
  assert.equal(normalisiereName(null), "");
});

test("Zuordnung: Kennung vor Name, Name ersatzweise, jeder höchstens einmal", () => {
  const z = zuordnen(A(), B());
  assert.equal(z.paare.length, 1);
  assert.equal(z.paare[0].a.id, "a1"); assert.equal(z.paare[0].b.id, "b1");
  assert.equal(z.nurA.length, 2); assert.equal(z.nurB.length, 2);
  // gleiche Kennung, anderer Name: trotzdem gleich
  const x = himmel("x", [k("same", "Alt", 1, [])]), y = himmel("y", [k("same", "Neu", 1, [])]);
  assert.equal(zuordnen(x, y).paare.length, 1);
  // zwei A-Künstler mit gleichem Namen, ein B: nur einer wird gepaart
  const dop = zuordnen(himmel("d", [k("1", "Eins", 1, []), k("2", "eins", 1, [])]), himmel("e", [k("9", "EINS", 1, [])]));
  assert.equal(dop.paare.length, 1); assert.equal(dop.nurA.length, 1); assert.equal(dop.nurB.length, 0);
});

test("Identisch = 100 %", () => {
  const r = vergleichen(A(), A());
  assert.ok(Math.abs(r.uebereinstimmung - 1) < 1e-9);
  assert.ok(Math.abs(r.kuenstlerAehnlichkeit - 1) < 1e-9);
  assert.ok(Math.abs(r.genreAehnlichkeit - 1) < 1e-9);
  assert.equal(r.anzahl.gemeinsam, 3); assert.equal(r.anzahl.nurA, 0); assert.equal(r.anzahl.nurB, 0);
});

test("Gleiche Künstler unter anderen Kennungen: ebenfalls 100 %", () => {
  const b = A(); b.kuenstler.forEach((x, i) => { x.id = "z" + i; x.name = x.name.toUpperCase(); });
  assert.ok(Math.abs(vergleichen(A(), b).uebereinstimmung - 1) < 1e-9);
});

test("Disjunkt = 0 %", () => {
  const a = himmel("a", [k("1", "Eins", 1, ["rap"]), k("2", "Zwei", 0.5, ["pop"])]);
  const b = himmel("b", [k("3", "Drei", 1, ["techno"]), k("4", "Vier", 0.5, ["jazz"])]);
  const r = vergleichen(a, b);
  assert.equal(r.uebereinstimmung, 0); assert.equal(r.kuenstlerAehnlichkeit, 0); assert.equal(r.genreAehnlichkeit, 0);
  assert.equal(r.anzahl.gemeinsam, 0); assert.equal(r.bruecken.length, 0);
});

test("Symmetrie: A↔B vertauscht ergibt dieselben Zahlen und vertauschte Listen", () => {
  const r1 = vergleichen(A(), B()), r2 = vergleichen(B(), A());
  for (const f of ["uebereinstimmung", "kuenstlerAehnlichkeit", "genreAehnlichkeit"]) assert.ok(Math.abs(r1[f] - r2[f]) < 1e-12, f);
  assert.deepEqual(r1.gemeinsam.map((x) => x.name.toLowerCase()), r2.gemeinsam.map((x) => x.name.toLowerCase()));
  assert.deepEqual(r1.nurA.map((x) => x.name), r2.nurB.map((x) => x.name));
  assert.deepEqual(r1.nurB.map((x) => x.name), r2.nurA.map((x) => x.name));
  assert.deepEqual(r1.bruecken.map((x) => [x.genre, x.a, x.b]), r2.bruecken.map((x) => [x.genre, x.b, x.a]));
  assert.equal(r1.nameA, "Ana"); assert.equal(r2.nameA, "Ben");
});

test("Teilweise Überlappung liegt echt zwischen 0 und 1; Zahlen getrennt ausgewiesen", () => {
  const r = vergleichen(A(), B());
  assert.ok(r.uebereinstimmung > 0 && r.uebereinstimmung < 1);
  assert.ok(r.kuenstlerAehnlichkeit > 0 && r.kuenstlerAehnlichkeit < 1);
  assert.ok(r.genreAehnlichkeit > 0 && r.genreAehnlichkeit < 1);
  assert.ok(Math.abs(r.uebereinstimmung - (r.kuenstlerAehnlichkeit + r.genreAehnlichkeit) / 2) < 1e-12);
  assert.equal(r.gemeinsam.length, 1); assert.equal(r.gemeinsam[0].name, "Nova Fuchs");
});

test("Brücken: andere Künstler, gleiches Genre; gemeinsame Künstler zählen nicht", () => {
  const r = vergleichen(A(), B());
  const g = r.bruecken.find((x) => x.genre === "indie rock");
  assert.ok(g); assert.deepEqual(g.a, ["Die Lampen"]); assert.deepEqual(g.b, ["Kai Stein"]);
  assert.ok(!r.bruecken.some((x) => x.genre === "rap")); // Nova Fuchs ist bei beiden, kein „anderer“ Künstler
  assert.ok(!r.bruecken.some((x) => x.genre === "techno"));
});

test("Grenzen: max begrenzt die Listen, nicht die Zahlen", () => {
  const viele = (p) => himmel(p, Array.from({ length: 30 }, (_, i) => k(p + i, p + " " + i, 1 - i / 40, ["rap"])));
  const r = vergleichen(viele("a"), viele("b"), { max: 5 });
  assert.equal(r.nurA.length, 5); assert.equal(r.anzahl.nurA, 30);
  assert.ok(r.bruecken[0].a.length <= 3);
});

test("Leere Genres: Übereinstimmung fällt auf die Künstler-Ähnlichkeit zurück; nichts ergibt NaN", () => {
  const a = himmel("a", [k("1", "Eins", 1, [])]), b = himmel("b", [k("1", "Eins", 1, [])]);
  const r = vergleichen(a, b);
  assert.ok(Math.abs(r.uebereinstimmung - 1) < 1e-9); assert.equal(r.genreAehnlichkeit, 0);
  const n = vergleichen(himmel("a", []), himmel("b", []));
  assert.equal(n.uebereinstimmung, 0); assert.ok(Number.isFinite(n.uebereinstimmung));
  assert.equal(kosinus(new Map(), new Map([["x", 1]])), 0);
});

test("Zusammenführen: Gruppen, Schnappschuss ist für sterne() brauchbar", () => {
  const { snapshot, gruppe } = zusammenfuehren(A(), B(), "2026-10-01T00:00:00Z");
  assert.equal(gruppe.get("a1"), "beide");
  assert.equal(gruppe.get("a2"), "a"); assert.equal(gruppe.get("b2"), "b");
  assert.equal([...gruppe.values()].filter((g) => g === "beide").length, 1);
  assert.equal(gruppe.size, 5);
  const liste = sterne(snapshot);
  assert.equal(liste.length, 5);
  assert.equal(liste[0].id, "a1"); // gemeinsam und am schwersten
  for (const z of ["4w", "6m", "1y"]) for (const id of snapshot.zeitraeume[z].kuenstler) assert.ok(snapshot.kuenstler[id]);
  assert.deepEqual(snapshot.zuletzt, []);
});

test("Zusammenführen: Kennungs-Kollision zwischen B-Künstler und A-Künstler bleibt eindeutig", () => {
  const a = himmel("a", [k("x", "Eins", 1, [])]), b = himmel("b", [k("x", "Zwei", 1, [])]);
  // gleiche Kennung gilt als gleicher Künstler (Paar), also genau ein Eintrag
  assert.equal(zusammenfuehren(a, b).gruppe.size, 1);
});

test("Ende zu Ende: Export zweier erfundener Schnappschüsse, Prüfung, Vergleich", async () => {
  const { himmelPruefen } = await import("../public/austausch.js");
  const snap = (id, name, tags) => ({ erstellt: "2026-10-31T10:00:00Z", zeitraeume: Object.fromEntries(["4w", "6m", "1y"].map((z) => [z, { kuenstler: [id], songs: [] }])), kuenstler: { [id]: { name, tags } }, zuletzt: [] });
  const a = himmelPruefen(JSON.stringify(himmelExportieren(snap("p", "Lila Welle", ["lo-fi"]), "A"))).himmel;
  const b = himmelPruefen(JSON.stringify(himmelExportieren(snap("q", "lila welle", ["lo-fi"]), "B"))).himmel;
  assert.ok(Math.abs(vergleichen(a, b).uebereinstimmung - 1) < 1e-9);
});
