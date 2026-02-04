import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./AgentHome.css";

const TOKEN_KEY = "agent_token_v1";
const USER_KEY = "agent_user_v1";

export default function AgentHome() {
  const navigate = useNavigate();

  const API = useMemo(
    () => import.meta.env.VITE_API_URL || "https://mern-media4-server.onrender.com",
    []
  );

  const [agent, setAgent] = useState(null);
  const [error, setError] = useState("");

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    navigate("/agent/login");
  };

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const cached = localStorage.getItem(USER_KEY);

    if (!token) return navigate("/agent/login");

    // on affiche d'abord le cache (instant)
    if (cached) {
      try {
        setAgent(JSON.parse(cached));
      } catch {}
    }

    // puis on vérifie via /me
    (async () => {
      try {
        const res = await fetch(`${API}/api/agents/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        const me = await res.json();
        setAgent(me);
      } catch (e) {
        console.error(e);
        setError("Session invalide. Reconnecte-toi.");
        logout();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="agenthome-page">
      <div className="agenthome-card">
        <div className="agenthome-title">Bonjour</div>

        {agent ? (
          <div className="agenthome-text">
            <div>
              <strong>{agent.prenom} {agent.nom}</strong>
            </div>
            <div>{agent.email}</div>
          </div>
        ) : (
          <div className="agenthome-text">Chargement...</div>
        )}

        <div className="agenthome-actions">
          <button className="agenthome-btn" type="button" onClick={logout}>
            Déconnexion
          </button>

          <Link className="agenthome-link" to="/agent/login">
            Retour login
          </Link>
        </div>
      </div>
    </div>
  );
}
