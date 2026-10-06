const express=require('express');
const router=express.Router();
const controller=require('../controllers/agentController');
const { requireAuth }=require('../middleware/auth');
const { requirePermission }=require('../middleware/roles');
const { csrfProtection }=require('../middleware/csrf');
const asyncHandler=require('../utils/asyncHandler');

router.use(requireAuth);
router.get('/',requireRole('AGENT'),asyncHandler(controller.dashboard));
router.get('/patients',requireRole('AGENT'),asyncHandler(controller.patients));
router.get('/patients/new',requireRole('AGENT'),asyncHandler(controller.newPatient));
router.post('/patients',requirePermission('agent.patient.create'),csrfProtection,asyncHandler(controller.createPatient));
router.get('/opd/new',requireRole('AGENT'),asyncHandler(controller.opdForm));
router.post('/opd',requirePermission('agent.appointment.create'),csrfProtection,asyncHandler(controller.bookOpd));
router.get('/tests/new',requireRole('AGENT'),asyncHandler(controller.testForm));
router.post('/tests',requirePermission('agent.lab.create'),csrfProtection,asyncHandler(controller.bookTest));
router.get('/referrals',requireRole('AGENT'),asyncHandler(controller.referrals));

module.exports=router;
