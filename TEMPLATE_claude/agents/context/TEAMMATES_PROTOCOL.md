# TEAMMATES_PROTOCOL.md — Protocole Standard des Agents

**Chaque agent doit lire ce fichier au démarrage avant toute action.**

> **Interlocuteur unique = le teamleader.** Le teamleader est le Claude principal.
>
> **Règle de nommage (valable dans tous les fichiers du template) :**
> - **Dans le texte** (instructions, rapports, messages) : toujours **« teamleader »**. Jamais « team-lead », ni « CDP »
>   comme interlocuteur — « CDP » ne désigne que les règles d'orchestration (`cdp.md`) que le teamleader applique.
> - **Dans le champ `to` de `SendMessage`** : toujours la chaîne **`"team-lead"`** — c'est le nom technique du
>   Claude principal dans la team, pas un rôle. `to: "teamleader"` est incorrect, et `to: "main"` aussi : vu d'un
>   teammate, `"main"` désigne sa propre conversation (le message est refusé).
>
> Exemple : « Tu remontes le `DONE` au teamleader » → `SendMessage({ to: "team-lead", content: "[NOM] DONE" })`.

---

## 1. Démarrage

```
1. Lire ce fichier
2. Lire .claude/agents/<nom>.template.md (+ compagnon .claude/agents/<nom>.md s'il existe)
3. SendMessage({ to: "team-lead", content: "[NOM] ACTIF" })
4. Passer en IDLE — attendre les instructions du teamleader
```

> **Agent générique** : `<nom>` est le nom d'instance donné par le teamleader ; à l'étape 2 lire en plus
> `.claude/agents/generic.template.md` puis la spécification `.claude/agents/generic.<nom>.md`.

---

## 2. Réception d'une tâche

```
Lire l'ordre : message court, ou fichier `_work/tasks/...` référencé (voir « Ordres du teamleader » ci-dessous)
SendMessage({ to: "team-lead", content: "[NOM] ACTIF" })   ← confirmer réception
Exécuter la tâche
Écrire le livrable dans un fichier
SendMessage({ to: "team-lead", content: "[NOM] DONE\n<références fichiers>" })
Retour en IDLE
```

### Ordres du teamleader — au-delà de 3 lignes, un fichier

La règle « fichier-first » vaut aussi dans le sens teamleader → teammate :

- **Ordre de 3 lignes ou moins** : inline dans le `SendMessage`.
- **Ordre de plus de 3 lignes** : le teamleader l'écrit dans `_work/tasks/[agent]-[YYYYMMDD-HHmmss].md`
  (un fichier par ordre, jamais réécrit) et n'envoie que le chemin + un résumé d'une ligne :

```
SendMessage({ to: "<agent>", content: "Tâche : _work/tasks/<agent>-<timestamp>.md — <résumé en une ligne>" })
```

- Le fichier contient : le périmètre, les fichiers à lire (plan, handoff, contrats) et les livrables attendus
  avec leurs chemins. Pas d'extrait de code ni de contenu copié d'un autre fichier : une référence suffit.
- **Exceptions inline** (toujours courts) : `/clear`, réponses à un `BLOQUE`, correction de rapport invalide.
- À la réception : lire le fichier **avant** d'envoyer `ACTIF`. Fichier introuvable → `[NOM] BLOQUE` (raison en une ligne).
- Le teamleader garde le droit de relire `_work/tasks/*.md` pour contrôler le `DONE` par rapport à la demande
  initiale (voir `teamleader.md`).

---

## 3. Règle fondamentale — Livrables = fichiers

**Tout résultat est écrit dans un fichier. Jamais de contenu inline dans un message.**

| Type d'agent | Livrable | Emplacement |
|---|---|---|
| dev-*, test-writer | Code commité | SHA uniquement dans le message |
| planner, code-reviewer, qa, security | Rapport | `_work/reports/[agent]-[YYYYMMDD-HHmmss].md` |
| Tous | Handoff | `_work/handoff/[agent]-[YYYYMMDD-HHmmss].md` |
| teamleader | Ordre (> 3 lignes) | `_work/tasks/[agent]-[YYYYMMDD-HHmmss].md` |

Format du message DONE :
```
[NOM] DONE
Handoff : _work/handoff/[agent]-[timestamp].md
Rapport : _work/reports/[agent]-[timestamp].md   (si applicable)
SHA : <commit>                                    (si applicable)
```

Format en cas de blocage :
```
[NOM] BLOQUE
Raison : [une ligne]
Action requise : [ce dont j'ai besoin]
```

**Besoin d'une information, d'une décision ou d'une validation de l'utilisateur** — **format unique pour
TOUS les agents, sans exception** (planner, marketing, deployer, infra, agents génériques, dev-*, qa...) :
un message `[NOM] BLOQUE` avec un bloc `Questions:` inline, tel que décrit ci-dessous. Les mots-clés
`BLOCKED`, `BESOIN CADRAGE` ou tout format ad hoc (questions seulement dans un rapport, liste libre,
mot-clé propre à l'agent) sont **interdits** : le teamleader ne les reconnaît plus comme demande de décision.
Tu ne lui écris
jamais directement — tu ne parles qu'au teamleader. Chaîne obligatoire :

```
teammate  →  BLOQUE + questions structurées (SendMessage → teamleader)
teamleader →  les convertit en AskUserQuestion (jamais de texte brut dans le chat)
utilisateur →  répond aux questions
teamleader →  te renvoie les réponses via SendMessage
```

Ton rôle est donc de **préparer des questions prêtes à être posées** : une question fermée, des
options chiffrées avec leur conséquence, et ton défaut recommandé. Plus c'est précis, moins
l'utilisateur aura à demander de clarification. Format imposé (un `BLOQUE` = 1 à 4 questions) :

```
[NOM] BLOQUE
Raison : [une ligne]
Rapport : _work/reports/[agent]-[timestamp].md   (contexte détaillé, si nécessaire)
Questions :
Q1 — [question précise, finissant par « ? »]
  - [label court] (Recommandé) : [conséquence concrète de ce choix]
  - [label court] : [conséquence concrète de ce choix]
  - [label court] : [conséquence concrète de ce choix]
Q2 — [question précise ?]  (multi-sélection)
  - [label court] : [conséquence]
  - [label court] : [conséquence]
```

Règles du format :
- **2 à 4 options** par question (limite de l'outil `AskUserQuestion` côté teamleader). Plus de réponses
  possibles → ne garder que les 3-4 plus plausibles ; l'utilisateur peut toujours répondre « Autre ».
- **Une seule option « (Recommandé) »** quand un défaut raisonnable existe (la mettre en premier).
- **Chaque option = label court + conséquence concrète** — jamais un mot seul, jamais « autre ».
- Pas d'option « Autre » manuelle : elle est ajoutée automatiquement.
- Choix non exclusifs → ajouter `(multi-sélection)` à la question.
- **Jamais de question ouverte** (« que veux-tu faire ? ») : proposer au moins 2 options ; la saisie libre
  passe par « Autre » côté utilisateur. Même une question de découverte (cadrage marketing, workshop) est
  formulée avec 2-4 options plausibles déduites du contexte.
- Questions liées regroupées dans **un seul** `BLOQUE` (pas de messages au compte-gouttes), **4 questions
  maximum** : au-delà, envoyer les 4 plus structurantes, puis un nouveau `BLOQUE` avec le reste après réception
  des réponses. Les questions restent **toujours dans le message** (jamais seulement dans un fichier) ;
  le contexte long va dans le fichier `Rapport :`.
- Question de validation d'un livrable : citer son chemin complet dans la question (règle : `commands/context/COMMON.md` §0).
- Ne reprends pas l'exécution tant que le teamleader ne t'a pas renvoyé les réponses.

Un `FAILED`/`BLOQUE` sans question (simple constat, ex. « build cassé ») garde `Action requise : [ce dont
j'ai besoin]` — le teamleader le reformule alors lui-même en `AskUserQuestion` (options de résolution).

**Mot-clé de fin — jamais de synonyme improvisé.** `[NOM]` est le libellé court que `cdp.md`
utilise pour dispatcher et attendre cet agent (ex. `doc-updater` répond `DOC DONE`, pas
`DOC-UPDATER DONE` ni `DOC-UPDATER TERMINE` — voir la table de routage dans `cdp.md`). Si
l'agent définit ses propres états intermédiaires (ex. `MARKETING PRET`, `MARKETING RIEN A
PUBLIER`), ils doivent être documentés à l'identique des deux côtés : dans `<agent>.md` ET
dans `cdp.md` (recherche du mot-clé exact). Avant de modifier un message de fin dans un
`<agent>.md`, vérifier ce que `cdp.md` attend réellement de cet agent — ne jamais dupliquer
le format sans le confronter à la table de dispatch.

---

## 4. Règles

- Confirmer chaque tâche reçue par ACTIF avant d'agir
- Jamais de communication directe avec l'utilisateur — tout via le teamleader
- Rester en IDLE après DONE — ne pas fermer ce pane
- Signaler les jalons en cours de route (EN COURS étape N/M) — voir section 4b
- Branche : l'ordre annonce la branche de travail ; la vérifier au démarrage, ne jamais la changer (`BRANCH REQUEST` au teamleader). Sur `BRANCH CHANGE PENDING` : commiter, s'arrêter, ACK ; reprendre sur `BRANCH CHANGE DONE` — voir `COMMON.md` « Branche Courante et Historique »
- Si la tâche référence un fichier d'ordre (`_work/tasks/...`), un handoff (`_work/handoff/...`) ou un rapport (`_work/reports/...`) → lire le fichier avant de commencer

---

## 4b. Jalons de progression (anti effet tunnel)

Une tâche qui se découpe en plusieurs unités (lots de tests, modules, fichiers, étapes) **ne reste jamais
silencieuse jusqu'au DONE** : à la fin de chaque unité, envoyer un jalon au teamleader :

```
SendMessage({ to: "team-lead", content: "[NOM] EN COURS — <unité> i/N (<nom>) — <mesure>, <anomalies>" })
```

Exemple QA : `QA EN COURS — lot 3/12 (integration/auth/login) — 148/612 tests, 2 KO`.

- Un jalon = une ligne, métadonnées uniquement (pas de contenu inline, cf. section 3) ; les anomalies sont nommées
  dès qu'elles apparaissent.
- Obligatoire dès que la tâche compte plus d'une unité significative (ex. QA : plus d'un lot). Sous ce seuil, ACTIF puis DONE suffisent.
- Le teamleader relaie chaque jalon à l'utilisateur en **une ligne** (`teamleader.md`). Un jalon n'est pas un DONE :
  l'agent reste ACTIF jusqu'au DONE.
- Tout mot-clé de jalon propre à un agent est documenté à l'identique dans `<agent>.md` ET `cdp.md` (règle de la section 3).

---

## 5. Commande CLEAR

Si tu reçois `/clear` via SendMessage :

```
1. Exécuter /clear                    ← vide le contexte de conversation
2. Re-lire .claude/agents/context/TEAMMATES_PROTOCOL.template.md
3. Re-lire .claude/agents/<nom>.template.md (+ compagnon .claude/agents/<nom>.md s'il existe)
4. SendMessage({ to: "team-lead", content: "[NOM] ACTIF" })
5. Passer en IDLE — attendre la prochaine tâche
```

Tu repars dans le même état qu'au démarrage de session — contexte propre, prêt pour une nouvelle tâche.

---

## 6. Exception — Sous-agents temporaires (`planner`, `code-reviewer`, `qa` uniquement)

Toutes les règles ci-dessus supposent une communication exclusive avec le teamleader. **Trois exceptions
existent**, chacune limitée à l'agent concerné :

- `planner` peut demander au teamleader de spawner des `sub-planner-N` temporaires et communiquer avec
  eux **directement, sans relayer via le teamleader** — protocole complet dans
  `agents/implementation-planner.md` section "Délégation à des Sous-Planners". Fermeture différée
  à la sortie de la Phase Plan (boucle de révision GATE 2 comprise).
- `code-reviewer` peut demander au teamleader de spawner des `sub-reviewer-<dimension>` temporaires,
  même principe — protocole complet dans `agents/code-reviewer.md` section "Délégation à des
  Sous-Reviewers". Fermeture immédiate après consolidation (pas de boucle de révision côté
  review).
- `qa` peut demander au teamleader de spawner des `sub-qa-<scope>` temporaires, même principe —
  protocole complet dans `agents/qa.md` section "Délégation à des Sous-QA". Fermeture immédiate
  après consolidation. Particularité : chaque sub-qa isole son exécution avec un `git worktree --detach`
  (sans branche, sur du code commité) créé/nettoyé en `Bash` — jamais via le paramètre `isolation` de l'outil `Agent`, qui change la
  classification du spawn (voir `agents/qa.md` pour le détail).

Aucun autre teammate n'est autorisé à ce pattern. Les sous-agents temporaires eux-mêmes suivent
une variante minimale du protocole standard : ils rapportent `ACTIF`/`DONE`/`BLOQUÉ` à l'agent
qui les a fait spawner (pas au teamleader), et ne spawnent jamais rien eux-mêmes. Ils ne ferment
jamais leur propre process — seul le teamleader les ferme (`TaskStop`), jamais l'agent coordinateur ni
eux-mêmes.

### Communication coordinateur ↔ sous-agents — mêmes règles que vers le teamleader

L'échange direct (planner/code-reviewer/qa ↔ leurs sous-agents) reste **fichier-first** pour économiser les tokens :

- **Ordre (coordinateur → sous-agent)** : périmètre + **chemin du rapport attendu** (`_work/reports/<agent>-<scope>-<timestamp>.md`)
  + références des fichiers à lire (plan, handoff, contrats). Pas de contenu copié dans le message.
- **Retour (sous-agent → coordinateur)** : le contenu (problèmes, verdict, tâches, risques) est **écrit dans le rapport** ;
  le message ne contient que `[NOM] DONE` + le chemin du rapport (+ SHA si applicable), ou `BLOQUE` + raison en une ligne.
  Jamais de contenu inline — le coordinateur lit le fichier lui-même.
- **Handoff** : un sous-agent qui produit un handoff l'écrit dans `_work/handoff/<sous-agent>-<timestamp>.md` et le référence
  dans son `DONE` ; seul le coordinateur le lit (le teamleader ne voit que le rapport consolidé).
- **Jalons** : un sous-agent envoie ses jalons `EN COURS` (format section 4b) à son **coordinateur**, pas au teamleader.
  Le coordinateur les agrège en **un seul jalon** pour le teamleader (ex. `QA EN COURS — sub-qa 2/3 terminés (unit OK, integration en cours) — 412/612 tests, 2 KO`).
- Aucun autre échange direct entre teammates n'est autorisé : toute autre demande passe par le teamleader.

---

## 7. Modèle et effort — résolution au spawn

Chaque agent, teamleader compris, a un `model:` et un `effort:` dans le frontmatter de son `<nom>.template.md` :
c'est la **valeur par défaut du template**. Un compagnon `<nom>.md` peut commencer par un frontmatter ne contenant
que `model:` et/ou `effort:` pour la **surcharger** (toute autre clé y est ignorée). Résolution, par priorité :

1. frontmatter du compagnon `<nom>.md` (instance générique : `generic.<nom>.md`, puis `generic.md`) ;
2. frontmatter du template `<nom>.template.md`.

**Au spawn**, celui qui spawne (le teamleader, seul à le faire) lit ces frontmatters et passe les valeurs résolues
**explicitement** à l'outil : `Task({ name, subagent_type: "<nom>", model: <résolu>, effort: <résolu>, prompt })`.
Jamais d'héritage implicite : un spawn sans `model`/`effort` fait tourner le teammate au modèle et à l'effort de la
session du teamleader, ce qui annule tout le réglage ci-dessous.

- **Sous-agents temporaires** (`sub-planner-N`, `sub-reviewer-<dimension>`, `sub-qa-<scope>`) : valeurs résolues de
  leur coordinateur (`planner`, `code-reviewer`, `qa`), sauf valeur explicite dans la demande de spawn.
- **Teamleader** : le Claude principal ne peut pas changer son propre modèle ; `/init-project` écrit les valeurs
  résolues (`teamleader.md` > `teamleader.template.md`) dans `.claude/settings.json` (`model`, `effortLevel`), et
  `/start-session` vérifie que la session tourne avec elles. Ne pas éditer `settings.json` à la main : modifier le
  compagnon puis relancer `/init-project` (mises à jour).

Valeurs par défaut du template :

| Agent | Modèle | Effort | Pourquoi |
|-------|--------|--------|----------|
| teamleader | `fable` | `medium` | Tient une machine à états à chaque tour : la capacité compte, pas la profondeur de réflexion |
| `planner` | `fable` | `high` | Une fois par milestone ; porte lots, contrats et ordre — une erreur coûte des cycles à toute l'équipe |
| `infra` | `opus` | `medium` | Validation à chaque déploiement ; la profondeur ne sert qu'à l'audit initial du pipeline |
| `security` | `sonnet` | `high` | Ponctuel (`/secu`), rare donc marginal |
| `code-reviewer` | `sonnet` | `medium` | À chaque lot, jusqu'à 3 cycles, plus les sous-reviewers : le `high` le plus coûteux du pipeline |
| `dev-*`, `test-writer`, `qa`, `pr-reviewer`, `deployer`, `generic` | `sonnet` | `medium` | Exécution bornée par un plan et des contrats |
| `marketing` | `sonnet` | `low` | Rédaction depuis des données GitHub |
| `doc-updater` | `haiku` | `low` | Mise à jour de documents |
