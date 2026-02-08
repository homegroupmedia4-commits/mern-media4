// client/src/pages/AdminNosDevis.jsx
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

const norm = (v) => String(v || "").trim();

const fmtDateFR = (iso) => {
  try {
    const d = iso ? new Date(iso) : null;
    if (!d || Number.isNaN(d.getTime())) return "";
    // format proche de tes screenshots
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  } catch {
    return "";
  }
};

const money = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(2);
};

// ✅ admin token FIRST (fallback agent token)
function getAuthToken() {
  return (
    localStorage.getItem("admin_token_v1") ||
    localStorage.getItem("agent_token_v1") ||
    localStorage.getItem("token") ||
    ""
  );
}

export default function AdminNosDevis() {
  const { API } = useOutletContext();

  // onglets
  const [tab, setTab] = useState("murs_leds"); // "murs_leds" | "autres_produits"

  // filtres
  const [q, setQ] = useState("");
  const [agentId, setAgentId] = useState("");

  // data
  const [agents, setAgents] = useState([]);
  const [devis, setDevis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // pour afficher “Autres produits” correctement (nom produit, taille, code, etc.)
  const [otherSizesCatalog, setOtherSizesCatalog] = useState([]);
  const [memOptionsCatalog, setMemOptionsCatalog] = useState([]);

  const authHeaders = () => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // ----------------------------
  // Load agents-lite (superadmin)
  // ----------------------------
  const loadAgents = async () => {
    try {
      const res = await fetch(`${API}/api/agents/agents-lite`, {
        headers: authHeaders(),
      });

      // si 403 => pas grave, on laisse “Tous les utilisateurs”
      if (res.status === 403) {
        setAgents([]);
        return;
      }

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAgents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setAgents([]);
    }
  };

  // ----------------------------
  // Load catalogues (autres produits)
  // ----------------------------
  const loadCatalogs = async () => {
    // other sizes
    try {
      const r1 = await fetch(`${API}/api/other-product-sizes`, {
        headers: authHeaders(),
      });
      if (r1.ok) {
        const d1 = await r1.json();
        const list = Array.isArray(d1) ? d1 : [];
        setOtherSizesCatalog(list);
      } else {
        setOtherSizesCatalog([]);
      }
    } catch {
      setOtherSizesCatalog([]);
    }

    // memories
    try {
      const r2 = await fetch(`${API}/api/memory-options`, {
        headers: authHeaders(),
      });
      if (r2.ok) {
        const d2 = await r2.json();
        const list = Array.isArray(d2) ? d2 : [];
        setMemOptionsCatalog(list);
      } else {
        setMemOptionsCatalog([]);
      }
    } catch {
      setMemOptionsCatalog([]);
    }
  };

  // ----------------------------
  // Load devis (superadmin)
  // ----------------------------
  const loadDevis = async () => {
    setLoading(true);
    setError("");

    try {
      // IMPORTANT : on charge tout, puis on split côté front (car un devis peut contenir murs + autres)
      const url =
        `${API}/api/agents/devis?tab=all` +
        `&q=${encodeURIComponent(q)}` +
        `&agentId=${encodeURIComponent(agentId)}`;

      const res = await fetch(url, { headers: authHeaders() });

      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 401) throw new Error("401");
        throw new Error(txt);
      }

      const data = await res.json();
      setDevis(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      if (String(e?.message) === "401") {
        setError("Non autorisé. Token manquant/expiré (admin_token_v1 ou agent_token_v1).");
      } else {
        setError("Impossible de charger les devis.");
      }
      setDevis([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
    loadCatalogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reload sur tab/agentId
  useEffect(() => {
    const t = setTimeout(() => loadDevis(), 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  // reload sur search (debounce)
  useEffect(() => {
    const t = setTimeout(() => loadDevis(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // ----------------------------
  // Open PDF (“Voir”)
  // ----------------------------
  const openPdf = (id) => {
    const token = getAuthToken();
    const url = token
      ? `${API}/api/agents/devis/${id}/pdf?token=${encodeURIComponent(token)}`
      : `${API}/api/agents/devis/${id}/pdf`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // ----------------------------
  // Helpers catalog
  // ----------------------------
  const findOtherSize = (id) =>
    otherSizesCatalog.find((x) => String(x?._id) === String(id));

  const findMem = (id) =>
    memOptionsCatalog.find((x) => String(x?._id) === String(id));

  const productLabelFromSizeRow = (sizeRow) => {
    if (!sizeRow) return "—";

    // selon tes modèles, il peut y avoir :
    // - sizeRow.productId populated {name}
    // - OU sizeRow.product string
    const pObj = sizeRow.productId;
    if (pObj && typeof pObj === "object") {
      return pObj.name || pObj.label || pObj._id || "—";
    }
    return sizeRow.product || "—";
  };

  const userDisplayFromDevis = (d) => {
    // ce que tu affiches sur screenshot: admin9513, Elyess LALA, etc.
    // on essaye plusieurs champs
    return (
      d?.agentSnapshot?.username ||
      d?.agentSnapshot?.email ||
      [d?.agentSnapshot?.prenom, d?.agentSnapshot?.nom].filter(Boolean).join(" ") ||
      d?.agentId ||
      "—"
    );
  };

  const devisLabel = (d) => d?.devisNumber || "";

  // ----------------------------
  // FLATTEN → MURS LEDS
  // (1 ligne par pitchInstance)
  // ----------------------------
  const mursRows = useMemo(() => {
    const out = [];

    for (const d of devis) {
      const list = Array.isArray(d?.pitchInstances) ? d.pitchInstances : [];
      if (!list.length) continue;

      const c = d.client || {};
      const user = userDisplayFromDevis(d);
      const dateStr = fmtDateFR(d.createdAt);

      for (const pi of list) {
        const surfaceM2 = Number(pi?.surfaceM2);
        const largeurM = Number(pi?.largeurM);
        const hauteurM = Number(pi?.hauteurM);
        const diagonaleCm = Number(pi?.diagonaleCm);

        out.push({
          key: `${d._id}_pi_${pi?.instanceId || pi?.pitchId || Math.random()}`,

          devisId: d._id,
          codeDevis: devisLabel(d),

          // client
          nom: c.nom || "",
          prenom: c.prenom || "",
          societe: c.societe || "",
          adresse1: c.adresse1 || "",
          adresse2: c.adresse2 || "",
          codePostal: c.codePostal || "",
          ville: c.ville || "",
          telephone: c.telephone || "",
          email: c.email || "",
          commentaires: c.commentaires || "",

          // user + date
          utilisateur: user,
          dateStr,

          // produit
          produit: "Murs leds",
          codeProduit: pi?.codeProduit || pi?.code || "",
          pitch: pi?.pitchLabel || pi?.name || "",
          categorie: pi?.categorieName || pi?.categoryName || "",
          dureeMois: pi?.financementMonths ?? pi?.dureeMois ?? "",
          quantite: Number(pi?.quantite || 1) || 1,

          // valeurs calcul
          surfaceM2: Number.isFinite(surfaceM2) ? surfaceM2 : "",
          diagonaleCm: Number.isFinite(diagonaleCm) ? diagonaleCm : "",
          montantHt: Number(pi?.montantHt ?? pi?.mensualiteHt ?? pi?.totalHt ?? ""),
        });
      }
    }

    return out;
  }, [devis]);

  // ----------------------------
  // FLATTEN → AUTRES PRODUITS
  // (1 ligne par checked item)
  // ----------------------------
  const otherRows = useMemo(() => {
    const out = [];

    for (const d of devis) {
      const sel = d?.otherSelections || {};
      const pids = Object.keys(sel);
      if (!pids.length) continue;

      const c = d.client || {};
      const user = userDisplayFromDevis(d);
      const dateStr = fmtDateFR(d.createdAt);

      for (const pid of pids) {
        const cfg = sel[pid] || {};
        const leasingMonths = String(cfg?.leasingMonths || "").trim();

        // support anciennes structures éventuelles
        const checked =
          cfg?.checked ||
          cfg?.byMonths?.[leasingMonths]?.checked ||
          {};

        for (const rowId of Object.keys(checked || {})) {
          const line = checked[rowId] || {};

          const sizeRow = findOtherSize(rowId);
          const memRow = line?.memId ? findMem(line.memId) : null;

          // valeurs affichées (si tu as déjà mis unitPrice/totalPrice dans le devis → on prend)
          // sinon on reconstruit depuis catalogue
          const basePrice = Number(sizeRow?.price || 0);
          const memPrice = Number(memRow?.price || 0);

          const qty = Math.max(1, parseInt(String(line?.qty || 1), 10) || 1);

          const unitPrice =
            Number.isFinite(Number(line?.unitPrice)) ? Number(line.unitPrice) : (basePrice + memPrice);

          const totalPrice =
            Number.isFinite(Number(line?.totalPrice)) ? Number(line.totalPrice) : (unitPrice * qty);

          out.push({
            key: `${d._id}_other_${pid}_${leasingMonths}_${rowId}`,

            devisId: d._id,
            codeDevis: devisLabel(d),

            // client
            nom: c.nom || "",
            prenom: c.prenom || "",
            societe: c.societe || "",
            adresse1: c.adresse1 || "",
            adresse2: c.adresse2 || "",
            codePostal: c.codePostal || "",
            ville: c.ville || "",
            telephone: c.telephone || "",
            email: c.email || "",
            commentaires: c.commentaires || "",

            // user + date
            utilisateur: user,
            dateStr,

            // produit
            produit: sizeRow ? productLabelFromSizeRow(sizeRow) : (line?.productLabel || "—"),
            codeProduit: sizeRow?.productCode || line?.codeProduit || "",
            taillePouces: sizeRow?.sizeInches ?? line?.sizeInches ?? "",
            dureeMois: leasingMonths || sizeRow?.leasingMonths || "",
            memoire: memRow?.name || line?.memoryLabel || "—",

            // prix
            prixUnitaire: unitPrice,
            quantite: qty,
            totalHt: totalPrice,
            prixAssocie: memPrice, // surcoût mémoire (comme screenshot)
          });
        }
      }
    }

    return out;
  }, [devis, otherSizesCatalog, memOptionsCatalog]);

  // ----------------------------
  // Search / filter local (sur lignes)
  // ----------------------------
  const filterRows = (arr) => {
    const qq = norm(q).toLowerCase();
    if (!qq) return arr;

    return arr.filter((r) => {
      const hay = [
        r.codeDevis,
        r.codeProduit,
        r.produit,
        r.pitch,
        r.categorie,
        r.societe,
        r.nom,
        r.prenom,
        r.email,
        r.ville,
        r.codePostal,
        r.utilisateur,
        r.commentaires,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(qq);
    });
  };

  const visibleMurs = useMemo(() => filterRows(mursRows), [mursRows, q]);
  const visibleOther = useMemo(() => filterRows(otherRows), [otherRows, q]);

  const activeRows = tab === "murs_leds" ? visibleMurs : visibleOther;

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Nos devis</h2>
      </div>

      <div className="subtabs" style={{ marginBottom: 12 }}>
        <button
          className={`subtab ${tab === "murs_leds" ? "active" : ""}`}
          type="button"
          onClick={() => setTab("murs_leds")}
        >
          Murs leds
        </button>

        <button
          className={`subtab ${tab === "autres_produits" ? "active" : ""}`}
          type="button"
          onClick={() => setTab("autres_produits")}
        >
          Autres produits
        </button>
      </div>

      <div className="m4devis-filters">
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher..."
        />

        <select
          className="input"
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          disabled={agents.length === 0}
          title="Tous les utilisateurs"
        >
          <option value="">Tous les utilisateurs</option>
          {agents.map((a) => (
            <option key={a._id} value={a._id}>
              {norm(a.prenom)} {norm(a.nom)} {a.email ? `(${a.email})` : ""}
            </option>
          ))}
        </select>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      <div className="table-wrap m4devis-tableWrap">
        {loading ? (
          <div className="muted">Chargement...</div>
        ) : activeRows.length === 0 ? (
          <div className="muted">Aucune donnée.</div>
        ) : tab === "autres_produits" ? (
          <table className="table table-wide m4devis-table">
            <thead>
              <tr>
                <th>Code devis</th>
                <th>Produit</th>
                <th>Code produit</th>

                <th>Nom</th>
                <th>Prénom</th>
                <th>Société</th>
                <th>Adresse</th>
                <th>Code Postal</th>
                <th>Ville</th>
                <th>Téléphone</th>
                <th>Email</th>

                <th>Taille sélectionnée</th>
                <th>Mémoire</th>
                <th>Prix unitaire</th>
                <th>Quantité</th>
                <th>Total</th>

                <th>Taille (pouces)</th>
                <th>Durée leasing (mois)</th>
                <th>Prix associé</th>
                <th>Commentaires</th>

                <th>Utilisateur</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {activeRows.map((r) => (
                <tr key={r.key}>
                  <td className="mono">{r.codeDevis || "—"}</td>
                  <td>{r.produit || "—"}</td>
                  <td className="mono">{r.codeProduit || "—"}</td>

                  <td>{r.nom}</td>
                  <td>{r.prenom}</td>
                  <td>{r.societe}</td>
                  <td>{r.adresse1}</td>
                  <td>{r.codePostal}</td>
                  <td>{r.ville}</td>
                  <td>{r.telephone}</td>
                  <td>{r.email}</td>

                  <td>{r.taillePouces !== "" ? String(r.taillePouces) : ""}</td>
                  <td>{r.memoire || "—"}</td>
                  <td>{Number.isFinite(Number(r.prixUnitaire)) ? `${money(r.prixUnitaire)} €` : "—"}</td>
                  <td>{r.quantite}</td>
                  <td>{Number.isFinite(Number(r.totalHt)) ? `${money(r.totalHt)} €` : "—"}</td>

                  <td>{r.taillePouces !== "" ? String(r.taillePouces) : "—"}</td>
                  <td>{r.dureeMois ? `${r.dureeMois} mois` : "—"}</td>
                  <td>{Number.isFinite(Number(r.prixAssocie)) ? `${money(r.prixAssocie)} €` : "—"}</td>
                  <td title={r.commentaires || ""}>{r.commentaires || ""}</td>

                  <td>{r.utilisateur || "—"}</td>
                  <td>{r.dateStr}</td>

                  <td>
                    <button className="m4devis-btn" type="button" onClick={() => openPdf(r.devisId)}>
                      Voir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="table table-wide m4devis-table">
            <thead>
              <tr>
                <th>Code devis</th>

                <th>Nom</th>
                <th>Prénom</th>
                <th>Société</th>
                <th>Adresse</th>
                <th>Code Postal</th>
                <th>Ville</th>
                <th>Téléphone</th>
                <th>Email</th>
                <th>Commentaires</th>

                <th>Surface (m²)</th>
                <th>Diagonale (cm)</th>
                <th>Durée (mois)</th>
                <th>Total HT</th>
                <th>Quantité</th>
                <th>Montant HT</th>

                <th>Code produit</th>
                <th>Pitch</th>
                <th>Catégorie</th>

                <th>Utilisateur</th>
                <th>Date et heure</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {activeRows.map((r) => (
                <tr key={r.key}>
                  <td className="mono">{r.codeDevis || "—"}</td>

                  <td>{r.nom}</td>
                  <td>{r.prenom}</td>
                  <td>{r.societe}</td>
                  <td>{r.adresse1}</td>
                  <td>{r.codePostal}</td>
                  <td>{r.ville}</td>
                  <td>{r.telephone}</td>
                  <td>{r.email}</td>
                  <td title={r.commentaires || ""}>{r.commentaires || ""}</td>

                  <td>{r.surfaceM2 !== "" ? money(r.surfaceM2) : "—"}</td>
                  <td>{r.diagonaleCm !== "" ? money(r.diagonaleCm) : "—"}</td>
                  <td>{r.dureeMois ? String(r.dureeMois) : "—"}</td>

                  {/* Total HT : sur tes screenshots tu as un “Total HT” + “Montant HT”.
                      Ici on garde “Total HT” comme montantHt (si tu veux séparer, tu me dis la règle exacte) */}
                  <td>{Number.isFinite(Number(r.montantHt)) ? money(r.montantHt) : "—"}</td>

                  <td>{r.quantite}</td>
                  <td>{Number.isFinite(Number(r.montantHt)) ? `${money(r.montantHt)}.00` : "—"}</td>

                  <td className="mono">{r.codeProduit || "—"}</td>
                  <td title={r.pitch || ""}>{r.pitch || "—"}</td>
                  <td title={r.categorie || ""}>{r.categorie || "—"}</td>

                  <td>{r.utilisateur || "—"}</td>
                  <td>{r.dateStr}</td>

                  <td>
                    <button className="m4devis-btn" type="button" onClick={() => openPdf(r.devisId)}>
                      Voir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
