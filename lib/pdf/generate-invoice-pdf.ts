import FormData from 'form-data';

const GOTENBERG_URL = process.env.GOTENBERG_URL || 'http://gotenberg:3000/forms/chromium/convert/html';

/**
 * Generate PDF from HTML using Gotenberg
 * @param html - The HTML content to convert
 * @param filename - Optional filename for the PDF
 * @returns Buffer containing the PDF data
 */
export async function generatePDFFromHTML(html: string, filename: string = 'document.pdf'): Promise<Buffer> {
  try {
    // Create form data
    const formData = new FormData();

    // Add the HTML file
    formData.append('files', Buffer.from(html, 'utf-8'), {
      filename: 'index.html',
      contentType: 'text/html',
    });

    // Gotenberg options (optional)
    // Uncomment and adjust as needed:
    // formData.append('marginTop', '0.5');
    // formData.append('marginBottom', '0.5');
    // formData.append('marginLeft', '0.5');
    // formData.append('marginRight', '0.5');
    // formData.append('paperWidth', '8.27'); // A4 width in inches
    // formData.append('paperHeight', '11.7'); // A4 height in inches

    // Call Gotenberg
    const response = await fetch(GOTENBERG_URL, {
      method: 'POST',
      body: formData as any,
      headers: formData.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gotenberg error (${response.status}): ${errorText}`);
    }

    // Get PDF buffer
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
 * @returns Buffer containing the PDF
 */
export async function generateInvoicePDF(invoiceHTML: string, invoiceNumber: string): Promise<Buffer> {
  console.log('📄 Generating PDF for invoice:', invoiceNumber);

  const pdfBuffer = await generatePDFFromHTML(invoiceHTML, `Facture_${invoiceNumber}.pdf`);

  console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');

  return pdfBuffer;
}
