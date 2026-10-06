-- =====================================================================
-- 1004_agent_portal_referrals.sql
-- Agent portal + referral attribution across patients, OPD and diagnostics.

ALTER TABLE lab_orders MODIFY COLUMN source ENUM('DOCTOR','PATIENT','RECEPTION','LAB','AGENT') NOT NULL DEFAULT 'RECEPTION';
-- =====================================================================

ALTER TABLE patients ADD COLUMN IF NOT EXISTS referral_code VARCHAR(80) NULL AFTER created_by;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS referral_code VARCHAR(80) NULL AFTER created_by;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS referral_code VARCHAR(80) NULL AFTER ordered_by;

CREATE INDEX idx_patients_referral_code ON patients (referral_code);
CREATE INDEX idx_appointments_referral_code ON appointments (referral_code);
CREATE INDEX idx_lab_orders_referral_code ON lab_orders (referral_code);

INSERT INTO roles (code, name) VALUES ('AGENT', 'Agent')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO permissions (code, description) VALUES
  ('agent.portal', 'Access Agent Portal'),
  ('agent.patient.create', 'Register patients from Agent Portal'),
  ('agent.patient.view', 'View Agent Portal patient attribution'),
  ('agent.appointment.create', 'Book OPD appointments from Agent Portal'),
  ('agent.lab.create', 'Book diagnostic tests from Agent Portal'),
  ('agent.referral.view', 'View referral-code tracking')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p
  ON p.code IN ('agent.portal','agent.patient.create','agent.patient.view','patient.view',
                'agent.appointment.create','agent.lab.create','agent.referral.view')
WHERE r.code = 'AGENT'
ON DUPLICATE KEY UPDATE role_id = role_id;
