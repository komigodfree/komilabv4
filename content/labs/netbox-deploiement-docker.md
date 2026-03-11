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

Dans le homelab KOMI.LAB, l'infrastructure grossit vite : deux nœuds Proxmox, des VLANs et VXLANs numérotés (SERVERS 4001, MGT 4033, SOC 4088, DMZ 4090...), un PA-VM en firewall, des LXC, des VMs avec des IPs fixes attribuées à la main. À un moment, le fichier Excel ou le bloc-notes ne suffit plus — on ne sait plus quelle IP est libre, quel VLAN correspond à quoi, où est câblé tel équipement.

C'est pour ça que NetBox est entré dans le lab. L'objectif n'était pas de déployer un outil de plus, mais d'avoir une source de vérité unique pour toute la topologie : adresses IP, préfixes, VLANs, équipements physiques, VMs, interfaces. Ce qui est documenté dans NetBox reflète ce qui existe réellement — et ça sert aussi de référence quand je prépare une procédure ou un MO pour SGMT.

Le déploiement se fait dans un LXC dédié sur proxmox-01, via Docker Compose. Rien de compliqué, mais il y a quelques points à ne pas rater au premier démarrage.

**Contexte d'usage** : LXC Ubuntu 22.04 sur Proxmox, VLAN SERVERS (4001)
**Niveau requis** : Administrateur système (sudo)

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

{{< callout type="info" >}}
Si Docker n'est pas encore installé, se rendre sur [docs.docker.com/engine/install](https://docs.docker.com/engine/install/), choisir sa distribution et suivre les instructions officielles. Docker Compose est inclus dans les versions récentes de Docker Engine.
{{< /callout >}}

---

## Cloner le dépôt NetBox Docker

Le projet **netbox-docker** est le dépôt officiel maintenu par la communauté NetBox pour le déploiement via conteneurs.

Cloner la branche `release` — toujours stable et recommandée en production :

```bash
git clone -b release https://github.com/netbox-community/netbox-docker.git
```

```bash
ls
```

{{< result >}}
netbox-docker
{{< /result >}}

```bash
cd netbox-docker/
```

```bash
ls
```

{{< result >}}
Caddyfile  configuration  docker-compose.yml  env  LICENSE  README.md  startup_scripts
{{< /result >}}

Ne pas modifier `docker-compose.yml` directement. On utilisera un fichier d'override à l'étape suivante.

---

## Configurer le port d'écoute

NetBox nécessite un fichier de surcharge nommé obligatoirement `docker-compose.override.yml` : Docker Compose le détecte et le fusionne automatiquement avec le fichier principal.

```bash
nano docker-compose.override.yml
```

Attention à l'**indentation** (2 espaces, pas de tabulations) :

```yaml
services:
  netbox:
    ports:
      - 8000:8080
```

Sauvegarder : `Ctrl+X`, `Y`, `Entrée`.

Le port `8080` est le port interne du conteneur. On l'expose sur `8000` de la machine hôte. NetBox sera accessible via `http://IP_SERVEUR:8000`.

---

## Télécharger les images Docker

```bash
docker compose pull
```

Cette opération peut prendre plusieurs minutes selon la connexion. Vérifier les images téléchargées :

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

## Démarrer les conteneurs

```bash
docker compose up -d
```

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
**L'erreur `netbox-docker-netbox-1 is unhealthy` est normale et attendue.** Au premier démarrage, NetBox initialise la base PostgreSQL, applique les migrations Django et prépare les fichiers statiques. Cette opération prend entre 2 et 5 minutes. Docker considère le conteneur comme "unhealthy" pendant cette phase car le healthcheck échoue avant que l'application soit opérationnelle.

Attendre quelques minutes avant de continuer.
{{< /callout >}}

Vérifier l'état après quelques minutes :

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

Tous les conteneurs doivent afficher `healthy` avant de continuer. Si `netbox-1` reste en erreur après 5 minutes, consulter la section Dépannage.

---

## Créer le compte administrateur

```bash
docker compose exec netbox /opt/netbox/netbox/manage.py createsuperuser
```

{{< result >}}
Username:
Email address:
Password:
Password (again):
{{< /result >}}

{{< callout type="warning" >}}
NetBox impose un mot de passe d'au moins **12 caractères** contenant au moins **un chiffre**. Un mot de passe trop simple retourne :

`This password is too short. It must contain at least 12 characters.`
{{< /callout >}}

{{< result >}}
Superuser created successfully.
{{< /result >}}

---

## Accéder à l'interface web

```
http://IP_SERVEUR:8000
```

Se connecter avec les identifiants créés à l'étape précédente. Le tableau de bord NetBox s'affiche avec les modules disponibles : Organisation, IPAM, DCIM, VPN, Virtualisation, Circuits.

{{< img src="/images/netbox-dashboard.png" alt="Tableau de bord NetBox Community" >}}

---

## Ce que j'ai documenté dans KOMI.LAB

Une fois NetBox opérationnel, la première chose que j'ai faite c'est structurer les données autour de ce qui existe dans le lab :

- **IPAM** : les préfixes par VLAN (SERVERS, MGT, DMZ...), les IPs fixes attribuées aux VMs et LXC, les plages DHCP réservées
- **DCIM** : les deux nœuds Proxmox (proxmox-01 / proxmox-02) en tant que dispositifs physiques, avec leurs interfaces et leurs connexions
- **VLANs** : tous les VLANs numérotés du lab, associés à leurs VNIs VXLAN
- **Virtualisation** : les VMs et LXC actifs, rattachés à leurs hôtes Proxmox respectifs

Ce n'est pas une documentation exhaustive faite d'un coup — ça se remplit progressivement au fil des déploiements. Mais avoir NetBox comme point de référence évite de chercher dans plusieurs endroits quelle IP est libre ou à quelle interface correspond tel port.

---

## Dépannage

**`netbox-1` reste en erreur après 5 min** : Consulter les logs avec `docker compose logs netbox`.

**Interface inaccessible sur le port 8000** : Vérifier le firewall avec `sudo ufw status` et ouvrir si nécessaire avec `sudo ufw allow 8000`.

**Erreur `port is already allocated`** : Un service utilise déjà le port 8000, changer dans `docker-compose.override.yml` ex: `8001:8080`.

**Mot de passe refusé** : Utiliser au moins 12 caractères avec un chiffre.

**Conteneur PostgreSQL en erreur** : Vérifier l'espace disque avec `df -h`.

**Erreur de permission sur les volumes** : Relancer avec `docker compose down -v && docker compose up -d` (supprime les données).
