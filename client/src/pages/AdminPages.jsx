// client/src/pages/AdminPages.jsx
import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

const safe = (v) => String(v ?? "").trim();

function getAdminToken() {
  return (
    localStorage.getItem("admin_token_v1") ||
    localStorage.getItem("agent_token_v1") ||
    localStorage.getItem("token") ||
    ""
  );
}

export default function AdminPages() {
  const { API } = useOutletContext(); // comme tes autres pages admin

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // form
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPwa, setIsPwa] = useState(true);
  const [pwaName, setPwaName] = useState("");
  const [pwaThemeColor, setPwaThemeColor] = useState("#000000");

  const normSlug = (s) =>
    safe(s)
      .toLowerCase()
      .replace(/[^a-z0-9-_/]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^\/+|\/+$/g, "");

  async function fetchList() {
    setLoading(true);
    setErr("");

    const token = getAdminToken();
    if (!token) {
      setLoading(false);
      setErr("Token manquant. Connecte-toi (admin) pour charger les pages.");
      return;
    }

    try {
      const r = await fetch(`${API}/api/pages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "ERR");
      setList(j.pages || []);
    } catch (e) {
      setErr("Impossible de charger les pages (token ?)");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createPage(e) {
    e.preventDefault();
    setErr("");

    const token = getAdminToken();
    if (!token) return alert("Token manquant. Connecte-toi (admin).");

    const payload = {
      slug: normSlug(slug || title),
      title: safe(title),
      content: safe(content) || safe(title),
      isPwa: !!isPwa,
      pwaName: safe(pwaName) || safe(title) || normSlug(slug || title),
      pwaThemeColor: safe(pwaThemeColor) || "#000000",
    };

    if (!payload.slug) return alert("Slug requis");

    try {
      const r = await fetch(`${API}/api/pages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) return alert(j?.error || "Erreur création");

      // reset
      setSlug("");
      setTitle("");
      setContent("");
      setIsPwa(true);
      setPwaName("");
      setPwaThemeColor("#000000");

      fetchList();
    } catch {
      alert("Erreur réseau");
    }
  }

  async function removePage(s) {
    setErr("");
    const token = getAdminToken();
    if (!token) return alert("Token manquant. Connecte-toi (admin).");

    if (!window.confirm(`Supprimer /${s} ?`)) return;

    try {
      const r = await fetch(`${API}/api/pages/${encodeURIComponent(s)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) return alert(j?.error || "Erreur suppression");

      fetchList();
    } catch {
      alert("Erreur réseau");
    }
  }

  function openPage(s) {
    window.open(`/${s}/`, "_blank");
  }

  return (
    <div style={{ padding: 18 }}>
      <h2 style={{ margin: 0 }}>Pages dynamiques</h2>
      <p style={{ marginTop: 6, opacity: 0.8 }}>
        Crée une page par slug (ex: <b>/electo</b>). Si <b>PWA</b> est activé, la page devient installable.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "420px 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* FORM */}
        <form
          onSubmit={createPage}
          style={{
            border: "1px solid #e6e8ef",
            borderRadius: 12,
            padding: 14,
            background: "#fff",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Créer une page</h3>

          <label>Slug (optionnel)</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="electo"
            style={styles.input}
          />

          <label>Titre</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Electo"
            style={styles.input}
            required
          />

          <label>Contenu (texte)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Electo"
            style={styles.textarea}
          />

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
            <input
              type="checkbox"
              checked={isPwa}
              onChange={(e) => setIsPwa(e.target.checked)}
            />
            <span>Activer PWA</span>
          </div>

          <label style={{ marginTop: 10 }}>Nom PWA (optionnel)</label>
          <input
            value={pwaName}
            onChange={(e) => setPwaName(e.target.value)}
            placeholder="Electo"
            style={styles.input}
          />

          <label>Theme color</label>
          <input
            value={pwaThemeColor}
            onChange={(e) => setPwaThemeColor(e.target.value)}
            placeholder="#000000"
            style={styles.input}
          />

          <button type="submit" style={styles.btn}>
            Créer
          </button>

          {err && <div style={{ marginTop: 10, color: "#b00020" }}>{err}</div>}
        </form>

        {/* LIST */}
        <div
          style={{
            border: "1px solid #e6e8ef",
            borderRadius: 12,
            padding: 14,
            background: "#fff",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Pages existantes</h3>
            <button onClick={fetchList} style={styles.btnSmall} type="button">
              Rafraîchir
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 10 }}>Chargement…</div>
          ) : list.length === 0 ? (
            <div style={{ padding: 10 }}>Aucune page.</div>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {list.map((p) => (
                <div key={p.slug} style={{ border: "1px solid #eef0f6", borderRadius: 10, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>/{p.slug}</div>
                      <div style={{ opacity: 0.8 }}>{safe(p.title) || p.slug}</div>
                      <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>
                        PWA: <b>{p.isPwa ? "oui" : "non"}</b>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button type="button" style={styles.btnSmall} onClick={() => openPage(p.slug)}>
                        Ouvrir
                      </button>
                      <button type="button" style={styles.btnDanger} onClick={() => removePage(p.slug)}>
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  input: {
    width: "100%",
    height: 38,
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #d9dce7",
    margin: "6px 0 10px",
  },
  textarea: {
    width: "100%",
    minHeight: 110,
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #d9dce7",
    margin: "6px 0 10px",
    resize: "vertical",
  },
  btn: {
    marginTop: 10,
    width: "100%",
    height: 40,
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    background: "#0b5",
    color: "#fff",
    fontWeight: 700,
  },
  btnSmall: {
    height: 34,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid #d9dce7",
    background: "#fff",
    cursor: "pointer",
  },
  btnDanger: {
    height: 34,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid #ffd1d1",
    background: "#fff",
    color: "#b00020",
    cursor: "pointer",
  },
};
