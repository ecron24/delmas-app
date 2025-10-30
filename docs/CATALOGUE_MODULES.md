# 📦 Catalogue des Modules - Delmas Piscine App

> **Version SaaS White Label** - Solution modulaire pour entreprises de services

---

## 🎯 Vue d'ensemble

Cette application est conçue comme une **solution SaaS modulaire** permettant à chaque client de souscrire uniquement aux fonctionnalités dont il a besoin. L'architecture white label permet une personnalisation complète (branding, mentions légales, workflows).

**Public cible :**
- Piscinistes et services d'entretien piscines
- Entreprises de maintenance & dépannage (plomberie, chauffage, climatisation)
- Services à domicile (jardinage, nettoyage, conciergerie)
- Artisans BTP (électriciens, peintres, menuisiers)
- Toute activité avec interventions planifiées + facturation

---

## 📊 Catégorisation des Modules

Les modules sont organisés en **5 niveaux** :

| Niveau | Type | Description | Prix suggéré |
|--------|------|-------------|--------------|
| 🟢 **CORE** | Essentiel | Fonctionnalités de base indispensables | Inclus dans base |
| 🔵 **STANDARD** | Métier | Fonctionnalités métier courantes | 10-30€/mois |
| 🟣 **PREMIUM** | Avancé | Automatisations et intégrations | 30-70€/mois |
| 🟠 **ENTERPRISE** | Expert | Modules complexes pour grandes structures | 70-150€/mois |
| ⚪ **ADDON** | À la carte | Extensions optionnelles | 5-20€/mois |

---

## 🟢 MODULES CORE (Inclus dans abonnement de base)

### 1. **Gestion Interventions**
**Statut :** ✅ Implémenté
**Complexité :** ⭐⭐⭐ Moyen
**Tarif suggéré :** Inclus (base 49€/mois)

**Fonctionnalités :**
- Création et planification d'interventions
- Gestion du statut (brouillon → planifiée → en cours → terminée)
- Assignation à un technicien
- Ajout de produits/services sur intervention
- Calcul automatique prix HT/TTC
- Historique complet des interventions par client
- Recherche et filtres avancés

**Valeur ajoutée :**
- Suivi en temps réel des interventions
- Réduction des oublis et erreurs
- Gain de temps : 2h/jour en moyenne

**Dépendances techniques :**
- PostgreSQL (Supabase)
- Authentification utilisateur

---

### 2. **Gestion Clients**
**Statut :** ✅ Implémenté
**Complexité :** ⭐⭐ Simple
**Tarif suggéré :** Inclus

**Fonctionnalités :**
- Fiche client complète (particulier/professionnel)
- Historique interventions par client
- Notes et commentaires
- Coordonnées complètes
- Recherche multicritères

**Valeur ajoutée :**
- Base de données clients centralisée
- Meilleure relation client
- Historique complet accessible instantanément

**Dépendances techniques :**
- PostgreSQL
- RLS (Row Level Security) pour sécurité données

---

### 3. **Configuration White Label**
**Statut :** ✅ Implémenté
**Complexité :** ⭐⭐ Simple
**Tarif suggéré :** Inclus

**Fonctionnalités :**
- Personnalisation nom entreprise, logo, couleurs
- Configuration informations légales (SIRET, TVA, RCS)
- Mentions légales et CGV personnalisées
- Paramètres de facturation (délais, pénalités)
- Branding automatique sur tous les documents

**Valeur ajoutée :**
- Image de marque professionnelle
- Conformité légale automatique
- Factures aux normes françaises

**Dépendances techniques :**
- Table `company_settings` en base de données

---

## 🔵 MODULES STANDARD (10-30€/mois)

### 4. **Calendrier & Planning**
**Statut :** ✅ Implémenté
**Complexité :** ⭐⭐⭐ Moyen
**Tarif suggéré :** 15€/mois

**Fonctionnalités :**
- Vue mensuelle et hebdomadaire
- Optimisé mobile (vue verticale)
- Synchronisation Google Calendar bidirectionnelle
- Drag & drop pour déplacer interventions (futur)
- Filtres par technicien, type, statut
- Export iCal

**Valeur ajoutée :**
- Visibilité complète du planning
- Sync avec calendrier personnel
- Optimisation des tournées

**Dépendances techniques :**
- Google Calendar API
- Webhooks n8n pour synchronisation

---

### 5. **Facturation Simple (Proforma + Finales)**
**Statut :** ✅ Implémenté
**Complexité :** ⭐⭐⭐⭐ Avancé
**Tarif suggéré :** 25€/mois

**Fonctionnalités :**
- Génération automatique factures proforma
- Conversion proforma → facture finale
- Calcul automatique TVA (multi-taux)
- Numérotation automatique anti-doublons
- Édition des lignes de facturation
- Gestion main d'œuvre + déplacements + produits
- Historique complet des factures

**Valeur ajoutée :**
- Conformité comptable française
- Gain de temps : 1h/jour
- Réduction erreurs de facturation : 90%

**Dépendances techniques :**
- Schéma comptabilité séparé (`piscine_delmas_compta`)
- Triggers PostgreSQL pour numérotation
- Table `invoice_number_sequences` avec lock

---

### 6. **Génération PDF Professionnelle**
**Statut :** ✅ Implémenté (Gotenberg)
**Complexité :** ⭐⭐⭐ Moyen
**Tarif suggéré :** 10€/mois

**Fonctionnalités :**
- Génération PDF factures avec branding client
- Template HTML professionnel responsive
- Mentions légales automatiques
- Export PDF pour devis, rapports d'intervention
- Qualité impression professionnelle

**Valeur ajoutée :**
- Documents professionnels prêts à imprimer
- Conforme aux normes comptables
- Image de marque renforcée

**Dépendances techniques :**
- Gotenberg (service Docker)
- Template HTML avec company_settings

---

### 7. **Envoi Emails Automatisés**
**Statut :** ✅ Implémenté (Resend)
**Complexité :** ⭐⭐⭐ Moyen
**Tarif suggéré :** 15€/mois (inclut 1000 emails)

**Fonctionnalités :**
- Envoi factures par email avec PDF
- Templates emails personnalisés avec branding
- Confirmation d'intervention au client
- Historique des envois (logs)
- Gestion rebonds et erreurs

**Valeur ajoutée :**
- Communication automatisée
- Suivi des envois
- Réduction temps administratif

**Dépendances techniques :**
- Resend API
- Table `email_logs` pour tracking

---

### 8. **Gestion Prospects & Devis**
**Statut :** ✅ Implémenté
**Complexité :** ⭐⭐⭐ Moyen
**Tarif suggéré :** 20€/mois

**Fonctionnalités :**
- Fiche prospect complète
- Statuts de suivi (nouveau, contacté, devis envoyé, perdu, converti)
- Upload et envoi de devis PDF
- Historique des envois de devis
- Conversion prospect → client
- Statistiques taux de conversion

**Valeur ajoutée :**
- Pipeline commercial structuré
- Suivi opportunités
- Amélioration taux de conversion

**Dépendances techniques :**
- Table `prospect_status`
- Stockage Supabase pour PDFs

---

### 9. **Import Données CSV**
**Statut :** ✅ Implémenté
**Complexité :** ⭐⭐ Simple
**Tarif suggéré :** 10€/mois (ou inclus)

**Fonctionnalités :**
- Import clients en masse
- Import produits/catalogue
- Import templates de prestations
- Import types d'équipements (piscines, etc.)
- Validation et gestion erreurs
- Templates CSV téléchargeables

**Valeur ajoutée :**
- Migration facilitée depuis ancien système
- Gain de temps setup initial
- Évite ressaisie manuelle

**Dépendances techniques :**
- Parser CSV côté client
- Batch insert en base de données

---

## 🟣 MODULES PREMIUM (30-70€/mois)

### 10. **Gestion Stock & Inventaire**
**Statut :** ⚙️ Partiellement implémenté (catalogue produits)
**Complexité :** ⭐⭐⭐⭐ Avancé
**Tarif suggéré :** 40€/mois

**Fonctionnalités à développer :**
- ✅ Catalogue produits avec prix
- ⚙️ Gestion stock en temps réel (quantités)
- ⚙️ Alertes stock minimum
- ⚙️ Mouvements stock (entrées/sorties)
- ⚙️ Valorisation stock
- ⚙️ Historique des mouvements
- ⚙️ Rapports d'inventaire

**Valeur ajoutée :**
- Évite ruptures de stock
- Optimisation des commandes
- Contrôle valorisation

**Dépendances techniques :**
- Table `products` (existe)
- Nouvelles tables : `stock_movements`, `stock_locations`
- Triggers pour décrément auto à la facturation

**Développement estimé :** 5-7 jours

---

### 11. **Notifications SMS**
**Statut :** ❌ Non implémenté
**Complexité :** ⭐⭐⭐ Moyen
**Tarif suggéré :** 35€/mois + coût SMS (0,05€/SMS)

**Fonctionnalités à développer :**
- Rappel RDV 24h avant intervention
- Confirmation fin d'intervention
- Envoi lien paiement par SMS
- Notifications urgences
- Templates SMS personnalisables

**Valeur ajoutée :**
- Réduction no-shows : 70%
- Amélioration satisfaction client
- Confirmation instantanée

**Dépendances techniques :**
- API SMS (Twilio, OVH, etc.)
- Queue de messages
- Table `sms_logs`

**Développement estimé :** 3-4 jours

---

### 12. **Reporting & Analytics**
**Statut :** ❌ Non implémenté
**Complexité :** ⭐⭐⭐⭐ Avancé
**Tarif suggéré :** 50€/mois

**Fonctionnalités à développer :**
- Dashboard KPIs (CA, nb interventions, taux conversion)
- Graphiques évolution CA
- Analyse par technicien/type intervention
- Comparaison périodes
- Export rapports Excel/PDF
- Prévisions CA

**Valeur ajoutée :**
- Pilotage activité en temps réel
- Détection tendances
- Aide à la décision

**Dépendances techniques :**
- Vues PostgreSQL pour agrégations
- Librairie charts (Recharts, Chart.js)
- Calculs statistiques

**Développement estimé :** 7-10 jours

---

### 13. **Multi-utilisateurs & Rôles**
**Statut :** ⚙️ Base implémentée (Supabase Auth)
**Complexité :** ⭐⭐⭐⭐⭐ Complexe
**Tarif suggéré :** 60€/mois (jusqu'à 5 utilisateurs, puis 15€/user additionnel)

**Fonctionnalités à développer :**
- ⚙️ Gestion rôles (admin, technicien, commercial, comptable)
- ⚙️ Permissions granulaires par module
- ⚙️ Assignation interventions par technicien
- ⚙️ Vue planning par utilisateur
- ⚙️ Logs actions utilisateurs
- ⚙️ Interface gestion équipe

**Valeur ajoutée :**
- Sécurité des données
- Collaboration équipe
- Traçabilité actions

**Dépendances techniques :**
- Supabase Auth (existe)
- Tables : `user_roles`, `permissions`
- RLS policies complexes

**Développement estimé :** 10-15 jours

---

## 🟠 MODULES ENTERPRISE (70-150€/mois)

### 14. **Paiements en ligne (Stripe)**
**Statut :** ❌ Non implémenté
**Complexité :** ⭐⭐⭐⭐⭐ Complexe
**Tarif suggéré :** 80€/mois + frais Stripe (1,4% + 0,25€)

**Fonctionnalités à développer :**
- Paiement en ligne sur facture
- Lien paiement envoyé par email/SMS
- Gestion acomptes et paiements fractionnés
- Réconciliation automatique paiements/factures
- Tableau de bord encaissements
- Gestion remboursements

**Valeur ajoutée :**
- Encaissement immédiat
- Réduction impayés : 80%
- Amélioration trésorerie

**Dépendances techniques :**
- Stripe API
- Webhooks Stripe pour confirmations
- Tables : `payments`, `payment_methods`

**Développement estimé :** 12-15 jours

---

### 15. **API Publique & Webhooks**
**Statut :** ❌ Non implémenté
**Complexité :** ⭐⭐⭐⭐⭐ Complexe
**Tarif suggéré :** 100€/mois

**Fonctionnalités à développer :**
- API REST complète (clients, interventions, factures)
- Authentification OAuth2 / API Keys
- Documentation Swagger
- Webhooks pour événements (nouvelle facture, intervention terminée)
- Rate limiting
- Logs API

**Valeur ajoutée :**
- Intégration avec outils tiers (ERP, CRM)
- Automatisations personnalisées
- Extension fonctionnalités

**Dépendances techniques :**
- Next.js API Routes
- Système authentification API
- Queue webhooks

**Développement estimé :** 15-20 jours

---

### 16. **Application Mobile Native**
**Statut :** ❌ Non implémenté (web responsive existe)
**Complexité :** ⭐⭐⭐⭐⭐ Très complexe
**Tarif suggéré :** 150€/mois

**Fonctionnalités à développer :**
- App iOS et Android (React Native)
- Mode offline pour interventions
- Scan QR code équipements
- Signature électronique client
- Géolocalisation et navigation
- Photos avant/après
- Notifications push

**Valeur ajoutée :**
- Mobilité techniciens terrain
- Saisie en temps réel
- Amélioration productivité : 30%

**Dépendances techniques :**
- React Native / Expo
- Stockage local (SQLite)
- Sync bidirectionnelle
- Push notifications (Firebase)

**Développement estimé :** 60-90 jours

---

## ⚪ MODULES ADDON (5-20€/mois)

### 17. **Signature Électronique**
**Statut :** ❌ Non implémenté
**Tarif suggéré :** 15€/mois

**Fonctionnalités :**
- Signature client sur devis/factures
- Signature technicien fin intervention
- Horodatage et certificat
- Stockage sécurisé signatures

**Développement estimé :** 3-4 jours

---

### 18. **Gestion Documents (Drive)**
**Statut :** ❌ Non implémenté
**Tarif suggéré :** 10€/mois

**Fonctionnalités :**
- Upload documents par client/intervention
- Photos avant/après
- Certificats, garanties
- Recherche documents
- Partage sécurisé

**Développement estimé :** 5-7 jours

---

### 19. **Planning Automatique (IA)**
**Statut :** ❌ Non implémenté
**Tarif suggéré :** 70€/mois

**Fonctionnalités :**
- Optimisation tournées techniciens
- Suggestion créneaux horaires
- Prise en compte géolocalisation
- Calcul temps trajet

**Développement estimé :** 20-30 jours

---

### 20. **Contrats de Maintenance Récurrents**
**Statut :** ❌ Non implémenté
**Tarif suggéré :** 20€/mois

**Fonctionnalités :**
- Création contrats mensuels/annuels
- Génération auto interventions récurrentes
- Facturation automatique
- Gestion renouvellements

**Développement estimé :** 7-10 jours

---

## 💰 Grille Tarifaire Suggérée

### Formules Packagées

| Formule | Modules inclus | Prix/mois | Économie |
|---------|---------------|-----------|----------|
| **STARTER** | Core + Calendrier + Facturation + PDF | 79€ | - |
| **PROFESSIONAL** | Starter + Emails + Prospects + Import + Stock | 149€ | 20€ |
| **ENTERPRISE** | Professional + SMS + Reporting + Multi-users + Paiements | 299€ | 80€ |
| **CUSTOM** | À la carte selon besoins | Variable | - |

### Modules à la Carte

| Module | Prix standalone | Avec formule |
|--------|----------------|--------------|
| Calendrier | 15€/mois | Inclus Starter+ |
| Facturation | 25€/mois | Inclus Starter+ |
| PDF | 10€/mois | Inclus Starter+ |
| Emails | 15€/mois | Inclus Pro+ |
| Prospects | 20€/mois | Inclus Pro+ |
| Stock | 40€/mois | Inclus Pro+ |
| SMS | 35€/mois + usage | Inclus Enterprise |
| Reporting | 50€/mois | Inclus Enterprise |
| Multi-users | 60€/mois base | Inclus Enterprise |
| Paiements en ligne | 80€/mois + frais | Inclus Enterprise |
| API | 100€/mois | Sur demande |
| Mobile App | 150€/mois | Sur demande |

---

## 🎯 Profils Clients Cibles

### 1. **Pisciniste Solo / Petit Artisan**
**Formule recommandée :** STARTER (79€/mois)
- 1-2 techniciens
- 50-100 interventions/mois
- Besoin facturation simple + planning

**ROI :** Économie 5h/semaine admin = 1000€/mois

---

### 2. **Entreprise de Services 5-10 employés**
**Formule recommandée :** PROFESSIONAL (149€/mois)
- Pipeline commercial actif
- Besoin gestion stock
- Communication client automatisée

**ROI :** +15% conversions prospects = 2500€/mois

---

### 3. **Groupe Multi-sites / Franchise**
**Formule recommandée :** ENTERPRISE (299€/mois)
- Gestion équipe complexe
- Besoins reporting consolidé
- Paiements en ligne critiques

**ROI :** -20% impayés + optimisation planning = 8000€/mois

---

## 📈 Calcul de Rentabilité (Votre Côté)

### Coûts Infrastructure par Client

| Poste | Coût mensuel |
|-------|--------------|
| Supabase Pro | 25€ (jusqu'à 100k rows) |
| Gotenberg (auto-hébergé) | 5€ (VPS) |
| Resend (1000 emails) | 10€ |
| Hébergement Next.js | 10€ (Vercel/Railway) |
| **Total infrastructure** | **50€/client** |

### Marges Nettes Estimées

| Formule | Prix | Coût infra | Marge brute | % marge |
|---------|------|------------|-------------|---------|
| Starter | 79€ | 50€ | **29€** | 37% |
| Professional | 149€ | 60€ | **89€** | 60% |
| Enterprise | 299€ | 80€ | **219€** | 73% |

**Seuil de rentabilité :** 15 clients (mix 50% Starter, 30% Pro, 20% Enterprise)
**Revenus mensuels :** ~2100€
**Marge nette :** ~1200€/mois

---

## 🚀 Roadmap Développement

### Phase 1 - Stabilisation (Mois 1-2)
- ✅ Tous modules Core finalisés
- ✅ Tests complets
- ✅ Documentation utilisateur
- ✅ Onboarding automatisé

### Phase 2 - Premium Features (Mois 3-4)
- Stock avancé
- SMS notifications
- Reporting basique

### Phase 3 - Enterprise (Mois 5-8)
- Multi-utilisateurs complet
- Paiements Stripe
- API publique

### Phase 4 - Innovation (Mois 9-12)
- App mobile
- IA planning
- Modules sectoriels

---

## 📞 Support & Maintenance

### Niveaux de Support Suggérés

| Niveau | Inclus | Prix |
|--------|--------|------|
| **Community** | Forum, docs | Gratuit |
| **Standard** | Email (48h) | +30€/mois |
| **Priority** | Email (24h) + Chat | +80€/mois |
| **Dedicated** | Téléphone + Manager dédié | +200€/mois |

---

## ✅ Points Forts de l'Offre

1. **White Label Complet** - Chaque client a son branding
2. **Modulaire** - Pay only what you need
3. **Conforme Légal FR** - Factures aux normes
4. **Scalable** - De 1 à 100+ utilisateurs
5. **Tech Moderne** - Next.js 14, PostgreSQL, Docker
6. **Sécurisé** - RLS, authentification, RGPD compliant
7. **Mobile-First** - Responsive parfait
8. **Intégrations** - Google, n8n, extensible

---

**Prochains documents :**
1. 📊 Présentation Commerciale (Pitch Deck)
2. 🛠️ Guide Déploiement Client
3. 📘 Documentation Technique Complète

---

*Document créé le 29 octobre 2025 - Version 1.0*
