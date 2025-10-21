'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🏊</div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'interventions', label: 'Fiches', icon: '📋', path: '/dashboard/interventions' },
    { id: 'calendar', label: 'Calendrier', icon: '📅', path: '/dashboard/calendar' },
    { id: 'clients', label: 'Clients', icon: '👥', path: '/dashboard/clients' },
    { id: 'stats', label: 'Stats', icon: '📊', path: '/dashboard/stats' },
    { id: 'menu', label: 'Menu', icon: '⚙️', path: '/dashboard/menu' },
  ];

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-24">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-500 text-white sticky top-0 z-50 shadow-lg">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏊</span>
            <div>
              <h1 className="text-lg font-bold">Delmas Piscine</h1>
              <p className="text-xs text-blue-100">
                {user?.email?.split('@')[0]}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 hover:bg-blue-700 rounded-lg transition-colors active:scale-95"
            title="Déconnexion"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {children}
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50 shadow-lg">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => router.push(tab.path)}
              className={`flex-1 py-3 px-2 text-center transition-all active:scale-95 ${
                isActive(tab.path)
                  ? 'text-blue-600'
                  : 'text-gray-500'
              }`}
            >
              <div className="text-2xl mb-1">{tab.icon}</div>
              <div className="text-xs font-medium">{tab.label}</div>
            </button>
          ))}
        </div>
      </nav>

      {/* Tab Navigation (Tablet+) */}
      <nav className="hidden md:block bg-white border-b border-gray-200 sticky top-16 z-40 shadow-sm">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => router.push(tab.path)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-all ${
                  isActive(tab.path)
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
