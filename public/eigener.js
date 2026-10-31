// „Dein eigener Himmel“: Verlauf-ZIP ablegen, mit eigenem Spotify-Konto anmelden, gespeicherten Himmel laden.
import { loginStarten, rueckkehrVerarbeiten, tokenLesen, snapshotHolen, genresErgaenzen, redirectUri } from "./konto.js";
import { verlaufAusZip } from "./verlauf.js";

const SNAP_KEY = "resonanz.snapshot", VERLAUF_KEY = "resonanz.verlauf", CID_KEY = "resonanz.clientId";
let api, dlg, eigenerAktiv = false, verlaufAktiv = null;

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
  if (gespeichert) { aufbauen(gespeichert, "eigenes Konto"); return true; }
  if (verlaufAktiv) return false; // Stefans Himmel plus eigener Verlauf: app.js baut, wir hängen den Verlauf an
  return false;
}

export function aktuellerVerlauf() { return verlaufAktiv; }

function aufbauen(snap, quelle) {
  eigenerAktiv = true;
  api.himmelAufbauen(snap, { verlauf: verlaufAktiv, quelle: quelle + (verlaufAktiv ? " · Verlauf" : ""), eigener: true });
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
    schreib(SNAP_KEY, snap);
    aufbauen(snap, "eigenes Konto");
    fortschritt("Fertig. Dein Himmel steht; er liegt nur in diesem Browser.");
    zustandZeigen();
  } catch (e) {
    fortschritt("Fehler: " + e.message, true);
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
  v.textContent = verlaufAktiv ? `Verlauf geladen: ${verlaufAktiv.streams.toLocaleString("de-AT")} Streams, ${Math.round(verlaufAktiv.stunden)} Stunden.` : "";
}

function anlegen() {
  dlg = document.createElement("dialog");
  dlg.className = "eigener";
  dlg.innerHTML = `
    <form method="dialog" class="eg-kopf"><h2>Dein eigener Himmel</h2><button class="zu" aria-label="Schließen"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12" stroke="currentColor" stroke-width="1.3" fill="none"/></svg></button></form>
    <p class="eg-lede">Alles bleibt in deinem Browser: nichts wird hochgeladen, es gibt keinen Server. Drei Wege, keiner braucht den anderen.</p>

    <section class="eg-teil">
      <h3>1 · Streaming-Verlauf ablegen</h3>
      <p>Bei Spotify unter <em>Konto → Datenschutz</em> den <em>erweiterten Streaming-Verlauf</em> anfordern (dauert Tage bis Wochen). Das ZIP dann hier ablegen: Heatmap nach Uhrzeit und Wochentag, Monate, Nachtanteil, Serien.</p>
      <label class="ablage" id="eg-ablage"><input type="file" id="eg-datei" accept=".zip,.json,application/zip,application/json" hidden><span>ZIP oder gespeicherten Himmel (JSON) hierher ziehen oder <u>auswählen</u></span></label>
      <p class="eg-klein" id="eg-verlauf-stand"></p>
    </section>

    <section class="eg-teil">
      <h3>2 · Mit deinem Spotify-Konto</h3>
      <p>Seit Februar 2026 braucht jede Spotify-App einen Besitzer mit Premium und erlaubt höchstens fünf Nutzer. Deshalb: eigene App unter <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener">developer.spotify.com/dashboard</a> anlegen, dort als Redirect-URI genau diese Adresse eintragen und die Client-ID hier einsetzen. Die ID ist kein Geheimnis, sie bleibt in deinem Browser.</p>
      <p class="eg-code"><code id="eg-redirect"></code><button type="button" id="eg-kopieren">Kopieren</button></p>
      <p class="eg-zeile"><input id="eg-cid" inputmode="latin" autocomplete="off" spellcheck="false" placeholder="Client-ID (32 Zeichen)" aria-label="Client-ID"><button type="button" class="eg-haupt" id="eg-login">Bei Spotify anmelden</button></p>
      <p class="eg-klein">Rechte: nur <code>user-top-read</code> und <code>user-read-recently-played</code>. Genres kommen danach von MusicBrainz, eine Anfrage pro Sekunde, also ein bis zwei Minuten Geduld. <button type="button" id="eg-abbruch" hidden>Genres überspringen</button></p>
    </section>

    <section class="eg-teil">
      <h3>3 · Zurück oder behalten</h3>
      <p class="eg-zeile"><button type="button" id="eg-speichern" hidden>Himmel als Datei speichern</button><button type="button" id="eg-zurueck" hidden>Zurück zu Stefans Himmel</button></p>
      <p class="eg-klein">Der eigene Himmel liegt in <code>localStorage</code> dieses Browsers. „Zurück“ löscht ihn dort wieder.</p>
    </section>
    <p class="status" id="eg-status" role="status"></p>`;
  document.body.appendChild(dlg);
  dlg.querySelector("#eg-kopieren").addEventListener("click", async (e) => { try { await navigator.clipboard.writeText(redirectUri()); e.target.textContent = "Kopiert"; setTimeout(() => (e.target.textContent = "Kopieren"), 1500); } catch { /* kein Clipboard */ } });
  dlg.querySelector("#eg-login").addEventListener("click", () => {
    const cid = dlg.querySelector("#eg-cid").value.trim();
    if (!/^[a-f0-9]{32}$/i.test(cid)) { fortschritt("Die Client-ID hat 32 Zeichen aus 0–9 und a–f. So sieht das hier nicht aus.", true); return; }
    schreib(CID_KEY, cid);
    fortschritt("Weiter zu Spotify …");
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
  if (tokenLesen()) dlg.querySelector("#eg-login").textContent = "Noch einmal laden";
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
      const snap = JSON.parse(await datei.text());
      if (!snap.zeitraeume || !snap.kuenstler) throw new Error("Das ist kein gespeicherter Resonanz-Himmel.");
      schreib(SNAP_KEY, snap);
      aufbauen(snap, "Datei");
      fortschritt(`Himmel aus „${datei.name}“ geladen.`);
    } else {
      fortschritt(`Lese ${datei.name} (${(datei.size / 1048576).toFixed(1)} MB) …`);
      const a = await verlaufAusZip(await datei.arrayBuffer());
      verlaufAktiv = a; schreib(VERLAUF_KEY, a);
      const snap = lies(SNAP_KEY) || (await (await fetch("data/snapshot.json", { cache: "no-cache" })).json());
      api.himmelAufbauen(snap, { verlauf: a, quelle: (lies(SNAP_KEY) ? "eigenes Konto" : "Spotify · MusicBrainz") + " · Verlauf", eigener: !!lies(SNAP_KEY) || true });
      eigenerAktiv = eigenerAktiv || false;
      fortschritt(`${a.streams.toLocaleString("de-AT")} Streams gelesen, ${Math.round(a.stunden)} Stunden Musik. Die Verlaufs-Kapitel stehen jetzt im Rückblick.`);
      dlg.close();
    }
    zustandZeigen();
  } catch (e) {
    fortschritt("Das ging nicht: " + e.message, true);
  }
}
