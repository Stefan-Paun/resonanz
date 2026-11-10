import test from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { zipLesen, streamsNormalisieren, verlaufAuswerten, verlaufAusZip, istVerlaufsdatei } from "../public/verlauf.js";

// Minimaler ZIP-Schreiber für die Tests (Deflate und Store), damit kein Fixture ins Repo muss.
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; }
  return (crc ^ 0xffffffff) >>> 0;
}
function zipBauen(dateien) {
  const teile = [], cd = []; let offset = 0;
  for (const { name, text, store } of dateien) {
    const roh = Buffer.from(text, "utf8"), komp = store ? roh : deflateRawSync(roh), n = Buffer.from(name, "utf8");
    const lokal = Buffer.alloc(30); lokal.writeUInt32LE(0x04034b50, 0); lokal.writeUInt16LE(20, 4); lokal.writeUInt16LE(store ? 0 : 8, 8);
    lokal.writeUInt32LE(crc32(roh), 14); lokal.writeUInt32LE(komp.length, 18); lokal.writeUInt32LE(roh.length, 22); lokal.writeUInt16LE(n.length, 26);
    const eintrag = Buffer.alloc(46); eintrag.writeUInt32LE(0x02014b50, 0); eintrag.writeUInt16LE(20, 6); eintrag.writeUInt16LE(store ? 0 : 8, 10);
    eintrag.writeUInt32LE(crc32(roh), 16); eintrag.writeUInt32LE(komp.length, 20); eintrag.writeUInt32LE(roh.length, 24); eintrag.writeUInt16LE(n.length, 28); eintrag.writeUInt32LE(offset, 42);
    cd.push(Buffer.concat([eintrag, n]));
    teile.push(lokal, n, komp); offset += lokal.length + n.length + komp.length;
  }
  const cdBuf = Buffer.concat(cd);
  const eocd = Buffer.alloc(22); eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(dateien.length, 8); eocd.writeUInt16LE(dateien.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12); eocd.writeUInt32LE(offset, 16);
  const b = Buffer.concat([...teile, cdBuf, eocd]);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

const eintrag = (ts, ms, artist, track, extra = {}) => ({ ts, ms_played: ms, master_metadata_track_name: track, master_metadata_album_artist_name: artist, master_metadata_album_album_name: "Album", spotify_track_uri: "spotify:track:x", skipped: false, platform: "ios", conn_country: "AT", ...extra });

test("Verlaufsdateien werden erkannt", () => {
  assert.ok(istVerlaufsdatei("Spotify Extended Streaming History/Streaming_History_Audio_2024-2025_3.json"));
  assert.ok(istVerlaufsdatei("MyData/StreamingHistory0.json"));
  assert.ok(istVerlaufsdatei("endsong_0.json"));
  assert.ok(!istVerlaufsdatei("Streaming_History_Video_2024.json"));
  assert.ok(!istVerlaufsdatei("ReadMeFirst_ExtendedStreamingHistory.pdf"));
});

test("ZIP lesen: Deflate und Store, Filter, UTF-8-Namen", async () => {
  const buf = zipBauen([
    { name: "Ordner/Streaming_History_Audio_2025_0.json", text: JSON.stringify([eintrag("2025-03-01T20:00:00Z", 200000, "Capital Bra", "Benzema")]) },
    { name: "Ordner/ReadMe.pdf", text: "nicht json", store: true },
    { name: "Ordner/Ünïcode.txt", text: "ß", store: true },
  ]);
  const alle = await zipLesen(buf);
  assert.deepEqual(alle.map((d) => d.name).sort(), ["Ordner/ReadMe.pdf", "Ordner/Streaming_History_Audio_2025_0.json", "Ordner/Ünïcode.txt"]);
  assert.equal(new TextDecoder().decode(alle.find((d) => d.name.endsWith("txt")).bytes), "ß");
  const nurVerlauf = await zipLesen(buf, istVerlaufsdatei);
  assert.equal(nurVerlauf.length, 1);
  await assert.rejects(zipLesen(new Uint8Array(40).buffer), /Kein ZIP/);
});

test("Normalisieren: beide Exportformate, Podcasts fallen raus, sortiert", () => {
  const s = streamsNormalisieren([
    eintrag("2025-03-02T01:30:00Z", 60000, "Samra", "Cataleya"),
    eintrag("2025-03-01T22:00:00Z", 120000, "Capital Bra", "Benzema", { skipped: true }),
    { ts: "2025-03-01T23:00:00Z", ms_played: 900000, episode_name: "Podcast", master_metadata_track_name: null, master_metadata_album_artist_name: null },
    { endTime: "2024-12-24 18:05", msPlayed: 180000, artistName: "Sido", trackName: "Astronaut" },
    null,
  ]);
  assert.equal(s.length, 3);
  assert.deepEqual(s.map((x) => x.kuenstler), ["Sido", "Capital Bra", "Samra"]);
  assert.equal(s[1].uebersprungen, true);
  assert.equal(s[0].uebersprungen, null);
});

test("Auswerten: Heatmap in Wiener Zeit, Nachtanteil, Serie, Top-Listen, Skip-Quote", () => {
  // 22:00Z im März = 23:00 Wien (Winterzeit) → Nacht; 01:30Z = 02:30 Wien → Nacht; 18:00Z im Juli = 20:00 Wien → Tag
  const streams = streamsNormalisieren([
    eintrag("2025-03-01T22:00:00Z", 3600000, "Capital Bra", "Benzema", { skipped: true }),
    eintrag("2025-03-02T01:30:00Z", 1800000, "Samra", "Cataleya"),
    eintrag("2025-03-03T10:00:00Z", 10000, "Kurz", "Übersprungen", { skipped: true }), // unter 30 s: zählt nicht als Hörzeit
    eintrag("2025-07-10T18:00:00Z", 1800000, "Capital Bra", "Benzema"),
    eintrag("2025-07-11T18:00:00Z", 60000, "Capital Bra", "Neymar"),
    eintrag("2025-07-12T18:00:00Z", 60000, "Capital Bra", "Neymar"),
  ]);
  const a = verlaufAuswerten(streams);
  assert.equal(a.streams, 6);
  assert.equal(a.gezaehlt, 5);
  assert.equal(Math.round(a.stunden * 60), 60 + 30 + 30 + 1 + 1);
  assert.ok(Math.abs(a.nachtAnteil - 90 / 122) < 1e-9);
  assert.equal(a.heat[5][23], 60, "Samstag 23 Uhr Wien");  // 1. März 2025 ist ein Samstag
  assert.equal(a.heat[6][2], 30, "Sonntag 2 Uhr Wien");
  assert.equal(a.heat[3][20], 30, "Donnerstag 20 Uhr Wien (Sommerzeit)");
  assert.equal(a.spitze.name, "Sa");
  assert.equal(a.laengsteSerie, 3);
  assert.equal(a.tage, 5);
  assert.equal(a.topKuenstler[0].name, "Capital Bra");
  assert.equal(a.topSongs[0].name, "Benzema – Capital Bra");
  assert.deepEqual(a.monate.map((m) => m.key), ["2025-03", "2025-07"]);
  assert.ok(Math.abs(a.skipQuote - 2 / 6) < 1e-9);
  assert.equal(verlaufAuswerten([]).skipQuote, null);
});

test("verlaufAusZip: komplett vom Archiv zur Auswertung, Fehler ohne Verlaufsdateien", async () => {
  const buf = zipBauen([
    { name: "Streaming_History_Audio_2025_0.json", text: JSON.stringify([eintrag("2025-03-01T22:00:00Z", 60000, "Capital Bra", "Benzema")]) },
    { name: "Streaming_History_Audio_2025_1.json", text: JSON.stringify([eintrag("2025-03-02T22:00:00Z", 60000, "Samra", "Cataleya")]) },
  ]);
  const a = await verlaufAusZip(buf);
  assert.equal(a.streams, 2);
  await assert.rejects(verlaufAusZip(zipBauen([{ name: "x.txt", text: "x", store: true }])), /kein Streaming-Verlauf/);
});

test("verlaufAusZip: kaputte Datei wird übersprungen und benannt, gute zählt", async () => {
  const buf = zipBauen([
    { name: "Streaming_History_Audio_2025_0.json", text: "{ das ist kein json" },
    { name: "Streaming_History_Audio_2025_1.json", text: JSON.stringify([eintrag("2025-03-02T22:00:00Z", 60000, "Künstler A", "Titel A")]) },
  ]);
  const a = await verlaufAusZip(buf);
  assert.equal(a.streams, 1);
  assert.deepEqual(a.uebersprungeneDateien, ["Streaming_History_Audio_2025_0.json"]);
  const sauber = await verlaufAusZip(zipBauen([{ name: "Streaming_History_Audio_2025_1.json", text: "[]" }]));
  assert.deepEqual(sauber.uebersprungeneDateien, []);
});

test("verlaufAusZip: wenn nichts lesbar ist, gibt es einen klaren Fehler", async () => {
  const buf = zipBauen([{ name: "Streaming_History_Audio_2025_0.json", text: "kaputt" }, { name: "Streaming_History_Audio_2025_1.json", text: "{}" }]);
  await assert.rejects(verlaufAusZip(buf), /nicht lesbar|lesbar/);
});

test("Normalisieren: identische Streams aus überlappenden Exporten zählen einmal", () => {
  const a = eintrag("2025-03-01T22:00:00Z", 60000, "Künstler A", "Titel A");
  const s = streamsNormalisieren([a, { ...a }, eintrag("2025-03-01T22:00:00Z", 60001, "Künstler A", "Titel A"), eintrag("2025-03-01T22:05:00Z", 60000, "Künstler A", "Titel A")]);
  assert.equal(s.length, 3, "gleiche t/Künstler/Titel/ms nur einmal; andere ms oder t bleiben");
  assert.deepEqual(streamsNormalisieren([]), []);
});

test("ZIP64-Marker: verständliche Fehlermeldung statt Müll", async () => {
  const buf = zipBauen([{ name: "Streaming_History_Audio_2025_0.json", text: "[]" }]);
  const dv = new DataView(buf), eocd = buf.byteLength - 22;
  dv.setUint16(eocd + 10, 0xFFFF, true);
  await assert.rejects(zipLesen(buf), /ZIP64/);
  const buf2 = zipBauen([{ name: "Streaming_History_Audio_2025_0.json", text: "[]" }]);
  new DataView(buf2).setUint32(buf2.byteLength - 22 + 16, 0xFFFFFFFF, true);
  await assert.rejects(zipLesen(buf2), /ZIP64/);
});

test("Zeitumstellung: 30.03.2025 01:30 UTC ist 03:30 Wiener Sommerzeit, 29.03. 23:30 UTC ist 00:30", () => {
  const a = verlaufAuswerten(streamsNormalisieren([
    eintrag("2025-03-30T01:30:00Z", 60000, "Künstler A", "Titel A"),
    eintrag("2025-03-29T23:30:00Z", 120000, "Künstler A", "Titel B"),
  ]));
  assert.equal(a.heat[6][3], 1, "Sonntag 3 Uhr (nach der Umstellung)");
  assert.equal(a.heat[6][0], 2, "Sonntag 0 Uhr");
});
