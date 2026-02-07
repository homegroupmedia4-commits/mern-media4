import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import CategoriesPitch from "./CategoriesPitch";

export default function CategoriePitchPage() {
  const { API } = useOutletContext();
  return <CategoriesPitch API={API} />;
}


export default function CategoriesPitch({ API }) {
  const [newName, setNewName] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingAdd, setSavingAdd] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/pitch-categories`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les catégories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addCategory = async () => {
    const name = newName.trim();
    if (!name) return;

    setSavingAdd(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/pitch-categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();

      setRows((prev) => [created, ...prev]);
      setNewName("");
    } catch (e) {
      console.error(e);
      setError("Ajout impossible (doublon ou erreur serveur).");
    } finally {
      setSavingAdd(false);
    }
  };

  const startEdit = (row) => {
    setEditingId(row._id);
    setEditingValue(row.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue("");
  };

  const saveEdit = async (id) => {
    const name = editingValue.trim();
    if (!name) return;

    setError("");
    try {
      const res = await fetch(`${API}/api/pitch-categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();

      setRows((prev) => prev.map((r) => (r._id === id ? updated : r)));
      cancelEdit();
    } catch (e) {
      console.error(e);
      setError("Renommage impossible (doublon ou erreur serveur).");
    }
  };

  const toggleActive = async (row) => {
    setError("");
    try {
      const res = await fetch(`${API}/api/pitch-categories/${row._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !row.isActive }),
      });

      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();

      setRows((prev) => prev.map((r) => (r._id === row._id ? updated : r)));
    } catch (e) {
      console.error(e);
      setError("Action impossible (erreur serveur).");
    }
  };

  const remove = async (row) => {
    const ok = confirm(`Supprimer la catégorie "${row.name}" ?`);
    if (!ok) return;

    setError("");
    try {
      const res = await fetch(`${API}/api/pitch-categories/${row._id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error(await res.text());
      setRows((prev) => prev.filter((r) => r._id !== row._id));
    } catch (e) {
      console.error(e);
      setError("Suppression impossible (erreur serveur).");
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Catégories de pitch</h2>

        <div className="page-actions">
          <input
            className="input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nouveau groupe"
          />
          <button className="btn btn-dark" type="button" onClick={addCategory} disabled={savingAdd}>
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
                    Aucune catégorie pour l’instant.
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
