-- =====================================================================
-- 1003_add_prescription_rx_notes.sql
-- Stores free-text Rx notes on each prescription version.
-- =====================================================================

SET @has_rx_notes := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'prescriptions'
    AND COLUMN_NAME = 'rx_notes'
);

SET @sql := IF(
  @has_rx_notes = 0,
  'ALTER TABLE prescriptions ADD COLUMN rx_notes TEXT NULL AFTER barcode_value',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
