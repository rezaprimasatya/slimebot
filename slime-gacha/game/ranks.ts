export interface Rank {
  name: string;
  emoji: string;
  cssColor: string;
  minScore: number;
  nextMinScore: number | null;
}

export const RANKS: Rank[] = [
  { name: 'Bronze',   emoji: '🥉', cssColor: '#b45309', minScore: 0,     nextMinScore: 1000 },
  { name: 'Silver',   emoji: '🥈', cssColor: '#94a3b8', minScore: 1000,  nextMinScore: 3000 },
  { name: 'Gold',     emoji: '🥇', cssColor: '#fbbf24', minScore: 3000,  nextMinScore: 8000 },
  { name: 'Platinum', emoji: '💎', cssColor: '#a78bfa', minScore: 8000,  nextMinScore: 20000 },
  { name: 'Diamond',  emoji: '🔷', cssColor: '#60a5fa', minScore: 20000, nextMinScore: 50000 },
  { name: 'Legend',   emoji: '👑', cssColor: '#f97316', minScore: 50000, nextMinScore: null },
];

export function getRank(highScore: number): Rank {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (highScore >= RANKS[i].minScore) return RANKS[i];
  }
  return RANKS[0];
}

export function getRankProgress(highScore: number): number {
  const rank = getRank(highScore);
  if (!rank.nextMinScore) return 1;
  return (highScore - rank.minScore) / (rank.nextMinScore - rank.minScore);
}
