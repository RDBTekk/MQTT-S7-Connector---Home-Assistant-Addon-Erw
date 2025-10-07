# MQTT S7 Connector - Home Assistant Addon

_MQTT Siemens S7 connector to integrate Siemens PLC's with Home Assistant_

![Supports aarch64 Architecture][aarch64-shield]
![Supports amd64 Architecture][amd64-shield]

> [!NOTE]
> Due to platform limitations this repository no longer ships binary artwork such as the add-on logo or icon. Home Assistant will therefore fall back to its default placeholder graphics when displaying the add-on.

[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg

This project integrates [mqtt-s7-connector developed by Tim Roemisch](https://github.com/timroemisch/mqtt-s7-connector) as an add-on for Home Assistant.

## Features

- **Home Assistant Ingress UI** – Vollständig integrierte Weboberfläche mit Anmeldung über Home Assistant, inklusive Unterstützung für direkten Zugriff über den optionalen Port 8099.【F:mqtt-s7-connector/DOCS.md†L57-L73】
- **Geführte Formulare** – Strukturierte Editoren für PLC-, MQTT- und Entitätsabschnitte, dynamische Key/Value-Listen sowie zusätzliche Bereiche für Expertenoptionen und Add-on-spezifische Extras.【F:mqtt-s7-connector/DOCS.md†L66-L87】
- **Adress-Assistent** – Dropdowns und Builder für DB-/Merker-/E/A-Adressen, die Tippfehler reduzieren und automatisch mit aktuell erkannten PLC-Adressen angereichert werden.【F:mqtt-s7-connector/DOCS.md†L88-L100】
- **Live-SPS-Scan** – Automatisches Auslesen sämtlicher im Formular referenzierten SPS-Adressen mit aktualisierbarer Tabelle, Statushinweisen und Fehlerkennzeichnung bei Verbindungsproblemen.【F:mqtt-s7-connector/DOCS.md†L80-L87】
- **PLC-Statuskarte** – Zeigt Host, Rack/Slot, Firmware, Seriennummer sowie einen Online-Indikator für reale und simulierte Steuerungen direkt in der Oberfläche an.【F:mqtt-s7-connector/DOCS.md†L80-L87】
- **S7-1200-Testmodus** – Umschaltbare Simulation, die Ein- und Ausgänge zyklisch aktualisiert und das Verhalten einer echten Steuerung inklusive Metadaten nachbildet.【F:mqtt-s7-connector/DOCS.md†L92-L99】
- **Standardkonfiguration** – Vorgefertigte Blueprint-Konfiguration mit Beispiel-Entitäten, LOGO!-TSAP-Defaults und MQTT-Voreinstellungen, die beim ersten Laden automatisch bereitsteht.【F:mqtt-s7-connector/DOCS.md†L116-L124】
- **Mehrere Konfigurationsdateien** – Unterstützung für beliebig viele PLC-Profile, die separat gespeichert und über das GUI ausgewählt werden können.【F:mqtt-s7-connector/DOCS.md†L40-L55】
- **Siemens LOGO! Optimierungen** – Komfortable TSAP-Verwaltung über `tsap_id`-Kurzformen mit automatischer Normalisierung für unterschiedliche Schreibweisen.【F:mqtt-s7-connector/DOCS.md†L139-L153】
- **Umfangreiche Entitätsvorlagen** – Vorbelegte Presets für nahezu alle Home-Assistant-Domänen, inklusive Pumpen, Ventile, Klima, Mediengeräte, Sicherheitskomponenten und mehr.【F:mqtt-s7-connector/DOCS.md†L101-L112】
- **MQTT Brückenfunktion** – Bidirektionaler Datenaustausch zwischen Siemens-SPS und MQTT-Broker inklusive TLS-Unterstützung, Keepalive-Optionen und Write-Back-Feldern.【F:mqtt-s7-connector/DOCS.md†L160-L190】
- **Auto Discovery** – Optionale MQTT-Auto-Discovery-Datenpunkte zur automatischen Einbindung der Entitäten in Home Assistant.【F:mqtt-s7-connector/DOCS.md†L200-L205】

Weitere Details zur Einrichtung findest du in der [ausführlichen Dokumentation](./DOCS.md), die neben der grafischen Oberfläche auch YAML-Optionen, LOGO!-Spezifika sowie Tipps für TIA Portal, STEP 7 und LOGO!Soft beschreibt.【F:mqtt-s7-connector/DOCS.md†L1-L20】

## Supported Home Assistant entities

Die Formularvorlagen in der Weboberfläche decken inzwischen nahezu alle Home-Assistant-Domänen ab und hinterlegen sinnvolle Startwerte für häufige Felder. Zur Auswahl stehen unter anderem:

`air_quality`, `alarm_control_panel`, `binary_sensor`, `button`, `camera`, `climate`, `cover`, `device_tracker`, `event`, `fan`, `geo_location`, `humidifier`, `image`, `input_boolean`, `input_button`, `input_datetime`, `input_number`, `input_select`, `input_text`, `light`, `lock`, `media_player`, `number`, `person`, `pump`, `remote`, `scene`, `script`, `select`, `sensor`, `siren`, `switch`, `text`, `timer`, `update`, `vacuum`, `valve`, `water_heater` und `weather`.

## Credits

- [plcpeople / nodeS7](https://github.com/plcpeople/nodeS7)
- [mqttjs / MQTT.js](https://github.com/mqttjs/MQTT.js)
- [Home Assistant Community Addons](https://github.com/hassio-addons/)
- [mqtt-s7connector](https://github.com/timroemisch/mqtt-s7-connector) developed by Tim Roemisch

## TODO

- [x] add additional log levels to mqtt-s7-connector
- [x] add multi PLC connection support
- [x] config file and documentation json > yaml (yaml is easier then json)
- [x] rename object `devices` to `entities` (we are creating entities here not devices, **this will be a breaking update!**)
- [x] test and document support for Siemens LOGO! with tsap_id's [it should work](https://github.com/plcpeople/nodeS7/issues/37)
- [x] add ausführliche Dokumentation für die Konfiguration in TIA Portal, STEP 7 und LOGO!Soft (textbasierte Anleitung wegen fehlender Screenshot-Unterstützung)
- [x] add more Home Assistant [entities](https://developers.home-assistant.io/docs/core/entity)
- [ ] code cleanup

Pull requests welcome!
