const test = require('node:test');
const assert = require('node:assert/strict');

const {
  STANDARD_CONFIG,
  cloneStandardConfig,
  getTestModeState,
  setTestModeEnabled,
  normalizeRootConfig,
  prepareConfigForSave,
  sanitizeConnectionConfig,
  collectPlcAddresses,
  probePlc
} = require('../server');

test('cloneStandardConfig returns deep copy', () => {
  const clone = cloneStandardConfig();
  assert.notStrictEqual(clone, STANDARD_CONFIG);
  assert.deepEqual(clone, STANDARD_CONFIG);
  clone.plc.host = '10.0.0.5';
  assert.notEqual(clone.plc.host, STANDARD_CONFIG.plc.host);
});

test('normalizeRootConfig migrates devices to entities', () => {
  const legacy = {
    plc: { host: '10.0.0.1' },
    devices: [
      { name: 'Legacy', type: 'sensor', state: 'DB1,X0.0' }
    ]
  };
  const normalized = normalizeRootConfig(legacy);
  assert.deepEqual(normalized.entities, legacy.devices);
  assert.deepEqual(normalized.extras, {});
});

test('prepareConfigForSave outputs entities section', () => {
  const data = {
    plc: { host: '10.0.0.1' },
    entities: [
      { name: 'Temperature', type: 'sensor', state: 'DB2,REAL0' }
    ]
  };
  const saved = prepareConfigForSave(data);
  assert.ok(saved.entities);
  assert.equal(saved.entities.length, 1);
  assert.equal(saved.entities[0].name, 'Temperature');
});

test('prepareConfigForSave keeps devices alias in sync', () => {
  const data = {
    mqtt: { host: 'mqtt://demo.local' },
    entities: [
      { name: 'Demo Switch', type: 'switch', state: 'DB5,X0.0' }
    ]
  };
  const saved = prepareConfigForSave(data);
  assert.deepEqual(saved.devices, saved.entities);
});

test('sanitizeConnectionConfig accepts tsap_id shortcuts', () => {
  const config = {
    host: '192.168.0.50',
    port: '102',
    tsap_id: {
      local: '4c00',
      remote: '0x1100'
    }
  };
  const sanitized = sanitizeConnectionConfig(config);
  assert.equal(sanitized.localTSAP, '0x4C00');
  assert.equal(sanitized.remoteTSAP, '0x1100');
  assert.equal(sanitized.port, 102);
});

test('sanitizeConnectionConfig parses comma separated tsap_id string', () => {
  const sanitized = sanitizeConnectionConfig({ host: 'logo.local', tsap_id: '0x4C00,0x1100' });
  assert.equal(sanitized.localTSAP, '0x4C00');
  assert.equal(sanitized.remoteTSAP, '0x1100');
});

test('collectPlcAddresses covers direct and nested attributes', () => {
  const config = {
    entities: [
      {
        name: 'Light',
        type: 'light',
        state: 'DB3,X0.0',
        brightness: { plc: 'DB3,BYTE1', set_plc: 'DB3,BYTE1' }
      }
    ]
  };
  const addresses = collectPlcAddresses(config);
  assert.equal(addresses.length, 3);
  const stateAddress = addresses.find((entry) => entry.attribute === 'state' && entry.role === 'plc');
  const plcAddress = addresses.find((entry) => entry.attribute === 'brightness' && entry.role === 'plc');
  const setAddress = addresses.find((entry) => entry.attribute === 'brightness' && entry.role === 'set_plc');
  assert.equal(stateAddress.entity, 'Light');
  assert.equal(plcAddress.entity, 'Light');
  assert.equal(setAddress.entity, 'Light');
});

test('probePlc returns simulated data when test mode enabled', async () => {
  const previousState = getTestModeState().enabled;
  try {
    setTestModeEnabled(true);
    const addresses = [
      { entity: 'Demo', attribute: 'state', role: 'plc', address: 'DB1,X0.0' },
      { entity: 'Demo', attribute: 'temperature', role: 'plc', address: 'DB1,REAL2' }
    ];
    const result = await probePlc({ host: '192.168.0.99', port: 102, rack: 0, slot: 1 }, addresses);
    assert.equal(result.connected, true);
    assert.equal(result.connection.mode, 'test');
    assert.equal(result.addresses.length, 2);
    result.addresses.forEach((entry) => {
      assert.equal(entry.status, 'ok');
      assert.equal(entry.message, 'Simulierter Wert');
      assert.notEqual(entry.value, '');
    });
  } finally {
    setTestModeEnabled(previousState);
  }
});
