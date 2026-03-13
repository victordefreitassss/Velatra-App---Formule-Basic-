
import React, { useState } from 'react';
import { AppState, Exercise } from '../types';
import { Card, Button, Input, Badge } from '../components/UI';
import { PlusIcon, SearchIcon, DumbbellIcon, Trash2Icon, Edit2Icon, XIcon, CheckIcon, SaveIcon } from '../components/Icons';
import { EXERCISE_CATEGORIES } from '../constants';

import { db, doc, updateDoc, setDoc, deleteDoc } from '../firebase';

export const ExercisesPage: React.FC<{ state: AppState, setState: any, showToast: any }> = ({ state, setState, showToast }) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tous");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEx, setEditingEx] = useState<Exercise | null>(null);
  
  const [newEx, setNewEx] = useState<Partial<Exercise>>({
    name: "",
    cat: EXERCISE_CATEGORIES[0],
    equip: "Poids libre",
    photo: ""
  });

  const filtered = state.exercises.filter(ex => 
    (filter === "Tous" || ex.cat === filter) &&
    (ex.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSaveNewEx = async () => {
    if (!newEx.name) {
      showToast("Nom requis", "error");
      return;
    }

    const ex: Exercise = {
      id: Date.now(),
      clubId: state.user?.clubId || "global",
      name: newEx.name,
      cat: newEx.cat || "Autre",
      equip: newEx.equip || "Aucun",
      photo: newEx.photo || null,
      perfId: (newEx.name || '').toLowerCase().replace(/\s+/g, '_')
    };

    try {
      await setDoc(doc(db, "exercises", ex.id.toString()), ex);
      showToast("Exercice ajouté.");
      setShowAddModal(false);
      setNewEx({ name: "", cat: EXERCISE_CATEGORIES[0], equip: "Poids libre", photo: "" });
    } catch (err) {
      console.error("Error saving exercise:", err);
      showToast("Erreur lors de l'enregistrement", "error");
    }
  };

  const handleUpdateEx = async (updatedEx: Exercise) => {
    try {
      await setDoc(doc(db, "exercises", updatedEx.id.toString()), updatedEx);
      showToast("Exercice mis à jour.");
      setEditingEx(null);
    } catch (err) {
      showToast("Erreur de mise à jour", "error");
    }
  };

  return (
    <div className="space-y-8 page-transition pb-20">
      <div className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-zinc-900 leading-none">BIBLIOTHÈQUE</h1>
          <p className="text-[10px] text-velatra-accent font-bold uppercase tracking-[3px] mt-2">{state.exercises.length} Exercices dispos</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddModal(true)} variant="primary" className="!py-3 !rounded-2xl shadow-xl shadow-velatra-accent/20">
            <PlusIcon size={18} className="mr-2" /> AJOUTER
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <SearchIcon size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-900" />
          <Input 
            placeholder="Rechercher un mouvement..." 
            className="pl-14 !bg-zinc-50 !border-zinc-200 !rounded-2xl font-bold" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          <button 
            onClick={() => setFilter("Tous")} 
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${filter === "Tous" ? 'bg-velatra-accent text-white' : 'bg-zinc-50 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
          >
            Tous
          </button>
          
          <div className="relative">
            <select 
              className={`appearance-none px-4 py-2 pr-8 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer outline-none ${filter !== "Tous" ? 'bg-velatra-accent text-white' : 'bg-zinc-50 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              <option value="Tous">Catégorie</option>
              {EXERCISE_CATEGORIES.map(c => (
                <option key={c} value={c} className="bg-zinc-50 text-zinc-900">{c}</option>
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map(ex => {
          const isSquatBarre = (ex.name || '').toLowerCase().includes("squat barre");
          const needsPhoto = !ex.photo;

          return (
            <Card key={ex.id} className={`!p-0 overflow-hidden group border-none ring-1 transition-all bg-white ${isSquatBarre && needsPhoto ? 'ring-velatra-accent/50 animate-pulse' : 'ring-zinc-200 hover:ring-velatra-accent/30'}`}>
              <div className="aspect-[4/3] bg-white flex items-center justify-center relative overflow-hidden">
                {ex.photo ? (
                  <img src={ex.photo} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                ) : (
                  <div className="flex flex-col items-center gap-3 opacity-40 group-hover:opacity-60 transition-opacity">
                    <div className="text-velatra-accent">
                      <DumbbellIcon size={40} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest">{ex.name}</span>
                  </div>
                )}
                
                {isSquatBarre && needsPhoto && (
                  <div className="absolute top-2 left-2 z-10">
                    <Badge variant="accent" className="!text-[8px] animate-bounce">SUGGESTION IA</Badge>
                  </div>
                )}
              
              {/* Actions Overlay */}
              <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 p-4 gap-2">
                 <Button 
                   variant="glass" 
                   fullWidth 
                   className="!py-2 !text-[10px] !rounded-xl" 
                   onClick={() => setEditingEx(ex)}
                 >
                   MODIFIER PHOTO 📷
                 </Button>
                 <button 
                  onClick={async () => {
                    if(confirm("Supprimer cet exercice de la base ?")) {
                      try {
                        await deleteDoc(doc(db, "exercises", ex.id.toString()));
                        showToast("Exercice supprimé");
                      } catch (err) {
                        showToast("Erreur lors de la suppression", "error");
                      }
                    }
                  }}
                  className="text-red-500/60 hover:text-red-500 text-[10px] font-black uppercase tracking-widest mt-2 transition-colors"
                 >
                   Supprimer
                 </button>
              </div>
            </div>
            <div className="p-4 border-t border-zinc-200">
              <div className="font-black text-sm truncate group-hover:text-velatra-accent transition-colors tracking-tight">{ex.name}</div>
              <div className="flex justify-between items-center mt-2">
                <Badge variant="dark" className="!bg-transparent !p-0 !border-none !text-zinc-900">{ex.cat}</Badge>
                <div className="text-[8px] text-zinc-900 font-black uppercase tracking-widest">{ex.equip}</div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>

      {/* Modal d'ajout Manuel */}
      {showAddModal && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <Card className="w-full max-w-md !p-8 border-zinc-200 relative shadow-2xl">
              <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 text-zinc-900/40 hover:text-zinc-900">
                <XIcon size={24} />
              </button>
              
              <h2 className="text-2xl font-black mb-1">NOUVEL EXERCICE</h2>
              <p className="text-[10px] text-velatra-accent font-black uppercase tracking-widest mb-8">Ajout manuel à la bibliothèque</p>

              <div className="space-y-5">
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Nom du mouvement</label>
                   <Input 
                    placeholder="Ex: Leg Press Incliné"
                    value={newEx.name}
                    onChange={e => setNewEx({...newEx, name: e.target.value})}
                   />
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Catégorie</label>
                   <select 
                     className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm text-zinc-900 focus:border-velatra-accent outline-none appearance-none"
                     value={newEx.cat}
                     onChange={e => setNewEx({...newEx, cat: e.target.value})}
                   >
                     {EXERCISE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Équipement requis</label>
                   <Input 
                    placeholder="Ex: Machine, Barre, Haltères..."
                    value={newEx.equip}
                    onChange={e => setNewEx({...newEx, equip: e.target.value})}
                   />
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">URL de la Photo</label>
                   <Input 
                    placeholder="https://..."
                    value={newEx.photo || ""}
                    onChange={e => setNewEx({...newEx, photo: e.target.value})}
                   />
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Ou charger un fichier</label>
                   <input 
                     type="file" 
                     accept="image/*"
                     className="w-full text-[10px] text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-velatra-accent file:text-zinc-900 hover:file:bg-velatra-accentDark cursor-pointer bg-zinc-50 p-2 rounded-xl border border-zinc-200"
                     onChange={(e) => {
                       const file = e.target.files?.[0];
                       if (file) {
                         const reader = new FileReader();
                         reader.onloadend = () => {
                           setNewEx({...newEx, photo: reader.result as string});
                         };
                         reader.readAsDataURL(file);
                       }
                     }}
                   />
                </div>

                <div className="pt-4 flex gap-3">
                  <Button variant="secondary" fullWidth onClick={() => setShowAddModal(false)}>ANNULER</Button>
                  <Button variant="primary" fullWidth onClick={handleSaveNewEx}>
                    CRÉER <CheckIcon size={18} className="ml-2" />
                  </Button>
                </div>
              </div>
           </Card>
        </div>
      )}
      {/* Modal d'édition */}
      {editingEx && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <Card className="w-full max-w-md !p-8 border-zinc-200 relative shadow-2xl">
              <button onClick={() => setEditingEx(null)} className="absolute top-6 right-6 text-zinc-900/40 hover:text-zinc-900">
                <XIcon size={24} />
              </button>
              
              <h2 className="text-2xl font-black mb-1">MODIFIER PHOTO</h2>
              <p className="text-[10px] text-velatra-accent font-black uppercase tracking-widest mb-8">{editingEx.name}</p>

              <div className="space-y-5">
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">URL de la Photo</label>
                   <Input 
                    placeholder="https://..."
                    value={editingEx.photo || ""}
                    onChange={e => setEditingEx({...editingEx, photo: e.target.value})}
                   />
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Ou charger un fichier</label>
                   <input 
                     type="file" 
                     accept="image/*"
                     className="w-full text-[10px] text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-velatra-accent file:text-zinc-900 hover:file:bg-velatra-accentDark cursor-pointer bg-zinc-50 p-2 rounded-xl border border-zinc-200"
                     onChange={(e) => {
                       const file = e.target.files?.[0];
                       if (file) {
                         const reader = new FileReader();
                         reader.onloadend = () => {
                           setEditingEx({...editingEx, photo: reader.result as string});
                         };
                         reader.readAsDataURL(file);
                       }
                     }}
                   />
                </div>

                <div className="pt-4 flex gap-3">
                  <Button variant="secondary" fullWidth onClick={() => setEditingEx(null)}>ANNULER</Button>
                  <Button variant="primary" fullWidth onClick={() => handleUpdateEx(editingEx)}>
                    ENREGISTRER <SaveIcon size={18} className="ml-2" />
                  </Button>
                </div>
              </div>
           </Card>
        </div>
      )}
    </div>
  );
};
