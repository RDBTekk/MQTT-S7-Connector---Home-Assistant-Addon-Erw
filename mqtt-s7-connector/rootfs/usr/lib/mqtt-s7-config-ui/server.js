#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const NodeS7 = require('nodes7');

const HOST = '0.0.0.0';
const PORT = 8099;
const OPTIONS_PATH = '/data/options.json';
const CONFIG_DIR = '/config';
const PLC_SCAN_TIMEOUT = 10000;

function loadOptions() {
  try {
    const raw = fs.readFileSync(OPTIONS_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (error) {
    return {};
  }
}

function resolveFileName(file, allowedFiles) {
  if (!file || typeof file !== 'string') {
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
    return files.filter((entry) => typeof entry === 'string' && entry.trim() !== '');
  }
  return ['config.yaml'];
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeRootConfig(config) {
  const source = isPlainObject(config) ? config : {};
  const normalized = {
    plc: isPlainObject(source.plc) ? { ...source.plc } : {},
    mqtt: isPlainObject(source.mqtt) ? { ...source.mqtt } : {},
    devices: Array.isArray(source.devices)
      ? source.devices.filter((device) => isPlainObject(device)).map((device) => ({ ...device }))
      : [],
    extras: {}
  };

  Object.entries(source).forEach(([key, value]) => {
    if (!['plc', 'mqtt', 'devices'].includes(key)) {
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
  if (normalized.devices.length > 0) {
    output.devices = normalized.devices;
  } else if (Array.isArray(data.devices)) {
    // allow explicit empty list if requested
    output.devices = [];
  }

  Object.entries(normalized.extras).forEach(([key, value]) => {
    output[key] = value;
  });

  return output;
}

function parseNumeric(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function sanitizeConnectionConfig(config) {
  if (!config || typeof config !== 'object') {
    return null;
  }

  const host = typeof config.host === 'string' ? config.host.trim() : '';
  if (!host) {
    return null;
  }

  const sanitized = {
    host,
    port: parseNumeric(config.port, 102),
    rack: parseNumeric(config.rack, 0),
    slot: parseNumeric(config.slot, 2)
  };

  if (config.localTSAP) {
    sanitized.localTSAP = config.localTSAP;
  }
  if (config.remoteTSAP) {
    sanitized.remoteTSAP = config.remoteTSAP;
  }
  if (typeof config.debug === 'boolean') {
    sanitized.debug = config.debug;
  }
  if (typeof config.timeout !== 'undefined') {
    sanitized.timeout = parseNumeric(config.timeout, undefined);
  }
  if (typeof config.doNotOptimize === 'boolean') {
    sanitized.doNotOptimize = config.doNotOptimize;
  }

  return sanitized;
}

function isLikelyPlcAddress(value) {
  if (typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  const patterns = [
    /^[A-Za-z]{1,4}\d*,[A-Za-z]+[0-9.,]*$/u,
    /^[A-Za-z]{1,4}\d*(?:\.[0-9]+.*)?$/u
  ];
  return patterns.some((regex) => regex.test(trimmed));
}

function collectPlcAddresses(config) {
  if (!config || typeof config !== 'object') {
    return [];
  }

  const devices = Array.isArray(config.devices) ? config.devices : [];
  const addresses = [];

  devices.forEach((device, index) => {
    if (!device || typeof device !== 'object') {
      return;
    }
    const deviceName = typeof device.name === 'string' && device.name.trim()
      ? device.name.trim()
      : `Gerät ${index + 1}`;

    Object.entries(device).forEach(([key, rawValue]) => {
      if (['name', 'type', 'friendly_name', 'topic'].includes(key)) {
        return;
      }

      if (typeof rawValue === 'string' && isLikelyPlcAddress(rawValue)) {
        addresses.push({
          device: deviceName,
          attribute: key,
          role: 'plc',
          address: rawValue.trim()
        });
        return;
      }

      if (!rawValue || typeof rawValue !== 'object') {
        return;
      }

      const { plc, set_plc: setPlc } = rawValue;
      if (typeof plc === 'string' && isLikelyPlcAddress(plc)) {
        addresses.push({
          device: deviceName,
          attribute: key,
          role: 'plc',
          address: plc.trim()
        });
      }
      if (typeof setPlc === 'string' && isLikelyPlcAddress(setPlc)) {
        addresses.push({
          device: deviceName,
          attribute: key,
          role: 'set_plc',
          address: setPlc.trim()
        });
      }
    });
  });

  return addresses;
}

function formatValueForDisplay(value) {
  if (Buffer.isBuffer(value)) {
    return value.toString('hex');
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatValueForDisplay(item)).join(', ');
  }
  if (value === null || typeof value === 'undefined') {
    return '';
  }
  if (typeof value === 'object') {
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
    device: entry.device,
    attribute: entry.attribute,
    role: entry.role,
    address: entry.address,
    status: 'pending',
    message: 'Abfrage läuft...',
    value: ''
  }));
}

function probePlc(connectionConfig, addresses) {
  const baseResult = {
    connected: false,
    message: '',
    connection: connectionConfig
      ? {
          host: connectionConfig.host,
          port: connectionConfig.port,
          rack: connectionConfig.rack,
          slot: connectionConfig.slot
        }
      : null,
    addresses: createProbeResultTemplate(addresses)
  };

  if (!connectionConfig) {
    baseResult.message = 'Keine SPS-Verbindungskonfiguration gefunden.';
    baseResult.addresses = baseResult.addresses.map((entry) => ({
      ...entry,
      status: 'skipped',
      message: 'Keine SPS-Verbindung konfiguriert.',
      value: ''
    }));
    return Promise.resolve(baseResult);
  }

  if (!addresses.length) {
    baseResult.message = 'Keine SPS-Adressen in der Konfiguration gefunden.';
    baseResult.addresses = baseResult.addresses.map((entry) => ({
      ...entry,
      status: 'skipped',
      message: 'Keine SPS-Adressen konfiguriert.',
      value: ''
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
      conn.dropConnection(() => {
        resolve({
          ...baseResult,
          ...resultUpdate
        });
      });
    };

    const timeoutHandle = setTimeout(() => {
      finish({
        message: 'Zeitüberschreitung bei der SPS-Abfrage.',
        addresses: baseResult.addresses.map((entry) => ({
          ...entry,
          status: 'error',
          message: 'Zeitüberschreitung bei der SPS-Abfrage.',
          value: ''
        }))
      });
    }, PLC_SCAN_TIMEOUT);

    conn.initiateConnection(connectionConfig, (err) => {
      if (err) {
        finish({
          message: err.message || 'Verbindung zur SPS fehlgeschlagen.',
          addresses: baseResult.addresses.map((entry) => ({
            ...entry,
            status: 'error',
            message: 'Verbindungsfehler.',
            value: ''
          }))
        });
        return;
      }

      baseResult.connected = true;
      conn.addItems(tags);
      conn.readAllItems((anythingBad, values) => {
        const mapped = addresses.map((entry, index) => {
          const tag = tags[index];
          const value = values ? values[tag] : undefined;
          if (typeof value === 'undefined') {
            return {
              device: entry.device,
              attribute: entry.attribute,
              role: entry.role,
              address: entry.address,
              status: 'error',
              message: 'Adresse konnte nicht gelesen werden.',
              value: ''
            };
          }
          return {
            device: entry.device,
            attribute: entry.attribute,
            role: entry.role,
            address: entry.address,
            status: anythingBad ? 'warning' : 'ok',
            message: anythingBad ? 'Lesefehler für einzelne Adressen.' : 'OK',
            value: formatValueForDisplay(value)
          };
        });

        const summaryMessage = anythingBad
          ? 'SPS-Daten gelesen, einige Adressen meldeten Fehler.'
          : 'SPS-Daten erfolgreich gelesen.';

        finish({
          message: summaryMessage,
          addresses: mapped
        });
      });
    });
  });
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function serveIndex(res) {
  fs.readFile(path.join(__dirname, 'ui.html'), (error, content) => {
    if (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Failed to load UI');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => {
      chunks.push(chunk);
      if (Buffer.concat(chunks).length > 5 * 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        if (!buffer.length) {
          resolve({});
          return;
        }
        const parsed = JSON.parse(buffer.toString('utf-8'));
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const { method } = req;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const options = loadOptions();
  const allowedFiles = allowedConfigFiles(options);

  if (method === 'GET' && url.pathname === '/') {
    serveIndex(res);
    return;
  }

  if (method === 'GET' && url.pathname === '/api/options') {
    sendJson(res, 200, {
      log_level: options.log_level || 'warning',
      config_files: allowedFiles
    });
    return;
  }

  if (method === 'GET' && url.pathname === '/api/config') {
    const file = url.searchParams.get('file') || allowedFiles[0];
    const resolved = resolveFileName(file, allowedFiles);
    if (!resolved) {
      sendJson(res, 400, { message: 'Invalid configuration file requested.' });
      return;
    }

    fs.readFile(resolved, 'utf-8', (error, content) => {
      if (error) {
        if (error.code === 'ENOENT') {
          sendJson(res, 200, { file, data: normalizeRootConfig({}) });
          return;
        }
        sendJson(res, 500, { message: 'Unable to read configuration file.' });
        return;
      }

      if (!content || !content.trim()) {
        sendJson(res, 200, { file, data: normalizeRootConfig({}) });
        return;
      }

      try {
        const parsed = YAML.parse(content) || {};
        sendJson(res, 200, { file, data: normalizeRootConfig(parsed) });
      } catch (parseError) {
        sendJson(res, 400, { message: 'Konfiguration enthält ungültiges YAML.' });
      }
    });
    return;
  }

  if (method === 'POST' && url.pathname === '/api/config') {
    try {
      const payload = await readBody(req);
      const { file, data } = payload;
      const resolved = resolveFileName(file || allowedFiles[0], allowedFiles);
      if (!resolved || !isPlainObject(data)) {
        sendJson(res, 400, { message: 'Invalid payload.' });
        return;
      }

      const content = YAML.stringify(prepareConfigForSave(data));

      fs.writeFile(resolved, content, 'utf-8', (error) => {
        if (error) {
          sendJson(res, 500, { message: 'Unable to save configuration file.' });
          return;
        }
        sendJson(res, 200, { message: 'Configuration saved successfully.' });
      });
    } catch (error) {
      sendJson(res, 400, { message: 'Failed to parse request body.' });
    }
    return;
  }

  if (method === 'GET' && url.pathname === '/api/plc/scan') {
    const file = url.searchParams.get('file') || allowedFiles[0];
    const resolved = resolveFileName(file, allowedFiles);
    if (!resolved) {
      sendJson(res, 400, { message: 'Ungültige Konfigurationsdatei.' });
      return;
    }

    fs.readFile(resolved, 'utf-8', async (error, content) => {
      if (error) {
        if (error.code === 'ENOENT') {
          sendJson(res, 404, { message: 'Konfigurationsdatei nicht gefunden.' });
          return;
        }
        sendJson(res, 500, { message: 'Konfigurationsdatei konnte nicht gelesen werden.' });
        return;
      }

      let parsedConfig = {};
      if (content && content.trim()) {
        try {
          parsedConfig = YAML.parse(content) || {};
        } catch (parseError) {
          sendJson(res, 400, { message: 'Konfiguration enthält ungültiges YAML.' });
          return;
        }
      }

      const connectionConfig = sanitizeConnectionConfig(parsedConfig.plc);
      const addresses = collectPlcAddresses(parsedConfig);

      try {
        const scanResult = await probePlc(connectionConfig, addresses);
        const counts = scanResult.addresses.reduce(
          (acc, entry) => {
            if (entry.status === 'ok') {
              acc.ok += 1;
            } else if (entry.status === 'warning') {
              acc.warning += 1;
            } else if (entry.status === 'error') {
              acc.error += 1;
            } else if (entry.status === 'skipped') {
              acc.skipped += 1;
            }
            return acc;
          },
          { total: scanResult.addresses.length, ok: 0, warning: 0, error: 0, skipped: 0 }
        );

        sendJson(res, 200, {
          file,
          connected: scanResult.connected,
          message: scanResult.message,
          connection: scanResult.connection,
          counts,
          addresses: scanResult.addresses
        });
      } catch (scanError) {
        sendJson(res, 500, { message: 'SPS-Abfrage ist fehlgeschlagen.' });
      }
    });
    return;
  }

  if (method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { status: 'ok' });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ message: 'Not found' }));
});

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`Configuration UI listening on ${HOST}:${PORT}`);
});
