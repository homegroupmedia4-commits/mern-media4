// client/src/pages/AdminProduits.jsx
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

// ✅ admin token FIRST (fallback agent token)
function getAuthToken() {
  return (
    localStorage.getItem("admin_token_v1") ||
    localStorage.getItem("agent_token_v1") ||
    localStorage.getItem("token") ||
    ""
  );
}

async function safeJson(res) {
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  if (ct.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      // JSON cassé => on remonte le texte
      throw new Error(text || "Réponse JSON invalide");
    }
  }
  // HTML ou autre => on remonte le texte (souvent index.html)
  throw new Error(text || "Réponse non JSON");
}

export default function AdminProduits() {
  const { API } = useOutletContext();

  const [newName, setNewName] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingAdd, setSavingAdd] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  const authHeaders = () => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const load = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/products`, {
        headers: { ...authHeaders() },
      });

      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 401 || res.status === 403) {
          throw new Error("Non autorisé (token admin/agent manquant ou expiré).");
        }
        throw new Error(txt || "Erreur serveur");
      }

      // ✅ important : évite le crash JSON si HTML renvoyé
      const data = await safeJson(res);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setRows([]);
      setError("Impossible de charger les produits.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API]);

  const add = async () => {
    const name = String(newName || "").trim();
    if (!name) return setError("Nom requis.");

    setSavingAdd(true);
    setError("");

    try {
      const res = await fetch(`${API}/api/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 401 || res.status === 403) {
          throw new Error("Non autorisé (token admin/agent manquant ou expiré).");
        }
        throw new Error(txt || "Erreur serveur");
      }

      const created = await safeJson(res);
      setRows((prev) => [created, ...prev]);
      setNewName("");
    } catch (e) {
      console.error(e);
      setError("Ajout impossible (doublon, token manquant, ou erreur serveur).");
    } finally {
      setSavingAdd(false);
    }
  };

  const startEdit = (row) => {
    setEditingId(row._id);
    setEditingValue(row.name || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue("");
  };

  const saveEdit = async (id) => {
    const name = String(editingValue || "").trim();
    if (!name) return setError("Nom requis.");

    setError("");

    try {
      const res = await fetch(`${API}/api/products/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 401 || res.status === 403) {
          throw new Error("Non autorisé (token admin/agent manquant ou expiré).");
        }
        throw new Error(txt || "Erreur serveur");
      }

      const updated = await safeJson(res);
      setRows((prev) => prev.map((r) => (r._id === id ? updated : r)));
      cancelEdit();
    } catch (e) {
      console.error(e);
      setError("Renommage impossible (doublon, token manquant, ou erreur serveur).");
    }
  };

  const toggleActive = async (row) => {
    setError("");
    try {
      const res = await fetch(`${API}/api/products/${row._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ isActive: !row.isActive }),
      });

      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 401 || res.status === 403) {
          throw new Error("Non autorisé (token admin/agent manquant ou expiré).");
        }
        throw new Error(txt || "Erreur serveur");
      }

      const updated = await safeJson(res);
      setRows((prev) => prev.map((r) => (r._id === row._id ? updated : r)));
    } catch (e) {
      console.error(e);
      setError("Action impossible (token manquant ou erreur serveur).");
    }
  };

  const remove = async (row) => {
    const ok = confirm(`Supprimer le produit "${row.name}" ?`);
    if (!ok) return;

    setError("");
    try {
      const res = await fetch(`${API}/api/products/${row._id}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
      });

      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 401 || res.status === 403) {
          throw new Error("Non autorisé (token admin/agent manquant ou expiré).");
        }
        throw new Error(txt || "Erreur serveur");
      }

      setRows((prev) => prev.filter((r) => r._id !== row._id));
    } catch (e) {
      console.error(e);
      setError("Suppression impossible (token manquant ou erreur serveur).");
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Produits</h2>

        <div className="page-actions">
          <input
            className="input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom du produit (ex: Totems)"
          />
          <button className="btn btn-dark" type="button" onClick={add} disabled={savingAdd}>
            {savingAdd ? "Ajout..." : "Ajouter"}
          </button>
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      <div className="table-wrap">
        {loading ? (
          <div className="muted">Chargement...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "55%" }}>Nom</th>
                <th style={{ width: "15%" }}>Statut</th>
                <th style={{ width: "30%" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const isEditing = editingId === row._id;

                return (
                  <tr key={row._id}>
                    <td>
                      {isEditing ? (
                        <input
                          className="input input-inline"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                        />
                      ) : (
                        <div className="name-chip">{row.name}</div>
                      )}
                    </td>

                    <td>
                      <span className={`badge ${row.isActive ? "on" : "off"}`}>
                        {row.isActive ? "Actif" : "Inactif"}
                      </span>
                    </td>

                    <td>
                      <div className="actions">
                        {isEditing ? (
                          <>
                            <button className="btn btn-outline" type="button" onClick={() => saveEdit(row._id)}>
                              Enregistrer
                            </button>
                            <button className="btn btn-outline" type="button" onClick={cancelEdit}>
                              Annuler
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-outline" type="button" onClick={() => startEdit(row)}>
                              Modifier
                            </button>

                            <button
                              className={`btn ${row.isActive ? "btn-dark" : "btn-outline"}`}
                              type="button"
                              onClick={() => toggleActive(row)}
                            >
                              {row.isActive ? "Désactiver" : "Activer"}
                            </button>

                            <button className="btn btn-outline" type="button" onClick={() => remove(row)}>
                              Supprimer
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">
                    Aucun produit pour l’instant.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
