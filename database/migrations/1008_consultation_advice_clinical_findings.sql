-- Add a separate doctor-facing Advice field and persistent clinical-finding suggestions.
-- Idempotent for existing installations.

SET @db := DATABASE();

SET @sql := IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'opd_consultations' AND column_name = 'advice'
  ),
  'SELECT 1',
  'ALTER TABLE opd_consultations ADD COLUMN advice TEXT NULL AFTER investigation_advice'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS doctor_clinical_finding_suggestions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT UNSIGNED NOT NULL,
  finding VARCHAR(255) NOT NULL,
  normalized VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_doctor_clinical_finding (doctor_id, normalized),
  INDEX idx_doctor_clinical_finding_updated (doctor_id, updated_at),
  CONSTRAINT fk_clinical_finding_suggestion_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
) ENGINE=InnoDB;
