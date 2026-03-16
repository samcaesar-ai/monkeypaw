import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface WishEntry {
  id: string;
  wish: string;
  story: string;
  timestamp: number;
}

// Ghost wishes — always visible as the deep background layer
const GHOST_WISHES: WishEntry[] = [
  "I wish I never had to work again",
  "I wish for infinite money",
  "I wish I could live forever",
  "I wish to be famous",
  "I wish I could fly",
  "I wish for world peace",
  "I wish I was the smartest person alive",
  "I wish to be irresistible to everyone",
  "I wish I never felt pain",
  "I wish for more time",
  "I wish I could turn back time",
  "I wish to know everything",
  "I wish my enemies would disappear",
  "I wish I could eat anything without gaining weight",
  "I wish to be the most powerful person on earth",
  "I wish I never had to sleep",
  "I wish I could speak every language",
  "I wish for a perfect memory",
  "I wish I was never wrong",
  "I wish to never feel lonely again",
].map((wish, i) => ({
  id: `ghost-${i}`,
  wish,
  story: '',
  timestamp: 0,
}));

// Deterministic pseudo-random from a string + offset
function seededRand(str: string, offset: number): number {
  let hash = offset * 2654435761;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(hash ^ str.charCodeAt(i), 2654435761)) | 0;
  }
  return (Math.abs(hash) % 100000) / 100000;
}

interface BubbleProps {
  entry: WishEntry;
  depth: number; // 0 = newest/top/clear, 1 = oldest/bottom/blurry
  onClick: () => void;
}

function WishBubble({ entry, depth, onClick }: BubbleProps) {
  const opacity = 0.07 + (1 - depth) * 0.53;         // 0.07 → 0.60
  const blur = depth * 3.5;                           // 0 → 3.5px
  const fontSize = 9 + (1 - depth) * 5;              // 9 → 14px
  const glowStrength = (1 - depth) * 0.18;

  // x: purely random per wish
  const xPos = 4 + seededRand(entry.wish, 1) * 82;   // 4%–86%
  // y: depth-correlated (newest at top), with slight randomness
  const yBase = depth * 76;                           // 0% → 76%
  const yJitter = (seededRand(entry.wish, 2) - 0.5) * 18;
  const yPos = Math.max(2, Math.min(92, yBase + yJitter + 4));

  // Drift animation (different speed/phase per bubble)
  const driftX = (seededRand(entry.wish, 3) - 0.5) * 44;
  const driftDuration = 9 + seededRand(entry.wish, 4) * 12;
  const phaseShift = seededRand(entry.wish, 5) * -driftDuration;

  const truncated = entry.wish.length > 30
    ? entry.wish.slice(0, 30) + '…'
    : entry.wish;

  return (
    <motion.button
      onClick={onClick}
      className="absolute font-serif italic leading-none pointer-events-auto"
      style={{
        left: `${xPos}%`,
        top: `${yPos}%`,
        transform: 'translate(-50%, -50%)',
        opacity,
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
        fontSize: `${fontSize}px`,
        zIndex: Math.round((1 - depth) * 8) + 1,
      }}
      animate={{
        x: [0, driftX, 0, -driftX * 0.7, 0],
        y: [0, -7, -2, 6, 0],
      }}
      transition={{
        duration: driftDuration,
        ease: 'easeInOut',
        repeat: Infinity,
        delay: phaseShift,
      }}
      title={entry.wish}
    >
      <span
        className="block px-2.5 py-1 rounded-full whitespace-nowrap"
        style={{
          color: `rgba(160, 185, 220, ${0.5 + (1 - depth) * 0.5})`,
          background: `rgba(30, 50, 90, ${0.02 + (1 - depth) * 0.07})`,
          border: `1px solid rgba(80, 120, 190, ${0.04 + (1 - depth) * 0.14})`,
          boxShadow: glowStrength > 0
            ? `0 0 ${10 + (1 - depth) * 18}px rgba(70, 110, 200, ${glowStrength})`
            : undefined,
        }}
      >
        {truncated}
      </span>
    </motion.button>
  );
}

interface WishModalProps {
  entry: WishEntry;
  onClose: () => void;
}

function WishModal({ entry, onClose }: WishModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center p-6"
      style={{ zIndex: 50 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[#0a0a0a]/85 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="relative max-w-lg w-full max-h-[80vh] overflow-y-auto rounded-lg border border-[#222] bg-[#0d0d0d] p-8 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[#444] text-[10px] uppercase tracking-[0.35em]">A wish was made</p>
        <p className="text-[#e0e0e0] font-serif font-medium italic text-lg border-l-2 border-[#333] pl-4 leading-snug">
          "{entry.wish}"
        </p>
        <div className="text-[#888] text-sm leading-relaxed space-y-3 font-serif">
          {entry.story.split('\n').filter(Boolean).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <button
          onClick={onClose}
          className="text-[#444] hover:text-[#777] text-[10px] uppercase tracking-[0.35em] transition-colors"
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}

interface WishOceanProps {
  refreshKey?: number;
}

export default function WishOcean({ refreshKey = 0 }: WishOceanProps) {
  const [wishes, setWishes] = useState<WishEntry[]>([]);
  const [selected, setSelected] = useState<WishEntry | null>(null);

  const fetchWishes = useCallback(async () => {
    try {
      const res = await fetch('/api/wishes');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setWishes(data);
      }
    } catch {
      // silently ignore — feature degrades gracefully
    }
  }, []);

  useEffect(() => {
    fetchWishes();
  }, [fetchWishes, refreshKey]);

  // Pad with ghost wishes so the ocean always has atmosphere
  const ghostsNeeded = Math.max(0, 20 - wishes.length);
  const displayed = [
    ...wishes,
    ...GHOST_WISHES.slice(0, ghostsNeeded),
  ];

  const total = displayed.length;

  return (
    <>
      {/* Ocean layer — pointer-events-none on container, auto on bubbles */}
      <div
        className="fixed inset-0 overflow-hidden pointer-events-none"
        style={{ zIndex: 1 }}
        aria-hidden="true"
      >
        {displayed.map((entry, index) => {
          const depth = total > 1 ? index / (total - 1) : 0;
          return (
            <WishBubble
              key={entry.id}
              entry={entry}
              depth={depth}
              onClick={() => entry.story ? setSelected(entry) : undefined}
            />
          );
        })}
      </div>

      <AnimatePresence>
        {selected && (
          <WishModal entry={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
