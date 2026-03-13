import React, { useState } from 'react';
import { AppState, User } from '../types';
import { Card, Badge, Button } from '../components/UI';
import { UserIcon, MailIcon, ActivityIcon, DumbbellIcon, TargetIcon, Edit2Icon, SaveIcon, LogOutIcon, PhoneIcon } from 'lucide-react';
import { doc, updateDoc, db } from '../firebase';

export const ProfilePage: React.FC<{
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}> = ({ state, setState, showToast }) => {
  const user = state.user!;
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    height: user.height || 0,
    weight: user.weight || 0,
    experienceLevel: user.experienceLevel || 'Débutant',
    equipment: user.equipment || 'Salle de sport',
    email: user.email || '',
    phone: user.phone || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const userRef = doc(db, "users", (user as any).firebaseUid);
      await updateDoc(userRef, {
        height: Number(formData.height),
        weight: Number(formData.weight),
        experienceLevel: formData.experienceLevel,
        equipment: formData.equipment,
        email: formData.email,
        phone: formData.phone,
      });
      
      setState(prev => ({
        ...prev,
        user: {
          ...prev.user!,
          height: Number(formData.height),
          weight: Number(formData.weight),
          experienceLevel: formData.experienceLevel as any,
          equipment: formData.equipment as any,
          email: formData.email,
          phone: formData.phone,
        }
      }));
      
      setIsEditing(false);
      showToast("Profil mis à jour avec succès");
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast("Erreur lors de la mise à jour", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight leading-none mb-1 text-zinc-900">Mon Profil</h1>
          <p className="text-[10px] uppercase tracking-[2px] font-bold text-zinc-500">Gérez vos informations personnelles</p>
        </div>
        <Button 
          variant={isEditing ? "success" : "secondary"} 
          onClick={isEditing ? handleSave : () => setIsEditing(true)}
          disabled={isSaving}
          className="!rounded-xl"
        >
          {isEditing ? (
            <><SaveIcon size={16} className="mr-2" /> Enregistrer</>
          ) : (
            <><Edit2Icon size={16} className="mr-2" /> Modifier</>
          )}
        </Button>
      </div>

      <Card className="!p-8 bg-zinc-50 border-zinc-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-velatra-accent/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-velatra-accent to-velatra-accentDark flex items-center justify-center font-bold text-5xl shadow-[0_0_30px_rgba(99,102,241,0.3)] text-zinc-900 ring-4 ring-white shrink-0">
            {user.avatar}
          </div>
          
          <div className="flex-1 space-y-6 w-full">
            <div>
              <h2 className="text-2xl font-black text-zinc-900">{user.name}</h2>
              {isEditing ? (
                <div className="space-y-3 mt-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Email</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 focus:outline-none focus:border-velatra-accent transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Téléphone</label>
                    <input 
                      type="tel" 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 focus:outline-none focus:border-velatra-accent transition-colors"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <MailIcon size={14} />
                    <span className="text-sm">{user.email || 'Non renseigné'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500">
                    <PhoneIcon size={14} />
                    <span className="text-sm">{user.phone || 'Non renseigné'}</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="blue" className="uppercase tracking-widest text-[10px]">{user.role}</Badge>
              {user.gender && (
                <Badge variant="dark" className="uppercase tracking-widest text-[10px] bg-zinc-200 text-zinc-900 border-zinc-300">
                  {user.gender === 'M' ? 'Homme' : 'Femme'}
                </Badge>
              )}
              <Badge variant="success" className="uppercase tracking-widest text-[10px]">
                Niveau {Math.floor(user.xp / 1000) + 1}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="!p-6 bg-zinc-50 border-zinc-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-velatra-accent/10 flex items-center justify-center text-velatra-accent">
              <ActivityIcon size={20} />
            </div>
            <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Physique</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Taille (cm)</label>
              {isEditing ? (
                <input 
                  type="number" 
                  value={formData.height}
                  onChange={(e) => setFormData({...formData, height: Number(e.target.value)})}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:border-velatra-accent transition-colors"
                />
              ) : (
                <div className="text-lg font-medium text-zinc-900">{user.height ? `${user.height} cm` : 'Non renseigné'}</div>
              )}
            </div>
            
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Poids (kg)</label>
              {isEditing ? (
                <input 
                  type="number" 
                  value={formData.weight}
                  onChange={(e) => setFormData({...formData, weight: Number(e.target.value)})}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:border-velatra-accent transition-colors"
                />
              ) : (
                <div className="text-lg font-medium text-zinc-900">{user.weight ? `${user.weight} kg` : 'Non renseigné'}</div>
              )}
            </div>
          </div>
        </Card>

        <Card className="!p-6 bg-zinc-50 border-zinc-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-velatra-accent/10 flex items-center justify-center text-velatra-accent">
              <DumbbellIcon size={20} />
            </div>
            <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Entraînement</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Niveau</label>
              {isEditing ? (
                <select 
                  value={formData.experienceLevel}
                  onChange={(e) => setFormData({...formData, experienceLevel: e.target.value as any})}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:border-velatra-accent transition-colors"
                >
                  <option value="Débutant">Débutant</option>
                  <option value="Intermédiaire">Intermédiaire</option>
                  <option value="Avancé">Avancé</option>
                </select>
              ) : (
                <div className="text-lg font-medium text-zinc-900">{user.experienceLevel || 'Non renseigné'}</div>
              )}
            </div>
            
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Équipement</label>
              {isEditing ? (
                <select 
                  value={formData.equipment}
                  onChange={(e) => setFormData({...formData, equipment: e.target.value as any})}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:border-velatra-accent transition-colors"
                >
                  <option value="Salle de sport">Salle de sport</option>
                  <option value="Maison avec matériel">Maison avec matériel</option>
                  <option value="Poids du corps">Poids du corps</option>
                </select>
              ) : (
                <div className="text-lg font-medium text-zinc-900">{user.equipment || 'Non renseigné'}</div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Card className="!p-6 bg-zinc-50 border-zinc-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-velatra-accent/10 flex items-center justify-center text-velatra-accent">
            <TargetIcon size={20} />
          </div>
          <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Objectifs</h3>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {user.objectifs && user.objectifs.length > 0 ? (
            user.objectifs.map((obj, idx) => (
              <div key={idx} className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-900">
                {obj}
              </div>
            ))
          ) : (
            <p className="text-zinc-500 italic text-sm">Aucun objectif renseigné.</p>
          )}
        </div>
      </Card>
    </div>
  );
};
