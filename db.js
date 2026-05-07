// ── Documentation Platform DB (Supabase) ──────────────────────────────────
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// ── Initialize Supabase Client ───────────────────────────────────────────────
let supabase = null;

const initDb = async () => {
  if (supabase) return supabase;
  
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }
  
  supabase = createClient(url, serviceKey);
  return supabase;
};

const now = () => new Date().toISOString();

// ── Settings (PIN) ───────────────────────────────────────────────────────────
const getPin = async () => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'pin')
      .single();
    
    if (error) throw error;
    return data?.value || '0000';
  } catch (err) {
    console.error('Error getting PIN:', err);
    return '0000';
  }
};

const setPin = async (pin) => {
  try {
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'pin', value: pin });
    if (error) throw error;
  } catch (err) {
    console.error('Error setting PIN:', err);
  }
};

// ── Documentations ───────────────────────────────────────────────────────────
const listDocs = async () => {
  try {
    const { data, error } = await supabase
      .from('docs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error listing docs:', err);
    return [];
  }
};

const createDoc = async (id, name, title, url, description, color, icon) => {
  try {
    const { error } = await supabase
      .from('docs')
      .insert([{ id, name, title, url, description, color, icon }]);
    if (error) throw error;
  } catch (err) {
    console.error('Error creating doc:', err);
  }
};

const getDoc = async (id) => {
  try {
    const { data, error } = await supabase
      .from('docs')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error getting doc:', err);
    return null;
  }
};

const updateDoc = async (id, name, title, url, description, color, icon) => {
  try {
    const { error } = await supabase
      .from('docs')
      .update({ name, title, url, description, color, icon })
      .eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error('Error updating doc:', err);
  }
};

const deleteDoc = async (id) => {
  try {
    const { error } = await supabase
      .from('docs')
      .delete()
      .eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error('Error deleting doc:', err);
  }
};

// ── Sections ─────────────────────────────────────────────────────────────────
const listSections = async (docId) => {
  try {
    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .eq('doc_id', docId)
      .order('order_index', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error listing sections:', err);
    return [];
  }
};

const createSection = async (id, docId, title, orderIndex, parentId) => {
  try {
    const { error } = await supabase
      .from('sections')
      .insert([{ id, doc_id: docId, title, order_index: orderIndex, parent_id: parentId }]);
    if (error) throw error;
  } catch (err) {
    console.error('Error creating section:', err);
  }
};

const updateSection = async (id, title) => {
  try {
    const { error } = await supabase
      .from('sections')
      .update({ title })
      .eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error('Error updating section:', err);
  }
};

const deleteSection = async (id) => {
  try {
    const { error } = await supabase
      .from('sections')
      .delete()
      .eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error('Error deleting section:', err);
  }
};

const reorderSection = async (id, orderIndex) => {
  try {
    const { error } = await supabase
      .from('sections')
      .update({ order_index: orderIndex })
      .eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error('Error reordering section:', err);
  }
};

// ── Pages ────────────────────────────────────────────────────────────────────
const listPages = async (docId) => {
  try {
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('doc_id', docId)
      .order('order_index', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error listing pages:', err);
    return [];
  }
};

const createPage = async (id, docId, sectionId, title, content, orderIndex) => {
  try {
    const { error } = await supabase
      .from('pages')
      .insert([{ id, doc_id: docId, section_id: sectionId, title, content, order_index: orderIndex }]);
    if (error) throw error;
  } catch (err) {
    console.error('Error creating page:', err);
  }
};

const getPage = async (id) => {
  try {
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error getting page:', err);
    return null;
  }
};

const updatePage = async (id, title, content) => {
  try {
    const { error } = await supabase
      .from('pages')
      .update({ title, content, updated_at: now() })
      .eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error('Error updating page:', err);
  }
};

const deletePage = async (id) => {
  try {
    const { error } = await supabase
      .from('pages')
      .delete()
      .eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error('Error deleting page:', err);
  }
};

const movePage = async (id, sectionId, orderIndex) => {
  try {
    const { error } = await supabase
      .from('pages')
      .update({ section_id: sectionId, order_index: orderIndex, updated_at: now() })
      .eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error('Error moving page:', err);
  }
};

const searchPages = async (docId, q) => {
  try {
    const { data, error } = await supabase
      .from('pages')
      .select('id, title, section_id, sections(title)')
      .eq('doc_id', docId)
      .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
      .limit(20);
    
    if (error) throw error;
    return data.map(p => ({
      id: p.id,
      title: p.title,
      section_id: p.section_id,
      section_title: p.sections?.title || null
    }));
  } catch (err) {
    console.error('Error searching pages:', err);
    return [];
  }
};

// ── File Attachments ───────────────────────────────────────────────────────────
const listAttachments = async (pageId) => {
  try {
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('page_id', pageId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error listing attachments:', err);
    return [];
  }
};

const addAttachment = async (pageId, filename, originalName, mimeType, size) => {
  try {
    const { error } = await supabase
      .from('attachments')
      .insert([{ id: uuidv4(), page_id: pageId, filename, original_name: originalName, mime_type: mimeType, size }]);
    if (error) throw error;
  } catch (err) {
    console.error('Error adding attachment:', err);
  }
};

const deleteAttachment = async (id) => {
  try {
    const { error } = await supabase
      .from('attachments')
      .delete()
      .eq('id', id);
    if (error) throw error;
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
