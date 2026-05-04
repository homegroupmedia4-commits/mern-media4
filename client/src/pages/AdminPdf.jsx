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

function fmtBytes(n) {
  const x = Number(n || 0);
  if (!x) return "—";
  if (x > 1024 * 1024) return `${(x / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(x / 1024)} KB`;
}

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR");
  } catch {
    return "—";
  }
}

export default function AdminPdf() {
  const { API } = useOutletContext();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState(null);

  const canAct = useMemo(() => !!getAuthToken(), []);
  const CGV_BASE = `${API}/api/agents/admin/cgv`;

  // -----------------------------
  // Charger l'état du CGV
  // -----------------------------
  async function fetchInfo() {
    setErr("");
    setLoading(true);
    try {
      const token = getAuthToken();
      const r = await fetch(CGV_BASE, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("Impossible de charger l'état du CGV.");
      const data = await r.json();
      setInfo(data);
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

  // -----------------------------
  // Upload nouveau PDF
  // -----------------------------
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
      e.target.value = "";
    }
  }

  // -----------------------------
  // Télécharger le PDF actif
  // -----------------------------
  function downloadActive() {
    const token = getAuthToken();
    const url = `${CGV_BASE}/download?token=${encodeURIComponent(token)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // -----------------------------
  // Revenir au PDF par défaut
  // -----------------------------
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

  const isCustomActive = info?.active === "custom";
  const hasCustom = !!info?.custom;

  return (
    <div style={{ padding: 16, maxWidth: 780 }}>
      <h2 style={{ margin: 0 }}>PDF associé aux devis</h2>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Ce PDF (CGV) est fusionné automatiquement à la fin de chaque nouveau devis généré.
        Les devis déjà générés ne sont pas affectés — il faut les régénérer pour appliquer le nouveau PDF.
      </p>

      {!canAct && (
        <div style={{ padding: 12, border: "1px solid #f2c2c2", borderRadius: 10, background: "#fff6f6", marginTop: 12 }}>
          Token introuvable. Connecte-toi en admin pour gérer le CGV.
        </div>
      )}

      {err && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #f2c2c2", borderRadius: 10, background: "#fff6f6" }}>
          {err}
        </div>
      )}

      <div style={{ marginTop: 14, padding: 16, border: "1px solid #e8e8e8", borderRadius: 12, background: "#fff" }}>
        {loading ? (
          <p style={{ margin: 0, opacity: 0.7 }}>Chargement…</p>
        ) : (
          <>
            {/* ── Statut actif ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div
                style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: isCustomActive ? "#8bc53f" : "#aaa",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontWeight: 700, fontSize: 15 }}>
                PDF actif :{" "}
                {isCustomActive ? (
                  <span style={{ color: "#8bc53f" }}>PDF importé (custom)</span>
                ) : (
                  <span style={{ color: "#666" }}>PDF par défaut</span>
                )}
              </span>
            </div>

            {/* ── Deux colonnes côte à côte ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

              {/* PDF par défaut */}
              <div style={{ padding: 12, border: "1px solid #e8e8e8", borderRadius: 10, background: "#fafafa" }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>
                  📄 PDF par défaut
                  {!isCustomActive && (
                    <span style={{ marginLeft: 8, fontSize: 11, background: "#8bc53f", color: "#fff", borderRadius: 4, padding: "2px 6px" }}>
                      ACTIF
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  <div>Nom : <b>CGV-location-maintenance.pdf</b></div>
                  {!isCustomActive && (
                    <>
                      <div style={{ marginTop: 4 }}>Taille : <b>{fmtBytes(info?.size)}</b></div>
                      <div style={{ marginTop: 4 }}>Modifié : <b>{fmtDate(info?.updatedAt)}</b></div>
                    </>
                  )}
                </div>
              </div>

              {/* PDF custom */}
              <div style={{ padding: 12, border: `1px solid ${hasCustom ? "#8bc53f" : "#e8e8e8"}`, borderRadius: 10, background: hasCustom ? "#f6fff0" : "#fafafa" }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>
                  📥 PDF importé (custom)
                  {isCustomActive && (
                    <span style={{ marginLeft: 8, fontSize: 11, background: "#8bc53f", color: "#fff", borderRadius: 4, padding: "2px 6px" }}>
                      ACTIF
                    </span>
                  )}
                </div>
                {hasCustom ? (
                  <div style={{ fontSize: 13, opacity: 0.85 }}>
                    <div>Nom : <b>{info.custom.originalName || "—"}</b></div>
                    <div style={{ marginTop: 4 }}>Taille : <b>{fmtBytes(info.custom.size)}</b></div>
                    <div style={{ marginTop: 4 }}>Importé le : <b>{fmtDate(info.custom.uploadedAt)}</b></div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, opacity: 0.6 }}>Aucun PDF custom importé.</div>
                )}
              </div>
            </div>

            {/* ── Actions ── */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
              <button
                type="button"
                onClick={downloadActive}
                disabled={saving || loading}
                style={{ height: 38, padding: "0 16px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 13 }}
              >
                ⬇ Télécharger le PDF actif
              </button>

              <button
                type="button"
                onClick={useDefault}
                disabled={saving || loading || !isCustomActive}
                style={{
                  height: 38, padding: "0 16px", borderRadius: 8,
                  border: "1px solid #ddd",
                  background: isCustomActive ? "#fff8f0" : "#f6f6f6",
                  cursor: isCustomActive ? "pointer" : "not-allowed",
                  opacity: isCustomActive ? 1 : 0.5,
                  fontSize: 13,
                }}
              >
                ↩ Revenir au PDF par défaut
              </button>
            </div>

            {/* ── Import ── */}
            <div style={{ paddingTop: 14, borderTop: "1px solid #eee" }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                Importer un nouveau PDF
              </div>
              <p style={{ margin: "0 0 10px", fontSize: 13, opacity: 0.7 }}>
                Ce PDF remplacera le CGV fusionné à la fin des prochains devis générés.
                Les anciens devis ne sont pas modifiés — il faut les régénérer manuellement.
              </p>

              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={onUpload}
                disabled={saving || loading}
                style={{ fontSize: 13 }}
              />

              {saving && (
                <div style={{ marginTop: 10, opacity: 0.7, fontSize: 13 }}>
                  ⏳ Enregistrement en cours…
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Note importante ── */}
      <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "#fffbe6", border: "1px solid #ffe58f", fontSize: 13 }}>
        ⚠️ <b>Important :</b> Le changement de PDF s'applique uniquement aux <b>nouveaux devis générés</b> après l'import.
        Pour mettre à jour un devis existant, ouvrez-le et cliquez sur "Télécharger" pour régénérer le PDF avec le nouveau CGV.
      </div>
    </div>
  );
}
