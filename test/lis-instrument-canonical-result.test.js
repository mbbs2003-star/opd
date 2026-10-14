'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeCanonicalResultEnvelope, assessResultMapping } = require('../integrations/instruments/canonicalResult');
const fixture = () => ({ schema:'chhayabithi.instrument-result.v1', instrumentCode:'SIM-VIDAS', messageId:'synthetic-001', orderCode:'LAB-DEMO-001', sampleCode:'SAMPLE-DEMO-001', observedAt:'2026-10-14T10:00:00+05:30', results:[{testCode:'DEMO-TST',parameterCode:'RESULT',value:'12.4',unit:'mg/L',flag:'NORMAL'}] });
test('synthetic envelope requires schema and exact order/sample identifiers', () => {
 const n=normalizeCanonicalResultEnvelope(fixture()); assert.equal(n.orderCode,'LAB-DEMO-001'); assert.equal(n.sampleCode,'SAMPLE-DEMO-001'); assert.equal(n.results[0].value,'12.4');
 assert.throws(()=>normalizeCanonicalResultEnvelope({...fixture(),schema:'unknown'}),/Unsupported/);
 assert.throws(()=>normalizeCanonicalResultEnvelope({...fixture(),sampleCode:''}),/sampleCode is required/);
});
test('envelope rejects malformed collections and control characters', () => {
 assert.throws(()=>normalizeCanonicalResultEnvelope({...fixture(),results:[]}),/results must contain/);
 assert.throws(()=>normalizeCanonicalResultEnvelope({...fixture(),results:[{testCode:'X',value:'bad\nvalue'}]}),/value is invalid/);
});
test('mapping is exact and never auto-accepts results', () => {
 const n=normalizeCanonicalResultEnvelope(fixture()), incoming={...n.results[0],orderCode:n.orderCode,sampleCode:n.sampleCode,testCode:'DEMO-TST'};
 const args={expectedOrderCode:'LAB-DEMO-001',expectedSampleCode:'SAMPLE-DEMO-001',mappedTestCode:'DEMO-TST',mappedParameterCode:'RESULT',expectedUnit:'mg/L',incoming};
 assert.deepEqual(assessResultMapping(args),{mappingStatus:'MAPPED',reviewStatus:'PENDING',reason:'AWAITING_HUMAN_REVIEW'});
 assert.equal(assessResultMapping({...args,expectedOrderCode:'LAB-DEMO-002'}).reason,'ORDER_MISMATCH');
 assert.equal(assessResultMapping({...args,expectedUnit:'g/L'}).reason,'UNIT_MISMATCH');
});
