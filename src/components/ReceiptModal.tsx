import React, { useState, useRef } from 'react';
import {
  Printer,
  X,
  Share2,
  Copy,
  Check,
  Coffee,
  Heart,
  Sparkles,
  Wifi,
  Download,
  Receipt,
  ChefHat,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { PlacedOrder } from './OrderStatusView.tsx';
import { BaristaOrder } from './BaristaKDSView.tsx';
import { NawatigaLogo } from './NawatigaLogo.tsx';

export interface ReceiptItemNormalized {
  name: string;
  quantity: number;
  price: number;
  totalPrice: number;
  notes?: string;
  customizations?: string[];
}

export interface ReceiptNormalizedData {
  orderNumber: string;
  tableNumber: string;
  dateStr: string;
  timeStr: string;
  items: ReceiptItemNormalized[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  cashierName: string;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Can receive either PlacedOrder or BaristaOrder or null
  customerOrder?: PlacedOrder | null;
  baristaOrder?: BaristaOrder | null;
  initialMode?: 'customer' | 'kitchen';
}

export const normalizeOrder = (
  custOrder?: PlacedOrder | null,
  barOrder?: BaristaOrder | null
): ReceiptNormalizedData => {
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  if (custOrder) {
    const rawItems = custOrder.items || [];
    const items: ReceiptItemNormalized[] = rawItems.map((ci) => {
      const customizations: string[] = [];
      if (ci.sugarLevel) customizations.push(`Gula: ${ci.sugarLevel}`);
      if (ci.milkType && ci.milkType.id !== 'regular') customizations.push(`Susu: ${ci.milkType.label}`);
      if (ci.iceLevel) customizations.push(`Es: ${ci.iceLevel}`);
      if (ci.notes) customizations.push(`Catatan: "${ci.notes}"`);

      const singlePrice = ci.menuItem ? ci.menuItem.price + (ci.milkType?.price || 0) : Math.round(ci.itemTotalPrice / Math.max(ci.quantity, 1));

      return {
        name: ci.menuItem?.name || 'Menu Pilihan Nawatiga',
        quantity: ci.quantity,
        price: singlePrice,
        totalPrice: ci.itemTotalPrice,
        notes: ci.notes,
        customizations,
      };
    });

    const total = custOrder.totalAmount;
    // Calculate 10% PB1 tax and 5% service included in the final bill
    const subtotal = Math.round(total / 1.1);
    const tax = total - subtotal;
    const serviceCharge = 0; // included in pricing

    return {
      orderNumber: custOrder.orderNumber,
      tableNumber: custOrder.tableNumber,
      dateStr: dateFormatted,
      timeStr: custOrder.createdAt || now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      items,
      subtotal,
      tax,
      serviceCharge,
      total,
      paymentMethod: custOrder.paymentMethod || 'QRIS Dinamis',
      paymentStatus:
        custOrder.paymentStatus === 'pay_later' ||
        custOrder.paymentStatus === 'unpaid' ||
        /kasir|nanti|open bill/i.test(custOrder.paymentMethod || '')
          ? 'BELUM LUNAS (BAYAR NANTI / DI KASIR)'
          : 'LUNAS (PAID)',
      cashierName: 'Self-Order QR / Barista Dimas',
    };
  }

  if (barOrder) {
    const rawItems = barOrder.items || [];
    const items: ReceiptItemNormalized[] = rawItems.map((bi) => ({
      name: bi.name,
      quantity: bi.quantity,
      price: bi.price || Math.round(barOrder.totalAmount / Math.max(bi.quantity, 1)),
      totalPrice: (bi.price || Math.round(barOrder.totalAmount / Math.max(bi.quantity, 1))) * bi.quantity,
      notes: bi.notes,
      customizations: bi.notes ? [bi.notes] : [],
    }));

    const total = barOrder.totalAmount;
    const subtotal = Math.round(total / 1.1);
    const tax = total - subtotal;
    const isPayLater =
      barOrder.paymentStatus === 'pay_later' ||
      barOrder.paymentStatus === 'unpaid' ||
      /nanti|kasir|open bill/i.test(barOrder.paymentMethod || '');

    return {
      orderNumber: barOrder.orderNumber,
      tableNumber: barOrder.tableNumber,
      dateStr: dateFormatted,
      timeStr: barOrder.createdAt || now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      items,
      subtotal,
      tax,
      serviceCharge: 0,
      total,
      paymentMethod: barOrder.paymentMethod || 'QRIS',
      paymentStatus: isPayLater ? 'BELUM LUNAS (BAYAR NANTI / OPEN BILL)' : 'LUNAS (PAID)',
      cashierName: 'POS Barista Nawatiga',
    };
  }

  // Fallback sample data
  return {
    orderNumber: 'NWT-SAMPLE',
    tableNumber: '07',
    dateStr: dateFormatted,
    timeStr: '15:30',
    items: [
      {
        name: 'Signature Palm Sugar Latte',
        quantity: 2,
        price: 38000,
        totalPrice: 76000,
        customizations: ['Gula: Less Sugar (50%)', 'Susu: Oat Milk (Oatly)'],
      },
      {
        name: 'Truffle Parmesan Fries',
        quantity: 1,
        price: 35000,
        totalPrice: 35000,
        customizations: ['Catatan: Saus aioli dipisah'],
      },
    ],
    subtotal: 100909,
    tax: 10091,
    serviceCharge: 0,
    total: 111000,
    paymentMethod: 'QRIS Dinamis',
    paymentStatus: 'LUNAS (PAID)',
    cashierName: 'Self-Order QR / Barista Dimas',
  };
};

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  customerOrder,
  baristaOrder,
  initialMode = 'customer',
}) => {
  const [mode, setMode] = useState<'customer' | 'kitchen'>(initialMode);
  const [copied, setCopied] = useState<boolean>(false);
  const receiptPrintRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const data = normalizeOrder(customerOrder, baristaOrder);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = async () => {
    const textReceipt = `
=========================================
          NAWATIGA COFFEE & ROASTERY     
   Specialty Coffee · Kitchen · Slow Bar 
      Jl. Senopati No. 43, Jakarta       
=========================================
No. Struk : #${data.orderNumber}
Meja      : MEJA #${data.tableNumber} (Dine-In)
Waktu     : ${data.dateStr}, ${data.timeStr} WIB
Kasir     : ${data.cashierName}
Status    : ${data.paymentStatus} (${data.paymentMethod})
-----------------------------------------
RINCIAN PESANAN:
${data.items
  .map(
    (item) =>
      `${item.quantity}x ${item.name} = Rp ${item.totalPrice.toLocaleString('id-ID')}${
        item.customizations && item.customizations.length > 0
          ? '\n   ' + item.customizations.join(' | ')
          : ''
      }`
  )
  .join('\n')}
-----------------------------------------
Subtotal          : Rp ${data.subtotal.toLocaleString('id-ID')}
PB1 Resto (10%)   : Rp ${data.tax.toLocaleString('id-ID')}
TOTAL PEMBAYARAN  : Rp ${data.total.toLocaleString('id-ID')}
-----------------------------------------
WIFI CAFE: NAWATIGA_GUESTS (Pass: kopienakbanget)
-----------------------------------------
UCAPAN TERIMA KASIH:
"Terima kasih banyak telah ngopi bersama kami!
Setiap tetes kopi kami diracik dengan dedikasi
penuh dari biji kopi pilihan petani Nusantara.
Semoga hari Kakak menyenangkan & penuh inspirasi! ☕✨"
Instagram: @nawatiga.coffee
=========================================
    `.trim();

    try {
      await navigator.clipboard.writeText(textReceipt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleShareWhatsApp = () => {
    const msg = encodeURIComponent(
      `*STRUK PEMBELIAN NAWATIGA COFFEE & ROASTERY* ☕\n\n` +
      `No: #${data.orderNumber} (Meja #${data.tableNumber})\nWaktu: ${data.dateStr} ${data.timeStr}\nTotal: *Rp ${data.total.toLocaleString('id-ID')}* (${data.paymentMethod} - LUNAS)\n\n` +
      `*Menu Dipesan:*\n` +
      data.items.map(i => `• ${i.quantity}x ${i.name} (Rp ${i.totalPrice.toLocaleString('id-ID')})`).join('\n') +
      `\n\n_Terima kasih telah berkunjung ke Nawatiga Coffee! Semoga harimu menyenangkan & penuh inspirasi!_ ✨`
    );
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      {/* Print-specific style */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-thermal-receipt, #printable-thermal-receipt * {
            visibility: visible !important;
          }
          #printable-thermal-receipt {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            padding: 4mm !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
          }
          #printable-thermal-receipt img {
            display: block !important;
            margin-left: auto !important;
            margin-right: auto !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="w-full max-w-md bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        {/* Modal Top Bar */}
        <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-800/80 border border-zinc-700/80 shadow-sm flex items-center justify-center flex-shrink-0">
              <NawatigaLogo variant="dark" size="xs" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>Struk Transaksi Digital</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  RESMI
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                Order #{data.orderNumber} · {data.tableNumber === 'BAR' || /bar|kasir/i.test(data.tableNumber) ? 'Bar / Kasir Counter' : `Meja #${data.tableNumber}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Mode Switch (Struk Konsumen vs Tiket Barista) */}
            <div className="bg-zinc-950 p-1 rounded-xl border border-zinc-800 flex items-center text-xs">
              <button
                type="button"
                onClick={() => setMode('customer')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  mode === 'customer'
                    ? 'bg-white text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Struk Konsumen
              </button>
              <button
                type="button"
                onClick={() => setMode('kitchen')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  mode === 'kitchen'
                    ? 'bg-white text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Tiket Bar (KOT)
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-zinc-850 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-zinc-950 space-y-4">
          {/* Action Quick Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-900/90 p-2.5 rounded-2xl border border-zinc-800 text-xs">
            <span className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Simpan atau bagikan struk belanja ini:</span>
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyText}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Salin teks struk"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin!' : 'Salin'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Kirim ke WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                title="Cetak struk ke printer thermal atau PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Struk</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* THERMAL PAPER CONTAINER (REALISTIC LOOK & FEEL) */}
          {/* ========================================================================= */}
          <div className="relative mx-auto max-w-sm drop-shadow-2xl">
            {/* Top Serrated Edge (ZIG-ZAG CUT PAPER EFFECT) */}
            <div className="h-3 w-full bg-[#fcfbfa] relative overflow-hidden flex">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-zinc-950 flex-shrink-0"
                />
              ))}
            </div>

            {/* Main Thermal Receipt Paper Body */}
            <div
              id="printable-thermal-receipt"
              ref={receiptPrintRef}
              className="bg-[#fcfbfa] text-zinc-900 font-mono text-xs p-5 sm:p-6 space-y-4 shadow-xl select-text"
              style={{
                letterSpacing: '-0.015em',
              }}
            >
              {mode === 'kitchen' ? (
                /* ========================================================================= */
                /* KITCHEN / BARISTA TICKET VIEW (KOT) */
                /* ========================================================================= */
                <div className="space-y-4">
                  <div className="text-center border-b-2 border-dashed border-zinc-900 pb-3">
                    <div className="flex justify-center mb-1.5">
                      <NawatigaLogo variant="light" size="sm" />
                    </div>
                    <div className="text-[11px] font-black tracking-widest text-zinc-600 uppercase">
                      NAWATIGA BAR & KITCHEN TICKET
                    </div>
                    <div className="text-3xl font-black tracking-tight text-zinc-950 my-1">
                      {data.tableNumber === 'BAR' || /bar|kasir/i.test(data.tableNumber)
                        ? 'BAR / KASIR'
                        : `MEJA #${data.tableNumber}`}
                    </div>
                    <div className="text-xs font-bold text-zinc-800">
                      #{data.orderNumber} · {data.timeStr} WIB
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-1 uppercase font-semibold">
                      [ DINE-IN · SELF-SERVICE PICK-UP ]
                    </div>
                  </div>

                  {/* KITCHEN ITEMS LIST */}
                  <div className="divide-y-2 divide-dashed divide-zinc-400 space-y-3 py-1">
                    {data.items.map((item, idx) => (
                      <div key={idx} className="pt-2 space-y-1">
                        <div className="flex items-start justify-between">
                          <span className="text-sm font-black text-zinc-950 leading-tight">
                            [{item.quantity}X] {item.name.toUpperCase()}
                          </span>
                          <span className="w-5 h-5 border-2 border-zinc-850 rounded flex-shrink-0 mt-0.5 ml-2" />
                        </div>

                        {item.customizations && item.customizations.length > 0 && (
                          <div className="bg-zinc-150 p-2 rounded border border-zinc-300 space-y-1 text-xs font-bold text-zinc-900">
                            {item.customizations.map((c, cIdx) => (
                              <div key={cIdx} className="flex items-center gap-1.5">
                                <span className="text-black font-black">››</span>
                                <span>{c}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="border-t-2 border-dashed border-zinc-900 pt-3 text-center space-y-1">
                    <div className="text-xs font-black uppercase text-zinc-900">
                      TOTAL: {data.items.reduce((acc, i) => acc + i.quantity, 0)} ITEM RACIKAN
                    </div>
                    <div className="text-[10px] text-zinc-600">
                      Status Bayar: {data.paymentMethod} ({data.paymentStatus})
                    </div>
                    <div className="text-[9px] text-zinc-500 pt-1">
                      *** TEKAN "PESANAN SIAP" DI KDS AGAR HP TAMU BERDERING ***
                    </div>
                  </div>
                </div>
              ) : (
                /* ========================================================================= */
                /* CUSTOMER RECEIPT VIEW */
                /* ========================================================================= */
                <>
                  {/* BRAND HEADER */}
                  <div className="text-center space-y-1">
                    <div className="flex justify-center mb-1">
                      <NawatigaLogo variant="light" size="lg" />
                    </div>
                    <h1 className="font-extrabold text-base tracking-[0.18em] text-zinc-950 leading-tight uppercase font-serif">
                      NAWATIGA
                    </h1>
                    <p className="text-[10px] text-zinc-700 font-semibold italic tracking-wide">
                      by Rose Garden Coffee
                    </p>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">
                      Specialty Coffee · Artisan Kitchen · Slow Bar
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      Jl. Senopati No. 43, Kebayoran Baru, Jakarta Selatan
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      WA: 0812-9876-5432 · IG: @nawatiga.coffee
                    </p>
                    <p className="text-[9px] text-zinc-400">
                      NPWPD: 02.948.192.3-014.000 (Izin Resto & Kafe)
                    </p>
                  </div>

                  {/* DOUBLE DASHED DIVIDER */}
                  <div className="border-b-2 border-dashed border-zinc-400" />

                  {/* RECEIPT METADATA */}
                  <div className="space-y-1 text-[11px] leading-tight">
                    <div className="flex justify-between">
                      <span className="text-zinc-600">No. Bukti Transaksi:</span>
                      <span className="font-bold text-zinc-950">#{data.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Waktu & Tanggal:</span>
                      <span className="text-zinc-800">{data.dateStr}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Jam Pemesanan:</span>
                      <span className="text-zinc-800">{data.timeStr} WIB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Kasir / Terminal:</span>
                      <span className="text-zinc-800">{data.cashierName}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-dashed border-zinc-300">
                      <span className="text-zinc-600 font-bold">LOKASI MEJA:</span>
                      <span className="px-2 py-0.5 bg-zinc-900 text-white font-black text-xs rounded">
                        {data.tableNumber === 'BAR' || /bar|kasir/i.test(data.tableNumber)
                          ? 'BAR / KASIR COUNTER (WALK-IN)'
                          : `MEJA #${data.tableNumber} (DINE-IN)`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-600">Metode Bayar:</span>
                      <span className={`font-bold uppercase flex items-center gap-1 ${
                        data.paymentStatus.includes('BELUM LUNAS') ? 'text-amber-800' : 'text-emerald-800'
                      }`}>
                        <ShieldCheck className="w-3 h-3" />
                        <span>{data.paymentMethod} · {data.paymentStatus}</span>
                      </span>
                    </div>
                  </div>

                  {/* SOLID DIVIDER WITH COLUMN HEADERS */}
                  <div className="border-t border-b border-zinc-900 py-1.5 flex justify-between text-[11px] font-black uppercase">
                    <span className="w-1/2">Menu Item</span>
                    <span className="w-1/6 text-center">Qty</span>
                    <span className="w-1/3 text-right">Total</span>
                  </div>

                  {/* ITEM LIST */}
                  <div className="divide-y divide-dashed divide-zinc-300 space-y-2 py-1">
                    {data.items.map((item, idx) => (
                      <div key={idx} className="pt-1.5 space-y-0.5">
                        <div className="flex justify-between items-start text-xs font-bold text-zinc-950">
                          <span className="w-1/2 leading-tight">{item.name}</span>
                          <span className="w-1/6 text-center text-zinc-700 font-semibold">{item.quantity}x</span>
                          <span className="w-1/3 text-right font-bold">
                            Rp {item.totalPrice.toLocaleString('id-ID')}
                          </span>
                        </div>

                        {/* Unit price indicator */}
                        <div className="text-[10px] text-zinc-500">
                          @ Rp {item.price.toLocaleString('id-ID')}
                        </div>

                        {/* Customization Details & Barista Notes */}
                        {item.customizations && item.customizations.length > 0 && (
                          <div className="text-[10px] text-zinc-700 bg-zinc-100 p-1.5 rounded border border-zinc-250 space-y-0.5 mt-1 font-sans">
                            {item.customizations.map((c, cIdx) => (
                              <div key={cIdx} className="flex items-center gap-1">
                                <span className="text-zinc-400 font-mono">›</span>
                                <span>{c}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* FINANCIAL CALCULATION SECTION */}
                  <div className="border-t-2 border-dashed border-zinc-400 pt-2 space-y-1.5 text-xs">
                    <div className="flex justify-between text-zinc-600 text-[11px]">
                      <span>Subtotal Pesanan:</span>
                      <span>Rp {data.subtotal.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-zinc-600 text-[11px]">
                      <span>Pajak Restoran (PB1 10%):</span>
                      <span>Rp {data.tax.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-zinc-600 text-[11px]">
                      <span>Biaya Layanan & Alat (Service):</span>
                      <span className="text-emerald-700 font-bold">GRATIS (Rp 0)</span>
                    </div>

                    <div className="border-t-2 border-zinc-900 pt-2 flex justify-between items-baseline font-black text-sm">
                      <span className="uppercase tracking-wide text-zinc-950">TOTAL AKHIR:</span>
                      <span className="text-base text-zinc-950 underline decoration-double">
                        Rp {data.total.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex justify-between text-[10px] text-zinc-600 pt-0.5">
                      <span>Status Pembayaran:</span>
                      <span className={`font-bold uppercase ${
                        data.paymentStatus.includes('BELUM LUNAS') ? 'text-amber-800' : 'text-zinc-900'
                      }`}>
                        {data.paymentMethod} — {data.paymentStatus.includes('BELUM LUNAS') ? 'BELUM LUNAS [BAYAR NANTI]' : 'LUNAS [PAID]'}
                      </span>
                    </div>
                  </div>

                  {/* WIFI & GUEST AMENITIES */}
                  <div className="bg-zinc-100/90 p-2.5 rounded-lg border border-dashed border-zinc-300 text-center space-y-1">
                    <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-zinc-800">
                      <Wifi className="w-3.5 h-3.5 text-zinc-700" />
                      <span>KONEKSI WI-FI GRATIS UNTUK TAMU</span>
                    </div>
                    <div className="text-[10px] text-zinc-600">
                      SSID: <strong className="text-zinc-900 font-bold">NAWATIGA_GUESTS</strong> · Pass: <strong className="text-zinc-900 font-bold">kopienakbanget</strong>
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* UCAPAN TERIMA KASIH (HEARTWARMING & AESTHETIC THANK YOU MESSAGE) */}
                  {/* ========================================================================= */}
                  <div className="border-t-2 border-dashed border-zinc-400 pt-3 text-center space-y-2.5">
                    <div className="flex items-center justify-center gap-1 text-zinc-800">
                      <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                      <span className="font-extrabold text-[12px] uppercase tracking-wide">
                        TERIMA KASIH TELAH BERKUNJUNG!
                      </span>
                      <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                    </div>

                    <p className="text-[11px] leading-relaxed text-zinc-700 font-sans italic px-1">
                      "Kopi & hidangan kami diracik dengan penuh cinta dari biji kopi pilihan petani Nusantara. Semoga kehangatan secangkir kopi ini menemani obrolan berharga, karya terbaik, dan hari indah Kakak."
                    </p>

                    <div className="space-y-1 text-[10px] text-zinc-600 font-mono">
                      <div className="font-semibold text-zinc-800">
                        ✨ Kami nantikan senyuman Kakak di kunjungan berikutnya! ✨
                      </div>
                      <div>
                        Tag momen ngopimu di Instagram: <strong className="text-zinc-900 font-bold">@nawatiga.coffee</strong>
                      </div>
                      <div className="text-[9px] text-zinc-500">
                        #NawatigaCoffee #NgopiSantai #SpecialtyCoffeeJakarta
                      </div>
                    </div>

                    {/* Aesthetic QR Code for Review / Promotion */}
                    <div className="pt-2 flex flex-col items-center justify-center space-y-1">
                      <div className="w-20 h-20 bg-white p-1.5 border border-zinc-400 rounded-lg shadow-sm flex items-center justify-center">
                        {/* SVG Vector QR Pattern for Thermal look */}
                        <svg viewBox="0 0 29 29" className="w-full h-full text-zinc-950 fill-current">
                          <rect width="29" height="29" fill="white" />
                          {/* Top-Left Position Detection Marker */}
                          <rect x="2" y="2" width="7" height="7" fill="black" />
                          <rect x="3" y="3" width="5" height="5" fill="white" />
                          <rect x="4" y="4" width="3" height="3" fill="black" />
                          {/* Top-Right Position Detection Marker */}
                          <rect x="20" y="2" width="7" height="7" fill="black" />
                          <rect x="21" y="3" width="5" height="5" fill="white" />
                          <rect x="22" y="4" width="3" height="3" fill="black" />
                          {/* Bottom-Left Position Detection Marker */}
                          <rect x="2" y="20" width="7" height="7" fill="black" />
                          <rect x="3" y="21" width="5" height="5" fill="white" />
                          <rect x="4" y="22" width="3" height="3" fill="black" />
                          {/* Decorative QR Data points */}
                          <rect x="11" y="2" width="2" height="3" fill="black" />
                          <rect x="15" y="3" width="2" height="2" fill="black" />
                          <rect x="10" y="6" width="3" height="2" fill="black" />
                          <rect x="14" y="7" width="2" height="2" fill="black" />
                          <rect x="11" y="11" width="7" height="7" fill="black" />
                          <rect x="12" y="12" width="5" height="5" fill="white" />
                          <rect x="13" y="13" width="3" height="3" fill="black" />
                          <rect x="2" y="11" width="3" height="2" fill="black" />
                          <rect x="6" y="12" width="2" height="3" fill="black" />
                          <rect x="2" y="15" width="4" height="2" fill="black" />
                          <rect x="20" y="11" width="3" height="2" fill="black" />
                          <rect x="24" y="12" width="3" height="3" fill="black" />
                          <rect x="20" y="15" width="2" height="3" fill="black" />
                          <rect x="11" y="20" width="3" height="2" fill="black" />
                          <rect x="15" y="21" width="2" height="4" fill="black" />
                          <rect x="11" y="24" width="2" height="3" fill="black" />
                          <rect x="20" y="20" width="4" height="2" fill="black" />
                          <rect x="25" y="22" width="2" height="4" fill="black" />
                          <rect x="21" y="25" width="3" height="2" fill="black" />
                        </svg>
                      </div>
                      <span className="text-[9px] text-zinc-500 font-mono text-center">
                        [ SCAN UNTUK FREE UPGRADE DI KUNJUNGAN BERIKUTNYA ]
                      </span>
                    </div>

                    <div className="text-[9px] text-zinc-400 pt-1 font-mono">
                      *** LAYANAN MANDIRI (SELF-SERVICE COUNTER) ***
                      <br />
                      Harap mengembalikan nampan & gelas ke Drop Station
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Serrated Edge (ZIG-ZAG CUT PAPER EFFECT) */}
            <div className="h-3 w-full bg-[#fcfbfa] relative overflow-hidden flex">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-zinc-950 flex-shrink-0"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-zinc-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Tersimpan aman di riwayat pesanan</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Struk Sekarang</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
