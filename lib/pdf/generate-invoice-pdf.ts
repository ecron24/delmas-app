'use server';

const GOTENBERG_URL = process.env.GOTENBERG_URL || 'http://gotenberg:3000/forms/chromium/convert/html';

/**
 * Generate PDF from HTML using Gotenberg (Native FormData)
 * @param html - The HTML content to convert
 * @param filename - Optional filename for the PDF
 * @returns Buffer containing the PDF data
 */
export async function generatePDFFromHTML(html: string, filename: string = 'document.pdf'): Promise<Buffer> {
  try {
    // ✅ Utiliser FormData natif de Node.js 18+
    const formData = new FormData();

    // Créer un Blob à partir du HTML
    const htmlBlob = new Blob([html], { type: 'text/html' });

    // Ajouter le fichier HTML au FormData
    formData.append('files', htmlBlob, 'index.html');

    // Appel à Gotenberg
    const response = await fetch(GOTENBERG_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gotenberg error (${response.status}): ${errorText}`);
    }

    // Récupérer le buffer PDF
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);

  } catch (error: any) {
    console.error('❌ Error generating PDF with Gotenberg:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
}

/**
 * Generate invoice PDF from invoice data
 * @param invoiceHTML - The complete HTML for the invoice
 * @param invoiceNumber - Invoice number for filename
 * @param clientName - Client name for filename (optional)
 * @returns Buffer containing the PDF
 */
export async function generateInvoicePDF(
  invoiceHTML: string,
  invoiceNumber: string,
  clientName?: string
): Promise<Buffer> {
  console.log('📄 Generating PDF for invoice:', invoiceNumber);

  // 🏷️ Nettoyer le nom du client pour le nom de fichier
  const sanitizedClientName = clientName
    ? clientName
        .replace(/[^a-zA-Z0-9\s_-]/g, '')
        .replace(/\s+/g, '_')
        .trim()
    : 'Client';

  const filename = `Facture_${invoiceNumber}_${sanitizedClientName}.pdf`;

  const pdfBuffer = await generatePDFFromHTML(invoiceHTML, filename);

  console.log('✅ PDF generated successfully:', filename, '- size:', pdfBuffer.length, 'bytes');

  return pdfBuffer;
}
