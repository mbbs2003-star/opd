const port = Number(process.env.SMTP_PORT) || 587;
const secureEnv = String(process.env.SMTP_SECURE || '').trim().toLowerCase();

module.exports = {
  enabled: Boolean(String(process.env.SMTP_HOST || '').trim()),
  host: String(process.env.SMTP_HOST || '').trim(),
  port,
  // SMTP 465 uses implicit TLS; SMTP 587 normally uses STARTTLS.
  secure: secureEnv ? secureEnv === 'true' : port === 465,
  requireTLS: String(process.env.SMTP_REQUIRE_TLS || '').trim().toLowerCase() === 'true',
  tlsRejectUnauthorized: String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED || 'true').trim().toLowerCase() !== 'false',
  connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT) || 15000,
  greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT) || 15000,
  socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT) || 20000,
  user: String(process.env.SMTP_USER || '').trim(),
  password: process.env.SMTP_PASSWORD || '',
  fromName: String(process.env.SMTP_FROM_NAME || 'Chhayabithi HMS').trim(),
  // Use the authenticated SMTP mailbox unless a separate verified sender is configured.
  fromEmail: String(process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'no-reply@chhayabithi.com').trim()
};
