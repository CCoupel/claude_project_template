# CDP_PHASES_RELEASE.md — Phases 5 et 6 — Build/Publish/QUALIF, validation manuelle, PROD

> Détail des phases du workflow CDP. Lu par le teamleader **à l'entrée de la phase** (voir `cdp.md`, « Phases 1 à 6 »).
> Contexte, délégation, validation des livrables et gates : `cdp.md`.

### Phase 5 — Build + Publish + Deploy QUALIF + Documentation Finalize (parallele)

> Phase 5 remplace les anciennes Phases 5 (DOC) et 6 (QUALIF) — elles s'executent maintenant en
> parallele. Le deployer enchaine en interne BUILD (compilation, agnostique a l'environnement)
> puis PUBLISH QUALIF (mise a disposition, mecanisme `promote`) puis DEPLOY QUALIF
> (installation) — voir `agents/deploy.template.md`.

**Validation infra (avant de lancer) :**
```
SendMessage({ to: "infra", content: "
  Valide que la procedure de deploiement QUALIF est coherente avec l'infrastructure definie.
  Si l'infrastructure pour QUALIF n'existe pas encore (premier deploiement sur cet
  environnement), la creer avant de valider (voir infra.md Mode Validation etape 0).
  Retourne : VALIDATED / NOT VALIDATED + ecarts detectes dans _work/reports/infra-[timestamp].md
" })
```
- NOT VALIDATED → escalade utilisateur avec le rapport d'ecarts ← GATE 4b (une infra absente et
  creee par infra n'est jamais un NOT VALIDATED — seule une incoherence l'est, voir infra.md)

**Si infra VALIDATED — dispatcher deployer + doc-updater (+ NR complete) dans le meme tour :**
```
SendMessage({ to: "deployer", content: "
  Build puis publie puis deploie en QUALIF depuis la branche [branche].
  Incremente toi-meme `a` avant le build (voir ton propre protocole, deploy.template.md — Tache BUILD)
  — n'attends pas de version fournie. Enchaine BUILD puis PUBLISH QUALIF puis DEPLOY QUALIF
  sans attendre de nouvel ordre. Ne rejoue aucun test au BUILD (deja valides par QA).
  [Si `testing.full_regression_at == build` : apres BUILD, attends mon message `NR VALIDATED`
  avant PUBLISH QUALIF.]
  Retourne : DONE + version publiee/deployee [X.Y.Z.a] + statut des services + smoke tests OK/KO.
" })

[Si `testing.full_regression_at` est `qualif` (defaut) ou `build`]
SendMessage({ to: "qa", content: "
  Scope : regression-full sur la branche [branche] (NR complete, precedee de `commands.audit` une
  fois par milestone). Reutilise _work/tests-ledger.md si l'arbre est inchange.
  Retourne : VALIDATED / NOT VALIDATED + rapport detaille (echecs classes par nature).
" })

SendMessage({ to: "doc-updater", content: "
  DOC FINALIZE — completer la documentation initiee en Phase 4.
  Ajouter : version dev courante [X.Y.Z] (a titre indicatif — le build QUALIF exact, avec son `a`,
  est rapporte separement par deployer), release notes, resultats QA si pertinents.
  Ne pas toucher {VERSION_FILE} — `a` est gere exclusivement par deployer.
  Retourne : DONE + fichiers modifies + SHA commit doc.
" })
```

**GATE 4 — s'ouvre uniquement quand TOUT est termine :**

Attendre DONE de deployer ET DONE de doc-updater ET (si `testing.full_regression_at` est `qualif` ou `build`)
le verdict VALIDATED de la NR complete avant de presenter a l'utilisateur. L'utilisateur n'est jamais invite
a valider une QUALIF dont la NR est KO ou pas encore terminee.

**NR complete NOT VALIDATED** → ne pas ouvrir le GATE 4, ne pas solliciter l'utilisateur : cycle++
(`tests/METRICS.md`), retour Phase DEV avec le rapport (echecs de nature `regression`), puis REVIEW + QA et
nouvelle Phase 5. `NR VALIDATED` en mode `build` : l'envoyer au deployer pour lever son attente.

```markdown
## QUALIF deployee + Documentation prete — Validation manuelle requise avant PROD

**Version deployee (QUALIF)** : [X.Y.Z.a — depuis le rapport deployer]   **Branche** : [branche]   **URL** : [url qualif]
**Binaire a tester** : [chemin exact — depuis le champ "Binaire" du rapport DEPLOY DONE]
**Documentation** : finalisee (SHA [sha])

> Tout est pret. Tester les scenarios ci-dessous, puis valider via la question qui suit (`AskUserQuestion`).
> Apres validation : aucune modification — PROD est purement mecanique.

### Issues integrees

[Si `ISSUE_NUMS[]` non vide, un item par issue ; sinon omettre cette section]
- #[num] — [titre]

### Ce qu'il faut valider

[Pour chaque scenario de la procedure :]
**Scenario N — [Nom]**
| Etape | Action | Resultat attendu |
|-------|--------|-----------------|
| 1 | [action] | [attendu] |
...

### Methode de test
[Prerequis, donnees de test, acces requis — depuis le fichier de procedure]

```

Apres ce resume (texte informatif), poser **via `AskUserQuestion`** : « QUALIF conforme — lancer le deploiement
PROD ? » — Oui, deployer en PROD (Recommandé) : tout est fige, PROD = zero modification / Non, ecart constate :
retour DEV, l'utilisateur decrit l'ecart (champ « Autre »). La commande `/deploy prod` reste un equivalent de « Oui ».

**Le deploy PROD reste bloque jusqu'a confirmation explicite.** ← GATE 4

Selon la reponse utilisateur :
- **Oui / `/deploy prod`** →
  > Les issues sont **deja fermees** (CI verte, Phase 4) — aucun changement sur elles. La validation du milestone
  > releve de l'utilisateur : verifier le milestone (100 % des issues fermees)
  Phase 6 (PROD) — les branches residuelles (milestone, PR mergees) sont supprimees en local et en remote en fin de deploiement reussi (`deploy.md`, Etape 6)
- **NON** →
  **Seules les issues concernees sont rouvertes** — les autres restent fermees. Determiner les issues concernees depuis
  la reponse de l'utilisateur (champ « Autre ») ; si elles ne sont pas designees sans ambiguite, poser un
  `AskUserQuestion` (`multiSelect: true`, une option par issue de `ISSUE_NUMS[]`) avant tout changement.
  > Pour chaque issue concernee : `reopen` + commentaire (ecart constate) ; le label `DONE` est retiré — la
  > destination dépend de la nature de la correction (jamais `EN COURS` par défaut) :

  **Cas A — correction dans le scope (bug, régression, précision) → retour Phase DEV :**
  > issues concernees → reset label `EN COURS` (`--add-label "EN COURS" --remove-label "DONE"`)
  - dev-* et test-writer : **pas de CLEAR** — leur contexte est la carte exacte de ce qu'ils ont construit
  - CLEAR(code-reviewer) + CLEAR(qa) + CLEAR(doc-updater)
  - Une fois REVIEW + QA a nouveau valides sur le fix, avant de repasser en GATE 4 :
    redispatcher `doc-updater` (`DOC FINALIZE` — rattrapage), **sauf si le fix n'a aucun
    impact documente ou observable** (ex : renommage interne, typo de commentaire).
    Jugement laxiste — en cas de doute sur l'impact doc, redispatcher (voir `deploy.md` étape 1ter).

  **Cas B — scope invalide (approche erronée, exigences changées) → retour Phase 1 :**
  > issues concernees → reset label `PLANNING` (`--add-label "PLANNING" --remove-label "DONE"`)
  - CLEAR(planner) → nouveau plan → GATE 2
  - Après réception du nouveau plan : CLEAR(dev-*) + CLEAR(test-writer) — contexte obsolète
  - CLEAR(code-reviewer) + CLEAR(qa) + CLEAR(doc-updater) avant redispatch

### Phase 6 — Publish + Deploiement PROD (via confirmation GATE 4)

> Cette phase s'execute pour toute invocation de `/deploy prod`, qu'elle survienne en
> confirmation GATE 4 en plein cycle CDP ou en commande directe hors cycle — aucune
> distinction, meme protocole dans les deux cas (voir `commands/deploy.template.md`). Le
> deployer enchaine en interne PUBLISH PROD (merge + tag officiel, rebuild deterministe via
> CI) puis DEPLOY PROD (installation) — voir `agents/deploy.template.md`. Aucun BUILD ici :
> l'artefact QUALIF deja valide est republie, jamais reconstruit ad hoc (exception : Hotfix,
> voir "Dispatch selon le Type de Workflow").

> **Principe absolu : PROD = zero modification.**
> A ce stade, code, tests, documentation et contrats sont figes et valides.
> Le deploiement PROD est purement mecanique — aucune correction, aucun ajustement.
> Si un probleme est detecte ici : STOP, escalade utilisateur, retour Phase DEV.

**Validation infra (avant de lancer) :**
```
SendMessage({ to: "infra", content: "
  Valide que la procedure de deploiement PROD est coherente avec l'infrastructure definie.
  Si l'infrastructure pour PROD n'existe pas encore (premier deploiement sur cet
  environnement), la creer avant de valider (voir infra.md Mode Validation etape 0).
  Retourne : VALIDATED / NOT VALIDATED + ecarts detectes dans _work/reports/infra-[timestamp].md
" })
```
- NOT VALIDATED → escalade utilisateur avec le rapport d'ecarts ← GATE 4c (aucune correction ici
  — retour Phase DEV ; une infra absente et creee par infra n'est jamais un NOT VALIDATED, voir
  infra.md)

**Mode `testing.full_regression_at == prod`** : avant ce dispatch, verifier dans `_work/tests-ledger.md` une NR
complete VALIDATED pour l'arbre courant ; sinon dispatcher `qa` (`Scope : regression-full`) et **refuser
`/deploy prod`** tant qu'elle n'est pas VALIDATED.

**Dispatch systematique — deploiement + preparation marketing (meme tour), quel que soit le
type de workflow (y compris Hotfix — voir aussi section "Dispatch selon le Type de Workflow") :**

```
SendMessage({ to: "deployer", content: "
  Publie puis deploie en PROD la version [X.Y.Z] — l'artefact [X.Y.Z.a] est deja publie et
  valide en QUALIF. Enchaine PUBLISH PROD (merge → main → tag officiel vX.Y.Z, declenche le
  rebuild deterministe via CI) puis DEPLOY PROD (installation de l'artefact publie par la CI,
  verification du rollout) sans attendre de nouvel ordre.
" })

CLEAR(marketing)
SendMessage({ to: "marketing", content: "PREPARE v[X.Y.Z]" })
// Si `marketing.site == false` dans .claude/project-config.json (ordre direct de ne pas avoir de site) :
// SendMessage({ to: "marketing", content: "PREPARE v[X.Y.Z] — SANS SITE" })
```

Le CDP ne verifie rien en amont — ni l'existence d'un milestone, ni son contenu. C'est l'agent
marketing qui, en Phase PREPARE, resout lui-meme le milestone correspondant (par prefixe,
jamais par titre exact — voir `marketing-release.md` section Tache PREPARE) et decide seul de
la pertinence d'une publication : au moins une issue fermee labellisee
`feature`/`enhancement`/`breaking` → prepare du contenu ; sinon (que des
`fix`/`chore`/`refactor`, ou aucun milestone trouve → repli sur `CHANGELOG.md`) → rien a
publier. La preparation marketing ne depend pas du resultat du deploiement — le contenu du
milestone (issues fermees, labels) est deja fige avant le lancement du deploiement.

**Reponse de `marketing` (asynchrone, n'attend pas `deployer`) :**
- `MARKETING RIEN A PUBLIER` → `TaskStop(marketing)`, rien d'autre a faire, aucune sollicitation utilisateur.
- `MARKETING BLOQUE` avec bloc `Questions:` de cadrage (+ `Rapport : _work/reports/marketing-cadrage-[timestamp].md`) → aucun site marketing
  n'existe et aucun ordre `SANS SITE` n'a ete donne : **initialisation du site** ← **GATE 4e** :
  ```
  Aucun site marketing n'existe pour ce projet — initialisation necessaire (v[X.Y.Z]).
  Maquette proposee (hypotheses a confirmer) : [URL Artifact tiree du rapport]
  Questions de cadrage : [bloc `Questions:` du message, avec la valeur par defaut proposee pour chacune]
  ```
  Puis poser **via `AskUserQuestion`** (un seul appel) les questions de cadrage du rapport — une question par
  point, options = les choix proposes par `marketing` (valeur par defaut « (Recommandé) ») — plus une question
  « Initialiser le site marketing ? » : Oui avec les reponses ci-dessus (Recommandé) / Pas de site.
  - Reponses → `SendMessage({ to: "marketing", content: "PREPARE v[X.Y.Z] — cadrage : [reponses]" })` (pas de
    `CLEAR`) ; marketing repond ensuite `MARKETING PRET` (maquette a jour → GATE 4d ci-dessous).
  - « Pas de site » → enregistrer `"marketing": { "site": false }` dans `.claude/project-config.json` (ne plus
    jamais proposer), puis `SendMessage({ to: "marketing", content: "PREPARE v[X.Y.Z] — SANS SITE" })`.
  - Tant que l'utilisateur n'a pas repondu, rien n'est publie (`mockup_ok` reste faux) ; le deploiement PROD
    n'est pas bloque.
- `MARKETING BLOQUE — [raison]` → verification du site impossible (remote injoignable...) : ne rien publier,
  informer l'utilisateur de la raison et proposer de relancer `PREPARE` une fois le probleme resolu ; si la
  raison est « apercu Artifact impossible », presenter l'apercu local (`_work/marketing/preview.html`) au
  GATE 4d a la place de l'URL.
- `MARKETING PRET — rapport: _work/reports/marketing-[timestamp].md` → lire le rapport, puis
  presenter a l'utilisateur ← **GATE 4d** :
  ```
  Maquette de communication prete pour v[X.Y.Z] :
  [resume tire du rapport]
  [Apercu visuel complet (site) : URL Artifact tiree du rapport, si un site marketing est concerne]
  [Version mise en evidence : v[X.Y.Z] — badges « Nouveau » poses par cette release : liste tiree du rapport]
  ```
  Puis poser **via `AskUserQuestion`** : « Valides-tu cette maquette de communication pour v[X.Y.Z] ? » —
  Oui, valider (Recommandé) : publication des que le deploiement PROD est confirme / Non : l'utilisateur
  precise les ajustements attendus (champ « Autre »).
  - Refus / corrections demandees → `SendMessage({ to: "marketing", content: "PREPARE v[X.Y.Z] — corrections : [...]" })`
    (pas de `CLEAR` — le contexte de ce qui a deja ete produit doit etre conserve), reboucler jusqu'a validation.
  - Valide → `mockup_ok = true`.

**Reponse de `deployer` :**
- Rollout PROD OK → `deploy_ok = true`, poursuivre la cloture de milestone (ci-dessous).
- Echec → gestion d'echec standard du deployer. Si `marketing` a deja produit une maquette
  (PRET ou en attente de validation) → `TaskStop(marketing)` **sans jamais dispatcher `PUBLISH`**
  — rien n'est publie pour une release qui n'a pas ete livree.

**Publication marketing — des que les deux conditions sont vraies (peu importe l'ordre d'arrivee) :**
```
deploy_ok == true ET mockup_ok == true
  → SendMessage({ to: "marketing", content: "PUBLISH" })  // pas de CLEAR avant PUBLISH : continuite avec PREPARE
  → Attendre MARKETING TERMINE
  → TaskStop(marketing)
```

> **Emplacement du site** : le site marketing vit uniquement sur la branche `gh-pages`. `MARKETING/` en est le
> worktree git (commit + push depuis ce worktree) — jamais un dossier commite sur la branche de code
> (`main`, `milestone/*`, `hotfix/*`). Les release notes et posts restent sur la branche de code, dans
> `docs/releases/`. Le CDP ne commite jamais `MARKETING/` lui-meme.

Apres rollout PROD OK — verifier le milestone via GitHub MCP :
```
mcp__plugin_github_github__issue_read — lister les issues ouvertes du milestone actif
```
- **Milestone a 100%** (aucune issue ouverte) → fermer le milestone :
  `mcp__plugin_github_github__issue_write` (milestone state: closed) + informer l'utilisateur
- **Issues encore ouvertes** → alerter :
  ```
  Milestone [version] — [N] issue(s) encore ouverte(s) :
  - #[num] [titre]
  Le milestone reste ouvert jusqu'a leur livraison.
  ```

**Apres DEPLOY PROD reussi — promotion des tests** : dans `tests/INDEX.md`, passer de `feature` a
`regression` tous les lots du milestone deploye (`context/COMMON.md` 15.1 ; creer la ligne d'un lot qui n'en aurait pas) et commiter (`test(index): promote
vX.Y.Z tests to regression`).

Informer l'utilisateur du resultat du deploiement (et de la publication marketing si applicable).
