import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./AgentHome.css";

const TOKEN_KEY = "agent_token_v1";
const USER_KEY = "agent_user_v1";

function toNum(v, def = 0) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : def;
}

function roundDimLikeCF7(n) {
  if (!Number.isFinite(n)) return 0;
  const frac = n - Math.floor(n);
  return frac >= 0.51 ? Math.ceil(n) : Math.floor(n);
}

function truncIntLikeCF7(n) {
  if (!Number.isFinite(n)) return "";
  if (n === 0 || Object.is(n, -0)) return 0;
  return Math.trunc(n);
}

function parsePitchMmFromLabel(label) {
  const raw = String(label || "");
  const m = raw.match(/P\s*([0-9]*\.?[0-9]+)/i);
  return m ? toNum(m[1], 0) : 0;
}

/**
 * Normalise les clés DB vers les clés CF7 utilisées dans tes calculs.
 * (Supporte les deux nomenclatures: ancienne (fixation_finition_eur_ml, etc.)
 *  et CF7 (option_ecran, option_tirage...))
 */
function normalizeStaticVals(db = {}) {
  const get = (...keys) => {
    for (const k of keys) {
      if (db?.[k] !== undefined && db?.[k] !== null) return db[k];
    }
    return undefined;
  };

  return {
    accessoires_players: toNum(get("accessoires_players"), 800),
    cout_locaux_chine_france: toNum(get("cout_locaux_chine_france"), 1000),
    cout_leasing: toNum(get("cout_leasing", "coeff_leasing"), 0.7),
    marge_catalogue: toNum(get("marge_catalogue"), 0.7),
    droits_de_douanes: toNum(get("droits_de_douanes", "droits_douane"), 1.14),
    euros_dollars: toNum(get("euros_dollars", "taux_eur_usd"), 1.07),

    // CF7: option_ecran (€/ml) ; ancienne UI: fixation_finition_eur_ml
    option_ecran: toNum(get("option_ecran", "fixation_finition_eur_ml"), 100),

    // CF7: option_tirage (€/m²) ; ancienne UI: tirage_cable_eur_m2
    option_tirage: toNum(get("option_tirage", "tirage_cable_eur_m2"), 80),

    // CF7: option_peinture (€/m²) ; ancienne UI: reprise_peinture_eur_m2
    option_peinture: toNum(get("option_peinture", "reprise_peinture_eur_m2"), 100),

    // CF7: option_coffrage (€/m²) ; ancienne UI: coffrage_placo_eur_m2
    option_coffrage: toNum(get("option_coffrage", "coffrage_placo_eur_m2"), 75),

    // CF7: option_raccordement (€/m²) ; ancienne UI: raccordement_eur_m2
    option_raccordement: toNum(get("option_raccordement", "raccordement_eur_m2"), 75),

    // CF7: option_livraison (€/m²) ; ancienne UI: livraison_eur_m2
    option_livraison: toNum(get("option_livraison", "livraison_eur_m2"), 150),

    // CF7: prix_container (€/m²) ; ancienne UI: prix_container_eur_m2
    prix_container: toNum(get("prix_container", "prix_container_eur_m2"), 150),

    // CF7: prix_instal (€/m²) ; ancienne UI: installation_eur_m2
    prix_instal: toNum(get("prix_instal", "installation_eur_m2"), 500),
  };
}



function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function computeDiagonalCm(widthM, heightM) {
  const w = num(widthM);
  const h = num(heightM);
  const diagM = Math.sqrt(w * w + h * h);
  return round2(diagM * 100); // m -> cm
}

function cmToInches(cm) {
  return round2(num(cm) / 2.54);
}

export default function AgentHome() {
  const navigate = useNavigate();

  const API = useMemo(
    () => import.meta.env.VITE_API_URL || "https://mern-media4-server.onrender.com",
    []
  );

  const [staticVals, setStaticVals] = useState(() =>
  normalizeStaticVals({
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
  })
);


  const [agent, setAgent] = useState(null);
  const [error, setError] = useState("");

  // --- PDF (ton existant)
  const [texte, setTexte] = useState("");
  const [savingPdf, setSavingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");

  // --- UI "devis" (images)
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState([]);

const wallLedsProductId = useMemo(() => {
  const p = products.find(
    (x) => (x?.name || "").toLowerCase().trim() === "murs leds"
  );
  return p?._id || p?.id || "";
}, [products]);

const showWalleds =
  !!wallLedsProductId && selectedProductIds.includes(wallLedsProductId);




  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const [pitches, setPitches] = useState([]);
  const [loadingPitches, setLoadingPitches] = useState(false);

  // instances de pitch sélectionnés (pour duplication)
  const [pitchInstances, setPitchInstances] = useState([]);
  // pitchId coché (pour afficher/masquer)
  const [selectedPitchIds, setSelectedPitchIds] = useState([]);


  

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

  // ---------------------------
  // AUTH + ME
  // ---------------------------

  useEffect(() => {
  const shouldShow = !!wallLedsProductId && selectedProductIds.includes(wallLedsProductId);
  if (!shouldShow) return;

  (async () => {
    try {
      const res = await fetch(`${API}/api/static-values`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setStaticVals(normalizeStaticVals(data || {}));
    } catch (e) {
      // pas bloquant : on garde les defaults
      console.warn("STATIC VALUES: defaults utilisés", e);
    }
  })();
}, [API, selectedProductIds, wallLedsProductId]);



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

        // prefill votreEmail (comme capture)
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
  useEffect(() => {
    (async () => {
      setLoadingProducts(true);
      setError("");
      try {
        const res = await fetch(`${API}/api/products`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        // option: afficher seulement actifs
        const active = list.filter((p) => p?.isActive !== false);
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
  // LOAD: Categories (select)
  // (affiché seulement si le productId spécial est coché)
  // ---------------------------
  useEffect(() => {
 const shouldShow =
  !!wallLedsProductId && selectedProductIds.includes(wallLedsProductId);

    if (!shouldShow) {
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
      } catch (e) {
        console.error(e);
        setError("Impossible de charger les catégories.");
      } finally {
        setLoadingCategories(false);
      }
    })();
}, [API, selectedProductIds, wallLedsProductId]);

  // ---------------------------
  // LOAD: Pitches par catégorie
  // ⚠️ endpoints "probables" -> on en essaye plusieurs
  // ---------------------------
  const loadPitchesByCategory = async ({ categoryId, productId }) => {
    const tries = [
      // le plus courant
      `${API}/api/pitches?categoryId=${encodeURIComponent(categoryId)}&productId=${encodeURIComponent(productId)}`,
      `${API}/api/pitches?category=${encodeURIComponent(categoryId)}&productId=${encodeURIComponent(productId)}`,
      `${API}/api/pitches?pitchCategoryId=${encodeURIComponent(categoryId)}&productId=${encodeURIComponent(productId)}`,
      // fallback: sans productId
      `${API}/api/pitches?categoryId=${encodeURIComponent(categoryId)}`,
      `${API}/api/pitches?category=${encodeURIComponent(categoryId)}`,
    ];

    let lastErr = null;

    for (const url of tries) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.items || []);
        return Array.isArray(list) ? list : [];
      } catch (e) {
        lastErr = e;
      }
    }

    console.error(lastErr);
    throw new Error("Aucun endpoint pitches n’a répondu correctement.");
  };

  useEffect(() => {
    const shouldShow =
  !!wallLedsProductId && selectedProductIds.includes(wallLedsProductId);

    if (!shouldShow) return;
    if (!selectedCategoryId) {
      setPitches([]);
      setPitchInstances([]);
      setSelectedPitchIds([]);
      return;
    }

    (async () => {
      setLoadingPitches(true);
      setError("");
      try {
        const list = await loadPitchesByCategory({
          categoryId: selectedCategoryId,
          productId: wallLedsProductId,

        });

        // option: ne garder que actifs si la donnée existe
        const active = list.filter((p) => p?.isActive !== false);
        setPitches(active);
      } catch (e) {
        console.error(e);
        setError(
          "Impossible de charger les pitches (vérifie ton endpoint /api/pitches)."
        );
        setPitches([]);
      } finally {
        setLoadingPitches(false);
      }
    })();
  }, [API, selectedCategoryId, selectedProductIds]);

  // ---------------------------
  // LOAD: finishes + fixations + durations
  // ---------------------------
  const [finishes, setFinishes] = useState([]);
  const [fixations, setFixations] = useState([]);
  const [durations, setDurations] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  useEffect(() => {
 const shouldShow =
  !!wallLedsProductId && selectedProductIds.includes(wallLedsProductId);

    if (!shouldShow) return;

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
        setDurations(
          (Array.isArray(d) ? d : [])
            .filter((x) => x?.isActive !== false)
            .sort((a, b) => (a?.months || 0) - (b?.months || 0))
        );
      } catch (e) {
        console.error(e);
        // pas bloquant, on peut quand même afficher
      } finally {
        setLoadingRefs(false);
      }
    })();
  }, [API, selectedProductIds ,wallLedsProductId]);

  // ---------------------------
  // PITCH selection + instance creation
  // ---------------------------
  const togglePitch = (pitch) => {
    const id = pitch?._id || pitch?.id;
    if (!id) return;

    setSelectedPitchIds((prev) => {
      const has = prev.includes(id);
      const next = has ? prev.filter((x) => x !== id) : [...prev, id];

      // si on décoche -> remove toutes instances de ce pitch
      if (has) {
        setPitchInstances((inst) => inst.filter((pi) => pi.pitchId !== id));
      } else {
        // si on coche -> créer 1 instance par défaut
        setPitchInstances((inst) => [
          ...inst,
          {
            instanceId: `${id}_${Date.now()}`,
            pitchId: id,
            pitchLabel:
              pitch?.label ||
              pitch?.name ||
              pitch?.titre ||
              pitch?.code ||
              "Pitch",
            resolutionLabel:
              pitch?.resolutionLabel ||
              pitch?.resolution ||
              pitch?.categoryName ||
              "",
            collapsed: false,

            // Dimensions
           

            // Finition / Fixation
            finitionId: "",
            fixationId: "",
            metreLineaire: "5",

            // Financement
            typeFinancement: "location_maintenance", // achat | location_evenementiel | location_maintenance
            financementMonths: durations?.[0]?.months ? String(durations[0].months) : "63",

            // Résultat
            prixTotalHtMois: "97",
            quantite: "1",
            montantHt: "97.00",
          },
        ]);
      }

      return next;
    });
  };



function computePitchQuote({
  largeurM,
  hauteurM,
  lineaireRaw,
  pitchLabel,
  prixPitch,          // pitch.price Mongo (€/m²)
  dureeMonths,
  typeFinancement,    // location_maintenance | location_evenementiel | achat
  quantite,
  staticVals,
  categorieName,
}) {
  const L = toNum(largeurM, 0);
  const H = toNum(hauteurM, 0);
  const surface = L * H;

  const diagonale = Math.sqrt(L * L + H * H) * 100; // cm
  const pouces = diagonale / 2.54;

  // pitch mm depuis label "P2.6"
  const pitchMm = parsePitchMmFromLabel(pitchLabel);
  const largeurPx = pitchMm > 0 && L > 0 ? Math.floor((L * 1000) / pitchMm) : "";
  const hauteurPx = pitchMm > 0 && H > 0 ? Math.floor((H * 1000) / pitchMm) : "";

  // minLineaire (comme ton CF7)
  const minLineaire = categorieName === SPECIAL_GROUP ? 5 : 2.5;

  let lineaireRawN = toNum(lineaireRaw, 0);
  const lineaire = Math.max(minLineaire, lineaireRawN);

  // container = lineaire * 2 * option_ecran
  const container = lineaire * 2 * (staticVals.option_ecran ?? 100);

  const duree = Math.max(1, parseInt(String(dureeMonths || "1"), 10) || 1);

  // Coeffs
  const accessoires_players = staticVals.accessoires_players ?? 800;
  const cout_locaux = staticVals.cout_locaux_chine_france ?? 1000;
  const cout_leasing = staticVals.cout_leasing ?? 0.7;
  const marge = staticVals.marge_catalogue ?? 0.7;
  const douanes = staticVals.droits_de_douanes ?? 1.14;
  const taux_conversion = staticVals.euros_dollars ?? 1.07;

  const tirage_unit = staticVals.option_tirage ?? 80;
  const livraison_unit = staticVals.option_livraison ?? 150;
  const install_unit = staticVals.prix_instal ?? 500;

  // EXACTEMENT comme ton CF7 (mêmes max)
  const tirage = Math.max(tirage_unit * surface, 250);
  const livraison = Math.max(livraison_unit * surface, 300);
  const install = Math.max(surface * install_unit, 750);

  const total_accessoires = accessoires_players + cout_locaux;
  const total_pieces = surface * 0.1 * toNum(prixPitch, 0) * douanes;
  const total_ecran = (toNum(prixPitch, 0) + container) * surface;
  const total_brut = total_ecran + total_accessoires + total_pieces;

  const total_eur =
    total_brut / taux_conversion +
    install +
    (staticVals.option_ecran ?? 100) * surface +
    livraison +
    tirage;

  const step1 = cout_leasing ? total_eur / cout_leasing : 0;
  const step2 = marge ? step1 / marge : 0;

  const prix_mensuel = duree ? step2 / duree : 0;
  const prix_achat = step2 * 0.6;

  const prix_total_affiche = typeFinancement === "achat" ? prix_achat : prix_mensuel;

  // Comme CF7 : total = Math.round(...)
  const totalArrondi = Number.isFinite(prix_total_affiche) ? Math.round(prix_total_affiche) : 0;

  const q = Math.max(1, parseInt(String(quantite || "1"), 10) || 1);
  const montant = q * totalArrondi;

  return {
    surfaceM2: Number.isFinite(surface) ? Number(surface.toFixed(2)) : 0,
    diagonaleCm: roundDimLikeCF7(diagonale),
    pouces: roundDimLikeCF7(pouces),
    largeurPx,
    hauteurPx,
    minLineaire,
    lineaireUsed: lineaire,
    container: Number.isFinite(container) ? container.toFixed(2) : "0.00",
    total: String(totalArrondi),
    montant: Number.isFinite(montant) ? montant.toFixed(2) : "0.00",
  };
}

const updatePitchInstance = (instanceId, patch) => {
  setPitchInstances((prev) =>
    prev.map((p) => {
      if (p.instanceId !== instanceId) return p;
      const next = { ...p, ...patch };

      // catégorie affichée = catégorie sélectionnée dans le select
      const categorieName =
        categories.find((c) => c._id === selectedCategoryId)?.name || "";

      // prixPitch = champ "price" dans Mongo (comme capture)
      const pitchObj = pitches.find((x) => (x._id || x.id) === next.pitchId);
      const prixPitch = pitchObj?.price ?? 0;

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

      // applique les sorties CF7
      next.surfaceM2 = quote.surfaceM2;
      next.diagonaleCm = quote.diagonaleCm;
      next.pouces = quote.pouces;
      next.largeurPx = quote.largeurPx;
      next.hauteurPx = quote.hauteurPx;

      // lineaire clamp + container auto
      next.metreLineaire = String(quote.lineaireUsed);
      next.container = quote.container;

      // total + montant
      next.prixTotalHtMois = quote.total;
      next.montantHt = quote.montant;

      return next;
    })
  );
};


  const duplicatePitchInstance = (instanceId) => {
    setPitchInstances((prev) => {
      const found = prev.find((x) => x.instanceId === instanceId);
      if (!found) return prev;
      const copy = {
        ...found,
        instanceId: `${found.pitchId}_${Date.now()}`,
        collapsed: false,
      };
      return [...prev, copy];
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
  // Products selection
  // ---------------------------
  const toggleProduct = (productId) => {
    setSelectedProductIds((prev) => {
      const has = prev.includes(productId);
      const next = has ? prev.filter((x) => x !== productId) : [...prev, productId];

      // si on décoche le product spécial -> reset section
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

 

  return (
    <div className="agenthome-page">
      <div className="agenthome-card agenthome-card--wide">
        <div className="agenthome-title">Bonjour</div>

        {agent ? (
          <div className="agenthome-text">
            <div>
              <strong>
                {agent.prenom} {agent.nom}
              </strong>
            </div>
            <div>{agent.email}</div>
          </div>
        ) : (
          <div className="agenthome-text">Chargement...</div>
        )}

        {/* --------- BLOC: Sélectionnez les produits --------- */}
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

        {/* --------- BLOC: Type d’écrans (si productId spécial) --------- */}
        {showWalleds ? (
          <div className="agenthome-section">
            <div className="agenthome-sectionTitle">Type d’écrans :</div>

            <div className="agenthome-selectRow">
              <select
                className="agenthome-select"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                disabled={loadingCategories}
              >
                <option value="">
                  {loadingCategories ? "Chargement..." : "Choisir une catégorie"}
                </option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* --------- BLOC: Liste pitches (checkbox) --------- */}
            {selectedCategoryId ? (
              <div className="agenthome-subcard">
                <div className="agenthome-subcardTitle">
                  {categories.find((x) => x._id === selectedCategoryId)?.name || "Catégorie"}
                </div>

                {loadingPitches ? (
                  <div className="agenthome-muted">Chargement...</div>
                ) : (
                  <div className="agenthome-pitchList">
                    {pitches.map((pitch) => {
                      const id = pitch?._id || pitch?.id;
                      const checked = id ? selectedPitchIds.includes(id) : false;

                      const label =
                        pitch?.label ||
                        pitch?.name ||
                        pitch?.titre ||
                        pitch?.code ||
                        "Pitch";

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
                            {label}
                            {sub ? <em className="agenthome-pitchSub"> {sub}</em> : null}
                          </span>
                        </label>
                      );
                    })}

                    {pitches.length === 0 ? (
                      <div className="agenthome-muted">Aucun pitch pour cette catégorie.</div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* --------- PITCH INSTANCES (dimensions / finition / fixation / financement / résultat) --------- */}
        {pitchInstances.map((pi) => {
          const priceLabel = pi.typeFinancement === "achat" ? "Prix total HT (achat) :" : "Prix total HT (/mois) :";

          return (
            <div key={pi.instanceId} className="agenthome-pitchCard">
              <div className="agenthome-pitchHeader">
                <div className="agenthome-pitchHeaderLeft">
                  <div className="agenthome-pitchTitleLine">
                    <strong>{pi.pitchLabel}</strong>
                  </div>
                  {pi.resolutionLabel ? (
                    <div className="agenthome-muted">Résolution : {pi.resolutionLabel}</div>
                  ) : null}
                </div>

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
                        <input value={pi.diagonaleCm} readOnly className="agenthome-input agenthome-input--readonly" />
                      </div>

                      <div className="agenthome-field">
                        <label>Pouces :</label>
                        <input value={pi.pouces} readOnly className="agenthome-input agenthome-input--readonly" />
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
                        <input value={pi.surfaceM2} readOnly className="agenthome-input agenthome-input--readonly" />
                      </div>
                    </div>
                  </div>

                  {/* Finition */}
                  <div className="agenthome-subsection">
                    <div className="agenthome-subsectionTitle">Finition :</div>

                    <div className="agenthome-radioGrid">
                      {(finishes.length ? finishes : [
                        { _id: "sans", name: "Sans" },
                        { _id: "brut", name: "Brut" },
                        { _id: "blanc", name: "Blanc" },
                        { _id: "autre", name: "Autre couleur" },
                      ]).map((f) => (
                        <label key={f._id} className="agenthome-radio">
                          <input
                            type="radio"
                            name={`finition_${pi.instanceId}`}
                            checked={pi.finitionId === f._id}
                            onChange={() =>
                              updatePitchInstance(pi.instanceId, { finitionId: f._id })
                            }
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
                      {(fixations.length ? fixations : [
                        { _id: "plafond", name: "Support plafond" },
                        { _id: "fixe", name: "Support fixe" },
                        { _id: "special", name: "Support spécial" },
                      ]).map((f) => (
                        <label key={f._id} className="agenthome-radio">
                          <input
                            type="radio"
                            name={`fixation_${pi.instanceId}`}
                            checked={pi.fixationId === f._id}
                            onChange={() =>
                              updatePitchInstance(pi.instanceId, { fixationId: f._id })
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

                  {/* Financement */}
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
                        {(durations.length ? durations : [{ months: 63 }, { months: 48 }, { months: 36 }]).map((d) => (
                          <option key={d._id || d.months} value={String(d.months)}>
                            {d.months} mois
                          </option>
                        ))}
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

        {/* --------- INFOS CLIENT / PROSPECT --------- */}
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
              onChange={(e) =>
                setClient((p) => ({ ...p, commentaires: e.target.value }))
              }
            />
          </div>

          <div className="agenthome-clientActions">
            <button className="agenthome-btn agenthome-btn--green" type="button">
              Valider
            </button>
          </div>
        </div>

        {/* ✅ Ton ancien bloc PDF (tu peux le garder où tu veux) */}
        <div className="agenthome-block">
          <label className="agenthome-label">Ton texte</label>
          <textarea
            className="agenthome-textarea"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder="Écris ton texte ici…"
            rows={4}
          />

          <button
            className="agenthome-btn"
            type="button"
            onClick={submitPdf}
            disabled={savingPdf}
          >
            {savingPdf ? "Génération..." : "Valider & Générer PDF"}
          </button>

          {pdfUrl ? (
            <a className="agenthome-pdf" href={pdfUrl} target="_blank" rel="noreferrer">
              Ouvrir le PDF
            </a>
          ) : null}
        </div>

        {error ? <div className="agenthome-error">{error}</div> : null}

        {/* ✅ AVANT ce bloc: tu voulais placer les infos en image -> c’est fait au-dessus */}
        <div className="agenthome-actions">
          <button className="agenthome-btn" type="button" onClick={logout}>
            Déconnexion
          </button>

          <Link className="agenthome-link" to="/agent/login">
            Retour login
          </Link>
        </div>

        {loadingRefs ? <div className="agenthome-muted">Chargement des référentiels…</div> : null}
      </div>
    </div>
  );
}
