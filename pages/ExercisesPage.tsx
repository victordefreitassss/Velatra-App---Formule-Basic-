
import React, { useState } from 'react';
import { AppState, Exercise } from '../types';
import { Card, Button, Input, Badge } from '../components/UI';
import { PlusIcon, SearchIcon, DumbbellIcon, Trash2Icon, Edit2Icon, XIcon, CheckIcon, SaveIcon, CameraIcon } from '../components/Icons';
import { EXERCISE_CATEGORIES } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

import { db, doc, updateDoc, setDoc, deleteDoc } from '../firebase';

const containerVariants: import('framer-motion').Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants: import('framer-motion').Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

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
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-20"
    >
      <motion.div variants={itemVariants} className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-zinc-900 leading-none">BIBLIOTHÈQUE</h1>
          <p className="text-[10px] text-velatra-accent font-bold uppercase tracking-[3px] mt-2">{state.exercises.length} Exercices dispos</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddModal(true)} variant="primary" className="!py-3 !rounded-2xl shadow-xl shadow-velatra-accent/20">
            <PlusIcon size={18} className="mr-2" /> AJOUTER
          </Button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-4">
        <div className="relative">
          <SearchIcon size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-900" />
          <Input 
            placeholder="Rechercher un mouvement..." 
            className="pl-14 !bg-white/60 backdrop-blur-xl !border-zinc-200/50 !rounded-2xl font-bold shadow-sm" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          <button 
            onClick={() => setFilter("Tous")} 
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors shadow-sm ${filter === "Tous" ? 'bg-velatra-accent text-white shadow-velatra-accent/20' : 'bg-white/60 backdrop-blur-xl text-zinc-500 border border-zinc-200/50 hover:text-zinc-900 hover:bg-white'}`}
          >
            Tous
          </button>
          
          <div className="relative">
            <select 
              className={`appearance-none px-4 py-2 pr-8 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer outline-none shadow-sm ${filter !== "Tous" ? 'bg-velatra-accent text-white shadow-velatra-accent/20' : 'bg-white/60 backdrop-blur-xl text-zinc-500 border border-zinc-200/50 hover:text-zinc-900 hover:bg-white'}`}
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              <option value="Tous">Catégorie</option>
              {EXERCISE_CATEGORIES.map(c => (
                <option key={c} value={c} className="bg-white text-zinc-900">{c}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
      >
        {filtered.map(ex => {
          const isSquatBarre = (ex.name || '').toLowerCase().includes("squat barre");
          const needsPhoto = !ex.photo;

          return (
            <motion.div key={ex.id} variants={itemVariants} whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}>
              <Card className={`!p-0 overflow-hidden group border-none ring-1 transition-all bg-white/60 backdrop-blur-xl h-full shadow-sm ${isSquatBarre && needsPhoto ? 'ring-velatra-accent/50 animate-pulse' : 'ring-zinc-200/50 hover:ring-velatra-accent/30 hover:shadow-md'}`}>
                <div className="aspect-[4/3] bg-white/40 flex items-center justify-center relative overflow-hidden">
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
                      <Badge variant="accent" className="!text-[8px] animate-bounce shadow-sm">SUGGESTION IA</Badge>
                    </div>
                  )}
                  
                  {/* Persistent Actions */}
                  <div className="absolute top-2 right-2 flex gap-2 z-10">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingEx(ex); }}
                      className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-zinc-600 hover:text-velatra-accent hover:bg-white shadow-sm transition-all"
                      title="Modifier la photo"
                    >
                      <CameraIcon size={14} />
                    </button>
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        if(confirm("Supprimer cet exercice de la base ?")) {
                          try {
                            await deleteDoc(doc(db, "exercises", ex.id.toString()));
                            showToast("Exercice supprimé");
                          } catch (err) {
                            showToast("Erreur lors de la suppression", "error");
                          }
                        }
                      }}
                      className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-zinc-600 hover:text-red-500 hover:bg-white shadow-sm transition-all"
                      title="Supprimer l'exercice"
                    >
                      <Trash2Icon size={14} />
                    </button>
                  </div>
              </div>
              <div className="p-4 border-t border-zinc-200/50">
                <div className="font-black text-sm truncate group-hover:text-velatra-accent transition-colors tracking-tight pr-8">{ex.name}</div>
                <div className="flex justify-between items-center mt-2">
                  <Badge variant="dark" className="!bg-zinc-900/5 !p-0 !border-none !text-zinc-900">{ex.cat}</Badge>
                  <div className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">{ex.equip}</div>
                </div>
              </div>
            </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Modal d'ajout Manuel */}
      <AnimatePresence>
      {showAddModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
           <motion.div
             initial={{ scale: 0.95, opacity: 0, y: 20 }}
             animate={{ scale: 1, opacity: 1, y: 0 }}
             exit={{ scale: 0.95, opacity: 0, y: 20 }}
             transition={{ type: "spring", stiffness: 300, damping: 30 }}
             className="w-full max-w-md"
             onClick={e => e.stopPropagation()}
           >
             <Card className="w-full !p-8 border-zinc-200/50 relative shadow-2xl bg-white/80 backdrop-blur-2xl">
              <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-zinc-900 transition-colors bg-white/50 p-2 rounded-full hover:bg-white">
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
                    className="!bg-white/60 backdrop-blur-xl !border-zinc-200/50 shadow-sm"
                   />
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Catégorie</label>
                   <select 
                     className="w-full bg-white/60 backdrop-blur-xl border border-zinc-200/50 rounded-xl p-4 text-sm text-zinc-900 focus:border-velatra-accent outline-none appearance-none shadow-sm"
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
                    className="!bg-white/60 backdrop-blur-xl !border-zinc-200/50 shadow-sm"
                   />
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">URL de la Photo</label>
                   <Input 
                    placeholder="https://..."
                    value={newEx.photo || ""}
                    onChange={e => setNewEx({...newEx, photo: e.target.value})}
                    className="!bg-white/60 backdrop-blur-xl !border-zinc-200/50 shadow-sm"
                   />
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Ou charger un fichier</label>
                   <input 
                     type="file" 
                     accept="image/*"
                     className="w-full text-[10px] text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-velatra-accent file:text-white hover:file:bg-velatra-accentDark cursor-pointer bg-white/60 backdrop-blur-xl p-2 rounded-xl border border-zinc-200/50 shadow-sm"
                     onChange={(e) => {
                       const file = e.target.files?.[0];
                       if (file) {
                         const reader = new FileReader();
                         reader.onloadend = () => {
                           const img = new Image();
                           img.onload = () => {
                             const canvas = document.createElement('canvas');
                             const MAX_WIDTH = 800;
                             const MAX_HEIGHT = 800;
                             let width = img.width;
                             let height = img.height;

                             if (width > height) {
                               if (width > MAX_WIDTH) {
                                 height *= MAX_WIDTH / width;
                                 width = MAX_WIDTH;
                               }
                             } else {
                               if (height > MAX_HEIGHT) {
                                 width *= MAX_HEIGHT / height;
                                 height = MAX_HEIGHT;
                               }
                             }

                             canvas.width = width;
                             canvas.height = height;
                             const ctx = canvas.getContext('2d');
                             ctx?.drawImage(img, 0, 0, width, height);
                             const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                             setNewEx({...newEx, photo: dataUrl});
                           };
                           img.src = reader.result as string;
                         };
                         reader.readAsDataURL(file);
                       }
                     }}
                   />
                </div>

                <div className="pt-4 flex gap-3">
                  <Button variant="secondary" fullWidth onClick={() => setShowAddModal(false)} className="bg-white/60 hover:bg-white">ANNULER</Button>
                  <Button variant="primary" fullWidth onClick={handleSaveNewEx} className="shadow-lg shadow-velatra-accent/20">
                    CRÉER <CheckIcon size={18} className="ml-2" />
                  </Button>
                </div>
              </div>
             </Card>
           </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
      {/* Modal d'édition */}
      <AnimatePresence>
      {editingEx && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={() => setEditingEx(null)}
        >
           <motion.div
             initial={{ scale: 0.95, opacity: 0, y: 20 }}
             animate={{ scale: 1, opacity: 1, y: 0 }}
             exit={{ scale: 0.95, opacity: 0, y: 20 }}
             transition={{ type: "spring", stiffness: 300, damping: 30 }}
             className="w-full max-w-md"
             onClick={e => e.stopPropagation()}
           >
             <Card className="w-full !p-8 border-zinc-200/50 relative shadow-2xl bg-white/80 backdrop-blur-2xl">
              <button onClick={() => setEditingEx(null)} className="absolute top-6 right-6 text-zinc-500 hover:text-zinc-900 transition-colors bg-white/50 p-2 rounded-full hover:bg-white">
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
                    className="!bg-white/60 backdrop-blur-xl !border-zinc-200/50 shadow-sm"
                   />
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Ou charger un fichier</label>
                   <input 
                     type="file" 
                     accept="image/*"
                     className="w-full text-[10px] text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-velatra-accent file:text-white hover:file:bg-velatra-accentDark cursor-pointer bg-white/60 backdrop-blur-xl p-2 rounded-xl border border-zinc-200/50 shadow-sm"
                     onChange={(e) => {
                       const file = e.target.files?.[0];
                       if (file) {
                         const reader = new FileReader();
                         reader.onloadend = () => {
                           const img = new Image();
                           img.onload = () => {
                             const canvas = document.createElement('canvas');
                             const MAX_WIDTH = 800;
                             const MAX_HEIGHT = 800;
                             let width = img.width;
                             let height = img.height;

                             if (width > height) {
                               if (width > MAX_WIDTH) {
                                 height *= MAX_WIDTH / width;
                                 width = MAX_WIDTH;
                               }
                             } else {
                               if (height > MAX_HEIGHT) {
                                 width *= MAX_HEIGHT / height;
                                 height = MAX_HEIGHT;
                               }
                             }

                             canvas.width = width;
                             canvas.height = height;
                             const ctx = canvas.getContext('2d');
                             ctx?.drawImage(img, 0, 0, width, height);
                             const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                             setEditingEx({...editingEx, photo: dataUrl});
                           };
                           img.src = reader.result as string;
                         };
                         reader.readAsDataURL(file);
                       }
                     }}
                   />
                </div>

                <div className="pt-4 flex gap-3">
                  <Button variant="secondary" fullWidth onClick={() => setEditingEx(null)} className="bg-white/60 hover:bg-white">ANNULER</Button>
                  <Button variant="primary" fullWidth onClick={() => handleUpdateEx(editingEx)} className="shadow-lg shadow-velatra-accent/20">
                    ENREGISTRER <SaveIcon size={18} className="ml-2" />
                  </Button>
                </div>
              </div>
             </Card>
           </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
};
