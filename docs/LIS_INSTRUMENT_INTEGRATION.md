# Chhayabithi LIS instrument integration

## Current implementation status
PR #70 provides an additive instrument registry, test mappings, message audit log, inbound result staging inbox and outbound order queue. Offline validation protects the internal synthetic result envelope and checks exact mapping rules. Generic offline HL7 v2 ORU^R01 and ASTM E1381/E1394 parsers are included for fixture/profile development only. They extract records/observations; they do not import clinical results, acknowledge messages, open sockets/serial ports, or prove device connectivity.

## Protocol basis and device-specific caveats
- **bioMérieux VIDAS KUBE:** vendor confirmation says BCI Connect XML messaging is used. Target BCI Connect XML (lisMessage outbound and aiMessage inbound direction as documented), but validate the installed schema, transfer folders, security mode, identifiers and sample payloads before live communication.
- **Sysmex XQ-320:** vendor confirmation says LAN/HL7 connectivity is available. The generic ORU^R01 reader is an offline starting point, not a Sysmex-certified profile. Confirm HL7 version, framing (MLLP or vendor-specific), segment conventions, order-download support, acknowledgements and error behavior before live I/O.
- **Third analyzer manual supplied:** the uploaded PDF is titled **“EM 200 (Clinical Chemistry Analyzer) — ASTM Host Interface Document”, Transasia Bio-Medicals Ltd, version 2.0, November 2008**. It describes ASTM E1381-02/E1394-97 style messaging over RS-232 or TCP/IP. The manual lists serial settings including baud rate options 1200–19200, ASCII, 7/8 data bits, parity and 1/2 stop bits; its OSI overview also gives 9600, 8-N-1 as an example/default. It describes ASTM frames (STX, frame number, text, ETB/ETX, checksum, CR LF), ENQ/ACK/NAK/EOT handshaking, checksum validation, and H/P/O/R/C/Q/L records. The manual says frame text is limited to 1024 characters and messages must start with H and end with L.
- **Important model mismatch:** this manual explicitly names **EM 200**, not **Erba Mannheim XL-200**. The ASTM parser added here is therefore a generic offline parser based on the supplied EM 200 manual. Do not enable it for XL-200 until you confirm the physical analyzer make/model and that this host-interface document applies to that exact device/firmware. If the device is actually XL-200, its ASTM protocol/profile must be verified separately.

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
- Never treat a generic HL7/ASTM parse as proof that the device's installed profile matches.
- Keep secrets outside config JSON, logs and Git. Restrict analyzer traffic to a lab VLAN and allowlist endpoints/ports; use secured transport where supported.
- Do not change analyzer settings without manufacturer-authorized service support.
- Keep all devices disabled until protocol, transport, mappings and sample messages are verified.

## Deployment and validation
1. Back up MySQL and verify migration history.
2. Deploy and run npm run migrate; confirm migration 1014 in schema history.
3. Keep devices disabled; record make/model, serial number, software/firmware version and installed interface options.
4. Review test/parameter/unit mappings with a second person.
5. Run offline synthetic tests: node --test test/lis-instrument-adapters.test.js test/lis-instrument-canonical-result.test.js test/lis-instrument-hl7.test.js test/lis-instrument-astm.test.js.
6. Compare parser behavior with vendor-approved messages and lab staff review before enabling any native profile.
7. Test duplicate/retry, disconnect recovery, wrong accession/specimen, unknown tests, unit mismatch, QC/critical flags and audit trails with the service engineer.
8. Pilot one analyzer at a time alongside the manual workflow and compare every imported result against analyzer output before clinical use.

## Not yet active
Physical hardware transports, BCI Connect XML parsing/serialization, confirmed XL-200/EM 200 model-specific ASTM profile, Sysmex-specific HL7 profile/framing, order serializers, acknowledgements, background workers and authenticated configuration/mapping/review UI are not active. The generic parsers are offline-only. Live connectivity, tests and migration execution have not been verified.
