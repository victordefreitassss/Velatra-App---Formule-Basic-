
import React from 'react';
import { User, Page, Club } from '../types';
import { 
  HomeIcon, UsersIcon, LayersIcon, BarChartIcon, 
  DumbbellIcon, InfoIcon, LogOutIcon, GiftIcon, TargetIcon, CalendarIcon, HistoryIcon, DatabaseIcon, ShoppingCartIcon, TimerIcon, XIcon, MegaphoneIcon, BotIcon, DollarSignIcon, ClipboardIcon, AppleIcon, LockIcon, SettingsIcon, MenuIcon, ShieldIcon, MessageCircleIcon
} from './Icons';
import { Timer } from './Timer';

interface LayoutProps {
  user: User;
  club: Club | null;
  activePage: Page;
  onPageChange: (p: Page) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const AppLogo: React.FC<{ club: Club | null }> = ({ club }) => (
  <div className="flex flex-col">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.2)] overflow-hidden flex items-center justify-center shrink-0 bg-velatra-textDark">
        <img src="https://i.postimg.cc/VLMLPbh9/Design-sans-titre.png" alt="Velatra Logo" className="w-full h-full object-contain scale-[1.4]" />
      </div>
      <div className="font-display font-bold text-3xl tracking-tight leading-none text-zinc-900">
        VELA<span className="text-velatra-accent">TRA</span>
      </div>
    </div>
    <div className="text-[8px] tracking-[2px] text-zinc-500 font-bold uppercase mt-1 pl-12 opacity-80">
      APPLICATION SUR MESURE
    </div>
    {club && (
      <div className="mt-4 p-3 bg-zinc-50 border border-zinc-200 rounded-xl backdrop-blur-sm">
        <div className="text-[8px] uppercase tracking-widest text-zinc-500 font-black mb-1">Code d'accès Club</div>
        <div className="text-xs font-mono font-bold text-velatra-accent select-all">{club.id}</div>
      </div>
    )}
  </div>
);

export const Layout: React.FC<LayoutProps> = ({ user, club, activePage, onPageChange, onLogout, children }) => {
  const coachItems: { id: string, icon: React.FC<any>, label: string, requiredPlan?: 'basic' | 'classic' | 'premium' }[] = [
    { id: 'home', icon: HomeIcon, label: 'Tableau' },
    { id: 'users', icon: UsersIcon, label: 'Membres' },
    { id: 'chat', icon: MessageCircleIcon, label: 'Discussion' },
    { id: 'presets', icon: LayersIcon, label: 'Modèles' },
    { id: 'exercises', icon: DumbbellIcon, label: 'Exos' },
    { id: 'nutrition', icon: AppleIcon, label: 'Nutrition' },
    { id: 'crm_finances', icon: DollarSignIcon, label: 'Finances', requiredPlan: 'classic' },
    { id: 'calendar', icon: CalendarIcon, label: 'Planning', requiredPlan: 'classic' },
    { id: 'crm_pipeline', icon: TargetIcon, label: 'ProspectFlow', requiredPlan: 'premium' },
    { id: 'marketing', icon: MegaphoneIcon, label: 'Marketing', requiredPlan: 'premium' },
    { id: 'supplements', icon: ShoppingCartIcon, label: 'Boutique', requiredPlan: 'premium' },
    { id: 'loyalty', icon: GiftIcon, label: 'Fidélité', requiredPlan: 'premium' },
    { id: 'about', icon: InfoIcon, label: 'Club' },
    { id: 'settings', icon: SettingsIcon, label: 'Paramètres' },
  ];

  const memberItems: { id: string, icon: React.FC<any>, label: string, requiredPlan?: 'basic' | 'classic' | 'premium' }[] = [
    { id: 'home', icon: HomeIcon, label: 'Espace' },
    { id: 'calendar', icon: CalendarIcon, label: 'Séance' },
    { id: 'ai_coach', icon: BotIcon, label: 'Coach IA' },
    { id: 'performances', icon: BarChartIcon, label: 'Records' },
    { id: 'nutrition', icon: AppleIcon, label: 'Nutrition' },
    { id: 'supplements', icon: ShoppingCartIcon, label: 'Boutique', requiredPlan: 'premium' },
    { id: 'loyalty', icon: GiftIcon, label: 'Fidélité', requiredPlan: 'premium' },
    { id: 'about', icon: InfoIcon, label: 'Club' },
  ];

  const superadminItems: { id: string, icon: React.FC<any>, label: string, requiredPlan?: 'basic' | 'classic' | 'premium' }[] = [
    { id: 'admin', icon: ShieldIcon, label: 'Admin' }
  ];

  const hasRequiredPlan = (requiredPlan?: 'basic' | 'classic' | 'premium') => {
    if (!requiredPlan || requiredPlan === 'basic') return true;
    const currentPlan = club?.plan || 'basic';
    if (currentPlan === 'premium') return true;
    if (currentPlan === 'classic' && requiredPlan === 'classic') return true;
    return false;
  };

  const menuItems = user.role === 'superadmin' 
    ? superadminItems 
    : (user.role === 'coach' || user.role === 'owner') 
      ? coachItems 
      : memberItems;

  const [showTimer, setShowTimer] = React.useState(false);
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-transparent">
      <aside className="hidden md:flex flex-col w-[280px] bg-velatra-bgCard/80 backdrop-blur-xl border-r border-zinc-200 h-screen fixed left-0 top-0 py-12 px-6 z-40 shadow-2xl">
        <div className="mb-12 px-4">
           <AppLogo club={club} />
        </div>
        
        <nav className="flex-1 space-y-2 overflow-y-auto no-scrollbar px-2">
          {menuItems.map(item => (
            <button 
              key={item.id}
              onClick={() => onPageChange(item.id as Page)}
              className={`
                flex items-center justify-between px-4 py-3 rounded-xl w-full transition-all duration-300 group
                ${activePage === item.id ? 'bg-velatra-accent text-white shadow-[0_0_15px_rgba(99,102,241,0.2)] scale-[1.01]' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}
              `}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} strokeWidth={activePage === item.id ? 2.5 : 2} className={`${activePage === item.id ? '' : 'group-hover:scale-110 transition-transform duration-300'}`} />
                <span className="text-[11px] font-bold uppercase tracking-[1.5px]">{item.label}</span>
              </div>
              {item.requiredPlan && !hasRequiredPlan(item.requiredPlan) && user.role !== 'superadmin' && (
                <LockIcon size={12} className="opacity-50 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          ))}
          
          <div className="pt-4 mt-4 border-t border-zinc-200">
            <button 
              onClick={() => setShowTimer(!showTimer)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all duration-300 group
                ${showTimer ? 'bg-zinc-100 text-zinc-900 shadow-inner' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}
              `}
            >
              <TimerIcon size={18} className="group-hover:rotate-12 transition-transform duration-300" />
              <span className="text-[11px] font-bold uppercase tracking-[1.5px]">Timer</span>
            </button>
          </div>
        </nav>

        <div className="px-2">
          <button onClick={onLogout} className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl w-full text-zinc-500 hover:text-red-400 transition-all hover:bg-red-500/10 group">
            <LogOutIcon size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
            <span className="text-[11px] font-bold uppercase tracking-[1.5px]">Quitter</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-[280px] min-h-screen relative">
        <div className="p-4 md:p-12 max-w-6xl mx-auto pb-32 md:pb-12">
          {children}
        </div>

        {showTimer && (
          <div className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[100] animate-in slide-in-from-bottom-10 duration-500">
            <div className="relative">
              <button 
                onClick={() => setShowTimer(false)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center z-10 shadow-lg hover:scale-110 transition-transform"
              >
                <XIcon size={12} />
              </button>
              <Timer />
            </div>
          </div>
        )}

        <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] h-14 bg-velatra-bgCard/90 backdrop-blur-2xl border border-zinc-200 rounded-full flex items-center justify-around z-50 px-4 shadow-2xl">
          {menuItems.slice(0, 4).map(item => (
            <button 
              key={item.id}
              onClick={() => {
                onPageChange(item.id as Page);
                setShowMobileMenu(false);
              }}
              className={`flex flex-col items-center gap-1 transition-all duration-300 relative py-1 ${activePage === item.id ? 'text-velatra-accent scale-110 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              <item.icon size={20} strokeWidth={activePage === item.id ? 2.5 : 2} />
            </button>
          ))}
          <button 
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className={`flex flex-col items-center gap-1 transition-all duration-300 relative py-1 ${showMobileMenu ? 'text-velatra-accent scale-110 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            <MenuIcon size={20} />
          </button>
        </nav>

        {/* Mobile Menu Drawer */}
        {showMobileMenu && (
          <div 
            className="md:hidden fixed inset-0 bg-white/80 backdrop-blur-sm z-40 animate-in fade-in duration-300"
            onClick={() => setShowMobileMenu(false)}
          >
            <div 
              className="absolute bottom-28 left-4 right-4 bg-velatra-bgCard border border-zinc-200 rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 max-h-[60vh] overflow-y-auto no-scrollbar"
              onClick={e => e.stopPropagation()}
            >
              <div className="grid grid-cols-4 gap-y-6 gap-x-4">
                {menuItems.slice(4).map(item => (
                  <button 
                    key={item.id}
                    onClick={() => {
                      onPageChange(item.id as Page);
                      setShowMobileMenu(false);
                    }}
                    className={`flex flex-col items-center gap-2 transition-all duration-300 ${activePage === item.id ? 'text-velatra-accent' : 'text-zinc-500 hover:text-zinc-900'}`}
                  >
                    <div className={`p-3 rounded-2xl relative ${activePage === item.id ? 'bg-velatra-accent/20' : 'bg-zinc-50'}`}>
                      <item.icon size={20} strokeWidth={activePage === item.id ? 2.5 : 2} />
                      {item.requiredPlan && !hasRequiredPlan(item.requiredPlan) && user.role !== 'superadmin' && (
                        <div className="absolute -top-1 -right-1 bg-velatra-bgCard rounded-full p-0.5 border border-zinc-200">
                          <LockIcon size={10} className="text-zinc-500" />
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-center">{item.label}</span>
                  </button>
                ))}
                
                <button 
                  onClick={() => {
                    setShowTimer(!showTimer);
                    setShowMobileMenu(false);
                  }}
                  className={`flex flex-col items-center gap-2 transition-all duration-300 ${showTimer ? 'text-velatra-accent' : 'text-zinc-500 hover:text-zinc-900'}`}
                >
                  <div className={`p-3 rounded-2xl ${showTimer ? 'bg-velatra-accent/20' : 'bg-zinc-50'}`}>
                    <TimerIcon size={20} />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-center">Timer</span>
                </button>

                <button 
                  onClick={() => {
                    onLogout();
                    setShowMobileMenu(false);
                  }}
                  className="flex flex-col items-center gap-2 transition-all duration-300 text-zinc-500 hover:text-red-400"
                >
                  <div className="p-3 rounded-2xl bg-zinc-50 hover:bg-red-500/20">
                    <LogOutIcon size={20} />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-center">Quitter</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
