// ── API Client ───────────────────────────────────────────────────────────────
export class AuthError extends Error {
  constructor() { super("auth"); this.name = "AuthError"; }
}

async function req<T>(path: string, init?: RequestInit & { allowAuth401?: boolean }): Promise<T> {
  const headers = new Headers(init?.headers);
  if (typeof init?.body === "string") headers.set("Content-Type", "application/json");
  const r = await fetch(`/api${path}`, { credentials: "include", ...init, headers });
  if (r.status === 401 && !init?.allowAuth401) throw new AuthError();
  if (!r.ok) {
    let msg = r.statusText;
    try { const j = await r.json(); msg = j.detail || j.error || msg; } catch {}
    throw new Error(msg);
  }
  const ct = r.headers.get("content-type") || "";
  return ct.includes("application/json") ? (r.json() as Promise<T>) : (undefined as T);
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const loginPin = (pin: string) =>
  req<{ ok: boolean }>("/auth/login", { method: "POST", body: JSON.stringify({ pin }), allowAuth401: true });

export const logout = () =>
  req<{ ok: boolean }>("/auth/logout", { method: "POST", body: "{}" });

export const getMe = () =>
  req<{ authenticated: boolean }>("/auth/me", { method: "GET" });

export const changePin = (currentPin: string, newPin: string) =>
  req<{ ok: boolean }>("/auth/pin", { method: "PUT", body: JSON.stringify({ currentPin, newPin }) });

// ── Types ────────────────────────────────────────────────────────────────────
export type Doc = {
  id: string; name: string; title: string; url: string;
  description: string; color: string; icon: string;
  created_at: string; page_count?: number; section_count?: number;
};

export type Section = {
  id: string; doc_id: string; title: string;
  order_index: number; parent_id: string | null; created_at: string;
};

export type Page = {
  id: string; doc_id: string; section_id: string | null; title: string;
  content?: string; order_index: number; created_at: string; updated_at?: string;
};

export type SearchResult = { id: string; title: string; section_id: string | null; section_title: string | null };

export type Attachment = { id: string; page_id: string; filename: string; original_name: string; mime_type: string; size: number; created_at: string };

// ── Documentations ───────────────────────────────────────────────────────────
export const listDocs = () => req<{ docs: Doc[] }>("/docs");

export const createDoc = (data: Partial<Doc>) =>
  req<{ id: string }>("/docs", { method: "POST", body: JSON.stringify(data) });

export const getDoc = (id: string) =>
  req<{ doc: Doc; sections: Section[]; pages: Page[] }>(`/docs/${id}`);

export const updateDoc = (id: string, data: Partial<Doc>) =>
  req<{ ok: boolean }>(`/docs/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteDoc = (id: string) =>
  req<{ ok: boolean }>(`/docs/${id}`, { method: "DELETE", body: "{}" });

// ── Sections ─────────────────────────────────────────────────────────────────
export const createSection = (docId: string, data: { title: string; orderIndex?: number; parentId?: string }) =>
  req<{ id: string }>(`/docs/${docId}/sections`, { method: "POST", body: JSON.stringify(data) });

export const updateSection = (id: string, title: string) =>
  req<{ ok: boolean }>(`/sections/${id}`, { method: "PUT", body: JSON.stringify({ title }) });

export const deleteSection = (id: string) =>
  req<{ ok: boolean }>(`/sections/${id}`, { method: "DELETE", body: "{}" });

export const reorderSection = (id: string, orderIndex: number) =>
  req<{ ok: boolean }>(`/sections/${id}/order`, { method: "PATCH", body: JSON.stringify({ orderIndex }) });

// ── Pages ────────────────────────────────────────────────────────────────────
export const createPage = (docId: string, data: { title: string; sectionId?: string; content?: string; orderIndex?: number }) =>
  req<{ id: string }>(`/docs/${docId}/pages`, { method: "POST", body: JSON.stringify(data) });

export const getPage = (id: string) => req<{ page: Page }>(`/pages/${id}`);

export const updatePage = (id: string, title: string, content: string) =>
  req<{ ok: boolean }>(`/pages/${id}`, { method: "PUT", body: JSON.stringify({ title, content }) });

export const deletePage = (id: string) =>
  req<{ ok: boolean }>(`/pages/${id}`, { method: "DELETE", body: "{}" });

export const movePage = (id: string, sectionId: string | null, orderIndex: number) =>
  req<{ ok: boolean }>(`/pages/${id}/move`, { method: "PATCH", body: JSON.stringify({ sectionId, orderIndex }) });

export const searchInDoc = (docId: string, q: string) =>
  req<{ results: SearchResult[] }>(`/docs/${docId}/search?q=${encodeURIComponent(q)}`);

// ── File Attachments ─────────────────────────────────────────────────────────
export const listAttachments = (pageId: string) => req<{ attachments: Attachment[] }>(`/pages/${pageId}/attachments`);
export const uploadAttachment = (pageId: string, file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  return req<{ ok: boolean; id: string; originalName: string; mimeType: string; size: number }>(
    `/pages/${pageId}/attachments`, { method: "POST", body: fd as any }
  );
};
export const deleteAttachment = (id: string) =>
  req<{ ok: boolean }>(`/attachments/${id}`, { method: "DELETE", body: "{}" });
