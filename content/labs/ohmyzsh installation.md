---
title: "Installation de Zsh & Oh My Zsh : Interface console style Kali Linux"
date: 2025-12-22
image: "/images/labs/og-ohmyzsh.png"
lastmod: 2026-03-09
description: "Configurer Zsh et Oh My Zsh sur Ubuntu/Debian/Kali Linux pour obtenir un prompt avancé avec coloration syntaxique, style Kali Linux, pour l'utilisateur standard et root."
categories: ["Systèmes"]
tags: ["zsh", "oh-my-zsh", "terminal", "shell", "linux"]
difficulty: "debutant"
author: "Komi Kpodohouin"
deploy_time: "~5min"
draft: false
---

## Objectif

Installer et configurer Zsh combiné au framework Oh My Zsh afin d'obtenir une interface console avancée similaire à celle de Kali Linux. Le prompt affiche l'utilisateur, la machine hôte et le répertoire courant sous forme arborescente avec une coloration syntaxique claire et lisible.

**Systèmes cibles** : Ubuntu 22.04+, Debian 11+, Kali Linux
**Niveau requis** : Administrateur système (sudo)

---

## Prérequis

Accès sudo, connexion internet, curl et git. Si absents : `sudo apt install curl git -y`

---

## Installation pour un utilisateur standard

### Installation de Zsh

```bash
sudo apt update && sudo apt install zsh -y
```

```bash
zsh --version
```

Résultat sur **komilab** : `zsh 5.9` sur aarch64 (ARM64) :

{{< img src="/images/labs/ohmyzsh/zsh-version.png" width="70%" >}}

### Installation de Oh My Zsh

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

Le script installe Oh My Zsh dans `~/.oh-my-zsh` et génère un `~/.zshrc` de base. À la fin il propose de définir Zsh comme shell par défaut, répondre **Y**.

{{< img src="/images/labs/ohmyzsh/ohmyzsh-installed.png" width="70%" >}}

Si la question n'est pas posée automatiquement, définir le shell manuellement à l'étape suivante.

### Définir Zsh comme shell par défaut

```bash
chsh -s $(which zsh)
```

La modification prend effet à la prochaine ouverture de session ou reconnexion SSH.

### Configuration du prompt style Kali Linux

```bash
nano ~/.zshrc
```

Localiser la ligne `ZSH_THEME` et la vider :

```bash
ZSH_THEME=""
```

Ajouter à la **fin du fichier** :

```bash
PROMPT='%F{blue}┌──(%F{cyan}%n㉿%m%F{blue})-[%F{white}%~%F{blue}]%f
└─%F{cyan}$%f '
```

`Ctrl+O` pour sauvegarder, `Entrée` pour confirmer, `Ctrl+X` pour quitter.

```bash
source ~/.zshrc
```

Résultat sur **komilab** : prompt utilisateur standard avec coloration cyan style Kali Linux :

{{< img src="/images/labs/ohmyzsh/prompt-user.png" width="60%" >}}

---

## Installation pour l'utilisateur root

Par convention Unix, le prompt root utilise la couleur **rouge** et le caractère `#` pour identifier immédiatement une session à hauts privilèges.

### Passer en root

```bash
sudo -i
```

### Installer Oh My Zsh pour root

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

### Configurer le prompt root

```bash
nano /root/.zshrc
```

Vider `ZSH_THEME` :

```bash
ZSH_THEME=""
```

Ajouter à la fin :

```bash
PROMPT='%F{blue}┌──(%F{red}%n㉿%m%F{blue})-[%F{white}%~%F{blue}]%f
└─%F{red}#%f '
```

```bash
source /root/.zshrc
```

Résultat sur **komilab** : prompt root rouge, distinction visuelle immédiate des sessions à hauts privilèges :

{{< img src="/images/labs/ohmyzsh/prompt-root.png" width="60%" >}}

---

## Dépannage

**Le prompt ne change pas après `source ~/.zshrc`** : Fermer et rouvrir le terminal ou se déconnecter/reconnecter la session SSH.

**Erreur `chsh: PAM authentication failed`** : Utiliser `sudo chsh -s $(which zsh) <username>`.

**Caractères spéciaux mal affichés** : Configurer le terminal avec une police compatible : JetBrains Mono, MesloLGS NF ou Fira Code.

**Oh My Zsh ralentit le démarrage** : Commenter les plugins inutilisés dans `~/.zshrc`, ligne `plugins=(...)`.
