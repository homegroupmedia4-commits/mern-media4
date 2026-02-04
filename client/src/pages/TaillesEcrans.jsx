// client/src/pages/TaillesEcrans.jsx
import { useEffect, useMemo, useState } from "react";

export default function TaillesEcrans({ API }) {
  // 4 sous-pages
  const [tab, setTab] = useState("autres_form"); // autres_form | autres_list | mem_form | mem_list
  const [error, setError] = useState("");

  // ✅ produits (dynamiques depuis Admin > Produits)
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // leasing durations (déjà en DB via Valeurs Statiques)
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
  const [product, setProduct] = useState("");
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

  const durationOptions = useMemo(
    () => durations.slice().sort((a, b) => a.months - b.months),
    [durations]
  );

  // ---------- LOAD PRODUCTS ----------
  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`${API}/api/products`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const activeOnly = (Array.isArray(data) ? data : []).filter((p) => p.isActive);
      setProducts(activeOnly);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les produits (Admin > Produits).");
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadDurations = async () => {
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

  const loadOthers = async () => {
    setLoadingRows(true);
    try {
      const res = await fetch(`${API}/api/other-product-sizes`);
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
      const res = await fetch(`${API}/api/memory-options`);
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

  useEffect(() => {
    setError("");
    loadProducts();
    loadDurations();
    loadOthers();
    loadMem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- AUTRES PRODUITS: CREATE ----------
  const addOther = async () => {
    setError("");
    const payload = {
      sizeInches: Number(sizeInches),
      product,
      leasingMonths: Number(leasingMonths),
      price: Number(price),
      productCode: String(productCode || "").trim(),
    };

    if (!Number.isFinite(payload.sizeInches) || payload.sizeInches <= 0) return setError("Taille invalide.");
    if (!payload.product) return setError("Produit requis.");
    if (!Number.isFinite(payload.leasingMonths) || payload.leasingMonths <= 0) return setError("Durée leasing invalide.");
    if (!Number.isFinite(payload.price) || payload.price < 0) return setError("Prix invalide.");
    if (!payload.productCode) return setError("Code produit requis.");

    setSavingOther(true);
    try {
      const res = await fetch(`${API}/api/other-product-sizes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      setRows((prev) => [created, ...prev]);

      // reset
      setSizeInches("");
      setProduct("");
      setLeasingMonths("");
      setPrice("");
      setProductCode("");
      setTab("autres_list");
    } catch (e) {
      console.error(e);
      setError("Ajout impossible (code produit déjà utilisé ou erreur serveur).");
    } finally {
      setSavingOther(false);
    }
  };

  // ---------- AUTRES PRODUITS: EDIT ----------
  const startEdit = (row) => {
    setEditId(row._id);
    setEditDraft({
      sizeInches: row.sizeInches,
      product: row.product,
      leasingMonths: row.leasingMonths,
      price: row.price,
      productCode: row.productCode,
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditDraft(null);
  };

  const saveEdit = async (id) => {
    setError("");
    try {
      const res = await fetch(`${API}/api/other-product-sizes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sizeInches: Number(editDraft.sizeInches),
          product: editDraft.product,
          leasingMonths: Number(editDraft.leasingMonths),
          price: Number(editDraft.price),
          productCode: String(editDraft.productCode || "").trim(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setRows((prev) => prev.map((r) => (r._id === id ? updated : r)));
      cancelEdit();
    } catch (e) {
      console.error(e);
      setError("Modification impossible (doublon code produit ou erreur serveur).");
    }
  };

  const toggleOther = async (row) => {
    setError("");
    try {
      const res = await fetch(`${API}/api/other-product-sizes/${row._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setRows((prev) => prev.map((r) => (r._id === row._id ? updated : r)));
    } catch (e) {
      console.error(e);
      setError("Action impossible.");
    }
  };

  const deleteOther = async (row) => {
    const ok = confirm(`Supprimer la ligne "${row.productCode}" ?`);
    if (!ok) return;

    setError("");
    try {
      const res = await fetch(`${API}/api/other-product-sizes/${row._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setRows((prev) => prev.filter((r) => r._id !== row._id));
    } catch (e) {
      console.error(e);
      setError("Suppression impossible.");
    }
  };

  // ---------- MEM: CREATE ----------
  const addMem = async () => {
    setError("");
    const payload = { name: String(memName || "").trim(), price: Number(memPrice) };
    if (!payload.name) return setError("Nom requis.");
    if (!Number.isFinite(payload.price) || payload.price < 0) return setError("Prix invalide.");

    setSavingMem(true);
    try {
      const res = await fetch(`${API}/api/memory-options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      setMemRows((prev) => [created, ...prev]);
      setMemName("");
      setMemPrice("");
      setTab("mem_list");
    } catch (e) {
      console.error(e);
      setError("Ajout impossible (doublon ou erreur serveur).");
    } finally {
      setSavingMem(false);
    }
  };

  // ---------- MEM: EDIT ----------
  const startMemEdit = (row) => {
    setMemEditId(row._id);
    setMemEditDraft({ name: row.name, price: row.price });
  };

  const cancelMemEdit = () => {
    setMemEditId(null);
    setMemEditDraft(null);
  };

  const saveMemEdit = async (id) => {
    setError("");
    try {
      const res = await fetch(`${API}/api/memory-options/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(memEditDraft.name || "").trim(),
          price: Number(memEditDraft.price),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setMemRows((prev) => prev.map((r) => (r._id === id ? updated : r)));
      cancelMemEdit();
    } catch (e) {
      console.error(e);
      setError("Modification impossible.");
    }
  };

  const toggleMem = async (row) => {
    setError("");
    try {
      const res = await fetch(`${API}/api/memory-options/${row._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setMemRows((prev) => prev.map((r) => (r._id === row._id ? updated : r)));
    } catch (e) {
      console.error(e);
      setError("Action impossible.");
    }
  };

  const deleteMem = async (row) => {
    const ok = confirm(`Supprimer "${row.name}" ?`);
    if (!ok) return;

    setError("");
    try {
      const res = await fetch(`${API}/api/memory-options/${row._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setMemRows((prev) => prev.filter((r) => r._id !== row._id));
    } catch (e) {
      console.error(e);
      setError("Suppression impossible.");
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Tailles Écrans Muraux</h2>

        <div className="subtabs">
          <button
            className={`subtab ${tab === "autres_form" ? "active" : ""}`}
            type="button"
            onClick={() => setTab("autres_form")}
          >
            Autres produits
          </button>
          <button
            className={`subtab ${tab === "autres_list" ? "active" : ""}`}
            type="button"
            onClick={() => setTab("autres_list")}
          >
            Tableau autres produits
          </button>
          <button
            className={`subtab ${tab === "mem_form" ? "active" : ""}`}
            type="button"
            onClick={() => setTab("mem_form")}
          >
            Mémoires disponibles
          </button>
          <button
            className={`subtab ${tab === "mem_list" ? "active" : ""}`}
            type="button"
            onClick={() => setTab("mem_list")}
          >
            Tableau mémoires
          </button>
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      {/* ---------- 1) AUTRES PRODUITS (FORM) ---------- */}
      {tab === "autres_form" ? (
        <div className="vs-grid">
          <div className="vs-card">
            <div className="vs-card-title">Gérer les tailles (pouces)</div>

            <div className="page-actions" style={{ flexWrap: "wrap" }}>
              <input
                className="input"
                type="number"
                placeholder="Ex : 32"
                value={sizeInches}
                onChange={(e) => setSizeInches(e.target.value)}
              />

              <select
                className="input"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                disabled={loadingProducts}
              >
                <option value="">
                  {loadingProducts ? "Chargement..." : "-- Produit --"}
                </option>
                {products.map((p) => (
                  <option key={p._id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>

              <select
                className="input"
                value={leasingMonths}
                onChange={(e) => setLeasingMonths(e.target.value)}
                disabled={loadingDur}
              >
                <option value="">
                  {loadingDur ? "Chargement..." : "-- Durée de leasing --"}
                </option>
                {durationOptions.map((d) => (
                  <option key={d._id} value={d.months}>
                    {d.months} mois
                  </option>
                ))}
              </select>

              <input
                className="input"
                type="number"
                placeholder="Prix €"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />

              <input
                className="input"
                type="text"
                placeholder="Code produit (ex : ABC123)"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
              />

              <button
                className="btn btn-dark"
                type="button"
                onClick={addOther}
                disabled={savingOther}
              >
                {savingOther ? "Ajout..." : "Ajouter"}
              </button>
            </div>

            <div className="muted" style={{ marginTop: 10 }}>
              Astuce : le “Code produit” est unique.
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------- 2) AUTRES PRODUITS (TABLE) ---------- */}
      {tab === "autres_list" ? (
        <div className="vs-grid">
          <div className="vs-card">
            <div className="vs-card-title">Tailles enregistrées</div>

            {loadingRows ? (
              <div className="muted">Chargement...</div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>ID</th>
                      <th>Produit</th>
                      <th>Taille (pouces)</th>
                      <th>Durée leasing</th>
                      <th>Prix (€)</th>
                      <th>Code produit</th>
                      <th>Statut</th>
                      <th style={{ width: 260 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const isEditing = editId === row._id;

                      return (
                        <tr key={row._id}>
                          <td className="muted">{row._id.slice(-4)}</td>

                          <td>
                            {isEditing ? (
                              <select
                                className="input input-inline"
                                value={editDraft.product}
                                onChange={(e) =>
                                  setEditDraft((p) => ({ ...p, product: e.target.value }))
                                }
                                disabled={loadingProducts}
                              >
                                <option value="">
                                  {loadingProducts ? "Chargement..." : "-- Produit --"}
                                </option>
                                {products.map((p) => (
                                  <option key={p._id} value={p.name}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              row.product
                            )}
                          </td>

                          <td>
                            {isEditing ? (
                              <input
                                className="input input-inline"
                                type="number"
                                value={editDraft.sizeInches}
                                onChange={(e) =>
                                  setEditDraft((p) => ({ ...p, sizeInches: e.target.value }))
                                }
                              />
                            ) : (
                              `${row.sizeInches} pouces`
                            )}
                          </td>

                          <td>
                            {isEditing ? (
                              <select
                                className="input input-inline"
                                value={editDraft.leasingMonths}
                                onChange={(e) =>
                                  setEditDraft((p) => ({ ...p, leasingMonths: e.target.value }))
                                }
                              >
                                {durationOptions.map((d) => (
                                  <option key={d._id} value={d.months}>
                                    {d.months} mois
                                  </option>
                                ))}
                              </select>
                            ) : (
                              `${row.leasingMonths} mois`
                            )}
                          </td>

                          <td>
                            {isEditing ? (
                              <input
                                className="input input-inline"
                                type="number"
                                value={editDraft.price}
                                onChange={(e) =>
                                  setEditDraft((p) => ({ ...p, price: e.target.value }))
                                }
                              />
                            ) : (
                              `${Number(row.price).toFixed(2)} €`
                            )}
                          </td>

                          <td>
                            {isEditing ? (
                              <input
                                className="input input-inline"
                                value={editDraft.productCode}
                                onChange={(e) =>
                                  setEditDraft((p) => ({ ...p, productCode: e.target.value }))
                                }
                              />
                            ) : (
                              row.productCode
                            )}
                          </td>

                          <td>
                            <span className={`badge ${row.isActive ? "on" : "off"}`}>
                              {row.isActive ? "Actif" : "Inactif"}
                            </span>
                          </td>

                          <td>
                            <div className="actions">
                              {isEditing ? (
                                <>
                                  <button
                                    className="btn btn-outline"
                                    type="button"
                                    onClick={() => saveEdit(row._id)}
                                  >
                                    Enregistrer
                                  </button>
                                  <button
                                    className="btn btn-outline"
                                    type="button"
                                    onClick={cancelEdit}
                                  >
                                    Annuler
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className="btn btn-outline"
                                    type="button"
                                    onClick={() => startEdit(row)}
                                  >
                                    Modifier
                                  </button>
                                  <button
                                    className={`btn ${row.isActive ? "btn-dark" : "btn-outline"}`}
                                    type="button"
                                    onClick={() => toggleOther(row)}
                                  >
                                    {row.isActive ? "Désactiver" : "Activer"}
                                  </button>
                                  <button
                                    className="btn btn-outline"
                                    type="button"
                                    onClick={() => deleteOther(row)}
                                  >
                                    Supprimer
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="muted">
                          Aucune taille enregistrée.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ---------- 3) MEMOIRE (FORM) ---------- */}
      {tab === "mem_form" ? (
        <div className="vs-grid">
          <div className="vs-card">
            <div className="vs-card-title">Mémoires disponibles</div>

            <div className="page-actions" style={{ flexWrap: "wrap" }}>
              <input
                className="input"
                placeholder="Ex : 8GO+64GO"
                value={memName}
                onChange={(e) => setMemName(e.target.value)}
              />
              <input
                className="input"
                type="number"
                placeholder="Ex : 10"
                value={memPrice}
                onChange={(e) => setMemPrice(e.target.value)}
              />
              <button
                className="btn btn-dark"
                type="button"
                onClick={addMem}
                disabled={savingMem}
              >
                {savingMem ? "Ajout..." : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------- 4) MEMOIRE (TABLE) ---------- */}
      {tab === "mem_list" ? (
        <div className="vs-grid">
          <div className="vs-card">
            <div className="vs-card-title">Mémoires disponibles</div>

            {loadingMem ? (
              <div className="muted">Chargement...</div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>ID</th>
                      <th>Nom</th>
                      <th style={{ width: 120 }}>Valeur (€)</th>
                      <th style={{ width: 110 }}>Statut</th>
                      <th style={{ width: 260 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memRows.map((row) => {
                      const isEditing = memEditId === row._id;

                      return (
                        <tr key={row._id}>
                          <td className="muted">{row._id.slice(-4)}</td>

                          <td>
                            {isEditing ? (
                              <input
                                className="input input-inline"
                                value={memEditDraft.name}
                                onChange={(e) =>
                                  setMemEditDraft((p) => ({ ...p, name: e.target.value }))
                                }
                              />
                            ) : (
                              row.name
                            )}
                          </td>

                          <td>
                            {isEditing ? (
                              <input
                                className="input input-inline"
                                type="number"
                                value={memEditDraft.price}
                                onChange={(e) =>
                                  setMemEditDraft((p) => ({ ...p, price: e.target.value }))
                                }
                              />
                            ) : (
                              `${Number(row.price).toFixed(2)} €`
                            )}
                          </td>

                          <td>
                            <span className={`badge ${row.isActive ? "on" : "off"}`}>
                              {row.isActive ? "Actif" : "Inactif"}
                            </span>
                          </td>

                          <td>
                            <div className="actions">
                              {isEditing ? (
                                <>
                                  <button
                                    className="btn btn-outline"
                                    type="button"
                                    onClick={() => saveMemEdit(row._id)}
                                  >
                                    Enregistrer
                                  </button>
                                  <button
                                    className="btn btn-outline"
                                    type="button"
                                    onClick={cancelMemEdit}
                                  >
                                    Annuler
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className="btn btn-outline"
                                    type="button"
                                    onClick={() => startMemEdit(row)}
                                  >
                                    Modifier
                                  </button>
                                  <button
                                    className={`btn ${row.isActive ? "btn-dark" : "btn-outline"}`}
                                    type="button"
                                    onClick={() => toggleMem(row)}
                                  >
                                    {row.isActive ? "Désactiver" : "Activer"}
                                  </button>
                                  <button
                                    className="btn btn-outline"
                                    type="button"
                                    onClick={() => deleteMem(row)}
                                  >
                                    Supprimer
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {memRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="muted">
                          Aucune mémoire enregistrée.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
