const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'blog-images');
fs.mkdirSync(uploadDir, { recursive: true });

const allowed = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp']
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, crypto.randomBytes(18).toString('hex') + (allowed.get(file.mimetype) || '.img'))
});

const blogImageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!allowed.has(file.mimetype)) return cb(new Error('Blog images must be JPG, PNG, or WEBP (maximum 5 MB).'));
    cb(null, true);
  }
});

module.exports = { blogImageUpload, uploadDir };
