const express = require('express');
const router = express.Router();
const patientPortalController = require('../controllers/patientPortalController');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/roles');
const { csrfProtection } = require('../middleware/csrf');
const asyncHandler = require('../utils/asyncHandler');

router.use(requireAuth);
router.use(requirePermission('patient.portal.access'));

router.get('/', asyncHandler(patientPortalController.dashboard));
router.get('/book', asyncHandler(patientPortalController.showBookForm));
router.get('/lab', asyncHandler(patientPortalController.showLab));
router.post('/lab/book', csrfProtection, asyncHandler(patientPortalController.bookLab));
router.get('/lab/orders/:id', asyncHandler(patientPortalController.viewLabOrder));
router.post('/lab/orders/:id/cancel', csrfProtection, asyncHandler(patientPortalController.cancelLabOrder));
router.get('/lab/reports/:id', asyncHandler(patientPortalController.viewLabReport));
router.get('/lab/reports/:id/print', asyncHandler(patientPortalController.printLabReport));
router.get('/lab/reports/:id/file', asyncHandler(patientPortalController.downloadLabReportFile));
router.get('/book/doctors', asyncHandler(patientPortalController.doctorsByDepartment));
router.get('/book/doctors/:doctorId/slots', asyncHandler(patientPortalController.doctorSlots));
router.post('/book', csrfProtection, asyncHandler(patientPortalController.book));
router.get('/barcode', asyncHandler(patientPortalController.ownBarcode));
router.get('/edit-profile', asyncHandler(patientPortalController.showEditProfile));
router.post('/edit-profile', csrfProtection, asyncHandler(patientPortalController.updateOwnProfile));
router.get('/prescriptions/:id', asyncHandler(patientPortalController.viewPrescription));
router.get('/prescriptions/:id/print', asyncHandler(patientPortalController.printPrescription));
router.get('/invoices/:id', asyncHandler(patientPortalController.viewInvoice));
router.get('/invoices/:id/receipt/:paymentId', asyncHandler(patientPortalController.printReceipt));

module.exports = router;
