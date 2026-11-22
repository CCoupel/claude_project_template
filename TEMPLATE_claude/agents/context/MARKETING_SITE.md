# MARKETING_SITE.md — Livrable 4 du marketing : site marketing

> Extrait de `agents/marketing-release.md` section « Livrables » (titre conservé : « 4. Site Marketing »). À lire
> **seulement si le projet a un site marketing** (worktree `MARKETING/`, branche `gh-pages`) et que la tâche le touche.

### 4. Site Marketing

Le site marketing est **la regle, pas l'exception** : sauf ordre explicite du teamleader (`SANS SITE`, issu de
`marketing.site: false` dans `project-config.json`), un projet livre a un site. Detection : voir
PREPARE etape 2b. Site existant (branche `gh-pages`) → le mettre a jour ; aucun site →
**initialisation** (sous-section ci-dessous). Le site est bilingue (FR/EN) avec un commutateur de langue.

**Site existant : la maquette presentee au GATE 4d doit toujours partir de la page marketing
existante** — recuperer le contenu actuellement publie avant de produire quoi que ce soit, et faire
evoluer cette base plutot que regenerer le site depuis zero. L'utilisateur valide une evolution du
site existant, pas une refonte.

Cette maquette est **ephemere** (`context/MOCKUPS.md` section 14.8) : systematique a chaque release, elle
est l'apercu Artifact construit depuis `MARKETING/index.html` (fichier du worktree `gh-pages`, modifie mais
non commite tant que `PUBLISH` n'a pas eu lieu) ; elle n'est jamais commitee dans `docs/mockup/` (reserve aux maquettes projet)
ni indexee.

#### Initialisation du site (aucun site existant)

Declenchee quand PREPARE etape 2b ne trouve aucun site et que le teamleader n'a pas dit `SANS SITE`. Tu ne
generes pas le site « a l'aveugle » : tu **alertes le teamleader** et tu lui fournis, dans un rapport
`_work/reports/marketing-cadrage-[timestamp].md` :

1. **Constat** : aucun site trouve (emplacement verifie : branche `gh-pages`) → c'est une
   initialisation, pas une mise a jour.
2. **Maquette proposee** : apercu Artifact d'un site complet (sections obligatoires ci-dessous), construit
   depuis ce que tu peux deduire du projet (`docs/CADRAGE.md` s'il existe, `README.md`, `CHANGELOG.md`,
   description GitHub, milestone).
   Tout ce qui est deduit et non confirme est marque **« hypothese a confirmer »** dans la maquette.
   Version courante et badges « Nouveau » de cette release visibles (voir "Apercu de validation").
3. **Questions de cadrage** — poser uniquement celles dont la reponse ne peut pas etre deduite, en
   proposant a chaque fois ta valeur par defaut :
   - **Site souhaite ?** (oui / non — non = ne plus jamais proposer de site pour ce projet)
   - **Public cible** et **probleme principal** resolu
   - **Proposition de valeur** en une phrase + 3 benefices cles
   - **Identite** : nom affiche, logo, couleurs, ton (voir Regles de Ton), tutoiement/vouvoiement
   - **Sections** : Problematiques, Solutions, Architecture (obligatoires) + souhaitees (demo, roadmap, FAQ,
     contact, telechargement, tarifs...)
   - **Visuels disponibles** (captures, logo, video) — sinon placeholders (voir "Placeholders images")
   - **Appel a l'action principal** et liens (depot, releases, documentation)
   - **Langues** (FR/EN par defaut) et **URL** (branche `gh-pages` — emplacement non negociable ; seule la
     question du domaine personnalise se pose)
   - **References** : sites dont s'inspirer

Puis envoyer, au **format unique** de `context/TEAMMATES_PROTOCOL.md` (4 questions maximum par message —
les plus structurantes d'abord, le reste dans un `MARKETING BLOQUE` suivant) :
```
SendMessage({ to: "team-lead", content: "MARKETING BLOQUE
Raison : aucun site marketing — cadrage necessaire
Rapport : _work/reports/marketing-cadrage-[timestamp].md
Questions :
Q1 — [question de cadrage fermee ?]
  - [label court] (Recommandé) : [consequence]
  - [label court] : [consequence]
Q2 — ..." })
```
et repasser IDLE. **Chaque point de cadrage est une question fermee** (2 a 4 options avec leur consequence,
defaut « (Recommandé) »), y compris la decouverte (probleme principal resolu : proposer 2-4 hypotheses deduites
du projet ; l'utilisateur precise via « Autre »). Le rapport ne porte que le contexte detaille (maquette,
hypotheses). Le teamleader les convertit en `AskUserQuestion` (GATE 4e) et te renvoie
`PREPARE vX.Y.Z — cadrage : [reponses]`. Les reponses validees sont consignees dans
`MARKETING/CADRAGE.md` (public cible, proposition de valeur, identite, sections, liens) — commite sur
`gh-pages` avec le site au `PUBLISH` — et servent de reference aux releases suivantes (mise a jour, pas nouveau cadrage).

Le contenu de reference est celui du **distant** (`origin`), jamais une copie locale
potentiellement perimee :
```bash
git fetch origin gh-pages
git show origin/gh-pages:index.html   # ou le chemin equivalent si structure differente
```
Dans le worktree `MARKETING/`, `git -C MARKETING pull --ff-only origin gh-pages` avant lecture pour etre
sur l'etat le plus recent.

#### Emplacement du site — `MARKETING/` = worktree de `gh-pages`

**Regle : le site vit uniquement sur la branche `gh-pages`. Il n'est jamais commite sur la branche de code
(`main`, `milestone/*`, `hotfix/*`).** `MARKETING/` n'est pas un dossier de la branche de code ni une
publication de `main` : c'est le **worktree git de `gh-pages`**, ignore par la branche de code
(`.gitignore`). Ses chemins (`MARKETING/index.html`, `MARKETING/CADRAGE.md`) sont la racine de `gh-pages`.

Cycle de vie, avant `PREPARE` (etape 2b) :
```bash
if [ ! -e MARKETING/.git ]; then
  git fetch origin gh-pages 2>/dev/null
  if git show-ref --verify --quiet refs/remotes/origin/gh-pages; then
    git worktree add MARKETING gh-pages 2>/dev/null \
      || git worktree add -B gh-pages MARKETING origin/gh-pages   # branche locale absente
  else
    git worktree add --orphan -b gh-pages MARKETING              # initialisation : gh-pages n'existe pas encore
  fi
fi
git check-ignore -q MARKETING/ || echo "MARKETING/" >> .git/info/exclude   # garde-fou local si .gitignore pas a jour
git -C MARKETING pull --ff-only origin gh-pages 2>/dev/null || true
```
- `MARKETING/` suivi par la branche de code (`git ls-files MARKETING | head -1` non vide) → **ne rien
  commiter** : envoyer `MARKETING BLOQUE — MARKETING/ est suivi sur la branche de code (doublon avec gh-pages) :
  lancer /init-project (migration) ou git rm -r --cached MARKETING/` au teamleader.
- `PREPARE` ecrit dans le worktree sans commiter ; `PUBLISH` commit + push depuis le worktree (voir tache `PUBLISH`).
- **Ne jamais commiter `MARKETING/` sur la branche de code.**

#### Structure du site

Racine de `gh-pages`, vue via le worktree `MARKETING/` :

```
MARKETING/                  # = racine de gh-pages
├── CADRAGE.md              # Cadrage valide a l'initialisation (public, valeur, identite, sections, liens) — lu a chaque PREPARE
├── index.html              # Page principale (FR par defaut)
├── assets/
│   ├── style.css           # Styles communs
│   ├── lang.js             # Gestion commutateur FR/EN
│   ├── badges.js           # Calcul couleur/suppression des badges "Nouveau vX.Y.Z"
│   └── architecture.svg    # Diagramme d'architecture (si disponible)
└── locales/
    ├── fr.json             # Textes FR
    └── en.json             # Textes EN
```

#### Commutateur de langue

Ajouter dans le `<header>` un toggle visible sur toutes les sections :

```html
<div class="lang-switcher">
  <button class="lang-btn active" data-lang="fr">FR</button>
  <span>|</span>
  <button class="lang-btn" data-lang="en">EN</button>
</div>
```

Le fichier `lang.js` charge le fichier JSON correspondant et remplace tous les
elements portant l'attribut `data-i18n="cle"` par la valeur traduite.

#### Sections obligatoires

**Section 1 — Problematiques** (`id="problems"`)

Decrire les problemes concrets que le projet resout, de facon accessible :
- Contexte et situation actuelle
- Pain points identifies (liste illustree avec icones)
- Public cible concerne

**Section 2 — Solutions** (`id="solutions"`)

Presenter les reponses apportees par le projet :
- Correspondance probleme → solution (avant/apres)
- Benefices mesurables (gain de temps, securite, fiabilite...)
- Fonctionnalites cles de la version courante

**Section 3 — Architecture** (`id="architecture"`)

Expliquer l'architecture de facon visuelle :
- Diagramme ASCII ou SVG de l'architecture globale
- Description des composants principaux et de leurs interactions
- Stack technique (langage, protocoles, bases de donnees...)
- Contraintes ou pre-requis materiels si applicable (ex : microcontroleur)

**Section 4 — Deploiement** (`id="deployment"`)

Couvrir les 3 scenarios de deploiement :

##### 4a. Depuis les sources (Linux / macOS / Windows)
```bash
# Cloner le depot
git clone https://github.com/{ORG}/{PROJECT}.git
cd {PROJECT}

# Installer les dependances
<commande specifique au projet>

# Configurer
cp config.example.yml config.yml
# Editer config.yml selon votre environnement

# Lancer
<commande de demarrage>
```

##### 4b. Depuis les releases binaires

| Plateforme | Package | Commande d'installation |
|------------|---------|------------------------|
| Windows | `.exe` (installer) | Double-cliquer sur l'installeur |
| Linux (Debian/Ubuntu) | `.deb` | `sudo dpkg -i {project}_X.Y.Z.deb` |
| Linux (RHEL/Fedora) | `.rpm` | `sudo rpm -i {project}-X.Y.Z.rpm` |
| macOS | `.dmg` ou `.pkg` | Ouvrir et suivre l'installeur |

Indiquer l'URL de la page GitHub Releases : `https://github.com/{ORG}/{PROJECT}/releases`

##### 4c. Configuration

Documenter les parametres essentiels apres installation :

```yaml
# config.yml — parametres principaux
# Commenter chaque cle avec sa valeur par defaut et son role
parametre_1: valeur_defaut   # Description
parametre_2: valeur_defaut   # Description
```

- Lister les variables d'environnement si applicable (`.env`)
- Indiquer les ports par defaut et comment les changer
- Documenter les permissions systeme necessaires si applicable

#### Mise a jour du site existant

Si le site existe deja :
- Mettre a jour le numero de version affiche dans le header
- Ajouter la fonctionnalite majeure de la version dans la section Solutions
- Ajouter une entree dans la section Releases/Changelog si elle existe
- Verifier que les commandes de deploiement sont toujours valides
- Si cette release introduit un **nouvel element** (nouvelle fonctionnalite — quel que soit le
  chiffre bumpe : X, Y ou Z) : poser un badge sur cet element (voir "Badges de nouveaute"
  ci-dessous) — jamais sur une simple amelioration ou correction d'un element existant

#### Badges de nouveaute

Un element marquant du site (une carte fonctionnalite, ex. "RAFALE", "Roue de la Fortune") peut
porter un badge `Nouveau vX.Y.Z` qui vieillit avec les releases suivantes — **sans jamais etre
republie pour cette seule raison**.

**Regle de pose — une seule fois par element, jamais modifiee ensuite :**
- Un badge est pose sur un element **quand cet element apparait pour la premiere fois**, dans
  n'importe quelle release qui introduit une nouvelle fonctionnalite : nouveau X (ex. RAFALE en
  `v8.0.0`, Roue de la Fortune en `v9.0.0`) **comme nouveau Y** (ex. un nouvel element en `v8.1.0`
  recoit `data-badge-version="v8.1.0"`). La version inscrite dans le badge
  (`data-badge-version`) est **figee** a cette version de premiere apparition et **n'est plus
  jamais modifiee** ensuite, meme si l'element recoit plus tard de nouvelles ameliorations
  (ex. RAFALE enrichi en `v8.2.0` : le badge reste `v8.0.0`).
- Une release sans nouvel element (corrections, ameliorations d'elements existants) ne pose aucun
  badge et ne modifie aucun badge existant.
- **Heritage du statut** : le statut d'un badge ne depend que du **X** de sa version. Un element
  introduit en `v8.1.0` a donc **le meme statut que `v8.0.0`** : tant que le site est en X = 8, les
  deux sont orange « Nouveau » ; des que le site passe en X = 9, les deux passent bleu ; en X = 10,
  les deux sont retires. Aucun traitement particulier par Y/Z.

**Regle de couleur — recalculee a l'affichage, jamais par republication dediee :**

La couleur/visibilite depend uniquement de l'ecart entre le X du badge (extrait de sa version
figee `vX.Y.Z` — Y et Z sont ignores) et le X de la version courante du site (`CURRENT_MAJOR`,
dans le `<meta>` du header) :

| Ecart (X courant − X du badge) | Etat |
|---|---|
| 0 | 🟠 orange — `Nouveau vX.Y.Z` |
| 1 | 🔵 bleu — `vX.Y.Z` |
| ≥ 2 | retire (badge masque) |

Ce calcul se fait **cote client** (JS, au chargement de la page) — jamais recalcule ni reecrit
par l'agent a chaque republication : il suffit que `CURRENT_MAJOR` soit a jour pour que tous
les badges se recolorent automatiquement, y compris ceux qui n'ont pas ete touches depuis
plusieurs releases. **Consequence directe : ne jamais republier le site uniquement pour faire
vieillir un badge** — meme si des badges existants auraient techniquement change d'etat, un
`RIEN A PUBLIER` (Tache PREPARE, etape 2) reste un arret net. Le recalcul est un pur
sous-produit de la prochaine republication motivee par du contenu reel.

**Implementation :**
```html
<!-- Dans le header, version courante -->
<meta name="current-major" content="8">

<!-- Sur un element marquant, pose une seule fois a sa creation -->
<span class="badge" data-badge-version="v8.0.0">Nouveau v8.0.0</span>
```
```javascript
// assets/badges.js
const CURRENT_MAJOR = parseInt(document.querySelector('meta[name="current-major"]').content, 10);
document.querySelectorAll('[data-badge-version]').forEach(el => {
  const badgeMajor = parseInt(el.dataset.badgeVersion.match(/^v(\d+)/)[1], 10);
  const diff = CURRENT_MAJOR - badgeMajor;
  if (diff >= 2) { el.remove(); return; }
  el.classList.toggle('badge-orange', diff === 0);
  el.classList.toggle('badge-blue', diff === 1);
  el.textContent = diff === 0 ? `Nouveau ${el.dataset.badgeVersion}` : el.dataset.badgeVersion;
});
```

**Ce que l'agent fait a chaque republication reelle du site :**
1. Mettre a jour `<meta name="current-major">` avec le X de la version deployee.
2. Pour **chaque nouvel element** introduit par cette release (X, Y ou Z) : ajouter
   `data-badge-version="v<version deployee sans a>"` (ex. `v8.1.0`) sur cet element. Plusieurs
   elements nouveaux dans la meme release portent la meme version de badge.
3. Ne **jamais** toucher aux `data-badge-version` des badges existants — le JS s'occupe seul de
   leur couleur/suppression a l'affichage, a partir du seul `CURRENT_MAJOR`.

#### Placeholders images

Tout visuel non disponible (capture d'ecran, photo, diagramme non fourni) est remplace par un
placeholder SVG inline leger — jamais par une reference vers un fichier inexistant, jamais omis
en silence :
```html
<svg viewBox="0 0 800 450" role="img" aria-label="Capture — Interface Admin">
  <rect width="800" height="450" fill="#e5e7eb"/>
  <text x="400" y="225" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#6b7280">
    [Capture a ajouter — Interface Admin]
  </text>
</svg>
```
Objectif double : (1) la page reste utilisable et honnete en attendant les vrais assets fournis
par l'utilisateur, (2) elle reste legere — un placeholder SVG pese quelques centaines d'octets
contre potentiellement plusieurs Mo pour une vraie capture encodee en base64, ce qui compte pour
l'apercu Artifact ci-dessous (limite 16 Mo). `architecture.svg` suit la meme regle : un
placeholder si le diagramme reel n'existe pas encore.

#### Apercu de validation (Artifact)

A chaque generation ou mise a jour du site (PREPARE initial ou re-PREPARE apres corrections),
publier systematiquement un apercu visuel complet de la page pour que l'utilisateur valide **le
rendu**, pas seulement un resume texte :

1. Charger la skill `artifact-design` avant de publier (calibrage du soin visuel).
2. Construire le contenu de l'apercu a partir de `MARKETING/index.html` **sans** les balises
   `<!DOCTYPE>`, `<html>`, `<head>`, `<body>` (le skeleton Artifact les fournit automatiquement)
   — conserver `<title>` et `<style>` en tete du fichier.
3. Publier via l'outil Artifact (favicon a choisir une fois, jamais changer ensuite). Sur un
   re-PREPARE (corrections), republier sur le **meme chemin de fichier** pour mettre a jour la
   meme URL plutot que d'en creer une nouvelle.
4. L'apercu doit rendre **visible la version mise en evidence** : version courante dans le header,
   section de la release, et **chaque badge « Nouveau » pose par cette release** (avec sa version et
   son etat — orange/bleu — tel que calcule par `badges.js`). Lister ces badges dans le rapport.
5. Inclure l'URL de l'artifact dans le rapport `_work/reports/marketing-[timestamp].md` — c'est
   ce lien que le teamleader relaie a l'utilisateur au GATE 4d pour la validation globale.

**Repli si l'outil Artifact est indisponible ou refuse la publication** : ne jamais demander de
validation sans apercu. Ecrire l'apercu dans un fichier HTML autonome `_work/marketing/preview.html`
(ouvrable localement) et envoyer `MARKETING BLOQUE — apercu Artifact impossible : [raison] — apercu local :
_work/marketing/preview.html` au teamleader, qui le presente a l'utilisateur au GATE 4d (le GATE reste obligatoire).
Apercu local : favicon 📣 inline + bandeau haut orange `#d9822b` (`context/MOCKUPS.md` 14.3, « Identification de l'onglet »).

Cet apercu est un outil de validation uniquement — le fichier reel `MARKETING/index.html`
(document complet, racine de `gh-pages`) reste la seule source publiee lors de `PUBLISH`.
