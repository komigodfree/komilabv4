---
title: "Asciinema — Enregistrer et partager des sessions terminal"
date: 2026-03-06
lastmod: 2026-03-06
description: "Installer et utiliser Asciinema sur Ubuntu/Debian pour enregistrer des sessions terminal, les partager en ligne et les intégrer dans un site Hugo statique."
categories: ["Systèmes"]
tags: ["asciinema", "terminal", "documentation", "linux"]
difficulty: "debutant"
author: "Komi Kpodohouin"
draft: false
---

## Objectif

Installer Asciinema sur Ubuntu/Debian, enregistrer des sessions terminal au format `.cast`, les publier sur asciinema.org et les intégrer dans une page Hugo via un shortcode. Outil idéal pour documenter des procédures IT de façon interactive et reproductible.

**Systèmes cibles** — Ubuntu 22.04+, Debian 11+  
**Durée estimée** — 15 minutes  
**Niveau requis** — Utilisateur Linux de base (sudo)

---

## Prérequis

| Prérequis | Commande de vérification |
|---|---|
| Accès sudo ou root | `sudo -v` |
| Connexion Internet active | `ping -c 2 google.com` |
| Python 3.x installé | `python3 --version` |
| pip3 installé | `pip3 --version` |

> **Note** — Si `pip3` n'est pas présent, l'installer via :
> ```bash
> sudo apt install python3-pip -y
> ```

---

## 1. Installation d'Asciinema

### 1.1 Installation via APT (recommandé)

Mettre à jour les dépôts et installer Asciinema :

```bash
sudo apt update && sudo apt install asciinema -y
```

Vérifier que l'installation est correcte :

```bash
asciinema --version
```

{{< result >}}
asciinema 2.x.x
{{< /result >}}

### 1.2 Installation via pip3 (version la plus récente)

Si tu veux la dernière version disponible :

```bash
pip3 install asciinema
```

> **Conseil** — Préférer la version APT pour une installation système stable. Utiliser pip3 uniquement si tu as besoin d'une fonctionnalité absente de la version APT.

---

## 2. Associer son compte asciinema.org

Asciinema.org est la plateforme officielle de partage. L'association du compte permet de gérer les enregistrements en ligne.

### 2.1 Créer un compte

Aller sur [asciinema.org](https://asciinema.org) et créer un compte avec son email.

### 2.2 Associer la machine au compte

```bash
asciinema auth
```

{{< result >}}
Open the following URL in a web browser to register your CLI:

https://asciinema.org/connect/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

This will associate your CLI with your asciinema.org user account.
{{< /result >}}

Ouvrir l'URL affichée dans un navigateur et confirmer l'association. La machine est maintenant liée au compte — tous les enregistrements uploadés apparaîtront dans le profil.

> **Note** — L'association est facultative. Sans compte, les enregistrements uploadés sont anonymes et disponibles 7 jours.

---

## 3. Enregistrer une session terminal

### 3.1 Démarrer un enregistrement

```bash
asciinema rec
```

Le terminal entre en mode enregistrement. Tout ce qui est tapé et affiché est capturé. Pour arrêter l'enregistrement :

```bash
exit
```

ou `Ctrl+D`.

{{< result >}}
asciinema: recording asciicast to /tmp/tmpXXXXXX.cast
asciinema: press <ctrl-d> or type "exit" when you're done
{{< /result >}}

À la fin, Asciinema propose de uploader ou de sauvegarder localement.

### 3.2 Enregistrer dans un fichier local

Pour sauvegarder directement dans un fichier nommé :

```bash
asciinema rec mon-lab.cast
```

Le fichier `.cast` est un format JSON — léger et portable.

### 3.3 Options utiles

| Option | Description | Exemple |
|---|---|---|
| `-t "titre"` | Définir un titre | `asciinema rec -t "Installation Docker"` |
| `--cols` | Largeur du terminal | `asciinema rec --cols 120` |
| `--rows` | Hauteur du terminal | `asciinema rec --rows 30` |
| `--idle-time-limit` | Limiter les pauses | `asciinema rec --idle-time-limit 2` |

> **Bonne pratique** — Toujours utiliser `--idle-time-limit 2` pour éviter les longues pauses dans l'enregistrement. Cela rend la lecture plus fluide.

```bash
asciinema rec -t "Mon lab" --idle-time-limit 2 --cols 120 --rows 30 mon-lab.cast
```

---

## 4. Rejouer un enregistrement local

Pour relire un fichier `.cast` localement avant de le partager :

```bash
asciinema play mon-lab.cast
```

Pour rejouer à vitesse réduite (utile pour les démonstrations) :

```bash
asciinema play -s 0.5 mon-lab.cast
```

Pour rejouer à vitesse accélérée :

```bash
asciinema play -s 2 mon-lab.cast
```

---

## 5. Uploader et partager un enregistrement

### 5.1 Uploader sur asciinema.org

```bash
asciinema upload mon-lab.cast
```

{{< result >}}
https://asciinema.org/a/XXXXXXXXXXXXXXXXXXXXXXXXXX
{{< /result >}}

L'URL générée est le lien de partage public. Il peut être partagé directement ou intégré dans une page web.

### 5.2 Enregistrer et uploader en une seule commande

```bash
asciinema rec mon-lab.cast && asciinema upload mon-lab.cast
```

---


## 6. Récapitulatif des commandes essentielles

| Action | Commande |
|---|---|
| Enregistrer (interactif) | `asciinema rec` |
| Enregistrer dans un fichier | `asciinema rec fichier.cast` |
| Enregistrer avec options | `asciinema rec -t "Titre" --idle-time-limit 2 fichier.cast` |
| Rejouer localement | `asciinema play fichier.cast` |
| Uploader sur asciinema.org | `asciinema upload fichier.cast` |
| Associer son compte | `asciinema auth` |

---

## 7. Dépannage

| Problème constaté | Solution |
|---|---|
| `asciinema: command not found` | Vérifier que le binaire est dans le PATH : `which asciinema` ou réinstaller via `sudo apt install asciinema -y` |
| Caractères mal affichés à la lecture | S'assurer que le terminal lecteur utilise UTF-8 : `echo $LANG` doit afficher `fr_FR.UTF-8` ou `en_US.UTF-8` |
| Upload échoue avec erreur 401 | Réassocier le compte : `asciinema auth` |
| La lecture est trop rapide | Rejouer avec `-s 0.5` : `asciinema play -s 0.5 fichier.cast` |
| Longues pauses dans l'enregistrement | Réenregistrer avec `--idle-time-limit 2` |
| Le player ne s'affiche pas dans Hugo | Vérifier que Hugo ne sanitize pas le HTML — ajouter `unsafe: true` dans `hugo.toml` sous `[markup.goldmark.renderer]` |
