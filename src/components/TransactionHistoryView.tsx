import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Search,
  Filter,
  ArrowUpDown,
  Printer,
  CheckCircle2,
  Clock,
  ChefHat,
  Coffee,
  Calendar,
  DollarSign,
  TrendingUp,
  CreditCard,
  Banknote,
  QrCode,
  Share2,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { BaristaOrder, isOrderPayLater } from './BaristaKDSView.tsx';

interface TransactionHistoryViewProps {
  orders: BaristaOrder[];
  onPrintReceipt: (order: BaristaOrder) => void;
  onRefresh: () => void;
  staffName?: string;
  onUpdateStatus?: (orderId: string, newStatus: BaristaOrder['status']) => void;
}

export const TransactionHistoryView: React.FC<TransactionHistoryViewProps> = ({
  orders,
  onPrintReceipt,
  onRefresh,
  staffName,
  onUpdateStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'serving' | 'preparing' | 'received'>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [tableTypeFilter, setTableTypeFilter] = useState<'all' | 'dinein' | 'walkin'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest'>('newest');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Toggle order accordion details
  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  // Expand all / collapse all
  const handleExpandAll = () => {
    if (expandedOrders.size === orders.length) {
      setExpandedOrders(new Set());
    } else {
      setExpandedOrders(new Set(orders.map((o) => o.id || o.orderNumber)));
    }
  };

  // Financial & Operational Metrics
  const metrics = useMemo(() => {
    const totalTransactions = orders.length;
    const completedTransactions = orders.filter((o) => o.status === 'completed').length;
    const inProgressTransactions = orders.filter((o) => o.status !== 'completed').length;

    const totalRevenue = orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    const completedRevenue = orders
      .filter((o) => o.status === 'completed')
      .reduce((acc, o) => acc + (o.totalAmount || 0), 0);

    const totalItemsSold = orders.reduce(
      (acc, o) => acc + o.items.reduce((iAcc, item) => iAcc + (item.quantity || 1), 0),
      0
    );

    const avgBasketSize = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

    // Payment methods breakdown
    const qrisRevenue = orders
      .filter((o) => /qris/i.test(o.paymentMethod))
      .reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    const cashRevenue = orders
      .filter((o) => /tunai|cash/i.test(o.paymentMethod))
      .reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    const otherRevenue = totalRevenue - qrisRevenue - cashRevenue;

    const payLaterOrders = orders.filter(isOrderPayLater);
    const payLaterRevenue = payLaterOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    const paidOrders = orders.filter((o) => !isOrderPayLater(o));
    const paidRevenue = paidOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);

    return {
      totalTransactions,
      completedTransactions,
      inProgressTransactions,
      totalRevenue,
      completedRevenue,
      totalItemsSold,
      avgBasketSize,
      qrisRevenue,
      cashRevenue,
      otherRevenue,
      payLaterCount: payLaterOrders.length,
      payLaterRevenue,
      paidCount: paidOrders.length,
      paidRevenue,
    };
  }, [orders]);

  // Filtered and Sorted Orders List
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchOrderNumber = order.orderNumber.toLowerCase().includes(q);
          const matchTable = order.tableNumber.toLowerCase().includes(q);
          const matchPayment = order.paymentMethod.toLowerCase().includes(q);
          const matchItems = order.items.some((i) => i.name.toLowerCase().includes(q) || (i.notes && i.notes.toLowerCase().includes(q)));
          if (!matchOrderNumber && !matchTable && !matchPayment && !matchItems) {
            return false;
          }
        }

        // Status filter
        if (statusFilter !== 'all' && order.status !== statusFilter) {
          return false;
        }

        // Payment method & Pay Later filter
        if (paymentFilter !== 'all') {
          const isPayLater = isOrderPayLater(order);
          if (paymentFilter === 'pay_later' && !isPayLater) return false;
          if (paymentFilter === 'paid' && isPayLater) return false;
          if (paymentFilter === 'qris' && !/qris/i.test(order.paymentMethod)) return false;
          if (paymentFilter === 'cash' && !/tunai|cash/i.test(order.paymentMethod)) return false;
          if (paymentFilter === 'debit' && !/debit|bca|mandiri|kartu/i.test(order.paymentMethod)) return false;
        }

        // Table type filter
        if (tableTypeFilter !== 'all') {
          const isWalkIn = order.tableNumber === 'BAR' || /bar|kasir|walk-in/i.test(order.tableNumber);
          if (tableTypeFilter === 'walkin' && !isWalkIn) return false;
          if (tableTypeFilter === 'dinein' && isWalkIn) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'highest') {
          return (b.totalAmount || 0) - (a.totalAmount || 0);
        }
        if (sortBy === 'oldest') {
          return a.createdAt.localeCompare(b.createdAt);
        }
        // newest (default)
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [orders, searchQuery, statusFilter, paymentFilter, tableTypeFilter, sortBy]);

  // Copy Shift Summary to Clipboard
  const handleCopyShiftSummary = async () => {
    const text = `
*REKAP TRANSAKSI HARIAN - NAWATIGA COFFEE*
Tanggal: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
Petugas Kasir/Barista: ${staffName || 'Staf Barista'}
-----------------------------------------
• Total Transaksi : ${metrics.totalTransactions} Pesanan
• Selesai (Lunas) : ${metrics.completedTransactions}
• Sedang Berjalan : ${metrics.inProgressTransactions}
• Total Cup/Item  : ${metrics.totalItemsSold} porsi/cup
-----------------------------------------
• TOTAL OMZET     : Rp ${metrics.totalRevenue.toLocaleString('id-ID')}
  - QRIS          : Rp ${metrics.qrisRevenue.toLocaleString('id-ID')}
  - Tunai (Cash)  : Rp ${metrics.cashRevenue.toLocaleString('id-ID')}
  - Debit/Lainnya : Rp ${metrics.otherRevenue.toLocaleString('id-ID')}
• Rata-rata/Order : Rp ${metrics.avgBasketSize.toLocaleString('id-ID')}
-----------------------------------------
_Laporan otomatis sistem POS & KDS NAWATIGA by Rose Garden Coffee_
    `.trim();

    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    } catch {
      // quiet
    }
  };

  const getStatusBadge = (status: BaristaOrder['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/80 border border-emerald-700/80 text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Selesai / Lunas</span>
          </span>
        );
      case 'serving':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950/80 border border-amber-700/80 text-amber-300 animate-pulse">
            <Coffee className="w-3.5 h-3.5" />
            <span>Siap di Pick-up Bar</span>
          </span>
        );
      case 'preparing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-950/80 border border-blue-700/80 text-blue-300">
            <ChefHat className="w-3.5 h-3.5" />
            <span>Sedang Diracik</span>
          </span>
        );
      case 'received':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950/80 border border-rose-700/80 text-rose-300">
            <Clock className="w-3.5 h-3.5" />
            <span>Pesanan Baru</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ========================================================================= */}
      {/* SHIFT & DAILY FINANCIAL SUMMARY METRICS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Total Omzet */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden group hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2 font-mono">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-amber-400">
              <DollarSign className="w-4 h-4" />
              <span>Total Omzet Shift</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
            Rp {metrics.totalRevenue.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 flex items-center justify-between">
            <span>Selesai: Rp {metrics.completedRevenue.toLocaleString('id-ID')}</span>
            <span className="text-emerald-400 font-semibold">100% Tercatat</span>
          </div>
        </div>

        {/* Metric 2: Total Pesanan */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden group hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2 font-mono">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-zinc-300">
              <Receipt className="w-4 h-4 text-zinc-300" />
              <span>Jumlah Transaksi</span>
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight flex items-baseline gap-2">
            <span>{metrics.totalTransactions}</span>
            <span className="text-xs font-normal text-zinc-400">Order</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-2">
            <span className="text-emerald-400 font-semibold">{metrics.completedTransactions} Selesai</span>
            <span>·</span>
            <span className="text-amber-400">{metrics.inProgressTransactions} Aktif</span>
          </div>
        </div>

        {/* Metric 3: Total Cup/Item Terjual */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden group hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2 font-mono">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-zinc-300">
              <Coffee className="w-4 h-4 text-amber-400" />
              <span>Item & Cup Terjual</span>
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight flex items-baseline gap-2">
            <span>{metrics.totalItemsSold}</span>
            <span className="text-xs font-normal text-zinc-400">Porsi</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Rata-rata: Rp {metrics.avgBasketSize.toLocaleString('id-ID')} / order
          </div>
        </div>

        {/* Metric 4: Metode Bayar */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden group hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2 font-mono">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-zinc-300">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Pecahan Pembayaran</span>
            </span>
          </div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between items-center text-zinc-300">
              <span>QRIS ({Math.round((metrics.qrisRevenue / (metrics.totalRevenue || 1)) * 100)}%):</span>
              <span className="font-bold text-white">Rp {metrics.qrisRevenue.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400 text-[11px]">
              <span>Tunai / Lainnya:</span>
              <span className="font-semibold text-zinc-300">
                Rp {(metrics.cashRevenue + metrics.otherRevenue).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FILTER & SEARCH TOOLBAR */}
      {/* ========================================================================= */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari no. struk (#NWT-...), meja, nama menu, atau metode bayar..."
              className="w-full bg-zinc-900 border border-zinc-750 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyShiftSummary}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm active:scale-95"
              title="Salin ringkasan transaksi shift untuk laporan WA owner"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSummary ? 'Rekap Disalin!' : 'Salin Rekap Shift'}</span>
            </button>

            <button
              type="button"
              onClick={handleExpandAll}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
            >
              {expandedOrders.size === orders.length ? 'Ciutkan Semua' : 'Buka Rincian'}
            </button>

            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white transition-colors cursor-pointer"
              title="Perbarui daftar transaksi"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-850/80 text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
            <span className="text-[10px] text-zinc-400 font-bold px-2 uppercase font-mono">Status:</span>
            {[
              { id: 'all' as const, label: 'Semua' },
              { id: 'completed' as const, label: 'Selesai' },
              { id: 'serving' as const, label: 'Siap Ambil' },
              { id: 'preparing' as const, label: 'Diracik' },
              { id: 'received' as const, label: 'Baru' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === st.id
                    ? 'bg-white text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
            <span className="text-[10px] text-zinc-400 font-bold px-2 uppercase font-mono">Bayar:</span>
            {[
              { id: 'all', label: 'Semua' },
              { id: 'pay_later', label: `⏱️ Bayar Nanti (${metrics.payLaterCount})` },
              { id: 'paid', label: `✓ Lunas (${metrics.paidCount})` },
              { id: 'qris', label: 'QRIS' },
              { id: 'cash', label: 'Tunai' },
              { id: 'debit', label: 'Debit' },
            ].map((pm) => (
              <button
                key={pm.id}
                type="button"
                onClick={() => setPaymentFilter(pm.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  paymentFilter === pm.id
                    ? pm.id === 'pay_later'
                      ? 'bg-amber-400 text-zinc-950 font-bold shadow-sm'
                      : pm.id === 'paid'
                      ? 'bg-emerald-500 text-zinc-950 font-bold shadow-sm'
                      : 'bg-white text-zinc-950 shadow-sm'
                    : pm.id === 'pay_later'
                    ? 'text-amber-400 hover:text-amber-300'
                    : pm.id === 'paid'
                    ? 'text-emerald-400 hover:text-emerald-300'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {pm.label}
              </button>
            ))}
          </div>

          {/* Table Type Filter */}
          <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
            <span className="text-[10px] text-zinc-400 font-bold px-2 uppercase font-mono">Lokasi:</span>
            {[
              { id: 'all' as const, label: 'Semua' },
              { id: 'dinein' as const, label: 'Meja Tamu' },
              { id: 'walkin' as const, label: 'Bar / Walk-in' },
            ].map((tt) => (
              <button
                key={tt.id}
                type="button"
                onClick={() => setTableTypeFilter(tt.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  tableTypeFilter === tt.id
                    ? 'bg-white text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tt.label}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="ml-auto flex items-center gap-1.5 text-zinc-400">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'highest')}
              className="bg-zinc-900 border border-zinc-750 text-zinc-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="newest">Terbaru Dahulu</option>
              <option value="oldest">Terlama Dahulu</option>
              <option value="highest">Nominal Tertinggi</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TRANSACTION LIST VIEW */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <div className="font-bold text-white text-sm">Tidak ada transaksi yang cocok</div>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              {searchQuery
                ? `Tidak ditemukan transaksi dengan kata kunci "${searchQuery}". Silakan sesuaikan pencarian atau filter Anda.`
                : 'Belum ada transaksi pada kategori ini.'}
            </p>
            {(searchQuery || statusFilter !== 'all' || paymentFilter !== 'all' || tableTypeFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setPaymentFilter('all');
                  setTableTypeFilter('all');
                }}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Reset Semua Filter
              </button>
            )}
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isExpanded = expandedOrders.has(order.id || order.orderNumber);
            const totalItemCount = order.items.reduce((acc, i) => acc + (i.quantity || 1), 0);
            const isWalkIn = order.tableNumber === 'BAR' || /bar|kasir|walk-in/i.test(order.tableNumber);

            return (
              <div
                key={order.id || order.orderNumber}
                className="bg-zinc-950 border border-zinc-800/90 hover:border-zinc-700/80 rounded-3xl p-4 sm:p-5 shadow-xl transition-all space-y-3 group"
              >
                {/* Transaction Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-850">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-amber-400 flex-shrink-0 group-hover:border-amber-500/40 transition-colors">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-white font-mono tracking-tight">
                          #{order.orderNumber}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase font-mono tracking-wider ${
                            isWalkIn
                              ? 'bg-amber-400 text-zinc-950 font-bold'
                              : 'bg-zinc-850 border border-zinc-700 text-white'
                          }`}
                        >
                          {isWalkIn ? 'WALK-IN BAR' : `MEJA #${order.tableNumber}`}
                        </span>
                        {getStatusBadge(order.status)}
                        {isOrderPayLater(order) ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono bg-amber-400/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>Bayar Nanti</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Lunas</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{order.createdAt} WIB</span>
                        </span>
                        <span>·</span>
                        <span className="text-zinc-300 font-medium">Metode: {order.paymentMethod}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Total Price & Quick Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-zinc-400 font-mono">Total Tagihan</div>
                      <div className="text-base sm:text-lg font-black text-white font-mono">
                        Rp {order.totalAmount.toLocaleString('id-ID')}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Reprint / Print Receipt Button */}
                      <button
                        type="button"
                        onClick={() => onPrintReceipt(order)}
                        className="px-3 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                        title="Buka & Cetak Struk Transaksi Resmi"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Cetak Struk</span>
                      </button>

                      {/* Expand / Collapse Details Button */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(order.id || order.orderNumber)}
                        className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                        title={isExpanded ? 'Ciutkan rincian' : 'Lihat rincian menu'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Items Summary Preview (Always visible condensed) */}
                <div className="flex flex-wrap items-center justify-between text-xs text-zinc-400 gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-zinc-300">{totalItemCount} Menu:</span>
                    <span className="text-zinc-400 line-clamp-1">
                      {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleExpand(order.id || order.orderNumber)}
                    className="text-amber-400 hover:text-amber-300 text-xs font-semibold cursor-pointer underline decoration-dotted"
                  >
                    {isExpanded ? 'Sembunyikan Menu' : 'Rincian Menu Lengkap ›'}
                  </button>
                </div>

                {/* Expanded Detailed Items Breakdown */}
                {isExpanded && (
                  <div className="pt-3 border-t border-dashed border-zinc-800 space-y-2.5 animate-in fade-in duration-200">
                    <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider font-bold">
                      Rincian Racikan Pesanan:
                    </div>

                    <div className="bg-zinc-900/70 rounded-2xl p-3 border border-zinc-800/80 divide-y divide-zinc-800/60">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="py-2 first:pt-0 last:pb-0 flex items-start justify-between text-xs">
                          <div className="space-y-0.5">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-amber-300 font-mono text-[11px]">
                                {item.quantity}x
                              </span>
                              <span>{item.name}</span>
                            </div>
                            {item.notes && (
                              <div className="text-[11px] text-zinc-400 pl-6 italic">
                                "{item.notes}"
                              </div>
                            )}
                          </div>
                          <div className="font-mono text-zinc-300 font-semibold pl-3">
                            Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Transaction Metadata & Status Management */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-zinc-400 font-mono">
                      <div>
                        ID Sistem: <span className="text-zinc-300">{order.id || order.orderNumber}</span>
                      </div>

                      {/* Barista status update shortcuts if needed */}
                      {onUpdateStatus && order.status !== 'completed' && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-500 font-sans">Ubah Status:</span>
                          {order.status === 'received' && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(order.id, 'preparing')}
                              className="px-2.5 py-1 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-200 font-sans font-semibold border border-blue-700/80 cursor-pointer"
                            >
                              Mulai Racik
                            </button>
                          )}
                          {order.status === 'preparing' && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(order.id, 'serving')}
                              className="px-2.5 py-1 rounded-lg bg-amber-900/60 hover:bg-amber-800 text-amber-200 font-sans font-semibold border border-amber-700/80 cursor-pointer"
                            >
                              Pesanan Siap
                            </button>
                          )}
                          {order.status === 'serving' && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(order.id, 'completed')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 font-sans font-semibold border border-emerald-700/80 cursor-pointer"
                            >
                              Tandai Selesai & Lunas
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
