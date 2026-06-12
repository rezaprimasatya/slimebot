export const TIER_NAMES = [
  'Common', 'Uncommon', 'Advanced', 'Elite', 'Master',
  'Epic', 'Mythic', 'Transcendent', 'Divine', 'The Absolute',
] as const;
export type TierName = (typeof TIER_NAMES)[number];

export interface Character {
  id: string;
  name: string;
  description: string;
  tier: number;          // 1–10
  tierName: TierName;
  category: string;
  dropRate: number;      // 0–1, all sum to 1
  color: number;         // Phaser hex (0xRRGGBB)
  cssColor: string;      // CSS hex for React
  glowColor: string;     // glow/accent color for React
  stats: { power: number; speed: number; defense: number };
}

// Drop rates: 52 + 28 + 12 + 5 + 2 + 0.7 + 0.2 + 0.08 + 0.015 + 0.005 = 100.00 ✓
export const CHARACTERS: Record<string, Character> = {
  slime_hijau: {
    id: 'slime_hijau',
    name: 'Slime Hijau',
    description: 'Slime paling dasar yang ada di dunia. Tidak berbahaya, tapi setia.',
    tier: 1, tierName: 'Common', category: 'Basic',
    dropRate: 0.5200,
    color: 0x44ff88, cssColor: '#9ca3af', glowColor: '#6b7280',
    stats: { power: 1, speed: 3, defense: 1 },
  },
  slime_awan: {
    id: 'slime_awan',
    name: 'Slime Awan',
    description: 'Melayang ringan di angin. Lebih gesit dari sepupunya yang hijau.',
    tier: 2, tierName: 'Uncommon', category: 'Basic',
    dropRate: 0.2800,
    color: 0x93c5fd, cssColor: '#4ade80', glowColor: '#16a34a',
    stats: { power: 2, speed: 5, defense: 2 },
  },
  slime_petir: {
    id: 'slime_petir',
    name: 'Slime Petir',
    description: 'Berisi energi listrik murni. Setiap sentuhan memancarkan percikan api biru.',
    tier: 3, tierName: 'Advanced', category: 'Common+',
    dropRate: 0.1200,
    color: 0xfbbf24, cssColor: '#60a5fa', glowColor: '#2563eb',
    stats: { power: 4, speed: 7, defense: 2 },
  },
  slime_baja: {
    id: 'slime_baja',
    name: 'Slime Baja',
    description: 'Tubuhnya adalah logam murni yang ditempa selama berabad-abad. Hampir tidak bisa ditembus.',
    tier: 4, tierName: 'Elite', category: 'Intermediate',
    dropRate: 0.0500,
    color: 0x94a3b8, cssColor: '#818cf8', glowColor: '#4f46e5',
    stats: { power: 5, speed: 3, defense: 8 },
  },
  naga_lumpur: {
    id: 'naga_lumpur',
    name: 'Naga Lumpur',
    description: 'Bangkitan naga purba dari lumpur kuno berumur ribuan tahun. Auranya menakutkan.',
    tier: 5, tierName: 'Master', category: 'Intermediate',
    dropRate: 0.0200,
    color: 0xa16207, cssColor: '#c084fc', glowColor: '#9333ea',
    stats: { power: 7, speed: 5, defense: 6 },
  },
  mecha_bot: {
    id: 'mecha_bot',
    name: 'Mecha Bot',
    description: 'Robot slime dari peradaban yang belum lahir. Teknologi tak terbayangkan dalam satu entitas.',
    tier: 6, tierName: 'Epic', category: 'Advanced',
    dropRate: 0.0070,
    color: 0xa78bfa, cssColor: '#f472b6', glowColor: '#db2777',
    stats: { power: 8, speed: 6, defense: 7 },
  },
  slime_phoenix: {
    id: 'slime_phoenix',
    name: 'Slime Phoenix',
    description: 'Lahir dari abu dan api. Tidak mengenal kematian yang sebenarnya.',
    tier: 7, tierName: 'Mythic', category: 'Advanced',
    dropRate: 0.0020,
    color: 0xff6600, cssColor: '#fb923c', glowColor: '#ea580c',
    stats: { power: 9, speed: 8, defense: 5 },
  },
  slime_emas: {
    id: 'slime_emas',
    name: 'Slime Emas',
    description: 'Manifestasi kemewahan absolut. Setiap tetes tubuhnya bernilai kerajaan.',
    tier: 8, tierName: 'Transcendent', category: 'Prestige',
    dropRate: 0.0008,
    color: 0xffd700, cssColor: '#fde68a', glowColor: '#d97706',
    stats: { power: 9, speed: 7, defense: 9 },
  },
  dewa_slime: {
    id: 'dewa_slime',
    name: 'Dewa Slime',
    description: 'Dipuja oleh seluruh ras slime selama ribuan tahun. Kehadirannya membelah realita.',
    tier: 9, tierName: 'Divine', category: 'Ultra-Rare',
    dropRate: 0.000150,
    color: 0xe0f2fe, cssColor: '#e0f2fe', glowColor: '#0ea5e9',
    stats: { power: 10, speed: 9, defense: 10 },
  },
  apex: {
    id: 'apex',
    name: 'APEX',
    description: '??? — Tidak ada kata-kata yang mampu menggambarkan entitas ini.',
    tier: 10, tierName: 'The Absolute', category: 'God-Tier',
    dropRate: 0.000050,
    color: 0xffffff, cssColor: '#ffffff', glowColor: '#e879f9',
    stats: { power: 10, speed: 10, defense: 10 },
  },
};

// Tier display metadata for UI
export const TIER_CSS_COLORS: Record<TierName, string> = {
  'Common':       '#9ca3af',
  'Uncommon':     '#4ade80',
  'Advanced':     '#60a5fa',
  'Elite':        '#818cf8',
  'Master':       '#c084fc',
  'Epic':         '#f472b6',
  'Mythic':       '#fb923c',
  'Transcendent': '#fde68a',
  'Divine':       '#e0f2fe',
  'The Absolute': '#ffffff',
};

export const TIER_GLOW_COLORS: Record<TierName, string> = {
  'Common':       '#6b7280',
  'Uncommon':     '#16a34a',
  'Advanced':     '#2563eb',
  'Elite':        '#4f46e5',
  'Master':       '#9333ea',
  'Epic':         '#db2777',
  'Mythic':       '#ea580c',
  'Transcendent': '#d97706',
  'Divine':       '#0ea5e9',
  'The Absolute': '#e879f9',
};

export const TIER_CATEGORIES: Record<TierName, string> = {
  'Common':       'Basic',
  'Uncommon':     'Basic',
  'Advanced':     'Common+',
  'Elite':        'Intermediate',
  'Master':       'Intermediate',
  'Epic':         'Advanced',
  'Mythic':       'Advanced',
  'Transcendent': 'Prestige',
  'Divine':       'Ultra-Rare',
  'The Absolute': 'God-Tier',
};

// Weighted gacha roll — iterates tier 1→10 (most common first)
export function rollGacha(): Character {
  const sorted = Object.values(CHARACTERS).sort((a, b) => a.tier - b.tier);
  const roll = Math.random();
  let cumulative = 0;
  for (const char of sorted) {
    cumulative += char.dropRate;
    if (roll < cumulative) return char;
  }
  return CHARACTERS['slime_hijau'];
}

// Pity-aware roll: soft pity at 80, hard pity (guaranteed Mythic+) at 100
export function rollGachaWithPity(pityCount: number): { character: Character; usedHardPity: boolean } {
  const mythicPlus = Object.values(CHARACTERS)
    .filter((c) => c.tier >= 7)
    .sort((a, b) => a.tier - b.tier);

  // Hard pity: guaranteed Mythic+ at pull 100
  if (pityCount >= 100) {
    const total = mythicPlus.reduce((s, c) => s + c.dropRate, 0);
    const roll = Math.random() * total;
    let cum = 0;
    for (const c of mythicPlus) {
      cum += c.dropRate;
      if (roll < cum) return { character: c, usedHardPity: true };
    }
    return { character: mythicPlus[0], usedHardPity: true };
  }

  // Soft pity at 80–99: linearly boost Mythic+ rate (1.2× to 5.0× at pull 99)
  if (pityCount >= 80) {
    const boost = 1 + (pityCount - 79) * 0.2;
    const sorted = Object.values(CHARACTERS).sort((a, b) => a.tier - b.tier);
    const boostedRates = sorted.map((c) => (c.tier >= 7 ? c.dropRate * boost : c.dropRate));
    const total = boostedRates.reduce((s, r) => s + r, 0);
    const roll = Math.random() * total;
    let cum = 0;
    for (let i = 0; i < sorted.length; i++) {
      cum += boostedRates[i];
      if (roll < cum) return { character: sorted[i], usedHardPity: false };
    }
  }

  return { character: rollGacha(), usedHardPity: false };
}

// Helper to get all drop-rate rows for display
export interface TierRow {
  tier: number;
  tierName: TierName;
  category: string;
  dropRate: number;
  cssColor: string;
}
export const TIER_ROWS: TierRow[] = Object.values(CHARACTERS)
  .sort((a, b) => a.tier - b.tier)
  .map((c) => ({
    tier: c.tier,
    tierName: c.tierName,
    category: c.category,
    dropRate: c.dropRate,
    cssColor: TIER_CSS_COLORS[c.tierName],
  }));
