// Lazy loaded components avec code splitting
import dynamic from 'next/dynamic';
import {
  FormSkeleton,
  SelectorSkeleton,
  PhotoCaptureSkeleton,
  PoolFormSkeleton,
  CardSkeleton
} from '../ui/Skeletons';

// ========================================
// 🔥 COMPOSANTS LOURDS (lazy loading)
// ========================================

export const InterventionFormLazy = dynamic(
  () => import('../interventions/InterventionForm').then(mod => ({ default: mod.InterventionForm })),
  {
    loading: () => <FormSkeleton />,
    ssr: false, // Client-side only (formulaire avec state complexe)
  }
);

export const ProductSelectorLazy = dynamic(
  () => import('../interventions/ProductSelector').then(mod => ({ default: mod.ProductSelector })),
  {
    loading: () => <SelectorSkeleton />,
    ssr: false,
  }
);

export const TaskTemplateSelectorLazy = dynamic(
  () => import('../interventions/TaskTemplateSelector').then(mod => ({ default: mod.TaskTemplateSelector })),
  {
    loading: () => <SelectorSkeleton />,
    ssr: false,
  }
);

export const PhotoCaptureLazy = dynamic(
  () => import('../interventions/PhotoCapture').then(mod => ({ default: mod.PhotoCapture })),
  {
    loading: () => <PhotoCaptureSkeleton />,
    ssr: false, // Camera API nécessite le client
  }
);

export const PoolFormLazy = dynamic(
  () => import('../pools/PoolForm').then(mod => ({ default: mod.PoolForm })),
  {
    loading: () => <PoolFormSkeleton />,
    ssr: false,
  }
);

export const PoolSelectorLazy = dynamic(
  () => import('../pools/PoolSelector').then(mod => ({ default: mod.PoolSelector })),
  {
    loading: () => <SelectorSkeleton />,
    ssr: false,
  }
);

export const ClientPhotosLazy = dynamic(
  () => import('../clients/ClientPhotos').then(mod => ({ default: mod.ClientPhotos })),
  {
    loading: () => <PhotoCaptureSkeleton />,
    ssr: false,
  }
);

export const ClientSearchLazy = dynamic(
  () => import('../clients/ClientSearch').then(mod => ({ default: mod.ClientSearch })),
  {
    loading: () => <FormSkeleton />,
    ssr: false,
  }
);

// ========================================
// 💡 COMPOSANTS MOYENS (lazy avec SSR)
// ========================================

export const InterventionCardLazy = dynamic(
  () => import('../interventions/InterventionCard').then(mod => ({ default: mod.InterventionCard })),
  {
    loading: () => <CardSkeleton />,
    ssr: true, // Peut être rendu côté serveur
  }
);

export const InterventionTypeSelectorLazy = dynamic(
  () => import('../interventions/InterventionTypeSelector').then(mod => ({ default: mod.InterventionTypeSelector })),
  {
    loading: () => <SelectorSkeleton />,
    ssr: true,
  }
);
