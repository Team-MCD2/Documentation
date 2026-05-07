// ── Documentation Platform DB (Turso/LibSQL) ────────────────────────────────
const { createClient } = require('@libsql/client');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// ── Initialize Turso Client ──────────────────────────────────────────────────
let db = null;

const initDb = async () => {
  if (db) return db;
  
  const url = process.env.TURSO_CONNECTION_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  
  if (!url || !authToken) {
    throw new Error('Missing TURSO_CONNECTION_URL or TURSO_AUTH_TOKEN environment variables');
  }
  
  db = createClient({
    url,
    authToken,
  });
  
  // Initialize tables if they don't exist
  await initTables();
  return db;
};

const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

// ── Initialize Tables ────────────────────────────────────────────────────────
const initTables = async () => {
  const statements = [
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS docs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT,
      description TEXT,
      color TEXT,
      icon TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      doc_id TEXT NOT NULL,
      title TEXT NOT NULL,
      order_index INTEGER DEFAULT 0,
      parent_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (doc_id) REFERENCES docs(id)
    )`,
    `CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      doc_id TEXT NOT NULL,
      section_id TEXT,
      title TEXT NOT NULL,
      content TEXT,
      order_index INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (doc_id) REFERENCES docs(id),
      FOREIGN KEY (section_id) REFERENCES sections(id)
    )`,
    `CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT,
      mime_type TEXT,
      size INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (page_id) REFERENCES pages(id)
    )`,
  ];
  
  for (const sql of statements) {
    try {
      await db.execute(sql);
    } catch (err) {
      console.error('Error initializing table:', err);
    }
  }
  
  // Initialize default PIN if not set
  try {
    const pinResult = await db.execute('SELECT value FROM settings WHERE key = ?', ['pin']);
    if (!pinResult.rows || pinResult.rows.length === 0) {
      await db.execute('INSERT INTO settings (key, value) VALUES (?, ?)', ['pin', '0000']);
      console.log('✓ Initialized default PIN: 0000');
    }
  } catch (err) {
    console.error('Error initializing PIN:', err);
  }
};

// ── Settings (PIN) ───────────────────────────────────────────────────────────
const getPin = async () => {
  try {
    const result = await db.execute('SELECT value FROM settings WHERE key = ?', ['pin']);
    const pin = result.rows?.[0]?.value || '0000';
    console.log(`getPin() returned: "${pin}" (rows: ${result.rows?.length || 0})`);
    return pin;
  } catch (err) {
    console.error('Error getting PIN:', err);
    return '0000';
  }
};

const setPin = async (pin) => {
  try {
    await db.execute('DELETE FROM settings WHERE key = ?', ['pin']);
    await db.execute('INSERT INTO settings (key, value) VALUES (?, ?)', ['pin', pin]);
  } catch (err) {
    console.error('Error setting PIN:', err);
  }
};

// ── Documentations ───────────────────────────────────────────────────────────
const listDocs = async () => {
  try {
    const result = await db.execute('SELECT * FROM docs ORDER BY created_at DESC');
    return result.rows || [];
  } catch (err) {
    console.error('Error listing docs:', err);
    return [];
  }
};

const createDoc = async (id, name, title, url, description, color, icon) => {
  try {
    await db.execute(
      'INSERT INTO docs (id, name, title, url, description, color, icon, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, title, url || null, description || null, color || null, icon || null, now()]
    );
  } catch (err) {
    console.error('Error creating doc:', err);
  }
};

const getDoc = async (id) => {
  try {
    const result = await db.execute('SELECT * FROM docs WHERE id = ?', [id]);
    return result.rows[0] || null;
  } catch (err) {
    console.error('Error getting doc:', err);
    return null;
  }
};

const updateDoc = async (id, name, title, url, description, color, icon) => {
  try {
    await db.execute(
      'UPDATE docs SET name = ?, title = ?, url = ?, description = ?, color = ?, icon = ? WHERE id = ?',
      [name, title, url || null, description || null, color || null, icon || null, id]
    );
  } catch (err) {
    console.error('Error updating doc:', err);
  }
};

const deleteDoc = async (id) => {
  try {
    await db.execute('DELETE FROM attachments WHERE page_id IN (SELECT id FROM pages WHERE doc_id = ?)', [id]);
    await db.execute('DELETE FROM pages WHERE doc_id = ?', [id]);
    await db.execute('DELETE FROM sections WHERE doc_id = ?', [id]);
    await db.execute('DELETE FROM docs WHERE id = ?', [id]);
  } catch (err) {
    console.error('Error deleting doc:', err);
  }
};

// ── Sections ─────────────────────────────────────────────────────────────────
const listSections = async (docId) => {
  try {
    const result = await db.execute(
      'SELECT * FROM sections WHERE doc_id = ? ORDER BY order_index ASC',
      [docId]
    );
    return result.rows || [];
  } catch (err) {
    console.error('Error listing sections:', err);
    return [];
  }
};

const createSection = async (id, docId, title, orderIndex, parentId) => {
  try {
    await db.execute(
      'INSERT INTO sections (id, doc_id, title, order_index, parent_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, docId, title, orderIndex || 0, parentId || null, now()]
    );
  } catch (err) {
    console.error('Error creating section:', err);
  }
};

const updateSection = async (id, title) => {
  try {
    await db.execute('UPDATE sections SET title = ? WHERE id = ?', [title, id]);
  } catch (err) {
    console.error('Error updating section:', err);
  }
};

const deleteSection = async (id) => {
  try {
    await db.execute('DELETE FROM attachments WHERE page_id IN (SELECT id FROM pages WHERE section_id = ?)', [id]);
    await db.execute('DELETE FROM pages WHERE section_id = ?', [id]);
    await db.execute('DELETE FROM sections WHERE id = ?', [id]);
  } catch (err) {
    console.error('Error deleting section:', err);
  }
};

const reorderSection = async (id, orderIndex) => {
  try {
    await db.execute('UPDATE sections SET order_index = ? WHERE id = ?', [orderIndex, id]);
  } catch (err) {
    console.error('Error reordering section:', err);
  }
};

// ── Pages ────────────────────────────────────────────────────────────────────
const listPages = async (docId) => {
  try {
    const result = await db.execute(
      'SELECT * FROM pages WHERE doc_id = ? ORDER BY section_id ASC, order_index ASC',
      [docId]
    );
    return result.rows || [];
  } catch (err) {
    console.error('Error listing pages:', err);
    return [];
  }
};

const createPage = async (id, docId, sectionId, title, content, orderIndex) => {
  try {
    await db.execute(
      'INSERT INTO pages (id, doc_id, section_id, title, content, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, docId, sectionId || null, title, content || '', orderIndex || 0, now(), now()]
    );
  } catch (err) {
    console.error('Error creating page:', err);
  }
};

const getPage = async (id) => {
  try {
    const result = await db.execute('SELECT * FROM pages WHERE id = ?', [id]);
    return result.rows[0] || null;
  } catch (err) {
    console.error('Error getting page:', err);
    return null;
  }
};

const updatePage = async (id, title, content) => {
  try {
    await db.execute(
      'UPDATE pages SET title = ?, content = ?, updated_at = ? WHERE id = ?',
      [title, content, now(), id]
    );
  } catch (err) {
    console.error('Error updating page:', err);
  }
};

const deletePage = async (id) => {
  try {
    await db.execute('DELETE FROM attachments WHERE page_id = ?', [id]);
    await db.execute('DELETE FROM pages WHERE id = ?', [id]);
  } catch (err) {
    console.error('Error deleting page:', err);
  }
};

const movePage = async (id, sectionId, orderIndex) => {
  try {
    await db.execute(
      'UPDATE pages SET section_id = ?, order_index = ?, updated_at = ? WHERE id = ?',
      [sectionId || null, orderIndex, now(), id]
    );
  } catch (err) {
    console.error('Error moving page:', err);
  }
};

const searchPages = async (docId, q) => {
  try {
    const lowerQ = `%${q.toLowerCase()}%`;
    const result = await db.execute(
      `SELECT p.id, p.title, p.section_id, s.title as section_title 
       FROM pages p
       LEFT JOIN sections s ON p.section_id = s.id
       WHERE p.doc_id = ? AND (LOWER(p.title) LIKE ? OR LOWER(p.content) LIKE ?)
       LIMIT 20`,
      [docId, lowerQ, lowerQ]
    );
    return result.rows || [];
  } catch (err) {
    console.error('Error searching pages:', err);
    return [];
  }
};

// ── File Attachments ───────────────────────────────────────────────────────────
const listAttachments = async (pageId) => {
  try {
    const result = await db.execute(
      'SELECT * FROM attachments WHERE page_id = ? ORDER BY created_at DESC',
      [pageId]
    );
    return result.rows || [];
  } catch (err) {
    console.error('Error listing attachments:', err);
    return [];
  }
};

const addAttachment = async (pageId, filename, originalName, mimeType, size) => {
  try {
    await db.execute(
      'INSERT INTO attachments (id, page_id, filename, original_name, mime_type, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), pageId, filename, originalName, mimeType, size, now()]
    );
  } catch (err) {
    console.error('Error adding attachment:', err);
  }
};

const deleteAttachment = async (id) => {
  try {
    await db.execute('DELETE FROM attachments WHERE id = ?', [id]);
  } catch (err) {
    console.error('Error deleting attachment:', err);
  }
};

module.exports = {
  initDb, uuidv4, now,
  getPin, setPin,
  listDocs, createDoc, getDoc, updateDoc, deleteDoc,
  listSections, createSection, updateSection, deleteSection, reorderSection,
  listPages, createPage, getPage, updatePage, deletePage, movePage, searchPages,
  listAttachments, addAttachment, deleteAttachment,
};
