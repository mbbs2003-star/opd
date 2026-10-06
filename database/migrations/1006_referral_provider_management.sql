-- 1006_referral_provider_management.sql
-- Super Admin managed referral providers + durable attribution.

CREATE TABLE IF NOT EXISTS referral_providers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  referral_code VARCHAR(80) NOT NULL UNIQUE,
  provider_name VARCHAR(150) NOT NULL,
  provider_type VARCHAR(80) NULL,
  mobile VARCHAR(20) NULL,
  email VARCHAR(190) NULL,
  address VARCHAR(500) NULL,
  notes TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT UNSIGNED NULL,
  updated_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_referral_provider_active (is_active),
  INDEX idx_referral_provider_name (provider_name),
  CONSTRAINT fk_referral_provider_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_referral_provider_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE patients ADD COLUMN referral_provider_id BIGINT UNSIGNED NULL AFTER referral_code',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'patients' AND COLUMN_NAME = 'referral_provider_id'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE appointments ADD COLUMN referral_provider_id BIGINT UNSIGNED NULL AFTER referral_code',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'referral_provider_id'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE lab_orders ADD COLUMN referral_provider_id BIGINT UNSIGNED NULL AFTER referral_code',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lab_orders' AND COLUMN_NAME = 'referral_provider_id'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_patients_referral_provider ON patients (referral_provider_id)',
    'SELECT 1'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'patients' AND INDEX_NAME = 'idx_patients_referral_provider'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_appointments_referral_provider ON appointments (referral_provider_id)',
    'SELECT 1'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND INDEX_NAME = 'idx_appointments_referral_provider'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_lab_orders_referral_provider ON lab_orders (referral_provider_id)',
    'SELECT 1'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lab_orders' AND INDEX_NAME = 'idx_lab_orders_referral_provider'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO permissions (code, description) VALUES
  ('referral.manage', 'Manage referral providers and referral codes'),
  ('referral.view', 'View referral attribution and tracking')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.code = 'SUPER_ADMIN' AND p.code IN ('referral.manage','referral.view')
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Attach any existing legacy referral-code records to a provider automatically
-- when a matching provider is created later; this migration only creates the
-- durable columns and intentionally does not rewrite historical free-text data.
