'use server';
import { prisma } from '@/prisma/client';
import { z } from 'zod';
import { rollGachaWithPity, CHARACTERS } from '@/game/characters';
import { ACHIEVEMENTS, dailyLoginSouls } from '@/game/achievements';
import { SHOP_ITEMS } from '@/game/shop';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isPremiumActive(premiumExpiresAt: Date | null): boolean {
  if (!premiumExpiresAt) return false;
  return premiumExpiresAt > new Date();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function loginUser(username: string) {
  const trimmed = username.trim();
  if (!trimmed) return { success: false, message: 'Username tidak boleh kosong.' };
  const user = await prisma.user.findUnique({
    where: { username: trimmed },
    select: { id: true, username: true },
  });
  if (!user) return { success: false, message: 'Username tidak ditemukan. Sudah daftar belum?' };
  return { success: true, userId: user.id, username: user.username };
}

// ─── User ─────────────────────────────────────────────────────────────────────

export async function registerUser(username: string) {
  const trimmed = username.trim();
  if (!trimmed || trimmed.length < 3) return { success: false, message: 'Username minimal 3 karakter!' };
  if (trimmed.length > 20) return { success: false, message: 'Username maksimal 20 karakter!' };
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { success: false, message: 'Username hanya boleh huruf, angka, dan underscore.' };
  }
  const existing = await prisma.user.findUnique({ where: { username: trimmed } });
  if (existing) return { success: false, message: 'Username sudah dipakai, coba yang lain!' };
  try {
    const newUser = await prisma.user.create({ data: { username: trimmed } });
    return { success: true, userId: newUser.id };
  } catch {
    return { success: false, message: 'Server error, coba lagi nanti.' };
  }
}

export async function getUser(userId: string) {
  if (!userId) return null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, username: true, souls: true, highScore: true,
        totalGamesPlayed: true, totalKills: true, ownedCharacters: true,
        achievements: true, inventoryItems: true, selectedCharacter: true,
        isPremium: true, premiumExpiresAt: true,
        pityCount: true, lastLoginDate: true, loginStreak: true,
      },
    });
    if (!user) return null;
    return {
      ...user,
      isPremium: isPremiumActive(user.premiumExpiresAt as Date | null),
    };
  } catch {
    return null;
  }
}

export async function setSelectedCharacter(userId: string, characterId: string | null) {
  try {
    await prisma.user.update({ where: { id: userId }, data: { selectedCharacter: characterId } });
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ─── Daily Login ──────────────────────────────────────────────────────────────

export async function checkDailyLogin(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastLoginDate: true, loginStreak: true, achievements: true, premiumExpiresAt: true },
    });
    if (!user) return { awarded: false };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastLogin = user.lastLoginDate
      ? new Date(user.lastLoginDate.getFullYear(), user.lastLoginDate.getMonth(), user.lastLoginDate.getDate())
      : null;

    if (lastLogin && lastLogin.getTime() === today.getTime()) {
      return { awarded: false, streak: user.loginStreak };
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const newStreak = lastLogin && lastLogin.getTime() === yesterday.getTime()
      ? user.loginStreak + 1 : 1;

    let souls = dailyLoginSouls(newStreak);
    if (isPremiumActive(user.premiumExpiresAt as Date | null)) souls *= 2;

    const newAchievements: string[] = [];
    if (newStreak >= 3 && !user.achievements.includes('streak_3')) newAchievements.push('streak_3');
    if (newStreak >= 7 && !user.achievements.includes('streak_7')) newAchievements.push('streak_7');
    if (newStreak >= 30 && !user.achievements.includes('streak_30')) newAchievements.push('streak_30');
    const bonusSouls = newAchievements.reduce((s, id) => s + (ACHIEVEMENTS[id]?.rewardSouls ?? 0), 0);
    const allAchievements = [...new Set([...user.achievements, ...newAchievements])];

    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginDate: now, loginStreak: newStreak, souls: { increment: souls + bonusSouls }, achievements: allAchievements },
    });

    return { awarded: true, souls, streak: newStreak, newAchievements };
  } catch {
    return { awarded: false };
  }
}

// ─── Gacha ────────────────────────────────────────────────────────────────────

async function _doPull(userId: string, pityCount: number, totalPulls: number, ownedCharacters: string[], existingAchievements: string[]) {
  const { character, usedHardPity } = rollGachaWithPity(pityCount);
  const newPity = character.tier >= 7 ? 0 : pityCount + 1;

  const newAchievements: string[] = [];
  const uniqueAfter = new Set([...ownedCharacters, character.id]);

  if (!existingAchievements.includes('first_pull') && totalPulls === 0) newAchievements.push('first_pull');
  if (!existingAchievements.includes('mythic_pull') && character.tier >= 7) newAchievements.push('mythic_pull');
  if (!existingAchievements.includes('apex_pull') && character.id === 'apex') newAchievements.push('apex_pull');
  if (!existingAchievements.includes('pity_trigger') && usedHardPity) newAchievements.push('pity_trigger');
  if (!existingAchievements.includes('collect_3') && uniqueAfter.size >= 3) newAchievements.push('collect_3');
  if (!existingAchievements.includes('collect_5') && uniqueAfter.size >= 5) newAchievements.push('collect_5');
  if (!existingAchievements.includes('collect_all') && uniqueAfter.size >= Object.keys(CHARACTERS).length) newAchievements.push('collect_all');

  const allAchievements = [...new Set([...existingAchievements, ...newAchievements])];
  const bonusSouls = newAchievements.reduce((s, id) => s + (ACHIEVEMENTS[id]?.rewardSouls ?? 0), 0);
  return { character, newPity, newAchievements, allAchievements, bonusSouls, usedHardPity };
}

export async function pullGacha(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { souls: true, lastGachaPull: true, pityCount: true, ownedCharacters: true, achievements: true, premiumExpiresAt: true },
    });
    if (!user) return { success: false, message: 'User tidak ditemukan.' };

    const premium = isPremiumActive(user.premiumExpiresAt as Date | null);
    const GACHA_COST = premium ? 8 : 10;
    const HARD_PITY = premium ? 40 : 50;

    if (user.souls < GACHA_COST) {
      return { success: false, message: `Souls tidak cukup! Butuh ${GACHA_COST} souls (kamu punya ${user.souls}).` };
    }
    const lastPull = user.lastGachaPull as Date | null;
    if (lastPull) {
      const elapsed = Date.now() - lastPull.getTime();
      if (elapsed < 3000) {
        return { success: false, message: `Tunggu ${Math.ceil((3000 - elapsed) / 1000)} detik lagi!` };
      }
    }

    // Override pity for premium (hard pity at 40)
    const effectivePity = premium && user.pityCount >= HARD_PITY ? 50 : user.pityCount;
    const pullNum = user.ownedCharacters.length + 1;

    const { character, newPity, newAchievements, allAchievements, bonusSouls } = await _doPull(
      userId, effectivePity, user.ownedCharacters.length, user.ownedCharacters, user.achievements
    );

    const checkPulls: string[] = [];
    if (!allAchievements.includes('pull_10') && pullNum >= 10) checkPulls.push('pull_10');
    if (!allAchievements.includes('pull_50') && pullNum >= 50) checkPulls.push('pull_50');
    const allNew = [...newAchievements, ...checkPulls];
    const totalBonus = allNew.reduce((s, id) => s + (ACHIEVEMENTS[id]?.rewardSouls ?? 0), 0);
    const finalAchievements = [...new Set([...allAchievements, ...checkPulls])];

    const updated = await prisma.$transaction(async (tx) => {
      const fresh = await tx.user.findUnique({ where: { id: userId }, select: { souls: true } });
      if (!fresh || fresh.souls < GACHA_COST) throw new Error('Souls tidak cukup (race condition).');
      return tx.user.update({
        where: { id: userId },
        data: {
          souls: { decrement: GACHA_COST - totalBonus - bonusSouls },
          ownedCharacters: { push: character.id },
          lastGachaPull: new Date(),
          pityCount: newPity,
          achievements: finalAchievements,
        },
        select: { souls: true, ownedCharacters: true, pityCount: true, achievements: true },
      });
    });

    return {
      success: true, characterId: character.id, character,
      remainingSouls: updated.souls, ownedCharacters: updated.ownedCharacters,
      pityCount: updated.pityCount, newAchievements: allNew,
    };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Server error.' };
  }
}

export async function pullGachaMulti(userId: string) {
  const COUNT = 10;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { souls: true, lastGachaPull: true, pityCount: true, ownedCharacters: true, achievements: true, premiumExpiresAt: true },
    });
    if (!user) return { success: false, message: 'User tidak ditemukan.' };

    const premium = isPremiumActive(user.premiumExpiresAt as Date | null);
    const MULTI_COST = premium ? 72 : 90; // premium gets extra discount
    if (user.souls < MULTI_COST) {
      return { success: false, message: `Butuh ${MULTI_COST} souls untuk 10x pull.` };
    }
    const lastPull = user.lastGachaPull as Date | null;
    if (lastPull && (Date.now() - lastPull.getTime()) < 3000) {
      return { success: false, message: 'Tunggu sebentar sebelum pull lagi!' };
    }

    let pity = user.pityCount;
    const owned = [...user.ownedCharacters];
    let achievs = [...user.achievements];
    const results: import('@/game/characters').Character[] = [];
    const allNewAchievements: string[] = [];
    let totalBonus = 0;

    for (let i = 0; i < COUNT; i++) {
      const { character, newPity, newAchievements, bonusSouls } = await _doPull(userId, pity, owned.length, owned, achievs);
      pity = newPity;
      owned.push(character.id);
      achievs = [...new Set([...achievs, ...newAchievements])];
      allNewAchievements.push(...newAchievements);
      totalBonus += bonusSouls;
      results.push(character);
    }

    // Guarantee min tier 3
    if (!results.some((c) => c.tier >= 3)) {
      const t3Plus = Object.values(CHARACTERS).filter((c) => c.tier >= 3);
      results[COUNT - 1] = t3Plus[Math.floor(Math.random() * t3Plus.length)];
      owned[owned.length - 1] = results[COUNT - 1].id;
    }

    if (!achievs.includes('multi_pull')) { allNewAchievements.push('multi_pull'); achievs.push('multi_pull'); }
    totalBonus += allNewAchievements.reduce((s, id) => s + (ACHIEVEMENTS[id]?.rewardSouls ?? 0), 0);

    const updated = await prisma.$transaction(async (tx) => {
      const fresh = await tx.user.findUnique({ where: { id: userId }, select: { souls: true } });
      if (!fresh || fresh.souls < MULTI_COST) throw new Error('Souls tidak cukup (race condition).');
      return tx.user.update({
        where: { id: userId },
        data: {
          souls: { decrement: MULTI_COST - totalBonus },
          ownedCharacters: { push: results.map((c) => c.id) },
          lastGachaPull: new Date(),
          pityCount: pity,
          achievements: achievs,
        },
        select: { souls: true, ownedCharacters: true, pityCount: true, achievements: true },
      });
    });

    return {
      success: true, results, remainingSouls: updated.souls,
      ownedCharacters: updated.ownedCharacters, pityCount: updated.pityCount,
      newAchievements: [...new Set(allNewAchievements)],
    };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Server error.' };
  }
}

// ─── Shop ─────────────────────────────────────────────────────────────────────

export async function buyShopItem(userId: string, itemId: string) {
  try {
    const item = SHOP_ITEMS[itemId];
    if (!item) return { success: false, message: 'Item tidak ditemukan.' };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { souls: true, inventoryItems: true },
    });
    if (!user) return { success: false, message: 'User tidak ditemukan.' };
    if (user.souls < item.cost) {
      return { success: false, message: `Butuh ${item.cost} souls (kamu punya ${user.souls}).` };
    }
    if (!item.stackable && user.inventoryItems.includes(itemId)) {
      return { success: false, message: 'Item sudah ada di inventory.' };
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { souls: { decrement: item.cost }, inventoryItems: { push: itemId } },
      select: { souls: true, inventoryItems: true },
    });

    return { success: true, remainingSouls: updated.souls, inventoryItems: updated.inventoryItems };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Server error.' };
  }
}

// ─── Voucher ──────────────────────────────────────────────────────────────────

export async function redeemVoucher(userId: string, code: string) {
  const trimmedCode = code.trim().toUpperCase();
  try {
    const voucher = await prisma.voucherCode.findUnique({ where: { code: trimmedCode } });
    if (!voucher) return { success: false, message: 'Kode voucher tidak valid.' };
    if (voucher.usedBy) return { success: false, message: 'Kode voucher sudah digunakan.' };

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { souls: true, premiumExpiresAt: true } });
    if (!user) return { success: false, message: 'User tidak ditemukan.' };

    let soulsGained = 0;
    let premiumDays = 0;
    let premiumExpiresAt: Date | null = null;

    if (voucher.type === 'souls_100') soulsGained = 100;
    else if (voucher.type === 'souls_300') soulsGained = 300;
    else if (voucher.type === 'souls_1000') soulsGained = 1000;
    else if (voucher.type === 'premium_30d') { soulsGained = 500; premiumDays = 30; }
    else if (voucher.type === 'premium_90d') { soulsGained = 1500; premiumDays = 90; }
    else return { success: false, message: 'Tipe voucher tidak dikenal.' };

    if (premiumDays > 0) {
      const existing = user.premiumExpiresAt ? new Date(user.premiumExpiresAt) : new Date();
      if (existing < new Date()) existing.setTime(new Date().getTime());
      existing.setDate(existing.getDate() + premiumDays);
      premiumExpiresAt = existing;
    }

    await prisma.$transaction([
      prisma.voucherCode.update({
        where: { code: trimmedCode },
        data: { usedBy: userId, usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          souls: { increment: soulsGained },
          ...(premiumExpiresAt ? { isPremium: true, premiumExpiresAt } : {}),
        },
      }),
    ]);

    return {
      success: true, soulsGained, premiumDays,
      message: premiumDays > 0
        ? `Premium ${premiumDays} hari + ${soulsGained} souls aktif!`
        : `${soulsGained} souls berhasil ditambahkan!`,
    };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Server error.' };
  }
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export async function consumeInventoryItems(userId: string, itemIds: string[]) {
  if (!itemIds.length) return { success: true };
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { inventoryItems: true } });
    if (!user) return { success: false };
    const newInv = [...user.inventoryItems];
    for (const id of itemIds) {
      const idx = newInv.indexOf(id);
      if (idx >= 0) newInv.splice(idx, 1);
    }
    await prisma.user.update({ where: { id: userId }, data: { inventoryItems: newInv } });
    return { success: true, inventoryItems: newInv };
  } catch {
    return { success: false };
  }
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export async function getLeaderboard() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { highScore: 'desc' },
      take: 10,
      select: { username: true, highScore: true, totalGamesPlayed: true, totalKills: true, isPremium: true, premiumExpiresAt: true },
    });
    return users.map((u) => ({ ...u, isPremium: isPremiumActive(u.premiumExpiresAt as Date | null) }));
  } catch {
    return [];
  }
}

// ─── Game Result ──────────────────────────────────────────────────────────────

const GameResultSchema = z.object({
  userId: z.string().uuid(),
  score: z.number().int().min(0).max(999999),
  duration: z.number().min(5).max(300),
  wave: z.number().int().min(1),
  kills: z.number().int().min(0),
  survived: z.boolean(),
});

export async function submitGameResult(payload: unknown) {
  const parsed = GameResultSchema.safeParse(payload);
  if (!parsed.success) throw new Error('Invalid game data');

  const { userId, score, duration, wave, kills, survived } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { highScore: true, totalKills: true, achievements: true, ownedCharacters: true, premiumExpiresAt: true },
  });
  if (!user) throw new Error('User tidak ditemukan.');

  const soulsEarned = Math.max(1, Math.floor(score / 10));
  const cappedSouls = Math.min(soulsEarned, Math.floor(duration * 50));
  const isNewHighScore = score > user.highScore;
  const newTotalKills = user.totalKills + kills;
  const uniqueOwned = new Set(user.ownedCharacters).size;

  const newAchievements: string[] = [];
  const existing = user.achievements;

  if (!existing.includes('first_game')) newAchievements.push('first_game');
  if (!existing.includes('survive_full') && survived) newAchievements.push('survive_full');
  if (!existing.includes('wave_3') && wave >= 3) newAchievements.push('wave_3');
  if (!existing.includes('wave_5') && wave >= 5) newAchievements.push('wave_5');
  if (!existing.includes('wave_10') && wave >= 10) newAchievements.push('wave_10');
  if (!existing.includes('score_1k') && score >= 1000) newAchievements.push('score_1k');
  if (!existing.includes('score_5k') && score >= 5000) newAchievements.push('score_5k');
  if (!existing.includes('score_10k') && score >= 10000) newAchievements.push('score_10k');
  if (!existing.includes('kills_50') && newTotalKills >= 50) newAchievements.push('kills_50');
  if (!existing.includes('kills_500') && newTotalKills >= 500) newAchievements.push('kills_500');
  if (!existing.includes('kills_2000') && newTotalKills >= 2000) newAchievements.push('kills_2000');
  if (!existing.includes('collect_3') && uniqueOwned >= 3) newAchievements.push('collect_3');
  if (!existing.includes('collect_5') && uniqueOwned >= 5) newAchievements.push('collect_5');

  const bonusSouls = newAchievements.reduce((s, id) => s + (ACHIEVEMENTS[id]?.rewardSouls ?? 0), 0);
  const allAchievements = [...new Set([...existing, ...newAchievements])];

  const updated = await prisma.$transaction(async (tx) => {
    return tx.user.update({
      where: { id: userId },
      data: {
        souls: { increment: cappedSouls + bonusSouls },
        totalGamesPlayed: { increment: 1 },
        totalKills: { increment: kills },
        highScore: isNewHighScore ? score : undefined,
        achievements: allAchievements,
      },
      select: { souls: true, highScore: true, totalGamesPlayed: true, totalKills: true, achievements: true },
    });
  });

  return {
    soulsEarned: cappedSouls, bonusSouls, isNewHighScore, newAchievements,
    updatedSouls: updated.souls, updatedHighScore: updated.highScore,
  };
}
