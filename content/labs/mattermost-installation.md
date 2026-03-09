---
title: "Mattermost : Installation sur Debian/Ubuntu"
date: 2026-03-09
lastmod: 2026-03-09
description: "Guide d'installation complet de Mattermost avec PostgreSQL sur Debian/Ubuntu. Déploiement pas à pas avec configuration de la base de données et du service systemd."
categories: ["Systèmes"]
tags: ["mattermost", "postgresql", "debian", "ubuntu", "collaboration", "self-hosted"]
difficulty: "intermédiaire"
author: "Komi Kpodohouin"
deploy_time: "45 min"
draft: false
image: "/images/labs/og-mattermost.png"
---

Mattermost est une plateforme de messagerie collaborative open source — l'alternative self-hosted à Slack. Ce lab couvre l'installation complète sur Debian/Ubuntu avec PostgreSQL comme base de données.

## Prérequis

- Serveur Debian 12 ou Ubuntu 22.04+
- Accès root ou sudo
- 2 Go RAM minimum
- Connexion internet

---

## 1. Mise à jour du système

Toujours commencer par mettre à jour les paquets avant toute installation.

```bash
sudo apt update && sudo apt upgrade -y
```

---

## 2. Créer un utilisateur dédié

Par bonne pratique, on évite de travailler en root. On crée un utilisateur et on lui donne les droits sudo.

```bash
sudo adduser <username> && sudo usermod -aG sudo <username>
```

Se connecter avec le nouvel utilisateur :

```bash
su <username>
```

---

## 3. Installer les utilitaires nécessaires

Ces outils sont requis pour ajouter le dépôt Mattermost et gérer les paquets.

```bash
sudo apt install curl gnupg2 software-properties-common bash-completion nano -y
```

---

## 4. Ajouter le dépôt officiel Mattermost

**Importer la clé GPG** du dépôt — elle permet à apt de vérifier l'authenticité des paquets Mattermost :

```bash
curl -sL https://deb.packages.mattermost.com/pubkey.gpg | \
gpg --dearmor | sudo tee /usr/share/keyrings/mattermost-archive-keyring.gpg > /dev/null
```

**Ajouter le dépôt** à vos sources apt :

```bash
curl -o- https://deb.packages.mattermost.com/repo-setup.sh | sudo bash -s mattermost
```

**Mettre à jour la liste des paquets** pour prendre en compte le nouveau dépôt :

```bash
sudo apt update
```

---

## 5. Installer Mattermost

```bash
sudo apt install mattermost -y
```

---

## 6. Installer PostgreSQL

Mattermost utilise PostgreSQL comme base de données. On installe le serveur et ses extensions complémentaires.

```bash
sudo apt install postgresql postgresql-contrib -y
```

---

## 7. Configurer la base de données

Se connecter à PostgreSQL en tant qu'utilisateur `postgres` :

```bash
sudo -u postgres psql
```

{{< callout type="warning" >}}
Définissez votre nom d'utilisateur et mot de passe **avant** d'exécuter les commandes. Évitez les mots de passe contenant `@` — ce caractère est interprété différemment dans les chaînes de connexion PostgreSQL.
{{< /callout >}}

Exécuter les commandes suivantes dans le shell PostgreSQL :

```sql
-- Créer la base de données
CREATE DATABASE <DataBaseName>;

-- Créer l'utilisateur avec son mot de passe
CREATE USER <utilisateur> WITH PASSWORD 'VotreMotDePasse';

-- Accorder les privilèges sur la base
GRANT ALL PRIVILEGES ON DATABASE <DataBaseName> TO <utilisateur>;
ALTER DATABASE <DataBaseName> OWNER TO <utilisateur>;

-- Se connecter à la base avant de configurer le schéma
\c <DataBaseName>

-- Accorder les droits sur le schéma public
GRANT ALL ON SCHEMA public TO <utilisateur>;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO <utilisateur>;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO <utilisateur>;

-- Quitter psql
\q
```

{{< callout type="info" >}}
Le `\c <DataBaseName>` est obligatoire avant les commandes `GRANT ON SCHEMA`. Sans cette étape, les droits s'appliqueraient au mauvais schéma.
{{< /callout >}}

---

## 8. Configurer la dépendance systemd

Par défaut, Mattermost peut démarrer avant que PostgreSQL soit prêt. On configure systemd pour qu'il attende PostgreSQL.

Ouvrir le fichier service :

```bash
sudo nano /lib/systemd/system/mattermost.service
```

Ajouter à la ligne 3, dans la section `[Unit]` :

```ini
BindsTo=postgresql.service
After=postgresql.service
```

{{< callout type="info" >}}
`BindsTo` force Mattermost à s'arrêter si PostgreSQL s'arrête. `After` garantit l'ordre de démarrage. Ces deux directives ensemble assurent une dépendance stricte entre les deux services.
{{< /callout >}}

Recharger systemd pour prendre en compte les modifications :

```bash
sudo systemctl daemon-reexec
sudo systemctl daemon-reload
```

Vérifier que le service Mattermost est actif :

```bash
systemctl status mattermost.service
```

---

## 9. Copier et configurer le fichier de configuration

Copier le fichier de configuration par défaut :

```bash
sudo install -C -m 600 -o mattermost -g mattermost \
/opt/mattermost/config/config.defaults.json \
/opt/mattermost/config/config.json
```

Ouvrir le fichier de configuration :

```bash
sudo nano /opt/mattermost/config/config.json
```

**Configurer le driver de base de données :**

Faire `Ctrl+W` et rechercher `DriverName`. S'assurer que la valeur est `postgres` :

```json
"DriverName": "postgres",
```

**Configurer la chaîne de connexion :**

Rechercher `DataSource` avec `Ctrl+W` et remplacer sa valeur par :

```json
"DataSource": "postgres://<utilisateur>:<VotreMotDePasse>@localhost:5432/<DataBaseName>?sslmode=disable\u0026connect_timeout=10\u0026binary_parameters=yes",
```

**Configurer l'URL du site :**

Rechercher `SiteURL` avec `Ctrl+W` et renseigner l'adresse de votre serveur :

```json
"SiteURL": "http://10.10.1.20:8065",
```

Sauvegarder avec `Ctrl+X` → `Y` → `Entrée`.

---

## 10. Démarrer les services

Activer et démarrer PostgreSQL :

```bash
sudo systemctl enable postgresql && systemctl status postgresql
```

Redémarrer Mattermost et vérifier son statut :

```bash
sudo systemctl restart mattermost && sudo systemctl status mattermost
```

---

## 11. Accéder à Mattermost

Ouvrir un navigateur et accéder à l'interface web :

```
http://10.10.1.20:8065/
```

{{< callout type="info" >}}
Remplacez `10.10.1.20` par l'adresse IP de votre serveur. Le port par défaut de Mattermost est `8065`.
{{< /callout >}}

Vous devriez voir la page de création du premier compte administrateur.

---

## Résumé

| Composant | Version | Port |
|---|---|---|
| Mattermost | Latest | 8065 |
| PostgreSQL | 15+ | 5432 |

**Services systemd :**

```bash
# Statut
systemctl status mattermost postgresql

# Redémarrage
sudo systemctl restart mattermost

# Logs en temps réel
sudo journalctl -fu mattermost
```
