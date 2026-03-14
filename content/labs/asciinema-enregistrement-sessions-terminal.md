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
draft: false
---

Documenter des procédures système avec des captures vidéo est lourd. Les blocs de code seuls ne rendent pas bien la progression d'une commande — on ne voit ni le délai d'exécution, ni la sortie réelle, ni les erreurs éventuelles.

Asciinema enregistre exactement ce qui se passe dans le terminal, sortie incluse, et génère un fichier `.cast` léger. Je l'utilise pour documenter des procédures dans le homelab avant de les publier sur KomiLab : le lecteur voit la commande s'exécuter en temps réel, sans setup, sans plugin vidéo.

**Systèmes cibles** : Ubuntu 22.04+, Debian 11+  
**Niveau requis** : Utilisateur Linux de base (sudo)

---

## Prérequis

Accès sudo sur la machine cible, connexion internet et Python 3.x + pip3. Si pip3 est absent : `sudo apt install python3-pip -y`

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

Une fois associé, le profil est visible sur asciinema.org :

{{< img src="/images/labs/asciinema/asciinema-profil.png" width="75%" >}}

Sans compte, les enregistrements uploadés sont anonymes et disponibles 7 jours.

---

## Comment je l'utilise

Pour documenter une procédure — installation d'un service, configuration réseau, administration d'une base de données — je lance l'enregistrement avant de commencer, j'exécute mes commandes normalement, et je coupe à la fin. Avant de publier, je relis en rejouant localement à vitesse réduite pour vérifier que rien ne manque.

Ce qui m'a convaincu par rapport à la vidéo : le fichier `.cast` est léger, copiable, versionnable. Et l'intégration dans un article est transparente — aucun plugin, un simple embed.

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

`--cols` et `--rows` garantissent un rendu cohérent dans le player intégré à KomiLab, quelle que soit la taille de la fenêtre terminal utilisée au moment de l'enregistrement.

---

## Rejouer localement

```bash
asciinema play mon-lab.cast
```

Vitesse réduite pour une relecture : `-s 0.5`. Accéléré : `-s 2`.

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
