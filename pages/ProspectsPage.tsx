import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AppState, Prospect, User } from '../types';
import { db, doc, updateDoc, setDoc, deleteDoc, secondaryAuth, createUserWithEmailAndPassword, collection, query, where, getDocs } from '../firebase';
import { Plus, Search, Trash2, Mail, Phone, Clock, CheckCircle, XCircle, UserPlus, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, Button } from '../components/UI';

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const COLUMNS = [
  { id: 'lead', title: 'Nouveau Lead', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'contacted', title: 'Contacté', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { id: 'trial', title: 'Séance d\'essai', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { id: 'won', title: 'Abonné', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { id: 'lost', title: 'Perdu', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
];

export const ProspectsPage: React.FC<Props> = ({ state, setState, showToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Tous');
  const [isAdding, setIsAdding] = useState(false);
  const [newProspect, setNewProspect] = useState({ name: '', email: '', phone: '', notes: '' });
  const [convertingProspect, setConvertingProspect] = useState<any>(null);
  const [convertData, setConvertData] = useState({ email: '', password: '' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const filteredProspects = state.prospects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const visibleColumns = filterStatus === 'Tous' ? COLUMNS : COLUMNS.filter(c => c.id === filterStatus);

  const handleStatusChange = async (prospectId: number, newStatus: string) => {
    try {
      const prospect = state.prospects.find(p => p.id === prospectId);
      if (!prospect || !prospect.firebaseUid) return;
      
      const docId = prospect.firebaseUid;

      if (newStatus === 'won' && state.user?.clubId) {
        setConvertingProspect(prospect);
        setConvertData({ email: prospect.email || '', password: '' });
      } else {
        await updateDoc(doc(db, "prospects", docId), { status: newStatus });
      }
    } catch (err) {
      console.error("Error updating prospect status", err);
    }
  };

  const confirmConversion = async () => {
    if (!convertingProspect || !convertData.email || !convertData.password) {
      showToast("Email et mot de passe requis", "error");
      return;
    }

    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, convertData.email, convertData.password);
      const firebaseUid = userCredential.user.uid;

      const newUserId = Date.now();
      const newUser: User = {
        id: newUserId,
        clubId: state.user!.clubId,
        code: "",
        pwd: "",
        name: convertingProspect.name || 'Sans nom',
        email: convertData.email,
        phone: convertingProspect.phone || '',
        role: 'member',
        avatar: convertingProspect.name ? convertingProspect.name.substring(0, 2).toUpperCase() : 'U',
        gender: 'M',
        age: 30,
        weight: 70,
        height: 175,
        objectifs: [],
        notes: convertingProspect.notes || '',
        createdAt: new Date().toISOString(),
        xp: 0,
        streak: 0,
        pointsFidelite: 0,
        firebaseUid: firebaseUid
      };
      
      // Create user document
      await setDoc(doc(db, "users", firebaseUid), newUser);
      // Update prospect status
      await updateDoc(doc(db, "prospects", convertingProspect.firebaseUid), { status: 'won' });
      
      setConvertingProspect(null);
      showToast(`Membre créé avec succès !`, "success");
      // Redirect to members page and select the new member
      setState(prev => ({ ...prev, page: 'users', selectedMember: newUser }));
    } catch (err: any) {
      console.error("Error converting prospect", err);
      showToast(err.message || "Erreur lors de la conversion", "error");
    }
  };

  const handleAddProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.user?.clubId) return;
    
    const id = Date.now();
    const prospect: Prospect = {
      id,
      clubId: state.user.clubId,
      name: newProspect.name,
      email: newProspect.email,
      phone: newProspect.phone,
      date: new Date().toISOString(),
      status: 'lead',
      answers: {},
      notes: newProspect.notes
    };

    try {
      await setDoc(doc(db, "prospects", id.toString()), prospect);
      setIsAdding(false);
      setNewProspect({ name: '', email: '', phone: '', notes: '' });
      showToast("Prospect ajouté avec succès", "success");
    } catch (err) {
      console.error("Error adding prospect", err);
      showToast("Erreur lors de l'ajout", "error");
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    const prospect = state.prospects.find(p => p.id === confirmDeleteId);
    if (!prospect || !prospect.firebaseUid) return;

    try {
      await deleteDoc(doc(db, "prospects", prospect.firebaseUid));
      showToast("Prospect supprimé", "success");
    } catch (err) {
      console.error("Error deleting prospect", err);
      showToast("Erreur lors de la suppression", "error");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, prospectId: number) => {
    e.dataTransfer.setData('prospectId', prospectId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const prospectId = parseInt(e.dataTransfer.getData('prospectId'));
    if (!isNaN(prospectId)) {
      handleStatusChange(prospectId, newStatus);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 page-transition">
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-zinc-900">Pipeline Commercial</h1>
            <p className="text-zinc-500 mt-1">Gérez vos prospects et convertissez-les en membres.</p>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={() => setIsAdding(true)}
              className="bg-velatra-accent hover:bg-velatra-accentDark text-zinc-900 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Lead</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-900" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-50 border  rounded-2xl py-3 pl-14 pr-4 text-zinc-900 font-bold focus:outline-none focus:border-velatra-accent transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
            <button 
              onClick={() => setFilterStatus("Tous")} 
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${filterStatus === "Tous" ? 'bg-velatra-accent text-zinc-900' : 'bg-zinc-50 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
            >
              Tous
            </button>
            
            <div className="relative">
              <select 
                className={`appearance-none px-4 py-2 pr-8 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer outline-none ${filterStatus !== "Tous" ? 'bg-velatra-accent text-zinc-900' : 'bg-zinc-50 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="Tous">Statut</option>
                {COLUMNS.map(c => (
                  <option key={c.id} value={c.id} className="bg-zinc-50 text-zinc-900">{c.title}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {createPortal(
      <>
      {convertingProspect && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-md z-[600] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-md !p-8  relative shadow-2xl">
            <button onClick={() => setConvertingProspect(null)} className="absolute top-6 right-6 text-zinc-900/40 hover:text-zinc-900">
              <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-2xl font-black mb-1 uppercase italic">Convertir en membre</h2>
            <p className="text-[10px] text-velatra-accent font-black uppercase tracking-widest mb-8">Créer le profil de {convertingProspect.name}</p>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Email</label>
                <input 
                  type="email"
                  value={convertData.email}
                  onChange={e => setConvertData({...convertData, email: e.target.value})}
                  className="w-full bg-zinc-50 border  rounded-xl py-3 px-4 text-zinc-900 font-bold focus:outline-none focus:border-velatra-accent transition-colors"
                  placeholder="jean@email.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Mot de passe provisoire</label>
                <input 
                  type="text"
                  value={convertData.password}
                  onChange={e => setConvertData({...convertData, password: e.target.value})}
                  className="w-full bg-zinc-50 border  rounded-xl py-3 px-4 text-zinc-900 font-bold focus:outline-none focus:border-velatra-accent transition-colors"
                  placeholder="Ex: velatra2026"
                />
              </div>
              <button 
                onClick={confirmConversion}
                className="w-full bg-velatra-accent hover:bg-velatra-accentDark text-zinc-900 font-black italic rounded-xl py-4 mt-4 transition-colors uppercase tracking-widest text-xs"
              >
                Créer le membre
              </button>
            </div>
          </Card>
        </div>
      )}
      </>,
      document.body
      )}

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-velatra-bgCard border  rounded-xl p-6"
        >
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">Ajouter un Prospect</h2>
          <form onSubmit={handleAddProspect} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-500 mb-1">Nom complet</label>
              <input required type="text" value={newProspect.name} onChange={e => setNewProspect({...newProspect, name: e.target.value})} className="w-full bg-velatra-bg border  rounded-lg p-2 text-zinc-900" />
            </div>
            <div>
              <label className="block text-sm text-zinc-500 mb-1">Email</label>
              <input type="email" value={newProspect.email} onChange={e => setNewProspect({...newProspect, email: e.target.value})} className="w-full bg-velatra-bg border  rounded-lg p-2 text-zinc-900" />
            </div>
            <div>
              <label className="block text-sm text-zinc-500 mb-1">Téléphone</label>
              <input type="tel" value={newProspect.phone} onChange={e => setNewProspect({...newProspect, phone: e.target.value})} className="w-full bg-velatra-bg border  rounded-lg p-2 text-zinc-900" />
            </div>
            <div>
              <label className="block text-sm text-zinc-500 mb-1">Notes / Objectifs</label>
              <input type="text" value={newProspect.notes} onChange={e => setNewProspect({...newProspect, notes: e.target.value})} className="w-full bg-velatra-bg border  rounded-lg p-2 text-zinc-900" />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-zinc-500 hover:text-zinc-900 transition-colors">Annuler</button>
              <button type="submit" className="bg-velatra-accent text-zinc-900 px-6 py-2 rounded-lg font-medium hover:bg-velatra-accentDark transition-colors">Enregistrer</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
        {COLUMNS.map(col => {
          const colProspects = filteredProspects.filter(p => p.status === col.id);
          
          return (
            <div 
              key={col.id} 
              className="flex-none w-80 bg-velatra-bgCard/50 border  rounded-xl flex flex-col snap-center"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className={`p-3 border-b  flex justify-between items-center rounded-t-xl ${col.color.split(' ')[0]}`}>
                <h3 className={`font-semibold ${col.color.split(' ')[1]}`}>{col.title}</h3>
                <span className="bg-zinc-50 px-2 py-0.5 rounded-full text-xs font-medium">{colProspects.length}</span>
              </div>
              
              <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[500px]">
                {colProspects.map(prospect => (
                  <div 
                    key={prospect.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, prospect.id)}
                    className="bg-velatra-bg border  rounded-lg p-4 cursor-grab active:cursor-grabbing hover:border-velatra-textMuted transition-colors group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-zinc-900">{prospect.name}</h4>
                      <button onClick={() => handleDelete(prospect.id)} className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-1 text-sm text-zinc-500 mb-3">
                      {prospect.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3" /> <span className="truncate">{prospect.email}</span></div>}
                      {prospect.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" /> <span>{prospect.phone}</span></div>}
                      <div className="flex items-center gap-2"><Clock className="w-3 h-3" /> <span>{new Date(prospect.date).toLocaleDateString()}</span></div>
                    </div>

                    {prospect.notes && (
                      <p className="text-xs text-zinc-900 bg-velatra-bgCard p-2 rounded mb-3 line-clamp-2">{prospect.notes}</p>
                    )}

                    <select 
                      value={prospect.status}
                      onChange={(e) => handleStatusChange(prospect.id, e.target.value)}
                      className="w-full bg-velatra-bgCard border  rounded text-xs p-1.5 text-zinc-500 focus:outline-none"
                    >
                      {COLUMNS.map(c => <option key={c.id} value={c.id}>Déplacer vers {c.title}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {confirmDeleteId && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-xl font-black text-zinc-900 mb-2">Supprimer ce prospect ?</h3>
            <p className="text-zinc-500 mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setConfirmDeleteId(null)}>Annuler</Button>
              <Button variant="danger" fullWidth onClick={confirmDelete}>Supprimer</Button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};
