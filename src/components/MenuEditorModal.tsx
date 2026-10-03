import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Edit3, Image as ImageIcon, Sparkles, Check, AlertCircle, Loader2, DollarSign, Upload, Camera } from 'lucide-react';
import { MenuItem, CATEGORIES, MASTER_CATEGORIES, getMasterCategory } from '../data/menu.ts';
import { playAdminChime } from '../utils/audio.ts';

// Preset high quality photos for coffee and food
const PRESET_PHOTOS = [
  { label: 'Es Kopi Susu', url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=800&auto=format&fit=crop' },
  { label: 'Manual Brew V60', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=800&auto=format&fit=crop' },
  { label: 'Matcha Latte', url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?q=80&w=800&auto=format&fit=crop' },
  { label: 'Cappuccino / Latte Art', url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800&auto=format&fit=crop' },
  { label: 'Espresso Shoot', url: 'https://images.unsplash.com/photo-1512568400610-62da28bc8a13?q=80&w=800&auto=format&fit=crop' },
  { label: 'Fries / Snack', url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?q=80&w=800&auto=format&fit=crop' },
  { label: 'Makanan Berat / Rice Bowl', url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=800&auto=format&fit=crop' },
  { label: 'Pastry / Croissant', url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=800&auto=format&fit=crop' },
];

interface MenuEditorModalProps {
  isOpen: boolean;
  item: MenuItem | null; // null = Add new menu mode; MenuItem = Edit existing menu mode
  onClose: () => void;
  onSaveSuccess: (savedItem: MenuItem, isNew: boolean) => void;
}

export const MenuEditorModal: React.FC<MenuEditorModalProps> = ({
  isOpen,
  item,
  onClose,
  onSaveSuccess,
}) => {
  const isEditing = Boolean(item);

  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<MenuItem['category']>('coffee-signature');
  const [price, setPrice] = useState<number>(32000);
  const [description, setDescription] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>(PRESET_PHOTOS[0].url);
  const [isBestSeller, setIsBestSeller] = useState<boolean>(false);
  const [isSignature, setIsSignature] = useState<boolean>(false);
  const [isRecommended, setIsRecommended] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [soldOutReason, setSoldOutReason] = useState<string>('Habis Terjual (Sold Out)');
  const [tagInput, setTagInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>(['Kopi']);

  // Customization options
  const [allowSugar, setAllowSugar] = useState<boolean>(true);
  const [allowMilk, setAllowMilk] = useState<boolean>(false);
  const [allowIce, setAllowIce] = useState<boolean>(true);
  const [allowTemp, setAllowTemp] = useState<boolean>(false);

  // Detail fields
  const [composition, setComposition] = useState<string>('');
  const [caffeineLevel, setCaffeineLevel] = useState<'Tinggi' | 'Sedang' | 'Rendah' | 'Bebas Kafein'>('Sedang');
  const [allergensInput, setAllergensInput] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);

  // Initialize or reset form values
  useEffect(() => {
    if (item) {
      setName(item.name);
      setCategory(item.category);
      setPrice(item.price);
      setDescription(item.description);
      setImageUrl(item.imageUrl);
      setIsBestSeller(Boolean(item.isBestSeller));
      setIsSignature(Boolean(item.isSignature));
      setIsRecommended(Boolean(item.isRecommended));
      setIsAvailable(item.isAvailable !== false);
      setSoldOutReason(item.soldOutReason || 'Habis Terjual (Sold Out)');
      setTags(item.tags || []);
      setTagInput('');

      setAllowSugar(Boolean(item.customizable.sugarLevel));
      setAllowMilk(Boolean(item.customizable.milkType));
      setAllowIce(Boolean(item.customizable.iceLevel));
      setAllowTemp(Boolean(item.customizable.temperature));

      setComposition(item.details.composition || '');
      setCaffeineLevel(item.details.caffeineLevel || 'Sedang');
      setAllergensInput((item.details.allergens || []).join(', '));
    } else {
      setName('');
      setCategory('coffee-signature');
      setPrice(32000);
      setDescription('');
      setImageUrl(PRESET_PHOTOS[0].url);
      setIsBestSeller(false);
      setIsSignature(false);
      setIsRecommended(false);
      setIsAvailable(true);
      setSoldOutReason('Habis Terjual (Sold Out)');
      setTags(['Menu Baru']);
      setTagInput('');

      setAllowSugar(true);
      setAllowMilk(false);
      setAllowIce(true);
      setAllowTemp(false);

      setComposition('');
      setCaffeineLevel('Sedang');
      setAllergensInput('');
    }
    setErrorMessage(null);
  }, [item, isOpen]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('File yang dipilih harus berupa gambar foto (JPG, PNG, atau WEBP).');
      return;
    }

    setIsProcessingImage(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress & scale to max 800x800 for high quality & ultra-fast saving
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setImageUrl(compressedDataUrl);
        }
        setIsProcessingImage(false);
      };
      img.onerror = () => {
        setIsProcessingImage(false);
        setErrorMessage('Gagal memproses gambar dari galeri.');
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setIsProcessingImage(false);
      setErrorMessage('Gagal membaca file dari perangkat galeri.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Nama menu wajib diisi.');
      return;
    }
    if (price <= 0 || isNaN(price)) {
      setErrorMessage('Harga menu harus lebih besar dari Rp 0.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const allergensList = allergensInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      name: name.trim(),
      category,
      price: Number(price),
      description: description.trim() || 'Sajian istimewa dari dapur & bar NAWATIGA.',
      imageUrl: imageUrl.trim() || PRESET_PHOTOS[0].url,
      tags: tags.length > 0 ? tags : ['Menu'],
      isBestSeller,
      isSignature,
      isRecommended,
      isAvailable,
      soldOutReason: isAvailable ? undefined : soldOutReason,
      customizable: {
        sugarLevel: allowSugar,
        milkType: allowMilk,
        iceLevel: allowIce,
        temperature: allowTemp,
      },
      details: {
        composition: composition.trim() || 'Racikan istimewa barista & dapur Nawatiga.',
        caffeineLevel,
        allergens: allergensList,
      },
    };

    try {
      const url = isEditing ? `/api/barista/menu/${item?.id}` : '/api/barista/menu';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Gagal menyimpan perubahan menu');
        return;
      }

      playAdminChime();
      onSaveSuccess(data.menuItem, !isEditing);
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage('Terjadi kendala jaringan saat menghubungi server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-xl bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-zinc-950 border-b border-zinc-800 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white">
              {isEditing ? <Edit3 className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4 text-white" />}
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base font-serif-cafe">
                {isEditing ? `Edit Menu: ${item?.name}` : 'Tambah Menu Baru ke Katalog'}
              </h3>
              <p className="text-[11px] text-zinc-400">
                Menu ini akan langsung muncul di HP seluruh pelanggan & sistem bar.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs text-zinc-200 bg-zinc-950">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-red-950/80 border border-red-700 text-red-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Basic Info */}
          <div className="space-y-3.5">
            <h4 className="font-bold uppercase tracking-wider text-[11px] text-zinc-400 border-b border-zinc-850 pb-1">
              1. Informasi Pokok Menu
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-white mb-1">
                  Nama Menu <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Iced Caramel Macchiato"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-white mb-1">
                  Pilih Kategori Menu Kasir <span className="text-red-400">*</span>
                </label>
                {/* 3 Master Category Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'coffee' as const, label: 'Coffee (Kopi)', icon: '☕', defaultSub: 'coffee-signature' as const },
                    { id: 'non-coffee' as const, label: 'Non-Coffee', icon: '🍵', defaultSub: 'non-coffee' as const },
                    { id: 'food' as const, label: 'Makanan', icon: '🍽️', defaultSub: 'food-bites' as const },
                  ].map((mc) => {
                    const currentMaster = getMasterCategory(category);
                    const isSelected = currentMaster === mc.id;
                    return (
                      <button
                        key={mc.id}
                        type="button"
                        onClick={() => {
                          if (!isSelected) {
                            setCategory(mc.defaultSub);
                          }
                        }}
                        className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-400 text-zinc-950 border-amber-300 font-black shadow-md'
                            : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800'
                        }`}
                      >
                        <span className="text-base">{mc.icon}</span>
                        <span className="truncate">{mc.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2">
                  <span className="text-[11px] text-zinc-400 font-mono block mb-1">
                    Spesifik Sub-Kategori:
                  </span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as MenuItem['category'])}
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-white text-xs focus:outline-none focus:border-zinc-500 font-medium cursor-pointer"
                  >
                    {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-white mb-1">
                  Harga Satuan (Rupiah) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-zinc-400 font-bold">
                    Rp
                  </span>
                  <input
                    type="number"
                    required
                    min={1000}
                    step={500}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full pl-11 pr-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-white font-mono font-bold focus:outline-none focus:border-zinc-500"
                  />
                </div>
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Tampilan: <strong className="text-zinc-300 font-mono">Rp {price.toLocaleString('id-ID')}</strong>
                </span>
              </div>

              <div>
                <label className="block font-bold text-white mb-1">Status Ketersediaan Awal</label>
                <div className="grid grid-cols-2 gap-2 mt-0.5">
                  <button
                    type="button"
                    onClick={() => setIsAvailable(true)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isAvailable
                        ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Ready</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAvailable(false)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      !isAvailable
                        ? 'bg-red-950 border-red-700 text-red-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span>Habis (Sold Out)</span>
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold text-white mb-1">Deskripsi Singkat Menu</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan aroma, rasa, atau bahan istimewa menu ini..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 leading-relaxed"
              />
            </div>
          </div>

          {/* Section 2: Upload Directly from Gallery */}
          <div className="space-y-3.5 pt-2">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-1">
              <h4 className="font-bold uppercase tracking-wider text-[11px] text-zinc-400">
                2. Foto Menu (Upload Langsung dari Galeri)
              </h4>
              <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                <Check className="w-3 h-3" /> Galeri HP / Komputer
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* Image Preview */}
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-700/80 flex-shrink-0 relative shadow-inner group">
                {imageUrl ? (
                  <>
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PRESET_PHOTOS[0].url;
                      }}
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold cursor-pointer transition-opacity"
                    >
                      <Camera className="w-5 h-5 mb-1 text-amber-300" />
                      <span>Ganti Foto</span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
              </div>

              {/* Upload directly from Gallery / Camera */}
              <div className="flex-1 w-full space-y-2.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                {/* Direct Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingImage}
                  className="w-full py-4 px-4 rounded-2xl border-2 border-dashed border-amber-500/50 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 text-zinc-200 transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 group active:scale-[0.99]"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-400 text-zinc-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                    {isProcessingImage ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5" />
                    )}
                  </div>
                  <span className="font-extrabold text-xs text-white group-hover:text-amber-300 transition-colors">
                    {isProcessingImage ? 'Sedang Memproses Foto...' : 'Klik untuk Pilih Foto dari Galeri HP / Kamera'}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Format: JPG, PNG, WEBP (Bisa langsung jepret kamera atau ambil dari galeri)
                  </span>
                </button>

                {/* Preset fallback options if staff doesn't want to use their own photo */}
                <div>
                  <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1">
                    Atau Pilih Contoh Foto Siap Pakai:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_PHOTOS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setImageUrl(p.url)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                          imageUrl === p.url
                            ? 'bg-amber-400 text-zinc-950 border-amber-400 font-bold'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Badges & Tags */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold uppercase tracking-wider text-[11px] text-zinc-400 border-b border-zinc-850 pb-1">
              3. Label Unggulan & Tagar
            </h4>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isRecommended}
                  onChange={(e) => setIsRecommended(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-white focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span className="font-bold text-amber-300">🌟 Tandai Sebagai "Rekomendasi Barista / Chef"</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isBestSeller}
                  onChange={(e) => setIsBestSeller(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-white focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span className="font-bold text-white">🔥 Tandai Sebagai "Best Seller"</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isSignature}
                  onChange={(e) => setIsSignature(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-white focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span className="font-bold text-white">⭐ Tandai Sebagai "Signature NAWATIGA"</span>
              </label>
            </div>

            {/* Tags manager */}
            <div className="space-y-1.5">
              <label className="block font-bold text-white">Tagar Menu (Pencarian Cepat):</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Contoh: Nyore, Creamy, Dingin..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-colors cursor-pointer"
                >
                  Tambah Tag
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 text-[10px] font-medium flex items-center gap-1.5"
                  >
                    <span>#{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-zinc-500 hover:text-red-400 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Customer Customization Options */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold uppercase tracking-wider text-[11px] text-zinc-400 border-b border-zinc-850 pb-1">
              4. Opsi Kustomisasi Tamu (Customizable Options)
            </h4>
            <p className="text-[11px] text-zinc-400">
              Pilih opsi apa saja yang dapat diatur oleh konsumen saat memesan menu ini di HP:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <label
                className={`p-3 rounded-xl border flex flex-col justify-between gap-2 cursor-pointer transition-all ${
                  allowSugar ? 'bg-zinc-900 border-white text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">Level Gula</span>
                  <input
                    type="checkbox"
                    checked={allowSugar}
                    onChange={(e) => setAllowSugar(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-800 text-white w-4 h-4 cursor-pointer"
                  />
                </div>
                <span className="text-[10px] text-zinc-400">100%, 50%, 25%, 0%</span>
              </label>

              <label
                className={`p-3 rounded-xl border flex flex-col justify-between gap-2 cursor-pointer transition-all ${
                  allowMilk ? 'bg-zinc-900 border-white text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">Pilihan Susu</span>
                  <input
                    type="checkbox"
                    checked={allowMilk}
                    onChange={(e) => setAllowMilk(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-800 text-white w-4 h-4 cursor-pointer"
                  />
                </div>
                <span className="text-[10px] text-zinc-400">Oatly, Soy, Fresh</span>
              </label>

              <label
                className={`p-3 rounded-xl border flex flex-col justify-between gap-2 cursor-pointer transition-all ${
                  allowIce ? 'bg-zinc-900 border-white text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">Level Es</span>
                  <input
                    type="checkbox"
                    checked={allowIce}
                    onChange={(e) => setAllowIce(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-800 text-white w-4 h-4 cursor-pointer"
                  />
                </div>
                <span className="text-[10px] text-zinc-400">Normal, Less Ice</span>
              </label>

              <label
                className={`p-3 rounded-xl border flex flex-col justify-between gap-2 cursor-pointer transition-all ${
                  allowTemp ? 'bg-zinc-900 border-white text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">Suhu Minum</span>
                  <input
                    type="checkbox"
                    checked={allowTemp}
                    onChange={(e) => setAllowTemp(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-800 text-white w-4 h-4 cursor-pointer"
                  />
                </div>
                <span className="text-[10px] text-zinc-400">Hot atau Iced</span>
              </label>
            </div>
          </div>

          {/* Section 5: Composition & Allergens */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold uppercase tracking-wider text-[11px] text-zinc-400 border-b border-zinc-850 pb-1">
              5. Detail Komposisi & Alergen
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-white mb-1">Komposisi / Bahan Baku:</label>
                <input
                  type="text"
                  value={composition}
                  onChange={(e) => setComposition(e.target.value)}
                  placeholder="Contoh: Double shot espresso, fresh milk, vanilla syrup"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-white mb-1">Tingkat Kafein:</label>
                <select
                  value={caffeineLevel}
                  onChange={(e) => setCaffeineLevel(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-white focus:outline-none cursor-pointer"
                >
                  <option value="Tinggi">Tinggi (High Caffeine)</option>
                  <option value="Sedang">Sedang (Moderate Caffeine)</option>
                  <option value="Rendah">Rendah (Low Caffeine)</option>
                  <option value="Bebas Kafein">Bebas Kafein (Decaf / Non-Coffee)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-white mb-1">Alergen (Pisahkan dengan koma):</label>
              <input
                type="text"
                value={allergensInput}
                onChange={(e) => setAllergensInput(e.target.value)}
                placeholder="Contoh: Susu Sapi (Dairy), Kacang, Gluten..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-600 focus:outline-none"
              />
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-zinc-950 border-t border-zinc-850 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-black flex items-center gap-2 shadow-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan ke Sistem...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{isEditing ? 'Simpan Perubahan Menu' : 'Tambah Menu Baru'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
