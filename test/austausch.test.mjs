import test from "node:test";
import assert from "node:assert/strict";
import { himmelExportieren, himmelPruefen, ERLAUBTE_FELDER, GRENZEN, FORMAT, VERSION, saubern } from "../public/austausch.js";

// Erfundener Schnappschuss, mit Feldern, die NICHT in den Export dürfen (Zeiten, Konto, Songs).
function erfunden() {
  const k = {
    k1: { name: "Nova Fuchs", tags: ["german", "hip hop", "rap"], land: "AT", url: "https://example.invalid/k1", bild: "https://example.invalid/k1.jpg" },
    k2: { name: "Die Lampen", tags: ["indie rock", "2010s"], land: "DE" },
    k3: { name: "Mira Tal", tags: ["lo-fi", "ambient"] },
  };
  const song = (id, ids) => ({ id, name: "Lied " + id, album: "Album", cover: "https://example.invalid/c.jpg", dauer_ms: 180000, kuenstler: ids.map((i) => ({ id: i, name: k[i].name })) });
  const z = (ids) => ({ kuenstler: ids, songs: [song("s1", ["k1", "k2"]), song("s2", ["k3"])] });
  return {
    erstellt: "2026-10-31T20:15:19Z", quelle: "spotify+musicbrainz", konto: { id: "konto-123", anzeigename: "Echter Name" },
    zeitraeume: { "4w": z(["k1", "k3"]), "6m": z(["k1", "k2", "k3"]), "1y": z(["k2", "k1"]) }, kuenstler: k,
    zuletzt: [{ um: "2026-10-31T19:00:00Z", song: song("s9", ["k1"]) }],
  };
}
const exportText = (n = "Alex") => JSON.stringify(himmelExportieren(erfunden(), n));

test("Export: Feldliste ist Teilmenge der Zulassungsliste (Datei, Künstler, Zeiträume, Genres)", () => {
  const d = himmelExportieren(erfunden(), "Alex");
  for (const f of Object.keys(d)) assert.ok(ERLAUBTE_FELDER.datei.includes(f), "Datei-Feld " + f);
  assert.equal(d.format, FORMAT); assert.equal(d.version, VERSION);
  assert.ok(d.kuenstler.length === 3);
  for (const k of d.kuenstler) {
    for (const f of Object.keys(k)) assert.ok(ERLAUBTE_FELDER.kuenstler.includes(f), "Künstler-Feld " + f);
    for (const f of Object.keys(k.je)) assert.ok(ERLAUBTE_FELDER.je.includes(f), "Zeitraum " + f);
  }
  for (const g of d.genres) for (const f of Object.keys(g)) assert.ok(ERLAUBTE_FELDER.genre.includes(f));
});

test("Export: keine Zeitpunkte, keine Konto-Kennung, keine Links, keine Songs, nur der Monat", () => {
  const text = exportText("Alex");
  for (const verboten of ["2026-10-31", "20:15", "19:00", "konto-123", "Echter Name", "example.invalid", "Lied s1", "zuletzt", "songs", "url", "bild", "cover", "spotify"]) {
    assert.ok(!text.includes(verboten), verboten);
  }
  const d = JSON.parse(text);
  assert.equal(d.stand, "2026-10");
  assert.equal(d.name, "Alex");
  assert.ok(text.length < 4000);
});

test("Export: Anzeigename wird gesäubert und gekürzt, Jahrzehnt-Tags fallen weg", () => {
  const d = himmelExportieren(erfunden(), "  <b>Alex</b>\u202e\n" + "x".repeat(100));
  assert.ok(!/[<>\u202e\n]/.test(d.name));
  assert.ok(d.name.length <= GRENZEN.anzeigename);
  assert.ok(!d.genres.some((g) => g.name === "2010s"));
  assert.equal(himmelExportieren(erfunden()).name, "");
});

test("Export: Rundlauf – das eigene Export besteht die Prüfung unverändert", () => {
  const r = himmelPruefen(exportText("Alex"));
  assert.equal(r.ok, true);
  assert.deepEqual(r.himmel, JSON.parse(exportText("Alex")));
});

test("Import: kaputtes JSON, falsches Format, falsche Version", () => {
  assert.equal(himmelPruefen("{nicht json").grund, "kein-json");
  assert.equal(himmelPruefen("").grund, "kein-json");
  assert.equal(himmelPruefen(null).grund, "kein-json");
  assert.equal(himmelPruefen("[]").grund, "format");
  assert.equal(himmelPruefen('"text"').grund, "format");
  assert.equal(himmelPruefen(JSON.stringify({ format: "anderes", version: 1 })).grund, "format");
  const d = JSON.parse(exportText());
  assert.equal(himmelPruefen(JSON.stringify({ ...d, version: 2 })).grund, "version");
  assert.equal(himmelPruefen(JSON.stringify({ ...d, version: "1" })).grund, "version");
  assert.equal(himmelPruefen(JSON.stringify({ ...d, kuenstler: "x" })).grund, "struktur");
});

test("Import: übergroße Datei und zu viele Einträge werden abgelehnt", () => {
  assert.equal(himmelPruefen(" ".repeat(GRENZEN.bytes + 1)).grund, "zu-gross");
  const d = JSON.parse(exportText());
  const viele = Array.from({ length: GRENZEN.kuenstler + 1 }, (_, i) => ({ ...d.kuenstler[0], id: "x" + i }));
  assert.equal(himmelPruefen(JSON.stringify({ ...d, kuenstler: viele })).grund, "zu-viele");
  const genres = Array.from({ length: GRENZEN.genresGesamt + 1 }, (_, i) => ({ name: "g" + i, gewicht: 1 }));
  assert.equal(himmelPruefen(JSON.stringify({ ...d, genres })).grund, "zu-viele");
  const k = { ...d.kuenstler[0], genres: Array.from({ length: GRENZEN.genresJeKuenstler + 1 }, (_, i) => "g" + i) };
  assert.equal(himmelPruefen(JSON.stringify({ ...d, kuenstler: [k] })).grund, "zu-viele");
});

test("Import: falsche Typen und Werte werden abgelehnt", () => {
  const d = JSON.parse(exportText());
  const mit = (aender) => himmelPruefen(JSON.stringify({ ...d, kuenstler: [{ ...d.kuenstler[0], ...aender }] }));
  for (const schlecht of [{ gewicht: "1" }, { gewicht: -1 }, { gewicht: 99 }, { gewicht: null }, { id: 5 }, { name: ["x"] }, { name: "n".repeat(GRENZEN.name + 1) },
    { id: "i".repeat(GRENZEN.id + 1) }, { je: [] }, { je: { "4w": "viel" } }, { je: { "1y": 1e9 } }, { genres: "rap" }, { genres: [1] }, { genres: ["g".repeat(GRENZEN.genre + 1)] }, { land: "Österreich" }]) {
    assert.equal(mit(schlecht).ok, false, JSON.stringify(schlecht));
  }
  assert.equal(himmelPruefen(JSON.stringify({ ...d, genres: [{ name: "rap", gewicht: "x" }] })).ok, false);
  assert.equal(himmelPruefen(JSON.stringify({ ...d, genres: ["rap"] })).ok, false);
  assert.equal(himmelPruefen(JSON.stringify({ ...d, stand: "gestern" })).ok, false);
  assert.equal(himmelPruefen(JSON.stringify({ ...d, kuenstler: [] })).ok, false);
  assert.equal(himmelPruefen(JSON.stringify({ ...d, name: 5 })).ok, false);
});

test("Import: unbekannte und bösartige Felder kommen nicht in die Kopie", () => {
  const d = JSON.parse(exportText());
  const text = JSON.stringify({ ...d, konto: "geheim", url: "javascript:alert(1)", kuenstler: d.kuenstler.map((k) => ({ ...k, bild: "https://x.invalid/a.png", zeit: "2026-01-01T00:00:00Z", extra: { tief: 1 } })) })
    .replace("{", '{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},');
  const r = himmelPruefen(text);
  assert.equal(r.ok, true);
  for (const f of Object.keys(r.himmel)) assert.ok(ERLAUBTE_FELDER.datei.includes(f), f);
  for (const k of r.himmel.kuenstler) for (const f of Object.keys(k)) assert.ok(ERLAUBTE_FELDER.kuenstler.includes(f), f);
  assert.equal({}.polluted, undefined);
  assert.equal(r.himmel.polluted, undefined);
  assert.ok(!JSON.stringify(r.himmel).includes("javascript:"));
});

test("Import: HTML und Steuerzeichen in Texten werden entschärft", () => {
  const d = JSON.parse(exportText());
  const bose = { ...d, name: "<img src=x onerror=alert(1)>Eve\u202e", kuenstler: [{ ...d.kuenstler[0], name: "<script>alert(1)</script>Band\u0000\n", genres: ["<b>rap</b>"] }] };
  const r = himmelPruefen(JSON.stringify(bose));
  assert.equal(r.ok, true);
  const alles = JSON.stringify(r.himmel);
  assert.ok(!/[<>]/.test(alles));
  assert.ok(!/[\u0000-\u001f\u202e]/.test(r.himmel.kuenstler[0].name + r.himmel.name));
  assert.ok(r.himmel.kuenstler[0].name.startsWith("scriptalert"));
});

test("Import: doppelte Kennungen und leere Namen werden weggelassen", () => {
  const d = JSON.parse(exportText());
  const k = d.kuenstler[0];
  const r = himmelPruefen(JSON.stringify({ ...d, kuenstler: [k, { ...k }, { ...k, id: "leer", name: "<>" }, { ...k, id: "ok", name: "Anderer" }] }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.himmel.kuenstler.map((x) => x.id), [k.id, "ok"]);
});

test("saubern: Nicht-Text gibt leer, Länge begrenzt", () => {
  assert.equal(saubern(5, 10), "");
  assert.equal(saubern("abcdef", 3), "abc");
  assert.equal(saubern("  a \t b  ", 10), "a b");
});
