import React from 'react';
import { Bell, ShoppingBag, MessageSquare, UtensilsCrossed, ClipboardList } from 'lucide-react';
import { NawatigaLogo } from './NawatigaLogo.tsx';

interface HeaderProps {
  currentTab: 'chat' | 'menu' | 'orders';
  onSelectTab: (tab: 'chat' | 'menu' | 'orders') => void;
  tableNumber: string;
  cartCount: number;
  onOpenCart: () => void;
  activeOrderCount: number;
  isVisitFinished?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  tableNumber,
  cartCount,
  onOpenCart,
  activeOrderCount,
  isVisitFinished = false,
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
              <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 font-semibold border border-zinc-700/50 hidden md:flex">
                by Rose Garden Coffee
              </span>
            </div>
            <p className="text-zinc-400 leading-tight truncate text-[10px] sm:text-[11px]">
              {isVisitFinished ? 'Terima Kasih Atas Kunjungan Anda' : 'Pesen Santuy dari Meja · Self-Service Barista'}
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Locked Table Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border shadow-sm whitespace-nowrap select-none cursor-default ${
              isVisitFinished
                ? 'bg-emerald-950/70 border-emerald-700/70 text-emerald-300 font-mono font-bold'
                : 'bg-zinc-900 border-zinc-750 text-zinc-200'
            }`}
            title="Nomor meja kunjungan Anda"
          >
            <span className={`w-2 h-2 rounded-full ${isVisitFinished ? 'bg-emerald-400' : 'bg-emerald-400 animate-pulse'} flex-shrink-0`} />
            <span className="text-xs">
              {isVisitFinished ? (
                <span>Selesai · <strong className="text-white">Meja #{tableNumber}</strong></span>
              ) : (
                <span>Nongkrong di <strong className="text-amber-300 font-bold">Meja #{tableNumber}</strong></span>
              )}
            </span>
          </div>

          {/* Cart button (Hidden when visit is finished) */}
          {!isVisitFinished && (
            <button
              onClick={onOpenCart}
              type="button"
              className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              title="Lihat Keranjang Pesanan"
            >
              <ShoppingBag className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-zinc-900 border border-white text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg">
                  {cartCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Customer Navigation Tabs Bar (Hidden when visit is finished) */}
      {!isVisitFinished && (
        <div className="max-w-6xl mx-auto px-4 flex border-t border-zinc-800/80 overflow-x-auto no-scrollbar gap-1">
          <button
            onClick={() => onSelectTab('menu')}
            type="button"
            className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              currentTab === 'menu'
                ? 'border-white text-white bg-zinc-900/90'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Menu Kopi & Jajan ☕</span>
          </button>

          {activeOrderCount > 0 && (
            <button
              onClick={() => onSelectTab('orders')}
              type="button"
              className={`relative flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                currentTab === 'orders'
                  ? 'border-white text-white bg-zinc-900/90'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 text-emerald-400" />
              <span>Lacak Pesanan ({activeOrderCount}) 🕒</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </button>
          )}

          <button
            onClick={() => onSelectTab('chat')}
            type="button"
            className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              currentTab === 'chat'
                ? 'border-white text-white bg-zinc-900/90'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-300" />
            <span>Tanya Barista 💬</span>
          </button>
        </div>
      )}
    </header>
  );
};

