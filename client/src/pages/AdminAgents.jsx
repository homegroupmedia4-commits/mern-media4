// client/src/pages/AdminAgents.jsx
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

const [editing, setEditing] = useState(null); // agent sélectionné
const [editForm, setEditForm] = useState(null);
const [savingEdit, setSavingEdit] = useState(false);

const openEdit = (agent) => {
  setEditing(agent);
  setEditForm({
    nom: agent?.nom || "",
    prenom: agent?.prenom || "",
    email: agent?.email || "",
    role: agent?.role || "agent",
    parrainId: agent?.parrainId?._id || agent?.parrainId || "",
    societe: agent?.societe || "",
    siret: agent?.siret || "",
    adresse: agent?.adresse || "",
    codePostal: agent?.codePostal || "",
    ville: agent?.ville || "",
    telephonePortable: agent?.telephonePortable || "",
    telephoneFixe: agent?.telephoneFixe || "",
    pays: agent?.pays || "France",
  });
};

const closeEdit = () => {
  setEditing(null);
  setEditForm(null);
};



const saveEdit = async () => {
  if (!editing?._id) return;
  setSavingEdit(true);
  setError("");

  try {
    const res = await fetch(`${API}/api/agents/admin/agents/${editing._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(editForm),
    });

    if (!res.ok) throw new Error(await res.text());
    const updated = await res.json();

    // ✅ update UI
    setAgents((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));

    closeEdit();
  } catch (e) {
    console.error(e);
    try {
      const parsed = JSON.parse(String(e.message || ""));
      setError(parsed?.message || "Impossible de mettre à jour l’agent.");
    } catch {
      setError("Impossible de mettre à jour l’agent.");
    }
  } finally {
    setSavingEdit(false);
  }
};




// ✅ admin token FIRST (fallback agent token)
function getAuthToken() {
  return (
    localStorage.getItem("admin_token_v1") ||
    localStorage.getItem("agent_token_v1") ||
    localStorage.getItem("token") ||
    ""
  );
}

export default function AdminAgents() {
  const { API } = useOutletContext();

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

  const authHeaders = () => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API}/api/agents/admin/list`, {
          headers: authHeaders(),
        });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  "Parrain",
  "Société",
  "SIRET",
  "Adresse",
  "Code postal",
  "Ville",
  "Téléphone portable",
  "Téléphone fixe",
  "Pays",
  "Créé le",
  "Edit",
].map((h) =>  (
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
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f2f7" }}>{a.nom || "—"}</td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f2f7" }}>{a.prenom || "—"}</td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f2f7" }}>{a.email || "—"}</td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f2f7" }}>{a.role || "—"}</td>

                      <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f2f7" }}>
    {a.parrainId
      ? `${a.parrainId?.prenom || ""} ${a.parrainId?.nom || ""}`.trim() || a.parrainId?.email || "—"
      : "—"}
  </td>


                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f2f7" }}>{a.societe || "—"}</td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f2f7" }}>{a.siret || "—"}</td>

                     <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f2f7" }}>{a.adresse || "—"}</td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f2f7" }}>{a.codePostal || "—"}</td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f2f7" }}>{a.ville || "—"}</td>

                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f2f7" }}>
                      {a.telephonePortable || "—"}
                    </td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f2f7" }}>
                     {a.telephoneFixe || "—"}
                    </td>
               
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f2f7" }}>{a.pays || "—"}</td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f2f7" }}>{formatDate(a.createdAt)}</td>
                     <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f2f7" }}>  <button className="btn" type="button" onClick={() => openEdit(a)}>
      Éditer
    </button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {editing && editForm ? (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.35)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      zIndex: 9999,
    }}
    onMouseDown={closeEdit}
  >
    <div
      style={{
        width: "min(920px, 100%)",
        background: "#fff",
        borderRadius: 12,
        padding: 16,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ fontWeight: 800 }}>Éditer l’agent</div>
        <button className="btn" type="button" onClick={closeEdit}>Fermer</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        {[
          ["nom", "Nom"],
          ["prenom", "Prénom"],
          ["email", "Email"],
          ["societe", "Société"],
          ["siret", "SIRET"],
          ["adresse", "Adresse"],
          ["codePostal", "Code postal"],
          ["ville", "Ville"],
          ["telephonePortable", "Téléphone portable"],
          ["telephoneFixe", "Téléphone fixe"],
          ["pays", "Pays"],
        ].map(([k, label]) => (
          <div key={k}>
            <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>{label}</label>
            <input
              value={editForm[k] ?? ""}
              onChange={(e) => setEditForm((p) => ({ ...p, [k]: e.target.value }))}
              style={{ width: "100%", padding: 10, border: "1px solid #e6e8ef", borderRadius: 10 }}
            />
          </div>
        ))}

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Rôle</label>
          <select
            value={editForm.role}
            onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
            style={{ width: "100%", padding: 10, border: "1px solid #e6e8ef", borderRadius: 10 }}
          >
            <option value="agent">agent</option>
            <option value="technicien">technicien</option>
            <option value="responsable">responsable</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Parrain (ObjectId ou vide)</label>
          <input
            value={editForm.parrainId ?? ""}
            onChange={(e) => setEditForm((p) => ({ ...p, parrainId: e.target.value }))}
            style={{ width: "100%", padding: 10, border: "1px solid #e6e8ef", borderRadius: 10 }}
            placeholder="ex: 65f.... (vide = aucun)"
          />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
        <button className="btn" type="button" onClick={closeEdit}>Annuler</button>
        <button className="btn" type="button" onClick={saveEdit} disabled={savingEdit}>
          {savingEdit ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </div>
  </div>
) : null}



        </div>
      ) : null}
    </div>
  );
}
