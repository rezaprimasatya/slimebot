import { CHARACTERS } from './characters';
import { getActiveResonances } from './resonance';

export interface CharacterPassive {
  characterId: string;
  label: string;
  extraMaxHp: number;
  scoreMultiplier: number;
  soulsMultiplier: number;
  pickupDropBonus: number;
  extraPassivePerSec: number;
  reviveCount: number;
  startInvincibleMs: number;
}

const DEFAULT: CharacterPassive = {
  characterId: '',
  label: '',
  extraMaxHp: 0,
  scoreMultiplier: 1.0,
  soulsMultiplier: 1.0,
  pickupDropBonus: 0,
  extraPassivePerSec: 0,
  reviveCount: 0,
  startInvincibleMs: 0,
};

export const CHARACTER_PASSIVES: Record<string, CharacterPassive> = {
  slime_hijau:   { ...DEFAULT, characterId: 'slime_hijau',   label: '+5% score tiap kill',            scoreMultiplier: 1.05 },
  slime_awan:    { ...DEFAULT, characterId: 'slime_awan',    label: '+10% pickup drop rate',           pickupDropBonus: 0.10 },
  slime_petir:   { ...DEFAULT, characterId: 'slime_petir',   label: '+2 score/detik pasif',            extraPassivePerSec: 2 },
  slime_baja:    { ...DEFAULT, characterId: 'slime_baja',    label: '+1 max HP',                       extraMaxHp: 1 },
  naga_lumpur:   { ...DEFAULT, characterId: 'naga_lumpur',   label: '+15% score tiap kill',            scoreMultiplier: 1.15 },
  mecha_bot:     { ...DEFAULT, characterId: 'mecha_bot',     label: '+5 score/detik pasif',            extraPassivePerSec: 5 },
  slime_phoenix: { ...DEFAULT, characterId: 'slime_phoenix', label: 'Revive 1× saat mati',             reviveCount: 1 },
  slime_emas:    { ...DEFAULT, characterId: 'slime_emas',    label: '+25% souls diperoleh',            soulsMultiplier: 1.25 },
  dewa_slime:    { ...DEFAULT, characterId: 'dewa_slime',    label: 'Mulai dengan 3 detik invincible', startInvincibleMs: 3000 },
  apex:          { ...DEFAULT, characterId: 'apex',          label: '+1 HP, +20% score, revive 1×',   extraMaxHp: 1, scoreMultiplier: 1.20, reviveCount: 1 },
};

export interface AggregatedPassive {
  maxHp: number;
  scoreMultiplier: number;
  soulsMultiplier: number;
  pickupDropRate: number;
  extraPassivePerSec: number;
  reviveCount: number;
  startInvincibleMs: number;
}

// Stars derived from how many times a character appears in ownedCharacters, capped at 6
export function getCharacterStars(ownedCharacterIds: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const id of ownedCharacterIds) {
    counts[id] = Math.min((counts[id] ?? 0) + 1, 6);
  }
  return counts;
}

// Star bonus multiplier: ★1=1.0x, ★2=1.15x, ★3=1.3x, ★4=1.5x, ★5=1.75x, ★6=2.0x (AWAKENED)
export function getStarMultiplier(stars: number): number {
  const mults = [1.0, 1.0, 1.15, 1.3, 1.5, 1.75, 2.0];
  return mults[Math.min(stars, 6)];
}

// Collection Power = Σ(tier × stars) — max 330 for full ★6 collection
export function computeCollectionPower(ownedCharacterIds: string[]): number {
  const stars = getCharacterStars(ownedCharacterIds);
  let power = 0;
  for (const [id, s] of Object.entries(stars)) {
    const char = CHARACTERS[id];
    if (char) power += char.tier * s;
  }
  return power;
}

export function computePassives(ownedCharacterIds: string[]): AggregatedPassive {
  const starMap = getCharacterStars(ownedCharacterIds);
  const unique = Object.keys(starMap);

  const agg: AggregatedPassive = {
    maxHp: 3,
    scoreMultiplier: 1.0,
    soulsMultiplier: 1.0,
    pickupDropRate: 0.15,
    extraPassivePerSec: 0,
    reviveCount: 0,
    startInvincibleMs: 0,
  };

  for (const id of unique) {
    const p = CHARACTER_PASSIVES[id];
    if (!p) continue;
    const sm = getStarMultiplier(starMap[id]);
    agg.maxHp += Math.round(p.extraMaxHp * sm);
    // Scale only the bonus portion multiplicatively
    agg.scoreMultiplier *= 1 + (p.scoreMultiplier - 1) * sm;
    agg.soulsMultiplier *= 1 + (p.soulsMultiplier - 1) * sm;
    agg.pickupDropRate += p.pickupDropBonus * sm;
    agg.extraPassivePerSec += p.extraPassivePerSec * sm;
    agg.reviveCount += p.reviveCount;
    if (p.startInvincibleMs > 0) {
      agg.startInvincibleMs = Math.max(agg.startInvincibleMs, Math.round(p.startInvincibleMs * sm));
    }
  }

  // Apply resonance bonuses
  const resonances = getActiveResonances(ownedCharacterIds);
  for (const res of resonances) {
    const b = res.bonus;
    if (b.scoreMultiplier) agg.scoreMultiplier *= b.scoreMultiplier;
    if (b.soulsMultiplier) agg.soulsMultiplier *= b.soulsMultiplier;
    if (b.extraMaxHp) agg.maxHp += b.extraMaxHp;
    if (b.extraPassivePerSec) agg.extraPassivePerSec += b.extraPassivePerSec;
    if (b.extraReviveCount) agg.reviveCount += b.extraReviveCount;
    if (b.startInvincibleMs) agg.startInvincibleMs = Math.max(agg.startInvincibleMs, b.startInvincibleMs);
  }

  agg.maxHp = Math.min(agg.maxHp, 12);
  agg.pickupDropRate = Math.min(agg.pickupDropRate, 0.90);
  return agg;
}
