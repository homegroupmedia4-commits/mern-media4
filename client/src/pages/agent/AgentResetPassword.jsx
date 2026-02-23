import { useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import "./AgentLogin.css";

export default function AgentResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const API = useMemo(
    () => import.meta.env.VITE_API_URL || "https://mern-media4-server.onrender.com",
    []
  );

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/agents/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Erreur.");

      setMsg(data?.message || "Mot de passe mis à jour.");
      setTimeout(() => navigate("/agent/login"), 700);
    } catch (e2) {
      console.error(e2);
      setErr(String(e2.message || "Lien invalide ou expiré."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-agent-page">
      <div className="login-agent-card">
        <form onSubmit={submit} className="login-agent-form">
          <div className="login-agent-title">Nouveau mot de passe</div>

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
              Connexion
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
