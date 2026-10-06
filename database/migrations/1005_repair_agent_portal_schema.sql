-- =====================================================================
-- 1005_repair_agent_portal_schema.sql
-- Repairs Agent portal schema when 1004 was marked applied but the
-- referral columns/indexes or AGENT permissions were not present.
-- Idempotent and safe to run on both older and already-repaired databases.
-- =====================================================================

ALTER TABLE lab_orders
  MODIFY COLUMN source ENUM('DOCTOR','PATIENT','RECEPTION','LAB','AGENT') NOT NULL DEFAULT 'RECEPTION';

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE patients ADD COLUMN referral_code VARCHAR(80) NULL AFTER created_by',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'patients' AND COLUMN_NAME = 'referral_code'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE appointments ADD COLUMN referral_code VARCHAR(80) NULL AFTER created_by',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'referral_code'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE lab_orders ADD COLUMN referral_code VARCHAR(80) NULL AFTER ordered_by',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lab_orders' AND COLUMN_NAME = 'referral_code'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_patients_referral_code ON patients (referral_code)',
    'SELECT 1'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'patients' AND INDEX_NAME = 'idx_patients_referral_code'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_appointments_referral_code ON appointments (referral_code)',
    'SELECT 1'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND INDEX_NAME = 'idx_appointments_referral_code'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_lab_orders_referral_code ON lab_orders (referral_code)',
    'SELECT 1'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lab_orders' AND INDEX_NAME = 'idx_lab_orders_referral_code'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO roles (code, name) VALUES ('AGENT', 'Agent')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO permissions (code, description) VALUES
  ('agent.portal', 'Access Agent Portal'),
  ('agent.patient.create', 'Register patients from Agent Portal'),
  ('agent.patient.view', 'View Agent Portal patient attribution'),
  ('agent.appointment.create', 'Book OPD appointments from Agent Portal'),
  ('agent.lab.create', 'Book diagnostic tests from Agent Portal'),
  ('agent.referral.view', 'View referral-code tracking'),
  ('patient.view', 'View patient profiles')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
  ON p.code IN (
    'agent.portal',
    'agent.patient.create',
    'agent.patient.view',
    'patient.view',
    'agent.appointment.create',
    'agent.lab.create',
    'agent.referral.view'
  )
WHERE r.code = 'AGENT'
ON DUPLICATE KEY UPDATE role_id = role_id;
