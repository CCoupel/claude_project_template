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
Exécuter la tâche                      ← pas d'accusé de réception : le premier jalon ou le DONE en tient lieu
Écrire le livrable dans un fichier
SendMessage({ to: "team-lead", content: "[NOM] DONE\n<verdict + références fichiers>" })
Retour en IDLE
```

> **Économie de tokens** : chaque message reçu réveille le teamleader (un tour complet de son contexte). Aucun
> message sans information : pas d'`ACTIF` à la réception d'une tâche (seulement au spawn), pas de « bien reçu »,
> pas de « je commence ». `ACTIF` reste l'**état** d'un agent qui travaille (tâche reçue, pas encore `DONE`).

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
- À la réception : lire le fichier avant d'agir. Fichier introuvable → `[NOM] BLOQUE` (raison en une ligne).
- C'est **toi** qui confrontes ton livrable à l'ordre avant le `DONE` (ligne `Conformité :`, section 3) : le
  teamleader ne relit l'ordre et ton rapport qu'en cas de doute (`cdp.md` « Validation des Livrables par exception »).

---

## 3. Règle fondamentale — Livrables = fichiers

**Tout résultat est écrit dans un fichier. Jamais de contenu inline dans un message.**

| Type d'agent | Livrable | Emplacement |
|---|---|---|
| dev-*, test-writer | Code commité + handoff | SHA dans le message ; `_work/handoff/[agent]-[YYYYMMDD-HHmmss].md` (lu par les agents en aval : reviewer, test-writer, qa, autre dev) |
| planner, code-reviewer, qa, security, pr-reviewer, infra | Rapport | `_work/reports/[agent]-[YYYYMMDD-HHmmss].md` — **pas de handoff en plus** |
| Autres (doc-updater, deployer, marketing, generic) | Rapport **seulement s'il apporte une information** que le `DONE` ne porte pas | `_work/reports/...` |
| teamleader | Ordre (> 3 lignes) | `_work/tasks/[agent]-[YYYYMMDD-HHmmss].md` |

**Un `DONE` = au plus un fichier** (handoff **ou** rapport) — jamais le même contenu écrit deux fois.

Format du message DONE — les 2 premières lignes suffisent au teamleader pour décider sans ouvrir de fichier :
```
[NOM] DONE
Verdict : OK | OK AVEC RÉSERVES | KO — <résumé en une ligne : chiffres clés, ex. « 148/150 tests, 2 KO feature »>
Conformité : conforme à l'ordre | écart : <une ligne>
Handoff : _work/handoff/[agent]-[timestamp].md   (dev-*, test-writer)
Rapport : _work/reports/[agent]-[timestamp].md   (si applicable)
SHA : <commit>                                    (si applicable)
```

- `Verdict` reprend le verdict propre de l'agent (`APPROVED`/`REJECTED`, `VALIDATED`/`NOT VALIDATED`…) quand il
  en a un. `Conformité` = confrontation honnête à l'ordre : tout livrable manquant, partiel ou hors périmètre est un écart.
- Le teamleader **ne lit le fichier que** sur `KO`, `OK AVEC RÉSERVES`, un écart, un `BLOQUE`, ou pour préparer un GATE
  utilisateur. Un `DONE` sans ligne `Verdict`/`Conformité` est un rapport invalide (renvoyé pour correction).

### Rapports et handoffs — concis, en pyramide

Chaque fichier est écrit pour être **lu en partie** :

1. **En tête, un bloc `## Résumé` de 10 lignes maximum** : verdict, chiffres clés, liste des points bloquants
   (une ligne chacun avec `fichier:ligne`), action attendue. Le teamleader le lit avec `Read` limité aux
   20 premières lignes ; il doit suffire à décider.
2. **Ensuite, le détail — uniquement pour ce qui est KO ou à corriger** : problème, `fichier:ligne`, correction
   proposée. Jamais : ce qui passe (liste des tests verts, modules au-dessus du seuil, « points positifs »),
   paraphrase de l'ordre ou du plan, contenu copié d'un autre fichier (une référence suffit), log brut.
3. **Extraits de sortie** : 10 lignes utiles maximum par échec (message + premières lignes de stack) ; la sortie
   complète, si elle peut servir, va dans `_work/tmp/` et le rapport n'en donne que le chemin.

Cible : **rapport ≤ 80 lignes, handoff ≤ 40 lignes** (fichiers touchés, décisions prises, points d'attention pour
l'aval). Au-delà, c'est presque toujours du contenu qui n'est pas KO.

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
- Obligatoire dès que la tâche compte plus d'une unité significative (ex. QA : plus d'un lot). Sous ce seuil, le DONE suffit.
- **Cadence plafonnée** (chaque jalon réveille le teamleader) : un jalon au plus toutes les **5 minutes**, ou à
  chaque palier de **25 %** si c'est plus espacé — les unités terminées entre-temps sont regroupées dans le jalon
  suivant (`lots 4-6/12`). Exception : une **anomalie bloquante** (KO qui arrête la suite, environnement cassé) part
  tout de suite.
- Le teamleader relaie chaque jalon à l'utilisateur en **une ligne** (`teamleader.md`). Un jalon n'est pas un DONE :
  l'agent reste ACTIF jusqu'au DONE.
- Tout mot-clé de jalon propre à un agent est documenté à l'identique dans `<agent>.md` ET `cdp.md` (règle de la section 3).

**Demande `AVANCEMENT ?`** (envoyée seulement à un agent resté silencieux plus d'un intervalle — `cdp.md` « Point
d'avancement périodique ») : répondre
**immédiatement, en une ligne**, sans interrompre ni changer la tâche, puis reprendre :

```
SendMessage({ to: "team-lead", content: "[NOM] | <X>% | <unité> i/N (<nom>) | ETA-agent ~<N> min | <une ligne : RAS ou anomalie>" })
```

- `<X>%` = unités terminées / unités totales (les mêmes unités que les jalons), jamais une impression ; tâche sans
  découpage → estimer sur les étapes de l'ordre et le dire (`étape 1/1`).
- `ETA-agent` = ta propre estimation du temps restant ; inconnue → `?`.
- Bloqué → répondre `[NOM] BLOQUE — <raison>` (section 4) au lieu d'un pourcentage.

---

## 5. Commande CLEAR

Si tu reçois `/clear` via SendMessage :

```
1. Exécuter /clear                    ← vide le contexte de conversation
2. Re-lire .claude/agents/context/TEAMMATES_PROTOCOL.template.md
3. Re-lire .claude/agents/<nom>.template.md (+ compagnon .claude/agents/<nom>.md s'il existe)
4. Traiter le message suivant de ta boîte (la tâche, envoyée par le teamleader dans le même tour que le /clear) ;
   boîte vide → IDLE
```

Tu repars dans le même état qu'au démarrage de session — contexte propre, prêt pour une nouvelle tâche.
**Pas d'`ACTIF` après un `/clear`** : le teamleader enchaîne `/clear` puis la tâche sans attendre (un aller-retour
de moins par dispatch). Seul le spawn donne lieu à un `ACTIF`.

---

## 6. Sous-agents temporaires — voir `SUBAGENTS_PROTOCOL.md`

Délégation de `planner`, `code-reviewer` et `qa` à des sous-agents (spawn par le teamleader, échanges P2P, format des
retours) : `.claude/agents/context/SUBAGENTS_PROTOCOL.template.md` — à lire seulement si tu es l'un de ces
coordinateurs **et** que tu délègues.

## 7. Modèle et effort — voir `MODEL_EFFORT.md`

Résolution au spawn (compagnon > template), valeurs par défaut et signaux de réévaluation :
`.claude/agents/context/MODEL_EFFORT.template.md` — concerne celui qui spawne, pas le teammate.
