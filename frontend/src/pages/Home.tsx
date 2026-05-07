import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Plus, ExternalLink, FileText, Layers, Trash2, Pencil, X, Check, LogOut, Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as api from "../api";
import { useApp } from "../AppContext";

const COLORS = ["#4f8ef7","#8b5cf6","#ec4899","#f59e0b","#10b981","#06b6d4","#f97316","#ef4444"];

function DocCard({ doc, onOpen, onEdit, onDelete }: { doc: api.Doc; onOpen: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className="doc-card" style={{ "--doc-color": doc.color } as React.CSSProperties} onClick={onOpen}>
      <div className="doc-card-header">
        <div className="doc-icon" style={{ background: doc.color + "22" }}>
          <BookOpen size={20} color={doc.color} />
        </div>
        <div className="doc-card-actions" onClick={e => e.stopPropagation()}>
          <button className="btn-icon" title="Modifier" onClick={onEdit}><Pencil size={13} /></button>
          <button className="btn-icon" style={{ color: "var(--danger)" }} title="Supprimer" onClick={onDelete}><Trash2 size={13} /></button>
        </div>
      </div>
      <div>
        <div className="doc-name">{doc.name}</div>
        <div className="doc-title">{doc.title}</div>
      </div>
      {doc.description && <div className="doc-desc">{doc.description}</div>}
      <div className="doc-footer">
        <span><Layers size={12} /> {doc.section_count ?? 0} sections</span>
        <span><FileText size={12} /> {doc.page_count ?? 0} pages</span>
        {doc.url && (
          <a href={doc.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="doc-url" style={{ marginLeft: "auto" }}>
            <ExternalLink size={11} />
          </a>
        )}
      </div>
    </motion.div>
  );
}

type DocForm = { name: string; title: string; url: string; description: string; color: string };
const emptyForm = (): DocForm => ({ name: "", title: "", url: "", description: "", color: COLORS[0] });

export default function Home() {
  const nav = useNavigate();
  const { docs, refreshDocs, theme, toggleTheme } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editDoc, setEditDoc] = useState<api.Doc | null>(null);
  const [delDoc, setDelDoc] = useState<api.Doc | null>(null);
  const [form, setForm] = useState<DocForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = () => refreshDocs();
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm()); setEditDoc(null); setErr(null); setShowModal(true); };
  const openEdit = (doc: api.Doc) => {
    setForm({ name: doc.name, title: doc.title, url: doc.url, description: doc.description, color: doc.color });
    setEditDoc(doc); setErr(null); setShowModal(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.title.trim()) { setErr("Nom et titre requis."); return; }
    setSaving(true); setErr(null);
    try {
      if (editDoc) { await api.updateDoc(editDoc.id, form); }
      else { await api.createDoc(form); }
      setShowModal(false); load();
    } catch (ex: any) { setErr(ex.message || "Erreur"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!delDoc) return;
    await api.deleteDoc(delDoc.id).catch(() => {});
    setDelDoc(null); load();
  };

  const f = (k: keyof DocForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="home-layout">
      <header className="home-header">
        <div className="home-header-left">
          <div className="logo-mark"><BookOpen size={16} color="#fff" /></div>
          <span className="logo-text">DocSpace</span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-ghost btn-sm" onClick={toggleTheme} title={theme === "dark" ? "Mode clair" : "Mode sombre"}>
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={15} /> Nouvelle documentation</button>
          <button className="btn btn-ghost btn-sm" title="Déconnexion"
            onClick={async () => { await api.logout().catch(() => {}); nav("/login"); }}>
            <LogOut size={15} />
          </button>
        </div>
      </header>

      <div className="home-content">
        <div className="home-hero">
          <h1>Vos documentations</h1>
          <p>{docs.length} documentation{docs.length !== 1 ? "s" : ""} disponible{docs.length !== 1 ? "s" : ""}</p>
        </div>

        {docs.length === 0 ? (
          <div className="empty-docs">
            <BookOpen size={64} />
            <h3>Aucune documentation</h3>
            <p>Commencez par créer votre première documentation.</p>
            <button className="btn btn-primary" style={{ marginTop: "1.5rem" }} onClick={openCreate}>
              <Plus size={16} /> Créer une documentation
            </button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="docs-grid">
              {docs.map(d => (
                <DocCard key={d.id} doc={d}
                  onOpen={() => nav(`/docs/${d.id}`)}
                  onEdit={() => openEdit(d)}
                  onDelete={() => setDelDoc(d)} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-overlay" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">
                {editDoc ? <><Pencil size={18} /> Modifier la documentation</> : <><Plus size={18} /> Nouvelle documentation</>}
              </div>
              <form onSubmit={handleSave}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Nom *</label>
                    <input className="form-input" value={form.name} onChange={f("name")} placeholder="ex: Node.js" autoFocus required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Titre *</label>
                    <input className="form-input" value={form.title} onChange={f("title")} placeholder="ex: Node.js v20 Docs" required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">URL du site officiel</label>
                  <input className="form-input" value={form.url} onChange={f("url")} placeholder="https://nodejs.org" type="url" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" value={form.description} onChange={f("description")}
                    placeholder="Courte description de la documentation..." rows={2} />
                </div>
                <div className="form-group">
                  <label className="form-label">Couleur</label>
                  <div className="color-options">
                    {COLORS.map(c => (
                      <div key={c} className={`color-swatch${form.color === c ? " selected" : ""}`}
                        style={{ background: c }} onClick={() => setForm(p => ({ ...p, color: c }))} />
                    ))}
                  </div>
                </div>
                {err && <div className="form-err">{err}</div>}
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                    <X size={15} /> Annuler
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Enregistrement..." : editDoc ? <><Check size={15} /> Mettre à jour</> : <><Plus size={15} /> Créer</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {delDoc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-overlay" onClick={() => setDelDoc(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="modal"
              style={{ maxWidth: 380, textAlign: "center" }} onClick={e => e.stopPropagation()}>
              <Trash2 size={40} color="var(--danger)" style={{ margin: "0 auto 1rem" }} />
              <div className="modal-title" style={{ justifyContent: "center" }}>Supprimer "{delDoc.name}" ?</div>
              <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "1.5rem" }}>
                Toutes les sections et pages seront supprimées. Action irréversible.
              </p>
              <div className="modal-footer" style={{ justifyContent: "center" }}>
                <button className="btn btn-ghost" onClick={() => setDelDoc(null)}>Annuler</button>
                <button className="btn btn-danger" onClick={handleDelete}><Trash2 size={15} /> Supprimer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
