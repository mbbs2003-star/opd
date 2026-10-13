-- Pharmacy catalogue must retain the full composition captured by the doctor Rx editor.
ALTER TABLE pharmacy_medicines
  MODIFY COLUMN generic_name VARCHAR(500) NULL;
