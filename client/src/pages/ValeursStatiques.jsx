import { useEffect, useMemo, useState } from "react";

export default function ValeursStatiques({ API }) {
  const [tab, setTab] = useState("durations"); // durations | coeffs

  // ---- Durées ----
  const [months, setMonths] = useState("");
  const [durations, setDurations] = useState([]);
  const [loadingDur, setLoadingDur] = useState(true);
  const [savingDur, setSavingDur] = useState(false);

  // ---- Static values ----
  const [values, setValues] = useState(null);
  const [loadingVals, setLoadingVals] = useState(true);
  const [savingVals, setSavingVals] = useState(false);

  const [error, setError] = useState("");

  const FIELDS = useMemo(
    () => [
      { key: "accessoires_players", label: "Accessoires players (€)" },
      { key: "cout_locaux_chine_france", label: "Coût locaux Chine-France (€)" },
      { key: "coeff_leasing", label: "Coeff. leasing" },
      { key: "marge_catalogue", label: "Marge catalogue" },
      { key: "droits_douane", label: "Droits de douane" },
      { key: "taux_eur_usd", label: "Taux € / $" },
      { key: "fixation_finition_eur_ml", label: "Fixation & finition (€/ml)" },
      { key: "tirage_cable_eur_m2", label: "Tirage cable (€/m²)" },
      { key: "reprise_peinture_eur_m2", label: "Reprise peinture (€/m²)" },
      { key: "coffrage_placo_eur_m2", label: "Coffrage placo (€/m²)" },
      { key: "raccordement_eur_m2", label: "Raccordement (€/m²)" },
      { key: "livraison_eur_m2", label: "Livraison (€/m²)" },
      { key: "prix_container_eur_m2", label: "Prix container (€/m²)" },
      { key: "installation_eur_m2", label: "Installation (€/m²)" },
    ],
    []
  );

  const loadDurations = async () => {
    setError("");
    setLoadingDur(true);
    try {
      const res = await fetch(`${API}/api/leasing-durations`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setDurations(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les durées de leasing.");
    } finally {
      setLoadingDur(false);
    }
  };

  const loadValues = async () => {
    setError("");
    setLoadingVals(true);
    try {
      const լին = await fetch(`${API}/api/static-values`);
      if (!לִן.ok) throw new Error(await לִן.text());
      const data = await לִן.json();
      setValues(data || {});
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les valeurs statiques.");
    } finally {
      setLoadingVals(false);
    }
  };

  useEffect(() => {
    loadDurations();
    loadValues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addDuration = async () => {
    const m = Number(months);
    if (!Number.isFinite(m) || m <= 0) return;

    setSavingDur(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/leasing-durations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months: m }),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      setDurations((prev) => [...prev, created].sort((a, b) => a.months - b.months));
      setMonths("");
    } catch (e) {
      console.error(e);
      setError("Ajout impossible (doublon ou erreur serveur).");
    } finally {
      setSavingDur(false);
    }
  };

  const deleteDuration = async (id) => {
    const ok = confirm("Supprimer cette durée ?");
    if (!ok) return;

    setError("");
    try {
      const res = await fetch(`${API}/api/leasing-durations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setDurations((prev) => prev.filter((d) => d._id !== id));
    } catch (e) {
      console.error(e);
      setError("Suppression impossible.");
    }
  };

  const onValueChange = (key) => (e) => {
    const v = e.target.value;
    setValues((prev) => ({ ...(prev || {}), [key]: v }));
  };

  const saveAllValues = async () => {
    if (!values) return;

    setSavingVals(true);
    setError("");
    try {
      // convert en numbers
      const payload = {};
      for (const f of FIELDS) {
        payload[f.key] = Number(values[f.key]);
      }

      const res = await fetch(`${API}/api/static-values`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setValues(updated);
    } catch (e) {
      console.error(e);
      setError("Sauvegarde impossible (valeur invalide ou erreur serveur).");
    } finally {
      setSavingVals(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Valeurs Statiques</h2>

        <div className="subtabs">
          <button
            className={`subtab ${tab === "durations" ? "active" : ""}`}
            type="button"
            onClick={() => setTab("durations")}
          >
            Durées de leasing
          </button>
          <button
            className={`subtab ${tab === "coeffs" ? "active" : ""}`}
            type="button"
            onClick={() => setTab("coeffs")}
          >
            Coefficients & montants par défaut
          </button>
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      {tab === "durations" ? (
        <div className="vs-grid">
          <div className="vs-card">
            <div className="vs-card-title">Durées de leasing</div>

            <div className="page-actions">
              <input
                className="input"
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                placeholder="ex : 72"
                type="number"
              />
              <button className="btn btn-dark" type="button" onClick={addDuration} disabled={savingDur}>
                {savingDur ? "Ajout..." : "Ajouter"}
              </button>
            </div>

            <div className="table-wrap" style={{ marginTop: 14 }}>
              {loadingDur ? (
                <div className="muted">Chargement...</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Durée (mois)</th>
                      <th style={{ width: "140px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {durations.map((d) => (
                      <tr key={d._id}>
                        <td>{d.months} mois</td>
                        <td>
                          <button className="btn btn-soft-danger" type="button" onClick={() => deleteDuration(d._id)}>
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                    {durations.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="muted">
                          Aucune durée pour l’instant.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="vs-grid">
          <div className="vs-card">
            <div className="vs-card-title">Coefficients & montants par défaut</div>

            {loadingVals ? (
              <div className="muted">Chargement...</div>
            ) : (
              <>
                <div className="vs-form">
                  {FIELDS.map((f) => (
                    <div className="vs-row" key={f.key}>
                      <div className="vs-label">{f.label}</div>
                      <input
                        className="input vs-input"
                        type="number"
                        step="0.01"
                        value={values?.[f.key] ?? ""}
                        onChange={onValueChange(f.key)}
                      />
                    </div>
                  ))}
                </div>

                <button className="btn btn-dark" type="button" onClick={saveAllValues} disabled={savingVals}>
                  {savingVals ? "Sauvegarde..." : "Enregistrer"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
