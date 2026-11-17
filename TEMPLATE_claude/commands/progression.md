---
description: "Demande a chaque teammate son statut de progression et affiche un tableau de synthese. A utiliser pendant un workflow actif pour eviter l'effet tunnel. Peut etre invoquee par l'utilisateur directement ou le Claude principal."
---

# /progression — Tableau de Bord de l'Equipe

Cette commande interroge tous les agents actifs de la team et compile un tableau de synthese
de l'avancement du workflow en cours.

**Peut etre invoquee par :**
- L'utilisateur directement (depuis Claude Code)
- Le **teamleader** — pour superviser l'ensemble de la team
Dans tous les cas, c'est l'agent qui reçoit la commande qui orchestre les `SendMessage`
vers les teammates et compile le tableau.

## Execution

Le teamleader envoie une demande de statut à chaque agent actif **en parallele** (un seul message) — les agents
`dev-*` sont ceux de la table `## Agents Disponibles` de `CLAUDE.md` (une ligne par instance, ex. `dev-firmware-capteur`) :

```
SendMessage({ to: "planner",       content: "AVANCEMENT ? — format : [NOM] | <X>% | <unite> i/N (<nom>) | ETA-agent ~<N> min | <une ligne>" })
SendMessage({ to: "dev-backend",   content: "AVANCEMENT ? — format : [NOM] | <X>% | <unite> i/N (<nom>) | ETA-agent ~<N> min | <une ligne>" })
SendMessage({ to: "dev-frontend",  content: "AVANCEMENT ? — format : [NOM] | <X>% | <unite> i/N (<nom>) | ETA-agent ~<N> min | <une ligne>" })
SendMessage({ to: "dev-firmware",  content: "AVANCEMENT ? — format : [NOM] | <X>% | <unite> i/N (<nom>) | ETA-agent ~<N> min | <une ligne>" })
SendMessage({ to: "code-reviewer", content: "AVANCEMENT ? — format : [NOM] | <X>% | <unite> i/N (<nom>) | ETA-agent ~<N> min | <une ligne>" })
SendMessage({ to: "qa",            content: "AVANCEMENT ? — format : [NOM] | <X>% | <unite> i/N (<nom>) | ETA-agent ~<N> min | <une ligne>" })
SendMessage({ to: "doc-updater",   content: "AVANCEMENT ? — format : [NOM] | <X>% | <unite> i/N (<nom>) | ETA-agent ~<N> min | <une ligne>" })
SendMessage({ to: "deployer",      content: "AVANCEMENT ? — format : [NOM] | <X>% | <unite> i/N (<nom>) | ETA-agent ~<N> min | <une ligne>" })
SendMessage({ to: "infra",         content: "AVANCEMENT ? — format : [NOM] | <X>% | <unite> i/N (<nom>) | ETA-agent ~<N> min | <une ligne>" })
SendMessage({ to: "security",      content: "AVANCEMENT ? — format : [NOM] | <X>% | <unite> i/N (<nom>) | ETA-agent ~<N> min | <une ligne>" })
```

> N'envoyer qu'aux agents effectivement spawnes dans la team — ignorer les absents.
> Format de reponse et calcul de l'ETA (vitesse moyenne depuis le dispatch) : `agents/cdp.md` « Point d'avancement
> periodique ». Ce point est aussi fait automatiquement toutes les `progress.interval_min` minutes (defaut 20) tant
> qu'un teammate est actif — `/progression` le declenche a la demande.

## Rapport de Synthese

Une fois toutes les reponses recues, afficher :

```markdown
## Progression — {PROJECT_NAME}
**Workflow** : [FEATURE|BUGFIX|HOTFIX|REFACTOR]   **Phase actuelle** : [Phase X — Nom]

| ID | Tache | Agent | Status | Dependance |
|----|-------|-------|--------|------------|
| 01 | [nom tache] | [agent] | ✅ Termine | — |
| 02 | [nom tache] | [agent] | 🔄 En cours (X% — ETA HH:MM) | — |
| 03 | [nom tache] | [agent] | ⏳ Attente dependance | tache-02 |
| 04 | [nom tache] | [agent] | 💬 Attente teammate | dev-backend |
| 05 | [nom tache] | [agent] | 👤 Attente validation | utilisateur |
| 06 | [nom tache] | [agent] | 🔴 Bloque | [raison technique] |

**Legende** : ✅ Termine | 🔄 En cours (X%) | ⏳ Attente dependance | 💬 Attente teammate | 👤 Attente validation | 🔴 Bloque

**Points d'attention** :
- [lister les blocages ou retards identifies, ou "RAS"]
```

## Regles

- Si un agent ne repond pas dans un delai raisonnable, le noter `⚠️ Sans reponse` dans le tableau
  et demander au teamleader de le reveiller ou de le respawner.
- Ne pas relancer le workflow — cette commande est en lecture seule, elle observe sans perturber.
- Peut etre invoquee a tout moment pendant un workflow actif.
