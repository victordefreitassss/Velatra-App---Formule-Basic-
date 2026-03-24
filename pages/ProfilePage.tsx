import React, { useState } from 'react';
import { AppState, User, SessionLog } from '../types';
import { Card, Badge, Button } from '../components/UI';
import { UserIcon, MailIcon, ActivityIcon, DumbbellIcon, TargetIcon, Edit2Icon, SaveIcon, LogOutIcon, PhoneIcon, CreditCardIcon, ExternalLinkIcon, CalendarIcon, MessageCircleIcon } from 'lucide-react';
import { doc, updateDoc, db } from '../firebase';
import { motion } from 'framer-motion';
import { updateNutritionPlanForWeight } from '../utils';

const containerVariants: import('framer-motion').Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: import('framer-motion').Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export const ProfilePage: React.FC<{
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}> = ({ state, setState, showToast }) => {
  const user = state.user!;
  const [isEditing, setIsEditing] = useState(false);
  const [selectedLog, setSelectedLog] = useState<SessionLog | null>(null);
  const [formData, setFormData] = useState({
    height: user.height || 0,
    weight: user.weight || 0,
    experienceLevel: user.experienceLevel || 'Débutant',
    equipment: user.equipment || 'Salle de sport',
    email: user.email || '',
    phone: user.phone || '',
    chest: user.measurements?.chest || 0,
    waist: user.measurements?.waist || 0,
    hips: user.measurements?.hips || 0,
    arms: user.measurements?.arms || 0,
    thighs: user.measurements?.thighs || 0,
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
        measurements: {
          chest: Number(formData.chest),
          waist: Number(formData.waist),
          hips: Number(formData.hips),
          arms: Number(formData.arms),
          thighs: Number(formData.thighs),
        }
      });
      
      // Update nutrition plan if it exists
      const plan = state.nutritionPlans?.find(p => p.memberId === Number(user.id));
      if (plan && Number(formData.weight) !== user.weight) {
        const updatedPlan = updateNutritionPlanForWeight(plan, Number(formData.weight));
        await updateDoc(doc(db, "nutritionPlans", plan.id), updatedPlan);
      }
      
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
          measurements: {
            chest: Number(formData.chest),
            waist: Number(formData.waist),
            hips: Number(formData.hips),
            arms: Number(formData.arms),
            thighs: Number(formData.thighs),
          }
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

  const handleManageSubscription = async () => {
    if (!state.currentClub?.settings?.payment?.stripeSecretKey || !user.stripeCustomerId) {
      showToast("Impossible de gérer l'abonnement pour le moment.", "error");
      return;
    }

    try {
      showToast("Redirection vers le portail...", "success");
      const res = await fetch(`${window.location.origin}/api/stripe/portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripeSecretKey: state.currentClub.settings.payment.stripeSecretKey,
          customerId: user.stripeCustomerId,
          returnUrl: window.location.href
        })
      });

      if (!res.ok) throw new Error("Erreur lors de la création du portail");
      
      const { session } = await res.json();
      if (session?.url) {
        window.location.href = session.url;
      }
    } catch (error) {
      console.error(error);
      showToast("Erreur lors de la redirection", "error");
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-24 max-w-2xl mx-auto"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
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
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="!p-8 bg-white/60 backdrop-blur-xl border-zinc-200/50 relative overflow-hidden shadow-xl">
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
                        className="w-full bg-white/50 border border-zinc-200/50 rounded-xl px-4 py-2 text-sm text-zinc-900 focus:outline-none focus:border-velatra-accent transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Téléphone</label>
                      <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-white/50 border border-zinc-200/50 rounded-xl px-4 py-2 text-sm text-zinc-900 focus:outline-none focus:border-velatra-accent transition-colors"
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
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <Card className="!p-6 bg-white/60 backdrop-blur-xl border-zinc-200/50 shadow-lg h-full">
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
                    className="w-full bg-white/50 border border-zinc-200/50 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:border-velatra-accent transition-colors"
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
                    className="w-full bg-white/50 border border-zinc-200/50 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:border-velatra-accent transition-colors"
                  />
                ) : (
                  <div className="text-lg font-medium text-zinc-900">{user.weight ? `${user.weight} kg` : 'Non renseigné'}</div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="!p-6 bg-white/60 backdrop-blur-xl border-zinc-200/50 shadow-lg h-full">
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
                    className="w-full bg-white/50 border border-zinc-200/50 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:border-velatra-accent transition-colors"
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
                    className="w-full bg-white/50 border border-zinc-200/50 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:border-velatra-accent transition-colors"
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
        </motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <Card className="!p-6 bg-white/60 backdrop-blur-xl border-zinc-200/50 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-velatra-accent/10 flex items-center justify-center text-velatra-accent">
              <TargetIcon size={20} />
            </div>
            <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Objectifs</h3>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {user.objectifs && user.objectifs.length > 0 ? (
              user.objectifs.map((obj, idx) => (
                <div key={idx} className="px-4 py-2 bg-white/50 border border-zinc-200/50 rounded-xl text-sm font-medium text-zinc-900 shadow-sm">
                  {obj}
                </div>
              ))
            ) : (
              <p className="text-zinc-500 italic text-sm">Aucun objectif renseigné.</p>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Measurements Section */}
      <motion.div variants={itemVariants}>
        <Card className="!p-6 bg-white/60 backdrop-blur-xl border-zinc-200/50 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-velatra-accent/10 flex items-center justify-center text-velatra-accent">
              <ActivityIcon size={20} />
            </div>
            <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Mensurations (cm)</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Poitrine', key: 'chest' },
              { label: 'Taille', key: 'waist' },
              { label: 'Hanches', key: 'hips' },
              { label: 'Bras', key: 'arms' },
              { label: 'Cuisses', key: 'thighs' }
            ].map(measurement => (
              <div key={measurement.key}>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">{measurement.label}</label>
                {isEditing ? (
                  <input 
                    type="number" 
                    value={(formData as any)[measurement.key]}
                    onChange={(e) => setFormData({...formData, [measurement.key]: Number(e.target.value)})}
                    className="w-full bg-white/50 border border-zinc-200/50 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:border-velatra-accent transition-colors"
                  />
                ) : (
                  <div className="text-lg font-medium text-zinc-900">{(user.measurements as any)?.[measurement.key] ? `${(user.measurements as any)[measurement.key]} cm` : '-'}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {user.role === 'member' && (
        <motion.div variants={itemVariants}>
          <Card className="!p-6 bg-white/60 backdrop-blur-xl border-zinc-200/50 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-velatra-accent/10 flex items-center justify-center text-velatra-accent">
                <CalendarIcon size={20} />
              </div>
              <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Historique Coaching</h3>
            </div>
            
            <div className="space-y-4">
              {(state.logs || []).filter(log => log.memberId === Number(user.id) && log.isCoaching).length > 0 ? (
                <div className="space-y-4">
                  {(state.logs || []).filter(log => log.memberId === Number(user.id) && log.isCoaching)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(log => (
                    <div key={log.id} className="bg-white/50 border border-zinc-200/50 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-zinc-900">{new Date(log.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">{log.dayName} • Semaine {log.week}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="success" className="uppercase tracking-widest text-[10px]">Terminée</Badge>
                          <Button variant="secondary" className="!py-1 !px-2 !text-[10px] !rounded-lg" onClick={() => setSelectedLog(log)}>
                            VOIR RÉCAP
                          </Button>
                        </div>
                      </div>
                      {log.notes && (
                        <div className="mt-2 p-3 bg-velatra-accent/5 rounded-lg border border-velatra-accent/10">
                          <div className="flex items-start gap-2">
                            <MessageCircleIcon size={14} className="text-velatra-accent mt-0.5 shrink-0" />
                            <p className="text-xs text-zinc-700 leading-relaxed italic line-clamp-2">"{log.notes}"</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/50 border border-zinc-200/50 rounded-xl p-6 text-center shadow-sm">
                  <p className="text-sm font-medium text-zinc-900">Aucune séance de coaching</p>
                  <p className="text-xs text-zinc-500 mt-1">Vos récaps de séances apparaîtront ici.</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      )}

      {user.role === 'member' && (
        <motion.div variants={itemVariants}>
          <Card className="!p-6 bg-white/60 backdrop-blur-xl border-zinc-200/50 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-velatra-accent/10 flex items-center justify-center text-velatra-accent">
                  <CreditCardIcon size={20} />
                </div>
                <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Abonnement</h3>
              </div>
              {state.currentClub?.settings?.payment?.stripeSecretKey && user.stripeCustomerId && (
                <Button variant="secondary" onClick={handleManageSubscription} className="text-sm">
                  Gérer mon abonnement <ExternalLinkIcon size={14} className="ml-2" />
                </Button>
              )}
            </div>
            
            <div className="space-y-4">
              {(() => {
                const subscription = state.subscriptions.find(s => s.memberId === Number(user.id) && s.status === 'active');
                if (subscription) {
                  return (
                    <div className="bg-white/50 border border-zinc-200/50 rounded-xl p-4 flex flex-col gap-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-zinc-900">{subscription.planName}</p>
                          <p className="text-xs text-zinc-500 mt-1">
                            {subscription.price}€ / {subscription.billingCycle === 'monthly' ? 'mois' : subscription.billingCycle === 'yearly' ? 'an' : 'fois'}
                          </p>
                        </div>
                        <Badge variant="success" className="uppercase tracking-widest text-[10px]">Actif</Badge>
                      </div>
                      {subscription.contractUrl && (
                        <div className="pt-4 border-t border-zinc-200/50">
                          <a href={subscription.contractUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-velatra-accent flex items-center gap-2 hover:underline">
                            <ExternalLinkIcon size={16} /> Voir mon contrat
                          </a>
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <div className="bg-white/50 border border-zinc-200/50 rounded-xl p-4 flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">Aucun abonnement actif</p>
                      <p className="text-xs text-zinc-500 mt-1">Vous n'avez pas d'abonnement en cours.</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </Card>
        </motion.div>
      )}


    </motion.div>
  );
};
