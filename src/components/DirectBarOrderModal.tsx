import React, { useState, useMemo } from 'react';
import { NawatigaLogo } from './NawatigaLogo.tsx';
import {
  X,
  Coffee,
  ShoppingBag,
  Zap,
  Check,
  CreditCard,
  QrCode,
  Banknote,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Package,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  Clock,
} from 'lucide-react';
import { MenuItem, MENU_ITEMS, MASTER_CATEGORIES, MasterCategoryId, getMasterCategory, getCategoryBadgeLabel } from '../data/menu.ts';
import { playCashierVoiceAlert, playOrderSuccessSound } from '../utils/audio.ts';
import { BaristaOrder } from './BaristaKDSView.tsx';

interface DirectBarOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  items?: MenuItem[];
  onOrderSuccess: (order: BaristaOrder) => void;
}

interface SelectedOrderItem {
  item: MenuItem;
  quantity: number;
  notes: string;
}

export const DirectBarOrderModal: React.FC<DirectBarOrderModalProps> = ({
  isOpen,
  onClose,
  items = MENU_ITEMS,
  onOrderSuccess,
}) => {
  const [orderType, setOrderType] = useState<'dine-in-bar' | 'takeaway'>('dine-in-bar');
  const [paymentChoice, setPaymentChoice] = useState<'Kasir-Cash' | 'QRIS-Bar' | 'Kasir-Debit' | 'Bayar-Nanti'>('Kasir-Cash');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMasterCategory, setSelectedMasterCategory] = useState<MasterCategoryId>('all');
  const [selectedItems, setSelectedItems] = useState<SelectedOrderItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Category counts
  const categoryCounts = useMemo(() => {
    let coffee = 0;
    let nonCoffee = 0;
    let food = 0;
    items.forEach((item) => {
      const m = getMasterCategory(item.category);
      if (m === 'coffee') coffee++;
      else if (m === 'non-coffee') nonCoffee++;
      else if (m === 'food') food++;
    });
    return {
      all: items.length,
      coffee,
      'non-coffee': nonCoffee,
      food,
    };
  }, [items]);

  // Filtered menu list for POS search
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const itemMaster = getMasterCategory(item.category);
      const matchCat = selectedMasterCategory === 'all' || itemMaster === selectedMasterCategory;
      const matchSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [items, selectedMasterCategory, searchQuery]);

  // Curated quick recommendations based on selected master category or all
  const quickItems = useMemo(() => {
    if (selectedMasterCategory === 'all') return items.slice(0, 4);
    return items.filter((i) => getMasterCategory(i.category) === selectedMasterCategory).slice(0, 4);
  }, [items, selectedMasterCategory]);

  // Add or increment item
  const handleAddItem = (item: MenuItem) => {
    setSelectedItems((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        return prev.map((i) => (i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { item, quantity: 1, notes: '' }];
    });
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setSelectedItems((prev) => {
      return prev
        .map((i) => {
          if (i.item.id === itemId) {
            const nextQty = i.quantity + delta;
            return nextQty > 0 ? { ...i, quantity: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as SelectedOrderItem[];
    });
  };

  const handleUpdateNotes = (itemId: string, notes: string) => {
    setSelectedItems((prev) =>
      prev.map((i) => (i.item.id === itemId ? { ...i, notes } : i))
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems((prev) => prev.filter((i) => i.item.id !== itemId));
  };

  // Calculations
  const totalAmount = useMemo(() => {
    return selectedItems.reduce((acc, curr) => acc + curr.item.price * curr.quantity, 0);
  }, [selectedItems]);

  const totalItemCount = useMemo(() => {
    return selectedItems.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [selectedItems]);

  // Submit Order to Barista KDS & Server
  const handleSubmitBarOrder = async (overrideItems?: SelectedOrderItem[]) => {
    const itemsToSubmit = overrideItems || selectedItems;
    if (itemsToSubmit.length === 0) return;

    setIsSubmitting(true);
    try {
      const orderNumber = `BAR-${Math.floor(1000 + Math.random() * 9000)}`;
      const orderTypeTag = orderType === 'takeaway' ? '[TAKEAWAY / BUNGKUS]' : '[DINE-IN BAR COUNTER]';
      const paymentLabel =
        paymentChoice === 'Kasir-Cash'
          ? 'Tunai di Kasir'
          : paymentChoice === 'QRIS-Bar'
          ? 'QRIS di Bar'
          : paymentChoice === 'Kasir-Debit'
          ? 'Debit EDC'
          : 'Bayar Nanti (Open Bill)';
      const paymentStatus: 'paid' | 'pay_later' = paymentChoice === 'Bayar-Nanti' ? 'pay_later' : 'paid';

      const payloadItems = itemsToSubmit.map((i) => ({
        name: i.item.name,
        quantity: i.quantity,
        notes: i.notes ? `${orderTypeTag} - ${i.notes}` : `${orderTypeTag} - Pesanan Langsung di Bar`,
        price: i.item.price,
      }));

      const finalTotal = itemsToSubmit.reduce(
        (acc, curr) => acc + curr.item.price * curr.quantity,
        0
      );

      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: 'BAR',
          items: payloadItems,
          paymentMethod: paymentLabel,
          paymentStatus,
          totalAmount: finalTotal,
        }),
      });

      const data = await res.json();
      playOrderSuccessSound();
      playCashierVoiceAlert('BAR', false);

      const newOrder: BaristaOrder = {
        id: data.order?.id || `bar-${Date.now()}`,
        orderNumber: data.order?.orderNumber || orderNumber,
        tableNumber: 'BAR',
        items: payloadItems,
        totalAmount: finalTotal,
        paymentMethod: paymentLabel,
        paymentStatus,
        status: 'received',
        createdAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };

      onOrderSuccess(newOrder);
      setSelectedItems([]);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fast 1-click direct order
  const handleQuickSingleOrder = (item: MenuItem) => {
    const quickOrderItem: SelectedOrderItem = {
      item,
      quantity: 1,
      notes: 'Pesanan Cepat di Bar Counter',
    };
    handleSubmitBarOrder([quickOrderItem]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-zinc-950 rounded-3xl border border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-950 via-zinc-900 to-amber-950/80 border-b border-amber-900/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-inner flex items-center justify-center flex-shrink-0">
              <NawatigaLogo variant="dark" size="sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase font-mono">
                  Layar Kasir & Barista Station
                </span>
                <span className="text-[11px] text-zinc-400 font-mono">POS Walk-in</span>
              </div>
              <h3 className="text-lg font-black font-serif-cafe text-white tracking-wide mt-0.5">
                Input Pesanan Langsung di Bar / Kasir
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-zinc-700/60"
            title="Tutup Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Order Type & Payment Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Tipe Pesanan */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                1. Tipe Pesanan Walk-in:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setOrderType('dine-in-bar')}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    orderType === 'dine-in-bar'
                      ? 'bg-amber-950/80 border-amber-500 text-white ring-1 ring-amber-400/40 font-bold'
                      : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-300 text-xs'
                  }`}
                >
                  <span className="text-base">☕</span>
                  <div>
                    <div className="text-xs">Dine-in Bar</div>
                    <div className="text-[10px] text-zinc-400">Duduk di bar</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderType('takeaway')}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    orderType === 'takeaway'
                      ? 'bg-amber-950/80 border-amber-500 text-white ring-1 ring-amber-400/40 font-bold'
                      : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-300 text-xs'
                  }`}
                >
                  <span className="text-base">🛍️</span>
                  <div>
                    <div className="text-xs">Takeaway</div>
                    <div className="text-[10px] text-zinc-400">Bawa pulang</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Metode Pembayaran di Kasir */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                2. Metode Pembayaran:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentChoice('Kasir-Cash')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    paymentChoice === 'Kasir-Cash'
                      ? 'bg-white text-zinc-950 border-white font-black shadow'
                      : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800 text-xs font-semibold'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5 mx-auto mb-0.5" />
                  <span className="text-[10px] block">Tunai</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentChoice('QRIS-Bar')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    paymentChoice === 'QRIS-Bar'
                      ? 'bg-white text-zinc-950 border-white font-black shadow'
                      : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800 text-xs font-semibold'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5 mx-auto mb-0.5" />
                  <span className="text-[10px] block">QRIS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentChoice('Kasir-Debit')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    paymentChoice === 'Kasir-Debit'
                      ? 'bg-white text-zinc-950 border-white font-black shadow'
                      : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800 text-xs font-semibold'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 mx-auto mb-0.5" />
                  <span className="text-[10px] block">Debit EDC</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentChoice('Bayar-Nanti')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    paymentChoice === 'Bayar-Nanti'
                      ? 'bg-amber-400 text-zinc-950 border-amber-400 font-black shadow ring-1 ring-amber-400/50'
                      : 'bg-amber-950/20 hover:bg-amber-950/40 text-amber-300 border-amber-900/60 text-xs font-semibold'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 mx-auto mb-0.5" />
                  <span className="text-[10px] block font-bold">Bayar Nanti</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick 1-Click Fast Pick items */}
          <div className="p-3 bg-zinc-900/80 rounded-2xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-300 uppercase font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Paling Laris di Bar Counter (1-Klik Tambah):</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">Siap Cepat</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {quickItems.map((item) => {
                const badge = getCategoryBadgeLabel(item.category);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAddItem(item)}
                    className="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 hover:border-amber-500/50 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono mb-1">
                      <span>{badge.icon}</span>
                      <span>{badge.master === 'coffee' ? 'Kopi' : badge.master === 'non-coffee' ? 'Non-Kopi' : 'Makanan'}</span>
                    </div>
                    <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                      {item.name}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 mt-1 flex items-center justify-between">
                      <span>Rp {item.price.toLocaleString('id-ID')}</span>
                      <Plus className="w-3 h-3 text-amber-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Menu Search & Master Category Selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-amber-300 font-mono flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                <span>3. Kategori Menu Kasir (Pilih Cepat):</span>
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">
                {filteredItems.length} menu siap dipilih
              </span>
            </div>

            {/* Master Category Tabs for Cashier */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-zinc-900 rounded-2xl border border-zinc-800">
              {MASTER_CATEGORIES.map((cat) => {
                const isSelected = selectedMasterCategory === cat.id;
                const count = categoryCounts[cat.id];
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedMasterCategory(cat.id)}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-zinc-950 font-black shadow-md ring-1 ring-amber-300'
                        : 'text-zinc-300 hover:text-white hover:bg-zinc-850'
                    }`}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span className="truncate">{cat.shortLabel}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                        isSelected ? 'bg-zinc-950/20 text-zinc-950 font-black' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kopi, tea, pasta, snack di kategori ini..."
                className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Menu List Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
              {filteredItems.map((item) => {
                const inCart = selectedItems.find((i) => i.item.id === item.id);
                const badge = getCategoryBadgeLabel(item.category);
                return (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                      inCart
                        ? 'bg-amber-950/40 border-amber-600/80'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                          {badge.icon} {badge.master === 'coffee' ? 'Kopi' : badge.master === 'non-coffee' ? 'Non-Kopi' : 'Makanan'}
                        </span>
                        <div className="text-xs font-bold text-white truncate">{item.name}</div>
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        Rp {item.price.toLocaleString('id-ID')}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {inCart ? (
                        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-700">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold font-mono px-1 text-white">
                            {inCart.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            className="w-5 h-5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center font-bold cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddItem(item)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-amber-400 hover:text-zinc-950 text-zinc-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Pilih</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Order Cart List */}
          {selectedItems.length > 0 && (
            <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase text-zinc-400 font-mono">
                <span>Daftar Pesanan Meja BAR ({totalItemCount} Item):</span>
                <button
                  type="button"
                  onClick={() => setSelectedItems([])}
                  className="text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                >
                  Reset Semua
                </button>
              </div>

              <div className="space-y-1.5 divide-y divide-zinc-800/80">
                {selectedItems.map((sel) => (
                  <div key={sel.item.id} className="pt-1.5 first:pt-0 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-amber-400 font-bold">[{sel.quantity}x]</span>
                        <span className="font-bold text-white">{sel.item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-zinc-300">
                          Rp {(sel.item.price * sel.quantity).toLocaleString('id-ID')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(sel.item.id)}
                          className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                          title="Hapus item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={sel.notes}
                      onChange={(e) => handleUpdateNotes(sel.item.id, e.target.value)}
                      placeholder="Catatan racikan: less sugar, oat milk, tanpa es..."
                      className="w-full text-[11px] px-2.5 py-1 bg-zinc-950 rounded-lg border border-zinc-800 text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                ))}
              </div>

              {/* Subtotal Bill */}
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase font-mono">Total Tagihan:</div>
                  <div className="text-base font-mono font-black text-amber-300">
                    Rp {totalAmount.toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="text-right text-[11px] text-zinc-400 font-mono">
                  <span>Tiket Bar: <strong className="text-white">Meja #BAR</strong></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={selectedItems.length === 0 || isSubmitting}
            onClick={() => handleSubmitBarOrder()}
            className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer ${
              selectedItems.length > 0 && !isSubmitting
                ? 'bg-amber-400 hover:bg-amber-300 text-zinc-950 shadow-amber-400/20'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>
              {isSubmitting
                ? 'Memproses Tiket...'
                : selectedItems.length > 0
                ? `Buat Pesanan di Bar (Rp ${totalAmount.toLocaleString('id-ID')})`
                : 'Pilih Menu Terlebih Dahulu'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
