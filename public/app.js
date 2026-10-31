// Resonanz: der Himmel. three.js zeichnet Sterne, Galaxien-Haze, Sternbilder und Gitterkuppel;
// Labels und Armaturenbrett sind HTML. Blick per Ziehen, Pfeiltasten oder Drift.
import * as THREE from "three";
import { WELTEN, welt } from "./welten.js";
import { sterne, sternbilder, positionen, weltenZaehlung, galaxieRichtung, hash01, ZEITRAEUME } from "./daten.js";
import { kapitelBauen } from "./kapitel.js";

const RADIUS = 100;
const ruhig = matchMedia("(prefers-reduced-motion: reduce)");
const $ = (s) => document.querySelector(s);
const cv = $("#cv"), labelsEl = $("#labels"), status = $("#status");

const zustand = {
  zeitraum: "1y", welt: null, hover: -1, fokus: null, dunkelZeigen: false, pan: false,
  yaw: 0, pitch: 0.36, zielYaw: 0, zielPitch: 0.36, drift: true,
  sterne: [], pos: [], groesseZiel: null, groesse: null,
};

// ---------------------------------------------------------------- Renderer und Kamera
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: "low-power" });
renderer.setClearColor(0x070914, 1);
const kamera = new THREE.PerspectiveCamera(62, 1, 0.1, 1000);
const szene = new THREE.Scene();
szene.fog = null;

function groesseSetzen() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, w < 760 ? 1.5 : 2));
  renderer.setSize(w, h, false);
  kamera.aspect = w / h;
  kamera.fov = w < 760 ? 88 : 68;
  kamera.updateProjectionMatrix();
}
addEventListener("resize", groesseSetzen);
groesseSetzen();

// ---------------------------------------------------------------- Texturen (Canvas, keine Dateien)
function weicheScheibe(groesse = 128, exp = 2.2) {
  const c = document.createElement("canvas"); c.width = c.height = groesse;
  const g = c.getContext("2d"), d = g.createImageData(groesse, groesse), m = groesse / 2;
  for (let y = 0; y < groesse; y++) for (let x = 0; x < groesse; x++) {
    const r = Math.hypot(x - m + .5, y - m + .5) / m;
    const a = Math.max(0, 1 - r) ** exp;
    const i = (y * groesse + x) * 4;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; d.data[i + 3] = Math.round(a * 255);
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------------------------------------------------------- Gitterkuppel
function kuppel() {
  const pts = [];
  const seg = 72;
  for (let el = -10; el <= 80; el += 15) {
    const e = el * Math.PI / 180;
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
      pts.push(Math.cos(e) * Math.sin(a0) * RADIUS, Math.sin(e) * RADIUS, -Math.cos(e) * Math.cos(a0) * RADIUS);
      pts.push(Math.cos(e) * Math.sin(a1) * RADIUS, Math.sin(e) * RADIUS, -Math.cos(e) * Math.cos(a1) * RADIUS);
    }
  }
  for (let az = 0; az < 360; az += 30) {
    const a = az * Math.PI / 180;
    for (let el = -10; el < 85; el += 2.5) {
      const e0 = el * Math.PI / 180, e1 = (el + 2.5) * Math.PI / 180;
      pts.push(Math.cos(e0) * Math.sin(a) * RADIUS, Math.sin(e0) * RADIUS, -Math.cos(e0) * Math.cos(a) * RADIUS);
      pts.push(Math.cos(e1) * Math.sin(a) * RADIUS, Math.sin(e1) * RADIUS, -Math.cos(e1) * Math.cos(a) * RADIUS);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const m = new THREE.LineBasicMaterial({ color: 0x1a2140, transparent: true, opacity: .9 });
  return new THREE.LineSegments(g, m);
}
szene.add(kuppel());

// Horizontlinie: eine etwas hellere Linie bei 0°
{
  const pts = [], seg = 144;
  for (let i = 0; i < seg; i++) {
    const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
    pts.push(Math.sin(a0) * RADIUS, 0, -Math.cos(a0) * RADIUS, Math.sin(a1) * RADIUS, 0, -Math.cos(a1) * RADIUS);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  szene.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x26305a })));
}

// ---------------------------------------------------------------- Hintergrundstaub
{
  const n = 1400, p = new Float32Array(n * 3), s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const az = Math.random() * Math.PI * 2, el = Math.asin(Math.random() * 1.1 - 0.1);
    p[i * 3] = Math.cos(el) * Math.sin(az) * RADIUS * 1.6; p[i * 3 + 1] = Math.sin(el) * RADIUS * 1.6; p[i * 3 + 2] = -Math.cos(el) * Math.cos(az) * RADIUS * 1.6;
    s[i] = 0.6 + Math.random() * 1.6;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("groesse", new THREE.BufferAttribute(s, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uDpr: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float groesse; uniform float uDpr; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = groesse * uDpr; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `void main(){ vec2 c = gl_PointCoord - .5; float d = length(c); if(d>.5) discard; gl_FragColor = vec4(.78,.8,.95, (1.0-d*2.0)*.5); }`,
  });
  const staub = new THREE.Points(g, m); staub.renderOrder = -1; szene.add(staub);
  addEventListener("resize", () => { m.uniforms.uDpr.value = renderer.getPixelRatio(); });
}

// ---------------------------------------------------------------- Sterne
const sternTex = weicheScheibe(64, 1.0);
let sternPunkte, sternGeo, sternMat, haze = [], sternbildLinien, sternbildGeo;
const farbeVon = (id) => new THREE.Color(welt(id).farbe);

function sterneBauen(liste, pos, paare) {
  const n = liste.length;
  const p = new Float32Array(n * 3), col = new Float32Array(n * 3), gr = new Float32Array(n), ph = new Float32Array(n), hell = new Float32Array(n);
  liste.forEach((s, i) => {
    p.set([pos[i][0] * RADIUS, pos[i][1] * RADIUS, pos[i][2] * RADIUS], i * 3);
    const c = farbeVon(s.welt); col.set([c.r, c.g, c.b], i * 3);
    gr[i] = 1; ph[i] = hash01(s.id, 3) * Math.PI * 2; hell[i] = 1;
  });
  sternGeo = new THREE.BufferGeometry();
  sternGeo.setAttribute("position", new THREE.BufferAttribute(p, 3));
  sternGeo.setAttribute("farbe", new THREE.BufferAttribute(col, 3));
  sternGeo.setAttribute("groesse", new THREE.BufferAttribute(gr, 1));
  sternGeo.setAttribute("phase", new THREE.BufferAttribute(ph, 1));
  sternGeo.setAttribute("hell", new THREE.BufferAttribute(hell, 1));
  sternMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uZeit: { value: 0 }, uDpr: { value: renderer.getPixelRatio() }, uFunkeln: { value: ruhig.matches ? 0 : 1 }, uTex: { value: sternTex } },
    vertexShader: `
      attribute vec3 farbe; attribute float groesse; attribute float phase; attribute float hell;
      uniform float uZeit, uDpr, uFunkeln; varying vec3 vFarbe; varying float vKern, vHell;
      void main(){
        vFarbe = farbe; vHell = hell;
        float f = 1.0 + uFunkeln * 0.12 * sin(uZeit * (0.9 + fract(phase) * 1.4) + phase);
        float px = (3.0 + 27.0 * groesse) * f * uDpr;
        vKern = groesse;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = px; gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uTex; varying vec3 vFarbe; varying float vKern, vHell;
      void main(){
        vec2 c = gl_PointCoord - .5; float d = length(c) * 2.0; if (d > 1.0) discard;
        float halo = pow(1.0 - d, 2.4);
        float kern = smoothstep(0.26 + 0.12 * (1.0 - vKern), 0.0, d);
        vec3 col = mix(vFarbe, vec3(1.0), kern * 0.9);
        float a = (halo * (0.55 + 0.35 * vKern) + kern) * vHell;
        gl_FragColor = vec4(col * a, a);
      }`,
  });
  sternPunkte = new THREE.Points(sternGeo, sternMat);
  szene.add(sternPunkte);

  // Sternbilder: Linien zwischen Künstlern mit gemeinsamen Songs
  const index = new Map(liste.map((s, i) => [s.id, i]));
  const lp = [], lc = [];
  for (const { a, b, n: anzahl } of paare) {
    const i = index.get(a), j = index.get(b);
    if (i == null || j == null) continue;
    const cosW = pos[i][0] * pos[j][0] + pos[i][1] * pos[j][1] + pos[i][2] * pos[j][2];
    if (cosW < Math.cos(32 * Math.PI / 180)) continue; // keine Linien quer über den Himmel
    const c = farbeVon(liste[i].welt), k = Math.min(1, 0.35 + anzahl * 0.18);
    lp.push(pos[i][0] * RADIUS * .995, pos[i][1] * RADIUS * .995, pos[i][2] * RADIUS * .995, pos[j][0] * RADIUS * .995, pos[j][1] * RADIUS * .995, pos[j][2] * RADIUS * .995);
    lc.push(c.r * k, c.g * k, c.b * k, c.r * k, c.g * k, c.b * k);
  }
  sternbildGeo = new THREE.BufferGeometry();
  sternbildGeo.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
  sternbildGeo.setAttribute("color", new THREE.Float32BufferAttribute(lc, 3));
  sternbildLinien = new THREE.LineSegments(sternbildGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .42, blending: THREE.AdditiveBlending, depthWrite: false }));
  szene.add(sternbildLinien);

  // Galaxien-Haze
  const hazeTex = weicheScheibe(256, 3.2);
  for (const w of weltenZaehlung(liste)) {
    const r = galaxieRichtung(w.id);
    if (!r || !w.anzahl) continue;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: hazeTex, color: new THREE.Color(w.farbe), transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false }));
    const gr2 = RADIUS * (0.34 + 0.16 * Math.sqrt(w.anzahl / 10));
    sp.scale.set(gr2 * 1.25, gr2, 1);
    sp.position.set(r[0] * RADIUS * 1.08, r[1] * RADIUS * 1.08, r[2] * RADIUS * 1.08);
    sp.userData.welt = w.id; sp.userData.opazitaet = .3;
    sp.renderOrder = -1; szene.add(sp); haze.push(sp);
  }
}

// Zielgrößen für den gewählten Zeitraum und Weltfilter
function zieleSetzen() {
  const { sterne: liste, zeitraum, welt: w } = zustand;
  if (!zustand.groesseZiel) { zustand.groesseZiel = new Float32Array(liste.length); zustand.groesse = new Float32Array(liste.length).fill(0); zustand.hellZiel = new Float32Array(liste.length); }
  let max = 0;
  for (const s of liste) max = Math.max(max, s.je[zeitraum]);
  liste.forEach((s, i) => {
    const g = max ? s.je[zeitraum] / max : 0;
    const dabei = g > 0;
    const passt = !w || s.welt === w;
    const imFokus = zustand.fokus ? zustand.fokus.has(s.id) : null;
    let groesse = dabei ? 0.08 + 0.92 * Math.pow(g, 0.7) : 0.0;
    if (imFokus && !dabei && zustand.dunkelZeigen) groesse = 0.35; // Verblasste bleiben als dunkle Sterne sichtbar
    zustand.groesseZiel[i] = imFokus ? Math.max(groesse, 0.5) : groesse;
    zustand.hellZiel[i] = (dabei ? 1 : 0.22) * (passt ? 1 : 0.18) * (imFokus === false ? 0.3 : 1) * (imFokus && zustand.dunkelZeigen ? 0.55 : 1);
  });
  for (const sp of haze) sp.userData.ziel = (!w || sp.userData.welt === w) ? .3 : .06;
}

// ---------------------------------------------------------------- Labels (HTML über dem Canvas)
const labelEls = new Map(); // index → element
const galaxieEls = new Map();
const v3 = new THREE.Vector3();

const HIMMELSRICHTUNGEN = [["N", 0], ["O", 90], ["S", 180], ["W", 270]];
const richtungEls = [];
function labelsAnlegen(liste) {
  for (const [n, az] of HIMMELSRICHTUNGEN) {
    const el = document.createElement("span");
    el.className = "label richtung"; el.textContent = n; el.dataset.az = az;
    labelsEl.appendChild(el); richtungEls.push(el);
  }
  liste.forEach((s, i) => {
    const el = document.createElement("span");
    el.className = "label" + (i < 8 ? " hell" : "");
    el.textContent = s.name;
    el.style.color = i < 8 ? "" : "";
    labelsEl.appendChild(el); labelEls.set(i, el);
  });
  for (const w of weltenZaehlung(liste)) {
    if (!galaxieRichtung(w.id) || !w.anzahl) continue;
    const el = document.createElement("span");
    el.className = "label galaxie"; el.style.setProperty("--w", w.farbe);
    el.innerHTML = `${w.name}<small>${w.anzahl} Sterne</small>`;
    labelsEl.appendChild(el); galaxieEls.set(w.id, el);
  }
}

// Flächen, auf denen keine Labels liegen dürfen: Kartusche, Hinweise, sichtbare Tafeln
let sperrzonen = [];
function sperrzonenLesen() {
  const h = innerHeight;
  const els = [$("#kartusche"), $("#hinweis"), $("#weiter"), ...document.querySelectorAll(".tafel")];
  sperrzonen = [];
  for (const el of els) {
    if (!el || el.classList.contains("weg")) continue;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > h || r.width === 0) continue;
    sperrzonen.push([r.left - 12, r.top - 12, r.right + 12, r.bottom + 12]);
  }
}
function inSperrzone(x, y) {
  for (const z of sperrzonen) if (x > z[0] && x < z[2] && y > z[1] && y < z[3]) return true;
  return false;
}

function labelsZeichnen() {
  const w = innerWidth, h = innerHeight;
  sperrzonenLesen();
  const liste = zustand.sterne;
  const alle = ruhig.matches;
  const zeigbar = alle ? 60 : (w < 760 ? 14 : 28);
  let gezeigt = 0;
  const belegt = [];
  const haufen = new Map(); // welt → {minY, sumX, n}
  for (let i = 0; i < liste.length; i++) {
    const el = labelEls.get(i);
    const p = sichtbar2D[i];
    const istHover = i === zustand.hover;
    if (p && zustand.hellZiel[i] > 0.5 && zustand.groesse[i] > 0.05 && p[1] > 0 && p[1] < h && p[0] > 0 && p[0] < w) {
      const hf = haufen.get(liste[i].welt) || { minY: Infinity, sumX: 0, n: 0 };
      hf.minY = Math.min(hf.minY, p[1]); hf.sumX += p[0]; hf.n++; haufen.set(liste[i].welt, hf);
    }
    const sichtbar = p && p[0] > 10 && p[0] < w - 90 && p[1] > 20 && p[1] < h - 110 && !inSperrzone(p[0], p[1]) && !inSperrzone(p[0] + 90, p[1]);
    const imFokus = zustand.fokus ? zustand.fokus.has(liste[i].id) : false;
    let zeigen = sichtbar && (istHover || imFokus || (gezeigt < zeigbar && zustand.groesse[i] > 0.05 && zustand.hellZiel[i] > 0.5));
    if (zeigen && !istHover && !imFokus) {
      for (const b of belegt) if (Math.abs(b[1] - p[1]) < 17 && Math.abs(b[0] - p[0]) < 130) { zeigen = false; break; }
    }
    if (zeigen) {
      gezeigt++;
      belegt.push([p[0], p[1]]);
      const px = 3 + 13 * zustand.groesse[i];
      el.style.transform = `translate(${(p[0] + px * .5 + 4).toFixed(1)}px, ${p[1].toFixed(1)}px) translateY(-50%)`;
      el.style.opacity = istHover || imFokus ? 1 : (0.55 + 0.45 * zustand.groesse[i]);
      el.classList.toggle("aktiv", istHover || imFokus);
      el.classList.remove("aus");
    } else if (el.style.opacity !== "0") {
      el.style.opacity = 0; el.classList.add("aus");
    }
  }
  for (const el of richtungEls) {
    const a = +el.dataset.az * Math.PI / 180;
    v3.set(Math.sin(a) * RADIUS, 0, -Math.cos(a) * RADIUS).project(kamera);
    const x = (v3.x * .5 + .5) * w, y = (-v3.y * .5 + .5) * h;
    const ok = v3.z < 1 && x > 20 && x < w - 20 && y > 20 && y < h - 100 && !inSperrzone(x, y + 14);
    el.style.opacity = ok ? .8 : 0;
    if (ok) el.style.transform = `translate(${x.toFixed(1)}px, ${(y + 14).toFixed(1)}px) translate(-50%, 0)`;
  }
  for (const [id, el] of galaxieEls) {
    const hf = haufen.get(id);
    const x = hf ? Math.max(80, Math.min(w - 80, hf.sumX / hf.n)) : 0, y = hf ? Math.max(40, hf.minY - 26) : 0;
    const ok = hf && hf.n >= 3 && (!zustand.welt || zustand.welt === id) && hf.minY > 60 && !inSperrzone(x, y - 10) && !inSperrzone(x - 60, y - 10) && !inSperrzone(x + 60, y - 10);
    if (!ok) { el.style.opacity = 0; continue; }
    el.style.opacity = .9;
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
  }
}

// ---------------------------------------------------------------- Blick (Ziehen, Tasten, Drift, Hover)
let zieht = false, letztX = 0, letztY = 0, bewegt = 0;
const hinweis = $("#hinweis");
function blickBegrenzen() {
  zustand.zielPitch = Math.max(-0.12, Math.min(1.35, zustand.zielPitch));
}
cv.addEventListener("pointerdown", (e) => { zieht = true; bewegt = 0; letztX = e.clientX; letztY = e.clientY; cv.setPointerCapture(e.pointerId); zustand.drift = false; });
cv.addEventListener("pointermove", (e) => {
  if (zieht) {
    const dx = e.clientX - letztX, dy = e.clientY - letztY; letztX = e.clientX; letztY = e.clientY; bewegt += Math.abs(dx) + Math.abs(dy);
    const k = (kamera.fov / 60) * 0.0032;
    zustand.zielYaw += dx * k; zustand.zielPitch += dy * k; blickBegrenzen();
    if (bewegt > 30) hinweis.classList.add("weg");
  } else {
    hoverSuchen(e.clientX, e.clientY);
  }
});
const ziehEnde = () => { zieht = false; };
cv.addEventListener("pointerup", ziehEnde); cv.addEventListener("pointercancel", ziehEnde);
cv.addEventListener("pointerleave", () => { if (!zieht) { zustand.hover = -1; cv.classList.remove("zeigt"); } });
cv.addEventListener("keydown", (e) => {
  const s = e.shiftKey ? 0.3 : 0.1;
  if (e.key === "ArrowLeft") zustand.zielYaw += s; else if (e.key === "ArrowRight") zustand.zielYaw -= s;
  else if (e.key === "ArrowUp") zustand.zielPitch += s; else if (e.key === "ArrowDown") zustand.zielPitch -= s; else return;
  e.preventDefault(); blickBegrenzen(); zustand.drift = false; hinweis.classList.add("weg");
});
addEventListener("keydown", (e) => { if (e.key === "Tab") document.body.classList.add("tastatur"); }, { once: true });

const sichtbar2D = []; // [x,y,groesse] je Stern aus dem letzten Frame
function hoverSuchen(mx, my) {
  let beste = -1, bestD = 18 * 18;
  for (let i = 0; i < sichtbar2D.length; i++) {
    const p = sichtbar2D[i]; if (!p) continue;
    const d = (p[0] - mx) ** 2 + (p[1] - my) ** 2;
    const r = Math.max(10, 6 + 14 * p[2]);
    if (d < bestD && d < r * r) { bestD = d; beste = i; }
  }
  if (beste !== zustand.hover) { zustand.hover = beste; cv.classList.toggle("zeigt", beste >= 0); }
}

function projektionMerken() {
  const w = innerWidth, h = innerHeight, pos = zustand.pos;
  for (let i = 0; i < pos.length; i++) {
    v3.set(pos[i][0] * RADIUS, pos[i][1] * RADIUS, pos[i][2] * RADIUS).project(kamera);
    sichtbar2D[i] = v3.z < 1 ? [(v3.x * .5 + .5) * w, (-v3.y * .5 + .5) * h, zustand.groesse[i]] : null;
  }
}

// ---------------------------------------------------------------- Armaturenbrett
function brettBauen(liste) {
  const z = weltenZaehlung(liste);
  const leg = $("#legende");
  for (const w of z) {
    if (!w.anzahl) continue;
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button"; b.setAttribute("aria-pressed", "false"); b.dataset.welt = w.id; b.style.setProperty("--w", w.farbe);
    b.innerHTML = `<i aria-hidden="true"></i>${w.name} <b>${w.anzahl}</b>`;
    b.addEventListener("click", () => weltWaehlen(zustand.welt === w.id ? null : w.id));
    li.appendChild(b); leg.appendChild(li);
  }
  werteZeigen();
  $("#zeit").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-z]"); if (!b) return;
    zeitraumWaehlen(b.dataset.z);
  });
}
// Zahlen laufen wie ein Zähler auf den neuen Wert
const zaehler = new Map();
function zahlSetzen(el, ziel) {
  const von = zaehler.get(el) ?? ziel, start = performance.now(), dauer = ruhig.matches ? 0 : 420;
  zaehler.set(el, ziel);
  const schritt = (jetzt) => {
    const p = dauer ? Math.min(1, (jetzt - start) / dauer) : 1, e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(von + (ziel - von) * e);
    if (p < 1 && zaehler.get(el) === ziel) requestAnimationFrame(schritt);
  };
  requestAnimationFrame(schritt);
}
/** Sterne, Welten und Sternbilder, die im gewählten Zeitraum wirklich leuchten. */
function werteZeigen() {
  const z = zustand.zeitraum, liste = zustand.sterne;
  const aktiv = new Set(liste.filter((s) => s.je[z] > 0).map((s) => s.id));
  const welten = new Set(liste.filter((s) => aktiv.has(s.id) && s.welt !== "streulicht").map((s) => s.welt));
  const bilder = zustand.paare.filter((p) => aktiv.has(p.a) && aktiv.has(p.b)).length;
  zahlSetzen($("#w-sterne"), aktiv.size);
  zahlSetzen($("#w-welten"), welten.size);
  zahlSetzen($("#w-songs"), bilder);
  const jeWelt = new Map();
  for (const s of liste) if (aktiv.has(s.id)) jeWelt.set(s.welt, (jeWelt.get(s.welt) || 0) + 1);
  for (const b of document.querySelectorAll("#legende button")) {
    const n = jeWelt.get(b.dataset.welt) || 0;
    zahlSetzen(b.querySelector("b"), n);
    b.classList.toggle("leer", n === 0);
  }
}
function zeitraumWaehlen(z) {
  if (!ZEITRAEUME.includes(z)) return;
  zustand.zeitraum = z;
  if (zustand.sterne.length) werteZeigen();
  const idx = ZEITRAEUME.indexOf(z);
  $("#zeit .cursor").style.transform = `translateX(${idx * 100}%)`;
  for (const b of document.querySelectorAll("#zeit button")) b.setAttribute("aria-pressed", String(b.dataset.z === z));
  zieleSetzen();
}
function weltWaehlen(id) {
  zustand.welt = id;
  const leg = $("#legende");
  leg.classList.toggle("gefiltert", !!id);
  for (const b of leg.querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.welt === id));
  zieleSetzen();
  if (id) {
    const r = galaxieRichtung(id);
    if (r) { zustand.zielYaw = -Math.atan2(r[0], -r[2]); zustand.zielPitch = Math.asin(r[1]); zustand.drift = false; }
  }
}

// ---------------------------------------------------------------- Schleife
const uhr = new THREE.Clock();
let laeuft = true, letzteAnzeige = -1;
document.addEventListener("visibilitychange", () => { laeuft = !document.hidden; if (laeuft) { uhr.getDelta(); tick(); } });
const blickEl = $("#m-blick");

function tick() {
  if (!laeuft) return;
  requestAnimationFrame(tick);
  const dt = Math.min(uhr.getDelta(), 0.05);
  const t = uhr.elapsedTime;
  if ((zustand.drift || zustand.pan) && !ruhig.matches) { zustand.zielYaw -= dt * (zustand.pan ? 0.05 : 0.012); }
  // träge Kamera: exponentielles Nachziehen
  const k = ruhig.matches ? 1 : 1 - Math.exp(-dt * 4.2);
  zustand.yaw += (zustand.zielYaw - zustand.yaw) * k;
  zustand.pitch += (zustand.zielPitch - zustand.pitch) * k;
  kamera.rotation.set(0, 0, 0);
  kamera.rotateY(zustand.yaw);
  kamera.rotateX(zustand.pitch);

  if (sternGeo) {
    const g = sternGeo.attributes.groesse.array, hl = sternGeo.attributes.hell.array;
    const kg = ruhig.matches ? 1 : 1 - Math.exp(-dt * 5);
    let dirty = false;
    for (let i = 0; i < g.length; i++) {
      const zg = zustand.groesseZiel[i] * (i === zustand.hover ? 1.25 : 1), zh = zustand.hellZiel[i];
      if (Math.abs(g[i] - zg) > 0.001 || Math.abs(hl[i] - zh) > 0.001) {
        g[i] += (zg - g[i]) * kg; hl[i] += (zh - hl[i]) * kg; dirty = true;
      }
      zustand.groesse[i] = g[i];
    }
    if (dirty) { sternGeo.attributes.groesse.needsUpdate = true; sternGeo.attributes.hell.needsUpdate = true; }
    sternMat.uniforms.uZeit.value = t;
    for (const sp of haze) sp.material.opacity += ((sp.userData.ziel ?? .3) - sp.material.opacity) * kg;
    if (sternbildLinien) sternbildLinien.material.opacity += (((zustand.welt ? .18 : .42)) - sternbildLinien.material.opacity) * kg;
    projektionMerken();
    labelsZeichnen();
  }
  renderer.render(szene, kamera);
  if (t - letzteAnzeige > 0.15) {
    letzteAnzeige = t;
    const az = Math.round(((-zustand.yaw * 180 / Math.PI) % 360 + 360) % 360), ho = Math.round(zustand.pitch * 180 / Math.PI);
    blickEl.textContent = `Az ${az}° · Hö ${ho}°`;
  }
}

// ---------------------------------------------------------------- Kapitel (Scroll steuert den Himmel)
function blickAuf(weltId) {
  const r = galaxieRichtung(weltId);
  if (!r) return;
  zustand.zielYaw = -Math.atan2(r[0], -r[2]); zustand.zielPitch = Math.asin(r[1]) - 0.02; zustand.drift = false;
}
function kapitelAnwenden(k) {
  if (!k) { // zurück am Himmel: freier Blick
    zustand.fokus = null; zustand.dunkelZeigen = false; zustand.pan = false;
    weltWaehlen(null); zeitraumWaehlen("1y"); zieleSetzen();
    return;
  }
  const st = k.steuer;
  zustand.fokus = st.fokus ? new Set(st.fokus) : null;
  zustand.dunkelZeigen = !!st.dunkelZeigen;
  zustand.pan = !!st.pan;
  zeitraumWaehlen(st.zeitraum);
  weltWaehlen(st.welt || null);
  if (st.blick) blickAuf(st.blick);
  else if (st.fokus && st.fokus.length) {
    const m = [0, 0, 0];
    for (const id of st.fokus) { const i = zustand.sterne.findIndex((s) => s.id === id); if (i >= 0) { m[0] += zustand.pos[i][0]; m[1] += zustand.pos[i][1]; m[2] += zustand.pos[i][2]; } }
    const l = Math.hypot(...m);
    if (l > 0.01) { zustand.zielYaw = -Math.atan2(m[0] / l, -m[2] / l); zustand.zielPitch = Math.asin(m[1] / l) - 0.02; zustand.drift = false; }
  }
  zieleSetzen();
}
function kapitelVerdrahten(kapitel) {
  const main = $("#rueckblick"), weiter = $("#weiter"), fluss = $("#fluss");
  const abschnitte = [...main.querySelectorAll(".kapitel")];
  fluss.innerHTML = kapitel.map((k) => `<a href="#k-${k.id}"><span>${k.titel.replace(/\.$/, "")}</span></a>`).join("");
  const punkte = [...fluss.querySelectorAll("a")];
  let aktiv = -1;
  const setzen = (i) => {
    if (i === aktiv) return;
    aktiv = i;
    kapitelAnwenden(i >= 0 ? kapitel[i] : null);
    punkte.forEach((p, j) => p.toggleAttribute("aria-current", j === i) || (j === i ? p.setAttribute("aria-current", "true") : p.removeAttribute("aria-current")));
    fluss.classList.toggle("da", i >= 0);
    weiter.classList.toggle("weg", i >= 0 || scrollY > 40);
    hinweis.classList.toggle("weg", i >= 0 || hinweis.classList.contains("weg"));
  };
  const io = new IntersectionObserver((eintraege) => {
    // das Kapitel, das die Bildmitte schneidet, gewinnt
    let best = -1, bestR = 0;
    for (const a of abschnitte) {
      const r = a.getBoundingClientRect();
      const mitte = innerHeight * 0.5;
      if (r.top < mitte && r.bottom > mitte) { best = +a.dataset.i; break; }
      const sicht = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / innerHeight;
      if (sicht > bestR) { bestR = sicht; }
    }
    setzen(best);
  }, { threshold: [0, .25, .5, .75, 1] });
  abschnitte.forEach((a) => io.observe(a));
  addEventListener("scroll", () => { weiter.classList.toggle("weg", scrollY > 40 || aktiv >= 0); }, { passive: true });
}

// ---------------------------------------------------------------- Start
async function start() {
  let snap;
  try {
    const r = await fetch("data/snapshot.json", { cache: "no-cache" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    snap = await r.json();
  } catch (e) {
    status.textContent = "Der Schnappschuss ließ sich nicht laden (" + (e.message || e) + "). Seite neu laden hilft meistens.";
    status.classList.add("fehler");
    return;
  }
  const liste = sterne(snap), pos = positionen(liste), paare = sternbilder(snap);
  zustand.sterne = liste; zustand.pos = pos; zustand.paare = paare;
  sterneBauen(liste, pos, paare);
  labelsAnlegen(liste);
  brettBauen(liste);
  zieleSetzen();
  $("#m-stand").textContent = new Date(snap.erstellt).toLocaleDateString("de-AT", { day: "numeric", month: "short", year: "numeric" });
  status.textContent = "";
  // Startblick: auf die größte Galaxie
  const r = galaxieRichtung("deutschrap");
  zustand.yaw = zustand.zielYaw = -Math.atan2(r[0], -r[2]); zustand.pitch = zustand.zielPitch = Math.asin(r[1]) - 0.02;
  zeitraumWaehlen(zustand.zeitraum);
  const kapitel = kapitelBauen($("#rueckblick"), snap, liste, null);
  kapitelVerdrahten(kapitel);
  tick();
}
ruhig.addEventListener?.("change", () => { if (sternMat) sternMat.uniforms.uFunkeln.value = ruhig.matches ? 0 : 1; });
start();
