const settingsService = require('../services/settingsService');

/**
 * Blocks the application during maintenance for every account except
 * SUPER_ADMIN. Authentication is intentionally still available so a
 * Super Admin can sign in and disable maintenance mode.
 */
async function maintenanceGate(req, res, next) {
  try {
    const settings = await settingsService.getSettings();
    if (settings.maintenance_mode !== '1') return next();

    const path = req.originalUrl.split('?')[0];
    const authPath = path === '/auth/login' || path === '/auth/logout' || path === '/auth/reset-password';

    if (authPath) return next();
    if (req.user && Array.isArray(req.user.roles) && req.user.roles.includes('SUPER_ADMIN')) {
      return next();
    }

    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(503).json({
        error: 'Site is under maintenance',
        maintenance: true
      });
    }

    return res.status(503).render('maintenance', {
      layout: 'layouts/blank',
      title: 'Under Maintenance'
    });
  } catch (err) {
    // Fail open if the setting store is unavailable. A DB outage should
    // be handled by the normal application error path rather than making
    // every request inaccessible because the maintenance check failed.
    return next(err);
  }
}

module.exports = { maintenanceGate };
