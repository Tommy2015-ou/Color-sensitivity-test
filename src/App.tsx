/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Timer, 
  RotateCcw, 
  Play, 
  Info, 
  Languages, 
  ChevronRight,
  Eye,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type GameState = 'START' | 'PLAYING' | 'GAMEOVER';
type Language = 'zh' | 'en';

interface Color {
  h: number;
  s: number;
  l: number;
}

// --- Constants ---
const INITIAL_TIME = 15;
const TIME_BONUS = 2;
const MIN_DIFFICULTY = 1; // Minimum % difference
const INITIAL_DIFFICULTY = 15; // Starting % difference

const TRANSLATIONS = {
  en: {
    title: "Chroma Vision",
    subtitle: "Color Sensitivity Challenge",
    start: "Start Challenge",
    score: "Score",
    time: "Time",
    level: "Level",
    gameOver: "Challenge Over",
    restart: "Try Again",
    bestScore: "Best Score",
    diffExplanation: "Color Difference Analysis",
    diffDesc: "The target block had a {diff}% difference in lightness/saturation.",
    artStudentTip: "Art Student Tip: Focus on the interaction between adjacent blocks.",
    findTheOdd: "Find the block with a different color",
    accuracy: "Accuracy",
    sec: "s",
    correct: "Perfect! +2s",
    wrong: "Wrong! -3s",
    timeUp: "Time's Up!",
    improvementTitle: "Vision Improvement Advice",
    adviceLow: "Focus on eye rest. Follow the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds. Ensure your workspace has balanced ambient lighting.",
    adviceMid: "Try 'Active Observation'. Spend time outdoors observing subtle color shifts in natural shadows and highlights. Practice mixing physical pigments to understand color relationships.",
    adviceHigh: "Excellent sensitivity! To maintain this, calibrate your monitors regularly and work in a color-neutral environment. Challenge yourself with complex color grading tasks.",
  },
  zh: {
    title: "色彩敏感度挑战",
    subtitle: "面向艺术生的视觉训练",
    start: "开始挑战",
    score: "得分",
    time: "剩余时间",
    level: "等级",
    gameOver: "挑战结束",
    restart: "重新开始",
    bestScore: "最高得分",
    diffExplanation: "色彩差异分析",
    diffDesc: "目标色块在亮度/饱和度上有 {diff}% 的微小差异。",
    artStudentTip: "艺术生贴士：关注相邻色块之间的对比关系。",
    findTheOdd: "找出颜色不同的那个色块",
    accuracy: "准确率",
    sec: "秒",
    correct: "太棒了！时间 +2s",
    wrong: "看走眼了！时间 -3s",
    timeUp: "时间到！",
    improvementTitle: "视力与色彩感知改善建议",
    adviceLow: "重点在于眼部休息。遵循 20-20-20 原则：每用眼 20 分钟，远眺 20 英尺外 20 秒。确保工作环境光线充足且均匀。",
    adviceMid: "尝试“主动观察”。多去户外观察自然光影中微妙的色彩推移。通过手绘调色练习来增强对色彩纯度变化的直觉。",
    adviceHigh: "卓越的敏感度！建议定期校准显示器，并在色彩中性的环境下工作。可以尝试更高级的调色（Color Grading）任务来保持状态。",
  }
};

// --- Components ---

export default function App() {
  const [lang, setLang] = useState<Language>('zh');
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [bestScore, setBestScore] = useState(0);
  const [grid, setGrid] = useState<{ color: string; isTarget: boolean }[]>([]);
  const [difficulty, setDifficulty] = useState(INITIAL_DIFFICULTY);
  const [lastDiff, setLastDiff] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; type: 'correct' | 'wrong' | 'info' | null }>({ text: '', type: null });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const t = TRANSLATIONS[lang];

  const getAdvice = () => {
    if (score < 15) return t.adviceLow;
    if (score < 35) return t.adviceMid;
    return t.adviceHigh;
  };

  const showFeedback = (text: string, type: 'correct' | 'wrong' | 'info') => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setFeedback({ text, type });
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback({ text: '', type: null });
    }, 1000);
  };

  // Generate a random color and a slightly different one
  const generateLevel = useCallback(() => {
    const h = Math.floor(Math.random() * 360);
    const s = Math.floor(Math.random() * 60) + 20; // 20-80%
    const l = Math.floor(Math.random() * 40) + 30; // 30-70% (avoid too dark/light)

    const baseColor: Color = { h, s, l };
    
    // Calculate current difficulty
    // As score increases, difficulty decreases (smaller difference)
    const currentDiff = Math.max(MIN_DIFFICULTY, INITIAL_DIFFICULTY - Math.floor(score / 2));
    setLastDiff(currentDiff);

    // Randomly decide to change lightness or saturation
    const changeType = Math.random() > 0.5 ? 'l' : 's';
    const targetColor: Color = { ...baseColor };
    
    if (changeType === 'l') {
      targetColor.l = baseColor.l > 50 ? baseColor.l - currentDiff : baseColor.l + currentDiff;
    } else {
      targetColor.s = baseColor.s > 50 ? baseColor.s - currentDiff : baseColor.s + currentDiff;
    }

    const targetIndex = Math.floor(Math.random() * 25);
    const newGrid = Array.from({ length: 25 }).map((_, i) => ({
      color: i === targetIndex 
        ? `hsl(${targetColor.h}, ${targetColor.s}%, ${targetColor.l}%)`
        : `hsl(${baseColor.h}, ${baseColor.s}%, ${baseColor.l}%)`,
      isTarget: i === targetIndex
    }));

    setGrid(newGrid);
  }, [score]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(INITIAL_TIME);
    setDifficulty(INITIAL_DIFFICULTY);
    setGameState('PLAYING');
    generateLevel();
  };

  const handleBlockClick = (isTarget: boolean) => {
    if (gameState !== 'PLAYING') return;

    if (isTarget) {
      setScore(s => s + 1);
      setTimeLeft(t => Math.min(60, t + TIME_BONUS));
      showFeedback(t.correct, 'correct');
      generateLevel();
      
      // Visual feedback
      if (score > 0 && (score + 1) % 10 === 0) {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00FF00', '#FFFFFF']
        });
      }
    } else {
      // Penalty for wrong click
      setTimeLeft(t => Math.max(0, t - 3));
      showFeedback(t.wrong, 'wrong');
    }
  };

  useEffect(() => {
    if (gameState === 'PLAYING' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            setGameState('GAMEOVER');
            showFeedback(TRANSLATIONS[lang].timeUp, 'info');
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, timeLeft, lang]);

  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
    }
  }, [score, bestScore]);

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans selection:bg-[#00FF00] selection:text-black">
      {/* Header / Navigation */}
      <header className="border-b border-[#141414] p-4 md:p-6 flex justify-between items-center sticky top-0 bg-[#F5F5F0] z-20">
        <div className="flex flex-col">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none">
            {t.title}
          </h1>
          <span className="text-[10px] md:text-xs font-mono uppercase opacity-60 tracking-widest mt-1">
            {t.subtitle}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setLang(l => l === 'en' ? 'zh' : 'en')}
            className="flex items-center gap-2 px-3 py-1.5 border border-[#141414] rounded-full hover:bg-[#141414] hover:text-white transition-colors text-xs font-bold uppercase"
          >
            <Languages size={14} />
            {lang === 'en' ? '中文' : 'EN'}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          {gameState === 'START' && (
            <motion.div 
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-24 h-24 bg-[#141414] rounded-full flex items-center justify-center mb-8 animate-pulse">
                <Eye className="text-[#00FF00]" size={48} />
              </div>
              <h2 className="text-4xl md:text-6xl font-black uppercase mb-4 tracking-tighter">
                {t.title}
              </h2>
              <p className="text-lg opacity-70 max-w-md mb-12 font-medium">
                {t.findTheOdd}
              </p>
              <button 
                onClick={startGame}
                className="group relative px-12 py-4 bg-[#141414] text-white font-black uppercase tracking-widest text-xl hover:bg-[#00FF00] hover:text-black transition-all duration-300"
              >
                <span className="relative z-10 flex items-center gap-3">
                  {t.start} <Play size={24} fill="currentColor" />
                </span>
                <div className="absolute inset-0 border-2 border-[#141414] translate-x-2 translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform" />
              </button>
            </motion.div>
          )}

          {gameState === 'PLAYING' && (
            <motion.div 
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white border-2 border-[#141414] p-4 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-mono uppercase opacity-50 mb-1">{t.score}</span>
                  <span className="text-3xl font-black">{score}</span>
                </div>
                <div className={cn(
                  "border-2 border-[#141414] p-4 flex flex-col items-center justify-center transition-colors",
                  timeLeft < 5 ? "bg-red-500 text-white" : "bg-white"
                )}>
                  <span className="text-[10px] font-mono uppercase opacity-50 mb-1">{t.time}</span>
                  <div className="flex items-center gap-2">
                    <Timer size={20} />
                    <span className="text-3xl font-black">{timeLeft}s</span>
                  </div>
                </div>
                <div className="bg-white border-2 border-[#141414] p-4 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-mono uppercase opacity-50 mb-1">{t.level}</span>
                  <span className="text-3xl font-black">{Math.floor(score / 5) + 1}</span>
                </div>
              </div>

              {/* Game Grid */}
              <div className="relative aspect-square w-full max-w-[500px] mx-auto">
                <div className="grid grid-cols-5 gap-2 md:gap-3 p-2 md:p-4 bg-white border-4 border-[#141414] shadow-[12px_12px_0px_0px_rgba(20,20,20,1)] w-full h-full">
                  {grid.map((block, idx) => (
                    <motion.button
                      key={`${score}-${idx}`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleBlockClick(block.isTarget)}
                      className="w-full h-full rounded-sm cursor-pointer transition-shadow hover:shadow-lg"
                      style={{ backgroundColor: block.color }}
                    />
                  ))}
                </div>

                {/* Feedback Overlay */}
                <AnimatePresence>
                  {feedback.text && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 1.5, y: -20 }}
                      className={cn(
                        "absolute inset-0 flex items-center justify-center pointer-events-none z-10",
                        "text-2xl md:text-4xl font-black uppercase tracking-tighter drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]",
                        feedback.type === 'correct' ? "text-[#00FF00]" : 
                        feedback.type === 'wrong' ? "text-red-500" : "text-white"
                      )}
                    >
                      {feedback.text}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs font-mono opacity-50 uppercase">
                <AlertCircle size={14} />
                {t.findTheOdd}
              </div>
            </motion.div>
          )}

          {gameState === 'GAMEOVER' && (
            <motion.div 
              key="gameover"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-10"
            >
              <div className="bg-white border-4 border-[#141414] p-8 md:p-12 w-full max-w-2xl shadow-[16px_16px_0px_0px_rgba(20,20,20,1)] relative overflow-hidden">
                {/* Decorative background number */}
                <div className="absolute -top-10 -right-10 text-[200px] font-black opacity-[0.03] select-none pointer-events-none">
                  {score}
                </div>

                <div className="relative z-10">
                  <h2 className="text-5xl md:text-7xl font-black uppercase mb-2 tracking-tighter">
                    {t.gameOver}
                  </h2>
                  <div className="h-1 w-24 bg-[#00FF00] mb-8" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    <div className="space-y-4">
                      <div className="flex justify-between items-end border-b border-[#141414] pb-2">
                        <span className="text-sm font-mono uppercase opacity-60">{t.score}</span>
                        <span className="text-4xl font-black">{score}</span>
                      </div>
                      <div className="flex justify-between items-end border-b border-[#141414] pb-2">
                        <span className="text-sm font-mono uppercase opacity-60">{t.bestScore}</span>
                        <span className="text-4xl font-black text-[#00FF00] drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">{bestScore}</span>
                      </div>
                    </div>

                    <div className="bg-[#F5F5F0] p-4 border-2 border-dashed border-[#141414]">
                      <h3 className="text-xs font-black uppercase mb-3 flex items-center gap-2">
                        <Info size={14} /> {t.diffExplanation}
                      </h3>
                      <p className="text-sm opacity-80 leading-relaxed mb-4">
                        {t.diffDesc.replace('{diff}', lastDiff.toString())}
                      </p>
                      
                      <div className="pt-4 border-t border-[#141414]/10">
                        <h3 className="text-xs font-black uppercase mb-2 flex items-center gap-2 text-[#00FF00] drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                          <Eye size={14} /> {t.improvementTitle}
                        </h3>
                        <p className="text-[11px] leading-relaxed opacity-90">
                          {getAdvice()}
                        </p>
                      </div>

                      <div className="mt-4 p-3 bg-white border border-[#141414] text-[11px] italic">
                        {t.artStudentTip}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4">
                    <button 
                      onClick={startGame}
                      className="flex-1 bg-[#141414] text-white px-8 py-4 font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#00FF00] hover:text-black transition-all"
                    >
                      <RotateCcw size={20} /> {t.restart}
                    </button>
                    <div className="flex-1 border-2 border-[#141414] px-8 py-4 font-black uppercase tracking-widest flex items-center justify-center gap-3">
                      <Trophy size={20} /> {t.level} {Math.floor(score / 5) + 1}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer / Info */}
      <footer className="mt-20 border-t border-[#141414] p-8">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <span className="text-[10px] font-mono uppercase opacity-50 block mb-4">01 / Concept</span>
            <p className="text-xs leading-relaxed opacity-70">
              {lang === 'en' 
                ? "Designed for visual artists to sharpen their ability to perceive micro-variations in color values."
                : "专为视觉艺术从业者设计，旨在磨练对色彩数值微小变化的感知能力。"}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase opacity-50 block mb-4">02 / Mechanics</span>
            <p className="text-xs leading-relaxed opacity-70">
              {lang === 'en'
                ? "Difficulty scales dynamically. As your score increases, the HSL delta decreases, pushing your ocular limits."
                : "难度动态调整。随着得分增加，HSL 色彩差异会逐渐减小，挑战你的视觉极限。"}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase opacity-50 block mb-4">03 / Analysis</span>
            <p className="text-xs leading-relaxed opacity-70">
              {lang === 'en'
                ? "Real-time tracking of accuracy and speed. High scores unlock more complex color palettes."
                : "实时追踪准确率与速度。高分将解锁更复杂的调色板组合。"}
            </p>
          </div>
        </div>
        <div className="mt-12 text-center text-[10px] font-mono opacity-30 uppercase tracking-[0.2em]">
          Chroma Vision © 2024 / Built for Artists
        </div>
      </footer>
    </div>
  );
}
