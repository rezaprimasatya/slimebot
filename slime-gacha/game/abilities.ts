export type AbilityType =
  | 'dash_boost'     // temporary speed boost
  | 'invincible'     // temporary invincibility
  | 'aoe_kill'       // kill all enemies in radius
  | 'shield'         // absorb next N hits
  | 'slow_enemies'   // slow all enemies
  | 'score_mult'     // multiply score temporarily
  | 'heal'           // restore HP
  | 'nuke_all'       // kill all enemies on screen
  | 'line_kill'      // kill enemies in a line
  | 'soul_burst';    // instant soul bonus

export interface CharacterAbility {
  characterId: string;
  name: string;
  description: string;
  type: AbilityType;
  cooldownMs: number;
  durationMs: number;
  value: number;       // multiplier, radius, count, etc. — type-dependent
  color: number;       // Phaser tint for visual effect
}

export const CHARACTER_ABILITIES: Record<string, CharacterAbility> = {
  slime_hijau: {
    characterId: 'slime_hijau', name: 'Slime Rush',
    description: 'Kecepatan dash 3× selama 3 detik',
    type: 'dash_boost', cooldownMs: 12000, durationMs: 3000, value: 3.0, color: 0x44ff88,
  },
  slime_awan: {
    characterId: 'slime_awan', name: 'Cloud Veil',
    description: 'Invincible selama 3 detik',
    type: 'invincible', cooldownMs: 15000, durationMs: 3000, value: 0, color: 0x93c5fd,
  },
  slime_petir: {
    characterId: 'slime_petir', name: 'Thunder Strike',
    description: 'Hancurkan semua musuh dalam radius 180px',
    type: 'aoe_kill', cooldownMs: 10000, durationMs: 0, value: 180, color: 0xfbbf24,
  },
  slime_baja: {
    characterId: 'slime_baja', name: 'Iron Fortress',
    description: 'Serap 3 serangan berikutnya tanpa damage',
    type: 'shield', cooldownMs: 12000, durationMs: 0, value: 3, color: 0x818cf8,
  },
  naga_lumpur: {
    characterId: 'naga_lumpur', name: 'Mud Swamp',
    description: 'Semua musuh melambat 70% selama 4 detik',
    type: 'slow_enemies', cooldownMs: 15000, durationMs: 4000, value: 0.30, color: 0xa16207,
  },
  mecha_bot: {
    characterId: 'mecha_bot', name: 'Laser Sweep',
    description: 'Hancurkan semua musuh dalam garis horizontal ±60px',
    type: 'line_kill', cooldownMs: 10000, durationMs: 0, value: 60, color: 0xa78bfa,
  },
  slime_phoenix: {
    characterId: 'slime_phoenix', name: 'Blaze Heal',
    description: 'Pulihkan 2 HP sekaligus',
    type: 'heal', cooldownMs: 20000, durationMs: 0, value: 2, color: 0xff6600,
  },
  slime_emas: {
    characterId: 'slime_emas', name: 'Gold Fever',
    description: 'Skor 4× selama 5 detik berikutnya',
    type: 'score_mult', cooldownMs: 20000, durationMs: 5000, value: 4.0, color: 0xffd700,
  },
  dewa_slime: {
    characterId: 'dewa_slime', name: 'Divine Grace',
    description: 'Invincible 5 detik + pulihkan 1 HP',
    type: 'invincible', cooldownMs: 25000, durationMs: 5000, value: 1, color: 0xe0f2fe,
  },
  apex: {
    characterId: 'apex', name: 'ABSOLUTE ZERO',
    description: 'Hancurkan SEMUA musuh + skor 5× selama 8 detik',
    type: 'nuke_all', cooldownMs: 30000, durationMs: 8000, value: 5.0, color: 0xffffff,
  },
};
