"use client";

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calculator, FileDown, FileText, Printer, ReceiptText, RefreshCw, Send, Trash2 } from 'lucide-react';
import { BillingCopyType, BillingDocument, BillingLineItem, Event, Item } from '../../types';
import {
  convertQuotationToInvoiceApi,
  createBillingDocumentApi,
  getBillingDocumentsApi,
  priceBillingDocumentApi
} from '../../services/api';
import { apiClient } from '../../utils/apiClient';
import { Button } from '../ui/Button';
import { SectionHeader } from '../ui/SectionHeader';
import { Alert } from '../ui/Alert';

interface BillingWorkspaceProps {
  initialItems: Item[];
  initialEvents: Event[];
}

type DraftLine = Omit<BillingLineItem, 'taxableAmount' | 'gstAmount' | 'totalAmount'>;

const emptyLine = (): DraftLine => ({
  itemCode: '',
  description: '',
  quantity: 1,
  rentalDays: 1,
  unitRate: 0,
  discountType: 'FLAT',
  discountValue: 0,
  gstRate: 18
});

const formatMoney = (value?: number) => `Rs. ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';
const labelClass = 'text-[10px] font-bold uppercase tracking-widest text-slate-400';
const getErrorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

export function BillingWorkspace({ initialItems, initialEvents }: BillingWorkspaceProps) {
  const queryClient = useQueryClient();
  const [documentType, setDocumentType] = useState<'QUOTATION' | 'INVOICE'>('QUOTATION');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [eventPlace, setEventPlace] = useState('');
  const [program, setProgram] = useState('');
  const [terms, setTerms] = useState('Rental pricing is valid for the selected event dates. GST and transport charges are shown where applicable.');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [preview, setPreview] = useState<{ lineItems: BillingLineItem[]; totals: BillingDocument['totals'] } | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<BillingDocument | null>(null);
  const [copyType, setCopyType] = useState<BillingCopyType>('CUSTOMER_COPY');
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: documents = [] } = useQuery({
    queryKey: ['billingDocuments'],
    queryFn: getBillingDocumentsApi,
    placeholderData: []
  });

  const selectedEvent = useMemo(
    () => initialEvents.find((event) => event._id === selectedEventId),
    [initialEvents, selectedEventId]
  );

  const activePreview = selectedDocument || (preview ? {
    _id: 'draft',
    documentType,
    documentNumber: 'Draft',
    customer: { name: customerName || 'Customer name', phone: customerPhone, gstin: customerGstin, billingAddress, eventPlace },
    event: { program },
    issueDate: new Date().toISOString(),
    status: 'DRAFT',
    lineItems: preview.lineItems,
    totals: preview.totals,
    terms,
    notes
  } as BillingDocument : null);

  const pricingMutation = useMutation({
    mutationFn: () => priceBillingDocumentApi(lines),
    onSuccess: (data) => {
      setPreview(data);
      setSelectedDocument(null);
      setMessage('Pricing recalculated with GST and discounts.');
      setErrorMessage(null);
    },
    onError: (error: unknown) => setErrorMessage(getErrorMessage(error, 'Unable to calculate pricing.'))
  });

  const createMutation = useMutation({
    mutationFn: () => createBillingDocumentApi({
      documentType,
      eventId: selectedEventId || undefined,
      customer: {
        name: customerName,
        phone: customerPhone,
        gstin: customerGstin,
        billingAddress,
        eventPlace
      },
      event: {
        program,
        startDate: selectedEvent?.eventDate?.start ? new Date(selectedEvent.eventDate.start).toISOString() : undefined,
        endDate: selectedEvent?.eventDate?.end ? new Date(selectedEvent.eventDate.end).toISOString() : undefined
      },
      terms,
      notes,
      lineItems: lines
    }),
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: ['billingDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setSelectedDocument(document);
      setMessage(`${document.documentType === 'QUOTATION' ? 'Quotation' : 'Invoice'} ${document.documentNumber} created.`);
      setErrorMessage(null);
    },
    onError: (error: unknown) => setErrorMessage(getErrorMessage(error, 'Unable to save billing document.'))
  });

  const convertMutation = useMutation({
    mutationFn: (quotationId: string) => convertQuotationToInvoiceApi(quotationId),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['billingDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setSelectedDocument(invoice);
      setMessage(`Quotation converted to invoice ${invoice.documentNumber}.`);
      setErrorMessage(null);
    },
    onError: (error: unknown) => setErrorMessage(getErrorMessage(error, 'Unable to convert quotation.'))
  });

  const applyEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    const event = initialEvents.find((candidate) => candidate._id === eventId);
    if (!event) return;
    setCustomerName(event.customerName);
    setEventPlace(event.place);
    setProgram(event.program);
  };

  const updateLine = (index: number, patch: Partial<DraftLine>) => {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  };

  const applyItemToLine = (index: number, itemCode: string) => {
    const item = initialItems.find((candidate) => candidate.itemCode === itemCode);
    updateLine(index, {
      itemCode,
      description: item?.name || '',
      unitRate: item?.rentalRate || 0
    });
  };

  const downloadPdf = async () => {
    if (!selectedDocument || selectedDocument._id === 'draft') {
      window.print();
      return;
    }

    const response = await apiClient.get(`/api/billing/${selectedDocument._id}/pdf?copyType=${copyType}`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedDocument.documentNumber}-${copyType}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Quotation & Invoice Desk"
        description="Create GST-ready rental quotations, invoices, print copies, and PDF documents."
      />

      {message && <Alert message={message} type="success" onClose={() => setMessage(null)} />}
      {errorMessage && <Alert message={errorMessage} type="error" onClose={() => setErrorMessage(null)} />}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)] gap-6">
        <div className="flex flex-col gap-5">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <div className="flex flex-wrap gap-2 mb-5">
              {(['QUOTATION', 'INVOICE'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setDocumentType(type)}
                  className={`px-4 py-2 rounded-lg text-xs font-black border ${documentType === type ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                >
                  {type === 'QUOTATION' ? 'Quotation' : 'Invoice'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Link Event</span>
                <select value={selectedEventId} onChange={(event) => applyEvent(event.target.value)} className={inputClass}>
                  <option value="">Manual billing</option>
                  {initialEvents.map((event) => (
                    <option key={event._id} value={event._id}>{event.customerName}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Customer</span>
                <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className={inputClass} placeholder="Customer name" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Phone</span>
                <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} className={inputClass} placeholder="Mobile number" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>GSTIN</span>
                <input value={customerGstin} onChange={(event) => setCustomerGstin(event.target.value.toUpperCase())} className={inputClass} placeholder="Optional GSTIN" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Event Place</span>
                <input value={eventPlace} onChange={(event) => setEventPlace(event.target.value)} className={inputClass} placeholder="Venue" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Program</span>
                <input value={program} onChange={(event) => setProgram(event.target.value)} className={inputClass} placeholder="Wedding, conference..." />
              </label>
            </div>

            <label className="flex flex-col gap-1.5 mt-3">
              <span className={labelClass}>Billing Address</span>
              <input value={billingAddress} onChange={(event) => setBillingAddress(event.target.value)} className={inputClass} placeholder="Address for customer copy" />
            </label>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-slate-900 flex items-center gap-2"><Calculator className="w-4 h-4 text-blue-600" /> Rental pricing</h3>
              <Button variant="ghost" onClick={() => setLines((current) => [...current, emptyLine()])}>Add Line</Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-200">
                    <th className="py-2 min-w-36">Item</th>
                    <th className="py-2 min-w-48">Description</th>
                    <th className="py-2 w-20">Qty</th>
                    <th className="py-2 w-20">Days</th>
                    <th className="py-2 w-28">Rate</th>
                    <th className="py-2 w-28">Discount</th>
                    <th className="py-2 w-20">GST</th>
                    <th className="py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={index} className="border-b border-slate-100">
                      <td className="py-2 pr-2">
                        <select value={line.itemCode} onChange={(event) => applyItemToLine(index, event.target.value)} className={inputClass}>
                          <option value="">Custom</option>
                          {initialItems.map((item) => (
                            <option key={item.itemCode} value={item.itemCode}>{item.itemCode}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-2">
                        <input value={line.description} onChange={(event) => updateLine(index, { description: event.target.value })} className={inputClass} />
                      </td>
                      <td className="py-2 pr-2"><input type="number" min="1" value={line.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })} className={inputClass} /></td>
                      <td className="py-2 pr-2"><input type="number" min="1" value={line.rentalDays} onChange={(event) => updateLine(index, { rentalDays: Number(event.target.value) })} className={inputClass} /></td>
                      <td className="py-2 pr-2"><input type="number" min="0" value={line.unitRate} onChange={(event) => updateLine(index, { unitRate: Number(event.target.value) })} className={inputClass} /></td>
                      <td className="py-2 pr-2">
                        <div className="flex gap-1">
                          <input type="number" min="0" value={line.discountValue} onChange={(event) => updateLine(index, { discountValue: Number(event.target.value) })} className={inputClass} />
                          <select value={line.discountType} onChange={(event) => updateLine(index, { discountType: event.target.value as DraftLine['discountType'] })} className={`${inputClass} w-16`}>
                            <option value="FLAT">Rs</option>
                            <option value="PERCENTAGE">%</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-2 pr-2"><input type="number" min="0" value={line.gstRate} onChange={(event) => updateLine(index, { gstRate: Number(event.target.value) })} className={inputClass} /></td>
                      <td className="py-2 text-right">
                        <button onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} className="p-2 rounded-lg text-red-500 hover:bg-red-50" title="Remove line">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Terms</span>
                <textarea value={terms} onChange={(event) => setTerms(event.target.value)} className={`${inputClass} min-h-20`} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Notes</span>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={`${inputClass} min-h-20`} placeholder="Transport, setup, or office remarks" />
              </label>
            </div>

            <div className="flex flex-wrap gap-3 mt-5">
              <Button onClick={() => pricingMutation.mutate()} loading={pricingMutation.isPending} className="px-4 py-2.5">
                <RefreshCw className="w-4 h-4" /> Calculate
              </Button>
              <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!customerName} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700">
                <Send className="w-4 h-4" /> Save {documentType === 'QUOTATION' ? 'Quotation' : 'Invoice'}
              </Button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <h3 className="font-black text-slate-900 mb-3 flex items-center gap-2"><ReceiptText className="w-4 h-4 text-blue-600" /> Recent documents</h3>
            <div className="flex flex-col divide-y divide-slate-100">
              {documents.map((document) => (
                <button key={document._id} onClick={() => setSelectedDocument(document)} className="py-3 text-left flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg">
                  <div>
                    <p className="text-sm font-black text-slate-900">{document.documentNumber} <span className="text-[10px] text-slate-400">{document.documentType}</span></p>
                    <p className="text-xs text-slate-500">{document.customer.name} - {formatMoney(document.totals.grandTotal)}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{document.status}</span>
                </button>
              ))}
              {documents.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No quotations or invoices saved yet.</p>}
            </div>
          </div>
        </div>

        <aside className="bg-white border border-slate-200 rounded-lg shadow-sm xl:sticky xl:top-4 h-fit overflow-hidden print:shadow-none print:border-0">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="font-black text-sm text-slate-900">Invoice preview</span>
            </div>
            <div className="flex gap-2">
              <select value={copyType} onChange={(event) => setCopyType(event.target.value as BillingCopyType)} className={`${inputClass} w-36`}>
                <option value="CUSTOMER_COPY">Customer Copy</option>
                <option value="STORE_COPY">Store Copy</option>
                <option value="OFFICE_COPY">Office Copy</option>
              </select>
              <button onClick={() => window.print()} className="p-2 rounded-lg border border-slate-200 text-slate-600" title="Print"><Printer className="w-4 h-4" /></button>
              <button onClick={downloadPdf} className="p-2 rounded-lg border border-slate-200 text-slate-600" title="Download PDF"><FileDown className="w-4 h-4" /></button>
            </div>
          </div>

          {activePreview ? (
            <div className="p-6 print:p-0" id="billing-preview">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <p className="text-2xl font-black text-slate-950">ONUS EVENT ERP</p>
                  <p className="text-xs text-slate-500 mt-1">Rental quotation and invoice system</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">{activePreview.documentType}</p>
                  <p className="text-xs text-slate-500">{copyType.replace('_', ' ')}</p>
                  <p className="text-xs font-mono text-blue-600 mt-2">{activePreview.documentNumber}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 text-xs">
                <div>
                  <p className={labelClass}>Bill To</p>
                  <p className="font-black text-slate-900 mt-1">{activePreview.customer.name}</p>
                  <p className="text-slate-500">{activePreview.customer.phone || '-'}</p>
                  <p className="text-slate-500">{activePreview.customer.gstin || '-'}</p>
                </div>
                <div className="text-right">
                  <p className={labelClass}>Event</p>
                  <p className="font-black text-slate-900 mt-1">{activePreview.event?.program || '-'}</p>
                  <p className="text-slate-500">{activePreview.customer.eventPlace || '-'}</p>
                  <p className="text-slate-500">{new Date(activePreview.issueDate).toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              <table className="w-full text-xs border-y border-slate-200">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-slate-400 bg-slate-50">
                    <th className="py-2 px-2">Item</th>
                    <th className="py-2 px-2 text-right">Qty</th>
                    <th className="py-2 px-2 text-right">Days</th>
                    <th className="py-2 px-2 text-right">Rate</th>
                    <th className="py-2 px-2 text-right">GST</th>
                    <th className="py-2 px-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {activePreview.lineItems.map((item, index) => (
                    <tr key={`${item.itemCode}-${index}`} className="border-t border-slate-100">
                      <td className="py-2 px-2">
                        <p className="font-bold text-slate-900">{item.description}</p>
                        <p className="text-[10px] text-slate-400">{item.itemCode || 'CUSTOM'}</p>
                      </td>
                      <td className="py-2 px-2 text-right">{item.quantity}</td>
                      <td className="py-2 px-2 text-right">{item.rentalDays}</td>
                      <td className="py-2 px-2 text-right">{formatMoney(item.unitRate)}</td>
                      <td className="py-2 px-2 text-right">{item.gstRate}%</td>
                      <td className="py-2 px-2 text-right font-black">{formatMoney(item.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end mt-4">
                <div className="w-64 text-xs">
                  {[
                    ['Subtotal', activePreview.totals.subTotal],
                    ['Discount', activePreview.totals.discountTotal],
                    ['Taxable', activePreview.totals.taxableTotal],
                    ['GST', activePreview.totals.gstTotal]
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">{label}</span>
                      <span className="font-bold text-slate-900">{formatMoney(value as number)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 text-base font-black text-slate-950">
                    <span>Total</span>
                    <span>{formatMoney(activePreview.totals.grandTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-[11px] text-slate-500 border-t border-slate-200 pt-4">
                <p><span className="font-bold text-slate-800">Terms:</span> {activePreview.terms || '-'}</p>
                <p className="mt-1"><span className="font-bold text-slate-800">Notes:</span> {activePreview.notes || '-'}</p>
              </div>

              {activePreview.documentType === 'QUOTATION' && activePreview._id !== 'draft' && activePreview.status !== 'CONVERTED' && (
                <Button onClick={() => convertMutation.mutate(activePreview._id)} loading={convertMutation.isPending} className="w-full mt-5 py-3 bg-slate-900 print:hidden">
                  Convert quotation to invoice
                </Button>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-sm text-slate-400">
              Calculate pricing or select a saved document to preview.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
