import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Club, User } from '../types';
import { Card } from '../components/UI';
import { Shield, CheckCircle, XCircle, Search, Activity, Crown, Power, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminDashboardProps {
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ showToast }) => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [owners, setOwners] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Tous');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const clubsSnap = await getDocs(collection(db, 'clubs'));
      const clubsData = clubsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Club));
      setClubs(clubsData);

      const usersSnap = await getDocs(collection(db, 'users'));
      const usersData = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as User));
      
      const ownersMap: Record<string, User> = {};
      usersData.forEach(user => {
        if (user.role === 'owner') {
          ownersMap[user.clubId] = user;
        }
      });
      setOwners(ownersMap);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      showToast("Erreur lors du chargement des données", "error");
    } finally {
      setLoading(false);
    }
  };

  const updatePlan = async (clubId: string, newPlan: 'basic' | 'classic' | 'premium') => {
    try {
      await updateDoc(doc(db, 'clubs', clubId), { plan: newPlan });
      setClubs(clubs.map(c => c.id === clubId ? { ...c, plan: newPlan } : c));
      showToast(`Formule mise à jour : ${newPlan}`, "success");
    } catch (error) {
      console.error("Error updating plan:", error);
      showToast("Erreur lors de la mise à jour", "error");
    }
  };

  const toggleActive = async (clubId: string, currentStatus: boolean) => {
    try {
      // Default to true if undefined, so toggling undefined means setting to false
      const newStatus = currentStatus === undefined ? false : !currentStatus;
      await updateDoc(doc(db, 'clubs', clubId), { isActive: newStatus });
      setClubs(clubs.map(c => c.id === clubId ? { ...c, isActive: newStatus } : c));
      showToast(`Compte ${newStatus ? 'réactivé' : 'suspendu'}`, "success");
    } catch (error) {
      console.error("Error updating active status:", error);
      showToast("Erreur lors de la mise à jour", "error");
    }
  };

  const deleteClubAndData = async (clubId: string) => {
    if (!confirm("⚠️ ATTENTION ⚠️\n\nÊtes-vous sûr de vouloir supprimer ce club et TOUTES ses données (membres, programmes, messages, etc.) ?\n\nCette action est DÉFINITIVE et IRRÉVERSIBLE.")) return;
    
    setLoading(true);
    try {
      showToast("Suppression des données en cours...", "success");
      
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

      // Delete the club itself
      await deleteDoc(doc(db, "clubs", clubId));
      
      setClubs(clubs.filter(c => c.id !== clubId));
      showToast("Le club et toutes ses données ont été supprimés", "success");
    } catch (error) {
      console.error("Error deleting club:", error);
      showToast("Erreur lors de la suppression", "error");
    } finally {
      setLoading(false);
    }
  };

  const initializeOldClubs = async () => {
    try {
      showToast("Initialisation en cours...", "success");
      const updatedClubs = [...clubs];
      for (const club of updatedClubs) {
        if (!club.plan || club.isActive === undefined) {
          const updates: any = {};
          if (!club.plan) updates.plan = 'basic';
          if (club.isActive === undefined) updates.isActive = true;
          
          await updateDoc(doc(db, 'clubs', club.id), updates);
          club.plan = club.plan || 'basic';
          club.isActive = club.isActive ?? true;
        }
      }
      setClubs(updatedClubs);
      showToast("Tous les clubs ont été mis à jour !", "success");
    } catch (error) {
      console.error("Error initializing clubs:", error);
      showToast("Erreur lors de l'initialisation", "error");
    }
  };

  const filteredClubs = clubs.filter(club => {
    if (!((club.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (owners[club.id]?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          owners[club.id]?.email?.toLowerCase().includes(searchTerm.toLowerCase()))) return false;
          
    if (filterStatus === 'Actifs' && club.isActive === false) return false;
    if (filterStatus === 'Inactifs' && club.isActive !== false) return false;
    if (filterStatus === 'Basic' && club.plan !== 'basic') return false;
    if (filterStatus === 'Classic' && club.plan !== 'classic') return false;
    if (filterStatus === 'Premium' && club.plan !== 'premium') return false;
    
    return true;
  });

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: any = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white/40 backdrop-blur-xl flex items-center justify-center">
        <div className="animate-spin text-velatra-accent">
          <Activity size={32} />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 max-w-7xl mx-auto space-y-8"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-velatra-accent/10 rounded-2xl flex items-center justify-center shadow-inner backdrop-blur-md">
            <Shield className="text-velatra-accent" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Super Admin</h1>
            <p className="text-zinc-500">Gestion des clubs et abonnements</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-white/60 backdrop-blur-xl border border-zinc-200/50 rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm">
            <span className="text-zinc-500 text-sm">Total Clubs:</span>
            <span className="text-zinc-900 font-bold">{clubs.length}</span>
          </div>
          <div className="bg-velatra-accent/10 backdrop-blur-xl border border-velatra-accent/20 rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm">
            <span className="text-velatra-accent/70 text-sm">Premium:</span>
            <span className="text-velatra-accent font-bold">{clubs.filter(c => c.plan === 'premium').length}</span>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
            <input
              type="text"
              placeholder="Rechercher un club, un coach ou un email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/60 backdrop-blur-xl border border-zinc-200/50 rounded-2xl py-4 pl-12 pr-4 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-velatra-accent/50 transition-all shadow-sm focus:bg-white"
            />
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={initializeOldClubs}
            className="bg-white/60 backdrop-blur-xl hover:bg-white border border-zinc-200/50 text-zinc-900 px-6 py-4 rounded-2xl font-medium transition-all shadow-sm"
          >
            Initialiser les anciens clubs
          </motion.button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {["Tous", "Actifs", "Inactifs", "Basic", "Classic", "Premium"].map(f => (
            <motion.button
              key={f}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilterStatus(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors shadow-sm ${filterStatus === f ? 'bg-velatra-accent text-white shadow-velatra-accent/20' : 'bg-white/60 backdrop-blur-xl border border-zinc-200/50 text-zinc-500 hover:text-zinc-900 hover:bg-white'}`}
            >
              {f}
            </motion.button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={containerVariants} className="grid grid-cols-1 gap-4">
        <AnimatePresence>
          {filteredClubs.map(club => {
            const owner = owners[club.id];
            const isActive = club.isActive !== false; // Default to true
            
            return (
              <motion.div
                key={club.id}
                variants={itemVariants}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="bg-white/60 backdrop-blur-xl border-zinc-200/50 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-6 flex-1">
                    <div className="w-16 h-16 rounded-2xl bg-white/80 border border-zinc-200/50 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                      {club.logo ? (
                        <img src={club.logo} alt={club.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-zinc-400">{club.name.charAt(0)}</span>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-bold text-zinc-900">{club.name}</h3>
                        {!isActive && (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-xs font-medium border border-red-500/20 backdrop-blur-md">
                            Suspendu
                          </span>
                        )}
                        {club.plan === 'premium' && (
                          <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-200/20 to-yellow-400/20 text-yellow-500 text-xs font-medium border border-yellow-400/20 flex items-center gap-1 backdrop-blur-md">
                            <Crown size={12} /> Premium
                          </span>
                        )}
                        {club.plan === 'classic' && (
                          <span className="px-2 py-0.5 rounded-full bg-velatra-accent/10 text-velatra-accent text-xs font-medium border border-velatra-accent/20 flex items-center gap-1 backdrop-blur-md">
                            Classic
                          </span>
                        )}
                        {(!club.plan || club.plan === 'basic') && (
                          <span className="px-2 py-0.5 rounded-full bg-zinc-100/50 text-zinc-600 text-xs font-medium border border-zinc-200/50 flex items-center gap-1 backdrop-blur-md">
                            Basic
                          </span>
                        )}
                      </div>
                      <div className="text-zinc-500 text-sm space-y-1">
                        <p>Coach: <span className="text-zinc-900 font-medium">{owner?.name || 'Inconnu'}</span></p>
                        <p>Email: <span className="text-zinc-900 font-medium">{owner?.email || 'Non renseigné'}</span></p>
                        <p>Créé le: <span className="text-zinc-900 font-medium">{new Date(club.createdAt).toLocaleDateString('fr-FR')}</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto flex-wrap justify-end">
                    <div className="flex items-center gap-2 bg-white/40 backdrop-blur-md border border-zinc-200/50 p-1 rounded-xl shadow-inner">
                      <button
                        onClick={() => updatePlan(club.id, 'basic')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          (!club.plan || club.plan === 'basic') ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
                        }`}
                      >
                        Basic
                      </button>
                      <button
                        onClick={() => updatePlan(club.id, 'classic')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          club.plan === 'classic' ? 'bg-velatra-accent text-white shadow-sm shadow-velatra-accent/20' : 'text-zinc-500 hover:text-zinc-900'
                        }`}
                      >
                        Classic
                      </button>
                      <button
                        onClick={() => updatePlan(club.id, 'premium')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                          club.plan === 'premium' ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-sm shadow-yellow-500/20' : 'text-zinc-500 hover:text-zinc-900'
                        }`}
                      >
                        <Crown size={14} />
                        Premium
                      </button>
                    </div>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleActive(club.id, isActive)}
                      className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all shadow-sm backdrop-blur-md ${
                        isActive 
                          ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/20' 
                          : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20'
                      }`}
                    >
                      <Power size={18} />
                      {isActive ? 'Suspendre' : 'Réactiver'}
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => deleteClubAndData(club.id)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/20 shadow-sm backdrop-blur-md"
                      title="Supprimer le club et toutes ses données"
                    >
                      <Trash2 size={18} />
                      Supprimer
                    </motion.button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredClubs.length === 0 && (
          <motion.div variants={itemVariants} className="text-center py-12 text-zinc-500 bg-white/40 backdrop-blur-md rounded-3xl border border-zinc-200/50">
            Aucun club trouvé pour cette recherche.
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};
