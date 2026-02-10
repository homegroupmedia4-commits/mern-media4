// client/src/pages/AdminNosDevis.jsx
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

// ✅ admin token FIRST
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

  const getCheckedBucket = (sel) => {
    if (!sel) return {};
    if (sel.byMonths) {
      const months = String(sel.leasingMonths || "").trim();
      return sel.byMonths?.[months]?.checked || {};
    }
    return sel.checked || {};
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
        const backendTab = tab === "walleds" ? "murs_leds" : "autres_produits";

        const url = new URL(`${API}/api/agents/devis`);
        url.searchParams.set("tab", backendTab);

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

      const agentLabel = norm(
        [agentPrenom, agentNom].filter(Boolean).join(" ") || agentEmail || ""
      );

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
            isPlafond && fixationComment
              ? `${fixationBase} (${fixationComment})`
              : fixationBase;

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

      // other
      const otherSelections = d.otherSelections || {};
      for (const pid of Object.keys(otherSelections)) {
        const sel = otherSelections[pid];
        const months = String(sel?.leasingMonths || "").trim();
        const checked = getCheckedBucket(sel);

        for (const rowId of Object.keys(checked || {})) {
          const line = checked[rowId];
          const sizeRow = otherSizesCatalog.find(
            (r) => String(r._id) === String(rowId)
          );
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

  const hasAny = flattened.length > 0;

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Tous les devis</h1>
      <div style={{ marginTop: 6, color: "#666" }}>
        Admin : liste de tous les devis de tous les agents
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setTab("walleds")}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: tab === "walleds" ? "#111" : "#fff",
            color: tab === "walleds" ? "#fff" : "#111",
            cursor: "pointer",
          }}
        >
          Murs leds
        </button>
        <button
          type="button"
          onClick={() => setTab("other")}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: tab === "other" ? "#111" : "#fff",
            color: tab === "other" ? "#fff" : "#111",
            cursor: "pointer",
          }}
        >
          Autres produits
        </button>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Recherche (devis, agent, client, produit...)"
          style={{
            flex: "1 1 320px",
            minWidth: 260,
            padding: "9px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            outline: "none",
          }}
        />
      </div>

      <div style={{ marginTop: 14, border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
        {loading ? <div style={{ padding: 12, color: "#666" }}>Chargement...</div> : null}
        {error ? <div style={{ padding: 12, color: "#b00020" }}>{error}</div> : null}

        {!loading && !error ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f6f7fb" }}>
                  <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Agent</th>
                  <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Email agent</th>
                  <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Télécharger le devis</th>

                  <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Société</th>
                  <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Nom</th>
                  <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Prénom</th>
                  <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Téléphone</th>
                  <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Email</th>

                  {tab === "walleds" ? (
                    <>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Produit</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Pitch</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Catégorie</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Dimensions</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Luminosité</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Surface (m²)</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Finition</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Fixation</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Type financement</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Frais</th>

                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Largeur (m)</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Hauteur (m)</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Largeur (px)</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Hauteur (px)</th>

                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Durée (mois)</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Quantité</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Mensualité HT</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Mensualité TTC</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Montant HT</th>

                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Code devis</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Code produit</th>

                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Adresse</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Adresse 2</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Code Postal</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Ville</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Commentaires</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Date</th>
                    </>
                  ) : (
                    <>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Produit</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Taille sélectionnée</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Mémoire</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Prix unitaire</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Quantité</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Total (HT)</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Durée leasing (mois)</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Prix associé</th>

                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Code devis</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Code produit</th>

                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Adresse</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Adresse 2</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Code Postal</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Ville</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Commentaires</th>
                      <th style={{ padding: 10, textAlign: "left", borderBottom: "1px solid #eee" }}>Date</th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody>
                {flattened.map((r) => {
                  const c = r.client || {};
                  return (
                    <tr key={r.key}>
                      <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.agentLabel || "—"}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.agentEmail || "—"}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>
                        <button
                          type="button"
                          onClick={() => openPdf(r.devisId)}
                          style={{
                            padding: "7px 10px",
                            borderRadius: 10,
                            border: "1px solid #ddd",
                            background: "#fff",
                            cursor: "pointer",
                          }}
                        >
                          Voir
                        </button>
                      </td>

                      <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{c.societe || ""}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{c.nom || ""}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{c.prenom || ""}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{c.telephone || ""}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{c.email || ""}</td>

                      {tab === "walleds" ? (
                        <>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.produit}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.pitch}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.categorie}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.dimensions}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.luminosite}</td>

                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.surfaceM2 ?? ""}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.finition || ""}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.fixation || ""}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.typeFinancement || ""}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.frais || ""}</td>

                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.largeurM}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.hauteurM}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.largeurPx}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.hauteurPx}</td>

                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.dureeMois}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.qty}</td>

                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{fmt2(r.mensualiteHt)}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{fmt2(r.mensualiteTtc)}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{fmt2(r.montantHt)}</td>

                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.devisNumber}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.codeProduit}</td>

                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{c.adresse1 || ""}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{c.adresse2 || ""}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{c.codePostal || ""}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{c.ville || ""}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{c.commentaires || ""}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.dateStr}</td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.produit}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>
                            {r.taillePouces !== "" ? `${r.taillePouces} pouces` : ""}
                          </td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.memoire}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{fmt2(r.prixUnitaire)}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.quantite}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{fmt2(r.totalHt)}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.dureeMois}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{fmt2(r.prixAssocie)}</td>

                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.devisNumber}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.codeProduit}</td>

                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{c.adresse1 || ""}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{c.adresse2 || ""}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{c.codePostal || ""}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{c.ville || ""}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{c.commentaires || ""}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{r.dateStr}</td>
                        </>
                      )}
                    </tr>
                  );
                })}

                {!hasAny && !loading ? (
                  <tr>
                    <td style={{ padding: 14, color: "#666" }} colSpan={tab === "walleds" ? 30 : 22}>
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
