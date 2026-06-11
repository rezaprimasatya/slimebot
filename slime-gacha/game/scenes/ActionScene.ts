import Phaser from 'phaser';
import { useGameStore } from './GameState';
import { computePassives, type AggregatedPassive } from '@/game/passives';
import { CHARACTER_ABILITIES, type CharacterAbility, type AbilityType } from '@/game/abilities';
import { SHOP_ITEMS } from '@/game/shop';

type EnemyType = 'basic' | 'spike' | 'golem' | 'boss' | 'mutant';

const STATIC_ENEMY_CONFIG: Record<Exclude<EnemyType, 'boss' | 'mutant'>, {
  speed: number; score: number; hp: number; maxHp: number;
}> = {
  basic: { hp: 1, maxHp: 1, speed: 78,  score: 10 },
  spike: { hp: 1, maxHp: 1, speed: 150, score: 25 },
  golem: { hp: 3, maxHp: 3, speed: 48,  score: 80 },
};

const GAME_W = 800;
const GAME_H = 600;
const MARGIN = 30;
const BASE_GAME_TIME = 30;
const WAVE_INTERVAL = 9000;
const DASH_KILL_THRESHOLD = 210;
const INVINCIBILITY_MS = 1500;
const DASH_FLAG_MS = 380;
const BASE_POWERUP_DROP = 0.15;
const MAX_MUTANTS_CAP = 25;
const COMBO_WINDOW_MS = 1500; // time between kills to maintain combo
const MAX_COMBO = 8;

export default class ActionScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.StaticGroup;

  private score = 0;
  private health = 3;
  private maxHealth = 3;
  private wave = 0;
  private kills = 0;
  private startTime = 0;
  private gameEnded = false;
  private isInvincible = false;
  private isDashing = false;
  private usedRevive = false;

  // Combo
  private combo = 0;
  private comboTimer: Phaser.Time.TimerEvent | null = null;
  private comboTxt!: Phaser.GameObjects.Text;

  // Character ability
  private ability: CharacterAbility | null = null;
  private abilityCooldownMs = 0;
  private abilityActiveMs = 0;
  private abilityReady = true;
  private shieldHitsLeft = 0;
  private abilityScoreMult = 1.0;
  private abilitySpeedMult = 1.0;
  private enemySlowActive = false;
  private enemyNormalSpeeds: Map<Phaser.Physics.Arcade.Sprite, number> = new Map();
  private abilityCooldownBar!: Phaser.GameObjects.Graphics;
  private abilityNameTxt!: Phaser.GameObjects.Text;
  private abilityBg!: Phaser.GameObjects.Rectangle;
  private abilityTimerEvent: Phaser.Time.TimerEvent | null = null;

  // Item effects
  private maxGameTime = BASE_GAME_TIME;
  private itemScoreBoostEndsAt = 0; // epoch ms

  private passive!: AggregatedPassive;

  // HUD
  private scoreTxt!: Phaser.GameObjects.Text;
  private waveTxt!: Phaser.GameObjects.Text;
  private timerTxt!: Phaser.GameObjects.Text;
  private healthIcons: Phaser.GameObjects.Text[] = [];
  private soulsTxt!: Phaser.GameObjects.Text;
  private killsTxt!: Phaser.GameObjects.Text;
  private announceTxt!: Phaser.GameObjects.Text;
  private flashRect!: Phaser.GameObjects.Rectangle;

  private waveTimer: Phaser.Time.TimerEvent | null = null;
  private dashTimer: Phaser.Time.TimerEvent | null = null;
  private passiveTimer: Phaser.Time.TimerEvent | null = null;

  // Character manifestation
  private currentCharacterId: string | null = null;

  constructor() { super('ActionScene'); }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  create() {
    const store = useGameStore.getState();
    this.passive = computePassives(store.ownedCharacters);

    // Apply shop inventory items
    const inventory = store.inventoryItems;
    this.maxGameTime = inventory.includes('time_extend') ? BASE_GAME_TIME + 8 : BASE_GAME_TIME;
    const extraHp = inventory.includes('hp_boost') ? 2 : 0;
    if (inventory.includes('score_boost')) this.itemScoreBoostEndsAt = Date.now() + 15000;
    if (inventory.includes('soul_amp')) this.passive = { ...this.passive, soulsMultiplier: this.passive.soulsMultiplier * 1.5 };
    if (inventory.includes('start_shield')) this.passive = { ...this.passive, startInvincibleMs: Math.max(this.passive.startInvincibleMs, 5000) };

    this.score = 0;
    this.health = this.passive.maxHp + extraHp;
    this.maxHealth = this.passive.maxHp + extraHp;
    this.wave = 0; this.kills = 0; this.combo = 0;
    this.gameEnded = false; this.isInvincible = false; this.isDashing = false; this.usedRevive = false;
    this.healthIcons = [];
    this.startTime = Date.now();
    this.abilityScoreMult = 1.0; this.abilitySpeedMult = 1.0;
    this.enemySlowActive = false;
    this.enemyNormalSpeeds = new Map();

    // Set up ability from selected character
    const selectedId = store.selectedCharacter;
    this.currentCharacterId = selectedId ?? null;
    if (selectedId && store.ownedCharacters.includes(selectedId)) {
      this.ability = CHARACTER_ABILITIES[selectedId] ?? null;
    } else {
      this.ability = null;
    }
    this.abilityReady = true;
    this.abilityCooldownMs = this.ability?.cooldownMs ?? 0;
    this.shieldHitsLeft = 0;

    this.add.image(GAME_W / 2, GAME_H / 2, 'background');
    this.pickups = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group({ runChildUpdate: false });

    this.player = this.physics.add.sprite(GAME_W / 2, GAME_H / 2, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setCircle(22, 6, 6);
    this.player.setDrag(550, 550);
    this.player.setMaxVelocity(900, 900);
    if (selectedId && CHARACTER_ABILITIES[selectedId]) {
      this.player.setTint(CHARACTER_ABILITIES[selectedId].color);
    }
    this.physics.world.setBounds(MARGIN, MARGIN, GAME_W - MARGIN * 2, GAME_H - MARGIN * 2);

    this.flashRect = this.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0xff0000, 0).setDepth(10);

    this.buildHUD();

    if (this.passive.startInvincibleMs > 0) {
      this.isInvincible = true;
      this.player.setAlpha(0.5);
      this.time.delayedCall(this.passive.startInvincibleMs, () => {
        this.isInvincible = false;
        this.player.setAlpha(1);
      });
      this.showAnnounce('INVINCIBLE START!', '#22d3ee');
    }

    this.physics.add.overlap(
      this.player, this.enemies,
      this.onPlayerEnemyOverlap as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this
    );
    this.physics.add.overlap(
      this.player, this.pickups,
      this.onPickupCollect as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this
    );

    this.input.on('pointerdown', this.handlePointerDown, this);

    this.passiveTimer = this.time.addEvent({
      delay: 1000, callback: this.addPassive, callbackScope: this, loop: true,
    });

    this.time.delayedCall(1200, () => this.startNextWave());
    store.startGame();
  }

  // ─── Input ────────────────────────────────────────────────────────────────

  private handlePointerDown(ptr: Phaser.Input.Pointer) {
    if (this.gameEnded) return;
    if (ptr.rightButtonDown()) {
      this.activateAbility();
      return;
    }
    this.handleDash(ptr);
  }

  private handleDash(ptr: Phaser.Input.Pointer) {
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, ptr.x, ptr.y);
    const baseSpeed = 840 * this.abilitySpeedMult;
    this.player.setVelocity(Math.cos(angle) * baseSpeed, Math.sin(angle) * baseSpeed);

    this.isDashing = true;
    this.dashTimer?.remove(false);
    this.dashTimer = this.time.delayedCall(DASH_FLAG_MS, () => { this.isDashing = false; });

    this.tweens.add({
      targets: this.player, alpha: 0.45, duration: 70, yoyo: true,
      onComplete: () => this.player.setAlpha(this.isInvincible ? 0.35 : 1),
    });
  }

  // ─── Ability System ───────────────────────────────────────────────────────

  private activateAbility() {
    if (!this.ability || !this.abilityReady || this.gameEnded) return;

    this.abilityReady = false;
    this.updateAbilityHUD(false);

    const { type, durationMs, value, color } = this.ability;
    this.spawnParticles(this.player.x, this.player.y, color, 12);
    this.showAnnounce(this.ability.name.toUpperCase() + '!', `#${color.toString(16).padStart(6, '0')}`);

    switch (type as AbilityType) {
      case 'dash_boost':
        this.abilitySpeedMult = value;
        this.scheduleAbilityEnd(durationMs, () => { this.abilitySpeedMult = 1.0; });
        break;
      case 'invincible':
        this.isInvincible = true;
        this.player.setAlpha(0.4);
        if (this.ability.value > 0) { // dewa_slime heals
          this.health = Math.min(this.health + 1, this.maxHealth);
          this.rebuildHealthHUD();
          useGameStore.getState().updateLiveHealth(this.health);
        }
        this.scheduleAbilityEnd(durationMs, () => {
          this.isInvincible = false;
          if (!this.gameEnded) this.player.setAlpha(1);
        });
        break;
      case 'aoe_kill':
        this.performAoeKill(this.player.x, this.player.y, value, color);
        break;
      case 'shield':
        this.shieldHitsLeft = value;
        this.player.setTint(0x818cf8);
        break;
      case 'slow_enemies':
        this.applyEnemySlow(value);
        this.scheduleAbilityEnd(durationMs, () => this.removeEnemySlow());
        break;
      case 'line_kill':
        this.performLineKill(this.player.y, value, color);
        break;
      case 'heal':
        this.health = Math.min(this.health + value, this.maxHealth);
        this.rebuildHealthHUD();
        useGameStore.getState().updateLiveHealth(this.health);
        break;
      case 'score_mult':
        this.abilityScoreMult = value;
        this.scheduleAbilityEnd(durationMs, () => { this.abilityScoreMult = 1.0; });
        break;
      case 'nuke_all':
        this.performNukeAll(color);
        this.abilityScoreMult = value;
        this.scheduleAbilityEnd(durationMs, () => { this.abilityScoreMult = 1.0; });
        break;
      case 'soul_burst':
        this.addScore(500, false);
        break;
    }

    // Start cooldown
    const startCd = Date.now();
    this.time.addEvent({
      delay: 100, loop: true,
      callback: () => {
        const elapsed = Date.now() - startCd;
        const progress = Math.min(elapsed / this.ability!.cooldownMs, 1);
        this.updateAbilityCooldownBar(progress);
        if (progress >= 1) {
          this.abilityReady = true;
          this.updateAbilityHUD(true);
        }
      },
    });
  }

  private scheduleAbilityEnd(ms: number, cb: () => void) {
    this.abilityTimerEvent?.remove(false);
    this.abilityTimerEvent = this.time.delayedCall(ms, cb);
  }

  private performAoeKill(cx: number, cy: number, radius: number, color: number) {
    // Visual ring
    const ring = this.add.graphics().setDepth(9);
    ring.lineStyle(3, color, 1);
    ring.strokeCircle(cx, cy, radius);
    this.tweens.add({ targets: ring, alpha: 0, scaleX: 1.3, scaleY: 1.3, duration: 400, onComplete: () => ring.destroy() });

    const targets = this.enemies.getChildren() as Phaser.Physics.Arcade.Sprite[];
    targets.forEach((e) => {
      if (!e.active) return;
      const dist = Phaser.Math.Distance.Between(cx, cy, e.x, e.y);
      if (dist <= radius) {
        const pts = Math.round((e.getData('score') as number) * this.getTotalScoreMult());
        this.addScore(pts, false);
        this.incrementKills();
        this.spawnParticles(e.x, e.y, color, 5);
        (e.getData('hpBar') as Phaser.GameObjects.Graphics | undefined)?.destroy();
        e.destroy();
      }
    });
  }

  private performLineKill(playerY: number, halfHeight: number, color: number) {
    const line = this.add.graphics().setDepth(9);
    line.fillStyle(color, 0.4);
    line.fillRect(0, playerY - halfHeight, GAME_W, halfHeight * 2);
    this.tweens.add({ targets: line, alpha: 0, duration: 300, onComplete: () => line.destroy() });

    (this.enemies.getChildren() as Phaser.Physics.Arcade.Sprite[]).forEach((e) => {
      if (!e.active) return;
      if (Math.abs(e.y - playerY) <= halfHeight) {
        const pts = Math.round((e.getData('score') as number) * this.getTotalScoreMult());
        this.addScore(pts, false);
        this.incrementKills();
        this.spawnParticles(e.x, e.y, color, 5);
        (e.getData('hpBar') as Phaser.GameObjects.Graphics | undefined)?.destroy();
        e.destroy();
      }
    });
  }

  private performNukeAll(color: number) {
    this.cameras.main.shake(600, 0.02);
    this.tweens.add({ targets: this.flashRect, alpha: { from: 0.7, to: 0 }, duration: 600, ease: 'Linear' });
    (this.enemies.getChildren() as Phaser.Physics.Arcade.Sprite[]).forEach((e) => {
      if (!e.active) return;
      const pts = Math.round((e.getData('score') as number) * this.getTotalScoreMult());
      this.addScore(pts, false);
      this.incrementKills();
      this.spawnParticles(e.x, e.y, color, 6);
      (e.getData('hpBar') as Phaser.GameObjects.Graphics | undefined)?.destroy();
      e.destroy();
    });
  }

  private applyEnemySlow(factor: number) {
    this.enemySlowActive = true;
    (this.enemies.getChildren() as Phaser.Physics.Arcade.Sprite[]).forEach((e) => {
      if (!e.active) return;
      const s: number = e.getData('speed');
      this.enemyNormalSpeeds.set(e, s);
      e.setData('speed', Math.floor(s * factor));
    });
  }

  private removeEnemySlow() {
    this.enemySlowActive = false;
    this.enemyNormalSpeeds.forEach((spd, e) => {
      if (e.active) e.setData('speed', spd);
    });
    this.enemyNormalSpeeds.clear();
  }

  private updateAbilityHUD(ready: boolean) {
    if (!this.ability) return;
    this.abilityNameTxt.setText(ready ? `[RClick] ${this.ability.name}` : `${this.ability.name} (CD)`);
    this.abilityBg.setFillStyle(ready ? 0x1e293b : 0x0f172a);
  }

  private updateAbilityCooldownBar(progress: number) {
    if (!this.ability) return;
    this.abilityCooldownBar.clear();
    this.abilityCooldownBar.fillStyle(0x334155, 1);
    this.abilityCooldownBar.fillRect(GAME_W / 2 - 80, GAME_H - 26, 160, 6);
    const col = progress < 1 ? 0x7c3aed : 0x22c55e;
    this.abilityCooldownBar.fillStyle(col, 1);
    this.abilityCooldownBar.fillRect(GAME_W / 2 - 80, GAME_H - 26, Math.floor(160 * progress), 6);
  }

  // ─── Combo System ─────────────────────────────────────────────────────────

  private registerKillForCombo() {
    this.comboTimer?.remove(false);
    this.combo = Math.min(this.combo + 1, MAX_COMBO);

    this.comboTxt.setText(this.combo >= 2 ? `${this.combo}× COMBO!` : '');
    if (this.combo >= 2) {
      this.comboTxt.setAlpha(1).setScale(1.2);
      this.tweens.add({ targets: this.comboTxt, scaleX: 1, scaleY: 1, duration: 150 });
    }

    this.comboTimer = this.time.delayedCall(COMBO_WINDOW_MS, () => {
      this.combo = 0;
      this.comboTxt.setText('');
    });
  }

  private getComboMult(): number {
    if (this.combo <= 1) return 1.0;
    return Math.min(1 + (this.combo - 1) * 0.25, 3.0); // up to 3× at combo 9
  }

  private getTotalScoreMult(): number {
    const itemBoost = Date.now() < this.itemScoreBoostEndsAt ? 2.0 : 1.0;
    return this.passive.scoreMultiplier * this.abilityScoreMult * this.getComboMult() * itemBoost;
  }

  // ─── Wave System ──────────────────────────────────────────────────────────

  private startNextWave() {
    if (this.gameEnded) return;
    this.wave++;
    useGameStore.getState().updateLiveWave(this.wave);
    this.waveTxt.setText(`Wave ${this.wave}`);
    this.showAnnounce(`WAVE ${this.wave}`, '#f97316');
    this.spawnWave(this.wave);

    this.waveTimer?.remove(false);
    this.waveTimer = this.time.delayedCall(WAVE_INTERVAL, () => {
      if (this.gameEnded) return;
      const bonus = Math.round((50 + this.wave * 15) * this.getTotalScoreMult());
      this.addScore(bonus, false);
      this.showFloat(GAME_W / 2, GAME_H / 2, `Wave Clear! +${bonus}`, '#facc15', 26);
      this.startNextWave();
    });
  }

  private spawnWave(wave: number) {
    const numBasic = Math.min(2 + wave * 2, 12);
    const numSpike = wave >= 2 ? Math.min(wave, 6) : 0;
    const numGolem = wave >= 3 ? Math.min(Math.floor((wave - 2) / 2), 4) : 0;
    let d = 0;
    const spawn = (type: EnemyType, delay: number) =>
      this.time.delayedCall(delay, () => { if (!this.gameEnded) this.spawnEnemy(type); });
    for (let i = 0; i < numBasic; i++) spawn('basic', (d += 280));
    for (let i = 0; i < numSpike; i++) spawn('spike', (d += 350));
    for (let i = 0; i < numGolem; i++) spawn('golem', (d += 500));
    this.time.delayedCall(d + 600, () => { if (!this.gameEnded) this.spawnBoss(wave); });
  }

  private spawnEnemy(type: EnemyType) {
    const { x, y } = this.edgePos();
    const texKey = type === 'basic' ? 'enemy_basic' : type === 'spike' ? 'enemy_spike' : 'enemy_golem';
    const s = this.enemies.create(x, y, texKey) as Phaser.Physics.Arcade.Sprite;
    const cfg = STATIC_ENEMY_CONFIG[type as keyof typeof STATIC_ENEMY_CONFIG];
    const speed = this.enemySlowActive ? Math.floor(cfg.speed * 0.3) : cfg.speed;
    s.setData('type', type); s.setData('hp', cfg.hp); s.setData('maxHp', cfg.maxHp);
    s.setData('speed', speed); s.setData('score', cfg.score); s.setData('isBoss', false);
    const r = type === 'golem' ? 24 : type === 'spike' ? 18 : 16;
    s.setCircle(r, 4, 4);
    (s.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    if (type === 'golem') { const bar = this.add.graphics(); s.setData('hpBar', bar); this.drawHpBar(s, bar); }
    this.tweens.add({ targets: s, alpha: { from: 0, to: 1 }, duration: 250 });
    if (this.enemySlowActive) this.enemyNormalSpeeds.set(s, cfg.speed);
  }

  // ─── Boss ─────────────────────────────────────────────────────────────────

  private spawnBoss(wave: number) {
    const { x, y } = this.edgePos();
    const boss = this.enemies.create(x, y, 'enemy_boss') as Phaser.Physics.Arcade.Sprite;
    const hp = wave * 15;
    boss.setData('type', 'boss'); boss.setData('hp', hp); boss.setData('maxHp', hp);
    boss.setData('speed', 52 + wave * 4); boss.setData('score', 200 + wave * 50);
    boss.setData('isBoss', true); boss.setData('wave', wave);
    boss.setScale(1.4 + wave * 0.15);
    boss.setCircle(26, 4, 4);
    (boss.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    const bar = this.add.graphics(); boss.setData('hpBar', bar); this.drawHpBar(boss, bar);
    this.cameras.main.shake(200, 0.006);
    this.showAnnounce(`⚠ BOSS WAVE ${wave}!`, '#ef4444');
    this.tweens.add({ targets: boss, alpha: { from: 0, to: 1 }, duration: 400 });
    this.tweens.add({ targets: boss, scaleX: boss.scale * 1.08, scaleY: boss.scale * 1.08, duration: 500, yoyo: true, repeat: -1 });
  }

  private triggerBossMutation(boss: Phaser.Physics.Arcade.Sprite) {
    const wave: number = boss.getData('wave') ?? 1;
    const mutantCount = Math.min(wave * 5, MAX_MUTANTS_CAP);
    const bx = boss.x, by = boss.y;
    const pts = Math.round((boss.getData('score') as number) * this.getTotalScoreMult());
    (boss.getData('hpBar') as Phaser.GameObjects.Graphics | undefined)?.destroy();
    boss.destroy();

    this.cameras.main.shake(500, 0.015);
    this.tweens.add({ targets: this.flashRect, alpha: { from: 0.5, to: 0 }, duration: 500, ease: 'Linear' });
    this.spawnParticles(bx, by, 0xff00ff, 20);
    this.addScore(pts, false);
    this.incrementKills();
    this.showFloat(bx, by - 40, `BOSS MATI! +${pts}`, '#ff00ff', 24);
    this.showAnnounce(`MUTASI! ×${mutantCount} KLON!`, '#ff00ff');
    this.triggerBossKillManifestation(bx, by, wave, this.currentCharacterId);
    this.playCharacterBossKillSound(this.currentCharacterId);

    for (let i = 0; i < mutantCount; i++) {
      this.time.delayedCall(i * 40, () => {
        if (this.gameEnded) return;
        const angle = (Math.PI * 2 * i) / mutantCount + Phaser.Math.FloatBetween(-0.3, 0.3);
        const dist = Phaser.Math.FloatBetween(60, 160);
        const mx = Phaser.Math.Clamp(bx + Math.cos(angle) * dist, MARGIN + 8, GAME_W - MARGIN - 8);
        const my = Phaser.Math.Clamp(by + Math.sin(angle) * dist, MARGIN + 8, GAME_H - MARGIN - 8);
        this.spawnMutant(mx, my, wave);
      });
    }
  }

  private spawnMutant(x: number, y: number, wave: number) {
    const mutant = this.enemies.create(x, y, 'enemy_mutant') as Phaser.Physics.Arcade.Sprite;
    const hp = Math.max(1, Math.ceil(wave / 2));
    const speed = this.enemySlowActive ? Math.floor((155 + wave * 12) * 0.3) : 155 + wave * 12;
    mutant.setData('type', 'mutant'); mutant.setData('hp', hp); mutant.setData('maxHp', hp);
    mutant.setData('speed', speed); mutant.setData('score', 30 + wave * 5);
    mutant.setData('isBoss', false); mutant.setData('isMutant', true);
    mutant.setScale(0.42 + wave * 0.05);
    mutant.setCircle(14, 6, 6);
    (mutant.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    this.tweens.add({ targets: mutant, alpha: { from: 0, to: 1 }, duration: 180 });
    if (this.enemySlowActive) this.enemyNormalSpeeds.set(mutant, 155 + wave * 12);
  }

  // ─── Collisions ───────────────────────────────────────────────────────────

  private onPlayerEnemyOverlap(
    playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    enemyObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
  ) {
    const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
    const body = (playerObj as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.Body;

    if (this.isDashing && body.speed > DASH_KILL_THRESHOLD * (1 / this.abilitySpeedMult)) {
      this.hitEnemy(enemy);
    } else if (!this.isInvincible) {
      if (this.shieldHitsLeft > 0) {
        this.shieldHitsLeft--;
        this.spawnParticles(this.player.x, this.player.y, 0x818cf8, 6);
        this.showFloat(this.player.x, this.player.y - 30, 'BLOCKED!', '#818cf8', 18);
        if (this.shieldHitsLeft === 0) this.player.clearTint();
        return;
      }
      this.takeDamage();
    }
  }

  private hitEnemy(enemy: Phaser.Physics.Arcade.Sprite) {
    const hp: number = (enemy.getData('hp') as number) - 1;
    enemy.setData('hp', hp);
    const hpBar = enemy.getData('hpBar') as Phaser.GameObjects.Graphics | undefined;

    if (hp <= 0) {
      hpBar?.destroy();
      if (enemy.getData('isBoss')) {
        this.triggerBossMutation(enemy);
      } else {
        const rawPts: number = enemy.getData('score');
        const pts = Math.round(rawPts * this.getTotalScoreMult());
        this.addScore(pts, false);
        this.incrementKills();
        this.registerKillForCombo();
        this.spawnParticles(enemy.x, enemy.y, this.particleColor(enemy.getData('type')), 6);
        const dropRate = this.passive.pickupDropRate;
        if (Math.random() < dropRate) this.spawnPickup(enemy.x, enemy.y);
        const label = this.combo >= 2 ? `+${pts} ×${this.combo}` : `+${pts}`;
        const col = this.combo >= 3 ? '#f97316' : this.combo >= 2 ? '#facc15' : '#ffffff';
        this.showFloat(enemy.x, enemy.y - 18, label, col, this.combo >= 2 ? 20 : 15);
        enemy.destroy();
      }
    } else {
      this.tweens.add({
        targets: enemy, alpha: 0.25, duration: 70, yoyo: true,
        onComplete: () => enemy.active && enemy.setAlpha(1),
      });
      if (hpBar) this.drawHpBar(enemy, hpBar);
    }
  }

  private takeDamage() {
    if (this.health <= 1 && this.passive.reviveOnce && !this.usedRevive) {
      this.usedRevive = true;
      this.showAnnounce('REVIVE!', '#22d3ee');
      this.cameras.main.shake(300, 0.01);
      this.combo = 0; this.comboTxt.setText('');
      this.tweens.add({ targets: this.player, alpha: 0.2, duration: 200, yoyo: true, repeat: 4, onComplete: () => this.player.setAlpha(1) });
      return;
    }
    this.health--;
    this.combo = 0; this.comboTxt.setText('');
    this.rebuildHealthHUD();
    useGameStore.getState().updateLiveHealth(this.health);
    if (this.health <= 0) { this.endGame(); return; }
    this.tweens.add({ targets: this.flashRect, alpha: { from: 0.5, to: 0 }, duration: 400, ease: 'Linear' });
    this.isInvincible = true;
    this.tweens.add({
      targets: this.player, alpha: 0.3, duration: 140, yoyo: true,
      repeat: Math.floor(INVINCIBILITY_MS / 280),
      onComplete: () => { this.isInvincible = false; this.player.setAlpha(1); },
    });
  }

  // ─── Pickups ──────────────────────────────────────────────────────────────

  private spawnPickup(x: number, y: number) {
    const type = Math.random() < 0.55 ? 'heart' : 'multi';
    const key = type === 'heart' ? 'pickup_heart' : 'pickup_multi';
    const pu = this.pickups.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
    pu.setData('type', type);
    this.time.delayedCall(7000, () => { if (pu.active) pu.destroy(); });
    this.tweens.add({ targets: pu, y: y - 8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private onPickupCollect(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    puObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
  ) {
    const pu = puObj as Phaser.Physics.Arcade.Sprite;
    const type = pu.getData('type') as string;
    if (type === 'heart' && this.health < this.maxHealth) {
      this.health++;
      this.rebuildHealthHUD();
      useGameStore.getState().updateLiveHealth(this.health);
      this.showFloat(pu.x, pu.y - 20, '+1 HP', '#ff4488', 20);
    } else if (type === 'multi') {
      const bonus = Math.round((Math.floor(this.score * 0.1) + 25) * this.getTotalScoreMult());
      this.addScore(bonus, false);
      this.showFloat(pu.x, pu.y - 20, `×Bonus! +${bonus}`, '#facc15', 20);
    }
    pu.destroy();
  }

  // ─── Score ────────────────────────────────────────────────────────────────

  private addPassive() {
    if (!this.gameEnded) {
      this.addScore(this.wave + this.passive.extraPassivePerSec, true);
    }
  }

  private addScore(pts: number, _isPassive: boolean) {
    this.score += pts;
    this.scoreTxt.setText(String(this.score));
    const soulsPreview = Math.round(Math.floor(this.score / 10) * this.passive.soulsMultiplier);
    this.soulsTxt.setText(`~${soulsPreview} souls`);
    useGameStore.getState().updateLiveScore(this.score);
  }

  private incrementKills() {
    this.kills++;
    this.killsTxt.setText(`⚔ ${this.kills}`);
    useGameStore.getState().updateLiveKills(this.kills);
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────

  private buildHUD() {
    const base = { fontFamily: 'monospace', color: '#e2e8f0' };
    this.add.rectangle(GAME_W / 2, 20, GAME_W, 40, 0x0f172a, 0.8).setDepth(5);

    this.waveTxt = this.add.text(12, 10, 'Wave 0', { ...base, fontSize: '15px', color: '#94a3b8' }).setDepth(6);
    this.scoreTxt = this.add.text(GAME_W / 2, 10, '0', { ...base, fontSize: '22px', fontStyle: 'bold', color: '#facc15' }).setOrigin(0.5, 0).setDepth(6);
    this.timerTxt = this.add.text(12, 28, `${this.maxGameTime}s`, { ...base, fontSize: '12px', color: '#64748b' }).setDepth(6);
    this.soulsTxt = this.add.text(GAME_W - 12, GAME_H - 20, '~0 souls', { ...base, fontSize: '13px', color: '#22d3ee' }).setOrigin(1, 1).setDepth(6);
    this.killsTxt = this.add.text(GAME_W - 12, GAME_H - 36, '⚔ 0', { ...base, fontSize: '12px', color: '#f97316' }).setOrigin(1, 1).setDepth(6);

    // Combo text
    this.comboTxt = this.add.text(GAME_W / 2, GAME_H / 2 + 30, '', {
      fontFamily: 'monospace', fontSize: '28px', fontStyle: 'bold',
      color: '#f97316', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(8).setAlpha(1);

    // Ability HUD
    if (this.ability) {
      this.abilityBg = this.add.rectangle(GAME_W / 2, GAME_H - 18, 200, 28, 0x1e293b, 0.9).setDepth(6);
      this.abilityNameTxt = this.add.text(GAME_W / 2, GAME_H - 18,
        `[RClick] ${this.ability.name}`,
        { fontFamily: 'monospace', fontSize: '11px', color: '#a78bfa' }
      ).setOrigin(0.5).setDepth(7);
      this.abilityCooldownBar = this.add.graphics().setDepth(7);
      this.updateAbilityCooldownBar(1);
    } else {
      this.abilityBg = this.add.rectangle(0, 0, 0, 0, 0).setAlpha(0);
      this.abilityNameTxt = this.add.text(0, 0, '', base);
      this.abilityCooldownBar = this.add.graphics();
    }

    const passiveCount = new Set(useGameStore.getState().ownedCharacters).size;
    if (passiveCount > 0) {
      this.add.text(GAME_W - 12, 10, `✦ ${passiveCount} passives`, { ...base, fontSize: '11px', color: '#a78bfa' }).setOrigin(1, 0).setDepth(6);
    }

    this.rebuildHealthHUD();
    this.announceTxt = this.add.text(GAME_W / 2, GAME_H / 2 - 70, '', {
      fontFamily: 'monospace', fontSize: '36px', fontStyle: 'bold',
      color: '#f97316', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(8).setAlpha(0);
  }

  private rebuildHealthHUD() {
    this.healthIcons.forEach((h) => h.destroy());
    this.healthIcons = [];
    for (let i = 0; i < this.maxHealth; i++) {
      const filled = i < this.health;
      this.healthIcons.push(
        this.add.text(GAME_W - 14 - i * 22, 10, filled ? '♥' : '♡', {
          fontFamily: 'monospace', fontSize: '18px', color: filled ? '#ff4488' : '#475569',
        }).setOrigin(1, 0).setDepth(6)
      );
    }
  }

  private showAnnounce(msg: string, color: string) {
    this.announceTxt.setText(msg).setColor(color).setAlpha(0);
    this.tweens.add({
      targets: this.announceTxt,
      alpha: { from: 0, to: 1 }, scaleX: { from: 0.4, to: 1 }, scaleY: { from: 0.4, to: 1 },
      duration: 280, ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(900, () => {
          this.tweens.add({ targets: this.announceTxt, alpha: 0, duration: 400 });
        });
      },
    });
  }

  private showFloat(x: number, y: number, msg: string, color: string, size: number) {
    const t = this.add.text(x, y, msg, { fontFamily: 'monospace', fontSize: `${size}px`, color, stroke: '#000', strokeThickness: 2 }).setOrigin(0.5).setDepth(9);
    this.tweens.add({ targets: t, y: y - 44, alpha: 0, duration: 850, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  // ─── Particles ────────────────────────────────────────────────────────────

  private particleColor(type: EnemyType): number {
    const map: Record<EnemyType, number> = { basic: 0xff4444, spike: 0xff8800, golem: 0xaa44ff, boss: 0xff00ff, mutant: 0xff44ff };
    return map[type] ?? 0xffffff;
  }

  private spawnParticles(x: number, y: number, color: number, count: number) {
    for (let i = 0; i < count; i++) {
      const p = this.add.image(x, y, 'particle').setTint(color).setScale(Phaser.Math.FloatBetween(0.5, 1.8)).setDepth(7);
      const angle = Math.PI * 2 * (i / count) + Phaser.Math.FloatBetween(-0.4, 0.4);
      const dist = Phaser.Math.FloatBetween(25, 90);
      this.tweens.add({ targets: p, x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist, alpha: 0, scaleX: 0, scaleY: 0, duration: Phaser.Math.Between(280, 560), ease: 'Cubic.easeOut', onComplete: () => p.destroy() });
    }
  }

  private drawHpBar(sprite: Phaser.Physics.Arcade.Sprite, bar: Phaser.GameObjects.Graphics) {
    const hp: number = sprite.getData('hp');
    const maxHp: number = sprite.getData('maxHp');
    const w = sprite.getData('isBoss') ? 56 : 44;
    bar.clear();
    bar.fillStyle(0x000000, 0.75);
    bar.fillRect(sprite.x - w / 2, sprite.y - sprite.displayHeight / 2 - 10, w, 6);
    const pct = hp / maxHp;
    bar.fillStyle(pct > 0.5 ? 0x22c55e : pct > 0.25 ? 0xf59e0b : 0xef4444, 1);
    bar.fillRect(sprite.x - w / 2, sprite.y - sprite.displayHeight / 2 - 10, Math.floor(w * pct), 6);
  }

  // ─── Update loop ──────────────────────────────────────────────────────────

  update() {
    if (this.gameEnded) return;
    const elapsed = (Date.now() - this.startTime) / 1000;
    const remaining = Math.max(0, this.maxGameTime - elapsed);
    this.timerTxt.setText(`${Math.ceil(remaining)}s`).setColor(remaining <= 8 ? '#ef4444' : '#64748b');
    if (remaining <= 0) { this.endGame(); return; }

    (this.enemies.getChildren() as Phaser.Physics.Arcade.Sprite[]).forEach((e) => {
      if (!e.active) return;
      const speed: number = e.getData('speed');
      const angle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
      (e.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      const hpBar = e.getData('hpBar') as Phaser.GameObjects.Graphics | undefined;
      if (hpBar) this.drawHpBar(e, hpBar);
    });
  }

  // ─── Game Over ────────────────────────────────────────────────────────────

  private async endGame() {
    if (this.gameEnded) return;
    this.gameEnded = true;

    this.passiveTimer?.remove(false); this.waveTimer?.remove(false);
    this.dashTimer?.remove(false); this.abilityTimerEvent?.remove(false);
    this.input.off('pointerdown', this.handlePointerDown, this);

    const duration = (Date.now() - this.startTime) / 1000;
    const survived = duration >= this.maxGameTime - 0.5;
    const rawSouls = Math.max(1, Math.floor(this.score / 10));
    const soulsEarned = Math.round(rawSouls * this.passive.soulsMultiplier);
    const userId = this.registry.get('userId') as string;
    const isNewHighScore = this.score > useGameStore.getState().highScore;

    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.65).setDepth(15);
    this.add.text(GAME_W / 2, GAME_H / 2 - 20, 'GAME OVER', {
      fontFamily: 'monospace', fontSize: '48px', fontStyle: 'bold', color: '#ef4444', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(16);

    // Consume one-time inventory items
    try {
      const store = useGameStore.getState();
      const oneTimeItems = [SHOP_ITEMS.time_extend.id, SHOP_ITEMS.hp_boost.id, SHOP_ITEMS.score_boost.id, SHOP_ITEMS.soul_amp.id, SHOP_ITEMS.start_shield.id];
      const inv = store.inventoryItems;
      const newInv = [...inv];
      oneTimeItems.forEach((item) => {
        const idx = newInv.indexOf(item);
        if (idx >= 0) newInv.splice(idx, 1);
      });
      if (newInv.length !== inv.length) {
        store.setInventoryItems(newInv);
        const { consumeInventoryItems } = await import('@/app/actions');
        await consumeInventoryItems(userId, oneTimeItems);
      }
    } catch { /* non-fatal */ }

    let newAchievements: string[] = [];
    try {
      if (duration >= 5) {
        const { submitGameResult } = await import('@/app/actions');
        const result = await submitGameResult({ userId, score: this.score, duration, wave: this.wave, kills: this.kills, survived });
        newAchievements = result.newAchievements ?? [];
      }
    } catch { /* non-fatal */ }

    useGameStore.getState().triggerGameOver({ score: this.score, soulsEarned, waveReached: this.wave, duration, isNewHighScore });

    this.time.delayedCall(1200, () => {
      this.scene.start('GameOverScene', {
        score: this.score, soulsEarned, waveReached: this.wave,
        duration: Math.floor(duration), userId, isNewHighScore,
        kills: this.kills, newAchievements,
      });
    });
  }

  // ─── Boss Kill Manifestation ──────────────────────────────────────────────

  private triggerBossKillManifestation(bx: number, by: number, wave: number, charId: string | null) {
    switch (charId) {
      case 'slime_hijau':  this.manifestSlimeHijau(bx, by); break;
      case 'slime_awan':   this.manifestSlimeAwan(bx, by); break;
      case 'slime_petir':  this.manifestSlimePetir(bx, by); break;
      case 'slime_baja':   this.manifestSlimeBaja(bx, by); break;
      case 'naga_lumpur':  this.manifestNagaLumpur(bx, by); break;
      case 'mecha_bot':    this.manifestMechaBot(bx, by); break;
      case 'slime_phoenix':this.manifestSlimePhoenix(bx, by); break;
      case 'slime_emas':   this.manifestSlimeEmas(bx, by); break;
      case 'dewa_slime':   this.manifestDewaSlime(bx, by); break;
      case 'apex':         this.manifestApex(bx, by, wave); break;
      default:             this.manifestDefault(bx, by); break;
    }
  }

  // ── slime_hijau: Speed Burst — green rings + velocity streaks ────────────
  private manifestSlimeHijau(bx: number, by: number) {
    // 5 expanding shockwave rings at different speeds
    for (let i = 0; i < 5; i++) {
      const ring = this.add.graphics().setDepth(12);
      ring.lineStyle(3 - i * 0.4, 0x00ff88, 1);
      ring.strokeCircle(bx, by, 10);
      const targetR = 120 + i * 60;
      const delay = i * 60;
      this.time.delayedCall(delay, () => {
        this.tweens.add({
          targets: ring,
          scaleX: targetR / 10, scaleY: targetR / 10,
          alpha: 0, duration: 500 - i * 40, ease: 'Cubic.easeOut',
          onComplete: () => ring.destroy(),
        });
      });
    }
    // Speed streaks radiating outward (8 directions)
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const streak = this.add.graphics().setDepth(12);
      streak.lineStyle(2, 0x44ff88, 0.9);
      streak.lineBetween(bx, by, bx + Math.cos(angle) * 20, by + Math.sin(angle) * 20);
      this.tweens.add({
        targets: streak,
        x: Math.cos(angle) * 180, y: Math.sin(angle) * 180,
        alpha: 0, duration: 380, ease: 'Cubic.easeOut',
        onComplete: () => streak.destroy(),
      });
    }
    this.spawnParticles(bx, by, 0x00ff88, 18);
    const t = this.add.text(bx, by - 60, 'SLIME RUSH!', {
      fontFamily: 'monospace', fontSize: '22px', fontStyle: 'bold',
      color: '#00ff88', stroke: '#004422', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(13);
    this.tweens.add({ targets: t, y: by - 110, alpha: 0, duration: 1100, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  // ── slime_awan: Cloud Veil — mist columns + shimmer rings ─────────────────
  private manifestSlimeAwan(bx: number, by: number) {
    // Soft cyan full-screen tint
    const overlay = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x93c5fd, 0).setDepth(11);
    this.tweens.add({ targets: overlay, alpha: 0.12, duration: 200, yoyo: true, hold: 300, onComplete: () => overlay.destroy() });

    // Cloud puffs rising
    for (let i = 0; i < 10; i++) {
      const cx = bx + Phaser.Math.Between(-70, 70);
      const r = Phaser.Math.Between(12, 28);
      const puff = this.add.graphics().setDepth(12);
      puff.fillStyle(0xbae6fd, 0.7);
      puff.fillCircle(cx, by, r);
      this.tweens.add({
        targets: puff,
        y: -(Phaser.Math.Between(80, 200)),
        alpha: 0, scaleX: 1.8, scaleY: 1.8,
        duration: Phaser.Math.Between(900, 1400), ease: 'Cubic.easeOut',
        delay: i * 80,
        onComplete: () => puff.destroy(),
      });
    }
    // Shimmer rings
    for (let i = 0; i < 3; i++) {
      const ring = this.add.graphics().setDepth(12);
      ring.lineStyle(2, 0xe0f2fe, 0.8);
      ring.strokeCircle(bx, by, 15);
      this.time.delayedCall(i * 150, () => {
        this.tweens.add({ targets: ring, scaleX: 14, scaleY: 14, alpha: 0, duration: 700, ease: 'Sine.easeOut', onComplete: () => ring.destroy() });
      });
    }
    this.spawnParticles(bx, by, 0x93c5fd, 14);
    const t = this.add.text(bx, by - 55, 'CLOUD VEIL', {
      fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold',
      color: '#bae6fd', stroke: '#0c4a6e', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(13);
    this.tweens.add({ targets: t, y: by - 105, alpha: 0, duration: 1200, ease: 'Sine.easeOut', onComplete: () => t.destroy() });
  }

  // ── slime_petir: Thunder Strike — lightning bolts + electric flash ────────
  private manifestSlimePetir(bx: number, by: number) {
    this.cameras.main.flash(180, 255, 255, 100);
    this.cameras.main.shake(300, 0.018);

    // Lightning bolt zig-zag lines (8 directions)
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const bolt = this.add.graphics().setDepth(13);
      bolt.lineStyle(3, 0xfbbf24, 1);
      let px = bx, py = by;
      for (let seg = 0; seg < 5; seg++) {
        const len = 30 + seg * 16;
        const jitter = (Math.random() - 0.5) * 28;
        const nx = px + Math.cos(angle) * len + Math.cos(angle + Math.PI / 2) * jitter;
        const ny = py + Math.sin(angle) * len + Math.sin(angle + Math.PI / 2) * jitter;
        bolt.lineBetween(px, py, nx, ny);
        px = nx; py = ny;
      }
      this.tweens.add({ targets: bolt, alpha: 0, duration: 350, delay: i * 30, onComplete: () => bolt.destroy() });
    }
    // Electric pulse rings
    for (let i = 0; i < 4; i++) {
      const ring = this.add.graphics().setDepth(12);
      ring.lineStyle(4, i % 2 === 0 ? 0xfbbf24 : 0xffffff, 1);
      ring.strokeCircle(bx, by, 8);
      this.time.delayedCall(i * 80, () => {
        this.tweens.add({ targets: ring, scaleX: 20, scaleY: 20, alpha: 0, duration: 400, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
      });
    }
    this.spawnParticles(bx, by, 0xfbbf24, 22);
    const t = this.add.text(bx, by - 65, '⚡ THUNDER STRIKE ⚡', {
      fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold',
      color: '#fbbf24', stroke: '#78350f', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(14);
    this.tweens.add({ targets: t, y: by - 120, alpha: 0, scaleX: 1.3, scaleY: 1.3, duration: 900, ease: 'Back.easeOut', onComplete: () => t.destroy() });
  }

  // ── slime_baja: Iron Fortress — steel shards + metallic rings ─────────────
  private manifestSlimeBaja(bx: number, by: number) {
    // Steel shard rectangles exploding outward
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + Phaser.Math.FloatBetween(-0.2, 0.2);
      const shard = this.add.graphics().setDepth(12);
      shard.fillStyle(0x94a3b8, 1);
      shard.fillRect(-4, -10, 8, 20);
      shard.x = bx; shard.y = by;
      shard.rotation = angle;
      const dist = Phaser.Math.Between(80, 180);
      this.tweens.add({
        targets: shard,
        x: bx + Math.cos(angle) * dist, y: by + Math.sin(angle) * dist,
        rotation: angle + Phaser.Math.FloatBetween(3, 8),
        alpha: 0, duration: Phaser.Math.Between(500, 800), ease: 'Cubic.easeOut',
        onComplete: () => shard.destroy(),
      });
    }
    // Concentric steel rings
    for (let i = 0; i < 3; i++) {
      const ring = this.add.graphics().setDepth(12);
      ring.lineStyle(5 - i, 0x818cf8, 1);
      ring.strokeCircle(bx, by, 10);
      this.time.delayedCall(i * 120, () => {
        this.tweens.add({ targets: ring, scaleX: 16, scaleY: 16, alpha: 0, duration: 550, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
      });
    }
    // Overlay flash
    const overlay = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x94a3b8, 0).setDepth(11);
    this.tweens.add({ targets: overlay, alpha: 0.15, duration: 80, yoyo: true, onComplete: () => overlay.destroy() });
    this.spawnParticles(bx, by, 0x818cf8, 16);
    const t = this.add.text(bx, by - 60, '🛡 IRON FORTRESS', {
      fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold',
      color: '#c7d2fe', stroke: '#1e1b4b', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(13);
    this.tweens.add({ targets: t, y: by - 115, alpha: 0, duration: 1000, onComplete: () => t.destroy() });
  }

  // ── naga_lumpur: Mud Swamp — slow ripples + mud splatter ─────────────────
  private manifestNagaLumpur(bx: number, by: number) {
    // Slow mud rings
    for (let i = 0; i < 5; i++) {
      const ring = this.add.graphics().setDepth(12);
      ring.lineStyle(6 - i, 0xa16207, 0.9);
      ring.strokeCircle(bx, by, 12);
      this.time.delayedCall(i * 180, () => {
        this.tweens.add({ targets: ring, scaleX: 14, scaleY: 14, alpha: 0, duration: 900, ease: 'Sine.easeOut', onComplete: () => ring.destroy() });
      });
    }
    // Mud droplets splattered around
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(20, 120);
      const drop = this.add.graphics().setDepth(12);
      drop.fillStyle(0x78350f, 0.85);
      const r = Phaser.Math.Between(4, 10);
      drop.fillCircle(bx + Math.cos(angle) * dist, by + Math.sin(angle) * dist, r);
      this.tweens.add({ targets: drop, alpha: 0, duration: Phaser.Math.Between(700, 1200), delay: i * 40, onComplete: () => drop.destroy() });
    }
    // Brown floor overlay
    const overlay = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x78350f, 0).setDepth(11);
    this.tweens.add({ targets: overlay, alpha: 0.1, duration: 300, yoyo: true, hold: 200, onComplete: () => overlay.destroy() });
    this.spawnParticles(bx, by, 0xa16207, 16);
    const t = this.add.text(bx, by - 55, 'MUD SWAMP', {
      fontFamily: 'monospace', fontSize: '22px', fontStyle: 'bold',
      color: '#d97706', stroke: '#431407', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(13);
    this.tweens.add({ targets: t, y: by - 105, alpha: 0, duration: 1200, ease: 'Sine.easeOut', onComplete: () => t.destroy() });
  }

  // ── mecha_bot: Laser Sweep — grid lines + mechanical squares ──────────────
  private manifestMechaBot(bx: number, by: number) {
    // Horizontal laser sweep
    const hLaser = this.add.graphics().setDepth(13);
    hLaser.fillStyle(0xa78bfa, 0.7);
    hLaser.fillRect(0, by - 3, GAME_W, 6);
    this.tweens.add({ targets: hLaser, alpha: 0, duration: 400, onComplete: () => hLaser.destroy() });
    // Vertical laser from boss position
    const vLaser = this.add.graphics().setDepth(13);
    vLaser.fillStyle(0xa78bfa, 0.7);
    vLaser.fillRect(bx - 3, 0, 6, GAME_H);
    this.tweens.add({ targets: vLaser, alpha: 0, duration: 350, delay: 80, onComplete: () => vLaser.destroy() });
    // Mechanical squares expanding
    for (let i = 0; i < 5; i++) {
      const sq = this.add.graphics().setDepth(12);
      sq.lineStyle(2, 0x7c3aed, 1);
      const size = 20 + i * 30;
      sq.strokeRect(bx - size / 2, by - size / 2, size, size);
      this.tweens.add({ targets: sq, scaleX: 4, scaleY: 4, alpha: 0, duration: 500, delay: i * 80, ease: 'Cubic.easeOut', onComplete: () => sq.destroy() });
    }
    // Crosshair flash at center
    this.cameras.main.flash(120, 167, 139, 250);
    this.spawnParticles(bx, by, 0xa78bfa, 16);
    const t = this.add.text(bx, by - 60, 'LASER SWEEP', {
      fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold',
      color: '#c4b5fd', stroke: '#2e1065', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(14);
    this.tweens.add({ targets: t, y: by - 115, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  // ── slime_phoenix: Blaze Heal — fire column rising ─────────────────────────
  private manifestSlimePhoenix(bx: number, by: number) {
    // Fire column — rectangle rising from kill point to top
    const col = this.add.graphics().setDepth(12);
    col.fillStyle(0xff6600, 0.6);
    col.fillRect(bx - 20, 0, 40, GAME_H);
    this.tweens.add({ targets: col, alpha: 0, scaleX: 2.5, duration: 700, ease: 'Cubic.easeOut', onComplete: () => col.destroy() });
    // Fire particles rising
    for (let i = 0; i < 20; i++) {
      const px = bx + Phaser.Math.Between(-30, 30);
      const p = this.add.image(px, by, 'particle').setTint(i % 2 === 0 ? 0xff6600 : 0xfbbf24).setScale(Phaser.Math.FloatBetween(1, 2.5)).setDepth(13);
      this.tweens.add({
        targets: p, x: px + Phaser.Math.Between(-20, 20), y: by - Phaser.Math.Between(120, 280),
        alpha: 0, scaleX: 0.2, scaleY: 0.2,
        duration: Phaser.Math.Between(700, 1200), delay: i * 40, ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }
    this.cameras.main.flash(150, 255, 102, 0);
    this.spawnParticles(bx, by, 0xff6600, 18);
    const t = this.add.text(bx, by - 65, '🔥 BLAZE HEAL 🔥', {
      fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold',
      color: '#fb923c', stroke: '#7c2d12', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(14);
    this.tweens.add({ targets: t, y: by - 120, alpha: 0, scaleX: 1.2, scaleY: 1.2, duration: 1100, ease: 'Back.easeOut', onComplete: () => t.destroy() });
  }

  // ── slime_emas: Gold Fever — coin rain + glitter shower ───────────────────
  private manifestSlimeEmas(bx: number, by: number) {
    // Gold coin burst from center
    for (let i = 0; i < 16; i++) {
      const coin = this.add.graphics().setDepth(13);
      coin.fillStyle(0xffd700, 1);
      coin.fillCircle(bx, by, Phaser.Math.Between(5, 10));
      coin.lineStyle(2, 0xfbbf24, 1);
      coin.strokeCircle(bx, by, Phaser.Math.Between(5, 10) + 2);
      const angle = (Math.PI * 2 * i) / 16;
      const dist = Phaser.Math.Between(60, 200);
      this.tweens.add({
        targets: coin,
        x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - Phaser.Math.Between(0, 80),
        alpha: 0, scaleX: 0.3, scaleY: 0.3, duration: Phaser.Math.Between(600, 1000), ease: 'Cubic.easeOut',
        onComplete: () => coin.destroy(),
      });
    }
    // Gold rain from top
    for (let i = 0; i < 20; i++) {
      const rx = Phaser.Math.Between(0, GAME_W);
      const rain = this.add.image(rx, 0, 'particle').setTint(0xffd700).setScale(Phaser.Math.FloatBetween(0.8, 2)).setDepth(12).setAlpha(0.9);
      this.tweens.add({
        targets: rain, y: Phaser.Math.Between(GAME_H / 3, GAME_H),
        alpha: 0, duration: Phaser.Math.Between(600, 1000), delay: i * 50, ease: 'Cubic.easeIn',
        onComplete: () => rain.destroy(),
      });
    }
    this.cameras.main.flash(100, 255, 215, 0);
    this.spawnParticles(bx, by, 0xffd700, 22);
    const t = this.add.text(bx, by - 60, '👑 GOLD FEVER 👑', {
      fontFamily: 'monospace', fontSize: '22px', fontStyle: 'bold',
      color: '#ffd700', stroke: '#78350f', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(14);
    this.tweens.add({ targets: t, y: by - 120, alpha: 0, scaleX: 1.4, scaleY: 1.4, duration: 1000, ease: 'Back.easeOut', onComplete: () => t.destroy() });
  }

  // ── dewa_slime: Divine Grace — holy pillar + descending rings ─────────────
  private manifestDewaSlime(bx: number, by: number) {
    // Divine pillar of light
    const pillar = this.add.graphics().setDepth(12);
    pillar.fillStyle(0xffffff, 0.4);
    pillar.fillRect(bx - 30, 0, 60, GAME_H);
    this.tweens.add({ targets: pillar, alpha: 0, scaleX: 3, duration: 900, ease: 'Cubic.easeOut', onComplete: () => pillar.destroy() });
    // Inner brighter core
    const core = this.add.graphics().setDepth(13);
    core.fillStyle(0xe0f2fe, 0.8);
    core.fillRect(bx - 10, 0, 20, GAME_H);
    this.tweens.add({ targets: core, alpha: 0, duration: 600, onComplete: () => core.destroy() });
    // Holy rings descending from top
    for (let i = 0; i < 5; i++) {
      const ring = this.add.graphics().setDepth(13);
      ring.lineStyle(3, 0xffffff, 0.9);
      ring.strokeCircle(bx, 0, 30 + i * 15);
      this.tweens.add({
        targets: ring, y: by + 50 + i * 20, alpha: 0,
        duration: 700, delay: i * 100, ease: 'Cubic.easeIn',
        onComplete: () => ring.destroy(),
      });
    }
    this.cameras.main.flash(250, 255, 255, 255);
    this.spawnParticles(bx, by, 0xe0f2fe, 20);
    const t = this.add.text(bx, by - 70, '✦ DIVINE GRACE ✦', {
      fontFamily: 'monospace', fontSize: '22px', fontStyle: 'bold',
      color: '#e0f2fe', stroke: '#0c4a6e', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(15);
    this.tweens.add({ targets: t, y: by - 135, alpha: 0, scaleX: 1.3, scaleY: 1.3, duration: 1300, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  // ── apex: ABSOLUTE ZERO — reality-breaking ice shattering ─────────────────
  private manifestApex(bx: number, by: number, wave: number) {
    // Full white freeze
    const freeze = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0xffffff, 0).setDepth(18);
    this.tweens.add({
      targets: freeze, alpha: 0.95, duration: 80,
      onComplete: () => {
        this.tweens.add({ targets: freeze, alpha: 0, duration: 400, delay: 120, ease: 'Cubic.easeOut', onComplete: () => freeze.destroy() });
      },
    });
    // Ice crystal shards — star shapes
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      const crystal = this.add.graphics().setDepth(17);
      crystal.lineStyle(2, 0xbae6fd, 1);
      const len = Phaser.Math.Between(20, 50);
      crystal.lineBetween(bx, by, bx + Math.cos(angle) * len, by + Math.sin(angle) * len);
      // Cross shard
      const ca = angle + Math.PI / 3;
      crystal.lineBetween(
        bx + Math.cos(angle) * len * 0.5, by + Math.sin(angle) * len * 0.5,
        bx + Math.cos(angle) * len * 0.5 + Math.cos(ca) * len * 0.3,
        by + Math.sin(angle) * len * 0.5 + Math.sin(ca) * len * 0.3,
      );
      const dist = Phaser.Math.Between(100, 280);
      this.tweens.add({
        targets: crystal,
        x: Math.cos(angle) * dist, y: Math.sin(angle) * dist,
        alpha: 0, duration: Phaser.Math.Between(700, 1200), ease: 'Cubic.easeOut',
        onComplete: () => crystal.destroy(),
      });
    }
    // Cold blue ring shockwaves
    for (let i = 0; i < 6; i++) {
      const ring = this.add.graphics().setDepth(17);
      ring.lineStyle(4, i % 2 === 0 ? 0xffffff : 0x7dd3fc, 1);
      ring.strokeCircle(bx, by, 5);
      this.time.delayedCall(i * 100, () => {
        this.tweens.add({ targets: ring, scaleX: 30, scaleY: 30, alpha: 0, duration: 700, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
      });
    }
    this.cameras.main.shake(800, 0.03);
    this.spawnParticles(bx, by, 0xffffff, 30);
    const waveBonus = wave * 2;
    const t = this.add.text(GAME_W / 2, GAME_H / 2, `❄ ABSOLUTE ZERO ❄`, {
      fontFamily: 'monospace', fontSize: '36px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#0369a1', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(19).setAlpha(0);
    this.tweens.add({
      targets: t, alpha: 1, scaleX: { from: 0.2, to: 1.1 }, scaleY: { from: 0.2, to: 1.1 },
      duration: 350, ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(600, () => {
          this.tweens.add({ targets: t, alpha: 0, y: GAME_H / 2 - 60, duration: 500, ease: 'Cubic.easeIn', onComplete: () => t.destroy() });
        });
      },
    });
    void waveBonus;
  }

  // ── Default: standard particle burst ──────────────────────────────────────
  private manifestDefault(bx: number, by: number) {
    for (let i = 0; i < 3; i++) {
      const ring = this.add.graphics().setDepth(12);
      ring.lineStyle(3, 0xff00ff, 1);
      ring.strokeCircle(bx, by, 10);
      this.time.delayedCall(i * 120, () => {
        this.tweens.add({ targets: ring, scaleX: 18, scaleY: 18, alpha: 0, duration: 500, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
      });
    }
    this.spawnParticles(bx, by, 0xff00ff, 20);
  }

  // ─── Character Boss-Kill Sounds (Web Audio synthesis) ─────────────────────

  private playCharacterBossKillSound(charId: string | null) {
    try {
      const mgr = this.sound as unknown as { context?: AudioContext };
      const ctx = mgr.context;
      if (!ctx || ctx.state === 'suspended') return;
      switch (charId) {
        case 'slime_hijau':   this.sfxSlimeHijau(ctx); break;
        case 'slime_awan':    this.sfxSlimeAwan(ctx); break;
        case 'slime_petir':   this.sfxSlimePetir(ctx); break;
        case 'slime_baja':    this.sfxSlimeBaja(ctx); break;
        case 'naga_lumpur':   this.sfxNagaLumpur(ctx); break;
        case 'mecha_bot':     this.sfxMechaBot(ctx); break;
        case 'slime_phoenix': this.sfxSlimePhoenix(ctx); break;
        case 'slime_emas':    this.sfxSlimeEmas(ctx); break;
        case 'dewa_slime':    this.sfxDewaSlime(ctx); break;
        case 'apex':          this.sfxApex(ctx); break;
        default:              this.sfxDefault(ctx); break;
      }
    } catch { /* Web Audio not available */ }
  }

  // slime_hijau: High-speed ascending whoosh
  private sfxSlimeHijau(ctx: AudioContext) {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.45, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2800, ctx.currentTime + 0.35);
    osc.connect(gain);
    osc.start(); osc.stop(ctx.currentTime + 0.45);
  }

  // slime_awan: Soft ethereal three-bell chime
  private sfxSlimeAwan(ctx: AudioContext) {
    [880, 1320, 1760].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.05 + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4 + i * 0.1);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + 1.5 + i * 0.1);
    });
  }

  // slime_petir: Thunder crack — noise burst + low rumble
  private sfxSlimePetir(ctx: AudioContext) {
    const bufSize = ctx.sampleRate * 0.3;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, ctx.currentTime);
    filter.Q.setValueAtTime(0.3, ctx.currentTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.9, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start(); src.stop(ctx.currentTime + 0.3);
    // Low rumble
    const osc = ctx.createOscillator();
    const gLow = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(60, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.5);
    gLow.gain.setValueAtTime(0.4, ctx.currentTime);
    gLow.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gLow); gLow.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
  }

  // slime_baja: Deep metallic CLANG via FM
  private sfxSlimeBaja(ctx: AudioContext) {
    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    const masterGain = ctx.createGain();
    modulator.frequency.setValueAtTime(180, ctx.currentTime);
    modGain.gain.setValueAtTime(800, ctx.currentTime);
    modGain.gain.exponentialRampToValueAtTime(10, ctx.currentTime + 0.6);
    carrier.frequency.setValueAtTime(220, ctx.currentTime);
    carrier.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.6);
    masterGain.gain.setValueAtTime(0.55, ctx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    modulator.connect(modGain); modGain.connect(carrier.frequency);
    carrier.connect(masterGain); masterGain.connect(ctx.destination);
    modulator.start(); modulator.stop(ctx.currentTime + 0.7);
    carrier.start(); carrier.stop(ctx.currentTime + 0.7);
  }

  // naga_lumpur: Deep wet splosh — low-pass noise thud
  private sfxNagaLumpur(ctx: AudioContext) {
    const bufSize = ctx.sampleRate * 0.5;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.4);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start(); src.stop(ctx.currentTime + 0.5);
    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(90, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);
    og.gain.setValueAtTime(0.5, ctx.currentTime);
    og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(og); og.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  }

  // mecha_bot: Electronic laser tone descending
  private sfxMechaBot(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(2200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.45);
    // Second pulse
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'square'; osc2.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.5);
    g2.gain.setValueAtTime(0.25, ctx.currentTime + 0.1);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc2.connect(g2); g2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1); osc2.stop(ctx.currentTime + 0.5);
  }

  // slime_phoenix: Fire screech — noise bandpass sweep up
  private sfxSlimePhoenix(ctx: AudioContext) {
    const bufSize = ctx.sampleRate * 0.8;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.5);
    filter.Q.setValueAtTime(3, ctx.currentTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start(); src.stop(ctx.currentTime + 0.8);
    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.4);
    og.gain.setValueAtTime(0.3, ctx.currentTime);
    og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(og); og.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
  }

  // slime_emas: Coin shower jingle — 5 sine notes in C major arpeggio
  private sfxSlimeEmas(ctx: AudioContext) {
    const notes = [523, 659, 784, 1047, 1319]; // C5 E5 G5 C6 E6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.07);
      gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + i * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.35);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.07);
      osc.stop(ctx.currentTime + i * 0.07 + 0.4);
    });
  }

  // dewa_slime: Heavenly choir chord — C major with slow attack
  private sfxDewaSlime(ctx: AudioContext) {
    const freqs = [261, 329, 392, 523, 659]; // C4 E4 G4 C5 E5
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.3 + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 1.8);
    });
  }

  // apex: ABSOLUTE ZERO — bass impact + icy screech + digital glitch
  private sfxApex(ctx: AudioContext) {
    // Massive bass drop
    const bass = ctx.createOscillator();
    const bg = ctx.createGain();
    bass.type = 'sine'; bass.frequency.setValueAtTime(80, ctx.currentTime);
    bass.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.7);
    bg.gain.setValueAtTime(0.8, ctx.currentTime);
    bg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    bass.connect(bg); bg.connect(ctx.destination);
    bass.start(); bass.stop(ctx.currentTime + 0.7);
    // Icy screech
    const screech = ctx.createOscillator();
    const sg = ctx.createGain();
    screech.type = 'sawtooth'; screech.frequency.setValueAtTime(3200, ctx.currentTime);
    screech.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.6);
    sg.gain.setValueAtTime(0.5, ctx.currentTime);
    sg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    screech.connect(sg); sg.connect(ctx.destination);
    screech.start(); screech.stop(ctx.currentTime + 0.6);
    // Digital glitch noise bursts
    for (let burst = 0; burst < 3; burst++) {
      const bSize = Math.floor(ctx.sampleRate * 0.06);
      const nbuf = ctx.createBuffer(1, bSize, ctx.sampleRate);
      const nd = nbuf.getChannelData(0);
      for (let i = 0; i < bSize; i++) nd[i] = Math.random() * 2 - 1;
      const nsrc = ctx.createBufferSource(); nsrc.buffer = nbuf;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.6 - burst * 0.15, ctx.currentTime + burst * 0.12);
      ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + burst * 0.12 + 0.06);
      nsrc.connect(ng); ng.connect(ctx.destination);
      nsrc.start(ctx.currentTime + burst * 0.12);
      nsrc.stop(ctx.currentTime + burst * 0.12 + 0.06);
    }
  }

  // default sound
  private sfxDefault(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.35);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private edgePos(): { x: number; y: number } {
    const pad = 12;
    switch (Phaser.Math.Between(0, 3)) {
      case 0: return { x: Phaser.Math.Between(MARGIN + pad, GAME_W - MARGIN - pad), y: MARGIN + pad };
      case 1: return { x: GAME_W - MARGIN - pad, y: Phaser.Math.Between(MARGIN + pad, GAME_H - MARGIN - pad) };
      case 2: return { x: Phaser.Math.Between(MARGIN + pad, GAME_W - MARGIN - pad), y: GAME_H - MARGIN - pad };
      default: return { x: MARGIN + pad, y: Phaser.Math.Between(MARGIN + pad, GAME_H - MARGIN - pad) };
    }
  }
}
