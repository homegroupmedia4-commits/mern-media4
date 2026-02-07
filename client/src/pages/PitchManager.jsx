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

export default function PitchManagerPage() {
  const { API } = useOutletContext();
  const { slug } = useParams(); // /pitchs/:slug
  const navigate = useNavigate();

  const [tab, setTab] = useState(() => SLUG_TO_TAB[slug] || "add");

  const [cats, setCats] = useState([]);
  const [catsLoading, setCatsLoading] = useState(true);
  const [catsError, setCatsError] = useState("");

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const [pitches, setPitches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // form
  const [form, setForm] = useState({
    name: "",
    codeProduit: "",
    dimensions: "",
    luminosite: "",
    price: "",
    categoryId: "",
    productId: "",
  });

  const [saving, setSaving] = useState(false);

  // inline rename in table
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  const activeCats = useMemo(() => cats.filter((c) => c.isActive), [cats]);

  // URL -> tab
  useEffect(() => {
    const nextTab = SLUG_TO_TAB[slug] || "add";
    setTab(nextTab);
    setError("");
    setCatsError("");
  }, [slug]);

  // tab -> URL
  const goTab = (nextTab) => {
    const nextSlug = TAB_TO_SLUG[nextTab] || "ajoutpitch";
    navigate(`/pitchs/${nextSlug}`);
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

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadPitches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (key) => (e) => {
    setForm((p) => ({ ...p, [key]: e.target.value }));
  };

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
    };

    if (!payload.name || !payload.codeProduit || !payload.dimensions || !payload.luminosite) {
      return setError("Merci de remplir tous les champs.");
    }
    if (!Number.isFinite(payload.price)) {
      return setError("Le prix doit être un nombre.");
    }
    if (!payload.productId) {
      return setError("Merci de choisir un produit.");
    }
    if (!payload.categoryId) {
      return setError("Merci de choisir une catégorie.");
    }

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
      setForm({
        name: "",
        codeProduit: "",
        dimensions: "",
        luminosite: "",
        price: "",
        categoryId: "",
        productId: "",
      });

      // UX: aller sur la liste via URL
      goTab("list");
    } catch (e) {
      console.error(e);
      setError("Ajout impossible (doublon code produit ou erreur serveur).");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (row) => {
    setEditingId(row._id);
    setEditingValue(row.name || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue("");
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

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Pitch Manager</h2>

        <div className="subtabs">
          <button
            className={`subtab ${tab === "add" ? "active" : ""}`}
            type="button"
            onClick={() => goTab("add")}
          >
            Ajout d&apos;un Pitch
          </button>
          <button
            className={`subtab ${tab === "list" ? "active" : ""}`}
            type="button"
            onClick={() => goTab("list")}
          >
            Les pitchs
          </button>
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
            <input
              className="input pm-input"
              type="number"
              step="0.01"
              value={form.price}
              onChange={onChange("price")}
            />
          </div>

          <div className="pm-row">
            <label className="pm-label">Produit</label>
            <select
              className="input pm-input"
              value={form.productId}
              onChange={onChange("productId")}
              disabled={productsLoading}
            >
              <option value="">{productsLoading ? "Chargement..." : "-- Choisir un produit --"}</option>
              {products
                .filter((p) => p?.isActive !== false)
                .map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="pm-row">
            <label className="pm-label">Groupe (catégorie)</label>
            <select
              className="input pm-input"
              value={form.categoryId}
              onChange={onChange("categoryId")}
              disabled={catsLoading}
            >
              <option value="">{catsLoading ? "Chargement..." : "-- Choisir une catégorie --"}</option>
              {activeCats.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {catsError ? <div className="alert">{catsError}</div> : null}

          <button className="btn btn-dark" type="button" onClick={addPitch} disabled={saving}>
            {saving ? "Ajout..." : "Ajouter"}
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          {loading ? (
            <div className="muted">Chargement...</div>
          ) : (
            <table className="table table-wide">
              <thead>
                <tr>
                  <th style={{ width: "7%" }}>ID</th>
                  <th style={{ width: "14%" }}>Nom</th>
                  <th style={{ width: "12%" }}>Code produit</th>
                  <th style={{ width: "12%" }}>Dimensions</th>
                  <th style={{ width: "12%" }}>Luminosité</th>
                  <th style={{ width: "10%" }}>Prix</th>
                  <th style={{ width: "23%" }}>Groupe</th>
                  <th style={{ width: "10%" }}>Statut</th>
                  <th style={{ width: "20%" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pitches.map((row) => {
                  const isEditing = editingId === row._id;
                  const catName = row?.categoryId?.name || "—";
                  const idShort = row._id?.slice(-6) || "—";

                  return (
                    <tr key={row._id}>
                      <td title={row._id}>{idShort}</td>

                      <td>
                        {isEditing ? (
                          <input
                            className="input input-inline"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                          />
                        ) : (
                          <div className="name-chip">{row.name}</div>
                        )}
                      </td>

                      <td>{row.codeProduit}</td>
                      <td>{row.dimensions}</td>
                      <td>{row.luminosite}</td>
                      <td>{Number(row.price).toFixed(2)} €</td>
                      <td>{catName}</td>

                      <td>
                        <span className={`badge ${row.isActive ? "on" : "off"}`}>
                          {row.isActive ? "Actif" : "Inactif"}
                        </span>
                      </td>

                      <td>
                        <div className="actions">
                          {isEditing ? (
                            <>
                              <button className="btn btn-outline" type="button" onClick={() => saveRename(row._id)}>
                                Enregistrer
                              </button>
                              <button className="btn btn-outline" type="button" onClick={cancelEdit}>
                                Annuler
                              </button>
                            </>
                          ) : (
                            <>
                              <button className="btn btn-outline" type="button" onClick={() => startEdit(row)}>
                                Renommer
                              </button>

                              <button
                                className={`btn ${row.isActive ? "btn-danger" : "btn-dark"}`}
                                type="button"
                                onClick={() => toggleActive(row)}
                              >
                                {row.isActive ? "Désactiver" : "Activer"}
                              </button>

                              <button className="btn btn-outline" type="button" onClick={() => remove(row)}>
                                Supprimer
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {pitches.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="muted">
                      Aucun pitch pour l’instant.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
