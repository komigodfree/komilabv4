---
title: "Bitwarden Self-Hosted : Déploiement entreprise avec certificat et un serveur smtp existants"
date: 2026-03-30
lastmod: 2026-03-30
description: "Déploiement complet de Bitwarden Self-Hosted en environnement entreprise sur Ubuntu 24.04 user dédié, certificat TLS existant, SMTP, politiques de sécurité, sauvegarde et mise à jour."
categories:
  - Sécurité
tags:
  - bitwarden
  - password-manager
  - docker
  - ubuntu
  - entreprise
  - self-hosted
difficulty: avancé
author: "Komi Kpodohouin"
deploy_time: "2 heures"
draft: false
---

En entreprise, les mots de passe sont encore souvent stockés dans des fichiers Excel ou sur des pense-bêtes. Ces pratiques exposent directement le système d'information à des risques de compromission.

Il devient donc essentiel de fournir aux utilisateurs un outil sécurisé et simple pour gérer leurs accès.

Bitwarden en self-hosted, solution open source, permet de centraliser et sécuriser les mots de passe tout en gardant un contrôle total sur les données, hébergées en interne.

Ce lab s'adresse aux équipes IT souhaitant déployer une solution robuste sur leur propre infrastructure.

Ce lab utilise le **nginx intégré à Bitwarden** comme seul point d'entrée TLS. Pas de reverse proxy externe.

## Prérequis

Les éléments suivants doivent être en place avant de commencer. Ce lab ne les couvre pas.

**Infrastructure :**

| Élément | Détail |
|---|---|
| Serveur | Ubuntu 24.04, accessible en SSH |
| IP publique | Fixe, ports 80 et 443 ouverts vers Internet |
| Nom de domaine | Avec accès au gestionnaire DNS |
| Sous-domaine | `bitwarden.example.com` créé et propagé vers l'IP du serveur |
| Certificat TLS | Wildcard ou dédié couvrant `bitwarden.example.com` |

**Ressources serveur :**

| Ressource | Minimum | Recommandé |
|---|---|---|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 6 GB |
| Disque | 40 GB | 80 GB |

{{< callout type="warning" >}}
Bitwarden utilise Microsoft SQL Server (MSSQL) comme base de données. MSSQL consomme entre 1.5 et 2 GB de RAM au démarrage, d'où le minimum de 4 GB. Déploie Bitwarden sur une VM et non un conteneur LXC, MSSQL ayant des exigences noyau incompatibles avec les LXC Proxmox.
{{< /callout >}}

**Certificat TLS :**

Disposer du certificat et la clé privée :

- `certificate.crt` : le certificat (chaîne complète si possible)
- `private.key` : la clé privée

{{< img src="/images/labs/bitwarden/og-bitwarden-ssl-files.png" width="800" >}}

{{< callout type="info" >}}
Le sous-domaine DNS du serveur doit être créé et propagé avant de démarrer l'installation. Vérifie la propagation avec `nslookup bitwarden.example.com` : vous devriez voir l'IP de votre serveur.
{{< /callout >}}

{{< img src="/images/labs/bitwarden/og-bitwarden-dns-propagation.png" width="800" >}}

---

## Étape 1 — Préparer le serveur

### Mettre à jour le système

```bash
apt update && apt upgrade -y
apt install -y curl wget openssl git
```

### Installer Docker

Suis la documentation officielle Docker pour Ubuntu :

👉 [https://docs.docker.com/engine/install/ubuntu/](https://docs.docker.com/engine/install/ubuntu/)

### Verifier que docker tourne

```bash
sudo docker run hello-world
```

{{< img src="/images/labs/bitwarden/og-bitwarden-docker-verify.png" width="800" >}}

### Désactiver IPv6 pour Docker

Bitwarden tente de télécharger ses images via IPv6 sur certaines configurations, ce qui provoque des timeouts. Désactive IPv6 au niveau de Docker avant de continuer.

```bash
nano /etc/docker/daemon.json
```
copier et coller ce script dans votre fichier daemon.json ouvert

```json
{
  "ipv6": false
}
```
Ensuite redemarrer docker

```bash
systemctl restart docker
```

### Mettre à jour le DNS systemd-resolved

Sur Ubuntu 24.04, `systemd-resolved` écoute sur `127.0.0.53` et peut provoquer des timeouts DNS lors du téléchargement des images Bitwarden depuis `ghcr.io`. Il est nécessaire de le désactiver et configurer un DNS statique fiable.

```bash
systemctl disable systemd-resolved
systemctl stop systemd-resolved
rm /etc/resolv.conf
nano /etc/resolv.conf
```

Ici, 10.10.1.10 est l'ip de notre server DNS en local

```
nameserver 10.10.1.10

```

Vérifie la résolution :

```bash
nslookup ghcr.io
```

{{< img src="/images/labs/bitwarden/og-bitwarden-dns-ghcr.png" width="800" >}}

### Corriger le hostname

Ouvrir le dossier hosts 

```bash
nano /etc/hosts
```

Mettre à jour :

```
127.0.0.1    localhost
127.0.1.1    bitwarden.example.com
```

Remplacer `bitwarden.example.com` par le hostname réel de votre serveur.
Tout endroit ou vous verrez example.bitwarden.com dans ce lab, le remplacer par le FQDN de votre serveur

Vérifie que le domaine répond bien depuis le serveur :

```bash
ping -c 4 bitwarden.example.com
```

{{< img src="/images/labs/bitwarden/og-bitwarden-ping-domaine.png" width="800" >}}

---

## Étape 2 — Créer le compte de service Bitwarden

La documentation officielle Bitwarden recommande de ne pas installer en root. Créer un compte de service dédié qui isolera Bitwarden sur le serveur.

```bash
# Créer l'utilisateur bitwarden
adduser bitwarden
```

```bash
# Définir un mot de passe fort
passwd bitwarden
```

```bash
# Ajouter bitwarden au groupe docker
usermod -aG docker bitwarden
```

```bash
# Créer le répertoire d'installation
mkdir /opt/bitwarden
# Définir les permissions
chmod -R 700 /opt/bitwarden
```

```bash
# Bitwarden devient propriétaire du dossier
chown -R bitwarden:bitwarden /opt/bitwarden
```

{{< callout type="warning" >}}
Toutes les commandes d'installation qui suivent doivent être exécutées en tant qu'utilisateur `bitwarden` depuis `/opt/bitwarden`. Ne pas installer en root.
{{< /callout >}}

```bash
# se connecter en tant qu'utilisateur bitwarden
su - bitwarden
```
```bash
# se positionner dans le bon repertoire
cd /opt/bitwarden
```

---

## Étape 3 — Placer le certificat TLS

Bitwarden s'attend à trouver les fichiers de certificat dans un dossier spécifique avant le démarrage. Crée cette structure depuis votre compte administrateur (avec sudo).

```bash
# Créer le dossier de certificats
mkdir -p /opt/bitwarden/bwdata/ssl/bitwarden.example.com
```

Copier les fichiers de certificat dans les dossiers suivants sur le serveur bitwarden.
Utiliser un outil comme WINSCP pour copier le certificat et la clé privée depuis votre poste vers les dossiers suivant sur le serveur bitwarden

Le dossier dans lequel il faudra mettre les certificats est /opt/bitwarden/bwdata/ssl/bitwarden.example.com/ nouvellement créé précédement

```bash
# Ici certificate.crt est le certificat et private.key est la clé privée
/opt/bitwarden/bwdata/ssl/bitwarden.example.com/certificate.crt
/opt/bitwarden/bwdata/ssl/bitwarden.example.com/private.key
```

NB :  Ne pas oublier de remplacer private.key par le vrai nom de votre clé privée
```bash
# Corriger les permissions
chown -R bitwarden:bitwarden /opt/bitwarden/bwdata/ssl/
chmod 600 /opt/bitwarden/bwdata/ssl/bitwarden.example.com/private.key
```

Vérifier que les fichiers sont bien en place :

```bash
ls -la /opt/bitwarden/bwdata/ssl/bitwarden.example.com/
```

{{< img src="/images/labs/bitwarden/og-bitwarden-ssl-files.png" width="800" >}}

Vérifie que le certificat couvre bien ton domaine :

```bash
openssl x509 -in /opt/bitwarden/bwdata/ssl/bitwarden.example.com/certificate.crt \
  -noout -subject -dates -ext subjectAltName
```

{{< img src="/images/labs/bitwarden/og-bitwarden-certificat-verification.png" width="800" >}}

{{< callout type="info" >}}
Utiliser un certificat wildcard `*.example.com`, il couvre automatiquement `bitwarden.example.com` et tous les futurs sous-domaines. C'est la configuration recommandée en entreprise un seul certificat à renouveler pour tous les services.
{{< /callout >}}

---

## Étape 4 — Obtenir les identifiants d'installation

Bitwarden nécessite un **Installation ID** et une **Installation Key** pour s'enregistrer auprès des serveurs Bitwarden. Ces identifiants permettent à votre instance de recevoir les mises à jour et les licences.

1. Aller sur [https://bitwarden.com/host/](https://bitwarden.com/host/)
2. Mettre un compte admin, choisir la région et faire **Submit**

{{< img src="/images/labs/bitwarden/og-bitwarden-installation-id-form.png" width="800" >}}

3. **Copie l'Installation ID et l'Installation Key**: ils ne s'affichent qu'une seule fois

{{< img src="/images/labs/bitwarden/og-bitwarden-installation-id-result.png" width="800" >}}

{{< callout type="warning" >}}
Ces identifiants sont liés à votre domaine. Si vous changez de domaine, vous devrez en générer de nouveaux sur bitwarden.com/host.
{{< /callout >}}

---

## Étape 5 — Installer Bitwarden

Switcher sur le compte bitwarden :

```bash
su - bitwarden
```

```bash
cd /opt/bitwarden
```

Télécharge et lance le script d'installation :

```bash
curl -Lso bitwarden.sh \
  "https://func.bitwarden.com/api/dl/?app=self-host&platform=linux"
```

Appliquer les permissions 
```bash
chmod 700 bitwarden.sh
```
Installer bitwarden

```bash
./bitwarden.sh install
```

Répondre aux questions comme suit :

| Question | Réponse |
|---|---|
| Enter the domain name | `bitwarden.example.com` |
| Do you want to use Let's Encrypt | `n` — on utilise notre propre certificat |
| Enter the database name | `bitwarden` |
| Do you have a SSL certificate to use | `y` |
| Is this a trusted SSL certificate | `n` |
| Enter your Installation ID | *(colle l'ID de l'étape 4)* |
| Enter your Installation Key | *(colle la Key de l'étape 4)* |
| Enter your region | `EU` ou `US` selon votre région selectionée |

{{< img src="/images/labs/bitwarden/og-bitwarden-install-script.png" width="800" >}}

{{< callout type="info" >}}
On répond `n` à "trusted SSL certificate" car Bitwarden demande ici si vous avez un fichier `.crt` séparé. Un certificat Let's Encrypt ou un wildcard d'une CA reconnue n'a pas besoin de ce fichier séparé :la chaîne complète est déjà dans notre certificat `certificate.crt`.
{{< /callout >}}

### Vérifier la structure créée

```bash
ls /opt/bitwarden/bwdata/
```

{{< img src="/images/labs/bitwarden/og-bitwarden-bwdata-structure.png" width="800" >}}

---

## Étape 6 — Configurer l'environnement

```bash
nano /opt/bitwarden/bwdata/env/global.override.env
```

Mettre à jour ces lignes dans le fichier selon votre environnement:

```bash
# SMTP — obligatoire pour les invitations et vérifications
globalSettings__mail__replyToEmail=noreply@example.com
globalSettings__mail__smtp__senderName=Bitwarden Entreprise
globalSettings__mail__smtp__host=mail.example.com
globalSettings__mail__smtp__port=587
globalSettings__mail__smtp__ssl=false
globalSettings__mail__smtp__startTls=true
globalSettings__mail__smtp__username=noreply@example.com
globalSettings__mail__smtp__password=TON_MOT_DE_PASSE_SMTP

# Panneau d'administration
adminSettings__admins=admin@example.com

# Inscription des utilisateurs
globalSettings__disableUserRegistration=false
```

**Paramètres SMTP selon le provider :**

| Provider | Host | Port | ssl | startTls |
|---|---|---|---|---|
| Gmail | smtp.gmail.com | 587 | false | true |
| Office 365 | smtp.office365.com | 587 | false | true |
| SMTP SSL direct | mail.example.com | 465 | true | false |
| SMTP local | 127.0.0.1 | 25 | false | false |

{{< callout type="warning" >}}
Si votre mot de passe SMTP contient le caractère `$`, échappez-le en le doublant dans le fichier `.env`. Par exemple : `monP@$$word` s'écrit `monP@$$$$word`. Sans cet échappement, Docker interprétera `$word` comme une variable d'environnement vide.
{{< /callout >}}

Voici ce a quoi ressemble notre fichier final

Après avoir modifié `global.override.env`, enregistrer les changements : CTRL + X, Y puis ENTRER

Voici l'apercu de notre fichier final. Les informations sensibles ont été floutté pour des raisons de sécurité

{{< img src="/images/labs/bitwarden/og-bitwarden-global-override-env.png" width="800" >}}

Appliquer les changements avec la commande 

```bash
./bitwarden.sh restart
```

{{< callout type="info" >}}
Différence entre les deux commandes de mise à jour de configuration : `./bitwarden.sh restart` applique les changements de `global.override.env`. `./bitwarden.sh rebuild` reconstruit les assets depuis `config.yml` — à utiliser si tu changes les ports ou la configuration nginx.
{{< /callout >}}

---

## Étape 7 — Démarrer Bitwarden

```bash
cd /opt/bitwarden
./bitwarden.sh start
```

Le premier démarrage prend entre 3 et 7 minutes : MSSQL initialise la base de données et applique toutes les migrations.

---

## Étape 8 — Vérifications de santé

### Les 11 conteneurs doivent être healthy

```bash
docker ps | grep bitwarden
```

{{< img src="/images/labs/bitwarden/og-bitwarden-nginx-health.png" width="800" >}}

{{< callout type="warning" >}}
Si certains conteneurs restent en `unhealthy` après 10 minutes, MSSQL est probablement en cours d'initialisation. Attends encore quelques minutes. Si le problème persiste, consulte les logs avec `docker logs bitwarden-mssql`.
{{< /callout >}}

### Nginx répond correctement

```bash
curl -k -I https://localhost
```

{{< result >}}
HTTP/2 200
server: nginx
content-type: text/html
strict-transport-security: max-age=15768000
{{< /result >}}

### Le certificat est bien chargé

```bash
echo | openssl s_client -connect localhost:443 2>/dev/null \
  | openssl x509 -noout -subject -dates -ext subjectAltName
```

{{< img src="/images/labs/bitwarden/og-bitwarden-certificat-charge.png" width="800" >}}

---

## Étape 9 — Créer le premier compte et accéder au panneau admin

### Créer le compte utilisateur

Ouvre `https://bitwarden.example.com` dans ton navigateur. Tu dois voir la page de connexion Bitwarden.

{{< img src="/images/labs/bitwarden/og-bitwarden-login-page.png" width="800" >}}

Clique sur **Create account**. Utilise l'adresse email définie dans `adminSettings__admins` pour avoir accès au panneau d'administration.

{{< img src="/images/labs/bitwarden/og-bitwarden-create-account.png" width="800" >}}

Définis un mot de passe maître fort — c'est le seul mot de passe que l'utilisateur devra retenir.

{{< img src="/images/labs/bitwarden/og-bitwarden-master-password.png" width="800" >}}

Une fois connecté, Bitwarden propose d'installer l'extension navigateur.

{{< img src="/images/labs/bitwarden/og-bitwarden-extension-prompt.png" width="800" >}}

Le coffre est désormais accessible depuis le tableau de bord.

{{< img src="/images/labs/bitwarden/og-bitwarden-vault-dashboard.png" width="800" >}}

{{< callout type="info" >}}
Le premier compte créé n'est pas automatiquement administrateur de l'instance. L'administration de l'instance se gère via le panneau `/admin` séparé, accessible uniquement aux emails listés dans `adminSettings__admins`.
{{< /callout >}}

### Accéder au panneau d'administration

```
https://bitwarden.example.com/admin
```

Entre ton email et clique **Send email**. Tu recevras un lien magique — clique dessus pour accéder au panneau sans mot de passe.

Depuis le panneau admin tu peux :
- Gérer les utilisateurs et leurs comptes
- Configurer les organisations
- Consulter les logs d'événements
- Gérer les licences

---

## Étape 10 — Configurer les politiques de mots de passe

Les politiques de mots de passe s'appliquent au niveau des organisations. Crée d'abord une organisation depuis l'interface web, puis configure les politiques.

**Depuis l'interface web → Organisation → Paramètres → Politiques :**

| Politique | Recommandation entreprise |
|---|---|
| Authentification à deux facteurs | Activée — obligatoire pour tous |
| Exigences du mot de passe maître | 12 caractères min, complexité forte |
| Générateur de mots de passe | Activée |
| Réinitialisation du compte admin | Activée |
| Coffre personnel | Selon politique interne |

---

## Étape 11 — Sauvegarde et restauration

### Ce qu'il faut sauvegarder

Bitwarden stocke ses données dans deux endroits critiques :

**La base de données MSSQL** — coffres, utilisateurs, organisations, politiques.

**Le dossier `bwdata`** — configuration, pièces jointes, clés de chiffrement.

{{< callout type="warning" >}}
Les données sont chiffrées avec des clés stockées dans `bwdata/env/global.override.env`. Sans ce fichier, la base de données est indéchiffrable même avec une sauvegarde complète. Sauvegarde TOUJOURS le dossier `bwdata` complet.
{{< /callout >}}

### Script de sauvegarde automatique

```bash
nano /usr/local/bin/bitwarden-backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/bitwarden"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR
echo "[$(date)] Démarrage de la sauvegarde..."

cd /opt/bitwarden
./bitwarden.sh backup

tar -czf "$BACKUP_DIR/bitwarden_full_$DATE.tar.gz" \
    /opt/bitwarden/bwdata/

find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
echo "[$(date)] Sauvegarde terminée : bitwarden_full_$DATE.tar.gz"
```

```bash
chmod +x /usr/local/bin/bitwarden-backup.sh

# Sauvegarde automatique quotidienne à 2h du matin
crontab -e
# Ajouter :
0 2 * * * /usr/local/bin/bitwarden-backup.sh >> /var/log/bitwarden-backup.log 2>&1
```

### Procédure de restauration

```bash
# 1. Arrêter Bitwarden
./bitwarden.sh stop

# 2. Supprimer le bwdata et restaurer depuis la sauvegarde
rm -rf /opt/bitwarden/bwdata
tar -xzf /opt/backups/bitwarden/bitwarden_full_DATE.tar.gz -C /

# 3. Redémarrer
./bitwarden.sh rebuild
./bitwarden.sh start

# 4. Vérifier
curl -k -I https://localhost
```

---

## Étape 12 — Mise à jour

```bash
# Toujours sauvegarder avant une mise à jour
./bitwarden.sh backup

# Mettre à jour le script bitwarden.sh
./bitwarden.sh updateself

# Mettre à jour Bitwarden
./bitwarden.sh update
```

**Fréquences recommandées :**

| Type | Délai |
|---|---|
| Sécurité / CVE critique | Sous 48 heures |
| Mises à jour mineures | Dans la semaine |
| Mises à jour majeures | Fenêtre de maintenance planifiée |

Consulte les notes de version avant chaque mise à jour majeure : [https://github.com/bitwarden/server/releases](https://github.com/bitwarden/server/releases)

---

## Référence des commandes bitwarden.sh

| Commande | Description |
|---|---|
| `./bitwarden.sh install` | Lance l'installateur interactif |
| `./bitwarden.sh start` | Démarre tous les conteneurs |
| `./bitwarden.sh restart` | Redémarre — applique les changements de `global.override.env` |
| `./bitwarden.sh stop` | Arrête tous les conteneurs |
| `./bitwarden.sh rebuild` | Reconstruit les assets depuis `config.yml` |
| `./bitwarden.sh update` | Met à jour conteneurs et base de données |
| `./bitwarden.sh updateself` | Met à jour le script `bitwarden.sh` |
| `./bitwarden.sh backup` | Crée une sauvegarde de la base de données |
| `./bitwarden.sh renewcert` | Renouvelle les certificats |
| `./bitwarden.sh uninstall` | Désinstalle Bitwarden (avec confirmation) |

---

## Dépannage

### Les conteneurs restent en unhealthy

```bash
docker logs bitwarden-mssql 2>&1 | tail -20
docker logs bitwarden-api 2>&1 | tail -20
```

MSSQL est souvent le premier à poser problème. S'il n'est pas healthy, les autres conteneurs attendent.

### Nginx retourne 502

```bash
curl -k -I https://localhost
docker logs bitwarden-nginx 2>&1 | tail -10
```

Un 502 au démarrage est normal — les backends ne sont pas encore prêts. Attends 2-3 minutes et reteste.

### Erreur de téléchargement des images Docker

```bash
# Vérifier la résolution DNS
nslookup ghcr.io

# Tester la connectivité
curl -v --max-time 10 https://ghcr.io/v2/
```

Si DNS timeout, vérifie `/etc/resolv.conf` — systemd-resolved doit être désactivé.

### Emails non reçus

```bash
docker logs bitwarden-api 2>&1 | grep -i "mail\|smtp" | tail -10
```

Teste la connexion SMTP manuellement :

```bash
apt install -y swaks
swaks --to admin@example.com \
      --from noreply@example.com \
      --server mail.example.com \
      --port 587 \
      --auth LOGIN \
      --auth-user noreply@example.com \
      --auth-password <ton-mot-de-passe-smtp> \
      --tls
```

### Mot de passe SMTP avec caractères spéciaux

Si ton mot de passe contient `$`, `!`, ou d'autres caractères spéciaux, double le `$` dans `global.override.env` :

```bash
# Mot de passe réel : monP@$sword
# Dans global.override.env :
globalSettings__mail__smtp__password=monP@$$sword
```

---

## Checklist de mise en production

- [ ] Sous-domaine DNS créé et propagé
- [ ] Certificat TLS valide — cadenas vert dans le navigateur
- [ ] Les 11 conteneurs affichent `healthy`
- [ ] `curl -k -I https://localhost` retourne HTTP/2 200
- [ ] Emails de test reçus (invitation, vérification de compte)
- [ ] Accès au panneau `/admin` vérifié
- [ ] Sauvegarde automatique configurée et testée
- [ ] Politique de mots de passe activée dans l'organisation
- [ ] 2FA obligatoire pour tous les membres
- [ ] Procédure de mise à jour documentée
