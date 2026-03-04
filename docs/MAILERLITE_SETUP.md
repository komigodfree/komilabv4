# Configuration MailerLite — KomiLab Newsletter

## 1. Créer le compte MailerLite
- Aller sur https://www.mailerlite.com
- Créer un compte gratuit (jusqu'à 1000 abonnés)
- Vérifier le domaine komilab.org

## 2. Créer un groupe d'abonnés
- Dashboard > Abonnés > Groupes > Créer un groupe
- Nommer : "KomiLab Newsletter"
- Noter l'ID du groupe (visible dans l'URL)

## 3. Créer un formulaire d'abonnement
- Dashboard > Formulaires > Créer un formulaire
- Type : Embedded
- Activer le double opt-in obligatoirement
- Configurer l'email de confirmation
- Noter le Form ID (dans l'URL du formulaire)

## 4. Configurer hugo.toml
Remplacer dans hugo.toml :
  mailerliteFormID = "VOTRE_FORM_ID"
  mailerliteGroupID = "VOTRE_GROUP_ID"

## 5. Notification automatique à chaque nouveau lab

### Option A : MailerLite Automation (recommandé)
1. Dashboard > Automations > Créer une automation
2. Trigger : RSS Feed (entrer https://komilab.org/labs/index.xml)
3. Fréquence : Quotidienne ou à la publication
4. Action : Envoyer email avec template "Nouveau Lab"
5. Template : utiliser les variables RSS {{rss_item_title}}, {{rss_item_url}}

### Option B : Zapier/Make (alternative)
- Trigger : RSS feed komilab.org/labs/index.xml
- Action : MailerLite > Envoyer campagne

## 6. Template email "Nouveau Lab"
Sujet : [KomiLab] Nouveau Lab : {{rss_item_title}}
Corps :
  Un nouveau lab vient d'être publié sur KomiLab.
  
  Titre : {{rss_item_title}}
  Description : {{rss_item_description}}
  Lire le lab : {{rss_item_url}}
  
  Temps de déploiement estimé : dans le contenu du lab
  
  --
  KomiLab — Engineering Intelligence Lab
  komilab.org
  Se désinscrire : {{unsubscribe_link}}
