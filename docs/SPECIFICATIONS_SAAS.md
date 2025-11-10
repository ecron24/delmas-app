# 🚀 Spécifications Fonctionnelles SaaS
## Inter-App - Plateforme Multi-Tenant

**Version:** 1.0
**Date:** 2025-11-10
**Produit:** Inter-App (SaaS pour gestion d'interventions)
**Basé sur:** Delmas-App

---

## 📋 Table des Matières

1. [Vision Produit](#vision-produit)
2. [Personas et Cas d'Usage](#personas-et-cas-dusage)
3. [Fonctionnalités Cœur SaaS](#fonctionnalités-cœur-saas)
4. [Plans et Pricing](#plans-et-pricing)
5. [Parcours Utilisateur](#parcours-utilisateur)
6. [Fonctionnalités White-Label](#fonctionnalités-white-label)
7. [API et Intégrations](#api-et-intégrations)
8. [Sécurité et Conformité](#sécurité-et-conformité)
9. [Roadmap Produit](#roadmap-produit)

---

## 🎯 Vision Produit

### Pitch

**Inter-App** est une plateforme SaaS B2B permettant aux entreprises de services (piscines, HVAC, plomberie, électricité, etc.) de gérer leurs interventions, clients, devis et factures de manière professionnelle avec un branding personnalisé.

### Proposition de Valeur

| Pour qui | Problème | Solution Inter-App | Bénéfice |
|----------|----------|-------------------|----------|
| **Entreprises de services** | Gestion papier/Excel chaotique | Application tout-en-un web/mobile | Gain de temps 50% |
| **Techniciens terrain** | Saisie difficile, pas d'historique | App mobile avec signature numérique | Pas de paperasse |
| **Directeurs** | Pas de visibilité CA/rentabilité | Dashboard temps réel + stats | Décisions data-driven |
| **Comptables** | Factures manuelles, erreurs | Génération auto PDF + numérotation | Zéro erreur |

### Différenciation vs Concurrents

| Concurrent | Forces | Faiblesses | Notre Avantage |
|-----------|--------|-----------|----------------|
| **Sellsy** | Complet, mature | Cher (99€+), complexe | Plus simple, moins cher |
| **Pennylane** | Moderne, intégrations | Focus compta, pas terrain | Focus terrain + signature |
| **Odoo** | Open source, modulaire | Technique, setup complexe | Plug & play, SaaS |
| **Excel/Papier** | Gratuit, connu | Chaos, erreurs, lent | Automatisation, temps réel |

**Notre positionnement:** Simple, abordable, spécialisé pour entreprises de services terrain.

---

## 👥 Personas et Cas d'Usage

### Persona 1: Michel - Entrepreneur Piscines

**Profil:**
- 45 ans, patron de "Piscines Azur"
- 2 techniciens, 150 clients
- Budget limité, pas technique
- Objectif: Professionnaliser son entreprise

**Jobs to be Done:**
- Envoyer des devis pros rapidement
- Suivre ses interventions plannifiées
- Facturer automatiquement après intervention
- Suivre ses encaissements

**Parcours actuel (sans Inter-App):**
1. Client appelle pour intervention
2. Michel note sur cahier
3. Technicien va sur place, fait l'intervention
4. Technicien revient, dit ce qu'il a fait
5. Michel crée facture Word/Excel
6. Michel envoie par email ou courrier
7. Michel suit paiements sur Excel

**Parcours cible (avec Inter-App):**
1. Client appelle → Michel crée intervention dans l'app (30 sec)
2. Technicien voit intervention sur son mobile
3. Technicien fait intervention, saisit produits utilisés, fait signer client
4. Intervention complétée → Facture générée automatiquement
5. Facture envoyée par email au client (1 clic)
6. Statut facture mis à jour automatiquement si paiement

**Gain:** 2h/jour économisées, factures pros, aucune erreur.

---

### Persona 2: Sophie - Technicienne Terrain

**Profil:**
- 32 ans, technicienne chez "Chauffage Services"
- 5-10 interventions/jour
- Smartphone, pas d'ordinateur
- Objectif: Travailler efficacement, pas de paperasse

**Jobs to be Done:**
- Voir planning du jour sur mobile
- Accéder aux infos client/piscine
- Saisir produits utilisés facilement
- Faire signer le client
- Photos avant/après

**Parcours actuel (sans Inter-App):**
1. Chef donne planning papier le matin
2. Sophie va chez clients, fait interventions
3. Sophie note sur papier ce qu'elle a fait
4. Sophie revient, recopie tout sur ordinateur (30 min)

**Parcours cible (avec Inter-App):**
1. Sophie ouvre l'app le matin → Planning du jour avec adresses GPS
2. Sophie clique sur intervention → Voir détails client/piscine
3. Sophie fait l'intervention, saisit produits dans l'app (2 min)
4. Sophie fait signer client sur tablette/mobile
5. Sophie valide → C'est fait, facture générée automatiquement

**Gain:** 30 min/jour économisées, pas de ressaisie, satisfaction client (signature pro).

---

### Persona 3: Laura - Directrice Administratif

**Profil:**
- 38 ans, gère admin pour "ElecPlus" (10 techniciens)
- Responsable compta, facturation, suivi CA
- Utilise Excel, logiciel compta
- Objectif: Optimiser rentabilité, cash flow

**Jobs to be Done:**
- Suivre CA mensuel/annuel
- Relancer factures impayées
- Analyser rentabilité par type intervention
- Préparer données pour comptable

**Parcours actuel (sans Inter-App):**
1. Récupère feuilles de route techniciens
2. Ressaisit dans Excel
3. Crée factures manuellement
4. Suit paiements dans Excel
5. Envoie relances manuelles
6. Fait tableaux de bord Excel pour patron

**Parcours cible (avec Inter-App):**
1. Dashboard temps réel: CA, factures en attente, stats
2. Factures générées automatiquement après chaque intervention
3. Alerte factures en retard → Relance 1 clic
4. Export compta pour expert-comptable (CSV)
5. Rapports automatiques envoyés au patron

**Gain:** 10h/mois économisées, visibilité temps réel, décisions plus rapides.

---

## 🛠️ Fonctionnalités Cœur SaaS

### 1. Inscription et Onboarding

#### 1.1 Page d'Inscription Publique

**URL:** `https://inter-app.com/signup`

**Étape 1: Compte**
- Email (unique, validation)
- Mot de passe (min 8 caractères, 1 majuscule, 1 chiffre)
- Prénom / Nom
- Téléphone (optionnel)

**Étape 2: Entreprise**
- Nom entreprise (obligatoire)
- Slug/Subdomain (obligatoire, unique)
  - Validation: `^[a-z0-9-]{3,30}$`
  - Aperçu: `votre-slug.inter-app.com`
- Secteur d'activité:
  - Piscines
  - Chauffage/Climatisation
  - Plomberie
  - Électricité
  - Autre

**Étape 3: Plan**
- Sélection plan (Starter / Pro / Enterprise)
- Période d'essai 14 jours gratuits (pas de CB requise)
- Comparatif plans visible

**Étape 4: Confirmation**
- Récapitulatif
- CGU/CGV à accepter
- Bouton "Créer mon compte"

**Actions Backend:**
1. Créer utilisateur dans `auth.users`
2. Créer tenant dans `tenants`
3. Lier user au tenant dans `tenant_users` (role: owner)
4. Créer `company_settings` avec valeurs par défaut
5. Créer données de base (catégories, statuts, types)
6. Envoyer email de bienvenue
7. Rediriger vers onboarding

---

#### 1.2 Wizard d'Onboarding

**URL:** `https://[slug].inter-app.com/onboarding`

**Étape 1: Configuration Entreprise**
- Adresse complète
- SIRET
- Numéro TVA
- Email professionnel
- Téléphone professionnel
- Logo (upload)

**Étape 2: Paramètres Facturation**
- Préfixe factures (ex: "INV", "FAC", "PRO")
- Délai paiement (15, 30, 45, 60 jours)
- Mentions légales par défaut
- CGV (upload ou texte)

**Étape 3: Branding**
- Couleur primaire (color picker)
- Couleur secondaire
- Upload logo (PNG/SVG, max 2MB)
- Aperçu en temps réel

**Étape 4: Import Données (optionnel)**
- Import clients CSV
- Import produits CSV
- Templates fournis
- Validation et preview avant import

**Étape 5: Invitation Équipe (optionnel)**
- Inviter collaborateurs par email
- Assigner rôles (Admin, User, Lecture seule)
- Skip pour l'instant

**Étape 6: Découverte Produit**
- Tour guidé interactif (tooltips)
- Vidéo de 3 min "Comment créer votre première intervention"
- Accès documentation
- Bouton "Commencer"

**Actions Backend:**
1. Sauvegarder company_settings
2. Upload logo vers Supabase Storage
3. Créer invitations utilisateurs (emails)
4. Import CSV si fourni
5. Marquer onboarding comme complété

---

### 2. Gestion Multi-Utilisateurs

#### 2.1 Rôles et Permissions

| Rôle | Permissions | Use Case |
|------|------------|----------|
| **Owner** | Tout + gérer plan/facturation | Patron, fondateur |
| **Admin** | Tout sauf plan/facturation | Directeur, responsable |
| **User** | CRUD interventions, clients, factures | Technicien, commercial |
| **Readonly** | Lecture seule | Stagiaire, consultant |

**Matrice de Permissions:**

| Action | Owner | Admin | User | Readonly |
|--------|-------|-------|------|----------|
| Créer/Modifier/Supprimer interventions | ✅ | ✅ | ✅ | ❌ |
| Voir interventions | ✅ | ✅ | ✅ | ✅ |
| Créer/Modifier clients | ✅ | ✅ | ✅ | ❌ |
| Supprimer clients | ✅ | ✅ | ❌ | ❌ |
| Créer/Envoyer factures | ✅ | ✅ | ✅ | ❌ |
| Voir factures | ✅ | ✅ | ✅ | ✅ |
| Gérer produits/catalogue | ✅ | ✅ | ✅ | ❌ |
| Modifier company_settings | ✅ | ✅ | ❌ | ❌ |
| Inviter/Gérer utilisateurs | ✅ | ✅ | ❌ | ❌ |
| Voir statistiques | ✅ | ✅ | ✅ | ✅ |
| Gérer plan/facturation | ✅ | ❌ | ❌ | ❌ |
| Exporter données | ✅ | ✅ | ✅ | ❌ |
| Accès API | ✅ | ✅ | ❌ | ❌ |

---

#### 2.2 Invitation Utilisateurs

**Page:** `/dashboard/settings/users`

**Fonctionnalités:**

**Inviter un utilisateur:**
1. Cliquer "Inviter un utilisateur"
2. Entrer email
3. Choisir rôle (Admin, User, Readonly)
4. Cliquer "Envoyer l'invitation"

**Actions Backend:**
1. Vérifier que user actuel est Owner/Admin
2. Vérifier limite plan (max_users)
3. Créer invitation dans `tenant_users` (is_active: false)
4. Envoyer email avec lien magique: `https://inter-app.com/invitation/[token]`

**Email d'invitation:**
```
Sujet: [Nom Entreprise] vous invite à rejoindre Inter-App

Bonjour,

[Nom Inviteur] vous invite à rejoindre [Nom Entreprise] sur Inter-App.

Vous aurez accès en tant que [Rôle] à:
- Gestion des interventions
- Suivi des clients
- Facturation
- [Autres features selon rôle]

Cliquer ici pour accepter: [Lien]

Ce lien expire dans 7 jours.
```

**Acceptation invitation:**
1. User clique sur lien
2. Si user existe déjà → Login puis activation
3. Si user n'existe pas → Créer compte puis activation
4. Marquer `tenant_users.is_active = true`
5. Rediriger vers dashboard de l'entreprise

---

#### 2.3 Gestion Utilisateurs

**Page:** `/dashboard/settings/users`

**Liste des utilisateurs:**
- Tableau avec: Nom, Email, Rôle, Statut, Actions
- Filtres: Tous, Actifs, Invitations en attente
- Recherche par nom/email

**Actions:**
- **Changer rôle:** Dropdown inline (sauf Owner si pas Owner)
- **Désactiver:** Mettre `is_active = false` (ne peut plus se connecter)
- **Retirer:** Supprimer de `tenant_users` (sauf Owner)
- **Réinviter:** Renvoyer email si invitation expirée

**Limites par plan:**
- **Starter:** Max 2 utilisateurs
- **Pro:** Max 10 utilisateurs
- **Enterprise:** Illimité

**Message si limite atteinte:**
> Vous avez atteint la limite de votre plan (2 utilisateurs). Passez au plan Pro pour inviter jusqu'à 10 utilisateurs. [Mettre à niveau]

---

### 3. Plans et Pricing

#### 3.1 Structure des Plans

| Plan | Prix/mois | Prix/an | Économie annuelle |
|------|-----------|---------|------------------|
| **Starter** | 49€ | 490€ | 2 mois gratuits |
| **Pro** | 99€ | 990€ | 2 mois gratuits |
| **Enterprise** | Sur devis | Sur devis | - |

#### 3.2 Détail des Plans

### Plan Starter - 49€/mois

**Pour qui:** Petites entreprises (1-2 personnes)

**Limites:**
- 2 utilisateurs max
- 200 clients
- 500 interventions/mois
- 5 GB stockage (photos, documents)
- 500 produits catalogue

**Features incluses:**
- ✅ Gestion interventions illimitée (dans limite)
- ✅ Gestion clients et prospects
- ✅ Factures proforma et finales
- ✅ Génération PDF professionnelle
- ✅ Envoi email automatique
- ✅ Signature numérique client
- ✅ Photos avant/après
- ✅ Dashboard et statistiques
- ✅ Import/Export CSV
- ✅ Support email standard (48h)
- ❌ Domaine personnalisé
- ❌ White-label complet
- ❌ API
- ❌ Intégrations tierces
- ❌ Support prioritaire

---

### Plan Pro - 99€/mois

**Pour qui:** Entreprises en croissance (3-10 personnes)

**Limites:**
- 10 utilisateurs max
- 1000 clients
- 2000 interventions/mois
- 20 GB stockage
- 2000 produits catalogue

**Features incluses:**
- ✅ **Tout Starter +**
- ✅ **Domaine personnalisé** (ex: app.votre-entreprise.com)
- ✅ **White-label complet** (logo, couleurs, sans marque Inter-App)
- ✅ **API REST** complète
- ✅ **Webhooks** pour intégrations
- ✅ **Intégrations:**
  - Google Calendar (sync bidirectionnel)
  - Zapier / Make
  - Stripe (paiements en ligne)
- ✅ **Rapports avancés:**
  - Rentabilité par type intervention
  - Performance techniciens
  - Prévisions CA
- ✅ **Multi-devises** (€, $, £, CHF)
- ✅ **Support prioritaire** (24h, chat)

---

### Plan Enterprise - Sur devis

**Pour qui:** Grandes entreprises (10+ personnes), besoins spécifiques

**Limites:**
- Utilisateurs illimités
- Clients illimités
- Interventions illimitées
- 100 GB stockage
- Produits illimités

**Features incluses:**
- ✅ **Tout Pro +**
- ✅ **Onboarding personnalisé** (1h de formation)
- ✅ **SLA 99.9%** uptime garanti
- ✅ **Support prioritaire 24/7** (téléphone, chat, email)
- ✅ **Account manager dédié**
- ✅ **Développements sur mesure** (selon besoins)
- ✅ **Intégrations sur mesure** (ERP, CRM existants)
- ✅ **Backup quotidien dédié**
- ✅ **Audit sécurité annuel**
- ✅ **Formation équipe** (en ligne ou sur site)
- ✅ **Facturation annuelle ou mensuelle**
- ✅ **Contrat personnalisé**

**Contact:** [Formulaire pour demander un devis]

---

#### 3.3 Période d'Essai

**Tous les plans:**
- 14 jours gratuits
- Accès complet aux features du plan
- Aucune carte bancaire requise
- Données conservées après essai

**Workflow essai:**
1. Signup → Tenant créé avec `subscription_status: 'trial'`
2. `trial_ends_at` = NOW() + 14 jours
3. Utilisateur accède à toutes les features
4. À J-3: Email "Votre essai se termine bientôt"
5. À J-0:
   - Si plan ajouté → Continue normalement
   - Si pas de plan → `subscription_status: 'suspended'`
6. Après suspension:
   - Accès lecture seule (dashboard, export données)
   - Banner "Votre essai est terminé. Choisissez un plan pour continuer."
   - 7 jours pour activer un plan
   - Après 7 jours: Données conservées mais compte gelé

---

#### 3.4 Gestion Abonnement

**Page:** `/dashboard/settings/subscription`

**Informations affichées:**
- Plan actuel
- Statut (Trial, Active, Suspended, Cancelled)
- Date fin essai (si trial)
- Prochaine facturation (si active)
- Utilisation vs limites:
  - Utilisateurs: 2 / 2 (100%)
  - Clients: 87 / 200 (43%)
  - Interventions ce mois: 124 / 500 (25%)
  - Stockage: 1.2 GB / 5 GB (24%)

**Actions:**
- **Changer de plan:**
  - Upgrade: Immédiat, prorata calculé
  - Downgrade: Effectif à la fin de la période de facturation
- **Ajouter/Changer mode de paiement:** Via Stripe
- **Historique factures:** Télécharger PDFs
- **Annuler abonnement:** Avec confirmation + raison

**Upgrade Workflow:**
1. User clique "Passer à Pro"
2. Redirection Stripe Checkout
3. Paiement CB
4. Webhook Stripe → Mise à jour `subscription_plan` et `subscription_status`
5. Redirection dashboard avec message succès
6. Features Pro activées immédiatement

**Downgrade Workflow:**
1. User clique "Passer à Starter"
2. Confirmation: "Le changement sera effectif le [date]. Vous conservez vos features Pro jusqu'à cette date."
3. À la date: Webhook Stripe → Mise à jour plan
4. Vérifier limites (si > limites Starter, alerter user)

---

### 4. White-Label et Personnalisation

#### 4.1 Branding

**Page:** `/dashboard/settings/branding`

**Paramètres disponibles (selon plan):**

| Paramètre | Starter | Pro | Enterprise |
|-----------|---------|-----|-----------|
| Logo entreprise | ✅ | ✅ | ✅ |
| Couleur primaire | ✅ | ✅ | ✅ |
| Couleur secondaire | ✅ | ✅ | ✅ |
| Subdomain (slug.inter-app.com) | ✅ | ✅ | ✅ |
| Domaine personnalisé (app.votreentreprise.com) | ❌ | ✅ | ✅ |
| Supprimer "Powered by Inter-App" | ❌ | ✅ | ✅ |
| Favicon personnalisé | ❌ | ✅ | ✅ |
| Email domaine personnalisé (no-reply@votreentreprise.com) | ❌ | ❌ | ✅ |

**Configuration domaine personnalisé (Pro/Enterprise):**

1. User entre domaine: `app.piscines-azur.com`
2. Inter-App affiche instructions DNS:
```
Ajouter un enregistrement CNAME:
Hôte: app
Valeur: inter-app.com
TTL: 3600
```
3. Vérification automatique toutes les 5 minutes
4. Une fois validé: SSL automatique (Let's Encrypt)
5. Domaine actif sous 24h

---

#### 4.2 Personnalisation Factures PDF

**Page:** `/dashboard/settings/invoices`

**Paramètres:**
- Préfixe factures (PRO, INV, FAC, etc.)
- Numérotation: Année incluse (PRO-2025-0001) ou séquentiel (PRO-0001)
- Délai paiement par défaut (15, 30, 45, 60 jours)
- Pénalités de retard (%, ex: 12%)
- Frais de recouvrement (€, ex: 40€)

**Template PDF:**
- Header: Logo + infos entreprise
- Mentions légales
- Footer personnalisable
- Couleur primaire utilisée pour header/titres

**Aperçu en temps réel:**
- Bouton "Prévisualiser facture" génère PDF exemple

---

### 5. Limites et Quotas par Plan

#### 5.1 Enforcement des Limites

**Au moment de la création:**

```typescript
// Exemple: Créer un client
export async function createClient(clientData: any) {
  const tenantId = await getCurrentTenantId()

  // Vérifier limite
  const limit = await checkTenantLimit(tenantId, 'max_clients')
  const current = await countClients(tenantId)

  if (current >= limit.max_clients) {
    throw new Error(`Limite atteinte (${limit.max_clients} clients). Passez au plan Pro pour créer plus de clients.`)
  }

  // Créer le client
  // ...
}
```

**Messages d'erreur:**
- **Max clients atteint:**
  > Vous avez atteint la limite de 200 clients de votre plan Starter. Passez au plan Pro (1000 clients) pour continuer. [Mettre à niveau]

- **Max utilisateurs atteint:**
  > Vous avez atteint la limite de 2 utilisateurs. Passez au plan Pro pour inviter jusqu'à 10 collaborateurs. [Mettre à niveau]

- **Max interventions/mois atteint:**
  > Vous avez atteint 500 interventions ce mois. Passez au plan Pro (2000/mois) ou attendez le mois prochain. [Mettre à niveau]

---

#### 5.2 Soft Limits vs Hard Limits

**Hard Limits (bloquants):**
- Max utilisateurs
- Max clients
- Max interventions/mois
- Max stockage

**Soft Limits (warnings):**
- À 80% d'une limite → Banner warning:
  > ⚠️ Attention, vous avez utilisé 160/200 clients (80%). Pensez à passer au plan Pro avant d'atteindre la limite.

- À 95% → Email envoyé + banner plus visible

---

### 6. Sécurité et Conformité

#### 6.1 Isolation des Données

**Garanties:**
- ✅ Chaque tenant voit UNIQUEMENT ses données
- ✅ Row Level Security (RLS) PostgreSQL
- ✅ Tests d'isolation automatisés
- ✅ Audit logs des accès

**Tests réguliers:**
- Test d'isolation entre 2 tenants
- Tentative accès cross-tenant bloquée
- Logs conservés 90 jours

---

#### 6.2 GDPR et Données Personnelles

**Conformité RGPD:**
- ✅ Consentement utilisateur (CGU/CGV)
- ✅ Droit d'accès: Export données en 1 clic
- ✅ Droit de rectification: Modifier toutes les données
- ✅ Droit à l'oubli: Supprimer compte → Suppression données sous 30 jours
- ✅ Portabilité: Export CSV/JSON
- ✅ DPO: contact@inter-app.com

**Page:** `/dashboard/settings/data-privacy`

**Actions disponibles:**
- **Exporter mes données:** ZIP avec CSV de toutes les tables
- **Supprimer mon compte:**
  1. Confirmation avec mot de passe
  2. Email de confirmation envoyé
  3. Clic sur lien → Compte supprimé sous 48h
  4. Données anonymisées (factures légales conservées 10 ans)

---

#### 6.3 Sécurité

**Mesures:**
- ✅ HTTPS obligatoire (SSL)
- ✅ Authentification Supabase (OAuth, MFA possible)
- ✅ Mots de passe hashés (bcrypt)
- ✅ Rate limiting: 100 req/min par IP
- ✅ CORS configuré
- ✅ Headers sécurisés (CSP, X-Frame-Options)
- ✅ Backup quotidien (30 jours rétention)
- ✅ Monitoring 24/7 (Sentry, uptime)

**Certifications:**
- ISO 27001 (roadmap année 2)
- SOC 2 Type II (roadmap année 3)

---

### 7. Support et Documentation

#### 7.1 Support par Plan

| Canal | Starter | Pro | Enterprise |
|-------|---------|-----|-----------|
| **Documentation en ligne** | ✅ | ✅ | ✅ |
| **Base de connaissances** | ✅ | ✅ | ✅ |
| **Email support** | 48h | 24h | 4h |
| **Chat en ligne** | ❌ | ✅ | ✅ |
| **Téléphone** | ❌ | ❌ | ✅ |
| **Account manager** | ❌ | ❌ | ✅ |
| **Formation** | Vidéos | Vidéos + 1h | Sur mesure |

#### 7.2 Documentation

**URL:** `https://docs.inter-app.com`

**Sections:**
- Guide de démarrage rapide
- Tutoriels vidéo
- FAQ
- Référence API (pour plan Pro+)
- Intégrations
- Dépannage

**Dans l'app:**
- Icône "?" sur chaque page → Aide contextuelle
- Chatbot IA pour questions simples (roadmap)

---

## 🗺️ Roadmap Produit

### Phase 1: MVP - Q1 2025 (3 mois)

**Objectif:** Lancer le SaaS avec fonctionnalités essentielles

- ✅ Multi-tenancy complet
- ✅ Signup et onboarding
- ✅ Plans Starter et Pro
- ✅ Gestion utilisateurs (invitations, rôles)
- ✅ White-label (logo, couleurs, subdomain)
- ✅ Toutes les features Delmas-App adaptées multi-tenant
- ✅ Paiements Stripe
- ✅ Migration client Delmas

**KPIs:**
- 1 client existant migré (Delmas)
- 5 nouveaux clients onboardés
- 0 incident sécurité
- Temps d'onboarding < 15 min

---

### Phase 2: Croissance - Q2 2025 (3 mois)

**Objectif:** Améliorer l'expérience et acquérir clients

**Features:**
- 📱 App mobile (React Native)
- 🔌 API publique REST
- 🔗 Webhooks pour intégrations
- 📊 Rapports avancés
- 🌍 Multi-langues (FR, EN, ES)
- 💳 Paiements en ligne (Stripe Connect pour clients finaux)
- 📧 Templates emails personnalisables
- 🔔 Notifications push/email configurables

**Marketing:**
- Landing page optimisée
- Blog (SEO)
- Comparatifs vs concurrents
- Cas clients / témoignages
- Programme parrainage

**KPIs:**
- 20 clients payants
- MRR: 1500€
- Churn < 10%
- NPS > 8

---

### Phase 3: Scale - Q3-Q4 2025 (6 mois)

**Objectif:** Scaler et professionnaliser

**Features:**
- 🤖 Automatisations (Zapier-like intégré)
- 📈 Dashboard analytics avancé (prévisions ML)
- 👥 Rôles personnalisés
- 🏢 Gestion multi-sites (pour franchises)
- 💬 Chat client intégré
- 📦 Gestion stock avancée
- 🚗 Optimisation tournées (GPS)
- 🎨 Thèmes UI personnalisables

**Intégrations:**
- QuickBooks / Sage / Pennylane
- Google Workspace / Microsoft 365
- Twilio (SMS)
- DocuSign (signatures)

**KPIs:**
- 100 clients payants
- MRR: 8000€
- Équipe support dédiée
- ISO 27001 en cours

---

### Phase 4: Enterprise - 2026

**Objectif:** Cibler grandes entreprises

**Features:**
- SSO (SAML, LDAP)
- Audit logs avancés
- RBAC (Role-Based Access Control) granulaire
- API GraphQL
- Déploiement on-premise (option)
- BI intégré (Metabase-like)

**Certifications:**
- ISO 27001
- SOC 2 Type II
- ANSSI (si gov français)

**KPIs:**
- 500 clients payants
- MRR: 50k€
- Enterprise accounts: 10+
- Levée de fonds Série A

---

## 📊 Métriques de Succès

### Métriques Produit

| Métrique | Cible Année 1 | Comment Mesurer |
|----------|--------------|----------------|
| **Clients actifs** | 100 | COUNT(tenants WHERE is_active = true) |
| **MRR (Monthly Recurring Revenue)** | 8000€ | SUM(subscription_plan.price) |
| **Churn rate** | < 10% | Clients annulés / Clients totaux |
| **NPS (Net Promoter Score)** | > 8/10 | Sondage mensuel |
| **Temps onboarding** | < 15 min | Median(time signup → first intervention) |
| **Taux conversion trial → paid** | > 30% | Conversions / Trials |
| **Interventions créées/mois** | 5000+ | COUNT(interventions) |
| **Uptime** | > 99.5% | Monitoring |

### Métriques Utilisateur

| Métrique | Cible | Comment Mesurer |
|----------|-------|----------------|
| **DAU (Daily Active Users)** | 60% clients | Users ayant fait 1 action/jour |
| **Feature adoption** | > 70% | % users utilisant signature, PDF, etc. |
| **Temps moyen dans l'app** | 30 min/jour | Analytics |
| **Mobile vs Desktop** | 40% mobile | User-Agent |

---

## 📞 Contact et Support

**Questions Commerciales:**
- Email: sales@inter-app.com
- Téléphone: +33 1 XX XX XX XX
- Demo: [Réserver une démo]

**Support Technique:**
- Email: support@inter-app.com
- Chat: Disponible dans l'app (plan Pro+)
- Documentation: https://docs.inter-app.com

**Réseaux Sociaux:**
- LinkedIn: /company/inter-app
- Twitter: @inter_app
- YouTube: Tutoriels et webinaires

---

## 🎯 Résumé Exécutif

**Inter-App** transforme la gestion d'interventions pour entreprises de services en une expérience simple, professionnelle et personnalisée.

**Différenciation:**
- ✅ Onboarding en 10 minutes
- ✅ White-label complet
- ✅ Prix abordable (49€/mois)
- ✅ Signature numérique terrain
- ✅ Génération factures automatique

**Prochaines Étapes:**
1. Finaliser développement multi-tenancy (12 semaines)
2. Migrer client Delmas
3. Onboarder 3 clients beta testeurs
4. Lancer marketing (landing page, SEO)
5. Objectif: 20 clients payants fin Q2 2025

**Vision 3 ans:** Leader français de la gestion d'interventions pour TPE/PME de services, 1000+ clients, 100k€ MRR.

---

**🚀 Let's build Inter-App!**
