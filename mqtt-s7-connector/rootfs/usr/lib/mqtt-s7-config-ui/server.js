#!/usr/bin/env node

const http = require("http");
const fs = require("fs");
const path = require("path");
const YAML = require("yaml");
const NodeS7 = require("nodes7");

const HOST = "0.0.0.0";
const PORT = 8099;
const OPTIONS_PATH = "/data/options.json";
const CONFIG_DIR = "/config";
const PLC_SCAN_TIMEOUT = 10000;

const TEST_MODE_PROFILE = Object.freeze({
  name: "S7-1200 Simulation",
  host: "test-s71200.local",
  port: 102,
  rack: 0,
  slot: 1,
  model: "CPU 1214C DC/DC/DC",
  firmware: "V4.5.0",
  serial: "SIM1200-0001",
});

const DEVICE_ALIAS_IGNORED_KEYS = Object.freeze([
  "friendly_name",
  "topic",
]);

const testModeState = {
  enabled: false,
  cycle: 0,
  lastActivated: null,
};

function loadOptions() {
  try {
    const raw = fs.readFileSync(OPTIONS_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (error) {
    return {};
  }
}

function resolveFileName(file, allowedFiles) {
  if (!file || typeof file !== "string") {
    return null;
  }

  const sanitized = file.trim();
  if (!allowedFiles.includes(sanitized)) {
    return null;
  }

  const resolvedPath = path.join(CONFIG_DIR, sanitized);
  const normalized = path.normalize(resolvedPath);

  if (!normalized.startsWith(CONFIG_DIR)) {
    return null;
  }

  return normalized;
}

function allowedConfigFiles(options) {
  const files = options.config_files;
  if (Array.isArray(files) && files.length > 0) {
    return files.filter(
      (entry) => typeof entry === "string" && entry.trim() !== "",
    );
  }
  return ["config.yaml"];
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

const STANDARD_ENTITIES = Object.freeze([
  {
    name: "Wohnzimmer Licht",
    type: "light",
    friendly_name: "Wohnzimmer Licht",
    state: "DB56,X150.0",
    brightness: {
      plc: "DB56,BYTE151",
      set_plc: "DB56,BYTE151",
    },
  },
  {
    name: "Wohnzimmer Temperatur",
    type: "sensor",
    friendly_name: "Wohnzimmer Temperatur",
    unit_of_measurement: "°C",
    device_class: "temperature",
    state: "DB60,REAL0",
  },
  {
    name: "Wohnzimmer Steckdose",
    type: "switch",
    friendly_name: "Wohnzimmer Steckdose",
    state: {
      plc: "DB10,X0.0",
      set_plc: "DB10,X0.0",
    },
  },
]);

const STANDARD_CONFIG = Object.freeze({
  plc: {
    host: "192.168.0.1",
    port: 102,
    rack: 0,
    slot: 2,
    timeout: 5000,
    localTSAP: "0x4C00",
    remoteTSAP: "0x1100",
  },
  mqtt: {
    host: "mqtt://homeassistant.local",
    user: "homeassistant",
    password: "homeassistant",
    clientId: "mqtt-s7-connector",
    keepalive: 60,
    rejectUnauthorized: true,
  },
  entities: STANDARD_ENTITIES,
  devices: STANDARD_ENTITIES.map(sanitizeLegacyDeviceEntry),
});

function cloneStandardConfig() {
  return JSON.parse(JSON.stringify(STANDARD_CONFIG));
}

function sanitizeLegacyDeviceEntry(entity) {
  if (!entity || typeof entity !== "object") {
    return entity;
  }

  const clone = { ...entity };
  DEVICE_ALIAS_IGNORED_KEYS.forEach((key) => {
    if (key in clone) {
      delete clone[key];
    }
  });
  return clone;
}

function getTestModeState() {
  return {
    enabled: testModeState.enabled,
    lastActivated: testModeState.lastActivated,
    metadata: TEST_MODE_PROFILE,
  };
}

function setTestModeEnabled(enabled) {
  const next = Boolean(enabled);
  if (next && !testModeState.enabled) {
    testModeState.lastActivated = new Date().toISOString();
    testModeState.cycle = 0;
  }
  if (!next && testModeState.enabled) {
    testModeState.cycle = 0;
  }
  testModeState.enabled = next;
  return getTestModeState();
}

function incrementTestModeCycle() {
  testModeState.cycle = (testModeState.cycle + 1) % 100000;
  return testModeState.cycle;
}

function simulateTestValue(address, index, cycle) {
  if (!address) {
    return "";
  }
  const normalized = String(address).trim().toUpperCase();
  const offset = cycle + index;

  if (normalized.includes("REAL")) {
    const base = 22 + Math.sin((offset % 360) * (Math.PI / 180)) * 8;
    return Number(base.toFixed(2));
  }
  if (normalized.includes("DINT")) {
    return (offset * 97) % 10000;
  }
  if (normalized.includes("INT")) {
    return (offset * 23) % 2000;
  }
  if (normalized.includes("WORD")) {
    return (offset * 41) % 65535;
  }
  if (normalized.includes("BYTE")) {
    return (offset * 13) % 255;
  }
  if (normalized.includes("X") || /\.\d+$/.test(normalized)) {
    return offset % 2 === 0;
  }
  if (normalized.includes("CHAR") || normalized.includes("STRING")) {
    return `Demo-${(offset % 10) + 1}`;
  }
  return (offset * 7) % 1000;
}

function simulateTestProbe(connectionConfig, addresses) {
  const cycle = incrementTestModeCycle();
  const now = new Date().toISOString();
  const baseConnection = {
    ...TEST_MODE_PROFILE,
    ...(connectionConfig && typeof connectionConfig === "object"
      ? connectionConfig
      : {}),
    mode: "test",
    simulated: true,
    lastScan: now,
  };

  if (!Array.isArray(addresses) || addresses.length === 0) {
    return {
      connected: true,
      message: "Testmodus aktiv: Keine SPS-Adressen konfiguriert.",
      connection: baseConnection,
      addresses: [],
    };
  }

  const results = createProbeResultTemplate(addresses).map((entry, index) => ({
    ...entry,
    status: "ok",
    message: "Simulierter Wert",
    value: formatValueForDisplay(
      simulateTestValue(entry.address, index, cycle),
    ),
  }));

  return {
    connected: true,
    message: "Testmodus aktiv: Werte werden simuliert.",
    connection: baseConnection,
    addresses: results,
  };
}

function normalizeRootConfig(config) {
  const source = isPlainObject(config) ? config : {};
  const rawEntities = Array.isArray(source.entities)
    ? source.entities
    : Array.isArray(source.devices)
      ? source.devices
      : [];
  const normalized = {
    plc: isPlainObject(source.plc) ? { ...source.plc } : {},
    mqtt: isPlainObject(source.mqtt) ? { ...source.mqtt } : {},
    entities: rawEntities
      .filter((entity) => isPlainObject(entity))
      .map((entity) => ({ ...entity })),
    extras: {},
  };

  Object.entries(source).forEach(([key, value]) => {
    if (!["plc", "mqtt", "entities", "devices"].includes(key)) {
      normalized.extras[key] = value;
    }
  });

  return normalized;
}

function prepareConfigForSave(data) {
  const normalized = normalizeRootConfig(data);
  const output = {};

  if (Object.keys(normalized.plc).length > 0) {
    output.plc = normalized.plc;
  }
  if (Object.keys(normalized.mqtt).length > 0) {
    output.mqtt = normalized.mqtt;
  }

  const shouldIncludeEntities =
    normalized.entities.length > 0 ||
    Array.isArray(data?.entities) ||
    Array.isArray(data?.devices);

  if (shouldIncludeEntities) {
    const clonedEntities = normalized.entities.map((entity) => ({
      ...entity,
    }));
    output.entities = clonedEntities.map((entity) => ({ ...entity }));
    output.devices = clonedEntities.map((entity) => sanitizeLegacyDeviceEntry(entity));
  }

  Object.entries(normalized.extras).forEach(([key, value]) => {
    output[key] = value;
  });

  return output;
}

function parseNumeric(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function normalizeTsapValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const hex = value.toString(16).toUpperCase().padStart(4, "0");
    return `0x${hex}`;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (/^0x[0-9a-f]{1,4}$/iu.test(trimmed)) {
      return `0x${trimmed.slice(2).toUpperCase().padStart(4, "0")}`;
    }
    if (/^[0-9a-f]{1,4}$/iu.test(trimmed)) {
      return `0x${trimmed.toUpperCase().padStart(4, "0")}`;
    }
    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric)) {
      return `0x${numeric.toString(16).toUpperCase().padStart(4, "0")}`;
    }
    return trimmed;
  }

  return null;
}

function sanitizeConnectionConfig(config) {
  if (!config || typeof config !== "object") {
    return null;
  }

  const host = typeof config.host === "string" ? config.host.trim() : "";
  if (!host) {
    return null;
  }

  const sanitized = {
    host,
    port: parseNumeric(config.port, 102),
    rack: parseNumeric(config.rack, 0),
    slot: parseNumeric(config.slot, 2),
  };

  const localTsap = normalizeTsapValue(config.localTSAP);
  if (localTsap) {
    sanitized.localTSAP = localTsap;
  }
  const remoteTsap = normalizeTsapValue(config.remoteTSAP);
  if (remoteTsap) {
    sanitized.remoteTSAP = remoteTsap;
  }
  if (config.tsap_id !== undefined) {
    const tsap = config.tsap_id;
    const assignFromValue = (value, targetKey) => {
      const normalized = normalizeTsapValue(value);
      if (normalized && !sanitized[targetKey]) {
        sanitized[targetKey] = normalized;
      }
    };
    if (isPlainObject(tsap)) {
      assignFromValue(tsap.local ?? tsap.client, "localTSAP");
      assignFromValue(tsap.remote ?? tsap.server, "remoteTSAP");
    } else if (Array.isArray(tsap)) {
      if (tsap.length > 0) {
        assignFromValue(tsap[0], "localTSAP");
      }
      if (tsap.length > 1) {
        assignFromValue(tsap[1], "remoteTSAP");
      }
    } else if (typeof tsap === "string" && /[,;\s/]+/.test(tsap)) {
      const parts = tsap.split(/[,;\s/]+/u).filter(Boolean);
      if (parts.length > 0) {
        assignFromValue(parts[0], "localTSAP");
      }
      if (parts.length > 1) {
        assignFromValue(parts[1], "remoteTSAP");
      }
    } else {
      assignFromValue(tsap, "remoteTSAP");
    }
  }
  if (typeof config.debug === "boolean") {
    sanitized.debug = config.debug;
  }
  if (typeof config.timeout !== "undefined") {
    sanitized.timeout = parseNumeric(config.timeout, undefined);
  }
  if (typeof config.doNotOptimize === "boolean") {
    sanitized.doNotOptimize = config.doNotOptimize;
  }

  return sanitized;
}

function isLikelyPlcAddress(value) {
  if (typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  const patterns = [
    /^[A-Za-z]{1,4}\d*,[A-Za-z]+[0-9.,]*$/u,
    /^[A-Za-z]{1,4}\d*(?:\.[0-9]+.*)?$/u,
  ];
  return patterns.some((regex) => regex.test(trimmed));
}

function collectPlcAddresses(config) {
  if (!config || typeof config !== "object") {
    return [];
  }

  const entities = Array.isArray(config.entities)
    ? config.entities
    : Array.isArray(config.devices)
      ? config.devices
      : [];
  const addresses = [];

  entities.forEach((entity, index) => {
    if (!entity || typeof entity !== "object") {
      return;
    }
    const entityName =
      typeof entity.name === "string" && entity.name.trim()
        ? entity.name.trim()
        : `Entität ${index + 1}`;

    Object.entries(entity).forEach(([key, rawValue]) => {
      if (["name", "type", "friendly_name", "topic"].includes(key)) {
        return;
      }

      if (typeof rawValue === "string" && isLikelyPlcAddress(rawValue)) {
        addresses.push({
          entity: entityName,
          attribute: key,
          role: "plc",
          address: rawValue.trim(),
        });
        return;
      }

      if (!rawValue || typeof rawValue !== "object") {
        return;
      }

      const { plc, set_plc: setPlc } = rawValue;
      if (typeof plc === "string" && isLikelyPlcAddress(plc)) {
        addresses.push({
          entity: entityName,
          attribute: key,
          role: "plc",
          address: plc.trim(),
        });
      }
      if (typeof setPlc === "string" && isLikelyPlcAddress(setPlc)) {
        addresses.push({
          entity: entityName,
          attribute: key,
          role: "set_plc",
          address: setPlc.trim(),
        });
      }
    });
  });

  return addresses;
}

function formatValueForDisplay(value) {
  if (Buffer.isBuffer(value)) {
    return value.toString("hex");
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatValueForDisplay(item)).join(", ");
  }
  if (value === null || typeof value === "undefined") {
    return "";
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  }
  return String(value);
}

function createProbeResultTemplate(addresses) {
  return addresses.map((entry) => ({
    entity: entry.entity,
    attribute: entry.attribute,
    role: entry.role,
    address: entry.address,
    status: "pending",
    message: "Abfrage läuft...",
    value: "",
  }));
}

function probePlc(connectionConfig, addresses) {
  if (testModeState.enabled) {
    return Promise.resolve(simulateTestProbe(connectionConfig, addresses));
  }

  const baseResult = {
    connected: false,
    message: "",
    connection: connectionConfig
      ? {
          host: connectionConfig.host,
          port: connectionConfig.port,
          rack: connectionConfig.rack,
          slot: connectionConfig.slot,
        }
      : null,
    addresses: createProbeResultTemplate(addresses),
  };

  if (!connectionConfig) {
    baseResult.message = "Keine SPS-Verbindungskonfiguration gefunden.";
    baseResult.addresses = baseResult.addresses.map((entry) => ({
      ...entry,
      status: "skipped",
      message: "Keine SPS-Verbindung konfiguriert.",
      value: "",
    }));
    return Promise.resolve(baseResult);
  }

  if (!addresses.length) {
    baseResult.message = "Keine SPS-Adressen in der Konfiguration gefunden.";
    baseResult.addresses = baseResult.addresses.map((entry) => ({
      ...entry,
      status: "skipped",
      message: "Keine SPS-Adressen konfiguriert.",
      value: "",
    }));
    return Promise.resolve(baseResult);
  }

  return new Promise((resolve) => {
    const conn = new NodeS7();
    const tagMap = {};
    const tags = addresses.map((entry, index) => {
      const tag = `TAG_${index}`;
      tagMap[tag] = entry.address;
      return tag;
    });

    conn.setTranslationCB((tag) => tagMap[tag]);

    let resolved = false;
    const finish = (resultUpdate) => {
      if (resolved) {
        return;
      }
      resolved = true;
      clearTimeout(timeoutHandle);
      const providedConnection = Object.prototype.hasOwnProperty.call(
        resultUpdate || {},
        "connection",
      )
        ? resultUpdate.connection
        : null;
      const connection = providedConnection
        ? providedConnection
        : baseResult.connection
          ? {
              ...baseResult.connection,
              mode: "live",
              lastScan: new Date().toISOString(),
            }
          : null;

      const payload = {
        ...baseResult,
        ...resultUpdate,
        connection,
      };

      if (payload.connection && !payload.connection.mode) {
        payload.connection.mode = "live";
      }

      conn.dropConnection(() => {
        resolve(payload);
      });
    };

    const timeoutHandle = setTimeout(() => {
      finish({
        message: "Zeitüberschreitung bei der SPS-Abfrage.",
        addresses: baseResult.addresses.map((entry) => ({
          ...entry,
          status: "error",
          message: "Zeitüberschreitung bei der SPS-Abfrage.",
          value: "",
        })),
      });
    }, PLC_SCAN_TIMEOUT);

    conn.initiateConnection(connectionConfig, (err) => {
      if (err) {
        finish({
          message: err.message || "Verbindung zur SPS fehlgeschlagen.",
          addresses: baseResult.addresses.map((entry) => ({
            ...entry,
            status: "error",
            message: "Verbindungsfehler.",
            value: "",
          })),
        });
        return;
      }

      baseResult.connected = true;
      conn.addItems(tags);
      conn.readAllItems((anythingBad, values) => {
        const timestamp = new Date().toISOString();
        const mapped = addresses.map((entry, index) => {
          const tag = tags[index];
          const value = values ? values[tag] : undefined;
          if (typeof value === "undefined") {
            return {
              entity: entry.entity,
              attribute: entry.attribute,
              role: entry.role,
              address: entry.address,
              status: "error",
              message: "Adresse konnte nicht gelesen werden.",
              value: "",
            };
          }
          return {
            entity: entry.entity,
            attribute: entry.attribute,
            role: entry.role,
            address: entry.address,
            status: anythingBad ? "warning" : "ok",
            message: anythingBad ? "Lesefehler für einzelne Adressen." : "OK",
            value: formatValueForDisplay(value),
          };
        });

        const summaryMessage = anythingBad
          ? "SPS-Daten gelesen, einige Adressen meldeten Fehler."
          : "SPS-Daten erfolgreich gelesen.";

        finish({
          connection: baseResult.connection
            ? { ...baseResult.connection, mode: "live", lastScan: timestamp }
            : { mode: "live", lastScan: timestamp },
          message: summaryMessage,
          addresses: mapped,
        });
      });
    });
  });
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function serveIndex(res) {
  fs.readFile(path.join(__dirname, "ui.html"), (error, content) => {
    if (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Failed to load UI");
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(content);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => {
      chunks.push(chunk);
      if (Buffer.concat(chunks).length > 5 * 1024 * 1024) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        const buffer = Buffer.concat(chunks);
        if (!buffer.length) {
          resolve({});
          return;
        }
        const parsed = JSON.parse(buffer.toString("utf-8"));
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const { method } = req;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const options = loadOptions();
  const allowedFiles = allowedConfigFiles(options);

  if (method === "GET" && url.pathname === "/") {
    serveIndex(res);
    return;
  }

  if (method === "GET" && url.pathname === "/api/options") {
    sendJson(res, 200, {
      log_level: options.log_level || "warning",
      config_files: allowedFiles,
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/config") {
    const file = url.searchParams.get("file") || allowedFiles[0];
    const resolved = resolveFileName(file, allowedFiles);
    if (!resolved) {
      sendJson(res, 400, { message: "Invalid configuration file requested." });
      return;
    }

    fs.readFile(resolved, "utf-8", (error, content) => {
      if (error) {
        if (error.code === "ENOENT") {
          sendJson(res, 200, {
            file,
            data: normalizeRootConfig(cloneStandardConfig()),
          });
          return;
        }
        sendJson(res, 500, { message: "Unable to read configuration file." });
        return;
      }

      if (!content || !content.trim()) {
        sendJson(res, 200, {
          file,
          data: normalizeRootConfig(cloneStandardConfig()),
        });
        return;
      }

      try {
        const parsed = YAML.parse(content) || {};
        sendJson(res, 200, { file, data: normalizeRootConfig(parsed) });
      } catch (parseError) {
        sendJson(res, 400, {
          message: "Konfiguration enthält ungültiges YAML.",
        });
      }
    });
    return;
  }

  if (method === "POST" && url.pathname === "/api/config") {
    try {
      const payload = await readBody(req);
      const { file, data } = payload;
      const resolved = resolveFileName(file || allowedFiles[0], allowedFiles);
      if (!resolved || !isPlainObject(data)) {
        sendJson(res, 400, { message: "Invalid payload." });
        return;
      }

      const content = YAML.stringify(prepareConfigForSave(data));

      fs.writeFile(resolved, content, "utf-8", (error) => {
        if (error) {
          sendJson(res, 500, { message: "Unable to save configuration file." });
          return;
        }
        sendJson(res, 200, { message: "Configuration saved successfully." });
      });
    } catch (error) {
      sendJson(res, 400, { message: "Failed to parse request body." });
    }
    return;
  }

  if (method === "GET" && url.pathname === "/api/plc/test-mode") {
    const state = getTestModeState();
    sendJson(res, 200, {
      ...state,
      message: state.enabled
        ? "Testmodus ist aktiv."
        : "Testmodus ist deaktiviert.",
    });
    return;
  }

  if (method === "POST" && url.pathname === "/api/plc/test-mode") {
    try {
      const payload = await readBody(req);
      if (!payload || typeof payload.enabled === "undefined") {
        sendJson(res, 400, { message: 'Parameter "enabled" fehlt.' });
        return;
      }
      const state = setTestModeEnabled(Boolean(payload.enabled));
      sendJson(res, 200, {
        ...state,
        message: state.enabled
          ? "Testmodus aktiviert."
          : "Testmodus deaktiviert.",
      });
    } catch (error) {
      sendJson(res, 400, {
        message: "Testmodus konnte nicht aktualisiert werden.",
      });
    }
    return;
  }

  if (method === "GET" && url.pathname === "/api/plc/scan") {
    const file = url.searchParams.get("file") || allowedFiles[0];
    const resolved = resolveFileName(file, allowedFiles);
    if (!resolved) {
      sendJson(res, 400, { message: "Ungültige Konfigurationsdatei." });
      return;
    }

    fs.readFile(resolved, "utf-8", async (error, content) => {
      if (error) {
        if (error.code === "ENOENT") {
          sendJson(res, 404, {
            message: "Konfigurationsdatei nicht gefunden.",
          });
          return;
        }
        sendJson(res, 500, {
          message: "Konfigurationsdatei konnte nicht gelesen werden.",
        });
        return;
      }

      let parsedConfig = {};
      if (content && content.trim()) {
        try {
          parsedConfig = YAML.parse(content) || {};
        } catch (parseError) {
          sendJson(res, 400, {
            message: "Konfiguration enthält ungültiges YAML.",
          });
          return;
        }
      }

      const connectionConfig = sanitizeConnectionConfig(parsedConfig.plc);
      const addresses = collectPlcAddresses(parsedConfig);

      try {
        const scanResult = await probePlc(connectionConfig, addresses);
        const counts = scanResult.addresses.reduce(
          (acc, entry) => {
            if (entry.status === "ok") {
              acc.ok += 1;
            } else if (entry.status === "warning") {
              acc.warning += 1;
            } else if (entry.status === "error") {
              acc.error += 1;
            } else if (entry.status === "skipped") {
              acc.skipped += 1;
            }
            return acc;
          },
          {
            total: scanResult.addresses.length,
            ok: 0,
            warning: 0,
            error: 0,
            skipped: 0,
          },
        );

        sendJson(res, 200, {
          file,
          connected: scanResult.connected,
          message: scanResult.message,
          connection: scanResult.connection,
          counts,
          addresses: scanResult.addresses,
        });
      } catch (scanError) {
        sendJson(res, 500, { message: "SPS-Abfrage ist fehlgeschlagen." });
      }
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { status: "ok" });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ message: "Not found" }));
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    // eslint-disable-next-line no-console
    console.log(`Configuration UI listening on ${HOST}:${PORT}`);
  });
}

module.exports = {
  HOST,
  PORT,
  STANDARD_CONFIG,
  cloneStandardConfig,
  getTestModeState,
  setTestModeEnabled,
  normalizeRootConfig,
  prepareConfigForSave,
  sanitizeConnectionConfig,
  collectPlcAddresses,
  createProbeResultTemplate,
  probePlc,
  simulateTestValue,
  simulateTestProbe,
  server,
};
