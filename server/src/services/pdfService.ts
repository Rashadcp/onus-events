import { IBillingDocument, BillingCopyType } from '../models/BillingDocument';

const copyLabels: Record<BillingCopyType, string> = {
  CUSTOMER_COPY: 'Customer Copy',
  STORE_COPY: 'Store Copy',
  OFFICE_COPY: 'Office Copy'
};

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function money(value: number) {
  return `INR ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value?: Date | string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN');
}

function buildLines(document: IBillingDocument, copyType: BillingCopyType) {
  const lines: string[] = [
    'ONUS EVENT ERP',
    `${document.documentType} - ${copyLabels[copyType]}`,
    `No: ${document.documentNumber}    Date: ${formatDate(document.issueDate)}`,
    `Customer: ${document.customer.name}`,
    `Phone: ${document.customer.phone || '-'}    GSTIN: ${document.customer.gstin || '-'}`,
    `Event: ${document.event.program || '-'}    Place: ${document.customer.eventPlace || '-'}`,
    ' ',
    'Item                         Qty Days Rate       GST    Total',
    '-------------------------------------------------------------'
  ];

  document.lineItems.forEach((item) => {
    const name = `${item.itemCode} ${item.description}`.slice(0, 28).padEnd(28, ' ');
    lines.push(
      `${name} ${String(item.quantity).padStart(3, ' ')} ${String(item.rentalDays).padStart(4, ' ')} ${money(item.unitRate).padStart(10, ' ')} ${String(item.gstRate).padStart(4, ' ')}% ${money(item.totalAmount).padStart(12, ' ')}`
    );
  });

  lines.push(
    '-------------------------------------------------------------',
    `Subtotal:       ${money(document.totals.subTotal)}`,
    `Discount:       ${money(document.totals.discountTotal)}`,
    `Taxable:        ${money(document.totals.taxableTotal)}`,
    `GST:            ${money(document.totals.gstTotal)}`,
    `Grand Total:    ${money(document.totals.grandTotal)}`,
    ' ',
    `Terms: ${document.terms || 'Rental prices are subject to stock availability and event dates.'}`,
    `Notes: ${document.notes || '-'}`
  );

  return lines;
}

export function generateBillingPdf(document: IBillingDocument, copyType: BillingCopyType = 'CUSTOMER_COPY') {
  const lines = buildLines(document, copyType);
  const content = [
    'BT',
    '/F1 12 Tf',
    '50 790 Td',
    '14 TL',
    ...lines.map((line, index) => `${index === 0 ? '' : 'T*'}(${escapePdfText(line)}) Tj`),
    'ET'
  ].join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj',
    `5 0 obj\n<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream\nendobj`
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${object}\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf-8');
}
