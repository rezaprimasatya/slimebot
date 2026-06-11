import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  create() {
    this.generateTextures();
    this.scene.start('ActionScene');
  }

  private g(): Phaser.GameObjects.Graphics {
    // add.graphics() creates and adds to display list; we destroy after generateTexture
    return this.add.graphics();
  }

  private generateTextures() {
    this.makePlayerTexture();
    this.makeEnemyBasicTexture();
    this.makeEnemySpikeTexture();
    this.makeEnemyGolemTexture();
    this.makeEnemyBossTexture();
    this.makeEnemyMutantTexture();
    this.makePickupHeartTexture();
    this.makePickupMultiplierTexture();
    this.makeParticleTexture();
    this.makeBackgroundTexture();
  }

  private makePlayerTexture() {
    const gfx = this.g();
    gfx.fillStyle(0x00ff88, 0.25);
    gfx.fillCircle(28, 28, 28);
    gfx.fillStyle(0x22dd66, 1);
    gfx.fillCircle(28, 28, 22);
    gfx.fillStyle(0xaaffcc, 0.7);
    gfx.fillCircle(22, 22, 8);
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(23, 26, 4);
    gfx.fillCircle(33, 26, 4);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(25, 24, 2);
    gfx.fillCircle(35, 24, 2);
    gfx.generateTexture('player', 56, 56);
    gfx.destroy();
  }

  private makeEnemyBasicTexture() {
    const gfx = this.g();
    gfx.fillStyle(0xff2222, 0.3);
    gfx.fillCircle(20, 20, 20);
    gfx.fillStyle(0xdd1111, 1);
    gfx.fillCircle(20, 20, 15);
    gfx.fillStyle(0xff6666, 0.6);
    gfx.fillCircle(15, 15, 6);
    gfx.fillStyle(0xffff00, 1);
    gfx.fillCircle(15, 18, 3);
    gfx.fillCircle(25, 18, 3);
    gfx.generateTexture('enemy_basic', 40, 40);
    gfx.destroy();
  }

  private makeEnemySpikeTexture() {
    const gfx = this.g();
    gfx.fillStyle(0xff7700, 1);
    gfx.fillTriangle(22, 4, 4, 40, 40, 40);
    gfx.fillStyle(0xffaa44, 0.7);
    gfx.fillTriangle(22, 12, 12, 36, 32, 36);
    gfx.fillStyle(0xffdd00, 1);
    gfx.fillCircle(22, 28, 3);
    gfx.generateTexture('enemy_spike', 44, 44);
    gfx.destroy();
  }

  private makeEnemyGolemTexture() {
    const gfx = this.g();
    gfx.fillStyle(0x660099, 0.35);
    gfx.fillRoundedRect(2, 2, 52, 52, 8);
    gfx.fillStyle(0x8800cc, 1);
    gfx.fillRoundedRect(6, 6, 44, 44, 6);
    gfx.fillStyle(0xaa44ff, 0.5);
    gfx.fillRoundedRect(10, 10, 20, 20, 4);
    gfx.fillStyle(0xff0000, 1);
    gfx.fillCircle(18, 30, 5);
    gfx.fillCircle(38, 30, 5);
    gfx.generateTexture('enemy_golem', 56, 56);
    gfx.destroy();
  }

  private makePickupHeartTexture() {
    const gfx = this.g();
    gfx.fillStyle(0xff3366, 1);
    gfx.fillCircle(10, 12, 9);
    gfx.fillCircle(22, 12, 9);
    gfx.fillTriangle(3, 16, 29, 16, 16, 30);
    gfx.fillStyle(0xff88aa, 0.6);
    gfx.fillCircle(10, 10, 4);
    gfx.generateTexture('pickup_heart', 32, 32);
    gfx.destroy();
  }

  private makePickupMultiplierTexture() {
    const gfx = this.g();
    // Draw star manually with triangles
    const cx = 16, cy = 16;
    gfx.fillStyle(0xffdd00, 1);
    // 5 triangles radiating from center
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const a1 = a - Math.PI / 5;
      const a2 = a + Math.PI / 5;
      gfx.fillTriangle(
        cx, cy,
        cx + Math.cos(a) * 14, cy + Math.sin(a) * 14,
        cx + Math.cos(a1) * 7, cy + Math.sin(a1) * 7
      );
      gfx.fillTriangle(
        cx, cy,
        cx + Math.cos(a) * 14, cy + Math.sin(a) * 14,
        cx + Math.cos(a2) * 7, cy + Math.sin(a2) * 7
      );
    }
    gfx.fillStyle(0xffffff, 0.4);
    gfx.fillCircle(cx, cy, 4);
    gfx.generateTexture('pickup_multi', 32, 32);
    gfx.destroy();
  }

  private makeParticleTexture() {
    const gfx = this.g();
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(4, 4, 4);
    gfx.generateTexture('particle', 8, 8);
    gfx.destroy();
  }

  private makeEnemyBossTexture() {
    const gfx = this.g();
    // Outer aura
    gfx.fillStyle(0xff0066, 0.2);
    gfx.fillCircle(32, 32, 32);
    // Body
    gfx.fillStyle(0xcc0044, 1);
    gfx.fillCircle(32, 32, 26);
    // Inner core
    gfx.fillStyle(0xff4499, 0.6);
    gfx.fillCircle(26, 26, 12);
    // Crown spikes
    gfx.fillStyle(0xff6600, 1);
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      gfx.fillTriangle(
        32 + Math.cos(a) * 22, 32 + Math.sin(a) * 22,
        32 + Math.cos(a - 0.3) * 16, 32 + Math.sin(a - 0.3) * 16,
        32 + Math.cos(a + 0.3) * 16, 32 + Math.sin(a + 0.3) * 16,
      );
    }
    // Eyes
    gfx.fillStyle(0xffff00, 1);
    gfx.fillCircle(26, 30, 5);
    gfx.fillCircle(38, 30, 5);
    gfx.fillStyle(0xff0000, 1);
    gfx.fillCircle(27, 30, 3);
    gfx.fillCircle(39, 30, 3);
    gfx.generateTexture('enemy_boss', 64, 64);
    gfx.destroy();
  }

  private makeEnemyMutantTexture() {
    const gfx = this.g();
    // Mini version of boss — fuchsia
    gfx.fillStyle(0xee00ff, 0.3);
    gfx.fillCircle(14, 14, 14);
    gfx.fillStyle(0xcc00dd, 1);
    gfx.fillCircle(14, 14, 10);
    gfx.fillStyle(0xff66ff, 0.5);
    gfx.fillCircle(10, 10, 5);
    // Small spikes
    gfx.fillStyle(0xff00aa, 1);
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI * 2 * i) / 4;
      gfx.fillTriangle(
        14 + Math.cos(a) * 12, 14 + Math.sin(a) * 12,
        14 + Math.cos(a - 0.4) * 8, 14 + Math.sin(a - 0.4) * 8,
        14 + Math.cos(a + 0.4) * 8, 14 + Math.sin(a + 0.4) * 8,
      );
    }
    gfx.generateTexture('enemy_mutant', 28, 28);
    gfx.destroy();
  }

  private makeBackgroundTexture() {
    const gfx = this.g();
    gfx.fillStyle(0x0f172a, 1);
    gfx.fillRect(0, 0, 800, 600);
    gfx.lineStyle(1, 0x1e293b, 1);
    for (let x = 0; x <= 800; x += 40) gfx.lineBetween(x, 0, x, 600);
    for (let y = 0; y <= 600; y += 40) gfx.lineBetween(0, y, 800, y);
    gfx.lineStyle(3, 0x334155, 1);
    gfx.strokeRect(1, 1, 798, 598);
    gfx.generateTexture('background', 800, 600);
    gfx.destroy();
  }
}
