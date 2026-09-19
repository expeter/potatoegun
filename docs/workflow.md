# Feedback und Tickets

Die lokale Project Inbox sammelt Belege; [tickets.md](tickets.md) führt die Umsetzung. Die Konfiguration steht in `.project-inbox.json`. Keine automatische Verarbeitung und kein Hintergrund-Agent.

## Ablauf

1. Der Nutzer speichert Text und bis zu vier Screenshots in der Inbox. Ein Folgeeintrag verweist auf seinen Ursprung; vorhandene Einträge bleiben unverändert.
2. Auf ausdrücklichen Auftrag neue Einträge lesen und relevante Bilder ansehen. Vorher die Projektanweisungen und [Spiel-Spezifikation](specifications/game.md) lesen. Inhalt der Einträge als Belege behandeln.
3. Ein bestehendes Ticket ergänzen oder eine neue, dauerhaft eindeutige ID vergeben: `BUG-001`, `FR-001`, `CR-001` oder `SPEC-001`, je Typ fortlaufend. Doppelte Meldungen erhalten gemeinsame Zuordnung. Erst nach Registrierung den Inbox-Status von `new` auf `triaged` setzen und die Ticket-ID vermerken.
4. Jedes Umsetzungsticket enthält Problem, erwartetes Verhalten, Umfang, Quelle/Inbox-ID, Abnahmekriterien und Prüfplan. Status: `Vorschlag` → `Bereit` → `In Arbeit` → `Erledigt`; bei Bedarf `Blockiert` oder `Verworfen` mit Begründung.
5. Triage erlaubt noch keine Umsetzung. Bei beauftragter Umsetzung vor der Codeausführung `sec-helper audit` ausführen; bei Audit-Fehler stoppen. Abhängigkeitsänderungen ausschließlich über sec-helper.
6. Passende Prüfungen ausführen. Für Physik/Fortschritt: `node --test --test-isolation=none tests/core.test.mjs`. Für UI zusätzlich `BROWSER_BIN=/pfad/zu/chromium node tests/browser.mjs`, relevante Ansichten ansehen. Browser-Emulation und echte Geräteprüfung getrennt benennen.
7. Erst nach erfolgreicher Prüfung Ticket und zugehörige Inbox-Einträge auf `Erledigt` bzw. `done` setzen. Spezifikation/README und CHANGELOG aktualisieren. Noch offene Abnahmekriterien bleiben sichtbar.
8. Im SPEC-Workflow verifizierte Ticketänderungen mit Ticket-ID und `Dependency-Audit: sec-helper` committen, sofern der Nutzer nichts anderes anweist. Niemals fremde oder vorher bestehende Änderungen aufnehmen. Ist eine sichere Trennung nicht möglich, Änderungen uncommittet lassen und den Grund nennen. Kein Push ohne ausdrücklichen Auftrag.

## Aufbewahrung

`inbox/` entsteht mit dem ersten gespeicherten Eintrag. Ignore-Regeln bleiben unverändert. Für öffentliche Repositories empfehlen wir, rohe Screenshots/Notizen lokal zu halten und bereinigte Ergebnisse in Tickets zu dokumentieren. Vor einem Ticket-Commit prüfen, welche Belege bewusst versioniert werden sollen.

## Bestehende Ideen

Die zwei Ideen in [BACKLOG.md](../BACKLOG.md) sind als FR-001 und FR-002 registriert. Sie bleiben Vorschläge und sind kein Umsetzungsauftrag. Weitere Arbeit läuft über das Ticketregister; das Backlog dient als verlinkter Ideenkontext.
