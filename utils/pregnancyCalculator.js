'use strict';

/**
 * Pregnancy dating utilities.
 *
 * The calculator uses date-only calendar arithmetic so the same clinical date
 * produces the same result regardless of server/browser timezone.
 *
 * Standard dating convention:
 *   LMP -> EDD = LMP + 280 days
 *   Conception -> EDD = conception + 266 days
 *   EDD -> LMP = EDD - 280 days
 *
 * These are dating estimates for clinical workflow. They are not a diagnosis
 * and an appropriately performed early ultrasound may revise the dating.
 */

function parseDateOnly(value) {
  if (!value) return null;
  const m = String(value).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (
    date.getFullYear() !== Number(m[1]) ||
    date.getMonth() !== Number(m[2]) - 1 ||
    date.getDate() !== Number(m[3])
  ) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function asDateOnly(value) {
  if (value instanceof Date) {
    const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
    date.setHours(0, 0, 0, 0);
    return date;
  }
  return parseDateOnly(value);
}

function formatDateOnly(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function addDays(date, days) {
  const out = new Date(date.getTime());
  out.setDate(out.getDate() + days);
  out.setHours(0, 0, 0, 0);
  return out;
}

function calculatePregnancy(lmpValue, asOf = new Date()) {
  const lmp = parseDateOnly(lmpValue);
  const referenceDate = asDateOnly(asOf) || asDateOnly(new Date());
  if (!lmp || !referenceDate) return null;

  const elapsedDays = Math.floor((referenceDate.getTime() - lmp.getTime()) / 86400000);
  if (elapsedDays < 0) return null;

  const totalDays = 280;
  const weeks = Math.floor(elapsedDays / 7);
  const days = elapsedDays % 7;
  const edd = addDays(lmp, totalDays);
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const conceptionDate = addDays(lmp, 14);
  const trimester = weeks < 14 ? 'First trimester' : (weeks < 28 ? 'Second trimester' : 'Third trimester');

  return {
    lmpDate: formatDateOnly(lmp),
    conceptionDate: formatDateOnly(conceptionDate),
    gestationalAgeWeeks: weeks,
    gestationalAgeDays: days,
    gestationalAgeLabel: weeks + ' weeks ' + days + ' days',
    estimatedDueDate: formatDateOnly(edd),
    remainingDays,
    remainingWeeks: Math.floor(remainingDays / 7),
    remainingExtraDays: remainingDays % 7,
    trimester,
    termStatus: elapsedDays > totalDays ? 'Past estimated due date' : 'Within estimated pregnancy period'
  };
}

/**
 * Calculate pregnancy dating from one of the three supported reference dates:
 * LMP, conception date, or estimated due date.
 */
function calculatePregnancyFromReference(referenceValue, mode = 'LMP', asOf = new Date()) {
  const reference = parseDateOnly(referenceValue);
  if (!reference) return null;

  const normalizedMode = String(mode || 'LMP').toUpperCase();
  let lmp;
  if (normalizedMode === 'CONCEPTION') {
    lmp = addDays(reference, -14);
  } else if (normalizedMode === 'EDD') {
    lmp = addDays(reference, -280);
  } else {
    lmp = reference;
  }

  const result = calculatePregnancy(formatDateOnly(lmp), asOf);
  if (!result) return null;

  return {
    ...result,
    referenceMode: normalizedMode,
    referenceDate: formatDateOnly(reference)
  };
}

module.exports = {
  parseDateOnly,
  formatDateOnly,
  addDays,
  calculatePregnancy,
  calculatePregnancyFromReference
};
