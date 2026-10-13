const fs = require('fs');
const path = require('path');
const blogService = require('../services/blogService');
const AppError = require('../utils/AppError');

function doctorIdOrThrow(req) {
  if (!req.user || !req.user.doctorId || !req.user.permissions.includes('consultation.create')) {
    throw new AppError('Only authenticated doctors can manage doctor blogs.', 403);
  }
  return req.user.doctorId;
}

function removeUploadedFile(file) {
  if (!file) return;
  fs.unlink(path.join(process.cwd(), 'public', 'uploads', 'blog-images', path.basename(file.filename)), () => {});
}

async function list(req, res, next) {
  try {
    const doctorId = doctorIdOrThrow(req);
    const posts = await blogService.listForDoctor(doctorId);
    res.render('doctors/blogs/index', { title: 'My Blogs', posts });
  } catch (err) { next(err); }
}

async function newForm(req, res, next) {
  try {
    doctorIdOrThrow(req);
    res.render('doctors/blogs/new', { title: 'Write a Blog' });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const doctorId = doctorIdOrThrow(req);
    const result = await blogService.createPost({
      doctorId,
      title: req.body.title,
      excerpt: req.body.excerpt,
      content: req.body.content,
      imagePath: req.file ? '/uploads/blog-images/' + req.file.filename : null,
      youtubeUrl: req.body.youtubeUrl,
      publish: req.body.publish === '1'
    });
    req.flash('success', result.status === 'PUBLISHED' ? 'Blog published on the hospital website.' : 'Blog saved as a draft.');
    res.redirect('/doctor/blogs');
  } catch (err) {
    removeUploadedFile(req.file);
    if (err instanceof AppError) return next(err);
    if (err.name !== 'BlogValidationError') return next(err);
    req.flash('errors', [{ message: err.message }]);
    req.flash('formData', req.body);
    res.redirect('/doctor/blogs/new');
  }
}

module.exports = { list, newForm, create };
