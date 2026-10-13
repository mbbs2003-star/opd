const { pool, withTransaction } = require('../config/database');
const sequenceService = require('./sequenceService');
const auditService = require('./auditService');
const AppError = require('../utils/AppError');

/** Prescription code: RX-YYMMDD-NNNN (stable across versions of the same prescription) */
async function generatePrescriptionCode(conn, dateStr) {
  const compact = dateStr.replace(/-/g, '').slice(2);
  const seq = await sequenceService.nextValue(conn, `prescription:${dateStr}`);
  return `RX${compact}${sequenceService.pad(seq, 4)}`;
}

function normalizeItems(rawItems) {
  // Accepts either an array of objects, or parallel arrays posted from the
  // dynamic prescription form (medicineName[], dosage[], ...).
  if (Array.isArray(rawItems)) return rawItems;
  return [];
}

/**
 * Builds the item list from a posted form body with parallel arrays.
 */
function itemsFromBody(body) {
  const names = [].concat(body.medicineName || []);
  const medicineIds = [].concat(body.medicineId || []);
  const compositions = [].concat(body.composition || []);
  const forms = [].concat(body.medicineForm || []);
  const dosages = [].concat(body.dosage || []);
  const frequencies = [].concat(body.frequency || []);
  const durations = [].concat(body.duration || []);
  const routes = [].concat(body.route || []);
  const quantities = [].concat(body.quantity || []);
  const instructions = [].concat(body.instructions || []);

  const items = [];
  for (let i = 0; i < names.length; i++) {
    if (!names[i] || !String(names[i]).trim()) continue;
    items.push({
      medicineId: medicineIds[i] ? Number(medicineIds[i]) || null : null,
      medicineName: String(names[i]).trim(),
      composition: compositions[i] || null,
      medicineForm: forms[i] || null,
      dosage: dosages[i] || null,
      frequency: frequencies[i] || '1 time daily',
      duration: durations[i] || '7 days',
      // Oral administration is the safe default in the doctor prescription form.
      route: routes[i] || 'P/O',
      quantity: quantities[i] || null,
      instructions: instructions[i] || null
    });
  }
  return items;
}

/**
 * Creates version 1 of a prescription for a visit.
 * The barcode value is ALWAYS the patient's Health ID — never diagnosis,
 * medicines, Aadhaar, or any other medical/PII data.
 */
async function createPrescription(visitId, items, actorUserId) {
  if (!items.length) throw new AppError('Add at least one medicine to the prescription', 422);

  return withTransaction(async (conn) => {
    const [[visit]] = await conn.execute(
      `SELECT v.id, v.patient_id, v.doctor_id, v.status, p.health_id
       FROM opd_visits v JOIN patients p ON p.id = v.patient_id
       WHERE v.id = :id FOR UPDATE`,
      { id: visitId }
    );
    if (!visit) throw new AppError('Visit not found', 404);
    if (visit.status === 'CANCELLED') throw new AppError('This visit was cancelled', 409);

    const [existing] = await conn.execute(
      'SELECT id FROM prescriptions WHERE visit_id = :id AND is_current = 1',
      { id: visitId }
    );
    if (existing.length) {
      throw new AppError('A prescription already exists for this visit. Use the amendment option to correct it.', 409);
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const code = await generatePrescriptionCode(conn, dateStr);

    const [result] = await conn.execute(
      `INSERT INTO prescriptions
        (prescription_code, visit_id, patient_id, doctor_id, version, is_current, barcode_value, rx_notes, created_by)
       VALUES (:code, :visitId, :patientId, :doctorId, 1, 1, :barcode, :rxNotes, :createdBy)`,
      {
        code,
        visitId,
        patientId: visit.patient_id,
        doctorId: visit.doctor_id,
        barcode: visit.health_id,
        rxNotes: null,
        createdBy: actorUserId
      }
    );
    const prescriptionId = result.insertId;

    await rememberPrescriptionOptions(conn, items, actorUserId);
    await insertItems(conn, prescriptionId, items, actorUserId);

    await auditService.log(
      {
        userId: actorUserId,
        action: 'PRESCRIPTION_CREATED',
        entity: 'prescription',
        entityId: prescriptionId,
        newValue: { code, version: 1, visitId, itemCount: items.length }
      },
      conn
    );

    return { id: prescriptionId, code, version: 1 };
  });
}

async function savePrescriptionInTransaction(conn, visit, items, actorUserId, rxNotes = null) {
  if (!items.length) throw new AppError('Add at least one medicine to the prescription', 422);

  const [[current]] = await conn.execute(
    'SELECT * FROM prescriptions WHERE visit_id = :visitId AND is_current = 1 FOR UPDATE',
    { visitId: visit.id }
  );

  const dateStr = new Date().toISOString().slice(0, 10);
  let code;
  let version = 1;
  let amendedFrom = null;

  if (current) {
    code = current.prescription_code;
    version = Number(current.version) + 1;
    amendedFrom = current.id;
    await conn.execute('UPDATE prescriptions SET is_current = 0 WHERE id = :id', { id: current.id });
  } else {
    code = await generatePrescriptionCode(conn, dateStr);
  }

  const [result] = await conn.execute(
    `INSERT INTO prescriptions
      (prescription_code, visit_id, patient_id, doctor_id, version, is_current, barcode_value, rx_notes,
       amended_from_id, amendment_reason, created_by)
     VALUES (:code, :visitId, :patientId, :doctorId, :version, 1, :barcode, :rxNotes,
             :amendedFrom, :reason, :createdBy)`,
    {
      code: code ?? null,
      visitId: visit.id ?? null,
      patientId: visit.patient_id ?? null,
      doctorId: visit.doctor_id ?? null,
      version: version ?? 1,
      barcode: visit.health_id ?? null,
      rxNotes: rxNotes == null ? null : (String(rxNotes).trim() || null),
      amendedFrom: amendedFrom ?? null,
      reason: current ? 'Doctor updated consultation and prescription.' : null,
      createdBy: actorUserId ?? null
    }
  );

  const prescriptionId = result.insertId;
  await rememberPrescriptionOptions(conn, items, actorUserId);
  await insertItems(conn, prescriptionId, items, actorUserId);

  await auditService.log(
    {
      userId: actorUserId,
      action: current ? 'PRESCRIPTION_UPDATED' : 'PRESCRIPTION_CREATED',
      entity: 'prescription',
      entityId: prescriptionId,
      oldValue: current ? { id: current.id, version: current.version } : null,
      newValue: { code, version, visitId: visit.id, itemCount: items.length }
    },
    conn
  );

  return { id: prescriptionId, code, version };
}

async function rememberPrescriptionOptions(conn, items, actorUserId) {
  for (const item of items) {
    for (const [optionType, value] of [['FORM', item.medicineForm], ['ROUTE', item.route]]) {
      const clean = String(value || '').trim();
      if (!clean || clean.toLowerCase() === 'other') continue;
      await conn.execute(
        `INSERT INTO prescription_option_values (option_type, value, normalized)
         VALUES (:optionType, :value, :normalized)
         ON DUPLICATE KEY UPDATE value = VALUES(value)`,
        { optionType, value: clean, normalized: clean.toLowerCase() }
      );
    }
  }
}

async function insertItems(conn, prescriptionId, items, actorUserId) {
  const [[prescriptionContext]] = await conn.execute(
    `SELECT v.branch_id
     FROM prescriptions p JOIN opd_visits v ON v.id = p.visit_id
     WHERE p.id = :prescriptionId`,
    { prescriptionId }
  );
  const branchId = prescriptionContext?.branch_id || null;

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const name = String(it.medicineName || '').trim().slice(0, 150);
    const composition = String(it.composition || '').trim().slice(0, 500) || null;
    const form = String(it.medicineForm || '').trim().slice(0, 40) || null;

    // Register new medicines automatically when a doctor prescribes them.
    let medicineId = null;
    const [[knownMedicine]] = await conn.execute(
      `SELECT id, strength, composition, form
       FROM medicines
       WHERE name = :name AND (composition <=> :composition)
       ORDER BY (strength IS NULL) DESC, id
       LIMIT 1 FOR UPDATE`,
      { name, composition }
    );

    if (knownMedicine) {
      medicineId = knownMedicine.id;
      if ((!knownMedicine.composition && composition) || (!knownMedicine.form && form)) {
        await conn.execute(
          `UPDATE medicines
           SET composition = COALESCE(NULLIF(composition, ''), :composition),
               form = COALESCE(NULLIF(form, ''), :form)
           WHERE id = :id`,
          { composition, form, id: medicineId }
        );
      }
    } else {
      const [createdMedicine] = await conn.execute(
        `INSERT INTO medicines (name, strength, composition, form, is_active)
         VALUES (:name, NULL, :composition, :form, 1)`,
        { name, composition, form }
      );
      medicineId = createdMedicine.insertId;
    }

    // Add the medicine to this branch's pharmacy catalogue without inventing
    // stock. Pharmacy staff must still record batch and expiry through GRN.
    if (branchId && medicineId) {
      const [[pharmacyMedicine]] = await conn.execute(
        `SELECT id, medicine_id, generic_name, dosage_form
         FROM pharmacy_medicines
         WHERE branch_id = :branchId
           AND (medicine_id = :medicineId OR (LOWER(name) = LOWER(:name) AND (generic_name <=> :composition)))
         LIMIT 1 FOR UPDATE`,
        { branchId, medicineId, name, composition }
      );
      if (pharmacyMedicine) {
        if ((!pharmacyMedicine.generic_name && composition) || (!pharmacyMedicine.dosage_form && form)) {
          await conn.execute(
            `UPDATE pharmacy_medicines
             SET medicine_id = COALESCE(medicine_id, :medicineId),
                 generic_name = COALESCE(NULLIF(generic_name, ''), :composition),
                 dosage_form = COALESCE(NULLIF(dosage_form, ''), :form)
             WHERE id = :id`,
            { medicineId, composition, form, id: pharmacyMedicine.id }
          );
        }
      } else {
        await conn.execute(
          `INSERT INTO pharmacy_medicines
            (branch_id, medicine_id, sku, name, generic_name, strength, dosage_form,
             mrp, purchase_rate, sale_rate, reorder_level, prescription_required, created_by)
           VALUES
            (:branchId, :medicineId, :sku, :name, :composition, NULL, :form,
             0, 0, 0, 0, 1, :createdBy)`,
          {
            branchId,
            medicineId,
            sku: `RX-${branchId}-${medicineId}`,
            name,
            composition,
            form,
            createdBy: actorUserId
          }
        );
      }
    }

    await conn.execute(
      `INSERT INTO prescription_items
        (prescription_id, medicine_id, medicine_name_freetext, composition, medicine_form, dosage, frequency, duration, route, quantity, instructions, sort_order)
       VALUES (:prescriptionId, :medicineId, :name, :composition, :medicineForm, :dosage, :frequency, :duration, :route, :quantity, :instructions, :sortOrder)`,
      {
        prescriptionId,
        medicineId,
        name,
        composition,
        medicineForm: form,
        dosage: it.dosage || null,
        frequency: it.frequency || null,
        duration: it.duration || null,
        route: it.route || null,
        quantity: it.quantity || null,
        instructions: it.instructions || null,
        sortOrder: i
      }
    );
  }
}

/**
 * Amends a finalized prescription. The original row is NEVER edited or
 * deleted — it is marked is_current = 0 and a new row is inserted with
 * version + 1, linked via amended_from_id. Full history is preserved.
 */
async function amendPrescription(prescriptionId, items, reason, actorUserId) {
  if (!items.length) throw new AppError('An amended prescription must contain at least one medicine', 422);
  if (!reason || !reason.trim()) throw new AppError('An amendment reason is required', 422);

  return withTransaction(async (conn) => {
    const [[original]] = await conn.execute('SELECT * FROM prescriptions WHERE id = :id FOR UPDATE', {
      id: prescriptionId
    });
    if (!original) throw new AppError('Prescription not found', 404);
    if (!original.is_current) throw new AppError('Only the current version of a prescription can be amended', 409);

    await conn.execute('UPDATE prescriptions SET is_current = 0 WHERE id = :id', { id: prescriptionId });

    const [result] = await conn.execute(
      `INSERT INTO prescriptions
        (prescription_code, visit_id, patient_id, doctor_id, version, is_current, barcode_value, rx_notes,
         amended_from_id, amendment_reason, created_by)
       VALUES (:code, :visitId, :patientId, :doctorId, :version, 1, :barcode, :rxNotes, :amendedFrom, :reason, :createdBy)`,
      {
        code: original.prescription_code,
        visitId: original.visit_id,
        patientId: original.patient_id,
        doctorId: original.doctor_id,
        version: original.version + 1,
        barcode: original.barcode_value,
        rxNotes: original.rx_notes || null,
        amendedFrom: prescriptionId,
        reason: reason.trim(),
        createdBy: actorUserId
      }
    );
    const newId = result.insertId;

    await rememberPrescriptionOptions(conn, items, actorUserId);
    await insertItems(conn, newId, items, actorUserId);

    await auditService.log(
      {
        userId: actorUserId,
        action: 'PRESCRIPTION_AMENDED',
        entity: 'prescription',
        entityId: newId,
        oldValue: { id: prescriptionId, version: original.version },
        newValue: { id: newId, version: original.version + 1, reason: reason.trim() }
      },
      conn
    );

    return { id: newId, code: original.prescription_code, version: original.version + 1 };
  });
}

async function getPrescription(prescriptionId) {
  const [[prescription]] = await pool.execute(
    `SELECT pr.*, p.health_id, p.name AS patient_name, p.age_years, p.gender, p.mobile, p.email, pa.address,
            m.allergies,
            u.name AS doctor_name, d.qualification, d.professional_reg_number, d.specialisation, d.address AS doctor_address, d.mobile AS doctor_mobile, d.email AS doctor_email,
            dept.name AS department_name,
            c.diagnosis, c.investigation_advice, c.advice, c.follow_up_date, c.complaints,
            c.symptoms, c.personal_history, c.clinical_notes,
            c.complementary_requested,
            a.lmp_date, a.gravida, a.para, a.abortions, a.pregnancy_status, a.pregnancy_dating_method,
            a.usg_date, a.usg_gestational_age_weeks, a.usg_gestational_age_days, a.usg_edd,
            a.gestational_age_weeks, a.gestational_age_days, a.estimated_due_date, a.obstetric_notes,
            COALESCE(av.bp, vt.bp) AS bp,
            COALESCE(av.pulse, vt.pulse) AS pulse,
            COALESCE(av.temperature, vt.temperature) AS temperature,
            COALESCE(av.spo2, vt.spo2) AS spo2,
            COALESCE(av.weight_kg, vt.weight_kg) AS weight_kg,
            COALESCE(av.height_cm, vt.height_cm) AS height_cm,
            av.respiratory_rate,
            v.visit_code, b.name AS branch_name, b.address AS branch_address, b.phone AS branch_phone, b.email AS branch_email
     FROM prescriptions pr
     JOIN patients p ON p.id = pr.patient_id
     LEFT JOIN patient_addresses pa ON pa.patient_id = p.id
     LEFT JOIN patient_medical_profiles m ON m.patient_id = p.id
     JOIN doctors d ON d.id = pr.doctor_id
     JOIN users u ON u.id = d.user_id
     JOIN opd_visits v ON v.id = pr.visit_id
     JOIN appointments a ON a.id = v.appointment_id
     JOIN departments dept ON dept.id = a.department_id
     JOIN branches b ON b.id = v.branch_id
     LEFT JOIN opd_consultations c ON c.visit_id = pr.visit_id
     LEFT JOIN vitals vt ON vt.consultation_id = c.id
     LEFT JOIN appointment_vitals av ON av.visit_id = pr.visit_id
     WHERE pr.id = :id`,
    { id: prescriptionId }
  );
  if (!prescription) return null;

  let [items] = await pool.execute(
    'SELECT * FROM prescription_items WHERE prescription_id = :id ORDER BY sort_order',
    { id: prescriptionId }
  );
  const { buildPrescriptionInstructions } = require('../utils/prescriptionText');
  items = items.map(item => ({ ...item, prescriptionText: buildPrescriptionInstructions(item) }));

  const [versions] = await pool.execute(
    `SELECT id, version, is_current, amendment_reason, created_at
     FROM prescriptions WHERE prescription_code = :code ORDER BY version DESC`,
    { code: prescription.prescription_code }
  );

  return { prescription, items, versions };
}

/** Authorization: a doctor may only amend prescriptions they issued. */
async function assertCanAmend(prescriptionId, user) {
  const [[row]] = await pool.execute('SELECT doctor_id FROM prescriptions WHERE id = :id', { id: prescriptionId });
  if (!row) throw new AppError('Prescription not found', 404);
  if (user.roles.includes('SUPER_ADMIN')) return true;
  if (user.doctorId && row.doctor_id === user.doctorId) return true;
  throw new AppError('You can only amend prescriptions you issued', 403);
}

module.exports = {
  createPrescription,
  savePrescriptionInTransaction,
  amendPrescription,
  getPrescription,
  assertCanAmend,
  itemsFromBody,
  normalizeItems
};
