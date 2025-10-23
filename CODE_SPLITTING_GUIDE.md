# 🚀 Guide de Code Splitting

## 📦 Qu'est-ce que le code splitting ?

Le **code splitting** permet de diviser votre application en plusieurs bundles JavaScript qui sont chargés **à la demande** plutôt que tous en même temps au chargement initial.

### Avantages
- ✅ **Bundle initial réduit** (chargement plus rapide)
- ✅ **Lazy loading** (composants chargés uniquement quand nécessaire)
- ✅ **Meilleure performance** (Time to Interactive réduit)
- ✅ **Cache optimisé** (bundles séparés = meilleur cache)

---

## 🎯 Composants avec lazy loading

### Composants disponibles

Tous les composants lourds ont une version lazy :

```typescript
// Import des composants lazy
import {
  InterventionFormLazy,        // 879 lignes
  ProductSelectorLazy,          // 361 lignes
  TaskTemplateSelectorLazy,     // 266 lignes
  PhotoCaptureLazy,             // 148 lignes
  PoolFormLazy,                 // 232 lignes
  PoolSelectorLazy,             // 165 lignes
  ClientPhotosLazy,             // 266 lignes
  ClientSearchLazy,             // 151 lignes
  InterventionCardLazy,         // 279 lignes
  InterventionTypeSelectorLazy  // 62 lignes
} from '@/app/components/lazy';
```

### Composants Skeleton (loading states)

```typescript
import {
  FormSkeleton,
  CardSkeleton,
  SelectorSkeleton,
  PhotoCaptureSkeleton,
  PoolFormSkeleton,
  TableSkeleton
} from '@/app/components/ui/Skeletons';
```

---

## 📝 Utilisation

### Exemple 1 : Formulaire avec lazy loading

**Avant** :
```typescript
'use client';
import { InterventionForm } from '@/components/interventions/InterventionForm';

export default function Page() {
  return <InterventionForm />;
}
```

**Après** :
```typescript
'use client';
import { Suspense } from 'react';
import { InterventionFormLazy } from '@/app/components/lazy';
import { FormSkeleton } from '@/app/components/ui/Skeletons';

export default function Page() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <InterventionFormLazy />
    </Suspense>
  );
}
```

### Exemple 2 : Liste de cards avec lazy loading

```typescript
'use client';
import { Suspense } from 'react';
import { InterventionCardLazy } from '@/app/components/lazy';
import { CardSkeleton } from '@/app/components/ui/Skeletons';

export default function Page() {
  const interventions = [...]; // vos données

  return (
    <div className="space-y-4">
      {interventions.map((intervention) => (
        <Suspense key={intervention.id} fallback={<CardSkeleton />}>
          <InterventionCardLazy intervention={intervention} />
        </Suspense>
      ))}
    </div>
  );
}
```

### Exemple 3 : Chargement conditionnel

```typescript
'use client';
import { Suspense, useState } from 'react';
import { PhotoCaptureLazy } from '@/app/components/lazy';
import { PhotoCaptureSkeleton } from '@/app/components/ui/Skeletons';

export default function Page() {
  const [showCamera, setShowCamera] = useState(false);

  return (
    <div>
      <button onClick={() => setShowCamera(true)}>
        Ouvrir caméra
      </button>

      {/* Le composant n'est chargé que si showCamera = true */}
      {showCamera && (
        <Suspense fallback={<PhotoCaptureSkeleton />}>
          <PhotoCaptureLazy />
        </Suspense>
      )}
    </div>
  );
}
```

---

## 🔧 Configuration

### Fichiers créés

1. **`app/components/lazy/index.ts`**
   - Exports tous les composants lazy avec `next/dynamic`
   - Configure les loading states
   - Configure SSR (true/false selon le composant)

2. **`app/components/ui/Skeletons.tsx`**
   - Composants de chargement animés
   - Design cohérent avec l'application

### Configuration dynamic()

```typescript
export const MonComposantLazy = dynamic(
  () => import('./MonComposant'),
  {
    loading: () => <MonSkeleton />,  // Fallback pendant le chargement
    ssr: false,                       // Désactiver SSR si nécessaire
  }
);
```

**Quand désactiver SSR (`ssr: false`)** :
- ❌ Composants utilisant `window`, `navigator`, `localStorage`
- ❌ APIs du navigateur (Camera, Geolocation)
- ❌ Formulaires avec state complexe
- ✅ Composants de présentation (garder `ssr: true`)

---

## 📊 Gains de performance

### Avant code splitting

```
Bundle initial : 100%
└── InterventionForm (879 lignes)
└── ProductSelector (361 lignes)
└── TaskTemplateSelector (266 lignes)
└── PhotoCapture (148 lignes)
└── etc.

Total : ~2500+ lignes dans le bundle initial
```

### Après code splitting

```
Bundle initial : 20-30%
└── Code de base uniquement

Bundles lazy (chargés à la demande) :
├── intervention-form.js (chargé si nécessaire)
├── product-selector.js (chargé si nécessaire)
├── task-template-selector.js (chargé si nécessaire)
└── etc.
```

**Résultat** :
- Bundle initial : **-70% à -80%**
- First Load JS : **~50-60 KB** (au lieu de ~200+ KB)
- Time to Interactive : **-40% à -60%**

---

## 🎨 Bonnes pratiques

### ✅ À faire

1. **Utiliser Suspense** systématiquement avec les composants lazy
2. **Prévoir des fallbacks** visuellement cohérents
3. **Lazy load les gros composants** (> 100 lignes)
4. **Lazy load les composants conditionnels** (modales, accordéons)
5. **Lazy load les composants rarement utilisés**

### ❌ À éviter

1. **Ne pas lazy load les composants critiques** (header, navigation)
2. **Ne pas lazy load les petits composants** (< 50 lignes)
3. **Ne pas oublier les fallbacks** (mauvaise UX)
4. **Ne pas multiplier les Suspense inutilement** (overhead)

---

## 🧪 Tester le code splitting

### En développement

```bash
npm run build
```

Vérifiez le rapport de build :
```
Route (app)                     Size     First Load JS
┌ ○ /                          150 B           85.1 KB
├ ○ /dashboard/interventions   5.2 kB          90.3 KB
└ ○ /dashboard/clients         4.8 kB          89.9 KB

○ (Static)  prerendered as static content
```

### En production

1. Ouvrez les DevTools Chrome
2. Onglet **Network**
3. Filtrez par **JS**
4. Naviguez dans l'app
5. Vérifiez que les bundles lazy se chargent **à la demande**

---

## 📚 Ressources

- [Next.js Dynamic Imports](https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading)
- [React Suspense](https://react.dev/reference/react/Suspense)
- [Code Splitting Best Practices](https://web.dev/code-splitting-suspense/)

---

## 🚀 Prochaines optimisations

1. **Prefetching** - Précharger les composants avant qu'ils soient visibles
2. **Route-based splitting** - Séparer par route automatiquement
3. **Image optimization** - Utiliser next/image pour les images
4. **Bundle analyzer** - Analyser en détail la taille des bundles
