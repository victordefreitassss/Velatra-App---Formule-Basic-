import React, { useState, useMemo } from 'react';
import { AppState, Subscription, Payment, Plan, Expense, Invoice } from '../types';
import { db, doc, updateDoc, setDoc, deleteDoc } from '../firebase';
import { Plus, Search, Trash2, DollarSign, TrendingUp, CreditCard, AlertCircle, CheckCircle, Clock, User, Package, FileText, MessageCircle, Link as LinkIcon, Download, TrendingDown, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { motion } from 'framer-motion';

interface Props {
  state: AppState;
  setState?: any;
  showToast?: any;
}

export const FinancesPage: React.FC<Props> = ({ state, setState, showToast }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'subscriptions' | 'payments' | 'invoices' | 'expenses' | 'plans'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [newPlan, setNewPlan] = useState<Partial<Plan>>({ name: '', price: 0, billingCycle: 'monthly', description: '' });
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ amount: 0, category: 'other', date: new Date().toISOString().split('T')[0], description: '' });
  const [isAnnual, setIsAnnual] = useState(false);

  // Derived Data
  const activeSubscriptions = state.subscriptions.filter(s => s.status === 'active');
  const mrr = activeSubscriptions.reduce((acc, sub) => {
    if (sub.billingCycle === 'monthly') return acc + sub.price;
    if (sub.billingCycle === 'yearly') return acc + (sub.price / 12);
    return acc;
  }, 0);
  
  const arpu = activeSubscriptions.length > 0 ? mrr / activeSubscriptions.length : 0;

  const totalRevenue = state.payments.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0);
  const pendingPayments = state.payments.filter(p => p.status === 'pending').reduce((acc, p) => acc + p.amount, 0);
  const totalExpenses = state.expenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  const filteredExpenses = state.expenses.filter(e => {
    if (!e.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Generate chart data based on real payments and expenses
  const chartData = useMemo(() => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const currentMonth = new Date().getMonth();
    
    const monthlyData = Array(6).fill(0).map((_, i) => {
      const monthIndex = (currentMonth - i + 12) % 12;
      return { name: months[monthIndex], rev: 0, exp: 0, monthIndex };
    }).reverse();

    state.payments.filter(p => p.status === 'paid').forEach(p => {
      const d = new Date(p.date);
      const m = d.getMonth();
      const target = monthlyData.find(md => md.monthIndex === m);
      if (target) target.rev += p.amount;
    });

    state.expenses.forEach(e => {
      const d = new Date(e.date);
      const m = d.getMonth();
      const target = monthlyData.find(md => md.monthIndex === m);
      if (target) target.exp += e.amount;
    });

    return monthlyData.map(md => ({
      name: md.name,
      Revenus: md.rev,
      Dépenses: md.exp,
      Bénéfice: md.rev - md.exp
    }));
  }, [state.payments, state.expenses]);

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

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.user?.clubId) return;
    const id = Date.now().toString();
    const expense: Expense = {
      id,
      clubId: state.user.clubId,
      amount: Number(newExpense.amount),
      category: newExpense.category as any,
      date: newExpense.date || new Date().toISOString(),
      description: newExpense.description || ''
    };
    try {
      await setDoc(doc(db, "expenses", id), expense);
      setIsAddingExpense(false);
      setNewExpense({ amount: 0, category: 'other', date: new Date().toISOString().split('T')[0], description: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm("Supprimer cette dépense ?")) {
      await deleteDoc(doc(db, "expenses", id));
    }
  };

  const handleSyncStripe = async () => {
    if (!state.user?.clubId) {
      if (showToast) showToast("Erreur : club non trouvé.", "error");
      return;
    }
    
    const stripeSecretKey = state.currentClub?.settings?.payment?.stripeSecretKey;
    if (!stripeSecretKey || !stripeSecretKey.startsWith('sk_')) {
      if (showToast) showToast("Veuillez connecter votre compte Stripe dans les paramètres.", "error");
      return;
    }

    try {
      if (showToast) showToast("Synchronisation Stripe en cours...", "info");
      
      const res = await fetch('/api/stripe/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripeSecretKey })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erreur lors de la synchronisation");
      }
      
      const data = await res.json();
      const stripePayments = data.payments;
      const stripeSubscriptions = data.subscriptions;
      
      let addedCount = 0;
      for (const sp of stripePayments) {
        // Check if payment already exists
        const exists = state.payments.some(p => p.stripeChargeId === sp.id);
        if (!exists) {
          // Try to match member by email
          const member = state.users.find(u => u.email?.toLowerCase() === sp.customerEmail?.toLowerCase());
          
          const newPayment: Payment = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            clubId: state.user.clubId,
            memberId: member ? Number(member.id) : 0, // 0 if unknown member
            amount: sp.amount,
            date: sp.date,
            status: sp.status === 'succeeded' ? 'paid' : sp.status === 'pending' ? 'pending' : 'failed',
            method: sp.method,
            stripeChargeId: sp.id
          };
          
          await setDoc(doc(db, "payments", newPayment.id), newPayment);
          addedCount++;
        }
      }

      let subsAddedCount = 0;
      let subsUpdatedCount = 0;
      for (const sub of stripeSubscriptions) {
        // Check if subscription already exists
        const existingSub = state.subscriptions.find(s => s.stripeSubscriptionId === sub.id);
        if (!existingSub) {
          // Try to match member by stripeCustomerId or email
          const member = state.users.find(u => 
            u.stripeCustomerId === sub.customerId || 
            (u.email && sub.customerEmail && u.email.toLowerCase() === sub.customerEmail.toLowerCase())
          );
          
          // Try to match plan by stripePriceId
          const plan = state.plans?.find(p => p.stripePriceId === sub.priceId);

          if (member && plan) {
            // If we matched by email but don't have the customer ID saved, save it
            if (!member.stripeCustomerId && (member as any).firebaseUid) {
              await updateDoc(doc(db, "users", (member as any).firebaseUid), {
                stripeCustomerId: sub.customerId
              });
            }

            const newSubscription: Subscription = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
              clubId: state.user.clubId,
              memberId: Number(member.id),
              planId: plan.id,
              planName: plan.name,
              status: sub.status === 'active' || sub.status === 'trialing' ? 'active' : 'cancelled',
              startDate: sub.currentPeriodStart,
              endDate: sub.currentPeriodEnd,
              price: sub.amount,
              billingCycle: sub.interval === 'year' ? 'yearly' : 'monthly',
              stripeSubscriptionId: sub.id
            };
            
            await setDoc(doc(db, "subscriptions", newSubscription.id), newSubscription);
            subsAddedCount++;
          }
        } else {
          // Update existing subscription if status or dates changed
          const newStatus = sub.status === 'active' || sub.status === 'trialing' ? 'active' : 'cancelled';
          if (existingSub.status !== newStatus || existingSub.endDate !== sub.currentPeriodEnd) {
            await updateDoc(doc(db, "subscriptions", existingSub.id), {
              status: newStatus,
              endDate: sub.currentPeriodEnd
            });
            subsUpdatedCount++;
          }
        }
      }
      
      if (showToast) showToast(`${addedCount} paiement(s), ${subsAddedCount} abonnement(s) ajoutés, ${subsUpdatedCount} mis à jour !`, "success");
    } catch (err) {
      console.error(err);
      if (showToast) showToast(err instanceof Error ? err.message : "Erreur de synchronisation", "error");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 page-transition">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-zinc-900">Finances & Abonnements</h1>
          <p className="text-zinc-500 mt-1">Suivez vos revenus récurrents et paiements.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={handleSyncStripe} className="px-4 py-2 bg-velatra-accent text-white rounded-lg text-sm font-bold uppercase tracking-widest shadow-lg hover:bg-velatra-accent/90 transition-colors flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Sync Stripe
          </button>
          <div className="flex bg-velatra-bgCard p-1 rounded-xl border border-velatra-border overflow-x-auto">
            <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'bg-velatra-bg text-zinc-900 shadow' : 'text-zinc-500 hover:text-zinc-900'}`}>Vue d'ensemble</button>
            <button onClick={() => setActiveTab('payments')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'payments' ? 'bg-velatra-bg text-zinc-900 shadow' : 'text-zinc-500 hover:text-zinc-900'}`}>Paiements</button>
            <button onClick={() => setActiveTab('expenses')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'expenses' ? 'bg-velatra-bg text-zinc-900 shadow' : 'text-zinc-500 hover:text-zinc-900'}`}>Dépenses</button>
            <button onClick={() => setActiveTab('plans')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'plans' ? 'bg-velatra-bg text-zinc-900 shadow' : 'text-zinc-500 hover:text-zinc-900'}`}>Formules</button>
          </div>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div 
              className="bg-velatra-bgCard border border-velatra-border rounded-2xl p-6 relative overflow-hidden group cursor-pointer hover:border-velatra-accent/50 transition-colors"
              onClick={() => setIsAnnual(!isAnnual)}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-velatra-accent/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-zinc-500 font-medium mb-1 flex items-center gap-2">
                    {isAnnual ? 'ARR (Revenu Annuel)' : 'MRR (Revenu Mensuel)'}
                    <span className="text-[10px] bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-500 uppercase tracking-wider">Clic</span>
                  </p>
                  <h3 className="text-4xl font-display font-bold text-zinc-900">
                    {isAnnual ? (mrr * 12).toFixed(2) : mrr.toFixed(2)} €
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-velatra-accent/20 flex items-center justify-center text-velatra-accent">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
              <p className="text-sm text-velatra-success mt-4 flex items-center gap-1"><TrendingUp className="w-4 h-4" /> Basé sur {activeSubscriptions.length} abonnements actifs</p>
            </div>

            <div className="bg-velatra-bgCard border border-velatra-border rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-zinc-500 font-medium mb-1">Panier Moyen (ARPU)</p>
                  <h3 className="text-4xl font-display font-bold text-zinc-900">{arpu.toFixed(2)} €</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500">
                  <Package className="w-6 h-6" />
                </div>
              </div>
              <p className="text-sm text-zinc-500 mt-4">Revenu moyen par abonné</p>
            </div>

            <div className="bg-velatra-bgCard border border-velatra-border rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-zinc-500 font-medium mb-1">Bénéfice Net</p>
                  <h3 className="text-4xl font-display font-bold text-zinc-900">{netProfit.toFixed(2)} €</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
              <p className="text-sm text-zinc-500 mt-4">Revenus ({totalRevenue.toFixed(0)}€) - Dépenses ({totalExpenses.toFixed(0)}€)</p>
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
            <h3 className="text-lg font-semibold text-zinc-900 mb-6">Revenus vs Dépenses (6 derniers mois)</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="name" stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}€`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#141414', borderColor: '#222', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="Revenus" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-zinc-900">Historique des paiements</h2>
          </div>

          <div className="bg-velatra-bgCard border border-velatra-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-velatra-bg text-zinc-500 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Membre</th>
                    <th className="px-6 py-4 font-medium">Méthode</th>
                    <th className="px-6 py-4 font-medium">Statut</th>
                    <th className="px-6 py-4 font-medium">Montant</th>
                    <th className="px-6 py-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-velatra-border">
                  {state.payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(payment => {
                    const member = state.users.find(u => Number(u.id) === payment.memberId);
                    return (
                      <tr key={payment.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-4 text-zinc-900">{new Date(payment.date).toLocaleDateString('fr-FR')}</td>
                        <td className="px-6 py-4 text-zinc-900 font-medium">{member ? member.name : 'Client inconnu'}</td>
                        <td className="px-6 py-4 text-zinc-500 capitalize">{payment.method === 'card' ? 'Carte Bancaire' : payment.method}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            payment.status === 'paid' ? 'bg-green-100 text-green-700' : 
                            payment.status === 'pending' ? 'bg-orange-100 text-orange-700' : 
                            'bg-red-100 text-red-700'
                          }`}>
                            {payment.status === 'paid' ? 'Payé' : payment.status === 'pending' ? 'En attente' : 'Échoué'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-zinc-900">{payment.amount.toFixed(2)} €</td>
                        <td className="px-6 py-4 text-right">
                          {payment.stripeChargeId && payment.status === 'paid' && (
                            <button 
                              onClick={async () => {
                                if (confirm("Voulez-vous vraiment rembourser ce paiement ?")) {
                                  try {
                                    if (showToast) showToast("Remboursement en cours...", "info");
                                    const stripeSecretKey = state.currentClub?.settings?.payment?.stripeSecretKey;
                                    const res = await fetch('/api/stripe/refund', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ stripeSecretKey, chargeId: payment.stripeChargeId })
                                    });
                                    if (res.ok) {
                                      await updateDoc(doc(db, "payments", payment.id), { status: 'failed' });
                                      if (showToast) showToast("Remboursement effectué avec succès !");
                                    } else {
                                      throw new Error("Erreur lors du remboursement");
                                    }
                                  } catch (e) {
                                    if (showToast) showToast("Erreur lors du remboursement", "error");
                                  }
                                }
                              }}
                              className="text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-wider"
                            >
                              Rembourser
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {state.payments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Aucun paiement enregistré.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-zinc-900">Dépenses du club</h2>
            <button 
              onClick={() => setIsAddingExpense(true)}
              className="bg-velatra-accent hover:bg-velatra-accentDark text-zinc-900 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une dépense</span>
            </button>
          </div>

          {isAddingExpense && (
            <div className="bg-velatra-bgCard border border-velatra-border rounded-xl p-6">
              <h3 className="text-lg font-medium text-zinc-900 mb-4">Nouvelle dépense</h3>
              <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-500 mb-1">Description</label>
                  <input required type="text" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} className="w-full bg-velatra-bg border border-velatra-border rounded-lg p-2 text-zinc-900" placeholder="Ex: Loyer, Logiciel..." />
                </div>
                <div>
                  <label className="block text-sm text-zinc-500 mb-1">Montant (€)</label>
                  <input required type="number" step="0.01" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value) || 0})} className="w-full bg-velatra-bg border border-velatra-border rounded-lg p-2 text-zinc-900" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-500 mb-1">Catégorie</label>
                  <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value as any})} className="w-full bg-velatra-bg border border-velatra-border rounded-lg p-2 text-zinc-900">
                    <option value="rent">Loyer</option>
                    <option value="salary">Salaire</option>
                    <option value="equipment">Matériel</option>
                    <option value="marketing">Marketing</option>
                    <option value="software">Logiciels</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-500 mb-1">Date</label>
                  <input required type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="w-full bg-velatra-bg border border-velatra-border rounded-lg p-2 text-zinc-900" />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setIsAddingExpense(false)} className="px-4 py-2 text-zinc-500 hover:text-zinc-900 transition-colors">Annuler</button>
                  <button type="submit" className="bg-velatra-accent text-white px-6 py-2 rounded-lg font-medium hover:bg-velatra-accentDark transition-colors">Enregistrer</button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-velatra-bgCard border border-velatra-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-velatra-bg text-zinc-500 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Description</th>
                    <th className="px-6 py-4 font-medium">Catégorie</th>
                    <th className="px-6 py-4 font-medium">Montant</th>
                    <th className="px-6 py-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-velatra-border">
                  {filteredExpenses.map(expense => (
                    <tr key={expense.id} className="hover:bg-velatra-bg/50 transition-colors">
                      <td className="px-6 py-4 text-zinc-500">{new Date(expense.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-medium text-zinc-900">{expense.description}</td>
                      <td className="px-6 py-4 text-zinc-500 capitalize">{expense.category}</td>
                      <td className="px-6 py-4 text-red-500 font-medium">-{expense.amount} €</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDeleteExpense(expense.id)} className="p-2 text-zinc-500 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">Aucune dépense enregistrée.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
