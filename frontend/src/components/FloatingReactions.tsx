import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { ReactionItem } from '../types';

interface FloatingReactionsProps {
  latestReaction: ReactionItem | null;
}

interface FloatingEmoji {
  id: string;
  emoji: string;
  username: string;
  leftPercent: number;
}

export const FloatingReactions: React.FC<FloatingReactionsProps> = ({ latestReaction }) => {
  const [floatingList, setFloatingList] = useState<FloatingEmoji[]>([]);

  useEffect(() => {
    if (!latestReaction) return;

    // Trigger canvas confetti if celebration emoji
    if (latestReaction.emoji === '🎉' || latestReaction.emoji === '🚀') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.85 }
      });
    }

    const newEmoji: FloatingEmoji = {
      id: latestReaction.id || Math.random().toString(),
      emoji: latestReaction.emoji,
      username: latestReaction.username,
      leftPercent: 15 + Math.random() * 70 // between 15% and 85% width
    };

    setFloatingList((prev) => [...prev, newEmoji]);

    const timer = setTimeout(() => {
      setFloatingList((prev) => prev.filter((item) => item.id !== newEmoji.id));
    }, 2800);

    return () => clearTimeout(timer);
  }, [latestReaction]);

  return (
    <div className="floating-reactions-overlay">
      {floatingList.map((item) => (
        <div
          key={item.id}
          className="floating-emoji-item animate-float-up"
          style={{ left: `${item.leftPercent}%` }}
        >
          <span className="emoji-char">{item.emoji}</span>
          <span className="emoji-user">{item.username}</span>
        </div>
      ))}
    </div>
  );
};
