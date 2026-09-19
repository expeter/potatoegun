# Fluglinks und Wiederholungen · FR-006

Neue Flüge zeichnen Winkel, Energie, Zufallsstartwert, Windstartwert/-zeit und tatsächlichen Wind, Gegenverkehr, sämtliche Talentstufen, Spielername, Landschaft und kosmetische Ausstattung auf. Erfolgreiche Sprünge und Notsprengungen erhalten den ganzzahligen Simulationsschritt bei 120 Hz. Wandzeit, Pausen und Bildrate werden nicht als Eingabezeit verwendet.

Die lokale Top 5 speichert diese Aufzeichnung mit dem jeweiligen Rekord. Alte Rekorde ohne vollständige Startdaten bleiben erhalten und können ihre Talente anbieten, aber keinen nachträglich erfundenen Replay. Der Fluglink trägt die Daten als UTF-8/Base64url im URL-Fragment; dafür sind weder Backend noch ein Upload nötig. Er verweist auf die gerade verwendete Spieladresse. Lokale LAN-Adressen funktionieren entsprechend nur in diesem Netz.

Linköffnung zeigt eine Vorschau mit Spieler, Strecke und Talentverteilung. „Flug ansehen“ startet eine getrennte Wiedergabesitzung. Sie pausiert einen eventuell laufenden eigenen Flug und stellt ihn beim Verlassen wieder her. Wiedergaben zählen weder Versuche, Rekorde, XP, Material noch Pflanzen; Live-Eingaben verändern sie nicht. Erneute Wiedergabe und Verlassen sind im Spielfeld auch im Vollbild erreichbar.

„Talente übernehmen“ ist eine eigene, ausdrücklich beschriftete Aktion. Sie ersetzt nur die Talentverteilung, benötigt ausreichend Punkte und gültige Voraussetzungen und ist während eines laufenden eigenen Flugs oder Replays gesperrt. Sie vergibt weder Level noch kosmetische Gegenstände. Das Öffnen oder Abspielen eines Links importiert nichts.

„Teilen“ verwendet die native Browser-Freigabe mit Spiel-/Replay-Link und optional PNG, sofern die Kombination unterstützt wird. Reine Linkfreigabe bleibt möglich, wenn Dateifreigabe fehlt. „Link kopieren“ steht unabhängig davon bereit; ohne Zwischenablage-API erscheint ein markierbares Textfeld. Abbruch des Teilen-Dialogs bleibt ohne Fehlermeldung. Einzelne Ziel-Apps können Teile einer kombinierten Bild-/Linkfreigabe weglassen.

## Version und Grenzen

Das Format ist versioniert. `REPLAY_ENGINE` in `src/replay.mjs` enthält eine explizite Physikrevision und den Fingerabdruck der zentralen Konfiguration. Bei Änderungen an der Simulationslogik muss die Revision steigen. Inkompatible Aufzeichnungen werden nicht mit neuer Physik abgespielt. Die abgeschlossene Wiedergabe vergleicht ihr Ergebnis mit den aufgezeichneten Werten; Abweichungen werden angezeigt. Das ist eine Konsistenzprüfung, kein Servernachweis.

Links werden vor der Wiedergabe auf Größe, Typen, Wertebereiche, geordnete Eingaben und unterstützte Aktionen geprüft. Maximal 30 Minuten, 256 erfolgreiche Aktionen und 32.000 kodierte Zeichen werden unterstützt. Längere Flüge bleiben spielbar und können ihr Bild und den normalen Spiel-Link teilen. Die Begrenzungen können bei zukünftigen Mechaniken bewusst erweitert werden. Neue Aktionsarten brauchen einen Recorder, einen versionsgebundenen Dispatcher und einen Determinismustest.

## Prüfung

Kernprüfungen vergleichen vollständige Ergebnisdaten und Eingabesequenzen bei 30, 60 und 144 Hz, einschließlich Startzerstörung und Notsprengung am ersten/letzten Schritt. Browserprüfungen decken gespeicherte Replays, URL-Öffnung ohne Profiländerung, ausdrücklichen Import, blockierte Live-Eingaben, Wiederherstellung eines eigenen Flugs, Vollbild, Handyansichten und native/Clipboard-Fallbacks ab. Native Freigabe wird im Browser simuliert; tatsächliche Ziel-Apps benötigen einen ergänzenden Gerätetest.
