
import React from 'react';
import { AppState } from '../types';
import { Card, Badge, StatBox } from '../components/UI';
import { GiftIcon, HistoryIcon, ShoppingCartIcon, TargetIcon, FlameIcon } from '../components/Icons';

export const MemberLoyaltyPage: React.FC<{ state: AppState, setState: any }> = ({ state }) => {
  const user = state.user!;
  const myOrders = state.supplementOrders.filter(o => o.adherentId === user.id);
  const points = user.pointsFidelite || 0;
  const reductionDisponible = (points * 0.05).toFixed(2); // 1 pt = 0.05€

  return (
    <div className="space-y-8 page-transition pb-24">
      <div className="text-center space-y-2">
        <div className="inline-block p-5 bg-velatra-accent/10 rounded-full text-velatra-accent mb-2 shadow-inner">
           <GiftIcon size={48} />
        </div>
        <h1 className="text-4xl font-display font-bold tracking-tight uppercase leading-none text-white">FIDÉLITÉ</h1>
        <p className="text-velatra-textDark text-[10px] uppercase font-bold tracking-[3px]">Programme VELATRA x Nutripure</p>
      </div>

      <Card className="!bg-gradient-to-br from-velatra-accent to-velatra-accentDark border-none !p-10 text-center relative overflow-hidden shadow-2xl shadow-velatra-accent/40">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -ml-32 -mt-32" />
        <div className="relative z-10 space-y-4">
           <div className="text-[10px] font-black uppercase tracking-[3px] text-white/70">Points Accumulés</div>
           <div className="text-7xl font-black tracking-tighter text-white drop-shadow-2xl">{points}</div>
           <div className="text-sm font-bold text-white/90 uppercase tracking-widest pt-2">
             = {reductionDisponible}€ de réduction immédiate
           </div>
           <div className="pt-6">
              <Badge variant="dark" className="!bg-white/10 !text-white border-white/20 !py-2 !px-6">MEMBRE GOLD</Badge>
           </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <Card className="space-y-4 !p-6 border-white/5 bg-white/[0.02]">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
               <TargetIcon className="text-velatra-accent" /> Comment ça marche ?
            </h2>
            <div className="space-y-3">
               <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 font-black text-velatra-accent text-xs">01</div>
                  <p className="text-xs text-velatra-textMuted leading-relaxed"><strong>1€ dépensé = 1 Point gagné</strong> sur tous les compléments Nutripure en club.</p>
               </div>
               <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 font-black text-velatra-accent text-xs">02</div>
                  <p className="text-xs text-velatra-textMuted leading-relaxed"><strong>100 Points = 5€</strong> de réduction sur votre prochaine commande.</p>
               </div>
               <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 font-black text-velatra-accent text-xs">03</div>
                  <p className="text-xs text-velatra-textMuted leading-relaxed"><strong>Anniversaire :</strong> Recevez 50 Points bonus automatiquement chaque année !</p>
               </div>
            </div>
         </Card>

         <Card className="space-y-4 !p-6 border-white/5 bg-white/[0.02]">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
               <HistoryIcon className="text-velatra-accent" /> Derniers achats
            </h2>
            <div className="space-y-3">
               {myOrders.length === 0 ? (
                 <p className="text-xs text-velatra-textDark italic py-10 text-center">Aucune commande enregistrée</p>
               ) : (
                 myOrders.slice(0, 4).map(o => (
                   <div key={o.id} className="p-3 bg-black/40 rounded-xl border border-white/5 flex justify-between items-center">
                      <div>
                         <div className="text-[10px] font-bold text-white">{o.produits[0]?.nom} {o.produits.length > 1 ? `+${o.produits.length-1}` : ''}</div>
                         <div className="text-[9px] text-velatra-textDark uppercase">{new Date(o.date).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                         <div className="text-xs font-black text-velatra-accent">{o.total.toFixed(2)}€</div>
                         <div className="text-[8px] text-emerald-500 font-black">+{o.pointsGagnes} PTS</div>
                      </div>
                   </div>
                 ))
               )}
            </div>
         </Card>
      </div>

      <Card className="!bg-emerald-500/5 border-emerald-500/10 !p-8 flex items-center gap-6">
         <div className="p-4 bg-emerald-500/20 rounded-2xl text-emerald-500">
            <FlameIcon size={32} />
         </div>
         <div>
            <h3 className="text-lg font-black text-white uppercase leading-none mb-1">Coach Éthique</h3>
            <p className="text-xs text-velatra-textMuted">Toutes vos commandes soutiennent directement votre coach pour la qualité de son suivi.</p>
         </div>
      </Card>
    </div>
  );
};
