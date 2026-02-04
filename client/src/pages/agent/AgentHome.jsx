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

  // ✅ NEW
  const [texte, setTexte] = useState("");
  const [savingPdf, setSavingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    navigate("/agent/login");
  };

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const cached = localStorage.getItem(USER_KEY);

    if (!token) return navigate("/agent/login");

    if (cached) {
      try {
        setAgent(JSON.parse(cached));
      } catch {}
    }

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
const submitPdf = async () => {
  setError("");
  setPdfUrl("");

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return navigate("/agent/login");

  if (!texte.trim()) {
    setError("Merci d’écrire un texte avant de valider.");
    return;
  }

  setSavingPdf(true);

  try {
    // 1) Crée le doc en DB
    const res = await fetch(`${API}/api/agents/pdfs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ texte }),
    });

    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();

    // 2) Télécharge le PDF en BLOB (avec Authorization)
    const pdfRes = await fetch(`${API}${data.pdfUrl}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!pdfRes.ok) throw new Error(await pdfRes.text());

    const blob = await pdfRes.blob();
    const blobUrl = URL.createObjectURL(blob);

    // 3) Ouvre le PDF (aucun 401 possible)
    setPdfUrl(blobUrl);
    window.open(blobUrl, "_blank", "noopener,noreferrer");
  } catch (e) {
    console.error(e);
    setError("Impossible de générer le PDF. Réessaie.");
  } finally {
    setSavingPdf(false);
  }
};


  return (
    <div className="agenthome-page">
      <div className="agenthome-card">
        <div className="agenthome-title">Bonjour</div>

        {agent ? (
          <div className="agenthome-text">
            <div>
              <strong>
                {agent.prenom} {agent.nom}
              </strong>
            </div>
            <div>{agent.email}</div>
          </div>
        ) : (
          <div className="agenthome-text">Chargement...</div>
        )}

        {/* ✅ NEW UI */}
        <div className="agenthome-block">
          <label className="agenthome-label">Ton texte</label>
          <textarea
            className="agenthome-textarea"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder="Écris ton texte ici…"
            rows={4}
          />

          <button
            className="agenthome-btn"
            type="button"
            onClick={submitPdf}
            disabled={savingPdf}
          >
            {savingPdf ? "Génération..." : "Valider & Générer PDF"}
          </button>

          {pdfUrl ? (
            <a className="agenthome-pdf" href={pdfUrl} target="_blank" rel="noreferrer">
              Ouvrir le PDF
            </a>
          ) : null}
        </div>

        {error ? <div className="agenthome-error">{error}</div> : null}

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
