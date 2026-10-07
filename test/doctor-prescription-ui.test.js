const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

test('doctor consultation and prescription templates compile', () => {
  const files = [
    path.join(__dirname, '..', 'views', 'doctors', 'consultation.ejs'),
    path.join(__dirname, '..', 'views', 'print', 'prescription.ejs')
  ];

  for (const file of files) {
    assert.doesNotThrow(() => {
      ejs.compile(fs.readFileSync(file, 'utf8'), { filename: file });
    }, file);
  }
});

test('unified doctor consultation form contains one save action and no Symptoms field', () => {
  const file = path.join(__dirname, '..', 'views', 'doctors', 'consultation.ejs');
  const source = fs.readFileSync(file, 'utf8');

  assert.equal(source.includes('name="symptoms"'), false);
  assert.equal(source.includes('Clinical Findings'), true);
  assert.equal(source.includes('Save Consultation &amp; Prescription'), true);
  assert.equal(source.includes('Is this consultation complementary?'), true);
});


test('Edit Consultation route forces edit mode instead of rendering finalized visits read-only', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'doctorPortalController.js'), 'utf8');
  assert.match(source, /async function editConsultation[\s\S]*?consultation\(req, res, next, \{ edit: '1' \}\)/);
  assert.doesNotMatch(source, /new URLSearchParams\(\{ edit: '1' \}\)/);
  const view = fs.readFileSync(path.join(__dirname, '..', 'views', 'doctors', 'consultation.ejs'), 'utf8');
  assert.match(view, /name="_editMode" value="<%= editMode \? '1' : '0' %>"/);
  assert.match(view, /href="\/doctor\/consultation\/<%= visit\.id %>\/edit"/);
});
