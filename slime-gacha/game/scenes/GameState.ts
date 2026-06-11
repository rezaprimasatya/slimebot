import { create } from 'zustand';

interface GameResult {
  score: number;
  soulsEarned: number;
  waveReached: number;
  duration: number;
  isNewHighScore: boolean;
}

interface GameStore {
  // Persistent player data (synced from DB)
  souls: number;
  username: string;
  ownedCharacters: string[];
  inventoryItems: string[];
  selectedCharacter: string | null;
  highScore: number;
  totalGamesPlayed: number;
  totalKills: number;
  pityCount: number;
  achievements: string[];
  loginStreak: number;

  // Live game runtime state (written by Phaser scenes)
  isPlaying: boolean;
  isGameOver: boolean;
  currentScore: number;
  currentWave: number;
  currentHealth: number;
  currentKills: number;
  lastResult: GameResult | null;

  // UI state
  showHub: boolean;
  isGachaAnimating: boolean;
  lastGachaResult: string | null;

  // DB sync actions
  setPlayerData: (data: {
    souls: number;
    username: string;
    ownedCharacters: string[];
    inventoryItems: string[];
    selectedCharacter: string | null;
    highScore: number;
    totalGamesPlayed: number;
    totalKills: number;
    pityCount: number;
    achievements: string[];
    loginStreak: number;
  }) => void;
  setSouls: (val: number) => void;
  setPityCount: (val: number) => void;
  setAchievements: (val: string[]) => void;
  setInventoryItems: (val: string[]) => void;
  setSelectedCharacter: (val: string | null) => void;
  addOwnedCharacter: (characterId: string) => void;

  // Game lifecycle actions
  startGame: () => void;
  updateLiveScore: (score: number) => void;
  updateLiveWave: (wave: number) => void;
  updateLiveHealth: (health: number) => void;
  updateLiveKills: (kills: number) => void;
  triggerGameOver: (result: GameResult) => void;
  resetGame: () => void;

  // Gacha actions
  setGachaAnimating: (val: boolean) => void;
  setGachaResult: (characterId: string | null) => void;

  // Hub / navigation
  setShowHub: (val: boolean) => void;
}

export const useGameStore = create<GameStore>()((set) => ({
  souls: 0,
  username: '',
  ownedCharacters: [],
  inventoryItems: [],
  selectedCharacter: null,
  highScore: 0,
  totalGamesPlayed: 0,
  totalKills: 0,
  pityCount: 0,
  achievements: [],
  loginStreak: 0,

  isPlaying: false,
  isGameOver: false,
  currentScore: 0,
  currentWave: 1,
  currentHealth: 3,
  currentKills: 0,
  lastResult: null,

  showHub: true,
  isGachaAnimating: false,
  lastGachaResult: null,

  setPlayerData: (data) =>
    set({
      souls: data.souls,
      username: data.username,
      ownedCharacters: data.ownedCharacters,
      inventoryItems: data.inventoryItems,
      selectedCharacter: data.selectedCharacter,
      highScore: data.highScore,
      totalGamesPlayed: data.totalGamesPlayed,
      totalKills: data.totalKills,
      pityCount: data.pityCount,
      achievements: data.achievements,
      loginStreak: data.loginStreak,
    }),

  setSouls: (val) => set({ souls: val }),
  setPityCount: (val) => set({ pityCount: val }),
  setAchievements: (val) => set({ achievements: val }),
  setInventoryItems: (val) => set({ inventoryItems: val }),
  setSelectedCharacter: (val) => set({ selectedCharacter: val }),

  addOwnedCharacter: (characterId) =>
    set((state) => ({
      ownedCharacters: [...state.ownedCharacters, characterId],
    })),

  startGame: () =>
    set({
      isPlaying: true,
      isGameOver: false,
      currentScore: 0,
      currentWave: 1,
      currentHealth: 3,
      currentKills: 0,
      lastResult: null,
    }),

  updateLiveScore: (score) => set({ currentScore: score }),
  updateLiveWave: (wave) => set({ currentWave: wave }),
  updateLiveHealth: (health) => set({ currentHealth: health }),
  updateLiveKills: (kills) => set({ currentKills: kills }),

  triggerGameOver: (result) =>
    set((state) => ({
      isPlaying: false,
      isGameOver: true,
      lastResult: result,
      highScore: Math.max(state.highScore, result.score),
      totalGamesPlayed: state.totalGamesPlayed + 1,
    })),

  resetGame: () =>
    set({
      isPlaying: false,
      isGameOver: false,
      currentScore: 0,
      currentWave: 1,
      currentHealth: 3,
      currentKills: 0,
    }),

  setGachaAnimating: (val) => set({ isGachaAnimating: val }),
  setGachaResult: (characterId) => set({ lastGachaResult: characterId }),
  setShowHub: (val) => set({ showHub: val }),
}));
