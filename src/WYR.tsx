import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, RotateCcw, Skull, Eye } from 'lucide-react';

type WYRQuestion = {
  question: string;
  optionA: string;
  optionB: string;
};

export default function WYR() {
  const [wyrData, setWyrData] = useState<WYRQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [result, setResult] = useState<{ text: string; imagePrompt?: string; imageUrl?: string; choice: string } | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storyDone, setStoryDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prefetchedQuestion = useRef<WYRQuestion | null>(null);
  const recentQuestions = useRef<string[]>([]);

  const fetchQuestionFromAPI = async (): Promise<WYRQuestion> => {
    const response = await fetch('/api/wyr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'question', recentQuestions: recentQuestions.current }),
    });
    if (!response.ok) throw new Error('Failed to summon a dilemma.');
    const data = await response.json();
    // Track recent questions (keep last 10)
    recentQuestions.current = [...recentQuestions.current, data.question].slice(-10);
    return data;
  };

  const prefetchNextQuestion = () => {
    prefetchedQuestion.current = null;
    fetchQuestionFromAPI()
      .then(data => { prefetchedQuestion.current = data; })
      .catch(() => { /* will fetch fresh on demand */ });
  };

  const fetchQuestion = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setWyrData(null);

    try {
      if (prefetchedQuestion.current) {
        setWyrData(prefetchedQuestion.current);
        prefetchedQuestion.current = null;
      } else {
        const data = await fetchQuestionFromAPI();
        setWyrData(data);
      }
    } catch (err) {
      console.error(err);
      setError("The cosmos couldn't conjure a dilemma. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChoice = async (choice: string) => {
    if (!wyrData) return;
    setIsGeneratingStory(true);
    setError(null);

    // Start pre-fetching the next question while the story streams
    prefetchNextQuestion();

    try {
      const response = await fetch('/api/wyr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'story',
          question: wyrData.question,
          choice,
        }),
      });

      if (!response.ok) throw new Error('The universe declined to elaborate.');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No reader available');

      let streamedText = '';
      let imagePrompt: string | undefined;

      setResult({ text: '', choice });
      setStoryDone(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));

          if (data.type === 'text') {
            streamedText += data.text;
            const display = streamedText.split('IMAGE_PROMPT:')[0].trim();
            setResult(prev => prev ? { ...prev, text: display } : prev);
          } else if (data.type === 'image_prompt') {
            imagePrompt = data.imagePrompt;
            setResult(prev => prev ? { ...prev, imagePrompt } : prev);
          } else if (data.type === 'error') {
            throw new Error(data.error);
          }
        }
      }
      setStoryDone(true);
    } catch (err) {
      console.error(err);
      setResult(null);
      setError("The narrator lost their train of thought. Try again.");
    } finally {
      setIsGeneratingStory(false);
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

  useEffect(() => {
    fetchQuestion();
  }, []);

  useEffect(() => {
    if (storyDone && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [storyDone]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#d4d4d4] font-serif selection:bg-[#333] selection:text-[#fff] flex flex-col items-center justify-center p-6 overflow-x-hidden">
      {/* Background Texture */}
      <div className="fixed inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')]" />

      {/* Back to Paw link */}
      <a
        href="/"
        className="fixed top-6 left-6 z-50 text-[#444] hover:text-[#888] transition-colors text-xs uppercase tracking-[0.2em]"
      >
        ← The Paw
      </a>

      <main className="max-w-2xl w-full relative z-10">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center space-y-6 min-h-[60vh]"
            >
              <Skull className="w-16 h-16 text-[#333] animate-pulse" />
              <p className="text-[#555] italic text-lg">Summoning a dilemma...</p>
            </motion.div>
          ) : !result ? (
            <motion.div
              key="question"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center space-y-12 min-h-[60vh] justify-center"
            >
              {wyrData && (
                <>
                  {/* Title */}
                  <motion.h1
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[#555] text-xs uppercase tracking-[0.4em]"
                  >
                    Would You Rather
                  </motion.h1>

                  {/* The two options */}
                  <div className="w-full space-y-6">
                    <motion.button
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      onClick={() => handleChoice(wyrData.optionA)}
                      disabled={isGeneratingStory}
                      className="group w-full text-left p-6 md:p-8 border border-[#222] hover:border-[#555] rounded-lg transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden"
                    >
                      <span className="relative z-10 text-lg md:text-xl leading-relaxed text-[#b4b4b4] group-hover:text-[#e4e4e4] transition-colors">
                        {wyrData.optionA}
                      </span>
                      <div className="absolute inset-0 bg-white/[0.03] translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
                    </motion.button>

                    <div className="flex items-center justify-center gap-4">
                      <div className="flex-1 h-[1px] bg-[#222]" />
                      <span className="text-[#333] text-xs uppercase tracking-[0.3em]">or</span>
                      <div className="flex-1 h-[1px] bg-[#222]" />
                    </div>

                    <motion.button
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      onClick={() => handleChoice(wyrData.optionB)}
                      disabled={isGeneratingStory}
                      className="group w-full text-left p-6 md:p-8 border border-[#222] hover:border-[#555] rounded-lg transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden"
                    >
                      <span className="relative z-10 text-lg md:text-xl leading-relaxed text-[#b4b4b4] group-hover:text-[#e4e4e4] transition-colors">
                        {wyrData.optionB}
                      </span>
                      <div className="absolute inset-0 bg-white/[0.03] translate-x-[100%] group-hover:translate-x-0 transition-transform duration-500" />
                    </motion.button>
                  </div>

                  {isGeneratingStory ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-3 text-[#555]"
                    >
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="italic text-sm">The narrator clears their throat...</span>
                    </motion.div>
                  ) : (
                    <button
                      onClick={fetchQuestion}
                      className="group flex items-center gap-3 text-[#333] hover:text-[#888] transition-colors uppercase tracking-[0.3em] text-xs"
                    >
                      <RotateCcw className="w-4 h-4 group-hover:rotate-[-180deg] transition-transform duration-500" />
                      Different Dilemma
                    </button>
                  )}
                </>
              )}

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
              {/* Show what they chose */}
              <div className="text-center space-y-2">
                <p className="text-[#444] text-xs uppercase tracking-[0.3em]">You chose</p>
                <p className="text-[#888] italic text-lg">"{result.choice}"</p>
              </div>

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
                    alt="The consequence"
                    className="w-full h-full object-cover opacity-80 grayscale hover:grayscale-0 transition-all duration-1000"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-60" />
                </motion.div>
              )}

              <div ref={scrollRef} className="flex justify-center pt-12">
                <button
                  onClick={fetchQuestion}
                  className="group flex items-center gap-3 text-[#555] hover:text-[#aaa] transition-colors uppercase tracking-[0.3em] text-xs"
                >
                  <RotateCcw className="w-4 h-4 group-hover:rotate-[-180deg] transition-transform duration-500" />
                  Another Dilemma
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-8 text-[10px] uppercase tracking-[0.5em] text-[#222] pointer-events-none">
        Choose Wisely
      </footer>
    </div>
  );
}
