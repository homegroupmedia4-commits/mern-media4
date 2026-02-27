// client/src/pages/AdminFormules.jsx
import React from "react";

export default function AdminFormules() {
  return (
    <div className="dash-page">
      <h2 style={{ marginTop: 0 }}>Formules (calculs côté client)</h2>

      <div className="card" style={{ padding: 16, lineHeight: 1.6 }}>
        <p style={{ marginTop: 0 }}>
          Cette page récapitule les formules réellement appliquées dans :
          <br />
          <b>AgentHome.jsx</b>, <b>AgentOtherProductsBlock.jsx</b>, <b>agentHome.helpers.js</b>.
        </p>

        <hr style={{ margin: "16px 0" }} />

        <h3>1) Murs leds (Pitch) — computePitchQuote()</h3>

        <h4>A) Entrées</h4>
        <ul>
          <li>L = toNum(largeurM)</li>
          <li>H = toNum(hauteurM)</li>
          <li>surface = L * H</li>
        </ul>

        <h4>B) Diagonale + pouces (arrondi CF7)</h4>
        <ul>
          <li>diagonaleCm_raw = sqrt(L² + H²) * 100</li>
          <li>pouces_raw = diagonaleCm_raw / 2.54</li>
          <li>roundDimLikeCF7(n) = (frac(n) &gt;= 0.51) ? ceil(n) : floor(n)</li>
          <li>diagonaleCm = roundDimLikeCF7(diagonaleCm_raw)</li>
          <li>pouces = roundDimLikeCF7(pouces_raw)</li>
        </ul>

        <h4>C) Pitch mm depuis le label</h4>
        <ul>
          <li>pitchMm = parsePitchMmFromLabel(pitchLabel)</li>
          <li>regex: /P\s*([0-9]*\.?[0-9]+)/i</li>
        </ul>

        <h4>D) Pixels (si dimensions saisies)</h4>
        <ul>
          <li>hasDims = (L &gt; 0 && H &gt; 0)</li>
          <li>
            largeurPx = !hasDims ? "" : (pitchMm &gt; 0 ? floor((L*1000)/pitchMm) : "—")
          </li>
          <li>
            hauteurPx = !hasDims ? "" : (pitchMm &gt; 0 ? floor((H*1000)/pitchMm) : "—")
          </li>
        </ul>

        <h4>E) Linéaire + container</h4>
        <ul>
          <li>SPECIAL_GROUP = "Exterieur haute luminosité"</li>
          <li>minLineaire = (categorieName === SPECIAL_GROUP) ? 5 : 2.5</li>
          <li>lineaireUsed = max(minLineaire, toNum(lineaireRaw, 0))</li>
          <li>container = lineaireUsed * 2 * option_ecran (option_ecran défaut = 100)</li>
        </ul>

        <h4>F) Frais (avec minimums)</h4>
        <ul>
          <li>tirage = max(option_tirage * surface, 250)</li>
          <li>livraison = max(option_livraison * surface, 300)</li>
          <li>install = max(prix_instal * surface, 750)</li>
        </ul>

        <h4>G) Brut / EUR / Leasing</h4>
        <ul>
          <li>total_accessoires = accessoires_players + cout_locaux</li>
          <li>total_pieces = surface * 0.1 * prixPitch * droits_de_douanes</li>
          <li>total_ecran = (prixPitch + container) * surface</li>
          <li>total_brut = total_ecran + total_accessoires + total_pieces</li>
          <li>
            total_eur = (total_brut / euros_dollars) + install + (option_ecran * surface) + livraison + tirage
          </li>
          <li>step1 = total_eur / cout_leasing</li>
          <li>step2 = step1 / marge_catalogue</li>
        </ul>

        <h4>H) Mensualité vs achat + arrondi + quantité</h4>
        <ul>
          <li>duree = max(1, int(dureeMonths))</li>
          <li>prix_mensuel = step2 / duree</li>
          <li>prix_achat = step2 * 0.6</li>
          <li>prix_total_affiche = (typeFinancement === "achat") ? prix_achat : prix_mensuel</li>
          <li>totalArrondi = round(prix_total_affiche)</li>
          <li>q = max(1, int(quantite))</li>
          <li>montantHt = q * totalArrondi</li>
        </ul>

        <hr style={{ margin: "16px 0" }} />

        <h3>2) Ajout finition dans AgentHome.jsx (updatePitchInstance)</h3>
        <ul>
          <li>qScreens = max(1, int(next.quantite))</li>
          <li>finUnit = Number(next.finitionPriceMonthlyHt || 0)</li>
          <li>prixTotalHtMois = Number(quote.total || 0) + finUnit</li>
          <li>montantHt = Number(quote.montant || 0) + finUnit * qScreens</li>
        </ul>

        <hr style={{ margin: "16px 0" }} />

        <h3>3) Autres produits — computeOtherLine() (AgentOtherProductsBlock.jsx)</h3>
        <ul>
          <li>memPrice = memOptions.find(m =&gt; m._id === memId)?.price ?? 0</li>
          <li>monthly = basePrice + memPrice</li>
          <li>months = max(1, int(leasingMonths))</li>
          <li>unit = (typeFinancement === "achat") ? (monthly * months) * 0.6 : monthly</li>
          <li>q = max(1, int(qty))</li>
          <li>total = unit * q</li>
        </ul>

        <hr style={{ margin: "16px 0" }} />

        <h3>4) Récap total (AgentHome.jsx)</h3>
        <ul>
          <li>HT autres produits = somme(unit * qty)</li>
          <li>HT murs leds = somme(parseEuro(pi.montantHt))</li>
          <li>ABOBR = +19.95 si au moins 1 ligne</li>
          <li>TVA = ht * 0.2</li>
          <li>TTC = ht + tva</li>
        </ul>


        <hr style={{ margin: "16px 0" }} />

        <h3>5) Mètre linéaire par défaut (createDefaultPitchInstance)</h3>
        <ul>
          <li>metreLineaire = (categorieName === SPECIAL_GROUP) ? "5" : "2.5"</li>
        </ul>
      </div>
    </div>
  );
}
