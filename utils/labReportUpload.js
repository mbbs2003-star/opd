const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.join(process.cwd(), 'storage', 'lab-reports');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, crypto.randomBytes(18).toString('hex') + ext);
  }
});

const allowed = new Set(['application/pdf','image/jpeg','image/png']);
const labReportUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowed.has(file.mimetype)) return cb(new Error('Only PDF, JPG and PNG report files are allowed'));
    cb(null, true);
  }
});

module.exports = { labReportUpload, uploadDir };
