import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tx, spracheSetzen } from "../public/texte.js";

test("WebGL-Fallback: Hinweistext in beiden Sprachen", () => {
  for (const code of ["de", "en"]) {
    spracheSetzen(code);
    const t = tx().ui.keinWebgl;
    assert.equal(typeof t, "string", code);
    assert.ok(t.length > 20, code);
  }
  spracheSetzen("de");
});

test("WebGL-Fallback: app.js schützt den Renderer und behandelt Kontextverlust", () => {
  const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
  assert.match(app, /try\s*{\s*return new THREE\.WebGLRenderer/);
  assert.match(app, /webglcontextlost/);
  assert.match(app, /webglcontextrestored/);
  assert.match(app, /kein-webgl/);
});

test("WebGL-Fallback: Standbild existiert und CSS zeigt darauf", () => {
  const css = readFileSync(new URL("../public/style.css", import.meta.url), "utf8");
  const m = css.match(/\.kein-webgl \.himmel[^}]*url\("([^"]+)"\)/);
  assert.ok(m, "CSS-Regel fehlt");
  assert.ok(readFileSync(new URL("../public/" + m[1], import.meta.url)).length > 0);
});
