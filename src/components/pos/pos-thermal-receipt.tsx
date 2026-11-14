'use client';

import { useState } from 'react';
import { Printer, MessageSquare, Mail, X, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { zar } from '@/lib/pos/client';

export interface ThermalReceiptData {
  receiptNumber: string;
  date: string;
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  vatNumber?: string;
  vatRegistered?: boolean;
  customerName?: string;
  customerVatNumber?: string;
  customerPhone?: string;
  cashierName?: string;
  shiftId?: string;
  lines: Array<{
    name: string;
    quantity: number;
    unitPriceCents: number;
    discountCents?: number;
    totalCents: number;
    unit?: string;
  }>;
  subtotalCents: number;
  discountCents: number;
  vatCents: number;
  totalCents: number;
  paymentMethod: string;
  tenderCents?: number;
  changeCents?: number;
  authCode?: string;
  offline?: boolean;
}

interface PosThermalReceiptProps {
  receipt: ThermalReceiptData;
  onClose?: () => void;
  onNewSale?: () => void;
}

export function PosThermalReceipt({ receipt, onClose, onNewSale }: PosThermalReceiptProps) {
  const [waPhone, setWaPhone] = useState(receipt.customerPhone || '');
  const [waSent, setWaSent] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    if (!waPhone.trim()) return;
    const cleanPhone = waPhone.replace(/\D/g, '');
    const phoneWithCode = cleanPhone.startsWith('0') ? `27${cleanPhone.slice(1)}` : cleanPhone;
    
    const itemsList = receipt.lines
      .map((l) => `• ${l.quantity}x ${l.name} - ${zar(l.totalCents)}`)
      .join('\n');

    const msg = encodeURIComponent(
      `*${receipt.businessName.toUpperCase()} - TAX INVOICE*\n` +
      `Receipt: ${receipt.receiptNumber}\n` +
      `Date: ${receipt.date}\n` +
      (receipt.cashierName ? `Cashier: ${receipt.cashierName}\n` : '') +
      `--------------------------------\n` +
      `${itemsList}\n` +
      `--------------------------------\n` +
      `Subtotal (Excl. VAT): ${zar(receipt.subtotalCents - receipt.vatCents)}\n` +
      `VAT (15%): ${zar(receipt.vatCents)}\n` +
      `*TOTAL: ${zar(receipt.totalCents)}*\n` +
      `Paid via: ${receipt.paymentMethod.toUpperCase()}` +
      (receipt.changeCents && receipt.changeCents > 0 ? `\nChange: ${zar(receipt.changeCents)}` : '') +
      `\n\n_Verified by VerifiedBizLink.co.za_`
    );

    window.open(`https://wa.me/${phoneWithCode}?text=${msg}`, '_blank');
    setWaSent(true);
  };

  return (
    <div className="space-y-4">
      {/* Action Toolbar (Hidden during Print) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-9 text-xs flex items-center gap-1.5 rounded-lg shadow-sm"
          >
            <Printer className="h-4 w-4" /> Print 80mm Receipt
          </Button>
          {onNewSale && (
            <Button
              onClick={onNewSale}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black h-9 text-xs rounded-lg shadow-sm"
            >
              New Sale (Enter)
            </Button>
          )}
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-slate-500 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Digital Dispatch Controls (Hidden during Print) */}
      <div className="print:hidden grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-1.5">
          <Input
            placeholder="Cell e.g. 0821234567"
            value={waPhone}
            onChange={(e) => setWaPhone(e.target.value)}
            className="h-8 text-xs font-mono"
          />
          <Button
            onClick={handleWhatsApp}
            disabled={!waPhone}
            className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 flex items-center gap-1"
          >
            {waSent ? <CheckCircle2 className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
            WhatsApp
          </Button>
        </div>
        <div className="flex items-center gap-1.5">
          <Input
            placeholder="customer@email.co.za"
            type="email"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            className="h-8 text-xs font-mono"
          />
          <Button
            onClick={() => setEmailSent(true)}
            disabled={!emailTo}
            variant="outline"
            className="h-8 text-xs font-bold shrink-0 flex items-center gap-1"
          >
            {emailSent ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Mail className="h-3.5 w-3.5" />}
            Email Invoice
          </Button>
        </div>
      </div>

      {/* The Printable Thermal Receipt (80mm Width format) */}
      <div className="thermal-receipt mx-auto max-w-[340px] bg-white text-slate-950 p-6 rounded-xl border border-slate-200 shadow-inner font-mono text-[12px] leading-relaxed print:max-w-none print:w-[80mm] print:p-2 print:border-none print:shadow-none">
        {/* Header */}
        <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-3">
          <p className="text-sm font-black tracking-wider uppercase">{receipt.businessName}</p>
          <p className="text-[10px] text-slate-600 font-bold tracking-widest uppercase">
            {receipt.vatRegistered ? 'SARS TAX INVOICE' : 'SALES RECEIPT'}
          </p>
          {receipt.businessAddress && <p className="text-[10px] text-slate-600">{receipt.businessAddress}</p>}
          {receipt.businessPhone && <p className="text-[10px] text-slate-600">Tel: {receipt.businessPhone}</p>}
          {receipt.vatNumber && (
            <p className="text-[10px] font-bold text-slate-700">VAT Reg: {receipt.vatNumber}</p>
          )}
        </div>

        {/* Metadata */}
        <div className="py-2.5 border-b border-dashed border-slate-300 space-y-0.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-500">Invoice #:</span>
            <span className="font-bold">{receipt.receiptNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Date:</span>
            <span>{receipt.date}</span>
          </div>
          {receipt.cashierName && (
            <div className="flex justify-between">
              <span className="text-slate-500">Cashier:</span>
              <span>{receipt.cashierName}</span>
            </div>
          )}
          {receipt.customerName && (
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-bold">{receipt.customerName}</span>
            </div>
          )}
          {receipt.customerVatNumber && (
            <div className="flex justify-between">
              <span className="text-slate-500">Cust VAT:</span>
              <span className="font-bold">{receipt.customerVatNumber}</span>
            </div>
          )}
          {receipt.offline && (
            <div className="flex justify-between text-amber-700 font-bold">
              <span>Mode:</span>
              <span>OFFLINE TILL TRANSACTION</span>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="py-2.5 border-b border-dashed border-slate-300">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[9px]">
                <th className="py-1">Description</th>
                <th className="py-1 text-center">Qty</th>
                <th className="py-1 text-right">Price</th>
                <th className="py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipt.lines.map((item, idx) => (
                <tr key={idx} className="align-top">
                  <td className="py-1 pr-1 font-sans font-medium text-[11px] leading-tight text-slate-900">
                    {item.name}
                    {item.discountCents && item.discountCents > 0 ? (
                      <span className="block text-[9px] text-amber-600 font-mono">
                        (Disc -{zar(item.discountCents)})
                      </span>
                    ) : null}
                  </td>
                  <td className="py-1 text-center text-slate-600">{item.quantity}</td>
                  <td className="py-1 text-right text-slate-600">{zar(item.unitPriceCents)}</td>
                  <td className="py-1 text-right font-bold text-slate-900">{zar(item.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Tax Calculation (15% SARS VAT) */}
        <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal (Excl. VAT):</span>
            <span>{zar(receipt.subtotalCents - receipt.vatCents)}</span>
          </div>
          {receipt.discountCents > 0 && (
            <div className="flex justify-between text-amber-600">
              <span>Total Discount:</span>
              <span>-{zar(receipt.discountCents)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span>Standard VAT (15%):</span>
            <span>{zar(receipt.vatCents)}</span>
          </div>
          <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-200">
            <span>GRAND TOTAL:</span>
            <span>{zar(receipt.totalCents)}</span>
          </div>
        </div>

        {/* Tender & Payment Info */}
        <div className="py-2.5 border-b border-dashed border-slate-300 space-y-0.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-500">Payment Tender:</span>
            <span className="font-bold uppercase">{receipt.paymentMethod}</span>
          </div>
          {receipt.tenderCents !== undefined && (
            <div className="flex justify-between text-slate-600">
              <span>Cash Tendered:</span>
              <span>{zar(receipt.tenderCents)}</span>
            </div>
          )}
          {receipt.changeCents !== undefined && receipt.changeCents > 0 && (
            <div className="flex justify-between font-black text-emerald-800 text-xs">
              <span>Change Due:</span>
              <span>{zar(receipt.changeCents)}</span>
            </div>
          )}
          {receipt.authCode && (
            <div className="flex justify-between text-slate-500 text-[10px]">
              <span>Card Auth Code:</span>
              <span>{receipt.authCode}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 text-center space-y-1 text-[10px] text-slate-500">
          <p className="font-bold text-slate-700">Thank you for your business!</p>
          <p>Goods may be returned within 14 days with this original receipt.</p>
          <div className="pt-2 flex items-center justify-center gap-1 text-[9px] text-slate-400">
            <ShieldCheck className="h-3 w-3 text-amber-600" />
            <span>Verified by VerifiedBizLink.co.za</span>
          </div>
        </div>
      </div>
    </div>
  );
}
