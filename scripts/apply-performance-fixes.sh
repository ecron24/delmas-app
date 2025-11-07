#!/bin/bash

# ============================================
# Script d'application des corrections de performance
# Date: 2025-11-07
# Description: Applique les migrations pour corriger la lenteur et l'affichage
# ============================================

set -e  # Arrêter en cas d'erreur

echo "🚀 Application des corrections de performance..."
echo "============================================"
echo ""

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI n'est pas installé.${NC}"
    echo "Installez-le avec: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI détecté${NC}"
echo ""

# Se placer dans le répertoire du projet
cd "$(dirname "$0")/.."

echo "📂 Répertoire de travail: $(pwd)"
echo ""

# Liste des migrations à appliquer
MIGRATIONS=(
    "20251107_ensure_complete_schema_all_tables.sql"
    "20251107_ensure_interventions_complete_schema.sql"
    "20251107_fix_performance_and_indexes.sql"
)

echo "📋 Migrations à appliquer:"
for migration in "${MIGRATIONS[@]}"; do
    echo "   - $migration"
done
echo ""

# Demander confirmation
read -p "Voulez-vous continuer? (o/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[OoYy]$ ]]; then
    echo -e "${YELLOW}⚠️ Opération annulée${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}🔄 Application des migrations...${NC}"
echo ""

# Méthode 1: Si Supabase est linké
if supabase status &> /dev/null; then
    echo "📡 Connexion détectée à Supabase"

    for migration in "${MIGRATIONS[@]}"; do
        echo -e "${YELLOW}→ Application de $migration...${NC}"

        if supabase db push --include-all; then
            echo -e "${GREEN}✅ $migration appliquée${NC}"
        else
            echo -e "${RED}❌ Erreur lors de l'application de $migration${NC}"
            exit 1
        fi
        echo ""
    done

    echo -e "${GREEN}✅ Toutes les migrations ont été appliquées avec succès!${NC}"

else
    echo -e "${RED}❌ Pas de connexion Supabase détectée${NC}"
    echo ""
    echo "Pour appliquer les migrations manuellement:"
    echo "1. Connectez-vous à votre projet Supabase"
    echo "2. Allez dans 'SQL Editor'"
    echo "3. Exécutez chaque fichier dans cet ordre:"
    echo ""
    for migration in "${MIGRATIONS[@]}"; do
        echo "   - supabase/migrations/$migration"
    done
    echo ""
    exit 1
fi

echo ""
echo "============================================"
echo -e "${GREEN}🎉 TERMINÉ!${NC}"
echo "============================================"
echo ""
echo "Les corrections suivantes ont été appliquées:"
echo ""
echo "✅ Index ajoutés sur:"
echo "   • interventions.scheduled_date"
echo "   • interventions.status"
echo "   • intervention_types_junction.intervention_id"
echo "   • clients.is_prospect, last_name, phone, mobile"
echo ""
echo "✅ Schéma complet vérifié pour:"
echo "   • Table interventions"
echo "   • Tables auxiliaires (profiles, technicians, etc.)"
echo ""
echo "🚀 Votre application devrait maintenant être beaucoup plus rapide!"
echo "📅 Les rendez-vous Google Calendar devraient s'afficher correctement"
echo ""
echo "Pour vérifier:"
echo "   1. Rechargez votre page agenda"
echo "   2. Vérifiez le dashboard 'Aujourd'hui'"
echo "   3. Observez l'amélioration des performances"
echo ""
