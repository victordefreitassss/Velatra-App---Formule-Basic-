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

// Official companion pack v2: retain the original WebP pixels and full composition.
const assetForState: Record<VelatraMascotState, string> = {
  idle: '/brand/companion/vela-idle.webp',
  wave: '/brand/companion/vela-wave.webp',
  thinking: '/brand/companion/vela-thinking.webp',
  success: '/brand/companion/vela-success.webp',
  error: '/brand/companion/vela-thinking.webp',
};

export const VelatraMascot: React.FC<VelatraMascotProps> = ({
  state = 'idle',
  size = 220,
  interactive = false,
  autoWave = false,
  className = '',
  ariaLabel = 'Compagnon Velatra',
  onClick,
}) => {
  const reduceMotion = useReducedMotion();
  const [temporaryState, setTemporaryState] = useState<VelatraMascotState | null>(null);
  const timerRef = useRef<number | null>(null);
  const effectiveState = temporaryState || state;
  const clickable = interactive || Boolean(onClick);

  useEffect(() => {
    setTemporaryState(null);
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, [state]);

  useEffect(() => {
    if (!autoWave || reduceMotion || state !== 'idle') return;

    const start = window.setTimeout(() => setTemporaryState('wave'), 350);
    const stop = window.setTimeout(() => setTemporaryState(null), 1550);

    return () => {
      window.clearTimeout(start);
      window.clearTimeout(stop);
    };
  }, [autoWave, reduceMotion, state]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const triggerWave = () => {
    if (!reduceMotion && effectiveState === 'idle') {
      setTemporaryState('wave');

      if (timerRef.current) window.clearTimeout(timerRef.current);

      timerRef.current = window.setTimeout(() => {
        setTemporaryState(null);
        timerRef.current = null;
      }, 1050);
    }

    onClick?.();
  };

  const motionForState = reduceMotion
    ? { x: 0, y: 0, rotate: 0, scale: 1 }
    : effectiveState === 'wave'
      ? { rotate: [0, -1.4, 1.4, -0.6, 0], y: [0, -1, 0] }
      : effectiveState === 'thinking'
        ? { y: [0, -2, 0] }
        : effectiveState === 'success'
          ? { y: [0, -5, 0], scale: [1, 1.025, 1] }
          : effectiveState === 'error'
            ? { x: [0, -1.5, 1.5, 0] }
            : { scale: [1, 1.006, 1] };

  const transitionForState = reduceMotion ? { duration: 0 } :
    effectiveState === 'thinking'
      ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' as const }
      : effectiveState === 'idle'
        ? { duration: 5.6, repeat: Infinity, ease: 'easeInOut' as const }
        : effectiveState === 'wave'
          ? { duration: 0.8, ease: 'easeInOut' as const }
          : { duration: 0.5, ease: 'easeOut' as const };

  const Wrapper = clickable ? motion.button : motion.div;

  return (
    <Wrapper
      type={clickable ? 'button' : undefined}
      onClick={clickable ? triggerWave : undefined}
      className={`relative inline-flex select-none items-center justify-center border-0 bg-transparent p-0 outline-none ${
        clickable
          ? 'cursor-pointer rounded-[30px] focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-4'
          : ''
      } ${className}`}
      style={{ width: size, height: size * 1.08 }}
      aria-label={clickable ? ariaLabel : undefined}
      aria-hidden={clickable ? undefined : true}
      data-companion-state={effectiveState}
      whileTap={clickable && !reduceMotion ? { scale: 0.985 } : undefined}
    >
      <motion.div
        className="relative flex h-full w-full items-end justify-center"
        aria-hidden="true"
        key={`${effectiveState}-${Boolean(reduceMotion)}`}
        initial={false}
        animate={motionForState}
        transition={transitionForState}
      >
        <img
          src={assetForState[effectiveState]}
          alt=""
          draggable={false}
          decoding="async"
          className="h-full w-full object-contain object-bottom drop-shadow-[0_16px_26px_rgba(17,58,41,.16)]"
        />
      </motion.div>

      {effectiveState === 'thinking' && (
        <motion.span
          aria-hidden="true"
          className="absolute right-0 top-0 flex items-center gap-1 rounded-full border border-white/90 bg-white/95 shadow-sm"
          style={{ minHeight: Math.max(16, size * 0.18), padding: Math.max(3, size * 0.035), transform: "translateX(20%)" }}
          initial={reduceMotion ? false : { opacity: 0, y: 4, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
        >
          {[0, 1, 2].map((index) => (
            <motion.i
              key={index}
              className="rounded-full bg-[#245e43]"
              style={{ width: Math.max(3, Math.min(6, size * 0.045)), height: Math.max(3, Math.min(6, size * 0.045)) }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: [0.35, 1, 0.35] }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.9, repeat: Infinity, delay: index * 0.13 }}
            />
          ))}
        </motion.span>
      )}

      {effectiveState === 'success' && (
        <motion.span
          aria-hidden="true"
          className="absolute right-0 top-0 grid place-items-center rounded-full border border-white/90 bg-[#1f6a49] text-sm font-bold text-white shadow-[0_8px_18px_rgba(23,69,47,.22)]"
          style={{ width: Math.max(18, Math.min(32, size * 0.23)), height: Math.max(18, Math.min(32, size * 0.23)) }}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 340, damping: 20 }}
        >
          ✓
        </motion.span>
      )}

      {effectiveState === 'error' && (
        <motion.span
          aria-hidden="true"
          className="absolute right-0 top-0 grid place-items-center rounded-full border border-white/90 bg-[#9a5d38] text-sm font-bold text-white shadow-[0_8px_18px_rgba(94,52,31,.2)]"
          style={{ width: Math.max(18, Math.min(32, size * 0.23)), height: Math.max(18, Math.min(32, size * 0.23)) }}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          !
        </motion.span>
      )}
    </Wrapper>
  );
};

export default VelatraMascot;
