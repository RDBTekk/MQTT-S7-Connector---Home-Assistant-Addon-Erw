# MQTT Siemens S7 Connector – Home Assistant Add-ons Repository

[![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fdixi83%2Fhassio-addons)

![Supports aarch64 Architecture][aarch64-shield]
![Supports amd64 Architecture][amd64-shield]

> [!NOTE]
> Dieses Repository enthält keine binären Assets (z. B. Logos oder Icons). Home Assistant zeigt deshalb Standardplatzhalter an, wenn das Add-on installiert wird.

[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg

Dieses Repository bündelt den **MQTT Siemens S7 Connector** als Home-Assistant-Add-on. Die Erweiterung integriert [mqtt-s7-connector von Tim Römisch](https://github.com/timroemisch/mqtt-s7-connector) inklusive einer modernen Ingress-Oberfläche, die alle Einstellungen ohne manuelle YAML-Bearbeitung zulässt.

---

## Inhaltsverzeichnis

- [Funktionen](#funktionen)
- [Zweck](#zweck)
- [Voraussetzungen](#voraussetzungen)
- [Installation](#installation)
- [Add-on-Optionen](#add-on-optionen)
  - [Log-Level](#log-level)
  - [Konfigurationsdateien](#konfigurationsdateien)
    - [Einzelne SPS](#einzelne-sps)
    - [Mehrere SPS](#mehrere-sps)
- [Weboberfläche](#weboberfläche)
  - [Unterstützte Entitätstypen](#unterstützte-entitätstypen)
  - [Simulation und Live-Scan](#simulation-und-live-scan)
- [Standardkonfiguration](#standardkonfiguration)
- [Konfiguration per YAML](#konfiguration-per-yaml)
  - [`plc`-Objekt](#plc-objekt)
    - [Siemens LOGO! TSAP-IDs](#siemens-logo-tsap-ids)
  - [`mqtt`-Objekt](#mqtt-objekt)
  - [`entities`-Objekt](#entities-objekt)
  - [Adressformatierung](#adressformatierung)
  - [Entitätstypen und Attribute](#entitätstypen-und-attribute)
  - [Attributoptionen](#attributoptionen)
    - [`rw`-Option](#rw-option)
    - [`update_interval`-Option](#update_interval-option)
    - [`unit_of_measurement`-Option](#unit_of_measurement-option)
    - [`set_plc`-Option](#set_plc-option)
    - [`write_back`-Option](#write_back-option)
  - [Entitätsname und Gruppierung](#entitätsname-und-gruppierung)
- [Beispiele für SPS-Projektkonfigurationen](#beispiele-für-sps-projektkonfigurationen)
  - [Siemens TIA Portal](#siemens-tia-portal)
  - [STEP 7 Classic](#step-7-classic)
  - [LOGO!Soft Comfort](#logo-soft-comfort)
- [MQTT Auto Discovery](#mqtt-auto-discovery)
- [Credits](#credits)
- [Roadmap](#roadmap)
- [Lizenz](#lizenz)

---

## Funktionen

- **Home Assistant Ingress UI** – Vollständig integrierte Weboberfläche mit Login über Home Assistant. Optional steht ein Direktzugriff über Port `8099` zur Verfügung.【F:mqtt-s7-connector/DOCS.md†L57-L87】
- **Geführte Formulare** – Strukturierte Editoren für PLC-, MQTT- und Entitätsabschnitte sowie dynamische Key/Value-Listen für Expertenoptionen.【F:mqtt-s7-connector/DOCS.md†L66-L100】
- **Adress-Assistent** – Dropdowns und Builder für DB-/Merker-/E/A-Adressen, die automatisch mit erkannten SPS-Adressen befüllt werden.【F:mqtt-s7-connector/DOCS.md†L88-L100】
- **Live-SPS-Scan** – Aggregiert alle im Formular verwendeten Adressen, zeigt Zustände und markiert Fehler bei Verbindungsproblemen.【F:mqtt-s7-connector/DOCS.md†L80-L87】
- **PLC-Statuskarte** – Präsentiert Host, Rack/Slot, Firmware, Seriennummer und einen Online-Indikator für echte und simulierte Steuerungen.【F:mqtt-s7-connector/DOCS.md†L80-L99】
- **S7-1200-Testmodus** – Umschaltbare Simulation, die Ein- und Ausgänge zyklisch aktualisiert und das Verhalten einer realen SPS inklusive Metadaten nachbildet.【F:mqtt-s7-connector/DOCS.md†L92-L99】
- **Standardkonfiguration** – Vorgefertigte Blueprint-Konfiguration mit Beispielentitäten, LOGO!-TSAP-Defaults und MQTT-Voreinstellungen.【F:mqtt-s7-connector/DOCS.md†L116-L124】
- **Mehrere Konfigurationen** – Unterstützung für beliebig viele PLC-Profile, die separat gespeichert und über das GUI gewechselt werden können.【F:mqtt-s7-connector/DOCS.md†L40-L55】
- **Siemens LOGO!-Optimierungen** – Komfortable TSAP-Verwaltung über `tsap_id`-Kurzformen mit automatischer Normalisierung.【F:mqtt-s7-connector/DOCS.md†L139-L153】
- **Umfangreiche Entitätsvorlagen** – Presets für nahezu alle Home-Assistant-Domänen, inklusive Pumpen, Ventile, Klima, Mediengeräte, Sicherheit und mehr.【F:mqtt-s7-connector/DOCS.md†L101-L112】
- **MQTT-Brücke** – Bidirektionaler Datenaustausch zwischen Siemens-SPS und MQTT-Broker mit TLS, Keepalive und Write-Back-Unterstützung.【F:mqtt-s7-connector/DOCS.md†L160-L190】
- **Auto Discovery** – Optionale MQTT-Auto-Discovery-Payloads zur automatischen Einbindung der Entitäten in Home Assistant.【F:mqtt-s7-connector/DOCS.md†L200-L205】

## Zweck

Der Connector empfängt Daten vom MQTT-Broker, schreibt sie auf konfigurierte SPS-Adressen und veröffentlicht geänderte SPS-Werte wieder auf MQTT. So lassen sich Siemens-SPSen nahtlos in Home Assistant integrieren.【F:mqtt-s7-connector/DOCS.md†L21-L38】

## Voraussetzungen

- Home Assistant OS oder Supervised-Installation (andere Varianten unterstützen keine Add-ons)
- Ein [MQTT-Broker](https://github.com/home-assistant/addons/tree/master/mosquitto)
- Die Home Assistant [MQTT-Integration](https://www.home-assistant.io/integrations/mqtt/)
- Eine Siemens-SPS (S7-300/400/1200/1500 oder LOGO!) mit Ethernet-Verbindung
- Zugriff auf das SPS-Projekt bzw. die Engineering-Software【F:mqtt-s7-connector/DOCS.md†L40-L55】

## Installation

1. Öffne in Home Assistant **Einstellungen → Add-ons**.
2. Klicke unten rechts auf **Add-on-Store**.
3. Öffne oben rechts das Menü (⋮) und wähle **Repositories**.
4. Füge `https://github.com/dixi83/hassio-addons` hinzu und bestätige mit **Add**.
5. Schließe den Dialog, suche nach **MQTT Siemens S7 Connector** und klicke auf **Installieren**.

Alternativ kannst du den Repository-Link über den obigen Home-Assistant-Badge automatisch einfügen.【F:mqtt-s7-connector/DOCS.md†L55-L73】

## Add-on-Optionen

### Log-Level

Das Add-on unterstützt mehrere Log-Level. Für den Normalbetrieb wird `warning` empfohlen. Bei Problemen kann `debug` helfen, Details zur Fehlersuche zu protokollieren.【F:mqtt-s7-connector/DOCS.md†L73-L87】

### Konfigurationsdateien

Das Add-on liest eine oder mehrere YAML-Dateien aus dem Ordner `addon_configs/xxxxxxxx_mqtt-s7-connector` (innerhalb deiner Home-Assistant-Konfiguration). Jede Datei repräsentiert eine SPS.【F:mqtt-s7-connector/DOCS.md†L73-L100】

#### Einzelne SPS

```yaml
log_level: warning
config_files:
  - config.yaml
```

#### Mehrere SPS

```yaml
log_level: warning
config_files:
  - config_plc1.yaml
  - config_plc2.yaml
```

## Weboberfläche

Seit Version 1.1.0 steht eine integrierte Ingress-Oberfläche zur Verfügung. Darüber wählst du Konfigurationsdateien aus, bearbeitest PLC- und MQTT-Einstellungen, pflegst Entitäten und speicherst Änderungen direkt als YAML. Der Editor zeigt den aktuellen Log-Level, erlaubt dynamische Schlüssel/Wert-Listen und aktualisiert erkannte SPS-Adressen live. Eine SPS-Karte hebt Host, Rack/Slot, Firmware-Version sowie Online-/Simulationstatus hervor.【F:mqtt-s7-connector/DOCS.md†L80-L124】

### Unterstützte Entitätstypen

Die Dropdown-Liste **Typ** deckt nahezu alle Home-Assistant-Domänen ab und hinterlegt typische Felder automatisch – z. B. Soll-/Ist-Werte, Helligkeit, Lautstärke oder Timer-Dauern. Unterstützt werden u. a. `air_quality`, `alarm_control_panel`, `binary_sensor`, `button`, `camera`, `climate`, `cover`, `device_tracker`, `event`, `fan`, `geo_location`, `humidifier`, `image`, `input_boolean`, `input_button`, `input_datetime`, `input_number`, `input_select`, `input_text`, `light`, `lock`, `media_player`, `number`, `person`, `pump`, `remote`, `scene`, `script`, `select`, `sensor`, `siren`, `switch`, `text`, `timer`, `update`, `vacuum`, `valve`, `water_heater` und `weather`.【F:mqtt-s7-connector/DOCS.md†L100-L112】

### Simulation und Live-Scan

Über **SPS erneut einlesen** aktualisierst du die erkannten Datenpunkte jederzeit. Mit **Testmodus aktivieren** schaltest du eine integrierte S7-1200-Simulation zu, die zyklisch Ein- und Ausgänge aktualisiert und wie eine reale Steuerung wirkt. Ein weiterer Klick deaktiviert die Simulation und stellt die Verbindung zur echten SPS wieder her.【F:mqtt-s7-connector/DOCS.md†L88-L108】

## Standardkonfiguration

Zum schnellen Einstieg liefert das Add-on eine vollständige [Standardkonfiguration](mqtt-s7-connector/standard-config.yaml) mit dimmbarem Licht, Temperatursensor und schaltbarer Steckdose. Die Vorlage enthält sinnvolle LOGO!-TSAP-Werte, MQTT-Keepalive-Einstellungen und wird automatisch geladen, wenn noch keine YAML-Datei existiert. Speichere das Formular, um die Werte unter `/config/<dateiname>.yaml` abzulegen oder kopiere die Datei für weitere SPS-Profile.【F:mqtt-s7-connector/DOCS.md†L112-L138】

## Konfiguration per YAML

Nach der ersten Ausführung findest du im Ordner `addon_configs/xxxxxxxx_mqtt-s7-connector` eine Beispielkonfiguration (`config.example.yaml`). Kopiere diese Datei, benenne sie in `config.yaml` (oder beliebig nach Bedarf) um und trage die Dateinamen in der Add-on-Konfiguration ein.【F:mqtt-s7-connector/DOCS.md†L112-L138】

Die YAML-Datei gliedert sich in die Bereiche `plc`, `mqtt` und `entities`.

### `plc`-Objekt

Das `plc`-Objekt beschreibt die Verbindung zur SPS. In vielen Fällen genügt es, die IP-Adresse (`host`) anzupassen:

```yaml
plc:
  port: 102
  host: 192.168.0.1
  rack: 0
  slot: 2
  debug: false
```

#### Siemens LOGO! TSAP-IDs

LOGO!-Steuerungen erwarten spezifische TSAP-Kombinationen. Du kannst `localTSAP`/`remoteTSAP` direkt setzen oder die Kurzform `tsap_id` verwenden – sowohl in Hex (`0x4C00`) als auch dezimal (`19456`). Das Add-on normalisiert die Eingaben automatisch.【F:mqtt-s7-connector/DOCS.md†L138-L160】

```yaml
plc:
  host: 192.168.0.10
  tsap_id:
    local: 0x4C00
    remote: 0x1100
  timeout: 7000
```

### `mqtt`-Objekt

Hier definierst du den MQTT-Broker. Unterstützte Protokolle sind `mqtt`, `mqtts`, `tcp`, `tls`, `ws` und `wss`. Bei selbstsignierten Zertifikaten kannst du `rejectUnauthorized: false` setzen – beachte jedoch das Sicherheitsrisiko.【F:mqtt-s7-connector/DOCS.md†L160-L190】

```yaml
mqtt:
  host: mqtts://host.com:1234
  user: u
  password: p
  rejectUnauthorized: true
```

### `entities`-Objekt

`entities` ist eine Liste aller Home-Assistant-Entitäten. Jede Entität benötigt mindestens `name` und `type`; weitere Attribute ergänzt du nach Bedarf.【F:mqtt-s7-connector/DOCS.md†L190-L205】

```yaml
entities:
  - name: Dimmable Light
    type: light
    state: DB56,X150.0
    brightness: DB56,BYTE151
  - name: Dimmable Light 2
    type: light
    state: DB56,X150.1
```

> 💡 Hinweis: Der Editor speichert zusätzlich einen identischen `devices`-Abschnitt, damit ältere Connector-Versionen ohne UI-Anpassung weiterlaufen. Änderungen an Entitäten werden automatisch auf beide Listen gespiegelt.【F:mqtt-s7-connector/rootfs/usr/lib/mqtt-s7-config-ui/server.js†L244-L286】

### Adressformatierung

Die Adressierung folgt der Syntax der NodeS7-Bibliothek. Beispiele:

- `DB56,X150.0` – liest ein Bit ab Adresse 150.0 in DB56
- `DB51,REAL216` – liest vier Bytes (REAL) ab Adresse 216 in DB51
- `DB56,BYTE40` – liest ein Byte ab Adresse 40 in DB56

Unterstützte Datentypen: `X` (1 Bit → `true/false`), `BYTE` (1 Byte → `Int`), `REAL` (4 Bytes → `Float`).【F:mqtt-s7-connector/DOCS.md†L200-L229】

### Entitätstypen und Attribute

Die Konfigurationsoberfläche füllt neue Entitäten automatisch mit sinnvollen Feldern – etwa `brightness` für Lichter, `target_temperature` für Klima oder `speed` für Lüfter. Du kannst Attribute jederzeit hinzufügen, entfernen oder als Objekt mit erweiterten Optionen hinterlegen.【F:mqtt-s7-connector/DOCS.md†L205-L229】

### Attributoptionen

Anstatt eines einfachen Strings kannst du Attribute als Objekt definieren, um zusätzliche Optionen zu setzen.【F:mqtt-s7-connector/DOCS.md†L229-L267】

#### `rw`-Option

Steuert Lese-/Schreibrechte sowie MQTT-Verhalten (`r`, `w` oder `rw`).【F:mqtt-s7-connector/DOCS.md†L245-L267】

#### `update_interval`-Option

Sendet Werte in festen Intervallen (Millisekunden), selbst wenn sich nichts ändert.【F:mqtt-s7-connector/DOCS.md†L267-L276】

#### `unit_of_measurement`-Option

Ergänzt Einheitenangaben für Home Assistant.【F:mqtt-s7-connector/DOCS.md†L276-L283】

#### `set_plc`-Option

Trennt Lese- (`plc`) und Schreibadresse (`set_plc`) für dasselbe Attribut.【F:mqtt-s7-connector/DOCS.md†L283-L294】

#### `write_back`-Option

Schreibt bei aktivem `set_plc` gelesene Werte automatisch zurück, wenn `write_back: true` gesetzt ist.【F:mqtt-s7-connector/DOCS.md†L294-L305】

### Entitätsname und Gruppierung

Mit `device_name` fasst du mehrere Entitäten (z. B. Tür, Schloss und Sensor) in Home Assistant zu einem Gerät zusammen. So erscheinen zusammengehörige Datenpunkte in einer gemeinsamen Karte.【F:mqtt-s7-connector/DOCS.md†L305-L330】

## Beispiele für SPS-Projektkonfigurationen

Da in diesem Repository keine Screenshots abgelegt werden können, beschreiben die folgenden Schritt-für-Schritt-Anleitungen textuell, wo relevante TSAP- und Datenbaustein-Einstellungen zu finden sind.【F:mqtt-s7-connector/DOCS.md†L330-L372】

### Siemens TIA Portal

1. SPS-Projekt öffnen und Gerätekonfiguration der CPU aufrufen.
2. **Eigenschaften → Kommunikation → Verbindungen** wählen und die S7-Verbindung auswählen.
3. Unter **Allgemein → Verbindungstyp** sicherstellen, dass **ISO-on-TCP** aktiv ist.
4. TSAP-Werte für lokal/entfernt eintragen (z. B. `0x4C00`/`0x1100` für LOGO!).
5. Rack, Slot und verwendete Datenbausteine notieren – diese Werte landen im Add-on unter `plc` bzw. in den Entitäten.
6. Projekt laden, damit die Verbindung aktiv wird.【F:mqtt-s7-connector/DOCS.md†L338-L353】

### STEP 7 Classic

1. Projekt im **SIMATIC Manager** öffnen und **NetPro** starten.
2. Verbindungsbaustein wählen und **Objekteigenschaften** öffnen.
3. Kommunikationstyp **ISO-on-TCP** auswählen und TSAP-Werte setzen.
4. Rack-, Slot- und DB-Angaben prüfen und an die Add-on-Konfiguration anpassen.
5. Änderungen speichern, NetPro kompilieren und in die Steuerung laden.【F:mqtt-s7-connector/DOCS.md†L353-L363】

### LOGO!Soft Comfort

1. LOGO!-Projekt öffnen und zur **Netzwerkansicht** wechseln.
2. Kommunikationsbaustein für **Open User Communication (OUC)** hinzufügen oder bearbeiten.
3. **ISO-on-TCP** aktivieren und TSAP-Werte setzen (`0x4C00`/`0x1100`).
4. Merker- bzw. Datenbausteinadressen hinterlegen und identisch im Add-on eintragen.
5. Projekt speichern und auf die LOGO! übertragen.【F:mqtt-s7-connector/DOCS.md†L363-L372】

## MQTT Auto Discovery

Für jede Entität publiziert das Add-on automatisch eine Auto-Discovery-Nachricht im Home-Assistant-Format (Standard-Topic `homeassistant`). Bei Bedarf lässt sich das Topic in der YAML-Konfiguration anpassen.【F:mqtt-s7-connector/DOCS.md†L372-L381】

## Credits

- [plcpeople / nodeS7](https://github.com/plcpeople/nodeS7)
- [mqttjs / MQTT.js](https://github.com/mqttjs/MQTT.js)
- [Home Assistant Community Add-ons](https://github.com/hassio-addons/)
- [mqtt-s7-connector von Tim Römisch](https://github.com/timroemisch/mqtt-s7-connector)

## Roadmap

- [x] Zusätzliche Log-Level für den Connector
- [x] Mehrere SPS-Verbindungen
- [x] JSON- zu YAML-Konfiguration migrieren
- [x] Objekt `devices` in `entities` umbenennen (Breaking Change)
- [x] Siemens LOGO! inkl. `tsap_id` dokumentieren und testen
- [x] Textbasierte TIA-Portal-, STEP-7- und LOGO!Soft-Anleitungen
- [x] Weitere Home-Assistant-Entitäten
- [ ] Code Cleanup

Pull Requests sind jederzeit willkommen!

## Lizenz

[ISC-Lizenz](LICENSE)

Copyright (c) 2021 Tim Römisch
