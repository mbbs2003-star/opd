-- 1014: Safe instrument integration foundation. Additive only; no device is enabled by default.
CREATE TABLE IF NOT EXISTS lab_instruments (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, laboratory_id INT UNSIGNED NOT NULL,
 code VARCHAR(50) NOT NULL, display_name VARCHAR(180) NOT NULL, manufacturer VARCHAR(120) NOT NULL, model VARCHAR(120) NOT NULL,
 adapter_code ENUM('VIDAS_KUBE_BCI_XML','ERBA_XL200_HOST','SYSMEX_XQ320_HL7') NOT NULL,
 transport ENUM('FTP','FTPS','SFTP','TCP_CLIENT','TCP_SERVER','RS232','MANUAL','SIMULATOR') NOT NULL DEFAULT 'MANUAL',
 endpoint_host VARCHAR(255) NULL, endpoint_port INT UNSIGNED NULL, config_json JSON NULL,
 enabled TINYINT(1) NOT NULL DEFAULT 0, connection_status ENUM('UNKNOWN','DISCONNECTED','CONNECTED','ERROR') NOT NULL DEFAULT 'UNKNOWN',
 last_seen_at DATETIME NULL, created_by INT UNSIGNED NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_lab_instrument_lab FOREIGN KEY (laboratory_id) REFERENCES laboratories(id),
 CONSTRAINT fk_lab_instrument_creator FOREIGN KEY (created_by) REFERENCES users(id),
 UNIQUE KEY uk_lab_instrument_code (laboratory_id, code), INDEX idx_lab_instrument_enabled (laboratory_id, enabled, adapter_code)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS lab_instrument_test_mappings (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, instrument_id INT UNSIGNED NOT NULL,
 instrument_test_code VARCHAR(100) NOT NULL, instrument_parameter_code VARCHAR(100) NOT NULL DEFAULT '',
 lab_test_id INT UNSIGNED NOT NULL, lab_parameter_id INT UNSIGNED NULL, unit_expected VARCHAR(60) NULL,
 is_active TINYINT(1) NOT NULL DEFAULT 1, created_by INT UNSIGNED NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_lab_instrument_map_instrument FOREIGN KEY (instrument_id) REFERENCES lab_instruments(id) ON DELETE CASCADE,
 CONSTRAINT fk_lab_instrument_map_test FOREIGN KEY (lab_test_id) REFERENCES lab_tests(id),
 CONSTRAINT fk_lab_instrument_map_parameter FOREIGN KEY (lab_parameter_id) REFERENCES lab_test_parameters(id),
 CONSTRAINT fk_lab_instrument_map_creator FOREIGN KEY (created_by) REFERENCES users(id),
 UNIQUE KEY uk_lab_instrument_mapping (instrument_id, instrument_test_code, instrument_parameter_code),
 INDEX idx_lab_instrument_map_test (lab_test_id, is_active)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS lab_instrument_messages (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, instrument_id INT UNSIGNED NOT NULL,
 direction ENUM('INBOUND','OUTBOUND') NOT NULL, message_type VARCHAR(60) NOT NULL,
 external_message_id VARCHAR(180) NULL, idempotency_key CHAR(64) NOT NULL,
 status ENUM('RECEIVED','QUEUED','PROCESSING','PENDING_REVIEW','SENT','ACKNOWLEDGED','DUPLICATE','REJECTED','ERROR') NOT NULL DEFAULT 'RECEIVED',
 order_code VARCHAR(50) NULL, sample_code VARCHAR(80) NULL, payload_sha256 CHAR(64) NOT NULL,
 payload_text MEDIUMTEXT NULL, error_code VARCHAR(80) NULL, error_message VARCHAR(500) NULL,
 received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, processed_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_lab_instrument_message_instrument FOREIGN KEY (instrument_id) REFERENCES lab_instruments(id),
 UNIQUE KEY uk_lab_instrument_idempotency (instrument_id, idempotency_key),
 INDEX idx_lab_instrument_message_status (instrument_id, direction, status, received_at),
 INDEX idx_lab_instrument_message_order (order_code, sample_code)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS lab_instrument_result_inbox (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, instrument_id INT UNSIGNED NOT NULL, message_id BIGINT UNSIGNED NOT NULL,
 external_result_id VARCHAR(180) NULL, order_code VARCHAR(50) NULL, sample_code VARCHAR(80) NULL,
 instrument_test_code VARCHAR(100) NOT NULL, instrument_parameter_code VARCHAR(100) NOT NULL DEFAULT '',
 raw_value VARCHAR(500) NULL, raw_unit VARCHAR(100) NULL, raw_flag VARCHAR(100) NULL, observed_at DATETIME NULL,
 lab_order_item_id INT UNSIGNED NULL, lab_result_id INT UNSIGNED NULL,
 mapping_status ENUM('UNMAPPED','MAPPED','AMBIGUOUS','MISMATCH') NOT NULL DEFAULT 'UNMAPPED',
 review_status ENUM('PENDING','ACCEPTED','REJECTED','APPLIED') NOT NULL DEFAULT 'PENDING',
 reviewed_by INT UNSIGNED NULL, reviewed_at DATETIME NULL, review_note VARCHAR(500) NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_lab_result_inbox_instrument FOREIGN KEY (instrument_id) REFERENCES lab_instruments(id),
 CONSTRAINT fk_lab_result_inbox_message FOREIGN KEY (message_id) REFERENCES lab_instrument_messages(id),
 CONSTRAINT fk_lab_result_inbox_item FOREIGN KEY (lab_order_item_id) REFERENCES lab_order_items(id),
 CONSTRAINT fk_lab_result_inbox_result FOREIGN KEY (lab_result_id) REFERENCES lab_results(id),
 CONSTRAINT fk_lab_result_inbox_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id),
 UNIQUE KEY uk_lab_instrument_external_result (instrument_id, external_result_id, instrument_test_code, instrument_parameter_code),
 INDEX idx_lab_inbox_review (review_status, mapping_status, created_at), INDEX idx_lab_inbox_order (order_code, sample_code)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS lab_instrument_outbox (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, instrument_id INT UNSIGNED NOT NULL, lab_order_item_id INT UNSIGNED NOT NULL,
 message_id BIGINT UNSIGNED NULL, idempotency_key CHAR(64) NOT NULL,
 status ENUM('QUEUED','SENDING','SENT','ACKNOWLEDGED','RETRY','FAILED','CANCELLED') NOT NULL DEFAULT 'QUEUED',
 payload_text MEDIUMTEXT NOT NULL, attempt_count INT UNSIGNED NOT NULL DEFAULT 0, last_error VARCHAR(500) NULL,
 next_attempt_at DATETIME NULL, sent_at DATETIME NULL, acknowledged_at DATETIME NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_lab_instrument_outbox_instrument FOREIGN KEY (instrument_id) REFERENCES lab_instruments(id),
 CONSTRAINT fk_lab_instrument_outbox_item FOREIGN KEY (lab_order_item_id) REFERENCES lab_order_items(id),
 CONSTRAINT fk_lab_instrument_outbox_message FOREIGN KEY (message_id) REFERENCES lab_instrument_messages(id),
 UNIQUE KEY uk_lab_instrument_outbox_idempotency (instrument_id, idempotency_key),
 INDEX idx_lab_instrument_outbox_work (status, next_attempt_at, created_at)
) ENGINE=InnoDB;
