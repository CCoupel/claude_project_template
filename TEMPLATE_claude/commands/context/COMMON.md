# COMMON.md - Patterns et Commandes Partages

Ce fichier centralise les elements repetes dans les definitions de commandes et agents Claude Code. Les agents et commandes doivent referencer ce fichier plutot que de dupliquer ces informations.

> **Objectif** : Eliminer la duplication a travers les commandes et agents.

---

## 1. Contexte Projet

**A utiliser dans tous les agents et commandes au lieu de repeter ces informations.**

```yaml
Projet: {PROJECT_NAME}
Repository: {REPO_URL}

Structure:
  Source: {SRC_DIR}
  Config version: {VERSION_FILE}
  Backlog: GitHub Issues (gh issue list)
  Documentation: docs/

Branches:
  Production: main
  Milestone (dev/qualif): milestone/vX.Y.Z — accueille tout le travail FEATURE/BUGFIX/HOTFIX/
    REFACTOR du cycle (un seul milestone en developpement a la fois), mergee sur main
    uniquement au deploiement PROD du milestone
```

---

## 2. Commandes de Build

### 2.1 Build Complet

```bash
{BUILD_CMD}
```

### 2.2 Validation du Build

```bash
{BUILD_VALIDATE_CMD}
```

---

## 3. Controle du Serveur

### 3.1 Arret Gracieux

> **REGLE** : Toujours utiliser la methode d'arret prevue, jamais de kill force.

```bash
{SERVER_STOP_CMD}
```

### 3.2 Sequence Redemarrage Complete

```bash
{SERVER_RESTART_CMD}
```

### 3.3 Verification Post-Demarrage

```bash
{SERVER_VERIFY_CMD}
```

---

## 4. Commandes de Test

### 4.1 Tests Unitaires

```bash
{TEST_CMD}
```

### 4.2 Rapport de Couverture

```bash
{COVERAGE_CMD}
```

---

## 5. Gestion des Versions

### 5.1 Fichiers de Version

| Fichier | Champ | Usage |
|---------|-------|-------|
| `{VERSION_FILE}` | `"version"` | Source de verite |

### 5.2 Format et Regles de Versionnement

```
Format dev/qualif : X.Y.Z.a
Format prod       : X.Y.Z   (le "a" n'est jamais publie en prod)
```

| Segment | Role |
|---------|------|
| X | Compatibilite des donnees (DB, fichiers). Fixe par le titre du milestone. |
| Y | Compteur de milestone/livraison. Fixe par le titre du milestone. |
| Z | Compteur de bugfix au sein de la ligne `X.Y`. Fixe par le titre du milestone. |
| a | Compteur de build, gere exclusivement par `deploy` (tache BUILD — agnostique a l'environnement). Les agents `dev-*` ne le touchent jamais. Jamais visible en prod. |

`X.Y.Z` est fixe integralement par le titre du milestone GitHub actif — voir 5.7. Le milestone est la SEULE source de verite pour ces 3 segments ; aucun agent ne les recalcule ni ne les incremente au fil de l'eau. `a` est le seul segment qui bouge pendant le cycle : simple compteur de build, independant des commits dev, incremente uniquement par `deploy` a chaque BUILD.

### 5.3 Cycle de Vie de la Version

| Evenement | Effet |
|-----------|-------|
| Creation du milestone (`/milestone new vX.Y[.Z]`) | Le titre fixe `X.Y.Z` pour tout le cycle — logique complete de validation en 5.7 |
| Ouverture du cycle (1er commit sur la branche rattachee au milestone) | `{VERSION_FILE}` -> `X.Y.Z.0` (version du milestone, `a=0`) |
| BUILD (avant PUBLISH QUALIF) | `a+1` — a la charge de `deploy`, commit dedie `chore(version): Bump to X.Y.Z.a+1`. Seul declencheur de `a` : garantit un artefact unique par build, meme sans nouveau commit dev entre deux builds. Le dossier non gitte `build/candidate_vX.Y.Z/` (sans `a`), toujours a la racine du repo — meme en monorepo, jamais sous un sous-repertoire backend — reste le meme entre deux builds ; c'est le nom de l'artefact a l'interieur (`app-X.Y.Z.a.tar.gz`) qui change. PUBLISH QUALIF promeut ensuite ce candidat vers `build/qualif_vX.Y.Z/` sans le reconstruire (voir `deploy.template.md`) |
| Promotion dev -> prod (`/publish prod`) | `a` est supprime — la version livree est exactement `X.Y.Z`, telle que fixee par le milestone. Aucun calcul. |

> Les commits dev ordinaires (`feat`, `fix`, `refactor`...) ne touchent jamais `{VERSION_FILE}`. `a` s'incremente uniquement au fil des BUILD — plusieurs commits dev peuvent donc s'accumuler sous le meme `a`, et `a` peut s'incrementer plusieurs fois sans aucun nouveau commit dev entre deux builds (ex: rebuild suite a un correctif infra hors code). C'est le comportement attendu.

### 5.4 Regle d'Or — Tout Developpement Rattache a un Milestone

- Il n'existe plus de cycle de developpement hors milestone : toute issue travaillee doit etre associee a un milestone `OPEN`.
- **Un seul milestone est en developpement a la fois.** BUGFIX/HOTFIX sans reference explicite
  rejoignent le milestone actif s'il existe (commit direct sur sa branche `milestone/vX.Y.Z`,
  aucune creation) — voir `commands/hotfix.md` et `context/CDP_WORKFLOWS.md` Phase Clarification
  etape 3c.
- **Bug remonte pendant un milestone en cours** : le fix est integre normalement (commit sans toucher `{VERSION_FILE}`), `X.Y.Z` ne bouge pas. Le prochain BUILD incremente `a` automatiquement.
- **Bugfix/hotfix urgent solitaire, aucun milestone actif** : le milestone cible `X.Y.Z+1` (Z+1 par rapport a la derniere version prod livree) est cree automatiquement, sans intervention manuelle prealable — voir `commands/hotfix.md`.
- **Aucune livraison partielle** : la branche milestone part toujours en bloc au deploiement PROD (urgence ou non) — pas de sous-branche par issue, donc pas de cherry-pick propre. Seules les issues **non commencees** (aucun commit) sont reportables sans impact vers le milestone suivant ; celles deja en chantier doivent etre finalisees et validees avant de shipper (voir `context/CDP_WORKFLOWS.md`, Regle "Aucune Livraison Partielle").
- **Une version prod deja depassee n'est jamais repatchee** — le fix cible toujours la ligne prod courante, jamais une ancienne.

### 5.5 Exemple

```
Milestone v1.4.0 cree (X=1, Y=4, Z=0)
1.4.0.0                                (ouverture du cycle)
1.4.0.1                                (1er build — a+1 par deploy)
1.4.0.2                                (rebuild apres correctif — a+1 par deploy)
1.4.0                                  (promotion prod — a supprime, version livree = milestone exact)

Milestone v1.4.1 cree (bugfix solitaire urgent, Z+1 auto)
1.4.1.0 -> 1.4.1.1                     (1 build)
1.4.1                                  (promotion prod)

Milestone v1.5.0 cree (nouvelle feature planifiee)
1.5.0.0 -> 1.5.0.1
1.5.0                                  (promotion prod)
```

### 5.6 Lire la Version

```bash
{VERSION_READ_CMD}
```

### 5.7 Le Milestone comme Source Unique de la Version

Le titre du milestone (`vX.Y.Z` ou `vX.Y.Z — <nom>`, cree par `/milestone new`) fixe integralement la version qui sera livree a la fin du cycle — aucun calcul arithmetique, aucune deduction en fin de course. Le nom apres " — " est purement descriptif (ex: `v1.4.0 — Authentification OAuth2`) : il ne participe a aucune comparaison ni calcul. Toute lecture/comparaison de version porte exclusivement sur le **prefixe** `vX.Y.Z`, jamais sur le titre entier — deux milestones ne peuvent jamais partager le meme prefixe, quel que soit leur nom.

**A la creation (`/milestone new vX.Y[.Z]`)** :
- `X` et `Y` sont obligatoires dans l'argument. S'il en manque un, le demander explicitement avant de continuer (jamais de valeur par defaut, jamais de deduction).
- `Z` est optionnel : rechercher les tags/releases existants pour ce `X.Y`. S'il en existe, prendre le `Z` max trouve + 1 ; sinon `Z=0`.
- Un nom descriptif est ensuite propose en option (ex: "Authentification OAuth2"). S'il est fourni, le titre devient `vX.Y.Z — <nom>` ; sinon `vX.Y.Z` seul. Dans tous les cas le prefixe `vX.Y.Z` est complet — jamais de `Z` implicite.
- Verifier que le prefixe `vX.Y.Z` (complete) n'existe pas deja (ni tag, ni milestone dont le titre est `vX.Y.Z` ou commence par `vX.Y.Z — `) et qu'il est strictement posterieur a la derniere version livree.
- Verifier la coherence avec les labels des issues selectionnees pour ce milestone (mapping labels -> segment, voir `context/GITHUB.md` section 8.3) : avertissement **non-bloquant** si le segment incremente ne correspond pas a la nature des issues (ex: issue `breaking` incluse mais seul `Z` a bouge) — jamais de blocage si l'utilisateur confirme.
- Cette verification labels <-> version se recalcule aussi a chaque ajout d'issue en cours de cycle (`gh issue edit --milestone`), sur l'ensemble des issues **actuellement** associees (jamais en delta par issue ajoutee) — pour rester idempotente et ne pas re-alerter plusieurs fois pour le meme type d'ecart.
- Le titre devient ensuite la reference unique de la version cible pour tout le cycle — il ne change plus, y compris son nom descriptif (voir `commands/milestone.md` Mode NEW).

**A l'ouverture du cycle** :
- `{VERSION_FILE}` est positionne sur `X.Y.Z.0` (version du milestone, `a=0`).

**A la promotion dev -> prod (`/publish prod`)** :
- `a` est supprime de `{VERSION_FILE}`. La version livree est exactement `X.Y.Z` — aucun recalcul, aucune branche conditionnelle.

**A la cloture du milestone (apres deploy PROD reussi)** :
- La description du milestone est completee une seule fois avec la version effectivement livree (ex: `Release vX.Y.Z — livre, tag vX.Y.Z`). Ecriture ponctuelle a la cloture — la description ne suit jamais l'etat dev en direct, `{VERSION_FILE}` reste la seule source vivante de cet etat.

---

## 6. Operations Git

### 6.1 Creation/Reutilisation de la Branche Milestone

> On ne travaille jamais directement sur `main`. FEATURE/BUGFIX/HOTFIX/REFACTOR commitent tous
> directement sur la branche du milestone actif (pas de sous-branche par cycle) — checkout si
> elle existe deja, creation depuis `main` sinon. Un seul milestone est en developpement a la
> fois (section 5.4) — HOTFIX/BUGFIX sans reference explicite rejoignent ce milestone actif
> s'il existe, sinon un milestone dedie est cree automatiquement.
>
> Commande executee par le CDP a chaque cycle — voir `context/CDP_WORKFLOWS.md` Phase Init
> (Git) pour la sequence exacte. Ne pas dupliquer ici, meme raison qu'en 6.3/6.4.

### 6.2 Commit Atomique (Style)

```bash
# Format du message
<type>(<scope>): <description courte>

# Types valides
feat:     Nouvelle fonctionnalite
fix:      Correction de bug
docs:     Documentation uniquement
chore:    Maintenance, config
refactor: Refactoring sans changement fonctionnel
test:     Ajout/modification de tests
style:    Formatage, pas de changement de code
perf:     Amelioration de performance
```

### 6.3 Merge vers main (PROD)

> Seul `deployer` merge vers `main` (aucun autre agent ne push dessus), **à l'exception
> documentée** de `agents/pr-reviewer.md` pour les Pull Requests externes (contributions
> tierces, dépendances) — celles-ci ciblent `main` par convention GitHub, hors cycle milestone.
> Cette exception inclut sa propre resynchronisation de la branche milestone active si besoin
> (voir `agents/pr-reviewer.md` Phase D). Pour le cas normal (cycle milestone) — voir
> `agents/deploy.md` Tache PUBLISH PROD étape 2 pour la commande exacte (`git merge --no-ff`,
> qui préserve l'historique detaillé de la branche milestone, condition necessaire au
> nettoyage remote sans perte de `agents/deploy.md` Tache DEPLOY PROD Étape 6). Ne pas
> dupliquer cette commande ici — la source unique de vérité est `agents/deploy.md`, pour
> éviter toute nouvelle dérive entre les deux fichiers.

### 6.4 Tag et Release

> Seul `deployer` cree le tag de release — voir `agents/deploy.md` Tache PUBLISH PROD étape 3
> pour la commande exacte. Ne pas dupliquer ici, pour la meme raison qu'en 6.3.

---

## 7. Checklists Communes

### 7.1 Checklist Fin de Session DEV

```markdown
- [ ] Code compile sans erreur
- [ ] Tests unitaires passes
- [ ] Version `X.Y.Z` inchangee (fixee par le milestone, jamais editee manuellement) ; `a` non touche (reserve a `deploy`)
- [ ] Commits atomiques avec messages clairs, en local
- [ ] Pas de fichiers temporaires
- [ ] PAS de push — tous les agents (dev, review, qa) travaillent sur le meme clone local ;
      le premier push des commits dev vers origin a lieu au prochain deploiement QUALIF
      (voir `agents/deploy.md` Workflow QUALIF etape 2), jamais avant
```

### 7.2 Checklist Pre-QUALIF

```markdown
- [ ] Build complet reussi
- [ ] Tests 100% passes (0 FAIL)
- [ ] Serveur redemarre et operationnel
- [ ] Version correspond au fichier de config
```

### 7.3 Checklist Pre-PROD

```markdown
- [ ] QUALIF validee
- [ ] Review code approuvee
- [ ] CHANGELOG.md mis a jour
- [ ] Documentation mis a jour (si nouvelles features)
- [ ] Version promue (`a` supprime — version livree = `X.Y.Z` du milestone, voir section 5.3)
- [ ] Build reussi
```

### 7.4 Checklist Post-PROD

```markdown
- [ ] Merge vers main effectue
- [ ] Tag Git cree et pushe
- [ ] Release creee avec artefacts
- [ ] Branche milestone : copie locale conservee, copie distante supprimee une fois le succes
      confirme (le tag est l'ancrage de rollback, pas la branche — voir `agents/deploy.md` Etape 8)
```

---

## 8. Nettoyage

### 8.1 Fichiers Temporaires a Supprimer

```bash
# Fichiers de developpement
rm -f *.bak test-report.txt test-summary.txt
# Fichiers de couverture
rm -f coverage.out coverage.html
```

---

## 9. Patterns de Workflow

### 9.1 Workflow Feature

```
/feature -> CLARIFICATION -> PLAN -> DEV -> [REVIEW ∥ QA] -> DOC -> [BUILD -> PUBLISH(QUALIF) -> DEPLOY(QUALIF)] ∥ NR complete -> PUBLISH(PROD) -> DEPLOY(PROD)
```

### 9.2 Workflow Bugfix

```
/bugfix -> CLARIFICATION -> ANALYSE -> TEST(reproduction) -> RED CHECK -> DEV -> [REVIEW ∥ QA] -> [BUILD -> PUBLISH(QUALIF) -> DEPLOY(QUALIF)] ∥ NR complete
```

### 9.3 Workflow Hotfix (Urgence)

```
/hotfix -> TEST(reproduction) -> DEV -> [REVIEW rapide ∥ QA critique] -> BUILD -> PUBLISH(PROD) -> DEPLOY(PROD) -> NR complete (arriere-plan)
```

---

## 10. Dispatch Automatique

### 10.1 Criteres de Routage

Le routage vers les agents DEV se fait selon les fichiers impactes et le type de modification. Chaque projet definit ses propres criteres dans `context/PROJECT_CONTEXT.md`.

### 10.2 Ordre d'Execution

- **Sequentiel** (Backend -> Frontend) : Si nouvelles APIs, modeles, ou protocoles
- **Parallele** : Si modifications isolees sans dependances

---

## 11. Reference Rapide

### Fichiers Cles

| Fichier | Role |
|---------|------|
| `{VERSION_FILE}` | Version (source de verite) |
| `CHANGELOG.md` | Historique des versions |
| `CLAUDE.md` | Documentation projet |

---

## 12. Mots-Cles Reserves (Controle de Workflow)

Les commandes CDP (`/feature`, `/bugfix`, `/hotfix`, `/refactor`) reconnaissent des mots-cles speciaux pour interroger ou reprendre un workflow.

### 12.1 Mots-Cles Disponibles

| Mot-cle | Description | Exemple |
|---------|-------------|---------|
| `help` | Affiche l'aide et les mots-cles disponibles | `/feature help` |
| `status` | Affiche l'etat actuel du workflow | `/feature status` |
| `plan` | Affiche le plan sans executer | `/feature plan` |
| `resume <phase>` | Reprend a une phase specifique | `/feature resume qa` |
| `skip <phase>` | Saute une phase | `/feature skip review` |
| `jumpto <tache>` | Demarre a une tache precise du plan | `/feature jumpto "Creer endpoint API"` |

### 12.2 Phases Valides pour resume/skip

```
init -> clarification -> plan -> dev -> review -> qa -> doc -> deploy
```

### 12.3 Comportement par Mot-Cle

**`help`** :
```markdown
## /[commande] - Aide

**Description** : [Description du workflow]

**Usage** :
  /[commande] <description>           Lancer le workflow
  /[commande] help                    Afficher cette aide
  /[commande] status                  Etat du workflow en cours
  /[commande] plan                    Afficher le plan
  /[commande] resume <phase>          Reprendre a une phase
  /[commande] skip <phase>            Sauter une phase
  /[commande] jumpto <tache>          Aller a une tache precise

**Phases** : init -> clarification -> plan -> dev -> review -> qa -> doc -> deploy
```

**`status`** :
```markdown
## Etat du Workflow

**Type** : [TYPE]
**Phase actuelle** : [PHASE] ([N]/[Total])
**Taches** : [N]/[Total] completees
**Prochaine etape** : [Description]
```

**`plan`** :
```markdown
## Plan d'Implementation

- [x] Phase 1 : Init (branche creee)
- [x] Phase 2 : Plan valide
- [ ] Phase 3 : DEV <- en cours
- [ ] Phase 4 : REVIEW
- [ ] Phase 5 : QA
- [ ] Phase 6 : DOC
- [ ] Phase 7 : DEPLOY
```

**`resume <phase>`** :
- Verifie que les phases precedentes sont completes
- Si non, propose de completer ou forcer
- Reprend l'execution a la phase specifiee

**`skip <phase>`** :
- Marque la phase comme "skippee"
- Continue a la phase suivante
- Note dans le rapport final

**`jumpto <tache>`** :
- Recherche la tache par nom (fuzzy match)
- Positionne le workflow a cette tache
- Affiche contexte pour confirmation

### 12.4 Detection Automatique

Le premier mot de `$ARGUMENTS` est verifie contre cette liste. Si match :
- Extraire le mot-cle et les parametres
- Executer l'action correspondante
- Ne PAS lancer le workflow normal

```
$ARGUMENTS = "help"             -> Action: afficher aide commande
$ARGUMENTS = "status"           -> Action: afficher etat
$ARGUMENTS = "resume dev"       -> Action: reprendre a DEV
$ARGUMENTS = "jumpto API test"  -> Action: chercher tache "API test"
$ARGUMENTS = "Ajouter mode X"  -> Action: workflow normal (pas de mot-cle)
```

---

## 13. Adaptations Projet

- **Commandes** (`xxx.md`) : gérées par le template, jamais éditées directement — écrasées à chaque sync, sans compagnon.
- **Agents** : pattern `xxx.template.md` (sync, jamais édité) + `xxx.md` compagnon optionnel (tracké git, jamais écrasé, adaptations projet).
- **Fichiers `context/`** (`context/COMMON.md`, `context/GITHUB.md`, etc., référencés par les commandes et les agents) suivent exactement le même pattern que les agents : `context/X.template.md` (sync, jamais édité) + `context/X.md` compagnon optionnel (tracké git, jamais écrasé). Une référence "voir `context/COMMON.md`" dans une commande ou un agent désigne le concept logique — elle se résout en lisant `context/COMMON.template.md` puis `context/COMMON.md` compagnon s'il existe, les règles projet primant sur les règles génériques en cas de conflit.

Pour personnaliser le comportement d'une commande ou d'un agent au niveau de règles partagées, créer/éditer le compagnon `context/X.md` correspondant — jamais `context/X.template.md`.

---

## 14. Maquettes

Les maquettes font partie de la **définition du projet**. Une maquette validée est un livrable durable, conservé et versionné avec le code.

### 14.1 Quand une maquette est obligatoire

| Changement | Maquette |
|------------|----------|
| Toute modification visible d'une interface (ajout, retrait, changement d'aspect ou de comportement) | **Obligatoire** — maquette visuelle (`ui`) |
| Machine à états impactée | Obligatoire (`conception`) |
| Changement d'architecture (composants, flux, déploiement) | Obligatoire (`architecture`) |
| Bugfix ou refactoring sans effet visible ni structurel | Aucune |

Le planner tranche et justifie en une ligne quand il n'en produit pas.

### 14.2 Emplacement et nommage

Chemin configurable : `docs.mockup_dir` dans `project-config.json` (défaut `docs/mockup`).

```
docs/mockup/
├── INDEX.md                                 # maquettes actives / obsolètes (tenu par le CDP)
├── DECISIONS.md                             # contraintes de conception retenues (voir 14.5)
└── v<X.Y.Z>/                                # milestone en développement
    ├── ui/admin_nav_bar__compaction.html
    ├── architecture/deploy_pipeline__build_publish_deploy.md
    └── conception/session_state__reconnexion.md
```

- `v<X.Y.Z>` : le milestone en cours (`milestone/vX.Y.Z`). Un hotfix rattaché à un milestone y dépose ses maquettes. Si le milestone est renuméroté, le dossier suit (`git mv`).
- `<type>` : `ui`, `architecture` ou `conception`.
- Fichier : `<composant>__<feature>.<ext>` — **double underscore** entre composant et feature (chacun peut contenir des `_`). Pas de version dans le nom du fichier.

### 14.3 Format

| Type | Format |
|------|--------|
| `ui` | HTML autonome : CSS/JS inline, images en data-URI, aucune ressource externe (pas de CDN, pas de police distante) |
| Machine à états, architecture | Mermaid (`.md` avec bloc ```` ```mermaid ````) |
| Autre cas | Le format **le plus autonome, indépendant et diffable** possible. Pour toute maquette textuelle, le **`.md` est préféré**. Un format binaire est accepté dans tous les cas **s'il n'existe aucune autre solution** (le SVG, textuel, reste préférable à un binaire) |

**Une maquette présente toujours le composant dans son intégralité**, y compris les parties inchangées. Elle peut néanmoins ne porter que sur une partie d'un composant : dans ce cas elle **complète** les maquettes actives du même composant (voir 14.4).

**En-tête obligatoire** (commentaire HTML en tête de fichier, ou front-matter YAML pour `.md`) :

```
mockup:
  composant: admin_nav_bar
  feature: compaction
  version: 11.0.1
  type: ui
  issue: "#123"
  validee_le: 2026-09-25
  complete: []                # maquettes complétées (chemins) — les deux restent actives
  remplace: []                # maquettes remplacées (chemins) — les anciennes deviennent obsolètes
```

### 14.4 Cycle de vie et immuabilité

1. **Brouillon** : produit par le planner dans `_work/mockup/` (non commité).
2. **Validation** (GATE 2) : après accord explicite de l'utilisateur, le CDP copie la maquette à son emplacement définitif, la commite sur la branche du milestone et met à jour `INDEX.md`.
3. **Immuable** : une maquette validée n'est **jamais modifiée**. Une évolution ultérieure crée une nouvelle maquette (dans le milestone courant) qui référence les précédentes via `complete` ou `remplace`.
4. **Obsolescence** : quand une maquette en `remplace` une autre, le CDP déplace l'ancienne de la table « Actives » vers la table « Obsolètes » de `INDEX.md`, avec la référence de la remplaçante. Le fichier reste dans git.
5. **Brouillons rejetés ou modifiés** : jamais conservés. Seules les **raisons** sont conservées (voir 14.5).

**`INDEX.md`** (tenu exclusivement par le CDP) :

```markdown
## Actives
| Composant | Feature | Fichier | Version | Relation |
|-----------|---------|---------|---------|----------|
| admin_nav_bar | compaction | v11.0.1/ui/admin_nav_bar__compaction.html | 11.0.1 | complète v10.2.0/ui/admin_nav_bar__base.html |

## Obsolètes
| Fichier | Remplacée par | Version |
|---------|---------------|---------|
```

**Conflit intra-milestone** : si deux features du même milestone maquettent le même composant, le CDP le détecte à l'ajout dans `INDEX.md` et arbitre avec l'utilisateur avant d'enregistrer.

### 14.5 Conservation des raisons de refus (`DECISIONS.md`)

Quand l'utilisateur refuse ou fait modifier une maquette, le CDP **reformule ses retours en contraintes durables** (pas en historique de brouillons) et les ajoute à `DECISIONS.md`, par composant :

```markdown
## admin_nav_bar
- Pas de bleu pour ce composant. _(v11.0.1, compaction)_
- Taille de l'icône supérieure à 24px. _(v11.0.1, compaction)_
```

Exemple : retour « je ne veux pas cette couleur et fais plus gros » → contraintes « pas de bleu » et « taille > 24px ». Une contrainte levée ou remplacée par l'utilisateur est mise à jour, avec la date.

### 14.6 Rôle de chaque agent

| Agent | Règle |
|-------|-------|
| **planner** | Lit `INDEX.md` et `DECISIONS.md` **avant** de dessiner ; part des maquettes actives du composant comme base ; respecte toutes les contraintes de `DECISIONS.md` ; produit le brouillon dans `_work/mockup/` |
| **CDP** | Présente au GATE 2 ; à la validation, commite, met à jour `INDEX.md` (actives/obsolètes) ; à chaque refus, met à jour `DECISIONS.md` ; arbitre les conflits |
| **test-writer** | Dérive les scénarios de toutes les maquettes actives des composants touchés |
| **qa** | Vérifie la conformité à **toutes** les maquettes actives des composants touchés et aux contraintes de `DECISIONS.md`, pas seulement à celle de la feature |

### 14.7 Projets sans maquette de référence

Un projet existant n'a pas de maquette pour ses composants. Le planner dessine directement le nouvel état. Si cela aide à cadrer l'existant, le CDP peut demander à l'utilisateur une **capture d'écran de référence** (ou une maquette de l'état actuel) avant de continuer.

### 14.8 Maquettes marketing — éphémères

Les maquettes marketing (GATE 4d) sont **distinctes** des maquettes projet : systématiques mais **éphémères**. Elles partent toujours de la page publiée en production (ou, à l'initialisation d'un site sans page existante, d'une proposition à cadrer avec l'utilisateur), prennent la forme d'un aperçu Artifact construit depuis `MARKETING/index.html` (non commité tant que `PUBLISH` n'a pas eu lieu), ne sont jamais dans `docs/mockup/` et ne sont ni indexées ni versionnées. Le flag `mockup_ok` du GATE 4d est inchangé.

---

## 15. Plan de Tests

Objectif : **ne jamais exécuter deux fois le même test sur le même code sans raison**, et séparer
les tests de la feature en cours des tests de non-régression (NR).

### 15.1 Deux natures de tests : l'arborescence porte l'identité, l'index porte l'état

**Arborescence (identité stable)** — les tests de **spécification** écrits par le `test-writer` sont rangés en
`<racine-famille>/<theme>/<lot>/<fichier>` :

| Niveau | `<famille>` (racine) | `<theme>` | `<lot>` |
|--------|----------------------|-----------|---------|
| Intégration | `tests/integration/` | domaine fonctionnel (`auth`, `paiement`, `export`…) | sous-ensemble cohérent du thème (`login`, `refresh-token`…) |
| E2E | `e2e/` (ou `tests/e2e/` — la racine imposée par le framework) | idem | idem |
| Procédures manuelles | `tests/procedures/` | idem | idem |

- `<theme>` et `<lot>` : kebab-case, noms parlants — le chemin se lit comme une documentation.
- **Un lot = au plus `testing.lot_max_tests` cas de test (défaut 50)**. Au-delà, le `test-writer` scinde le lot
  (`login` → `login-nominal`, `login-erreurs`). Un scénario `smoke` ou `critical` isolé va dans son propre lot.
- **Tests unitaires** : restent colocalisés avec le code (`*_test.go`, `*.test.ts`…) — hors arborescence
  ci-dessus. Leur « lot » est le paquet ou le dossier source.

**Index (état qui change)** — `tests/INDEX.md` (initialisé par `/init-project` ; le `test-writer` y ajoute ses lots,
le CDP change les statuts) ne porte **que ce que le chemin ne peut pas dire** : statut, tags, composant, feature.
Une ligne par **lot** (chemin se terminant par `/`) ; une ligne **fichier** n'existe que pour une exception
(ex. un test en `quarantaine` au sein d'un lot) et prime sur la ligne du lot :

```markdown
| Chemin | Niveau | Composant | Feature | Statut | Tags |
|--------|--------|-----------|---------|--------|------|
| tests/integration/auth/login/ | integration | auth | #220 | regression | critical |
| e2e/paiement/checkout/ | e2e | billing | #231 | feature | smoke |
| tests/integration/auth/login/expired_token_test.go | integration | auth | #220 | quarantaine | |
```

**Repli sans index** (projet initialisé avant cette convention, ou lot absent) : un lot sans ligne est traité au
statut `feature` (il est donc rejoué à chaque cycle — sens sûr) et le CDP crée sa ligne à la première promotion.
Les anciennes lignes « une par fichier » restent valides (le chemin peut être un fichier).

| Statut | Signification |
|--------|---------------|
| `feature` | Tests de la feature en cours (milestone en développement) |
| `regression` | Tests de features déjà livrées — **promus** par le CDP au déploiement PROD du milestone. Un test de reproduction de bugfix naît directement `regression` |
| `quarantaine` | Test en échec connu ou instable (raison + issue obligatoires). Il ne bloque pas le verdict mais reste listé dans chaque rapport QA |

Tags : `smoke` (rapide, valide qu'une version démarre), `critical` (scénarios vitaux, utilisés en hotfix),
`slow` (exclu de la boucle DEV rapide, toujours joué par QA).

**Propriété de l'écriture** : le `test-writer` écrit les tests de spécification (contrats, critères
d'acceptation, maquettes), les range par lot et alimente l'index (une ligne par lot). Les `dev-*` n'écrivent que des tests unitaires
**internes** (boîte blanche), dans des fichiers distincts, colocalisés avec le code, hors index.

### 15.2 Qui lance quoi, quand

| Étape | Agent | Ce qui est exécuté |
|-------|-------|--------------------|
| Boucle DEV | `dev-*` | build, lint, typecheck, puis uniquement les tests **feature** de leurs fichiers, hors tag `slow` (`commands.test_fast`, sinon `commands.test_targeted`) — **jamais** la suite complète |
| RED CHECK (bugfix) | `qa` | Le seul test de reproduction, sur le code **non corrigé** : il doit échouer (15.5) |
| QA — par cycle | `qa` | 1) suite **feature** complète (unit, integration, E2E, tags `slow` inclus) ; **si elle est KO → retour DEV immédiat, sans NR** ; 2) si OK, NR **impactées** (15.3) selon `testing.regression_at_qa` ; 3) conformité aux maquettes (§14) |
| NR complète | `qa` | Toute la suite (`commands.test` + E2E automatisés), au moment fixé par `testing.full_regression_at` (15.4) |
| BUILD | `deployer` | **Compilation seulement** (`commands.build`). Aucun test : ils ont déjà été joués par QA sur le même arbre |
| DEPLOY | `deployer` | Tests `smoke` de l'index (à défaut, `curl /health`) |
| GATE 4 | utilisateur | Procédures manuelles `tests/procedures/` (feature uniquement) |

Une passe de tests complète n'est **jamais** lancée par un `dev-*` ni par le `deployer`.

### 15.3 Sélection des NR impactées

Le diff du milestone est mappé sur les composants (`testing.components`, clé = composant, valeur = globs de
chemins source). Sont sélectionnés : (a) les lots (et tests) `regression` de l'index dont le composant est touché,
(b) les tests colocalisés des paquets/dossiers modifiés (résolus par `commands.test_targeted`, avec
`{TARGETS}` remplacé par la liste de fichiers ou dossiers). Un changement de contrat BREAKING ou CHANGED
sélectionne tous les tests des composants liés. Sans mapping ni `commands.test_targeted` : repli sur toute
la NR unitaire.

`testing.regression_at_qa` :
- `gated` (**défaut**) : NR impactées seulement si la suite feature est OK ;
- `parallel` : suite feature et NR impactées en même temps (plus rapide, plus d'exécutions perdues) ;
- `none` : aucune NR en QA — la NR complète (15.4) est alors la seule protection.

### 15.4 NR complète

`testing.full_regression_at` :
- `qualif` (**défaut**) : le CDP dispatche la NR complète à `qa` **en parallèle** de la chaîne
  BUILD → PUBLISH QUALIF → DEPLOY QUALIF et de DOC finalize. **GATE 4 ne s'ouvre que lorsque les trois sont
  terminés** et la NR VALIDATED : l'utilisateur n'est jamais invité à valider une QUALIF condamnée. NR KO → retour
  DEV sans solliciter l'utilisateur (compte comme un cycle) ;
- `build` : NR complète avant PUBLISH QUALIF, en parallèle de la compilation (PUBLISH attend les deux) ;
- `prod` : une seule NR avant PUBLISH PROD (`/deploy prod` refusé tant qu'elle n'est pas VALIDATED).

En **hotfix**, la NR complète tourne après le DEPLOY PROD, en arrière-plan sur `main` ; un échec ouvre une issue.

### 15.5 Bugfix : test rouge vérifié

Le `test-writer` livre le test de reproduction (statut `regression`) **avant** le DEV. Le CDP dispatche
alors `qa` en `Scope : red-check` : ce seul test est exécuté sur le code non corrigé et **doit échouer**. S'il
passe, il ne reproduit pas le bug : retour au `test-writer` (hors comptage de cycles). Après le fix, QA relance
ce test (doit passer) puis les NR du composant.

### 15.6 Journal d'exécution (réutilisation par arbre git)

`_work/tests-ledger.md` (append-only, non tracké) : `<tree-hash> | <scope> | <verdict> | <date>`, avec
`tree-hash = git rev-parse HEAD^{tree}` (working tree propre) ; le `<scope>` peut désigner un lot (`feature:integration/auth/login`). Avant d'exécuter un scope, `qa` cherche une ligne
VALIDATED pour le même arbre et le même scope : si elle existe, il **réutilise** le résultat (ex. redispatch après
un REVIEW REJECTED sans changement de code, ou NR complète déjà VALIDATED pour le mode `prod`).

### 15.7 Classement des échecs et métriques

Chaque test en échec du rapport QA reçoit une **nature** :

| Nature | Critère |
|--------|---------|
| `feature` | test au statut `feature` |
| `regression` | test au statut `regression` sur du code modifié par la feature |
| `quarantaine` | test déjà en quarantaine (n'impacte pas le verdict) |
| `environnement` | échec lié à la machine (port occupé, réseau, outil absent) — à confirmer par relance |
| `flaky` | passe à la relance — **une relance maximum**, puis passage en `quarantaine` dans l'index |

À chaque verdict QA, le CDP ajoute une ligne à `tests/METRICS.md` : date, milestone, feature, cycle, verdict,
nombre d'échecs par nature. Ce journal donne le **taux réel de retours dus à la régression** et permet de choisir
`regression_at_qa` et `full_regression_at` avec des chiffres.

### 15.8 Scopes optionnels

Le planner fixe `test_scopes` dans le plan : `perf` si un critère d'acceptation porte sur la performance
(seuils dans `testing.perf`), `security` si une préoccupation de `security.concerns` est touchée
(`commands.audit`). Sans mention, ces scopes ne sont pas joués. `lint` et `typecheck` sont joués par les
`dev-*` (boucle DEV) ; `audit` une fois par milestone, par QA, avant la NR complète.

### 15.9 Exécution par lot et progression

QA n'exécute jamais une famille de tests en un seul appel opaque quand elle compte plusieurs lots : il exécute
**lot par lot** (`commands.test_targeted`, `{TARGETS}` = le dossier du lot ; ordre : unitaires → intégration → E2E),
et **envoie un jalon au teamleader à la fin de chaque lot** :

```
QA EN COURS — lot 3/12 (integration/auth/login) — 148/612 tests, 2 KO
```

- Format : `lot i/N (<famille>/<theme>/<lot>)`, tests exécutés / total, nombre de KO cumulés. Les KO sont nommés
  dans le jalon dès qu'ils apparaissent (pas d'attente de la fin de suite).
- **Plancher** : sous ~100 tests au total, un seul lot (pas de découpage — le coût de démarrage dépasserait le gain).
- Le teamleader relaie chaque jalon à l'utilisateur en **une ligne** ; il peut ordonner l'arrêt du run si l'utilisateur
  le demande. Sans ordre d'arrêt, tous les lots sont joués : le rapport liste tous les échecs d'un coup.
- Le journal (15.6) est tenu **par lot** : un lot VALIDATED sur le même arbre git n'est pas rejoué.

---

## Usage

**Dans les commandes et agents**, au lieu de repeter le contexte projet :

```markdown
# Avant (repete N fois)
**Contexte projet :**
- Repertoire : ...
- Source : ...
- Config version : ...

# Apres (reference unique)
**Contexte projet :** Voir `context/COMMON.md` section 1
**Build :** Voir `context/COMMON.md` section 2
**Tests :** Voir `context/COMMON.md` section 4
```
