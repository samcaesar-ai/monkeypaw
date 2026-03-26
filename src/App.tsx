/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RotateCcw, Loader2, Eye } from 'lucide-react';
import WishOcean from './components/WishOcean';

export default function App() {
  const [wish, setWish] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [result, setResult] = useState<{ text: string; imagePrompt?: string; imageUrl?: string } | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oceanRefreshKey, setOceanRefreshKey] = useState(0);
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
      setResult({ text: data.text, imagePrompt: data.imagePrompt });
      setOceanRefreshKey(k => k + 1);
    } catch (err) {
      console.error(err);
      setError("The paw twitches, but the universe remains silent. Try again.");
    } finally {
      setIsGranting(false);
    }
  };

  const handleVisualise = async () => {
    if (!result?.imagePrompt) return;
    setIsGeneratingImage(true);
    try {
      const response = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: result.imagePrompt }),
      });
      if (!response.ok) throw new Error('Image generation failed');
      const data = await response.json();
      setResult(prev => prev ? { ...prev, imageUrl: data.imageUrl } : prev);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const reset = () => {
    setWish('');
    setResult(null);
    setError(null);
    setIsGeneratingImage(false);
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

      {/* Wish Ocean — past wishes floating in the dark */}
      <WishOcean refreshKey={oceanRefreshKey} />
      
      <main className="max-w-2xl w-full relative z-10">
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center space-y-8 md:space-y-12"
            >
              {/* The Paw Sketch */}
              <div className="relative w-56 h-56 md:w-80 md:h-80 max-w-[90vw]">
                <motion.div
                  animate={isGranting ? {
                    rotate: [0, -1, 1, -1, 0],
                    scale: [1, 1.02, 1],
                    filter: ["brightness(1) contrast(1)", "brightness(1.1) contrast(1.2)", "brightness(1) contrast(1)"]
                  } : {
                    rotate: [0, -0.2, 0, 0.2, 0],
                  }}
                  transition={isGranting
                    ? { repeat: Infinity, duration: 1.5 }
                    : { repeat: Infinity, duration: 9, ease: "easeInOut" }
                  }
                  className="w-full h-full flex items-center justify-center rounded-xl overflow-hidden border border-[#222] shadow-[0_0_30px_rgba(0,0,0,0.8)]"
                >
                  <img 
                    src="/paw.png" 
                    alt="Anatomical Monkey's Paw" 
                    className="w-full h-full object-cover grayscale opacity-90 transition-all duration-1000 hover:grayscale-0"
                  />
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
                    className="w-full bg-transparent border-b border-[#333] py-4 px-2 text-lg md:text-2xl text-center focus:outline-none focus:border-[#666] transition-colors placeholder:italic placeholder:text-[#333] disabled:opacity-50"
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

              {result.imagePrompt && !result.imageUrl && (
                <div className="flex justify-center">
                  <button
                    onClick={handleVisualise}
                    disabled={isGeneratingImage}
                    className="group relative px-8 py-3 overflow-hidden rounded-full border border-[#222] hover:border-[#555] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="relative z-10 flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-[#555] group-hover:text-[#aaa] transition-colors">
                      {isGeneratingImage ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Manifesting...
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          Visualise the Horror
                        </>
                      )}
                    </span>
                    <div className="absolute inset-0 bg-white/[0.03] translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  </button>
                </div>
              )}

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

      {/* WYR Link */}
      <a
        href="#wyr"
        className="fixed top-6 right-6 z-50 px-4 py-2 border border-[#222] hover:border-[#555] rounded-full text-[#444] hover:text-[#888] transition-all text-xs uppercase tracking-[0.2em]"
      >
        WYR
      </a>

      {/* Footer Decoration */}
      <footer className="fixed bottom-8 text-[10px] uppercase tracking-[0.5em] text-[#222] pointer-events-none">
        The Universe is Precise
      </footer>
    </div>
  );
}
