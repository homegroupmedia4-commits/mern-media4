// client/src/pages/agent/AgentOtherProductsBlock.jsx
import { useEffect, useMemo, useState } from "react";

/**
 * Affiche les blocs "Choisissez la taille" + "Tailles sélectionnées"
 * pour tous les produits cochés (SAUF "Murs leds").
 *
 * Dépend de :
 * - /api/other-product-sizes
 * - /api/memory-options
 * - /api/leasing-durations (passé via props "durations")
 */
export default function AgentOtherProductsBlock({
  API,
  products = [],
  selectedProductIds = [],
  wallLedsProductId = "",
  durations = [],
  loadingDur = false,

  // remonte au parent pour le "Valider" (devis)
  onSelectionsChange,
}) {
  const [otherSizes, setOtherSizes] = useState([]);
  const [loadingOtherSizes, setLoadingOtherSizes] = useState(false);

  const [memOptions, setMemOptions] = useState([]);
  const [loadingMemOptions, setLoadingMemOptions] = useState(false);

  // { [productId]: { leasingMonths: "63", checked: { [rowId]: { memId, qty }}}}
  // const [otherSelections, setOtherSelections] = useState({});
  const [otherSelections, setOtherSelections] = useState({});

  // -----------------------------
  // Load sizes + mem options (1x)
  // -----------------------------
  useEffect(() => {
    (async () => {
      setLoadingOtherSizes(true);
      try {
        const res = await fetch(`${API}/api/other-product-sizes`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setOtherSizes(list.filter((x) => x?.isActive !== false));
      } catch (e) {
        console.error("other-product-sizes load error", e);
      } finally {
        setLoadingOtherSizes(false);
      }
    })();
  }, [API]);

  useEffect(() => {
    (async () => {
      setLoadingMemOptions(true);
      try {
        const res = await fetch(`${API}/api/memory-options`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setMemOptions(list.filter((x) => x?.isActive !== false));
      } catch (e) {
        console.error("memory-options load error", e);
      } finally {
        setLoadingMemOptions(false);
      }
    })();
  }, [API]);

  // -----------------------------
  // Helpers
  // -----------------------------
  const norm = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const durationFallback = useMemo(() => [{ months: 63 }, { months: 48 }, { months: 36 }], []);
  const durationOptions = useMemo(
    () =>
      (durations && durations.length ? durations : durationFallback).slice().sort((a, b) => (a?.months || 0) - (b?.months || 0)),
    [durations, durationFallback]
  );

  const getDefaultLeasingMonths = () => {
    const first = durationOptions[0]?.months;
    return first ? String(first) : "63";
  };

  const selectedProducts = useMemo(() => {
    return (products || []).filter((p) => {
      const id = p?._id || p?.id;
      return id && selectedProductIds.includes(id);
    });
  }, [products, selectedProductIds]);

  // Autres produits = tout sauf Murs leds
  const otherSelectedProducts = useMemo(() => {
    return selectedProducts.filter((p) => {
      const id = p?._id || p?.id;
      return id && id !== wallLedsProductId;
    });
  }, [selectedProducts, wallLedsProductId]);

  // Assure que chaque produit sélectionné a une config
  useEffect(() => {
    if (!otherSelectedProducts.length) {
      setOtherSelections({});
      return;
    }

    setOtherSelections((prev) => {
      const next = { ...prev };

      // add missing
      for (const p of otherSelectedProducts) {
        const pid = p?._id || p?.id;
        if (!pid) continue;


        // if (!next[pid]) {
        //   next[pid] = { leasingMonths: getDefaultLeasingMonths(), checked: {} };
        // }

        if (!next[pid]) {
  const m = getDefaultLeasingMonths();
  next[pid] = { leasingMonths: m, byMonths: { [m]: { checked: {} } } };
} else {
  // ✅ assure la structure byMonths
  const current = next[pid].leasingMonths || getDefaultLeasingMonths();
  if (!next[pid].byMonths) next[pid].byMonths = {};
  if (!next[pid].byMonths[current]) next[pid].byMonths[current] = { checked: {} };
  if (!next[pid].leasingMonths) next[pid].leasingMonths = current;
}



      }

      // remove unselected
      for (const pid of Object.keys(next)) {
        const still = otherSelectedProducts.some((p) => (p?._id || p?.id) === pid);
        if (!still) delete next[pid];
      }

      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherSelectedProducts.map((p) => p?._id || p?.id).join("|"), durationOptions.length]);

  // Remonter au parent à chaque changement
  useEffect(() => {
    onSelectionsChange?.(otherSelections);
  }, [otherSelections, onSelectionsChange]);

  // const setOtherLeasingMonths = (productId, months) => {
  //   setOtherSelections((prev) => ({
  //     ...prev,
  //     [productId]: {
  //       ...(prev[productId] || { leasingMonths: getDefaultLeasingMonths(), checked: {} }),
  //       leasingMonths: String(months),
  //       checked: {}, 
  //     },
  //   }));
  // };

  const setOtherLeasingMonths = (productId, months) => {
  const m = String(months);

  setOtherSelections((prev) => {
    const curr = prev[productId] || { leasingMonths: getDefaultLeasingMonths(), byMonths: {} };
    const byMonths = { ...(curr.byMonths || {}) };

    if (!byMonths[m]) byMonths[m] = { checked: {} }; // ✅ garde les autres durées
    return {
      ...prev,
      [productId]: {
        ...curr,
        leasingMonths: m,
        byMonths,
      },
    };
  });
};


  // const toggleOtherSize = (productId, row) => {
  //   const rowId = row._id;
  //   setOtherSelections((prev) => {
  //     const curr = prev[productId] || { leasingMonths: getDefaultLeasingMonths(), checked: {} };
  //     const has = !!curr.checked[rowId];

  //     const nextChecked = { ...curr.checked };
  //     if (has) {
  //       delete nextChecked[rowId];
  //     } else {
  //       nextChecked[rowId] = {
  //         memId: memOptions?.[0]?._id || "",
  //         qty: 1,
  //       };
  //     }

  //     return { ...prev, [productId]: { ...curr, checked: nextChecked } };
  //   });
  // };

  const toggleOtherSize = (productId, row) => {
  const rowId = row._id;

  setOtherSelections((prev) => {
    const curr = prev[productId] || { leasingMonths: getDefaultLeasingMonths(), byMonths: {} };
    const months = String(curr.leasingMonths || getDefaultLeasingMonths());

    const byMonths = { ...(curr.byMonths || {}) };
    const bucket = byMonths[months] || { checked: {} };

    const has = !!bucket.checked[rowId];
    const nextChecked = { ...(bucket.checked || {}) };

    if (has) {
      delete nextChecked[rowId];
    } else {
      nextChecked[rowId] = {
        memId: memOptions?.[0]?._id || "",
        qty: 1,
      };
    }

    byMonths[months] = { ...bucket, checked: nextChecked };

    return {
      ...prev,
      [productId]: {
        ...curr,
        leasingMonths: months,
        byMonths,
      },
    };
  });
};


  // const updateOtherSize = (productId, rowId, patch) => {
  //   setOtherSelections((prev) => {
  //     const curr = prev[productId];
  //     if (!curr?.checked?.[rowId]) return prev;
  //     return {
  //       ...prev,
  //       [productId]: {
  //         ...curr,
  //         checked: { ...curr.checked, [rowId]: { ...curr.checked[rowId], ...patch } },
  //       },
  //     };
  //   });
  // };

  const updateOtherSize = (productId, rowId, patch) => {
  setOtherSelections((prev) => {
    const curr = prev[productId];
    if (!curr) return prev;

    const months = String(curr.leasingMonths || getDefaultLeasingMonths());
    const byMonths = { ...(curr.byMonths || {}) };
    const bucket = byMonths[months] || { checked: {} };

    if (!bucket?.checked?.[rowId]) return prev;

    byMonths[months] = {
      ...bucket,
      checked: {
        ...bucket.checked,
        [rowId]: { ...bucket.checked[rowId], ...patch },
      },
    };

    return {
      ...prev,
      [productId]: {
        ...curr,
        byMonths,
      },
    };
  });
};



  const computeOtherLine = ({ basePrice, memId, qty }) => {
    const memPrice = memOptions.find((m) => m._id === memId)?.price ?? 0;
    const unit = Number(basePrice || 0) + Number(memPrice || 0);
    const q = Math.max(1, parseInt(String(qty || 1), 10) || 1);
    return { unit, total: unit * q };
  };

  // -----------------------------
  // UI
  // -----------------------------
  if (!otherSelectedProducts.length) return null;

  return (
    <>
      {otherSelectedProducts.map((p) => {
        const productId = p?._id || p?.id;
        const productName = p?.name || "Produit";

        // const sel = otherSelections[productId] || {
        //   leasingMonths: getDefaultLeasingMonths(),
        //   checked: {},
        // };

        const sel = otherSelections[productId] || {
  leasingMonths: getDefaultLeasingMonths(),
  byMonths: {},
};

const activeMonths = String(sel.leasingMonths || getDefaultLeasingMonths());
const checkedActive = sel.byMonths?.[activeMonths]?.checked || {};


        const rowsForProduct = otherSizes.filter((r) => {
          return norm(r.product) === norm(productName) && String(r.leasingMonths) === String(sel.leasingMonths);
        });

        const checkedIds = Object.keys(checkedActive || {});
        const hasChecked = checkedIds.length > 0;

        return (
          <div key={productId} className="agenthome-section">
            <div className="agenthome-sectionTitle">Choisissez la taille :</div>

            <div className="agenthome-muted" style={{ marginBottom: 8 }}>
              {productName}
            </div><div className="agenthome-selectCol">
  <label className="agenthome-label">
    Durée de leasing :
  </label>

  <select
    className="agenthome-select"
    value={sel.leasingMonths}
    onChange={(e) => setOtherLeasingMonths(productId, e.target.value)}
    disabled={loadingDur}
  >
    {durationOptions.map((d) => (
      <option key={d._id || d.months} value={String(d.months)}>
        {d.months} mois
      </option>
    ))}
  </select>
</div>


            {loadingOtherSizes ? (
              <div className="agenthome-muted">Chargement des tailles…</div>
            ) : rowsForProduct.length ? (
              <div className="agenthome-products" style={{ marginTop: 8 }}>
                {rowsForProduct
                  .slice()
                  .sort((a, b) => (a.sizeInches || 0) - (b.sizeInches || 0))
                  .map((row) => {
                    const checked = !!checkedActive[row._id];
                    return (
                      <label key={row._id} className="agenthome-check">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOtherSize(productId, row)}
                        />
                        <span>{row.sizeInches} pouces</span>
                      </label>
                    );
                  })}
              </div>
            ) : (
              <div className="agenthome-muted">Aucune taille configurée pour cette durée.</div>
            )}

            {hasChecked ? (
              <div className="agenthome-subcard" style={{ marginTop: 10 }}>
                <div className="agenthome-subcardTitle">Tailles sélectionnées : {productName}</div>

                {checkedIds.map((rowId) => {
                  const row = otherSizes.find((r) => r._id === rowId);
                  const line = checkedActive[rowId];
                  if (!row || !line) return null;

                  const calc = computeOtherLine({
                    basePrice: row.price,
                    memId: line.memId,
                    qty: line.qty,
                  });

                  return (
                    <div key={rowId} className="agenthome-pitchCard" style={{ marginTop: 10 }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>• {row.sizeInches} pouces</div>

                      <div className="agenthome-grid2">
                        <div className="agenthome-field agenthome-field--full">
                          <label>Mémoire :</label>
                          <select
                            className="agenthome-select"
                            value={line.memId}
                            onChange={(e) => updateOtherSize(productId, rowId, { memId: e.target.value })}
                            disabled={loadingMemOptions}
                          >
                            {memOptions.length ? (
                              memOptions.map((m) => (
                                <option key={m._id} value={m._id}>
                                  {m.name} – {Number(m.price || 0).toFixed(2)} €
                                </option>
                              ))
                            ) : (
                              <option value="">— aucune mémoire —</option>
                            )}
                          </select>
                        </div>

                        <div className="agenthome-field">
                          <label>Prix final ({productName}) :</label>
                          <input
                            className="agenthome-input agenthome-input--readonly"
                            readOnly
                            value={calc.unit.toFixed(2)}
                          />
                        </div>

                        <div className="agenthome-field">
                          <label>Quantité :</label>
                          <input
                            className="agenthome-input"
                            type="number"
                            min="1"
                            step="1"
                            value={line.qty}
                            onChange={(e) => updateOtherSize(productId, rowId, { qty: e.target.value })}
                          />
                        </div>

                        <div className="agenthome-field agenthome-field--full">
                          <label>Montant HT :</label>
                          <input
                            className="agenthome-input agenthome-input--readonly"
                            readOnly
                            value={calc.total.toFixed(2)}
                          />
                        </div>
                      </div>

                      <div className="agenthome-muted" style={{ marginTop: 6 }}>
                        Code produit : <b>{row.productCode || "—"}</b>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="agenthome-muted" style={{ marginTop: 8 }}>
                Aucune taille sélectionnée
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
