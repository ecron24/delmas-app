# 🔧 Documentation Technique - Delmas App

> **Architecture complète et guide développeur**
>
> **Stack :** Next.js 14 + Supabase (PostgreSQL) + Docker
>
> **Version :** 1.0

---

## 📐 Architecture Globale

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                        UTILISATEURS                          │
│          (Web Browser - Mobile/Desktop/Tablet)               │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
                     │
┌────────────────────▼────────────────────────────────────────┐
│                    NGINX Reverse Proxy                       │
│                   (SSL Termination)                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │
┌────────────────────▼────────────────────────────────────────┐
│                    NEXT.JS 14 APP                            │
│                   (App Router + RSC)                         │
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │   Pages/     │ │  API Routes  │ │  Server      │       │
│  │  Components  │ │  (Serverless)│ │  Actions     │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
└─────────┬────────────────┬───────────────┬─────────────────┘
          │                │               │
          │                │               │
  ┌───────▼─────┐  ┌───────▼────────┐  ┌─▼──────────┐
  │  SUPABASE   │  │   GOTENBERG    │  │  RESEND    │
  │ (PostgreSQL)│  │ (PDF Generator)│  │ (Email API)│
  │             │  │                │  │            │
  │ • Auth      │  │ • HTML → PDF   │  │ • Sending  │
  │ • Database  │  │ • Chromium     │  │ • Tracking │
  │ • Storage   │  │                │  │            │
  │ • RLS       │  │                │  │            │
  └─────────────┘  └────────────────┘  └────────────┘
          │
          │
  ┌───────▼─────────────────────────────────────────┐
  │          POSTGRESQL DATABASE                    │
  │                                                  │
  │  ┌──────────────────┐  ┌───────────────────┐  │
  │  │ piscine_delmas_  │  │ piscine_delmas_   │  │
  │  │     public       │  │     compta        │  │
  │  │                  │  │                   │  │
  │  │ • clients        │  │ • invoices        │  │
  │  │ • interventions  │  │ • invoice_items   │  │
  │  │ • products       │  │ • invoice_number_ │  │
  │  │ • prospects      │  │   sequences       │  │
  │  │ • company_       │  │                   │  │
  │  │   settings       │  │                   │  │
  │  └──────────────────┘  └───────────────────┘  │
  └──────────────────────────────────────────────┘
```

---

## 🛠️ Stack Technique Détaillé

### Frontend

| Technologie | Version | Rôle |
|-------------|---------|------|
| **Next.js** | 14.2.x | Framework React full-stack |
| **React** | 18.3.x | Librairie UI |
| **TypeScript** | 5.5.x | Langage typé |
| **Tailwind CSS** | 3.4.x | Framework CSS utility-first |
| **Lucide React** | Latest | Icônes SVG |

**App Router (Next.js 14) :**
- Server Components par défaut
- Client Components (`'use client'`) pour interactivité
- API Routes dans `/app/api/`
- Server Actions dans `/lib/actions/`

---

### Backend & Database

| Technologie | Version | Rôle |
|-------------|---------|------|
| **Supabase** | Latest | Backend-as-a-Service |
| **PostgreSQL** | 15.x | Base de données relationnelle |
| **Row Level Security** | - | Sécurité au niveau ligne |
| **Triggers & Functions** | - | Logique métier en DB |

**Supabase Services utilisés :**
- **Auth :** Authentification utilisateurs (email/password)
- **Database :** PostgreSQL hébergé
- **Storage :** Upload fichiers (devis, documents)
- **Realtime :** WebSocket (non utilisé actuellement)

---

### Services Externes

| Service | Rôle | Coût |
|---------|------|------|
| **Gotenberg** | Conversion HTML → PDF | Gratuit (self-hosted) |
| **Resend** | Envoi emails transactionnels | $20/mois (10k emails) |
| **Google Calendar API** | Sync calendrier | Gratuit |
| **n8n** (optionnel) | Webhooks & automations | Variable |
| **Stripe** (futur) | Paiements en ligne | 1,4% + 0,25€ |

---

### Infrastructure

| Composant | Technologie | Rôle |
|-----------|-------------|------|
| **Containerization** | Docker + Docker Compose | Isolation & portabilité |
| **Reverse Proxy** | Nginx | Routing HTTPS, load balancing |
| **SSL/TLS** | Let's Encrypt (Certbot) | Certificats HTTPS |
| **Hébergement** | VPS Linux (Ubuntu/Debian) | Serveur dédié/VPS |

---

## 🗄️ Schéma Base de Données

### Architecture Multi-Schéma

**Pourquoi 2 schémas ?**
- **`piscine_delmas_public`** : Données métier (clients, interventions, produits)
- **`piscine_delmas_compta`** : Données comptables isolées (factures, paiements)

**Avantages :**
- Séparation des responsabilités
- Permissions granulaires
- Export comptabilité facilité
- Conformité légale (archivage 10 ans)

---

### Schéma : `piscine_delmas_public`

#### Table : `clients`

```sql
CREATE TABLE piscine_delmas_public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Type
  type TEXT NOT NULL DEFAULT 'particulier', -- 'particulier' | 'professionnel'

  -- Infos particulier
  first_name TEXT,
  last_name TEXT,

  -- Infos professionnel
  company_name TEXT,

  -- Contact
  email TEXT,
  phone TEXT,
  mobile TEXT,

  -- Adresse
  address TEXT,
  postal_code TEXT,
  city TEXT,

  -- Prospect
  is_prospect BOOLEAN DEFAULT false,
  prospect_status_id UUID REFERENCES prospect_status(id),
  prospect_created_at TIMESTAMP WITH TIME ZONE,
  quote_file_url TEXT,
  quote_filename TEXT,
  quote_uploaded_at TIMESTAMP WITH TIME ZONE,
  quote_sent_history JSONB,

  -- Autres
  notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_clients_type ON clients(type);
CREATE INDEX idx_clients_is_prospect ON clients(is_prospect);
CREATE INDEX idx_clients_email ON clients(email);
```

---

#### Table : `interventions`

```sql
CREATE TABLE piscine_delmas_public.interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id),

  -- Identification
  reference TEXT UNIQUE NOT NULL, -- INT-2025-0001

  -- Planification
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration NUMERIC(5,2), -- heures
  status TEXT DEFAULT 'draft', -- draft|scheduled|in_progress|completed|cancelled

  -- Types (array ou junction table)
  intervention_type TEXT, -- maintenance|repair|installation|emergency|diagnostic|cleaning|winterization|startup|other

  -- Description
  description TEXT,
  internal_notes TEXT,

  -- Facturation
  hourly_rate NUMERIC(10,2) DEFAULT 0,
  travel_fees NUMERIC(10,2) DEFAULT 0,

  -- En attente
  on_hold_reason TEXT, -- missing_water|defective_equipment|multi_phase_treatment
  on_hold_at TIMESTAMP WITH TIME ZONE,
  on_hold_by UUID REFERENCES auth.users(id),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Index
CREATE INDEX idx_interventions_client_id ON interventions(client_id);
CREATE INDEX idx_interventions_status ON interventions(status);
CREATE INDEX idx_interventions_scheduled_date ON interventions(scheduled_date);
CREATE INDEX idx_interventions_reference ON interventions(reference);
```

---

#### Table : `intervention_items`

```sql
CREATE TABLE piscine_delmas_public.intervention_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),

  product_name TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_intervention_items_intervention ON intervention_items(intervention_id);
```

---

#### Table : `products`

```sql
CREATE TABLE piscine_delmas_public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  category_id UUID REFERENCES product_categories(id),

  selling_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'unité', -- kg, L, unité, m², h

  description TEXT,
  is_active BOOLEAN DEFAULT true,

  -- Stock (futur)
  stock_quantity NUMERIC(10,2) DEFAULT 0,
  min_stock_alert NUMERIC(10,2) DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_is_active ON products(is_active);
```

---

#### Table : `company_settings`

```sql
CREATE TABLE piscine_delmas_public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Company basic info
  company_name TEXT NOT NULL DEFAULT 'PISCINE DELMAS',
  company_address TEXT NOT NULL,
  company_postal_code TEXT NOT NULL,
  company_city TEXT NOT NULL,

  -- Legal info
  siret TEXT NOT NULL,
  tva_number TEXT NOT NULL,
  legal_form TEXT, -- EI, SARL, SAS, SASU, etc.
  share_capital TEXT,
  rcs_city TEXT,
  rcs_number TEXT,

  -- Contact info
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  website TEXT,

  -- Invoice settings
  invoice_prefix TEXT NOT NULL DEFAULT 'PRO',
  payment_delay_days INTEGER NOT NULL DEFAULT 30,
  late_payment_rate NUMERIC(5,2) NOT NULL DEFAULT 12.00,
  recovery_fee NUMERIC(10,2) NOT NULL DEFAULT 40.00,

  -- Legal mentions and CGV
  invoice_footer_notes TEXT,
  legal_mentions TEXT,
  general_conditions TEXT,

  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Une seule ligne de config par instance
-- Pas d'index nécessaire
```

---

### Schéma : `piscine_delmas_compta`

#### Table : `invoices`

```sql
CREATE TABLE piscine_delmas_compta.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations (schéma différent)
  client_id UUID NOT NULL,
  intervention_id UUID NOT NULL,

  -- Identification
  invoice_number TEXT UNIQUE NOT NULL, -- PRO-2025-0001
  invoice_type TEXT NOT NULL DEFAULT 'proforma', -- proforma|final

  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,

  -- Montants
  subtotal_ht NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_tva NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0, -- Alias total_tva
  total_ttc NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Statut
  status TEXT DEFAULT 'draft', -- draft|sent|paid|cancelled

  -- Validation proforma
  proforma_validated_at TIMESTAMP WITH TIME ZONE,
  proforma_validated_by UUID,

  -- Envoi
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_by UUID,

  -- Paiement (futur)
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,

  -- Autres
  notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_intervention_id ON invoices(intervention_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_type ON invoices(invoice_type);
```

---

#### Table : `invoice_items`

```sql
CREATE TABLE piscine_delmas_compta.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  tva_rate NUMERIC(5,2) NOT NULL DEFAULT 20,
  total NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
```

---

#### Table : `invoice_number_sequences`

```sql
-- Gestion numérotation thread-safe
CREATE TABLE piscine_delmas_compta.invoice_number_sequences (
  year INT PRIMARY KEY,
  last_number INT NOT NULL DEFAULT 0
);

-- Lock pour éviter race conditions
-- Utilisé dans trigger create_proforma_invoice
```

---

### Triggers & Functions Importants

#### Génération Automatique Facture Proforma

```sql
CREATE OR REPLACE FUNCTION piscine_delmas_compta.create_proforma_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = piscine_delmas_compta, piscine_delmas_public
AS $$
DECLARE
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_current_year INT;
  v_next_number INT;
  v_company_prefix TEXT;
BEGIN
  -- Uniquement si intervention terminée
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN

    -- Lock table pour éviter race conditions
    LOCK TABLE invoice_number_sequences IN SHARE ROW EXCLUSIVE MODE;

    -- Récupérer préfixe entreprise
    SELECT invoice_prefix INTO v_company_prefix
    FROM piscine_delmas_public.company_settings LIMIT 1;

    -- Générer numéro unique
    v_current_year := EXTRACT(YEAR FROM NOW());

    INSERT INTO invoice_number_sequences (year, last_number)
    VALUES (v_current_year, 1)
    ON CONFLICT (year) DO UPDATE
    SET last_number = invoice_number_sequences.last_number + 1
    RETURNING last_number INTO v_next_number;

    v_invoice_number := v_company_prefix || '-' || v_current_year || '-' ||
                        LPAD(v_next_number::TEXT, 4, '0');

    -- Créer facture proforma
    INSERT INTO invoices (
      client_id, intervention_id, invoice_number, invoice_type,
      issue_date, due_date, status
    )
    VALUES (
      NEW.client_id, NEW.id, v_invoice_number, 'proforma',
      CURRENT_DATE, CURRENT_DATE + 30, 'draft'
    )
    RETURNING id INTO v_invoice_id;

    -- Copier lignes intervention → facture
    INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, tva_rate, total)
    SELECT
      v_invoice_id,
      product_name,
      quantity,
      unit_price,
      20, -- TVA 20%
      COALESCE(subtotal, quantity * unit_price)
    FROM piscine_delmas_public.intervention_items
    WHERE intervention_id = NEW.id;

    -- Calculer totaux
    UPDATE invoices SET
      subtotal_ht = (
        COALESCE((NEW.duration * NEW.hourly_rate), 0) +
        COALESCE(NEW.travel_fees, 0) +
        COALESCE((SELECT SUM(quantity * unit_price) FROM invoice_items WHERE invoice_id = v_invoice_id), 0)
      ),
      total_tva = (
        COALESCE((NEW.duration * NEW.hourly_rate * 0.20), 0) +
        COALESCE((NEW.travel_fees * 0.20), 0) +
        COALESCE((SELECT SUM((quantity * unit_price) * (tva_rate / 100.0)) FROM invoice_items WHERE invoice_id = v_invoice_id), 0)
      )
    WHERE id = v_invoice_id;

    UPDATE invoices SET
      total_ttc = subtotal_ht + total_tva,
      tax_amount = total_tva
    WHERE id = v_invoice_id;

  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_proforma_invoice
AFTER UPDATE ON piscine_delmas_public.interventions
FOR EACH ROW
EXECUTE FUNCTION piscine_delmas_compta.create_proforma_invoice();
```

---

## 🔐 Sécurité

### Row Level Security (RLS)

**Concept :** Chaque requête SQL est automatiquement filtrée selon l'utilisateur connecté.

**Exemple Policy :**

```sql
-- Clients : User ne voit que ses propres clients
ALTER TABLE piscine_delmas_public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clients"
ON piscine_delmas_public.clients
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users can insert their own clients"
ON piscine_delmas_public.clients
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());
```

**⚠️ Important :**
- Toutes les tables doivent avoir RLS activé
- Policies granulaires selon rôles (futur: admin, technicien, comptable)
- Functions en `SECURITY INVOKER` pour respecter RLS

---

### Authentification

**Supabase Auth :**
- Email + Password (défaut)
- Magic Link (futur)
- 2FA (futur)
- OAuth Google (futur)

**Gestion sessions :**
```typescript
// Client-side
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();

// Server-side (Server Components, API Routes)
import { createClient } from '@/lib/supabase/server';

const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
```

---

### Conformité RGPD

**Mesures implémentées :**
- ✅ Données hébergées EU (Supabase Frankfurt/London)
- ✅ Chiffrement at-rest et in-transit (TLS)
- ✅ RLS pour isolation données
- ✅ Logs audit (Supabase)
- ✅ Export données client possible (CSV)
- ✅ Suppression compte = suppression données (CASCADE)

**À implémenter :**
- ⚙️ Page "Mentions légales" & "Politique confidentialité"
- ⚙️ Consentement cookies
- ⚙️ Droit à l'oubli (interface admin)

---

## 🚀 APIs & Intégrations

### API Routes Next.js

**Structure :**
```
app/api/
├── interventions/
│   ├── [id]/
│   │   ├── notify-completion/route.ts  (POST) Webhook n8n
│   │   ├── send-confirmation/route.ts  (POST) Email confirmation
│   │   └── send-to-client/route.ts     (POST) Email facture + PDF
│   └── route.ts
├── calendar/
│   └── import-event/route.ts           (POST) Import Google Calendar
└── invoices/
    └── [id]/
        └── send-to-client/route.ts     (POST) DEPRECATED (voir interventions)
```

---

### Exemple API Route : Envoi Facture

**Fichier :** `app/api/interventions/[id]/send-to-client/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { generateInvoiceHTML } from '@/lib/pdf/generate-invoice-html';
import { generateInvoicePDF } from '@/lib/pdf/generate-invoice-pdf';
import { getCompanySettings } from '@/lib/actions/company-settings';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Auth check
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. Load company settings
  const { data: companySettings } = await getCompanySettings();

  // 3. Load invoice data
  const { data: invoice } = await supabase
    .schema('piscine_delmas_compta')
    .from('invoices')
    .select('*, client:clients(*), intervention:interventions(*), items:invoice_items(*)')
    .eq('id', params.id)
    .single();

  // 4. Generate PDF
  const html = generateInvoiceHTML({ invoice, companySettings });
  const pdfBuffer = await generateInvoicePDF(html, invoice.invoice_number);

  // 5. Send email
  await resend.emails.send({
    from: `${companySettings.company_name} <${companySettings.email}>`,
    to: invoice.client.email,
    subject: `Facture ${invoice.invoice_number}`,
    html: emailTemplate,
    attachments: [{
      filename: `Facture_${invoice.invoice_number}.pdf`,
      content: pdfBuffer
    }]
  });

  // 6. Update invoice status
  await supabase
    .schema('piscine_delmas_compta')
    .from('invoices')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', invoice.id);

  return NextResponse.json({ success: true });
}
```

---

### Server Actions

**Fichier :** `lib/actions/company-settings.ts`

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';

export async function getCompanySettings() {
  const supabase = createClient();

  const { data, error } = await supabase
    .schema('piscine_delmas_public')
    .from('company_settings')
    .select('*')
    .single();

  return { data, error };
}

export async function updateCompanySettings(id: string, updates: Partial<CompanySettings>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .schema('piscine_delmas_public')
    .from('company_settings')
    .update({ ...updates, updated_by: user?.id })
    .eq('id', id);

  return { success: !error, error };
}
```

**Usage dans composant :**
```typescript
'use client';

import { getCompanySettings, updateCompanySettings } from '@/lib/actions/company-settings';

export default function SettingsPage() {
  const settings = await getCompanySettings();

  const handleSave = async () => {
    await updateCompanySettings(settings.id, formData);
  };
}
```

---

### Intégration Gotenberg (PDF)

**Service Docker :**
```yaml
gotenberg:
  image: gotenberg/gotenberg:7
  ports:
    - "3001:3000"
  command:
    - "gotenberg"
    - "--chromium-disable-javascript=false"
```

**Utilisation :**
```typescript
// lib/pdf/generate-invoice-pdf.ts
import FormData from 'form-data';

export async function generateInvoicePDF(html: string, filename: string): Promise<Buffer> {
  const formData = new FormData();
  formData.append('files', Buffer.from(html), {
    filename: 'index.html',
    contentType: 'text/html'
  });

  const response = await fetch(
    process.env.GOTENBERG_URL || 'http://gotenberg:3000/forms/chromium/convert/html',
    {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    }
  );

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
```

---

### Intégration Resend (Email)

**Configuration :**
```bash
# .env
RESEND_API_KEY=re_xxxxx
```

**Utilisation :**
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'Entreprise <contact@entreprise.fr>',
  to: 'client@email.com',
  subject: 'Votre facture',
  html: '<h1>Bonjour</h1>',
  attachments: [{
    filename: 'facture.pdf',
    content: pdfBuffer
  }]
});
```

---

## ⚡ Performance & Optimisations

### Stratégies Caching

**Next.js App Router :**
```typescript
// Cache fetch pendant 1h
const data = await fetch('https://api.example.com/data', {
  next: { revalidate: 3600 }
});

// Cache indéfiniment (statique)
const staticData = await fetch('https://api.example.com/static', {
  cache: 'force-cache'
});

// Pas de cache
const liveData = await fetch('https://api.example.com/live', {
  cache: 'no-store'
});
```

**Supabase Queries :**
- Pas de cache côté Supabase
- Implémenter cache Redis si besoin (futur)

---

### Optimisations Images

**Next.js Image Component :**
```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={100}
  priority // Pour above-the-fold
  quality={85}
/>
```

---

### Database Indexes

**Indexes critiques créés :**
```sql
-- Recherche clients
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_company_name ON clients(company_name);

-- Filtres interventions
CREATE INDEX idx_interventions_status ON interventions(status);
CREATE INDEX idx_interventions_scheduled_date ON interventions(scheduled_date);
CREATE INDEX idx_interventions_client_id ON interventions(client_id);

-- Factures
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
```

---

## 🧪 Tests

### Tests Unitaires (À implémenter)

**Framework suggéré :** Vitest

```typescript
// __tests__/lib/pdf/generate-invoice-html.test.ts
import { describe, it, expect } from 'vitest';
import { generateInvoiceHTML } from '@/lib/pdf/generate-invoice-html';

describe('generateInvoiceHTML', () => {
  it('should generate valid HTML', () => {
    const html = generateInvoiceHTML(mockData);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain(mockData.invoice.invoice_number);
  });
});
```

---

### Tests E2E (À implémenter)

**Framework suggéré :** Playwright

```typescript
// e2e/intervention-workflow.spec.ts
import { test, expect } from '@playwright/test';

test('complete intervention workflow', async ({ page }) => {
  await page.goto('/dashboard/interventions');
  await page.click('button:has-text("+ Nouvelle")');

  // Fill form
  await page.fill('input[name="client"]', 'Test Client');
  await page.click('button:has-text("Créer")');

  // Verify created
  await expect(page.locator('text=Test Client')).toBeVisible();
});
```

---

## 📦 Déploiement

### Build Production

```bash
# Install dependencies
npm install

# Build app
npm run build

# Start production server
npm start
```

**Variables d'environnement requises :**
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
GOTENBERG_URL=
NODE_ENV=production
```

---

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    restart: unless-stopped

  gotenberg:
    image: gotenberg/gotenberg:7
    restart: unless-stopped
```

---

## 🔧 Guide Développeur

### Setup Local

```bash
# 1. Clone repo
git clone https://github.com/votre-org/delmas-app.git
cd delmas-app

# 2. Install dependencies
npm install

# 3. Setup .env
cp .env.example .env
# Éditer .env avec vraies valeurs

# 4. Start dev server
npm run dev

# 5. Open browser
open http://localhost:3000
```

---

### Conventions Code

**Nommage :**
- Composants : `PascalCase` (ex: `ClientCard.tsx`)
- Fonctions/variables : `camelCase` (ex: `getInvoiceTotal`)
- Constants : `UPPER_SNAKE_CASE` (ex: `API_BASE_URL`)
- Fichiers : `kebab-case` pour pages (ex: `company-settings.tsx`)

**Structure Fichiers :**
```
app/
├── dashboard/
│   ├── clients/
│   │   ├── page.tsx          (Page principale)
│   │   └── [id]/
│   │       └── page.tsx      (Page détail)
│   └── layout.tsx            (Layout dashboard)
├── api/
│   └── route.ts              (API routes)
└── components/               (Composants réutilisables)
    └── ClientCard.tsx

lib/
├── actions/                  (Server actions)
├── supabase/                 (Clients Supabase)
└── utils/                    (Fonctions utils)
```

---

### Bonnes Pratiques

**1. Server vs Client Components**
```typescript
// Server Component (défaut, pas de 'use client')
export default async function Page() {
  const data = await fetchData(); // Direct DB call
  return <div>{data}</div>;
}

// Client Component (interactivité)
'use client';

export default function InteractiveForm() {
  const [value, setValue] = useState('');
  return <input value={value} onChange={(e) => setValue(e.target.value)} />;
}
```

**2. Error Handling**
```typescript
try {
  const { data, error } = await supabase.from('table').select();
  if (error) throw error;
  return data;
} catch (error: any) {
  console.error('Error:', error.message);
  return { error: error.message };
}
```

**3. TypeScript**
```typescript
// Toujours typer les fonctions
export async function getClient(id: string): Promise<Client | null> {
  // ...
}

// Interfaces pour données
interface Invoice {
  id: string;
  invoice_number: string;
  total_ttc: number;
}
```

---

## 📚 Ressources

**Documentation officielle :**
- Next.js : https://nextjs.org/docs
- Supabase : https://supabase.com/docs
- Tailwind CSS : https://tailwindcss.com/docs
- Resend : https://resend.com/docs
- Gotenberg : https://gotenberg.dev/docs

**Communauté :**
- Discord Delmas App : [lien]
- GitHub Issues : [lien]

---

**Document créé le 29 octobre 2025 - Version 1.0**
