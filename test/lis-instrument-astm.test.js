'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { CONTROL, checksumForFrame, decodeFrames, parseRecords, parseAstmMessage } = require('../integrations/instruments/astmE1381');
function frame(n, text, final = true) {
  const end = final ? CONTROL.ETX : CONTROL.ETB;
  const check = checksumForFrame(String(n), text, end);
  return String.fromCharCode(CONTROL.STX) + String(n) + text + String.fromCharCode(end) + check + '\r\n';
}
const records = 'H|^~&||PW|CHHAYABITHI||||||P|1394-97|20261014100000\rP|1|PAT-001\rO|1|ORDER-001||^^^CBC|R\rR|1|^^^HB|12.4|g/dL|12.0-16.0|N|||F\rL|1\r';
const fixture = String.fromCharCode(CONTROL.ENQ) + frame(1, records) + String.fromCharCode(CONTROL.EOT);
test('validates ASTM framing/checksum and extracts record types offline', () => {
  const parsed = parseAstmMessage(fixture);
  assert.equal(parsed.profileConfirmed, false);
  assert.equal(parsed.counts.H, 1);
  assert.equal(parsed.counts.P, 1);
  assert.equal(parsed.counts.O, 1);
  assert.equal(parsed.counts.R, 1);
  assert.equal(parsed.counts.L, 1);
  assert.match(parsed.warning, /not validated for XL-200/);
});
test('rejects checksum mismatch, missing header/terminator and bad frames', () => {
  assert.throws(() => parseAstmMessage(fixture.replace('12.4', '12.5')), /checksum mismatch/);
  assert.throws(() => parseRecords('P|1|PAT-001\rL|1\r'), /Header record/);
  assert.throws(() => parseRecords('H|^~&\rP|1|PAT-001\r'), /Terminator record/);
  assert.throws(() => decodeFrames(String.fromCharCode(CONTROL.STX) + '9broken'), /frame number/);
});
test('supports multi-frame records while validating frame sequence', () => {
  const text = 'H|^~&\rL|1\r';
  const split = Math.floor(text.length / 2);
  const payload = frame(1, text.slice(0, split), false) + frame(2, text.slice(split), true);
  assert.equal(parseAstmMessage(payload).records.length, 2);
});
