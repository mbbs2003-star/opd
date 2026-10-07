-- 1007_ultrasound_pregnancy_dating.sql
-- Persist ultrasound/USG-based pregnancy dating alongside LMP-based dating.

SET @sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE appointments ADD COLUMN pregnancy_dating_method VARCHAR(20) NULL AFTER pregnancy_status',
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'pregnancy_dating_method'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE appointments ADD COLUMN usg_date DATE NULL AFTER pregnancy_dating_method',
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'usg_date'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE appointments ADD COLUMN usg_gestational_age_weeks TINYINT UNSIGNED NULL AFTER usg_date',
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'usg_gestational_age_weeks'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE appointments ADD COLUMN usg_gestational_age_days TINYINT UNSIGNED NULL AFTER usg_gestational_age_weeks',
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'usg_gestational_age_days'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE appointments ADD COLUMN usg_edd DATE NULL AFTER usg_gestational_age_days',
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'usg_edd'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE INDEX IF NOT EXISTS idx_appointments_pregnancy_dating ON appointments (pregnancy_dating_method);
