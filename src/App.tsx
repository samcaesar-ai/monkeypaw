/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RotateCcw, Loader2 } from 'lucide-react';

export default function App() {
  const [wish, setWish] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [result, setResult] = useState<{ text: string; imageUrl?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleWish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wish.trim()) return;

    setIsGranting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/wish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wish }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch from the universe.');
      }
      
      const data = await response.json();
      setResult({ text: data.text, imageUrl: data.imageUrl });
    } catch (err) {
      console.error(err);
      setError("The paw twitches, but the universe remains silent. Try again.");
    } finally {
      setIsGranting(false);
    }
  };

  const reset = () => {
    setWish('');
    setResult(null);
    setError(null);
  };

  useEffect(() => {
    if (result && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [result]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#d4d4d4] font-serif selection:bg-[#333] selection:text-[#fff] flex flex-variable flex-col items-center justify-center p-6 overflow-x-hidden">
      {/* Background Texture */}
      <div className="fixed inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')]" />
      
      <main className="max-w-2xl w-full relative z-10">
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center space-y-12"
            >
              {/* The Paw Sketch */}
              <div className="relative w-56 h-72">
                <motion.div
                  animate={isGranting ? {
                    rotate: [0, -3, 3, -3, 0],
                    scale: [1, 1.05, 1],
                    filter: ["brightness(1)", "brightness(1.6)", "brightness(1)"]
                  } : {
                    rotate: [0, -0.6, 0, 0.6, 0],
                  }}
                  transition={isGranting
                    ? { repeat: Infinity, duration: 1.5 }
                    : { repeat: Infinity, duration: 9, ease: "easeInOut" }
                  }
                  className="w-full h-full flex items-center justify-center"
                >
                  <svg viewBox="0 0 200 220" fill="none" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full text-[#505050] drop-shadow-[0_0_20px_rgba(255,255,255,0.08)]">
                    {/* Palm */}
                    <path stroke="currentColor" strokeWidth="1.6"
                      d="M 76,138 C 70,152 67,168 69,182 C 71,194 79,200 90,202 C 94,204 106,204 110,202 C 121,200 129,194 131,182 C 133,168 130,152 124,142" />
                    {/* Index finger */}
                    <path stroke="currentColor" strokeWidth="1.5"
                      d="M 76,138 C 74,120 72,100 73,84 C 74,70 78,64 84,62 C 90,60 95,66 96,80 C 97,94 95,116 93,136" />
                    {/* Middle finger */}
                    <path stroke="currentColor" strokeWidth="1.5"
                      d="M 88,133 C 87,114 86,90 87,70 C 88,56 93,50 100,50 C 107,50 112,56 113,70 C 114,90 113,114 112,133" />
                    {/* Ring finger */}
                    <path stroke="currentColor" strokeWidth="1.5"
                      d="M 104,136 C 105,116 107,94 109,76 C 111,64 115,58 121,60 C 127,62 130,70 129,84 C 128,100 126,120 124,138" />
                    {/* Pinky */}
                    <path stroke="currentColor" strokeWidth="1.5"
                      d="M 118,142 C 120,126 122,110 122,98 C 122,86 126,78 132,78 C 138,78 141,86 141,98 C 141,110 139,128 137,144" />
                    {/* Thumb */}
                    <path stroke="currentColor" strokeWidth="1.5"
                      d="M 68,164 C 60,158 50,152 44,146 C 38,140 38,131 45,127 C 52,123 61,126 67,134 C 71,140 71,152 69,163" />
                    {/* Knuckle lines — index */}
                    <path stroke="currentColor" strokeWidth="0.8" d="M 73,100 C 78,97 89,97 95,100" />
                    <path stroke="currentColor" strokeWidth="0.8" d="M 73,82 C 78,79 89,79 95,82" />
                    {/* Knuckle lines — middle */}
                    <path stroke="currentColor" strokeWidth="0.8" d="M 87,90 C 93,87 107,87 113,90" />
                    <path stroke="currentColor" strokeWidth="0.8" d="M 87,70 C 93,67 107,67 113,70" />
                    {/* Knuckle lines — ring */}
                    <path stroke="currentColor" strokeWidth="0.8" d="M 107,92 C 112,89 123,89 129,92" />
                    <path stroke="currentColor" strokeWidth="0.8" d="M 109,74 C 114,71 124,71 129,74" />
                    {/* Knuckle lines — pinky */}
                    <path stroke="currentColor" strokeWidth="0.8" d="M 122,104 C 126,101 135,101 140,104" />
                    {/* Palm crease lines */}
                    <path stroke="currentColor" strokeWidth="0.7" d="M 74,170 C 86,166 114,166 126,170" />
                    <path stroke="currentColor" strokeWidth="0.7" d="M 72,182 C 85,178 115,178 128,182" />
                    {/* Wrist fur */}
                    <path stroke="currentColor" strokeWidth="0.7" d="M 86,202 C 85,207 85,210 83,214" />
                    <path stroke="currentColor" strokeWidth="0.7" d="M 93,203 C 92,208 92,211 91,215" />
                    <path stroke="currentColor" strokeWidth="0.7" d="M 100,204 C 100,209 100,212 100,216" />
                    <path stroke="currentColor" strokeWidth="0.7" d="M 107,203 C 108,208 108,211 109,215" />
                    <path stroke="currentColor" strokeWidth="0.7" d="M 114,202 C 115,207 116,210 118,214" />
                    {/* Sketch texture — ghost lines for hand-drawn feel */}
                    <path stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" d="M 77,142 C 72,154 69,166 70,180" />
                    <path stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" d="M 123,146 C 127,156 130,168 129,180" />
                  </svg>
                </motion.div>
                {isGranting && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="w-full h-full bg-white/5 blur-3xl rounded-full animate-pulse" />
                  </motion.div>
                )}
              </div>

              <form onSubmit={handleWish} className="w-full space-y-6">
                <div className="relative group">
                  <input
                    type="text"
                    value={wish}
                    onChange={(e) => setWish(e.target.value)}
                    placeholder="what do you wish for..."
                    disabled={isGranting}
                    className="w-full bg-transparent border-b border-[#333] py-4 px-2 text-xl md:text-2xl text-center focus:outline-none focus:border-[#666] transition-colors placeholder:italic placeholder:text-[#333] disabled:opacity-50"
                  />
                  <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-[#888] transition-all duration-500 group-focus-within:w-full" />
                </div>

                <div className="flex justify-center">
                  <button
                    type="submit"
                    disabled={isGranting || !wish.trim()}
                    className="group relative px-8 py-3 overflow-hidden rounded-full border border-[#333] hover:border-[#666] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span className="relative z-10 flex items-center gap-2 text-sm uppercase tracking-[0.2em]">
                      {isGranting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          The Paw Twitches
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Grant My Wish
                        </>
                      )}
                    </span>
                    <div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  </button>
                </div>
              </form>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-900/60 text-sm italic"
                >
                  {error}
                </motion.p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12 py-12"
            >
              <div className="space-y-8 leading-relaxed text-lg md:text-xl font-light text-[#b4b4b4]">
                {result.text.split('\n').map((paragraph, i) => (
                  <p key={i} className={i === 0 ? "text-[#fff] font-medium italic mb-12 border-l-2 border-[#333] pl-6" : ""}>
                    {paragraph}
                  </p>
                ))}
              </div>

              {result.imageUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative aspect-square md:aspect-video w-full overflow-hidden rounded-lg border border-[#222] shadow-2xl"
                >
                  <img
                    src={result.imageUrl}
                    alt="The final scene"
                    className="w-full h-full object-cover opacity-80 grayscale hover:grayscale-0 transition-all duration-1000"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-60" />
                </motion.div>
              )}

              <div ref={scrollRef} className="flex justify-center pt-12">
                <button
                  onClick={reset}
                  className="group flex items-center gap-3 text-[#555] hover:text-[#aaa] transition-colors uppercase tracking-[0.3em] text-xs"
                >
                  <RotateCcw className="w-4 h-4 group-hover:rotate-[-180deg] transition-transform duration-500" />
                  Make Another Wish
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Decoration */}
      <footer className="fixed bottom-8 text-[10px] uppercase tracking-[0.5em] text-[#222] pointer-events-none">
        The Universe is Precise
      </footer>
    </div>
  );
}
