import { createContext, useContext, useEffect, useState } from "react";
import type { Doc, Section, Page } from "./api";

export type AppCtx = {
  docs: Doc[];
  refreshDocs: () => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
};

const STORAGE_KEY = "docspace-theme";

export const AppContext = createContext<AppCtx>({
  docs: [],
  refreshDocs: () => {},
  theme: "dark",
  toggleTheme: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved === "light" || saved === "dark") ? saved : "dark";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
    if (theme === "light") document.body.classList.add("light-mode");
    else document.body.classList.remove("light-mode");
  }, [theme]);

  const refreshDocs = async () => {
    try {
      const r = await (await import("./api")).listDocs();
      setDocs(r.docs);
    } catch {}
  };

  useEffect(() => { refreshDocs(); }, []);

  return (
    <AppContext.Provider value={{ docs, refreshDocs, theme, toggleTheme: () => setTheme(t => t === "dark" ? "light" : "dark") }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
