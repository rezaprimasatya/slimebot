export interface CharacterPassive {
  characterId: string;
  label: string;
  extraMaxHp: number;
  scoreMultiplier: number;       // 1.0 = normal
  soulsMultiplier: number;       // multiplier on souls earned
  pickupDropBonus: number;       // added to base 0.15 drop rate
  extraPassivePerSec: number;    // extra score per second passive tick
  reviveOnce: boolean;           // 1 free HP recovery on death
  startInvincibleMs: number;     // start game invincible for N ms
}

const DEFAULT: CharacterPassive = {
  characterId: '',
  label: '',
  extraMaxHp: 0,
  scoreMultiplier: 1.0,
  soulsMultiplier: 1.0,
  pickupDropBonus: 0,
  extraPassivePerSec: 0,
  reviveOnce: false,
  startInvincibleMs: 0,
};

export const CHARACTER_PASSIVES: Record<string, CharacterPassive> = {
  slime_hijau:   { ...DEFAULT, characterId: 'slime_hijau',   label: '+5% score tiap kill',         scoreMultiplier: 1.05 },
  slime_awan:    { ...DEFAULT, characterId: 'slime_awan',    label: '+10% pickup drop rate',        pickupDropBonus: 0.10 },
  slime_petir:   { ...DEFAULT, characterId: 'slime_petir',   label: '+2 score/detik pasif',         extraPassivePerSec: 2 },
  slime_baja:    { ...DEFAULT, characterId: 'slime_baja',    label: '+1 max HP (total 4)',          extraMaxHp: 1 },
  naga_lumpur:   { ...DEFAULT, characterId: 'naga_lumpur',   label: '+15% score tiap kill',         scoreMultiplier: 1.15 },
  mecha_bot:     { ...DEFAULT, characterId: 'mecha_bot',     label: '+5 score/detik pasif',         extraPassivePerSec: 5 },
  slime_phoenix: { ...DEFAULT, characterId: 'slime_phoenix', label: 'Revive 1x saat mati',          reviveOnce: true },
  slime_emas:    { ...DEFAULT, characterId: 'slime_emas',    label: '+25% souls diperoleh',         soulsMultiplier: 1.25 },
  dewa_slime:    { ...DEFAULT, characterId: 'dewa_slime',    label: 'Mulai dengan 3 detik invincible', startInvincibleMs: 3000 },
  apex:          { ...DEFAULT, characterId: 'apex',          label: '+1 HP, +20% score, revive 1x', extraMaxHp: 1, scoreMultiplier: 1.20, reviveOnce: true },
};

export interface AggregatedPassive {
  maxHp: number;
  scoreMultiplier: number;
  soulsMultiplier: number;
  pickupDropRate: number;
  extraPassivePerSec: number;
  reviveOnce: boolean;
  startInvincibleMs: number;
}

export function computePassives(ownedCharacterIds: string[]): AggregatedPassive {
  const unique = [...new Set(ownedCharacterIds)];
  const agg: AggregatedPassive = {
    maxHp: 3,
    scoreMultiplier: 1.0,
    soulsMultiplier: 1.0,
    pickupDropRate: 0.15,
    extraPassivePerSec: 0,
    reviveOnce: false,
    startInvincibleMs: 0,
  };
  for (const id of unique) {
    const p = CHARACTER_PASSIVES[id];
    if (!p) continue;
    agg.maxHp += p.extraMaxHp;
    // Multiplicative stacking for score/souls
    agg.scoreMultiplier *= p.scoreMultiplier;
    agg.soulsMultiplier *= p.soulsMultiplier;
    agg.pickupDropRate += p.pickupDropBonus;
    agg.extraPassivePerSec += p.extraPassivePerSec;
    if (p.reviveOnce) agg.reviveOnce = true;
    if (p.startInvincibleMs > agg.startInvincibleMs) agg.startInvincibleMs = p.startInvincibleMs;
  }
  // Cap HP at 6
  agg.maxHp = Math.min(agg.maxHp, 6);
  return agg;
}
