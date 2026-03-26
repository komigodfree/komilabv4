---
title: "Déployer Traefik comme reverse proxy avec Docker et certificat wildcard Cloudflare"
date: 2026-03-26
lastmod: 2026-03-26
description: "Installation et configuration de Traefik v2.11 comme reverse proxy sur Ubuntu avec génération automatique de certificats wildcard Let's Encrypt via Cloudflare DNS-01."
categories:
  - Infrastructure
tags:
  - traefik
  - docker
  - reverse-proxy
  - cloudflare
  - letsencrypt
  - ubuntu
difficulty: intermédiaire
author: "Komi Kpodohouin"
deploy_time: "45 minutes"
draft: false
---

Traefik est un reverse proxy moderne conçu nativement pour les environnements conteneurisés. Il détecte automatiquement les services Docker, gère les certificats TLS via Let's Encrypt et s'intègre parfaitement avec Cloudflare pour le challenge DNS-01.

Dans ce lab, on déploie Traefik sur Ubuntu avec Docker, un certificat wildcard `*.komilab.org` via Cloudflare, et on expose deux types de services : des services internes sur un domaine local (`komi.lab`) et des services publics sur `komilab.org`.

> **Note de version** : Ce lab utilise **Traefik v2.11**. Traefik v3.x présente des incompatibilités avec certaines versions de l'API Docker qui provoquent l'erreur `client version 1.24 is too old` — même avec Docker Engine 29.x. Utilise impérativement la v2.11 pour éviter ce problème.

## Prérequis

- Un serveur Ubuntu 22.04 ou 24.04
- Un domaine géré sur Cloudflare (les enregistrements DNS doivent pointer vers Cloudflare)
- Accès sudo sur le serveur
- Ports 80 et 443 ouverts sur le firewall

## Architecture

```
Internet
    │
    ▼
Traefik (10.10.1.101)
    ├── traefik.komi.lab     → Dashboard (interne, cert auto-signé)
    ├── bitwarden.komilab.org → Bitwarden (public, cert Let's Encrypt wildcard)
    └── proxmox.komi.lab     → Proxmox (interne, cert auto-signé)
```

## Étape 1 — Installer Docker

Suis la documentation officielle pour installer Docker Engine sur Ubuntu :

👉 [https://docs.docker.com/engine/install/ubuntu/](https://docs.docker.com/engine/install/ubuntu/)

Après l'installation, ajoute ton utilisateur au groupe `docker` pour éviter de préfixer chaque commande avec `sudo` :

```bash
sudo usermod -aG docker $USER
```

Déconnecte-toi puis reconnecte-toi pour appliquer le changement de groupe. Vérifie ensuite que Docker fonctionne correctement :

```bash
docker version
```

Tu dois voir le client ET le serveur dans la sortie, avec une API version ≥ 1.40.

## Étape 2 — Créer la structure de dossiers

```bash
mkdir -p ~/traefik/data
cd ~/traefik
```

Crée le fichier `acme.json` qui stockera les certificats Let's Encrypt. Les permissions `600` sont obligatoires — Traefik refusera de démarrer si elles sont trop permissives :

```bash
touch data/acme.json
chmod 600 data/acme.json
```

Structure finale :

```
~/traefik/
├── docker-compose.yml
└── data/
    ├── traefik.yml
    ├── config.yml
    └── acme.json
```

## Étape 3 — Créer le token Cloudflare

Traefik a besoin d'un token Cloudflare pour créer des enregistrements TXT temporaires lors du challenge DNS-01 de Let's Encrypt.

1. Connecte-toi sur [dash.cloudflare.com](https://dash.cloudflare.com)
2. Clique sur ton avatar en haut à droite → **My Profile**
3. Onglet **API Tokens** → **Create Token**
4. Choisis **Create Custom Token**
5. Configure le token comme suit :

| Champ | Valeur |
|---|---|
| Token name | `traefik-komilab` |
| Permissions | Zone / DNS / Edit |
| Zone Resources | Include / Specific zone / ton-domaine.org |

6. Clique sur **Continue to summary** puis **Create Token**
7. **Copie le token immédiatement** — il ne s'affiche qu'une seule fois

Teste-le pour valider :

```bash
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer <ton-token>" \
  -H "Content-Type: application/json"
```

La réponse doit contenir `"status": "active"`.

## Étape 4 — Générer le mot de passe du dashboard

Le dashboard Traefik sera protégé par une authentification Basic Auth. Génère le hash du mot de passe :

```bash
sudo apt install apache2-utils -y
echo $(htpasswd -nB komi) | sed -e s/\\$/\\$\\$/g
```

La commande te demande de saisir un mot de passe deux fois. La sortie ressemble à :

```
komi:$$2y$$05$$abc123...
```

Copie cette sortie — tu en auras besoin dans le `docker-compose.yml`.

{{< callout type="info" >}}
Dans un fichier docker-compose, le caractère `$` doit être échappé en `$$`. La commande `sed` le fait automatiquement.
{{< /callout >}}

## Étape 5 — Créer le fichier traefik.yml

```yaml
api:
  dashboard: true
  insecure: true

entryPoints:
  http:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: https
          scheme: https
  https:
    address: ":443"

serversTransport:
  insecureSkipVerify: true

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
  file:
    filename: /config.yml

certificatesResolvers:
  cloudflare:
    acme:
      email: <ton-email@exemple.com>
      storage: acme.json
      dnsChallenge:
        provider: cloudflare
        resolvers:
          - "1.1.1.1:53"
          - "1.0.0.1:53"
```

{{< callout type="warning" >}}
Remplace `<ton-email@exemple.com>` par l'adresse email associée à ton compte Cloudflare. Let's Encrypt l'utilise pour les notifications d'expiration de certificat.
{{< /callout >}}

{{< callout type="info" >}}
`insecureSkipVerify: true` est nécessaire pour les services backend qui utilisent des certificats auto-signés (comme Proxmox sur le port 8006).
{{< /callout >}}

## Étape 6 — Créer le fichier config.yml

Ce fichier définit les routers et services pour les hôtes non-Docker (services sur d'autres VMs ou machines physiques).

```yaml
http:
  routers:
    proxmox:
      entryPoints:
        - "https"
      rule: "Host(`proxmox.komi.lab`)"
      middlewares:
        - default-headers
        - https-redirectscheme
      tls: {}
      service: proxmox

    bitwarden:
      entryPoints:
        - "https"
      rule: "Host(`bitwarden.komilab.org`)"
      middlewares:
        - default-headers
        - https-redirectscheme
      tls:
        certResolver: cloudflare
      service: bitwarden

  services:
    proxmox:
      loadBalancer:
        servers:
          - url: "https://10.10.1.51:8006"
        passHostHeader: true

    bitwarden:
      loadBalancer:
        servers:
          - url: "http://10.10.1.5:80"
        passHostHeader: true

  middlewares:
    https-redirectscheme:
      redirectScheme:
        scheme: https
        permanent: true

    default-headers:
      headers:
        frameDeny: true
        browserXssFilter: true
        contentTypeNosniff: true
        forceSTSHeader: true
        stsIncludeSubdomains: true
        stsPreload: true
        stsSeconds: 15552000
        customFrameOptionsValue: SAMEORIGIN
        customRequestHeaders:
          X-Forwarded-Proto: https

    default-whitelist:
      ipAllowList:
        sourceRange:
          - "10.0.0.0/8"
          - "192.168.0.0/16"
          - "172.16.0.0/12"

    secured:
      chain:
        middlewares:
          - default-whitelist
          - default-headers
```

**Différence clé entre les deux routers :**

- `proxmox` → `tls: {}` : Traefik utilise un certificat auto-signé, pas de resolver externe
- `bitwarden` → `tls: certResolver: cloudflare` : Traefik demande un certificat Let's Encrypt via Cloudflare DNS-01

Pour ajouter un nouveau service plus tard, copie un bloc router + service et adapte le nom, le domaine et l'URL. **Pas besoin de redémarrer Traefik** — le provider `file` recharge automatiquement `config.yml` à chaque modification.

## Étape 7 — Créer le docker-compose.yml

```yaml
services:
  traefik:
    image: traefik:v2.11
    container_name: traefik
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    networks:
      - proxy
    ports:
      - 80:80
      - 443:443
    environment:
      - CF_DNS_API_TOKEN=<ton-token-cloudflare>
    volumes:
      - /etc/localtime:/etc/localtime:ro
      - /var/run/docker.sock:/var/run/docker.sock
      - ./data/traefik.yml:/traefik.yml:ro
      - ./data/acme.json:/acme.json
      - ./data/config.yml:/config.yml:ro
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.traefik.entrypoints=http"
      - "traefik.http.routers.traefik.rule=Host(`traefik.komi.lab`)"
      - "traefik.http.middlewares.traefik-auth.basicauth.users=komi:$$2y$$05$$HASH_GENERE_ETAPE4"
      - "traefik.http.middlewares.traefik-https-redirect.redirectscheme.scheme=https"
      - "traefik.http.middlewares.sslheader.headers.customrequestheaders.X-Forwarded-Proto=https"
      - "traefik.http.routers.traefik.middlewares=traefik-https-redirect"
      - "traefik.http.routers.traefik-secure.entrypoints=https"
      - "traefik.http.routers.traefik-secure.rule=Host(`traefik.komi.lab`)"
      - "traefik.http.routers.traefik-secure.middlewares=traefik-auth"
      - "traefik.http.routers.traefik-secure.tls=true"
      - "traefik.http.routers.traefik-secure.service=api@internal"

networks:
  proxy:
    external: true
```

Remplace :
- `<ton-token-cloudflare>` par le token créé à l'étape 3
- `$$2y$$05$$HASH_GENERE_ETAPE4` par le hash généré à l'étape 4

## Étape 8 — Lancer Traefik

Crée le network Docker partagé, puis démarre Traefik :

```bash
docker network create proxy
docker compose up -d
```

Vérifie les logs pour confirmer le démarrage :

```bash
docker logs traefik
```

Tu dois voir :

```
time="..." level=info msg="Configuration loaded from file: /traefik.yml"
time="..." level=info msg="Starting provider" providerName=docker
time="..." level=info msg="Starting provider" providerName=file
```

## Étape 9 — Accéder au dashboard

Ajoute une entrée DNS dans ton resolver local pour `traefik.komi.lab → IP_DU_SERVEUR`, puis accède au dashboard :

```
https://traefik.komi.lab
```

Accepte l'avertissement de certificat (certificat auto-signé par défaut pour les domaines `.lab`). Connecte-toi avec le nom d'utilisateur et le mot de passe définis à l'étape 4.

{{< callout type="info" >}}
Sur macOS ou une machine hors domaine, ajoute l'entrée manuellement dans `/etc/hosts` :
```
IP_DU_SERVEUR    traefik.komi.lab
```
{{< /callout >}}

## Vérifier le certificat wildcard

Une fois Traefik démarré, vérifie que le certificat Let's Encrypt a bien été généré :

```bash
cat ~/traefik/data/acme.json | python3 -m json.tool | grep -A2 "main"
```

Tu dois voir `*.komilab.org` dans la sortie. Ce certificat sera automatiquement utilisé pour tous les services configurés avec `certResolver: cloudflare`.

## Exposer un service Docker

Pour exposer un service qui tourne dans Docker (sur la même machine que Traefik), utilise les labels directement dans son `docker-compose.yml` :

```yaml
services:
  mon-service:
    image: mon-image
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.mon-service.rule=Host(`service.komilab.org`)"
      - "traefik.http.routers.mon-service.entrypoints=https"
      - "traefik.http.routers.mon-service.tls=true"
      - "traefik.http.routers.mon-service.tls.certresolver=cloudflare"

networks:
  proxy:
    external: true
```

Traefik détecte automatiquement le conteneur et configure le routing sans redémarrage.

## Dépannage

**Erreur `client version 1.24 is too old`**

Cette erreur apparaît avec Traefik v3.x. La solution est d'utiliser Traefik v2.11 comme indiqué dans ce lab. Ne pas essayer de contourner avec `DOCKER_API_VERSION` — ça ne résout pas le problème.

**`acme.json` — permission denied**

```bash
chmod 600 ~/traefik/data/acme.json
docker compose restart
```

**Le certificat wildcard ne se génère pas**

Vérifie que le token Cloudflare est valide et que la permission `Zone / DNS / Edit` est bien configurée sur la bonne zone. Teste avec :

```bash
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer <ton-token>" \
  -H "Content-Type: application/json"
```

**Basic Auth refusé**

Régénère le hash et vérifie que chaque `$` est bien échappé en `$$` dans le `docker-compose.yml`. Redémarre après modification :

```bash
docker compose down && docker compose up -d
```
