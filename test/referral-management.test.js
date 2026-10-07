const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('referral provider migration defines durable attribution for all referral-bearing records', () => {
  const sql = read('database/migrations/1006_referral_provider_management.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS referral_providers/i);
  for (const table of ['patients', 'appointments', 'lab_orders']) {
    assert.match(sql, new RegExp('ALTER TABLE ' + table + ' ADD COLUMN referral_provider_id', 'i'));
  }
  assert.match(sql, /referral\.manage/i);
  assert.match(sql, /referral\.view/i);
});

test('Agent referral registration uses the Super Admin managed provider dropdown', () => {
  const view = read('views/agent/patient-new.ejs');
  assert.match(view, /name="referralCode"[^>]*class="form-select"/);
  assert.doesNotMatch(view, /name="referralCode"[^>]*type="text"/);
  assert.match(view, /referralProviders\.forEach/);
  assert.match(view, /Only active referral codes configured by Super Admin/);
});

test('referral attribution is visible across operational patient tables', () => {
  const files = [
    'views/patients/list.ejs',
    'views/patients/search.ejs',
    'views/patients/profile.ejs',
    'views/opd/appointments.ejs',
    'views/opd/appointment-detail.ejs',
    'views/opd/queue.ejs',
    'views/doctors/portal-dashboard.ejs',
    'views/doctors/portal-queue.ejs',
    'views/doctors/view.ejs',
    'views/lab/dashboard.ejs',
    'views/lab/orders.ejs',
    'views/lab/order-detail.ejs',
    'views/billing/invoices.ejs',
    'views/billing/discount-requests.ejs',
    'views/billing/invoice-detail.ejs',
    'views/reports/billing.ejs',
    'views/agent/patients.ejs',
    'views/agent/referrals.ejs'
  ];
  for (const file of files) {
    const source = read(file);
    assert.match(source, /referral_code|Referral/i, file);
  }
});

test('consultation template has no corrupted multiline clinical findings regex', () => {
  const source = read('views/doctors/consultation.ejs');
  assert.doesNotMatch(source, /split\(\/\[;\n\]\+\//);
  assert.match(source, /split\(\/\[,;\\n\]\+\//);
});

test('referral service normalizes provider codes consistently', () => {
  const referralService = require(path.join(root, 'services', 'referralService'));
  assert.equal(referralService.normalizeCode(' ref-dr 001 '), 'REF-DR-001');
  assert.equal(referralService.normalizeCode('abc__123'), 'ABC__123');
  assert.equal(referralService.normalizeCode(''), '');
});
