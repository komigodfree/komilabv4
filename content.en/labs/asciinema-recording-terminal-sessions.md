---
title: "Asciinema: Record and Share Terminal Sessions"
date: 2026-02-28
image: "/images/labs/og-asciinema.png"
lastmod: 2026-03-09
description: "Install and use Asciinema on Ubuntu/Debian to record terminal sessions and share them online."
categories: ["Systems"]
tags: ["asciinema", "terminal", "documentation", "linux"]
difficulty: "debutant"
author: "Komi Kpodohouin"
deploy_time: "~15min"
draft: false
---

Asciinema records terminal sessions in the `.cast` format and publishes them online. Useful for documenting IT procedures in a reproducible way, without capturing video.

**Target systems**: Ubuntu 22.04+, Debian 11+
**Required level**: Basic Linux user (sudo)

---

## Prerequisites

Sudo access, internet connection, and Python 3.x + pip3. If pip3 is missing: `sudo apt install python3-pip -y`

---

## Installation

```bash
sudo apt update && sudo apt install asciinema -y
```

```bash
asciinema --version
```

Version `2.4.0` on komilab (aarch64):

{{< img src="/images/labs/asciinema/asciinema-version.png" width="65%" >}}

{{< callout type="info" >}}
`pip3 install asciinema` gives the latest available version, but the APT version is sufficient for standard system use.
{{< /callout >}}

---

## Link your asciinema.org account

```bash
asciinema auth
```

Asciinema displays a URL to open in the browser to link the machine to your account:

{{< img src="/images/labs/asciinema/asciinema-auth.png" width="75%" >}}

Once linked, the komilab profile is visible on asciinema.org:

{{< img src="/images/labs/asciinema/asciinema-profil.png" width="75%" >}}

Without an account, uploaded recordings are anonymous and available for 7 days.

---

## Record a session

```bash
asciinema rec my-lab.cast
```

Everything typed and displayed is captured. Use `exit` or `Ctrl+D` to stop.

{{< result >}}
asciinema: recording asciicast to my-lab.cast
asciinema: press <ctrl-d> or type "exit" when you're done
{{< /result >}}

{{< callout type="warning" >}}
Always use `--idle-time-limit 2` to truncate long pauses. Without it, a command that takes 30 seconds generates 30 seconds of silence during playback.
{{< /callout >}}

Full recommended command:

```bash
asciinema rec -t "My lab" --idle-time-limit 2 --cols 120 --rows 30 my-lab.cast
```

---

## Play back locally

```bash
asciinema play my-lab.cast
```

{{< img src="/images/labs/asciinema/asciinema-play.png" width="75%" >}}

Slowed down for a demo: `-s 0.5`. Sped up: `-s 2`.

---

## Upload and share

```bash
asciinema upload my-lab.cast
```

{{< img src="/images/labs/asciinema/asciinema-upload.png" width="75%" >}}

Asciinema generates a public URL. Result of the komilab demo (`whoami`, `hostname`, `uname -m`, `uptime` on aarch64):

{{< img src="/images/labs/asciinema/asciinema-org-recording.png" width="85%" >}}

**Demo link**: [asciinema.org/a/h3CWGevW7jt2TTg3](https://asciinema.org/a/h3CWGevW7jt2TTg3)

Record and upload in one command:

```bash
asciinema rec my-lab.cast && asciinema upload my-lab.cast
```

---

## Troubleshooting

**`asciinema: command not found`**: Check the PATH with `which asciinema` or reinstall via apt.

**Garbled characters**: Check encoding with `echo $LANG`, should return `en_US.UTF-8`.

**Upload fails (401 error)**: Re-link your account with `asciinema auth`.

**Long pauses during playback**: Re-record with `--idle-time-limit 2`.
