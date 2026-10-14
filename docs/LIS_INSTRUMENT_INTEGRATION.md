# Chhayabithi LIS instrument integration

## Safety status
This adds a disabled-by-default instrument registry, test mappings, message audit log, inbound result staging inbox and outbound order queue. It does not mean the physical devices are connected. Interface status, network topology, protocol profile, vendor licence and service configuration are unknown.

Adapters deliberately fail closed for hardware parsing and order serialization until a versioned vendor profile is supplied and validated. Simulator mode is for synthetic messages only.

## Adapter targets
- bioMérieux VIDAS KUBE: BCI Connect XML over FTP/FTPS/SFTP. Confirm BCI version, server address/port, secure mode, folders, credentials, XML schema/profile and primary/secondary/cluster topology.
- Erba Mannheim XL-200: host settings may support TCP/IP or RS-232. Confirm software version, host protocol/framing, IP/port or serial parameters, directionality and order-download behavior with Erba support.
- Sysmex XQ-320: product documentation lists LAN/HL7 support, but exact HL7 version/profile, enabled options, order-download support and serial alternative must be confirmed with Sysmex service.

## Workflow
1. LIS creates order and sample barcode.
2. A mapped eligible order item can be queued in the instrument outbox.
3. A device-specific worker serializes only against a verified profile and sends the order; retries are persisted.
4. Incoming payload is stored in the message log with an idempotency key and payload hash.
5. Parsed results are staged in the result inbox, mapped by instrument test/parameter code and checked against order/sample identity.
6. Technician/pathologist reviews value, unit, flags, mapping and QC. Existing LIS verification/release remains the only clinical report release route.

## Rules
- Never match by patient name alone. Prefer exact order/accession and barcode/sample code; quarantine mismatches and ambiguous matches.
- Never auto-release, overwrite verified/released values, or silently convert units.
- Unknown mappings, unit mismatch, duplicate results, missing barcode, invalid timestamps, QC/critical flags require review.
- Keep secrets outside config JSON, logs and Git. Restrict analyzer traffic to a lab VLAN and allowlisted endpoints; prefer FTPS/SFTP where supported.
- Do not change analyzer settings without manufacturer-authorized service support.

## Deployment
1. Back up MySQL and verify migration baseline.
2. Deploy code and run npm run migrate; confirm migration 1014 in schema_migrations.
3. Keep instruments disabled. Record serial number, firmware/software version, vendor-confirmed protocol/profile and connection type.
4. Configure mappings and units; require second-person review.
5. Test with vendor-approved sample messages and synthetic fixtures, never real patient data in development.
6. Test orders, acknowledgements, result import, duplicate/retry, disconnect recovery, wrong accession, unknown test, unit mismatch, QC/critical flags and audit trail with service engineer.
7. Pilot one device at a time alongside manual workflow. Compare every result with analyzer output before clinical use.
8. Enable automated import only after sign-off. Keep human verification and report release permissions.

## Not yet active
Hardware transports, vendor-specific XML/HL7/serial parsers, order serializers, acknowledgement semantics and admin UI are not active. These require protocol documents/sample messages and device-side configuration. This foundation refuses to guess.
