-- Receptionist vitals hardening.
-- Ensures older production databases have the table and canonical
-- respiratory-rate column before the receptionist Today Queue can save vitals.

CREATE TABLE IF NOT EXISTS appointment_vitals (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  visit_id INT UNSIGNED NOT NULL UNIQUE,
  bp VARCHAR(15) NULL,
  pulse SMALLINT UNSIGNED NULL,
  spo2 SMALLINT UNSIGNED NULL,
  temperature DECIMAL(4,1) NULL,
  height_cm DECIMAL(5,2) NULL,
  weight_kg DECIMAL(5,2) NULL,
  respiratory_rate SMALLINT UNSIGNED NULL,
  pain_score TINYINT UNSIGNED NULL,
  recorded_by INT UNSIGNED NOT NULL,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_appt_vitals_visit_1001 FOREIGN KEY (visit_id) REFERENCES opd_visits(id) ON DELETE CASCADE,
  CONSTRAINT fk_appt_vitals_user_1001 FOREIGN KEY (recorded_by) REFERENCES users(id),
  INDEX idx_appt_vitals_recorded_1001 (recorded_at)
) ENGINE=InnoDB;

SET @has_rate_1001 := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'appointment_vitals'
    AND COLUMN_NAME = 'respiratory_rate'
);
SET @has_legacy_1001 := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'appointment_vitals'
    AND COLUMN_NAME = 'respiratory'
);
SET @vitals_sql_1001 := CASE
  WHEN @has_rate_1001 = 0 AND @has_legacy_1001 = 1 THEN
    'ALTER TABLE appointment_vitals CHANGE COLUMN respiratory respiratory_rate SMALLINT UNSIGNED NULL'
  WHEN @has_rate_1001 = 0 AND @has_legacy_1001 = 0 THEN
    'ALTER TABLE appointment_vitals ADD COLUMN respiratory_rate SMALLINT UNSIGNED NULL AFTER weight_kg'
  ELSE 'SELECT 1'
END;
PREPARE vitals_schema_stmt_1001 FROM @vitals_sql_1001;
EXECUTE vitals_schema_stmt_1001;
DEALLOCATE PREPARE vitals_schema_stmt_1001;

INSERT INTO permissions (code, description)
VALUES ('queue.manage', 'Manage OPD queue / call patients')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.code = 'queue.manage'
WHERE r.code IN ('SUPER_ADMIN','ADMIN','OPD_STAFF','DOCTOR')
ON DUPLICATE KEY UPDATE role_id = role_id;
