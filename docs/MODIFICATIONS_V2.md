# MODIFICATIONS V2

---

## Section 1 - EXPLICATION SIMPLE

### Ce qui a change pour l'agent normal

1. **Filtre "Tous" par defaut** : le menu deroulant des categories de pitch affiche maintenant "Tous" en premiere option, et c'est selectionne par defaut. L'agent voit d'emblee toutes les categories et tous les pitches. Il peut filtrer en selectionnant une categorie specifique, ou revenir a "Tous".

2. **Titres de categories en gras** : dans la liste des pitches a cocher, les noms de groupes (ex: "Exterieur haute luminosite") sont maintenant en gras pour mieux les distinguer des pitches individuels.

3. **Tailles en premier dans "Autres produits"** : quand l'agent selectionne un produit comme "Kiosques LCD", les checkboxes de tailles (43 pouces, 55 pouces) apparaissent maintenant juste apres le nom du produit, avant l'abonnement et le type de financement. C'est plus logique : on choisit d'abord ce qu'on veut, puis on configure.

4. **Case "Mode projet"** : elle n'est plus visible pour les agents (meme avec le role "responsable"). Elle est reservee aux administrateurs connectes via /adminmedia4/.

### Ce qui a change pour l'admin

1. **Case "Mode projet"** : elle n'est plus basee sur le role de l'agent, mais sur la presence du token admin dans le navigateur. Pour la voir, l'admin doit :
   - Se connecter via `/adminmedia4/` (stocke le token `admin_token_v1` dans localStorage)
   - Puis naviguer vers `/agent/home` dans le meme navigateur
   - La case apparait alors a cote de "Dimensions :"
   - Les deux sessions (admin + agent) coexistent dans le meme localStorage

### Ce qui reste identique

- Toute la logique de calcul (computePitchQuote, buildLinesAndTotals, applyApport)
- La generation du PDF
- Le backend (aucun fichier serveur touche)
- Les modifications precedentes (fleches par multiples du cabinet, labels "metre", labels "mm")
- Le formulaire client, finition, fixation, financement
- La page "Mes devis"

---

## Section 2 - FICHIERS MODIFIES

### Cle localStorage admin trouvee dans AdminApp.jsx

```
AdminApp.jsx ligne 10 : const ADMIN_TOKEN_KEY = "admin_token_v1";
AdminApp.jsx ligne 131 : localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
```

La cle est `admin_token_v1`. Elle est posee apres un POST reussi vers `/api/agents/admin/login`.

---

### Fichier 1 : `client/src/pages/agent/AgentHome.jsx`

#### Correction 1 — Detection admin pour "Mode projet"

**AVANT** (lignes 108-112) :
```js
const [modeProjet, setModeProjet] = useState(false);
const isAdminOrResponsable = useMemo(() => {
  const r = String(agent?.role || "").toLowerCase();
  return ["admin", "superadmin", "responsable"].includes(r);
}, [agent]);
```

**APRES** :
```js
const [modeProjet, setModeProjet] = useState(false);
const hasAdminToken = useMemo(() => !!localStorage.getItem("admin_token_v1"), [agent]);
```

Et dans le JSX, `isAdminOrResponsable` remplace par `hasAdminToken` (1 occurrence, dans la section Dimensions).

#### Changement 2 — Option "Tous" dans le dropdown categories

**AVANT** (select des categories) :
```jsx
value={selectedCategoryId}
onChange={(e) => {
  setSelectedCategoryId(e.target.value);
  setShowAllPitches(false);
}}
>
  {loadingCategories ? <option value="">Chargement...</option> : null}
  {categories.map((c) => (
    <option key={c._id} value={c._id}>{c.name}</option>
  ))}
</select>
```

**APRES** :
```jsx
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
>
  {loadingCategories ? <option value="">Chargement...</option> : null}
  <option value="__all__">Tous</option>
  {categories.map((c) => (
    <option key={c._id} value={c._id}>{c.name}</option>
  ))}
</select>
```

Le `showAllPitches` etait deja `true` par defaut (ligne 100), donc au chargement le dropdown affiche "Tous" et toutes les categories sont visibles.

#### Changement 3 — Titres categories en gras

**AVANT** :
```jsx
<div className="agenthome-pitchGroupTitle">
  {cat?.name || "Catégorie"}
</div>
```

**APRES** :
```jsx
<div className="agenthome-pitchGroupTitle" style={{ fontWeight: 700 }}>
  {cat?.name || "Catégorie"}
</div>
```

#### Ce qui n'a PAS ete touche dans AgentHome.jsx

| Element | Statut |
|---------|--------|
| Fleches par multiples du cabinet | INTACT |
| Labels "Largeur (metre)" et "Hauteur (metre)" | INTACT |
| Labels "mm" dans l'affichage des pitches | INTACT |
| parseCabinetDimensions (helpers) | INTACT |
| computePitchQuote | INTACT |
| buildLinesAndTotals (backend) | INTACT |
| Formulaire client | INTACT |
| Finition, fixation, financement | INTACT |
| Recap totaux + validation devis | INTACT |

---

### Fichier 2 : `client/src/pages/agent/AgentOtherProductsBlock.jsx`

#### Changement 4 — Tailles remontees en premier

**AVANT** (ordre d'affichage dans le JSX) :
1. Titre "Choisissez la taille" + nom du produit
2. Abonnement
3. Type de financement
4. Duree de leasing + Options
5. **Tailles (checkboxes 43 pouces, 55 pouces)**
6. Tailles selectionnees (details)

**APRES** :
1. Titre "Choisissez la taille" + nom du produit
2. **Tailles (checkboxes 43 pouces, 55 pouces)**
3. Abonnement
4. Type de financement
5. Duree de leasing + Options
6. Tailles selectionnees (details)

Le bloc de tailles (checkboxes) a ete deplace juste apres le nom du produit. Le code est identique, seul l'emplacement dans le JSX a change. Aucune logique modifiee.

#### Ce qui n'a PAS ete touche dans AgentOtherProductsBlock.jsx

| Element | Statut |
|---------|--------|
| computeOtherLine() | INTACT |
| toggleOtherSize() | INTACT |
| updateOtherSize() | INTACT |
| setOtherLeasingMonths() | INTACT |
| setOtherTypeFinancement() | INTACT |
| Bloc "Tailles selectionnees" (memoire, prix, quantite) | INTACT |
| Options de financement | INTACT |
| Abonnement | INTACT |

---

### Fichier 3 : `client/src/pages/AdminApp.jsx`

**LECTURE SEULE** — aucune modification. Utilise uniquement pour confirmer la cle `admin_token_v1`.

---

## Section 3 - GUIDE DE TEST

### Test Correction 1 : Case "Mode projet" visible uniquement pour admin

**Test 1a — Agent normal ne voit pas la case**
- Ou : se connecter sur `/agent/login` avec un compte agent (role "agent")
- Quoi faire : selectionner Murs leds, cocher un pitch, regarder la section "Dimensions :"
- Ce qu'on doit voir si c'est bon : pas de case "Mode projet", fleches presentes
- Ce qu'on doit voir si c'est casse : case "Mode projet" visible

**Test 1b — Agent "responsable" ne voit pas la case**
- Ou : se connecter avec un compte dont le role est "responsable"
- Quoi faire : meme chose
- Ce qu'on doit voir si c'est bon : pas de case "Mode projet"
- Ce qu'on doit voir si c'est casse : case visible (ancien comportement base sur le role)

**Test 1c — Admin voit la case**
- Ou : d'abord se connecter sur `/adminmedia4/` (mot de passe admin), puis ouvrir `/agent/home` dans le meme navigateur (nouvel onglet)
- Quoi faire : selectionner Murs leds, cocher un pitch
- Ce qu'on doit voir si c'est bon : case "Mode projet" visible a cote de "Dimensions :"
- Verification supplementaire : ouvrir la console navigateur, taper `localStorage.getItem("admin_token_v1")` — doit retourner un token JWT

**Test 1d — Admin deconnecte ne voit plus la case**
- Quoi faire : se deconnecter de `/adminmedia4/` (bouton "Deconnexion"), puis recharger `/agent/home`
- Ce qu'on doit voir si c'est bon : case "Mode projet" disparait

---

### Test Changement 2 : Filtre "Tous" par defaut

**Test 2a — Au chargement**
- Ou : `/agent/home`, section Murs leds
- Ce qu'on doit voir si c'est bon : le dropdown affiche "Tous", toutes les categories et tous les pitches sont visibles
- Ce qu'on doit voir si c'est casse : le dropdown affiche une categorie specifique, ou la liste est vide

**Test 2b — Filtrer une categorie**
- Quoi faire : changer le dropdown sur "Exterieur haute luminosite"
- Ce qu'on doit voir si c'est bon : seuls les pitches de cette categorie s'affichent, le titre de categorie apparait au-dessus
- Ce qu'on doit voir si c'est casse : tous les pitches restent visibles, ou liste vide

**Test 2c — Revenir a "Tous"**
- Quoi faire : remettre le dropdown sur "Tous"
- Ce qu'on doit voir si c'est bon : toutes les categories reapparaissent avec leurs pitches
- Ce qu'on doit voir si c'est casse : page blanche ou erreur console

---

### Test Changement 3 : Titres de categories en gras

**Test 3a — Verification visuelle**
- Ou : `/agent/home`, section Murs leds, dropdown sur "Tous"
- Ce qu'on doit voir si c'est bon : les noms de categories (ex: "Exterieur haute luminosite", "Interieur ou vitrine interieure") sont en gras, les noms de pitches individuels ne sont pas en gras
- Ce qu'on doit voir si c'est casse : tous les textes au meme poids, ou le gras est sur les pitches au lieu des categories

---

### Test Changement 4 : Tailles en premier dans "Autres produits"

**Test 4a — Ordre visuel**
- Ou : `/agent/home`, cocher un produit autre que "Murs leds" (ex: "Kiosques LCD")
- Ce qu'on doit voir si c'est bon : sous le nom du produit, on voit immediatement les checkboxes de tailles (43 pouces, 55 pouces), puis l'abonnement, puis le type de financement, puis la duree de leasing
- Ce qu'on doit voir si c'est casse : l'abonnement ou le type de financement apparait avant les tailles

**Test 4b — Fonctionnement des tailles**
- Quoi faire : cocher "55 pouces"
- Ce qu'on doit voir si c'est bon : la taille se coche, le bloc "Tailles selectionnees" apparait en bas avec memoire et prix
- Ce qu'on doit voir si c'est casse : rien ne se passe au clic, ou erreur console

**Test 4c — Changement de duree**
- Quoi faire : changer la duree de leasing dans le dropdown
- Ce qu'on doit voir si c'est bon : les tailles changent (prix different par duree), les selections precedentes restent si la duree a des produits configures
- Ce qu'on doit voir si c'est casse : les tailles disparaissent ou le prix ne change pas
