import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./AgentLogin.css";

const TOKEN_KEY = "agent_token_v1";
const USER_KEY = "agent_user_v1";

export default function AgentLogin() {
  const navigate = useNavigate();

  const API = useMemo(
    () => import.meta.env.VITE_API_URL || "https://mern-media4-server.onrender.com",
    []
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/agents/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.agent));

      navigate("/agent/home");
    } catch (e2) {
      console.error(e2);
      setError("Identifiant ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-agent-page">
      <div className="login-agent-card">
        <form onSubmit={submit} className="login-agent-form">
          <div className="login-agent-title">Connexion</div>

          <div className="login-field">
            <label>Identifiant ou e-mail</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </div>

          <div className="login-field">
            <label>Mot de passe</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          </div>

          {error ? <div className="login-agent-error">{error}</div> : null}

          <div className="login-actions">
            <button className="login-agent-btn" type="submit" disabled={loading}>
              {loading ? "Connexion..." : "Connexion"}
            </button>

                  <Link className="login-agent-register" to="/agent/forgot-password">
  Mot de passe oublié ?
</Link>

            

            <Link className="login-agent-register" to="/agent/register">
              S’inscrire
            </Link>

      

            
          </div>
        </form>
      </div>
    </div>
  );
}
