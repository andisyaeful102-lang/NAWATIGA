import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MENU_ITEMS, MenuItem } from './src/data/menu.ts';
import { CafeSettings, DEFAULT_CAFE_SETTINGS } from './src/data/settings.ts';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const apiKey = process.env.GEMINI_API_KEY;

// Server-side Gemini initialization
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const ADMIN_SYSTEM_INSTRUCTION = `Kamu adalah ADMIN, asisten virtual yang ramah, cepat, dan profesional untuk kafe NAWATIGA. Kafe ini menerapkan konsep modern "SELF-SERVICE & PICK-UP BAR" (TANPA WAITER ANTAR KE MEJA). Pemesanan dilakukan secara mandiri berbasis barcode di setiap meja pelanggan.

Tujuan Utamamu:
Membantu pelanggan mendapatkan pengalaman bersantai yang nyaman dan paham alur self-service mulai dari scan barcode, notifikasi HP pager, hingga pengambilan menu di bar.

Tugas Inti:
1. Sambutan & Edukasi Sistem Self-Service: Sambut pelanggan dengan hangat. Jelaskan bahwa kafe NAWATIGA beroperasi secara mandiri (self-service tanpa waiter):
   - Tamu scan barcode meja menggunakan kamera HP & pesan dari HP.
   - HP tamu berfungsi sebagai "Digital Pager": begitu barista selesai meracik, HP tamu otomatis berdering & bergetar.
   - Tamu langsung berjalan mengambil pesanan sendiri ke Pick-Up Counter / Barista Bar.
   - Setelah selesai, tamu mohon mengembalikan nampan & gelas ke Return Station.
2. Rekomendasi Menu: Jika pelanggan bingung atau bertanya rekomendasi, rekomendasikan menu andalan kami:
   - "Signature Palm Sugar Latte" (kopi susu aren organik creamy & wangi)
   - "Truffle Fries" (Truffle Parmesan Fries renyah beraroma truffle dengan saus garlic aioli)
   - Makanan berat: "Crispy Chicken Nanban Bowl" atau "Nasi Goreng Se'i Sapi". Non-kopi: "Artisan Kyoto Matcha Latte".
3. Menjawab Pertanyaan: Berikan informasi detail terkait menu jika ditanya:
   - Tingkat kemanisan kopi (Sugar Level): Normal (100%), Less Sugar (50%), Slight Sugar (25%), No Sugar (0%).
   - Pilihan susu nabati: Tersedia Oat Milk (Oatly) dan Soy Milk.
   - Notifikasi Pesanan: Jelaskan bahwa HP mereka akan berdering dan bergetar otomatis seperti buzzer pager kafe saat pesanan siap di bar.
4. Status Menu Ready vs Habis (Sold Out):
   - Sistem katalog NAWATIGA secara real-time menandai menu yang HABIS / SOLD OUT agar pelanggan tidak salah pesan.
   - Menu yang saat ini habis: "Crispy Chicken Nanban Bowl". JANGAN rekomendasikan menu ini!
   - Jika tamu menanyakan menu yang sedang habis, jelaskan dengan ramah: "Maaf Kak, Crispy Chicken Nanban Bowl saat ini sedang habis terjual hari ini. Kakak bisa coba Nasi Goreng Se'i Sapi atau Truffle Fries kami yang juga jadi favorit!".
5. Penanganan Kendala Barcode: Jika pelanggan mengeluh barcode tidak bisa dipindai, kamera buram, atau error:
   - Berikan tautan alternatif menu ini: [Buka Menu Web Nawatiga](https://nawatiga.cafe/order) atau arahkan mereka mengklik tab "Menu Digital" di aplikasi ini.
   - Sampaikan juga jika butuh bantuan khusus dapat langsung menghampiri barista di bar atau klik tombol bantuan bar.

Panduan Gaya Bahasa & Nada (Tone):
- Gunakan bahasa yang kasual, hangat, namun tetap sopan (selalu gunakan sapaan "Kak").
- Jawab dengan singkat dan padat (maksimal 2-3 kalimat langsung pada inti informasi).
- JANGAN PERNAH menerima pesanan secara manual melalui chat (misal: "saya mau pesan latte 1"). Tolak dengan ramah dan selalu arahkan pelanggan untuk memilih dan menyelesaikan pesanan melalui menu digital di HP agar otomatis masuk ke sistem bar.`;

// Intelligent fallback logic if API key isn't active or fails
function generateFallbackResponse(userMessage: string, tableNumber?: string): string {
  const lower = userMessage.toLowerCase();
  const tableStr = tableNumber ? ` Meja #${tableNumber}` : '';

  if (lower.includes('waiter') || lower.includes('pelayan') || lower.includes('antar') || lower.includes('siapa yang bawa') || lower.includes('diantar') || lower.includes('ambil')) {
    return `Di NAWATIGA kita menerapkan konsep Self-Service (tanpa waiter antar), Kak! Saat pesanan selesai diracik, HP Kakak akan otomatis berdering & bergetar (seperti buzzer pager kafe). Kakak tinggal jalan ke Pick-Up Bar untuk mengambil pesanan dengan menunjukkan nomor order ya! ☕🔔`;
  }

  if (lower.includes('notifikasi') || lower.includes('notif') || lower.includes('tahu') || lower.includes('tau') || lower.includes('kapan jadi') || lower.includes('selesai') || lower.includes('siap') || lower.includes('dering') || lower.includes('getar')) {
    return `Tenang saja Kak! Sistem kami menjadikan HP Kakak sebagai Digital Pager. Begitu barista menekan tombol 'Pesanan Siap', HP Kakak seketika berdering alarm pager dan bergetar, memunculkan popup nomor antrean untuk diambil di Bar! 📱✨`;
  }

  if (lower.includes('pesan') || lower.includes('order') || lower.includes('mau beli') || lower.includes('minta 1') || lower.includes('bayar')) {
    return `Halo Kak! Pesanan dibuat mandiri lewat HP ya. Kakak bisa klik tab 'Menu Digital' di atas atau scan barcode di meja Kakak${tableStr} untuk langsung memilih menu favorit dan checkout! 😊`;
  }

  if (lower.includes('habis') || lower.includes('sold out') || lower.includes('ready') || lower.includes('tersedia') || lower.includes('kosong') || lower.includes('stok') || lower.includes('nanban')) {
    return `Tenang Kak! Di aplikasi kami, menu yang stoknya habis otomatis ditandai badge 'HABIS / SOLD OUT' dan tidak bisa dipesan. Saat ini Crispy Chicken Nanban Bowl sedang habis, namun menu lainnya seperti Signature Palm Sugar Latte & Nasi Goreng Se'i Sapi 100% READY! 😊`;
  }

  if (lower.includes('rekomendasi') || lower.includes('favorite') || lower.includes('favorit') || lower.includes('enak') || lower.includes('bingung') || lower.includes('best seller')) {
    return `Menu andalan favorit kami wajib coba: Signature Palm Sugar Latte (kopi aren creamy) dan Truffle Parmesan Fries yang renyah gurih, Kak! Kalau makanan berat, Nasi Goreng Se'i Sapi Nawatiga sangat kami rekomendasikan! ✨`;
  }

  if (lower.includes('barcode') || lower.includes('qr') || lower.includes('scan') || lower.includes('rusak') || lower.includes('error') || lower.includes('gak bisa') || lower.includes('tidak bisa')) {
    return `Waduh, maaf kendalanya ya Kak! Kakak bisa langsung buka link menu alternatif di https://nawatiga.cafe/order (atau klik tab Menu Digital di layar). Kalau ada kendala fisik bisa langsung ke barista di bar ya Kak.`;
  }

  if (lower.includes('barista') && (lower.includes('tahu') || lower.includes('tau') || lower.includes('notif') || lower.includes('pesanan') || lower.includes('masuk'))) {
    return `Begitu Kakak klik 'Kirim Pesanan' dari HP, sistem otomatis membunyikan alarm lonceng di bar, memunculkan tiket digital di layar KDS Barista, dan mencetak struk order. Saat selesai, giliran HP Kakak yang berbunyi pager untuk ambil di bar! 🔔☕`;
  }

  if (lower.includes('susu') || lower.includes('oat') || lower.includes('soy') || lower.includes('nabati') || lower.includes('laktosa') || lower.includes('dairy')) {
    return `Tentu ada, Kak! Kami menyediakan opsi susu nabati Oat Milk (Oatly Barista) dan Soy Milk untuk hampir seluruh varian kopi & latte kami. Bisa dipilih langsung saat kustomisasi menu ya! 🥛🌿`;
  }

  if (lower.includes('manis') || lower.includes('gula') || lower.includes('sugar')) {
    return `Bisa banget disesuaikan, Kak! Ada pilihan Normal (100%), Less Sugar (50%), Slight Sugar (25%), hingga No Sugar (0%) saat Kakak memilih minuman di menu digital.`;
  }

  return `Halo Kak, selamat datang di NAWATIGA! Kafe kami berkonsep Self-Service: silakan order lewat HP, santai di meja, dan HP Kakak akan berdering pager otomatis saat pesanan siap diambil di Bar. Ada yang ingin ditanyakan seputar menu? 😊`;
}

// In-memory store for waiter call logs & active orders (for interactive simulation)
interface WaiterCall {
  id: string;
  tableNumber: string;
  reason: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

interface OrderRecord {
  id: string;
  orderNumber: string;
  tableNumber: string;
  items: Array<{ name: string; quantity: number; notes?: string; price: number; menuItem?: { id?: string; name?: string } }>;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus?: 'paid' | 'unpaid' | 'pay_later';
  status: 'received' | 'preparing' | 'serving' | 'completed';
  createdAt: string;
}

// Dynamic Menu Items stored in server memory (editable by Barista & Cashier)
let dynamicMenuItems: MenuItem[] = [...MENU_ITEMS];

// Menu items availability state (synced real-time across bar and customer phones)
interface ItemAvailability {
  isAvailable: boolean;
  soldOutReason?: string;
  updatedAt?: string;
}

const itemAvailabilityMap: Record<string, ItemAvailability> = {};
dynamicMenuItems.forEach((item) => {
  itemAvailabilityMap[item.id] = {
    isAvailable: item.isAvailable ?? true,
    soldOutReason: item.soldOutReason,
    updatedAt: '12:00',
  };
});

const waiterCalls: WaiterCall[] = [];

const orders: OrderRecord[] = [];

// DELETE /api/barista/orders (Barista can reset all orders)
app.delete('/api/barista/orders', (_req: Request, res: Response) => {
  orders.length = 0;
  waiterCalls.length = 0;
  res.json({ success: true, message: 'Semua antrean pesanan berhasil dibersihkan!' });
});

// POST /api/admin/chat
app.post('/api/admin/chat', async (req: Request, res: Response) => {
  try {
    const { message, history = [], tableNumber = '04' } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Pesan tidak boleh kosong' });
      return;
    }

    if (ai && apiKey) {
      try {
        const contents: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];

        // Add history if present
        for (const h of history.slice(-6)) {
          contents.push({
            role: h.role === 'model' ? 'model' : 'user',
            parts: [{ text: h.parts?.[0]?.text || '' }],
          });
        }

        // Add current user prompt with table context
        contents.push({
          role: 'user',
          parts: [{ text: `[Pelanggan saat ini berada di Meja ${tableNumber}]\n${message}` }],
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: contents,
          config: {
            systemInstruction: ADMIN_SYSTEM_INSTRUCTION,
            temperature: 0.7,
            topP: 0.9,
          },
        });

        const replyText = response.text?.trim() || generateFallbackResponse(message, tableNumber);
        res.json({ reply: replyText });
        return;
      } catch (err: unknown) {
        console.warn('Gemini API call failed, falling back to local assistant response:', err);
      }
    }

    // Fallback response
    const fallbackText = generateFallbackResponse(message, tableNumber);
    res.json({ reply: fallbackText });
  } catch (error: unknown) {
    console.error('Error handling chat request:', error);
    res.status(500).json({
      error: 'Gagal memproses pesan',
      reply: 'Halo Kak, koneksi sedang kami segarkan. Silakan gunakan link menu web atau panggil waiter kami ya!',
    });
  }
});

// POST /api/call-waiter
app.post('/api/call-waiter', (req: Request, res: Response) => {
  const { tableNumber = '04', reason = 'Bantuan Umum' } = req.body;
  const newCall: WaiterCall = {
    id: `call-${Date.now()}`,
    tableNumber,
    reason,
    status: 'pending',
    createdAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  };
  waiterCalls.unshift(newCall);
  res.json({
    success: true,
    message: `Panggilan diterima! Staf/waiter NAWATIGA sedang menuju ke Meja ${tableNumber}.`,
    call: newCall,
  });
});

// POST /api/order
app.post('/api/order', (req: Request, res: Response) => {
  const { tableNumber = '04', items = [], paymentMethod = 'QRIS', totalAmount = 0, paymentStatus } = req.body;

  // Strict validation: Reject if any item is sold out / not available
  for (const item of items) {
    const itemId = item.menuItem?.id || item.id;
    if (itemId && itemAvailabilityMap[itemId]?.isAvailable === false) {
      res.status(400).json({
        error: `Maaf Kak, menu "${item.menuItem?.name || item.name || 'Pilihan'}" sedang HABIS / TIDAK TERSEDIA. Silakan hapus menu ini dan pilih menu lain.`,
      });
      return;
    }
  }

  // Determine initial payment status:
  // If paymentMethod is 'Bayar Nanti' or 'Kasir' (without direct payment), default to 'pay_later'
  const isPayLater = paymentStatus === 'pay_later' || paymentStatus === 'unpaid' || /nanti|kasir|open bill/i.test(paymentMethod);
  const resolvedPaymentStatus: 'paid' | 'pay_later' = isPayLater ? 'pay_later' : 'paid';

  const newOrder: OrderRecord = {
    id: `ord-${Date.now()}`,
    orderNumber: `NWT-${Math.floor(1000 + Math.random() * 9000)}`,
    tableNumber,
    items,
    totalAmount,
    paymentMethod,
    paymentStatus: resolvedPaymentStatus,
    status: 'received',
    createdAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  };
  orders.unshift(newOrder);
  res.json({
    success: true,
    message: `Pesanan berhasil diterima! Barista & kitchen kami sedang menyiapkan untuk Meja ${tableNumber}.`,
    order: newOrder,
  });
});

// GET /api/menu (Used by Customer and Barista views to fetch all menu items)
app.get('/api/menu', (_req: Request, res: Response) => {
  const mergedMenu = dynamicMenuItems.map((item) => {
    const avail = itemAvailabilityMap[item.id];
    return {
      ...item,
      isAvailable: avail !== undefined ? avail.isAvailable : (item.isAvailable ?? true),
      soldOutReason: avail?.soldOutReason || item.soldOutReason,
    };
  });
  res.json({ menu: mergedMenu });
});

// GET /api/menu/availability (Used by Customer and Barista views)
app.get('/api/menu/availability', (_req: Request, res: Response) => {
  res.json({ availability: itemAvailabilityMap });
});

// POST /api/barista/menu (Barista/Cashier creates a new menu item)
app.post('/api/barista/menu', (req: Request, res: Response) => {
  const {
    name,
    category,
    price,
    description,
    imageUrl,
    tags,
    isBestSeller,
    isSignature,
    isRecommended,
    isAvailable = true,
    soldOutReason,
    customizable,
    details,
  } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Nama menu tidak boleh kosong' });
    return;
  }

  const numPrice = Number(price);
  if (isNaN(numPrice) || numPrice <= 0) {
    res.status(400).json({ error: 'Harga harus berupa angka lebih dari 0' });
    return;
  }

  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const id = `${slug || 'menu'}-${Date.now().toString().slice(-6)}`;

  const defaultPhoto = 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=800&auto=format&fit=crop';

  const newItem: MenuItem = {
    id,
    name: name.trim(),
    category: category || 'coffee-signature',
    price: numPrice,
    formattedPrice: `Rp ${numPrice.toLocaleString('id-ID')}`,
    description: description ? description.trim() : 'Sajian istimewa dari dapur & bar NAWATIGA.',
    imageUrl: imageUrl && typeof imageUrl === 'string' && (imageUrl.startsWith('http') || imageUrl.startsWith('data:image/')) ? imageUrl.trim() : defaultPhoto,
    isBestSeller: Boolean(isBestSeller),
    isSignature: Boolean(isSignature),
    isRecommended: Boolean(isRecommended),
    isAvailable: Boolean(isAvailable),
    soldOutReason: isAvailable ? undefined : (soldOutReason || 'Habis Terjual (Sold Out)'),
    tags: Array.isArray(tags) && tags.length > 0 ? tags : ['Menu Baru'],
    customizable: {
      sugarLevel: customizable?.sugarLevel ?? true,
      milkType: customizable?.milkType ?? false,
      iceLevel: customizable?.iceLevel ?? true,
      temperature: customizable?.temperature ?? false,
    },
    details: {
      composition: details?.composition || 'Bahan pilihan berkualitas dari NAWATIGA.',
      caffeineLevel: details?.caffeineLevel || 'Sedang',
      allergens: details?.allergens || [],
    },
  };

  dynamicMenuItems.push(newItem);

  itemAvailabilityMap[id] = {
    isAvailable: newItem.isAvailable ?? true,
    soldOutReason: newItem.soldOutReason,
    updatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  };

  res.status(201).json({
    success: true,
    message: `Menu "${newItem.name}" berhasil ditambahkan ke sistem!`,
    menuItem: newItem,
  });
});

// PUT /api/barista/menu/:id (Barista/Cashier updates an existing menu item)
app.put('/api/barista/menu/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = dynamicMenuItems.findIndex((m) => m.id === id);

  if (index === -1) {
    res.status(404).json({ error: 'Menu tidak ditemukan' });
    return;
  }

  const {
    name,
    category,
    price,
    description,
    imageUrl,
    tags,
    isBestSeller,
    isSignature,
    isRecommended,
    isAvailable,
    soldOutReason,
    customizable,
    details,
  } = req.body;

  const current = dynamicMenuItems[index];
  const numPrice = price !== undefined ? Number(price) : current.price;

  const updatedItem: MenuItem = {
    ...current,
    name: name !== undefined ? String(name).trim() : current.name,
    category: category !== undefined ? category : current.category,
    price: numPrice,
    formattedPrice: `Rp ${numPrice.toLocaleString('id-ID')}`,
    description: description !== undefined ? String(description).trim() : current.description,
    imageUrl: imageUrl !== undefined && typeof imageUrl === 'string' && (imageUrl.startsWith('http') || imageUrl.startsWith('data:image/')) ? imageUrl.trim() : current.imageUrl,
    tags: Array.isArray(tags) ? tags : current.tags,
    isBestSeller: isBestSeller !== undefined ? Boolean(isBestSeller) : current.isBestSeller,
    isSignature: isSignature !== undefined ? Boolean(isSignature) : current.isSignature,
    isRecommended: isRecommended !== undefined ? Boolean(isRecommended) : current.isRecommended,
    isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : (current.isAvailable ?? true),
    soldOutReason: isAvailable === false ? (soldOutReason || 'Habis Terjual (Sold Out)') : undefined,
    customizable: {
      ...current.customizable,
      ...(customizable || {}),
    },
    details: {
      ...current.details,
      ...(details || {}),
    },
  };

  dynamicMenuItems[index] = updatedItem;

  if (isAvailable !== undefined) {
    itemAvailabilityMap[id] = {
      isAvailable: Boolean(isAvailable),
      soldOutReason: isAvailable ? undefined : (soldOutReason || 'Habis Terjual (Sold Out)'),
      updatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };
  }

  res.json({
    success: true,
    message: `Menu "${updatedItem.name}" berhasil diperbarui!`,
    menuItem: updatedItem,
  });
});

// DELETE /api/barista/menu/:id (Barista/Cashier deletes a menu item)
app.delete('/api/barista/menu/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = dynamicMenuItems.findIndex((m) => m.id === id);

  if (index === -1) {
    res.status(404).json({ error: 'Menu tidak ditemukan' });
    return;
  }

  const removed = dynamicMenuItems.splice(index, 1)[0];
  delete itemAvailabilityMap[id];

  res.json({
    success: true,
    message: `Menu "${removed.name}" berhasil dihapus dari sistem!`,
    id,
  });
});

// PATCH /api/barista/menu/:id/availability (Barista switches Ready <-> Sold Out)
app.patch('/api/barista/menu/:id/availability', (req: Request, res: Response) => {
  const { id } = req.params;
  const { isAvailable, soldOutReason } = req.body;

  const availableBool = Boolean(isAvailable);
  itemAvailabilityMap[id] = {
    isAvailable: availableBool,
    soldOutReason: availableBool ? undefined : (soldOutReason || 'Habis Terjual (Sold Out)'),
    updatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  };

  res.json({
    success: true,
    itemId: id,
    availability: itemAvailabilityMap[id],
  });
});

// GET /api/orders/:id
app.get('/api/orders/:id', (req: Request, res: Response) => {
  const order = orders.find((o) => o.id === req.params.id || o.orderNumber === req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    return;
  }
  res.json({ order });
});

// GET /api/barista/orders
app.get('/api/barista/orders', (_req: Request, res: Response) => {
  res.json({ orders });
});

// PATCH /api/barista/orders/:id/status
app.patch('/api/barista/orders/:id/status', (req: Request, res: Response) => {
  const { status, paymentStatus } = req.body;
  const order = orders.find((o) => o.id === req.params.id || o.orderNumber === req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    return;
  }
  if (paymentStatus && ['paid', 'unpaid', 'pay_later'].includes(paymentStatus)) {
    order.paymentStatus = paymentStatus;
  }
  if (['received', 'preparing', 'serving', 'completed'].includes(status)) {
    order.status = status;
    res.json({ success: true, order });
    return;
  }
  res.status(400).json({ error: 'Status tidak valid' });
});

// PATCH /api/barista/orders/:id/payment (Settle Payment or Switch to Pay Later)
app.patch('/api/barista/orders/:id/payment', (req: Request, res: Response) => {
  const { paymentStatus, paymentMethod } = req.body;
  const order = orders.find((o) => o.id === req.params.id || o.orderNumber === req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    return;
  }

  if (paymentStatus && ['paid', 'unpaid', 'pay_later'].includes(paymentStatus)) {
    order.paymentStatus = paymentStatus;
  }
  if (paymentMethod && typeof paymentMethod === 'string') {
    order.paymentMethod = paymentMethod.trim();
  }

  res.json({
    success: true,
    message: order.paymentStatus === 'paid' ? 'Pembayaran berhasil dilunasi!' : 'Status diubah ke Bayar Nanti (Open Bill)',
    order,
  });
});

// GET /api/barista/calls
app.get('/api/barista/calls', (_req: Request, res: Response) => {
  res.json({ calls: waiterCalls });
});

// PATCH /api/barista/calls/:id/resolve
app.patch('/api/barista/calls/:id/resolve', (req: Request, res: Response) => {
  const call = waiterCalls.find((c) => c.id === req.params.id);
  if (!call) {
    res.status(404).json({ error: 'Panggilan tidak ditemukan' });
    return;
  }
  call.status = 'resolved';
  res.json({ success: true, call });
});

// POST /api/barista/tables/:tableNumber/reset (Kosongkan Meja / Tamu Sudah Meninggalkan Meja)
app.post('/api/barista/tables/:tableNumber/reset', (req: Request, res: Response) => {
  const { tableNumber } = req.params;
  const cleanTable = tableNumber.padStart(2, '0');

  let resetCount = 0;
  orders.forEach((o) => {
    if (o.tableNumber === cleanTable || o.tableNumber === tableNumber) {
      if (o.status === 'completed' && o.paymentStatus === 'paid') {
        (o as any).archived = true;
        resetCount++;
      }
    }
  });

  // Clear waiter calls for this table
  const callIdx = waiterCalls.findIndex((c) => c.tableNumber === cleanTable || c.tableNumber === tableNumber);
  if (callIdx !== -1) {
    waiterCalls.splice(callIdx, 1);
  }

  res.json({
    success: true,
    message: `Meja #${cleanTable} berhasil dikosongkan. Siap untuk tamu berikutnya!`,
    resetCount,
  });
});

// Cafe Settings State (QRIS payment info, Tax PB1, Service Charge, Notifications)
let currentCafeSettings: CafeSettings = { ...DEFAULT_CAFE_SETTINGS };

// GET /api/settings
app.get('/api/settings', (_req: Request, res: Response) => {
  res.json({ settings: currentCafeSettings });
});

// PATCH /api/settings
app.patch('/api/settings', (req: Request, res: Response) => {
  const { qris, taxAndService, notification } = req.body;

  if (qris) {
    currentCafeSettings.qris = {
      ...currentCafeSettings.qris,
      merchantName: typeof qris.merchantName === 'string' ? qris.merchantName.trim() : currentCafeSettings.qris.merchantName,
      nmid: typeof qris.nmid === 'string' ? qris.nmid.trim() : currentCafeSettings.qris.nmid,
      qrisImageUrl: typeof qris.qrisImageUrl === 'string' ? qris.qrisImageUrl.trim() : currentCafeSettings.qris.qrisImageUrl,
      accountInfo: typeof qris.accountInfo === 'string' ? qris.accountInfo.trim() : currentCafeSettings.qris.accountInfo,
      notes: typeof qris.notes === 'string' ? qris.notes.trim() : currentCafeSettings.qris.notes,
      isActive: qris.isActive !== undefined ? Boolean(qris.isActive) : currentCafeSettings.qris.isActive,
    };
  }

  if (taxAndService) {
    const taxNum = Number(taxAndService.taxPercent);
    const serviceNum = Number(taxAndService.servicePercent);
    const feeNum = Number(taxAndService.takeawayFee);

    currentCafeSettings.taxAndService = {
      ...currentCafeSettings.taxAndService,
      taxPercent: !isNaN(taxNum) && taxNum >= 0 ? taxNum : currentCafeSettings.taxAndService.taxPercent,
      servicePercent: !isNaN(serviceNum) && serviceNum >= 0 ? serviceNum : currentCafeSettings.taxAndService.servicePercent,
      takeawayFee: !isNaN(feeNum) && feeNum >= 0 ? feeNum : currentCafeSettings.taxAndService.takeawayFee,
      taxName: typeof taxAndService.taxName === 'string' ? taxAndService.taxName.trim() : currentCafeSettings.taxAndService.taxName,
      serviceName: typeof taxAndService.serviceName === 'string' ? taxAndService.serviceName.trim() : currentCafeSettings.taxAndService.serviceName,
    };
  }

  if (notification) {
    currentCafeSettings.notification = {
      ...currentCafeSettings.notification,
      voiceAlertEnabled: notification.voiceAlertEnabled !== undefined ? Boolean(notification.voiceAlertEnabled) : currentCafeSettings.notification.voiceAlertEnabled,
      voiceVolume: typeof notification.voiceVolume === 'number' ? notification.voiceVolume : currentCafeSettings.notification.voiceVolume,
      vibrationEnabled: notification.vibrationEnabled !== undefined ? Boolean(notification.vibrationEnabled) : currentCafeSettings.notification.vibrationEnabled,
    };
  }

  res.json({
    success: true,
    message: 'Pengaturan QRIS, Pajak Restoran & Biaya Layanan berhasil diperbarui!',
    settings: currentCafeSettings,
  });
});

// Safe API 404 fallback: Ensure all /api/* calls ALWAYS return JSON, never HTML
app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint API tidak ditemukan' });
});

// Set up Vite in dev mode or serve static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`☕ NAWATIGA server listening on http://0.0.0.0:${port}`);
  });
}

// Only start standalone server if not running inside Vercel serverless environment
if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
  });
}

export default app;
