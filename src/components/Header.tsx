import React from 'react';
import { Coffee, Bell, ShoppingBag, MessageSquare, UtensilsCrossed, QrCode, ClipboardList, ChefHat, Moon, Smartphone, Monitor, Lock } from 'lucide-react';
import { NawatigaLogo } from './NawatigaLogo.tsx';

interface HeaderProps {
  currentTab: 'chat' | 'menu' | 'stand' | 'orders' | 'barista';
  onSelectTab: (tab: 'chat' | 'menu' | 'stand' | 'orders' | 'barista') => void;
  tableNumber: string;
  onOpenTablePicker: () => void;
  onOpenCallWaiter: () => void;
  cartCount: number;
  onOpenCart: () => void;
  activeOrderCount: number;
  baristaPendingCount?: number;
  mobileFrameMode?: boolean;
  onToggleMobileFrame?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  tableNumber,
  onOpenTablePicker,
  onOpenCallWaiter,
  cartCount,
  onOpenCart,
  activeOrderCount,
  baristaPendingCount = 0,
  mobileFrameMode,
  onToggleMobileFrame,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#09090b]/95 backdrop-blur-md text-zinc-100 border-b border-zinc-800 shadow-2xl">
      {/* Top Brand Bar */}
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-zinc-900/90 border border-zinc-700/80 shadow-inner flex items-center justify-center flex-shrink-0 group hover:border-amber-500/50 transition-colors">
            <NawatigaLogo variant="dark" size="sm" className="transition-transform duration-300 group-hover:scale-110" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-serif-cafe font-extrabold text-lg sm:text-xl tracking-wider text-white">NAWATIGA</span>
              <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 font-semibold border border-zinc-700/50 items-center gap-1 ${
                mobileFrameMode ? 'hidden' : 'hidden md:flex'
              }`}>
                by Rose Garden Coffee
              </span>
            </div>
            <p className={`text-zinc-400 leading-tight truncate ${
              mobileFrameMode ? 'text-[10px] max-w-[130px]' : 'text-[10px] sm:text-[11px] max-w-[170px] sm:max-w-none'
            }`}>
              Self-Order & Asisten Virtual Cafe
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Table Selector Pill */}
          <button
            onClick={onOpenTablePicker}
            type="button"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border transition-colors shadow-sm whitespace-nowrap cursor-pointer ${
              tableNumber === 'BAR' || /bar|kasir/i.test(tableNumber)
                ? 'bg-amber-950/80 hover:bg-amber-900/80 border-amber-600/80 text-amber-200'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700'
            }`}
            title="Ganti nomor meja atau pesan di bar"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                tableNumber === 'BAR' || /bar|kasir/i.test(tableNumber)
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-emerald-400 animate-pulse'
              }`}
            />
            {tableNumber === 'BAR' || /bar|kasir/i.test(tableNumber) ? (
              <span className="font-bold text-xs text-white flex items-center gap-1">
                <span>☕</span>
                <strong className="text-amber-300 font-black">Bar / Kasir</strong>
              </span>
            ) : (
              <span className="text-xs">
                Meja <strong className="text-white font-bold">{tableNumber}</strong>
              </span>
            )}
          </button>

          {/* Call Barista/Staff button */}
          <button
            onClick={onOpenCallWaiter}
            type="button"
            className="w-9 h-9 sm:w-auto sm:px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-100 border border-zinc-600 transition-transform active:scale-95 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            title="Bantuan Barista / Staf Bar"
          >
            <Bell className="w-3.5 h-3.5 text-zinc-200" />
            <span className={mobileFrameMode ? 'hidden' : 'hidden md:inline'}>Bantuan Bar</span>
          </button>

          {/* Mobile frame toggle for desktop testing */}
          {onToggleMobileFrame && (
            <button
              onClick={onToggleMobileFrame}
              type="button"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 border border-zinc-700 transition-colors shadow-sm cursor-pointer"
              title={mobileFrameMode ? "Kembali ke Tampilan Lebar" : "Lihat Simulasi Layar Smartphone (390px)"}
            >
              {mobileFrameMode ? <Monitor className="w-3.5 h-3.5 text-zinc-400" /> : <Smartphone className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{mobileFrameMode ? 'Layar Penuh' : 'Mode HP'}</span>
            </button>
          )}

          {/* Cart button */}
          <button
            onClick={onOpenCart}
            type="button"
            className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-bold transition-all shadow-md active:scale-95"
            title="Lihat Keranjang Pesanan"
          >
            <ShoppingBag className="w-4 h-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-zinc-900 border border-white text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="max-w-6xl mx-auto px-4 flex border-t border-zinc-800/80 overflow-x-auto no-scrollbar gap-1">
        <button
          onClick={() => onSelectTab('chat')}
          type="button"
          className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            currentTab === 'chat'
              ? 'border-white text-white bg-zinc-900/90'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Tanya ADMIN</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">AI</span>
        </button>

        <button
          onClick={() => onSelectTab('menu')}
          type="button"
          className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            currentTab === 'menu'
              ? 'border-white text-white bg-zinc-900/90'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
          }`}
        >
          <UtensilsCrossed className="w-3.5 h-3.5" />
          <span>Menu Digital</span>
        </button>

        <button
          onClick={() => onSelectTab('stand')}
          type="button"
          className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            currentTab === 'stand'
              ? 'border-white text-white bg-zinc-900/90'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>Barcode Meja & Link</span>
        </button>

        <button
          onClick={() => onSelectTab('orders')}
          type="button"
          className={`relative flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            currentTab === 'orders'
              ? 'border-white text-white bg-zinc-900/90'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>Status Pesanan</span>
          {activeOrderCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => onSelectTab('barista')}
          type="button"
          className={`relative flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            currentTab === 'barista'
              ? 'border-zinc-300 text-white bg-zinc-900/90'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
          }`}
        >
          <ChefHat className="w-3.5 h-3.5" />
          <span>Layar Barista & Admin</span>
          {baristaPendingCount > 0 ? (
            <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black font-mono animate-pulse shadow-sm">
              {baristaPendingCount} Baru
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono flex items-center gap-1">
              <Lock className="w-2.5 h-2.5 text-amber-400" />
              <span>Login PIN</span>
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

