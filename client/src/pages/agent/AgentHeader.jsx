import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { TOKEN_KEY, USER_KEY } from "./agentHome.helpers";
import "./AgentHeader.css";

export default function AgentHeader({ agent }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);

  const isAuthed = !!localStorage.getItem(TOKEN_KEY);

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setMenuOpen(false);
    navigate("/agent/login");
  };

  const isActive = (path) => location.pathname === path;

  // Ferme le menu quand on navigue
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Lock scroll quand le menu mobile est ouvert
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [menuOpen]);

  const links = useMemo(() => {
    const base = [
      { to: "/agent/home", label: "Devis" },
      { to: "/agent/mes-devis", label: "Mes devis" },
      { to: "/agent/faq", label: "F.A.Q" },
    ];

    if (!isAuthed) {
      base.push({ to: "/agent/login", label: "Connexion" });
    }

    return base;
  }, [isAuthed]);

  return (
    <header className="agentheader">
      <div className="agentheader-inner">
        <Link to="/agent/home" className="agentheader-brand" aria-label="Media4">
          <img className="agentheader-logo" src="/Media4logo.png" alt="MEDIA4" />
        </Link>

        {/* Desktop nav */}
        <nav className="agentheader-nav agentheader-nav--desktop" aria-label="Navigation agent">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`agentheader-link ${isActive(l.to) ? "is-active" : ""}`}
            >
              {l.label}
            </Link>
          ))}

          {isAuthed ? (
            <button
              className="agentheader-link agentheader-btnlink"
              onClick={logout}
              type="button"
            >
              Déconnexion
            </button>
          ) : null}
        </nav>

        {/* Hamburger (mobile) */}
        <button
          className={`agentheader-burger ${menuOpen ? "is-open" : ""}`}
          type="button"
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuOpen ? "true" : "false"}
          aria-controls="agent-mobile-menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="burger-line" />
          <span className="burger-line" />
          <span className="burger-line" />
        </button>
      </div>

      {/* Mobile menu overlay */}
      <div className={`agentheader-overlay ${menuOpen ? "is-open" : ""}`}>
        <div
          className={`agentheader-drawer ${menuOpen ? "is-open" : ""}`}
          id="agent-mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu mobile"
        >
          <div className="agentheader-drawerTop">
            <div className="agentheader-drawerTitle">Menu</div>
            <button
              className="agentheader-close"
              type="button"
              aria-label="Fermer"
              onClick={() => setMenuOpen(false)}
            >
              ✕
            </button>
          </div>

          <nav className="agentheader-nav agentheader-nav--mobile" aria-label="Navigation mobile">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`agentheader-link agentheader-link--mobile ${
                  isActive(l.to) ? "is-active" : ""
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </Link>
            ))}

            {isAuthed ? (
              <button
                className="agentheader-link agentheader-link--mobile agentheader-btnlink"
                onClick={logout}
                type="button"
              >
                Déconnexion
              </button>
            ) : null}
          </nav>

          {agent ? (
            <div className="agentheader-mobileMeta">
              {/* tu peux afficher agent.nom / agent.email ici si tu veux */}
            </div>
          ) : null}
        </div>

        {/* click outside drawer closes */}
        <button
          className="agentheader-overlayClick"
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setMenuOpen(false)}
        />
      </div>

      {agent ? (
        <div className="agentheader-sub">
          <div className="agentheader-subinner">{/* placeholder */}</div>
        </div>
      ) : null}
    </header>
  );
}
