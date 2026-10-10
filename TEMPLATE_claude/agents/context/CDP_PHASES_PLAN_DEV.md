# CDP_PHASES_PLAN_DEV.md — Phases 1 et 2 — Planification, Développement + Tests

> Détail des phases du workflow CDP. Lu par le teamleader **à l'entrée de la phase** (voir `cdp.md`, « Phases 1 à 6 »).
> Contexte, délégation, validation des livrables et gates : `cdp.md`.

### Phase 1 — Planification

> `ISSUE_NUMS[]` non vide → label `PLANNING` sur toutes les issues (ordre à `deployer` — `commands/context/GITHUB.md` §9, `gh issue edit`)

> **Le CDP ne rédige jamais le plan lui-même.** C'est le rôle exclusif du planner.
> Le CDP passe le contexte complet — le planner (Opus) analyse, détecte les ambiguïtés, et planifie.

```
SendMessage({ to: "planner", content: "
  Cree un plan d'implementation pour : [description]
  Contrats API a creer dans contracts/ si nouveaux endpoints.
  Retourne le plan structure avec : taches ordonnees, dependances, risques.
" })
```

**Cas NEED SUBPLANNERS** — le planner a identifié des groupes indépendants et demande à
sous-traiter (voir `implementation-planner.md` section "Délégation à des Sous-Planners") :
- Spawner chaque nom demandé via `Task`/`Agent` (prompt générique fixe, pointant vers `planner`
  comme coordinateur — jamais `main`) et mémoriser la liste dans `SUBPLANNER_NAMES[]`
- Répondre : `SendMessage({ to: "planner", content: "TEAMLEADER SUBPLANNERS READY\nNoms : [liste]" })`
- Le CDP ne dispatche plus rien lui-même à ces sub-planners ensuite — le planner les gère en
  direct (P2P) jusqu'à son rapport `PLANNER DONE`/`BLOQUE` final

**Réception du rapport planner — trois cas :**

**Cas DONE** → appliquer la Validation Systématique des Livrables :
- Lire intégralement le plan produit
- Vérifier : tâches complètes, dépendances cohérentes, risques identifiés, contrats API créés si nécessaire
- Non conforme → renvoyer au planner pour correction avant toute suite
- Lire `contracts/CHANGELOG.md` — si changements **BREAKING** détectés, les signaler au GATE 2 :
  `⚠ Breaking changes détectés : [liste] — impact sur les clients existants`
- **Présenter le plan validé à l'utilisateur, avec la maquette si le plan en contient une** ← GATE 2

**Corrections demandées au GATE 2 (plan et/ou maquette)** :
- Recueillir les corrections de l'utilisateur
- Re-dispatcher au planner avec les corrections précises :
  ```
  SendMessage({ to: "planner", content: "
    Corriger le plan/la maquette de : [description]
    Corrections demandées :
    1. [correction 1]
    2. [correction 2]
  " })
  ```
- Répéter jusqu'à validation explicite de l'utilisateur avant de lancer la Phase 2
- **Plan avec table « Lots »** : après validation, ordonner à `deployer` de poser `LOT-N` sur chaque issue du lot (`commands/context/GITHUB.md` §9.11) avant le premier ordre DEV

**Maquette au GATE 2** (convention : `context/COMMON.md` section 14) :
- **Correction/refus** : reformuler les retours de l'utilisateur en **contraintes durables** et les ajouter à `docs/mockup/DECISIONS.md`, par composant (ex. « je ne veux pas cette couleur et fais plus gros » → « pas de bleu pour ce composant », « taille > 24px »). Le brouillon rejeté n'est pas conservé, seules les raisons le sont. Inclure ces contraintes dans la correction redispatchée au planner.
- **Validation explicite** : copier le brouillon `_work/mockup/...` vers `docs/mockup/v<X.Y.Z>/<type>/<composant>__<feature>.<ext>`, le commiter sur la branche du milestone, puis mettre à jour `docs/mockup/INDEX.md` : ajouter la maquette à « Actives » ; si son en-tête porte `remplace`, déplacer les maquettes remplacées vers « Obsolètes » (avec la référence de la remplaçante) ; si elle porte `complete`, laisser les précédentes actives.
- **Conflit** : si une autre maquette active du même milestone couvre le même composant, arbitrer avec l'utilisateur avant d'enregistrer.
- **Projet sans maquette de référence** pour le composant : si le rapport du planner le signale, demander à l'utilisateur une capture d'écran de référence avant de relancer le planner.
- Une maquette validée est immuable : toute évolution ultérieure passe par une nouvelle maquette (`complete`/`remplace`).

**Cas BLOQUE** → le planner a détecté des ambiguïtés bloquantes ← GATE 1.5 :
- Lire le rapport `_work/reports/plan-ambiguities-[timestamp].md`
- Le rapport contient, pour chaque ambiguite, les options possibles et leur impact (format `BLOQUE` de
  `TEAMMATES_PROTOCOL.md`). **Convertir chaque ambiguite en une question d'un appel `AskUserQuestion` unique**
  (jusqu'a 4 par appel ; au-dela, un second appel) : une option par interpretation, description = impact sur
  le plan, defaut du planner marque « (Recommandé) ». Aucun texte listant les questions dans le chat.
- Recueillir les réponses (outil), puis re-dispatcher au planner avec le contexte complet :
  ```
  SendMessage({ to: "planner", content: "
    Reprendre la planification de : [description]
    Réponses aux ambiguïtés :
    1. [réponse 1]
    2. [réponse 2]
  " })
  ```

**Cas FAILED** → escalade utilisateur avec la raison ← GATE 1.5

### Phase 2 — Developpement + Ecriture des Tests

> **Sortie de Phase Plan — fermer les sub-planners** (si `SUBPLANNER_NAMES[]` non vide, cf. Phase 1) :
> ```
> pour chaque nom dans SUBPLANNER_NAMES[] :
>   TaskStop({ task_id: nom })
> SUBPLANNER_NAMES[] = []
> ```
> Même nettoyage requis si la Phase Plan est abandonnée avant validation (GATE 2 "Annuler"
> définitif, `/cdp abort` pendant la planification) — ne jamais laisser un sub-planner actif
> en dehors de la Phase Plan.

> `ISSUE_NUMS[]` non vide → label `EN COURS` sur toutes les issues (ordre à `deployer` — `commands/context/GITHUB.md` §9, `gh issue edit`)

> **Le CDP ne decide pas du dispatch — il lit et execute l'Arbre d'Execution DEV du plan.**
> Lire la section "Arbre d'Execution DEV" du rapport planner (`_work/reports/plan-[timestamp].md`).
> Chaque batch de l'arbre = un groupe de SendMessage envoyes dans le meme tour.

**Execution :**
```
Pour chaque batch de l'arbre (dans l'ordre) :
  → Envoyer tous les SendMessage du batch dans le meme tour
  → Attendre que tous les agents du batch repondent DONE
  → Passer au batch suivant
```

**Message type agent DEV :**
```
SendMessage({ to: "[agent]", content: "
  Implemente : [tache precise du batch]
  Handoff planner : _work/handoff/planner-[timestamp].md
  Contrats API : contracts/
  Commits atomiques.
  Tests : boucle rapide seulement (build + lint + typecheck + tests feature de tes fichiers,
  `commands.test_fast`) — jamais la suite complete (voir context/COMMON.md 15.2).
  Reponse : DONE/FAILED + fichiers modifies + SHA commit.
" })
```

**Message test-writer (toujours Batch 1) :**
```
SendMessage({ to: "test-writer", content: "
  Ecris les tests pour : [description]
  Handoff planner : _work/handoff/planner-[timestamp].md
  Contrats API : contracts/ — les tests DOIVENT valider la conformite aux contrats.
  Source : plan + contrats uniquement (le code n'est pas encore final).
  Produire : scripts de tests (unit/integration/E2E) + procedures manuelles tests/procedures/
  Range en lots tests/<famille>/<theme>/<lot>/ (max testing.lot_max_tests, defaut 50) + une ligne par lot dans tests/INDEX.md (statut `feature`, tags smoke/critical/slow).
  Scopes optionnels du plan (`test_scopes`) : [perf|security|aucun].
  Ne pas modifier les tests existants sauf changement documente dans contracts/CHANGELOG.md.
" })
```

**Bugfix — RED CHECK avant DEV :** le test-writer est dispatche **avant** les dev-* pour livrer le test de
reproduction (statut `regression`). Des son DONE, dispatcher `qa` en `Scope : red-check` (ce seul test, sur
le code non corrige — il doit **echouer**). `RED CHECK KO` (le test passe) → retour au test-writer, sans
compter de cycle. `RED CHECK OK` → lancer le DEV. Voir `context/COMMON.md` 15.5.

**Après DEV parallèle — Résolution des conflits de merge**

Si backend et frontend ont travaillé en parallèle, avant de passer à REVIEW :

```
SendMessage({ to: "dev-backend", content: "
  Merge la branche dev-frontend dans la branche courante.
  Résoudre les éventuels conflits (tu es lead merge).
  Handoff dev-frontend : _work/handoff/dev-frontend-[timestamp].md
  Réponse : DONE/FAILED + conflits résolus + SHA merge commit.
" })
```

- DONE → Phase REVIEW (test-writer a déjà produit ses livrables)
- FAILED → escalade utilisateur (conflits non résolvables automatiquement) ← GATE 2b
