import { useEffect, useMemo, useState } from "react";

const fmtDate = (iso) => {
  try {
    return new Date(iso).toISOString().replace("T", " ").slice(0, 19);
  } catch {
    return "";
  }
};

const norm = (v) => String(v || "").trim();

export default function AdminNosDevis({ API }) {
  const [tab, setTab] = useState("murs_leds"); // "murs_leds" | "autres_produits"
  const [q, setQ] = useState("");
  const [agentId, setAgentId] = useState("");

  const [agents, setAgents] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAgents = async () => {
    try {
      const res = await fetch(`${API}/api/agents/agents-lite`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAgents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      // non bloquant
    }
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const url =
        `${API}/api/agents/devis?tab=${encodeURIComponent(tab)}` +
        `&q=${encodeURIComponent(q)}` +
        `&agentId=${encodeURIComponent(agentId)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les devis.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, agentId]);

  // reload “debounce light” sur search
  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const openPdf = (id) => {
    window.open(`${API}/api/agents/devis/${id}/pdf`, "_blank", "noopener,noreferrer");
  };

  // -----------------------------
  // Build rows view
  // -----------------------------
  const mursRows = useMemo(() => {
    // on “explose” un devis -> 1 ligne par pitch instance
    const out = [];
    for (const d of rows) {
      const list = Array.isArray(d.pitchInstances) ? d.pitchInstances : [];
      if (!list.length) continue;

      for (const pi of list) {
        out.push({
          devisId: d._id,
          devisNumber: d.devisNumber,
          createdAt: d.createdAt,
          agentEmail: d.agentSnapshot?.email || "",
          agentName: [d.agentSnapshot?.prenom, d.agentSnapshot?.nom].filter(Boolean).join(" "),
          client: d.client || {},
          pi,
        });
      }
    }
    return out;
  }, [rows]);

  const otherRows = useMemo(() => {
    // on “explose” otherSelections -> 1 ligne par taille cochée
    const out = [];
    for (const d of rows) {
      const sel = d.otherSelections || {};
      const pids = Object.keys(sel);
      if (!pids.length) continue;

      for (const pid of pids) {
        const cfg = sel[pid] || {};
        const leasingMonths = cfg.leasingMonths || "";
        const checked = cfg.checked || {};
        for (const rowId of Object.keys(checked)) {
          const line = checked[rowId] || {};
          out.push({
            devisId: d._id,
            devisNumber: d.devisNumber,
            createdAt: d.createdAt,
            agentEmail: d.agentSnapshot?.email || "",
            agentName: [d.agentSnapshot?.prenom, d.agentSnapshot?.nom].filter(Boolean).join(" "),
            client: d.client || {},
            productId: pid,
            rowId,
            leasingMonths,
            memId: line.memId || "",
            qty: line.qty || 1,
          });
        }
      }
    }
    return out;
  }, [rows]);

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Nos devis</h2>
      </div>

      <div className="subtabs" style={{ marginBottom: 12 }}>
        <button
          className={`subtab ${tab === "murs_leds" ? "active" : ""}`}
          type="button"
          onClick={() => setTab("murs_leds")}
        >
          Murs leds
        </button>
        <button
          className={`subtab ${tab === "autres_produits" ? "active" : ""}`}
          type="button"
          onClick={() => setTab("autres_produits")}
        >
          Autres produits
        </button>
      </div>

      <div className="page-actions" style={{ marginBottom: 12 }}>
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher..."
        />

        <select className="input" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
          <option value="">Tous les utilisateurs</option>
          {agents.map((a) => (
            <option key={a._id} value={a._id}>
              {norm(a.prenom)} {norm(a.nom)} {a.email ? `(${a.email})` : ""}
            </option>
          ))}
        </select>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      <div className="table-wrap">
        {loading ? (
          <div className="muted">Chargement...</div>
        ) : tab === "murs_leds" ? (
          <div style={{ overflow: "auto" }}>
            <table className="table table-wide">
              <thead>
                <tr>
                  <th>Code devis</th>
                  <th>Produit</th>
                  <th>Code produit</th>
                  <th>Pitch</th>
                  <th>Catégorie</th>
                  <th>Utilisateur</th>
                  <th>Date et heure</th>

                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Société</th>
                  <th>Adresse</th>
                  <th>Code Postal</th>
                  <th>Ville</th>
                  <th>Téléphone</th>
                  <th>Email</th>
                  <th>Commentaires</th>

                  <th>Surface (m²)</th>
                  <th>Diagonale (cm)</th>
                  <th>Durée (mois)</th>
                  <th>Total HT</th>
                  <th>Quantité</th>
                  <th>Montant HT</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {mursRows.map((r, idx) => {
                  const pi = r.pi || {};
                  const c = r.client || {};
                  const address = [c.adresse1, c.adresse2].filter(Boolean).join(" ");
                  return (
                    <tr key={`${r.devisId}_${idx}`}>
                      <td>{r.devisNumber || "—"}</td>
                      <td>Murs leds</td>
                      <td>{pi?.pitchId || "—"}</td>
                      <td>{pi?.pitchLabel || "—"}</td>
                      <td>{pi?.resolutionLabel || "—"}</td>
                      <td>{r.agentEmail || r.agentName || "—"}</td>
                      <td>{fmtDate(r.createdAt)}</td>

                      <td>{c.nom || "—"}</td>
                      <td>{c.prenom || "—"}</td>
                      <td>{c.societe || "—"}</td>
                      <td>{address || "—"}</td>
                      <td>{c.codePostal || "—"}</td>
                      <td>{c.ville || "—"}</td>
                      <td>{c.telephone || "—"}</td>
                      <td>{c.email || "—"}</td>
                      <td>{c.commentaires || "—"}</td>

                      <td>{pi.surfaceM2 ?? "—"}</td>
                      <td>{pi.diagonaleCm ?? "—"}</td>
                      <td>{pi.financementMonths ?? "—"}</td>
                      <td>{pi.prixTotalHtMois ?? "—"}</td>
                      <td>{pi.quantite ?? "—"}</td>
                      <td>{pi.montantHt ?? "—"}</td>

                      <td>
                        <button className="btn btn-dark" type="button" onClick={() => openPdf(r.devisId)}>
                          Voir
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {mursRows.length === 0 ? (
                  <tr>
                    <td className="muted" colSpan={23}>
                      Aucun devis.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ overflow: "auto" }}>
            <table className="table table-wide">
              <thead>
                <tr>
                  <th>Code devis</th>
                  <th>Taille sélectionnée</th>
                  <th>Mémoire</th>
                  <th>Prix unitaire</th>
                  <th>Quantité</th>
                  <th>Total</th>

                  <th>Taille (pouces)</th>
                  <th>Durée leasing (mois)</th>
                  <th>Prix associé</th>

                  <th>Commentaires</th>
                  <th>Utilisateur</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {otherRows.map((r) => {
                  // Ici on n’a pas le détail “sizeInches / mem label / prix”
                  // => on affiche les ids + qty (et on ouvrira ensuite une V2 si tu veux)
                  const c = r.client || {};
                  return (
                    <tr key={`${r.devisId}_${r.productId}_${r.rowId}`}>
                      <td>{r.devisNumber || "—"}</td>
                      <td>{r.rowId}</td>
                      <td>{r.memId || "—"}</td>
                      <td>—</td>
                      <td>{r.qty}</td>
                      <td>—</td>

                      <td>—</td>
                      <td>{r.leasingMonths || "—"} mois</td>
                      <td>—</td>

                      <td>{c.commentaires || "—"}</td>
                      <td>{r.agentEmail || r.agentName || "—"}</td>
                      <td>{fmtDate(r.createdAt)}</td>
                      <td>
                        <button className="btn btn-dark" type="button" onClick={() => openPdf(r.devisId)}>
                          Voir
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {otherRows.length === 0 ? (
                  <tr>
                    <td className="muted" colSpan={13}>
                      Aucun devis.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="muted" style={{ paddingTop: 10 }}>
        Astuce : tape un code devis (ex: DE01049) ou un email pour filtrer.
      </div>
    </div>
  );
}
