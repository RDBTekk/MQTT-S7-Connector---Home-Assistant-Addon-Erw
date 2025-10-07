# MQTT S7 Connector - Home Assistant Addon

This project integrates [mqtt-s7connector developed by Tim Roemisch](https://github.com/timroemisch/mqtt-s7-connector) as an add-on for Home Assistant.

This documentation file is edited so it will contain everything you need to know to make it work with your Home Assistant installation and your Siemens PLC.

> **Hinweis:** Damit Branch-Aktualisierungen in chatgpt.com funktionieren, enthält dieses Repository keine binären Assets wie Logos oder Icons.
> Home Assistant zeigt deshalb das Standardplatzhalterbild an, wenn das Add-on installiert wird.

- [Purpose](#purpose)
- [Requirements:](#requirements)
- [How to install](#how-to-install)
- [Addon options](#addon-options)
  - [Single PLC](#single-plc)
  - [Multiple PLC's](#multiple-plcs)
- [Weboberfläche](#weboberflache)
- [Configuration](#configuration)
  - [Log level](#log-level)
  - [Config File](#config-file)
    - [`plc` Object](#plc-object)
    - [`mqtt` Object](#mqtt-object)
    - [`entities` Object](#entities-object)
  - [Address formatting](#address-formatting)
  - [Entity types and attributes](#entity-types-and-attributes)
  - [Attribute Options](#attribute-options)
    - [`rw` option](#rw-option)
    - [`update_interval` option](#update_interval-option)
    - [`unit_of_measurement` option](#unit_of_measurement-option)
    - [`set_plc` option](#set_plc-option)
    - [`write_back` option](#write_back-option)
  - [Entity name](#entity-name)
- [Auto Discovery](#auto-discovery)
- [License](#license)

## Purpose

This tool can receive data over mqtt and can write it to a designated address on a plc and vice versa, enabling smart home data to be displayed in the Home Assistant.

## Requirements:

- Home Assistant installation (HAOS or Supervised, other installation methods do not support addons)
- a [MQTT broker](https://github.com/home-assistant/addons/tree/master/mosquitto)
- the Home Assistant [MQTT integration](https://www.home-assistant.io/integrations/mqtt/)
- Siemens PLC (S7-300,400,1200 or 1500) with an ethernet connection. I will add support for LOGO
- Access to the PLC program/software

## How to install

- Open your Home Assistant web interface
- Go to Settings > Add-ons
- In the lower right corner click "Add-on Store"
- At the top right, click the 3 dots and "Repositories"
- Now add `https://github.com/dixi83/hassio-addons` and click "Add" followed by "Close"
- Find the "MQTT Siemens S7 Connector" in the store and click "Install"

Or add the repo by clicking:

[![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fdixi83%2Fhassio-addons)

## Addon options

### Log level

There are several log levels if there are problems changing the level to debug could help identify the problem. If you have issues and want support, please share switch to debug and share the log information.

`warning` is the recommended log level.

### Config files

Here you can add a config file for each PLC you want to connect with. The files should be placed in the `addon_configs\xxxxxxxx_mqtt-s7-connector` folder

#### Single PLC

If you just need to connect to 1 PLC, use this configuration:

```yaml
log_level: warning
config_files:
  - config.yaml
```

#### Multiple PLC's

If you have multiple PLC's use this as an example:

```yaml
log_level: warning
config_files:
  - config_plc1.yaml
  - config_plc2.yaml
```

## Weboberfläche

Ab Version 1.1.0 des Add-ons steht eine integrierte Weboberfläche zur Verfügung, die über Ingress direkt in Home Assistant geöffnet wird.

- Öffne in Home Assistant den Reiter **Einstellungen → Add-ons → MQTT Siemens S7 Connector**.
- Klicke auf **Öffnen** oder auf den neuen Eintrag in der linken Navigationsleiste. Die Oberfläche lädt automatisch im Home Assistant Frontend.
- Wähle im Drop-down die gewünschte Konfigurationsdatei.
- Passe im Abschnitt **PLC-Verbindung** die SPS-Zugangsdaten an.
- Hinterlege im Bereich **MQTT-Einstellungen** die Broker-Zugangsdaten.
- Lege unter **Entitäten** neue Einträge an oder bearbeite bestehende – inklusive aller Attribute.
- Füge bei Bedarf zusätzliche Felder in den Bereichen **Weitere PLC-/MQTT-Optionen** oder **Weitere Einstellungen** hinzu.
- Mit **Speichern** werden alle Änderungen als YAML in der Datei unter `/config` abgelegt. Ein Neustart des Add-ons lädt die neue Konfiguration.

Die Oberfläche zeigt auch den aktuell gesetzten Log-Level sowie die Anzahl der eingebundenen Konfigurationsdateien an. Die Eingabeformulare akzeptieren Text-, Zahlen- und Boolean-Werte; komplexe Attribute lassen sich über dynamische Schlüssel/Wert-Listen verwalten und bei Bedarf erweitern oder entfernen. Zusätzlich liest die Ansicht „SPS Ein-/Ausgänge“ automatisch die in der Konfiguration hinterlegten PLC-Adressen aus, baut eine Verbindung zur SPS auf und zeigt die zuletzt gelesenen Werte an. Mit **SPS erneut einlesen** lässt sich die Abfrage jederzeit aktualisieren, um schnell zu prüfen, ob alle Adressen erreichbar sind. Direkt darüber hebt eine neue PLC-Karte Host, Rack/Slot, Firmware-Version und den letzten Scan hervor und signalisiert über eine farbige Statusanzeige, ob die Verbindung online, offline oder simuliert ist.

Über den Button **Testmodus aktivieren** startest du auf Wunsch eine integrierte S7-1200-Simulation. Die Weboberfläche verhält sich dann so, als wäre eine echte Steuerung verbunden: Ein- und Ausgangswerte wechseln zyklisch, TSAP-Einstellungen werden übernommen und die Statuskarte zeigt das virtuelle Modell inklusive Firmware/Seriennummer an. Ein weiterer Klick deaktiviert die Simulation wieder und stellt die Verbindung zur realen SPS her.

> Hinweis: Damit die Erkennung funktioniert, müssen im Abschnitt `plc:` gültige Verbindungsparameter hinterlegt sein. Schlägt der Verbindungsaufbau fehl, weist die Oberfläche darauf hin und markiert alle Adressen entsprechend.

> Tipp: Zusätzlich steht der Editor auch außerhalb von Ingress über `http://<deine-home-assistant-adresse>:8099/` zur Verfügung, sofern der Port im Add-on freigegeben wurde.

### Unterstützte Entitätstypen

Die Dropdown-Liste **Typ** enthält Vorlagen für nahezu alle Home-Assistant-Entitäten. Beim Auswählen werden typische Felder automatisch ergänzt – etwa Sollwerte mit getrennten `plc`/`set_plc`-Adressen oder Zusatzinformationen wie Helligkeit, Lautstärke oder Timer-Dauer. Unterstützt werden unter anderem folgende Domänen:

`air_quality`, `alarm_control_panel`, `binary_sensor`, `button`, `camera`, `climate`, `cover`, `device_tracker`, `event`, `fan`, `geo_location`, `humidifier`, `image`, `input_boolean`, `input_button`, `input_datetime`, `input_number`, `input_select`, `input_text`, `light`, `lock`, `media_player`, `number`, `person`, `pump`, `remote`, `scene`, `script`, `select`, `sensor`, `siren`, `switch`, `text`, `timer`, `update`, `vacuum`, `valve`, `water_heater` und `weather`.

## Configuration

After installing the Addon and the initial run a folder is created, the `\addon_configs\xxxxxxxx_mqtt-s7-connector` folder. Inside this folder you'll find the [`config.example.yaml`](https://github.com/dixi83/mqtt-s7-connector/blob/master/config.example.yaml) file. This file contains an example of the configuration. Copy the file and rename it to `config.yaml` as a starting point. If you need multiple PLC connections then create for every connection a config file, and add the file names in your addon configuration.

There are several ways to get access to this folder and files, e.g.:

- Samba share add-on
- File editor add-on
- Visual Studio server add-on

### Standard configuration

To get started quickly the add-on ships with a complete [standard configuration](./standard-config.yaml) that mirrors the values
shown in the graphical editor. When no YAML file is present the UI loads this blueprint automatically so you can adapt the IP
address, MQTT credentials, and pre-defined entities without staring at an empty form. The example covers a dimmable light,
temperature sensor, and controllable socket together with sensible defaults for Siemens LOGO! TSAP IDs and MQTT keepalive.

Save the form once to persist the generated YAML under `/config/<your-file>.yaml`. You can also copy the
[`standard-config.yaml`](./standard-config.yaml) file to create new PLC profiles manually.

The below documentation is for the YAML config format, as this will be default and recommended for Home Assistant. For configuring the addon in JSON please refer to: [JSON docs](https://github.com/dixi83/mqtt-s7-connector/blob/master/CONFIG_JSON.md)

### Config File

The configuration file has to be located in the same directory as the installation and has to be named like `config_plc1.yaml` or `config_plc2.yaml` as long as it matches the config_file setting of the addon.

**An example of a correct configuration file is found in [`config.example.yaml`](https://github.com/dixi83/mqtt-s7-connector/blob/master/config.example.yaml).**

The **yaml** config file has to be valid YAML (You can check [here](https://www.yamllint.com/) if it´s correct)  
and it is separated in 3 sections:

- [`plc:`](#plc-object)
- [`mqtt:`](#mqtt-object)
- [`entities:`](#entities-object)

#### `plc` Object

_General setup of the connection to the plc_

In the most use cases you only have to change the host value to the correct ip

```yaml
plc:
  port: 102
  host: 192.168.0.1
  rack: 0
  slot: 2
  debug: false
```

##### Siemens LOGO! TSAP IDs

Siemens LOGO! Steuerungen erwarten spezifische TSAP-Kombinationen für Client (Home Assistant) und Server (SPS). Hinterlege diese
entweder direkt über `localTSAP` und `remoteTSAP` oder nutze die Kurzform `tsap_id`, die beide Werte gleichzeitig setzt. Werte
können als Hex-Zahl (`0x4C00`), Dezimalzahl (`19456`) oder kommagetrennt (`0x4C00,0x1100`) angegeben werden – der Konfigurations-
dienst normalisiert die Eingabe automatisch.

```yaml
plc:
  host: 192.168.0.10
  tsap_id:
    local: 0x4C00
    remote: 0x1100
  timeout: 7000
```

Die Werte decken die Standard-TIAPortal-/LOGO!Soft-Voreinstellungen ab und werden auch in der bereitgestellten
[Standardkonfiguration](./standard-config.yaml) verwendet.

#### `mqtt` Object

_general setup of the connection to the mqtt broker_

The URL/host value can be one of the following protocols: 'mqtt', 'mqtts', 'tcp', 'tls', 'ws', 'wss'.

If you are using a self-signed certificate, use the `rejectUnauthorized: false` option. Beware that you are exposing yourself to man in the middle attacks, so it is a configuration that is not recommended for production environments.
[More info](https://github.com/mqttjs/MQTT.js#mqttconnecturl-options)

```yaml
mqtt:
  host: mqtts://host.com:1234
  user: u
  password: p
  rejectUnauthorized: true
```

#### `entities` Object

_list of all registered Home Assistant entities_

The list of entities is implemented as an array in YAML.
Each entity has its own entry in this list and will be configured there.

Each entity has to have a 'name' entry and a 'type' entry, the remaining attributes are optional

```yaml
entities:
  - name: Dimmable Light,
    type: light,
    state: DB56,X150.0,
    brightness: DB56,BYTE151
  - name: Dimmable Light 2,
    type: light,
    state: DB56,X150.1,
```

### Address formatting

This tool uses the NodeS7 Library and it uses the same address formatting.  
An example of correct formatted addresses is found at the [NodeS7 Repository](https://github.com/plcpeople/nodeS7#examples)

**Address examples:**  
DB56,X150.0 _(read from DB56 one bit at 150.0)_  
DB51,REAL216 _(read from DB51 four bytes starting from byte 216)_  
DB56,BYTE40 _(read from DB56 one byte at 40)_

**Supported data types**  
X = 1 Bit -> converted to true / false  
BYTE = 1 Byte (8 Bit) -> converted to Int  
REAL = 4 Bytes (32 Bit) -> converted to Float

For more information see the [NodeS7 Repository](https://github.com/plcpeople/nodeS7#examples)

### Entity types and attributes

The entity type categories mirror the Home Assistant core integration names. The configuration UI seeds each newly created entity with useful defaults for the following types:

- `light` – adds `state` and `brightness` attributes and wires them to PLC read/write addresses.
- `switch` – adds a single `state` attribute for toggling digital outputs.
- `sensor` – creates a `state` attribute and pre-fills `device_class`, `unit_of_measurement`, and `state_class` metadata for common measurements.
- `binary_sensor` – adds a `state` attribute and defaults the `device_class` to `motion`.
- `cover` – provides `state` and `position` attributes for blinds or shutters.
- `climate` – configures `temperature`, `target_temperature`, and `hvac_mode` fields so you can track and control setpoints.
- `fan` – includes `state` and `speed` attributes.
- `humidifier` – exposes `state` and `humidity`.
- `lock` – includes a writable `state` attribute for locking actuators.
- `number` – generates a writable `state` attribute suitable for analog values.
- `select` and `text` – expose a single string-based `state` attribute.
- `button` – adds a `command` structure that only writes a `set_plc` value when pressed.
- `update` – tracks `installed_version` and `latest_version`.

You can freely add, rename, or remove attributes from each entity card. Any attribute may be converted into an object to access advanced options such as custom TSAP destinations or write-back behaviour.

### Attribute Options

A "simple" entity has just the plc address as the value of the attributes,  
however it's possible to configure each attribute individually by assigning an object instead of a string to it.

Simple Attribute:

```yaml
state: DB56,X150.0
```

Rewritten Attribute:

```yaml
state:
  plc: DB56,X150.0
```

Now after rewriting it's possible to add more options inside the brackets of the attribute.

**Available options:**

#### `rw` option

Changes the read / write permissions

|     | Read PLC | Write PLC | Subscribe MQTT | Publish MQTT |
| --- | -------- | --------- | -------------- | ------------ |
| r   | ✅       | ❌        | ❌             | ✅           |
| w   | ❌       | ✅        | ✅             | ❌           |
| rw  | ✅       | ✅        | ✅             | ✅           |

```yaml
state:
  plc: DB56,X150.0,
  rw: r
```

#### `update_interval` option

By default, (without this option) each attribute will send an update over mqtt after it changes, but this option will disable it and set an interval for updates.  
The time is set in ms

```yaml
state:
  plc: DB56,BYTE234,
  update_interval: 1000
```

#### `unit_of_measurement` option

This is only for Home Assistant. It will add an additional unit of measurement to the data.

```yaml
state:
  plc: DB56,REAL10,
  unit_of_measurement: km/h
```

#### `set_plc` option

By default, attributes have only one address, but if you define "set_plc"  
the attribute will read from "plc" and write to "set_plc"

```yaml
state:
  plc: DB56,X150.0,
  set_plc: DB56,X150.1
```

#### `write_back` option

When using both `plc_address` and `plc_set_address`, setting `write_back` to `true`
will automatically write any changes read from `plc_address` to `plc_set_address`.

```yaml
state:
  plc: DB56,X150.0,
  set_plc: DB56,X150.1,
  write_back: true
```

### Entity name

If your entity has multiple sensors/lights/switches etc., you can set for each item the `device_name` propertie for items that belong together. E.g. a entity as multiple a garage door has 2 switches 1 for lockimng it and 1 open/closing the door and even a temperature sensor for the motor. This could look like this:

```
  - name: Garage door open/close
    type: binarycover
    currentPosition: DB56,X0.0
    targetPosition: DB56,X0.1
    device_name: Garage door
  - name: Garage door lock
    type: switch
    state: DB56,X0.3
    device_name: Garage door
  - name: Motor temperature
    type: sensor
    state: DB56,REAL2
    device_name: Garage door
```

![garage door example result](images/HA-entity.png)

## PLC project configuration examples

Die folgenden Schritt-für-Schritt-Anleitungen beschreiben, wo die relevanten Einstellungen für TSAPs und Datenbausteine in den gängigen Siemens-Entwicklungsumgebungen hinterlegt werden. Aufgrund der Beschränkung, dass in diesem Repository keine Binärdateien abgelegt werden dürfen, werden die Schritte textuell erläutert.

### Siemens TIA Portal

1. Öffne dein SPS-Projekt und wechsle zum Gerätekonfigurations-Editor der betreffenden CPU.
2. Navigiere zu **Eigenschaften → Kommunikation → Verbindungen** und wähle deine S7-Verbindung aus.
3. Stelle unter **Allgemein → Verbindungstyp** sicher, dass **ISO-on-TCP** aktiviert ist.
4. Trage im Bereich **TSAP** die Werte für **lokaler TSAP** und **entfernter TSAP** ein. Für LOGO!-Geräte kannst du z. B. die Standardwerte aus der Add-on-Standardkonfiguration verwenden (`0x4C00` / `0x1100`).
5. Notiere dir die Parameter **Rack**, **Slot** sowie den verwendeten Datenbaustein (DB-Nummer und Startadresse). Diese Angaben werden im Add-on unter `plc` bzw. in den Entitätseigenschaften benötigt.
6. Übernimm die Einstellungen und lade das Projekt in die SPS, damit die neue Verbindung aktiv wird.

### STEP 7 Classic

1. Öffne dein Projekt im **SIMATIC Manager** und starte den **NetPro**-Editor.
2. Wähle den gewünschten Verbindungsbaustein (z. B. S7-Verbindung) aus und öffne die **Objekteigenschaften**.
3. Unter **Allgemein → Verbindung** wählst du den Kommunikationstyp **ISO-on-TCP** und definierst die beiden TSAP-Werte.
4. Prüfe unter **Partner** die Angaben zu Rack, Slot sowie den verwendeten DB. Passe den Adressbereich so an, dass er zu den im Add-on konfigurierten Entitäten passt.
5. Speichere die Änderungen, kompiliere NetPro und lade die Hardwarekonfiguration in die Steuerung.

### LOGO!Soft Comfort

1. Öffne dein LOGO!-Projekt und wechsle in die **Netzwerkansicht**.
2. Füge einen Kommunikationsbaustein für **Open User Communication (OUC)** hinzu oder bearbeite einen vorhandenen Baustein.
3. Setze die Optionen **ISO-on-TCP** sowie die TSAP-Werte. LOGO!Soft verwendet standardmäßig `0x4C00` (Client) und `0x1100` (Server); diese Werte sind mit dem Add-on kompatibel.
4. Hinterlege die gewünschten Merker- oder Datenbausteinadressen im Kommunikationsbaustein. Die gleichen Adressen trägst du anschließend in der Add-on-GUI für deine Entitäten ein.
5. Speichere das Projekt und übertrage es auf die LOGO!, damit die Kommunikation aktiv wird.

## Auto Discovery

This tool will send for each entity an auto-discovery message over mqtt in the correct format defined by Home Assistant.

The default mqtt topic is `homeassistant`, if for some reason this needs to be changed than it can be changed in the config file. (See the [example](https://github.com/dixi83/mqtt-s7-connector/blob/master/config.example.yaml#L9))

## License

[Licensed under ISC](LICENSE)  
Copyright (c) 2021 Tim Römisch
