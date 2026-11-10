// Quelle am Inhalt erkennen und in Portionen einlesen. Rein: kein DOM, kein Netz; `pause` darf von außen kommen.
import { csvLesen } from "./csv.js";
import { appleSpalten, appleZeilen } from "./apple.js";
import { lastfmSpalten, lastfmCsvZeilen, istLastfmJson, lastfmJsonLesen, lastfmTracks } from "./lastfm.js";
import { istYoutubeJson, youtubeLesen } from "./youtube.js";
import { streamsNormalisieren } from "../verlauf.js";
import { GRENZEN } from "./format.js";

export const ERWARTET = "Erwartet wird eine Apple-Music-„Play Activity“-CSV, eine Last.fm-CSV (Künstler, Album, Titel, Datum) oder -JSON, die watch-history.json aus Google Takeout oder ein Spotify-Verlauf.";

const bom = (t) => (t.charCodeAt(0) === 0xfeff ? t.slice(1) : t);

/** Gibt { quelle, format, daten } zurück oder wirft mit verständlicher Meldung. `daten` sind geparste Zeilen bzw. JSON. */
export function erkennen(text) {
  const t = bom(text).trimStart();
  if (!t) throw new Error("Die Datei ist leer. " + ERWARTET);
  if (t[0] === "[" || t[0] === "{") {
    let json;
    try { json = JSON.parse(t); } catch { throw new Error("Die JSON-Datei ist beschädigt oder abgeschnitten. " + ERWARTET); }
    if (istYoutubeJson(json)) return { quelle: "youtube", format: "json", daten: json };
    if (istLastfmJson(json)) return { quelle: "lastfm", format: "json", daten: json };
    const liste = Array.isArray(json) ? json : [];
    if (liste.some((x) => x && (typeof x.ts === "string" || typeof x.endTime === "string"))) return { quelle: "spotify", format: "json", daten: liste };
    throw new Error("Dieses JSON kenne ich nicht. " + ERWARTET);
  }
  const zeilen = csvLesen(t);
  if (zeilen.length < 1) throw new Error("Die Datei ist leer. " + ERWARTET);
  if (appleSpalten(zeilen[0])) return { quelle: "apple", format: "csv", daten: zeilen };
  if (lastfmSpalten(zeilen)) return { quelle: "lastfm", format: "csv", daten: zeilen };
  throw new Error("Die Spalten passen zu keiner bekannten Quelle. " + ERWARTET);
}

const standardPause = () => new Promise((r) => setTimeout(r, 0));

/**
 * Text → { quelle, streams (Zwischenformat, sortiert), verworfen }. Das Umsetzen läuft in Portionen,
 * `fortschritt(0..1)` wird nach jeder Portion gerufen, `pause()` gibt der Seite Luft.
 */
export async function quelleLesen(text, { fortschritt = () => {}, pause = standardPause, portion = 5000 } = {}) {
  if (typeof text !== "string") throw new Error("Die Datei ist kein Text.");
  if (text.length > GRENZEN.dateiBytes) throw new Error("Die Datei ist größer als 150 MB.");
  const e = erkennen(text);
  fortschritt(0);
  let streams = [], verworfen = 0;
  if (e.quelle === "spotify") { streams = streamsNormalisieren(e.daten); verworfen = e.daten.length - streams.length; }
  else {
    // Die Teilleser sind reine Schleifen über Zeilenlisten: in Scheiben schneiden und zusammensetzen.
    const csv = e.format === "csv";
    const lfSp = csv && e.quelle === "lastfm" ? lastfmSpalten(e.daten) : null;
    const mitKopf = csv && (e.quelle === "apple" || lfSp.kopfzeile);
    const kopf = mitKopf ? e.daten.slice(0, 1) : [];
    const koerper = csv ? e.daten.slice(mitKopf ? 1 : 0) : e.quelle === "lastfm" ? lastfmTracks(e.daten) : e.daten;
    for (let i = 0; i < koerper.length || i === 0; i += portion) {
      const scheibe = koerper.slice(i, i + portion);
      const r = e.quelle === "apple" ? appleZeilen([...kopf, ...scheibe])
        : e.quelle === "lastfm" && e.format === "csv" ? lastfmCsvZeilen([...kopf, ...scheibe], lfSp)
        : e.quelle === "lastfm" ? lastfmJsonLesen(scheibe)
        : youtubeLesen(scheibe);
      for (const s of r.streams) streams.push(s);
      verworfen += r.verworfen;
      fortschritt(Math.min(1, (i + portion) / Math.max(1, koerper.length)));
      await pause();
    }
    streams.sort((a, b) => a.t - b.t);
  }
  if (!streams.length) throw new Error(`Aus der Datei ließ sich kein einziger Titel lesen (${e.quelle}). ` + ERWARTET);
  fortschritt(1);
  return { quelle: e.quelle, streams, verworfen };
}

