// delmas-app/app/unauthorized/page.tsx
'use client';

import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Accès refusé
        </h1>

        <p className="text-gray-600 mb-6">
          Votre compte n'est pas autorisé à accéder à cette application.
        </p>

        <p className="text-sm text-gray-500 mb-8">
          Seuls les comptes autorisés par l'administrateur peuvent se connecter.
        </p>

        <button
          onClick={() => router.push('/login')}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Retour à la connexion
        </button>
      </div>
    </div>
  );
}
