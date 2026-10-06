const express = require('express');
const router = express.Router();
const controller = require('../controllers/referralController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { csrfProtection } = require('../middleware/csrf');
const asyncHandler = require('../utils/asyncHandler');

router.use(requireAuth, requireRole('SUPER_ADMIN'));

router.get('/', asyncHandler(controller.providers));
router.post('/', csrfProtection, asyncHandler(controller.create));
router.post('/:id', csrfProtection, asyncHandler(controller.update));
router.post('/:id/toggle', csrfProtection, asyncHandler(controller.toggle));
router.get('/tracking', asyncHandler(controller.tracking));

module.exports = router;
