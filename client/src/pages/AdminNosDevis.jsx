// client/src/pages/AdminNosDevis.jsx
import { useEffect, useMemo, useState } from "react";

const fmtDate = (iso) => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    // yyyy-mm-dd hh:mm:ss
    return d.toISOString().replace("T", " ").slice(0, 19);
  } catch {
    return "";
  }
};

const norm = (v) => String(v || "").trim();

const money = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(2);
};

export default function AdminNosDevis({ API }) {
  const [tab, setTab] = useState("murs_leds"); // "murs_leds" | "autres_produits"
  const [q, setQ] = useState("");
  const [agentId, setAgentId] = useState("");

  const [agents, setAgents] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI table (client-side sort + pagination)
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc"); // "asc" | "desc"
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const loadAgents = async () => {
    try {
      const res = await fetch(`${API}/api/agents/agents-lite`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAgents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      // non bloquant
      setAgents([]);
    }
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const url =
        `${API}/api/agents/devis?tab=${encodeURIComponent(tab)}` +
        `&q=${encodeURIComponent(q)}` +
        `&agentId=${encodeURIComponent(agentId)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les devis.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reload on tab/agent
  useEffect(() => {
    setPage(1);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, agentId]);

  // reload “debounce light” sur search
  useEffect(() => {
    setPage(1);
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const openPdf = (id) => {
    window.open(`${API}/api/agents/devis/${id}/pdf`, "_blank", "noopener,noreferrer");
  };

  // -----------------------------
  // Build rows view
  // -----------------------------
  const mursRows = useMemo(() => {
    // 1 devis -> 1 ligne par pitch instance
    const out = [];
    for (const d of rows) {
      const list = Array.isArray(d.pitchInstances) ? d.pitchInstances : [];
      if (!list.length) continue;

      for (const pi of list) {
        const agentName = [d.agentSnapshot?.prenom, d.agentSnapshot?.nom].filter(Boolean).join(" ");
        out.push({
          _rowType: "murs",
          devisId: d._id,
          devisNumber: d.devisNumber,
          createdAt: d.createdAt,
          agentEmail: d.agentSnapshot?.email || "",
          agentName,
          agentDisplay: d.agentSnapshot?.email || agentName || "",
          client: d.client || {},
          pi: pi || {},
        });
      }
    }
    return out;
  }, [rows]);

  const otherRows = useMemo(() => {
    // 1 devis -> 1 ligne par taille cochée
    const out = [];
    for (const d of rows) {
      const sel = d.otherSelections || {};
      const pids = Object.keys(sel);
      if (!pids.length) continue;

      for (const pid of pids) {
        const cfg = sel[pid] || {};
        const leasingMonths = cfg.leasingMonths || "";
        const checked = cfg.checked || {};
        for (const rowId of Object.keys(checked)) {
          const line = checked[rowId] || {};
          const agentName = [d.agentSnapshot?.prenom, d.agentSnapshot?.nom].filter(Boolean).join(" ");
          out.push({
            _rowType: "other",
            devisId: d._id,
            devisNumber: d.devisNumber,
            createdAt: d.createdAt,
            agentEmail: d.agentSnapshot?.email || "",
            agentName,
            agentDisplay: d.agentSnapshot?.email || agentName || "",
            client: d.client || {},
            productId: pid,
            rowId,
            leasingMonths,
            memId: line.memId || "",
            qty: line.qty || 1,
            // si jamais ton backend les inclut déjà (sinon "—" affiché)
            unitPrice: line.unitPrice,
            totalPrice: line.totalPrice,
            sizeInches: line.sizeInches,
            memoryLabel: line.memoryLabel,
            priceLabel: line.priceLabel,
          });
        }
      }
    }
    return out;
  }, [rows]);

  // -----------------------------
  // Sort + paginate (client-side)
  // -----------------------------
  const sortedMursRows = useMemo(() => {
    const arr = [...mursRows];
    const dir = sortDir === "asc" ? 1 : -1;

    const get = (r) => {
      const pi = r.pi || {};
      const c = r.client || {};
      switch (sortKey) {
        case "devisNumber":
          return String(r.devisNumber || "");
        case "agent":
          return String(r.agentDisplay || "");
        case "clientEmail":
          return String(c.email || "");
        case "clientNom":
          return String(c.nom || "");
        case "createdAt":
          return String(r.createdAt || "");
        case "pitchLabel":
          return String(pi.pitchLabel || "");
        case "resolutionLabel":
          return String(pi.resolutionLabel || "");
        case "surfaceM2":
          return Number(pi.surfaceM2 ?? -1);
        case "montantHt":
          return Number(pi.montantHt ?? -1);
        default:
          return String(r.createdAt || "");
      }
    };

    arr.sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "fr", { sensitivity: "base" }) * dir;
    });

    return arr;
  }, [mursRows, sortKey, sortDir]);

  const sortedOtherRows = useMemo(() => {
    const arr = [...otherRows];
    const dir = sortDir === "asc" ? 1 : -1;

    const get = (r) => {
      const c = r.client || {};
      switch (sortKey) {
        case "devisNumber":
          return String(r.devisNumber || "");
        case "agent":
          return String(r.agentDisplay || "");
        case "clientEmail":
          return String(c.email || "");
        case "clientNom":
          return String(c.nom || "");
        case "createdAt":
          return String(r.createdAt || "");
        case "rowId":
          return String(r.rowId || "");
        case "qty":
          return Number(r.qty ?? -1);
        case "totalPrice":
          return Number(r.totalPrice ?? -1);
        default:
          return String(r.createdAt || "");
      }
    };

    arr.sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "fr", { sensitivity: "base" }) * dir;
    });

    return arr;
  }, [otherRows, sortKey, sortDir]);

  const activeRows = tab === "murs_leds" ? sortedMursRows : sortedOtherRows;

  const total = activeRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const pageRows = activeRows.slice(start, end);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Nos devis</h2>
        <div className="muted" style={{ marginTop: 6 }}>
          Superadmin : tous les devis soumis (filtrables par utilisateur).
        </div>
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

      <div className="page-actions" style={{ marginBottom: 12, gap: 10 }}>
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher (code devis, email, nom, société...)"
        />

        <select
          className="input"
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          title="Filtrer par utilisateur"
        >
          <option value="">Tous les utilisateurs</option>
          {agents.map((a) => (
            <option key={a._id} value={a._id}>
              {norm(a.prenom)} {norm(a.nom)} {a.email ? `(${a.email})` : ""}
            </option>
          ))}
        </select>

        <select
          className="input"
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value) || 50);
            setPage(1);
          }}
          title="Nombre de lignes"
        >
          {[25, 50, 100, 200].map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      <div className="table-wrap">
        {loading ? (
          <div className="muted">Chargement...</div>
        ) : tab === "murs_leds" ? (
          <div style={{ overflow: "auto" }}>
            <table className="table table-wide">
              <thead>
                <tr>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("devisNumber")}>
                    Code devis {sortKey === "devisNumber" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th>Produit</th>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("pitchLabel")}>
                    Pitch {sortKey === "pitchLabel" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("resolutionLabel")}>
                    Catégorie {sortKey === "resolutionLabel" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th>Code produit</th>

                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("agent")}>
                    Utilisateur {sortKey === "agent" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("createdAt")}>
                    Date et heure {sortKey === "createdAt" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>

                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Société</th>
                  <th>Adresse</th>
                  <th>Code Postal</th>
                  <th>Ville</th>
                  <th>Téléphone</th>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("clientEmail")}>
                    Email {sortKey === "clientEmail" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th>Commentaires</th>

                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("surfaceM2")}>
                    Surface (m²) {sortKey === "surfaceM2" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th>Diagonale (cm)</th>
                  <th>Durée (mois)</th>
                  <th>Total HT</th>
                  <th>Quantité</th>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("montantHt")}>
                    Montant HT {sortKey === "montantHt" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {pageRows.map((r, idx) => {
                  const pi = r.pi || {};
                  const c = r.client || {};
                  const address = [c.adresse1, c.adresse2].filter(Boolean).join(" ");
                  return (
                    <tr key={`${r.devisId}_${start + idx}`}>
                      <td>{r.devisNumber || "—"}</td>
                      <td>Murs leds</td>
                      <td>{pi?.pitchLabel || "—"}</td>
                      <td>{pi?.resolutionLabel || "—"}</td>
                      <td>{pi?.pitchId || "—"}</td>

                      <td>{r.agentDisplay || "—"}</td>
                      <td>{fmtDate(r.createdAt)}</td>

                      <td>{c.nom || "—"}</td>
                      <td>{c.prenom || "—"}</td>
                      <td>{c.societe || "—"}</td>
                      <td>{address || "—"}</td>
                      <td>{c.codePostal || "—"}</td>
                      <td>{c.ville || "—"}</td>
                      <td>{c.telephone || "—"}</td>
                      <td>{c.email || "—"}</td>
                      <td>{c.commentaires || "—"}</td>

                      <td>{pi.surfaceM2 ?? "—"}</td>
                      <td>{pi.diagonaleCm ?? "—"}</td>
                      <td>{pi.financementMonths ?? "—"}</td>
                      <td>{pi.prixTotalHtMois ?? "—"}</td>
                      <td>{pi.quantite ?? "—"}</td>
                      <td>{pi.montantHt ?? "—"}</td>

                      <td>
                        <button className="btn btn-dark" type="button" onClick={() => openPdf(r.devisId)}>
                          Voir PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {activeRows.length === 0 ? (
                  <tr>
                    <td className="muted" colSpan={22}>
                      Aucun devis.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ overflow: "auto" }}>
            <table className="table table-wide">
              <thead>
                <tr>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("devisNumber")}>
                    Code devis {sortKey === "devisNumber" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>

                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("rowId")}>
                    Taille sélectionnée {sortKey === "rowId" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th>Mémoire</th>
                  <th>Prix unitaire</th>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("qty")}>
                    Quantité {sortKey === "qty" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("totalPrice")}>
                    Total {sortKey === "totalPrice" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>

                  <th>Taille (pouces)</th>
                  <th>Durée leasing (mois)</th>
                  <th>Prix associé</th>

                  <th>Commentaires</th>

                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("agent")}>
                    Utilisateur {sortKey === "agent" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("createdAt")}>
                    Date {sortKey === "createdAt" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>

                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {pageRows.map((r) => {
                  const c = r.client || {};
                  return (
                    <tr key={`${r.devisId}_${r.productId}_${r.rowId}`}>
                      <td>{r.devisNumber || "—"}</td>

                      <td>{r.rowId || "—"}</td>
                      <td>{r.memoryLabel || r.memId || "—"}</td>
                      <td>{r.unitPrice != null ? `${money(r.unitPrice)} €` : "—"}</td>
                      <td>{r.qty ?? 1}</td>
                      <td>{r.totalPrice != null ? `${money(r.totalPrice)} €` : "—"}</td>

                      <td>{r.sizeInches != null ? r.sizeInches : "—"}</td>
                      <td>{r.leasingMonths || "—"} mois</td>
                      <td>{r.priceLabel || "—"}</td>

                      <td>{c.commentaires || "—"}</td>

                      <td>{r.agentDisplay || "—"}</td>
                      <td>{fmtDate(r.createdAt)}</td>
                      <td>
                        <button className="btn btn-dark" type="button" onClick={() => openPdf(r.devisId)}>
                          Voir PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {activeRows.length === 0 ? (
                  <tr>
                    <td className="muted" colSpan={13}>
                      Aucun devis.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 12 }}>
          <div className="muted">
            {total === 0 ? "0 résultat" : `${start + 1}-${Math.min(end, total)} sur ${total} résultat(s)`}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="btn" type="button" disabled={safePage <= 1} onClick={() => setPage(1)}>
              «
            </button>
            <button className="btn" type="button" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Préc.
            </button>

            <div className="muted">
              Page {safePage} / {totalPages}
            </div>

            <button
              className="btn"
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Suiv.
            </button>
            <button className="btn" type="button" disabled={safePage >= totalPages} onClick={() => setPage(totalPages)}>
              »
            </button>
          </div>
        </div>
      ) : null}

      <div className="muted" style={{ paddingTop: 10 }}>
        Astuce : tape un code devis (ex: DE01049) ou un email pour filtrer.
      </div>
    </div>
  );
}
