
import React, { useState, useEffect, useRef } from 'react';
import { Card, Button } from './UI';
import { PlayIcon, PauseIcon, RotateCcwIcon, TimerIcon, BellIcon } from './Icons';

export const Timer: React.FC = () => {
  const [time, setTime] = useState(60); // Default 60s
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'countdown' | 'stopwatch'>('countdown');
  const [initialTime, setInitialTime] = useState(60);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setTime((prevTime) => {
          if (mode === 'countdown') {
            if (prevTime <= 1) {
              setIsActive(false);
              playAlarm();
              return 0;
            }
            return prevTime - 1;
          } else {
            return prevTime + 1;
          }
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, mode]);

  const playAlarm = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playBeep = (time: number, freq: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.2, time + 0.05);
      gain.gain.linearRampToValueAtTime(0, time + duration);
      osc.start(time);
      osc.stop(time + duration);
    };

    // Play 3 beeps
    playBeep(ctx.currentTime, 880, 0.3);
    playBeep(ctx.currentTime + 0.4, 880, 0.3);
    playBeep(ctx.currentTime + 0.8, 880, 0.5);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const reset = () => {
    setIsActive(false);
    setTime(mode === 'countdown' ? initialTime : 0);
  };

  const adjustTime = (amount: number) => {
    const newTime = Math.max(0, initialTime + amount);
    setInitialTime(newTime);
    if (!isActive) setTime(newTime);
  };

  return (
    <Card className="bg-white/90 border-zinc-200 backdrop-blur-xl p-6 w-72 shadow-2xl ring-1 ring-zinc-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TimerIcon size={18} className="text-velatra-accent" />
          <span className="text-[10px] font-black uppercase tracking-[3px] text-zinc-900 italic">Timer</span>
        </div>
        <div className="flex bg-zinc-50 rounded-lg p-1">
          <button 
            onClick={() => { setMode('countdown'); setTime(initialTime); setIsActive(false); }}
            className={`px-3 py-1 rounded-md text-[8px] font-black uppercase transition-all ${mode === 'countdown' ? 'bg-velatra-accent text-white' : 'text-zinc-900'}`}
          >
            Timer
          </button>
          <button 
            onClick={() => { setMode('stopwatch'); setTime(0); setIsActive(false); }}
            className={`px-3 py-1 rounded-md text-[8px] font-black uppercase transition-all ${mode === 'stopwatch' ? 'bg-velatra-accent text-white' : 'text-zinc-900'}`}
          >
            Chrono
          </button>
        </div>
      </div>

      <div className="text-center mb-8 relative">
        <div className="text-6xl font-black text-zinc-900 tabular-nums tracking-tighter italic">
          {formatTime(time)}
        </div>
        {mode === 'countdown' && !isActive && (
          <div className="flex justify-center gap-4 mt-4">
            <button onClick={() => adjustTime(-15)} className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-500 hover:text-zinc-900">-15</button>
            <button onClick={() => adjustTime(15)} className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-500 hover:text-zinc-900">+15</button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          variant={isActive ? "secondary" : "primary"} 
          fullWidth 
          onClick={() => setIsActive(!isActive)}
          className="!py-3"
        >
          {isActive ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
        </Button>
        <Button 
          variant="glass" 
          onClick={reset}
          className="!px-4"
        >
          <RotateCcwIcon size={20} />
        </Button>
      </div>
    </Card>
  );
};
