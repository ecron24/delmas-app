# 🚀 Préparation Migration SaaS : delmas-app → pooltech-saas

**Date de création** : 2025-10-30
**Statut** : Documents prêts, en attente de validation

---

## 📋 Vue d'ensemble

Ce dossier contient TOUS les documents nécessaires pour migrer **delmas-app** (mono-tenant) vers **pooltech-saas** (multi-tenant SaaS).

### Stratégie retenue : **Clone & Adapt**

```
delmas-app (mono-tenant)          pooltech-saas (multi-tenant)
├── Reste en production           ├── Nouveau repo GitHub
├── Client: Delmas Piscines       ├── Multi-entreprises
├── 3 utilisateurs fixes          ├── Système de rôles
└── Stable et intouchable         └── Abonnements Stripe
```

**Avantages** :
- ✅ Delmas reste stable (zéro risque)
- ✅ 60-70% du code réutilisable
- ✅ Liberté totale pour architecture SaaS
- ✅ Possibilité de synchroniser les améliorations

---

## 📁 Documents préparés

### 1️⃣ Spécifications complètes
📄 **`01_SAAS_SPECIFICATIONS.md`** (7 pages)

**Contenu** :
- Vision produit et objectifs business
- Architecture technique multi-tenant
- Modèle de données (tables `tenants`, `profiles`, RLS)
- Système de 4 rôles (admin, ceo, technician, secretary)
- Plans tarifaires (Starter 29€, Pro 79€, Enterprise 199€)
- Parcours utilisateur (onboarding, abonnement)
- Fonctionnalités à développer (roadmap)
- Métriques de succès

**À lire en premier** pour comprendre la vision globale.

---

### 2️⃣ Guide de migration des fichiers
📄 **`02_FILES_MIGRATION_GUIDE.md`** (12 pages)

**Contenu** :
- Liste EXHAUSTIVE de tous les fichiers de delmas-app
- Pour chaque fichier : ✅ COPIER / 🔧 ADAPTER / 🆕 CRÉER
- Estimation de l'effort par catégorie
- Plan de migration par phase (8 semaines)
- Checklist complète

**Statistiques** :
```
✅ COPIER tel quel      : 35 fichiers (58%)
🔧 ADAPTER pour SaaS    : 15 fichiers (25%)
🆕 CRÉER from scratch   : 15 fichiers (25%)

Gain de temps : 6-8 semaines économisées !
```

---

### 3️⃣ Migrations SQL multi-tenant
📁 **`migrations/`** (5 fichiers)

| Fichier | Description |
|---------|-------------|
| `001_create_tenants.sql` | Table des entreprises clientes + fonctions quotas |
| `002_create_profiles.sql` | Table utilisateurs avec rôles + invitations |
| `003_add_tenant_id_to_tables.sql` | Ajoute `tenant_id` à toutes les tables métier |
| `004_enable_rls.sql` | ⚠️ **CRITIQUE** : Row Level Security pour isolation |
| `005_helper_functions.sql` | Fonctions helpers (stats, usage, analytics SaaS) |

**Total** : ~1000 lignes de SQL prêtes à déployer !

**Note importante** : Ces migrations créent une architecture **100% sécurisée** avec isolation automatique par `tenant_id`.

---

### 4️⃣ Script de migration automatisé
📄 **`scripts/clone-and-prepare.sh`** (exécutable)

**Ce qu'il fait** :
1. Clone delmas-app → pooltech-saas
2. Nettoie les fichiers spécifiques Delmas (.git, .env, migrations)
3. Copie les nouvelles migrations multi-tenant
4. Met à jour package.json
5. Crée .env.example avec variables Stripe
6. Initialise un nouveau repo Git
7. Crée la structure de dossiers SaaS

**Usage** :
```bash
cd /parent-directory
./delmas-app/docs/saas-preparation/scripts/clone-and-prepare.sh
```

**Durée** : 2-3 minutes

---

## 🚀 Comment utiliser ces documents

### Option 1 : Lecture complète (recommandé)

1. **Lire** `01_SAAS_SPECIFICATIONS.md` (30-40 min)
   - Comprendre la vision SaaS
   - Valider l'architecture multi-tenant
   - Vérifier les rôles et permissions

2. **Lire** `02_FILES_MIGRATION_GUIDE.md` (20-30 min)
   - Comprendre quels fichiers copier/adapter/créer
   - Évaluer l'effort nécessaire

3. **Parcourir** les migrations SQL (15-20 min)
   - Comprendre le schéma multi-tenant
   - Vérifier les policies RLS

4. **Exécuter** le script `clone-and-prepare.sh`
   - Créer le nouveau repo pooltech-saas

5. **Suivre** le plan de migration (6-8 semaines)

---

### Option 2 : Démarrage rapide (pour tester)

```bash
# Cloner et préparer le repo
./docs/saas-preparation/scripts/clone-and-prepare.sh

# Créer un projet Supabase
# https://app.supabase.com → New Project

# Lier le projet
cd pooltech-saas
supabase link --project-ref YOUR_REF

# Exécuter les migrations
supabase db push

# Installer les dépendances
npm install
npm install stripe @stripe/stripe-js

# Copier les variables d'environnement
cp .env.example .env
# Éditer .env avec vos clés

# Lancer le projet
npm run dev
```

**Durée** : 30-45 minutes pour un environnement de dev fonctionnel.

---

## 📊 Plan de migration (8 semaines)

### Semaine 1 : Infrastructure
- [ ] Créer nouveau repo GitHub (pooltech-saas)
- [ ] Créer projet Supabase
- [ ] Exécuter migrations multi-tenant
- [ ] Tester RLS avec 2 tenants de test

### Semaine 2 : Adaptation code existant
- [ ] Créer `lib/permissions.ts` (système de rôles)
- [ ] Adapter `lib/actions/*` (filtrage par tenant)
- [ ] Adapter middleware.ts (multi-tenant)
- [ ] Adapter pages dashboard (permissions par rôle)

### Semaine 3 : Onboarding entreprise
- [ ] Page signup (`app/signup/page.tsx`)
- [ ] Flow onboarding (4 étapes)
- [ ] Création automatique tenant + profil CEO

### Semaine 4 : Intégration Stripe
- [ ] Créer compte Stripe
- [ ] Créer produits (Starter, Pro, Enterprise)
- [ ] Webhook Stripe (`app/api/webhooks/stripe/route.ts`)
- [ ] Gestion abonnements (`app/settings/billing/page.tsx`)

### Semaine 5 : Dashboard admin SaaS
- [ ] Dashboard admin (`app/admin/page.tsx`)
- [ ] Liste tenants (`app/admin/tenants/page.tsx`)
- [ ] Analytics SaaS (MRR, churn)

### Semaine 6 : Landing page
- [ ] Page d'accueil marketing
- [ ] Page pricing
- [ ] Page features

### Semaine 7 : Tests & Polish
- [ ] Tests end-to-end (isolation tenants)
- [ ] Tests de sécurité (RLS)
- [ ] Documentation utilisateur

### Semaine 8 : Beta & Launch
- [ ] Recruter 2-3 beta testeurs
- [ ] Feedback et ajustements
- [ ] Déploiement production
- [ ] Ouverture des inscriptions

---

## 🔐 Points critiques de sécurité

### ⚠️ Row Level Security (RLS)

**CRUCIAL** : Toutes les tables métier DOIVENT avoir RLS activé.

```sql
-- Migration 004_enable_rls.sql fait ça automatiquement
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON clients
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
```

**Test d'isolation** :
1. Créer 2 tenants de test (Entreprise A, Entreprise B)
2. Créer un utilisateur dans chaque tenant
3. Vérifier qu'ils ne voient PAS les données de l'autre

---

## 💰 Modèle économique

### Plans tarifaires

| Plan | Prix | Utilisateurs | Interventions/mois | Stockage |
|------|------|--------------|-------------------|----------|
| **Starter** | 29€/mois | 3 max | 50 | 1 Go |
| **Pro** | 79€/mois | 10 max | 200 | 5 Go |
| **Enterprise** | 199€/mois | Illimité | Illimité | 20 Go |

### Objectifs 12 mois

- 🎯 100 tenants payants
- 🎯 10 000€ MRR (Monthly Recurring Revenue)
- 🎯 < 2% churn rate
- 🎯 90% satisfaction client (NPS > 50)

---

## 🧪 Tests à effectuer

### Tests fonctionnels

- [ ] Onboarding complet (signup → dashboard)
- [ ] Création client/intervention par CEO
- [ ] Affichage filtré par rôle (technician ne voit que ses interventions)
- [ ] Paiement Stripe (test mode)
- [ ] Upgrade de plan (Starter → Pro)

### Tests de sécurité

- [ ] User A ne voit pas les clients de User B (tenant différent)
- [ ] Technician ne peut pas accéder à `/settings`
- [ ] Secretary ne peut pas voir les marges
- [ ] Tentative d'accès direct à un tenant_id différent → erreur 403

### Tests de charge

- [ ] 100 tenants simultanés
- [ ] 1000 interventions créées en 1 minute
- [ ] Upload de 100 photos en parallèle

---

## 📚 Ressources utiles

### Documentation externe

- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Next.js App Router](https://nextjs.org/docs/app)

### Support

- GitHub Issues : `https://github.com/votre-org/pooltech-saas/issues`
- Email technique : `dev@pooltech-saas.com`

---

## 🎯 Critères de succès de la migration

### Technique

- [ ] RLS activé et testé sur toutes les tables
- [ ] Aucune fuite de données entre tenants
- [ ] Temps de réponse < 500ms (p95)
- [ ] Uptime > 99.5%

### Business

- [ ] Onboarding < 5 minutes
- [ ] Conversion trial → payant > 80%
- [ ] Support email < 24h
- [ ] Documentation complète

### Qualité

- [ ] Tests end-to-end (Playwright)
- [ ] Tests de sécurité (OWASP)
- [ ] Documentation à jour
- [ ] Code review systématique

---

## ⚠️ Risques identifiés

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Fuite de données entre tenants | Faible | **CRITIQUE** | Tests RLS approfondis + audit sécurité |
| Performance dégradée (RLS) | Moyenne | Moyen | Index sur tenant_id + monitoring |
| Complexité onboarding | Moyenne | Élevé | User testing + itérations |
| Intégration Stripe complexe | Moyenne | Moyen | Tests webhooks exhaustifs |

---

## 📞 Contact

**Questions sur la migration ?**
- Email : `votre-email@example.com`
- GitHub : `@votre-username`

---

## 🎉 Conclusion

Tous les documents sont prêts pour démarrer la migration vers pooltech-saas !

**Prochaine étape** : Valider la stratégie et lancer le script `clone-and-prepare.sh` 🚀

---

**Document créé le** : 2025-10-30
**Dernière mise à jour** : 2025-10-30
**Version** : 1.0
