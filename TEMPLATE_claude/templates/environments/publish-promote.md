# Publish — {ENV_NAME} (mecanisme : promote)

> Genere depuis `TEMPLATE_claude/templates/environments/publish-promote.md` — selectionne car
> `infrastructure.environments[].publish.mode = "promote"` pour {ENV_NAME} dans
> `.claude/project-config.json`. Charge par `agents/deploy.md`, Tache PUBLISH {ENV_NAME}, etape
> [2. MECANISME]. Variables `$REPO_ROOT`, `$DIR_VERSION`, `$VERSION`, `$BUILD_DIR` heritees de la
> Tache BUILD executee juste avant, dans la meme session de l'agent.

Reutilise tel quel l'artefact candidat produit par BUILD — zero rebuild (voir principe BORE,
`agents/infra.md` section 3, mecanisme "promotion").

## Variables attendues

Aucune pour la copie locale (branche par defaut). Si le projet utilise la variante registre
Docker ou depot interne (branches commentees ci-dessous) :

| Variable | Usage |
|----------|-------|
| `REGISTRY_USER` / `REGISTRY_PASSWORD` | `docker login` avant `docker push` (variante Docker) |

```bash
# 1. Verification
test -d "$BUILD_DIR" || { echo "Aucun candidat trouve — executer /build d'abord"; exit 1; }

# 2. Promotion — dossier non gitte, a la racine du repo, SANS `a` dans son nom (artefact AVEC `a`)
TARGET_DIR="$REPO_ROOT/build/{ENV_NAME_LOWER}_v$DIR_VERSION"
mkdir -p "$TARGET_DIR"
cp "$BUILD_DIR/app-$VERSION.tar.gz" "$TARGET_DIR/app-$VERSION.tar.gz"
# ou (Docker, promotion = push de l'image deja construite en BUILD, pas de rebuild) :
#   [ -n "$REGISTRY_USER" ] && echo "$REGISTRY_PASSWORD" | docker login {PUBLISH_TARGET} -u "$REGISTRY_USER" --password-stdin
#   docker push {PUBLISH_TARGET}:$VERSION
# ou (depot interne, authentification git/gh ambiante — voir Tache BUILD) :
#   git push origin develop:{ENV_NAME_LOWER}

# 3. Notification
echo "Publication {ENV_NAME} terminee - $VERSION -> $TARGET_DIR/app-$VERSION.tar.gz"
```

## Echec

Pas de CI impliquee ici — verification a une ligne, pas de table de classification :
- Artefact candidat manquant (`$BUILD_DIR` absent) -> agent responsable `dev` (voir Protocole
  d'echec BUILD, `agents/deploy.md`).
- Cible de copie/registre inaccessible (permissions, disque plein, registre injoignable) ->
  agent responsable `infra`.

```
SendMessage({
  to: "main",
  content: "PUBLISH FAILED
Environnement : {ENV_NAME}
Version  : v[X.Y.Z.a]
Probleme : [candidat manquant | cible inaccessible]"
})
```

## Rollback

Aucun etat distant durable a annuler (pas de merge, pas de tag) — supprimer le contenu deja
copie si necessaire, corriger, relancer `/publish {ENV_NAME_LOWER}` :

```bash
rm -rf "$TARGET_DIR"
```
