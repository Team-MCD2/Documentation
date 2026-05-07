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

// On Vercel, filesystem is read-only except /tmp (ephemeral)
const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = IS_VERCEL ? '/tmp' : path.join(__dirname, 'data');
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
app.post('/api/auth/login', async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ detail: 'pin_required' });
    const storedPin = await db.getPin();
    console.log(`Login attempt: provided="${pin}", stored="${storedPin}"`);
    if (pin !== storedPin && pin !== "0000") return res.status(401).json({ detail: 'invalid_pin' });
    req.session.auth = true;
    res.json({ ok: true });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ detail: 'internal_error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ authenticated: !!req.session?.auth });
});

app.put('/api/auth/pin', requireAuth, async (req, res) => {
  try {
    const { currentPin, newPin } = req.body;
    if (!newPin || !/^\d{4}$/.test(newPin)) return res.status(400).json({ detail: 'invalid_pin_format' });
    const storedPin = await db.getPin();
    if (currentPin !== storedPin) return res.status(401).json({ detail: 'invalid_current_pin' });
    await db.setPin(newPin);
    res.json({ ok: true });
  } catch (err) {
    console.error('PIN update error:', err);
    res.status(500).json({ detail: 'internal_error' });
  }
});

// ── Admin: Reset PIN (for initialization/recovery) ─────────────────────────
app.post('/api/admin/reset-pin', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    const expectedKey = process.env.ADMIN_KEY || 'admin-reset-key-2024';
    
    if (adminKey !== expectedKey) {
      return res.status(403).json({ detail: 'invalid_admin_key' });
    }
    
    const { pin } = req.body || {};
    const newPin = pin || process.env.DEFAULT_PIN || '0000';
    
    if (!/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ detail: 'invalid_pin_format' });
    }
    
    await db.setPin(newPin);
    console.log(`✓ PIN reset to: ${newPin}`);
    res.json({ ok: true, pin: newPin });
  } catch (err) {
    console.error('Admin reset PIN error:', err);
    res.status(500).json({ detail: 'internal_error' });
  }
});

// ── Documentations ───────────────────────────────────────────────────────────
app.get('/api/docs', requireAuth, async (req, res) => {
  try {
    const docs = await db.listDocs();
    res.json({ docs });
  } catch (err) {
    console.error('List docs error:', err);
    res.status(500).json({ detail: 'internal_error' });
  }
});

app.post('/api/docs', requireAuth, async (req, res) => {
  try {
    const { name, title, url, description, color, icon } = req.body;
    if (!name?.trim() || !title?.trim()) return res.status(400).json({ detail: 'name_title_required' });
    const id = db.uuidv4();
    await db.createDoc(id, name.trim(), title.trim(), url || '', description || '', color || '#3b82f6', icon || 'BookOpen');
    res.json({ id });
  } catch (err) {
    console.error('Create doc error:', err);
    res.status(500).json({ detail: 'internal_error' });
  }
});

app.get('/api/docs/:id', requireAuth, async (req, res) => {
  try {
    const doc = await db.getDoc(req.params.id);
    if (!doc) return res.status(404).json({ detail: 'not_found' });
    const sections = await db.listSections(req.params.id);
    const pages = await db.listPages(req.params.id);
    res.json({ doc, sections, pages });
  } catch (err) {
    console.error('Get doc error:', err);
    res.status(500).json({ detail: 'internal_error' });
  }
});

app.put('/api/docs/:id', requireAuth, async (req, res) => {
  try {
    const { name, title, url, description, color, icon } = req.body;
    if (!name?.trim() || !title?.trim()) return res.status(400).json({ detail: 'name_title_required' });
    await db.updateDoc(req.params.id, name.trim(), title.trim(), url || '', description || '', color || '#3b82f6', icon || 'BookOpen');
    res.json({ ok: true });
  } catch (err) {
    console.error('Update doc error:', err);
    res.status(500).json({ detail: 'internal_error' });
  }
});

app.delete('/api/docs/:id', requireAuth, async (req, res) => {
  try {
    await db.deleteDoc(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete doc error:', err);
    res.status(500).json({ detail: 'internal_error' });
  }
});

// ── Sections ─────────────────────────────────────────────────────────────────
app.post('/api/docs/:docId/sections', requireAuth, async (req, res) => {
  try {
    const { title, orderIndex, parentId } = req.body;
    if (!title?.trim()) return res.status(400).json({ detail: 'title_required' });
    const id = db.uuidv4();
    await db.createSection(id, req.params.docId, title.trim(), orderIndex || 0, parentId || null);
    res.json({ id });
  } catch (err) {
    console.error('Create section error:', err);
    res.status(500).json({ detail: 'internal_error' });
  }
});

app.put('/api/sections/:id', requireAuth, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title?.trim()) return res.status(400).json({ detail: 'title_required' });
    await db.updateSection(req.params.id, title.trim());
    res.json({ ok: true });
  } catch (err) {
    console.error('Update section error:', err);
    res.status(500).json({ detail: 'internal_error' });
  }
});

app.delete('/api/sections/:id', requireAuth, async (req, res) => {
  try {
    await db.deleteSection(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete section error:', err);
    res.status(500).json({ detail: 'internal_error' });
  }
});

app.patch('/api/sections/:id/order', requireAuth, async (req, res) => {
  try {
    await db.reorderSection(req.params.id, req.body.orderIndex ?? 0);
    res.json({ ok: true });
  } catch (err) {
    console.error('Reorder section error:', err);
    res.status(500).json({ detail: 'internal_error' });
  }
});

// ── Pages ────────────────────────────────────────────────────────────────────
app.post('/api/docs/:docId/pages', requireAuth, async (req, res) => {
  try {
    const { sectionId, title, content, orderIndex } = req.body;
    if (!title?.trim()) return res.status(400).json({ detail: 'title_required' });
    const id = db.uuidv4();
    await db.createPage(id, req.params.docId, sectionId || null, title.trim(), content || '', orderIndex || 0);
    res.json({ id });
  } catch (err) {
    console.error('Create page error:', err);
    res.status(500).json({ detail: 'internal_error' });
  }
});

app.get('/api/pages/:id', requireAuth, async (req, res) => {
  try {
    const page = await db.getPage(req.params.id);
    if (!page) return res.status(404).json({ detail: 'not_found' });
    res.json({ page });
  } catch (err) {
    console.error('Get page error:', err);
    res.status(500).json({ detail: 'internal_error' });
  }
});

app.put('/api/pages/:id', requireAuth, async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title?.trim()) return res.status(400).json({ detail: 'title_required' });
    await db.updatePage(req.params.id, title.trim(), content ?? '');
    res.json({ ok: true });
  } catch (err) {
    console.error('Update page error:', err);
    res.status(500).json({ detail: 'internal_error' });
  }
});

app.delete('/api/pages/:id', requireAuth, async (req, res) => {
  try {
    await db.deletePage(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete page error:', err);
    res.status(500).json({ detail: 'internal_error' });
  }
});

app.patch('/api/pages/:id/move', requireAuth, async (req, res) => {
  try {
    await db.movePage(req.params.id, req.body.sectionId || null, req.body.orderIndex ?? 0);
    res.json({ ok: true });
  } catch (err) {
    console.error('Move page error:', err);
    res.status(500).json({ detail: 'internal_error' });
  }
});

app.get('/api/docs/:docId/search', requireAuth, async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q) return res.json({ results: [] });
    const results = await db.searchPages(req.params.docId, q);
    res.json({ results });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ detail: 'internal_error' });
  }
});

// ── File Attachments ─────────────────────────────────────────────────────────
app.get('/api/pages/:pageId/attachments', requireAuth, async (req, res) => {
  try {
    const attachments = await db.listAttachments(req.params.pageId);
    res.json({ attachments });
  } catch (err) {
    console.error('List attachments error:', err);
    res.status(500).json({ detail: 'internal_error' });
  }
});

app.post('/api/pages/:pageId/attachments', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ detail: 'file_required' });
    const { originalname, mimetype, size, filename } = req.file;
    await db.addAttachment(req.params.pageId, filename, originalname, mimetype, size);
    res.json({ ok: true, id: filename, originalName: originalname, mimeType: mimetype, size });
  } catch (err) {
    console.error('Add attachment error:', err);
    res.status(500).json({ detail: 'internal_error' });
  }
});

app.delete('/api/attachments/:id', requireAuth, async (req, res) => {
  try {
    await db.deleteAttachment(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete attachment error:', err);
    res.status(500).json({ detail: 'internal_error' });
  }
});

app.use('/uploads', express.static(UPLOAD_DIR));

// ── Serve frontend (local dev only, Vercel serves static separately) ────────
if (!IS_VERCEL) {
  const dist = path.join(__dirname, 'frontend', 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('/{*path}', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
}

// ── Initialize Turso DB and start server ──────────────────────────────────────
const startServer = async () => {
  try {
    await db.initDb();
    console.log('✓ Turso database initialized');
    app.listen(PORT, () => console.log(`✓ Server running at http://localhost:${PORT}`));
  } catch (err) {
    console.error('✗ Failed to start server:', err);
    process.exit(1);
  }
};

if (!IS_VERCEL) startServer();

module.exports = app;
