
import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { User, Page, Club } from '../types';
import { 
  HomeIcon, UsersIcon, LayersIcon, BarChartIcon, 
  DumbbellIcon, InfoIcon, LogOutIcon, GiftIcon, TargetIcon, CalendarIcon, HistoryIcon, DatabaseIcon, ShoppingCartIcon, TimerIcon, XIcon, MegaphoneIcon, BotIcon, DollarSignIcon, ClipboardIcon, AppleIcon, LockIcon, SettingsIcon, MenuIcon, ShieldIcon, MessageCircleIcon, FolderIcon, PlayCircleIcon, UserIcon, ActivityIcon, BellIcon, ImageIcon
} from './Icons';
import { Timer } from './Timer';
import { db, auth } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Megaphone, AlertTriangle, X, Search, Plus, Copy, ChevronDown, UserRound } from 'lucide-react';
import {
  AppHub, getAllContextItems, getAppHubForPage, getContextItemsForHub,
  getContextPageLabel, getHubLabel, getMobileTabForPage,
} from './appShellHelpers';
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
  isWorkspaceMode?: boolean;
}

const AppLogo = () => (
  <div className="va-rail-brand" aria-label="Velatra">
    <img src="/brand/velatra-mark.png" alt="" />
    <span>VELATRA</span>
  </div>
);

const hubIcon: Record<string, React.FC<any>> = {
  home: HomeIcon,
  clients: UsersIcon,
  coaching: DumbbellIcon,
  business: DollarSignIcon,
  plus: MenuIcon,
  sessions: DumbbellIcon,
  progression: BarChartIcon,
  nutrition: AppleIcon,
  admin: ShieldIcon,
};

const pageIcon: Record<string, React.FC<any>> = {
  users: UsersIcon, chat: MessageCircleIcon, calendar: CalendarIcon,
  coaching: ActivityIcon, presets: LayersIcon, nutrition: AppleIcon, drive: FolderIcon,
  crm_pipeline: TargetIcon, crm_finances: DollarSignIcon, marketing: MegaphoneIcon,
  about: InfoIcon, guide: InfoIcon, settings: SettingsIcon,
  planning: CalendarIcon, performances: BarChartIcon, evolution: ImageIcon,
  supplements: ShoppingCartIcon, ai_coach: BotIcon, profile: UserIcon, admin: ShieldIcon,
};

const primaryHubsForRole = (role: string): { id: AppHub; label: string; page: string }[] => {
  if (role === 'superadmin') return [{ id: 'admin', label: 'Admin', page: 'admin' }];
  if (role === 'coach' || role === 'owner') return [
    { id: 'home', label: 'Accueil', page: 'home' },
    { id: 'clients', label: 'Clients', page: 'users' },
    { id: 'coaching', label: 'Coaching', page: 'coaching' },
    { id: 'business', label: 'Business', page: 'crm_pipeline' },
    { id: 'plus', label: 'Plus', page: 'about' },
  ];
  return [
    { id: 'home', label: 'Accueil', page: 'home' },
    { id: 'sessions', label: 'Séances', page: 'calendar' },
    { id: 'progression', label: 'Progression', page: 'performances' },
    { id: 'nutrition', label: 'Nutrition', page: 'nutrition' },
    { id: 'plus', label: 'Plus', page: 'ai_coach' },
  ];
};

const mobileGroupsForRole = (role: string, planningEnabled: boolean) => {
  if (role === 'superadmin') return [{ label: 'Administration', ids: ['admin'] }];
  const isCoach = role === 'coach' || role === 'owner';
  const groups = isCoach ? [
    { label: 'Clients', hub: 'clients' as AppHub },
    { label: 'Coaching', hub: 'coaching' as AppHub },
    { label: 'Business', hub: 'business' as AppHub },
    { label: 'Plus', hub: 'plus' as AppHub },
  ] : [
    { label: 'Séances', hub: 'sessions' as AppHub },
    { label: 'Progression', hub: 'progression' as AppHub },
    { label: 'Nutrition', hub: 'nutrition' as AppHub },
    { label: 'Plus', hub: 'plus' as AppHub },
  ];
  return groups.map(group => ({ ...group, ids: getContextItemsForHub(group.hub, role, planningEnabled).map(item => item.id) }));
};

export const Layout: React.FC<LayoutProps> = ({ 
  user, club, activePage, onPageChange, onLogout, children, 
  unreadMessagesCount = 0, unreadNotificationsCount = 0, 
  logs = [], payments = [], users = [],
  adminPerspective = 'superadmin', onChangePerspective, isWorkspaceMode = false
}) => {
  const planningEnabled = club?.settings?.booking?.enabled ?? true;

  const isSuperAdmin = user.role === 'superadmin';
  const effectiveRole = isSuperAdmin ? adminPerspective : user.role;

  const activeHub = getAppHubForPage(activePage, effectiveRole);
  const primaryHubs = primaryHubsForRole(effectiveRole);
  const contextItems = getContextItemsForHub(activeHub, effectiveRole, planningEnabled);
  const commandItems = getAllContextItems(effectiveRole, planningEnabled).map(item => ({ ...item, icon: pageIcon[item.id] || InfoIcon }));
  const mobileMoreGroups = React.useMemo(() => mobileGroupsForRole(effectiveRole, planningEnabled).map(group => ({
    ...group,
    items: group.ids.map(id => ({
      id,
      label: getContextPageLabel(id, effectiveRole),
      icon: pageIcon[id] || InfoIcon,
    })),
  })), [effectiveRole, planningEnabled]);

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

  const roleLabel = effectiveRole === 'superadmin' ? 'Console de gestion' : (effectiveRole === 'coach' || effectiveRole === 'owner' ? 'Espace coach' : 'Espace adhérent');

  const [showTimer, setShowTimer] = React.useState(false);
  const [showPlusSheet, setShowPlusSheet] = React.useState(false);
  const mobileSheetRef = React.useRef<HTMLElement>(null);
  const [showCreateMenu, setShowCreateMenu] = React.useState(false);
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const [showInviteDialog, setShowInviteDialog] = React.useState(false);
  const [inviteCopyState, setInviteCopyState] = React.useState<'idle' | 'copied' | 'error'>('idle');
  const createMenuRef = React.useRef<HTMLDivElement>(null);
  const createTriggerRef = React.useRef<HTMLButtonElement>(null);
  const profileMenuRef = React.useRef<HTMLDivElement>(null);
  const desktopProfileTriggerRef = React.useRef<HTMLButtonElement>(null);
  const mobileProfileTriggerRef = React.useRef<HTMLButtonElement>(null);
  const inviteDialogRef = React.useRef<HTMLDivElement>(null);
  const [showCommandPalette, setShowCommandPalette] = React.useState(false);
  const [commandSearch, setCommandSearch] = React.useState("");
  const [commandActiveIndex, setCommandActiveIndex] = React.useState(0);
  const [mobileSlideDirection, setMobileSlideDirection] = React.useState(1);
  const [isVirtualKeyboardOpen, setIsVirtualKeyboardOpen] = React.useState(false);
  const reduceMotion = useReducedMotion();
  const activeMobileTabId = showPlusSheet ? 'plus' : getMobileTabForPage(activePage, effectiveRole);

  React.useEffect(() => {
    const updateKeyboardState = () => {
      const viewport = window.visualViewport;
      const focused = document.activeElement;
      const isEditable = focused instanceof HTMLElement && (focused.matches('input, textarea, select') || focused.isContentEditable);
      setIsVirtualKeyboardOpen(Boolean(viewport && isEditable && viewport.height < window.innerHeight * .78));
    };
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', updateKeyboardState);
    window.addEventListener('resize', updateKeyboardState);
    document.addEventListener('focusin', updateKeyboardState);
    document.addEventListener('focusout', updateKeyboardState);
    updateKeyboardState();
    return () => {
      viewport?.removeEventListener('resize', updateKeyboardState);
      window.removeEventListener('resize', updateKeyboardState);
      document.removeEventListener('focusin', updateKeyboardState);
      document.removeEventListener('focusout', updateKeyboardState);
    };
  }, []);

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

  React.useEffect(() => {
    if (!showCreateMenu) return;
    const focusFrame = window.requestAnimationFrame(() => createMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !createMenuRef.current?.contains(event.target)) setShowCreateMenu(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('pointerdown', closeOutside);
    };
  }, [showCreateMenu]);

  React.useEffect(() => {
    if (!showProfileMenu) return;
    const focusFrame = window.requestAnimationFrame(() => profileMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !profileMenuRef.current?.contains(event.target) && !desktopProfileTriggerRef.current?.contains(event.target) && !mobileProfileTriggerRef.current?.contains(event.target)) setShowProfileMenu(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('pointerdown', closeOutside);
    };
  }, [showProfileMenu]);

  React.useEffect(() => {
    if (!showInviteDialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => inviteDialogRef.current?.querySelector<HTMLElement>('button')?.focus());
    const keepFocusInside = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !inviteDialogRef.current) return;
      const focusable = Array.from(inviteDialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); focusable[0].focus(); }
    };
    document.addEventListener('keydown', keepFocusInside);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', keepFocusInside);
      previousFocus?.focus();
    };
  }, [showInviteDialog]);

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
        setShowCreateMenu(false);
        setShowProfileMenu(false);
        setShowInviteDialog(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activePage]);

  const filteredCommandItems = React.useMemo(() => {
    if (!commandSearch) return commandItems;
    const query = commandSearch.toLowerCase().trim();
    return commandItems.filter(item =>
      item.label.toLowerCase().includes(query) || getHubLabel(item.hub, effectiveRole).toLowerCase().includes(query)
    );
  }, [commandSearch, commandItems, effectiveRole]);

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

  const goToPage = (page: string) => {
    onPageChange(page as Page);
    setShowCreateMenu(false);
    setShowProfileMenu(false);
    setShowPlusSheet(false);
  };

  const openInviteDialog = () => {
    setInviteCopyState('idle');
    setShowCreateMenu(false);
    setShowInviteDialog(true);
  };

  const copyClubCode = async () => {
    if (!club?.id) return;
    try {
      await navigator.clipboard.writeText(String(club.id));
      setInviteCopyState('copied');
    } catch {
      setInviteCopyState('error');
    }
  };

  const profilePage = effectiveRole === 'member' ? 'profile' : effectiveRole === 'superadmin' ? 'admin' : 'settings';
  const profileLabel = effectiveRole === 'member' ? 'Mon profil et mes objectifs' : effectiveRole === 'superadmin' ? 'Administration' : 'Paramètres du compte';

  return (
    <div className={`velatra-app-shell min-h-screen flex flex-col md:flex-row ${isVirtualKeyboardOpen ? 'va-keyboard-open' : ''} ${isWorkspaceMode ? 'va-workspace-mode' : ''}`}>
      <aside className="va-rail" aria-label="Navigation de Velatra">
        <AppLogo />
        <nav className="va-rail-nav" aria-label="Espaces principaux">
          {primaryHubs.map(hub => {
            const Icon = hubIcon[hub.id] || MenuIcon;
            const selected = activeHub === hub.id;
            return (
              <button
                key={hub.id}
                type="button"
                className={`va-rail-item ${selected ? 'is-active' : ''}`}
                aria-current={selected ? 'page' : undefined}
                onClick={() => goToPage(hub.page)}
              >
                <Icon size={19} aria-hidden="true" />
                <span>{hub.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="va-rail-profile-wrap">
          <button
            ref={desktopProfileTriggerRef}
            type="button"
            className="va-rail-profile"
            aria-label={`Ouvrir le profil de ${user.name}`}
            aria-haspopup="menu"
            aria-expanded={showProfileMenu}
            onClick={() => setShowProfileMenu(open => !open)}
          >
            <span className="va-user-avatar">{user.avatar?.startsWith('http') ? <img src={user.avatar} alt="" /> : (user.avatar || user.name.substring(0, 2).toUpperCase())}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="va-main flex-1 min-h-screen relative">
        <header className="va-topbar va-context-bar" aria-label="Contexte de navigation">
          <div className="va-context-main">
            <div className="va-context-heading">
              <strong>{getHubLabel(activeHub, effectiveRole)}</strong>
              <span>{roleLabel}</span>
            </div>
            {contextItems.length > 0 && (
              <nav className="va-context-tabs" aria-label={`Pages de ${getHubLabel(activeHub, effectiveRole)}`}>
                {contextItems.map(item => (
                  <button key={item.id} type="button" aria-current={activePage === item.id ? 'page' : undefined} onClick={() => goToPage(item.id)}>
                    <span>{item.label}</span>
                    {item.id === 'chat' && unreadMessagesCount > 0 && <span className="va-context-count" aria-label={`${unreadMessagesCount} messages non lus`}>{unreadMessagesCount}</span>}
                  </button>
                ))}
              </nav>
            )}
          </div>
          <div className="va-topbar-tools">
            <button type="button" className="va-icon-button va-topbar-search" onClick={() => setShowCommandPalette(true)} aria-label="Rechercher une page (Commande K)" aria-keyshortcuts="Meta+K Control+K">
              <Search size={17} aria-hidden="true" />
              <span>Rechercher…</span>
              <kbd><span className="va-shortcut-mac">⌘</span><span className="va-shortcut-other">Ctrl</span> K</kbd>
            </button>
            {isCoach && (
              <div className="va-create-anchor" ref={createMenuRef}>
                <button ref={createTriggerRef} type="button" className="va-create-trigger" aria-haspopup="menu" aria-expanded={showCreateMenu} aria-controls="va-create-menu" onClick={() => setShowCreateMenu(open => !open)}>
                  <Plus size={17} aria-hidden="true" /><span>Créer</span><ChevronDown size={14} aria-hidden="true" />
                </button>
                {showCreateMenu && (
                  <div id="va-create-menu" className="va-create-menu" role="menu" aria-label="Créer ou ouvrir un outil">
                    <span className="va-menu-caption">ACCÈS RAPIDE</span>
                    <button type="button" role="menuitem" onClick={() => goToPage('users')}><UsersIcon size={17} /><span><strong>Ajouter un adhérent</strong><small>Ouvrir les membres</small></span></button>
                    <button type="button" role="menuitem" onClick={() => goToPage('presets')}><LayersIcon size={17} /><span><strong>Créer un programme</strong><small>Ouvrir les programmes</small></span></button>
                    <button type="button" role="menuitem" onClick={() => goToPage('crm_pipeline')}><TargetIcon size={17} /><span><strong>Ajouter un prospect</strong><small>Ouvrir les prospects</small></span></button>
                    <button type="button" role="menuitem" onClick={() => goToPage('calendar')}><CalendarIcon size={17} /><span><strong>Planifier une séance</strong><small>Ouvrir le planning</small></span></button>
                    <button type="button" role="menuitem" disabled={!club?.id} onClick={openInviteDialog}><UserRound size={17} /><span><strong>Inviter un adhérent</strong><small>{club?.id ? 'Copier le code de votre espace' : 'Espace indisponible'}</small></span></button>
                    <div className="va-menu-divider" />
                    <button type="button" role="menuitem" onClick={() => { setShowTimer(open => !open); setShowCreateMenu(false); }}><TimerIcon size={17} /><span><strong>Chronomètre</strong><small>{showTimer ? 'Masquer le chronomètre' : 'Ouvrir l’outil'}</small></span></button>
                  </div>
                )}
              </div>
            )}
            {isSuperAdmin && onChangePerspective && (
              <div className="va-perspective-switch" role="group" aria-label="Changer de perspective">
                {(['superadmin', 'coach', 'member'] as const).map(perspective => (
                  <button key={perspective} type="button" aria-pressed={adminPerspective === perspective} onClick={() => onChangePerspective(perspective)}>
                    {perspective === 'superadmin' ? 'Admin' : perspective === 'coach' ? 'Coach' : 'Adhérent'}
                  </button>
                ))}
              </div>
            )}
            <button ref={mobileProfileTriggerRef} type="button" className="va-mobile-profile" aria-label={`Ouvrir le profil de ${user.name}`} aria-haspopup="menu" aria-expanded={showProfileMenu} onClick={() => setShowProfileMenu(open => !open)}>
              <span className="va-user-avatar">{user.avatar?.startsWith('http') ? <img src={user.avatar} alt="" /> : (user.avatar || user.name.substring(0, 2).toUpperCase())}</span>
            </button>
            {showProfileMenu && (
              <div ref={profileMenuRef} className="va-profile-menu" role="menu" aria-label="Menu du compte">
                <div className="va-profile-menu-user"><strong>{user.name}</strong><span>{roleLabel}</span></div>
                <button type="button" role="menuitem" onClick={() => goToPage(profilePage)}><UserRound size={17} aria-hidden="true" /><span>{profileLabel}</span></button>
                <button type="button" role="menuitem" onClick={() => { setShowTimer(open => !open); setShowProfileMenu(false); }}><TimerIcon size={17} aria-hidden="true" /><span>{showTimer ? 'Masquer le chronomètre' : 'Chronomètre'}</span></button>
                <button type="button" role="menuitem" className="va-profile-logout" onClick={() => { setShowProfileMenu(false); onLogout(); }}><LogOutIcon size={17} aria-hidden="true" /><span>Se déconnecter</span></button>
              </div>
            )}
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
        <nav aria-label="Navigation principale" className={`va-mobile-nav ${effectiveRole === 'superadmin' ? 'va-mobile-nav-admin' : ''}`}>
          {mobileTabs.map(item => {
            const Icon = item.icon;
            const isMore = item.id === 'plus';
            const isSelected = item.id === activeMobileTabId;
            return (
              <motion.button
                layout
                key={item.id}
                type="button"
                aria-label={isMore ? (showPlusSheet ? 'Fermer Plus' : 'Ouvrir Plus') : item.label}
                aria-current={isSelected && !isMore ? 'page' : undefined}
                aria-expanded={isMore ? showPlusSheet : undefined}
                aria-controls={isMore ? 'velatra-mobile-more' : undefined}
                className={`va-mobile-tab ${isSelected ? 'va-mobile-tab--active' : ''}`}
                onClick={() => {
                  const nextTabIndex = mobileTabs.findIndex(tab => tab.id === item.id);
                  const currentTabIndex = mobileTabs.findIndex(tab => tab.id === activeMobileTabId);
                  setMobileSlideDirection(nextTabIndex >= currentTabIndex ? 1 : -1);
                  if (isMore) setShowPlusSheet(open => !open);
                  else { onPageChange(item.id as Page); setShowPlusSheet(false); }
                }}
                whileTap={reduceMotion ? undefined : { scale: .97, y: 1 }}
                transition={{ type: 'spring', stiffness: 440, damping: 34, mass: .65 }}
              >
                {isSelected && <motion.span key={`pill-${item.id}`} layoutId="va-mobile-active-pill" className="va-mobile-active-pill" style={{ transformOrigin: mobileSlideDirection > 0 ? 'left center' : 'right center' }} initial={reduceMotion ? false : { scaleX: .86, opacity: .92 }} animate={reduceMotion ? { scaleX: 1, opacity: 1 } : { scaleX: [1, 1.12, .97, 1], opacity: 1 }} transition={reduceMotion ? { duration: .01 } : { scaleX: { duration: .42, times: [0, .35, .72, 1], ease: [.2, .8, .2, 1] }, layout: { type: 'spring', stiffness: 420, damping: 34, mass: .7 } }} />}
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
                className="va-mobile-backdrop"
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
                className="va-mobile-sheet"
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

                {isSuperAdmin && onChangePerspective && (
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
                  const items = group.items;
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

      <AnimatePresence>
        {showInviteDialog && (
          <motion.div className="va-invite-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowInviteDialog(false); }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.section ref={inviteDialogRef} className="va-invite-dialog" role="dialog" aria-modal="true" aria-labelledby="va-invite-title" initial={{ opacity: 0, y: 14, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .98 }}>
              <button type="button" className="va-invite-close" aria-label="Fermer" onClick={() => setShowInviteDialog(false)}><X size={18} aria-hidden="true" /></button>
              <span className="va-invite-icon"><UserRound size={20} aria-hidden="true" /></span>
              <p className="va-menu-caption">INVITATION</p>
              <h2 id="va-invite-title">Inviter un adhérent</h2>
              <p>Partagez ce code avec votre adhérent. Il pourra le saisir pendant la création de son compte pour rejoindre votre espace.</p>
              <div className="va-invite-code"><code>{club?.id || 'Code indisponible'}</code><button type="button" disabled={!club?.id} onClick={copyClubCode}><Copy size={16} aria-hidden="true" />{inviteCopyState === 'copied' ? 'Copié' : 'Copier'}</button></div>
              <p className={`va-invite-status ${inviteCopyState === 'error' ? 'is-error' : ''}`} aria-live="polite">{inviteCopyState === 'copied' ? 'Le code est copié dans le presse-papiers.' : inviteCopyState === 'error' ? 'Copie impossible. Sélectionnez le code et copiez-le manuellement.' : 'Ce code correspond à celui demandé dans le formulaire d’inscription adhérent.'}</p>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

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
                {item.hub && (
                          <span className={`text-[11px] font-medium px-2 py-1 rounded-full ${
                            commandActiveIndex === filteredCommandItems.indexOf(item) ? 'bg-white/70 text-emerald-950' : 'bg-zinc-100 text-zinc-600'
                          }`}>
                            {getHubLabel(item.hub, effectiveRole)}
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
