# 📊 Analyse des Dépendances Delmas
## Fichiers à Modifier pour le Multi-Tenancy

**Version:** 1.0
**Date:** 2025-11-10
**Objectif:** Identifier tous les fichiers contenant des références spécifiques à Delmas qui nécessitent une refactorisation pour le SaaS multi-tenant.

---

## 📋 Table des Matières

1. [Résumé Exécutif](#résumé-exécutif)
2. [Catégories de Dépendances](#catégories-de-dépendances)
3. [Fichiers par Catégorie](#fichiers-par-catégorie)
4. [Scripts de Migration](#scripts-de-migration)
5. [Checklist de Refactoring](#checklist-de-refactoring)

---

## 🎯 Résumé Exécutif

### Statistiques Globales

| Métrique | Valeur |
|----------|--------|
| **Fichiers à modifier** | ~123 fichiers |
| **Schémas hardcodés** | 2 (`piscine_delmas_public`, `piscine_delmas_compta`) |
| **Références "delmas"** | ~83 occurrences |
| **Emails hardcodés** | 3 (dans middleware) |
| **Migrations SQL à créer** | 6 nouvelles migrations |
| **Effort estimé** | 3-4 semaines de développement |

### Types de Modifications

| Type | Fichiers | Priorité | Complexité |
|------|----------|----------|------------|
| **Schémas PostgreSQL** | 83 | 🔴 Critique | 🟡 Moyenne |
| **Middleware auth** | 1 | 🔴 Critique | 🟡 Moyenne |
| **Branding UI** | ~40 | 🟡 Moyenne | 🟢 Faible |
| **Migrations SQL** | 27 existantes | 🟡 Moyenne | 🟡 Moyenne |
| **Configuration** | ~5 | 🟢 Faible | 🟢 Faible |

---

## 🏗️ Catégories de Dépendances

### Catégorie 1: Schémas PostgreSQL Hardcodés 🔴

**Impact:** BLOQUANT pour multi-tenancy

**Pattern à rechercher:**
```typescript
.schema('piscine_delmas_public')
.schema('piscine_delmas_compta')
```

**Nombre de fichiers:** ~83

**Solution:**
```typescript
// AVANT
const { data } = await supabase
  .schema('piscine_delmas_public')
  .from('clients')
  .select('*')

// APRÈS
const { data } = await supabase
  .schema('saas_public') // Renommer ou garder et ajouter tenant_id
  .from('clients')
  .select('*')
  .eq('tenant_id', tenantId)
```

---

### Catégorie 2: Authentification Hardcodée 🔴

**Impact:** BLOQUANT pour multi-tenancy

**Fichier:** `/middleware.ts`

**Pattern à rechercher:**
```typescript
const ALLOWED_EMAILS = [
  'oppsyste@gmail.com',
  'stephanedelmas69@gmail.com',
  'christophemenoire@gmail.com'
];
```

**Solution:** Remplacer par système d'authentification par tenant via `tenant_users`.

---

### Catégorie 3: Branding "Delmas" dans UI 🟡

**Impact:** MOYEN (cosmétique mais important)

**Pattern à rechercher:**
- Texte "Delmas Piscine"
- Texte "PISCINE DELMAS"
- Couleurs hardcodées (#0E2C54, #2599FB)

**Nombre de fichiers:** ~40 composants

**Solution:** Utiliser `useTenant()` et `companySettings` pour affichage dynamique.

---

### Catégorie 4: Company Settings Par Défaut 🟡

**Impact:** MOYEN

**Fichiers:** Migrations SQL créant `company_settings`

**Pattern à rechercher:**
- DEFAULT 'PISCINE DELMAS'
- DEFAULT 'contact@piscine-delmas.fr'
- DEFAULT '483 093 118' (SIRET)

**Solution:** Supprimer les defaults ou les rendre génériques.

---

### Catégorie 5: Fonction Helper "fromDelmas" 🟢

**Impact:** FAIBLE

**Fichiers:**
- `/lib/supabase/server.ts`
- `/lib/supabase/client.ts`

**Pattern à rechercher:**
```typescript
export function fromDelmas(table: string) {
  return client.schema('piscine_delmas_public').from(table);
}
```

**Solution:** Renommer en `fromPublic` ou supprimer et utiliser directement `.schema()`.

---

## 📁 Fichiers par Catégorie

## 1️⃣ PRIORITÉ CRITIQUE 🔴

### 1.1 Middleware et Authentification

| Fichier | Ligne(s) | Modification Requise | Effort |
|---------|---------|---------------------|--------|
| `/middleware.ts` | 10-14 | Supprimer ALLOWED_EMAILS, implémenter détection tenant et vérification accès | 🟡 Moyen |

**Détails:**
```typescript
// AVANT (ligne 10-14)
const ALLOWED_EMAILS = [
  'oppsyste@gmail.com',
  'stephanedelmas69@gmail.com',
  'christophemenoire@gmail.com'
];

// APRÈS
// Supprimer complètement
// Vérifier accès via tenant_users table
const tenantUser = await checkTenantAccess(tenant.id, user.id)
```

---

### 1.2 Clients Supabase - Helpers

| Fichier | Fonction | Modification Requise | Effort |
|---------|---------|---------------------|--------|
| `/lib/supabase/server.ts` | `fromDelmas()` | Renommer ou supprimer | 🟢 Faible |
| `/lib/supabase/client.ts` | `fromDelmas()` | Renommer ou supprimer | 🟢 Faible |

**Détails:**
```typescript
// /lib/supabase/server.ts (ligne ~30)
// AVANT
export function fromDelmas(table: string) {
  const client = createServerClient();
  return client.schema('piscine_delmas_public').from(table);
}

// APRÈS (Option 1: Renommer)
export function fromPublic(table: string) {
  const client = createServerClient();
  return client.schema('saas_public').from(table);
}

// APRÈS (Option 2: Supprimer et utiliser directement)
// supabase.schema('saas_public').from('clients')
```

---

### 1.3 Server Actions (TOUS doivent ajouter tenant_id)

| Fichier | Fonctions | Modifications | Effort |
|---------|-----------|--------------|--------|
| `/lib/actions/clients.ts` | `getClients()`, `getClient()`, `createClient()`, `updateClient()`, `deleteClient()` | Ajouter `.eq('tenant_id', tenantId)` à toutes les queries | 🟡 Moyen |
| `/lib/actions/interventions.ts` | `getInterventions()`, `getIntervention()`, `createIntervention()`, `updateIntervention()` | Ajouter `.eq('tenant_id', tenantId)` + vérifier relations | 🟡 Moyen |
| `/lib/actions/invoices.ts` | `getInvoices()`, `getInvoice()`, `createInvoice()` | Ajouter `.eq('tenant_id', tenantId)` | 🟡 Moyen |
| `/lib/actions/company-settings.ts` | `getCompanySettings()`, `updateCompanySettings()` | Ajouter `.eq('tenant_id', tenantId)` | 🟡 Moyen |
| `/lib/actions/stats.ts` | `getStats()`, `getDashboardStats()` | Ajouter `.eq('tenant_id', tenantId)` à toutes les queries | 🟡 Moyen |
| `/lib/actions/products.ts` | Toutes les fonctions | Ajouter `.eq('tenant_id', tenantId)` | 🟡 Moyen |

**Exemple de modification:**

```typescript
// /lib/actions/clients.ts

// AVANT
export async function getClients() {
  'use server'

  const supabase = createServerClient()

  const { data, error } = await supabase
    .schema('piscine_delmas_public')
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// APRÈS
import { getCurrentTenantId } from '@/lib/helpers/tenant'

export async function getClients() {
  'use server'

  const supabase = createServerClient()
  const tenantId = await getCurrentTenantId() // ✅ Ajout

  const { data, error } = await supabase
    .schema('saas_public') // ✅ Renommé
    .from('clients')
    .select('*')
    .eq('tenant_id', tenantId) // ✅ Ajout
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// AVANT
export async function createClient(clientData: any) {
  'use server'

  const supabase = createServerClient()

  const { data, error } = await supabase
    .schema('piscine_delmas_public')
    .from('clients')
    .insert(clientData)
    .select()
    .single()

  if (error) throw error
  return data
}

// APRÈS
export async function createClient(clientData: any) {
  'use server'

  const supabase = createServerClient()
  const tenantId = await getCurrentTenantId() // ✅ Ajout

  const { data, error } = await supabase
    .schema('saas_public') // ✅ Renommé
    .from('clients')
    .insert({
      ...clientData,
      tenant_id: tenantId, // ✅ Ajout
    })
    .select()
    .single()

  if (error) throw error
  return data
}
```

---

### 1.4 API Routes (TOUTES doivent ajouter tenant_id)

| Fichier | Endpoint | Modifications | Effort |
|---------|----------|--------------|--------|
| `/app/api/interventions/[id]/send-to-client/route.ts` | POST | Ajouter vérification tenant_id, filtrer par tenant | 🟡 Moyen |
| `/app/api/interventions/[id]/send-confirmation/route.ts` | POST | Ajouter vérification tenant_id | 🟡 Moyen |
| `/app/api/interventions/[id]/create-invoice/route.ts` | POST | Ajouter vérification tenant_id, propager tenant_id à invoice | 🟡 Moyen |
| `/app/api/interventions/[id]/notify-completion/route.ts` | POST | Ajouter vérification tenant_id | 🟡 Moyen |
| `/app/api/invoices/[id]/send/route.ts` | POST | Ajouter vérification tenant_id | 🟡 Moyen |
| `/app/api/invoices/[id]/route.ts` | GET/PATCH | Ajouter vérification tenant_id | 🟡 Moyen |
| `/app/api/calendar/import-event/route.ts` | POST | Ajouter tenant_id lors de la création intervention | 🟡 Moyen |
| `/app/api/health/route.ts` | GET | Pas de modification nécessaire | 🟢 Aucun |

**Exemple de modification:**

```typescript
// /app/api/interventions/[id]/send-to-client/route.ts

// AVANT
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()

  const { data: intervention } = await supabase
    .schema('piscine_delmas_public')
    .from('interventions')
    .select('*, clients(*)')
    .eq('id', params.id)
    .single()

  // ... reste du code
}

// APRÈS
import { getCurrentTenantId } from '@/lib/helpers/tenant'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  const tenantId = await getCurrentTenantId() // ✅ Ajout

  const { data: intervention } = await supabase
    .schema('saas_public') // ✅ Renommé
    .from('interventions')
    .select('*, clients(*)')
    .eq('id', params.id)
    .eq('tenant_id', tenantId) // ✅ Ajout
    .single()

  // Vérifier que le client appartient aussi au tenant
  if (intervention?.clients?.tenant_id !== tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // ... reste du code
}
```

---

### 1.5 Migrations SQL Existantes

**Action:** Créer une nouvelle série de migrations pour ajouter `tenant_id` et RLS policies.

| Migration Originale | Action Requise | Nouvelle Migration |
|-------------------|---------------|-------------------|
| Toutes les migrations créant des tables | Ajouter colonne `tenant_id` | `001_add_tenant_id_to_all_tables.sql` |
| Migrations avec defaults "Delmas" | Supprimer defaults Delmas | `002_remove_delmas_defaults.sql` |
| Migrations RLS policies | Modifier pour isolation tenant | `003_update_rls_policies_tenant.sql` |

**Fichiers concernés (dans `/supabase/migrations/`):**
- Tous les fichiers SQL créant des tables (27 migrations)

---

## 2️⃣ PRIORITÉ MOYENNE 🟡

### 2.1 Composants UI avec Branding Delmas

| Fichier | Élément | Modification | Effort |
|---------|---------|--------------|--------|
| `/app/dashboard/layout.tsx` | Header "Delmas Piscine" | Utiliser `companySettings.company_name` | 🟢 Faible |
| `/app/login/page.tsx` | Titre "Delmas Piscine" | Utiliser `companySettings.company_name` | 🟢 Faible |
| `/app/components/interventions/InterventionForm.tsx` | Aucun branding spécifique détecté | Vérifier mentions Delmas | 🟢 Faible |
| `/app/components/clients/ClientSearch.tsx` | Aucun branding spécifique | Pas de modification | 🟢 Aucun |
| `/app/components/invoices/InvoiceList.tsx` | Aucun branding spécifique | Pas de modification | 🟢 Aucun |

**Exemple de modification:**

```typescript
// /app/dashboard/layout.tsx

// AVANT
<header className="bg-primary">
  <h1 className="text-lg font-bold text-white">Delmas Piscine</h1>
  <p className="text-xs text-blue-200">Gestion d'interventions</p>
</header>

// APRÈS
'use client'

import { useTenant } from '@/lib/contexts/TenantContext'

export default function DashboardLayout({ children }) {
  const { companySettings, isLoading } = useTenant()

  if (isLoading) return <LoadingSpinner />

  const primaryColor = companySettings?.primary_color || '#3b82f6'

  return (
    <>
      <header style={{ backgroundColor: primaryColor }}>
        {companySettings?.logo_url && (
          <img src={companySettings.logo_url} alt="Logo" className="h-8" />
        )}
        <h1 className="text-lg font-bold text-white">
          {companySettings?.company_name || 'Inter-App'}
        </h1>
        <p className="text-xs text-blue-200">Gestion d'interventions</p>
      </header>
      {children}
    </>
  )
}
```

---

### 2.2 Génération PDF Factures

| Fichier | Modification | Effort |
|---------|--------------|--------|
| `/lib/pdf/generate-invoice-html.ts` | Utiliser `company_settings` du tenant pour toutes les infos | 🟡 Moyen |
| `/lib/pdf/generate-invoice-pdf.ts` | Pas de modification si HTML est mis à jour | 🟢 Faible |

**Détails:**

```typescript
// /lib/pdf/generate-invoice-html.ts

// AVANT
const html = `
  <div class="header">
    <h1>PISCINE DELMAS</h1>
    <p>Le bois Simon (les linguettes)</p>
    <p>24370 Pechs de l'Espérance</p>
    <p>SIRET: 483 093 118</p>
  </div>
`

// APRÈS
export async function generateInvoiceHTML(
  invoiceId: string,
  tenantId: string // ✅ Ajout
) {
  const supabase = createServerClient()

  // Récupérer les company_settings du tenant
  const { data: companySettings } = await supabase
    .schema('saas_public')
    .from('company_settings')
    .select('*')
    .eq('tenant_id', tenantId) // ✅ Ajout
    .single()

  const html = `
    <div class="header" style="color: ${companySettings.primary_color}">
      ${companySettings.logo_url ? `<img src="${companySettings.logo_url}" />` : ''}
      <h1>${companySettings.company_name}</h1>
      <p>${companySettings.company_address}</p>
      <p>${companySettings.company_postal_code} ${companySettings.company_city}</p>
      <p>SIRET: ${companySettings.siret}</p>
      <p>TVA: ${companySettings.tva_number}</p>
    </div>
  `

  return html
}
```

---

### 2.3 Configuration et Paramètres

| Fichier | Modification | Effort |
|---------|--------------|--------|
| `/tailwind.config.ts` | Supprimer couleurs Delmas hardcodées, générer dynamiquement via CSS variables | 🟡 Moyen |
| `/next.config.js` | Vérifier mentions Delmas (aucune normalement) | 🟢 Aucun |
| `/package.json` | Vérifier mentions Delmas (aucune normalement) | 🟢 Aucun |

**Détails Tailwind:**

```typescript
// /tailwind.config.ts

// AVANT
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0E2C54', // Bleu foncé Delmas
        },
        secondary: {
          DEFAULT: '#2599FB', // Bleu clair Delmas
        },
      },
    },
  },
}

// APRÈS (Option 1: Couleurs génériques)
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)', // CSS variable dynamique
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
        },
      },
    },
  },
}

// Puis dans le layout, injecter les CSS variables par tenant:
<style>{`
  :root {
    --color-primary: ${companySettings.primary_color};
    --color-secondary: ${companySettings.secondary_color};
  }
`}</style>

// APRÈS (Option 2: Supprimer et utiliser inline styles)
// Pas de couleurs Delmas dans Tailwind config
// Utiliser style={{ backgroundColor: companySettings.primary_color }}
```

---

## 3️⃣ PRIORITÉ FAIBLE 🟢

### 3.1 Documentation

| Fichier | Modification | Effort |
|---------|--------------|--------|
| `/docs/DOCUMENTATION_TECHNIQUE.md` | Mettre à jour avec architecture multi-tenant | 🟡 Moyen |
| `/docs/GUIDE_DEPLOIEMENT_CLIENT.md` | Adapter pour multi-tenant | 🟡 Moyen |
| `/docs/CATALOGUE_MODULES.md` | Vérifier mentions Delmas | 🟢 Faible |
| `/docs/PRESENTATION_COMMERCIALE.md` | Réécrire pour SaaS | 🟡 Moyen |

---

### 3.2 Templates d'Import CSV

| Fichier | Modification | Effort |
|---------|--------------|--------|
| `/templates_import_csv/clients_template.csv` | Pas de modification nécessaire | 🟢 Aucun |
| `/templates_import_csv/products_template.csv` | Pas de modification nécessaire | 🟢 Aucun |

*Note:* Les imports CSV ajouteront automatiquement le `tenant_id` via les server actions.

---

### 3.3 Scripts de Déploiement

| Fichier | Modification | Effort |
|---------|--------------|--------|
| `/scripts/deploy.sh` | Vérifier mentions Delmas | 🟢 Faible |
| Autres scripts | Vérifier et adapter si nécessaire | 🟢 Faible |

---

## 🔧 Scripts de Migration Automatisés

### Script 1: Find & Replace Schémas

**Fichier:** `/scripts/migrate-schemas.sh`

```bash
#!/bin/bash

# Remplacer piscine_delmas_public par saas_public
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) \
  -not -path "./node_modules/*" \
  -not -path "./.next/*" \
  -exec sed -i "s/piscine_delmas_public/saas_public/g" {} +

# Remplacer piscine_delmas_compta par saas_compta
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) \
  -not -path "./node_modules/*" \
  -not -path "./.next/*" \
  -exec sed -i "s/piscine_delmas_compta/saas_compta/g" {} +

echo "✅ Schémas renommés dans tous les fichiers TypeScript/JavaScript"
```

**Usage:**
```bash
cd /home/user/delmas-app
chmod +x scripts/migrate-schemas.sh
./scripts/migrate-schemas.sh
```

---

### Script 2: Vérifier Tenant ID Manquants

**Fichier:** `/scripts/check-missing-tenant-id.sh`

```bash
#!/bin/bash

echo "🔍 Recherche des requêtes sans .eq('tenant_id', ...)"
echo ""

# Chercher les .select() sans .eq('tenant_id')
grep -rn "\.select(" --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  . | while read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    line_num=$(echo "$line" | cut -d: -f2)

    # Vérifier si le fichier contient tenant_id dans les 5 lignes suivantes
    context=$(sed -n "${line_num},$((line_num+5))p" "$file")

    if ! echo "$context" | grep -q "tenant_id"; then
      echo "⚠️  $file:$line_num - Potentiellement manquant tenant_id"
    fi
  done

echo ""
echo "✅ Vérification terminée"
```

**Usage:**
```bash
chmod +x scripts/check-missing-tenant-id.sh
./scripts/check-missing-tenant-id.sh
```

---

### Script 3: Compter Modifications Restantes

**Fichier:** `/scripts/count-remaining-delmas.sh`

```bash
#!/bin/bash

echo "📊 Comptage des références Delmas restantes"
echo ""

# Chercher "delmas" (case insensitive)
delmas_count=$(grep -ri "delmas" --include="*.ts" --include="*.tsx" --include="*.sql" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=docs . | wc -l)

# Chercher schémas Delmas
schemas_count=$(grep -r "piscine_delmas" --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=.next . | wc -l)

# Chercher emails hardcodés
emails_count=$(grep -r "oppsyste@gmail\|stephanedelmas69@gmail\|christophemenoire@gmail" \
  --include="*.ts" --include="*.tsx" . | wc -l)

echo "🔍 Références 'delmas': $delmas_count"
echo "🔍 Schémas 'piscine_delmas_*': $schemas_count"
echo "🔍 Emails hardcodés: $emails_count"
echo ""

if [ $schemas_count -eq 0 ] && [ $emails_count -eq 0 ]; then
  echo "✅ Migration terminée! Aucune référence critique restante."
else
  echo "⚠️  Migration incomplète. Fichiers à vérifier:"

  if [ $schemas_count -gt 0 ]; then
    echo ""
    echo "Schémas hardcodés:"
    grep -r "piscine_delmas" --include="*.ts" --include="*.tsx" \
      --exclude-dir=node_modules --exclude-dir=.next . | head -10
  fi

  if [ $emails_count -gt 0 ]; then
    echo ""
    echo "Emails hardcodés:"
    grep -r "oppsyste@gmail\|stephanedelmas69@gmail" --include="*.ts" . | head -5
  fi
fi
```

**Usage:**
```bash
chmod +x scripts/count-remaining-delmas.sh
./scripts/count-remaining-delmas.sh
```

---

## ✅ Checklist de Refactoring

### Phase 1: Préparation

- [ ] Créer une branche `feature/multi-tenant-migration`
- [ ] Backup complet de la base de données
- [ ] Documenter l'état actuel
- [ ] Créer les scripts de migration ci-dessus

### Phase 2: Base de Données

- [ ] Créer migration `001_create_tenants_infrastructure.sql`
- [ ] Créer migration `002_add_tenant_id_to_tables.sql`
- [ ] Créer migration `003_migrate_delmas_tenant.sql`
- [ ] Créer migration `004_create_tenant_rls_policies.sql`
- [ ] Appliquer migrations sur DB de dev
- [ ] Tester création tenant + assignation user
- [ ] Tester queries avec tenant_id
- [ ] Tester RLS policies

### Phase 3: Middleware et Contexte

- [ ] Créer `/lib/helpers/tenant.ts` avec `getCurrentTenantId()`
- [ ] Refactorer `/middleware.ts` pour détection tenant
- [ ] Créer `/lib/contexts/TenantContext.tsx`
- [ ] Créer `/app/api/tenant/current/route.ts`
- [ ] Wrapper app avec `TenantProvider` dans layout
- [ ] Tester `useTenant()` dans composants

### Phase 4: Server Actions (6 fichiers)

- [ ] Refactorer `/lib/actions/clients.ts`
  - [ ] `getClients()` - Ajouter `.eq('tenant_id')`
  - [ ] `getClient()` - Ajouter `.eq('tenant_id')`
  - [ ] `createClient()` - Ajouter `tenant_id` à insert
  - [ ] `updateClient()` - Vérifier tenant_id
  - [ ] `deleteClient()` - Vérifier tenant_id
- [ ] Refactorer `/lib/actions/interventions.ts`
  - [ ] Toutes les fonctions GET - Ajouter `.eq('tenant_id')`
  - [ ] Toutes les fonctions CREATE - Ajouter `tenant_id`
  - [ ] Vérifier relations (clients, products)
- [ ] Refactorer `/lib/actions/invoices.ts`
  - [ ] Toutes les fonctions - Ajouter `.eq('tenant_id')`
- [ ] Refactorer `/lib/actions/company-settings.ts`
  - [ ] `getCompanySettings()` - Ajouter `.eq('tenant_id')`
  - [ ] `updateCompanySettings()` - Vérifier tenant_id
- [ ] Refactorer `/lib/actions/stats.ts`
  - [ ] Toutes les aggregations - Filtrer par tenant_id
- [ ] Refactorer `/lib/actions/products.ts`
  - [ ] Toutes les fonctions - Ajouter `.eq('tenant_id')`

### Phase 5: API Routes (~10 routes)

- [ ] Refactorer `/app/api/interventions/[id]/send-to-client/route.ts`
- [ ] Refactorer `/app/api/interventions/[id]/send-confirmation/route.ts`
- [ ] Refactorer `/app/api/interventions/[id]/create-invoice/route.ts`
- [ ] Refactorer `/app/api/interventions/[id]/notify-completion/route.ts`
- [ ] Refactorer `/app/api/invoices/[id]/send/route.ts`
- [ ] Refactorer `/app/api/invoices/[id]/route.ts`
- [ ] Refactorer `/app/api/calendar/import-event/route.ts`
- [ ] Vérifier toutes les autres API routes

### Phase 6: Composants UI (~40 composants)

- [ ] Refactorer `/app/dashboard/layout.tsx` - Branding dynamique
- [ ] Refactorer `/app/login/page.tsx` - Logo dynamique
- [ ] Parcourir tous les composants dans `/app/components/`
- [ ] Remplacer tous les textes "Delmas" par données dynamiques
- [ ] Tester rendu avec différents tenants

### Phase 7: Génération PDF

- [ ] Refactorer `/lib/pdf/generate-invoice-html.ts`
- [ ] Utiliser `company_settings` du tenant
- [ ] Tester génération PDF avec 2 tenants différents

### Phase 8: Configuration

- [ ] Refactorer `/tailwind.config.ts` - CSS variables
- [ ] Mettre à jour `/docs/DOCUMENTATION_TECHNIQUE.md`
- [ ] Mettre à jour `/docs/GUIDE_DEPLOIEMENT_CLIENT.md`

### Phase 9: Tests

- [ ] Créer tests d'isolation entre tenants
- [ ] Tester toutes les server actions avec tenant_id
- [ ] Tester toutes les API routes avec tenant_id
- [ ] Tester UI avec 3 tenants différents
- [ ] Tester génération PDF pour chaque tenant
- [ ] Tester numérotation factures par tenant

### Phase 10: Scripts Utilitaires

- [ ] Exécuter `./scripts/migrate-schemas.sh`
- [ ] Exécuter `./scripts/check-missing-tenant-id.sh`
- [ ] Corriger toutes les queries manquantes
- [ ] Exécuter `./scripts/count-remaining-delmas.sh`
- [ ] Vérifier 0 références critiques restantes

### Phase 11: Validation Finale

- [ ] Code review complet
- [ ] Tests d'intégration end-to-end
- [ ] Tests de performance
- [ ] Tests de sécurité (isolation)
- [ ] Documentation mise à jour
- [ ] Migration testée sur copie de prod

---

## 📊 Métriques de Progression

### Indicateurs Clés

| Indicateur | Cible | Comment Mesurer |
|-----------|-------|----------------|
| **Schémas renommés** | 100% | `grep -r "piscine_delmas" \| wc -l` = 0 |
| **Emails hardcodés supprimés** | 100% | `grep -r "oppsyste@gmail" \| wc -l` = 0 |
| **Server actions avec tenant_id** | 100% | Checklist phase 4 complète |
| **API routes avec tenant_id** | 100% | Checklist phase 5 complète |
| **Tests d'isolation passés** | 100% | Tous les tests ✅ |
| **Composants UI dynamiques** | 100% | Pas de "Delmas" hardcodé visible |

### Rapport de Progression (à mettre à jour régulièrement)

```
Date: [À REMPLIR]

✅ Phase 1: Préparation         [ ] Complète
✅ Phase 2: Base de Données     [ ] Complète
✅ Phase 3: Middleware          [ ] Complète
✅ Phase 4: Server Actions      [ ] Complète (0/6)
✅ Phase 5: API Routes          [ ] Complète (0/10)
✅ Phase 6: Composants UI       [ ] Complète (0/40)
✅ Phase 7: PDF                 [ ] Complète
✅ Phase 8: Configuration       [ ] Complète
✅ Phase 9: Tests               [ ] Complète
✅ Phase 10: Scripts            [ ] Complète
✅ Phase 11: Validation         [ ] Complète

Progression Globale: 0% ▱▱▱▱▱▱▱▱▱▱
```

---

## 🎯 Objectif Final

**Zero référence Delmas hardcodée dans le code source.**

**Validation:**
```bash
# Doit retourner 0 (ou seulement dans docs/commentaires)
grep -ri "delmas" --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=docs \
  . | wc -l
```

**Résultat attendu:** `0` ou seulement des mentions dans commentaires/docs.

---

## 📞 Support

Pour questions durant le refactoring:
- **Plan transformation:** `/docs/PLAN_TRANSFORMATION_SAAS.md`
- **Guide migration SQL:** `/docs/GUIDE_MIGRATION_SQL.md`
- **Spécifications SaaS:** `/docs/SPECIFICATIONS_SAAS.md`

---

**🎯 Mission:** Éliminer toutes les dépendances Delmas et transformer l'application en SaaS multi-tenant générique.

**⏱️ Timeline:** 3-4 semaines de développement intensif
**✅ Succès:** 100% des checklist complétées + 0 référence Delmas hardcodée
