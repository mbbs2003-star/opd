'use strict';
const crypto=require('node:crypto');
const {withTransaction}=require('../config/database');
const {getAdapter}=require('../integrations/instruments/adapterRegistry');
function sha256(value){return crypto.createHash('sha256').update(String(value)).digest('hex');}
function safeText(value,max=500){return value==null?null:String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').slice(0,max);}
async function stageInbound({instrumentId,messageType='RAW',externalMessageId=null,payload}){
 if(!Number.isInteger(Number(instrumentId))||Number(instrumentId)<1)throw new TypeError('instrumentId is required');
 if(typeof payload!=='string'||payload.length===0||payload.length>2000000)throw new TypeError('Payload must be non-empty and at most 2 MB');
 const payloadHash=sha256(payload), externalId=safeText(externalMessageId,180);
 const idempotencyKey=sha256([Number(instrumentId),externalId||'',payloadHash].join(':'));
 return withTransaction(async conn=>{
  const [[instrument]]=await conn.execute('SELECT id,adapter_code,enabled FROM lab_instruments WHERE id=:id FOR UPDATE',{id:Number(instrumentId)});
  if(!instrument)throw new Error('Instrument not found');
  if(!instrument.enabled)throw new Error('Instrument is disabled');
  getAdapter(instrument.adapter_code);
  const [existing]=await conn.execute('SELECT id,status FROM lab_instrument_messages WHERE instrument_id=:instrumentId AND idempotency_key=:key LIMIT 1',{instrumentId:Number(instrumentId),key:idempotencyKey});
  if(existing.length)return {duplicate:true,messageId:existing[0].id,status:existing[0].status};
  const [insert]=await conn.execute('INSERT INTO lab_instrument_messages (instrument_id,direction,message_type,external_message_id,idempotency_key,status,payload_sha256,payload_text) VALUES (:instrumentId,\'INBOUND\',:messageType,:externalId,:key,\'RECEIVED\',:payloadHash,:payload)',{instrumentId:Number(instrumentId),messageType:safeText(messageType,60)||'RAW',externalId,key:idempotencyKey,payloadHash,payload});
  return {duplicate:false,messageId:insert.insertId,status:'RECEIVED'};
 });
}
module.exports={stageInbound,sha256};
