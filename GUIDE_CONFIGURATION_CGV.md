# 📋 Guide de Configuration des CGV et Mentions Légales

## 🎯 Objectif

Ce guide vous explique comment configurer les Conditions Générales de Vente (CGV) et les mentions légales qui s'afficheront automatiquement en bas de vos factures proforma et factures finales.

## 📍 Où configurer les CGV ?

Allez dans : **Dashboard → Paramètres → Configuration entreprise**
URL directe : `/dashboard/settings/company`

## 📝 Champs à remplir

### 1️⃣ Note de bas de page (facture) ⭐ OBLIGATOIRE

**Exemple :**
```
Conditions de paiement : règlement sous 30 jours à compter de la date d'émission.
Paiement par chèque, virement bancaire ou espèces.
TVA non applicable, art. 293 B du CGI.
```

**Utilisation :** S'affiche en bas de chaque facture comme note contextuelle.

---

### 2️⃣ Mentions légales obligatoires ⭐ OBLIGATOIRE

**Exemple minimal (requis par la loi) :**
```
En cas de retard de paiement, seront exigibles conformément à l'article L441-6 du Code de Commerce :
- Une indemnité forfaitaire de 40€ pour frais de recouvrement
- Des pénalités de retard calculées sur la base du taux d'intérêt appliqué par la Banque Centrale Européenne à son opération de refinancement la plus récente majoré de 10 points de pourcentage (actuellement 12% par an)

Tout règlement effectué après la date d'échéance portera de plein droit intérêt à ce taux sans qu'aucun rappel ne soit nécessaire.

Clause de réserve de propriété : Les marchandises vendues demeurent la propriété du vendeur jusqu'au paiement intégral du prix en principal et accessoires.
```

**Note :** Ces mentions sont **obligatoires** selon le Code de Commerce français.

---

### 3️⃣ Conditions générales de vente complètes (OPTIONNEL)

**Exemple de structure :**
```
CONDITIONS GÉNÉRALES DE VENTE

Article 1 - Objet
Les présentes conditions générales de vente (CGV) régissent les relations contractuelles entre PISCINE DELMAS et ses clients professionnels ou particuliers.

Article 2 - Prix
Les prix s'entendent en euros et sont applicables aux travaux effectués. Ils sont fermes et définitifs pour la durée du devis.

Article 3 - Modalités de paiement
Le règlement s'effectue :
- Par chèque à l'ordre de PISCINE DELMAS
- Par virement bancaire (RIB fourni sur demande)
- En espèces dans la limite de 1 000€

Article 4 - Garanties
Les travaux sont garantis selon les normes en vigueur :
- Garantie décennale : [n° police d'assurance]
- Garantie biennale : équipements et matériaux

Article 5 - Responsabilité
Notre responsabilité ne saurait être engagée en cas de défaut résultant d'une mauvaise utilisation ou d'un défaut d'entretien.

Article 6 - Réclamations
Toute réclamation doit être adressée par lettre recommandée avec accusé de réception dans les 8 jours suivant la réalisation des travaux.

Article 7 - Protection des données
Conformément à la loi Informatique et Libertés du 6 janvier 1978, vous disposez d'un droit d'accès, de rectification et de suppression des données vous concernant.

Article 8 - Droit applicable
Les présentes CGV sont soumises au droit français. Tout litige sera porté devant les tribunaux compétents.
```

**Usage :** Peut être ajouté en annexe des devis. Optionnel pour les factures.

---

## ✅ Exemple complet de configuration

### Informations entreprise :
- **Nom :** PISCINE DELMAS
- **SIRET :** 483 093 118
- **TVA :** FR38483093118
- **Adresse :** Le bois Simon (les linguettes), 24370 Pechs de l'Espérance
- **Email :** contact@piscine-delmas.fr
- **Téléphone :** 06 87 84 24 99

### Paramètres de facturation :
- **Délai de paiement :** 30 jours
- **Taux pénalités :** 12% (3 × taux BCE)
- **Indemnité forfaitaire :** 40€

### Mentions légales (texte recommandé) :
```
MODALITÉS DE RÈGLEMENT
Paiement sous 30 jours à compter de la date d'émission.
Paiement accepté par chèque, virement bancaire ou espèces (limite 1000€).

PÉNALITÉS DE RETARD
En cas de retard de paiement, seront exigibles conformément à l'article L441-6 du Code de Commerce :
• Indemnité forfaitaire de recouvrement : 40€
• Pénalités de retard : 12% par an (taux BCE + 10 points)
  calculées à compter de la date d'échéance jusqu'au paiement effectif

Tout règlement effectué après échéance portera intérêt de plein droit, sans rappel nécessaire.

CLAUSE DE RÉSERVE DE PROPRIÉTÉ
Les marchandises demeurent la propriété du vendeur jusqu'au paiement intégral du prix.

TVA
TVA non applicable, article 293 B du Code Général des Impôts.

GARANTIES
• Garantie décennale : [N° police d'assurance]
• Garantie biennale : équipements et matériaux installés
• Garantie de parfait achèvement : 1 an

RÉCLAMATIONS
Toute réclamation doit être formulée par lettre recommandée avec AR dans les 8 jours suivant la réalisation des travaux.

DONNÉES PERSONNELLES
Conformément au RGPD et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles.

JURIDICTION COMPÉTENTE
En cas de litige, le tribunal compétent sera celui du siège social de l'entreprise.
```

---

## 🚀 Après configuration

Une fois sauvegardé, ces informations apparaîtront automatiquement :

✅ **Sur toutes les factures proforma** (mode édition)
✅ **Sur toutes les factures finales** (envoyées au client)
✅ **Dans les exports PDF**
✅ **Dans les impressions**

---

## ⚠️ Important

1. **Mentions obligatoires** : Les pénalités de retard et l'indemnité forfaitaire sont **obligatoires par la loi**
2. **Mise à jour** : Pensez à mettre à jour si vous changez de délai de paiement ou de taux
3. **Vérification** : Testez en créant une facture proforma et en l'imprimant pour vérifier le rendu

---

## 📞 Besoin d'aide ?

Si vous avez besoin d'aide pour personnaliser vos CGV, consultez un avocat spécialisé en droit commercial.

**Références légales :**
- Article L441-6 du Code de Commerce (pénalités de retard)
- Article 293 B du CGI (TVA)
- Loi Informatique et Libertés / RGPD (protection des données)
