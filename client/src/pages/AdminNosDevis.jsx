// client/src/pages/AdminNosDevis.jsx
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

const fmtDate = (iso) => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
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

  const [tab, setTab] = useState("murs_leds");
  const [q, setQ] = useState("");
  const [agentId, setAgentId] = useState("");

  const [agents, setAgents] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const authHeaders = () => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  // ✅ agents-lite => peut 403 si pas admin, on affiche juste "Tous les utilisateurs"
  const loadAgents = async () => {
    try {
      const res = await fetch(`${API}/api/agents/agents-lite`, {
        headers: authHeaders(),
      });

      // si pas admin => pas grave
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

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const url =
        `${API}/api/agents/devis?tab=${encodeURIComponent(tab)}` +
        `&q=${encodeURIComponent(q)}` +
        `&agentId=${encodeURIComponent(agentId)}`;

      const res = await fetch(url, { headers: authHeaders() });

      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 401) throw new Error("401");
        throw new Error(txt);
      }

      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      if (String(e?.message) === "401") {
        setError("Non autorisé. Token manquant/expiré (admin_token_v1 ou agent_token_v1).");
      } else {
        setError("Impossible de charger les devis.");
      }
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, agentId]);

  useEffect(() => {
    setPage(1);
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const openPdf = (id) => {
    const token = getAuthToken();
    const url = token
      ? `${API}/api/agents/devis/${id}/pdf?token=${encodeURIComponent(token)}`
      : `${API}/api/agents/devis/${id}/pdf`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // =========================
  // Flatten rows
  // =========================
  const mursRows = useMemo(() => {
    const out = [];
    for (const d of rows) {
      const list = Array.isArray(d.pitchInstances) ? d.pitchInstances : [];
      if (!list.length) continue;

      for (const pi of list) {
        const agentName = [d.agentSnapshot?.prenom, d.agentSnapshot?.nom]
          .filter(Boolean)
          .join(" ");
        out.push({
          devisId: d._id,
          devisNumber: d.devisNumber,
          createdAt: d.createdAt,
          agentDisplay: d.agentSnapshot?.email || agentName || "",
          client: d.client || {},
          pi: pi || {},
        });
      }
    }
    return out;
  }, [rows]);

  const otherRows = useMemo(() => {
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
          const agentName = [d.agentSnapshot?.prenom, d.agentSnapshot?.nom]
            .filter(Boolean)
            .join(" ");
          out.push({
            devisId: d._id,
            devisNumber: d.devisNumber,
            createdAt: d.createdAt,
            agentDisplay: d.agentSnapshot?.email || agentName || "",
            client: d.client || {},
            productId: pid,
            rowId,
            leasingMonths,
            memId: line.memId || "",
            qty: line.qty || 1,
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

  // =========================
  // Sorting
  // =========================
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
      return (
        String(va).localeCompare(String(vb), "fr", { sensitivity: "base" }) * dir
      );
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
      return (
        String(va).localeCompare(String(vb), "fr", { sensitivity: "base" }) * dir
      );
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
          Admin : devis visibles selon les droits du token (agent ou admin).
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
          title="Filtrer par utilisateur (si autorisé)"
          disabled={agents.length === 0}
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

      <div className="page-actions" style={{ marginBottom: 12, gap: 10 }}>
        <div className="muted">
          {loading ? "Chargement..." : `${total} ligne(s)`}
          {!loading && totalPages > 1 ? ` — page ${safePage}/${totalPages}` : ""}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn btn-outline"
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1 || loading}
          >
            ← Précédent
          </button>
          <button
            className="btn btn-outline"
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages || loading}
          >
            Suivant →
          </button>
        </div>
      </div>

      <div className="table-wrap">
        {loading ? (
          <div className="muted">Chargement...</div>
        ) : pageRows.length === 0 ? (
          <div className="muted">Aucune donnée.</div>
        ) : tab === "murs_leds" ? (
          <table className="table table-wide">
            <thead>
              <tr>
                <th onClick={() => toggleSort("createdAt")} style={{ cursor: "pointer" }}>
                  Date {sortKey === "createdAt" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>

                <th onClick={() => toggleSort("devisNumber")} style={{ cursor: "pointer" }}>
                  Devis {sortKey === "devisNumber" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>

                <th onClick={() => toggleSort("agent")} style={{ cursor: "pointer" }}>
                  Agent {sortKey === "agent" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>

                <th onClick={() => toggleSort("clientEmail")} style={{ cursor: "pointer" }}>
                  Client{" "}
                  {sortKey === "clientEmail" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>

                <th onClick={() => toggleSort("pitchLabel")} style={{ cursor: "pointer" }}>
                  Pitch{" "}
                  {sortKey === "pitchLabel" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>

                <th onClick={() => toggleSort("resolutionLabel")} style={{ cursor: "pointer" }}>
                  Résolution{" "}
                  {sortKey === "resolutionLabel" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>

                <th onClick={() => toggleSort("surfaceM2")} style={{ cursor: "pointer" }}>
                  Surface m²{" "}
                  {sortKey === "surfaceM2" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>

                <th onClick={() => toggleSort("montantHt")} style={{ cursor: "pointer" }}>
                  Montant HT{" "}
                  {sortKey === "montantHt" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>

                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {pageRows.map((r, idx) => {
                const pi = r.pi || {};
                const c = r.client || {};

                const devisLabel =
                  r.devisNumber ||
                  (r.devisId ? `DE${String(r.devisId).slice(-4).toUpperCase()}` : "—");

                return (
                  <tr key={`${r.devisId}-${idx}`}>
                    <td>{fmtDate(r.createdAt)}</td>
                    <td className="mono">{devisLabel}</td>
                    <td>{r.agentDisplay || "—"}</td>
                    <td title={c.email || ""}>{c.email || c.company || "—"}</td>
                    <td>{pi.pitchLabel || "—"}</td>
                    <td>{pi.resolutionLabel || "—"}</td>
                    <td>
                      {Number.isFinite(Number(pi.surfaceM2))
                        ? Number(pi.surfaceM2).toFixed(2)
                        : "—"}
                    </td>
                    <td>{money(pi.montantHt)} €</td>
                    <td>
                      <button className="btn btn-outline" type="button" onClick={() => openPdf(r.devisId)}>
                        PDF
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="table table-wide">
            <thead>
              <tr>
                <th onClick={() => toggleSort("createdAt")} style={{ cursor: "pointer" }}>
                  Date {sortKey === "createdAt" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>

                <th onClick={() => toggleSort("devisNumber")} style={{ cursor: "pointer" }}>
                  Devis {sortKey === "devisNumber" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>

                <th onClick={() => toggleSort("agent")} style={{ cursor: "pointer" }}>
                  Agent {sortKey === "agent" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>

                <th onClick={() => toggleSort("clientEmail")} style={{ cursor: "pointer" }}>
                  Client{" "}
                  {sortKey === "clientEmail" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>

                <th onClick={() => toggleSort("rowId")} style={{ cursor: "pointer" }}>
                  Item {sortKey === "rowId" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>

                <th>Leasing</th>
                <th>Mémoire</th>

                <th onClick={() => toggleSort("qty")} style={{ cursor: "pointer" }}>
                  Qté {sortKey === "qty" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>

                <th>PU</th>

                <th onClick={() => toggleSort("totalPrice")} style={{ cursor: "pointer" }}>
                  Total {sortKey === "totalPrice" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>

                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {pageRows.map((r, idx) => {
                const c = r.client || {};
                const devisLabel =
                  r.devisNumber ||
                  (r.devisId ? `DE${String(r.devisId).slice(-4).toUpperCase()}` : "—");

                return (
                  <tr key={`${r.devisId}-${r.rowId}-${idx}`}>
                    <td>{fmtDate(r.createdAt)}</td>
                    <td className="mono">{devisLabel}</td>
                    <td>{r.agentDisplay || "—"}</td>
                    <td title={c.email || ""}>{c.email || c.company || "—"}</td>
                    <td className="mono">{r.rowId || "—"}</td>
                    <td>{r.leasingMonths ? `${r.leasingMonths} mois` : "—"}</td>
                    <td>{r.memoryLabel || (r.memId ? `#${r.memId}` : "—")}</td>
                    <td>{r.qty}</td>
                    <td>
                      {r.priceLabel
                        ? r.priceLabel
                        : Number.isFinite(Number(r.unitPrice))
                        ? `${money(r.unitPrice)} €`
                        : "—"}
                    </td>
                    <td>
                      {Number.isFinite(Number(r.totalPrice)) ? `${money(r.totalPrice)} €` : "—"}
                    </td>
                    <td>
                      <button className="btn btn-outline" type="button" onClick={() => openPdf(r.devisId)}>
                        PDF
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && totalPages > 1 ? (
        <div className="page-actions" style={{ marginTop: 12, gap: 10 }}>
          <div className="muted">
            Page {safePage} / {totalPages} — {total} ligne(s)
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-outline" type="button" onClick={() => setPage(1)} disabled={safePage === 1}>
              « Début
            </button>
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
            >
              ← Précédent
            </button>
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
            >
              Suivant →
            </button>
            <button className="btn btn-outline" type="button" onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>
              Fin »
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
