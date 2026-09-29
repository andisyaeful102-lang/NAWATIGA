import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  DollarSign,
  Percent,
  Volume2,
  Save,
  CheckCircle2,
  AlertCircle,
  Upload,
  RefreshCw,
  Eye,
  ShieldCheck,
  Building2,
  CreditCard,
  Sparkles,
  Smartphone,
  Info,
  Check,
  Play,
  RotateCcw,
  Banknote,
} from 'lucide-react';
import { CafeSettings, DEFAULT_CAFE_SETTINGS } from '../data/settings.ts';
import { NawatigaLogo } from './NawatigaLogo.tsx';
import { playPaymentSuccessAnnouncement, playCashRegisterChime, speakPaymentSuccessNotification } from '../utils/audio.ts';

interface CafeSettingsViewProps {
  onSettingsSaved?: (newSettings: CafeSettings) => void;
  staffName?: string;
}

export const CafeSettingsView: React.FC<CafeSettingsViewProps> = ({
  onSettingsSaved,
  staffName,
}) => {
  const [settings, setSettings] = useState<CafeSettings>(DEFAULT_CAFE_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [previewQrUrl, setPreviewQrUrl] = useState<string>('');
  const [testAmount, setTestAmount] = useState<number>(77000);
  const [testTable, setTestTable] = useState<string>('04');

  // Load settings from backend API
  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Generate QR preview if no custom image
  useEffect(() => {
    if (settings.qris.qrisImageUrl) {
      setPreviewQrUrl(settings.qris.qrisImageUrl);
      return;
    }

    // Generate dynamic QRIS mockup data
    const qrisData = `00020101021226${settings.qris.nmid.length}${settings.qris.nmid}5204581253033605802ID59${settings.qris.merchantName.length}${settings.qris.merchantName}6007JAKARTA6304`;
    QRCode.toDataURL(qrisData, {
      width: 320,
      margin: 1.5,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setPreviewQrUrl(url))
      .catch(() => {});
  }, [settings.qris.merchantName, settings.qris.nmid, settings.qris.qrisImageUrl]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan pengaturan');
      }

      setSettings(data.settings);
      showToast('Pengaturan QRIS, Pajak Restoran & Biaya Layanan berhasil disimpan!', 'success');
      if (onSettingsSaved) {
        onSettingsSaved(data.settings);
      }
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Terjadi kesalahan saat menyimpan pengaturan', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Image Upload handler to Base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Harap pilih file gambar (JPG/PNG)!', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Ukuran gambar maksimal 2 MB!', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSettings((prev) => ({
        ...prev,
        qris: {
          ...prev.qris,
          qrisImageUrl: base64,
        },
      }));
      showToast('Foto barcode QRIS baru berhasil diunggah! Klik Simpan Pengaturan di bawah.', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleResetQrisImage = () => {
    setSettings((prev) => ({
      ...prev,
      qris: {
        ...prev.qris,
        qrisImageUrl: '',
      },
    }));
    showToast('Gambar QRIS dikembalikan ke QR Standar Sistem NAWATIGA.', 'success');
  };

  const handleTestPaymentVoice = () => {
    playPaymentSuccessAnnouncement(testTable, testAmount, 'QRIS');
    showToast(`Memutar notifikasi QRIS/Rekening: Meja ${testTable} dengan nominal Rp ${testAmount.toLocaleString('id-ID')}!`, 'success');
  };

  const handleTestCashVoice = () => {
    playPaymentSuccessAnnouncement(testTable, testAmount, 'Tunai');
    showToast(`Memutar notifikasi Tunai/Cash: Meja ${testTable} (tanpa sebut total uang)!`, 'success');
  };

  // Tax calculation simulation
  const sampleSubtotal = 100000;
  const sampleTax = Math.round(sampleSubtotal * (settings.taxAndService.taxPercent / 100));
  const sampleService = Math.round(sampleSubtotal * (settings.taxAndService.servicePercent / 100));
  const sampleTakeaway = settings.taxAndService.takeawayFee || 0;
  const sampleTotal = sampleSubtotal + sampleTax + sampleService + sampleTakeaway;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-2xl transition-all ${
            toastType === 'success'
              ? 'bg-emerald-950/95 border-emerald-600 text-emerald-200'
              : 'bg-rose-950/95 border-rose-600 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastType === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-xs opacity-75 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 font-mono bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
              Konfigurasi Transaksi Kasir
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-serif-cafe">
            Pengaturan QRIS, Pajak Restoran & Biaya Layanan
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Perbarui data barcode QRIS agar konsumen tidak salah transfer, kelola tarif pajak PB1 & biaya layanan restoran, serta atur notifikasi suara HP transaksi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadSettings}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-750 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Muat ulang pengaturan dari server"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-black flex items-center gap-2 shadow-xl hover:shadow-2xl transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ========================================================================= */}
        {/* SECTION 1: PENGATURAN QRIS MERCHANT (ANTI-SALAH TRANSFER) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-850 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 text-amber-400 flex items-center justify-center font-bold">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base font-serif-cafe">
                    Identitas & Barcode QRIS Pembayaran
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Mencegah konsumen salah transfer ke merchant / rekening lain.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-400 font-mono text-[11px]">Status QRIS:</span>
                <button
                  type="button"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      qris: { ...prev.qris, isActive: !prev.qris.isActive },
                    }))
                  }
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    settings.qris.isActive
                      ? 'bg-emerald-950 border border-emerald-600 text-emerald-300'
                      : 'bg-zinc-900 border border-zinc-700 text-zinc-500'
                  }`}
                >
                  {settings.qris.isActive ? '● Aktif Digunakan' : '○ Dinonaktifkan'}
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 text-xs">
              {/* Nama Merchant */}
              <div className="space-y-1.5">
                <label className="block text-zinc-300 font-bold flex items-center justify-between">
                  <span>Nama Merchant QRIS (Tampil di Layar m-Banking Konsumen)</span>
                  <span className="text-amber-400 font-mono text-[10px]">Wajib Sesuai Rekening</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={settings.qris.merchantName}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        qris: { ...prev.qris, merchantName: e.target.value },
                      }))
                    }
                    placeholder="Contoh: NAWATIGA COFFEE & ROASTERY"
                    className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-400 transition-colors uppercase"
                  />
                </div>
                <p className="text-[11px] text-zinc-500">
                  Nama ini harus sama dengan nama yang muncul saat konsumen memindai barcode QRIS di aplikasi BCA, Mandiri, Gopay, OVO, atau Dana.
                </p>
              </div>

              {/* NMID / Nomor Referensi QRIS */}
              <div className="space-y-1.5">
                <label className="block text-zinc-300 font-bold flex items-center justify-between">
                  <span>Nomor NMID (National Merchant ID Bank Indonesia)</span>
                  <span className="text-zinc-500 font-mono text-[10px]">Format: ID10...</span>
                </label>
                <input
                  type="text"
                  value={settings.qris.nmid}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      qris: { ...prev.qris, nmid: e.target.value },
                    }))
                  }
                  placeholder="ID1024356789012"
                  className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              {/* Upload Foto Barcode QRIS Toko */}
              <div className="space-y-2 pt-1 border-t border-zinc-850">
                <label className="block text-zinc-300 font-bold">
                  Foto / Gambar Barcode QRIS Resmi Toko
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="flex-1 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-dashed border-zinc-700 hover:border-amber-400 text-zinc-300 text-xs font-semibold cursor-pointer transition-all">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>Upload Foto Barcode QRIS (PNG / JPG)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {settings.qris.qrisImageUrl && (
                    <button
                      type="button"
                      onClick={handleResetQrisImage}
                      className="px-3 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-400 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                      title="Kembalikan ke barcode standar"
                    >
                      Reset Barcode
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500">
                  {settings.qris.qrisImageUrl
                    ? '✓ Barcode QRIS khusus berhasil diunggah. Konsumen akan memindai foto QRIS ini saat checkout.'
                    : 'Menggunakan QRIS Dinamis standar kafe (Anda bisa mengunggah foto stiker QRIS resmi dari bank/BCA/Gopay).'}
                </p>
              </div>

              {/* Rekening Bank Alternatif / Catatan */}
              <div className="space-y-1.5">
                <label className="block text-zinc-300 font-bold">
                  Rekening Bank Alternatif / Catatan Pembayaran Kasir
                </label>
                <input
                  type="text"
                  value={settings.qris.accountInfo}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      qris: { ...prev.qris, accountInfo: e.target.value },
                    }))
                  }
                  placeholder="Contoh: BCA 827-091-2345 a.n PT Nawatiga Rasa Nusantara"
                  className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              {/* Instruksi Peringatan Konsumen */}
              <div className="space-y-1.5">
                <label className="block text-zinc-300 font-bold">
                  Instruksi Peringatan Anti-Salah Transfer untuk Konsumen
                </label>
                <textarea
                  rows={2}
                  value={settings.qris.notes}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      qris: { ...prev.qris, notes: e.target.value },
                    }))
                  }
                  placeholder="Peringatan untuk konsumen sebelum konfirmasi bayar..."
                  className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: PENGATURAN PAJAK RESTORAN (PB1) & BIAYA LAYANAN */}
          {/* ========================================================================= */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 border-b border-zinc-850 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 text-emerald-400 flex items-center justify-center font-bold">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm sm:text-base font-serif-cafe">
                  Pajak Restoran (PB1) & Biaya Layanan
                </h3>
                <p className="text-xs text-zinc-400">
                  Tarif ini otomatis dikalkulasikan di keranjang belanja, rincian pembayaran, dan cetak struk kasir.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Pajak Restoran (PB1) */}
              <div className="space-y-1.5 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
                <label className="block text-zinc-200 font-bold flex items-center justify-between">
                  <span>Pajak Restoran (PB1)</span>
                  <span className="font-mono text-amber-400">{settings.taxAndService.taxPercent}%</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    step={1}
                    value={settings.taxAndService.taxPercent}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        taxAndService: {
                          ...prev.taxAndService,
                          taxPercent: Math.max(0, Math.min(30, Number(e.target.value) || 0)),
                        },
                      }))
                    }
                    className="w-24 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-400 text-center"
                  />
                  <span className="text-zinc-400 font-bold">%</span>

                  {/* Preset Buttons */}
                  <div className="flex items-center gap-1 ml-auto">
                    {[0, 10, 11].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            taxAndService: { ...prev.taxAndService, taxPercent: p },
                          }))
                        }
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                          settings.taxAndService.taxPercent === p
                            ? 'bg-amber-400 text-zinc-950'
                            : 'bg-zinc-800 text-zinc-300 hover:text-white'
                        }`}
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  value={settings.taxAndService.taxName}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      taxAndService: { ...prev.taxAndService, taxName: e.target.value },
                    }))
                  }
                  placeholder="Label Pajak (cth: PB1 Restoran)"
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-1.5 text-[11px] text-zinc-300 focus:outline-none focus:border-amber-400 mt-2"
                />
              </div>

              {/* Biaya Layanan / Service Charge */}
              <div className="space-y-1.5 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
                <label className="block text-zinc-200 font-bold flex items-center justify-between">
                  <span>Biaya Layanan (Service Charge)</span>
                  <span className="font-mono text-emerald-400">{settings.taxAndService.servicePercent}%</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={1}
                    value={settings.taxAndService.servicePercent}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        taxAndService: {
                          ...prev.taxAndService,
                          servicePercent: Math.max(0, Math.min(20, Number(e.target.value) || 0)),
                        },
                      }))
                    }
                    className="w-24 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-400 text-center"
                  />
                  <span className="text-zinc-400 font-bold">%</span>

                  {/* Preset Buttons */}
                  <div className="flex items-center gap-1 ml-auto">
                    {[0, 5, 8].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            taxAndService: { ...prev.taxAndService, servicePercent: p },
                          }))
                        }
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                          settings.taxAndService.servicePercent === p
                            ? 'bg-emerald-400 text-zinc-950'
                            : 'bg-zinc-800 text-zinc-300 hover:text-white'
                        }`}
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  value={settings.taxAndService.serviceName}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      taxAndService: { ...prev.taxAndService, serviceName: e.target.value },
                    }))
                  }
                  placeholder="Label Layanan (cth: Biaya Layanan & Alat)"
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-1.5 text-[11px] text-zinc-300 focus:outline-none focus:border-amber-400 mt-2"
                />
              </div>
            </div>

            {/* Simulasi Tagihan Pesanan */}
            <div className="bg-zinc-900/80 rounded-2xl p-4 border border-zinc-800 space-y-2 text-xs">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                Contoh Simulasi Perhitungan Tagihan (Pesanan Rp 100.000):
              </div>
              <div className="space-y-1 font-mono">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal Belanja:</span>
                  <span>Rp {sampleSubtotal.toLocaleString('id-ID')}</span>
                </div>
                {settings.taxAndService.taxPercent > 0 && (
                  <div className="flex justify-between text-zinc-400">
                    <span>{settings.taxAndService.taxName} ({settings.taxAndService.taxPercent}%):</span>
                    <span className="text-zinc-300">+ Rp {sampleTax.toLocaleString('id-ID')}</span>
                  </div>
                )}
                {settings.taxAndService.servicePercent > 0 && (
                  <div className="flex justify-between text-zinc-400">
                    <span>{settings.taxAndService.serviceName} ({settings.taxAndService.servicePercent}%):</span>
                    <span className="text-zinc-300">+ Rp {sampleService.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between text-white font-bold pt-2 border-t border-zinc-800 text-sm">
                  <span>Total yang Dibayar Konsumen:</span>
                  <span className="text-emerald-400">Rp {sampleTotal.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: LIVE PREVIEW QRIS KONSUMEN & UJI SUARA NOTIFIKASI */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Preview Card: Tampilan Layar HP Konsumen */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-xs font-mono uppercase tracking-wider">
                  Pratinjau Layar Konsumen (Live Preview)
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                Tepat Seperti di HP Tamu
              </span>
            </div>

            {/* Simulated Phone QRIS Modal Card */}
            <div className="bg-white text-zinc-950 rounded-3xl p-5 shadow-2xl border-4 border-zinc-800 space-y-4 text-center">
              {/* QRIS Top Badge */}
              <div className="flex items-center justify-between border-b-2 border-zinc-200 pb-2">
                <div className="flex items-center gap-1.5">
                  <div className="font-black text-xs tracking-tighter bg-zinc-950 text-white px-2 py-0.5 rounded">
                    QRIS
                  </div>
                  <span className="text-[9px] font-bold text-zinc-600">PEMBAYARAN NASIONAL</span>
                </div>
                <div className="text-[9px] font-mono text-zinc-500 font-bold">
                  NMID: {settings.qris.nmid}
                </div>
              </div>

              {/* Merchant Title */}
              <div className="space-y-0.5">
                <div className="text-xs font-black tracking-tight text-zinc-950 uppercase font-mono">
                  {settings.qris.merchantName || 'NAWATIGA COFFEE'}
                </div>
                <div className="text-[10px] text-zinc-500 font-serif">
                  by Rose Garden Coffee & Kitchen
                </div>
              </div>

              {/* QR Code Container */}
              <div className="p-3 bg-zinc-50 border-2 border-zinc-900 rounded-2xl mx-auto w-52 h-52 flex items-center justify-center shadow-inner relative overflow-hidden">
                {previewQrUrl ? (
                  <img
                    src={previewQrUrl}
                    alt="QRIS Barcode"
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="text-xs text-zinc-400 font-mono animate-pulse">
                    Memuat Barcode...
                  </div>
                )}
              </div>

              {/* Nominal Tagihan Preview */}
              <div className="bg-zinc-100 p-2.5 rounded-xl border border-zinc-200 space-y-0.5">
                <div className="text-[10px] text-zinc-500 font-mono">Total Tagihan (Contoh):</div>
                <div className="text-lg font-black text-zinc-950 font-mono">
                  Rp {testAmount.toLocaleString('id-ID')}
                </div>
              </div>

              {/* Anti-Salah Transfer Warning */}
              <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-300 text-left space-y-1">
                <div className="flex items-center gap-1.5 text-amber-800 font-bold text-[10px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span>Verifikasi Keamanan Transfer:</span>
                </div>
                <p className="text-[9px] text-amber-900 leading-tight">
                  {settings.qris.notes || 'Pastikan nama penerima di aplikasi m-Banking/e-Wallet Anda adalah NAWATIGA COFFEE sebelum konfirmasi bayar.'}
                </p>
                {settings.qris.accountInfo && (
                  <p className="text-[9px] text-zinc-600 font-mono pt-0.5 border-t border-amber-200">
                    Rek: {settings.qris.accountInfo}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* NOTIFIKASI SUARA ALAT TRANSAKSI BARISTA */}
          {/* ========================================================================= */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-xs font-mono uppercase tracking-wider">
                  Notifikasi Suara HP Transaksi Barista
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 font-mono">
                Speaker Aktif
              </span>
            </div>

            <div className="p-3 bg-zinc-900/90 rounded-2xl border border-zinc-800 text-xs text-zinc-300 space-y-1">
              <div className="font-bold text-white flex items-center gap-1.5">
                <span className="text-amber-400">⚖️</span>
                <span>Aturan Notifikasi Suara Transaksi:</span>
              </div>
              <ul className="text-[11px] text-zinc-400 space-y-1 list-disc list-inside">
                <li><strong className="text-white">Pembayaran Tunai (Cash):</strong> Bel kasir berbunyi (*cha-ching*) + suara hanya menyebutkan konfirmasi meja lunas (<strong>TIDAK menyebutkan total uang</strong>).</li>
                <li><strong className="text-emerald-400">Pembayaran QRIS / Rekening:</strong> Bel kasir berbunyi + suara <strong>MENYEBUTKAN NOMINAL UANG</strong> secara lengkap untuk validasi anti-salah transfer.</li>
              </ul>
            </div>

            {/* Test Audio Controls */}
            <div className="bg-zinc-900/80 rounded-2xl p-4 border border-zinc-800 space-y-3">
              <div className="text-xs font-bold text-zinc-200 flex items-center justify-between">
                <span>Uji Coba Suara Notifikasi Kasir:</span>
                <span className="text-emerald-400 font-mono font-normal text-[11px]">
                  TTS Bahasa Indonesia
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Pilih Meja Uji:</label>
                  <select
                    value={testTable}
                    onChange={(e) => setTestTable(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-750 text-white rounded-xl px-2.5 py-1.5 text-xs font-mono"
                  >
                    {['01', '04', '25', '42', '68', '88', '100', 'BAR'].map((t) => (
                      <option key={t} value={t}>
                        {t === 'BAR' ? 'Bar / Kasir' : `Meja #${t}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Nominal Uji:</label>
                  <select
                    value={testAmount}
                    onChange={(e) => setTestAmount(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-750 text-white rounded-xl px-2.5 py-1.5 text-xs font-mono"
                  >
                    <option value={42000}>Rp 42.000</option>
                    <option value={77000}>Rp 77.000</option>
                    <option value={122100}>Rp 122.100</option>
                    <option value={182600}>Rp 182.600</option>
                    <option value={250000}>Rp 250.000</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {/* Test QRIS/Rekening with money amount */}
                <button
                  type="button"
                  onClick={handleTestPaymentVoice}
                  className="py-3 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg transition-transform active:scale-95 cursor-pointer"
                  title="Membunyikan bel dan menyebutkan nominal uang lengkap"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Uji QRIS / Rekening (Pakai Nominal)</span>
                </button>

                {/* Test Cash without money amount */}
                <button
                  type="button"
                  onClick={handleTestCashVoice}
                  className="py-3 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-zinc-700 transition-colors cursor-pointer"
                  title="Membunyikan bel dan konfirmasi meja tanpa menyebutkan nominal uang"
                >
                  <Banknote className="w-3.5 h-3.5 text-amber-400" />
                  <span>Uji Tunai (Tanpa Sebut Uang)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
