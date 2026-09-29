import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  X,
  Download,
  Copy,
  Check,
  QrCode,
  Layers,
  Sparkles,
  ExternalLink,
  Smartphone,
  Coffee,
  CheckCircle2,
  FileText,
  SlidersHorizontal,
  Search,
  MapPin,
  Loader2,
} from 'lucide-react';
import { NawatigaLogo } from './NawatigaLogo.tsx';
import { ALL_100_TABLES, TABLE_ZONES, getTableZoneName } from '../data/tables.ts';

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTableNumber?: string;
}

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({
  isOpen,
  onClose,
  initialTableNumber = '01',
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  const [selectedTable, setSelectedTable] = useState<string>(initialTableNumber);
  const [batchRange, setBatchRange] = useState<string>('all');
  const [sizeFormat, setSizeFormat] = useState<'a6' | 'a7' | 'sticker'>('a6');
  const [urlSource, setUrlSource] = useState<'current' | 'official' | 'custom'>('current');
  const [customBaseUrl, setCustomBaseUrl] = useState<string>('https://nawatiga.cafe/order');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [singleSearch, setSingleSearch] = useState<string>('');

  // Generated QR codes map for all tables
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [generateProgress, setGenerateProgress] = useState<number>(0);

  // Compute base URL
  const getTargetUrlForTable = (table: string): string => {
    let base = 'https://nawatiga.cafe/order';
    if (urlSource === 'current' && typeof window !== 'undefined') {
      base = window.location.origin;
    } else if (urlSource === 'custom' && customBaseUrl.trim()) {
      base = customBaseUrl.trim();
    }
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}table=${table}`;
  };

  // Compute tables for batch
  const batchTables = useMemo(() => {
    if (batchRange === 'all') return ALL_100_TABLES;
    if (batchRange === 'bar') return ['BAR'];
    const zone = TABLE_ZONES.find((z) => z.id === batchRange);
    if (!zone) return ALL_100_TABLES;
    return ALL_100_TABLES.filter((t) => {
      if (t === 'BAR') return false;
      const num = parseInt(t, 10);
      return !isNaN(num) && num >= zone.start && num <= zone.end;
    });
  }, [batchRange]);

  // Generate QR Codes on mount / table / url / batch change
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsGenerating(true);
    setGenerateProgress(0);

    const generateQrs = async () => {
      const results: Record<string, string> = {};
      const tablesToGen = activeTab === 'batch' ? batchTables : [selectedTable];

      let count = 0;
      for (const tbl of tablesToGen) {
        // If already in map and not custom url change, can reuse
        if (qrMap[tbl] && urlSource === 'current') {
          results[tbl] = qrMap[tbl];
          count++;
          continue;
        }

        const url = getTargetUrlForTable(tbl);
        try {
          const dataUrl = await QRCode.toDataURL(url, {
            width: 400,
            margin: 1.5,
            errorCorrectionLevel: 'H',
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
          });
          results[tbl] = dataUrl;
        } catch (err) {
          console.error(`Failed generating QR for table ${tbl}`, err);
        }
        count++;
        if (isMounted && count % 5 === 0) {
          setGenerateProgress(Math.round((count / tablesToGen.length) * 100));
        }
      }

      if (isMounted) {
        setQrMap((prev) => ({ ...prev, ...results }));
        setIsGenerating(false);
        setGenerateProgress(100);
      }
    };

    generateQrs();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedTable, activeTab, urlSource, customBaseUrl, batchRange]);

  if (!isOpen) return null;

  const currentQrUrl = qrMap[selectedTable] || '';
  const currentTableUrl = getTargetUrlForTable(selectedTable);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQr = () => {
    if (!currentQrUrl) return;
    const a = document.createElement('a');
    a.href = currentQrUrl;
    a.download = `QR-Stand-Meja-${selectedTable}-NAWATIGA.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentTableUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // quiet
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Top Header (Hidden on print) */}
        <div className="p-4 sm:p-5 border-b border-zinc-850 flex items-center justify-between no-print bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-750 flex items-center justify-center text-amber-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm sm:text-base font-serif-cafe">
                  Pencetakan Barcode & Stand Akrilik (100 Meja)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                  Print Ready
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Cetak kartu nomor meja akrilik untuk Meja 01 s/d Meja 100 atau stiker meja tahan air.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (Hidden on print) */}
        <div className="px-5 pt-3 border-b border-zinc-850 flex items-center justify-between gap-3 no-print bg-zinc-900/30 overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'single'
                  ? 'border-white text-white'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Cetak Stand Meja Ini (#{selectedTable})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('batch')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'batch'
                  ? 'border-white text-white'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Cetak Massal (Semua 100 Meja)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                {batchTables.length} Stand
              </span>
            </button>
          </div>

          {/* Quick Format Size Selector */}
          <div className="hidden sm:flex items-center gap-1 text-xs pb-2">
            <span className="text-[10px] text-zinc-400 font-mono uppercase mr-1">Format:</span>
            {[
              { id: 'a6' as const, label: 'Stand A6 (10x15cm)' },
              { id: 'a7' as const, label: 'Mini A7 (7x10cm)' },
              { id: 'sticker' as const, label: 'Stiker (8x8cm)' },
            ].map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                onClick={() => setSizeFormat(fmt.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  sizeFormat === fmt.id
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {fmt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Controls Bar (Select Table & Domain Target) */}
          <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800/80 space-y-3 no-print text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Single Mode: Table Selector (1 - 100) */}
              {activeTab === 'single' ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-zinc-300 font-bold">Pilih Nomor Meja (1-100):</span>
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    {ALL_100_TABLES.map((t) => (
                      <option key={t} value={t}>
                        {t === 'BAR' ? 'Stand Bar / Pick-up' : `Meja #${t} (${getTableZoneName(t)})`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                /* Batch Mode: Zone Range Selector */
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-zinc-300 font-bold">Pilih Range Cetak:</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setBatchRange('all')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        batchRange === 'all'
                          ? 'bg-white text-zinc-950'
                          : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                    >
                      Semua (01-100 & BAR)
                    </button>
                    {TABLE_ZONES.map((zone) => (
                      <button
                        key={zone.id}
                        type="button"
                        onClick={() => setBatchRange(zone.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                          batchRange === zone.id
                            ? 'bg-amber-400 text-zinc-950 font-bold'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                      >
                        {zone.rangeLabel}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setBatchRange('bar')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        batchRange === 'bar'
                          ? 'bg-amber-400 text-zinc-950 font-bold'
                          : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                    >
                      Stand Bar
                    </button>
                  </div>
                </div>
              )}

              {/* URL Domain Target Selector */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-zinc-400">Target Link QR:</span>
                <button
                  type="button"
                  onClick={() => setUrlSource('current')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    urlSource === 'current'
                      ? 'bg-amber-400 text-zinc-950 font-bold'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                  title="Link langsung membuka aplikasi web yang sedang aktif ini saat di-scan HP"
                >
                  Domain Web Aktif
                </button>
                <button
                  type="button"
                  onClick={() => setUrlSource('official')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    urlSource === 'official'
                      ? 'bg-amber-400 text-zinc-950 font-bold'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                  title="nawatiga.cafe/order"
                >
                  Domain Resmi
                </button>
              </div>
            </div>

            {/* Target URL Preview */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/60 text-[11px] font-mono text-zinc-400">
              <div className="truncate flex-1">
                Isi QR Code Meja #{selectedTable}: <span className="text-zinc-200">{currentTableUrl}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="text-amber-400 hover:text-amber-300 font-sans font-semibold flex items-center gap-1 cursor-pointer flex-shrink-0"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedLink ? 'Tersalin' : 'Salin Link'}</span>
              </button>
            </div>
          </div>

          {/* Loading Progress Indicator for batch */}
          {isGenerating && (
            <div className="no-print bg-zinc-900/80 border border-zinc-800 p-3 rounded-2xl flex items-center justify-between text-xs text-amber-300">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyiapkan {batchTables.length} QR Code resolusi tinggi...</span>
              </div>
              <span className="font-mono font-bold">{generateProgress}%</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PRINTABLE PREVIEW CONTAINER */}
          {/* ========================================================================= */}
          <div id="printable-table-barcode" className="printable-area">
            {activeTab === 'single' ? (
              /* SINGLE TABLE STAND CARD */
              <div className="flex justify-center">
                <PrintableStandCard
                  tableNumber={selectedTable}
                  qrDataUrl={currentQrUrl}
                  format={sizeFormat}
                />
              </div>
            ) : (
              /* BATCH ALL TABLES (GRID FOR A4 PRINTING) */
              <div className="space-y-6">
                <div className="no-print bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>
                      Menampilkan <strong>{batchTables.length} Lembar Stand Meja</strong> siap cetak.
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    Siap diprint pada kertas A4 / Cardstock lalu dipotong sesuai garis tepi.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {batchTables.map((tableNum) => (
                    <div
                      key={tableNum}
                      className="border border-dashed border-zinc-700 p-2 rounded-2xl bg-zinc-900/40 relative group page-break-after"
                    >
                      <div className="no-print text-[10px] font-mono text-zinc-400 mb-1.5 flex justify-between px-1">
                        <span>Potong Garis Luar</span>
                        <span>#{tableNum} · {getTableZoneName(tableNum)}</span>
                      </div>
                      <PrintableStandCard
                        tableNumber={tableNum}
                        qrDataUrl={qrMap[tableNum] || ''}
                        format={sizeFormat}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Action Footer (Hidden on print) */}
        <div className="p-4 sm:p-5 border-t border-zinc-850 bg-zinc-900/80 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="text-xs text-zinc-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Resolusi tajam 300 DPI · Kompatibel dengan semua jenis printer (Laser, Inkjet, Thermal)
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {activeTab === 'single' && (
              <button
                type="button"
                onClick={handleDownloadQr}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                title="Simpan file gambar PNG untuk dikirim ke percetakan akrilik"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Gambar QR (PNG)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-black flex items-center gap-2 shadow-xl hover:shadow-2xl transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>
                {activeTab === 'batch'
                  ? `Cetak Semua ${batchTables.length} Meja Sekarang`
                  : `Cetak Stand Meja #${selectedTable}`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// PRINTABLE ACRYLIC STAND CARD COMPONENT
// =========================================================================
interface PrintableStandCardProps {
  tableNumber: string;
  qrDataUrl: string;
  format: 'a6' | 'a7' | 'sticker';
}

const PrintableStandCard: React.FC<PrintableStandCardProps> = ({
  tableNumber,
  qrDataUrl,
  format,
}) => {
  const isBar = tableNumber === 'BAR' || /bar/i.test(tableNumber);
  const zoneName = getTableZoneName(tableNumber);

  return (
    <div
      className={`bg-white text-zinc-950 rounded-2xl shadow-xl border-2 border-zinc-900 p-5 flex flex-col justify-between text-center select-text mx-auto transition-transform ${
        format === 'sticker'
          ? 'w-[280px] h-[280px]'
          : format === 'a7'
          ? 'w-[260px] min-h-[350px]'
          : 'w-[300px] min-h-[420px]'
      }`}
      style={{
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
      }}
    >
      {/* Stand Header Branding */}
      <div className="space-y-1 border-b-2 border-zinc-900 pb-3">
        <div className="flex justify-center mb-1">
          <NawatigaLogo variant="light" size="sm" />
        </div>
        <div className="text-[10px] font-mono font-black tracking-widest text-zinc-600 uppercase">
          SELF-SERVICE ORDER & PICK-UP
        </div>
        <h2 className="text-xl font-black font-serif-cafe tracking-wide text-zinc-950">
          NAWATIGA
        </h2>
        <div className="text-[10px] font-serif italic text-zinc-600">
          by Rose Garden Coffee · {zoneName}
        </div>
      </div>

      {/* Table Identifier Badge */}
      <div className="my-2.5 space-y-0.5">
        <div className="inline-block bg-zinc-950 text-white rounded-xl px-4 py-1.5 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mr-1.5">
            {isBar ? 'STATION' : 'NOMOR'}
          </span>
          <span className="text-lg font-black font-mono tracking-tight text-white">
            {isBar ? 'PICK-UP BAR' : `MEJA #${tableNumber}`}
          </span>
        </div>
        <div className="text-[9px] text-zinc-500 font-mono uppercase">
          {zoneName}
        </div>
      </div>

      {/* High-Resolution QR Code */}
      <div className="p-2.5 bg-white border-2 border-zinc-900 rounded-2xl mx-auto shadow-inner w-44 h-44 flex items-center justify-center">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`QR Meja ${tableNumber}`}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-xs text-zinc-400 animate-pulse font-mono">Membuat QR...</div>
        )}
      </div>

      {/* 3 Steps Guide for Customers */}
      {format !== 'sticker' && (
        <div className="mt-3 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200 text-left space-y-1">
          <div className="text-[10px] font-black text-zinc-900 uppercase font-mono tracking-wider text-center pb-0.5">
            CARA PESAN MANDIRI:
          </div>
          <div className="text-[10px] text-zinc-700 space-y-0.5">
            <div className="flex items-start gap-1.5">
              <span className="font-bold text-zinc-950">1.</span>
              <span>Buka kamera HP Anda (tanpa perlu unduh aplikasi).</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="font-bold text-zinc-950">2.</span>
              <span>Arahkan ke QR Code di atas & klik tautan menu.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="font-bold text-zinc-950">3.</span>
              <span>Pilih menu. HP akan berdering saat pesanan siap diambil!</span>
            </div>
          </div>
        </div>
      )}

      {/* Card Footer */}
      <div className="pt-2 border-t border-zinc-200 text-[9px] text-zinc-500 font-mono text-center">
        {isBar ? 'Pick-up Counter · Ambil Sendiri Pesanan Anda' : 'Buzzer HP Otomatis · Kembalikan Nampan ke Return Station'}
      </div>
    </div>
  );
};
