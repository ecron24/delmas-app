# 📊 Guide d'Import de Données - Delmas Piscine SaaS

## 🎯 Vue d'ensemble

Ce guide permet à vos clients SaaS d'importer leurs données existantes dans l'application Delmas Piscine.

**4 types d'import disponibles :**
1. 🛒 **Produits** - Catalogue de produits chimiques, équipements, etc.
2. 📋 **Templates de prestations** - Services récurrents (entretien, hivernage, etc.)
3. 🏊 **Types de piscines** - Catégories de piscines gérées
4. 👥 **Clients** - Base clients (particuliers et professionnels)

---

## 🔐 Accès à la fonctionnalité

**URL :** `/dashboard/admin/import`

**Prérequis :**
- Compte administrateur
- Fichiers CSV préparés selon les formats ci-dessous

---

## 📄 Formats CSV détaillés

### Format général
- **Séparateur :** Point-virgule `;`
- **Encodage :** UTF-8
- **Extension :** `.csv` ou `.txt`
- **Lignes de commentaire :** Commencent par `#` (ignorées)

---

## 1️⃣ Import PRODUITS 🛒

### Colonnes requises

| Colonne | Type | Obligatoire | Description | Exemple |
|---------|------|-------------|-------------|---------|
| `nom` | Texte | ✅ | Nom du produit | Chlore choc 5kg |
| `reference` | Texte | ✅ | SKU/Référence unique | CHLORE-001 |
| `category_id` | UUID | ✅ | ID catégorie (voir section Catégories) | a1b2c3d4-... |
| `prix` | Nombre | ✅ | Prix de vente HT | 45.00 |
| `unite` | Texte | ✅ | Unité de mesure | kg, L, boite, unité |
| `description` | Texte | ❌ | Description détaillée | Désinfectant rapide |

### ⚠️ Important : Récupérer les IDs de catégories

**Avant d'importer les produits :**
1. Allez sur `/dashboard/admin/categories`
2. Créez vos catégories (ex: "Produits chimiques", "Équipements")
3. Cliquez sur **📋 Copier** pour chaque catégorie
4. Collez les UUID dans votre fichier CSV

### Exemple CSV

```csv
# IMPORT PRODUITS - Delmas Piscine
# Format: nom;reference;category_id;prix;unite;description
#
Chlore choc 5kg;CHLORE-001;a1b2c3d4-e5f6-7890-abcd-ef1234567890;45.00;kg;Désinfectant rapide action choc
pH minus 1L;PH-002;a1b2c3d4-e5f6-7890-abcd-ef1234567890;12.00;L;Réducteur pH pour eau alcaline
Floculant 5L;FLOC-003;a1b2c3d4-e5f6-7890-abcd-ef1234567890;28.00;L;Clarifiant eau trouble
Anti-algues 2L;ALGUE-004;a1b2c3d4-e5f6-7890-abcd-ef1234567890;22.00;L;Traitement préventif algues
Bandelettes test;TEST-005;b2c3d4e5-f6g7-8901-bcde-fg2345678901;15.00;boite;Analyse pH et Chlore 50 bandelettes
Brosse aspirateur;BROSSE-006;b2c3d4e5-f6g7-8901-bcde-fg2345678901;35.00;unité;Brosse compatible aspirateur piscine
Robot nettoyeur;ROBOT-007;b2c3d4e5-f6g7-8901-bcde-fg2345678901;450.00;unité;Robot électrique autonome fond et parois
```

---

## 2️⃣ Import TEMPLATES DE PRESTATIONS 📋

### Colonnes requises

| Colonne | Type | Obligatoire | Description | Exemple |
|---------|------|-------------|-------------|---------|
| `nom` | Texte | ✅ | Nom de la prestation | Nettoyage complet |
| `categorie` | Texte | ✅ | Type (voir liste ci-dessous) | maintenance |
| `description` | Texte | ❌ | Description détaillée | Nettoyage fond parois |
| `duree` | Nombre | ✅ | Durée estimée en heures | 2.5 |
| `prix` | Nombre | ✅ | Prix de base HT | 125.00 |

### Catégories valides

| Code | Label |
|------|-------|
| `maintenance` | Entretien |
| `repair` | Réparation |
| `installation` | Installation |
| `emergency` | Urgence |
| `diagnostic` | Diagnostic |
| `cleaning` | Nettoyage |
| `winterization` | Hivernage |
| `startup` | Remise en service |
| `other` | Autre |

### Exemple CSV

```csv
# IMPORT TEMPLATES PRESTATIONS - Delmas Piscine
# Format: nom;categorie;description;duree;prix
#
Nettoyage complet;maintenance;Nettoyage fond parois et ligne eau;2.5;125.00
Hivernage actif;winterization;Préparation piscine pour hiver avec surveillance;3.0;150.00
Diagnostic panne;diagnostic;Diagnostic complet équipement et analyse;1.5;75.00
Changement filtre;maintenance;Remplacement média filtrant sable ou cartouche;2.0;100.00
Mise en service;startup;Remise en route complète après hivernage;3.0;150.00
Réparation pompe;repair;Intervention réparation pompe de filtration;2.5;125.00
Entretien hebdo;maintenance;Entretien hebdomadaire standard;1.0;50.00
Traitement choc;maintenance;Traitement choc complet avec produits;1.5;75.00
Réparation fuite;repair;Détection et réparation fuite structure;4.0;200.00
Installation éclairage LED;installation;Pose spots LED immergés étanches;3.5;175.00
```

---

## 3️⃣ Import TYPES DE PISCINES 🏊

### Colonnes requises

| Colonne | Type | Obligatoire | Description | Exemple |
|---------|------|-------------|-------------|---------|
| `nom` | Texte | ✅ | Nom du type | Piscine enterrée béton |
| `description` | Texte | ❌ | Description | Construction maçonnée durable |
| `volume` | Nombre | ❌ | Volume moyen en m³ | 45 |

### Exemple CSV

```csv
# IMPORT TYPES PISCINES - Delmas Piscine
# Format: nom;description;volume
#
Piscine enterrée béton;Construction maçonnée entièrement personnalisable durable;45
Piscine acier;Installation rapide structure modulaire robuste en kit;35
Piscine naturelle;Écosystème végétalisé zone baignade équilibrée écologique;60
Piscine coque polyester;Coque monobloc installation rapide garantie étanchéité;30
Piscine hors-sol;Installation temporaire ou permanente économique;20
Piscine bois;Structure bois esthétique intégration naturelle jardin;25
Piscine couloir nage;Bassin sportif dimensions optimisées natation;40
Piscine débordement;Système débordement effet miroir luxe esthétique;50
Bassin biologique;Filtration naturelle plantes lagunage écologique;55
Piscine intérieure;Bassin couvert chauffé usage annuel confort;35
```

---

## 4️⃣ Import CLIENTS 👥

### Colonnes requises

| Colonne | Type | Obligatoire | Description | Exemple |
|---------|------|-------------|-------------|---------|
| `type` | Texte | ✅ | particulier ou professionnel | particulier |
| `prenom` | Texte | ✅ | Prénom | Jean |
| `nom` | Texte | ✅ | Nom | Dupont |
| `entreprise` | Texte | ❌ | Nom société (si pro) | Hôtel des Palmiers |
| `email` | Email | ❌ | Email | jean.dupont@email.com |
| `telephone` | Texte | ❌ | Téléphone fixe | 0123456789 |
| `mobile` | Texte | ❌ | Mobile | 0612345678 |
| `adresse` | Texte | ❌ | Adresse complète | 15 rue de la Piscine |
| `code_postal` | Texte | ❌ | Code postal | 75001 |
| `ville` | Texte | ❌ | Ville | Paris |
| `notes` | Texte | ❌ | Notes internes | Client depuis 2020 |

### Exemple CSV

```csv
# IMPORT CLIENTS - Delmas Piscine
# Format: type;prenom;nom;entreprise;email;telephone;mobile;adresse;code_postal;ville;notes
#
particulier;Jean;Dupont;;jean.dupont@email.com;0123456789;0612345678;15 rue de la Piscine;75001;Paris;Client depuis 2020
professionnel;Marie;Martin;Hôtel des Palmiers;contact@hotel.com;0198765432;0687654321;25 avenue de la Plage;06000;Nice;Piscine 15x7m
particulier;Pierre;Bernard;;pierre.b@email.com;0145678912;;8 impasse du Lac;33000;Bordeaux;
professionnel;Sophie;Dubois;Camping Les Pins;camping@lespins.fr;0256781234;0623456789;10 chemin des Vacances;40000;Mont-de-Marsan;3 piscines
particulier;Luc;Moreau;;luc.moreau@email.com;;0634567890;22 allée des Fleurs;13000;Marseille;Piscine 8x4m
particulier;Julie;Roux;;julie.roux@email.com;0312345678;0645678901;5 rue du Soleil;69000;Lyon;Client fidèle
professionnel;Thomas;Petit;Résidence Les Jardins;residence@jardins.fr;0423456789;0656789012;30 avenue Verte;06400;Cannes;Copropriété 2 piscines
particulier;Emma;Blanc;;emma.blanc@email.com;0534567890;;18 rue Bleue;31000;Toulouse;Nouveau client
```

---

## 📥 Procédure d'import

### Étape 1 : Préparer le fichier

1. **Créer le fichier dans Excel / Google Sheets**
   - Saisir les données selon le format
   - Colonnes séparées par des tabulations

2. **Enregistrer en CSV**
   - **Excel :** "Enregistrer sous" → CSV (délimiteur : point-virgule)
   - **Google Sheets :** "Télécharger" → CSV (virgule) puis remplacer `,` par `;`
   - **LibreOffice :** Enregistrer → Format CSV → Séparateur `;`

3. **Vérifier l'encodage**
   - UTF-8 obligatoire
   - Ouvrir avec un éditeur de texte pour vérifier

### Étape 2 : Importer dans l'application

1. Se connecter à l'application
2. Aller sur `/dashboard/admin/import`
3. Sélectionner le type d'import
4. Cliquer sur **📥 Télécharger exemple** (optionnel)
5. Uploader le fichier CSV
6. Cliquer sur **🚀 Lancer l'import**
7. Vérifier le message de confirmation

### Étape 3 : Vérification

- **Produits :** `/dashboard/products`
- **Templates :** Créer une intervention → voir les templates
- **Types piscines :** Créer une piscine → voir les types
- **Clients :** `/dashboard/clients`

---

## 🚨 Résolution de problèmes

### Erreur : "category_id invalide"
→ Vérifiez que les UUIDs de catégories existent dans la base

### Erreur : "Format incorrect"
→ Assurez-vous que le séparateur est bien `;` (point-virgule)

### Erreur : "Encodage"
→ Enregistrez le fichier en UTF-8

### Import partiel
→ L'import se fait par batch de 50 lignes. Si erreur, corrigez et relancez.

### Doublons
→ Pour les produits, vérifiez que les `reference` sont uniques

---

## 💡 Conseils

### Pour un import réussi :

✅ **Testez avec 5-10 lignes d'abord**
- Validez le format avant d'importer 1000 lignes

✅ **Catégories en premier**
- Créez les catégories avant d'importer les produits

✅ **Nettoyez vos données**
- Supprimez les caractères spéciaux
- Vérifiez les emails
- Uniformisez les formats de téléphone

✅ **Gardez une copie**
- Sauvegardez le fichier original avant import

✅ **Import progressif**
- Produits → Clients → Templates → Types piscines

---

## 📞 Support

Pour toute question :
- 📧 Email : support@delmas-piscine.fr
- 📞 Téléphone : 06 87 84 24 99
- 📚 Documentation complète : `/docs`

---

**Version :** 1.0
**Dernière mise à jour :** Novembre 2025
**Compatibilité :** Delmas Piscine SaaS v2.0+
