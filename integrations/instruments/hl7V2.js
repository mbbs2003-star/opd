'use strict';

/** Offline HL7 v2 ORU^R01 reader for profile development; no clinical writes. */
function splitField(segment, fieldNumber) {
  if (!Number.isInteger(fieldNumber) || fieldNumber < 1) return '';
  return (segment.split('|')[fieldNumber] || '').trim();
}
function component(value, index = 1) {
  if (!value) return '';
  return (value.split('^')[index - 1] || '').trim();
}
function clean(value, label, max = 500) {
  const out = String(value || '').trim();
  if (!out || out.length > max || /[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]/.test(out)) throw new Error(label + ' is missing or invalid');
  return out;
}
function parseHl7Orur01(payload, profile = {}) {
  if (typeof payload !== 'string' || payload.length < 10 || payload.length > 2 * 1024 * 1024) throw new Error('HL7 payload must be a non-empty string up to 2 MB');
  const normalized = payload.replace(/^\\x0b/, '').replace(/[\\x1c\\x0d]+$/, '');
  const segments = normalized.split(/\\r\\n|\\n|\\r/).filter(Boolean);
  if (!segments.length || !segments[0].startsWith('MSH|')) throw new Error('HL7 MSH segment is required');
  const mshFields = segments[0].split('|');
  const messageType = (mshFields[8] || '').trim();
  if (!/^ORU\\^R01(?:\\^|$)/.test(messageType)) throw new Error('Only HL7 ORU^R01 messages are supported by this offline parser');
  const messageId = clean(mshFields[9], 'MSH-10 message control ID', 180);
  const observations = [];
  let currentObr = null;
  let currentSpm = '';
  for (const segment of segments.slice(1)) {
    if (segment.startsWith('SPM|')) currentSpm = splitField(segment, 2);
    else if (segment.startsWith('OBR|')) currentObr = segment;
    else if (segment.startsWith('OBX|')) {
      if (!currentObr) throw new Error('OBX segment found before an OBR segment');
      const code = component(splitField(segment, 3), 1);
      const subId = component(splitField(segment, 3), 2);
      const valueType = splitField(segment, 2);
      const value = splitField(segment, 5);
      if (!code || !value) throw new Error('OBX observation code and value are required');
      observations.push(Object.freeze({ orderPlacerId: splitField(currentObr, 2) || null, orderFillerId: splitField(currentObr, 3) || null, specimenId: currentSpm || null, observationCode: clean(code, 'OBX-3 observation code', 100), observationSubId: subId, valueType: valueType || null, value: clean(value, 'OBX-5 observation value'), unit: splitField(segment, 6) || null, referenceRange: splitField(segment, 7) || null, abnormalFlag: splitField(segment, 8) || null, resultStatus: splitField(segment, 11) || null, observedAt: splitField(segment, 14) || null }));
    }
  }
  if (!observations.length) throw new Error('HL7 message contains no OBX observations');
  const result = { messageId, messageType, profileConfirmed: profile.confirmed === true, observations: Object.freeze(observations) };
  if (!result.profileConfirmed) result.warning = 'Unconfirmed generic HL7 parse; do not import into clinical records.';
  return Object.freeze(result);
}
module.exports = { parseHl7Orur01 };
