// client/src/pages/AdminNosDevis.jsx
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

// ✅ admin token FIRkkST
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
    if (typeof s !== "string") return fallback;
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
    return (
      outlet.API ||
      import.meta.env.VITE_API_URL ||
      "https://mern-media4-server.onrender.com"
    );
  }, [outlet.API]);

  const [tab, setTab] = useState("walleds"); // "walleds" | "other"
  const [q, setQ] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // catalogues autres produits
  const [otherSizesCatalog, setOtherSizesCatalog] = useState([]);
  const [memOptionsCatalog, setMemOptionsCatalog] = useState([]);

  // -----------------------------
  // ✅ Helpers (autres produits)
  // -----------------------------
const getCheckedBucket = (sel, monthsHint = "") => {
  if (!sel) return {};

  // nouveau format: byMonths
  if (sel.byMonths) {
    const months = String(monthsHint || sel.leasingMonths || "").trim();

    // 1) si on a un mois précis, on le prend
    if (months && sel.byMonths?.[months]?.checked) {
      return sel.byMonths[months].checked || {};
    }

    // 2) sinon on fusionne TOUS les mois (pour ne rien perdre)
    const merged = {};
    for (const k of Object.keys(sel.byMonths || {})) {
      const chk = sel.byMonths?.[k]?.checked || {};
      for (const rowId of Object.keys(chk)) {
        merged[rowId] = chk[rowId];
      }
    }
    return merged;
  }

  // ancien format
  return sel.checked || {};
};


  const getOtherSelectionsObj = (d) => {
    // peut arriver en objet OU en string (json)
    if (d && typeof d.otherSelections === "object" && d.otherSelections) return d.otherSelections;
    if (d && typeof d.otherSelections === "string") {
      return safeJsonParse(d.otherSelections, {}) || {};
    }
    // fallback si tu as un autre champ json
    if (d && typeof d.otherSelectionsJson === "string") {
      return safeJsonParse(d.otherSelectionsJson, {}) || {};
    }
    return {};
  };

  // -----------------------------
  // ✅ Load ALL devis (ADMIN) via /api/agents/devis
  // -----------------------------
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setError("Token admin introuvable. Connecte-toi via /api/agents/admin/login.");
      setRows([]);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setError("");
      try {
        // tab backend: all | murs_leds | autres_produits
        

        const url = new URL(`${API}/api/agents/devis`);

url.searchParams.set("tab", "all");


        // recherche (backend supporte q)
        if (norm(q)) url.searchParams.set("q", norm(q));

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setError("Impossible de charger la liste admin des devis.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [API, tab, q]);

  // -----------------------------
  // Load catalogues (autres produits)
  // (on les charge tout le temps => pas de flash quand tu switches)
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
  // ✅ Voir PDF (même logique que AgentMesDevis)
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
  // Flatten (admin)
  // -----------------------------
  const flattened = useMemo(() => {
    const out = [];

    for (const d of rows) {
      const devisId = d._id || d.id;
      const devisNumber = d.devisNumber || "";
      const c = d.client || {};
      const dateStr = fmtDateFR(d.createdAt);

      // infos agent (si présentes)
      const snap = d.agentSnapshot || {};
      const agentObj = d.agent || safeJsonParse(d.agentJson || "", null) || {};
      const agentNom = snap.nom || agentObj.nom || "";
      const agentPrenom = snap.prenom || agentObj.prenom || "";
      const agentEmail = snap.email || agentObj.email || "";

      const agentLabel = norm([agentPrenom, agentNom].filter(Boolean).join(" ") || agentEmail || "");

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

      // -----------------------------
      // ✅ AUTRES PRODUITS (corrigé)
      // -----------------------------
      const otherSelections = getOtherSelectionsObj(d);

      for (const pid of Object.keys(otherSelections || {})) {
        const sel = otherSelections[pid];
 const months = String(sel?.leasingMonths || "").trim();
const checked = getCheckedBucket(sel, months);


        for (const rowId of Object.keys(checked || {})) {
          const line = checked[rowId];

          const sizeRow =
            otherSizesCatalog.find((r) => String(r._id) === String(rowId)) || null;

          // ✅ ne pas casser si catalogue pas encore chargé / row manquante
          const sizeInches = sizeRow?.sizeInches ?? "";
          const basePrice = Number(sizeRow?.price || 0);

          // memId peut parfois être { _id } selon sérialisation
          const memId = line?.memId?._id ? String(line.memId._id) : String(line?.memId || "");
          const mem = memId
            ? memOptionsCatalog.find((m) => String(m._id) === String(memId))
            : null;

          const memPrice = Number(mem?.price || 0);
          const unit = basePrice + memPrice;

          const qty = Math.max(1, parseInt(String(line?.qty || 1), 10) || 1);
          const total = unit * qty;

          const productLabel =
            sizeRow?.productId?.name ||
            sizeRow?.productName ||
            sizeRow?.product ||
            "Produit";

          out.push({
            kind: "other",
            key: `${devisId}_other_${pid}_${months}_${rowId}`,
            devisId,
            devisNumber,
            dateStr,

            agentLabel,
            agentEmail,

            client: c,

            produit: String(productLabel),
            taillePouces: sizeInches,
            memoire: mem?.name || "—",
            prixUnitaire: unit,
            quantite: qty,
            totalHt: total,
            dureeMois: months || String(sizeRow?.leasingMonths || ""),
            prixAssocie: memPrice,
            codeProduit: sizeRow?.productCode || sizeRow?.codeProduit || "",
          });
        }
      }
    }

    return out;
  }, [rows, tab, otherSizesCatalog, memOptionsCatalog]);

  const hasAny = flattened.length > 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Tous les devis</h2>
          <div className="muted" style={{ padding: 0 }}>
            Admin : liste de tous les devis de tous les agents
          </div>
        </div>

        <div className="page-actions m4devis-filters">
          <div className="subtabs">
            <button
              className={`subtab ${tab === "walleds" ? "active" : ""}`}
              type="button"
              onClick={() => setTab("walleds")}
            >
              Murs leds
            </button>
            <button
              className={`subtab ${tab === "other" ? "active" : ""}`}
              type="button"
              onClick={() => setTab("other")}
            >
              Autres produits
            </button>
          </div>

          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Recherche (devis, agent, client, produit...)"
          />
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      <div className="table-wrap">
        {loading ? <div className="muted">Chargement...</div> : null}

        {!loading && !error ? (
          <div style={{ overflowX: "auto" }}>
            <table className="table table-wide">
              <thead>
                <tr>
                
                  <th>Télécharger le devis</th>

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
                {flattened.map((r) => {
                  const c = r.client || {};
                  return (
                    <tr key={r.key}>
                     
                      <td>
                        <button
                          className="btn btn-outline"
                          type="button"
                          onClick={() => openPdf(r.devisId)}
                          style={{ width: "auto" }}
                        >
                          Voir
                        </button>
                      </td>

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
                    <td colSpan={tab === "walleds" ? 28 : 20} className="muted">
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
  );
}
