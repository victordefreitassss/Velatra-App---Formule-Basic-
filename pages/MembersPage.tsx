
import React, { useState, useEffect } from 'react';
import { AppState, User, Performance, BodyData, Program, Gender, Goal, Subscription, Plan, NutritionPlan, Payment, Invoice } from '../types';
import { Card, Button, Input, Badge } from '../components/UI';
import { 
  SearchIcon, InfoIcon, 
  XIcon, DumbbellIcon, BarChartIcon, CheckIcon, SaveIcon, LayersIcon, MessageCircleIcon, Edit2Icon, BotIcon, TargetIcon, CalendarIcon, CreditCardIcon, FileTextIcon, BellIcon, DownloadIcon, LinkIcon
} from '../components/Icons';
import { db, doc, setDoc, updateDoc, deleteDoc, secondaryAuth, createUserWithEmailAndPassword, collection, query, where, getDocs, ref, uploadBytes, getDownloadURL, storage } from '../firebase';
import { GOALS } from '../constants';
import { generateNutritionPlan } from '../services/aiService';
import { updateNutritionPlanForWeight } from '../utils';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export const MembersPage: React.FC<{ state: AppState, setState: any, showToast: any }> = ({ state, setState, showToast }) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tous");
  const [selectedProfile, setSelectedProfile] = useState<User | null>(state.selectedMember || null);

  useEffect(() => {
    if (state.selectedMember) {
      setSelectedProfile(state.selectedMember);
    }
  }, [state.selectedMember]);

  const closeProfile = () => {
    setSelectedProfile(null);
    if (state.selectedMember) {
      setState((prev: AppState) => ({ ...prev, selectedMember: null }));
    }
  };
  const [newScan, setNewScan] = useState({ weight: "", fat: "", muscle: "" });
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editInfoData, setEditInfoData] = useState<Partial<User>>({});
  const [isAssigningPlan, setIsAssigningPlan] = useState(false);
  const [isEditingSub, setIsEditingSub] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [subStartDate, setSubStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [subCommitmentDate, setSubCommitmentDate] = useState('');
  const [subContractUrl, setSubContractUrl] = useState('');
  const [isGeneratingNutrition, setIsGeneratingNutrition] = useState(false);
  const [isGeneratingProgram, setIsGeneratingProgram] = useState(false);
  const [isAdjustingTargets, setIsAdjustingTargets] = useState(false);
  const [nutritionTargets, setNutritionTargets] = useState({ calories: 2000, protein: 150, carbs: 200, fat: 70 });
  const [nutritionPlan, setNutritionPlan] = useState<any>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberData, setNewMemberData] = useState<Partial<User> & { password?: string }>({
    name: '', email: '', password: '', phone: '', gender: 'M', age: 30, weight: 70, height: 175, objectifs: [], notes: ''
  });
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [newPayment, setNewPayment] = useState<Partial<Payment>>({ amount: 0, method: 'cash', status: 'paid', date: new Date().toISOString().split('T')[0] });

  const members = state.users.filter(u => {
    if (u.role !== 'member') return false;
    if (!u.name?.toLowerCase().includes(search.toLowerCase())) return false;
    
    if (filter === "Actifs") return u.lastWorkoutDate && (new Date().getTime() - new Date(u.lastWorkoutDate).getTime()) < 30 * 24 * 60 * 60 * 1000;
    if (filter === "Inactifs") return !u.lastWorkoutDate || (new Date().getTime() - new Date(u.lastWorkoutDate).getTime()) >= 30 * 24 * 60 * 60 * 1000;
    if (filter === "Avec Programme") return state.programs.some(p => p.memberId === Number(u.id));
    if (filter === "Sans Programme") return !state.programs.some(p => p.memberId === Number(u.id));
    
    return true;
  });

  const handleSaveScan = async () => {
    if (!selectedProfile || !newScan.weight) return;
    
    // Remplacer les virgules par des points pour parseFloat
    const weightVal = parseFloat(newScan.weight.replace(',', '.'));
    const fatVal = parseFloat(newScan.fat.replace(',', '.')) || 0;
    const muscleVal = parseFloat(newScan.muscle.replace(',', '.')) || 0;

    if (isNaN(weightVal)) {
      showToast("Poids invalide", "error");
      return;
    }

    const scanData: BodyData = {
      id: Date.now(),
      clubId: selectedProfile.clubId,
      memberId: Number(selectedProfile.id),
      date: new Date().toISOString(),
      weight: weightVal,
      fat: fatVal,
      muscle: muscleVal
    };

    try {
      await setDoc(doc(db, "bodyData", scanData.id.toString()), scanData);
      
      // Update nutrition plan if it exists
      const plan = state.nutritionPlans?.find(p => p.memberId === Number(selectedProfile.id));
      if (plan) {
        const updatedPlan = updateNutritionPlanForWeight(plan, weightVal);
        await updateDoc(doc(db, "nutritionPlans", plan.id), updatedPlan);
      }
      
      showToast("Scan balancé enregistré");
      setNewScan({ weight: "", fat: "", muscle: "" });
    } catch (err) {
      console.error("Error saving scan:", err);
      showToast("Erreur lors de l'enregistrement", "error");
    }
  };

  const handleDeleteScan = async (scanId: number) => {
    if (!confirm("Supprimer cette mesure ?")) return;
    try {
      await deleteDoc(doc(db, "bodyData", scanId.toString()));
      showToast("Mesure supprimée");
    } catch (err) {
      showToast("Erreur de suppression", "error");
    }
  };

  const handleUpdateMemberInfo = async () => {
    if (!selectedProfile || !selectedProfile.firebaseUid) return;
    
    try {
      const userRef = doc(db, "users", selectedProfile.firebaseUid);
      await updateDoc(userRef, editInfoData);
      showToast("Informations mises à jour");
      setSelectedProfile({ ...selectedProfile, ...editInfoData } as User);
      setIsEditingInfo(false);
    } catch (err) {
      console.error("Error updating member info:", err);
      showToast("Erreur lors de la mise à jour", "error");
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedProfile || !selectedProfile.firebaseUid) return;
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedProfile.name} ? Cette action est irréversible.`)) return;
    
    try {
      await deleteDoc(doc(db, "users", selectedProfile.firebaseUid));
      showToast("Membre supprimé avec succès");
      setIsEditingInfo(false);
      closeProfile();
    } catch (err) {
      console.error("Error deleting member:", err);
      showToast("Erreur lors de la suppression", "error");
    }
  };

  const handleUpdateCredits = async (member: User, amount: number) => {
    if (!member.firebaseUid) return;
    const currentCredits = member.credits || 0;
    const newCredits = Math.max(0, currentCredits + amount);
    
    try {
      await updateDoc(doc(db, "users", member.firebaseUid), {
        credits: newCredits
      });
      setSelectedProfile({ ...member, credits: newCredits });
      showToast(`Crédits mis à jour (${newCredits})`);
    } catch (err) {
      console.error("Error updating credits:", err);
      showToast("Erreur lors de la mise à jour des crédits", "error");
    }
  };

  const handleEditProgram = (member: User) => {
    const mid = Number(member.id);
    const existingProg = state.programs.find(p => Number(p.memberId) === mid);
    if (existingProg) {
      setState((prev: AppState) => ({ ...prev, editingProg: existingProg }));
    } else {
      const newProg: Program = {
        id: Date.now(),
        clubId: member.clubId,
        memberId: Number(member.id),
        name: `Plan - ${member.name.split(' ')[0]}`,
        presetId: null,
        nbDays: 1,
        startDate: new Date().toISOString().split('T')[0],
        completedWeeks: [],
        currentDayIndex: 0,
        days: [{ name: "Jour 1", isCoaching: false, exercises: [] }]
      };
      setState((prev: AppState) => ({ ...prev, editingProg: newProg }));
    }
    closeProfile(); 
  };

  const handleAddPayment = async () => {
    if (!selectedProfile || !newPayment.amount || !newPayment.method) return;
    try {
      const paymentData: Payment = {
        id: Date.now().toString(),
        clubId: selectedProfile.clubId,
        memberId: Number(selectedProfile.id),
        amount: Number(newPayment.amount),
        date: newPayment.date || new Date().toISOString().split('T')[0],
        method: newPayment.method as any,
        status: newPayment.status as any,
        reference: `PAY-${Date.now()}`
      } as Payment;
      await setDoc(doc(db, "payments", paymentData.id), paymentData);
      showToast("Paiement ajouté avec succès");
      setIsAddingPayment(false);
      setNewPayment({ amount: 0, method: 'cash', status: 'paid', date: new Date().toISOString().split('T')[0] });
    } catch (err) {
      console.error("Error adding payment:", err);
      showToast("Erreur lors de l'ajout du paiement", "error");
    }
  };

  const handleGenerateProgram = async () => {
    if (!selectedProfile) return;
    setIsGeneratingProgram(true);
    try {
      const { generateSportsProgram } = await import('../services/aiService');
      
      const generatedData = await generateSportsProgram(selectedProfile, state.exercises);
      
      const validDays = (generatedData.days || []).map((day: any) => ({
        ...day,
        name: day.name || `Jour`,
        exercises: (day.exercises || []).map((ex: any) => ({
          ...ex,
          exId: state.exercises.some(e => e.id === ex.exId) ? ex.exId : state.exercises[0].id
        }))
      }));

      if (validDays.length === 0) {
        validDays.push({ name: "Jour 1", isCoaching: false, exercises: [] });
      }

      const mid = Number(selectedProfile.id);
      const existingProg = state.programs.find(p => Number(p.memberId) === mid);
      const progId = existingProg ? existingProg.id : Date.now();
      
      const newProg: Program = {
        id: progId,
        clubId: selectedProfile.clubId,
        memberId: mid,
        name: generatedData.name || `Programme IA - ${(selectedProfile.name || 'Membre').split(' ')[0]}`,
        presetId: null,
        nbDays: validDays.length,
        startDate: existingProg ? existingProg.startDate : new Date().toISOString().split('T')[0],
        completedWeeks: existingProg ? existingProg.completedWeeks : [],
        currentDayIndex: existingProg ? existingProg.currentDayIndex : 0,
        days: validDays
      };

      setState((prev: AppState) => {
        return { ...prev, editingProg: newProg };
      });
      
      showToast("Programme généré avec succès", "success");
      closeProfile();
    } catch (error) {
      console.error("Erreur génération programme:", error);
      showToast("Erreur lors de la génération du programme", "error");
    } finally {
      setIsGeneratingProgram(false);
    }
  };

  const openNutritionTargetsModal = () => {
    if (!selectedProfile) return;
    const mid = Number(selectedProfile.id);
    const memberBody = state.bodyData.filter(b => Number(b.memberId) === mid);
    const bodySorted = memberBody.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestScan = bodySorted[0];

    const weight = latestScan?.weight || selectedProfile.weight || 70;
    const height = selectedProfile.height || 175;
    const age = selectedProfile.age || 30;
    
    // Mifflin-St Jeor
    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    bmr += selectedProfile.gender === 'M' ? 5 : -161;
    
    // TDEE (Moderate activity)
    let tdee = bmr * 1.55;
    
    // Goal adjustment
    const goal = selectedProfile.objectifs[0] || '';
    let calories = Math.round(tdee);
    if (goal.toLowerCase().includes('perte')) calories -= 500;
    if (goal.toLowerCase().includes('prise')) calories += 300;
    
    // Macros
    const protein = Math.round(weight * 2);
    const fat = Math.round(weight * 1);
    const carbs = Math.max(0, Math.round((calories - (protein * 4) - (fat * 9)) / 4));

    setNutritionTargets({ calories, protein, carbs, fat });
    setIsAdjustingTargets(true);
  };

  const handleGenerateNutrition = async () => {
    if (!selectedProfile) return;
    setIsAdjustingTargets(false);
    setIsGeneratingNutrition(true);
    setNutritionPlan(null);
    try {
      const mid = Number(selectedProfile.id);
      const memberBody = state.bodyData.filter(b => Number(b.memberId) === mid);
      const bodySorted = memberBody.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latestScan = bodySorted[0];

      const plan = await generateNutritionPlan(selectedProfile, latestScan, nutritionTargets);
      
      const planId = state.nutritionPlans?.find(p => p.memberId === mid)?.id || Date.now().toString();
      
      const newPlan: NutritionPlan = {
        id: planId,
        memberId: mid,
        clubId: selectedProfile.clubId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        weight: latestScan?.weight || selectedProfile.weight,
        height: selectedProfile.height,
        age: selectedProfile.age,
        gender: selectedProfile.gender,
        activityLevel: "Modérément actif",
        goal: (selectedProfile.objectifs[0] as any) || "Perte de poids",
        durationWeeks: 4,
        bmr: 0,
        tdee: 0,
        targetCalories: parseInt(plan.calories_totales) || 0,
        protein: parseInt(plan.macros?.proteines_g) || 0,
        carbs: parseInt(plan.macros?.glucides_g) || 0,
        fat: parseInt(plan.macros?.lipides_g) || 0,
        meals: plan.repas?.map((r: any, idx: number) => ({
          id: Date.now().toString() + idx,
          name: r.type.replace('_', ' '),
          description: (r.aliments || []).join(', '),
          calories: parseInt(r.calories) || 0,
          protein: parseInt(r.proteines) || 0,
          carbs: parseInt(r.glucides) || 0,
          fat: parseInt(r.lipides) || 0
        })) || [],
        liste_courses: plan.liste_courses || [],
        aiGenerated: true
      };

      await setDoc(doc(db, "nutritionPlans", planId), newPlan);

      setNutritionPlan(newPlan);
      showToast("Plan nutritionnel généré et sauvegardé avec succès !", "success");
    } catch (error: any) {
      console.error(error);
      showToast("Erreur lors de la génération du plan : " + error.message, "error");
    } finally {
      setIsGeneratingNutrition(false);
    }
  };

  const getMemberStats = (memberId: number) => {
    const mid = Number(memberId);
    const memberPerfs = state.performances.filter(p => Number(p.memberId) === mid);
    const memberBody = state.bodyData.filter(b => Number(b.memberId) === mid);
    const program = state.programs.find(p => Number(p.memberId) === mid);

    const topPerfs = memberPerfs.reduce((acc: any, curr) => {
      if (!acc[curr.exId] || acc[curr.exId].weight < curr.weight) {
        acc[curr.exId] = curr;
      }
      return acc;
    }, {});

    const memberOrders = state.supplementOrders.filter(o => Number(o.adherentId) === mid);
    const totalSpent = memberOrders.filter(o => o.status === 'completed').reduce((acc, curr) => acc + curr.total, 0);
    const subscription = state.subscriptions.find(s => s.memberId === mid && s.status === 'active');

    return { 
      perfs: Object.values(topPerfs) as Performance[], 
      body: memberBody.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      program,
      totalSpent,
      memberOrders,
      subscription
    };
  };

  const handleAssignSubscription = async () => {
    if (!selectedProfile || !selectedPlanId || !state.user?.clubId) return;
    
    const plan = state.plans.find(p => p.id === selectedPlanId);
    if (!plan) return;

    const subId = Date.now().toString();
    const subscription: Subscription = {
      id: subId,
      clubId: state.user.clubId,
      memberId: selectedProfile.id,
      planId: plan.id,
      planName: plan.name,
      price: plan.price,
      billingCycle: plan.billingCycle,
      startDate: new Date(subStartDate).toISOString(),
      status: 'active'
    };

    if (subCommitmentDate) {
      subscription.commitmentEndDate = new Date(subCommitmentDate).toISOString();
    }
    if (subContractUrl) {
      subscription.contractUrl = subContractUrl;
    }

    try {
      await setDoc(doc(db, "subscriptions", subId), subscription);
      showToast("Abonnement assigné avec succès");
      setIsAssigningPlan(false);
      setSelectedPlanId('');
      setSubCommitmentDate('');
      setSubContractUrl('');
    } catch (err) {
      console.error("Error assigning subscription", err);
      showToast("Erreur lors de l'assignation", "error");
    }
  };

  const handleUpdateSubscription = async () => {
    if (!selectedProfile) return;
    const subscription = state.subscriptions.find(s => s.memberId === selectedProfile.id && s.status === 'active');
    if (!subscription) return;

    try {
      await updateDoc(doc(db, "subscriptions", subscription.id), {
        startDate: new Date(subStartDate).toISOString(),
        commitmentEndDate: subCommitmentDate ? new Date(subCommitmentDate).toISOString() : null,
        contractUrl: subContractUrl || null
      });
      showToast("Abonnement mis à jour avec succès");
      setIsEditingSub(false);
    } catch (err) {
      console.error("Error updating subscription", err);
      showToast("Erreur lors de la mise à jour", "error");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProfile) return;

    try {
      const storageRef = ref(storage, `contracts/${selectedProfile.id}_${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setSubContractUrl(url);
      showToast("Contrat importé avec succès");
    } catch (err) {
      console.error("Error uploading file", err);
      showToast("Erreur lors de l'import du contrat", "error");
    }
  };

  const handleCreateMember = async () => {
    if (!newMemberData.name || !newMemberData.email || !newMemberData.password || !state.user?.clubId) {
      showToast("Veuillez renseigner le nom, l'email et le mot de passe", "error");
      return;
    }
    
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newMemberData.email, newMemberData.password);
      const firebaseUid = userCredential.user.uid;

      const newUserId = Date.now();
      const newUser: User = {
        id: newUserId,
        clubId: state.user.clubId,
        code: "", // Not used anymore
        pwd: "", // We use Firebase Auth
        name: newMemberData.name,
        email: newMemberData.email,
        phone: newMemberData.phone || '',
        role: 'member',
        avatar: newMemberData.name.substring(0, 2).toUpperCase(),
        gender: newMemberData.gender as Gender || 'M',
        age: newMemberData.age || 30,
        weight: newMemberData.weight || 70,
        height: newMemberData.height || 175,
        objectifs: newMemberData.objectifs || [],
        notes: newMemberData.notes || '',
        createdAt: new Date().toISOString(),
        xp: 0,
        streak: 0,
        pointsFidelite: 0,
        firebaseUid: firebaseUid
      };

      await setDoc(doc(db, "users", firebaseUid), newUser);
      showToast(`Membre créé avec succès !`);
      setIsAddingMember(false);
      setNewMemberData({ name: '', email: '', password: '', phone: '', gender: 'M', age: 30, weight: 70, height: 175, objectifs: [], notes: '' });
      // Select the new member automatically
      setSelectedProfile(newUser);
    } catch (err: any) {
      console.error("Error creating member", err);
      showToast(err.message || "Erreur lors de la création", "error");
    }
  };

  const isStripeConnected = state.currentClub?.settings?.payment?.stripeConnected;

  const handleCopyPaymentLink = () => {
    if (!isStripeConnected) {
      alert("Veuillez connecter votre compte Stripe dans les Paramètres pour générer des liens de paiement.");
      return;
    }
    navigator.clipboard.writeText("https://buy.stripe.com/test_mock_link");
    alert("Lien de paiement Stripe copié dans le presse-papier !");
  };

  const handleRemind = (payment: Payment) => {
    const member = state.users.find(u => u.id === payment.memberId);
    if (!member || !member.phone) {
      alert("Ce membre n'a pas de numéro de téléphone enregistré.");
      return;
    }
    const paymentLink = isStripeConnected ? " Vous pouvez régler directement via ce lien sécurisé : https://buy.stripe.com/test_mock_link." : "";
    const msg = `Bonjour ${member.name}, sauf erreur de notre part, nous sommes en attente du règlement de ${payment.amount}€ pour votre abonnement.${paymentLink} Merci !`;
    window.open(`https://wa.me/${member.phone.replace(/\s+/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleGenerateInvoice = async (payment: Payment) => {
    if (!state.user?.clubId) return;
    const id = Date.now().toString();
    const invoiceNumber = `FAC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const invoice: Invoice = {
      id,
      clubId: state.user.clubId,
      memberId: payment.memberId,
      paymentId: payment.id,
      amount: payment.amount,
      date: new Date().toISOString(),
      status: payment.status === 'paid' ? 'paid' : 'pending',
      number: invoiceNumber
    };
    try {
      await setDoc(doc(db, "invoices", id), invoice);
      await updateDoc(doc(db, "payments", payment.id), { invoiceId: id });
      alert(`Facture ${invoiceNumber} générée avec succès.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    const member = state.users.find(u => u.id === invoice.memberId);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Facture ${invoice.number}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #141414; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 40px; }
            .details { margin-bottom: 40px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
            .total { text-align: right; font-size: 24px; font-weight: bold; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>FACTURE</h1>
              <p><strong>N° :</strong> ${invoice.number}</p>
              <p><strong>Date :</strong> ${new Date(invoice.date).toLocaleDateString()}</p>
              <p><strong>Statut :</strong> ${invoice.status === 'paid' ? 'Payée' : 'En attente'}</p>
            </div>
            <div style="text-align: right;">
              <h2>${state.currentClub?.name || 'Club de Sport'}</h2>
            </div>
          </div>
          <div class="details">
            <h3>Facturé à :</h3>
            <p><strong>${member?.name || 'Client'}</strong><br/>${member?.email || ''}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Abonnement / Prestation de coaching</td>
                <td style="text-align: right;">${invoice.amount.toFixed(2)} €</td>
              </tr>
            </tbody>
          </table>
          <div class="total">
            Total : ${invoice.amount.toFixed(2)} €
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const expiringSubscriptions = state.subscriptions.filter(sub => {
    if (!sub.commitmentEndDate || sub.status !== 'active') return false;
    const daysUntilEnd = (new Date(sub.commitmentEndDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return daysUntilEnd <= 30 && daysUntilEnd >= -30; // Show if expiring within 30 days or expired up to 30 days ago
  });

  return (
    <div className="space-y-6 page-transition">
      <div className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-zinc-900">Fiches Athlètes</h1>
          <p className="text-[10px] text-velatra-accent font-bold uppercase tracking-[3px]">{members.length} Profils Actifs</p>
        </div>
        <Button variant="primary" onClick={() => setIsAddingMember(true)} className="!py-3 !px-6 !rounded-2xl shadow-xl shadow-velatra-accent/20 font-black text-xs italic">
          + NOUVEAU PROFIL
        </Button>
      </div>

      {expiringSubscriptions.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-3xl flex items-start gap-3">
          <BellIcon size={20} className="text-orange-500 mt-1" />
          <div>
            <h3 className="text-sm font-bold text-orange-600">Abonnements à renouveler</h3>
            <p className="text-xs text-orange-500/80 mt-1">
              {expiringSubscriptions.length} abonnement(s) arrive(nt) à terme ou sont terminés.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {expiringSubscriptions.map(sub => {
                const member = members.find(m => m.id === sub.memberId);
                if (!member) return null;
                const isExpired = new Date(sub.commitmentEndDate!) < new Date();
                return (
                  <button 
                    key={sub.id}
                    onClick={() => setSelectedProfile(member)}
                    className={`text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest transition-colors ${isExpired ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20' : 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20'}`}
                  >
                    {member.name} ({isExpired ? 'Terminé' : 'Bientôt'})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="relative">
          <SearchIcon size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-900" />
          <Input placeholder="Rechercher par nom..." className="pl-14 !bg-zinc-50 !border-zinc-200 !rounded-2xl font-bold" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {["Tous", "Actifs", "Inactifs", "Avec Programme", "Sans Programme"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${filter === f ? 'bg-velatra-accent text-white' : 'bg-zinc-50 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {members.map(u => {
          const stats = getMemberStats(u.id);
          const hasFeedback = stats.program?.memberRemarks;
          return (
            <motion.div key={u.id} variants={itemVariants} whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }}>
              <Card className={`flex flex-col gap-4 border-none ring-1 transition-all !p-6 bg-white/60 backdrop-blur-xl ${hasFeedback ? 'ring-orange-500/30' : 'ring-zinc-200/50 hover:ring-velatra-accent/30'} shadow-sm hover:shadow-md h-full`}>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-50 border border-white flex items-center justify-center font-black text-2xl text-zinc-700 shadow-inner">
                    {u.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-lg text-zinc-900 leading-none mb-2 uppercase tracking-tight">{u.name}</div>
                    <div className="flex gap-2">
                      <Badge variant="dark" className="!bg-zinc-100 !text-zinc-500 !border-zinc-200 !p-1 !text-[8px]">{stats.perfs.length} PR</Badge>
                      {hasFeedback && <Badge variant="orange" className="!bg-orange-500/10 !text-orange-500 !border-orange-500/20 !p-1 !text-[8px] animate-pulse">FEEDBACK</Badge>}
                    </div>
                  </div>
                </div>
                <div className="mt-auto pt-4">
                  <Button variant="secondary" className="w-full !py-3.5 !text-[10px] !rounded-xl font-black tracking-widest italic" onClick={() => setSelectedProfile(u)}>
                    VOIR LE DOSSIER
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {selectedProfile && (() => {
        const stats = getMemberStats(selectedProfile.id);
        const progDays = stats.program ? stats.program.nbDays * 7 : 0;
        const progCompletion = stats.program ? Math.round(((stats.program.currentDayIndex + 1) / (progDays || 1)) * 100) : 0;

        const weightHistory = [...stats.body].reverse();
        const chartData = weightHistory.map(b => ({
          date: new Date(b.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
          weight: b.weight,
          fat: b.fat,
          muscle: b.muscle
        }));

        const CustomTooltip = ({ active, payload, label }: any) => {
          if (active && payload && payload.length) {
            return (
              <div className="bg-white/90 border border-zinc-200 p-4 rounded-2xl backdrop-blur-xl shadow-2xl">
                <p className="text-[10px] font-black text-zinc-900 uppercase tracking-widest mb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                  <div key={index} className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-black uppercase" style={{ color: entry.color }}>{entry.name}</span>
                    <span className="text-sm font-black text-zinc-900">{entry.value}{entry.name === 'Poids' || entry.name === 'Muscle' ? 'kg' : '%'}</span>
                  </div>
                ))}
              </div>
            );
          }
          return null;
        };

        return (
          <AnimatePresence>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-[500] flex items-start justify-center p-0 md:p-8 overflow-y-auto"
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-full max-w-6xl bg-white/90 backdrop-blur-2xl min-h-screen md:min-h-0 md:rounded-[48px] border border-white/20 shadow-2xl relative overflow-hidden my-0 md:my-8"
              >
                <button onClick={closeProfile} className="fixed top-4 right-4 md:absolute md:top-10 md:right-10 p-3 md:p-4 bg-white/90 backdrop-blur-md rounded-full text-zinc-500 hover:text-zinc-900 z-[600] border border-zinc-200 hover:bg-red-500 hover:border-red-500 transition-all shadow-xl"><XIcon size={20} className="md:w-6 md:h-6" /></button>

                <div className="grid grid-cols-1 lg:grid-cols-12">
                  {/* SIDEBAR */}
                  <div className="lg:col-span-4 bg-white/50 border-r border-white/20 p-6 md:p-10 space-y-8 md:space-y-10 pt-20 md:pt-10">
                  <div className="text-center relative">
                    <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-velatra-accent to-velatra-accentDark flex items-center justify-center text-4xl font-black mx-auto mb-6 shadow-2xl">{selectedProfile.avatar}</div>
                    <button 
                      onClick={() => {
                        setEditInfoData({
                          name: selectedProfile.name,
                          age: selectedProfile.age,
                          gender: selectedProfile.gender,
                          weight: selectedProfile.weight,
                          height: selectedProfile.height,
                          objectifs: selectedProfile.objectifs,
                          notes: selectedProfile.notes
                        });
                        setIsEditingInfo(true);
                      }}
                      className="absolute top-0 right-1/4 p-2 bg-zinc-100 rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-velatra-accent transition-all"
                      title="Modifier les infos"
                    >
                      <Edit2Icon size={16} />
                    </button>
                    <h2 className="text-3xl font-black text-zinc-900 uppercase italic tracking-tighter">{selectedProfile.name}</h2>
                    <Badge variant="accent" className="mt-3 !px-4 !py-1.5">ÉVOLUTION</Badge>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black uppercase tracking-[4px] text-velatra-accent">Crédits Coaching</h3>
                      <div className="flex gap-2">
                        <Button variant="secondary" className="!p-1 !h-6 !w-6 flex items-center justify-center" onClick={() => handleUpdateCredits(selectedProfile, -1)}>-</Button>
                        <Button variant="secondary" className="!p-1 !h-6 !w-6 flex items-center justify-center" onClick={() => handleUpdateCredits(selectedProfile, 1)}>+</Button>
                      </div>
                    </div>
                    <div className="text-center py-2">
                      <div className="text-3xl font-black text-zinc-900">{selectedProfile.credits || 0}</div>
                      <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-1">Crédits restants</div>
                    </div>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[4px] text-velatra-accent">Fidélité & Achats</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-[8px] font-black text-zinc-900 uppercase tracking-widest mb-1">Points</div>
                        <div className="text-xl font-black text-zinc-900">{selectedProfile.pointsFidelite || 0}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[8px] font-black text-zinc-900 uppercase tracking-widest mb-1">Total Achats</div>
                        <div className="text-xl font-black text-emerald-500">{stats.totalSpent}€</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[4px] text-velatra-accent">Profil & Objectifs</h3>
                    
                    {(selectedProfile.email || selectedProfile.phone) && (
                      <div className="space-y-3 mb-6 pb-4 border-b border-zinc-200">
                        {selectedProfile.email && (
                          <div>
                            <div className="text-[8px] font-black text-zinc-900 uppercase tracking-widest mb-1">Email</div>
                            <div className="text-sm font-bold text-zinc-900">{selectedProfile.email}</div>
                          </div>
                        )}
                        {selectedProfile.phone && (
                          <div>
                            <div className="text-[8px] font-black text-zinc-900 uppercase tracking-widest mb-1">Téléphone</div>
                            <div className="text-sm font-bold text-zinc-900">{selectedProfile.phone}</div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-[8px] font-black text-zinc-900 uppercase tracking-widest mb-1">Âge</div>
                        <div className="text-sm font-bold text-zinc-900">{selectedProfile.age} ans</div>
                      </div>
                      <div>
                        <div className="text-[8px] font-black text-zinc-900 uppercase tracking-widest mb-1">Sexe</div>
                        <div className="text-sm font-bold text-zinc-900">{selectedProfile.gender === 'M' ? 'Homme' : selectedProfile.gender === 'F' ? 'Femme' : 'Autre'}</div>
                      </div>
                      <div>
                        <div className="text-[8px] font-black text-zinc-900 uppercase tracking-widest mb-1">Taille</div>
                        <div className="text-sm font-bold text-zinc-900">{selectedProfile.height} cm</div>
                      </div>
                      <div>
                        <div className="text-[8px] font-black text-zinc-900 uppercase tracking-widest mb-1">Poids Initial</div>
                        <div className="text-sm font-bold text-zinc-900">{selectedProfile.weight} kg</div>
                      </div>
                    </div>
                    {selectedProfile.objectifs && selectedProfile.objectifs.length > 0 && (
                      <div>
                        <div className="text-[8px] font-black text-zinc-900 uppercase tracking-widest mb-2">Objectifs</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedProfile.objectifs.map((obj, idx) => (
                            <span key={idx} className="px-2 py-1 bg-zinc-100 rounded-full text-[9px] font-bold text-zinc-900 uppercase tracking-wider">
                              {obj}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedProfile.notes && (
                    <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl space-y-2">
                      <h3 className="text-[10px] font-black uppercase tracking-[4px] text-velatra-accent">Notes d'Inscription</h3>
                      <p className="text-xs text-zinc-500 leading-relaxed italic">"{selectedProfile.notes}"</p>
                    </div>
                  )}

                  {/* Remarks Display */}
                  {stats.program?.memberRemarks && (
                    <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-3xl space-y-3">
                       <div className="flex items-center gap-2 text-orange-500">
                          <MessageCircleIcon size={18} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Feedback Adhérent</span>
                       </div>
                       <p className="text-sm font-bold text-zinc-900 italic leading-relaxed">"{stats.program.memberRemarks}"</p>
                       <Button variant="secondary" fullWidth className="!py-2 !text-[9px] !rounded-xl" onClick={() => handleEditProgram(selectedProfile)}>
                          ADAPTER LE PLAN
                       </Button>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                       <h3 className="text-[10px] font-black uppercase tracking-[4px] text-velatra-accent">Abonnement</h3>
                    </div>
                    {stats.subscription ? (
                      <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6 shadow-inner space-y-4">
                        <div className="flex justify-between items-start">
                          <span className="font-black text-zinc-900 text-lg uppercase italic">{stats.subscription.planName}</span>
                          <span className="text-[10px] px-2 py-1 bg-green-500/20 text-green-400 rounded-full font-black uppercase tracking-widest">Actif</span>
                        </div>
                        <div className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest">
                          {stats.subscription.price}€ / {stats.subscription.billingCycle === 'monthly' ? 'mois' : stats.subscription.billingCycle === 'yearly' ? 'an' : 'fois'}
                        </div>
                        
                        <div className="pt-4 border-t border-zinc-200 space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-500">Début :</span>
                            <span className="font-bold">{new Date(stats.subscription.startDate).toLocaleDateString()}</span>
                          </div>
                          {stats.subscription.commitmentEndDate && (
                            <div className="flex justify-between text-xs">
                              <span className="text-zinc-500">Fin d'engagement :</span>
                              <span className={`font-bold ${new Date(stats.subscription.commitmentEndDate) < new Date() ? 'text-red-500' : 'text-zinc-900'}`}>
                                {new Date(stats.subscription.commitmentEndDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {stats.subscription.contractUrl && (
                            <div className="flex justify-between text-xs pt-2">
                              <a href={stats.subscription.contractUrl} target="_blank" rel="noopener noreferrer" className="text-velatra-accent font-bold flex items-center gap-1 hover:underline">
                                <LinkIcon size={12} /> Voir le contrat
                              </a>
                            </div>
                          )}
                        </div>

                        {isEditingSub ? (
                          <div className="space-y-3 pt-4 border-t border-zinc-200">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Date de début</label>
                              <Input type="date" value={subStartDate} onChange={e => setSubStartDate(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Fin d'engagement (optionnel)</label>
                              <Input type="date" value={subCommitmentDate} onChange={e => setSubCommitmentDate(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Importer un contrat (PDF, Image)</label>
                              <input 
                                type="file" 
                                accept=".pdf,image/*" 
                                onChange={handleFileUpload}
                                className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-velatra-accent/10 file:text-velatra-accent hover:file:bg-velatra-accent/20 transition-colors"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Ou lien du contrat (optionnel)</label>
                              <Input type="url" placeholder="https://..." value={subContractUrl} onChange={e => setSubContractUrl(e.target.value)} />
                            </div>
                            <div className="flex gap-2 pt-2">
                              <button onClick={() => setIsEditingSub(false)} className="flex-1 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors">Annuler</button>
                              <button onClick={handleUpdateSubscription} className="flex-1 bg-velatra-accent text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Enregistrer</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => {
                            setSubStartDate(stats.subscription!.startDate.split('T')[0]);
                            setSubCommitmentDate(stats.subscription!.commitmentEndDate ? stats.subscription!.commitmentEndDate.split('T')[0] : '');
                            setSubContractUrl(stats.subscription!.contractUrl || '');
                            setIsEditingSub(true);
                          }} className="w-full mt-4 border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 rounded-xl py-2 text-[10px] font-black uppercase tracking-widest transition-colors">
                            Modifier l'abonnement
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-zinc-500 font-medium px-1">Aucun abonnement actif.</p>
                        {isAssigningPlan ? (
                          <div className="space-y-3 bg-zinc-50 p-4 rounded-3xl border border-zinc-200">
                            <select 
                              value={selectedPlanId} 
                              onChange={e => {
                                const planId = e.target.value;
                                setSelectedPlanId(planId);
                                const plan = state.plans.find(p => p.id === planId);
                                if (plan && plan.hasCommitment && plan.commitmentMonths) {
                                  const start = new Date(subStartDate);
                                  if (!isNaN(start.getTime())) {
                                    start.setMonth(start.getMonth() + plan.commitmentMonths);
                                    setSubCommitmentDate(start.toISOString().split('T')[0]);
                                  }
                                } else {
                                  setSubCommitmentDate('');
                                }
                              }}
                              className="w-full bg-white border border-zinc-200 rounded-xl p-3 text-zinc-900 text-xs font-medium focus:outline-none focus:border-velatra-accent"
                            >
                              <option value="">Sélectionner une formule</option>
                              {state.plans.map(p => <option key={p.id} value={p.id}>{p.name} - {p.price}€</option>)}
                            </select>
                            
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Date de début</label>
                              <Input type="date" value={subStartDate} onChange={e => {
                                const newDate = e.target.value;
                                setSubStartDate(newDate);
                                const plan = state.plans.find(p => p.id === selectedPlanId);
                                if (plan && plan.hasCommitment && plan.commitmentMonths) {
                                  const start = new Date(newDate);
                                  if (!isNaN(start.getTime())) {
                                    start.setMonth(start.getMonth() + plan.commitmentMonths);
                                    setSubCommitmentDate(start.toISOString().split('T')[0]);
                                  }
                                }
                              }} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Fin d'engagement (optionnel)</label>
                              <Input type="date" value={subCommitmentDate} onChange={e => setSubCommitmentDate(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Importer un contrat (PDF, Image)</label>
                              <input 
                                type="file" 
                                accept=".pdf,image/*" 
                                onChange={handleFileUpload}
                                className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-velatra-accent/10 file:text-velatra-accent hover:file:bg-velatra-accent/20 transition-colors"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Ou lien du contrat (optionnel)</label>
                              <Input type="url" placeholder="https://..." value={subContractUrl} onChange={e => setSubContractUrl(e.target.value)} />
                            </div>

                            <div className="flex gap-2 pt-2">
                              <button onClick={() => setIsAssigningPlan(false)} className="flex-1 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors">Annuler</button>
                              <button onClick={handleAssignSubscription} disabled={!selectedPlanId} className="flex-1 bg-velatra-accent text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50">Confirmer</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setIsAssigningPlan(true)} className="w-full border border-dashed border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-200 rounded-3xl py-4 text-[10px] font-black uppercase tracking-widest transition-colors">
                            + Assigner une formule
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                       <h3 className="text-[10px] font-black uppercase tracking-[4px] text-velatra-accent">Plan Actif</h3>
                       <button onClick={() => handleEditProgram(selectedProfile)} className="text-zinc-900/40 hover:text-zinc-900 transition-colors">
                          <LayersIcon size={14} />
                       </button>
                    </div>
                    {stats.program ? (
                      <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-inner relative overflow-hidden">
                        <div className="font-black text-zinc-900 text-lg mb-1 uppercase italic">{stats.program.name}</div>
                        <div className="flex justify-between text-[10px] font-bold text-zinc-900 uppercase mb-4 tracking-widest">
                           <span>Cycle complété</span>
                           <span className="text-zinc-900">{progCompletion}%</span>
                        </div>
                        <div className="h-2 bg-zinc-50 rounded-full overflow-hidden mb-4">
                          <div className="h-full bg-velatra-accent shadow-[0_0_10px_rgba(196,30,58,0.5)] transition-all duration-1000" style={{ width: `${progCompletion}%` }} />
                        </div>
                        
                        {/* Feature 2: Auto Progression Toggle */}
                        <div className="mt-4 pt-4 border-t border-zinc-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-4 bg-velatra-accent rounded-full relative cursor-pointer" onClick={() => showToast("Progression automatique activée", "success")}>
                              <div className="absolute right-1 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"></div>
                            </div>
                            <span className="text-[9px] font-black text-zinc-900 uppercase tracking-widest">Surcharge Progressive IA</span>
                          </div>
                          <span className="text-[8px] text-zinc-900 uppercase tracking-widest">+2.5kg auto</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-zinc-50 rounded-3xl p-8 border border-dashed border-zinc-200 text-center">
                         <p className="text-xs italic text-zinc-900 mb-4">Aucun cycle en cours</p>
                         <Button variant="primary" fullWidth onClick={() => handleEditProgram(selectedProfile)} className="!py-3 !text-[10px]">
                            CRÉER UN PROGRAMME
                         </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6 bg-zinc-50 p-8 rounded-3xl border border-zinc-200">
                    <h3 className="text-[10px] font-black uppercase tracking-[4px] text-velatra-accent">Nouveau Scan</h3>
                    <div className="space-y-4">
                      <Input placeholder="Poids (kg)" type="number" className="!bg-zinc-50" value={newScan.weight || ''} onChange={e => setNewScan({...newScan, weight: e.target.value})} />
                      <div className="grid grid-cols-2 gap-4">
                        <Input placeholder="Gras (%)" type="number" className="!bg-zinc-50" value={newScan.fat || ''} onChange={e => setNewScan({...newScan, fat: e.target.value})} />
                        <Input placeholder="Muscle (kg)" type="number" className="!bg-zinc-50" value={newScan.muscle || ''} onChange={e => setNewScan({...newScan, muscle: e.target.value})} />
                      </div>
                      <Button variant="success" fullWidth onClick={handleSaveScan} className="!py-4 shadow-xl shadow-emerald-500/10">
                        <SaveIcon size={16} className="mr-2" /> ENREGISTRER SCAN
                      </Button>
                    </div>
                  </div>
                </div>

                {/* MAIN GRAPHS & AI */}
                <div className="lg:col-span-8 p-6 md:p-12 space-y-12">
                  
                  {/* VELATRA AI ENGINE SECTION */}
                  <section className="space-y-8">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-gradient-to-br from-velatra-accent to-purple-600 rounded-2xl text-zinc-900 shadow-[0_0_20px_rgba(99,102,241,0.4)]"><BotIcon size={24} /></div>
                       <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">Velatra AI Engine</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Feature 1: Auto Program */}
                      <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl hover:border-velatra-accent/50 transition-all group relative overflow-hidden flex flex-col justify-between">
                        <div>
                          <div className="absolute top-0 right-0 w-32 h-32 bg-velatra-accent/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-velatra-accent/20"></div>
                          <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <LayersIcon size={16} className="text-velatra-accent" /> Génération Programme
                          </h4>
                          <p className="text-[10px] text-zinc-500 mb-4 leading-relaxed">Générez un programme d'entraînement complet et sur-mesure basé sur les objectifs et le niveau du membre.</p>
                          <div className="bg-velatra-accent/10 border border-velatra-accent/20 rounded-xl p-3 mb-6">
                            <p className="text-[10px] font-bold text-velatra-accent uppercase tracking-widest text-center">
                              Disponible sur la version supérieure
                            </p>
                          </div>
                        </div>
                        <Button variant="secondary" fullWidth className="!py-3 !text-[10px] !rounded-xl relative z-10 border-velatra-accent/30 hover:border-velatra-accent !bg-velatra-accent/10 !text-velatra-accent" onClick={() => window.open('https://wa.me/33676760075?text=Bonjour,%20je%20souhaite%20passer%20à%20la%20version%20supérieure%20pour%20débloquer%20la%20génération%20de%20programmes%20IA.', '_blank')}>
                          ME CONTACTER SUR WHATSAPP
                        </Button>
                      </div>

                      {/* Feature 2: Nutrition Plan */}
                      <div className={`bg-zinc-50 border border-zinc-200 p-6 rounded-3xl transition-all group relative overflow-hidden flex flex-col justify-between ${isGeneratingNutrition ? 'opacity-50 grayscale pointer-events-none' : 'hover:border-emerald-500/50'}`}>
                        <div>
                          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-emerald-500/20"></div>
                          <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <CheckIcon size={16} className="text-emerald-400" /> Plan Nutritionnel
                          </h4>
                          <p className="text-[10px] text-zinc-500 mb-6 leading-relaxed">Générez un plan alimentaire complet (macros, repas, liste de courses) basé sur la morphologie et les objectifs.</p>
                        </div>
                        <div className="space-y-2 relative z-10">
                          {state.nutritionPlans?.find(p => p.memberId === Number(selectedProfile.id)) && (
                            <Button variant="primary" fullWidth className="!py-3 !text-[10px] !rounded-xl border-emerald-500/30 hover:border-emerald-500" onClick={() => setNutritionPlan(state.nutritionPlans?.find(p => p.memberId === Number(selectedProfile.id)))}>
                              VOIR LE PLAN ACTUEL
                            </Button>
                          )}
                          <Button variant="secondary" fullWidth className="!py-3 !text-[10px] !rounded-xl border-emerald-500/30 hover:border-emerald-500" onClick={openNutritionTargetsModal} disabled={isGeneratingNutrition}>
                            {isGeneratingNutrition ? "CRÉATION EN COURS..." : (state.nutritionPlans?.find(p => p.memberId === Number(selectedProfile.id)) ? "RÉGÉNÉRER LE PLAN" : "GÉNÉRER LE PLAN")}
                          </Button>
                        </div>
                      </div>

                      {/* Feature 3: Auto Report */}
                      <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl transition-all group relative overflow-hidden opacity-50 grayscale">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-blue-500/20"></div>
                        <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <BarChartIcon size={16} className="text-blue-400" /> Rapport Automatique
                        </h4>
                        <p className="text-[10px] text-zinc-500 mb-6 leading-relaxed">Générez un bilan complet de la progression du client (poids, mensurations, performances) prêt à être envoyé.</p>
                        <Button variant="secondary" fullWidth className="!py-3 !text-[10px] !rounded-xl relative z-10 border-blue-500/30 hover:border-blue-500" onClick={() => showToast("Fonctionnalité IA en cours d'activation pour votre club", "info")}>
                          GÉNÉRER LE BILAN
                        </Button>
                      </div>

                      {/* Feature 4: Stagnation Detection */}
                      <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl hover:border-velatra-accent/50 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-orange-500/20"></div>
                        <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <TargetIcon size={16} className="text-orange-400" /> Détection Stagnation
                        </h4>
                        <p className="text-[10px] text-zinc-500 mb-4 leading-relaxed">L'IA analyse les dernières séances pour détecter les plateaux de progression sur les exercices majeurs.</p>
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                          <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Analyse en temps réel active</span>
                        </div>
                      </div>

                      {/* Feature 5: Morphological Analysis */}
                      <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl transition-all group relative overflow-hidden opacity-50 grayscale">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-emerald-500/20"></div>
                        <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <InfoIcon size={16} className="text-emerald-400" /> Analyse Morphologique
                        </h4>
                        <p className="text-[10px] text-zinc-500 mb-6 leading-relaxed">Importez des photos (face, profil, dos) pour obtenir une analyse posturale et morphologique détaillée par l'IA.</p>
                        <Button variant="secondary" fullWidth className="!py-3 !text-[10px] !rounded-xl relative z-10 border-emerald-500/30 hover:border-emerald-500" onClick={() => showToast("Fonctionnalité IA en cours d'activation pour votre club", "info")}>
                          ANALYSER DES PHOTOS
                        </Button>
                      </div>
                    </div>
                  </section>

                  {/* FINANCES & FACTURATION */}
                  <section className="space-y-8">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><CreditCardIcon size={24} /></div>
                       <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">Finances & Facturation</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Solde Total Payé</div>
                        <div className="text-4xl font-black text-emerald-500">
                          {state.payments?.filter(p => p.memberId === Number(selectedProfile.id) && p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) || 0}€
                        </div>
                      </div>
                      <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm flex flex-col justify-center">
                        <Button variant="primary" fullWidth onClick={handleCopyPaymentLink} className="!py-4 mb-3">
                          <LinkIcon size={16} className="mr-2" /> COPIER LIEN DE PAIEMENT
                        </Button>
                        <p className="text-[10px] text-zinc-500 text-center">Envoyez ce lien à votre client pour un paiement en ligne sécurisé via Stripe.</p>
                      </div>
                    </div>

                    <div className="bg-white border border-zinc-200 rounded-[40px] p-8 shadow-inner">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Historique des prélèvements & paiements</h4>
                        <Button variant="secondary" className="!py-2 !px-4 !text-[10px] !rounded-xl" onClick={() => setIsAddingPayment(!isAddingPayment)}>
                          {isAddingPayment ? 'ANNULER' : '+ AJOUTER PAIEMENT'}
                        </Button>
                      </div>

                      {isAddingPayment && (
                        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 mb-6">
                          <h5 className="text-xs font-black text-zinc-900 uppercase tracking-widest mb-4">Nouveau Paiement</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Montant (€)</label>
                              <Input type="number" value={newPayment.amount || ''} onChange={(e) => setNewPayment({...newPayment, amount: Number(e.target.value)})} placeholder="Ex: 50" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Date</label>
                              <Input type="date" value={newPayment.date || ''} onChange={(e) => setNewPayment({...newPayment, date: e.target.value})} />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Méthode</label>
                              <select 
                                className="w-full bg-white border border-zinc-200 rounded-xl p-3 text-zinc-900 text-sm focus:outline-none focus:border-velatra-accent"
                                value={newPayment.method} 
                                onChange={(e) => setNewPayment({...newPayment, method: e.target.value as any})}
                              >
                                <option value="card">Carte Bancaire</option>
                                <option value="cash">Espèces</option>
                                <option value="transfer">Virement</option>
                                <option value="sepa">Prélèvement SEPA</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Statut</label>
                              <select 
                                className="w-full bg-white border border-zinc-200 rounded-xl p-3 text-zinc-900 text-sm focus:outline-none focus:border-velatra-accent"
                                value={newPayment.status} 
                                onChange={(e) => setNewPayment({...newPayment, status: e.target.value as any})}
                              >
                                <option value="paid">Payé</option>
                                <option value="pending">En attente</option>
                                <option value="failed">Échoué</option>
                              </select>
                            </div>
                          </div>
                          <Button variant="primary" fullWidth onClick={handleAddPayment} disabled={!newPayment.amount}>
                            ENREGISTRER LE PAIEMENT
                          </Button>
                        </div>
                      )}
                      
                      {state.payments?.filter(p => p.memberId === Number(selectedProfile.id)).length > 0 ? (
                        <div className="space-y-4">
                          {state.payments.filter(p => p.memberId === Number(selectedProfile.id))
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map(payment => {
                              const invoice = state.invoices?.find(inv => inv.paymentId === payment.id);
                              return (
                                <div key={payment.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-50 border border-zinc-200 rounded-2xl gap-4">
                                  <div>
                                    <div className="flex items-center gap-3 mb-1">
                                      <span className="text-lg font-black text-zinc-900">{payment.amount}€</span>
                                      <Badge variant={payment.status === 'paid' ? 'success' : payment.status === 'pending' ? 'orange' : 'dark'}>
                                        {payment.status === 'paid' ? 'Payé' : payment.status === 'pending' ? 'En attente' : 'Échoué'}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                      {new Date(payment.date).toLocaleDateString('fr-FR')} • {payment.method === 'card' ? 'Carte Bancaire' : payment.method === 'sepa' ? 'Prélèvement SEPA' : payment.method === 'cash' ? 'Espèces' : 'Virement'}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    {payment.status !== 'paid' && (
                                      <Button variant="secondary" className="!py-2 !px-3 !text-[10px] !rounded-xl text-orange-500 border-orange-200 hover:bg-orange-50" onClick={() => handleRemind(payment)}>
                                        <BellIcon size={14} className="mr-1" /> RELANCER
                                      </Button>
                                    )}
                                    
                                    {invoice ? (
                                      <Button variant="secondary" className="!py-2 !px-3 !text-[10px] !rounded-xl" onClick={() => handleDownloadInvoice(invoice)}>
                                        <DownloadIcon size={14} className="mr-1" /> FACTURE
                                      </Button>
                                    ) : (
                                      <Button variant="secondary" className="!py-2 !px-3 !text-[10px] !rounded-xl" onClick={() => handleGenerateInvoice(payment)}>
                                        <FileTextIcon size={14} className="mr-1" /> GÉNÉRER FACTURE
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-zinc-500 text-sm italic">
                          Aucun paiement enregistré pour ce membre.
                        </div>
                      )}
                    </div>
                  </section>

                  {/* COACHING HISTORY */}
                  <section className="space-y-8">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-velatra-accent/10 rounded-2xl text-velatra-accent"><CalendarIcon size={24} /></div>
                       <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">Historique Coaching</h3>
                    </div>
                    
                    {state.currentClub?.plan === 'classic' || state.currentClub?.plan === 'premium' ? (
                      <div className="bg-white border border-zinc-200 rounded-[40px] p-8 shadow-inner">
                        {state.logs.filter(log => log.memberId === Number(selectedProfile.id) && log.isCoaching).length > 0 ? (
                          <div className="space-y-4">
                            {state.logs.filter(log => log.memberId === Number(selectedProfile.id) && log.isCoaching)
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map(log => (
                              <div key={log.id} className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-200 rounded-2xl">
                                <div>
                                  <div className="text-sm font-bold text-zinc-900">{new Date(log.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">{log.dayName} • Semaine {log.week}</div>
                                </div>
                                <div className="text-right">
                                  <span className="px-3 py-1 bg-velatra-accent/20 text-velatra-accent rounded-full text-[10px] font-black uppercase tracking-widest">
                                    Terminée
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-zinc-500 text-sm italic">
                            Aucune séance de coaching enregistrée pour ce membre.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-zinc-50 border border-zinc-200 p-8 rounded-3xl text-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-velatra-accent/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-velatra-accent/20"></div>
                        <CalendarIcon size={32} className="mx-auto text-zinc-500 mb-4" />
                        <h4 className="text-lg font-black text-zinc-900 uppercase tracking-widest mb-2">Fonctionnalité Premium</h4>
                        <p className="text-xs text-zinc-500 mb-6 max-w-md mx-auto leading-relaxed">
                          L'historique détaillé des séances de coaching en lien avec le planning est réservé aux formules Classic et Premium.
                        </p>
                        <Button variant="secondary" className="!py-3 !px-6 !text-[10px] !rounded-xl relative z-10 border-velatra-accent/30 hover:border-velatra-accent !bg-velatra-accent/10 !text-velatra-accent" onClick={() => window.open('https://wa.me/33676760075?text=Bonjour,%20je%20souhaite%20passer%20à%20la%20version%20supérieure%20pour%20débloquer%20l\'historique%20de%20coaching.', '_blank')}>
                          PASSER À LA VERSION SUPÉRIEURE
                        </Button>
                      </div>
                    )}
                  </section>

                  <section className="space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                         <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500"><BarChartIcon size={24} /></div>
                         <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">Évolution Corporelle</h3>
                      </div>
                      
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-velatra-accent" />
                          <span className="text-[9px] font-black uppercase text-zinc-900 tracking-widest">Poids</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-[9px] font-black uppercase text-zinc-900 tracking-widest">Muscle</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-[9px] font-black uppercase text-zinc-900 tracking-widest">Gras (%)</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white border border-zinc-200 rounded-[40px] p-6 h-80 relative overflow-hidden shadow-inner">
                      {weightHistory.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorMuscle" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                            <XAxis 
                              dataKey="date" 
                              stroke="#a1a1aa" 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false} 
                              dy={10}
                            />
                            <YAxis 
                              yAxisId="left"
                              stroke="#a1a1aa" 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false} 
                              dx={-10}
                              domain={['dataMin - 2', 'dataMax + 2']}
                            />
                            <YAxis 
                              yAxisId="right"
                              orientation="right"
                              stroke="#a1a1aa" 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false} 
                              dx={10}
                              domain={[0, 'dataMax + 5']}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area 
                              yAxisId="left"
                              type="monotone" 
                              dataKey="weight" 
                              name="Poids"
                              stroke="#6366f1" 
                              strokeWidth={4}
                              fillOpacity={1} 
                              fill="url(#colorWeight)" 
                            />
                            <Area 
                              yAxisId="left"
                              type="monotone" 
                              dataKey="muscle" 
                              name="Muscle"
                              stroke="#10b981" 
                              strokeWidth={4}
                              fillOpacity={1} 
                              fill="url(#colorMuscle)" 
                            />
                            <Area 
                              yAxisId="right"
                              type="monotone" 
                              dataKey="fat" 
                              name="Gras"
                              stroke="#3b82f6" 
                              strokeWidth={4}
                              fillOpacity={1} 
                              fill="url(#colorFat)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-xs font-bold uppercase tracking-widest">
                          Aucune donnée
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="space-y-8">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-velatra-accent/10 rounded-2xl text-velatra-accent"><DumbbellIcon size={24} /></div>
                       <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">Tableau des Records (PR)</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {stats.perfs.length > 0 ? stats.perfs.map(p => {
                        const ex = state.exercises.find(e => e.perfId === p.exId);
                        return (
                          <div key={p.id} className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl flex justify-between items-center group hover:bg-zinc-50 transition-all">
                             <div>
                               <div className="text-[9px] uppercase font-black text-velatra-accent tracking-widest mb-1">{ex?.cat || 'FORCE'}</div>
                               <div className="font-black text-zinc-900 text-lg italic tracking-tight">{ex?.name || p.exId}</div>
                             </div>
                             <div className="text-right">
                               <div className="text-2xl font-black text-zinc-900 tracking-tighter">{p.weight}kg</div>
                               <div className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">{p.reps} REPS</div>
                             </div>
                          </div>
                        );
                      }) : (
                        <div className="col-span-full py-12 text-center bg-zinc-50 border border-dashed border-zinc-200 rounded-[32px] text-[10px] uppercase font-black text-zinc-900 tracking-[4px] italic">Aucun PR enregistré</div>
                      )}
                    </div>
                  </section>

                  <section className="space-y-8 pb-12">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><CheckIcon size={24} /></div>
                       <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">Journaux Biométriques</h3>
                    </div>
                    <div className="space-y-4">
                       {stats.body.length > 0 ? stats.body.map(b => (
                         <div key={b.id} className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl flex justify-between items-center group hover:border-zinc-300 transition-all">
                            <div className="flex flex-col">
                              <span className="text-zinc-900 font-black text-sm uppercase tracking-widest italic">{new Date(b.date).toLocaleDateString('fr-FR', {month:'long', day:'numeric', year:'numeric'})}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[8px] text-zinc-900 font-black uppercase tracking-widest">Scan effectué en club</span>
                                <button onClick={() => handleDeleteScan(b.id)} className="text-[8px] text-red-500/40 hover:text-red-500 font-black uppercase tracking-widest transition-colors opacity-0 group-hover:opacity-100">Supprimer</button>
                              </div>
                            </div>
                            <div className="flex gap-10">
                               <div className="text-center group-hover:scale-110 transition-transform">
                                  <div className="text-[8px] font-black uppercase text-zinc-900 tracking-widest mb-1">POIDS</div>
                                  <div className="text-xl font-black text-zinc-900">{b.weight}<span className="text-xs ml-0.5 opacity-50">KG</span></div>
                               </div>
                               <div className="text-center group-hover:scale-110 transition-transform">
                                  <div className="text-[8px] font-black uppercase text-zinc-900 tracking-widest mb-1">GRAS</div>
                                  <div className="text-xl font-black text-emerald-500">{b.fat}<span className="text-xs ml-0.5 opacity-50">%</span></div>
                               </div>
                               <div className="text-center group-hover:scale-110 transition-transform">
                                  <div className="text-[8px] font-black uppercase text-zinc-900 tracking-widest mb-1">MUSCLE</div>
                                  <div className="text-xl font-black text-velatra-accent">{b.muscle}<span className="text-xs ml-0.5 opacity-50">KG</span></div>
                               </div>
                            </div>
                         </div>
                       )) : (
                         <div className="py-12 text-center bg-zinc-50 border border-dashed border-zinc-200 rounded-[32px] text-[10px] uppercase font-black text-zinc-900 tracking-[4px] italic">Aucun historique biométrique</div>
                       )}
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          </motion.div>
          </AnimatePresence>
        );
      })()}

      <AnimatePresence>
      {isEditingInfo && selectedProfile && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-[600] flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-lg"
          >
            <Card className="w-full !p-8 bg-white/90 backdrop-blur-xl border-white/20 relative shadow-2xl">
              <button onClick={() => setIsEditingInfo(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-zinc-900 bg-zinc-100 p-2 rounded-full transition-colors">
                <XIcon size={20} />
              </button>
              
              <h2 className="text-2xl font-black mb-1 uppercase italic">Modifier Profil</h2>
              <p className="text-[10px] text-velatra-accent font-black uppercase tracking-widest mb-8">Informations de base de l'athlète</p>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Nom Complet</label>
                  <Input 
                    value={editInfoData.name}
                    onChange={e => setEditInfoData({...editInfoData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Genre</label>
                  <select 
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm text-zinc-900 focus:border-velatra-accent outline-none appearance-none"
                    value={editInfoData.gender}
                    onChange={e => setEditInfoData({...editInfoData, gender: e.target.value as Gender})}
                  >
                    <option value="M">Homme</option>
                    <option value="F">Femme</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Âge</label>
                  <Input 
                    type="number"
                    value={editInfoData.age || ''}
                    onChange={e => setEditInfoData({...editInfoData, age: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Poids (kg)</label>
                  <Input 
                    type="number"
                    value={editInfoData.weight || ''}
                    onChange={e => setEditInfoData({...editInfoData, weight: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Taille (cm)</label>
                  <Input 
                    type="number"
                    value={editInfoData.height || ''}
                    onChange={e => setEditInfoData({...editInfoData, height: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Objectifs</label>
                <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200 max-h-32 overflow-y-auto no-scrollbar">
                  {GOALS.map(g => {
                    const isSelected = editInfoData.objectifs?.includes(g);
                    return (
                      <button
                        key={g}
                        onClick={() => {
                          const current = editInfoData.objectifs || [];
                          const next = isSelected 
                            ? current.filter(item => item !== g)
                            : [...current, g];
                          setEditInfoData({...editInfoData, objectifs: next});
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${isSelected ? 'bg-velatra-accent border-velatra-accent text-zinc-900' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Notes d'Inscription</label>
                <textarea 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm text-zinc-900 focus:border-velatra-accent outline-none h-24 resize-none"
                  value={editInfoData.notes || ""}
                  onChange={e => setEditInfoData({...editInfoData, notes: e.target.value})}
                  placeholder="Notes renseignées lors de l'inscription..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <Button variant="secondary" fullWidth onClick={() => setIsEditingInfo(false)}>ANNULER</Button>
                <Button variant="success" fullWidth onClick={handleUpdateMemberInfo}>
                  ENREGISTRER <CheckIcon size={18} className="ml-2" />
                </Button>
              </div>
              <div className="pt-2">
                <Button variant="secondary" fullWidth onClick={handleDeleteMember} className="!bg-red-500/10 !text-red-500 hover:!bg-red-500/20">
                  SUPPRIMER LE MEMBRE
                </Button>
              </div>
            </div>
          </Card>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {isAdjustingTargets && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-[600] flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-md"
          >
            <Card className="w-full !p-8 bg-white/90 backdrop-blur-xl border-white/20 relative shadow-2xl">
              <button onClick={() => setIsAdjustingTargets(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-zinc-900 bg-zinc-100 p-2 rounded-full transition-colors">
                <XIcon size={20} />
              </button>
              
              <h2 className="text-2xl font-black mb-1 uppercase italic">Cibles Nutritionnelles</h2>
              <p className="text-[10px] text-velatra-accent font-black uppercase tracking-widest mb-8">Ajuster avant génération</p>

            <div className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Calories Totales (kcal)</label>
                <Input 
                  type="number"
                  value={nutritionTargets.calories || ''}
                  onChange={e => setNutritionTargets({...nutritionTargets, calories: parseInt(e.target.value) || 0})}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Protéines (g)</label>
                  <Input 
                    type="number"
                    value={nutritionTargets.protein || ''}
                    onChange={e => setNutritionTargets({...nutritionTargets, protein: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Glucides (g)</label>
                  <Input 
                    type="number"
                    value={nutritionTargets.carbs || ''}
                    onChange={e => setNutritionTargets({...nutritionTargets, carbs: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Lipides (g)</label>
                  <Input 
                    type="number"
                    value={nutritionTargets.fat || ''}
                    onChange={e => setNutritionTargets({...nutritionTargets, fat: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button variant="secondary" fullWidth onClick={() => setIsAdjustingTargets(false)}>ANNULER</Button>
                <Button variant="success" fullWidth onClick={handleGenerateNutrition}>
                  GÉNÉRER LE PLAN <CheckIcon size={18} className="ml-2" />
                </Button>
              </div>
            </div>
          </Card>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {isAddingMember && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-[600] flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-lg"
          >
            <Card className="w-full !p-8 bg-white/90 backdrop-blur-xl border-white/20 relative shadow-2xl">
              <button onClick={() => setIsAddingMember(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-zinc-900 bg-zinc-100 p-2 rounded-full transition-colors">
                <XIcon size={20} />
              </button>
            
            <h2 className="text-2xl font-black mb-1 uppercase italic">Nouveau Profil</h2>
            <p className="text-[10px] text-velatra-accent font-black uppercase tracking-widest mb-8">Créer un membre manuellement</p>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Nom Complet</label>
                  <Input 
                    value={newMemberData.name}
                    onChange={e => setNewMemberData({...newMemberData, name: e.target.value})}
                    placeholder="Jean Dupont"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Email</label>
                  <Input 
                    type="email"
                    value={newMemberData.email}
                    onChange={e => setNewMemberData({...newMemberData, email: e.target.value})}
                    placeholder="jean@email.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Mot de passe provisoire</label>
                <Input 
                  type="text"
                  value={newMemberData.password}
                  onChange={e => setNewMemberData({...newMemberData, password: e.target.value})}
                  placeholder="Ex: velatra2026"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Âge</label>
                  <Input 
                    type="number"
                    value={newMemberData.age || ''}
                    onChange={e => setNewMemberData({...newMemberData, age: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Poids (kg)</label>
                  <Input 
                    type="number"
                    value={newMemberData.weight || ''}
                    onChange={e => setNewMemberData({...newMemberData, weight: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Taille (cm)</label>
                  <Input 
                    type="number"
                    value={newMemberData.height || ''}
                    onChange={e => setNewMemberData({...newMemberData, height: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Expérience</label>
                  <select 
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-900 focus:outline-none focus:border-velatra-accent"
                    value={newMemberData.experienceLevel || 'Débutant'}
                    onChange={e => setNewMemberData({...newMemberData, experienceLevel: e.target.value as any})}
                  >
                    <option value="Débutant" className="bg-velatra-bgCard">Débutant</option>
                    <option value="Intermédiaire" className="bg-velatra-bgCard">Intermédiaire</option>
                    <option value="Avancé" className="bg-velatra-bgCard">Avancé</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Équipement</label>
                  <select 
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-900 focus:outline-none focus:border-velatra-accent"
                    value={newMemberData.equipment || 'Salle complète'}
                    onChange={e => setNewMemberData({...newMemberData, equipment: e.target.value as any})}
                  >
                    <option value="Salle complète" className="bg-velatra-bgCard">Salle complète</option>
                    <option value="Haltères/Kettlebells" className="bg-velatra-bgCard">Haltères/Kettlebells</option>
                    <option value="Poids du corps" className="bg-velatra-bgCard">Poids du corps</option>
                    <option value="Élastiques" className="bg-velatra-bgCard">Élastiques</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Jours / Semaine</label>
                  <Input 
                    type="number" min="1" max="7"
                    value={newMemberData.trainingDays || ''}
                    onChange={e => setNewMemberData({...newMemberData, trainingDays: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Durée (min)</label>
                  <Input 
                    type="number" step="15"
                    value={newMemberData.sessionDuration || ''}
                    onChange={e => setNewMemberData({...newMemberData, sessionDuration: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-900 tracking-widest ml-1">Blessures / Douleurs</label>
                <Input 
                  value={newMemberData.injuries || ''}
                  onChange={e => setNewMemberData({...newMemberData, injuries: e.target.value})}
                  placeholder="Ex: Douleur épaule droite..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <Button variant="secondary" fullWidth onClick={() => setIsAddingMember(false)}>ANNULER</Button>
                <Button variant="success" fullWidth onClick={handleCreateMember}>
                  CRÉER LE MEMBRE <CheckIcon size={18} className="ml-2" />
                </Button>
              </div>
            </div>
          </Card>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {nutritionPlan && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-[700] flex items-start justify-center p-0 md:p-8 overflow-y-auto"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-4xl bg-white/90 backdrop-blur-2xl min-h-screen md:min-h-0 md:rounded-[48px] border border-emerald-500/20 shadow-[0_0_100px_rgba(16,185,129,0.1)] relative overflow-hidden my-0 md:my-8 p-8 md:p-12"
          >
            <button onClick={() => setNutritionPlan(null)} className="fixed top-4 right-4 md:top-10 md:right-10 p-4 bg-white/90 backdrop-blur-md rounded-full text-zinc-500 hover:text-zinc-900 z-[800] border border-zinc-200 hover:bg-red-500 hover:border-red-500 transition-all shadow-xl"><XIcon size={24} /></button>
            
            <div className="flex items-center gap-4 mb-8">
               <div className="p-3 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl text-zinc-900 shadow-[0_0_20px_rgba(16,185,129,0.4)]"><CheckIcon size={24} /></div>
               <div>
                 <h2 className="text-3xl font-black text-zinc-900 uppercase italic tracking-tight">Plan Nutritionnel</h2>
                 <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Généré par Velatra AI Engine</p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
              <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6 text-center">
                <div className="text-[10px] font-black text-zinc-900 uppercase tracking-widest mb-2">Calories</div>
                <div className="text-2xl font-black text-zinc-900">{nutritionPlan.targetCalories}</div>
              </div>
              <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6 text-center">
                <div className="text-[10px] font-black text-zinc-900 uppercase tracking-widest mb-2">Protéines</div>
                <div className="text-2xl font-black text-emerald-400">{nutritionPlan.protein}g</div>
              </div>
              <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6 text-center">
                <div className="text-[10px] font-black text-zinc-900 uppercase tracking-widest mb-2">Glucides</div>
                <div className="text-2xl font-black text-blue-400">{nutritionPlan.carbs}g</div>
              </div>
              <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6 text-center">
                <div className="text-[10px] font-black text-zinc-900 uppercase tracking-widest mb-2">Lipides</div>
                <div className="text-2xl font-black text-orange-400">{nutritionPlan.fat}g</div>
              </div>
            </div>

            <h3 className="text-xl font-black text-zinc-900 uppercase italic mb-6">Répartition des Repas</h3>
            <div className="space-y-4 mb-10">
              {nutritionPlan.meals?.map((repas: any, idx: number) => {
                if (!repas) return null;
                return (
                <div key={idx} className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-zinc-200">
                    <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest">{repas.name || `Repas ${idx + 1}`}</h4>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-widest">{repas.calories} kcal</span>
                      <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full uppercase tracking-widest">{repas.protein}g P</span>
                      <span className="text-[10px] font-black text-green-400 bg-green-500/10 px-3 py-1 rounded-full uppercase tracking-widest">{repas.carbs}g G</span>
                      <span className="text-[10px] font-black text-yellow-400 bg-yellow-500/10 px-3 py-1 rounded-full uppercase tracking-widest">{repas.fat}g L</span>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {(repas.description || '').split(', ').map((aliment: string, i: number) => (
                      <li key={i} className="text-sm text-zinc-900 flex items-start gap-3">
                        <span className="text-emerald-500 mt-1">•</span> {aliment}
                      </li>
                    ))}
                  </ul>
                </div>
              )})}
            </div>

            <h3 className="text-xl font-black text-zinc-900 uppercase italic mb-6">Liste de Courses</h3>
            <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6">
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {nutritionPlan.liste_courses?.map((item: string, idx: number) => (
                  <li key={idx} className="text-sm text-zinc-900 flex items-center gap-3">
                    <div className="w-4 h-4 rounded border border-zinc-300 flex items-center justify-center bg-zinc-50"></div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};
