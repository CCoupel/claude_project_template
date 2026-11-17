# SUBAGENTS_PROTOCOL.md — Sous-agents temporaires

> Extrait de `TEAMMATES_PROTOCOL.md` (numérotation conservée) : lu **seulement** par un coordinateur (`planner`,
> `code-reviewer`, `qa`) qui délègue à des sous-agents, et par le teamleader qui les spawne. Les autres agents n'en
> ont pas besoin — ce découpage leur évite de le charger à chaque démarrage et à chaque `/clear`.

## 6. Exception — Sous-agents temporaires (`planner`, `code-reviewer`, `qa` uniquement)

Toutes les règles de `TEAMMATES_PROTOCOL.md` supposent une communication exclusive avec le teamleader. **Trois exceptions
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
- **Jalons** : un sous-agent envoie ses jalons `EN COURS` (format `TEAMMATES_PROTOCOL.md` section 4b) à son **coordinateur**, pas au teamleader.
  Le coordinateur les agrège en **un seul jalon** pour le teamleader (ex. `QA EN COURS — sub-qa 2/3 terminés (unit OK, integration en cours) — 412/612 tests, 2 KO`).
- Aucun autre échange direct entre teammates n'est autorisé : toute autre demande passe par le teamleader.
