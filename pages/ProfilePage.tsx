import React, { useState } from 'react';
import { AppState, User } from '../types';
import { Card, Badge, Button } from '../components/UI';
import { UserIcon, MailIcon, ActivityIcon, DumbbellIcon, TargetIcon, Edit2Icon, SaveIcon, LogOutIcon, PhoneIcon, CreditCardIcon, ExternalLinkIcon } from 'lucide-react';
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
      showToast("Redirection vers le portail...", "info");
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

  const handleConnectGoogleFit = async () => {
    if (user.integrations?.googleFit) {
      // Disconnect
      try {
        const userRef = doc(db, "users", (user as any).firebaseUid);
        await updateDoc(userRef, {
          "integrations.googleFit": false,
          "integrations.googleFitTokens": null
        });
        setState(prev => ({
          ...prev,
          user: {
            ...prev.user!,
            integrations: {
              ...prev.user!.integrations,
              googleFit: false
            }
          }
        }));
        showToast("Google Fit déconnecté", "success");
      } catch (e) {
        showToast("Erreur lors de la déconnexion", "error");
      }
      return;
    }

    // Connect
    const authWindow = window.open('', 'oauth_popup', 'width=600,height=700');
    if (!authWindow) {
      showToast("Veuillez autoriser les popups pour vous connecter.", "error");
      return;
    }

    try {
      showToast("Ouverture de la connexion Google Fit...", "info");
      const response = await fetch(`${window.location.origin}/api/auth/google-fit/url`);
      if (!response.ok) throw new Error("Erreur réseau");
      const { url } = await response.json();
      
      authWindow.location.href = url;
    } catch (error) {
      console.error(error);
      authWindow.close();
      showToast("Erreur d'initialisation de la connexion", "error");
    }
  };

  const handleConnectStrava = async () => {
    if (user.integrations?.strava) {
      // Disconnect
      try {
        const userRef = doc(db, "users", (user as any).firebaseUid);
        await updateDoc(userRef, {
          "integrations.strava": false,
          "integrations.stravaTokens": null
        });
        setState(prev => ({
          ...prev,
          user: {
            ...prev.user!,
            integrations: {
              ...prev.user!.integrations,
              strava: false
            }
          }
        }));
        showToast("Strava déconnecté", "success");
      } catch (e) {
        showToast("Erreur lors de la déconnexion", "error");
      }
      return;
    }

    // Connect
    const authWindow = window.open('', 'oauth_popup', 'width=600,height=700');
    if (!authWindow) {
      showToast("Veuillez autoriser les popups pour vous connecter.", "error");
      return;
    }

    try {
      showToast("Ouverture de la connexion Strava...", "info");
      const response = await fetch(`${window.location.origin}/api/auth/strava/url`);
      if (!response.ok) throw new Error("Erreur réseau");
      const { url } = await response.json();
      
      authWindow.location.href = url;
    } catch (error) {
      console.error(error);
      authWindow.close();
      showToast("Erreur d'initialisation de la connexion", "error");
    }
  };

  React.useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Validate origin is from AI Studio preview or localhost
      if (!event.origin.endsWith('.run.app') && !event.origin.includes('localhost')) {
        return;
      }
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        try {
          const userRef = doc(db, "users", (user as any).firebaseUid);
          const provider = event.data.provider; // 'googleFit' or 'strava'
          
          if (provider === 'googleFit') {
            await updateDoc(userRef, {
              "integrations.googleFit": true,
              "integrations.googleFitTokens": event.data.tokens
            });
            
            setState(prev => ({
              ...prev,
              user: {
                ...prev.user!,
                integrations: {
                  ...prev.user!.integrations,
                  googleFit: true
                }
              }
            }));
            showToast("Google Fit connecté avec succès ! Données synchronisées.", "success");
          } else if (provider === 'strava') {
            await updateDoc(userRef, {
              "integrations.strava": true,
              "integrations.stravaTokens": event.data.tokens
            });
            
            setState(prev => ({
              ...prev,
              user: {
                ...prev.user!,
                integrations: {
                  ...prev.user!.integrations,
                  strava: true
                }
              }
            }));
            showToast("Strava connecté avec succès ! Activités synchronisées.", "success");
          }
        } catch (e) {
          console.error(e);
          showToast("Erreur lors de l'enregistrement de la connexion", "error");
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [user, setState, showToast]);

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

      {/* Measurements Section */}
      <Card className="!p-6 bg-zinc-50 border-zinc-200">
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
                  className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:border-velatra-accent transition-colors"
                />
              ) : (
                <div className="text-lg font-medium text-zinc-900">{(user.measurements as any)?.[measurement.key] ? `${(user.measurements as any)[measurement.key]} cm` : '-'}</div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {user.role === 'client' && state.currentClub?.settings?.payment?.stripeSecretKey && user.stripeCustomerId && (
        <Card className="!p-6 bg-zinc-50 border-zinc-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-velatra-accent/10 flex items-center justify-center text-velatra-accent">
                <CreditCardIcon size={20} />
              </div>
              <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Abonnement</h3>
            </div>
            <Button variant="outline" onClick={handleManageSubscription} className="text-sm">
              Gérer mon abonnement <ExternalLinkIcon size={14} className="ml-2" />
            </Button>
          </div>
          
          <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900">Statut de l'abonnement</p>
              <p className="text-xs text-zinc-500 mt-1">Gérez vos paiements et factures via le portail sécurisé Stripe.</p>
            </div>
            <Badge variant="success" className="uppercase tracking-widest text-[10px]">Actif</Badge>
          </div>
        </Card>
      )}

      {/* Integrations Section */}
      <Card className="!p-6 bg-zinc-50 border-zinc-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-velatra-accent/10 flex items-center justify-center text-velatra-accent">
            <ActivityIcon size={20} />
          </div>
          <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Connexions & Applications</h3>
        </div>
        
        <div className="space-y-4">
          {/* Apple Santé */}
          <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center justify-between opacity-60 grayscale">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center text-[#FF2D55]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900">Apple Santé</p>
                <p className="text-xs text-zinc-500 mt-1">Synchronisez vos calories brûlées et votre activité quotidienne.</p>
                <p className="text-[10px] font-bold text-velatra-accent uppercase tracking-wider mt-1">Prochaine MaJ</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="text-sm opacity-50 cursor-not-allowed"
              disabled
            >
              Connecter
            </Button>
          </div>

          {/* Google Fit */}
          <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center justify-between opacity-60 grayscale">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center text-[#4285F4]">
                <ActivityIcon size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900">Google Fit</p>
                <p className="text-xs text-zinc-500 mt-1">Synchronisez vos données d'activité depuis Android.</p>
                <p className="text-[10px] font-bold text-velatra-accent uppercase tracking-wider mt-1">Prochaine MaJ</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="text-sm opacity-50 cursor-not-allowed"
              disabled
            >
              Connecter
            </Button>
          </div>

          {/* Strava */}
          <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col gap-4 opacity-60 grayscale">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center text-[#FC4C02]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900">Strava</p>
                  <p className="text-xs text-zinc-500 mt-1">Synchronisez vos courses et sorties vélo.</p>
                  <p className="text-[10px] font-bold text-velatra-accent uppercase tracking-wider mt-1">Prochaine MaJ</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="text-sm opacity-50 cursor-not-allowed"
                disabled
              >
                Connecter
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

const StravaActivities: React.FC<{ tokens: any }> = ({ tokens }) => {
  const [activities, setActivities] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchActivities = async () => {
      if (!tokens?.access_token) {
        setError("Token manquant");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${window.location.origin}/api/strava/activities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: tokens.access_token })
        });
        if (!res.ok) throw new Error("Erreur lors de la récupération");
        const data = await res.json();
        setActivities(data);
      } catch (err) {
        setError("Impossible de charger les activités");
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, [tokens]);

  if (loading) return <div className="text-xs text-zinc-500 animate-pulse">Chargement des activités...</div>;
  if (error) return <div className="text-xs text-red-500">{error}</div>;
  if (activities.length === 0) return <div className="text-xs text-zinc-500">Aucune activité récente trouvée.</div>;

  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Dernières activités</h4>
      <div className="space-y-2">
        {activities.map((act: any) => (
          <div key={act.id} className="flex items-center justify-between text-sm bg-zinc-50 p-3 rounded-lg">
            <div className="font-medium text-zinc-900">{act.name}</div>
            <div className="text-zinc-500 text-xs">
              {act.type === 'Run' ? '🏃' : act.type === 'Ride' ? '🚴' : '💪'} {Math.round(act.distance / 1000)}km • {Math.round(act.moving_time / 60)}min
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
