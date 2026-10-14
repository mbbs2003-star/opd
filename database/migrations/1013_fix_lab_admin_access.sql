-- Restore expected Laboratory / LIS administration access for the existing ADMIN role.
-- The base LIS migration intentionally gave ADMIN view/order access only, which
-- left the Lab Staff and Lab Settings links hidden and direct requests forbidden.
-- Review Builder already requires lab.view; grant it explicitly as a safe repair
-- for databases whose earlier role-permission seed was not applied consistently.

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('lab.view', 'lab.manage')
WHERE r.code IN ('ADMIN', 'SUPER_ADMIN', 'LAB_ADMIN')
ON DUPLICATE KEY UPDATE role_id = role_id;
