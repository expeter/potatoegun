# Kartoffelkanone · Tickets

Arbeitsweise: [Workflow](workflow.md). Neue Inbox-Meldungen werden nach ausdrücklichem Triage-Auftrag hier zugeordnet. Die Inbox-Meldungen vom 19.09.2026 sind nach Thema zusammengefasst; Folgekorrekturen behalten eigene stabile IDs.

| ID | Status | Thema | Quelle |
| --- | --- | --- | --- |
| CR-013 | Erledigt | Browser-Spielfeld und Ergebnis ohne Scrollen | Chat 02.10.2026 |
| CR-015 | Erledigt | Pilotenschild mit direktem Namenswechsel | Chat 02.10.2026 |
| CR-014 | Erledigt | Lokale/weltweite Platzierung im Ergebnis | Chat 02.10.2026 |
| FR-009 | Erledigt | Dezente weltweite Rekordmeldungen | Chat 02.10.2026 |
| BUG-010 | Erledigt | Weltweite Bestenliste auf Startseite | Chat 02.10.2026 |
| BUG-011 | Erledigt | Zweifarbige Wortmarke auf Flugkarte | Chat 02.10.2026 |
| BUG-009 | Erledigt | Loslassen an Leistungsumkehr schießt zuverlässig | Chat 02.10.2026 |
| BUG-008 | Erledigt | Unsichtbarer modaler Dialog blockiert Vollbild-Eingaben | Chat 02.10.2026 Chrome/Windows |
| BUG-007 | Erledigt | Vollbild-Werkzeugleiste nach Flug per Maus erreichbar | Chat 02.10.2026 |
| BUG-001 | Erledigt | Viewport und erreichbare Bedienung | Inbox 085611 |
| CR-001 | Erledigt | Einheitliche Menüs und Aktionsleiste | Inbox 085855, 090216, 090322 |
| CR-002 | Erledigt | Lesbare Talentzweige mit Voraussetzungen | Inbox 085535 |
| CR-003 | Erledigt | Direkt im Feld per Touch laden und schießen | Inbox 085734 |
| FR-004 | Erledigt; Gerätetest offen | Homescreen-Start ohne Browserleiste | Chat 19.09.2026 |
| FR-003 | Erledigt | Lokales Flugbuch mit zwölf Statistiken | Inbox 085535 |
| CR-004 | Erledigt | Talentkarten und kompakte Kopfzeile | Neue Inbox-Belege |
| BUG-002 | Erledigt | Dialogkontrast im Acker | Neue Inbox-Belege |
| CR-005 | Erledigt | Kleidung und Landschaften | Neue Inbox-Belege |
| SPEC-004 | Erledigt | API-Sicherheitsaudit und Behebung | Chat 20.09.2026 |
| SPEC-003 | Erledigt | API vorsichtig auf bestehendem VPS bereitstellen; Pages-Fluglinks | Chat 20.09.2026 |
| SPEC-002 | Erledigt; VPS/Gerätetest offen | MiniZap-Verzeichnisstruktur, API und Einstieg | Chat 20.09.2026 |
| SPEC-001 | Erledigt | Drei Schrott-Landschaften planen | Neue Inbox-Belege |
| CR-006 | Erledigt | Lesbare Flugkarte | Neue Inbox-Belege |
| CR-007 | Erledigt | Feste Talentübersicht ohne Scrollen | Inbox-Folgefeedback |
| CR-008 | Erledigt | Flugkarte mit großen Werten | Inbox-Folgefeedback |
| BUG-003 | Erledigt | Bestenliste und Garderobe | Inbox-Folgefeedback |
| FR-007 | Erledigt | DE/EN, Browsererkennung und globaler Sprachschalter | Chat 20.09.2026 |
| FR-008 | Erledigt | Neue Version erkennen und sicheres Neuladen anbieten | Chat 20.09.2026 |
| CR-011 | Erledigt; GitHub-Name bleibt vorerst | Domain korrigieren und dezente Versionsanzeige | Chat 20.09.2026 |
| BUG-005 | Erledigt; Samsung-Flugprüfung offen | Automatische Rekorde und geräteübergreifende Replay-Prüfung | Chat 20.09.2026 |
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


### SPEC-002 · MiniZap-Verzeichnisstruktur, API und Einstieg

- **Status:** Erledigt; Live-Bereitstellung und native Installation am Gerät offen
- **Quelle:** Chat 20.09.2026: Spezifikation schreiben und direkt umsetzen; nur Kartoffelkanone.
- **Problem:** Frontend liegt im Repository-Root; lange Replay-Links transportieren alle Daten; Installation ist schwer auffindbar.
- **Erwartung/Umfang:** [Spezifikation](specifications/minizap-api.md), gemeinsame Simulation, SQLite-API mit geprüften kurzen Fluglinks und ausdrücklicher Veröffentlichung, Start-/Installationsoberfläche, statische Auslieferung und VPS-Vorlagen.
- **Abnahme:** Bestehende Tests bleiben grün; echte API-Persistenz, Replay-Prüfung, Kurzlink-Auflösung und öffentlicher Rang geprüft; lokale/alte Flüge funktionieren weiter. Keine DNS- oder Live-Änderung.
- **Prüfplan:** sec-helper audit; Core-/API-Tests; Chromium mit Desktop/Handy-Ansichten, Start, Installationserklärung, Kurzlink und Bestenliste. Native Installation separat am Gerät; VPS/TLS separat bei Bereitstellung.

Dependency-Audit: sec-helper.

- **Prüfergebnis:** sec-helper audit ohne Befund; 66 Kernprüfungen und 4 API-Integrationstests bestanden. Datenpersistenz, gleichzeitige Duplikate, öffentliche Rangfolge, Backup/Restore samt SQLite-Integrität, falsche Ergebnisse, Engine-Versionen, CORS, Größen-/Anfragelimits und Worker-Timeout geprüft. Vollständige Chromium-Suite bestanden: alte Links/lokale Spielstände, Start-/Installationsoberfläche, simulierte installierte Ansicht, echte Kurzlinks, Online-Bestenliste, ausdrückliche Veröffentlichung, native Freigabe mit kurzem Link und Offline-Fallback. Desktop-/Handy-Screenshots angesehen. Gemeinsame Simulationsdateien bytegleich zum bisherigen Stand; statisches Artefakt ohne Server/Daten/Geheimnisse. Kein Push und keine Live-Änderung.


### SPEC-003 · API auf gemeinsamem VPS, Frontend auf GitHub Pages

- **Status:** Erledigt; Frontend nach Freigabe in SPEC-004 gepusht und veröffentlicht
- **Quelle:** Chat 20.09.2026: Inbox starten; API deployen, bestehendes les.bar und asgard.website schützen.
- **Umfang:** Pages-kompatible `?flight=<ID>`-Links; separate API mit eigenem Nutzer, Daten-/Releaseverzeichnis, isolierter vorhandener Node-24-Laufzeit und Ressourcenlimits; nur zusätzlicher Caddy-Host. Kein Upgrade gemeinsamer Runtimes, keine Änderungen an vorhandenen App-Daten oder Service-Units.
- **Prüfplan:** Abhängigkeitsaudit, Core/API/Browser; Caddy-Konfigurationsbackup und Validierung vor graceful reload; vorher/nachher Service-PIDs und HTTP-Antworten prüfen; API HTTPS, CORS und ungelisteten Replay-Roundtrip testen. Keine öffentliche Testbestenliste.

- **Prüfergebnis:** API über HTTPS live, CORS und ungelisteter Replay-Roundtrip erfolgreich. 70 lokale Core/API-Tests sowie Chromium-Suite bestanden; 4 API-Tests zusätzlich auf dem VPS. sec-helper audit lokal und remote ohne Befund. Caddy vor/nach Snapshot und Validierung; alle bestehenden Service-PIDs/Startzeiten und geprüften HTTP-Statuscodes unverändert. Eigene SQLite-Sicherung erfolgreich, täglicher Backup-Timer aktiv. [Betriebsprotokoll](../deploy/production.md). Inbox läuft lokal, keine automatische Verarbeitung. Kein Git-Push; Frontend-Publishing bleibt separat.

Dependency-Audit: sec-helper.


### SPEC-004 · API-Sicherheitsaudit

- **Status:** Erledigt
- **Quelle:** Chat 20.09.2026: Push freigegeben, anschließend API-Audit.
- **Umfang:** Quellcode, HTTP-Eingaben, Replay-Regeln, Ressourcen-/Speichergrenzen, Laufzeit-Advisories, Prozessrechte und Live-Konfiguration. Funde mit Regressionstests beheben, isoliert deployen; bestehende VPS-Dienste erhalten.
- **Prüfplan:** Missbrauchsszenarien nur lokal, normale Smoke-Requests live; sec-helper für Runtime-Update, Core/API/Browser, VPS-Testlauf, Backup und gezielter API-Neustart mit Rollback.

- **Ergebnis:** Sechs Audit-Funde dokumentiert und behoben; 78 Core/API-Tests und Chromium bestanden, 12 API-Tests auf VPS. Runtime 24.21.0 über sec-helper installiert/auditiert; anfänglich abgewiesene kopierte Installation vor Aktivierung durch bewachte Installation ersetzt. Sicherheitsrelease live, HTTPS-Replay und Backup geprüft, bestehende Dienste/Caddy unverändert. [Auditbericht](security/api-audit-2026-09-20.md). Frontend-Push 7cd008f mit erfolgreichem Pages-Workflow bestätigt.

Dependency-Audit: sec-helper.

### BUG-005 · Handy-Replays und automatische Rekorde

- **Status:** Erledigt; konkreter Samsung-Flug/physischer Gerätetest noch nicht verifiziert
- **Quelle:** Chat: valider Samsung-Webapp-Flug abgelehnt; neue Rekorde ohne weiteren Veröffentlichungsklick eintragen.
- **Problem:** Exakter Zahlenvergleich lehnt selbst winzige geräteabhängige Rundungsabweichungen ab; Online-Eintrag verlangt einen zweiten Klick.
- **Umfang:** Feste Toleranz 0,000001 ausschließlich für kontinuierliche Ergebniswerte, unveränderte exakte Tick-/Aktions-/Zählerprüfung und serverberechnete Weite. Persönliche Bodenrekorde mit Gegenverkehr automatisch veröffentlichen; lokale Warteschlange mit begrenzten Wiederholungen bei temporären Fehlern, vorhandenen besten kompatiblen Flug nachholen. Kein Veröffentlichungsbutton.
- **Abnahme/Prüfplan:** Simulierte Math-Rundungsabweichungen akzeptieren, veränderte Ergebnisse/Zähler/Ticks weiter ablehnen. API wertet eigene Weite. Automatische Veröffentlichung, Offline-Wiederholung und Neuladen testen. Core/API/Browser, geschütztes API-Deployment, Push/Pages prüfen. Genaues Samsung-Replay und physischer Gerätetest stehen aus.

Dependency-Audit: sec-helper.

- **Prüfergebnis BUG-005:** 69 Kern- und 13 API-Tests bestanden, darunter 100 simulierte Rundungsvarianten; vollständige Chromium-Suite mit automatischem Offline-Nachholen über echte API bestanden, Ergebnisansicht geprüft. sec-helper lokal/remote ohne Befund. API-Release `replay-v1` live, 13 VPS-Tests und ungelisteter HTTPS-Roundtrip bestanden; Backup erstellt, Blog/Asgard/Caddy unverändert.


### CR-011 · Domain und Spielversion

- **Status:** Erledigt; GitHub-Name bleibt vorerst
- **Quelle:** Chat: Subdomain von potatoe auf potato korrigieren; dezente Versionsanzeige. Nutzer bestätigt, dass Teilen mit Chrome-Installation funktioniert.
- **Umfang:** `potato.minizap.online` als Produktionsadresse und Ziel neuer Kurzlinks. API-Origin/Freigabe aktualisieren; bisherige Adresse übergangsweise weiterhin für API-Zugriff zulassen. Kleine Versionsanzeige `v0.6.0` am unteren Menürand, auch in installierter Ansicht erreichbar. API-Pfad `/v1/potatoe` bleibt für bestehende Clients kompatibel.
- **Prüfplan:** sec-helper; API-Tests und Browser-Suite; isoliertes API-Deployment mit Backup, CORS beider Origins prüfen, bestehende VPS-Dienste erhalten; Push/Pages und neue HTTPS-Adresse prüfen. DNS/Pages-Domain stellt der Nutzer um. Lokaler Fortschritt und installierte App bleiben an die alte Origin gebunden.

**Prüfergebnis:** sec-helper lokal/remote ohne Befund; 13 API-Tests lokal und auf VPS sowie vollständige Chromium-Suite bestanden. Mobile Versionsanzeige angesehen. Release `domain-v1` live; CORS beider Origins und neue Kurzlink-Domain bestätigt, bestehende VPS-Dienste unverändert. Englisch ausschließlich als FR-007 spezifiziert. GitHub-Umbenennung später ausdrücklich verschoben.

Dependency-Audit: sec-helper.


### FR-007 · Englisch und globale Sprachwahl

- **Status:** Erledigt; Umsetzung durch Folgeauftrag freigegeben
- **Quelle:** Chat 20.09.2026: Englisch, eventuell Browsererkennung und zwei Länderflaggen zum globalen Umschalten; korrekter Namensumzug hat Vorrang.
- **Problem/Ziel:** Aktuell ist die Oberfläche ausschließlich deutsch. Nutzer sollen automatisch eine passende Sprache erhalten und jederzeit zwischen Deutsch und Englisch wählen können.
- **Umfang:** [Sprach-Spezifikation](specifications/languages.md): DE/EN-Texte, Browserpräferenzen, persistente manuelle Wahl, zwei zugängliche Flaggen-/Sprachschalter und lokalisierte Anzeigen ohne Verlust von Spielzustand.
- **Abnahme/Prüfplan:** In der Spezifikation festgehalten; keine Laufzeitänderung und keine neuen Tests in diesem Auftrag.

- **CR-011 Live-Nachprüfung:** Commit `5b720b3` erfolgreich über Pages veröffentlicht; `https://potato.minizap.online` liefert HTTPS 200 und die Versionsanzeige v0.6.0. Domain-/API-Umzug abgeschlossen. Repository heißt weiterhin `expeter/potatoegun`; Umbenennung und Remote-Anpassung sind auf ausdrücklichen Nutzerwunsch verschoben; der Name bleibt `potatoegun`.


### FR-008 · Versionsprüfung und Aktualisierung

- **Status:** Erledigt
- **Quelle:** Chat 20.09.2026: App soll neue Version erkennen und Upgrade/Reload vorschlagen. Repository-Umbenennung ausdrücklich verschoben.
- **Umfang:** Kleine statische Versionsdatei mit Versionsnummer und Build-ID; Prüfung beim Start und bei Rückkehr/regelmäßig mit fünf Minuten Mindestabstand. Hinweis mit manuellem Aktualisieren in Start-/Spielmenü. Kein automatisches Neuladen, kein Reload während eines Flugs, Ladens oder einer unterbrochenen Spielsitzung in Replay. Fortschritt vor Reload speichern, Sprache/Fluglink erhalten. Versionierte Modul-/CSS-URLs verhindern gemischte Releases aus dem Browsercache.
- **Prüfplan:** Offline-/ungültige/gleiche/neue Version, begrenzte parallele Prüfungen, Update im laufenden Flug gesperrt, manueller Reload nach Rundenende erhält Fortschritt und Sprache. Lokale Core-/Browserprüfungen; Pages-Artefakt und Liveversion prüfen.

Dependency-Audit: sec-helper.


- **Prüfergebnis FR-007/FR-008:** 69 bestehende Kernprüfungen, 5 Sprach-/Updateprüfungen und 13 API-Tests bestanden (87 insgesamt). Vollständige Chromium-Suite bestanden: DE/EN-Browserpräferenz, manuelle Wahl über Reload, Sprachwechsel im pausierten Flug ohne Spielstandsänderung, unveränderte Spielernamen, englische Karten samt Sprachwechsel, gesperrtes Update während Flug und echter manueller Reload nach Rundenende mit erhaltenem Spielstand/Sprache. Gesperrter Speicher funktioniert weiterhin. Handy-/Kartenansichten geprüft; 44-Pixel-Touchflächen und kompakte Dialoge erhalten. Finaler Einzelcheck für Singulartext und sichtbare Sprachschalter bestanden. Pages-Assembly mit Commit-ID, Versionsdatei und versionierten Imports geprüft. Keine Änderung an Shared-Physik, API oder VPS. Native Geräteprüfung dieser neuen Funktionen nicht durchgeführt.


### BUG-006 · Globale Bestenliste und Installation im Vollbild

- **Status:** Erledigt
- **Quelle:** Chat 02.10.2026: globale Bestenliste im Browser/Vollbild prüfen; „Zum Startbildschirm hinzufügen“ im Hauptmenü versetzt.
- **Problem/Umfang:** Globale Flüge stehen unter lokalen Daten als schmale, ungleichmäßige Knöpfe. Installation sitzt ohne Abstand direkt über Menüeinträgen. Rang/Name/Weite/Wiedergabe in einheitlichen Zeilen und separate Einstellungszeile für Installation/Vollbild.
- **Abnahme/Prüfplan:** Echte globale Daten im Chromium-Browser betrachten; DE/EN in nativem Vollbild auf Desktop, schmalem Hochformat und kurzem Querformat. 20 Einträge, lange/unvertraute Namen, letzter Rang scrollbar erreichbar; Bedienelemente ohne Überlappung. `tools/check.sh`.

### CR-012 · Globale Standardansicht und kompakte Menüoptionen

- **Status:** Erledigt
- **Quelle:** Chat 02.10.2026: weltweit statt lokal als Standard, kompaktere Talente, Vollbildbutton und Sprache nur im Menü.
- **Umfang:** Jede Öffnung der Bestenliste wählt „Weltweit“; Geräte-Top-5 separat anwählbar, auch offline. Zwölf Talentkarten passen die Panelhöhe ihrem Inhalt an, mindestens 44 Pixel Touchfläche. Vollbild/Verlassen im Hauptmenü mit aktuellem Zustand und Sprachwahl ausschließlich dort. Keine Änderung an Flugphysik, Datenformaten oder API.
- **Abnahme/Prüfplan:** Nativer Fullscreen über den echten Menükopf, DE/EN, gespeicherte Sprache/Spielstände, lokale/globale Replays und vollständige Regression mit `tools/check.sh`.

**Prüfergebnis BUG-006/CR-012:** 87 Kern-/API-/Sprachprüfungen und vollständige Chromium-Suite mit null Browserfehlern bestanden. Native Vollbildwechsel über den echten Menüknopf; DE/EN auf 1280×800, 844×390, 740×320 und 320×740 geprüft. Globale Standardansicht, Geräte-Umschaltung, 20 Einträge mit langen und HTML-artigen Namen als Klartext, letzte Zeile scrollbar erreichbar, alle zwölf kompakten Talent-Touchflächen ≥44 Pixel. Live-Bestenliste zunächst auf Produktion angesehen, anschließend dieselben echten globalen Daten im reparierten lokalen UI betrachtet. Screenshotprüfung ergänzte nicht schrumpfende Ranglistenzeilen und kompakten Landscape-Menüabstand. Keine native Mobilgeräteprüfung und keine Abhängigkeitsänderung.


### BUG-007 · Vollbild-Werkzeugleiste nach Flug per Maus erreichbar

- **Status:** Erledigt
- **Quelle:** Chat 02.10.2026: obere rechte Knöpfe im Vollbild nicht mit Maus erreichbar.
- **Reproduktion:** Nativer Vollbildstart; kurzer Flug bis zur Auswertung. `showResult` setzt die Werkzeugleiste auf `inert`; Ergebnisschatten liegt zusätzlich über den Knöpfen. Menü lässt sich per echter Maus nicht öffnen.
- **Umfang:** Werkzeugleiste bleibt bedienbar, Ergebnisfläche hält Abstand, Flugaktionen/Canvas bleiben gesperrt. Ergebnis ist kein modaler Dialog mehr; echte modale Menüs sperren weiterhin den Hintergrund.
- **Prüfplan:** Echte Mausbewegung/-klicks in nativem Chromium-Vollbild vor/nach Flug auf 1280×800, 844×390, 320×740; Hit-Tests für alle vier Knöpfe, Ton/Musik, Talente, Menü, Vollbild verlassen ohne Ergebnisverlust. Vollständige Regression mit `tools/check.sh`. Keine Abhängigkeitsänderung; sec-helper lokal nicht verfügbar.

- **Prüfergebnis:** 87 Kern-/API-/Sprachtests und vollständige Chromium-Suite bestanden, null Browserfehler. Native Vollbild-Mauschecks auf allen drei Größen bestanden; Screenshots zeigen Werkzeugleiste frei über dem Ergebnisschatten ohne Panelüberlappung. Keine native Geräteprüfung.


### BUG-008 · Unsichtbarer modaler Dialog blockiert Vollbild-Eingaben

- **Status:** Erledigt
- **Quelle:** Chat 02.10.2026: aktuelles Chrome auf Windows; direkt nach Vollbildklick gesamtes Spiel unbedienbar, nur Escape beendet Vollbild.
- **Reproduktion:** Hauptmenü mit `showModal()` öffnen, Vollbildbutton tatsächlich mit Maus klicken. Das Menü bleibt modal offen hinter dem später in die Top-Layer aufgenommenen `flight-panel`. Hit-Tests treffen keinen Werkzeugknopf, Sound bleibt unverändert. Frühere Testhilfe schloss das Menü nach dem Wechsel explizit und maskierte den Fehler.
- **Umfang:** Menü synchron vor Fullscreen-API-Aufruf schließen, Klick-Geste erhalten; bei Verweigerung Menü wieder öffnen. Testhilfe darf kein Menü nach dem Wechsel schließen.
- **Prüfplan:** Native Chromium-Vollbildwechsel über Maus; sofortige Hit-Tests, erneutes Menüöffnen, echter Schuss bis Ergebnis, alle vier Werkzeugknöpfe und Vollbild verlassen. 1280×800, 844×390, 320×740; verweigerter Vollbildaufruf und erneuter echter Wechsel. `tools/check.sh`; Live-Prüfung. Keine Abhängigkeiten geändert; sec-helper lokal nicht verfügbar. Chromium auf Linux, keine native Windows-Prüfung.


### CR-013 · Browser-Spielfeld und Ergebnis ohne Scrollen

- **Status:** Erledigt
- **Quelle:** Chat 02.10.2026: Browser-Spielbereich höher, Standard-Todesansicht ohne Scrollen; weniger ungenutzter Platz oben/unten.
- **Umfang:** Kürzere Seitenkopf-/Introfläche, höheres Browser-Spielfeld, breitere und kompaktere Ergebnisfläche mit allen Aktionen. Mindestziel sind Desktop-Browser ab 1024×768; Fullscreen-/Handy-Regeln bleiben separat.
- **Prüfplan:** Echter maximaler Abschuss mit Startschaden und vollständiger Auswertung inklusive Installationshinweis, DE/EN bei 1024×768, 1366×768, 1440×900. Keine horizontale/vertikale Ergebnis-Scrollfläche, alle Aktionen innerhalb des Panels, Spielfeld vollständig im Viewport. Screenshots und `tools/check.sh`.

**Prüfergebnis BUG-008/CR-013:** 87 Kern-/API-/Sprachtests und vollständige Chromium-Suite bestanden, null Browserfehler. Testhilfe prüft fehlenden modalen Dialog nach echtem Maus-Vollbildwechsel und schließt ihn nicht selbst. Sofortige Maus-Hit-Tests, Laden/Startschaden, Werkzeugknöpfe, wiederholter Wechsel und Wiederherstellung nach verweigertem Vollbild bestanden. Vollständige Standard-Todesansicht inklusive Installationshinweis passt auf allen drei Desktopgrößen in DE/EN ohne Panel-Scrollen; Spielfeld bleibt im sichtbaren Viewport. Screenshots angesehen. Keine native Windows-Geräteprüfung.


### BUG-009 · Loslassen an Leistungsumkehr schießt zuverlässig

- **Status:** Erledigt
- **Quelle:** Chat 02.10.2026: manchmal keine Reaktion beim Loslassen am oberen Umkehrpunkt der Ladeleistung.
- **Befund/Reproduktion:** Browsertrace zeigt `lostpointercapture` während Laden vor `pointerup`; bisher setzt dieser Capture-Verlust die Phase auf bereit und verwirft anschließend das Loslassen. Ladeleistung selbst bleibt vor/auf/nach dem Umkehrpunkt gültig.
- **Umfang:** Globale, an den ladenden Pointer gebundene Loslassbehandlung; Capture-Verlust allein beendet den Druck nicht. Echte Abbrüche (Pointer-Abbruch, Fokus-/Viewportverlust, Dialog) bleiben Abbrüche. Jeder passende Release löst genau einen registrierten Schuss aus; Ladeenergie/Startschaden/Physik bleiben unverändert.
- **Prüfplan:** Chromium-Maus, Touch, Tastatur unmittelbar vor/auf/nach 1,65 Sekunden; Capture-Verlust mit anschließendem Loslassen außerhalb von Button/Canvas; keine Doppel-/Fremdpointer-Schüsse, echte Abbrüche bleiben ohne Schuss. `tools/check.sh`. Keine Abhängigkeiten geändert; sec-helper lokal nicht verfügbar.

- **Prüfergebnis BUG-009:** 87 Kern-/API-/Sprachtests und vollständige Chromium-Suite bestanden, null Browserfehler. 27 Release-Szenarien: Maus/Touch auf Button und Canvas, Tastatur, 1649/1650/1651 ms, mit/ohne Capture-Verlust. Capture-Zuweisung entfernen und `lostpointercapture` gezielt auslösen; tatsächliche CDP-Maus-/Touch-Releases außerhalb des Buttons registrieren genau einen Schuss. Fremdpointer, doppelte Releases und echter Pointer-Abbruch geprüft. Bestehende Blur-/Resize-/Dialog-/Touchcancel-Checks bestanden. Kein nativer Mobilgerätetest.


### FR-009 · Dezente weltweite Rekordmeldungen

- **Status:** Erledigt
- **Quelle:** Chat 02.10.2026: neue Highscore-Einträge mit Namen/Weite und abwechslungsreichen Sprüchen rechts unten; keine Meldungsflut, Polling ca. 10 Sekunden.
- **Umfang:** Bestehende globale Top-20-API gemeinsam für Startseite, Menü und Benachrichtigung abfragen. Initiale Einträge stumm; neue IDs erkennen, mehrere neue Einträge in einer Meldung bündeln (beste neue Weite + Anzahl). Maximal eine Meldung pro zehn Sekunden, nach 5,5 Sekunden verschwinden. Hintergrund-/Offline-Nachholungen stumm, keine Queue, Fehler-Backoff bis 60 Sekunden, keine überlappenden Requests. DE/EN, Namen als Klartext, Vollbild-Toast innerhalb des Spielfelds ohne Eingabesperre. Lokale Rekorde bleiben im Menü erreichbar.
- **Prüfplan:** Deterministische Modulprüfungen für Baseline, Burst, Deduplizierung, Rate/Backoff, Hintergrund/Resume und parallele Aufrufe. Browser mit echten Poll-Ticks und wechselnden API-Snapshots, DE/EN, Desktop/Touch/Vollbild und Nicht-Überlappung mit Flugknöpfen. `tools/check.sh`. Keine API-/Abhängigkeitsänderung; sec-helper lokal nicht verfügbar.

### BUG-010 · Weltweite Bestenliste auf Startseite

- **Status:** Erledigt
- **Quelle:** Chat 02.10.2026: „Die weitesten Knollen · lokale Top 5“ zeigt noch lokale Daten.
- **Umfang:** Startseite zeigt globale Top 5 mit ehrlicher Lade-/Offline-Anzeige, keine lokalen Daten unter weltweiter Überschrift. Gemeinsame Datenquelle mit globalem Menü, Geräte-Rekorde dort separat.

### BUG-011 · Zweifarbige Wortmarke auf Flugkarte

- **Status:** Erledigt
- **Quelle:** Chat 02.10.2026: Kartoffelkanone auf Webseite zweifarbig, Export nur einfarbig.
- **Umfang:** Exporttitel teilt Kartoffel/Kanone bzw. Potato/Cannon in zwei Farbsegmente; orange Akzent wie Webseite, heller erster Teil für Kontrast auf dunkler Karte. Alle drei Kartenformate und Prüfsummen bleiben gültig.
- **Prüfplan:** Browser-Export in DE/EN und breitem/normalem/Hochformat; Pixelprüfung beider Titel-Farben, PNG-Prüfnachweis und Screenshots.


### CR-014 · Lokale/weltweite Platzierung im Ergebnis

- **Status:** Erledigt
- **Quelle:** Chat 02.10.2026: Ergebnis zeigt lokalen und globalen Platz; goldene/silberne/bronzene Trophäe für Plätze 1–3, danach reine Platzinformation, ansprechendes Layout.
- **Umfang:** Kompakte Rang-Kacheln neben der Weite. Lokaler Platz in Geräte-Top-5 (außerhalb ehrlich „>5“, da ältere Geräteflüge nicht vollständig gespeichert sind), null/ungültige Flüge ohne Platz. Kleine öffentliche GET-Rangabfrage zählt alle gültigen globalen Einträge, auch jenseits der Top 20, mit derselben Tie-Break-Reihenfolge. Vorläufiger Vergleich bis zur Verifikation; danach exakter Platz des eingetragenen Fluges. Offline/Gegenverkehr-/Nullweitenzustände explizit, keine erfundene Position. SQL parametrisiert, keine Schema-/Runtime-/Abhängigkeitsänderung.
- **Prüfplan:** API-Ränge >20, Gleichstände, unlisted/verkehrsfreie/alte Flüge ausgeschlossen, ungültige Parameter. Browser-Ränge 1/2/3/23, farbige Pokale, bestätigte/vorläufige/Offline-Zustände, Desktop ohne Ergebnis-Scrollen sowie Touch-/Vollbildlayout. Alte Fluglinks/Upload-Prüfung bleiben gültig. `tools/check.sh` und VPS-API-Tests vor Aktivierung.
- **Audit-Umgebung:** sec-helper aktuell weder lokal noch im VPS-PATH/üblichen Installationspfaden verfügbar. Keine Abhängigkeitsänderung; isolierter VPS-Node v24.21.0 hat denselben SHA-256 wie der zuvor auditierte Runtime-Fingerabdruck in deploy/production.md. Keine Audit-Erfolgsaussage für dieses Update.


- **Prüfergebnis v0.8.0:** 96 Kern-/API-/Sprach-/Feed-Tests und vollständige Chromium-Suite bestanden, null Browserfehler. Browser prüft gemeinsame weltweite Top 5/20, stumme Baseline, gebündelte neue IDs, Deduplizierung, DE/EN, Namen als Klartext, Hinweisgrenzen in Desktop-/Quer-/Hochformat. Kartenexport in sechs DE/EN-/Seitenverhältnis-Kombinationen hat beide Titel-Farben und gültige Werte-/Pixel-Prüfsummen. Ergebnis zeigt unabhängig lokale Plätze 1/2/3/>5 und globale 1/2/3/23, bestätigten/vergleichenden/nicht erreichbaren Zustand; Todesansichten mit Installation passen weiterhin ohne Scrollen. Screenshots visuell geprüft. API zählt alle gültigen Einträge und stabile Gleichstände; alle 14 API-Tests vor Aktivierung auch auf VPS bestanden. HTTPS-Ränge passen zu allen 20 sichtbaren Einträgen und einem Platz jenseits der Top 20. Keine produktiven Test-Einträge angelegt. Test-Rangszenarien verwenden eigene API-Mocks, damit andere Integrationsfälle keine fremden Einträge erben; Offline-Link-Test wartet auf fertige PNG-Vorschau vor Mausklick. Kein nativer Windows-/Mobilgerätetest.


### CR-015 · Pilotenschild mit direktem Namenswechsel

- **Status:** Erledigt
- **Quelle:** Chat 02.10.2026: aktueller Name links unten als witziges Pilotenschild; Klick zeigt die Namensänderung im Menü.
- **Umfang:** Kompaktes „Lizenz zum Knollen“-Schild im Spielfeld, aktueller Name als Klartext. Öffnet Hauptmenü, fokussiert/markiert Namensfeld und hebt den Bereich kurz hervor. Eingaben aktualisieren das Schild sofort, auch nach Reload/Sprachwechsel. DE/EN, lange Namen ohne Überlappung, sichere Position über Aktionen auf schmalen Bildschirmen, volle Maus-/Touch-/Tastaturbedienung; während Ergebnis/Wiederholung ausgeblendet.
- **Prüfplan:** Chromium Desktop/Quer-/Hochformat und natives Vollbild, lange Namen, DE/EN, Klick/Touch/Enter, Namensfeld-Fokus und Auswahl, Persistenz und kein Schuss beim Menüzugriff. Relevante Screenshots ansehen; `tools/check.sh`.
- **Audit-Umgebung:** sec-helper weiterhin nicht verfügbar; keine Abhängigkeiten/Runtime/API geändert, kein neuer Audit-Erfolg behauptet.

- **Prüfergebnis CR-015:** 96 Modul-/API-/Sprachtests und vollständige Chromium-Suite bestanden, keine Browserfehler. Pilotenschild mit 24 Zeichen sowie HTML-ähnlichen Namen als Klartext in DE/EN bei 1280×900, 844×390, 740×320 und 320×740 geprüft; native Vollbildübergänge, echte CDP-Maus-/Touch-/Enter-Eingaben, Feldfokus/Auswahl, kurze Hervorhebung, direkte Aktualisierung, Persistenz und keine unbeabsichtigten Schüsse. Abschließende fokussierte Browserprüfung nach Umstellung des Siegels auf SVG bestätigt diese Fälle sowie Pause/Fortsetzen während eines Flugs und Ausblenden/Wiederherstellen bei Ergebnis/Wiedergabe. Screenshots visuell geprüft. Keine API-/Runtime-/Abhängigkeitsänderung; kein nativer Gerätetest.
