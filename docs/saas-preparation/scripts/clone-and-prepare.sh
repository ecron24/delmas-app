#!/bin/bash

# ============================================
# Script de migration : delmas-app → pooltech-saas
# Description: Clone le repo et prépare l'architecture multi-tenant
# Usage: ./clone-and-prepare.sh
# ============================================

set -e # Arrêter en cas d'erreur

# Couleurs pour l'affichage
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}
╔═══════════════════════════════════════════════════════╗
║   Migration delmas-app → pooltech-saas               ║
║   Clone & Adapt Strategy                             ║
╚═══════════════════════════════════════════════════════╝
${NC}"

# ============================================
# Configuration
# ============================================

SOURCE_REPO="delmas-app"
TARGET_REPO="pooltech-saas"
CURRENT_DIR=$(pwd)

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "  Source: $SOURCE_REPO"
echo "  Target: $TARGET_REPO"
echo ""

# Vérifier qu'on est dans le bon répertoire
if [ ! -d "$SOURCE_REPO" ]; then
    echo -e "${RED}❌ Erreur: Le répertoire $SOURCE_REPO n'existe pas${NC}"
    echo "Veuillez exécuter ce script depuis le répertoire parent de delmas-app"
    exit 1
fi

# Vérifier que le repo cible n'existe pas déjà
if [ -d "$TARGET_REPO" ]; then
    echo -e "${YELLOW}⚠️  Le répertoire $TARGET_REPO existe déjà${NC}"
    read -p "Voulez-vous le supprimer et recommencer? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$TARGET_REPO"
        echo -e "${GREEN}✅ Répertoire supprimé${NC}"
    else
        echo -e "${RED}❌ Migration annulée${NC}"
        exit 1
    fi
fi

# ============================================
# Étape 1: Cloner le repo
# ============================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📦 Étape 1/7: Clonage du repository${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

cp -r "$SOURCE_REPO" "$TARGET_REPO"
cd "$TARGET_REPO"

echo -e "${GREEN}✅ Repository cloné avec succès${NC}"

# ============================================
# Étape 2: Nettoyer les fichiers spécifiques à Delmas
# ============================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🧹 Étape 2/7: Nettoyage des fichiers${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Supprimer .git (on créera un nouveau repo)
if [ -d ".git" ]; then
    rm -rf .git
    echo "  ✓ .git supprimé"
fi

# Supprimer .env (contient des secrets Delmas)
if [ -f ".env" ]; then
    rm .env
    echo "  ✓ .env supprimé"
fi

# Supprimer node_modules
if [ -d "node_modules" ]; then
    rm -rf node_modules
    echo "  ✓ node_modules supprimé"
fi

# Supprimer les migrations Supabase existantes (on utilisera les nouvelles)
if [ -d "supabase/migrations" ]; then
    rm -rf supabase/migrations/*
    echo "  ✓ Anciennes migrations supprimées"
fi

echo -e "${GREEN}✅ Nettoyage terminé${NC}"

# ============================================
# Étape 3: Copier les nouvelles migrations
# ============================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 Étape 3/7: Copie des migrations multi-tenant${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Copier les nouvelles migrations
cp ../docs/saas-preparation/migrations/*.sql supabase/migrations/

echo -e "${GREEN}✅ Migrations multi-tenant copiées${NC}"
ls -1 supabase/migrations/

# ============================================
# Étape 4: Mettre à jour package.json
# ============================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📦 Étape 4/7: Mise à jour package.json${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Changer le nom du projet
if command -v jq &> /dev/null; then
    jq '.name = "pooltech-saas"' package.json > package.json.tmp && mv package.json.tmp package.json
    jq '.version = "2.0.0"' package.json > package.json.tmp && mv package.json.tmp package.json
    echo "  ✓ Nom changé en 'pooltech-saas'"
    echo "  ✓ Version changée en '2.0.0'"
else
    echo -e "${YELLOW}⚠️  jq n'est pas installé, modification manuelle nécessaire${NC}"
fi

# Ajouter les dépendances Stripe
echo "  ℹ️  Ajouter manuellement les dépendances Stripe:"
echo "     npm install stripe @stripe/stripe-js"

echo -e "${GREEN}✅ package.json mis à jour${NC}"

# ============================================
# Étape 5: Créer les fichiers de configuration
# ============================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}⚙️  Étape 5/7: Création des fichiers de config${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Créer nouveau .env.example
cat > .env.example << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe Configuration (NOUVEAU)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (à configurer après création des produits Stripe)
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...

# Email Configuration (Resend)
RESEND_API_KEY=your-resend-api-key

# PDF Generation (Gotenberg)
GOTENBERG_URL=http://gotenberg:3000/forms/chromium/convert/html

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=PoolTech SaaS

# Analytics (optionnel)
NEXT_PUBLIC_POSTHOG_KEY=phc_...
EOF

echo "  ✓ .env.example créé"

# Créer README.md pour pooltech-saas
cat > README.md << 'EOF'
# PoolTech SaaS

Application multi-tenant de gestion d'interventions pour professionnels de la piscine et services à domicile.

## 🚀 Quick Start

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos clés Supabase et Stripe

# Lancer le serveur de développement
npm run dev
```

## 📋 Architecture

- **Frontend**: Next.js 14 + React 18 + TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Paiements**: Stripe
- **Isolation**: Row Level Security (RLS) multi-tenant

## 🏗️ Structure

```
pooltech-saas/
├── app/                    # Pages et routes Next.js
├── lib/                    # Librairies et helpers
├── supabase/migrations/    # Migrations BDD multi-tenant
└── docs/                   # Documentation
```

## 📚 Documentation

- [Guide de migration](docs/saas-preparation/02_FILES_MIGRATION_GUIDE.md)
- [Spécifications](docs/saas-preparation/01_SAAS_SPECIFICATIONS.md)

## 🔐 Sécurité

Toutes les données sont isolées par `tenant_id` avec Row Level Security (RLS).

## 📄 License

Propriétaire
EOF

echo "  ✓ README.md créé"

echo -e "${GREEN}✅ Fichiers de configuration créés${NC}"

# ============================================
# Étape 6: Initialiser Git
# ============================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 Étape 6/7: Initialisation Git${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

git init
git add .
git commit -m "🎉 Initial commit - Migration from delmas-app to pooltech-saas

- Architecture multi-tenant avec RLS
- Système de rôles (admin, ceo, technician, secretary)
- Migrations Supabase multi-tenant
- Préparation intégration Stripe"

echo -e "${GREEN}✅ Repository Git initialisé${NC}"

# ============================================
# Étape 7: Créer la structure de dossiers SaaS
# ============================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📁 Étape 7/7: Création structure SaaS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Créer les dossiers pour les nouvelles pages SaaS
mkdir -p app/\(marketing\)
mkdir -p app/signup
mkdir -p app/onboarding/{company,plan,team,complete}
mkdir -p app/admin/{tenants,analytics}
mkdir -p app/settings/billing
mkdir -p app/api/webhooks/stripe
mkdir -p app/api/onboarding
mkdir -p lib/stripe
mkdir -p lib/permissions

echo "  ✓ Dossiers SaaS créés"

# Créer des fichiers placeholder
touch app/\(marketing\)/page.tsx
touch app/signup/page.tsx
touch app/onboarding/company/page.tsx
touch app/admin/page.tsx
touch lib/stripe/index.ts
touch lib/permissions.ts

echo "  ✓ Fichiers placeholder créés"

echo -e "${GREEN}✅ Structure SaaS créée${NC}"

# ============================================
# Résumé final
# ============================================

echo -e "\n${GREEN}
╔═══════════════════════════════════════════════════════╗
║   ✅ Migration terminée avec succès !               ║
╚═══════════════════════════════════════════════════════╝
${NC}"

echo -e "${BLUE}📋 Prochaines étapes:${NC}\n"

echo "1. Créer un nouveau projet Supabase:"
echo "   - https://app.supabase.com/projects"
echo "   - Copier les clés dans .env"
echo ""

echo "2. Exécuter les migrations Supabase:"
echo "   cd $TARGET_REPO"
echo "   supabase link --project-ref your-project-ref"
echo "   supabase db push"
echo ""

echo "3. Configurer Stripe:"
echo "   - Créer un compte Stripe"
echo "   - Créer les produits (Starter 29€, Pro 79€, Enterprise 199€)"
echo "   - Copier les clés dans .env"
echo ""

echo "4. Installer les dépendances:"
echo "   npm install"
echo "   npm install stripe @stripe/stripe-js"
echo ""

echo "5. Lancer le projet:"
echo "   npm run dev"
echo ""

echo -e "${YELLOW}📚 Documentation complète:${NC}"
echo "   - Spécifications: docs/saas-preparation/01_SAAS_SPECIFICATIONS.md"
echo "   - Guide fichiers: docs/saas-preparation/02_FILES_MIGRATION_GUIDE.md"
echo ""

echo -e "${GREEN}🎉 Bon développement sur pooltech-saas !${NC}"
