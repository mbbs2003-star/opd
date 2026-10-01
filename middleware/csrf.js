const { doubleCsrf } = require('csrf-csrf');
const appConfig = require('../config/appConfig');
const authConfig = require('../config/auth');

/** CSRF protection uses session-bound tokens so a token cannot be replayed after session rotation. */
const csrfUtils = doubleCsrf({
  getSecret: () => authConfig.csrfSecret,
  getSessionIdentifier: (req) => req.session.id,
  cookieName: appConfig.isProd ? '__Host-hms.csrf' : 'hms.csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: appConfig.isProd,
    path: '/'
  },
  // csrf-csrf v4 calls this getCsrfTokenFromRequest; v3 calls it
  // getTokenFromRequest. Supplying both keeps this middleware compatible
  // with existing deployments whose node_modules still contain v3.
  getCsrfTokenFromRequest: (req) => {
    const bodyToken = typeof req.body?._csrf === 'string' ? req.body._csrf : null;
    const headerToken = typeof req.headers['x-csrf-token'] === 'string' ? req.headers['x-csrf-token'] : null;
    return bodyToken || headerToken;
  },
  getTokenFromRequest: (req) => {
    const bodyToken = typeof req.body?._csrf === 'string' ? req.body._csrf : null;
    const headerToken = typeof req.headers['x-csrf-token'] === 'string' ? req.headers['x-csrf-token'] : null;
    return bodyToken || headerToken;
  }
});

const doubleCsrfProtection = csrfUtils.doubleCsrfProtection;
const generateV4 = csrfUtils.generateCsrfToken;
const generateV3 = csrfUtils.generateToken;

if (typeof generateV4 !== 'function' && typeof generateV3 !== 'function') {
  throw new Error(
    'csrf-csrf did not expose a supported token-generation function. ' +
      'Install csrf-csrf 4.x (preferred) or 3.x.'
  );
}

// v4 uses an options object; v3 uses a boolean third argument.
function generate(req, res, options) {
  if (typeof generateV4 === 'function') return generateV4(req, res, options);
  return generateV3(req, res, Boolean(options && options.overwrite));
}

/** Makes the current CSRF token available to every EJS view as `csrfToken`. */
function exposeCsrfToken(req, res, next) {
  try {
    res.locals.csrfToken = generate(req, res);
  } catch (err) {
    return next(err);
  }
  next();
}

/**
 * Forces a brand-new token + cookie, discarding any existing one.
 * Call this explicitly whenever the session identity changes (login
 * success, and defensively on logout) so nothing downstream can end up
 * holding a token minted under a since-replaced session — belt-and-
 * braces on top of the getSessionIdentifier fix above.
 */
function rotateCsrfToken(req, res) {
  return generate(req, res, { overwrite: true });
}

module.exports = { csrfProtection: doubleCsrfProtection, exposeCsrfToken, rotateCsrfToken };
