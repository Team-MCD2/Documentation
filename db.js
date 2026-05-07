// ── Documentation Platform DB ────────────────────────────────────────────────
// Schema: settings | documentations | sections | pages
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'docs.db');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// ── Init schema ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
  INSERT OR IGNORE INTO settings VALUES ('pin', '0000');

  CREATE TABLE IF NOT EXISTS documentations (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    title       TEXT NOT NULL,
    url         TEXT DEFAULT '',
    description TEXT DEFAULT '',
    color       TEXT DEFAULT '#3b82f6',
    icon        TEXT DEFAULT 'BookOpen',
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sections (
    id          TEXT PRIMARY KEY,
    doc_id      TEXT NOT NULL REFERENCES documentations(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    parent_id   TEXT,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pages (
    id          TEXT PRIMARY KEY,
    doc_id      TEXT NOT NULL REFERENCES documentations(id) ON DELETE CASCADE,
    section_id  TEXT REFERENCES sections(id) ON DELETE SET NULL,
    title       TEXT NOT NULL,
    content     TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0,
    created_at  TEXT NOT NULL,
    updated_at  TEXT
  );

  CREATE TABLE IF NOT EXISTS file_attachments (
    id         TEXT PRIMARY KEY,
    page_id    TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    filename   TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type  TEXT NOT NULL,
    size       INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
`);

const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

// ── Settings (PIN) ───────────────────────────────────────────────────────────
const getPin  = () => db.prepare('SELECT value FROM settings WHERE key = ?').get('pin')?.value || '0000';
const setPin  = (pin) => db.prepare('INSERT OR REPLACE INTO settings VALUES (?, ?)').run('pin', pin);

// ── Documentations ───────────────────────────────────────────────────────────
const listDocs = () => db.prepare(`
  SELECT d.*, COUNT(DISTINCT p.id) as page_count, COUNT(DISTINCT s.id) as section_count
  FROM documentations d
  LEFT JOIN sections s ON s.doc_id = d.id
  LEFT JOIN pages p ON p.doc_id = d.id
  GROUP BY d.id ORDER BY d.created_at DESC
`).all();

const createDoc = (id, name, title, url, description, color, icon) =>
  db.prepare('INSERT INTO documentations VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, name, title, url, description, color, icon, now());

const getDoc = (id) => db.prepare('SELECT * FROM documentations WHERE id = ?').get(id);

const updateDoc = (id, name, title, url, description, color, icon) =>
  db.prepare('UPDATE documentations SET name=?, title=?, url=?, description=?, color=?, icon=? WHERE id=?').run(name, title, url, description, color, icon, id);

const deleteDoc = (id) => db.prepare('DELETE FROM documentations WHERE id = ?').run(id);

// ── Sections ─────────────────────────────────────────────────────────────────
const listSections = (docId) =>
  db.prepare('SELECT * FROM sections WHERE doc_id = ? ORDER BY order_index, created_at').all(docId);

const createSection = (id, docId, title, orderIndex, parentId) =>
  db.prepare('INSERT INTO sections VALUES (?, ?, ?, ?, ?, ?)').run(id, docId, title, orderIndex, parentId || null, now());

const updateSection = (id, title) =>
  db.prepare('UPDATE sections SET title=? WHERE id=?').run(title, id);

const deleteSection = (id) => db.prepare('DELETE FROM sections WHERE id = ?').run(id);

const reorderSection = (id, orderIndex) =>
  db.prepare('UPDATE sections SET order_index=? WHERE id=?').run(orderIndex, id);

// ── Pages ────────────────────────────────────────────────────────────────────
const listPages = (docId) =>
  db.prepare('SELECT id, doc_id, section_id, title, order_index, created_at, updated_at FROM pages WHERE doc_id = ? ORDER BY section_id, order_index, created_at').all(docId);

const createPage = (id, docId, sectionId, title, content, orderIndex) =>
  db.prepare('INSERT INTO pages (id, doc_id, section_id, title, content, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, docId, sectionId || null, title, content || '', orderIndex || 0, now(), now());

const getPage = (id) => db.prepare('SELECT * FROM pages WHERE id = ?').get(id);

const updatePage = (id, title, content) =>
  db.prepare('UPDATE pages SET title=?, content=?, updated_at=? WHERE id=?').run(title, content, now(), id);

const deletePage = (id) => db.prepare('DELETE FROM pages WHERE id = ?').run(id);

const movePage = (id, sectionId, orderIndex) =>
  db.prepare('UPDATE pages SET section_id=?, order_index=?, updated_at=? WHERE id=?').run(sectionId || null, orderIndex, now(), id);

const searchPages = (docId, q) =>
  db.prepare(`SELECT p.id, p.title, p.section_id, s.title as section_title
    FROM pages p LEFT JOIN sections s ON s.id = p.section_id
    WHERE p.doc_id = ? AND (p.title LIKE ? OR p.content LIKE ?) LIMIT 20`)
  .all(docId, `%${q}%`, `%${q}%`);

// ── File Attachments ───────────────────────────────────────────────────────────
const listAttachments = (pageId) => db.prepare('SELECT * FROM file_attachments WHERE page_id = ? ORDER BY created_at DESC').all(pageId);
const addAttachment = (pageId, filename, originalName, mimeType, size) => {
  db.prepare('INSERT INTO file_attachments (id, page_id, filename, original_name, mime_type, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(uuidv4(), pageId, filename, originalName, mimeType, size, now());
};
const deleteAttachment = (id) => {
  const a = db.prepare('SELECT filename FROM file_attachments WHERE id = ?').get(id);
  if (a) {
    const filePath = path.join(DATA_DIR, 'uploads', a.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare('DELETE FROM file_attachments WHERE id = ?').run(id);
  }
};

module.exports = {
  uuidv4, now,
  getPin, setPin,
  listDocs, createDoc, getDoc, updateDoc, deleteDoc,
  listSections, createSection, updateSection, deleteSection, reorderSection,
  listPages, createPage, getPage, updatePage, deletePage, movePage, searchPages,
  listAttachments, addAttachment, deleteAttachment,
};
