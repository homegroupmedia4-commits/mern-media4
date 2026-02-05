import { useEffect, useMemo, useState } from "react";
import AgentHeader from "./AgentHeader";
import { TOKEN_KEY, USER_KEY, safeJsonParse } from "./agentHome.helpers";
import "./AgentMesDevis.css";

export default function AgentMesDevis() {
  const API = useMemo(
    () => import.meta.env.VITE_API_URL || "https://mern-media4-server.onrender.com",
    []
  );

  const [agent, setAgent] = useState(() => {
    const cached = localStorage.getItem(USER_KEY);
    return cached ? safeJsonParse(cached) : null;
  });

  const [tab, setTab] = useState("other"); // "walleds" | "other"
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      window.location.href = "/agent/login";
      return;
    }

    (async () => {
      setLoading(true);
      setError("");
      try {
        // ✅ IMPORTANT: cet endpoint doit retourner UNIQUEMENT les devis de l'agent connecté
        const res = await fetch(`${API}/api/agents/devis`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setError("Impossible de charger tes devis.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [API]);

  const filtered = rows.filter((d) => {
    // tu peux adapter selon ce que tu stockes :
    // - d.lines (kind)
    // - d.pitchInstances
    // - d.otherSelections
    const hasPitch = Array.isArray(d?.pitchInstances) && d.pitchInstances.length > 0;
    const hasOther = d?.otherSelections && Object.keys(d.otherSelections).length > 0;
    return tab === "walleds" ? hasPitch : hasOther;
  });

  const downloadPdf = async (devisId) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    try {
      // si ton backend renvoie direct un PDF en GET, remplace par un simple window.open
      const res = await fetch(`${API}/api/agents/devis/${devisId}/pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const fileRes = await fetch(`${API}${data.pdfUrl}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!fileRes.ok) throw new Error(await fileRes.text());

      const blob = await fileRes.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error(e);
      alert("Impossible de télécharger ce devis.");
    }
  };

  return (
    <>
      <AgentHeader agent={agent} />

      <div className="agentdevis-page">
        <div className="agentdevis-wrap">
          <h1 className="agentdevis-title">Mes devis</h1>

          <div className="agentdevis-tabs">
            <button
              type="button"
              className={`agentdevis-tab ${tab === "walleds" ? "is-active" : ""}`}
              onClick={() => setTab("walleds")}
            >
              Murs leds
            </button>
            <button
              type="button"
              className={`agentdevis-tab ${tab === "other" ? "is-active" : ""}`}
              onClick={() => setTab("other")}
            >
              Autres produits
            </button>
          </div>

          <div className="agentdevis-tableCard">
            {loading ? <div className="agentdevis-muted">Chargement...</div> : null}
            {error ? <div className="agentdevis-error">{error}</div> : null}

            {!loading && !error ? (
              <div className="agentdevis-tableScroll">
                <table className="agentdevis-table">
                  <thead>
                    <tr>
                      <th>Société</th>
                      <th>Télécharger le devis</th>
                      <th>Nom</th>
                      <th>Prénom</th>
                      <th>Téléphone</th>
                      <th>Email</th>

                      {/* Colonnes "walleds" */}
                      {tab === "walleds" ? (
                        <>
                          <th>Produit</th>
                          <th>Pitch</th>
                          <th>Surface (m²)</th>
                          <th>Largeur (m)</th>
                          <th>Hauteur (m)</th>
                          <th>Durée (mois)</th>
                          <th>Montant HT</th>
                          <th>Code devis</th>
                          <th>Code produit</th>
                          <th>Adresse</th>
                          <th>Adresse 2</th>
                          <th>Code Postal</th>
                          <th>Ville</th>
                          <th>Commentaires</th>
                          <th>Date</th>
                        </>
                      ) : (
                        /* Colonnes "other" */
                        <>
                          <th>Produit</th>
                          <th>Taille sélectionnée</th>
                          <th>Mémoire</th>
                          <th>Prix unitaire</th>
                          <th>Quantité</th>
                          <th>Total</th>
                          <th>Durée leasing (mois)</th>
                          <th>Prix associé</th>
                          <th>Code devis</th>
                          <th>Code produit</th>
                          <th>Adresse</th>
                          <th>Adresse 2</th>
                          <th>Code Postal</th>
                          <th>Ville</th>
                          <th>Commentaires</th>
                          <th>Date</th>
                        </>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map((d) => {
                      const id = d._id || d.id;

                      const c = d.client || {};
                      const created = d.createdAt ? new Date(d.createdAt) : null;
                      const dateStr = created
                        ? created.toLocaleString("fr-FR", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" })
                        : "";

                      // Pour afficher "1 ligne = 1 devis" comme sur tes screenshots :
                      // - côté other: tu peux afficher un récap (ou une ligne par item, selon ta structure)
                      // - ici on affiche une ligne “résumé” (tu pourras détailler ensuite)
                      const devisNumber = d.devisNumber || "";

                      if (tab === "walleds") {
                        const firstPitch = Array.isArray(d.pitchInstances) ? d.pitchInstances[0] : null;

                        return (
                          <tr key={id}>
                            <td>{c.societe || ""}</td>
                            <td>
                              <button
                                className="agentdevis-download"
                                type="button"
                                onClick={() => downloadPdf(id)}
                              >
                                Télécharger le devis
                              </button>
                            </td>
                            <td>{c.nom || ""}</td>
                            <td>{c.prenom || ""}</td>
                            <td>{c.telephone || ""}</td>
                            <td>{c.email || ""}</td>

                            <td>Murs leds</td>
                            <td>{firstPitch?.pitchLabel || ""}</td>
                            <td>{firstPitch?.surfaceM2 || ""}</td>
                            <td>{firstPitch?.largeurM || ""}</td>
                            <td>{firstPitch?.hauteurM || ""}</td>
                            <td>{firstPitch?.financementMonths || ""}</td>
                            <td>{firstPitch?.montantHt || ""}</td>
                            <td>{devisNumber}</td>
                            <td>{firstPitch?.pitchId || firstPitch?.codeProduit || ""}</td>
                            <td>{c.adresse1 || ""}</td>
                            <td>{c.adresse2 || ""}</td>
                            <td>{c.codePostal || ""}</td>
                            <td>{c.ville || ""}</td>
                            <td>{c.commentaires || ""}</td>
                            <td>{dateStr}</td>
                          </tr>
                        );
                      }

                      // other
                      // Ici on met un “résumé” (à adapter selon la forme exacte de otherSelections)
                      const anyOther = d.otherSelections || {};
                      const firstKey = Object.keys(anyOther)[0];
                      const first = firstKey ? anyOther[firstKey] : null;

                      return (
                        <tr key={id}>
                          <td>{c.societe || ""}</td>
                          <td>
                            <button
                              className="agentdevis-download"
                              type="button"
                              onClick={() => downloadPdf(id)}
                            >
                              Télécharger le devis
                            </button>
                          </td>
                          <td>{c.nom || ""}</td>
                          <td>{c.prenom || ""}</td>
                          <td>{c.telephone || ""}</td>
                          <td>{c.email || ""}</td>

                          <td>{first?.productName || first?.produit || ""}</td>
                          <td>{first?.size || first?.taille || ""}</td>
                          <td>{first?.memory || first?.memoire || ""}</td>
                          <td>{first?.unitPrice || first?.prixUnitaire || ""}</td>
                          <td>{first?.qty || first?.quantite || ""}</td>
                          <td>{first?.total || first?.totalHt || ""}</td>
                          <td>{first?.months || first?.duree || ""}</td>
                          <td>{first?.associatedPrice || first?.prixAssocie || ""}</td>
                          <td>{devisNumber}</td>
                          <td>{first?.codeProduit || ""}</td>
                          <td>{c.adresse1 || ""}</td>
                          <td>{c.adresse2 || ""}</td>
                          <td>{c.codePostal || ""}</td>
                          <td>{c.ville || ""}</td>
                          <td>{c.commentaires || ""}</td>
                          <td>{dateStr}</td>
                        </tr>
                      );
                    })}

                    {filtered.length === 0 && !loading ? (
                      <tr>
                        <td colSpan={tab === "walleds" ? 17 : 17} className="agentdevis-empty">
                          Aucun devis.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
