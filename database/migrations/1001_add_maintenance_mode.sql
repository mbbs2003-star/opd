-- =====================================================================
-- 1001_add_maintenance_mode.sql
-- Global maintenance-mode setting. Disabled by default.
-- =====================================================================

INSERT INTO system_settings (branch_id, setting_key, setting_value)
SELECT NULL, 'maintenance_mode', '0'
WHERE NOT EXISTS (
  SELECT 1 FROM system_settings
  WHERE branch_id IS NULL AND setting_key = 'maintenance_mode'
);
