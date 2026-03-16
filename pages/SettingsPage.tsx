import React, { useState } from 'react';
import { AppState, Plan } from '../types';
import { Card, Button, Input } from '../components/UI';
import { SettingsIcon, SaveIcon, PlusIcon, Edit2Icon, Trash2Icon, CheckIcon, XIcon, TargetIcon } from '../components/Icons';
import { db, doc, updateDoc, setDoc, deleteDoc } from '../firebase';

export const SettingsPage: React.FC<{ state: AppState, setState: any, showToast: any }> = ({ state, setState, showToast }) => {
  const [defaultDuration, setDefaultDuration] = useState(state.currentClub?.settings?.defaultProgramDuration || 7);
  const [loyaltyPoints, setLoyaltyPoints] = useState(state.currentClub?.settings?.loyalty?.pointsPerWorkout || 100);
  const [loyaltyTiers, setLoyaltyTiers] = useState<{id: string, points: number, reward: string}[]>(
    state.currentClub?.settings?.loyalty?.tiers || [
      { id: '1', points: 1000, reward: 'T-shirt du club' },
      { id: '2', points: 5000, reward: '1 mois offert' }
    ]
  );
  
  const [stripeConnected, setStripeConnected] = useState(state.currentClub?.settings?.payment?.stripeConnected || false);
  const [stripeSecretKey, setStripeSecretKey] = useState(state.currentClub?.settings?.payment?.stripeSecretKey || '');
  const [acceptedMethods, setAcceptedMethods] = useState<string[]>(state.currentClub?.settings?.payment?.acceptedMethods || ['card', 'cash']);

  const [isSaving, setIsSaving] = useState(false);

  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);

  const handleSave = async () => {
    if (!state.user?.clubId) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "clubs", state.user.clubId), {
        "settings.defaultProgramDuration": defaultDuration,
        "settings.loyalty": {
          pointsPerWorkout: loyaltyPoints,
          tiers: loyaltyTiers
        },
        "settings.payment": {
          stripeConnected,
          stripeSecretKey,
          acceptedMethods,
          autoCollection: true
        }
      });
      showToast("Paramètres enregistrés avec succès !");
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'enregistrement", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const paymentMethodsList = [
    { id: 'card', label: 'CB en ligne (via Stripe)', requiresStripe: true },
    { id: 'sepa', label: 'Prélèvement SEPA (via Stripe)', requiresStripe: true },
    { id: 'cash', label: 'Espèces', requiresStripe: false },
    { id: 'check', label: 'Chèque', requiresStripe: false },
    { id: 'transfer', label: 'Virement bancaire', requiresStripe: false },
    { id: 'ancv', label: 'Chèque sport (ANCV)', requiresStripe: false },
  ];

  const toggleAcceptedMethod = (methodId: string) => {
    if (acceptedMethods.includes(methodId)) {
      setAcceptedMethods(acceptedMethods.filter(id => id !== methodId));
    } else {
      setAcceptedMethods([...acceptedMethods, methodId]);
    }
  };

  const handleConnectStripe = async () => {
    if (!stripeSecretKey.startsWith('sk_')) {
      showToast("Clé secrète invalide", "error");
      return;
    }
    setStripeConnected(true);
    if (state.user?.clubId) {
      await updateDoc(doc(db, "clubs", state.user.clubId), {
        "settings.payment.stripeConnected": true,
        "settings.payment.stripeSecretKey": stripeSecretKey
      });
    }
    showToast("Compte Stripe connecté avec succès !");
  };

  const handleDisconnectStripe = async () => {
    if (confirm("Voulez-vous vraiment déconnecter votre compte Stripe ? Vos clients ne pourront plus payer en ligne.")) {
      setStripeConnected(false);
      setStripeSecretKey('');
      const newMethods = acceptedMethods.filter(m => !['card', 'sepa'].includes(m));
      setAcceptedMethods(newMethods);
      if (state.user?.clubId) {
        await updateDoc(doc(db, "clubs", state.user.clubId), {
          "settings.payment.stripeConnected": false,
          "settings.payment.stripeSecretKey": '',
          "settings.payment.acceptedMethods": newMethods
        });
      }
      showToast("Compte Stripe déconnecté.");
    }
  };

  const handleSavePlan = async () => {
    if (!state.user?.clubId || !editingPlan?.name || !editingPlan?.price) return;
    try {
      const planId = editingPlan.id || Date.now().toString();
      const planData: Plan = {
        id: planId,
        clubId: state.user.clubId,
        name: editingPlan.name,
        price: Number(editingPlan.price),
        billingCycle: editingPlan.billingCycle || 'monthly',
        description: editingPlan.description || '',
        hasCommitment: editingPlan.hasCommitment || false,
        commitmentMonths: Number(editingPlan.commitmentMonths) || 0,
        isTTC: editingPlan.isTTC || false,
        paymentMethods: editingPlan.paymentMethods || ['card'],
        stripeProductId: editingPlan.stripeProductId,
        stripePriceId: editingPlan.stripePriceId,
      };

      // Create product/price in Stripe if not already done and if Stripe is connected
      if (stripeConnected && stripeSecretKey && !planData.stripePriceId) {
        showToast("Création de la formule sur Stripe...", "info");
        const res = await fetch('/api/stripe/create-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stripeSecretKey,
            name: planData.name,
            price: planData.price,
            billingCycle: planData.billingCycle,
            description: planData.description
          })
        });
        
        if (res.ok) {
          const stripeData = await res.json();
          planData.stripeProductId = stripeData.productId;
          planData.stripePriceId = stripeData.priceId;
        } else {
          console.error("Erreur lors de la création sur Stripe");
        }
      }

      await setDoc(doc(db, "plans", planId), planData);
      showToast(editingPlan.id ? "Formule modifiée" : "Formule créée");
      setIsEditingPlan(false);
      setEditingPlan(null);
    } catch (err) {
      showToast("Erreur lors de l'enregistrement de la formule", "error");
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette formule ?")) return;
    try {
      await deleteDoc(doc(db, "plans", planId));
      showToast("Formule supprimée");
    } catch (err) {
      showToast("Erreur lors de la suppression", "error");
    }
  };

  const togglePaymentMethod = (method: string) => {
    if (!editingPlan) return;
    const currentMethods = editingPlan.paymentMethods || [];
    if (currentMethods.includes(method)) {
      setEditingPlan({ ...editingPlan, paymentMethods: currentMethods.filter(m => m !== method) });
    } else {
      setEditingPlan({ ...editingPlan, paymentMethods: [...currentMethods, method] });
    }
  };

  return (
    <div className="space-y-8 page-transition pb-20">
      <div className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-zinc-900 leading-none">Paramètres</h1>
          <p className="text-[10px] text-zinc-900 font-bold uppercase tracking-[3px] mt-2">Configuration du club</p>
        </div>
      </div>

      <Card className="p-8 border-zinc-200 bg-white">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-velatra-accent/10 rounded-2xl text-velatra-accent">
            <SettingsIcon size={24} />
          </div>
          <h2 className="text-xl font-black uppercase">Informations du Club</h2>
        </div>

        <div className="space-y-6 max-w-md">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">
              Code d'accès du club
            </label>
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex justify-between items-center">
              <span className="text-xl font-black tracking-widest text-zinc-900">{state.currentClub?.id}</span>
              <Button 
                variant="secondary" 
                className="!py-2 !px-4 !text-[10px]"
                onClick={() => {
                  navigator.clipboard.writeText(state.currentClub?.id || "");
                  showToast("Code copié !");
                }}
              >
                COPIER
              </Button>
            </div>
            <p className="text-xs text-zinc-900 mt-1">
              Partagez ce code avec vos membres pour qu'ils puissent rejoindre votre club lors de leur inscription.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-8 border-zinc-200 bg-white">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-velatra-accent/10 rounded-2xl text-velatra-accent">
            <SettingsIcon size={24} />
          </div>
          <h2 className="text-xl font-black uppercase">Programmation</h2>
        </div>

        <div className="space-y-6 max-w-md">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">
              Durée par défaut d'un programme (semaines)
            </label>
            <Input 
              type="number" 
              min={1} 
              max={52} 
              value={defaultDuration || ''} 
              onChange={(e) => setDefaultDuration(parseInt(e.target.value) || 0)} 
            />
            <p className="text-xs text-zinc-900 mt-1">
              Cette durée sera utilisée par défaut lors de la création d'un nouveau programme.
            </p>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full !py-4">
            <SaveIcon size={18} className="mr-2" />
            {isSaving ? "ENREGISTREMENT..." : "ENREGISTRER LES PARAMÈTRES"}
          </Button>
        </div>
      </Card>

      <Card className="p-8 border-zinc-200 bg-white">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-velatra-accent/10 rounded-2xl text-velatra-accent">
            <TargetIcon size={24} />
          </div>
          <h2 className="text-xl font-black uppercase">Fidélité & Récompenses</h2>
        </div>

        <div className="space-y-6 max-w-2xl">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">
              Points XP par séance terminée
            </label>
            <Input 
              type="number" 
              min={1} 
              value={loyaltyPoints || ''} 
              onChange={(e) => setLoyaltyPoints(parseInt(e.target.value) || 0)} 
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">
                Paliers de récompenses
              </label>
              <Button 
                variant="secondary" 
                className="!py-2 !px-4 !text-[10px]"
                onClick={() => setLoyaltyTiers([...loyaltyTiers, { id: Date.now().toString(), points: 1000, reward: '' }])}
              >
                <PlusIcon size={12} className="mr-2" /> AJOUTER UN PALIER
              </Button>
            </div>
            
            <div className="space-y-3">
              {loyaltyTiers.map((tier, index) => (
                <div key={tier.id} className="flex items-center gap-3">
                  <div className="w-1/3">
                    <Input 
                      type="number" 
                      placeholder="Points requis"
                      value={tier.points || ''}
                      onChange={(e) => {
                        const newTiers = [...loyaltyTiers];
                        newTiers[index].points = parseInt(e.target.value) || 0;
                        setLoyaltyTiers(newTiers);
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <Input 
                      type="text" 
                      placeholder="Description de la récompense"
                      value={tier.reward}
                      onChange={(e) => {
                        const newTiers = [...loyaltyTiers];
                        newTiers[index].reward = e.target.value;
                        setLoyaltyTiers(newTiers);
                      }}
                    />
                  </div>
                  <button 
                    onClick={() => setLoyaltyTiers(loyaltyTiers.filter(t => t.id !== tier.id))}
                    className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2Icon size={18} />
                  </button>
                </div>
              ))}
              {loyaltyTiers.length === 0 && (
                <p className="text-sm text-zinc-500 italic">Aucun palier configuré.</p>
              )}
            </div>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full !py-4">
            <SaveIcon size={18} className="mr-2" />
            {isSaving ? "ENREGISTREMENT..." : "ENREGISTRER LES PARAMÈTRES"}
          </Button>
        </div>
      </Card>

      <Card className="p-8 border-zinc-200 bg-white">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-velatra-accent/10 rounded-2xl text-velatra-accent">
            <SettingsIcon size={24} />
          </div>
          <h2 className="text-xl font-black uppercase">Moyens d'encaissement</h2>
        </div>

        <div className="space-y-6 max-w-2xl">
          <div className="p-6 bg-zinc-50 border border-zinc-200 rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Connexion Stripe</h3>
                <p className="text-sm text-zinc-500">Reliez votre compte Stripe pour encaisser vos clients directement sur votre compte bancaire.</p>
              </div>
              {stripeConnected ? (
                <span className="px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 w-max">
                  <CheckIcon size={14} /> Connecté
                </span>
              ) : (
                <span className="px-3 py-1 bg-zinc-200 text-zinc-600 rounded-full text-xs font-bold uppercase tracking-wider shrink-0 w-max">
                  Non connecté
                </span>
              )}
            </div>
            
            {!stripeConnected ? (
              <div className="space-y-4 w-full sm:w-auto">
                <Input 
                  type="password" 
                  placeholder="Clé secrète Stripe (sk_live_...)" 
                  value={stripeSecretKey} 
                  onChange={(e) => setStripeSecretKey(e.target.value)}
                />
                <Button onClick={handleConnectStripe} className="w-full" disabled={!stripeSecretKey.startsWith('sk_')}>
                  Connecter mon compte Stripe
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 w-full sm:w-auto">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-zinc-500 font-mono bg-zinc-100 px-2 py-1 rounded">
                    {stripeSecretKey ? `${stripeSecretKey.substring(0, 8)}...` : 'Clé non renseignée'}
                  </span>
                  <Button variant="outline" onClick={() => setStripeConnected(false)} className="text-sm">
                    Modifier la clé
                  </Button>
                </div>
                <Button variant="secondary" onClick={handleDisconnectStripe} className="text-red-500 hover:text-red-600 hover:border-red-200">
                  Déconnecter Stripe
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-900">Moyens de paiement acceptés</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {paymentMethodsList.map(method => {
                const isDisabled = method.requiresStripe && !stripeConnected;
                return (
                  <label key={method.id} className={`flex items-center gap-3 p-4 border rounded-xl transition-colors ${isDisabled ? 'opacity-50 cursor-not-allowed border-zinc-100 bg-zinc-50' : 'cursor-pointer border-zinc-200 hover:bg-zinc-50'}`}>
                    <input 
                      type="checkbox" 
                      checked={acceptedMethods.includes(method.id)}
                      onChange={() => !isDisabled && toggleAcceptedMethod(method.id)}
                      disabled={isDisabled}
                      className="w-5 h-5 rounded border-zinc-300 text-velatra-accent focus:ring-velatra-accent disabled:opacity-50"
                    />
                    <div>
                      <p className="font-bold text-zinc-900 text-sm">{method.label}</p>
                      {method.requiresStripe && <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Nécessite Stripe</p>}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
          
          <Button onClick={handleSave} disabled={isSaving} className="w-full !py-4 mt-6">
            <SaveIcon size={18} className="mr-2" />
            {isSaving ? "ENREGISTREMENT..." : "ENREGISTRER LES PARAMÈTRES"}
          </Button>
        </div>
      </Card>

      <Card className="p-8 border-zinc-200 bg-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-velatra-accent/10 rounded-2xl text-velatra-accent">
              <SettingsIcon size={24} />
            </div>
            <h2 className="text-xl font-black uppercase">Formules d'abonnement</h2>
          </div>
          {!isEditingPlan && (
            <Button variant="primary" className="!py-2 !px-4" onClick={() => {
              setEditingPlan({ billingCycle: 'monthly', hasCommitment: false, isTTC: true, paymentMethods: ['card'] });
              setIsEditingPlan(true);
            }}>
              <PlusIcon size={16} className="mr-2" /> NOUVELLE FORMULE
            </Button>
          )}
        </div>

        {isEditingPlan ? (
          <div className="space-y-4 bg-zinc-50 p-6 rounded-3xl border border-zinc-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-zinc-900 uppercase tracking-widest">{editingPlan?.id ? "Modifier la formule" : "Créer une formule"}</h3>
              <button onClick={() => { setIsEditingPlan(false); setEditingPlan(null); }} className="text-zinc-500 hover:text-zinc-900">
                <XIcon size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Nom de la formule</label>
                <Input placeholder="Ex: Premium Coaching" value={editingPlan?.name || ''} onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Prix</label>
                <div className="flex items-center gap-2">
                  <Input type="number" placeholder="Ex: 99" value={editingPlan?.price || ''} onChange={e => setEditingPlan({ ...editingPlan, price: Number(e.target.value) })} className="flex-1" />
                  <button 
                    onClick={() => setEditingPlan({ ...editingPlan, isTTC: !editingPlan?.isTTC })}
                    className={`px-3 py-3 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors ${editingPlan?.isTTC ? 'bg-velatra-accent text-white border-velatra-accent' : 'bg-transparent text-zinc-900 border-zinc-200 hover:border-zinc-200'}`}
                  >
                    {editingPlan?.isTTC ? 'TTC' : 'HT'}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Cycle de facturation</label>
                <select 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-900 text-sm focus:outline-none focus:border-velatra-accent"
                  value={editingPlan?.billingCycle || 'monthly'}
                  onChange={e => setEditingPlan({ ...editingPlan, billingCycle: e.target.value as any })}
                >
                  <option value="monthly">Mensuel</option>
                  <option value="yearly">Annuel</option>
                  <option value="once">Paiement unique</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Engagement</label>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setEditingPlan({ ...editingPlan, hasCommitment: !editingPlan?.hasCommitment })}
                    className={`px-3 py-3 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors ${editingPlan?.hasCommitment ? 'bg-velatra-accent text-white border-velatra-accent' : 'bg-transparent text-zinc-900 border-zinc-200 hover:border-zinc-200'}`}
                  >
                    {editingPlan?.hasCommitment ? 'OUI' : 'NON'}
                  </button>
                  {editingPlan?.hasCommitment && (
                    <Input type="number" placeholder="Mois (ex: 12)" value={editingPlan?.commitmentMonths || ''} onChange={e => setEditingPlan({ ...editingPlan, commitmentMonths: Number(e.target.value) })} className="flex-1" />
                  )}
                </div>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Moyens de paiement acceptés</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    { id: 'card', label: 'Carte Bancaire' },
                    { id: 'sepa', label: 'Prélèvement SEPA' },
                    { id: 'cash', label: 'Espèces' },
                    { id: 'transfer', label: 'Virement' }
                  ].map(method => (
                    <button
                      key={method.id}
                      onClick={() => togglePaymentMethod(method.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors flex items-center gap-2 ${editingPlan?.paymentMethods?.includes(method.id) ? 'bg-zinc-100 text-zinc-900 border-zinc-300' : 'bg-transparent text-zinc-900 border-zinc-200 hover:border-zinc-200'}`}
                    >
                      {editingPlan?.paymentMethods?.includes(method.id) && <CheckIcon size={12} className="text-velatra-accent" />}
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Description</label>
                <Input placeholder="Description de la formule..." value={editingPlan?.description || ''} onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-zinc-200">
              <Button variant="secondary" onClick={() => { setIsEditingPlan(false); setEditingPlan(null); }}>ANNULER</Button>
              <Button variant="primary" onClick={handleSavePlan} disabled={!editingPlan?.name || !editingPlan?.price}>ENREGISTRER</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {state.plans.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm italic">
                Aucune formule d'abonnement configurée.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {state.plans.map(plan => (
                  <div key={plan.id} className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6 relative group">
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingPlan(plan); setIsEditingPlan(true); }} className="p-2 bg-zinc-100 rounded-xl hover:bg-zinc-200 text-zinc-900 transition-colors">
                        <Edit2Icon size={14} />
                      </button>
                      <button onClick={() => handleDeletePlan(plan.id)} className="p-2 bg-red-500/10 rounded-xl hover:bg-red-500/20 text-red-500 transition-colors">
                        <Trash2Icon size={14} />
                      </button>
                    </div>
                    <h3 className="text-lg font-black text-zinc-900 uppercase tracking-widest mb-1 pr-16">{plan.name}</h3>
                    <div className="text-2xl font-black text-velatra-accent mb-4">
                      {plan.price}€ <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{plan.isTTC ? 'TTC' : 'HT'} / {plan.billingCycle === 'monthly' ? 'mois' : plan.billingCycle === 'yearly' ? 'an' : 'fois'}</span>
                    </div>
                    
                    <div className="space-y-2 text-xs text-zinc-900">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${plan.hasCommitment ? 'bg-orange-500' : 'bg-green-500'}`} />
                        {plan.hasCommitment ? `Engagement ${plan.commitmentMonths} mois` : 'Sans engagement'}
                      </div>
                      {plan.paymentMethods && plan.paymentMethods.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          {plan.paymentMethods.map(m => m === 'card' ? 'CB' : m === 'sepa' ? 'SEPA' : m === 'cash' ? 'Espèces' : 'Virement').join(', ')}
                        </div>
                      )}
                    </div>
                    {plan.description && (
                      <p className="mt-4 text-[10px] text-zinc-500 italic leading-relaxed">
                        {plan.description}
                      </p>
                    )}
                    {plan.stripePriceId && (
                      <div className="mt-4 pt-4 border-t border-zinc-200">
                        <Button 
                          variant="secondary" 
                          className="w-full !py-2 !text-[10px]"
                          onClick={async () => {
                            try {
                              showToast("Génération du lien...", "info");
                              const res = await fetch('/api/stripe/checkout', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  stripeSecretKey,
                                  priceId: plan.stripePriceId,
                                  successUrl: window.location.origin + '/success',
                                  cancelUrl: window.location.origin + '/cancel'
                                })
                              });
                              if (res.ok) {
                                const data = await res.json();
                                navigator.clipboard.writeText(data.url);
                                showToast("Lien de paiement copié !");
                              } else {
                                throw new Error("Erreur");
                              }
                            } catch (e) {
                              showToast("Erreur lors de la génération", "error");
                            }
                          }}
                        >
                          COPIER LE LIEN DE PAIEMENT
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
