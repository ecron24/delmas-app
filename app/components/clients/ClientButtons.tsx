'use client';

import { useRouter } from 'next/navigation';

type NewInterventionButtonProps = {
  clientId: string;
};

export function NewInterventionButton({ clientId }: NewInterventionButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/dashboard/interventions/new?client=${clientId}`)}
      className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-xl font-bold shadow-lg hover:from-green-700 hover:to-green-600 transition-all flex items-center justify-center gap-2"
    >
      <span className="text-xl">➕</span>
      <span className="text-base">Nouvelle intervention</span>
    </button>
  );
}

type ClientEditButtonProps = {
  clientId: string;
};

export function ClientEditButton({ clientId }: ClientEditButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/dashboard/clients/${clientId}/edit`)}
      className="px-3 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm flex items-center gap-1 shrink-0"
    >
      <span>✏️</span>
      <span className="hidden sm:inline">Modifier</span>
    </button>
  );
}
