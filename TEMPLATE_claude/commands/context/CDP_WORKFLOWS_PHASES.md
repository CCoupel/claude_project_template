# CDP_WORKFLOWS_PHASES.md — Phases Plan → Build (section 5 de `CDP_WORKFLOWS.md`, suite)

> Extrait de `CDP_WORKFLOWS.md` section 5 (titres conservés : « Phase Plan », « Phase Dev (Dispatch) », « Phase Review »,
> « Phase QA », « Phase Doc », « Phase Build + Publish + Deploy QUALIF »). **À l'entrée d'une phase, ne lire que la
> sous-section de cette phase** (`Read` ciblé via `grep -n "^### Phase"`), en complément du fichier
> `agents/context/CDP_PHASES_*.md` correspondant — pas le fichier entier au lancement du workflow.

### Phase Plan

> Applicable : **FEATURE** (obligatoire) — **BUGFIX** (si complexe : plusieurs fichiers, risque de régression, changement d'architecture)

**→ Appliquer label `PLANNING`** sur toutes les issues de `ISSUE_NUMS[]` si non vide (FEATURE uniquement) :

```
SendMessage({ to: "deployer", content: "Labels : issues <ISSUE_NUMS> → PLANNING (GITHUB.md §9.0a)" })   // attendre LABELS DONE
```

> **Le CDP ne rédige jamais le plan lui-même.** C'est le rôle exclusif du planner.

```
SendMessage({ to: "planner", content: "
  Crée un plan d'implémentation pour : [description]
  Type : [FEATURE|BUGFIX]
  [FEATURE] Contrats API à créer dans contracts/ si nouveaux endpoints.
  [BUGFIX] Identifier la cause racine, le fix minimal, le scope impacté et le risque de régression.
  Retourne le plan structuré avec : tâches ordonnées, dépendances, risques.
" })
```

**Si le planner répond `PLANNER NEED SUBPLANNERS`** (groupes indépendants identifiés — voir
`implementation-planner.md` section "Délégation à des Sous-Planners") :
```
Spawner chaque nom demandé (Task/Agent, prompt générique pointant vers "planner" comme
coordinateur — jamais "team-lead") → mémoriser SUBPLANNER_NAMES[]
SendMessage({ to: "planner", content: "TEAMLEADER SUBPLANNERS READY\nNoms : [liste]" })
```
Le CDP n'échange plus rien avec ces sub-planners ensuite — le planner les gère en direct (P2P)
jusqu'à son rapport final. Ils restent actifs pendant toute la Phase Plan (y compris pendant la
boucle de correction ci-dessous), fermés uniquement à la sortie de la Phase Plan (voir Phase Dev).

**Si le planner répond `PLANNER NEED INFRA`** (environnements à vérifier avant de figer le plan) : dispatcher
`infra` en Mode Préparation, puis relayer `TEAMLEADER INFRA READY` + rapport au planner — voir
`agents/context/CDP_PHASES_PLAN_DEV.md`, cas NEED INFRA. Les prérequis utilisateur du plan sont présentés en tête du GATE 2.

Recevoir le plan → lire intégralement, vérifier cohérence et complétude.
Lire `contracts/CHANGELOG.md` si FEATURE — signaler tout changement BREAKING lors du GATE 2.

**Présenter le plan validé à l'utilisateur et demander validation** ← GATE 2

**→ Dès la validation (GATE 2 OUI), appliquer label `PRET`** sur toutes les issues de `ISSUE_NUMS[]` si non vide :

```
SendMessage({ to: "deployer", content: "Labels GATE 2 (GITHUB.md §9.0) : PRET sur #12 #15 ; LOT-1 « <objectif> » → #12 ; LOT-2 « <objectif> » → #15" })   // attendre LABELS DONE
```

---

### Phase Dev (Dispatch)

**→ Sortie de Phase Plan — fermer les sub-planners** si `SUBPLANNER_NAMES[]` non vide (voir Phase
Plan ci-dessus) :
```
pour chaque nom dans SUBPLANNER_NAMES[] :
  TaskStop({ task_id: nom })
SUBPLANNER_NAMES[] = []
```

**→ À l'ordre DEV du lot, appliquer label `EN COURS`** sur les issues de ce lot (toutes celles de `ISSUE_NUMS[]` sans lots) si non vide :

```
SendMessage({ to: "deployer", content: "Labels : issues <ISSUE_NUMS> → EN COURS (GITHUB.md §9.1)" })   // attendre LABELS DONE
```

```
Analyser le scope, puis dispatcher les agents concernés via SendMessage :

|-- Backend seul ->
|     SendMessage({ to: "dev-backend", content: "
|       [description de la tâche]
|       Handoff planner : _work/handoff/planner-[timestamp].md
|     " })
|
|-- Frontend seul ->
|     SendMessage({ to: "dev-frontend", content: "
|       [description de la tâche]
|       Handoff planner : _work/handoff/planner-[timestamp].md
|     " })
|
|-- Les deux (dépendants) ->
|     SendMessage dev-backend → attendre DONE →
|     SendMessage dev-frontend :
|       Handoff planner     : _work/handoff/planner-[timestamp].md
|       Handoff dev-backend : _work/handoff/dev-backend-[timestamp].md
|
|-- Les deux (indépendants) ->
|     SendMessage dev-backend + dev-frontend dans le même tour
|     Attendre les deux DONE
```

### Phase Review

> **Dispatch Review/QA** : voir `context/QUALITY.md` section 12 pour le mecanisme complet (critere `qa_parallelizable`, mode parallele par defaut, repli sequentiel, message d'annulation). Resume ci-dessous.

**→ Appliquer label `EN REVIEW`** sur toutes les issues de `ISSUE_NUMS[]` si non vide :

```
SendMessage({ to: "deployer", content: "Labels : issues <ISSUE_NUMS> → EN REVIEW (GITHUB.md §9.2)" })   // attendre LABELS DONE
```

```
// Dispatcher code-reviewer + test-writer en parallèle (même tour)
SendMessage({ to: "code-reviewer", content: "
  Revue du code sur [branche].
  Handoff dev-backend  : _work/handoff/dev-backend-[timestamp].md  (si applicable)
  Handoff dev-frontend : _work/handoff/dev-frontend-[timestamp].md (si applicable)
  Retourne : APPROVED / APPROVED WITH RESERVATIONS / REJECTED + rapport.
" })
SendMessage({ to: "test-writer", content: "
  Écris les tests pour : [description]
  SHA dev : [sha]
  Handoff planner      : _work/handoff/planner-[timestamp].md       (si applicable)
  Handoff dev-backend  : _work/handoff/dev-backend-[timestamp].md   (si applicable)
  Handoff dev-frontend : _work/handoff/dev-frontend-[timestamp].md  (si applicable)
  Contrats API : contracts/ — valider la conformité aux contrats.
  Produire : scripts de tests + procédures manuelles tests/procedures/.
" })

|-- Chaque TEST-WRITER DONE (ici ou en Batch 1 de la Phase Dev), avant tout autre ordre :
|     lire sa ligne « Validation humaine : <#num … | aucune> » (absente/texte libre -> DONE renvoyé, rien déduit)
|     SendMessage({ to: "deployer", content: "Labels validation humaine (GITHUB.md §9.13) : +VALID-HUMAINE #217 #219 ; -VALID-HUMAINE #215" })
|     attendre LABELS DONE   // ordre envoyé même si « aucune » (retraits éventuels)
|-- qa_parallelizable != false (défaut) :
|     Dès réception DONE de test-writer -> appliquer label EN QA + dispatcher qa immédiatement
|     (sans attendre le verdict code-reviewer) -> voir Phase QA, "Dispatch parallèle"
|-- qa_parallelizable == false (repli explicite du plan, ou heuristique CDP si risque élevé sans plan) :
|     Attendre le verdict code-reviewer avant de dispatcher qa -> voir Phase QA, "Dispatch séquentiel"

**Si code-reviewer répond `CODE-REVIEWER NEED SUBREVIEWERS`** (diff volumineux, découpage par
dimension du Checklist — voir `code-reviewer.md` section "Délégation à des Sous-Reviewers") :
```
Spawner chaque nom demandé (Task/Agent, prompt générique pointant vers "code-reviewer" comme
coordinateur — jamais "team-lead") → mémoriser SUBREVIEWER_NAMES[]
SendMessage({ to: "code-reviewer", content: "TEAMLEADER SUBREVIEWERS READY\nNoms : [liste]" })
```
Le CDP n'échange plus rien avec ces sub-reviewers ensuite — code-reviewer les gère en direct (P2P).
Son rapport `DONE` final inclut la liste "Sub-reviewers a fermer" → **étape 1, toujours avant tout
traitement du verdict** (jamais respawner un nom pas encore fermé si le cycle suivant redemande
des sub-reviewers) :
```
pour chaque nom de la liste "Sub-reviewers a fermer" :
  TaskStop({ task_id: nom })
```
**Étape 2, seulement ensuite** :

|-- Recevoir DONE code-reviewer + ref fichier rapport
|-- CDP valide sur les lignes Verdict / Conformite du DONE (rapport ouvert seulement sur KO, reserves ou ecart —
|   cdp.md « Validation des Livrables par exception » ; un REJECTED/NOT VALIDATED se transmet au dev par le chemin du rapport)
    |-- Non conforme -> renvoyer pour correction (hors cycle)
    |-- Conforme :
        |-- APPROVED / APPROVED WITH RESERVATIONS ->
              Si qa déjà dispatché (mode parallèle) : attendre son DONE si pas encore reçu, puis traiter
              son verdict (voir Phase QA). Sinon (mode séquentiel) : dispatcher qa maintenant -> Phase QA.
        |-- REJECTED -> Retour Phase Dev (cycle++) :
              ordre deployer : issues → EN COURS (GITHUB.md §9.1)
              Si qa est en cours (mode parallèle) -> lui envoyer le message d'annulation (QUALITY.md
              section 12), ignorer tout résultat tardif. Si qa déjà DONE -> ignorer son résultat.
              relancer code-reviewer + test-writer (+ qa si mode parallèle, réévalué après correction)
```

### Phase QA

**→ Appliquer label `EN QA`** sur toutes les issues de `ISSUE_NUMS[]` si non vide, au moment du dispatch effectif de `qa` (dès test-writer DONE en mode parallèle, ou après verdict Review positif en mode séquentiel — voir Phase Review) :

```
SendMessage({ to: "deployer", content: "Labels : issues <ISSUE_NUMS> → EN QA (GITHUB.md §9.3)" })   // attendre LABELS DONE
```

```
// Dispatcher qa — déclencheur selon le mode retenu en Phase Review (QUALITY.md section 12)
SendMessage({ to: "qa", content: "
  Execute les tests sur [branche].
  Scripts de tests : SHA [sha] (commités par test-writer).
  Procédures manuelles : tests/procedures/[feature].md
  Scope : feature (suite feature d'abord ; KO = retour immédiat ; puis NR impactées selon
  `testing.regression_at_qa`) — plan de tests : context/TEST_PLAN.md section 15.
  Rapport code-reviewer : _work/reports/code-reviewer-[timestamp].md (si déjà disponible)
  Retourne : VALIDATED / NOT VALIDATED + rapport (échecs classés par nature).
" })

**Si `qa` répond `QA NEED SUBAGENTS`** (scopes de tests independants, volume suffisant pour
justifier la delegation — voir `qa.md` section "Délégation à des Sous-QA") :
```
Spawner chaque nom demandé (Task/Agent, prompt générique pointant vers "qa" comme coordinateur
— jamais "team-lead") → mémoriser SUBAGENT_NAMES[]
SendMessage({ to: "qa", content: "TEAMLEADER SUBAGENTS READY\nNoms : [liste]" })
```
Le CDP n'échange plus rien avec ces sub-qa ensuite — `qa` les gère en direct (P2P), chacun isolant
son execution via un `git worktree` gere en `Bash` (jamais via `isolation` de l'outil `Agent`).
Son rapport `DONE` final inclut la liste "Sub-qa a fermer" → **étape 1, toujours avant tout
traitement du verdict** (même raison que code-reviewer — jamais respawner un nom pas encore
fermé) :
```
pour chaque nom de la liste "Sub-qa a fermer" :
  TaskStop({ task_id: nom })
```
**Étape 2, seulement ensuite** : traiter le verdict VALIDATED/NOT VALIDATED.

|-- Recevoir DONE + ref fichier rapport (ou annulation reçue entre-temps, voir Phase Review REJECTED)
|-- CDP valide sur les lignes Verdict / Conformite du DONE (rapport ouvert seulement sur KO, reserves ou ecart —
|   cdp.md « Validation des Livrables par exception » ; un REJECTED/NOT VALIDATED se transmet au dev par le chemin du rapport)
    |-- Non conforme -> renvoyer pour correction (hors cycle)
    |-- Conforme :
        |-- VALIDATED                   -> Phase Doc (automatique) :
                                           ordre deployer : issues → DONE (GITHUB.md §9.4)
        |-- VALIDATED WITH RESERVATIONS -> Phase Doc (noter reserves, continuer) :
                                           ordre deployer : issues → DONE (GITHUB.md §9.4)
        |-- NOT VALIDATED               -> Retour Phase Dev (cycle++) :
                                           ordre deployer : issues → EN COURS (GITHUB.md §9.1)
                                           relancer code-reviewer + test-writer

Si cycle > 3 -> ESCALADE utilisateur
```

### Phase Doc

> Applicable : **FEATURE** (obligatoire) — **BUGFIX** (si majeur) — **HOTFIX** (post-mortem) — **REFACTOR** (non)

```
// Dispatcher doc-updater
SendMessage({ to: "doc-updater", content: "
  Mets à jour la documentation pour : [description]
  Type : [FEATURE|BUGFIX|HOTFIX]
  SHA dev : [sha]
  Handoff dev : _work/handoff/dev-[timestamp].md
  Handoff QA  : _work/handoff/qa-[timestamp].md
  Fichiers modifiés : [liste]
" })

|-- Recevoir DONE + ref handoff
|-- CDP valide la conformité
    |-- Non conforme -> renvoyer pour correction
    |-- Conforme     -> Phase Build + Publish + Deploy QUALIF
```

### Phase Build + Publish + Deploy QUALIF

> Résumé — la mécanique complète (validation infra, dispatch parallèle avec doc-updater et NR complète
> (`qa`, scope `regression-full`, `testing.full_regression_at`), format du GATE 4 — ouvert seulement
> quand QUALIF, DOC finalize et NR complète sont terminés) est documentée dans `agents/context/CDP_PHASES_RELEASE.md` Phase 5, qui fait autorité ; ne pas
> dupliquer ici au-delà de ce résumé pour éviter toute dérive entre les deux fichiers.

```
// Dispatcher deployer — [branche] = branche milestone active (milestone/vX.Y.Z), commune a
// FEATURE/BUGFIX/HOTFIX/REFACTOR. Un seul message : deployer enchaine BUILD (compilation,
// incremente `a` lui-meme) puis PUBLISH QUALIF (mise a disposition, pas de rebuild) puis
// DEPLOY QUALIF (installation) avant de repondre.
SendMessage({ to: "deployer", content: "
  Build puis publie puis déploie en QUALIF.
  Branche : [branche]
  Version : [X.Y.Z]
  Handoff doc : _work/handoff/doc-updater-[timestamp].md
" })

|-- Recevoir DONE + rapport de build/publication/déploiement
|-- CDP informe l'utilisateur : QUALIF déployée, scénarios de validation fournis
|-- Publish + Deploy PROD : déclenché uniquement par commande explicite `/deploy prod` (voir
    `agents/context/CDP_PHASES_RELEASE.md` Phase 6 — publie via merge + tag officiel, rebuild déterministe via CI,
    puis installe)
```
