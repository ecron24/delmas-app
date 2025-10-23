'use client';

import { useRouter } from 'next/navigation';

type EditButtonProps = {
  interventionId: string;
  variant?: 'primary' | 'secondary';
};

export function EditButton({ interventionId, variant = 'primary' }: EditButtonProps) {
  const router = useRouter();

  if (variant === 'primary') {
    return (
      <button
        onClick={() => router.push(`/dashboard/interventions/${interventionId}/edit`)}
        className="px-3 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm flex items-center gap-1 shrink-0"
      >
        <span>✏️</span>
        <span className="hidden sm:inline">Modifier</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => router.push(`/dashboard/interventions/${interventionId}/edit`)}
      className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all"
    >
      ✏️ Modifier la planification
    </button>
  );
}
