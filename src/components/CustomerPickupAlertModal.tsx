import React, { useEffect, useState, useRef } from 'react';
import { Coffee, Check, Volume2, VolumeX, MapPin, AlertCircle, BellRing, Sparkles } from 'lucide-react';
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
  const [ringCount, setRingCount] = useState<number>(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Automatically ring buzzer & vibrate continuously in a loop until customer clicks "Ambil Pesanan"
  useEffect(() => {
    if (isOpen && order) {
      // First immediate ring & vibration
      if (!isMuted) {
        playCustomerPickupPager();
      }
      triggerDeviceVibration();
      setRingCount(1);

      // Continuous loop every 3 seconds
      intervalRef.current = setInterval(() => {
        if (!isMuted) {
          playCustomerPickupPager();
        }
        triggerDeviceVibration();
        setRingCount((c) => c + 1);
      }, 3000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isOpen, order, isMuted]);

  if (!isOpen || !order) return null;

  const handleTakeOrder = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onConfirmPickedUp(order.id || order.orderNumber);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-zinc-950 rounded-3xl border-2 border-emerald-400 shadow-[0_0_60px_rgba(16,185,129,0.35)] overflow-hidden flex flex-col max-h-[92dvh] animate-in zoom-in-95 duration-200">
        
        {/* Pulsing Alert Top Banner */}
        <div className="bg-gradient-to-r from-emerald-400 via-white to-emerald-400 text-zinc-950 p-4 text-center space-y-1 relative overflow-hidden flex-shrink-0 shadow-lg">
          <div className="absolute top-2.5 right-3 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded-xl bg-zinc-900/10 hover:bg-zinc-900/20 text-zinc-900 transition-colors cursor-pointer"
              title={isMuted ? 'Bunyikan Alarm' : 'Matikan Suara (Mute)'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-600" /> : <Volume2 className="w-4 h-4 text-emerald-800" />}
            </button>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-zinc-950 text-white text-[11px] font-mono font-black uppercase tracking-widest animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>BUZZER DIGITAL MEJA #{order.tableNumber}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black font-serif-cafe tracking-wide pt-0.5 text-zinc-950">
            PESANAN SUDAH SIAP! ☕
          </h2>
          <p className="text-xs font-bold text-zinc-800">
            Silakan berjalan ke <span className="underline decoration-zinc-950 font-black">Pick-Up Counter Barista</span>
          </p>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-3.5 bg-zinc-950 text-white overflow-y-auto overscroll-contain">
          
          {/* Continuous Loop Reminder Banner */}
          <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold text-center">
            <BellRing className="w-4 h-4 animate-bounce text-amber-400 flex-shrink-0" />
            <span>Alarm & getar berulang terus (Dering ke-{ringCount}) sampai Anda klik Ambil Pesanan</span>
          </div>

          {/* Animated Buzzer Graphic Card */}
          <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 text-center space-y-2.5 relative overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-white text-zinc-950 flex items-center justify-center mx-auto shadow-2xl animate-bounce">
              <Coffee className="w-8 h-8 text-zinc-950" />
            </div>

            <div>
              <div className="text-[11px] text-zinc-400 uppercase tracking-widest font-mono">
                Nomor Antrean Pesanan
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-wider text-white">
                #{order.orderNumber}
              </div>
              <div className="text-xs text-zinc-300 mt-0.5 font-bold">
                Meja #{order.tableNumber}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-300 flex items-start gap-2 text-left">
              <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Lokasi Ambil:</strong> Pick-Up Bar Utama (dekat mesin kopi espresso & kasir). Tunjukkan layar HP ini ke barista.
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
                      <strong className="text-emerald-400 mr-1.5 font-black">{it.quantity}x</strong>
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
            {/* Primary Action Button: Takes order & silences looping alarm */}
            <button
              type="button"
              onClick={handleTakeOrder}
              className="w-full py-4 px-4 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(52,211,153,0.4)] transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>AMBIL PESANAN & MATIKAN ALARM</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  playCustomerPickupPager();
                  triggerDeviceVibration();
                }}
                className="flex-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Tes Buzzer</span>
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="flex-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
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
