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
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [colFilters, setColFilters] = useState({});
  const [searchGlobal, setSearchGlobal] = useState("");

  const [otherSizesCatalog, setOtherSizesCatalog] = useState([]);
  const [memOptionsCatalog, setMemOptionsCatalog] = useState([]);

  const handleSort = (col) => {
    if (sortCol === col) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortCol(null); setSortDir("asc"); }
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const setColFilter = (col, val) => {
    setColFilters((prev) => ({ ...prev, [col]: val }));
  };

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

  const openPrefill = (r) => {
    const d = rows.find((row) => (row._id || row.id) === r.devisId);
    if (!d) return;

    const prefill = {
      client: d.client || {},
      pitchInstances: d.pitchInstances || [],
      otherSelections: d.otherSelections || {},
      wallLedsAbonnement: d.wallLedsAbonnement || null,
      otherAbonnement: d.otherAbonnement || null,
      apport: d.apport || 0,
    };

    localStorage.setItem("m4_prefill", JSON.stringify(prefill));
    window.open("/agent/home", "_blank", "noopener,noreferrer");
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

    // Appliquer recherche globale
    let result = filtre === "led" ? out.filter(r => r.kind === "led")
      : filtre === "lcd" ? out.filter(r => r.kind === "lcd")
      : out;

    // Recherche globale
    if (searchGlobal.trim()) {
      const q = searchGlobal.trim().toLowerCase();
      result = result.filter(r => {
        const c = r.client || {};
        return [
          r.dateStr, r.devisNumber, c.societe, c.codePostal, c.ville,
          c.nom, c.prenom, c.email, r.produit, r.pitch,
          r.typeFinancement, String(r.dureeMois), String(r.qty),
          String(r.montantHt), r.codeProduit,
        ].some(v => String(v || "").toLowerCase().includes(q));
      });
    }

    // Filtres par colonne
    const COLS = {
      dateStr: r => r.dateStr,
      devisNumber: r => r.devisNumber,
      societe: r => r.client?.societe,
      cpVille: r => `${r.client?.codePostal || ""} ${r.client?.ville || ""}`,
      nom: r => r.client?.nom,
      prenom: r => r.client?.prenom,
      email: r => r.client?.email,
      produit: r => r.produit,
      pitch: r => r.pitch,
      typeFinancement: r => r.typeFinancement,
      dureeMois: r => String(r.dureeMois),
      qty: r => String(r.qty),
      montantHt: r => String(r.montantHt),
      devisNumber2: r => r.devisNumber,
      codeProduit: r => r.codeProduit,
    };

    for (const [col, val] of Object.entries(colFilters)) {
      if (!val || !val.trim()) continue;
      const getter = COLS[col];
      if (!getter) continue;
      const q = val.trim().toLowerCase();
      result = result.filter(r => String(getter(r) || "").toLowerCase().includes(q));
    }

    // Tri
    if (sortCol && COLS[sortCol]) {
      const getter = COLS[sortCol];
      result = [...result].sort((a, b) => {
        const av = String(getter(a) || "").toLowerCase();
        const bv = String(getter(b) || "").toLowerCase();
        const an = Number(av);
        const bn = Number(bv);
        if (!isNaN(an) && !isNaN(bn)) {
          return sortDir === "asc" ? an - bn : bn - an;
        }
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }

    return result;
  }, [rows, filtre, otherSizesCatalog, memOptionsCatalog, metaVersion, searchGlobal, sortCol, sortDir, colFilters]);

  const hasAny = flattened.length > 0;

  const SortTh = ({ col, label, width }) => {
    const active = sortCol === col;
    const arrow = !active ? "↕" : sortDir === "asc" ? "▲" : "▼";
    return (
      <th style={{ minWidth: width || 80, padding: "4px 4px 0" }}>
        <div
          onClick={() => handleSort(col)}
          style={{ cursor: "pointer", fontWeight: 700, userSelect: "none", whiteSpace: "nowrap" }}
        >
          {label} <span style={{ fontSize: 10, color: active ? "#78b13a" : "#aaa" }}>{arrow}</span>
        </div>
        <input
          type="text"
          placeholder="..."
          value={colFilters[col] || ""}
          onChange={(e) => setColFilter(col, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={{ width: "100%", fontSize: 11, padding: "2px 4px", marginTop: 2, border: "1px solid #e5e7eb", borderRadius: 4, boxSizing: "border-box" }}
        />
      </th>
    );
  };

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

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <input
              type="text"
              placeholder="Recherche générale..."
              value={searchGlobal}
              onChange={(e) => setSearchGlobal(e.target.value)}
              style={{ width: 220, padding: "5px 10px", fontSize: 13, border: "1px solid #d8dbe6", borderRadius: 6 }}
            />
          </div>
          <div className="agentdevis-tableCard">
            {loading ? <div className="agentdevis-muted">Chargement...</div> : null}
            {error ? <div className="agentdevis-error">{error}</div> : null}

            {!loading && !error ? (
              <div className="agentdevis-tableScroll">
                <table className="agentdevis-table">
                  <thead>
                    <tr>
                      <SortTh col="dateStr" label="Date / Heure" width={110} />
                      <SortTh col="devisNumber" label="N° devis" width={80} />
                      <th>↓</th>
                      <th>✏️</th>
                      <SortTh col="societe" label="Magasin" width={120} />
                      <SortTh col="cpVille" label="CP / Ville" width={100} />
                      <th>Statut</th>
                      <th>Note interne</th>
                      <th>Relance</th>
                      <SortTh col="nom" label="Nom" width={90} />
                      <SortTh col="prenom" label="Prénom" width={90} />
                      <SortTh col="email" label="Email" width={140} />
                      <SortTh col="produit" label="Produit" width={90} />
                      <SortTh col="pitch" label="Pitch" width={80} />
                      <SortTh col="typeFinancement" label="Type financement" width={120} />
                      <SortTh col="dureeMois" label="Durée (mois)" width={80} />
                      <SortTh col="qty" label="Quantité" width={70} />
                      <SortTh col="montantHt" label="Montant HT" width={90} />
                      <SortTh col="devisNumber2" label="Code devis" width={80} />
                      <SortTh col="codeProduit" label="Code produit" width={90} />
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
                          <td>
                            <button
                              type="button"
                              title="Modifier ce devis"
                              onClick={() => openPrefill(r)}
                              style={{
                                background: "#f97316",
                                color: "#fff",
                                border: "none",
                                borderRadius: 6,
                                padding: "4px 10px",
                                fontSize: 16,
                                cursor: "pointer",
                              }}
                            >✏️</button>
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
                        <td colSpan={20} className="agentdevis-empty">Aucun devis.</td>
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