# Chhayabithi LIS instrument integration

## Safety status
PR #70 adds an additive instrument registry, test mappings, message audit log, inbound result staging inbox and outbound order queue. This follow-up validates synthetic messages and exact mapping rules offline. Neither layer proves the physical devices are connected. Interface status, network topology, protocol profile, vendor licence and service configuration remain unknown.

Adapters fail closed for hardware parsing and order serialization until a versioned vendor profile is supplied and validated. The canonical JSON envelope is an internal test contract, not a format supported by any analyzer. Never configure an instrument to send this JSON.

## Adapter targets
- **bioMérieux VIDAS KUBE:** BCI Connect documentation describes LIS/AI XML messages over FTP, with secured modes documented by the vendor. Confirm installed BCI version, transport/security mode, folders, credentials, XML schema, identifiers and topology.
- **Erba Mannheim XL-200:** the user manual describes TCP/IP or RS-232 host settings. Confirm software version, host protocol/framing, endpoint or serial parameters, directionality and order-download behavior with Erba support.
- **Sysmex XQ-320:** product documentation lists LAN/LIS HL7 capability. Confirm enabled interface, HL7 profile/framing, order-download capability and serial alternatives with Sysmex service.

## Safe data path
1. Existing LIS creates an order and sample barcode.
2. After a validated mapping, an eligible order item may be queued for outbound delivery.
3. A device-specific worker serializes only against a confirmed vendor profile and records send/ack/retry state.
4. Incoming payload is stored in the instrument message log with a payload hash and idempotency key.
5. A vendor parser normalizes results to an internal envelope. Current envelope validator supports offline synthetic fixtures only; vendor parsers are not implemented.
6. Mapping checks require exact order and sample identifiers plus test/parameter mapping. Unknown/mismatched identifiers or units stay pending.
7. A qualified technician/pathologist reviews imported results. Existing LIS verification/release remains the only clinical report release route.

## Rules
- Never match by patient name alone. Prefer exact order/accession and barcode/sample code; quarantine mismatches and ambiguous matches.
- Never auto-release, overwrite verified/released values, or silently convert units.
- Unknown mappings, unit mismatch, duplicate results, missing barcode, invalid timestamps, QC/critical flags require review.
- Keep secrets outside config JSON, logs and Git. Restrict analyzer traffic to a lab VLAN and allowlist endpoints/ports; use secured transport where supported.
- Do not change analyzer settings without manufacturer-authorized service support.

## Deployment
1. Back up MySQL and verify migration history.
2. Deploy and run npm run migrate; confirm migration 1014 in schema_migrations.
3. Keep devices disabled. Record serial number, software/firmware version, vendor-confirmed profile and connection type.
4. Review test-code, parameter-code and unit mappings with a second person.
5. Run node --test test/lis-instrument-adapters.test.js test/lis-instrument-canonical-result.test.js using synthetic fixtures.
6. Obtain vendor-approved sample messages; implement and test vendor-specific parsers, order serializers, acknowledgements and transports.
7. Test duplicate/retry behavior, disconnect recovery, incorrect accession/sample, unknown test, unit mismatch, QC/critical flags and audit trails with the service engineer.
8. Pilot one instrument at a time alongside the manual workflow; compare every imported result with analyzer output before clinical use.

## Not yet active
Hardware transports, vendor-specific XML/HL7/serial parsers, order serializers, acknowledgements, background workers and authenticated configuration/mapping/review UI are not active. These require vendor profiles and device-side configuration. The foundation refuses to guess. No hardware connectivity is verified.
