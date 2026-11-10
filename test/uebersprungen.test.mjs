import test from "node:test";
import assert from "node:assert/strict";
import { tx, spracheSetzen } from "../public/texte.js";

test("Hinweis zu übersprungenen Dateien existiert in DE und EN", () => {
  for (const l of ["de", "en"]) {
    spracheSetzen(l);
    const f = tx().eigener?.uebersprungen;
    assert.equal(typeof f, "function", l);
    assert.match(f(1), /1/); assert.match(f(3), /3/);
  }
  spracheSetzen("de");
});
