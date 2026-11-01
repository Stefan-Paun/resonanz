// Rückblick-Kapitel: Text und Messwerte aus dem Schnappschuss, beim Scrollen steuert jedes Kapitel den Himmel.
import { welt } from "./welten.js";
import { aufsteiger, verblasst, dauerbrenner, laender, jahrgaenge, zuletzt, weltenZaehlung, dauerText } from "./daten.js";
import { tx, weltName, landName } from "./texte.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/**
 * Baut die Kapitel in `main` und gibt die Steuerbefehle pro Kapitel zurück.
 * steuerung: { zeitraum(z), welt(id|null), fokus(ids|null), blick(weltId|null) }
 */
export function kapitelBauen(main, snapshot, sterne, { verlauf = null, eigener = false } = {}) {
  const zaehlung = weltenZaehlung(sterne).filter((w) => w.anzahl);
  const auf = aufsteiger(snapshot), weg = verblasst(snapshot), db = dauerbrenner(snapshot);
  const la = laender(sterne), jg = jahrgaenge(snapshot, "1y"), zl = zuletzt(snapshot);
  const name = (id) => snapshot.kuenstler[id]?.name || "?";
  const weltVon = (id) => sterne.find((s) => s.id === id)?.welt;
  const aufWelten = [...new Set(auf.map((a) => weltVon(a.id)))].filter(Boolean);
  const T = tx().kapitel;
  const aufWeltName = aufWelten.length === 1 ? weltName(welt(aufWelten[0])) : null;
  const maxJahr = Math.max(...jg.jahre.map((j) => j.anzahl), 1);
  const groesste = [...zaehlung].sort((a, b) => b.anzahl - a.anzahl)[0] || welt("streulicht");
  const anteil = sterne.length ? Math.round(groesste.anzahl / sterne.length * 100) : 0;

  const kapitel = [
    {
      id: "welten", titel: T.welten.titel,
      text: T.welten.text({ anzahl: groesste.anzahl || 0, name: weltName(groesste) }, sterne.length, anteil),
      tabelle: zaehlung.map((w) => [`<i class="punkt" style="--w:${w.farbe}"></i>${esc(weltName(w))}`, w.anzahl]),
      spalten: T.welten.spalten,
      steuer: { zeitraum: "1y", welt: null, fokus: null, blick: null, pan: true },
    },
    {
      id: "gerade", titel: T.gerade.titel,
      text: auf.length ? T.gerade.text(auf, aufWeltName) : T.gerade.leer,
      tabelle: auf.map((a) => [knopf(a), a.jetzt, a.jahr ?? "–"]),
      spalten: T.gerade.spalten,
      steuer: { zeitraum: "4w", welt: aufWelten.length === 1 ? aufWelten[0] : null, fokus: auf.map((a) => a.id), blick: aufWelten.length === 1 ? aufWelten[0] : null },
    },
    {
      id: "dauerbrenner", titel: T.dauerbrenner.titel,
      text: db.length ? T.dauerbrenner.text(db) : T.dauerbrenner.leer,
      tabelle: db.map((d) => [knopf(d), ...d.plaetze]),
      spalten: T.dauerbrenner.spalten,
      steuer: { zeitraum: "1y", welt: null, fokus: db.map((d) => d.id), blick: weltVon(db[0]?.id) || null },
    },
    {
      id: "verblasst", titel: T.verblasst.titel,
      text: weg.length ? T.verblasst.text(weg) : T.verblasst.leer,
      tabelle: weg.map((w) => [knopf(w), w.jahr, "–"]),
      spalten: T.verblasst.spalten,
      steuer: { zeitraum: "4w", welt: null, fokus: weg.map((w) => w.id), blick: weltVon(weg[0]?.id) || null, dunkelZeigen: true },
    },
    {
      id: "herkunft", titel: T.herkunft.titel,
      text: la.liste.length ? T.herkunft.text(la) : T.herkunft.leer(sterne.length),
      tabelle: la.liste.map((l) => [esc(landName(l.code)), l.anzahl]),
      spalten: T.herkunft.spalten,
      steuer: { zeitraum: "1y", welt: null, fokus: null, blick: null, pan: true },
    },
    {
      id: "jahrgaenge", titel: T.jahrgaenge.titel,
      text: jg.gesamt ? T.jahrgaenge.text(jg, jg.jahre.filter((j) => j.jahr >= new Date().getFullYear() - 1).reduce((a, j) => a + j.anzahl, 0)) : T.jahrgaenge.leer,
      striche: jg.jahre.map((j) => ({ jahr: j.jahr, anzahl: j.anzahl, h: j.anzahl / maxJahr })),
      steuer: { zeitraum: "1y", welt: null, fokus: null, blick: "rock" },
    },
    {
      id: "zuletzt", titel: T.zuletzt.titel,
      text: zl.anzahl ? T.zuletzt.text(zl) : T.zuletzt.leer,
      tabelle: zl.songs.map((s) => [`${esc(s.name)} <span class="leise">${esc(s.kuenstler.map((k) => k.name).join(", "))}</span>`, dauerText(s.dauer_ms)]),
      spalten: T.zuletzt.spalten,
      steuer: { zeitraum: "4w", welt: null, fokus: null, blick: null, pan: true },
    },
    {
      id: "schluss", titel: T.schluss.titel,
      text: T.schluss.text,
      links: [
        ["https://github.com/Stefan-Paun/resonanz", T.schluss.code],
        ["https://stefanpaun.page", "stefanpaun.page"],
      ],
      steuer: { zeitraum: "1y", welt: null, fokus: null, blick: "deutschrap" },
      schluss: true,
    },
  ];
  if (verlauf) kapitel.splice(kapitel.length - 1, 0, ...verlaufKapitel(verlauf, T));
  if (eigener) kapitel[kapitel.length - 1].text = T.schluss.textEigen;
  kapitel[kapitel.length - 1].links.unshift(["#", T.schluss.eigen, "data-eigener"]);

  main.innerHTML = kapitel.map((k, i) => `
    <section class="kapitel" id="k-${k.id}" data-i="${i}" aria-labelledby="k-${k.id}-h">
      <div class="tafel">
        <h2 id="k-${k.id}-h">${k.titel}</h2>
        <p>${esc(k.text)}</p>
        ${k.tabelle ? tabelle(k.spalten, k.tabelle) : ""}
        ${k.striche ? striche(k.striche, T) : ""}
        ${k.links ? `<p class="links">${k.links.map(([h, t, attr]) => attr ? `<a href="${h}" ${attr}>${t}</a>` : `<a href="${h}" target="_blank" rel="noopener">${t}</a>`).join("")}</p>` : ""}
        ${k.heat ? heatmap(k.heat, T) : ""}
        ${k.monate ? monate(k.monate, T) : ""}
        ${k.schluss ? `<p class="klein">${esc(T.schluss.klein)}</p>` : ""}
      </div>
    </section>`).join("");

  return kapitel;
}

const knopf = (k) => `<button type="button" class="stern-link" data-stern="${esc(k.id)}">${esc(k.name)}</button>`;

function tabelle(spalten, zeilen) {
  if (!zeilen.length) return "";
  return `<table class="mess"><thead><tr>${spalten.map((s, i) => `<th${i ? ' class="zahl"' : ""}>${esc(s)}</th>`).join("")}</tr></thead><tbody>${
    zeilen.map((z) => `<tr>${z.map((c, i) => `<td${i ? ' class="zahl"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function striche(jahre, T) {
  // Strichliste wie auf einer Karte: ein Balken pro Jahr, Höhe = Anzahl
  if (!jahre.length) return "";
  const von = jahre[0].jahr, bis = jahre[jahre.length - 1].jahr;
  const alle = [];
  const map = new Map(jahre.map((j) => [j.jahr, j]));
  for (let j = von; j <= bis; j++) alle.push(map.get(j) || { jahr: j, anzahl: 0, h: 0 });
  // Wertlabel nur auf lokalen Gipfeln (und dem ersten Jahr), sonst stoßen die Zahlen an den Nachbarbalken
  const gipfel = (k) => alle[k].anzahl && (alle[k].jahr === von || (alle[k].h >= .34 && (k === 0 || alle[k - 1].h <= alle[k].h) && (k === alle.length - 1 || alle[k + 1].h < alle[k].h)));
  return `<div class="jahre" role="img" aria-label="${T.jahrgaenge.aria}: ${jahre.map((j) => `${j.jahr} ${j.anzahl}`).join(", ")}">
    ${alle.map((j, k) => `<span class="jahr" style="--h:${j.h.toFixed(3)}" title="${j.jahr}: ${j.anzahl}"><b>${gipfel(k) ? j.anzahl : ""}</b><i></i><small class="${j.jahr === von || j.jahr === bis ? "" : "zehner"}">${j.jahr % 10 === 0 || j.jahr === von || j.jahr === bis ? j.jahr : ""}</small></span>`).join("")}
  </div>`;
}

// ---------------------------------------------------------------- Verlauf (aus dem Spotify-Export, nur lokal)
const prozent = (x) => Math.round(x * 100);

function verlaufKapitel(v, T) {
  const nacht = prozent(v.nachtAnteil);
  const maxMonat = v.monate.length ? Math.max(...v.monate.map((m) => m.stunden)) : 0;
  const staerkster = v.monate.length ? v.monate.reduce((a, b) => (b.stunden > a.stunden ? b : a)) : null;
  const vT = { ...v, spitze: v.spitze ? { ...v.spitze, name: T.wochentage[v.spitze.wochentag] } : null };
  return [
    {
      id: "verlauf", titel: T.verlauf.titel,
      text: T.verlauf.text(v),
      tabelle: T.verlauf.zeilen(v),
      spalten: T.verlauf.spalten,
      steuer: { zeitraum: "1y", welt: null, fokus: null, blick: null, pan: true },
    },
    {
      id: "uhrzeiten", titel: T.uhrzeiten.titel,
      text: v.spitze ? T.uhrzeiten.text(vT, nacht) : T.uhrzeiten.leer,
      heat: vT,
      steuer: { zeitraum: "1y", welt: null, fokus: null, blick: "nacht" },
    },
    {
      id: "monate", titel: T.monate.titel,
      text: staerkster ? T.monate.text({ ...staerkster, name: T.monatsnamen[staerkster.monat] }, Math.round(v.stunden / Math.max(1, v.monate.length))) : T.monate.leer,
      monate: { liste: v.monate, max: maxMonat },
      steuer: { zeitraum: "1y", welt: null, fokus: null, blick: null, pan: true },
    },
    {
      id: "hoerzeit", titel: T.hoerzeit.titel,
      text: T.hoerzeit.text(v, v.skipQuote !== null ? prozent(v.skipQuote) : null),
      tabelle: v.topKuenstler.slice(0, 8).map((k) => [esc(k.name), Math.round(k.stunden) + " h"]),
      spalten: T.hoerzeit.spalten,
      steuer: { zeitraum: "1y", welt: null, fokus: null, blick: "deutschrap" },
    },
  ];
}

function heatmap(v, T) {
  const max = Math.max(1, ...v.heat.flat());
  const zeilen = v.heat.map((reihe, w) => `<div class="heat-reihe"><span class="heat-tag">${T.wochentage[w]}</span>${reihe.map((m, h) => `<i style="--a:${(m / max).toFixed(3)}" title="${T.wochentage[w]} ${h} ${T.uhrzeiten.uhr}: ${Math.round(m)} ${T.uhrzeiten.minuten}"></i>`).join("")}</div>`).join("");
  const achse = `<div class="heat-achse"><span></span>${[0, 6, 12, 18].map((h) => `<b style="--h:${h}">${h}</b>`).join("")}<b style="--h:24">24</b></div>`;
  return `<div class="heat" role="img" aria-label="${esc(T.uhrzeiten.aria(v.spitze ? v.spitze.name + " " + v.spitze.stunde + " " + T.uhrzeiten.uhr : "–"))}">${zeilen}${achse}</div>`;
}

function monate({ liste, max }, T) {
  if (!liste.length) return "";
  return `<div class="jahre monate" role="img" aria-label="${T.monate.aria}">${liste.map((m) => `<span class="jahr" style="--h:${(max ? m.stunden / max : 0).toFixed(3)}" title="${T.monatsnamen[m.monat]} ${m.jahr}: ${Math.round(m.stunden)} h"><b>${m.stunden >= max * .6 ? Math.round(m.stunden) : ""}</b><i></i><small>${m.monat === 0 || liste.length <= 14 ? (liste.length <= 14 ? T.monatsnamen[m.monat] : m.jahr) : ""}</small></span>`).join("")}</div>`;
}
