# Commande /refactor

Workflow pour le refactoring de code sans changement fonctionnel.

## Usage

```
/refactor <description du refactoring>
```

## Argument recu

$ARGUMENTS

## Mots-cles de controle

**Reference :** Voir `context/COMMON.md` section 12

| Mot-cle | Action |
|---------|--------|
| `help` | Affiche l'aide et les mots-cles disponibles |
| `status` | Affiche l'etat du workflow en cours |
| `plan` | Affiche le plan sans executer |
| `resume <phase>` | Reprend a une phase |
| `skip <phase>` | Saute une phase |
| `jumpto <tache>` | Demarre a une tache precise du plan |

Si `$ARGUMENTS` commence par un mot-cle -> executer l'action correspondante.
Sinon -> workflow normal.

## Quand utiliser

- Simplification de code complexe
- Extraction de fonctions/composants
- Renommage pour meilleure lisibilite
- Elimination de duplication
- Amelioration de la structure
- Migration technique (ex: class -> hooks)

## Workflow

```
/refactor <description>
    |
    v
[ANALYSE] --> Identifier le code concerne
    |         Verifier la couverture de tests
    v
[PLAN] --> Pour refactorings complexes uniquement
    |
    v
[DEV] --> Refactoring incremental
    |       Tests entre chaque etape
    v
[REVIEW]   [QA] --> Tests complets, en parallele de REVIEW par defaut (context/QUALITY.md section 12)
    |           |
     `----+-----'
          v
   Fin refactor (pas de DOC)
```

## Etapes Detaillees

### 1. ANALYSE

**Obligatoire avant tout changement :**
- Identifier tous les fichiers concernes
- Verifier la couverture de tests existante
- Comprendre le comportement actuel
- Lister les dependances

**Si couverture insuffisante** : Ecrire les tests AVANT le refactoring.

### 2. PLAN (optionnel)

Pour refactorings complexes :
- Plusieurs modules impactes
- Changement de structure majeur
- Risque de regression eleve

### 3. DEV

**Approche incrementale :**

```
Etape 1 --> Tests OK --> Commit
    |
Etape 2 --> Tests OK --> Commit
    |
Etape 3 --> Tests OK --> Commit
    |
    v
Refactoring complet
```

**Regles :**
- Un commit par changement logique
- Tests apres chaque etape
- Si tests cassent : rollback et recommencer plus petit

### 4. REVIEW

Focus sur :
- Comportement identique
- Pas de regression
- Code plus lisible/maintenable
- Performance equivalente ou meilleure

### 5. QA

- Suite de tests complete
- Comparaison avant/apres si possible
- Verification des performances

## Exemples

```
/refactor Extraire la logique de validation dans un helper
/refactor Convertir UserList de class component en hooks
/refactor Renommer handleClick en handleSubmitForm
/refactor Deplacer les constantes dans un fichier dedie
/refactor Simplifier le switch/case dans le router
/refactor Eliminer la duplication entre UserCard et AdminCard
```

## Ce que /refactor n'est PAS

| Refactor | Pas Refactor (utiliser /feature ou /bugfix) |
|----------|---------------------------------------------|
| Renommer variable | Ajouter nouvelle fonctionnalite |
| Extraire fonction | Corriger un bug |
| Reorganiser code | Changer le comportement |
| Simplifier logique | Ajouter validation |
| Supprimer duplication | Optimiser performances |

## Regles Critiques

1. **Tests AVANT** - Verifier la couverture existante
2. **Comportement identique** - Aucun changement fonctionnel
3. **Incremental** - Petits changements, tests frequents
4. **Commits atomiques** - Un commit par etape
5. **Rollback facile** - Si ca casse, on revient en arriere

## Anti-patterns

- Refactorer sans tests
- Melanger refactoring et nouvelle feature
- Tout changer d'un coup
- Ne pas commiter entre les etapes
- Ignorer les tests qui cassent

## Prompt a transmettre au CDP

Orchestre le workflow REFACTOR pour {PROJECT_NAME}.

**Contexte projet :** Voir `context/COMMON.md` section 1
**Workflow CDP :** Voir `context/CDP_WORKFLOWS.md`
- Type : REFACTOR
- Phases : section 3
- Dispatch DEV : section 5
- Validation : section 6
- Erreurs : section 7
- Regles : section 9

**Contexte DEV :** Voir `context/DEVELOPMENT.md`
**Contexte Qualite :** Voir `context/QUALITY.md` (dispatch Review/QA parallele par defaut : section 12)

**Demande utilisateur :** $ARGUMENTS

## Agent

Délègue au Claude principal (main) (`teamleader.md`) en mode refactor (pas de DOC, focus sur tests).
