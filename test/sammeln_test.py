"""Tests für tools/sammeln.py: nur Standardbibliothek, kein Netz, nur erfundene Daten."""
import importlib.util
import json
import os
import tempfile
import unittest
from unittest import mock

PFAD = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools", "sammeln.py")
spec = importlib.util.spec_from_file_location("sammeln", PFAD)
sammeln = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sammeln)

GEHOERT_UM = "2099-01-01T03:04:05Z"


def _track(i="t1", album=None):
    return {"id": i, "name": "Lied " + i, "artists": [{"id": "a1", "name": "Band A"}],
            "album": album if album is not None else {"name": "Album", "release_date": "2020-05-01",
                                                      "images": [{"url": "http://x/groß", "width": 640}]},
            "duration_ms": 1000, "external_urls": {"spotify": "http://x/" + i}}


def _spotify_attrappe(pfad, **params):
    if pfad == "/me/player/recently-played":
        return {"items": [{"track": _track("t2"), "played_at": GEHOERT_UM}]}
    if pfad == "/me/top/artists":
        return {"items": [{"id": "a1", "name": "Band A", "images": [], "external_urls": {"spotify": "http://x/a1"}}]}
    if pfad == "/me/top/tracks":
        return {"items": [_track("t1")]}
    raise AssertionError("unerwarteter Pfad " + pfad)


def _sammeln(**kw):
    with mock.patch.object(sammeln, "spotify", side_effect=_spotify_attrappe), \
            mock.patch.object(sammeln, "_json", side_effect=AssertionError("kein Netz")), \
            mock.patch.object(sammeln, "ueberschreibungen_anwenden"), \
            mock.patch("builtins.print"):
        return sammeln.sammeln(mit_mb=False, **kw)


class Privatsphaere(unittest.TestCase):
    def test_standard_ohne_uhrzeiten(self):
        out = _sammeln()
        self.assertEqual(len(out["zuletzt"]), 1)
        for e in out["zuletzt"]:
            self.assertIsNone(e["um"])
        self.assertNotIn(GEHOERT_UM, json.dumps(out))

    def test_explizit_ohne_uhrzeiten(self):
        out = _sammeln(mit_zeiten=False)
        self.assertTrue(all(e["um"] is None for e in out["zuletzt"]))
        self.assertNotIn(GEHOERT_UM, json.dumps(out))

    def test_mit_zeiten(self):
        out = _sammeln(mit_zeiten=True)
        self.assertEqual(out["zuletzt"][0]["um"], GEHOERT_UM)


class Bild(unittest.TestCase):
    def test_leere_liste(self):
        self.assertIsNone(sammeln._bild([]))

    def test_kleinstes_ab_160(self):
        bilder = [{"url": "gross", "width": 640}, {"url": "mittel", "width": 300}, {"url": "klein", "width": 64}]
        self.assertEqual(sammeln._bild(bilder), "mittel")

    def test_alle_zu_klein_nimmt_letztes(self):
        self.assertEqual(sammeln._bild([{"url": "a", "width": 64}, {"url": "b", "width": 32}]), "b")


class Track(unittest.TestCase):
    def test_ohne_datum_und_bilder(self):
        t = sammeln._track(_track(album={"name": "Nur Name"}))
        self.assertIsNone(t["erschienen"])
        self.assertIsNone(t["cover"])
        self.assertEqual(t["album"], "Nur Name")

    def test_ohne_link(self):
        roh = _track()
        roh["external_urls"] = {}
        self.assertIsNone(sammeln._track(roh)["url"])

    def test_vollstaendig(self):
        t = sammeln._track(_track())
        self.assertEqual(t["erschienen"], "2020-05-01")
        self.assertEqual(t["cover"], "http://x/groß")
        self.assertEqual(t["kuenstler"], [{"id": "a1", "name": "Band A"}])


class Ueberschreibungen(unittest.TestCase):
    def _anwenden(self, ueb, kuenstler):
        with tempfile.TemporaryDirectory() as d:
            if ueb is not None:
                os.makedirs(os.path.join(d, "data"))
                with open(os.path.join(d, "data", "ueberschreibungen.json"), "w") as f:
                    json.dump(ueb, f)
            with mock.patch.object(sammeln, "WURZEL", d):
                sammeln.ueberschreibungen_anwenden(kuenstler)
        return kuenstler

    def test_ohne_datei_unveraendert(self):
        k = {"a": {"name": "X", "tags": ["rock"]}}
        self._anwenden(None, k)
        self.assertEqual(k["a"]["tags"], ["rock"])

    def test_setzt_tags_fuer_kuenstler_ohne_tags(self):
        k = {"a": {"name": "X", "tags": [], "land": None}}
        self._anwenden({"X": {"tags": ["pop"], "land": "AT"}}, k)
        self.assertEqual(k["a"]["tags"], ["pop"])
        self.assertEqual(k["a"]["land"], "AT")

    def test_fremde_kuenstler_bleiben(self):
        k = {"a": {"name": "X", "tags": ["rock"]}, "b": {"name": "Y"}}
        self._anwenden({"X": {"tags": ["pop"]}}, k)
        self.assertEqual(k["b"], {"name": "Y"})

    def test_fehlende_felder_behalten_alten_wert(self):
        k = {"a": {"name": "X", "tags": ["rock"], "land": "DE"}}
        self._anwenden({"X": {"land": "AT"}}, k)
        self.assertEqual(k["a"]["tags"], ["rock"])
        self.assertEqual(k["a"]["land"], "AT")


if __name__ == "__main__":
    unittest.main()
