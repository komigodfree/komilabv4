# KomiLab — Engineering Intelligence Lab

Plateforme documentaire technique production-ready.
Stack : Hugo + Cloudflare Pages + GitHub Actions.

## Démarrage rapide

```bash
# Prérequis : Hugo Extended >= 0.120
hugo version

# Développement local
hugo server -D --port 1313

# Build production
hugo --minify --gc
```

## Créer un nouveau Lab

```bash
hugo new content/labs/nom-du-lab.md
```

Remplir le front matter selon l'archétype `archetypes/labs.md`.

## Créer une Veille

```bash
hugo new content/veille/YYYY-MM-DD-titre.md
```

## Structure des fichiers

```
komilab/
├── archetypes/          # Templates de création de contenu
│   ├── labs.md
│   └── veille.md
├── assets/
│   ├── css/main.css     # Design system complet
│   └── js/main.js       # Interactions (theme, copy, search, TOC)
├── content/
│   ├── labs/            # Labs publiés
│   ├── veille/          # Veille technique
│   └── a-propos/        # Page à propos
├── layouts/
│   ├── _default/        # Templates génériques
│   ├── labs/            # Templates spécifiques labs
│   ├── partials/        # Composants réutilisables
│   └── shortcodes/      # Shortcodes Hugo
├── static/
│   ├── _headers         # Security headers Cloudflare
│   ├── _redirects       # Redirections Cloudflare
│   └── images/          # Assets statiques
└── hugo.toml            # Configuration principale
```

## Déploiement Cloudflare Pages

### Via GitHub Actions (recommandé)

1. Créer le projet dans Cloudflare Pages (connexion GitHub)
2. Ajouter les secrets GitHub :
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. Push sur `main` déclenche le déploiement automatique

### Configuration Cloudflare Pages (alternative directe)

- **Build command** : `hugo --minify --gc`
- **Build output directory** : `public`
- **Environment variable** : `HUGO_VERSION = 0.120.4`

## Shortcodes disponibles

```markdown
{{</* callout type="info" */>}}
Message informatif.
{{</* /callout */>}}

{{</* callout type="warning" */>}}
Point d'attention.
{{</* /callout */>}}

{{</* callout type="danger" */>}}
Erreur critique.
{{</* /callout */>}}

{{</* newsletter */>}}

{{</* discord */>}}
```

## Taxonomie contrôlée

### Catégories (categories)
- Réseaux
- Cybersécurité
- Virtualisation
- Cloud
- Hybrid Architecture
- Linux & Systèmes
- Automatisation
- Monitoring & Observabilité
- Haute Disponibilité & PRA
- Audit & Gouvernance IT
- Labs Expérimentaux

### Niveaux (difficulty)
- Débutant
- Intermédiaire
- Avancé
- Expert

## Newsletter

Intégration MailerLite/Brevo. Mettre à jour l'endpoint dans le fichier `assets/js/main.js` section `NEWSLETTER FORM`.

## Analytics

Plausible.io intégré. Configurer `plausibleDomain` dans `hugo.toml`.

## Conventions de nommage

- Labs : `nom-descriptif-court.md` (kebab-case)
- Veille : `YYYY-MM-DD-titre.md`
- Images : `nom-lab/schema-architecture.png`
- Séries : déclarées dans le front matter `series: ["Nom de la série"]`
