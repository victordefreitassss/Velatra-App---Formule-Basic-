import React from 'react';

export const FluidBackground: React.FC = () => (
  <div className="fixed inset-0 -z-50 pointer-events-none bg-[#f8faf8]" aria-hidden="true">
    <div className="absolute left-1/2 top-0 h-[32rem] w-[72rem] -translate-x-1/2 rounded-full bg-emerald-200/20 blur-[130px]" />
  </div>
);
