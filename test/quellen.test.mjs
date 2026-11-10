import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { csvLesen, csvLesenAsync } from "../public/quellen/csv.js";
import { eintrag, zeitLesen, fuerAuswertung, GRENZEN } from "../public/quellen/format.js";
import { appleLesen } from "../public/quellen/apple.js";
import { lastfmCsvLesen, lastfmJsonLesen } from "../public/quellen/lastfm.js";
import { youtubeLesen } from "../public/quellen/youtube.js";
import { erkennen, quelleLesen } from "../public/quellen/erkennen.js";
import { weltenVerteilung, UNBEKANNT } from "../public/quellen/welten.js";
import { streamsNormalisieren, verlaufAuswerten } from "../public/verlauf.js";

const fx = (n) => readFileSync(new URL("./fixtures/" + n, import.meta.url), "utf8");
const OHNE_PAUSE = { pause: async () => {} };

test("CSV: Anführungszeichen, Komma und Zeilenumbruch im Feld, BOM, ; und Tab", () => {
  assert.deepEqual(csvLesen('﻿a,b\n"x, ""y""","z\nw"\n'), [["a", "b"], ['x, "y"', "z\nw"]]);
  assert.deepEqual(csvLesen("a;b\r\n1;2\r\n\r\n3;4"), [["a", "b"], ["1", "2"], ["3", "4"]]);
  assert.deepEqual(csvLesen("a\tb\n1\t2"), [["a", "b"], ["1", "2"]]);
  assert.deepEqual(csvLesen(""), []);
  assert.deepEqual(csvLesen('a,b\n1,"offen'), [["a", "b"], ["1", "offen"]]);
});

test("CSV: Zeilenobergrenze und Feldlänge", () => {
  assert.throws(() => csvLesen("a\n1\n2\n3", { maxZeilen: 3 }), /mehr als/);
  assert.equal(csvLesen("a\n" + "x".repeat(100000), { maxFeld: 50 })[1][0].length, 50);
});

test("Zeit: alles nach UTC", () => {
  assert.equal(zeitLesen("2025-03-01T22:00:00Z"), Date.UTC(2025, 2, 1, 22));
  assert.equal(zeitLesen("2025-03-01T23:00:00+01:00"), Date.UTC(2025, 2, 1, 22));
  assert.equal(zeitLesen("2025-03-01 22:00:00"), Date.UTC(2025, 2, 1, 22));
  assert.equal(zeitLesen("1 Mar 2025, 22:00"), Date.UTC(2025, 2, 1, 22));
  assert.equal(zeitLesen("1740866400"), 1740866400000);
  assert.ok(Number.isNaN(zeitLesen("gestern")));
});

test("Eintrag: leere Felder, Zeit, Länge", () => {
  assert.equal(eintrag({ t: NaN, kuenstler: "a", titel: "b", quelle: "x" }), null);
  assert.equal(eintrag({ t: 1, kuenstler: " ", titel: "b", quelle: "x" }), null);
  assert.equal(eintrag({ t: 1, kuenstler: "a", titel: "x".repeat(10000), quelle: "x" }).titel.length, GRENZEN.feldZeichen);
});

test("Apple: normale Datei, Kurzes fällt weg, Anführungszeichen und Umbruch bleiben", () => {
  const { streams, verworfen } = appleLesen(fx("apple-play-activity.csv"));
  assert.equal(streams.length, 2);
  assert.equal(verworfen, 2); // 10 s und fehlender Zeitpunkt
  assert.equal(streams[0].quelle, "apple");
  assert.equal(streams[0].ms, 200000);
  assert.equal(streams[0].t, Date.UTC(2025, 2, 1, 22));
  assert.equal(streams[1].titel, "Zeile\nUmbruch".replace("\n", " "));
});

test("Apple: andere Spaltennamen und ; werden erkannt, fehlende Spalten melden", () => {
  const r = appleLesen("date;title;artist;duration\n2025-03-01T22:00:00Z;A;B;60000\n");
  assert.equal(r.streams.length, 1);
  assert.throws(() => appleLesen("Song Name,Album\nA,B"), /Spalten fehlen/);
});

test("Apple: ohne Dauerspalte bleibt ms leer, lange Felder werden gekürzt", () => {
  const r = appleLesen(`Event Start Timestamp,Song Name,Artist Name\n2025-03-01T22:00:00Z,${"t".repeat(9000)},B\n`);
  assert.equal(r.streams[0].ms, null);
  assert.equal(r.streams[0].titel.length, GRENZEN.feldZeichen);
});

test("Last.fm CSV: ohne Kopfzeile, kaputte Zeile, Semikolon im Titel", () => {
  const { streams, verworfen } = lastfmCsvLesen(fx("lastfm.csv"));
  assert.equal(streams.length, 2); assert.equal(verworfen, 1); // 3. Zeile: kein Datum
  assert.equal(streams[0].album, "Nachtfahrt");
  assert.equal(streams[1].album, null);
  assert.equal(streams[1].titel, "Titel; mit Semikolon");
});

test("Last.fm CSV: mit Kopfzeile und anderer Reihenfolge; fehlende Spalten", () => {
  const r = lastfmCsvLesen("Datum,Titel,Album,Künstler\n2025-03-01 22:00,T,A,K\nkaputt,T,A,K\n");
  assert.equal(r.streams.length, 1); assert.equal(r.verworfen, 1);
  assert.equal(r.streams[0].kuenstler, "K");
  assert.throws(() => lastfmCsvLesen("a,b\n1,2"), /Spalten fehlen/);
});

test("Last.fm JSON: nowplaying ohne Datum fällt weg, uts zählt als UTC", () => {
  const r = lastfmJsonLesen(JSON.parse(fx("lastfm.json")));
  assert.equal(r.streams.length, 2); assert.equal(r.verworfen, 1);
  assert.equal(r.streams[0].t, 1740866400000);
  assert.deepEqual(lastfmJsonLesen([]).streams, []);
  assert.deepEqual(lastfmJsonLesen({ recenttracks: { track: [5, null, { artist: "x" }] } }).streams, []);
});

test("YouTube Music: nur Musik, Vorsatz und „ - Topic“ weg, ohne Kanal kaputt", () => {
  const r = youtubeLesen(JSON.parse(fx("watch-history.json")));
  assert.equal(r.streams.length, 2); assert.equal(r.andere, 1); assert.equal(r.verworfen, 1);
  assert.equal(r.streams[0].titel, "Sternenstaub");
  assert.equal(r.streams[0].kuenstler, "Lena Beispiel");
  assert.equal(r.streams[0].quelle, "youtube");
  assert.throws(() => youtubeLesen({}), /Liste/);
  assert.deepEqual(youtubeLesen([]).streams, []);
  const lang = youtubeLesen([{ header: "YouTube Music", title: "Angesehen: " + "x".repeat(8000), subtitles: [{ name: "K" }], time: "2025-01-01T00:00:00Z" }]);
  assert.equal(lang.streams[0].titel.length, GRENZEN.feldZeichen);
});

test("Erkennen: am Inhalt, nicht am Namen", () => {
  assert.equal(erkennen(fx("apple-play-activity.csv")).quelle, "apple");
  assert.equal(erkennen(fx("lastfm.csv")).quelle, "lastfm");
  assert.equal(erkennen(fx("lastfm.json")).quelle, "lastfm");
  assert.equal(erkennen(fx("watch-history.json")).quelle, "youtube");
  assert.equal(erkennen('[{"ts":"2025-03-01T22:00:00Z","ms_played":1}]').quelle, "spotify");
});

test("Erkennen: verständliche Meldungen bei leer, kaputt, unbekannt", () => {
  assert.throws(() => erkennen(""), /leer.*Erwartet/s);
  assert.throws(() => erkennen("  \n"), /leer/);
  assert.throws(() => erkennen("[1,2"), /beschädigt/);
  assert.throws(() => erkennen('{"a":1}'), /kenne ich nicht.*Erwartet/s);
  assert.throws(() => erkennen("x,y\n1,2"), /keiner bekannten Quelle.*Play Activity/s);
});

test("quelleLesen: Portionen, Fortschritt, sortiert, leere Ergebnisse melden", async () => {
  let kopf = "Event Start Timestamp,Song Name,Artist Name,Play Duration Milliseconds\n", zeilen = "";
  for (let i = 0; i < 25; i++) zeilen += `2025-03-${String(25 - i).padStart(2, "0")}T10:00:00Z,T${i},K,60000\n`;
  const stand = []; let pausen = 0;
  const r = await quelleLesen(kopf + zeilen, { portion: 10, fortschritt: (x) => stand.push(x), pause: async () => { pausen++; } });
  assert.equal(r.streams.length, 25);
  assert.equal(pausen, 3);
  assert.equal(stand.at(-1), 1);
  assert.ok(stand.every((x, i) => i === 0 || x >= stand[i - 1]));
  assert.ok(r.streams.every((s, i) => i === 0 || s.t >= r.streams[i - 1].t));
  await assert.rejects(quelleLesen(kopf, OHNE_PAUSE), /kein einziger Titel/);
  await assert.rejects(quelleLesen(kopf + "2025-03-01T10:00:00Z,T,K,5000\n", OHNE_PAUSE), /kein einziger/);
});

test("quelleLesen: alle Quellen, auch ohne Kopfzeile in mehreren Portionen", async () => {
  for (const [n, q, anz] of [["apple-play-activity.csv", "apple", 2], ["lastfm.csv", "lastfm", 2], ["lastfm.json", "lastfm", 2], ["watch-history.json", "youtube", 2]]) {
    const r = await quelleLesen(fx(n), { portion: 1, ...OHNE_PAUSE });
    assert.equal(r.quelle, q); assert.equal(r.streams.length, anz, n);
  }
});

test("quelleLesen: Größengrenze", async () => {
  await assert.rejects(quelleLesen("x".repeat(GRENZEN.dateiBytes + 1), OHNE_PAUSE), /150 MB/);
  await assert.rejects(quelleLesen(null), /kein Text/);
});

test("Zwischenformat → Auswertung: fehlende Dauer wird geschätzt, Heatmap in Wiener Zeit", async () => {
  const r = await quelleLesen(fx("watch-history.json"), OHNE_PAUSE);
  const a = verlaufAuswerten(fuerAuswertung(r.streams));
  assert.equal(a.gezaehlt, 2);
  assert.equal(a.heat[5][23], 3.5, "1. März 22:00Z = Samstag 23 Uhr Wien");
  assert.equal(verlaufAuswerten(r.streams).gezaehlt, 0, "ohne Schätzung zählt ms=null nicht");
});

test("Spotify: Abbildung auf das Zwischenformat, Auswertung unverändert", () => {
  const roh = [
    { ts: "2025-03-01T22:00:00Z", ms_played: 120000, master_metadata_track_name: "Benzema", master_metadata_album_artist_name: "Capital Bra", master_metadata_album_album_name: "Berlin lebt", spotify_track_uri: "u", skipped: true },
    { endTime: "2024-12-24 18:05", msPlayed: 180000, artistName: "Sido", trackName: "Astronaut" },
  ];
  const s = streamsNormalisieren(roh);
  assert.deepEqual(s[0], { t: Date.UTC(2024, 11, 24, 18, 5), ms: 180000, kuenstler: "Sido", titel: "Astronaut", album: null, uebersprungen: null, uri: null, quelle: "spotify" });
  assert.equal(s[1].album, "Berlin lebt");
  const a = verlaufAuswerten(s);
  assert.equal(a.streams, 2); assert.equal(a.gezaehlt, 2); assert.equal(Math.round(a.stunden * 60), 5);
  assert.equal(a.skipQuote, 1);
});

test("Welten: bekannte Künstler über den Himmel, Rest „unbekannt“", () => {
  const snap = { zeitraeume: {}, kuenstler: { a: { name: "Capital Bra", tags: ["german", "hip hop", "rap"] }, b: { name: "Ohne Tags", tags: [] } } };
  const v = weltenVerteilung([
    { kuenstler: "capital  BRA", ms: 3600000 }, { kuenstler: "Fremd", ms: 1800000 }, { kuenstler: "Ohne Tags", ms: null },
  ], snap);
  assert.deepEqual(v.map((x) => x.welt), ["deutschrap", UNBEKANNT]);
  assert.equal(v[0].stunden, 1);
  assert.ok(Math.abs(v[1].stunden - (1800000 + 210000) / 3600000) < 1e-9);
  assert.deepEqual(weltenVerteilung([], snap), []);
});

test("Hilfetexte: je Quelle in de und en vorhanden, gleiche Schlüssel", async () => {
  const { tx, spracheSetzen } = await import("../public/texte.js");
  const holen = (l) => { spracheSetzen(l); return tx().eigener; };
  const de = holen("de"), en = holen("en");
  assert.deepEqual(Object.keys(de).sort(), Object.keys(en).sort());
  assert.equal(de.quellenHilfe.length, 3); assert.equal(en.quellenHilfe.length, 3);
  assert.deepEqual(de.quellenHilfe.map((x) => x[0]), en.quellenHilfe.map((x) => x[0]));
  assert.ok(en.quelleFertig("Last.fm", { streams: 3, stunden: 1 }, 2).includes("skipped"));
  spracheSetzen("de");
});

test("G24: vorab geparstes JSON wird nicht noch einmal geparst", () => {
  const e = erkennen("[kaputt, wird nie geparst", { json: [{ ts: "2025-01-01T10:00:00Z" }] });
  assert.equal(e.quelle, "spotify");
});

test("G24: CSV wird in Portionen mit Pausen gelesen, Ergebnis wie am Stück", async () => {
  const text = "a,b\n" + Array.from({ length: 500 }, (_, i) => `${i},"x ${i}"`).join("\n");
  let pausen = 0; const stand = [];
  const z = await csvLesenAsync(text, { block: 200, pause: async () => { pausen++; }, fortschritt: (p) => stand.push(p) });
  assert.deepEqual(z, csvLesen(text));
  assert.ok(pausen >= 5 && pausen === stand.length);
  assert.ok(stand.every((p, i) => p > 0 && p < 1 && (i === 0 || p > stand[i - 1])));
});

test("G24: Fehlermeldungen folgen der Sprache (de/en)", async () => {
  const { spracheSetzen } = await import("../public/texte.js");
  try {
    spracheSetzen("en");
    assert.throws(() => erkennen("[1,2"), /damaged or cut off.*Expected:/);
    assert.throws(() => erkennen(""), /file is empty/);
    await assert.rejects(quelleLesen("a\n1\n2", { portion: 1 }).then(() => { throw new Error("sollte nicht klappen"); }), /columns|empty/);
  } finally { spracheSetzen("de"); }
  assert.throws(() => erkennen("[1,2"), /beschädigt.*Erwartet wird/);
});
