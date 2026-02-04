// src/pages/agent/agentHome.helpers.js
export const TOKEN_KEY = "agent_token_v1";
export const USER_KEY = "agent_user_v1";

// ⚠️ même logique que ton CF7
export const SPECIAL_GROUP = "Exterieur fixe haute luminosité";

export function toNum(v, def = 0) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : def;
}

export function roundDimLikeCF7(n) {
  if (!Number.isFinite(n)) return 0;
  const frac = n - Math.floor(n);
  return frac >= 0.51 ? Math.ceil(n) : Math.floor(n);
}

export function parsePitchMmFromLabel(label) {
  const raw = String(label || "");
  const m = raw.match(/P\s*([0-9]*\.?[0-9]+)/i);
  return m ? toNum(m[1], 0) : 0;
}

export function normalizeStaticVals(db = {}) {
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

    option_ecran: toNum(get("option_ecran", "fixation_finition_eur_ml"), 100),
    option_tirage: toNum(get("option_tirage", "tirage_cable_eur_m2"), 80),
    option_peinture: toNum(get("option_peinture", "reprise_peinture_eur_m2"), 100),
    option_coffrage: toNum(get("option_coffrage", "coffrage_placo_eur_m2"), 75),
    option_raccordement: toNum(get("option_raccordement", "raccordement_eur_m2"), 75),
    option_livraison: toNum(get("option_livraison", "livraison_eur_m2"), 150),
    prix_container: toNum(get("prix_container", "prix_container_eur_m2"), 150),
    prix_instal: toNum(get("prix_instal", "installation_eur_m2"), 500),
  };
}

export function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

export function getWallLedsProductId(products) {
  const p = (products || []).find(
    (x) => (x?.name || "").toLowerCase().trim() === "murs leds"
  );
  return p?._id || p?.id || "";
}

export function createDefaultPitchInstance({ pitch, durations }) {
  const id = pitch?._id || pitch?.id;
  return {
    instanceId: `${id}_${Date.now()}`,
    pitchId: id,
    pitchLabel: pitch?.label || pitch?.name || pitch?.titre || pitch?.code || "Pitch",
    resolutionLabel: pitch?.resolutionLabel || pitch?.resolution || pitch?.categoryName || "",
    collapsed: false,

    // Dimensions (vides au départ)
    largeurM: "",
    hauteurM: "",
    surfaceM2: "",
    diagonaleCm: "",
    pouces: "",
    largeurPx: "",
    hauteurPx: "",
    container: "",

    // Finition / Fixation
    finitionId: "",
    fixationId: "",
    metreLineaire: "5",

    // Financement
    typeFinancement: "location_maintenance",
    financementMonths: durations?.[0]?.months ? String(durations[0].months) : "63",

    // Résultat
    prixTotalHtMois: "97",
    quantite: "1",
    montantHt: "97.00",
  };
}

export async function loadPitchesByCategory({ API, categoryId, productId }) {
  const tries = [
    `${API}/api/pitches?categoryId=${encodeURIComponent(categoryId)}&productId=${encodeURIComponent(productId)}`,
    `${API}/api/pitches?category=${encodeURIComponent(categoryId)}&productId=${encodeURIComponent(productId)}`,
    `${API}/api/pitches?pitchCategoryId=${encodeURIComponent(categoryId)}&productId=${encodeURIComponent(productId)}`,
    `${API}/api/pitches?categoryId=${encodeURIComponent(categoryId)}`,
    `${API}/api/pitches?category=${encodeURIComponent(categoryId)}`,
  ];

  let lastErr = null;

  for (const url of tries) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.items || [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      lastErr = e;
    }
  }

  console.error(lastErr);
  throw new Error("Aucun endpoint pitches n’a répondu correctement.");
}

export function computePitchQuote({
  largeurM,
  hauteurM,
  lineaireRaw,
  pitchLabel,
  prixPitch,
  dureeMonths,
  typeFinancement,
  quantite,
  staticVals,
  categorieName,
}) {
  const L = toNum(largeurM, 0);
  const H = toNum(hauteurM, 0);
  const surface = L * H;

  const diagonale = Math.sqrt(L * L + H * H) * 100; // cm
  const pouces = diagonale / 2.54;

  const pitchMm = parsePitchMmFromLabel(pitchLabel);
  const largeurPx = pitchMm > 0 && L > 0 ? Math.floor((L * 1000) / pitchMm) : "";
  const hauteurPx = pitchMm > 0 && H > 0 ? Math.floor((H * 1000) / pitchMm) : "";

  const minLineaire = categorieName === SPECIAL_GROUP ? 5 : 2.5;
  const lineaire = Math.max(minLineaire, toNum(lineaireRaw, 0));

  const container = lineaire * 2 * (staticVals.option_ecran ?? 100);
  const duree = Math.max(1, parseInt(String(dureeMonths || "1"), 10) || 1);

  const accessoires_players = staticVals.accessoires_players ?? 800;
  const cout_locaux = staticVals.cout_locaux_chine_france ?? 1000;
  const cout_leasing = staticVals.cout_leasing ?? 0.7;
  const marge = staticVals.marge_catalogue ?? 0.7;
  const douanes = staticVals.droits_de_douanes ?? 1.14;
  const taux_conversion = staticVals.euros_dollars ?? 1.07;

  const tirage_unit = staticVals.option_tirage ?? 80;
  const livraison_unit = staticVals.option_livraison ?? 150;
  const install_unit = staticVals.prix_instal ?? 500;

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
