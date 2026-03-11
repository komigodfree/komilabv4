---
title: "Asciinema : Enregistrer et partager des sessions terminal"
date: 2026-02-28
image: "/images/labs/og-asciinema.png"
lastmod: 2026-03-10
description: "Installer et utiliser Asciinema sur Ubuntu/Debian pour enregistrer des sessions terminal et les partager en ligne"
categories: ["Systèmes"]
tags: ["asciinema", "terminal", "documentation", "linux"]
difficulty: "debutant"
author: "Komi Kpodohouin"
deploy_time: "~15min"
draft: false
---

Asciinema enregistre les sessions terminal au format `.cast` et les publie en ligne. Utile pour documenter des procédures IT de façon reproductible, sans capturer de vidéo.

**Systèmes cibles** : Ubuntu 22.04+, Debian 11+  
**Niveau requis** : Utilisateur Linux de base (sudo)

---

## Prérequis

Accès sudo, connexion internet et Python 3.x + pip3. Si pip3 est absent : `sudo apt install python3-pip -y`

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
`pip3 install asciinema` donne la dernière version disponible, mais la version APT est suffisante pour un usage système courant.
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
Toujours utiliser `--idle-time-limit 2` pour tronquer les longues pauses. Sans ça, une commande qui prend 30 secondes génère 30 secondes de silence dans la lecture.
{{< /callout >}}

Commande complète recommandée :

```bash
asciinema rec -t "Mon lab" --idle-time-limit 2 --cols 120 --rows 30 mon-lab.cast
```

---

## Rejouer localement

```bash
asciinema play mon-lab.cast
```
---

## Uploader et partager

```bash
asciinema upload mon-lab.cast
```

**Lien de démonstration** : [asciinema.org/a/h3CWGevW7jt2TTg3](https://asciinema.org/a/TzorJdmNx9fR5RxN)

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
