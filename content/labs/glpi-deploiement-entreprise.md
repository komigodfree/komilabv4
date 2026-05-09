---
title: "Déploiement enterprise de GLPI 11 sur Proxmox : architecture two-tier sécurisée"
date: 2025-05-09
image: /images/labs/og-glpi-deploiement-entreprise.png
lastmod: 2025-05-09
description: "Déployez GLPI 11 en architecture two-tier sur Proxmox : un LXC dédié MariaDB 11.4 LTS et un LXC applicatif Nginx + PHP-FPM, avec structure Teclib hors DocumentRoot et hardening production."
categories:
  - ITSM
  - Infrastructure
tags:
  - glpi
  - mariadb
  - nginx
  - php
  - proxmox
  - itsm
  - lxc
difficulty: intermédiaire
author: Komi Kpodohouin
deploy_time: 2-3h
draft: false
---

Une installation GLPI standard met tout sur un seul serveur. Une installation enterprise sépare les couches, isole les données, et applique le principe du moindre privilège dès le départ.

Dans ce lab, on déploie GLPI 11.0.6 sur deux LXC Proxmox distincts : un LXC dédié base de données (MariaDB 11.4 LTS) et un LXC applicatif (Nginx + PHP 8.2 FPM). La structure de fichiers suit les recommandations officielles Teclib avec les répertoires sensibles hors DocumentRoot.

## Architecture cible

```
Proxmox
├── LXC glpi-db     (10.10.1.109) — MariaDB 11.4 LTS
│   ├── Écoute uniquement sur 10.10.1.109:3306
│   └── glpi_user autorisé depuis 10.10.1.114 uniquement
│
└── LXC glpi-srv    (10.10.1.114) — Nginx + PHP 8.2 FPM
    ├── /var/www/glpi/public        ← DocumentRoot (Nginx)
    ├── /etc/glpi/                  ← Config (hors web)
    ├── /var/lib/glpi/files/        ← Fichiers uploadés (hors web)
    └── /var/log/glpi/              ← Logs applicatifs (hors web)
```

La séparation base de données / applicatif permet d'appliquer des politiques de sauvegarde différentes, de scaler chaque couche indépendamment, et de limiter la surface d'attaque en cas de compromission applicative.

## Prérequis

- Deux LXC Ubuntu 22.04 créés sur Proxmox
- Connectivité réseau entre les deux LXC (même bridge ou VLAN)
- Accès root sur les deux LXC

---

# Phase 1 — LXC glpi-db (10.10.1.109)

## Étape 1 — Préparation système

```bash
apt update && apt upgrade -y

apt install -y curl wget gnupg2 software-properties-common \
    apt-transport-https ca-certificates ufw fail2ban

timedatectl set-timezone Africa/Lome
hostnamectl set-hostname glpi-db
```

## Étape 2 — Installer MariaDB 11.4 LTS

MariaDB 11.4 est la version LTS courante. On utilise le script officiel pour ajouter le dépôt avant installation.

```bash
curl -LsSo /tmp/mariadb_repo_setup \
    https://downloads.mariadb.com/MariaDB/mariadb_repo_setup
bash /tmp/mariadb_repo_setup --mariadb-server-version="mariadb-11.4"

apt update
apt install -y mariadb-server mariadb-client

mariadb --version
```

## Étape 3 — Hardening MariaDB

```bash
mariadb-secure-installation
```

Répondre comme suit :

| Question | Réponse |
|---|---|
| Switch to unix_socket authentication | n |
| Change the root password | y → mot de passe fort |
| Remove anonymous users | y |
| Disallow root login remotely | y |
| Remove test database | y |
| Reload privilege tables | y |

## Étape 4 — Configuration enterprise-grade

Créer un fichier de configuration dédié GLPI plutôt que de modifier `my.cnf` directement — ça facilite les mises à jour et audits.

```bash
nano /etc/mysql/mariadb.conf.d/99-glpi.cnf
```

```ini
[mysqld]
# Encodage UTF8MB4 obligatoire pour GLPI
character-set-server = utf8mb4
collation-server     = utf8mb4_unicode_ci

# Écoute uniquement sur l'IP du serveur MariaDB
bind-address = 10.10.1.109

# Performances
innodb_buffer_pool_size        = 1G
innodb_log_file_size           = 256M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method            = O_DIRECT
query_cache_type               = 0
query_cache_size               = 0

# Connexions
max_connections      = 100
wait_timeout         = 600
interactive_timeout  = 600

# Logs
slow_query_log      = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time     = 2

# Sécurité
local_infile = 0

[client]
default-character-set = utf8mb4
```

```bash
systemctl restart mariadb
systemctl enable mariadb
systemctl status mariadb
```

{{< callout type="info" >}}
Le paramètre `bind-address = 10.10.1.109` est critique : MariaDB n'accepte les connexions que depuis cette IP. Sans ça, le service écoute sur toutes les interfaces.
{{< /callout >}}

## Étape 5 — Initialiser les timezones

GLPI utilise les fuseaux horaires MariaDB pour la gestion des calendriers et des notifications.

```bash
mysql_tzinfo_to_sql /usr/share/zoneinfo | mariadb -u root -p mysql
systemctl restart mariadb
```

## Étape 6 — Créer la base et l'utilisateur applicatif

```bash
mariadb -u root -p
```

```sql
-- Base dédiée GLPI
CREATE DATABASE glpi
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Utilisateur autorisé uniquement depuis le LXC applicatif
CREATE USER 'glpi_user'@'10.10.1.114'
  IDENTIFIED BY 'MotDePasseTresForte!2025';

-- Droits minimaux sur la base glpi uniquement
GRANT ALL PRIVILEGES ON glpi.* TO 'glpi_user'@'10.10.1.114';

-- Vérification
SELECT user, host FROM mysql.user;
SHOW GRANTS FOR 'glpi_user'@'10.10.1.114';

FLUSH PRIVILEGES;
EXIT;
```

{{< callout type="warning" >}}
`glpi_user` n'a de droits que sur la base `glpi` et uniquement depuis `10.10.1.114`. Si le LXC applicatif est compromis, l'attaquant ne peut pas accéder aux autres bases ni se connecter depuis une autre IP.
{{< /callout >}}

## Étape 7 — UFW : restreindre le port 3306

```bash
ufw allow from 10.10.1.114 to any port 3306
ufw enable
ufw status
```

## Vérification finale Phase 1

```bash
mariadb -u root -p

SHOW CREATE DATABASE glpi;
SHOW VARIABLES LIKE 'character_set%';
SHOW VARIABLES LIKE 'collation%';
SHOW VARIABLES LIKE 'bind_address';
EXIT;
```

---

# Phase 2 — LXC glpi-srv (10.10.1.114)

## Étape 1 — Préparation système

```bash
apt update && apt upgrade -y

apt install -y curl wget gnupg2 software-properties-common \
    apt-transport-https ca-certificates ufw fail2ban

timedatectl set-timezone Africa/Lome
hostnamectl set-hostname glpi-srv
```

## Étape 2 — Installer PHP 8.2 FPM + extensions

```bash
add-apt-repository ppa:ondrej/php -y
apt update

apt install -y \
    php8.2-fpm \
    php8.2-mysql \
    php8.2-curl \
    php8.2-gd \
    php8.2-intl \
    php8.2-mbstring \
    php8.2-xml \
    php8.2-zip \
    php8.2-bz2 \
    php8.2-bcmath \
    php8.2-opcache \
    php8.2-ldap \
    php8.2-imap \
    php8.2-xmlrpc \
    php8.2-exif

php8.2 --version
```

## Étape 3 — Installer Nginx

```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

## Étape 4 — Configurer PHP-FPM

```bash
nano /etc/php/8.2/fpm/php.ini
```

Modifier ces valeurs (utiliser `Ctrl+W` pour chercher) :

```ini
memory_limit = 256M
upload_max_filesize = 20M
post_max_size = 20M
max_execution_time = 60
session.cookie_httponly = On
session.cookie_samesite = Lax
date.timezone = Africa/Lome
```

```bash
systemctl restart php8.2-fpm
systemctl enable php8.2-fpm
```

## Étape 5 — Télécharger et déployer GLPI 11.0.6

```bash
cd /tmp
wget https://github.com/glpi-project/glpi/releases/download/11.0.6/glpi-11.0.6.tgz

tar xzf glpi-11.0.6.tgz
mv glpi /var/www/glpi-11.0.6
ln -s /var/www/glpi-11.0.6 /var/www/glpi
```

L'utilisation d'un lien symbolique permet de mettre à jour GLPI sans toucher à la configuration Nginx — on pointe le lien vers la nouvelle version.

## Étape 6 — Structure Teclib sécurisée

C'est le point qui distingue une installation enterprise d'une installation standard. Les répertoires sensibles (config, fichiers uploadés, logs) sont placés hors du DocumentRoot — inaccessibles directement via le navigateur.

```bash
mkdir -p /etc/glpi
mkdir -p /var/lib/glpi/files
mkdir -p /var/log/glpi

cat > /var/www/glpi/inc/downstream.php << 'EOF'
<?php
define('GLPI_CONFIG_DIR', '/etc/glpi/');
define('GLPI_VAR_DIR',    '/var/lib/glpi/');
define('GLPI_LOG_DIR',    '/var/log/glpi/');
EOF

chown -R www-data:www-data /var/www/glpi
chown -R www-data:www-data /etc/glpi
chown -R www-data:www-data /var/lib/glpi
chown -R www-data:www-data /var/log/glpi
chmod -R 755 /var/www/glpi

chown -R www-data:www-data /var/www/glpi-11.0.6/marketplace
chmod -R 755 /var/www/glpi-11.0.6/marketplace
```

{{< callout type="info" >}}
Sans cette structure, les fichiers de configuration et les pièces jointes des tickets sont accessibles depuis le web. Un attaquant qui connaît le chemin peut lire les credentials de base de données directement dans le navigateur.
{{< /callout >}}

## Étape 7 — Configuration Nginx

```bash
nano /etc/nginx/sites-available/glpi
```

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name glpi.komi.lab;

    root /var/www/glpi/public;
    index index.php;

    location / {
        try_files $uri /index.php$is_args$args;
    }

    location ~ ^/index\.php$ {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_split_path_info ^(.+\.php)(/.*)$;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param HTTP_PROXY "";
    }

    location ~ /\. {
        deny all;
    }

    location ~* \.(env|log|ini|conf)$ {
        deny all;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/glpi /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx
```

## Étape 8 — Installation via l'interface web

Ouvrir `http://glpi.komi.lab` (ou l'IP du LXC) dans un navigateur et suivre l'assistant d'installation :

- Sélectionner la langue
- Accepter la licence
- Choisir **Nouvelle installation**
- Renseigner les paramètres de connexion MariaDB :
  - Serveur : `10.10.1.109`
  - Utilisateur : `glpi_user`
  - Mot de passe : celui défini en Phase 1
  - Base : `glpi`

---

## Actions de sécurité post-installation

### 1. Supprimer install.php

```bash
rm /var/www/glpi/install/install.php
```

### 2. Changer les mots de passe par défaut

GLPI crée 4 comptes par défaut à changer immédiatement :

| Login | Mot de passe défaut | Rôle |
|---|---|---|
| glpi | glpi | Super Admin |
| tech | tech | Technicien |
| normal | normal | Utilisateur |
| post-only | postonly | Saisie tickets |

Menu utilisateur (haut droite) → Mon profil → Mot de passe.

### 3. Désactiver les comptes de démonstration

Les comptes `tech`, `normal` et `post-only` sont des comptes de démonstration. En production, les désactiver ou les supprimer après avoir créé vos propres comptes.

{{< callout type="warning" >}}
Ne pas supprimer `install.php` et laisser les mots de passe par défaut sont les deux vecteurs d'attaque les plus courants sur les installations GLPI exposées sur internet.
{{< /callout >}}

## Récapitulatif

| Composant | Statut |
|---|---|
| LXC glpi-db — MariaDB 11.4 LTS | ✅ |
| Hardening mariadb-secure-installation | ✅ |
| Configuration UTF8MB4 + performances | ✅ |
| bind-address restreint | ✅ |
| Timezones initialisées | ✅ |
| Base glpi + glpi_user isolé | ✅ |
| UFW port 3306 restreint | ✅ |
| LXC glpi-srv — Nginx + PHP 8.2 FPM | ✅ |
| Structure Teclib hors DocumentRoot | ✅ |
| install.php supprimé | ✅ |
| Mots de passe par défaut changés | ✅ |

## Pour aller plus loin

- Configurer l'authentification LDAP avec l'Active Directory HardenAD
- Mettre en place les sauvegardes automatisées avec Veeam ou rsync vers le NFS partagé
- Activer HTTPS avec un certificat Traefik wildcard `*.komi.lab`
- Configurer les notifications par mail via le relais SMTP interne

{{< discord >}}

{{< newsletter >}}
