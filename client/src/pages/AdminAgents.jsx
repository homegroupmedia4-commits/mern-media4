import { useEffect, useState } from "react";

export default function AdminAgents({ API }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const formatDate = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("fr-FR");
    } catch {
      return iso;
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API}/api/agents/admin/list`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setAgents(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setError("Impossible de charger la liste des agents.");
      } finally {
        setLoading(false);
      }
    })();
  }, [API]);

  return (
    <div className="card">
      <div className="card-title">Agents inscrits</div>
      <div className="card-text" style={{ marginBottom: 12 }}>
        Liste de tous les agents enregistrés via <code>/agent/register</code>.
      </div>

      {loading ? <div className="card-text">Chargement…</div> : null}
      {error ? <div className="login-error">{error}</div> : null}

      {!loading && !error ? (
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[
                  "Nom",
                  "Prénom",
                  "Email",
                  "Rôle",
                  "Société",
                  "Téléphone",
                  "Ville",
                  "Pays",
                  "Créé le",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 8px",
                      borderBottom: "1px solid #e6e8ef",
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {agents.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 12 }}>
                    Aucun agent pour l’instant.
                  </td>
                </tr>
              ) : (
                agents.map((a) => (
                  <tr key={a._id}>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f2f7" }}>
                      {a.nom || "—"}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f2f7" }}>
                      {a.prenom || "—"}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f2f7" }}>
                      {a.email || "—"}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f2f7" }}>
                      {a.role || "—"}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f2f7" }}>
                      {a.societe || "—"}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f2f7" }}>
                      {a.telephonePortable || a.telephoneFixe || "—"}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f2f7" }}>
                      {a.ville || "—"}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f2f7" }}>
                      {a.pays || "—"}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f2f7" }}>
                      {formatDate(a.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
