import React, { useState, useMemo } from 'react';
import { AppState, Subscription, Payment, Plan } from '../types';
import { db, doc, updateDoc, setDoc, deleteDoc } from '../firebase';
import { Plus, Search, Trash2, DollarSign, TrendingUp, CreditCard, AlertCircle, CheckCircle, Clock, User, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  state: AppState;
}

export const FinancesPage: React.FC<Props> = ({ state }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'subscriptions' | 'payments' | 'plans'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Tous');
  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [newPlan, setNewPlan] = useState<Partial<Plan>>({ name: '', price: 0, billingCycle: 'monthly', description: '' });

  // Derived Data
  const activeSubscriptions = state.subscriptions.filter(s => s.status === 'active');
  const mrr = activeSubscriptions.reduce((acc, sub) => {
    if (sub.billingCycle === 'monthly') return acc + sub.price;
    if (sub.billingCycle === 'yearly') return acc + (sub.price / 12);
    return acc;
  }, 0);

  const totalRevenue = state.payments.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0);
  const pendingPayments = state.payments.filter(p => p.status === 'pending').reduce((acc, p) => acc + p.amount, 0);

  const filteredSubscriptions = state.subscriptions.filter(s => {
    const member = state.users.find(u => u.id === s.memberId);
    if (!((member?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || s.planName.toLowerCase().includes(searchTerm.toLowerCase()))) return false;
    
    if (filterStatus === 'Actif' && s.status !== 'active') return false;
    if (filterStatus === 'En retard' && s.status !== 'past_due') return false;
    if (filterStatus === 'Annulé' && s.status !== 'cancelled') return false;
    
    return true;
  });

  const filteredPayments = state.payments.filter(p => {
    const member = state.users.find(u => u.id === p.memberId);
    if (!((member?.name || '').toLowerCase().includes(searchTerm.toLowerCase()))) return false;
    
    if (filterStatus === 'Payé' && p.status !== 'paid') return false;
    if (filterStatus === 'En attente' && p.status !== 'pending') return false;
    if (filterStatus === 'Échoué' && p.status !== 'failed') return false;
    
    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Generate mock chart data based on MRR
  const chartData = useMemo(() => {
    const data = [];
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const currentMonth = new Date().getMonth();
    
    let currentMRR = mrr * 0.6; // Start lower 6 months ago
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      data.push({
        name: months[monthIndex],
        mrr: i === 0 ? mrr : currentMRR
      });
      currentMRR += (mrr - currentMRR) / (i || 1); // gradually increase to current MRR
    }
    return data;
  }, [mrr]);

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.user?.clubId) return;
    
    const id = Date.now().toString();
    const plan: Plan = {
      id,
      clubId: state.user.clubId,
      name: newPlan.name || '',
      price: Number(newPlan.price),
      billingCycle: newPlan.billingCycle as 'monthly' | 'yearly' | 'once',
      description: newPlan.description || ''
    };

    try {
      await setDoc(doc(db, "plans", id), plan);
      setIsAddingPlan(false);
      setNewPlan({ name: '', price: 0, billingCycle: 'monthly', description: '' });
    } catch (err) {
      console.error("Error adding plan", err);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (confirm("Supprimer cette formule ? Les abonnements existants ne seront pas impactés.")) {
      try {
        await deleteDoc(doc(db, "plans", id));
      } catch (err) {
        console.error("Error deleting plan", err);
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 page-transition">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-zinc-900">Finances & Abonnements</h1>
          <p className="text-zinc-500 mt-1">Suivez vos revenus récurrents et paiements.</p>
        </div>
        
        <div className="flex bg-velatra-bgCard p-1 rounded-xl border border-velatra-border overflow-x-auto">
          <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'bg-velatra-bg text-zinc-900 shadow' : 'text-zinc-500 hover:text-zinc-900'}`}>Vue d'ensemble</button>
          <button onClick={() => setActiveTab('subscriptions')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'subscriptions' ? 'bg-velatra-bg text-zinc-900 shadow' : 'text-zinc-500 hover:text-zinc-900'}`}>Abonnements</button>
          <button onClick={() => setActiveTab('payments')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'payments' ? 'bg-velatra-bg text-zinc-900 shadow' : 'text-zinc-500 hover:text-zinc-900'}`}>Paiements</button>
          <button onClick={() => setActiveTab('plans')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'plans' ? 'bg-velatra-bg text-zinc-900 shadow' : 'text-zinc-500 hover:text-zinc-900'}`}>Formules</button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-velatra-bgCard border border-velatra-border rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-velatra-accent/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-zinc-500 font-medium mb-1">MRR (Revenu Mensuel)</p>
                  <h3 className="text-4xl font-display font-bold text-zinc-900">{mrr.toFixed(2)} €</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-velatra-accent/20 flex items-center justify-center text-velatra-accent">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
              <p className="text-sm text-velatra-success mt-4 flex items-center gap-1"><TrendingUp className="w-4 h-4" /> Basé sur {activeSubscriptions.length} abonnements actifs</p>
            </div>

            <div className="bg-velatra-bgCard border border-velatra-border rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-zinc-500 font-medium mb-1">Total Encaissé</p>
                  <h3 className="text-4xl font-display font-bold text-zinc-900">{totalRevenue.toFixed(2)} €</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
              <p className="text-sm text-zinc-500 mt-4">Historique complet des paiements</p>
            </div>

            <div className="bg-velatra-bgCard border border-velatra-border rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-zinc-500 font-medium mb-1">Paiements en attente</p>
                  <h3 className="text-4xl font-display font-bold text-zinc-900">{pendingPayments.toFixed(2)} €</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-400">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
              <p className="text-sm text-zinc-500 mt-4">À recouvrer prochainement</p>
            </div>
          </div>

          <div className="bg-velatra-bgCard border border-velatra-border rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-zinc-900 mb-6">Évolution du MRR (6 derniers mois)</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="name" stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}€`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#141414', borderColor: '#222', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#6366f1' }}
                    formatter={(value: number) => [`${value.toFixed(2)} €`, 'MRR']}
                  />
                  <Area type="monotone" dataKey="mrr" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorMrr)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'subscriptions' && (
        <div className="bg-velatra-bgCard border border-velatra-border rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-velatra-border space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900">Tous les abonnements</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input type="text" placeholder="Rechercher un membre ou un plan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 pl-9 pr-3 text-sm text-zinc-900 font-bold focus:outline-none focus:border-velatra-accent" />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
                {["Tous", "Actif", "En retard", "Annulé"].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterStatus(f)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${filterStatus === f ? 'bg-velatra-accent text-white' : 'bg-zinc-50 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-velatra-bg text-zinc-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-medium">Membre</th>
                  <th className="px-6 py-4 font-medium">Plan</th>
                  <th className="px-6 py-4 font-medium">Prix</th>
                  <th className="px-6 py-4 font-medium">Cycle</th>
                  <th className="px-6 py-4 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-velatra-border">
                {filteredSubscriptions.map(sub => {
                  const member = state.users.find(u => u.id === sub.memberId);
                  return (
                    <tr key={sub.id} className="hover:bg-velatra-bg/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-zinc-900 flex items-center gap-3">
                        {member?.avatar ? <img src={member.avatar} alt="" className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-velatra-bg border border-velatra-border flex items-center justify-center text-zinc-500"><User className="w-4 h-4" /></div>}
                        {member?.name || 'Inconnu'}
                      </td>
                      <td className="px-6 py-4 text-zinc-500">{sub.planName}</td>
                      <td className="px-6 py-4 text-zinc-900 font-medium">{sub.price} €</td>
                      <td className="px-6 py-4 text-zinc-500 capitalize">{sub.billingCycle}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${sub.status === 'active' ? 'bg-green-500/20 text-green-400' : sub.status === 'past_due' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                          {sub.status === 'active' ? 'Actif' : sub.status === 'past_due' ? 'En retard' : 'Annulé'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="bg-velatra-bgCard border border-velatra-border rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-velatra-border space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900">Historique des paiements</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input type="text" placeholder="Rechercher un membre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 pl-9 pr-3 text-sm text-zinc-900 font-bold focus:outline-none focus:border-velatra-accent" />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
                {["Tous", "Payé", "En attente", "Échoué"].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterStatus(f)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${filterStatus === f ? 'bg-velatra-accent text-white' : 'bg-zinc-50 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-velatra-bg text-zinc-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Membre</th>
                  <th className="px-6 py-4 font-medium">Montant</th>
                  <th className="px-6 py-4 font-medium">Méthode</th>
                  <th className="px-6 py-4 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-velatra-border">
                {filteredPayments.map(payment => {
                  const member = state.users.find(u => u.id === payment.memberId);
                  return (
                    <tr key={payment.id} className="hover:bg-velatra-bg/50 transition-colors">
                      <td className="px-6 py-4 text-zinc-500">{new Date(payment.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-medium text-zinc-900">{member?.name || 'Inconnu'}</td>
                      <td className="px-6 py-4 text-zinc-900 font-medium">{payment.amount} €</td>
                      <td className="px-6 py-4 text-zinc-500 capitalize flex items-center gap-2">
                        <CreditCard className="w-4 h-4" /> {payment.method}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-max ${payment.status === 'paid' ? 'bg-green-500/20 text-green-400' : payment.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                          {payment.status === 'paid' ? <CheckCircle className="w-3 h-3" /> : payment.status === 'pending' ? <Clock className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {payment.status === 'paid' ? 'Payé' : payment.status === 'pending' ? 'En attente' : 'Échoué'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-zinc-900">Vos formules d'abonnement</h2>
            <button 
              onClick={() => setIsAddingPlan(true)}
              className="bg-velatra-accent hover:bg-velatra-accentDark text-zinc-900 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Formule</span>
            </button>
          </div>

          {isAddingPlan && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-velatra-bgCard border border-velatra-border rounded-xl p-6"
            >
              <h3 className="text-lg font-medium text-zinc-900 mb-4">Créer une formule</h3>
              <form onSubmit={handleAddPlan} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-500 mb-1">Nom de la formule</label>
                  <input required type="text" value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} className="w-full bg-velatra-bg border border-velatra-border rounded-lg p-2 text-zinc-900" placeholder="Ex: Annuel" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-500 mb-1">Prix (€)</label>
                  <input required type="number" step="0.01" value={newPlan.price || ''} onChange={e => setNewPlan({...newPlan, price: Number(e.target.value) || 0})} className="w-full bg-velatra-bg border border-velatra-border rounded-lg p-2 text-zinc-900" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-500 mb-1">Cycle de facturation</label>
                  <select value={newPlan.billingCycle} onChange={e => setNewPlan({...newPlan, billingCycle: e.target.value as any})} className="w-full bg-velatra-bg border border-velatra-border rounded-lg p-2 text-zinc-900">
                    <option value="monthly">Mensuel</option>
                    <option value="yearly">Annuel</option>
                    <option value="once">Paiement unique</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-500 mb-1">Description</label>
                  <input type="text" value={newPlan.description} onChange={e => setNewPlan({...newPlan, description: e.target.value})} className="w-full bg-velatra-bg border border-velatra-border rounded-lg p-2 text-zinc-900" placeholder="Avantages inclus..." />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setIsAddingPlan(false)} className="px-4 py-2 text-zinc-500 hover:text-zinc-900 transition-colors">Annuler</button>
                  <button type="submit" className="bg-velatra-accent text-white px-6 py-2 rounded-lg font-medium hover:bg-velatra-accentDark transition-colors">Enregistrer</button>
                </div>
              </form>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {state.plans.map(plan => (
              <div key={plan.id} className="bg-velatra-bgCard border border-velatra-border rounded-2xl p-6 relative group">
                <button 
                  onClick={() => handleDeletePlan(plan.id)}
                  className="absolute top-4 right-4 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="w-12 h-12 bg-velatra-bg rounded-xl border border-velatra-border flex items-center justify-center text-velatra-accent mb-4">
                  <Package className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-display font-bold text-zinc-900">{plan.price}€</span>
                  <span className="text-zinc-500 text-sm">/{plan.billingCycle === 'monthly' ? 'mois' : plan.billingCycle === 'yearly' ? 'an' : 'fois'}</span>
                </div>
                {plan.description && <p className="text-sm text-zinc-500">{plan.description}</p>}
              </div>
            ))}
            {state.plans.length === 0 && !isAddingPlan && (
              <div className="col-span-3 text-center py-12 border border-dashed border-velatra-border rounded-2xl">
                <p className="text-zinc-500">Aucune formule créée. Ajoutez votre première formule d'abonnement.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
