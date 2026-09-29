import React, { useState } from 'react';
import { X, Bell, CheckCircle2, Loader2, Sparkles, AlertTriangle, Utensils, CreditCard, HelpCircle } from 'lucide-react';
import { playWaiterBell } from '../utils/audio.ts';

interface CallWaiterModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableNumber: string;
}

const REASONS = [
  { id: 'barcode', label: 'Barcode Tidak Bisa Di-scan / Error', icon: AlertTriangle, desc: 'Staf akan membawa buku menu atau membantu memindai' },
  { id: 'recommendation', label: 'Butuh Bantuan Rekomendasi Menu', icon: Sparkles, desc: 'Konsultasi rasa kopi atau komposisi makanan' },
  { id: 'cutlery', label: 'Minta Alat Makan / Tisu / Sedotan', icon: Utensils, desc: 'Sendok, garpu, piring kecil, atau napkin ekstra' },
  { id: 'payment', label: 'Bantuan Pembayaran / Kasir', icon: CreditCard, desc: 'Split bill atau pembayaran tunai langsung' },
  { id: 'other', label: 'Bantuan Lainnya', icon: HelpCircle, desc: 'Keperluan meja lainnya' },
];

export const CallWaiterModal: React.FC<CallWaiterModalProps> = ({
  isOpen,
  onClose,
  tableNumber,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('barcode');
  const [customNote, setCustomNote] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCall = async () => {
    setIsLoading(true);
    try {
      const reasonObj = REASONS.find((r) => r.id === selectedReason);
      const reasonText = reasonObj ? reasonObj.label : 'Bantuan Umum';
      const fullReason = customNote.trim() ? `${reasonText} (${customNote.trim()})` : reasonText;

      await fetch('/api/call-waiter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber,
          reason: fullReason,
        }),
      });

      playWaiterBell();
      setIsSuccess(true);
    } catch (e) {
      console.error(e);
      playWaiterBell();
      setIsSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setIsSuccess(false);
    setCustomNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-950 rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 bg-zinc-950 border-b border-zinc-800 text-white">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-white animate-bounce" />
            <h3 className="font-bold text-sm">Bantuan Barista / Staf (Meja #{tableNumber})</h3>
          </div>
          <button
            onClick={handleReset}
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-700 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-lg text-white">Bantuan Diterima di Bar (Meja #{tableNumber})!</h4>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                Notifikasi bel telah berbunyi di counter barista. Staf kami akan segera membantu keperluan meja Kakak.
              </p>
            </div>
            <div className="p-3.5 bg-zinc-900 rounded-2xl text-left border border-zinc-800 text-xs text-zinc-300">
              <span className="font-bold block mb-0.5 text-white">Tips Praktis:</span>
              Jika barcode meja terhalang, Kakak juga bisa langsung membuka tab <span className="font-bold text-white underline">Menu Digital</span> di layar ini untuk pesan mandiri tanpa antre.
            </div>
            <button
              onClick={handleReset}
              className="w-full py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition-colors shadow-md"
            >
              Baik, Terima Kasih
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-3.5 bg-zinc-950">
            <p className="text-xs text-zinc-400">
              Pilih alasan panggilan agar staf kami bisa membawa perlengkapan yang tepat ke meja Kakak:
            </p>

            <div className="space-y-2">
              {REASONS.map((r) => {
                const Icon = r.icon;
                const isSelected = selectedReason === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedReason(r.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'border-white bg-zinc-900 shadow-md ring-1 ring-white/30'
                        : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 text-zinc-300'
                    }`}
                  >
                    <div className={`p-2 rounded-xl mt-0.5 ${isSelected ? 'bg-white text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                        {r.label}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">{r.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Catatan Tambahan (Opsional):
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Misal: 'minta sendok 2' atau 'kamera HP tidak fokus'"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-xs font-semibold text-zinc-300 hover:bg-zinc-900 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCall}
                disabled={isLoading}
                className="flex-2 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memanggil...</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-3.5 h-3.5" />
                    <span>Panggil Waiter Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
