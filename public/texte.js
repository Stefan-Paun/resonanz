// Sprache: Deutsch und Englisch. Erkennung über ?lang=, gemerkte Wahl, sonst Browsersprache.
// Alle sichtbaren Texte der Oberfläche liegen hier; die Kapitel bekommen Funktionen, die aus den Daten Sätze bauen.

const KEY = "resonanz.sprache";
let sprache = ermitteln();

function ermitteln() {
  try {
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "de" || q === "en") { try { localStorage.setItem(KEY, q); } catch { /* egal */ } return q; }
    const m = localStorage.getItem(KEY);
    if (m === "de" || m === "en") return m;
    return (navigator.language || "de").toLowerCase().startsWith("de") ? "de" : "en";
  } catch { return "de"; }
}

export function sprache_() { return sprache; }
export function spracheSetzen(code) { sprache = code === "en" ? "en" : "de"; }
export const locale = () => (sprache === "de" ? "de-AT" : "en-GB");
export const zahl = (n) => Number(n).toLocaleString(locale());

/** Ländername in der aktuellen Sprache (Intl, sonst Code). */
const landFallback = { DE: "Deutschland", US: "USA", AT: "Österreich", GB: "Großbritannien", CA: "Kanada", AU: "Australien", NO: "Norwegen", FR: "Frankreich", PR: "Puerto Rico", IT: "Italien", ES: "Spanien", JP: "Japan", SE: "Schweden", NL: "Niederlande", CH: "Schweiz", TR: "Türkei", BR: "Brasilien", RU: "Russland", KR: "Südkorea", CZ: "Tschechien", IE: "Irland", DK: "Dänemark", BE: "Belgien", PL: "Polen", MX: "Mexiko", CO: "Kolumbien", AZ: "Aserbaidschan", NG: "Nigeria", JM: "Jamaika" };
export function landName(code) {
  if (!code) return "";
  try {
    const n = new Intl.DisplayNames([locale()], { type: "region" }).of(code);
    if (n && n !== code) return n === "Vereinigte Staaten" ? "USA" : n;
  } catch { /* alte Browser */ }
  return sprache === "de" ? (landFallback[code] || code) : code;
}

const liste = (arr, und) => arr.length <= 1 ? arr.join("") : arr.slice(0, -1).join(", ") + ` ${und} ` + arr[arr.length - 1];
const uhr = (iso) => new Date(iso).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Vienna" });
const tag = (iso) => new Date(iso).toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Vienna" });
const datum = (t) => new Date(t).toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" });

const DE = {
  ui: {
    titel: "Resonanz – Himmelsatlas meiner Musik",
    beschreibung: "Meine Hörgewohnheiten als Sternenhimmel: jeder Künstler ein Stern, jede Hörwelt eine Galaxie. Daten aus Spotify und MusicBrainz, gerechnet im Browser.",
    unter: "Himmelsatlas meiner Musik", stand: "Stand", quelle: "Quelle", blick: "Blick", laden: "Lade den Himmel …",
    eigenKnopf: "Dein eigener Himmel", zeitraum: "Zeitraum", z4w: "4 W", z6m: "6 M", z1y: "1 J",
    sterne: "Sterne", welten: "Welten", sternbilder: "Sternbilder", sternbilderKurz: "Sternbilder", hoerwelten: "Hörwelten", brett: "Armaturenbrett",
    ziehen: "Ziehen dreht den Blick", tasten: "Pfeiltasten drehen, Tab springt zu den Welten", weiter: "Scrollen für den Rückblick",
    kapitelNav: "Kapitel", canvas: "Sternenhimmel: ein Stern pro Künstler, farbig nach Hörwelt. Ziehen dreht den Blick.",
    noscript: "Resonanz braucht JavaScript: der Himmel wird im Browser aus einer JSON-Datei gerechnet.",
    stern: "Stern", sterneKlein: "Sterne", az: "Az", hoehe: "Hö", richtungen: ["N", "O", "S", "W"],
    quelleStandard: "Spotify · MusicBrainz", quelleKonto: "eigenes Konto", quelleDatei: "Datei", plusVerlauf: " + Verlauf",
    markeEigen: " · dein Himmel", markeVerlauf: " · dein Verlauf", andereSprache: "EN", andereSpracheTitel: "Switch to English",
    ladefehler: (m) => `Der Schnappschuss ließ sich nicht laden (${m}). Seite neu laden hilft meistens.`,
  },
  kapitel: {
    welten: { titel: "Acht Welten, ein Himmel.", spalten: ["Welt", "Sterne"],
      text: (g, n, anteil) => `${g.anzahl} von ${n} Sternen stehen in der Galaxie ${g.name}, also ${anteil} Prozent. Die Legende unten ist das Armaturenbrett: Antippen hebt eine Welt heraus, der Zeitraum verschiebt die Gewichte.` },
    gerade: { titel: "Gerade.", spalten: ["Aufsteiger", "4 W", "1 J"], leer: "In den letzten vier Wochen ist niemand Neues aufgestiegen. Der Himmel hält.",
      text: (auf, weltName) => `${liste(auf.slice(0, 3).map((a) => a.name), "und")} ${auf.length > 1 ? "waren" : "war"} im Jahresbild ${auf.every((a) => a.jahr === null) ? "nicht am Himmel" : "weit hinten"}. In den letzten vier Wochen ${auf.length > 1 ? "stehen sie" : "steht er"} auf Platz ${liste(auf.slice(0, 3).map((a) => a.jetzt), "und")}.${weltName ? ` Alle aus derselben Welt: ${weltName}.` : ""}` },
    dauerbrenner: { titel: "Dauerbrenner.", spalten: ["Künstler", "4 W", "6 M", "1 J"], leer: "Niemand hält sich in allen drei Zeiträumen vorne.",
      text: (db) => `${db.length} Sterne stehen in allen drei Zeiträumen unter den ersten 25. ${db[0].name} führt mit den Plätzen ${db[0].plaetze.join(", ")}. Das ist kein Oktober, das ist ein Jahr.` },
    verblasst: { titel: "Verblasst.", spalten: ["Künstler", "1 J", "4 W"], leer: "Niemand aus der Jahresspitze ist in den letzten vier Wochen verschwunden.",
      text: (weg) => `${liste(weg.slice(0, 3).map((w) => w.name), "und")} ${weg.length > 1 ? "waren" : "war"} übers Jahr auf Platz ${liste(weg.slice(0, 3).map((w) => w.jahr), "und")}. In den letzten vier Wochen: kein einziges Mal in der Liste. Die Sterne sind noch da, nur dunkler.` },
    herkunft: { titel: "Woher der Klang kommt.", spalten: ["Land", "Sterne"],
      text: (la) => `${la.gesamt} Sterne haben eine bekannte Herkunft. ${landName(la.liste[0].code)} stellt ${la.liste[0].anzahl}${la.liste[1] ? `, ${landName(la.liste[1].code)} ${la.liste[1].anzahl}` : ""}.${la.liste.find((l) => l.code === "AT") ? ` Aus Österreich: ${la.liste.find((l) => l.code === "AT").anzahl}.` : ""} Bei ${la.unbekannt} weiß MusicBrainz es nicht.`,
      leer: (n) => `Zu keinem der ${n} Sterne ist eine Herkunft bekannt. Das passiert, wenn die Genres übersprungen wurden oder MusicBrainz nicht erreichbar war.` },
    jahrgaenge: { titel: "Jahrgänge.", leer: "Keine Erscheinungsdaten im Schnappschuss.",
      text: (jg, neu) => `Von den ${jg.gesamt} Top-Songs des Jahres sind ${neu} aus den letzten zwei Jahren. Der älteste: „${jg.aeltester.name}“ von ${jg.aeltester.kuenstler[0]?.name || "?"}, ${jg.aeltester.erschienen.slice(0, 4)}. Der neueste: „${jg.neuester.name}“, ${jg.neuester.erschienen.slice(0, 4)}.`,
      aria: "Erscheinungsjahre" },
    zuletzt: { titel: "Zuletzt.", spalten: ["Song", "Dauer"], leer: "Keine zuletzt gehörten Songs im Schnappschuss.",
      text: (zl) => `Spotify gibt nur die letzten ${zl.anzahl} Songs her. Die liefen am ${tag(zl.von)} zwischen ${uhr(zl.von)} und ${uhr(zl.bis)} Uhr. Ein echter Tagesrhythmus kommt erst mit dem exportierten Streaming-Verlauf.` },
    schluss: { titel: "Der Rest steht in den Sternen.",
      text: "Alles hier ist im Browser gerechnet: Top-Listen aus der Spotify-API, Genres und Herkunft aus MusicBrainz. Nichts wird hochgeladen. Der Himmel ist ein Schnappschuss, kein Live-Bild.",
      textEigen: "Dieser Himmel ist deiner: gerechnet in deinem Browser aus deinem Spotify-Konto oder deiner Datei, Genres und Herkunft von MusicBrainz. Nichts wurde hochgeladen; er liegt nur in diesem Browser.",
      code: "Code auf GitHub", eigen: "Dein eigener Himmel",
      klein: "Metadaten und Cover gehören Spotify und den Rechteinhabern. Diese Seite ist ein privates Projekt und steht in keiner Verbindung zu Spotify." },
    verlauf: { titel: "Dein Verlauf.", spalten: ["Messwert", ""],
      text: (v) => `${zahl(v.streams)} Streams zwischen ${datum(v.von)} und ${datum(v.bis)}, davon ${zahl(v.gezaehlt)} länger als 30 Sekunden. Zusammen ${zahl(Math.round(v.stunden))} Stunden Musik an ${zahl(v.tage)} Tagen. Längste Serie ohne stillen Tag: ${v.laengsteSerie} Tage.`,
      zeilen: (v) => [["Streams", zahl(v.streams)], ["Gezählt (über 30 s)", zahl(v.gezaehlt)], ["Stunden", zahl(Math.round(v.stunden))], ["Tage mit Musik", zahl(v.tage)], ["Längste Serie", v.laengsteSerie + " Tage"]] },
    uhrzeiten: { titel: "Uhrzeiten.", leer: "Zu wenig Daten für eine Heatmap.", aria: (s) => `Hörminuten pro Wochentag und Stunde, Spitze ${s}`, minuten: "Minuten", uhr: "Uhr",
      text: (v, nacht) => `Die lauteste Stunde der Woche: ${v.spitze.name} um ${v.spitze.stunde} Uhr. ${nacht} Prozent deiner Musik läuft zwischen 23 und 5 Uhr${nacht >= 25 ? ", das ist eine Nachtfahrt" : nacht >= 12 ? ", ein ordentlicher Nachtanteil" : ", du schläfst also doch"}.` },
    monate: { titel: "Monate.", leer: "Keine Monate im Verlauf.", aria: "Stunden pro Monat",
      text: (st, schnitt) => `Der lauteste Monat: ${st.name} ${st.jahr} mit ${Math.round(st.stunden)} Stunden. Im Schnitt ${schnitt} Stunden pro Monat.` },
    hoerzeit: { titel: "Hörzeit.", spalten: ["Künstler", "Stunden"],
      text: (v, skip) => `Nach Stunden gezählt, nicht nach Rang: ${v.topKuenstler[0] ? `${v.topKuenstler[0].name} führt mit ${Math.round(v.topKuenstler[0].stunden)} Stunden` : "niemand führt"}.${skip !== null ? ` ${skip} Prozent aller Streams hast du übersprungen.` : ""} Meistgespielt: ${v.topSongs[0] ? `„${v.topSongs[0].name}“, ${v.topSongs[0].n}‑mal` : "–"}.` },
    wochentage: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
    monatsnamen: ["Jän", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
  },
  karte: {
    schliessen: "Karte schließen", keineSongs: "Keine Top-Songs im Schnappschuss, nur als Künstler gehört.", aufSpotify: "Auf Spotify öffnen",
    vorschauHinweis: "Vorschau: 30 s von Deezer, erst beim Antippen geladen.", vorschau: (n) => `30 Sekunden Vorschau von ${n} abspielen (lädt sie von Deezer)`,
    anhalten: "Vorschau anhalten", keineVorschau: "Keine Vorschau bei Deezer",
  },
  eigener: {
    titel: "Dein eigener Himmel", schliessen: "Schließen",
    lede: "Alles bleibt in deinem Browser: nichts wird hochgeladen, es gibt keinen Server. Drei Wege, keiner braucht den anderen.",
    h1: "Streaming-Verlauf ablegen",
    p1: "Bei Spotify unter <em>Konto → Datenschutz</em> den <em>erweiterten Streaming-Verlauf</em> anfordern (dauert Tage bis Wochen). Das ZIP dann hier ablegen: Heatmap nach Uhrzeit und Wochentag, Monate, Nachtanteil, Serien.",
    ablage: "ZIP oder gespeicherten Himmel (JSON) hierher ziehen oder <u>auswählen</u>",
    h2: "Mit deinem Spotify-Konto",
    p2: 'Seit Februar 2026 braucht jede Spotify-App einen Besitzer mit Premium und erlaubt höchstens fünf Nutzer. Deshalb: eigene App unter <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener">developer.spotify.com/dashboard</a> anlegen, dort als Redirect-URI genau diese Adresse eintragen und die Client-ID hier einsetzen. Die ID ist kein Geheimnis, sie bleibt in deinem Browser.',
    kopieren: "Kopieren", kopiert: "Kopiert", cidPlatzhalter: "Client-ID (32 Zeichen)", cid: "Client-ID", login: "Bei Spotify anmelden", nochmal: "Noch einmal laden",
    rechte: "Rechte: nur <code>user-top-read</code> und <code>user-read-recently-played</code>. Genres kommen danach von MusicBrainz, eine Anfrage pro Sekunde, also ein bis zwei Minuten Geduld.",
    abbruch: "Genres überspringen", h3: "Zurück oder behalten", speichern: "Himmel als Datei speichern", zurueck: "Zurück zu Stefans Himmel",
    p3: "Der eigene Himmel liegt in <code>localStorage</code> dieses Browsers. „Zurück“ löscht ihn dort wieder.",
    verlaufStand: (v) => `Verlauf geladen: ${zahl(v.streams)} Streams, ${Math.round(v.stunden)} Stunden.`,
    cidFalsch: "Die Client-ID hat 32 Zeichen aus 0–9 und a–f. So sieht das hier nicht aus.", weiterZuSpotify: "Weiter zu Spotify …",
    fertig: "Fertig. Dein Himmel steht; er liegt nur in diesem Browser.", fehler: (m) => "Fehler: " + m,
    kaputt: "Der gespeicherte Himmel ließ sich nicht laden und wurde verworfen.", keinHimmel: "Das ist kein gespeicherter Resonanz-Himmel.",
    geladen: (n) => `Himmel aus „${n}“ geladen.`, lese: (n, mb) => `Lese ${n} (${mb} MB) …`,
    zipFertig: (v) => `${zahl(v.streams)} Streams gelesen, ${Math.round(v.stunden)} Stunden Musik. Die Verlaufs-Kapitel stehen jetzt im Rückblick.`,
    gingNicht: (m) => "Das ging nicht: " + m, ablageGanz: "Datei loslassen: ZIP mit Streaming-Verlauf oder gespeicherter Himmel",
  },
  konto: {
    abgelehnt: (e) => "Spotify hat abgelehnt: " + e, state: "Der Login passt nicht zu dieser Sitzung (state). Bitte noch einmal.",
    tausch: (s) => `Token-Tausch fehlgeschlagen (${s}). Stimmt die Redirect-URI in deiner Spotify-App?`,
    verboten: "Spotify sagt 403: Dein Konto ist in der App nicht als Nutzer eingetragen (Development Mode, bis zu 5 Nutzer).",
    fehler: (s, p) => `Spotify ${s} bei ${p}`, top: (k) => `Spotify: Top-Listen ${k} …`, zuletzt: "Spotify: zuletzt gehört …",
    genres: (i, n) => `Genres von MusicBrainz: ${i} von ${n} (eine Anfrage pro Sekunde)`,
  },
};

const EN = {
  ui: {
    titel: "Resonanz – a star atlas of my music",
    beschreibung: "My listening habits as a night sky: every artist a star, every listening world a galaxy. Data from Spotify and MusicBrainz, computed in the browser.",
    unter: "Star atlas of my music", stand: "As of", quelle: "Source", blick: "View", laden: "Loading the sky …",
    eigenKnopf: "Your own sky", zeitraum: "Period", z4w: "4 wk", z6m: "6 mo", z1y: "1 yr",
    sterne: "Stars", welten: "Worlds", sternbilder: "Constellations", sternbilderKurz: "Lines", hoerwelten: "Listening worlds", brett: "Instrument panel",
    ziehen: "Drag to look around", tasten: "Arrow keys turn, Tab jumps to the worlds", weiter: "Scroll for the retrospective",
    kapitelNav: "Chapters", canvas: "Night sky: one star per artist, coloured by listening world. Drag to look around.",
    noscript: "Resonanz needs JavaScript: the sky is computed in the browser from a JSON file.",
    stern: "star", sterneKlein: "stars", az: "Az", hoehe: "Alt", richtungen: ["N", "E", "S", "W"],
    quelleStandard: "Spotify · MusicBrainz", quelleKonto: "own account", quelleDatei: "file", plusVerlauf: " + history",
    markeEigen: " · your sky", markeVerlauf: " · your history", andereSprache: "DE", andereSpracheTitel: "Auf Deutsch umschalten",
    ladefehler: (m) => `The snapshot could not be loaded (${m}). Reloading usually helps.`,
  },
  kapitel: {
    welten: { titel: "Eight worlds, one sky.", spalten: ["World", "Stars"],
      text: (g, n, anteil) => `${g.anzahl} of ${n} stars sit in the ${g.name} galaxy, that is ${anteil} percent. The legend below is the instrument panel: tap a world to lift it out, the period shifts the weights.` },
    gerade: { titel: "Right now.", spalten: ["Rising", "4 wk", "1 yr"], leer: "Nobody new has risen in the last four weeks. The sky holds.",
      text: (auf, weltName) => `${liste(auf.slice(0, 3).map((a) => a.name), "and")} ${auf.length > 1 ? "were" : "was"} ${auf.every((a) => a.jahr === null) ? "not in the sky" : "far back"} in the yearly picture. In the last four weeks ${auf.length > 1 ? "they sit" : "it sits"} at rank ${liste(auf.slice(0, 3).map((a) => a.jetzt), "and")}.${weltName ? ` All from the same world: ${weltName}.` : ""}` },
    dauerbrenner: { titel: "Ever-burning.", spalten: ["Artist", "4 wk", "6 mo", "1 yr"], leer: "Nobody stays near the top in all three periods.",
      text: (db) => `${db.length} stars sit in the top 25 of all three periods. ${db[0].name} leads with ranks ${db[0].plaetze.join(", ")}. That is not an October, that is a year.` },
    verblasst: { titel: "Faded.", spalten: ["Artist", "1 yr", "4 wk"], leer: "Nobody from the yearly top has vanished in the last four weeks.",
      text: (weg) => `${liste(weg.slice(0, 3).map((w) => w.name), "and")} ${weg.length > 1 ? "were" : "was"} at rank ${liste(weg.slice(0, 3).map((w) => w.jahr), "and")} over the year. In the last four weeks: not in the list once. The stars are still there, just dimmer.` },
    herkunft: { titel: "Where the sound comes from.", spalten: ["Country", "Stars"],
      text: (la) => `${la.gesamt} stars have a known origin. ${landName(la.liste[0].code)} provides ${la.liste[0].anzahl}${la.liste[1] ? `, ${landName(la.liste[1].code)} ${la.liste[1].anzahl}` : ""}.${la.liste.find((l) => l.code === "AT") ? ` From Austria: ${la.liste.find((l) => l.code === "AT").anzahl}.` : ""} For ${la.unbekannt} MusicBrainz does not know.`,
      leer: (n) => `None of the ${n} stars has a known origin. That happens when genres were skipped or MusicBrainz was unreachable.` },
    jahrgaenge: { titel: "Vintages.", leer: "No release dates in the snapshot.",
      text: (jg, neu) => `Of the ${jg.gesamt} top songs of the year, ${neu} are from the last two years. The oldest: “${jg.aeltester.name}” by ${jg.aeltester.kuenstler[0]?.name || "?"}, ${jg.aeltester.erschienen.slice(0, 4)}. The newest: “${jg.neuester.name}”, ${jg.neuester.erschienen.slice(0, 4)}.`,
      aria: "Release years" },
    zuletzt: { titel: "Lately.", spalten: ["Song", "Length"], leer: "No recently played songs in the snapshot.",
      text: (zl) => `Spotify only hands over the last ${zl.anzahl} songs. They played on ${tag(zl.von)} between ${uhr(zl.von)} and ${uhr(zl.bis)}. A real daily rhythm only comes with the exported streaming history.` },
    schluss: { titel: "The rest is written in the stars.",
      text: "Everything here is computed in the browser: top lists from the Spotify API, genres and origin from MusicBrainz. Nothing is uploaded. The sky is a snapshot, not a live view.",
      textEigen: "This sky is yours: computed in your browser from your Spotify account or your file, genres and origin from MusicBrainz. Nothing was uploaded; it lives only in this browser.",
      code: "Code on GitHub", eigen: "Your own sky",
      klein: "Metadata and cover art belong to Spotify and the rights holders. This page is a private project and is not affiliated with Spotify." },
    verlauf: { titel: "Your history.", spalten: ["Measure", ""],
      text: (v) => `${zahl(v.streams)} streams between ${datum(v.von)} and ${datum(v.bis)}, ${zahl(v.gezaehlt)} of them longer than 30 seconds. Together ${zahl(Math.round(v.stunden))} hours of music on ${zahl(v.tage)} days. Longest streak without a silent day: ${v.laengsteSerie} days.`,
      zeilen: (v) => [["Streams", zahl(v.streams)], ["Counted (over 30 s)", zahl(v.gezaehlt)], ["Hours", zahl(Math.round(v.stunden))], ["Days with music", zahl(v.tage)], ["Longest streak", v.laengsteSerie + " days"]] },
    uhrzeiten: { titel: "Hours.", leer: "Not enough data for a heatmap.", aria: (s) => `Listening minutes per weekday and hour, peak ${s}`, minuten: "minutes", uhr: "h",
      text: (v, nacht) => `The loudest hour of the week: ${v.spitze.name} at ${v.spitze.stunde}:00. ${nacht} percent of your music plays between 23:00 and 5:00${nacht >= 25 ? ", that is a night drive" : nacht >= 12 ? ", a solid night share" : ", so you do sleep after all"}.` },
    monate: { titel: "Months.", leer: "No months in the history.", aria: "Hours per month",
      text: (st, schnitt) => `The loudest month: ${st.name} ${st.jahr} with ${Math.round(st.stunden)} hours. On average ${schnitt} hours per month.` },
    hoerzeit: { titel: "Listening time.", spalten: ["Artist", "Hours"],
      text: (v, skip) => `Counted in hours, not in rank: ${v.topKuenstler[0] ? `${v.topKuenstler[0].name} leads with ${Math.round(v.topKuenstler[0].stunden)} hours` : "nobody leads"}.${skip !== null ? ` You skipped ${skip} percent of all streams.` : ""} Most played: ${v.topSongs[0] ? `“${v.topSongs[0].name}”, ${v.topSongs[0].n} times` : "–"}.` },
    wochentage: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    monatsnamen: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
  karte: {
    schliessen: "Close card", keineSongs: "No top songs in the snapshot, only heard as an artist.", aufSpotify: "Open on Spotify",
    vorschauHinweis: "Preview: 30 s from Deezer, loaded only when you press play.", vorschau: (n) => `Play a 30-second preview of ${n} (loads it from Deezer)`,
    anhalten: "Pause preview", keineVorschau: "No preview on Deezer",
  },
  eigener: {
    titel: "Your own sky", schliessen: "Close",
    lede: "Everything stays in your browser: nothing is uploaded, there is no server. Three ways, none needs the other.",
    h1: "Drop your streaming history",
    p1: "Request the <em>extended streaming history</em> from Spotify under <em>Account → Privacy</em> (takes days to weeks). Then drop the ZIP here: heatmap by hour and weekday, months, night share, streaks.",
    ablage: "Drag a ZIP or a saved sky (JSON) here or <u>choose a file</u>",
    h2: "With your own Spotify account",
    p2: 'Since February 2026 every Spotify app needs an owner with Premium and allows at most five users. So: create your own app at <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener">developer.spotify.com/dashboard</a>, enter exactly this address as the redirect URI there and paste the client ID here. The ID is not a secret; it stays in your browser.',
    kopieren: "Copy", kopiert: "Copied", cidPlatzhalter: "Client ID (32 characters)", cid: "Client ID", login: "Sign in with Spotify", nochmal: "Load again",
    rechte: "Scopes: only <code>user-top-read</code> and <code>user-read-recently-played</code>. Genres then come from MusicBrainz, one request per second, so one to two minutes of patience.",
    abbruch: "Skip genres", h3: "Go back or keep", speichern: "Save sky as a file", zurueck: "Back to Stefan’s sky",
    p3: "Your own sky lives in this browser’s <code>localStorage</code>. “Back” deletes it there again.",
    verlaufStand: (v) => `History loaded: ${zahl(v.streams)} streams, ${Math.round(v.stunden)} hours.`,
    cidFalsch: "A client ID has 32 characters from 0–9 and a–f. This does not look like one.", weiterZuSpotify: "Off to Spotify …",
    fertig: "Done. Your sky is up; it lives only in this browser.", fehler: (m) => "Error: " + m,
    kaputt: "The saved sky could not be loaded and was discarded.", keinHimmel: "This is not a saved Resonanz sky.",
    geladen: (n) => `Sky loaded from “${n}”.`, lese: (n, mb) => `Reading ${n} (${mb} MB) …`,
    zipFertig: (v) => `${zahl(v.streams)} streams read, ${Math.round(v.stunden)} hours of music. The history chapters are now in the retrospective.`,
    gingNicht: (m) => "That did not work: " + m, ablageGanz: "Drop the file: ZIP with streaming history or a saved sky",
  },
  konto: {
    abgelehnt: (e) => "Spotify declined: " + e, state: "The login does not match this session (state). Please try again.",
    tausch: (s) => `Token exchange failed (${s}). Is the redirect URI in your Spotify app correct?`,
    verboten: "Spotify says 403: your account is not listed as a user of the app (development mode, up to 5 users).",
    fehler: (s, p) => `Spotify ${s} at ${p}`, top: (k) => `Spotify: top lists ${k} …`, zuletzt: "Spotify: recently played …",
    genres: (i, n) => `Genres from MusicBrainz: ${i} of ${n} (one request per second)`,
  },
};

/** Das Wörterbuch der aktuellen Sprache. */
export function tx() { return sprache === "en" ? EN : DE; }
export const weltName = (w) => (sprache === "en" ? (w.en || w.name) : w.name);
