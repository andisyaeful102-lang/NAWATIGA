import React, { useEffect } from 'react';
import {
  BellRing,
  Coffee,
  Printer,
  CheckCircle2,
  X,
  Clock,
  Volume2,
  VolumeX,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { BaristaOrder } from './BaristaKDSView.tsx';
import { playCashierVoiceAlert, stopSpeaking } from '../utils/audio.ts';

interface BaristaOrderAlertModalProps {
  order: BaristaOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onStartPreparing: (orderId: string) => void;
  onPrintReceipt: (order: BaristaOrder) => void;
}

export const BaristaOrderAlertModal: React.FC<BaristaOrderAlertModalProps> = ({
  order,
  isOpen,
  onClose,
  onStartPreparing,
  onPrintReceipt,
}) => {
  // Repeatedly ring & announce table until barista clicks "Mulai Racik" or closes
  useEffect(() => {
    if (isOpen && order) {
      // First announcement
      playCashierVoiceAlert(order.tableNumber, false);

      // Repeat alert every 5.5 seconds until acknowledged
      const timer = setInterval(() => {
        playCashierVoiceAlert(order.tableNumber, true);
      }, 5500);

      return () => {
        clearInterval(timer);
        stopSpeaking();
      };
    }
  }, [isOpen, order?.orderNumber, order?.tableNumber]);

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-950 rounded-3xl border-2 border-amber-500/80 shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Animated Alert Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-950 via-zinc-900 to-amber-950/80 border-b border-amber-900/60 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-zinc-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/30">
                <BellRing className="w-6 h-6 animate-bounce" />
              </div>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-zinc-950 animate-ping" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider">
                  Order Baru Masuk!
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {order.createdAt} WIB
                </span>
              </div>
              <h3 className="text-xl font-black font-serif-cafe text-white tracking-wide mt-0.5">
                {order.tableNumber === 'BAR' || /bar|kasir/i.test(order.tableNumber) ? (
                  <span className="text-amber-300">Bar / Kasir Counter</span>
                ) : (
                  <span>Meja #{order.tableNumber}</span>
                )}
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                No. Order #{order.orderNumber}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-zinc-700/60"
            title="Tutup Notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Audio Chime Replay Bar */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-950/40 border border-amber-900/40 text-xs">
            <div className="flex items-center gap-2 text-amber-200 text-[11px] font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Alarm Suara Kasir Aktif</span>
            </div>
            <button
              type="button"
              onClick={() => playCashierVoiceAlert(order.tableNumber, false)}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Bunyikan Suara Meja #{order.tableNumber}</span>
            </button>
          </div>

          {/* Items List */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center justify-between">
              <span>Daftar Menu Racikan:</span>
              <span className="text-zinc-500">{order.items.length} Macam Menu</span>
            </div>

            <div className="divide-y divide-zinc-800 bg-zinc-900/90 rounded-2xl p-3 border border-zinc-800 space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="pt-2 first:pt-0 space-y-1">
                  <div className="flex items-start justify-between text-xs">
                    <span className="font-bold text-white leading-snug">
                      <span className="text-amber-400 font-mono">[{item.quantity}x]</span> {item.name}
                    </span>
                    <span className="font-mono text-zinc-300 font-bold ml-2">
                      Rp {((item.price || 0) * item.quantity).toLocaleString('id-ID')}
                    </span>
                  </div>

                  {item.notes && (
                    <div className="text-[11px] text-amber-200/90 bg-amber-950/30 p-1.5 rounded-lg border border-amber-900/40 italic">
                      📝 {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Payment & Bill Summary */}
          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
            <div>
              <div className="text-[10px] text-zinc-400 uppercase font-mono">Total Tagihan:</div>
              <div className="text-base font-mono font-black text-white">
                Rp {order.totalAmount.toLocaleString('id-ID')}
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px] font-bold">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>{order.paymentMethod} · LUNAS</span>
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => onPrintReceipt(order)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Cetak Struk Transaksi</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer text-center"
            >
              Nanti Saja
            </button>

            <button
              type="button"
              onClick={() => {
                onStartPreparing(order.id);
                onClose();
              }}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-white/10 transition-transform active:scale-95 cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              <span>
                Mulai Racik (Matikan Alarm{' '}
                {order.tableNumber === 'BAR' || /bar|kasir/i.test(order.tableNumber)
                  ? 'Bar/Kasir'
                  : `Meja #${order.tableNumber}`}
                )
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
