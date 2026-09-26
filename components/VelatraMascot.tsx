import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export type VelatraMascotState = 'idle' | 'wave' | 'thinking' | 'success' | 'error';

interface VelatraMascotProps {
  state?: VelatraMascotState;
  size?: number;
  interactive?: boolean;
  autoWave?: boolean;
  className?: string;
  ariaLabel?: string;
  onClick?: () => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const VelatraMascot: React.FC<VelatraMascotProps> = ({
  state = 'idle',
  size = 220,
  interactive = true,
  autoWave = false,
  className = '',
  ariaLabel = 'Assistant Velatra',
  onClick,
}) => {
  const rootRef = useRef<HTMLButtonElement | HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [temporaryState, setTemporaryState] = useState<VelatraMascotState | null>(null);
  const effectiveState = temporaryState || state;

  useEffect(() => {
    if (!autoWave || reduceMotion || state !== 'idle') return;
    const start = window.setTimeout(() => setTemporaryState('wave'), 350);
    const stop = window.setTimeout(() => setTemporaryState(null), 1750);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(stop);
    };
  }, [autoWave, reduceMotion, state]);

  useEffect(() => {
    if (!interactive || reduceMotion) return;
    let frame = 0;
    const onPointerMove = (event: PointerEvent) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const rect = rootRef.current?.getBoundingClientRect();
        if (!rect) return;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height * 0.36;
        const dx = clamp((event.clientX - centerX) / Math.max(window.innerWidth * 0.35, 1), -1, 1);
        const dy = clamp((event.clientY - centerY) / Math.max(window.innerHeight * 0.35, 1), -1, 1);
        setLook({ x: dx * 3.2, y: dy * 2.4 });
      });
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [interactive, reduceMotion]);

  const triggerWave = () => {
    if (!reduceMotion && effectiveState === 'idle') {
      setTemporaryState('wave');
      window.setTimeout(() => setTemporaryState(null), 1100);
    }
    onClick?.();
  };

  const Wrapper: any = interactive || onClick ? motion.button : motion.div;
  const thinking = effectiveState === 'thinking';
  const success = effectiveState === 'success';
  const error = effectiveState === 'error';
  const waving = effectiveState === 'wave';
  const eyeX = thinking ? 1.1 : look.x;
  const eyeY = thinking ? -2.1 : look.y;

  const bodyAnimation = reduceMotion
    ? undefined
    : success
      ? { y: [0, -4, 0], scale: [1, 1.015, 1] }
      : error
        ? { x: [0, -1.5, 1.5, 0] }
        : { y: [0, -1.6, 0] };

  return (
    <Wrapper
      ref={rootRef}
      type={interactive || onClick ? 'button' : undefined}
      onClick={interactive || onClick ? triggerWave : undefined}
      className={`relative inline-flex select-none items-center justify-center border-0 bg-transparent p-0 outline-none ${interactive || onClick ? 'cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-4 rounded-[32px]' : ''} ${className}`}
      style={{ width: size, height: size * 1.18 }}
      aria-label={interactive || onClick ? ariaLabel : undefined}
      role={interactive || onClick ? undefined : 'img'}
      whileTap={interactive && !reduceMotion ? { scale: 0.985 } : undefined}
    >
      <motion.svg
        viewBox="0 0 220 260"
        width="100%"
        height="100%"
        aria-hidden="true"
        initial={false}
        animate={bodyAnimation}
        transition={success ? { duration: 0.55, ease: 'easeOut' } : error ? { duration: 0.28 } : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <defs>
          <linearGradient id="velatraMascotHead" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fffef9" />
            <stop offset="100%" stopColor="#f1f1e8" />
          </linearGradient>
          <linearGradient id="velatraMascotGreen" x1="0" y1="0" x2="0.85" y2="1">
            <stop offset="0%" stopColor="#245e43" />
            <stop offset="100%" stopColor="#0e3828" />
          </linearGradient>
          <filter id="velatraMascotShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <clipPath id="velatraMascotBadgeClip">
            <rect x="99" y="151" width="22" height="22" rx="6" />
          </clipPath>
        </defs>

        <ellipse cx="110" cy="238" rx="51" ry="9" fill="#143c2b" opacity="0.12" filter="url(#velatraMascotShadow)" />

        <motion.g
          initial={false}
          animate={reduceMotion ? undefined : { rotate: waving ? [-5, -42, -12, -38, -6] : thinking ? -20 : -4 }}
          transition={waving ? { duration: 0.95, ease: 'easeInOut' } : { duration: 0.35 }}
          style={{ transformOrigin: '68px 137px' }}
        >
          <circle cx="68" cy="137" r="13" fill="#174a35" />
          <rect x="51" y="136" width="21" height="52" rx="10.5" fill="url(#velatraMascotGreen)" />
          <rect x="52.5" y="166" width="18" height="20" rx="9" fill="#f6f4ec" />
          <circle cx="61.5" cy="188" r="11" fill="#174a35" />
          {waving && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 0.95 }}>
              <path d="M39 150l-8-4M40 160l-9 1M44 139l-5-7" stroke="#174a35" strokeWidth="3" strokeLinecap="round" />
            </motion.g>
          )}
        </motion.g>

        <motion.g
          initial={false}
          animate={reduceMotion ? undefined : { rotate: thinking ? 27 : success ? -8 : 4 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ transformOrigin: '152px 137px' }}
        >
          <circle cx="152" cy="137" r="13" fill="#174a35" />
          <rect x="148" y="136" width="21" height="52" rx="10.5" fill="url(#velatraMascotGreen)" />
          <rect x="149.5" y="166" width="18" height="20" rx="9" fill="#f6f4ec" />
          <circle cx="158.5" cy="188" r="11" fill="#174a35" />
        </motion.g>

        <g>
          <rect x="65" y="124" width="90" height="89" rx="41" fill="url(#velatraMascotHead)" stroke="#dce3da" strokeWidth="1.5" />
          <path d="M67 151c8-11 15-17 24-21v80c-12-5-21-17-24-32zM153 151c-8-11-15-17-24-21v80c12-5 21-17 24-32z" fill="#174a35" opacity="0.96" />
          <rect x="95" y="112" width="30" height="22" rx="11" fill="#123d2c" />
          <image href="/brand/velatra-mark.png" x="99" y="151" width="22" height="22" clipPath="url(#velatraMascotBadgeClip)" preserveAspectRatio="xMidYMid meet" />
        </g>

        <g>
          <rect x="76" y="199" width="26" height="38" rx="13" fill="#174a35" />
          <rect x="118" y="199" width="26" height="38" rx="13" fill="#174a35" />
          <path d="M74 229h31v9c0 6-5 10-11 10H82c-5 0-8-4-8-9zM116 229h31v10c0 5-4 9-9 9h-13c-5 0-9-4-9-9z" fill="#f8f7f3" stroke="#dce3da" />
        </g>

        <motion.g
          initial={false}
          animate={reduceMotion ? undefined : { rotate: thinking ? -3 : error ? 2 : 0, y: success ? -1 : 0 }}
          transition={{ duration: 0.35 }}
          style={{ transformOrigin: '110px 91px' }}
        >
          <rect x="45" y="34" width="130" height="108" rx="54" fill="url(#velatraMascotHead)" stroke="#dce3da" strokeWidth="1.5" />

          <path d="M70 45c9-26 30-33 47-25-4 8-7 14-6 25 12-20 28-26 42-19-2 21-11 35-26 43-19-15-36-20-57-24z" fill="url(#velatraMascotGreen)" />
          <path d="M118 24c6 7 8 17 7 28 9-16 17-22 28-25-5 18-13 29-27 38-2-17-4-28-8-41z" fill="#2c7552" opacity="0.72" />

          <motion.path
            d={error ? 'M72 75l18-5M130 70l18 5' : thinking ? 'M72 72c6-4 12-4 18 0M130 73c6-5 12-5 18-1' : 'M72 72c6-4 12-4 18 0M130 72c6-4 12-4 18 0'}
            fill="none"
            stroke="#123d2c"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          <motion.g
            animate={reduceMotion ? undefined : { scaleY: [1, 1, 0.12, 1, 1] }}
            transition={{ duration: 0.42, repeat: Infinity, repeatDelay: 3.6, ease: 'easeInOut' }}
            style={{ transformOrigin: '110px 92px' }}
          >
            <motion.ellipse cx="84" cy="91" rx="8.5" ry="14" fill="#103d2c" animate={{ x: eyeX, y: eyeY }} transition={{ type: 'spring', stiffness: 180, damping: 22 }} />
            <motion.ellipse cx="136" cy="91" rx="8.5" ry="14" fill="#103d2c" animate={{ x: eyeX, y: eyeY }} transition={{ type: 'spring', stiffness: 180, damping: 22 }} />
            <motion.circle cx="87" cy="86" r="2.6" fill="#fff" animate={{ x: eyeX, y: eyeY }} transition={{ type: 'spring', stiffness: 180, damping: 22 }} />
            <motion.circle cx="139" cy="86" r="2.6" fill="#fff" animate={{ x: eyeX, y: eyeY }} transition={{ type: 'spring', stiffness: 180, damping: 22 }} />
          </motion.g>

          <path
            d={error ? 'M99 119c8-6 15-6 23 0' : success ? 'M96 113c9 12 20 12 29 0' : thinking ? 'M102 116c6 3 11 3 16 0' : 'M99 113c7 8 15 8 22 0'}
            fill="none"
            stroke="#143d2d"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </motion.g>

        {thinking && (
          <motion.g initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <path d="M174 56c0-8 6-13 14-13 8 0 14 5 14 12 0 9-10 10-10 18" fill="none" stroke="#174a35" strokeWidth="4" strokeLinecap="round" />
            <circle cx="192" cy="82" r="2.7" fill="#174a35" />
          </motion.g>
        )}

        {success && (
          <motion.g initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: [0, 1, 1, 0.35], scale: 1 }} transition={{ duration: 0.7 }} style={{ transformOrigin: '110px 76px' }}>
            <path d="M36 83h-13M42 59l-9-9M184 83h13M178 59l9-9M110 17V5" stroke="#1f7a55" strokeWidth="3" strokeLinecap="round" />
          </motion.g>
        )}

        {error && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <path d="M183 62l7-7M187 72l10-2" stroke="#8b4b34" strokeWidth="3" strokeLinecap="round" />
          </motion.g>
        )}
      </motion.svg>
    </Wrapper>
  );
};

export default VelatraMascot;
