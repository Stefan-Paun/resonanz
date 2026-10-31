# Resonanz – Plan

Deine Musik als begehbarer Sternenhimmel im Browser. Jeder Künstler ein Stern, jede Hörwelt eine Galaxie,
beim Scrollen ein eigener Jahresrückblick. Öffentlich auf GitHub, Demo mit eingefrorenem Schnappschuss,
nutzbar mit eigenem Spotify-Konto oder dem exportierten Streaming-Verlauf (alles lokal im Browser).

## Recherche (31.10.2026)

| Quelle | Was sie liefert | Grenze |
|---|---|---|
| Spotify Web API (Dev Mode) | Top-Künstler/-Songs für 4 Wochen, 6 Monate, 1 Jahr (je 50), Cover, Dauer, Erscheinungsdatum, letzte 50 Songs | **keine Genres, keine Popularität, keine 30-s-Vorschau** mehr; seit Feb 2026 Premium-Pflicht für den App-Besitzer, max. 5 Testnutzer, Suche max. 10 Treffer |
| MusicBrainz (frei, ohne Schlüssel) | Genre-Tags und Herkunftsland pro Künstler | 1 Anfrage/s, kleine Künstler (z. B. Sped-up-Kanäle) ohne Tags → Überschreibungsliste |
| Deezer (frei, ohne Schlüssel) | Künstlerbilder, 30-s-Vorschauen | Zuordnung per Namenssuche, nicht immer eindeutig |
| Spotify „Erweiterter Streaming-Verlauf“ (Export) | jeder Stream mit Zeitstempel, Dauer, Titel, Künstler, Plattform, übersprungen | Anfrage dauert Tage bis 30 Tage; **Stefan muss ihn anfordern** |

Konsequenz: Der Schnappschuss kommt aus der API plus MusicBrainz. Der echte Rückblick nach Uhrzeit, Wochentag
und Monat kommt aus dem Export, sobald er da ist (Teil 6), rein lokal im Browser, nichts wird hochgeladen.

## Look

Nacht-Fahrt-Ästhetik, bewusst anders als das Apple-Portfolio: tiefes Blauschwarz, glühende Sterne,
Chromatik pro Hörwelt (Magenta Deutschrap, Violett Nacht/R&B, Cyan Elektronik/Phonk, Bernstein Latino,
Koralle Rock/Klassiker, Mint Fokus/Lo-fi). Serifen-Display (Instrument Serif) für Kapitel, Inter für UI.
Details in DESIGN.md.

## Teile

| Teil | Inhalt | Ergebnis |
|---|---|---|
| 1 | Gerüst: Repo, Lizenz, Sammler `tools/sammeln.py` (Spotify + MusicBrainz → `data/snapshot.json`), Hörwelten-Zuordnung mit Tests | Daten liegen anonymisiert vor |
| 2 | Szene: three.js-Sternenhimmel, Cluster pro Hörwelt, Größe nach Hörgewicht, Kamera-Drift, Hover/Tipp-Labels, Handy, reduced-motion | Erste anschaubare Version |
| 3 | Rückblick: Scroll-Kapitel (Deine Welten, Top 5, Aufsteiger seit 6 Monaten, Dauerbrenner, Herkunftsländer, Erscheinungsjahre) | Eigenes „Wrapped“ |
| 4 | Details: Stern antippen → Karte mit Songs, Covern, Vorschau über Deezer (wenn vorhanden) | Hörbar |
| 5 | Eigenes Konto: „Mit deinem Spotify“ per PKCE direkt im Browser (eigene Client-ID eintragen, wegen Dev-Mode-Grenzen) | Für andere nutzbar |
| 6 | Verlauf-Import: Export-ZIP per Drag & Drop → Heatmap Uhrzeit × Wochentag, Monate, Nachtphasen, Skip-Quote | Der echte Rückblick |
| 7 | Feinschliff: Lighthouse, Screenshots, README EN/DE, GitHub Pages, Portfolio-Kachel + Spur | Veröffentlicht |

## Regeln

- Kein Build-Schritt, keine npm-Abhängigkeiten im Browser (three.js gepinnt von cdnjs/jsdelivr).
- Client-ID nie im Repo. Schnappschuss ohne Anzeigenamen, ohne Playlists, ohne E-Mail.
- Namen, Kommentare und Commits auf Deutsch; README zweisprachig.
- Spotify-Richtlinien: Metadaten nur anzeigen, Spotify nennen, Links zu Spotify.
