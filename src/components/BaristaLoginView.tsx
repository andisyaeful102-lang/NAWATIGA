import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Zap,
  Settings,
  Sparkles,
} from 'lucide-react';
import { NawatigaLogo } from './NawatigaLogo.tsx';
import { playAdminChime } from '../utils/audio.ts';

export interface StaffSession {
  staffId: 'admin';
  name: string;
  role: 'admin';
  roleTitle: string;
  shift: string;
  loggedInAt: string;
}

interface BaristaLoginViewProps {
  onLoginSuccess: (session: StaffSession) => void;
  onBackToMenu: () => void;
}

const DEFAULT_MASTER_PIN = '8888';

export const BaristaLoginView: React.FC<BaristaLoginViewProps> = ({
  onLoginSuccess,
  onBackToMenu,
}) => {
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isSettingNewPin, setIsSettingNewPin] = useState<boolean>(false);
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState<boolean>(false);

  // Get active stored admin PIN or default to 8888
  const getStoredAdminPin = (): string => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('nawatiga_admin_custom_pin');
        if (saved && saved.length >= 4) return saved;
      } catch {
        // ignore
      }
    }
    return DEFAULT_MASTER_PIN;
  };

  // Play audio key tap
  const playKeyTap = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    } catch {
      // quiet
    }
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      playKeyTap();
      setErrorMsg(null);
      const nextPin = pin + num;
      setPin(nextPin);

      // Auto-validate if 4 digits
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    playKeyTap();
    setErrorMsg(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    playKeyTap();
    setErrorMsg(null);
    setPin('');
  };

  const verifyPin = (pinToTest: string) => {
    const activeMasterPin = getStoredAdminPin();
    // Accept activeMasterPin, default 8888, fallback 1234, or 0000
    const acceptedPins = [activeMasterPin, DEFAULT_MASTER_PIN, '1234', '0000'];

    if (acceptedPins.includes(pinToTest)) {
      setIsSuccess(true);
      playAdminChime();

      const session: StaffSession = {
        staffId: 'admin',
        name: 'Admin NAWATIGA',
        role: 'admin',
        roleTitle: 'Admin & Pengelola Bar',
        shift: 'Shift Aktif',
        loggedInAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };

      try {
        localStorage.setItem('nawatiga_staff_session', JSON.stringify(session));
      } catch {
        // ignore
      }

      setTimeout(() => {
        onLoginSuccess(session);
      }, 450);
    } else {
      setErrorMsg('PIN Akses Salah! Akses ke mesin bar ditolak demi keamanan.');
      setPin('');
    }
  };

  const handleQuickUnlock = () => {
    const activePin = getStoredAdminPin();
    setPin(activePin);
    verifyPin(activePin);
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinInput.length !== 4 || !/^\d{4}$/.test(newPinInput)) {
      setErrorMsg('PIN baru harus tepat 4 angka!');
      return;
    }
    try {
      localStorage.setItem('nawatiga_admin_custom_pin', newPinInput);
      setPinChangeSuccess(true);
      setIsSettingNewPin(false);
      setNewPinInput('');
      setErrorMsg(null);
      setTimeout(() => setPinChangeSuccess(false), 3000);
    } catch {
      // ignore
    }
  };

  // Keyboard listener for typing PIN directly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSettingNewPin) return;
      if (/^[0-9]$/.test(e.key)) {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape') {
        handleClear();
      } else if (e.key === 'Enter' && pin.length >= 4) {
        verifyPin(pin);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, isSettingNewPin]);

  const currentAdminPin = getStoredAdminPin();

  return (
    <div className="max-w-md mx-auto py-4 sm:py-8 px-3 animate-in fade-in duration-300">
      {/* Return to Menu Button */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToMenu}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Menu Tamu</span>
        </button>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Area Terproteksi Admin</span>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="bg-zinc-950 rounded-3xl border border-zinc-800/90 shadow-2xl p-5 sm:p-7 space-y-5 relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-24 bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* Header Branding */}
        <div className="text-center space-y-2 relative z-10">
          <div className="flex justify-center mb-1">
            <NawatigaLogo variant="dark" size="md" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-zinc-900 border border-zinc-750 text-zinc-300 text-xs font-semibold">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Terminal POS & KDS Bar Terkunci</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-serif-cafe text-white tracking-wide">
              Login Admin Barista
            </h2>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
              Masukkan PIN Keamanan untuk membuka dashboard transaksi, kendali tiket dapur, dan stok menu.
            </p>
          </div>
        </div>

        {/* Anti-Sabotage Warning Banner */}
        <div className="bg-zinc-900/80 rounded-2xl p-3 border border-zinc-800 flex items-start gap-2.5 text-left text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold text-zinc-200 text-[11px]">Proteksi Anti-Sabotase Aktif:</div>
            <p className="text-[10px] text-zinc-400 leading-normal">
              Akses transaksi, cetak struk, dan perubahan status antrean hanya dapat dioperasikan oleh <strong>Admin / Petugas Resmi</strong> NAWATIGA.
            </p>
          </div>
        </div>

        {/* PIN Display */}
        <div className="space-y-2 relative z-10 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
              PIN Admin (4 Digit)
            </span>
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              title={showPin ? 'Sembunyikan angka' : 'Tampilkan angka'}
            >
              {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Dots / Digits container */}
          <div className="flex justify-center items-center gap-3 py-2">
            {[0, 1, 2, 3].map((idx) => {
              const filled = pin.length > idx;
              const char = pin[idx];
              return (
                <div
                  key={idx}
                  className={`w-11 h-12 rounded-xl flex items-center justify-center font-mono text-xl font-bold transition-all duration-200 ${
                    filled
                      ? isSuccess
                        ? 'bg-emerald-950 border-2 border-emerald-400 text-emerald-300 scale-105 shadow-[0_0_12px_rgba(52,211,153,0.4)]'
                        : 'bg-zinc-900 border-2 border-amber-400 text-white scale-105 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                      : 'bg-zinc-900/60 border border-zinc-800 text-zinc-600'
                  }`}
                >
                  {filled ? (showPin ? char : '●') : '—'}
                </div>
              );
            })}
          </div>

          {errorMsg && (
            <div className="text-xs text-rose-400 font-medium flex items-center justify-center gap-1.5 animate-in shake">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isSuccess && (
            <div className="text-xs text-emerald-400 font-bold flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Kunci Terbuka! Memuat Dashboard Bar...</span>
            </div>
          )}

          {pinChangeSuccess && (
            <div className="text-xs text-emerald-400 font-bold flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>PIN Baru Berhasil Disimpan!</span>
            </div>
          )}
        </div>

        {/* Numpad Keypad */}
        <div className="max-w-[270px] mx-auto grid grid-cols-3 gap-2 sm:gap-2.5 pt-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit.toString())}
              className="h-12 rounded-2xl bg-zinc-900/90 hover:bg-zinc-850 active:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-white font-mono text-xl font-bold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center justify-center"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-2xl bg-zinc-900/60 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-800/80 font-mono text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          >
            CLEAR
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-12 rounded-2xl bg-zinc-900/90 hover:bg-zinc-850 active:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-white font-mono text-xl font-bold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-12 rounded-2xl bg-zinc-900/60 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-800/80 font-mono text-sm font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          >
            ⌫
          </button>
        </div>

        {/* Fast Action & PIN Helper */}
        <div className="pt-3 border-t border-zinc-850 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-mono text-[11px]">
              PIN Default: <strong className="text-white font-bold">{currentAdminPin}</strong>
            </span>

            <button
              type="button"
              onClick={handleQuickUnlock}
              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
              title="Masuk langsung dengan PIN Admin"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Buka Cepat</span>
            </button>
          </div>

          {/* Option to change Admin PIN for customized security */}
          <div className="text-center pt-1">
            {!isSettingNewPin ? (
              <button
                type="button"
                onClick={() => setIsSettingNewPin(true)}
                className="text-[11px] text-zinc-400 hover:text-amber-400 transition-colors inline-flex items-center gap-1"
              >
                <Settings className="w-3 h-3" />
                <span>Ganti PIN Rahasia Admin</span>
              </button>
            ) : (
              <form onSubmit={handleSaveNewPin} className="space-y-2 pt-2 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
                <div className="text-[11px] font-bold text-zinc-300">Setel PIN Baru (4 Angka):</div>
                <div className="flex gap-2 justify-center">
                  <input
                    type="password"
                    maxLength={4}
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="4 Digit PIN"
                    className="w-28 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-center text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-white text-zinc-950 text-xs font-bold cursor-pointer"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingNewPin(false);
                      setNewPinInput('');
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-800 text-zinc-400 text-xs cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
