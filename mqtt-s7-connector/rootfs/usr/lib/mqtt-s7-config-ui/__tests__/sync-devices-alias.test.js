const assert = require("node:assert");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { test } = require("node:test");
const YAML = require("yaml");
const { syncDevicesAlias, synchronizeEntities } = require("../sync-devices-alias");

test("synchronizeEntities creates missing aliases", () => {
  const data = {
    entities: [{ name: "Light", friendly_name: "Wohnzimmer", topic: "custom/topic" }],
  };
  const result = synchronizeEntities(data);
  assert.equal(result.updated, true);
  assert.equal(result.data.entities[0].friendly_name, "Wohnzimmer");
  assert.ok(!("friendly_name" in result.data.devices[0]));
  assert.ok(!("topic" in result.data.devices[0]));
});

test("syncDevicesAlias fills missing devices in YAML configs", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "alias-yaml-"));
  const filePath = path.join(tmpDir, "config.yaml");
  await fs.writeFile(
    filePath,
    YAML.stringify({
      plc: { host: "127.0.0.1" },
      entities: [{ name: "Test", type: "switch", friendly_name: "Test", topic: "state" }],
    }),
    "utf8",
  );

  const updated = await syncDevicesAlias(filePath);
  assert.equal(updated, true);

  const parsed = YAML.parse(await fs.readFile(filePath, "utf8"));
  assert.ok(Array.isArray(parsed.devices));
  assert.ok(!("friendly_name" in parsed.devices[0]));
  assert.ok(!("topic" in parsed.devices[0]));
  assert.equal(parsed.entities[0].friendly_name, "Test");
  assert.equal(parsed.entities[0].topic, "state");
});

test("syncDevicesAlias mirrors devices into entities for JSON configs", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "alias-json-"));
  const filePath = path.join(tmpDir, "config.json");
  const original = {
    plc: { host: "192.168.0.2" },
    devices: [{ name: "Sensor", type: "sensor" }],
  };
  await fs.writeFile(filePath, `${JSON.stringify(original, null, 2)}\n`, "utf8");

  const updated = await syncDevicesAlias(filePath);
  assert.equal(updated, true);

  const parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
  assert.deepEqual(parsed.entities, parsed.devices);
});

test("syncDevicesAlias leaves synchronized configs untouched", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "alias-stable-"));
  const filePath = path.join(tmpDir, "config.yaml");
  const payload = {
    entities: [{ name: "Outlet", type: "switch" }],
    devices: [{ name: "Outlet", type: "switch" }],
  };
  const serialized = YAML.stringify(payload);
  await fs.writeFile(filePath, serialized, "utf8");

  const updated = await syncDevicesAlias(filePath);
  assert.equal(updated, false);

  const after = await fs.readFile(filePath, "utf8");
  assert.equal(after, serialized);
});
