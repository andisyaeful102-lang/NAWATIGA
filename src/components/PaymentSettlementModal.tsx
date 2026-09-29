import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Check,
  CreditCard,
  QrCode,
  Banknote,
  Clock,
  Printer,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Receipt,
  User,
  Copy,
  Building2,
} from 'lucide-react';
import { BaristaOrder } from './BaristaKDSView.tsx';
import { CafeSettings, DEFAULT_CAFE_SETTINGS } from '../data/settings.ts';
import { playPaymentSuccessAnnouncement } from '../utils/audio.ts';

interface PaymentSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: BaristaOrder | null;
  onPaymentSettled: (orderId: string, paymentMethod: string, amountReceived?: number) => Promise<void> | void;
  onOpenReceipt?: (order: BaristaOrder) => void;
}

export const PaymentSettlementModal: React.FC<PaymentSettlementModalProps> = ({
  isOpen,
  onClose,
  order,
  onPaymentSettled,
  onOpenReceipt,
}) => {
  const [paymentType, setPaymentType] = useState<'Tunai' | 'QRIS' | 'Rekening' | 'Debit'>('Tunai');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [edcBank, setEdcBank] = useState<string>('BCA');
  const [edcRefNo, setEdcRefNo] = useState<string>('');
  const [copiedRekening, setCopiedRekening] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [settledSuccess, setSettledSuccess] = useState<boolean>(false);
  const [cafeSettings, setCafeSettings] = useState<CafeSettings>(DEFAULT_CAFE_SETTINGS);
  const [qrisUrl, setQrisUrl] = useState<string>('');

  // Fetch cafe settings for QRIS merchant details
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.settings) {
          setCafeSettings(data.settings);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Reset or initialize state when order changes
  useEffect(() => {
    if (order) {
      setCashReceived(order.totalAmount);
      setSettledSuccess(false);
      setIsProcessing(false);
      setEdcRefNo('');
    }
  }, [order, isOpen]);

  // Generate dynamic QRIS for settlement
  useEffect(() => {
    if (!isOpen || !order || paymentType !== 'QRIS') return;

    if (cafeSettings.qris?.qrisImageUrl) {
      setQrisUrl(cafeSettings.qris.qrisImageUrl);
      return;
    }

    const merchant = cafeSettings.qris?.merchantName || 'NAWATIGA COFFEE';
    const nmid = cafeSettings.qris?.nmid || 'ID1024356789012';
    const payload = `00020101021226${nmid.length}${nmid}52045812530336054${order.totalAmount}5802ID59${merchant.length}${merchant}6007JAKARTA6304`;

    QRCode.toDataURL(payload, {
      width: 260,
      margin: 1.5,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((url) => setQrisUrl(url))
      .catch(() => {});
  }, [isOpen, order, paymentType, cafeSettings]);

  if (!isOpen || !order) return null;

  const total = order.totalAmount;
  const changeAmount = cashReceived - total;
  const isCashSufficient = paymentType !== 'Tunai' || cashReceived >= total;

  const handleConfirmSettlement = async () => {
    if (!isCashSufficient || isProcessing) return;

    setIsProcessing(true);
    try {
      let finalMethod = 'Tunai';
      if (paymentType === 'QRIS') {
        finalMethod = 'QRIS';
      } else if (paymentType === 'Rekening') {
        finalMethod = 'Transfer Rekening';
      } else if (paymentType === 'Debit') {
        finalMethod = `Debit ${edcBank}${edcRefNo ? ` (${edcRefNo})` : ''}`;
      } else {
        finalMethod = `Tunai (Cash)`;
      }

      await onPaymentSettled(order.id || order.orderNumber, finalMethod, cashReceived);

      // Play chime + Indonesian announcement
      // Note: Cash will omit total money amount, QRIS and Rekening will announce exact total money amount!
      playPaymentSuccessAnnouncement(order.tableNumber, total, finalMethod);

      setSettledSuccess(true);
    } catch (err) {
      console.error('Failed to settle payment:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-zinc-900/80 border-b border-zinc-850 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-500/30">
                  Pelunasan Kasir
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  {order.orderNumber}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black font-serif-cafe text-white mt-0.5">
                {order.tableNumber === 'BAR' || /bar|kasir/i.test(order.tableNumber)
                  ? 'Pelunasan Meja Bar & Kasir'
                  : `Pelunasan Tagihan Meja #${order.tableNumber}`}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {settledSuccess ? (
            /* SUCCESS CELEBRATION VIEW */
            <div className="py-8 text-center space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-black text-white font-serif-cafe">
                  Pembayaran Berhasil Dilunasi!
                </h4>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  Tagihan untuk{' '}
                  <strong className="text-white">
                    {order.tableNumber === 'BAR' ? 'Bar/Kasir' : `Meja #${order.tableNumber}`}
                  </strong>{' '}
                  sebesar{' '}
                  <strong className="text-emerald-400 font-mono">
                    Rp {total.toLocaleString('id-ID')}
                  </strong>{' '}
                  telah lunas di sistem KDS & kasir.
                </p>
                {paymentType === 'Tunai' && changeAmount > 0 && (
                  <div className="pt-2">
                    <span className="inline-block px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-300 font-mono font-bold text-xs">
                      Kembalian Tunai: Rp {changeAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-2 max-w-sm mx-auto">
                {onOpenReceipt && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenReceipt(order);
                      onClose();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span>Cetak Struk Transaksi</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-black transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          ) : (
            /* PAYMENT FORM VIEW */
            <>
              {/* Order Bill Summary */}
              <div className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-zinc-800/80 pb-2">
                  <span className="font-bold uppercase tracking-wider font-mono">Rincian Menu ({order.items.length} Item):</span>
                  <span>Waktu: {order.createdAt}</span>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {order.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-amber-400 font-bold">[{it.quantity}x]</span>
                        <span className="text-zinc-200 truncate">{it.name}</span>
                      </div>
                      <span className="font-mono text-zinc-300 font-bold ml-2">
                        Rp {it.price.toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total Bill Row */}
                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-mono uppercase">Total Tagihan Yang Harus Dibayar:</span>
                    <div className="text-xl font-black font-mono text-emerald-400">
                      Rp {total.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold font-mono">
                      <Clock className="w-3 h-3" />
                      <span>Status: Bayar Nanti</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 block">
                  Pilih Metode Pembayaran Konsumen:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Tunai */}
                  <button
                    type="button"
                    onClick={() => setPaymentType('Tunai')}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      paymentType === 'Tunai'
                        ? 'bg-white text-zinc-950 border-white shadow-lg font-black'
                        : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800 font-semibold'
                    }`}
                  >
                    <Banknote className="w-5 h-5" />
                    <span className="text-xs block">Tunai (Cash)</span>
                    <span className={`text-[9px] font-mono ${paymentType === 'Tunai' ? 'text-zinc-600' : 'text-zinc-500'}`}>
                      Tanpa Sebut Uang
                    </span>
                  </button>

                  {/* QRIS */}
                  <button
                    type="button"
                    onClick={() => setPaymentType('QRIS')}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      paymentType === 'QRIS'
                        ? 'bg-white text-zinc-950 border-white shadow-lg font-black'
                        : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800 font-semibold'
                    }`}
                  >
                    <QrCode className="w-5 h-5" />
                    <span className="text-xs block">QRIS Dinamis</span>
                    <span className={`text-[9px] font-mono font-bold ${paymentType === 'QRIS' ? 'text-emerald-800' : 'text-emerald-400'}`}>
                      Sebut Nominal
                    </span>
                  </button>

                  {/* Transfer Rekening */}
                  <button
                    type="button"
                    onClick={() => setPaymentType('Rekening')}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      paymentType === 'Rekening'
                        ? 'bg-white text-zinc-950 border-white shadow-lg font-black'
                        : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800 font-semibold'
                    }`}
                  >
                    <Building2 className="w-5 h-5" />
                    <span className="text-xs block">Rekening Bank</span>
                    <span className={`text-[9px] font-mono font-bold ${paymentType === 'Rekening' ? 'text-emerald-800' : 'text-emerald-400'}`}>
                      Sebut Nominal
                    </span>
                  </button>

                  {/* Debit EDC */}
                  <button
                    type="button"
                    onClick={() => setPaymentType('Debit')}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      paymentType === 'Debit'
                        ? 'bg-white text-zinc-950 border-white shadow-lg font-black'
                        : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800 font-semibold'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-xs block">Debit EDC</span>
                    <span className={`text-[9px] font-mono ${paymentType === 'Debit' ? 'text-zinc-600' : 'text-zinc-500'}`}>
                      Mesin Kartu
                    </span>
                  </button>
                </div>
              </div>

              {/* METHOD 1: CASH PAYMENT CALCULATOR */}
              {paymentType === 'Tunai' && (
                <div className="bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 space-y-3 animate-in fade-in">
                  <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-300 flex items-center gap-2">
                    <span className="text-amber-400 text-sm">💡</span>
                    <span>
                      <strong>Mode Tunai:</strong> Uang fisik dihitung langsung oleh kasir. Notifikasi suara <strong>TIDAK menyebutkan total uang</strong> demi kenyamanan transaksi di meja bar.
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-300 flex items-center justify-between">
                      <span>Uang Diterima dari Konsumen (Rp):</span>
                      <span className="font-mono text-zinc-400">
                        Total: Rp {total.toLocaleString('id-ID')}
                      </span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={cashReceived || ''}
                      onChange={(e) => setCashReceived(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-base text-white font-mono font-black focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setCashReceived(total)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-bold cursor-pointer"
                    >
                      Uang Pas (Rp {total.toLocaleString('id-ID')})
                    </button>
                    {[50000, 100000, 150000, 200000, 500000].map((amt) => {
                      if (amt < total && amt !== 50000) return null;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCashReceived(amt)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-bold cursor-pointer"
                        >
                          Rp {amt.toLocaleString('id-ID')}
                        </button>
                      );
                    })}
                  </div>

                  {/* Kembalian Calculation Box */}
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between font-mono text-xs ${
                      changeAmount >= 0
                        ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                        : 'bg-rose-950/60 border-rose-700 text-rose-200'
                    }`}
                  >
                    <span>{changeAmount >= 0 ? 'Kembalian Tunai:' : 'Uang Pembayaran Kurang:'}</span>
                    <span className="text-sm font-black">
                      Rp {Math.abs(changeAmount).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              )}

              {/* METHOD 2: QRIS PAYMENT DISPLAY */}
              {paymentType === 'QRIS' && (
                <div className="bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 space-y-3 text-center animate-in fade-in">
                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-[11px] text-emerald-200 text-left flex items-center gap-2">
                    <span className="text-emerald-400 text-base">🔊</span>
                    <span>
                      <strong>Mode QRIS:</strong> Notifikasi suara kasir otomatis <strong>menyebutkan nomor meja dan nominal uang</strong> secara lengkap untuk validasi dana masuk.
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-xs font-black text-white font-mono uppercase">
                      {cafeSettings.qris?.merchantName || 'NAWATIGA COFFEE & ROASTERY'}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Tunjukkan barcode ini ke konsumen untuk scan menggunakan m-Banking/e-Wallet
                    </div>
                  </div>

                  <div className="w-44 h-44 mx-auto p-2 bg-white rounded-2xl border-2 border-zinc-900 flex items-center justify-center shadow-inner">
                    {qrisUrl ? (
                      <img src={qrisUrl} alt="QRIS" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-xs text-zinc-400 font-mono animate-pulse">Memuat QRIS...</div>
                    )}
                  </div>

                  <div className="text-xs font-mono text-zinc-300">
                    Nominal Tagihan: <strong className="text-emerald-400 font-black">Rp {total.toLocaleString('id-ID')}</strong>
                  </div>
                </div>
              )}

              {/* METHOD 3: TRANSFER REKENING BANK */}
              {paymentType === 'Rekening' && (
                <div className="bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 space-y-3 animate-in fade-in text-xs">
                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-[11px] text-emerald-200 flex items-center gap-2">
                    <span className="text-emerald-400 text-base">🔊</span>
                    <span>
                      <strong>Mode Rekening Bank:</strong> Notifikasi suara kasir otomatis <strong>menyebutkan nomor meja dan nominal transfer</strong> untuk validasi mutasi rekening.
                    </span>
                  </div>

                  <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                      <span className="font-bold uppercase font-mono">Rekening Resmi Kafe Nawatiga:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const acc = cafeSettings.qris?.accountInfo || 'BCA 827-091-2345 a.n PT Nawatiga Rasa Nusantara';
                          navigator.clipboard.writeText(acc);
                          setCopiedRekening(true);
                          setTimeout(() => setCopiedRekening(false), 2000);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedRekening ? 'Tersalin!' : 'Salin Rekening'}</span>
                      </button>
                    </div>

                    <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-750 font-mono text-sm font-bold text-amber-300">
                      {cafeSettings.qris?.accountInfo || 'BCA 827-091-2345 a.n PT Nawatiga Rasa Nusantara'}
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-zinc-400">Total Nominal Ditransfer:</span>
                      <span className="text-base font-black font-mono text-emerald-400">
                        Rp {total.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* METHOD 3: DEBIT EDC */}
              {paymentType === 'Debit' && (
                <div className="bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 space-y-3 animate-in fade-in text-xs">
                  <div className="space-y-1.5">
                    <label className="text-zinc-300 font-bold block">Pilih Mesin EDC / Bank:</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['BCA', 'Mandiri', 'BRI', 'BNI'].map((bank) => (
                        <button
                          key={bank}
                          type="button"
                          onClick={() => setEdcBank(bank)}
                          className={`py-2 rounded-xl border text-center font-bold font-mono transition-all cursor-pointer ${
                            edcBank === bank
                              ? 'bg-white text-zinc-950 border-white'
                              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                          }`}
                        >
                          {bank}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-300 font-bold block">
                      Nomor Ref / Approval EDC (Opsional):
                    </label>
                    <input
                      type="text"
                      value={edcRefNo}
                      onChange={(e) => setEdcRefNo(e.target.value)}
                      placeholder="Contoh: APPR-88219"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!settledSuccess && (
          <div className="p-4 sm:p-5 bg-zinc-900/90 border-t border-zinc-850 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Batal / Tetap Bayar Nanti
            </button>

            <button
              type="button"
              disabled={!isCashSufficient || isProcessing}
              onClick={handleConfirmSettlement}
              className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer ${
                isCashSufficient && !isProcessing
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>
                {isProcessing
                  ? 'Menyimpan Pelunasan...'
                  : `Konfirmasi Lunas (Rp ${total.toLocaleString('id-ID')})`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
