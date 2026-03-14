---
title: "Mattermost : Installation sur Debian/Ubuntu"
date: 2026-03-09
image: "/images/labs/og-mattermost.png"
lastmod: 2026-03-14
description: "Guide d'installation complet de Mattermost, une plateforme de messagerie collaborative open source, l'alternative self-hosted à Slack"
categories: ["Systèmes"]
tags: ["mattermost", "postgresql", "debian", "ubuntu", "collaboration", "self-hosted"]
difficulty: "intermédiaire"
author: "Komi Kpodohouin"
deploy_time: "~45min"
draft: false
---

Mattermost est une plateforme de collaboration open source conçue pour les environnements qui exigent le contrôle total des données et des communications. Utilisée comme messagerie instantanée interne en entreprise, elle offre messagerie persistante, canaux structurés, appels audio, automatisation de workflows et intégrations DevSecOps et ITSM avec GitHub, GitLab, Jira, PagerDuty ou ServiceNow, le tout déployé sur votre propre infrastructure. Adoptée par des organisations comme la NASA, l'US Air Force ou Samsung, c'est la référence pour les équipes techniques et les organisations soumises à des exigences de conformité et de souveraineté numérique.

---

## Objectif

Déployer **Mattermost Server** sur Debian/Ubuntu avec PostgreSQL comme base de données.

**Systèmes cibles** : Debian 12 ou Ubuntu 22.04+  
**Niveau requis** : Administrateur système (sudo)

---

## Prérequis

### Caractéristiques minimales du serveur

Données issues de la [documentation officielle Mattermost](https://docs.mattermost.com/deployment-guide/software-hardware-requirements.html). Les besoins en RAM peuvent augmenter selon l'activité de partage de fichiers (taille max par défaut : 50 Mo).

| Ressource | Jusqu'à 1 000 utilisateurs | Jusqu'à 2 000 utilisateurs |
|---|---|---|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 2 Go | 4 Go |
| Architecture | 64-bit x86 | 64-bit x86 |
| OS | Ubuntu 22.04+ / Debian Buster+ | Ubuntu 22.04+ / Debian Buster+ |
| Base de données | PostgreSQL 14.0+ | PostgreSQL 14.0+ |
| Stockage de base | 600 Mo à 800 Mo (OS + BDD) | 600 Mo à 800 Mo (OS + BDD) |
| Stockage fichiers | Selon usage (5 à 25 Mo/utilisateur/mois) | Selon usage (5 à 25 Mo/utilisateur/mois) |
| Réseau | Accès Internet | IP fixe recommandée |

### Vérifications logicielles

| Prérequis | Commande de vérification |
|---|---|
| Accès sudo ou root | `sudo -v` |
| Connexion Internet active | `ping -c 2 google.com` |
| Port 8065 disponible | `ss -tlnp \| grep 8065` |

---

## Mise à jour système

```bash
sudo apt update && sudo apt upgrade -y
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

Vérifier que le service est actif et activé au démarrage :

```bash
sudo systemctl status postgresql
```

{{< img src="/images/labs/mattermost/mm-01-postgresql-status.png" alt="PostgreSQL actif et enabled au démarrage" >}}

---

## PostgreSQL : création de la base

```bash
sudo -u postgres psql
```

{{< callout type="warning" >}}
Évite les mots de passe contenant `@`. Ce caractère est interprété comme séparateur dans les chaînes de connexion PostgreSQL et casse le DataSource silencieusement. Utilise un mot de passe robuste de ce type : `Xk9#mP2vLq8nRt5w`
{{< /callout >}}

Créer la base de données et l'utilisateur :

```sql
CREATE DATABASE mattermost_db;
CREATE USER mattermost_user WITH PASSWORD 'VotreMotDePasse';
GRANT ALL PRIVILEGES ON DATABASE mattermost_db TO mattermost_user;
ALTER DATABASE mattermost_db OWNER TO mattermost_user;
```

{{< callout type="info" >}}
Remplace `mattermost_db`, `mattermost_user` et `VotreMotDePasse` par les valeurs de ton choix. Ces trois éléments doivent rester cohérents dans toutes les étapes suivantes.
{{< /callout >}}

Se connecter à la base, puis appliquer les privilèges sur le schéma :

```sql
\c mattermost_db
GRANT ALL ON SCHEMA public TO mattermost_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mattermost_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mattermost_user;
\q
```

{{< callout type="info" >}}
Remplace `mattermost_db` et `mattermost_user` par les noms définis à l'étape précédente.
{{< /callout >}}

---

## systemd : dépendance PostgreSQL

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

```bash
sudo systemctl daemon-reload
```

---

## Configuration Mattermost

```bash
sudo -u mattermost cp /opt/mattermost/config/config.defaults.json /opt/mattermost/config/config.json
sudo chmod 600 /opt/mattermost/config/config.json
```

```bash
sudo nano /opt/mattermost/config/config.json
```

Rechercher `DriverName` avec `Ctrl+W`, vérifier que la valeur est `postgres` :

```json
"DriverName": "postgres",
```

Rechercher `DataSource` et remplacer avec les identifiants créés plus haut :

```json
"DataSource": "postgres://mattermost_user:VotreMotDePasse@localhost:5432/mattermost_db?sslmode=disable&connect_timeout=10",
```

{{< callout type="info" >}}
Remplace `mattermost_user`, `VotreMotDePasse` et `mattermost_db` par les valeurs définies à l'étape PostgreSQL. Le nom d'utilisateur et le nom de la base doivent correspondre exactement à ce qui a été créé. Une simple faute de frappe ici cause une erreur silencieuse au démarrage.
{{< /callout >}}

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

{{< img src="/images/labs/mattermost/mm-02-mattermost-status.png" alt="Service Mattermost actif (running)" >}}

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

## Démonstration : déploiement complet

Enregistrement de la procédure complète réalisée sur un serveur Ubuntu 22.04.

<p style="margin-top:1rem;">
  <a href="https://asciinema.org/a/0hODfSsbXrIG3Poj" target="_blank" style="display:inline-flex;align-items:center;gap:0.6rem;font-family:'IBM Plex Mono',monospace;font-size:1rem;font-weight:700;color:#00FF94;border:2px solid rgba(0,255,148,0.4);border-radius:8px;padding:0.65rem 1.25rem;text-decoration:none;background:rgba(0,255,148,0.05);transition:all 0.2s ease;">
    ▶ Voir le déploiement complet sur asciinema.org
  </a>
</p>

---

## Captures post déploiement de l'interface de connexion

{{< gallery >}}
  {{< gallery-img src="/images/labs/mattermost/mm-03-landing-browser.png" alt="Page d'accueil Mattermost" >}}
  {{< gallery-img src="/images/labs/mattermost/mm-04-create-account.png" alt="Création du compte administrateur" >}}
  {{< gallery-img src="/images/labs/mattermost/mm-05-organisation.png" alt="Configuration de l'organisation" >}}
  {{< gallery-img src="/images/labs/mattermost/mm-06-tools.png" alt="Sélection des outils à intégrer" >}}
  {{< gallery-img src="/images/labs/mattermost/mm-07-town-square.png" alt="Workspace Mattermost opérationnel" >}}
{{< /gallery >}}

---

## Dépannage

**`sudo: unknown user postgres`** : PostgreSQL n'est pas installé ou l'installation a échoué. Réinstaller avec `sudo apt purge postgresql* -y && sudo apt install postgresql postgresql-contrib -y`.

**Service Mattermost ne démarre pas** : Consulter les logs avec `sudo journalctl -u mattermost -f`. Vérifier le `DataSource` dans `config.json`. Le nom d'utilisateur, le mot de passe et le nom de la base doivent correspondre exactement à ce qui a été créé dans PostgreSQL.

**Port 8065 inaccessible** : Ouvrir le port avec `sudo ufw allow 8065`.

**PostgreSQL ne démarre pas avant Mattermost** : Vérifier que le fichier `postgresql-dep.conf` existe dans `/etc/systemd/system/mattermost.service.d/`.
