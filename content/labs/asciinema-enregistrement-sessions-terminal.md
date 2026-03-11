---
title: "Asciinema : Enregistrer et partager des sessions terminal"
date: 2026-02-28
image: "/images/labs/og-asciinema.png"
lastmod: 2026-03-11
description: "Installer et utiliser Asciinema sur Ubuntu/Debian pour enregistrer des sessions terminal et les partager en ligne"
categories: ["Systèmes"]
tags: ["asciinema", "terminal", "documentation", "linux"]
difficulty: "debutant"
author: "Komi Kpodohouin"
deploy_time: "~15min"
draft: true
---

Dans mon homelab KOMI.LAB, je travaille régulièrement sur des VMs via SSH — déploiement de services sur Proxmox, configuration réseau, administration PostgreSQL, intégration Active Directory. Documenter ces opérations avec des captures vidéo est lourd, et les simples blocs de code dans un article ne rendent pas bien la progression d'une commande.

Asciinema règle ce problème : il enregistre exactement ce qui se passe dans le terminal, sortie incluse, et génère un fichier `.cast` léger que j'intègre directement dans mes labs KomiLab. Résultat : le lecteur voit la commande s'exécuter en temps réel, sans setup, sans plugin vidéo.

**Contexte d'usage** : SSH sur les VMs Proxmox du homelab (Ubuntu 22.04, aarch64)  
**Niveau requis** : Utilisateur Linux de base (sudo)

---

## Prérequis

Accès sudo sur la VM cible, connexion internet et Python 3.x + pip3. Si pip3 est absent : `sudo apt install python3-pip -y`

---

## Installation

```bash
sudo apt update && sudo apt install asciinema -y
```

```bash
asciinema --version
```

Version `2.4.0` sur komilab (aarch64) :

{{< img src="/images/labs/asciinema/asciinema-version.png" width="65%" >}}

{{< callout type="info" >}}
`pip3 install asciinema` donne la dernière version disponible, mais la version APT est suffisante pour documenter des procédures système courantes.
{{< /callout >}}

---

## Associer son compte asciinema.org

```bash
asciinema auth
```

Asciinema affiche une URL à ouvrir dans le navigateur pour lier la machine au compte :

{{< img src="/images/labs/asciinema/asciinema-auth.png" width="75%" >}}

Une fois associé, le profil komilab est visible sur asciinema.org :

{{< img src="/images/labs/asciinema/asciinema-profil.png" width="75%" >}}

Sans compte, les enregistrements uploadés sont anonymes et disponibles 7 jours.

---

## Comment je l'utilise dans le homelab

La plupart de mes enregistrements concernent des procédures que je veux garder comme référence ou publier sur KomiLab. Par exemple, pour documenter une installation PostgreSQL sur une VM dédiée ou configurer LDAPS, je lance l'enregistrement avant de commencer, j'exécute mes commandes normalement, et je coupe à la fin.

Ce qui m'a convaincu : je peux rejouer l'enregistrement localement pour vérifier que rien ne manque avant de publier, et je peux le re-faire tourner à vitesse réduite si une étape mérite plus d'attention dans la démo.

---

## Enregistrer une session

```bash
asciinema rec mon-lab.cast
```

Tout ce qui est tapé et affiché est capturé. `exit` ou `Ctrl+D` pour arrêter.

{{< result >}}
asciinema: recording asciicast to mon-lab.cast
asciinema: press <ctrl-d> or type "exit" when you're done
{{< /result >}}

{{< callout type="warning" >}}
Toujours utiliser `--idle-time-limit 2` pour tronquer les longues pauses. Sans ça, une commande qui prend 30 secondes génère 30 secondes de silence dans la lecture — particulièrement gênant pour des installations de paquets ou des `apt upgrade`.
{{< /callout >}}

Commande complète que j'utilise pour mes labs :

```bash
asciinema rec -t "Mon lab" --idle-time-limit 2 --cols 120 --rows 30 mon-lab.cast
```

`--cols` et `--rows` garantissent un rendu cohérent dans le player intégré à KomiLab, quelle que soit la taille de la fenêtre SSH utilisée au moment de l'enregistrement.

---

## Rejouer localement

```bash
asciinema play mon-lab.cast
```

Vitesse réduite pour une démo : `-s 0.5`. Accéléré : `-s 2`. C'est utile pour se relire avant d'uploader.

---

## Uploader et partager

```bash
asciinema upload mon-lab.cast
```

{{< img src="/images/labs/asciinema/asciinema-upload.png" width="75%" >}}

Asciinema génère une URL publique. **Lien de démonstration** : <a href="https://asciinema.org/a/TzorJdmNx9fR5RxN" target="_blank" class="asciinema-link">▶ asciinema.org/a/TzorJdmNx9fR5RxN</a>

Enregistrer et uploader en une commande :

```bash
asciinema rec mon-lab.cast && asciinema upload mon-lab.cast
```

---

## Dépannage

**`asciinema: command not found`** : Vérifier le PATH avec `which asciinema` ou réinstaller via apt.

**Caractères mal affichés** : Vérifier l'encodage avec `echo $LANG`, doit retourner `fr_FR.UTF-8` ou `en_US.UTF-8`.

**Upload échoue (erreur 401)** : Réassocier le compte avec `asciinema auth`.

**Longues pauses à la lecture** : Réenregistrer avec `--idle-time-limit 2`.
