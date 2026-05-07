// ── Documentation Platform DB (Mock for Supabase migration) ────────────────
// This is a temporary mock DB until Supabase is connected
const { v4: uuidv4 } = require('uuid');

const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

// ── Mock data storage (in-memory, will be replaced by Supabase) ─────────────
let mockPin = '0000';
let mockDocs = [];
let mockSections = [];
let mockPages = [];
let mockAttachments = [];

// ── Settings (PIN) ───────────────────────────────────────────────────────────
const getPin  = () => mockPin;
const setPin  = (pin) => { mockPin = pin; };

// ── Documentations ───────────────────────────────────────────────────────────
const listDocs = () => mockDocs;

const createDoc = (id, name, title, url, description, color, icon) => {
  mockDocs.push({ id, name, title, url, description, color, icon, created_at: now() });
};

const getDoc = (id) => mockDocs.find(d => d.id === id);

const updateDoc = (id, name, title, url, description, color, icon) => {
  const doc = mockDocs.find(d => d.id === id);
  if (doc) {
    doc.name = name;
    doc.title = title;
    doc.url = url;
    doc.description = description;
    doc.color = color;
    doc.icon = icon;
  }
};

const deleteDoc = (id) => {
  mockDocs = mockDocs.filter(d => d.id !== id);
  mockSections = mockSections.filter(s => s.doc_id !== id);
  mockPages = mockPages.filter(p => p.doc_id !== id);
};

// ── Sections ─────────────────────────────────────────────────────────────────
const listSections = (docId) => mockSections.filter(s => s.doc_id === docId).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

const createSection = (id, docId, title, orderIndex, parentId) => {
  mockSections.push({ id, doc_id: docId, title, order_index: orderIndex || 0, parent_id: parentId, created_at: now() });
};

const updateSection = (id, title) => {
  const section = mockSections.find(s => s.id === id);
  if (section) section.title = title;
};

const deleteSection = (id) => {
  mockSections = mockSections.filter(s => s.id !== id);
};

const reorderSection = (id, orderIndex) => {
  const section = mockSections.find(s => s.id === id);
  if (section) section.order_index = orderIndex;
};

// ── Pages ────────────────────────────────────────────────────────────────────
const listPages = (docId) => mockPages.filter(p => p.doc_id === docId).sort((a, b) => {
  if (a.section_id !== b.section_id) return (a.section_id || '').localeCompare(b.section_id || '');
  return (a.order_index || 0) - (b.order_index || 0);
});

const createPage = (id, docId, sectionId, title, content, orderIndex) => {
  mockPages.push({ id, doc_id: docId, section_id: sectionId, title, content: content || '', order_index: orderIndex || 0, created_at: now(), updated_at: now() });
};

const getPage = (id) => mockPages.find(p => p.id === id);

const updatePage = (id, title, content) => {
  const page = mockPages.find(p => p.id === id);
  if (page) {
    page.title = title;
    page.content = content;
    page.updated_at = now();
  }
};

const deletePage = (id) => {
  mockPages = mockPages.filter(p => p.id !== id);
};

const movePage = (id, sectionId, orderIndex) => {
  const page = mockPages.find(p => p.id === id);
  if (page) {
    page.section_id = sectionId;
    page.order_index = orderIndex;
    page.updated_at = now();
  }
};

const searchPages = (docId, q) => {
  const lowerQ = q.toLowerCase();
  return mockPages.filter(p => 
    p.doc_id === docId && (p.title.toLowerCase().includes(lowerQ) || p.content.toLowerCase().includes(lowerQ))
  ).map(p => ({
    id: p.id,
    title: p.title,
    section_id: p.section_id,
    section_title: mockSections.find(s => s.id === p.section_id)?.title || null
  })).slice(0, 20);
};

// ── File Attachments ───────────────────────────────────────────────────────────
const listAttachments = (pageId) => mockAttachments.filter(a => a.page_id === pageId);

const addAttachment = (pageId, filename, originalName, mimeType, size) => {
  mockAttachments.push({ id: uuidv4(), page_id: pageId, filename, original_name: originalName, mime_type: mimeType, size, created_at: now() });
};

const deleteAttachment = (id) => {
  mockAttachments = mockAttachments.filter(a => a.id !== id);
};

module.exports = {
  uuidv4, now,
  getPin, setPin,
  listDocs, createDoc, getDoc, updateDoc, deleteDoc,
  listSections, createSection, updateSection, deleteSection, reorderSection,
  listPages, createPage, getPage, updatePage, deletePage, movePage, searchPages,
  listAttachments, addAttachment, deleteAttachment,
};
