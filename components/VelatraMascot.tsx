import React, { useEffect, useId, useRef, useState } from 'react';
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

export const VelatraMascot: React.FC<VelatraMascotProps> = ({
  state = 'idle',
  size = 220,
  interactive = true,
  autoWave = false,
  className = '',
  ariaLabel = 'Assistant Velatra',
  onClick,
}) => {
  const reduceMotion = useReducedMotion();
  const id = useId().replace(/:/g, '');
  const [temporaryState, setTemporaryState] = useState<VelatraMascotState | null>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const clickWaveTimer = useRef<number | null>(null);
  const effectiveState = temporaryState || state;
  const clickable = interactive || Boolean(onClick);

  const bgId = `vela-bg-${id}`;
  const skinId = `vela-skin-${id}`;
  const skinHighlightId = `vela-skin-hi-${id}`;
  const hairId = `vela-hair-${id}`;
  const hoodieId = `vela-hoodie-${id}`;
  const eyeId = `vela-eye-${id}`;
  const shadowId = `vela-shadow-${id}`;
  const hairShadowId = `vela-hair-shadow-${id}`;

  useEffect(() => {
    if (state !== 'idle') setTemporaryState(null);
  }, [state]);

  useEffect(() => {
    if (!autoWave || reduceMotion || state !== 'idle') return;
    const start = window.setTimeout(() => setTemporaryState('wave'), 320);
    const stop = window.setTimeout(() => setTemporaryState(null), 1650);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(stop);
    };
  }, [autoWave, reduceMotion, state]);

  useEffect(() => () => {
    if (clickWaveTimer.current) window.clearTimeout(clickWaveTimer.current);
  }, []);

  const triggerWave = () => {
    if (!reduceMotion && effectiveState === 'idle') {
      setTemporaryState('wave');
      if (clickWaveTimer.current) window.clearTimeout(clickWaveTimer.current);
      clickWaveTimer.current = window.setTimeout(() => {
        setTemporaryState(null);
        clickWaveTimer.current = null;
      }, 1050);
    }
    onClick?.();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!interactive || reduceMotion || effectiveState === 'thinking') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 3.4;
    const y = ((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2.4;
    setLook({ x, y });
  };

  const resetLook = () => setLook({ x: 0, y: 0 });
  const Wrapper: any = clickable ? motion.button : motion.div;

  const bodyAnimation = reduceMotion
    ? undefined
    : effectiveState === 'success'
      ? { y: [0, -4, 0], scale: [1, 1.018, 1] }
      : effectiveState === 'error'
        ? { x: [0, -1.8, 1.8, -1, 0] }
        : effectiveState === 'wave'
          ? { rotate: [0, -1.2, 1.2, 0], y: [0, -1.6, 0] }
          : { y: [0, -1.4, 0] };

  const pupilX = effectiveState === 'thinking' ? 1.5 : look.x;
  const pupilY = effectiveState === 'thinking' ? -1.4 : look.y;

  const faceMouth = effectiveState === 'error'
    ? 'M98 137c7-4 15-4 23 0'
    : effectiveState === 'thinking'
      ? 'M103 136c5 2 10 2 15 0'
      : effectiveState === 'success'
        ? 'M94 132c10 12 23 12 33 0'
        : 'M96 135c8 6 19 6 28 0';

  return (
    <Wrapper
      type={clickable ? 'button' : undefined}
      onClick={clickable ? triggerWave : undefined}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetLook}
      className={`relative inline-flex select-none items-center justify-center border-0 bg-transparent p-0 outline-none ${
        clickable
          ? 'cursor-pointer rounded-[32px] focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-4'
          : ''
      } ${className}`}
      style={{ width: size, height: size * 1.18 }}
      aria-label={ariaLabel}
      role={clickable ? undefined : 'img'}
      whileTap={interactive && !reduceMotion ? { scale: 0.985 } : undefined}
    >
      <motion.div
        className="absolute inset-[8%_5%_2%] rounded-[38%] bg-[radial-gradient(circle_at_50%_25%,rgba(255,255,255,.8),rgba(221,232,220,.22)_60%,transparent_78%)]"
        aria-hidden="true"
        animate={reduceMotion ? undefined : { opacity: [0.72, 1, 0.72], scale: [0.99, 1.015, 0.99] }}
        transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.svg
        viewBox="0 0 220 260"
        width="100%"
        height="100%"
        aria-hidden="true"
        initial={false}
        animate={bodyAnimation}
        transition={
          effectiveState === 'success'
            ? { duration: 0.58, ease: 'easeOut' }
            : effectiveState === 'error'
              ? { duration: 0.34, ease: 'easeOut' }
              : { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <defs>
          <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fffef9" />
            <stop offset="55%" stopColor="#f1f5ee" />
            <stop offset="100%" stopColor="#dfe9df" />
          </linearGradient>
          <linearGradient id={skinId} x1=".15" y1="0" x2=".85" y2="1">
            <stop offset="0%" stopColor="#f3c6a5" />
            <stop offset="50%" stopColor="#e2aa85" />
            <stop offset="100%" stopColor="#bd7558" />
          </linearGradient>
          <linearGradient id={skinHighlightId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffd9bb" stopOpacity=".82" />
            <stop offset="100%" stopColor="#df9d79" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={hairId} x1=".1" y1="0" x2=".8" y2="1">
            <stop offset="0%" stopColor="#6b4026" />
            <stop offset="36%" stopColor="#43291d" />
            <stop offset="76%" stopColor="#251916" />
            <stop offset="100%" stopColor="#161110" />
          </linearGradient>
          <linearGradient id={hoodieId} x1=".1" y1="0" x2=".9" y2="1">
            <stop offset="0%" stopColor="#295a43" />
            <stop offset="50%" stopColor="#173f2e" />
            <stop offset="100%" stopColor="#0d2a1f" />
          </linearGradient>
          <radialGradient id={eyeId} cx=".35" cy=".28" r=".8">
            <stop offset="0%" stopColor="#8aac6f" />
            <stop offset="65%" stopColor="#506f45" />
            <stop offset="100%" stopColor="#2b4230" />
          </radialGradient>
          <filter id={shadowId} x="-40%" y="-40%" width="180%" height="190%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#173f2e" floodOpacity=".14" />
          </filter>
          <filter id={hairShadowId} x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#2a1c15" floodOpacity=".24" />
          </filter>
        </defs>

        <rect x="14" y="8" width="192" height="240" rx="58" fill={`url(#${bgId})`} stroke="#fff" strokeWidth="2" />
        <circle cx="44" cy="46" r="20" fill="#fff" opacity=".34" />
        <circle cx="184" cy="194" r="27" fill="#c7dbc8" opacity=".18" />

        <g>
          <path d="M37 250c4-45 19-75 47-88 8-4 17-6 26-6 10 0 19 2 27 6 28 13 43 43 47 88z" fill={`url(#${hoodieId})`} filter={`url(#${shadowId})`} />
          <path d="M74 178c10-15 22-23 36-23 15 0 28 8 37 23-11 14-23 21-37 21-14 0-26-7-36-21z" fill="#0d2c20" opacity=".95" />
          <path d="M82 167c8 11 17 17 28 17 12 0 22-6 29-17l-9-15H91z" fill="#28563f" />
          <path d="M88 164c6 8 13 12 22 12 9 0 16-4 22-12l-5-13H94z" fill={`url(#${skinId})`} />
          <path d="M103 190l7 9 7-9" fill="none" stroke="#eef4eb" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M110 199v26" stroke="#e4eee4" strokeWidth="1.5" opacity=".55" />
          <path d="M103 210l7 9 8-9" fill="none" stroke="#f6faf4" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        <g>
          <ellipse cx="68" cy="105" rx="10.5" ry="15.5" fill={`url(#${skinId})`} />
          <ellipse cx="152" cy="105" rx="10.5" ry="15.5" fill={`url(#${skinId})`} />
          <path d="M66 101c5-3 8 .5 7 5-1 4-3 6-6 7" fill="none" stroke="#ad6e55" strokeWidth="1.3" opacity=".7" />
          <path d="M154 101c-5-3-8 .5-7 5 1 4 3 6 6 7" fill="none" stroke="#ad6e55" strokeWidth="1.3" opacity=".7" />

          <path d="M73 79c4-25 21-40 37-42 19-2 36 8 43 25 5 11 5 22 4 36-1 35-18 62-47 62-29 0-46-27-47-62 0-7 2-14 10-19z" fill={`url(#${skinId})`} filter={`url(#${shadowId})`} />
          <path d="M76 81c3-17 13-30 28-35-3 18-4 40-2 62 2 24 8 40 18 49-3 1-7 2-10 2-29 0-46-27-47-62 0-7 3-14 13-16z" fill={`url(#${skinHighlightId})`} opacity=".44" />
          <path d="M145 78c6 14 7 33 1 50-5 14-13 24-25 29 14-2 24-10 30-22 8-17 10-38 6-55z" fill="#9c5e49" opacity=".1" />

          <path d="M69 82c-1-16 3-30 12-41 10-12 24-18 40-17 21 1 38 13 45 31-6-4-13-6-20-5 1-9-2-18-8-24-2 11-9 19-19 24-1-11-5-20-13-26-1 12-6 22-16 30-4-8-9-14-16-17 3 15 1 29-5 45z" fill={`url(#${hairId})`} filter={`url(#${hairShadowId})`} />
          <path d="M79 52c8-11 18-17 31-18-7 6-11 14-12 23-8-3-14-4-19-5z" fill="#8b5736" opacity=".55" />
          <path d="M104 34c8-8 17-9 26-6-8 6-12 14-13 24-5-7-9-13-13-18z" fill="#7c4a30" opacity=".48" />
          <path d="M129 34c9 2 17 8 23 16-8-1-14 0-20 4 1-7 0-14-3-20z" fill="#68402c" opacity=".58" />
          <path d="M71 77c4-9 11-16 20-22-2 8-2 16 0 24-8-3-14-3-20-2z" fill="#2c1d18" opacity=".65" />

          <path d={effectiveState === 'error' ? 'M81 94c7-1 14 1 21 6M118 100c7-5 14-7 21-6' : effectiveState === 'thinking' ? 'M81 92c7-5 15-5 22-1M118 90c7-2 14-1 21 3' : 'M81 92c7-5 15-6 23-2M117 90c8-3 16-2 23 3'} fill="none" stroke="#352219" strokeWidth="3.7" strokeLinecap="round" />

          {effectiveState === 'success' ? (
            <g>
              <path d="M84 105c6 5 14 5 20 0" fill="none" stroke="#5c3a2d" strokeWidth="2.1" strokeLinecap="round" />
              <path d="M117 105c6 5 14 5 20 0" fill="none" stroke="#5c3a2d" strokeWidth="2.1" strokeLinecap="round" />
            </g>
          ) : (
            <g>
              <path d="M84 103c6-5 14-5 20 0" fill="none" stroke="#6e4737" strokeWidth="1.2" opacity=".45" />
              <path d="M117 103c6-5 14-5 20 0" fill="none" stroke="#6e4737" strokeWidth="1.2" opacity=".45" />
              <ellipse cx="94" cy="105" rx="9.2" ry="6.6" fill="#fffdf9" />
              <ellipse cx="127" cy="105" rx="9.2" ry="6.6" fill="#fffdf9" />
              <motion.ellipse cx="95" cy="105" rx="4.5" ry="5.1" fill={`url(#${eyeId})`} animate={{ x: pupilX, y: pupilY }} transition={{ type: 'spring', stiffness: 180, damping: 22 }} />
              <motion.ellipse cx="126" cy="105" rx="4.5" ry="5.1" fill={`url(#${eyeId})`} animate={{ x: pupilX, y: pupilY }} transition={{ type: 'spring', stiffness: 180, damping: 22 }} />
              <motion.circle cx="95" cy="105" r="2.2" fill="#17261d" animate={{ x: pupilX, y: pupilY }} transition={{ type: 'spring', stiffness: 180, damping: 22 }} />
              <motion.circle cx="126" cy="105" r="2.2" fill="#17261d" animate={{ x: pupilX, y: pupilY }} transition={{ type: 'spring', stiffness: 180, damping: 22 }} />
              <motion.circle cx="96.4" cy="103.2" r="1.1" fill="#fff" animate={{ x: pupilX, y: pupilY }} transition={{ type: 'spring', stiffness: 180, damping: 22 }} />
              <motion.circle cx="127.4" cy="103.2" r="1.1" fill="#fff" animate={{ x: pupilX, y: pupilY }} transition={{ type: 'spring', stiffness: 180, damping: 22 }} />
            </g>
          )}

          <path d="M110 106c-.5 8-2.5 13-6 17 3.5 2.3 8.4 2.4 12.3.2" fill="none" stroke="#b46e54" strokeWidth="1.65" strokeLinecap="round" />
          <path d={faceMouth} fill="none" stroke="#754037" strokeWidth={effectiveState === 'success' ? 3 : 2.7} strokeLinecap="round" />
          {effectiveState !== 'error' && effectiveState !== 'thinking' && <path d="M100 137c6 2 13 2 20 0" fill="none" stroke="#f5cdbf" strokeWidth="1.8" strokeLinecap="round" opacity=".7" />}
          <ellipse cx="82" cy="126" rx="8" ry="3.5" fill="#d96f68" opacity=".12" />
          <ellipse cx="138" cy="126" rx="8" ry="3.5" fill="#d96f68" opacity=".1" />
        </g>

        {effectiveState === 'wave' && (
          <motion.g initial={false} animate={reduceMotion ? undefined : { rotate: [-4, 9, -9, 7, -3] }} transition={{ duration: 1.05, ease: 'easeInOut' }} style={{ transformOrigin: '167px 194px' }}>
            <path d="M154 198c10-3 17-14 20-29" fill="none" stroke="#153a2b" strokeWidth="14" strokeLinecap="round" />
            <path d="M174 168c2-11 5-25 7-39" fill="none" stroke={`url(#${skinId})`} strokeWidth="13" strokeLinecap="round" />
            <ellipse cx="181" cy="126" rx="10" ry="11" fill={`url(#${skinId})`} />
            <path d="M176 122l-4-9M181 119l-1-10M186 120l3-9M190 124l7-6" fill="none" stroke="#c88667" strokeWidth="2.3" strokeLinecap="round" />
          </motion.g>
        )}

        {effectiveState === 'thinking' && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.22 }}>
            <path d="M151 196c8-7 12-17 13-30" fill="none" stroke="#153a2b" strokeWidth="14" strokeLinecap="round" />
            <path d="M163 166c-4-8-9-13-16-17" fill="none" stroke={`url(#${skinId})`} strokeWidth="12" strokeLinecap="round" />
            <circle cx="143" cy="146" r="8.5" fill={`url(#${skinId})`} />
          </motion.g>
        )}

        {effectiveState === 'success' && (
          <motion.g initial={{ opacity: 0, scale: .88 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 330, damping: 20 }} style={{ transformOrigin: '174px 177px' }}>
            <path d="M151 198c9-2 17-9 23-20" fill="none" stroke="#153a2b" strokeWidth="14" strokeLinecap="round" />
            <path d="M174 178c2-8 1-17-2-26" fill="none" stroke={`url(#${skinId})`} strokeWidth="12" strokeLinecap="round" />
            <circle cx="172" cy="148" r="9" fill={`url(#${skinId})`} />
            <circle cx="190" cy="51" r="14" fill="#1f6a49" />
            <path d="M184 51l4 4 8-9" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </motion.g>
        )}

        {effectiveState === 'error' && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .2 }}>
            <circle cx="190" cy="51" r="14" fill="#9a5d38" />
            <path d="M190 43v10M190 58v1" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          </motion.g>
        )}
      </motion.svg>
    </Wrapper>
  );
};

export default VelatraMascot;
