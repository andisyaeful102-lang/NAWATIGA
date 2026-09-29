import React, { useState } from 'react';
import { X, Plus, Minus, Check, Coffee, Sparkles, AlertCircle, ShoppingBag } from 'lucide-react';
import { MenuItem, SUGAR_OPTIONS, MILK_OPTIONS, ICE_OPTIONS, getCategoryBadgeLabel } from '../data/menu.ts';

export interface CartItem {
  cartId: string;
  menuItem: MenuItem;
  quantity: number;
  sugarLevel?: string;
  milkType?: { id: string; label: string; price: number };
  iceLevel?: string;
  temperature?: 'Iced' | 'Hot';
  notes?: string;
  itemTotalPrice: number;
}

interface ItemCustomizerModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
  tableNumber: string;
}

export const ItemCustomizerModal: React.FC<ItemCustomizerModalProps> = ({
  item,
  isOpen,
  onClose,
  onAddToCart,
  tableNumber,
}) => {
  if (!isOpen || !item) return null;

  const [quantity, setQuantity] = useState<number>(1);
  const [selectedSugar, setSelectedSugar] = useState<string>('normal');
  const [selectedMilk, setSelectedMilk] = useState<string>('fresh');
  const [selectedIce, setSelectedIce] = useState<string>('normal-ice');
  const [selectedTemp, setSelectedTemp] = useState<'Iced' | 'Hot'>('Iced');
  const [notes, setNotes] = useState<string>('');

  const milkOption = MILK_OPTIONS.find((m) => m.id === selectedMilk) || MILK_OPTIONS[0];
  const milkExtra = item.customizable.milkType ? milkOption.price : 0;
  const singleItemPrice = item.price + milkExtra;
  const totalPrice = singleItemPrice * quantity;

  const handleAdd = () => {
    const sugarObj = SUGAR_OPTIONS.find((s) => s.id === selectedSugar);
    const iceObj = ICE_OPTIONS.find((i) => i.id === selectedIce);

    const cartItem: CartItem = {
      cartId: `${item.id}-${Date.now()}`,
      menuItem: item,
      quantity,
      sugarLevel: item.customizable.sugarLevel ? (sugarObj?.label || 'Normal') : undefined,
      milkType: item.customizable.milkType ? milkOption : undefined,
      iceLevel: item.customizable.iceLevel ? (iceObj?.label || 'Normal Ice') : undefined,
      temperature: item.customizable.temperature ? selectedTemp : undefined,
      notes: notes.trim() ? notes.trim() : undefined,
      itemTotalPrice: totalPrice,
    };

    onAddToCart(cartItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-zinc-950 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-800 max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        {/* Header with image */}
        <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-black flex-shrink-0">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            type="button"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-zinc-900/80 border border-zinc-700 text-white flex items-center justify-center hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Title on image */}
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {(() => {
                const badge = getCategoryBadgeLabel(item.category);
                return (
                  <span className="px-2 py-0.5 rounded-md bg-amber-400 text-zinc-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <span>{badge.icon}</span>
                    <span>Kategori {badge.master === 'coffee' ? 'Coffee (Kopi)' : badge.master === 'non-coffee' ? 'Non-Coffee' : 'Makanan'}</span>
                  </span>
                );
              })()}
              {item.isBestSeller && (
                <span className="px-2 py-0.5 rounded-md bg-white text-zinc-950 text-[10px] font-black uppercase tracking-wider">
                  Best Seller
                </span>
              )}
              {item.isSignature && (
                <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-600 text-white text-[10px] font-bold uppercase tracking-wider">
                  Signature
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-bold font-serif-cafe leading-snug">{item.name}</h3>
            <p className="text-zinc-300 font-bold font-mono text-sm">{item.formattedPrice}</p>
          </div>
        </div>

        {/* Scrollable customizations */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-zinc-950">
          {/* Out of Stock Warning Banner */}
          {item.isAvailable === false && (
            <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-700 text-red-200 flex items-start gap-3 text-xs animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-200 uppercase tracking-wide">
                  Menu Ini Sedang Habis / Tidak Tersedia
                </p>
                <p className="text-[11px] text-red-300/90 mt-0.5">
                  {item.soldOutReason || 'Stok menu ini sudah habis terjual untuk hari ini. Silakan pilih menu lain.'}
                </p>
              </div>
            </div>
          )}

          {/* Description & Composition */}
          <div className="text-xs text-zinc-300 leading-relaxed">
            {item.description}
          </div>

          {/* Composition & allergen note */}
          <div className="p-3 bg-zinc-900 rounded-2xl text-xs space-y-1 border border-zinc-800">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
              <span>Komposisi & Detail:</span>
            </div>
            <p className="text-zinc-400">{item.details.composition}</p>
            {item.details.allergens && (
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 pt-1 border-t border-zinc-800">
                <AlertCircle className="w-3 h-3 flex-shrink-0 text-zinc-300" />
                <span>Alergen: {item.details.allergens.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Temperature Choice (if applicable) */}
          {item.customizable.temperature && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-white">Pilihan Sajian:</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Iced', 'Hot'] as const).map((temp) => (
                  <button
                    key={temp}
                    type="button"
                    onClick={() => setSelectedTemp(temp)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      selectedTemp === temp
                        ? 'border-white bg-white text-zinc-950 font-bold shadow-md'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-850'
                    }`}
                  >
                    <span>{temp === 'Iced' ? '🧊 Dingin (Iced)' : '☕ Panas (Hot)'}</span>
                    {selectedTemp === temp && <Check className="w-3.5 h-3.5 text-zinc-950" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sugar Level */}
          {item.customizable.sugarLevel && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white">Tingkat Kemanisan (Sugar Level):</label>
                <span className="text-[10px] text-zinc-400">Pilih 1 level</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SUGAR_OPTIONS.map((sugar) => {
                  const isSelected = selectedSugar === sugar.id;
                  return (
                    <button
                      key={sugar.id}
                      type="button"
                      onClick={() => setSelectedSugar(sugar.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-white bg-zinc-900 text-white ring-1 ring-white/30'
                          : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{sugar.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">{sugar.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Milk Options (Oat / Soy) */}
          {item.customizable.milkType && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white">Pilihan Susu (Dairy / Nabati):</label>
                <span className="text-[10px] text-zinc-400 font-mono">Plant-based Tersedia</span>
              </div>
              <div className="space-y-1.5">
                {MILK_OPTIONS.map((milk) => {
                  const isSelected = selectedMilk === milk.id;
                  return (
                    <button
                      key={milk.id}
                      type="button"
                      onClick={() => setSelectedMilk(milk.id)}
                      className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                        isSelected
                          ? 'border-white bg-zinc-900 text-white font-bold ring-1 ring-white/30'
                          : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-900'
                      }`}
                    >
                      <span>{milk.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-zinc-400 font-mono">
                          {milk.price > 0 ? `+Rp ${milk.price.toLocaleString('id-ID')}` : 'Termasuk'}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ice Level (if iced) */}
          {item.customizable.iceLevel && selectedTemp === 'Iced' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-white">Tingkat Es Batu:</label>
              <div className="grid grid-cols-3 gap-2">
                {ICE_OPTIONS.map((ice) => {
                  const isSelected = selectedIce === ice.id;
                  return (
                    <button
                      key={ice.id}
                      type="button"
                      onClick={() => setSelectedIce(ice.id)}
                      className={`py-2 px-2 rounded-xl border text-center text-xs font-medium transition-all ${
                        isSelected
                          ? 'border-white bg-white text-zinc-950 font-bold shadow-md'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-850'
                      }`}
                    >
                      {ice.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes for Kitchen */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-white">Catatan Khusus Barista (Opsional):</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: 'Less sweet', 'Susu oat agak hangat', dsb..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400"
            />
          </div>
        </div>

        {/* Footer with quantity and Add to Cart button */}
        <div className="p-4 pb-safe bg-zinc-950 border-t border-zinc-800 flex items-center justify-between gap-3 flex-shrink-0">
          {/* Quantity stepper */}
          <div className="flex items-center gap-2 bg-zinc-900 rounded-xl p-1 border border-zinc-700">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-6 text-center font-bold text-xs text-white">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add button */}
          <button
            type="button"
            disabled={item.isAvailable === false}
            onClick={handleAdd}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black flex items-center justify-between shadow-xl transition-all ${
              item.isAvailable === false
                ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60'
                : 'bg-white hover:bg-zinc-200 text-zinc-950 active:scale-95 cursor-pointer'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4" />
              <span>
                {item.isAvailable === false
                  ? 'Menu Sedang Habis (Sold Out)'
                  : (() => {
                      const badge = getCategoryBadgeLabel(item.category);
                      const catName = badge.master === 'coffee' ? 'Kopi' : badge.master === 'non-coffee' ? 'Non-Kopi' : 'Makanan';
                      return `+ Tambah Menu ${catName} ke Meja #${tableNumber}`;
                    })()}
              </span>
            </span>
            <span className="font-mono font-black">
              {item.isAvailable === false ? 'HABIS' : `Rp ${totalPrice.toLocaleString('id-ID')}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
