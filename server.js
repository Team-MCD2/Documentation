const express = require('express');
const session = require('cookie-session');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 8001;
const SESSION_SECRET = process.env.SESSION_SECRET || 'devdocs-secret-2024';

const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({ dest: UPLOAD_DIR, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.json({ limit: '10mb' }));
app.use(session({ name: 'sid', secret: SESSION_SECRET, maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' }));

const requireAuth = (req, res, next) => {
  if (!req.session?.auth) return res.status(401).json({ detail: 'auth_required' });
  next();
};

// ── Auth ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ detail: 'pin_required' });
  if (pin !== db.getPin()) return res.status(401).json({ detail: 'invalid_pin' });
  req.session.auth = true;
  res.json({ ok: true });
});

app.post('/api/auth/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ authenticated: !!req.session?.auth });
});

app.put('/api/auth/pin', requireAuth, (req, res) => {
  const { currentPin, newPin } = req.body;
  if (!newPin || !/^\d{4}$/.test(newPin)) return res.status(400).json({ detail: 'invalid_pin_format' });
  if (currentPin !== db.getPin()) return res.status(401).json({ detail: 'invalid_current_pin' });
  db.setPin(newPin);
  res.json({ ok: true });
});

// ── Documentations ───────────────────────────────────────────────────────────
app.get('/api/docs', requireAuth, (req, res) => {
  res.json({ docs: db.listDocs() });
});

app.post('/api/docs', requireAuth, (req, res) => {
  const { name, title, url, description, color, icon } = req.body;
  if (!name?.trim() || !title?.trim()) return res.status(400).json({ detail: 'name_title_required' });
  const id = db.uuidv4();
  db.createDoc(id, name.trim(), title.trim(), url || '', description || '', color || '#3b82f6', icon || 'BookOpen');
  res.json({ id });
});

app.get('/api/docs/:id', requireAuth, (req, res) => {
  const doc = db.getDoc(req.params.id);
  if (!doc) return res.status(404).json({ detail: 'not_found' });
  const sections = db.listSections(req.params.id);
  const pages = db.listPages(req.params.id);
  res.json({ doc, sections, pages });
});

app.put('/api/docs/:id', requireAuth, (req, res) => {
  const { name, title, url, description, color, icon } = req.body;
  if (!name?.trim() || !title?.trim()) return res.status(400).json({ detail: 'name_title_required' });
  db.updateDoc(req.params.id, name.trim(), title.trim(), url || '', description || '', color || '#3b82f6', icon || 'BookOpen');
  res.json({ ok: true });
});

app.delete('/api/docs/:id', requireAuth, (req, res) => {
  db.deleteDoc(req.params.id);
  res.json({ ok: true });
});

// ── Sections ─────────────────────────────────────────────────────────────────
app.post('/api/docs/:docId/sections', requireAuth, (req, res) => {
  const { title, orderIndex, parentId } = req.body;
  if (!title?.trim()) return res.status(400).json({ detail: 'title_required' });
  const id = db.uuidv4();
  db.createSection(id, req.params.docId, title.trim(), orderIndex || 0, parentId || null);
  res.json({ id });
});

app.put('/api/sections/:id', requireAuth, (req, res) => {
  const { title } = req.body;
  if (!title?.trim()) return res.status(400).json({ detail: 'title_required' });
  db.updateSection(req.params.id, title.trim());
  res.json({ ok: true });
});

app.delete('/api/sections/:id', requireAuth, (req, res) => {
  db.deleteSection(req.params.id);
  res.json({ ok: true });
});

app.patch('/api/sections/:id/order', requireAuth, (req, res) => {
  db.reorderSection(req.params.id, req.body.orderIndex ?? 0);
  res.json({ ok: true });
});

// ── Pages ────────────────────────────────────────────────────────────────────
app.post('/api/docs/:docId/pages', requireAuth, (req, res) => {
  const { sectionId, title, content, orderIndex } = req.body;
  if (!title?.trim()) return res.status(400).json({ detail: 'title_required' });
  const id = db.uuidv4();
  db.createPage(id, req.params.docId, sectionId || null, title.trim(), content || '', orderIndex || 0);
  res.json({ id });
});

app.get('/api/pages/:id', requireAuth, (req, res) => {
  const page = db.getPage(req.params.id);
  if (!page) return res.status(404).json({ detail: 'not_found' });
  res.json({ page });
});

app.put('/api/pages/:id', requireAuth, (req, res) => {
  const { title, content } = req.body;
  if (!title?.trim()) return res.status(400).json({ detail: 'title_required' });
  db.updatePage(req.params.id, title.trim(), content ?? '');
  res.json({ ok: true });
});

app.delete('/api/pages/:id', requireAuth, (req, res) => {
  db.deletePage(req.params.id);
  res.json({ ok: true });
});

app.patch('/api/pages/:id/move', requireAuth, (req, res) => {
  db.movePage(req.params.id, req.body.sectionId || null, req.body.orderIndex ?? 0);
  res.json({ ok: true });
});

app.get('/api/docs/:docId/search', requireAuth, (req, res) => {
  const q = req.query.q || '';
  if (!q) return res.json({ results: [] });
  res.json({ results: db.searchPages(req.params.docId, q) });
});

// ── File Attachments ─────────────────────────────────────────────────────────
app.get('/api/pages/:pageId/attachments', requireAuth, (req, res) => {
  res.json({ attachments: db.listAttachments(req.params.pageId) });
});

app.post('/api/pages/:pageId/attachments', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'file_required' });
  const { originalname, mimetype, size, filename } = req.file;
  db.addAttachment(req.params.pageId, filename, originalname, mimetype, size);
  res.json({ ok: true, id: filename, originalName: originalname, mimeType: mimetype, size });
});

app.delete('/api/attachments/:id', requireAuth, (req, res) => {
  db.deleteAttachment(req.params.id);
  res.json({ ok: true });
});

app.use('/uploads', express.static(UPLOAD_DIR));

// ── Serve frontend ───────────────────────────────────────────────────────────
const dist = path.join(__dirname, 'frontend', 'dist');
if (require('fs').existsSync(dist)) {
  app.use(express.static(dist));
  app.get('/{*path}', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
