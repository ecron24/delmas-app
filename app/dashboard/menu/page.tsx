'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function MenuPage() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const menuItems = [
    {
      section: 'Administration',
      items: [
        {
          icon: '📊',
          title: 'Import données',
          description: 'Importer produits, templates, piscines, clients',
          path: '/dashboard/admin/import',
          color: 'blue',
        },
        {
          icon: '🗂️',
          title: 'Catégories produits',
          description: 'Consulter les UUIDs des catégories',
          path: '/dashboard/admin/categories',
          color: 'purple',
        },
      ],
    },
    {
      section: 'Gestion',
      items: [
        {
          icon: '👥',
          title: 'Clients',
          description: 'Rechercher et consulter les clients',
          path: '/dashboard/clients',
          color: 'green',
        },
        {
          icon: '📋',
          title: 'Interventions',
          description: 'Toutes les fiches d\'intervention',
          path: '/dashboard/interventions',
          color: 'orange',
        },
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ⚙️ Menu
        </h1>
        <p className="text-gray-600">
          Accès rapide aux fonctionnalités
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {menuItems.map((section) => (
          <div key={section.section}>
            <h2 className="text-lg font-bold text-gray-700 mb-4">
              {section.section}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.items.map((item) => (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`text-left p-6 rounded-xl border-2 transition-all hover:shadow-lg hover:scale-105 bg-white border-${item.color}-200 hover:border-${item.color}-500`}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-4xl">{item.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg mb-1">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {item.description}
                      </p>
                    </div>
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Déconnexion */}
      <div className="mt-12 pt-8 border-t-2 border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-red-700 transition-all"
        >
          🚪 Se déconnecter
        </button>
      </div>
    </div>
  );
}
