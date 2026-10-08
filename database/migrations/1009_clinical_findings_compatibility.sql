-- Ensure clinical findings can always be persisted on older production databases.
-- Idempotent for existing installations.

SET @db := DATABASE();

SET @sql := IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'opd_consultations' AND column_name = 'clinical_notes'
  ),
  'SELECT 1',
  'ALTER TABLE opd_consultations ADD COLUMN clinical_notes TEXT NULL AFTER personal_history'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
