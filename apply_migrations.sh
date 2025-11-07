#!/bin/bash

# ============================================
# Script pour appliquer toutes les migrations de correction
# Date: 2025-11-07
# ============================================

echo "🚀 APPLICATION DES MIGRATIONS DE CORRECTION"
echo "============================================"
echo ""

# Vérifier que la connexion DB est configurée
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERREUR: La variable DATABASE_URL n'est pas définie"
  echo "   Définissez-la avec: export DATABASE_URL='postgresql://user:password@host:port/database'"
  exit 1
fi

echo "✅ Variable DATABASE_URL détectée"
echo ""

# Migration 1: Créer le trigger pour facture proforma automatique
echo "📋 [1/4] Application de 20251107_create_proforma_invoice_trigger.sql"
psql "$DATABASE_URL" -f supabase/migrations/20251107_create_proforma_invoice_trigger.sql
if [ $? -eq 0 ]; then
  echo "✅ Migration 1/4 appliquée avec succès"
else
  echo "❌ Erreur lors de l'application de la migration 1/4"
  exit 1
fi
echo ""

# Migration 2: Corriger le trigger de mise à jour des totaux de facture
echo "📋 [2/4] Application de 20251107_fix_invoice_totals_trigger.sql"
psql "$DATABASE_URL" -f supabase/migrations/20251107_fix_invoice_totals_trigger.sql
if [ $? -eq 0 ]; then
  echo "✅ Migration 2/4 appliquée avec succès"
else
  echo "❌ Erreur lors de l'application de la migration 2/4"
  exit 1
fi
echo ""

# Migration 3: Corriger la copie des produits dans la facture proforma
echo "📋 [3/4] Application de 20251107_fix_proforma_copy_products.sql"
psql "$DATABASE_URL" -f supabase/migrations/20251107_fix_proforma_copy_products.sql
if [ $? -eq 0 ]; then
  echo "✅ Migration 3/4 appliquée avec succès"
else
  echo "❌ Erreur lors de l'application de la migration 3/4"
  exit 1
fi
echo ""

# Migration 4: Corriger l'erreur "missing FROM-clause entry for table 'i'"
echo "📋 [4/4] Application de 20251107_fix_sync_intervention_total.sql"
psql "$DATABASE_URL" -f supabase/migrations/20251107_fix_sync_intervention_total.sql
if [ $? -eq 0 ]; then
  echo "✅ Migration 4/4 appliquée avec succès"
else
  echo "❌ Erreur lors de l'application de la migration 4/4"
  exit 1
fi
echo ""

echo "============================================"
echo "🎉 TOUTES LES MIGRATIONS ONT ÉTÉ APPLIQUÉES AVEC SUCCÈS !"
echo "============================================"
echo ""
echo "📝 Résumé des corrections appliquées:"
echo "   1. ✅ Trigger de création automatique de facture proforma"
echo "   2. ✅ Recalcul automatique des totaux de facture"
echo "   3. ✅ Copie correcte des produits avec tva_rate"
echo "   4. ✅ Correction de l'erreur 'missing FROM-clause entry for table i'"
echo ""
echo "🧪 Prochaine étape : Tester le workflow complet"
echo "   1. Créer une intervention depuis Google Calendar"
echo "   2. Ajouter des produits"
echo "   3. Terminer l'intervention"
echo "   4. Vérifier que la facture proforma est créée avec les produits"
echo "   5. Modifier les tarifs dans la proforma"
echo "   6. Convertir en facture finale"
echo ""
