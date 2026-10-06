# TEAMMATES_PROTOCOL.md — Protocole Standard des Agents

**Chaque agent doit lire ce fichier au démarrage avant toute action.**

> **Interlocuteur unique = le teamleader.** Le teamleader est le Claude principal ; son adresse
> `SendMessage` est **`main`** (c'est l'adresse la plus fiable). Tout message vers le teamleader
> s'écrit donc `SendMessage({ to: "main", ... })`. Dans le texte, tu parles toujours du
> **teamleader** — jamais du « CDP » ni de « main » comme d'un rôle distinct : c'est la même entité.
> Le nom de rôle « CDP » désigne uniquement les règles d'orchestration (`cdp.md`) que le teamleader applique.

---

## 1. Démarrage

```
1. Lire ce fichier
2. Lire .claude/agents/<nom>.md
3. SendMessage({ to: "main", content: "[NOM] ACTIF" })
4. Passer en IDLE — attendre les instructions du teamleader
```

> **Agent générique** : `<nom>` est le nom d'instance donné par le teamleader ; à l'étape 2 lire en plus
> `.claude/agents/generic.template.md` puis la spécification `.claude/agents/generic.<nom>.md`.

---

## 2. Réception d'une tâche

```
SendMessage({ to: "main", content: "[NOM] ACTIF" })   ← confirmer réception
Exécuter la tâche
Écrire le livrable dans un fichier
SendMessage({ to: "main", content: "[NOM] DONE\n<références fichiers>" })
Retour en IDLE
```

---

## 3. Règle fondamentale — Livrables = fichiers

**Tout résultat est écrit dans un fichier. Jamais de contenu inline dans un message.**

| Type d'agent | Livrable | Emplacement |
|---|---|---|
| dev-*, test-writer | Code commité | SHA uniquement dans le message |
| planner, code-reviewer, qa, security | Rapport | `_work/reports/[agent]-[YYYYMMDD-HHmmss].md` |
| Tous | Handoff | `_work/handoff/[agent]-[YYYYMMDD-HHmmss].md` |

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
jamais directement — tu ne parles qu'au teamleader (`main`). Chaîne obligatoire :

```
teammate  →  BLOQUE + questions structurées (SendMessage → main)
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
- Si la tâche référence un handoff (`_work/handoff/...`) ou un rapport (`_work/reports/...`) → lire le fichier avant de commencer

---

## 4b. Jalons de progression (anti effet tunnel)

Une tâche qui se découpe en plusieurs unités (lots de tests, modules, fichiers, étapes) **ne reste jamais
silencieuse jusqu'au DONE** : à la fin de chaque unité, envoyer un jalon au teamleader :

```
SendMessage({ to: "main", content: "[NOM] EN COURS — <unité> i/N (<nom>) — <mesure>, <anomalies>" })
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
2. Re-lire TEAMMATES_PROTOCOL.md
3. Re-lire .claude/agents/<nom>.md
4. SendMessage({ to: "main", content: "[NOM] ACTIF" })
5. Passer en IDLE — attendre la prochaine tâche
```

Tu repars dans le même état qu'au démarrage de session — contexte propre, prêt pour une nouvelle tâche.

---

## 6. Exception — Sous-agents temporaires (`planner`, `code-reviewer`, `qa` uniquement)

Toutes les règles ci-dessus supposent une communication exclusive avec `main`. **Trois exceptions
existent**, chacune limitée à l'agent concerné :

- `planner` peut demander au teamleader de spawner des `sub-planner-N` temporaires et communiquer avec
  eux **directement, sans relayer via `main`** — protocole complet dans
  `agents/implementation-planner.md` section "Délégation à des Sous-Planners". Fermeture différée
  à la sortie de la Phase Plan (boucle de révision GATE 2 comprise).
- `code-reviewer` peut demander au teamleader de spawner des `sub-reviewer-<dimension>` temporaires,
  même principe — protocole complet dans `agents/code-reviewer.md` section "Délégation à des
  Sous-Reviewers". Fermeture immédiate après consolidation (pas de boucle de révision côté
  review).
- `qa` peut demander au teamleader de spawner des `sub-qa-<scope>` temporaires, même principe —
  protocole complet dans `agents/qa.md` section "Délégation à des Sous-QA". Fermeture immédiate
  après consolidation. Particularité : chaque sub-qa isole son exécution avec un `git worktree`
  créé/nettoyé en `Bash` — jamais via le paramètre `isolation` de l'outil `Agent`, qui change la
  classification du spawn (voir `agents/qa.md` pour le détail).

Aucun autre teammate n'est autorisé à ce pattern. Les sous-agents temporaires eux-mêmes suivent
une variante minimale du protocole standard : ils rapportent `ACTIF`/`DONE`/`BLOQUÉ` à l'agent
qui les a fait spawner (pas à `main`), et ne spawnent jamais rien eux-mêmes. Ils ne ferment
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
