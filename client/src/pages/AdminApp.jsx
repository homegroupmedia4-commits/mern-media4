// client/src/pages/AdminApp.jsx
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import "../App.css";

const ADMIN_PASSWORD = "Homegroup91?";
const STORAGE_KEY = "m4_admin_authed_v1";
const ADMIN_BASE = "/adminmedia4";

export default function AdminApp() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const API = useMemo(
    () => import.meta.env.VITE_API_URL || "https://mern-media4-server.onrender.com",
    []
  );

  // ✅ groupes ouverts/fermés (comme avant)
  const [openGroups, setOpenGroups] = useState(() => ({
    pitchs: true,
    autres: true,
    config: true,
  }));

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "1") setIsAuthed(true);
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

  const toggleGroup = (key) => {
    setOpenGroups((p) => ({ ...p, [key]: !p[key] }));
  };

  const isPathActive = (prefix) => location.pathname.startsWith(prefix);

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
              placeholder="••••••••••"
              autoFocus
            />
            {error ? <div className="login-error">{error}</div> : null}
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
            {/* 1) Nos devis */}
            <NavLink
              to={`${ADMIN_BASE}/nosdevis`}
              className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
            >
              Nos devis
            </NavLink>

            {/* 2) Pitchs */}
            <button
              type="button"
              className={`sidebar-group ${isPathActive(`${ADMIN_BASE}/pitchs`) ? "is-active" : ""}`}
              onClick={() => toggleGroup("pitchs")}
            >
              <span>Pitchs</span>
              <span className={`chev ${openGroups.pitchs ? "open" : ""}`}>▾</span>
            </button>

            {openGroups.pitchs ? (
              <div className="sidebar-subnav">
                <NavLink
                  to={`${ADMIN_BASE}/pitchs/ajoutpitch`}
                  className={({ isActive }) => `sidebar-subitem ${isActive ? "active" : ""}`}
                >
                  Ajouter pitch
                </NavLink>

                <NavLink
                  to={`${ADMIN_BASE}/pitchs/tableaupitch`}
                  className={({ isActive }) => `sidebar-subitem ${isActive ? "active" : ""}`}
                >
                  Tableau pitch
                </NavLink>

                <NavLink
                  to={`${ADMIN_BASE}/categories-pitch`}
                  className={({ isActive }) => `sidebar-subitem ${isActive ? "active" : ""}`}
                >
                  Catégorie
                </NavLink>
              </div>
            ) : null}

            {/* 3) Autres produits */}
            <button
              type="button"
              className={`sidebar-group ${isPathActive(`${ADMIN_BASE}/autres-produits`) ? "is-active" : ""}`}
              onClick={() => toggleGroup("autres")}
            >
              <span>Autres produits</span>
              <span className={`chev ${openGroups.autres ? "open" : ""}`}>▾</span>
            </button>

            {openGroups.autres ? (
              <div className="sidebar-subnav">
                <NavLink
                  to={`${ADMIN_BASE}/produits`}
                  className={({ isActive }) => `sidebar-subitem ${isActive ? "active" : ""}`}
                >
                  Tableau autre produit
                </NavLink>

                <NavLink
                  to={`${ADMIN_BASE}/tailles-ecrans`}
                  className={({ isActive }) => `sidebar-subitem ${isActive ? "active" : ""}`}
                >
                  Tailles écrans
                </NavLink>
              </div>
            ) : null}

            {/* 4) Configuration */}
            <button
              type="button"
              className={`sidebar-group ${isPathActive(`${ADMIN_BASE}/configuration`) || isPathActive(`${ADMIN_BASE}/valeurs-statiques`) ? "is-active" : ""}`}
              onClick={() => toggleGroup("config")}
            >
              <span>Configuration</span>
              <span className={`chev ${openGroups.config ? "open" : ""}`}>▾</span>
            </button>

            {openGroups.config ? (
              <div className="sidebar-subnav">
                <NavLink
                  to={`${ADMIN_BASE}/valeurs-statiques`}
                  className={({ isActive }) => `sidebar-subitem ${isActive ? "active" : ""}`}
                >
                  Coefficient &amp; montant
                </NavLink>

                <NavLink
                  to={`${ADMIN_BASE}/valeurs-statiques`}
                  className={({ isActive }) => `sidebar-subitem ${isActive ? "active" : ""}`}
                >
                  Durée leasing
                </NavLink>

                <NavLink
                  to={`${ADMIN_BASE}/fixation`}
                  className={({ isActive }) => `sidebar-subitem ${isActive ? "active" : ""}`}
                >
                  Fixation
                </NavLink>

                <NavLink
                  to={`${ADMIN_BASE}/finition`}
                  className={({ isActive }) => `sidebar-subitem ${isActive ? "active" : ""}`}
                >
                  Finition
                </NavLink>
              </div>
            ) : null}

            {/* 5) Agents */}
            <NavLink
              to={`${ADMIN_BASE}/agents`}
              className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
            >
              Agents
            </NavLink>
          </nav>

          <button className="sidebar-logout sidebar-logout--white" onClick={handleLogout} type="button">
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
