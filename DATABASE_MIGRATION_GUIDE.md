# Guide de Migration Base de Données

## 🎯 Objectif

Ajouter les champs manquants dans la base de données Supabase pour que l'application Next.js fonctionne correctement avec :
- La gestion des clients professionnels vs particuliers
- La synchronisation Google Calendar
- Le suivi complet des interventions

## 📋 Champs ajoutés

### Table `clients`

| Colonne | Type | Description |
|---------|------|-------------|
| `type` | text | Type de client : 'particulier' ou 'professionnel' (default: 'particulier') |
| `company_name` | text | Raison sociale pour les clients professionnels |
| `mobile` | text | Numéro de mobile (en plus du `phone` existant) |

### Table `interventions`

| Colonne | Type | Description |
|---------|------|-------------|
| `reference` | text (NOT NULL, UNIQUE) | Référence unique (ex: INT-202410-123) |
| `description` | text | Description visible (vient de Google Calendar ou technicien) |
| `labor_hours` | numeric(10,2) | Nombre d'heures de main d'œuvre |
| `labor_rate` | numeric(10,2) | Taux horaire |
| `travel_fee` | numeric(10,2) | Frais de déplacement |
| `total_ttc` | numeric(10,2) | Montant total TTC |
| `gcal_event_id` | text (UNIQUE) | ID de l'événement Google Calendar |
| `created_from` | text | Source : 'app' ou 'gcal' |
| `synced_to_gcal` | boolean | Synchronisé vers Google Calendar |
| `completed_at` | timestamp | Date de complétion |
| `client_present` | boolean | Client présent lors de l'intervention |
| `client_signed_at` | timestamp | Date de signature du client |

**Note** : Les champs `notes` et `private_notes` existent déjà et restent inchangés.

## 🚀 Application de la migration

### Option 1 : Via l'interface Supabase (recommandé)

1. **Connectez-vous** à votre projet Supabase : https://supabase.com/dashboard

2. **Allez dans SQL Editor** :
   - Cliquez sur "SQL Editor" dans le menu de gauche
   - Cliquez sur "New query"

3. **Copiez-collez** le contenu du fichier :
   ```
   supabase/migrations/20251027_add_missing_fields.sql
   ```

4. **Exécutez** la requête (bouton "Run" ou Ctrl+Enter)

5. **Vérifiez** que le message de succès s'affiche :
   ```
   Migration completed successfully! All columns were added.
   ```

### Option 2 : Via Supabase CLI

```bash
# Se connecter à Supabase
supabase login

# Lier le projet local
supabase link --project-ref votre-project-ref

# Appliquer la migration
supabase db push
```

### Option 3 : Exécution manuelle avec psql

```bash
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  -f supabase/migrations/20251027_add_missing_fields.sql
```

## ✅ Vérification post-migration

### 1. Vérifier la structure des tables

```sql
-- Vérifier les nouvelles colonnes de clients
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'piscine_delmas_public'
  AND table_name = 'clients'
  AND column_name IN ('type', 'company_name', 'mobile');

-- Vérifier les nouvelles colonnes d'interventions
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'piscine_delmas_public'
  AND table_name = 'interventions'
  AND column_name IN ('reference', 'description', 'gcal_event_id', 'created_from', 'labor_hours');
```

### 2. Vérifier les index

```sql
-- Vérifier les index créés
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'piscine_delmas_public'
  AND tablename IN ('clients', 'interventions')
  AND indexname LIKE '%reference%' OR indexname LIKE '%gcal%' OR indexname LIKE '%type%';
```

### 3. Vérifier les données migrées

```sql
-- Vérifier que tous les clients ont un type
SELECT COUNT(*) as total_clients,
       COUNT(type) as clients_with_type,
       COUNT(*) - COUNT(type) as clients_without_type
FROM piscine_delmas_public.clients;

-- Vérifier que toutes les interventions ont une référence
SELECT COUNT(*) as total_interventions,
       COUNT(reference) as interventions_with_reference,
       COUNT(*) - COUNT(reference) as interventions_without_reference
FROM piscine_delmas_public.interventions;

-- Voir quelques exemples de références générées
SELECT id, reference, scheduled_date, status
FROM piscine_delmas_public.interventions
ORDER BY scheduled_date DESC
LIMIT 10;
```

## 🔄 Migration des données existantes

La migration SQL inclut automatiquement :

### Clients
- Tous les clients existants sont marqués comme `type = 'particulier'` par défaut
- Les champs `company_name` et `mobile` sont NULL (à remplir manuellement si besoin)

### Interventions
- Génération automatique de références pour toutes les interventions existantes
- Format : `INT-YYYYMM-XXX` basé sur la `scheduled_date`
- Copie de `completion_date` vers `completed_at` pour les interventions déjà terminées

## 🛡️ Sécurité et Rollback

### Sauvegarde avant migration

```sql
-- Créer une sauvegarde des tables
CREATE TABLE clients_backup AS SELECT * FROM piscine_delmas_public.clients;
CREATE TABLE interventions_backup AS SELECT * FROM piscine_delmas_public.interventions;
```

### Rollback (si nécessaire)

```sql
-- Supprimer les nouvelles colonnes de clients
ALTER TABLE piscine_delmas_public.clients
DROP COLUMN IF EXISTS type,
DROP COLUMN IF EXISTS company_name,
DROP COLUMN IF EXISTS mobile;

-- Supprimer les nouvelles colonnes d'interventions
ALTER TABLE piscine_delmas_public.interventions
DROP COLUMN IF EXISTS reference,
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS labor_hours,
DROP COLUMN IF EXISTS labor_rate,
DROP COLUMN IF EXISTS travel_fee,
DROP COLUMN IF EXISTS total_ttc,
DROP COLUMN IF EXISTS gcal_event_id,
DROP COLUMN IF EXISTS created_from,
DROP COLUMN IF EXISTS synced_to_gcal,
DROP COLUMN IF EXISTS completed_at,
DROP COLUMN IF EXISTS client_present,
DROP COLUMN IF EXISTS client_signed_at;
```

## 📊 Impact sur l'application

### Fonctionnalités activées après migration

✅ **Clients** :
- Distinction particulier/professionnel dans l'interface
- Affichage du nom d'entreprise pour les professionnels
- Numéro de mobile séparé du téléphone fixe

✅ **Interventions** :
- Références uniques (INT-202410-123)
- Synchronisation Google Calendar bidirectionnelle
- Calcul des tarifs (heures × taux + déplacement)
- Workflow de signature client

✅ **Google Calendar** :
- Import automatique des événements Google Calendar
- Détection des doublons via `gcal_event_id`
- Badge visuel pour identifier la source (app vs Google)

### Fichiers de l'application concernés

- `/app/dashboard/clients/*` - Gestion des clients
- `/app/dashboard/interventions/*` - Gestion des interventions
- `/app/api/calendar/import-event/route.ts` - Import Google Calendar
- `/lib/actions/clients.ts` - Actions serveur clients
- `/lib/actions/interventions.ts` - Actions serveur interventions

## 🆘 Support

Si vous rencontrez des problèmes :

1. **Vérifier les logs Supabase** dans le Dashboard
2. **Tester les requêtes** dans l'onglet SQL Editor
3. **Vérifier les permissions RLS** si l'app ne peut pas accéder aux nouvelles colonnes
4. **Restaurer la sauvegarde** en cas de problème majeur

## ✨ Prochaines étapes

Après la migration :

1. ✅ Déployer l'application Next.js avec le nouveau code
2. ✅ Configurer le workflow n8n pour Google Calendar
3. ✅ Tester la création de clients professionnels
4. ✅ Tester l'import d'événements depuis Google Calendar
5. ✅ Vérifier la génération des références d'interventions
