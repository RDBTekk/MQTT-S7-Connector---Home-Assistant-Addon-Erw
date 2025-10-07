#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = '0.0.0.0';
const PORT = 8099;
const OPTIONS_PATH = '/data/options.json';
const CONFIG_DIR = '/config';

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
          sendJson(res, 200, { file, content: '' });
          return;
        }
        sendJson(res, 500, { message: 'Unable to read configuration file.' });
        return;
      }
      sendJson(res, 200, { file, content });
    });
    return;
  }

  if (method === 'POST' && url.pathname === '/api/config') {
    try {
      const payload = await readBody(req);
      const { file, content } = payload;
      const resolved = resolveFileName(file || allowedFiles[0], allowedFiles);
      if (!resolved || typeof content !== 'string') {
        sendJson(res, 400, { message: 'Invalid payload.' });
        return;
      }

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
