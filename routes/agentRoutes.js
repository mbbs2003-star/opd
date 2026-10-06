const express=require('express');
const router=express.Router();
const controller=require('../controllers/agentController');
const { requireAuth }=require('../middleware/auth');
const { requirePermission }=require('../middleware/roles');
const { csrfProtection }=require('../middleware/csrf');
const asyncHandler=require('../utils/asyncHandler');

router.use(requireAuth);
router.get('/',requirePermission('agent.portal'),asyncHandler(controller.dashboard));
router.get('/patients',requirePermission('agent.patient.view'),asyncHandler(controller.patients));
router.get('/patients/new',requirePermission('agent.patient.create'),asyncHandler(controller.newPatient));
router.post('/patients',requirePermission('agent.patient.create'),csrfProtection,asyncHandler(controller.createPatient));
router.get('/opd/new',requirePermission('agent.appointment.create'),asyncHandler(controller.opdForm));
router.post('/opd',requirePermission('agent.appointment.create'),csrfProtection,asyncHandler(controller.bookOpd));
router.get('/tests/new',requirePermission('agent.lab.create'),asyncHandler(controller.testForm));
router.post('/tests',requirePermission('agent.lab.create'),csrfProtection,asyncHandler(controller.bookTest));
router.get('/referrals',requirePermission('agent.referral.view'),asyncHandler(controller.referrals));

module.exports=router;
