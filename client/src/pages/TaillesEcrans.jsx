// client/src/pages/TaillesEcrans.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

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

export default function TaillesEcrans({ API }) {
  const { slug } = useParams(); // <-- on va mettre :path /autres-produits/:slug
  const navigate = useNavigate();
  const location = useLocation();

  // tab vient de l'URL (avec fallback)
  const [tab, setTab] = useState(() => SLUG_TO_TAB[slug] || "autres_form");
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

  // si l'URL change, on met à jour le tab
  useEffect(() => {
    const nextTab = SLUG_TO_TAB[slug] || "autres_form";
    setTab(nextTab);
    setError("");
  }, [slug]);

  // quand on clique les "subtabs", on change l'URL (et donc le tab)
  const goTab = (nextTab) => {
    const nextSlug = TAB_TO_SLUG[nextTab] || "ajouterautreproduit";
    // conserve le même prefix /autres-produits/...
    navigate(`/autres-produits/${nextSlug}`);
  };

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

  // 🔥 le reste de ton code (addOther, saveEdit, etc.) ne change pas,
  // juste remplace setTab("...") par goTab("...") quand tu veux naviguer.

  // Exemple: après addOther réussi -> goTab("autres_list")
  // Exemple: après addMem réussi -> goTab("mem_list")

  // ... (ton code inchangé) ...

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Tailles Écrans Muraux</h2>

        <div className="subtabs">
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
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      {/* ici tu gardes tes 4 blocs conditionnels tab === "..." EXACTEMENT comme tu as */}
      {/* juste: à la fin de addOther -> goTab("autres_list") et addMem -> goTab("mem_list") */}
    </div>
  );
}
