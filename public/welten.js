// Hörwelten: ordnet MusicBrainz-Tags einer von acht Welten zu.
// Läuft im Browser (ES-Modul) und in den Node-Tests. Keine Abhängigkeiten.

export const WELTEN = [
  { id: "deutschrap", name: "Deutschrap",     en: "German rap",   farbe: "#ff4fa3", ton: [330, 100, 65] },
  { id: "rap",        name: "Rap & Hip-Hop",  en: "Rap & hip-hop", farbe: "#ff8a5b", ton: [18, 100, 68] },
  { id: "nacht",      name: "Nacht & R&B",    en: "Night & R&B",  farbe: "#9b7bff", ton: [258, 100, 74] },
  { id: "elektro",    name: "Phonk & Tekkno", en: "Phonk & techno", farbe: "#38e8ff", ton: [187, 100, 61] },
  { id: "latino",     name: "Latino",         en: "Latin",        farbe: "#ffc24b", ton: [40, 100, 65] },
  { id: "rock",       name: "Rock & Klassiker", en: "Rock & classics", farbe: "#ff6b6b", ton: [0, 100, 71] },
  { id: "pop",        name: "Pop",            en: "Pop",          farbe: "#7fe0a8", ton: [145, 60, 69] },
  { id: "fokus",      name: "Fokus & Lo-fi",  en: "Focus & lo-fi", farbe: "#b9d8ff", ton: [213, 100, 86] },
  { id: "streulicht", name: "Streulicht",     en: "Stray light",  farbe: "#8e8aa3", ton: [250, 10, 59] },
];

// Reihenfolge = Vorrang. Der erste Treffer gewinnt, deshalb stehen die spezifischen Welten oben.
const REGELN = [
  ["fokus",      /^(lo-?fi|ambient|chill(hop)?|sleep|study|classical|orchestral|piano|instrumental|new age|meditation)$/],
  ["elektro",    /^(phonk|drift phonk|techno|hard techno|tekkno|schranz|hardstyle|hardcore techno|rawstyle|trance|hard trance|psytrance|gabber|electro house|big room|edm|hard dance|eurodance|drum and bass|dubstep|bass house)$/],
  ["latino",     /^(reggaeton|latin|latin pop|latin trap|trap latino|dembow|bachata|salsa|cumbia|kuduro|funk carioca|brazilian|urbano latino|latin hip hop)$/],
  ["deutschrap", null], // Sonderfall: german + (hip hop|rap|trap|cloud rap), siehe unten
  ["nacht",      /^(r&b|contemporary r&b|alternative r&b|neo soul|soul|alternative pop|dark pop|synth-pop|synthpop|indie pop|dream pop|bedroom pop|indie rock|indietronica|alternative|alternative rock|chillwave|downtempo|trip hop|art pop|psychedelic pop|psychedelic rock|neo-psychedelia)$/],
  ["rap",        /^(hip hop|hip-hop|rap|trap|pop rap|cloud rap|drill|uk drill|grime|gangsta rap|west coast hip hop|east coast hip hop|southern hip hop|hardcore hip hop|alternative hip hop|g-funk|conscious hip hop|emo rap|melodic rap|producer)$/],
  ["rock",       /^(rock|hard rock|classic rock|heavy metal|metal|nu metal|metalcore|punk|punk rock|pop punk|blues rock|glam rock|grunge|post-grunge|arena rock|rock and roll|folk rock|disco|funk|motown|schlager|volksmusik|austropop|ndw|neue deutsche welle|german rock)$/],
  ["pop",        /^(pop|dance-pop|dance pop|electropop|europop|pop rock|k-pop|j-pop|sped up|nightcore|singer-songwriter|folk|folk pop|country|teen pop|dance|house|deep house|tropical house|slap house|afrobeats|afropop|russian|russian pop)$/],
];

const DEUTSCH = /^(german|germany|deutsch|austrian|austria|swiss|schweiz|deutschrap|deutscher hip hop|german hip hop)$/;
const RAPPIG = /^(hip hop|hip-hop|rap|trap|cloud rap|pop rap|drill|gangsta rap|hardcore hip hop|alternative hip hop|emo rap|melodic rap|producer)$/;

/** Welt-ID für eine Tag-Liste (MusicBrainz-Schreibweise, kleingeschrieben). Ohne Tags: "streulicht". */
export function weltFuer(tags) {
  const t = (tags || []).map((x) => String(x).toLowerCase().trim()).filter(Boolean);
  if (!t.length) return "streulicht";
  if (t.some((x) => x === "deutschrap" || x === "deutscher hip hop" || x === "german hip hop")) return "deutschrap";
  if (t.some((x) => DEUTSCH.test(x)) && t.some((x) => RAPPIG.test(x))) return "deutschrap";
  // Zuerst zählen, welche Welt die meisten Treffer hat; bei Gleichstand gewinnt der Vorrang (Reihenfolge in REGELN).
  const punkte = new Map();
  for (const tag of t) {
    for (const [id, re] of REGELN) {
      if (re && re.test(tag)) { punkte.set(id, (punkte.get(id) || 0) + 1); break; }
    }
  }
  if (!punkte.size) return "streulicht";
  let beste = null, max = 0;
  for (const [id] of REGELN) {
    const p = punkte.get(id) || 0;
    if (p > max) { beste = id; max = p; }
  }
  // Deutsch + Pop ohne Rap bleibt Pop; "german" allein sagt nichts über die Welt.
  return beste || "streulicht";
}

export function welt(id) {
  return WELTEN.find((w) => w.id === id) || WELTEN[WELTEN.length - 1];
}

/**
 * Künstler ohne Tags erben die Welt der Künstler, mit denen sie auf denselben Songs stehen
 * (Feature-Gäste, Produzenten). Gibt eine Map id → weltId zurück.
 */
export function weltenZuordnen(kuenstler, songs) {
  const zu = new Map();
  for (const [id, k] of Object.entries(kuenstler)) zu.set(id, weltFuer(k.tags));
  const offen = [...zu].filter(([, w]) => w === "streulicht").map(([id]) => id);
  if (!offen.length) return zu;
  const nachbarn = new Map();
  for (const s of songs) {
    const ids = s.kuenstler.map((k) => k.id);
    for (const a of ids) for (const b of ids) if (a !== b) {
      if (!nachbarn.has(a)) nachbarn.set(a, []);
      nachbarn.get(a).push(b);
    }
  }
  for (const id of offen) {
    const stimmen = new Map();
    for (const n of nachbarn.get(id) || []) {
      const w = zu.get(n);
      if (w && w !== "streulicht") stimmen.set(w, (stimmen.get(w) || 0) + 1);
    }
    let beste = null, max = 0;
    for (const [w, n] of stimmen) if (n > max) { beste = w; max = n; }
    if (beste) zu.set(id, beste);
  }
  return zu;
}
