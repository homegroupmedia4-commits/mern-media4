// src/pages/agent/AgentHome.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./AgentHome.css";
import AgentOtherProductsBlock from "./AgentOtherProductsBlock";
import AgentHeader from "./AgentHeader";
import AddressAutocomplete from "./AddressAutocomplete";
import { useGoogleMaps } from "../../hooks/useGoogleMaps";






import {
  TOKEN_KEY,
  USER_KEY,
  normalizeStaticVals,
  safeJsonParse,
  computePitchQuote,
    ABONNEMENT_OPTIONS,
  DEFAULT_ABONNEMENT,
  getWallLedsProductId,
  createDefaultPitchInstance,
  loadPitchesByCategory,
  applyApport,
  parseCabinetDimensions,
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

const API = window.location.origin;

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


  const [wallLedsAbonnement, setWallLedsAbonnement] = useState(DEFAULT_ABONNEMENT);
const [otherAbonnement, setOtherAbonnement] = useState(DEFAULT_ABONNEMENT);
  

  const wallLedsProductId = useMemo(
    () => getWallLedsProductId(products),
    [products]
  );

  const showWalleds =
    !!wallLedsProductId && selectedProductIds.includes(wallLedsProductId);

  const lcdProducts = useMemo(
    () => products.filter((p) => /lcd/i.test(p?.name || "")),
    [products]
  );

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

  const [modeProjet, setModeProjet] = useState(false);
  const [modeProjetSaving, setModeProjetSaving] = useState(false);
  const [modeProjetError, setModeProjetError] = useState("");
  const isAdmin = agent?.role === "admin";
  const hasAdminToken = useMemo(() => !!localStorage.getItem("admin_token_v1"), [agent]);

  // --- refs
  const prefillApplied = useRef(false);
  const [finishes, setFinishes] = useState([]);
  const [fixations, setFixations] = useState([]);
  const [durations, setDurations] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  const [otherSelections, setOtherSelections] = useState({});
  const [showServices, setShowServices] = useState(false);
  const [serviceProducts, setServiceProducts] = useState([]);
  const [serviceFamilies, setServiceFamilies] = useState([]);
  const [serviceSelections, setServiceSelections] = useState([]);
  const [showLcd, setShowLcd] = useState(false);
  const [selectedLcdProductName, setSelectedLcdProductName] = useState("__all__");
  const [pendingPrefill, setPendingPrefill] = useState(null);

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

  const [societeSuggestions, setSocieteSuggestions] = useState([]);
const [showSocieteSuggestions, setShowSocieteSuggestions] = useState(false);
const [societeLoading, setSocieteLoading] = useState(false);

  const [apport, setApport] = useState(0);
  const [remise, setRemise] = useState(0);
  const REMISE_MAX = 5;
  const [leaseurRates, setLeaseurRates] = useState([]);


  const googleLoaded = useGoogleMaps();

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    navigate("/agent/login");
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
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
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

  // ✅ HANDLE VALIDER (dans le composant)
  const handleValider = async () => {
    setError("");
    setPdfUrl("");

    // ✅ VALIDATION CLIENT (tout obligatoire sauf adresse2)
const requiredFields = [
  ["nom", "Nom"],
  ["prenom", "Prénom"],
  ["societe", "Société"],
  ["adresse1", "Adresse 1"],
  ["codePostal", "Code postal"],
  ["ville", "Ville"],
  ["telephone", "Téléphone"],
  ["email", "E-mail"],
  // ["votreEmail", "Votre e-mail"],
  // ["commentaires", "Commentaires"],
];

const missing = requiredFields.filter(([k]) => !String(client?.[k] || "").trim());

const isEmailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
if (!missing.length && (!isEmailOk(client.email) || !isEmailOk(client.votreEmail))) {
  setError("Merci de renseigner des e-mails valides (client et votre e-mail).");
  return;
}

if (missing.length) {
  setError(`Champs obligatoires manquants : ${missing.map(([, label]) => label).join(", ")}.`);
  return;
}


    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return navigate("/agent/login");

    setSavingDevis(true);
    try {

   console.log("=== FRONT TOTAUX ===");
console.log("pitchInstances montantHt:", pitchInstances.map(pi => pi.montantHt));
console.log("recap.totalHt:", recap.totalHt);
console.log("recap.ttc:", recap.ttc);

// ✅ Pre-compute option prices for each pitch instance
const enrichedPitchInstances = pitchInstances.map(pi => {
  if (!Array.isArray(pi.optionsFinancement) || pi.optionsFinancement.length === 0) {
    return pi;
  }

  const pitchObj = (pitches || []).find(
    x => String(x?._id || x?.id) === String(pi.pitchId)
  );
  const prixPitch = Number(pitchObj?.price ?? pi.prixPitch ?? 0);
  const categorieId = pi.categorieId || "";
  const categorieName =
    pi.categorieName ||
    categories.find(c => String(c._id) === String(categorieId))?.name || "";

  const optionsFinancementPrices = {};

 // ✅ Calcul finition mensuelle (identique à updatePitchInstance)
const surface = Number(pi.surfaceM2 || 0);
const prixM2Fin = Number(pi.finitionPriceMonthlyHt || 0);
let finitionMonthly = 0;
if (surface > 0 && prixM2Fin > 0) {
  finitionMonthly = prixM2Fin + Math.max(0, surface - 1) * (prixM2Fin * 0.5);
}

for (const opt of pi.optionsFinancement) {

  
if (opt === "achat") {
  // ✅ computePitchQuote avec typeFinancement="achat" = formule exacte du front
  const qAchat = computePitchQuote({
    largeurM: pi.largeurM,
    hauteurM: pi.hauteurM,
    lineaireRaw: pi.metreLineaire,
    pitchLabel: pi.pitchLabel,
    prixPitch,
    dureeMonths: pi.financementMonths,
    typeFinancement: "achat",
    quantite: "1",
    staticVals,
    categorieName,
  });
  optionsFinancementPrices["achat"] = Math.floor(
    Number(qAchat.total || 0) + finitionMonthly
  );
}
  
  
  else {
    const q = computePitchQuote({
      largeurM: pi.largeurM,
      hauteurM: pi.hauteurM,
      lineaireRaw: pi.metreLineaire,
      pitchLabel: pi.pitchLabel,
      prixPitch,
      dureeMonths: opt,
      typeFinancement: "location_maintenance",
      quantite: "1",
      staticVals,
      categorieName,
    });
    // ✅ Ajoute la finition mensuelle au prix de l'option
    optionsFinancementPrices[opt] = Math.floor(Number(q.total || 0) + finitionMonthly);
  }
}

  return { ...pi, optionsFinancementPrices };
});


      // ✅ Enrichir otherSelections avec les prix d'options pré-calculés
const enrichedOtherSelections = {};

for (const [pid, sel] of Object.entries(otherSelections || {})) {
  const months = String(sel.leasingMonths || "");
  const checked = sel.byMonths?.[months]?.checked || {};

  const enrichedChecked = {};

  for (const [rowId, line] of Object.entries(checked || {})) {
    const row = otherSizeById.get(String(rowId));
    if (!row) { enrichedChecked[rowId] = line; continue; }

    const mem = line.memId ? memById.get(String(line.memId)) : null;
    const memPrice = Number(mem?.price || 0);
    const optionPrices = {};

    for (const opt of (sel.optionsFinancement || [])) {
      if (opt === "achat") {
        // Achat = (mensualité * mois sélectionnés) * 0.6
        const monthly = Number(row.price || 0) + memPrice;
        const selectedMonths = Math.max(1, parseInt(months || 1));
        optionPrices["achat"] = Math.floor((monthly * selectedMonths) * 0.6);
      } else {
        // ✅ Cherche le row exact pour cette durée (même produit, même taille)
        const rowProductId = String(
          row.productId?._id || row.productId || row.product || ""
        );
        const targetRow = otherSizesCatalog.find(r => {
          const rPid = String(r.productId?._id || r.productId || r.product || "");
          return (
            rPid === rowProductId &&
            r.sizeInches === row.sizeInches &&
            String(r.leasingMonths) === String(opt)
          );
        });

        if (targetRow) {
          // ✅ Prix réel de la DB pour cette durée
          optionPrices[opt] = Number(targetRow.price || 0) + memPrice;
        } else {
          // Fallback linéaire si pas de row trouvé
          const monthly = Number(row.price || 0) + memPrice;
          const selectedMonths = Math.max(1, parseInt(months || 1));
          optionPrices[opt] = Math.floor((monthly * selectedMonths) / Math.max(1, parseInt(opt)));
        }
      }
    }

    enrichedChecked[rowId] = { ...line, optionsFinancementPrices: optionPrices };
  }

  enrichedOtherSelections[pid] = {
    ...sel,
    byMonths: {
      ...sel.byMonths,
      [months]: { ...(sel.byMonths?.[months] || {}), checked: enrichedChecked },
    },
  };
}

      

// 1) Save devis in DB
const saveRes = await fetch(`${API}/api/agents/devis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          client,
          pitchInstances: enrichedPitchInstances,
          validityDays: 30,
            otherSelections: enrichedOtherSelections,
          serviceSelections,
          finalType: pitchInstances?.[0]?.typeFinancement || "location_maintenance",
            wallLedsAbonnement,
  otherAbonnement,
          apport,

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
        setModeProjet(!!data.modeProjet);
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
  // MODE PROJET (chargement initial, même endpoint que PitchManager)
  // ---------------------------
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/static-values`);
        if (!res.ok) return;
        const data = await res.json();
        setModeProjet(!!data.modeProjet);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------
  // PREFILL — lecture localStorage (immédiat)
  // ---------------------------
  useEffect(() => {
    if (prefillApplied.current) return;
    prefillApplied.current = true;

    const raw = localStorage.getItem("m4_prefill");
    if (!raw) return;
    localStorage.removeItem("m4_prefill");

    try {
      const prefill = JSON.parse(raw);
      // Préremplir le client immédiatement (pas de dépendance async)
      if (prefill.client) setClient(prefill.client);
      setApport(prefill.apport || 0);
      if (prefill.wallLedsAbonnement) setWallLedsAbonnement(prefill.wallLedsAbonnement);
      if (prefill.otherAbonnement) setOtherAbonnement(prefill.otherAbonnement);
      // Stocker le reste en attente
      setPendingPrefill(prefill);
    } catch (e) {
      console.warn("m4_prefill parse error", e);
    }
  }, []);

  // ---------------------------
  // PREFILL — application produits/pitches (quand wallLedsProductId disponible)
  // ---------------------------
  useEffect(() => {
    if (!pendingPrefill) return;
    if (!products.length) return; // attendre que les produits soient chargés

    const prefill = pendingPrefill;
    setPendingPrefill(null); // consommer une seule fois

    if (prefill.pitchInstances?.length > 0 && wallLedsProductId) {
      setSelectedProductIds((prev) => {
        if (prev.includes(wallLedsProductId)) return prev;
        return [...prev, wallLedsProductId];
      });
      setPitchInstances(prefill.pitchInstances);
      setSelectedPitchIds(prefill.pitchInstances.map((pi) => pi.pitchId).filter(Boolean));
    }

    if (prefill.otherSelections && Object.keys(prefill.otherSelections).length > 0) {
      setOtherSelections(prefill.otherSelections);
      setSelectedProductIds((prev) => {
        const otherIds = Object.keys(prefill.otherSelections);
        const toAdd = otherIds.filter((id) => !prev.includes(id));
        if (!toAdd.length) return prev;
        return [...prev, ...toAdd];
      });
      const lcdIds = lcdProducts.map((p) => p?._id || p?.id).filter(Boolean);
      const hasLcd = Object.keys(prefill.otherSelections).some((id) => lcdIds.includes(id));
      if (hasLcd) setShowLcd(true);
    }
  }, [pendingPrefill, products, wallLedsProductId, lcdProducts]);

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
      try {
        const res = await fetch(`${API}/api/leaseur-rates`);
        if (res.ok) setLeaseurRates(await res.json());
      } catch (e) {
        console.warn("leaseur-rates load", e);
      }
    })();
  }, [API]);

  useEffect(() => {
    (async () => {
      try {
        const [famRes, prodRes] = await Promise.all([
          fetch(`${API}/api/service-families`),
          fetch(`${API}/api/service-products`),
        ]);
        if (famRes.ok) setServiceFamilies(await famRes.json());
        if (prodRes.ok) setServiceProducts(await prodRes.json());
      } catch (e) {
        console.warn("Services load error", e);
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


        
// const ORDER = ["wall_leds", "totems", "kiosques", "ecrans_muraux"];

// const sorted = active.slice().sort((a, b) => {
//   const ak = String(a?.systemKey || "").toLowerCase();
//   const bk = String(b?.systemKey || "").toLowerCase();

//   const ai = ORDER.indexOf(ak);
//   const bi = ORDER.indexOf(bk);

//   if (ai === -1 && bi === -1) {
//     // fallback alphabétique sur le nom affiché
//     return String(a?.name || "").localeCompare(String(b?.name || ""));
//   }

//   if (ai === -1) return 1;
//   if (bi === -1) return -1;

//   return ai - bi;
// });



// setProducts(sorted);


        setProducts(active);



        
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


useEffect(() => {
  if (!showWalleds) return;

  setPitchInstances((prev) => {
    const list = Array.isArray(prev) ? prev : [];
    if (!list.length) return list;
    return list.map((pi) => ({ ...pi }));
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [pitches, showWalleds]);


  
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
  prev.map((pi) => {
    if (pi.financementMonths) return pi;

    return {
      ...pi,
      financementMonths: maxMonths,
      optionsFinancement: [maxMonths], // ✅ synchro automatique
    };
  })
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

  const toggleLcd = () => {
    const lcdIds = lcdProducts.map((p) => p?._id || p?.id).filter(Boolean);
    setShowLcd((prev) => {
      const next = !prev;
      if (next) {
        setSelectedProductIds((ids) => {
          const toAdd = lcdIds.filter((id) => !ids.includes(id));
          return [...ids, ...toAdd];
        });
      } else {
        const lcdSet = new Set(lcdIds);
        setSelectedProductIds((ids) => ids.filter((id) => !lcdSet.has(id)));
        setOtherSelections((prev) => {
          const copy = { ...prev };
          for (const id of lcdIds) delete copy[id];
          return copy;
        });
        setSelectedLcdProductName("__all__");
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

    // ✅ IMPORTANT : on “fixe” le pitch dans l’instance
    pitchLabel: pitch?.name || pitch?.label || "Pitch",
    prixPitch: Number(pitch?.price || 0),

    // (optionnel mais utile pour l’affichage + PDF)
    dimensions: pitch?.dimensions || "",
    luminosite: pitch?.luminosite || "",
    codeProduit: pitch?.codeProduit || "",
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

  // ✅ On respecte l'ordre venant de l'API (order sauvegardé en DB)
  // L'ordre manuel défini dans l'admin prime

  return map;
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


       const pitchObj = (Array.isArray(pitches) ? pitches : []).find(
  (x) => String(x?._id || x?.id) === String(next.pitchId)
);

const prixPitch = Number(
  (pitchObj?.price ?? next.prixPitch ?? 0)
);


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

        const qScreens = Math.max(1, parseInt(String(next.quantite || "1"), 10) || 1);

// ✅ surface en m²
const surface = Number(quote.surfaceM2 || 0);

// ✅ prix finition au m²
const prixM2 = Number(next.finitionPriceMonthlyHt || 0);

// ✅ calcul progressif finition
let finitionTotal = 0;

if (surface > 0) {
  finitionTotal =
    prixM2 + Math.max(0, surface - 1) * (prixM2 * 0.5);
}

// ✅ prix unitaire (par écran)
const totalUnitWithFin = Number(quote.total || 0) + finitionTotal;

// ✅ montant total (avec quantité)
const montantWithFin =
  Number(quote.montant || 0) + finitionTotal * qScreens;

        



        return {
          ...next,
          surfaceM2: quote.surfaceM2,
          diagonaleCm: quote.diagonaleCm,
          pouces: quote.pouces,
          largeurPx: quote.largeurPx,
          hauteurPx: quote.hauteurPx,
          // metreLineaire: String(quote.lineaireUsed), // ne pas écraser la saisie agent
          container: quote.container,

          
          // prixTotalHtMois: quote.total,
          // montantHt: quote.montant,

            // ✅ maintenant ça bouge quand tu changes la finition
  prixTotalHtMois: totalUnitWithFin,

  montantHt: montantWithFin,

          
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

const monthly = basePrice + memPrice;
const monthsInt = Math.max(1, parseInt(String(months || 1), 10) || 1);
const typeFin = String(sel.typeFinancement || "location_maintenance");

// ✅ Achat => (mensualité * mois) * 0.6
const unit = typeFin === "achat" ? (monthly * monthsInt) * 0.6 : monthly;
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
          `Murs leds – ${pitchTitle} – Largeur (metre) : ${pi.largeurM || "—"} – Hauteur (metre) : ${pi.hauteurM || "—"} ` +
          `– Largeur/Hauteur(px) : ${pi.largeurPx || "—"}x${pi.hauteurPx || "—"} px – ${pi.financementMonths || "—"} mois – ${finLabel}${finPart}` +
          `– Surface (m²) : ${pi.surfaceM2 || "—"} – ${priceLabel} : ${pi.prixTotalHtMois || "—"} – Quantité d'écrans : ${pi.quantite || "1"} ` +
          `${pi.categorieName ? `– Catégorie : ${pi.categorieName} ` : ""}` +
          `– Montant HT : ${fmtEuro(montant)}`,
      });
    }

    // 3) SERVICES
    for (const sel of serviceSelections || []) {
      const qty = Math.max(1, parseInt(String(sel.quantite || 1), 10) || 1);
      const pu = Number(sel.prixUnitaireHt || 0);
      const total = pu * qty;
      lines.push({
        kind: "service",
        key: `service_${sel.productId}`,
        text: `Service – ${sel.designation}${sel.reference ? ` (${sel.reference})` : ""} – PU : ${fmtEuro(pu)} – Qté : ${qty} – Total : ${fmtEuro(total)}`,
      });
    }

    // recalcul propre des totaux depuis la data brute :
    let htEcrans = 0;

    // ht autres produits (écrans LCD / non-LED)
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

        const monthly = basePrice + memPrice;
        const monthsInt = Math.max(1, parseInt(String(months || 1), 10) || 1);
        const typeFin = String(sel.typeFinancement || "location_maintenance");
        const unit = typeFin === "achat" ? (monthly * monthsInt) * 0.6 : monthly;
        const qty = Math.max(1, parseInt(String(checked?.[rowId]?.qty || 1), 10) || 1);
        htEcrans += unit * qty;
      }
    }

    // ht murs leds
    for (const pi of pitchInstances || []) {
      htEcrans += parseEuro(pi.montantHt);
    }

    // Remise sur écrans uniquement
    const htEcransAvecRemise = htEcrans * (1 - remise / 100);

    // Services (abonnements)
    const hasPitch = (pitchInstances || []).some((pi) => parseEuro(pi.montantHt) > 0);
    const hasOther = Object.keys(otherSelections || {}).length > 0;
    let htServices = 0;
    if (hasPitch) htServices += wallLedsAbonnement.price;
    if (hasOther) htServices += otherAbonnement.price;

    const htServicesExtra = (serviceSelections || []).reduce((s, sel) => {
      const qty = Math.max(1, parseInt(String(sel.quantite || 1), 10) || 1);
      return s + Number(sel.prixUnitaireHt || 0) * qty;
    }, 0);

    const htAvantApport = htEcransAvecRemise + htServices + htServicesExtra;

    // --- Application de l'apport ---
    const dureeSel = String(pitchInstances?.[0]?.financementMonths || "63");
    const rate = (leaseurRates || []).find((r) => String(r.months) === dureeSel);
    const CL = Number(rate?.coutLeaseurSurCoutTotal || 0);
    const AB = Number(staticVals?.abattement_comptant ?? 0.7);

    const htApresApport = Number(apport) > 0
      ? applyApport({
          mensualiteInitiale: htAvantApport,
          apport,
          abattement: AB,
          coutLeaseur: CL,
          dureeMonths: dureeSel,
        })
      : htAvantApport;

    const tva = htApresApport * 0.2;
    const ttc = htApresApport + tva;

    return {
      lines,
      htEcrans,
      htServices,
      htAvantApport,
      totalHt: htApresApport,
      tva,
      ttc,
    };

}, [otherSelections, pitchInstances, serviceSelections, productById, otherSizeById, memById, wallLedsAbonnement, otherAbonnement, apport, remise, leaseurRates, staticVals]);

  // ✅ Remise fixe de l'agent (définie par l'admin), appliquée en déduction du total HT général
  const agentRemise = Number(agent?.remise || 0);
  const totalHtApresRemise = recap.totalHt - (recap.totalHt * agentRemise) / 100;
  const tvaApresRemise = totalHtApresRemise * 0.2;
  const ttcApresRemise = totalHtApresRemise + tvaApresRemise;


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

  

  // ✅ Prix mensuel (ou achat) d'une option de durée pour un pitch donné
const getOptionPrice = (pi, opt) => {
  const pitchObj = (pitches || []).find(
    (x) => String(x?._id || x?.id) === String(pi.pitchId)
  );
  const prixPitch = Number(pitchObj?.price ?? pi.prixPitch ?? 0);

  const surface = Number(pi.surfaceM2 || 0);
  const prixM2Fin = Number(pi.finitionPriceMonthlyHt || 0);
  let finitionMonthly = 0;
  if (surface > 0 && prixM2Fin > 0) {
    finitionMonthly = prixM2Fin + Math.max(0, surface - 1) * (prixM2Fin * 0.5);
  }

  if (opt === "achat") {
    const qAchat = computePitchQuote({
      largeurM: pi.largeurM,
      hauteurM: pi.hauteurM,
      lineaireRaw: pi.metreLineaire,
      pitchLabel: pi.pitchLabel,
      prixPitch,
      dureeMonths: pi.financementMonths,
      typeFinancement: "achat",
      quantite: "1",
      staticVals,
      categorieName: pi.categorieName,
    });
    return Math.floor(Number(qAchat.total || 0) + finitionMonthly);
  }

  const q = computePitchQuote({
    largeurM: pi.largeurM,
    hauteurM: pi.hauteurM,
    lineaireRaw: pi.metreLineaire,
    pitchLabel: pi.pitchLabel,
    prixPitch,
    dureeMonths: opt,
    typeFinancement: "location_maintenance",
    quantite: "1",
    staticVals,
    categorieName: pi.categorieName,
  });
  return Math.floor(Number(q.total || 0) + finitionMonthly);
};

  


  return (

     <>
    <AgentHeader agent={agent} />
   
 
  
    <div className="agenthome-page">

       
<div className="agenthome-pageTitle">Demande de devis </div>


      <div className="agenthome-card agenthome-card--wide">


<div className="agenthome-headerRow">
  <div className="agenthome-title">
    Bonjour {agent ? <strong>{agent.prenom} {agent.nom},</strong> : "…"}
  </div>
</div>

<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: isAdmin ? "pointer" : "default", fontSize: 14 }}>
    <input
      type="checkbox"
      checked={modeProjet}
      onChange={(e) => isAdmin && toggleModeProjet(e.target.checked)}
      disabled={!isAdmin || modeProjetSaving}
      style={{ width: 16, height: 16 }}
    />
    Mode projet
  </label>
  <span style={{ fontSize: 12, fontWeight: 700, color: modeProjet ? "#0f7a3a" : "#999" }}>
    {modeProjetSaving ? "Sauvegarde..." : modeProjet ? "Activé" : "Désactivé"}
  </span>
  {modeProjetError && <span style={{ fontSize: 12, color: "#b10000" }}>{modeProjetError}</span>}
</div>


        {/* --------- Produits --------- */}
        <div className="agenthome-section">
          <div className="agenthome-sectionTitle">Sélectionnez les produits :</div>

          {loadingProducts ? (
            <div className="agenthome-muted">Chargement...</div>
          ) : (
            <div className="agenthome-products">
              {wallLedsProductId && (
                <label className="agenthome-check">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(wallLedsProductId)}
                    onChange={() => toggleProduct(wallLedsProductId)}
                  />
                  <span>Écrans LED</span>
                </label>
              )}
              {lcdProducts.length > 0 && (
                <label className="agenthome-check">
                  <input
                    type="checkbox"
                    checked={showLcd}
                    onChange={toggleLcd}
                  />
                  <span>Écrans LCD</span>
                </label>
              )}
              <label className="agenthome-check">
                <input
                  type="checkbox"
                  checked={showServices}
                  onChange={() => setShowServices((v) => !v)}
                />
                <span>Services</span>
              </label>
              {products.length === 0 && (
                <div className="agenthome-muted">Aucun produit.</div>
              )}
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
                value={showAllPitches ? "__all__" : selectedCategoryId}
                  onChange={(e) => {
    const val = e.target.value;
    if (val === "__all__") {
      setShowAllPitches(true);
      setSelectedCategoryId(categories[0]?._id || "");
    } else {
      setSelectedCategoryId(val);
      setShowAllPitches(false);
    }
  }}
                disabled={loadingCategories}
              >

               {loadingCategories ? <option value="">Chargement...</option> : null}

                <option value="__all__">Tous</option>
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
            <div className="agenthome-pitchGroupTitle" style={{ fontWeight: 700 }}>
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

                  <span className="agenthome-pitchLabel">
  {(() => {
    const base = String(pitch?.name || pitch?.label || "Pitch").trim();
    const dims = pitch?.dimensions ? pitch.dimensions + "mm" : "";
    const meta = [dims, pitch?.luminosite, pitch?.codeProduit]
      .filter(Boolean)
      .join(", ");
    return meta ? `${base} (${meta})` : base;
  })()}
  {sub ? <em className="agenthome-pitchSub"> {sub}</em> : null}
</span>
{pitch?.stock ? (
  <span style={{ fontSize: 11, color: "#e07000", fontWeight: 600, marginLeft: 6 }}>
    {pitch.stock}
  </span>
) : null}


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

<span className="agenthome-pitchLabel">
  {(() => {
    const base = String(pitch?.name || pitch?.label || "Pitch").trim();
    const dims = pitch?.dimensions ? pitch.dimensions + "mm" : "";
    const meta = [dims, pitch?.luminosite, pitch?.codeProduit]
      .filter(Boolean)
      .join(", ");
    return meta ? `${base} (${meta})` : base;
  })()}
  {sub ? <em className="agenthome-pitchSub"> {sub}</em> : null}
</span>
{pitch?.stock ? (
  <span style={{ fontSize: 11, color: "#e07000", fontWeight: 600, marginLeft: 6 }}>
    {pitch.stock}
  </span>
) : null}

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
    const dims = pi.dimensions ? pi.dimensions + "mm" : "";
    const meta = [dims, pi.luminosite, pi.codeProduit].filter(Boolean).join(", ");
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
                    <div className="agenthome-subsectionTitle" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span>Dimensions :</span>
                      {hasAdminToken && (
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 400, cursor: "pointer", color: "#666" }}>
                          <input
                            type="checkbox"
                            checked={modeProjet}
                            onChange={(e) => setModeProjet(e.target.checked)}
                            style={{ width: 15, height: 15 }}
                          />
                          Mode projet
                        </label>
                      )}
                    </div>

                    <div className="agenthome-grid2">
                      {(() => {
                        const cab = parseCabinetDimensions(pi.dimensions);
                        const stepW = cab ? cab.widthM : null;
                        const stepH = cab ? cab.heightM : null;
                        const canStep = !!cab && !modeProjet;

                        const stepDim = (axis, direction) => {
                          const step = axis === "largeur" ? stepW : stepH;
                          if (!step) return;
                          const current = Number(String(pi[axis === "largeur" ? "largeurM" : "hauteurM"] || "0").replace(",", ".")) || 0;
                          const next = direction === "up" ? current + step : current - step;
                          const min = step;
                          const clamped = next < min ? min : next;
                          const rounded = Math.round(clamped * 1000) / 1000;
                          const field = axis === "largeur" ? "largeurM" : "hauteurM";
                          updatePitchInstance(pi.instanceId, { [field]: String(rounded) });
                        };

                        return (
                          <>
                      <div className="agenthome-field">
                        <label>Largeur (metre) :</label>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <input
                            value={pi.largeurM}
                            onChange={(e) =>
                              updatePitchInstance(pi.instanceId, { largeurM: e.target.value })
                            }
                            readOnly={canStep}
                            className={`agenthome-input${canStep ? " agenthome-input--readonly" : ""}`}
                            style={{ flex: 1 }}
                          />
                          {canStep && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <button type="button" onClick={() => stepDim("largeur", "up")}
                                style={{ border: "1px solid #d8dbe6", borderRadius: 6, background: "#f6f7fb", cursor: "pointer", width: 28, height: 19, fontSize: 11, lineHeight: 1, padding: 0 }}
                              >&#9650;</button>
                              <button type="button" onClick={() => stepDim("largeur", "down")}
                                style={{ border: "1px solid #d8dbe6", borderRadius: 6, background: "#f6f7fb", cursor: "pointer", width: 28, height: 19, fontSize: 11, lineHeight: 1, padding: 0 }}
                              >&#9660;</button>
                            </div>
                          )}
                        </div>
                        {canStep && <span style={{ fontSize: 11, color: "#999", marginTop: 2 }}>pas : {stepW}m ({cab.widthMm}mm)</span>}
                      </div>

                      <div className="agenthome-field">
                        <label>Hauteur (metre) :</label>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <input
                            value={pi.hauteurM}
                            onChange={(e) =>
                              updatePitchInstance(pi.instanceId, { hauteurM: e.target.value })
                            }
                            readOnly={canStep}
                            className={`agenthome-input${canStep ? " agenthome-input--readonly" : ""}`}
                            style={{ flex: 1 }}
                          />
                          {canStep && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <button type="button" onClick={() => stepDim("hauteur", "up")}
                                style={{ border: "1px solid #d8dbe6", borderRadius: 6, background: "#f6f7fb", cursor: "pointer", width: 28, height: 19, fontSize: 11, lineHeight: 1, padding: 0 }}
                              >&#9650;</button>
                              <button type="button" onClick={() => stepDim("hauteur", "down")}
                                style={{ border: "1px solid #d8dbe6", borderRadius: 6, background: "#f6f7fb", cursor: "pointer", width: 28, height: 19, fontSize: 11, lineHeight: 1, padding: 0 }}
                              >&#9660;</button>
                            </div>
                          )}
                        </div>
                        {canStep && <span style={{ fontSize: 11, color: "#999", marginTop: 2 }}>pas : {stepH}m ({cab.heightMm}mm)</span>}
                      </div>
                          </>
                        );
                      })()}

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
                        
                      <input value={pi.largeurPx} readOnly className="agenthome-input agenthome-input--readonly" />
                        
                      </div>

                      <div className="agenthome-field">
                        <label>Hauteur (px) :</label>
                        
                    <input value={pi.hauteurPx} readOnly className="agenthome-input agenthome-input--readonly" />
                        
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

  {(() => {
    const baseList = finishes.length
      ? finishes
      : [
          { _id: "sans", name: "Sans", priceMonthlyHt: 0 },
          { _id: "brut", name: "Brut", priceMonthlyHt: 0 },
          { _id: "blanc", name: "Blanc", priceMonthlyHt: 0 },
          { _id: "autre", name: "Autre couleur", priceMonthlyHt: 0 },
        ];

    const norm = (s) =>
      String(s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    // ✅ "Sans" en premier
    const finishList = baseList.slice().sort((a, b) => {
      const an = norm(a?.name);
      const bn = norm(b?.name);
      const aIsSans = an === "sans";
      const bIsSans = bn === "sans";
      if (aIsSans && !bIsSans) return -1;
      if (!aIsSans && bIsSans) return 1;
      return an.localeCompare(bn);
    });

    // ✅ si pas encore de finitionId -> on coche "Sans"
    const isSans = (f) => norm(f?.name) === "sans" || String(f?._id) === "sans";
    const currentFinitionId = pi.finitionId || "";

    return (
      <div className="agenthome-radioGrid">
        {finishList.map((f) => {
          const checked = currentFinitionId
            ? String(currentFinitionId) === String(f._id)
            : isSans(f);

          return (
            <label key={f._id} className="agenthome-radio">
              <input
                type="radio"
                name={`finition_${pi.instanceId}`}
                checked={checked}
                onChange={() =>
                  updatePitchInstance(pi.instanceId, {
                    finitionId: f._id,
                    finitionName: f.name,
                    finitionPriceMonthlyHt: Number(f.priceMonthlyHt || 0),
                  })
                }
              />
              <span>{f.name}</span>
            </label>
          );
        })}
      </div>
    );
  })()}
</div>


                  {/* Fixation */}
<div className="agenthome-subsection">
  <div className="agenthome-subsectionTitle">Fixation :</div>

  {(() => {
    const baseList = fixations.length
      ? fixations
      : [
          { _id: "fixe", name: "Support fixe" },
          { _id: "plafond", name: "Support plafond" },
          { _id: "special", name: "Support spécial" },
        ];

    const norm = (s) =>
      String(s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    // ✅ "Support fixe" en premier
    const fixationList = baseList.slice().sort((a, b) => {
      const an = norm(a?.name);
      const bn = norm(b?.name);

      const aIsFixe = an.includes("fixe") || String(a?._id) === "fixe";
      const bIsFixe = bn.includes("fixe") || String(b?._id) === "fixe";

      if (aIsFixe && !bIsFixe) return -1;
      if (!aIsFixe && bIsFixe) return 1;
      return an.localeCompare(bn);
    });

    const isPlafond = (f) => norm(f?.name).includes("plafond") || String(f?._id) === "plafond";

    // ✅ si pas encore de fixationId -> on coche "Support fixe"
    const currentFixationId = pi.fixationId || "";
    const isFixe = (f) => norm(f?.name).includes("fixe") || String(f?._id) === "fixe";

    const selectedFix = fixationList.find((f) =>
      currentFixationId
        ? String(f._id) === String(currentFixationId)
        : isFixe(f)
    );

    const showFixationComment = isPlafond(selectedFix);

    return (
      <>
        <div className="agenthome-radioGrid">
          {fixationList.map((f) => {
            const checked = currentFixationId
              ? String(currentFixationId) === String(f._id)
              : isFixe(f);

            return (
              <label key={f._id} className="agenthome-radio">
                <input
                  type="radio"
                  name={`fixation_${pi.instanceId}`}
                  checked={checked}
                  onChange={() =>
                    updatePitchInstance(pi.instanceId, {
                      fixationId: f._id,
                      fixationName: f.name, // ✅ indispensable
                    })
                  }
                />
                <span>{f.name}</span>
              </label>
            );
          })}
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
      </>
    );
  })()}
</div>


                  {/* Abonnement Murs LED — affiché 1 seule fois */}
{pitchInstances.indexOf(pi) === 0 && (
  <div className="agenthome-subsection">
    <div className="agenthome-subsectionTitle">Abonnement (Écrans LED) :</div>
    <div className="agenthome-selectRow">
      <select
        className="agenthome-select"
        value={wallLedsAbonnement.key}
        onChange={(e) => {
          const found = ABONNEMENT_OPTIONS.find((a) => a.key === e.target.value);
          if (found) setWallLedsAbonnement(found);
        }}
      >
        {ABONNEMENT_OPTIONS.map((a) => (
          <option key={a.key} value={a.key}>
            {a.label} — {a.price.toFixed(2)} € HT/mois
          </option>
        ))}
      </select>
    </div>
  </div>
)}

                  

                  {/* Type financement */}
<div className="agenthome-subsection">
  <div className="agenthome-subsectionTitle">Type de financement :</div>

  <div className="agenthome-selectRow">
    <select
      className="agenthome-select"
      value={pi.typeFinancement}
      onChange={(e) => {
        const value = e.target.value;

        updatePitchInstance(pi.instanceId, {
          typeFinancement: value,

          // ✅ reset des options si achat
          optionsFinancement: value === "achat" ? [] : (pi.optionsFinancement || []),
        });
      }}
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

  {/* SELECT SEUL (plus de flex avec options) */}
  <div className="agenthome-selectRow">
    <select
      className="agenthome-select"
      value={pi.financementMonths}
      onChange={(e) => {
        const value = String(e.target.value);

        updatePitchInstance(pi.instanceId, {
          financementMonths: value,
          optionsFinancement: [value],
        });
      }}
    >
      {(durations.length
        ? durations
        : [{ months: 63 }, { months: 48 }, { months: 36 }]
      ).map((d) => (
        <option key={d._id || d.months} value={String(d.months)}>
          {d.months} mois
        </option>
      ))}
    </select>
  </div>

  {/* ✅ OPTIONS EN DESSOUS + MASQUÉ SI ACHAT */}
  {pi.typeFinancement !== "achat" && (
    <div className="agenthome-subsection" style={{ marginTop: 10 }}>
      <div className="agenthome-subsectionTitle">Options :</div>

      <div className="agenthome-optionsRow">
        {["24", "36", "48", "63", "achat"].map((opt) => {
    const checked =
  (pi.optionsFinancement || []).includes(opt) ||
  String(pi.financementMonths) === opt;

          return (
            <label key={opt} className="agenthome-optionItem">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  const current = pi.optionsFinancement || [];

                  let next;
                  if (e.target.checked) {
                    next = [...current, opt];
                  } else {
                    next = current.filter((o) => o !== opt);
                  }

                  updatePitchInstance(pi.instanceId, {
                    optionsFinancement: next,
                  });
                }}
              />

             {opt === "achat" ? (
                (() => {
                  const prix = getOptionPrice(pi, "achat");
                  return prix > 0 ? `Achat : ${prix.toFixed(2)} € HT` : "Achat";
                })()
              ) : (
                (() => {
                  const prix = getOptionPrice(pi, opt);
                  return prix > 0
                    ? `${opt} mois : ${prix.toFixed(2)} € HT`
                    : `${opt} mois`;
                })()
              )}
            </label>
          );
        })}
      </div>
    </div>
  )}
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
  abonnement={otherAbonnement}
  onAbonnementChange={setOtherAbonnement}
  showLcd={showLcd}
  selectedLcdProductName={selectedLcdProductName}
  onLcdProductNameChange={setSelectedLcdProductName}
  lcdProducts={lcdProducts}
/>


        {/* --------- SERVICES --------- */}
{showServices && serviceProducts.length > 0 ? (
  <div className="agenthome-section">
    <div className="agenthome-sectionTitle">Services :</div>
    {(() => {
      const byFamily = new Map();
      for (const f of serviceFamilies) {
        byFamily.set(String(f._id), { family: f, products: [] });
      }
      for (const p of serviceProducts) {
        const fid = String(p.familyId?._id || p.familyId || "");
        if (byFamily.has(fid)) byFamily.get(fid).products.push(p);
      }
      return Array.from(byFamily.values()).map(({ family, products: famProds }) => {
        if (!famProds.length) return null;
        return (
          <div key={family._id} className="agenthome-subcard" style={{ marginBottom: 12 }}>
            <div className="agenthome-subcardTitle">{family.name}</div>
            {famProds.map((prod) => {
              const sel = serviceSelections.find((s) => s.productId === String(prod._id));
              const qty = sel ? sel.quantite : 0;
              return (
                <div key={prod._id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                  <label className="agenthome-check" style={{ flex: 1, minWidth: 200 }}>
                    <input
                      type="checkbox"
                      checked={!!sel}
                      onChange={() => {
                        setServiceSelections((prev) => {
                          const has = prev.find((s) => s.productId === String(prod._id));
                          if (has) return prev.filter((s) => s.productId !== String(prod._id));
                          return [...prev, {
                            productId: String(prod._id),
                            designation: prod.designation,
                            reference: prod.reference || "",
                            prixUnitaireHt: prod.prixUnitaireHt,
                            quantite: 1,
                          }];
                        });
                      }}
                    />
                    <span>{prod.designation}</span>
                    {prod.reference ? <span style={{ fontSize: 11, color: "#888", marginLeft: 4 }}>({prod.reference})</span> : null}
                  </label>
                  {sel ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <label style={{ fontSize: 12 }}>Qté :</label>
                      <input
                        type="number"
                        min="1"
                        value={qty}
                        onChange={(e) => {
                          const q = Math.max(1, parseInt(e.target.value || "1", 10) || 1);
                          setServiceSelections((prev) =>
                            prev.map((s) => s.productId === String(prod._id) ? { ...s, quantite: q } : s)
                          );
                        }}
                        className="agenthome-input"
                        style={{ width: 60 }}
                      />
                      <span style={{ fontSize: 12, color: "#555" }}>PU : {Number(prod.prixUnitaireHt).toFixed(2)} € HT</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        );
      });
    })()}
  </div>
) : null}

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
                required
                onChange={(e) => setClient((p) => ({ ...p, nom: e.target.value }))}
              />
            </div>

            <div className="agenthome-field">
              <label>Prénom :</label>
              <input
                className="agenthome-input"
                placeholder="Entrez le prénom du client"
                value={client.prenom}
                required
                onChange={(e) => setClient((p) => ({ ...p, prenom: e.target.value }))}
              />
            </div>




            <div className="agenthome-field" style={{ position: "relative" }}>
  <label>Société :</label>
  <input
    className="agenthome-input"
    placeholder="Société du client"
    value={client.societe}
    required
    onChange={async (e) => {
      const value = e.target.value;
      setClient((p) => ({ ...p, societe: value }));
      setShowSocieteSuggestions(true);

      if (value.trim().length < 3) {
        setSocieteSuggestions([]);
        return;
      }

      try {
        setSocieteLoading(true);
        const token = localStorage.getItem(TOKEN_KEY);
        const res = await fetch(
          `${API}/api/agents/client-societes?q=${encodeURIComponent(value)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setSocieteSuggestions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setSocieteSuggestions([]);
      } finally {
        setSocieteLoading(false);
      }
    }}
    onFocus={() => {
      if (client.societe.trim().length >= 3) setShowSocieteSuggestions(true);
    }}
    onBlur={() => {
      setTimeout(() => setShowSocieteSuggestions(false), 150);
    }}
  />

  {showSocieteSuggestions && client.societe.trim().length >= 3 && (
    <div className="agenthome-autocomplete">
      {societeLoading ? (
        <div className="agenthome-autocompleteItem">Chargement...</div>
      ) : societeSuggestions.length ? (
        societeSuggestions.map((s) => (
          <button
            key={`${s.societe}-${s.codePostal}-${s.ville}`}
            type="button"
            className="agenthome-autocompleteItem"
            onMouseDown={(e) => {
              e.preventDefault();
              setClient((p) => ({
                ...p,
                societe: s.societe || p.societe,
                adresse1: s.adresse1 || p.adresse1,
                codePostal: s.codePostal || p.codePostal,
                ville: s.ville || p.ville,
              }));
              setSocieteSuggestions([]);
              setShowSocieteSuggestions(false);
            }}
          >
            <strong>{s.societe}</strong>
            <div>
              {[s.adresse1, s.codePostal, s.ville].filter(Boolean).join(" — ")}
            </div>
          </button>
        ))
      ) : (
        <div className="agenthome-autocompleteItem">Aucun ancien client trouvé</div>
      )}
    </div>
  )}
</div>

           
         <div className="agenthome-field">
  <label>Adresse 1 :</label>
  {googleLoaded ? (
    <AddressAutocomplete
      value={client.adresse1}
      googleLoaded={googleLoaded}
      onChange={(val) => setClient((p) => ({ ...p, adresse1: val }))}
      onPlaceSelected={({ adresse1, codePostal, ville }) =>
        setClient((p) => ({
          ...p,
          adresse1,
          codePostal: codePostal || p.codePostal,
          ville: ville || p.ville,
        }))
      }
      placeholder="Adresse du client"
      className="agenthome-input"
    />
  ) : (
    <input
      className="agenthome-input"
      placeholder="Adresse du client"
      value={client.adresse1}
      onChange={(e) => setClient((p) => ({ ...p, adresse1: e.target.value }))}
    />
  )}
</div>

<div className="agenthome-field">
  <label>Code postal :</label>
  <input
    className="agenthome-input"
    placeholder="Code postal du client"
    value={client.codePostal}
    required
    onChange={(e) => setClient((p) => ({ ...p, codePostal: e.target.value }))}
  />
</div>
            

        

            <div className="agenthome-field">
              <label>Ville :</label>
              <input
                className="agenthome-input"
                placeholder="Ville du client"
                value={client.ville}
                required
                onChange={(e) => setClient((p) => ({ ...p, ville: e.target.value }))}
              />
            </div>

            <div className="agenthome-field">
              <label>Téléphone :</label>
              <input
                className="agenthome-input"
                placeholder="Numéro du client"
                value={client.telephone}
                required
                onChange={(e) => setClient((p) => ({ ...p, telephone: e.target.value }))}
              />
            </div>

            <div className="agenthome-field">
              <label>E-mail :</label>
              <input
                className="agenthome-input"
                placeholder="adresse e-mail du client"
                value={client.email}
                required
                onChange={(e) => setClient((p) => ({ ...p, email: e.target.value }))}
              />
            </div>

            

         <div className="agenthome-field">
  <label>Votre e-mail :</label>
  <input
    className="agenthome-input agenthome-input--readonly"
    value={client.votreEmail}
    readOnly
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

  {/* A) Remise */}
  <div className="agenthome-field" style={{ marginTop: 12 }}>
    <label>Remise (%) — max {REMISE_MAX}% :</label>
    <input
      type="number"
      min="0"
      max={REMISE_MAX}
      step="0.5"
      value={remise}
      onChange={(e) => setRemise(Math.min(REMISE_MAX, Math.max(0, Number(e.target.value) || 0)))}
      className="agenthome-input"
    />
  </div>

  {/* B) Frais */}
  <div className="agenthome-offers" style={{ marginTop: 10 }}>
    <label className="agenthome-check">
      <input
        type="checkbox"
        checked={client.fraisInstallationOfferts}
        onChange={(e) => setClient((p) => ({ ...p, fraisInstallationOfferts: e.target.checked }))}
      />
      <span>Frais installation offerts</span>
    </label>
    <label className="agenthome-check">
      <input
        type="checkbox"
        checked={client.fraisParametrageOfferts}
        onChange={(e) => setClient((p) => ({ ...p, fraisParametrageOfferts: e.target.checked }))}
      />
      <span>Frais paramétrage offerts</span>
    </label>
    <label className="agenthome-check">
      <input
        type="checkbox"
        checked={client.fraisPortOfferts}
        onChange={(e) => setClient((p) => ({ ...p, fraisPortOfferts: e.target.checked }))}
      />
      <span>Frais de port offerts</span>
    </label>
  </div>

  {/* C) Apport */}
  {pitchInstances?.[0]?.typeFinancement !== "achat" && (
    <div className="agenthome-field" style={{ marginTop: 12 }}>
      <label>Apport (€) :</label>
      <input
        type="number"
        min="0"
        step="100"
        value={apport}
        onChange={(e) => setApport(Math.max(0, parseInt(e.target.value || "0", 10) || 0))}
        className="agenthome-input"
      />
    </div>
  )}

  {/* D) Tableau des durées */}
  {pitchInstances.length > 0 && pitchInstances[0]?.typeFinancement !== "achat" && (() => {
    const pi0 = pitchInstances[0];
    const opts = pi0.optionsFinancement || [];
    if (!opts.length) return null;
    const dureeSel0 = String(pi0.financementMonths || "63");
    const rate0 = (leaseurRates || []).find((r) => String(r.months) === dureeSel0);
    const CL0 = Number(rate0?.coutLeaseurSurCoutTotal || 0);
    const AB0 = Number(staticVals?.abattement_comptant ?? 0.7);

    const optionsDurees = opts.map((opt) => {
      const htPitch = opt === "achat" ? getOptionPrice(pi0, "achat") : getOptionPrice(pi0, opt);
      const htPitchRemise = htPitch * (1 - remise / 100);
      const htTotal = htPitchRemise + recap.htServices;
      const htFinal = Number(apport) > 0
        ? applyApport({ mensualiteInitiale: htTotal, apport, abattement: AB0, coutLeaseur: CL0, dureeMonths: dureeSel0 })
        : htTotal;
      const ttcFinal = htFinal * 1.2;
      const label = opt === "achat" ? "Achat" : `${opt} mois`;
      return { label, ht: htFinal, ttc: ttcFinal };
    });

    return (
      <div style={{ marginTop: 10, padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Récapitulatif par durée :</div>
        {optionsDurees.map(({ label, ht, ttc }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span>{label} :</span>
            <span>{fmtEuro(ht)} HT / {fmtEuro(ttc)} TTC</span>
          </div>
        ))}
      </div>
    );
  })()}

  {/* E) Totaux */}
  <div style={{ marginTop: 14, borderTop: "1px dashed #e5e7eb", paddingTop: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontWeight: 700 }}>Montant total HT général :</span>
      <span style={{ fontWeight: 700 }}>{fmtEuro(recap.totalHt)}</span>
    </div>

    {agentRemise > 0 && (
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 6 }}>
        <span style={{ fontWeight: 500, color: "#e67e22" }}>Remise {agentRemise}%</span>
        <span style={{ fontWeight: 600, color: "#e67e22" }}>
          − {fmtEuro((recap.totalHt * agentRemise) / 100)}
        </span>
      </div>
    )}

    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 6 }}>
      <span style={{ fontWeight: 700 }}>Montant TVA (20%) :</span>
      <span style={{ fontWeight: 700 }}>{fmtEuro(tvaApresRemise)}</span>
    </div>

    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 10 }}>
      <span style={{ fontWeight: 800 }}>Mensualité TTC :</span>
      <span style={{ fontWeight: 800 }}>{fmtEuro(ttcApresRemise)}</span>
    </div>
  </div>
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
