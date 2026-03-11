import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Club, User } from '../types';
import { Card } from '../components/UI';
import { Shield, CheckCircle, XCircle, Search, Activity, Crown, Power } from 'lucide-react';

interface AdminDashboardProps {
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ showToast }) => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [owners, setOwners] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredClubs = clubs.filter(club => 
    club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    owners[club.id]?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    owners[club.id]?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin text-velatra-accent">
          <Activity size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-velatra-accent/10 rounded-2xl flex items-center justify-center">
            <Shield className="text-velatra-accent" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Super Admin</h1>
            <p className="text-white/50">Gestion des clubs et abonnements</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-white/50 text-sm">Total Clubs:</span>
            <span className="text-white font-bold">{clubs.length}</span>
          </div>
          <div className="bg-velatra-accent/10 border border-velatra-accent/20 rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-velatra-accent/70 text-sm">Premium:</span>
            <span className="text-velatra-accent font-bold">{clubs.filter(c => c.plan === 'premium').length}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
          <input
            type="text"
            placeholder="Rechercher un club, un coach ou un email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-velatra-accent/50 transition-all"
          />
        </div>
        <button 
          onClick={initializeOldClubs}
          className="bg-white/10 hover:bg-white/20 text-white px-6 py-4 rounded-2xl font-medium transition-all"
        >
          Initialiser les anciens clubs
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredClubs.map(club => {
          const owner = owners[club.id];
          const isActive = club.isActive !== false; // Default to true
          
          return (
            <Card key={club.id} className="bg-white/5 border-white/10 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6 flex-1">
                <div className="w-16 h-16 rounded-2xl bg-black border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                  {club.logo ? (
                    <img src={club.logo} alt={club.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-white/30">{club.name.charAt(0)}</span>
                  )}
                </div>
                
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold text-white">{club.name}</h3>
                    {!isActive && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/20">
                        Suspendu
                      </span>
                    )}
                    {club.plan === 'premium' && (
                      <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-200/20 to-yellow-400/20 text-yellow-400 text-xs font-medium border border-yellow-400/20 flex items-center gap-1">
                        <Crown size={12} /> Premium
                      </span>
                    )}
                    {club.plan === 'classic' && (
                      <span className="px-2 py-0.5 rounded-full bg-velatra-accent/20 text-velatra-accent text-xs font-medium border border-velatra-accent/20 flex items-center gap-1">
                        Classic
                      </span>
                    )}
                    {(!club.plan || club.plan === 'basic') && (
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-xs font-medium border border-white/10 flex items-center gap-1">
                        Basic
                      </span>
                    )}
                  </div>
                  <div className="text-white/50 text-sm space-y-1">
                    <p>Coach: <span className="text-white/80">{owner?.name || 'Inconnu'}</span></p>
                    <p>Email: <span className="text-white/80">{owner?.email || 'Non renseigné'}</span></p>
                    <p>Créé le: <span className="text-white/80">{new Date(club.createdAt).toLocaleDateString('fr-FR')}</span></p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto flex-wrap justify-end">
                <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl">
                  <button
                    onClick={() => updatePlan(club.id, 'basic')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      (!club.plan || club.plan === 'basic') ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Basic
                  </button>
                  <button
                    onClick={() => updatePlan(club.id, 'classic')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      club.plan === 'classic' ? 'bg-velatra-accent text-black' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Classic
                  </button>
                  <button
                    onClick={() => updatePlan(club.id, 'premium')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      club.plan === 'premium' ? 'bg-gradient-to-r from-amber-200 to-yellow-400 text-black' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    <Crown size={14} />
                    Premium
                  </button>
                </div>
                
                <button
                  onClick={() => toggleActive(club.id, isActive)}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                    isActive 
                      ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20' 
                      : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20'
                  }`}
                >
                  <Power size={18} />
                  {isActive ? 'Suspendre' : 'Réactiver'}
                </button>
              </div>
            </Card>
          );
        })}

        {filteredClubs.length === 0 && (
          <div className="text-center py-12 text-white/50">
            Aucun club trouvé pour cette recherche.
          </div>
        )}
      </div>
    </div>
  );
};
