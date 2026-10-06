const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

test('blank prescription print is letterhead-only and A4 sized', () => {
  const file = path.join(__dirname, '..', 'views', 'print', 'blank-prescription.ejs');
  const source = fs.readFileSync(file, 'utf8');

  assert.equal(source.includes("include('./_header')"), true);
  assert.equal(source.includes('blank-prescription-sheet'), true);
  assert.equal(source.includes('rx-patient-bar'), false);
  assert.doesNotThrow(() => ejs.compile(source, { filename: file }));
});

test('doctor prescription print reserves space instead of rendering generated letterhead', () => {
  const file = path.join(__dirname, '..', 'views', 'print', 'prescription.ejs');
  const source = fs.readFileSync(file, 'utf8');

  assert.equal(source.includes('rx-preprinted-letterhead-space'), true);
  assert.equal(source.includes("include('./_header')"), false);
});
