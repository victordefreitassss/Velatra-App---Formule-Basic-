import React, { useState } from 'react';
import { 
  LayoutDashboard, Users, Calendar, Dumbbell, Copy, BookOpen, 
  MessageSquare, Target, DollarSign, CheckSquare, HardDrive, 
  Settings, Sparkles, User as UserIcon, ShoppingBag, Eye, 
  LogOut, Menu, X, Bell, Shield, ArrowRightLeft, Cpu
} from 'lucide-react';
import { User, Club } from '../types';

interface LayoutProps {
  user: User | null;
  club: Club | null;
  activePage: string;
  onPageChange: (page: any) => void;
  onLogout: () => void;
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  logs: any[];
  payments: any[];
  users: User[];
  adminPerspective: 'coach' | 'owner' | 'member' | 'superadmin' | string;
  onChangePerspective: (perspective: string) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  user,
  club,
  activePage,
  onPageChange,
  onLogout,
  unreadMessagesCount,
  unreadNotificationsCount,
  logs,
  payments,
  users,
  adminPerspective,
  onChangePerspective,
  children
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine role perspective
  const isStaff = adminPerspective === 'coach' || adminPerspective === 'owner';
  const isSuperadmin = adminPerspective === 'superadmin';
  const isMember = adminPerspective === 'member';

  // Navigation Items according to current perspective
  const getNavItems = () => {
    if (isSuperadmin) {
      return [
        { id: 'admin', label: 'SuperAdmin', icon: Shield },
      ];
    }

    if (isStaff) {
      return [
        { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'users', label: 'Membres', icon: Users },
        { id: 'calendar', label: 'Agenda & Résas', icon: Calendar },
        { id: 'coaching', label: 'Séances & Suivi', icon: Dumbbell },
        { id: 'presets', label: 'Modèles', icon: Copy },
        { id: 'exercises', label: 'Bibliothèque', icon: BookOpen },
        { id: 'chat', label: 'Messagerie', icon: MessageSquare, badge: unreadMessagesCount },
        { id: 'crm_pipeline', label: 'CRM Prospects', icon: Target },
        { id: 'crm_finances', label: 'Finances', icon: DollarSign },
        { id: 'crm_tasks', label: 'Mes Tâches', icon: CheckSquare },
        { id: 'drive', label: 'Drive Fichiers', icon: HardDrive },
        { id: 'settings', label: 'Club Settings', icon: Settings },
      ];
    }

    // Default: isMember
    return [
      { id: 'home', label: 'Tableau de bord', icon: LayoutDashboard },
      { id: 'planning', label: 'Mon Planning', icon: Calendar },
      { id: 'nutrition', label: 'Nutrition', icon: ShoppingBag },
      { id: 'ai_coach', label: 'Coach Virtuel IA', icon: Cpu },
      { id: 'messages', label: 'Mes Messages', icon: MessageSquare, badge: unreadMessagesCount },
      { id: 'supplements', label: 'Compléments', icon: Sparkles },
      { id: 'evolution', label: 'Évolution', icon: Eye },
      { id: 'profile', label: 'Mon Profil', icon: UserIcon },
    ];
  };

  const navItems = getNavItems();

  const handleNavClick = (id: string) => {
    onPageChange(id);
    setMobileMenuOpen(false);
  };

  // List of available perspectives for the user based on their real role
  const getAvailablePerspectives = () => {
    if (!user) return [];
    const pList: { id: string; label: string }[] = [];
    
    if (user.role === 'superadmin') {
      pList.push({ id: 'superadmin', label: 'SuperAdmin' });
    }
    
    if (user.role === 'superadmin' || user.role === 'owner' || user.role === 'coach') {
      pList.push({ id: 'coach', label: 'Espace Coach' });
    }
    
    pList.push({ id: 'member', label: 'Espace Adhérent' });
    return pList;
  };

  const perspectives = getAvailablePerspectives();

  return (
    <div className="min-h-screen bg-[#070709] bg-gradient-to-br from-[#0c0c0f] to-[#040405] text-white flex flex-col md:flex-row antialiased font-sans">
      
      {/* 1. SIDEBAR (Desktop) */}
      <aside className="hidden md:flex flex-col w-72 shrink-0 border-r border-zinc-900 bg-[#09090b]/80 backdrop-blur-md p-6 fixed inset-y-0 left-0 z-40 justify-between">
        <div className="space-y-6">
          {/* Logo / Club */}
          <div className="flex items-center gap-3 border-b border-zinc-900 pb-5">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white flex items-center justify-center border border-zinc-800 shrink-0">
              <img 
                src={club?.logo || "https://i.postimg.cc/VLMLPbh9/Design-sans-titre.png"} 
                alt="Logo" 
                className="w-full h-full object-contain scale-[1.3]" 
              />
            </div>
            <div className="overflow-hidden">
              <h2 className="font-bold text-sm tracking-tight text-white truncate">{club?.name || "VELATRA CLI"}</h2>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest leading-none mt-1">
                {isSuperadmin ? "SUPERADMIN" : isStaff ? "STAFF ACCÈS" : "ATHLÈTE"}
              </p>
            </div>
          </div>

          {/* Perspective Selector (if multiple roles exist) */}
          {perspectives.length > 1 && (
            <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-2 flex flex-col gap-1">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider px-2">PERSPECTIVE</span>
              <div className="flex flex-col gap-1 mt-1">
                {perspectives.map((p) => {
                  const active = adminPerspective === p.id || (p.id === 'coach' && (adminPerspective === 'coach' || adminPerspective === 'owner'));
                  return (
                    <button
                      key={p.id}
                      onClick={() => onChangePerspective(p.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs leading-none transition-all active:scale-98 ${
                        active 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold' 
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                      }`}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nav Items */}
          <nav className="flex flex-col gap-1 scrollbar-thin overflow-y-auto max-h-[50vh]">
            {navItems.map((item) => {
              const active = activePage === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-left text-xs font-semibold tracking-wide transition-all ${
                    active 
                      ? 'bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 text-emerald-400 border border-emerald-500/15 font-bold shadow-inner shadow-emerald-500/5' 
                      : 'text-zinc-450 hover:text-zinc-200 hover:bg-zinc-900/40 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${active ? 'text-emerald-400' : 'text-zinc-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && item.badge > 0 ? (
                    <span className="bg-emerald-500 text-neutral-950 font-bold px-1.5 py-0.5 rounded-full text-[9px]">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info & Logout */}
        <div className="border-t border-zinc-900 pt-5 flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-emerald-400 font-bold border border-zinc-800 text-sm overflow-hidden shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name?.substring(0, 2).toUpperCase() || "VE"
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-zinc-100 truncate">{user?.name || "Profil"}</p>
              <p className="text-[10px] text-zinc-500 truncate leading-none mt-1">{user?.email || ""}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-350 hover:bg-rose-500/5 border border-transparent hover:border-rose-500/10 rounded-xl text-xs font-bold transition-all active:scale-98"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* 2. HEADER & LAYOUT FOR MOBILE */}
      <div className="flex-1 flex flex-col md:pl-72">
        <header className="md:hidden flex items-center justify-between border-b border-zinc-900 bg-[#09090b]/90 backdrop-blur-md px-6 h-16 sticky top-0 z-40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white flex items-center justify-center border border-zinc-800">
              <img 
                src={club?.logo || "https://i.postimg.cc/VLMLPbh9/Design-sans-titre.png"} 
                alt="Logo" 
                className="w-full h-full object-contain scale-[1.3]" 
              />
            </div>
            <span className="font-bold text-sm text-white tracking-tight truncate max-w-[120px]">{club?.name || "VELATRA"}</span>
          </div>

          <div className="flex items-center gap-2">
            {unreadNotificationsCount > 0 && (
              <div className="p-2 bg-zinc-900 hover:bg-zinc-850 rounded-xl text-emerald-400 cursor-pointer relative">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
              </div>
            )}
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-xl border border-zinc-850"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Mobile slide-out overlay drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop overlay */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <div className="relative flex flex-col w-4/5 max-w-xs bg-[#09090b] h-full p-6 border-r border-zinc-900 shadow-2xl justify-between">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                  <span className="text-xs font-bold tracking-widest text-emerald-400">VELATRA APP</span>
                  <button 
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 text-zinc-400 hover:text-white transition-colors bg-zinc-900 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Perspective selector for mobile */}
                {perspectives.length > 1 && (
                  <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-2.5 flex flex-col gap-1.5">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider px-2">PERSPECTIVE</span>
                    <div className="flex flex-col gap-1 mt-1">
                      {perspectives.map((p) => {
                        const active = adminPerspective === p.id || (p.id === 'coach' && (adminPerspective === 'coach' || adminPerspective === 'owner'));
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              onChangePerspective(p.id);
                              setMobileMenuOpen(false);
                            }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                              active 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold' 
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                            }`}
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Mobile Navigation Links */}
                <nav className="flex flex-col gap-1 overflow-y-auto max-h-[55vh]">
                  {navItems.map((item) => {
                    const active = activePage === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl text-left text-xs font-semibold tracking-wide transition-all ${
                          active 
                            ? 'bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 text-emerald-400 border border-emerald-500/15 font-bold shadow-inner' 
                            : 'text-zinc-450 hover:text-zinc-200 hover:bg-zinc-900/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${active ? 'text-emerald-400' : 'text-zinc-500'}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && item.badge > 0 ? (
                          <span className="bg-emerald-500 text-neutral-950 font-bold px-1.5 py-0.5 rounded-full text-[9px]">
                            {item.badge}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Mobile logout footer */}
              <div className="border-t border-zinc-900 pt-5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 text-emerald-400 flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      user?.name?.substring(0, 2).toUpperCase() || "VE"
                    )}
                  </div>
                  <p className="text-xs font-semibold text-zinc-200 truncate">{user?.name || ""}</p>
                </div>
                <button 
                  onClick={onLogout}
                  className="flex items-center justify-center gap-2.5 w-full bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:text-rose-350 rounded-xl py-3 text-xs font-bold transition-all"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Se déconnecter</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. MAIN WORKSPACE / CHILDPAGES */}
        <main className="flex-grow p-4 md:p-8 overflow-y-auto w-full max-w-7xl mx-auto block min-h-calc min-h-[calc(100vh-4rem)] md:min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
};
