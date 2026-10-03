import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Scan,
  Copy,
  Check,
  ExternalLink,
  Bell,
  Smartphone,
  Sparkles,
  ArrowRight,
  Printer,
  Download,
  Layers,
  CheckCircle2,
  Search,
  MapPin,
} from 'lucide-react';
import { playAdminChime } from '../utils/audio.ts';
import { NawatigaLogo } from './NawatigaLogo.tsx';
import { BarcodePrintModal } from './BarcodePrintModal.tsx';
import { ALL_100_TABLES, TABLE_ZONES, getTableZoneName } from '../data/tables.ts';

interface BarcodeStandProps {
  tableNumber: string;
  onOpenDigitalMenu: () => void;
  onSelectTable: (table: string) => void;
  onBackToBarista?: () => void;
}

export const BarcodeStand: React.FC<BarcodeStandProps> = ({
  tableNumber,
  onOpenDigitalMenu,
  onSelectTable,
  onBackToBarista,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isScanningSimulation, setIsScanningSimulation] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [tableSearch, setTableSearch] = useState<string>('');

  // Compute live active order URL
  const currentAppOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://nawatiga.cafe';
  const directOrderUrl = `${currentAppOrigin}/?table=${tableNumber}`;

  useEffect(() => {
    QRCode.toDataURL(directOrderUrl, {
      width: 320,
      margin: 1.5,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#09090b',
        light: '#ffffff',
      },
    })
      .then((url) => {
        setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate QR code', err);
      });
  }, [directOrderUrl]);

  // Filter tables according to zone and search
  const visibleTables = useMemo(() => {
    return ALL_100_TABLES.filter((t) => {
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase().trim();
        const matchNumber = t.toLowerCase().includes(q) || `meja ${t}`.toLowerCase().includes(q);
        const matchBar = t === 'BAR' && (q.includes('bar') || q.includes('kasir'));
        if (!matchNumber && !matchBar) return false;
      }

      if (selectedZone === 'all') return true;
      if (selectedZone === 'bar') return t === 'BAR';

      const zone = TABLE_ZONES.find((z) => z.id === selectedZone);
      if (!zone) return true;
      if (t === 'BAR') return false;
      const num = parseInt(t, 10);
      return !isNaN(num) && num >= zone.start && num <= zone.end;
    });
  }, [selectedZone, tableSearch]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(directOrderUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR-Code-Meja-${tableNumber}-NAWATIGA.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleStartSimulation = () => {
    setIsScanningSimulation(true);
    setScanProgress(0);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          playAdminChime();
          setTimeout(() => {
            setIsScanningSimulation(false);
            onOpenDigitalMenu();
          }, 400);
          return 100;
        }
        return prev + 25;
      });
    }, 250);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Admin / Staff Navigation Toolbar */}
      <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 flex items-center justify-between gap-3 flex-wrap shadow-lg">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="text-xs font-black text-amber-300 uppercase tracking-wider font-mono">
            Panel Staf: Generator Barcode Stand Akrilik
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onBackToBarista && (
            <button
              type="button"
              onClick={onBackToBarista}
              className="px-3 py-1.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs font-bold border border-zinc-700 transition-colors cursor-pointer"
            >
              ← Layar KDS Barista
            </button>
          )}
          <button
            type="button"
            onClick={onOpenDigitalMenu}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-black transition-colors cursor-pointer"
          >
            Mode Tamu Konsumen →
          </button>
        </div>
      </div>

      {/* Intro Header */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold">
          <span>Sistem Pemesanan Mandiri Meja</span>
          <span>·</span>
          <span>100 Meja Terdaftar</span>
        </div>
        <h2 className="text-2xl font-bold font-serif-cafe text-white">
          Scan Barcode di Meja Anda
        </h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          Setiap meja dari Meja 01 s/d Meja 100 di NAWATIGA dilengkapi stand akrilik barcode khusus. Pindai menggunakan kamera HP untuk memesan tanpa antre.
        </p>
      </div>

      {/* 100-Table Selector Navigation Card */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-bold text-white text-sm">Pilih Meja untuk Pratinjau & Cetak:</span>
            <p className="text-[11px] text-zinc-400">Total 100 Meja Indoor & Outdoor + Stand Bar</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-mono text-[11px]">Meja Aktif:</span>
            <span className="px-3 py-1 rounded-xl bg-amber-400 text-zinc-950 font-black font-mono text-xs shadow-md">
              {tableNumber === 'BAR' ? 'PICK-UP BAR' : `MEJA #${tableNumber}`}
            </span>
          </div>
        </div>

        {/* Zone Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedZone('all')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedZone === 'all'
                ? 'bg-white text-zinc-950 shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Semua (1-100)
          </button>
          {TABLE_ZONES.map((zone) => (
            <button
              key={zone.id}
              type="button"
              onClick={() => setSelectedZone(zone.id)}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedZone === zone.id
                  ? 'bg-amber-400 text-zinc-950 font-bold shadow-md'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {zone.rangeLabel}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedZone('bar')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedZone === 'bar'
                ? 'bg-amber-400 text-zinc-950 font-bold shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Pick-up Bar
          </button>
        </div>

        {/* Quick Filter Search & Dropdown */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-zinc-850">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Cari nomor meja (misal: 15, 68, 99)..."
              className="w-full bg-zinc-900 border border-zinc-750 text-white rounded-xl pl-8 pr-3 py-1.5 text-xs placeholder:text-zinc-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[11px] text-zinc-400 whitespace-nowrap">Loncat ke Meja:</span>
            <select
              value={tableNumber}
              onChange={(e) => onSelectTable(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-400 cursor-pointer flex-1 sm:flex-none"
            >
              {ALL_100_TABLES.map((t) => (
                <option key={t} value={t}>
                  {t === 'BAR' ? 'Stand Bar / Kasir' : `Meja #${t} (${getTableZoneName(t)})`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Scrollable Pills Grid */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
          {visibleTables.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onSelectTable(t)}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
                tableNumber === t
                  ? 'bg-white text-zinc-950 shadow-md scale-105 ring-2 ring-white/50'
                  : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {t === 'BAR' ? 'BAR' : `#${t}`}
            </button>
          ))}
        </div>
      </div>

      {/* Realistic Table Stand Showcase */}
      <div className="relative mx-auto w-full max-w-sm">
        {/* Wooden Base & Acrylic Stand Card */}
        <div className="bg-zinc-950 rounded-3xl p-6 shadow-2xl border border-zinc-800 text-center relative overflow-hidden">
          {/* Top Silver Metallic Clip Decor */}
          <div className="w-16 h-2 bg-gradient-to-r from-zinc-500 via-zinc-200 to-zinc-600 mx-auto rounded-full mb-4 shadow-sm" />

          {/* Stand Header */}
          <div className="flex flex-col items-center gap-1.5 mb-3">
            <NawatigaLogo variant="dark" size="md" />
            <div className="space-y-0.5">
              <div className="text-xs tracking-wider uppercase font-black text-white font-serif-cafe">
                NAWATIGA
              </div>
              <div className="text-[10px] text-amber-300 font-medium">by Rose Garden Coffee</div>
              <div className="text-[10px] font-sans text-zinc-400">Self-Order & Contactless Service</div>
            </div>
          </div>

          {/* Table Number Badge */}
          <div className="space-y-1 mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white text-zinc-950 shadow-md border border-zinc-200">
              <span className="text-xs uppercase tracking-wider font-bold text-zinc-600">
                {tableNumber === 'BAR' ? 'LOKASI' : 'NOMOR MEJA'}
              </span>
              <span className="text-lg font-black text-zinc-950 tracking-tight font-mono">
                {tableNumber === 'BAR' ? 'PICK-UP BAR' : `#${tableNumber}`}
              </span>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono">
              Area: {getTableZoneName(tableNumber)}
            </div>
          </div>

          {/* QR Code Container */}
          <div className="relative w-48 h-48 mx-auto p-2.5 bg-white rounded-2xl border-2 border-zinc-900 shadow-inner flex items-center justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code Meja ${tableNumber}`}
                className="w-full h-full object-contain rounded-lg"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400">
                <QrCode className="w-12 h-12 animate-pulse" />
              </div>
            )}

            {/* Scanning simulation overlay */}
            {isScanningSimulation && (
              <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-white p-4">
                <div className="w-16 h-16 border-2 border-emerald-400 rounded-lg relative flex items-center justify-center mb-2">
                  <div className="absolute w-full h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                  <Scan className="w-8 h-8 text-emerald-300" />
                </div>
                <div className="text-xs font-semibold text-emerald-300 font-mono">Mendeteksi QR...</div>
                <div className="w-24 h-1.5 bg-white/20 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-200"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Instructions below QR */}
          <div className="mt-4 space-y-1">
            <p className="text-xs font-bold text-white">Arahkan Kamera HP ke QR Code</p>
            <p className="text-[11px] text-zinc-400">
              Buka kamera bawaan HP (iOS / Android) lalu buka tautan yang tampil di layar.
            </p>
          </div>

          {/* Stand Foot Base Decoration */}
          <div className="mt-5 -mx-6 -mb-6 pt-3 pb-3 bg-zinc-900 text-zinc-400 text-[10px] uppercase tracking-wider font-semibold shadow-inner border-t border-zinc-800">
            Stand Akrilik Meja · NAWATIGA Coffee
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRINT & DOWNLOAD ACTIONS TOOLBAR */}
      {/* ========================================================================= */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white font-serif-cafe">
              Pilihan Cetak Barcode Stand Meja (Hingga 100 Meja)
            </h3>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">
            Ukuran A6 / Stand Akrilik
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Action 1: Print Single Table Stand */}
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="p-3.5 rounded-2xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Stand Meja #{tableNumber}</span>
          </button>

          {/* Action 2: Batch Print All Tables */}
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="p-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-700 text-zinc-100 font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Cetak Massal (Semua 100 Meja)</span>
          </button>

          {/* Action 3: Download QR Image PNG */}
          <button
            type="button"
            onClick={handleDownloadQr}
            className="p-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-700 text-zinc-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
            title="Download file gambar PNG untuk percetakan / stiker"
          >
            <Download className="w-4 h-4" />
            <span>Unduh QR (PNG)</span>
          </button>
        </div>

        <p className="text-[11px] text-zinc-400 text-center leading-relaxed">
          💡 Format cetak sudah dirancang presisi dengan logo NAWATIGA, nomor meja tebal, dan panduan 3 langkah scan mandiri untuk akrilik meja tamu.
        </p>
      </div>

      {/* Simulator Action Button */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleStartSimulation}
          disabled={isScanningSimulation}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <Smartphone className="w-4 h-4 text-amber-400" />
          <span>Simulasikan Scan Kamera HP Meja #{tableNumber}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <p className="text-[11px] text-zinc-500 mt-1.5">
          Klik tombol di atas untuk melihat proses pindaian barcode kamera HP secara instan.
        </p>
      </div>

      {/* Fallback Protocol Section */}
      <div className="bg-zinc-950 rounded-3xl p-5 border border-zinc-800 space-y-3 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-zinc-900 text-amber-400 mt-0.5 border border-zinc-800">
            <QrCode className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-white">
              Barcode Tidak Bisa Di-scan atau Kamera Tamu Bermasalah?
            </h4>
            <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
              Jika barcode terhalang atau kamera tamu bermasalah, Kakak bisa langsung menggunakan link web pemesanan mandiri atau panggil waiter:
            </p>
          </div>
        </div>

        {/* Alternative Link Box */}
        <div className="bg-zinc-900 rounded-2xl p-3 border border-zinc-800 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-zinc-400 uppercase font-semibold">Tautan Alternatif Menu Web:</div>
            <div className="text-xs font-mono text-zinc-200 truncate select-all font-semibold">
              {directOrderUrl}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-zinc-200 text-xs font-semibold flex items-center gap-1 border border-zinc-750 transition-colors"
              title="Salin tautan"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onOpenDigitalMenu}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <span>Buka Menu</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Barcode Print Modal */}
      <BarcodePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        initialTableNumber={tableNumber}
      />
    </div>
  );
};
