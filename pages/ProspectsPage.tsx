import React, { useState } from 'react';
import { AppState, Prospect, User } from '../types';
import { db, doc, updateDoc, setDoc, deleteDoc } from '../firebase';
import { Plus, Search, Trash2, Mail, Phone, Clock, CheckCircle, XCircle, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const COLUMNS = [
  { id: 'lead', title: 'Nouveau Lead', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'contacted', title: 'Contacté', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { id: 'trial', title: 'Séance d\'essai', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { id: 'won', title: 'Abonné', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { id: 'lost', title: 'Perdu', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
];

export const ProspectsPage: React.FC<Props> = ({ state, setState }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newProspect, setNewProspect] = useState({ name: '', email: '', phone: '', notes: '' });

  const filteredProspects = state.prospects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStatusChange = async (prospectId: number, newStatus: string) => {
    try {
      const prospect = state.prospects.find(p => p.id === prospectId);
      if (!prospect || !prospect.firebaseUid) return;
      
      const docId = prospect.firebaseUid;

      if (newStatus === 'won' && state.user?.clubId) {
        if (confirm(`Convertir ${prospect.name} en membre ? Un profil sera créé automatiquement.`)) {
          const newUserId = Date.now();
          const code = Math.floor(1000 + Math.random() * 9000).toString();
          const newUser: User = {
            id: newUserId,
            clubId: state.user.clubId,
            code,
            pwd: code, // default password
            name: prospect.name || 'Sans nom',
            email: prospect.email || '',
            phone: prospect.phone || '',
            role: 'member',
            avatar: prospect.name ? prospect.name.substring(0, 2).toUpperCase() : 'U',
            gender: 'M',
            age: 30,
            weight: 70,
            height: 175,
            objectifs: [],
            notes: prospect.notes || '',
            createdAt: new Date().toISOString(),
            xp: 0,
            streak: 0,
            pointsFidelite: 0
          };
          
          // Create user document
          await setDoc(doc(db, "users", newUserId.toString()), newUser);
          // Update prospect status
          await updateDoc(doc(db, "prospects", docId), { status: newStatus });
          alert(`Membre créé avec succès ! Code d'accès : ${code}`);
          // Redirect to members page and select the new member
          setState(prev => ({ ...prev, page: 'users', selectedMember: newUser }));
        } else {
          // If user cancels, just update the status without creating a member? Or don't update status.
          return;
        }
      } else {
        await updateDoc(doc(db, "prospects", docId), { status: newStatus });
      }
    } catch (err) {
      console.error("Error updating prospect status", err);
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
    } catch (err) {
      console.error("Error adding prospect", err);
    }
  };

  const handleDelete = async (id: number) => {
    const prospect = state.prospects.find(p => p.id === id);
    if (!prospect || !prospect.firebaseUid) return;

    if (confirm("Supprimer ce prospect ?")) {
      try {
        await deleteDoc(doc(db, "prospects", prospect.firebaseUid));
      } catch (err) {
        console.error("Error deleting prospect", err);
      }
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Pipeline Commercial</h1>
          <p className="text-velatra-textMuted mt-1">Gérez vos prospects et convertissez-les en membres.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-velatra-textMuted" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-velatra-bgCard border border-velatra-border rounded-xl py-2 pl-10 pr-4 text-white focus:outline-none focus:border-velatra-accent transition-colors"
            />
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-velatra-accent hover:bg-velatra-accentDark text-white px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Lead</span>
          </button>
        </div>
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-velatra-bgCard border border-velatra-border rounded-xl p-6"
        >
          <h2 className="text-xl font-semibold text-white mb-4">Ajouter un Prospect</h2>
          <form onSubmit={handleAddProspect} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-velatra-textMuted mb-1">Nom complet</label>
              <input required type="text" value={newProspect.name} onChange={e => setNewProspect({...newProspect, name: e.target.value})} className="w-full bg-velatra-bg border border-velatra-border rounded-lg p-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-velatra-textMuted mb-1">Email</label>
              <input type="email" value={newProspect.email} onChange={e => setNewProspect({...newProspect, email: e.target.value})} className="w-full bg-velatra-bg border border-velatra-border rounded-lg p-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-velatra-textMuted mb-1">Téléphone</label>
              <input type="tel" value={newProspect.phone} onChange={e => setNewProspect({...newProspect, phone: e.target.value})} className="w-full bg-velatra-bg border border-velatra-border rounded-lg p-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-velatra-textMuted mb-1">Notes / Objectifs</label>
              <input type="text" value={newProspect.notes} onChange={e => setNewProspect({...newProspect, notes: e.target.value})} className="w-full bg-velatra-bg border border-velatra-border rounded-lg p-2 text-white" />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-velatra-textMuted hover:text-white transition-colors">Annuler</button>
              <button type="submit" className="bg-velatra-accent text-white px-6 py-2 rounded-lg font-medium hover:bg-velatra-accentDark transition-colors">Enregistrer</button>
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
              className="flex-none w-80 bg-velatra-bgCard/50 border border-velatra-border rounded-xl flex flex-col snap-center"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className={`p-3 border-b border-velatra-border flex justify-between items-center rounded-t-xl ${col.color.split(' ')[0]}`}>
                <h3 className={`font-semibold ${col.color.split(' ')[1]}`}>{col.title}</h3>
                <span className="bg-black/20 px-2 py-0.5 rounded-full text-xs font-medium">{colProspects.length}</span>
              </div>
              
              <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[500px]">
                {colProspects.map(prospect => (
                  <div 
                    key={prospect.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, prospect.id)}
                    className="bg-velatra-bg border border-velatra-border rounded-lg p-4 cursor-grab active:cursor-grabbing hover:border-velatra-textMuted transition-colors group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-white">{prospect.name}</h4>
                      <button onClick={() => handleDelete(prospect.id)} className="text-velatra-textMuted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-1 text-sm text-velatra-textMuted mb-3">
                      {prospect.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3" /> <span className="truncate">{prospect.email}</span></div>}
                      {prospect.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" /> <span>{prospect.phone}</span></div>}
                      <div className="flex items-center gap-2"><Clock className="w-3 h-3" /> <span>{new Date(prospect.date).toLocaleDateString()}</span></div>
                    </div>

                    {prospect.notes && (
                      <p className="text-xs text-velatra-textDark bg-velatra-bgCard p-2 rounded mb-3 line-clamp-2">{prospect.notes}</p>
                    )}

                    <select 
                      value={prospect.status}
                      onChange={(e) => handleStatusChange(prospect.id, e.target.value)}
                      className="w-full bg-velatra-bgCard border border-velatra-border rounded text-xs p-1.5 text-velatra-textMuted focus:outline-none"
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
    </div>
  );
};
