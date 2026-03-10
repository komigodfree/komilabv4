---
title: "Zsh & Oh My Zsh Installation: Kali Linux-style Console"
date: 2025-12-22
image: "/images/labs/og-ohmyzsh.png"
lastmod: 2026-03-09
description: "Configure Zsh and Oh My Zsh on Ubuntu/Debian/Kali Linux for an advanced prompt with syntax highlighting, Kali Linux style, for both standard user and root."
categories: ["Systems"]
tags: ["zsh", "oh-my-zsh", "terminal", "shell", "linux"]
difficulty: "debutant"
author: "Komi Kpodohouin"
deploy_time: "~5min"
draft: false
---

## Objective

Install and configure Zsh combined with the Oh My Zsh framework to get an advanced console interface similar to Kali Linux. The prompt displays the user, hostname, and current directory in a tree format with clear, readable syntax highlighting.

**Target systems**: Ubuntu 22.04+, Debian 11+, Kali Linux
**Required level**: System administrator (sudo)

---

## Prerequisites

Sudo access, internet connection, curl and git. If missing: `sudo apt install curl git -y`

---

## Installation for a standard user

### Install Zsh

```bash
sudo apt update && sudo apt install zsh -y
```

```bash
zsh --version
```

Result on **komilab**: `zsh 5.9` on aarch64 (ARM64):

{{< img src="/images/labs/ohmyzsh/zsh-version.png" width="70%" >}}

### Install Oh My Zsh

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

The script installs Oh My Zsh into `~/.oh-my-zsh` and generates a base `~/.zshrc`. At the end it offers to set Zsh as the default shell — answer **Y**.

{{< img src="/images/labs/ohmyzsh/ohmyzsh-installed.png" width="70%" >}}

If the question is not asked automatically, set the shell manually at the next step.

### Set Zsh as the default shell

```bash
chsh -s $(which zsh)
```

The change takes effect at the next login or SSH reconnection.

### Configure the Kali Linux-style prompt

```bash
nano ~/.zshrc
```

Locate the `ZSH_THEME` line and clear it:

```bash
ZSH_THEME=""
```

Add at the **end of the file**:

```bash
PROMPT='%F{blue}┌──(%F{cyan}%n㉿%m%F{blue})-[%F{white}%~%F{blue}]%f
└─%F{cyan}$%f '
```

`Ctrl+O` to save, `Enter` to confirm, `Ctrl+X` to quit.

```bash
source ~/.zshrc
```

Result on **komilab**: standard user prompt with Kali Linux-style cyan coloring:

{{< img src="/images/labs/ohmyzsh/prompt-user.png" width="60%" >}}

---

## Installation for the root user

By Unix convention, the root prompt uses **red** and the `#` character to immediately identify a high-privilege session.

### Switch to root

```bash
sudo -i
```

### Install Oh My Zsh for root

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

### Configure the root prompt

```bash
nano /root/.zshrc
```

Clear `ZSH_THEME`:

```bash
ZSH_THEME=""
```

Add at the end:

```bash
PROMPT='%F{blue}┌──(%F{red}%n㉿%m%F{blue})-[%F{white}%~%F{blue}]%f
└─%F{red}#%f '
```

```bash
source /root/.zshrc
```

Result on **komilab**: red root prompt for immediate visual distinction of high-privilege sessions:

{{< img src="/images/labs/ohmyzsh/prompt-root.png" width="60%" >}}

---

## Troubleshooting

**Prompt does not change after `source ~/.zshrc`**: Close and reopen the terminal, or disconnect and reconnect the SSH session.

**`chsh: PAM authentication failed` error**: Use `sudo chsh -s $(which zsh) <username>`.

**Special characters not displaying correctly**: Configure your terminal with a compatible font: JetBrains Mono, MesloLGS NF, or Fira Code.

**Oh My Zsh slows down startup**: Comment out unused plugins in `~/.zshrc`, on the `plugins=(...)` line.
