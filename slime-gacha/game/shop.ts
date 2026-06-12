export interface ShopItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;        // souls
  stackable: boolean;  // can buy multiple
}

export const SHOP_ITEMS: Record<string, ShopItem> = {
  hp_boost: {
    id: 'hp_boost', name: '+2 Max HP', icon: '❤️',
    description: 'Tambah 2 HP maksimum untuk satu game berikutnya.',
    cost: 40, stackable: false,
  },
  score_boost: {
    id: 'score_boost', name: 'Score 2×', icon: '⭐',
    description: '2× skor selama 15 detik pertama game berikutnya.',
    cost: 60, stackable: false,
  },
  soul_amp: {
    id: 'soul_amp', name: 'Soul Amplifier', icon: '💧',
    description: '+1 soul extra setiap kill monster di game berikutnya.',
    cost: 50, stackable: false,
  },
  time_extend: {
    id: 'time_extend', name: '+8 Detik', icon: '⏱️',
    description: 'Perpanjang durasi game jadi 38 detik.',
    cost: 80, stackable: false,
  },
  start_shield: {
    id: 'start_shield', name: 'Start Shield', icon: '🛡️',
    description: 'Mulai game dengan 5 detik invincible.',
    cost: 45, stackable: false,
  },
};

// Premium package definitions (redeemed via voucher)
export interface PremiumPackage {
  code: string;
  label: string;
  souls: number;
  premiumDays: number; // 0 = souls only
  price: string;       // display price (e.g. "Rp 15.000")
}

export const PREMIUM_PACKAGES: PremiumPackage[] = [
  { code: 'souls_100',    label: '100 Souls Pack',       souls: 100,  premiumDays: 0,  price: 'Rp 5.000' },
  { code: 'souls_300',    label: '300 Souls Pack',        souls: 300,  premiumDays: 0,  price: 'Rp 10.000' },
  { code: 'souls_1000',   label: '1.000 Souls Mega Pack', souls: 1000, premiumDays: 0,  price: 'Rp 25.000' },
  { code: 'premium_30d',  label: 'Premium 30 Hari',       souls: 500,  premiumDays: 30, price: 'Rp 20.000' },
  { code: 'premium_90d',  label: 'Premium 90 Hari',       souls: 1500, premiumDays: 90, price: 'Rp 50.000' },
];

// Premium benefits (shown in UI)
export const PREMIUM_BENEFITS = [
  { icon: '💸', text: 'Pull hanya 8 souls (hemat 20%)' },
  { icon: '🎁', text: 'Daily login souls 2×' },
  { icon: '⚡', text: 'Hard pity di pull ke-40 (bukan 50)' },
  { icon: '💎', text: 'Badge Premium di Leaderboard' },
  { icon: '🔓', text: 'Unlock karakter eksklusif Premium Slime' },
];
