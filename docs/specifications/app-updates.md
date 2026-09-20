# FR-008 · App-Aktualisierung

Umsetzung: v0.7.0. Das Spiel bleibt eine statisch ausgelieferte Webapp ohne Service Worker. Die Prüfung lädt keine fremden Programme und erzwingt keinen Reload.

## Versionsquelle und Auslieferung

`game/version.json` enthält die sichtbare Version und die lokale Build-ID. Der Build ersetzt die HTML-Platzhalter für Versionsanzeige und Metadaten. GitHub Pages verwendet den Commit-SHA als Build-ID; lokale Builds verwenden die ID aus der Datei. `version.json` wird mit dem gleichen Artefakt veröffentlicht wie HTML, CSS und Module. Sämtliche Modulimporte in `src/` und `shared/` und die HTML-Einstiege/CSS-Links erhalten die Build-ID als Query-Parameter. So mischt ein regulär gestarteter neuer Build keine alten Module aus dem Browsercache bei.

## Verhalten

Beim Start, bei `pageshow`, bei Rückkehr zum sichtbaren Tab, bei erneuter Verbindung und im sichtbaren Tab periodisch prüfen. Mindestens fünf Minuten zwischen Prüfungen, höchstens eine Anfrage gleichzeitig. Versionsdatei mit `cache: no-store`, zusätzlichem Zeitparameter und acht Sekunden Timeout laden. Offline-, HTTP- und JSON-Fehler still behandeln. Ungültige Versions-/Build-Formate ignorieren. Gleiche Build-ID löst keinen Hinweis aus; einen erkannten anderen Build nur einmal pro Sitzung ankündigen. Ein Rollback auf einen anderen Build wird ebenfalls angeboten.

Ein kurzer Hinweis und ein Aktualisieren-Knopf erscheinen im Start- und Spielmenü, zusätzlich ein dezenter Toast. Keine automatische Navigation. Solange ein Flug läuft, geladen wird oder eine ausgesetzte Spielsitzung in einer Wiederholung steckt, ist der Knopf gesperrt. Beim Klick erneut prüfen, Fortschritt speichern und die aktuelle URL mit der neuen Build-ID als `_v` neu laden. Fluglink-Parameter, Hash und gespeicherte Sprache bleiben erhalten. Die unveränderte Origin behält ihre lokalen Spielstände und ausstehenden Rekordübertragungen.

## Prüfungen

Reine Tests decken Browserpräferenzen, Übersetzungsplatzhalter, gleiche/andere/ungültige Versionen, Offline-Fehler, Zeitbegrenzung und parallele Anfragen ab. Browsertests prüfen den sichtbaren Hinweis, die Sperre während eines pausierten Flugs und einen echten manuellen Reload nach der Runde mit unverändertem Spielstand und Sprache. Pages-Assembly wird auf übereinstimmende Metadaten und vollständig versionierte Importpfade geprüft. Die zuvor installierte v0.6.0 hat noch keine Versionsprüfung und muss einmal manuell neu geladen werden.
