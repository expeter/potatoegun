# Kartoffelkanone · Tickets

Arbeitsweise: [Workflow](workflow.md). Neue Inbox-Meldungen werden nach ausdrücklichem Triage-Auftrag hier zugeordnet. Die Inbox-Meldungen vom 19.09.2026 sind nach Thema zusammengefasst; Folgekorrekturen behalten eigene stabile IDs.

| ID | Status | Thema | Quelle |
| --- | --- | --- | --- |
| BUG-001 | Erledigt | Viewport und erreichbare Bedienung | Inbox 085611 |
| CR-001 | Erledigt | Einheitliche Menüs und Aktionsleiste | Inbox 085855, 090216, 090322 |
| CR-002 | Erledigt | Lesbare Talentzweige mit Voraussetzungen | Inbox 085535 |
| CR-003 | Erledigt | Direkt im Feld per Touch laden und schießen | Inbox 085734 |
| FR-004 | Erledigt; Gerätetest offen | Homescreen-Start ohne Browserleiste | Chat 19.09.2026 |
| FR-003 | Erledigt | Lokales Flugbuch mit zwölf Statistiken | Inbox 085535 |
| CR-004 | Erledigt | Talentkarten und kompakte Kopfzeile | Neue Inbox-Belege |
| BUG-002 | Erledigt | Dialogkontrast im Acker | Neue Inbox-Belege |
| CR-005 | Erledigt | Kleidung und Landschaften | Neue Inbox-Belege |
| SPEC-001 | Erledigt | Drei Schrott-Landschaften planen | Neue Inbox-Belege |
| CR-006 | Erledigt | Lesbare Flugkarte | Neue Inbox-Belege |
| CR-007 | Erledigt | Feste Talentübersicht ohne Scrollen | Inbox-Folgefeedback |
| CR-008 | Erledigt | Flugkarte mit großen Werten | Inbox-Folgefeedback |
| BUG-003 | Erledigt | Bestenliste und Garderobe | Inbox-Folgefeedback |
| BUG-004 | Erledigt | Talentdetails eine Ebene schließen | Chat-Feedback |
| CR-009 | Erledigt | Flugkarte nutzt Bildschirmbreite | Chat-Feedback |
| FR-001 | Vorschlag | Pflanzen ernten oder zu Sprungstellen wachsen lassen | [Backlog](../BACKLOG.md#pflanzen-ernten-oder-zu-sprungstellen-wachsen-lassen) |
| FR-002 | Vorschlag | Sammelsprossen oder Sammellaser im Flug | [Backlog](../BACKLOG.md#sammelsprossen-im-flug) |

Vor Umsetzung der Vorschläge Umfang und Abnahmekriterien festlegen. Ausführliche Umsetzungstickets werden unter ihrer ID ergänzt; erledigte IDs werden nicht wiederverwendet.

## Vorlage für neue Tickets

- **ID / Titel:**
- **Status:** Vorschlag
- **Quelle:** Inbox-ID und relative Links zu relevanten Belegen
- **Problem / Reproduktion:** einschließlich Gerät, Browser und Ausrichtung, soweit bekannt
- **Erwartetes Verhalten:**
- **Umfang:**
- **Abnahmekriterien:**
- **Prüfplan:**
- **Prüfergebnis / verbleibende Einschränkungen:**

## Aktuelle Umsetzung

### BUG-001 · Größenwechsel und erreichbare Bedienelemente

- **Status:** Erledigt
- **Quelle:** [INBOX-20260919-085611-ac8811](../inbox/INBOX-20260919-085611-ac8811.md)
- **Problem / Erwartung / Abnahmekriterien:** Viewport-Wechsel darf keine Steuerelemente abschneiden. Dialog und Canvas passen nach Rotation, Resize und Vollbild zur sichtbaren Fläche.
- **Umfang:** [Menükonzept](specifications/mobile-menus.md).
- **Prüfplan:** Core-Tests für Speicherung/Abrechnung; Browserprüfungen mit Touch, Rotation, Dialogwechsel und Screenshots in Quer- und Hochformat.
- **Prüfergebnis:** Bestanden: Viewport-Anpassung bei Fensterwechsel, Vollbild und Rotation; auch bei geöffnetem Statistikdialog. Chromium mit 320×740, 390×844, 667×375, 844×390, 932×430, 1180×700 und Desktop geprüft. Kein horizontaler Überlauf; Canvas im Querformat bis zum Rand. Echte Geräteprüfung steht ergänzend aus; die Abnahme hier verwendet Browser-Emulation.

### CR-001 · Gemeinsame Menügestaltung und Aktionsleiste

- **Status:** Erledigt
- **Quelle:** [INBOX-20260919-085855-d9ed44](../inbox/INBOX-20260919-085855-d9ed44.md), [INBOX-20260919-090216-03443c](../inbox/INBOX-20260919-090216-03443c.md), [INBOX-20260919-090322-d92154](../inbox/INBOX-20260919-090322-d92154.md)
- **Problem / Erwartung / Abnahmekriterien:** Menü enthält Hilfe, Looks, Talente, Erfolge und Statistik. Keine Tempo-/Vollbildoption. Dunkle Comic-Panels und gemeinsame Knöpfe auch im Ergebnis; Flugaktionen mittig zusammen.
- **Umfang:** [Menükonzept](specifications/mobile-menus.md).
- **Prüfplan:** Core-Tests für Speicherung/Abrechnung; Browserprüfungen mit Touch, Rotation, Dialogwechsel und Screenshots in Quer- und Hochformat.
- **Prüfergebnis:** Bestanden: fünf Menüziele ohne Tempo-/Vollbildknopf, gemeinsame Zurück-/Schließen-Navigation, mittige Flugaktionen. Menü, Ergebnis, Hilfe, Looks, Erfolge, Teilen und Statistik visuell geprüft. Kontrast und Überschriftenabstand zusätzlich abgesichert. Echte Geräteprüfung steht ergänzend aus; die Abnahme hier verwendet Browser-Emulation.

### CR-002 · Talentzweige statt zweidimensionalem Verschieben

- **Status:** Erledigt
- **Quelle:** [INBOX-20260919-085535-9d5bea](../inbox/INBOX-20260919-085535-9d5bea.md)
- **Problem / Erwartung / Abnahmekriterien:** Vier Zweigtabs, drei Talente je Zweig, einzelne Stufen und sichtbare alternative Voraussetzungen. Level, XP bis zur nächsten Stufe und freie Punkte sichtbar; kein horizontales Scrollen.
- **Umfang:** [Menükonzept](specifications/mobile-menus.md).
- **Prüfplan:** Core-Tests für Speicherung/Abrechnung; Browserprüfungen mit Touch, Rotation, Dialogwechsel und Screenshots in Quer- und Hochformat.
- **Prüfergebnis:** Bestanden: vier Tabs, drei sichtbare Talentkarten, 36 einzelne Stufen im Modell, verlinkte Voraussetzungen und geschützte abhängige Talente. Kein horizontaler Scrollweg oder überlappender Text; Touch-Punktvergabe und sichtbare XP/Level geprüft. Echte Geräteprüfung steht ergänzend aus; die Abnahme hier verwendet Browser-Emulation.

### CR-003 · Touch-Halten im Spielfeld lädt und schießt

- **Status:** Erledigt
- **Quelle:** [INBOX-20260919-085734-874731](../inbox/INBOX-20260919-085734-874731.md)
- **Problem / Erwartung / Abnahmekriterien:** Touch wie Maus: halten zum Zielen/Laden, loslassen feuert. Abbruch bei Dialog, Größenwechsel und Pointer-Abbruch. Zweiter Finger darf den aktiven Schuss nicht übernehmen.
- **Umfang:** [Menükonzept](specifications/mobile-menus.md).
- **Prüfplan:** Core-Tests für Speicherung/Abrechnung; Browserprüfungen mit Touch, Rotation, Dialogwechsel und Screenshots in Quer- und Hochformat.
- **Prüfergebnis:** Bestanden: echte Chromium-Touch-Ereignisse für Halten, Bewegen, Abbruch und Loslassen direkt im Feld; zwei Finger ergeben genau einen Schuss. Maus, Tastatur und Abbruch bei Größenwechsel weiterhin geprüft. Echte Geräteprüfung steht ergänzend aus; die Abnahme hier verwendet Browser-Emulation.

### FR-003 · Persistente Flugstatistik

- **Status:** Erledigt
- **Quelle:** [INBOX-20260919-085535-9d5bea](../inbox/INBOX-20260919-085535-9d5bea.md)
- **Problem / Erwartung / Abnahmekriterien:** Separater Statistikdialog mit Abschüssen, Abstürzen, heilen Landungen, UFOs, Bodenabprallern, Sprungbrettern, Schwung, Schrott, Pflanzen und Flugzeit. Einmalige Abrechnung; alte unbekannte Ereignisse nicht erfinden.
- **Umfang:** [Menükonzept](specifications/mobile-menus.md).
- **Prüfplan:** Core-Tests für Speicherung/Abrechnung; Browserprüfungen mit Touch, Rotation, Dialogwechsel und Screenshots in Quer- und Hochformat.
- **Prüfergebnis:** Bestanden: zwölf Statistikwerte, historische Migration ohne erfundene Details, sofortige einmalige Abschusszählung, einmalige Abrechnung, Crash/Landung/Notsprengung getrennt und Speicherung nach Neuladen. 60 Kernprüfungen bestanden. Echte Geräteprüfung steht ergänzend aus; die Abnahme hier verwendet Browser-Emulation.


## Abschluss der Runde vom 19.09.2026

- `sec-helper audit`: bestanden. Dependency-Audit: sec-helper. Keine Abhängigkeiten hinzugefügt.
- 60/60 Kernprüfungen und vollständige Chromium-Integration bestanden; keine Browserfehler. Screenshots unter `/tmp/kartoffel-screenshots/`, relevante Quer-/Hochformatansichten angesehen.
- Alle sechs zugeordneten Inbox-Einträge abgeschlossen; FR-001/FR-002 bleiben Vorschläge.
- Kein Commit: Beim Start lagen umfangreiche uncommittete Vorarbeiten in denselben Dateien sowie benötigte unversionierte Spielmodule vor. Ein eigenständig lauffähiger Ticket-Commit würde diese Vorarbeiten aufnehmen. Gemäß Workflow bleiben die Änderungen zur sicheren gemeinsamen Prüfung uncommittet. Kein Push.

### FR-004 · Homescreen-Start ohne Browserleiste

- **Status:** Erledigt (Gerätetest offen)
- **Quelle:** Chat-Feedback vom 19.09.2026: Die Browserleiste verhindert eine realistische Einschätzung des Handy-Spiels.
- **Umfang:** Installationsmanifest, lokale App-Icons, Vollbild-/Querformatpräferenz und randfüllendes Layout im installierten Modus. Anleitung für HTTPS und lokalen USB-Test. Kein APK-Build, kein Offline-Cache und keine Veröffentlichung.
- **Abnahmekriterien:** Gültiges Manifest und passende Icons; installierter Anzeigemodus aktiviert das Spielfeldlayout; vorhandene Menüs unverändert erreichbar. Einschränkung des bisherigen HTTP-WLAN-Zugangs erklären.
- **Prüfplan:** sec-helper audit, Manifest-/Iconprüfung in Chromium und emulierter installierter Anzeigemodus. Installation auf echtem Android gesondert offen halten.
- **Prüfergebnis:** sec-helper audit bestanden (Dependency-Audit: sec-helper). Chromium liest das Manifest fehlerfrei und lädt beide PNG-Größen; randfüllendes Layout mit simuliertem installiertem Anzeigemodus sowie bestehende Browser-Integration bestanden. App-Icon und Layout-Screenshot angesehen. Tatsächliche Android-Installation, Vollbild-/Orientierungsverhalten und USB-Weiterleitung bleiben auf dem Gerät zu prüfen. Kein Offline-Versprechen, keine Veröffentlichung. Wie oben wegen überlappender uncommitteter Vorarbeiten kein isolierter Ticket-Commit.

### CR-004 · Talentkarten ausrichten und Kopfzeile verdichten

- **Status:** Erledigt
- **Quelle:** [INBOX-20260919-092640-045673](../inbox/INBOX-20260919-092640-045673.md)
- **Umfang / Abnahmekriterien:** Gemeinsame Zeilen für Titel, Wirkung, Stufen und Voraussetzungen; Reset oben; allgemeine Bedienhinweise und Fußzeile entfernen.
- **Prüfplan:** Chromium-Integration, relevante mobile Screenshots und Prüfung der Export-Metadaten; SPEC-001 Dokumentprüfung.
- **Prüfergebnis:** Chromium prüft gleiche Stufenhöhe aller drei Karten, Reset oberhalb der Tabs, entfernte Fußzeile und Touch-Verteilung. Quer-/Hochformat-Screenshots angesehen.

### BUG-002 · Menükontrast unabhängig von der Landschaft

- **Status:** Erledigt
- **Quelle:** [INBOX-20260919-092816-4da065](../inbox/INBOX-20260919-092816-4da065.md)
- **Umfang / Abnahmekriterien:** Acker darf die dunklen Dialogfarben nicht überschreiben; Hilfe, Garderobe und Ergebnis lesbar halten.
- **Prüfplan:** Chromium-Integration, relevante mobile Screenshots und Prüfung der Export-Metadaten; SPEC-001 Dokumentprüfung.
- **Prüfergebnis:** Dunkler Hintergrund für Acker-Garderobe und Hilfe per Browserprüfung bestätigt; Textkontrast visuell geprüft. UI-Variablen gelten auch für das Ergebnis.

### CR-005 · Kleidung und Landschaften trennen

- **Status:** Erledigt
- **Quelle:** [INBOX-20260919-092816-4da065](../inbox/INBOX-20260919-092816-4da065.md)
- **Umfang / Abnahmekriterien:** Zwei Garderobenbereiche, Acker ohne Original-Präfix; vorhandene Käufe und Spielstände erhalten.
- **Prüfplan:** Chromium-Integration, relevante mobile Screenshots und Prüfung der Export-Metadaten; SPEC-001 Dokumentprüfung.
- **Prüfergebnis:** Sechs Kleidungseinträge getrennt von drei vorhandenen Landschaften; bestehende Käufe, Guthaben, Anziehen, Nachtmodus und Speicherung bestehen die Integration. Acker-Bezeichnung gekürzt.

### SPEC-001 · Drei Landschaften gegen Schrott planen

- **Status:** Erledigt
- **Quelle:** [INBOX-20260919-092816-4da065](../inbox/INBOX-20260919-092816-4da065.md)
- **Umfang / Abnahmekriterien:** Drei rein kosmetische Landschaftskonzepte mit vorläufigen Schrottkosten dokumentieren; noch kein Kauf-/Rendercode.
- **Prüfplan:** Chromium-Integration, relevante mobile Screenshots und Prüfung der Export-Metadaten; SPEC-001 Dokumentprüfung.
- **Prüfergebnis:** Drei Konzepte, vorläufige Schrottpreise, Migration und unveränderte Spielphysik in docs/specifications/landscapes.md dokumentiert. Umsetzung ausdrücklich offen.

### CR-006 · Flugkarte lesbar und bildfüllend zeigen

- **Status:** Erledigt
- **Quelle:** [INBOX-20260919-093319-773b76](../inbox/INBOX-20260919-093319-773b76.md)
- **Umfang / Abnahmekriterien:** Kreditkartenformat, aktuelle Looks und ID erhalten; Prüfcode-Erklärung aus Teildialog entfernen, Aktionen oben, Bild größer und Beschriftung lesbarer.
- **Prüfplan:** Chromium-Integration, relevante mobile Screenshots und Prüfung der Export-Metadaten; SPEC-001 Dokumentprüfung.
- **Prüfergebnis:** Vorschau, Aktionsleiste ohne überlappenden Titel, PNG-Export, echte Looks, Prüfmetadaten und lokale Bildprüfung bestanden. Native Teilen-API simuliert; Geräteprüfung bleibt ergänzend offen.

## Abschluss der Folgekorrekturen

Dependency-Audit: sec-helper. 60 Kernprüfungen und komplette Chromium-Integration bestanden. Keine Browserfehler; relevante Screenshots angesehen. Wie zuvor kein isolierter Commit wegen überlappender uncommitteter Vorarbeiten. GitHub-/HTTPS-Publishing bleibt außerhalb dieses Auftrags.

### CR-007 · Talentübersicht ohne Scrollen

- **Status:** Erledigt
- **Quelle:** [INBOX-20260919-095537-197acb](../inbox/INBOX-20260919-095537-197acb.md)
- **Abnahmekriterien:** Alle zwölf Talente auf einer festen Übersicht. Details und drei einzeln anklickbare Stufen in separater Ansicht. Voraussetzungen verlinkt, Beziehungen sichtbar; keine Änderung an Punkten oder Spielständen.
- **Prüfplan:** Core- und Chromium-Tests; Größenwechsel, Touch, Abhängigkeiten, Speicherung und Export prüfen; mobile Ansichten ansehen.
- **Prüfergebnis:** Zwölf sichtbare Touch-Ziele und keine Scrollfläche bis 740×320 bzw. 320×740 im Browser geprüft. Drei einzelne Stufen in den Details, echte Touch-Zuweisung, Sprung zum Vorgänger und geschützte Rücknahme bestehen. Detail mit zwei alternativen Zugängen passt in alle getesteten Größen. Screenshots in Quer-/Hochformat angesehen. Physischer Handytest bleibt ergänzend offen.

### CR-008 · Flugkarte mit großen Run-Werten

- **Status:** Erledigt
- **Quelle:** [INBOX-20260919-095232-fa2ca7](../inbox/INBOX-20260919-095232-fa2ca7.md)
- **Abnahmekriterien:** Visitenkartenaufteilung mit großen Beschriftungen, weniger Kleingedrucktem und echten Looks. Prüf-ID/Metadaten erhalten.
- **Prüfplan:** Core- und Chromium-Tests; Größenwechsel, Touch, Abhängigkeiten, Speicherung und Export prüfen; mobile Ansichten ansehen.
- **Prüfergebnis:** Vier Werte in zwei Reihen mit 40-Pixel-Beschriftung/64-Pixel-Zahlen im Export, größeres Kartoffel-Emblem und weniger Kleingedrucktes. PNG, aktuelle Ausstattung, Bild-/Wertehash und lokale Verifikation bestehen. Mobile Vorschau angesehen. Physischer Handytest bleibt ergänzend offen.

### BUG-003 · Bestenliste und deutsche Menübezeichnung

- **Status:** Erledigt
- **Quelle:** [INBOX-20260919-095617-ece2fa](../inbox/INBOX-20260919-095617-ece2fa.md)
- **Abnahmekriterien:** Lokale Top 5 in einem Menüdialog erreichbar, leeren Zustand darstellen. Looks heißt Garderobe.
- **Prüfplan:** Core- und Chromium-Tests; Größenwechsel, Touch, Abhängigkeiten, Speicherung und Export prüfen; mobile Ansichten ansehen.
- **Prüfergebnis:** Menü mit sechs Zielen einschließlich lokaler Top 5 und Garderobe. Leerer Zustand und tatsächlicher gespeicherter Flug im Bestenlistendialog geprüft; mobile Ansicht angesehen. Physischer Handytest bleibt ergänzend offen.

## Abschluss: Talentübersicht und Rekorde

Dependency-Audit: sec-helper. 60 Kernprüfungen und vollständige Chromium-Integration bestanden, einschließlich 740×320 ohne Scrollen, Portrait, echter Touch-Eingabe und Flugkarten-Verifikation. Keine Browserfehler. Vorherige Zweigkarten durch die feste Übersicht ersetzt; Builds bleiben unverändert. Wegen derselben uncommitteten Vorarbeiten kein isolierter Commit, kein Push.

### BUG-004 · Talentdetails eine Ebene schließen

- **Status:** Erledigt
- **Quelle:** Chat: X in den Talentdetails soll zur Talentübersicht führen, auch nach einem Wechsel zu einem Vorgängertalent.
- **Abnahmekriterien:** X und Escape verlassen nur die Detailansicht. Übersicht bleibt offen und hält den Flug pausiert. Andere Dialoge behalten ihr Verhalten.
- **Prüfplan:** Chromium mit direktem Einstieg, Vorgängersprung, Escape und Touch-X während eines Flugs.
- **Prüfergebnis:** Bestanden: X bei direktem Einstieg und nach Vorgängersprung, Escape sowie echtes Touch-X im Flug. Übersicht bleibt allein geöffnet, Flug pausiert und Fokus kehrt zum gewählten Talent zurück. Physischer Gerätetest bleibt ergänzend offen.

### CR-009 · Responsive Flugkarte nutzt die Bildschirmbreite

- **Status:** Erledigt
- **Quelle:** Chat: Der teilbare Bildschirm ist am Handy zu klein und lässt links/rechts Platz ungenutzt.
- **Abnahmekriterien:** Karte wird für die verfügbare Fläche neu angeordnet, statt nur verkleinert; breite, normale und schmale Ansichten. Rotation aktualisiert Vorschau und exportiertes PNG. Große Run-Werte und aktuelle Ausstattung bleiben sichtbar; alte Prüfkarten bleiben prüfbar.
- **Prüfplan:** Mehrere Quer-/Hochformate, Rotation bei geöffnetem Dialog, PNG-Abmessungen und Hashprüfung sowie bestehende Browserregression.
- **Prüfergebnis:** Bestanden: sechs Handygrößen von 320×740 bis 932×430, Rotation bei offenem Dialog, mindestens 97 % Breitennutzung und 16 Pixel große Statistikbeschriftungen. Dynamische PNG-Maße und Werte-/Bildhash nach jedem Größenwechsel geprüft. Quer- und Hochformatansichten angesehen. Physischer Gerätetest bleibt ergänzend offen.

## Abschluss: Zurück-Navigation und adaptive Flugkarte

Dependency-Audit: sec-helper. 60 Kernprüfungen und vollständige Chromium-Integration bestanden; keine Browserfehler. PNG-Prüfer unterstützt weiterhin die beiden früheren Formate. Kein isolierter Commit wegen der überlappenden uncommitteten Vorarbeiten; kein Push.

### FR-005 · Spielername im Menü

- **Status:** Erledigt
- **Quelle:** Chat: Namen im Menü eingeben und bis zur Änderung für die Bestenliste verwenden.
- **Problem / Umfang:** Rekorde haben bisher keinen Spielernamen. Ein kompaktes Namensfeld ergänzt das bestehende Menü und wird lokal gespeichert.
- **Abnahmekriterien:** Neue Flüge übernehmen den Namen beim Abschuss; bestehende Einträge behalten ihren Namen. Leere Namen erhalten einen Standardnamen, alte Spielstände bleiben kompatibel. Namen werden sicher als Text dargestellt.
- **Prüfplan:** Speicherung, Migration, Namenswechsel während eines Flugs und Bestenlisten-Zuordnung im Kern prüfen; Eingabe und mobile Darstellung im Browser prüfen.

- **Prüfergebnis:** 62 Kernprüfungen und vollständige Chromium-Integration bestanden. Namenseingabe, sichere Textdarstellung und tatsächlicher Bestenlisteneintrag im Browser geprüft; mobile Menü- und Bestenlistenansicht angesehen. Speicherung, Migration und Namenswechsel während eines Flugs im Kern geprüft. Physischer Handytest bleibt ergänzend offen.

Dependency-Audit: sec-helper. Kein isolierter Commit wegen überlappender uncommitteter Vorarbeiten; kein Push.

### CR-010 · Flugkarte mit breitem Werteband

- **Status:** Erledigt
- **Quelle:** Chat: Flugkarte am Handy weiterhin schwer lesbar, seitlichen Platz stärker nutzen.
- **Problem / Umfang:** Die vier Nebenwerte drängen sich rechts neben einem weitgehend leeren Mittelteil. Die neue Querformatkarte verteilt sie über die gesamte Breite; Entfernung und Kartoffel stehen darüber. Größere Beschriftungen auch im Hochformat.
- **Abnahmekriterien:** Entfernung, Rekord, Höhe, Pflanzen und Schrott deutlich lesbar auf kleinen Handys; aktuelle Looks, Rotation, PNG und Prüfsummen bleiben erhalten.
- **Prüfplan:** Browserprüfung mehrerer Handygrößen, Screenshotprüfung und Export-Verifikation.

- **Prüfergebnis:** Vollständige Chromium-Integration bestanden, keine Browserfehler. Sechs Handygrößen mit mindestens 20 CSS-Pixel großen Wertebeschriftungen, Rotation, Breitenfüllung und Export-Prüfsummen geprüft. Screenshots in schmalem Querformat, Pixel-ähnlichem Querformat und Hochformat angesehen. Ein physischer Handytest bleibt ergänzend offen.

Dependency-Audit: sec-helper. Kein isolierter Commit wegen überlappender uncommitteter Vorarbeiten; kein Push.

### FR-006 · Fluglinks, Wiederholungen und Talentübernahme

- **Status:** Erledigt
- **Quelle:** Chat: Teilen mit Spiel-Link; deterministische Wiederholungen aus Link und Bestenliste; Talente getrennt importieren.
- **Umfang:** Versionierte Aufzeichnung von Startwerten, Zufallswerten, Wind, Ausrüstung, Looks und Eingaben auf festen Simulationsschritten. Wiedergabe ohne Belohnungen oder Spielstandänderung. Link kopieren als Browser-Fallback; native Freigabe inklusive Link. Explizite Talentübernahme mit Punkt- und Voraussetzungskontrolle.
- **Abnahmekriterien:** Aufgezeichnete Flüge reproduzieren Ergebnis und Eingaben; Linköffnung überschreibt keine Talente. Alte Rekorde bleiben lesbar. Ungültige/fremde Versionen werden erklärt statt falsch abgespielt. Import erfolgt nur per eigenem Knopf und innerhalb verfügbarer Punkte.
- **Prüfplan:** Determinismus bei verschiedenen Bildraten, Link-Roundtrip und Validierung, Persistenz, Replay-Isolation, Importgrenzen, Browser-Fallbacks und Handyansichten.

- **Prüfergebnis:** 66 Kernprüfungen und vollständige Chromium-Integration bestanden. Identische Ergebnisse und Eingaben bei 30/60/144 Hz, Startzerstörung, Notsprengung, gespeicherte Replays, Link-Roundtrip, Versionen/ungültige Daten sowie atomare Talentimporte geprüft. Browser bestätigt unveränderten Spielstand beim Öffnen/Abspielen, Fortsetzen eines eigenen Flugs, Vollbild, mobile Wiedergabe und Link-/Zwischenablage-Fallbacks. Relevante Screenshots angesehen; native Ziel-Apps bleiben ergänzend am echten Gerät zu testen.

Dependency-Audit: sec-helper. Keine neuen Abhängigkeiten. Kein isolierter Commit wegen überlappender uncommitteter Vorarbeiten; kein Push.
