import React from 'react';
import { AppState } from '../types';
import { Card, Button, Badge } from '../components/UI';
import { ShoppingCartIcon, InfoIcon, TargetIcon, ActivityIcon, ShieldIcon } from '../components/Icons';
import { motion } from 'framer-motion';

const containerVariants: import('framer-motion').Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: import('framer-motion').Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export const MemberSupplementsPage: React.FC<{ state: AppState, showToast: any }> = ({ state, showToast }) => {
  const supplements = [
    {
      id: 'whey',
      title: 'Whey Protein',
      category: 'Récupération & Muscle',
      icon: <ActivityIcon size={24} className="text-blue-500" />,
      color: 'blue',
      description: 'La protéine en poudre la plus populaire. Idéale pour la récupération musculaire après l\'entraînement grâce à son assimilation rapide.',
      tips: [
        'Prendre 1 shaker (30g) dans les 30 minutes après l\'entraînement.',
        'Peut aussi servir de collation riche en protéines dans la journée.',
        'Mélanger avec de l\'eau pour une assimilation plus rapide, ou du lait pour plus d\'onctuosité.'
      ],
      image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: 'creatine',
      title: 'Créatine Monohydrate',
      category: 'Force & Puissance',
      icon: <TargetIcon size={24} className="text-red-500" />,
      color: 'red',
      description: 'Le supplément le plus étudié au monde. Augmente la force, la puissance explosive et favorise la prise de masse musculaire.',
      tips: [
        'Prendre 3g à 5g par jour, tous les jours (même les jours de repos).',
        'Pas besoin de faire de "phase de charge".',
        'Boire suffisamment d\'eau tout au long de la journée.'
      ],
      image: 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: 'vitamins',
      title: 'Multivitamines & Oméga-3',
      category: 'Santé & Vitalité',
      icon: <ShieldIcon size={24} className="text-green-500" />,
      color: 'green',
      description: 'La base pour la santé générale. Comble les carences de l\'alimentation moderne et soutient le système immunitaire et cardiovasculaire.',
      tips: [
        'Prendre au cours d\'un repas contenant des lipides pour une meilleure absorption.',
        'Privilégier les Oméga-3 riches en EPA et DHA.',
        'Ne remplace pas une alimentation variée et équilibrée.'
      ],
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800'
    }
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 page-transition pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black italic text-zinc-900 tracking-tight uppercase">Compléments</h1>
          <p className="text-zinc-500 text-sm font-medium mt-1">Le guide ultime pour optimiser vos résultats</p>
        </div>
        
        <Button 
          variant="primary" 
          onClick={() => showToast("Notre boutique partenaire arrive très bientôt !", "info")}
          className="shadow-xl shadow-emerald-500/20"
        >
          <ShoppingCartIcon size={18} className="mr-2" />
          Acheter nos recommandations
        </Button>
      </div>

      <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 text-zinc-900 border-0 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 text-zinc-900 text-xs font-bold uppercase tracking-wider">
              <InfoIcon size={14} />
              <span>Conseil du Coach</span>
            </div>
            <h2 className="text-2xl font-black italic">Les compléments ne sont pas magiques.</h2>
            <p className="text-zinc-600 leading-relaxed">
              Ils portent bien leur nom : ils viennent <strong>compléter</strong> une alimentation déjà solide et un entraînement régulier. Ne dépensez pas votre argent dans des suppléments si votre nutrition de base et votre sommeil ne sont pas optimisés.
            </p>
          </div>
        </div>
      </Card>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {supplements.map((supp, index) => (
          <motion.div key={supp.id} variants={itemVariants}>
            <Card className="overflow-hidden p-0 border-zinc-200/50 hover:shadow-xl transition-all duration-300">
              <div className="flex flex-col md:flex-row">
                <div className="md:w-1/3 h-48 md:h-auto relative">
                  <img 
                    src={supp.image} 
                    alt={supp.title} 
                    className="absolute inset-0 w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent md:bg-gradient-to-r"></div>
                  <div className="absolute bottom-4 left-4 right-4 md:bottom-auto md:top-4">
                    <Badge variant={supp.color as any} className="shadow-lg backdrop-blur-md bg-zinc-100">
                      {supp.category}
                    </Badge>
                  </div>
                </div>
                
                <div className="p-6 md:w-2/3 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${supp.color}-50`}>
                      {supp.icon}
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900">{supp.title}</h3>
                  </div>
                  
                  <p className="text-zinc-600 mb-6 leading-relaxed">
                    {supp.description}
                  </p>
                  
                  <div className="bg-white rounded-xl p-4 border border-zinc-200">
                    <h4 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <TargetIcon size={16} className="text-emerald-500" />
                      Comment l'utiliser
                    </h4>
                    <ul className="space-y-2">
                      {supp.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-500">
                          <span className="text-emerald-500 font-bold mt-0.5">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};
