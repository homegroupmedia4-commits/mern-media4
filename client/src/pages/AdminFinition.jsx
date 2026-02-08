// client/src/pages/AdminFinition.jsx
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

function getAuthToken() {
  return (
    localStorage.getItem("admin_token_v1") ||
    localStorage.getItem("agent_token_v1") ||
    localStorage.getItem("token") ||
    ""
  );
}

export default function AdminFinition() {
  const { API } = useOutletContext();

  const [name, setName] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const authHeaders = (json = false) => {
    const token = getAuthToken();
    const base = token ? { Authorization: `Bearer ${token}` } : {};
    return json ? { ...base, "Content-Type": "application/json" } : base;
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/finishes`, { headers: authHeaders(false) });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les finitions.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = async () => {
    setError("");
    const payload = { name: String(name || "").trim() };
    if (!payload.name) return setError("Nom requis.");

    setSaving(true);
    try {
      const res = await fetch(`${API}/api/finishes`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      setRows((p) => [created, ...p]);
      setName("");
    } catch (e) {
      console.error(e);
      setError("Ajout impossible (doublon ou erreur serveur).");
    } finally {
      setSaving(false);
    }
  };

  const rename = async (row) => {
    const next = prompt("Nouveau nom :", row.name);
    if (next == null) return;
    const newName = String(next).trim();
    if (!newName) return;

    setError("");
    try {
      const res = await fetch(`${API}/api/finishes/${row._id}`, {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setRows((p) => p.map((r) => (r._id === row._id ? updated : r)));
    } catch (e) {
      console.error(e);
      setError("Renommage impossible.");
    }
  };

  const toggle = async (row) => {
    setError("");
    try {
      const res = await fetch(`${API}/api/finishes/${row._id}`, {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setRows((p) => p.map((r) => (r._id === row._id ? updated : r)));
    } catch (e) {
      console.error(e);
      setError("Action impossible.");
    }
  };

  const remove = async (row) => {
    const ok = confirm(`Supprimer "${row.name}" ?`);
    if (!ok) return;

    setError("");
    try {
      const res = await fetch(`${API}/api/finishes/${row._id}`, {
        method: "DELETE",
        headers: authHeaders(false),
      });
      if (!res.ok) throw new Error(await res.text());
      setRows((p) => p.filter((r) => r._id !== row._id));
    } catch (e) {
      console.error(e);
      setError("Suppression impossible.");
    }
  };

  return (
    <div className="card">
      <div className="card-title">Finition</div>

      <div className="page-actions" style={{ flexWrap: "wrap", marginBottom: 12 }}>
        <input
          className="input"
          placeholder="Nom (ex: Mat / Brillant)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button className="btn btn-dark" type="button" onClick={add} disabled={saving}>
          {saving ? "Ajout..." : "Ajouter"}
        </button>

        <button className="btn btn-outline" type="button" onClick={load} disabled={loading || saving}>
          Rafraîchir
        </button>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      {loading ? (
        <div className="muted">Chargement...</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th style={{ width: 120 }}>Statut</th>
                <th style={{ width: 320 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id}>
                  <td>{row.name}</td>
                  <td>
                    <span className={`badge ${row.isActive ? "on" : "off"}`}>
                      {row.isActive ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <button className="btn btn-outline" type="button" onClick={() => rename(row)}>
                        Renommer
                      </button>
                      <button
                        className={`btn ${row.isActive ? "btn-dark" : "btn-outline"}`}
                        type="button"
                        onClick={() => toggle(row)}
                      >
                        {row.isActive ? "Désactiver" : "Activer"}
                      </button>
                      <button className="btn btn-outline" type="button" onClick={() => remove(row)}>
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">
                    Aucune finition.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
