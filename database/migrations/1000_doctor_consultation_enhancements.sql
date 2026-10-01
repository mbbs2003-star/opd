-- Doctor consultation enhancements: complaint suggestions, personal history,
-- complementary consultation requests, and richer prescription metadata.

CREATE TABLE IF NOT EXISTS doctor_complaint_suggestions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT UNSIGNED NOT NULL,
  complaint VARCHAR(255) NOT NULL,
  normalized VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_dcs_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  UNIQUE KEY uk_dcs_doctor_complaint (doctor_id, normalized),
  INDEX idx_dcs_doctor (doctor_id),
  INDEX idx_dcs_normalized (normalized)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS prescription_option_values (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  option_type ENUM('FORM','ROUTE') NOT NULL,
  value VARCHAR(80) NOT NULL,
  normalized VARCHAR(80) NOT NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pov_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uk_pov_type_value (option_type, normalized)
) ENGINE=InnoDB;

INSERT INTO prescription_option_values (option_type, value, normalized) VALUES
('FORM','Tablet','tablet'),
('FORM','Capsule','capsule'),
('FORM','Syrup','syrup'),
('FORM','Injection','injection'),
('FORM','Drops','drops'),
('FORM','Cream','cream'),
('FORM','Ointment','ointment'),
('FORM','Suspension','suspension'),
('FORM','Inhaler','inhaler'),
('ROUTE','P/O','p/o'),
('ROUTE','P/V','p/v'),
('ROUTE','S/L','s/l'),
('ROUTE','PR','pr'),
('ROUTE','I/V','i/v'),
('ROUTE','I/M','i/m'),
('ROUTE','S/C','s/c'),
('ROUTE','Topical','topical')
ON DUPLICATE KEY UPDATE value = VALUES(value);

ALTER TABLE opd_consultations
  ADD COLUMN personal_history JSON NULL AFTER symptoms,
  ADD COLUMN complementary_requested TINYINT(1) NOT NULL DEFAULT 0 AFTER personal_history,
  ADD COLUMN complementary_requested_at DATETIME NULL AFTER complementary_requested,
  ADD COLUMN complementary_requested_by INT UNSIGNED NULL AFTER complementary_requested_at;

ALTER TABLE medicines
  ADD COLUMN composition VARCHAR(500) NULL AFTER strength;

ALTER TABLE prescription_items
  ADD COLUMN composition VARCHAR(500) NULL AFTER medicine_name_freetext,
  ADD COLUMN medicine_form VARCHAR(80) NULL AFTER composition;
