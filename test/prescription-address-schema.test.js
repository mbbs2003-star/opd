const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('prescription address lookup follows the patient_addresses schema', () => {
  const service = fs.readFileSync(
    path.join(__dirname, '..', 'services', 'prescriptionService.js'),
    'utf8'
  );
  const schema = fs.readFileSync(
    path.join(__dirname, '..', 'database', 'schema.sql'),
    'utf8'
  );

  assert.match(schema, /CREATE TABLE IF NOT EXISTS patient_addresses/);
  assert.match(schema, /patient_id INT UNSIGNED NOT NULL/);
  assert.match(schema, /address VARCHAR\(255\) NULL/);

  assert.match(service, /LEFT JOIN patient_addresses pa ON pa\.patient_id = p\.id/);
  assert.match(service, /p\.email, pa\.address/);
  assert.doesNotMatch(service, /p\.email, p\.address/);
});
