'use strict';
const MAX_RESULTS = 500;
function field(value, name, max = 180, required = false) {
  if (value == null || String(value).trim() === '') { if (required) throw new Error(name + ' is required'); return null; }
  const out = String(value).trim();
  if (out.length > max || /[\u0000-\u001F\u007F]/.test(out)) throw new Error(name + ' is invalid');
  return out;
}
function normalizeCanonicalResultEnvelope(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Result envelope must be an object');
  if (input.schema !== 'chhayabithi.instrument-result.v1') throw new Error('Unsupported result envelope schema');
  const instrumentCode = field(input.instrumentCode, 'instrumentCode', 50, true);
  const messageId = field(input.messageId, 'messageId', 180, true);
  const orderCode = field(input.orderCode, 'orderCode', 50, true);
  const sampleCode = field(input.sampleCode, 'sampleCode', 80, true);
  if (!Array.isArray(input.results) || input.results.length < 1 || input.results.length > MAX_RESULTS) throw new Error('results must contain between 1 and ' + MAX_RESULTS + ' entries');
  const results = input.results.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('results[' + index + '] must be an object');
    return Object.freeze({
      testCode: field(item.testCode, 'results[' + index + '].testCode', 100, true),
      parameterCode: field(item.parameterCode || '', 'results[' + index + '].parameterCode', 100) || '',
      value: field(item.value, 'results[' + index + '].value', 500, true),
      unit: field(item.unit, 'results[' + index + '].unit', 100),
      flag: field(item.flag, 'results[' + index + '].flag', 100)
    });
  });
  return Object.freeze({ schema: input.schema, instrumentCode, messageId, orderCode, sampleCode, observedAt: field(input.observedAt, 'observedAt', 40), results: Object.freeze(results) });
}
function assessResultMapping({ expectedOrderCode, expectedSampleCode, mappedTestCode, mappedParameterCode, expectedUnit, incoming }) {
  if (!incoming || typeof incoming !== 'object') throw new TypeError('incoming result is required');
  if (!expectedOrderCode || incoming.orderCode !== expectedOrderCode) return { mappingStatus: 'MISMATCH', reviewStatus: 'PENDING', reason: 'ORDER_MISMATCH' };
  if (!expectedSampleCode || incoming.sampleCode !== expectedSampleCode) return { mappingStatus: 'MISMATCH', reviewStatus: 'PENDING', reason: 'SAMPLE_MISMATCH' };
  if (!mappedTestCode || incoming.testCode !== mappedTestCode) return { mappingStatus: 'UNMAPPED', reviewStatus: 'PENDING', reason: 'TEST_UNMAPPED' };
  if ((mappedParameterCode || '') !== (incoming.parameterCode || '')) return { mappingStatus: 'UNMAPPED', reviewStatus: 'PENDING', reason: 'PARAMETER_UNMAPPED' };
  if (expectedUnit && incoming.unit && expectedUnit !== incoming.unit) return { mappingStatus: 'MAPPED', reviewStatus: 'PENDING', reason: 'UNIT_MISMATCH' };
  if (expectedUnit && !incoming.unit) return { mappingStatus: 'MAPPED', reviewStatus: 'PENDING', reason: 'UNIT_MISSING' };
  return { mappingStatus: 'MAPPED', reviewStatus: 'PENDING', reason: 'AWAITING_HUMAN_REVIEW' };
}
module.exports = { normalizeCanonicalResultEnvelope, assessResultMapping };
