import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.tsx';
import { AdminChat } from './components/AdminChat.tsx';
import { MenuCatalog } from './components/MenuCatalog.tsx';
import { BarcodeStand } from './components/BarcodeStand.tsx';
import { OrderStatusView, PlacedOrder } from './components/OrderStatusView.tsx';
import { BaristaKDSView } from './components/BaristaKDSView.tsx';
import { ItemCustomizerModal, CartItem } from './components/ItemCustomizerModal.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { TablePickerModal } from './components/TablePickerModal.tsx';
import { CallWaiterModal } from './components/CallWaiterModal.tsx';
import { CustomerPickupAlertModal, PickupAlertOrder } from './components/CustomerPickupAlertModal.tsx';
import { MobileBottomNav } from './components/MobileBottomNav.tsx';
import { MenuItem, MENU_ITEMS } from './data/menu.ts';
import { ItemAvailabilityInfo } from './components/MenuCatalog.tsx';
import { ShoppingBag, MessageSquare, Bell, Sparkles, Smartphone, Monitor, BellRing, X, Clock } from 'lucide-react';
import { playCashierVoiceAlert, playOrderSuccessSound, playPaymentSuccessAnnouncement, stopSpeaking } from './utils/audio.ts';
import { NawatigaLogo } from './components/NawatigaLogo.tsx';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'chat' | 'menu' | 'stand' | 'orders' | 'barista'>('menu');
  const [tableNumber, setTableNumber] = useState<string>('04');
  const [mobileFrameMode, setMobileFrameMode] = useState<boolean>(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MENU_ITEMS);
  const [menuAvailability, setMenuAvailability] = useState<Record<string, ItemAvailabilityInfo>>({});

  // Modal states
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState<boolean>(false);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isTablePickerOpen, setIsTablePickerOpen] = useState<boolean>(false);
  const [isCallWaiterOpen, setIsCallWaiterOpen] = useState<boolean>(false);

  // Digital Pager / Pick-up Alert Modal State
  const [pickupAlertOrder, setPickupAlertOrder] = useState<PickupAlertOrder | null>(null);
  const [isPickupAlertOpen, setIsPickupAlertOpen] = useState<boolean>(false);
  const alertedOrdersRef = useRef<Set<string>>(new Set());

  // Barista order notification state (global alert)
  const [baristaPendingCount, setBaristaPendingCount] = useState<number>(0);
  const [globalBaristaAlert, setGlobalBaristaAlert] = useState<{
    orderNumber: string;
    tableNumber: string;
    totalAmount: number;
    itemCount: number;
  } | null>(null);
  const globalKnownOrderIdsRef = useRef<Set<string>>(new Set());
  const globalHasInitRef = useRef<boolean>(false);

  // Cart & Orders state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [placedOrders, setPlacedOrders] = useState<PlacedOrder[]>([]);

  // Parse table parameter from query string if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tableFromUrl = params.get('table');
      if (tableFromUrl) {
        const cleanTable = tableFromUrl.padStart(2, '0');
        setTableNumber(cleanTable);
      }
    }
  }, []);

  // Poll barista orders & menu availability
  useEffect(() => {
    let isMounted = true;

    const checkOrderStatusesAndAvailability = async () => {
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

            // Count received orders for Barista badge
            const receivedOrders = serverOrders.filter((o: { status: string }) => o.status === 'received');
            setBaristaPendingCount(receivedOrders.length);

            // Check if brand new received order arrived
            if (globalHasInitRef.current) {
              const newlyArrived = serverOrders.find(
                (o: { id?: string; orderNumber: string; status: string }) =>
                  o.status === 'received' && !globalKnownOrderIdsRef.current.has(o.id || o.orderNumber)
              );
              if (newlyArrived) {
                if (/qris|rekening|transfer/i.test(newlyArrived.paymentMethod || '')) {
                  playPaymentSuccessAnnouncement(newlyArrived.tableNumber, newlyArrived.totalAmount, newlyArrived.paymentMethod);
                } else {
                  playCashierVoiceAlert(newlyArrived.tableNumber, false);
                }
                setGlobalBaristaAlert({
                  orderNumber: newlyArrived.orderNumber,
                  tableNumber: newlyArrived.tableNumber,
                  totalAmount: newlyArrived.totalAmount,
                  itemCount: newlyArrived.items?.length || 0,
                });
              }
            } else {
              globalHasInitRef.current = true;
            }

            serverOrders.forEach((o: { id?: string; orderNumber: string }) =>
              globalKnownOrderIdsRef.current.add(o.id || o.orderNumber)
            );

            // Check for any order belonging to current table that is ready for pickup ('serving')
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

            // Sync local placedOrders with server status
            setPlacedOrders((prev) =>
              prev.map((po) => {
                const match = serverOrders.find(
                  (so: { orderNumber: string; status: 'received' | 'preparing' | 'serving' | 'completed' }) =>
                    so.orderNumber === po.orderNumber
                );
                if (match && match.status !== po.status) {
                  return { ...po, status: match.status };
                }
                return po;
              })
            );
          } catch {
            // Silently ignore transient JSON parse error while server boots
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
            if (Array.isArray(menuData.menu) && menuData.menu.length > 0) {
              setMenuItems(menuData.menu);
            }
          } catch {
            // Silently ignore
          }
        }
      } catch (err) {
        // Suppress repetitive polling noise during dev server reload
        if (process.env.NODE_ENV === 'development') {
          // quiet
        }
      }
    };

    checkOrderStatusesAndAvailability();
    const interval = setInterval(checkOrderStatusesAndAvailability, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [tableNumber]);

  const handleSelectItem = (item: MenuItem) => {
    const avail = menuAvailability[item.id];
    const isAvail = avail !== undefined ? avail.isAvailable : (item.isAvailable ?? true);
    setSelectedMenuItem({
      ...item,
      isAvailable: isAvail,
      soldOutReason: avail?.soldOutReason || item.soldOutReason,
    });
    setIsCustomizerOpen(true);
  };

  const handleAddToCart = (item: CartItem) => {
    setCartItems((prev) => [...prev, item]);
  };

  const handleRemoveFromCart = (cartId: string) => {
    setCartItems((prev) => prev.filter((i) => i.cartId !== cartId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleOrderSuccess = (orderData: {
    id?: string;
    orderNumber: string;
    tableNumber: string;
    items: CartItem[];
    totalAmount: number;
    paymentMethod: string;
  }) => {
    playOrderSuccessSound();
    playCashierVoiceAlert(orderData.tableNumber, false);
    const newOrder: PlacedOrder = {
      ...orderData,
      createdAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      status: 'received',
    };
    setPlacedOrders((prev) => [newOrder, ...prev]);
    setBaristaPendingCount((prev) => prev + 1);
    setGlobalBaristaAlert({
      orderNumber: newOrder.orderNumber,
      tableNumber: newOrder.tableNumber,
      totalAmount: newOrder.totalAmount,
      itemCount: newOrder.items.length,
    });
    setCurrentTab('orders');
  };

  // When customer confirms they picked up the order at the bar
  const handleConfirmPickedUp = async (orderId: string) => {
    try {
      await fetch(`/api/barista/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      setPlacedOrders((prev) =>
        prev.map((o) => (o.id === orderId || o.orderNumber === orderId ? { ...o, status: 'completed' } : o))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsPickupAlertOpen(false);
    }
  };

  // Allow manual test / preview of pickup alert from OrderStatusView
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

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalCartPrice = cartItems.reduce((acc, item) => acc + item.itemTotalPrice, 0);

  return (
    <div
      className={
        mobileFrameMode
          ? 'min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-2 sm:p-6 text-zinc-100 selection:bg-zinc-800'
          : 'min-h-screen bg-[#09090b] flex flex-col text-zinc-100 selection:bg-zinc-800 selection:text-white'
      }
    >
      <div
        className={
          mobileFrameMode
            ? 'w-full max-w-[412px] h-[870px] max-h-[96vh] bg-[#09090b] rounded-[48px] border-[10px] border-zinc-800 shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden relative ring-1 ring-zinc-700/60'
            : 'flex-1 flex flex-col min-h-screen w-full'
        }
      >
        {/* Dynamic Island on simulated phone frame */}
        {mobileFrameMode && (
          <div className="w-full bg-[#09090b] pt-2.5 pb-1 flex justify-center items-center flex-shrink-0 select-none z-30">
            <div className="w-24 h-4 bg-zinc-950 border border-zinc-800 rounded-full flex items-center justify-center gap-1.5 px-2">
              <div className="w-2 h-2 rounded-full bg-zinc-900 border border-zinc-750" />
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
            </div>
          </div>
        )}

        {/* Scrollable Container in Phone Mode */}
        <div className={`flex-1 flex flex-col ${mobileFrameMode ? 'overflow-y-auto no-scrollbar relative' : ''}`}>
          {/* Header */}
          <Header
            currentTab={currentTab}
            onSelectTab={setCurrentTab}
            tableNumber={tableNumber}
            onOpenTablePicker={() => setIsTablePickerOpen(true)}
            onOpenCallWaiter={() => setIsCallWaiterOpen(true)}
            cartCount={totalCartCount}
            onOpenCart={() => setIsCartOpen(true)}
            activeOrderCount={placedOrders.length}
            baristaPendingCount={baristaPendingCount}
            mobileFrameMode={mobileFrameMode}
            onToggleMobileFrame={() => setMobileFrameMode(!mobileFrameMode)}
          />

          {/* Global Cashier / Barista Incoming Order Alert Banner */}
          {globalBaristaAlert && currentTab !== 'barista' && (
            <div className="max-w-6xl w-full mx-auto px-3 sm:px-6 pt-3 animate-in slide-in-from-top duration-300">
              <div className="bg-gradient-to-r from-amber-950 via-zinc-900 to-amber-950 p-3 sm:p-4 rounded-2xl border-2 border-amber-500 shadow-2xl flex items-center justify-between gap-3 text-white">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-black flex-shrink-0">
                    <BellRing className="w-5 h-5 animate-bounce" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white flex items-center gap-2">
                      <span>🚨 NOTIF KASIR & BARISTA: PESANAN BARU MASUK!</span>
                      <span className="bg-white text-zinc-950 px-2 py-0.5 rounded-full font-mono text-[10px] font-black">
                        Meja #{globalBaristaAlert.tableNumber}
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-200/90 font-mono truncate mt-0.5">
                      Order #{globalBaristaAlert.orderNumber} · {globalBaristaAlert.itemCount} menu · Rp {globalBaristaAlert.totalAmount.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await fetch(`/api/barista/orders/${globalBaristaAlert.orderNumber}/status`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: 'preparing' }),
                        });
                        stopSpeaking();
                        setGlobalBaristaAlert(null);
                        setBaristaPendingCount((prev) => Math.max(0, prev - 1));
                      } catch {
                        // ignore
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-black flex items-center gap-1 transition-transform active:scale-95 shadow cursor-pointer whitespace-nowrap"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Mulai Racik (Matikan Alarm)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab('barista');
                      setGlobalBaristaAlert(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black transition-transform active:scale-95 shadow cursor-pointer whitespace-nowrap"
                  >
                    Buka KDS Barista
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopSpeaking();
                      setGlobalBaristaAlert(null);
                    }}
                    className="w-7 h-7 rounded-lg hover:bg-amber-900/60 text-amber-300 flex items-center justify-center cursor-pointer"
                    title="Tutup Notifikasi"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 pb-28 sm:pb-12">
            {currentTab === 'chat' && (
              <AdminChat
                tableNumber={tableNumber}
                onOpenMenu={() => setCurrentTab('menu')}
                onOpenCallWaiter={() => setIsCallWaiterOpen(true)}
                onSelectItem={handleSelectItem}
              />
            )}

            {currentTab === 'menu' && (
              <MenuCatalog
                onSelectItem={handleSelectItem}
                tableNumber={tableNumber}
                availabilityMap={menuAvailability}
                items={menuItems}
                mobileFrameMode={mobileFrameMode}
              />
            )}

            {currentTab === 'stand' && (
              <BarcodeStand
                tableNumber={tableNumber}
                onOpenDigitalMenu={() => setCurrentTab('menu')}
                onOpenCallWaiter={() => setIsCallWaiterOpen(true)}
                onSelectTable={setTableNumber}
              />
            )}

            {currentTab === 'orders' && (
              <OrderStatusView
                orders={placedOrders}
                onOpenMenu={() => setCurrentTab('menu')}
                onOpenCallWaiter={() => setIsCallWaiterOpen(true)}
                onSimulatePickupAlert={handleSimulatePickupAlert}
              />
            )}

            {currentTab === 'barista' && (
              <BaristaKDSView
                onMenuUpdated={setMenuItems}
                onBackToMenu={() => setCurrentTab('menu')}
              />
            )}
          </main>

          {/* Sticky Bottom Floating Bar when in Menu tab and Cart has items */}
          {currentTab === 'menu' && totalCartCount > 0 && (
            <div className={`fixed bottom-20 sm:bottom-4 left-4 right-4 ${mobileFrameMode ? 'max-w-[360px]' : 'max-w-md'} mx-auto z-40 animate-in slide-in-from-bottom duration-200`}>
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
          {currentTab === 'menu' && totalCartCount === 0 && (
            <div className={`fixed bottom-20 sm:bottom-4 right-4 z-40 animate-in fade-in duration-300`}>
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

          {/* Footer */}
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
        </div>

        {/* Mobile Bottom Navigation Bar (Docked at bottom of phone) */}
        <MobileBottomNav
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          activeOrderCount={placedOrders.length}
          baristaPendingCount={baristaPendingCount}
        />

        {/* Home bar indicator in simulated phone mode */}
        {mobileFrameMode && (
          <div className="w-28 h-1 bg-zinc-600 rounded-full mx-auto my-1.5 flex-shrink-0 select-none" />
        )}
      </div>

      {/* Customer Pickup Alert Modal (Digital Pager Popup on customer's phone) */}
      <CustomerPickupAlertModal
        order={pickupAlertOrder}
        isOpen={isPickupAlertOpen}
        onConfirmPickedUp={handleConfirmPickedUp}
        onDismiss={() => setIsPickupAlertOpen(false)}
      />

      {/* Modals & Drawers */}
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

      <TablePickerModal
        isOpen={isTablePickerOpen}
        onClose={() => setIsTablePickerOpen(false)}
        currentTable={tableNumber}
        onSelectTable={setTableNumber}
      />

      <CallWaiterModal
        isOpen={isCallWaiterOpen}
        onClose={() => setIsCallWaiterOpen(false)}
        tableNumber={tableNumber}
      />
    </div>
  );
}
