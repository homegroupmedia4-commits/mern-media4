import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./AgentLogin.css";

export default function AgentForgotPassword() {
  const navigate = useNavigate();

  const API = useMemo(
    () => import.meta.env.VITE_API_URL || "https://mern-media4-server.onrender.com",
    []
  );

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/agents/password/reset-direct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword, confirmPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Erreur.");

      setMsg(data?.message || "Mot de passe mis à jour.");
      setTimeout(() => navigate("/agent/login"), 700);
    } catch (e2) {
      console.error(e2);
      setErr(String(e2?.message || "Erreur."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-agent-page">
      <div className="login-agent-card">
        <form onSubmit={submit} className="login-agent-form">
          <div className="login-agent-title">Réinitialiser le mot de passe</div>

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

          <div className="login-field">
            <label>Nouveau mot de passe</label>
            <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" />
          </div>

          <div className="login-field">
            <label>Confirmer</label>
            <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" />
          </div>

          {err ? <div className="login-agent-error">{err}</div> : null}
          {msg ? <div style={{ fontSize: 13, color: "#111" }}>{msg}</div> : null}

          <div className="login-actions">
            <button className="login-agent-btn" type="submit" disabled={loading}>
              {loading ? "Mise à jour..." : "Changer le mot de passe"}
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
