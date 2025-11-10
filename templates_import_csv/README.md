# 📦 Templates CSV pour import de données

## 📁 Fichiers disponibles

| Fichier | Description | Colonnes |
|---------|-------------|----------|
| `template_produits.csv` | Catalogue produits (chimie, équipements) | 6 colonnes |
| `template_prestations.csv` | Templates de prestations récurrentes | 5 colonnes |
| `template_types_piscines.csv` | Types/catégories de piscines | 3 colonnes |
| `template_clients.csv` | Base clients (particuliers/pros) | 11 colonnes |

## 🚀 Utilisation rapide

### 1. Télécharger le template souhaité
- Cliquez sur le fichier
- Téléchargez-le

### 2. Remplir avec vos données
- Ouvrez avec Excel, Google Sheets ou LibreOffice
- Supprimez les lignes d'exemple (#)
- Ajoutez vos données

### 3. Enregistrer en CSV
- **Séparateur :** Point-virgule (;)
- **Encodage :** UTF-8
- **Extension :** .csv

### 4. Importer dans l'application
- Allez sur `/dashboard/admin/import`
- Uploadez le fichier
- Lancez l'import

## ⚠️ Important

### Pour les produits
**Récupérez d'abord les UUIDs de catégories :**
1. Allez sur `/dashboard/admin/categories`
2. Cliquez sur 📋 Copier pour chaque catégorie
3. Remplacez `REMPLACER-PAR-UUID-CATEGORIE` dans le CSV

### Format général
- ✅ Séparateur : `;` (point-virgule)
- ✅ Encodage : UTF-8
- ✅ Pas de guillemets sauf si nécessaire
- ❌ Ne pas utiliser `;` dans les valeurs

## 📚 Documentation complète

Consultez `../docs/GUIDE_IMPORT_DONNEES_CLIENT.md` pour :
- Descriptions détaillées des colonnes
- Valeurs valides pour chaque champ
- Résolution de problèmes
- Exemples avancés

## 💡 Conseils

1. **Testez avec peu de données d'abord** (5-10 lignes)
2. **Créez les catégories avant les produits**
3. **Gardez une copie de vos fichiers**
4. **Vérifiez l'encodage UTF-8**

## 📞 Support

Questions ? Contactez :
- 📧 support@delmas-piscine.fr
- 📞 06 87 84 24 99
