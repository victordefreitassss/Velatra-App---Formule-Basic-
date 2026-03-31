import React, { useState, useMemo } from 'react';
import { AppState, SupplementProduct, User } from '../types';
import { Card, Button, Badge } from '../components/UI';
import { ShoppingCartIcon, SparklesIcon, InfoIcon } from '../components/Icons';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants: import('framer-motion').Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: import('framer-motion').Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

interface Recommendation {
  title: string;
  description: string;
  advice: string;
  keywords: string[];
}

const getRecommendations = (user: User | null): Recommendation[] => {
  if (!user) return [];
  const recs: Recommendation[] = [];
  
  if (user.objectifs.includes('Prise de masse')) {
    recs.push({
      title: "Objectif Prise de Masse",
      description: `Pour accompagner vos ${user.weight}kg vers une prise de masse musculaire optimale, l'apport calorique et protéique est crucial.`,
      advice: "Privilégiez une Whey ou un Gainer après l'entraînement pour la construction musculaire, et de la Créatine pour améliorer votre force et vos performances.",
      keywords: ['whey', 'gainer', 'créatine', 'creatine', 'protéine', 'masse']
    });
  }
  
  if (user.objectifs.includes('Perte de poids')) {
    recs.push({
      title: "Objectif Sèche & Définition",
      description: "L'enjeu est d'optimiser votre perte de graisse tout en conservant votre masse musculaire durement acquise.",
      advice: "Une Whey Isolate (très faible en sucres et graisses) pour la récupération, couplée à un brûleur de graisse ou de la L-Carnitine pour mobiliser les graisses pendant l'effort.",
      keywords: ['isolate', 'brûleur', 'carnitine', 'minceur', 'perte', 'sèche', 'fat burner']
    });
  }

  if (user.objectifs.includes('Performance sportive') || user.objectifs.includes('Prépa physique')) {
    recs.push({
      title: "Objectif Performance",
      description: "Pour soutenir des entraînements intenses, repousser vos limites et garantir une récupération rapide.",
      advice: "Un Pre-workout avant la séance pour l'énergie, des BCAA/EAA pendant l'effort pour l'endurance musculaire, et de la Whey pour la réparation tissulaire.",
      keywords: ['pre-workout', 'bcaa', 'eaa', 'énergie', 'récupération', 'whey', 'booster']
    });
  }

  if (user.objectifs.includes('Sport santé bien-être') || user.objectifs.includes('Remise en forme') || recs.length === 0) {
    recs.push({
      title: "Santé & Vitalité au quotidien",
      description: "Les fondations pour maintenir un corps en pleine santé, éviter les carences et soutenir votre système immunitaire.",
      advice: "Des Oméga 3 pour le système cardiovasculaire, un complexe Multivitamines pour la vitalité, et du Magnésium pour la récupération nerveuse et musculaire.",
      keywords: ['vitamine', 'oméga', 'magnésium', 'santé', 'articulation', 'collagène', 'zinc']
    });
  }

  return recs;
};

export const MemberSupplementsPage: React.FC<{ state: AppState, showToast: any }> = ({ state, showToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Toutes');

  const recommendations = useMemo(() => getRecommendations(state.user), [state.user]);

  const filteredProducts = state.supplementProducts.filter(p => {
    if (!p.nom.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterCategory !== 'Toutes' && p.cat !== filterCategory) return false;
    return true;
  });

  const getMatchingProducts = (keywords: string[]) => {
    return state.supplementProducts.filter(p => 
      keywords.some(kw => 
        p.nom.toLowerCase().includes(kw.toLowerCase()) || 
        p.cat.toLowerCase().includes(kw.toLowerCase())
      )
    ).slice(0, 3); // Show max 3 matching products per recommendation
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-12 page-transition pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black italic text-zinc-900 tracking-tight uppercase">Boutique & Conseils</h1>
          <p className="text-zinc-500 text-sm font-medium mt-1">Découvrez notre sélection de compléments partenaires</p>
        </div>
      </div>

      {/* Recommendations Section */}
      {recommendations.length > 0 && !searchTerm && filterCategory === 'Toutes' && (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <SparklesIcon size={24} className="text-velatra-accent" />
            <h2 className="text-2xl font-bold text-zinc-900">Recommandé pour vous</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {recommendations.map((rec, idx) => {
              const matchingProducts = getMatchingProducts(rec.keywords);
              return (
                <motion.div key={idx} variants={itemVariants}>
                  <Card className="bg-white/60 backdrop-blur-xl  flex flex-col h-full hover:shadow-lg transition-all duration-300">
                    <div className="mb-4">
                      <h3 className="text-xl font-black mb-2 text-zinc-900">{rec.title}</h3>
                      <p className="text-zinc-700 text-sm mb-3">{rec.description}</p>
                      <div className="bg-white/60 rounded-xl p-3 text-sm text-zinc-800 flex items-start gap-3">
                        <InfoIcon size={18} className="shrink-0 mt-0.5 opacity-70" />
                        <p><strong>Le conseil du coach :</strong> {rec.advice}</p>
                      </div>
                    </div>
                    
                    {matchingProducts.length > 0 && (
                      <div className="mt-auto pt-4 border-t border-black/5">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Produits suggérés</h4>
                        <div className="space-y-3">
                          {matchingProducts.map(product => (
                            <div key={product.id} className="flex items-center justify-between bg-white/80 p-3 rounded-xl shadow-sm">
                              <div>
                                <div className="font-bold text-sm text-zinc-900">{product.nom}</div>
                                <div className="text-xs text-zinc-500">{product.prixVente} €</div>
                              </div>
                              {product.lienPartenaire ? (
                                <Button 
                                  variant="primary" 
                                  onClick={() => window.open(product.lienPartenaire, '_blank')}
                                  className="!py-1.5 !px-3 text-xs bg-zinc-900 hover:bg-zinc-800 text-white"
                                >
                                  Voir le produit
                                </Button>
                              ) : (
                                <Badge variant="dark" className="text-[10px]">Bientôt dispo</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Full Catalog Section */}
      <div className="space-y-6 pt-8 border-t ">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl font-bold text-zinc-900">Tout le catalogue</h2>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-900">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
              <input 
                type="text"
                placeholder="Rechercher un produit..." 
                className="w-full pl-12 pr-4 py-2 bg-zinc-50 border  rounded-2xl font-bold text-sm text-zinc-900 focus:outline-none focus:border-velatra-accent transition-colors" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {["Toutes", "Protéines", "Vitamines", "Équipement", "Autre"].map(f => (
            <button
              key={f}
              onClick={() => setFilterCategory(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${filterCategory === f ? 'bg-velatra-accent text-white' : 'bg-zinc-50 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
            >
              {f}
            </button>
          ))}
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          <AnimatePresence>
          {filteredProducts.map(product => (
            <motion.div key={product.id} variants={itemVariants} layout exit={{ opacity: 0, scale: 0.95 }}>
              <Card className="bg-white/60 backdrop-blur-xl  flex flex-col justify-between h-full hover:shadow-lg transition-all duration-300">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="blue">{product.cat}</Badge>
                    {product.lienPartenaire && <Badge variant="dark" className="bg-zinc-900 text-white border-none">Partenaire</Badge>}
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 mb-1">{product.nom}</h3>
                  <div className="text-2xl font-black text-velatra-accent mb-4">{product.prixVente} €</div>
                </div>
                <div className="flex items-center justify-between border-t  pt-4 mt-2">
                  {product.lienPartenaire ? (
                    <Button 
                      variant="primary" 
                      onClick={() => window.open(product.lienPartenaire, '_blank')}
                      className="w-full bg-zinc-900 hover:bg-zinc-800 text-white flex items-center justify-center gap-2"
                    >
                      <ShoppingCartIcon size={16} /> Acheter sur le site
                    </Button>
                  ) : (
                    <Button 
                      variant="secondary" 
                      disabled
                      className="w-full flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
                    >
                      Bientôt disponible
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
          </AnimatePresence>
          {filteredProducts.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="col-span-full text-center py-12 text-zinc-500 italic bg-white/40 backdrop-blur-md rounded-3xl border "
            >
              Aucun produit trouvé.
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
