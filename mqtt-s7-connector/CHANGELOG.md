## 1.3.0

- feat: Ersetzt den YAML-Editor durch geführte Formulare für PLC-, MQTT- und Geräte-Einstellungen.
- feat: Ermöglicht das Bearbeiten zusätzlicher Optionen über dynamische Schlüssel/Wert-Listen.
- fix: API liefert strukturierte Konfigurationen und verhindert ungültige YAML-Dateien beim Speichern.

## 1.2.0

- feat: SPS-Ein- und Ausgänge direkt aus der Konfigurationsdatei erkennen und testen.
- feat: Neue GUI-Ansicht mit Live-Anzeige der verbundenen SPS-Adressen und aktueller Werte.
- chore: UI-Dienst nutzt jetzt Nodes7/YAML-Abhängigkeiten während des Builds.

## 1.1.0

- feat: Added integrated Home Assistant ingress UI for managing configuration files.
- feat: Exposed configuration editor over port 8099 and enabled panel navigation entry.
- docs: Documented the new web interface and how to access it.

**Please note:**
Soon the update will contain the preparations and for the object rename form `devices` to `enities`.

## 1.0.8

- fix(sensor): Missing unit_of_measurement in ha-discovery payload ( @psi-4ward )
- feat(sensor): Support more ha-discovery options ( @psi-4ward )
- fix: Value gets not published if it is 0 ( @psi-4ward )
- feat(device): Add support for "manufacturer" in device section ( @psi-4ward )
- feat(device): Generate more unique mqttNames when name and device_nam… ( @psi-4ward )
- feat(config): Add example how to configure a device with sensors ( @psi-4ward )

## 1.0.7

- Added `number` device

## 1.0.6

- updated git package from 2.43.4-r0 to 2.43.5-r0

## 1.0.5

- Updated start script, which I was forgotten...

## 1.0.4

- skipped some test versions
- updated javascript application to you can define devices now be combined in a MQTT device by setting the `device_name` property.
- origin info is now written to the dicovery topic.

## 1.0.1

- fixed `eval: line 71: unexpected EOF while looking for matching '"'`

## 1.0.0

- First release
