# 🚀 Guide de Déploiement Client - Delmas App

> **Manuel complet pour onboarder un nouveau client SaaS**
>
> **Temps estimé total :** 4-6 heures
>
> **Objectif :** Client opérationnel avec son instance white label personnalisée

---

## 📋 Vue d'ensemble du processus

```
┌─────────────────────────────────────────────────────────────┐
│                    PROCESSUS D'ONBOARDING                    │
├──────────┬──────────┬──────────┬──────────┬────────┬────────┤
│   Jour 1 │  Jour 1  │  Jour 2  │  Jour 2  │ Jour 3 │ Suivi  │
│   (2h)   │   (2h)   │   (2h)   │   (1h)   │  (1h)  │ (30j)  │
├──────────┼──────────┼──────────┼──────────┼────────┼────────┤
│ Prérequis│ Infra &  │ Config   │ Formation│ Tests  │Support │
│ & Setup  │ Database │ White    │ Utilisat.│ & Go   │continu │
│          │          │ Label    │          │ Live   │        │
└──────────┴──────────┴──────────┴──────────┴────────┴────────┘
```

---

## ✅ Phase 1 : Prérequis & Préparation (Avant J-1)

### 📄 Documents à Collecter du Client

**Checklist informations requises :**

#### Informations Entreprise
- [ ] Nom commercial
- [ ] Forme juridique (EI, SARL, SAS, etc.)
- [ ] SIRET
- [ ] Numéro TVA intracommunautaire
- [ ] Numéro RCS + Ville d'immatriculation
- [ ] Capital social (si SARL/SAS/SA)
- [ ] Adresse complète du siège
- [ ] Email contact principal
- [ ] Téléphone
- [ ] Site web (optionnel)

#### Informations Comptables & Légales
- [ ] Conditions générales de vente (CGV)
- [ ] Délai de paiement standard (ex: 30 jours)
- [ ] Taux pénalités de retard (défaut: 12%)
- [ ] Indemnité forfaitaire recouvrement (défaut: 40€)
- [ ] Préfixe numérotation factures (ex: FAC, PRO, INV)
- [ ] Logo format PNG/SVG (haute résolution)
- [ ] Couleurs charte graphique (code HEX)

#### Données Métier
- [ ] Liste clients existants (CSV)
- [ ] Catalogue produits/services (CSV)
- [ ] Templates interventions types (optionnel)
- [ ] Historique interventions (optionnel - import)

#### Accès Techniques
- [ ] Email Google Workspace (pour sync calendrier)
- [ ] Accès API Resend (ou créer compte)
- [ ] Compte Stripe (si paiements en ligne)

---

### 🔧 Prérequis Infrastructure

**Notre côté (provider) :**
- [ ] Serveur VPS avec Docker (min 2 vCPU, 4GB RAM)
- [ ] Nom de domaine ou sous-domaine client
- [ ] Certificat SSL (Let's Encrypt)
- [ ] Instance Supabase provisionnée
- [ ] Service Gotenberg opérationnel
- [ ] Resend API configuré

---

## 🏗️ Phase 2 : Installation Infrastructure (Jour 1 - 2h)

### Étape 2.1 : Provisionner Supabase

**Option A : Supabase Cloud (Recommandé)**

```bash
# 1. Créer nouveau projet Supabase
# Via interface : https://app.supabase.com/
# Nom projet : [nom-client]-delmas-app
# Region : Europe (Frankfurt ou London)
# Plan : Pro (25$/mois)

# 2. Noter les credentials
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_KEY=eyJhbG...
```

**Checklist Supabase :**
- [ ] Projet créé
- [ ] Region EU sélectionnée
- [ ] Database password sécurisé (1Password)
- [ ] API keys copiées

---

### Étape 2.2 : Créer Schémas Database

```sql
-- 1. Se connecter à Supabase SQL Editor

-- 2. Créer les schémas
CREATE SCHEMA IF NOT EXISTS piscine_delmas_public;
CREATE SCHEMA IF NOT EXISTS piscine_delmas_compta;

-- 3. Exécuter TOUTES les migrations dans l'ordre
-- Fichiers à exécuter depuis /supabase/migrations/ :
```

**Ordre d'exécution des migrations :**

```bash
# Dans Supabase SQL Editor, exécuter dans cet ordre :

1. 20251027_add_missing_fields.sql
2. 20251028_fix_invoices_tax_amount.sql
3. 20251028_fix_invoice_items_total.sql
4. 20251028_fix_create_proforma_invoice_function.sql
5. 20251028_fix_invoice_number_race_condition.sql
6. 20251028_add_intervention_on_hold_status.sql
7. 20251028_enable_rls_invoice_number_sequences.sql
8. 20251029_create_company_settings.sql ⭐ IMPORTANT
```

**Checklist Database :**
- [ ] Schémas créés
- [ ] 8 migrations exécutées sans erreur
- [ ] Table `company_settings` existe
- [ ] RLS activé sur toutes les tables

---

### Étape 2.3 : Déployer Application Docker

**Fichier docker-compose.yml client :**

```yaml
version: '3.8'

services:
  # Application Next.js
  delmas-app:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./:/app
      - /app/node_modules
      - /app/.next
    ports:
      - "3000:3000"
    environment:
      # Supabase
      NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_KEY}

      # Email (Resend)
      RESEND_API_KEY: ${RESEND_API_KEY}

      # PDF Generation
      GOTENBERG_URL: http://gotenberg:3000/forms/chromium/convert/html

      # n8n Webhooks (optionnel)
      N8N_WEBHOOK_VALIDATE_INTERVENTION: ${N8N_WEBHOOK_URL}
      N8N_WEBHOOK_AUTH_HEADER_NAME: X-N8N-Auth
      N8N_WEBHOOK_AUTH_HEADER_VALUE: ${N8N_AUTH_TOKEN}

      # Google Calendar (optionnel)
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      GOOGLE_REDIRECT_URI: ${APP_URL}/api/auth/callback/google

      NODE_ENV: production
    command: sh -c "npm install && npm run build && npm start"
    restart: unless-stopped
    networks:
      - delmas-network

  # Gotenberg - PDF Generation
  gotenberg:
    image: gotenberg/gotenberg:7
    ports:
      - "3001:3000"
    restart: unless-stopped
    networks:
      - delmas-network
    command:
      - "gotenberg"
      - "--chromium-disable-javascript=false"
      - "--chromium-allow-list=file:///.*"

networks:
  delmas-network:
    driver: bridge
```

**Fichier .env client :**

```bash
# Application
APP_URL=https://app.[client].fr
APP_NAME=[Nom Client]

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Email
RESEND_API_KEY=re_xxx

# PDF
GOTENBERG_URL=http://gotenberg:3000/forms/chromium/convert/html

# n8n (optionnel)
N8N_WEBHOOK_VALIDATE_INTERVENTION=
N8N_WEBHOOK_AUTH_HEADER_NAME=
N8N_WEBHOOK_AUTH_HEADER_VALUE=

# Google (optionnel)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

**Commandes déploiement :**

```bash
# 1. Cloner repo
git clone https://github.com/votre-org/delmas-app.git
cd delmas-app

# 2. Checkout branche client
git checkout -b client/[nom-client]

# 3. Copier .env
cp .env.example .env
# Éditer .env avec les vraies valeurs

# 4. Lancer stack
docker-compose up -d

# 5. Vérifier logs
docker-compose logs -f delmas-app

# 6. Vérifier app accessible
curl http://localhost:3000
```

**Checklist Docker :**
- [ ] Docker Compose up sans erreur
- [ ] App accessible sur port 3000
- [ ] Gotenberg répond sur port 3001
- [ ] Logs propres (pas d'erreurs)
- [ ] Connexion Supabase OK

---

### Étape 2.4 : Configuration Nginx Reverse Proxy

**Fichier nginx site config :**

```nginx
# /etc/nginx/sites-available/[client].conf

server {
    listen 80;
    server_name app.[client].fr;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.[client].fr;

    # SSL Certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/app.[client].fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.[client].fr/privkey.pem;

    # SSL Config
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Max upload size (pour import CSV)
    client_max_body_size 10M;

    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Logs
    access_log /var/log/nginx/[client]_access.log;
    error_log /var/log/nginx/[client]_error.log;
}
```

**Commandes setup Nginx :**

```bash
# 1. Créer config
sudo nano /etc/nginx/sites-available/[client].conf

# 2. Activer site
sudo ln -s /etc/nginx/sites-available/[client].conf /etc/nginx/sites-enabled/

# 3. Obtenir certificat SSL
sudo certbot --nginx -d app.[client].fr

# 4. Test config
sudo nginx -t

# 5. Reload Nginx
sudo systemctl reload nginx
```

**Checklist Nginx :**
- [ ] Config créée
- [ ] SSL Let's Encrypt obtenu
- [ ] Test nginx OK
- [ ] App accessible via HTTPS
- [ ] Redirection HTTP → HTTPS fonctionne

---

## 🎨 Phase 3 : Configuration White Label (Jour 2 - 2h)

### Étape 3.1 : Créer Compte Administrateur

```bash
# 1. Aller sur l'app : https://app.[client].fr

# 2. S'inscrire avec email client
# Email : admin@[client].fr
# Password : [générer mot de passe fort]

# 3. Vérifier email de confirmation

# 4. Se connecter
```

**Checklist Compte :**
- [ ] Compte admin créé
- [ ] Email vérifié
- [ ] Login réussi
- [ ] Dashboard accessible

---

### Étape 3.2 : Configuration Company Settings

**Navigation :**
```
Dashboard → Paramètres → Configuration entreprise
```

**Formulaire à remplir :**

#### Section 1 : Informations Générales
```
Nom entreprise : [Ex: AQUA SERVICES]
Adresse : [123 Avenue de la Piscine]
Code postal : [31000]
Ville : [Toulouse]
Email : [contact@aqua-services.fr]
Téléphone : [05 61 XX XX XX]
Site web : [https://www.aqua-services.fr]
```

#### Section 2 : Informations Légales
```
SIRET : [123 456 789 00012]
Numéro TVA : [FR12123456789]
Forme juridique : [SAS]
Capital social : [10 000€]
Numéro RCS : [123 456 789]
Ville RCS : [Toulouse]
```

#### Section 3 : Paramètres Facturation
```
Préfixe facture : [FAC]
Délai paiement : [30 jours]
Taux pénalités retard : [12%]
Indemnité recouvrement : [40€]
```

#### Section 4 : Mentions Légales & CGV

**Template Note de Bas de Page :**
```
Conditions de paiement : règlement sous 30 jours à compter de la date d'émission de la facture. Moyens de paiement acceptés : virement bancaire, chèque, espèces (max 1000€).
```

**Template Mentions Légales :**
```
En cas de retard de paiement, seront exigibles conformément à l'article L441-6 du Code de Commerce : une indemnité forfaitaire de 40€ pour frais de recouvrement, ainsi que des pénalités de retard au taux de 12% l'an (soit 3 fois le taux d'intérêt légal), applicables dès le lendemain de la date d'échéance figurant sur la facture. Tout mois commencé est dû en entier.

Escompte pour paiement anticipé : néant.

Clause de réserve de propriété : conformément à la loi n°80-335 du 12 mai 1980, les marchandises vendues restent la propriété du vendeur jusqu'au paiement intégral du prix en principal et accessoires.

[Nom Entreprise] - [Forme juridique] au capital de [XX]€ - SIRET [XXX XXX XXX XXXXX] - RCS [Ville] [XXX XXX XXX] - TVA [FRXX...] - APE [XXXX] - Siège social : [Adresse complète]
```

**Actions :**
- [ ] Tous les champs remplis
- [ ] "Sauvegarder" cliqué
- [ ] Message "✅ Paramètres sauvegardés" affiché

---

### Étape 3.3 : Upload Logo & Branding (Futur)

**Note :** Actuellement non implémenté, à venir en Phase 2.

**Workaround temporaire :**
- Logo peut être ajouté manuellement dans le code
- Modifier `lib/pdf/generate-invoice-html.ts` ligne 96
- Changer couleur primaire dans `company_settings` table

---

### Étape 3.4 : Test Génération Facture

**Créer facture test :**

```
1. Aller dans "Clients" → Créer client test
   - Nom : Client Test SARL
   - Email : test@example.com
   - Adresse complète

2. Créer intervention test
   - Client : Client Test
   - Type : Entretien
   - Date : Aujourd'hui
   - Ajouter produits/main d'œuvre

3. Terminer intervention
   - Cliquer "Client absent" ou "Valider"
   - Facture proforma générée automatiquement

4. Aller sur la facture
   - Dashboard → Interventions → Voir l'intervention → Facture
   - Vérifier :
     ✅ Logo/nom entreprise correct
     ✅ Adresse correcte
     ✅ SIRET/TVA corrects
     ✅ Mentions légales présentes
     ✅ CGV en bas de page

5. Cliquer "Imprimer" pour voir le PDF
   - Vérifier rendu professionnel
   - Vérifier toutes les infos visibles
```

**Checklist Test :**
- [ ] Client test créé
- [ ] Intervention test créée
- [ ] Facture générée automatiquement
- [ ] PDF s'affiche correctement
- [ ] Toutes les infos white label OK
- [ ] Mentions légales présentes

---

## 📥 Phase 4 : Import Données (Jour 2 - 1h)

### Étape 4.1 : Préparer Fichiers CSV

**Template Clients :**

```csv
type;prenom;nom;entreprise;email;telephone;mobile;adresse;code_postal;ville;notes
particulier;Jean;Dupont;;jean.dupont@email.com;0123456789;0612345678;15 rue des Fleurs;31000;Toulouse;Client depuis 2020
professionnel;Marie;Martin;Hôtel Soleil;contact@hotel-soleil.fr;0198765432;0687654321;25 avenue de la Plage;06000;Nice;Piscine 15x7m
```

**Template Produits :**

```csv
nom;reference;category_id;prix;unite;description
Chlore choc 5kg;CHLORE-001;[UUID-CATEGORIE];45.00;kg;Désinfectant rapide action choc
pH minus 1L;PH-002;[UUID-CATEGORIE];12.00;L;Réducteur pH pour eau alcaline
```

**⚠️ IMPORTANT :**
- Pour les produits, il faut d'abord créer les catégories manuellement
- Puis récupérer les UUIDs pour les mettre dans le CSV

---

### Étape 4.2 : Import via Interface

```
1. Aller dans : Paramètres → Import de données

2. Sélectionner type : Clients

3. Télécharger template exemple
   - Cliquer "📥 Télécharger exemple"
   - Remplir avec vraies données

4. Upload fichier CSV
   - Cliquer "2. Fichier CSV"
   - Sélectionner fichier préparé

5. Lancer import
   - Cliquer "🚀 Lancer l'import"
   - Attendre message succès

6. Vérifier import
   - Aller dans "Clients"
   - Vérifier tous les clients importés
```

**Checklist Import :**
- [ ] CSV clients préparé
- [ ] Import clients réussi
- [ ] CSV produits préparé (optionnel)
- [ ] Import produits réussi (optionnel)
- [ ] Tous les enregistrements visibles dans l'app

---

## 🎓 Phase 5 : Formation Utilisateur (Jour 2 - 1h)

### Module 1 : Navigation (10 min)

**Présenter l'interface :**

```
📱 Menu Principal (Bottom Bar Mobile) :
├── Interventions : Gestion des interventions
├── Agenda : Planning visuel
├── Clients : Base de données clients
├── Prospects : Gestion prospects/devis
└── Plus → Factures, Paramètres

🖥️ Desktop :
├── Sidebar gauche avec tous les modules
└── Interface identique mais optimisée grand écran
```

**Exercice pratique :**
- [ ] Naviguer dans chaque section
- [ ] Tester recherche clients
- [ ] Tester filtres interventions

---

### Module 2 : Créer une Intervention (15 min)

**Workflow complet :**

```
1. Créer client (si nouveau)
   Clients → + Nouveau client → Remplir formulaire

2. Créer intervention
   Interventions → + Nouvelle intervention
   - Sélectionner client
   - Choisir type (entretien, réparation, etc.)
   - Date & heure
   - Ajouter description

3. Ajouter produits/services
   - Main d'œuvre : durée × taux horaire
   - Frais déplacement
   - Produits : chercher dans catalogue

4. Planifier
   - Assigner technicien (futur)
   - Sync avec Google Calendar (optionnel)

5. Terminer intervention
   - "Client absent" : génère facture proforma
   - "Valider" : client signe (futur)
   - Facture créée automatiquement
```

**Exercice pratique :**
- [ ] Créer intervention réelle
- [ ] Ajouter produits
- [ ] Terminer et générer facture

---

### Module 3 : Facturation (15 min)

**Processus facturation :**

```
1. Facture Proforma (brouillon)
   - Générée automatiquement fin intervention
   - Modifiable (ajouter/retirer lignes)
   - Recalcule totaux automatiquement

2. Éditer si besoin
   - Modifier quantités
   - Ajouter produits oubliés
   - Ajouter notes/conditions
   - Sauvegarder

3. Valider en Facture Finale
   - Cliquer "Valider"
   - Confirmation
   - Devient lecture seule
   - Numéro définitif assigné

4. Envoyer au client
   - Cliquer "Envoyer au client"
   - Email automatique avec PDF
   - Statut passe à "Envoyée"
```

**Exercice pratique :**
- [ ] Éditer facture proforma
- [ ] Valider en finale
- [ ] Envoyer par email

---

### Module 4 : Gestion Prospects (10 min)

**Pipeline commercial :**

```
1. Créer prospect
   Prospects → + Nouveau prospect
   - Coordonnées
   - Statut : Nouveau

2. Uploader devis
   - Ouvrir fiche prospect
   - Uploader PDF devis

3. Envoyer devis
   - Cliquer "Envoyer devis"
   - Email automatique

4. Suivre statut
   - Nouveau → Contacté → Devis envoyé → Gagné/Perdu

5. Convertir en client
   - Si gagné : bouton "Convertir en client"
   - Crée fiche client automatiquement
```

**Exercice pratique :**
- [ ] Créer prospect test
- [ ] Changer statut
- [ ] Convertir en client

---

### Module 5 : Calendrier & Planning (10 min)

**Utilisation calendrier :**

```
1. Vue Mensuelle
   - Voir toutes interventions du mois
   - Cliquer sur jour pour détails

2. Vue Hebdomadaire (mobile optimisé)
   - Toggle Mois/Semaine
   - Vue verticale sur smartphone
   - Plus lisible en déplacement

3. Synchronisation Google Calendar
   - Configurer dans Paramètres (avancé)
   - Sync bidirectionnelle
   - Voir interventions dans Google
```

---

### Module 6 : Paramètres & Personnalisation (10 min)

**Configuration continue :**

```
1. Configuration Entreprise
   - Modifier infos légales
   - Mettre à jour CGV
   - Changer couleurs (futur)

2. Import Données
   - Import clients en masse
   - Import produits
   - Templates CSV

3. Gestion Utilisateurs (futur)
   - Ajouter techniciens
   - Définir rôles
   - Gérer permissions
```

---

## ✅ Phase 6 : Tests & Go-Live (Jour 3 - 1h)

### Checklist Tests Complets

**Tests Fonctionnels :**

- [ ] **Clients**
  - [ ] Créer client particulier
  - [ ] Créer client professionnel
  - [ ] Rechercher client
  - [ ] Modifier client
  - [ ] Voir historique interventions

- [ ] **Interventions**
  - [ ] Créer intervention
  - [ ] Ajouter produits
  - [ ] Ajouter main d'œuvre
  - [ ] Ajouter frais déplacement
  - [ ] Terminer intervention
  - [ ] Mettre en attente (tester 3 raisons)

- [ ] **Facturation**
  - [ ] Facture proforma générée auto
  - [ ] Éditer facture
  - [ ] Valider en finale
  - [ ] PDF généré correctement
  - [ ] Envoyer email (vérifier réception)
  - [ ] Vérifier mentions légales sur PDF

- [ ] **Prospects**
  - [ ] Créer prospect
  - [ ] Uploader devis
  - [ ] Envoyer devis
  - [ ] Changer statut
  - [ ] Convertir en client

- [ ] **Calendrier**
  - [ ] Vue mois affiche interventions
  - [ ] Vue semaine (mobile)
  - [ ] Sync Google Calendar (si activé)

- [ ] **Import**
  - [ ] Import CSV clients
  - [ ] Import CSV produits

---

### Tests Mobile Responsive

**Tester sur smartphone réel :**

- [ ] Navigation bottom bar fluide
- [ ] Création intervention mobile
- [ ] Calendrier semaine vertical lisible
- [ ] Facture s'affiche correctement
- [ ] Formulaires utilisables au doigt

---

### Tests Performance

```bash
# Test charge page d'accueil
curl -w "@curl-format.txt" -o /dev/null -s https://app.[client].fr

# Test génération PDF
# Créer facture → Envoyer → Vérifier temps < 5sec

# Test import CSV 100 lignes
# Upload CSV → Vérifier temps < 10sec
```

**Critères performance :**
- [ ] Page load < 2sec
- [ ] Génération PDF < 5sec
- [ ] Import 100 lignes < 10sec

---

### Validation Finale Client

**Réunion Go-Live (30 min) :**

```
1. Démo complète du workflow
   - Créer intervention réelle
   - Générer facture
   - Envoyer au client

2. Vérifier satisfaction
   - Tout est compris ?
   - Questions ?
   - Besoins spécifiques ?

3. Remettre accès
   - Email : admin@[client].fr
   - Password : [stocké 1Password]
   - URL app : https://app.[client].fr

4. Planning formation complémentaire
   - Session équipe (si multi-users)
   - Date formation avancée

5. Contacts support
   - Email support
   - Slack/Discord (si dispo)
   - Horaires disponibilité
```

**Checklist Go-Live :**
- [ ] Client valide fonctionnement
- [ ] Toutes questions répondues
- [ ] Accès remis
- [ ] Formation effective
- [ ] Support explicité
- [ ] Go-Live officiel ✅

---

## 🛠️ Phase 7 : Support Post-Déploiement (30 jours)

### Semaine 1 : Suivi Intensif

**Actions quotidiennes :**

- [ ] **Jour 1-3** : Check-in quotidien
  - Email : "Comment ça se passe ?"
  - Résoudre blocages rapides
  - Ajuster config si besoin

- [ ] **Jour 4-7** : Check-in tous les 2 jours
  - Vérifier usage
  - Collecter feedback
  - Logger bugs éventuels

**Métriques à surveiller :**
```sql
-- Connexions utilisateur
SELECT DATE(created_at), COUNT(*)
FROM auth.audit_log_entries
WHERE user_id = '[client-user-id]'
GROUP BY DATE(created_at);

-- Interventions créées
SELECT COUNT(*) FROM piscine_delmas_public.interventions
WHERE created_at > NOW() - INTERVAL '7 days';

-- Factures générées
SELECT COUNT(*) FROM piscine_delmas_compta.invoices
WHERE created_at > NOW() - INTERVAL '7 days';
```

---

### Semaine 2-4 : Suivi Hebdomadaire

**Check-ins hebdomadaires :**

- [ ] **Semaine 2** : Email + Call 15min
  - Usage régulier ?
  - Fonctionnalités utilisées ?
  - Formations additionnelles ?

- [ ] **Semaine 3** : Email check-in
  - Collecter retours
  - Identifier améliorations
  - Proposer modules additionnels

- [ ] **Semaine 4** : Bilan 1 mois
  - Réunion 30min
  - Statistiques usage
  - Satisfaction (NPS)
  - Renouvellement confirmé ?

---

### Ressources Support

**Documentation à fournir :**

- [ ] PDF Guide Utilisateur (à créer)
- [ ] Vidéos tutoriels (Loom)
- [ ] FAQ
- [ ] Troubleshooting guide

**Canaux support :**

| Canal | Délai réponse | Inclus |
|-------|---------------|--------|
| Email | 24-48h | Tous |
| Chat (Slack) | 4h | Pro+ |
| Téléphone | Immédiat | Enterprise |
| Ticket system | 24h | Tous |

---

## 🚨 Troubleshooting Commun

### Problème 1 : App ne charge pas

**Symptômes :** Page blanche ou erreur 500

**Diagnostic :**
```bash
# Vérifier containers
docker-compose ps

# Vérifier logs
docker-compose logs delmas-app | tail -100

# Vérifier connexion Supabase
docker-compose exec delmas-app sh
curl $NEXT_PUBLIC_SUPABASE_URL
```

**Solutions :**
1. Vérifier variables d'environnement `.env`
2. Restart containers : `docker-compose restart`
3. Rebuild si nécessaire : `docker-compose up -d --build`

---

### Problème 2 : Factures pas générées

**Symptômes :** Erreur lors terminaison intervention

**Diagnostic :**
```sql
-- Vérifier migrations
SELECT * FROM piscine_delmas_compta.invoices LIMIT 1;

-- Vérifier invoice_number_sequences
SELECT * FROM piscine_delmas_compta.invoice_number_sequences;
```

**Solutions :**
1. Re-exécuter migrations comptabilité
2. Initialiser sequence : `INSERT INTO invoice_number_sequences (year, last_number) VALUES (2025, 0);`
3. Vérifier RLS policies

---

### Problème 3 : PDF ne se génère pas

**Symptômes :** Email envoyé mais PDF vide ou erreur

**Diagnostic :**
```bash
# Vérifier Gotenberg
curl http://gotenberg:3000/health

# Tester génération PDF manuel
curl -X POST http://gotenberg:3000/forms/chromium/convert/html \
  -F "files=@test.html" \
  -o test.pdf
```

**Solutions :**
1. Vérifier Gotenberg container up
2. Vérifier `GOTENBERG_URL` dans `.env`
3. Restart Gotenberg : `docker-compose restart gotenberg`

---

### Problème 4 : Emails non envoyés

**Symptômes :** Erreur lors envoi facture

**Diagnostic :**
```bash
# Vérifier Resend API key
echo $RESEND_API_KEY

# Tester Resend
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"test@example.com","to":"test@example.com","subject":"Test","html":"Test"}'
```

**Solutions :**
1. Vérifier `RESEND_API_KEY` valide
2. Vérifier domaine vérifié dans Resend
3. Vérifier email "from" configuré dans company_settings

---

## 📋 Checklist Finale Déploiement

### ✅ Infrastructure
- [ ] Supabase provisionné et configuré
- [ ] Database migrations exécutées
- [ ] Docker Compose up et running
- [ ] Nginx reverse proxy configuré
- [ ] SSL Let's Encrypt actif
- [ ] App accessible via HTTPS
- [ ] Backups automatiques configurés

### ✅ Configuration
- [ ] Company settings remplis
- [ ] Logo uploadé (futur)
- [ ] CGV et mentions légales
- [ ] Compte admin créé
- [ ] Données client importées
- [ ] Tests complets réussis

### ✅ Formation
- [ ] Formation initiale effectuée
- [ ] Documentation remise
- [ ] Questions répondues
- [ ] Client autonome

### ✅ Go-Live
- [ ] Validation client obtenue
- [ ] Support activé
- [ ] Monitoring en place
- [ ] Premier workflow réel testé

### ✅ Suivi
- [ ] Calendrier check-ins défini
- [ ] Canaux support communiqués
- [ ] Métriques usage trackées
- [ ] Bilan 1 mois planifié

---

## 📞 Contacts Support

**Email support :** support@delmas-app.fr
**Slack :** #client-[nom]
**Documentation :** https://docs.delmas-app.fr
**Statut services :** https://status.delmas-app.fr

**Urgences (Enterprise) :** +33 X XX XX XX XX

---

## 📈 Métriques de Succès

### KPIs à J+7
- [ ] Au moins 10 interventions créées
- [ ] Au moins 5 factures générées
- [ ] Client connecté quotidiennement
- [ ] Aucun bug bloquant

### KPIs à J+30
- [ ] 50+ interventions créées
- [ ] 30+ factures envoyées
- [ ] NPS ≥ 8/10
- [ ] Renouvellement confirmé

---

**Document créé le 29 octobre 2025 - Version 1.0**
**Temps moyen déploiement : 4-6 heures sur 3 jours**
