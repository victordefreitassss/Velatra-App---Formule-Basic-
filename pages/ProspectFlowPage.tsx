import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AppState, CRMClient, CRMFormula, ManualStats, PendingProspect } from '../types';
import { db, doc, setDoc, updateDoc, deleteDoc } from '../firebase';
import { 
  BarChart2, Users, Clock, Settings, Plus, Search, Trash2, Edit2, 
  Copy, CheckCircle, XCircle, AlertCircle, Calendar, DollarSign, Phone, PhoneCall, PhoneForwarded
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays, isBefore, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const ProspectFlowPage: React.FC<Props> = ({ state }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'pending' | 'settings'>('dashboard');
  const [period, setPeriod] = useState<'today' | 'yesterday' | '7days' | '30days'>('7days');
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isAddingFormula, setIsAddingFormula] = useState(false);
  const [isAddingPending, setIsAddingPending] = useState(false);
  const [searchClient, setSearchClient] = useState('');
  const [searchPending, setSearchPending] = useState('');
  
  // Modals state
  const [clientForm, setClientForm] = useState<Partial<CRMClient>>({});
  const [formulaForm, setFormulaForm] = useState<Partial<CRMFormula>>({});
  const [statsForm, setStatsForm] = useState<Partial<ManualStats>>({
    period_type: 'day',
    period_start: format(new Date(), 'yyyy-MM-dd')
  });
  const [pendingForm, setPendingForm] = useState<Partial<PendingProspect>>({});

  const clubId = state.user?.clubId;

  // --- Helpers ---
  const generateId = () => Date.now().toString();

  // --- Dashboard Data ---
  const filteredStats = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    if (period === 'today') startDate = new Date();
    else if (period === 'yesterday') startDate = subDays(now, 1);
    else if (period === '7days') startDate = subDays(now, 7);
    else if (period === '30days') startDate = subDays(now, 30);

    return state.manualStats.filter(s => {
      const statDate = new Date(s.period_start);
      if (period === 'today') return format(statDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
      if (period === 'yesterday') return format(statDate, 'yyyy-MM-dd') === format(startDate, 'yyyy-MM-dd');
      return statDate >= startDate && statDate <= now;
    });
  }, [state.manualStats, period]);

  const aggregatedStats = useMemo(() => {
    return filteredStats.reduce((acc, curr) => ({
      totalContacts: acc.totalContacts + (curr.totalContacts || 0),
      appointmentsTaken: acc.appointmentsTaken + (curr.appointmentsTaken || 0),
      appointmentsProspect: acc.appointmentsProspect + (curr.appointmentsProspect || 0),
      appointmentsSetter: acc.appointmentsSetter + (curr.appointmentsSetter || 0),
      showedUp: acc.showedUp + (curr.showedUp || 0),
      noShow: acc.noShow + (curr.noShow || 0),
      cancelled: acc.cancelled + (curr.cancelled || 0),
      signed: acc.signed + (curr.signed || 0),
      notSigned: acc.notSigned + (curr.notSigned || 0),
      totalCalls: acc.totalCalls + (curr.totalCalls || 0),
      totalPickups: acc.totalPickups + (curr.totalPickups || 0),
    }), {
      totalContacts: 0, appointmentsTaken: 0, appointmentsProspect: 0, appointmentsSetter: 0,
      showedUp: 0, noShow: 0, cancelled: 0, signed: 0, notSigned: 0, totalCalls: 0, totalPickups: 0
    });
  }, [filteredStats]);

  const pickupRate = aggregatedStats.totalCalls > 0 ? Math.round((aggregatedStats.totalPickups / aggregatedStats.totalCalls) * 100) : 0;
  const closingRate = aggregatedStats.showedUp > 0 ? Math.round((aggregatedStats.signed / aggregatedStats.showedUp) * 100) : 0;

  const presenceData = [
    { name: 'Présents', value: aggregatedStats.showedUp },
    { name: 'Absents', value: aggregatedStats.noShow },
    { name: 'Annulés', value: aggregatedStats.cancelled },
  ];

  const signatureData = [
    { name: 'Signés', value: aggregatedStats.signed },
    { name: 'Non Signés', value: aggregatedStats.notSigned },
  ];

  const sourceData = [
    { name: 'Prospect', value: aggregatedStats.appointmentsProspect },
    { name: 'Setter', value: aggregatedStats.appointmentsSetter },
  ];

  // --- Handlers ---
  const saveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId) return;
    const id = clientForm.id || generateId();
    const client: CRMClient = {
      id, clubId,
      firstName: clientForm.firstName || '',
      lastName: clientForm.lastName || '',
      email: clientForm.email || '',
      phone: clientForm.phone || '',
      createdAt: clientForm.createdAt || new Date().toISOString(),
      isActive: clientForm.isActive ?? true,
      formulaId: clientForm.formulaId,
    };
    await setDoc(doc(db, 'crmClients', id), client);
    setIsAddingClient(false);
    setClientForm({});
  };

  const [confirmDeleteClientId, setConfirmDeleteClientId] = useState<string | null>(null);
  const [confirmDeleteFormulaId, setConfirmDeleteFormulaId] = useState<string | null>(null);
  const [confirmDeletePendingId, setConfirmDeletePendingId] = useState<string | null>(null);

  const deleteClient = async (id: string) => {
    setConfirmDeleteClientId(id);
  };

  const confirmDeleteClient = async () => {
    if (!confirmDeleteClientId) return;
    try {
      await deleteDoc(doc(db, 'crmClients', confirmDeleteClientId));
    } catch (err) {
      console.error("Error deleting client", err);
    } finally {
      setConfirmDeleteClientId(null);
    }
  };

  const saveFormula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId) return;
    const id = formulaForm.id || generateId();
    const formula: CRMFormula = {
      id, clubId,
      name: formulaForm.name || '',
      price: Number(formulaForm.price) || 0,
      period: formulaForm.period || 'month',
    };
    await setDoc(doc(db, 'crmFormulas', id), formula);
    setIsAddingFormula(false);
    setFormulaForm({});
  };

  const deleteFormula = async (id: string) => {
    setConfirmDeleteFormulaId(id);
  };

  const confirmDeleteFormula = async () => {
    if (!confirmDeleteFormulaId) return;
    try {
      await deleteDoc(doc(db, 'crmFormulas', confirmDeleteFormulaId));
    } catch (err) {
      console.error("Error deleting formula", err);
    } finally {
      setConfirmDeleteFormulaId(null);
    }
  };

  const saveManualStats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId) return;
    const id = statsForm.id || generateId();
    const stats: ManualStats = {
      id, clubId,
      period_start: statsForm.period_start || format(new Date(), 'yyyy-MM-dd'),
      period_type: statsForm.period_type || 'day',
      totalContacts: Number(statsForm.totalContacts) || 0,
      appointmentsTaken: Number(statsForm.appointmentsTaken) || 0,
      appointmentsProspect: Number(statsForm.appointmentsProspect) || 0,
      appointmentsSetter: Number(statsForm.appointmentsSetter) || 0,
      showedUp: Number(statsForm.showedUp) || 0,
      noShow: Number(statsForm.noShow) || 0,
      cancelled: Number(statsForm.cancelled) || 0,
      signed: Number(statsForm.signed) || 0,
      notSigned: Number(statsForm.notSigned) || 0,
      totalCalls: Number(statsForm.totalCalls) || 0,
      totalPickups: Number(statsForm.totalPickups) || 0,
      contactsDigital: Number(statsForm.contactsDigital) || 0,
      contactsNonDigital: Number(statsForm.contactsNonDigital) || 0,
      notes: statsForm.notes || '',
    };
    await setDoc(doc(db, 'manualStats', id), stats);
    setStatsForm({ period_type: 'day', period_start: format(new Date(), 'yyyy-MM-dd') });
    alert('Statistiques enregistrées !');
  };

  const savePending = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId) return;
    const id = pendingForm.id || generateId();
    const pending: PendingProspect = {
      id, clubId,
      email: pendingForm.email || '',
      createdAt: pendingForm.createdAt || new Date().toISOString(),
      reminderDate: pendingForm.reminderDate || new Date().toISOString(),
      status: pendingForm.status || 'PENDING',
    };
    await setDoc(doc(db, 'pendingProspects', id), pending);
    setIsAddingPending(false);
    setPendingForm({});
  };

  const deletePending = async (id: string) => {
    setConfirmDeletePendingId(id);
  };

  const confirmDeletePending = async () => {
    if (!confirmDeletePendingId) return;
    try {
      await deleteDoc(doc(db, 'pendingProspects', confirmDeletePendingId));
    } catch (err) {
      console.error("Error deleting pending prospect", err);
    } finally {
      setConfirmDeletePendingId(null);
    }
  };

  const generateReport = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayStats = state.manualStats.find(s => s.period_start === todayStr);
    
    if (!todayStats) {
      alert("Aucune statistique trouvée pour aujourd'hui.");
      return;
    }

    // Calculate CA Généré
    const todayClients = state.crmClients.filter(c => c.createdAt && c.createdAt.startsWith(todayStr));
    const caGenere = todayClients.reduce((total, client) => {
      if (client.formulaId) {
        const formula = state.crmFormulas.find(f => f.id === client.formulaId);
        if (formula) return total + formula.price;
      }
      return total;
    }, 0);

    const text = `📊 Reporting du ${format(new Date(), 'dd/MM/yyyy')}
📞 Appels: ${todayStats.totalCalls} (${todayStats.totalPickups} décrochés)
📅 RDV Pris: ${todayStats.appointmentsTaken}
🤝 Présents: ${todayStats.showedUp}
✍️ Signatures: ${todayStats.signed}
💰 CA Généré: ${caGenere}€`;
    navigator.clipboard.writeText(text);
    alert("Reporting copié dans le presse-papiers !");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 page-transition pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-zinc-900 tracking-tight">ProspectFlow <span className="text-velatra-accent">Manager</span></h1>
          <p className="text-zinc-500 mt-1">Gérez vos prospects, analysez vos appels et convertissez plus.</p>
        </div>
        
        <div className="flex bg-zinc-50 p-1 rounded-xl border border-zinc-200 overflow-x-auto max-w-full shadow-lg backdrop-blur-sm">
          {[
            { id: 'dashboard', icon: BarChart2, label: 'Tableau de bord' },
            { id: 'clients', icon: Users, label: 'Base Clients' },
            { id: 'pending', icon: Clock, label: 'En attente' },
            { id: 'settings', icon: Settings, label: 'Paramètres' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-velatra-accent text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- DASHBOARD --- */}
      {activeTab === 'dashboard' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex justify-between items-center">
            <select 
              value={period} 
              onChange={(e) => setPeriod(e.target.value as any)}
              className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-zinc-900 focus:outline-none focus:border-velatra-accent shadow-lg backdrop-blur-sm"
            >
              <option value="today" className="bg-velatra-bgCard">Aujourd'hui</option>
              <option value="yesterday" className="bg-velatra-bgCard">Hier</option>
              <option value="7days" className="bg-velatra-bgCard">7 derniers jours</option>
              <option value="30days" className="bg-velatra-bgCard">30 derniers jours</option>
            </select>
            <button onClick={generateReport} className="bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 text-zinc-900 px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg font-medium backdrop-blur-sm">
              <Copy className="w-4 h-4" /> Reporting
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-velatra-bgCard border border-zinc-200 rounded-2xl p-5 shadow-2xl">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Appels</p>
              <p className="text-3xl font-black text-zinc-900">{aggregatedStats.totalCalls}</p>
            </div>
            <div className="bg-velatra-bgCard border border-zinc-200 rounded-2xl p-5 shadow-2xl">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Taux Décroché</p>
              <p className="text-3xl font-black text-zinc-900">{pickupRate}%</p>
            </div>
            <div className="bg-velatra-bgCard border border-zinc-200 rounded-2xl p-5 shadow-2xl">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">RDV Pris</p>
              <p className="text-3xl font-black text-zinc-900">{aggregatedStats.appointmentsTaken}</p>
            </div>
            <div className="bg-velatra-bgCard border border-zinc-200 rounded-2xl p-5 shadow-2xl">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Taux Closing</p>
              <p className="text-3xl font-black text-zinc-900">{closingRate}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-velatra-bgCard border border-zinc-200 rounded-2xl p-6 h-80 shadow-2xl">
              <h3 className="text-lg font-bold text-zinc-900 mb-4 text-center">Présence aux RDV</h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={presenceData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {presenceData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#121212', borderColor: '#222222', borderRadius: '12px', color: '#ffffff' }} itemStyle={{ color: '#ffffff' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-velatra-bgCard border border-zinc-200 rounded-2xl p-6 h-80 shadow-2xl">
              <h3 className="text-lg font-bold text-zinc-900 mb-4 text-center">Signatures</h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={signatureData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {signatureData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#121212', borderColor: '#222222', borderRadius: '12px', color: '#ffffff' }} itemStyle={{ color: '#ffffff' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-velatra-bgCard border border-zinc-200 rounded-2xl p-6 h-80 shadow-2xl">
              <h3 className="text-lg font-bold text-zinc-900 mb-4 text-center">Sources des RDV</h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {sourceData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#121212', borderColor: '#222222', borderRadius: '12px', color: '#ffffff' }} itemStyle={{ color: '#ffffff' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {/* --- CLIENTS --- */}
      {activeTab === 'clients' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-bold text-zinc-900">Base Clients</h2>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Rechercher un client..."
                  value={searchClient}
                  onChange={(e) => setSearchClient(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:border-velatra-accent transition-colors"
                />
              </div>
              <button onClick={() => setIsAddingClient(true)} className="bg-velatra-accent text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:bg-velatra-accentDark transition-colors w-full sm:w-auto justify-center">
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>
          </div>

          {isAddingClient && (
            <div className="bg-velatra-bgCard border border-zinc-200 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-zinc-900 mb-4">{clientForm.id ? 'Modifier' : 'Ajouter'} un client</h3>
              <form onSubmit={saveClient} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required placeholder="Prénom" value={clientForm.firstName || ''} onChange={e => setClientForm({...clientForm, firstName: e.target.value})} className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-900 focus:outline-none focus:border-velatra-accent focus:bg-zinc-100 transition-colors" />
                <input placeholder="Nom" value={clientForm.lastName || ''} onChange={e => setClientForm({...clientForm, lastName: e.target.value})} className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-900 focus:outline-none focus:border-velatra-accent focus:bg-zinc-100 transition-colors" />
                <input type="email" placeholder="Email" value={clientForm.email || ''} onChange={e => setClientForm({...clientForm, email: e.target.value})} className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-900 focus:outline-none focus:border-velatra-accent focus:bg-zinc-100 transition-colors" />
                <input type="tel" placeholder="Téléphone" value={clientForm.phone || ''} onChange={e => setClientForm({...clientForm, phone: e.target.value})} className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-900 focus:outline-none focus:border-velatra-accent focus:bg-zinc-100 transition-colors" />
                <select value={clientForm.formulaId || ''} onChange={e => setClientForm({...clientForm, formulaId: e.target.value})} className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-900 focus:outline-none focus:border-velatra-accent focus:bg-zinc-100 transition-colors">
                  <option value="" className="bg-velatra-bgCard">Sélectionner une formule</option>
                  {state.crmFormulas.map(f => <option key={f.id} value={f.id} className="bg-velatra-bgCard">{f.name} ({f.price}€)</option>)}
                </select>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={clientForm.isActive ?? true} onChange={e => setClientForm({...clientForm, isActive: e.target.checked})} className="w-5 h-5 accent-velatra-accent" />
                  <label className="text-zinc-900 font-medium">Client Actif</label>
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setIsAddingClient(false)} className="px-4 py-2 text-zinc-500 hover:text-zinc-900 font-medium">Annuler</button>
                  <button type="submit" className="bg-velatra-accent text-white px-6 py-2 rounded-xl font-medium hover:bg-velatra-accentDark transition-colors shadow-[0_0_15px_rgba(99,102,241,0.4)]">Enregistrer</button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-velatra-bgCard border border-zinc-200 rounded-2xl overflow-hidden shadow-2xl">
            <table className="w-full text-left text-sm text-zinc-900">
              <thead className="bg-zinc-50 text-zinc-500 uppercase text-xs border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-4">Nom</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Formule</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {state.crmClients
                  .filter(c => 
                    (c.firstName + ' ' + c.lastName).toLowerCase().includes(searchClient.toLowerCase()) ||
                    c.email.toLowerCase().includes(searchClient.toLowerCase()) ||
                    c.phone.toLowerCase().includes(searchClient.toLowerCase())
                  )
                  .map(client => {
                  const formula = state.crmFormulas.find(f => f.id === client.formulaId);
                  return (
                    <tr key={client.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4 font-medium">{client.firstName} {client.lastName}</td>
                      <td className="px-6 py-4 text-zinc-500">{client.email}<br/>{client.phone}</td>
                      <td className="px-6 py-4">{formula ? formula.name : '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${client.isActive ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                          {client.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => { setClientForm(client); setIsAddingClient(true); }} className="text-zinc-500 hover:text-velatra-accent p-2"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteClient(client.id)} className="text-zinc-500 hover:text-red-400 p-2"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  );
                })}
                {state.crmClients.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-zinc-500">Aucun client trouvé.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* --- PENDING PROSPECTS --- */}
      {activeTab === 'pending' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-bold text-zinc-900">Prospects à recontacter</h2>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Rechercher un prospect..."
                  value={searchPending}
                  onChange={(e) => setSearchPending(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:border-velatra-accent transition-colors"
                />
              </div>
              <button onClick={() => setIsAddingPending(true)} className="bg-velatra-accent text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:bg-velatra-accentDark transition-colors w-full sm:w-auto justify-center">
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>
          </div>

          {isAddingPending && (
            <div className="bg-velatra-bgCard border border-zinc-200 rounded-2xl p-6 shadow-2xl">
              <form onSubmit={savePending} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required type="email" placeholder="Email du prospect" value={pendingForm.email || ''} onChange={e => setPendingForm({...pendingForm, email: e.target.value})} className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-900 focus:outline-none focus:border-velatra-accent focus:bg-zinc-100 transition-colors" />
                <input required type="date" value={pendingForm.reminderDate ? format(new Date(pendingForm.reminderDate), 'yyyy-MM-dd') : ''} onChange={e => setPendingForm({...pendingForm, reminderDate: new Date(e.target.value).toISOString()})} className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-900 focus:outline-none focus:border-velatra-accent focus:bg-zinc-100 transition-colors" />
                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setIsAddingPending(false)} className="px-4 py-2 text-zinc-500 hover:text-zinc-900 font-medium">Annuler</button>
                  <button type="submit" className="bg-velatra-accent text-white px-6 py-2 rounded-xl font-medium hover:bg-velatra-accentDark transition-colors shadow-[0_0_15px_rgba(99,102,241,0.4)]">Enregistrer</button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.pendingProspects
              .filter(p => p.email.toLowerCase().includes(searchPending.toLowerCase()))
              .map(prospect => {
              const isOverdue = isBefore(new Date(prospect.reminderDate), new Date()) && prospect.status === 'PENDING';
              return (
                <div key={prospect.id} className={`bg-velatra-bgCard border rounded-2xl p-5 shadow-2xl ${isOverdue ? 'border-red-500/30 bg-red-500/5' : 'border-zinc-200'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-zinc-900 truncate pr-4">{prospect.email}</h3>
                    {isOverdue && <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                  </div>
                  <div className="space-y-2 text-sm text-zinc-500 mb-4">
                    <p>Ajouté le: {format(new Date(prospect.createdAt), 'dd/MM/yyyy')}</p>
                    <p className={isOverdue ? 'text-red-400 font-medium' : ''}>Rappel: {format(new Date(prospect.reminderDate), 'dd/MM/yyyy')}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${prospect.status === 'CONTACTED' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                      {prospect.status === 'CONTACTED' ? 'Contacté' : 'En attente'}
                    </span>
                    <div className="flex gap-2">
                      {prospect.status === 'PENDING' && (
                        <button onClick={() => { setPendingForm({...prospect, status: 'CONTACTED'}); savePending({preventDefault: () => {}} as any); }} className="text-green-400 hover:bg-green-500/20 p-2 rounded-lg transition-colors"><CheckCircle className="w-4 h-4" /></button>
                      )}
                      <button onClick={() => deletePending(prospect.id)} className="text-red-400 hover:bg-red-500/20 p-2 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
            {state.pendingProspects.length === 0 && (
              <div className="col-span-full text-center py-10 text-zinc-500">Aucun prospect en attente.</div>
            )}
          </div>
        </motion.div>
      )}

      {/* --- SETTINGS --- */}
      {activeTab === 'settings' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          
          {/* Formulas */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-zinc-900">Formules</h2>
              <button onClick={() => setIsAddingFormula(true)} className="bg-zinc-50 border border-zinc-200 text-zinc-900 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-zinc-100 transition-colors shadow-lg font-medium backdrop-blur-sm">
                <Plus className="w-4 h-4" /> Nouvelle Formule
              </button>
            </div>
            
            {isAddingFormula && (
              <div className="bg-velatra-bgCard border border-zinc-200 rounded-2xl p-6 mb-4 shadow-2xl">
                <form onSubmit={saveFormula} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input required placeholder="Nom de la formule" value={formulaForm.name || ''} onChange={e => setFormulaForm({...formulaForm, name: e.target.value})} className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-900 focus:outline-none focus:border-velatra-accent focus:bg-zinc-100 transition-colors" />
                  <input required type="number" placeholder="Prix (€)" value={formulaForm.price || ''} onChange={e => setFormulaForm({...formulaForm, price: Number(e.target.value) || 0})} className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-900 focus:outline-none focus:border-velatra-accent focus:bg-zinc-100 transition-colors" />
                  <select value={formulaForm.period || 'month'} onChange={e => setFormulaForm({...formulaForm, period: e.target.value as any})} className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-900 focus:outline-none focus:border-velatra-accent focus:bg-zinc-100 transition-colors">
                    <option value="week" className="bg-velatra-bgCard">Semaine</option>
                    <option value="month" className="bg-velatra-bgCard">Mois</option>
                    <option value="year" className="bg-velatra-bgCard">Année</option>
                  </select>
                  <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                    <button type="button" onClick={() => setIsAddingFormula(false)} className="px-4 py-2 text-zinc-500 hover:text-zinc-900 font-medium">Annuler</button>
                    <button type="submit" className="bg-velatra-accent text-white px-6 py-2 rounded-xl font-medium hover:bg-velatra-accentDark transition-colors shadow-[0_0_15px_rgba(99,102,241,0.4)]">Enregistrer</button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {state.crmFormulas.map(formula => (
                <div key={formula.id} className="bg-velatra-bgCard border border-zinc-200 rounded-2xl p-5 flex justify-between items-center shadow-2xl">
                  <div>
                    <h4 className="font-bold text-zinc-900">{formula.name}</h4>
                    <p className="text-zinc-500 text-sm">{formula.price}€ / {formula.period}</p>
                  </div>
                  <button onClick={() => deleteFormula(formula.id)} className="text-zinc-500 hover:text-red-400 p-2"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-zinc-200" />

          {/* Manual Stats Form */}
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 mb-4">Saisie Manuelle des Statistiques</h2>
            <form onSubmit={saveManualStats} className="bg-velatra-bgCard border border-zinc-200 rounded-2xl p-6 space-y-6 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Date</label>
                  <input required type="date" value={statsForm.period_start} onChange={e => setStatsForm({...statsForm, period_start: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-900 focus:outline-none focus:border-velatra-accent focus:bg-zinc-100 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Type de période</label>
                  <select value={statsForm.period_type} onChange={e => setStatsForm({...statsForm, period_type: e.target.value as any})} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-900 focus:outline-none focus:border-velatra-accent focus:bg-zinc-100 transition-colors">
                    <option value="day" className="bg-velatra-bgCard">Jour</option>
                    <option value="week" className="bg-velatra-bgCard">Semaine</option>
                    <option value="month" className="bg-velatra-bgCard">Mois</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { key: 'totalCalls', label: 'Total Appels' },
                  { key: 'totalPickups', label: 'Décrochés' },
                  { key: 'appointmentsTaken', label: 'RDV Pris' },
                  { key: 'showedUp', label: 'Présents' },
                  { key: 'signed', label: 'Signatures' },
                  { key: 'notSigned', label: 'Non Signés' },
                  { key: 'noShow', label: 'Absents (No Show)' },
                  { key: 'cancelled', label: 'Annulés' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">{field.label}</label>
                    <input type="number" min="0" value={(statsForm as any)[field.key] || ''} onChange={e => setStatsForm({...statsForm, [field.key]: Number(e.target.value) || 0})} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-900 focus:outline-none focus:border-velatra-accent focus:bg-zinc-100 transition-colors" />
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end">
                <button type="submit" className="bg-velatra-accent text-white px-8 py-3 rounded-xl font-medium shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:bg-velatra-accentDark transition-colors">
                  Enregistrer les statistiques
                </button>
              </div>
            </form>
          </div>

        </motion.div>
      )}

      {/* --- MODALS --- */}
      {createPortal(
        <AnimatePresence>
          {confirmDeleteClientId && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setConfirmDeleteClientId(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900">Supprimer le client</h3>
                </div>
                <p className="text-zinc-600 mb-6">
                  Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setConfirmDeleteClientId(null)}
                    className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={confirmDeleteClient}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-lg shadow-red-500/20"
                  >
                    Supprimer
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {confirmDeleteFormulaId && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setConfirmDeleteFormulaId(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900">Supprimer la formule</h3>
                </div>
                <p className="text-zinc-600 mb-6">
                  Êtes-vous sûr de vouloir supprimer cette formule ? Cette action est irréversible.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setConfirmDeleteFormulaId(null)}
                    className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={confirmDeleteFormula}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-lg shadow-red-500/20"
                  >
                    Supprimer
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {confirmDeletePendingId && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setConfirmDeletePendingId(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900">Supprimer le prospect</h3>
                </div>
                <p className="text-zinc-600 mb-6">
                  Êtes-vous sûr de vouloir supprimer ce prospect en attente ? Cette action est irréversible.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setConfirmDeletePendingId(null)}
                    className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={confirmDeletePending}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-lg shadow-red-500/20"
                  >
                    Supprimer
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
};
