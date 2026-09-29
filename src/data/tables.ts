export interface TableZone {
  id: string;
  name: string;
  rangeLabel: string;
  start: number;
  end: number;
}

export const TABLE_ZONES: TableZone[] = [
  { id: 'zone-1', name: 'Indoor Main Hall', rangeLabel: 'Meja 01 - 25', start: 1, end: 25 },
  { id: 'zone-2', name: 'Sofa & VIP Lounge', rangeLabel: 'Meja 26 - 50', start: 26, end: 50 },
  { id: 'zone-3', name: 'Outdoor Garden Patio', rangeLabel: 'Meja 51 - 75', start: 51, end: 75 },
  { id: 'zone-4', name: 'Rooftop & Sunset Deck', rangeLabel: 'Meja 76 - 100', start: 76, end: 100 },
];

/**
 * Generates an array of formatted table strings from 01 up to 100 plus BAR:
 * ['01', '02', ..., '99', '100', 'BAR']
 */
export const generateTablesList = (count: number = 100, includeBar = true): string[] => {
  const tables: string[] = [];
  for (let i = 1; i <= count; i++) {
    tables.push(i < 10 ? `0${i}` : `${i}`);
  }
  if (includeBar) {
    tables.push('BAR');
  }
  return tables;
};

export const ALL_100_TABLES = generateTablesList(100, true);

export const getTableZoneName = (tableNumber: string): string => {
  if (tableNumber === 'BAR' || /bar|kasir/i.test(tableNumber)) {
    return 'Pick-up Bar & Kasir';
  }
  const n = parseInt(tableNumber, 10);
  if (isNaN(n)) return 'Area Umum';
  const zone = TABLE_ZONES.find((z) => n >= z.start && n <= z.end);
  return zone ? zone.name : 'Area Restoran';
};
