/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RotateCcw, Loader2 } from 'lucide-react';

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SYSTEM_INSTRUCTION = `You are the spirit of the Monkey's Paw. 
You grant wishes exactly as stated, interpreting every wish literally with no generosity of intent. 
You do not invent random punishments. Instead, you identify hidden assumptions, loopholes, or unintended consequences embedded within the wording of the wish.
Your goal is irony, not cruelty. The outcome must feel inevitable in hindsight.
The tone should be eerie, restrained, and intelligent.
The cost may be emotional, social, existential, practical, or moral.
Do not moralize. Simply unfold consequences.

When responding:
1. Begin by briefly restating the wish.
2. Then write a short story (200–400 words) describing how the wish unfolds.
3. End with a final line that lands with quiet inevitability.

Maintain an unsettling but elegant tone. The universe is precise, not malicious.

Additionally, at the very end of your response, provide a separate section starting with "IMAGE_PROMPT:" followed by a detailed, eerie, and artistic prompt for an image generation model that captures the final scene of your story. The prompt should be in a "dark sketched" or "atmospheric oil painting" style.`;

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
      const response = await genAI.models.generateContent({ 
        model: "gemini-3.1-pro-preview",
        contents: [{ parts: [{ text: wish }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION
        }
      });
      
      const fullText = response.text || '';
      
      // Extract image prompt if present
      const parts = fullText.split('IMAGE_PROMPT:');
      const storyText = parts[0].trim();
      const imagePrompt = parts[1]?.trim();

      let imageUrl = undefined;
      if (imagePrompt) {
        try {
          const imageResult = await genAI.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: [{ parts: [{ text: imagePrompt }] }]
          });
          
          for (const part of imageResult.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
              imageUrl = `data:image/png;base64,${part.inlineData.data}`;
              break;
            }
          }
        } catch (imgErr) {
          console.error("Failed to generate image:", imgErr);
        }
      }

      setResult({ text: storyText, imageUrl });
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
              <div className="relative w-64 h-64">
                <motion.div
                  animate={isGranting ? {
                    rotate: [0, -2, 2, -2, 0],
                    scale: [1, 1.05, 1],
                    filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"]
                  } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-full h-full flex items-center justify-center"
                >
                  <svg viewBox="0 0 200 200" className="w-full h-full text-[#444] drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      d="M100,180 C80,180 60,160 55,130 C50,100 60,70 80,50 C85,45 95,45 100,50 C105,45 115,45 120,50 C140,70 150,100 145,130 C140,160 120,180 100,180 Z"
                    />
                    <path fill="none" stroke="currentColor" strokeWidth="1" d="M80,50 C75,30 85,10 95,15" />
                    <path fill="none" stroke="currentColor" strokeWidth="1" d="M100,50 C100,25 110,15 115,20" />
                    <path fill="none" stroke="currentColor" strokeWidth="1" d="M120,50 C125,30 135,25 140,30" />
                    <path fill="none" stroke="currentColor" strokeWidth="1" d="M60,110 C40,105 30,115 35,125" />
                    {/* Sketchy lines */}
                    <path fill="none" stroke="currentColor" strokeWidth="0.5" d="M70,140 Q85,145 100,140" />
                    <path fill="none" stroke="currentColor" strokeWidth="0.5" d="M100,150 Q115,155 130,150" />
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
