// client/src/pages/AdminTaegLeaseur.jsx
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

const ADMIN_TOKEN_KEY = "admin_token_v1";
const DEFAULT_DURATIONS = [24, 36, 48, 63];

export default function AdminTaegLeaseur() {
  const ctx = useOutletContext() || {};
  const API = ctx.API ?? "";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newMonths, setNewMonths] = useState("");
  const [draftTaeg, setDraftTaeg] = useState({});

  const token = () => localStorage.getItem(ADMIN_TOKEN_KEY) || "";
  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token()}`,
  });

  const fmtPct = (dec) => `${((Number(dec) || 0) * 100).toFixed(2).replace(".", ",")} %`;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/leaseur-rates`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setRows(list);
      const drafts = {};
      list.forEach((r) => {
        drafts[r._id] = ((Number(r.taegAnnual) || 0) * 100).toFixed(2).replace(".", ",");
      });
      setDraftTaeg(drafts);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les taux leaseur.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveTaeg = async (row) => {
    const raw = String(draftTaeg[row._id] ?? "").replace(",", ".");
    const pct = Number(raw);
    if (!Number.isFinite(pct)) return setError("TAEG invalide.");
    const decimal = pct / 100;
    if (Math.abs(decimal - (Number(row.taegAnnual) || 0)) < 1e-9) return;
    try {
      const res = await fetch(`${API}/api/leaseur-rates/${row._id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ taegAnnual: decimal }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e) {
      console.error(e);
      setError("Erreur lors de l'enregistrement du TAEG.");
    }
  };

  const addDuration = async (months) => {
    const m = Number(months);
    if (!m || m <= 0) return setError("Durée invalide.");
    try {
      const res = await fetch(`${API}/api/leaseur-rates`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ months: m, taegAnnual: 0 }),
      });
      if (!res.ok) throw new Error(await res.text());
      setNewMonths("");
      await load();
    } catch (e) {
      console.error(e);
      setError("Erreur lors de l'ajout (durée déjà existante ?).");
    }
  };

  const removeRow = async (id) => {
    if (!window.confirm("Supprimer cette durée ?")) return;
    try {
      const res = await fetch(`${API}/api/leaseur-rates/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e) {
      console.error(e);
      setError("Erreur lors de la suppression.");
    }
  };

  const seedDefaults = async () => {
    const existing = new Set(rows.map((r) => Number(r.months)));
    for (const m of DEFAULT_DURATIONS) if (!existing.has(m)) await addDuration(m);
  };

  const cell = { border: "1px solid #e5e7eb", padding: "8px 10px", textAlign: "left" };
  const head = { ...cell, background: "#8bc53f", fontWeight: 700 };

  return (
    <div style={{ maxWidth: 980 }}>
      <h2 style={{ marginBottom: 4 }}>Tableau TAEG</h2>
      <p style={{ color: "#666", marginTop: 0 }}>
        Saisis uniquement le <b>TAEG annuel (%)</b>. Les deux dernières colonnes
        sont calculées automatiquement et stockées en base.
      </p>

      {error ? <div style={{ color: "#b91c1c", marginBottom: 10 }}>{error}</div> : null}

      {loading ? (
        <div>Chargement…</div>
      ) : (
        <>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={head}>Durée (mois)</th>
                <th style={head}>TAEG annuel (%)</th>
                <th style={head}>Coût leaseur total / coût total</th>
                <th style={head}>Coût du crédit / montant financé</th>
                <th style={head}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td style={cell}>{r.months}</td>
                  <td style={cell}>
                    <input
                      style={{ width: 90, padding: 6 }}
                      value={draftTaeg[r._id] ?? ""}
                      onChange={(e) =>
                        setDraftTaeg((p) => ({ ...p, [r._id]: e.target.value }))
                      }
                      onBlur={() => saveTaeg(r)}
                      placeholder="ex: 16,22"
                    />
                  </td>
                  <td style={cell}>{fmtPct(r.coutLeaseurSurCoutTotal)}</td>
                  <td style={cell}>{fmtPct(r.coutCreditSurMontantFinance)}</td>
                  <td style={cell}>
                    <button type="button" onClick={() => removeRow(r._id)}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td style={cell} colSpan={5}>
                    Aucune durée. Ajoute-les ci-dessous.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="number"
              min="1"
              step="1"
              placeholder="Nouvelle durée (mois)"
              value={newMonths}
              onChange={(e) => setNewMonths(e.target.value)}
              style={{ padding: 6, width: 180 }}
            />
            <button type="button" onClick={() => addDuration(newMonths)}>
              + Ajouter une durée
            </button>
            <button type="button" onClick={seedDefaults}>
              Créer les 4 durées par défaut
            </button>
          </div>
        </>
      )}
    </div>
  );
}
