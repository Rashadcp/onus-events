import { Event } from '../../types';
import { DepartmentKey } from './representativeShared';

interface PrintSlipTemplateProps {
  currentEditingEvent: Partial<Event>;
  selectedPrintType: string;
  printItemsFiltered: PrintItemRef[];
  printTotals: { subTotal: number; tax: number; grandTotal: number };
  departments: { key: string; label: string }[];
}

type PrintItemRef = {
  itemId?: {
    name?: string;
    rentalRate?: number;
    department?: string; // Flexible: built-in or custom admin group key
  } | null;
  quantity: number;
};

export function PrintSlipTemplate({
  currentEditingEvent,
  selectedPrintType,
  printItemsFiltered,
  printTotals,
  departments,
}: PrintSlipTemplateProps) {
  
  // Format Date to proper Day Month Year numerical (DD/MM/YYYY)
  const formatDateDMY = (dateInput?: string | Date) => {
    if (!dateInput) return '';
    try {
      const d = new Date(dateInput);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return String(dateInput);
    }
  };

  const formattedDateStart = formatDateDMY(currentEditingEvent.eventDate?.start);
  const formattedDateEnd = formatDateDMY(currentEditingEvent.eventDate?.end);

  return (
    <div className="w-full text-slate-950 font-sans p-4 bg-white border border-slate-300 rounded-lg print-full-page">
      {/* Dynamic Style injection for premium print formatting */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            margin: 0 !important;
          }
          body {
            margin: 1.2cm !important;
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-full-page {
            border: none !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: calc(100vh - 2.4cm) !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            background: #ffffff !important;
            page-break-inside: avoid !important;
          }
          .print-header h2 {
            font-size: 26px !important;
            font-weight: 900 !important;
            letter-spacing: -0.025em !important;
            margin-bottom: 4px !important;
          }
          .print-header p {
            font-size: 11px !important;
          }
          .print-details {
            font-size: 12px !important;
            margin-top: 14px !important;
            margin-bottom: 18px !important;
            padding-top: 10px !important;
            padding-bottom: 10px !important;
            border-top: 2px solid #000000 !important;
            border-bottom: 2px solid #000000 !important;
          }
          .print-table th {
            padding-top: 8px !important;
            padding-bottom: 8px !important;
            font-size: 12px !important;
            font-weight: 800 !important;
            border-bottom: 2px solid #1e293b !important;
          }
          .print-table td {
            padding-top: 8px !important;
            padding-bottom: 8px !important;
            font-size: 12px !important;
            border-bottom: 1px solid #e2e8f0 !important;
          }
          .print-totals {
            font-size: 12px !important;
            margin-top: 18px !important;
          }
          .print-signatures {
            margin-top: auto !important;
            padding-top: 40px !important;
          }
        }
      `}} />

      <div className="print-header text-center mb-6">
        <img src="/logo.png" alt="Onus Events" className="h-14 mx-auto mb-2" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Order Billing & Slip</p>
        <p className="text-[10px] text-slate-400 mt-0.5 font-bold">Email: office@onusevent.com</p>
      </div>

      <div className="print-details border-t border-b border-slate-200 py-3 mb-4 grid grid-cols-2 gap-4 text-xs font-semibold">
        <div>
          <p><span className="text-slate-500 font-bold">Client Name:</span> <strong className="text-slate-900 font-extrabold">{currentEditingEvent.customerName || 'N/A'}</strong></p>
          <p><span className="text-slate-500 font-bold">Venue / Place:</span> <strong className="text-slate-900 font-extrabold">{currentEditingEvent.place || 'N/A'}</strong></p>
          <p><span className="text-slate-500 font-bold">Program:</span> <strong className="text-slate-900 font-extrabold">{currentEditingEvent.program || 'N/A'}</strong></p>
        </div>
        <div className="text-right">
          <p><span className="text-slate-500 font-bold">Slip Category:</span> <strong className="text-blue-700 font-extrabold uppercase">{selectedPrintType.replace('_', ' ')}</strong></p>
          <p><span className="text-slate-500 font-bold">Start Date:</span> <strong className="text-slate-900 font-extrabold">{formattedDateStart || 'N/A'}</strong></p>
          <p><span className="text-slate-500 font-bold">End Date:</span> <strong className="text-slate-900 font-extrabold">{formattedDateEnd || 'N/A'}</strong></p>
        </div>
      </div>

      <table className="print-table w-full text-left text-xs mb-6 border-collapse">
        <thead>
          <tr className="border-b border-slate-300 text-slate-500 font-bold">
            <th className="py-2 font-extrabold uppercase">Item Details</th>
            <th className="py-2 font-extrabold uppercase">Department</th>
            <th className="py-2 font-extrabold uppercase text-right">Quantity</th>
            <th className="py-2 font-extrabold uppercase text-right">Rate</th>
            <th className="py-2 font-extrabold uppercase text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {printItemsFiltered.map((itemRef, idx) => {
            const dbItem = itemRef.itemId;
            if (!dbItem) return null;
            const rentalRate = dbItem.rentalRate || 0;
            const itemTotal = itemRef.quantity * rentalRate;
            return (
              <tr key={idx} className="border-b border-slate-100">
                <td className="py-2 font-bold text-slate-900">{dbItem.name}</td>
                <td className="py-2 font-semibold text-slate-600">
                  {departments.find(d => d.key === dbItem.department)?.label || dbItem.department}
                </td>
                <td className="py-2 text-right font-bold text-slate-800">{itemRef.quantity}</td>
                <td className="py-2 text-right text-slate-700">Rs. {rentalRate.toLocaleString()}</td>
                <td className="py-2 text-right font-bold text-slate-900">Rs. {itemTotal.toLocaleString()}</td>
              </tr>
            );
          })}
          {printItemsFiltered.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">
                No items are confirmed or matching this billing slip print filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {printItemsFiltered.length > 0 && (
        <div className="print-totals flex justify-end text-xs font-semibold">
          <div className="w-64 space-y-2">
            <div className="flex justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-500 font-bold">Subtotal:</span>
              <span className="text-slate-900 font-bold">Rs. {printTotals.subTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-500 font-bold">GST (18%):</span>
              <span className="text-slate-900 font-bold">Rs. {printTotals.tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-250">
              <span className="text-slate-900 font-black">Grand Total:</span>
              <span className="text-slate-900 text-base font-black">Rs. {printTotals.grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      <div className="print-signatures mt-12 pt-6 border-t border-slate-200 flex justify-between text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
        <div>Client Signature</div>
        <div className="text-right">Authorized ERP Seal</div>
      </div>
    </div>
  );
}
