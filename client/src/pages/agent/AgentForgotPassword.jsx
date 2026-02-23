import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./AgentLogin.css"; // réutilise ton style

export default function AgentForgotPassword() {
  const API = useMemo(
    () => import.meta.env.VITE_API_URL || "https://mern-media4-server.onrender.com",
    []
  );

  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/agents/password/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Erreur.");

      // message neutre
      setMsg(data?.message || "Si un compte existe, un lien de réinitialisation a été envoyé.");

      // DEV only: affiche le lien
      if (data?.devResetUrl) {
        setMsg((p) => `${p}\n\nDEV LINK:\n${data.devResetUrl}`);
      }
    } catch (e2) {
      console.error(e2);
      setErr("Impossible de lancer la réinitialisation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-agent-page">
      <div className="login-agent-card">
        <form onSubmit={submit} className="login-agent-form">
          <div className="login-agent-title">Mot de passe oublié</div>

          <div className="login-field">
            <label>E-mail</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="ex: agent@media4.fr"
              autoFocus
            />
          </div>

          {err ? <div className="login-agent-error">{err}</div> : null}
          {msg ? (
            <div style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "#111" }}>
              {msg}
            </div>
          ) : null}

          <div className="login-actions">
            <button className="login-agent-btn" type="submit" disabled={loading}>
              {loading ? "Envoi..." : "Envoyer le lien"}
            </button>

            <Link className="login-agent-register" to="/agent/login">
              Retour
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
