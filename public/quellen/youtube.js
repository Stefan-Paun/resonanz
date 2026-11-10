// YouTube Music: watch-history.json aus Google Takeout. Nur Einträge von YouTube Music zählen.
import { eintrag, zeitLesen } from "./format.js";

const VORSATZ = /^(Angesehen|Watched|Gehört|Listened to):\s+/i;

const istMusik = (x) => x.header === "YouTube Music" || (Array.isArray(x.products) && x.products.includes("YouTube Music"));

/** Ein Takeout-Eintrag sieht aus wie Watch-History (title + time, meist titleUrl/header). */
export const istYoutubeJson = (json) => Array.isArray(json) && json.length > 0 &&
  json.slice(0, 20).some((x) => x && typeof x === "object" && typeof x.title === "string" && typeof x.time === "string" && ("header" in x || "titleUrl" in x || "products" in x));

export function youtubeLesen(json) {
  if (!Array.isArray(json)) throw new Error("Erwartet wird eine Liste (watch-history.json aus Google Takeout).");
  const out = []; let verworfen = 0, andere = 0;
  for (const x of json) {
    if (!x || typeof x !== "object") { verworfen++; continue; }
    if (!istMusik(x)) { andere++; continue; }
    const kanal = Array.isArray(x.subtitles) ? x.subtitles[0]?.name : null;
    const e = eintrag({
      t: zeitLesen(x.time),
      kuenstler: typeof kanal === "string" ? kanal.replace(/\s+-\s+Topic$/i, "") : null,
      titel: typeof x.title === "string" ? x.title.replace(VORSATZ, "") : null,
      quelle: "youtube",
    });
    if (e) out.push(e); else verworfen++;
  }
  return { streams: out, verworfen, andere };
}
