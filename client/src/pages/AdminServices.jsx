// client/src/pages/AdminServices.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";

const SLUG_TO_TAB = { familles: "familles", produits: "produits" };
const TAB_TO_SLUG = { familles: "familles", produits: "produits" };
const ADMIN_BASE = "/adminmedia4";

const DEFAULT_DATA = {
  families: [
    { name: "PAO" },
    { name: "Mise à jour" },
    { name: "Formation" },
  ],
  products: {
    PAO: [
      { designation: "Création de visuel", reference: "CREA", prixUnitaireHt: 19.95 },
      { designation: "Modification de visuel", reference: "MO1", prixUnitaireHt: 29.95 },
      { designation: "Montage", reference: "MTG01", prixUnitaireHt: 59.95 },
    ],
    "Mise à jour": [
      { designation: "Programmation à partir de visuels existants (max 6)", reference: "", prixUnitaireHt: 19.95 },
      { designation: "Programmation à partir de visuels existants (max 10)", reference: "", prixUnitaireHt: 29.95 },
    ],
    Formation: [
      { designation: "Formation de 1h sur un de nos logiciels", reference: "", prixUnitaireHt: 29.95 },
      { designation: "Formation de 2h", reference: "", prixUnitaireHt: 34.95 },
      { designation: "Formation de 3h", reference: "", prixUnitaireHt: 59.95 },
    ],
  },
};

export default function AdminServicesPage() {
  const { API } = useOutletContext();
  const { slug } = useParams();
  const navigate = useNavigate();

  const [tab, setTab] = useState(() => SLUG_TO_TAB[slug] || "familles");

  useEffect(() => {
    setTab(SLUG_TO_TAB[slug] || "familles");
  }, [slug]);

  const goTab = (t) => navigate(`${ADMIN_BASE}/services/${TAB_TO_SLUG[t] || "familles"}`);

  const getToken = () =>
    localStorage.getItem("admin_token_v1") ||
    localStorage.getItem("agent_token_v1") || "";

  // ─── FAMILLES ───────────────────────────────────────────
  const [families, setFamilies] = useState([]);
  const [famLoading, setFamLoading] = useState(true);
  const [famError, setFamError] = useState("");
  const [famForm, setFamForm] = useState({ name: "" });
  const [famSaving, setFamSaving] = useState(false);
  const [famEditId, setFamEditId] = useState(null);
  const [famEditName, setFamEditName] = useState("");

  const loadFamilies = async () => {
    setFamLoading(true);
    setFamError("");
    try {
      const res = await fetch(`${API}/api/service-families`);
      if (!res.ok) throw new Error(await res.text());
      setFamilies(await res.json());
    } catch (e) {
      setFamError("Impossible de charger les familles.");
    } finally {
      setFamLoading(false);
    }
  };

  // ─── PRODUITS ───────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [prodLoading, setProdLoading] = useState(true);
  const [prodError, setProdError] = useState("");
  const [prodForm, setProdForm] = useState({
    familyId: "",
    designation: "",
    reference: "",
    prixUnitaireHt: "",
  });
  const [prodSaving, setProdSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: "",
    familyId: "",
    designation: "",
    reference: "",
    prixUnitaireHt: "",
    isActive: true,
  });

  const loadProducts = async () => {
    setProdLoading(true);
    setProdError("");
    try {
      const res = await fetch(`${API}/api/service-products/all`);
      if (!res.ok) throw new Error(await res.text());
      setProducts(await res.json());
    } catch (e) {
      setProdError("Impossible de charger les produits.");
    } finally {
      setProdLoading(false);
    }
  };

  useEffect(() => {
    loadFamilies();
    loadProducts();
  }, []);

  // ─── INIT DONNÉES PAR DÉFAUT ────────────────────────────
  const [initSaving, setInitSaving] = useState(false);
  const [initMsg, setInitMsg] = useState("");

  const initDefaults = async () => {
    setInitSaving(true);
    setInitMsg("");
    try {
      const created = {};
      for (const f of DEFAULT_DATA.families) {
        const res = await fetch(`${API}/api/service-families`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: f.name }),
        });
        if (res.ok) {
          const doc = await res.json();
          created[f.name] = doc._id;
        }
      }
      for (const [famName, prods] of Object.entries(DEFAULT_DATA.products)) {
        const famId = created[famName];
        if (!famId) continue;
        for (const p of prods) {
          await fetch(`${API}/api/service-products`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...p, familyId: famId }),
          });
        }
      }
      setInitMsg("Données initialisées avec succès.");
      await loadFamilies();
      await loadProducts();
    } catch (e) {
      setInitMsg("Erreur lors de l'initialisation.");
    } finally {
      setInitSaving(false);
    }
  };

  // ─── FAMILLES — ACTIONS ──────────────────────────────────
  const addFamily = async () => {
    const name = famForm.name.trim();
    if (!name) return setFamError("Le nom est requis.");
    setFamSaving(true);
    setFamError("");
    try {
      const res = await fetch(`${API}/api/service-families`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(await res.text());
      const doc = await res.json();
      setFamilies((p) => [...p, doc]);
      setFamForm({ name: "" });
    } catch (e) {
      setFamError("Ajout impossible.");
    } finally {
      setFamSaving(false);
    }
  };

  const toggleFamilyActive = async (fam) => {
    try {
      const res = await fetch(`${API}/api/service-families/${fam._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !fam.isActive }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setFamilies((p) => p.map((f) => (f._id === updated._id ? updated : f)));
    } catch {
      setFamError("Action impossible.");
    }
  };

  const saveFamilyRename = async (id) => {
    const name = famEditName.trim();
    if (!name) return;
    try {
      const res = await fetch(`${API}/api/service-families/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setFamilies((p) => p.map((f) => (f._id === id ? updated : f)));
      setFamEditId(null);
      setFamEditName("");
    } catch {
      setFamError("Renommage impossible.");
    }
  };

  const deleteFamily = async (fam) => {
    if (!confirm(`Supprimer la famille "${fam.name}" ?`)) return;
    try {
      const res = await fetch(`${API}/api/service-families/${fam._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setFamilies((p) => p.filter((f) => f._id !== fam._id));
    } catch {
      setFamError("Suppression impossible.");
    }
  };

  // ─── PRODUITS — ACTIONS ──────────────────────────────────
  const addProduct = async () => {
    setProdError("");
    const { familyId, designation, reference, prixUnitaireHt } = prodForm;
    if (!familyId) return setProdError("Choisissez une famille.");
    if (!designation.trim()) return setProdError("La désignation est requise.");
    const prix = Number(prixUnitaireHt);
    if (!Number.isFinite(prix)) return setProdError("Le prix doit être un nombre.");
    setProdSaving(true);
    try {
      const res = await fetch(`${API}/api/service-products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId,
          designation: designation.trim(),
          reference: reference.trim(),
          prixUnitaireHt: prix,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const doc = await res.json();
      setProducts((p) => [...p, doc]);
      setProdForm({ familyId: "", designation: "", reference: "", prixUnitaireHt: "" });
    } catch (e) {
      setProdError("Ajout impossible.");
    } finally {
      setProdSaving(false);
    }
  };

  const openEditProduct = (row) => {
    setEditForm({
      id: row._id,
      familyId: row.familyId?._id || row.familyId || "",
      designation: row.designation || "",
      reference: row.reference || "",
      prixUnitaireHt: String(row.prixUnitaireHt ?? ""),
      isActive: !!row.isActive,
    });
    setEditOpen(true);
  };

  const saveEditProduct = async () => {
    setProdError("");
    const prix = Number(editForm.prixUnitaireHt);
    if (!editForm.designation.trim()) return setProdError("La désignation est requise.");
    if (!Number.isFinite(prix)) return setProdError("Le prix doit être un nombre.");
    try {
      const res = await fetch(`${API}/api/service-products/${editForm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId: editForm.familyId,
          designation: editForm.designation.trim(),
          reference: editForm.reference.trim(),
          prixUnitaireHt: prix,
          isActive: !!editForm.isActive,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setProducts((p) => p.map((x) => (x._id === updated._id ? updated : x)));
      setEditOpen(false);
    } catch {
      setProdError("Modification impossible.");
    }
  };

  const toggleProductActive = async (row) => {
    try {
      const res = await fetch(`${API}/api/service-products/${row._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setProducts((p) => p.map((x) => (x._id === updated._id ? updated : x)));
    } catch {
      setProdError("Action impossible.");
    }
  };

  const deleteProduct = async (row) => {
    if (!confirm(`Supprimer "${row.designation}" ?`)) return;
    try {
      const res = await fetch(`${API}/api/service-products/${row._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setProducts((p) => p.filter((x) => x._id !== row._id));
    } catch {
      setProdError("Suppression impossible.");
    }
  };

  const activeFamilies = useMemo(() => families.filter((f) => f.isActive !== false), [families]);

  const productsByFamily = useMemo(() => {
    const map = new Map();
    for (const f of families) map.set(String(f._id), { fam: f, products: [] });
    for (const p of products) {
      const fid = String(p.familyId?._id || p.familyId || "");
      if (map.has(fid)) map.get(fid).products.push(p);
    }
    return map;
  }, [families, products]);

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Services</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            className="btn btn-outline"
            type="button"
            onClick={initDefaults}
            disabled={initSaving}
          >
            {initSaving ? "Initialisation..." : "Initialiser les données par défaut"}
          </button>
        </div>
      </div>

      {initMsg ? (
        <div className="alert" style={{ background: initMsg.includes("succès") ? "#e6f4ea" : undefined }}>
          {initMsg}
        </div>
      ) : null}

      {/* Onglets */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["familles", "produits"].map((t) => (
          <button
            key={t}
            className={`btn ${tab === t ? "btn-dark" : "btn-outline"}`}
            type="button"
            onClick={() => goTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ═══════════════ FAMILLES ═══════════════ */}
      {tab === "familles" ? (
        <div>
          {famError ? <div className="alert">{famError}</div> : null}

          <div className="pm-form" style={{ marginBottom: 24 }}>
            <div className="pm-row">
              <label className="pm-label">Nom de la famille</label>
              <input
                className="input pm-input"
                value={famForm.name}
                onChange={(e) => setFamForm({ name: e.target.value })}
                placeholder="ex: PAO, Formation..."
              />
            </div>
            <button className="btn btn-dark" type="button" onClick={addFamily} disabled={famSaving}>
              {famSaving ? "Ajout..." : "Ajouter"}
            </button>
          </div>

          {famLoading ? (
            <div className="muted">Chargement...</div>
          ) : (
            <div className="table-wrap">
              <table className="table table-wide">
                <thead>
                  <tr>
                    <th style={{ width: "50%" }}>Nom</th>
                    <th style={{ width: "15%" }}>Statut</th>
                    <th style={{ width: "35%" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {families.map((fam) => (
                    <tr key={fam._id}>
                      <td>
                        {famEditId === fam._id ? (
                          <input
                            className="input input-inline"
                            value={famEditName}
                            onChange={(e) => setFamEditName(e.target.value)}
                          />
                        ) : (
                          <div className="name-chip">{fam.name}</div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${fam.isActive ? "on" : "off"}`}>
                          {fam.isActive ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td>
                        <div className="actions">
                          {famEditId === fam._id ? (
                            <>
                              <button className="btn btn-outline" type="button" onClick={() => saveFamilyRename(fam._id)}>Enregistrer</button>
                              <button className="btn btn-outline" type="button" onClick={() => setFamEditId(null)}>Annuler</button>
                            </>
                          ) : (
                            <>
                              <button className="btn btn-outline" type="button" onClick={() => { setFamEditId(fam._id); setFamEditName(fam.name); }}>Renommer</button>
                              <button className={`btn ${fam.isActive ? "btn-danger" : "btn-dark"}`} type="button" onClick={() => toggleFamilyActive(fam)}>
                                {fam.isActive ? "Désactiver" : "Activer"}
                              </button>
                              <button className="btn btn-outline" type="button" onClick={() => deleteFamily(fam)}>Supprimer</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {families.length === 0 && (
                    <tr><td colSpan={3} className="muted" style={{ textAlign: "center" }}>Aucune famille.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {/* ═══════════════ PRODUITS ═══════════════ */}
      {tab === "produits" ? (
        <div>
          {prodError ? <div className="alert">{prodError}</div> : null}

          <div className="pm-form" style={{ marginBottom: 24 }}>
            <div className="pm-row">
              <label className="pm-label">Famille</label>
              <select
                className="input pm-input"
                value={prodForm.familyId}
                onChange={(e) => setProdForm((p) => ({ ...p, familyId: e.target.value }))}
              >
                <option value="">-- Choisir une famille --</option>
                {activeFamilies.map((f) => (
                  <option key={f._id} value={f._id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="pm-row">
              <label className="pm-label">Désignation</label>
              <input
                className="input pm-input"
                value={prodForm.designation}
                onChange={(e) => setProdForm((p) => ({ ...p, designation: e.target.value }))}
                placeholder="ex: Création de visuel"
              />
            </div>
            <div className="pm-row">
              <label className="pm-label">Référence</label>
              <input
                className="input pm-input"
                value={prodForm.reference}
                onChange={(e) => setProdForm((p) => ({ ...p, reference: e.target.value }))}
                placeholder="ex: CREA"
              />
            </div>
            <div className="pm-row">
              <label className="pm-label">Prix HT (€)</label>
              <input
                className="input pm-input"
                type="number"
                step="0.01"
                value={prodForm.prixUnitaireHt}
                onChange={(e) => setProdForm((p) => ({ ...p, prixUnitaireHt: e.target.value }))}
              />
            </div>
            <button className="btn btn-dark" type="button" onClick={addProduct} disabled={prodSaving}>
              {prodSaving ? "Ajout..." : "Ajouter"}
            </button>
          </div>

          {prodLoading ? (
            <div className="muted">Chargement...</div>
          ) : (
            Array.from(productsByFamily.values()).map(({ fam, products: famProds }) => {
              if (!famProds.length) return null;
              return (
                <div key={fam._id} style={{ marginBottom: 32 }}>
                  <div style={{
                    background: "#8bc53f",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                    padding: "8px 12px",
                    borderRadius: "6px 6px 0 0",
                  }}>
                    {fam.name}
                  </div>
                  <div className="table-wrap" style={{ marginTop: 0 }}>
                    <table className="table table-wide">
                      <thead>
                        <tr>
                          <th style={{ width: "35%" }}>Désignation</th>
                          <th style={{ width: "12%" }}>Référence</th>
                          <th style={{ width: "12%" }}>Prix HT</th>
                          <th style={{ width: "10%" }}>Statut</th>
                          <th style={{ width: "31%" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {famProds.map((row) => (
                          <tr key={row._id}>
                            <td>{row.designation}</td>
                            <td>{row.reference || "—"}</td>
                            <td>{Number(row.prixUnitaireHt).toFixed(2)} €</td>
                            <td>
                              <span className={`badge ${row.isActive ? "on" : "off"}`}>
                                {row.isActive ? "Actif" : "Inactif"}
                              </span>
                            </td>
                            <td>
                              <div className="actions">
                                <button className="btn btn-outline" type="button" onClick={() => openEditProduct(row)}>Modifier</button>
                                <button className={`btn ${row.isActive ? "btn-danger" : "btn-dark"}`} type="button" onClick={() => toggleProductActive(row)}>
                                  {row.isActive ? "Désactiver" : "Activer"}
                                </button>
                                <button className="btn btn-outline" type="button" onClick={() => deleteProduct(row)}>Supprimer</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
          {!prodLoading && products.length === 0 && (
            <div className="muted">Aucun produit de service.</div>
          )}
        </div>
      ) : null}

      {/* Modal édition produit */}
      {editOpen ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <h3 style={{ margin: 0 }}>Modifier le produit</h3>
              <button className="btn btn-outline" type="button" onClick={() => setEditOpen(false)}>Fermer</button>
            </div>
            <div className="pm-form" style={{ marginTop: 12 }}>
              <div className="pm-row">
                <label className="pm-label">Famille</label>
                <select
                  className="input pm-input"
                  value={editForm.familyId}
                  onChange={(e) => setEditForm((p) => ({ ...p, familyId: e.target.value }))}
                >
                  <option value="">-- Choisir une famille --</option>
                  {families.map((f) => (
                    <option key={f._id} value={f._id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div className="pm-row">
                <label className="pm-label">Désignation</label>
                <input
                  className="input pm-input"
                  value={editForm.designation}
                  onChange={(e) => setEditForm((p) => ({ ...p, designation: e.target.value }))}
                />
              </div>
              <div className="pm-row">
                <label className="pm-label">Référence</label>
                <input
                  className="input pm-input"
                  value={editForm.reference}
                  onChange={(e) => setEditForm((p) => ({ ...p, reference: e.target.value }))}
                />
              </div>
              <div className="pm-row">
                <label className="pm-label">Prix HT (€)</label>
                <input
                  className="input pm-input"
                  type="number"
                  step="0.01"
                  value={editForm.prixUnitaireHt}
                  onChange={(e) => setEditForm((p) => ({ ...p, prixUnitaireHt: e.target.value }))}
                />
              </div>
              <div className="pm-row" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  id="edit_prod_active"
                  type="checkbox"
                  checked={!!editForm.isActive}
                  onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.checked }))}
                />
                <label htmlFor="edit_prod_active" className="pm-label" style={{ margin: 0 }}>Actif</label>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button className="btn btn-dark" type="button" onClick={saveEditProduct}>Enregistrer</button>
                <button className="btn btn-outline" type="button" onClick={() => setEditOpen(false)}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
