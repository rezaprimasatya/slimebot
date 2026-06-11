import Phaser from 'phaser';
import { useGameStore } from './GameState';

interface GameOverData {
  score: number;
  soulsEarned: number;
  waveReached: number;
  duration: number;
  userId: string;
  isNewHighScore: boolean;
}

const W = 800;
const H = 600;

export default class GameOverScene extends Phaser.Scene {
  private result!: GameOverData;

  constructor() {
    super('GameOverScene');
  }

  init(initData?: object) {
    this.result = (initData ?? {}) as GameOverData;
  }

  create() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0f1e, 0.97).setDepth(0);

    const titleColor = (this.result.score ?? 0) > 0 ? '#f97316' : '#ef4444';
    const title = this.add
      .text(W / 2, 80, 'GAME OVER', {
        fontFamily: 'monospace',
        fontSize: '52px',
        fontStyle: 'bold',
        color: titleColor,
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(1)
      .setAlpha(0);

    this.tweens.add({
      targets: title,
      alpha: 1,
      scaleX: { from: 0.3, to: 1 },
      scaleY: { from: 0.3, to: 1 },
      duration: 500,
      ease: 'Back.easeOut',
    });

    if (this.result.isNewHighScore) {
      const badge = this.add
        .text(W / 2, 140, '★ REKOR BARU! ★', {
          fontFamily: 'monospace',
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#facc15',
          stroke: '#78350f',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(1)
        .setAlpha(0);

      this.tweens.add({
        targets: badge,
        alpha: 1,
        duration: 600,
        delay: 400,
        onComplete: () => {
          this.tweens.add({
            targets: badge,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 600,
            yoyo: true,
            repeat: -1,
          });
        },
      });
    }

    const panelY = this.result.isNewHighScore ? 185 : 165;
    this.buildStatsPanel(panelY);
    this.buildButtons();
    this.spawnResultParticles();
  }

  private buildStatsPanel(panelY: number) {
    this.add
      .rectangle(W / 2, panelY + 90, 420, 195, 0x1e293b, 0.9)
      .setStrokeStyle(1.5, 0x334155)
      .setDepth(1);

    const rows: [string, string, string][] = [
      ['Skor', String(this.result.score ?? 0), '#facc15'],
      ['Wave Dicapai', String(this.result.waveReached ?? 0), '#a78bfa'],
      ['Souls Diperoleh', `+${this.result.soulsEarned ?? 0} 💧`, '#22d3ee'],
      ['Durasi', `${this.result.duration ?? 0}s`, '#94a3b8'],
    ];

    const startY = panelY + 20;
    rows.forEach(([label, value, color], i) => {
      const y = startY + i * 42;
      this.add
        .text(W / 2 - 170, y, label, { fontFamily: 'monospace', fontSize: '18px', color: '#64748b' })
        .setDepth(2);

      const valTxt = this.add
        .text(W / 2 + 170, y, value, {
          fontFamily: 'monospace',
          fontSize: '18px',
          fontStyle: 'bold',
          color,
        })
        .setOrigin(1, 0)
        .setDepth(2)
        .setAlpha(0);

      this.tweens.add({
        targets: valTxt,
        alpha: 1,
        x: { from: W / 2 + 200, to: W / 2 + 170 },
        duration: 400,
        delay: 300 + i * 120,
        ease: 'Cubic.easeOut',
      });
    });
  }

  private buildButtons() {
    const btnY = 470;

    const playAgainBtn = this.createButton(W / 2 - 110, btnY, 'Main Lagi', 0x16a34a, 0x15803d);
    playAgainBtn.on('pointerdown', () => {
      this.cameras.main.fade(300, 0, 0, 0, false, (_cam: unknown, progress: number) => {
        if (progress === 1) this.scene.start('ActionScene');
      });
    });

    const menuBtn = this.createButton(W / 2 + 110, btnY, 'Menu Utama', 0x1d4ed8, 0x1e40af);
    menuBtn.on('pointerdown', () => {
      this.cameras.main.fade(300, 0, 0, 0, false, (_cam: unknown, progress: number) => {
        if (progress === 1) {
          useGameStore.getState().setShowHub(true);
          this.scene.stop('GameOverScene');
        }
      });
    });

    this.add
      .text(W / 2, H - 24, 'Klik "Menu Utama" untuk Gacha & koleksi karakter', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#475569',
      })
      .setOrigin(0.5)
      .setDepth(2);
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    color: number,
    hoverColor: number
  ): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(0, 0, 190, 52, color).setStrokeStyle(2, 0xffffff, 0.2);
    const txt = this.add
      .text(0, 0, label, {
        fontFamily: 'monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const container = this.add.container(x, y, [bg, txt]).setDepth(3).setSize(190, 52);
    container.setInteractive();

    container.on('pointerover', () => {
      bg.setFillStyle(hoverColor);
      this.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, duration: 100 });
    });
    container.on('pointerout', () => {
      bg.setFillStyle(color);
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100 });
    });

    this.tweens.add({
      targets: container,
      alpha: { from: 0, to: 1 },
      y: { from: y + 20, to: y },
      duration: 500,
      delay: 800,
      ease: 'Back.easeOut',
    });

    return container;
  }

  private spawnResultParticles() {
    const count = (this.result.score ?? 0) > 500 ? 30 : 15;
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(50, W - 50);
      const p = this.add
        .image(x, H + 20, 'particle')
        .setTint([0xfacc15, 0x22d3ee, 0xa78bfa, 0xf97316][Phaser.Math.Between(0, 3)])
        .setScale(Phaser.Math.FloatBetween(0.8, 2.5))
        .setAlpha(0.8)
        .setDepth(0);

      this.tweens.add({
        targets: p,
        y: Phaser.Math.Between(-20, -100),
        x: x + Phaser.Math.Between(-60, 60),
        alpha: 0,
        duration: Phaser.Math.Between(1200, 2800),
        delay: Phaser.Math.Between(0, 2000),
        repeat: -1,
        onRepeat: (tween: Phaser.Tweens.Tween) => {
          const newX = Phaser.Math.Between(50, W - 50);
          (tween.targets[0] as Phaser.GameObjects.Image).setPosition(newX, H + 20);
        },
      });
    }
  }
}
