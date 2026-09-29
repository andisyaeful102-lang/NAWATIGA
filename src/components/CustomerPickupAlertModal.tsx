import React, { useEffect, useState } from 'react';
import { Bell, Coffee, Check, Volume2, VolumeX, Sparkles, ArrowRight, MapPin, AlertCircle } from 'lucide-react';
import { playCustomerPickupPager, triggerDeviceVibration } from '../utils/audio.ts';

export interface PickupAlertOrder {
  id: string;
  orderNumber: string;
  tableNumber: string;
  items: Array<{ name: string; quantity: number; notes?: string }>;
  createdAt?: string;
}

interface CustomerPickupAlertModalProps {
  order: PickupAlertOrder | null;
  isOpen: boolean;
  onConfirmPickedUp: (orderId: string) => void;
  onDismiss: () => void;
}

export const CustomerPickupAlertModal: React.FC<CustomerPickupAlertModalProps> = ({
  order,
  isOpen,
  onConfirmPickedUp,
  onDismiss,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Automatically ring buzzer & vibrate when modal opens
  useEffect(() => {
    if (isOpen && order) {
      if (!isMuted) {
        playCustomerPickupPager();
      }
      triggerDeviceVibration();

      // Repeat chime once after 2.5 seconds if still open
      const timer = setTimeout(() => {
        if (!isMuted) {
          playCustomerPickupPager();
          triggerDeviceVibration();
        }
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [isOpen, order, isMuted]);

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-zinc-950 rounded-3xl border-2 border-white shadow-[0_0_50px_rgba(255,255,255,0.2)] overflow-hidden flex flex-col max-h-[92dvh] animate-in zoom-in-95 duration-200">
        
        {/* Pulsing Alert Top Banner */}
        <div className="bg-white text-zinc-950 p-3.5 sm:p-4 text-center space-y-1 relative overflow-hidden flex-shrink-0">
          <div className="absolute top-2 right-3 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-900 transition-colors"
              title={isMuted ? 'Bunyikan Alarm' : 'Matikan Suara'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-zinc-900 text-white text-[11px] font-mono font-black uppercase tracking-widest animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>BUZZER DIGITAL MEJA #{order.tableNumber}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black font-serif-cafe tracking-wide pt-1">
            PESANAN SUDAH SIAP! ☕
          </h2>
          <p className="text-xs font-semibold text-zinc-700">
            Silakan berjalan ke <span className="underline decoration-zinc-950 font-bold">Pick-Up Counter Barista</span>
          </p>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-3.5 bg-zinc-950 text-white overflow-y-auto overscroll-contain">
          
          {/* Animated Buzzer Graphic Card */}
          <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 text-center space-y-2 relative overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-white text-zinc-950 flex items-center justify-center mx-auto shadow-2xl animate-bounce">
              <Coffee className="w-8 h-8" />
            </div>

            <div>
              <div className="text-[11px] text-zinc-400 uppercase tracking-widest font-mono">
                Nomor Antrean Pesanan
              </div>
              <div className="text-3xl font-black font-mono tracking-wider text-white">
                #{order.orderNumber}
              </div>
              <div className="text-xs text-zinc-300 mt-0.5">
                Meja #{order.tableNumber}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-300 flex items-start gap-2 text-left">
              <MapPin className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
              <span>
                <strong>Lokasi Ambil:</strong> Counter Bar Utama (dekat mesin espresso & kasir). Tunjukkan layar HP ini ke barista.
              </span>
            </div>
          </div>

          {/* List of ready items */}
          <div className="bg-zinc-900/60 rounded-2xl p-3.5 border border-zinc-850 space-y-2">
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
              Menu Siap Diambil:
            </div>
            <div className="space-y-1.5 divide-y divide-zinc-800/80">
              {order.items.map((it, idx) => (
                <div key={idx} className="pt-1.5 first:pt-0 flex items-start justify-between text-xs">
                  <div>
                    <span className="font-bold text-white">
                      <strong className="text-zinc-300 mr-1.5">{it.quantity}x</strong>
                      {it.name}
                    </span>
                    {it.notes && (
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {it.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Self-Service reminder note */}
          <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-zinc-200">
              <AlertCircle className="w-3.5 h-3.5 text-zinc-300" />
              <span>Sistem Self-Service NAWATIGA:</span>
            </div>
            <p className="leading-relaxed">
              Kafe kami tidak menggunakan waiter antar. Pesanan diambil langsung oleh tamu di bar. Setelah selesai bersantai, mohon bantu kembalikan gelas & piring ke Return Station di samping bar ya Kak.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => onConfirmPickedUp(order.id)}
              className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-black text-xs flex items-center justify-center gap-2 shadow-2xl transition-all active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>SAYA SUDAH AMBIL DI BAR</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  playCustomerPickupPager();
                  triggerDeviceVibration();
                }}
                className="flex-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Tes Buzzer</span>
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="flex-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 text-xs font-semibold transition-colors"
              >
                Tutup Sementara
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
