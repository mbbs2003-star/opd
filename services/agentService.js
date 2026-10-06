const { pool } = require('../config/database');
const patientService = require('./patientService');
const AppError = require('../utils/AppError');

function referralCode(value, userId) {
  const supplied = String(value || '').trim().toUpperCase().replace(/\s+/g, '-');
  return supplied || ('AGT-' + String(userId));
}

async function dashboard(agentId, branchId) {
  const [[patients]] = await pool.execute(
    'SELECT COUNT(*) AS count FROM patients WHERE branch_id=:branchId AND deleted_at IS NULL AND created_by=:agentId',
    { branchId, agentId }
  );
  const [[opd]] = await pool.execute(
    'SELECT COUNT(*) AS count FROM appointments WHERE branch_id=:branchId AND created_by=:agentId AND status <> "CANCELLED"',
    { branchId, agentId }
  );
  const [[tests]] = await pool.execute(
    'SELECT COUNT(*) AS count FROM lab_orders o JOIN laboratories l ON l.id=o.laboratory_id WHERE l.branch_id=:branchId AND o.ordered_by=:agentId AND o.status <> "CANCELLED"',
    { branchId, agentId }
  );
  const [[referrals]] = await pool.execute(
    `SELECT COUNT(*) AS count FROM (
       SELECT referral_code FROM patients WHERE referral_code IS NOT NULL AND referral_code<>'' AND branch_id=:branchId AND created_by=:agentId
       UNION
       SELECT referral_code FROM appointments WHERE referral_code IS NOT NULL AND referral_code<>'' AND branch_id=:branchId AND created_by=:agentId
       UNION
       SELECT o.referral_code FROM lab_orders o JOIN laboratories l ON l.id=o.laboratory_id
       WHERE o.referral_code IS NOT NULL AND o.referral_code<>'' AND l.branch_id=:branchId AND o.ordered_by=:agentId
     ) x`,
    { branchId, agentId }
  );
  return { patients: Number(patients.count), opd: Number(opd.count), tests: Number(tests.count), referrals: Number(referrals.count) };
}

async function patientList(agentId, branchId, q = '') {
  const params = { agentId, branchId, like: '%' + String(q || '').trim() + '%' };
  const where = [
    'p.branch_id=:branchId',
    'p.deleted_at IS NULL',
    '(p.created_by=:agentId OR EXISTS (SELECT 1 FROM appointments ax WHERE ax.patient_id=p.id AND ax.created_by=:agentId) OR EXISTS (SELECT 1 FROM lab_orders lx JOIN laboratories lbx ON lbx.id=lx.laboratory_id WHERE lx.patient_id=p.id AND lx.ordered_by=:agentId))'
  ];
  if (String(q || '').trim()) {
    where.push('(p.health_id=:exact OR p.registration_number LIKE :like OR p.name LIKE :like OR p.mobile LIKE :like)');
    params.exact = String(q).trim();
  }
  const [rows] = await pool.execute(
    `SELECT p.id,p.health_id,p.registration_number,p.name,p.gender,p.age_years,p.mobile,p.referral_code,p.created_at,
       creator.name AS registered_by,
       (SELECT GROUP_CONCAT(DISTINCT r.code ORDER BY r.code SEPARATOR ', ') FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=creator.id) AS registered_by_role,
       (SELECT u2.name FROM appointments a2 JOIN users u2 ON u2.id=a2.created_by WHERE a2.patient_id=p.id ORDER BY a2.created_at DESC LIMIT 1) AS latest_booked_by,
       (SELECT (SELECT GROUP_CONCAT(DISTINCT r2.code ORDER BY r2.code SEPARATOR ', ') FROM user_roles ur2 JOIN roles r2 ON r2.id=ur2.role_id WHERE ur2.user_id=a2.created_by) FROM appointments a2 WHERE a2.patient_id=p.id ORDER BY a2.created_at DESC LIMIT 1) AS latest_booked_by_role,
       (SELECT a3.referral_code FROM appointments a3 WHERE a3.patient_id=p.id ORDER BY a3.created_at DESC LIMIT 1) AS latest_opd_referral
     FROM patients p
     LEFT JOIN users creator ON creator.id=p.created_by
     WHERE ${where.join(' AND ')}
     ORDER BY p.created_at DESC LIMIT 250`,
    params
  );
  return rows;
}

async function referralStats(branchId) {
  const [rows] = await pool.execute(
    `SELECT codes.referral_code,
       (SELECT COUNT(*) FROM patients p WHERE p.branch_id=:branchId AND p.referral_code=codes.referral_code AND p.deleted_at IS NULL) AS patients,
       (SELECT COUNT(*) FROM appointments a WHERE a.branch_id=:branchId AND a.referral_code=codes.referral_code AND a.status<>'CANCELLED') AS opd,
       (SELECT COUNT(*) FROM lab_orders o JOIN laboratories l ON l.id=o.laboratory_id WHERE l.branch_id=:branchId AND o.referral_code=codes.referral_code AND o.status<>'CANCELLED') AS tests
     FROM (
       SELECT DISTINCT referral_code FROM patients WHERE branch_id=:branchId AND referral_code IS NOT NULL AND referral_code<>''
       UNION SELECT DISTINCT referral_code FROM appointments WHERE branch_id=:branchId AND referral_code IS NOT NULL AND referral_code<>''
       UNION SELECT DISTINCT o.referral_code FROM lab_orders o JOIN laboratories l ON l.id=o.laboratory_id WHERE l.branch_id=:branchId AND o.referral_code IS NOT NULL AND o.referral_code<>''
     ) codes
     ORDER BY patients DESC, opd DESC, tests DESC, codes.referral_code`,
    { branchId }
  );
  return rows;
}

async function registerPatient(payload, agentId, branchId) {
  return patientService.registerPatient({ ...payload, branchId, referralCode: referralCode(payload.referralCode, agentId) }, agentId);
}

async function getBookingContext(branchId) {
  const [departments] = await pool.execute('SELECT id,name FROM departments WHERE is_active=1 ORDER BY name');
  const [doctors] = await pool.execute(
    `SELECT d.id,u.name AS doctor_name,d.department_id,d.consultation_fee
     FROM doctors d JOIN users u ON u.id=d.user_id
     WHERE d.branch_id=:branchId AND d.is_active=1 AND d.deleted_at IS NULL ORDER BY u.name`,
    { branchId }
  );
  return { departments, doctors };
}

async function getTestContext(branchId) {
  const labService = require('./labService');
  return labService.getAvailableTestsForBranch(branchId);
}

async function getPatient(healthId, branchId) {
  const data = await patientService.getPatientProfile(healthId);
  if (!data || Number(data.patient.branch_id) !== Number(branchId)) return null;
  return data.patient;
}

module.exports = { dashboard, patientList, referralStats, registerPatient, referralCode, getBookingContext, getTestContext, getPatient };
