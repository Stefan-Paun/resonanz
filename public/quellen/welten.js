// Welt-Zuordnung für Streams ohne Genre-Angabe: nur über Künstler, die der Himmel schon kennt.
// Alles andere landet in „unbekannt“; diese Gruppe hat keinen Stern und stört den Himmel nicht.
import { weltenZuordnen } from "../welten.js";

export const UNBEKANNT = "unbekannt";
const norm = (s) => String(s).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Künstlername (normalisiert) → Welt-ID, aus Schnappschuss.kuenstler (inkl. Erben-Regel der Welten). */
export function weltIndex(snapshot) {
  const songs = Object.values(snapshot?.zeitraeume || {}).flatMap((z) => z.songs || []);
  const welten = weltenZuordnen(snapshot?.kuenstler || {}, songs);
  const idx = new Map();
  for (const [id, k] of Object.entries(snapshot?.kuenstler || {})) {
    const w = welten.get(id);
    if (w && w !== "streulicht") idx.set(norm(k.name), w);
  }
  return idx;
}

/** Hörzeit je Welt in Stunden (ohne Dauer: geschätzt). Unbekannte Künstler → „unbekannt“, sortiert absteigend. */
export function weltenVerteilung(streams, snapshot, schaetzMs = 210000) {
  const idx = weltIndex(snapshot), summe = new Map();
  for (const s of streams) {
    const w = idx.get(norm(s.kuenstler)) || UNBEKANNT;
    summe.set(w, (summe.get(w) || 0) + (s.ms ?? schaetzMs));
  }
  return [...summe].map(([welt, ms]) => ({ welt, stunden: ms / 3600000 })).sort((a, b) => b.stunden - a.stunden);
}
