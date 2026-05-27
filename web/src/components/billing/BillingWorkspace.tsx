"use client";

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calculator, FileDown, Plus, Printer, ReceiptText, RefreshCw, Send, Trash2, X } from 'lucide-react';
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
  quantity: 0,
  rentalDays: 0,
  unitRate: 0,
  discountType: 'FLAT',
  discountValue: 0,
  gstRate: 0
});

const formatMoney = (value?: number) => `Rs. ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';
const pricingInputClass = 'w-full h-12 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';
const labelClass = 'text-[10px] font-bold uppercase tracking-widest text-slate-400';
const getErrorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
const emptyNumberValue = (value: number) => value === 0 ? '' : value;

const priceDraftLines = (draftLines: DraftLine[], overallGstRate: number) => {
  const rawLineItems = draftLines.map((line) => {
    const baseAmount = Number(line.quantity || 0) * Number(line.rentalDays || 0) * Number(line.unitRate || 0);
    const discountAmount = line.discountType === 'PERCENTAGE'
      ? baseAmount * (Number(line.discountValue || 0) / 100)
      : Number(line.discountValue || 0);
    return {
      ...line,
      gstRate: overallGstRate,
      taxableAmount: Math.max(0, baseAmount - discountAmount)
    };
  });
  const taxableTotal = rawLineItems.reduce((sum, line) => sum + Number(line.taxableAmount || 0), 0);
  const gstTotal = taxableTotal * (Number(overallGstRate || 0) / 100);

  const lineItems = draftLines.map((line) => {
    const baseAmount = Number(line.quantity || 0) * Number(line.rentalDays || 0) * Number(line.unitRate || 0);
    const discountAmount = line.discountType === 'PERCENTAGE'
      ? baseAmount * (Number(line.discountValue || 0) / 100)
      : Number(line.discountValue || 0);
    const taxableAmount = Math.max(0, baseAmount - discountAmount);
    const gstAmount = taxableTotal > 0 ? gstTotal * (taxableAmount / taxableTotal) : 0;
    return {
      ...line,
      gstRate: overallGstRate,
      taxableAmount,
      gstAmount,
      totalAmount: taxableAmount + gstAmount
    };
  });

  return {
    lineItems,
    totals: {
      subTotal: draftLines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.rentalDays || 0) * Number(line.unitRate || 0), 0),
      discountTotal: lineItems.reduce((sum, line, index) => {
        const original = draftLines[index];
        const baseAmount = Number(original.quantity || 0) * Number(original.rentalDays || 0) * Number(original.unitRate || 0);
        return sum + Math.max(0, baseAmount - Number(line.taxableAmount || 0));
      }, 0),
      taxableTotal: lineItems.reduce((sum, line) => sum + Number(line.taxableAmount || 0), 0),
      gstTotal,
      grandTotal: lineItems.reduce((sum, line) => sum + Number(line.totalAmount || 0), 0)
    }
  };
};

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
  const [terms] = useState('Rental pricing is valid for the selected event dates. GST and transport charges are shown where applicable.');
  const [notes] = useState('');
  const [overallGstRate, setOverallGstRate] = useState(18);
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [preview, setPreview] = useState<{ lineItems: BillingLineItem[]; totals: BillingDocument['totals'] } | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<BillingDocument | null>(null);
  const [copyType, setCopyType] = useState<BillingCopyType>('CUSTOMER_COPY');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
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

  const pricedLines = useMemo(() => priceDraftLines(lines, overallGstRate), [lines, overallGstRate]);
  const localDraftPreview = pricedLines;
  const hasDraftContent = Boolean(
    customerName ||
    selectedEventId ||
    lines.some((line) => line.itemCode || line.description || Number(line.unitRate) > 0)
  );

  const activePreview = selectedDocument || {
    _id: 'draft',
    documentType,
    documentNumber: 'Draft',
    customer: { name: customerName || 'Customer name', phone: customerPhone, gstin: customerGstin, billingAddress, eventPlace },
    event: { program },
    issueDate: new Date().toISOString(),
    status: 'DRAFT',
    lineItems: localDraftPreview.lineItems,
    totals: localDraftPreview.totals,
    terms,
    notes
  } as BillingDocument;

  const showPreviewPanel = Boolean(selectedDocument || preview || hasDraftContent);

  const pricingMutation = useMutation({
    mutationFn: () => priceBillingDocumentApi(lines.map((line) => ({ ...line, gstRate: overallGstRate }))),
    onSuccess: (data) => {
      setPreview(data);
      setSelectedDocument(null);
      setPreviewModalOpen(true);
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
      lineItems: lines.map((line) => ({ ...line, gstRate: overallGstRate }))
    }),
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: ['billingDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setSelectedDocument(document);
      setPreviewModalOpen(true);
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
      setPreviewModalOpen(true);
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
      setPreviewModalOpen(true);
      window.setTimeout(() => window.print(), 50);
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
      >
        <select value={copyType} onChange={(event) => setCopyType(event.target.value as BillingCopyType)} className={`${inputClass} w-44 print:hidden`}>
          <option value="CUSTOMER_COPY">Customer Copy</option>
          <option value="STORE_COPY">Store Copy</option>
          <option value="OFFICE_COPY">Office Copy</option>
        </select>
        <button
          onClick={() => {
            setPreviewModalOpen(true);
            window.setTimeout(() => window.print(), 50);
          }}
          className="rounded-lg border border-slate-200 bg-white p-3 text-slate-600 hover:bg-slate-50 print:hidden"
          title="Print"
        >
          <Printer className="w-4 h-4" />
        </button>
        <button
          onClick={downloadPdf}
          className="rounded-lg border border-slate-200 bg-white p-3 text-slate-600 hover:bg-slate-50 print:hidden"
          title="Download PDF"
        >
          <FileDown className="w-4 h-4" />
        </button>
      </SectionHeader>

      {message && <Alert message={message} type="success" onClose={() => setMessage(null)} />}
      {errorMessage && <Alert message={errorMessage} type="error" onClose={() => setErrorMessage(null)} />}

      <div className="grid grid-cols-1 gap-6">
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
              <button
                onClick={() => setLines((current) => [...current, emptyLine()])}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                title="Add line"
                aria-label="Add line"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-lg border border-slate-100">
              <div className="hidden grid-cols-[150px_minmax(240px,1fr)_72px_72px_100px_170px_44px] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 xl:grid">
                <span>Item</span>
                <span>Description</span>
                <span>Qty</span>
                <span>Days</span>
                <span>Rate</span>
                <span>Discount</span>
                <span />
              </div>

              <div className="divide-y divide-slate-100">
                {lines.map((line, index) => (
                  <div key={index} className="grid gap-3 p-3 xl:grid-cols-[150px_minmax(240px,1fr)_72px_72px_100px_170px_44px] xl:items-start xl:gap-2">
                    <label className="flex flex-col gap-1 xl:block">
                      <span className={`${labelClass} xl:hidden`}>Item</span>
                      <select value={line.itemCode} onChange={(event) => applyItemToLine(index, event.target.value)} className={pricingInputClass}>
                        <option value="">Custom</option>
                        {initialItems.map((item) => (
                          <option key={item.itemCode} value={item.itemCode}>{item.itemCode}</option>
                        ))}
                      </select>
                    </label>

                    <label className="flex min-w-0 flex-col gap-1 xl:block">
                      <span className={`${labelClass} xl:hidden`}>Description</span>
                      <input value={line.description} onChange={(event) => updateLine(index, { description: event.target.value })} className={pricingInputClass} title={line.description} />
                    </label>

                    <label className="flex flex-col gap-1 xl:block">
                      <span className={`${labelClass} xl:hidden`}>Qty</span>
                      <input type="number" min="1" value={emptyNumberValue(line.quantity)} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })} className={pricingInputClass} />
                    </label>

                    <label className="flex flex-col gap-1 xl:block">
                      <span className={`${labelClass} xl:hidden`}>Days</span>
                      <input type="number" min="1" value={emptyNumberValue(line.rentalDays)} onChange={(event) => updateLine(index, { rentalDays: Number(event.target.value) })} className={pricingInputClass} />
                    </label>

                    <label className="flex flex-col gap-1 xl:block">
                      <span className={`${labelClass} xl:hidden`}>Rate</span>
                      <input type="number" min="0" value={emptyNumberValue(line.unitRate)} onChange={(event) => updateLine(index, { unitRate: Number(event.target.value) })} className={pricingInputClass} />
                    </label>

                    <label className="flex flex-col gap-1 xl:block">
                      <span className={`${labelClass} xl:hidden`}>Discount</span>
                      <div className="grid grid-cols-[minmax(0,1fr)_58px] gap-2">
                        <input type="number" min="0" value={emptyNumberValue(line.discountValue)} onChange={(event) => updateLine(index, { discountValue: Number(event.target.value) })} className={pricingInputClass} />
                        <select value={line.discountType} onChange={(event) => updateLine(index, { discountType: event.target.value as DraftLine['discountType'] })} className={pricingInputClass}>
                          <option value="FLAT">Rs</option>
                          <option value="PERCENTAGE">%</option>
                        </select>
                      </div>
                    </label>

                    <button onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} className="flex h-12 items-center justify-center rounded-lg text-red-500 hover:bg-red-50" title="Remove line">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[160px] gap-3 mt-4">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Overall GST %</span>
                <input type="number" min="0" value={overallGstRate} onChange={(event) => setOverallGstRate(Number(event.target.value))} className={inputClass} />
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
                <button
                  key={document._id}
                  onClick={() => {
                    setSelectedDocument(document);
                    setPreviewModalOpen(true);
                  }}
                  className="py-3 text-left flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg"
                >
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

      {previewModalOpen && showPreviewPanel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 print:static print:block print:bg-white print:p-0">
          <button className="absolute inset-0 print:hidden" onClick={() => setPreviewModalOpen(false)} aria-label="Close invoice preview" />
          <div className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 print:hidden">
              <div>
                <h3 className="text-base font-black text-slate-900">Invoice Preview</h3>
                <p className="text-sm text-slate-500">{copyType.replace('_', ' ')}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" title="Print">
                  <Printer className="h-4 w-4" />
                </button>
                <button onClick={downloadPdf} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" title="Download PDF">
                  <FileDown className="h-4 w-4" />
                </button>
                <button onClick={() => setPreviewModalOpen(false)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" title="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-6 print:overflow-visible print:p-0">
              <div id="billing-preview" className="mx-auto max-w-4xl bg-white print:max-w-none">
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
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
