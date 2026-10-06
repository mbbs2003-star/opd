'use strict';

const { pool, withTransaction } = require('../config/database');
const auditService = require('./auditService');
const AppError = require('../utils/AppError');

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function validateProviderPayload(payload) {
  const providerName = String(payload.providerName || '').trim();
  const code = normalizeCode(payload.referralCode);
  if (!providerName) throw new AppError('Referral provider name is required.', 422);
  if (code.length < 3 || code.length > 80) throw new AppError('Referral code must be 3–80 characters and may contain letters, numbers, hyphens or underscores.', 422);
  return { providerName, code, providerType: String(payload.providerType || '').trim() || null, mobile: String(payload.mobile || '').trim() || null, email: String(payload.email || '').trim().toLowerCase() || null, address: String(payload.address || '').trim() || null, notes: String(payload.notes || '').trim() || null, isActive: payload.isActive === undefined ? 1 : (payload.isActive ? 1 : 0) };
}

async function listProviders() {
  const [rows] = await pool.execute('SELECT rp.*, cu.name AS created_by_name, uu.name AS updated_by_name, (SELECT COUNT(*) FROM patients p WHERE p.referral_provider_id=rp.id AND p.deleted_at IS NULL) AS patient_count, (SELECT COUNT(*) FROM appointments a WHERE a.referral_provider_id=rp.id AND a.status<>\"CANCELLED\") AS opd_count, (SELECT COUNT(*) FROM lab_orders lo WHERE lo.referral_provider_id=rp.id AND lo.status<>\"CANCELLED\") AS test_count FROM referral_providers rp LEFT JOIN users cu ON cu.id=rp.created_by LEFT JOIN users uu ON uu.id=rp.updated_by ORDER BY rp.is_active DESC, rp.provider_name ASC');
  return rows;
}

async function listActiveProviders() {
  const [rows] = await pool.execute('SELECT id, referral_code, provider_name, provider_type, mobile, email FROM referral_providers WHERE is_active=1 ORDER BY provider_name, referral_code');
  return rows;
}

async function resolveActiveCode(value) {
  const code = normalizeCode(value);
  if (!code) throw new AppError('Select a referral provider/code.', 422);
  const [[row]] = await pool.execute('SELECT id, referral_code, provider_name, provider_type FROM referral_providers WHERE referral_code=:code AND is_active=1', { code });
  if (!row) throw new AppError('The selected referral code is invalid or inactive. Ask Super Admin to verify the referral code.', 422);
  return row;
}

async function claimLegacyCode(conn, id, code) {
  await conn.execute('UPDATE patients SET referral_provider_id=:id WHERE referral_provider_id IS NULL AND UPPER(referral_code)=:code', { id, code });
  await conn.execute('UPDATE appointments SET referral_provider_id=:id WHERE referral_provider_id IS NULL AND UPPER(referral_code)=:code', { id, code });
  await conn.execute('UPDATE lab_orders SET referral_provider_id=:id WHERE referral_provider_id IS NULL AND UPPER(referral_code)=:code', { id, code });
}

async function createProvider(payload, actorUserId) {
  const data = validateProviderPayload(payload);
  return withTransaction(async (conn) => {
    const [[existing]] = await conn.execute('SELECT id FROM referral_providers WHERE referral_code=:code', { code: data.code });
    if (existing) throw new AppError('This referral code already exists. Use a unique code.', 409);
    const [result] = await conn.execute('INSERT INTO referral_providers (referral_code, provider_name, provider_type, mobile, email, address, notes, is_active, created_by, updated_by) VALUES (:code,:providerName,:providerType,:mobile,:email,:address,:notes,:isActive,:actor,:actor)', { ...data, actor: actorUserId });
    const id = result.insertId;
    await claimLegacyCode(conn, id, data.code);
    await auditService.log({ userId: actorUserId, action: 'REFERRAL_PROVIDER_CREATED', entity: 'referral_provider', entityId: id, newValue: { referralCode: data.code, providerName: data.providerName, providerType: data.providerType, isActive: data.isActive } }, conn);
    return { id };
  });
}

async function updateProvider(id, payload, actorUserId) {
  const data = validateProviderPayload(payload);
  return withTransaction(async (conn) => {
    const [[old]] = await conn.execute('SELECT * FROM referral_providers WHERE id=:id FOR UPDATE', { id });
    if (!old) throw new AppError('Referral provider not found.', 404);
    const [[duplicate]] = await conn.execute('SELECT id FROM referral_providers WHERE referral_code=:code AND id<>:id', { code: data.code, id });
    if (duplicate) throw new AppError('This referral code is already assigned to another provider.', 409);
    await conn.execute('UPDATE referral_providers SET referral_code=:code, provider_name=:providerName, provider_type=:providerType, mobile=:mobile, email=:email, address=:address, notes=:notes, is_active=:isActive, updated_by=:actor WHERE id=:id', { ...data, actor: actorUserId, id });
    await claimLegacyCode(conn, id, data.code);
    await auditService.log({ userId: actorUserId, action: 'REFERRAL_PROVIDER_UPDATED', entity: 'referral_provider', entityId: id, oldValue: { referralCode: old.referral_code, providerName: old.provider_name, isActive: old.is_active }, newValue: { referralCode: data.code, providerName: data.providerName, isActive: data.isActive } }, conn);
  });
}

async function toggleProvider(id, isActive, actorUserId) {
  const [[old]] = await pool.execute('SELECT id, referral_code, provider_name, is_active FROM referral_providers WHERE id=:id', { id });
  if (!old) throw new AppError('Referral provider not found.', 404);
  await pool.execute('UPDATE referral_providers SET is_active=:isActive, updated_by=:actor WHERE id=:id', { id, isActive: isActive ? 1 : 0, actor: actorUserId });
  await auditService.log({ userId: actorUserId, action: isActive ? 'REFERRAL_PROVIDER_ACTIVATED' : 'REFERRAL_PROVIDER_DEACTIVATED', entity: 'referral_provider', entityId: id, oldValue: { isActive: old.is_active }, newValue: { isActive: isActive ? 1 : 0 } });
}

async function tracking() {
  const [providers] = await pool.execute('SELECT rp.id, rp.referral_code, rp.provider_name, rp.provider_type, rp.is_active, (SELECT COUNT(*) FROM patients p WHERE p.referral_provider_id=rp.id AND p.deleted_at IS NULL) AS patients, (SELECT COUNT(*) FROM appointments a WHERE a.referral_provider_id=rp.id AND a.status<>\"CANCELLED\") AS opd, (SELECT COUNT(*) FROM lab_orders l WHERE l.referral_provider_id=rp.id AND l.status<>\"CANCELLED\") AS tests FROM referral_providers rp ORDER BY patients DESC, opd DESC, tests DESC, rp.provider_name');
  const [legacy] = await pool.execute('SELECT x.referral_code, SUM(x.patients) AS patients, SUM(x.opd) AS opd, SUM(x.tests) AS tests FROM (SELECT referral_code, COUNT(*) patients, 0 opd, 0 tests FROM patients WHERE referral_provider_id IS NULL AND referral_code IS NOT NULL AND referral_code<>\"\" AND deleted_at IS NULL GROUP BY referral_code UNION ALL SELECT referral_code, 0, COUNT(*), 0 FROM appointments WHERE referral_provider_id IS NULL AND referral_code IS NOT NULL AND referral_code<>\"\" AND status<>\"CANCELLED\" GROUP BY referral_code UNION ALL SELECT referral_code, 0, 0, COUNT(*) FROM lab_orders WHERE referral_provider_id IS NULL AND referral_code IS NOT NULL AND referral_code<>\"\" AND status<>\"CANCELLED\" GROUP BY referral_code) x GROUP BY x.referral_code ORDER BY patients DESC, opd DESC, tests DESC, x.referral_code');
  const [recentPatients] = await pool.execute('SELECT p.id,p.health_id,p.registration_number,p.name,p.created_at,p.referral_code,rp.provider_name,rp.referral_code AS provider_current_code,u.name AS registered_by_name FROM patients p LEFT JOIN referral_providers rp ON rp.id=p.referral_provider_id LEFT JOIN users u ON u.id=p.created_by WHERE p.referral_code IS NOT NULL AND p.referral_code<>\"\" ORDER BY p.created_at DESC LIMIT 100');
  return { providers, legacy, recentPatients };
}

module.exports = { normalizeCode, validateProviderPayload, listProviders, listActiveProviders, resolveActiveCode, createProvider, updateProvider, toggleProvider, tracking };