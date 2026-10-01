const express=require('express');
const router=express.Router();
const labController=require('../controllers/labController');
const {requireAuth}=require('../middleware/auth');
const {requirePermission}=require('../middleware/roles');
const {csrfProtection}=require('../middleware/csrf');
const asyncHandler=require('../utils/asyncHandler');
const {labReportUpload}=require('../utils/labReportUpload');

router.use(requireAuth);

router.get('/',requirePermission('lab.view'),asyncHandler(labController.dashboard));
router.get('/orders',requirePermission('lab.view'),asyncHandler(labController.orders));
router.get('/orders/new',requirePermission('lab.order.create'),asyncHandler(labController.showNewOrder));
router.post('/orders',requirePermission('lab.order.create'),csrfProtection,asyncHandler(labController.createOrder));
router.get('/orders/:id',requirePermission('lab.view'),asyncHandler(labController.orderDetail));
router.post('/orders/:id/cancel',requirePermission('lab.order.cancel'),csrfProtection,asyncHandler(labController.cancelOrder));

router.post('/items/:itemId/sample/collect',requirePermission('lab.sample.collect'),csrfProtection,asyncHandler(labController.collectSample));
router.post('/items/:itemId/sample/receive',requirePermission('lab.sample.collect'),csrfProtection,asyncHandler(labController.receiveSample));
router.post('/items/:itemId/sample/reject',requirePermission('lab.sample.collect'),csrfProtection,asyncHandler(labController.rejectSample));

router.get('/orders/:orderId/items/:itemId/result',requirePermission('lab.result.enter'),asyncHandler(labController.resultForm));
router.post('/items/:itemId/result',requirePermission('lab.result.enter'),csrfProtection,asyncHandler(labController.saveResult));
router.get('/results/:id',requirePermission('lab.view'),asyncHandler(labController.viewResult));
router.post('/results/:id/verify',requirePermission('lab.result.verify'),csrfProtection,asyncHandler(labController.verifyResult));
router.post('/results/:id/release',requirePermission('lab.result.release'),csrfProtection,asyncHandler(labController.releaseResult));
router.post('/results/:id/file',requirePermission('lab.result.enter'),csrfProtection,labReportUpload.single('reportFile'),asyncHandler(labController.attachFile));
router.get('/results/:id/print',requirePermission('lab.report.view','lab.result.release'),asyncHandler(labController.printReport));
router.get('/results/:id/file',requirePermission('lab.report.view','lab.result.release'),asyncHandler(labController.downloadReportFile));

router.get('/tests',requirePermission('lab.view'),asyncHandler(labController.tests));
router.get('/tests/new',requirePermission('lab.manage'),asyncHandler(labController.showTestForm));
router.get('/tests/:id/edit',requirePermission('lab.manage'),asyncHandler(labController.showTestForm));
router.post('/tests',requirePermission('lab.manage'),csrfProtection,asyncHandler(labController.saveTest));
router.post('/tests/:id',requirePermission('lab.manage'),csrfProtection,asyncHandler(labController.saveTest));

module.exports=router;
