import { Link, useLocation, useNavigate } from "react-router-dom";
import { TOKEN_KEY, USER_KEY } from "./agentHome.helpers";
import "./AgentHeader.css";
import logo from "../../assets/Media4logo.png";


export default function AgentHeader({ agent }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthed = !!localStorage.getItem(TOKEN_KEY);

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    navigate("/agent/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="agentheader">
      <div className="agentheader-inner">
        <Link to="/agent/home" className="agentheader-brand" aria-label="Media4">
          {/* Remplace par ton logo si tu en as un */}
        <img className="agentheader-logo" src={logo} alt="MEDIA4" />

        </Link>

        <nav className="agentheader-nav">
          <Link
            to="/agent/home"
            className={`agentheader-link ${isActive("/agent/home") ? "is-active" : ""}`}
          >
            Devis
          </Link>

          <Link
            to="/agent/mes-devis"
            className={`agentheader-link ${isActive("/agent/mes-devis") ? "is-active" : ""}`}
          >
            Mes devis
          </Link>

          <Link
            to="/agent/faq"
            className={`agentheader-link ${isActive("/agent/faq") ? "is-active" : ""}`}
          >
            F.A.Q
          </Link>

          {!isAuthed ? (
            <Link
              to="/agent/login"
              className={`agentheader-link ${isActive("/agent/login") ? "is-active" : ""}`}
            >
              Connexion
            </Link>
          ) : (
            <button className="agentheader-link agentheader-btnlink" onClick={logout} type="button">
              Déconnexion
            </button>
          )}
        </nav>
      </div>

      {agent ? (
        <div className="agentheader-sub">
          <div className="agentheader-subinner">
            
          </div>
        </div>
      ) : null}
    </header>
  );
}
