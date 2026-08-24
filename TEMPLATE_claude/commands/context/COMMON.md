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
| a | Compteur de build QUALIF, gere exclusivement par `deploy`. Les agents `dev-*` ne le touchent jamais. Jamais visible en prod. |

`X.Y.Z` est fixe integralement par le titre du milestone GitHub actif — voir 5.7. Le milestone est la SEULE source de verite pour ces 3 segments ; aucun agent ne les recalcule ni ne les incremente au fil de l'eau. `a` est le seul segment qui bouge pendant le cycle : simple compteur de build, independant des commits dev, incremente uniquement par `deploy` a chaque build QUALIF.

### 5.3 Cycle de Vie de la Version

| Evenement | Effet |
|-----------|-------|
| Creation du milestone (`/milestone new vX.Y[.Z]`) | Le titre fixe `X.Y.Z` pour tout le cycle — logique complete de validation en 5.7 |
| Ouverture du cycle (1er commit sur la branche rattachee au milestone) | `{VERSION_FILE}` -> `X.Y.Z.0` (version du milestone, `a=0`) |
| Deploiement QUALIF (avant build) | `a+1` — a la charge de `deploy`, commit dedie `chore(version): Bump to X.Y.Z.a+1`. Seul declencheur de `a` : garantit un artefact unique par deploiement, meme sans nouveau commit dev entre deux deploiements. Le dossier non gitte `build/qualif_vX.Y.Z/` (sans `a`), toujours a la racine du repo — meme en monorepo, jamais sous un sous-repertoire backend — reste le meme entre deux builds ; c'est le nom de l'artefact a l'interieur (`app-X.Y.Z.a.tar.gz`) qui change (voir `deploy.template.md`) |
| Promotion dev -> prod | `a` est supprime — la version livree est exactement `X.Y.Z`, telle que fixee par le milestone. Aucun calcul. |

> Les commits dev ordinaires (`feat`, `fix`, `refactor`...) ne touchent jamais `{VERSION_FILE}`. `a` s'incremente uniquement au fil des deploiements QUALIF — plusieurs commits dev peuvent donc s'accumuler sous le meme `a`, et `a` peut s'incrementer plusieurs fois sans aucun nouveau commit dev entre deux deploiements (ex: redeploiement suite a un correctif infra hors code). C'est le comportement attendu.

### 5.4 Regle d'Or — Tout Developpement Rattache a un Milestone

- Il n'existe plus de cycle de developpement hors milestone : toute issue travaillee doit etre associee a un milestone `OPEN`.
- **Un seul milestone est en developpement a la fois.** BUGFIX/HOTFIX sans reference explicite
  rejoignent le milestone actif s'il existe (commit direct sur sa branche `milestone/vX.Y.Z`,
  aucune creation) — voir `commands/hotfix.md` et `context/CDP_WORKFLOWS.md` Phase Clarification
  etape 3c.
- **Bug remonte pendant un milestone en cours** : le fix est integre normalement (commit sans toucher `{VERSION_FILE}`), `X.Y.Z` ne bouge pas. Le prochain deploiement QUALIF incremente `a` automatiquement.
- **Bugfix/hotfix urgent solitaire, aucun milestone actif** : le milestone cible `X.Y.Z+1` (Z+1 par rapport a la derniere version prod livree) est cree automatiquement, sans intervention manuelle prealable — voir `commands/hotfix.md`.
- **Aucune livraison partielle** : la branche milestone part toujours en bloc au deploiement PROD (urgence ou non) — pas de sous-branche par issue, donc pas de cherry-pick propre. Seules les issues **non commencees** (aucun commit) sont reportables sans impact vers le milestone suivant ; celles deja en chantier doivent etre finalisees et validees avant de shipper (voir `context/CDP_WORKFLOWS.md`, Regle "Aucune Livraison Partielle").
- **Une version prod deja depassee n'est jamais repatchee** — le fix cible toujours la ligne prod courante, jamais une ancienne.

### 5.5 Exemple

```
Milestone v1.4.0 cree (X=1, Y=4, Z=0)
1.4.0.0                                (ouverture du cycle)
1.4.0.1                                (1er deploiement QUALIF — a+1 par deploy)
1.4.0.2                                (redeploiement QUALIF apres correctif — a+1 par deploy)
1.4.0                                  (promotion prod — a supprime, version livree = milestone exact)

Milestone v1.4.1 cree (bugfix solitaire urgent, Z+1 auto)
1.4.1.0 -> 1.4.1.1                     (1 deploiement QUALIF)
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

**A la promotion dev -> prod (`/deploy prod`)** :
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
> `agents/deploy.md` Workflow PROD étape 2 pour la commande exacte (`git merge --no-ff`,
> qui préserve l'historique detaillé de la branche milestone, condition necessaire au
> nettoyage remote sans perte de `agents/deploy.md` Étape 8). Ne pas dupliquer cette
> commande ici — la source unique de vérité est `agents/deploy.md`, pour éviter toute
> nouvelle dérive entre les deux fichiers.

### 6.4 Tag et Release

> Seul `deployer` cree le tag de release — voir `agents/deploy.md` Workflow PROD étape 3
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
/feature -> CLARIFICATION -> PLAN -> DEV -> REVIEW -> QA -> DOC -> DEPLOY(QUALIF) -> DEPLOY(PROD)
```

### 9.2 Workflow Bugfix

```
/bugfix -> CLARIFICATION -> ANALYSE -> DEV -> REVIEW -> QA -> DEPLOY(QUALIF)
```

### 9.3 Workflow Hotfix (Urgence)

```
/hotfix -> DEV -> QA -> DEPLOY(PROD)
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
