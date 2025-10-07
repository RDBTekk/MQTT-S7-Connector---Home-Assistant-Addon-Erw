#!/usr/bin/env node
const fs = require("fs/promises");
const path = require("path");
const YAML = require("yaml");

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
}

function determineFormat(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".json") {
    return "json";
  }
  if (ext === ".yaml" || ext === ".yml") {
    return "yaml";
  }
  return "yaml";
}

function parseContent(content, format) {
  if (!content || !content.trim()) {
    return null;
  }
  if (format === "json") {
    return JSON.parse(content);
  }
  return YAML.parse(content);
}

function serializeContent(data, format) {
  if (format === "json") {
    return `${JSON.stringify(data, null, 2)}\n`;
  }
  return YAML.stringify(data);
}

function synchronizeEntities(data) {
  if (!data || typeof data !== "object") {
    return { updated: false, data: null };
  }

  const entitiesList = normalizeList(data.entities);
  const devicesList = normalizeList(data.devices);

  let updated = false;
  let workingEntities = entitiesList;
  let workingDevices = devicesList;

  if (!Array.isArray(data.entities)) {
    workingEntities = devicesList.length > 0 ? deepClone(devicesList) : [];
    data.entities = workingEntities;
    updated = true;
  }

  if (!Array.isArray(data.devices)) {
    workingDevices = workingEntities.length > 0 ? deepClone(workingEntities) : [];
    data.devices = workingDevices;
    updated = true;
  }

  const entitiesJson = JSON.stringify(workingEntities);
  const devicesJson = JSON.stringify(workingDevices);
  if (entitiesJson !== devicesJson) {
    data.devices = deepClone(workingEntities);
    updated = true;
  }

  return { updated, data };
}

async function syncDevicesAlias(filePath) {
  if (!filePath) {
    return false;
  }

  let content;
  try {
    content = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }

  const format = determineFormat(filePath);

  let parsed;
  try {
    parsed = parseContent(content, format);
  } catch (error) {
    console.warn(`Unable to parse configuration file '${filePath}': ${error.message}`);
    return false;
  }

  if (!parsed || typeof parsed !== "object") {
    return false;
  }

  const { updated, data } = synchronizeEntities(parsed);
  if (!updated) {
    return false;
  }

  const serialized = serializeContent(data, format);
  await fs.writeFile(filePath, serialized, "utf8");
  return true;
}

if (require.main === module) {
  const filePath = process.argv[2];
  syncDevicesAlias(filePath)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { syncDevicesAlias, synchronizeEntities };
