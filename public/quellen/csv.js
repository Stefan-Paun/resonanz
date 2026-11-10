// Kleiner CSV-Leser: Anführungszeichen, Kommas/Zeilenumbrüche in Feldern, BOM, Trenner , ; oder Tab. Keine Bibliothek.
import { GRENZEN } from "./format.js";

/** Trenner aus der ersten Zeile (außerhalb von Anführungszeichen) wählen. */
export function trennerRaten(text) {
  const zaehl = { ",": 0, ";": 0, "\t": 0 };
  let q = false;
  for (let i = 0; i < text.length && i < 20000; i++) {
    const c = text[i];
    if (c === '"') q = !q;
    else if (!q && (c === "\n" || c === "\r")) break;
    else if (!q && c in zaehl) zaehl[c]++;
  }
  const [sep, anzahl] = Object.entries(zaehl).sort((a, b) => b[1] - a[1])[0];
  return anzahl ? sep : ",";
}

/**
 * Liest CSV-Text → Array von Zeilen (Arrays aus Strings). Leere Zeilen entfallen.
 * Wirft bei mehr als `maxZeilen` Zeilen. Felder länger als `maxFeld` werden gekürzt.
 */
export function csvLesen(text, { trenner = null, maxZeilen = GRENZEN.zeilen, maxFeld = 5000 } = {}) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const sep = trenner || trennerRaten(text);
  const zeilen = [];
  let feld = "", zeile = [], q = false, i = 0, quoted = false;
  const n = text.length;
  const feldEnde = () => { zeile.push(feld.length > maxFeld ? feld.slice(0, maxFeld) : feld); feld = ""; quoted = false; };
  const zeileEnde = () => {
    feldEnde();
    if (!(zeile.length === 1 && zeile[0] === "")) {
      if (zeilen.length >= maxZeilen) throw new Error(`Die Datei hat mehr als ${maxZeilen.toLocaleString("de-AT")} Zeilen.`);
      zeilen.push(zeile);
    }
    zeile = [];
  };
  while (i < n) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { feld += '"'; i += 2; continue; } q = false; i++; continue; }
      feld += c; i++; continue;
    }
    if (c === '"' && feld === "" && !quoted) { q = true; quoted = true; i++; }
    else if (c === sep) { feldEnde(); i++; }
    else if (c === "\r") { zeileEnde(); i += text[i + 1] === "\n" ? 2 : 1; }
    else if (c === "\n") { zeileEnde(); i++; }
    else { feld += c; i++; }
  }
  if (feld !== "" || zeile.length || quoted) zeileEnde();
  return zeilen;
}

/** Kopfzeile normalisieren: klein, nur Buchstaben und Ziffern („Play Duration Milliseconds“ → playdurationmilliseconds). */
export const spaltenName = (s) => String(s).toLowerCase().replace(/[^a-z0-9äöüß]/g, "");

/** Index der ersten Spalte, deren Name in `namen` steht (normalisiert); -1 wenn keine. */
export function spalte(kopf, namen) {
  const k = kopf.map(spaltenName);
  for (const n of namen) { const i = k.indexOf(n); if (i >= 0) return i; }
  return -1;
}
