export interface QrisSettings {
  merchantName: string;
  nmid: string;
  qrisImageUrl: string;
  accountInfo: string;
  notes: string;
  isActive: boolean;
}

export interface TaxAndServiceSettings {
  taxPercent: number; // e.g. 10
  servicePercent: number; // e.g. 0
  takeawayFee: number; // e.g. 0
  taxName: string; // e.g. "PB1 Restoran"
  serviceName: string; // e.g. "Biaya Layanan & Alat"
}

export interface NotificationSettings {
  voiceAlertEnabled: boolean;
  voiceVolume: number;
  vibrationEnabled: boolean;
}

export interface CafeSettings {
  qris: QrisSettings;
  taxAndService: TaxAndServiceSettings;
  notification: NotificationSettings;
}

export const DEFAULT_CAFE_SETTINGS: CafeSettings = {
  qris: {
    merchantName: 'NAWATIGA COFFEE & ROASTERY',
    nmid: 'ID1024356789012',
    qrisImageUrl: '', // Empty means use dynamic high-contrast stylized QRIS
    accountInfo: 'BCA 827-091-2345 a.n PT Nawatiga Rasa Nusantara',
    notes: 'Mohon pastikan nama merchant "NAWATIGA COFFEE" dan nominal sudah tepat sebelum memasukkan PIN m-Banking/e-Wallet Anda.',
    isActive: true,
  },
  taxAndService: {
    taxPercent: 10,
    servicePercent: 0,
    takeawayFee: 0,
    taxName: 'PB1 Restoran',
    serviceName: 'Biaya Layanan & Alat',
  },
  notification: {
    voiceAlertEnabled: true,
    voiceVolume: 1.0,
    vibrationEnabled: true,
  },
};
