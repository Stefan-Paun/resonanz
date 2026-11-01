// Sternkarte: die Karte zu einem Künstler (Plätze, Songs, Cover, Vorschau über Deezer auf Wunsch).
import { welt } from "./welten.js";
import { ZEITRAEUME, dauerText, LANDNAMEN } from "./daten.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ZEIT_NAME = { "4w": "4 W", "6m": "6 M", "1y": "1 J" };

let el, audio, aktuellerSong = null, zuletztFokus = null, beimSchliessen = null;

function anlegen() {
  el = document.createElement("aside");
  el.className = "stern";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "false");
  el.hidden = true;
  document.body.appendChild(el);
  audio = new Audio();
  audio.preload = "none";
  audio.addEventListener("ended", () => vorschauStopp());
  audio.addEventListener("timeupdate", () => {
    if (!aktuellerSong) return;
    const b = el.querySelector(`[data-song="${aktuellerSong}"] .lauf i`);
    if (b && audio.duration) b.style.transform = `scaleX(${audio.currentTime / audio.duration})`;
  });
  el.addEventListener("click", (e) => {
    const zu = e.target.closest("[data-zu]"); if (zu) { karteSchliessen(); return; }
    const v = e.target.closest("[data-vorschau]"); if (v) vorschau(v);
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !el.hidden) karteSchliessen(); });
}

/** Öffnet die Karte für einen Stern. rang(z, id) liefert den Platz im Zeitraum oder null. */
export function karteOeffnen(stern, { rang, beimSchliessen: cb } = {}) {
  if (!el) anlegen();
  vorschauStopp();
  beimSchliessen = cb || null;
  zuletztFokus = document.activeElement;
  const w = welt(stern.welt);
  const plaetze = ZEITRAEUME.map((z) => [ZEIT_NAME[z], rang ? rang(z, stern.id) : null]);
  const tags = (stern.tags || []).filter((t) => !/^\d{4}s$|^(german|germany|english|american|austrian|spanish)$/.test(t)).slice(0, 4);
  const songs = (stern.songs || []).slice(0, 6);
  el.innerHTML = `
    <button type="button" class="zu" data-zu aria-label="Karte schließen"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12" stroke="currentColor" stroke-width="1.3" fill="none"/></svg></button>
    <h2 id="stern-h">${esc(stern.name)}</h2>
    <p class="welt" style="--w:${w.farbe}"><i></i>${esc(w.name)}${stern.land ? ` · ${esc(LANDNAMEN[stern.land] || stern.land)}` : ""}</p>
    ${tags.length ? `<p class="tags">${tags.map(esc).join(" · ")}</p>` : ""}
    <dl class="plaetze">${plaetze.map(([n, p]) => `<div><dt>${n}</dt><dd>${p ? `<span class="nr">${p}</span>` : "<span class='leer'>–</span>"}</dd></div>`).join("")}</dl>
    ${songs.length ? `<ol class="songs">${songs.map((s) => `
      <li data-song="${esc(s.id)}">
        ${s.cover ? `<img src="${esc(s.cover)}" alt="" width="40" height="40" loading="lazy" decoding="async">` : `<span class="kein-cover" aria-hidden="true"></span>`}
        <span class="song-t"><b>${esc(s.name)}</b><small>${esc(s.album)}${s.erschienen ? ` · ${s.erschienen.slice(0, 4)}` : ""}</small><span class="lauf" aria-hidden="true"><i></i></span></span>
        <span class="song-d">${dauerText(s.dauer_ms)}</span>
        <button type="button" class="play" data-vorschau data-titel="${esc(s.name)}" data-kuenstler="${esc(s.kuenstler[0]?.name || stern.name)}" aria-label="30 Sekunden Vorschau von ${esc(s.name)} abspielen (lädt sie von Deezer)"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path class="p" d="M2.5 1.5v9l8-4.5z" fill="currentColor"/><path class="s" d="M2 2h3v8H2zM7 2h3v8H7z" fill="currentColor"/></svg></button>
      </li>`).join("")}</ol>` : `<p class="tags">Keine Top-Songs im Schnappschuss, nur als Künstler gehört.</p>`}
    <p class="fuss">${stern.url ? `<a href="${esc(stern.url)}" target="_blank" rel="noopener">Auf Spotify öffnen</a>` : ""}<span>Vorschau: 30 s von Deezer, erst beim Antippen geladen.</span></p>`;
  el.setAttribute("aria-labelledby", "stern-h");
  el.hidden = false;
  el.tabIndex = -1;
  document.body.classList.add("karte-offen");
  requestAnimationFrame(() => el.classList.add("da"));
  el.focus({ preventScroll: true });
}

export function karteSchliessen() {
  if (!el || el.hidden) return;
  vorschauStopp();
  el.classList.remove("da");
  el.hidden = true;
  document.body.classList.remove("karte-offen");
  const cb = beimSchliessen; beimSchliessen = null;
  if (zuletztFokus && zuletztFokus.focus) zuletztFokus.focus({ preventScroll: true });
  if (cb) cb();
}

export function karteOffen() { return !!el && !el.hidden; }
export function karteElement() { return el; }

// ---------------------------------------------------------------- Vorschau (Deezer, JSONP, nur auf Wunsch)
const deezerCache = new Map();
function deezerSuche(titel, kuenstler) {
  const sauber = titel.replace(/\s*[-–(].*(sped up|slowed|remix|feat\.?|live|version|edit).*$/i, "").trim();
  const key = sauber.toLowerCase() + "|" + kuenstler.toLowerCase();
  if (deezerCache.has(key)) return deezerCache.get(key);
  const p = new Promise((aufloesen) => {
    const cb = "dz" + Math.random().toString(36).slice(2);
    const s = document.createElement("script");
    const timer = setTimeout(() => { fertig(null); }, 8000);
    const fertig = (d) => { clearTimeout(timer); delete window[cb]; s.remove(); aufloesen(d); };
    window[cb] = (d) => {
      const liste = (d && d.data) || [];
      const k = kuenstler.toLowerCase();
      const treffer = liste.find((t) => t.artist && t.artist.name.toLowerCase() === k) || liste.find((t) => t.artist && (t.artist.name.toLowerCase().includes(k) || k.includes(t.artist.name.toLowerCase())));
      fertig(treffer && treffer.preview ? { url: treffer.preview, titel: treffer.title, kuenstler: treffer.artist.name } : null);
    };
    s.onerror = () => fertig(null);
    s.src = "https://api.deezer.com/search?" + new URLSearchParams({ q: `${sauber} ${kuenstler}`, limit: "5", output: "jsonp", callback: cb });
    document.head.appendChild(s);
  });
  deezerCache.set(key, p);
  return p;
}

async function vorschau(btn) {
  const li = btn.closest("li"), id = li.dataset.song;
  if (aktuellerSong === id && !audio.paused) { vorschauStopp(); return; }
  vorschauStopp();
  li.classList.add("laedt"); btn.disabled = true;
  const t = await deezerSuche(btn.dataset.titel, btn.dataset.kuenstler);
  li.classList.remove("laedt"); btn.disabled = false;
  if (!t) { li.classList.add("ohne"); const h = li.querySelector(".song-t small"); if (h && !h.dataset.alt) { h.dataset.alt = h.textContent; h.textContent = "Keine Vorschau bei Deezer"; } return; }
  aktuellerSong = id;
  audio.src = t.url;
  try { await audio.play(); li.classList.add("spielt"); btn.setAttribute("aria-label", "Vorschau anhalten"); }
  catch { aktuellerSong = null; li.classList.add("ohne"); }
}

function vorschauStopp() {
  if (!audio) return;
  audio.pause();
  if (aktuellerSong && el) {
    const li = el.querySelector(`[data-song="${aktuellerSong}"]`);
    if (li) { li.classList.remove("spielt"); const b = li.querySelector(".lauf i"); if (b) b.style.transform = "scaleX(0)"; }
  }
  aktuellerSong = null;
}
