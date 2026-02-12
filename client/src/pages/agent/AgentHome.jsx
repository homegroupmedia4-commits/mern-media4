// src/pages/agent/AgentHome.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./AgentHome.css";
import AgentOtherProductsBlock from "./AgentOtherProductsBlock";
import AgentHeader from "./AgentHeader";






import {
  TOKEN_KEY,
  USER_KEY,
  normalizeStaticVals,
  safeJsonParse,
  computePitchQuote,
  getWallLedsProductId,
  createDefaultPitchInstance,
  loadPitchesByCategory,
} from "./agentHome.helpers";

const DEFAULT_STATIC = normalizeStaticVals({
  accessoires_players: 800,
  cout_locaux_chine_france: 1000,
  cout_leasing: 0.7,
  marge_catalogue: 0.7,
  droits_de_douanes: 1.14,
  euros_dollars: 1.07,
  option_ecran: 100,
  option_tirage: 80,
  option_peinture: 100,
  option_coffrage: 75,
  option_raccordement: 75,
  option_livraison: 150,
  prix_container: 150,
  prix_instal: 500,
});







export default function AgentHome() {
  const navigate = useNavigate();

  const API = useMemo(
    () => import.meta.env.VITE_API_URL || "https://mern-media4-server.onrender.com",
    []
  );

const DEFAULT_CATEGORY_NAME = "Exterieur haute luminosité";



  const [lastDevisNumber, setLastDevisNumber] = useState("");


  const [staticVals, setStaticVals] = useState(() => DEFAULT_STATIC);

  const [agent, setAgent] = useState(null);
  const [error, setError] = useState("");

  // --- PDF (ton existant)
  const [texte, setTexte] = useState("");
  const [savingPdf, setSavingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
    const [savingDevis, setSavingDevis] = useState(false);

  // --- UI "devis" (products)
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  const wallLedsProductId = useMemo(
    () => getWallLedsProductId(products),
    [products]
  );

  const showWalleds =
    !!wallLedsProductId && selectedProductIds.includes(wallLedsProductId);

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const [pitches, setPitches] = useState([]);
  const [loadingPitches, setLoadingPitches] = useState(false);
  const [showAllPitches, setShowAllPitches] = useState(true);


  // instances de pitch sélectionnés (pour duplication)
  const [pitchInstances, setPitchInstances] = useState([]);
  // pitchId coché (pour afficher/masquer)
  const [selectedPitchIds, setSelectedPitchIds] = useState([]);

  // --- refs
  const [finishes, setFinishes] = useState([]);
  const [fixations, setFixations] = useState([]);
  const [durations, setDurations] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  const [otherSelections, setOtherSelections] = useState({});
    // --- Catalogues pour le récap "autres produits"
  const [otherSizesCatalog, setOtherSizesCatalog] = useState([]);
  const [memOptionsCatalog, setMemOptionsCatalog] = useState([]);



  // --- Infos client/prospect
  const [client, setClient] = useState({
    nom: "",
    prenom: "",
    societe: "",
    adresse1: "",
    adresse2: "",
    codePostal: "",
    ville: "",
    telephone: "",
    email: "",
    votreEmail: "",
    fraisInstallationOfferts: false,
    fraisParametrageOfferts: false,
    fraisPortOfferts: false,
    commentaires: "",
  });

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    navigate("/agent/login");
  };

  // ✅ HANDLE VALIDER (dans le composant)
  const handleValider = async () => {
    setError("");
    setPdfUrl("");

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return navigate("/agent/login");

    setSavingDevis(true);
    try {
      // 1) Save devis in DB
      const saveRes = await fetch(`${API}/api/agents/devis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          client,
          pitchInstances,
          validityDays: 30,
            otherSelections,
          finalType: "location_maintenance",
        }),
      });

      if (!saveRes.ok) throw new Error(await saveRes.text());
      const saveData = await saveRes.json();
      const devisId = saveData.devisId;

      setLastDevisNumber(saveData.devisNumber || "");


      // 2) Generate colored PDF
      const pdfRes = await fetch(`${API}/api/agents/devis/${devisId}/pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!pdfRes.ok) throw new Error(await pdfRes.text());
      const pdfData = await pdfRes.json();

      // 3) Open PDF
      const fileRes = await fetch(`${API}${pdfData.pdfUrl}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!fileRes.ok) throw new Error(await fileRes.text());

      const blob = await fileRes.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPdfUrl(blobUrl);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error(e);
      setError("Impossible d'enregistrer / générer le PDF. Réessaie.");
    } finally {
      setSavingDevis(false);
    }
  };

  // ---------------------------
  // STATIC VALUES (uniquement si showWalleds)
  // ---------------------------
  useEffect(() => {
    if (!showWalleds) return;

    (async () => {
      try {
        const res = await fetch(`${API}/api/static-values`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setStaticVals(normalizeStaticVals(data || {}));
      } catch (e) {
        console.warn("STATIC VALUES: defaults utilisés", e);
        setStaticVals(DEFAULT_STATIC);
      }
    })();
  }, [API, showWalleds]);

  // ---------------------------
  // AUTH + ME
  // ---------------------------
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const cached = localStorage.getItem(USER_KEY);

    if (!token) return navigate("/agent/login");

    if (cached) {
      const parsed = safeJsonParse(cached);
      if (parsed) setAgent(parsed);
    }

    (async () => {
      try {
        const res = await fetch(`${API}/api/agents/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        const me = await res.json();
        setAgent(me);

        setClient((prev) => ({ ...prev, votreEmail: me?.email || prev.votreEmail }));
      } catch (e) {
        console.error(e);
        setError("Session invalide. Reconnecte-toi.");
        logout();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------
  // LOAD: Products (checkbox)
  // ---------------------------

    // ---------------------------
  // LOAD: other product sizes + memory options (pour récap)
  // ---------------------------
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/other-product-sizes`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setOtherSizesCatalog(list.filter((x) => x?.isActive !== false));
      } catch (e) {
        console.warn("Impossible de charger other-product-sizes (récap)", e);
        setOtherSizesCatalog([]);
      }
    })();
  }, [API]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/memory-options`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setMemOptionsCatalog(list.filter((x) => x?.isActive !== false));
      } catch (e) {
        console.warn("Impossible de charger memory-options (récap)", e);
        setMemOptionsCatalog([]);
      }
    })();
  }, [API]);



  useEffect(() => {
    (async () => {
      setLoadingProducts(true);
      setError("");
      try {
        const res = await fetch(`${API}/api/products`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        const active = list.filter((p) => p?.isActive !== false);
const ORDER = ["murs leds", "totems", "kiosques", "ecrans muraux"];

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // enlève accents

const sorted = active.slice().sort((a, b) => {
  const an = norm(a?.name);
  const bn = norm(b?.name);

  const ai = ORDER.indexOf(an);
  const bi = ORDER.indexOf(bn);

  if (ai === -1 && bi === -1) return an.localeCompare(bn);
  if (ai === -1) return 1;
  if (bi === -1) return -1;
  return ai - bi;
});

setProducts(sorted);




        
      } catch (e) {
        console.error(e);
        setError("Impossible de charger les produits.");
      } finally {
        setLoadingProducts(false);
      }
    })();
  }, [API]);

  // ---------------------------
  // LOAD: Categories (select) (si showWalleds)
  // ---------------------------
  useEffect(() => {
    if (!showWalleds) {
      setSelectedCategoryId("");
      setCategories([]);
      setPitches([]);
      setPitchInstances([]);
      setSelectedPitchIds([]);
      return;
    }

    (async () => {
      setLoadingCategories(true);
      setError("");
      try {
        const res = await fetch(`${API}/api/pitch-categories`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        const active = list.filter((c) => c?.isActive !== false);
        setCategories(active);

        // ✅ auto-select catégorie par défaut (si pas déjà sélectionnée)
setSelectedCategoryId((prev) => {
  if (prev) return prev;

  const preferred = active.find((c) => String(c?.name || "") === DEFAULT_CATEGORY_NAME);
  return preferred?._id || active?.[0]?._id || "";
});



      } catch (e) {
        console.error(e);
        setError("Impossible de charger les catégories.");
      } finally {
        setLoadingCategories(false);
      }
    })();
  }, [API, showWalleds]);

  useEffect(() => {
  if (!showWalleds) return;

  (async () => {
    setLoadingPitches(true);
    setError("");

    try {
      // ✅ MODE 1 : au chargement -> on affiche tous les pitches
      if (showAllPitches) {
        const categoryIds = (categories || [])
          .filter((c) => c?._id && c?.isActive !== false)
          .map((c) => String(c._id));

        if (!categoryIds.length) {
          setPitches([]);
          return;
        }

        const results = await Promise.all(
          categoryIds.map((cid) =>
            loadPitchesByCategory({
              API,
              categoryId: cid,
              productId: wallLedsProductId,
            }).then((list) => ({ cid, list: Array.isArray(list) ? list : [] }))
          )
        );

        // concat + tag catégorie (utile si tu veux afficher le nom)
        const merged = results.flatMap(({ cid, list }) =>
          list
            .filter((p) => p?.isActive !== false)
            .map((p) => ({ ...p, __categoryId: cid }))
        );

        // dédoublonnage par _id
        const map = new Map();
        for (const p of merged) {
          const id = String(p?._id || p?.id || "");
          if (!id) continue;
          if (!map.has(id)) map.set(id, p);
        }

        setPitches(Array.from(map.values()));
        return;
      }

      // ✅ MODE 2 : après changement du select -> on filtre
      if (!selectedCategoryId) {
        setPitches([]);
        return;
      }

      const list = await loadPitchesByCategory({
        API,
        categoryId: selectedCategoryId,
        productId: wallLedsProductId,
      });

      setPitches((Array.isArray(list) ? list : []).filter((p) => p?.isActive !== false));
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les pitches (vérifie ton endpoint /api/pitches).");
      setPitches([]);
    } finally {
      setLoadingPitches(false);
    }
  })();
}, [
  API,
  showWalleds,
  showAllPitches,        // ✅ important
  selectedCategoryId,
  categories,            // ✅ important (pour load all)
  wallLedsProductId,
]);



  // ---------------------------
  // LOAD: finishes + fixations + durations
  // ---------------------------
  useEffect(() => {
    if (!showWalleds) return;

    (async () => {
      setLoadingRefs(true);
      try {
        const [fRes, fxRes, dRes] = await Promise.all([
          fetch(`${API}/api/finishes`),
          fetch(`${API}/api/fixations`),
          fetch(`${API}/api/leasing-durations`),
        ]);

        const f = fRes.ok ? await fRes.json() : [];
        const fx = fxRes.ok ? await fxRes.json() : [];
        const d = dRes.ok ? await dRes.json() : [];

        setFinishes((Array.isArray(f) ? f : []).filter((x) => x?.isActive !== false));
        setFixations((Array.isArray(fx) ? fx : []).filter((x) => x?.isActive !== false));
       

       
const sorted = (Array.isArray(d) ? d : [])
  .filter((x) => x?.isActive !== false)
  .sort((a, b) => (a?.months || 0) - (b?.months || 0));

setDurations(sorted);

// ✅ appliquer la plus grande durée par défaut aux pitchInstances si vide
const maxMonths = String(sorted[sorted.length - 1]?.months || 63);

setPitchInstances((prev) =>
  prev.map((pi) =>
    pi.financementMonths ? pi : { ...pi, financementMonths: maxMonths }
  )
);


      } catch (e) {
        console.error(e);
      } finally {
        setLoadingRefs(false);
      }
    })();
  }, [API, showWalleds]);

  // ---------------------------
  // Products selection
  // ---------------------------
  const toggleProduct = (productId) => {
    setSelectedProductIds((prev) => {
      const has = prev.includes(productId);
      const next = has ? prev.filter((x) => x !== productId) : [...prev, productId];

      if (has && productId === wallLedsProductId) {
        setSelectedCategoryId("");
        setCategories([]);
        setPitches([]);
        setPitchInstances([]);
        setSelectedPitchIds([]);
      }
      return next;
    });
  };

  // ---------------------------
  // Pitch selection + instance creation
  // ---------------------------
  const togglePitch = (pitch) => {
    const id = pitch?._id || pitch?.id;
    if (!id) return;

    setSelectedPitchIds((prev) => {
      const has = prev.includes(id);
      const next = has ? prev.filter((x) => x !== id) : [...prev, id];

      if (has) {
        setPitchInstances((inst) => inst.filter((pi) => pi.pitchId !== id));

        
      } 
      
    //   else {

    //     const categorieName =
    // categories.find((c) => String(c._id) === String(selectedCategoryId))?.name || "";


    //     setPitchInstances((inst) => [
    //       ...inst,

    //        {
    //   ...createDefaultPitchInstance({ pitch, durations }),
    //   categorieId: selectedCategoryId,     
    //   categorieName,                       
    // },

    //     ]);


    //   }

      else {
  const cid = String(pitch.__categoryId || selectedCategoryId || "");
  const categorieName = categories.find((c) => String(c._id) === cid)?.name || "";

  setPitchInstances((inst) => [
    ...inst,
    {
      ...createDefaultPitchInstance({ pitch, durations, categorieId: cid, categorieName }),
      categorieId: cid,
      categorieName,
    },
  ]);
}


      
      return next;
    });
  };


  const pitchesByCategory = useMemo(() => {
  const map = new Map();

  for (const p of pitches) {
    const cid = String(p.__categoryId || "");
    if (!cid) continue;

    if (!map.has(cid)) map.set(cid, []);
    map.get(cid).push(p);
  }

  return map; // Map<categoryId, pitches[]>
}, [pitches]);


  const updatePitchInstance = (instanceId, patch) => {
    setPitchInstances((prev) =>
      prev.map((p) => {
        if (p.instanceId !== instanceId) return p;
        const next = { ...p, ...patch };

        // const categorieName =
        //   categories.find((c) => c._id === selectedCategoryId)?.name || "";

        const categorieId = next.categorieId || selectedCategoryId || "";
const categorieName =
  next.categorieName ||
  categories.find((c) => String(c._id) === String(categorieId))?.name ||
  "";


        

  //       const categorieName =
  // next.categorieName ||
  // categories.find((c) => c._id === selectedCategoryId)?.name ||
  // "";


        const pitchObj = pitches.find((x) => (x._id || x.id) === next.pitchId);
        // const prixPitch = pitchObj?.price ?? 0;
        const prixPitch = pitchObj?.price ?? next.prixPitch ?? 0;


        const quote = computePitchQuote({
          largeurM: next.largeurM,
          hauteurM: next.hauteurM,
          lineaireRaw: next.metreLineaire,
          pitchLabel: next.pitchLabel,
          prixPitch,
          dureeMonths: next.financementMonths,
          typeFinancement: next.typeFinancement,
          quantite: next.quantite,
          staticVals,
          categorieName,
        });

//         next.categorieName = categorieName;
// next.categorieId = selectedCategoryId;

        next.categorieId = categorieId;
next.categorieName = categorieName;



        return {
          ...next,
          surfaceM2: quote.surfaceM2,
          diagonaleCm: quote.diagonaleCm,
          pouces: quote.pouces,
          largeurPx: quote.largeurPx,
          hauteurPx: quote.hauteurPx,
          metreLineaire: String(quote.lineaireUsed),
          container: quote.container,
          prixTotalHtMois: quote.total,
          montantHt: quote.montant,
        };
      })
    );
  };

  const duplicatePitchInstance = (instanceId) => {
    setPitchInstances((prev) => {
      const found = prev.find((x) => x.instanceId === instanceId);
      if (!found) return prev;
      return [
        ...prev,
        { ...found, instanceId: `${found.pitchId}_${Date.now()}`, collapsed: false },
      ];
    });
  };

  const toggleCollapseInstance = (instanceId) => {
    setPitchInstances((prev) =>
      prev.map((p) =>
        p.instanceId === instanceId ? { ...p, collapsed: !p.collapsed } : p
      )
    );
  };

  // ---------------------------
  // PDF submit (ton existant)
  // ---------------------------
  const submitPdf = async () => {
    setError("");
    setPdfUrl("");

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return navigate("/agent/login");

    if (!texte.trim()) {
      setError("Merci d’écrire un texte avant de valider.");
      return;
    }

    setSavingPdf(true);

    try {
      const res = await fetch(`${API}/api/agents/pdfs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ texte }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const pdfRes = await fetch(`${API}${data.pdfUrl}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!pdfRes.ok) throw new Error(await pdfRes.text());

      const blob = await pdfRes.blob();
      const blobUrl = URL.createObjectURL(blob);

      setPdfUrl(blobUrl);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error(e);
      setError("Impossible de générer le PDF. Réessaie.");
    } finally {
      setSavingPdf(false);
    }
  };

    const parseEuro = (v) => {
    const n = Number(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  const fmtEuro = (n) =>
    `${(Number.isFinite(n) ? n : 0).toFixed(2)} €`.replace(".", ",");

  const productById = useMemo(() => {
    const m = new Map();
    (products || []).forEach((p) => {
      const id = p?._id || p?.id;
      if (id) m.set(String(id), p);
    });
    return m;
  }, [products]);

  const otherSizeById = useMemo(() => {
    const m = new Map();
    (otherSizesCatalog || []).forEach((s) => s?._id && m.set(String(s._id), s));
    return m;
  }, [otherSizesCatalog]);

  const memById = useMemo(() => {
    const m = new Map();
    (memOptionsCatalog || []).forEach((mo) => mo?._id && m.set(String(mo._id), mo));
    return m;
  }, [memOptionsCatalog]);

  const recap = useMemo(() => {
    const lines = [];

    // -------------------------
    // 1) AUTRES PRODUITS (hors murs leds)
    // -------------------------
    for (const pid of Object.keys(otherSelections || {})) {
      const sel = otherSelections?.[pid];
      if (!sel) continue;

      const product = productById.get(String(pid));
      const productName = product?.name || "Produit";

      const months = String(sel.leasingMonths || "");
      const checked =
        sel.byMonths?.[months]?.checked ||
        sel.checked || // fallback compat ancien format
        {};

      for (const rowId of Object.keys(checked || {})) {
        const row = otherSizeById.get(String(rowId));
        if (!row) continue;

        const memId = checked?.[rowId]?.memId;
        const qtyRaw = checked?.[rowId]?.qty;
        const qty = Math.max(1, parseInt(String(qtyRaw || 1), 10) || 1);

        const mem = memId ? memById.get(String(memId)) : null;

        const basePrice = parseEuro(row.price);
        const memPrice = parseEuro(mem?.price);
        const unit = basePrice + memPrice;
        const total = unit * qty;

        lines.push({
          kind: "other",
          key: `other_${pid}_${months}_${rowId}`,
          text: `${productName} ${row.sizeInches ? `${row.sizeInches}"` : ""} – ${months} mois – Mémoire : ${
            mem?.name || "—"
          } : ${fmtEuro(memPrice)} – Prix final : ${fmtEuro(unit)} – Quantité : ${qty} – Montant HT : ${fmtEuro(total)}`,
        });
      }
    }

    // -------------------------
    // 2) MURS LEDS (pitchInstances)
    // -------------------------
    for (const pi of pitchInstances || []) {
      // montantHt est déjà calculé dans ton UI
      const montant = parseEuro(pi.montantHt);

      const pitchMeta = [pi.dimensions, pi.luminosite, pi.codeProduit].filter(Boolean).join(", ");
      const pitchTitle = pitchMeta ? `${pi.pitchLabel} (${pitchMeta})` : pi.pitchLabel;

      const priceLabel =
        pi.typeFinancement === "achat" ? "Prix total HT (achat)" : "Prix total HT (/mois)";

      const finLabel = pi.finitionName ? `Finition : ${pi.finitionName}` : "Finition : —";
const finPrice = parseEuro(pi.finitionPriceMonthlyHt);
const finPart =
  finPrice > 0 ? ` – Prix finition (/mois) : ${fmtEuro(finPrice)}` : "";

      lines.push({
        kind: "pitch",
        key: `pitch_${pi.instanceId}`,
        text:
          `Murs leds – ${pitchTitle} – Largeur (m) : ${pi.largeurM || "—"} – Hauteur (m) : ${pi.hauteurM || "—"} ` +
          `– Largeur/Hauteur(px) : ${pi.largeurPx || "—"}x${pi.hauteurPx || "—"} px – ${pi.financementMonths || "—"} mois – ${finLabel}${finPart}` +
          `– Surface (m²) : ${pi.surfaceM2 || "—"} – ${priceLabel} : ${pi.prixTotalHtMois || "—"} – Quantité d'écrans : ${pi.quantite || "1"} ` +
          `${pi.categorieName ? `– Catégorie : ${pi.categorieName} ` : ""}` +
          `– Montant HT : ${fmtEuro(montant)}`,
      });
    }

    // Totaux HT (autres + pitch)
    const totalHtOther = lines
      .filter((l) => l.kind === "other")
      .reduce((sum, l) => {
        // on “re-parse” le montant depuis la ligne serait fragile, donc on recalcule à part si tu veux.
        // Ici on fait simple : on recalculera via data brute juste après, mais pour l’instant on garde lines.
        return sum;
      }, 0);

    // recalcul propre des totaux depuis la data brute :
    let ht = 0;

    // ht autres produits
    for (const pid of Object.keys(otherSelections || {})) {
      const sel = otherSelections?.[pid];
      if (!sel) continue;

      const months = String(sel.leasingMonths || "");
      const checked = sel.byMonths?.[months]?.checked || sel.checked || {};

      for (const rowId of Object.keys(checked || {})) {
        const row = otherSizeById.get(String(rowId));
        if (!row) continue;

        const mem = checked?.[rowId]?.memId ? memById.get(String(checked[rowId].memId)) : null;

        const basePrice = parseEuro(row.price);
        const memPrice = parseEuro(mem?.price);
        const unit = basePrice + memPrice;

        const qty = Math.max(1, parseInt(String(checked?.[rowId]?.qty || 1), 10) || 1);
        ht += unit * qty;
      }
    }

    // ht murs leds
    for (const pi of pitchInstances || []) {
      ht += parseEuro(pi.montantHt);
    }

    // ✅ ht finitions (mensuel) : somme (prix finition * quantité d'écrans)
for (const pi of pitchInstances || []) {
  const q = Math.max(1, parseInt(String(pi.quantite || "1"), 10) || 1);
  const finPrice = parseEuro(pi.finitionPriceMonthlyHt);
  ht += finPrice * q;
}



    // ✅ ABOBR (comme dans le PDF) : 19,95€ si on a au moins 1 ligne
const hasAnyLine =
  (pitchInstances || []).some((pi) => parseEuro(pi.montantHt) > 0) ||
  Object.keys(otherSelections || {}).length > 0;

if (hasAnyLine) ht += 19.95;



    const tva = ht * 0.2;
    const ttc = ht + tva;

    return {
      lines,
      totalHt: ht,
      tva,
      ttc,
    };
  }, [otherSelections, pitchInstances, productById, otherSizeById, memById]);


  // --- helpers label PDF ---
const normalizeForFilename = (s) =>
  String(s || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // enlève accents
    .replace(/[^a-zA-Z0-9]+/g, "_")  // tout le reste -> _
    .replace(/^_+|_+$/g, "")        // trim _
    .replace(/_+/g, "_");           // collapse __

const buildPdfLinkLabel = ({ devisNumber, societe }) => {
  const num = String(devisNumber || "DE----").trim();
  const soc = normalizeForFilename(societe) || "CLIENT";
  return `Pdf MEDIA4_${num}-1_${soc}`;
};


  return (

     <>
    <AgentHeader agent={agent} />
   
 
  
    <div className="agenthome-page">

       
<div className="agenthome-pageTitle">Demande de devis</div>


      <div className="agenthome-card agenthome-card--wide">


<div className="agenthome-headerRow">
  <div className="agenthome-title">
    Bonjour {agent ? <strong>{agent.prenom} {agent.nom},</strong> : "…"}
  </div>
</div>




        {/* --------- Produits --------- */}
        <div className="agenthome-section">
          <div className="agenthome-sectionTitle">Sélectionnez les produits :</div>

          {loadingProducts ? (
            <div className="agenthome-muted">Chargement...</div>
          ) : (
            <div className="agenthome-products">
              {products.map((p) => {
                const id = p?._id || p?.id;
                const checked = id ? selectedProductIds.includes(id) : false;

                return (
                  <label key={id} className="agenthome-check">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => id && toggleProduct(id)}
                    />
                    <span>{p?.name || "Produit"}</span>
                  </label>
                );
              })}
              {products.length === 0 ? (
                <div className="agenthome-muted">Aucun produit.</div>
              ) : null}
            </div>
          )}
        </div>

        {/* --------- Walleds --------- */}
        {showWalleds ? (
          <div className="agenthome-section">
            <div className="agenthome-sectionTitle">Type d’écrans :</div>

            <div className="agenthome-selectRow">

              <select
                className="agenthome-select"
                value={selectedCategoryId}
                  onChange={(e) => {
    setSelectedCategoryId(e.target.value);
    setShowAllPitches(false); // ✅ dès qu'il change -> on filtre
  }}
                disabled={loadingCategories}
              >

               {loadingCategories ? <option value="">Chargement...</option> : null}



                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedCategoryId ? (


            <div className="agenthome-subcard">
  {!showAllPitches && (
    <div className="agenthome-subcardTitle">
      {categories.find((x) => x._id === selectedCategoryId)?.name || "Catégorie"}
    </div>
  )}

  




                {loadingPitches ? (
                  <div className="agenthome-muted">Chargement...</div>
                ) : (
<div className="agenthome-pitchList">

  {/* ===== MODE PAR DÉFAUT : TOUTES LES CATÉGORIES ===== */}
  {showAllPitches
    ? Array.from(pitchesByCategory.entries()).map(([catId, catPitches]) => {
        const cat = categories.find((c) => String(c._id) === catId);

        return (
          <div key={catId} className="agenthome-pitchGroup">
            <div className="agenthome-pitchGroupTitle">
              {cat?.name || "Catégorie"}
            </div>

            {catPitches.map((pitch) => {
              const id = pitch?._id || pitch?.id;
              const checked = selectedPitchIds.includes(id);

              const sub =
                pitch?.subtitle ||
                pitch?.spec ||
                pitch?.reference ||
                "";

              return (
                <label key={id} className="agenthome-check agenthome-check--pitch">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePitch(pitch)}
                  />

                  {/* <span className="agenthome-pitchLabel">
                    {pitch.name || pitch.label || "Pitch"}
                    {sub ? <em className="agenthome-pitchSub"> {sub}</em> : null}
                  </span> */}

                  <span className="agenthome-pitchLabel">
  {(() => {
    const base = String(pitch?.name || pitch?.label || "Pitch").trim();
    const meta = [pitch?.dimensions, pitch?.luminosite, pitch?.codeProduit]
      .filter(Boolean)
      .join(", ");
    return meta ? `${base} (${meta})` : base;
  })()}
  {sub ? <em className="agenthome-pitchSub"> {sub}</em> : null}
</span>



                </label>
              );
            })}
          </div>
        );
      })

    /* ===== MODE FILTRÉ : 1 CATÉGORIE ===== */
    : pitches.map((pitch) => {
        const id = pitch?._id || pitch?.id;
        const checked = selectedPitchIds.includes(id);

        const sub =
          pitch?.subtitle ||
          pitch?.spec ||
          pitch?.reference ||
          "";

        return (
          <label key={id} className="agenthome-check agenthome-check--pitch">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => togglePitch(pitch)}
            />

            {/* <span className="agenthome-pitchLabel">
              {pitch.name || pitch.label || "Pitch"}
              {sub ? <em className="agenthome-pitchSub"> {sub}</em> : null}
            </span> */}

<span className="agenthome-pitchLabel">
  {(() => {
    const base = String(pitch?.name || pitch?.label || "Pitch").trim();
    const meta = [pitch?.dimensions, pitch?.luminosite, pitch?.codeProduit]
      .filter(Boolean)
      .join(", ");
    return meta ? `${base} (${meta})` : base;
  })()}
  {sub ? <em className="agenthome-pitchSub"> {sub}</em> : null}
</span>

          </label>
        );
      })}
</div>

                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* --------- PITCH INSTANCES --------- */}
{pitchInstances.map((pi) => {
  const priceLabel =
    pi.typeFinancement === "achat"
      ? "Prix total HT (achat) :"
      : "Prix total HT (/mois) :";

  // ✅ AJOUTE ICI (juste après priceLabel)
  const fixationList = fixations.length
    ? fixations
    : [
        { _id: "plafond", name: "Support plafond" },
        { _id: "fixe", name: "Support fixe" },
        { _id: "special", name: "Support spécial" },
      ];

  const selectedFix = fixationList.find(
    (f) => String(f._id) === String(pi.fixationId)
  );

  const showFixationComment =
    (selectedFix?.name || "").toLowerCase().includes("plafond");

  return (
    <div key={pi.instanceId} className="agenthome-pitchCard">
    

              <div className="agenthome-pitchHeader">
                <div className="agenthome-pitchHeaderLeft">
                  <div className="agenthome-pitchTitleLine">
                    <strong>
  {(() => {
    const meta = [pi.dimensions, pi.luminosite, pi.codeProduit].filter(Boolean).join(", ");
    return meta ? `${pi.pitchLabel} (${meta})` : pi.pitchLabel;
  })()}
</strong>

                  </div>
                  {pi.resolutionLabel ? (
                    <div className="agenthome-muted">Résolution : {pi.resolutionLabel}</div>
                  ) : null}
                </div>
                {pi.categorieName ? <span className="agenthome-catBadge">{pi.categorieName}</span> : null}


                <button
                  className="agenthome-pillBtn"
                  type="button"
                  onClick={() => toggleCollapseInstance(pi.instanceId)}
                >
                  {pi.collapsed ? "Déplier" : "Plier"}
                </button>
              </div>

              {!pi.collapsed ? (
                <>
                  {/* Dimensions */}
                  <div className="agenthome-subsection">
                    <div className="agenthome-subsectionTitle">Dimensions :</div>

                    <div className="agenthome-grid2">
                      <div className="agenthome-field">
                        <label>Largeur (m) :</label>
                        <input
                          value={pi.largeurM}
                          onChange={(e) =>
                            updatePitchInstance(pi.instanceId, { largeurM: e.target.value })
                          }
                          className="agenthome-input"
                        />
                      </div>

                      <div className="agenthome-field">
                        <label>Hauteur (m) :</label>
                        <input
                          value={pi.hauteurM}
                          onChange={(e) =>
                            updatePitchInstance(pi.instanceId, { hauteurM: e.target.value })
                          }
                          className="agenthome-input"
                        />
                      </div>

                      <div className="agenthome-field">
                        <label>Diagonale (cm) :</label>
                        <input
                          value={pi.diagonaleCm}
                          readOnly
                          className="agenthome-input agenthome-input--readonly"
                        />
                      </div>

                      <div className="agenthome-field">
                        <label>Pouces :</label>
                        <input
                          value={pi.pouces}
                          readOnly
                          className="agenthome-input agenthome-input--readonly"
                        />
                      </div>

                      <div className="agenthome-field">
                        <label>Largeur (px) :</label>
                        <input
                          value={pi.largeurPx}
                          onChange={(e) =>
                            updatePitchInstance(pi.instanceId, { largeurPx: e.target.value })
                          }
                          className="agenthome-input"
                        />
                      </div>

                      <div className="agenthome-field">
                        <label>Hauteur (px) :</label>
                        <input
                          value={pi.hauteurPx}
                          onChange={(e) =>
                            updatePitchInstance(pi.instanceId, { hauteurPx: e.target.value })
                          }
                          className="agenthome-input"
                        />
                      </div>

                      <div className="agenthome-field agenthome-field--full">
                        <label>Surface (m²) :</label>
                        <input
                          value={pi.surfaceM2}
                          readOnly
                          className="agenthome-input agenthome-input--readonly"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Finition */}
                  <div className="agenthome-subsection">
                    <div className="agenthome-subsectionTitle">Finition :</div>

                    <div className="agenthome-radioGrid">
                      {(finishes.length
                        ? finishes
                        : [
                            { _id: "sans", name: "Sans" },
                            { _id: "brut", name: "Brut" },
                            { _id: "blanc", name: "Blanc" },
                            { _id: "autre", name: "Autre couleur" },
                          ]
                      ).map((f) => (
                        <label key={f._id} className="agenthome-radio">
                          <input
                            type="radio"
                            name={`finition_${pi.instanceId}`}
                            checked={pi.finitionId === f._id}
                            onChange={() => updatePitchInstance(pi.instanceId, { 
                              finitionId: f._id, 
                              finitionName: f.name,
                              finitionPriceMonthlyHt: Number(f.priceMonthlyHt || 0),
                            
                            })}
                          />
                          <span>{f.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Fixation */}
                  <div className="agenthome-subsection">
                    <div className="agenthome-subsectionTitle">Fixation :</div>

                    <div className="agenthome-radioGrid">
                      {(fixations.length
                        ? fixations
                        : [
                            { _id: "plafond", name: "Support plafond" },
                            { _id: "fixe", name: "Support fixe" },
                            { _id: "special", name: "Support spécial" },
                          ]
                      ).map((f) => (
                        <label key={f._id} className="agenthome-radio">
                          <input
                            type="radio"
                            name={`fixation_${pi.instanceId}`}
                            checked={pi.fixationId === f._id}
                          onChange={() =>
  updatePitchInstance(pi.instanceId, {
    fixationId: f._id,
    fixationName: f.name, // ✅ indispensable
  })
}

                          />
                          <span>{f.name}</span>
                        </label>
                      ))}
                    </div>

                    <div className="agenthome-field agenthome-field--full">
                      <label>Mètre linéaire du sol au plafond :</label>
                      <input
                        value={pi.metreLineaire}
                        onChange={(e) =>
                          updatePitchInstance(pi.instanceId, { metreLineaire: e.target.value })
                        }
                        className="agenthome-input"
                      />
                    </div>
{showFixationComment ? (
  <div className="agenthome-field agenthome-field--full" style={{ marginTop: 10 }}>
    <label>Commentaires (si support plafond) :</label>
    <input
      className="agenthome-input"
      placeholder="préciser environnement de fixation"
      value={pi.fixationComment || ""}
      onChange={(e) =>
        updatePitchInstance(pi.instanceId, { fixationComment: e.target.value })
      }
    />
  </div>
) : null}


                  </div>

                  {/* Type financement */}
                  <div className="agenthome-subsection">
                    <div className="agenthome-subsectionTitle">Type de financement :</div>

                    <div className="agenthome-selectRow">
                      <select
                        className="agenthome-select"
                        value={pi.typeFinancement}
                        onChange={(e) =>
                          updatePitchInstance(pi.instanceId, { typeFinancement: e.target.value })
                        }
                      >
                        <option value="location_maintenance">Location maintenance</option>
                        <option value="location_evenementiel">Location événementiel</option>
                        <option value="achat">Achat</option>
                      </select>
                    </div>
                  </div>

                  {/* Durée */}
                  <div className="agenthome-subsection">
                    <div className="agenthome-subsectionTitle">Financement :</div>

                    <div className="agenthome-selectRow">
                      <select
                        className="agenthome-select"
                        value={pi.financementMonths}
                        onChange={(e) =>
                          updatePitchInstance(pi.instanceId, { financementMonths: e.target.value })
                        }
                      >
                        {(durations.length ? durations : [{ months: 63 }, { months: 48 }, { months: 36 }]).map(
                          (d) => (
                            <option key={d._id || d.months} value={String(d.months)}>
                              {d.months} mois
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Résultat */}
                  <div className="agenthome-subsection">
                    <div className="agenthome-subsectionTitle">Résultat :</div>

                    <div className="agenthome-grid2">
                      <div className="agenthome-field">
                        <label>{priceLabel}</label>
                        <input
                          value={pi.prixTotalHtMois}
                          onChange={(e) =>
                            updatePitchInstance(pi.instanceId, { prixTotalHtMois: e.target.value })
                          }
                          className="agenthome-input"
                        />
                      </div>

                      <div className="agenthome-field">
                        <label>Quantité :</label>
                        <input
                          value={pi.quantite}
                          onChange={(e) =>
                            updatePitchInstance(pi.instanceId, { quantite: e.target.value })
                          }
                          className="agenthome-input"
                        />
                      </div>

                      <div className="agenthome-field agenthome-field--full">
                        <label>Montant HT :</label>
                        <input
                          value={pi.montantHt}
                          readOnly
                          className="agenthome-input agenthome-input--readonly"
                        />
                      </div>
                    </div>

                    <button
                      className="agenthome-dupBtn"
                      type="button"
                      onClick={() => duplicatePitchInstance(pi.instanceId)}
                    >
                      Dupliquer ce pitch
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          );
        })}

        {/* --------- AUTRES PRODUITS (hors Murs leds) --------- */}
<AgentOtherProductsBlock
  API={API}
  products={products}
  selectedProductIds={selectedProductIds}
  wallLedsProductId={wallLedsProductId}
  durations={durations}
  loadingDur={loadingRefs}
  onSelectionsChange={setOtherSelections}
/>


        {/* --------- INFOS CLIENT --------- */}
        <div className="agenthome-section agenthome-section--client">
          <div className="agenthome-sectionTitle">Informations du client/prospect</div>

          <div className="agenthome-grid2">
            <div className="agenthome-field">
              <label>Nom :</label>
              <input
                className="agenthome-input"
                placeholder="Entrez le nom du client"
                value={client.nom}
                onChange={(e) => setClient((p) => ({ ...p, nom: e.target.value }))}
              />
            </div>

            <div className="agenthome-field">
              <label>Prénom :</label>
              <input
                className="agenthome-input"
                placeholder="Entrez le prénom du client"
                value={client.prenom}
                onChange={(e) => setClient((p) => ({ ...p, prenom: e.target.value }))}
              />
            </div>

            <div className="agenthome-field">
              <label>Société :</label>
              <input
                className="agenthome-input"
                placeholder="Société du client"
                value={client.societe}
                onChange={(e) => setClient((p) => ({ ...p, societe: e.target.value }))}
              />
            </div>

            <div className="agenthome-field">
              <label>Adresse 1 :</label>
              <input
                className="agenthome-input"
                placeholder="Adresse du client"
                value={client.adresse1}
                onChange={(e) => setClient((p) => ({ ...p, adresse1: e.target.value }))}
              />
            </div>

            <div className="agenthome-field">
              <label>Code postal :</label>
              <input
                className="agenthome-input"
                placeholder="Code postal du client"
                value={client.codePostal}
                onChange={(e) => setClient((p) => ({ ...p, codePostal: e.target.value }))}
              />
            </div>

            <div className="agenthome-field">
              <label>Ville :</label>
              <input
                className="agenthome-input"
                placeholder="Ville du client"
                value={client.ville}
                onChange={(e) => setClient((p) => ({ ...p, ville: e.target.value }))}
              />
            </div>

            <div className="agenthome-field">
              <label>Téléphone :</label>
              <input
                className="agenthome-input"
                placeholder="Numéro du client"
                value={client.telephone}
                onChange={(e) => setClient((p) => ({ ...p, telephone: e.target.value }))}
              />
            </div>

            <div className="agenthome-field">
              <label>E-mail :</label>
              <input
                className="agenthome-input"
                placeholder="adresse e-mail du client"
                value={client.email}
                onChange={(e) => setClient((p) => ({ ...p, email: e.target.value }))}
              />
            </div>

            <div className="agenthome-field">
              <label>Votre e-mail :</label>
              <input
                className="agenthome-input"
                value={client.votreEmail}
                onChange={(e) => setClient((p) => ({ ...p, votreEmail: e.target.value }))}
              />
            </div>

            <div className="agenthome-field">
              <label>Adresse 2 :</label>
              <input
                className="agenthome-input"
                placeholder="Complément d'adresse"
                value={client.adresse2}
                onChange={(e) => setClient((p) => ({ ...p, adresse2: e.target.value }))}
              />
            </div>
          </div>

          <div className="agenthome-offers">
            <label className="agenthome-check">
              <input
                type="checkbox"
                checked={client.fraisInstallationOfferts}
                onChange={(e) =>
                  setClient((p) => ({ ...p, fraisInstallationOfferts: e.target.checked }))
                }
              />
              <span>Frais installation offerts</span>
            </label>

            <label className="agenthome-check">
              <input
                type="checkbox"
                checked={client.fraisParametrageOfferts}
                onChange={(e) =>
                  setClient((p) => ({ ...p, fraisParametrageOfferts: e.target.checked }))
                }
              />
              <span>Frais paramétrage offerts</span>
            </label>

            <label className="agenthome-check">
              <input
                type="checkbox"
                checked={client.fraisPortOfferts}
                onChange={(e) =>
                  setClient((p) => ({ ...p, fraisPortOfferts: e.target.checked }))
                }
              />
              <span>Frais de port offerts</span>
            </label>
          </div>

          <div className="agenthome-field agenthome-field--full">
            <label>Commentaires :</label>
            <textarea
              className="agenthome-textarea"
              placeholder="Commentaire figurant dans le pdf"
              rows={6}
              value={client.commentaires}
              onChange={(e) => setClient((p) => ({ ...p, commentaires: e.target.value }))}
            />
          </div>

          <div className="agenthome-clientActions">
  <button
    className="agenthome-btn agenthome-btn--green"
    type="button"
    onClick={handleValider}
    disabled={savingDevis}
  >
    {savingDevis ? "Enregistrement..." : "Valider"}
  </button>
</div>


{/* --------- RÉCAP --------- */}
<div className="agenthome-subcard" style={{ marginTop: 14 }}>
  <div className="agenthome-subcardTitle">Récapitulatif de la sélection</div>

  {recap.lines.length ? (
    <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
      {recap.lines.map((l) => (
        <li key={l.key}>{l.text}</li>
      ))}
    </ul>
  ) : (
    <div className="agenthome-muted">Aucune sélection pour le moment.</div>
  )}

  <div style={{ marginTop: 14 }}>
    <div style={{ fontWeight: 700, marginBottom: 6 }}>Informations client</div>
    <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
      <li>Nom / Prénom : {client.nom || "—"} {client.prenom || ""}</li>
      <li>Société : {client.societe || "—"}</li>
      <li>Adresse : {[client.adresse1, client.adresse2, client.codePostal, client.ville].filter(Boolean).join(" ") || "—"}</li>
      <li>Téléphone : {client.telephone || "—"}</li>
      <li>Email client : {client.email || "—"}</li>
      <li>Votre email : {client.votreEmail || "—"}</li>
      <li>Commentaires : {client.commentaires || "—"}</li>
    </ul>
  </div>

  <div style={{ marginTop: 14, borderTop: "1px dashed #e5e7eb", paddingTop: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontWeight: 700 }}>Montant total HT général :</span>
      <span style={{ fontWeight: 700 }}>{fmtEuro(recap.totalHt)}</span>
    </div>

    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 6 }}>
      <span style={{ fontWeight: 700 }}>Montant TVA (20%) :</span>
      <span style={{ fontWeight: 700 }}>{fmtEuro(recap.tva)}</span>
    </div>

    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 10 }}>
      <span style={{ fontWeight: 800 }}>Mensualité TTC :</span>
      <span style={{ fontWeight: 800 }}>{fmtEuro(recap.ttc)}</span>
    </div>
  </div>
</div>


        </div>

        {/* --------- PDF --------- */}
        <div className="agenthome-block">
       

{pdfUrl ? (
  <a className="agenthome-pdf" href={pdfUrl} target="_blank" rel="noreferrer">
    {buildPdfLinkLabel({ devisNumber: lastDevisNumber, societe: client.societe })}
  </a>
) : null}


          
        </div>

        {error ? <div className="agenthome-error">{error}</div> : null}

       

        {loadingRefs ? <div className="agenthome-muted">Chargement des référentiels…</div> : null}
          </div>
    </div>
  </>
);
} 
