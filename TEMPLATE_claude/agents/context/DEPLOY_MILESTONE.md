# DEPLOY_MILESTONE.md — Tâche MILESTONE du deployer

> Extrait de `agents/deploy.md` (titre conservé : « Tache MILESTONE »). Lu par le deployer **à la réception d'une
> tâche MILESTONE seulement**.

## Tache MILESTONE (cadrage et historique du milestone sur GitHub)

Tu es le seul a ecrire l'etat d'un milestone sur GitHub (`context/GITHUB.md` 3.0) : sa « Due date » (date de
demarrage) et deux **blocs** de sa description — « Cadrage » (comment le milestone est mene,
`context/MILESTONE_CADRAGE.md`) et « Historique » (etat courant, tableau des lots, journal date). Le texte de la
description hors blocs n'est jamais touche ; la description n'est jamais reecrite autrement.

Declencheurs (liste complete des evenements : `context/GITHUB.md` 3.0bis) :
- **`MILESTONE START vX.Y.Z`** (Phase Init) : due date = aujourd'hui **si vide** (jamais ecrasee), puis evenement
  `milestone → ▶ en cours`. Le `LABELS DONE` porte aussi les **donnees de l'intensite de depart**
  (MILESTONE_CADRAGE.md 3.1) :
  ```
  LABELS DONE
  vX.Y.Z demarre le <date> (ou : deja demarre le <date>)
  Type de version : patch|minor|major (derniere livree : <git describe --tags --abbrev=0, ou aucune>)
  Issues : <N> ; labels breaking/security : <liste des issues, ou aucun>
  QUALIF disponible : oui|non (entree QUALIF dans infrastructure.environments[])
  ```
- **`MILESTONE CADRAGE vX.Y.Z : intensite <i> ; test_writer <b> ; review <b> ; qualif <b> ; doc <agent|dev> ; team <liste>`**
  (apres le GATE 2) : reecrire le bloc « Cadrage » (`milestone_cadrage`), puis evenement
  `cadrage → 📋 <intensite> · tests:<test-writer|DEV> review:<oui|non> qualif:<oui|non> doc:<agent|DEV>` (l'etat resume
  toutes les options : une revision qui n'en change qu'une est tracee) avec le detail `valide au GATE 2` (ou la raison
  d'une revision).
- **Ligne `Milestone : <cible> → <etat> [— <detail>]`** dans n'importe quel ordre du teamleader (labels, QUALIF…) :
  l'appliquer apres le reste de l'ordre, et la reprendre dans le `DONE`.
- **Tes propres etapes** : DEPLOY QUALIF reussi, PUBLISH PROD lance, echec/rollback PROD, cloture (Etape 5) — sans
  attendre d'ordre (etats et details : 3.0bis).

```bash
# milestone_history CIBLE ETAT DATE [DETAIL] — lit la description sur stdin, ecrit la nouvelle sur stdout.
# CIBLE = milestone (etat courant) | LOT-N (tableau des lots) | autre mot (journal seul, ex. cadrage).
# Bloc entre marqueurs regenere ; texte hors bloc (et bloc cadrage) conserve. Etat identique a l'etat courant
# de la cible → description inchangee (idempotent : une reprise rejoue l'ordre sans doublon).
milestone_history() {
  awk -v cible="$1" -v e="$2" -v d="$3" -v det="${4:-}" '
    /^<!-- historique:debut/ { inb = 1; next }
    /^<!-- historique:fin/   { inb = 0; next }
    inb && /^\*\*Etat\*\* : / { etat = $0; next }
    inb && /^\| LOT-/ { split($0, f, "|"); l = f[2]; gsub(/ /, "", l)
                        if (!(l in lot)) ord[++nl] = l; lot[l] = $0; next }
    inb && /^- [0-9][0-9][0-9][0-9]-/ { hist[++nh] = $0
                        x = $0; sub(/^- [^ ]+ — /, "", x); c = x; sub(/ : .*$/, "", c)
                        v = x; sub(/^[^:]* : /, "", v); sub(/ — .*$/, "", v); last[c] = v; next }
    inb { next }
    { pre[++np] = $0 }
    END {
      if (cible == "milestone") { cur = etat; sub(/^\*\*Etat\*\* : /, "", cur); sub(/ \(depuis .*$/, "", cur) }
      else if (cible ~ /^LOT-/) { if (cible in lot) { split(lot[cible], f, "|"); cur = f[3]; gsub(/^ +| +$/, "", cur) } }
      else cur = last[cible]
      if (cur != e) {
        if (cible == "milestone") etat = "**Etat** : " e " (depuis " d ")"
        else if (cible ~ /^LOT-/) { if (!(cible in lot)) ord[++nl] = cible; lot[cible] = "| " cible " | " e " | " d " |" }
        hist[++nh] = "- " d " — " cible " : " e (det != "" ? " — " det : "")
      }
      while (np > 0 && pre[np] ~ /^[[:space:]]*$/) np--
      for (i = 1; i <= np; i++) print pre[i]
      if (np > 0) print ""
      print "<!-- historique:debut — maintenu par deployer, ne pas editer a la main -->"
      print (etat != "" ? etat : "**Etat** : planifie")
      if (nl > 0) { print ""; print "| Lot | Etat | Depuis |"; print "|---|---|---|"
                    for (i = 1; i <= nl; i++) print lot[ord[i]] }
      print ""; print "**Historique**"
      for (i = 1; i <= nh; i++) print hist[i]
      print "<!-- historique:fin -->"
    }'
}

# milestone_cadrage "LIGNE1|LIGNE2|..." — remplace (ou insere, juste avant le bloc historique) le bloc cadrage.
milestone_cadrage() {
  awk -v body="$1" '
    /^<!-- cadrage:debut/ { inc = 1; next }
    /^<!-- cadrage:fin/   { inc = 0; skip = 1; next }
    inc { next }
    skip && /^[[:space:]]*$/ { skip = 0; next }
    { skip = 0 }
    /^<!-- historique:debut/ && !done { emit(); done = 1 }
    { print }
    END { if (!done) { print ""; emit() } }
    function emit(  n, i, a) {
      print "<!-- cadrage:debut — maintenu par deployer, ne pas editer a la main -->"
      print "**Cadrage**"; n = split(body, a, "|"); for (i = 1; i <= n; i++) print "- " a[i]
      print "<!-- cadrage:fin -->"; print ""
    }'
}

NUM=<numero du milestone, matching par prefixe — GITHUB.md 3.1> ; TODAY=$(date +%F)
# Demarrage (MILESTONE START uniquement) : due date si vide, 12:00 UTC = meme jour affiche quel que soit le fuseau
DUE=$(gh api repos/{owner}/{repo}/milestones/$NUM --jq '.due_on // ""')
[ -z "$DUE" ] && gh api repos/{owner}/{repo}/milestones/$NUM --method PATCH -f due_on="$(date -u +%Y-%m-%dT12:00:00Z)"
DESC=$(gh api repos/{owner}/{repo}/milestones/$NUM --jq '.description // ""')
# Cadrage (MILESTONE CADRAGE uniquement) — une ligne par element, separees par « | »
NEW=$(printf '%s\n' "$DESC" | milestone_cadrage "Intensite : <i>|Tests : <test-writer ou agents DEV>|Review : <oui ou non>|QUALIF : <oui ou non>|Doc : <doc-updater ou agents DEV>|Team : <liste>")
# Evenement : CIBLE = milestone | LOT-N | cadrage ; ETAT = vocabulaire de GITHUB.md 3.0bis (icone comprise)
NEW=$(printf '%s\n' "${NEW:-$DESC}" | milestone_history "<CIBLE>" "<ETAT>" "$TODAY" "<DETAIL>")
[ "$NEW" != "$DESC" ] && gh api repos/{owner}/{repo}/milestones/$NUM --method PATCH --raw-field description="$NEW"
```

Etat identique a l'etat courant de la cible → aucune ecriture (un ordre rejoue apres une reprise ne cree pas de
doublon). Une ecriture GitHub en echec ne bloque jamais la tache principale : la signaler dans le `DONE`.
