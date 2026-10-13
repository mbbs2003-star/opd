const crypto = require('crypto');
const { pool } = require('../config/database');

function validationError(message) {
  const err = new Error(message);
  err.name = 'BlogValidationError';
  return err;
}

function slugify(value) {
  const slug = String(value || '').normalize('NFKD').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 170);
  return slug || 'doctor-blog';
}

function youtubeVideoId(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  let url;
  try { url = new URL(raw); } catch (_) { return null; }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  let id = '';
  if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] || '';
  else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
    else if (/^\/(embed|shorts)\//.test(url.pathname)) id = url.pathname.split('/')[2] || '';
  }
  return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

async function createPost({ doctorId, title, excerpt, content, imagePath, youtubeUrl, publish }) {
  const cleanTitle = String(title || '').trim();
  const cleanContent = String(content || '').trim();
  if (cleanTitle.length < 5 || cleanTitle.length > 180) throw validationError('Title must be between 5 and 180 characters.');
  if (cleanContent.length < 30 || cleanContent.length > 100000) throw validationError('Blog content must be between 30 and 100,000 characters.');
  const videoId = youtubeVideoId(youtubeUrl);
  if (String(youtubeUrl || '').trim() && !videoId) throw validationError('Enter a valid YouTube video URL.');
  const cleanExcerpt = String(excerpt || '').trim().slice(0, 500) || cleanContent.replace(/\s+/g, ' ').slice(0, 220);
  const status = publish ? 'PUBLISHED' : 'DRAFT';
  const publishedAt = publish ? new Date() : null;
  const slug = slugify(cleanTitle) + '-' + crypto.randomBytes(4).toString('hex');
  const [result] = await pool.execute(
    `INSERT INTO doctor_blogs
      (doctor_id, title, slug, excerpt, content, image_path, youtube_video_id, status, published_at)
     VALUES (:doctorId, :title, :slug, :excerpt, :content, :imagePath, :videoId, :status, :publishedAt)`,
    { doctorId, title: cleanTitle, slug, excerpt: cleanExcerpt, content: cleanContent, imagePath: imagePath || null, videoId, status, publishedAt }
  );
  return { id: result.insertId, slug, status };
}

async function listForDoctor(doctorId) {
  const [rows] = await pool.execute(
    `SELECT id, title, slug, excerpt, image_path, youtube_video_id, status, published_at, created_at, updated_at
     FROM doctor_blogs WHERE doctor_id = :doctorId ORDER BY updated_at DESC LIMIT 100`,
    { doctorId }
  );
  return rows;
}

async function listPublished(limit = 12) {
  const safeLimit = Math.min(30, Math.max(1, Number(limit) || 12));
  const [rows] = await pool.query(
    `SELECT b.id, b.title, b.slug, b.excerpt, b.content, b.image_path, b.youtube_video_id, b.published_at,
            u.name AS doctor_name, d.specialisation
     FROM doctor_blogs b
     JOIN doctors d ON d.id = b.doctor_id
     JOIN users u ON u.id = d.user_id
     WHERE b.status = 'PUBLISHED' AND b.published_at IS NOT NULL
       AND d.is_active = 1 AND d.deleted_at IS NULL
     ORDER BY b.published_at DESC, b.id DESC LIMIT ${safeLimit}`
  );
  return rows;
}

async function getPublishedBySlug(slug) {
  const [[row]] = await pool.execute(
    `SELECT b.id, b.title, b.slug, b.excerpt, b.content, b.image_path, b.youtube_video_id, b.published_at,
            u.name AS doctor_name, d.specialisation, d.qualification
     FROM doctor_blogs b
     JOIN doctors d ON d.id = b.doctor_id
     JOIN users u ON u.id = d.user_id
     WHERE b.slug = :slug AND b.status = 'PUBLISHED' AND b.published_at IS NOT NULL
       AND d.is_active = 1 AND d.deleted_at IS NULL LIMIT 1`,
    { slug }
  );
  return row || null;
}

module.exports = { createPost, listForDoctor, listPublished, getPublishedBySlug, youtubeVideoId };
