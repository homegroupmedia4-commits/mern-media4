// client/src/pages/TaillesEcrans.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";

const SLUG_TO_TAB = {
  ajouterautreproduit: "autres_form",
  tableauautreproduit: "autres_list",
  ajoutememoire: "mem_form",
  tableaumemoire: "mem_list",
};

const TAB_TO_SLUG = {
  autres_form: "ajouterautreproduit",
  autres_list: "tableauautreproduit",
  mem_form: "ajoutememoire",
  mem_list: "tableaumemoire",
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

export default function TaillesEcrans() {
  const { API } = useOutletContext();
  const { slug } = useParams();
  const navigate = useNavigate();

  const [tab, setTab] = useState(() => SLUG_TO_TAB[slug] || "autres_form");
  const [error, setError] = useState("");

  // ✅ produits
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // leasing durations
  const [durations, setDurations] = useState([]);
  const [loadingDur, setLoadingDur] = useState(true);

  // autres produits sizes
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(true);

  // mémoires
  const [memRows, setMemRows] = useState([]);
  const [loadingMem, setLoadingMem] = useState(true);

  // form autres produits
  const [sizeInches, setSizeInches] = useState("");
  const [productId, setProductId] = useState("");
  const [leasingMonths, setLeasingMonths] = useState("");
  const [price, setPrice] = useState("");
  const [productCode, setProductCode] = useState("");
  const [savingOther, setSavingOther] = useState(false);

  // form mem
  const [memName, setMemName] = useState("");
  const [memPrice, setMemPrice] = useState("");
  const [savingMem, setSavingMem] = useState(false);

  // édition pivotée (produit + taille, prix par durée) via modale
  const [editModalGroup, setEditModalGroup] = useState(null);
  const [editModalDraft, setEditModalDraft] = useState(null);

  // inline edit (mem)
  const [memEditId, setMemEditId] = useState(null);
  const [memEditDraft, setMemEditDraft] = useState(null);

  // URL -> tab
  useEffect(() => {
    const nextTab = SLUG_TO_TAB[slug] || "autres_form";
    setTab(nextTab);
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // tab -> URL
const goTab = (nextTab) => {
  const nextSlug = TAB_TO_SLUG[nextTab] || "ajouterautreproduit";
  navigate(`/${nextSlug}`, { replace: false }); // ✅ slash + route simple
};


  const authHeaders = () => {
    const token = getAuthToken();
    return token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  };

  const durationOptions = useMemo(
    () => durations.slice().sort((a, b) => (a.months || 0) - (b.months || 0)),
    [durations]
  );

  const activeProducts = useMemo(() => {
    return (Array.isArray(products) ? products : []).filter((p) => p?.isActive !== false);
  }, [products]);

  // Colonnes de durée du tableau pivoté : durées réelles en DB + minimum garanti 24/36/48/63
  const pivotDurationCols = useMemo(() => {
    const base = ["24", "36", "48", "63"];
    const fromDb = durationOptions.map((d) => String(d.months));
    const merged = Array.from(new Set([...base, ...fromDb]));
    return merged.sort((a, b) => Number(a) - Number(b));
  }, [durationOptions]);

  // Tableau pivoté : une ligne par produit+taille, les durées deviennent des colonnes
  const pivotedRows = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const pid = typeof r.productId === "object" ? r.productId?._id : r.productId;
      const key = `${pid}_${r.sizeInches}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          productId: r.productId,
          sizeInches: r.sizeInches,
          productCode: r.productCode || "",
          prices: {}, // { "24": { id, price }, "36": { id, price }, ... }
          rowIds: [],
        });
      }
      const group = map.get(key);
      group.prices[String(r.leasingMonths)] = { id: r._id, price: r.price };
      group.rowIds.push(r._id);
      if (!group.productCode && r.productCode) group.productCode = r.productCode;
    }
    return Array.from(map.values());
  }, [rows]);

  // ---------- LOADERS ----------
  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`${API}/api/products`, { headers: authHeaders() });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les produits.");
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadDurations = async () => {
    setLoadingDur(true);
    try {
      const res = await fetch(`${API}/api/leasing-durations`, { headers: authHeaders() });
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

  const loadOthers = async () => {
    setLoadingRows(true);
    try {
      const res = await fetch(`${API}/api/other-product-sizes`, { headers: authHeaders() });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les tailles (autres produits).");
    } finally {
      setLoadingRows(false);
    }
  };

  const loadMem = async () => {
    setLoadingMem(true);
    try {
      const res = await fetch(`${API}/api/memory-options`, { headers: authHeaders() });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMemRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les mémoires.");
    } finally {
      setLoadingMem(false);
    }
  };

  const reloadAll = async () => {
    setError("");
    await Promise.all([loadProducts(), loadDurations(), loadOthers(), loadMem()]);
  };

  useEffect(() => {
    reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- ACTIONS (AUTRES PRODUITS) ----------
  const resetOtherForm = () => {
    setSizeInches("");
    setProductId("");
    setLeasingMonths("");
    setPrice("");
    setProductCode("");
  };

  const addOther = async () => {
    setSavingOther(true);
    setError("");
    try {
      const payload = {
        productId: productId || "",
        sizeInches: Number(sizeInches) || 0,
        leasingMonths: Number(leasingMonths) || 0,
        price: Number(String(price).replace(",", ".")) || 0,
        productCode: String(productCode || "").trim(),
      };

      const res = await fetch(`${API}/api/other-product-sizes`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());

      resetOtherForm();
      await loadOthers();
      goTab("autres_list");
    } catch (e) {
      console.error(e);
      setError("Impossible d’ajouter la taille (autres produits).");
    } finally {
      setSavingOther(false);
    }
  };

  const openEditModal = (group) => {
    const draftPrices = {};
    for (const m of pivotDurationCols) {
      draftPrices[m] = group.prices[m] ? String(group.prices[m].price) : "";
    }
    const sampleRow = rows.find((r) => group.rowIds.includes(r._id));

    setEditModalGroup(group);
    setEditModalDraft({
      productId:
        typeof group.productId === "object" ? (group.productId?._id || "") : (group.productId || ""),
      sizeInches: String(group.sizeInches ?? ""),
      productCode: group.productCode || "",
      prices: draftPrices,
      isActive: sampleRow?.isActive !== false,
    });
  };

  const closeEditModal = () => {
    setEditModalGroup(null);
    setEditModalDraft(null);
  };

  const saveEditModal = async () => {
    if (!editModalGroup || !editModalDraft) return;
    setError("");
    try {
      const productId = editModalDraft.productId;
      const sizeInches = Number(editModalDraft.sizeInches) || 0;
      const productCode = String(editModalDraft.productCode || "").trim();
      const isActive = !!editModalDraft.isActive;

      for (const months of pivotDurationCols) {
        const raw = String(editModalDraft.prices[months] ?? "").trim();
        const existing = editModalGroup.prices[months];

        if (raw === "") {
          if (existing?.id) {
            await fetch(`${API}/api/other-product-sizes/${existing.id}`, {
              method: "DELETE",
              headers: authHeaders(),
            });
          }
          continue;
        }

        const price = Number(raw.replace(",", ".")) || 0;

        if (existing?.id) {
          await fetch(`${API}/api/other-product-sizes/${existing.id}`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify({
              productId,
              sizeInches,
              leasingMonths: Number(months),
              price,
              productCode,
              isActive,
            }),
          });
        } else {
          await fetch(`${API}/api/other-product-sizes`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
              productId,
              sizeInches,
              leasingMonths: Number(months),
              price,
              productCode,
            }),
          });
        }
      }

      closeEditModal();
      await loadOthers();
    } catch (e) {
      console.error(e);
      setError("Impossible d’enregistrer les modifications (autres produits).");
    }
  };

  const deleteGroup = async (rowIds) => {
    if (!confirm("Supprimer ce produit et tous ses prix ?")) return;
    setError("");
    try {
      for (const id of rowIds) {
        await fetch(`${API}/api/other-product-sizes/${id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
      }
      await loadOthers();
    } catch (e) {
      console.error(e);
      setError("Impossible de supprimer ce produit.");
    }
  };

  // ---------- ACTIONS (MEMOIRES) ----------
  const resetMemForm = () => {
    setMemName("");
    setMemPrice("");
  };

  const addMem = async () => {
    setSavingMem(true);
    setError("");
    try {
      const payload = {
        name: String(memName || "").trim(),
        price: Number(String(memPrice).replace(",", ".")) || 0,
      };

      const res = await fetch(`${API}/api/memory-options`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());

      resetMemForm();
      await loadMem();
      goTab("mem_list");
    } catch (e) {
      console.error(e);
      setError("Impossible d’ajouter la mémoire.");
    } finally {
      setSavingMem(false);
    }
  };

  const startMemEdit = (r) => {
    setMemEditId(r?._id);
    setMemEditDraft({
      name: r?.name || "",
      price: r?.price ?? "",
      isActive: r?.isActive !== false,
    });
  };

  const cancelMemEdit = () => {
    setMemEditId(null);
    setMemEditDraft(null);
  };

  const saveMemEdit = async () => {
    if (!memEditId || !memEditDraft) return;
    setError("");
    try {
      const payload = {
        name: String(memEditDraft.name || "").trim(),
        price: Number(String(memEditDraft.price).replace(",", ".")) || 0,
        isActive: !!memEditDraft.isActive,
      };

      const res = await fetch(`${API}/api/memory-options/${memEditId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());

      cancelMemEdit();
      await loadMem();
    } catch (e) {
      console.error(e);
      setError("Impossible d’enregistrer la modification (mémoire).");
    }
  };

  const deleteMem = async (id) => {
    if (!id) return;
    setError("");
    try {
      const res = await fetch(`${API}/api/memory-options/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadMem();
    } catch (e) {
      console.error(e);
      setError("Impossible de supprimer la mémoire.");
    }
  };

const productLabelById = (pidOrObj) => {
  // si c'est déjà un objet mongoose populate
  if (pidOrObj && typeof pidOrObj === "object") {
    return pidOrObj.name || pidOrObj.label || pidOrObj._id || "—";
  }
  // sinon c'est un id
  const pid = String(pidOrObj || "");
  const p = activeProducts.find((x) => String(x?._id) === pid);
  return p?.name || p?.label || pid || "—";
};


  const isBusy =
    savingOther || savingMem || loadingProducts || loadingDur || loadingRows || loadingMem;

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Tailles Autres produits</h2>

        {/* <div className="subtabs">
          <button
            className={`subtab ${tab === "autres_form" ? "active" : ""}`}
            type="button"
            onClick={() => goTab("autres_form")}
          >
            Autres produits
          </button>

          <button
            className={`subtab ${tab === "autres_list" ? "active" : ""}`}
            type="button"
            onClick={() => goTab("autres_list")}
          >
            Tableau autres produits
          </button>

          <button
            className={`subtab ${tab === "mem_form" ? "active" : ""}`}
            type="button"
            onClick={() => goTab("mem_form")}
          >
            Mémoires disponibles
          </button>

          <button
            className={`subtab ${tab === "mem_list" ? "active" : ""}`}
            type="button"
            onClick={() => goTab("mem_list")}
          >
            Tableau mémoires
          </button>
        </div> */}



      </div>

      {error ? <div className="alert">{error}</div> : null}

      {/* ================== AUTRES FORM ================== */}
      {tab === "autres_form" ? (
        <div className="card">
          <div className="card-title">Ajouter une taille / prix (Autres produits)</div>

          <div className="grid" style={{ gap: 12, marginTop: 12 }}>
            <div>
              <div className="label">Produit</div>
              <select
                className="input"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                disabled={loadingProducts}
              >
                <option value="">{loadingProducts ? "Chargement..." : "Choisir un produit"}</option>
                {activeProducts.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="label">Taille (pouces)</div>
              <input
                className="input"
                value={sizeInches}
                onChange={(e) => setSizeInches(e.target.value)}
                placeholder="Ex: 55"
              />
            </div>

            <div>
              <div className="label">Leasing (mois)</div>
              <select
                className="input"
                value={leasingMonths}
                onChange={(e) => setLeasingMonths(e.target.value)}
                disabled={loadingDur}
              >
                <option value="">{loadingDur ? "Chargement..." : "Choisir une durée"}</option>
                {durationOptions.map((d) => (
                  <option key={d._id || d.months} value={d.months}>
                    {d.months} mois
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="label">Prix (HT)</div>
              <input
                className="input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ex: 1290"
              />
            </div>

            <div>
              <div className="label">Code produit (optionnel)</div>
              <input
                className="input"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                placeholder="Ex: TOT-55-36"
              />
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <button className="btn btn-dark" type="button" onClick={addOther} disabled={savingOther || isBusy}>
                {savingOther ? "Ajout..." : "Ajouter"}
              </button>
              <button className="btn btn-outline" type="button" onClick={resetOtherForm} disabled={isBusy}>
                Reset
              </button>
              <button className="btn btn-outline" type="button" onClick={() => goTab("autres_list")} disabled={isBusy}>
                Voir le tableau
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ================== AUTRES LIST ================== */}
      {tab === "autres_list" ? (
        <div className="card">
          <div className="card-title">Tableau — Autres produits</div>

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-outline" type="button" onClick={() => goTab("autres_form")} disabled={isBusy}>
              Ajouter autre produit
            </button>
            <button className="btn btn-outline" type="button" onClick={loadOthers} disabled={isBusy}>
              Rafraîchir
            </button>
          </div>

          <div className="table-wrap" style={{ marginTop: 12 }}>
            {loadingRows ? (
              <div className="muted">Chargement...</div>
            ) : pivotedRows.length === 0 ? (
              <div className="muted">Aucune donnée.</div>
            ) : (
              <table className="table table-wide">
                <thead>
                  <tr>
                    <th>REF</th>
                    <th>Type d'écran LCD</th>
                    <th>Taille</th>
                    {pivotDurationCols.map((m) => (
                      <th key={m}>{m} mois</th>
                    ))}
                    <th>Achat</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {pivotedRows.map((group) => (
                    <tr key={group.key}>
                      <td>{group.productCode || "—"}</td>
                      <td>{productLabelById(group.productId)}</td>
                      <td>{group.sizeInches != null ? `${group.sizeInches}"` : "—"}</td>
                      {pivotDurationCols.map((m) => (
                        <td key={m}>
                          {group.prices[m] ? `${Number(group.prices[m].price).toFixed(2)} €` : "—"}
                        </td>
                      ))}
                      <td>—</td>
                      <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="btn btn-outline" type="button" onClick={() => openEditModal(group)} disabled={isBusy}>
                          ✏️
                        </button>
                        <button className="btn btn-outline" type="button" onClick={() => deleteGroup(group.rowIds)} disabled={isBusy}>
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : null}

      {/* ================== MEM FORM ================== */}
      {tab === "mem_form" ? (
        <div className="card">
          <div className="card-title">Ajouter une mémoire</div>

          <div className="grid" style={{ gap: 12, marginTop: 12 }}>
            <div>
              <div className="label">Nom</div>
              <input
                className="input"
                value={memName}
                onChange={(e) => setMemName(e.target.value)}
                placeholder="Ex: 64 GB"
              />
            </div>

            <div>
              <div className="label">Prix (HT)</div>
              <input
                className="input"
                value={memPrice}
                onChange={(e) => setMemPrice(e.target.value)}
                placeholder="Ex: 120"
              />
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <button className="btn btn-dark" type="button" onClick={addMem} disabled={savingMem || isBusy}>
                {savingMem ? "Ajout..." : "Ajouter"}
              </button>
              <button className="btn btn-outline" type="button" onClick={resetMemForm} disabled={isBusy}>
                Reset
              </button>
              <button className="btn btn-outline" type="button" onClick={() => goTab("mem_list")} disabled={isBusy}>
                Voir le tableau
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ================== MEM LIST ================== */}
      {tab === "mem_list" ? (
        <div className="card">
          <div className="card-title">Tableau — Mémoires</div>

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-outline" type="button" onClick={() => goTab("mem_form")} disabled={isBusy}>
              Ajouter mémoire
            </button>
            <button className="btn btn-outline" type="button" onClick={loadMem} disabled={isBusy}>
              Rafraîchir
            </button>
          </div>

          <div className="table-wrap" style={{ marginTop: 12 }}>
            {loadingMem ? (
              <div className="muted">Chargement...</div>
            ) : memRows.length === 0 ? (
              <div className="muted">Aucune donnée.</div>
            ) : (
              <table className="table table-wide">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Prix</th>
                    <th>Actif</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {memRows.map((r) => {
                    const isEditing = memEditId === r._id && memEditDraft;

                    return (
                      <tr key={r._id}>
                        <td>
                          {isEditing ? (
                            <input
                              className="input"
                              value={memEditDraft.name}
                              onChange={(e) => setMemEditDraft((p) => ({ ...p, name: e.target.value }))}
                            />
                          ) : (
                            r.name || "—"
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <input
                              className="input"
                              value={memEditDraft.price}
                              onChange={(e) => setMemEditDraft((p) => ({ ...p, price: e.target.value }))}
                              style={{ width: 160 }}
                            />
                          ) : (
                            Number.isFinite(Number(r.price)) ? `${Number(r.price).toFixed(2)} €` : "—"
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <input
                              type="checkbox"
                              checked={!!memEditDraft.isActive}
                              onChange={(e) => setMemEditDraft((p) => ({ ...p, isActive: e.target.checked }))}
                            />
                          ) : (
                            r.isActive === false ? "Non" : "Oui"
                          )}
                        </td>

                        <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {!isEditing ? (
                            <>
                              <button className="btn btn-outline" type="button" onClick={() => startMemEdit(r)} disabled={isBusy}>
                                Modifier
                              </button>
                              <button className="btn btn-outline" type="button" onClick={() => deleteMem(r._id)} disabled={isBusy}>
                                Supprimer
                              </button>
                            </>
                          ) : (
                            <>
                              <button className="btn btn-dark" type="button" onClick={saveMemEdit} disabled={isBusy}>
                                Enregistrer
                              </button>
                              <button className="btn btn-outline" type="button" onClick={cancelMemEdit} disabled={isBusy}>
                                Annuler
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : null}

      {editModalGroup && editModalDraft ? (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}
          onMouseDown={closeEditModal}
        >
          <div
            style={{ background: "#fff", borderRadius: 10, padding: 16, width: "min(550px, 95vw)", maxHeight: "85vh", overflow: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.25)" }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Modifier</div>
              <button
                type="button"
                onClick={closeEditModal}
                title="Fermer"
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 4, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div className="label">REF</div>
                <input
                  className="input"
                  value={editModalDraft.productCode}
                  onChange={(e) => setEditModalDraft((p) => ({ ...p, productCode: e.target.value }))}
                />
              </div>

              <div>
                <div className="label">Produit</div>
                <select
                  className="input"
                  value={editModalDraft.productId}
                  onChange={(e) => setEditModalDraft((p) => ({ ...p, productId: e.target.value }))}
                >
                  <option value="">—</option>
                  {activeProducts.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="label">Taille (pouces)</div>
                <input
                  className="input"
                  type="number"
                  value={editModalDraft.sizeInches}
                  onChange={(e) => setEditModalDraft((p) => ({ ...p, sizeInches: e.target.value }))}
                />
              </div>

              <div>
                <div className="label">Prix par durée (HT)</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, marginTop: 6 }}>
                  {pivotDurationCols.map((m) => (
                    <div key={m}>
                      <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>{m} mois</div>
                      <input
                        className="input"
                        value={editModalDraft.prices[m] ?? ""}
                        onChange={(e) =>
                          setEditModalDraft((p) => ({
                            ...p,
                            prices: { ...p.prices, [m]: e.target.value },
                          }))
                        }
                        placeholder="—"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  id="editmodal_active"
                  type="checkbox"
                  checked={!!editModalDraft.isActive}
                  onChange={(e) => setEditModalDraft((p) => ({ ...p, isActive: e.target.checked }))}
                />
                <label htmlFor="editmodal_active" className="label" style={{ margin: 0 }}>Actif</label>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" type="button" onClick={closeEditModal}>
                Annuler
              </button>
              <button className="btn btn-dark" type="button" onClick={saveEditModal}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
