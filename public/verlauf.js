// Erweiterter Streaming-Verlauf (Spotify-Export): ZIP lesen, Streams zählen, Muster finden.
// Reine Funktionen; die ZIP-Entpackung braucht DecompressionStream (Browser oder Node 18+).

const TEXT = new TextDecoder("utf-8");

/** Liest ein ZIP (ArrayBuffer) und gibt {name, bytes} für jede Datei zurück, für die `filter(name)` wahr ist. */
const MAX_ZIP = 600 * 1024 * 1024, MAX_DATEI = 400 * 1024 * 1024;
export async function zipLesen(buffer, filter = () => true) {
  if (buffer.byteLength > MAX_ZIP) throw new Error("Das ZIP ist größer als 600 MB, das ist kein Streaming-Verlauf.");
  const dv = new DataView(buffer), u8 = new Uint8Array(buffer);
  // End of central directory: von hinten suchen (Signatur 0x06054b50)
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Kein ZIP-Archiv");
  const anzahl = dv.getUint16(eocd + 10, true), cdStart = dv.getUint32(eocd + 16, true);
  // ZIP64: Zähler oder Offset sind Platzhalter, die echten Werte stehen in einem Zusatzblock, den wir nicht lesen.
  if (anzahl === 0xFFFF || cdStart === 0xFFFFFFFF) throw new Error("Dieses ZIP nutzt das ZIP64-Format (sehr großes Archiv) und wird nicht unterstützt. Bitte die Verlaufsdateien (Streaming_History_Audio_*.json) einzeln entpacken und stattdessen ein neues ZIP nur damit packen.");
  const dateien = [];
  let p = cdStart;
  for (let n = 0; n < anzahl; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const methode = dv.getUint16(p + 10, true), groesseKomp = dv.getUint32(p + 20, true), groesseRoh = dv.getUint32(p + 24, true);
    const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), kommLen = dv.getUint16(p + 32, true);
    const lokal = dv.getUint32(p + 42, true), flags = dv.getUint16(p + 8, true);
    const name = TEXT.decode(u8.subarray(p + 46, p + 46 + nameLen));
    if (flags & 1) throw new Error("Das ZIP ist verschlüsselt: " + name);
    if (groesseRoh > MAX_DATEI || lokal + 30 > u8.length) throw new Error("ZIP-Eintrag unbrauchbar: " + name);
    p += 46 + nameLen + extraLen + kommLen;
    if (!filter(name) || name.endsWith("/")) continue;
    if (groesseKomp === 0xFFFFFFFF || groesseRoh === 0xFFFFFFFF || lokal === 0xFFFFFFFF) throw new Error("ZIP64-Eintrag wird nicht unterstützt: " + name);
    const lNameLen = dv.getUint16(lokal + 26, true), lExtraLen = dv.getUint16(lokal + 28, true);
    const start = lokal + 30 + lNameLen + lExtraLen;
    const roh = u8.subarray(start, start + groesseKomp);
    let bytes;
    if (methode === 0) bytes = roh;
    else if (methode === 8) {
      const ds = new DecompressionStream("deflate-raw");
      const stream = new Blob([roh]).stream().pipeThrough(ds);
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } else throw new Error("ZIP-Methode " + methode + " nicht unterstützt: " + name);
    if (groesseRoh && bytes.length !== groesseRoh) throw new Error("ZIP-Eintrag beschädigt: " + name);
    dateien.push({ name, bytes });
  }
  return dateien;
}

export const istVerlaufsdatei = (name) => /Streaming_History_Audio.*\.json$/i.test(name) || /StreamingHistory\d*\.json$/i.test(name) || /endsong_\d+\.json$/i.test(name);

/**
 * Normalisiert Einträge aus dem erweiterten Export (ts, ms_played, master_metadata_*)
 * und aus dem kleinen Export (endTime, msPlayed, artistName, trackName) zu {t, ms, kuenstler, titel, uebersprungen}.
 */
export function streamsNormalisieren(eintraege) {
  const out = [], gesehen = new Set();
  for (const e of eintraege) {
    if (!e) continue;
    let t, ms, kuenstler, titel, skip = null, uri = null;
    if (typeof e.ts === "string") {
      t = Date.parse(e.ts); ms = e.ms_played || 0;
      kuenstler = e.master_metadata_album_artist_name; titel = e.master_metadata_track_name;
      skip = typeof e.skipped === "boolean" ? e.skipped : null; uri = e.spotify_track_uri || null;
    } else if (typeof e.endTime === "string") {
      t = Date.parse(e.endTime.replace(" ", "T") + ":00Z"); ms = e.msPlayed || 0;
      kuenstler = e.artistName; titel = e.trackName;
    } else continue;
    if (!kuenstler || !titel || !Number.isFinite(t)) continue; // Podcasts und kaputte Zeilen
    // Überlappende Exporte: derselbe Stream darf nur einmal zählen.
    const schluessel = JSON.stringify([t, kuenstler, titel, ms]);
    if (gesehen.has(schluessel)) continue;
    gesehen.add(schluessel);
    out.push({ t, ms, kuenstler, titel, uebersprungen: skip, uri });
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}

const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONATE = ["Jän", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

/** Datumsteile in einer Zeitzone (Standard Europe/Vienna), ohne Bibliotheken. */
function teile(t, zone) {
  const d = new Date(t);
  const f = teile.cache[zone] || (teile.cache[zone] = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour12: false, weekday: "short", year: "numeric", month: "numeric", day: "numeric", hour: "numeric" }));
  const p = Object.fromEntries(f.formatToParts(d).filter((x) => x.type !== "literal").map((x) => [x.type, x.value]));
  const wt = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday);
  return { jahr: +p.year, monat: +p.month - 1, tag: +p.day, stunde: +p.hour % 24, wochentag: wt };
}
teile.cache = {};

/**
 * Auswertung des Verlaufs: Heatmap Stunde×Wochentag (Minuten), Monate, Top-Künstler nach Hörzeit,
 * Nachtanteil, Skip-Quote, erster und letzter Stream, längste Serie an Tagen.
 */
export function verlaufAuswerten(streams, { zone = "Europe/Vienna", minMs = 30000 } = {}) {
  const gueltig = streams.filter((s) => s.ms >= minMs);
  const heat = Array.from({ length: 7 }, () => new Array(24).fill(0));
  const monate = new Map();
  const kuenstler = new Map();
  const songs = new Map();
  const tage = new Set();
  let nachtMs = 0, gesamtMs = 0, skips = 0, mitSkipInfo = 0;
  for (const s of streams) {
    if (s.uebersprungen !== null) { mitSkipInfo++; if (s.uebersprungen) skips++; }
  }
  for (const s of gueltig) {
    const z = teile(s.t, zone);
    heat[z.wochentag][z.stunde] += s.ms / 60000;
    const mk = `${z.jahr}-${String(z.monat + 1).padStart(2, "0")}`;
    monate.set(mk, (monate.get(mk) || 0) + s.ms);
    kuenstler.set(s.kuenstler, (kuenstler.get(s.kuenstler) || 0) + s.ms);
    const sk = s.titel + " – " + s.kuenstler;
    songs.set(sk, (songs.get(sk) || 0) + 1);
    tage.add(`${z.jahr}-${z.monat}-${z.tag}`);
    gesamtMs += s.ms;
    if (z.stunde >= 23 || z.stunde < 5) nachtMs += s.ms;
  }
  // längste Serie aufeinanderfolgender Tage
  const tagListe = [...tage].map((k) => { const [j, m, t] = k.split("-").map(Number); return Date.UTC(j, m, t); }).sort((a, b) => a - b);
  let serie = 0, beste = 0, letzter = null;
  for (const t of tagListe) { serie = letzter !== null && t - letzter === 86400000 ? serie + 1 : 1; beste = Math.max(beste, serie); letzter = t; }
  const monatListe = [...monate].sort().map(([k, ms]) => { const [j, m] = k.split("-").map(Number); return { key: k, jahr: j, monat: m - 1, name: MONATE[m - 1], stunden: ms / 3600000 }; });
  let spitze = null;
  for (let w = 0; w < 7; w++) for (let h = 0; h < 24; h++) if (!spitze || heat[w][h] > spitze.minuten) spitze = { wochentag: w, name: WOCHENTAGE[w], stunde: h, minuten: heat[w][h] };
  return {
    streams: streams.length, gezaehlt: gueltig.length, stunden: gesamtMs / 3600000,
    von: gueltig.length ? gueltig[0].t : null, bis: gueltig.length ? gueltig[gueltig.length - 1].t : null,
    tage: tage.size, laengsteSerie: beste,
    heat, wochentage: WOCHENTAGE, spitze,
    monate: monatListe,
    topKuenstler: [...kuenstler].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, ms]) => ({ name, stunden: ms / 3600000 })),
    topSongs: [...songs].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, n]) => ({ name, n })),
    nachtAnteil: gesamtMs ? nachtMs / gesamtMs : 0,
    skipQuote: mitSkipInfo ? skips / mitSkipInfo : null,
  };
}

/**
 * Komplett: ZIP-Puffer → Auswertung. Wirft, wenn keine Verlaufsdateien drin sind oder keine einzige lesbar ist.
 * Kaputte Einzeldateien werden übersprungen; ihre Namen stehen in `uebersprungeneDateien`.
 */
export async function verlaufAusZip(buffer, optionen) {
  const dateien = await zipLesen(buffer, istVerlaufsdatei);
  if (!dateien.length) throw new Error("Im ZIP ist kein Streaming-Verlauf (Streaming_History_Audio_*.json).");
  const eintraege = [], uebersprungeneDateien = [];
  let lesbar = 0;
  for (const d of dateien) {
    let j;
    try { j = JSON.parse(TEXT.decode(d.bytes)); } catch { j = null; }
    if (!Array.isArray(j)) { uebersprungeneDateien.push(d.name); continue; }
    lesbar++;
    for (const e of j) eintraege.push(e);
  }
  if (!lesbar) throw new Error("Keine der Verlaufsdateien im ZIP ist lesbar (kaputtes JSON).");
  return { ...verlaufAuswerten(streamsNormalisieren(eintraege), optionen), uebersprungeneDateien };
}
