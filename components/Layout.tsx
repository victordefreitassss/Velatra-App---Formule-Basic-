
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Page, Club } from '../types';
import { 
  HomeIcon, UsersIcon, LayersIcon, BarChartIcon, 
  DumbbellIcon, InfoIcon, LogOutIcon, GiftIcon, TargetIcon, CalendarIcon, HistoryIcon, DatabaseIcon, ShoppingCartIcon, TimerIcon, XIcon, MegaphoneIcon, BotIcon, DollarSignIcon, ClipboardIcon, AppleIcon, LockIcon, SettingsIcon, MenuIcon, ShieldIcon, MessageCircleIcon, FolderIcon, PlayCircleIcon, UserIcon, ActivityIcon, BellIcon, ImageIcon
} from './Icons';
import { Timer } from './Timer';
import { db, auth } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Megaphone, AlertTriangle, X } from 'lucide-react';

interface LayoutProps {
  user: User;
  club: Club | null;
  activePage: Page;
  onPageChange: (p: Page) => void;
  onLogout: () => void;
  children: React.ReactNode;
  unreadMessagesCount?: number;
  unreadNotificationsCount?: number;
  logs?: any[];
  payments?: any[];
  users?: any[];
  adminPerspective?: 'superadmin' | 'coach' | 'member';
  onChangePerspective?: (p: 'superadmin' | 'coach' | 'member') => void;
}

const AppLogo: React.FC<{ club: Club | null, user: User, effectiveRole: string }> = ({ club, user, effectiveRole }) => (
  <div className="flex flex-col">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.1)] overflow-hidden flex items-center justify-center shrink-0 bg-white">
        <img src="https://i.postimg.cc/VLMLPbh9/Design-sans-titre.png" alt="Velatra Logo" className="w-full h-full object-contain scale-[1.4]" />
      </div>
      <div className="font-display font-bold text-2xl tracking-tight leading-none text-zinc-900 truncate max-w-[180px]">
        VELA<span className="text-emerald-500">TRA</span>
      </div>
    </div>
    <div className="text-[10px] tracking-[1.2px] text-zinc-500 font-semibold uppercase mt-1 pl-12">
      SPORT · NUTRITION · SUIVI
    </div>
    {club && (effectiveRole === 'coach' || effectiveRole === 'owner') && (
      <div className="mt-4 p-3 bg-white border border-zinc-200 rounded-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">Code d'accès Club</div>
          <div className="relative group flex items-center">
            <div className="w-3.5 h-3.5 rounded-full bg-zinc-200 text-zinc-500 flex items-center justify-center text-[10px] font-black cursor-help hover:bg-emerald-500 hover:text-white transition-colors">i</div>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-zinc-900 text-white text-[10px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-center shadow-xl pointer-events-none">
              Partagez ce code avec vos membres pour qu'ils puissent rejoindre votre club lors de leur inscription.
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900"></div>
            </div>
          </div>
        </div>
        <div className="text-xs font-mono font-bold text-emerald-500 select-all">{club.id}</div>
      </div>
    )}
  </div>
);

export const Layout: React.FC<LayoutProps> = ({ 
  user, club, activePage, onPageChange, onLogout, children, 
  unreadMessagesCount = 0, unreadNotificationsCount = 0, 
  logs = [], payments = [], users = [],
  adminPerspective = 'superadmin', onChangePerspective
}) => {
  const planningEnabled = club?.settings?.booking?.enabled ?? true;

  const isReallySuperAdmin = user.role === 'superadmin' && user.email === 'victor.defreitas.pro@gmail.com';
  const effectiveRole = isReallySuperAdmin ? adminPerspective : (user.role === 'superadmin' ? 'member' : user.role);

  const coachItems = React.useMemo(() => {
    return [
      { id: 'home', icon: HomeIcon, label: 'Accueil' },
      { id: 'users', icon: UsersIcon, label: 'Membres', category: 'Suivi des adhérents' },
      { id: 'coaching', icon: ActivityIcon, label: 'Coaching', category: 'Programmes & ressources' },
      { id: 'chat', icon: MessageCircleIcon, label: 'Messages', category: 'Suivi des adhérents' },
      ...(planningEnabled ? [{ id: 'calendar', icon: CalendarIcon, label: 'Planning des cours', category: 'Suivi des adhérents' }] : []),
      { id: 'presets', icon: LayersIcon, label: 'Programmes', category: 'Programmes & ressources' },
      { id: 'nutrition', icon: AppleIcon, label: 'Nutrition', category: 'Programmes & ressources' },
      { id: 'drive', icon: FolderIcon, label: 'Documents', category: 'Programmes & ressources' },
      { id: 'crm_finances', icon: DollarSignIcon, label: 'Finances', category: 'Gestion du club' },
      { id: 'crm_pipeline', icon: TargetIcon, label: 'Prospects', category: 'Gestion du club' },
      { id: 'marketing', icon: MegaphoneIcon, label: 'Marketing', category: 'Gestion du club' },
      { id: 'guide', icon: InfoIcon, label: 'Guides vidéo', category: 'Réglages & aide' },
      { id: 'about', icon: InfoIcon, label: 'Fiche du club', category: 'Réglages & aide' },
      { id: 'settings', icon: SettingsIcon, label: 'Paramètres', category: 'Réglages & aide' },
    ];
  }, [planningEnabled]);

  const memberItems = React.useMemo(() => {
    return [
      { id: 'home', icon: HomeIcon, label: 'Mon Espace' },
      { id: 'ai_coach', icon: MessageCircleIcon, label: 'Coach IA', category: 'Mon espace' },
      { id: 'calendar', icon: DumbbellIcon, label: 'Mes séances', category: 'Entraînement' },
      ...(planningEnabled ? [{ id: 'planning', icon: CalendarIcon, label: 'Réserver un cours', category: 'Entraînement' }] : []),
      { id: 'performances', icon: BarChartIcon, label: 'Mes performances', category: 'Entraînement' },
      { id: 'nutrition', icon: AppleIcon, label: 'Nutrition', category: 'Nutrition' },
      { id: 'drive', icon: FolderIcon, label: 'Documents', category: 'Mon espace' },
      { id: 'supplements', icon: ShoppingCartIcon, label: 'Boutique', category: 'Nutrition' },
      { id: 'evolution', icon: ImageIcon, label: 'Mon évolution', category: 'Entraînement' },
      { id: 'profile', icon: UserIcon, label: 'Mes objectifs', category: 'Mon espace' },
      { id: 'about', icon: InfoIcon, label: 'Infos du club', category: 'Mon espace' },
    ];
  }, [planningEnabled]);

  const hasRequiredPlan = (requiredPlan?: 'basic' | 'classic' | 'premium') => {
    if (!requiredPlan || requiredPlan === 'basic') return true;
    const currentPlan = club?.plan || 'basic';
    if (currentPlan === 'premium') return true;
    if (currentPlan === 'classic' && requiredPlan === 'classic') return true;
    return false;
  };

  const menuItems: { id: string, icon: React.FC<any>, label: string, requiredPlan?: 'basic' | 'classic' | 'premium', category?: string }[] = React.useMemo(() => {
    return effectiveRole === 'superadmin' 
      ? [{ id: 'admin', icon: ShieldIcon, label: 'Tableau de Bord' }]
      : (effectiveRole === 'coach' || effectiveRole === 'owner') 
        ? coachItems 
        : memberItems;
  }, [effectiveRole, coachItems, memberItems]);

  const [showTimer, setShowTimer] = React.useState(false);
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);
  const [showCommandPalette, setShowCommandPalette] = React.useState(false);
  const [commandSearch, setCommandSearch] = React.useState("");
  const [mobileSearch, setMobileSearch] = React.useState("");

  // Real-time Platform Alerts Live Sync
  const [activeAnnouncements, setActiveAnnouncements] = React.useState<any[]>([]);
  const [closedAnnouncements, setClosedAnnouncements] = React.useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('closed_announcements');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    if (!user || !auth.currentUser || auth.currentUser.uid !== String(user.id)) return;
    
    // Listen to most recent announcement flashes live
    const q = query(
      collection(db, 'system_announcements'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActiveAnnouncements(items);
    }, (err) => {
      console.error("Error reading live system announcements:", err);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDismissAnnouncement = (id: string) => {
    const nextClosed = [...closedAnnouncements, id];
    setClosedAnnouncements(nextClosed);
    localStorage.setItem('closed_announcements', JSON.stringify(nextClosed));
  };

  const visibleAnnouncements = React.useMemo(() => {
    return activeAnnouncements.filter(ann => {
      if (closedAnnouncements.includes(ann.id)) return false;
      if (ann.target === 'all') return true;
      if (ann.target === 'coaches' && (effectiveRole === 'coach' || effectiveRole === 'owner')) return true;
      if (ann.target === 'members' && effectiveRole === 'member') return true;
      return false;
    });
  }, [activeAnnouncements, closedAnnouncements, effectiveRole]);

  const isCoach = effectiveRole === 'coach' || effectiveRole === 'owner' || effectiveRole === 'superadmin';


  const coachPoles = React.useMemo(() => [
    { id: 'coaching', label: 'Coaching', icon: DumbbellIcon, items: ['coaching', 'presets', 'exercises', 'nutrition', 'drive'] },
    { id: 'members', label: 'Membres', icon: UsersIcon, items: ['users', 'chat', 'calendar'] },
    { id: 'gestion', label: 'Gestion', icon: DollarSignIcon, items: ['home', 'crm_finances', 'crm_pipeline', 'marketing', 'settings', 'guide', 'about', 'admin'] }
  ], []);

  const memberPoles = React.useMemo(() => [
    { id: 'sport', label: 'Sport', icon: DumbbellIcon, items: ['calendar', 'planning', 'performances', 'evolution'] },
    { id: 'nutrition', label: 'Nutrition', icon: AppleIcon, items: ['nutrition', 'supplements'] },
    { id: 'account', label: 'Compte', icon: UserIcon, items: ['home', 'ai_coach', 'drive', 'profile', 'about'] }
  ], []);

  const activePoles = isCoach ? coachPoles : memberPoles;

  const [selectedMobilePole, setSelectedMobilePole] = React.useState<string>("");

  React.useEffect(() => {
    if (showMobileMenu) {
      const parentPole = activePoles.find(pole => pole.items.includes(activePage));
      if (parentPole) {
        setSelectedMobilePole(parentPole.id);
      } else {
        setSelectedMobilePole(activePoles[0].id);
      }
    }
  }, [showMobileMenu, activePage, activePoles]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      } else if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activePage]);

  const filteredCommandItems = React.useMemo(() => {
    if (!commandSearch) return menuItems;
    const query = commandSearch.toLowerCase().trim();
    return menuItems.filter(item => 
      item.label.toLowerCase().includes(query) || 
      (item.category && item.category.toLowerCase().includes(query))
    );
  }, [commandSearch, menuItems]);

  const handleCommandSelect = (itemId: string) => {
    onPageChange(itemId as Page);
    setShowCommandPalette(false);
    setCommandSearch("");
  };

  const filteredMobileMenuItems = React.useMemo(() => {
    if (mobileSearch) {
      const query = mobileSearch.toLowerCase().trim();
      return menuItems.filter(item => 
        item.label.toLowerCase().includes(query)
      );
    }
    const currentPole = activePoles.find(p => p.id === selectedMobilePole);
    if (!currentPole) return [];
    return menuItems.filter(item => currentPole.items.includes(item.id));
  }, [mobileSearch, selectedMobilePole, menuItems, activePoles]);

  // Group items by category (excluding empty ones)
  const topLevelItems = React.useMemo(() => {
    return menuItems.filter(item => !item.category);
  }, [menuItems]);

  const groupedItems = React.useMemo(() => {
    return menuItems.reduce((acc, item) => {
      if (!item.category) return acc;
      const cat = item.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, typeof menuItems>);
  }, [menuItems]);

  const [expandedCategories, setExpandedCategories] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setExpandedCategories(Object.fromEntries(Object.keys(groupedItems).map(category => [category, true])));
  }, [groupedItems]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  React.useEffect(() => {
    const currentItem = menuItems.find(it => it.id === activePage);
    if (currentItem && currentItem.category) {
      const cat = currentItem.category;
      setExpandedCategories(prev => {
        if (prev[cat]) return prev;
        return {
          ...prev,
          [cat]: true
        };
      });
    }
  }, [activePage, menuItems]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-transparent">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-zinc-200 h-screen fixed left-0 top-0 py-7 px-4 z-40 shadow-sm">
        <div className="mb-6 px-4">
           <AppLogo club={club} user={user} effectiveRole={effectiveRole} />
        </div>

        {/* Super Admin Perspective switcher */}
        {isReallySuperAdmin && onChangePerspective && (
          <div className="px-4 mb-6">
            <div className="p-3 bg-zinc-950 text-white rounded-2xl border border-zinc-800 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-2xl"></div>
              
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 mb-2.5 flex items-center gap-1.5 z-10 relative">
                <ShieldIcon size={12} className="text-emerald-400" />
                <span>Console de Pilotage</span>
              </div>
              
              <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-xl border border-white/5 relative z-10">
                <button
                  type="button"
                  onClick={() => onChangePerspective('superadmin')}
                  className={`py-1.5 px-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                    adminPerspective === 'superadmin'
                      ? 'bg-emerald-500 text-zinc-950 shadow-md font-black'
                      : 'text-zinc-400 hover:text-white bg-transparent'
                  }`}
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => onChangePerspective('coach')}
                  className={`py-1.5 px-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                    adminPerspective === 'coach'
                      ? 'bg-emerald-500 text-zinc-950 shadow-md font-black'
                      : 'text-zinc-400 hover:text-white bg-transparent'
                  }`}
                >
                  Coach
                </button>
                <button
                  type="button"
                  onClick={() => onChangePerspective('member')}
                  className={`py-1.5 px-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                    adminPerspective === 'member'
                      ? 'bg-emerald-500 text-zinc-950 shadow-md font-black'
                      : 'text-zinc-400 hover:text-white bg-transparent'
                  }`}
                >
                  Membre
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Search trigger button */}
        <div className="px-4 mb-6">
          <button 
            type="button"
            onClick={() => setShowCommandPalette(true)}
            className="flex items-center justify-between w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-xl text-left text-zinc-500 hover:text-zinc-800 transition-all text-sm font-medium"
          >
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-zinc-400 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              Rechercher...
            </span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 bg-white border border-zinc-200 rounded-md">⌘K</kbd>
          </button>
        </div>

        
        <nav className="flex-1 space-y-3 overflow-y-auto no-scrollbar px-1 pb-6">
          {/* Top Level Items */}
          {topLevelItems.length > 0 && (
            <div className="space-y-1">
              {topLevelItems.map(item => {
                const isActive = activePage === item.id;
                return (
                  <button 
                    key={item.id}
                    onClick={() => onPageChange(item.id as Page)}
                    className={`
                      relative flex items-center justify-between px-4 py-3 rounded-xl w-full transition-all duration-300 group
                      ${isActive ? 'text-emerald-950 font-black' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}
                    `}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeMenuIndicator"
                        className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-l-4 border-emerald-500 rounded-xl"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <div className="flex items-center gap-3 relative z-10">
                      <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-emerald-600' : 'group-hover:scale-110 transition-transform duration-300'} />
                      <span className="text-sm font-semibold">{item.label}</span>
                      {item.id === 'chat' && unreadMessagesCount > 0 && (
                        <span className="absolute -top-1 -right-3 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border border-white"></span>
                      )}
                      {item.id === 'notifications' && unreadNotificationsCount > 0 && (
                        <span className="absolute -top-1 -right-3 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border border-white"></span>
                      )}
                    </div>
                    {item.requiredPlan && !hasRequiredPlan(item.requiredPlan) && !isReallySuperAdmin && (
                      <LockIcon size={12} className="opacity-50 group-hover:opacity-100 transition-opacity relative z-10" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Collapsible Categories */}
          {Object.entries(groupedItems).map(([category, items]) => {
            const isExpanded = !!expandedCategories[category];
            const hasActiveItem = items.some(item => item.id === activePage);
            return (
              <div key={category} className="space-y-1">
                {/* Accordion Trigger Header */}
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={`flex items-center justify-between w-full px-4 py-2.5 rounded-xl transition-all outline-none select-none ${
                    hasActiveItem
                      ? 'text-emerald-700 font-semibold'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    {category}
                  </span>
                  <svg 
                    width="12" 
                    height="12" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="3.5" 
                    className={`transition-transform duration-200 shrink-0 opacity-70 ${isExpanded ? 'rotate-180 text-emerald-500' : 'rotate-0 text-zinc-400'}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>

                {/* Collapsible Content */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden pl-1 pr-1 py-0.5 space-y-0.5"
                    >
                      {items.map(item => {
                        const isActive = activePage === item.id;
                        return (
                          <button 
                            key={item.id}
                            onClick={() => onPageChange(item.id as Page)}
                            className={`
                              relative flex items-center justify-between px-3.5 py-2.5 rounded-xl w-full transition-all duration-300 group
                              ${isActive ? 'text-emerald-950 font-black' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50/70'}
                            `}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="activeMenuIndicator"
                                className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-l-4 border-emerald-500 rounded-xl"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                              />
                            )}
                            <div className="flex items-center gap-3 relative z-10 pl-2">
                              <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-emerald-600' : 'group-hover:scale-110 transition-transform duration-300 text-zinc-400 group-hover:text-zinc-600'} />
                              <span className="text-[13px] font-medium truncate max-w-[170px]">{item.label}</span>
                              {item.id === 'chat' && unreadMessagesCount > 0 && (
                                <span className="absolute -top-1 -right-3 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border border-white"></span>
                              )}
                              {item.id === 'notifications' && unreadNotificationsCount > 0 && (
                                <span className="absolute -top-1 -right-3 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border border-white"></span>
                              )}
                            </div>
                            {item.requiredPlan && !hasRequiredPlan(item.requiredPlan) && !isReallySuperAdmin && (
                              <LockIcon size={12} className="opacity-50 group-hover:opacity-100 transition-opacity relative z-10" />
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          
          <div className="pt-4 mt-4 border-t border-zinc-200">
            <button 
              onClick={() => setShowTimer(!showTimer)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all duration-300 group
                ${showTimer ? 'bg-emerald-50 text-emerald-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}
              `}
            >
              <TimerIcon size={18} className="group-hover:rotate-12 transition-transform duration-300" />
              <span className="text-sm font-medium">Chronomètre</span>
            </button>
          </div>
        </nav>

        <div className="px-2">
          <button onClick={onLogout} className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl w-full text-zinc-500 hover:text-red-500 transition-all hover:bg-red-50 group">
            <LogOutIcon size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
            <span className="text-sm font-medium">Se déconnecter</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 min-h-screen relative overflow-hidden">
        
        {/* Dynamic Platform Banners */}
        {visibleAnnouncements.length > 0 && (
          <div className="px-3 md:px-12 pt-6 pb-2 space-y-3 z-50 relative">
            <AnimatePresence>
              {visibleAnnouncements.map((ann) => {
                let textCol = 'text-teal-950';
                let bgCol = 'bg-teal-50/90 border-teal-200 backdrop-blur';
                let iconCol = 'text-teal-600';
                let accentCol = 'border-teal-200';
                
                if (ann.category === 'critical') {
                  textCol = 'text-red-950';
                  bgCol = 'bg-red-50/90 border-red-200 backdrop-blur';
                  iconCol = 'text-red-500';
                  accentCol = 'border-red-300 animate-pulse';
                } else if (ann.category === 'warning') {
                  textCol = 'text-amber-950';
                  bgCol = 'bg-amber-50/90 border-amber-200 backdrop-blur';
                  iconCol = 'text-amber-600';
                  accentCol = 'border-amber-300';
                }

                return (
                  <motion.div
                    key={ann.id}
                    initial={{ opacity: 0, height: 0, y: -20 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -20 }}
                    className={`rounded-2xl border p-4 shadow-sm flex items-start gap-3.5 relative overflow-hidden ${bgCol} ${accentCol}`}
                  >
                    {ann.category === 'critical' && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500"></div>
                    )}

                    <div className="pt-0.5 shrink-0">
                      {ann.category === 'critical' ? (
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                          <AlertTriangle size={16} className={`${iconCol} animate-bounce`} />
                        </div>
                      ) : ann.category === 'warning' ? (
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                          <AlertTriangle size={16} className={iconCol} />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                          <Megaphone size={16} className={iconCol} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-black uppercase tracking-wider ${textCol}`}>
                          {ann.title}
                        </span>
                        <span className="text-[9px] bg-black/5 rounded-md px-1.5 py-0.5 font-bold uppercase tracking-wider text-zinc-500 border border-black/5 leading-none">
                          FLASH INFO
                        </span>
                      </div>
                      <p className="text-xs text-zinc-700 font-medium leading-relaxed mt-1.5 pr-2 whitespace-pre-wrap">
                        {ann.body}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDismissAnnouncement(ann.id)}
                      className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-800 hover:bg-black/5 p-1 rounded-xl transition-all"
                      title="Masquer l'annonce"
                    >
                      <X size={15} />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div 
            key={activePage}
            initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="px-4 py-5 md:px-9 md:py-8 max-w-none pb-32 md:pb-10 w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>

        {showTimer && (
          <div className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[100] animate-in slide-in-from-bottom-10 duration-500">
            <div className="relative">
              <button 
                onClick={() => setShowTimer(false)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-zinc-900 rounded-full flex items-center justify-center z-10 shadow-lg hover:scale-110 transition-transform"
              >
                <XIcon size={12} />
              </button>
              <Timer />
            </div>
          </div>
        )}

        {/* Mobile Navigation Tab Bar */}
        <nav aria-label="Navigation principale" className="md:hidden fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-md h-16 bg-white/95 backdrop-blur-xl border border-zinc-200 rounded-2xl flex items-center justify-around z-50 px-3 shadow-lg shadow-zinc-900/10">
          {menuItems.slice(0, 4).map(item => {
            const isActive = activePage === item.id;
            return (
              <button 
                key={item.id}
                type="button"
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                title={item.label}
                onClick={() => {
                  onPageChange(item.id as Page);
                  setShowMobileMenu(false);
                }}
                className={`relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveIndicator"
                    className="absolute inset-0 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  />
                )}
                <div className={`relative z-10 transition-transform ${isActive ? 'text-white scale-110' : 'text-zinc-500 hover:text-zinc-900'}`}>
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  {item.id === 'chat' && unreadMessagesCount > 0 && (
                    <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border ${isActive ? 'border-emerald-500' : 'border-white'}`}></span>
                  )}
                  {item.id === 'notifications' && unreadNotificationsCount > 0 && (
                    <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border ${isActive ? 'border-emerald-500' : 'border-white'}`}></span>
                  )}
                </div>
              </button>
            );
          })}
          
          <button 
            type="button"
            aria-label={showMobileMenu ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={showMobileMenu}
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className={`relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300 ${showMobileMenu ? 'text-emerald-950 scale-110' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            {showMobileMenu && (
              <motion.div
                layoutId="mobileActiveIndicator"
                className="absolute inset-0 bg-zinc-100 rounded-full border border-zinc-200"
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
              />
            )}
            <div className="relative z-10">
              <MenuIcon size={20} />
            </div>
          </button>
        </nav>

        {/* Mobile Menu Drawer containing interactive live filter search */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-zinc-950/40 backdrop-blur-sm z-40"
              onClick={() => setShowMobileMenu(false)}
            >
              <motion.div 
                initial={{ opacity: 0, y: 80, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 80, scale: 0.98 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="absolute bottom-24 left-4 right-4 bg-zinc-50 border border-zinc-200 rounded-[2rem] p-5 shadow-2xl max-h-[78vh] overflow-y-auto no-scrollbar space-y-6"
                onClick={e => e.stopPropagation()}
              >
                {/* 1. Header Profil Utilisateur */}
                <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 text-white rounded-3xl p-5 relative overflow-hidden shadow-lg border border-zinc-850">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-lg text-emerald-400 overflow-hidden shrink-0 shadow-lg">
                      {user.avatar?.startsWith('http') ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        user.avatar || user.name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
                        {isReallySuperAdmin 
                          ? `👑 Super Admin (${effectiveRole === 'superadmin' ? 'Plateforme' : effectiveRole === 'coach' ? 'Simu Coach' : 'Simu Athlète'})` 
                          : user.role === 'coach' || user.role === 'owner' 
                            ? "⚡ Coach Principal" 
                            : "🎯 Athlète Élite"}
                      </div>
                      <div className="text-sm font-extrabold text-white truncate leading-tight mt-0.5">
                        {user.name}
                      </div>
                      <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mt-1 flex items-center gap-1.5">
                        <span>Niveau {Math.floor((user.xp || 0) / 1000) + 1}</span>
                        {user.streak && user.streak > 0 ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
                            <span className="text-orange-400 font-extrabold flex items-center gap-0.5">🔥 {user.streak} J</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Admin Perspective Switcher */}
                {isReallySuperAdmin && onChangePerspective && (
                  <div className="bg-zinc-950 border border-zinc-850 text-white rounded-3xl p-4 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl"></div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 mb-2.5 flex items-center gap-1.5 relative z-10">
                      <ShieldIcon size={12} className="text-emerald-400" />
                      <span>Console de Pilotage</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-xl border border-white/5 relative z-10">
                      <button
                        type="button"
                        onClick={() => {
                          onChangePerspective('superadmin');
                          setShowMobileMenu(false);
                        }}
                        className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                          adminPerspective === 'superadmin'
                            ? 'bg-emerald-500 text-zinc-950 shadow-md font-black'
                            : 'text-zinc-400 hover:text-white bg-transparent'
                        }`}
                      >
                        Admin
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onChangePerspective('coach');
                          setShowMobileMenu(false);
                        }}
                        className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                          adminPerspective === 'coach'
                            ? 'bg-emerald-500 text-zinc-950 shadow-md font-black'
                            : 'text-zinc-400 hover:text-white bg-transparent'
                        }`}
                      >
                        Coach
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onChangePerspective('member');
                          setShowMobileMenu(false);
                        }}
                        className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                          adminPerspective === 'member'
                            ? 'bg-emerald-500 text-zinc-950 shadow-md font-black'
                            : 'text-zinc-400 hover:text-white bg-transparent'
                        }`}
                      >
                        Membre
                      </button>
                    </div>
                  </div>
                )}


                {/* 2. Filtre par Pôles Logiques */}
                {!mobileSearch && (
                  <div className="bg-zinc-200/50 p-1.5 rounded-2xl flex items-center justify-between gap-1 border border-zinc-200/60 shadow-inner">
                    {activePoles.map(pole => {
                      const isSelected = selectedMobilePole === pole.id;
                      const PoleIcon = pole.icon;
                      return (
                        <button
                          key={pole.id}
                          type="button"
                          onClick={() => setSelectedMobilePole(pole.id)}
                          className="flex-1 relative flex flex-col items-center justify-center py-2.5 rounded-xl transition-all outline-none"
                        >
                          {isSelected && (
                            <motion.div
                              layoutId="mobileActivePoleIndicator"
                              className="absolute inset-x-0 inset-y-0 bg-white rounded-lg border border-zinc-250 shadow-sm"
                              transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            />
                          )}
                          <div className="relative z-10 flex flex-col items-center justify-center">
                            <PoleIcon size={15} strokeWidth={isSelected ? 2.5 : 2} className={isSelected ? 'text-emerald-500 animate-pulse' : 'text-zinc-500'} />
                            <span className={`text-[9px] font-black uppercase tracking-wider mt-1 ${isSelected ? 'text-zinc-950' : 'text-zinc-500'}`}>{pole.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 3. Recherche rapide */}
                <div className="relative w-full">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  </span>
                  <input 
                    type="text" 
                    placeholder="Filtrer ou rechercher une section..." 
                    value={mobileSearch}
                    onChange={e => setMobileSearch(e.target.value)}
                    className="w-full text-xs font-bold bg-white border border-zinc-200 focus:border-emerald-500 rounded-2xl pl-10 pr-10 py-3 outline-none text-zinc-800 placeholder-zinc-400 shadow-sm transition-all"
                  />
                  {mobileSearch && (
                    <button 
                      onClick={() => setMobileSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-xs font-black text-zinc-400 hover:text-zinc-650 bg-zinc-100 hover:bg-zinc-200 rounded-full"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* 4. Rubriques du pôle actif ou résultats de la recherche */}
                <div className="space-y-3">
                  <div className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-2 px-1 flex items-center justify-between">
                    <span>{mobileSearch ? `Résultats de recherche (${filteredMobileMenuItems.length})` : activePoles.find(p => p.id === selectedMobilePole)?.label}</span>
                    {!mobileSearch && (
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-700 px-2.5 py-0.5 rounded-full font-extrabold uppercase">Pôle actif</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {filteredMobileMenuItems.map(item => {
                      const isSelected = activePage === item.id;
                      const itemDesc: Record<string, string> = {
                        home: isCoach ? "Tableau de bord principal" : "Mon espace d'accueil principal",
                        users: "Consulter & éditer mes athlètes",
                        coaching: "Lancer ou guider un entraînement",
                        chat: isCoach ? "Discussion & feedbacks directs" : "Messages avec mon coach",
                        calendar: isCoach ? "Planning des séances & réservations" : "Planifier ma séance active",
                        presets: "Créer des modèles d'entraînements",
                        exercises: "Base d'exercices vidéos illustrés",
                        nutrition: isCoach ? "Créer des structures de menus" : "Plan de repas personnalisé & recettes",
                        drive: "Documents PDF, images & fiches club",
                        crm_finances: "Comptabilité & abonnements membres",
                        crm_pipeline: "Suivi acquisition & prospects",
                        marketing: "Relances & campagnes SMS automatisées",
                        settings: "Réglages complets & préférences",
                        guide: "Vidéos de démonstration & tutoriels",
                        about: "Informations générales & contact du club",
                        admin: "Console superadmin d'administration",
                        ai_coach: "Discuter avec l'IA de conseil sportif",
                        planning: "Réserver mon cours collectif club",
                        performances: "Mes charges max & records historiques",
                        supplements: "Boutique de suppléments recommandés",
                        evolution: "Suivi morphologique & photos",
                        profile: "Mes objectifs & informations de compte"
                      };

                      return (
                        <button 
                          key={item.id}
                          onClick={() => {
                            onPageChange(item.id as Page);
                            setShowMobileMenu(false);
                          }}
                          className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all border ${
                            isSelected 
                              ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/40 border-emerald-500/30 text-emerald-950 font-black shadow-sm' 
                              : 'bg-white hover:bg-zinc-100 border-zinc-200/80 text-zinc-800 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl shrink-0 ${
                              isSelected ? 'bg-emerald-500 text-white shadow-md' : 'bg-zinc-100/70 border border-zinc-200 text-zinc-500'
                            }`}>
                              <item.icon size={16} strokeWidth={isSelected ? 2.5 : 2} />
                            </div>
                            <div className="text-left">
                              <span className="text-xs font-black uppercase tracking-wider block leading-tight">{item.label}</span>
                              <span className="text-[10px] text-zinc-400 font-bold block leading-tight mt-1 max-w-[210px] truncate">{itemDesc[item.id] || "Accéder à cette section"}</span>
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-2 pl-2">
                            {item.id === 'chat' && unreadMessagesCount > 0 && (
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border border-white"></span>
                            )}
                            {item.id === 'notifications' && unreadNotificationsCount > 0 && (
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border border-white"></span>
                            )}
                            {item.requiredPlan && !hasRequiredPlan(item.requiredPlan) && !isReallySuperAdmin ? (
                              <LockIcon size={12} className="text-zinc-400" />
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-zinc-400"><path d="M9 5l7 7-7 7"/></svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                    {filteredMobileMenuItems.length === 0 && (
                      <div className="text-xs text-zinc-400 font-bold uppercase tracking-widest text-center py-8 bg-white border border-zinc-200/60 rounded-2xl">
                        Aucune rubrique ne correspond à votre recherche
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Actions Générales de bas de tiroir */}
                <div className="pt-4 border-t border-zinc-200 grid grid-cols-2 gap-3 pb-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowTimer(!showTimer);
                      setShowMobileMenu(false);
                    }}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black uppercase tracking-wider text-[10px] border transition-all ${
                      showTimer 
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' 
                        : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200'
                    }`}
                  >
                    <TimerIcon size={14} className="shrink-0" />
                    Chronomètre
                  </button>

                  <button 
                    type="button"
                    onClick={() => {
                      onLogout();
                      setShowMobileMenu(false);
                    }}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black uppercase tracking-wider text-[10px] bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/60 transition-all cursor-pointer"
                  >
                    <LogOutIcon size={14} className="shrink-0" />
                    Se déconnecter
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Command Palette Modal overlay */}
      <AnimatePresence>
        {showCommandPalette && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950/60 backdrop-blur-md z-[9999] flex items-start justify-center pt-[15vh] px-4"
            onClick={() => {
              setShowCommandPalette(false);
              setCommandSearch("");
            }}
          >
            <motion.div 
              initial={{ opacity: 0, y: -24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -24, scale: 0.96 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-white border border-zinc-200 w-full max-w-3xl rounded-3xl overflow-hidden shadow-[0_30px_60px_rgba(24,24,27,0.25)]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 bg-zinc-50/50">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-zinc-400 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Rechercher une page ou section... (ex: Modèles, Nutrition, Drive)" 
                  value={commandSearch}
                  onChange={e => setCommandSearch(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-sm font-bold text-zinc-800 placeholder-zinc-400"
                />
                <button 
                  type="button"
                  onClick={() => {
                    setShowCommandPalette(false);
                    setCommandSearch("");
                  }}
                  className="px-2.5 py-1.5 rounded-xl hover:bg-zinc-100 text-[10px] font-black uppercase text-zinc-400 tracking-wider transition-colors border border-zinc-200"
                >
                  ESC
                </button>
              </div>

              <div className="max-h-[350px] overflow-y-auto p-3 space-y-1 no-scrollbar">
                {filteredCommandItems.length > 0 ? (
                  filteredCommandItems.map(item => {
                    const isSelected = activePage === item.id;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => handleCommandSelect(item.id)}
                        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-left transition-all ${
                          isSelected 
                            ? 'bg-emerald-500 text-white font-black shadow-lg shadow-emerald-500/20' 
                            : 'hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 font-bold'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon size={16} strokeWidth={2.5} className={isSelected ? 'text-white' : 'text-zinc-400'} />
                          <span className="text-[11px] uppercase tracking-wider">{item.label}</span>
                        </div>
                        {item.category && (
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-500'
                          }`}>
                            {item.category}
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="text-xs text-zinc-400 font-bold uppercase tracking-widest text-center py-8">
                    Aucun résultat trouvé pour "{commandSearch}"
                  </div>
                )}
              </div>
              <div className="px-5 py-3.5 bg-zinc-50 border-t border-zinc-100 flex justify-between items-center text-[9px] font-black text-zinc-400 uppercase tracking-wider">
                <span>Naviguer avec la souris ou tapez</span>
                <span className="flex items-center gap-1">
                  <span>Valider</span> <kbd className="px-1.5 py-0.5 bg-zinc-200 border border-zinc-350 rounded">↵</kbd>
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
