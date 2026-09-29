import React, { useState } from 'react';
import { CheckCircle2, Clock, Utensils, Coffee, Bell, ArrowRight, Sparkles, ChefHat, Volume2, MapPin, AlertCircle, Receipt } from 'lucide-react';
import { CartItem } from './ItemCustomizerModal.tsx';
import { MENU_ITEMS } from '../data/menu.ts';
import { playCustomerPickupPager, triggerDeviceVibration } from '../utils/audio.ts';
import { ReceiptModal } from './ReceiptModal.tsx';

export interface PlacedOrder {
  id?: string;
  orderNumber: string;
  tableNumber: string;
  items: CartItem[];
  totalAmount: number;
  paymentMethod: string;
  paymentStatus?: 'paid' | 'unpaid' | 'pay_later';
  createdAt: string;
  status: 'received' | 'preparing' | 'serving' | 'completed';
}

interface OrderStatusViewProps {
  orders: PlacedOrder[];
  onOpenMenu: () => void;
  onOpenCallWaiter: () => void;
  onSimulatePickupAlert?: (order: PlacedOrder) => void;
}

export const OrderStatusView: React.FC<OrderStatusViewProps> = ({
  orders,
  onOpenMenu,
  onOpenCallWaiter,
  onSimulatePickupAlert,
}) => {
  const [testBuzzerActive, setTestBuzzerActive] = useState<boolean>(false);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<PlacedOrder | null>(null);
  const [showSampleReceipt, setShowSampleReceipt] = useState<boolean>(false);

  const handleTestBuzzer = () => {
    setTestBuzzerActive(true);
    playCustomerPickupPager();
    triggerDeviceVibration();
    setTimeout(() => setTestBuzzerActive(false), 2000);
  };

  if (orders.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4 animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center mx-auto shadow-inner">
          <Utensils className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold font-serif-cafe text-white">Belum Ada Pesanan Aktif</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Setelah Kakak memesan melalui Menu Digital atau scan barcode meja, status pesanan real-time akan dipantau di sini.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onOpenMenu}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <span>Buka Menu Digital Sekarang</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setShowSampleReceipt(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-750 text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <Receipt className="w-3.5 h-3.5 text-amber-400" />
            <span>Lihat Contoh Struk & Ucapan Terima Kasih</span>
          </button>

          {onSimulatePickupAlert && (
            <button
              type="button"
              onClick={() => {
                onSimulatePickupAlert({
                  orderNumber: 'NWT-8492',
                  tableNumber: '07',
                  items: [
                    {
                      cartId: 'mock-1',
                      menuItem: MENU_ITEMS[0],
                      quantity: 2,
                      sugarLevel: 'Less Sugar (50%)',
                      milkType: { id: 'oat', label: 'Oat Milk (Oatly)', price: 6000 },
                      itemTotalPrice: 68000,
                    },
                    {
                      cartId: 'mock-2',
                      menuItem: MENU_ITEMS[8] || MENU_ITEMS[0],
                      quantity: 1,
                      notes: 'Ekstra saus aioli',
                      itemTotalPrice: 30000,
                    },
                  ],
                  totalAmount: 98000,
                  paymentMethod: 'QRIS',
                  createdAt: '19:42',
                  status: 'serving',
                });
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-white border border-zinc-700 text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <Bell className="w-3.5 h-3.5 text-zinc-300 animate-bounce" />
              <span>Simulasi Tampilan HP Konsumen (Buzzer Siap)</span>
            </button>
          )}
        </div>

        {/* Sample Receipt Modal */}
        <ReceiptModal
          isOpen={showSampleReceipt}
          onClose={() => setShowSampleReceipt(false)}
          initialMode="customer"
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      <div className="text-center space-y-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">Live Tracking Pesanan</span>
        <h2 className="text-2xl font-bold font-serif-cafe text-white">Status Pesanan & Pager HP</h2>
        <p className="text-xs text-zinc-400">
          Sistem mandiri tanpa waiter: HP Anda akan berdering & bergetar saat pesanan siap diambil di Bar.
        </p>
      </div>

      {/* Educational Card: How Self-Pickup Works */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white text-zinc-950 flex items-center justify-center font-bold">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-white uppercase tracking-wider font-mono">
                Sistem Self-Service & Pick-Up Bar
              </h3>
              <p className="text-[11px] text-zinc-400">Kafe NAWATIGA beroperasi tanpa waiter antar ke meja</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleTestBuzzer}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
              testBuzzerActive
                ? 'bg-emerald-500 border-emerald-400 text-white animate-pulse'
                : 'bg-zinc-900 border-zinc-700 hover:bg-zinc-850 text-white'
            }`}
            title="Uji coba suara buzzer dan getaran HP"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{testBuzzerActive ? 'Buzzer Berbunyi!' : 'Tes Alarm Pager HP'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-zinc-850 text-xs">
          <div className="bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 space-y-1">
            <span className="font-bold text-white block">1. Duduk Santai</span>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Barista menerima tiket order seketika setelah checkout dari meja.
            </p>
          </div>
          <div className="bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 space-y-1">
            <span className="font-bold text-white block">2. Notifikasi Pager HP</span>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Saat pesanan selesai diracik, HP Kakak berdering dan bergetar otomatis.
            </p>
          </div>
          <div className="bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 space-y-1">
            <span className="font-bold text-white block">3. Ambil Sendiri di Bar</span>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Tunjukkan nomor pesanan di Pick-Up Bar, lalu kembalikan nampan setelah selesai.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {orders.map((order) => {
          const isServing = order.status === 'serving';
          const isCompleted = order.status === 'completed';

          return (
            <div
              key={order.orderNumber}
              className={`bg-zinc-900/90 rounded-3xl border p-5 sm:p-6 shadow-xl space-y-5 transition-all ${
                isServing
                  ? 'border-white ring-2 ring-white/30 bg-zinc-900'
                  : 'border-zinc-800'
              }`}
            >
              {/* Order Meta Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-white">
                      #{order.orderNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white text-zinc-950 text-[10px] font-black">
                      Meja #{order.tableNumber}
                    </span>
                    {(order.paymentStatus === 'pay_later' || order.paymentStatus === 'unpaid' || /kasir|nanti/i.test(order.paymentMethod)) ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold font-mono">
                        ⏱️ Bayar Nanti di Kasir
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 text-[10px] font-bold font-mono">
                        ✓ Lunas
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                    Pukul {order.createdAt} · Pembayaran: {order.paymentMethod}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedReceiptOrder(order)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold border border-zinc-700 transition-colors shadow-sm cursor-pointer"
                    title="Buka Struk Digital Resmi & Ucapan Terima Kasih"
                  >
                    <Receipt className="w-3.5 h-3.5 text-amber-400" />
                    <span>Lihat Struk ☕</span>
                  </button>

                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                    isServing
                      ? 'bg-white text-zinc-950 border-white animate-bounce'
                      : isCompleted
                      ? 'bg-zinc-800 text-emerald-400 border-zinc-700'
                      : 'bg-zinc-800 text-zinc-200 border-zinc-700'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isServing ? 'bg-emerald-500 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
                    <span>
                      {isServing
                        ? '🚨 SIAP DIAMBIL DI BAR!'
                        : isCompleted
                        ? 'Pesanan Sudah Selesai'
                        : 'Sedang Disiapkan Barista'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ready Pick-Up Prompt if order is serving */}
              {isServing && (
                <div className="p-4 bg-white text-zinc-950 rounded-2xl shadow-xl space-y-2 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-zinc-950 text-white flex items-center justify-center font-bold">
                        <Coffee className="w-4 h-4" />
                      </div>
                      <span className="font-black text-sm uppercase tracking-wide">
                        Pesanan Meja #{order.tableNumber} Siap di Bar!
                      </span>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-zinc-800 leading-relaxed">
                    Silakan berjalan ke <strong className="underline decoration-zinc-950">Pick-Up Counter Bar</strong> untuk mengambil pesanan Anda sambil memperlihatkan nomor #{order.orderNumber}.
                  </p>
                  {onSimulatePickupAlert && (
                    <button
                      type="button"
                      onClick={() => onSimulatePickupAlert(order)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 text-white text-xs font-bold shadow-sm hover:bg-zinc-800 transition-colors"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>Buka Layar Pager Digital</span>
                    </button>
                  )}
                </div>
              )}

              {/* Visual Step Progress: Self-Service 3 Steps */}
              <div className="grid grid-cols-3 gap-2 relative">
                {/* Step 1: Received */}
                <div className="text-center space-y-1.5">
                  <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-600 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-white">Diterima di Bar</div>
                  <div className="text-[10px] text-zinc-400 font-mono">Tercatat di KDS</div>
                </div>

                {/* Step 2: Preparing */}
                <div className="text-center space-y-1.5">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto shadow-lg ${
                    isServing || isCompleted
                      ? 'bg-zinc-800 border border-zinc-600 text-emerald-400'
                      : 'bg-white text-zinc-950 animate-bounce'
                  }`}>
                    {isServing || isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <ChefHat className="w-5 h-5" />}
                  </div>
                  <div className="text-xs font-black text-white">Sedang Diracik</div>
                  <div className="text-[10px] text-zinc-300 font-medium font-mono">
                    {isServing || isCompleted ? 'Selesai' : 'Estimasi ~7 mnt'}
                  </div>
                </div>

                {/* Step 3: Self Pick-Up at Bar */}
                <div className={`text-center space-y-1.5 ${isServing ? 'opacity-100' : isCompleted ? 'opacity-100' : 'opacity-40'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto ${
                    isServing
                      ? 'bg-white text-zinc-950 shadow-xl animate-pulse ring-4 ring-white/30'
                      : isCompleted
                      ? 'bg-zinc-800 text-emerald-400 border border-zinc-600'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Coffee className="w-5 h-5" />}
                  </div>
                  <div className={`text-xs font-bold ${isServing ? 'text-white underline' : 'text-zinc-300'}`}>
                    Ambil di Bar
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    {isServing ? '🚨 Siap di Counter' : 'Self-Pickup'}
                  </div>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="bg-zinc-950 rounded-2xl p-4 border border-zinc-800 space-y-2.5">
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">
                  Rincian Menu:
                </div>
                <div className="divide-y divide-zinc-850">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-start justify-between text-xs">
                      <div>
                        <span className="font-bold text-white">{item.quantity}x {item.menuItem?.name || 'Menu Kopi / Camilan'}</span>
                        <div className="text-[11px] text-zinc-400 mt-0.5 space-x-1.5">
                          {item.sugarLevel && <span>Gula: {item.sugarLevel}</span>}
                          {item.milkType && <span>· Susu: {item.milkType.label}</span>}
                          {item.iceLevel && <span>· {item.iceLevel}</span>}
                          {item.notes && <span className="text-zinc-200">· "{item.notes}"</span>}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-white">
                        Rp {(item.itemTotalPrice ?? 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2.5 border-t border-zinc-800 flex justify-between items-center text-xs font-bold text-white">
                  <span>Total Tagihan (Termasuk PB1 & Servis)</span>
                  <span className="font-mono text-sm font-black text-white">
                    Rp {order.totalAmount.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedReceiptOrder(order)}
                    className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 hover:border-zinc-600 text-zinc-200 hover:text-white border border-zinc-750 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98"
                  >
                    <Receipt className="w-4 h-4 text-white" />
                    <span>Buka Struk Resmi & Ucapan Terima Kasih</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                </div>
              </div>

              {/* Self-Service Help & Additional Order */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-xs text-zinc-400">
                  Perlu bantuan barista atau alat makan tambahan?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onOpenCallWaiter}
                    className="px-3 py-1.5 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition-colors"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Bantuan Barista di Bar</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenMenu}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <span>Tambah Menu Lain</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(selectedReceiptOrder)}
        onClose={() => setSelectedReceiptOrder(null)}
        customerOrder={selectedReceiptOrder}
        initialMode="customer"
      />
    </div>
  );
};

