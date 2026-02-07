import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "../App.css";

const ADMIN_PASSWORD = "Homegroup91?";
const STORAGE_KEY = "m4_admin_authed_v1";
const ADMIN_BASE = "/adminmedia4";

export default function AdminApp() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const API = useMemo(
    () => import.meta.env.VITE_API_URL || "https://mern-media4-server.onrender.com",
    []
  );

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "1") {
      setIsAuthed(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");

    if (password === ADMIN_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, "1");
      setIsAuthed(true);
      setPassword("");
    } else {
      setError("Mot de passe incorrect.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsAuthed(false);
    navigate("/agent/login", { replace: true });
  };

  /* ================= LOGIN ================= */
  if (!isAuthed) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-title">Connexion Admin</div>
          <div className="login-subtitle">Accès réservé</div>

          <form onSubmit={handleLogin} className="login-form">
            <label className="login-label">Mot de passe</label>
            <input
              className="login-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {error && <div className="login-error">{error}</div>}
            <button className="login-btn" type="submit">
              Se connecter
            </button>
          </form>

          <div className="login-hint">
            Accès admin : <span className="mono">{ADMIN_BASE}</span>
          </div>
        </div>
      </div>
    );
  }

  /* ================= DASHBOARD ================= */
  return (
    <div className="dash-shell">
      <aside className="sidebar sidebar--white">
        <div className="sidebar-inner">
          <div className="sidebar-brand">
            <div className="sidebar-brand-title">MEDIA4</div>

            <NavLink className="sidebar-agentBtn" to="/agent/home">
              Voir la page agent
            </NavLink>
          </div>

          <nav className="sidebar-nav">
            <NavLink to={`${ADMIN_BASE}/nosdevis`} className="sidebar-item">
              Nos devis
            </NavLink>

            <NavLink to={`${ADMIN_BASE}/agents`} className="sidebar-item">
              Agents
            </NavLink>

            <NavLink to={`${ADMIN_BASE}/produits`} className="sidebar-item">
              Produits
            </NavLink>

            <NavLink to={`${ADMIN_BASE}/fixation`} className="sidebar-item">
              Fixation
            </NavLink>

            <NavLink to={`${ADMIN_BASE}/finition`} className="sidebar-item">
              Finition
            </NavLink>

            <NavLink to={`${ADMIN_BASE}/tailles-ecrans`} className="sidebar-item">
              Tailles écrans
            </NavLink>

            <NavLink to={`${ADMIN_BASE}/valeurs-statiques`} className="sidebar-item">
              Valeurs statiques
            </NavLink>

            <NavLink to={`${ADMIN_BASE}/categories-pitch`} className="sidebar-item">
              Catégories pitch
            </NavLink>
          </nav>

          <button
            className="sidebar-logout sidebar-logout--white"
            onClick={handleLogout}
            type="button"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="dash-main">
        <div className="dash-topbar">
          <h1 className="dash-title">Admin</h1>
        </div>

        <div className="dash-content">
          <Outlet context={{ API }} />
        </div>
      </main>
    </div>
  );
}
