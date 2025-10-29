'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Shield, Bell, Globe, LogOut, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* HEADER */}
      <div className="space-y-3">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">⚙️ Paramètres</h1>
        <p className="text-gray-500">Gérez votre compte et vos préférences</p>
      </div>

      {/* PROFIL UTILISATEUR */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user?.email?.split('@')[0]}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-600" />
              <span className="font-semibold text-gray-900">Rôle</span>
            </div>
            <span className="text-sm text-gray-600">Administrateur</span>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="font-semibold text-gray-900">Notifications</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-gray-600" />
              <span className="font-semibold text-gray-900">Langue</span>
            </div>
            <span className="text-sm text-gray-600">Français</span>
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
        <button
          onClick={() => router.push('/dashboard/settings/company')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b-2 border-gray-200"
        >
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-blue-600" />
            <div className="text-left">
              <span className="font-semibold text-gray-900 block">Configuration entreprise</span>
              <span className="text-xs text-gray-500">Mentions légales, CGV, informations</span>
            </div>
          </div>
          <span className="text-gray-400">→</span>
        </button>

        <button
          onClick={() => router.push('/dashboard/admin/import')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b-2 border-gray-200"
        >
          <span className="font-semibold text-gray-900">Import de données</span>
          <span className="text-gray-400">→</span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors text-red-600"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5" />
            <span className="font-semibold">Déconnexion</span>
          </div>
          <span className="text-red-400">→</span>
        </button>
      </div>

      {/* INFO VERSION */}
      <div className="text-center text-xs text-gray-400 mt-8">
        <p>Delmas Piscine v1.0.0</p>
        <p className="mt-1">© 2024 Tous droits réservés</p>
      </div>
    </div>
  );
}
