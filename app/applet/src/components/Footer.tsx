import React from 'react';

export const Footer = () => {
  return (
    <footer className="bg-white border-t border-zinc-100 py-12 px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-zinc-400 text-xs text-center font-sans">
        <div className="flex items-center gap-2 justify-center">
          <div className="w-6 h-6 rounded bg-zinc-950 flex items-center justify-center">
            <span className="text-white font-mono font-black text-[10px]">V</span>
          </div>
          <span className="font-semibold text-zinc-800 font-display">Velatra</span>
        </div>
        <div className="space-x-4">
          <span className="text-zinc-500 font-normal">© {new Date().getFullYear()} Velatra • Fait avec élégance</span>
        </div>
      </div>
    </footer>
  );
};
