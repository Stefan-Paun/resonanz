import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sterne, sternbilder, positionen, weltenZaehlung, hash01, gewichtIn, galaxieRichtung, dauerText, ZEITRAEUME } from "../public/daten.js";

const snap = JSON.parse(readFileSync(new URL("../data/snapshot.json", import.meta.url), "utf8"));

test("hash01 ist deterministisch und liegt in [0,1)", () => {
  assert.equal(hash01("abc"), hash01("abc"));
  assert.notEqual(hash01("abc"), hash01("abd"));
  assert.notEqual(hash01("abc", 1), hash01("abc", 2));
  for (const t of ["a", "Capital Bra", "", "🎵"]) {
    const v = hash01(t);
    assert.ok(v >= 0 && v < 1, t);
  }
});

test("Gewicht: Platz 1 ist schwerer als Platz 50, nicht Gehörtes ist 0", () => {
  const z = snap.zeitraeume["1y"];
  const erster = gewichtIn("1y", z.kuenstler[0], snap);
  const letzter = gewichtIn("1y", z.kuenstler[z.kuenstler.length - 1], snap);
  assert.ok(erster > letzter);
  assert.equal(gewichtIn("1y", "gibt-es-nicht", snap), 0);
  assert.equal(gewichtIn("gibt-es-nicht", z.kuenstler[0], snap), 0);
});

test("Sterne: alle Künstler, hellster zuerst, Gewicht normiert auf 1", () => {
  const s = sterne(snap);
  assert.equal(s.length, Object.keys(snap.kuenstler).length);
  assert.equal(s[0].gewicht, 1);
  for (let i = 1; i < s.length; i++) assert.ok(s[i - 1].gewicht >= s[i].gewicht);
  for (const st of s) {
    assert.ok(st.name && st.welt && st.je, st.id);
    for (const z of ZEITRAEUME) assert.ok(st.je[z] >= 0);
    assert.ok(st.gewicht >= 0 && st.gewicht <= 1);
  }
  const top = s.slice(0, 10).map((x) => x.name);
  assert.ok(top.includes("Capital Bra") || top.includes("Samra") || top.includes("Sido"), top.join(", "));
});

test("Songs hängen am richtigen Künstler, ohne Doppelte", () => {
  const s = sterne(snap);
  const cb = s.find((x) => x.name === "Capital Bra");
  assert.ok(cb.songs.length > 0);
  assert.equal(new Set(cb.songs.map((x) => x.id)).size, cb.songs.length);
  for (const song of cb.songs) assert.ok(song.kuenstler.some((k) => k.id === cb.id));
});

test("Sternbilder: Feature-Paare, Capital Bra und Samra sind verbunden", () => {
  const sb = sternbilder(snap);
  assert.ok(sb.length > 20);
  const s = sterne(snap);
  const id = (n) => s.find((x) => x.name === n).id;
  const paar = sb.find((p) => [p.a, p.b].includes(id("Capital Bra")) && [p.a, p.b].includes(id("Samra")));
  assert.ok(paar && paar.n >= 3, JSON.stringify(paar));
  for (const p of sb) assert.ok(p.a < p.b, "sortiert");
});

test("Positionen: Einheitsvektoren, Galaxien liegen beisammen, nichts unter dem Horizont", () => {
  const s = sterne(snap);
  const p = positionen(s);
  assert.equal(p.length, s.length);
  for (const v of p) {
    const l = Math.hypot(...v);
    assert.ok(Math.abs(l - 1) < 1e-9);
    assert.ok(v[1] > -0.12, "zu tief: " + v[1]);
  }
  const mitte = galaxieRichtung("deutschrap");
  const winkelZu = (v, m) => Math.acos(Math.max(-1, Math.min(1, v[0] * m[0] + v[1] * m[1] + v[2] * m[2]))) * 180 / Math.PI;
  const dr = s.map((st, i) => [st, p[i]]).filter(([st]) => st.welt === "deutschrap");
  assert.ok(dr.length > 10);
  const maxAbstand = Math.max(...dr.map(([, v]) => winkelZu(v, mitte)));
  assert.ok(maxAbstand < 40, "Deutschrap streut zu weit: " + maxAbstand);
  // der hellste Deutschrap-Stern liegt näher an der Mitte als der dunkelste
  assert.ok(winkelZu(dr[0][1], mitte) < winkelZu(dr[dr.length - 1][1], mitte));
});

test("Positionen sind bei zweimaligem Rechnen identisch", () => {
  const s = sterne(snap);
  assert.deepEqual(positionen(s), positionen(s));
});

test("Weltenzählung summiert auf alle Sterne, Deutschrap ist die größte Galaxie", () => {
  const s = sterne(snap);
  const z = weltenZaehlung(s);
  assert.equal(z.reduce((a, w) => a + w.anzahl, 0), s.length);
  const groesste = [...z].sort((a, b) => b.anzahl - a.anzahl)[0];
  assert.equal(groesste.id, "deutschrap");
});

test("dauerText", () => {
  assert.equal(dauerText(127071), "2:07");
  assert.equal(dauerText(60000), "1:00");
  assert.equal(dauerText(5000), "0:05");
});
