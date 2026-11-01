---
name: Resonanz
description: Himmelsatlas der eigenen Musik, gesehen durch die Windschutzscheibe einer Nachtfahrt.
colors:
  grund: "#070914"
  grund-2: "#0b0f1f"
  gitter: "#1a2140"
  linie: "#26305a"
  text: "#e8e6f0"
  text-2: "#a9a7c2"
  text-3: "#7d7b9c"
  bernstein: "#ffb454"
  bernstein-dunkel: "#8a5a1a"
  tinte: "#bcc7ee"
  rot: "#ff5a3c"
  welt-deutschrap: "#ff4fa3"
  welt-rap: "#ff8a5b"
  welt-nacht: "#9b7bff"
  welt-elektro: "#38e8ff"
  welt-latino: "#ffc24b"
  welt-rock: "#ff6b6b"
  welt-pop: "#7fe0a8"
  welt-fokus: "#b9d8ff"
  welt-streulicht: "#8e8aa3"
  weiss: "#ffffff"
  schwarz: "#000000"
  schleier: "rgba(2, 3, 8, 0.7)"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(30px, 3.4vw, 42px)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.025em"
    fontVariation: "'opsz' 96, 'wdth' 88"
  headline:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontVariation: "'opsz' 96, 'wdth' 90"
  body:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    fontVariation: "'opsz' 14, 'wdth' 100"
  label:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: "0.16em"
  messwert:
    fontFamily: "Azeret Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontFeature: "tabular-nums"
  titel-dialog:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    letterSpacing: "-0.02em"
  titel-klein:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "24px"
    fontWeight: 700
  ui:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  ui-kompakt:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  ui-klein:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
  zahl-gross:
    fontFamily: "Azeret Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "18px"
    fontWeight: 500
    fontFeature: "tabular-nums"
  zahl:
    fontFamily: "Azeret Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "13px"
    fontWeight: 400
    fontFeature: "tabular-nums"
  zahl-klein:
    fontFamily: "Azeret Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 400
    fontFeature: "tabular-nums"
  balkenwert:
    fontFamily: "Azeret Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "10px"
    fontWeight: 400
  einstieg:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
rounded:
  eckig: "0px"
  punkt: "50%"
spacing:
  rand: "clamp(16px, 2.2vw, 32px)"
  brett-h: "92px"
  sm: "6px"
  md: "14px"
  lg: "22px"
components:
  kartusche:
    backgroundColor: "rgba(7, 9, 20, 0.72)"
    textColor: "{colors.text}"
    rounded: "{rounded.eckig}"
    padding: "14px 16px 12px"
  tafel:
    backgroundColor: "rgba(7, 9, 20, 0.78)"
    textColor: "{colors.text-2}"
    rounded: "{rounded.eckig}"
    padding: "22px 24px 20px"
  sternkarte:
    backgroundColor: "rgba(7, 9, 20, 0.92)"
    textColor: "{colors.text}"
    rounded: "{rounded.eckig}"
    padding: "18px 20px 16px"
  zeit-schalter-knopf:
    textColor: "{colors.text-2}"
    rounded: "{rounded.eckig}"
    padding: "7px 14px"
  zeit-schalter-knopf-aktiv:
    backgroundColor: "{colors.bernstein}"
    textColor: "{colors.grund}"
  eg-haupt:
    backgroundColor: "{colors.bernstein}"
    textColor: "{colors.grund}"
    rounded: "{rounded.eckig}"
    padding: "7px 12px"
  eingabe:
    backgroundColor: "{colors.grund-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.eckig}"
    padding: "8px 10px"
---

# Design System: Resonanz

## Overview

**Creative North Star: "Der Himmelsatlas bei Nachtfahrt"**

Die Szene ist das Werk, die Oberfläche tritt zurück. Ein tiefindigoblauer Nachthimmel (statt Schwarz) trägt Sterne, die Künstler sind, und Galaxien, die Hörwelten sind. Alles, was Bedienung ist, sieht aus wie Gerät und Karte: dünne Rahmen wie auf einer gedruckten Sternkarte, ein Armaturenbrett am unteren Rand, Bernsteinlicht für Aktives und Rotlicht für Zahlen, so wie Astronomen und Nachtfahrer ihre Augen schützen.

Die Dichte ist niedrig, die Flächen sind klein und liegen als gerahmte Tafeln über dem stehenden Himmel. Es gibt keine Karten mit Schatten, keine Pillen, keine Verläufe in der Bedienebene. Zahlen stehen gemessen und tabellarisch, nie als große Wrapped-Zahl; Daten erscheinen als Raum, nicht als Balken-Rangliste. Bindende Vorgabe aus dem Produkt: Nacht-Fahrt-Ästhetik, bewusst anders als ein Schwarz-Inter-Blau-Pillen-Portfolio.

**Key Characteristics:**
- Tiefindigo-Grund (#070914), Himmelsgitter als feine Kuppel in #1a2140.
- Eine Bedienfarbe (Bernstein), eine Zahlenfarbe (Rotlicht), acht feste Weltfarben nur für Sterne, Punkte und Legende.
- Linien 1 px, Ecken eckig, doppelter Rahmen (außen `--linie`, innen 3 px eingerückt `--gitter`) als Kartuschen-Signatur.
- Bricolage Grotesque eng für Titel, Azeret Mono tabellarisch für alles Gemessene.
- Ohne Bewegung ist der Himmel eine fertige gedruckte Sternkarte.

## Colors

Kalte Indigo-Nacht mit einem warmen Instrumentenlicht; die Weltfarben sind das einzige bunte Material und leben im Himmel, nicht im Rahmen.

### Primary
- **Armaturen-Bernstein** (`--bernstein`, #ffb454): die einzige Bedienfarbe. Aktiver Zeitraum-Cursor, gewählte Legende, Links, Fokusring (`--fokus`), aktiver Kapitelpunkt, Hauptknopf im Dialog, Textauswahl. Nie als Datenfarbe.
- **Sterntinte** (`--tinte`, #bcc7ee): die Datenfarbe für Balken und Heatmap-Zellen, kühles Sternweiß; Deckkraft trägt den Wert.
- **Gedimmter Bernstein** (`--bernstein-dunkel`, #8a5a1a): Unterstreichungen von Links, Randglühen der Brettkante. Nie als Fläche.

### Secondary
- **Rotlicht** (`--rot`, #ff5a3c): ausschließlich Zahlen in Mono (Messwerte im Brett, Tabellenzahlen, Balkenwerte, Platzzahlen in der Sternkarte) und Fehlerstatus, mit leichtem Glühen auf den großen Messwerten.

### Welten (aus `public/welten.js`)
Deutschrap #ff4fa3, Rap & Hip-Hop #ff8a5b, Nacht & R&B #9b7bff, Phonk & Tekkno #38e8ff, Latino #ffc24b, Rock & Klassiker #ff6b6b, Pop #7fe0a8, Fokus & Lo-fi #b9d8ff, Streulicht #8e8aa3. Gesetzt über `--w` auf Legendenpunkten, Kapitelpunkten, Galaxie-Labels und Halos der Sterne (Stern selbst weiß).

### Neutral
- **Tiefindigo** (`--grund`, #070914): Seite, Szene, Dialog, Text auf Bernstein.
- **Instrumentenindigo** (`--grund-2`, #0b0f1f): Eingabefelder, Cover-Platzhalter.
- **Gitterblau** (`--gitter`, #1a2140): Himmelsgitter, innerer Rahmen, feine Tabellen- und Listentrenner.
- **Rahmenblau** (`--linie`, #26305a): äußere Rahmen, Schalter, Kopf- und Fußlinien.
- **Sternenweiß** (`--text`, #e8e6f0), **Dämmerlavendel** (`--text-2`, #a9a7c2), **Nebelviolett** (`--text-3`, #7d7b9c): Text in drei Stufen; `--text-3` ist die leiseste erlaubte Stufe (Beschriftungen, Achsen).

### Named Rules
**The One Lamp Rule.** Bernstein ist die einzige Bedienfarbe; Rotlicht gehört nur Zahlen. Weltfarben bezeichnen nur Welten, nie Knöpfe oder Zustände.

**The Fixed Palette Rule.** Neun Weltfarben, fest. Keine Verläufe in der Bedienebene; Transparenz nur als dunkle Tönung von `--grund`.

## Typography

**Display Font:** Bricolage Grotesque (variabel, selbst gehostet, mit Helvetica Neue, Arial)
**Body Font:** Bricolage Grotesque
**Label/Mono Font:** Azeret Mono (mit ui-monospace, SF Mono, Menlo)

**Character:** Eine enge, charaktervolle Grotesk (Achse `wdth` 88 bis 90, `opsz` 96) für Titel; dieselbe Familie in Textbreite für Fließtext; Mono nur für Koordinaten und Zahlen, immer `tabular-nums`.

### Hierarchy
- **Display** (700, clamp(30px, 3.4vw, 42px), 0.98): Kapitelüberschriften in der Tafel, `letter-spacing` -0.025em, `text-wrap: balance`.
- **Headline** (700, 28px, 1; mobil 20 bis 24px): Kartuschen-Titel und Sternname, -0.02em. Dialogtitel 26px.
- **Body** (400, 15px, 1.5, max 52ch): Tafeltext in `--text-2`; im Dialog 14px.
- **Label** (400 bis 600, 11 bis 13px, 0.14 bis 0.16em, Versalien): Brett-Titel, Tabellenköpfe, Metazeilen, Abschnittstitel im Dialog (13px, 0.12em, Bernstein). Galaxie-Labels im Himmel: 11px, 0.22em, 600.
- **Messwert** (Mono 500, 20px, 1, mobil 16px, Rot): Brettwerte; in Tabellen 13px, in Sternkarte 18px, an Balken 11px.

### Named Rules
**The Gemessen Rule.** Jede Zahl steht in Azeret Mono, tabellarisch, in Rotlicht, mit einer Linie darunter. Keine Zahl wird groß inszeniert.

**The Letter-Space Rule.** Weiter Buchstabenabstand nur bei Versalien-Beschriftungen in `--text-3`; Titel laufen eng (negativ).

## Layout

Vollbild-Szene (`.himmel`, fixed, Canvas) mit festen Instrumenten darüber: Kartusche oben links, Hinweis oben rechts, Armaturenbrett unten über die volle Breite (3 Spalten: Zeitraum-Schalter, Legende zentriert, Messwerte rechts; 92 px hoch, mobil 118 px mit Legende als zweiter, horizontal scrollender Zeile mit Ausblendmaske). Danach scrollt der Rückblick: jedes Kapitel ist mindestens eine Viewport-Höhe, eine Tafel (max 460 px) wechselt zwischen links und rechts, mobil unten mittig. Seitenrand `--rand` = clamp(16px, 2.2vw, 32px). Der Abstand rastet an kleinen Vielfachen (3, 6, 8, 14, 22 px); innerhalb der Tafeln trennen 1-px-Linien statt Leerraum. Eine Laternenfluss-Navigation (Punkte am rechten Rand) verbindet die Kapitel und entfällt mobil. Einziger Breakpoint: 760 px.

## Elevation & Depth

Flach. Tiefe entsteht durch die Szene selbst (Sterne, Haze, Kuppel) und durch dunkel getönte, fast opake Tafeln (`rgba(7,9,20, .72 bis .92)`, kein Blur) darüber. Es gibt keine Schlagschatten; nur weiche Lichtglühen für Aktives.

### Shadow Vocabulary
- **Schalterglühen** (`box-shadow: 0 0 16px rgba(255,180,84,.18)`): äußere Aura des Zeitraum-Schalters.
- **Punktglühen** (`box-shadow: 0 0 12px rgba(255,180,84,.5)`): aktiver Kapitelpunkt.
- **Zahlenglühen** (`text-shadow: 0 0 14px rgba(255,90,60,.35)`): Messwerte im Brett.
- **Horizontglühen** (Verlauf von `rgba(255,180,84,.32)` nach 0 über 42vh): Armaturenlicht auf der Scheibe, der einzige Verlauf der Seite; im reduced-motion-Fall auf 70 % Deckkraft.

### Named Rules
**The Flat Glass Rule.** Tafeln sind flache, dunkel getönte Platten mit Linienrahmen. Lichtglühen markiert nur Aktives; Versatzschatten gibt es nicht.

## Shapes

Eckig. Alle Tafeln, Knöpfe, Eingaben und Schalter haben 0 Radius; Rund sind nur Punkte (Legende 8 px, Welt 7 px, Kapitelpunkt 9 px) und Sterne. Rahmen 1 px, doppelt bei Kartusche, Tafel und Sternkarte (innerer Rahmen 3 px eingerückt). Gestrichelter Rahmen nur für die Ablagefläche. Kleine Beschriftungs-Tickmarks (7 px Strich vor Sternlabels, 1 px Strich über Richtungslabels) sind die Zeichensprache der Karte.

## Components

### Kartusche, Tafel, Sternkarte
Gerahmte Titelblöcke wie auf einer gedruckten Karte: 1 px `--linie`, innerer Rahmen `--gitter`, Hintergrund `--grund` mit 72 %, 78 % bzw. 92 % Deckkraft. Sternkarte (max 380 px) fährt mit Opazität und 8 px Versatz ein (.35 bis .45 s, `--ease`); mobil als Bodenblatt über dem Brett.

### Zeitraum-Schalter (Lauflicht)
Drei Knöpfe (4 W, 6 M, 1 J) in einem 1-px-Rahmen; ein Bernstein-Cursor gleitet darunter (`left`/`width` .45 s `--ease`), aktiver Text wird `--grund`. Hover hellt Text auf `--text`.

### Legende
Knöpfe mit Weltpunkt, Name in `--text-2` und Sternanzahl in Mono `--text-3`. Gewählt: 1-px-Bernsteinrahmen und `--text`; leere Welten 40 % Deckkraft; bei Filter die übrigen 45 %.

### Links und Textknöpfe
Bernsteintext mit 1-px-Unterstrich in `--bernstein-dunkel`, der bei Hover zu `--bernstein` wird. Neutrale Sternlinks: `--text` mit `--linie`-Unterstrich, Hover Bernstein.

### Dialog "Dein eigener Himmel"
`--grund`-Platte, 1-px-Rahmen, Backdrop `rgba(2,3,8,.7)`. Abschnitte durch Linie getrennt, Titel in Bernstein-Versalien. Eingabe: `--grund-2`, Mono 13px, Fokus Bernsteinrand. Hauptknopf Bernsteinfläche mit `--grund`-Text, Sekundärknöpfe 1-px-`--linie`, Hover Bernstein. Ablagefläche gestrichelt, Hover Bernstein mit 5 % Tönung.

### Messtabelle, Balken, Heatmap
`.mess`: Kopf in Versalien, Zeilen durch `--gitter`, Zahlen Mono rechts in Rot. Jahres- und Monatsbalken: Rechtecke in `--tinte`, Wert in Rot darüber (nur bei Balken ab 34 % des Maximums und beim ersten), Achse in Mono `--text-3`, Dekaden-Labels am Handy ausgeblendet; Nullwerte als 1-px-`--gitter`-Strich. Heatmap Wochentag x Stunde: quadratische `--tinte`-Zellen, Deckkraft = .05 + .95 x Wert.

### Laternenfluss
Senkrechte 1-px-Linie mit Kreispunkten am rechten Rand; aktiver Punkt Bernstein mit Glühen; Name erscheint bei Hover/Fokus links vom Punkt.

## Do's and Don'ts

### Do:
- **Do** Bernstein (#ffb454) für alles Bedienbare und Aktive verwenden, Rotlicht (#ff5a3c) nur für Zahlen in Azeret Mono, Sterntinte (#bcc7ee) für Datenflächen.
- **Do** neue Flächen als 1-px-gerahmte, eckige Platten auf `rgba(7,9,20,.72 bis .92)` bauen, bei Hauptblöcken mit innerem `--gitter`-Rahmen 3 px eingerückt.
- **Do** Zahlen tabellarisch setzen (`font-variant-numeric: tabular-nums`) und mit einer Linie belegen, wie in `.mess`.
- **Do** Zeitraum-Wechsel mit dem gleitenden Cursor und `--ease` (cubic-bezier(.16, 1, .3, 1)) bewegen: träge wie eine schwere Kamera.
- **Do** bei `prefers-reduced-motion` eine fertige statische Karte liefern (Übergänge 0, Animationen aus), nicht eine abgeschaltete.
- **Do** Fokus mit 1-px-Bernsteinring, 3 px Abstand zeigen (`--fokus`).

### Don't:
- **Don't** Weltfarben für Knöpfe, Links oder Zustände benutzen; sie bezeichnen nur Welten.
- **Don't** Wrapped-Karten mit Verlauf und riesiger Zahl oder Balken-Ranglisten bauen; die Daten stehen im Raum.
- **Don't** Radius, Pillen, Schlagschatten oder Weichzeichner-Glas in die Bedienebene bringen; Verläufe gibt es nur als Horizontglühen.
- **Don't** reines Schwarz als Grund nehmen; Grund ist Tiefindigo.
- **Don't** Text kleiner als 11 px oder dunkler als `--text-3` setzen.
- **Don't** Daten erfinden, die nicht vorliegen (Uhrzeit- und Monatsauswertungen nur aus einem echten Verlauf).

