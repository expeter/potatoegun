# Mobile Menüführung

Die sechs Inbox-Belege vom 19.09.2026 zeigen abgeschnittene Elemente, zu große Navigationswege und unterschiedliche Panel-Stile. Umsetzung über BUG-001, CR-001–003 und FR-003.

## Gestaltungsprinzip

Dunkles Aubergine, warme cremefarbene Texte, orange Hauptaktionen, mintfarbene aktive Zustände. Gleiche Ränder, Rundungen, Überschriften und Schließen-Knöpfe in Menü, Talenten, Looks, Erfolgen, Statistik, Hilfe, Flugkarte und Ergebnis. Jede Ansicht beantwortet eine Frage. Inhalte scrollen höchstens vertikal; Aktionen bleiben erreichbar. Ziele mindestens 44 Pixel.

- Spielfeld: schmale Symbolleiste; zentrierte Aktionsleiste mit Laden bzw. Schwung und Notsprengung. Touch-Halten direkt auf dem Feld lädt ebenfalls. Kein Tempo-/Vollbildknopf im Produktmenü.
- Menü: fünf klar bezeichnete Ziele – Talente, Looks, Erfolge, Statistik, Hilfe. Jeder Unterdialog hat denselben Rückweg zum Menü; Schließen setzt den Flug fort.
- Talente: vier Zweige als Tabs, pro Zweig drei aufeinander aufbauende Talentkarten mit verbundenen Stufenkartoffeln. Level, XP und freie Punkte bleiben in der Kopfzeile. Voraussetzungen stehen am jeweiligen Talent und führen direkt zum benötigten Zweig. Alternative Zugänge werden mit „oder“ benannt. Kein zweidimensionales Karten-Panning erforderlich.
- Statistik außerhalb der Talente: vorhandene Gesamtversuche/Pflanzen verwenden; neue Ereigniszähler erst ab Einführung sammeln und diesen begrenzten Zeitraum nennen. Keine rückwirkend geschätzten Abstürze/UFOs.
- Größenwechsel: sichtbaren Viewport aktualisieren, Aufladen abbrechen und Karten/Dialogs neu anordnen, ohne Fortschritt oder laufenden Flug zu verlieren.

## Recherche und Ableitung

[WoW: Dragonflight Talent Preview](https://news.blizzard.com/en-us/article/23797209/world-of-warcraft-dragonflight-talent-preview) beschreibt erkennbare Voraussetzungen und gerichtete Verbindungen. [WoW: Talente](https://worldofwarcraft.blizzard.com/en-us/news/23865972/) trennt zusammengehörige Talentbereiche. [Diablo IV: Quarterly Update December 2020](https://news.blizzard.com/en-us/article/23583664/diablo-iv-quarterly-updatedecember-2020) beschreibt engere Gruppierung verwandter Knoten, damit man nicht quer durch den Baum suchen muss. Unsere Ableitung ist eine Zweigauswahl mit vollständig sichtbaren Stufen statt eines verkleinerten Desktop-Netzes. Es werden keine fremden Assets übernommen.

## Nicht in diesem Umfang

Keine neuen Raketen-/Fallschirmfähigkeiten, kein Idle-System und keine Umsetzung der älteren Vorschläge FR-001/FR-002. Das UI lässt Raum für zusätzliche Aktionen, ohne sie vorwegzunehmen.

## Nachschärfung aus den Folgebelegen

CR-004 richtet Talentkarten an gemeinsamen Inhaltszeilen aus und verschiebt den Reset in die Kopfzeile. BUG-002 bindet Dialogfarben lokal an die UI statt an die Landschaft. CR-005 trennt Kleidung und Landschaften. CR-006 entfernt die Prüferklärung aus dem Teildialog und stellt die Karte unter eine gemeinsame Aktionsleiste. Die geplanten drei Schrott-Landschaften stehen in [SPEC-001](landscapes.md).

## CR-007: Feste Talentübersicht ersetzt Zweigtabs und Karten

Die vorherigen Zweigkarten lösen das Scrollproblem nicht ausreichend. Die aktuelle Oberfläche zeigt alle zwölf Talente gleichzeitig in vier farbigen Reihen und drei Spalten. Verbindungen laufen zum jeweils nächsten Talent; die gewählte Spezialisierung hebt auch ihren alternativen Zugang hervor. Eine Berührung öffnet eine eigene Detailansicht mit drei 44-Pixel-Mindestzielen, Wirkung, Nachteil und verlinkten Voraussetzungen. Kein Drag-and-drop als Pflichtbedienung. Kein Umbau von Talentpunkten zu einer anderen Währung und keine rückwirkende Änderung der Builds. Die Übersicht und die Details müssen auch auf 740×320 ohne Scrollen bedienbar sein.

BUG-003 ergänzt die lokale Top 5 im Menü und benennt Looks in Garderobe um. CR-008 vergrößert die vier Kartenstatistiken und das tatsächliche Kartoffel-Emblem; die technische ID bleibt dezent am Fuß.

## BUG-004 / CR-009: Navigation und flexible Flugkarte

X und Escape verlassen Talentdetails genau eine Ebene zur Übersicht, auch nach Vorgängersprüngen; der Flug bleibt pausiert. Die Flugkarte erhält ein an die Vorschaufläche angepasstes PNG-Layout statt eines starr skalierten Kreditkartenbilds. Rotation erzeugt Vorschau und Export gemeinsam neu. Breitennutzung und Lesbarkeit werden bei 667×375, 740×320, 924×412, 932×430, 390×844 und 320×740 geprüft. Alte Prüfkarten bleiben unterstützt.

## CR-010: Lesbares Werteband

Im Querformat stehen Entfernung und Pilot über einem vierteiligen Werteband. Rekord, Höhe, Pflanzen und Schrott teilen sich die gesamte Kartenbreite statt einer schmalen rechten Spalte. Auf Handys bleiben nur wenige Pixel Außenrahmen. Beschriftungen erreichen in den sechs geprüften Ansichten mindestens 20 CSS-Pixel; Hochformat verwendet größere Schrift. PNG, Looks und Prüfdaten bleiben erhalten.
