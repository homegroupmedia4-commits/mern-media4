// client/src/pages/AdminApp.jsx
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import "../App.css";

const ADMIN_PASSWORD = "Homegroup91?";
const STORAGE_KEY = "m4_admin_authed_v1";

// ✅ token admin pour appeler /api/agents/* (requireAgentAuth)
const ADMIN_TOKEN_KEY = "admin_token_v1";

// ✅ base path admin
const ADMIN_BASE = "/adminmedia4";

export default function AdminApp() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // ✅ état token (si manque => NosDevis 401)
  const [tokenStatus, setTokenStatus] = useState({
    loading: false,
    ok: false,
    msg: "",
  });

  const navigate = useNavigate();
  const location = useLocation();

  // groupes ouverts/fermés
  const [openGroups, setOpenGroups] = useState(() => ({
    pitchs: true,
    autres: true,
    config: true,
  }));

  const API = useMemo(
    () => import.meta.env.VITE_API_URL || "https://mern-media4-server.onrender.com",
    []
  );

  const isPathActive = (prefix) => location.pathname.startsWith(prefix);

  const toggleGroup = (key) => setOpenGroups((p) => ({ ...p, [key]: !p[key] }));

  const hasAnyToken = () => {
    const t =
      localStorage.getItem(ADMIN_TOKEN_KEY) ||
      localStorage.getItem("agent_token_v1") ||
      localStorage.getItem("token");
    return !!t;
  };

  // ✅ auto-login agent admin (si tu définis VITE_ADMIN_EMAIL + VITE_ADMIN_PASS)
const ensureAdminApiToken = async (pwd = "") => {
  // Déjà OK ?
  if (localStorage.getItem(ADMIN_TOKEN_KEY)) {
    setTokenStatus({ loading: false, ok: true, msg: "" });
    return;
  }

  setTokenStatus({ loading: true, ok: false, msg: "" });

  try {
    const res = await fetch(`${API}/api/agents/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwd || ADMIN_PASSWORD }),
    });

    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();
    if (!data?.token) throw new Error("No token");

    localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
    setTokenStatus({ loading: false, ok: true, msg: "" });
  } catch (e) {
    console.error(e);
    setTokenStatus({
      loading: false,
      ok: false,
      msg: "Impossible d’obtenir le token admin API. Vérifie le mot de passe admin côté serveur.",
    });
  }
};

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "1") setIsAuthed(true);
  }, []);

  useEffect(() => {
    if (isAuthed) ensureAdminApiToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
if (password === ADMIN_PASSWORD) {
  localStorage.setItem(STORAGE_KEY, "1");
  setIsAuthed(true);

  const pwd = password; // garde avant reset
  setPassword("");

  await ensureAdminApiToken(pwd);
  return;
}


    setError("Mot de passe incorrect.");
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setIsAuthed(false);
    navigate("/agent/login", { replace: true });
  };

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

           <a
  className="sidebar-agentBtn"
  href="/agent/home"
  target="_blank"
  rel="noopener noreferrer"
>
  Voir la page agent
</a>

          </div>

          {/* ✅ Alerte token (sinon Nos devis = 401) */}
          {!hasAnyToken() || tokenStatus?.ok === false ? (
            <div className="alert" style={{ marginBottom: 12 }}>
              {tokenStatus.loading
                ? "Connexion API..."
                : tokenStatus.msg ||
                  "Token API manquant. Connecte-toi sur /agent/login, ou configure VITE_ADMIN_EMAIL/VITE_ADMIN_PASS."}
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-dark" type="button" onClick={() => ensureAdminApiToken(ADMIN_PASSWORD)}>
  Réessayer
</button>

                <a className="btn btn-outline" href="/agent/login" target="_blank" rel="noreferrer">
                  Ouvrir /agent/login
                </a>
              </div>
            </div>
          ) : null}

          <nav className="sidebar-nav">
            <NavLink
              to={`${ADMIN_BASE}/nosdevis`}
              className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
            >
              Nos devis
            </NavLink>

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



    <button
  type="button"
  className={`sidebar-group ${
    isPathActive(`/ajouterautreproduit`) ||
    isPathActive(`/tableauautreproduit`) ||
    isPathActive(`/ajoutememoire`) ||
    isPathActive(`/tableaumemoire`) ||
    isPathActive(`${ADMIN_BASE}/tailles-ecrans`)
      ? "is-active"
      : ""
  }`}
  onClick={() => toggleGroup("autres")}
>
  <span>Autres produits</span>
  <span className={`chev ${openGroups.autres ? "open" : ""}`}>▾</span>
</button>

{openGroups.autres ? (
  <div className="sidebar-subnav">
    <NavLink
      to="/ajouterautreproduit"
      className={({ isActive }) => `sidebar-subitem ${isActive ? "active" : ""}`}
    >
      Ajouter autre produit
    </NavLink>

    <NavLink
      to="/tableauautreproduit"
      className={({ isActive }) => `sidebar-subitem ${isActive ? "active" : ""}`}
    >
      Tableau autre produit
    </NavLink>

    <NavLink
      to="/ajoutememoire"
      className={({ isActive }) => `sidebar-subitem ${isActive ? "active" : ""}`}
    >
      Ajouter mémoire
    </NavLink>

    <NavLink
      to="/tableaumemoire"
      className={({ isActive }) => `sidebar-subitem ${isActive ? "active" : ""}`}
    >
      Tableau mémoires
    </NavLink>
  </div>
) : null}




            <button
              type="button"
              className={`sidebar-group ${
                isPathActive(`${ADMIN_BASE}/valeurs-statiques`) ||
                isPathActive(`${ADMIN_BASE}/fixation`) ||
                isPathActive(`${ADMIN_BASE}/finition`)
                  ? "is-active"
                  : ""
              }`}
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
