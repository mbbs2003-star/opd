'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('existing ADMIN role receives lab.view and lab.manage for LIS admin pages', () => {
  const root = path.join(__dirname, '..');
  const migration = fs.readFileSync(path.join(root, 'database/migrations/1013_fix_lab_admin_access.sql'), 'utf8');
  const routes = fs.readFileSync(path.join(root, 'routes/labRoutes.js'), 'utf8');
  const sidebar = fs.readFileSync(path.join(root, 'views/partials/sidebar.ejs'), 'utf8');

  assert.match(migration, /p\.code IN \('lab\.view', 'lab\.manage'\)/);
  assert.match(migration, /r\.code IN \('ADMIN', 'SUPER_ADMIN', 'LAB_ADMIN'\)/);
  assert.match(routes, /router\.get\('\/workers',requirePermission\('lab\.manage'\)/);
  assert.match(routes, /router\.get\('\/settings',requirePermission\('lab\.manage'\)/);
  assert.match(routes, /router\.get\('\/review-builder',requirePermission\('lab\.view'\)/);
  assert.match(sidebar, /can\('lab\.manage'\).*Lab Settings.*Lab Staff/s);
});
