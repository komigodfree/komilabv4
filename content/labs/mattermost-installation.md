---
title: "Mattermost : Installation sur Debian/Ubuntu"
date: 2026-03-09
image: "/images/labs/og-mattermost.png"
lastmod: 2026-03-09
description: "Guide d'installation complet de Mattermost avec PostgreSQL sur Debian/Ubuntu. Déploiement pas à pas avec configuration de la base de données et du service systemd."
categories: ["Systèmes"]
tags: ["mattermost", "postgresql", "debian", "ubuntu", "collaboration", "self-hosted"]
difficulty: "intermédiaire"
author: "Komi Kpodohouin"
deploy_time: "~45min"
draft: false
---

Mattermost est une plateforme de messagerie collaborative open source, l'alternative self-hosted à Slack. Ce lab couvre l'installation complète sur Debian/Ubuntu avec PostgreSQL comme base de données.

**Systèmes cibles** : Debian 12 ou Ubuntu 22.04+
**Niveau requis** : Administrateur système (sudo)

---

## Prérequis

Serveur Debian 12 ou Ubuntu 22.04+, accès root ou sudo, 2 Go RAM minimum, connexion internet.

---

## Mise à jour système

```bash
sudo apt update && sudo apt upgrade -y
```

---

## Utilisateur dédié

```bash
sudo adduser <username>
sudo usermod -aG sudo <username>
su <username>
```

---

## Utilitaires requis

```bash
sudo apt install curl gnupg2 software-properties-common bash-completion nano -y
```

---

## Dépôt officiel Mattermost

```bash
curl -sL https://deb.packages.mattermost.com/pubkey.gpg | gpg --dearmor | sudo tee /usr/share/keyrings/mattermost-archive-keyring.gpg > /dev/null
```

```bash
curl -o- https://deb.packages.mattermost.com/repo-setup.sh | sudo bash -s mattermost
```

```bash
sudo apt update
```

---

## Installation Mattermost

```bash
sudo apt install mattermost -y
```

---

## Installation PostgreSQL

```bash
sudo apt install postgresql postgresql-contrib -y
```

Vérifier que le service tourne et que l'utilisateur système `postgres` existe :

```bash
sudo systemctl status postgresql
```

```bash
id postgres
```

{{< result >}}
uid=xxx(postgres) gid=xxx(postgres) groups=xxx(postgres)
{{< /result >}}

---

## PostgreSQL — création de la base

```bash
sudo -u postgres psql
```

{{< callout type="warning" >}}
Évite les mots de passe contenant `@` — ce caractère est interprété comme séparateur dans les chaînes de connexion PostgreSQL et casse le DataSource silencieusement.
{{< /callout >}}

```sql
CREATE DATABASE mattermost;
CREATE USER mmuser WITH PASSWORD 'VotreMotDePasse';
GRANT ALL PRIVILEGES ON DATABASE mattermost TO mmuser;
ALTER DATABASE mattermost OWNER TO mmuser;
\c mattermost
GRANT ALL ON SCHEMA public TO mmuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mmuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mmuser;
\q
```

---

## systemd — dépendance PostgreSQL

Ne pas modifier `/lib/systemd/system/mattermost.service` directement. Utiliser un fichier d'override qui survit aux mises à jour :

```bash
sudo mkdir -p /etc/systemd/system/mattermost.service.d/
sudo tee /etc/systemd/system/mattermost.service.d/postgresql-dep.conf <<EOF
[Unit]
After=postgresql.service
BindsTo=postgresql.service
EOF
```

{{< callout type="info" >}}
`BindsTo` force Mattermost à s'arrêter si PostgreSQL s'arrête. `After` garantit l'ordre de démarrage. Sans ça, Mattermost peut tenter de démarrer avant que la base soit prête et échouer silencieusement.
{{< /callout >}}

Vérifier que l'override est bien pris en compte par systemd :

```bash
systemctl cat mattermost | grep -A2 "postgresql"
```

```bash
sudo systemctl daemon-reload
```

---

## Configuration Mattermost

Copier le fichier de configuration par défaut :

```bash
sudo -u mattermost cp /opt/mattermost/config/config.defaults.json /opt/mattermost/config/config.json
sudo chmod 600 /opt/mattermost/config/config.json
```

Éditer le fichier :

```bash
sudo nano /opt/mattermost/config/config.json
```

Rechercher `DriverName` avec `Ctrl+W`, vérifier que la valeur est `postgres` :

```json
"DriverName": "postgres",
```

Rechercher `DataSource` et remplacer — attention à bien écrire **mattermost** et non ~~mattermos~~ :

```json
"DataSource": "postgres://mmuser:VotreMotDePasse@localhost:5432/mattermost?sslmode=disable&connect_timeout=10",
```

Rechercher `SiteURL` et définir l'adresse du serveur :

```json
"SiteURL": "http://IP_SERVEUR:8065",
```

Sauvegarder : `Ctrl+X`, `Y`, `Entrée`.

---

## Démarrage des services

```bash
sudo systemctl enable postgresql mattermost
sudo systemctl start postgresql mattermost
```

```bash
sudo systemctl status mattermost
```

{{< result >}}
● mattermost.service - Mattermost
     Loaded: loaded (/lib/systemd/system/mattermost.service; enabled)
     Active: active (running)
{{< /result >}}

Si le service échoue, consulter l'erreur exacte :

```bash
journalctl -xeu mattermost.service --no-pager | grep -E "error|Error|failed" | head -20
```

---

## Accéder à Mattermost

```
http://IP_SERVEUR:8065
```

L'assistant de configuration s'affiche pour créer le compte administrateur et configurer l'équipe.

---

## Dépannage

**`sudo: unknown user postgres`** : PostgreSQL n'est pas installé ou l'installation a échoué. Réinstaller avec `sudo apt purge postgresql* -y && sudo apt install postgresql postgresql-contrib -y`.

**Service Mattermost ne démarre pas** : Consulter les logs avec `sudo journalctl -u mattermost -f`. Vérifier le `DataSource` dans `config.json` — nom de base, mot de passe, orthographe.

**`pq: database "xxx" does not exist`** : Faute de frappe dans le nom de la base dans `DataSource`. Vérifier avec `sudo -u postgres psql -c "\l"` et corriger dans `config.json`.

**Port 8065 inaccessible** : Ouvrir le port avec `sudo ufw allow 8065`.

**PostgreSQL ne démarre pas avant Mattermost** : Vérifier que le fichier `postgresql-dep.conf` existe dans `/etc/systemd/system/mattermost.service.d/`.
