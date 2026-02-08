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

  // inline edit (autres produits)
  const [editId, setEditId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

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

  const startEdit = (r) => {
    setEditId(r?._id);
    setEditDraft({
      productId:
  typeof r?.productId === "object" ? r.productId?._id : (r?.productId || ""),

      sizeInches: r?.sizeInches ?? "",
      leasingMonths: r?.leasingMonths ?? "",
      price: r?.price ?? "",
      productCode: r?.productCode || "",
      isActive: r?.isActive !== false,
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditDraft(null);
  };

  const saveEdit = async () => {
    if (!editId || !editDraft) return;
    setError("");
    try {
      const payload = {
        productId:
  typeof editDraft.productId === "object"
    ? editDraft.productId?._id
    : editDraft.productId || "",

        sizeInches: Number(editDraft.sizeInches) || 0,
        leasingMonths: Number(editDraft.leasingMonths) || 0,
        price: Number(String(editDraft.price).replace(",", ".")) || 0,
        productCode: String(editDraft.productCode || "").trim(),
        isActive: !!editDraft.isActive,
      };

      const res = await fetch(`${API}/api/other-product-sizes/${editId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());

      cancelEdit();
      await loadOthers();
    } catch (e) {
      console.error(e);
      setError("Impossible d’enregistrer la modification (autres produits).");
    }
  };

  const deleteOther = async (id) => {
    if (!id) return;
    setError("");
    try {
      const res = await fetch(`${API}/api/other-product-sizes/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadOthers();
    } catch (e) {
      console.error(e);
      setError("Impossible de supprimer la ligne (autres produits).");
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
            ) : rows.length === 0 ? (
              <div className="muted">Aucune donnée.</div>
            ) : (
              <table className="table table-wide">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Taille</th>
                    <th>Leasing</th>
                    <th>Prix</th>
                    <th>Code</th>
                    <th>Actif</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((r) => {
                    const isEditing = editId === r._id && editDraft;

                    return (
                      <tr key={r._id}>
                        <td>
                          {isEditing ? (
                            <select
                              className="input"
                              value={editDraft.productId}
                              onChange={(e) => setEditDraft((p) => ({ ...p, productId: e.target.value }))}
                            >
                              <option value="">—</option>
                              {activeProducts.map((p) => (
                                <option key={p._id} value={p._id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            productLabelById(r.productId)
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <input
                              className="input"
                              value={editDraft.sizeInches}
                              onChange={(e) => setEditDraft((p) => ({ ...p, sizeInches: e.target.value }))}
                              style={{ width: 110 }}
                            />
                          ) : (
                            `${r.sizeInches ?? "—"}"`
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <select
                              className="input"
                              value={editDraft.leasingMonths}
                              onChange={(e) => setEditDraft((p) => ({ ...p, leasingMonths: e.target.value }))}
                            >
                              <option value="">—</option>
                              {durationOptions.map((d) => (
                                <option key={d._id || d.months} value={d.months}>
                                  {d.months} mois
                                </option>
                              ))}
                            </select>
                          ) : (
                            r.leasingMonths ? `${r.leasingMonths} mois` : "—"
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <input
                              className="input"
                              value={editDraft.price}
                              onChange={(e) => setEditDraft((p) => ({ ...p, price: e.target.value }))}
                              style={{ width: 140 }}
                            />
                          ) : (
                            Number.isFinite(Number(r.price)) ? `${Number(r.price).toFixed(2)} €` : "—"
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <input
                              className="input"
                              value={editDraft.productCode}
                              onChange={(e) => setEditDraft((p) => ({ ...p, productCode: e.target.value }))}
                            />
                          ) : (
                            r.productCode || "—"
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <input
                              type="checkbox"
                              checked={!!editDraft.isActive}
                              onChange={(e) => setEditDraft((p) => ({ ...p, isActive: e.target.checked }))}
                            />
                          ) : (
                            r.isActive === false ? "Non" : "Oui"
                          )}
                        </td>

                        <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {!isEditing ? (
                            <>
                              <button className="btn btn-outline" type="button" onClick={() => startEdit(r)} disabled={isBusy}>
                                Modifier
                              </button>
                              <button className="btn btn-outline" type="button" onClick={() => deleteOther(r._id)} disabled={isBusy}>
                                Supprimer
                              </button>
                            </>
                          ) : (
                            <>
                              <button className="btn btn-dark" type="button" onClick={saveEdit} disabled={isBusy}>
                                Enregistrer
                              </button>
                              <button className="btn btn-outline" type="button" onClick={cancelEdit} disabled={isBusy}>
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
    </div>
  );
}
