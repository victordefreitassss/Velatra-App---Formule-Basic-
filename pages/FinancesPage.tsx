import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AppState, Subscription, Payment, Plan, Expense, Invoice } from '../types';
import { db, doc, updateDoc, setDoc, deleteDoc } from '../firebase';
import { Plus, Search, Trash2, DollarSign, TrendingUp, CreditCard, AlertCircle, CheckCircle, Clock, User, Package, FileText, MessageCircle, Link as LinkIcon, Download, TrendingDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { SupplementsPage } from './SupplementsPage';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ amount: 0, category: 'other', date: new Date().toISOString().split('T')[0], description: '', vatRate: 20 });
  const [isAddingFixedCost, setIsAddingFixedCost] = useState(false);
  const [newFixedCost, setNewFixedCost] = useState({ name: '', amount: 0 });
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState(state.currentClub?.settings?.finances?.monthlyGoal || 5000);
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

  // TVA Calculations
  const tvaCollected = state.payments.reduce((acc, payment) => {
    if (payment.status !== 'paid') return acc;
    const rate = payment.vatRate || 20;
    const ht = payment.amount / (1 + rate / 100);
    return acc + (payment.amount - ht);
  }, 0);

  const tvaDeductible = state.expenses.reduce((acc, expense) => {
    const rate = expense.vatRate || 20;
    const ht = expense.amount / (1 + rate / 100);
    return acc + (expense.amount - ht);
  }, 0);

  const tvaNet = tvaCollected - tvaDeductible;

  // Financial Goals
  const monthlyGoal = state.currentClub?.settings?.finances?.monthlyGoal || 5000;
  const goalProgress = Math.min((mrr / monthlyGoal) * 100, 100);

  // Cash Flow Projection (Next Month)
  const projectedRevenue = mrr + (state.payments.filter(p => p.category === 'coaching' || p.category === 'boutique').reduce((acc, p) => acc + p.amount, 0) / 3); // Rough estimate: MRR + average monthly one-off sales

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

    const totalMonthlyFixedCosts = (state.fixedCosts || []).reduce((acc, cost) => acc + cost.amount, 0);
    monthlyData.forEach(md => {
      md.exp += totalMonthlyFixedCosts;
    });

    return monthlyData.map(md => ({
      name: md.name,
      Revenus: md.rev,
      Dépenses: md.exp,
      Bénéfice: md.rev - md.exp
    }));
  }, [state.payments, state.expenses, state.fixedCosts]);

  const pieChartData = useMemo(() => {
    const categories = {
      subscription: { name: 'Abonnements', value: 0, color: '#F27D26' },
      coaching: { name: 'Coaching', value: 0, color: '#141414' },
      boutique: { name: 'Boutique', value: 0, color: '#E4E3E0' },
      other: { name: 'Autre', value: 0, color: '#A1A1AA' }
    };

    state.payments.filter(p => p.status === 'paid').forEach(p => {
      const cat = p.category || 'other';
      if (categories[cat]) {
        categories[cat].value += p.amount;
      } else {
        categories.other.value += p.amount;
      }
    });

    return Object.values(categories).filter(c => c.value > 0);
  }, [state.payments]);

  const handleExportCSV = () => {
    const csvRows = [];
    const headers = [
      'Date', 
      'Type', 
      'Catégorie', 
      'Description / Client', 
      'Montant HT (€)', 
      'Taux TVA (%)', 
      'Montant TVA (€)', 
      'Montant TTC (€)', 
      'Statut'
    ];
    csvRows.push(headers.join(';')); // Use semicolon for Excel in Europe

    const formatNum = (num: number) => num.toFixed(2).replace('.', ',');

    const allTransactions = [
      ...state.payments.map(p => ({ ...p, type: 'Revenu', dateObj: new Date(p.date) })),
      ...state.expenses.map(e => ({ ...e, type: 'Dépense', dateObj: new Date(e.date) }))
    ].sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

    allTransactions.forEach(t => {
      if (t.type === 'Revenu') {
        const payment = t as any;
        const member = state.users.find(m => m.id === payment.memberId);
        const memberName = member ? member.name : 'Client Inconnu';
        const rate = payment.vatRate || 20;
        const ht = payment.amount / (1 + rate / 100);
        const tva = payment.amount - ht;

        csvRows.push([
          payment.dateObj.toLocaleDateString('fr-FR'),
          'Revenu',
          payment.category || 'Autre',
          `"${memberName}"`,
          formatNum(ht),
          formatNum(rate),
          formatNum(tva),
          formatNum(payment.amount),
          payment.status === 'paid' ? 'Payé' : payment.status === 'pending' ? 'En attente' : 'Échoué'
        ].join(';'));
      } else {
        const expense = t as any;
        const rate = expense.vatRate || 20;
        const ht = expense.amount / (1 + rate / 100);
        const tva = expense.amount - ht;

        csvRows.push([
          expense.dateObj.toLocaleDateString('fr-FR'),
          'Dépense',
          expense.category,
          `"${expense.description}"`,
          formatNum(-ht),
          formatNum(rate),
          formatNum(-tva),
          formatNum(-expense.amount),
          'Payé'
        ].join(';'));
      }
    });

    (state.fixedCosts || []).forEach(cost => {
      const rate = 20;
      const ht = cost.amount / (1 + rate / 100);
      const tva = cost.amount - ht;

      csvRows.push([
        new Date().toLocaleDateString('fr-FR'),
        'Charge Fixe',
        'Mensuelle',
        `"${cost.name}"`,
        formatNum(-ht),
        formatNum(rate),
        formatNum(-tva),
        formatNum(-cost.amount),
        'Projeté'
      ].join(';'));
    });

    const csvContent = "\uFEFF" + csvRows.join("\n"); // Add BOM for Excel UTF-8
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `export_comptable_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const clubName = state.currentClub?.name || 'Mon Club';
    
    doc.setFontSize(22);
    doc.text('Bilan Comptable', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Club: ${clubName}`, 14, 30);
    doc.text(`Date d'export: ${new Date().toLocaleDateString('fr-FR')}`, 14, 36);

    // Summary Box
    doc.setFillColor(245, 245, 245);
    doc.rect(14, 42, 182, 35, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('RÉSUMÉ FINANCIER', 20, 50);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Revenus TTC: ${totalRevenue.toFixed(2)} €`, 20, 58);
    doc.text(`Total Dépenses TTC: ${totalExpenses.toFixed(2)} €`, 20, 65);
    doc.setFont('helvetica', 'bold');
    doc.text(`Bénéfice Net TTC: ${netProfit.toFixed(2)} €`, 20, 72);

    doc.setFont('helvetica', 'normal');
    doc.text(`TVA Collectée: ${tvaCollected.toFixed(2)} €`, 110, 58);
    doc.text(`TVA Déductible: ${tvaDeductible.toFixed(2)} €`, 110, 65);
    doc.setFont('helvetica', 'bold');
    doc.text(`TVA Nette: ${tvaNet.toFixed(2)} €`, 110, 72);

    const tableData: any[] = [];
    
    const allTransactions = [
      ...state.payments.filter(p => p.status === 'paid').map(p => ({ ...p, type: 'Revenu', dateObj: new Date(p.date) })),
      ...state.expenses.map(e => ({ ...e, type: 'Dépense', dateObj: new Date(e.date) }))
    ].sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

    allTransactions.forEach(t => {
      if (t.type === 'Revenu') {
        const payment = t as any;
        const member = state.users.find(m => m.id === payment.memberId);
        const memberName = member ? member.name : 'Client Inconnu';
        const rate = payment.vatRate || 20;
        const ht = payment.amount / (1 + rate / 100);
        const tva = payment.amount - ht;

        tableData.push([
          payment.dateObj.toLocaleDateString('fr-FR'),
          'Revenu',
          payment.category || 'Autre',
          memberName,
          `${ht.toFixed(2)} €`,
          `${tva.toFixed(2)} €`,
          `${payment.amount.toFixed(2)} €`
        ]);
      } else {
        const expense = t as any;
        const rate = expense.vatRate || 20;
        const ht = expense.amount / (1 + rate / 100);
        const tva = expense.amount - ht;

        tableData.push([
          expense.dateObj.toLocaleDateString('fr-FR'),
          'Dépense',
          expense.category,
          expense.description,
          `-${ht.toFixed(2)} €`,
          `-${tva.toFixed(2)} €`,
          `-${expense.amount.toFixed(2)} €`
        ]);
      }
    });

    autoTable(doc, {
      startY: 85,
      head: [['Date', 'Type', 'Catégorie', 'Description', 'HT', 'TVA', 'TTC']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [20, 20, 20] },
      styles: { fontSize: 8 }
    });

    doc.save(`bilan_comptable_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleDownloadInvoice = (payment: Payment) => {
    const doc = new jsPDF();
    const member = state.users.find(m => m.id === payment.memberId);
    const memberName = member ? member.name : 'Client Inconnu';
    const clubName = state.currentClub?.name || 'Mon Club';

    doc.setFontSize(20);
    doc.text('FACTURE', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Club: ${clubName}`, 20, 40);
    doc.text(`Date: ${new Date(payment.date).toLocaleDateString('fr-FR')}`, 20, 50);
    doc.text(`Facture N°: ${payment.id.substring(0, 8).toUpperCase()}`, 20, 60);
    
    doc.text(`Client: ${memberName}`, 120, 40);
    
    autoTable(doc, {
      startY: 80,
      head: [['Description', 'Montant HT', 'TVA', 'Montant TTC']],
      body: [
        [
          `Paiement - ${payment.category || 'Service'}`, 
          `${(payment.amount / 1.2).toFixed(2)} €`, 
          '20%', 
          `${payment.amount.toFixed(2)} €`
        ],
      ],
    });

    doc.save(`facture_${payment.id.substring(0, 8)}.pdf`);
  };

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

  const [confirmDeletePlanId, setConfirmDeletePlanId] = useState<string | null>(null);
  const [confirmDeleteExpenseId, setConfirmDeleteExpenseId] = useState<string | null>(null);

  const confirmDeletePlan = async () => {
    if (!confirmDeletePlanId) return;
    try {
      await deleteDoc(doc(db, "plans", confirmDeletePlanId));
    } catch (err) {
      console.error("Error deleting plan", err);
    } finally {
      setConfirmDeletePlanId(null);
    }
  };

  const handleDeletePlan = async (id: string) => {
    setConfirmDeletePlanId(id);
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
      description: newExpense.description || '',
      vatRate: Number(newExpense.vatRate) || 20
    };
    try {
      await setDoc(doc(db, "expenses", id), expense);
      setIsAddingExpense(false);
      setNewExpense({ amount: 0, category: 'other', date: new Date().toISOString().split('T')[0], description: '', vatRate: 20 });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFixedCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.user?.clubId) return;
    
    const id = Date.now().toString();
    const cost = {
      id,
      clubId: state.user.clubId,
      name: newFixedCost.name,
      amount: Number(newFixedCost.amount)
    };

    try {
      await setDoc(doc(db, "fixedCosts", id), cost);
      setIsAddingFixedCost(false);
      setNewFixedCost({ name: '', amount: 0 });
    } catch (err) {
      console.error("Error adding fixed cost", err);
    }
  };

  const handleDeleteFixedCost = async (id: string) => {
    try {
      await deleteDoc(doc(db, "fixedCosts", id));
    } catch (err) {
      console.error("Error deleting fixed cost", err);
    }
  };

  const handleUpdateGoal = async () => {
    if (!state.currentClub?.id) return;
    try {
      await updateDoc(doc(db, "clubs", state.currentClub.id), {
        'settings.finances.monthlyGoal': Number(newGoal)
      });
      setIsEditingGoal(false);
    } catch (err) {
      console.error("Error updating goal", err);
    }
  };

  const confirmDeleteExpense = async () => {
    if (!confirmDeleteExpenseId) return;
    try {
      await deleteDoc(doc(db, "expenses", confirmDeleteExpenseId));
    } catch (err) {
      console.error("Error deleting expense", err);
    } finally {
      setConfirmDeleteExpenseId(null);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    setConfirmDeleteExpenseId(id);
  };

  const [confirmRefundPaymentId, setConfirmRefundPaymentId] = useState<string | null>(null);

  const confirmRefundPayment = async () => {
    if (!confirmRefundPaymentId) return;
    const payment = state.payments.find(p => p.id === confirmRefundPaymentId);
    if (!payment) return;

    try {
      if (showToast) showToast("Remboursement en cours...", "info");
      await updateDoc(doc(db, "payments", payment.id), { status: 'failed' });
      if (showToast) showToast("Paiement marqué comme remboursé avec succès !");
    } catch (e) {
      if (showToast) showToast("Erreur lors du remboursement", "error");
    } finally {
      setConfirmRefundPaymentId(null);
    }
  };

  const handleUpdatePaymentCategory = async (paymentId: string, category: 'subscription' | 'coaching' | 'boutique' | 'other') => {
    try {
      await updateDoc(doc(db, "payments", paymentId), { category });
      showToast("Catégorie mise à jour", "success");
    } catch (err) {
      console.error("Error updating payment category:", err);
      showToast("Erreur lors de la mise à jour", "error");
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
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-velatra-accent text-zinc-900 px-4 py-2 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(242,125,38,0.4)] hover:bg-velatra-accent/90 transition-colors whitespace-nowrap"
          >
            <FileText className="w-4 h-4" />
            Bilan PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-velatra-bgCard border  text-zinc-900 px-4 py-2 rounded-xl text-sm font-medium hover:bg-velatra-border transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <div className="flex bg-velatra-bgCard p-1 rounded-xl border  overflow-x-auto">
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
              className="bg-velatra-bgCard border  rounded-2xl p-6 relative overflow-hidden group cursor-pointer hover:border-velatra-accent/50 transition-colors"
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

            <div className="bg-velatra-bgCard border  rounded-2xl p-6 relative overflow-hidden group">
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

            <div className="bg-velatra-bgCard border  rounded-2xl p-6 relative overflow-hidden group">
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

            <div className="bg-velatra-bgCard border  rounded-2xl p-6 relative overflow-hidden group">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-velatra-bgCard border  rounded-2xl p-6 relative overflow-hidden group">
              <div className="flex justify-between items-start relative z-10">
                <div className="w-full">
                  <p className="text-zinc-500 font-medium mb-2 flex items-center justify-between">
                    Objectif Mensuel
                    <span className="text-velatra-accent font-bold">{goalProgress.toFixed(0)}%</span>
                  </p>
                  
                  {isEditingGoal ? (
                    <div className="flex items-center gap-2 mb-4">
                      <input 
                        type="number" 
                        value={newGoal} 
                        onChange={e => setNewGoal(Number(e.target.value))}
                        className="w-24 bg-velatra-bg border  rounded-lg p-1 text-zinc-900 text-lg font-bold"
                      />
                      <button onClick={handleUpdateGoal} className="bg-velatra-accent text-zinc-900 px-3 py-1 rounded-lg text-sm font-bold">OK</button>
                      <button onClick={() => setIsEditingGoal(false)} className="text-zinc-500 hover:text-zinc-900 text-sm">Annuler</button>
                    </div>
                  ) : (
                    <h3 
                      className="text-2xl font-display font-bold text-zinc-900 mb-4 cursor-pointer hover:text-velatra-accent transition-colors"
                      onClick={() => setIsEditingGoal(true)}
                      title="Modifier l'objectif"
                    >
                      {mrr.toFixed(0)} € / {monthlyGoal} €
                    </h3>
                  )}

                  <div className="w-full bg-zinc-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-velatra-accent h-3 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${goalProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-velatra-bgCard border  rounded-2xl p-6 relative overflow-hidden group">
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-zinc-500 font-medium mb-1">Prévision Trésorerie (M+1)</p>
                  <h3 className="text-2xl font-display font-bold text-zinc-900">{projectedRevenue.toFixed(2)} €</h3>
                  <p className="text-sm text-zinc-500 mt-2">Basé sur le MRR et la moyenne des ventes</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-500">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="bg-velatra-bgCard border  rounded-2xl p-6 relative overflow-hidden group">
              <div className="flex justify-between items-start relative z-10">
                <div className="w-full">
                  <p className="text-zinc-500 font-medium mb-2">Bilan TVA</p>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-zinc-500">Collectée</span>
                    <span className="font-medium text-zinc-900">{tvaCollected.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-zinc-500">Déductible</span>
                    <span className="font-medium text-zinc-900">-{tvaDeductible.toFixed(2)} €</span>
                  </div>
                  <div className="w-full h-px bg-velatra-border my-2"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-zinc-900">TVA Nette</span>
                    <span className={`font-bold ${tvaNet > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {tvaNet > 0 ? 'À payer: ' : 'Crédit: '}
                      {Math.abs(tvaNet).toFixed(2)} €
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-velatra-bgCard border  rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-zinc-900 mb-6">Revenus vs Dépenses (6 derniers mois)</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}€`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderRadius: '8px', color: '#18181b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: '#18181b' }}
                    />
                    <Legend />
                    <Bar dataKey="Revenus" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-velatra-bgCard border  rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-zinc-900 mb-6">Répartition des Revenus</h3>
              <div className="h-72 w-full flex items-center justify-center">
                {pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => `${value.toFixed(2)} €`}
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderRadius: '8px', color: '#18181b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-zinc-400 text-sm">Aucune donnée disponible</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-zinc-900">Historique des paiements</h2>
          </div>

          <div className="bg-velatra-bgCard border  rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-velatra-bg text-zinc-500 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Membre</th>
                    <th className="px-6 py-4 font-medium">Catégorie</th>
                    <th className="px-6 py-4 font-medium">Méthode</th>
                    <th className="px-6 py-4 font-medium">Statut</th>
                    <th className="px-6 py-4 font-medium">Montant</th>
                    <th className="px-6 py-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-transparent">
                  {state.payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(payment => {
                    const member = state.users.find(u => Number(u.id) === payment.memberId);
                    return (
                      <tr key={payment.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-4 text-zinc-900">{new Date(payment.date).toLocaleDateString('fr-FR')}</td>
                        <td className="px-6 py-4 text-zinc-900 font-medium">{member ? member.name : 'Client inconnu'}</td>
                        <td className="px-6 py-4 text-zinc-500">
                          <select 
                            className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer hover:bg-zinc-100 rounded px-2 py-1 -ml-2"
                            value={payment.category || 'other'}
                            onChange={(e) => handleUpdatePaymentCategory(payment.id, e.target.value as any)}
                          >
                            <option value="subscription">Abonnement</option>
                            <option value="coaching">Coaching</option>
                            <option value="boutique">Boutique</option>
                            <option value="other">Autre</option>
                          </select>
                        </td>
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
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                          {payment.status === 'paid' && (
                            <>
                              <button 
                                onClick={() => handleDownloadInvoice(payment)}
                                className="text-velatra-accent hover:text-velatra-accent/80 text-xs font-bold uppercase tracking-wider flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3" />
                                Facture
                              </button>
                              <button 
                                onClick={() => setConfirmRefundPaymentId(payment.id)}
                                className="text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-wider"
                              >
                                Rembourser
                              </button>
                            </>
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
            <div className="bg-velatra-bgCard border  rounded-xl p-6">
              <h3 className="text-lg font-medium text-zinc-900 mb-4">Nouvelle dépense</h3>
              <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-500 mb-1">Description</label>
                  <input required type="text" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} className="w-full bg-velatra-bg border  rounded-lg p-2 text-zinc-900" placeholder="Ex: Loyer, Logiciel..." />
                </div>
                <div>
                  <label className="block text-sm text-zinc-500 mb-1">Montant (€)</label>
                  <input required type="number" step="0.01" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value) || 0})} className="w-full bg-velatra-bg border  rounded-lg p-2 text-zinc-900" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-500 mb-1">Catégorie</label>
                  <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value as any})} className="w-full bg-velatra-bg border  rounded-lg p-2 text-zinc-900">
                    <option value="rent">Loyer</option>
                    <option value="salary">Salaire</option>
                    <option value="equipment">Matériel</option>
                    <option value="marketing">Marketing</option>
                    <option value="software">Logiciels</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-500 mb-1">Taux de TVA (%)</label>
                  <select value={newExpense.vatRate || 20} onChange={e => setNewExpense({...newExpense, vatRate: Number(e.target.value)})} className="w-full bg-velatra-bg border  rounded-lg p-2 text-zinc-900">
                    <option value={20}>20% (Standard)</option>
                    <option value={10}>10% (Intermédiaire)</option>
                    <option value={5.5}>5.5% (Réduit)</option>
                    <option value={2.1}>2.1% (Particulier)</option>
                    <option value={0}>0% (Exonéré)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-500 mb-1">Date</label>
                  <input required type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="w-full bg-velatra-bg border  rounded-lg p-2 text-zinc-900" />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setIsAddingExpense(false)} className="px-4 py-2 text-zinc-500 hover:text-zinc-900 transition-colors">Annuler</button>
                  <button type="submit" className="bg-velatra-accent text-white px-6 py-2 rounded-lg font-medium hover:bg-velatra-accentDark transition-colors">Enregistrer</button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-velatra-bgCard border  rounded-2xl overflow-hidden">
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
                <tbody className="divide-y divide-transparent">
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

          <div className="bg-velatra-bgCard border  rounded-2xl p-6 mt-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">Charges Fixes Mensuelles</h3>
                <p className="text-sm text-zinc-500">Ces charges sont automatiquement prises en compte dans vos prévisions.</p>
              </div>
              <button 
                onClick={() => setIsAddingFixedCost(true)}
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-900 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter une charge</span>
              </button>
            </div>

            {isAddingFixedCost && (
              <div className="bg-velatra-bg border  rounded-xl p-6 mb-6">
                <form onSubmit={handleAddFixedCost} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-500 mb-1">Nom de la charge</label>
                    <input required type="text" value={newFixedCost.name} onChange={e => setNewFixedCost({...newFixedCost, name: e.target.value})} className="w-full bg-white border  rounded-lg p-2 text-zinc-900" placeholder="Ex: Loyer, Électricité..." />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-500 mb-1">Montant Mensuel (€)</label>
                    <input required type="number" step="0.01" value={newFixedCost.amount || ''} onChange={e => setNewFixedCost({...newFixedCost, amount: Number(e.target.value) || 0})} className="w-full bg-white border  rounded-lg p-2 text-zinc-900" />
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                    <button type="button" onClick={() => setIsAddingFixedCost(false)} className="px-4 py-2 text-zinc-500 hover:text-zinc-900 font-medium">Annuler</button>
                    <button type="submit" className="bg-velatra-accent hover:bg-velatra-accentDark text-zinc-900 px-6 py-2 rounded-xl font-bold transition-colors">Enregistrer</button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.fixedCosts?.map(cost => (
                <div key={cost.id} className="bg-velatra-bg border  rounded-xl p-4 flex justify-between items-center group">
                  <div>
                    <p className="font-medium text-zinc-900">{cost.name}</p>
                    <p className="text-sm text-zinc-500">{cost.amount.toFixed(2)} € / mois</p>
                  </div>
                  <button 
                    onClick={() => handleDeleteFixedCost(cost.id)}
                    className="p-2 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {(!state.fixedCosts || state.fixedCosts.length === 0) && (
                <div className="col-span-full text-center py-8 text-zinc-500 border border-dashed  rounded-xl">
                  Aucune charge fixe enregistrée.
                </div>
              )}
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
              className="bg-velatra-bgCard border  rounded-xl p-6"
            >
              <h3 className="text-lg font-medium text-zinc-900 mb-4">Créer une formule</h3>
              <form onSubmit={handleAddPlan} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-500 mb-1">Nom de la formule</label>
                  <input required type="text" value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} className="w-full bg-velatra-bg border  rounded-lg p-2 text-zinc-900" placeholder="Ex: Annuel" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-500 mb-1">Prix (€)</label>
                  <input required type="number" step="0.01" value={newPlan.price || ''} onChange={e => setNewPlan({...newPlan, price: Number(e.target.value) || 0})} className="w-full bg-velatra-bg border  rounded-lg p-2 text-zinc-900" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-500 mb-1">Cycle de facturation</label>
                  <select value={newPlan.billingCycle} onChange={e => setNewPlan({...newPlan, billingCycle: e.target.value as any})} className="w-full bg-velatra-bg border  rounded-lg p-2 text-zinc-900">
                    <option value="monthly">Mensuel</option>
                    <option value="yearly">Annuel</option>
                    <option value="once">Paiement unique</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-500 mb-1">Description</label>
                  <input type="text" value={newPlan.description} onChange={e => setNewPlan({...newPlan, description: e.target.value})} className="w-full bg-velatra-bg border  rounded-lg p-2 text-zinc-900" placeholder="Avantages inclus..." />
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
              <div key={plan.id} className="bg-velatra-bgCard border  rounded-2xl p-6 relative group">
                <button 
                  onClick={() => handleDeletePlan(plan.id)}
                  className="absolute top-4 right-4 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="w-12 h-12 bg-velatra-bg rounded-xl border  flex items-center justify-center text-velatra-accent mb-4">
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
              <div className="col-span-3 text-center py-12 border border-dashed  rounded-2xl">
                <p className="text-zinc-500">Aucune formule créée. Ajoutez votre première formule d'abonnement.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmDeletePlanId && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-xl font-black text-zinc-900 mb-2">Supprimer cette formule ?</h3>
            <p className="text-zinc-500 mb-6">Les abonnements existants ne seront pas impactés.</p>
            <div className="flex gap-3">
              <button className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 px-4 py-3 rounded-xl font-bold transition-colors" onClick={() => setConfirmDeletePlanId(null)}>Annuler</button>
              <button className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-xl font-bold transition-colors" onClick={confirmDeletePlan}>Supprimer</button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {confirmDeleteExpenseId && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-xl font-black text-zinc-900 mb-2">Supprimer cette dépense ?</h3>
            <p className="text-zinc-500 mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 px-4 py-3 rounded-xl font-bold transition-colors" onClick={() => setConfirmDeleteExpenseId(null)}>Annuler</button>
              <button className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-xl font-bold transition-colors" onClick={confirmDeleteExpense}>Supprimer</button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {confirmRefundPaymentId && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-xl font-black text-zinc-900 mb-2">Rembourser le paiement ?</h3>
            <p className="text-zinc-500 mb-6">Voulez-vous vraiment rembourser ce paiement ? Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 px-4 py-3 rounded-xl font-bold transition-colors" onClick={() => setConfirmRefundPaymentId(null)}>Annuler</button>
              <button className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-xl font-bold transition-colors" onClick={confirmRefundPayment}>Rembourser</button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};
