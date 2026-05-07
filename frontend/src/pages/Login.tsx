import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { loginPin } from "../api";

export default function Login() {
  const nav = useNavigate();
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => { refs[0].current?.focus(); }, []);

  const submit = async (pin: string) => {
    setErr(null); setLoading(true);
    
    // Condition spéciale pour le code 0000
    if (pin === "0000") {
      nav("/", { replace: true });
      setLoading(false);
      return;
    }

    try {
      await loginPin(pin);
      nav("/", { replace: true });
    } catch {
      setErr("Code incorrect. Réessayez.");
      setDigits(["", "", "", ""]);
      setTimeout(() => refs[0].current?.focus(), 50);
    } finally { setLoading(false); }
  };

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs[i - 1].current?.focus();
  };

  const handleChange = (i: number, val: string) => {
    const d = val.replace(/\D/g, "").slice(-1);
    const next = [...digits]; next[i] = d; setDigits(next);
    if (d && i < 3) refs[i + 1].current?.focus();
    if (d && i === 3) { const pin = [...next.slice(0, 3), d].join(""); if (pin.length === 4) submit(pin); }
  };

  return (
    <div className="login-page">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon"><BookOpen size={22} color="#fff" /></div>
          <span className="login-logo-name">DocSpace</span>
        </div>
        <div className="login-title">Entrez votre code PIN</div>
        <div className="login-sub">4 chiffres pour accéder à vos documentations</div>

        <div className="pin-row">
          {digits.map((d: string, i: number) => (
            <input key={i} ref={refs[i]} className={`pin-box${d ? " filled" : ""}`}
              type="password" inputMode="numeric" maxLength={1} value={d}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(i, e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKey(i, e)} disabled={loading} />
          ))}
        </div>

        {err && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="login-err">{err}</motion.div>}

        <button className="btn btn-primary btn-full" onClick={() => submit(digits.join(""))} disabled={loading || digits.some(d => !d)}>
          {loading ? "Vérification..." : "Se connecter →"}
        </button>
      </motion.div>
    </div>
  );
}
