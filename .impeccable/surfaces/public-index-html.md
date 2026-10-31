---
version: 1
slug: "public-index-html"
primary_target: "public/index.html"
related_targets: ["public/app.js","public/style.css"]
---

# Surface brief: public/index.html (Startseite = die Szene)

## Scope und Modus

Experience. Die Szene ist das Werk; die Oberfläche tritt zurück. Startseite der öffentlichen Demo mit Stefans Schnappschuss, später dieselbe Seite mit eigenem Konto oder Export.

## Publikum, Aufgabe, Inhalt

Stefan abends am MacBook oder am iPhone, zeigt Freunden seine Musik. Aufgabe: sich wiedererkennen, herumschauen, staunen, dann weiterscrollen in den Rückblick. Inhalt: 203 Künstler in 8 Hörwelten (+ Streulicht), 150 Top-Songs in drei Zeiträumen, 50 zuletzt gehörte Songs, Herkunftsländer. Kein Anzeigename, keine Playlists.

## Gewürfelte Runde (Impeccable, Seed 7be285f4, Index 3)

Eigene Liste nach Resonanz: 1 Nachtfahrt-Armaturen (vom Brief gepinnt), 2 Wiener U-Bahn-Netz bei Nacht, **3 Himmelsatlas / Planetarium (zugewiesen)**, 4 Sperrbildschirm um 2 Uhr früh, 5 Club-Lichtanlage, 6 Taktik-Radar, 7 Rap-Plakat.
Pin aus dem Brief (Nacht-Fahrt) bleibt als Material erhalten: Bernstein- und Rotlicht der Armaturen, das Astronomen wie Autofahrer nutzen, um die Dunkeladaption zu schützen. Eine Welt trägt die Seite: der Himmelsatlas.
Herausforderer: Nachtmarkt-Laternenfluss (abgelehnt; Raise „Laternenfluss“: ein durchgehender Pfad trägt durch alle Kapitel), Toyismus-Platte (abgelehnt; Raise „Feste Palette“: acht Weltfarben, keine Verläufe in der Bedienebene), Schmiede-Zunderregen (abgelehnt; Raise „Ein Schlag pro Zeile“: jede Zahl steht gemessen, tabellarisch, mit Linie), Azulejo-Bahnhofshalle (abgelehnt; Raise „Ganze Kacheln“: Layout rastet auf das Himmelsgitter), Risograph (abgelehnt; Raise „Gedruckte Karte“: reduced-motion ist eine fertige zweite Darstellung, kein Abschalten), Drum-Machine-Schrittreihe (konkurrenzfähig, Publikum ja; Raise „Lauflicht“: ein Zeitcursor zeigt immer, welcher Zeitraum gerade gilt).

## Direction contract

THESIS: Hörgewohnheiten als Himmelsatlas, den man durch die Windschutzscheibe einer Nachtfahrt sieht: Sterne nach Hörgewicht, Galaxien nach Hörwelt, Sternbilder aus gemeinsamen Songs. Verweigert: die Wrapped-Karte mit Verlauf und großer Zahl, und die Balken-Rangliste.

OWN-WORLD: Grund Tiefindigo (#070914) statt Schwarz, Himmelsgitter in #1a2140 als feine Kuppel. Sterne weiß mit Weltfarbe im Halo (acht feste Farben aus welten.js, Streulicht grau). Eine Bedienfarbe: Armaturen-Bernstein (#ffb454) für Aktives und Cursor, Messwerte in Rotlicht (#ff5a3c) nur für Zahlen. Schrift: Bricolage Grotesque (Titel, Labels, enge Breite) und Azeret Mono (Koordinaten, Zahlen, tabellarisch). Linien 1 px, Ecken eckig, keine Glasflächen, keine Verläufe außer dem Horizontglühen unten. Kartuschen (Titelblock) mit dünnem Rahmen wie auf gedruckten Sternkarten.

STORY: „Das ist mein Himmel.“ Der Besucher sieht sofort acht farbige Sternhaufen mit Namen, erkennt Deutschrap als größte Galaxie, zieht mit der Maus den Blick, liest Labels, versteht die Legende unten als Armaturenbrett, scrollt und fährt in den Rückblick.

FIRST VIEWPORT: Vollbild-Szene ab Pixel 0. Oben links Kartusche „Resonanz — Himmelsatlas meiner Musik, Stand 31. Okt 2026, Quelle Spotify + MusicBrainz“ (klein, gerahmt). Mitte: der Himmel mit ~200 Sternen, Galaxie-Haze, Sternbildlinien, 24 Labels der hellsten Sterne, Himmelsgitter. Unten über die volle Breite das Armaturenbrett: links Zeitraum-Schalter 4 W · 6 M · 1 J (Lauflicht-Cursor in Bernstein), Mitte Legende der acht Welten als beleuchtete Beschriftungen mit Sternanzahl, rechts Messwerte „203 Sterne · 8 Welten · 150 Songs“ in Rotlicht-Mono. Vom Brettrand steigt Bernstein-Glühen ein paar hundert Pixel hoch (Armaturenlicht auf der Scheibe). Unten rechts: „Scrollen für den Rückblick ↓“. Primäre Handlung: Blick ziehen (Drag) und Scrollen.

FORM: Himmelsatlas / Planetarium, Platz 3 der eigenen Liste, Seed 7be285f4. Signatur-Interaktion „Blick heben“: Drag dreht den Himmel träge nach, Scroll fliegt zur nächsten Galaxie, der Cursor im Armaturenbrett läuft mit. Motion-Grammatik: langsame Drift, Funkeln im Shader, Easing träge wie eine schwere Kamera; reduced-motion = gedruckte Karte (statisch, alle Labels, Legende voll).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Offen

- Cover-Bilder nur auf Antippen (Teil 4).
- Englische Oberfläche (Teil 7).
