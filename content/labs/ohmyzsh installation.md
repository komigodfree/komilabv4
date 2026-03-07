---
title: "Installation de Zsh & Oh My Zsh : Interface console style Kali Linux"
date: 2025-12-22
image: "/images/labs/og-ohmyzsh.png"
lastmod: 2026-02-22
description: "Configurer Zsh et Oh My Zsh sur Ubuntu/Debian/Kali Linux pour obtenir un prompt avancé avec coloration syntaxique, style Kali Linux, pour l'utilisateur standard et root."
categories: ["Systèmes"]
tags: ["zsh", "oh-my-zsh", "terminal", "shell", "linux"]
difficulty: "debutant"
author: "Komi Kpodohouin"
deploy_time: "~5min déploiement estimé"
draft: false
---

## Objectif

Installer et configurer Zsh combiné au framework Oh My Zsh afin d'obtenir une interface console avancée similaire à celle de Kali Linux. Le prompt affiche l'utilisateur, la machine hôte et le répertoire courant sous forme arborescente avec une coloration syntaxique claire et lisible.

**Systèmes cibles** — Ubuntu 22.04+, Debian 11+, Kali Linux  
**Durée estimée** — 5 minutes par machine  
**Niveau requis** — Administrateur système (sudo)

---

## Prérequis

| Prérequis | Commande de vérification |
|---|---|
| Accès sudo ou root | `sudo -v` |
| Connexion Internet active | `ping -c 2 google.com` |
| curl installé | `curl --version` |
| git installé (recommandé) | `git --version` |

> **Note** — Si `curl` ou `git` ne sont pas présents, les installer via :
> ```bash
> sudo apt install curl git -y
> ```

---

## 1. Installation pour un utilisateur standard

### 1.1 Installation de Zsh

Mettre à jour les dépôts APT et installer le shell Zsh :

```bash
sudo apt update && sudo apt install zsh -y
```

Vérifier que l'installation s'est correctement effectuée :

```bash
zsh --version
```

```bash
zsh --version
```

Résultat sur **komilab** : `zsh 5.9` sur architecture `aarch64` (ARM64) :

{{< img src="/images/labs/ohmyzsh/zsh-version.png" width="70%" >}}

### 1.2 Installation de Oh My Zsh

Télécharger et exécuter le script d'installation officiel :

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

Le script installe Oh My Zsh dans `~/.oh-my-zsh` et génère un fichier `~/.zshrc` de base. A la fin, il propose de définir Zsh comme shell par défaut, répondre **Y**.

Résultat après installation de Oh My Zsh confirme l'installation et définit Zsh comme shell par défaut :

{{< img src="/images/labs/ohmyzsh/ohmyzsh-installed.png" width="70%" >}}

> **Attention** — Si la question n'est pas posée automatiquement, définir le shell manuellement à l'étape suivante.

### 1.3 Définir Zsh comme shell par défaut

```bash
chsh -s $(which zsh)
```

La modification prend effet à la prochaine ouverture de session ou reconnexion SSH.

### 1.4 Configuration du prompt style Kali Linux

Ouvrir le fichier de configuration Zsh :

```bash
nano ~/.zshrc
```

Localiser la ligne `ZSH_THEME` et la vider :

```bash
ZSH_THEME=""
```

Ajouter les lignes suivantes à la **fin du fichier** :

```bash
PROMPT='%F{blue}┌──(%F{cyan}%n㉿%m%F{blue})-[%F{white}%~%F{blue}]%f
└─%F{cyan}$%f '
```

> **Navigation Nano**  `Ctrl+O` pour sauvegarder · `Entrée` pour confirmer · `Ctrl+X` pour quitter

Appliquer les changements sans redémarrer la session :

```bash
source ~/.zshrc
```

Résultat sur **komilab** : prompt utilisateur standard avec coloration cyan et structure arborescente style Kali Linux

{{< img src="/images/labs/ohmyzsh/prompt-user.png" width="60%" >}}

---

## 2. Installation pour l'utilisateur root

> **Securite** — Par convention Unix, le prompt root utilise la couleur **rouge** et le caractère `#` afin d'identifier immédiatement une session à hauts privilèges. Cette distinction visuelle est une bonne pratique de sécurité.

### 2.1 Passer en root

```bash
sudo -i
```

### 2.2 Installer Oh My Zsh pour root

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

### 2.3 Configurer le prompt root

Éditer le fichier de configuration de root :

```bash
nano /root/.zshrc
```

Vider la variable `ZSH_THEME` :

```bash
ZSH_THEME=""
```

Ajouter à la fin du fichier — couleur rouge et symbole `#` pour root :

```bash
PROMPT='%F{blue}┌──(%F{red}%n㉿%m%F{blue})-[%F{white}%~%F{blue}]%f
└─%F{red}#%f '
```

Appliquer la configuration :

```bash
source /root/.zshrc
```

Résultat sur **komilab** : prompt root avec indicateur rouge, distinction visuelle immédiate des sessions à hauts privilèges

{{< img src="/images/labs/ohmyzsh/prompt-root.png" width="60%" >}}

---

## 3. Récapitulatif des fichiers modifiés

| Fichier | Portée | Modification |
|---|---|---|
| `~/.zshrc` | Utilisateur courant | ZSH_THEME + PROMPT Kali |
| `/root/.zshrc` | Utilisateur root | ZSH_THEME + PROMPT rouge (#) |
| `/etc/shells` | Système | Mis à jour automatiquement par `chsh` |

---

## 4. Dépannage

| Problème constaté | Solution |
|---|---|
| Le prompt ne change pas après `source ~/.zshrc` | Fermer et rouvrir le terminal, ou se déconnecter/reconnecter la session SSH. |
| Erreur : `chsh: PAM authentication failed` | Utiliser : `sudo chsh -s $(which zsh) <username>` |
| Caractères spéciaux mal affichés | Configurer le terminal avec une police compatible : JetBrains Mono, MesloLGS NF ou Fira Code. |
| Oh My Zsh ralentit le démarrage du shell | Commenter les plugins inutilisés dans `~/.zshrc`, ligne : `plugins=(...)` |
