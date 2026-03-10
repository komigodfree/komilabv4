---
title: "NetBox: Docker Deployment on Ubuntu/Debian"
date: 2026-01-02
image: "/images/labs/og-netbox.png"
lastmod: 2026-03-09
description: "Deploy NetBox Community via Docker Compose on Ubuntu/Debian to manage, document, and automate your network and datacenter infrastructure."
categories: ["Infrastructure"]
tags: ["netbox", "docker", "docker-compose", "ipam", "dcim", "linux"]
difficulty: "intermédiaire"
author: "Komi Kpodohouin"
deploy_time: "~20min"
draft: false
---

## Objective

Deploy **NetBox Community** via Docker Compose on Ubuntu/Debian. NetBox is the reference open-source web application for managing, documenting, and automating network and datacenter infrastructure — covering IPAM (IP address management), DCIM (physical equipment management), VLANs, circuits, virtualization, and more.

**Target systems**: Ubuntu 22.04+, Debian 11+
**Required level**: System administrator (sudo)

---

## Prerequisites

| Prerequisite | Verification command |
|---|---|
| Sudo or root access | `sudo -v` |
| Active internet connection | `ping -c 2 google.com` |
| Docker installed and running | `docker --version` |
| Docker Compose installed | `docker compose version` |
| Git installed | `git --version` |
| Port 8000 available | `ss -tlnp \| grep 8000` |

{{< callout type="info" >}}
If Docker is not yet installed, go to [docs.docker.com/engine/install](https://docs.docker.com/engine/install/), select your distribution, and follow the official instructions. Docker Compose is included in recent versions of Docker Engine.
{{< /callout >}}

---

## Clone the NetBox Docker repository

The **netbox-docker** project is the official community-maintained repository for container-based deployment.

Clone the `release` branch — always stable and recommended for production:

```bash
git clone -b release https://github.com/netbox-community/netbox-docker.git
```

```bash
ls
```

{{< result >}}
netbox-docker
{{< /result >}}

```bash
cd netbox-docker/
```

```bash
ls
```

{{< result >}}
Caddyfile  configuration  docker-compose.yml  env  LICENSE  README.md  startup_scripts
{{< /result >}}

Do not modify `docker-compose.yml` directly. Use an override file at the next step.

---

## Configure the listening port

NetBox requires an override file named exactly `docker-compose.override.yml`: Docker Compose detects it automatically and merges it with the main file.

```bash
nano docker-compose.override.yml
```

Pay attention to **indentation** (2 spaces, no tabs):

```yaml
services:
  netbox:
    ports:
      - 8000:8080
```

Save: `Ctrl+X`, `Y`, `Enter`.

Port `8080` is the internal container port. It is exposed on `8000` on the host machine. NetBox will be accessible at `http://SERVER_IP:8000`.

---

## Pull Docker images

```bash
docker compose pull
```

This may take several minutes depending on your connection. Verify the downloaded images:

```bash
docker images
```

{{< result >}}
REPOSITORY                      TAG       IMAGE ID       CREATED        SIZE
netboxcommunity/netbox          latest    xxxxxxxxxxxx   x days ago     xxx MB
postgres                        16        xxxxxxxxxxxx   x days ago     xxx MB
redis                           7         xxxxxxxxxxxx   x days ago     xxx MB
{{< /result >}}

---

## Start the containers

```bash
docker compose up -d
```

{{< result >}}
✔ Network netbox-docker_default                Created    0.0s
✔ Volume netbox-docker_netbox-redis-cache-data Created    0.0s
✔ Volume netbox-docker_netbox-media-files      Created    0.0s
✔ Volume netbox-docker_netbox-reports-files    Created    0.0s
✔ Volume netbox-docker_netbox-scripts-files    Created    0.0s
✔ Volume netbox-docker_netbox-postgres         Created    0.0s
✔ Volume netbox-docker_netbox-redis-data       Created    0.0s
✔ Container netbox-docker-redis-cache-1        Started    0.2s
✔ Container netbox-docker-postgres-1           Started    0.2s
✔ Container netbox-docker-redis-1              Started    0.2s
✘ Container netbox-docker-netbox-1             Error      121.2s
✔ Container netbox-docker-netbox-worker-1      Created    0.0s
dependency failed to start: container netbox-docker-netbox-1 is unhealthy
{{< /result >}}

{{< callout type="warning" >}}
**The `netbox-docker-netbox-1 is unhealthy` error is normal and expected.** On first startup, NetBox initializes the PostgreSQL database, applies Django migrations, and prepares static files. This takes between 2 and 5 minutes. Docker considers the container "unhealthy" during this phase because the healthcheck fails before the application is ready.

Wait a few minutes before continuing.
{{< /callout >}}

Check status after a few minutes:

```bash
docker compose ps
```

{{< result >}}
NAME                            STATUS          PORTS
netbox-docker-netbox-1          healthy         0.0.0.0:8000->8080/tcp
netbox-docker-postgres-1        healthy
netbox-docker-redis-1           healthy
netbox-docker-redis-cache-1     healthy
netbox-docker-netbox-worker-1   healthy
{{< /result >}}

All containers must show `healthy` before continuing. If `netbox-1` remains in error after 5 minutes, see the Troubleshooting section.

---

## Create the admin account

```bash
docker compose exec netbox /opt/netbox/netbox/manage.py createsuperuser
```

{{< result >}}
Username:
Email address:
Password:
Password (again):
{{< /result >}}

{{< callout type="warning" >}}
NetBox requires a password of at least **12 characters** containing at least **one digit**. A password that is too simple returns:

`This password is too short. It must contain at least 12 characters.`
{{< /callout >}}

{{< result >}}
Superuser created successfully.
{{< /result >}}

---

## Access the web interface

```
http://SERVER_IP:8000
```

Log in with the credentials created in the previous step. The NetBox dashboard displays available modules: Organization, IPAM, DCIM, VPN, Virtualization, Circuits.

{{< img src="/images/netbox-dashboard.png" alt="NetBox Community Dashboard" >}}

---

## Troubleshooting

**`netbox-1` remains in error after 5 min**: Check logs with `docker compose logs netbox`.

**Interface inaccessible on port 8000**: Check the firewall with `sudo ufw status` and open if needed: `sudo ufw allow 8000`.

**`port is already allocated` error**: Another service is already using port 8000. Change it in `docker-compose.override.yml`, e.g. `8001:8080`.

**Password rejected**: Use at least 12 characters with a digit.

**PostgreSQL container in error**: Check disk space with `df -h`.

**Volume permission error**: Restart with `docker compose down -v && docker compose up -d` (this deletes data).
