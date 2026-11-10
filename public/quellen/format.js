// Gemeinsames Zwischenformat aller Verlaufsquellen. Rein, ohne DOM/Netz/Uhr.
// Eintrag: { t (ms seit 1970, UTC), kuenstler, titel, album|null, ms|null, uebersprungen|null, quelle }

export const GRENZEN = { dateiBytes: 150 * 1024 * 1024, zeilen: 3_000_000, feldZeichen: 500 };
export const MIN_MS = 30000;          // kürzere Wiedergaben gelten als übersprungen
export const GESCHAETZT_MS = 210000;  // Dauer für Quellen ohne Hördauer

export const QUELLEN = ["spotify", "apple", "lastfm", "youtube"];

const kuerzen = (s) => String(s).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, GRENZEN.feldZeichen);

/** Baut einen Eintrag; gibt null zurück, wenn Künstler, Titel oder Zeit unbrauchbar sind. */
export function eintrag({ t, kuenstler, titel, album = null, ms = null, uebersprungen = null, quelle }) {
  if (typeof t !== "number" || !Number.isFinite(t) || t < 0 || t > 4102444800000) return null;
  if (typeof kuenstler !== "string" && typeof kuenstler !== "number") return null;
  if (typeof titel !== "string" && typeof titel !== "number") return null;
  const k = kuerzen(kuenstler), ti = kuerzen(titel);
  if (!k || !ti) return null;
  const a = album == null || album === "" ? null : kuerzen(album) || null;
  const m = typeof ms === "number" && Number.isFinite(ms) && ms >= 0 ? Math.round(ms) : null;
  return { t, kuenstler: k, titel: ti, album: a, ms: m, uebersprungen, quelle };
}

/** Zeitangabe → ms UTC. ISO (ohne Zone = UTC), Unix-Sekunden/-Millisekunden, „1 Mar 2025, 20:00“. NaN bei Unsinn. */
const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
export function zeitLesen(wert) {
  if (typeof wert === "number") return wert > 1e11 ? wert : wert * 1000;
  if (typeof wert !== "string") return NaN;
  const s = wert.trim();
  if (/^\d{9,13}$/.test(s)) return zeitLesen(Number(s));
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?\s*(Z|[+-]\d{2}:?\d{2}|UTC)?$/i);
  if (m) {
    let t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0), Math.round(+("0." + (m[7] || "0")) * 1000));
    const z = m[8];
    if (z && /^[+-]/.test(z)) { const [h, mi] = z.replace(":", "").match(/^([+-]\d{2})(\d{2})$/).slice(1).map(Number); t -= (h * 60 + Math.sign(h || 1) * mi) * 60000; }
    return t;
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})\.? ([A-Za-z]{3})[a-z]*\.? (\d{4}),? (\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m && m[2].toLowerCase() in MON) return Date.UTC(+m[3], MON[m[2].toLowerCase()], +m[1], +m[4], +m[5], +(m[6] || 0));
  return NaN;
}

/** Zwischenformat → Eingabe für verlaufAuswerten: fehlende Dauer wird geschätzt. */
export function fuerAuswertung(streams) {
  return streams.map((s) => (s.ms === null ? { ...s, ms: GESCHAETZT_MS, geschaetzt: true } : s));
}
