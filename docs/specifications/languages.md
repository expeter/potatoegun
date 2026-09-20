# FR-007 · Deutsche und englische Sprachversion

Status: Vorschlag, ausdrücklich nur dokumentieren; keine Implementierung beauftragt. Quelle: Chat 20.09.2026. Priorität nach dem Umzug auf den korrekten Domain-/Repository-Namen.

## Ziel und Bedienung

Das Spiel soll vollständig auf Deutsch und Englisch nutzbar sein. Zwei dezente, global erreichbare Sprachschalter mit 🇩🇪 DE und 🇬🇧 EN ermöglichen jederzeit den Wechsel. Die Flaggen erhalten sichtbare Sprachkürzel und zugängliche Namen „Deutsch“ / „English“; Auswahlzustand und Tastaturbedienung dürfen nicht allein von Farbe oder Flaggen abhängen. Englisch bezeichnet eine Sprache für alle Nutzer, keine regionale Zugriffsbeschränkung.

Beim ersten Besuch die geordnete Liste `navigator.languages` prüfen: erste unterstützte Sprache (`de` einschließlich regionaler Varianten oder `en` einschließlich regionaler Varianten) verwenden; ohne Treffer Englisch als vorgeschlagenen Fallback. Eine manuelle Wahl wird lokal gespeichert und hat bei späteren Besuchen Vorrang vor der Browsererkennung. Gesperrter Speicher darf weder Spielstart noch Sprachwechsel verhindern; dann gilt die Auswahl nur für die Sitzung. Die genaue Platzierung der beiden Schalter im kompakten Handy-/Vollbildlayout ist vor Umsetzung festzulegen; während eines Dialogs müssen sie ebenfalls erreichbar bleiben.

## Umfang der späteren Umsetzung

- Übersetzungsschlüssel und getrennte DE-/EN-Texte statt verteilter Bedingungen. Bestehende deutsche Texte bleiben inhaltliche Referenz.
- Start, Menüs, Spiel-HUD, Talente, Erfolge, Garderobe, Resultate, Bestenlisten, Replay-/Teilen-Ansichten, Installation, Fehlermeldungen sowie zugängliche Beschriftungen übersetzen.
- Zahlen, Einheiten und Pluralformen passend zur ausgewählten Sprache formatieren; `document.documentElement.lang` aktualisieren.
- Sprachwechsel ohne Neuladen: laufender Flug, Dialogzustand, Fortschritt, Name, Talente und Rekorde bleiben erhalten. Keine Änderung an Physik, Replay-Engine, API-IDs oder bestehendem Speicherschlüssel.
- Namen anderer Spieler und bereits veröffentlichte Inhalte nicht automatisch übersetzen. Neu erzeugte Flugkarten verwenden die gewählte Sprache; vorhandene Karten bleiben unverändert.
- API-Fehlercodes auf lokalisierte Texte abbilden, mit verständlichem Fallback für unbekannte Fehler. Kein Übersetzungsdienst und keine zusätzliche Netzwerkabhängigkeit.
- Installierte App und normale Browseransicht unterstützen. Ein geteilter Fluglink erzwingt keine Sprache beim Empfänger.

## Abnahmekriterien und Prüfplan

1. Deutsche und englische Browserpräferenzen einschließlich `de-DE`, `de-AT`, `en-GB`, `en-US` werden erkannt; gemischte Präferenzlisten, fehlende/andere Sprachen und manueller Vorrang sind geprüft.
2. Beide Schalter funktionieren mit Touch, Maus, Tastatur und zugänglichen Namen; aktive Sprache ist erkennbar. Mobile Quer-/Hochformatansichten und installierter Modus bleiben bedienbar.
3. Die manuelle Wahl übersteht Neustarts. Bei gesperrtem Speicher funktioniert der Wechsel weiterhin ohne Ausnahme.
4. Ein Wechsel während Flug, Wiederholung oder geöffnetem Dialog verliert keinen Zustand und verändert keine Wertung.
5. Vollständige Textinventur; keine sichtbaren Schlüssel oder versehentlich gemischten Sprachen. API-Fehler, Installation und Teilen einschließlich neu generierter Karten werden geprüft.
6. Abhängigkeitsaudit gemäß Projektregeln; relevante Kern-/API-/Browserprüfungen. Echte Geräteprüfung gesondert ausweisen.

Nicht enthalten: weitere Sprachen, Übersetzung von Spielernamen, Accounts/Cloud-Synchronisierung, Änderungen an der Physik oder eine neue Domain pro Sprache.
