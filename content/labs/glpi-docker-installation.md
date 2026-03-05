---
title: "Déploiement de GLPI avec Docker — Installation complète"
date: 2026-03-05
lastmod: 2026-03-05
description: "Installer GLPI 10.x avec Docker et Docker Compose sur Ubuntu/Debian. Guide complet pas à pas, de l'installation de Docker jusqu'à la configuration initiale de GLPI."
categories: ["Infrastructure"]
tags: ["glpi", "docker", "docker-compose", "itsm", "mysql", "helpdesk"]
difficulty: "debutant"
author: "Komi Kpodohouin"
draft: false
---

## Objectif

Déployer GLPI (Gestionnaire Libre de Parc Informatique) dans des conteneurs Docker sur un serveur Linux. A la fin de ce lab, GLPI sera accessible via le navigateur, connecté à une base de données MySQL, et prêt à être configuré.

**Systèmes cibles** — Ubuntu 22.04 LTS / Debian 11+  
**Durée estimée** — 20 à 30 minutes  
**Niveau requis** — Accès SSH au serveur, droits sudo

---

## Prérequis

| Prérequis | Détail |
|---|---|
| Serveur Linux | Ubuntu 22.04+ ou Debian 11+ |
| Accès sudo | Compte avec privilèges administrateur |
| Connexion Internet | Pour télécharger les images Docker |
| RAM minimale | 2 Go recommandés |
| Espace disque | 10 Go minimum |

Vérifier que le système est à jour avant de commencer :

```bash
sudo apt update && sudo apt upgrade -y
```

---

## 1. Installation de Docker

### 1.1 Désinstaller les anciennes versions

Si Docker a déjà été installé manuellement ou via apt, supprimer les anciens paquets pour éviter les conflits :

```bash
sudo apt remove docker docker-engine docker.io containerd runc -y
```

> **Note** — Si aucun de ces paquets n'est installé, cette commande retourne une erreur sans conséquence. Continuer.

### 1.2 Installer les dépendances

Installer les paquets nécessaires pour que apt puisse utiliser un dépôt HTTPS :

```bash
sudo apt install ca-certificates curl gnupg lsb-release -y
```

### 1.3 Ajouter la clé GPG officielle de Docker

```bash
sudo install -m 0755 -d /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

> **Note Debian** — Remplacer `ubuntu` par `debian` dans la commande curl si tu es sur Debian.

### 1.4 Ajouter le dépôt Docker

```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

### 1.5 Installer Docker Engine et Docker Compose

```bash
sudo apt update

sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y
```

### 1.6 Vérifier l'installation

```bash
sudo docker run hello-world
```

Si l'installation est correcte, Docker télécharge une image de test et affiche un message de confirmation.

### 1.7 Permettre l'utilisation de Docker sans sudo (optionnel)

Par défaut Docker nécessite sudo. Pour l'utiliser sans :

```bash
sudo usermod -aG docker $USER
```

Se déconnecter et se reconnecter à la session pour que le changement prenne effet, puis vérifier :

```bash
docker ps
```

---

## 2. Préparation de l'environnement GLPI

### 2.1 Créer le dossier du projet

```bash
mkdir -p ~/glpi-docker && cd ~/glpi-docker
```

### 2.2 Créer le fichier docker-compose.yml

```bash
nano docker-compose.yml
```

Coller le contenu suivant :

```yaml
name: glpi

services:
  glpi:
    image: "glpi/glpi:latest"
    restart: "unless-stopped"
    volumes:
      - glpi_data:/var/glpi
    env_file: .env
    depends_on:
      - db
    ports:
      - "80:80"

  db:
    image: "mysql"
    restart: "unless-stopped"
    volumes:
      - db_data:/var/lib/mysql
    environment:
      MYSQL_RANDOM_ROOT_PASSWORD: "yes"
      MYSQL_DATABASE: ${GLPI_DB_NAME}
      MYSQL_USER: ${GLPI_DB_USER}
      MYSQL_PASSWORD: ${GLPI_DB_PASSWORD}

volumes:
  glpi_data:
  db_data:
```

Sauvegarder — `Ctrl+O` · `Entrée` · `Ctrl+X`

### 2.3 Créer le fichier .env

```bash
nano .env
```

Coller le contenu suivant — **changer le mot de passe** avant de continuer :

```bash
GLPI_DB_HOST=db
GLPI_DB_PORT=3306
GLPI_DB_NAME=glpi
GLPI_DB_USER=glpi
GLPI_DB_PASSWORD=MotDePasseSecurise123!
```

> **Attention** — Ne jamais utiliser `glpi` comme mot de passe en production. Choisir un mot de passe fort.

Sauvegarder — `Ctrl+O` · `Entrée` · `Ctrl+X`

### 2.4 Vérifier la structure des fichiers

```bash
ls -la ~/glpi-docker/
```

Le dossier doit contenir exactement deux fichiers : `docker-compose.yml` et `.env`.

---

## 3. Démarrage des conteneurs

### 3.1 Lancer GLPI

```bash
docker compose up -d
```

Docker télécharge les images MySQL et GLPI puis démarre les conteneurs. La première fois, cela peut prendre 2 à 5 minutes selon la connexion Internet.

### 3.2 Vérifier que les conteneurs tournent

```bash
docker compose ps
```

Les deux services `glpi` et `db` doivent afficher le statut `running`.

### 3.3 Suivre les logs au démarrage

```bash
docker compose logs -f glpi
```

Attendre de voir un message indiquant que GLPI est prêt. Quitter avec `Ctrl+C`.

---

## 4. Configuration initiale de GLPI

### 4.1 Accéder à l'interface web

Ouvrir un navigateur et aller sur :

```
http://IP-DU-SERVEUR
```

Remplacer `IP-DU-SERVEUR` par l'adresse IP du serveur. Si le test est fait en local, utiliser `http://localhost`.

### 4.2 Assistant d'installation

GLPI lance automatiquement l'installation. Suivre les étapes :

1. **Langue** — Choisir Français
2. **Licence** — Accepter
3. **Prérequis** — Tout doit être en vert
4. **Base de données** — Renseigner :
   - Hôte : `db`
   - Utilisateur : `glpi`
   - Mot de passe : celui défini dans `.env`
5. **Sélectionner la base** `glpi`
6. **Terminer l'installation**

### 4.3 Connexion initiale

| Compte | Login | Mot de passe |
|---|---|---|
| Super Admin | `glpi` | `glpi` |
| Admin | `tech` | `tech` |
| Technicien | `normal` | `normal` |

> **Attention** — Changer immédiatement tous ces mots de passe après la première connexion via **Administration > Utilisateurs**.

---

## 5. Configuration du support des fuseaux horaires

Cette étape est nécessaire pour que GLPI gère correctement les dates et les planifications.

### 5.1 Récupérer l'ID du conteneur MySQL

```bash
docker compose ps
```

Noter le nom du conteneur `db` (ex: `glpi-db-1`).

### 5.2 Récupérer le mot de passe root MySQL

```bash
docker logs glpi-db-1 2>&1 | grep "GENERATED ROOT PASSWORD"
```

Copier le mot de passe affiché.

### 5.3 Accorder les droits sur les fuseaux horaires

```bash
docker exec -it glpi-db-1 mysql -u root -p \
  -e "GRANT SELECT ON mysql.time_zone_name TO 'glpi'@'%'; FLUSH PRIVILEGES;"
```

Saisir le mot de passe root récupéré à l'étape précédente.

### 5.4 Activer les fuseaux horaires dans GLPI

```bash
docker exec -it glpi-glpi-1 /var/www/glpi/bin/console database:enable_timezones
```

---

## 6. Commandes utiles

| Action | Commande |
|---|---|
| Démarrer GLPI | `docker compose up -d` |
| Arrêter GLPI | `docker compose down` |
| Redémarrer | `docker compose restart` |
| Voir les logs | `docker compose logs -f` |
| Mettre à jour GLPI | `docker compose pull && docker compose up -d` |
| Accéder au shell GLPI | `docker exec -it glpi-glpi-1 bash` |

---

## 7. Dépannage

| Problème | Solution |
|---|---|
| Page blanche ou erreur 502 | La base de données démarre plus lentement que GLPI. Attendre 30 secondes et recharger. |
| Port 80 déjà utilisé | Modifier `"80:80"` en `"8080:80"` dans `docker-compose.yml` et accéder via `:8080` |
| Conteneur db en erreur | Vérifier les logs : `docker compose logs db` — souvent un problème de mot de passe dans `.env` |
| GLPI ne se met pas à jour | Exécuter `docker compose pull` puis `docker compose up -d` |
| Perte des données après `docker compose down` | Utiliser `docker compose down` sans l'option `-v` — l'option `-v` supprime les volumes |

---

## 8. Sécurisation post-installation

Après installation, appliquer ces mesures de base :

1. **Changer tous les mots de passe par défaut** — `glpi`, `tech`, `normal`, `post-only`
2. **Supprimer le fichier install** — GLPI le signale dans l'interface, suivre ses recommandations
3. **Mettre GLPI derrière un reverse proxy** (nginx + SSL) pour exposer sur HTTPS
4. **Activer les sauvegardes automatiques** — via GLPI ou via `docker compose` avec un cron

