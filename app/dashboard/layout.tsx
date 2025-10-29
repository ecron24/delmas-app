'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import {
  Calendar,
  Users,
  Wrench,
  Settings,
  LogOut,
  FileText,
  Upload,
  Menu,
  X,
  Target, // 🎯 Icône prospects
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.email?.split('@')[0] || 'Utilisateur');
      }
    };
    fetchUser();
  }, []);

  // Gestion du scroll quand le menu Plus est ouvert
  useEffect(() => {
    if (showMoreMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showMoreMenu]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  // 📱 Menu principal (bottom nav mobile/tablette) - 4 onglets + Plus
  const mainNavigation = [
    { name: 'Interventions', href: '/dashboard/interventions', icon: Wrench, label: 'Interv.' },
    { name: 'Calendrier', href: '/dashboard/calendar', icon: Calendar, label: 'Agenda' },
    { name: 'Clients', href: '/dashboard/clients', icon: Users, label: 'Clients' },
    { name: 'Prospects', href: '/dashboard/prospects', icon: Target, label: 'Prospects' }, // 🎯 NOUVEAU
  ];

  // Menu "Plus" - Fonctions secondaires
  const moreNavigation = [
    { name: 'Factures', href: '/dashboard/invoices', icon: FileText },
    { name: 'Import données', href: '/dashboard/admin/import', icon: Upload },
    { name: 'Paramètres', href: '/dashboard/settings', icon: Settings },
  ];

  // 🖥️ Sidebar desktop (au cas où)
  const allNavigation = [
    { name: 'Interventions', href: '/dashboard/interventions', icon: Wrench },
    { name: 'Calendrier', href: '/dashboard/calendar', icon: Calendar },
    { name: 'Clients', href: '/dashboard/clients', icon: Users },
    { name: 'Prospects', href: '/dashboard/prospects', icon: Target }, // 🎯 NOUVEAU
    { name: 'Factures', href: '/dashboard/invoices', icon: FileText },
    { name: 'Import données', href: '/dashboard/admin/import', icon: Upload },
    { name: 'Paramètres', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 📱 HEADER - Optimisé mobile/tablette */}
      <header className="bg-[#0E2C54] shadow-lg sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-xl">🏊</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Delmas Piscine</h1>
              <p className="text-xs text-blue-200 hidden sm:block">Gestion d'interventions</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{userName}</p>
              <p className="text-xs text-blue-200">Administrateur</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
              title="Déconnexion"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="md:hidden p-2 rounded-lg bg-white/10 text-white"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 📱 MAIN CONTENT - Optimisé mobile */}
      <main className="p-4 md:p-8 md:ml-64 pb-24 md:pb-8 max-w-7xl mx-auto">
        {children}
      </main>

      {/* 📱 BOTTOM NAVIGATION - MOBILE/TABLETTE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg z-50 safe-area-bottom">
        <div className="flex justify-around items-center py-2">
          {mainNavigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                className={`flex flex-col items-center justify-center py-2 px-2 flex-1 relative ${
                  isActive ? 'text-[#2599FB]' : 'text-gray-500'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 transition-transform ${isActive ? 'scale-110' : ''}`} />
                <span className="text-xs font-semibold">{item.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-[#2599FB] rounded-t-full"></div>
                )}
              </button>
            );
          })}

          {/* 📱 Bouton PLUS */}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex flex-col items-center justify-center py-2 px-2 flex-1 relative ${
              showMoreMenu ? 'text-[#2599FB]' : 'text-gray-500'
            }`}
          >
            {showMoreMenu ? (
              <X className="w-5 h-5 mb-1" />
            ) : (
              <Menu className="w-5 h-5 mb-1" />
            )}
            <span className="text-xs font-semibold">Plus</span>
            {showMoreMenu && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-[#2599FB] rounded-t-full"></div>
            )}
          </button>
        </div>
      </nav>

      {/* 📱 MENU "PLUS" - OVERLAY MOBILE */}
      {showMoreMenu && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
            onClick={() => setShowMoreMenu(false)}
          ></div>
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-[70] border-t-2 border-gray-200 animate-slide-up max-h-[80vh] overflow-y-auto">
            <div className="p-6 pb-safe">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Menu</h3>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              <div className="space-y-2">
                {moreNavigation.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        router.push(item.href);
                        setShowMoreMenu(false);
                      }}
                      className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl font-semibold transition-all ${
                        isActive
                          ? 'bg-[#2599FB] text-white shadow-lg'
                          : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Déconnexion */}
              <button
                onClick={() => {
                  handleLogout();
                  setShowMoreMenu(false);
                }}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-xl font-semibold text-red-600 hover:bg-red-50 active:bg-red-100 transition-all mt-6 border-t-2 border-gray-200 pt-6"
              >
                <LogOut className="w-6 h-6" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* 🖥️ SIDEBAR - DESKTOP (au cas où) */}
      <aside className="hidden md:block fixed left-0 top-[73px] w-64 bg-white border-r border-gray-200 h-[calc(100vh-73px)] overflow-y-auto z-40">
        <nav className="p-4 space-y-1">
          {allNavigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                  isActive
                    ? 'bg-[#2599FB] text-white shadow-lg'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* 📱 STYLES OPTIMISÉS MOBILE */}
      <style jsx global>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Support iOS safe area */
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
        .pb-safe {
          padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
        }

        /* Smooth scroll */
        html {
          scroll-behavior: smooth;
        }

        /* Touch-friendly sur mobile */
        @media (max-width: 768px) {
          button {
            min-height: 44px; /* Taille minimale tactile iOS */
          }
        }
      `}</style>
    </div>
  );
}
