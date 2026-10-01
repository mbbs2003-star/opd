-- =====================================================================
-- 1000_add_laboratory_lis.sql
-- Chhayabithi Laboratory + Diagnostic Centre / LIS
--
-- Additive migration. Provides:
--   * laboratory / diagnostic centre configuration
--   * dynamic test master + parameter/reference ranges
--   * doctor referrals and patient self-booking
--   * accession/order/sample/barcode workflow
--   * result entry, verification, release and amendment trail
--   * USG / ECG / radiology digital report attachments
--   * patient-portal tracking and released-report access
--   * equipment, reagent and QC foundations
-- =====================================================================

CREATE TABLE IF NOT EXISTS laboratories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id INT UNSIGNED NOT NULL,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  facility_type ENUM('LABORATORY','DIAGNOSTIC_CENTRE','LAB_AND_DIAGNOSTIC') NOT NULL DEFAULT 'LAB_AND_DIAGNOSTIC',
  address VARCHAR(500) NULL,
  phone VARCHAR(30) NULL,
  email VARCHAR(180) NULL,
  report_header TEXT NULL,
  report_footer TEXT NULL,
  signatory_name VARCHAR(180) NULL,
  signatory_qualification VARCHAR(180) NULL,
  signatory_registration_no VARCHAR(100) NULL,
  accreditation_body VARCHAR(120) NULL,
  accreditation_number VARCHAR(120) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lab_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  INDEX idx_lab_branch_active (branch_id, is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lab_sections (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  laboratory_id INT UNSIGNED NOT NULL,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lab_section_lab FOREIGN KEY (laboratory_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  UNIQUE KEY uk_lab_section_code (laboratory_id, code),
  UNIQUE KEY uk_lab_section_name (laboratory_id, name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lab_test_categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  laboratory_id INT UNSIGNED NOT NULL,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(120) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lab_cat_lab FOREIGN KEY (laboratory_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  UNIQUE KEY uk_lab_cat_code (laboratory_id, code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lab_tests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  laboratory_id INT UNSIGNED NOT NULL,
  section_id INT UNSIGNED NULL,
  category_id INT UNSIGNED NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(180) NOT NULL,
  short_name VARCHAR(100) NULL,
  test_type ENUM('LAB','RADIOLOGY','USG','ECG','CARDIOLOGY','OTHER') NOT NULL DEFAULT 'LAB',
  specimen_type VARCHAR(100) NULL,
  container_type VARCHAR(120) NULL,
  fasting_required TINYINT(1) NOT NULL DEFAULT 0,
  patient_preparation TEXT NULL,
  methodology VARCHAR(255) NULL,
  tat_minutes INT UNSIGNED NOT NULL DEFAULT 1440,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_accredited TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lab_test_lab FOREIGN KEY (laboratory_id) REFERENCES laboratories(id),
  CONSTRAINT fk_lab_test_section FOREIGN KEY (section_id) REFERENCES lab_sections(id),
  CONSTRAINT fk_lab_test_category FOREIGN KEY (category_id) REFERENCES lab_test_categories(id),
  UNIQUE KEY uk_lab_test_code (laboratory_id, code),
  INDEX idx_lab_test_search (laboratory_id, is_active, name),
  INDEX idx_lab_test_type (laboratory_id, test_type)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lab_test_parameters (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  test_id INT UNSIGNED NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(180) NOT NULL,
  data_type ENUM('TEXT','NUMERIC','POSITIVE_NEGATIVE','SELECT','BOOLEAN') NOT NULL DEFAULT 'TEXT',
  unit VARCHAR(60) NULL,
  reference_range_text VARCHAR(255) NULL,
  critical_low DECIMAL(15,5) NULL,
  critical_high DECIMAL(15,5) NULL,
  options_json JSON NULL,
  result_instruction VARCHAR(500) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lab_param_test FOREIGN KEY (test_id) REFERENCES lab_tests(id) ON DELETE CASCADE,
  UNIQUE KEY uk_lab_param_code (test_id, code),
  INDEX idx_lab_param_test_order (test_id, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lab_reference_ranges (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parameter_id INT UNSIGNED NOT NULL,
  sex ENUM('ALL','MALE','FEMALE') NOT NULL DEFAULT 'ALL',
  age_min_years DECIMAL(6,2) NULL,
  age_max_years DECIMAL(6,2) NULL,
  low_value DECIMAL(15,5) NULL,
  high_value DECIMAL(15,5) NULL,
  range_text VARCHAR(255) NULL,
  notes VARCHAR(500) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lab_range_param FOREIGN KEY (parameter_id) REFERENCES lab_test_parameters(id) ON DELETE CASCADE,
  INDEX idx_lab_range_lookup (parameter_id, sex, age_min_years, age_max_years)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lab_workers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  laboratory_id INT UNSIGNED NOT NULL,
  worker_type ENUM('RECEPTION','TECHNICIAN','PATHOLOGIST','RADIOLOGIST','CARDIOLOGY','ADMIN','QUALITY') NOT NULL DEFAULT 'TECHNICIAN',
  professional_registration_no VARCHAR(100) NULL,
  is_authorized_reviewer TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lab_worker_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_lab_worker_lab FOREIGN KEY (laboratory_id) REFERENCES laboratories(id),
  UNIQUE KEY uk_lab_worker_user_lab (user_id, laboratory_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lab_orders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_code VARCHAR(30) NOT NULL UNIQUE,
  patient_id INT UNSIGNED NOT NULL,
  visit_id INT UNSIGNED NULL,
  laboratory_id INT UNSIGNED NOT NULL,
  source ENUM('DOCTOR','PATIENT','RECEPTION','LAB') NOT NULL DEFAULT 'RECEPTION',
  ordered_by INT UNSIGNED NOT NULL,
  booking_date DATE NOT NULL,
  priority ENUM('ROUTINE','URGENT','STAT') NOT NULL DEFAULT 'ROUTINE',
  status ENUM('ORDERED','BOOKED','SAMPLE_PENDING','PROCESSING','PARTIALLY_REPORTED','REPORTED','CANCELLED') NOT NULL DEFAULT 'ORDERED',
  clinical_notes TEXT NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_status ENUM('UNBILLED','UNPAID','PARTIAL','PAID','WAIVED') NOT NULL DEFAULT 'UNBILLED',
  patient_cancelled_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  cancelled_by INT UNSIGNED NULL,
  cancellation_reason VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lab_order_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
  CONSTRAINT fk_lab_order_visit FOREIGN KEY (visit_id) REFERENCES opd_visits(id),
  CONSTRAINT fk_lab_order_lab FOREIGN KEY (laboratory_id) REFERENCES laboratories(id),
  CONSTRAINT fk_lab_order_user FOREIGN KEY (ordered_by) REFERENCES users(id),
  CONSTRAINT fk_lab_order_cancel_user FOREIGN KEY (cancelled_by) REFERENCES users(id),
  INDEX idx_lab_order_patient_date (patient_id, created_at),
  INDEX idx_lab_order_status_date (laboratory_id, status, booking_date),
  INDEX idx_lab_order_visit (visit_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lab_order_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lab_order_id INT UNSIGNED NOT NULL,
  test_id INT UNSIGNED NOT NULL,
  test_code_snapshot VARCHAR(50) NOT NULL,
  test_name_snapshot VARCHAR(180) NOT NULL,
  test_type_snapshot VARCHAR(30) NOT NULL,
  specimen_type_snapshot VARCHAR(100) NULL,
  price_snapshot DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('ORDERED','BOOKED','SAMPLE_PENDING','COLLECTED','RECEIVED','PROCESSING','RESULT_ENTERED','VERIFIED','REPORTED','CANCELLED','REJECTED') NOT NULL DEFAULT 'ORDERED',
  scheduled_date DATE NULL,
  cancellation_reason VARCHAR(500) NULL,
  rejected_reason VARCHAR(500) NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lab_item_order FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_lab_item_test FOREIGN KEY (test_id) REFERENCES lab_tests(id),
  UNIQUE KEY uk_lab_order_test (lab_order_id, test_id),
  INDEX idx_lab_item_status (status),
  INDEX idx_lab_item_test (test_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lab_order_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lab_order_id INT UNSIGNED NOT NULL,
  old_status VARCHAR(40) NULL,
  new_status VARCHAR(40) NOT NULL,
  changed_by INT UNSIGNED NOT NULL,
  note VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lab_osh_order FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_lab_osh_user FOREIGN KEY (changed_by) REFERENCES users(id),
  INDEX idx_lab_osh_order_time (lab_order_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lab_samples (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sample_code VARCHAR(40) NOT NULL UNIQUE,
  barcode_value VARCHAR(80) NOT NULL UNIQUE,
  lab_order_item_id INT UNSIGNED NOT NULL,
  specimen_type VARCHAR(100) NOT NULL,
  container_type VARCHAR(120) NULL,
  volume VARCHAR(60) NULL,
  collected_at DATETIME NULL,
  collected_by INT UNSIGNED NULL,
  received_at DATETIME NULL,
  received_by INT UNSIGNED NULL,
  status ENUM('PENDING','COLLECTED','RECEIVED','REJECTED','DISPOSED') NOT NULL DEFAULT 'PENDING',
  rejection_reason VARCHAR(500) NULL,
  disposal_at DATETIME NULL,
  disposal_reason VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lab_sample_item FOREIGN KEY (lab_order_item_id) REFERENCES lab_order_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_lab_sample_collector FOREIGN KEY (collected_by) REFERENCES users(id),
  CONSTRAINT fk_lab_sample_receiver FOREIGN KEY (received_by) REFERENCES users(id),
  INDEX idx_lab_sample_item (lab_order_item_id),
  INDEX idx_lab_sample_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lab_results (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lab_order_item_id INT UNSIGNED NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('DRAFT','RESULT_ENTERED','VERIFIED','RELEASED','AMENDED') NOT NULL DEFAULT 'DRAFT',
  result_summary TEXT NULL,
  interpretation TEXT NULL,
  comments TEXT NULL,
  instrument_name VARCHAR(180) NULL,
  method_used VARCHAR(255) NULL,
  performed_by INT UNSIGNED NULL,
  reviewed_by INT UNSIGNED NULL,
  released_by INT UNSIGNED NULL,
  performed_at DATETIME NULL,
  reviewed_at DATETIME NULL,
  released_at DATETIME NULL,
  amendment_reason VARCHAR(500) NULL,
  report_file_name VARCHAR(255) NULL,
  report_storage_path VARCHAR(500) NULL,
  report_mime_type VARCHAR(100) NULL,
  report_file_size INT UNSIGNED NULL,
  is_current TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lab_result_item FOREIGN KEY (lab_order_item_id) REFERENCES lab_order_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_lab_result_performer FOREIGN KEY (performed_by) REFERENCES users(id),
  CONSTRAINT fk_lab_result_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id),
  CONSTRAINT fk_lab_result_releaser FOREIGN KEY (released_by) REFERENCES users(id),
  UNIQUE KEY uk_lab_result_version (lab_order_item_id, version),
  INDEX idx_lab_result_current (lab_order_item_id, is_current, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lab_result_values (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  result_id INT UNSIGNED NOT NULL,
  parameter_id INT UNSIGNED NOT NULL,
  value_text TEXT NULL,
  value_numeric DECIMAL(18,6) NULL,
  unit_snapshot VARCHAR(60) NULL,
  reference_range_snapshot VARCHAR(255) NULL,
  abnormal_flag ENUM('NORMAL','LOW','HIGH','CRITICAL_LOW','CRITICAL_HIGH','ABNORMAL','NOT_APPLICABLE') NOT NULL DEFAULT 'NORMAL',
  remarks VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lab_rv_result FOREIGN KEY (result_id) REFERENCES lab_results(id) ON DELETE CASCADE,
  CONSTRAINT fk_lab_rv_parameter FOREIGN KEY (parameter_id) REFERENCES lab_test_parameters(id),
  UNIQUE KEY uk_lab_result_param (result_id, parameter_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lab_result_amendments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  result_id INT UNSIGNED NOT NULL,
  old_version INT UNSIGNED NOT NULL,
  new_version INT UNSIGNED NOT NULL,
  reason VARCHAR(500) NOT NULL,
  amended_by INT UNSIGNED NOT NULL,
  informed_patient TINYINT(1) NOT NULL DEFAULT 0,
  informed_doctor TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lab_amend_result FOREIGN KEY (result_id) REFERENCES lab_results(id) ON DELETE CASCADE,
  CONSTRAINT fk_lab_amend_user FOREIGN KEY (amended_by) REFERENCES users(id),
  INDEX idx_lab_amend_result (result_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lab_equipment (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  laboratory_id INT UNSIGNED NOT NULL,
  name VARCHAR(180) NOT NULL,
  equipment_code VARCHAR(80) NOT NULL,
  manufacturer VARCHAR(180) NULL,
  model VARCHAR(120) NULL,
  serial_number VARCHAR(120) NULL,
  section_id INT UNSIGNED NULL,
  calibration_due_date DATE NULL,
  last_calibrated_at DATE NULL,
  status ENUM('ACTIVE','MAINTENANCE','OUT_OF_SERVICE','RETIRED') NOT NULL DEFAULT 'ACTIVE',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lab_equipment_lab FOREIGN KEY (laboratory_id) REFERENCES laboratories(id),
  CONSTRAINT fk_lab_equipment_section FOREIGN KEY (section_id) REFERENCES lab_sections(id),
  UNIQUE KEY uk_lab_equipment_code (laboratory_id, equipment_code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lab_reagents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  laboratory_id INT UNSIGNED NOT NULL,
  name VARCHAR(180) NOT NULL,
  lot_number VARCHAR(100) NOT NULL,
  manufacturer VARCHAR(180) NULL,
  expiry_date DATE NULL,
  quantity DECIMAL(12,3) NULL,
  unit VARCHAR(40) NULL,
  storage_condition VARCHAR(255) NULL,
  status ENUM('AVAILABLE','LOW_STOCK','EXPIRED','BLOCKED','DISPOSED') NOT NULL DEFAULT 'AVAILABLE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lab_reagent_lab FOREIGN KEY (laboratory_id) REFERENCES laboratories(id),
  INDEX idx_lab_reagent_expiry (laboratory_id, expiry_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lab_qc_runs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  laboratory_id INT UNSIGNED NOT NULL,
  test_id INT UNSIGNED NULL,
  equipment_id INT UNSIGNED NULL,
  control_level VARCHAR(60) NULL,
  measured_value DECIMAL(18,6) NULL,
  target_value DECIMAL(18,6) NULL,
  sd_value DECIMAL(18,6) NULL,
  qc_status ENUM('PASS','FAIL','REVIEW') NOT NULL DEFAULT 'PASS',
  notes VARCHAR(500) NULL,
  performed_by INT UNSIGNED NOT NULL,
  performed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lab_qc_lab FOREIGN KEY (laboratory_id) REFERENCES laboratories(id),
  CONSTRAINT fk_lab_qc_test FOREIGN KEY (test_id) REFERENCES lab_tests(id),
  CONSTRAINT fk_lab_qc_equipment FOREIGN KEY (equipment_id) REFERENCES lab_equipment(id),
  CONSTRAINT fk_lab_qc_user FOREIGN KEY (performed_by) REFERENCES users(id),
  INDEX idx_lab_qc_date (laboratory_id, performed_at)
) ENGINE=InnoDB;

-- Permissions
INSERT INTO permissions (code, description) VALUES
  ('lab.view', 'View laboratory and diagnostic orders/reports'),
  ('lab.manage', 'Manage laboratory and diagnostic configuration'),
  ('lab.order.create', 'Create laboratory/diagnostic orders'),
  ('lab.order.cancel', 'Cancel eligible laboratory/diagnostic orders'),
  ('lab.sample.collect', 'Collect and receive laboratory samples'),
  ('lab.result.enter', 'Enter and amend laboratory/diagnostic results'),
  ('lab.result.verify', 'Review and verify results'),
  ('lab.result.release', 'Authorize and release reports to patients'),
  ('lab.report.view', 'View released laboratory/diagnostic reports'),
  ('lab.equipment.manage', 'Manage laboratory equipment and calibration records'),
  ('lab.qc.manage', 'Manage laboratory quality-control records'),
  ('patient.lab.book', 'Book laboratory and diagnostic tests from the patient portal'),
  ('patient.lab.view', 'View own laboratory and diagnostic orders/reports')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO roles (code, name) VALUES
  ('LAB_ADMIN', 'Laboratory / Diagnostic Admin'),
  ('LAB_TECHNICIAN', 'Laboratory Technician'),
  ('LAB_PATHOLOGIST', 'Pathologist / Report Authorizer'),
  ('DIAGNOSTIC_STAFF', 'USG / ECG / Diagnostic Staff')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Existing roles get appropriate access.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.code = 'SUPER_ADMIN'
ON DUPLICATE KEY UPDATE role_id = role_id;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.code IN ('lab.view','lab.order.create','lab.order.cancel','lab.report.view')
WHERE r.code IN ('ADMIN','OPD_STAFF','DOCTOR')
ON DUPLICATE KEY UPDATE role_id = role_id;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.code IN ('lab.view','lab.manage','lab.order.create','lab.order.cancel','lab.sample.collect',
                'lab.result.enter','lab.result.verify','lab.result.release','lab.report.view',
                'lab.equipment.manage','lab.qc.manage')
WHERE r.code = 'LAB_ADMIN'
ON DUPLICATE KEY UPDATE role_id = role_id;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.code IN ('lab.view','lab.order.create','lab.sample.collect','lab.result.enter','lab.report.view')
WHERE r.code = 'LAB_TECHNICIAN'
ON DUPLICATE KEY UPDATE role_id = role_id;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.code IN ('lab.view','lab.result.enter','lab.result.verify','lab.result.release','lab.report.view')
WHERE r.code = 'LAB_PATHOLOGIST'
ON DUPLICATE KEY UPDATE role_id = role_id;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.code IN ('lab.view','lab.sample.collect','lab.result.enter','lab.report.view')
WHERE r.code = 'DIAGNOSTIC_STAFF'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Default laboratory/diagnostic centre for the existing Chhayabithi branch.
INSERT INTO laboratories
  (branch_id, code, name, facility_type, is_active)
SELECT b.id, 'CHB-LAB', 'Chhayabithi Laboratory & Diagnostic Centre', 'LAB_AND_DIAGNOSTIC', 1
FROM branches b
WHERE b.is_active = 1
  AND NOT EXISTS (SELECT 1 FROM laboratories l WHERE l.code = 'CHB-LAB')
ORDER BY b.id
LIMIT 1;

INSERT INTO lab_sections (laboratory_id, code, name, description)
SELECT l.id, x.code, x.name, x.description
FROM laboratories l
JOIN (
  SELECT 'HEM' code, 'Hematology' name, 'CBC, ESR and blood-cell investigations' description
  UNION ALL SELECT 'BIO', 'Clinical Biochemistry', 'Glucose, renal, liver, lipid and enzyme investigations'
  UNION ALL SELECT 'SER', 'Serology / Immunology', 'Serology, antigen, antibody and immunology tests'
  UNION ALL SELECT 'CLP', 'Clinical Pathology', 'Urine, stool and body-fluid examinations'
  UNION ALL SELECT 'MIC', 'Microbiology', 'Culture, microscopy and sensitivity'
  UNION ALL SELECT 'IMG', 'Imaging / Radiology', 'USG, X-Ray and other diagnostic imaging'
  UNION ALL SELECT 'CARD', 'Cardiology', 'ECG and cardiac diagnostic services'
) x
WHERE l.code = 'CHB-LAB'
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), is_active = 1;

INSERT INTO lab_test_categories (laboratory_id, code, name, sort_order)
SELECT l.id, x.code, x.name, x.sort_order
FROM laboratories l
JOIN (
  SELECT 'BLOOD' code, 'Blood Tests' name, 10 sort_order
  UNION ALL SELECT 'URINE', 'Urine Tests', 20
  UNION ALL SELECT 'STOOL', 'Stool Tests', 30
  UNION ALL SELECT 'BIOCHEM', 'Biochemistry', 40
  UNION ALL SELECT 'HORMONE', 'Hormones / Thyroid', 50
  UNION ALL SELECT 'SEROLOGY', 'Serology / Immunology', 60
  UNION ALL SELECT 'CULTURE', 'Culture / Microbiology', 70
  UNION ALL SELECT 'USG', 'Ultrasonography', 80
  UNION ALL SELECT 'ECG', 'ECG / Cardiology', 90
  UNION ALL SELECT 'RADIOLOGY', 'Radiology', 100
) x
WHERE l.code = 'CHB-LAB'
ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order), is_active = 1;

-- Common starter catalogue. All records remain editable in the LIS UI.
INSERT INTO lab_tests
  (laboratory_id, section_id, category_id, code, name, short_name, test_type, specimen_type,
   container_type, fasting_required, patient_preparation, methodology, tat_minutes, price, is_active)
SELECT l.id, s.id, c.id, x.code, x.name, x.short_name, x.test_type, x.specimen_type,
       x.container_type, x.fasting_required, x.preparation, x.methodology, x.tat_minutes, x.price, 1
FROM laboratories l
JOIN (
  SELECT 'HEM-CBC' code,'Complete Blood Count' name,'CBC' short_name,'LAB' test_type,'EDTA Whole Blood' specimen_type,'EDTA Vacutainer' container_type,0 fasting_required,'No special preparation.' preparation,'Automated haematology analyser' methodology,720 tat_minutes,350.00 price,'HEM' section_code,'BLOOD' category_code
  UNION ALL SELECT 'HEM-ESR','Erythrocyte Sedimentation Rate','ESR','LAB','Whole Blood','ESR Tube',0,'No special preparation.','Automated / Westergren method',720,150.00,'HEM','BLOOD'
  UNION ALL SELECT 'BIO-FBS','Fasting Blood Glucose','FBS','LAB','Fluoride Plasma','Fluoride/grey-top tube',1,'8–12 hours fasting; water permitted.','Hexokinase / enzymatic',360,100.00,'BIO','BIOCHEM'
  UNION ALL SELECT 'BIO-PPBS','Post Prandial Blood Glucose','PPBS','LAB','Fluoride Plasma','Fluoride/grey-top tube',0,'Collect 2 hours after meal as per laboratory instruction.','Hexokinase / enzymatic',360,100.00,'BIO','BIOCHEM'
  UNION ALL SELECT 'BIO-HBA1C','Glycated Haemoglobin (HbA1c)','HbA1c','LAB','EDTA Whole Blood','EDTA Vacutainer',0,'No fasting required.','HPLC / immunoassay',720,450.00,'BIO','BIOCHEM'
  UNION ALL SELECT 'BIO-LFT','Liver Function Test','LFT','LAB','Serum','Plain / gel tube',1,'Prefer 8 hours fasting.','Biochemistry analyser',1440,700.00,'BIO','BIOCHEM'
  UNION ALL SELECT 'BIO-KFT','Kidney Function Test','KFT / RFT','LAB','Serum','Plain / gel tube',1,'Prefer 8 hours fasting.','Biochemistry analyser',1440,700.00,'BIO','BIOCHEM'
  UNION ALL SELECT 'BIO-LIPID','Lipid Profile','Lipid Profile','LAB','Serum','Plain / gel tube',1,'9–12 hours fasting recommended.','Enzymatic colorimetric',1440,700.00,'BIO','BIOCHEM'
  UNION ALL SELECT 'THY-FT3FT4TSH','Thyroid Profile (FT3, FT4, TSH)','Thyroid Profile','LAB','Serum','Plain / gel tube',0,'Medication timing should be disclosed.','Chemiluminescence',1440,900.00,'BIO','HORMONE'
  UNION ALL SELECT 'SER-CRP','C-Reactive Protein','CRP','LAB','Serum','Plain / gel tube',0,'No special preparation.','Immunoturbidimetry',720,450.00,'SER','SEROLOGY'
  UNION ALL SELECT 'SER-RA','Rheumatoid Factor','RA Factor','LAB','Serum','Plain / gel tube',0,'No special preparation.','Latex agglutination / immunoassay',1440,350.00,'SER','SEROLOGY'
  UNION ALL SELECT 'CLP-URINE-RM','Urine Routine & Microscopy','Urine R/M','LAB','Midstream Urine','Sterile urine container',0,'Clean-catch midstream sample preferred.','Dipstick + microscopy',720,180.00,'CLP','URINE'
  UNION ALL SELECT 'CLP-URINE-CULTURE','Urine Culture & Sensitivity','Urine C/S','LAB','Midstream Urine','Sterile urine container',0,'Collect before antibiotics where clinically appropriate.','Culture + AST',2880,650.00,'MIC','CULTURE'
  UNION ALL SELECT 'CLP-STOOL-RM','Stool Routine & Microscopy','Stool R/M','LAB','Stool','Sterile stool container',0,'Fresh sample preferred; avoid contamination.','Macroscopy + microscopy',720,200.00,'CLP','STOOL'
  UNION ALL SELECT 'MIC-BLOOD-CULTURE','Blood Culture','Blood Culture','LAB','Blood','Blood culture bottle',0,'Collect according to aseptic collection protocol.','Automated culture',4320,1200.00,'MIC','CULTURE'
  UNION ALL SELECT 'IMG-USG-ABD','USG Whole Abdomen','USG Whole Abdomen','USG','N/A','N/A',1,'Fasting and bladder preparation according to centre protocol.','Ultrasonography',1440,1200.00,'IMG','USG'
  UNION ALL SELECT 'IMG-USG-PELVIS','USG Pelvis','USG Pelvis','USG','N/A','N/A',1,'Preparation depends on clinical indication; follow centre instructions.','Ultrasonography',1440,1000.00,'IMG','USG'
  UNION ALL SELECT 'CARD-ECG','12-Lead ECG','ECG','ECG','N/A','N/A',0,'Rest for a few minutes before recording; remove relevant metal/electrode obstruction.','12-lead ECG',120,300.00,'CARD','ECG'
  UNION ALL SELECT 'IMG-XRAY-CHEST','X-Ray Chest PA View','Chest X-Ray PA','RADIOLOGY','N/A','N/A',0,'Remove metallic objects; pregnancy status must be disclosed.','Digital radiography',720,500.00,'IMG','RADIOLOGY'
) x
JOIN lab_sections s ON s.laboratory_id = l.id AND s.code = x.section_code
JOIN lab_test_categories c ON c.laboratory_id = l.id AND c.code = x.category_code
WHERE l.code = 'CHB-LAB'
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  short_name = VALUES(short_name),
  test_type = VALUES(test_type),
  specimen_type = VALUES(specimen_type),
  container_type = VALUES(container_type),
  fasting_required = VALUES(fasting_required),
  patient_preparation = VALUES(patient_preparation),
  methodology = VALUES(methodology),
  tat_minutes = VALUES(tat_minutes),
  price = VALUES(price),
  is_active = 1;

-- Starter structured parameters. These are intentionally editable.
INSERT INTO lab_test_parameters
  (test_id, code, name, data_type, unit, reference_range_text, sort_order)
SELECT t.id, p.code, p.name, p.data_type, p.unit, p.reference_range_text, p.sort_order
FROM lab_tests t
JOIN (
  SELECT 'HEM-CBC' test_code,'HB' code,'Haemoglobin' name,'NUMERIC' data_type,'g/dL' unit,'Male 13–17; Female 12–15' reference_range_text,10 sort_order
  UNION ALL SELECT 'HEM-CBC','TLC','Total Leukocyte Count','NUMERIC','10^3/µL','4.0–11.0',20
  UNION ALL SELECT 'HEM-CBC','PLT','Platelet Count','NUMERIC','10^3/µL','150–450',30
  UNION ALL SELECT 'HEM-CBC','RBC','RBC Count','NUMERIC','million/µL','Male 4.5–5.9; Female 4.0–5.2',40
  UNION ALL SELECT 'HEM-CBC','HCT','Haematocrit','NUMERIC','%','Male 40–52; Female 36–46',50
  UNION ALL SELECT 'HEM-CBC','MCV','MCV','NUMERIC','fL','80–100',60
  UNION ALL SELECT 'HEM-CBC','MCH','MCH','NUMERIC','pg','27–33',70
  UNION ALL SELECT 'HEM-CBC','MCHC','MCHC','NUMERIC','g/dL','32–36',80
  UNION ALL SELECT 'HEM-CBC','NEUT','Neutrophils','NUMERIC','%','40–75',90
  UNION ALL SELECT 'HEM-CBC','LYMPH','Lymphocytes','NUMERIC','%','20–45',100
  UNION ALL SELECT 'BIO-FBS','GLUCOSE','Fasting Glucose','NUMERIC','mg/dL','70–99',10
  UNION ALL SELECT 'BIO-PPBS','GLUCOSE','Post Prandial Glucose','NUMERIC','mg/dL','<140',10
  UNION ALL SELECT 'BIO-HBA1C','HBA1C','HbA1c','NUMERIC','%','Normal <5.7',10
  UNION ALL SELECT 'SER-CRP','CRP','CRP','NUMERIC','mg/L','<5',10
  UNION ALL SELECT 'CLP-URINE-RM','APPEARANCE','Appearance','TEXT',NULL,'Clear / pale yellow',10
  UNION ALL SELECT 'CLP-URINE-RM','PROTEIN','Protein','TEXT',NULL,'Negative',20
  UNION ALL SELECT 'CLP-URINE-RM','SUGAR','Sugar','TEXT',NULL,'Negative',30
  UNION ALL SELECT 'CLP-URINE-RM','RBC','RBC','TEXT','/HPF','0–2',40
  UNION ALL SELECT 'CLP-URINE-RM','WBC','WBC','TEXT','/HPF','0–5',50
  UNION ALL SELECT 'CARD-ECG','FINDINGS','ECG Findings','TEXT',NULL,NULL,10
  UNION ALL SELECT 'CARD-ECG','IMPRESSION','ECG Impression','TEXT',NULL,NULL,20
  UNION ALL SELECT 'IMG-USG-ABD','FINDINGS','Ultrasound Findings','TEXT',NULL,NULL,10
  UNION ALL SELECT 'IMG-USG-ABD','IMPRESSION','USG Impression','TEXT',NULL,NULL,20
  UNION ALL SELECT 'IMG-USG-PELVIS','FINDINGS','Ultrasound Findings','TEXT',NULL,NULL,10
  UNION ALL SELECT 'IMG-USG-PELVIS','IMPRESSION','USG Impression','TEXT',NULL,NULL,20
  UNION ALL SELECT 'IMG-XRAY-CHEST','FINDINGS','Radiology Findings','TEXT',NULL,NULL,10
  UNION ALL SELECT 'IMG-XRAY-CHEST','IMPRESSION','Radiology Impression','TEXT',NULL,NULL,20
) p ON p.test_code = t.code
WHERE t.laboratory_id = (SELECT id FROM laboratories WHERE code = 'CHB-LAB' LIMIT 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), data_type = VALUES(data_type), unit = VALUES(unit),
  reference_range_text = VALUES(reference_range_text), sort_order = VALUES(sort_order), is_active = 1;

CREATE INDEX idx_lab_orders_patient_status ON lab_orders(patient_id, status, created_at);
CREATE INDEX idx_lab_items_order_status ON lab_order_items(lab_order_id, status);
CREATE INDEX idx_lab_results_release ON lab_results(status, released_at);
