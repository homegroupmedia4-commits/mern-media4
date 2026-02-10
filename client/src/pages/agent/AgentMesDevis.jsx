import { useEffect, useMemo, useState } from "react";
import AgentHeader from "./AgentHeader";
import { TOKEN_KEY, USER_KEY, safeJsonParse } from "./agentHome.helpers";
import "./AgentMesDevis.css";

export default function AgentMesDevis() {
  const API = useMemo(
    () => import.meta.env.VITE_API_URL || "https://mern-media4-server.onrender.com",
    []
  );

  const [agent, setAgent] = useState(() => {
    const cached = localStorage.getItem(USER_KEY);
    return cached ? safeJsonParse(cached) : null;
  });

  const [tab, setTab] = useState("other"); // "walleds" | "other"
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // catalogues pour reconstruire les autres produits
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

  const getCheckedBucket = (sel) => {
    if (!sel) return {};
    if (sel.byMonths) {
      const months = String(sel.leasingMonths || "").trim();
      return sel.byMonths?.[months]?.checked || {};
    }
    return sel.checked || {};
  };

  // -----------------------------
  // Load devis
  // -----------------------------
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      window.location.href = "/agent/login";
      return;
    }

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
  // Download PDF
  // -----------------------------
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
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error(e);
      alert("Impossible de télécharger ce devis.");
    }
  };

  // -----------------------------
  // Flatten rows (walleds / other)
  // -----------------------------
  const flattened = useMemo(() => {
    const out = [];

    for (const d of rows) {
      const devisId = d._id || d.id;
      const devisNumber = d.devisNumber || "";
      const c = d.client || {};
      const dateStr = fmtDateFR(d.createdAt);

      if (tab === "walleds") {
        const pitches = Array.isArray(d?.pitchInstances) ? d.pitchInstances : [];
        for (const pi of pitches) {
          const qty = Number(pi?.quantite || 1) || 1;
          const mensualiteHt = Number(pi?.montantHt || 0) || 0;
          const mensualiteTtc = mensualiteHt * 1.2;

          out.push({
            kind: "walleds",
            key: `${devisId}_pi_${pi?.instanceId || pi?.pitchId || Math.random()}`,
            devisId,
            devisNumber,
            dateStr,
            client: c,

            // pitch cols
            produit: "Murs leds",
            pitch: pi?.pitchLabel || pi?.name || "",
            categorie: pi?.categorieName || pi?.categoryName || "",
            dimensions: pi?.dimensions || "",
            luminosite: pi?.luminosite || "",
             surfaceM2: pi?.surfaceM2 ?? "",
            largeurM: pi?.largeurM ?? "",
            hauteurM: pi?.hauteurM ?? "",
            largeurPx: pi?.largeurPx ?? "",
            hauteurPx: pi?.hauteurPx ?? "",
            dureeMois: pi?.financementMonths ?? "",
            qty,
            mensualiteHt,
            mensualiteTtc,

            montantHt: mensualiteHt, // même valeur ici (HT mensuel)
            codeProduit: pi?.codeProduit || pi?.code || "", // ✅ FIX
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

          out.push({
            kind: "other",
            key: `${devisId}_other_${pid}_${months}_${rowId}`,
            devisId,
            devisNumber,
            dateStr,
            client: c,

            const productLabel =
  sizeRow.productId?.name ||
  sizeRow.productName ||
  sizeRow.product ||
  line?.productLabel ||
  "Produit";

produit: String(productLabel),

            taillePouces: sizeRow.sizeInches ?? "",
            memoire: mem?.name || "—",
            prixUnitaire: unit,
            quantite: qty,
            totalHt: total,
            dureeMois: months || String(sizeRow.leasingMonths || ""),
            prixAssocie: memPrice, // “prix associé” = surcoût mémoire
            codeProduit: sizeRow.productCode || sizeRow.codeProduit || "",
          });
        }
      }
    }

    return out;
  }, [rows, tab, otherSizesCatalog, memOptionsCatalog]);

  const hasAny = flattened.length > 0;

  return (
    <>
      <AgentHeader agent={agent} />

      <div className="agentdevis-page">
        <div className="agentdevis-wrap">
          <h1 className="agentdevis-title">Mes devis</h1>

          <div className="agentdevis-tabs">
            <button
              type="button"
              className={`agentdevis-tab ${tab === "walleds" ? "is-active" : ""}`}
              onClick={() => setTab("walleds")}
            >
              Murs leds
            </button>
            <button
              type="button"
              className={`agentdevis-tab ${tab === "other" ? "is-active" : ""}`}
              onClick={() => setTab("other")}
            >
              Autres produits
            </button>
          </div>

          <div className="agentdevis-tableCard">
            {loading ? <div className="agentdevis-muted">Chargement...</div> : null}
            {error ? <div className="agentdevis-error">{error}</div> : null}

            {!loading && !error ? (
              <div className="agentdevis-tableScroll">
                <table className="agentdevis-table">
                  <thead>
                    <tr>
                      <th>Société</th>
                      <th>Télécharger le devis</th>
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
                          <td>{c.societe || ""}</td>
                          <td>
                            <button
                              className="agentdevis-download"
                              type="button"
                              onClick={() => downloadPdf(r.devisId)}
                            >
                              Télécharger le devis
                            </button>
                          </td>
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
                        <td colSpan={tab === "walleds" ? 28 : 22} className="agentdevis-empty">
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
    </>
  );
}
