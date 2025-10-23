'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export function InvoiceFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilter = searchParams.get('filter') || 'all';

  const handleFilterChange = (filter: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', filter);
    }
    router.push(`?${params.toString()}`);
  };

  const filters = [
    { value: 'all', label: 'Toutes' },
    { value: 'sent', label: 'En attente' },
    { value: 'paid', label: 'Payées' },
    { value: 'overdue', label: 'En retard' },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => handleFilterChange(f.value)}
          className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
            currentFilter === f.value
              ? 'bg-secondary text-white shadow-lg'
              : 'bg-white text-gray-700 border-2 border-gray-200'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
