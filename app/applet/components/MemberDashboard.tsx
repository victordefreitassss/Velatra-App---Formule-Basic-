import React from 'react';
import { AppState } from '../types';
import { 
  DumbbellIcon, BarChartIcon, AppleIcon, 
  UserIcon, CalendarIcon, MessageCircleIcon, 
  ShoppingCartIcon, PlayCircleIcon, 
  ActivityIcon, GiftIcon, QrCodeIcon, FlameIcon, 
  TargetIcon, FileTextIcon, MusicIcon
} from './Icons';
import { motion } from 'framer-motion';

interface MemberDashboardProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showToast: (m: string, t?: any) => void;
  onToggleTimer: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export const MemberDashboard: React.FC<MemberDashboardProps> = ({ state, setState }) => {
  const navigate = (page: string) => {
    setState(s => ({ ...s, page: page as any }));
  };

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#121B22] to-[#0A0F14] overflow-y-auto no-scrollbar pb-24">
      {/* HEADER LOGO */}
      <div className="pt-16 pb-12 flex flex-col items-center">
        <h1 className="text-4xl font-black text-white italic tracking-tighter">VELATRA</h1>
        <div className="w-48 h-0.5 bg-yellow-400 mt-2 mb-1"></div>
        <p className="text-white text-[10px] tracking-[0.2em] font-medium uppercase opacity-90">SE DÉPASSER - SE SURPASSER</p>
      </div>

      {/* GRID */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-3 gap-x-3 gap-y-8 px-4 max-w-md mx-auto"
      >
        {/* ROW 1 */}
        <motion.button variants={itemVariants} onClick={() => navigate('calendar')} className="flex flex-col items-center gap-2 group">
          <div className="w-[90px] h-[90px] bg-white rounded-[28px] flex items-center justify-center text-[#1E293B] shadow-lg group-active:scale-95 transition-transform">
            <DumbbellIcon size={40} strokeWidth={1.5} />
          </div>
          <span className="text-white text-[11px] text-center font-medium leading-tight mt-1">Entraînements</span>
        </motion.button>
        
        <motion.button variants={itemVariants} onClick={() => navigate('performances')} className="flex flex-col items-center gap-2 group">
          <div className="w-[90px] h-[90px] bg-white rounded-[28px] flex items-center justify-center text-[#1E293B] shadow-lg group-active:scale-95 transition-transform">
            <BarChartIcon size={40} strokeWidth={1.5} />
          </div>
          <span className="text-white text-[11px] text-center font-medium leading-tight mt-1">Mes Progrès</span>
        </motion.button>
        
        <motion.button variants={itemVariants} onClick={() => navigate('nutrition')} className="flex flex-col items-center gap-2 group">
          <div className="w-[90px] h-[90px] bg-white rounded-[28px] flex items-center justify-center text-[#1E293B] shadow-lg group-active:scale-95 transition-transform">
            <AppleIcon size={40} strokeWidth={1.5} />
          </div>
          <span className="text-white text-[11px] text-center font-medium leading-tight mt-1">Nutrition</span>
        </motion.button>

        {/* ROW 2 */}
        <motion.button variants={itemVariants} onClick={() => navigate('evolution')} className="flex flex-col items-center gap-2 group">
          <div className="w-[90px] h-[90px] bg-gradient-to-br from-cyan-400 to-blue-600 rounded-[28px] flex items-center justify-center text-white shadow-lg group-active:scale-95 transition-transform relative overflow-hidden">
            <FlameIcon size={46} strokeWidth={1.5} />
          </div>
          <span className="text-white text-[10px] text-center uppercase tracking-widest font-bold leading-tight mt-1">Level Up</span>
        </motion.button>

        <motion.button variants={itemVariants} onClick={() => navigate('profile')} className="flex flex-col items-center gap-2 group">
          <div className="w-[90px] h-[90px] bg-yellow-400 rounded-[28px] flex items-center justify-center text-black shadow-lg group-active:scale-95 transition-transform">
            <QrCodeIcon size={50} strokeWidth={1.5} />
          </div>
          <span className="text-white text-[11px] text-center font-medium leading-tight mt-1">Carte</span>
        </motion.button>

        <motion.button variants={itemVariants} onClick={() => navigate('supplements')} className="flex flex-col items-center gap-2 group">
          <div className="w-[90px] h-[90px] bg-[#0088CC] rounded-[28px] flex items-center justify-center text-white shadow-[0_0_15px_rgba(0,136,204,0.5)] group-active:scale-95 transition-transform relative overflow-hidden">
             {/* handshake simulation using gift */}
            <GiftIcon size={46} strokeWidth={1.5} />
          </div>
          <span className="text-white text-[11px] text-center font-medium leading-tight mt-1">Bons Plans</span>
        </motion.button>

        {/* ROW 3 */}
        <motion.button variants={itemVariants} onClick={() => navigate('profile')} className="flex flex-col items-center gap-2 group">
          <div className="w-[90px] h-[90px] bg-white rounded-[28px] flex items-center justify-center text-[#1E293B] shadow-lg group-active:scale-95 transition-transform relative">
            <UserIcon size={38} strokeWidth={1.5} />
            <div className="absolute top-3 right-3 w-[18px] h-[18px] bg-white rounded-full flex items-center justify-center -mr-1 -mt-1 shadow-sm">
                 <div className="w-3.5 h-3.5 bg-zinc-900 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-sm rotate-45"></div>
                 </div>
            </div>
          </div>
          <span className="text-white text-[11px] text-center font-medium leading-tight mt-1">Mon Espace Adhérent</span>
        </motion.button>

        <motion.button variants={itemVariants} onClick={() => navigate('chat')} className="flex flex-col items-center gap-2 group">
          <div className="w-[90px] h-[90px] bg-white rounded-[28px] flex items-center justify-center text-[#1E293B] shadow-lg group-active:scale-95 transition-transform relative border-t-[8px] border-yellow-400">
            <div className="absolute -top-[14px] bg-yellow-400 text-black text-[8px] font-black uppercase px-2 py-[2px] rounded-sm shadow-sm">Ultimate</div>
            <MessageCircleIcon size={38} strokeWidth={1.5} className="mt-1" />
          </div>
          <span className="text-white text-[11px] text-center font-medium leading-tight mt-1 max-w-[85px]">Inviter un ami</span>
        </motion.button>

        <motion.button variants={itemVariants} onClick={() => navigate('planning')} className="flex flex-col items-center gap-2 group">
          <div className="w-[90px] h-[90px] bg-white rounded-[28px] flex items-center justify-center text-[#1E293B] shadow-lg group-active:scale-95 transition-transform">
            <CalendarIcon size={40} strokeWidth={1.5} />
          </div>
          <span className="text-white text-[11px] text-center font-medium leading-tight mt-1">Réservation cours</span>
        </motion.button>

        {/* ROW 4 */}
        <motion.button variants={itemVariants} onClick={() => navigate('drive')} className="flex flex-col items-center gap-2 group">
          <div className="w-[90px] h-[90px] bg-white rounded-[28px] flex items-center justify-center text-[#1E293B] shadow-lg group-active:scale-95 transition-transform relative overflow-hidden">
             <div className="absolute top-0 w-full h-[40%] bg-[#1E293B] flex items-center justify-center rounded-t-[20px] text-white">
                <PlayCircleIcon size={20} strokeWidth={2} />
             </div>
             <span className="mt-8 font-black italic text-[#1E293B] text-sm tracking-tighter">HOME PARK</span>
          </div>
          <span className="text-white text-[11px] text-center font-medium leading-tight mt-1">Documents</span>
        </motion.button>

        <motion.button variants={itemVariants} onClick={() => navigate('about')} className="flex flex-col items-center gap-2 group">
          <div className="w-[90px] h-[90px] bg-white rounded-[28px] flex items-center justify-center text-[#1E293B] shadow-lg group-active:scale-95 transition-transform">
            <MusicIcon size={40} strokeWidth={1.5} />
          </div>
          <span className="text-white text-[11px] text-center font-medium leading-tight mt-1">Musique du club</span>
        </motion.button>

        <motion.button variants={itemVariants} onClick={() => navigate('nutrition')} className="flex flex-col items-center gap-2 group">
          <div className="w-[90px] h-[90px] bg-white rounded-[28px] flex items-center justify-center text-[#1E293B] shadow-lg group-active:scale-95 transition-transform">
            <FileTextIcon size={40} strokeWidth={1.5} />
          </div>
          <span className="text-white text-[11px] text-center font-medium leading-tight mt-1">Recettes</span>
        </motion.button>

        {/* ROW 5 */}
        <motion.button variants={itemVariants} onClick={() => navigate('guide')} className="flex flex-col items-center gap-2 group pb-6">
          <div className="w-[90px] h-[90px] bg-white rounded-[28px] flex items-center justify-center text-[#1E293B] shadow-lg group-active:scale-95 transition-transform relative">
            <MessageCircleIcon size={42} strokeWidth={1.5} />
            <div className="absolute ml-[18px] top-6 bg-white rounded-full">
                <span className="text-[#1E293B] text-[20px] font-black">?</span>
            </div>
          </div>
          <span className="text-white text-[11px] text-center font-medium leading-tight mt-1">FAQ / Aide</span>
        </motion.button>

        <motion.button variants={itemVariants} onClick={() => navigate('ai_coach')} className="flex flex-col items-center gap-2 group pb-6">
          <div className="w-[90px] h-[90px] bg-white rounded-[28px] flex items-center justify-center text-[#1E293B] shadow-lg group-active:scale-95 transition-transform relative border-t-[8px] border-yellow-400">
            <div className="absolute -top-[14px] bg-yellow-400 text-black text-[8px] font-black uppercase px-2 py-[2px] rounded-sm shadow-sm">Ultimate</div>
            <div className="mt-1 flex flex-col items-center">
              <UserIcon size={34} strokeWidth={1.5} />
              <div className="bg-[#1E293B] rounded-full px-1.5 py-[2px] mt-0.5 text-[8px] text-white font-bold leading-none">COACH</div>
            </div>
          </div>
          <span className="text-white text-[11px] text-center font-medium leading-tight mt-1">Coach Virtuel</span>
        </motion.button>

        <motion.button variants={itemVariants} onClick={() => navigate('performances')} className="flex flex-col items-center gap-2 group pb-6">
          <div className="w-[90px] h-[90px] bg-white rounded-[28px] flex items-center justify-center text-[#1E293B] shadow-lg group-active:scale-95 transition-transform relative border-t-[8px] border-yellow-400">
            <div className="absolute -top-[14px] bg-yellow-400 text-black text-[8px] font-black uppercase px-2 py-[2px] rounded-sm shadow-sm">Ultimate</div>
            <div className="mt-1 flex flex-col items-center justify-center w-full">
              <div className="w-11 h-8 border-[2.5px] border-[#1E293B] rounded-md relative flex items-center justify-center mt-2">
                 <div className="absolute -top-[6px] w-6 h-1 bg-[#1E293B] mx-auto rounded-full"></div>
                 <span className="text-[#1E293B] font-bold text-sm">%</span>
              </div>
            </div>
          </div>
          <span className="text-white text-[11px] text-center font-medium leading-tight mt-1">Statistiques</span>
        </motion.button>
      </motion.div>
    </div>
  );
};
