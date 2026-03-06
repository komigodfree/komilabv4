---
title: "NetBox: Déploiement via Docker sur Ubuntu/Debian"
date: 2026-03-06
lastmod: 2026-03-06
description: "Déployer NetBox Community via Docker Compose sur Ubuntu/Debian pour gérer, documenter et automatiser son infrastructure réseau et datacenter."
categories: ["Infrastructure"]
tags: ["netbox", "docker", "docker-compose", "ipam", "dcim", "linux"]
difficulty: "debutant"
author: "Komi Kpodohouin"
deploy_time: "~20min déploiement estimé"
draft: false
---

## Objectif

Déployer **NetBox Community** via Docker Compose sur Ubuntu/Debian. NetBox est une application web open-source de référence pour la gestion, la documentation et l'automatisation des infrastructures réseau et datacenters couvrant l'IPAM (gestion des adresses IP), le DCIM (gestion des équipements physiques), les VLANs, les circuits, la virtualisation et bien plus.

**Systèmes cibles** — Ubuntu 22.04+, Debian 11+  
**Durée estimée** — 20 minutes  
**Niveau requis** — Administrateur système (sudo)

---

## Prérequis

| Prérequis | Commande de vérification |
|---|---|
| Accès sudo ou root | `sudo -v` |
| Connexion Internet active | `ping -c 2 google.com` |
| Docker installé et actif | `docker --version` |
| Docker Compose installé | `docker compose version` |
| Git installé | `git --version` |
| Port 8000 disponible | `ss -tlnp \| grep 8000` |

> **Installation Docker** — Si Docker n'est pas encore installé, se rendre sur [docs.docker.com/engine/install](https://docs.docker.com/engine/install/), choisir sa distribution Linux et suivre les instructions officielles. Docker Compose est inclus dans les versions récentes de Docker Engine.

---

## 1. Cloner le dépôt NetBox Docker

Le projet **netbox-docker** est le dépôt officiel maintenu par la communauté NetBox pour le déploiement via conteneurs.

Cloner la branche `release` — toujours stable et recommandée en production :

```bash
git clone -b release https://github.com/netbox-community/netbox-docker.git
```

Vérifier que le clonage s'est effectué correctement :

```bash
ls
```

{{< result >}}
netbox-docker
{{< /result >}}

Se positionner dans le dossier cloné :

```bash
cd netbox-docker/
```

Vérifier le contenu du dossier :

```bash
ls
```

{{< result >}}
Caddyfile  configuration  docker-compose.yml  env  LICENSE  README.md  startup_scripts
{{< /result >}}

> **Note** — Le fichier `docker-compose.yml` est le fichier principal de configuration des conteneurs. Ne pas le modifier directement. On utilisera un fichier d'override à l'étape suivante.

---

## 2. Configurer le port d'écoute

NetBox nécessite un fichier de surcharge Docker Compose pour définir le port d'exposition. Ce fichier **doit obligatoirement** être nommé `docker-compose.override.yml` — Docker Compose le détecte et le fusionne automatiquement avec le fichier principal.

Créer le fichier :

```bash
nano docker-compose.override.yml
```

Remplir avec le contenu suivant. Attention à l'**indentation** (2 espaces, pas de tabulations) :

```yaml
services:
  netbox:
    ports:
      - 8000:8080
```

Sauvegarder et quitter Nano :
- `Ctrl + X` pour quitter
- `Y` pour confirmer la sauvegarde
- `Entrée` pour valider le nom du fichier

> **Explication** — Le port `8080` est le port interne du conteneur NetBox. On l'expose sur le port `8000` de la machine hôte. NetBox sera donc accessible via `http://IP_SERVEUR:8000`.

---

## 3. Télécharger les images Docker

Récupérer toutes les images nécessaires depuis Docker Hub — NetBox, PostgreSQL, Redis :

```bash
docker compose pull
```

Cette opération peut prendre plusieurs minutes selon la connexion Internet. Une fois terminée, vérifier les images téléchargées :

```bash
docker images
```

{{< result >}}
REPOSITORY                      TAG       IMAGE ID       CREATED        SIZE
netboxcommunity/netbox          latest    xxxxxxxxxxxx   x days ago     xxx MB
postgres                        16        xxxxxxxxxxxx   x days ago     xxx MB
redis                           7         xxxxxxxxxxxx   x days ago     xxx MB
{{< /result >}}

---

## 4. Démarrer les conteneurs

Lancer tous les conteneurs en mode détaché (arrière-plan) :

```bash
docker compose up -d
```

Docker Compose crée le réseau, les volumes et démarre les conteneurs dans l'ordre de leurs dépendances. En fin d'exécution, tu obtiendras un résultat similaire à celui-ci :

{{< result >}}
✔ Network netbox-docker_default                Created    0.0s
✔ Volume netbox-docker_netbox-redis-cache-data Created    0.0s
✔ Volume netbox-docker_netbox-media-files      Created    0.0s
✔ Volume netbox-docker_netbox-reports-files    Created    0.0s
✔ Volume netbox-docker_netbox-scripts-files    Created    0.0s
✔ Volume netbox-docker_netbox-postgres         Created    0.0s
✔ Volume netbox-docker_netbox-redis-data       Created    0.0s
✔ Container netbox-docker-redis-cache-1        Started    0.2s
✔ Container netbox-docker-postgres-1           Started    0.2s
✔ Container netbox-docker-redis-1              Started    0.2s
✘ Container netbox-docker-netbox-1             Error      121.2s
✔ Container netbox-docker-netbox-worker-1      Created    0.0s
dependency failed to start: container netbox-docker-netbox-1 is unhealthy
{{< /result >}}

{{< callout type="warning" >}}
**L'erreur `netbox-docker-netbox-1 is unhealthy` est normale et attendue** — ne pas s'inquiéter.

Au premier démarrage, NetBox doit initialiser la base de données PostgreSQL, appliquer toutes les migrations Django et préparer les fichiers statiques. Cette opération prend entre **2 et 5 minutes**. Docker considère le conteneur comme "unhealthy" pendant cette phase d'initialisation car le healthcheck échoue avant que l'application soit pleinement opérationnelle.

Attendre quelques minutes et passer à l'étape suivante.
{{< /callout >}}

Vérifier l'état des conteneurs après quelques minutes :

```bash
docker compose ps
```

{{< result >}}
NAME                            STATUS          PORTS
netbox-docker-netbox-1          healthy         0.0.0.0:8000->8080/tcp
netbox-docker-postgres-1        healthy
netbox-docker-redis-1           healthy
netbox-docker-redis-cache-1     healthy
netbox-docker-netbox-worker-1   healthy
{{< /result >}}

> **Note** — Tous les conteneurs doivent afficher le statut `healthy` avant de continuer. Si `netbox-1` reste en erreur après 5 minutes, consulter la section Dépannage.

---

## 5. Créer le compte administrateur

NetBox est opérationnel mais aucun compte utilisateur n'existe encore. Créer le superutilisateur via la commande Django de gestion :

```bash
docker compose exec netbox /opt/netbox/netbox/manage.py createsuperuser
```

Le système demande successivement :

{{< result >}}
Username:
Email address:
Password:
Password (again):
{{< /result >}}

{{< callout type="warning" >}}
**Politique de mot de passe stricte**  NetBox impose un mot de passe d'au moins **12 caractères** contenant au moins **un chiffre**. Un mot de passe trop simple retournera l'erreur :

`This password is too short. It must contain at least 12 characters.`  
`Password must have at least one numeral.`

Choisir un mot de passe robuste dès le départ.
{{< /callout >}}

Une fois le compte créé :

{{< result >}}
Superuser created successfully.
{{< /result >}}

---

## 6. Accéder à l'interface web

Ouvrir un navigateur et accéder à NetBox :

{{< result >}}
http://IP_SERVEUR:8000
{{< /result >}}

Se connecter avec le `username` et le `password` créés à l'étape précédente. Le tableau de bord NetBox s'affiche avec les modules disponibles : Organisation, IPAM, DCIM, VPN, Virtualisation, Circuits et plus.

---

{{< img src="/images/netbox-dashboard.png" alt="Tableau de bord NetBox Community" >}}

## 7. Récapitulatif des commandes essentielles

| Action | Commande |
|---|---|
| Démarrer NetBox | `docker compose up -d` |
| Arrêter NetBox | `docker compose down` |
| Voir l'état des conteneurs | `docker compose ps` |
| Voir les logs en temps réel | `docker compose logs -f netbox` |
| Créer un superutilisateur | `docker compose exec netbox /opt/netbox/netbox/manage.py createsuperuser` |
| Mettre à jour NetBox | `docker compose pull && docker compose up -d` |

---

## 8. Dépannage

| Problème constaté | Solution |
|---|---|
| `netbox-1` reste en erreur après 5 min | Consulter les logs : `docker compose logs netbox` |
| Interface inaccessible sur le port 8000 | Vérifier le firewall : `sudo ufw status` et ouvrir si nécessaire : `sudo ufw allow 8000` |
| Erreur `port is already allocated` | Un service utilise déjà le port 8000 — changer le port dans `docker-compose.override.yml` ex: `8001:8080` |
| Mot de passe refusé à la création | Utiliser au moins 12 caractères avec un chiffre |
| Conteneur PostgreSQL en erreur | Vérifier l'espace disque disponible : `df -h` |
| Erreur de permission sur les volumes | Relancer avec : `docker compose down -v && docker compose up -d` (⚠ supprime les données) |
