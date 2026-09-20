# Kartoffelkanone · Schrott & Schabernack

Ein kleines Browser-Flugspiel mit Timing, schwebendem Schrott, Talentbaum und fragwürdiger Kartoffeltechnik. Lokaler Spielfortschritt, optionale Online-Fluglinks und servergeprüfte Bestenliste. Ohne externe Assets oder Drittanbieter-Pakete.

## Lizenz

Dieses Projekt steht unter der [MIT-Lizenz](LICENSE), Copyright (c) 2026 expeter. Bei Weitergabe müssen Copyright- und Lizenzhinweis erhalten bleiben. Die mitgelieferten Schriftarten behalten ihre [SIL Open Font Licenses](game/assets/fonts/README.md).

## Starten

Automatisches Hosting: siehe [Publishing mit GitHub Pages](docs/publishing.md). Pushes auf `main` veröffentlichen die statischen Spieldateien, sobald Pages für das Repository aktiviert ist.

```sh
sec-helper audit
node tools/serve.mjs
```

**http://localhost:8000** öffnen (Node 24.21+). Dieser Entwicklungsserver erstellt `_site/` und bietet Spiel plus API an. Nach Änderungen neu starten. Die SQLite-Datei liegt unter `data/` und wird nicht versioniert. Für rein statisches Hosting zuerst `node tools/build.mjs` ausführen und ausschließlich `_site/` veröffentlichen. Nicht direkt per `file://` starten.

Struktur: `game/` enthält die Oberfläche, `shared/` die gemeinsame Simulation und Replay-Prüfung, `api/` den HTTP-/SQLite-Dienst, `deploy/` die VPS-Vorlagen. Siehe [Implementierungsspezifikation](docs/specifications/minizap-api.md) und [VPS-Anleitung](deploy/README.md).

Zum Testen am Handy müssen Rechner und Handy im selben WLAN sein. Im Projektordner auf dem Rechner starten:

```sh
node tools/build.mjs
python3 -m http.server 8000 --bind 0.0.0.0 --directory _site
```

Dann am Handy `http://LAN-IP-DES-RECHNERS:8000` öffnen (zum Beispiel `http://192.168.178.42:8000`, mit der tatsächlichen Rechner-IP aus den Netzwerkeinstellungen). `localhost` am Handy zeigt auf das Handy selbst. Quer halten und spielen. Falls nötig, den Server in der Rechner-Firewall für das private Netzwerk zulassen. Mit Strg+C beenden. Der Server ist nur ein Dateiserver, kein Spielbackend. Bei einer entfernten Entwicklungsumgebung ist stattdessen eine vom Handy erreichbare Vorschau-URL oder statisches Hosting nötig.

## Neue Bedienung

- **Maus:** Im Spielfeld zielen, links gedrückt halten und zum Schießen loslassen. Während des Haltens lässt sich weiter zielen. Alternativ zuerst zielen und dann den großen **LADEN**-Knopf halten.
- **Handy:** Quer halten. Im Spielfeld halten, beim Bewegen zielen und zum Schießen loslassen. Alternativ den **LADEN**-Knopf halten. Ton, Musik, Talente (Zahnrad) und das Spielmenü (☰) liegen direkt im Bild; breite Kopf-/Fußleisten entfallen. Im Menü stehen Talente, Garderobe, Bestenliste, Erfolge, Statistik und Hilfe. Dialoge pausieren den Flug. Der Startbildschirm bietet direkt Spielen, Installation, Bestenliste und Hilfe; weitere Dialoge führen zum Menü zurück. Im Hochformat erscheint ein schließbarer Drehhinweis.
- **Tastatur:** Spielfeld oder Schussknopf fokussieren, mit Pfeiltasten zielen und die Leertaste zum Laden halten. Loslassen feuert; Escape bricht ab. Screenreader-Aktivierung des Schussknopfs startet/stoppt das Laden mit zwei Aktivierungen.
- Die Ladung pendelt zwischen schwach und extrem. Es gibt keine Zahlenregler und keine Vorschau der Flugbahn. Richtung und Ladung sind als wachsende Segmentanzeige direkt vor dem Kanonenrohr erkennbar. Die kleine Kartoffel sitzt im Rohr.
- **Schwung im Flug:** Leertaste, Antippen des Spielfelds oder **SCHWUNG** geben einen Impuls nach vorne und oben. Zum Start gibt es zwei Impulse; jedes zerstörte UFO lädt bei überlebtem Treffer einen Impuls nach, bis maximal zwei auf Vorrat; zwischen Impulsen liegen 0,8 Simulationssekunden. Gedrückthalten verbraucht nicht automatisch alle Impulse.
- **X in der Ergebnisansicht** schließt die Auswertung und bereitet den nächsten Versuch vor; Escape funktioniert ebenfalls. Solange die Auswertung offen ist, bleiben die dahinterliegenden Spielfeldknöpfe gesperrt.
- **Neue Knolle!** bereitet den nächsten Versuch vor. Er muss neu aufgeladen werden; exakte Abschüsse lassen sich nicht einfach per Wiederholungsknopf kopieren.
- Verlorener Fokus, Pointer-Abbruch, Größenwechsel oder ein versteckter Tab brechen laufendes Aufladen ab. Dialoge und versteckte Tabs pausieren den Flug.

Die festen Anzeigen oben links zeigen Weite, Höhe, aktuelle Geschwindigkeit in **m/s** und eingesammeltes Material. Tempo ist der Betrag der horizontalen und vertikalen Geschwindigkeit.

## Flug, Schrott und Risiko

Jeder Start hat einen neuen Zufalls-Seed. Der Winkel streut leicht, die Startbelastung wird ausgewürfelt. Niedrige Energie ist sicher; im gelben Bereich beträgt das Startplatzrisiko ohne Schutz höchstens 3,5 %. Erst extremes Überladen erhöht das Risiko deutlich; selbst maximale Energie hat **keine garantierte Zerstörungsschwelle**. Panzerung und Tape verbessern die Überlebenschancen deutlich: bei maximaler Ladung ca. 75,5 % Startzerstörung ohne Schutz, ca. 39,3 % mit Panzerung III und ca. 19,2 % zusätzlich mit Tape III. Überlebte Extremstarts hinterlassen erhebliche Schäden; Panzerung reduziert auch diese. Alle Risikowerte stehen in `CONFIG.launchRisk`. Danach entscheiden Physik und Kollisionen über die verbleibende Schale.

Die Fahne allein zeigt den Wind. Vor dem Schuss ändert er sich langsam; beim Abschuss wird er für den gesamten Flug festgehalten. Segel verstärken sowohl Rücken- als auch Gegenwind. Die Hindernisse bleiben ortsfest. Schrottgruppen erhalten pro Versuch neue Höhen, Abstände und Werte; während des Flugs bleiben sie stabil.

- Schrott schwebt in mehreren niedrigen, mittleren und hohen Pfaden, mit zusätzlichen Himmelsspuren etwa 100, 200 und 300 Meter über den bisherigen Gruppen. Goldene Muttern mit größerem Kern sind wertvoller.
- Eingesammeltes Material bleibt auch bei Zerstörung erhalten. Jedes Teil wird höchstens einmal pro Versuch eingesammelt.
- Strecke bringt zusätzlich Material, eine überlebte Landung einen separaten Bonus. Die Auswertung zeigt alle drei Erträge getrennt.
- Vier Sprungbrett-Typen geben pro Objekt und Flug einmal Zusatzschub: Pilze federn ausgewogen, Trampoline stärker nach vorne, Schrottfedern höher nach oben und Kartoffel-Toaster dazwischen. Weitere Kontakte prallen normal ab. Heuballen bremsen und dämpfen. Aufwindzonen bremsen den Fall sanft und tragen die Kartoffel nach oben, ohne sofortigen Geschwindigkeitssprung. Sie reichen über die anfängliche Bildschirmhöhe hinaus und laufen im oberen Viertel weich aus; schnelle Aufstiege erhalten keinen weiteren Aufwindschub. Jede Zone trägt pro Flug höchstens fünf Sekunden und wird danach blasser; fünf Aufwindfelder sind mit einem festen Seed, unterschiedlichen Breiten/Höhen und unregelmäßigen Abständen verteilt. Sie bilden keine wiederholten Zweierpaare und bleiben innerhalb der Strecke ortsfest. Sprungpolster federn stärker zurück und geben je nach Stufe zusätzliche Trampolinimpulse, ohne endlose Sprungschleifen zu erzeugen.
- Die Schalenanzeige fliegt direkt über der Kartoffel mit. Bewegliche Augen, Quetschen beim Aufprall und heraushüpfende kleine Kartoffelpflanzen begleiten den Flug. Die Pflanzen zählen für deinen gespeicherten Gartenfortschritt.
- Kleine optionale UFOs kommen erst jenseits des Startbereichs entgegen. Seitentreffer können Schaden verursachen. Ein Treffer von oben federt die Kartoffel kräftig nach oben. Getroffene UFOs trudeln mit Rauch zu Boden und bleiben kurz als Wrack liegen. Über **? → Gegenverkehr** ab dem nächsten Versuch abschaltbar.

## Talentbaum und Erfolge

**Talente** öffnet eine feste Übersicht mit allen zwölf Ausrüstungen: vier farbige Reihen, jeweils vom Grundtalent links bis zur Spezialisierung rechts. Es gibt weder Zweigtabs noch einen Scrollweg. Kleine gefüllte Felder zeigen die belegten Ränge; Level, XP und freie Punkte bleiben sichtbar. Antippen öffnet eine separate Detailansicht mit Wirkung, Nachteil und drei großen, einzeln wählbaren Stufen. Die nötigen Vorgängertalente sind direkt verlinkt, alternative Zugänge mit „oder“ benannt. **‹ Talente**, **X** und **Escape** kehren aus den Details zur vollständigen Übersicht zurück – auch nach einem Sprung zu einem anderen Talent. Der Flug bleibt dabei pausiert. Bestehende Punkte und Freischaltregeln bleiben erhalten.

Vier verbundene Zweige mit **zwölf Talenten mit je drei Rängen und maximal 20 gleichzeitig verteilten Punkten**:

| Zweig | Talente |
| --- | --- |
| Unzerknollbar | Schalenpanzerung → Panzertape → Notfall-Airbag |
| Luftnummer | Gleitflügel → Sturmsegel → Rennschale |
| Eskalation | Sprungpolster → Sprungverstärker → Dosenrakete |
| Beutezug | Schrottmagnet → Beuteltasche → Resteverwerter |

**Direkt verteilen:** Jedes Talent hat drei einzeln anklickbare Kartoffeln mit einem, zwei oder drei Punkten. Ein leeres Feld aktiviert alle Stufen bis dorthin, sofern genug Punkte frei sind. Ein aktives Feld nimmt diese und die höheren Stufen zurück. Zwei Ränge im verbundenen Vorgänger öffnen den nächsten Knoten. Außen gibt es alternative Zugänge: Airbag über Tape oder Segel, Rennschale über Segel oder Sprungverstärker, Rakete über Sprungverstärker oder Beuteltasche, Resteverwerter über Beuteltasche oder Tape. Ein Zugang genügt. Würde das Abwählen den letzten Zugang zu anderen aktiven Talenten entfernen, bleiben die Punkte unverändert. Die betroffenen Sprossen werden markiert und müssen zuerst zurückgenommen werden. **Alle Punkte zurück** ermöglicht einen kompletten kostenlosen Wechsel. Im Flug bleibt die Verteilung gesperrt; der Baum lässt sich pausiert ansehen. Wirkung und Nachteil stehen in den Talentdetails. Die Übersicht bleibt frei von Erklärungstexten. Zurücksetzen sitzt oben; konkrete Sperrgründe erscheinen in den Details.

**XP und Level:** Start auf Level 1 mit einem freien Punkt. Alle 100 XP steigt das Level und damit das gesamte Punktbudget um eins; Level und Punktbudget sind bei 20 gedeckelt. Für diesen Spieltest werden alle XP-Belohnungen halbiert (Gesamtsumme aufgerundet): Jeder abgeschlossene Versuch gibt 30 Basis-XP, auch ein Fehlstart. Dazu kommen halbierte Boni für Weite, Schrott und heile Landung. Neue Spieler brauchen damit ungefähr doppelt so viele Flüge bis Level 20; bestehende XP und Talente bleiben erhalten. Der Resteverwerter erhöht den Weiten-/Landungsanteil um 20 % je Rang. XP und Punkte werden pro Runde genau einmal gutgeschrieben. Nach Level 20 steigen die gesammelten XP weiter, das Budget bleibt 20.

Schrott bleibt als Sammelwert und XP-Bonus erhalten, ist aber keine Talentwährung. Jeder Zweig hat farbige Verbindungen zwischen seinen drei Stufenfeldern. Stufenfelder bleiben mindestens 44 Pixel groß; die Voraussetzungen sind beschriftet und verlinkt. Der XP-Balken ist ein wachsendes Kartoffelbeet. Bestehende XP zählen unverändert bis Level 20.

Zwölf lokale Erfolge belohnen unter anderem einen überlebten Extremstart ohne Panzerung/Tape/Airbag, acht gesammelte Teile in einem Flug, Gegenverkehr und Schrott-Pinball. „Nackt im Überschall“ zählt erst nach drei überlebten Flugsekunden; eine spätere Bruchlandung nimmt den Erfolg nicht zurück. Freigeschaltete Erfolge werden bei der Auswertung gespeichert und sind über **Menü → Erfolge** einsehbar.

## Fokus: schnelle Runden auf dem Schrottplatz

Flugzeug- und Weltraumwelten sind vorerst aus der spielbaren Oberfläche entfernt. Auch ein dort gespeicherter Versuch startet wieder auf dem Schrottplatz. Alte Rekorde und Erfolge dieser Welten bleiben im Spielstand erhalten.

Der Abschuss erhält einen kräftigen Startimpuls; die höhere Schwerkraft hält die Runden kompakt. Mündungsblitz und kurzer Rückstoß betonen den Schuss. Die Kanone skaliert mit der Spielfeldhöhe; ihre größere Mündung liegt passend zum Abschuss bei 18 Metern Spielhöhe. Große Sprungpolster-Abpraller bleiben erhalten, nach dem dritten Bodenkontakt nimmt ihre Rücksprungenergie stärker ab. Würde ein Bodenabpraller weniger als 6 m/s Aufwärtsgeschwindigkeit haben, geht die Kartoffel ins Ausrollen über. Die horizontale Geschwindigkeit bleibt erhalten und wird durch Bodenreibung abgebaut. Erst bei nahezu vollständigem Stillstand endet die Runde als überlebte Landung. Das gilt nur am Boden, nicht am höchsten Punkt eines Flugs und nicht beim Start von einem Sprungpilz.

## Kartoffelgarten

Kräftige Aufschläge auf Erde pflanzen je nach Aufpralltempo ein bis drei Kartoffeln. Zwischen Pflanzstellen müssen mindestens zwölf Meter liegen; Pilze, Heuballen und wiederholte Hüpfer auf derselben Stelle pflanzen nichts zusätzlich. Samen verschwinden in der Erde und wachsen zu kleinen Blattpflanzen, Blütenstauden oder Knollen mit Blättern. Auch Pflanzen aus einer Bruchlandung zählen.

**GEPFLANZT** zeigt den Gesamtstand einschließlich der aktuellen Runde. Bei der Auswertung wird der Zuwachs genau einmal gespeichert und getrennt vom Material angezeigt. Die Erfolge **Grüner Daumen (10)**, **Knollengärtner (50)** und **Kartoffelimperium (200)** belohnen den Gesamtstand. Der Garten ist lokal auf diesem Gerät gespeichert; es gibt keinen Online-Gemeinschaftszähler und kein Idle-Einkommen.

## Looks

- **Goblin-Garage:** neuer Fantasy-Schrottplatz mit violettem Himmel, rostigen Raketen, Felsschluchten und UFOs.
- **Original: Acker:** ursprüngliche grüne Landschaft, kostenlos in **Looks** auswählbar wie die Goblin-Garage. Der Lichtschalter verdunkelt die gewählte Welt und behält deren Landschaft bei. Die Spielregeln bleiben gleich.
- **[Erste Version vollständig spielen](game/variants/acker-v1/index.html):** unveränderte Oberfläche, Regeln und Grafik der ersten Version. Diese Dateien sind ein bewusstes Archiv.


Unter **Garderobe** trennen die Reiter **Kleidung** und **Landschaften** den Charakter von der Flugkulisse. **Acker** und Goblin-Garage bleiben kostenlos; bestehende Pflanzenkäufe bleiben erhalten. Alle Dialoge behalten in jeder Landschaft ihre dunkle, kontrastreiche Palette. Drei weitere Schrott-Landschaften sind [geplant](docs/specifications/landscapes.md), noch nicht implementiert.

## Flugkarte teilen

Die Flugkarte zeigt die tatsächlich getragene Ausstattung, vier groß beschriftete Run-Werte und eine dezente Knollen-ID. Das Bild wird passend zur verfügbaren Fläche neu angeordnet: Querformat zeigt die große Weite und den Piloten oben sowie vier deutlich beschriftete Werte über die gesamte Breite darunter; schmale Bildschirme erhalten eine Hochformatkarte. Beim Drehen passen sich Vorschau und herunterladbares PNG gemeinsam an. Teilen (sofern vom Browser unterstützt) und Bild speichern sitzen oben; die Vorschau bekommt die restliche Fläche. Die Prüferklärung entfällt im Dialog. Die PNG-Metadaten und [lokale Prüfung](verify.html) bleiben erhalten; der Hash beweist keinen echten Spielverlauf. Native Dateifreigabe wird in Browserprüfungen simuliert und muss ergänzend am Gerät getestet werden.

Die adaptiven PNG-Karten sind 1200 Pixel breit und 343–1600 Pixel hoch. Ihre untersten 60 Pixel enthalten die ID; die übrigen Bildpixel sind durch den Bildhash abgedeckt. Ältere Kartenformate bleiben im lokalen Prüfer unterstützt. Die Browserprüfung kontrolliert unter anderem sechs Handygrößen, mindestens 97 % Breitennutzung und mindestens 16 Pixel große Statistikbeschriftungen in diesen Ansichten.


## Flüge nochmal ansehen

Neue Einträge unter **Menü → Bestenliste → ▶** können ihren Flug wiederholen. **Link kopieren** teilt dieselbe Wiederholung einschließlich Startwerten, Talenten, Looks und exakt aufgezeichneten Sprüngen. Beim Öffnen erscheint eine Vorschau; mit **Flug ansehen** beginnt die Wiedergabe. Dein eigener Flug wird dabei pausiert und beim Verlassen fortgesetzt. Replays vergeben keine Belohnungen und verändern deinen Talentbaum nicht.

**Talente übernehmen** importiert die angezeigte Verteilung nur auf deinen Klick und nur mit ausreichend eigenen Talentpunkten. Ältere Rekorde ohne Aufzeichnung können nicht nachträglich abgespielt werden. Replays sind an die jeweilige Physikversion gebunden; Details stehen in der [Replay-Spezifikation](docs/specifications/replays.md).

**Teilen** hängt von Browser, Gerät und sicherem Kontext (normalerweise HTTPS) ab. Die Freigabe enthält den Fluglink und, wenn unterstützt, die PNG-Karte. **Link kopieren** und **Bild speichern** stehen als Alternativen bereit. Ohne Zugriff auf die Zwischenablage erscheint ein markierbares Linkfeld. Der Link verwendet die aktuelle Spieladresse: Ein WSL-/LAN-Link ist außerhalb deines Netzwerks noch nicht erreichbar.

## Bestenliste

**Menü → Dein Name**: Trage deinen Spielernamen ein (bis zu 24 Zeichen). Er wird automatisch auf diesem Gerät gespeichert. Jeder Flug übernimmt den Namen beim Abschuss; ältere Rekorde behalten ihren Namen. Ohne Eingabe heißt du „Knollenpilot“.

**Menü → Bestenliste** zeigt die lokalen Top 5 auch im randfüllenden Handy-Spiel. Ein leerer Spielstand zeigt einen eigenen Hinweis. Es gibt keine Online-Rangliste und keine Übertragung zwischen Geräten.

## Flugbuch

**Menü → Statistik** zeigt Abschüsse, Abstürze, heile Landungen, zerstörte UFOs, Bodenkontakte, Sprungbretter, Schwungimpulse, Schrottteile, gepflanzte Kartoffeln, Flugzeit, Gesamtweite und Notsprengungen. Abschüsse zählen sofort; Details werden am Rundenende einmalig gespeichert. Alte Spielstände behalten ihre bekannten Versuche und Pflanzen. Der Beginn der neuen Detailzähler wird angezeigt, da historische Abstürze und Treffer nicht rekonstruierbar sind.

## Lokaler Spielstand

Das Datenformat ist jetzt Version 3; der Speicherschlüssel bleibt `kartoffelkanone.v2`, damit bestehende Spielstände gefunden werden. Gespeichert werden XP, verteilte Punkte, gesammelter Schrott, Rekorde, Höhenrekorde, gepflanzte Kartoffeln, Erfolge und Einstellungen.

Alte Versuche werden mit je 60 XP angerechnet. Frühere Talentkäufe sichern mindestens das entsprechende Punktbudget bis zum Maximum von 20. Zulässige Ausrüstung wird übernommen; bei größeren alten Builds werden zunächst Grundtalente, dann abhängige Talente bis zum Budget berücksichtigt. Historische Käufe bleiben als Snapshot erhalten, überschüssige Ränge erhöhen das neue Limit nicht. Voraussetzungen gelten auch bei der Migration; freie Punkte können sofort neu verteilt werden. Frühere Weltdaten und der ursprüngliche `kartoffelkanone.v1`-Spielstand bleiben erhalten. Alte Rekorde sind mit **Originalflug · v1** markiert.

Die lokalen Top 5 des Schrottplatzes zeigen Entfernung, gesammelten Schrott und Anzahl ausgerüsteter Talente, keine nachschießbare Winkel-/Energieanleitung. Rekorde mit gleicher Weite behalten ihre Reihenfolge. Bei gesperrter Speicherung bleibt das Spiel mit Hinweis für die Sitzung nutzbar. Beschädigte Daten werden auf gültige Standardwerte zurückgesetzt. Webadresse und Port bestimmen den Speicherort; `localhost` und `127.0.0.1` haben separate Spielstände.

## Code und Balancing

- `shared/config.mjs`: zentrale Physik-, Risiko-, Upgrade- und Wirtschaftsparameter sowie Talentzweige und Erfolge.
- `shared/world.mjs`: Ladekurve, Zielberechnung, Seed-Zufall, Wind, Sammelpfade und Gegenverkehr.
- `shared/physics.mjs`: feste 120-Hz-Simulation, Kollisionen, Sammeln und Flug-Meilensteine.
- `game/src/progress.mjs`: XP, Talentbudget, Erstattung, Voraussetzungen, einmalige Auszahlung, Erfolge, Speicherung und Migration.
- `game/src/renderer.mjs`: beide Bodenstile mit kontinuierlichem Parallax-Scrolling, Kartoffelpflanzen, Kartoffel, Anbauten, Schrott und Fahrzeuge als Canvas-Zeichnungen.
- `game/src/app.mjs`: Pointer-/Touch-/Tastatureingaben, Zustände, mobile Dialoge und Renderloop.

Ein Flug mit festem Seed, Wind-Seed, Startzeit, Ausrüstung und Eingaben ist für Tests reproduzierbar. Im eigentlichen Spiel sind Seeds pro Versuch frisch. Bildrate und Testtempo ändern die Flugbahn nicht. Talent-Anbauten haben echte Effekte; mehrere erhöhen Gewicht, Rennschalen erhöhen Aufprallschäden und Segel reagieren stärker auf Gegenwind. Keine externe Zufalls- oder Physikbibliothek erforderlich.

## Tests

Mit Node 24:

```sh
sec-helper audit
node --test tests/core.test.mjs tests/api.test.mjs
```

60 Tests prüfen Timing, Zielwinkel, Seed-Streuung, extreme Überlebenschancen, Wind, Talente, Kollisionen, Sammeln bei hoher Geschwindigkeit, einmalige Auszahlung, Erfolge, Migration zum XP-System, 20-Punkte-Limit, abhängige Erstattungen, begrenzte Schwungimpulse, konstante Flugwinde, erschöpfbare Aufwinde, Sprungpolster, endende Kleinabpraller, Pflanzzählung, stabile Hintergrundkacheln sowie kosmetische Käufe, Guthaben, Speicherung und unveränderte Flugphysik. Die gleichen Flüge werden mit 30/60/144 Hz und 1×/2×/4×/8× verglichen; 144 Parameterkombinationen müssen ohne künstliches Zeitlimit enden.

Optionaler Browser-Integrationstest mit einem **bereits installierten Chromium** (vorher `node tools/build.mjs`):

```sh
BROWSER_BIN=/pfad/zu/chromium node tests/browser.mjs
```

Kein Download und keine zusätzlichen Pakete. Der Test öffnet einen temporären lokalen Server und ein isoliertes Chromium-Profil. Er prüft Maus-Halten/Loslassen, Touch-Zielen und -Schießen, Pointer-Abbruch, Pausen, Tastatur, Querformat ohne Scrollen, direkte Talentverteilung per Maus und Touch, XP, Erstattungen, größere Schrift, beide Looks, Migration und Speicherung. Die Statistikprüfungen decken Migration, ungültige Werte und einmalige Speicherung ab. Die Handyprüfungen testen außerdem die volle Spielfeldhöhe, 44-Pixel-Symbole, Spielmenü, echten Vollbildwechsel und Zweig-Navigation ohne horizontalen Scrollweg, überlappungsfreie Talentkarten, Dialogwechsel, Statistik und Größenänderungen bei offenem Dialog. Die Flugsimulation wird ausschließlich im Testprozess beschleunigt; im Spielmenü gibt es keinen Tempo-Regler. Außerdem prüft er echte Space-/Touch-Impulse, den Fokus auf die erste Welt, Pflanzfortschritt über einen echten Flug samt Neuladen und per Pixelvergleich das kontinuierliche Scrollen beider Hintergrundstile an Kachelgrenzen. Screenshots landen in `/tmp/kartoffel-screenshots` bzw. `SCREENSHOT_DIR`. Das Testprofil wird entfernt. Für Container verwendet der Test Chromium mit `--no-sandbox` und öffnet ausschließlich das lokale Projekt.

**Dependency-Audit: sec-helper** — Audit erfolgreich, keine Projektabhängigkeiten.

Weiterhin außerhalb des Spiels: Idle-Einkommen, Backend und teilbare Online-Herausforderungen.

## MiniZap: Einstieg und Online-Flüge

Der Startbildschirm bietet „Jetzt spielen“ bzw. „Weiterspielen“, deine Bestweite und „Zum Startbildschirm hinzufügen“. Ein nativer Installationsdialog erscheint nur, wenn der Browser ihn anbietet; sonst werden passende Schritte erklärt. Ein einmaliger, schließbarer Hinweis folgt nach der ersten abgeschlossenen Runde. Im installierten Anzeigemodus entfallen die Installationsknöpfe. Offline-Caching ist noch nicht enthalten.

`Flug teilen` speichert auf dem MiniZap-Host den vollständigen Flug samt Anzeigename als ungelisteten, über den Link öffentlich abrufbaren Datensatz. Der Link wird zu `/?flight=<kurze-ID>`. Bei Serverausfall bleibt der bisherige vollständige `#flug=`-Link nutzbar. Alte Fluglinks bleiben lesbar. Neue persönliche Bodenrekorde mit Gegenverkehr werden automatisch mit Name und Replay in die öffentliche Online-Bestenliste eingetragen. Ein zusätzlicher Klick entfällt. Bei temporären Verbindungsfehlern werden bis zu 20 ausstehende Rekorde lokal gespeichert und mit Wartezeiten erneut übertragen; beim nächsten Start wird auch der beste kompatible lokale Flug nachgeholt. Dauerhaft abgelehnte Flüge bleiben lokal und werden nicht endlos gesendet. Der Server simuliert jeden neuen Flug mit derselben Engine nach und wertet seine eigene berechnete Weite. Winzige Rundungsunterschiede bis 0,000001 in kontinuierlichen Ergebniswerten sind erlaubt; Simulationsschritte, Eingaben und Zähler müssen exakt stimmen. Das beweist Reproduzierbarkeit, nicht menschliches Spielen. Namen sind frei wählbar, keine Konten.

Lokale Top 5, XP und Talente bleiben auf dem Gerät und funktionieren ohne API. Die Online-Bestenliste steht separat im Bestenlisten-Dialog. Auf `potato.minizap.online` wird `api.minizap.online` verwendet; andere statische Hosts aktivieren die API nicht automatisch. Die neue Domain übernimmt lokale Spielstände anderer Origins nicht automatisch.

## Ohne Browserleiste vom Homescreen starten

Die Web-App enthält jetzt ein Installationsmanifest mit App-Icons, Vollbild- und Querformatpräferenz. Nach Installation aus einem unterstützten Android-Browser startet das Homescreen-Symbol ohne Adressleiste. Systemleisten und Orientierung bleiben vom Gerät/Browser abhängig. Bei fehlender Vollbildunterstützung kann der Browser auf Standalone zurückfallen. Es gibt noch keine separat gebaute Android-APK und keinen Offline-Cache; der Server muss erreichbar bleiben.

**Für den Alltag:** Spiel auf einem statischen **HTTPS**-Host öffnen, im Chrome-Menü **App installieren** bzw. **Zum Startbildschirm hinzufügen → Installieren** wählen und anschließend über das neue Symbol starten. Die bisherige unverschlüsselte WLAN-Adresse `http://192.168.…` erfüllt die regulären Installationsvoraussetzungen nicht. Ein bloßer Browser-Lesezeichen-Shortcut ist kein zuverlässiger Vollbildtest. Quelle: [MDN: Installation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [Anzeigemodi](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/display).

### Lokal auf Android testen, ohne Hosting

1. Spielserver wie oben starten. Zuerst in Windows-Chrome prüfen, ob `http://localhost:8000` funktioniert; bei abweichendem Port die folgenden Werte entsprechend ersetzen.
2. Am Android-Gerät Entwickleroptionen und **USB-Debugging** aktivieren, per USB verbinden und die Verbindung zum eigenen Rechner bestätigen.
3. In **Windows-Chrome** `chrome://inspect/#devices` öffnen. **Discover USB devices** aktivieren; das Handy muss dort erscheinen.
4. **Port forwarding** öffnen, **Enable port forwarding** aktivieren und Geräteport **8000** auf **localhost:8000** am Rechner weiterleiten.
5. In Chrome **am Handy** `http://localhost:8000` öffnen, aus dem Browsermenü installieren und danach das neue Homescreen-Symbol starten. Wenn nur ein Browser-Shortcut angeboten wird, den HTTPS-Weg verwenden.

Hier zeigt `localhost` am Handy durch die USB-Weiterleitung auf den Windows-/WSL-Server. USB-Verbindung, Portweiterleitung und Server während dieses lokalen Tests aktiv lassen. Nach dem Test Weiterleitung und bei Bedarf USB-Debugging deaktivieren. [Chrome-Anleitung zur USB-Portweiterleitung](https://developer.chrome.com/docs/devtools/remote-debugging/local-server#case-2-set-up-port-forwarding-through-usb-for-your-android-device).

**Spielstände:** HTTP-IP, localhost und eine HTTPS-Domain sind unterschiedliche Speicherorte. Ein Wechsel übernimmt den bisherigen lokalen Fortschritt nicht automatisch; er bleibt unter der alten Adresse erhalten.

Die Installationsoberfläche und ein echter Android-Homescreen-Start sind noch nicht auf einem physischen Gerät geprüft. Der Browser-Test prüft Manifest und PNG-Größen sowie das Layout mit simuliertem installiertem Anzeigemodus; echten Browser-Vollbildwechsel prüft er separat. Es wurde nichts veröffentlicht und kein Zertifikat/Windows-Setup verändert. App-Icons lassen sich abhängigkeitsfrei mit `python3 tools/make_app_icons.py` regenerieren.


## Feedback-Inbox und Tickets

Feedback mit Screenshots wird über die lokale Project Inbox gesammelt. Die Bearbeitung erfolgt ausdrücklich auf Auftrag über [docs/tickets.md](docs/tickets.md); Details stehen im [Workflow](docs/workflow.md). Es gibt keine automatische Verarbeitung.

Die aktuelle Spielversion steht dezent unten im Menü (ab v0.6.0). Bei Releases die Anzeige in `game/index.html` und den CHANGELOG gemeinsam aktualisieren. Beim Domainwechsel bleibt lokaler Fortschritt an der alten Adresse; er wandert nicht automatisch mit. Die API akzeptiert während des Übergangs beide Domains, neue Kurzlinks zeigen auf `potato.minizap.online`.
