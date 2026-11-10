// Dialog-Abschnitt „Zwei Himmel vergleichen“: eigenen Himmel exportieren, Datei eines anderen laden, Vergleich starten.
// Die fremde Datei bleibt im Speicher dieser Seite; nur mit „merken“ liegt die geprüfte Fassung in localStorage.
import { himmelExportieren, himmelPruefen, GRENZEN } from "./austausch.js";
import { tx } from "./texte.js";

const MERK_KEY = "resonanz.vergleich";
const TV = () => tx().vergleich;

const lies = () => { try { return JSON.parse(localStorage.getItem(MERK_KEY) || "null"); } catch { return null; } };
const merken = (v) => { try { v ? localStorage.setItem(MERK_KEY, JSON.stringify(v)) : localStorage.removeItem(MERK_KEY); } catch { /* Speicher voll */ } };
/** Gemerkte Datei wird beim Lesen genauso streng geprüft wie eine frisch geladene. */
export function gemerkt() { const r = himmelPruefen(JSON.stringify(lies())); return r.ok ? r.himmel : null; }

/**
 * Baut den Abschnitt in `wurzel` (ein <section>). api: { snapshot(), vergleichStarten(himmel, name), vergleichBeenden(), vergleichLaeuft(), statusMelden }.
 * Gibt { aktualisieren(), text(inhalt) } zurück.
 */
export function vergleichSektion(wurzel, api, { schliessen = () => {} } = {}) {
  const T = TV();
  wurzel.innerHTML = `
    <h3>${T.h}</h3>
    <p>${T.p}</p>
    <p class="eg-zeile"><input id="vg-name" maxlength="${GRENZEN.anzeigename}" autocomplete="off" spellcheck="false" placeholder="${T.namePlatz}" aria-label="${T.name}"><button type="button" id="vg-export">${T.exportieren}</button></p>
    <label class="ablage" id="vg-ablage"><input type="file" id="vg-datei" accept=".json,application/json" hidden><span>${T.laden}</span></label>
    <p class="eg-zeile"><label class="eg-klein"><input type="checkbox" id="vg-merken"> ${T.merken}</label></p>
    <p class="eg-zeile"><button type="button" id="vg-gemerkt" hidden></button><button type="button" id="vg-vergessen" hidden>${T.vergessen}</button><button type="button" id="vg-ende" hidden>${T.beenden}</button></p>
    <p class="eg-klein status" id="vg-status" role="status"></p>`;
  const $ = (s) => wurzel.querySelector(s);
  const meldung = (t, fehler = false) => { const el = $("#vg-status"); el.textContent = t; el.classList.toggle("fehler", fehler); };
  const name = () => $("#vg-name").value;

  function starten(himmel) {
    if (!api.vergleichStarten(himmel, name())) { meldung(T.keinBasis, true); return; }
    if ($("#vg-merken").checked) merken(himmel);
    schliessen();
    aktualisieren();
  }
  function text(inhalt) {
    if (typeof inhalt !== "string") { meldung(T.leseFehler, true); return; }
    const r = himmelPruefen(inhalt);
    if (!r.ok) { meldung(T.fehler[r.grund] || T.leseFehler, true); return; }
    starten(r.himmel);
  }
  async function datei(f) {
    if (f.size > GRENZEN.bytes) { meldung(T.fehler["zu-gross"], true); return; } // gar nicht erst einlesen
    try { text(await f.text()); } catch { meldung(T.leseFehler, true); }
  }
  function aktualisieren() {
    const g = lies() ? gemerkt() : null;
    const gm = $("#vg-gemerkt");
    gm.hidden = !g; $("#vg-vergessen").hidden = !lies();
    if (g) gm.textContent = T.gemerkt(g.name);
    $("#vg-ende").hidden = !api.vergleichLaeuft();
  }

  $("#vg-export").addEventListener("click", () => {
    if (!api.snapshot()) { meldung(T.keinBasis, true); return; }
    const d = himmelExportieren(api.snapshot(), name());
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(d)], { type: "application/json" }));
    a.download = "resonanz-vergleich.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    meldung(T.exportiert);
  });
  $("#vg-datei").addEventListener("change", (e) => { if (e.target.files[0]) datei(e.target.files[0]); e.target.value = ""; });
  const ablage = $("#vg-ablage");
  ablage.addEventListener("dragover", (e) => { e.preventDefault(); ablage.classList.add("drueber"); });
  ablage.addEventListener("dragleave", () => ablage.classList.remove("drueber"));
  ablage.addEventListener("drop", (e) => { e.preventDefault(); e.stopPropagation(); ablage.classList.remove("drueber"); if (e.dataTransfer.files[0]) datei(e.dataTransfer.files[0]); });
  $("#vg-gemerkt").addEventListener("click", () => { const g = gemerkt(); if (g) starten(g); });
  $("#vg-vergessen").addEventListener("click", () => { merken(null); meldung(T.vergessenFertig); aktualisieren(); });
  $("#vg-ende").addEventListener("click", () => { api.vergleichBeenden(); meldung(T.beendet); aktualisieren(); schliessen(); });
  aktualisieren();
  return { aktualisieren, text };
}
