# MQTT S7 Connector - Home Assistant Addon

_MQTT Siemens S7 connector to integrate Siemens PLC's with Home Assistant_

![Supports aarch64 Architecture][aarch64-shield]
![Supports amd64 Architecture][amd64-shield]

> [!NOTE]
> Due to platform limitations this repository no longer ships binary artwork such as the add-on logo or icon. Home Assistant will therefore fall back to its default placeholder graphics when displaying the add-on.

[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg

This project integrates [mqtt-s7-connector developed by Tim Roemisch](https://github.com/timroemisch/mqtt-s7-connector) as an add-on for Home Assistant.

The [DOCS.md](./DOCS.md) file will contain everything you need to know to make the addon work with your Home Assistant installation and your Siemens PLC. It now also covers the built-in configuration web UI that is available directly through Home Assistant ingress, inklusive geführter Formulare für PLC-, MQTT- und Entitäten-Definitionen, einer Live-Ansicht aller in der Konfiguration verwendeten SPS-Adressen sowie eines schaltbaren S7-1200-Testmodus mit simulierten Ein-/Ausgängen.

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
