# CARTE COMPLETE DU PROJET MEDIA4

> Application MERN (MongoDB, Express, React, Node.js) de generation de devis pour ecrans LED et produits multimedia.
> Entreprise : SAS MEDIA4 (Bievres, 91570)

---

## 1. LISTE DE TOUS LES FICHIERS ET LEUR ROLE

### RACINE

| Fichier | Role |
|---------|------|
| `deploy.sh` | Script de deploiement VPS : git pull, build frontend, install backend, restart pm2 + nginx |
| `.gitignore` | Exclut node_modules, .env, dist, logs |

### BACKEND (`server/`)

| Fichier | Role |
|---------|------|
| `server/package.json` | Dependances backend : Express 5, Mongoose 9, bcryptjs, jwt, multer, pdfkit, pdf-lib, nodemailer, dotenv |
| `server/index.js` | Point d'entree Express : connexion MongoDB, CORS `origin: "*"`, montage de 13 routeurs API, middleware logging, route health |
| **Modeles Mongoose** | |
| `server/models/Agent.js` | Agent commercial : nom, prenom, email (unique), passwordHash, parrainId (ref Agent), societe, siret, adresse, role (agent/technicien/responsable) |
| `server/models/AgentPasswordReset.js` | Token de reinitialisation de mot de passe : tokenHash (SHA256), expiresAt (TTL Mongo auto-delete), anti-reuse usedAt |
| `server/models/AgentPdf.js` | Devis complet : agentId, agentSnapshot, client (nom/prenom/societe/adresse/frais offerts), devisNumber, finalType (achat/location_maintenance/location_evenementiel), lines (tableau Mixed), pitchInstances, otherSelections, totals, pdfBuffer (binaire), wallLedsAbonnement, otherAbonnement, apport |
| `server/models/FaqItem.js` | Entree FAQ : question, answer, category, role (agent/technicien/tous), order, isActive |
| `server/models/Finish.js` | Finition (ex: MDF brut/noir) : name (unique), priceMonthlyHt, isActive |
| `server/models/Fixation.js` | Type de fixation (ex: Support plafond) : name (unique), isActive |
| `server/models/LeaseurRate.js` | Taux TAEG leaseur par duree : months (unique), taegAnnual, auto-calcul coutCreditSurMontantFinance + coutLeaseurSurCoutTotal via pre-save hook |
| `server/models/LeasingDuration.js` | Durees de leasing disponibles : months (unique, 1-240) |
| `server/models/MemoryOption.js` | Option memoire (ex: 64 GB) : name (unique), price, isActive |
| `server/models/Name.js` | Modele simple de test : name |
| `server/models/OtherProductSize.js` | Taille/prix d'un produit "autre" : productId (ref Product), sizeInches, leasingMonths, price, productCode (unique sparse) |
| `server/models/Pitch.js` | Dalle LED (pitch) : name, codeProduit (unique), dimensions, luminosite, price, categoryId (ref PitchCategory), productId (ref Product), order |
| `server/models/PitchCategory.js` | Categorie de pitch (ex: Interieur, Exterieur haute luminosite) : name (unique), order, isActive |
| `server/models/Product.js` | Produit parent (ex: Murs leds, Totems, Kiosques) : name (unique), systemKey (unique sparse, ex: "wall_leds"), order, isActive |
| `server/models/StaticValues.js` | Valeurs de configuration globales (singleton) : coefficients leasing, marge, droits douane, taux EUR/USD, prix installation/livraison/etc. |
| **Routes API** | |
| `server/routes/agents.js` | **FICHIER LE PLUS CRITIQUE (2470 lignes)** : auth admin (POST /admin/login), auth agent (register, login, me, forgot/reset password), CRUD devis (POST /devis, POST /devis/:id/pdf, GET /devis/:id/pdf), generation PDF pdfkit avec merge CGV pdf-lib, envoi email Brevo, gestion CGV custom (upload/download/reset), admin agents (list, update, set password), autocomplete societes |
| `server/routes/faq.js` | CRUD FAQ : GET public (actives), GET admin (toutes), POST, PUT, DELETE |
| `server/routes/finishes.js` | CRUD finitions : GET, POST, PATCH (name/price/isActive), DELETE |
| `server/routes/fixations.js` | CRUD fixations : GET, POST, PATCH (name/isActive), DELETE |
| `server/routes/leaseurRates.js` | CRUD taux leaseur : GET public, POST/PUT/DELETE admin (avec recalcul auto) |
| `server/routes/leasingDurations.js` | CRUD durees leasing : GET, POST, DELETE (note: POST declare 2 fois) |
| `server/routes/memoryOptions.js` | CRUD options memoire : GET, POST, PATCH, DELETE |
| `server/routes/names.js` | Routes test : POST /names, GET /names/hello, GET /names/latest |
| `server/routes/otherProductSizes.js` | CRUD tailles autres produits : GET (avec populate productId), POST, PATCH, PUT (alias), DELETE |
| `server/routes/pitchCategories.js` | CRUD categories pitch : GET, POST, PATCH (name/isActive), PATCH /reorder, DELETE |
| `server/routes/pitches.js` | CRUD pitches : GET (filtre categoryId/productId, populate), POST, PATCH /reorder, PATCH /:id (tous champs), DELETE |
| `server/routes/products.js` | CRUD produits : GET (tri order), POST, PATCH /reorder (bulkWrite), PATCH /:id, DELETE |
| `server/routes/staticValues.js` | GET/PATCH valeurs statiques (singleton auto-create) |
| **Utilitaires** | |
| `server/utils/mailer.js` | Envoi email via Brevo SMTP (nodemailer) : sendDevisEmail avec piece jointe PDF |

### FRONTEND (`client/`)

| Fichier | Role |
|---------|------|
| `client/package.json` | Dependances frontend : React 19, react-router-dom 6, Vite 7 |
| `client/index.html` | Point d'entree HTML, charge `/src/main.jsx`, favicon Media4logo.png |
| `client/src/main.jsx` | Bootstrap React : BrowserRouter + StrictMode + App |
| `client/src/App.jsx` | Routage principal : admin sous `/adminmedia4/*` (AdminApp layout + Outlet), agent sous `/agent/*` (protege par RequireAgentAuth localStorage), redirections propres |
| `client/src/App.css` | ~1800 lignes de styles globaux : design SaaS blanc, sidebar fixe, responsive mobile (drawer hamburger), tables, modales, badges, boutons |
| **Pages Admin** | |
| `client/src/pages/AdminApp.jsx` | Layout admin : login par mot de passe (POST /admin/login), sidebar blanche avec navigation groupee (Pitchs, Autres produits, Configuration), verification token, Outlet passe `{ API }` |
| `client/src/pages/AdminNosDevis.jsx` | Tableau admin de tous les devis : onglets "Murs leds" / "Autres produits", recherche, flatten des donnees, telecharger/regenerer PDF. **Note: API hardcodee `https://www.media4-bo.eu`** |
| `client/src/pages/AdminAgents.jsx` | Liste + edition modale des agents inscrits (nom, prenom, email, role, parrain, societe, etc.) |
| `client/src/pages/AdminFaq.jsx` | Gestion FAQ : formulaire ajout/edit, categories dynamiques, filtre role, liste avec suppression |
| `client/src/pages/AdminFinition.jsx` | CRUD finitions : ajout nom + prix HT/mois, toggle actif, renommer, supprimer |
| `client/src/pages/AdminFixation.jsx` | CRUD fixations : ajout nom, toggle actif, renommer, supprimer |
| `client/src/pages/AdminFormules.jsx` | **Documentation interactive des formules de calcul** (6 onglets) : Pitch, Finition, Options financement, Autres produits, Recap total, Defaults. Aucun appel API — lecture seule |
| `client/src/pages/AdminPdf.jsx` | Gestion du PDF CGV : affichage statut (default/custom), upload nouveau PDF, telecharger, revenir au defaut |
| `client/src/pages/AdminProduits.jsx` | CRUD produits : ajout, renommer inline, toggle actif, reorder (haut/bas), supprimer (protege pour `wall_leds`) |
| `client/src/pages/AdminTaegLeaseur.jsx` | Gestion TAEG leaseur : tableau editable des taux par duree, colonnes auto-calculees, seed 4 durees par defaut, abattement comptant |
| `client/src/pages/CategoriesPitch.jsx` | CRUD categories pitch : ajout, rename inline, toggle actif, reorder (haut/bas), supprimer |
| `client/src/pages/PitchManager.jsx` | Gestion pitches : formulaire ajout (nom, code, dimensions, luminosite, prix, produit, categorie), tableau groupe par categorie avec reorder, modal edition complete |
| `client/src/pages/TaillesEcrans.jsx` | Gestion tailles/prix autres produits + memoires : 4 sous-onglets (ajout/tableau autres produits, ajout/tableau memoires), edition inline |
| `client/src/pages/ValeursStatiques.jsx` | 2 sous-onglets : durees de leasing (CRUD) + coefficients/montants par defaut (14 champs editables) |
| **Pages Agent** | |
| `client/src/pages/agent/AgentHome.jsx` | **PAGE PRINCIPALE AGENT (~100+ lignes visibles, fichier tres long)** : selection produits, configuration pitch (dimensions, finition, fixation, financement), configuration autres produits, formulaire client, recap totaux, validation devis |
| `client/src/pages/agent/AgentLogin.jsx` | Formulaire connexion agent : email + password, stockage token/user en localStorage |
| `client/src/pages/agent/AgentRegister.jsx` | Inscription agent avec gate (mot de passe `Medi@91?devis`), formulaire complet (nom, prenom, email, password, parrain, societe, siret, adresse, etc.) |
| `client/src/pages/agent/AgentMesDevis.jsx` | Tableau des devis de l'agent connecte : onglets Murs leds / Autres produits, telecharger PDF, flatten + recalcul montants |
| `client/src/pages/agent/AgentFaq.jsx` | Affichage FAQ agent : filtre par role, groupement par categorie, accordeon Q/R |
| `client/src/pages/agent/AgentForgotPassword.jsx` | Reset direct du mot de passe : email + nouveau mot de passe + confirmation (POST /password/reset-direct) |
| `client/src/pages/agent/AgentResetPassword.jsx` | Reset via token URL : nouveau mot de passe + confirmation (POST /password/reset) |
| `client/src/pages/agent/AgentOtherProductsBlock.jsx` | Bloc selection "autres produits" dans AgentHome : charge otherSizes + memOptions, affiche par produit les tailles/memoires cochables avec quantite |
| `client/src/pages/agent/AgentHeader.jsx` | Header agent responsive : logo, nav (Devis, Mes devis, FAQ, Deconnexion), hamburger mobile avec drawer |
| `client/src/pages/agent/AddressAutocomplete.jsx` | Input avec Google Places Autocomplete : extraction adresse/code postal/ville |
| `client/src/pages/agent/agentHome.helpers.js` | **Coeur metier du calcul** : computePitchQuote (surface, pixels, container, frais, leasing, marge), normalizeStaticVals, createDefaultPitchInstance, loadPitchesByCategory, applyApport, ABONNEMENT_OPTIONS |
| **Hooks** | |
| `client/src/hooks/useGoogleMaps.js` | Charge Google Maps Places API (cle via VITE_GOOGLE_PLACES_KEY) |

---

## 2. GRAPHE DE DEPENDANCES

### Backend : imports entre fichiers

```
server/index.js
  +-- server/routes/names.js          --> server/models/Name.js
  +-- server/routes/pitchCategories.js --> server/models/PitchCategory.js
  +-- server/routes/pitches.js         --> server/models/Pitch.js, PitchCategory.js
  +-- server/routes/leasingDurations.js--> server/models/LeasingDuration.js
  +-- server/routes/staticValues.js    --> server/models/StaticValues.js
  +-- server/routes/otherProductSizes.js-> server/models/OtherProductSize.js
  +-- server/routes/memoryOptions.js   --> server/models/MemoryOption.js
  +-- server/routes/agents.js          --> server/models/Agent.js
  |                                        server/models/AgentPdf.js
  |                                        server/models/AgentPasswordReset.js
  |                                        server/models/OtherProductSize.js
  |                                        server/models/MemoryOption.js
  |                                        server/models/LeaseurRate.js
  |                                        server/models/StaticValues.js
  |                                        server/utils/mailer.js
  +-- server/routes/products.js        --> server/models/Product.js
  +-- server/routes/finishes.js        --> server/models/Finish.js
  +-- server/routes/fixations.js       --> server/models/Fixation.js
  +-- server/routes/leaseurRates.js    --> server/models/LeaseurRate.js
  +-- server/routes/faq.js             --> server/models/FaqItem.js
```

### Frontend : imports entre fichiers

```
client/src/main.jsx
  +-- client/src/App.jsx
        +-- pages/AdminApp.jsx (layout admin)
        |     +-- pages/AdminNosDevis.jsx
        |     +-- pages/AdminAgents.jsx
        |     +-- pages/AdminFaq.jsx
        |     +-- pages/AdminFinition.jsx
        |     +-- pages/AdminFixation.jsx
        |     +-- pages/AdminFormules.jsx
        |     +-- pages/AdminPdf.jsx
        |     +-- pages/AdminProduits.jsx
        |     +-- pages/AdminTaegLeaseur.jsx
        |     +-- pages/CategoriesPitch.jsx
        |     +-- pages/PitchManager.jsx
        |     +-- pages/TaillesEcrans.jsx
        |     +-- pages/ValeursStatiques.jsx
        |
        +-- pages/agent/AgentLogin.jsx
        +-- pages/agent/AgentRegister.jsx
        +-- pages/agent/AgentHome.jsx
        |     +-- pages/agent/AgentOtherProductsBlock.jsx
        |     +-- pages/agent/AgentHeader.jsx
        |     +-- pages/agent/AddressAutocomplete.jsx
        |     +-- pages/agent/agentHome.helpers.js
        |     +-- hooks/useGoogleMaps.js
        +-- pages/agent/AgentMesDevis.jsx
        |     +-- pages/agent/AgentHeader.jsx
        |     +-- pages/agent/agentHome.helpers.js
        +-- pages/agent/AgentFaq.jsx
        |     +-- pages/agent/AgentHeader.jsx
        |     +-- pages/agent/agentHome.helpers.js
        +-- pages/agent/AgentForgotPassword.jsx
        +-- pages/agent/AgentResetPassword.jsx
```

---

## 3. LES 10 FICHIERS LES PLUS CRITIQUES

| # | Fichier | Pourquoi |
|---|---------|----------|
| 1 | `server/routes/agents.js` | **Coeur du systeme** : auth, devis, PDF, email, CGV. 2470 lignes. Casser ce fichier = appli morte. |
| 2 | `server/models/AgentPdf.js` | Schema du devis : toute modification de structure casse la generation PDF et l'affichage des devis existants |
| 3 | `client/src/pages/agent/agentHome.helpers.js` | **Moteur de calcul prix** : computePitchQuote, applyApport, normalizeStaticVals. Erreur = montants faux sur tous les devis |
| 4 | `client/src/pages/agent/AgentHome.jsx` | Page principale agent : orchestration complete du devis (pitch + autres + client + recap + validation) |
| 5 | `server/index.js` | Point d'entree serveur : routage API, connexion MongoDB. Erreur = serveur HS |
| 6 | `server/models/Agent.js` | Schema agent : auth, relations (parrainId). Modifier = casse connexion |
| 7 | `client/src/App.jsx` | Routage React : toute erreur = navigation cassee pour tous les utilisateurs |
| 8 | `server/utils/mailer.js` | Envoi emails devis via Brevo. Casser = agents ne recoivent plus les PDF |
| 9 | `client/src/pages/agent/AgentOtherProductsBlock.jsx` | Selection des autres produits : logique de prix + checkboxes isolees par duree (byMonths) |
| 10 | `server/models/LeaseurRate.js` | Calcul TAEG auto (pre-save hook) + export computeTaeg : utilise dans le calcul d'apport |

---

## 4. POINTS DE FRAGILITE IDENTIFIES

### Architecture

1. **`server/routes/agents.js` est un fichier monolithique de 2470 lignes** : auth, devis, PDF, CGV, password reset, admin — tout dans un seul fichier. Risque eleve de regression lors de modifications.

2. **Duplication de logique de calcul front/back** : le front (agentHome.helpers.js) et le back (agents.js > buildLinesAndTotals) recalculent les montants independamment. Divergence possible = montants affiches != montants PDF.

3. **PDF stocke en base MongoDB (pdfBuffer)** : les devis PDF sont stockes comme Buffer dans AgentPdf. Pour beaucoup de devis, cela peut faire grossir la base rapidement.

4. **CORS `origin: "*"`** : toutes les origines sont autorisees. Acceptable en dev, risque en production.

### Securite

5. **Mot de passe admin en dur dans le code** : `ADMIN_UI_PASSWORD = process.env.ADMIN_UI_PASSWORD || "Homegroup91?"` dans `server/routes/agents.js:32`. Si la variable d'environnement manque, le mot de passe est expose dans le code source.

6. **Mot de passe gate inscription en dur** : `GATE_PASSWORD = "Medi@91?devis"` dans `AgentRegister.jsx:11`. Visible dans le bundle JS du navigateur.

7. **JWT secret par defaut non securise** : `JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me"` dans agents.js. En prod sans .env, c'est une faille critique.

8. **Route `/api/agents/password/reset-direct`** : permet de changer le mot de passe de n'importe quel compte avec juste l'email, sans token de verification. Equivalent a une reinitialisation sans email.

9. **Routes CRUD sans authentification** : les routes FAQ (POST/PUT/DELETE), finishes, fixations, pitchCategories, pitches, products, leasingDurations, otherProductSizes, memoryOptions n'ont aucun middleware d'auth. N'importe qui peut creer/modifier/supprimer des donnees.

10. **Token via query string** : `requireAgentAuth` accepte `?token=...` pour les PDF, ce qui expose le token dans les logs serveur et l'historique navigateur.

### Donnees

11. **API hardcodee dans AdminNosDevis.jsx** : `const API = "https://www.media4-bo.eu"` au lieu d'utiliser le contexte Outlet `{ API }`. Les autres pages admin utilisent le contexte correctement.

12. **API inconsistante cote agent** : certaines pages utilisent `""` (relatif), d'autres `window.location.origin`. Incoherence potentielle en cas de proxy ou sous-domaine.

13. **Schema StaticValues a un champ duplique** : `installation_eur_m2` est declare deux fois (lignes 18-19 du modele).

14. **Route POST /api/leasing-durations declaree deux fois** : dans `server/routes/leasingDurations.js`, lignes 17 et 47. La seconde ecrase la premiere (Express prend la derniere route matchante pour le meme chemin+methode).

15. **App.css contient l'integralite de ses styles en double** : le fichier fait ~1800 lignes et le contenu est duplique a partir de la ligne ~930 (toute la feuille de styles est collee deux fois).

### Deploiement

16. **`deploy.sh` fait un `git reset --hard origin/main`** : ecrase tout travail local sur le serveur sans sauvegarde.

17. **Pas de fichier `.env.example`** : les variables d'environnement requises (MONGODB_URI, JWT_SECRET, BREVO_SMTP_USER, BREVO_SMTP_PASS, MAIL_FROM, MAIL_TO_INTERNAL, APP_BASE_URL, VITE_GOOGLE_PLACES_KEY, ADMIN_UI_PASSWORD) ne sont documentees nulle part.

---

## 5. REGLES DE SECURITE AVANT TOUTE MODIFICATION

### Regles obligatoires

1. **Ne jamais modifier `buildLinesAndTotals()` ou `computePitchQuote()` sans verifier la coherence front/back** : les montants du devis et du PDF doivent correspondre.

2. **Ne jamais modifier le schema AgentPdf sans migration** : les devis existants en base seront corrompus si les champs changent.

3. **Ne jamais supprimer les champs de compatibilite dans `normalizeStaticVals()`** : le mapping des noms DB (`coeff_leasing` -> `cout_leasing`, `droits_douane` -> `droits_de_douanes`, etc.) assure la compatibilite entre les noms du modele Mongoose et les noms utilises dans les calculs front.

4. **Toujours tester la generation PDF apres modification de `agents.js`** : le PDF pdfkit est genere en coordonnees absolues, tout decalage de layout casse le rendu.

5. **Ne jamais committer de secrets** : verifier que .env est dans .gitignore (il l'est), ne pas ajouter de mots de passe dans le code.

6. **Verifier le CORS avant mise en production** : remplacer `origin: "*"` par l'URL exacte du frontend.

7. **Tester les deux types de financement** : `location_maintenance` et `achat` ont des formules de calcul differentes (prix mensuel vs prix achat = step2 * 0.6). Toute modification de prix doit etre testee dans les deux modes.

8. **Preserver les index uniques Mongoose** : `codeProduit` (Pitch), `email` (Agent), `months` (LeasingDuration, LeaseurRate), `productCode` (OtherProductSize) — la suppression d'un index unique peut creer des doublons corrompant la logique metier.

### Recommandations prioritaires

- Ajouter de l'auth (requireAgentAuth ou requireAdmin) sur toutes les routes de creation/modification/suppression
- Supprimer ou proteger la route `/password/reset-direct` (permet de changer n'importe quel mot de passe sans verification)
- Deplacer les mots de passe hardcodes vers des variables d'environnement uniquement
- Dedupliquer App.css (supprimer la moitie dupliquee)
- Extraire les sous-modules de agents.js (auth, devis, pdf, cgv, admin) dans des fichiers separes
