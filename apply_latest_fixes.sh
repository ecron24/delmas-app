#!/bin/bash

# ============================================
# Script pour appliquer les corrections d'affichage
# Date: 2025-11-07
# ============================================

echo "🚀 APPLICATION DES CORRECTIONS D'AFFICHAGE"
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

# Migration 1: Supprimer les triggers défectueux
echo "📋 [1/2] Rollback des triggers défectueux (20251107_rollback_intervention_totals.sql)"
psql "$DATABASE_URL" -f supabase/migrations/20251107_rollback_intervention_totals.sql
if [ $? -eq 0 ]; then
  echo "✅ Migration 1/2 appliquée avec succès"
else
  echo "❌ Erreur lors de l'application de la migration 1/2"
  exit 1
fi
echo ""

# Migration 2: Ajouter labor et travel dans les futures factures proforma
echo "📋 [2/2] Ajout labor + travel dans factures proforma (20251107_add_labor_travel_to_proforma.sql)"
psql "$DATABASE_URL" -f supabase/migrations/20251107_add_labor_travel_to_proforma.sql
if [ $? -eq 0 ]; then
  echo "✅ Migration 2/2 appliquée avec succès"
else
  echo "❌ Erreur lors de l'application de la migration 2/2"
  exit 1
fi
echo ""

echo "============================================"
echo "🎉 TOUTES LES CORRECTIONS ONT ÉTÉ APPLIQUÉES !"
echo "============================================"
echo ""
echo "📝 Résumé des corrections:"
echo "   1. ✅ Suppression des triggers défectueux de calcul des totaux"
echo "   2. ✅ Ajout automatique de labor + travel dans futures factures proforma"
echo ""
echo "💡 IMPORTANT:"
echo "   • Les cards affichent maintenant labor + travel + produits (code déjà pushé)"
echo "   • Les totaux sont récupérés depuis la table 'invoices' (source de vérité)"
echo "   • Les futures interventions auront labor/travel comme lignes dans invoice_items"
echo ""
echo "🧪 Prochaine étape : Créer une NOUVELLE intervention pour tester"
echo "   1. Créer intervention avec hivernage (130€) + déplacement (30€)"
echo "   2. Ajouter produits (100€)"
echo "   3. Terminer → Vérifier facture proforma créée avec 3 lignes"
echo "   4. Vérifier affichage sur fiche : 312€ avec détails complets"
echo ""
