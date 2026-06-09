import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

const ROLES = ["agent", "technicien", "tous"];
const EMPTY = { question: "", answer: "", category: "", role: "agent", order: 0, isActive: true };

export default function AdminFaq() {
  const { API } = useOutletContext();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = localStorage.getItem("admin_token_v1") || localStorage.getItem("agent_token_v1");

  const load = async () => {
    try {
      const res = await fetch(`${API}/api/faq/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError("Erreur chargement FAQ.");
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    setError(""); setSuccess("");
    if (!form.question.trim() || !form.answer.trim()) {
      setError("Question et réponse obligatoires.");
      return;
    }
    setLoading(true);
    try {
      const url = editId ? `${API}/api/faq/${editId}` : `${API}/api/faq`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setSuccess(editId ? "Modifié !" : "Ajouté !");
      setForm(EMPTY);
      setEditId(null);
      load();
    } catch {
      setError("Erreur sauvegarde.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ?")) return;
    await fetch(`${API}/api/faq/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    load();
  };

  const handleEdit = (item) => {
    setEditId(item._id);
    setForm({
      question: item.question,
      answer: item.answer,
      category: item.category || "",
      role: item.role || "agent",
      order: item.order || 0,
      isActive: item.isActive !== false,
    });
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      <h2 style={{ marginBottom: 20 }}>Gestion FAQ</h2>

      {/* Formulaire */}
      <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20, marginBottom: 28 }}>
        <h3 style={{ marginBottom: 14 }}>{editId ? "Modifier" : "Ajouter"} une entrée</h3>

        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Question *</label>
            <input
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6 }}
              value={form.question}
              onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Réponse *</label>
            <textarea
              rows={4}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6 }}
              value={form.answer}
              onChange={(e) => setForm((p) => ({ ...p, answer: e.target.value }))}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 12 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Catégorie</label>
              <input
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6 }}
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Rôle</label>
              <select
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6 }}
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Ordre</label>
              <input
                type="number"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6 }}
                value={form.order}
                onChange={(e) => setForm((p) => ({ ...p, order: Number(e.target.value) }))}
              />
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
            />
            Actif
          </label>
        </div>

        {error && <div style={{ color: "red", marginTop: 10 }}>{error}</div>}
        {success && <div style={{ color: "green", marginTop: 10 }}>{success}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ padding: "8px 20px", background: "#8bc53f", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}
          >
            {loading ? "..." : editId ? "Modifier" : "Ajouter"}
          </button>
          {editId && (
            <button
              onClick={() => { setEditId(null); setForm(EMPTY); }}
              style={{ padding: "8px 20px", background: "#6b7280", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
            >
              Annuler
            </button>
          )}
        </div>
      </div>

      {/* Liste */}
      <div style={{ display: "grid", gap: 10 }}>
        {items.map((item) => (
          <div key={item._id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 14, background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{item.question}</div>
                <div style={{ color: "#6b7280", fontSize: 13, whiteSpace: "pre-wrap" }}>{item.answer}</div>
                <div style={{ marginTop: 6, fontSize: 12, color: "#9ca3af" }}>
                  Catégorie : {item.category || "—"} · Rôle : {item.role} · Ordre : {item.order} · {item.isActive ? "✅ Actif" : "❌ Inactif"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={() => handleEdit(item)} style={{ padding: "6px 12px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
                  Modifier
                </button>
                <button onClick={() => handleDelete(item._id)} style={{ padding: "6px 12px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div style={{ color: "#9ca3af" }}>Aucune entrée FAQ.</div>}
      </div>
    </div>
  );
}
