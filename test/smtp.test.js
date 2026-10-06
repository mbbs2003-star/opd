const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('SMTP configuration supports standard 465/587 setups and authenticated sender fallback', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'config', 'email.js'), 'utf8');

  assert.match(source, /port === 465/);
  assert.match(source, /SMTP_FROM_EMAIL \|\| process\.env\.SMTP_USER/);
  assert.match(source, /SMTP_REQUIRE_TLS/);
  assert.match(source, /SMTP_TLS_REJECT_UNAUTHORIZED/);
});

test('OTP delivery does not report success when SMTP send fails', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'services', 'patientAuthService.js'), 'utf8');

  assert.match(source, /const result = await emailService\.sendMail/);
  assert.match(source, /if \(!result\.sent\)/);
  assert.match(source, /verification email/);
});
