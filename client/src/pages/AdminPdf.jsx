// client/src/pages/AdminPdf.jsx
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

function getAuthToken() {
  return (
    localStorage.getItem("admin_token_v1") ||
    localStorage.getItem("agent_token_v1") ||
    localStorage.getItem("token") ||
    ""
  );
}

export default function AdminPdf() {
  const { API } = useOutletContext();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState(null); // {active, filename, size, updatedAt}

  const [customInfo, setCustomInfo] = useState(null); // {filename,size,updatedAt} ou null


  const canAct = useMemo(() => !!getAuthToken(), []);

  // ✅ base routes: le backend expose /api/agents/*
  const CGV_BASE = `${API}/api/agents/admin/cgv`;

  async function fetchInfo() {
    setErr("");
    setLoading(true);
    try {
      const token = getAuthToken();
      const r = await fetch(CGV_BASE, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("Impossible de charger l’état du CGV.");
      const data = await r.json();
      setInfo(data);

      const c = await fetchCustomMeta();
setCustomInfo(c);

      
    } catch (e) {
      setErr(e?.message || "Erreur.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErr("");
    setSaving(true);
    try {
      const token = getAuthToken();

      const fd = new FormData();
      fd.append("file", file);

      const r = await fetch(CGV_BASE, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.message || "Upload impossible.");

      await fetchInfo();
    } catch (e2) {
      setErr(e2?.message || "Erreur upload.");
    } finally {
      setSaving(false);
      // reset input pour pouvoir re-uploader le même fichier
      e.target.value = "";
    }
  }

  function downloadActive() {
    const token = getAuthToken();
    const url = `${CGV_BASE}/download?token=${encodeURIComponent(token)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function useDefault() {
    setErr("");
    setSaving(true);
    try {
      const token = getAuthToken();
      const r = await fetch(`${CGV_BASE}/use-default`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.message || "Action impossible.");
      await fetchInfo();
    } catch (e) {
      setErr(e?.message || "Erreur.");
    } finally {
      setSaving(false);
    }
  }


  function fmtBytes(n) {
  const x = Number(n || 0);
  if (!x) return "—";
  return `${Math.round(x / 1024)} KB`;
}

async function fetchCustomMeta() {
  try {
    const token = getAuthToken();
    // ⚠️ ton backend accepte déjà ?token=...
    // ✅ on force custom avec active=custom
    const url = `${CGV_BASE}/download?active=custom&token=${encodeURIComponent(token)}`;

    const r = await fetch(url, { method: "HEAD" });
    if (!r.ok) return null;

    const len = r.headers.get("content-length");
    const lm = r.headers.get("last-modified");

    return {
      filename: "CGV-location-maintenance.custom.pdf",
      size: len ? Number(len) : 0,
      updatedAt: lm ? new Date(lm).toISOString() : null,
    };
  } catch {
    return null;
  }
}


  return (
    <div style={{ padding: 16, maxWidth: 780 }}>
      <h2 style={{ margin: 0 }}>PDF associé</h2>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Ici tu peux remplacer le PDF CGV fusionné à la fin du devis.
      </p>

      {!canAct && (
        <div
          style={{
            padding: 12,
            border: "1px solid #f2c2c2",
            borderRadius: 10,
            background: "#fff6f6",
          }}
        >
          Token introuvable. Connecte-toi en admin pour gérer le CGV.
        </div>
      )}

      {err && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid #f2c2c2",
            borderRadius: 10,
            background: "#fff6f6",
          }}
        >
          {err}
        </div>
      )}

      <div
        style={{
          marginTop: 14,
          padding: 14,
          border: "1px solid #e8e8e8",
          borderRadius: 12,
          background: "#fff",
        }}
      >
        {loading ? (
          <p style={{ margin: 0, opacity: 0.7 }}>Chargement…</p>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >


         <div style={{ flex: 1, minWidth: 260 }}>
  <div style={{ fontWeight: 700 }}>
    CGV actif :{" "}
    <span style={{ fontWeight: 800 }}>
      {info?.active === "custom" ? "Pdf ajouté" : "CGV-location-maintenance.pdf"}
    </span>
  </div>

  {/* ✅ Infos PDF par défaut (celles renvoyées par /admin/cgv quand active=default) */}
  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
    <div style={{ fontWeight: 700, marginBottom: 6 }}>PDF par défaut</div>

    <div style={{ marginTop: 6, opacity: 0.85 }}>
     Nom du Fichier :{" "}
      <b>
        {info?.active === "default" ? (info?.filename || "—") : "CGV-location-maintenance.pdf"}
      </b>
    </div>

    <div style={{ marginTop: 6, opacity: 0.85 }}>
      Taille : <b>{info?.active === "default" ? fmtBytes(info?.size) : "—"}</b>
      {" • "}
     
      <b>
        {info?.active === "default" && info?.updatedAt
          ? new Date(info.updatedAt).toLocaleString("fr-FR")
          : "—"}
      </b>
    </div>
  </div>

  {/* ✅ Infos PDF importé (custom) */}
  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
    <div style={{ fontWeight: 700, marginBottom: 6 }}>PDF importé (custom)</div>

    <div style={{ marginTop: 6, opacity: 0.85 }}>
      Nom du Fichier : <b>{info?.custom?.originalName || "—"}</b>

    </div>

    <div style={{ marginTop: 6, opacity: 0.85 }}>
      Taille : <b>{customInfo ? fmtBytes(customInfo.size) : "—"}</b>
      {" • "}
   
      <b>
        {customInfo?.updatedAt
          ? new Date(customInfo.updatedAt).toLocaleString("fr-FR")
          : "—"}
      </b>
    </div>

    {!customInfo && (
      <div style={{ marginTop: 6, opacity: 0.65, fontSize: 13 }}>
        Aucun PDF custom trouvé.
      </div>
    )}
  </div>
</div>


              

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={downloadActive}
                  disabled={saving || loading}
                  style={{
                    height: 40,
                    padding: "0 14px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Télécharger le PDF actif
                </button>

                <button
                  type="button"
                  onClick={useDefault}
                  disabled={saving || loading || info?.active !== "custom"}
                  style={{
                    height: 40,
                    padding: "0 14px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    background: info?.active === "custom" ? "#fff" : "#f6f6f6",
                    cursor: info?.active === "custom" ? "pointer" : "not-allowed",
                  }}
                >
                  Revenir au PDF par défaut
                </button>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: "1px solid #eee",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                Importer un nouveau PDF 
              </div>

              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={onUpload}
                disabled={saving || loading}
              />

              <div style={{ marginTop: 8, opacity: 0.7, fontSize: 13 }}>
                Le fichier uploadé sera enregistré côté serveur et utilisé
                automatiquement lors du merge du devis.
              </div>

              {saving && (
                <div style={{ marginTop: 10, opacity: 0.7 }}>
                  Enregistrement…
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
