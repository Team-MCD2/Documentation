import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ExternalLink, Plus, Trash2, Pencil, ChevronRight, ChevronDown,
  Menu, X, Save, Eye, FileText, Layers, Check, GripVertical, Moon, Sun, Paperclip
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import * as api from "../api";
import { useApp } from "../AppContext";

// ── Markdown toolbar helpers ────────────────────────────────────────────────
function wrap(ta: HTMLTextAreaElement, b: string, a: string, ph: string) {
  const s = ta.selectionStart, e = ta.selectionEnd;
  const sel = ta.value.slice(s, e) || ph;
  const v = ta.value.slice(0, s) + b + sel + a + ta.value.slice(e);
  return { value: v, cursor: s + b.length + sel.length + a.length };
}
function linePrefix(ta: HTMLTextAreaElement, prefix: string) {
  const s = ta.selectionStart;
  const ls = ta.value.lastIndexOf("\n", s - 1) + 1;
  const v = ta.value.slice(0, ls) + prefix + ta.value.slice(ls);
  return { value: v, cursor: ls + prefix.length };
}

// ── Inline Add Input ─────────────────────────────────────────────────────────
function InlineAdd({ onConfirm, onCancel, placeholder }: { onConfirm: (v: string) => void; onCancel: () => void; placeholder: string }) {
  const [val, setVal] = useState("");
  return (
    <div className="inline-add-wrap">
      <input autoFocus value={val} onChange={e => setVal(e.target.value)} placeholder={placeholder}
        onKeyDown={e => { if (e.key === "Enter" && val.trim()) onConfirm(val.trim()); if (e.key === "Escape") onCancel(); }} />
      <button className="ia-confirm btn-icon" onClick={() => val.trim() && onConfirm(val.trim())}><Check size={13} /></button>
      <button className="ia-cancel btn-icon" onClick={onCancel}><X size={13} /></button>
    </div>
  );
}

// ── DocViewer ────────────────────────────────────────────────────────────────
export default function DocViewer() {
  const { docId, pageId } = useParams<{ docId: string; pageId?: string }>();
  const nav = useNavigate();
  const { theme, toggleTheme } = useApp();

  const [doc, setDoc] = useState<api.Doc | null>(null);
  const [sections, setSections] = useState<api.Section[]>([]);
  const [pages, setPages] = useState<api.Page[]>([]);
  const [activePage, setActivePage] = useState<api.Page | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchRes, setSearchRes] = useState<api.SearchResult[]>([]);
  // inline add
  const [addingSection, setAddingSection] = useState(false);
  const [addingPageForSec, setAddingPageForSec] = useState<string | "__none__" | null>(null);
  // inline rename
  const [renameSec, setRenameSec] = useState<string | null>(null);
  const [renameSecVal, setRenameSecVal] = useState("");
  const [renamePage, setRenamePage] = useState<string | null>(null);
  const [renamePageVal, setRenamePageVal] = useState("");
  // drag & drop
  const [dragSec, setDragSec] = useState<string | null>(null);
  const [dragOverSec, setDragOverSec] = useState<string | null>(null);
  const [dragPage, setDragPage] = useState<string | null>(null);
  const [dragOverPage, setDragOverPage] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  // file attachments
  const [attachments, setAttachments] = useState<api.Attachment[]>([]);
  const [showAttachments, setShowAttachments] = useState(false);

  const isDirty = editContent !== savedContent || (activePage && editTitle !== activePage.title);

  // Handlers pour fichiers joints
  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !activePage) return;
    await api.uploadAttachment(activePage.id, e.target.files[0]);
    const a = await api.listAttachments(activePage.id);
    setAttachments(a.attachments);
  };
  const delAttachment = async (id: string) => {
    await api.deleteAttachment(id);
    setAttachments(attachments.filter(a => a.id !== id));
  };

  const loadDoc = useCallback(async () => {
    if (!docId) return;
    const r = await api.getDoc(docId);
    setDoc(r.doc); setSections(r.sections); setPages(r.pages);
    return r;
  }, [docId]);

  useEffect(() => {
    loadDoc().then(r => {
      if (r && !pageId && r.pages.length > 0) {
        nav(`/docs/${docId}/${r.pages[0].id}`, { replace: true });
      }
    });
  }, [docId]);

  useEffect(() => {
    if (!pageId) return;
    api.getPage(pageId).then(r => {
      setActivePage(r.page); setEditTitle(r.page.title);
      setEditContent(r.page.content || ""); setSavedContent(r.page.content || "");
      setEditing(false); setPreview(false);
      // Load attachments
      api.listAttachments(pageId).then(a => setAttachments(a.attachments)).catch(() => {});
    }).catch(() => {});
  }, [pageId]);

  useEffect(() => {
    if (!search.trim() || !docId) { setSearchRes([]); return; }
    const t = setTimeout(() => api.searchInDoc(docId, search).then(r => setSearchRes(r.results)).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [search, docId]);

  const handleSave = async (silent = false) => {
    if (!activePage || !docId) return;
    setSaving(true);
    try {
      await api.updatePage(activePage.id, editTitle, editContent);
      setSavedContent(editContent);
      setActivePage(p => p ? { ...p, title: editTitle } : p);
      setPages(ps => ps.map(p => p.id === activePage.id ? { ...p, title: editTitle } : p));
      if (!silent) { setEditing(false); setPreview(false); }
    } catch {} finally { setSaving(false); }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); if (editing) handleSave(true); }
      if (e.key === "Escape" && editing) { setEditing(false); setEditContent(savedContent); setEditTitle(activePage?.title || ""); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [editing, editContent, savedContent, activePage]);

  const toolbar = (type: string) => {
    const ta = taRef.current; if (!ta) return;
    let r: { value: string; cursor: number };
    switch (type) {
      case "bold": r = wrap(ta, "**", "**", "texte"); break;
      case "italic": r = wrap(ta, "_", "_", "texte"); break;
      case "code": r = wrap(ta, "`", "`", "code"); break;
      case "h1": r = linePrefix(ta, "# "); break;
      case "h2": r = linePrefix(ta, "## "); break;
      case "list": r = linePrefix(ta, "- "); break;
      case "link": r = wrap(ta, "[", "](url)", "lien"); break;
      default: return;
    }
    setEditContent(r.value);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(r.cursor, r.cursor); }, 0);
  };

  // ── CRUD helpers ───────────────────────────────────────────────────────
  const confirmAddSection = async (title: string) => {
    if (!docId) return;
    setAddingSection(false);
    await api.createSection(docId, { title, orderIndex: sections.length });
    loadDoc();
  };

  const confirmAddPage = async (sectionId: string | null, title: string) => {
    if (!docId) return;
    setAddingPageForSec(null);
    const r = await api.createPage(docId, { title, sectionId: sectionId || undefined, orderIndex: pages.filter(p => p.section_id === sectionId).length });
    await loadDoc();
    nav(`/docs/${docId}/${r.id}`);
  };

  const delSection = async (id: string) => {
    if (!confirm("Supprimer cette section et ses pages ?")) return;
    await api.deleteSection(id); loadDoc();
  };

  const delPage = async (id: string) => {
    if (!confirm("Supprimer cette page ?")) return;
    await api.deletePage(id);
    const r = await loadDoc();
    if (r && pageId === id) {
      const remaining = r.pages.filter(p => p.id !== id);
      remaining.length > 0 ? nav(`/docs/${docId}/${remaining[0].id}`) : nav(`/docs/${docId}`);
    }
  };

  const saveRename = async (type: "section" | "page") => {
    if (type === "section" && renameSec) { await api.updateSection(renameSec, renameSecVal); setRenameSec(null); loadDoc(); }
    if (type === "page" && renamePage) {
      await api.updatePage(renamePage, renamePageVal, pages.find(p => p.id === renamePage)?.content || "");
      setRenamePage(null); loadDoc();
      if (activePage?.id === renamePage) setActivePage(p => p ? { ...p, title: renamePageVal } : p);
    }
  };

  const pagesForSection = (sId: string | null) => pages.filter(p => p.section_id === sId).sort((a, b) => a.order_index - b.order_index);

  // ── Drag & Drop — sections ────────────────────────────────────────────
  const handleSecDrop = (targetId: string) => {
    if (!dragSec || dragSec === targetId) return;
    const from = sections.findIndex(s => s.id === dragSec);
    const to   = sections.findIndex(s => s.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...sections];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setSections(next);
    next.forEach((s, i) => api.reorderSection(s.id, i).catch(() => {}));
    setDragSec(null); setDragOverSec(null);
  };

  // ── Drag & Drop — pages ───────────────────────────────────────────────
  const handlePageDrop = (targetId: string, inSectionId: string | null) => {
    if (!dragPage || dragPage === targetId) return;
    const sPages = pagesForSection(inSectionId);
    const from = sPages.findIndex(p => p.id === dragPage);
    const to   = sPages.findIndex(p => p.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...sPages];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setPages(ps => {
      const other = ps.filter(p => p.section_id !== inSectionId);
      return [...other, ...next.map((p, i) => ({ ...p, order_index: i }))];
    });
    next.forEach((p, i) => api.movePage(p.id, inSectionId, i).catch(() => {}));
    setDragPage(null); setDragOverPage(null);
  };

  // ── Sidebar ──────────────────────────────────────────────────────────────
  const renderPageItem = (p: api.Page, sectionId: string | null) => (
    renamePage === p.id
      ? <input key={p.id} autoFocus className="inline-input" value={renamePageVal}
          onChange={e => setRenamePageVal(e.target.value)}
          onBlur={() => saveRename("page")}
          onKeyDown={e => { if (e.key === "Enter") saveRename("page"); if (e.key === "Escape") setRenamePage(null); }} />
      : <div key={p.id}
          draggable
          onDragStart={e => { e.stopPropagation(); setDragPage(p.id); }}
          onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverPage(p.id); }}
          onDragLeave={() => setDragOverPage(null)}
          onDrop={e => { e.preventDefault(); e.stopPropagation(); handlePageDrop(p.id, sectionId); }}
          onDragEnd={() => { setDragPage(null); setDragOverPage(null); }}
          className={`nav-page${pageId === p.id ? " active" : ""}${dragPage === p.id ? " dragging" : ""}${dragOverPage === p.id && dragPage !== p.id ? " drag-over-top" : ""}`}
          onClick={() => { nav(`/docs/${docId}/${p.id}`); setMobileOpen(false); }}
          onDoubleClick={() => { setRenamePage(p.id); setRenamePageVal(p.title); }}
          style={{ cursor: "pointer" }}
        >
          <span className="drag-handle" title="Glisser pour réordonner"><GripVertical size={12} /></span>
          <span className="page-title-text" title="Double-clic pour renommer">{p.title}</span>
          <span className="page-actions">
            <button className="btn-icon" style={{ padding: "0.1rem" }}
              onClick={e => { e.stopPropagation(); setRenamePage(p.id); setRenamePageVal(p.title); }}
              title="Renommer (double-clic)"><Pencil size={11} /></button>
            <button className="btn-icon" style={{ padding: "0.1rem", color: "var(--danger)" }}
              onClick={e => { e.stopPropagation(); delPage(p.id); }}
              title="Supprimer"><Trash2 size={11} /></button>
          </span>
        </div>
  );

  const Sidebar = (
    <div className={`doc-sidebar${mobileOpen ? " mobile-open" : ""}`}>
      <div className="sidebar-head">
        <button className="btn-icon sidebar-back" onClick={() => nav("/")} title="Retour à l'accueil"><ArrowLeft size={16} /></button>
        <span className="sidebar-doc-name">{doc?.name}</span>
        {doc?.url && <a href={doc.url} target="_blank" rel="noreferrer" className="btn-icon sidebar-ext" title="Ouvrir le site officiel"><ExternalLink size={14} /></a>}
        <button className="btn-icon" onClick={() => setMobileOpen(false)} style={{ marginLeft: "auto" }}><X size={16} /></button>
      </div>

      <div className="sidebar-search">
        <div className="sidebar-search-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input placeholder="Rechercher dans la doc..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="btn-icon" style={{ padding: "0.1rem" }} onClick={() => { setSearch(""); setSearchRes([]); }}><X size={12} /></button>}
        </div>
        {searchRes.length > 0 && (
          <div className="search-results">
            {searchRes.map(r => (
              <div key={r.id} className="search-result-item"
                onClick={() => { nav(`/docs/${docId}/${r.id}`); setSearch(""); setSearchRes([]); setMobileOpen(false); }}>
                <div className="sr-title">{r.title}</div>
                {r.section_title && <div className="sr-section">{r.section_title}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {/* Pages sans section */}
        {pagesForSection(null).map(p => renderPageItem(p, null))}
        {addingPageForSec === "__none__" && (
          <InlineAdd placeholder="Titre de la page..." onConfirm={t => confirmAddPage(null, t)} onCancel={() => setAddingPageForSec(null)} />
        )}

        {/* Sections avec drag & drop */}
        {sections.map(sec => (
          <div key={sec.id} className={`nav-section${dragSec === sec.id ? " dragging" : ""}${dragOverSec === sec.id && dragSec !== sec.id ? " drag-over-top" : ""}`}
            draggable
            onDragStart={() => setDragSec(sec.id)}
            onDragOver={e => { e.preventDefault(); setDragOverSec(sec.id); }}
            onDragLeave={() => setDragOverSec(null)}
            onDrop={e => { e.preventDefault(); handleSecDrop(sec.id); }}
            onDragEnd={() => { setDragSec(null); setDragOverSec(null); }}
          >
            {renameSec === sec.id ? (
              <input autoFocus className="inline-input" value={renameSecVal}
                onChange={e => setRenameSecVal(e.target.value)}
                onBlur={() => saveRename("section")}
                onKeyDown={e => { if (e.key === "Enter") saveRename("section"); if (e.key === "Escape") setRenameSec(null); }} />
            ) : (
              <button className="nav-section-head"
                onClick={() => setCollapsed(c => ({ ...c, [sec.id]: !c[sec.id] }))}
                onDoubleClick={() => { setRenameSec(sec.id); setRenameSecVal(sec.title); }}>
                <span className="sec-title">
                  <span className="drag-handle" onMouseDown={e => e.stopPropagation()} title="Glisser pour réordonner">
                    <GripVertical size={12} />
                  </span>
                  {collapsed[sec.id] ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                  <span title="Double-clic pour renommer">{sec.title}</span>
                </span>
                <span className="sec-actions">
                  <button className="btn-icon" style={{ padding: "0.1rem" }}
                    onClick={e => { e.stopPropagation(); setCollapsed(c => ({ ...c, [sec.id]: false })); setAddingPageForSec(sec.id); }}
                    title="Ajouter une page"><Plus size={11} /></button>
                  <button className="btn-icon" style={{ padding: "0.1rem" }}
                    onClick={e => { e.stopPropagation(); setRenameSec(sec.id); setRenameSecVal(sec.title); }}
                    title="Renommer"><Pencil size={11} /></button>
                  <button className="btn-icon" style={{ padding: "0.1rem", color: "var(--danger)" }}
                    onClick={e => { e.stopPropagation(); delSection(sec.id); }}
                    title="Supprimer"><Trash2 size={11} /></button>
                </span>
              </button>
            )}
            {!collapsed[sec.id] && (
              <div className="nav-pages">
                {pagesForSection(sec.id).map(p => renderPageItem(p, sec.id))}
                {addingPageForSec === sec.id && (
                  <InlineAdd placeholder="Titre de la page..." onConfirm={t => confirmAddPage(sec.id, t)} onCancel={() => setAddingPageForSec(null)} />
                )}
                {addingPageForSec !== sec.id && (
                  <button className="nav-add-btn" onClick={() => setAddingPageForSec(sec.id)}>
                    <Plus size={12} /> Nouvelle page
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        <div style={{ padding: "0.5rem 0.25rem", display: "flex", flexDirection: "column", gap: "0.15rem", borderTop: sections.length > 0 || pages.filter(p=>!p.section_id).length > 0 ? "1px solid var(--border)" : "none", marginTop: "0.25rem", paddingTop: "0.5rem" }}>
          {addingSection
            ? <InlineAdd placeholder="Nom de la section..." onConfirm={confirmAddSection} onCancel={() => setAddingSection(false)} />
            : <button className="nav-add-btn" onClick={() => setAddingSection(true)}><Plus size={12} /> Nouvelle section</button>
          }
          {addingPageForSec === "__none__"
            ? null
            : <button className="nav-add-btn" onClick={() => setAddingPageForSec("__none__")}><Plus size={12} /> Page hors section</button>
          }
        </div>
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Layers size={11} />{sections.length} sections
          <FileText size={11} style={{ marginLeft: "0.25rem" }} />{pages.length} pages
        </div>
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="doc-layout">
      {Sidebar}
      {mobileOpen && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99 }} onClick={() => setMobileOpen(false)} />}

      <div className="doc-main">
        <div className="doc-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button className="btn-icon mobile-sidebar-toggle" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
            <div className="breadcrumb">
              <span onClick={() => nav("/")} style={{ cursor: "pointer", color: "var(--muted)" }}>Accueil</span>
              <ChevronRight size={13} />
              <span onClick={() => nav(`/docs/${docId}`)} style={{ cursor: "pointer", color: "var(--muted)" }}>{doc?.name}</span>
              {activePage && <><ChevronRight size={13} /><span>{activePage.title}</span></>}
            </div>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-ghost btn-sm" onClick={toggleTheme} title={theme === "dark" ? "Mode clair" : "Mode sombre"}>
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            {activePage && !editing && (
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAttachments(!showAttachments)} title="Fichiers joints">
                <Paperclip size={14} />
              </button>
            )}
            {editing && isDirty && <span style={{ fontSize: "0.75rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}><span className="unsaved-dot" /> Non sauvegardé</span>}
            {activePage && !editing && <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(true); setEditContent(activePage.content || ""); setEditTitle(activePage.title); setSavedContent(activePage.content || ""); }}><Pencil size={14} /> Modifier</button>}
            {editing && <>
              {preview
                ? <button className="btn btn-ghost btn-sm" onClick={() => setPreview(false)}><FileText size={14} /> Éditer</button>
                : <button className="btn btn-ghost btn-sm" onClick={() => setPreview(true)}><Eye size={14} /> Aperçu</button>}
              <button className="btn btn-primary btn-sm" onClick={() => handleSave(false)} disabled={saving || !isDirty}><Save size={14} /> {saving ? "..." : "Enregistrer"}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setEditContent(savedContent); setEditTitle(activePage?.title || ""); }}><X size={14} /> Annuler</button>
            </>}
          </div>
        </div>

        <div className="doc-content-wrap">
          {!activePage ? (
            <div className="doc-empty">
              <FileText size={64} />
              <h3>Sélectionnez une page</h3>
              <p>Choisissez une page dans la sidebar ou créez-en une nouvelle.</p>
              <button className="btn btn-primary" style={{ marginTop: "1.5rem" }} onClick={() => setAddingPageForSec(sections[0]?.id || "__none__")}><Plus size={16} /> Créer une page</button>
            </div>
          ) : editing ? (
            <div className="editor-wrap">
              <div className="editor-toolbar">
                {[["bold","B"],["italic","I"],["code","<>"],["h1","H1"],["h2","H2"],["list","≡"],["link","🔗"]].map(([t,l]) => (
                  <button key={t} className="toolbar-btn" onClick={() => toolbar(t)} title={t}>{l}</button>
                ))}
                <div className="toolbar-sep" />
                <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Ctrl+S · Éch=annuler</span>
              </div>
              {preview ? (
                <div className="doc-content">
                  <div className="doc-page-title">{editTitle}</div>
                  <div className="md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{editContent}</ReactMarkdown></div>
                </div>
              ) : (
                <>
                  <input className="editor-title-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Titre de la page..." />
                  <textarea ref={taRef} className="editor-body" value={editContent} onChange={e => setEditContent(e.target.value)} placeholder="Contenu en Markdown..." />
                </>
              )}
              <div className="editor-statusbar">
                {isDirty && <><span className="unsaved-dot" /> Modifications non sauvegardées ·</>}
                <span>{editContent.length} caractères</span>
              </div>
            </div>
          ) : (
            <div className="doc-content">
              <div className="doc-page-title">{activePage.title}</div>
              <div className="doc-page-meta">
                {activePage.updated_at ? `Mis à jour ${new Date(activePage.updated_at).toLocaleDateString("fr-FR")}` : `Créé ${new Date(activePage.created_at).toLocaleDateString("fr-FR")}`}
              </div>
              {activePage.content ? (
                <div className="md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{activePage.content}</ReactMarkdown></div>
              ) : (
                <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                  <p>Cette page est vide. <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}><Pencil size={13} /> Commencer à écrire</button></p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Attachments Panel */}
      <AnimatePresence>
        {showAttachments && activePage && (
          <motion.div
            initial={{ x: 320 }} animate={{ x: 0 }} exit={{ x: 320 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            style={{ position: "fixed", right: 0, top: 52, bottom: 0, width: 320, background: "var(--sidebar-bg)", borderLeft: "1px solid var(--border)", zIndex: 90, display: "flex", flexDirection: "column" }}
          >
            <div style={{ padding: "1rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Fichiers joints</span>
              <button className="btn-icon" onClick={() => setShowAttachments(false)}><X size={16} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "0.5rem" }}>
                {attachments.map(a => (
                  <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface2)", padding: "0.4rem 0.5rem", borderRadius: 4, fontSize: "0.8rem" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{a.original_name}</span>
                    <div style={{ display: "flex", gap: "0.3rem", marginLeft: "0.5rem" }}>
                      <a href={`/uploads/${a.filename}`} download={a.original_name} target="_blank" style={{ color: "var(--accent)", fontSize: "0.7rem" }}>Télécharger</a>
                      <button onClick={() => delAttachment(a.id)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: 0 }}><Trash2 size={11} /></button>
                    </div>
                  </div>
                ))}
              </div>
              <label className="btn btn-ghost btn-sm" style={{ width: "100%", textAlign: "center", display: "block" }}>
                <input type="file" onChange={uploadFile} style={{ display: "none" }} />
                <Plus size={12} /> Ajouter un fichier
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
