
import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { User, Page, Club } from '../types';
import { 
  HomeIcon, UsersIcon, LayersIcon, BarChartIcon, 
  DumbbellIcon, InfoIcon, LogOutIcon, GiftIcon, TargetIcon, CalendarIcon, HistoryIcon, DatabaseIcon, ShoppingCartIcon, TimerIcon, XIcon, MegaphoneIcon, BotIcon, DollarSignIcon, ClipboardIcon, AppleIcon, LockIcon, SettingsIcon, MenuIcon, ShieldIcon, MessageCircleIcon, FolderIcon, PlayCircleIcon, UserIcon, ActivityIcon, BellIcon, ImageIcon
} from './Icons';
import { Timer } from './Timer';
import { db, auth } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Megaphone, AlertTriangle, X } from 'lucide-react';
import './app-shell.css';

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
      <div className="va-brand-mark flex items-center justify-center shrink-0">
        <img className="h-full w-full object-contain" src="/brand/velatra-mark.png" alt="Symbole Velatra" />
      </div>
      <div className="va-brand-name truncate max-w-[180px]">
        VELATRA
      </div>
    </div>
    <div className="va-brand-tagline">
      COACHER · ORGANISER · SUIVRE
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
      { id: 'users', icon: UsersIcon, label: 'Membres', category: 'Clients' },
      { id: 'chat', icon: MessageCircleIcon, label: 'Messages', category: 'Clients' },
      ...(planningEnabled ? [{ id: 'calendar', icon: CalendarIcon, label: 'Planning des cours', category: 'Clients' }] : []),
      { id: 'coaching', icon: ActivityIcon, label: 'Coaching', category: 'Coaching' },
      { id: 'presets', icon: LayersIcon, label: 'Programmes', category: 'Coaching' },
      { id: 'nutrition', icon: AppleIcon, label: 'Nutrition', category: 'Coaching' },
      { id: 'drive', icon: FolderIcon, label: 'Documents', category: 'Coaching' },
      { id: 'crm_pipeline', icon: TargetIcon, label: 'Prospects', category: 'Business' },
      { id: 'crm_finances', icon: DollarSignIcon, label: 'Finances', category: 'Business' },
      { id: 'marketing', icon: MegaphoneIcon, label: 'Campagnes', category: 'Plus' },
      { id: 'guide', icon: InfoIcon, label: 'Guides vidéo', category: 'Plus' },
      { id: 'about', icon: InfoIcon, label: 'Fiche du club', category: 'Plus' },
      { id: 'settings', icon: SettingsIcon, label: 'Paramètres', category: 'Plus' },
    ];
  }, [planningEnabled]);

  const memberItems = React.useMemo(() => {
    return [
      { id: 'home', icon: HomeIcon, label: 'Mon espace' },
      { id: 'calendar', icon: DumbbellIcon, label: 'Mes séances', category: 'Séances & progression' },
      ...(planningEnabled ? [{ id: 'planning', icon: CalendarIcon, label: 'Réserver un cours', category: 'Séances & progression' }] : []),
      { id: 'performances', icon: BarChartIcon, label: 'Mes performances', category: 'Séances & progression' },
      { id: 'evolution', icon: ImageIcon, label: 'Mon évolution', category: 'Séances & progression' },
      { id: 'nutrition', icon: AppleIcon, label: 'Nutrition', category: 'Nutrition' },
      { id: 'supplements', icon: ShoppingCartIcon, label: 'Boutique', category: 'Nutrition' },
      { id: 'ai_coach', icon: BotIcon, label: 'Coach IA', category: 'Plus' },
      { id: 'drive', icon: FolderIcon, label: 'Documents', category: 'Plus' },
      { id: 'profile', icon: UserIcon, label: 'Mes objectifs', category: 'Plus' },
      { id: 'about', icon: InfoIcon, label: 'Infos du club', category: 'Plus' },
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

  const mobileTabs = React.useMemo(() => {
    if (effectiveRole === 'superadmin') return [
      { id: 'admin', label: 'Accueil', icon: ShieldIcon },
      { id: 'plus', label: 'Plus', icon: MenuIcon },
    ];
    if (effectiveRole === 'coach' || effectiveRole === 'owner') return [
      { id: 'home', label: 'Accueil', icon: HomeIcon },
      { id: 'users', label: 'Clients', icon: UsersIcon },
      { id: 'coaching', label: 'Coaching', icon: DumbbellIcon },
      { id: 'crm_pipeline', label: 'Business', icon: DollarSignIcon },
      { id: 'plus', label: 'Plus', icon: MenuIcon },
    ];
    return [
      { id: 'home', label: 'Accueil', icon: HomeIcon },
      { id: 'calendar', label: 'Séances', icon: DumbbellIcon },
      { id: 'performances', label: 'Progression', icon: BarChartIcon },
      { id: 'nutrition', label: 'Nutrition', icon: AppleIcon },
      { id: 'plus', label: 'Plus', icon: MenuIcon },
    ];
  }, [effectiveRole]);

  const mobileMoreGroups = React.useMemo(() => {
    const idsByGroup = (effectiveRole === 'coach' || effectiveRole === 'owner') ? [
      { label: 'Clients', ids: ['chat', 'calendar'] },
      { label: 'Coaching', ids: ['presets', 'nutrition', 'drive'] },
      { label: 'Business', ids: ['crm_finances', 'crm_pipeline'] },
      { label: 'Plus', ids: ['marketing', 'about', 'guide', 'settings'] },
    ] : effectiveRole === 'superadmin' ? [
      { label: 'Administration', ids: ['admin'] },
    ] : [
      { label: 'Séances & progression', ids: ['planning', 'evolution'] },
      { label: 'Plus', ids: ['ai_coach', 'drive', 'profile', 'about', 'supplements'] },
    ];
    return idsByGroup.map(group => ({ ...group, items: group.ids.map(id => menuItems.find(item => item.id === id)).filter(Boolean) as typeof menuItems }));
  }, [effectiveRole, menuItems]);

  const currentPageLabel = menuItems.find(item => item.id === activePage)?.label || ({ exercises: 'Exercices', crm_tasks: 'Tâches', profile: 'Mes objectifs', notifications: 'Notifications' } as Partial<Record<Page, string>>)[activePage] || 'Velatra';
  const roleLabel = effectiveRole === 'superadmin' ? 'Console de gestion' : (effectiveRole === 'coach' || effectiveRole === 'owner' ? 'Espace coach' : 'Espace adhérent');

  const [showTimer, setShowTimer] = React.useState(false);
  const [showPlusSheet, setShowPlusSheet] = React.useState(false);
  const mobileSheetRef = React.useRef<HTMLElement>(null);
  const [showCommandPalette, setShowCommandPalette] = React.useState(false);
  const [commandSearch, setCommandSearch] = React.useState("");
  const [commandActiveIndex, setCommandActiveIndex] = React.useState(0);
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    if (!showPlusSheet) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => mobileSheetRef.current?.querySelector<HTMLElement>('button')?.focus());
    const keepFocusInside = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !mobileSheetRef.current) return;
      const focusable = Array.from(mobileSheetRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keepFocusInside);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', keepFocusInside);
      previousFocus?.focus();
    };
  }, [showPlusSheet]);

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


  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      } else if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowPlusSheet(false);
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

  React.useEffect(() => { setCommandActiveIndex(0); }, [commandSearch]);

  React.useEffect(() => {
    setCommandActiveIndex(current => Math.min(current, Math.max(0, filteredCommandItems.length - 1)));
  }, [filteredCommandItems.length]);

  const handleCommandKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCommandActiveIndex(index => filteredCommandItems.length ? (index + 1) % filteredCommandItems.length : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCommandActiveIndex(index => filteredCommandItems.length ? (index - 1 + filteredCommandItems.length) % filteredCommandItems.length : 0);
    } else if (event.key === 'Enter' && filteredCommandItems[commandActiveIndex]) {
      event.preventDefault();
      handleCommandSelect(filteredCommandItems[commandActiveIndex].id);
    }
  };

  const handleCommandSelect = (itemId: string) => {
    onPageChange(itemId as Page);
    setShowCommandPalette(false);
    setCommandSearch("");
  };

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
    <div className="velatra-app-shell min-h-screen flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="va-sidebar hidden md:flex flex-col">
        <div className="mb-6 px-4">
           <AppLogo club={club} user={user} effectiveRole={effectiveRole} />
        </div>

        {/* Super Admin Perspective switcher */}
        {isReallySuperAdmin && onChangePerspective && (
          <div className="px-4 mb-6">
            <div className="va-admin-switcher p-3 rounded-2xl relative overflow-hidden">
              
              <div className="va-admin-switcher-title mb-2.5 flex items-center gap-1.5 relative">
                <ShieldIcon size={14} />
                <span>Console de Pilotage</span>
              </div>
              
              <div className="va-admin-switcher-options grid grid-cols-3 gap-1 p-1 rounded-xl relative z-10">
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
            className="va-icon-button w-full justify-between px-3.5 bg-white/80 text-left text-sm font-medium"
          >
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-zinc-400 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              Rechercher...
            </span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 bg-white border border-zinc-200 rounded-md">⌘ K</kbd>
          </button>
        </div>

        
        <nav className="flex-1 space-y-3 overflow-y-auto no-scrollbar px-1 pb-6 va-sidebar-nav">
          {/* Top Level Items */}
          {topLevelItems.length > 0 && (
            <div className="space-y-1">
              {topLevelItems.map(item => {
                const isActive = activePage === item.id;
                return (
                  <button 
                    key={item.id}
                    onClick={() => onPageChange(item.id as Page)}
                    className={`va-nav-item ${isActive ? 'va-nav-active' : ''}
                      relative flex items-center justify-between px-4 py-3 rounded-xl w-full transition-all duration-300 group
                      ${isActive ? 'text-emerald-950 font-black' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}
                    `}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeMenuIndicator"
                        className="absolute inset-0 bg-emerald-50 rounded-xl"
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
                  <span className="va-nav-label text-xs font-semibold flex items-center gap-1.5">
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
                            className={`va-nav-item ${isActive ? 'va-nav-active' : ''}
                              relative flex items-center justify-between px-3.5 py-2.5 rounded-xl w-full transition-all duration-300 group
                              ${isActive ? 'text-emerald-950 font-black' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50/70'}
                            `}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="activeMenuIndicator"
                                className="absolute inset-0 bg-emerald-50 rounded-xl"
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
          <button onClick={onLogout} className="va-logout mt-4 flex items-center gap-3 px-4 py-3 rounded-xl w-full text-zinc-500 hover:text-red-500 transition-all hover:bg-red-50 group">
            <LogOutIcon size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
            <span className="text-sm font-medium">Se déconnecter</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="va-main flex-1 min-h-screen relative">
        <header className="va-topbar" aria-label="Barre supérieure">
          <div className="va-topbar-context">
            <strong>{currentPageLabel}</strong>
            <span aria-hidden="true">/</span>
            <span>{roleLabel}</span>
          </div>
          <div className="va-topbar-tools">
            <button type="button" className="va-icon-button va-topbar-search" onClick={() => setShowCommandPalette(true)} aria-label="Rechercher une page (Commande K)" aria-keyshortcuts="Meta+K Control+K">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
              <span>Rechercher une page…</span>
              <kbd>⌘ K</kbd>
            </button>
            <div className="va-user-chip" aria-label={`${user.name}, ${roleLabel}`}>
              <span className="va-user-avatar">{user.avatar?.startsWith('http') ? <img src={user.avatar} alt="" /> : (user.avatar || user.name.substring(0, 2).toUpperCase())}</span>
              <span className="va-user-copy"><strong>{user.name}</strong><span>{roleLabel}</span></span>
            </div>
          </div>
        </header>
        
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
                  accentCol = 'border-red-300';
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
                          <AlertTriangle size={16} className={iconCol} />
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
                        <span className="text-[11px] bg-black/5 rounded-md px-1.5 py-0.5 font-bold uppercase tracking-wider text-zinc-600 border border-black/5 leading-none">
                          Information
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
            className="va-content max-w-none w-full"
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

        {/* Navigation mobile pensée par rôle */}
        <nav aria-label="Navigation principale" className={`va-mobile-nav md:hidden ${effectiveRole === 'superadmin' ? 'va-mobile-nav-admin' : ''}`}>
          {mobileTabs.map(item => {
            const Icon = item.icon;
            const isMore = item.id === 'plus';
            const clientPages = ['users', 'chat', 'calendar'];
            const coachingPages = ['coaching', 'presets'];
            const businessPages = ['crm_pipeline', 'crm_finances'];
            const sessionPages = ['calendar', 'planning'];
            const isMoreActive = showPlusSheet || mobileMoreGroups.some(group => group.items.some(moreItem => moreItem.id === activePage));
            const isSelected = isMore
              ? isMoreActive
              : item.id === activePage
                || (item.id === 'users' && clientPages.includes(activePage))
                || (item.id === 'coaching' && coachingPages.includes(activePage))
                || (item.id === 'crm_pipeline' && businessPages.includes(activePage))
                || (item.id === 'calendar' && sessionPages.includes(activePage));
            return (
              <motion.button
                layout
                key={item.id}
                type="button"
                aria-label={isMore ? (showPlusSheet ? 'Fermer Plus' : 'Ouvrir Plus') : item.label}
                aria-current={isSelected && !isMore ? 'page' : undefined}
                aria-expanded={isMore ? showPlusSheet : undefined}
                aria-controls={isMore ? 'velatra-mobile-more' : undefined}
                className="va-mobile-tab"
                onClick={() => {
                  if (isMore) setShowPlusSheet(open => !open);
                  else { onPageChange(item.id as Page); setShowPlusSheet(false); }
                }}
                whileTap={reduceMotion ? undefined : { scale: .97, y: 1 }}
                transition={{ type: 'spring', stiffness: 440, damping: 34, mass: .65 }}
              >
                {isSelected && <motion.span layoutId="va-mobile-active-pill" className="va-mobile-active-pill" transition={reduceMotion ? { duration: .01 } : { type: 'spring', stiffness: 420, damping: 34, mass: .7 }} />}
                <Icon size={19} strokeWidth={isSelected ? 2.3 : 1.9} />
                <span>{item.label}</span>
                {!isMore && item.id === 'users' && unreadMessagesCount > 0 && <span className="va-mobile-unread-dot" aria-label={`${unreadMessagesCount} messages non lus`} />}
              </motion.button>
            );
          })}
        </nav>

        <AnimatePresence>
          {showPlusSheet && (
            <>
              <motion.button
                type="button"
                className="va-mobile-backdrop md:hidden"
                aria-label="Fermer le menu Plus"
                onClick={() => setShowPlusSheet(false)}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              />
              <motion.section
                ref={mobileSheetRef as React.Ref<HTMLElement>}
                id="velatra-mobile-more"
                role="dialog"
                aria-modal="true"
                aria-label="Plus — navigation secondaire"
                className="va-mobile-sheet md:hidden"
                initial={reduceMotion ? { opacity: 0 } : { y: 70, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { y: 70, opacity: 0 }}
                transition={reduceMotion ? { duration: .01 } : { type: 'spring', stiffness: 360, damping: 36 }}
              >
                <div className="va-mobile-sheet-handle" aria-hidden="true" />
              <div className="va-mobile-sheet-account">
                  <span className="va-user-avatar">{user.avatar?.startsWith('http') ? <img src={user.avatar} alt="" /> : (user.avatar || user.name.substring(0, 2).toUpperCase())}</span>
                  <span><strong>{user.name}</strong><small>{roleLabel}</small></span>
                  <button type="button" aria-label="Fermer le menu Plus" className="va-icon-button" onClick={() => setShowPlusSheet(false)}><X size={18} /></button>
                </div>

                {isReallySuperAdmin && onChangePerspective && (
                  <div className="va-mobile-perspective" aria-label="Changer de vue administrateur">
                    <span>Vue de démonstration</span>
                    {(['superadmin', 'coach', 'member'] as const).map(perspective => (
                      <button key={perspective} type="button" aria-pressed={adminPerspective === perspective} onClick={() => { onChangePerspective(perspective); setShowPlusSheet(false); }}>
                        {perspective === 'superadmin' ? 'Admin' : perspective === 'coach' ? 'Coach' : 'Adhérent'}
                      </button>
                    ))}
                  </div>
                )}

                {mobileMoreGroups.map(group => {
                  const items = group.items.filter(item => item.id !== 'calendar' || planningEnabled);
                  if (!items.length) return null;
                  return (
                    <div className="va-mobile-sheet-group" key={group.label}>
                      <h3>{group.label}</h3>
                      <div>
                        {items.map(item => {
                          const Icon = item.icon;
                          const selected = activePage === item.id;
                          return (
                            <button
                              type="button"
                              key={item.id}
                              className="va-mobile-sheet-link"
                              aria-current={selected ? 'page' : undefined}
                              onClick={() => { onPageChange(item.id as Page); setShowPlusSheet(false); }}
                            >
                              <Icon size={18} aria-hidden="true" />
                              <span>{item.label}</span>
                              {item.id === 'chat' && unreadMessagesCount > 0 && <span className="va-mobile-count">{unreadMessagesCount}</span>}
                              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <div className="va-mobile-sheet-actions">
                  <button type="button" className="va-mobile-sheet-link" onClick={() => { setShowTimer(open => !open); setShowPlusSheet(false); }}><TimerIcon size={18} /><span>{showTimer ? 'Masquer le chronomètre' : 'Chronomètre'}</span></button>
                  <button type="button" className="va-mobile-sheet-link va-mobile-logout" onClick={() => { setShowPlusSheet(false); onLogout(); }}><LogOutIcon size={18} /><span>Se déconnecter</span></button>
                </div>
              </motion.section>
            </>
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
            className="va-command-overlay fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4"
            onClick={() => {
              setShowCommandPalette(false);
              setCommandSearch("");
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Recherche et navigation"
              initial={{ opacity: 0, y: -24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -24, scale: 0.96 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="va-command-panel bg-white border border-zinc-200 w-full max-w-3xl rounded-3xl overflow-hidden shadow-[0_30px_60px_rgba(24,24,27,0.25)]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 bg-zinc-50/50">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-zinc-400 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input 
                  autoFocus
                  type="text" 
                  role="combobox"
                  aria-label="Rechercher une page ou section"
                  aria-expanded="true"
                  aria-controls="velatra-command-results"
                  aria-activedescendant={filteredCommandItems[commandActiveIndex] ? `velatra-command-${filteredCommandItems[commandActiveIndex].id}` : undefined}
                  placeholder="Rechercher une page ou section... (ex: Modèles, Nutrition, Drive)" 
                  value={commandSearch}
                  onChange={e => setCommandSearch(e.target.value)}
                  onKeyDown={handleCommandKeyDown}
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

              <div id="velatra-command-results" role="listbox" className="max-h-[350px] overflow-y-auto p-3 space-y-1 no-scrollbar">
                {filteredCommandItems.length > 0 ? (
                  filteredCommandItems.map(item => {
                    const isSelected = activePage === item.id;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        id={`velatra-command-${item.id}`}
                        role="option"
                        aria-selected={commandActiveIndex === filteredCommandItems.indexOf(item)}
                        onMouseEnter={() => setCommandActiveIndex(filteredCommandItems.indexOf(item))}
                        onClick={() => handleCommandSelect(item.id)}
                        className={`va-command-item w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all ${
                          commandActiveIndex === filteredCommandItems.indexOf(item)
                            ? 'font-semibold'
                            : 'hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 font-bold'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon size={16} strokeWidth={2.5} className={isSelected ? 'text-white' : 'text-zinc-400'} />
                          <span className="text-sm">{item.label}</span>
                        </div>
                        {item.category && (
                          <span className={`text-[11px] font-medium px-2 py-1 rounded-full ${
                            commandActiveIndex === filteredCommandItems.indexOf(item) ? 'bg-white/70 text-emerald-950' : 'bg-zinc-100 text-zinc-600'
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
              <div className="px-5 py-3.5 bg-zinc-50 border-t border-zinc-100 flex justify-between items-center text-xs font-medium text-zinc-600">
                <span>↑ ↓ pour parcourir, Entrée pour ouvrir</span>
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
