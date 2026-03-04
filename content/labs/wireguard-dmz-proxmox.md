---
title: "Déploiement WireGuard VPN en zone DMZ sous Proxmox"
date: 2026-01-15
lastmod: 2026-02-01
author: "Komi Kpodohouin"
version: "1.1"
difficulty: "Avancé"
categories:
  - "Réseaux"
tags:
  - wireguard
  - vpn
  - proxmox
  - dmz
  - linux
  - duckdns
series: ["Infrastructure Homelab KomiLab"]
description: "Déploiement production d'un VPN WireGuard sur une VM Debian en zone DMZ Proxmox, avec DuckDNS pour la résolution dynamique et règles pare-feu Palo Alto."
draft: false
---

## Contexte & Problématique

Dans une architecture multi-site ou en télétravail, l'accès sécurisé au réseau interne est critique. WireGuard s'impose comme la solution VPN moderne : protocole léger, performances élevées, surface d'attaque réduite par rapport à OpenVPN ou IPSec.

Ce lab documente le déploiement complet en zone DMZ, isolé du réseau interne par des règles pare-feu strictes. L'objectif : accès VPN opérationnel avec IP dynamique résolu via DuckDNS.

## Architecture

| Composant | Détail |
|-----------|--------|
| Hyperviseur | Proxmox VE 8.x |
| VM VPN | Debian 12 (1 vCPU, 512 Mo RAM) |
| Zone réseau | DMZ (VLAN 200) |
| Pare-feu | Palo Alto VM-Series |
| DNS dynamique | DuckDNS |
| Port UDP | 51820 |

## Prérequis

- Proxmox VE opérationnel avec accès CLI
- VM Debian 12 déployée en DMZ
- Accès administrateur au pare-feu Palo Alto
- Compte DuckDNS gratuit
- Connaissance de base des règles NAT/PAT

## Étapes détaillées

### 1. Installation de WireGuard

```bash
apt update && apt install -y wireguard wireguard-tools
```

Vérification du module kernel :

```bash
modprobe wireguard && lsmod | grep wireguard
```

### 2. Génération des clés

```bash
cd /etc/wireguard
umask 077
wg genkey | tee server_private.key | wg pubkey > server_public.key
cat server_private.key server_public.key
```

{{< callout type="warning" >}}
Ne partagez jamais la clé privée. Stockez-la avec les permissions 600 uniquement.
{{< /callout >}}

### 3. Configuration du serveur

```ini
# /etc/wireguard/wg0.conf
[Interface]
PrivateKey = <VOTRE_CLE_PRIVEE>
Address = 10.10.0.1/24
ListenPort = 51820
PostUp   = iptables -A FORWARD -i %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
# Client 1 — Laptop admin
PublicKey  = <CLE_PUBLIQUE_CLIENT>
AllowedIPs = 10.10.0.2/32
```

### 4. Activation du forwarding IP

```bash
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
sysctl -p
```

### 5. Démarrage et persistance

```bash
systemctl enable --now wg-quick@wg0
systemctl status wg-quick@wg0
```

### 6. Configuration DuckDNS

```bash
mkdir -p /opt/duckdns
cat > /opt/duckdns/duck.sh << 'EOF'
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=VOTRE_DOMAINE&token=VOTRE_TOKEN&ip=" | curl -k -o /opt/duckdns/duck.log -K -
EOF
chmod 700 /opt/duckdns/duck.sh
```

Cron toutes les 5 minutes :

```bash
(crontab -l; echo "*/5 * * * * /opt/duckdns/duck.sh >/dev/null 2>&1") | crontab -
```

### 7. Règles Palo Alto (DMZ vers VPN)

Créer une règle NAT/PAT :

- **Source** : Any (External zone)
- **Destination** : IP publique interface DMZ
- **Service** : UDP/51820
- **Translated Destination** : IP VM WireGuard (ex: 192.168.200.10)

Règle de sécurité :

- **De** : Untrust
- **À** : DMZ
- **Application** : wireguard (ou custom UDP 51820)
- **Action** : Allow

{{< callout type="danger" >}}
N'ouvrez jamais le port WireGuard vers le réseau interne directement. Le trafic doit impérativement transiter via les règles de sécurité depuis la DMZ.
{{< /callout >}}

## Points critiques

- Le MTU doit être ajusté (typiquement 1420) pour éviter la fragmentation
- Vérifier que le pare-feu Proxmox (pvefw) n'interfère pas avec UDP 51820
- DuckDNS peut avoir des délais de propagation jusqu'à 5 minutes

## Tests & Validation

Depuis le client WireGuard configuré :

```bash
wg show
ping 10.10.0.1
```

Résultat attendu :

```
interface: wg0
  public key: ...
  private key: (hidden)
  listening port: 51820

peer: ...
  endpoint: votre-domaine.duckdns.org:51820
  allowed ips: 0.0.0.0/0
  latest handshake: X seconds ago
  transfer: X KiB received, X KiB sent
```

## Résultats & Métriques

| Métrique | Valeur |
|----------|--------|
| Latence moyenne | ~4 ms (LAN) |
| Débit descendant | ~850 Mbps |
| RAM VM | ~45 Mo |
| CPU idle | <1% |

## Recommandations production

- Activer le logging des connexions WireGuard via `wg show` + cron vers syslog
- Intégrer les logs dans votre SIEM (Wazuh, Elastic)
- Rotation automatique des clés tous les 90 jours
- Monitoring du tunnel via Prometheus + Blackbox Exporter
- Documenter chaque peer dans un registre d'accès

## Conclusion

Ce lab couvre un déploiement WireGuard production en DMZ isolée, avec résolution DNS dynamique et règles pare-feu entreprise. Il s'intègre dans la série Infrastructure Homelab KomiLab comme composant d'accès distant sécurisé.

La prochaine étape de la série : configuration d'un accès conditionnel basé sur les profils utilisateurs via l'intégration Active Directory.
