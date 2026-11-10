// „Dein eigener Himmel“: Verlauf-ZIP ablegen, mit eigenem Spotify-Konto anmelden, gespeicherten Himmel laden.
import { loginStarten, rueckkehrVerarbeiten, tokenLesen, snapshotHolen, genresErgaenzen, redirectUri } from "./konto.js";
import { verlaufAusZip } from "./verlauf.js";
import { vergleichSektion } from "./vergleich-ui.js";
import { tx } from "./texte.js";
const TE = () => tx().eigener, TUI = () => tx().ui;

const SNAP_KEY = "resonanz.snapshot", VERLAUF_KEY = "resonanz.verlauf", CID_KEY = "resonanz.clientId";
let api, dlg, vgl, eigenerAktiv = false, verlaufAktiv = null;

const lies = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
const schreib = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* Speicher voll */ } };

/** Wird von app.js beim Start gerufen. Gibt true zurück, wenn ein eigener Himmel aufgebaut wurde. */
export async function start(a) {
  api = a;
  document.getElementById("eigen-knopf")?.addEventListener("click", oeffnen);
  document.addEventListener("click", (e) => { if (e.target.closest("[data-eigener]")) { e.preventDefault(); oeffnen(); } });
  ablageVerdrahten();
  verlaufAktiv = lies(VERLAUF_KEY);
  // Rückkehr von Spotify?
  try {
    const tok = await rueckkehrVerarbeiten();
    if (tok) { await kontoLaden(tok); return true; }
  } catch (e) { api.statusMelden(e.message, true); }
  const gespeichert = lies(SNAP_KEY);
  if (gespeichert) {
    try { aufbauen(gespeichert, TUI().quelleKonto); return true; }
    catch (e) { console.warn("Gespeicherter Himmel kaputt, wird verworfen:", e); schreib(SNAP_KEY, null); eigenerAktiv = false; api.statusMelden(TE().kaputt); }
  }
  if (verlaufAktiv) return false; // Stefans Himmel plus eigener Verlauf: app.js baut, wir hängen den Verlauf an
  return false;
}

export function aktuellerVerlauf() { return verlaufAktiv; }

function aufbauen(snap, quelle) {
  eigenerAktiv = true;
  api.himmelAufbauen(snap, { verlauf: verlaufAktiv, quelle: quelle + (verlaufAktiv ? TUI().plusVerlauf : ""), eigener: true });
}

async function kontoLaden(tok) {
  const dialog = oeffnen();
  const melde = (t) => { fortschritt(t); api.statusMelden(t); };
  try {
    const snap = await snapshotHolen(tok, melde);
    const abbruch = { wert: false };
    dlg.querySelector("#eg-abbruch").hidden = false;
    dlg.querySelector("#eg-abbruch").onclick = () => { abbruch.wert = true; };
    await genresErgaenzen(snap, melde, { abbruch });
    dlg.querySelector("#eg-abbruch").hidden = true;
    aufbauen(snap, TUI().quelleKonto);
    schreib(SNAP_KEY, snap);
    fortschritt(TE().fertig);
    zustandZeigen();
  } catch (e) {
    fortschritt(TE().fehler(e.message), true);
    api.statusMelden("");
  }
  return dialog;
}

function oeffnen() {
  if (!dlg) anlegen();
  zustandZeigen();
  if (!dlg.open) dlg.showModal();
  return dlg;
}

function fortschritt(text, fehler = false) {
  const el = dlg?.querySelector("#eg-status"); if (!el) return;
  el.textContent = text || ""; el.classList.toggle("fehler", fehler);
}

function zustandZeigen() {
  if (!dlg) return;
  dlg.querySelector("#eg-zurueck").hidden = !(eigenerAktiv || verlaufAktiv);
  dlg.querySelector("#eg-speichern").hidden = !eigenerAktiv;
  dlg.querySelector("#eg-redirect").textContent = redirectUri();
  const cid = dlg.querySelector("#eg-cid"); if (!cid.value) cid.value = lies(CID_KEY) || "";
  const v = dlg.querySelector("#eg-verlauf-stand");
  v.textContent = verlaufAktiv ? TE().verlaufStand(verlaufAktiv) : "";
  vgl?.aktualisieren();
}

function anlegen() {
  dlg = document.createElement("dialog");
  dlg.className = "eigener";
  const T = TE();
  dlg.innerHTML = `
    <form method="dialog" class="eg-kopf"><h2>${T.titel}</h2><button class="zu" aria-label="${T.schliessen}"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12" stroke="currentColor" stroke-width="1.3" fill="none"/></svg></button></form>
    <p class="eg-lede">${T.lede}</p>

    <section class="eg-teil">
      <h3>${T.h1}</h3>
      <p>${T.p1}</p>
      <label class="ablage" id="eg-ablage"><input type="file" id="eg-datei" accept=".zip,.json,application/zip,application/json" hidden><span>${T.ablage}</span></label>
      <p class="eg-klein" id="eg-verlauf-stand"></p>
    </section>

    <section class="eg-teil">
      <h3>${T.h2}</h3>
      <p>${T.p2}</p>
      <p class="eg-code"><code id="eg-redirect"></code><button type="button" id="eg-kopieren">${T.kopieren}</button></p>
      <p class="eg-zeile"><input id="eg-cid" inputmode="latin" autocomplete="off" spellcheck="false" placeholder="${T.cidPlatzhalter}" aria-label="${T.cid}"><button type="button" class="eg-haupt" id="eg-login">${T.login}</button></p>
      <p class="eg-klein">${T.rechte} <button type="button" id="eg-abbruch" hidden>${T.abbruch}</button></p>
    </section>

    <section class="eg-teil">
      <h3>${T.h3}</h3>
      <p class="eg-zeile"><button type="button" id="eg-speichern" hidden>${T.speichern}</button><button type="button" id="eg-zurueck" hidden>${T.zurueck}</button></p>
      <p class="eg-klein">${T.p3}</p>
    </section>
    <section class="eg-teil" id="eg-vergleich"></section>
    <p class="status" id="eg-status" role="status"></p>`;
  document.body.appendChild(dlg);
  dlg.querySelector("#eg-kopieren").addEventListener("click", async (e) => { try { await navigator.clipboard.writeText(redirectUri()); e.target.textContent = T.kopiert; setTimeout(() => (e.target.textContent = T.kopieren), 1500); } catch { /* kein Clipboard */ } });
  dlg.querySelector("#eg-login").addEventListener("click", () => {
    const cid = dlg.querySelector("#eg-cid").value.trim();
    if (!/^[a-f0-9]{32}$/i.test(cid)) { fortschritt(T.cidFalsch, true); return; }
    schreib(CID_KEY, cid);
    fortschritt(T.weiterZuSpotify);
    loginStarten(cid);
  });
  dlg.querySelector("#eg-zurueck").addEventListener("click", async () => {
    schreib(SNAP_KEY, null); schreib(VERLAUF_KEY, null); sessionStorage.removeItem("resonanz.token");
    eigenerAktiv = false; verlaufAktiv = null;
    const r = await fetch("data/snapshot.json", { cache: "no-cache" });
    api.himmelAufbauen(await r.json());
    dlg.close();
  });
  dlg.querySelector("#eg-speichern").addEventListener("click", () => {
    const snap = lies(SNAP_KEY); if (!snap) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(snap)], { type: "application/json" }));
    a.download = `resonanz-himmel-${snap.erstellt.slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  dlg.querySelector("#eg-datei").addEventListener("change", (e) => { if (e.target.files[0]) dateiLaden(e.target.files[0]); });
  const ablage = dlg.querySelector("#eg-ablage");
  ablage.addEventListener("dragover", (e) => { e.preventDefault(); ablage.classList.add("drueber"); });
  ablage.addEventListener("dragleave", () => ablage.classList.remove("drueber"));
  ablage.addEventListener("drop", (e) => { e.preventDefault(); ablage.classList.remove("drueber"); if (e.dataTransfer.files[0]) dateiLaden(e.dataTransfer.files[0]); });
  vgl = vergleichSektion(dlg.querySelector("#eg-vergleich"), {
    snapshot: () => api.snapshot?.() ?? null, vergleichStarten: api.vergleichStarten, vergleichBeenden: api.vergleichBeenden, vergleichLaeuft: api.vergleichLaeuft,
  }, { schliessen: () => dlg.close() });
  if (tokenLesen()) dlg.querySelector("#eg-login").textContent = T.nochmal;
}

// Ganze Seite nimmt Dateien an, nicht nur das Feld
function ablageVerdrahten() {
  addEventListener("dragover", (e) => { if ([...e.dataTransfer.types].includes("Files")) { e.preventDefault(); document.body.classList.add("ablage-aktiv"); } });
  addEventListener("dragleave", (e) => { if (!e.relatedTarget) document.body.classList.remove("ablage-aktiv"); });
  addEventListener("drop", (e) => { document.body.classList.remove("ablage-aktiv"); if (e.dataTransfer.files[0]) { e.preventDefault(); oeffnen(); dateiLaden(e.dataTransfer.files[0]); } });
}

async function dateiLaden(datei) {
  oeffnen();
  try {
    if (/\.json$/i.test(datei.name)) {
      const inhalt = await datei.text();
      if (/"format"\s*:\s*"resonanz-himmel"/.test(inhalt.slice(0, 512))) { vgl.text(inhalt); return; } // Vergleichsdatei eines anderen
      const snap = JSON.parse(inhalt);
      if (!snap.zeitraeume || !snap.kuenstler || !Object.values(snap.zeitraeume).every((z) => Array.isArray(z.kuenstler) && Array.isArray(z.songs))) throw new Error(TE().keinHimmel);
      aufbauen(snap, TUI().quelleDatei);
      schreib(SNAP_KEY, snap);
      fortschritt(TE().geladen(datei.name));
    } else {
      fortschritt(TE().lese(datei.name, (datei.size / 1048576).toFixed(1)));
      const a = await verlaufAusZip(await datei.arrayBuffer());
      verlaufAktiv = a; schreib(VERLAUF_KEY, a);
      const snap = lies(SNAP_KEY) || (await (await fetch("data/snapshot.json", { cache: "no-cache" })).json());
      api.himmelAufbauen(snap, { verlauf: a, quelle: (lies(SNAP_KEY) ? TUI().quelleKonto : TUI().quelleStandard) + TUI().plusVerlauf, eigener: !!lies(SNAP_KEY) });
      eigenerAktiv = eigenerAktiv || false;
      fortschritt(TE().zipFertig(a));
      dlg.close();
    }
    zustandZeigen();
  } catch (e) {
    fortschritt(TE().gingNicht(e.message), true);
  }
}
