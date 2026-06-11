'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getUser, pullGacha, pullGachaMulti, checkDailyLogin, getLeaderboard, buyShopItem, setSelectedCharacter as setSelectedCharacterAction } from './actions';
import { useGameStore } from '@/game/scenes/GameState';
import {
  CHARACTERS, TIER_CSS_COLORS, TIER_GLOW_COLORS, TIER_ROWS, type Character,
} from '@/game/characters';
import { ACHIEVEMENTS, type Achievement } from '@/game/achievements';
import { CHARACTER_PASSIVES } from '@/game/passives';
import { CHARACTER_ABILITIES } from '@/game/abilities';
import { SHOP_ITEMS } from '@/game/shop';
import { getRank } from '@/game/ranks';

const PhaserGame = dynamic(() => import('@/components/PhaserGame'), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeaderboardEntry { username: string; highScore: number; totalGamesPlayed: number; totalKills: number; isPremium: boolean; }
interface DailyLoginResult { awarded: boolean; souls?: number; streak?: number; newAchievements?: string[]; }

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPulling, setIsPulling] = useState(false);
  const [isMultiPulling, setIsMultiPulling] = useState(false);
  const [pullError, setPullError] = useState<string | null>(null);
  const [pullResult, setPullResult] = useState<Character | null>(null);
  const [multiPullResults, setMultiPullResults] = useState<Character[] | null>(null);
  const [pullHistory, setPullHistory] = useState<Character[]>([]);
  const [activeTab, setActiveTab] = useState<'collection' | 'rates' | 'leaderboard' | 'achievements'>('collection');
  const [showResultModal, setShowResultModal] = useState(false);
  const [showMultiModal, setShowMultiModal] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [dailyLogin, setDailyLogin] = useState<DailyLoginResult | null>(null);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const [showShop, setShowShop] = useState(false);
  const [shopMsg, setShopMsg] = useState<string | null>(null);
  const [shopLoading, setShopLoading] = useState(false);
  const [showCharSelector, setShowCharSelector] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);

  const {
    souls, username, ownedCharacters, inventoryItems, selectedCharacter,
    highScore, totalGamesPlayed, totalKills, pityCount, achievements, loginStreak,
    isGameOver, lastResult, currentScore, currentWave, currentHealth, currentKills,
    showHub, setShowHub, resetGame, setPlayerData, setSouls, addOwnedCharacter,
    setPityCount, setAchievements, setInventoryItems, setSelectedCharacter,
  } = useGameStore();

  const loadUser = useCallback(async (uid: string) => {
    const user = await getUser(uid);
    if (!user) { localStorage.removeItem('userId'); router.push('/register'); return; }
    setUserId(uid);
    setPlayerData({
      souls: user.souls, username: user.username,
      ownedCharacters: user.ownedCharacters,
      inventoryItems: user.inventoryItems ?? [],
      selectedCharacter: user.selectedCharacter ?? null,
      highScore: user.highScore,
      totalGamesPlayed: user.totalGamesPlayed, totalKills: user.totalKills,
      pityCount: user.pityCount, achievements: user.achievements,
      loginStreak: user.loginStreak,
    });
    setIsPremiumUser(user.isPremium);
    setLoading(false);
  }, [router, setPlayerData]);

  useEffect(() => {
    const saved = localStorage.getItem('userId');
    if (!saved) { router.push('/register'); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadUser(saved);
  }, [router, loadUser]);

  // Daily login check after data loads
  useEffect(() => {
    if (!userId || loading) return;
    checkDailyLogin(userId).then((res) => {
      if (res.awarded) {
        setDailyLogin(res as DailyLoginResult);
        setSouls(useGameStore.getState().souls + (res.souls ?? 0));
        if (res.newAchievements?.length) {
          setAchievements([...achievements, ...res.newAchievements]);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, loading]);

  // Refresh after game ends
  useEffect(() => {
    if (isGameOver && userId) {
      const t = setTimeout(() => void loadUser(userId), 1800);
      return () => clearTimeout(t);
    }
  }, [isGameOver, userId, loadUser]);

  // Load leaderboard when tab opens
  useEffect(() => {
    if (activeTab === 'leaderboard') {
      getLeaderboard().then(setLeaderboard);
    }
  }, [activeTab]);

  const handleStartGame = () => { resetGame(); setShowHub(false); };
  const handleLogout = () => { localStorage.removeItem('userId'); router.push('/register'); };

  const handleBuyItem = async (itemId: string) => {
    const uid = userId ?? localStorage.getItem('userId');
    if (!uid || shopLoading) return;
    setShopLoading(true); setShopMsg(null);
    const res = await buyShopItem(uid, itemId);
    if (res.success) {
      setSouls(res.remainingSouls!);
      setInventoryItems(res.inventoryItems!);
      setShopMsg(`✅ ${SHOP_ITEMS[itemId]?.name} berhasil dibeli!`);
    } else {
      setShopMsg(`❌ ${res.message}`);
    }
    setShopLoading(false);
  };

  const handleSelectChar = async (charId: string | null) => {
    const uid = userId ?? localStorage.getItem('userId');
    if (!uid) return;
    await setSelectedCharacterAction(uid, charId);
    setSelectedCharacter(charId);
  };

  const handleGacha = async () => {
    const uid = userId ?? localStorage.getItem('userId');
    if (!uid) { setPullError('Session tidak valid. Silakan login ulang.'); return; }
    if (isPulling || isMultiPulling) return;
    if (souls < 10) { setPullError(`Souls tidak cukup — punya ${souls}, butuh 10.`); return; }
    setIsPulling(true); setPullError(null);
    try {
      const res = await pullGacha(uid);
      if (res.success && res.character) {
        const char = res.character as Character;
        setPullResult(char);
        setPullHistory((h) => [char, ...h].slice(0, 10));
        setShowResultModal(true);
        setSouls(res.remainingSouls!);
        addOwnedCharacter(res.characterId!);
        if (res.pityCount !== undefined) setPityCount(res.pityCount);
        if (res.newAchievements?.length) {
          setNewAchievements(res.newAchievements);
          setAchievements([...achievements, ...res.newAchievements]);
        }
      } else { setPullError(res.message ?? 'Gagal pull, coba lagi.'); }
    } catch (err) {
      console.error('[handleGacha]', err);
      setPullError('Terjadi kesalahan server. Coba lagi.');
    } finally { setIsPulling(false); }
  };

  const handleMultiGacha = async () => {
    const uid = userId ?? localStorage.getItem('userId');
    if (!uid) { setPullError('Session tidak valid. Silakan login ulang.'); return; }
    if (isPulling || isMultiPulling) return;
    if (souls < 90) { setPullError(`Butuh 90 souls untuk 10x pull (kamu punya ${souls}).`); return; }
    setIsMultiPulling(true); setPullError(null);
    try {
      const res = await pullGachaMulti(uid);
      if (res.success && res.results) {
        const chars = res.results as Character[];
        setMultiPullResults(chars);
        setPullHistory((h) => [...chars, ...h].slice(0, 10));
        setShowMultiModal(true);
        setSouls(res.remainingSouls!);
        chars.forEach((c) => addOwnedCharacter(c.id));
        if (res.pityCount !== undefined) setPityCount(res.pityCount);
        if (res.newAchievements?.length) {
          setNewAchievements(res.newAchievements);
          setAchievements([...achievements, ...res.newAchievements]);
        }
      } else { setPullError(res.message ?? 'Gagal multi-pull.'); }
    } catch (err) {
      console.error('[handleMultiGacha]', err);
      setPullError('Terjadi kesalahan server. Coba lagi.');
    } finally { setIsMultiPulling(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white">
        <div className="text-center space-y-3">
          <div className="text-5xl animate-bounce">🟢</div>
          <p className="text-slate-500 text-sm font-mono">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (showHub) {
    return (
      <HubScreen
        userId={userId!} username={username} souls={souls} highScore={highScore}
        totalGamesPlayed={totalGamesPlayed} totalKills={totalKills}
        ownedCharacters={ownedCharacters} inventoryItems={inventoryItems}
        selectedCharacter={selectedCharacter} isPremium={isPremiumUser}
        pityCount={pityCount} achievements={achievements}
        loginStreak={loginStreak} lastResult={isGameOver ? lastResult : null}
        isPulling={isPulling} isMultiPulling={isMultiPulling}
        pullError={pullError} pullResult={pullResult} multiPullResults={multiPullResults}
        pullHistory={pullHistory} showResultModal={showResultModal} showMultiModal={showMultiModal}
        activeTab={activeTab} leaderboard={leaderboard}
        dailyLogin={dailyLogin} newAchievements={newAchievements}
        showShop={showShop} shopMsg={shopMsg} shopLoading={shopLoading}
        showCharSelector={showCharSelector}
        onPull={handleGacha} onMultiPull={handleMultiGacha} onStartGame={handleStartGame}
        onLogout={handleLogout} onCloseModal={() => { setShowResultModal(false); setNewAchievements([]); }}
        onCloseMultiModal={() => { setShowMultiModal(false); setNewAchievements([]); }}
        onTabChange={setActiveTab} onCloseDailyLogin={() => setDailyLogin(null)}
        onOpenShop={() => { setShopMsg(null); setShowShop(true); }}
        onCloseShop={() => setShowShop(false)}
        onBuyItem={handleBuyItem}
        onOpenCharSelector={() => setShowCharSelector(true)}
        onCloseCharSelector={() => setShowCharSelector(false)}
        onSelectChar={handleSelectChar}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <nav className="h-11 bg-slate-900/80 border-b border-slate-800 flex items-center px-4 gap-3 shrink-0 backdrop-blur">
        <span className="text-green-400 font-bold font-mono text-sm">🟢 Slime Gacha</span>
        <span className="text-slate-700">|</span>
        <span className="text-slate-400 font-mono text-xs">{username}</span>
        <div className="ml-auto flex items-center gap-4 text-xs font-mono">
          <span className="text-cyan-400">💧 {souls}</span>
          <span className="text-yellow-400">⭐ {highScore}</span>
          <button onClick={() => setShowHub(true)} className="text-blue-400 hover:text-blue-300 transition-colors">☰ Menu</button>
        </div>
      </nav>
      <div className="flex flex-1 gap-0">
        <aside className="w-44 bg-slate-900/60 border-r border-slate-800/50 flex flex-col p-2.5 gap-2 shrink-0">
          <div className="bg-slate-800/60 rounded-lg p-2.5 space-y-1.5 border border-slate-700/50">
            <div className="text-xs text-slate-500">Live</div>
            <StatRow label="Skor" value={String(currentScore)} color="text-yellow-300" />
            <StatRow label="Wave" value={String(currentWave)} color="text-orange-400" />
            <StatRow label="Kill" value={String(currentKills)} color="text-red-400" />
            <StatRow
              label="HP"
              value={'♥'.repeat(Math.max(0, currentHealth)) + '♡'.repeat(Math.max(0, 3 - currentHealth))}
              color="text-pink-400"
            />
          </div>
          <div className="text-xs text-slate-600 text-center leading-tight mt-1">Dash cepat = bunuh musuh</div>
        </aside>
        <main className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
          {userId && username && <PhaserGame userId={userId} username={username} />}
        </main>
      </div>
    </div>
  );
}

// ─── Hub Screen ───────────────────────────────────────────────────────────────

interface HubProps {
  userId: string; username: string; souls: number; highScore: number;
  totalGamesPlayed: number; totalKills: number; ownedCharacters: string[];
  inventoryItems: string[]; selectedCharacter: string | null; isPremium: boolean;
  pityCount: number; achievements: string[]; loginStreak: number;
  lastResult: { score: number; soulsEarned: number; waveReached: number; isNewHighScore: boolean } | null;
  isPulling: boolean; isMultiPulling: boolean; pullError: string | null;
  pullResult: Character | null; multiPullResults: Character[] | null;
  pullHistory: Character[]; showResultModal: boolean; showMultiModal: boolean;
  activeTab: 'collection' | 'rates' | 'leaderboard' | 'achievements';
  leaderboard: LeaderboardEntry[]; dailyLogin: DailyLoginResult | null; newAchievements: string[];
  showShop: boolean; shopMsg: string | null; shopLoading: boolean;
  showCharSelector: boolean;
  onPull: () => void; onMultiPull: () => void; onStartGame: () => void; onLogout: () => void;
  onCloseModal: () => void; onCloseMultiModal: () => void;
  onTabChange: (tab: 'collection' | 'rates' | 'leaderboard' | 'achievements') => void;
  onCloseDailyLogin: () => void;
  onOpenShop: () => void; onCloseShop: () => void; onBuyItem: (itemId: string) => void;
  onOpenCharSelector: () => void; onCloseCharSelector: () => void;
  onSelectChar: (charId: string | null) => void;
}

function HubScreen(p: HubProps) {
  const ownedCounts: Record<string, number> = {};
  p.ownedCharacters.forEach((id) => { ownedCounts[id] = (ownedCounts[id] ?? 0) + 1; });
  const uniqueOwned = Object.keys(ownedCounts).length;
  const totalChars = Object.keys(CHARACTERS).length;
  const hardPity = p.isPremium ? 40 : 50;
  const pullsUntilPity = hardPity - p.pityCount;
  const rank = getRank(p.highScore);
  const selectedCharData = p.selectedCharacter ? CHARACTERS[p.selectedCharacter] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col overflow-hidden relative">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/4 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/4 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/3 rounded-full blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 h-12 border-b border-slate-800/60 flex items-center px-6 gap-3">
        <span className="font-bold font-mono text-green-400">🟢 Slime Gacha</span>
        <div className="ml-auto flex items-center gap-4 text-sm font-mono">
          <span className="text-slate-400">{p.username}</span>
          {p.isPremium && <span className="text-yellow-300 text-xs bg-yellow-900/40 border border-yellow-600/40 px-2 py-0.5 rounded-full font-bold">💎 PREMIUM</span>}
          <span style={{ color: rank.cssColor }} className="text-xs font-bold">{rank.emoji} {rank.name}</span>
          <span className="text-cyan-400">💧 {p.souls}</span>
          <span className="text-yellow-400">⭐ {p.highScore}</span>
          {p.loginStreak > 0 && <span className="text-orange-400 text-xs">🔥 {p.loginStreak}hari</span>}
          <button onClick={p.onOpenShop} className="text-emerald-400 hover:text-emerald-300 text-xs transition-colors">🛒 Shop</button>
          <a href="/redeem" className="text-purple-400 hover:text-purple-300 text-xs transition-colors">🎫 Voucher</a>
          <button onClick={p.onLogout} className="text-slate-600 hover:text-red-400 text-xs transition-colors">Keluar</button>
        </div>
      </nav>

      <div className="relative z-10 flex flex-1 gap-0 overflow-hidden">
        {/* ── Left ── */}
        <div className="w-56 border-r border-slate-800/50 p-4 flex flex-col gap-3 shrink-0 overflow-y-auto">
          <PlayerCard
            username={p.username} souls={p.souls} highScore={p.highScore}
            totalGamesPlayed={p.totalGamesPlayed} totalKills={p.totalKills}
            uniqueOwned={uniqueOwned} totalChars={totalChars} loginStreak={p.loginStreak}
            isPremium={p.isPremium}
          />

          {/* Character selector */}
          <button
            onClick={p.onOpenCharSelector}
            className="w-full bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 hover:border-purple-600/50 transition-colors text-left"
          >
            <div className="text-xs text-slate-500 mb-1.5">Karakter Aktif</div>
            {selectedCharData ? (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold"
                  style={{ borderColor: TIER_CSS_COLORS[selectedCharData.tierName], color: TIER_CSS_COLORS[selectedCharData.tierName], backgroundColor: `${TIER_CSS_COLORS[selectedCharData.tierName]}18` }}>
                  T{selectedCharData.tier}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{selectedCharData.name}</div>
                  <div className="text-xs text-slate-600">klik untuk ganti</div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <span>🟢</span> Default (pilih karakter)
              </div>
            )}
          </button>

          {/* Inventory */}
          {p.inventoryItems.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <div className="text-xs text-slate-500 mb-1.5 uppercase tracking-wide">Inventory ({p.inventoryItems.length})</div>
              <div className="flex flex-wrap gap-1">
                {[...new Set(p.inventoryItems)].map((id) => {
                  const item = SHOP_ITEMS[id];
                  const count = p.inventoryItems.filter((i) => i === id).length;
                  if (!item) return null;
                  return (
                    <div key={id} title={item.name} className="bg-slate-700/60 border border-slate-600/50 rounded-lg px-2 py-1 text-xs flex items-center gap-1">
                      <span>{item.icon}</span>
                      <span className="text-slate-300">{count > 1 ? `×${count}` : item.name.split(' ')[0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active passives */}
          {uniqueOwned > 0 && (
            <div className="bg-slate-800/50 rounded-xl p-3 border border-purple-800/30">
              <div className="text-xs text-purple-400 font-semibold uppercase tracking-wide mb-2">✦ Passive Aktif</div>
              <div className="space-y-1">
                {Object.keys(ownedCounts).slice(0, 4).map((id) => {
                  const pass = CHARACTER_PASSIVES[id];
                  if (!pass) return null;
                  return (
                    <div key={id} className="text-xs text-slate-400 flex items-start gap-1">
                      <span className="text-purple-400 shrink-0">·</span>
                      <span className="leading-tight">{pass.label}</span>
                    </div>
                  );
                })}
                {uniqueOwned > 4 && <div className="text-xs text-slate-600">+{uniqueOwned - 4} lagi...</div>}
              </div>
            </div>
          )}

          {p.lastResult && (
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 space-y-2">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Hasil Terakhir</div>
              <StatRow label="Skor" value={String(p.lastResult.score)} color="text-yellow-400" />
              <StatRow label="Souls +" value={String(p.lastResult.soulsEarned)} color="text-cyan-400" />
              <StatRow label="Wave" value={String(p.lastResult.waveReached)} color="text-purple-400" />
              {p.lastResult.isNewHighScore && <div className="text-amber-400 text-xs font-bold text-center">⭐ Rekor Baru!</div>}
            </div>
          )}

          {p.pullHistory.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <div className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Pull Terakhir</div>
              <div className="flex flex-wrap gap-1">
                {p.pullHistory.slice(0, 5).map((c, i) => (
                  <div key={i} className="w-7 h-7 rounded-full border text-xs flex items-center justify-center font-bold"
                    style={{ backgroundColor: `${c.cssColor}22`, borderColor: c.cssColor, color: c.cssColor }}
                    title={`${c.name} (${c.tierName})`}>
                    {c.tier}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Center ── */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-5">
          <div className="text-center">
            <h1 className="text-5xl font-black font-mono tracking-tight bg-gradient-to-r from-green-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              GACHA
            </h1>
            <p className="text-slate-500 text-sm mt-1">10 Tier · God-tier peluang 0.05%</p>
          </div>

          {/* Pity meter */}
          <div className="w-64">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Pity ({p.pityCount}/{hardPity}){p.isPremium && <span className="text-yellow-400 ml-1">💎</span>}</span>
              <span className={pullsUntilPity <= 10 ? 'text-orange-400 font-bold' : 'text-slate-600'}>
                {pullsUntilPity <= 10 ? `⚡ ${pullsUntilPity} pull lagi!` : `${pullsUntilPity} sampai guaranteed`}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(p.pityCount / hardPity) * 100}%`,
                  background: p.pityCount >= 40
                    ? 'linear-gradient(90deg, #f97316, #ef4444)'
                    : 'linear-gradient(90deg, #7c3aed, #a855f7)',
                }}
              />
            </div>
            {p.pityCount >= 40 && (
              <div className="text-center text-xs text-orange-400 mt-1 font-bold animate-pulse">
                🔥 Soft pity aktif! Rate Mythic+ meningkat!
              </div>
            )}
          </div>

          {/* Cost indicator */}
          <div className="flex items-center gap-4 text-sm">
            <div className={`text-center ${p.souls >= (p.isPremium ? 8 : 10) ? 'text-green-400' : 'text-red-400'}`}>
              <div className="font-mono font-bold">1×</div>
              <div className="text-xs text-slate-500">
                {p.isPremium ? <><span className="line-through text-slate-700">10</span> <span className="text-yellow-400">8</span></> : '10'} souls
              </div>
            </div>
            <div className="text-slate-700">·</div>
            <div className={`text-center ${p.souls >= (p.isPremium ? 72 : 90) ? 'text-yellow-400' : 'text-slate-600'}`}>
              <div className="font-mono font-bold">10×</div>
              <div className="text-xs text-slate-500">
                {p.isPremium ? <><span className="line-through text-slate-700">90</span> <span className="text-yellow-400">72</span></> : '90'} souls
                {!p.isPremium && <span className="text-green-500 text-xs"> (-10%)</span>}
              </div>
            </div>
          </div>

          {/* Pull buttons */}
          <div className="flex items-center gap-4">
            {/* Single pull */}
            <div className="relative">
              <button
                onClick={p.onPull}
                disabled={p.isPulling || p.isMultiPulling || p.souls < 10}
                className={`relative w-36 h-36 rounded-full font-black text-lg transition-all duration-200 ${
                  p.isPulling || p.isMultiPulling || p.souls < 10
                    ? 'bg-slate-800 border-2 border-slate-700 text-slate-600 cursor-not-allowed'
                    : 'bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 border-4 border-purple-400/50 text-white shadow-2xl shadow-purple-900/60 hover:scale-105 active:scale-95 cursor-pointer'
                }`}
              >
                {p.isPulling ? <span className="text-3xl animate-spin inline-block">✦</span>
                  : p.souls < 10 ? <div className="text-center"><div className="text-2xl">💧</div><div className="text-xs mt-1">Kurang</div></div>
                  : <div className="text-center"><div className="text-3xl mb-1">✨</div><div>PULL</div><div className="text-xs opacity-70">1×</div></div>}
              </button>
              {!p.isPulling && !p.isMultiPulling && p.souls >= 10 && (
                <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-spin pointer-events-none" style={{ animationDuration: '4s' }} />
              )}
            </div>

            {/* Multi pull */}
            <div className="relative">
              <button
                onClick={p.onMultiPull}
                disabled={p.isPulling || p.isMultiPulling || p.souls < 90}
                className={`relative w-36 h-36 rounded-full font-black text-lg transition-all duration-200 ${
                  p.isPulling || p.isMultiPulling || p.souls < 90
                    ? 'bg-slate-800 border-2 border-slate-700 text-slate-600 cursor-not-allowed'
                    : 'bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 border-4 border-yellow-400/50 text-white shadow-2xl shadow-orange-900/60 hover:scale-105 active:scale-95 cursor-pointer'
                }`}
              >
                {p.isMultiPulling ? <span className="text-3xl animate-spin inline-block">✦</span>
                  : p.souls < 90 ? <div className="text-center"><div className="text-2xl">💧</div><div className="text-xs mt-1">Butuh 90</div></div>
                  : <div className="text-center"><div className="text-3xl mb-1">🎰</div><div>10×</div><div className="text-xs opacity-70">90 souls</div></div>}
              </button>
              {!p.isPulling && !p.isMultiPulling && p.souls >= 90 && (
                <div className="absolute inset-0 rounded-full border-2 border-yellow-500/30 animate-spin pointer-events-none" style={{ animationDuration: '3s', animationDirection: 'reverse' }} />
              )}
            </div>
          </div>

          {p.pullError && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-2 text-red-300 text-sm">
              {p.pullError}
            </div>
          )}

          <button
            onClick={p.onStartGame}
            className="px-10 py-4 bg-green-700 hover:bg-green-600 active:scale-95 rounded-2xl font-black text-lg text-white transition-all shadow-xl shadow-green-900/50 border border-green-600/50"
          >
            ▶ MULAI GAME
          </button>
          <p className="text-slate-600 text-xs font-mono">30 detik per ronde · Boss bermutasi setiap wave</p>
        </div>

        {/* ── Right ── */}
        <div className="w-72 border-l border-slate-800/50 flex flex-col shrink-0">
          <div className="flex border-b border-slate-800/50 overflow-x-auto">
            {(['collection', 'rates', 'leaderboard', 'achievements'] as const).map((t) => (
              <button
                key={t}
                onClick={() => p.onTabChange(t)}
                className={`flex-1 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap px-1 ${
                  p.activeTab === t ? 'text-white border-b-2 border-green-500' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {t === 'collection' ? `Koleksi (${uniqueOwned}/${totalChars})`
                  : t === 'rates' ? 'Rates'
                  : t === 'leaderboard' ? '🏆'
                  : `🏅 (${p.achievements.length})`}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {p.activeTab === 'collection' && <CollectionGrid ownedCounts={ownedCounts} />}
            {p.activeTab === 'rates' && <DropRatesTable />}
            {p.activeTab === 'leaderboard' && <LeaderboardPanel data={p.leaderboard} currentUser={p.username} />}
            {p.activeTab === 'achievements' && <AchievementsPanel unlocked={p.achievements} />}
          </div>
        </div>
      </div>

      {/* Modals */}
      {p.showResultModal && p.pullResult && (
        <GachaResultModal character={p.pullResult} newAchievements={p.newAchievements} onClose={p.onCloseModal} />
      )}
      {p.showMultiModal && p.multiPullResults && (
        <MultiResultModal results={p.multiPullResults} newAchievements={p.newAchievements} onClose={p.onCloseMultiModal} />
      )}
      {p.dailyLogin?.awarded && (
        <DailyLoginModal data={p.dailyLogin} onClose={p.onCloseDailyLogin} />
      )}
      {p.showShop && (
        <ShopModal
          souls={p.souls} inventoryItems={p.inventoryItems} isPremium={p.isPremium}
          loading={p.shopLoading} message={p.shopMsg}
          onBuy={p.onBuyItem} onClose={p.onCloseShop}
        />
      )}
      {p.showCharSelector && (
        <CharSelectorModal
          ownedCharacters={p.ownedCharacters} selectedCharacter={p.selectedCharacter}
          onSelect={p.onSelectChar} onClose={p.onCloseCharSelector}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlayerCard({ username, souls, highScore, totalGamesPlayed, totalKills, uniqueOwned, totalChars, loginStreak, isPremium }: {
  username: string; souls: number; highScore: number; totalGamesPlayed: number; totalKills: number;
  uniqueOwned: number; totalChars: number; loginStreak: number; isPremium: boolean;
}) {
  const rank = getRank(highScore);
  return (
    <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400 text-xs font-bold">
          {username[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-mono font-bold text-sm truncate">{username}</div>
          {isPremium && <div className="text-yellow-400 text-xs font-bold">💎 Premium</div>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ backgroundColor: `${rank.cssColor}18`, border: `1px solid ${rank.cssColor}40` }}>
        <span className="text-base">{rank.emoji}</span>
        <span className="text-xs font-bold" style={{ color: rank.cssColor }}>{rank.name}</span>
        <span className="text-xs text-slate-600 ml-auto">⭐ {highScore}</span>
      </div>
      <div className="space-y-1">
        <StatRow label="Souls" value={`💧 ${souls}`} color="text-cyan-400" />
        <StatRow label="Games" value={String(totalGamesPlayed)} color="text-slate-300" />
        <StatRow label="Total Kills" value={String(totalKills)} color="text-red-400" />
        <StatRow label="Koleksi" value={`${uniqueOwned}/${totalChars}`} color="text-purple-400" />
        {loginStreak > 0 && <StatRow label="Streak" value={`🔥 ${loginStreak} hari`} color="text-orange-400" />}
      </div>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500 text-xs">{label}</span>
      <span className={`text-xs font-mono font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function CollectionGrid({ ownedCounts }: { ownedCounts: Record<string, number> }) {
  const sorted = Object.values(CHARACTERS).sort((a, b) => a.tier - b.tier);
  return (
    <div className="grid grid-cols-2 gap-2">
      {sorted.map((char) => {
        const count = ownedCounts[char.id] ?? 0;
        const owned = count > 0;
        const tierColor = TIER_CSS_COLORS[char.tierName];
        const pass = CHARACTER_PASSIVES[char.id];
        return (
          <div key={char.id} className={`rounded-lg p-2 border transition-all text-center ${
            owned ? 'border-slate-600 bg-slate-800/70' : 'border-slate-800 bg-slate-900/40 opacity-40 grayscale'
          }`}>
            <div className="w-10 h-10 rounded-full mx-auto mb-1.5 flex items-center justify-center text-lg font-bold border"
              style={{ backgroundColor: `${tierColor}18`, borderColor: `${tierColor}60`, color: tierColor }}>
              T{char.tier}
            </div>
            <div className="text-xs font-bold text-white truncate">{char.name}</div>
            <div className="text-xs" style={{ color: tierColor }}>{char.tierName}</div>
            {owned && pass && <div className="text-xs text-purple-400 mt-0.5 leading-tight truncate" title={pass.label}>✦ {pass.label}</div>}
            {owned && <div className="text-xs text-slate-500 mt-0.5">×{count}</div>}
          </div>
        );
      })}
    </div>
  );
}

function DropRatesTable() {
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-4 text-xs text-slate-600 pb-1 border-b border-slate-800 font-semibold">
        <span>Tier</span><span>Nama</span><span>Peluang</span><span>Kategori</span>
      </div>
      {TIER_ROWS.map((row) => (
        <div key={row.tier} className="grid grid-cols-4 text-xs items-center py-1 border-b border-slate-800/40">
          <span className="text-slate-500 font-mono">{row.tier}</span>
          <span className="font-semibold" style={{ color: row.cssColor }}>{row.tierName}</span>
          <span className="font-mono text-slate-300">{(row.dropRate * 100).toFixed(2)}%</span>
          <span className="text-slate-600 text-xs truncate">{row.category}</span>
        </div>
      ))}
    </div>
  );
}

function LeaderboardPanel({ data, currentUser }: { data: LeaderboardEntry[]; currentUser: string }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-600 text-sm">
        <div className="text-center">
          <div className="text-2xl mb-2">🏆</div>
          <div>Memuat leaderboard...</div>
        </div>
      </div>
    );
  }
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-3">Top 10 High Score</div>
      {data.map((entry, i) => {
        const r = getRank(entry.highScore);
        return (
          <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
            entry.username === currentUser ? 'bg-green-900/30 border border-green-800/50' : 'bg-slate-800/40'
          }`}>
            <span className="w-5 text-center">{medals[i] ?? `${i + 1}.`}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <span className={`font-bold truncate ${entry.username === currentUser ? 'text-green-400' : 'text-white'}`}>
                  {entry.username}{entry.username === currentUser && ' (Kamu)'}
                </span>
                {entry.isPremium && <span className="text-yellow-400 text-xs">💎</span>}
                <span className="text-xs font-semibold" style={{ color: r.cssColor }}>{r.emoji}{r.name}</span>
              </div>
              <div className="text-slate-600">{entry.totalGamesPlayed} games · ⚔ {entry.totalKills}</div>
            </div>
            <div className="font-mono font-bold text-yellow-400">{entry.highScore.toLocaleString()}</div>
          </div>
        );
      })}
    </div>
  );
}

function AchievementsPanel({ unlocked }: { unlocked: string[] }) {
  const unlockedSet = new Set(unlocked);
  const all = Object.values(ACHIEVEMENTS);
  const types: Array<Achievement['type']> = ['game', 'gacha', 'collection', 'login'];
  const typeLabel: Record<Achievement['type'], string> = {
    game: '⚔ Game', gacha: '✨ Gacha', collection: '📚 Koleksi', login: '🔥 Login',
  };

  return (
    <div className="space-y-4">
      {types.map((type) => (
        <div key={type}>
          <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">{typeLabel[type]}</div>
          <div className="space-y-1">
            {all.filter((a) => a.type === type).map((ach) => {
              const done = unlockedSet.has(ach.id);
              return (
                <div key={ach.id} className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-all ${
                  done ? 'bg-slate-700/60 border border-slate-600/40' : 'bg-slate-900/40 opacity-40'
                }`}>
                  <span className="text-base">{ach.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold ${done ? 'text-white' : 'text-slate-600'}`}>{ach.name}</div>
                    <div className="text-slate-600 truncate leading-tight">{ach.description}</div>
                  </div>
                  <div className={`font-mono font-bold shrink-0 ${done ? 'text-cyan-400' : 'text-slate-700'}`}>
                    +{ach.rewardSouls}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function GachaResultModal({ character, newAchievements, onClose }: {
  character: Character; newAchievements: string[]; onClose: () => void;
}) {
  const tierColor = TIER_CSS_COLORS[character.tierName];
  const glowColor = TIER_GLOW_COLORS[character.tierName];
  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 rounded-2xl p-8 text-center max-w-xs w-full mx-4 border-2" onClick={(e) => e.stopPropagation()}
        style={{ borderColor: tierColor, boxShadow: `0 0 60px ${glowColor}44` }}>
        <div className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4 border"
          style={{ color: tierColor, borderColor: `${tierColor}50`, backgroundColor: `${tierColor}15` }}>
          Tier {character.tier} · {character.tierName}
        </div>
        <div className="w-28 h-28 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl font-black border-4"
          style={{ backgroundColor: `${tierColor}15`, borderColor: tierColor, boxShadow: `0 0 40px ${glowColor}66, inset 0 0 20px ${glowColor}22`, color: tierColor }}>
          ★
        </div>
        <div className="text-xs text-slate-500 mb-1">{character.category}</div>
        <h2 className="text-2xl font-black text-white mb-2">{character.name}</h2>
        <p className="text-slate-400 text-sm mb-4 leading-relaxed">{character.description}</p>
        {/* Passive */}
        {CHARACTER_PASSIVES[character.id] && (
          <div className="bg-purple-900/20 border border-purple-800/30 rounded-lg p-2 mb-4 text-xs text-purple-300">
            ✦ {CHARACTER_PASSIVES[character.id].label}
          </div>
        )}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {(['power', 'speed', 'defense'] as const).map((stat) => (
            <div key={stat} className="bg-slate-800 rounded-lg p-2">
              <div className="text-xs text-slate-500 mb-1">{stat === 'power' ? 'ATK' : stat === 'speed' ? 'SPD' : 'DEF'}</div>
              <div className="text-lg font-black" style={{ color: tierColor }}>{character.stats[stat]}</div>
              <div className="w-full bg-slate-700 rounded-full h-1 mt-1">
                <div className="h-1 rounded-full" style={{ width: `${character.stats[stat] * 10}%`, backgroundColor: tierColor }} />
              </div>
            </div>
          ))}
        </div>
        {/* New achievements */}
        {newAchievements.length > 0 && (
          <div className="mb-4 space-y-1">
            {newAchievements.map((id) => {
              const ach = ACHIEVEMENTS[id];
              if (!ach) return null;
              return (
                <div key={id} className="bg-amber-900/30 border border-amber-700/40 rounded-lg p-2 text-xs flex items-center gap-2">
                  <span>{ach.icon}</span>
                  <div className="text-left">
                    <div className="font-bold text-amber-300">{ach.name}</div>
                    <div className="text-amber-600">+{ach.rewardSouls} souls</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <button onClick={onClose} className="w-full py-2.5 rounded-xl font-bold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ backgroundColor: tierColor }}>
          Keren! Tutup
        </button>
      </div>
    </div>
  );
}

function MultiResultModal({ results, newAchievements, onClose }: {
  results: Character[]; newAchievements: string[]; onClose: () => void;
}) {
  const best = results.reduce((a, b) => (a.tier > b.tier ? a : b));
  const bestColor = TIER_CSS_COLORS[best.tierName];
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-lg mx-4 border border-slate-700" onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: `0 0 60px ${bestColor}33` }}>
        <h2 className="text-2xl font-black text-center mb-2">10× PULL HASIL</h2>
        <p className="text-slate-500 text-center text-sm mb-4">Best: <span className="font-bold" style={{ color: bestColor }}>{best.name} (Tier {best.tier})</span></p>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {results.map((c, i) => {
            const col = TIER_CSS_COLORS[c.tierName];
            return (
              <div key={i} className="text-center p-2 rounded-lg border" style={{ borderColor: `${col}40`, backgroundColor: `${col}10` }}>
                <div className="w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-sm font-bold border"
                  style={{ borderColor: col, color: col, backgroundColor: `${col}15` }}>
                  {c.tier}
                </div>
                <div className="text-xs font-bold text-white leading-tight" style={{ fontSize: '9px' }}>{c.name}</div>
                <div className="text-xs" style={{ color: col, fontSize: '9px' }}>{c.tierName}</div>
              </div>
            );
          })}
        </div>
        {newAchievements.length > 0 && (
          <div className="mb-4 space-y-1">
            {newAchievements.map((id) => {
              const ach = ACHIEVEMENTS[id];
              if (!ach) return null;
              return (
                <div key={id} className="bg-amber-900/30 border border-amber-700/40 rounded-lg p-2 text-xs flex items-center gap-2">
                  <span>{ach.icon}</span>
                  <div className="font-bold text-amber-300">{ach.name} <span className="text-amber-600 font-normal">+{ach.rewardSouls} souls</span></div>
                </div>
              );
            })}
          </div>
        )}
        <button onClick={onClose} className="w-full py-2.5 bg-purple-700 hover:bg-purple-600 rounded-xl font-bold text-white transition-all active:scale-95">
          Tutup
        </button>
      </div>
    </div>
  );
}

function ShopModal({ souls, inventoryItems, isPremium, loading, message, onBuy, onClose }: {
  souls: number; inventoryItems: string[]; isPremium: boolean;
  loading: boolean; message: string | null;
  onBuy: (id: string) => void; onClose: () => void;
}) {
  const items = Object.values(SHOP_ITEMS);
  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-sm mx-4 border border-slate-700" onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: '0 0 60px rgba(16,185,129,0.15)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-white">🛒 Soul Shop</h2>
          <span className="text-cyan-400 font-mono font-bold">💧 {souls}</span>
        </div>
        {message && (
          <div className={`mb-3 px-3 py-2 rounded-lg text-sm ${message.startsWith('✅') ? 'bg-green-900/30 border border-green-700/40 text-green-300' : 'bg-red-900/30 border border-red-700/40 text-red-300'}`}>
            {message}
          </div>
        )}
        <div className="space-y-2 mb-4">
          {items.map((item) => {
            const alreadyOwned = !item.stackable && inventoryItems.includes(item.id);
            const canAfford = souls >= item.cost;
            return (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white">{item.name}</div>
                  <div className="text-xs text-slate-500 leading-tight">{item.description}</div>
                </div>
                <button
                  onClick={() => onBuy(item.id)}
                  disabled={loading || alreadyOwned || !canAfford}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    alreadyOwned ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : !canAfford ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    : 'bg-emerald-700 hover:bg-emerald-600 text-white active:scale-95 cursor-pointer'
                  }`}
                >
                  {alreadyOwned ? '✓' : `${item.cost}💧`}
                </button>
              </div>
            );
          })}
        </div>
        {!isPremium && (
          <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-3 mb-4">
            <div className="text-xs text-yellow-400 font-bold mb-1">💎 Premium Members</div>
            <div className="text-xs text-slate-500">Dapatkan pull lebih murah, daily souls 2×, dan hard pity lebih cepat!</div>
            <a href="/redeem" className="text-xs text-yellow-400 underline mt-1 block" onClick={onClose}>Redeem Voucher Premium →</a>
          </div>
        )}
        <button onClick={onClose} className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-white transition-all active:scale-95">
          Tutup
        </button>
      </div>
    </div>
  );
}

function CharSelectorModal({ ownedCharacters, selectedCharacter, onSelect, onClose }: {
  ownedCharacters: string[]; selectedCharacter: string | null;
  onSelect: (id: string | null) => void; onClose: () => void;
}) {
  const ownedSet = [...new Set(ownedCharacters)];
  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-sm mx-4 border border-slate-700 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-black text-white mb-4">Pilih Karakter</h2>
        <div className="flex-1 overflow-y-auto space-y-2">
          {/* Default option */}
          <button
            onClick={() => { onSelect(null); onClose(); }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
              !selectedCharacter ? 'bg-green-900/30 border-green-600/50' : 'bg-slate-800/60 border-slate-700/50 hover:border-slate-600/50'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400 font-bold text-sm">🟢</div>
            <div>
              <div className="text-sm font-bold text-white">Default Slime</div>
              <div className="text-xs text-slate-500">Tanpa ability khusus</div>
            </div>
            {!selectedCharacter && <span className="ml-auto text-green-400 font-bold">✓</span>}
          </button>
          {ownedSet.map((id) => {
            const char = CHARACTERS[id];
            const ability = CHARACTER_ABILITIES[id];
            const pass = CHARACTER_PASSIVES[id];
            if (!char) return null;
            const col = TIER_CSS_COLORS[char.tierName];
            const isSelected = selectedCharacter === id;
            return (
              <button
                key={id}
                onClick={() => { onSelect(id); onClose(); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                  isSelected ? 'border-2' : 'bg-slate-800/60 border-slate-700/50 hover:border-slate-600/50'
                }`}
                style={isSelected ? { borderColor: col, backgroundColor: `${col}12` } : {}}
              >
                <div className="w-10 h-10 rounded-full border flex items-center justify-center text-sm font-black shrink-0"
                  style={{ borderColor: col, color: col, backgroundColor: `${col}18` }}>
                  T{char.tier}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white">{char.name}</div>
                  {ability && <div className="text-xs text-blue-400 truncate">⚡ {ability.name}: {ability.description}</div>}
                  {pass && <div className="text-xs text-purple-400 truncate">✦ {pass.label}</div>}
                </div>
                {isSelected && <span className="ml-auto font-bold" style={{ color: col }}>✓</span>}
              </button>
            );
          })}
          {ownedSet.length === 0 && (
            <div className="text-center py-8 text-slate-600">
              <div className="text-3xl mb-2">🎰</div>
              <div className="text-sm">Belum punya karakter. Lakukan pull dulu!</div>
            </div>
          )}
        </div>
        <button onClick={onClose} className="mt-4 w-full py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-white transition-all active:scale-95">
          Tutup
        </button>
      </div>
    </div>
  );
}

function DailyLoginModal({ data, onClose }: { data: DailyLoginResult; onClose: () => void }) {
  const streakMessages = ['', 'Selamat datang!', 'Hari ke-2!', '3 hari beruntun! 🔥', '4 hari! Mantap!', '5 hari! Luar biasa!', '6 hari! Hampir seminggu!', '7 HARI! AMAZING! 🌟'];
  const msg = streakMessages[Math.min(data.streak ?? 1, 7)] ?? `${data.streak} hari berturut!`;
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 rounded-2xl p-8 text-center max-w-sm w-full mx-4 border border-amber-700/40" onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: '0 0 60px rgba(251,191,36,0.2)' }}>
        <div className="text-5xl mb-4">🎁</div>
        <h2 className="text-2xl font-black text-white mb-2">Daily Login!</h2>
        <p className="text-amber-400 font-bold mb-1">{msg}</p>
        <p className="text-slate-400 text-sm mb-6">Login streak: {data.streak} hari</p>
        <div className="bg-amber-900/30 border border-amber-700/40 rounded-2xl p-4 mb-6">
          <div className="text-4xl font-black text-amber-400">+{data.souls} 💧</div>
          <div className="text-slate-400 text-sm mt-1">Souls diperoleh</div>
        </div>
        {(data.newAchievements ?? []).length > 0 && (
          <div className="mb-4 space-y-1">
            {(data.newAchievements ?? []).map((id) => {
              const ach = ACHIEVEMENTS[id];
              if (!ach) return null;
              return (
                <div key={id} className="bg-amber-900/20 border border-amber-800/30 rounded-lg p-2 text-xs flex items-center gap-2">
                  <span>{ach.icon}</span>
                  <div className="font-bold text-amber-300">{ach.name} <span className="text-amber-600 font-normal">+{ach.rewardSouls} souls</span></div>
                </div>
              );
            })}
          </div>
        )}
        <button onClick={onClose} className="w-full py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-black text-white transition-all active:scale-95">
          Mantap!
        </button>
      </div>
    </div>
  );
}
