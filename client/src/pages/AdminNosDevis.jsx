// client/src/pages/AdminNosDevis.jsx
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "./AdminNosDevis.css";

// ✅ admin token FIRST (comme ton ancienne base)
function getAuthToken() {
  return (
    localStorage.getItem("admin_token_v1") ||
    localStorage.getItem("agent_token_v1") ||
    localStorage.getItem("token") ||
    ""
  );
}

const safeJsonParse = (s, fallback = null) => {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
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
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const norm = (v) => String(v || "").trim();

export default function AdminNosDevis() {
  const outlet = useOutletContext?.() || {};
  const API = useMemo(() => {
    // support ancien contexte `API` ou VITE_API_URL
    return (
      outlet.API ||
      import.meta.env.VITE_API_URL ||
      "https://mern-media4-server.onrender.com"
    );
  }, [outlet.API]);

  // onglets
  const [tab, setTab] = useState("walleds"); // "walleds" | "other"
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all"); // all | (optionnel, si tu veux filtrer plus tard)

  // devis
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // catalogues (autres produits)
  const [otherSizesCatalog, setOtherSizesCatalog] = useState([]);
  const [memOptionsCatalog, setMemOptionsCatalog] = useState([]);

  const getCheckedBucket = (sel) => {
    if (!sel) return {};
    if (sel.byMonths) {
      const months = String(sel.leasingMonths || "").trim();
      return sel.byMonths?.[months]?.checked || {};
    }
    return sel.checked || {};
  };

  // -----------------------------
  // Load ALL devis (admin)
  // -----------------------------
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setError("Token admin introuvable. Connecte-toi en admin.");
      setRows([]);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setError("");
      try {
        // ✅ Fallback sur 2 endpoints possibles (selon ton agents.js)
        const endpoints = [
          `${API}/api/agents/pdfs/admin/list`,
          `${API}/api/agents/devis/admin/list`,
        ];

        let data = null;
        let lastErr = "";

        for (const url of endpoints) {
          try {
            const res = await fetch(url, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
              lastErr = await res.text();
              continue;
            }
            const json = await res.json();
            data = json;
            break;
          } catch (e) {
            lastErr = e?.message || String(e);
          }
        }

        if (!data) throw new Error(lastErr || "Aucun endpoint admin list n'a répondu.");

        // certains endpoints renvoient {items, ...}
        const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        setRows(list);
      } catch (e) {
        console.error(e);
        setError("Impossible de charger la liste admin des devis.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [API]);

  // -----------------------------
  // Load catalogues (autres produits)
  // -----------------------------
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/other-product-sizes`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setOtherSizesCatalog(list.filter((x) => x?.isActive !== false));
      } catch (e) {
        console.warn("other-product-sizes load error", e);
        setOtherSizesCatalog([]);
      }
    })();
  }, [API]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/memory-options`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setMemOptionsCatalog(list.filter((x) => x?.isActive !== false));
      } catch (e) {
        console.warn("memory-options load error", e);
        setMemOptionsCatalog([]);
      }
    })();
  }, [API]);

  // -----------------------------
  // Open PDF (admin) — même logique que AgentMesDevis.downloadPdf
  // -----------------------------
  const openPdf = async (devisId) => {
    const token = getAuthToken();
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
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error(e);
      alert("Impossible d’ouvrir ce PDF.");
    }
  };

  // -----------------------------
  // Flatten admin rows (walleds / other)
  // + Ajout colonnes Agent
  // -----------------------------
  const flattened = useMemo(() => {
    const out = [];

    for (const d of rows) {
      const devisId = d._id || d.id || d.devisId;
      const devisNumber = d.devisNumber || d.number || "";
      const c = d.client || {};
      const dateStr = fmtDateFR(d.createdAt || d.date || d.updatedAt);

      // agent info (selon ce que ton endpoint renvoie)
      const a =
        d.agent ||
        d.agentId ||
        d.agentUser ||
        safeJsonParse(d.agentJson || "", null) ||
        {};
      const agentNom = a?.nom || a?.lastName || "";
      const agentPrenom = a?.prenom || a?.firstName || "";
      const agentEmail = a?.email || "";
      const agentSociete = a?.societe || a?.company || "";
      const agentLabel = norm(
        [agentPrenom, agentNom].filter(Boolean).join(" ") ||
          agentEmail ||
          agentSociete
      );

      if (!devisId) continue;

      if (tab === "walleds") {
        const pitches = Array.isArray(d?.pitchInstances) ? d.pitchInstances : [];
        for (const pi of pitches) {
          const qty = Number(pi?.quantite || 1) || 1;
          const mensualiteHt = Number(pi?.montantHt || 0) || 0;
          const mensualiteTtc = mensualiteHt * 1.2;

          const finitionLabel = pi?.finitionName || pi?.finitionId || "";

          const fixationBase = pi?.fixationName || "";
          const fixationComment = String(pi?.fixationComment || "").trim();
          const isPlafond = fixationBase.toLowerCase().includes("plafond");
          const fixationLabel =
            isPlafond && fixationComment ? `${fixationBase} (${fixationComment})` : fixationBase;

          const typeFinancementLabel = pi?.typeFinancement || "";

          const fraisLabel = [
            c?.fraisInstallationOfferts ? "Installation offerte" : null,
            c?.fraisParametrageOfferts ? "Paramétrage offert" : null,
            c?.fraisPortOfferts ? "Port offert" : null,
          ]
            .filter(Boolean)
            .join(" • ");

          out.push({
            kind: "walleds",
            key: `${devisId}_pi_${pi?.instanceId || pi?.pitchId || Math.random()}`,
            devisId,
            devisNumber,
            dateStr,

            agentLabel,
            agentNom,
            agentPrenom,
            agentEmail,

            client: c,

            produit: "Murs leds",
            pitch: pi?.pitchLabel || pi?.name || "",
            categorie: pi?.categorieName || pi?.categoryName || "",
            dimensions: pi?.dimensions || "",
            luminosite: pi?.luminosite || "",
            surfaceM2: pi?.surfaceM2 ?? "",
            finition: finitionLabel,
            fixation: fixationLabel,
            typeFinancement: typeFinancementLabel,
            frais: fraisLabel,

            largeurM: pi?.largeurM ?? "",
            hauteurM: pi?.hauteurM ?? "",
            largeurPx: pi?.largeurPx ?? "",
            hauteurPx: pi?.hauteurPx ?? "",
            dureeMois: pi?.financementMonths ?? "",
            qty,
            mensualiteHt,
            mensualiteTtc,
            montantHt: mensualiteHt,

            codeProduit: pi?.codeProduit || pi?.code || "",
          });
        }
        continue;
      }

      // other
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
          const unit = basePrice + memPrice;

          const qty = Math.max(1, parseInt(String(line?.qty || 1), 10) || 1);
          const total = unit * qty;

          const productLabel =
            sizeRow.productId?.name ||
            sizeRow.productName ||
            sizeRow.product ||
            line?.productLabel ||
            "Produit";

          out.push({
            kind: "other",
            key: `${devisId}_other_${pid}_${months}_${rowId}`,
            devisId,
            devisNumber,
            dateStr,

            agentLabel,
            agentNom,
            agentPrenom,
            agentEmail,

            client: c,

            produit: String(productLabel),
            taillePouces: sizeRow.sizeInches ?? "",
            memoire: mem?.name || "—",
            prixUnitaire: unit,
            quantite: qty,
            totalHt: total,
            dureeMois: months || String(sizeRow.leasingMonths || ""),
            prixAssocie: memPrice,
            codeProduit: sizeRow.productCode || sizeRow.codeProduit || "",
          });
        }
      }
    }

    return out;
  }, [rows, tab, otherSizesCatalog, memOptionsCatalog]);

  // filtre recherche
  const filtered = useMemo(() => {
    const needle = norm(q).toLowerCase();
    if (!needle) return flattened;

    return flattened.filter((r) => {
      const c = r.client || {};
      const hay = [
        r.devisNumber,
        r.agentLabel,
        r.agentEmail,
        c.societe,
        c.nom,
        c.prenom,
        c.email,
        c.telephone,
        c.ville,
        c.codePostal,
        c.adresse1,
        c.adresse2,
        r.produit,
        r.pitch,
        r.categorie,
        r.dimensions,
        r.luminosite,
        r.finition,
        r.fixation,
        r.typeFinancement,
        r.frais,
        r.codeProduit,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(needle);
    });
  }, [flattened, q]);

  const hasAny = filtered.length > 0;

  return (
    <div className="m4devis-page">
      <div className="m4devis-wrap">
        <div className="m4devis-head">
          <div>
            <h1 className="m4devis-title">Tous les devis (Admin)</h1>
            <div className="m4devis-sub">Liste de tous les devis de tous les agents</div>
          </div>

          <div className="m4devis-filters">
            <input
              className="m4devis-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher (agent, client, devis, produit...)"
            />

            <select
              className="m4devis-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              title="Filtre (optionnel)"
            >
              <option value="all">Tous</option>
            </select>
          </div>
        </div>

        <div className="m4devis-tabs">
          <button
            type="button"
            className={`m4devis-tab ${tab === "walleds" ? "is-active" : ""}`}
            onClick={() => setTab("walleds")}
          >
            Murs leds
          </button>
          <button
            type="button"
            className={`m4devis-tab ${tab === "other" ? "is-active" : ""}`}
            onClick={() => setTab("other")}
          >
            Autres produits
          </button>
        </div>

        <div className="m4devis-card">
          {loading ? <div className="m4devis-muted">Chargement...</div> : null}
          {error ? <div className="m4devis-error">{error}</div> : null}

          {!loading && !error ? (
            <div className="m4devis-tableScroll">
              <table className="m4devis-table">
                <thead>
                  <tr>
                    {/* ✅ Agent info */}
                    <th>Agent</th>
                    <th>Email agent</th>

                    {/* ✅ bouton PDF */}
                    <th>Télécharger le devis</th>

                    {/* ✅ Client */}
                    <th>Société</th>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th>Téléphone</th>
                    <th>Email</th>

                    {tab === "walleds" ? (
                      <>
                        <th>Produit</th>
                        <th>Pitch</th>

                        <th>Catégorie</th>
                        <th>Dimensions</th>
                        <th>Luminosité</th>

                        <th>Surface (m²)</th>
                        <th>Finition</th>
                        <th>Fixation</th>
                        <th>Type financement</th>
                        <th>Frais</th>

                        <th>Largeur (m)</th>
                        <th>Hauteur (m)</th>

                        <th>Largeur (px)</th>
                        <th>Hauteur (px)</th>

                        <th>Durée (mois)</th>
                        <th>Quantité</th>

                        <th>Mensualité HT</th>
                        <th>Mensualité TTC</th>

                        <th>Montant HT</th>
                        <th>Code devis</th>
                        <th>Code produit</th>

                        <th>Adresse</th>
                        <th>Adresse 2</th>
                        <th>Code Postal</th>
                        <th>Ville</th>
                        <th>Commentaires</th>
                        <th>Date</th>
                      </>
                    ) : (
                      <>
                        <th>Produit</th>
                        <th>Taille sélectionnée</th>
                        <th>Mémoire</th>
                        <th>Prix unitaire</th>
                        <th>Quantité</th>
                        <th>Total (HT)</th>
                        <th>Durée leasing (mois)</th>
                        <th>Prix associé</th>
                        <th>Code devis</th>
                        <th>Code produit</th>

                        <th>Adresse</th>
                        <th>Adresse 2</th>
                        <th>Code Postal</th>
                        <th>Ville</th>
                        <th>Commentaires</th>
                        <th>Date</th>
                      </>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((r) => {
                    const c = r.client || {};
                    return (
                      <tr key={r.key}>
                        {/* Agent */}
                        <td>{r.agentLabel || "—"}</td>
                        <td>{r.agentEmail || "—"}</td>

                        {/* PDF */}
                        <td>
                          <button
                            className="m4devis-btn"
                            type="button"
                            onClick={() => openPdf(r.devisId)}
                          >
                            Voir
                          </button>
                        </td>

                        {/* Client */}
                        <td>{c.societe || ""}</td>
                        <td>{c.nom || ""}</td>
                        <td>{c.prenom || ""}</td>
                        <td>{c.telephone || ""}</td>
                        <td>{c.email || ""}</td>

                        {tab === "walleds" ? (
                          <>
                            <td>{r.produit}</td>
                            <td>{r.pitch}</td>

                            <td>{r.categorie}</td>
                            <td>{r.dimensions}</td>
                            <td>{r.luminosite}</td>

                            <td>{r.surfaceM2 ?? ""}</td>
                            <td>{r.finition || ""}</td>
                            <td>{r.fixation || ""}</td>
                            <td>{r.typeFinancement || ""}</td>
                            <td>{r.frais || ""}</td>

                            <td>{r.largeurM}</td>
                            <td>{r.hauteurM}</td>

                            <td>{r.largeurPx}</td>
                            <td>{r.hauteurPx}</td>

                            <td>{r.dureeMois}</td>
                            <td>{r.qty}</td>

                            <td>{fmt2(r.mensualiteHt)}</td>
                            <td>{fmt2(r.mensualiteTtc)}</td>

                            <td>{fmt2(r.montantHt)}</td>
                            <td>{r.devisNumber}</td>
                            <td>{r.codeProduit}</td>

                            <td>{c.adresse1 || ""}</td>
                            <td>{c.adresse2 || ""}</td>
                            <td>{c.codePostal || ""}</td>
                            <td>{c.ville || ""}</td>
                            <td>{c.commentaires || ""}</td>
                            <td>{r.dateStr}</td>
                          </>
                        ) : (
                          <>
                            <td>{r.produit}</td>
                            <td>{r.taillePouces !== "" ? `${r.taillePouces} pouces` : ""}</td>
                            <td>{r.memoire}</td>
                            <td>{fmt2(r.prixUnitaire)}</td>
                            <td>{r.quantite}</td>
                            <td>{fmt2(r.totalHt)}</td>
                            <td>{r.dureeMois}</td>
                            <td>{fmt2(r.prixAssocie)}</td>
                            <td>{r.devisNumber}</td>
                            <td>{r.codeProduit}</td>

                            <td>{c.adresse1 || ""}</td>
                            <td>{c.adresse2 || ""}</td>
                            <td>{c.codePostal || ""}</td>
                            <td>{c.ville || ""}</td>
                            <td>{c.commentaires || ""}</td>
                            <td>{r.dateStr}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}

                  {!hasAny && !loading ? (
                    <tr>
                      <td colSpan={tab === "walleds" ? 31 : 25} className="m4devis-empty">
                        Aucun devis.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
