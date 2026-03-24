
import React, { useState } from 'react';
import { AppState, ClubInfo, CoachInfo } from '../types';
import { Card, Button, Input, Badge } from '../components/UI';
import { TargetIcon, HomeIcon, DumbbellIcon, MessageCircleIcon, Edit2Icon, SaveIcon, XIcon, PlusIcon, Trash2Icon } from '../components/Icons';

import { db, doc, updateDoc } from '../firebase';

export const AboutPage: React.FC<{ state: AppState, setState?: any }> = ({ state, setState }) => {
  const { aboutInfo, coaches, user } = state;
  const isCoach = user?.role === 'coach' || user?.role === 'owner';
  const [isEditing, setIsEditing] = useState(false);
  const [tempInfo, setTempInfo] = useState<ClubInfo>(aboutInfo);
  const [tempCoaches, setTempCoaches] = useState<CoachInfo[]>(coaches);

  const handleSave = async () => {
    if (!state.user?.clubId) return;
    
    try {
      await updateDoc(doc(db, "clubs", state.user.clubId), {
        description: tempInfo.description,
        horaires: tempInfo.horaires,
        phone: tempInfo.phone,
        email: tempInfo.email,
        googleReview: tempInfo.googleReview,
        coaches: tempCoaches
      });
      
      if (setState) {
        setState((prev: AppState) => ({
          ...prev,
          aboutInfo: tempInfo,
          coaches: tempCoaches
        }));
      }
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating club info", err);
      alert("Erreur lors de la mise à jour des informations.");
    }
  };

  const handleAddCoach = () => {
    const newCoach: CoachInfo = {
      id: Date.now(),
      clubId: state.user!.clubId,
      name: "Nouveau Coach",
      role: "Spécialité",
      whatsapp: "+33600000000",
      photo: null
    };
    setTempCoaches([...tempCoaches, newCoach]);
  };

  const handleRemoveCoach = (id: number) => {
    setTempCoaches(tempCoaches.filter(c => c.id !== id));
  };

  const updateCoach = (id: number, field: keyof CoachInfo, value: string) => {
    setTempCoaches(tempCoaches.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  return (
    <div className="space-y-10 pb-24 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div className="text-center sm:text-left">
          <h1 className="text-4xl font-display font-bold tracking-tight leading-none mb-2 text-zinc-900">INFOS CLUB</h1>
          <p className="text-velatra-accent text-[10px] uppercase tracking-[3px] font-bold">VELATRA Application numéro 1</p>
        </div>
        
        {isCoach && !isEditing && (
          <Button variant="glass" onClick={() => setIsEditing(true)} className="!rounded-full !py-2 !px-4 self-center sm:self-auto">
            <Edit2Icon size={16} className="mr-2" /> MODIFIER LES INFOS
          </Button>
        )}

        {isEditing && (
          <div className="flex flex-col sm:flex-row gap-2 self-center sm:self-auto">
            <Button variant="danger" onClick={() => setIsEditing(false)} className="!rounded-full !py-2 !px-4">
              ANNULER
            </Button>
            <Button variant="success" onClick={handleSave} className="!rounded-full !py-2 !px-4">
              ENREGISTRER
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section Club Principale */}
        <Card className="space-y-6 !p-8 border-none ring-1 ring-zinc-200 bg-gradient-to-br from-white/[0.03] to-transparent">
          <div className="flex items-center gap-4 text-velatra-accent">
            <div className="p-3 bg-velatra-accent/10 rounded-2xl">
              <HomeIcon size={24} />
            </div>
            <h2 className="text-xl font-black">Le Club</h2>
          </div>
          
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-velatra-accent tracking-widest ml-1">Description du club</label>
                <textarea 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm text-zinc-900 focus:outline-none focus:border-velatra-accent h-32 resize-none"
                  value={tempInfo.description}
                  onChange={e => setTempInfo({...tempInfo, description: e.target.value})}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-zinc-500 font-medium">
              {aboutInfo.description}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
            <div className="space-y-2">
               <div className="text-[10px] uppercase font-black text-velatra-accent tracking-widest flex items-center gap-2">
                 <DumbbellIcon size={14} /> HORAIRES
               </div>
               {isEditing ? (
                 <textarea 
                   className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs text-zinc-900 focus:outline-none focus:border-velatra-accent h-24 resize-none"
                   value={tempInfo.horaires}
                   onChange={e => setTempInfo({...tempInfo, horaires: e.target.value})}
                 />
               ) : (
                 <div className="text-sm font-bold text-zinc-900 whitespace-pre-line leading-relaxed">
                   {aboutInfo.horaires}
                 </div>
               )}
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-200 space-y-4">
             {isEditing ? (
               <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-velatra-accent tracking-widest ml-1">Téléphone</label>
                    <Input 
                      className="!py-2 !text-xs"
                      value={tempInfo.phone}
                      onChange={e => setTempInfo({...tempInfo, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-velatra-accent tracking-widest ml-1">Email</label>
                    <Input 
                      className="!py-2 !text-xs"
                      value={tempInfo.email}
                      onChange={e => setTempInfo({...tempInfo, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-velatra-accent tracking-widest ml-1">Lien Avis Google</label>
                    <Input 
                      className="!py-2 !text-xs"
                      value={tempInfo.googleReview}
                      onChange={e => setTempInfo({...tempInfo, googleReview: e.target.value})}
                    />
                  </div>
               </div>
             ) : (
               <>
                 <Button 
                  variant="primary" 
                  fullWidth 
                  className="!py-4 shadow-xl shadow-velatra-accent/20"
                  onClick={() => window.open(`tel:${aboutInfo.phone}`, '_self')}
                 >
                   APPELER LE CLUB
                 </Button>
                 <Button 
                  variant="secondary" 
                  fullWidth 
                  className="!py-4"
                  onClick={() => window.open(aboutInfo.googleReview, '_blank')}
                 >
                   LAISSER UN AVIS GOOGLE
                 </Button>
               </>
             )}
          </div>
        </Card>

        {/* Section Équipe */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-velatra-accent/10 rounded-2xl text-velatra-accent">
                <DumbbellIcon size={24} />
              </div>
              <h2 className="text-xl font-black">Votre Équipe</h2>
            </div>
            {isEditing && (
              <button 
                onClick={handleAddCoach}
                className="p-2 bg-velatra-accent text-white rounded-full hover:scale-110 transition-transform"
              >
                <PlusIcon size={20} />
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {(isEditing ? tempCoaches : coaches).map(coach => (
              <Card key={coach.id} className="flex items-center gap-5 !p-5 group hover:ring-velatra-accent/30 transition-all relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-velatra-accent/20 to-zinc-100 border border-zinc-200 flex items-center justify-center font-black text-2xl text-velatra-accent shrink-0 shadow-lg overflow-hidden">
                  {coach.photo ? (
                    <img src={coach.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (coach.name || 'C').charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input 
                        className="!py-1 !px-2 !text-sm !font-black"
                        value={coach.name}
                        onChange={e => updateCoach(coach.id, 'name', e.target.value)}
                        placeholder="Nom du coach"
                      />
                      <Input 
                        className="!py-1 !px-2 !text-[10px] !text-velatra-accent"
                        value={coach.role}
                        onChange={e => updateCoach(coach.id, 'role', e.target.value)}
                        placeholder="Spécialité"
                      />
                      <Input 
                        className="!py-1 !px-2 !text-[10px]"
                        value={coach.whatsapp}
                        onChange={e => updateCoach(coach.id, 'whatsapp', e.target.value)}
                        placeholder="Numéro WhatsApp"
                      />
                      {coach.photo?.startsWith('data:image') ? (
                        <div className="flex items-center gap-2 p-1.5 bg-white/60 border border-zinc-200/50 rounded-lg">
                          <img src={coach.photo} alt="Preview" className="w-6 h-6 object-cover rounded" />
                          <span className="text-[9px] font-bold text-emerald-500 flex-1">Image chargée</span>
                          <button onClick={() => updateCoach(coach.id, 'photo', '')} className="p-1 text-zinc-400 hover:text-red-500">
                            <XIcon size={12} />
                          </button>
                        </div>
                      ) : (
                        <Input 
                          className="!py-1 !px-2 !text-[10px]"
                          value={coach.photo || ""}
                          onChange={e => updateCoach(coach.id, 'photo', e.target.value)}
                          placeholder="URL de la photo"
                        />
                      )}
                      <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-black uppercase text-zinc-900 tracking-widest ml-1">Ou charger un fichier</label>
                        <input 
                          type="file" 
                          accept="image/*"
                          className="text-[9px] text-zinc-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[9px] file:font-black file:bg-velatra-accent file:text-zinc-900 hover:file:bg-velatra-accentDark cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                updateCoach(coach.id, 'photo', reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="font-black text-lg leading-tight">{coach.name}</div>
                      <div className="text-[10px] text-velatra-accent font-black uppercase tracking-widest mt-1 mb-3">{coach.role}</div>
                      <button 
                        onClick={() => window.open(`https://wa.me/${coach.whatsapp}`, '_blank')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#25D366]/10 text-[#25D366] rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-[#25D366] hover:text-white transition-all w-fit"
                      >
                        <MessageCircleIcon size={14} />
                        WhatsApp Direct
                      </button>
                    </>
                  )}
                </div>
                {isEditing && (
                  <button 
                    onClick={() => handleRemoveCoach(coach.id)}
                    className="absolute top-2 right-2 p-2 text-red-500/50 hover:text-red-500"
                  >
                    <Trash2Icon size={16} />
                  </button>
                )}
              </Card>
            ))}
          </div>

          {!isEditing && (
            <Card className="bg-zinc-50 border-dashed border-zinc-200 text-center !p-8">
               <p className="text-[9px] uppercase tracking-[4px] font-black text-zinc-900 mb-3">Besoin d'aide technique ?</p>
               <div className="text-sm font-bold text-zinc-900 opacity-80">{aboutInfo.email}</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
