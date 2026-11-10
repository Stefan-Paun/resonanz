// Apple Music: „Play Activity“-CSV aus dem Datenexport (privacy.apple.com). Spaltennamen werden tolerant erkannt.
import { csvLesen, spalte } from "./csv.js";
import { eintrag, zeitLesen, MIN_MS } from "./format.js";

const SPALTEN = {
  t: ["eventstarttimestamp", "starttimestamp", "eventtimestamp", "eventendtimestamp", "endtimestamp", "playstarttimestamp", "timestamp", "date"],
  titel: ["songname", "trackdescription", "title", "trackname", "name"],
  kuenstler: ["artistname", "containerartistname", "artist", "albumartist", "artistdescription"],
  album: ["albumname", "containeralbumname", "album", "containername"],
  ms: ["playdurationmilliseconds", "mediadurationinmilliseconds", "durationms", "playdurationms", "duration"],
  ende: ["endreasontype", "endreason"],
};

/** Prüft die Kopfzeile: gibt die Spaltenindizes zurück oder null, wenn es keine Apple-Play-Activity ist. */
export function appleSpalten(kopf) {
  const s = Object.fromEntries(Object.entries(SPALTEN).map(([k, v]) => [k, spalte(kopf, v)]));
  return s.t >= 0 && s.titel >= 0 && s.kuenstler >= 0 ? s : null;
}

/** Wiedergaben unter 30 s und Einträge, die Apple als übersprungen meldet, fallen weg. */
export function appleZeilen(zeilen, kopfIndex = 0) {
  const sp = appleSpalten(zeilen[kopfIndex] || []);
  if (!sp) throw new Error("Spalten fehlen: erwartet werden Zeitpunkt, Titel und Künstler (Play Activity).");
  const out = [];
  let verworfen = 0;
  for (let i = kopfIndex + 1; i < zeilen.length; i++) {
    const z = zeilen[i];
    const ms = sp.ms >= 0 && z[sp.ms] !== "" && z[sp.ms] != null ? Number(String(z[sp.ms]).replace(",", ".")) : null;
    const e = eintrag({ t: zeitLesen(z[sp.t] ?? ""), kuenstler: z[sp.kuenstler], titel: z[sp.titel], album: sp.album >= 0 ? z[sp.album] : null, ms: Number.isFinite(ms) ? ms : null, quelle: "apple" });
    if (!e) { verworfen++; continue; }
    if (e.ms !== null && e.ms < MIN_MS) { verworfen++; continue; }
    e.uebersprungen = sp.ende >= 0 && z[sp.ende] ? /skip/i.test(z[sp.ende]) : null;
    out.push(e);
  }
  return { streams: out, verworfen };
}

export function appleLesen(text, optionen) {
  return appleZeilen(csvLesen(text, optionen));
}
