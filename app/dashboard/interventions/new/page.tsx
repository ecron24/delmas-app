'use client';

import { useState } from 'react';
import { ClientSearch } from '@/components/clients/ClientSearch';
import { InterventionForm } from '@/components/interventions/InterventionForm';

export default function NewInterventionPage() {
  const [step, setStep] = useState<'search' | 'form'>('search');
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const handleClientSelect = (client: any) => {
    setSelectedClient(client);
    setStep('form');
  };

  const handleCreateNew = () => {
    setSelectedClient(null);
    setStep('form');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            if (step === 'form') {
              setStep('search');
              setSelectedClient(null);
            } else {
              window.history.back();
            }
          }}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle intervention</h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === 'search' && 'Rechercher ou créer un client'}
            {step === 'form' && (selectedClient ? `Client: ${selectedClient.first_name} ${selectedClient.last_name}` : 'Nouveau client + intervention')}
          </p>
        </div>
      </div>

      {/* Contenu */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        {step === 'search' && (
          <ClientSearch
            onClientSelect={handleClientSelect}
            onCreateNew={handleCreateNew}
          />
        )}

        {step === 'form' && (
          <InterventionForm existingClient={selectedClient} />
        )}
      </div>
    </div>
  );
}
