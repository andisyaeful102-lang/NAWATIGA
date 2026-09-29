import React, { useState, useEffect, useMemo } from 'react';
import { NawatigaLogo } from './NawatigaLogo.tsx';
import { BaristaLoginView, StaffSession } from './BaristaLoginView.tsx';
import { TransactionHistoryView } from './TransactionHistoryView.tsx';
import {
  Coffee,
  Printer,
  Bell,
  CheckCircle2,
  Clock,
  ChefHat,
  AlertTriangle,
  RefreshCw,
  Volume2,
  Sparkles,
  Check,
  X,
  Package,
  Layers,
  Search,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Plus,
  Edit3,
  Trash2,
  Flame,
  Star,
  Zap,
  User,
  Lock,
  Receipt,
  QrCode,
  SlidersHorizontal,
  Percent,
  Settings,
  Banknote,
  Coins,
} from 'lucide-react';
import {
  playAdminChime,
  playWaiterBell,
  playCashierOrderAlert,
  playCashierVoiceAlert,
  speakIndonesianOrderNotification,
  playPaymentSuccessAnnouncement,
  stopSpeaking,
  sendBrowserNotification,
  triggerDeviceVibration,
} from '../utils/audio.ts';
import { MENU_ITEMS, CATEGORIES, MenuItem, MASTER_CATEGORIES, MasterCategoryId, getMasterCategory, getCategoryBadgeLabel } from '../data/menu.ts';
import { ItemAvailabilityInfo } from './MenuCatalog.tsx';
import { MenuEditorModal } from './MenuEditorModal.tsx';
import { ReceiptModal } from './ReceiptModal.tsx';
import { BaristaOrderAlertModal } from './BaristaOrderAlertModal.tsx';
import { DirectBarOrderModal } from './DirectBarOrderModal.tsx';
import { CafeSettingsView } from './CafeSettingsView.tsx';
import { PaymentSettlementModal } from './PaymentSettlementModal.tsx';
import { BellRing, VolumeX } from 'lucide-react';

export interface BaristaOrder {
  id: string;
  orderNumber: string;
  tableNumber: string;
  items: Array<{ name: string; quantity: number; notes?: string; price: number }>;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus?: 'paid' | 'unpaid' | 'pay_later';
  status: 'received' | 'preparing' | 'serving' | 'completed';
  createdAt: string;
}

export const isOrderPayLater = (order: BaristaOrder): boolean => {
  return (
    order.paymentStatus === 'pay_later' ||
    order.paymentStatus === 'unpaid' ||
    /nanti|kasir|open bill/i.test(order.paymentMethod || '')
  );
};

export interface WaiterCallItem {
  id: string;
  tableNumber: string;
  reason: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

interface BaristaKDSViewProps {
  onMenuUpdated?: (items: MenuItem[]) => void;
  onBackToMenu?: () => void;
}

export const BaristaKDSView: React.FC<BaristaKDSViewProps> = ({ onMenuUpdated, onBackToMenu }) => {
  // Staff Authentication State
  const [staffSession, setStaffSession] = useState<StaffSession | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('nawatiga_staff_session');
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return null;
  });

  const handleStaffLogout = () => {
    try {
      localStorage.removeItem('nawatiga_staff_session');
    } catch {
      // ignore
    }
    setStaffSession(null);
    showToast('Terminal POS & KDS berhasil dikunci. Mesin aman dari sabotase!');
  };

  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'stock' | 'history' | 'settings'>('orders');
  const [orders, setOrders] = useState<BaristaOrder[]>([]);
  const [calls, setCalls] = useState<WaiterCallItem[]>([]);
  const [menuList, setMenuList] = useState<MenuItem[]>(MENU_ITEMS);
  const [menuAvailability, setMenuAvailability] = useState<Record<string, ItemAvailabilityInfo>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [printedOrder, setPrintedOrder] = useState<BaristaOrder | null>(null);
  const [alertOrder, setAlertOrder] = useState<BaristaOrder | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [snoozeUntil, setSnoozeUntil] = useState<number>(0);
  const [lastOrderCount, setLastOrderCount] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const knownOrderIdsRef = React.useRef<Set<string>>(new Set());
  const hasInitializedRef = React.useRef<boolean>(false);
  const [browserNotifStatus, setBrowserNotifStatus] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  // Modal editor states (Add new or Edit existing menu)
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isDirectBarModalOpen, setIsDirectBarModalOpen] = useState<boolean>(false);

  // Stock & menu management controls
  const [stockSearchQuery, setStockSearchQuery] = useState<string>('');
  const [stockMasterCategory, setStockMasterCategory] = useState<MasterCategoryId>('all');
  const [stockSelectedCategory, setStockSelectedCategory] = useState<string>('all');
  const [stockFilterState, setStockFilterState] = useState<'all' | 'ready' | 'soldout'>('all');
  const [orderQueueMasterCategory, setOrderQueueMasterCategory] = useState<MasterCategoryId>('all');
  const [orderQueuePaymentFilter, setOrderQueuePaymentFilter] = useState<'all' | 'pay_later' | 'paid'>('all');
  const [settlementOrder, setSettlementOrder] = useState<BaristaOrder | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const fetchOrdersCallsAndAvailability = async () => {
    try {
      const [ordersRes, callsRes, menuRes, availRes] = await Promise.all([
        fetch('/api/barista/orders').catch(() => null),
        fetch('/api/barista/calls').catch(() => null),
        fetch('/api/menu').catch(() => null),
        fetch('/api/menu/availability').catch(() => null),
      ]);

      if (ordersRes && ordersRes.ok && ordersRes.headers.get('content-type')?.includes('application/json')) {
        try {
          const ordersData = await ordersRes.json();
          const incomingOrders: BaristaOrder[] = ordersData.orders || [];
          setOrders(incomingOrders);

          // Check if there is a new received order
          if (hasInitializedRef.current) {
            const newReceived = incomingOrders.find(
              (o) => o.status === 'received' && !knownOrderIdsRef.current.has(o.id || o.orderNumber)
            );
            if (newReceived) {
              if (soundEnabled) {
                playCashierVoiceAlert(newReceived.tableNumber, false);
              }
              sendBrowserNotification(`☕ Pesanan Baru Masuk! Meja #${newReceived.tableNumber}`, {
                body: `Order #${newReceived.orderNumber}: ${newReceived.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}`,
              });
              setAlertOrder(newReceived);
              showToast(`🚨 Ada Pesanan Baru dari Meja #${newReceived.tableNumber}!`);
            }
          } else {
            hasInitializedRef.current = true;
          }

          // Register all current orders into known set
          incomingOrders.forEach((o) => knownOrderIdsRef.current.add(o.id || o.orderNumber));
          setLastOrderCount(incomingOrders.length);
        } catch {
          // ignore transient json error
        }
      }

      if (callsRes && callsRes.ok && callsRes.headers.get('content-type')?.includes('application/json')) {
        try {
          const callsData = await callsRes.json();
          setCalls(callsData.calls || []);
        } catch {
          // ignore
        }
      }

      if (menuRes && menuRes.ok && menuRes.headers.get('content-type')?.includes('application/json')) {
        try {
          const menuData = await menuRes.json();
          if (Array.isArray(menuData.menu) && menuData.menu.length > 0) {
            setMenuList(menuData.menu);
            onMenuUpdated?.(menuData.menu);
          }
        } catch {
          // ignore
        }
      }

      if (availRes && availRes.ok && availRes.headers.get('content-type')?.includes('application/json')) {
        try {
          const availData = await availRes.json();
          setMenuAvailability(availData.availability || {});
        } catch {
          // ignore
        }
      }
    } catch {
      // quiet
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersCallsAndAvailability();
    const interval = setInterval(fetchOrdersCallsAndAvailability, 3000);
    return () => clearInterval(interval);
  }, [soundEnabled]);

  // CONTINUOUS ALARM LOOP:
  // Bunyikan terus jika ada pesanan berstatus 'received' sebelum barista menekan 'Mulai Meracik'
  const pendingReceivedOrders = orders.filter((o) => o.status === 'received');

  useEffect(() => {
    if (!soundEnabled) return;
    if (pendingReceivedOrders.length === 0) {
      stopSpeaking();
      return;
    }

    // Interval to re-ring and speak voice callout every 6 seconds until acknowledged
    const loopTimer = setInterval(() => {
      if (Date.now() < snoozeUntil) return;
      // If modal is not currently open, announce the first pending table
      if (!alertOrder && pendingReceivedOrders.length > 0) {
        const target = pendingReceivedOrders[0];
        playCashierVoiceAlert(target.tableNumber, true);
      }
    }, 6000);

    return () => {
      clearInterval(loopTimer);
    };
  }, [soundEnabled, pendingReceivedOrders.length, snoozeUntil, Boolean(alertOrder)]);

  const handleUpdateStatus = async (orderId: string, newStatus: BaristaOrder['status']) => {
    try {
      const res = await fetch(`/api/barista/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId || o.orderNumber === orderId ? { ...o, status: newStatus } : o))
        );
        // If barista starts preparing, immediately stop any sound & voice utterance
        if (newStatus === 'preparing') {
          stopSpeaking();
          showToast('✅ Barista mulai meracik pesanan. Alarm dihentikan.');
        }
        if (newStatus === 'serving') {
          playWaiterBell();
        }
        if (newStatus === 'completed') {
          const ord = orders.find((o) => o.id === orderId || o.orderNumber === orderId);
          if (ord) {
            if (isOrderPayLater(ord)) {
              playWaiterBell();
              showToast(`🍽️ Pesanan Meja #${ord.tableNumber} telah diambil tamu. Tiket tetap aktif di layar menunggu pelunasan kasir!`);
            } else {
              playPaymentSuccessAnnouncement(ord.tableNumber, ord.totalAmount, ord.paymentMethod);
              showToast(`💰 Pembayaran Lunas: Rp ${ord.totalAmount.toLocaleString('id-ID')} (Meja #${ord.tableNumber})`);
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolveCall = async (callId: string) => {
    try {
      await fetch(`/api/barista/calls/${callId}/resolve`, { method: 'PATCH' });
      setCalls((prev) => prev.map((c) => (c.id === callId ? { ...c, status: 'resolved' } : c)));
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle order payment status between Paid <-> Bayar Nanti (Open Bill)
  const handleTogglePayLater = async (order: BaristaOrder) => {
    const currentlyPayLater = isOrderPayLater(order);
    const targetStatus: 'paid' | 'pay_later' = currentlyPayLater ? 'paid' : 'pay_later';
    const targetMethod = currentlyPayLater ? 'QRIS' : 'Bayar Nanti (Open Bill)';

    try {
      const res = await fetch(`/api/barista/orders/${order.id || order.orderNumber}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus: targetStatus,
          paymentMethod: targetMethod,
        }),
      });

      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id || o.orderNumber === order.orderNumber
              ? { ...o, paymentStatus: targetStatus, paymentMethod: targetMethod }
              : o
          )
        );
        playAdminChime();
        showToast(
          targetStatus === 'pay_later'
            ? `⏱ Meja #${order.tableNumber} ditandai BAYAR NANTI (Open Bill). Tagihan dapat dilunasi saat tamu pulang!`
            : `✓ Meja #${order.tableNumber} ditandai SUDAH LUNAS!`
        );
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal mengubah status pembayaran');
    }
  };

  // Settle Pay Later bill with customer's chosen payment method (Cash/QRIS/Debit)
  const handleSettlePayment = async (orderId: string, paymentMethod: string, _amountReceived?: number) => {
    try {
      const res = await fetch(`/api/barista/orders/${orderId}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus: 'paid',
          paymentMethod,
        }),
      });

      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId || o.orderNumber === orderId
              ? { ...o, paymentStatus: 'paid', paymentMethod }
              : o
          )
        );
        showToast(`💰 Tagihan ${orderId} berhasil dilunasi via ${paymentMethod}!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle single item availability (Ready <-> Sold Out)
  const handleToggleAvailability = async (item: MenuItem, currentIsAvailable: boolean) => {
    const targetStatus = !currentIsAvailable;
    try {
      const res = await fetch(`/api/barista/menu/${item.id}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAvailable: targetStatus,
          soldOutReason: targetStatus ? undefined : 'Habis Terjual (Sold Out)',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMenuAvailability((prev) => ({
          ...prev,
          [item.id]: data.availability,
        }));
        setMenuList((prev) =>
          prev.map((m) => (m.id === item.id ? { ...m, isAvailable: targetStatus } : m))
        );
        playAdminChime();
        showToast(
          targetStatus
            ? `🟢 "${item.name}" kini TERSEDIA / READY!`
            : `🔴 "${item.name}" kini DITANDAI HABIS / SOLD OUT!`
        );
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal mengubah status ketersediaan menu');
    }
  };

  // Delete a menu item
  const handleDeleteItem = async (item: MenuItem) => {
    const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus menu "${item.name}" dari katalog NAWATIGA?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/barista/menu/${item.id}`, { method: 'DELETE' });
      if (res.ok) {
        setMenuList((prev) => prev.filter((m) => m.id !== item.id));
        showToast(`🗑️ Menu "${item.name}" berhasil dihapus.`);
        playAdminChime();
        fetchOrdersCallsAndAvailability();
      } else {
        showToast('Gagal menghapus menu dari server');
      }
    } catch (err) {
      console.error(err);
      showToast('Kendala jaringan saat menghapus menu');
    }
  };

  // Reset all menu items to ready (opening shift utility)
  const handleResetAllToReady = async () => {
    if (!window.confirm('Setel ulang semua menu menjadi READY / TERSEDIA?')) return;
    try {
      for (const item of menuList) {
        await fetch(`/api/barista/menu/${item.id}/availability`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isAvailable: true }),
        });
      }
      await fetchOrdersCallsAndAvailability();
      playAdminChime();
      showToast('✅ Seluruh menu berhasil disetel READY / TERSEDIA!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveMenuSuccess = (savedItem: MenuItem, isNew: boolean) => {
    showToast(
      isNew
        ? `🎉 Menu baru "${savedItem.name}" berhasil ditambahkan!`
        : `✏️ Perubahan menu "${savedItem.name}" berhasil disimpan!`
    );
    fetchOrdersCallsAndAvailability();
  };

  // An order stays active if it's not completed OR if it's completed but still unpaid!
  const activeOrders = orders.filter((o) => o.status !== 'completed' || isOrderPayLater(o));
  const openBillUnpaidOrders = orders.filter(isOrderPayLater);
  const totalUnpaidAmount = openBillUnpaidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const pendingCalls = calls.filter((c) => c.status === 'pending');

  // Compute item availability stats based on live map or item property
  const isItemAvailable = (item: MenuItem): boolean => {
    if (menuAvailability[item.id] !== undefined) {
      return menuAvailability[item.id].isAvailable;
    }
    return item.isAvailable ?? true;
  };

  let totalReadyCount = 0;
  let totalSoldOutCount = 0;
  menuList.forEach((i) => {
    if (isItemAvailable(i)) totalReadyCount++;
    else totalSoldOutCount++;
  });

  const stockCategoryCounts = useMemo(() => {
    let coffee = 0;
    let nonCoffee = 0;
    let food = 0;
    menuList.forEach((item) => {
      const m = getMasterCategory(item.category);
      if (m === 'coffee') coffee++;
      else if (m === 'non-coffee') nonCoffee++;
      else if (m === 'food') food++;
    });
    return {
      all: menuList.length,
      coffee,
      'non-coffee': nonCoffee,
      food,
    };
  }, [menuList]);

  // Filter menu items for Stock/Menu Management Tab
  const stockFilteredItems = menuList.filter((item) => {
    const itemMaster = getMasterCategory(item.category);
    const matchesMaster = stockMasterCategory === 'all' || itemMaster === stockMasterCategory;
    const matchesSub = stockSelectedCategory === 'all' || item.category === stockSelectedCategory;
    const matchesCategory = matchesMaster && matchesSub;
    const matchesSearch =
      !stockSearchQuery.trim() ||
      item.name.toLowerCase().includes(stockSearchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(stockSearchQuery.toLowerCase()) ||
      (item.tags || []).some((t) => t.toLowerCase().includes(stockSearchQuery.toLowerCase()));

    const ready = isItemAvailable(item);
    const matchesStatus =
      stockFilterState === 'all' ||
      (stockFilterState === 'ready' && ready) ||
      (stockFilterState === 'soldout' && !ready);

    return matchesCategory && matchesSearch && matchesStatus;
  });

  const getCategoryForOrderItem = (itemName: string): { label: string; icon: string; master: 'coffee' | 'non-coffee' | 'food' } => {
    const match = menuList.find((m) => m.name.toLowerCase() === itemName.toLowerCase());
    if (match) {
      return getCategoryBadgeLabel(match.category);
    }
    const lower = itemName.toLowerCase();
    if (
      lower.includes('latte') ||
      lower.includes('espresso') ||
      lower.includes('kopi') ||
      lower.includes('coffee') ||
      lower.includes('cappuccino') ||
      lower.includes('americano') ||
      lower.includes('macchiato')
    ) {
      return { label: 'Coffee', icon: '☕', master: 'coffee' };
    }
    if (
      lower.includes('matcha') ||
      lower.includes('tea') ||
      lower.includes('teh') ||
      lower.includes('chocolate') ||
      lower.includes('cokelat')
    ) {
      return { label: 'Non-Coffee', icon: '🍵', master: 'non-coffee' };
    }
    return { label: 'Makanan', icon: '🍽️', master: 'food' };
  };

  const filteredActiveOrders = useMemo(() => {
    return activeOrders.filter((ord) => {
      const matchCat =
        orderQueueMasterCategory === 'all' ||
        ord.items.some((item) => getCategoryForOrderItem(item.name).master === orderQueueMasterCategory);

      const payLater = isOrderPayLater(ord);
      const matchPay =
        orderQueuePaymentFilter === 'all' ||
        (orderQueuePaymentFilter === 'pay_later' && payLater) ||
        (orderQueuePaymentFilter === 'paid' && !payLater);

      return matchCat && matchPay;
    });
  }, [activeOrders, orderQueueMasterCategory, orderQueuePaymentFilter, menuList]);

  // Login Gate: If no staff is logged in, show aesthetic BaristaLoginView
  if (!staffSession) {
    return (
      <BaristaLoginView
        onLoginSuccess={(session) => {
          setStaffSession(session);
          showToast('Kunci Terminal Berhasil Dibuka. Selamat bekerja, Admin!');
        }}
        onBackToMenu={onBackToMenu || (() => {})}
      />
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
          <div className="bg-zinc-900 border border-zinc-700 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2.5 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Barista Header Banner */}
      <div className="bg-zinc-950 text-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-inner flex items-center justify-center flex-shrink-0 group hover:border-amber-500/50 transition-colors">
              <NawatigaLogo variant="dark" size="md" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono">
                  Dashboard Kasir & Barista Station (KDS)
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif-cafe text-white flex flex-wrap items-center gap-2">
                <span>NAWATIGA</span>
                <span className="text-xs font-sans text-amber-300 font-semibold italic">by Rose Garden Coffee</span>
              </h2>

              {/* Active Logged-in Staff Badge */}
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 font-medium">
                  <User className="w-3 h-3 text-amber-400" />
                  <span>Akses: <strong>Admin NAWATIGA</strong></span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-[11px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Mesin Transaksi Aktif</span>
                </span>
                <button
                  type="button"
                  onClick={handleStaffLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 hover:border-rose-500 text-rose-300 hover:text-white text-[11px] font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                  title="Kunci terminal POS/KDS agar tidak disabotase saat meninggalkan meja bar"
                >
                  <Lock className="w-3 h-3 text-rose-400" />
                  <span>Kunci Terminal Bar</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Input Pesanan Langsung di Bar / Kasir (Walk-in & Takeaway) */}
            <button
              type="button"
              onClick={() => setIsDirectBarModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-amber-500/25 transition-transform active:scale-95 cursor-pointer"
              title="Input pesanan langsung walk-in di bar / meja kasir"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>+ Pesanan di Bar / Kasir</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setIsEditorOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-black flex items-center gap-1.5 shadow-lg transition-transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Menu Baru</span>
            </button>

            {/* Quick Button to QRIS & Tax Settings */}
            <button
              type="button"
              onClick={() => setActiveSubTab('settings')}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-750 text-zinc-200 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
              title="Ubah QRIS Pembayaran, Pajak Restoran (PB1) & Biaya Layanan"
            >
              <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
              <span>Pengaturan QRIS & Pajak</span>
            </button>

            {/* Test Cashier Order Chime & Alert Modal */}
            <button
              type="button"
              onClick={() => {
                playCashierVoiceAlert('01', false);
                const sampleOrFirst = orders.find((o) => o.status === 'received') || {
                  id: 'demo-alert',
                  orderNumber: 'NWT-9921',
                  tableNumber: '01',
                  items: [
                    { name: 'Signature Palm Sugar Latte', quantity: 2, price: 38000, notes: 'Less Sugar, Oat Milk' },
                    { name: 'Truffle Parmesan Fries', quantity: 1, price: 35000, notes: 'Saus aioli dipisah' },
                  ],
                  totalAmount: 111000,
                  paymentMethod: 'QRIS',
                  status: 'received' as const,
                  createdAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                };
                setAlertOrder(sampleOrFirst);
                showToast('🔔 Tes Alarm Suara: "Ada pesanan baru dari meja satu!" diputar!');
              }}
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-amber-500/50 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Tes Bunyi Suara Meja & Alarm Kasir"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span className="hidden sm:inline">Tes Alarm Suara</span>
            </button>

            {/* Sound Toggle Button */}
            <button
              type="button"
              onClick={() => {
                const nextState = !soundEnabled;
                setSoundEnabled(nextState);
                if (nextState) {
                  playCashierOrderAlert();
                  showToast('🔔 Notifikasi Suara Kasir DIAKTIFKAN');
                } else {
                  showToast('🔕 Notifikasi Suara Kasir DIMATIKAN');
                }
              }}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300 shadow-sm'
                  : 'bg-zinc-900/40 border-zinc-800 text-zinc-500'
              }`}
              title="Aktif/Matikan alarm suara pesanan baru"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span className="hidden md:inline">Suara: AKTIF</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Suara: MUTE</span>
                </>
              )}
            </button>

            {/* Desktop Notification Request Button (if not granted) */}
            {browserNotifStatus !== 'granted' && browserNotifStatus !== 'unsupported' && (
              <button
                type="button"
                onClick={async () => {
                  if (typeof window !== 'undefined' && 'Notification' in window) {
                    const res = await Notification.requestPermission();
                    setBrowserNotifStatus(res);
                    if (res === 'granted') {
                      sendBrowserNotification('✅ Notifikasi Desktop Kasir Aktif!', {
                        body: 'Barista/Kasir akan otomatis mendapat pop-up saat pesanan baru masuk.',
                      });
                      showToast('✅ Izin notifikasi browser/desktop berhasil diaktifkan!');
                    }
                  }
                }}
                className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Aktifkan notifikasi browser/desktop"
              >
                <span>🌐 Notif Desktop</span>
              </button>
            )}

            <button
              type="button"
              onClick={fetchOrdersCallsAndAvailability}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white transition-colors cursor-pointer"
              title="Refresh data bar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub Navigation: Antrean vs Kelola Menu & Stok */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-850">
          <button
            type="button"
            onClick={() => setActiveSubTab('orders')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'orders'
                ? 'bg-white text-zinc-950 shadow-lg'
                : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Antrean Pesanan Bar</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${
                activeSubTab === 'orders' ? 'bg-zinc-950 text-white' : 'bg-zinc-800 text-zinc-300'
              }`}
            >
              {activeOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('stock')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'stock'
                ? 'bg-white text-zinc-950 shadow-lg'
                : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Kelola Menu & Stok Kasir ({menuList.length} Menu)</span>
            {totalSoldOutCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black font-mono">
                {totalSoldOutCount} Habis
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'history'
                ? 'bg-white text-zinc-950 shadow-lg'
                : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Riwayat Transaksi Kasir</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${
                activeSubTab === 'history' ? 'bg-zinc-950 text-white' : 'bg-zinc-800 text-zinc-300'
              }`}
            >
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('settings')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'settings'
                ? 'bg-white text-zinc-950 shadow-lg'
                : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            <span>Pengaturan QRIS & Pajak PB1</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: ANTREAN PESANAN KDS */}
      {/* ========================================================================= */}
      {activeSubTab === 'orders' && (
        <div className="space-y-6">
          {/* Urgent Received Orders Notification Banner */}
          {pendingReceivedOrders.length > 0 && (
            <div className="bg-gradient-to-r from-amber-950 via-zinc-900 to-amber-950 p-4 rounded-2xl border-2 border-amber-500/90 shadow-xl flex flex-wrap items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
                  <BellRing className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="text-xs font-black text-white flex flex-wrap items-center gap-2">
                    <span>🚨 ALARM AKTIF: {pendingReceivedOrders.length} PESANAN BARU MENUNGGU DIRACIK!</span>
                    <span className="px-2 py-0.5 rounded-full bg-white text-zinc-950 text-[10px] font-black font-mono">
                      {pendingReceivedOrders
                        .map((o) => (o.tableNumber === 'BAR' || /bar|kasir/i.test(o.tableNumber) ? 'Bar/Kasir' : `Meja #${o.tableNumber}`))
                        .join(', ')}
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-200/90 mt-0.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    <span>Alarm suara & panggilan meja berbunyi terus sampai tombol "Mulai Meracik" ditekan.</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Direct quick action: Mulai Racik oldest order */}
                <button
                  type="button"
                  onClick={() => {
                    const firstReceived = pendingReceivedOrders[0];
                    if (firstReceived) {
                      handleUpdateStatus(firstReceived.id, 'preparing');
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-black flex items-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Mulai Racik{' '}
                    {pendingReceivedOrders[0]?.tableNumber === 'BAR' || /bar|kasir/i.test(pendingReceivedOrders[0]?.tableNumber || '')
                      ? 'Bar/Kasir'
                      : `Meja #${pendingReceivedOrders[0]?.tableNumber}`}
                  </span>
                </button>

                {/* Snooze 1 minute button */}
                <button
                  type="button"
                  onClick={() => {
                    setSnoozeUntil(Date.now() + 60000);
                    stopSpeaking();
                    showToast('🔕 Alarm di-jeda selama 1 menit.');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
                  title="Jeda alarm selama 60 detik"
                >
                  <span>🔕 Jeda 1 Menit</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const firstReceived = pendingReceivedOrders[0];
                    if (firstReceived) {
                      setAlertOrder(firstReceived);
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  Buka Notifikasi
                </button>
              </div>
            </div>
          )}
          {/* Pending Waiter Calls Alert Bar (if any) */}
          {pendingCalls.length > 0 && (
            <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-700 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Bell className="w-4 h-4 text-amber-400 animate-bounce" />
                  <span>{pendingCalls.length} Meja Memanggil Staf / Barista:</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {pendingCalls.map((call) => (
                  <div
                    key={call.id}
                    className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 shadow-sm flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">Meja #{call.tableNumber}</div>
                      <div className="text-[11px] text-zinc-400 truncate max-w-[160px]">{call.reason}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{call.createdAt}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleResolveCall(call.id)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-[11px] font-bold whitespace-nowrap shadow-sm transition-colors cursor-pointer"
                    >
                      Sudah Dihampiri
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Walk-in Bar Order Creation Card */}
          <div className="bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-950 p-4 rounded-2xl border border-amber-500/40 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20 flex-shrink-0">
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white">
                    Pemesanan Langsung di Bar & Kasir Counter
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold font-mono">
                    Walk-in & Takeaway
                  </span>
                </div>
                <div className="text-[11px] text-zinc-300 mt-0.5">
                  Input pesanan tamu yang datang langsung ke meja kasir/bar (Dine-in Bar atau Bawa Pulang / Takeaway).
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsDirectBarModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>+ Buat Pesanan di Bar / Kasir</span>
              </button>
            </div>
          </div>

          {/* Open Bill / Belum Bayar Sticky Tracker Banner */}
          {openBillUnpaidOrders.length > 0 && (
            <div className="bg-gradient-to-r from-amber-950/80 via-zinc-900 to-amber-950/80 p-4 rounded-3xl border-2 border-amber-500/80 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-400 text-zinc-950 flex items-center justify-center font-black shadow-lg shadow-amber-400/20 flex-shrink-0">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wider font-mono">
                      ⚠️ KASIR ALERT: {openBillUnpaidOrders.length} MEJA BELUM BAYAR (OPEN BILL)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-zinc-950 text-[10px] font-mono font-black">
                      Total: Rp {totalUnpaidAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Pesanan tetap tampil di layar barista & tidak akan hilang meski makanan sudah diambil, sampai tamu melunasi tagihan di kasir.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {openBillUnpaidOrders.map((ord) => (
                  <button
                    key={ord.id || ord.orderNumber}
                    type="button"
                    onClick={() => setSettlementOrder(ord)}
                    className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black flex items-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>
                      {ord.tableNumber === 'BAR' ? 'Bar/Kasir' : `Meja #${ord.tableNumber}`}: Rp {ord.totalAmount.toLocaleString('id-ID')} (Lunasi)
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* KDS Live Kanban Grid */}
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-white" />
                <h3 className="font-bold text-base text-white">Daftar Tiket Antrean Bar ({filteredActiveOrders.length})</h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Master Category Filter for Queue */}
                <div className="flex items-center gap-1.5 p-1 bg-zinc-900/90 rounded-2xl border border-zinc-800 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setOrderQueueMasterCategory('all')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      orderQueueMasterCategory === 'all'
                        ? 'bg-white text-zinc-950 font-black shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    ⭐ Semua ({activeOrders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderQueueMasterCategory('coffee')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                      orderQueueMasterCategory === 'coffee'
                        ? 'bg-amber-400 text-zinc-950 font-black shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>☕</span>
                    <span>Kopi</span>
                    <span className="text-[10px] font-mono px-1 rounded-full bg-zinc-800 text-zinc-300">
                      {activeOrders.filter((o) => o.items.some((i) => getCategoryForOrderItem(i.name).master === 'coffee')).length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderQueueMasterCategory('non-coffee')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                      orderQueueMasterCategory === 'non-coffee'
                        ? 'bg-emerald-400 text-zinc-950 font-black shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>🍵</span>
                    <span>Non-Kopi</span>
                    <span className="text-[10px] font-mono px-1 rounded-full bg-zinc-800 text-zinc-300">
                      {activeOrders.filter((o) => o.items.some((i) => getCategoryForOrderItem(i.name).master === 'non-coffee')).length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderQueueMasterCategory('food')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                      orderQueueMasterCategory === 'food'
                        ? 'bg-rose-400 text-zinc-950 font-black shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>🍽️</span>
                    <span>Makanan</span>
                    <span className="text-[10px] font-mono px-1 rounded-full bg-zinc-800 text-zinc-300">
                      {activeOrders.filter((o) => o.items.some((i) => getCategoryForOrderItem(i.name).master === 'food')).length}
                    </span>
                  </button>
                </div>

                {/* Bayar Nanti vs Lunas Filter */}
                <div className="flex items-center gap-1 p-1 bg-zinc-900/90 rounded-2xl border border-zinc-800 text-xs overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setOrderQueuePaymentFilter('all')}
                    className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                      orderQueuePaymentFilter === 'all'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderQueuePaymentFilter('pay_later')}
                    className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      orderQueuePaymentFilter === 'pay_later'
                        ? 'bg-amber-400 text-zinc-950 font-black shadow-md'
                        : 'text-amber-400 hover:text-amber-300 font-semibold'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Bayar Nanti ({activeOrders.filter(isOrderPayLater).length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderQueuePaymentFilter('paid')}
                    className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      orderQueuePaymentFilter === 'paid'
                        ? 'bg-emerald-500 text-zinc-950 font-black shadow-md'
                        : 'text-emerald-400 hover:text-emerald-300 font-semibold'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Lunas ({activeOrders.filter((o) => !isOrderPayLater(o)).length})</span>
                  </button>
                </div>
              </div>
            </div>

            {filteredActiveOrders.length === 0 ? (
              <div className="text-center py-16 bg-zinc-900/60 rounded-3xl border border-zinc-800 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-zinc-800 text-emerald-400 border border-zinc-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-sm text-white">
                  {orderQueueMasterCategory === 'all'
                    ? 'Semua Pesanan Bar Selesai Diracik!'
                    : `Tidak ada antrean berstatus aktif untuk kategori ${orderQueueMasterCategory === 'coffee' ? 'Coffee' : orderQueueMasterCategory === 'non-coffee' ? 'Non-Coffee' : 'Makanan'}`}
                </h4>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  {orderQueueMasterCategory !== 'all' ? (
                    <button
                      type="button"
                      onClick={() => setOrderQueueMasterCategory('all')}
                      className="text-amber-400 underline font-bold"
                    >
                      Klik untuk melihat semua antrean ({activeOrders.length})
                    </button>
                  ) : (
                    'Belum ada pesanan aktif baru. Begitu pelanggan memilih menu dan klik kirim pesanan dari meja, kartu tiket akan langsung muncul di layar ini.'
                  )}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredActiveOrders.map((order) => {
                  const isReceived = order.status === 'received';
                  const isPreparing = order.status === 'preparing';
                  const isServing = order.status === 'serving';
                  const isCompletedUnpaid = order.status === 'completed' && isOrderPayLater(order);

                  return (
                    <div
                      key={order.id || order.orderNumber}
                      className={`bg-zinc-900 rounded-3xl border shadow-xl overflow-hidden flex flex-col justify-between transition-all ${
                        isReceived
                          ? 'border-white ring-1 ring-white/20'
                          : isPreparing
                          ? 'border-zinc-500'
                          : isServing
                          ? 'border-emerald-500'
                          : isCompletedUnpaid
                          ? 'border-amber-400 ring-2 ring-amber-400/50 bg-zinc-900/90 shadow-amber-500/20'
                          : 'border-zinc-800'
                      }`}
                    >
                      {/* Card Header */}
                      <div
                        className={`p-4 flex items-center justify-between text-white ${
                          isReceived
                            ? 'bg-zinc-950 border-b border-zinc-800'
                            : isPreparing
                            ? 'bg-zinc-950/80 border-b border-zinc-800'
                            : isServing
                            ? 'bg-zinc-950 border-b border-emerald-900'
                            : isCompletedUnpaid
                            ? 'bg-gradient-to-r from-amber-950 via-zinc-950 to-amber-950 border-b border-amber-600/60'
                            : 'bg-zinc-950 border-b border-zinc-800'
                        }`}
                      >
                        <div>
                          <div className="text-[10px] uppercase tracking-wider font-semibold opacity-70 font-mono">
                            {order.orderNumber} · {order.createdAt}
                          </div>
                          <div className="text-xl font-extrabold font-serif-cafe">
                            {order.tableNumber === 'BAR' || /bar|kasir/i.test(order.tableNumber) ? (
                              <span className="text-amber-300 flex items-center gap-1.5">
                                <span>☕</span> Bar / Kasir
                              </span>
                            ) : (
                              <span>Meja #{order.tableNumber}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPrintedOrder(order)}
                            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                            title="Cetak Tiket Bar Thermal"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              isReceived
                                ? 'bg-white text-zinc-950 border-white'
                                : isPreparing
                                ? 'bg-amber-950 text-amber-300 border-amber-800'
                                : isServing
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : isCompletedUnpaid
                                ? 'bg-amber-400 text-zinc-950 border-amber-400 font-black animate-pulse'
                                : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                            }`}
                          >
                            {isReceived
                              ? 'Baru Masuk'
                              : isPreparing
                              ? 'Sedang Diracik'
                              : isServing
                              ? 'Siap di Bar'
                              : isCompletedUnpaid
                              ? '🍽️ SUDAH DIAMBIL (BELUM LUNAS)'
                              : 'Selesai'}
                          </span>
                        </div>
                      </div>

                      {/* Item list */}
                      <div className="p-4 space-y-2 flex-1">
                        {order.items.map((item, idx) => {
                          const itemCat = getCategoryForOrderItem(item.name);
                          return (
                            <div
                              key={idx}
                              className="p-2.5 bg-zinc-950/80 rounded-2xl border border-zinc-800/80 space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-xs font-bold text-white">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold flex-shrink-0 flex items-center gap-0.5 ${
                                      itemCat.master === 'coffee'
                                        ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                                        : itemCat.master === 'non-coffee'
                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                                        : 'bg-rose-950 text-rose-300 border border-rose-800/60'
                                    }`}
                                  >
                                    <span>{itemCat.icon}</span>
                                    <span>{itemCat.master === 'coffee' ? 'Kopi' : itemCat.master === 'non-coffee' ? 'Non-Kopi' : 'Makanan'}</span>
                                  </span>
                                  <span className="truncate">
                                    {item.quantity}x {item.name}
                                  </span>
                                </div>
                                <span className="font-mono text-zinc-400 flex-shrink-0 ml-1">
                                  Rp {item.price.toLocaleString('id-ID')}
                                </span>
                              </div>
                              {item.notes && (
                                <div className="text-[11px] text-zinc-300 bg-zinc-900 p-1.5 rounded-lg border border-zinc-800 italic">
                                  📝 {item.notes}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Payment Status & Bayar Nanti Action Bar */}
                      <div className="px-4 py-2.5 bg-zinc-950 border-t border-zinc-850">
                        {isOrderPayLater(order) ? (
                          <div className="p-2.5 rounded-2xl bg-amber-950/40 border border-amber-500/50 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                                <Clock className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                                <span>BAYAR NANTI (OPEN BILL)</span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-zinc-950 text-[10px] font-black uppercase font-mono">
                                Belum Lunas
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-900/40">
                              <span className="text-zinc-400">Total Tagihan:</span>
                              <span className="text-sm font-black font-mono text-amber-300">
                                Rp {order.totalAmount.toLocaleString('id-ID')}
                              </span>
                            </div>

                            {/* Settlement Action Button */}
                            <div className="flex items-center gap-2 pt-0.5">
                              <button
                                type="button"
                                onClick={() => setSettlementOrder(order)}
                                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 transition-transform active:scale-95 cursor-pointer"
                              >
                                <Banknote className="w-4 h-4" />
                                <span>Lunasi Tagihan (Rp {order.totalAmount.toLocaleString('id-ID')})</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-2xl bg-emerald-950/30 border border-emerald-900/60 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[150px]">LUNAS ({order.paymentMethod || 'QRIS'})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-white font-bold">
                                Rp {order.totalAmount.toLocaleString('id-ID')}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleTogglePayLater(order)}
                                className="text-[10px] px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Ubah ke Bayar Nanti jika konsumen minta bayar saat pulang"
                              >
                                <Clock className="w-3 h-3 text-amber-400" />
                                <span>Bayar Nanti</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Footer / Action Buttons */}
                      <div className="p-4 bg-zinc-950 border-t border-zinc-850 space-y-2">
                        {isReceived && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(order.id, 'preparing')}
                            className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                          >
                            <Clock className="w-4 h-4" />
                            <span>Mulai Racik (Matikan Alarm Meja #{order.tableNumber})</span>
                          </button>
                        )}

                        {isPreparing && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(order.id, 'serving')}
                            className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-lg transition-all active:scale-95 cursor-pointer"
                          >
                            <Bell className="w-4 h-4" />
                            <span>PESANAN SIAP & DERINGKAN PAGER HP! 🔔</span>
                          </button>
                        )}

                        {isServing && (
                          <div className="space-y-2">
                            {isOrderPayLater(order) ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSettlementOrder(order)}
                                  className="py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                                  title="Konsumen membayar saat mengambil makanan di bar"
                                >
                                  <Banknote className="w-4 h-4" />
                                  <span>Lunasi Sekarang (Rp {order.totalAmount.toLocaleString('id-ID')})</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(order.id, 'completed')}
                                  className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                  title="Tamu membawa makanan ke meja, tiket tetap aktif di layar sampai dilunasi"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>Tamu Ambil Dulu (Bayar Nanti)</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(order.id, 'completed')}
                                className="w-full py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Check className="w-4 h-4" />
                                <span>Tamu Sudah Mengambil di Bar (Selesai & Lunas)</span>
                              </button>
                            )}
                          </div>
                        )}

                        {isCompletedUnpaid && (
                          <div className="space-y-2">
                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-center">
                              <span className="text-xs text-amber-300 font-bold flex items-center justify-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 animate-bounce" />
                                <span>Makanan sudah diambil tamu. Tiket standby menunggu pelunasan kasir.</span>
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSettlementOrder(order)}
                              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-zinc-950 text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 transition-all active:scale-95 cursor-pointer"
                            >
                              <Banknote className="w-4 h-4" />
                              <span>LUNASI TAGIHAN KASIR (Rp {order.totalAmount.toLocaleString('id-ID')})</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: KELOLA MENU & STOK KASIR / BARISTA */}
      {/* ========================================================================= */}
      {activeSubTab === 'stock' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Status summary banner with Quick Action */}
          <div className="p-4 sm:p-5 rounded-3xl bg-zinc-900 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-zinc-300" />
                <span>Panel Pengelolaan Menu, Harga, & Ketersediaan Stok</span>
              </h3>
              <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
                Tambahkan menu baru, ubah harga/deskripsi, atau tandai bahan yang habis. Perubahan langsung tersinkronisasi ke seluruh HP konsumen.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setIsEditorOpen(true);
                }}
                className="px-4 py-2 rounded-2xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-black flex items-center gap-1.5 shadow-xl transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Menu Baru</span>
              </button>

              <div className="px-3.5 py-2 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-zinc-300 font-medium">Ready:</span>
                <strong className="text-white font-mono">{totalReadyCount}</strong>
              </div>

              <div className="px-3.5 py-2 rounded-2xl bg-zinc-950 border border-red-900/60 text-xs flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-zinc-300 font-medium">Habis:</span>
                <strong className="text-red-400 font-mono">{totalSoldOutCount}</strong>
              </div>

              <button
                type="button"
                onClick={handleResetAllToReady}
                className="px-3 py-2 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-colors border border-zinc-700 cursor-pointer"
                title="Setel semua menu menjadi ready saat buka kafe"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Ready</span>
              </button>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 sm:w-80">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={stockSearchQuery}
                  onChange={(e) => setStockSearchQuery(e.target.value)}
                  placeholder="Cari nama menu, tag, atau deskripsi..."
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
                />
              </div>

              {/* Status filter: All / Ready / Sold Out */}
              <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setStockFilterState('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    stockFilterState === 'all'
                      ? 'bg-white text-zinc-950 font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Semua ({menuList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilterState('ready')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    stockFilterState === 'ready'
                      ? 'bg-emerald-500 text-zinc-950 font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Ready ({totalReadyCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilterState('soldout')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    stockFilterState === 'soldout'
                      ? 'bg-red-600 text-white font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Habis ({totalSoldOutCount})
                </button>
              </div>
            </div>

            {/* Master Category Selector for Cashier/Barista */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-zinc-900/90 rounded-2xl border border-zinc-800">
              {MASTER_CATEGORIES.map((cat) => {
                const isSelected = stockMasterCategory === cat.id;
                const count = stockCategoryCounts[cat.id];
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setStockMasterCategory(cat.id);
                      setStockSelectedCategory('all');
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white text-zinc-950 font-black shadow-md ring-2 ring-white/30'
                        : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span className="truncate">{cat.label}</span>
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

            {/* Sub-category pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
              <span className="text-[11px] font-mono text-zinc-500 whitespace-nowrap">Sub-kategori:</span>
              {CATEGORIES.map((cat) => {
                const isSelected = stockSelectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setStockSelectedCategory(cat.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-700 text-white border-zinc-500 font-bold'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stock & Menu Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {stockFilteredItems.map((item) => {
              const ready = isItemAvailable(item);
              const soldReason = menuAvailability[item.id]?.soldOutReason || item.soldOutReason || 'Habis Terjual (Sold Out)';
              const badge = getCategoryBadgeLabel(item.category);

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                    ready
                      ? 'bg-zinc-900/80 border-zinc-800'
                      : 'bg-red-950/20 border-red-900/60 ring-1 ring-red-900/30'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-950 relative flex-shrink-0 border border-zinc-800">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className={`w-full h-full object-cover ${!ready ? 'grayscale contrast-125 opacity-50' : ''}`}
                        />
                        {!ready && (
                          <div className="absolute inset-0 bg-red-950/70 flex items-center justify-center">
                            <span className="text-[9px] font-black text-red-200">HABIS</span>
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold font-mono text-amber-300 truncate flex items-center gap-1">
                            <span>{badge.icon}</span>
                            <span>{badge.label}</span>
                          </span>
                          <span className="text-xs font-mono font-bold text-white">
                            {item.formattedPrice}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-white truncate mt-0.5">
                          {item.name}
                        </h4>

                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {ready ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-950 text-red-300 border border-red-800 text-[10px] font-bold">
                              <AlertCircle className="w-3 h-3 text-red-400" />
                              Habis
                            </span>
                          )}

                          {item.isBestSeller && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-950 border border-amber-800 text-amber-300 text-[9px] font-black">
                              <Flame className="w-2.5 h-2.5 text-amber-400" />
                              Best
                            </span>
                          )}

                          {item.isSignature && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200 text-[9px] font-black">
                              <Star className="w-2.5 h-2.5 text-white" />
                              Signature
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Actions Row: Toggle Availability, Edit, and Delete */}
                  <div className="pt-3 mt-3 border-t border-zinc-800/80 flex items-center gap-2">
                    {/* Toggle Ready / Habis */}
                    <button
                      type="button"
                      onClick={() => handleToggleAvailability(item, ready)}
                      className={`flex-1 py-2 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                        ready
                          ? 'bg-zinc-850 hover:bg-red-950 hover:text-red-200 hover:border-red-800 text-zinc-300 border border-zinc-700'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black shadow-lg'
                      }`}
                    >
                      {ready ? (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                          <span>Tandai Habis</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Set Ready</span>
                        </>
                      )}
                    </button>

                    {/* Edit Menu Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(item);
                        setIsEditorOpen(true);
                      }}
                      className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Edit Nama, Harga, Foto & Resep Menu"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Edit</span>
                    </button>

                    {/* Delete Menu Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item)}
                      className="p-2 rounded-xl bg-zinc-900 hover:bg-red-950 hover:text-red-300 hover:border-red-800 text-zinc-400 border border-zinc-800 transition-colors cursor-pointer"
                      title="Hapus Menu dari Sistem"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: RIWAYAT TRANSAKSI KASIR & BARISTA */}
      {/* ========================================================================= */}
      {activeSubTab === 'history' && (
        <TransactionHistoryView
          orders={orders}
          onPrintReceipt={(ord) => setPrintedOrder(ord)}
          onRefresh={fetchOrdersCallsAndAvailability}
          staffName={staffSession?.name}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: PENGATURAN QRIS, PAJAK PB1 & BIAYA LAYANAN */}
      {/* ========================================================================= */}
      {activeSubTab === 'settings' && (
        <CafeSettingsView
          staffName={staffSession?.name}
          onSettingsSaved={() => {
            showToast('✅ Pengaturan QRIS, Pajak PB1 & Biaya Layanan berhasil disimpan!');
          }}
        />
      )}

      {/* Menu Editor Modal (Add new or Edit existing item) */}
      <MenuEditorModal
        isOpen={isEditorOpen}
        item={editingItem}
        onClose={() => setIsEditorOpen(false)}
        onSaveSuccess={handleSaveMenuSuccess}
      />

      {/* Enhanced Thermal & Digital Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(printedOrder)}
        onClose={() => setPrintedOrder(null)}
        baristaOrder={printedOrder}
        initialMode="customer"
      />

      {/* New Incoming Order Modal for Barista / Cashier */}
      <BaristaOrderAlertModal
        isOpen={Boolean(alertOrder)}
        order={alertOrder}
        onClose={() => setAlertOrder(null)}
        onStartPreparing={(orderId) => {
          handleUpdateStatus(orderId, 'preparing');
          setAlertOrder(null);
        }}
        onPrintReceipt={(ord) => {
          setAlertOrder(null);
          setPrintedOrder(ord);
        }}
      />

      {/* Direct Bar / Cashier Walk-in Order Modal */}
      <DirectBarOrderModal
        isOpen={isDirectBarModalOpen}
        onClose={() => setIsDirectBarModalOpen(false)}
        items={menuList}
        onOrderSuccess={(newOrder) => {
          setOrders((prev) => [newOrder, ...prev]);
          setPrintedOrder(newOrder);
          showToast(`✅ Pesanan Meja BAR #${newOrder.orderNumber} berhasil dibuat!`);
        }}
      />

      {/* Payment Settlement Modal for Bayar Nanti / Open Bill */}
      <PaymentSettlementModal
        isOpen={Boolean(settlementOrder)}
        onClose={() => setSettlementOrder(null)}
        order={settlementOrder}
        onPaymentSettled={async (orderId, paymentMethod, amountReceived) => {
          await handleSettlePayment(orderId, paymentMethod, amountReceived);
        }}
        onOpenReceipt={(ord) => {
          setSettlementOrder(null);
          setPrintedOrder(ord);
        }}
      />
    </div>
  );
};
