export interface ResonanceBonus {
  scoreMultiplier?: number;
  soulsMultiplier?: number;
  extraMaxHp?: number;
  extraPassivePerSec?: number;
  extraReviveCount?: number;
  startInvincibleMs?: number;
}

export interface Resonance {
  id: string;
  name: string;
  icon: string;
  requiredCharacters: string[];
  description: string;
  bonus: ResonanceBonus;
}

export const RESONANCES: Resonance[] = [
  {
    id: 'electric_core',
    name: 'Electric Core',
    icon: '⚡',
    requiredCharacters: ['slime_petir', 'mecha_bot'],
    description: '+15% souls dari semua sumber.',
    bonus: { soulsMultiplier: 1.15 },
  },
  {
    id: 'divine_flame',
    name: 'Divine Flame',
    icon: '🔥',
    requiredCharacters: ['slime_phoenix', 'dewa_slime'],
    description: 'Revive 2× per game + 2 detik invincible tambahan.',
    bonus: { extraReviveCount: 1, startInvincibleMs: 2000 },
  },
  {
    id: 'absolute_gold',
    name: 'Absolute Gold',
    icon: '👑',
    requiredCharacters: ['slime_emas', 'apex'],
    description: 'Score ×2 permanen.',
    bonus: { scoreMultiplier: 2.0 },
  },
  {
    id: 'slime_army',
    name: 'Slime Army',
    icon: '🌿',
    requiredCharacters: ['slime_hijau', 'slime_awan', 'slime_petir', 'slime_baja', 'naga_lumpur'],
    description: '+3 Max HP.',
    bonus: { extraMaxHp: 3 },
  },
  {
    id: 'steel_storm',
    name: 'Steel Storm',
    icon: '⚙',
    requiredCharacters: ['slime_baja', 'mecha_bot'],
    description: '+20% score tiap kill.',
    bonus: { scoreMultiplier: 1.20 },
  },
  {
    id: 'golden_phoenix',
    name: 'Golden Phoenix',
    icon: '✨',
    requiredCharacters: ['slime_phoenix', 'slime_emas'],
    description: '+30% souls dari semua sumber.',
    bonus: { soulsMultiplier: 1.30 },
  },
  {
    id: 'apex_dominion',
    name: 'APEX DOMINION',
    icon: '☯',
    requiredCharacters: ['slime_hijau', 'slime_awan', 'slime_petir', 'slime_baja', 'naga_lumpur', 'mecha_bot', 'slime_phoenix', 'slime_emas', 'dewa_slime', 'apex'],
    description: 'Koleksi LENGKAP. Souls ×3 + Score ×1.5 + +5 HP.',
    bonus: { soulsMultiplier: 3.0, scoreMultiplier: 1.5, extraMaxHp: 5 },
  },
];

export function getActiveResonances(ownedCharacterIds: string[]): Resonance[] {
  const ownedSet = new Set(ownedCharacterIds);
  return RESONANCES.filter((r) => r.requiredCharacters.every((id) => ownedSet.has(id)));
}
