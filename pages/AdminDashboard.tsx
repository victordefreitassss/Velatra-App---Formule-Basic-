import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  collection, getDocs, doc, updateDoc, deleteDoc, query, where, addDoc, serverTimestamp, orderBy, limit 
} from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Club, User } from '../types';
import { Card } from '../components/UI';
import { 
  Shield, CheckCircle, XCircle, Search, Activity, Crown, Power, Trash2,
  Users, TrendingUp, Coins, Megaphone, History, Plus, Edit3, Save, Filter, 
  Building2, Server, AlertTriangle, Key, ArrowRightLeft, UserCheck, ShieldAlert,
  Loader2, Globe, Send, RefreshCw, Smartphone, Mail, Phone, Calendar, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend, AreaChart, Area, 
  LineChart, Line 
} from 'recharts';

interface AdminDashboardProps {
  showToast: (msg: string, type: 'success' | 'error') => void;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  category: 'info' | 'warning' | 'critical';
  target: 'all' | 'coaches' | 'members';
  createdAt: number;
  actorEmail: string;
}

interface AuditLog {
  id: string;
  actionType: string;
  details: string;
  actorEmail: string;
  timestamp: number;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ showToast }) => {
  // Navigation States
  const [activeTab, setActiveTab] = useState<'clubs' | 'analytics' | 'users' | 'broadcast' | 'audit'>('clubs');

  // Core Data
  const [clubs, setClubs] = useState<Club[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [owners, setOwners] = useState<Record<string, User>>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [clubSearchTerm, setClubSearchTerm] = useState('');
  const [clubFilterStatus, setClubFilterStatus] = useState('Tous');
  
  // User tab filters
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userFilterRole, setUserFilterRole] = useState('Tous');
  const [userFilterClub, setUserFilterClub] = useState('Tous');

  // Interactive MRR Simulator States
  const [simAcquisitionRate, setSimAcquisitionRate] = useState(4); // default 4 new clubs/month
  const [simClassicRate, setSimClassicRate] = useState(40); // 40% convert to Classic
  const [simPremiumRate, setSimPremiumRate] = useState(30); // 30% convert to Premium

  // Action and Editing States
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserRole, setEditUserRole] = useState<'superadmin' | 'owner' | 'coach' | 'member'>('member');
  const [editUserClubId, setEditUserClubId] = useState('');

  // Broadcasting states
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annCategory, setAnnCategory] = useState<'info' | 'warning' | 'critical'>('info');
  const [annTarget, setAnnTarget] = useState<'all' | 'coaches' | 'members'>('all');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Modals / Dropdowns
  const [confirmDeleteClubId, setConfirmDeleteClubId] = useState<string | null>(null);

  // Load audit logs & active alerts as well
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Clubs
      const clubsSnap = await getDocs(collection(db, 'clubs'));
      const clubsData = clubsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Club));
      setClubs(clubsData);

      // 2. Fetch Users
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersData = usersSnap.docs.map(d => {
        const raw = d.data();
        return { 
          id: d.id, 
          name: raw.name || '',
          email: raw.email || '',
          phone: raw.phone || '',
          role: raw.role || 'member',
          clubId: raw.clubId || '',
          onboardingCompleted: raw.onboardingCompleted ?? false,
          isSuspended: raw.isSuspended ?? false,
          createdAt: raw.createdAt || ''
        } as unknown as User;
      });
      setAllUsers(usersData);
      
      const ownersMap: Record<string, User> = {};
      usersData.forEach(user => {
        if (user.role === 'owner') {
          ownersMap[user.clubId] = user;
        }
      });
      setOwners(ownersMap);

      // 3. Fetch System Announcements
      const annSnap = await getDocs(collection(db, 'system_announcements'));
      const annData = annSnap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
      // Sort client-side in case index is not immediately compiled on firebase
      annData.sort((a, b) => b.createdAt - a.createdAt);
      setAnnouncements(annData);

      // 4. Fetch Audit Logs
      const auditSnap = await getDocs(collection(db, 'admin_audit_logs'));
      const auditData = auditSnap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
      auditData.sort((a, b) => b.timestamp - a.timestamp);
      setAuditLogs(auditData);

    } catch (error) {
      console.error("Error fetching admin dashboard data:", error);
      showToast("Erreur lors de la synchronisation des données", "error");
    } finally {
      setLoading(false);
    }
  };

  // Helper inside file to log admin events in Firestore
  const logAdminAction = async (actionType: string, details: string) => {
    try {
      const payload = {
        actionType,
        details,
        actorEmail: 'victor.defreitas.pro@gmail.com',
        timestamp: Date.now()
      };
      const refDoc = await addDoc(collection(db, 'admin_audit_logs'), payload);
      const newLog: AuditLog = { id: refDoc.id, ...payload };
      setAuditLogs(prev => [newLog, ...prev]);
    } catch (e) {
      console.error("Error writing audit log:", e);
    }
  };

  // 1. Plan distributions
  const planDistribution = useMemo(() => {
    return [
      { name: 'Basic (0€)', value: clubs.filter(c => !c.plan || c.plan === 'basic').length, color: '#a1a1aa' },
      { name: 'Classic (49€)', value: clubs.filter(c => c.plan === 'classic').length, color: '#10b981' },
      { name: 'Premium (99€)', value: clubs.filter(c => c.plan === 'premium').length, color: '#f59e0b' },
    ].filter(d => d.value > 0);
  }, [clubs]);

  // Compute live actual MRR (Monthly Recurring Revenue)
  const currentMRR = useMemo(() => {
    return clubs.reduce((acc, club) => {
      if (club.plan === 'premium') return acc + 99;
      if (club.plan === 'classic') return acc + 49;
      return acc;
    }, 0);
  }, [clubs]);

  // Formatted months list for static rendering or chart matching
  const creationData = useMemo(() => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const currentMonth = new Date().getMonth();
    
    const monthlyData = Array(6).fill(0).map((_, i) => {
      const monthIndex = (currentMonth - i + 12) % 12;
      return { name: months[monthIndex], count: 0, monthIndex };
    }).reverse();

    clubs.forEach(c => {
      if (!c.createdAt) return;
      const d = new Date(c.createdAt);
      const m = d.getMonth();
      const target = monthlyData.find(md => md.monthIndex === m);
      if (target) target.count += 1;
    });

    return monthlyData;
  }, [clubs]);

  // Interactive Growth Simulator calculations
  const simulatedProjectionData = useMemo(() => {
    let baseCumulativeClubs = clubs.length;
    let baseCumulativeMRR = currentMRR;
    const simData = [];
    const monthsList = ['En cours', 'Mois +1', 'Mois +2', 'Mois +3', 'Mois +4', 'Mois +5', 'Mois +6', 'Mois +7', 'Mois +8', 'Mois +9', 'Mois +10', 'Mois +11', 'Mois +12'];

    for (let i = 0; i < monthsList.length; i++) {
      if (i === 0) {
        simData.push({
          name: monthsList[i],
          clubs: baseCumulativeClubs,
          mrr: baseCumulativeMRR,
          revenueExpected: baseCumulativeMRR
        });
      } else {
        const addedClubs = simAcquisitionRate;
        const premiumCount = addedClubs * (simPremiumRate / 100);
        const classicCount = addedClubs * (simClassicRate / 100);
        const basicCount = addedClubs * (1 - (simClassicRate + simPremiumRate) / 100);

        baseCumulativeClubs += addedClubs;
        baseCumulativeMRR += (premiumCount * 99) + (classicCount * 49);

        simData.push({
          name: monthsList[i],
          clubs: baseCumulativeClubs,
          mrr: Math.round(baseCumulativeMRR),
          revenueExpected: Math.round(baseCumulativeMRR)
        });
      }
    }
    return simData;
  }, [clubs, currentMRR, simAcquisitionRate, simClassicRate, simPremiumRate]);

  // Update cloud status/plan helpers
  const updatePlan = async (clubId: string, newPlan: 'basic' | 'classic' | 'premium') => {
    try {
      const clubName = clubs.find(c => c.id === clubId)?.name || 'Club inconnu';
      await updateDoc(doc(db, 'clubs', clubId), { plan: newPlan });
      setClubs(clubs.map(c => c.id === clubId ? { ...c, plan: newPlan } : c));
      showToast(`Formule mise à jour : ${newPlan}`, "success");
      logAdminAction("CLUB_PLAN_UPDATE", `Modification de la formule du club "${clubName}" passée à: ${newPlan.toUpperCase()}`);
    } catch (error) {
      console.error("Error updating plan:", error);
      showToast("Erreur lors de la mise à jour", "error");
    }
  };

  const toggleActive = async (clubId: string, currentStatus: boolean) => {
    try {
      const clubName = clubs.find(c => c.id === clubId)?.name || 'Club inconnu';
      const newStatus = currentStatus === undefined ? false : !currentStatus;
      await updateDoc(doc(db, 'clubs', clubId), { isActive: newStatus });
      setClubs(clubs.map(c => c.id === clubId ? { ...c, isActive: newStatus } : c));
      showToast(`Compte ${newStatus ? 'réactivé' : 'suspendu'}`, "success");
      logAdminAction("CLUB_TOGGLE_ACTIVE", `Statut du club "${clubName}" mis à: ${newStatus ? 'ACTIF' : 'SUSPENDU'}`);
    } catch (error) {
      console.error("Error updating active status:", error);
      showToast("Erreur lors de la mise à jour", "error");
    }
  };

  const deleteClubAndData = (clubId: string) => {
    setConfirmDeleteClubId(clubId);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteClubId) return;
    const clubId = confirmDeleteClubId;
    const clubName = clubs.find(c => c.id === clubId)?.name || 'Club inconnu';
    
    setLoading(true);
    try {
      showToast("Suppression intégrale des données en cours...", "success");
      
      const collectionsToDelete = [
        "users", "programs", "presets", "archivedPrograms", "performances", 
        "supplementProducts", "supplementOrders", "logs", "messages", "feed", 
        "bodyData", "prospects", "newsletters", "tasks", "plans", "nutritionPlans", 
        "nutritionLogs", "subscriptions", "payments", "exercises", "crmClients", 
        "crmFormulas", "manualStats", "pendingProspects", "expenses", "invoices"
      ];

      for (const colName of collectionsToDelete) {
        try {
          const q = query(collection(db, colName), where("clubId", "==", clubId));
          const snap = await getDocs(q);
          const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
          await Promise.all(deletePromises);
        } catch (e) {
          console.error(`Error deleting from ${colName}:`, e);
        }
      }

      await deleteDoc(doc(db, "clubs", clubId));
      
      setClubs(clubs.filter(c => c.id !== clubId));
      showToast("Le club et toutes ses données correspondantes ont été épurés", "success");
      logAdminAction("CLUB_DELETE", `Suppression définitive du club "${clubName}" ainsi que toutes ses données liées.`);
    } catch (error) {
      console.error("Error deleting club:", error);
      showToast("Erreur lors de la suppression", "error");
    } finally {
      setLoading(false);
      setConfirmDeleteClubId(null);
    }
  };

  const initializeOldClubs = async () => {
    try {
      showToast("Initialisation en cours...", "success");
      const updatedClubs = [...clubs];
      let changesCount = 0;
      for (const club of updatedClubs) {
        if (!club.plan || club.isActive === undefined) {
          const updates: any = {};
          if (!club.plan) updates.plan = 'basic';
          if (club.isActive === undefined) updates.isActive = true;
          
          await updateDoc(doc(db, 'clubs', club.id), updates);
          club.plan = club.plan || 'basic';
          club.isActive = club.isActive ?? true;
          changesCount++;
        }
      }
      setClubs(updatedClubs);
      showToast("Tous les clubs obsolètes ont été réinitialisés !", "success");
      logAdminAction("CLUBS_SANITY_CHECK", `Lancement d'une passe de conformité : ${changesCount} clubs corrigés.`);
    } catch (error) {
      console.error("Error initializing clubs:", error);
      showToast("Erreur lors de l'initialisation", "error");
    }
  };

  const handleLogoUpload = async (clubId: string, file: File) => {
    try {
      showToast("Téléchargement du logo en cours...", "success");
      const logoRef = ref(storage, `clubs/${clubId}/logo_${Date.now()}`);
      await uploadBytes(logoRef, file);
      const url = await getDownloadURL(logoRef);
      
      await updateDoc(doc(db, 'clubs', clubId), { logo: url });
      setClubs(clubs.map(c => c.id === clubId ? { ...c, logo: url } : c));
      showToast("Logo de club mis à jour !", "success");
      
      const clubName = clubs.find(c => c.id === clubId)?.name || 'Club inconnu';
      logAdminAction("CLUB_LOGO_UPDATE", `Mise à jour du logo média pour le club "${clubName}"`);
    } catch (error) {
      console.error("Error uploading logo:", error);
      showToast("Erreur lors du téléchargement du logo", "error");
    }
  };

  // BROADCAST SYSTEM NOTICE ACTIONS
  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annBody.trim()) {
      showToast("Veuillez saisir un titre et un descriptif de flash info", "error");
      return;
    }

    setIsBroadcasting(true);
    try {
      const payload = {
        title: annTitle,
        body: annBody,
        category: annCategory,
        target: annTarget,
        createdAt: Date.now(),
        actorEmail: 'victor.defreitas.pro@gmail.com'
      };

      const docRef = await addDoc(collection(db, 'system_announcements'), payload);
      
      const newAnn: Announcement = { id: docRef.id, ...payload };
      setAnnouncements(prev => [newAnn, ...prev]);
      
      // Reset inputs
      setAnnTitle('');
      setAnnBody('');
      showToast("Flash info diffusé à toute la plateforme !", "success");
      logAdminAction("BROADCAST_CREATE", `Alerte flash "${payload.title}" poussée à destination de: ${payload.target.toUpperCase()}`);
    } catch (err) {
      console.error("Error creating announcement:", err);
      showToast("Impossible de publier l'annonce", "error");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleDeleteAnnouncement = async (annId: string, title: string) => {
    try {
      await deleteDoc(doc(db, 'system_announcements', annId));
      setAnnouncements(prev => prev.filter(a => a.id !== annId));
      showToast("Flash info révoqué avec succès !", "success");
      logAdminAction("BROADCAST_DELETE", `Alerte flash supprimée de la diffusion : "${title}"`);
    } catch (err) {
      console.error("Error deleting announcement:", err);
      showToast("Impossible de supprimer le flash info", "error");
    }
  };

  // EDIT USER ACTIONS
  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserName(user.name || '');
    setEditUserEmail(user.email || '');
    setEditUserPhone(user.phone || '');
    setEditUserRole(user.role || 'member');
    setEditUserClubId(user.clubId || '');
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const userRef = doc(db, 'users', String(editingUser.id));
      const updates = {
        name: editUserName,
        email: editUserEmail,
        phone: editUserPhone,
        role: editUserRole,
        clubId: editUserClubId
      };

      await updateDoc(userRef, updates);

      // Locally update state list
      setAllUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...updates } : u));
      setEditingUser(null);
      showToast("Coordonnées de l'utilisateur ajustées avec succès !", "success");
      logAdminAction("USER_UPDATE", `Mise à jour des coordonnées pour "${updates.name}" (Rôle: ${updates.role.toUpperCase()})`);
      
      // Re-trigger owners computation
      fetchData();
    } catch (err) {
      console.error("Error saving user changes:", err);
      showToast("Échec lors de l'enregistrement", "error");
    }
  };

  const handleToggleUserSuspension = async (user: User) => {
    try {
      const newSuspendedState = !user.isSuspended;
      await updateDoc(doc(db, 'users', String(user.id)), { isSuspended: newSuspendedState });
      
      setAllUsers(prev => prev.map(u => u.id === user.id ? { ...u, isSuspended: newSuspendedState } : u));
      showToast(`Accès utilisateur ${newSuspendedState ? 'bloqué' : 'débloqué'}`, "success");
      logAdminAction("USER_SUSPEND_TOGGLE", `Le compte de "${user.name}" a été ${newSuspendedState ? 'SUSPENDU' : 'RÉACTIVÉ'}`);
    } catch (err) {
      console.error("Error toggling user status:", err);
      showToast("Erreur lors de la modification de statut", "error");
    }
  };

  // FILTRATIONS
  const filteredClubs = useMemo(() => {
    return clubs.filter(club => {
      const slugMatch = (club.name || '').toLowerCase().includes(clubSearchTerm.toLowerCase()) ||
                        (owners[club.id]?.name || '').toLowerCase().includes(clubSearchTerm.toLowerCase()) ||
                        (owners[club.id]?.email || '').toLowerCase().includes(clubSearchTerm.toLowerCase());
      if (!slugMatch) return false;
            
      if (clubFilterStatus === 'Actifs' && club.isActive === false) return false;
      if (clubFilterStatus === 'Inactifs' && club.isActive !== false) return false;
      if (clubFilterStatus === 'Basic' && club.plan !== 'basic') return false;
      if (clubFilterStatus === 'Classic' && club.plan !== 'classic') return false;
      if (clubFilterStatus === 'Premium' && club.plan !== 'premium') return false;
      
      return true;
    });
  }, [clubs, clubSearchTerm, clubFilterStatus, owners]);

  const filteredUsers = useMemo(() => {
    return allUsers.filter(user => {
      // search fields
      const txt = userSearchTerm.toLowerCase();
      const matchText = (user.name || '').toLowerCase().includes(txt) || 
                        (user.email || '').toLowerCase().includes(txt) ||
                        (user.phone || '').toLowerCase().includes(txt);
      if (!matchText) return false;

      // Role filter
      if (userFilterRole !== 'Tous') {
        if (userFilterRole === 'Super Admin' && user.role !== 'superadmin') return false;
        if (userFilterRole === 'Owner' && user.role !== 'owner') return false;
        if (userFilterRole === 'Coach' && user.role !== 'coach') return false;
        if (userFilterRole === 'Athlete' && user.role !== 'member') return false;
      }

      // Club filter
      if (userFilterClub !== 'Tous' && user.clubId !== userFilterClub) return false;

      return true;
    });
  }, [allUsers, userSearchTerm, userFilterRole, userFilterClub]);

  // Framer layouts
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 350, damping: 25 } }
  };

  // Loading spinner
  if (loading && clubs.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
        <Loader2 size={40} className="text-emerald-500 animate-spin mb-4" />
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Calculs & Synchronisation Cloud...</h3>
        <p className="text-xs text-slate-500 mt-2">Veuillez patienter pendant la récupération des configurations.</p>
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 md:p-8 max-w-7xl mx-auto space-y-8"
    >
      {/* 1. Header with beautiful display styling */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-zinc-200">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center shadow-md shrink-0">
            <Shield className="text-white" size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-zinc-950 tracking-tight">Console de Pilotage</h1>
              <span className="bg-emerald-500/10 text-emerald-800 text-[10px] uppercase font-black tracking-wider px-3 py-1 rounded-full border border-emerald-500/20">
                Super Admin
              </span>
            </div>
            <p className="text-zinc-500 text-sm mt-0.5">Velatra Global Platform Optimization Control System</p>
          </div>
        </div>

        {/* Global Key Platform metrics */}
        <div className="flex items-center gap-3 overflow-x-auto w-full lg:w-auto pb-1">
          <div className="bg-white/80 border border-zinc-200 px-4 py-3 rounded-2xl shadow-sm text-center min-w-[120px] backdrop-blur-md shrink-0">
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Clubs</div>
            <div className="text-2xl font-black text-zinc-900">{clubs.length}</div>
          </div>
          <div className="bg-white/80 border border-zinc-200 px-4 py-3 rounded-2xl shadow-sm text-center min-w-[120px] backdrop-blur-md shrink-0">
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Utilisateurs</div>
            <div className="text-2xl font-black text-zinc-900">{allUsers.length}</div>
          </div>
          <div className="bg-emerald-950 text-white border border-emerald-850 px-5 py-3 rounded-2xl shadow-md text-center min-w-[140px] shrink-0 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-8 h-8 bg-emerald-500/20 rounded-full blur-xl"></div>
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-0.5 flex items-center justify-center gap-1.5">
              <Coins size={12} />
              <span>MRR en cours</span>
            </div>
            <div className="text-2xl font-black text-emerald-300">{currentMRR} €<span className="text-[10px] text-zinc-400 font-medium lowercase">/mois</span></div>
          </div>
        </div>
      </motion.div>

      {/* 2. Top Navigation Tabs */}
      <motion.div variants={itemVariants} className="flex gap-1.5 p-1 bg-zinc-100 rounded-2xl w-full max-w-fit overflow-x-auto pb-1.5 md:pb-1">
        <button
          onClick={() => setActiveTab('clubs')}
          className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'clubs' 
              ? 'bg-white text-zinc-900 shadow-md' 
              : 'text-zinc-650 hover:text-zinc-900 hover:bg-white/50'
          }`}
        >
          <Building2 size={15} />
          <span>Clubs ({clubs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'analytics' 
              ? 'bg-white text-zinc-900 shadow-md' 
              : 'text-zinc-650 hover:text-zinc-900 hover:bg-white/50'
          }`}
        >
          <TrendingUp size={15} />
          <span>Analytiques SaaS</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'users' 
              ? 'bg-white text-zinc-900 shadow-md' 
              : 'text-zinc-650 hover:text-zinc-900 hover:bg-white/50'
          }`}
        >
          <Users size={15} />
          <span>Utilisateurs ({allUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'broadcast' 
              ? 'bg-white text-zinc-900 shadow-md' 
              : 'text-zinc-650 hover:text-zinc-900 hover:bg-white/50'
          }`}
        >
          <Megaphone size={15} />
          <span>Flash Info ({announcements.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'audit' 
              ? 'bg-white text-zinc-900 shadow-md' 
              : 'text-zinc-650 hover:text-zinc-900 hover:bg-white/50'
          }`}
        >
          <History size={15} />
          <span>Journal d'Audit</span>
        </button>
      </motion.div>

      {/* 3. Main Content Container switching depending on activeTab */}
      <AnimatePresence mode="wait">
        {activeTab === 'clubs' && (
          <motion.div
            key="clubs-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Quick configuration card */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white p-6 shadow-sm border border-zinc-200">
                <h3 className="text-lg font-black text-zinc-900 mb-4 flex items-center gap-2">
                  <Activity size={18} className="text-emerald-500" />
                  <span>Répartition des Formules</span>
                </h3>
                <div className="h-60 w-full flex items-center justify-center">
                  {planDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={planDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={85}
                          paddingAngle={6}
                          dataKey="value"
                        >
                          {planDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderRadius: '12px', color: '#18181b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-zinc-400 text-sm">Aucun club disponible pour dessiner la répartition.</div>
                  )}
                </div>
              </Card>

              <Card className="bg-white p-6 shadow-sm border border-zinc-200">
                <h3 className="text-lg font-black text-zinc-900 mb-4 flex items-center gap-2">
                  <Calendar size={18} className="text-emerald-500" />
                  <span>Nouveaux Clubs (6 derniers mois)</span>
                </h3>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={creationData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} />
                      <RechartsTooltip 
                        cursor={{ fill: '#f4f4f5' }}
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderRadius: '12px', color: '#18181b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="count" name="Inscriptions" fill="#14b8a6" radius={[6, 6, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </motion.div>

            {/* Controls Filters Row */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="text"
                  placeholder="Filtrer via le nom du club, du coach principal ou par email..."
                  value={clubSearchTerm}
                  onChange={(e) => setClubSearchTerm(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-2xl py-3.5 pl-12 pr-4 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-sm font-medium"
                />
              </div>

              {/* Action buttons */}
              <button 
                onClick={initializeOldClubs}
                className="bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-3.5 rounded-2xl font-black uppercase tracking-wider text-xs transition-all shadow-md shrink-0 flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} />
                <span>Corriger les données Clubs</span>
              </button>
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider pl-2 mr-1">Statuts :</span>
              {["Tous", "Actifs", "Inactifs", "Basic", "Classic", "Premium"].map(f => (
                <button
                  key={f}
                  onClick={() => setClubFilterStatus(f)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm cursor-pointer ${
                    clubFilterStatus === f 
                      ? 'bg-emerald-500 text-zinc-950 border border-emerald-500' 
                      : 'bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </motion.div>

            {/* List of Clubs inside sleek cards container */}
            <motion.div variants={containerVariants} className="grid grid-cols-1 gap-4">
              {filteredClubs.map(club => {
                const owner = owners[club.id];
                const isActive = club.isActive !== false;
                const clubMembersCount = allUsers.filter(u => u.clubId === club.id && u.role === 'member').length;
                const clubCoachesCount = allUsers.filter(u => u.clubId === club.id && (u.role === 'coach' || u.role === 'owner')).length;
                
                return (
                  <motion.div
                    key={club.id}
                    variants={itemVariants}
                    layout
                    className="group"
                  >
                    <Card className="bg-white p-6 border border-zinc-200 rounded-3xl flex flex-col xl:flex-row items-center justify-between gap-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                      {/* Suspended subtle stripe decoration */}
                      {!isActive && (
                        <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-red-500"></div>
                      )}

                      {/* Info part */}
                      <div className="flex flex-col md:flex-row items-center gap-6 flex-1 w-full">
                        <div className="relative group/logo w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          {club.logo ? (
                            <img src={club.logo} alt={club.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl font-black text-zinc-400 capitalize">{club.name.charAt(0)}</span>
                          )}
                          <label className="absolute inset-0 bg-zinc-900/60 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity cursor-pointer">
                            <span className="text-white text-[10px] font-black uppercase tracking-wider">Logo</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleLogoUpload(club.id, file);
                              }}
                            />
                          </label>
                        </div>

                        {/* Title, plans tags + descriptions */}
                        <div className="flex-1 text-center md:text-left space-y-1 w-full">
                          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                            <h3 className="text-xl font-black text-zinc-900">{club.name}</h3>
                            
                            {!isActive && (
                              <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-600 text-[9px] font-black border border-red-500/20 uppercase tracking-wider">
                                Suspendu
                              </span>
                            )}
                            {club.plan === 'premium' && (
                              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/10 to-amber-650/10 text-amber-600 text-[9px] font-black border border-amber-500/20 flex items-center gap-1 uppercase tracking-wider">
                                <Crown size={11} className="fill-amber-600" /> Premium
                              </span>
                            )}
                            {club.plan === 'classic' && (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[9px] font-black border border-emerald-500/20 flex items-center gap-1 uppercase tracking-wider">
                                Classic
                              </span>
                            )}
                            {(!club.plan || club.plan === 'basic') && (
                              <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500 text-[9px] font-black border border-zinc-200 flex items-center gap-1 uppercase tracking-wider">
                                Basic
                              </span>
                            )}
                          </div>

                          {/* Quick sub info stats counts */}
                          <div className="text-zinc-500 text-xs font-medium space-y-1.5 pt-1">
                            <p className="flex items-center justify-center md:justify-start gap-1">
                              <span className="text-zinc-400">Gérant :</span> 
                              <span className="text-zinc-800 font-bold">{owner?.name || 'Aucun gérant propriétaire pour le moment'}</span>
                              {owner?.email && <span className="text-zinc-400 text-[11px]">({owner.email})</span>}
                            </p>
                            
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 pt-1 text-zinc-400 text-[11px] font-black uppercase tracking-wider">
                              <span className="flex items-center gap-1 text-teal-600 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-100">
                                <Users size={12} /> {clubMembersCount} Athlètes
                              </span>
                              <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                                <Shield size={12} /> {clubCoachesCount} Coachs / Staff
                              </span>
                              <span className="text-zinc-400 flex items-center gap-1">
                                <Calendar size={12} /> Inscrit le: {club.createdAt ? new Date(club.createdAt).toLocaleDateString('fr-FR') : 'Date inconnue'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Controls Panel */}
                      <div className="flex flex-wrap items-center justify-center xl:justify-end gap-3 w-full xl:w-auto mt-4 xl:mt-0 border-t xl:border-t-0 border-zinc-100 pt-4 xl:pt-0">
                        {/* canAddStaff option */}
                        <div className="bg-zinc-50 border border-zinc-200 p-1 rounded-2xl flex shadow-inner">
                          <button
                            onClick={async () => {
                              const newStatus = !club.canAddStaff;
                              try {
                                await updateDoc(doc(db, 'clubs', club.id), { canAddStaff: newStatus });
                                setClubs(clubs.map(c => c.id === club.id ? { ...c, canAddStaff: newStatus } : c));
                                showToast(`Ajout de staff ${newStatus ? 'activé' : 'désactivé'} pour ce club`, "success");
                                logAdminAction("CLUB_STAFF_RULE_UPDATE", `Le club "${club.name}" a maintenant le recrutement d'entraîneurs configuré sur: ${newStatus ? 'AUTORISÉ' : 'DÉSAUTORISÉ'}`);
                              } catch (e) {
                                showToast("Erreur lors de la mise à jour", "error");
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                              club.canAddStaff 
                                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' 
                                : 'text-zinc-500 hover:text-zinc-900 bg-white border border-zinc-200'
                            }`}
                          >
                            <UserCheck size={12} />
                            <span>Staff {club.canAddStaff ? 'Autorisé' : 'Limité'}</span>
                          </button>
                        </div>

                        {/* Tier Selection tool */}
                        <div className="bg-zinc-100 border border-zinc-200 p-1 rounded-2xl flex items-center gap-1.5 shadow-inner">
                          <button
                            onClick={() => updatePlan(club.id, 'basic')}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                              (!club.plan || club.plan === 'basic') 
                                ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200' 
                                : 'text-zinc-500 hover:text-zinc-950'
                            }`}
                          >
                            Basic
                          </button>
                          <button
                            onClick={() => updatePlan(club.id, 'classic')}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-make uppercase tracking-wider transition-all cursor-pointer ${
                              club.plan === 'classic' 
                                ? 'bg-emerald-500 text-zinc-950 shadow-sm border border-emerald-500 font-bold' 
                                : 'text-zinc-500 hover:text-zinc-950'
                            }`}
                          >
                            Classic
                          </button>
                          <button
                            onClick={() => updatePlan(club.id, 'premium')}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                              club.plan === 'premium' 
                                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-950 shadow-sm border border-amber-400 font-bold' 
                                : 'text-zinc-500 hover:text-zinc-950'
                            }`}
                          >
                            <Crown size={12} />
                            <span>PRM</span>
                          </button>
                        </div>

                        {/* Actions buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleActive(club.id, isActive)}
                            className={`p-2.5 rounded-2xl transition-all shadow-sm border ${
                              isActive 
                                ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' 
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                            }`}
                            title={isActive ? "Mettre temporairement en sommeil / suspendre le club" : "Réveiller / activer le club"}
                          >
                            <Power size={16} />
                          </button>
                          
                          <button
                            onClick={() => deleteClubAndData(club.id)}
                            className="p-2.5 rounded-2xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-all shadow-sm"
                            title="Suppression irrémédiable de l'intégralité des données du club"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}

              {filteredClubs.length === 0 && (
                <div className="text-center py-16 text-zinc-500 bg-white rounded-3xl border border-zinc-200 shadow-sm">
                  <Activity size={32} className="mx-auto text-zinc-300 mb-2.5" />
                  <p className="font-extrabold uppercase text-xs tracking-wider">Aucune structure sportive listée</p>
                  <p className="text-xs text-zinc-400 mt-1">Ajustez votre chaîne de recherche et filtres de recherche.</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* ANALYTICS & REVENUE SIMULATOR TAB */}
        {activeTab === 'analytics' && (
          <motion.div
            key="analytics-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {/* SaaS Metrics cards row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-white p-6 border border-zinc-200">
                <div className="text-emerald-500 bg-emerald-50 w-10 h-10 rounded-xl flex items-center justify-center mb-4 border border-emerald-100">
                  <Coins size={20} />
                </div>
                <div className="text-zinc-500 text-xs font-black uppercase tracking-wider">MRR Actuel (SaaS)</div>
                <div className="text-3xl font-black text-zinc-900 mt-1">{currentMRR} €</div>
                <div className="text-[11px] text-zinc-400 mt-1">Revenu Récurrent Mensuel direct</div>
              </Card>

              <Card className="bg-white p-6 border border-zinc-200">
                <div className="text-teal-500 bg-teal-50 w-10 h-10 rounded-xl flex items-center justify-center mb-4 border border-teal-100">
                  <TrendingUp size={20} />
                </div>
                <div className="text-zinc-500 text-xs font-black uppercase tracking-wider">ARR Estimé</div>
                <div className="text-3xl font-black text-zinc-900 mt-1">{currentMRR * 12} €</div>
                <div className="text-[11px] text-teal-600 font-bold mt-1">Projection sur 1 an</div>
              </Card>

              <Card className="bg-white p-6 border border-zinc-200">
                <div className="text-indigo-500 bg-indigo-50 w-10 h-10 rounded-xl flex items-center justify-center mb-4 border border-indigo-150">
                  <Users size={20} />
                </div>
                <div className="text-zinc-500 text-xs font-black uppercase tracking-wider">Athlètes / Club</div>
                <div className="text-3xl font-black text-zinc-900 mt-1">
                  {clubs.length > 0 ? (allUsers.filter(u => u.role === 'member').length / clubs.length).toFixed(1) : '0'}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">Moyenne d'élites par formule active</div>
              </Card>

              <Card className="bg-white p-6 border border-zinc-200">
                <div className="text-amber-500 bg-amber-50 w-10 h-10 rounded-xl flex items-center justify-center mb-4 border border-amber-100">
                  <Crown size={20} />
                </div>
                <div className="text-zinc-500 text-xs font-black uppercase tracking-wider">Taux de Pénétration PRM</div>
                <div className="text-3xl font-black text-zinc-900 mt-1">
                  {clubs.length > 0 ? ((clubs.filter(c => c.plan === 'premium').length / clubs.length) * 100).toFixed(0) : '0'} %
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">Ratio de conversions premium</div>
              </Card>
            </div>

            {/* Interactive Projection Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Simulator Parameters panel */}
              <Card className="bg-zinc-900 text-white p-6 border border-zinc-800 rounded-3xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 mb-6">
                    <TrendingUp size={20} />
                    <h3 className="text-lg font-black uppercase tracking-wider text-white">Simulateur de Croissance</h3>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                    Configurez vos objectifs d'acquisitions et vos conversions d'abonnements pour projeter le potentiel d'évolution de la plateforme sur les 12 prochains mois.
                  </p>

                  <div className="space-y-6">
                    {/* Acquisition Rate Slider */}
                    <div>
                      <div className="flex justify-between text-xs font-black uppercase tracking-wide text-zinc-300 mb-2">
                        <span>Nouveaux clubs / mois</span>
                        <span className="text-emerald-400 font-extrabold">+{simAcquisitionRate} clubs</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="30" 
                        value={simAcquisitionRate} 
                        onChange={(e) => setSimAcquisitionRate(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>

                    {/* Classic Convert Rate Slider */}
                    <div>
                      <div className="flex justify-between text-xs font-black uppercase tracking-wide text-zinc-300 mb-2">
                        <span>Conversion Classic (49€)</span>
                        <span className="text-emerald-400 font-extrabold">{simClassicRate} %</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max={100 - simPremiumRate} 
                        value={simClassicRate} 
                        onChange={(e) => setSimClassicRate(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>

                    {/* Premium Convert Rate Slider */}
                    <div>
                      <div className="flex justify-between text-xs font-black uppercase tracking-wide text-zinc-300 mb-2">
                        <span>Conversion Premium (99€)</span>
                        <span className="text-emerald-400 font-extrabold">{simPremiumRate} %</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max={100 - simClassicRate} 
                        value={simPremiumRate} 
                        onChange={(e) => setSimPremiumRate(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-6 mt-6">
                  <div className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">MRR ciblé (Mois +12)</div>
                      <div className="text-2xl font-black text-emerald-400 mt-1">
                        {simulatedProjectionData[simulatedProjectionData.length - 1].mrr.toLocaleString()} €
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Clubs générés</div>
                      <div className="text-xl font-black text-white mt-1 text-right">
                        {simulatedProjectionData[simulatedProjectionData.length - 1].clubs}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Simulation Graph visual */}
              <Card className="bg-white p-6 border border-zinc-200 lg:col-span-2 rounded-3xl flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-black text-zinc-900 mb-1">Projection Financière (MRR) sur 1 an</h3>
                  <p className="text-xs text-zinc-500 mb-6">Simulation du volume d'affaires récurrent sur les prochains mois</p>
                </div>
                
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={simulatedProjectionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSimulationMRR" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} unit="€" />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderRadius: '12px', color: '#18181b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area type="monotone" name="Revenus mensuels" dataKey="mrr" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSimulationMRR)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex gap-4 items-center bg-zinc-50 p-3.5 rounded-2xl border border-zinc-150 mt-4 text-xs text-zinc-650 leading-normal">
                  <Info className="text-emerald-500 shrink-0" size={16} />
                  <span>
                    La simulation part sur une valeur de départ de <strong>{currentMRR} €</strong> de revenus mensuels. Les abonnements calculés intègrent la répartition Basic, Classic et Premium selon vos ratios.
                  </span>
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {/* USERS COMPREHENSIVE DIRECTORY TAB */}
        {activeTab === 'users' && (
          <motion.div
            key="users-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Quick action card: User filtering panel */}
            <Card className="bg-white p-6 border border-zinc-200 rounded-3xl space-y-4 shadow-sm">
              <div className="flex items-center gap-3 border-b border-zinc-100 pb-3">
                <Users size={18} className="text-emerald-500" />
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900">Moteur de recherche & d'administration des comptes</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input
                    type="text"
                    placeholder="Chercher par nom, email, téléphone..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 focus:bg-white rounded-xl py-2.5 pl-10 pr-4 text-xs text-zinc-900 outline-none focus:ring-1 focus:ring-emerald-500 transition-all placeholder-zinc-400 font-medium"
                  />
                </div>

                {/* Role filter */}
                <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-xl text-xs">
                  <span className="text-zinc-400 font-bold">Rôle :</span>
                  <select
                    value={userFilterRole}
                    onChange={(e) => setUserFilterRole(e.target.value)}
                    className="bg-transparent text-zinc-800 font-medium focus:outline-none flex-1 cursor-pointer"
                  >
                    <option value="Tous">Tous</option>
                    <option value="Super Admin">Super Admin</option>
                    <option value="Owner">Club Owner</option>
                    <option value="Coach">Coach / Staff</option>
                    <option value="Athlete">Athlète Élite</option>
                  </select>
                </div>

                {/* Association club filter */}
                <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-xl text-xs">
                  <span className="text-zinc-400 font-bold">Club :</span>
                  <select
                    value={userFilterClub}
                    onChange={(e) => setUserFilterClub(e.target.value)}
                    className="bg-transparent text-zinc-800 font-medium focus:outline-none flex-1 cursor-pointer"
                  >
                    <option value="Tous">Tous les clubs</option>
                    {clubs.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>

            {/* Structured Table for User Directory */}
            <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-150 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                      <th className="py-4 px-6">Identité / Status</th>
                      <th className="py-4 px-6">Coordonnées</th>
                      <th className="py-4 px-6">Rôle / Accompagnement</th>
                      <th className="py-4 px-6">Club affilié</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700">
                    {filteredUsers.map(user => {
                      const associatedClubName = clubs.find(c => c.id === user.clubId)?.name || 'Inconnu / Non relié';
                      
                      const roleStyles: Record<string, string> = {
                        superadmin: 'bg-indigo-50 border-indigo-200 text-indigo-700',
                        owner: 'bg-amber-50 border-amber-200 text-amber-700',
                        coach: 'bg-teal-50 border-teal-200 text-teal-700',
                        member: 'bg-zinc-100 border-zinc-200 text-zinc-600'
                      };

                      const roleLabels: Record<string, string> = {
                        superadmin: 'Super Admin',
                        owner: 'Owner Club',
                        coach: 'Coach Principal',
                        member: 'Athlète Élite'
                      };

                      return (
                        <tr key={user.id} className="hover:bg-zinc-50/50 transition-colors">
                          {/* identity */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0 font-extrabold text-zinc-500 uppercase tracking-tight shadow-inner">
                                {user.name ? user.name.charAt(0) : '?'}
                              </div>
                              <div>
                                <span className="font-extrabold text-zinc-900 block leading-tight">{user.name || 'Sans Nom'}</span>
                                <div className="flex gap-1.5 items-center mt-1">
                                  {user.isSuspended && (
                                    <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-[9px] font-black tracking-widest uppercase border border-red-100">
                                      Accès Suspendu
                                    </span>
                                  )}
                                  {!user.onboardingCompleted && (
                                    <span className="bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded text-[9px] font-bold border border-yellow-150 uppercase tracking-wider">
                                      En attente Onboarding
                                    </span>
                                  )}
                                  {user.onboardingCompleted && (
                                    <span className="text-emerald-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-0.5">
                                      <CheckCircle size={11} /> Actif
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* contact info */}
                          <td className="py-4 px-6 space-y-1 font-medium">
                            <div className="flex items-center gap-1.5 text-zinc-650">
                              <Mail size={12} className="text-zinc-400" />
                              <span className="font-semibold">{user.email || 'Email indisponible'}</span>
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-1.5 text-zinc-500">
                                <Phone size={12} className="text-zinc-400" />
                                <span>{user.phone}</span>
                              </div>
                            )}
                          </td>

                          {/* Role */}
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border tracking-wider inline-block ${roleStyles[user.role] || 'bg-zinc-100 border-zinc-200 text-zinc-500'}`}>
                              {roleLabels[user.role] || user.role}
                            </span>
                          </td>

                          {/* Associate Club */}
                          <td className="py-4 px-6 font-semibold text-zinc-800">
                            {associatedClubName}
                          </td>

                          {/* Action tools */}
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit details button */}
                              <button
                                onClick={() => handleOpenEditUser(user)}
                                className="p-2 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950 rounded-xl transition-all"
                                title="Modifier les droits ou les coordonnées de l'adhérent"
                              >
                                <Edit3 size={15} />
                              </button>

                              {/* Block toggle */}
                              <button
                                onClick={() => handleToggleUserSuspension(user)}
                                className={`p-2 rounded-xl transition-all ${
                                  user.isSuspended 
                                    ? 'bg-red-50 text-red-650 hover:bg-red-100' 
                                    : 'hover:bg-zinc-100 text-zinc-500 hover:text-red-500'
                                }`}
                                title={user.isSuspended ? "Rétablir l'accès de l'utilisateur" : "Bloquer l'accès utilisateur temporairement"}
                              >
                                <Power size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-zinc-400 font-black tracking-widest uppercase">
                          Aucun utilisateur trouvé
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* BROADCAST CENTER TAB */}
        {activeTab === 'broadcast' && (
          <motion.div
            key="broadcast-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Creation layout panel */}
            <Card className="bg-white p-6 border border-zinc-200 lg:col-span-1 rounded-3xl h-fit shadow-sm">
              <h3 className="text-lg font-black text-zinc-900 mb-1 flex items-center gap-2">
                <Megaphone className="text-emerald-500" size={18} />
                <span>Nouveau Flash Info</span>
              </h3>
              <p className="text-xs text-zinc-500 mb-6">Poussez une alerte instantanée visible sur les dashboards des adhérents et coachs</p>

              <form onSubmit={handlePublishAnnouncement} className="space-y-4">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Titre de la notification</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Maintenance technique planifiée"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 focus:bg-white rounded-xl px-3 py-2.5 text-xs text-zinc-900 outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                  />
                </div>

                {/* Body message content */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Message à diffuser</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Saisissez le contenu du communiqué..."
                    value={annBody}
                    onChange={(e) => setAnnBody(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 focus:bg-white rounded-xl px-3 py-2.5 text-xs text-zinc-900 outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  />
                </div>

                {/* Urgence category */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 font-black">Niveau d'urgence</label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-100 rounded-xl border border-zinc-200">
                    <button
                      type="button"
                      onClick={() => setAnnCategory('info')}
                      className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer ${
                        annCategory === 'info' ? 'bg-emerald-500 text-zinc-950 shadow-sm font-black' : 'text-zinc-500'
                      }`}
                    >
                      Info
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnnCategory('warning')}
                      className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer ${
                        annCategory === 'warning' ? 'bg-amber-500 text-zinc-900 shadow-sm font-black' : 'text-zinc-500'
                      }`}
                    >
                      Alerte
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnnCategory('critical')}
                      className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer ${
                        annCategory === 'critical' ? 'bg-red-500 text-white shadow-sm font-black' : 'text-zinc-500'
                      }`}
                    >
                      Panne
                    </button>
                  </div>
                </div>

                {/* Target Segment */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Cible de diffusion</label>
                  <select
                    value={annTarget}
                    onChange={(e: any) => setAnnTarget(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs text-zinc-850 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="all">Tous les utilisateurs plateforme</option>
                    <option value="coaches">Coaches & Staff uniquement</option>
                    <option value="members">Athlètes Élite uniquement</option>
                  </select>
                </div>

                {/* Trigger button */}
                <button
                  type="submit"
                  disabled={isBroadcasting}
                  className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 transition-colors py-3.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg disabled:opacity-50 shrink-0 flex items-center justify-center gap-2"
                >
                  {isBroadcasting ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Send size={13} />
                  )}
                  <span>Diffuser l'alerte flash</span>
                </button>
              </form>
            </Card>

            {/* Broadcast lists / histories and interactive previews */}
            <div className="lg:col-span-2 space-y-6">
              {/* Interactive Live preview card */}
              <Card className="bg-zinc-950 text-white p-6 border border-zinc-850 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
                
                <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
                  <Globe size={11} className="text-zinc-400" />
                  <span>Aperçu simulé en temps réel</span>
                </div>

                {/* Announcement element mockup */}
                <div className={`p-5 rounded-2xl border ${
                  annCategory === 'critical' 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : annCategory === 'warning' 
                      ? 'bg-amber-500/10 border-amber-500/30' 
                      : 'bg-emerald-500/10 border-emerald-500/30'
                }`}>
                  <div className="flex gap-3">
                    <div className="pt-0.5">
                      {annCategory === 'critical' ? (
                        <ShieldAlert size={18} className="text-red-500 animate-bounce" />
                      ) : annCategory === 'warning' ? (
                        <AlertTriangle size={18} className="text-amber-500" />
                      ) : (
                        <Info size={18} className="text-emerald-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm uppercase tracking-wide leading-tight">
                        {annTitle || 'Saisissez le titre de votre flash info...'}
                      </h4>
                      <p className="text-zinc-300 text-xs mt-1.5 whitespace-pre-wrap leading-relaxed font-medium">
                        {annBody || 'Le corps du texte de votre notification apparaîtra ici. Indiquez les consignes, les détails nécessaires ou les résolutions d\'écarts d\'usage de manière claire.'}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-3 mt-4 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                        <span className="bg-black/50 px-2 py-0.5 rounded-lg border border-white/5">
                          Audience: {annTarget === 'all' ? 'TOUS' : annTarget === 'coaches' ? 'COACHS' : 'ATHLETES'}
                        </span>
                        <span>Diffusé à l'instant • Par Super Admin</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Announcements list history */}
              <Card className="bg-white p-6 border border-zinc-200 rounded-3xl shadow-sm">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <History size={16} className="text-zinc-500" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900">Notifications actuellement en diffusion ({announcements.length})</h3>
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {announcements.map(ann => {
                    const colorClasses: Record<string, string> = {
                      critical: 'border-red-250 bg-red-50 text-red-950',
                      warning: 'border-amber-250 bg-amber-50 text-amber-950',
                      info: 'border-zinc-200 bg-zinc-50 text-zinc-900'
                    };

                    return (
                      <div key={ann.id} className={`p-4 rounded-2xl border text-xs flex justify-between gap-4 items-start ${colorClasses[ann.category] || 'bg-zinc-50 border-zinc-200'}`}>
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-extrabold text-xs uppercase tracking-wide">{ann.title}</span>
                            <span className="text-[9px] font-black uppercase bg-black/5 border border-black/10 px-1.5 py-0.5 rounded">
                              Type: {ann.category}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {new Date(ann.createdAt).toLocaleString('fr-FR')}
                            </span>
                          </div>
                          <p className="text-zinc-650 font-medium whitespace-pre-wrap leading-relaxed">{ann.body}</p>
                          <div className="text-[10px] font-bold text-zinc-400 uppercase mt-2.5">
                            Cible: {ann.target === 'all' ? 'Tous les clubs' : ann.target === 'coaches' ? 'Coachs uniquement' : 'Membres uniquement'}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleDeleteAnnouncement(ann.id, ann.title)}
                          className="text-zinc-400 hover:text-red-500 p-1.5 hover:bg-black/5 rounded-lg transition-all shrink-0"
                          title="Supprimer définitivement l'annonce"
                        >
                          <XCircle size={15} />
                        </button>
                      </div>
                    );
                  })}

                  {announcements.length === 0 && (
                    <div className="text-center py-8 text-zinc-400 text-xs font-black uppercase tracking-widest">
                      Aucun flash info actif en diffusion
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {/* SECURITY & AUDIT TRAIL TIMELINE TAB */}
        {activeTab === 'audit' && (
          <motion.div
            key="audit-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <Card className="bg-white p-6 border border-zinc-200 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-150 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-black text-zinc-900 flex items-center gap-2">
                    <History className="text-emerald-500" size={20} />
                    <span>Journal de traçabilité d'Audit</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Registre complet, daté et immuable des actions d'administration exécutées</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      fetchData();
                      showToast("Registre synchronisé avec succès", "success");
                    }}
                    className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[10px] font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl border border-zinc-200 shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    <span>Actualiser</span>
                  </button>
                </div>
              </div>

              {/* Timeline container */}
              <div className="relative border-l border-zinc-200 ml-3 pl-6 space-y-6 max-h-[500px] overflow-y-auto pr-2">
                {auditLogs.map((log) => {
                  let badgeColor = 'bg-zinc-100 text-zinc-700 border-zinc-200';
                  if (log.actionType.includes("CREATE")) badgeColor = 'bg-teal-50 text-teal-700 border-teal-200';
                  if (log.actionType.includes("PLAN")) badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                  if (log.actionType.includes("SUSPEND")) badgeColor = 'bg-red-50 text-red-700 border-red-200';
                  if (log.actionType.includes("DELETE")) badgeColor = 'bg-red-50 text-red-800 border-red-300';
                  if (log.actionType.includes("UPDATE")) badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';

                  return (
                    <div key={log.id} className="relative group">
                      {/* Timeline Dot Indicator */}
                      <span className="absolute -left-[31px] top-1.5 bg-white border border-zinc-300 rounded-full w-3.5 h-3.5 group-hover:border-emerald-500 transition-colors z-10 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 group-hover:bg-emerald-500 transition-colors"></span>
                      </span>

                      <div>
                        {/* Action type + actor + date */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${badgeColor}`}>
                            {log.actionType}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-extrabold">• Par {log.actorEmail}</span>
                          <span className="text-[10px] text-zinc-400 font-medium">
                            {new Date(log.timestamp).toLocaleString('fr-FR')}
                          </span>
                        </div>
                        {/* Details content Description */}
                        <p className="text-zinc-850 font-bold text-xs mt-1 px-1">{log.details}</p>
                      </div>
                    </div>
                  );
                })}

                {auditLogs.length === 0 && (
                  <div className="text-center py-12 text-zinc-400 text-xs font-black uppercase tracking-widest pl-0 ml-[-24px]">
                    Aucune entrée consignée dans le registre pour le moment
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. MODALS & SUB DIALOG PORTALS */}
      {/* 4a. Edit User Modal */}
      {editingUser && createPortal(
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[101] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-zinc-150"
          >
            {/* Header edit user */}
            <div className="flex items-center gap-2 mb-4 border-b border-zinc-100 pb-3">
              <ShieldAlert size={20} className="text-indigo-600" />
              <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Privilèges & Coordonnées Membre</h3>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Nom complet</label>
                  <input
                    type="text"
                    required
                    value={editUserName}
                    onChange={(e) => setEditUserName(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-950 font-bold focus:outline-none"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Email de liaison</label>
                  <input
                    type="email"
                    required
                    value={editUserEmail}
                    onChange={(e) => setEditUserEmail(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-950 font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Telephone */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Téléphone</label>
                  <input
                    type="text"
                    value={editUserPhone}
                    onChange={(e) => setEditUserPhone(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-950 font-bold focus:outline-none"
                  />
                </div>

                {/* Role dropdown */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Habilitation de compte</label>
                  <select
                    value={editUserRole}
                    onChange={(e: any) => setEditUserRole(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-950 font-black uppercase tracking-wider focus:outline-none cursor-pointer"
                  >
                    <option value="member">Athlète Élite</option>
                    <option value="coach">Coach / Staff</option>
                    <option value="owner">Club Owner</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              </div>

              {/* Club association dropdown selector */}
              <div className="space-y-1 pb-4">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-bold">Rattachement à un club</label>
                <select
                  value={editUserClubId}
                  onChange={(e) => setEditUserClubId(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-950 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="">-- Aucun Club / Isolation --</option>
                  {clubs.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Actions submit */}
              <div className="flex gap-3 border-t border-zinc-100 pt-4 mt-6">
                <button 
                  type="button" 
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer" 
                  onClick={() => setEditingUser(null)}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-md shadow-indigo-100 cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

      {/* 4b. Confirm Delete Club Modal (Existing) */}
      {confirmDeleteClubId && createPortal(
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-zinc-150"
          >
            <div className="flex items-center gap-2 mb-2 text-red-600">
              <ShieldAlert size={22} className="animate-pulse" />
              <h3 className="text-xl font-black uppercase tracking-wider leading-none">Alerte de Sécurité</h3>
            </div>
            
            <p className="text-zinc-650 text-xs font-medium leading-relaxed mb-6">
              Êtes-vous absolument certain de vouloir supprimer définitivement ce club ainsi que <strong>TOUTES ses collections synchrones</strong> (membres, entraînements, historiques d'activités, drives de documents, messageries...) ?
              <br /><br />
              <span className="text-red-650 font-bold bg-red-50 text-[10px] uppercase font-black px-2 py-1.5 rounded-lg border border-red-100 shadow-inner inline-block mt-2">
                ⚠️ action irrémédiable et définitive !
              </span>
            </p>

            <div className="flex gap-3">
              <button 
                className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer" 
                onClick={() => setConfirmDeleteClubId(null)}
              >
                Annuler
              </button>
              <button 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-md shadow-red-100 cursor-pointer animate-pulse" 
                onClick={confirmDelete}
              >
                Supprimer
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </motion.div>
  );
};
