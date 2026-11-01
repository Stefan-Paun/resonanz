// Rückblick-Kapitel: Text und Messwerte aus dem Schnappschuss, beim Scrollen steuert jedes Kapitel den Himmel.
import { WELTEN, welt } from "./welten.js";
import { aufsteiger, verblasst, dauerbrenner, laender, jahrgaenge, zuletzt, weltenZaehlung, LANDNAMEN, dauerText } from "./daten.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const liste = (arr, f = "und") => arr.length <= 1 ? arr.join("") : arr.slice(0, -1).join(", ") + ` ${f} ` + arr[arr.length - 1];
const uhr = (iso) => new Date(iso).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Vienna" });
const tag = (iso) => new Date(iso).toLocaleDateString("de-AT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Vienna" });

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
  const aufWeltName = aufWelten.length === 1 ? welt(aufWelten[0]).name : null;
  const maxJahr = Math.max(...jg.jahre.map((j) => j.anzahl), 1);
  const groesste = [...zaehlung].sort((a, b) => b.anzahl - a.anzahl)[0];
  const anteil = Math.round(groesste.anzahl / sterne.length * 100);

  const kapitel = [
    {
      id: "welten", titel: "Acht Welten, ein Himmel.",
      text: `${groesste.anzahl} von ${sterne.length} Sternen stehen in der Galaxie ${groesste.name}, also ${anteil} Prozent. Die Legende unten ist das Armaturenbrett: Antippen hebt eine Welt heraus, der Zeitraum verschiebt die Gewichte.`,
      tabelle: zaehlung.map((w) => [`<i class="punkt" style="--w:${w.farbe}"></i>${esc(w.name)}`, w.anzahl]),
      spalten: ["Welt", "Sterne"],
      steuer: { zeitraum: "1y", welt: null, fokus: null, blick: null, pan: true },
    },
    {
      id: "gerade", titel: "Gerade.",
      text: auf.length
        ? `${liste(auf.slice(0, 3).map((a) => a.name))} ${auf.length > 1 ? "waren" : "war"} im Jahresbild ${auf.every((a) => a.jahr === null) ? "nicht am Himmel" : "weit hinten"}. In den letzten vier Wochen ${auf.length > 1 ? "stehen sie" : "steht er"} auf Platz ${liste(auf.slice(0, 3).map((a) => a.jetzt))}.${aufWeltName ? ` Alle aus derselben Welt: ${aufWeltName}.` : ""}`
        : "In den letzten vier Wochen ist niemand Neues aufgestiegen. Der Himmel hält.",
      tabelle: auf.map((a) => [knopf(a), a.jetzt, a.jahr ?? "–"]),
      spalten: ["Aufsteiger", "4 W", "1 J"],
      steuer: { zeitraum: "4w", welt: aufWelten.length === 1 ? aufWelten[0] : null, fokus: auf.map((a) => a.id), blick: aufWelten.length === 1 ? aufWelten[0] : null },
    },
    {
      id: "dauerbrenner", titel: "Dauerbrenner.",
      text: db.length
        ? `${db.length} Sterne stehen in allen drei Zeiträumen unter den ersten 25. ${db[0].name} führt mit den Plätzen ${db[0].plaetze.join(", ")}. Das ist kein Oktober, das ist ein Jahr.`
        : "Niemand hält sich in allen drei Zeiträumen vorne.",
      tabelle: db.map((d) => [knopf(d), ...d.plaetze]),
      spalten: ["Künstler", "4 W", "6 M", "1 J"],
      steuer: { zeitraum: "1y", welt: null, fokus: db.map((d) => d.id), blick: weltVon(db[0]?.id) || null },
    },
    {
      id: "verblasst", titel: "Verblasst.",
      text: weg.length
        ? `${liste(weg.slice(0, 3).map((w) => w.name))} ${weg.length > 1 ? "waren" : "war"} übers Jahr auf Platz ${liste(weg.slice(0, 3).map((w) => w.jahr))}. In den letzten vier Wochen: kein einziges Mal in der Liste. Die Sterne sind noch da, nur dunkler.`
        : "Niemand aus der Jahresspitze ist in den letzten vier Wochen verschwunden.",
      tabelle: weg.map((w) => [knopf(w), w.jahr, "–"]),
      spalten: ["Künstler", "1 J", "4 W"],
      steuer: { zeitraum: "4w", welt: null, fokus: weg.map((w) => w.id), blick: weltVon(weg[0]?.id) || null, dunkelZeigen: true },
    },
    {
      id: "herkunft", titel: "Woher der Klang kommt.",
      text: `${la.gesamt} Sterne haben eine bekannte Herkunft. ${LANDNAMEN[la.liste[0].code] || la.liste[0].code} stellt ${la.liste[0].anzahl}, ${LANDNAMEN[la.liste[1]?.code] || la.liste[1]?.code} ${la.liste[1]?.anzahl}.${la.liste.find((l) => l.code === "AT") ? ` Aus Österreich: ${la.liste.find((l) => l.code === "AT").anzahl}.` : ""} Bei ${la.unbekannt} weiß MusicBrainz es nicht.`,
      tabelle: la.liste.map((l) => [esc(LANDNAMEN[l.code] || l.code), l.anzahl]),
      spalten: ["Land", "Sterne"],
      steuer: { zeitraum: "1y", welt: null, fokus: null, blick: null, pan: true },
    },
    {
      id: "jahrgaenge", titel: "Jahrgänge.",
      text: jg.gesamt
        ? `Von den ${jg.gesamt} Top-Songs des Jahres sind ${jg.jahre.filter((j) => j.jahr >= new Date().getFullYear() - 1).reduce((a, j) => a + j.anzahl, 0)} aus den letzten zwei Jahren. Der älteste: „${esc(jg.aeltester.name)}“ von ${esc(jg.aeltester.kuenstler[0].name)}, ${jg.aeltester.erschienen.slice(0, 4)}. Der neueste: „${esc(jg.neuester.name)}“, ${jg.neuester.erschienen.slice(0, 4)}.`
        : "Keine Erscheinungsdaten im Schnappschuss.",
      striche: jg.jahre.map((j) => ({ jahr: j.jahr, anzahl: j.anzahl, h: j.anzahl / maxJahr })),
      steuer: { zeitraum: "1y", welt: null, fokus: null, blick: "rock" },
    },
    {
      id: "zuletzt", titel: "Zuletzt.",
      text: zl.anzahl
        ? `Spotify gibt nur die letzten ${zl.anzahl} Songs her. Die liefen am ${tag(zl.von)} zwischen ${uhr(zl.von)} und ${uhr(zl.bis)} Uhr. Ein echter Tagesrhythmus kommt erst mit dem exportierten Streaming-Verlauf, der ist angefordert.`
        : "Keine zuletzt gehörten Songs im Schnappschuss.",
      tabelle: zl.songs.map((s) => [`${esc(s.name)} <span class="leise">${esc(s.kuenstler.map((k) => k.name).join(", "))}</span>`, dauerText(s.dauer_ms)]),
      spalten: ["Song", "Dauer"],
      steuer: { zeitraum: "4w", welt: null, fokus: null, blick: null, pan: true },
    },
    {
      id: "schluss", titel: "Der Rest steht in den Sternen.",
      text: "Alles hier ist im Browser gerechnet: Top-Listen aus der Spotify-API, Genres und Herkunft aus MusicBrainz. Nichts wird hochgeladen. Der Himmel ist ein Schnappschuss, kein Live-Bild.",
      links: [
        ["https://github.com/Stefan-Paun/resonanz", "Code auf GitHub"],
        ["https://stefanpaun.page", "stefanpaun.page"],
      ],
      steuer: { zeitraum: "1y", welt: null, fokus: null, blick: "deutschrap" },
      schluss: true,
    },
  ];
  if (verlauf) kapitel.splice(kapitel.length - 1, 0, ...verlaufKapitel(verlauf));
  if (eigener) {
    const schluss = kapitel[kapitel.length - 1];
    schluss.text = "Dieser Himmel ist deiner: gerechnet in deinem Browser aus deinem Spotify-Konto oder deiner Datei, Genres und Herkunft von MusicBrainz. Nichts wurde hochgeladen; er liegt nur in diesem Browser.";
  }
  kapitel[kapitel.length - 1].links.unshift(["#", "Dein eigener Himmel", "data-eigener"]);

  main.innerHTML = kapitel.map((k, i) => `
    <section class="kapitel" id="k-${k.id}" data-i="${i}" aria-labelledby="k-${k.id}-h">
      <div class="tafel">
        <h2 id="k-${k.id}-h">${k.titel}</h2>
        <p>${k.text}</p>
        ${k.tabelle ? tabelle(k.spalten, k.tabelle) : ""}
        ${k.striche ? striche(k.striche) : ""}
        ${k.links ? `<p class="links">${k.links.map(([h, t, attr]) => attr ? `<a href="${h}" ${attr}>${t}</a>` : `<a href="${h}" target="_blank" rel="noopener">${t}</a>`).join("")}</p>` : ""}
        ${k.heat ? heatmap(k.heat) : ""}
        ${k.monate ? monate(k.monate) : ""}
        ${k.schluss ? `<p class="klein">Metadaten und Cover gehören Spotify und den Rechteinhabern. Diese Seite ist ein privates Projekt und steht in keiner Verbindung zu Spotify.</p>` : ""}
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

function striche(jahre) {
  // Strichliste wie auf einer Karte: ein Balken pro Jahr, Höhe = Anzahl
  const von = jahre[0].jahr, bis = jahre[jahre.length - 1].jahr;
  const alle = [];
  const map = new Map(jahre.map((j) => [j.jahr, j]));
  for (let j = von; j <= bis; j++) alle.push(map.get(j) || { jahr: j, anzahl: 0, h: 0 });
  // Wertlabel nur auf lokalen Gipfeln (und dem ersten Jahr), sonst stoßen die Zahlen an den Nachbarbalken
  const gipfel = (k) => alle[k].anzahl && (alle[k].jahr === von || (alle[k].h >= .34 && (k === 0 || alle[k - 1].h <= alle[k].h) && (k === alle.length - 1 || alle[k + 1].h < alle[k].h)));
  return `<div class="jahre" role="img" aria-label="Erscheinungsjahre: ${jahre.map((j) => `${j.jahr} ${j.anzahl}`).join(", ")}">
    ${alle.map((j, k) => `<span class="jahr" style="--h:${j.h.toFixed(3)}" title="${j.jahr}: ${j.anzahl}"><b>${gipfel(k) ? j.anzahl : ""}</b><i></i><small class="${j.jahr === von || j.jahr === bis ? "" : "zehner"}">${j.jahr % 10 === 0 || j.jahr === von || j.jahr === bis ? j.jahr : ""}</small></span>`).join("")}
  </div>`;
}

// ---------------------------------------------------------------- Verlauf (aus dem Spotify-Export, nur lokal)
const prozent = (x) => Math.round(x * 100);
const datum = (t) => new Date(t).toLocaleDateString("de-AT", { day: "numeric", month: "short", year: "numeric" });

function verlaufKapitel(v) {
  const nacht = prozent(v.nachtAnteil);
  const maxMonat = v.monate.length ? Math.max(...v.monate.map((m) => m.stunden)) : 0;
  const staerkster = v.monate.length ? v.monate.reduce((a, b) => (b.stunden > a.stunden ? b : a)) : null;
  return [
    {
      id: "verlauf", titel: "Dein Verlauf.",
      text: `${v.streams.toLocaleString("de-AT")} Streams zwischen ${datum(v.von)} und ${datum(v.bis)}, davon ${v.gezaehlt.toLocaleString("de-AT")} länger als 30 Sekunden. Zusammen ${Math.round(v.stunden).toLocaleString("de-AT")} Stunden Musik an ${v.tage.toLocaleString("de-AT")} Tagen. Längste Serie ohne stillen Tag: ${v.laengsteSerie} Tage.`,
      tabelle: [["Streams", v.streams.toLocaleString("de-AT")], ["Gezählt (über 30 s)", v.gezaehlt.toLocaleString("de-AT")], ["Stunden", Math.round(v.stunden).toLocaleString("de-AT")], ["Tage mit Musik", v.tage.toLocaleString("de-AT")], ["Längste Serie", v.laengsteSerie + " Tage"]],
      spalten: ["Messwert", ""],
      steuer: { zeitraum: "1y", welt: null, fokus: null, blick: null, pan: true },
    },
    {
      id: "uhrzeiten", titel: "Uhrzeiten.",
      text: v.spitze ? `Die lauteste Stunde der Woche: ${v.spitze.name} um ${v.spitze.stunde} Uhr. ${nacht} Prozent deiner Musik läuft zwischen 23 und 5 Uhr${nacht >= 25 ? ", das ist eine Nachtfahrt" : nacht >= 12 ? ", ein ordentlicher Nachtanteil" : ", du schläfst also doch"}.` : "Zu wenig Daten für eine Heatmap.",
      heat: v,
      steuer: { zeitraum: "1y", welt: null, fokus: null, blick: "nacht" },
    },
    {
      id: "monate", titel: "Monate.",
      text: staerkster ? `Der lauteste Monat: ${staerkster.name} ${staerkster.jahr} mit ${Math.round(staerkster.stunden)} Stunden. Im Schnitt ${Math.round(v.stunden / Math.max(1, v.monate.length))} Stunden pro Monat.` : "Keine Monate im Verlauf.",
      monate: { liste: v.monate, max: maxMonat },
      steuer: { zeitraum: "1y", welt: null, fokus: null, blick: null, pan: true },
    },
    {
      id: "hoerzeit", titel: "Hörzeit.",
      text: `Nach Stunden gezählt, nicht nach Rang: ${v.topKuenstler[0] ? `${esc(v.topKuenstler[0].name)} führt mit ${Math.round(v.topKuenstler[0].stunden)} Stunden` : "niemand führt"}.${v.skipQuote !== null ? ` ${prozent(v.skipQuote)} Prozent aller Streams hast du übersprungen.` : ""} Meistgespielt: ${v.topSongs[0] ? `„${esc(v.topSongs[0].name)}“, ${v.topSongs[0].n}\u2011mal` : "–"}.`,
      tabelle: v.topKuenstler.slice(0, 8).map((k) => [esc(k.name), Math.round(k.stunden) + " h"]),
      spalten: ["Künstler", "Stunden"],
      steuer: { zeitraum: "1y", welt: null, fokus: null, blick: "deutschrap" },
    },
  ];
}

function heatmap(v) {
  const max = Math.max(1, ...v.heat.flat());
  const zeilen = v.heat.map((reihe, w) => `<div class="heat-reihe"><span class="heat-tag">${v.wochentage[w]}</span>${reihe.map((m, h) => `<i style="--a:${(m / max).toFixed(3)}" title="${v.wochentage[w]} ${h} Uhr: ${Math.round(m)} Minuten"></i>`).join("")}</div>`).join("");
  const achse = `<div class="heat-achse"><span></span>${[0, 6, 12, 18].map((h) => `<b style="--h:${h}">${h}</b>`).join("")}<b style="--h:24">24</b></div>`;
  return `<div class="heat" role="img" aria-label="Hörminuten pro Wochentag und Stunde, Spitze ${v.spitze ? v.spitze.name + " " + v.spitze.stunde + " Uhr" : "–"}">${zeilen}${achse}</div>`;
}

function monate({ liste, max }) {
  if (!liste.length) return "";
  return `<div class="jahre monate" role="img" aria-label="Stunden pro Monat">${liste.map((m) => `<span class="jahr" style="--h:${(max ? m.stunden / max : 0).toFixed(3)}" title="${m.name} ${m.jahr}: ${Math.round(m.stunden)} h"><b>${m.stunden >= max * .6 ? Math.round(m.stunden) : ""}</b><i></i><small>${m.monat === 0 || liste.length <= 14 ? (liste.length <= 14 ? m.name : m.jahr) : ""}</small></span>`).join("")}</div>`;
}
