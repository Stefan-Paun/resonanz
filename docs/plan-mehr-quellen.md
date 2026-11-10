# Plan: Mehr Quellen für den eigenen Himmel

Ziel: Neben dem Spotify-Verlauf-ZIP lassen sich Apple Music (Play-Activity-CSV), Last.fm (CSV/JSON) und
YouTube Music (`watch-history.json` aus Takeout) hineinziehen. Alles lokal im Browser, keine Netzanfragen.

## Zwischenformat
`{ t (ms UTC), kuenstler, titel, album|null, ms|null, uebersprungen|null, quelle }`. `verlauf.js` rechnet damit
(`ms` fehlt → pauschal 3,5 Minuten, damit Hörzeit-Kapitel nicht leer bleiben).

## Etappen
1. Kern: `quellen/csv.js` (eigener CSV-Leser), `quellen/format.js` (Zwischenformat, Grenzen), Spotify auf das Format abgebildet. Tests.
2. Leser `quellen/apple.js`, `quellen/lastfm.js`, `quellen/youtube.js` mit erfundenen Fixtures in `test/fixtures/`. Tests.
3. `quellen/erkennen.js`: Quelle am Inhalt erkennen, Portionen + Fortschritt, Grenzen, verständliche Meldungen. Tests.
4. Welt-Zuordnung über bekannte Künstler des Himmels, sonst „unbekannt“ (`quellen/welten.js`). Tests.
5. Oberfläche: Datei-Dialog (`eigener.js`), Hilfetexte de/en (`texte.js`), README.

## Tests
`npm test` (node --test). Je Leser: normale Datei, fehlende Spalten, kaputte Zeilen, leere Datei, lange Felder.
Spotify-Weg: gleiches Ergebnis wie vorher.

## Nicht dazu
Anmeldung bei den Diensten, Netzanfragen, echte Exportdateien, Genre-Abfragen für neue Künstler.
