# TEAMMATES_PROTOCOL.md — Protocole Standard des Agents

Ce fichier définit le comportement standard de tous les agents de la team.
**Chaque agent doit lire ce fichier au démarrage avant toute action.**

---

## 1. Démarrage

À la réception du message de spawn :

```
1. Lire ce fichier (TEAMMATES_PROTOCOL.md)
2. Lire son propre fichier de spec (.claude/agents/<nom>.md)
3. Envoyer l'ACK au teamleader :
   SendMessage({ to: "main", content: "[NOM-AGENT] ACTIF" })
4. Passer en IDLE — attendre les instructions du teamleader
```

**Ne pas exécuter de tâche au démarrage.** Le teamleader enverra la tâche via SendMessage après l'ACTIF.

---

## 2. Mode IDLE

En IDLE : **ne rien faire**. Attendre un message du teamleader.

À réception d'une tâche (message du teamleader) :
```
→ Confirmer réception : SendMessage({ to: "main", content: "[NOM-AGENT] ACTIF" })
→ Exécuter la tâche
→ DONE → retour en IDLE
```

---

## 3. Exécution de la tâche

```
Confirmer réception → SendMessage(main, "[NOM-AGENT] ACTIF")
    |
    v
Exécuter le travail
  (signaler les jalons au teamleader en cours de route)
    |
    v
Écrire le handoff dans _work/handoff/[agent]-[YYYYMMDD-HHmmss].md
    |
    v
Envoyer le rapport DONE → SendMessage(main, "[NOM-AGENT] DONE ...")
    |
    v
Retour en IDLE — attendre la prochaine tâche
```

**Après DONE : rester actif. Ne pas fermer ce pane.**

---

## 4. Communication

### Règles absolues

- **Jamais de communication directe** avec l'utilisateur — tout passe par le teamleader
- **Texte naturel uniquement** — pas de JSON structuré dans les messages
- **Livrables = fichiers** — jamais de contenu inline dans un message

### Push proactif de progression

| Jalon | Quand |
|-------|-------|
| ACTIF | Dès réception de la tâche — avant toute action |
| EN COURS | À chaque transition d'étape |
| BLOQUE | Dès qu'un blocage survient |
| DONE | Quand la tâche est terminée |

Format progression :
```
[NOM-AGENT] EN COURS — étape N/M — [label < 8 mots] — X%
```

### Format du rapport DONE

Agent de code (dev-*, test-writer) :
```
[NOM-AGENT] DONE
Handoff : _work/handoff/[agent]-[YYYYMMDD-HHmmss].md
Fichiers : chemin/fichier1, chemin/fichier2
SHA : <commit-sha>
```

Agent d'analyse (planner, code-reviewer, qa, security) :
```
[NOM-AGENT] DONE
Handoff : _work/handoff/[agent]-[YYYYMMDD-HHmmss].md
Rapport : _work/reports/[agent]-[YYYYMMDD-HHmmss].md
```

En cas d'échec :
```
[NOM-AGENT] FAILED
Raison : [une ligne — cause technique précise]
Action requise : [ce dont j'ai besoin]
```

### Livrables

| Type d'agent | Livrable | Emplacement |
|-------------|----------|-------------|
| dev-*, test-writer | Code commité | Référence par SHA uniquement |
| planner, code-reviewer, qa, security | Rapport d'analyse | `_work/reports/[agent]-[YYYYMMDD-HHmmss].md` |

### Handoff

```markdown
# Handoff — [Agent]

**Feature** : [description courte]
**SHA** : [commit sha ou N/A]

## Ce qui a été fait
## Décisions clés
## Points d'attention
## Fichiers modifiés
```

---

## 5. Réponse au statut (/progression)

```
[NOM-AGENT] | [EN COURS étape N/M X% | BLOQUE | IDLE] | [une ligne]
```

---

## 6. Règles Générales

1. **ACTIF immédiat** — confirmer réception de chaque tâche avant d'agir
2. **Pas d'initiative** — exécuter uniquement la tâche reçue
3. **Push proactif** — jalons sans être sollicité
4. **Pas de communication directe** avec l'utilisateur
5. **Persistance** — rester actif en IDLE après DONE, ne jamais fermer ce pane
6. **Livrables = fichiers** — jamais de contenu inline dans les messages

---

## 7. Exemple de Session

```
[SPAWN reçu]
→ Lit TEAMMATES_PROTOCOL.md ✓
→ Lit .claude/agents/dev-backend.md ✓
→ SendMessage(main, "DEV-BACKEND ACTIF")
→ [IDLE — attend la tâche]

[Message du teamleader : "Implémente l'endpoint /api/users ..."]
→ SendMessage(main, "DEV-BACKEND ACTIF")
→ SendMessage(main, "DEV-BACKEND EN COURS — étape 1/5 — analyse codebase — 20%")
→ [...]
→ SendMessage(main, "DEV-BACKEND DONE\nHandoff : _work/handoff/dev-backend-20240101-120000.md\nSHA : a3f1c2d")
→ [IDLE — attend la prochaine tâche]

[Message du teamleader : "Implémente maintenant l'endpoint /api/orders ..."]
→ SendMessage(main, "DEV-BACKEND ACTIF")
→ [cycle normal à nouveau]
```
