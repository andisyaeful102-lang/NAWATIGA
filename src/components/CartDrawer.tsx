import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  ShoppingBag,
  ArrowRight,
  QrCode,
  CreditCard,
  Wallet,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';
import QRCode from 'qrcode';
import { CartItem } from './ItemCustomizerModal.tsx';
import { playOrderSuccessSound, playPaymentSuccessAnnouncement } from '../utils/audio.ts';
import { ItemAvailabilityInfo } from './MenuCatalog.tsx';
import { CafeSettings, DEFAULT_CAFE_SETTINGS } from '../data/settings.ts';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onRemoveItem: (cartId: string) => void;
  onClearCart: () => void;
  tableNumber: string;
  availabilityMap?: Record<string, ItemAvailabilityInfo>;
  cafeSettings?: CafeSettings;
  onOrderSuccess: (order: {
    id?: string;
    orderNumber: string;
    tableNumber: string;
    items: CartItem[];
    totalAmount: number;
    paymentMethod: string;
  }) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onRemoveItem,
  onClearCart,
  tableNumber,
  availabilityMap = {},
  cafeSettings: propSettings,
  onOrderSuccess,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'QRIS' | 'Kasir'>('QRIS');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<CafeSettings>(propSettings || DEFAULT_CAFE_SETTINGS);
  const [qrisDataUrl, setQrisDataUrl] = useState<string>('');
  const [showQrisDetail, setShowQrisDetail] = useState<boolean>(true);

  // Sync or fetch settings
  useEffect(() => {
    if (propSettings) {
      setSettings(propSettings);
      return;
    }

    if (isOpen) {
      fetch('/api/settings')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.settings) {
            setSettings(data.settings);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, propSettings]);

  // Calculate pricing based on dynamic tax & service settings
  const subtotal = cartItems.reduce((acc, item) => acc + item.itemTotalPrice, 0);
  const taxRate = (settings.taxAndService?.taxPercent ?? 10) / 100;
  const serviceRate = (settings.taxAndService?.servicePercent ?? 0) / 100;
  const takeawayFee = settings.taxAndService?.takeawayFee ?? 0;

  const taxAmount = Math.round(subtotal * taxRate);
  const serviceAmount = Math.round(subtotal * serviceRate);
  const total = subtotal + taxAmount + serviceAmount + takeawayFee;

  // Generate dynamic QRIS if using default QR
  useEffect(() => {
    if (!isOpen) return;

    if (settings.qris?.qrisImageUrl) {
      setQrisDataUrl(settings.qris.qrisImageUrl);
      return;
    }

    const merchant = settings.qris?.merchantName || 'NAWATIGA COFFEE';
    const nmid = settings.qris?.nmid || 'ID1024356789012';
    const qrisPayload = `00020101021226${nmid.length}${nmid}52045812530336054${total}5802ID59${merchant.length}${merchant}6007JAKARTA6304`;

    QRCode.toDataURL(qrisPayload, {
      width: 280,
      margin: 1.5,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrisDataUrl(url))
      .catch(() => {});
  }, [isOpen, settings.qris?.qrisImageUrl, settings.qris?.merchantName, settings.qris?.nmid, total]);

  if (!isOpen) return null;

  // Check if any item in the cart is sold out / not available
  const soldOutCartItems = cartItems.filter((item) => {
    const avail = availabilityMap[item.menuItem.id];
    if (avail !== undefined) {
      return !avail.isAvailable;
    }
    return item.menuItem.isAvailable === false;
  });

  const hasSoldOutItems = soldOutCartItems.length > 0;

  const handleCheckout = async () => {
    if (cartItems.length === 0 || isSubmitting || hasSoldOutItems) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const itemsPayload = cartItems.map((item) => ({
        name: item.menuItem.name,
        quantity: item.quantity,
        menuItem: { id: item.menuItem.id, name: item.menuItem.name },
        notes: [
          item.sugarLevel,
          item.milkType?.label,
          item.iceLevel,
          item.temperature,
          item.notes,
        ]
          .filter(Boolean)
          .join(', '),
        price: item.itemTotalPrice,
      }));

      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber,
          items: itemsPayload,
          paymentMethod,
          totalAmount: total,
          subtotal,
          taxAmount,
          serviceAmount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Gagal memproses pesanan');
        return;
      }

      playOrderSuccessSound();

      onOrderSuccess({
        id: data.order?.id,
        orderNumber: data.order?.orderNumber || `NWT-${Math.floor(1000 + Math.random() * 9000)}`,
        tableNumber,
        items: cartItems,
        totalAmount: total,
        paymentMethod,
      });

      onClearCart();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage('Terjadi kendala jaringan saat menghubungkan ke sistem bar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-950 h-full shadow-2xl border-l border-zinc-800 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 bg-zinc-950 border-b border-zinc-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-white" />
            <h3 className="font-bold text-sm">
              {tableNumber === 'BAR' || /bar|kasir/i.test(tableNumber) ? (
                <span className="flex items-center gap-1.5">
                  <span>Keranjang Pesanan</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-mono font-bold">
                    Bar / Kasir
                  </span>
                </span>
              ) : (
                <span>Keranjang Pesanan (Meja #{tableNumber})</span>
              )}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-950">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-700 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Perhatian Pemesanan:</p>
                <p className="text-[11px] text-red-300 mt-0.5">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {hasSoldOutItems && (
            <div className="p-3.5 rounded-2xl bg-red-950/90 border border-red-800 text-red-200 text-xs flex items-start gap-2.5 animate-in shake">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-100">Ada Menu yang Sedang Habis / Sold Out!</p>
                <p className="text-[11px] text-red-300/90 mt-0.5">
                  Sistem mendeteksi menu pilihan Anda sudah habis hari ini. Silakan tekan tombol hapus pada menu bertanda merah di bawah agar dapat melanjutkan checkout.
                </p>
              </div>
            </div>
          )}

          {cartItems.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-sm text-white">Keranjangmu Masih Kosong Nih!</h4>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Yuk pilih kopi atau cemilan favoritmu dulu biar nongkrong di Meja #{tableNumber} makin mantep!
              </p>
            </div>
          ) : (
            <>
              {/* Table alert */}
              <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 text-xs text-zinc-300 flex items-center justify-between">
                <span>Pesanan akan disiapkan untuk <strong className="text-white font-bold">Meja #{tableNumber}</strong></span>
                <span className="font-mono text-[10px] bg-zinc-800 text-white px-2 py-0.5 rounded border border-zinc-700">Dine-In</span>
              </div>

              {/* Items List */}
              <div className="space-y-2.5">
                {cartItems.map((item) => {
                  const itemAvail = availabilityMap[item.menuItem.id];
                  const isItemSoldOut = itemAvail !== undefined ? !itemAvail.isAvailable : item.menuItem.isAvailable === false;

                  return (
                    <div
                      key={item.cartId}
                      className={`p-3.5 rounded-2xl border shadow-sm space-y-1.5 transition-all ${
                        isItemSoldOut
                          ? 'bg-red-950/40 border-red-800'
                          : 'bg-zinc-900/90 border-zinc-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-white leading-tight">
                              {item.menuItem.name}
                            </h4>
                            {isItemSoldOut && (
                              <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[9px] font-black uppercase tracking-wider">
                                STOK HABIS
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                            {item.quantity}x @ Rp {item.menuItem.price.toLocaleString('id-ID')}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-xs text-white">
                            Rp {item.itemTotalPrice.toLocaleString('id-ID')}
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.cartId)}
                            className="text-[11px] text-zinc-500 hover:text-red-400 flex items-center gap-1 mt-1 ml-auto cursor-pointer"
                            title="Hapus item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </div>

                      {isItemSoldOut && (
                        <p className="text-[10px] text-red-300 font-medium">
                          ⚠️ Menu ini sudah habis hari ini. Silakan hapus untuk menyelesaikan pesanan lainnya.
                        </p>
                      )}

                      {/* Customization pills */}
                      {(item.sugarLevel || item.milkType || item.iceLevel || item.temperature || item.notes) && (
                        <div className="flex flex-wrap gap-1 pt-1 border-t border-zinc-800/80 text-[10px]">
                          {item.sugarLevel && (
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                              {item.sugarLevel}
                            </span>
                          )}
                          {item.milkType && item.milkType.id !== 'fresh' && (
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                              {item.milkType.label}
                            </span>
                          )}
                          {item.iceLevel && (
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                              {item.iceLevel}
                            </span>
                          )}
                          {item.temperature && (
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                              {item.temperature}
                            </span>
                          )}
                          {item.notes && (
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 italic">
                              "{item.notes}"
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2 pt-2 border-t border-zinc-850">
                <label className="block text-xs font-bold text-white">Metode Pembayaran:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('QRIS')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === 'QRIS'
                        ? 'bg-white text-zinc-950 border-white shadow-lg'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850'
                    }`}
                  >
                    <QrCode className="w-5 h-5" />
                    <span>QRIS Instan (BCA/Gopay/Dana)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Kasir')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === 'Kasir'
                        ? 'bg-amber-400 text-zinc-950 border-amber-400 shadow-lg ring-1 ring-amber-400/40'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850'
                    }`}
                  >
                    <Clock className="w-5 h-5" />
                    <span>Bayar Nanti di Kasir</span>
                  </button>
                </div>
              </div>

              {/* NOTICE FOR BAYAR NANTI (OPEN BILL) */}
              {paymentMethod === 'Kasir' && (
                <div className="bg-amber-950/30 rounded-2xl p-3.5 border border-amber-500/40 space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Layanan Bayar Nanti (Open Bill)</span>
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    Pesanan Anda langsung diracik oleh barista. Anda dapat menikmati pesanan terlebih dahulu dan melunasi tagihan saat selesai ngopi di kasir (Tunai, QRIS, atau Kartu Debit).
                  </p>
                </div>
              )}

              {/* INTERACTIVE QRIS CARD DISPLAY (ANTI-SALAH TRANSFER) */}
              {paymentMethod === 'QRIS' && (
                <div className="bg-zinc-900 rounded-3xl p-4 border-2 border-zinc-800 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-white text-zinc-950 text-[10px] font-black px-2 py-0.5 rounded font-mono">
                        QRIS RESMI
                      </span>
                      <span className="text-xs font-bold text-white font-mono uppercase truncate max-w-[190px]">
                        {settings.qris?.merchantName || 'NAWATIGA COFFEE'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowQrisDetail(!showQrisDetail)}
                      className="text-zinc-400 hover:text-white p-1"
                    >
                      {showQrisDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {showQrisDetail && (
                    <div className="space-y-3">
                      {/* White QR Card */}
                      <div className="bg-white rounded-2xl p-3 text-center space-y-2 text-zinc-950 shadow-inner">
                        <div className="text-[10px] font-mono text-zinc-600 font-bold">
                          NMID: {settings.qris?.nmid || 'ID1024356789012'}
                        </div>

                        <div className="w-44 h-44 mx-auto p-1.5 bg-white border border-zinc-300 rounded-xl flex items-center justify-center">
                          {qrisDataUrl ? (
                            <img
                              src={qrisDataUrl}
                              alt="QRIS Barcode"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="text-xs text-zinc-400 font-mono animate-pulse">
                              Membuat Barcode QRIS...
                            </div>
                          )}
                        </div>

                        <div className="text-xs font-mono font-bold text-zinc-900 pt-1">
                          Nominal: <span className="text-emerald-700 font-black text-sm">Rp {total.toLocaleString('id-ID')}</span>
                        </div>
                      </div>

                      {/* Anti-Salah Transfer Warning */}
                      <div className="bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/80 text-[11px] text-amber-200 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-amber-300">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          <span>Peringatan Keamanan Transfer:</span>
                        </div>
                        <p className="text-[10px] text-amber-300/90 leading-tight">
                          {settings.qris?.notes ||
                            'Pastikan nama penerima di aplikasi m-Banking/e-Wallet Anda adalah NAWATIGA COFFEE sebelum konfirmasi bayar.'}
                        </p>
                        {settings.qris?.accountInfo && (
                          <div className="text-[10px] text-zinc-300 font-mono pt-1 border-t border-amber-900/60">
                            Rek Alternatif: {settings.qris.accountInfo}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pricing breakdown with Dynamic Tax & Service Settings */}
              <div className="space-y-1.5 p-3.5 bg-zinc-900/60 rounded-2xl border border-zinc-850 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal Pesanan:</span>
                  <span className="font-mono">Rp {subtotal.toLocaleString('id-ID')}</span>
                </div>

                {/* Tax PB1 if > 0 */}
                {settings.taxAndService?.taxPercent > 0 && (
                  <div className="flex justify-between text-zinc-400">
                    <span>{settings.taxAndService.taxName || 'PB1 Restoran'} ({settings.taxAndService.taxPercent}%):</span>
                    <span className="font-mono">Rp {taxAmount.toLocaleString('id-ID')}</span>
                  </div>
                )}

                {/* Service Charge if > 0 */}
                {settings.taxAndService?.servicePercent > 0 && (
                  <div className="flex justify-between text-zinc-400">
                    <span>{settings.taxAndService.serviceName || 'Biaya Layanan & Alat'} ({settings.taxAndService.servicePercent}%):</span>
                    <span className="font-mono">Rp {serviceAmount.toLocaleString('id-ID')}</span>
                  </div>
                )}

                {/* Takeaway fee if > 0 */}
                {takeawayFee > 0 && (
                  <div className="flex justify-between text-zinc-400">
                    <span>Biaya Kemasan / Alat Makan:</span>
                    <span className="font-mono">Rp {takeawayFee.toLocaleString('id-ID')}</span>
                  </div>
                )}

                <div className="flex justify-between text-white font-bold text-sm pt-2 border-t border-zinc-800">
                  <span>Total Tagihan:</span>
                  <span className="font-mono text-emerald-400">Rp {total.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Checkout Action */}
        {cartItems.length > 0 && (
          <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-2">
            <button
              type="button"
              disabled={isSubmitting || hasSoldOutItems}
              onClick={handleCheckout}
              className={`w-full py-3.5 px-4 rounded-xl text-xs font-black flex items-center justify-between shadow-2xl transition-all ${
                hasSoldOutItems
                  ? 'bg-red-950 border border-red-800 text-red-300 cursor-not-allowed opacity-80'
                  : isSubmitting
                  ? 'bg-zinc-700 text-zinc-400 cursor-wait'
                  : 'bg-white hover:bg-zinc-200 text-zinc-950 active:scale-98 cursor-pointer'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2 mx-auto">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengirimkan ke Barista Bar...</span>
                </span>
              ) : hasSoldOutItems ? (
                <span className="flex items-center gap-2 mx-auto">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span>Hapus Menu Habis Sebelum Kirim</span>
                </span>
              ) : (
                <>
                  <span className="flex items-center gap-2">
                    <span>{paymentMethod === 'QRIS' ? 'Konfirmasi Bayar QRIS & Kirim' : 'Kirim Pesanan (Bayar di Kasir)'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                  <span className="font-mono font-bold text-sm">
                    Rp {total.toLocaleString('id-ID')}
                  </span>
                </>
              )}
            </button>
            <p className="text-[10px] text-zinc-400 text-center">
              Habis dikirim, barista langsung meracik. Nanti HP kamu bakal bunyi bergetar pas pesanan udah siap diambil di bar!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
