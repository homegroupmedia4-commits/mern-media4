import { useEffect, useMemo, useState } from "react";
import AgentHeader from "./AgentHeader";
import { USER_KEY } from "./agentHome.helpers";

function FaqItem({ q, children, isOpen, onToggle }) {
  return (
    <div style={{ border: "1px solid #d9dde7", background: "#fff", margin: 0 }}>
      <button
        type="button"
        onClick={onToggle}
        style={{ width: "100%", display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", padding: "12px 14px", border: 0, background: "transparent", cursor: "pointer", textAlign: "left" }}
        aria-expanded={isOpen}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>–</span>
          <span style={{ fontWeight: 800, fontSize: 14, color: "#213547" }}>{q}</span>
        </div>
        <span style={{ fontSize: 16, opacity: 0.8 }}>{isOpen ? "▾" : "▸"}</span>
      </button>
      {isOpen && (
        <div style={{ padding: "18px 16px", color: "#213547", lineHeight: 1.7, borderTop: "1px solid #d9dde7", whiteSpace: "pre-wrap" }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function AgentFaq() {
  const agent = useMemo(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  const role = String(agent?.role || "agent");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openIdx, setOpenIdx] = useState({});
  const [search, setSearch] = useState("");

  const API = window.location.origin;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/faq`);
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filtre par rôle
  const filtered = items.filter((item) => {
    if (item.role === "tous") return true;
    if (item.role === role) return true;
    if (role === "responsable") return true;
    return false;
  });

  // Filtre par recherche
  const searched = search.trim()
    ? filtered.filter((item) => {
        const s = search.trim().toLowerCase();
        return (item.question || "").toLowerCase().includes(s) || (item.answer || "").toLowerCase().includes(s);
      })
    : filtered;

  // Grouper par catégorie
  const grouped = searched.reduce((acc, item) => {
    const cat = item.category || "Général";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div style={{ background: "#f6f7fb", minHeight: "100vh", color: "#213547" }}>
      <AgentHeader agent={agent} />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px 40px" }}>
        <h1 style={{ margin: 0, fontSize: 40, fontWeight: 1000 }}>FAQ</h1>

        <input
          type="search"
          placeholder="Rechercher une question…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginTop: 16, width: "100%", height: 40, border: "1px solid #d9dde7", borderRadius: 10, padding: "0 12px", fontSize: 14, outline: "none", background: "#fff", color: "#213547", boxSizing: "border-box" }}
        />

        {loading && <div style={{ marginTop: 20, color: "#9ca3af" }}>Chargement...</div>}

        {!loading && searched.length === 0 && (
          <div style={{ marginTop: 20, color: "#9ca3af" }}>Aucune entrée FAQ disponible.</div>
        )}

        {Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} style={{ marginTop: 24 }}>
            <h2 style={{ margin: "0 0 10px 0", fontSize: 22, fontWeight: 900 }}>{cat}</h2>
            <div style={{ display: "grid", gap: 0 }}>
              {catItems.map((item, idx) => {
                const key = item._id;
                const isOpen = openIdx[key] === true;
                return (
                  <div key={key} style={{ borderTop: idx === 0 ? "1px solid #d9dde7" : 0 }}>
                    <FaqItem
                      q={item.question}
                      isOpen={isOpen}
                      onToggle={() => setOpenIdx((p) => ({ ...p, [key]: !p[key] }))}
                    >
                      {item.answer}
                    </FaqItem>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
