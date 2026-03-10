---
title: "Mattermost: Installation on Debian/Ubuntu"
date: 2026-03-09
image: "/images/labs/og-mattermost.png"
lastmod: 2026-03-09
description: "Complete Mattermost installation guide with PostgreSQL on Debian/Ubuntu. Step-by-step deployment including database configuration and systemd service setup."
categories: ["Systems"]
tags: ["mattermost", "postgresql", "debian", "ubuntu", "collaboration", "self-hosted"]
difficulty: "intermediate"
author: "Komi Kpodohouin"
deploy_time: "~45min"
draft: false
---

Mattermost is an open source collaborative messaging platform — the self-hosted alternative to Slack. This lab covers a complete installation on Debian/Ubuntu using PostgreSQL as the database backend.

**Target systems**: Debian 12 or Ubuntu 22.04+  
**Required**: sudo access

---

## Prerequisites

Debian 12 or Ubuntu 22.04+ server, sudo access, minimum 2 GB RAM, internet connection.

---

## System update

```bash
sudo apt update && sudo apt upgrade -y
```

---

## Required utilities

```bash
sudo apt install curl gnupg2 software-properties-common bash-completion nano -y
```

---

## Official Mattermost repository

```bash
curl -sL https://deb.packages.mattermost.com/pubkey.gpg | gpg --dearmor | sudo tee /usr/share/keyrings/mattermost-archive-keyring.gpg > /dev/null
```

```bash
curl -o- https://deb.packages.mattermost.com/repo-setup.sh | sudo bash -s mattermost
```

```bash
sudo apt update
```

---

## Install Mattermost

```bash
sudo apt install mattermost -y
```

---

## Install PostgreSQL

```bash
sudo apt install postgresql postgresql-contrib -y
```

Verify the service is active and enabled at boot:

```bash
sudo systemctl status postgresql
```

{{< img src="/images/labs/mattermost/mm-01-postgresql-status.png" alt="PostgreSQL active and enabled at boot" >}}

---

## PostgreSQL — database setup

```bash
sudo -u postgres psql
```

{{< callout type="warning" >}}
Avoid passwords containing `@` — this character is interpreted as a separator in PostgreSQL connection strings and silently breaks the DataSource. Use a strong password like: `Xk9#mP2vLq8nRt5w`
{{< /callout >}}

Create the database and user:

```sql
CREATE DATABASE mattermost_db;
CREATE USER mattermost_user WITH PASSWORD 'YourPassword';
GRANT ALL PRIVILEGES ON DATABASE mattermost_db TO mattermost_user;
ALTER DATABASE mattermost_db OWNER TO mattermost_user;
```

{{< callout type="info" >}}
Replace `mattermost_db`, `mattermost_user` and `YourPassword` with values of your choice. These three elements must remain consistent throughout all following steps.
{{< /callout >}}

Connect to the database, then apply schema privileges:

```sql
\c mattermost_db
GRANT ALL ON SCHEMA public TO mattermost_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mattermost_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mattermost_user;
\q
```

{{< callout type="info" >}}
Replace `mattermost_db` and `mattermost_user` with the names defined in the previous step.
{{< /callout >}}

---

## systemd — PostgreSQL dependency

Do not modify `/lib/systemd/system/mattermost.service` directly. Use an override file that survives package updates:

```bash
sudo mkdir -p /etc/systemd/system/mattermost.service.d/
sudo tee /etc/systemd/system/mattermost.service.d/postgresql-dep.conf <<EOF
[Unit]
After=postgresql.service
BindsTo=postgresql.service
EOF
```

{{< callout type="info" >}}
`BindsTo` forces Mattermost to stop if PostgreSQL stops. `After` ensures correct startup order. Without this, Mattermost may attempt to start before the database is ready and fail silently.
{{< /callout >}}

```bash
sudo systemctl daemon-reload
```

---

## Mattermost configuration

```bash
sudo -u mattermost cp /opt/mattermost/config/config.defaults.json /opt/mattermost/config/config.json
sudo chmod 600 /opt/mattermost/config/config.json
```

```bash
sudo nano /opt/mattermost/config/config.json
```

Search for `DriverName` with `Ctrl+W`, verify the value is `postgres`:

```json
"DriverName": "postgres",
```

Search for `DataSource` and replace with the credentials created above:

```json
"DataSource": "postgres://mattermost_user:YourPassword@localhost:5432/mattermost_db?sslmode=disable&connect_timeout=10",
```

{{< callout type="info" >}}
Replace `mattermost_user`, `YourPassword` and `mattermost_db` with the values defined in the PostgreSQL step.
{{< /callout >}}

Search for `SiteURL` and set your server address:

```json
"SiteURL": "http://YOUR_SERVER_IP:8065",
```

{{< callout type="info" >}}
Replace `YOUR_SERVER_IP` with your server's IP address or domain name.
{{< /callout >}}

Save: `Ctrl+X`, `Y`, `Enter`.

---

## Starting the services

```bash
sudo systemctl enable postgresql mattermost
sudo systemctl start postgresql mattermost
```

```bash
sudo systemctl status mattermost
```

{{< img src="/images/labs/mattermost/mm-02-mattermost-status.png" alt="Mattermost service active (running)" >}}

If the service fails, check the exact error:

```bash
journalctl -xeu mattermost.service --no-pager | grep -E "error|Error|failed" | head -20
```

---

## Access Mattermost

```
http://YOUR_SERVER_IP:8065
```

The setup wizard will appear to create the admin account and configure the team.

---

## Deployment proof

{{< gallery >}}
  {{< gallery-img src="/images/labs/mattermost/mm-03-landing-browser.png" alt="Mattermost landing page" >}}
  {{< gallery-img src="/images/labs/mattermost/mm-04-create-account.png" alt="Admin account creation" >}}
  {{< gallery-img src="/images/labs/mattermost/mm-05-organisation.png" alt="Organization setup" >}}
  {{< gallery-img src="/images/labs/mattermost/mm-06-tools.png" alt="Integration tools selection" >}}
  {{< gallery-img src="/images/labs/mattermost/mm-07-town-square.png" alt="Mattermost workspace up and running" >}}
{{< /gallery >}}

---

## Troubleshooting

**`sudo: unknown user postgres`**: PostgreSQL is not installed or the installation failed. Reinstall with `sudo apt purge postgresql* -y && sudo apt install postgresql postgresql-contrib -y`.

**Mattermost service won't start**: Check logs with `sudo journalctl -u mattermost -f`. Verify the `DataSource` in `config.json`, especially the password and database name.

**Port 8065 unreachable**: Open the port with `sudo ufw allow 8065`.

**PostgreSQL does not start before Mattermost**: Verify that the `postgresql-dep.conf` file exists in `/etc/systemd/system/mattermost.service.d/`.
