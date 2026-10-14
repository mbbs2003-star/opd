'use strict';

/** Offline ASTM E1381/E1394 parser based on the uploaded Transasia EM 200 Host Interface Manual v2.0 (Nov 2008). Not certified for Erba XL-200. No clinical writes or live I/O. */
const CONTROL = Object.freeze({ STX: 0x02, ETX: 0x03, EOT: 0x04, ENQ: 0x05, ACK: 0x06, NAK: 0x15, ETB: 0x17, CR: 0x0d, LF: 0x0a });
function checksumForFrame(frameNumber, text, terminator) {
  const bytes = Buffer.from(String(frameNumber) + text + String.fromCharCode(terminator), 'ascii');
  let sum = 0;
  for (const byte of bytes) sum = (sum + byte) & 0xff;
  return sum.toString(16).toUpperCase().padStart(2, '0');
}
function decodeFrames(payload, options = {}) {
  if (typeof payload !== 'string' || payload.length < 1 || payload.length > 2 * 1024 * 1024) throw new Error('ASTM payload must be a non-empty string up to 2 MB');
  const bytes = Buffer.from(payload, 'latin1');
  const frames = [];
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    if ([CONTROL.ENQ, CONTROL.ACK, CONTROL.NAK, CONTROL.EOT].includes(b)) { frames.push({ control: b }); i += 1; continue; }
    if (b !== CONTROL.STX) {
      if (b === CONTROL.CR || b === CONTROL.LF) { i += 1; continue; }
      throw new Error('Unexpected byte outside ASTM frame at offset ' + i);
    }
    if (i + 6 >= bytes.length) throw new Error('Incomplete ASTM frame');
    const frameNoByte = bytes[i + 1];
    if (frameNoByte < 0x30 || frameNoByte > 0x37) throw new Error('Invalid ASTM frame number');
    let end = i + 2;
    while (end < bytes.length && bytes[end] !== CONTROL.ETX && bytes[end] !== CONTROL.ETB) end += 1;
    if (end >= bytes.length || end + 4 >= bytes.length) throw new Error('Incomplete ASTM frame terminator/checksum');
    const terminator = bytes[end];
    if (bytes[end + 3] !== CONTROL.CR || bytes[end + 4] !== CONTROL.LF) throw new Error('ASTM frame must end with CR LF');
    const text = bytes.subarray(i + 2, end).toString('latin1');
    const receivedChecksum = bytes.subarray(end + 1, end + 3).toString('ascii').toUpperCase();
    const expectedChecksum = checksumForFrame(String.fromCharCode(frameNoByte), text, terminator);
    const checksumValid = receivedChecksum === expectedChecksum;
    if (options.requireValidChecksum !== false && !checksumValid) throw new Error('ASTM checksum mismatch');
    frames.push({ frameNumber: String.fromCharCode(frameNoByte), text, final: terminator === CONTROL.ETX, checksum: receivedChecksum, checksumValid });
    i = end + 5;
  }
  return frames;
}
function parseRecords(message) {
  const lines = message.split('\r').filter(Boolean);
  if (!lines.length || !lines[0].startsWith('H|')) throw new Error('ASTM message must begin with Header record H');
  if (!lines.some(line => line.startsWith('L|'))) throw new Error('ASTM message must contain Terminator record L');
  const records = [];
  for (const line of lines) {
    const type = line[0];
    if (!['H', 'P', 'O', 'R', 'C', 'Q', 'L'].includes(type) || (line.length > 1 && line[1] !== '|')) throw new Error('Unsupported or malformed ASTM record type: ' + type);
    records.push(Object.freeze({ type, fields: Object.freeze(line.split('|').slice(1)) }));
  }
  return Object.freeze(records);
}
function parseAstmMessage(payload, options = {}) {
  const frames = decodeFrames(payload, options);
  const dataFrames = frames.filter(frame => Object.hasOwn(frame, 'text'));
  if (!dataFrames.length) throw new Error('No ASTM data frames found');
  for (let i = 0; i < dataFrames.length; i += 1) {
    if (dataFrames[i].frameNumber !== String((i + 1) % 8)) throw new Error('Unexpected ASTM frame sequence');
    if (i < dataFrames.length - 1 && dataFrames[i].final) throw new Error('Final ASTM frame appears before end of message');
    if (i === dataFrames.length - 1 && !dataFrames[i].final) throw new Error('ASTM message final frame must use ETX');
    if (dataFrames[i].text.length > 1024) throw new Error('ASTM frame text exceeds 1024 characters');
  }
  const records = parseRecords(dataFrames.map(frame => frame.text).join(''));
  return Object.freeze({ profile: 'generic-astm-e1381-e1394-offline', profileConfirmed: false, records, counts: Object.freeze(records.reduce((acc, record) => { acc[record.type] = (acc[record.type] || 0) + 1; return acc; }, {})), warning: 'Generic ASTM parse based on EM 200 manual; not validated for XL-200 and must not be imported into clinical records.' });
}
module.exports = { CONTROL, checksumForFrame, decodeFrames, parseRecords, parseAstmMessage };
