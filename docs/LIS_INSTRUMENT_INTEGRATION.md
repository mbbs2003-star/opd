# Chhayabithi LIS instrument integration

## Current implementation status
PR #70 provides an additive instrument registry, test mappings, message audit log, inbound result staging inbox and outbound order queue. Offline validation protects the internal synthetic result envelope and checks exact mapping rules. A generic HL7 v2 ORU^R01 reader has now been added for fixture/profile development. It extracts message/observation fields only; it does not import results into clinical records, acknowledge messages, open sockets, or prove a device connection.

## Public-documentation implementation basis
- **bioMérieux VIDAS KUBE:** BCI Connect documentation describes LIS/AI XML messaging. Initial transport/profile work should target BCI Connect XML (`lisMessage` outbound and `aiMessage` inbound) and documented file-transfer options, but the exact installed schema, folders, security mode and identifiers still need validation against real samples.
- **Erba Mannheim XL-200:** public user documentation describes TCP/IP or RS-232 host settings. The app can prepare the transport/configuration boundary, but message framing, serial parameters, directionality and host/order protocol are not safe to guess from the connection setting alone.
- **Sysmex XQ-320:** public product documentation indicates LAN/LIS HL7 capability. The generic ORU^R01 reader is a first offline step, not a Sysmex-certified profile. Confirm message version, framing (e.g. MLLP or vendor-specific), segment conventions, order-download support and ACK/error behavior before enabling live I/O.

## Safe data path
1. Existing LIS creates the order and sample barcode.
2. Only eligible orders with reviewed test-code mappings may be considered for an outbound queue.
3. Device-specific serializers and transports must be implemented against a validated, versioned profile before any order is sent.
4. Incoming payloads are audited with a payload hash/idempotency key before parsing.
5. Parsed observations remain staged. Match the exact order/accession and specimen/barcode plus reviewed test/parameter mapping; never match by patient name alone.
6. Unknown/mismatched identifiers, missing barcode, unknown test, unit mismatch, duplicate/retry, invalid timestamps and QC/critical flags remain pending for review.
7. Qualified staff review imported results. Existing LIS verification/release remains the only clinical report-release path.

## Safety requirements
- Never auto-release, overwrite verified/released values, or silently convert units.
- Never treat generic HL7/XML parsing as proof that the device's profile matches.
- Keep secrets outside config JSON, logs and Git. Restrict analyzer traffic to a lab VLAN and allowlist endpoints/ports; use secured transport where supported.
- Do not change analyzer settings without manufacturer-authorized service support.
- Keep all devices disabled until protocol, transport, mappings and sample messages are verified.

## Deployment and validation
1. Back up MySQL and verify migration history.
2. Deploy and run `npm run migrate`; confirm migration 1014 in schema history.
3. Keep devices disabled; record serial number, software/firmware version and installed interface options.
4. Review test/parameter/unit mappings with a second person.
5. Run `node --test test/lis-instrument-adapters.test.js test/lis-instrument-canonical-result.test.js test/lis-instrument-hl7.test.js` with synthetic fixtures.
6. Obtain vendor-approved messages (or use public documentation only for offline prototyping); validate with lab staff before implementing native BCI XML and XL-200 framing/profile.
7. Test duplicate/retry, disconnect recovery, wrong accession/specimen, unknown tests, unit mismatch, QC/critical flags and audit trails with the service engineer.
8. Pilot one analyzer at a time alongside the manual workflow and compare every imported result against analyzer output before clinical use.

## Not yet active
Physical hardware transports, BCI Connect XML parsing/serialization, XL-200 native host protocol, Sysmex-specific HL7 profile/framing, order serializers, acknowledgements, background workers and authenticated configuration/mapping/review UI are not active. The generic HL7 reader is offline-only. Live connectivity and migration execution have not been verified.
