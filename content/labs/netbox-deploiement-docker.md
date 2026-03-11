---
title: "NetBox : Déploiement via Docker sur Ubuntu/Debian"
date: 2026-01-02
image: "/images/labs/og-netbox.png"
lastmod: 2026-03-11
description: "Déployer NetBox Community via Docker Compose sur Ubuntu/Debian pour gérer, documenter et automatiser son infrastructure réseau et datacenter."
categories: ["Infrastructure"]
tags: ["netbox", "docker", "docker-compose", "ipam", "dcim", "linux"]
difficulty: "intermédiaire"
author: "Komi Kpodohouin"
deploy_time: "~20min"
draft: false
---

NetBox est la référence open-source pour la documentation d'infrastructure IT. L'IPAM centralise la gestion des adresses IP et des préfixes réseau pour éviter les conflits et garder une vue claire des plages utilisées. Le DCIM inventorie les équipements physiques, leurs emplacements en baie, leurs interfaces et leur câblage. Les modules VLANs et Virtualisation permettent de documenter la segmentation réseau et de rattacher chaque VM à son hôte et à son segment. Conçu pour les équipes réseau et infrastructure, du homelab à l'opérateur télécoms.

---

## Objectif

Déployer **NetBox Community** via Docker Compose sur Ubuntu/Debian.

**Systèmes cibles** : Ubuntu 22.04+, Debian 11+  
**Niveau requis** : Administrateur système (sudo)

---

## Prérequis

### Caractéristiques minimales du serveur

| Ressource | Minimum |
|---|---|
| CPU | 2 vCPU |
| RAM | 4 Go |
| Disque OS | 20 Go |
| Disque données | 10 Go |



### Vérifications logicielles

| Prérequis | Commande de vérification |
|---|---|
| Accès sudo ou root | `sudo -v` |
| Connexion Internet active | `ping -c 2 google.com` |
| Docker installé et actif | `docker --version` |
| Docker Compose installé | `docker compose version` |
| Git installé | `git --version` |
| Port 8000 disponible | `ss -tlnp \| grep 8000` |

---

## Installation de Docker

Docker et Docker Compose sont requis avant de commencer. La procédure d'installation officielle est disponible à l'adresse suivante, choisir sa distribution et suivre les instructions :

<a href="https://docs.docker.com/engine/install/" target="_blank" style="color:#00BCD4; font-weight:bold;">docs.docker.com/engine/install</a>

Docker Compose est inclus dans les versions récentes de Docker Engine, aucune installation séparée n'est nécessaire.

Vérifier que l'installation est opérationnelle :

```bash
docker --version
docker compose version
```

---

## Cloner le dépôt NetBox Docker

Le projet **netbox-docker** est le dépôt officiel maintenu par la communauté NetBox pour le déploiement via conteneurs.

Cloner la branche `release` — toujours stable et recommandée en production :

```bash
sudo git clone -b release https://github.com/netbox-community/netbox-docker.git
```

```bash
ls
```
{{< img src="/images/labs/netbox/netbox-clone-ls.png" alt="Résultat du git clone : dossier netbox-docker créé" >}}

```bash
cd netbox-docker/
```

```bash
ls
```

{{< img src="/images/labs/netbox/netbox-ls-content.png" alt="Contenu du dossier netbox-docker" >}}

Ne pas modifier `docker-compose.yml` directement. On utilisera un fichier d'override à l'étape suivante.

---

## Configurer le port d'écoute

NetBox nécessite un fichier de surcharge nommé obligatoirement `docker-compose.override.yml` : Docker Compose le détecte et le fusionne automatiquement avec le fichier principal.

```bash
sudo nano docker-compose.override.yml
```

Attention à l'**indentation** (2 espaces, pas de tabulations) :

```yaml
services:
  netbox:
    ports:
      - 8000:8080
```

{{< img src="/images/labs/netbox/netbox-yml.png" alt="Contenu du fichier docker-compose.override.yml" >}}

Sauvegarder : `Ctrl+X`, `Y`, `Entrée`.

Le port `8080` est le port interne du conteneur. On l'expose sur `8000` de la machine hôte. NetBox sera accessible via `http://IP_SERVEUR:8000`.

---

## Télécharger les images Docker

```bash
sudo docker compose pull
```

{{< img src="/images/labs/netbox/netbox-pull.png" alt="Téléchargement des images Docker" >}}

Vérifier les images téléchargées :

```bash
sudo docker images
```

---

## Démarrer les conteneurs

```bash
sudo docker compose up -d
```
{{< img src="/images/labs/netbox/netbox-docker-images.png" alt="Demarrage des conteneurs" >}}

{{< callout type="warning" >}}
**L'erreur `netbox-docker-netbox-1 is unhealthy` au premier démarrage est normale et attendue.** NetBox initialise la base PostgreSQL, applique les migrations Django et prépare les fichiers statiques. Cette opération prend entre 2 et 5 minutes. Docker considère le conteneur comme "unhealthy" pendant cette phase car le healthcheck échoue avant que l'application soit opérationnelle.

Attendre quelques minutes avant de continuer.
{{< /callout >}}

Vérifier l'état après quelques minutes :

```bash
sudo docker compose ps
```

{{< img src="/images/labs/netbox/netbox-docker-ps.png" alt="Tous les conteneurs NetBox en état healthy" >}}

Tous les conteneurs doivent afficher `healthy` avant de continuer. Si `netbox-1` reste en erreur après 5 minutes, consulter la section Dépannage.

---

## Créer le compte administrateur

```bash
sudo docker compose exec netbox /opt/netbox/netbox/manage.py createsuperuser
```

{{< img src="/images/labs/netbox/netbox-createsuperuser.png" alt="Création du superutilisateur NetBox" >}}

{{< callout type="warning" >}}
NetBox impose un mot de passe d'au moins **12 caractères** contenant au moins **un chiffre**. Un mot de passe trop simple retourne :

`This password is too short. It must contain at least 12 characters.`
{{< /callout >}}

---

## Accéder à l'interface web

```
http://IP_SERVEUR:8000
```

{{< img src="/images/labs/netbox/netbox-connexion.png" alt="Page de connexion NetBox" >}}

Se connecter avec les identifiants créés à l'étape précédente. Le tableau de bord NetBox s'affiche avec les modules disponibles : Organisation, IPAM, DCIM, VPN, Virtualisation, Circuits.

{{< img src="/images/labs/netbox/netbox-dashboard.png" alt="Tableau de bord NetBox Community" >}}

---

## Dépannage

**`netbox-1` reste en erreur après 5 min** : Consulter les logs avec `sudo docker compose logs netbox`.

**Interface inaccessible sur le port 8000** : Vérifier le firewall avec `sudo ufw status` et ouvrir si nécessaire avec `sudo ufw allow 8000`.

**Erreur `port is already allocated`** : Un service utilise déjà le port 8000, changer dans `docker-compose.override.yml` ex : `8001:8080`.

**Mot de passe refusé** : Utiliser au moins 12 caractères avec un chiffre.

**Conteneur PostgreSQL en erreur** : Vérifier l'espace disque avec `df -h`.

**Erreur de permission sur les volumes** : Relancer avec `sudo docker compose down -v && sudo docker compose up -d` (supprime les données).
