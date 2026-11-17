# COMMON.md - Patterns et Commandes Partages

Ce fichier centralise les elements repetes dans les definitions de commandes et agents Claude Code. Les agents et commandes doivent referencer ce fichier plutot que de dupliquer ces informations.

> **Objectif** : Eliminer la duplication a travers les commandes et agents.

---

## 0. Interactions avec l'utilisateur (OBLIGATOIRE)

Toute question, confirmation, validation ou choix attendu de l'utilisateur — dans une commande
(`/start-session`, `/end-session`, `/backlog`, `/milestone`, `/context-audit`...) comme dans `/init-project` —
est pose via l'outil **`AskUserQuestion`**, jamais en texte dans le chat (pas de liste numerotee, `[O/n]`,
`(o/n)`, `[1/2/3]`, « Attendre la reponse »). 2 a 4 options avec label court + description, defaut marque
« (Recommande) », jusqu'a 4 questions groupees par appel, saisie libre via « Autre ». Les blocs de texte
des commandes decrivent le **contenu** des questions, pas leur format d'affichage. Un agent qui n'est pas
le teamleader remonte sa question au teamleader (`TEAMMATES_PROTOCOL.md`), qui la pose.

**Validation d'un livrable** (document, fichier, maquette, plan, rapport, PR, page publiee...) : le **chemin
complet** (ou l'URL cliquable) de chaque livrable a valider figure **dans le texte de la question elle-meme** —
jamais « voir le fichier genere » ni un lien donne seulement plus haut dans le chat. L'utilisateur ne doit ni
chercher le livrable, ni avoir a le demander.

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

Déplacé dans `context/VERSIONING.md` (même numérotation, sections 5.x) — à lire seulement quand c'est utile.

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
> tierces, dépendances) — celles-ci ciblent `main` par convention GitHub, hors cycle milestone ;
> et de `/init-project` (init et synchronisation), qui publie ses propres commits sur `main` hors cycle
> (section « 7. Publication sur `main` » de `init-project.md` — jamais de merge de la branche milestone).
> Cette exception inclut sa propre resynchronisation de la branche milestone active si besoin
> (voir `agents/pr-reviewer.md` Phase D). Pour le cas normal (cycle milestone) — voir
> `agents/deploy.md` Tache PUBLISH PROD étape 2 pour la commande exacte (`git merge --no-ff`,
> qui préserve l'historique detaillé de la branche milestone, condition necessaire au
> nettoyage des branches sans perte de `agents/deploy.md` Tache DEPLOY PROD Étape 6). Ne pas
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
- [ ] PAS de push par les agents dev/review/qa — ils travaillent sur le meme clone local ;
      le premier push des commits dev vers origin est fait par le CDP quand les issues passent `DONE`
      (QA valide, Phase 4) : il declenche la CI de validation ; CI verte → issues fermees (milestone avec lots : push apres la validation QUALIF du lot, GATE LOT)
      (voir `commands/context/GITHUB.md` section 8.2). Jamais avant
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
- [ ] Branches residuelles (milestone + PR `MERGED`) : supprimees en local ET en remote une fois le succes
      confirme (le tag est l'ancrage de rollback, pas la branche — voir `agents/deploy.md` Etape 6)
```

---

## 8. Nettoyage

### 8.0 Confinement dans le projet (OBLIGATOIRE)

Jamais de worktree, dossier ou fichier de travail hors du dossier du projet (`../`, `~/`, chemin absolu hors du repo).
Worktree git → `.claude/worktrees/<nom>` ; temporaire utile au projet → `_work/tmp/` (gitignore) ; temporaire **non
vital** (jetable, lu par personne d'autre, sans contenu prive) → `/tmp` autorise (`mktemp -d /tmp/<projet>-<agent>-XXXX`).
Les supprimer en fin de tache. Regle complete : `agents/context/COMMON.md` « Confinement des Fichiers de Travail ».
Element prive durable (jamais commite, hors `.env`/`<env>.env`) → `PRIVATE/GLOBAL/` ou `PRIVATE/<ENV>/`
(gitignore, partage par les worktrees, jamais copie ni purge) — voir section « Éléments privés » de `CLAUDE.md`.

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

Le routage vers les agents DEV se fait selon les fichiers impactes et le type de modification. Les criteres sont ceux du projet : role de chaque agent (table « Agents Disponibles » de `CLAUDE.md`), perimetre `paths` du registre (`agents.registry[]` de `.claude/project-config.json`) et section `## Perimetre` du compagnon `dev-*.md`. Le planner s'en sert pour assigner les taches.

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

- **Modèle et effort** : chaque agent (teamleader compris) a un `model:` et un `effort:` dans le frontmatter de son
  `xxx.template.md` — c'est la valeur par défaut du template. Le compagnon `xxx.md` peut commencer par un frontmatter
  ne contenant que `model:` et/ou `effort:` pour les **surcharger** (toute autre clé y est ignorée) ; une spécification
  `generic.<nom>.md` peut en porter un de la même façon pour son instance. Résolution et application au spawn :
  `agents/context/MODEL_EFFORT.md` section 7. Pour le teamleader, les valeurs résolues sont écrites par
  `/init-project` dans `.claude/settings.json` (`model`, `effortLevel`) — ne pas les éditer là : modifier le compagnon
  `teamleader.md` puis relancer `/init-project` (mises à jour).

---

## 14. Maquettes

Déplacé dans `context/MOCKUPS.md` (même numérotation, sections 14.x) — à lire seulement quand c'est utile.

---

## 15. Plan de Tests

Déplacé dans `context/TEST_PLAN.md` (même numérotation, sections 15.x) — à lire seulement quand c'est utile.

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
