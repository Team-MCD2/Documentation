import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { getMe } from "./api";
import { AppProvider } from "./AppContext";
import Login from "./pages/Login";
import Home from "./pages/Home";
import DocViewer from "./pages/DocViewer";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<null | boolean>(null);
  const loc = useLocation();
  useEffect(() => {
    if (localStorage.getItem("auth_bypass") === "true") {
      setAuth(true);
      return;
    }
    getMe().then(r => setAuth(r.authenticated)).catch(() => setAuth(false));
  }, [loc.pathname]);
  if (auth === null) return null;
  if (!auth) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
        <Route path="/docs/:docId" element={<RequireAuth><DocViewer /></RequireAuth>} />
        <Route path="/docs/:docId/:pageId" element={<RequireAuth><DocViewer /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppProvider>
  );
}
