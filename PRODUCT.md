# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: statisches HTML/CSS/JS ohne Build-Schritt, three.js gepinnt von einem CDN, Daten als JSON. Begründung: passt zu Stefans anderen Projekten (Agent-Board, Nachtschule), läuft direkt auf GitHub Pages, und jeder kann den Code ohne Werkzeugkette lesen und forken.

## Users

Stefan selbst (17, Wien): schaut seine eigene Musik an, am MacBook abends und am iPhone zwischendurch, und zeigt sie Freunden. Zweitrangig: Besucher aus dem Portfolio (Recruiter, andere Entwickler) und Leute, die den Code mit ihrem eigenen Spotify-Konto oder Streaming-Export benutzen wollen.

## Product Purpose

Resonanz macht Hörgewohnheiten begehbar: Spotify-Daten werden zu einem Sternenhimmel, in dem jeder Künstler ein Stern und jede Hörwelt eine Galaxie ist, mit einem eigenen Rückblick beim Scrollen. Erfolg heißt: Stefan erkennt sich wieder, zeigt die Seite freiwillig her, und sie bleibt im Kopf, anders als ein Balkendiagramm oder Spotify Wrapped.

## Positioning

Kein Jahresrückblick, den ein Konzern für einen rechnet, sondern ein eigener, lokal gerechneter, der die Daten als Raum zeigt statt als Liste. Alles läuft im Browser, nichts wird hochgeladen; der Nutzer behält seine Daten.

## Operating Context

- Datenquelle 1: Spotify Web API im Development Mode (Top-Künstler/-Songs für 4 Wochen, 6 Monate, 1 Jahr; letzte 50 Songs). Seit Februar 2026 ohne Genres, Popularität, Vorschauen; App-Besitzer braucht Premium, maximal 5 Testnutzer.
- Datenquelle 2: MusicBrainz (frei) für Genre-Tags und Herkunftsland; Deezer (frei) für 30-Sekunden-Vorschauen, wenn vorhanden.
- Datenquelle 3 (geplant): Spotifys „Erweiterter Streaming-Verlauf“ als ZIP/JSON, vom Nutzer angefordert, im Browser per Drag & Drop eingelesen.
- Öffentliche Demo zeigt einen eingefrorenen Schnappschuss von Stefans Daten (`data/snapshot.json`).
- Veröffentlichung über GitHub Pages, verlinkt von stefanpaun.page.

## Capabilities and Constraints

- Acht Hörwelten (Deutschrap, Rap & Hip-Hop, Nacht & R&B, Phonk & Tekkno, Latino, Rock & Klassiker, Pop, Fokus & Lo-fi) plus „Streulicht“ für Unzuordenbares; Zuordnung in `public/welten.js`, mit Tests.
- Keine npm-Abhängigkeiten im Browser; three.js als gepinntes ES-Modul vom CDN. Muss auf einem MacBook Air mit 8 GB und einem iPhone flüssig laufen; `prefers-reduced-motion` wird respektiert.
- Client-ID nie im Repo; Tokens nur lokal.
- Spotify-Richtlinien: Metadaten nur anzeigen, Spotify nennen, zu Spotify verlinken, keine Daten weiterverkaufen.
- Sprache der Oberfläche: Deutsch zuerst, Englisch geplant. Code, Kommentare, Commits auf Deutsch.
- Offen: ob die Demo Cover-Bilder von Spotifys CDN einbettet oder nur auf Antippen lädt.

## Brand Commitments

- Name: **Resonanz**.
- Bindende visuelle Vorgabe von Stefan: Nacht-Fahrt-Ästhetik, bewusst anders als sein Apple-Portfolio (stefanpaun.page: Schwarz, Inter, blaue Pillen). Sonst hat Stefan die Gestaltung delegiert.
- Ton: frech, direkt, per du („Dein Gym-Monat“), nie über Orte oder andere Personen.

## Evidence on Hand

- `data/snapshot.json` (31.10.2026): 203 Künstler, 150 Top-Songs in drei Zeiträumen, 50 zuletzt gehörte Songs, Genre-Tags und Länder; anonym (kein Anzeigename, keine Playlists, keine E-Mail).
- `data/ueberschreibungen.json`: handgepflegte Tags für Künstler ohne MusicBrainz-Eintrag.
- Noch nicht vorhanden: der erweiterte Streaming-Verlauf (Stefan muss ihn anfordern); Uhrzeit- und Monatsauswertungen dürfen bis dahin nicht erfunden werden.

## Product Principles

1. Daten bleiben beim Nutzer: alles lokal, nichts erfunden, Quellen genannt.
2. Raum statt Rangliste: die Szene trägt die Information, Text erklärt nur.
3. Ehrlich bei Lücken: was die API nicht mehr liefert, wird nicht simuliert.
4. Läuft überall: 8 GB MacBook, iPhone, ohne Build.
5. Persönlich, aber nicht privat: Musikgeschmack ja, Identität nein.
