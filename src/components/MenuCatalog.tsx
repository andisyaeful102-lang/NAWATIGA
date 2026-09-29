import React, { useState, useMemo } from 'react';
import { Search, Plus, Sparkles, Coffee, Moon, Sunset, Compass, AlertCircle, CheckCircle, Check, X, ArrowRight, UtensilsCrossed, CupSoda } from 'lucide-react';
import { MENU_ITEMS, CATEGORIES, MenuItem, MASTER_CATEGORIES, MasterCategoryId, getMasterCategory, getCategoryBadgeLabel } from '../data/menu.ts';
import { AESTHETIC_ASSETS } from '../data/assets.ts';
import { NawatigaLogo } from './NawatigaLogo.tsx';

export interface ItemAvailabilityInfo {
  isAvailable: boolean;
  soldOutReason?: string;
  updatedAt?: string;
}

interface MenuCatalogProps {
  onSelectItem: (item: MenuItem) => void;
  tableNumber: string;
  availabilityMap?: Record<string, ItemAvailabilityInfo>;
  items?: MenuItem[];
  mobileFrameMode?: boolean;
}

export const MenuCatalog: React.FC<MenuCatalogProps> = ({
  onSelectItem,
  tableNumber,
  availabilityMap = {},
  items = MENU_ITEMS,
  mobileFrameMode,
}) => {
  const [selectedMasterCategory, setSelectedMasterCategory] = useState<MasterCategoryId>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterReadyOnly, setFilterReadyOnly] = useState<boolean>(false);
  const [soldOutItemNotice, setSoldOutItemNotice] = useState<MenuItem | null>(null);

  // Helper to determine real-time availability of an item
  const getItemAvailability = (item: MenuItem): { isAvailable: boolean; soldOutReason?: string } => {
    if (availabilityMap[item.id] !== undefined) {
      return {
        isAvailable: availabilityMap[item.id].isAvailable,
        soldOutReason: availabilityMap[item.id].soldOutReason,
      };
    }
    return {
      isAvailable: item.isAvailable ?? true,
      soldOutReason: item.soldOutReason,
    };
  };

  const { readyCount, soldOutCount } = useMemo(() => {
    let ready = 0;
    let soldOut = 0;
    items.forEach((i) => {
      const avail = getItemAvailability(i);
      if (avail.isAvailable) ready++;
      else soldOut++;
    });
    return { readyCount: ready, soldOutCount: soldOut };
  }, [availabilityMap, items]);

  // Master Category stats (total and ready counts)
  const masterCategoryStats = useMemo(() => {
    let coffeeTotal = 0;
    let coffeeReady = 0;
    let nonCoffeeTotal = 0;
    let nonCoffeeReady = 0;
    let foodTotal = 0;
    let foodReady = 0;

    items.forEach((item) => {
      const avail = getItemAvailability(item);
      const m = getMasterCategory(item.category);
      if (m === 'coffee') {
        coffeeTotal++;
        if (avail.isAvailable) coffeeReady++;
      } else if (m === 'non-coffee') {
        nonCoffeeTotal++;
        if (avail.isAvailable) nonCoffeeReady++;
      } else if (m === 'food') {
        foodTotal++;
        if (avail.isAvailable) foodReady++;
      }
    });

    return {
      coffee: { total: coffeeTotal, ready: coffeeReady },
      'non-coffee': { total: nonCoffeeTotal, ready: nonCoffeeReady },
      food: { total: foodTotal, ready: foodReady },
      all: { total: items.length, ready: readyCount },
    };
  }, [items, availabilityMap, readyCount]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const itemMaster = getMasterCategory(item.category);
      const matchesMaster = selectedMasterCategory === 'all' || itemMaster === selectedMasterCategory;
      const matchesCategory = matchesMaster && (selectedCategory === 'all' || item.category === selectedCategory);
      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const avail = getItemAvailability(item);
      const matchesReadyOnly = !filterReadyOnly || avail.isAvailable;

      return matchesCategory && matchesSearch && matchesReadyOnly;
    });
  }, [selectedMasterCategory, selectedCategory, searchQuery, filterReadyOnly, availabilityMap, items]);

  // Featured 2 flagship items (or first two items)
  const signatureLatte = items.find((i) => i.id === 'palm-sugar-latte') || items[0];
  const truffleFries = items.find((i) => i.id === 'truffle-fries') || items[1];

  const handleItemCardClick = (item: MenuItem) => {
    const avail = getItemAvailability(item);
    if (!avail.isAvailable) {
      setSoldOutItemNotice(item);
      return;
    }
    // Pass merged availability info to customizer
    onSelectItem({
      ...item,
      isAvailable: avail.isAvailable,
      soldOutReason: avail.soldOutReason,
    });
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Cinematic Black & White Night Cafe Hero Banner */}
      <div
        className={`relative rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl flex flex-col justify-between ${
          mobileFrameMode ? 'p-4 min-h-[195px]' : 'p-4 sm:p-6 min-h-[195px] sm:min-h-[220px]'
        }`}
      >
        {/* Background Image & Vignette Overlays */}
        <img
          src={AESTHETIC_ASSETS.cafeNight}
          alt="Suasana Cafe Nawatiga Ngopi Nyore dan Malam"
          className="absolute inset-0 w-full h-full object-cover aesthetic-bw opacity-55 scale-102 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/75 to-zinc-950/30 pointer-events-none" />
        <div className="absolute inset-0 bg-radial from-transparent via-transparent to-zinc-950/80 pointer-events-none" />

        {/* Top Tag: Jam Buka & Meja */}
        <div className="relative z-10 flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 border border-zinc-700/80 text-[10px] sm:text-[11px] font-medium text-zinc-300 backdrop-blur-md whitespace-nowrap shadow-sm">
            <Sunset className="w-3.5 h-3.5 text-zinc-300" />
            <span>Nyore 15:00</span>
            <span className="text-zinc-500">→</span>
            <Moon className="w-3.5 h-3.5 text-zinc-300" />
            <span>Malam 24:00</span>
            <span className="text-zinc-500">|</span>
            <span className="font-bold text-white">Meja #{tableNumber}</span>
          </div>
        </div>

        {/* Content Section: Title, Subtitle, and Status Badge */}
        <div className="relative z-10 pt-3 space-y-3">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-zinc-950/80 backdrop-blur-md p-1.5 border border-amber-500/40 shadow-[0_4px_24px_rgba(245,158,11,0.2)] flex items-center justify-center flex-shrink-0 ring-1 ring-white/10 group hover:border-amber-400 transition-all">
              <NawatigaLogo variant="dark" size="lg" className="w-full h-full" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  className={`font-extrabold font-serif-cafe tracking-wide text-white drop-shadow-md leading-tight ${
                    mobileFrameMode
                      ? 'text-[18px]'
                      : 'text-xl sm:text-3xl'
                  }`}
                >
                  NAWATIGA
                </h1>
                <span className="text-[11px] sm:text-xs font-sans text-amber-300 font-bold bg-amber-950/70 px-2.5 py-0.5 rounded-full border border-amber-500/40 shadow-sm">
                  by Rose Garden Coffee
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-300 font-medium mt-0.5">
                Self-Order & Pick-Up Barista Bar
              </p>
            </div>
          </div>

          <div
            className={`flex justify-between gap-2.5 sm:gap-4 ${
              mobileFrameMode
                ? 'flex-col items-start gap-2.5'
                : 'flex-col sm:flex-row sm:items-end'
            }`}
          >
            <p
              className={`text-zinc-300 leading-relaxed max-w-lg ${
                mobileFrameMode ? 'text-[11px]' : 'text-[11px] sm:text-xs'
              }`}
            >
              Nikmati waktu santai ngopi nyore hingga larut malam. Pesan langsung dari meja Anda lewat barcode digital.
            </p>

            <div className="flex-shrink-0 self-start sm:self-end">
              <div className="px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-700/80 text-[11px] text-zinc-300 backdrop-blur-md inline-flex items-center gap-2.5 shadow-md whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-white">{readyCount} Menu</span>
                  <span className="text-zinc-400 text-[10px]">Ready</span>
                </div>
                {soldOutCount > 0 && (
                  <div className="border-l border-zinc-700 pl-2.5 flex items-center gap-1">
                    <span className="font-bold text-red-400">{soldOutCount}</span>
                    <span className="text-red-400 text-[10px] font-semibold">Habis</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION: PILIH KATEGORI MENU YANG INGIN DITAMBAHKAN (BERANDA) */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
              Pilih Kategori Menu yang Mau Ditambahkan:
            </h3>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">3 Kategori Utama</span>
        </div>

        {/* 3 Large Visual Category Cards for Fast Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: Coffee */}
          <div
            onClick={() => {
              setSelectedMasterCategory('coffee');
              setSelectedCategory('all');
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
              selectedMasterCategory === 'coffee'
                ? 'bg-amber-950/70 border-amber-500 shadow-xl shadow-amber-500/10 ring-2 ring-amber-400/40'
                : 'bg-zinc-900/80 hover:bg-zinc-850 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center font-bold text-lg">
                ☕
              </div>
              <span
                className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                  selectedMasterCategory === 'coffee'
                    ? 'bg-amber-400 text-zinc-950 font-black'
                    : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                {masterCategoryStats.coffee.ready} Ready
              </span>
            </div>

            <div className="mt-3">
              <h4 className="font-extrabold text-sm text-white group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                <span>Coffee (Kopi)</span>
                {selectedMasterCategory === 'coffee' && (
                  <Check className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />
                )}
              </h4>
              <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
                Signature Latte, Espresso, Classic & Manual Brew
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs font-semibold">
              <span className="text-[11px] text-amber-300/90 font-mono">
                {masterCategoryStats.coffee.total} Pilihan Kopi
              </span>
              <span className="text-[11px] text-zinc-300 group-hover:text-white flex items-center gap-1">
                <span>+ Tambah Kopi</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>

          {/* Card 2: Non-Coffee */}
          <div
            onClick={() => {
              setSelectedMasterCategory('non-coffee');
              setSelectedCategory('all');
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
              selectedMasterCategory === 'non-coffee'
                ? 'bg-emerald-950/70 border-emerald-500 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-400/40'
                : 'bg-zinc-900/80 hover:bg-zinc-850 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold text-lg">
                🍵
              </div>
              <span
                className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                  selectedMasterCategory === 'non-coffee'
                    ? 'bg-emerald-400 text-zinc-950 font-black'
                    : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                {masterCategoryStats['non-coffee'].ready} Ready
              </span>
            </div>

            <div className="mt-3">
              <h4 className="font-extrabold text-sm text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                <span>Non-Coffee</span>
                {selectedMasterCategory === 'non-coffee' && (
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                )}
              </h4>
              <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
                Kyoto Matcha, Dark Chocolate & Artisan Tea
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs font-semibold">
              <span className="text-[11px] text-emerald-300/90 font-mono">
                {masterCategoryStats['non-coffee'].total} Pilihan Minuman
              </span>
              <span className="text-[11px] text-zinc-300 group-hover:text-white flex items-center gap-1">
                <span>+ Tambah Non-Kopi</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>

          {/* Card 3: Food / Makanan */}
          <div
            onClick={() => {
              setSelectedMasterCategory('food');
              setSelectedCategory('all');
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
              selectedMasterCategory === 'food'
                ? 'bg-rose-950/70 border-rose-500 shadow-xl shadow-rose-500/10 ring-2 ring-rose-400/40'
                : 'bg-zinc-900/80 hover:bg-zinc-850 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center font-bold text-lg">
                🍽️
              </div>
              <span
                className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                  selectedMasterCategory === 'food'
                    ? 'bg-rose-400 text-zinc-950 font-black'
                    : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                {masterCategoryStats.food.ready} Ready
              </span>
            </div>

            <div className="mt-3">
              <h4 className="font-extrabold text-sm text-white group-hover:text-rose-300 transition-colors flex items-center gap-1.5">
                <span>Makanan & Bites</span>
                {selectedMasterCategory === 'food' && (
                  <Check className="w-3.5 h-3.5 text-rose-400 stroke-[3]" />
                )}
              </h4>
              <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
                Truffle Fries, Pastry, Snack Gurih & Main Course
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs font-semibold">
              <span className="text-[11px] text-rose-300/90 font-mono">
                {masterCategoryStats.food.total} Pilihan Makanan
              </span>
              <span className="text-[11px] text-zinc-300 group-hover:text-white flex items-center gap-1">
                <span>+ Tambah Makanan</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Compass className="w-3.5 h-3.5" />
              <span>Eksplorasi Sajian Kopi & Makanan</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-wide">Pilihan Menu Digital</h2>
          </div>

          {/* Search box & Ready Only Toggle */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari palm sugar, fries..."
                className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-zinc-800 bg-zinc-900/90 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 shadow-inner transition-colors"
              />
            </div>

            {/* Filter Ready Only Button */}
            <button
              type="button"
              onClick={() => setFilterReadyOnly(!filterReadyOnly)}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border whitespace-nowrap cursor-pointer ${
                filterReadyOnly
                  ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300 ring-1 ring-emerald-500'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
              }`}
              title="Saring menu yang ready saja"
            >
              <span className={`w-2 h-2 rounded-full ${filterReadyOnly ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
              <span className="hidden sm:inline">Hanya</span> Ready
            </button>
          </div>
        </div>

        {/* Master Category Tabs Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-zinc-900/80 rounded-2xl border border-zinc-800">
          {MASTER_CATEGORIES.map((cat) => {
            const isSelected = selectedMasterCategory === cat.id;
            const count =
              cat.id === 'all'
                ? items.length
                : cat.id === 'coffee'
                ? masterCategoryStats.coffee.total
                : cat.id === 'non-coffee'
                ? masterCategoryStats['non-coffee'].total
                : masterCategoryStats.food.total;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedMasterCategory(cat.id);
                  setSelectedCategory('all');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white text-zinc-950 font-black shadow-md ring-2 ring-white/30'
                    : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <span className="text-base">{cat.icon}</span>
                <span className="truncate">{cat.shortLabel}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    isSelected ? 'bg-zinc-950 text-white font-bold' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sub-categories Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
          <span className="text-[11px] font-mono text-zinc-500 whitespace-nowrap">Sub-kategori:</span>
          {CATEGORIES.filter((cat) => {
            if (cat.id === 'all') return true;
            if (selectedMasterCategory === 'all') return true;
            if (selectedMasterCategory === 'coffee') return cat.id.startsWith('coffee-');
            if (selectedMasterCategory === 'non-coffee') return cat.id === 'non-coffee';
            if (selectedMasterCategory === 'food') return cat.id.startsWith('food-');
            return true;
          }).map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-200 text-zinc-950 border-white font-bold shadow'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Active Category Notice / Reset */}
        {selectedMasterCategory !== 'all' && (
          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs text-zinc-300">
            <span className="flex items-center gap-1.5 font-medium">
              <span>Filter Kategori Aktif:</span>
              <strong className="text-white font-bold">
                {selectedMasterCategory === 'coffee'
                  ? '☕ Coffee (Kopi)'
                  : selectedMasterCategory === 'non-coffee'
                  ? '🍵 Non-Coffee'
                  : '🍽️ Makanan & Bites'}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedMasterCategory('all');
                setSelectedCategory('all');
              }}
              className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
            >
              Lihat Semua Menu
            </button>
          </div>
        )}
      </div>

      {/* Flagship Recommendation Spotlight (when no search active) */}
      {!searchQuery && selectedCategory === 'all' && signatureLatte && truffleFries && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-zinc-200" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Menu Andalan Rekomendasi ADMIN
              </h3>
            </div>
            <span className="text-[11px] text-zinc-400 font-mono">Wajib Coba Nyore & Malam</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Signature Palm Sugar Latte Card */}
            {(() => {
              const avail = getItemAvailability(signatureLatte);
              return (
                <div
                  onClick={() => handleItemCardClick(signatureLatte)}
                  className={`group cursor-pointer rounded-2xl p-4 text-white shadow-xl hover:shadow-2xl transition-all border flex gap-4 items-center relative overflow-hidden ${
                    avail.isAvailable
                      ? 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700'
                      : 'bg-zinc-900/40 border-red-900/40 opacity-75'
                  }`}
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden flex-shrink-0 relative border border-zinc-700/60 bg-zinc-950">
                    <img
                      src={signatureLatte.imageUrl}
                      alt={signatureLatte.name}
                      className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                        !avail.isAvailable ? 'grayscale contrast-125 opacity-60' : ''
                      }`}
                    />
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-zinc-950/90 border border-zinc-700 text-[9px] font-black text-white uppercase tracking-wider">
                      Signature #1
                    </span>
                    {!avail.isAvailable && (
                      <div className="absolute inset-0 bg-red-950/70 flex items-center justify-center p-1 text-center">
                        <span className="px-2 py-1 rounded bg-red-600 text-white font-black text-[10px] tracking-wider uppercase shadow-lg">
                          HABIS
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-semibold">
                      <span>Espresso House Blend</span>
                      <span>·</span>
                      <span>Gula Aren Organik</span>
                    </div>
                    <h4 className="font-bold text-sm text-white truncate mt-1 font-serif-cafe group-hover:text-zinc-200">
                      {signatureLatte.name}
                    </h4>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                      {signatureLatte.description}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm font-black text-white font-mono">
                        {signatureLatte.formattedPrice}
                      </span>
                      {avail.isAvailable ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemCardClick(signatureLatte);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-[11px] font-extrabold flex items-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Pilih</span>
                        </button>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md bg-red-950 text-red-300 border border-red-800 text-[10px] font-bold">
                          Habis
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Truffle Fries Card */}
            {(() => {
              const avail = getItemAvailability(truffleFries);
              return (
                <div
                  onClick={() => handleItemCardClick(truffleFries)}
                  className={`group cursor-pointer rounded-2xl p-4 text-white shadow-xl hover:shadow-2xl transition-all border flex gap-4 items-center relative overflow-hidden ${
                    avail.isAvailable
                      ? 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700'
                      : 'bg-zinc-900/40 border-red-900/40 opacity-75'
                  }`}
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden flex-shrink-0 relative border border-zinc-700/60 bg-zinc-950">
                    <img
                      src={truffleFries.imageUrl}
                      alt={truffleFries.name}
                      className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                        !avail.isAvailable ? 'grayscale contrast-125 opacity-60' : ''
                      }`}
                    />
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-zinc-950/90 border border-zinc-700 text-[9px] font-black text-white uppercase tracking-wider">
                      Bites #1
                    </span>
                    {!avail.isAvailable && (
                      <div className="absolute inset-0 bg-red-950/70 flex items-center justify-center p-1 text-center">
                        <span className="px-2 py-1 rounded bg-red-600 text-white font-black text-[10px] tracking-wider uppercase shadow-lg">
                          HABIS
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-semibold">
                      <span>Camilan Savory</span>
                      <span>·</span>
                      <span>White Truffle Oil</span>
                    </div>
                    <h4 className="font-bold text-sm text-white truncate mt-1 font-serif-cafe group-hover:text-zinc-200">
                      {truffleFries.name}
                    </h4>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                      {truffleFries.description}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm font-black text-white font-mono">
                        {truffleFries.formattedPrice}
                      </span>
                      {avail.isAvailable ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemCardClick(truffleFries);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-[11px] font-extrabold flex items-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Pilih</span>
                        </button>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md bg-red-950 text-red-300 border border-red-800 text-[10px] font-bold">
                          Habis
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Menampilkan {filteredItems.length} pilihan menu</span>
          <div className="flex items-center gap-3">
            {filterReadyOnly && (
              <span className="text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Filter Hanya Ready Aktif
              </span>
            )}
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-white hover:underline font-medium"
              >
                Reset pencarian
              </button>
            )}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center bg-zinc-900/40 rounded-3xl border border-zinc-800/80 space-y-3">
            <Coffee className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-sm font-semibold text-zinc-300">Tidak ada menu yang sesuai</p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              {filterReadyOnly
                ? 'Semua menu dalam kategori ini saat ini sedang habis atau tidak cocok dengan pencarian Anda.'
                : 'Coba kata kunci lain atau pilih kategori lain di atas.'}
            </p>
            {filterReadyOnly && (
              <button
                type="button"
                onClick={() => setFilterReadyOnly(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-white text-xs font-bold hover:bg-zinc-700"
              >
                Tampilkan Semua Termasuk yang Habis
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const avail = getItemAvailability(item);
              const isReady = avail.isAvailable;

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemCardClick(item)}
                  className={`group cursor-pointer rounded-2xl border overflow-hidden shadow-lg transition-all flex flex-col justify-between relative ${
                    isReady
                      ? 'bg-zinc-900/70 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                      : 'bg-zinc-900/40 border-red-900/40 hover:border-red-700/60'
                  }`}
                >
                  <div>
                    {/* Photo container */}
                    <div className="relative h-48 w-full bg-zinc-950 overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className={`w-full h-full object-cover transition-transform duration-500 ${
                          isReady
                            ? 'group-hover:scale-105'
                            : 'grayscale contrast-125 opacity-55'
                        }`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent opacity-70" />

                      {/* Best Seller / Signature badges */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                        {item.isBestSeller && (
                          <span className="px-2 py-0.5 rounded-md bg-zinc-950/90 border border-zinc-700 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                            Best Seller
                          </span>
                        )}
                        {item.isSignature && (
                          <span className="px-2 py-0.5 rounded-md bg-white text-zinc-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                            Signature
                          </span>
                        )}
                      </div>

                      {/* Prominent SOLD OUT Overlay if item is unavailable */}
                      {!isReady && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 text-center z-20">
                          <div className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-black text-xs uppercase tracking-wider shadow-2xl flex items-center gap-1.5 border border-red-400">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>HABIS / SOLD OUT</span>
                          </div>
                          <span className="text-[11px] text-zinc-200 font-medium mt-1.5 drop-shadow">
                            {avail.soldOutReason || 'Stok habis untuk hari ini'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div className="p-4 space-y-2">
                      {/* Category Badge & Availability Tag */}
                      <div className="flex items-center justify-between text-[11px] gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          {(() => {
                            const badge = getCategoryBadgeLabel(item.category);
                            return (
                              <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700/60 text-amber-200 font-bold text-[10px] flex items-center gap-1">
                                <span>{badge.icon}</span>
                                <span>{badge.label}</span>
                              </span>
                            );
                          })()}
                        </div>
                        {isReady ? (
                          <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 flex-shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Ready
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-red-400 flex items-center gap-1 flex-shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Habis
                          </span>
                        )}
                      </div>

                      <h4
                        className={`font-bold text-sm leading-snug transition-colors ${
                          isReady ? 'text-white group-hover:text-zinc-200' : 'text-zinc-300'
                        }`}
                      >
                        {item.name}
                      </h4>
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Footer price & button */}
                  <div className="p-4 pt-0 flex items-center justify-between border-t border-zinc-800/80 mt-2">
                    <div className={`font-bold text-sm font-mono ${isReady ? 'text-white' : 'text-zinc-400'}`}>
                      {item.formattedPrice}
                    </div>

                    {isReady ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemCardClick(item);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>+ Tambah</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSoldOutItemNotice(item);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 text-xs font-bold border border-red-800/80 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                        <span>Habis</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sold Out Notice Pop-up Modal when user taps an unavailable item */}
      {soldOutItemNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-700 flex items-center justify-center mx-auto text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-red-950 text-red-300 text-[10px] font-black uppercase tracking-wider border border-red-800">
                Menu Sedang Habis / Sold Out
              </span>
              <h3 className="text-base font-bold text-white font-serif-cafe mt-1">
                {soldOutItemNotice.name}
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Maaf Kak! Bahan untuk sajian ini sudah habis terjual hari ini. Sistem otomatis menonaktifkan pemesanan agar tidak terjadi kesalahan racik.
              </p>
            </div>

            <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800/80 text-xs space-y-1 text-left">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                💡 Rekomendasi Menu Serupa yang READY:
              </span>
              <p className="text-zinc-200 font-medium text-[11px]">
                {soldOutItemNotice.category.includes('coffee')
                  ? 'Signature Palm Sugar Latte atau Pandan Velvet Macchiato'
                  : 'Nasi Goreng Se\'i Sapi Nawatiga atau Truffle Parmesan Fries'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSoldOutItemNotice(null)}
              className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs transition-colors cursor-pointer"
            >
              Baik, Saya Pilih Menu Lain
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
