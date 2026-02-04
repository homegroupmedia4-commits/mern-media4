import { useEffect, useMemo, useState } from "react";
import "./App.css";

import CategoriesPitch from "./pages/CategoriesPitch";
import PitchManager from "./pages/PitchManager";
import ValeursStatiques from "./pages/ValeursStatiques";
import TaillesEcrans from "./pages/TaillesEcrans";




const ADMIN_PASSWORD = "Homegroup91?";
const STORAGE_KEY = "m4_admin_authed_v1";

const SIDEBAR_ITEMS = [
  { key: "pitch_manager", label: "Pitch Manager" },
  { key: "nos_devis", label: "Nos devis" },
  { key: "categories_pitch", label: "Catégories de pitch" },
  { key: "valeurs_statiques", label: "Valeurs Statiques" },
  { key: "tailles_ecrans", label: "Tailles Écrans Muraux" },
];

function App() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [activeKey, setActiveKey] = useState(SIDEBAR_ITEMS[0].key);

  const API = useMemo(
    () => import.meta.env.VITE_API_URL || "https://mern-media4-server.onrender.com",
    []
  );

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "1") setIsAuthed(true);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");

    if (password === ADMIN_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, "1");
      setIsAuthed(true);
      setPassword("");
      return;
    }

    setError("Mot de passe incorrect.");
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsAuthed(false);
    setActiveKey(SIDEBAR_ITEMS[0].key);
  };

  // ------- LOGIN -------
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

            <div className="login-hint">
              API: <span className="mono">{API}</span>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ------- LAYOUT -------
  const activeLabel =
    SIDEBAR_ITEMS.find((i) => i.key === activeKey)?.label || "Tableau de bord";

  return (
    <div className="dash-shell">
      <aside className="sidebar">
        <div className="sidebar-inner">
          <nav className="sidebar-nav">
            {SIDEBAR_ITEMS.map((item) => (
              <button
                key={item.key}
                className={`sidebar-item ${activeKey === item.key ? "active" : ""}`}
                onClick={() => setActiveKey(item.key)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <button className="sidebar-logout" onClick={handleLogout} type="button">
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="dash-main">
        <div className="dash-topbar">
          <h1 className="dash-title">{activeLabel}</h1>
        </div>

        {/* Zone de contenu (pages dédiées) */}
<div className="dash-content">
  {activeKey === "categories_pitch" ? (
    <CategoriesPitch API={API} />
  ) : activeKey === "pitch_manager" ? (
    <PitchManager API={API} />
  ) : activeKey === "valeurs_statiques" ? (
    <ValeursStatiques API={API} />
  ) : activeKey === "tailles_ecrans" ? (
    <TaillesEcrans API={API} />
  ) : (
    <div className="card">
      <div className="card-title">Section : {activeLabel}</div>
      <div className="card-text">Page à construire.</div>
    </div>
  )}
</div>



      </main>
    </div>
  );
}

export default App;
