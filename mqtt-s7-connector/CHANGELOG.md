## 2.2.2

- chore: remove PNG assets (icon, logo, documentation figures) to keep the repository binary-free for branch sync tooling.
- docs: note the binary asset limitation in the README and DOCS so Home Assistant users know why default icons appear.
- fix: strip unsupported `topic` keys from the legacy `devices` mirror and blueprint so schema validation passes on boot.

## 2.2.0

- feat: expand the entity templates with pumps, valves, and the broader Home Assistant domain set.
- feat: surface the extended entity selection inside the configuration UI for quicker setup.
- docs: document the comprehensive entity coverage in the README and DOCS.

## 2.1.0

- feat: add a toggleable S7-1200 simulation that mimics PLC inputs/outputs directly in the web UI.
- feat: display a detailed PLC status card with live/test indicators, metadata, and last scan timestamps.
- docs: describe the new test mode workflow and PLC overview updates in the README and DOCS.

## 2.0.0

- breaking: rename the configuration section from `devices` to `entities` and update the UI to manage Home Assistant entities directly.
- feat: ship a standard configuration blueprint, auto-load it in the GUI, and add entity templates for lights, sensors, covers, buttons, numbers, selects, text, fans, humidifiers, locks, and updates.
- feat: normalize Siemens LOGO! TSAP IDs via `localTSAP`, `remoteTSAP`, or the new `tsap_id` alias and add automated coverage for the parser.
- docs: expand the documentation with TIA Portal, STEP 7, und LOGO!Soft-Konfigurationsanleitungen für den neuen Entity-Workflow (textbasierte Beschreibung aufgrund fehlender Screenshot-Unterstützung).

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
