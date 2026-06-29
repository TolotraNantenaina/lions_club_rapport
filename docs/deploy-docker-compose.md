# Déploiement avec Docker Compose

## Prérequis

- Docker + Docker Compose sur le serveur
- Dépôt cloné, ex. `~/LIONS_CLUB_RAPPORT`

## Migration depuis `docker run`

Si un ancien conteneur existe avec le même nom :

```bash
cd ~/LIONS_CLUB_RAPPORT
git pull
./scripts/deploy-compose.sh --pull
```

Le script arrête et supprime l’ancien conteneur `lions-club-rapport`, puis lance Compose.

## Commandes manuelles

```bash
cd ~/LIONS_CLUB_RAPPORT
git pull
docker compose up -d --build
```

Vérifier :

```bash
docker compose ps
docker compose logs -f
```

Arrêter :

```bash
docker compose down
```

## Port

L’application écoute sur **3009** dans le conteneur et sur le host :

```text
http://localhost:3009
```

## Synchronisation des données

Les dossiers suivants sont montés en bind mount :

| Dossier serveur        | Dossier conteneur           |
|------------------------|-----------------------------|
| `./public/data`        | `/app/public/data`        |
| `./public/clubsIcons`  | `/app/public/clubsIcons`  |

Modifications côté serveur ou dans le conteneur : elles sont visibles des deux côtés sans rebuild.

Fichiers importants :

- `public/data/clubs.json`
- images dans `public/clubsIcons/`

Pour pousser les changements de données vers Git (cron) :

```bash
./scripts/sync-public-git.sh
```

## Mise à jour après changement de code

Un changement de code nécessite un rebuild :

```bash
git pull
docker compose up -d --build
```

Un changement uniquement dans `public/data` ou `public/clubsIcons` ne nécessite pas un rebuild.
