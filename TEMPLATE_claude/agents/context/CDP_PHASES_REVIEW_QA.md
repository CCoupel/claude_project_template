# CDP_PHASES_REVIEW_QA.md — Phases 3 et 4 — Revue + QA, Documentation draft

> Détail des phases du workflow CDP. Lu par le teamleader **à l'entrée de la phase** (voir `cdp.md`, « Phases 1 à 6 »).
> Contexte, délégation, validation des livrables et gates : `cdp.md`.

### Phase 3 — Revue + QA (parallelisation par defaut)

> `ISSUE_NUMS[]` non vide → label `EN REVIEW` sur toutes les issues (ordre à `deployer` — `commands/context/GITHUB.md` §9, `gh issue edit`)
> Critere `qa_parallelizable` du plan (voir `implementation-planner.md`, section "Parallelisation Review/QA") —
> sans plan, heuristique CDP : `true` par defaut. Mecanisme complet : `context/QUALITY.md` section 12.

```
SendMessage({ to: "code-reviewer", content: "
  Revue du code depuis [branche/commit].
  Tests ecrits par test-writer : SHA [sha].
  Focus : [general|security|performance|rationalization]
  Verifier aussi : les tests couvrent-ils les contrats API (contracts/) ?
  Retourne : verdict APPROUVE / APPROUVE AVEC RESERVES / REFUSE + rapport detaille.
" })
```

**Si code-reviewer répond `CODE-REVIEWER NEED SUBREVIEWERS`** (dimensions indépendantes du
Checklist — voir `code-reviewer.md` section "Délégation à des Sous-Reviewers") :
```
Spawner chaque nom demandé (Task/Agent, prompt générique pointant vers "code-reviewer" comme
coordinateur — jamais "main") → mémoriser SUBREVIEWER_NAMES[]
SendMessage({ to: "code-reviewer", content: "TEAMLEADER SUBREVIEWERS READY\nNoms : [liste]" })
```
Le CDP n'échange plus rien avec ces sub-reviewers ensuite — code-reviewer les gère en direct (P2P)
jusqu'à son rapport final, qui inclut la liste à fermer (fermeture immédiate, pas de boucle de
révision comme pour le planner). **À réception du rapport DONE, étape 1 — toujours avant tout
traitement du verdict** (une nouvelle demande de sous-reviewers avec les mêmes noms pourrait
survenir dès le cycle suivant si REFUSE — jamais respawner un nom pas encore fermé) :
```
pour chaque nom dans SUBREVIEWER_NAMES[] (liste "Sub-reviewers a fermer" du rapport DONE) :
  TaskStop({ task_id: nom })
SUBREVIEWER_NAMES[] = []
```
**Étape 2, seulement ensuite** : traiter le verdict (REFUSE/APPROUVE, voir ci-dessous).

**Si `qa_parallelizable != false` (defaut)** — dispatcher `qa` dans le meme tour (test-writer a deja livre ses
scripts en Phase 2, aucune attente necessaire) :

```
> `ISSUE_NUMS[]` non vide → label `EN QA` sur toutes les issues (en plus de `EN REVIEW`)
SendMessage({ to: "qa", content: "
  Execute les tests sur la branche [branche].
  Scripts de tests : commites par test-writer (SHA [sha]).
  Procedures manuelles : tests/procedures/[feature].md.
  Scope : feature (suite feature d'abord — KO = retour immediat ; puis NR impactees selon
  `testing.regression_at_qa`). Scopes optionnels : [perf|security|aucun] (`test_scopes` du plan).
  Plan de tests : context/COMMON.md section 15. Reutilise _work/tests-ledger.md si l'arbre est inchange.
  Retourne : verdict VALIDATED / NOT VALIDATED + rapport detaille (echecs classes par nature).
" })
```

**Si `qa` répond `QA NEED SUBAGENTS`** (scopes indépendants — voir `qa.md` section "Délégation
à des Sous-QA") :
```
Spawner chaque nom demandé (Task/Agent, prompt générique pointant vers "qa" comme coordinateur
— jamais "main") → mémoriser SUBAGENT_NAMES[]
SendMessage({ to: "qa", content: "TEAMLEADER SUBAGENTS READY\nNoms : [liste]" })
```
Le CDP n'échange plus rien avec ces sub-qa ensuite — `qa` les gère en direct (P2P) jusqu'à son
rapport final, qui inclut la liste à fermer (fermeture immédiate, pas de boucle de révision).
**À réception du rapport DONE, étape 1 — toujours avant tout traitement du verdict** (même
raison que pour code-reviewer : ne jamais respawner un nom pas encore fermé) :
```
pour chaque nom dans SUBAGENT_NAMES[] (liste "Sub-qa a fermer" du rapport DONE) :
  TaskStop({ task_id: nom })
SUBAGENT_NAMES[] = []
```
**Étape 2, seulement ensuite** : traiter le verdict (VALIDATED/NOT VALIDATED, voir ci-dessous).

**Apres reception du verdict `code-reviewer` :**
- REFUSE → cycle++
  > `ISSUE_NUMS[]` non vide → reset label `EN COURS` sur toutes les issues
  → Si `qa` dispatche en parallele et encore en cours : `SendMessage({ to: "qa", content: "ANNULATION — la
    revue de code a ete REJETEE, ce travail est invalide. Arrete l'execution des tests, ne produis pas de
    rapport pour cette iteration, reste IDLE." })`, ignorer tout resultat tardif
  → Si `qa` deja DONE : ignorer son resultat
  → SendMessage({ to: "[dev-backend|dev-frontend selon scope]", content: "Corriger : [points du rapport]" })
  → Si la correction touche le scope fonctionnel (BREAKING/CHANGED dans contracts/CHANGELOG.md) :
    relancer TEST-WRITER + REVIEW en parallele (+ QA si `qa_parallelizable` toujours vrai)
  → Sinon : relancer REVIEW seul (+ QA si mode parallele)
- Si cycle >= MAX_CYCLES → ESCALADE UTILISATEUR ← GATE 3
- APPROUVE (ou AVEC RESERVES) →
  - `qa` deja dispatche (mode parallele) : attendre son DONE si pas encore recu, puis traiter son verdict ci-dessous
  - `qa` pas encore dispatche (mode sequentiel, `qa_parallelizable == false`) :
    > `ISSUE_NUMS[]` non vide → label `EN QA`
    dispatcher `qa` maintenant (meme message ci-dessus), attendre son DONE

**Verdict `qa` (parallele ou sequentiel) :**
- Dans tous les cas : ajouter une ligne a `tests/METRICS.md` (date, milestone, feature, cycle, verdict,
  echecs par nature — repris du rapport QA) ; ajouter en `quarantaine` dans `tests/INDEX.md` (ligne fichier au sein du lot, raison + issue)
  les tests que QA a classes `flaky`.
- Pendant l'execution de `qa` : relayer a l'utilisateur chaque jalon `QA EN COURS — lot i/N …` en **une ligne**
  (`context/COMMON.md` 15.9) ; arreter le run seulement si l'utilisateur le demande.
- VALIDATED / VALIDATED WITH RESERVATIONS → Phase 4 (Documentation Draft)
- NOT VALIDATED → cycle++
  > `ISSUE_NUMS[]` non vide → reset label `EN COURS` sur toutes les issues
  → Retour Phase DEV, puis relance REVIEW (+ QA selon mode) en parallele
  → Si cycle > 3 : **Escalade utilisateur** ← GATE 3

### Phase 4 — Documentation Draft

Le code est REVIEW-approuve et QA VALIDATED (voir Phase 3) — dispatcher `doc-updater` :

```
SendMessage({ to: "doc-updater", content: "
  DOC DRAFT — redige la documentation pour : [description du changement]
  Sources : plan planner (_work/handoff/planner-[timestamp].md), contracts/, code REVIEW-approuve (SHA [sha]).
  Produire : CHANGELOG.md (section [Added|Fixed|Changed]), docs API si nouveaux endpoints, README si besoin.
  NE PAS incrementer la version — ce sera fait en DOC FINALIZE.
  Retourne : DONE + fichiers modifies.
" })
```

**Apres reception :**
- DONE →
  > `ISSUE_NUMS[]` non vide → label `DONE` sur toutes les issues, remove `EN QA`/`EN REVIEW`/`EN COURS`/`PLANNING`
  **Push + CI (avant la Phase 5)** : pousser la branche du milestone (`git push origin milestone/vX.Y.Z`) — la CI de
  validation (`infra.md` §3bis, C10) s'execute — puis attendre son verdict (`gh run watch` / `gh run list --branch`) :
  - **CI verte** → `ISSUE_NUMS[]` non vide → commenter puis **fermer toutes les issues** (elles gardent `DONE`) ;
    la fermeture vaut « QA OK + CI verte », **pas** validation du milestone (reste au GATE 4). Phase BUILD +
    PUBLISH QUALIF + DEPLOY QUALIF (automatique)
  - **CI non verte** (rouge, orange, annulee, en erreur) → jamais de fermeture : cycle++ (`tests/METRICS.md`),
    `ISSUE_NUMS[]` non vide → commentaire (job en echec + lien du run) + reset label `EN COURS` (`--remove-label "DONE"`),
    retour Phase DEV avec le rapport CI, puis REVIEW + QA, `DOC` si besoin, nouveau push. Si cycle > 3 : **Escalade
    utilisateur** ← GATE 3
- FAILED → renvoyer au doc-updater avec correction avant de continuer
