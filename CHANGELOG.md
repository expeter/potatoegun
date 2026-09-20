# Änderungen

## Noch nicht veröffentlicht

- CR-011 / v0.6.0: Produktionsadresse auf `potato.minizap.online` korrigiert; neue Kurzlinks verwenden die neue Adresse. API erlaubt während des Übergangs beide Spieladressen. Dezente Spielversion unten im Menü.

- BUG-005: Neue persönliche Bodenrekorde mit Gegenverkehr automatisch online eintragen; Veröffentlichungsbutton entfernt. Ausstehende Einträge lokal speichern und bei Verbindung erneut versuchen. Replay-Prüfung erlaubt winzige geräteabhängige Rundungsabweichungen bei unverändert exakten Eingaben/Zählern und serverberechneter Wertung.

- SPEC-004: API-Sicherheitsaudit mit behobenen Speicher-/Backupgrenzen, globalen Uploadgrenzen, vollständigem Worker-Abbau, Wind-/Talentregeln und generischen JSON-Fehlern. API-Laufzeit über sec-helper auf Node 24.21.0 aktualisiert; private Datenrechte, root-eigene Artefakte und zusätzliche systemd-Isolation. Sicherheitsupdate auf VPS geprüft; Blog-/Asgard-Dienste unverändert.


- SPEC-003: API auf eigenem VPS-Service mit isolierter Node-24-Laufzeit, Ressourcenlimits, persistentem SQLite und täglichem Backup. Bestehende Blog-/Asgard-Dienste unverändert. Frontend bleibt auf GitHub Pages; kurze Fluglinks verwenden dafür `?flight=<ID>` statt Server-Rewrites.


- SPEC-002: Repository in `game/`, `shared/`, `api/` und `deploy/` gegliedert; statisches Artefakt mit bestehenden Modulpfaden und Pages-Veröffentlichung erhalten.
- MiniZap-Startbildschirm mit direktem Spielen, Bestweite, optionaler Installation und einmaligem Hinweis. Lokale Spielstände und alte Fluglinks bleiben erhalten.
- Node-/SQLite-API speichert geprüfte Replays hinter kurzen IDs; öffentliche Bestenliste nach ausdrücklicher Veröffentlichung. Gemeinsame Simulation, begrenzte Worker-Prüfung, Größen-/Anfragelimits und CORS. Serverausfälle fallen beim Teilen auf vollständige Fluglinks zurück.
- VPS-Vorlagen, Entwicklungsserver, Online-Backup und API-Integrationstests ergänzt. Keine neuen Drittanbieter-Abhängigkeiten. Dependency-Audit: sec-helper.


- Kleiner Spieltest: zusätzliche Schrottspuren im Himmel, halbierte neue XP-Belohnungen bei unverändertem Spielstand, kompakte Bestenlisten-Aktionsicons in derselben Zeile, freigestelltes X neben dem Spielernamen und schließbare Ergebnisansicht mit gesperrtem Hintergrund.

- FR-006: Versionierte Replay-Links mit Zufallsstartwerten, Wind, Talenten, Looks und Eingaben auf Simulationsschritten. Neue Rekorde lassen sich ohne Belohnungen oder Profiländerungen ansehen; Talente können ausdrücklich und innerhalb eigener Punkte übernommen werden. Native Freigabe enthält den Spiel-Link; Link kopieren mit Textfeld-Fallback ergänzt den Bildexport.

- CR-010: Flugkarte mit fast randfüllender Handyvorschau, großer Weite und einem Werteband über die gesamte Breite. Größere Beschriftungen und Zahlen auch im Hochformat; sechs Handygrößen und PNG-Prüfsummen geprüft.

- FR-005: Spielername direkt im Menü, automatisch lokal gespeichert. Neue Bestenlisten-Einträge tragen den Namen beim Abschuss; bestehende Namen bleiben erhalten.

- BUG-004: X und Escape führen aus Talentdetails zur Übersicht, auch nach Vorgängersprüngen; Flug bleibt pausiert.
- CR-009: Adaptive Flugkarten nutzen den seitlichen Platz mit eigenem Quer-/Hochformatlayout. Rotation aktualisiert Vorschau und PNG; ältere Prüfkarten bleiben unterstützt. Breitennutzung und Textgröße auf sechs Handygrößen geprüft.

- CR-007: Feste Übersicht aller zwölf Talente ohne Scrollen ersetzt Zweigtabs und große Karten. Details öffnen per Antippen; drei einzeln wählbare Stufen und verlinkte Voraussetzungen, bestehende Builds bleiben erhalten.
- CR-008: Flugkarte mit großen Run-Werten in zwei Reihen und größerem Ausrüstungs-Emblem; technische ID bleibt am Fuß.
- BUG-003: Lokale Top 5 im Menü auch am Handy erreichbar; Looks heißt Garderobe.

- CR-004: Talentkarten teilen gemeinsame Zeilen; Reset oben, allgemeine Fußhinweise entfernt.
- BUG-002: Dialogpalette unabhängig von Acker-/Goblin-Farben; dunkle lesbare Hilfe und Garderobe.
- CR-005: Kleidung und Landschaften getrennt; „Acker“ ohne Original-Präfix.
- SPEC-001: Neon-Nudelstadt, Mondkäse-Müllhalde und Vulkan-Frittenbude als kosmetische Schrottkäufe geplant, noch nicht implementiert.
- CR-006: Größere Kreditkarten-Vorschau, Speichern/Teilen oben, größere Exportbeschriftung und ruhigere Textur. Prüfcode-Erklärung entfällt; ID und PNG-Metadaten bleiben erhalten.

- FR-004: Homescreen-Installation mit lokalem App-Icon, Vollbild-/Querformatpräferenz und randfüllendem App-Layout vorbereitet. Windows-/WSL-USB-Testweg dokumentiert. Manifest, Icons und Browser-Integration geprüft; echter Android-Installationslauf bleibt offen. Kein Offline-Cache und keine APK.

- BUG-001: Spielfeld und Dialoge folgen dem sichtbaren Viewport bei Rotation, Größenwechsel und Vollbild.
- CR-001: Gemeinsame dunkle Comic-Menüs mit Rückweg, fünf Menüziele und mittige Flugaktionen; Tempo-/Vollbildoption aus dem Produktmenü entfernt.
- CR-002: Vier Talentzweige mit drei lesbaren Karten, einzelnen Stufenkartoffeln und verlinkten Voraussetzungen. XP, Level und freie Punkte bleiben sichtbar.
- CR-003: Im Feld per Touch halten, zielen und loslassen; Abbruch und Mehrfinger-Eingaben abgesichert.
- FR-003: Lokales Flugbuch mit zwölf Zählern, einmaliger Abrechnung und vorsichtiger Migration alter Spielstände.
- Validierung: Dependency-Audit: sec-helper; 60 Kernprüfungen und Chromium-Integration bestanden. Echte Handyprüfung noch ergänzend erforderlich.

- Lokale Project Inbox und dokumentierten SPEC-Ticket-Workflow eingerichtet.
- Bestehende Backlog-Ideen als FR-001 und FR-002 registriert; noch keine Umsetzung beauftragt.

Frühere Spieländerungen sind in README.md beschrieben; dieses Changelog beginnt mit dem Ticket-Workflow.
