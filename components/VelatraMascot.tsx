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

const VELA_PORTRAIT = 'data:image/webp;base64,UklGRsYEAABXRUJQVlA4ILoEAAAwIACdASp4AK0APxGCt1UsKKUjKBOqyYAiCWUA073rxMeVTXcO550FvmS18U65eB/Yrzyrj5EJBpHuBeUe8JLFwVawrfRwy5Gwi1FmG3J7xNlIz7rzWjDqELKl0ltHFKb/4PE6yO4+qckR8tb2JLoA9Y2ki0+vhwWxANIVh4bJoIaF5t1JZ0Cl14nOOYfFKo9OT4kcWJVQdzYafjRdx/9gIlgR33+BTsKmmQ0eHROglyjsk9RGwjepx0KShMaEv25fp8jwDAfp9f8R3wJBxOAyL5OvZLyRNr5r+vNzo8Ks6BBFfYgO7GP71fCmfdkPabtudxdvXItLc4PHaiQO/JEit40pCf5ReQh0AAD+8PEOnTiISIU2L/YQbJQ80AAI+1IG4Dga1t8/O6BlMKeHEYpqeGOTOv3X4U3CTG2zvsHq0icX8JsbjLg1GTS1agGwwOwmB3XnDC0kB3BhIOaAXisW4wp1uQ83D6JrJsbKmGaTW7HfXlk+aK0pwkQXGZjL9R8c03rET+7YCuqvMUzt5bpq3xqSqqnSk8QYYOwd8euAA+g99jMn1anLZ2dRmd5vKNgUGka/7gf/XgIVotPeRIBRCgbdf6Ok/gpt+ZszUSi4yTkijDUj7zP4OdRnKj0LCbNT+2pK4s5zl2eUgK5XJ/1yzLuuPBMBQi+0izcKmYpv6P7Px8RJY0JB/KlVfhEJd5ATqW8ov0ZUHfxUPwwEpn0WjWyuaF4TxOiA63MpAyy/qzVKz9exUOF+82p8wHGDrmBNcVwclhbFz4JXEL2rbuZ7JRAS4isLQ/5Iq9ujzc+OQRJgIwL6c6W9aD23c/X9KJksxxll9s/STxAq7HlPZlVLCIO2yCfZOt4MNwZ7vprRY1E3YZmQSGv55lJCk+q5L5jz0Ap4x+ycEDB37pABIImD0YP36VzDW27/L3NFtjCfZmQA81w5A2JgPvqTAFQh5Fcr5NclOLABR8yEbTf3WZoTGXFUt1uJ/r+vkO/psZfpQTah/tPNo1AOtjzhYztgVhJbtoFI95V+nLIcjZJ6ovWpelFY2YJ2wh89/las16JhbJ7kK4m0TfTuUQxRBpON4lzeFV9Yb0R24uwwEXH999RWXmksBQGS6keJ9/IWS04898eA+9D9AelbL9mckbfL863JNDXdc6NmqRht21p7IEPjCoTE4wTKZRvYCxR4XREwCvg9w31NMC4uywFcjPozGFavk+64RaK4bHJFUR6/UNALaxtI0Yqs9Fqn2SkLvA36d2KB2Bc3PFlrZG5j+FbCdgPY/2DQkiJvMbTbpdCJVm1MUVhCbQjLeAUV8Tpm24D3RYVGQ6DEHAWcKQaayZS79f/KL9US9UOqP070qYOTM7w6Akcn7FvgfC24UpK2Kr16J8B5eAdM56xtX1O/QJGk1Xem1Og4DnzIcXuShkv7uSWwfI3WcggXTKu4whjvXevXu5aRQWnXid3ykN10BKbm8maykvkOjlxXSH0cfgtSvY2sqbgatlRi0ov4zXrJQjPPGnVwXxADtjoYnh0dfF66skXsZWHJwsZYhVh2EQiH4CqQbRvf0pDE20mZ/Oywg+ecQBqoYJ0s7kyIj4OnoJ4TxPLnsBRbynb2AYAA';

export const VelatraMascot: React.FC<VelatraMascotProps> = ({
  state = 'idle',
  size = 220,
  interactive = true,
  autoWave = false,
  className = '',
  ariaLabel = 'Compagnon Velatra',
  onClick,
}) => {
  const reduceMotion = useReducedMotion();
  const [temporaryState, setTemporaryState] = useState<VelatraMascotState | null>(null);
  const clickWaveTimer = useRef<number | null>(null);
  const effectiveState = temporaryState || state;
  const clickable = interactive || Boolean(onClick);

  useEffect(() => {
    if (state !== 'idle') setTemporaryState(null);
  }, [state]);

  useEffect(() => {
    if (!autoWave || reduceMotion || state !== 'idle') return;
    const start = window.setTimeout(() => setTemporaryState('wave'), 320);
    const stop = window.setTimeout(() => setTemporaryState(null), 1500);
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
      }, 950);
    }
    onClick?.();
  };

  const Wrapper: any = clickable ? motion.button : motion.div;
  const reaction = reduceMotion
    ? undefined
    : effectiveState === 'success'
      ? { y: [0, -3, 0], scale: [1, 1.018, 1] }
      : effectiveState === 'error'
        ? { x: [0, -1.5, 1.5, 0] }
        : effectiveState === 'wave'
          ? { rotate: [0, -1.2, 1.2, 0] }
          : effectiveState === 'thinking'
            ? { y: [0, -1.5, 0] }
            : { y: 0 };

  return (
    <Wrapper
      type={clickable ? 'button' : undefined}
      onClick={clickable ? triggerWave : undefined}
      className={`relative inline-flex select-none items-center justify-center border-0 bg-transparent p-0 outline-none ${
        clickable
          ? 'cursor-pointer rounded-[30px] focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-4'
          : ''
      } ${className}`}
      style={{ width: size, height: size * 1.18 }}
      aria-label={ariaLabel}
      role={clickable ? undefined : 'img'}
      whileTap={interactive && !reduceMotion ? { scale: 0.985 } : undefined}
    >
      <div
        aria-hidden="true"
        className="absolute inset-[8%_1%_3%] rounded-[38%] bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,.88),rgba(205,221,204,.22)_58%,transparent_78%)]"
      />

      <motion.div
        aria-hidden="true"
        className="relative z-10 h-[96%] w-[82%] overflow-hidden rounded-[28%] border border-white/80 bg-[#f7f5ee] shadow-[0_16px_34px_rgba(16,54,38,.15),inset_0_1px_rgba(255,255,255,.9)]"
        initial={false}
        animate={reaction}
        transition={
          effectiveState === 'success'
            ? { duration: 0.52, ease: 'easeOut' }
            : effectiveState === 'error'
              ? { duration: 0.3, ease: 'easeOut' }
              : effectiveState === 'thinking'
                ? { duration: 1.7, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.34, ease: 'easeOut' }
        }
      >
        <img
          src={VELA_PORTRAIT}
          alt=""
          draggable={false}
          className="h-full w-full object-cover"
        />
      </motion.div>

      {effectiveState === 'thinking' && (
        <motion.span
          aria-hidden="true"
          className="absolute right-[1%] top-[10%] z-20 flex h-7 items-center gap-1 rounded-full border border-white/90 bg-white/95 px-2 shadow-sm"
          initial={reduceMotion ? false : { opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {[0, 1, 2].map(index => (
            <motion.i
              key={index}
              className="h-1.5 w-1.5 rounded-full bg-[#245e43]"
              animate={reduceMotion ? undefined : { opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: index * 0.13 }}
            />
          ))}
        </motion.span>
      )}

      {effectiveState === 'success' && (
        <motion.span
          aria-hidden="true"
          className="absolute right-[1%] top-[10%] z-20 grid h-8 w-8 place-items-center rounded-full border border-white/90 bg-[#1f6a49] text-sm font-bold text-white shadow-[0_8px_18px_rgba(23,69,47,.22)]"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.72 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 340, damping: 20 }}
        >
          ✓
        </motion.span>
      )}

      {effectiveState === 'error' && (
        <motion.span
          aria-hidden="true"
          className="absolute right-[1%] top-[10%] z-20 grid h-8 w-8 place-items-center rounded-full border border-white/90 bg-[#9a5d38] text-sm font-bold text-white shadow-[0_8px_18px_rgba(94,52,31,.2)]"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.72 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          !
        </motion.span>
      )}
    </Wrapper>
  );
};

export default VelatraMascot;
