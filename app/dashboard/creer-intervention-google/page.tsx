'use client';

import { useState } from 'react';

export default function CreerInterventionGooglePage() {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    timeStart: '09:00',
    timeEnd: '10:00',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    address: '',
    technician: 'stephane',
    notes: '',
    types: [] as string[],
  });

  const [showPreview, setShowPreview] = useState(false);

  const interventionTypes = [
    { value: 'entretien', label: 'Entretien' },
    { value: 'reparation', label: 'Réparation' },
    { value: 'installation', label: 'Installation' },
    { value: 'hivernage', label: 'Hivernage' },
    { value: 'nettoyage', label: 'Nettoyage' },
    { value: 'diagnostic', label: 'Diagnostic' },
    { value: 'urgence', label: 'Urgence' },
    { value: 'controle', label: 'Contrôle' },
  ];

  const technicians = [
    { value: 'stephane', label: 'Stéphane' },
    { value: 'christophe', label: 'Christophe' },
  ];

  const toggleType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type]
    }));
  };

  const formatPhoneForHashtag = (phone: string) => {
    // Nettoyer le numéro : garder que les chiffres
    const cleaned = phone.replace(/\D/g, '');
    // Retourner 10 chiffres si possible
    return cleaned.length === 10 ? cleaned : '';
  };

  const generateDescription = () => {
    const phoneHashtag = formatPhoneForHashtag(formData.clientPhone);
    const typeHashtags = formData.types.map(t => `#${t}`).join(' ');

    let description = '';

    // Nom client en hashtag (simplifié, sans espaces)
    const clientHashtag = formData.clientName.replace(/\s+/g, '').toLowerCase();
    if (clientHashtag) {
      description += `#${clientHashtag} `;
    }

    // Téléphone en hashtag
    if (phoneHashtag) {
      description += `#${phoneHashtag} `;
    }

    // Technicien
    description += `#${formData.technician} `;

    // Types d'intervention
    if (typeHashtags) {
      description += `${typeHashtags}\n\n`;
    } else {
      description += '\n';
    }

    // Informations détaillées
    description += `📝 INTERVENTION PISCINE\n\n`;
    description += `👤 CLIENT\n`;
    description += `Nom : ${formData.clientName}\n`;
    if (formData.clientPhone) description += `📞 ${formData.clientPhone}\n`;
    if (formData.clientEmail) description += `📧 ${formData.clientEmail}\n`;
    description += `\n`;

    if (formData.address) {
      description += `📍 ADRESSE\n${formData.address}\n\n`;
    }

    if (formData.notes) {
      description += `💬 NOTES\n${formData.notes}\n\n`;
    }

    description += `---\n✨ Créé via l'application Piscine Delmas`;

    return description;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientName.trim()) {
      alert('⚠️ Le nom du client est obligatoire');
      return;
    }

    if (formData.types.length === 0) {
      alert('⚠️ Veuillez sélectionner au moins un type d\'intervention');
      return;
    }

    const description = generateDescription();
    setShowPreview(true);

    // Créer l'URL Google Calendar
    const dateStart = new Date(`${formData.date}T${formData.timeStart}`);
    const dateEnd = new Date(`${formData.date}T${formData.timeEnd}`);

    const formatGoogleDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
    };

    const typeLabel = formData.types[0] || 'Intervention';
    const title = `🏊 ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} - ${formData.clientName}`;

    const calendarUrl = new URL('https://calendar.google.com/calendar/render');
    calendarUrl.searchParams.set('action', 'TEMPLATE');
    calendarUrl.searchParams.set('text', title);
    calendarUrl.searchParams.set('dates', `${formatGoogleDate(dateStart)}/${formatGoogleDate(dateEnd)}`);
    calendarUrl.searchParams.set('details', description);
    if (formData.address) {
      calendarUrl.searchParams.set('location', formData.address);
    }

    // Ouvrir Google Calendar
    setTimeout(() => {
      window.open(calendarUrl.toString(), '_blank');
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-purple-600 p-3 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-2">
            🏊 Créer une Intervention
          </h1>
          <p className="text-sm sm:text-base text-center text-gray-600 mb-6 sm:mb-8">
            Piscine Delmas - Google Calendar
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Date et heure */}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 pb-2 border-b-2 border-gray-200">
                📅 Quand ?
              </h2>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date de l'intervention
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Heure début
                  </label>
                  <input
                    type="time"
                    value={formData.timeStart}
                    onChange={(e) => setFormData({ ...formData, timeStart: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Heure fin
                  </label>
                  <input
                    type="time"
                    value={formData.timeEnd}
                    onChange={(e) => setFormData({ ...formData, timeEnd: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Client */}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 pb-2 border-b-2 border-gray-200">
                👤 Client
              </h2>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nom du client *
                </label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="M. Dupont"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    placeholder="0612345678"
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: 10 chiffres sans espaces</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    placeholder="client@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Adresse d'intervention
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none resize-none"
                  rows={2}
                  placeholder="10 Rue de la Piscine, 13001 Marseille"
                />
              </div>
            </div>

            {/* Types d'intervention */}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 pb-2 border-b-2 border-gray-200">
                🏷️ Type(s) d'intervention *
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {interventionTypes.map(type => (
                  <label
                    key={type.value}
                    className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.types.includes(type.value)
                        ? 'bg-purple-50 border-purple-500 font-semibold'
                        : 'border-gray-300 hover:bg-gray-50 hover:border-purple-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.types.includes(type.value)}
                      onChange={() => toggleType(type.value)}
                      className="w-5 h-5 mr-2 cursor-pointer"
                    />
                    <span className="text-sm">#{type.value}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Technicien */}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 pb-2 border-b-2 border-gray-200">
                ⚙️ Technicien
              </h2>

              <select
                value={formData.technician}
                onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                required
              >
                {technicians.map(tech => (
                  <option key={tech.value} value={tech.value}>
                    {tech.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notes / Instructions
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none resize-none"
                rows={3}
                placeholder="Informations complémentaires..."
              />
            </div>

            {/* Bouton */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg shadow-lg hover:from-purple-700 hover:to-purple-600 transition-all transform hover:-translate-y-1"
            >
              📅 <span className="hidden sm:inline">Créer l'événement</span><span className="sm:hidden">Créer</span> Google Calendar
            </button>
          </form>

          {/* Prévisualisation */}
          {showPreview && (
            <div className="mt-4 sm:mt-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-3 sm:p-6">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3">📋 Aperçu de la description</h3>
              <pre className="bg-white p-3 sm:p-4 rounded-lg text-xs sm:text-sm overflow-x-auto whitespace-pre-wrap">
                {generateDescription()}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
