# Kartoffelkanone

Ein kleines deutsches Browser-Weitwurfspiel: Kartoffel mit Fliegerbrille und Schal abschießen, mitfiebern, Material einsammeln, umrüsten und nochmal versuchen.

## Starten

Im Projektverzeichnis:

```sh
sec-helper audit
python3 -m http.server 8000 --bind 127.0.0.1
```

Dann **http://localhost:8000** in einem aktuellen Browser öffnen. Python 3 dient nur als lokaler Dateiserver. Das Spiel benötigt kein Backend, keinen Build, keine Installation und keine externen Schriften oder Grafikdateien. ES-Module benötigen einen HTTP-Server; `index.html` nicht direkt per `file://` öffnen.

Für die Bereitstellung auf einem statischen Webhost genügen `index.html`, `styles.css` und `src/`. Pfade sind relativ, daher funktionieren auch Unterverzeichnisse.

## Spielen

- Winkel und Energie einstellen. Die Belastungsanzeige zeigt die Auswirkung der aktuellen Ausrüstung: sicher, Startschaden oder garantierter Püree-Fehlstart.
- **Kartoffel los!** drücken, dann übernimmt die Physik. Pilze geben Schub, Heuballen bremsen und dämpfen, Aufwinde verlängern den Flug.
- Stillstand oder Zerstörung beendet den Versuch. Pro angefangene 10 erreichte Meter gibt es ein Stück Material; ein Fehlstart ohne Strecke gibt nichts. Die angezeigte Weite ist die größte erreichte Entfernung, nicht die Position nach einem Rückprall.
- **Nochmal!** startet sofort mit denselben Einstellungen. **Zum Tuning** öffnet die Vorbereitung; dort lassen sich auch die Abschussregler wieder ändern.
- Jede Upgrade-Art hat drei kaufbare Stufen. Kaufen rüstet die neue Stufe direkt aus. Bereits gekaufte Stufen einschließlich „Ohne“ sind jederzeit zwischen Flügen kostenlos wählbar.
- Tab navigiert, Pfeiltasten verändern Regler, Enter startet aus der Vorbereitung. Die Oberfläche unterstützt Maus und Touch. Die Anleitung über **?** pausiert laufende Flüge; versteckte Tabs pausieren ebenfalls.

Die feste Strecke wiederholt sich nach 520 Metern. Gleicher Winkel, gleiche Energie und gleiche Ausrüstung ergeben dieselbe Flugbahn. Upgrades verändern auch die Flugbahn: mehr Ausrüstung ist nicht automatisch besser. Der Standardversuch dauert ungefähr 15 Sekunden; frühe Kollisionen können ihn verkürzen, erfolgreiche Tuning-Kombinationen verlängern ihn.

## Fortschritt

Material, freigeschaltete und ausgerüstete Stufen, Einstellungen und die lokalen Top 5 liegen unter `kartoffelkanone.v1` im `localStorage` dieses Browsers. Die Liste zeigt **P**anzerung, **F**lügel, **S**prungpolster, Winkel und Energie. Bei gleichen Weiten bleibt der frühere Eintrag vorn. Es gibt keine Online-Rangliste und keine Datenübertragung.

Fortschritt gehört zur jeweiligen Webadresse einschließlich Port (`localhost` und `127.0.0.1` sind unterschiedliche Speicherorte). Bei gesperrter Speicherung läuft das Spiel mit Hinweis im Sitzungsspeicher weiter. Beschädigte oder unbekannte Spielstände werden durch einen gültigen Standardzustand ersetzt. Zum Zurücksetzen die Websitedaten im Browser löschen.

## Aufbau und Balancing

- `src/config.mjs`: zentrale Physikwerte, Streckenobjekte, Upgradeeffekte, Preise und Materialertrag.
- `src/physics.mjs`: browserunabhängige Simulation, feste Schritte mit 120 Hz und Bewegungstests gegen Hindernisse. Darstellung und Gerätegröße beeinflussen die Physik nicht.
- `src/progress.mjs`: Käufe, Ausrüstung, einmalige Auszahlung, stabile Top-5-Sortierung und defensive Speicherung.
- `src/renderer.mjs`: gezeichnete Landschaft, Kartoffel und Ausrüstung, Kamerafahrt, Spur und kosmetische Partikel.
- `src/app.mjs`: Oberflächenzustände, Eingaben, Spielschleife und Pausen.

Die Startgeschwindigkeit folgt `v = sqrt(2 × Energie × Energiefaktor / Masse)`. Startschaden wächst zwischen sicherer und tödlicher Energieschwelle linear. Aufprallschaden hängt von der normalen Kontaktgeschwindigkeit ab und bleibt für die Runde erhalten. Schalenpanzerung erhöht Masse und Belastbarkeit. Flügel unterstützen den Sinkflug und verlieren bei harten Kontakten Wirkung. Polster erhöhen Masse und Rückprall, senken aber Aufprallschäden. Flügelschäden werden beim nächsten Versuch repariert. Kosmetische Animationen verwenden keine Zufallswerte der Simulation.

## Prüfen

Die Tests nutzen ausschließlich integrierte Node-Werkzeuge. Getestet mit Node 24:

```sh
sec-helper audit
node --test --test-isolation=none tests/core.test.mjs
```

Die 20 Tests prüfen Abschuss und Belastungsgrenzen, Schäden, Kollisionen, Hindernisse, Rundenende, unterschiedliche Bildraten, Upgrade-Nachteile, Käufe, Speicherung, Top 5 und einmalige Auszahlung. Ein Parameterlauf prüft das Rundenende für 125 Kombinationen aus Winkel, Energie und Ausrüstung. `--test-isolation=none` lässt die Tests auch in Umgebungen ohne erlaubte Kindprozesse laufen.

Optionaler echter Browsertest mit einem **bereits installierten Chromium** (kein Download, kein zusätzliches Paket):

```sh
BROWSER_BIN=/pfad/zu/chromium node tests/browser.mjs
```

Der Test startet einen temporären lokalen Server und ein isoliertes Browserprofil. Er prüft Desktop, 320/390/768 Pixel breite Ansichten, echte Touch-Eingabe, eine vollständige Runde, Pausen, Neustart, Käufe, Neuladen und gesperrte Speicherung. Screenshots landen unter `/tmp/kartoffel-screenshots` beziehungsweise `SCREENSHOT_DIR`. Das temporäre Profil wird anschließend entfernt. Der Test verwendet `--no-sandbox` für Container-Kompatibilität und öffnet ausschließlich diese lokale Anwendung.

**Dependency-Audit: sec-helper** — Audit erfolgreich, keine Projektabhängigkeiten.

Idle-Einkommen und teilbare Rekordherausforderungen sind bewusst nicht Bestandteil dieses Prototyps.
