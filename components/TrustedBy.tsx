import React from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Shield, Trophy, Activity, Zap } from 'lucide-react';

export const TrustedBy: React.FC = () => {
  const brandLogos = [
    { name: 'KRONOS GYM', icon: Dumbbell },
    { name: 'ALTITUDE FIT', icon: Trophy },
    { name: 'SOMA ATHLETICS', icon: Activity },
    { name: 'OLYMPIA CLUB', icon: Shield },
    { name: 'SPARK STUDIOS', icon: Zap },
  ];

  return (
    <div className="py-10 border-y border-zinc-200/50 dark:border-zinc-850 bg-white/20 dark:bg-zinc-900/10 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-6">
        <p className="text-center text-[10px] font-black uppercase tracking-[3px] text-zinc-400 dark:text-zinc-500 mb-8">
          REJOIGNEZ PLUS DE 800+ COACHS ET SALLES DE SPORT FRANÇAISES
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 md:justify-between px-4">
          {brandLogos.map((brand, i) => {
            const Icon = brand.icon;
            return (
              <motion.div
                key={brand.name}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 0.5, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="flex items-center gap-2 group cursor-default"
              >
                <Icon className="w-5 h-5 text-zinc-900 dark:text-white transition-transform group-hover:scale-110" />
                <span className="font-display font-black text-sm tracking-wider text-zinc-900 dark:text-white">
                  {brand.name}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
