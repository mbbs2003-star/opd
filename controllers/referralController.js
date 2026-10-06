const referralService = require('../services/referralService');
const AppError = require('../utils/AppError');

async function providers(req, res, next) {
  try {
    const rows = await referralService.listProviders();
    res.render('admin/referrals', { title: 'Referral Providers', providers: rows });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    await referralService.createProvider(req.body, req.user.id);
    req.flash('success', 'Referral provider and referral code created.');
    res.redirect('/admin/referrals');
  } catch (err) {
    if (err instanceof AppError) {
      req.flash('errors', [{ message: err.message }]);
      req.flash('formData', req.body);
      return res.redirect('/admin/referrals');
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    await referralService.updateProvider(req.params.id, req.body, req.user.id);
    req.flash('success', 'Referral provider updated.');
    res.redirect('/admin/referrals');
  } catch (err) {
    if (err instanceof AppError) {
      req.flash('errors', [{ message: err.message }]);
      return res.redirect('/admin/referrals');
    }
    next(err);
  }
}

async function toggle(req, res, next) {
  try {
    await referralService.toggleProvider(req.params.id, req.body.isActive === '1', req.user.id);
    req.flash('success', 'Referral provider status updated.');
    res.redirect('/admin/referrals');
  } catch (err) { next(err); }
}

async function tracking(req, res, next) {
  try {
    const data = await referralService.tracking();
    res.render('admin/referral-tracking', { title: 'Referral Tracking', ...data });
  } catch (err) { next(err); }
}

module.exports = { providers, create, update, toggle, tracking };
