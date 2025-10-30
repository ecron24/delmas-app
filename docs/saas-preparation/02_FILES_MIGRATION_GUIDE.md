# 📁 Guide de migration des fichiers : delmas-app → pooltech-saas

**Version** : 1.0
**Date** : 2025-10-30

Ce document liste TOUS les fichiers du projet delmas-app et indique pour chacun :
- ✅ **COPIER** : À copier tel quel (0% de modifications)
- 🔧 **ADAPTER** : À copier puis adapter pour multi-tenant (5-30% de modifications)
- 🆕 **CRÉER** : À créer from scratch (spécifique SaaS)
- ❌ **IGNORER** : Ne pas migrer (spécifique Delmas)

---

## 📊 Résumé statistique

```
Total fichiers delmas-app : ~60 fichiers

✅ COPIER tel quel      : 35 fichiers (58%)  → Gain de temps énorme !
🔧 ADAPTER pour SaaS    : 15 fichiers (25%)  → Modifications mineures
🆕 CRÉER from scratch   : 15 fichiers (25%)  → Nouveautés SaaS
❌ IGNORER              : 0 fichiers         → Tout est réutilisable !
```

---

## 🎨 Composants UI (app/components/)

### app/components/interventions/

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `InterventionForm.tsx` | ✅ COPIER | Aucune - Composant métier pur |
| `InterventionCard.tsx` | ✅ COPIER | Aucune - Affichage simple |
| `InterventionActions.tsx` | 🔧 ADAPTER | Ajouter vérification de rôle (`canEdit`, `canDelete`) |
| `PhotoCapture.tsx` | ✅ COPIER | Aucune - Composant technique pur |
| `ProductSelector.tsx` | 🔧 ADAPTER | Filtrer produits par `tenant_id` (via RLS automatique) |
| `TaskTemplateSelector.tsx` | 🔧 ADAPTER | Filtrer templates par `tenant_id` |
| `InterventionTypeSelector.tsx` | ✅ COPIER | Aucune - Utilise constants.ts |
| `BackButton.tsx` | ✅ COPIER | Aucune - Composant navigation simple |
| `ClientLink.tsx` | ✅ COPIER | Aucune - Lien simple |
| `EditButton.tsx` | 🔧 ADAPTER | Ajouter `hasPermission('edit_intervention')` |

**Estimation effort** : 2-3 heures (ajout des vérifications de permissions)

---

### app/components/clients/

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `ClientSearch.tsx` | ✅ COPIER | Aucune - RLS filtre automatiquement par tenant |
| `ClientSearchAndList.tsx` | ✅ COPIER | Aucune - Composant wrapper |
| `ClientButtons.tsx` | 🔧 ADAPTER | Ajouter vérifications rôles (CEO/Secretary peuvent éditer) |
| `ClientPhotos.tsx` | ✅ COPIER | Aucune - Upload Supabase Storage (déjà isolé par bucket) |
| `InterventionHistory.tsx` | ✅ COPIER | Aucune - Affichage liste simple |

**Estimation effort** : 1 heure

---

### app/components/invoices/

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `InvoiceList.tsx` | ✅ COPIER | Aucune - RLS filtre par tenant automatiquement |
| `InvoiceFilters.tsx` | ✅ COPIER | Aucune - Filtres côté client |

**Estimation effort** : 0 heures

---

### app/components/pools/

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `PoolForm.tsx` | ✅ COPIER | Aucune - Formulaire métier pur |
| `PoolSelector.tsx` | ✅ COPIER | Aucune - RLS filtre automatiquement |

**Estimation effort** : 0 heures

---

### app/components/ui/

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `Skeletons.tsx` | ✅ COPIER | Aucune - Composants UI purs |

**Estimation effort** : 0 heures

---

## 📄 Pages (app/)

### Pages racine

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `app/page.tsx` | 🔧 ADAPTER | Remplacer redirect `/login` par landing page `/` |
| `app/layout.tsx` | 🔧 ADAPTER | Ajouter context `TenantProvider` |
| `app/globals.css` | ✅ COPIER | Aucune - Styles globaux |
| `app/login/page.tsx` | 🔧 ADAPTER | Supprimer whitelist, ajouter redirect post-login par rôle |
| `app/unauthorized/page.tsx` | ✅ COPIER | Aucune - Page d'erreur générique |

**Estimation effort** : 2-3 heures

---

### Dashboard principal (app/dashboard/)

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `app/dashboard/page.tsx` | ✅ COPIER | Aucune - Redirect simple vers interventions |
| `app/dashboard/layout.tsx` | 🔧 ADAPTER | Ajouter navigation conditionnelle par rôle + afficher nom entreprise |
| `app/dashboard/menu/page.tsx` | 🔧 ADAPTER | Filtrer items menu selon rôle utilisateur |

**Estimation effort** : 2 heures

---

### Dashboard clients (app/dashboard/clients/)

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `app/dashboard/clients/page.tsx` | ✅ COPIER | Aucune - RLS filtre automatiquement |
| `app/dashboard/clients/[id]/page.tsx` | ✅ COPIER | Aucune - Affichage détail |
| `app/dashboard/clients/[id]/edit/page.tsx` | 🔧 ADAPTER | Ajouter vérification permission `canEditClient(role)` |

**Estimation effort** : 1 heure

---

### Dashboard interventions (app/dashboard/interventions/)

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `app/dashboard/interventions/page.tsx` | 🔧 ADAPTER | Filtrer par technicien si `role = 'technician'` |
| `app/dashboard/interventions/new/page.tsx` | 🔧 ADAPTER | Vérifier permission `canCreateIntervention(role)` |
| `app/dashboard/interventions/[id]/page.tsx` | 🔧 ADAPTER | Vérifier permission `canViewIntervention(role, intervention)` |
| `app/dashboard/interventions/[id]/edit/page.tsx` | 🔧 ADAPTER | Vérifier permission `canEditIntervention(role, intervention)` |
| `app/dashboard/interventions/[id]/complete/page.tsx` | 🔧 ADAPTER | Restreindre aux techniciens assignés |
| `app/dashboard/interventions/[id]/sign/page.tsx` | ✅ COPIER | Aucune - Capture signature (métier pur) |
| `app/dashboard/interventions/[id]/photos/page.tsx` | ✅ COPIER | Aucune - Upload photos |
| `app/dashboard/interventions/[id]/documents/page.tsx` | ✅ COPIER | Aucune - Liste documents |
| `app/dashboard/interventions/[id]/invoice/page.tsx` | 🔧 ADAPTER | Restreindre aux CEO/Secretary |

**Estimation effort** : 4-5 heures

---

### Dashboard factures (app/dashboard/invoices/)

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `app/dashboard/invoices/page.tsx` | 🔧 ADAPTER | Restreindre affichage selon rôle (techniciens = lecture seule) |

**Estimation effort** : 1 heure

---

### Dashboard prospects (app/dashboard/prospects/)

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `app/dashboard/prospects/page.tsx` | ✅ COPIER | Aucune - RLS filtre automatiquement |
| `app/dashboard/prospects/[id]/page.tsx` | ✅ COPIER | Aucune - Affichage détail |

**Estimation effort** : 0 heures

---

### Dashboard calendrier (app/dashboard/calendar/)

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `app/dashboard/calendar/page.tsx` | 🔧 ADAPTER | Filtrer événements par technicien si `role = 'technician'` |

**Estimation effort** : 1 heure

---

### Dashboard stats (app/dashboard/stats/)

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `app/dashboard/stats/page.tsx` | 🔧 ADAPTER | Restreindre aux CEO/Secretary, filtrer par tenant automatiquement |

**Estimation effort** : 1 heure

---

### Dashboard settings (app/dashboard/settings/)

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `app/dashboard/settings/page.tsx` | 🔧 ADAPTER | Restreindre aux CEO uniquement |
| `app/dashboard/settings/company/page.tsx` | 🔧 ADAPTER | Charger depuis `tenants` au lieu de `company_settings` |

**Estimation effort** : 2 heures

---

### Dashboard admin (app/dashboard/admin/)

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `app/dashboard/admin/import/page.tsx` | ✅ COPIER | Aucune - Fonction métier (import CSV) |
| `app/dashboard/admin/categories/page.tsx` | 🔧 ADAPTER | Filtrer par tenant_id |

**Estimation effort** : 1 heure

---

### Dashboard signature (app/dashboard/signature/)

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `app/dashboard/signature/page.tsx` | ✅ COPIER | Aucune - Page de test signature |

**Estimation effort** : 0 heures

---

## 🆕 Nouvelles pages SaaS (À CRÉER)

### Landing page publique

| Fichier | Action | Description |
|---------|--------|-------------|
| `app/(marketing)/page.tsx` | 🆕 CRÉER | Page d'accueil marketing |
| `app/(marketing)/pricing/page.tsx` | 🆕 CRÉER | Page tarifs (3 plans) |
| `app/(marketing)/features/page.tsx` | 🆕 CRÉER | Page fonctionnalités |
| `app/(marketing)/about/page.tsx` | 🆕 CRÉER | Page à propos |
| `app/(marketing)/contact/page.tsx` | 🆕 CRÉER | Page contact/démo |
| `app/(marketing)/layout.tsx` | 🆕 CRÉER | Layout marketing (header + footer) |

**Estimation effort** : 1-2 semaines (design + développement)

---

### Onboarding entreprise

| Fichier | Action | Description |
|---------|--------|-------------|
| `app/signup/page.tsx` | 🆕 CRÉER | Formulaire inscription entreprise |
| `app/onboarding/company/page.tsx` | 🆕 CRÉER | Configuration entreprise (adresse, SIRET, TVA) |
| `app/onboarding/plan/page.tsx` | 🆕 CRÉER | Choix du plan d'abonnement |
| `app/onboarding/team/page.tsx` | 🆕 CRÉER | Inviter premiers utilisateurs (optionnel) |
| `app/onboarding/complete/page.tsx` | 🆕 CRÉER | Confirmation + redirection dashboard |

**Estimation effort** : 1 semaine

---

### Dashboard admin SaaS

| Fichier | Action | Description |
|---------|--------|-------------|
| `app/admin/page.tsx` | 🆕 CRÉER | Dashboard admin global (métriques SaaS) |
| `app/admin/tenants/page.tsx` | 🆕 CRÉER | Liste de tous les tenants |
| `app/admin/tenants/[id]/page.tsx` | 🆕 CRÉER | Détail d'un tenant (clients, interventions, etc.) |
| `app/admin/analytics/page.tsx` | 🆕 CRÉER | Analytics SaaS (MRR, churn, etc.) |
| `app/admin/layout.tsx` | 🆕 CRÉER | Layout admin (navigation spécifique) |

**Estimation effort** : 1 semaine

---

### Gestion abonnement

| Fichier | Action | Description |
|---------|--------|-------------|
| `app/settings/billing/page.tsx` | 🆕 CRÉER | Gestion abonnement (upgrade, annuler, historique) |
| `app/settings/billing/success/page.tsx` | 🆕 CRÉER | Page succès après paiement Stripe |
| `app/settings/billing/canceled/page.tsx` | 🆕 CRÉER | Page abonnement annulé |
| `app/settings/users/page.tsx` | 🆕 CRÉER | Gestion utilisateurs du tenant (CEO uniquement) |

**Estimation effort** : 1 semaine

---

## 🔧 API Routes (app/api/)

### Routes existantes

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `app/api/health/route.ts` | ✅ COPIER | Aucune - Health check simple |
| `app/api/calendar/import-event/route.ts` | 🔧 ADAPTER | Ajouter `tenant_id` aux interventions créées |
| `app/api/interventions/[id]/send-confirmation/route.ts` | 🔧 ADAPTER | Vérifier permission + tenant isolation |
| `app/api/interventions/[id]/notify-completion/route.ts` | 🔧 ADAPTER | Vérifier permission + tenant isolation |
| `app/api/interventions/[id]/send-to-client/route.ts` | 🔧 ADAPTER | Vérifier permission + tenant isolation |

**Estimation effort** : 3 heures

---

### Nouvelles routes API (À CRÉER)

| Fichier | Action | Description |
|---------|--------|-------------|
| `app/api/webhooks/stripe/route.ts` | 🆕 CRÉER | Webhook Stripe (gestion abonnements) |
| `app/api/onboarding/create-tenant/route.ts` | 🆕 CRÉER | Création tenant + compte CEO |
| `app/api/tenants/[id]/usage/route.ts` | 🆕 CRÉER | Récupérer usage (interventions, stockage) |
| `app/api/admin/tenants/route.ts` | 🆕 CRÉER | Liste tenants (admin SaaS uniquement) |
| `app/api/admin/analytics/route.ts` | 🆕 CRÉER | Analytics SaaS (MRR, churn) |

**Estimation effort** : 1 semaine

---

## 📚 Libraries (lib/)

### lib/actions/

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `lib/actions/clients.ts` | 🔧 ADAPTER | Ajouter `tenant_id` dans toutes les queries (ou laisser RLS gérer) |
| `lib/actions/client-mutations.ts` | 🔧 ADAPTER | Idem + vérifier permissions |
| `lib/actions/interventions.ts` | 🔧 ADAPTER | Filtrer par rôle (technicien = ses interventions) |
| `lib/actions/invoices.ts` | 🔧 ADAPTER | Restreindre selon rôle |
| `lib/actions/stats.ts` | 🔧 ADAPTER | Filtrer stats par tenant (RLS automatique) |
| `lib/actions/company-settings.ts` | 🔧 ADAPTER | Migrer vers `tenants` table |

**Estimation effort** : 1-2 jours

---

### lib/supabase/

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `lib/supabase/client.ts` | ✅ COPIER | Aucune - Client Supabase standard |
| `lib/supabase/server.ts` | 🔧 ADAPTER | Ajouter helper `setCurrentTenant(tenant_id)` |
| `lib/supabase/webhook.ts` | ✅ COPIER | Aucune - Validation webhook |

**Estimation effort** : 1 heure

---

### lib/pdf/

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `lib/pdf/generate-invoice-html.ts` | 🔧 ADAPTER | Utiliser logo du tenant (au lieu de Delmas hardcodé) |
| `lib/pdf/generate-invoice-pdf.ts` | ✅ COPIER | Aucune - Logique PDF générique |

**Estimation effort** : 2 heures

---

### lib/types/

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `lib/types/intervention.ts` | 🔧 ADAPTER | Ajouter `tenant_id` au type Intervention |

**Estimation effort** : 30 minutes

---

### lib/auth-guard.ts

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `lib/auth-guard.ts` | 🔧 REFACTORER | Remplacer whitelist par système de permissions basé sur `role` |

**Estimation effort** : 3-4 heures

---

### lib/constants.ts

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `lib/constants.ts` | ✅ COPIER | Aucune - Constants métier (types interventions, statuts) |

**Estimation effort** : 0 heures

---

## 🆕 Nouvelles bibliothèques (À CRÉER)

| Fichier | Action | Description |
|---------|--------|-------------|
| `lib/permissions.ts` | 🆕 CRÉER | Système de permissions (hasPermission, canAccess) |
| `lib/tenant.ts` | 🆕 CRÉER | Helpers tenant (getCurrentTenant, getTenantSettings) |
| `lib/stripe.ts` | 🆕 CRÉER | Helpers Stripe (createCheckout, cancelSubscription) |
| `lib/quota.ts` | 🆕 CRÉER | Vérification quotas par plan |
| `lib/analytics.ts` | 🆕 CRÉER | Fonctions analytics SaaS |
| `lib/types/tenant.ts` | 🆕 CRÉER | Types TypeScript pour tenants, profiles |
| `lib/types/subscription.ts` | 🆕 CRÉER | Types pour abonnements Stripe |

**Estimation effort** : 1 semaine

---

## 🗄️ Base de données (supabase/migrations/)

### Migrations existantes

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `supabase/migrations/20251027_add_missing_fields.sql` | 🔧 ADAPTER | Ajouter `tenant_id` à toutes les tables |
| `supabase/migrations/20251028_*.sql` | 🔧 ADAPTER | Ajouter `tenant_id` + RLS |

**Estimation effort** : 1 jour (création nouvelles migrations propres)

---

### Nouvelles migrations (À CRÉER)

| Fichier | Action | Description |
|---------|--------|-------------|
| `001_create_tenants.sql` | 🆕 CRÉER | Table tenants |
| `002_create_profiles.sql` | 🆕 CRÉER | Table profiles avec rôles |
| `003_create_subscriptions.sql` | 🆕 CRÉER | Table subscriptions (historique Stripe) |
| `004_add_tenant_id_to_all_tables.sql` | 🆕 CRÉER | Ajouter tenant_id partout |
| `005_enable_rls.sql` | 🆕 CRÉER | Activer RLS sur toutes les tables |
| `006_create_policies.sql` | 🆕 CRÉER | Créer policies d'isolation par tenant |
| `007_create_functions.sql` | 🆕 CRÉER | Fonctions PostgreSQL helpers |

**Estimation effort** : 2-3 jours

---

## ⚙️ Configuration

### Fichiers de config

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| `package.json` | 🔧 ADAPTER | Ajouter `stripe`, `@stripe/stripe-js` |
| `next.config.js` | ✅ COPIER | Aucune |
| `tailwind.config.ts` | ✅ COPIER | Aucune |
| `tsconfig.json` | ✅ COPIER | Aucune |
| `postcss.config.js` | ✅ COPIER | Aucune |
| `.env.example` | 🔧 ADAPTER | Ajouter variables Stripe |
| `.gitignore` | ✅ COPIER | Aucune |
| `Dockerfile` | ✅ COPIER | Aucune |

**Estimation effort** : 1 heure

---

## 📝 Documentation

### Fichiers docs existants

| Fichier | Action | Modifications nécessaires |
|---------|--------|---------------------------|
| Tous les fichiers `docs/*.md` | 🔧 ADAPTER | Mettre à jour pour contexte SaaS |

---

### Nouvelle documentation (À CRÉER)

| Fichier | Action | Description |
|---------|--------|-------------|
| `docs/ONBOARDING_GUIDE.md` | 🆕 CRÉER | Guide d'utilisation pour nouveaux clients |
| `docs/ADMIN_GUIDE.md` | 🆕 CRÉER | Guide admin SaaS |
| `docs/API_DOCUMENTATION.md` | 🆕 CRÉER | Documentation API publique |
| `docs/DEPLOYMENT.md` | 🆕 CRÉER | Guide de déploiement |
| `docs/TROUBLESHOOTING.md` | 🆕 CRÉER | Guide de dépannage |

**Estimation effort** : 3-4 jours

---

## 📊 Récapitulatif effort total

### Par catégorie

```
Composants UI              : 5 heures
Pages existantes           : 15 heures
Nouvelles pages SaaS       : 4 semaines
API Routes                 : 1,5 semaines
Libraries                  : 2 jours
Nouvelles libraries        : 1 semaine
Base de données            : 3 jours
Documentation              : 4 jours
Testing                    : 1 semaine

TOTAL ESTIMÉ : 6-8 semaines (1 dev temps plein)
```

### Par type d'action

```
✅ COPIER tel quel     : 1 jour (copie + vérification)
🔧 ADAPTER             : 1-2 semaines (modifications mineures)
🆕 CRÉER from scratch  : 4-5 semaines (features SaaS)

TOTAL : 6-8 semaines
```

---

## 🚀 Ordre de migration recommandé

### Phase 1 : Infrastructure (Semaine 1)
1. Cloner le repo delmas-app → pooltech-saas
2. Créer nouvelle instance Supabase
3. Créer migrations multi-tenant (tenants, profiles, RLS)
4. Tester RLS avec données de test

### Phase 2 : Adaptation code existant (Semaine 2)
1. Adapter `lib/auth-guard.ts` → `lib/permissions.ts`
2. Adapter `lib/actions/*` (ajouter vérifications permissions)
3. Adapter middleware.ts (multi-tenant)
4. Adapter pages dashboard (filtres par rôle)

### Phase 3 : Fonctionnalités SaaS (Semaines 3-5)
1. Onboarding entreprise
2. Intégration Stripe
3. Dashboard admin SaaS
4. Gestion abonnements
5. Landing page marketing

### Phase 4 : Tests & Polish (Semaines 6-7)
1. Tests end-to-end
2. Tests de sécurité (isolation tenants)
3. Documentation utilisateur
4. Beta testing avec 2-3 entreprises

### Phase 5 : Lancement (Semaine 8)
1. Déploiement production
2. Monitoring et logs
3. Support client

---

## 📋 Checklist de migration

### Avant de commencer
- [ ] Sauvegarder delmas-app (git tag v1.0-delmas-stable)
- [ ] Créer nouveau repo GitHub (pooltech-saas)
- [ ] Créer nouvelle organisation Supabase
- [ ] Créer compte Stripe

### Pendant la migration
- [ ] Tester RLS avec plusieurs tenants de test
- [ ] Vérifier isolation des données (tenant A ne voit pas tenant B)
- [ ] Tester tous les rôles (admin, ceo, technician, secretary)
- [ ] Tester webhooks Stripe (sandbox)

### Après la migration
- [ ] Déployer sur Vercel
- [ ] Configurer DNS
- [ ] Activer monitoring (Sentry)
- [ ] Créer documentation utilisateur
- [ ] Préparer onboarding beta-testeurs

---

**Document préparé pour faciliter la migration delmas-app → pooltech-saas**
**Prochaine étape** : Migrations SQL multi-tenant
