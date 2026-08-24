import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AgentHeader from "./AgentHeader";
import { TOKEN_KEY, USER_KEY, safeJsonParse } from "./agentHome.helpers";
import "./AgentMesDevis.css";

function SortTh({ col, label, width, sortCol, sortDir, colFilters, onSort, onFilter }) {
  const active = sortCol === col;
  const arrow = !active ? "↕" : sortDir === "asc" ? "▲" : "▼";
  return (
    <th style={{ minWidth: width || 80, padding: "4px 4px 0" }}>
      <div
        onClick={() => onSort(col)}
        style={{ cursor: "pointer", fontWeight: 700, userSelect: "none", whiteSpace: "nowrap" }}
      >
        {label} <span style={{ fontSize: 10, color: active ? "#78b13a" : "#aaa" }}>{arrow}</span>
      </div>
      <input
        type="text"
        placeholder="..."
        value={colFilters[col] || ""}
        onChange={(e) => onFilter(col, e.target.value)}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", fontSize: 11, padding: "2px 4px", marginTop: 2, border: "1px solid #e5e7eb", borderRadius: 4, boxSizing: "border-box" }}
      />
    </th>
  );
}

export default function AgentMesDevis() {
  const API = "";
  const navigate = useNavigate();

  // Dark mode : suit la préférence du navigateur (prefers-color-scheme)
  const [isDark, setIsDark] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const modalBg = isDark ? "#1e1e1e" : "#fff";
  const modalText = isDark ? "#e0e0e0" : "#222";
  const modalBorder = isDark ? "#333" : "#e0e0e0";
  const modalHeaderBg = isDark ? "#2a2a2a" : "#f6f7fb";
  const overlayBg = "rgba(0,0,0,0.5)";

  const [agent] = useState(() => {
    const cached = localStorage.getItem(USER_KEY);
    return cached ? safeJsonParse(cached) : null;
  });

  const [filtre, setFiltre] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [colFilters, setColFilters] = useState({});
  const [searchGlobal, setSearchGlobal] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Note interne : brouillon local (partagé entre le textarea inline et la modale) + debounce de sauvegarde
  const [noteDrafts, setNoteDrafts] = useState({});
  const [noteModalId, setNoteModalId] = useState(null);
  const noteSaveTimers = useRef({});

  // Prospect / Clients : commentaire par client (indépendant de la note interne par devis)
  const [clientNotes, setClientNotes] = useState({});
  const [clientNoteModalKey, setClientNoteModalKey] = useState(null);
  const [clientDevisModalKey, setClientDevisModalKey] = useState(null);
  const clientNoteSaveTimers = useRef({});

  // Prospect / Clients : tri + filtres par colonne (isolés du tableau devis)
  const [prospectSortCol, setProspectSortCol] = useState(null);
  const [prospectSortDir, setProspectSortDir] = useState("asc");
  const [prospectColFilters, setProspectColFilters] = useState({});

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

  const saveMeta = async (devisId, patch) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    try {
      await fetch(`/api/agents/devis/${devisId}/meta`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(patch),
      });
      setRows((prev) =>
        prev.map((r) => {
          if (String(r._id || r.id) !== String(devisId)) return r;
          return { ...r, ...patch };
        })
      );
    } catch (e) {
      console.error("saveMeta error", e);
    }
  };

  // Met à jour le brouillon (inline + modale partagent la même source) et sauvegarde avec debounce
  const updateNoteDraft = (devisId, value) => {
    setNoteDrafts((prev) => ({ ...prev, [devisId]: value }));
    if (noteSaveTimers.current[devisId]) {
      clearTimeout(noteSaveTimers.current[devisId]);
    }
    noteSaveTimers.current[devisId] = setTimeout(() => {
      saveMeta(devisId, { commentaireInterne: value });
    }, 400);
  };

  // Commentaire client (Prospect/Clients) : brouillon local + debounce de sauvegarde
  const updateClientNote = (clientKey, value) => {
    setClientNotes((prev) => ({ ...prev, [clientKey]: value }));
    if (clientNoteSaveTimers.current[clientKey]) {
      clearTimeout(clientNoteSaveTimers.current[clientKey]);
    }
    clientNoteSaveTimers.current[clientKey] = setTimeout(async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return;
      try {
        await fetch(`${API}/api/agents/client-notes/${encodeURIComponent(clientKey)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ commentaire: value }),
        });
      } catch (e) {
        console.error("client-note save error", e);
      }
    }, 400);
  };

  const handleProspectSort = (col) => {
    if (prospectSortCol === col) {
      if (prospectSortDir === "asc") setProspectSortDir("desc");
      else if (prospectSortDir === "desc") { setProspectSortCol(null); setProspectSortDir("asc"); }
    } else {
      setProspectSortCol(col);
      setProspectSortDir("asc");
    }
  };

  const setProspectColFilter = (col, val) => {
    setProspectColFilters((prev) => ({ ...prev, [col]: val }));
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

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API}/api/agents/client-notes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const map = {};
        for (const n of (Array.isArray(data) ? data : [])) {
          map[n.clientKey] = n.commentaire || "";
        }
        setClientNotes(map);
      } catch (e) {
        console.warn("client-notes load error", e);
      }
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

    // Filtre plage de dates
    if (dateFrom || dateTo) {
      result = result.filter(r => {
        if (!r.dateStr) return false;
        const parts = r.dateStr.split(" ")[0].split("/");
        if (parts.length < 3) return false;
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = 2000 + parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        if (dateFrom) {
          const from = new Date(dateFrom);
          from.setHours(0, 0, 0, 0);
          if (d < from) return false;
        }
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          if (d > to) return false;
        }
        return true;
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
  }, [rows, filtre, otherSizesCatalog, memOptionsCatalog, searchGlobal, sortCol, sortDir, colFilters, dateFrom, dateTo]);

  // -------------------------
  // Prospect / Clients : déduplication des clients depuis les devis déjà chargés
  // -------------------------
  const prospectList = useMemo(() => {
    const map = new Map();

    for (const d of rows) {
      const c = d.client || {};
      const emailKey = String(c.email || "").trim().toLowerCase();
      const societeKey = String(c.societe || "").trim().toLowerCase();
      const clientKey = emailKey || societeKey;
      if (!clientKey) continue;

      const devisId = d._id || d.id;

      if (!map.has(clientKey)) {
        map.set(clientKey, {
          clientKey,
          societe: c.societe || "",
          prenom: c.prenom || "",
          telephone: c.telephone || "",
          email: c.email || "",
          codePostal: c.codePostal || "",
          ville: c.ville || "",
          adresse: c.adresse1 || "",
          devisIds: [],
        });
      }

      map.get(clientKey).devisIds.push(devisId);
    }

    return Array.from(map.values());
  }, [rows]);

  const PROSPECT_COLS = useMemo(() => ({
    societe: (p) => p.societe,
    prenom: (p) => p.prenom,
    telephone: (p) => p.telephone,
    email: (p) => p.email,
    codePostal: (p) => p.codePostal,
    ville: (p) => p.ville,
    adresse: (p) => p.adresse,
  }), []);

  const filteredProspectList = useMemo(() => {
    let result = prospectList;

    if (searchGlobal.trim()) {
      const q = searchGlobal.trim().toLowerCase();
      result = result.filter((p) =>
        [p.societe, p.prenom, p.email, p.ville, p.codePostal].some((v) =>
          String(v || "").toLowerCase().includes(q)
        )
      );
    }

    for (const [col, val] of Object.entries(prospectColFilters)) {
      if (!val || !val.trim()) continue;
      const getter = PROSPECT_COLS[col];
      if (!getter) continue;
      const q = val.trim().toLowerCase();
      result = result.filter((p) => String(getter(p) || "").toLowerCase().includes(q));
    }

    if (prospectSortCol && PROSPECT_COLS[prospectSortCol]) {
      const getter = PROSPECT_COLS[prospectSortCol];
      result = [...result].sort((a, b) => {
        const av = String(getter(a) || "").toLowerCase();
        const bv = String(getter(b) || "").toLowerCase();
        return prospectSortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }

    return result;
  }, [prospectList, searchGlobal, prospectColFilters, prospectSortCol, prospectSortDir, PROSPECT_COLS]);

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
            <button type="button" className={`agentdevis-tab ${filtre === "prospects" ? "is-active" : ""}`} onClick={() => setFiltre("prospects")}>Prospects / Clients</button>
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
              filtre === "prospects" ? (
              <div className="agentdevis-tableScroll">
                <table className="agentdevis-table agentdevis-prospect-table">
                  <thead>
                    <tr>
                      <th>Voir devis</th>
                      <SortTh col="societe" label="Magasin" width={140} sortCol={prospectSortCol} sortDir={prospectSortDir} colFilters={prospectColFilters} onSort={handleProspectSort} onFilter={setProspectColFilter} />
                      <SortTh col="prenom" label="Prénom" width={110} sortCol={prospectSortCol} sortDir={prospectSortDir} colFilters={prospectColFilters} onSort={handleProspectSort} onFilter={setProspectColFilter} />
                      <SortTh col="telephone" label="Tél" width={110} sortCol={prospectSortCol} sortDir={prospectSortDir} colFilters={prospectColFilters} onSort={handleProspectSort} onFilter={setProspectColFilter} />
                      <SortTh col="email" label="Email" width={160} sortCol={prospectSortCol} sortDir={prospectSortDir} colFilters={prospectColFilters} onSort={handleProspectSort} onFilter={setProspectColFilter} />
                      <SortTh col="codePostal" label="CP" width={80} sortCol={prospectSortCol} sortDir={prospectSortDir} colFilters={prospectColFilters} onSort={handleProspectSort} onFilter={setProspectColFilter} />
                      <SortTh col="ville" label="Ville" width={110} sortCol={prospectSortCol} sortDir={prospectSortDir} colFilters={prospectColFilters} onSort={handleProspectSort} onFilter={setProspectColFilter} />
                      <SortTh col="adresse" label="Adresse" width={160} sortCol={prospectSortCol} sortDir={prospectSortDir} colFilters={prospectColFilters} onSort={handleProspectSort} onFilter={setProspectColFilter} />
                      <th>Commentaire</th>
                      <th>Nouveau devis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProspectList.map((p) => (
                      <tr key={p.clientKey}>
                        <td>
                          <button
                            type="button"
                            title="Voir les devis de ce client"
                            onClick={() => setClientDevisModalKey(p.clientKey)}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: "2px 6px", color: isDark ? "#e0e0e0" : "#222" }}
                          >👁</button>
                        </td>
                        <td>{p.societe || ""}</td>
                        <td>{p.prenom || ""}</td>
                        <td>{p.telephone || ""}</td>
                        <td>{p.email || ""}</td>
                        <td>{p.codePostal || ""}</td>
                        <td>{p.ville || ""}</td>
                        <td>{p.adresse || ""}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                            <textarea
                              value={clientNotes[p.clientKey] ?? ""}
                              onChange={(e) => updateClientNote(p.clientKey, e.target.value)}
                              onMouseEnter={() => setClientNoteModalKey(p.clientKey)}
                              rows={2}
                              style={{ width: 120, fontSize: 12, fontFamily: "inherit", resize: "vertical" }}
                            />
                            <button
                              type="button"
                              title="Agrandir le commentaire"
                              onClick={() => setClientNoteModalKey(p.clientKey)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: "2px 4px", lineHeight: 1, flexShrink: 0 }}
                            >
                              🔍
                            </button>
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            title="Créer un nouveau devis pour ce client"
                            onClick={() => {
                              const params = new URLSearchParams({
                                societe: p.societe || "",
                                prenom: p.prenom || "",
                                telephone: p.telephone || "",
                                email: p.email || "",
                                codePostal: p.codePostal || "",
                                ville: p.ville || "",
                                adresse: p.adresse || "",
                              });
                              navigate(`/agent/home?${params.toString()}`);
                            }}
                            style={{
                              background: "#0f7a3a",
                              color: "#fff",
                              border: "none",
                              borderRadius: "50%",
                              width: 32,
                              height: 32,
                              fontSize: 18,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            +
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredProspectList.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="agentdevis-empty">Aucun client.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              ) : (
              <div className="agentdevis-tableScroll">
                <table className="agentdevis-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 180, padding: "4px 4px 0" }}>
                        <div
                          onClick={() => handleSort("dateStr")}
                          style={{ cursor: "pointer", fontWeight: 700, userSelect: "none", whiteSpace: "nowrap" }}
                        >
                          Date / Heure <span style={{ fontSize: 10, color: sortCol === "dateStr" ? "#78b13a" : "#aaa" }}>
                            {sortCol !== "dateStr" ? "↕" : sortDir === "asc" ? "▲" : "▼"}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                          <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            style={{ width: "50%", fontSize: 10, padding: "2px 2px", border: "1px solid #e5e7eb", borderRadius: 4, boxSizing: "border-box" }}
                            title="Du"
                          />
                          <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            style={{ width: "50%", fontSize: 10, padding: "2px 2px", border: "1px solid #e5e7eb", borderRadius: 4, boxSizing: "border-box" }}
                            title="Au"
                          />
                        </div>
                      </th>
                      <SortTh col="devisNumber" label="N° devis" width={80} sortCol={sortCol} sortDir={sortDir} colFilters={colFilters} onSort={handleSort} onFilter={setColFilter} />
                      <th>↓</th>
                      <th>✏️</th>
                      <SortTh col="societe" label="Magasin" width={120} sortCol={sortCol} sortDir={sortDir} colFilters={colFilters} onSort={handleSort} onFilter={setColFilter} />
                      <SortTh col="cpVille" label="CP / Ville" width={100} sortCol={sortCol} sortDir={sortDir} colFilters={colFilters} onSort={handleSort} onFilter={setColFilter} />
                      <th>Statut</th>
                      <th>Note interne</th>
                      <th>Relance</th>
                      <SortTh col="nom" label="Nom" width={90} sortCol={sortCol} sortDir={sortDir} colFilters={colFilters} onSort={handleSort} onFilter={setColFilter} />
                      <SortTh col="prenom" label="Prénom" width={90} sortCol={sortCol} sortDir={sortDir} colFilters={colFilters} onSort={handleSort} onFilter={setColFilter} />
                      <SortTh col="email" label="Email" width={140} sortCol={sortCol} sortDir={sortDir} colFilters={colFilters} onSort={handleSort} onFilter={setColFilter} />
                      <SortTh col="produit" label="Produit" width={90} sortCol={sortCol} sortDir={sortDir} colFilters={colFilters} onSort={handleSort} onFilter={setColFilter} />
                      <SortTh col="pitch" label="Pitch" width={80} sortCol={sortCol} sortDir={sortDir} colFilters={colFilters} onSort={handleSort} onFilter={setColFilter} />
                      <th style={{ minWidth: 120, padding: "4px 4px 0" }}>
                        <div
                          onClick={() => handleSort("typeFinancement")}
                          style={{ cursor: "pointer", fontWeight: 700, userSelect: "none", whiteSpace: "nowrap" }}
                        >
                          Type financement <span style={{ fontSize: 10, color: sortCol === "typeFinancement" ? "#78b13a" : "#aaa" }}>
                            {sortCol !== "typeFinancement" ? "↕" : sortDir === "asc" ? "▲" : "▼"}
                          </span>
                        </div>
                        <select
                          value={colFilters["typeFinancement"] || ""}
                          onChange={(e) => setColFilter("typeFinancement", e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: "100%", fontSize: 11, padding: "2px 2px", marginTop: 2, border: "1px solid #e5e7eb", borderRadius: 4, boxSizing: "border-box" }}
                        >
                          <option value="">Tous</option>
                          <option value="location_maintenance">Location maintenance</option>
                          <option value="location_evenementiel">Location événementiel</option>
                          <option value="achat">Achat</option>
                        </select>
                      </th>
                      <SortTh col="dureeMois" label="Durée (mois)" width={80} sortCol={sortCol} sortDir={sortDir} colFilters={colFilters} onSort={handleSort} onFilter={setColFilter} />
                      <SortTh col="qty" label="Quantité" width={70} sortCol={sortCol} sortDir={sortDir} colFilters={colFilters} onSort={handleSort} onFilter={setColFilter} />
                      <SortTh col="montantHt" label="Montant HT" width={90} sortCol={sortCol} sortDir={sortDir} colFilters={colFilters} onSort={handleSort} onFilter={setColFilter} />
                      <SortTh col="devisNumber2" label="Code devis" width={80} sortCol={sortCol} sortDir={sortDir} colFilters={colFilters} onSort={handleSort} onFilter={setColFilter} />
                      <SortTh col="codeProduit" label="Code produit" width={90} sortCol={sortCol} sortDir={sortDir} colFilters={colFilters} onSort={handleSort} onFilter={setColFilter} />
                    </tr>
                  </thead>
                  <tbody>
                    {flattened.map((r) => {
                      const c = r.client || {};
                      const row = rows.find((x) => String(x._id || x.id) === String(r.devisId)) || {};
                      const meta = {
                        statut: row.statutDevis || "cree",
                        commentaire: row.commentaireInterne || "",
                        relance: row.relance || "",
                      };
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
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: "2px 6px" }}
                            >✏️</button>
                          </td>
                          <td>{c.societe || ""}</td>
                          <td>{`${c.codePostal || ""} ${c.ville || ""}`.trim()}</td>
                          <td>
                            <select
                              value={meta.statut}
                              style={{ width: 100, fontSize: 12 }}
                              onChange={(e) => saveMeta(r.devisId, { statutDevis: e.target.value })}
                            >
                              <option value="cree">Créé</option>
                              <option value="envoye">Envoyé</option>
                              <option value="valide">Validé</option>
                              <option value="refuse">Refusé</option>
                            </select>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                              <textarea
                                value={noteDrafts[r.devisId] ?? meta.commentaire}
                                onChange={(e) => updateNoteDraft(r.devisId, e.target.value)}
                                onMouseEnter={() => setNoteModalId(r.devisId)}
                                rows={2}
                                style={{ width: 120, fontSize: 12, fontFamily: "inherit", resize: "vertical" }}
                              />
                              <button
                                type="button"
                                title="Agrandir la note interne"
                                onClick={() => setNoteModalId(r.devisId)}
                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: "2px 4px", lineHeight: 1, flexShrink: 0 }}
                              >
                                🔍
                              </button>
                            </div>
                          </td>
                          <td>
                            <input
                              type="date"
                              value={meta.relance}
                              style={{ width: 120, fontSize: 12 }}
                              onChange={(e) => saveMeta(r.devisId, { relance: e.target.value })}
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
              )
            ) : null}
          </div>
        </div>
      </div>

      {clientDevisModalKey ? (() => {
        const prospect = prospectList.find((p) => p.clientKey === clientDevisModalKey);
        const devisRows = (prospect?.devisIds || [])
          .map((id) => rows.find((r) => String(r._id || r.id) === String(id)))
          .filter(Boolean);
        return (
          <div
            style={{ position: "fixed", inset: 0, background: overlayBg, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}
            onMouseDown={() => setClientDevisModalKey(null)}
          >
            <div
              style={{ background: modalBg, color: modalText, borderRadius: 10, padding: 16, width: "min(700px, 95vw)", maxHeight: "80vh", overflow: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.25)" }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  Devis — {prospect?.societe || prospect?.email || ""}
                </div>
                <button
                  type="button"
                  onClick={() => setClientDevisModalKey(null)}
                  title="Fermer"
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 4, lineHeight: 1, color: modalText }}
                >
                  ✕
                </button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: `1px solid ${modalBorder}`, background: modalHeaderBg }}>N° devis</th>
                      <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: `1px solid ${modalBorder}`, background: modalHeaderBg }}>Date</th>
                      <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: `1px solid ${modalBorder}`, background: modalHeaderBg }}>Statut</th>
                      <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: `1px solid ${modalBorder}`, background: modalHeaderBg }}>Montant TTC</th>
                      <th style={{ padding: "6px 8px", borderBottom: `1px solid ${modalBorder}`, background: modalHeaderBg }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {devisRows.map((d) => (
                      <tr key={d._id || d.id}>
                        <td style={{ padding: "6px 8px", borderBottom: `1px solid ${modalBorder}` }}>{d.devisNumber || ""}</td>
                        <td style={{ padding: "6px 8px", borderBottom: `1px solid ${modalBorder}` }}>{fmtDateFR(d.createdAt)}</td>
                        <td style={{ padding: "6px 8px", borderBottom: `1px solid ${modalBorder}` }}>{d.statutDevis || "cree"}</td>
                        <td style={{ padding: "6px 8px", borderBottom: `1px solid ${modalBorder}`, textAlign: "right" }}>{fmt2(d.totals?.totalTtc)}</td>
                        <td style={{ padding: "6px 8px", borderBottom: `1px solid ${modalBorder}`, textAlign: "right" }}>
                          <button
                            className="agentdevis-download"
                            type="button"
                            onClick={() => downloadPdf(d._id || d.id)}
                            title="Télécharger le devis"
                            style={{ padding: "4px 10px", fontSize: 14 }}
                          >↓</button>
                        </td>
                      </tr>
                    ))}
                    {devisRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "10px 8px", color: isDark ? "#9ca3af" : "#6b7280" }}>Aucun devis.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setClientDevisModalKey(null)}
                  style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${modalBorder}`, background: modalHeaderBg, color: modalText, cursor: "pointer", fontSize: 13 }}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        );
      })() : null}

      {clientNoteModalKey ? (() => {
        const prospect = prospectList.find((p) => p.clientKey === clientNoteModalKey);
        const modalValue = clientNotes[clientNoteModalKey] ?? "";
        return (
          <div
            style={{ position: "fixed", inset: 0, background: overlayBg, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}
            onMouseDown={() => setClientNoteModalKey(null)}
          >
            <div
              style={{ background: modalBg, color: modalText, borderRadius: 10, padding: 16, width: "min(500px, 92vw)", boxShadow: "0 10px 40px rgba(0,0,0,0.25)" }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  Commentaire client — {prospect?.societe || prospect?.email || ""}
                </div>
                <button
                  type="button"
                  onClick={() => setClientNoteModalKey(null)}
                  title="Fermer"
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 4, lineHeight: 1, color: modalText }}
                >
                  ✕
                </button>
              </div>

              <textarea
                autoFocus
                value={modalValue}
                onChange={(e) => updateClientNote(clientNoteModalKey, e.target.value)}
                style={{ width: "100%", minHeight: 300, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", padding: 8, border: `1px solid ${modalBorder}`, borderRadius: 6, resize: "vertical", background: modalBg, color: modalText }}
              />

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setClientNoteModalKey(null)}
                  style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${modalBorder}`, background: modalHeaderBg, color: modalText, cursor: "pointer", fontSize: 13 }}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        );
      })() : null}

      {noteModalId ? (() => {
        const modalRow = rows.find((x) => String(x._id || x.id) === String(noteModalId));
        const modalValue = noteDrafts[noteModalId] ?? (modalRow?.commentaireInterne || "");
        return (
          <div
            style={{ position: "fixed", inset: 0, background: overlayBg, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}
            onMouseDown={() => setNoteModalId(null)}
          >
            <div
              style={{ background: modalBg, color: modalText, borderRadius: 10, padding: 16, width: "min(500px, 92vw)", boxShadow: "0 10px 40px rgba(0,0,0,0.25)" }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  Note interne{modalRow?.devisNumber ? ` — ${modalRow.devisNumber}` : ""}
                </div>
                <button
                  type="button"
                  onClick={() => setNoteModalId(null)}
                  title="Fermer"
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 4, lineHeight: 1, color: modalText }}
                >
                  ✕
                </button>
              </div>

              <textarea
                autoFocus
                value={modalValue}
                onChange={(e) => updateNoteDraft(noteModalId, e.target.value)}
                style={{ width: "100%", minHeight: 300, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", padding: 8, border: `1px solid ${modalBorder}`, borderRadius: 6, resize: "vertical", background: modalBg, color: modalText }}
              />

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setNoteModalId(null)}
                  style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${modalBorder}`, background: modalHeaderBg, color: modalText, cursor: "pointer", fontSize: 13 }}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        );
      })() : null}
    </>
  );
}