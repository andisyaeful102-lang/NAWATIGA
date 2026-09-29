import React, { useState, useMemo } from 'react';
import { X, Check, MapPin, Search, Layers, Sparkles } from 'lucide-react';
import { ALL_100_TABLES, TABLE_ZONES, getTableZoneName } from '../data/tables.ts';

interface TablePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTable: string;
  onSelectTable: (table: string) => void;
}

export const TablePickerModal: React.FC<TablePickerModalProps> = ({
  isOpen,
  onClose,
  currentTable,
  onSelectTable,
}) => {
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const filteredTables = ALL_100_TABLES.filter((t) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNumber = t.toLowerCase().includes(q) || `meja ${t}`.toLowerCase().includes(q);
      const isBarMatch = t === 'BAR' && (q.includes('bar') || q.includes('kasir'));
      if (!matchNumber && !isBarMatch) return false;
    }

    // Zone filter
    if (selectedZone === 'all') return true;
    if (selectedZone === 'bar') return t === 'BAR';

    const zone = TABLE_ZONES.find((z) => z.id === selectedZone);
    if (!zone) return true;

    if (t === 'BAR') return false;
    const num = parseInt(t, 10);
    return !isNaN(num) && num >= zone.start && num <= zone.end;
  });

  const handleSelect = (table: string) => {
    onSelectTable(table);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-zinc-950 rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-zinc-900/60 border-b border-zinc-800 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base font-serif-cafe">Pilih Nomor Meja Anda</h3>
              <p className="text-[11px] text-zinc-400">Tersedia Meja 01 s/d Meja 100 & Stand Bar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Zone Filter Bar */}
        <div className="p-4 bg-zinc-900/30 border-b border-zinc-800 space-y-3">
          {/* Direct Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari atau ketik nomor meja (misal: 42, 88, atau BAR)..."
              className="w-full bg-zinc-900 border border-zinc-750 text-white rounded-xl pl-9 pr-3 py-2 text-xs placeholder:text-zinc-500 focus:outline-none focus:border-amber-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Zone Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedZone('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedZone === 'all'
                  ? 'bg-white text-zinc-950 shadow-md'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              Semua (100 Meja)
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
        </div>

        {/* Table Buttons Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-zinc-950">
          {filteredTables.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              Tidak ada meja yang cocok dengan pencarian "{searchQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {filteredTables.map((t) => {
                const isSelected = t === currentTable;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleSelect(t)}
                    className={`py-2.5 px-1 rounded-2xl text-center font-bold text-xs transition-all border cursor-pointer flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-white text-zinc-950 border-white shadow-lg ring-2 ring-white/40 scale-105'
                        : 'bg-zinc-900/90 hover:bg-zinc-850 text-zinc-200 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-[8px] uppercase font-mono tracking-wider opacity-60">
                      {t === 'BAR' ? 'AREA' : 'MEJA'}
                    </span>
                    <span className="text-sm font-mono font-black mt-0.5">{t}</span>
                    {isSelected && <Check className="w-3 h-3 text-zinc-950 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-zinc-900/80 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 font-mono">
          <div className="truncate">
            Area: <span className="text-zinc-200">{getTableZoneName(currentTable)}</span>
          </div>
          <div className="font-bold text-white flex-shrink-0">
            Meja Terpilih: #{currentTable}
          </div>
        </div>
      </div>
    </div>
  );
};
