export interface Achievement {
  id: string;
  name: string;
  description: string;
  rewardSouls: number;
  icon: string;
  type: 'game' | 'gacha' | 'collection' | 'login';
}

export const ACHIEVEMENTS: Record<string, Achievement> = {
  first_game:   { id: 'first_game',   name: 'Debut!',          description: 'Mainkan game pertama kali',                rewardSouls: 20,   icon: '🎮', type: 'game' },
  survive_full: { id: 'survive_full', name: 'Survivor',         description: 'Survive 30 detik penuh tanpa mati',        rewardSouls: 50,   icon: '⏱️', type: 'game' },
  wave_3:       { id: 'wave_3',       name: 'Tiga Gelombang',   description: 'Capai Wave 3',                             rewardSouls: 25,   icon: '🌊', type: 'game' },
  wave_5:       { id: 'wave_5',       name: 'Pantang Mundur',   description: 'Capai Wave 5',                             rewardSouls: 50,   icon: '🌊', type: 'game' },
  wave_10:      { id: 'wave_10',      name: 'Legenda Wave',     description: 'Capai Wave 10',                            rewardSouls: 150,  icon: '🌊', type: 'game' },
  score_1k:     { id: 'score_1k',     name: 'Ribuan Skor',      description: 'Capai skor 1.000',                         rewardSouls: 30,   icon: '⭐', type: 'game' },
  score_5k:     { id: 'score_5k',     name: 'Lima Ribuan',      description: 'Capai skor 5.000',                         rewardSouls: 80,   icon: '⭐', type: 'game' },
  score_10k:    { id: 'score_10k',    name: 'Juara Sejati',     description: 'Capai skor 10.000',                        rewardSouls: 200,  icon: '🏆', type: 'game' },
  kills_50:     { id: 'kills_50',     name: 'Pejuang',          description: 'Total bunuh 50 musuh',                     rewardSouls: 30,   icon: '⚔️', type: 'game' },
  kills_500:    { id: 'kills_500',    name: 'Pembantai',        description: 'Total bunuh 500 musuh',                    rewardSouls: 100,  icon: '⚔️', type: 'game' },
  kills_2000:   { id: 'kills_2000',   name: 'Penghancur',       description: 'Total bunuh 2.000 musuh',                  rewardSouls: 300,  icon: '💀', type: 'game' },
  first_pull:   { id: 'first_pull',   name: 'Gacha Perdana',    description: 'Lakukan pull pertama',                     rewardSouls: 10,   icon: '✨', type: 'gacha' },
  pull_10:      { id: 'pull_10',      name: 'Addict',           description: 'Total 10 kali pull',                       rewardSouls: 30,   icon: '🎰', type: 'gacha' },
  pull_50:      { id: 'pull_50',      name: 'Hardcore Gacha',   description: 'Total 50 kali pull',                       rewardSouls: 100,  icon: '🎰', type: 'gacha' },
  mythic_pull:  { id: 'mythic_pull',  name: 'Keberuntungan',    description: 'Pull karakter Mythic atau lebih tinggi',   rewardSouls: 100,  icon: '🌟', type: 'gacha' },
  apex_pull:    { id: 'apex_pull',    name: 'THE ABSOLUTE',     description: 'Pull APEX — karakter paling langka',       rewardSouls: 1000, icon: '💎', type: 'gacha' },
  multi_pull:   { id: 'multi_pull',   name: 'Whale Mode',       description: 'Lakukan 10x pull sekaligus',               rewardSouls: 30,   icon: '🐋', type: 'gacha' },
  pity_trigger: { id: 'pity_trigger', name: 'Nasib Berputar',   description: 'Dapatkan karakter via hard pity',          rewardSouls: 50,   icon: '🎯', type: 'gacha' },
  collect_3:    { id: 'collect_3',    name: 'Mulai Koleksi',    description: 'Miliki 3 karakter berbeda',                rewardSouls: 30,   icon: '📚', type: 'collection' },
  collect_5:    { id: 'collect_5',    name: 'Kolektor',         description: 'Miliki 5 karakter berbeda',                rewardSouls: 60,   icon: '📚', type: 'collection' },
  collect_all:  { id: 'collect_all',  name: 'God Collection',   description: 'Miliki semua 10 karakter',                 rewardSouls: 500,  icon: '👑', type: 'collection' },
  streak_3:     { id: 'streak_3',     name: 'Rutin',            description: 'Login 3 hari berturut-turut',              rewardSouls: 50,   icon: '🔥', type: 'login' },
  streak_7:     { id: 'streak_7',     name: 'Setia',            description: 'Login 7 hari berturut-turut',              rewardSouls: 150,  icon: '🔥', type: 'login' },
  streak_30:    { id: 'streak_30',    name: 'Tak Tergoyahkan',  description: 'Login 30 hari berturut-turut',             rewardSouls: 600,  icon: '💫', type: 'login' },
};

// Souls reward per login streak day
export const LOGIN_STREAK_REWARDS: Record<number, number> = {
  1: 15, 2: 20, 3: 25, 4: 30, 5: 40, 6: 50, 7: 75,
};
export function dailyLoginSouls(streak: number): number {
  return LOGIN_STREAK_REWARDS[Math.min(streak, 7)] ?? 75;
}
