import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const WURZEL = new URL("..", import.meta.url);

test("Sammler: Python-Tests (Privatsphäre ohne Uhrzeiten)", (t) => {
  if (spawnSync("python3", ["--version"]).error) return t.skip("python3 nicht vorhanden");
  const r = spawnSync("python3", ["-m", "unittest", "discover", "-s", "test", "-p", "*_test.py"], { cwd: WURZEL, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
