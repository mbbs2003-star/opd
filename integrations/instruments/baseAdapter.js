'use strict';
const SUPPORTED = Object.freeze({
 VIDAS_KUBE_BCI_XML: { model: 'bioMérieux VIDAS KUBE', transports: ['FTP','FTPS','SFTP','SIMULATOR'], inbound: 'BCI Connect aiMessage XML', outbound: 'BCI Connect lisMessage XML' },
 ERBA_XL200_HOST: { model: 'Erba Mannheim XL-200', transports: ['TCP_CLIENT','TCP_SERVER','RS232','SIMULATOR'], inbound: 'Vendor-confirmed host protocol/framing', outbound: 'Vendor-confirmed order-download profile' },
 SYSMEX_XQ320_HL7: { model: 'Sysmex XQ-320', transports: ['TCP_CLIENT','TCP_SERVER','RS232','SIMULATOR'], inbound: 'Vendor-confirmed HL7 profile', outbound: 'Vendor-confirmed order-download profile' }
});
function getAdapter(code) {
 const definition=SUPPORTED[code]; if(!definition) throw new Error('Unsupported instrument adapter');
 return Object.freeze({code,definition,
  validateConfig(config={}) {
   if(!config || typeof config!=='object' || Array.isArray(config)) throw new TypeError('Instrument config must be an object');
   if(config.transport && !definition.transports.includes(config.transport)) throw new Error('Transport is not supported by this adapter');
   if(config.enabled===true && config.transport!=='SIMULATOR' && config.protocolConfirmed!==true) throw new Error('Hardware transport cannot be enabled until the vendor protocol/profile is confirmed');
   return true;
  },
  parseInbound(){throw new Error(code+' inbound parser is not enabled: validate the exact vendor message profile first');},
  buildOrder(){throw new Error(code+' order serializer is not enabled: validate the exact vendor order schema first');}
 });
}
module.exports={SUPPORTED,getAdapter};
