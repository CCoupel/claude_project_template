# CDP_WORKFLOWS.md - Workflows Orchestres par CDP

Ce fichier centralise les patterns partages par les commandes `/feature`, `/bugfix`, `/hotfix`, et `/refactor`.

---

## 1. Contexte CDP

```yaml
Agent: CDP (Chef De Projet)
Role: Orchestrer workflows multi-agents avec validation utilisateur
```

---

## 2. Workflows Disponibles

| Commande | Type | Workflow | Version |
|----------|------|----------|---------|
| `/feature` | FEATURE | Complet | Rattache a un milestone (nouveau ou existant) — `X.Y.Z` fixe par son titre |
| `/bugfix` | BUGFIX | Simplifie | Milestone actif -> integre au milestone, planifie en priorite par le planner, livre avec lui (commits normaux) ; sinon -> milestone `X.Y.Z+1` cree automatiquement |
| `/hotfix` | HOTFIX | Accelere | Milestone actif -> integre a celui-ci (commit direct sur sa branche) ; sinon -> milestone `X.Y.Z+1` dedie cree automatiquement |
| `/refactor` | REFACTOR | Leger | Rattache au milestone actif — aucun changement de version (`a` gere par `deployer` au prochain BUILD) |

---

## 2.bis Dispatch d'un Teammate

Les agents `socle` sont en IDLE depuis `/start-session` ; ceux de la team du milestone le sont depuis le GATE 2
(`agents/context/MILESTONE_CADRAGE.md` section 4). Dispatch = uniquement `SendMessage`. Avant de dispatcher une phase
dont le deroulement depend du cadrage (tests, review, QUALIF, doc), relire `cadrage` (MILESTONE_CADRAGE.md section 5).

**Destinataire absent** (perdu apres une coupure, jamais respawne, `SendMessage` en echec) alors qu'il fait partie de
l'effectif attendu (socle + `cadrage.team`) : le spawner (prompt de `commands/start-session.md` etape 4), attendre son
`ACTIF`, puis envoyer l'ordre (MILESTONE_CADRAGE.md 4.2). Teammates perdus annonces par Claude Code : respawner tout
l'effectif attendu, pas seulement les agents des taches en cours.

```
SendMessage({ to: "<nom>", content: "<tâche complète>" })
→ Attendre le DONE (Verdict + Conformité + références) — pas d'accusé de réception
```

Ordre de plus de 3 lignes : `Write` dans `_work/tasks/<agent>-<timestamp>.md`, puis `SendMessage` avec le chemin +
résumé d'une ligne (`TEAMMATES_PROTOCOL.md`, « Ordres du teamleader »).

Plusieurs en parallèle — même message :
```
SendMessage({ to: "dev-backend",  content: "<tâche>" })
SendMessage({ to: "dev-frontend", content: "<tâche>" })
```

### Agents par phase

| Phase | Agent(s) à dispatcher |
|-------|----------------------|
| Plan | `planner` |
| Dev — Backend seul | `dev-backend` |
| Dev — Frontend seul | `dev-frontend` |
| Dev — Les deux | `dev-backend` + `dev-frontend` (parallèle si indépendants) |
| Dev — instances multiples | chaque `dev-<cat>-<suffixe>` concerné, selon son périmètre (parallèle si périmètres disjoints) |
| Review | `code-reviewer` + `test-writer` (parallèle) |
| QA | `qa` — par défaut en parallèle de Review (voir `QUALITY.md` section 12), dès `test-writer` DONE |
| Doc | `doc-updater` |
| Build / Publish / Deploy QUALIF / PROD | `deployer` |

> Table du cadrage `complet`. Option du cadrage desactivee (`agents/context/MILESTONE_CADRAGE.md` section 5) → l'agent
> correspondant n'est pas dispatche (ni spawne) : `test_writer: false` (tests par les agents DEV), `review: false` (pas de
> `code-reviewer`), `doc: dev` (pas de `doc-updater`), `qualif: false` (BUILD seul avant le GATE 4).

---

## 3. Workflow Standard CDP

```
[INIT] -> [CLARIFICATION] -> [PLAN/ANALYSE] -> [DEV] -> [REVIEW ∥ QA] -> [DOC] -> [DEPLOY QUALIF ∥ NR complete] -> [FIN]
```

### Variantes par type

| Phase | FEATURE | BUGFIX | HOTFIX | REFACTOR |
|-------|---------|--------|--------|----------|
| Clarification | Oui | Oui | Non | Non |
| Backlog (GitHub Issues) | Oui | Si lié | Non | Non |
| Plan | Oui | Souvent | Non | Rarement |
| Dev | Complet | Cible | Minimal | Structure |
| Review | Oui | Oui | Rapide | Oui |
| QA | Feature + NR impactees | Reproduction (red check) + NR du composant | Critique (reproduction + smoke/critical) | NR du composant avant/apres |
| NR complete (`testing.full_regression_at`) | En parallele de QUALIF, condition du GATE 4 | Idem | Apres PROD, en arriere-plan | Idem feature |
| Doc | Oui | Si majeur | Post-mortem | Non |
| Build + Publish + Deploy QUALIF | Oui | Oui | Non — PROD uniquement, sans QUALIF | Oui |

---

## 4. Phase Clarification (FEATURE et BUGFIX uniquement)

### Objectif

Vérifier que la demande est suffisamment spécifiée **avant** de lancer le développement.
Si la spec est claire → passer directement à la phase suivante, sans poser de question.
Si des zones d'ombre existent → les lister et attendre la validation utilisateur (via `AskUserQuestion`).

### Algorithme

```
1. Lire $ARGUMENTS (description utilisateur)

2. Construire ISSUE_NUMS[] (issues à suivre tout au long du workflow) :
   a. Extraire les numéros explicites dans $ARGUMENTS (pattern #\d+) :
      pour chaque #N trouvé :
        gh issue view <N> --json number,title,body,labels,milestone
        → ajouter à ISSUE_NUMS[]
        → si l'issue est liée à un milestone → MILESTONE_NUM = ce milestone

   b. Rechercher les issues liées par mots-clés (si ISSUE_NUMS[] toujours vide) :
      gh issue list --search "<mots-clés>" --json number,title,body,labels,milestone
      → si résultats pertinents → ajouter les numéros à ISSUE_NUMS[]

3. Détecter et résoudre le milestone :
   a. Si "milestone:" ou un nom de milestone est mentionné dans $ARGUMENTS :
      gh api repos/{owner}/{repo}/milestones
      → identifier le milestone correspondant → MILESTONE_NUM

   b. Si MILESTONE_NUM détecté (via étape 2 ou 3a) :
      gh issue list --milestone "<title>" --state open \
        --json number,title,labels
      → ajouter toutes les issues ouvertes du milestone à ISSUE_NUMS[] (dédupliquer)

   c. Si MILESTONE_NUM toujours indéfini (BUGFIX/HOTFIX sans référence explicite) :
      → Chercher le milestone actuellement actif — au plus un milestone `OPEN` en développement
        à la fois (règle d'or, voir `context/VERSIONING.md` section 5.4) :
        gh api repos/{owner}/{repo}/milestones --jq '.[] | select(.state=="open")'
      → Un seul résultat → MILESTONE_NUM = ce milestone (BUGFIX/HOTFIX s'y intègre, aucune
        création, commit direct sur sa branche `milestone/vX.Y.Z`)
      → Aucun résultat → créer automatiquement le milestone cible `X.Y.Z+1` (Z+1 sur la
        dernière version prod livrée) en suivant la logique de `/milestone new`
        (`commands/milestone.md` Mode NEW, `context/VERSIONING.md` section 5.7) → MILESTONE_NUM
      → Plusieurs résultats (ne devrait pas arriver sous cette règle) → alerter l'utilisateur,
        demander lequel cibler
      → tout développement doit être rattaché à un milestone, aucun cycle hors milestone (section 5.4)

4. Persister dans workflow-state.json :
   issue_nums: ISSUE_NUMS[]
   milestone_num: MILESTONE_NUM (obligatoire, jamais null)

5. Évaluer la complétude de la spec (critères ci-dessous)

6. Décision :
   |-- Spec complète → continuer sans interruption
   |-- Gaps détectés → poser les questions via `AskUserQuestion`, attendre réponse utilisateur
                    → puis continuer avec la spec enrichie
```

### Critères de complétude

#### Pour FEATURE
| Critère | Complet si… |
|---------|-------------|
| Comportement attendu | Le résultat final est décrit sans ambiguïté |
| Critères d'acceptance | Au moins un critère testable est identifiable |
| Scope | Les limites (ce qui est dedans / dehors) sont claires |
| Edge cases | Les cas limites évidents sont couverts ou explicitement exclus |
| Dépendances | Les APIs, services ou composants tiers sont identifiés |

#### Pour BUGFIX
| Critère | Complet si… |
|---------|-------------|
| Comportement actuel | Le symptôme est décrit (message d'erreur, comportement observé) |
| Comportement attendu | Ce qui devrait se passer est clair |
| Reproductibilité | Les étapes ou conditions de déclenchement sont connues |
| Scope | Le fix est délimité (pas de refactoring implicite attendu) |

### Format de sortie si questions nécessaires

Présenter directement à l'utilisateur :

> Le bloc ci-dessous décrit le **contenu** des questions ; il est posé via l'outil `AskUserQuestion`
> (2-4 options par question, défaut « (Recommandé) ») — jamais affiché comme texte dans le chat.

```markdown
## Clarification requise avant de démarrer

J'ai analysé votre demande [+ issue #N si trouvée]. Avant de lancer le développement,
j'ai besoin de précisions sur les points suivants :

**1. [Titre du point ambigu]**
[Question ciblée et concise]

**2. [Titre du point ambigu]**
[Question ciblée et concise]

_Une fois ces points clarifiés, je lance immédiatement le workflow._
```

Attendre la réponse de l'`AskUserQuestion` avant de continuer.

### Format de sortie si spec complète

```markdown
✓ Spec suffisamment claire — lancement du workflow.
```

Enchaîner directement sur la phase suivante sans autre attente.

---

## 5. Phases Communes

### Labels GitHub — Suivi de Phase

> **Condition** : s'applique si `ISSUE_NUMS[]` est non vide (construit en CLARIFICATION).
> **Règle** : chaque transition de phase met à jour le label de **toutes** les issues suivies, **dès l'événement** (retour DONE/FAILED/BLOQUE d'un teammate ou validation d'un GATE), pas seulement à l'envoi de l'ordre suivant — l'état dit ce qui reste à faire (`GITHUB.md` §9.12). Un seul label
> actif à la fois par issue, **sauf** `EN REVIEW` + `EN QA` simultanés pendant la fenêtre de parallélisation
> Review/QA par défaut (voir `QUALITY.md` section 12) — les deux coexistent tant que REVIEW n'a pas rendu
> son verdict.

| Transition | Label à ajouter | Labels à retirer |
|------------|----------------|-----------------|
| Entrée Phase Plan (FEATURE) ; GATE 2 « Ajuster » / « Non » | `PLANNING` | `PRET`, `EN COURS`, `EN REVIEW`, `EN QA`, `PLAN A VALIDER`, `LOT A VALIDER`, `VALIDE`, `A PUBLIER`, `DONE` |
| Planner `DONE`, question GATE 2 posée | `PLAN A VALIDER` (avant la question) | `PLANNING` |
| GATE 2 validé (plan accepté, DEV pas encore lancé) | `PRET` | `PLANNING`, `PLAN A VALIDER` |
| Ordre DEV du lot (Phase Dev) | `EN COURS` | `PLANNING`, `PRET`, `EN REVIEW`, `EN QA`, `PLAN A VALIDER`, `LOT A VALIDER`, `VALIDE`, `A PUBLIER`, `DONE` |
| Retour Phase Dev (cycle REVIEW ou QA) | `EN COURS` | `EN REVIEW`, `EN QA` |
| Retour DEV `DONE` (entrée Phase Review) | `EN REVIEW` | `EN COURS`, `PLANNING`, `PRET`, `EN QA`, `DONE` |
| Entrée Phase QA — mode parallèle (`qa_parallelizable` != false, dès TEST-WRITER DONE) | `EN QA` | `EN COURS`, `PLANNING`, `PRET`, `DONE` (garder `EN REVIEW`) |
| Entrée Phase QA — mode séquentiel (après verdict Review positif) | `EN QA` | `EN REVIEW`, `EN COURS`, `PLANNING`, `PRET`, `DONE` |
| QA VALIDATED (et Review déjà approuvée) | `DONE` — puis push de la branche et CI | `EN QA`, `EN REVIEW`, `EN COURS`, `PLANNING`, `PRET` |
| Lot déployé en QUALIF, question GATE LOT posée (lot à issue `VALID-HUMAINE` ; lot auto-validé : aucune transition) | `LOT A VALIDER` (avant la question) | `DONE` |
| Issue validée au GATE LOT (avec lots) ; lot auto-validé : au push (`DONE` → `VALIDE`) | `VALIDE` — le push de la branche (lot entier) et la CI suivent quand **toutes** les issues du lot sont `VALIDE` | `LOT A VALIDER` (lot auto-validé : `DONE`) |
| GATE LOT refusé (validation partielle) | issues concernées : `EN COURS` (Cas A) / `PLANNING` (Cas B) ; autres issues du lot : `VALIDE` (elles attendent, pas de push partiel, le lot reste le lot courant) | `LOT A VALIDER` |
| Correctif du lot à risque de régression sur une issue `VALIDE` (décision du CDP d'après le diff et la ligne `Risque regression` de la QA) | `LOT A VALIDER` (avant le nouveau GATE LOT, limité aux issues revenues + celle-ci) | `VALIDE` |
| CI verte du lot (avec lots) | `DONE` (puis fermeture si `issues.close_on` = `ci`) | `VALIDE` |
| Question GATE 4 posée (`issues.close_on` = `validation`, issues encore ouvertes ; sinon : état du milestone seul) | `A PUBLIER` (avant la question) | `DONE` |
| CI verte sur la branche poussée | — (`issues.close_on` = `ci` : issues fermées, `DONE` conservé ; `validation` : issues laissées ouvertes jusqu'à la validation utilisateur) ; avec lots : lot suivant → `EN COURS` à son ordre DEV | — |
| CI non verte (rouge, orange, annulée) | `EN COURS` | `DONE`, `LOT A VALIDER`, `VALIDE`, `A PUBLIER` |
| Rejet GATE 4 (issues concernées seulement) | `EN COURS` (Cas A) ou `PLANNING` (Cas B), issue rouverte si fermée ; autres issues encore ouvertes en `A PUBLIER` → `DONE` | `DONE`, `A PUBLIER` (et `PRET`) |
| Validation GATE 4 | — (issues déjà fermées ; `issues.close_on` = `validation` : issues encore ouvertes `A PUBLIER` → `DONE` puis fermées, §9.4b/§9.5) ; déploiement PROD | `A PUBLIER` |

Exécutant : `deployer`, sur ordre du teamleader (une ligne, toutes les issues suivies) — le teamleader n'a ni `Bash`
ni outil GitHub MCP. Commandes `gh issue edit --add-label … --remove-label …` : `GITHUB.md` §9 (une sous-section par
transition). Attendre `LABELS DONE` avant l'ordre de la phase suivante :
```
SendMessage({ to: "deployer", content: "Labels : issues #12 #15 → EN REVIEW (GITHUB.md §9.2)" })
```

CI verte — selon `project-config.json` → `issues.close_on` (`GITHUB.md` §9.5) : `ci` (défaut) → fermer les issues
suivies (avec lots : celles du lot) ; `validation` → commentaire « CI verte — en attente de validation », issues
**laissées ouvertes** (`DONE` après la CI verte, puis `A PUBLIER` pendant la question du GATE 4) jusqu'à une validation utilisateur qui les couvre (GATE LOT explicite, sinon GATE 4).
Le milestone, lui, reste lié au GATE 4 :
```
SendMessage({ to: "deployer", content: "CI verte : issues #12 #15 — fermeture selon issues.close_on (GITHUB.md §9.5)" })
```

> **BUGFIX** : pas de phase Plan → pas de label `PLANNING`. Démarre directement à `EN COURS` lors de la Phase Dev.
> **HOTFIX / REFACTOR** : pas de gestion de labels (ISSUE_NUMS[] vide en règle générale).

### Milestone — Suivi de Complétion

> **Condition** : s'applique toujours — `MILESTONE_NUM` est désormais obligatoire (construit ou créé automatiquement en CLARIFICATION, voir "Convention Milestone" ci-dessous).
> **Nommage** : le titre du milestone est `vX.Y.Z` complet, optionnellement suivi de `" — <nom>"`. Voir "Convention Milestone" ci-dessous.

| Moment | Action |
|--------|--------|
| Deploy PROD OK (tag `vX.Y.Z`) | `gh issue list --milestone "<title>" --state open --json number,title` |
| Milestone à 100% (liste vide) | Fermer (ordre à `deployer`) : `gh api -X PATCH repos/<owner>/<repo>/milestones/<MILESTONE_NUM> -f state=closed` + consigner la version livrée dans l'historique de la description (`✅ termine — tag vX.Y.Z`, `GITHUB.md` 3.0bis — jamais d'écrasement de la description) + informer l'utilisateur |
| Issues encore ouvertes | Alerter l'utilisateur avec la liste des issues restantes et leur label actuel |

---

### Phase Init (Git)

> **Regle d'or** : on ne travaille jamais directement sur `main`. FEATURE/BUGFIX/HOTFIX/REFACTOR
> commitent tous directement sur la branche du milestone actif (pas de sous-branche par cycle,
> HOTFIX inclus) ; cette branche n'est mergee sur `main` qu'au deploiement PROD du milestone
> (voir `agents/deploy.md` Tache DEPLOY PROD, etape 2). Un seul milestone est en developpement a la
> fois (voir `context/VERSIONING.md` section 5.4) — HOTFIX/BUGFIX sans reference explicite
> rejoignent ce milestone actif s'il existe, sinon un milestone dedie est cree automatiquement
> (voir Phase Clarification etape 3c et Phase Versionnement ci-dessous).

> **Seul le teamleader exécute ce bloc** (propriétaire du HEAD — `agents/context/COMMON.md` « Branche Courante
> et Historique ») : tree propre, `BRANCH CHANGE PENDING` aux agents actifs avant, `BRANCH CHANGE DONE` après.
> Une seule branche de travail à la fois : un `/bugfix` ou `/hotfix` lancé pendant un milestone n'ouvre jamais
> sa branche, il est planifié en priorité dans le plan du milestone et livré avec lui.

```bash
# FEATURE / BUGFIX / HOTFIX / REFACTOR — checkout-ou-creation idempotent de la branche milestone
git fetch origin
if git ls-remote --exit-code --heads origin milestone/vX.Y.Z ; then
  git checkout milestone/vX.Y.Z && git pull origin milestone/vX.Y.Z
else
  git checkout main && git pull origin main
  git checkout -b milestone/vX.Y.Z

  # Ecriture de la version du milestone (X.Y.Z fixe par son titre, voir Phase Versionnement
  # ci-dessous) — uniquement a cette toute premiere ouverture de la branche, jamais re-ecrite
  # ensuite (a la charge de CDP, avant tout commit DEV) :
  echo "X.Y.Z.0" > {VERSION_FILE}   # adapter selon le format reel de {VERSION_FILE}
  git add {VERSION_FILE}
  git commit -m "chore(version): Start vX.Y.Z.0 - <titre milestone>"
  git push -u origin milestone/vX.Y.Z
fi
```

**Tracer le demarrage sur GitHub** — juste apres ce bloc, a chaque passage (idempotent), ordre a `deployer` :
`MILESTONE START vX.Y.Z`. Il pose la « Due date » du milestone a la date du jour **si elle est vide**, sans jamais
l'ecraser (`context/GITHUB.md` 3.0 : due date = date de demarrage du dev ; milestone ouvert avec due date = en
cours, ferme = termine), et inscrit `▶ en cours` dans l'historique de la description (3.0bis). Une reprise apres
interruption rejoue l'ordre sans effet. **Chaque transition suivante** (lots, QUALIF, GATE refuses, PROD) ajoute
une ligne `Milestone : <cible> → <etat>` a l'ordre `deployer` du moment — table des evenements : GITHUB.md 3.0bis.

**Cadrage du milestone** — le `DONE` de `MILESTONE START` fournit les donnees de l'**intensite de depart**
(`agents/context/MILESTONE_CADRAGE.md` 3.1), transmise au planner avec l'ordre de plan ; le cadrage complet (options,
team) est valide au GATE 2 puis applique (MILESTONE_CADRAGE.md section 4). Milestone deja cadre (`cadrage` present
dans `workflow-state.json`) → rien a refaire.

### Phase Versionnement

**Référence complète** : `context/VERSIONING.md` section 5 (format `X.Y.Z.a`, cycle de vie de la version).

Le milestone GitHub actif est la **seule source de vérité** pour `X.Y.Z` — plus aucun agent ne recalcule ces segments. Tout workflow est rattaché à un milestone.

| Type | Condition | Action | Exemple |
|------|-----------|--------|---------|
| FEATURE | Toujours | Rattaché à un milestone (nouveau ou existant, `X.Y.Z` fixé par son titre) | milestone `v1.4.0` → dev `1.4.0.0` → prod `1.4.0` |
| BUGFIX | Milestone actif | Intégré aux itérations du milestone : commit normal, sans toucher `{VERSION_FILE}`. `a` s'incrémente à la prochaine publication (`/publish`), à la charge de `deployer` | milestone `v1.4.0` → dev `1.4.0.0` (fix inclus) → prod `1.4.0` |
| BUGFIX | Aucun milestone actif | Milestone `X.Y.Z+1` créé automatiquement (Z+1 sur la dernière prod livrée) | dernière prod `1.4.0` → milestone `v1.4.1` créé → dev `1.4.1.0` → prod `1.4.1` |
| HOTFIX | Milestone actif | Intégré au milestone en cours : commit direct sur sa branche `milestone/vX.Y.Z`, aucun nouveau milestone créé | milestone `v1.4.0` en cours → hotfix intégré → dev `1.4.0.x` → prod `1.4.0` |
| HOTFIX | Aucun milestone actif | Milestone `X.Y.Z+1` dédié créé automatiquement (Z+1 sur la dernière prod livrée) | dernière prod `1.4.0` → milestone `v1.4.1` créé → dev `1.4.1.0` → prod `1.4.1` |
| REFACTOR | — | Rattaché au milestone actif — aucun changement de version, `a` reste sous la seule responsabilité de `deployer` (tâche PUBLISH) | `1.4.0.x` (inchangé en prod) |

#### Règle — bug remonté sur une ancienne version prod

Une version prod déjà remplacée n'est **jamais repatchée**. Le fix cible toujours la ligne prod courante, quelle que soit l'ancienneté du bug (voir `context/VERSIONING.md` section 5.4).

#### Règle — Aucune Livraison Partielle

La branche milestone part toujours **en bloc** au déploiement PROD — urgence ou non, il n'existe
aucun mécanisme de promotion partielle (pas de sous-branche par issue, donc pas de cherry-pick
propre possible entre commits validés et commits en cours).

- **Issue non commencée** (aucun commit sur la branche) → reportable sans impact vers le
  prochain milestone (simple `gh issue edit --milestone`, rien à toucher côté git).
- **Issue déjà en chantier** (commits déjà présents sur la branche, Review/QA en cours ou pas
  encore lancés) → doit être finalisée et validée (DONE) avant tout déploiement PROD, y compris
  un hotfix intégré au même milestone. Un hotfix urgent force donc à accélérer la validation du
  travail déjà en cours sur la branche — il ne le contourne jamais.

#### Convention Milestone GitHub — nommage `vX.Y.Z` (+ nom optionnel)

Le titre du milestone GitHub porte la version complète `X.Y.Z` fixée dès sa création, optionnellement
suivie de `" — <nom>"` (ex: `v1.4.0 — Authentification OAuth2`) — voir `VERSIONING.md` section 5.7 pour la
logique complète de validation (X/Y obligatoires, Z auto-complété, unicité, cohérence labels↔version).
Toute recherche/comparaison de milestone par version porte sur le **préfixe** `vX.Y.Z`, jamais sur le
titre entier (le nom ne doit jamais empêcher un matching).
- Un cycle FEATURE crée/utilise le milestone GitHub `vX.Y.Z[ — nom]`, clôturé au deploy PROD (tag `vX.Y.Z` identique).
- Un cycle BUGFIX/HOTFIX sans milestone actif crée automatiquement le milestone `vX.Y.(Z+1)` (sans nom, création non-interactive) — plus de cycle "hors milestone" qui patcherait silencieusement une livraison.
- `deploy.template.md` lit `X.Y.Z` directement depuis `{VERSION_FILE}` à la promotion (déjà fixé par le milestone à l'ouverture du cycle) — aucun recalcul, et matche le milestone à clôturer par préfixe (voir `deploy.template.md` Tâche DEPLOY PROD, Étape 6).

### Phases Plan, Dev, Review, QA, Doc, Build — voir `CDP_WORKFLOWS_PHASES.md`

Déroulé de chaque phase (dispatch, labels, sous-agents, traitement des verdicts) : `context/CDP_WORKFLOWS_PHASES.md`,
une sous-section par phase, **à lire à l'entrée de la phase seulement** (avec `agents/context/CDP_PHASES_*.md`).

---

## 6. Points de Validation Utilisateur

| Point | Conditions | Options |
|-------|------------|---------|
| Clarification | Gaps détectés dans la spec | Répondre aux questions / Continuer tel quel |
| Plan | Si creation plan | Valider / Modifier / Refuser |
| Escalade | 3 cycles atteints | Continuer / Abandonner |
| Publish + Deploy PROD | Toujours | Cycle milestone : « Oui » au GATE 4 (Q2, Q3), puis RETEX, puis lancement automatique `PUBLISH PROD` → `DEPLOY PROD` ; hors GATE 4 : commande explicite `/deploy prod` |

---

## 7. Gestion des Erreurs CDP

| Situation | Action |
|-----------|--------|
| Issue GitHub non trouvee | Proposer creation via `gh issue create` (milestone recommande, jamais orpheline — `context/GITHUB.md` 2.3) ou continuer sans |
| Plan refuse | Demander modifications |
| Plan/cycle abandonne pendant la Phase Plan (`Annuler` au GATE 2, `/cdp abort`) | Fermer les sub-planners actifs le cas echeant (`SUBPLANNER_NAMES[]`, voir Phase Dev) avant de clore le workflow |
| Review rejetee | Retour DEV avec corrections |
| QA echoue | Retour DEV avec erreurs |
| Build echoue | Retour DEV avec erreur build |
| 3 cycles atteints | Escalade utilisateur |
| Echec CI **FLAKY** (pre-validation `ci-branch.yml` ou release) | Relance **une fois au plus** ; au 2e echec → analyse des logs, traiter comme CODE (retour DEV). Jamais de relance en boucle |
| Echec CI apres tag | Corriger sur la branche milestone puis re-valider ; **ne pas retaguer** pour retester. L'ordre PROD de l'utilisateur ne vaut pas autorisation de retaguer sans limite : tout nouveau tag est redemande (`AskUserQuestion`) |

---

## 8. Rapport Final CDP

```markdown
## Rapport de Workflow [TYPE]

**Informations**
- Type : [FEATURE|BUGFIX|HOTFIX|REFACTOR]
- Branche : [nom]
- Version : [X.Y.Z]
- Duree : [temps]
- Cycles : [nombre]

**Livrables**
- Code : [fichiers modifies]
- Tests : [ajoutes/modifies]
- Documentation : [mise a jour]

**Prochaines etapes**
- QUALIF deployee — voir scenarios de validation fournis ci-dessus
- `/deploy PROD` quand pret
```

---

## 9. Regles par Type

### FEATURE

- Scope large autorise
- Refactoring autorise
- Tests nouveaux requis
- Documentation complete
- QUALIF obligatoire

### BUGFIX

- Scope minimal obligatoire
- Pas de refactoring
- Test de reproduction OBLIGATOIRE, ecrit par test-writer (ou l'agent DEV si `cadrage.test_writer == false`) avant le fix, statut `regression`, verifie rouge par QA (`red-check`, context/TEST_PLAN.md 15.5)
- Doc si majeur
- QUALIF obligatoire

### HOTFIX

- Fix minimal UNIQUEMENT
- Pas de refactoring
- Test de reproduction + tests `smoke`/`critical` obligatoires (QA critique) ; NR complete apres PROD, en arriere-plan
- QUALIF optionnel si urgent
- Post-mortem requis
- Rejoint la branche du milestone actif (ou un milestone dedie cree automatiquement si aucun
  n'est en cours) — jamais sa propre branche isolee
- Aucune livraison partielle : le deploiement PROD emporte tout l'etat de la branche, y compris
  le travail deja en chantier des autres issues du milestone (voir "Regle — Aucune Livraison
  Partielle" en section Phase Versionnement)

### REFACTOR

- Comportement identique obligatoire
- Tests AVANT refactoring
- Incremental (petits changements)
- Pas de documentation
- QUALIF pour validation

---

## 10. Mots-Cles de Controle

Les commandes CDP reconnaissent des mots-cles speciaux pour interroger ou reprendre un workflow.

**Reference complete :** Voir `context/COMMON.md` section 12

### Handling des Mots-Cles

```
Reception $ARGUMENTS
    |
    |-- Premier mot = "help" ?
    |   |-- Afficher aide et mots-cles disponibles
    |
    |-- Premier mot = "status" ?
    |   |-- Afficher etat workflow actuel
    |
    |-- Premier mot = "plan" ?
    |   |-- Afficher plan sans executer
    |
    |-- Premier mot = "resume" ?
    |   |-- Extraire <phase>, valider, reprendre
    |
    |-- Premier mot = "skip" ?
    |   |-- Extraire <phase>, marquer skippee, continuer
    |
    |-- Premier mot = "jumpto" ?
    |   |-- Extraire <tache>, rechercher, positionner
    |
    |-- Sinon -> Workflow normal
```

### Etat Persistant

Pour supporter `status`/`resume`/`jumpto`, le CDP maintient un etat :

```yaml
workflow_state:
  type: FEATURE|BUGFIX|HOTFIX|REFACTOR
  description: "..."
  branch: milestone/vX.Y.Z   # commune a FEATURE/BUGFIX/HOTFIX/REFACTOR, aucune exception
  current_phase: dev|review|qa|doc|deploy
  phase_status:
    init: completed
    plan: completed
    dev: in_progress
    review: pending
    qa: pending
    doc: pending
    deploy: pending
  tasks:
    - name: "Backend API"
      status: completed
    - name: "Frontend composant"
      status: in_progress
    - name: "Tests"
      status: pending
  cycles: 1
  started_at: "2025-01-15T10:00:00"
```

### Etat Global CDP

Pour la commande `/cdp`, l'orchestrateur maintient un etat global :

```yaml
cdp_state:
  active_workflow:
    type: FEATURE|BUGFIX|HOTFIX|REFACTOR
    description: "..."
    branch: milestone/vX.Y.Z   # commune a FEATURE/BUGFIX/HOTFIX/REFACTOR, aucune exception
    current_phase: dev
  context_additions:
    - "Information supplementaire 1"
    - "Information supplementaire 2"
  notes:
    - "Note pour le rapport final"
  priority: normal|high|low
  paused: false
  config:
    max_cycles: 3
    auto_commit: false
    parallel_agents: true
  history:
    - {type: BUGFIX, description: "...", completed_at: "..."}
```

---

## 11. Commande /cdp

La commande `/cdp` permet le controle direct de l'orchestrateur :

| Mot-cle | Action |
|---------|--------|
| `help` | Aide sur /cdp |
| `status` | Vue globale (tous workflows) |
| `abort` | Abandonner workflow actuel |
| `pause` | Mettre en pause |
| `resume` | Reprendre apres pause |
| `context "..."` | Ajouter contexte aux sous-agents |
| `note "..."` | Ajouter note au rapport final |
| `priority <level>` | Changer priorite (high/normal/low) |
| `config` | Afficher configuration CDP |

**Difference cle** :
- `/feature status` -> etat du workflow FEATURE
- `/cdp status` -> vue globale de l'orchestrateur

---

## 12. État Persistant du Workflow

Le CDP maintient `.claude/workflow-state.json` mis à jour à chaque transition de phase.
Ce fichier est la source de vérité pour les commandes `status`, `resume`, `skip`, `jumpto`.

### Format

```json
{
  "type": "FEATURE",
  "description": "...",
  "status": "in_progress",
  "branch": "milestone/v1.4.0",
  "version": "X.Y.Z",
  "started_at": "2026-04-26T14:30:00Z",
  "updated_at": "2026-04-26T16:02:00Z",
  "cycles": 1,
  "issue_nums": [123, 456],
  "milestone_num": 5,
  "plan": ".claude/workflow/plan-v1.4.0.md",
  "cadrage": {
    "intensite": "leger",
    "test_writer": false, "review": false, "qualif": false, "doc": "dev",
    "team": ["dev-backend", "qa"],
    "valide": "GATE 2"
  },
  "lots": {
    "current": "LOT-2",
    "items": {
      "LOT-1": { "status": "completed", "issues": [123], "ci_sha": "abc123" },
      "LOT-2": { "status": "in_progress", "issues": [456], "phase": "qa" },
      "LOT-3": { "status": "pending", "issues": [789] }
    }
  },
  "phases": {
    "clarification":{ "status": "completed", "skipped": false },
    "plan":         { "status": "completed", "report": "_work/reports/plan-xxx.md", "timestamp": "..." },
    "dev-backend":  { "status": "completed", "sha": "abc123", "handoff": "_work/handoff/dev-backend-xxx.md" },
    "dev-frontend": { "status": "completed", "sha": "def456", "handoff": "_work/handoff/dev-frontend-xxx.md" },
    "test-writer":  { "status": "completed", "sha": "ghi789", "handoff": "_work/handoff/test-writer-xxx.md" },
    "review":       { "status": "completed", "report": "_work/reports/code-review-xxx.md" },
    "qa":           { "status": "in_progress", "report": null },
    "doc":          { "status": "pending" },
    "deploy-qualif":{ "status": "pending", "steps": {
      "build":   { "status": "pending" },
      "publish": { "status": "pending" },
      "deploy":  { "status": "pending" }
    }},
    "deploy-prod":  { "status": "pending", "steps": {
      "publish": { "status": "pending" },
      "deploy":  { "status": "pending" }
    }}
  }
}
```

> `deploy-qualif.steps` porte les 3 sous-etapes BUILD/PUBLISH/DEPLOY QUALIF ; `deploy-prod.steps`
> n'en porte normalement que 2 (PUBLISH/DEPLOY — PROD republie l'artefact deja construit en
> QUALIF, jamais un nouveau BUILD), sauf en Hotfix ou BUILD a lieu directement sous
> `deploy-prod` (voir `agents/cdp.md` section "Dispatch selon le Type de Workflow"). Le niveau
> de granularite `resume`/`skip` (section 11 ci-dessus, cf. `COMMON.md` section 12.2) reste la
> phase globale `deploy` — ces sous-etapes sont informatives, pas des cibles de `resume`/`skip`.

> `cadrage` : écrit à la validation du GATE 2 (`agents/context/MILESTONE_CADRAGE.md` section 4) ; absent = cadrage
> `complet` avec tous les agents `milestone` (projet migré depuis la v3). Lu par chaque phase (section 5) et par
> `/start-session` pour respawner la team après interruption — et par le teamleader quand Claude Code annonce
> lui-même des teammates perdus (MILESTONE_CADRAGE.md 4.2).

> `status` (racine) : `in_progress` tant que le workflow n'est pas terminé — `/start-session` s'en sert pour détecter
> une session interrompue (absent = `in_progress`). `lots` n'existe que si le plan validé contient une table
> « Lots » ; `lots.items.<LOT>.phase` reprend les clés de `phases` (`dev-backend`, `review`, `qa`, `deploy-qualif`…)
> et les `phases` à partir du DEV décrivent alors le **lot courant** (remises à `pending` au lancement du lot suivant ;
> `clarification` et `plan` restent `completed`).

### Règles de mise à jour

Chaque écriture met aussi à jour `updated_at`. Le fichier est écrit **à chaque transition, immédiatement** — c'est
la seule trace qui survit à un terminal tué.

| Moment | Action CDP |
|--------|------------|
| Démarrage workflow | Créer le fichier avec `status: "in_progress"` et toutes les phases à `pending` |
| GATE 2 validé | Copier le plan validé dans `.claude/workflow/plan-<version>.md` (lu puis écrit tel quel), renseigner `plan` ; table « Lots » → créer `lots` (tous `pending` ; une entrée par lot non découpé et par sous-lot, sans les lignes `sous-lots` des lots parents) ; écrire `cadrage` (MILESTONE_CADRAGE.md section 4) |
| Dispatch d'un agent | Passer la phase à `in_progress` (avec lots : `lots.current` et sa `phase`) |
| Réception DONE conforme | Passer la phase à `completed`, enregistrer refs |
| Renvoi pour correction | Laisser `in_progress`, incrémenter `cycles` |
| Sous-lot (pas le dernier de son lot) : QA `DONE` | Sous-lot `qa_done`, sous-lot suivant `in_progress`, phases DEV et suivantes remises à `pending` (aucune validation, aucun push) |
| Lot : CI verte après GATE LOT | Lot `completed` + `ci_sha` (lot découpé : tous ses sous-lots `completed` + même `ci_sha`), lot suivant `in_progress`, phases DEV et suivantes remises à `pending` |
| Échec définitif | Passer à `failed`, noter la raison |
| Frontière de lot / avant chaque push de la branche | Ordre `WORKFLOW COMMIT` à `deployer` (le fichier est **tracké** : l'état doit voyager avec la branche) |
| GATE 4 validé (Q2 puis Q3), **juste avant** l'ordre `DOC RETEX` | Écrire l'état **final** : `status: "completed"`, `deploy-prod` laissé `pending` — `doc-updater` le commite avec le RETEX (dernier commit du milestone) ; PROD ne modifie plus aucun fichier tracké |
| Abandon confirmé par l'utilisateur | `status: "abandoned"` — `WORKFLOW COMMIT` |

> **Fichier tracké** (jamais gitignoré — seuls `.claude/workflow/` et `_work/` le sont) : l'état suit la branche, donc
> un clone frais ou un autre poste reprend le workflow. `status: "completed"` est écrit **avant** la PROD (ligne
> ci-dessus) : une PROD interrompue se détecte par git (tag `vX.Y.Z` absent) et non par `status` —
> `/start-session` rapproche l'état de git et GitHub (étape 4bis).

### Utilisation par les commandes de contrôle

- `status` : lire le fichier, afficher le tableau de phases
- `resume <phase>` : lire le fichier, reprendre à la phase indiquée
- `skip <phase>` : marquer la phase `skipped` et passer à la suivante
- `jumpto <tache>` : rechercher dans les phases et tâches, se positionner

### Reprise après interruption (terminal tué, crash)

Détection et reprise : `commands/start-session.md` étapes 2 et 4bis. Principes :

- **Sources** : le fichier d'état dit *où on en était* ; git (commits, arbre) et les labels GitHub disent *ce qui est
  réellement acquis* — en cas d'écart, ils priment et l'état est corrigé avant la reprise.
- **Granularité** : la phase `in_progress` (du lot courant s'il y a des lots) est rejouée depuis son début ; rien de
  `completed` n'est rejoué. Les ordres de reprise rappellent les commits déjà présents sur la branche.
- **Rapports et handoffs** : les chemins `_work/...` de l'état restent valides (purge sélective) ; un fichier
  manquant rend la phase correspondante à rejouer, pas tout le workflow.
- **Plan** : toujours relu depuis `plan` (`.claude/workflow/`, gitignored, hors `_work/`) — jamais régénéré si
  présent.

> **Limite connue** : `SUBPLANNER_NAMES[]`/`SUBREVIEWER_NAMES[]`/`SUBAGENT_NAMES[]` (sous-agents
> temporaires, voir `context/SUBAGENTS_PROTOCOL.md` section 6) ne sont pas persistés dans ce
> fichier — un crash/redémarrage de session pendant une délégation active peut laisser des
> sous-agents orphelins. Après un `resume`, lancer `/team-status` et fermer manuellement
> (`TaskStop`, ou `/team-delete --force` — voir `team-delete.md`) tout `sub-planner-*`/
> `sub-reviewer-*`/`sub-qa-*` qui ne correspond à aucune délégation en cours.

---

## Usage

Dans les commandes CDP, referencer ce fichier :

```markdown
**Workflow CDP :** Voir `context/CDP_WORKFLOWS.md`
- Type : FEATURE|BUGFIX|HOTFIX|REFACTOR
- Phases : section 3
- Clarification : section 4
- Labels GitHub + Milestone : section 5 (Labels GitHub — Suivi de Phase)
- Phases communes : section 5
- Dispatch Review/QA (parallelisation) : voir `context/QUALITY.md` section 12
- Validation : section 6
- Erreurs : section 7
- Regles : section 9
- Mots-cles controle : section 10
- Commande /cdp : section 11
- Etat persistant : section 12
```
