import React, { useState } from 'react';
import {
  Heart,
  Coffee,
  Sparkles,
  CheckCircle2,
  Instagram,
  MapPin,
  Clock,
  ThumbsUp,
  Share2,
  Star,
  Smile,
  QrCode,
} from 'lucide-react';
import { NawatigaLogo } from './NawatigaLogo.tsx';

interface ThankYouViewProps {
  tableNumber: string;
  onStartNewSession?: () => void;
}

export const ThankYouView: React.FC<ThankYouViewProps> = ({
  tableNumber,
  onStartNewSession,
}) => {
  const [selectedCompliment, setSelectedCompliment] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [feedbackSent, setFeedbackSent] = useState<boolean>(false);

  const compliments = [
    { id: 'coffee', label: 'Rasa Kopi Mantap', icon: '☕' },
    { id: 'cozy', label: 'Suasana Nyaman & Tenang', icon: '🌿' },
    { id: 'fast', label: 'Pelayanan Cepat', icon: '⚡' },
    { id: 'music', label: 'Musik & Vibes Asik', icon: '🎵' },
    { id: 'food', label: 'Makanan & Snack Enak', icon: '🥐' },
  ];

  const handleSelectCompliment = (label: string) => {
    setSelectedCompliment(label);
    setFeedbackSent(true);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-xl bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl text-center space-y-7 relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 blur-3xl pointer-events-none rounded-full" />

        {/* Top Brand Logo */}
        <div className="space-y-2 relative">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-zinc-900 border border-zinc-700/80 shadow-inner flex items-center justify-center mx-auto text-amber-400">
            <NawatigaLogo variant="dark" size="md" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 font-mono text-[11px] font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Kunjungan Selesai · Meja #{tableNumber}</span>
          </div>
        </div>

        {/* Main Heartfelt Heading */}
        <div className="space-y-3 relative">
          <div className="flex items-center justify-center gap-1.5 text-amber-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-widest uppercase">
              NAWATIGA COFFEE & ROASTERY
            </span>
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold font-serif-cafe text-white tracking-tight leading-snug">
            Terima Kasih Banyak Telah Berkunjung! ☕✨
          </h1>

          <p className="text-xs sm:text-sm text-zinc-300 max-w-md mx-auto leading-relaxed">
            Terima kasih telah meluangkan waktu berharga untuk ngopi, bersantai, dan bercengkerama bersama kami di NAWATIGA. Setiap cangkir kopi kami diracik dengan penuh cinta & dedikasi dari biji kopi pilihan petani Nusantara.
          </p>
        </div>

        {/* Warm Quote Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 text-left space-y-2 relative">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
            <Heart className="w-4 h-4 text-amber-400 fill-amber-400/20" />
            <span>Pesan Hangat Dari Tim Barista Nawatiga:</span>
          </div>
          <p className="text-xs text-zinc-300 italic leading-relaxed">
            "Semoga rasa kopi dan kehangatan tempat ini menemani harimu dengan energi positif dan inspirasi tanpa batas. Hati-hati di perjalanan pulang, dan sampai jumpa kembali di cangkir kopi berikutnya!"
          </p>
        </div>

        {/* Interactive Rating & Compliment Section */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/50 border border-zinc-850 space-y-3">
          <span className="text-xs font-bold text-zinc-300 block">
            Bagaimana Pengalaman Kakak di NAWATIGA Hari Ini?
          </span>

          {/* Star rating */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => {
                  setRating(star);
                  setFeedbackSent(true);
                }}
                className="p-1 text-amber-400 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                title={`${star} Bintang`}
              >
                <Star
                  className={`w-6 h-6 ${
                    star <= rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Compliment Chips */}
          <div className="flex flex-wrap justify-center gap-1.5 pt-1">
            {compliments.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectCompliment(c.label)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedCompliment === c.label
                    ? 'bg-amber-400 text-zinc-950 font-black shadow-md scale-105'
                    : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700/60'
                }`}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>

          {feedbackSent && (
            <div className="text-[11px] text-emerald-400 font-bold flex items-center justify-center gap-1 animate-in fade-in pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Terima kasih banyak atas apresiasi manisnya! Barista kami tersenyum lebar! 😊</span>
            </div>
          )}
        </div>

        {/* Cafe Information & Social */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-left">
          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-850 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center flex-shrink-0">
              <Instagram className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <span className="font-bold text-white block">Ikuti Instagram Kami</span>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-amber-400 hover:underline block font-mono"
              >
                @nawatiga.coffee
              </a>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-850 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <span className="font-bold text-white block">Lokasi Senopati</span>
              <p className="text-[11px] text-zinc-400 leading-tight">
                Jl. Senopati No. 43, Jakarta Selatan
              </p>
            </div>
          </div>
        </div>

        {/* Info Scan Barcode Meja untuk Pesan Kembali */}
        <div className="pt-4 border-t border-zinc-850 flex items-center justify-center gap-2 text-zinc-400 text-xs">
          <QrCode className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>Ingin kembali memesan? Silakan scan kembali barcode di meja Anda.</span>
        </div>
      </div>
    </div>
  );
};
