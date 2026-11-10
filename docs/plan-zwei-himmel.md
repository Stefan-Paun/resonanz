# Plan: Zwei Himmel vergleichen

Ziel: Zwei Menschen legen ihre Sternenhimmel übereinander. Gemeinsame Künstler leuchten in einer dritten Farbe, dazu kommen eine Übereinstimmungs-Zahl und kurze Listen. Alles passiert lokal im Browser.

## Etappen

1. **Austauschformat** (`public/austausch.js`, `test/austausch.test.mjs`): Export einer kleinen JSON-Datei (Version 1) mit nur Aggregiertem; strenger Import mit Grenzen und Zulassungsliste. Tests mit erfundenen Profilen.
2. **Vergleich als reines Modul** (`public/vergleich.js`, `test/vergleich.test.mjs`): Namens-Normalisierung, Zuordnung (Kennung, ersatzweise Name), Kosinus über Künstler und Genres, Listen gemeinsam / nur A / nur B / Brücken, Zusammenführen zu einem Schnappschuss.
3. **Darstellung** (`app.js`, `kapitel.js`, `style.css`): Vergleichsmodus mit drei Farben und drei Formen (Kreis A, Raute B, Quadrat beide), Legende, Umschalter A/B/beide, Kapitel „Ihr zwei“, Rückweg ohne Neuladen.
4. **Dialog und Texte** (`public/vergleich-ui.js`, `eigener.js`, `texte.js`): Export-Knopf, Datei laden, „merken“ (sonst nur im Speicher), Texte de/en.
5. **Doku**: README-Abschnitt.

## Getestet wird
Nur Node-Tests ohne DOM: Feldliste des Exports gegen Zulassungsliste, Import (kaputt, übergroß, bösartig), Vergleich (identisch = 100 %, disjunkt = 0 %, Symmetrie), Normalisierung. Die Oberfläche ist nur gelesen/auf Syntax geprüft, nicht im Browser gesehen.

## Bewusst nicht dabei
Kein Server, kein Hochladen, kein Teilen-Link, keine echten Hördaten im Repo.

## Stand
Etappen 1–5 sind gebaut und per Node-Tests abgesichert (60 Tests grün). Dateien: `public/austausch.js`, `public/vergleich.js`, `public/vergleich-ui.js`, Änderungen in `app.js`, `kapitel.js`, `eigener.js`, `texte.js`, `style.css`, README (en/de).

Entscheidungen: A = der gerade gezeigte eigene Himmel; die Übereinstimmung ist der Mittelwert aus Künstler- und Genre-Kosinus; Formen Kreis (nur A), Raute (nur B), Quadrat (beide), Farben aus der Weltenpalette; im Vergleich zeigt der Rückblick nur „Welten“, „Ihr zwei“ und den Schluss. Eine gemerkte Datei wird bei jedem Lesen erneut geprüft.

Offen: Die Oberfläche (Shader-Formen, Legende, Umschalter, Dialog-Abschnitt, Layout auf dem Handy) wurde nicht im Browser angesehen.
