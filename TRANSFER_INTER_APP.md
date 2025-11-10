# 📦 Comment Transférer Inter-App Template

## 🎯 Simple et Rapide !

Tous les fichiers d'Inter-App sont prêts dans le dossier `inter-app-template/` de delmas-app.

---

## 📋 Instructions sur Votre VPS

### Étape 1 : Pull delmas-app

```bash
# Se connecter au VPS
ssh ronan@votre-vps

# Aller dans delmas-app
cd ~/obotcall/obotcall-stack/delmas-app

# Pull les derniers changements
git pull origin main
```

Vous devriez maintenant avoir le dossier `inter-app-template/` avec tous les fichiers !

### Étape 2 : Copier vers inter-app

```bash
# Copier tout le contenu vers inter-app (en excluant .git)
cp -r ~/obotcall/obotcall-stack/delmas-app/inter-app-template/* ~/obotcall/obotcall-stack-2/inter-app/

# Copier aussi les fichiers cachés (.env.example, .gitignore)
cp ~/obotcall/obotcall-stack/delmas-app/inter-app-template/.* ~/obotcall/obotcall-stack-2/inter-app/ 2>/dev/null || true
```

### Étape 3 : Vérifier

```bash
cd ~/obotcall/obotcall-stack-2/inter-app
ls -la

# Vous devriez voir:
# - package.json
# - docker-compose.yml
# - src/
# - inter-api/
# - supabase/
# - README.md
# - .env.example
# - .gitignore
# etc.
```

### Étape 4 : Commit et Push

```bash
cd ~/obotcall/obotcall-stack-2/inter-app

# Vérifier les fichiers
git status

# Ajouter tous les fichiers
git add .

# Commit
git commit -m "🚀 Initial commit: Inter-App SaaS Multi-Tenant Platform

- Backend Hono API avec authentification sécurisée
- Feature flags pour plans Free/Starter/Pro/Enterprise
- Frontend Next.js 14 + Tailwind + shadcn/ui
- Schéma SQL Supabase avec RLS multi-tenant
- Documentation complète
- Docker Compose pour développement"

# Push vers GitHub
git push origin main
```

---

## ✅ Vérification

Après le push, vérifier sur GitHub que tous les fichiers sont bien présents :
- https://github.com/ecron24/inter-app

Vous devriez voir :
- ✅ 33+ fichiers
- ✅ Dossiers: src/, inter-api/, supabase/, docs/
- ✅ README.md complet

---

## 🚀 Prochaines Étapes

Une fois sur GitHub, suivre le README pour :

1. **Configurer Supabase** (30 minutes)
   - Créer projet
   - Exécuter migration SQL
   - Copier credentials dans .env

2. **Lancer avec Docker** (5 minutes)
   ```bash
   cd ~/obotcall/obotcall-stack-2/inter-app
   cp .env.example .env
   nano .env  # Remplir avec credentials Supabase
   docker-compose up -d
   ```

3. **Accéder à l'app**
   ```
   http://localhost:3001
   ```

---

## 📚 Documentation

Tout est documenté dans :
- `README.md` - Documentation complète
- `inter-api/README.md` - Documentation backend
- `docs/` - 5 documents techniques

---

**C'est parti ! 🎉**
