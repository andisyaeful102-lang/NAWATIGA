import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.tsx';
import { AdminChat } from './components/AdminChat.tsx';
import { MenuCatalog } from './components/MenuCatalog.tsx';
import { OrderStatusView, PlacedOrder } from './components/OrderStatusView.tsx';
import { BaristaKDSView } from './components/BaristaKDSView.tsx';
import { ItemCustomizerModal, CartItem } from './components/ItemCustomizerModal.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { CustomerPickupAlertModal, PickupAlertOrder } from './components/CustomerPickupAlertModal.tsx';
import { MobileBottomNav } from './components/MobileBottomNav.tsx';
import { MenuItem, MENU_ITEMS } from './data/menu.ts';
import { ItemAvailabilityInfo } from './components/MenuCatalog.tsx';
import { MessageSquare, BellRing } from 'lucide-react';
import { playOrderSuccessSound, playCustomerPickupPager, triggerDeviceVibration } from './utils/audio.ts';
import { NawatigaLogo } from './components/NawatigaLogo.tsx';
import { ThankYouView } from './components/ThankYouView.tsx';

export default function App() {
  // Top-Level Route Mode: 'customer' (pelanggan pesan di meja) vs 'barista' (dashboard barista & pemilik kafe)
  const [routeMode, setRouteMode] = useState<'customer' | 'barista'>('customer');
  const [baristaDefaultTab, setBaristaDefaultTab] = useState<'orders' | 'stand'>('orders');
  const [currentTab, setCurrentTab] = useState<'chat' | 'menu' | 'orders'>('menu');
  const [tableNumber, setTableNumber] = useState<string>('04');
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MENU_ITEMS);
  const [menuAvailability, setMenuAvailability] = useState<Record<string, ItemAvailabilityInfo>>({});

  // Status kunjungan selesai: jika true, sembunyikan beranda menu dan tampilkan ucapan terima kasih
  const [hasFinishedVisit, setHasFinishedVisit] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('nawatiga_visit_finished') === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  // Customer Modal states
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState<boolean>(false);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Customer Digital Pager / Pick-up Alert Modal State
  const [pickupAlertOrder, setPickupAlertOrder] = useState<PickupAlertOrder | null>(null);
  const [isPickupAlertOpen, setIsPickupAlertOpen] = useState<boolean>(false);
  const alertedOrdersRef = useRef<Set<string>>(new Set());

  // Customer Cart & Orders state (tersimpan aman di localStorage agar bill / struk tidak hilang saat refresh)
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [placedOrders, setPlacedOrders] = useState<PlacedOrder[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('nawatiga_customer_placed_orders');
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return [];
  });

  // Simpan setiap perubahan placedOrders ke localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nawatiga_customer_placed_orders', JSON.stringify(placedOrders));
      } catch {
        // ignore
      }
    }
  }, [placedOrders]);

  // Jika belum ada pesanan yang dibuat, pastikan konsumen selalu berada di Menu Digital
  useEffect(() => {
    if (currentTab === 'orders' && placedOrders.length === 0) {
      setCurrentTab('menu');
    }
  }, [currentTab, placedOrders.length]);

  // Parse route and table parameter from URL (Nomor meja terkunci otomatis sesuai barcode meja yang di-scan)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const path = window.location.pathname.toLowerCase();
      const tableFromUrl = params.get('table') || params.get('meja');
      const modeFromUrl = params.get('mode') || params.get('tab');

      if (tableFromUrl) {
        const cleanTable = tableFromUrl.padStart(2, '0');
        setTableNumber(cleanTable);
        try {
          localStorage.setItem('nawatiga_active_scanned_table', cleanTable);
          localStorage.removeItem('nawatiga_visit_finished');
        } catch {
          // ignore
        }
        // Konsumen memindai barcode meja fisik: buka langsung sesi menu baru
        setHasFinishedVisit(false);
        setCurrentTab('menu');
      } else {
        // Jika dibuka tanpa parameter ?table=XX, gunakan meja yang sebelumnya di-scan
        try {
          const savedTable = localStorage.getItem('nawatiga_active_scanned_table');
          if (savedTable) {
            setTableNumber(savedTable);
          }
        } catch {
          // ignore
        }
      }

      // Barista & Pemilik Kafe disatukan dalam satu portal terpadu:
      // Baik /barista maupun /admin sama-sama membuka Dashboard Barista & Pemilik Kafe
      if (path.includes('barista') || path.includes('kds') || modeFromUrl === 'barista' || params.has('barista')) {
        setRouteMode('barista');
        setBaristaDefaultTab('orders');
      } else if (path.includes('admin') || path.includes('stand') || path.includes('qr') || modeFromUrl === 'stand' || modeFromUrl === 'admin') {
        setRouteMode('barista');
        setBaristaDefaultTab('stand');
      } else {
        setRouteMode('customer');
      }
    }
  }, []);

  // Ambil daftar nomor pesanan yang dipesan oleh HP/perangkat ini
  const getMyOrderNumbers = (): string[] => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('nawatiga_my_order_numbers') || '[]');
    } catch {
      return [];
    }
  };

  // Poll orders & menu availability for customer pickup notifications
  useEffect(() => {
    if (routeMode !== 'customer') return;

    let isMounted = true;

    const checkCustomerOrderStatuses = async () => {
      try {
        const [ordersRes, availRes, menuRes] = await Promise.all([
          fetch('/api/barista/orders').catch(() => null),
          fetch('/api/menu/availability').catch(() => null),
          fetch('/api/menu').catch(() => null),
        ]);

        if (!isMounted) return;

        if (ordersRes && ordersRes.ok && ordersRes.headers.get('content-type')?.includes('application/json')) {
          try {
            const data = await ordersRes.json();
            const serverOrders = data.orders || [];

            // Check if any order belonging to current table is ready for pickup ('serving')
            for (const ord of serverOrders) {
              if (ord.tableNumber === tableNumber && ord.status === 'serving') {
                if (!alertedOrdersRef.current.has(ord.orderNumber)) {
                  alertedOrdersRef.current.add(ord.orderNumber);
                  setPickupAlertOrder({
                    id: ord.id || ord.orderNumber,
                    orderNumber: ord.orderNumber,
                    tableNumber: ord.tableNumber,
                    items: ord.items,
                    createdAt: ord.createdAt,
                  });
                  setIsPickupAlertOpen(true);
                }
              }
            }

            // Sync local customer placedOrders with server status & recover any orders from server for this table
            setPlacedOrders((prev) => {
              const orderMap = new Map<string, PlacedOrder>();
              // Keep existing local orders
              prev.forEach((po) => orderMap.set(po.orderNumber, po));

              const myOrders = getMyOrderNumbers();

              // Find server orders for this table
              const currentTableOrders = serverOrders.filter(
                (so: { tableNumber: string }) => so.tableNumber === tableNumber
              );

              currentTableOrders.forEach((so: any) => {
                const isArchived = Boolean(so.archived);
                if (isArchived) {
                  // Jika meja sudah dikosongkan/dibersihkan oleh kasir, buang tiket dari HP
                  orderMap.delete(so.orderNumber);
                  return;
                }

                const existing = orderMap.get(so.orderNumber);
                if (existing) {
                  orderMap.set(so.orderNumber, {
                    ...existing,
                    status: so.status || existing.status,
                    paymentStatus: so.paymentStatus || existing.paymentStatus,
                    paymentMethod: so.paymentMethod || existing.paymentMethod,
                  });
                } else {
                  // Cek apakah HP ini yang memesan ATAU apakah pesanan lama dari tamu sebelumnya yang sudah selesai & lunas
                  const isMine = myOrders.includes(so.orderNumber);
                  const isFinished = so.status === 'completed' && so.paymentStatus === 'paid';

                  // JIKA SUDAH SELESAI & LUNAS TAPI BUKAN DIPESAN OLEH HP INI:
                  // Berarti tamu sebelumnya sudah pulang! Meja otomatis bersih untuk tamu baru!
                  if (isFinished && !isMine) {
                    return;
                  }

                  // Reconstruct order from server so customer never loses their bill/receipt on refresh!
                  orderMap.set(so.orderNumber, {
                    id: so.id || so.orderNumber,
                    orderNumber: so.orderNumber,
                    tableNumber: so.tableNumber,
                    items: (so.items || []).map((it: any, idx: number) => ({
                      cartId: `${so.orderNumber}-it-${idx}`,
                      menuItem: {
                        id: it.id || `item-${idx}`,
                        name: it.name,
                        price: it.price || 0,
                        category: it.category || 'Coffee',
                        imageUrl: it.imageUrl || '',
                        description: it.description || '',
                      },
                      quantity: it.quantity || 1,
                      sugarLevel: it.sugarLevel,
                      milkType: it.milkType,
                      iceLevel: it.iceLevel,
                      notes: it.notes,
                      itemTotalPrice: (it.price || 0) * (it.quantity || 1),
                    })),
                    totalAmount: so.totalAmount,
                    paymentMethod: so.paymentMethod,
                    paymentStatus: so.paymentStatus,
                    status: so.status || 'received',
                    createdAt: so.createdAt || 'Hari Ini',
                  });
                }
              });

              return Array.from(orderMap.values());
            });
          } catch {
            // Silently ignore
          }
        }

        if (availRes && availRes.ok && availRes.headers.get('content-type')?.includes('application/json')) {
          try {
            const availData = await availRes.json();
            setMenuAvailability(availData.availability || {});
          } catch {
            // Silently ignore
          }
        }

        if (menuRes && menuRes.ok && menuRes.headers.get('content-type')?.includes('application/json')) {
          try {
            const menuData = await menuRes.json();
            if (menuData.items && Array.isArray(menuData.items)) {
              setMenuItems(menuData.items);
            }
          } catch {
            // Silently ignore
          }
        }
      } catch {
        // Silently ignore
      }
    };

    checkCustomerOrderStatuses();
    const interval = setInterval(checkCustomerOrderStatuses, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [routeMode, tableNumber]);

  // Customer Cart Handlers
  const handleSelectItem = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setIsCustomizerOpen(true);
  };

  const handleAddToCart = (newItem: CartItem) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.cartId === newItem.cartId);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += newItem.quantity;
        updated[existingIndex].itemTotalPrice += newItem.itemTotalPrice;
        return updated;
      }
      return [...prev, newItem];
    });
  };

  const handleRemoveFromCart = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.cartId !== cartItemId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleOrderSuccess = (order: {
    id?: string;
    orderNumber: string;
    tableNumber: string;
    items: CartItem[];
    totalAmount: number;
    paymentMethod: string;
  }) => {
    const placedOrder: PlacedOrder = {
      ...order,
      status: 'received',
      createdAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    // Catat nomor pesanan ke memori HP agar dikenali sebagai pesanan tamu ini
    const myOrders = getMyOrderNumbers();
    try {
      localStorage.setItem('nawatiga_my_order_numbers', JSON.stringify([...new Set([...myOrders, order.orderNumber])]));
      localStorage.removeItem('nawatiga_visit_finished');
    } catch {
      // ignore
    }

    setHasFinishedVisit(false);
    setPlacedOrders((prev) => [placedOrder, ...prev.filter((p) => p.orderNumber !== placedOrder.orderNumber)]);
    playOrderSuccessSound();
    setCurrentTab('orders');
  };

  const handleLeaveTable = () => {
    try {
      localStorage.removeItem('nawatiga_customer_placed_orders');
      localStorage.removeItem('nawatiga_my_order_numbers');
      localStorage.setItem('nawatiga_visit_finished', 'true');
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/');
      }
    } catch {
      // ignore
    }
    setPlacedOrders([]);
    setCartItems([]);
    setHasFinishedVisit(true);
  };

  const handleConfirmPickedUp = async (orderId: string) => {
    // 1. Notify backend order status PATCH to completed
    try {
      await fetch(`/api/barista/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
    } catch {
      // ignore
    }

    // 2. Mark local placed order as completed
    setPlacedOrders((prev) =>
      prev.map((o) => (o.id === orderId || o.orderNumber === orderId ? { ...o, status: 'completed' } : o))
    );

    // 3. Immediately silence any active buzzer and close modal
    setIsPickupAlertOpen(false);
    setPickupAlertOrder(null);
  };

  // Active serving order that has not been picked up yet for current table
  const activeServingOrder = placedOrders.find(
    (o) => o.tableNumber === tableNumber && o.status === 'serving'
  );

  // Background audio buzzer loop: if customer closed the modal but has not clicked Ambil Pesanan yet
  useEffect(() => {
    if (routeMode !== 'customer') return;
    if (!activeServingOrder) return;
    if (isPickupAlertOpen) return; // CustomerPickupAlertModal already handles the sound loop when open

    // Repeat chime and vibration every 3.5 seconds until confirmed
    const bgTimer = setInterval(() => {
      playCustomerPickupPager();
      triggerDeviceVibration();
    }, 3500);

    return () => clearInterval(bgTimer);
  }, [routeMode, activeServingOrder, isPickupAlertOpen]);

  const handleSimulatePickupAlert = (order: PlacedOrder) => {
    setPickupAlertOrder({
      id: order.id || order.orderNumber,
      orderNumber: order.orderNumber,
      tableNumber: order.tableNumber,
      items: order.items.map((i) => ({
        name: i.menuItem?.name || 'Menu Kopi / Makanan',
        quantity: i.quantity,
        notes: [i.sugarLevel, i.milkType?.label, i.iceLevel, i.notes].filter(Boolean).join(', '),
      })),
      createdAt: order.createdAt,
    });
    setIsPickupAlertOpen(true);
  };

  // ============================================================================
  // UNIFIED PORTAL: BARISTA & PEMILIK KAFE (ADMIN / KDS / POS)
  // ============================================================================
  if (routeMode === 'barista') {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col">
        <BaristaKDSView
          onMenuUpdated={setMenuItems}
          defaultSubTab={baristaDefaultTab}
          onBackToMenu={() => {
            setRouteMode('customer');
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/');
            }
          }}
        />
      </div>
    );
  }

  // ============================================================================
  // SEPARATE VIEW 2: 100% PURE CUSTOMER WEB ORDERING EXPERIENCE
  // ============================================================================
  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalCartPrice = cartItems.reduce((acc, item) => acc + item.itemTotalPrice, 0);

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col text-zinc-100 selection:bg-zinc-800 selection:text-white">
      {/* Customer Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        tableNumber={tableNumber}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        activeOrderCount={placedOrders.length}
        isVisitFinished={hasFinishedVisit}
      />

      {/* Persistent Buzzer Banner if order is ready but customer has not clicked take order yet */}
      {!hasFinishedVisit && activeServingOrder && !isPickupAlertOpen && (
        <div className="bg-gradient-to-r from-emerald-600 via-zinc-950 to-emerald-600 text-white p-3 border-b-2 border-emerald-400 sticky top-14 z-20 shadow-2xl flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-400 text-zinc-950 flex items-center justify-center font-black flex-shrink-0 animate-bounce">
              <BellRing className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-white flex items-center gap-2">
                <span>🚨 PESANAN MEJA #{activeServingOrder.tableNumber} SUDAH SIAP DI BAR!</span>
                <span className="bg-emerald-400 text-zinc-950 px-2 py-0.5 rounded-full font-mono text-[10px] font-black">
                  #{activeServingOrder.orderNumber}
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/90 truncate">
                Buzzer berdering terus berulang sampai Anda klik Ambil Pesanan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => handleConfirmPickedUp(activeServingOrder.id || activeServingOrder.orderNumber)}
              className="px-3.5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 text-xs font-black shadow-lg transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
            >
              Ambil Pesanan
            </button>
            <button
              type="button"
              onClick={() => setIsPickupAlertOpen(true)}
              className="px-2.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-bold border border-zinc-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              Buka Layar
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 pb-28 sm:pb-12">
        {hasFinishedVisit ? (
          <ThankYouView
            tableNumber={tableNumber}
          />
        ) : (
          <>
            {currentTab === 'menu' && (
              <MenuCatalog
                onSelectItem={handleSelectItem}
                tableNumber={tableNumber}
                availabilityMap={menuAvailability}
                items={menuItems}
              />
            )}

            {currentTab === 'orders' && (
              <OrderStatusView
                orders={placedOrders}
                onOpenMenu={() => setCurrentTab('menu')}
                onSimulatePickupAlert={handleSimulatePickupAlert}
                onLeaveTable={handleLeaveTable}
              />
            )}

            {currentTab === 'chat' && (
              <AdminChat
                tableNumber={tableNumber}
                onOpenMenu={() => setCurrentTab('menu')}
                onSelectItem={handleSelectItem}
              />
            )}
          </>
        )}
      </main>

      {/* Sticky Bottom Floating Bar when in Menu tab and Cart has items */}
      {!hasFinishedVisit && currentTab === 'menu' && totalCartCount > 0 && (
        <div className="fixed bottom-20 sm:bottom-4 left-4 right-4 max-w-md mx-auto z-40 animate-in slide-in-from-bottom duration-200">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full py-3.5 px-5 rounded-2xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold shadow-2xl flex items-center justify-between transition-transform active:scale-98 border border-zinc-300 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white flex items-center justify-center font-black text-xs">
                {totalCartCount}
              </div>
              <div className="text-left">
                <div className="text-xs font-black tracking-wide">Checkout Meja #{tableNumber}</div>
                <div className="text-[11px] text-zinc-600 font-medium">Ketuk untuk kirim pesanan</div>
              </div>
            </div>
            <div className="text-right font-mono font-black text-sm">
              Rp {totalCartPrice.toLocaleString('id-ID')}
            </div>
          </button>
        </div>
      )}

      {/* Floating Ask ADMIN trigger when browsing Menu */}
      {!hasFinishedVisit && currentTab === 'menu' && totalCartCount === 0 && (
        <div className="fixed bottom-20 sm:bottom-4 right-4 z-40 animate-in fade-in duration-300">
          <button
            type="button"
            onClick={() => setCurrentTab('chat')}
            className="px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white shadow-2xl flex items-center gap-2 sm:gap-2.5 text-xs font-bold border border-zinc-700 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-zinc-800 border border-zinc-600 flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </div>
            <span>Tanya ADMIN</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </button>
        </div>
      )}

      {/* Clean Cafe Footer (Purely Informational for Customers, Zero Staff Controls) */}
      <footer className="border-t border-zinc-900 bg-[#09090b] text-zinc-400 py-6 sm:py-8 px-4 text-center text-xs mt-auto">
        <div className="max-w-4xl mx-auto space-y-2.5">
          <div className="flex items-center justify-center gap-2.5 font-serif-cafe font-extrabold text-sm text-zinc-200 tracking-wider">
            <NawatigaLogo variant="dark" size="xs" />
            <span>NAWATIGA</span>
            <span className="text-[11px] font-sans text-amber-300 font-semibold italic">by Rose Garden Coffee</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Sistem Pemesanan Mandiri Barcode & Pick-Up Bar (Tanpa Waiter) · Asisten Virtual ADMIN (Google Gemini AI)
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-[10px] sm:text-[11px] pt-1 text-zinc-500 font-mono">
            <span>Meja Aktif: #{tableNumber}</span>
            <span>·</span>
            <span>Self-Service & Digital Pager</span>
            <span>·</span>
            <span>15:00 - 24:00 WIB</span>
          </div>
        </div>
      </footer>

      {/* Customer Mobile Bottom Navigation Bar (Menu, Pesanan, Tanya AI) */}
      {!hasFinishedVisit && (
        <MobileBottomNav
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          activeOrderCount={placedOrders.length}
        />
      )}

      {/* Customer Pickup Alert Modal (Digital Pager Popup on customer's phone) */}
      <CustomerPickupAlertModal
        order={pickupAlertOrder}
        isOpen={isPickupAlertOpen}
        onConfirmPickedUp={handleConfirmPickedUp}
        onDismiss={() => setIsPickupAlertOpen(false)}
      />

      {/* Customer Modals & Drawers */}
      <ItemCustomizerModal
        item={selectedMenuItem}
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        onAddToCart={handleAddToCart}
        tableNumber={tableNumber}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        tableNumber={tableNumber}
        availabilityMap={menuAvailability}
        onOrderSuccess={handleOrderSuccess}
      />
    </div>
  );
}
