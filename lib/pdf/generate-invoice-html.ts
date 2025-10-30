import { CompanySettings } from '@/lib/actions/company-settings';

interface InvoiceData {
  invoice: {
    id: string;
    invoice_number: string;
    invoice_type: string;
    issue_date: string;
    due_date: string;
    subtotal_ht: number;
    total_tva: number;
    total_ttc: number;
    notes?: string;
  };
  client: {
    first_name: string;
    last_name: string;
    company_name?: string;
    email: string;
    address: string;
    postal_code: string;
    city: string;
    type: string;
  };
  intervention: {
    reference: string;
    scheduled_date: string;
    description?: string;
    duration?: number;
    hourly_rate?: number;
    travel_fees?: number;
  };
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tva_rate: number;
    total: number;
  }>;
  companySettings: CompanySettings;
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const { invoice, client, intervention, items, companySettings } = data;

  // Client name
  const clientName = client.type === 'professionnel' && client.company_name
    ? client.company_name
    : `${client.first_name} ${client.last_name}`;

  // Calculate line items
  const laborHT = (intervention.duration || 0) * (intervention.hourly_rate || 0);
  const laborTVA = laborHT * 0.20;
  const travelHT = intervention.travel_fees || 0;
  const travelTVA = travelHT * 0.20;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facture ${invoice.invoice_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1f2937;
      background: white;
      padding: 40px;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid ${companySettings.primary_color};
    }

    .header-left h1 {
      font-size: 24pt;
      font-weight: bold;
      color: #111827;
      margin-bottom: 8px;
    }

    .header-left .invoice-number {
      font-size: 10pt;
      color: #6b7280;
      font-family: monospace;
    }

    .header-left .reference {
      font-size: 9pt;
      color: #6b7280;
    }

    .header-right {
      text-align: right;
    }

    .header-right .company-name {
      font-size: 14pt;
      font-weight: bold;
      color: #111827;
      margin-bottom: 4px;
    }

    .header-right p {
      font-size: 9pt;
      color: #4b5563;
      line-height: 1.4;
    }

    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }

    .info-box {
      width: 48%;
    }

    .info-box h3 {
      font-size: 10pt;
      font-weight: bold;
      color: #111827;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-box p {
      font-size: 9pt;
      color: #4b5563;
      line-height: 1.5;
    }

    .info-box .client-name {
      font-weight: bold;
      color: #111827;
      font-size: 10pt;
    }

    .description-box {
      background: #eff6ff;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .description-box p {
      font-size: 9pt;
      color: #1e40af;
      margin: 0;
      white-space: pre-wrap;
    }

    .description-box strong {
      display: block;
      margin-bottom: 5px;
      color: #1e3a8a;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    thead {
      background: #f3f4f6;
    }

    thead th {
      padding: 12px 10px;
      text-align: left;
      font-size: 9pt;
      font-weight: bold;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #d1d5db;
    }

    thead th.center {
      text-align: center;
    }

    thead th.right {
      text-align: right;
    }

    tbody tr {
      border-bottom: 1px solid #e5e7eb;
    }

    tbody tr.highlight {
      background: #fef3c7;
    }

    tbody tr.labor {
      background: #dbeafe;
    }

    tbody td {
      padding: 10px;
      font-size: 9pt;
      color: #374151;
    }

    tbody td.center {
      text-align: center;
    }

    tbody td.right {
      text-align: right;
    }

    tbody td.bold {
      font-weight: bold;
    }

    .totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }

    .totals-box {
      width: 350px;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 15px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 10pt;
    }

    .totals-row.final {
      background: #dbeafe;
      padding: 12px 15px;
      border: none;
      border-radius: 8px;
      margin-top: 8px;
    }

    .totals-row.final .label {
      font-size: 12pt;
      font-weight: bold;
      color: #111827;
    }

    .totals-row.final .amount {
      font-size: 16pt;
      font-weight: bold;
      color: ${companySettings.primary_color};
    }

    .notes-section {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
    }

    .notes-section h3 {
      font-size: 11pt;
      font-weight: bold;
      color: #111827;
      margin-bottom: 10px;
    }

    .notes-section p {
      font-size: 9pt;
      color: #4b5563;
      line-height: 1.6;
      margin-bottom: 10px;
      white-space: pre-wrap;
    }

    .legal-mentions {
      background: #f9fafb;
      padding: 12px;
      border-radius: 6px;
      border-left: 3px solid #9ca3af;
      margin-top: 15px;
    }

    .legal-mentions p {
      font-size: 8pt;
      color: #6b7280;
      line-height: 1.5;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 8pt;
      color: #9ca3af;
    }

    .footer p {
      margin: 3px 0;
    }

    @media print {
      body {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- HEADER -->
    <div class="header">
      <div class="header-left">
        <h1>${invoice.invoice_type === 'final' ? 'FACTURE FINALE' : invoice.invoice_type === 'proforma' ? 'FACTURE PROFORMA' : 'FACTURE'}</h1>
        <p class="invoice-number">${invoice.invoice_number}</p>
        <p class="reference">Intervention : ${intervention.reference}</p>
      </div>

      <div class="header-right">
        <p class="company-name">${companySettings.company_name}</p>
        <p>${companySettings.company_address}</p>
        <p>${companySettings.company_postal_code} ${companySettings.company_city}</p>
        <p>SIRET: ${companySettings.siret}</p>
        <p>TVA: ${companySettings.tva_number}</p>
        ${companySettings.legal_form && companySettings.rcs_number ? `
        <p>${companySettings.legal_form} - RCS ${companySettings.rcs_city || ''} ${companySettings.rcs_number}</p>
        ` : ''}
        ${companySettings.share_capital ? `<p>Capital: ${companySettings.share_capital}</p>` : ''}
        <p style="margin-top: 8px;">📧 ${companySettings.email}</p>
        <p>📞 ${companySettings.phone}</p>
        ${companySettings.website ? `<p>🌐 ${companySettings.website}</p>` : ''}
      </div>
    </div>

    <!-- INFO SECTION -->
    <div class="info-section">
      <div class="info-box">
        <h3>Facturé à</h3>
        <p class="client-name">${clientName}</p>
        <p>${client.address}</p>
        <p>${client.postal_code} ${client.city}</p>
        <p style="margin-top: 8px;">📧 ${client.email}</p>
      </div>

      <div class="info-box">
        <p><strong>Date d'émission</strong></p>
        <p>${new Date(invoice.issue_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        <p style="margin-top: 12px;"><strong>Date d'échéance</strong></p>
        <p>${new Date(invoice.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
    </div>

    <!-- DESCRIPTION -->
    ${intervention.description ? `
    <div class="description-box">
      <strong>📝 Travaux réalisés</strong>
      <p>${intervention.description}</p>
    </div>
    ` : ''}

    <!-- ITEMS TABLE -->
    <table>
      <thead>
        <tr>
          <th>Désignation</th>
          <th class="center">Qté</th>
          <th class="right">P.U. HT</th>
          <th class="center">TVA</th>
          <th class="right">Total HT</th>
        </tr>
      </thead>
      <tbody>
        ${laborHT > 0 ? `
        <tr class="labor">
          <td class="bold">🛠️ Main d'œuvre</td>
          <td class="center">${intervention.duration}h</td>
          <td class="right">${intervention.hourly_rate?.toFixed(2)}€</td>
          <td class="center">20%</td>
          <td class="right bold">${laborHT.toFixed(2)}€</td>
        </tr>
        ` : ''}

        ${travelHT > 0 ? `
        <tr class="highlight">
          <td class="bold">🚗 Frais de déplacement</td>
          <td class="center">1</td>
          <td class="right">${travelHT.toFixed(2)}€</td>
          <td class="center">20%</td>
          <td class="right bold">${travelHT.toFixed(2)}€</td>
        </tr>
        ` : ''}

        ${items.map(item => `
        <tr>
          <td>${item.description}</td>
          <td class="center">${item.quantity}</td>
          <td class="right">${item.unit_price.toFixed(2)}€</td>
          <td class="center">${item.tva_rate}%</td>
          <td class="right bold">${(item.quantity * item.unit_price).toFixed(2)}€</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- TOTALS -->
    <div class="totals">
      <div class="totals-box">
        <div class="totals-row">
          <span class="label">Total HT</span>
          <span class="amount">${invoice.subtotal_ht.toFixed(2)}€</span>
        </div>
        <div class="totals-row">
          <span class="label">TVA</span>
          <span class="amount">${invoice.total_tva.toFixed(2)}€</span>
        </div>
        <div class="totals-row final">
          <span class="label">TOTAL TTC</span>
          <span class="amount">${invoice.total_ttc.toFixed(2)}€</span>
        </div>
      </div>
    </div>

    <!-- NOTES AND CONDITIONS -->
    <div class="notes-section">
      <h3>Notes et conditions</h3>

      ${invoice.notes ? `<p>${invoice.notes}</p>` : ''}

      ${companySettings.invoice_footer_notes ? `
      <p>${companySettings.invoice_footer_notes}</p>
      ` : ''}

      ${companySettings.legal_mentions ? `
      <div class="legal-mentions">
        <p>${companySettings.legal_mentions}</p>
      </div>
      ` : ''}
    </div>

    <!-- FOOTER -->
    <div class="footer">
      <p>${companySettings.company_name} - SIRET ${companySettings.siret} - TVA ${companySettings.tva_number}</p>
      <p>Document généré le ${new Date().toLocaleDateString('fr-FR')}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
