-- Normalize receptionist respiratory-rate storage across older deployments.
-- Some early installations used the column name `respiratory`; the current
-- application uses the canonical `respiratory_rate` name.

SET @has_rate := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'appointment_vitals'
    AND COLUMN_NAME = 'respiratory_rate'
);

SET @has_legacy := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'appointment_vitals'
    AND COLUMN_NAME = 'respiratory'
);

SET @vitals_sql := CASE
  WHEN @has_rate = 0 AND @has_legacy = 1 THEN
    'ALTER TABLE appointment_vitals CHANGE COLUMN respiratory respiratory_rate SMALLINT UNSIGNED NULL'
  WHEN @has_rate = 0 AND @has_legacy = 0 THEN
    'ALTER TABLE appointment_vitals ADD COLUMN respiratory_rate SMALLINT UNSIGNED NULL AFTER weight_kg'
  WHEN @has_rate = 1 AND @has_legacy = 1 THEN
    'UPDATE appointment_vitals SET respiratory_rate = COALESCE(respiratory_rate, respiratory)'
  ELSE
    'SELECT 1'
END;

PREPARE vitals_schema_stmt FROM @vitals_sql;
EXECUTE vitals_schema_stmt;
DEALLOCATE PREPARE vitals_schema_stmt;
