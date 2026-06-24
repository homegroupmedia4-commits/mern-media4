import { useEffect, useMemo, useState } from "react";
import AgentHeader from "./AgentHeader";
import { TOKEN_KEY, USER_KEY, safeJsonParse } from "./agentHome.helpers";
import "./AgentMesDevis.css";

export default function AgentMesDevis() {
  const API = "";

  const [agent] = useState(() => {
    const cached = localStorage.getItem(USER_KEY);
    return cached ? safeJsonParse(cached) : null;
  });

  const [filtre, setFiltre] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metaVersion, setMetaVersion] = useState(0);
  const bumpMeta = () => setMetaVersion((v) => v + 1);

  const [otherSizesCatalog, setOtherSizesCatalog] = useState([]);
  const [memOptionsCatalog, setMemOptionsCatalog] = useState([]);

  const fmt2 = (n) => {
    const x = Number(n);
    return Number.isFinite(x) ? x.toFixed(2) : "";
  };

  const fmtDateFR = (iso) => {
    try {
      const d = iso ? new Date(iso) : null;
      if (!d || Number.isNaN(d.getTime())) return "";
      return d.toLocaleString("fr-FR", {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch { return ""; }
  };

  const getCheckedBucket = (sel) => {
    if (!sel) return {};
    if (sel.byMonths) {
      const months = String(sel.leasingMonths || "").trim();
      return sel.byMonths?.[months]?.checked || {};
    }
    return sel.checked || {};
  };

  const getDevisMeta = (devisId) => {
    try {
      const raw = localStorage.getItem(`m4_devis_meta_${devisId}`);
      return raw ? JSON.parse(raw) : { statut: "cree", commentaire: "", relance: "" };
    } catch { return { statut: "cree", commentaire: "", relance: "" }; }
  };

  const setDevisMeta = (devisId, patch) => {
    const current = getDevisMeta(devisId);
    localStorage.setItem(`m4_devis_meta_${devisId}`, JSON.stringify({ ...current, ...patch }));
  };

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { window.location.href = "/agent/login"; return; }
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API}/api/agents/devis`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setError("Impossible de charger tes devis.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [API]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/other-product-sizes`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setOtherSizesCatalog((Array.isArray(data) ? data : []).filter((x) => x?.isActive !== false));
      } catch (e) { console.warn("other-product-sizes load error", e); }
    })();
  }, [API]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/memory-options`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setMemOptionsCatalog((Array.isArray(data) ? data : []).filter((x) => x?.isActive !== false));
      } catch (e) { console.warn("memory-options load error", e); }
    })();
  }, [API]);

  const downloadPdf = async (devisId) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/agents/devis/${devisId}/pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const fileRes = await fetch(`${API}${data.pdfUrl}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!fileRes.ok) throw new Error(await fileRes.text());
      const blob = await fileRes.blob();
      window.open(URL.createObjectURL(blob), "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error(e);
      alert("Impossible de télécharger ce devis.");
    }
  };

  const flattened = useMemo(() => {
    const out = [];

    for (const d of rows) {
      const devisId = d._id || d.id;
      const devisNumber = d.devisNumber || "";
      const c = d.client || {};
      const dateStr = fmtDateFR(d.createdAt);

      // A) pitchInstances → kind = "led"
      const pitches = Array.isArray(d?.pitchInstances) ? d.pitchInstances : [];
      for (const [idx, pi] of pitches.entries()) {
        const qty = Number(pi?.quantite || 1) || 1;
        const mensualiteHt = Number(pi?.montantHt || 0) || 0;
        out.push({
          kind: "led",
          key: `${devisId}_pi_${pi?.instanceId || pi?.pitchId || idx}`,
          devisId, devisNumber, dateStr, client: c,
          produit: "Murs leds",
          pitch: pi?.pitchLabel || pi?.name || "",
          typeFinancement: pi?.typeFinancement || "",
          dureeMois: pi?.financementMonths ?? "",
          qty,
          mensualiteHt,
          mensualiteTtc: mensualiteHt * 1.2,
          montantHt: mensualiteHt,
          codeProduit: pi?.codeProduit || pi?.code || "",
          categorie: pi?.categorieName || "",
          dimensions: pi?.dimensions || "",
          luminosite: pi?.luminosite || "",
          surfaceM2: pi?.surfaceM2 ?? "",
          finition: pi?.finitionName || "",
          fixation: (() => {
            const base = pi?.fixationName || "";
            const comment = String(pi?.fixationComment || "").trim();
            return base.toLowerCase().includes("plafond") && comment ? `${base} (${comment})` : base;
          })(),
          frais: [
            c?.fraisInstallationOfferts ? "Installation offerte" : null,
            c?.fraisParametrageOfferts ? "Paramétrage offert" : null,
            c?.fraisPortOfferts ? "Port offert" : null,
          ].filter(Boolean).join(" • "),
          largeurM: pi?.largeurM ?? "",
          hauteurM: pi?.hauteurM ?? "",
          largeurPx: pi?.largeurPx ?? "",
          hauteurPx: pi?.hauteurPx ?? "",
          optionsFinancement: Array.isArray(pi?.optionsFinancement)
            ? pi.optionsFinancement.map(o => o === "achat" ? "Achat" : `${o} mois`).join(", ")
            : "",
        });
      }

      // B) otherSelections → kind selon nom produit
      const otherSelections = d.otherSelections || {};
      for (const pid of Object.keys(otherSelections)) {
        const sel = otherSelections[pid];
        const months = String(sel?.leasingMonths || "").trim();
        const checked = getCheckedBucket(sel);

        for (const rowId of Object.keys(checked || {})) {
          const line = checked[rowId];
          const sizeRow = otherSizesCatalog.find((r) => String(r._id) === String(rowId));
          if (!sizeRow) continue;

          const mem = line?.memId
            ? memOptionsCatalog.find((m) => String(m._id) === String(line.memId))
            : null;

          const basePrice = Number(sizeRow.price || 0);
          const memPrice = Number(mem?.price || 0);
          const monthly = basePrice + memPrice;
          const monthsInt = Math.max(1, parseInt(String(months || 1), 10) || 1);
          const typeFin = String(sel?.typeFinancement || "location_maintenance");
          const unit = typeFin === "achat" ? (monthly * monthsInt) * 0.6 : monthly;
          const qty = Math.max(1, parseInt(String(line?.qty || 1), 10) || 1);
          const total = unit * qty;

          const productLabel = sizeRow.productId?.name || sizeRow.productName || sizeRow.product || "Produit";
          const kind = String(productLabel).toLowerCase().includes("lcd") ? "lcd" : "other";

          out.push({
            kind,
            key: `${devisId}_other_${pid}_${months}_${rowId}`,
            devisId, devisNumber, dateStr, client: c,
            produit: String(productLabel),
            pitch: "",
            typeFinancement: typeFin,
            dureeMois: months || String(sizeRow.leasingMonths || ""),
            qty,
            mensualiteHt: unit,
            mensualiteTtc: unit * 1.2,
            montantHt: total,
            codeProduit: sizeRow.productCode || sizeRow.codeProduit || "",
            optionsFinancement: Array.isArray(sel?.optionsFinancement)
              ? sel.optionsFinancement.map(o => o === "achat" ? "Achat" : `${o} mois`).join(", ")
              : "",
          });
        }
      }
    }

    if (filtre === "led") return out.filter((r) => r.kind === "led");
    if (filtre === "lcd") return out.filter((r) => r.kind === "lcd");
    return out;
  }, [rows, filtre, otherSizesCatalog, memOptionsCatalog, metaVersion]);

  const hasAny = flattened.length > 0;

  return (
    <>
      <AgentHeader agent={agent} />
      <div className="agentdevis-page">
        <div className="agentdevis-wrap">
          <h1 className="agentdevis-title">Mes devis</h1>

          <div className="agentdevis-tabs">
            <button type="button" className={`agentdevis-tab ${filtre === "all" ? "is-active" : ""}`} onClick={() => setFiltre("all")}>Tous</button>
            <button type="button" className={`agentdevis-tab ${filtre === "led" ? "is-active" : ""}`} onClick={() => setFiltre("led")}>Écrans LED</button>
            <button type="button" className={`agentdevis-tab ${filtre === "lcd" ? "is-active" : ""}`} onClick={() => setFiltre("lcd")}>Écrans LCD</button>
          </div>

          <div className="agentdevis-tableCard">
            {loading ? <div className="agentdevis-muted">Chargement...</div> : null}
            {error ? <div className="agentdevis-error">{error}</div> : null}

            {!loading && !error ? (
              <div className="agentdevis-tableScroll">
                <table className="agentdevis-table">
                  <thead>
                    <tr>
                      <th>Date / Heure</th>
                      <th>N° devis</th>
                      <th>↓</th>
                      <th>Magasin</th>
                      <th>CP / Ville</th>
                      <th>Statut</th>
                      <th>Note interne</th>
                      <th>Relance</th>
                      <th>Nom</th>
                      <th>Prénom</th>
                      <th>Email</th>
                      <th>Produit</th>
                      <th>Pitch</th>
                      <th>Type financement</th>
                      <th>Durée (mois)</th>
                      <th>Quantité</th>
                      <th>Montant HT</th>
                      <th>Code devis</th>
                      <th>Code produit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flattened.map((r) => {
                      const c = r.client || {};
                      const meta = getDevisMeta(r.devisId);
                      return (
                        <tr key={r.key}>
                          <td>{r.dateStr}</td>
                          <td>{r.devisNumber}</td>
                          <td>
                            <button
                              className="agentdevis-download"
                              type="button"
                              onClick={() => downloadPdf(r.devisId)}
                              title="Télécharger le devis"
                              style={{ padding: "4px 10px", fontSize: 16 }}
                            >↓</button>
                          </td>
                          <td>{c.societe || ""}</td>
                          <td>{`${c.codePostal || ""} ${c.ville || ""}`.trim()}</td>
                          <td>
                            <select
                              value={meta.statut}
                              style={{ width: 100, fontSize: 12 }}
                              onChange={(e) => { setDevisMeta(r.devisId, { statut: e.target.value }); bumpMeta(); }}
                            >
                              <option value="cree">Créé</option>
                              <option value="envoye">Envoyé</option>
                              <option value="valide">Validé</option>
                              <option value="refuse">Refusé</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="text"
                              defaultValue={meta.commentaire}
                              style={{ width: 120, fontSize: 12 }}
                              onBlur={(e) => { setDevisMeta(r.devisId, { commentaire: e.target.value }); bumpMeta(); }}
                            />
                          </td>
                          <td>
                            <input
                              type="date"
                              value={meta.relance}
                              style={{ width: 120, fontSize: 12 }}
                              onChange={(e) => { setDevisMeta(r.devisId, { relance: e.target.value }); bumpMeta(); }}
                            />
                          </td>
                          <td>{c.nom || ""}</td>
                          <td>{c.prenom || ""}</td>
                          <td>{c.email || ""}</td>
                          <td>{r.produit}</td>
                          <td>{r.pitch}</td>
                          <td>{r.typeFinancement}</td>
                          <td>{r.dureeMois}</td>
                          <td>{r.qty}</td>
                          <td>{fmt2(r.montantHt)}</td>
                          <td>{r.devisNumber}</td>
                          <td>{r.codeProduit}</td>
                        </tr>
                      );
                    })}
                    {!hasAny && !loading ? (
                      <tr>
                        <td colSpan={19} className="agentdevis-empty">Aucun devis.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}