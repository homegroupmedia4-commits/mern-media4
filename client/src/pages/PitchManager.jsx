// client/src/pages/PitchManager.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";

const SLUG_TO_TAB = {
  ajoutpitch: "add",
  tableaupitch: "list",
};

const TAB_TO_SLUG = {
  add: "ajoutpitch",
  list: "tableaupitch",
};

const ADMIN_BASE = "/adminmedia4";

export default function PitchManagerPage() {
  const { API } = useOutletContext();
  const { slug } = useParams();
  const navigate = useNavigate();

  const [tab, setTab] = useState(() => SLUG_TO_TAB[slug] || "add");

  const [modeProjet, setModeProjet] = useState(false);
  const [modeProjetSaving, setModeProjetSaving] = useState(false);
  const [modeProjetError, setModeProjetError] = useState("");

  const [cats, setCats] = useState([]);
  const [catsLoading, setCatsLoading] = useState(true);
  const [catsError, setCatsError] = useState("");

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const [pitches, setPitches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    codeProduit: "",
    dimensions: "",
    luminosite: "",
    price: "",
    categoryId: "",
    productId: "",
    stock: "",
  });

  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  const [editForm, setEditForm] = useState({
    id: "",
    name: "",
    codeProduit: "",
    dimensions: "",
    luminosite: "",
    price: "",
    categoryId: "",
    productId: "",
    isActive: true,
    stock: "",
  });

  const activeCats = useMemo(() => cats.filter((c) => c.isActive), [cats]);

  // ✅ Pitchs groupés par catégorie
  const pitchesByCategory = useMemo(() => {
    const map = new Map();

    // On respecte l'ordre des catégories (déjà triées par order depuis l'API)
    for (const cat of cats) {
      const cid = String(cat._id);
      const catPitches = pitches.filter(
        (p) => String(p?.categoryId?._id || p?.categoryId) === cid
      );
      if (catPitches.length > 0) {
        map.set(cid, { cat, pitches: catPitches });
      }
    }

    // Pitchs sans catégorie reconnue
    const knownCatIds = new Set(cats.map((c) => String(c._id)));
    const orphans = pitches.filter(
      (p) => !knownCatIds.has(String(p?.categoryId?._id || p?.categoryId))
    );
    if (orphans.length > 0) {
      map.set("__orphan__", { cat: { _id: "__orphan__", name: "Sans catégorie" }, pitches: orphans });
    }

    return map;
  }, [pitches, cats]);

  useEffect(() => {
    const nextTab = SLUG_TO_TAB[slug] || "add";
    setTab(nextTab);
    setError("");
    setCatsError("");
  }, [slug]);

  const goTab = (nextTab) => {
    const nextSlug = TAB_TO_SLUG[nextTab] || "ajoutpitch";
    navigate(`${ADMIN_BASE}/pitchs/${nextSlug}`);
  };

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const res = await fetch(`${API}/api/products`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les produits.");
    } finally {
      setProductsLoading(false);
    }
  };

  const loadCategories = async () => {
    setCatsError("");
    setCatsLoading(true);
    try {
      const res = await fetch(`${API}/api/pitch-categories`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCats(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setCatsError("Impossible de charger les catégories.");
    } finally {
      setCatsLoading(false);
    }
  };

  const loadPitches = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/pitches`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setPitches(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les pitchs.");
    } finally {
      setLoading(false);
    }
  };

  const getAuthToken = () =>
    localStorage.getItem("admin_token_v1") ||
    localStorage.getItem("agent_token_v1") || "";

  const loadModeProjet = async () => {
    try {
      const res = await fetch(`${API}/api/static-values`);
      if (!res.ok) return;
      const data = await res.json();
      setModeProjet(!!data.modeProjet);
    } catch {}
  };

  const toggleModeProjet = async (checked) => {
    setModeProjet(checked);
    setModeProjetSaving(true);
    setModeProjetError("");
    try {
      const res = await fetch(`${API}/api/static-values`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ modeProjet: checked }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (e) {
      console.error(e);
      setModeProjet(!checked);
      setModeProjetError("Erreur sauvegarde mode projet.");
    } finally {
      setModeProjetSaving(false);
    }
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadPitches();
    loadModeProjet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const addPitch = async () => {
    setError("");
    const payload = {
      name: form.name.trim(),
      codeProduit: form.codeProduit.trim(),
      dimensions: form.dimensions.trim(),
      luminosite: form.luminosite.trim(),
      price: Number(form.price),
      categoryId: form.categoryId,
      productId: form.productId,
      stock: form.stock.trim(),
    };

    if (!payload.name || !payload.codeProduit || !payload.dimensions || !payload.luminosite) {
      return setError("Merci de remplir tous les champs.");
    }
    if (!Number.isFinite(payload.price)) return setError("Le prix doit être un nombre.");
    if (!payload.productId) return setError("Merci de choisir un produit.");
    if (!payload.categoryId) return setError("Merci de choisir une catégorie.");

    setSaving(true);
    try {
      const res = await fetch(`${API}/api/pitches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      setPitches((prev) => [created, ...prev]);
      setForm({ name: "", codeProduit: "", dimensions: "", luminosite: "", price: "", categoryId: "", productId: "", stock: "" });
      goTab("list");
    } catch (e) {
      console.error(e);
      setError("Ajout impossible (doublon code produit ou erreur serveur).");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (row) => { setEditingId(row._id); setEditingValue(row.name || ""); };
  const cancelEdit = () => { setEditingId(null); setEditingValue(""); };

  const openEdit = (row) => {
    setError("");
    setEditForm({
      id: row._id,
      name: row.name || "",
      codeProduit: row.codeProduit || "",
      dimensions: row.dimensions || "",
      luminosite: row.luminosite || "",
      price: String(row.price ?? ""),
      categoryId: row?.categoryId?._id || row?.categoryId || "",
      productId: row?.productId?._id || row?.productId || "",
      isActive: !!row.isActive,
      stock: row.stock || "",
    });
    setEditOpen(true);
  };

  const onEditChange = (key) => (e) => setEditForm((p) => ({ ...p, [key]: e.target.value }));

  const saveEdit = async () => {
    setError("");
    const payload = {
      name: editForm.name.trim(),
      codeProduit: editForm.codeProduit.trim(),
      dimensions: editForm.dimensions.trim(),
      luminosite: editForm.luminosite.trim(),
      price: Number(editForm.price),
      categoryId: editForm.categoryId,
      productId: editForm.productId,
      isActive: !!editForm.isActive,
      stock: editForm.stock.trim(),
    };

    if (!payload.name || !payload.codeProduit || !payload.dimensions || !payload.luminosite) {
      return setError("Merci de remplir tous les champs.");
    }
    if (!Number.isFinite(payload.price)) return setError("Le prix doit être un nombre.");
    if (!payload.productId) return setError("Merci de choisir un produit.");
    if (!payload.categoryId) return setError("Merci de choisir une catégorie.");

    try {
      const res = await fetch(`${API}/api/pitches/${editForm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setPitches((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
      setEditOpen(false);
    } catch (e) {
      console.error(e);
      setError("Modification impossible.");
    }
  };

  const saveRename = async (id) => {
    const name = editingValue.trim();
    if (!name) return;
    setError("");
    try {
      const res = await fetch(`${API}/api/pitches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setPitches((prev) => prev.map((p) => (p._id === id ? updated : p)));
      cancelEdit();
    } catch (e) {
      console.error(e);
      setError("Renommage impossible.");
    }
  };

  const toggleActive = async (row) => {
    setError("");
    try {
      const res = await fetch(`${API}/api/pitches/${row._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setPitches((prev) => prev.map((p) => (p._id === row._id ? updated : p)));
    } catch (e) {
      console.error(e);
      setError("Action impossible.");
    }
  };

  const remove = async (row) => {
    const ok = confirm(`Supprimer "${row.name}" ?`);
    if (!ok) return;
    setError("");
    try {
      const res = await fetch(`${API}/api/pitches/${row._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setPitches((prev) => prev.filter((p) => p._id !== row._id));
    } catch (e) {
      console.error(e);
      setError("Suppression impossible.");
    }
  };



  const movePitch = async (catId, index, direction) => {
  const group = pitchesByCategory.get(catId);
  if (!group) return;

  const catPitches = [...group.pitches];
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= catPitches.length) return;

  // ✅ swap dans le groupe
  [catPitches[index], catPitches[targetIndex]] = [catPitches[targetIndex], catPitches[index]];

  // ✅ reconstruire TOUTE la liste globale dans le bon ordre
  const orderedIds = [];
  const newPitchesList = [];

  for (const [gid, grp] of pitchesByCategory.entries()) {
    const currentGroup = String(gid) === String(catId) ? catPitches : grp.pitches;
    currentGroup.forEach((p) => {
      orderedIds.push(p._id);
      newPitchesList.push(p);
    });
  }

  // ✅ forcer le re-render avec une nouvelle référence
  setPitches([...newPitchesList]);

  try {
    await fetch(`${API}/api/pitches/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: orderedIds }),
    });
  } catch (e) {
    console.error(e);
    setError("Erreur lors du réordonnancement.");
  }
};

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Pitch Manager</h2>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14 }}>
            <input
              type="checkbox"
              checked={modeProjet}
              onChange={(e) => toggleModeProjet(e.target.checked)}
              disabled={modeProjetSaving}
              style={{ width: 16, height: 16 }}
            />
            Mode projet
          </label>
          <span style={{ fontSize: 12, fontWeight: 700, color: modeProjet ? "#0f7a3a" : "#999" }}>
            {modeProjetSaving ? "Sauvegarde..." : modeProjet ? "Active" : "Desactive"}
          </span>
          {modeProjetError && <span style={{ fontSize: 12, color: "#b10000" }}>{modeProjetError}</span>}
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      {tab === "add" ? (
        <div className="pm-form">
          <div className="pm-row">
            <label className="pm-label">Pitch</label>
            <input className="input pm-input" value={form.name} onChange={onChange("name")} />
          </div>
          <div className="pm-row">
            <label className="pm-label">Code produit</label>
            <input className="input pm-input" value={form.codeProduit} onChange={onChange("codeProduit")} />
          </div>
          <div className="pm-row">
            <label className="pm-label">Dimensions</label>
            <input className="input pm-input" value={form.dimensions} onChange={onChange("dimensions")} />
          </div>
          <div className="pm-row">
            <label className="pm-label">Luminosité</label>
            <input className="input pm-input" value={form.luminosite} onChange={onChange("luminosite")} />
          </div>
          <div className="pm-row">
            <label className="pm-label">Prix</label>
            <input className="input pm-input" type="number" step="0.01" value={form.price} onChange={onChange("price")} />
          </div>
          <div className="pm-row">
            <label className="pm-label">Produit</label>
            <select className="input pm-input" value={form.productId} onChange={onChange("productId")} disabled={productsLoading}>
              <option value="">{productsLoading ? "Chargement..." : "-- Choisir un produit --"}</option>
              {products.filter((p) => p?.isActive !== false).map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="pm-row">
            <label className="pm-label">Groupe (catégorie)</label>
            <select className="input pm-input" value={form.categoryId} onChange={onChange("categoryId")} disabled={catsLoading}>
              <option value="">{catsLoading ? "Chargement..." : "-- Choisir une catégorie --"}</option>
              {activeCats.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="pm-row">
            <label className="pm-label">Stock</label>
            <input
              className="input pm-input"
              value={form.stock}
              onChange={onChange("stock")}
              placeholder="ex: En stock / Sur commande / Délai 6 sem."
            />
          </div>
          {catsError ? <div className="alert">{catsError}</div> : null}
          <button className="btn btn-dark" type="button" onClick={addPitch} disabled={saving}>
            {saving ? "Ajout..." : "Ajouter"}
          </button>
        </div>
      ) : (
        <div>
          {loading ? (
            <div className="muted">Chargement...</div>
          ) : (
            Array.from(pitchesByCategory.entries()).map(([catId, { cat, pitches: catPitches }]) => (
              <div key={catId} style={{ marginBottom: 32 }}>

                {/* ✅ Titre de la catégorie */}
                <div style={{
                  background: "#8bc53f",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  padding: "8px 12px",
                  borderRadius: "6px 6px 0 0",
                  marginBottom: 0,
                }}>
                  {cat.name}
                </div>

                <div className="table-wrap" style={{ marginTop: 0 }}>
                  <table className="table table-wide">
                    <thead>
                      <tr>
                        <th style={{ width: "6%" }}>ID</th>
                        <th style={{ width: "12%" }}>Nom</th>
                        <th style={{ width: "10%" }}>Code produit</th>
                        <th style={{ width: "10%" }}>Dimensions</th>
                        <th style={{ width: "10%" }}>Luminosité</th>
                        <th style={{ width: "12%" }}>Stock</th>
                        <th style={{ width: "8%" }}>Prix</th>
                        <th style={{ width: "9%" }}>Statut</th>
                        <th style={{ width: "23%" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catPitches.map((row, index) => {
                        const isEditing = editingId === row._id;
                        const idShort = row._id?.slice(-6) || "—";

                        return (
                          <tr key={row._id}>
                            <td title={row._id}>{idShort}</td>
                            <td>
                              {isEditing ? (
                                <input className="input input-inline" value={editingValue} onChange={(e) => setEditingValue(e.target.value)} />
                              ) : (
                                <div className="name-chip">{row.name}</div>
                              )}
                            </td>
                            <td>{row.codeProduit}</td>
                            <td>{row.dimensions}</td>
                            <td>{row.luminosite}</td>
                            <td>{row.stock || "—"}</td>
                            <td>{Number(row.price).toFixed(2)} €</td>
                            <td>
                              <span className={`badge ${row.isActive ? "on" : "off"}`}>
                                {row.isActive ? "Actif" : "Inactif"}
                              </span>
                            </td>
                            <td>
                              <div className="actions">
                                {isEditing ? (
                                  <>
                                    <button className="btn btn-outline" type="button" onClick={() => saveRename(row._id)}>Enregistrer</button>
                                    <button className="btn btn-outline" type="button" onClick={cancelEdit}>Annuler</button>
                                  </>
                                ) : (
                                  <>
                                    {/* ✅ Boutons ↑↓ dans la catégorie */}
                                    <button
                                      className="btn btn-outline"
                                      type="button"
                                      onClick={() => movePitch(catId, index, "up")}
                                      disabled={index === 0}
                                      title="Monter dans ce groupe"
                                    >
                                      ↑
                                    </button>
                                    <button
                                      className="btn btn-outline"
                                      type="button"
                                      onClick={() => movePitch(catId, index, "down")}
                                      disabled={index === catPitches.length - 1}
                                      title="Descendre dans ce groupe"
                                    >
                                      ↓
                                    </button>
                                    <button className="btn btn-outline" type="button" onClick={() => openEdit(row)}>Modifier</button>
                                    <button className={`btn ${row.isActive ? "btn-danger" : "btn-dark"}`} type="button" onClick={() => toggleActive(row)}>
                                      {row.isActive ? "Désactiver" : "Activer"}
                                    </button>
                                    <button className="btn btn-outline" type="button" onClick={() => remove(row)}>Supprimer</button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
          {!loading && pitches.length === 0 && (
            <div className="muted">Aucun pitch pour l'instant.</div>
          )}
        </div>
      )}

      {editOpen ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Modifier le pitch</h3>
              <button className="btn btn-outline" type="button" onClick={() => setEditOpen(false)}>Fermer</button>
            </div>
            <div className="pm-form" style={{ marginTop: 12 }}>
              <div className="pm-row">
                <label className="pm-label">Nom</label>
                <input className="input pm-input" value={editForm.name} onChange={onEditChange("name")} />
              </div>
              <div className="pm-row">
                <label className="pm-label">Code produit</label>
                <input className="input pm-input" value={editForm.codeProduit} onChange={onEditChange("codeProduit")} />
              </div>
              <div className="pm-row">
                <label className="pm-label">Dimensions</label>
                <input className="input pm-input" value={editForm.dimensions} onChange={onEditChange("dimensions")} />
              </div>
              <div className="pm-row">
                <label className="pm-label">Luminosité</label>
                <input className="input pm-input" value={editForm.luminosite} onChange={onEditChange("luminosite")} />
              </div>
              <div className="pm-row">
                <label className="pm-label">Stock</label>
                <input
                  className="input pm-input"
                  value={editForm.stock}
                  onChange={onEditChange("stock")}
                  placeholder="ex: En stock / Sur commande / Délai 6 sem."
                />
              </div>
              <div className="pm-row">
                <label className="pm-label">Prix</label>
                <input className="input pm-input" type="number" step="0.01" value={editForm.price} onChange={onEditChange("price")} />
              </div>
              <div className="pm-row">
                <label className="pm-label">Produit</label>
                <select className="input pm-input" value={editForm.productId} onChange={onEditChange("productId")} disabled={productsLoading}>
                  <option value="">{productsLoading ? "Chargement..." : "-- Choisir un produit --"}</option>
                  {products.filter((p) => p?.isActive !== false).map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="pm-row">
                <label className="pm-label">Catégorie</label>
                <select className="input pm-input" value={editForm.categoryId} onChange={onEditChange("categoryId")} disabled={catsLoading}>
                  <option value="">{catsLoading ? "Chargement..." : "-- Choisir une catégorie --"}</option>
                  {activeCats.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="pm-row" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  id="edit_active"
                  type="checkbox"
                  checked={!!editForm.isActive}
                  onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.checked }))}
                />
                <label htmlFor="edit_active" className="pm-label" style={{ margin: 0 }}>Actif</label>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button className="btn btn-dark" type="button" onClick={saveEdit}>Enregistrer</button>
                <button className="btn btn-outline" type="button" onClick={() => setEditOpen(false)}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
