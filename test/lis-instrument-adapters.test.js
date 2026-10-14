'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {SUPPORTED,getAdapter}=require('../integrations/instruments/adapterRegistry');
const {sha256}=require('../services/labInstrumentService');
test('target adapters fail closed until vendor protocol profiles are implemented',()=>{
 assert.deepEqual(Object.keys(SUPPORTED),['VIDAS_KUBE_BCI_XML','ERBA_XL200_HOST','SYSMEX_XQ320_HL7']);
 for(const code of Object.keys(SUPPORTED)){const adapter=getAdapter(code);assert.throws(()=>adapter.parseInbound(),/not enabled/);assert.throws(()=>adapter.buildOrder(),/not enabled/);}
});
test('hardware adapters require explicit protocol confirmation',()=>{
 const adapter=getAdapter('SYSMEX_XQ320_HL7');
 assert.throws(()=>adapter.validateConfig({enabled:true,transport:'TCP_CLIENT'}),/protocol\/profile is confirmed/);
 assert.equal(adapter.validateConfig({enabled:true,transport:'SIMULATOR'}),true);
});
test('hashes are deterministic for duplicate detection',()=>{
 assert.equal(sha256('synthetic message'),sha256('synthetic message'));assert.notEqual(sha256('synthetic message'),sha256('other message'));
});
