'use client';
import { useEffect, useRef } from 'react';

interface PhaserGameProps {
  userId: string;
  username: string;
}

export default function PhaserGame({ userId, username }: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current || !containerRef.current) return;

    let cancelled = false;

    (async () => {
      const Phaser = (await import('phaser')).default;
      const { default: PreloadScene } = await import('../game/scenes/PreloadScene');
      const { default: ActionScene } = await import('../game/scenes/ActionScene');
      const { default: GameOverScene } = await import('../game/scenes/GameOverScene');

      if (cancelled || !containerRef.current) return;

      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: containerRef.current,
        backgroundColor: '#0a0f1e',
        physics: {
          default: 'arcade',
          arcade: { debug: false, gravity: { x: 0, y: 0 } },
        },
        scene: [PreloadScene, ActionScene, GameOverScene],
        callbacks: {
          postBoot: (game) => {
            game.registry.set('userId', userId);
            game.registry.set('username', username);
          },
        },
      });
    })();

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  // userId and username are stable after mount — intentionally not in deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-[800px] h-[600px] rounded-xl overflow-hidden shadow-2xl shadow-black/60 border border-slate-700"
    />
  );
}
