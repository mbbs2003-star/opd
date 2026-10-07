const app = require('./app');
const appConfig = require('./config/appConfig');
const { pool } = require('./config/database');
const emailConfig = require('./config/email');
const emailService = require('./services/emailService');
const { run: runMigrations } = require('./database/migrate');

async function start() {
  if (appConfig.isProd) {
    const required = ['SESSION_SECRET', 'CSRF_SECRET', 'AADHAAR_ENCRYPTION_KEY', 'AADHAAR_HASH_SECRET'];
    const missing = required.filter((name) => !process.env[name] || process.env[name].length < 32);
    if (missing.length) {
      console.error('[CONFIG] Missing/weak production secrets:', missing.join(', '));
      process.exit(1);
    }
  }

  try {
    // Apply any pending NON-DESTRUCTIVE migrations before serving requests.
    // This prevents application code from running against an older production
    // schema (for example, referral_providers being introduced after the code
    // deployment). The migration runner is idempotent and records each file.
    await runMigrations();

    // Fail fast if the database isn't reachable.
    const conn = await pool.getConnection();
    await conn.ping();

    // Keep deployments resilient when application code is updated before the
    // migration runner is executed. This is idempotent and only adds the
    // optional Rx Notes column when it is genuinely missing.
    const [rxNotesColumns] = await conn.query(
      `SELECT COUNT(*) AS count
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'prescriptions'
         AND COLUMN_NAME = 'rx_notes'`
    );
    if (!Number(rxNotesColumns[0]?.count)) {
      await conn.query(
        'ALTER TABLE prescriptions ADD COLUMN rx_notes TEXT NULL AFTER barcode_value'
      );
      console.log('[DB] Added missing prescriptions.rx_notes column.');
    }
    conn.release();
    console.log('[DB] Connection verified.');
  } catch (err) {
    console.error('[DB] Could not connect to MySQL. Check your .env settings.', err.message);
    process.exit(1);
  }

  if (emailConfig.enabled) {
    const smtpStatus = await emailService.verifySmtp();
    if (smtpStatus.ok) {
      console.log(`[SMTP] Connection verified: ${emailConfig.host}:${emailConfig.port}`);
    } else {
      console.error(`[SMTP] Configuration/connection check failed: ${smtpStatus.error || smtpStatus.reason}`);
      console.error('[SMTP] OTP/email notifications will fail until SMTP settings are corrected.');
    }
  } else {
    console.warn('[SMTP] Disabled: SMTP_HOST is not configured.');
  }

  const server = app.listen(appConfig.port, () => {
    console.log(`[HMS] ${appConfig.appName}`);
    console.log(`[HMS] Listening on port ${appConfig.port} (${appConfig.env})`);
  });

  const shutdown = (signal) => {
    console.log(`\n[HMS] Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
