/**
 * Local mailbox fixtures — deterministic email events for intake without live credentials.
 */

function toBase64(text) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(text, 'utf8').toString('base64');
  }
  return btoa(text);
}

const TINY_PDF_B64 = toBase64('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

function pdfAttachment(id, filename) {
  return {
    attachmentId: id,
    filename,
    mimeType: 'application/pdf',
    size: 64,
    contentHash: `sha256:fixture-${id}`,
    contentBase64: TINY_PDF_B64,
  };
}

/**
 * Fixture scenarios used by local mailbox + acceptance demos.
 */
export const FIXTURE_EVENTS = [
  {
    id: 'msg_new_supplier_001',
    event: {
      source: 'email',
      provider: 'local-mailbox',
      messageId: 'msg_new_supplier_001',
      receivedAt: '2026-08-09T08:00:00.000Z',
      sender: 'billing@unknown-nordic.example',
      subject: 'Invoice 1001 from Unknown Nordic AS',
      attachments: [pdfAttachment('att_unk_1001', 'invoice-1001.pdf')],
      bodyReference: 'fixture:body:msg_new_supplier_001',
      metadata: {
        scenario: 'new_supplier',
        suggestedSupplier: 'Unknown Nordic AS',
        suggestedAmount: 1500,
        suggestedCurrency: 'NOK',
        suggestedVatRate: 25,
        suggestedDueDate: '2026-09-01',
      },
    },
  },
  {
    id: 'msg_circle_k_002',
    event: {
      source: 'email',
      provider: 'local-mailbox',
      messageId: 'msg_circle_k_002',
      receivedAt: '2026-08-09T08:05:00.000Z',
      sender: 'noreply@circlek.example',
      subject: 'Your Circle K invoice',
      attachments: [pdfAttachment('att_ck_440', 'circle-k-aug.pdf')],
      bodyReference: 'fixture:body:msg_circle_k_002',
      metadata: {
        scenario: 'known_supplier',
        suggestedSupplier: 'Circle K',
        suggestedAmount: 489,
        suggestedCurrency: 'NOK',
        suggestedVatRate: 25,
        suggestedDueDate: '2026-09-15',
      },
    },
  },
  {
    id: 'msg_receipt_paid_003',
    event: {
      source: 'email',
      provider: 'local-mailbox',
      messageId: 'msg_receipt_paid_003',
      receivedAt: '2026-08-09T08:10:00.000Z',
      sender: 'receipts@amazon.example',
      subject: 'Payment receipt — already paid',
      attachments: [pdfAttachment('att_amz_receipt', 'amazon-receipt.pdf')],
      bodyReference: 'fixture:body:msg_receipt_paid_003',
      metadata: {
        scenario: 'already_paid',
        suggestedSupplier: 'Amazon AWS',
        suggestedAmount: 2400,
        suggestedCurrency: 'NOK',
        suggestedVatRate: 25,
        paymentSettled: true,
      },
    },
  },
  {
    id: 'msg_newsletter_004',
    event: {
      source: 'email',
      provider: 'local-mailbox',
      messageId: 'msg_newsletter_004',
      receivedAt: '2026-08-09T08:15:00.000Z',
      sender: 'news@magazine.example',
      subject: 'This week in design',
      attachments: [],
      bodyReference: 'fixture:body:msg_newsletter_004',
      metadata: { scenario: 'non_financial' },
    },
  },
];
