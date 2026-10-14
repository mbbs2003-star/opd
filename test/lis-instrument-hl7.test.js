'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseHl7Orur01 } = require('../integrations/instruments/hl7V2');

const fixture = [
  'MSH|^~\\&|ANALYZER|LAB|CHHAYABITHI|LIS|20261014100000||ORU^R01^ORU_R01|MSG-001|P|2.5',
  'PID|1||PAT-001^^^CHHAYABITHI^MR',
  'SPM|1|SAMPLE-001',
  'OBR|1|ORDER-001|FILLER-001|CBC^Complete blood count',
  'OBX|1|NM|HB^Hemoglobin||12.4|g/dL|12.0-16.0|N|||F|||20261014100000',
  'OBX|2|NM|WBC^White blood cells||7.1|10^9/L|4.0-11.0|N|||F|||20261014100000'
].join('\r');

test('generic HL7 ORU parser extracts message and observation data without importing it', () => {
  const parsed = parseHl7Orur01(fixture);
  assert.equal(parsed.messageId, 'MSG-001');
  assert.equal(parsed.profileConfirmed, false);
  assert.equal(parsed.observations.length, 2);
  assert.equal(parsed.observations[0].orderPlacerId, 'ORDER-001');
  assert.equal(parsed.observations[0].specimenId, 'SAMPLE-001');
  assert.equal(parsed.observations[0].observationCode, 'HB');
  assert.equal(parsed.observations[0].value, '12.4');
  assert.match(parsed.warning, /do not import/);
});

test('parser rejects non-ORU messages, missing identifiers and empty observations', () => {
  assert.throws(() => parseHl7Orur01('not an HL7 message'), /MSH/);
  assert.throws(() => parseHl7Orur01(fixture.replace('ORU^R01^ORU_R01', 'ADT^A01')), /Only HL7 ORU/);
  assert.throws(() => parseHl7Orur01(fixture.replace('MSG-001', '')), /MSH-10/);
  assert.throws(() => parseHl7Orur01(fixture.split('\r').slice(0, 4).join('\r')), /no OBX/);
});

test('parser rejects malformed observation segments', () => {
  const malformed = fixture.replace('HB^Hemoglobin', '^Hemoglobin');
  assert.throws(() => parseHl7Orur01(malformed), /observation code and value/);
});
