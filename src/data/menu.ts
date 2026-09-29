export interface MenuItem {
  id: string;
  name: string;
  category: 'coffee-signature' | 'coffee-classic' | 'non-coffee' | 'food-bites' | 'food-mains';
  price: number;
  formattedPrice: string;
  description: string;
  imageUrl: string;
  isBestSeller?: boolean;
  isSignature?: boolean;
  isAvailable?: boolean; // Status Ketersediaan: true = Ready, false = Habis/Sold Out
  soldOutReason?: string;
  tags: string[];
  customizable: {
    sugarLevel?: boolean;
    milkType?: boolean;
    iceLevel?: boolean;
    temperature?: boolean;
  };
  details: {
    composition: string;
    caffeineLevel?: 'Tinggi' | 'Sedang' | 'Rendah' | 'Bebas Kafein';
    allergens?: string[];
  };
}

export const CATEGORIES = [
  { id: 'all', label: 'Semua Menu' },
  { id: 'coffee-signature', label: 'Signature Coffee' },
  { id: 'coffee-classic', label: 'Classic & Manual' },
  { id: 'non-coffee', label: 'Non-Coffee' },
  { id: 'food-bites', label: 'Snacks & Bites' },
  { id: 'food-mains', label: 'Main Course' },
] as const;

export type MasterCategoryId = 'all' | 'coffee' | 'non-coffee' | 'food';

export const MASTER_CATEGORIES = [
  { id: 'all', label: 'Semua Menu', icon: '⭐', shortLabel: 'Semua', desc: 'Seluruh racikan menu' },
  { id: 'coffee', label: 'Coffee (Kopi)', icon: '☕', shortLabel: 'Coffee', desc: 'Signature, Latte & Classic' },
  { id: 'non-coffee', label: 'Non-Coffee', icon: '🍵', shortLabel: 'Non-Coffee', desc: 'Matcha, Tea & Chocolate' },
  { id: 'food', label: 'Makanan & Bites', icon: '🍽️', shortLabel: 'Makanan', desc: 'Snack, Fries & Main Course' },
] as const;

export function getMasterCategory(category: MenuItem['category']): 'coffee' | 'non-coffee' | 'food' {
  if (category === 'coffee-signature' || category === 'coffee-classic') return 'coffee';
  if (category === 'non-coffee') return 'non-coffee';
  return 'food';
}

export function getCategoryBadgeLabel(category: MenuItem['category']): { label: string; icon: string; master: 'coffee' | 'non-coffee' | 'food' } {
  if (category === 'coffee-signature') return { label: 'Signature Coffee', icon: '☕', master: 'coffee' };
  if (category === 'coffee-classic') return { label: 'Classic Coffee', icon: '☕', master: 'coffee' };
  if (category === 'non-coffee') return { label: 'Non-Coffee', icon: '🍵', master: 'non-coffee' };
  if (category === 'food-bites') return { label: 'Snacks & Bites', icon: '🍟', master: 'food' };
  return { label: 'Main Course', icon: '🍽️', master: 'food' };
}

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'palm-sugar-latte',
    name: 'Signature Palm Sugar Latte',
    category: 'coffee-signature',
    price: 32000,
    formattedPrice: 'Rp 32.000',
    description: 'Espresso double shot dipadukan sirup gula aren organik Nawatiga, fresh milk dingin, dan creamy foam lembut di atasnya.',
    imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=800&auto=format&fit=crop',
    isBestSeller: true,
    isSignature: true,
    tags: ['Best Seller', 'Signature', 'Es Kopi Susu'],
    customizable: {
      sugarLevel: true,
      milkType: true,
      iceLevel: true,
      temperature: false,
    },
    details: {
      composition: 'Double Ristretto (House Blend Nawatiga), Fresh Milk, Organic Palm Sugar syrup, Crema foam.',
      caffeineLevel: 'Sedang',
      allergens: ['Dairy (bisa ganti Oat/Soy Milk)'],
    },
  },
  {
    id: 'truffle-fries',
    name: 'Truffle Parmesan Fries',
    category: 'food-bites',
    price: 35000,
    formattedPrice: 'Rp 35.000',
    description: 'Shoe-string potatoes renyah berselimut minyak white truffle Italia, taburan keju parmesan tua, disajikan bersama garlic aioli.',
    imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?q=80&w=800&auto=format&fit=crop',
    isBestSeller: true,
    isSignature: true,
    tags: ['Best Seller', 'Camilan Favorit', 'Savory'],
    customizable: {},
    details: {
      composition: 'Kentang impor premium, Pure White Truffle Oil, Parmigiano Reggiano, Fresh Parsley, Homemade Garlic Aioli.',
      allergens: ['Dairy', 'Gluten', 'Egg (saus aioli)'],
    },
  },
  {
    id: 'cloud-espresso',
    name: 'Nawatiga Cloud Espresso',
    category: 'coffee-signature',
    price: 36000,
    formattedPrice: 'Rp 36.000',
    description: 'Sensasi segar espresso di atas air kelapa murni dingin dengan lapisan salted sea salt cold foam di atasnya.',
    imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=800&auto=format&fit=crop',
    isSignature: true,
    tags: ['Signature', 'Refreshing', 'Cold Foam'],
    customizable: {
      sugarLevel: true,
      iceLevel: true,
    },
    details: {
      composition: 'Single Origin Espresso, 100% Pure Coconut Water, Salted Cream Cold Foam.',
      caffeineLevel: 'Tinggi',
      allergens: ['Dairy (hanya di foam)'],
    },
  },
  {
    id: 'pandan-velvet-macchiato',
    name: 'Pandan Velvet Macchiato',
    category: 'coffee-signature',
    price: 35000,
    formattedPrice: 'Rp 35.000',
    description: 'Ekstrak daun pandan wangi asli diseduh bersama susu lembut, espresso layer, dan taburan roasted coconut shavings.',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=800&auto=format&fit=crop',
    tags: ['Aromatic', 'Unique'],
    customizable: {
      sugarLevel: true,
      milkType: true,
      iceLevel: true,
    },
    details: {
      composition: 'Cold brew espresso layer, sari daun pandan Suji, Steamed/Iced milk, toasted coconut.',
      caffeineLevel: 'Sedang',
      allergens: ['Dairy'],
    },
  },
  {
    id: 'kyoto-matcha-latte',
    name: 'Artisan Kyoto Matcha Latte',
    category: 'non-coffee',
    price: 34000,
    formattedPrice: 'Rp 34.000',
    description: 'Pure ceremonial-grade Uji matcha dari Kyoto yang di-whisk tradisional, menyatu sempurna dengan susu bertekstur lembut.',
    imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?q=80&w=800&auto=format&fit=crop',
    isBestSeller: true,
    tags: ['Non-Coffee', 'Best Seller', 'Japanese'],
    customizable: {
      sugarLevel: true,
      milkType: true,
      iceLevel: true,
      temperature: true,
    },
    details: {
      composition: 'Kyoto Uji Ceremonial Matcha Powder, Fresh Milk, hint of cane sugar.',
      caffeineLevel: 'Rendah',
      allergens: ['Dairy'],
    },
  },
  {
    id: 'yuzu-lychee-sparkling',
    name: 'Yuzu Lychee Sparkling Tea',
    category: 'non-coffee',
    price: 30000,
    formattedPrice: 'Rp 30.000',
    description: 'Seduhan teh bunga telang & melati dengan puree jeruk yuzu Jepang, buah leci utuh, dan air soda berkarbonasi lembut.',
    imageUrl: 'https://images.unsplash.com/photo-1556881286-fc6915169721?q=80&w=800&auto=format&fit=crop',
    tags: ['Non-Coffee', 'Sparkling', 'Fruity'],
    customizable: {
      sugarLevel: true,
      iceLevel: true,
    },
    details: {
      composition: 'Jasmine Green Tea, Yuzu Puree, Fresh Lychee Fruit, Sparkling Soda, Mint leaves.',
      caffeineLevel: 'Rendah',
    },
  },
  {
    id: 'caffe-latte',
    name: 'Caffè Latte',
    category: 'coffee-classic',
    price: 29000,
    formattedPrice: 'Rp 29.000',
    description: 'Espresso seimbang dengan microfoam susu yang velvety, aroma kacang cokelat lembut. Tersedia panas atau dingin.',
    imageUrl: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?q=80&w=800&auto=format&fit=crop',
    tags: ['Classic', 'Espresso'],
    customizable: {
      sugarLevel: true,
      milkType: true,
      iceLevel: true,
      temperature: true,
    },
    details: {
      composition: 'Espresso (Blend Mandheling & Toraja), Silky textured milk.',
      caffeineLevel: 'Sedang',
      allergens: ['Dairy'],
    },
  },
  {
    id: 'v60-manual-brew',
    name: 'V60 Pour Over (Single Origin)',
    category: 'coffee-classic',
    price: 32000,
    formattedPrice: 'Rp 32.000',
    description: 'Seduhan manual filter V60 dengan profil rasa bersih, floral, dan fruity. Pilihan biji: Gayo Honey atau Flores Bajawa.',
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=800&auto=format&fit=crop',
    tags: ['Manual Brew', 'Filter Coffee'],
    customizable: {
      temperature: true,
    },
    details: {
      composition: '100% Arabica Single Origin Beans (15g to 225ml water ratio, 92°C).',
      caffeineLevel: 'Tinggi',
    },
  },
  {
    id: 'chicken-nanban',
    name: 'Crispy Chicken Nanban Bowl',
    category: 'food-mains',
    price: 48000,
    formattedPrice: 'Rp 48.000',
    description: 'Paha ayam renyah berbalur saus nanban manis gurih, homemade saus tartar telur segar, disajikan di atas nasi hangat Jepang.',
    imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?q=80&w=800&auto=format&fit=crop',
    isBestSeller: true,
    isAvailable: false,
    soldOutReason: 'Habis Terjual (Sold Out)',
    tags: ['Main Course', 'Best Seller', 'Rice Bowl'],
    customizable: {},
    details: {
      composition: 'Boneless Chicken Thigh, Sweet Soy Nanban Glaze, Japanese Egg Tartar, Nori, Steamed Japanese Rice.',
      allergens: ['Egg', 'Gluten', 'Soy'],
    },
  },
  {
    id: 'nasi-goreng-sei',
    name: 'Nasi Goreng Se\'i Sapi Nawatiga',
    category: 'food-mains',
    price: 52000,
    formattedPrice: 'Rp 52.000',
    description: 'Nasi goreng bumbu rempah aromatik dengan irisan se\'i sapi asap khas NTT, telur mata sapi setengah matang, dan sambal matah.',
    imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=800&auto=format&fit=crop',
    isSignature: true,
    tags: ['Signature', 'Main Course', 'Indonesian'],
    customizable: {},
    details: {
      composition: 'Smoked Beef Se\'i (kayu kosambi), Beras pulen, Bumbu rempah cabe rawit, Telur, Acar & Kerupuk udang.',
      allergens: ['Egg', 'Crustacean (kerupuk)'],
    },
  },
  {
    id: 'dark-choco-ganache',
    name: 'Dark Chocolate Ganache',
    category: 'non-coffee',
    price: 32000,
    formattedPrice: 'Rp 32.000',
    description: 'Cokelat hitam 70% Bali single origin yang dilelehkan kental dengan susu hangat atau es batu, kaya antioksidan dan tidak terlalu manis.',
    imageUrl: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?q=80&w=800&auto=format&fit=crop',
    tags: ['Non-Coffee', 'Rich Cocoa'],
    customizable: {
      sugarLevel: true,
      milkType: true,
      iceLevel: true,
      temperature: true,
    },
    details: {
      composition: '70% Bali Tabanan Dark Chocolate, Fresh Milk, Sea Salt touch.',
      caffeineLevel: 'Rendah',
      allergens: ['Dairy'],
    },
  },
  {
    id: 'almond-croissant',
    name: 'Artisan Almond Croissant Toast',
    category: 'food-bites',
    price: 28000,
    formattedPrice: 'Rp 28.000',
    description: 'French croissant panggang renyah bermentega tinggi dengan isian almond frangipane lembut dan taburan almond panggang.',
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=800&auto=format&fit=crop',
    tags: ['Bakery', 'Pastry'],
    customizable: {},
    details: {
      composition: 'French Butter Pastry, Almond Frangipane Cream, Sliced California Almonds, Powdered Sugar.',
      allergens: ['Nuts (Almond)', 'Gluten', 'Dairy', 'Egg'],
    },
  }
];

export const SUGAR_OPTIONS = [
  { id: 'normal', label: 'Normal Sugar (100%)', desc: 'Rasa standar resep barista' },
  { id: 'less', label: 'Less Sugar (50%)', desc: 'Manis sedang, rasa kopi lebih terasa' },
  { id: 'slight', label: 'Slight Sugar (25%)', desc: 'Hanya sedikit sentuhan manis' },
  { id: 'no', label: 'No Sugar (0%)', desc: 'Tanpa gula tambahan sama sekali' },
];

export const MILK_OPTIONS = [
  { id: 'fresh', label: 'Fresh Milk (Reguler)', price: 0 },
  { id: 'oat', label: 'Oat Milk (Oatly Barista)', price: 6000 },
  { id: 'soy', label: 'Soy Milk (V-Soy)', price: 5000 },
];

export const ICE_OPTIONS = [
  { id: 'normal-ice', label: 'Normal Ice' },
  { id: 'less-ice', label: 'Less Ice' },
  { id: 'no-ice', label: 'No Ice' },
];
