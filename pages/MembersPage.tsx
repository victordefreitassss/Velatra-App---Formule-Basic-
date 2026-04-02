
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppState, User, Performance, BodyData, Program, Gender, Goal, Subscription, Plan, NutritionPlan, Payment, Invoice, SessionLog, DriveFile } from '../types';
import { Card, Button, Input, Badge } from '../components/UI';
import { 
  SearchIcon, InfoIcon, 
  XIcon, DumbbellIcon, BarChartIcon, CheckIcon, SaveIcon, LayersIcon, MessageCircleIcon, Edit2Icon, BotIcon, TargetIcon, CalendarIcon, CreditCardIcon, FileTextIcon, BellIcon, DownloadIcon, LinkIcon, UploadIcon, FolderIcon, FileIcon, EyeIcon, Trash2Icon
} from '../components/Icons';
import { db, doc, setDoc, updateDoc, deleteDoc, secondaryAuth, createUserWithEmailAndPassword, collection, query, where, getDocs, ref, uploadBytes, getDownloadURL, storage, addDoc } from '../firebase';
import { uploadBytesResumable, deleteObject } from 'firebase/storage';
import { GOALS } from '../constants';
import { calculateNutritionPlan, updateNutritionPlanForWeight } from '../utils';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { MemberNutritionView } from '../components/MemberNutritionView';

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

import { ErrorBoundary } from '../components/ErrorBoundary';

export const MembersPage: React.FC<{ state: AppState, setState: any, showToast: any }> = ({ state, setState, showToast }) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(state.memberFilter || "Tous");
  const [selectedProfile, setSelectedProfile] = useState<User | null>(state.selectedMember || null);
  const [selectedLog, setSelectedLog] = useState<SessionLog | null>(null);

  useEffect(() => {
    if (state.memberFilter) {
      setFilter(state.memberFilter);
    }
  }, [state.memberFilter]);

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
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [isDetectingStagnation, setIsDetectingStagnation] = useState(false);
  const [stagnationResult, setStagnationResult] = useState<any>(null);
  const [isGeneratingProgram, setIsGeneratingProgram] = useState(false);
  const [isAdjustingTargets, setIsAdjustingTargets] = useState(false);
  const [nutritionTargets, setNutritionTargets] = useState({ calories: 2000, protein: 150, carbs: 200, fat: 70 });
  const [nutritionPlan, setNutritionPlan] = useState<any>(null);
  const [showNutritionLog, setShowNutritionLog] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberData, setNewMemberData] = useState<Partial<User> & { password?: string }>({
    name: '', email: '', password: '', phone: '', gender: 'M', age: 30, birthDate: '', weight: 70, height: 175, objectifs: [], notes: ''
  });
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [newPayment, setNewPayment] = useState<Partial<Payment>>({ amount: 0, method: 'cash', status: 'paid', date: new Date().toISOString().split('T')[0] });
  const [isUploadingDriveFile, setIsUploadingDriveFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [confirmDeleteFileId, setConfirmDeleteFileId] = useState<string | null>(null);

  const members = state.users.filter(u => {
    if (u.role !== 'member') return false;
    if (!u.name?.toLowerCase().includes(search.toLowerCase())) return false;
    
    if (filter === "Actifs") return u.lastWorkoutDate && (new Date().getTime() - new Date(u.lastWorkoutDate).getTime()) < 30 * 24 * 60 * 60 * 1000;
    if (filter === "Inactifs") return !u.lastWorkoutDate || (new Date().getTime() - new Date(u.lastWorkoutDate).getTime()) >= 30 * 24 * 60 * 60 * 1000;
    if (filter === "Avec Programme") return state.programs.some(p => p.memberId === Number(u.id) && !p.isPlannedSession);
    if (filter === "Sans Programme") return !state.programs.some(p => p.memberId === Number(u.id) && !p.isPlannedSession);
    if (filter === "Demande de Plan") return u.planRequested;
    
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
        await updateDoc(doc(db, "nutritionPlans", plan.id.toString()), updatedPlan);
      }
      
      showToast("Scan balancé enregistré");
      setNewScan({ weight: "", fat: "", muscle: "" });
    } catch (err) {
      console.error("Error saving scan:", err);
      showToast("Erreur lors de l'enregistrement", "error");
    }
  };

  const [confirmDeleteScanId, setConfirmDeleteScanId] = useState<number | null>(null);

  const confirmDeleteScan = async () => {
    if (!confirmDeleteScanId) return;
    try {
      await deleteDoc(doc(db, "bodyData", confirmDeleteScanId.toString()));
      showToast("Mesure supprimée");
    } catch (err) {
      showToast("Erreur de suppression", "error");
    } finally {
      setConfirmDeleteScanId(null);
    }
  };

  const handleDeleteScan = async (scanId: number) => {
    setConfirmDeleteScanId(scanId);
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

  const [confirmDeleteMemberId, setConfirmDeleteMemberId] = useState<string | null>(null);

  const confirmDeleteMember = async () => {
    if (!confirmDeleteMemberId) return;
    try {
      await deleteDoc(doc(db, "users", confirmDeleteMemberId));
      showToast("Membre supprimé avec succès");
      setIsEditingInfo(false);
      closeProfile();
    } catch (err) {
      console.error("Error deleting member:", err);
      showToast("Erreur lors de la suppression", "error");
    } finally {
      setConfirmDeleteMemberId(null);
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedProfile || !selectedProfile.firebaseUid) return;
    setConfirmDeleteMemberId(selectedProfile.firebaseUid);
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

  const handleUpdateSessionCredits = async (member: User, typeId: string, amount: number) => {
    if (!member.firebaseUid) return;
    const currentCredits = member.sessionCredits?.[typeId] || 0;
    const newCredits = Math.max(0, currentCredits + amount);
    
    try {
      await updateDoc(doc(db, "users", member.firebaseUid), {
        [`sessionCredits.${typeId}`]: newCredits
      });
      setSelectedProfile({ 
        ...member, 
        sessionCredits: { ...(member.sessionCredits || {}), [typeId]: newCredits } 
      });
      showToast(`Crédits mis à jour (${newCredits})`);
    } catch (err) {
      console.error("Error updating session credits:", err);
      showToast("Erreur lors de la mise à jour des crédits", "error");
    }
  };

  const handleEditProgram = (member: User) => {
    const mid = Number(member.id);
    const existingProg = state.programs.find(p => Number(p.memberId) === mid && !p.isPlannedSession);
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
        category: newPayment.category || 'other',
        reference: `PAY-${Date.now()}`
      } as Payment;
      await setDoc(doc(db, "payments", paymentData.id), paymentData);
      showToast("Paiement ajouté avec succès");
      setIsAddingPayment(false);
      setNewPayment({ amount: 0, method: 'cash', status: 'paid', date: new Date().toISOString().split('T')[0], category: 'other' });
    } catch (err) {
      console.error("Error adding payment:", err);
      showToast("Erreur lors de l'ajout du paiement", "error");
    }
  };

  const handleDriveFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !state.currentClub?.id || !state.user || !selectedProfile) return;

    setIsUploadingDriveFile(true);
    setUploadProgress(0);

    const totalFiles = files.length;
    let completedFiles = 0;

    const uploadPromises = Array.from(files).map((file) => {
      return new Promise<void>((resolve, reject) => {
        const fileId = doc(collection(db, 'driveFiles')).id;
        const storageRef = ref(storage, `drive/${state.currentClub!.id}/${fileId}_${file.name}`);
        
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed', 
          (snapshot) => {
            // progress tracking could be added here
          }, 
          (error) => {
            console.error("Error uploading file:", error);
            reject(error);
          }, 
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              
              const newFile: DriveFile = {
                id: fileId,
                clubId: state.currentClub!.id,
                name: file.name,
                type: file.type || 'application/octet-stream',
                size: file.size,
                url: downloadURL,
                path: storageRef.fullPath,
                createdAt: new Date().toISOString(),
                uploadedBy: state.user!.id,
                folderId: null,
                sharedWith: [Number(selectedProfile.id)]
              };

              await setDoc(doc(db, 'driveFiles', fileId), newFile);

              // Create notification for the member
              await addDoc(collection(db, 'notifications'), {
                clubId: state.currentClub!.id,
                userId: Number(selectedProfile.id),
                title: 'Nouveau document',
                message: `Un nouveau document "${file.name}" a été ajouté à votre dossier.`,
                type: 'info',
                read: false,
                createdAt: new Date().toISOString(),
                link: 'home'
              });

              completedFiles++;
              setUploadProgress((completedFiles / totalFiles) * 100);
              resolve();
            } catch (err) {
              reject(err);
            }
          }
        );
      });
    });

    try {
      await Promise.all(uploadPromises);
      showToast("Fichier(s) importé(s) avec succès");
    } catch (error) {
      console.error("Error in batch upload:", error);
      showToast("Erreur lors de l'import des fichiers", "error");
    } finally {
      setIsUploadingDriveFile(false);
      setUploadProgress(0);
    }
  };

  const confirmDeleteFile = async () => {
    if (!confirmDeleteFileId) return;
    const file = state.driveFiles.find(f => f.id === confirmDeleteFileId);
    if (!file) return;

    try {
      const storageRef = ref(storage, file.path);
      await deleteObject(storageRef);
      await deleteDoc(doc(db, 'driveFiles', file.id));
      showToast("Fichier supprimé");
    } catch (error) {
      console.error("Error deleting file:", error);
      showToast("Erreur lors de la suppression du fichier", "error");
    } finally {
      setConfirmDeleteFileId(null);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedProfile) return;
    setIsGeneratingReport(true);
    setGeneratedReport(null);
    try {
      const { generateAutoReport } = await import('../services/aiService');
      const mid = Number(selectedProfile.id);
      const memberBody = state.bodyData.filter(b => Number(b.memberId) === mid);
      const memberPerfs = state.performances.filter(p => Number(p.memberId) === mid);
      
      const report = await generateAutoReport(selectedProfile, memberBody, memberPerfs);
      
      setGeneratedReport(report);
      showToast("Bilan généré avec succès", "success");
    } catch (error: any) {
      console.error("Erreur génération bilan:", error);
      showToast("Erreur lors de la génération du bilan : " + error.message, "error");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleDetectStagnation = async () => {
    if (!selectedProfile) return;
    setIsDetectingStagnation(true);
    setStagnationResult(null);
    try {
      const { detectStagnation } = await import('../services/aiService');
      const mid = Number(selectedProfile.id);
      const memberPerfs = state.performances.filter(p => Number(p.memberId) === mid);
      
      const result = await detectStagnation(selectedProfile, memberPerfs, state.exercises);
      setStagnationResult(result);
      
      if (result.hasStagnation) {
        showToast(`Stagnation détectée sur : ${result.stagnatingExercises.join(', ')}`, "error");
      } else {
        showToast("Aucune stagnation détectée, bonne progression !", "success");
      }
    } catch (error: any) {
      console.error("Erreur détection stagnation:", error);
      showToast("Erreur lors de l'analyse : " + error.message, "error");
    } finally {
      setIsDetectingStagnation(false);
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
      const existingProg = state.programs.find(p => Number(p.memberId) === mid && !p.isPlannedSession);
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
    } catch (error: any) {
      console.error("Erreur génération programme:", error);
      showToast("Erreur lors de la génération du programme : " + error.message, "error");
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

      const weight = latestScan?.weight || selectedProfile.weight || 70;
      const height = selectedProfile.height || 175;
      const age = selectedProfile.age || 30;
      const gender = selectedProfile.gender || 'M';
      
      let bmr = (10 * weight) + (6.25 * height) - (5 * age);
      bmr += gender === 'M' ? 5 : -161;
      let tdee = bmr * 1.55;

      const { generateNutritionPlan } = await import('../services/aiService');
      const plan = await generateNutritionPlan(selectedProfile, latestScan, nutritionTargets);
      
      const existingPlan = state.nutritionPlans?.find(p => p.memberId === mid);
      const planId = existingPlan?.id?.toString() || Date.now().toString();
      
      const newPlan: NutritionPlan = {
        id: planId,
        memberId: mid,
        clubId: selectedProfile.clubId,
        createdAt: existingPlan?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        weight: weight,
        height: height,
        age: age,
        gender: gender,
        activityLevel: "Modérément actif",
        goal: (selectedProfile.objectifs[0] as any) || "Perte de poids",
        durationWeeks: 4,
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        targetCalories: typeof plan.calories_totales === 'number' ? plan.calories_totales : parseInt(plan.calories_totales || "0") || 0,
        protein: typeof plan.macros?.proteines_g === 'number' ? plan.macros.proteines_g : parseInt(plan.macros?.proteines_g || "0") || 0,
        carbs: typeof plan.macros?.glucides_g === 'number' ? plan.macros.glucides_g : parseInt(plan.macros?.glucides_g || "0") || 0,
        fat: typeof plan.macros?.lipides_g === 'number' ? plan.macros.lipides_g : parseInt(plan.macros?.lipides_g || "0") || 0,
        meals: plan.repas?.map((r: any, idx: number) => ({
          id: Date.now().toString() + idx,
          name: r.type.replace('_', ' '),
          description: r.description || '',
          calories: typeof r.calories === 'number' ? r.calories : parseInt(r.calories || "0") || 0,
          protein: typeof r.proteines === 'number' ? r.proteines : parseInt(r.proteines || "0") || 0,
          carbs: typeof r.glucides === 'number' ? r.glucides : parseInt(r.glucides || "0") || 0,
          fat: typeof r.lipides === 'number' ? r.lipides : parseInt(r.lipides || "0") || 0
        })) || [],
        liste_courses: (plan.liste_courses || []).map((item: string, idx: number) => ({
          id: Date.now().toString() + 'course' + idx,
          name: item,
          checked: false
        })),
        aiGenerated: true
      };

      await setDoc(doc(db, "nutritionPlans", planId.toString()), newPlan);

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
    const memberPerfs = (state.performances || []).filter(p => Number(p.memberId) === mid);
    const memberBody = (state.bodyData || []).filter(b => Number(b.memberId) === mid);
    const program = (state.programs || []).find(p => Number(p.memberId) === mid && !p.isPlannedSession);

    const topPerfs = memberPerfs.reduce((acc: any, curr) => {
      if (!acc[curr.exId] || acc[curr.exId].weight < curr.weight) {
        acc[curr.exId] = curr;
      }
      return acc;
    }, {});

    const memberOrders = (state.supplementOrders || []).filter(o => Number(o.adherentId) === mid);
    const totalSpent = memberOrders.filter(o => o.status === 'completed').reduce((acc, curr) => acc + curr.total, 0);
    const subscription = (state.subscriptions || []).find(s => s.memberId === mid && s.status === 'active');

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
      memberId: Number(selectedProfile.id),
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
      
      // Create notification for the member
      await addDoc(collection(db, 'notifications'), {
        clubId: state.user.clubId,
        userId: Number(selectedProfile.id),
        title: 'Nouvel abonnement',
        message: `L'abonnement "${plan.name}" vous a été assigné.`,
        type: 'success',
        read: false,
        createdAt: new Date().toISOString(),
        link: 'profile'
      });

      // Add credits to user
      if (selectedProfile.firebaseUid && (plan.credits || plan.sessionCredits)) {
        const updates: any = {};
        if (plan.credits) {
          updates.credits = (selectedProfile.credits || 0) + plan.credits;
        }
        if (plan.sessionCredits) {
          Object.entries(plan.sessionCredits).forEach(([typeId, amount]) => {
            if (amount) {
              updates[`sessionCredits.${typeId}`] = (selectedProfile.sessionCredits?.[typeId] || 0) + amount;
            }
          });
        }
        await updateDoc(doc(db, "users", selectedProfile.firebaseUid), updates);
      }

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
    const subscription = state.subscriptions.find(s => s.memberId === Number(selectedProfile.id) && s.status === 'active');
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

  const handleImportClients = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      if (lines.length < 2) {
        showToast("Le fichier CSV est vide ou invalide", "error");
        return;
      }

      // Assume header is: Nom, Email, Telephone
      let successCount = 0;
      let errorCount = 0;

      showToast("Importation en cours...", "info");

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(/[,;]/).map(s => s.trim().replace(/^"|"$/g, ''));
        let name = '', email = '', phone = '';

        if (parts.length >= 4 && parts[2].includes('@')) {
          name = `${parts[0]} ${parts[1]}`.trim();
          email = parts[2];
          phone = parts[3] || '';
        } else if (parts.length >= 3 && parts[1].includes('@')) {
          name = parts[0];
          email = parts[1];
          phone = parts[2] || '';
        } else if (parts.length >= 2 && parts[1].includes('@')) {
          name = parts[0];
          email = parts[1];
        } else {
          // Fallback if email is not found where expected, just try to use the first 3 columns
          name = parts[0];
          email = parts[1];
          phone = parts[2] || '';
        }

        if (!name || !email || !email.includes('@')) continue;

        try {
          // Create Firebase Auth user with a default password
          const defaultPassword = "VelatraUser2026!";
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, defaultPassword);
          const firebaseUid = userCredential.user.uid;

          const newUserId = Date.now() + i; // Ensure unique ID
          const newUser: User = {
            id: newUserId,
            clubId: state.user?.clubId || '',
            code: "",
            pwd: "", // Handled by Firebase Auth
            name: name,
            email: email,
            phone: phone || '',
            role: 'member',
            avatar: '',
            gender: 'M',
            age: 30,
            weight: 70,
            height: 175,
            objectifs: ['Perte de poids'],
            experienceLevel: 'Débutant',
            trainingDays: 3,
            createdAt: new Date().toISOString(),
            notes: '',
            xp: 0,
            streak: 0,
            pointsFidelite: 0
          };

          await setDoc(doc(db, "users", firebaseUid), newUser);
          successCount++;
        } catch (err) {
          console.error(`Error importing user ${email}:`, err);
          errorCount++;
        }
      }

      showToast(`Import terminé : ${successCount} ajoutés, ${errorCount} erreurs`, successCount > 0 ? "success" : "error");
      // Reset file input
      e.target.value = '';
    };
    reader.readAsText(file);
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
        birthDate: newMemberData.birthDate || '',
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
      setNewMemberData({ name: '', email: '', password: '', phone: '', gender: 'M', age: 30, birthDate: '', weight: 70, height: 175, objectifs: [], notes: '' });
      // Select the new member automatically
      setSelectedProfile(newUser);
    } catch (err: any) {
      console.error("Error creating member", err);
      showToast(err.message || "Erreur lors de la création", "error");
    }
  };

  const isStripeConnected = state.currentClub?.settings?.payment?.stripeConnected || 
    (state.currentClub?.settings?.payment?.stripeSecretKey?.startsWith('sk') || 
     state.currentClub?.settings?.payment?.stripeSecretKey?.startsWith('rk'));

  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const handleCopyPaymentLink = async () => {
    if (!isStripeConnected) {
      showToast("Veuillez connecter votre compte Stripe dans les Paramètres pour générer des liens de paiement.", "error");
      return;
    }
    
    const subscription = state.subscriptions?.find(s => s.memberId === Number(selectedProfile?.id) && s.status === 'active');
    if (!subscription) {
      showToast("Ce membre n'a pas d'abonnement actif. Veuillez lui assigner une formule d'abord.", "error");
      return;
    }

    const plan = state.plans?.find(p => p.id === subscription.planId);
    if (!plan || !plan.stripePriceId) {
      showToast("La formule de ce membre n'a pas d'ID Stripe. Veuillez recréer ou modifier la formule dans les paramètres.", "error");
      return;
    }

    setIsGeneratingLink(true);
    try {
      const stripeSecretKey = state.currentClub?.settings?.payment?.stripeSecretKey;
      const res = await fetch('/api/stripe/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripeSecretKey,
          priceId: plan.stripePriceId
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erreur lors de la génération du lien");
      }

      const data = await res.json();
      navigator.clipboard.writeText(data.url);
      showToast("Lien de paiement Stripe généré et copié dans le presse-papier !", "success");
    } catch (error: any) {
      console.error("Error generating payment link:", error);
      showToast(error.message || "Erreur lors de la génération du lien", "error");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const [isCharging, setIsCharging] = useState<string | null>(null);

  const [isGeneratingLinkForPayment, setIsGeneratingLinkForPayment] = useState<string | null>(null);

  const handleGeneratePaymentLink = async (payment: Payment) => {
    if (!isStripeConnected) {
      showToast("Veuillez connecter votre compte Stripe dans les Paramètres.", "error");
      return;
    }

    setIsGeneratingLinkForPayment(payment.id);
    try {
      const stripeSecretKey = state.currentClub?.settings?.payment?.stripeSecretKey;
      
      // We create a one-off product and price for this specific payment
      const resPrice = await fetch('/api/stripe/create-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripeSecretKey,
          name: payment.category === 'subscription' ? 'Abonnement' : payment.category === 'coaching' ? 'Coaching' : 'Paiement',
          price: payment.amount,
          billingCycle: 'once',
          description: `Paiement pour ${state.currentClub?.name || 'Club'}`
        })
      });

      if (!resPrice.ok) throw new Error("Erreur lors de la création du prix Stripe");
      const priceData = await resPrice.json();

      const resLink = await fetch('/api/stripe/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripeSecretKey,
          priceId: priceData.priceId
        })
      });

      if (!resLink.ok) throw new Error("Erreur lors de la génération du lien");
      const linkData = await resLink.json();

      navigator.clipboard.writeText(linkData.url);
      showToast("Lien de paiement copié dans le presse-papier !", "success");
    } catch (error: any) {
      console.error("Error generating payment link:", error);
      showToast(error.message || "Erreur lors de la génération du lien", "error");
    } finally {
      setIsGeneratingLinkForPayment(null);
    }
  };

  const handleCharge = async (payment: Payment) => {
    const member = state.users.find(u => Number(u.id) === payment.memberId);
    if (!member) return;

    if (!isStripeConnected) {
      showToast("Veuillez connecter votre compte Stripe dans les Paramètres.", "error");
      return;
    }

    if (!member.stripeCustomerId) {
      showToast("Ce membre n'a pas encore de moyen de paiement enregistré sur Stripe.", "error");
      return;
    }

    setIsCharging(payment.id);
    try {
      const stripeSecretKey = state.currentClub?.settings?.payment?.stripeSecretKey;
      const res = await fetch('/api/stripe/charge-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripeSecretKey,
          customerId: member.stripeCustomerId,
          amount: payment.amount,
          description: `Paiement pour ${payment.category || 'service'}`
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erreur lors du prélèvement");
      }

      const data = await res.json();
      
      if (data.success && data.status === 'succeeded') {
        // Update payment status to paid
        await updateDoc(doc(db, "payments", payment.id), {
          status: 'paid',
          date: new Date().toISOString()
        });
        showToast("Prélèvement effectué avec succès !", "success");
      } else {
        showToast("Le prélèvement est en attente ou nécessite une action.", "info");
      }
    } catch (error: any) {
      console.error("Error charging customer:", error);
      showToast(error.message || "Erreur lors du prélèvement", "error");
    } finally {
      setIsCharging(null);
    }
  };

  const handleRemind = (payment: Payment) => {
    const member = state.users.find(u => Number(u.id) === payment.memberId);
    if (!member || !member.phone) {
      showToast("Ce membre n'a pas de numéro de téléphone enregistré.", "error");
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
      showToast(`Facture ${invoiceNumber} générée avec succès.`, "success");
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de la génération de la facture.", "error");
    }
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    const member = state.users.find(u => Number(u.id) === invoice.memberId);
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
          <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[3px]">{members.length} Profils Actifs</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            id="import-clients-csv" 
            onChange={handleImportClients} 
          />
          <label 
            htmlFor="import-clients-csv" 
            className="bg-white backdrop-blur-xl text-zinc-900 px-6 py-3 rounded-2xl font-black text-xs italic cursor-pointer hover:bg-white transition-colors flex items-center gap-2 border border-zinc-200 shadow-sm"
          >
            <UploadIcon size={16} />
            IMPORT CSV
          </label>
          <Button variant="primary" onClick={() => setIsAddingMember(true)} className="!py-3 !px-6 !rounded-2xl shadow-xl shadow-emerald-500/20 font-black text-xs italic">
            + NOUVEAU PROFIL
          </Button>
        </div>
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
                const member = members.find(m => Number(m.id) === sub.memberId);
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
          <SearchIcon size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input placeholder="Rechercher par nom..." className="pl-14 \!bg-white \!border-zinc-200 !rounded-2xl font-bold text-zinc-900 placeholder-zinc-400 shadow-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {["Tous", "Demande de Plan", "Actifs", "Inactifs", "Avec Programme", "Sans Programme"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${filter === f ? 'bg-emerald-500 text-zinc-900' : 'bg-white backdrop-blur-xl text-zinc-500 hover:text-zinc-900 hover:bg-white border border-zinc-200 shadow-sm'}`}
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
              <Card className={`flex flex-col gap-4 border-none ring-1 transition-all !p-6 bg-zinc-50 backdrop-blur-xl ${u.planRequested || hasFeedback ? 'ring-orange-500/30' : ' hover:ring-emerald-500/30'} shadow-sm hover:shadow-md h-full`}>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center font-black text-2xl text-zinc-900 shadow-inner overflow-hidden">
                    {u.avatar?.startsWith('http') ? (
                      <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                    ) : (
                      u.avatar || u.name.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-lg text-zinc-900 leading-none mb-2 uppercase tracking-tight">{u.name}</div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="dark" className="!bg-zinc-50 !backdrop-blur-xl \!text-zinc-500 \!border-zinc-200 !p-1 !text-[8px]">{stats.perfs.length} PR</Badge>
                      {hasFeedback && <Badge variant="orange" className="!bg-orange-500/10 !text-orange-500 !border-orange-500/20 !p-1 !text-[8px] animate-pulse">FEEDBACK</Badge>}
                      {u.planRequested && <Badge variant="orange" className="!bg-orange-500/10 !text-orange-500 !border-orange-500/20 !p-1 !text-[8px] animate-pulse">DEMANDE PLAN</Badge>}
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

      {createPortal(
        <AnimatePresence>
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
              <div className="bg-white border border-zinc-200 p-4 rounded-2xl backdrop-blur-xl shadow-sm">
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
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[500] flex items-start justify-center p-0 md:p-8 overflow-y-auto"
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-full max-w-6xl bg-zinc-100 backdrop-blur-2xl min-h-screen md:min-h-0 md:rounded-[48px] border border-zinc-200 shadow-2xl relative overflow-hidden my-0 md:my-8"
              >
                <ErrorBoundary>
                <button onClick={closeProfile} className="fixed top-4 right-4 md:absolute md:top-10 md:right-10 p-3 md:p-4 bg-zinc-100 backdrop-blur-md rounded-full text-zinc-500 hover:text-zinc-900 z-[600] border border-zinc-200 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all shadow-xl"><XIcon size={20} className="md:w-6 md:h-6" /></button>

                {selectedProfile.planRequested && (
                  <div className="bg-orange-500 text-zinc-900 p-4 flex items-center justify-between z-[500] relative">
                    <div className="flex items-center gap-3">
                      <FileTextIcon size={20} />
                      <div>
                        <div className="font-black uppercase tracking-widest text-xs">Demande de programme en attente</div>
                        <div className="text-[10px] opacity-80">Ce membre a demandé un nouveau programme d'entraînement.</div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button variant="secondary" className="!py-1.5 !px-3 !text-[10px] !bg-zinc-100 !text-zinc-900 !border-zinc-400 hover:!bg-zinc-200" onClick={async () => {
                        if (selectedProfile.firebaseUid) {
                          try {
                            await updateDoc(doc(db, "users", selectedProfile.firebaseUid), { planRequested: false });
                            setSelectedProfile({ ...selectedProfile, planRequested: false });
                          } catch (err) {
                            console.error("Error updating planRequested:", err);
                          }
                        }
                      }}>
                        IGNORER
                      </Button>
                      <Button variant="primary" className="!py-1.5 !px-3 !text-[10px] !bg-white !text-orange-500 hover:!bg-zinc-50" onClick={() => handleEditProgram(selectedProfile)}>
                        CRÉER PROGRAMME
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12">
                  {/* SIDEBAR */}
                  <div className="lg:col-span-4 bg-zinc-50 backdrop-blur-xl border-r  p-6 md:p-10 space-y-8 md:space-y-10 pt-20 md:pt-10">
                  <div className="text-center relative">
                    <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-4xl font-black mx-auto mb-6 shadow-2xl overflow-hidden">
                      {selectedProfile.avatar?.startsWith('http') ? (
                        <img src={selectedProfile.avatar} alt={selectedProfile.name} className="w-full h-full object-cover" />
                      ) : (
                        selectedProfile.avatar || selectedProfile.name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <button 
                      onClick={() => {
                        setEditInfoData({
                          name: selectedProfile.name,
                          age: selectedProfile.age,
                          birthDate: selectedProfile.birthDate || '',
                          gender: selectedProfile.gender,
                          weight: selectedProfile.weight,
                          height: selectedProfile.height,
                          objectifs: selectedProfile.objectifs,
                          notes: selectedProfile.notes,
                          avatar: selectedProfile.avatar
                        });
                        setIsEditingInfo(true);
                      }}
                      className="absolute top-0 right-1/4 p-2 bg-zinc-50 backdrop-blur-xl rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-white transition-all border border-zinc-200 shadow-sm"
                      title="Modifier les infos"
                    >
                      <Edit2Icon size={16} />
                    </button>
                    <h2 className="text-3xl font-black text-zinc-900 uppercase italic tracking-tighter">{selectedProfile.name}</h2>
                    <Badge variant="accent" className="mt-3 !px-4 !py-1.5">ÉVOLUTION</Badge>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black uppercase tracking-[4px] text-emerald-500">Crédits Coaching</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between bg-zinc-50 backdrop-blur-xl p-3 rounded-2xl border border-zinc-200 shadow-sm">
                        <div>
                          <div className="text-xl font-black text-zinc-900">{selectedProfile.credits || 0}</div>
                          <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Standard</div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="secondary" className="!p-1 !h-8 !w-8 flex items-center justify-center \!bg-zinc-50 \!border-zinc-200 !text-zinc-900 hover:!bg-white shadow-sm" onClick={() => handleUpdateCredits(selectedProfile, -1)}>-</Button>
                          <Button variant="secondary" className="!p-1 !h-8 !w-8 flex items-center justify-center \!bg-zinc-50 \!border-zinc-200 !text-zinc-900 hover:!bg-white shadow-sm" onClick={() => handleUpdateCredits(selectedProfile, 1)}>+</Button>
                        </div>
                      </div>

                      {state.currentClub?.settings?.booking?.sessionTypes?.map(type => (
                        <div key={type.id} className="flex items-center justify-between bg-zinc-50 backdrop-blur-xl p-3 rounded-2xl border border-zinc-200 shadow-sm">
                          <div>
                            <div className="text-xl font-black text-zinc-900">{selectedProfile.sessionCredits?.[type.id] || 0}</div>
                            <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{type.name}</div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="secondary" className="!p-1 !h-8 !w-8 flex items-center justify-center" onClick={() => handleUpdateSessionCredits(selectedProfile, type.id, -1)}>-</Button>
                            <Button variant="secondary" className="!p-1 !h-8 !w-8 flex items-center justify-center" onClick={() => handleUpdateSessionCredits(selectedProfile, type.id, 1)}>+</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl space-y-4 shadow-sm">
                    <h3 className="text-[10px] font-black uppercase tracking-[4px] text-emerald-500">Fidélité & Achats</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Points</div>
                        <div className="text-xl font-black text-zinc-900">{selectedProfile.pointsFidelite || 0}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Achats</div>
                        <div className="text-xl font-black text-emerald-500">{stats.totalSpent}€</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl space-y-4 shadow-sm">
                    <h3 className="text-[10px] font-black uppercase tracking-[4px] text-emerald-500">Profil & Objectifs</h3>
                    
                    {(selectedProfile.email || selectedProfile.phone) && (
                      <div className="space-y-3 mb-6 pb-4 border-b ">
                        {selectedProfile.email && (
                          <div>
                            <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Email</div>
                            <div className="text-sm font-bold text-zinc-900">{selectedProfile.email}</div>
                          </div>
                        )}
                        {selectedProfile.phone && (
                          <div>
                            <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Téléphone</div>
                            <div className="text-sm font-bold text-zinc-900">{selectedProfile.phone}</div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Âge</div>
                        <div className="text-sm font-bold text-zinc-900">{selectedProfile.age} ans</div>
                      </div>
                      {selectedProfile.birthDate && (
                        <div>
                          <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Date de naissance</div>
                          <div className="text-sm font-bold text-zinc-900">{new Date(selectedProfile.birthDate).toLocaleDateString()}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Sexe</div>
                        <div className="text-sm font-bold text-zinc-900">{selectedProfile.gender === 'M' ? 'Homme' : selectedProfile.gender === 'F' ? 'Femme' : 'Autre'}</div>
                      </div>
                      <div>
                        <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Taille</div>
                        <div className="text-sm font-bold text-zinc-900">{selectedProfile.height} cm</div>
                      </div>
                      <div>
                        <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Poids Initial</div>
                        <div className="text-sm font-bold text-zinc-900">{selectedProfile.weight} kg</div>
                      </div>
                    </div>
                    {selectedProfile.objectifs && selectedProfile.objectifs.length > 0 && (
                      <div>
                        <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-2">Objectifs</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedProfile.objectifs.map((obj, idx) => (
                            <span key={idx} className="px-2 py-1 bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-full text-[9px] font-bold text-zinc-900 uppercase tracking-wider shadow-sm">
                              {obj}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedProfile.notes && (
                    <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl space-y-2 shadow-sm">
                      <h3 className="text-[10px] font-black uppercase tracking-[4px] text-emerald-500">Notes d'Inscription</h3>
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
                       <div className="flex flex-col sm:flex-row gap-2">
                         <Button variant="secondary" className="flex-1 !py-2 !text-[9px] !rounded-xl !bg-zinc-50 \!backdrop-blur-xl \!border-zinc-200 !text-zinc-900 hover:!bg-white shadow-sm" onClick={async () => {
                           if (stats.program) {
                             try {
                               await updateDoc(doc(db, "programs", stats.program.id.toString()), { memberRemarks: "" });
                               // No need to update local state manually as onSnapshot will handle it, 
                               // but for immediate UI feedback we might want to refresh stats if they are derived from state
                             } catch (err) {
                               console.error("Error clearing memberRemarks:", err);
                             }
                           }
                         }}>
                            MARQUER COMME TRAITÉ
                         </Button>
                         <Button variant="primary" className="flex-1 !py-2 !text-[9px] !rounded-xl" onClick={() => handleEditProgram(selectedProfile)}>
                            ADAPTER LE PLAN
                         </Button>
                       </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                       <h3 className="text-[10px] font-black uppercase tracking-[4px] text-emerald-500">Abonnement</h3>
                    </div>
                    {stats.subscription ? (
                      <div className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                          <span className="font-black text-zinc-900 text-lg uppercase italic">{stats.subscription.planName}</span>
                          <span className="text-[10px] px-2 py-1 bg-green-500/20 text-green-600 rounded-full font-black uppercase tracking-widest">Actif</span>
                        </div>
                        <div className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest">
                          {stats.subscription.price}€ / {stats.subscription.billingCycle === 'monthly' ? 'mois' : stats.subscription.billingCycle === 'yearly' ? 'an' : 'fois'}
                        </div>
                        
                        <div className="pt-4 border-t  space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-500">Début :</span>
                            <span className="font-bold text-zinc-900">{new Date(stats.subscription.startDate).toLocaleDateString()}</span>
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
                              <a href={stats.subscription.contractUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-500 font-bold flex items-center gap-1 hover:underline">
                                <LinkIcon size={12} /> Voir le contrat
                              </a>
                            </div>
                          )}
                        </div>

                        {isEditingSub ? (
                          <div className="space-y-3 pt-4 border-t  max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
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
                                className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-emerald-500/10 file:text-emerald-500 hover:file:bg-emerald-500/20 transition-colors"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Ou lien du contrat (optionnel)</label>
                              <Input type="url" placeholder="https://..." value={subContractUrl} onChange={e => setSubContractUrl(e.target.value)} />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 pt-2 sticky bottom-0 bg-white pb-2 z-10">
                              <button onClick={() => setIsEditingSub(false)} className="flex-1 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors">Annuler</button>
                              <button onClick={handleUpdateSubscription} className="flex-1 bg-emerald-500 text-zinc-900 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Enregistrer</button>
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
                          <div className="space-y-3 bg-zinc-50 p-4 rounded-3xl border border-zinc-200 shadow-sm max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
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
                              className="w-full bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-xl p-3 text-zinc-900 text-xs font-medium focus:outline-none focus:border-emerald-500 shadow-sm"
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
                                className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-emerald-500/10 file:text-emerald-500 hover:file:bg-emerald-500/20 transition-colors"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Ou lien du contrat (optionnel)</label>
                              <Input type="url" placeholder="https://..." value={subContractUrl} onChange={e => setSubContractUrl(e.target.value)} />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 pt-2 sticky bottom-0 bg-zinc-50 pb-2 z-10">
                              <button onClick={() => setIsAssigningPlan(false)} className="flex-1 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors">Annuler</button>
                              <button onClick={handleAssignSubscription} disabled={!selectedPlanId} className="flex-1 bg-emerald-500 text-zinc-900 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50">Confirmer</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setIsAssigningPlan(true)} className="w-full border border-dashed  text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 rounded-3xl py-4 text-[10px] font-black uppercase tracking-widest transition-colors">
                            + Assigner une formule
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                       <h3 className="text-[10px] font-black uppercase tracking-[4px] text-emerald-500">Plan Actif</h3>
                       <button onClick={() => handleEditProgram(selectedProfile)} className="text-zinc-500 hover:text-zinc-900 transition-colors">
                          <LayersIcon size={14} />
                       </button>
                    </div>
                    {stats.program ? (
                      <div className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                        <div className="font-black text-zinc-900 text-lg mb-1 uppercase italic">{stats.program.name}</div>
                        <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase mb-4 tracking-widest">
                           <span>Cycle complété</span>
                           <span className="text-zinc-900">{progCompletion}%</span>
                        </div>
                        <div className="h-2 bg-zinc-50 backdrop-blur-xl rounded-full overflow-hidden mb-4 border ">
                          <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000" style={{ width: `${progCompletion}%` }} />
                        </div>
                        
                        {/* Feature 2: Auto Progression Toggle */}
                        <div className="mt-4 pt-4 border-t  flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-4 bg-emerald-500 rounded-full relative cursor-pointer" onClick={() => showToast("Progression automatique activée", "success")}>
                              <div className="absolute right-1 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"></div>
                            </div>
                            <span className="text-[9px] font-black text-zinc-900 uppercase tracking-widest">Surcharge Progressive IA</span>
                          </div>
                          <span className="text-[8px] text-zinc-500 uppercase tracking-widest">+2.5kg auto</span>
                        </div>

                        <Button 
                          variant="primary" 
                          onClick={() => {
                            setState(s => ({ ...s, workout: stats.program, workoutMember: selectedProfile }));
                          }} 
                          className="!py-3 !text-[10px] w-full mt-4 !rounded-xl shadow-xl shadow-emerald-500/20"
                        >
                          LANCER SÉANCE COACHING
                        </Button>
                      </div>
                    ) : (
                      <div className="bg-zinc-50 rounded-3xl p-8 border border-dashed  text-center">
                         <p className="text-xs italic text-zinc-900 mb-4">Aucun cycle en cours</p>
                         <Button variant="primary" fullWidth onClick={() => handleEditProgram(selectedProfile)} className="!py-3 !text-[10px]">
                            CRÉER UN PROGRAMME
                         </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6 bg-zinc-50 p-8 rounded-3xl border ">
                    <h3 className="text-[10px] font-black uppercase tracking-[4px] text-emerald-500">Nouveau Scan</h3>
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
                       <div className="p-3 bg-gradient-to-br from-emerald-500 to-purple-600 rounded-2xl text-zinc-900 shadow-[0_0_20px_rgba(99,102,241,0.4)]"><BotIcon size={24} /></div>
                       <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">Velatra AI Engine</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Feature 1: Auto Program */}
                      <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl hover:border-emerald-500/50 transition-all group relative overflow-hidden flex flex-col justify-between">
                        <div>
                          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-emerald-500/20"></div>
                          <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <LayersIcon size={16} className="text-emerald-500" /> Génération Programme
                          </h4>
                          <p className="text-[10px] text-zinc-500 mb-4 leading-relaxed">Générez un programme d'entraînement complet et sur-mesure basé sur les objectifs et le niveau du membre.</p>
                          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-6">
                            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest text-center">
                              Bientôt disponible
                            </p>
                          </div>
                        </div>
                        <Button variant="secondary" fullWidth disabled className="!py-3 !text-[10px] !rounded-xl relative z-10 border-emerald-500/30 !bg-emerald-500/10 !text-emerald-500 opacity-70 cursor-not-allowed">
                          LA GÉNÉRATION DE PROGRAMME SERA BIENTÔT DISPONIBLE
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
                          <Button variant="secondary" fullWidth className="!py-3 !text-[10px] !rounded-xl border-emerald-500/30 hover:border-emerald-500" onClick={() => setShowNutritionLog(true)}>
                            VOIR LE SUIVI JOURNALIER
                          </Button>
                          <Button variant="secondary" fullWidth className="!py-3 !text-[10px] !rounded-xl border-emerald-500/30 hover:border-emerald-500" onClick={openNutritionTargetsModal} disabled={isGeneratingNutrition}>
                            {isGeneratingNutrition ? "CRÉATION EN COURS..." : (state.nutritionPlans?.find(p => p.memberId === Number(selectedProfile.id)) ? "RÉGÉNÉRER LE PLAN" : "GÉNÉRER LE PLAN")}
                          </Button>
                        </div>
                      </div>

                      {/* Feature 3: Auto Report */}
                      <div className={`bg-zinc-50 border border-zinc-200 p-6 rounded-3xl transition-all group relative overflow-hidden ${isGeneratingReport ? 'opacity-50 grayscale pointer-events-none' : 'hover:border-blue-500/50'}`}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-blue-500/20"></div>
                        <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <BarChartIcon size={16} className="text-blue-400" /> Rapport Automatique
                        </h4>
                        <p className="text-[10px] text-zinc-500 mb-6 leading-relaxed">Générez un bilan complet de la progression du client (poids, mensurations, performances) prêt à être envoyé.</p>
                        
                        {generatedReport ? (
                          <div className="space-y-4 relative z-10">
                            <div className="bg-white border border-zinc-200 rounded-xl p-4 max-h-40 overflow-y-auto text-xs text-zinc-600 whitespace-pre-wrap">
                              {generatedReport}
                            </div>
                            <div className="flex flex-col gap-2">
                              <Button 
                                variant="primary" 
                                fullWidth 
                                className="!py-3 !text-[10px] !rounded-xl !bg-[#25D366] hover:!bg-[#128C7E] border-none text-zinc-900 flex items-center justify-center gap-2"
                                onClick={() => {
                                  const phone = selectedProfile.phone?.replace(/\D/g, '');
                                  const url = phone 
                                    ? `https://wa.me/${phone}?text=${encodeURIComponent(generatedReport)}`
                                    : `https://wa.me/?text=${encodeURIComponent(generatedReport)}`;
                                  window.open(url, '_blank');
                                }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                                ENVOYER SUR WHATSAPP
                              </Button>
                              <Button variant="secondary" fullWidth className="!py-3 !text-[10px] !rounded-xl border-blue-500/30 hover:border-blue-500" onClick={handleGenerateReport} disabled={isGeneratingReport}>
                                RÉGÉNÉRER LE BILAN
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button variant="secondary" fullWidth className="!py-3 !text-[10px] !rounded-xl relative z-10 border-blue-500/30 hover:border-blue-500" onClick={handleGenerateReport} disabled={isGeneratingReport}>
                            {isGeneratingReport ? "GÉNÉRATION..." : "GÉNÉRER LE BILAN"}
                          </Button>
                        )}
                      </div>

                      {/* Feature 4: Stagnation Detection */}
                      <div className={`bg-zinc-50 backdrop-blur-xl border border-zinc-200 p-6 rounded-3xl transition-all group relative overflow-hidden shadow-sm ${isDetectingStagnation ? 'opacity-50 grayscale pointer-events-none' : 'hover:border-orange-500/50'}`}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-orange-500/20"></div>
                        <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <TargetIcon size={16} className="text-orange-400" /> Détection Stagnation
                        </h4>
                        <p className="text-[10px] text-zinc-500 mb-4 leading-relaxed">L'IA analyse les dernières séances pour détecter les plateaux de progression sur les exercices majeurs.</p>
                        
                        {stagnationResult ? (
                          <div className={`border rounded-xl p-3 flex flex-col gap-2 ${stagnationResult.hasStagnation ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${stagnationResult.hasStagnation ? 'text-red-500' : 'text-green-500'}`}>
                              {stagnationResult.hasStagnation ? 'Stagnation détectée' : 'Progression OK'}
                            </span>
                            <p className="text-[10px] text-zinc-600">{stagnationResult.advice}</p>
                          </div>
                        ) : (
                          <Button variant="secondary" fullWidth className="!py-3 !text-[10px] !rounded-xl relative z-10 border-orange-500/30 hover:border-orange-500" onClick={handleDetectStagnation} disabled={isDetectingStagnation}>
                            {isDetectingStagnation ? "ANALYSE EN COURS..." : "LANCER L'ANALYSE"}
                          </Button>
                        )}
                      </div>

                      {/* Feature 5: Morphological Analysis */}
                      <div className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 p-6 rounded-3xl transition-all group relative overflow-hidden opacity-50 grayscale shadow-sm">
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

                  {/* DOCUMENTS PARTAGÉS (DRIVE) */}
                  <section className="space-y-8">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500"><FolderIcon size={24} /></div>
                       <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">Documents Partagés</h3>
                    </div>
                    
                    <div className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-[40px] p-8 shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Fichiers du client</h4>
                        <label className="cursor-pointer">
                          <input 
                            type="file" 
                            className="hidden" 
                            multiple 
                            onChange={(e) => handleDriveFileUpload(e.target.files)}
                            disabled={isUploadingDriveFile}
                          />
                          <Button variant="secondary" className="!py-2 !px-4 !text-[10px] !rounded-xl pointer-events-none" disabled={isUploadingDriveFile}>
                            {isUploadingDriveFile ? (
                              <span>{Math.round(uploadProgress)}%</span>
                            ) : (
                              <>
                                <UploadIcon size={14} className="mr-2 inline" />
                                IMPORTER
                              </>
                            )}
                          </Button>
                        </label>
                      </div>

                      <div className="space-y-3">
                        {state.driveFiles?.filter(f => f.sharedWith?.includes(Number(selectedProfile.id))).length > 0 ? (
                          state.driveFiles.filter(f => f.sharedWith?.includes(Number(selectedProfile.id)))
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .map(file => (
                              <div key={file.id} className="flex items-center justify-between p-4 bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-2xl hover:border-blue-500/30 transition-colors shadow-sm">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-blue-500 shadow-sm border ">
                                    <FileIcon size={20} />
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-zinc-900">{file.name}</div>
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                                      {(file.size / 1024 / 1024).toFixed(2)} MB • {new Date(file.createdAt).toLocaleDateString('fr-FR')}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-colors">
                                    <EyeIcon size={18} />
                                  </a>
                                  <button onClick={() => setConfirmDeleteFileId(file.id)} className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors">
                                    <Trash2Icon size={18} />
                                  </button>
                                </div>
                              </div>
                            ))
                        ) : (
                          <div className="text-center py-8 text-zinc-500 text-sm">
                            Aucun document partagé avec ce client.
                          </div>
                        )}
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
                      <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6 shadow-sm">
                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Solde Total Payé</div>
                        <div className="text-4xl font-black text-emerald-500">
                          {state.payments?.filter(p => p.memberId === Number(selectedProfile.id) && p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) || 0}€
                        </div>
                      </div>
                      <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6 shadow-sm flex flex-col justify-center">
                        <Button variant="primary" fullWidth onClick={handleCopyPaymentLink} disabled={isGeneratingLink} className="!py-4 mb-3">
                          <LinkIcon size={16} className="mr-2" /> {isGeneratingLink ? "GÉNÉRATION..." : "COPIER LIEN DE PAIEMENT"}
                        </Button>
                        <p className="text-[10px] text-zinc-500 text-center">Envoyez ce lien à votre client pour un paiement en ligne sécurisé via Stripe.</p>
                      </div>
                    </div>

                    <div className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-[40px] p-8 shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Historique des prélèvements & paiements</h4>
                        <Button variant="secondary" className="!py-2 !px-4 !text-[10px] !rounded-xl" onClick={() => setIsAddingPayment(!isAddingPayment)}>
                          {isAddingPayment ? 'ANNULER' : '+ AJOUTER PAIEMENT'}
                        </Button>
                      </div>

                      {isAddingPayment && (
                        <div className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-2xl p-6 mb-6 shadow-sm">
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
                                className="w-full bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-xl p-3 text-zinc-900 text-sm focus:outline-none focus:border-emerald-500 shadow-sm"
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
                              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Catégorie</label>
                              <select 
                                className="w-full bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-xl p-3 text-zinc-900 text-sm focus:outline-none focus:border-emerald-500 shadow-sm"
                                value={newPayment.category || 'other'} 
                                onChange={(e) => setNewPayment({...newPayment, category: e.target.value as any})}
                              >
                                <option value="subscription">Abonnement</option>
                                <option value="coaching">Coaching</option>
                                <option value="boutique">Boutique</option>
                                <option value="other">Autre</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Statut</label>
                              <select 
                                className="w-full bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-xl p-3 text-zinc-900 text-sm focus:outline-none focus:border-emerald-500 shadow-sm"
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
                      
                      {(state.payments?.filter(p => p.memberId === Number(selectedProfile.id))?.length || 0) > 0 ? (
                        <div className="space-y-4">
                          {(state.payments || []).filter(p => p.memberId === Number(selectedProfile.id))
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map(payment => {
                              const invoice = state.invoices?.find(inv => inv.paymentId === payment.id);
                              return (
                                <div key={payment.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-2xl gap-4 shadow-sm">
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
                                  
                                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2 sm:mt-0">
                                    {payment.status !== 'paid' && (
                                      <>
                                        {(payment.method === 'card' || payment.method === 'sepa') && isStripeConnected && (
                                          <>
                                            <Button 
                                              variant="secondary" 
                                              className="!py-2 !px-3 !text-[10px] !rounded-xl text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10" 
                                              onClick={() => handleCharge(payment)}
                                              disabled={isCharging === payment.id}
                                            >
                                              <CreditCardIcon size={14} className="mr-1" /> 
                                              {isCharging === payment.id ? "EN COURS..." : "PRÉLEVER"}
                                            </Button>
                                            <Button 
                                              variant="secondary" 
                                              className="!py-2 !px-3 !text-[10px] !rounded-xl text-blue-500 border-blue-500/30 hover:bg-blue-500/10" 
                                              onClick={() => handleGeneratePaymentLink(payment)}
                                              disabled={isGeneratingLinkForPayment === payment.id}
                                            >
                                              <LinkIcon size={14} className="mr-1" /> 
                                              {isGeneratingLinkForPayment === payment.id ? "GÉNÉRATION..." : "LIEN"}
                                            </Button>
                                          </>
                                        )}
                                        <Button variant="secondary" className="!py-2 !px-3 !text-[10px] !rounded-xl text-orange-500 border-orange-500/30 hover:bg-orange-500/10" onClick={() => handleRemind(payment)}>
                                          <BellIcon size={14} className="mr-1" /> RELANCER
                                        </Button>
                                      </>
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
                       <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><CalendarIcon size={24} /></div>
                       <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">Historique Coaching</h3>
                    </div>
                    
                      <div className="bg-zinc-50 border border-zinc-200 rounded-[40px] p-8 shadow-sm">
                        {(state.logs || []).filter(log => log.memberId === Number(selectedProfile.id) && log.isCoaching).length > 0 ? (
                          <div className="space-y-4">
                            {(state.logs || []).filter(log => log.memberId === Number(selectedProfile.id) && log.isCoaching)
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map(log => (
                              <div key={log.id} className="flex flex-col gap-3 p-4 bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-2xl shadow-sm">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-bold text-zinc-900">{new Date(log.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">{log.dayName} • Semaine {log.week}</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                                      Terminée
                                    </span>
                                    <Button variant="secondary" className="!py-1 !px-2 !text-[10px] !rounded-lg" onClick={() => setSelectedLog(log)}>
                                      VOIR RÉCAP
                                    </Button>
                                  </div>
                                </div>
                                {log.notes && (
                                  <div className="mt-2 p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                                    <div className="flex items-start gap-2">
                                      <MessageCircleIcon size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                                      <p className="text-xs text-zinc-600 leading-relaxed italic line-clamp-2">"{log.notes}"</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-zinc-500 text-sm italic">
                            Aucune séance de coaching enregistrée pour ce membre.
                          </div>
                        )}
                      </div>
                  </section>

                  <section className="space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                         <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500"><BarChartIcon size={24} /></div>
                         <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">Évolution Corporelle</h3>
                      </div>
                      
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
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
                    
                    <div className="bg-zinc-50 border border-zinc-200 rounded-[40px] p-6 h-80 relative overflow-hidden shadow-sm">
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
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
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
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-xs font-bold uppercase tracking-widest">
                          Aucune donnée
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="space-y-8">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><DumbbellIcon size={24} /></div>
                       <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">Tableau des Records (PR)</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {stats.perfs.length > 0 ? stats.perfs.map(p => {
                        const ex = (state.exercises || []).find(e => e.perfId === p.exId);
                        return (
                          <div key={p.id} className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 p-6 rounded-3xl flex justify-between items-center group hover:bg-white transition-all shadow-sm">
                             <div>
                               <div className="text-[9px] uppercase font-black text-emerald-500 tracking-widest mb-1">{ex?.cat || 'FORCE'}</div>
                               <div className="font-black text-zinc-900 text-lg italic tracking-tight">{ex?.name || p.exId}</div>
                             </div>
                             <div className="text-right">
                               <div className="text-2xl font-black text-zinc-900 tracking-tighter">{p.weight}kg</div>
                               <div className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">{p.reps} REPS</div>
                             </div>
                          </div>
                        );
                      }) : (
                        <div className="col-span-full py-12 text-center bg-zinc-50 backdrop-blur-xl border border-dashed  rounded-[32px] text-[10px] uppercase font-black text-zinc-500 tracking-[4px] italic shadow-sm">Aucun PR enregistré</div>
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
                         <div key={b.id} className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 p-6 rounded-3xl flex justify-between items-center group hover:border-emerald-500/50 transition-all shadow-sm">
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
                                  <div className="text-xl font-black text-emerald-500">{b.muscle}<span className="text-xs ml-0.5 opacity-50">KG</span></div>
                               </div>
                            </div>
                         </div>
                       )) : (
                         <div className="py-12 text-center bg-zinc-50 backdrop-blur-xl border border-dashed  rounded-[32px] text-[10px] uppercase font-black text-zinc-500 tracking-[4px] italic shadow-sm">Aucun historique biométrique</div>
                       )}
                    </div>
                  </section>
                </div>
              </div>
              </ErrorBoundary>
            </motion.div>
          </motion.div>
        );
      })()}
      </AnimatePresence>,
      document.body
      )}

      {createPortal(
      <AnimatePresence>
      {isEditingInfo && selectedProfile && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[600] flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-lg"
          >
            <Card className="w-full !p-8 bg-zinc-100 backdrop-blur-xl  relative shadow-2xl max-h-[90vh] flex flex-col">
              <button onClick={() => setIsEditingInfo(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-zinc-900 bg-zinc-50 backdrop-blur-xl border border-zinc-200 p-2 rounded-full transition-colors z-10 shadow-sm">
                <XIcon size={20} />
              </button>
              
              <div className="shrink-0">
                <h2 className="text-2xl font-black mb-1 text-zinc-900 uppercase italic">Modifier Profil</h2>
                <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mb-6">Informations de base de l'athlète</p>
              </div>

            <div className="space-y-5 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0 pb-4">
              <div className="flex justify-center mb-6">
                <div className="relative group w-24 h-24 rounded-[32px] bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-4xl font-black shadow-2xl overflow-hidden">
                  {editInfoData.avatar?.startsWith('http') ? (
                    <img src={editInfoData.avatar} alt={editInfoData.name} className="w-full h-full object-cover" />
                  ) : (
                    editInfoData.avatar || editInfoData.name?.substring(0, 2).toUpperCase()
                  )}
                  <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <span className="text-white text-[10px] font-bold uppercase tracking-widest">Photo</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file && selectedProfile) {
                          try {
                            showToast("Téléchargement de la photo...", "success");
                            const avatarRef = ref(storage, `avatars/${selectedProfile.id}_${Date.now()}`);
                            await uploadBytes(avatarRef, file);
                            const url = await getDownloadURL(avatarRef);
                            setEditInfoData({...editInfoData, avatar: url});
                            showToast("Photo téléchargée avec succès", "success");
                          } catch (error) {
                            console.error("Error uploading avatar:", error);
                            showToast("Erreur lors du téléchargement", "error");
                          }
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Nom Complet</label>
                  <Input 
                    value={editInfoData.name}
                    onChange={e => setEditInfoData({...editInfoData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Genre</label>
                  <select 
                    className="w-full bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-xl p-4 text-sm text-zinc-900 focus:border-emerald-500 outline-none appearance-none shadow-sm"
                    value={editInfoData.gender}
                    onChange={e => setEditInfoData({...editInfoData, gender: e.target.value as Gender})}
                  >
                    <option value="M">Homme</option>
                    <option value="F">Femme</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Âge</label>
                  <Input 
                    type="number"
                    value={editInfoData.age || ''}
                    onChange={e => setEditInfoData({...editInfoData, age: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Date de naissance</label>
                  <Input 
                    type="date"
                    value={editInfoData.birthDate || ''}
                    onChange={e => setEditInfoData({...editInfoData, birthDate: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Poids (kg)</label>
                  <Input 
                    type="number"
                    value={editInfoData.weight || ''}
                    onChange={e => setEditInfoData({...editInfoData, weight: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Taille (cm)</label>
                  <Input 
                    type="number"
                    value={editInfoData.height || ''}
                    onChange={e => setEditInfoData({...editInfoData, height: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Objectifs</label>
                <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 backdrop-blur-xl rounded-xl border border-zinc-200 max-h-32 overflow-y-auto no-scrollbar shadow-sm">
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
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${isSelected ? 'bg-emerald-500 border-emerald-500 text-zinc-900' : 'bg-zinc-50 backdrop-blur-xl  text-zinc-900 hover:border-emerald-500/50 shadow-sm'}`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Notes d'Inscription</label>
                <textarea 
                  className="w-full bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-xl p-4 text-sm text-zinc-900 focus:border-emerald-500 outline-none h-24 resize-none shadow-sm"
                  value={editInfoData.notes || ""}
                  onChange={e => setEditInfoData({...editInfoData, notes: e.target.value})}
                  placeholder="Notes renseignées lors de l'inscription..."
                />
              </div>
            </div>

            <div className="pt-4 shrink-0 flex flex-col sm:flex-row gap-3 border-t mt-2 sticky bottom-0 bg-zinc-100 z-10 pb-2">
              <Button variant="secondary" fullWidth onClick={() => setIsEditingInfo(false)}>ANNULER</Button>
              <Button variant="success" fullWidth onClick={handleUpdateMemberInfo}>
                ENREGISTRER <CheckIcon size={18} className="ml-2" />
              </Button>
            </div>
            <div className="pt-2 shrink-0">
              <Button variant="secondary" fullWidth onClick={handleDeleteMember} className="!bg-red-500/10 !text-red-500 hover:!bg-red-500/20">
                SUPPRIMER LE MEMBRE
              </Button>
            </div>
          </Card>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>,
      document.body
      )}

      {createPortal(
      <AnimatePresence>
      {isAdjustingTargets && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[600] flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-md"
          >
            <Card className="w-full !p-8 bg-zinc-100 backdrop-blur-xl  relative shadow-2xl">
              <button onClick={() => setIsAdjustingTargets(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-zinc-900 bg-zinc-50 backdrop-blur-xl border border-zinc-200 p-2 rounded-full transition-colors shadow-sm">
                <XIcon size={20} />
              </button>
              
              <h2 className="text-2xl font-black mb-1 text-zinc-900 uppercase italic">Cibles Nutritionnelles</h2>
              <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mb-8">Ajuster avant génération</p>

            <div className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Calories Totales (kcal)</label>
                <Input 
                  type="number"
                  value={nutritionTargets.calories || ''}
                  onChange={e => setNutritionTargets({...nutritionTargets, calories: parseInt(e.target.value) || 0})}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Protéines (g)</label>
                  <Input 
                    type="number"
                    value={nutritionTargets.protein || ''}
                    onChange={e => setNutritionTargets({...nutritionTargets, protein: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Glucides (g)</label>
                  <Input 
                    type="number"
                    value={nutritionTargets.carbs || ''}
                    onChange={e => setNutritionTargets({...nutritionTargets, carbs: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Lipides (g)</label>
                  <Input 
                    type="number"
                    value={nutritionTargets.fat || ''}
                    onChange={e => setNutritionTargets({...nutritionTargets, fat: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-zinc-100 z-10 pb-2">
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
      </AnimatePresence>,
      document.body
      )}

      {createPortal(
      <AnimatePresence>
      {confirmDeleteFileId && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[600] flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-zinc-100 rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden border "
          >
            <div className="p-8">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2Icon size={32} />
              </div>
              <h2 className="text-2xl font-black text-zinc-900 text-center mb-4">Supprimer le fichier ?</h2>
              <p className="text-zinc-500 text-center mb-8">
                Êtes-vous sûr de vouloir supprimer ce fichier ? Cette action est irréversible.
              </p>
              <div className="flex gap-4">
                <Button variant="secondary" fullWidth onClick={() => setConfirmDeleteFileId(null)}>
                  ANNULER
                </Button>
                <Button variant="primary" fullWidth onClick={confirmDeleteFile} className="!bg-red-500 hover:!bg-red-600 !text-zinc-900">
                  SUPPRIMER
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>,
      document.body
      )}

      {createPortal(
      <AnimatePresence>
      {isAddingMember && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[600] flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-lg"
          >
            <Card className="w-full !p-8 bg-zinc-100 backdrop-blur-xl  relative shadow-2xl max-h-[90vh] flex flex-col">
              <button onClick={() => setIsAddingMember(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-zinc-900 bg-zinc-50 backdrop-blur-xl border border-zinc-200 p-2 rounded-full transition-colors z-10 shadow-sm">
                <XIcon size={20} />
              </button>
            
            <div className="shrink-0">
              <h2 className="text-2xl font-black mb-1 text-zinc-900 uppercase italic">Nouveau Profil</h2>
              <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mb-6">Créer un membre manuellement</p>
            </div>

            <div className="space-y-5 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Nom Complet</label>
                  <Input 
                    value={newMemberData.name}
                    onChange={e => setNewMemberData({...newMemberData, name: e.target.value})}
                    placeholder="Jean Dupont"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Email</label>
                  <Input 
                    type="email"
                    value={newMemberData.email}
                    onChange={e => setNewMemberData({...newMemberData, email: e.target.value})}
                    placeholder="jean@email.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Mot de passe provisoire</label>
                <Input 
                  type="text"
                  value={newMemberData.password}
                  onChange={e => setNewMemberData({...newMemberData, password: e.target.value})}
                  placeholder="Ex: password2026"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Âge</label>
                  <Input 
                    type="number"
                    value={newMemberData.age || ''}
                    onChange={e => setNewMemberData({...newMemberData, age: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Date de naissance</label>
                  <Input 
                    type="date"
                    value={newMemberData.birthDate || ''}
                    onChange={e => setNewMemberData({...newMemberData, birthDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Poids (kg)</label>
                  <Input 
                    type="number"
                    value={newMemberData.weight || ''}
                    onChange={e => setNewMemberData({...newMemberData, weight: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Taille (cm)</label>
                  <Input 
                    type="number"
                    value={newMemberData.height || ''}
                    onChange={e => setNewMemberData({...newMemberData, height: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Expérience</label>
                  <select 
                    className="w-full bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-xl p-3 text-zinc-900 focus:outline-none focus:border-emerald-500 shadow-sm"
                    value={newMemberData.experienceLevel || 'Débutant'}
                    onChange={e => setNewMemberData({...newMemberData, experienceLevel: e.target.value as any})}
                  >
                    <option value="Débutant" className="bg-white">Débutant</option>
                    <option value="Intermédiaire" className="bg-white">Intermédiaire</option>
                    <option value="Avancé" className="bg-white">Avancé</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Équipement</label>
                  <select 
                    className="w-full bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-xl p-3 text-zinc-900 focus:outline-none focus:border-emerald-500 shadow-sm"
                    value={newMemberData.equipment || 'Salle complète'}
                    onChange={e => setNewMemberData({...newMemberData, equipment: e.target.value as any})}
                  >
                    <option value="Salle complète" className="bg-white">Salle complète</option>
                    <option value="Haltères/Kettlebells" className="bg-white">Haltères/Kettlebells</option>
                    <option value="Poids du corps" className="bg-white">Poids du corps</option>
                    <option value="Élastiques" className="bg-white">Élastiques</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Jours / Semaine</label>
                  <Input 
                    type="number" min="1" max="7"
                    value={newMemberData.trainingDays || ''}
                    onChange={e => setNewMemberData({...newMemberData, trainingDays: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Durée (min)</label>
                  <Input 
                    type="number" step="15"
                    value={newMemberData.sessionDuration || ''}
                    onChange={e => setNewMemberData({...newMemberData, sessionDuration: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Blessures / Douleurs</label>
                <Input 
                  value={newMemberData.injuries || ''}
                  onChange={e => setNewMemberData({...newMemberData, injuries: e.target.value})}
                  placeholder="Ex: Douleur épaule droite..."
                />
              </div>
            </div>

            <div className="pt-4 shrink-0 flex flex-col sm:flex-row gap-3 border-t mt-2 sticky bottom-0 bg-zinc-100 z-10 pb-2">
              <Button variant="secondary" fullWidth onClick={() => setIsAddingMember(false)}>ANNULER</Button>
              <Button variant="success" fullWidth onClick={handleCreateMember}>
                CRÉER LE MEMBRE <CheckIcon size={18} className="ml-2" />
              </Button>
            </div>
          </Card>
        </motion.div>
      </motion.div>
      )}
      </AnimatePresence>,
      document.body
      )}

      {createPortal(
      <AnimatePresence>
      {nutritionPlan && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[700] flex items-start justify-center p-0 md:p-8 overflow-y-auto"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-4xl bg-zinc-100 backdrop-blur-2xl min-h-screen md:min-h-0 md:rounded-[48px] border border-emerald-500/20 shadow-[0_0_100px_rgba(16,185,129,0.1)] relative overflow-hidden my-0 md:my-8 p-8 md:p-12"
          >
            <button onClick={() => setNutritionPlan(null)} className="fixed top-4 right-4 md:top-10 md:right-10 p-4 bg-zinc-100 backdrop-blur-md rounded-full text-zinc-500 hover:text-zinc-900 z-[800] border border-zinc-200 hover:bg-red-50 hover:border-red-200 transition-all shadow-xl"><XIcon size={24} /></button>
            
            <div className="flex items-center gap-4 mb-8">
               <div className="p-3 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl text-zinc-900 shadow-[0_0_20px_rgba(16,185,129,0.4)]"><CheckIcon size={24} /></div>
               <div>
                 <h2 className="text-3xl font-black text-zinc-900 uppercase italic tracking-tight">Plan Nutritionnel</h2>
                 <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Généré par Velatra AI Engine</p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
              <div className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-3xl p-6 text-center shadow-sm">
                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Calories</div>
                <div className="text-2xl font-black text-zinc-900">{nutritionPlan.targetCalories}</div>
              </div>
              <div className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-3xl p-6 text-center shadow-sm">
                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Protéines</div>
                <div className="text-2xl font-black text-emerald-500">{nutritionPlan.protein}g</div>
              </div>
              <div className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-3xl p-6 text-center shadow-sm">
                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Glucides</div>
                <div className="text-2xl font-black text-blue-500">{nutritionPlan.carbs}g</div>
              </div>
              <div className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-3xl p-6 text-center shadow-sm">
                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Lipides</div>
                <div className="text-2xl font-black text-orange-500">{nutritionPlan.fat}g</div>
              </div>
            </div>

            <h3 className="text-xl font-black text-zinc-900 uppercase italic mb-6">Répartition des Repas</h3>
            <div className="space-y-4 mb-10">
              {nutritionPlan.meals?.map((repas: any, idx: number) => {
                if (!repas) return null;
                return (
                <div key={idx} className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-3xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest">{repas.name || `Repas ${idx + 1}`}</h4>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-widest">{repas.calories} kcal</span>
                      <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full uppercase tracking-widest">{repas.protein}g P</span>
                      <span className="text-[10px] font-black text-green-400 bg-green-500/10 px-3 py-1 rounded-full uppercase tracking-widest">{repas.carbs}g G</span>
                      <span className="text-[10px] font-black text-yellow-400 bg-yellow-500/10 px-3 py-1 rounded-full uppercase tracking-widest">{repas.fat}g L</span>
                    </div>
                  </div>
                  <div className="text-sm text-zinc-500 whitespace-pre-wrap">
                    {repas.description}
                  </div>
                </div>
              )})}
            </div>

            <h3 className="text-xl font-black text-zinc-900 uppercase italic mb-6">Liste de Courses</h3>
            <div className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-3xl p-6 shadow-sm">
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {nutritionPlan.liste_courses?.map((item: any, idx: number) => (
                  <li key={item.id || idx} className="text-sm text-zinc-600 flex items-center gap-3">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${item.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-200 bg-zinc-50'}`}>
                      {item.checked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                    </div>
                    <span className={item.checked ? 'line-through text-zinc-400' : ''}>{item.name || item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>,
      document.body
      )}

      {showNutritionLog && selectedProfile && createPortal(
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setShowNutritionLog(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-100 rounded-3xl p-6 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto border "
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">Suivi Journalier Nutrition</h3>
                <p className="text-sm text-zinc-500">{selectedProfile.name}</p>
              </div>
              <button onClick={() => setShowNutritionLog(false)} className="p-2 bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-full hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors text-zinc-500 shadow-sm">
                <XIcon size={20} />
              </button>
            </div>
            
            <MemberNutritionView state={state} showToast={showToast} memberId={Number(selectedProfile.id)} readOnly={true} />
          </motion.div>
        </div>,
        document.body
      )}

      {selectedLog && createPortal(
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedLog(null)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-100 rounded-3xl p-6 max-w-lg w-full shadow-2xl border "
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">Récapitulatif</h3>
                <p className="text-sm text-zinc-500">{new Date(selectedLog.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-2 bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-full hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors text-zinc-500 shadow-sm">
                <XIcon size={20} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Séance</div>
                <div className="font-bold text-zinc-900">{selectedLog.dayName}</div>
                <div className="text-sm text-zinc-500">Semaine {selectedLog.week}</div>
              </div>

              {selectedLog.exercises && selectedLog.exercises.length > 0 && (
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Exercices réalisés</div>
                  <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                    {selectedLog.exercises.map((ex, i) => (
                      <div key={i} className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-xl p-3 shadow-sm">
                        <div className="font-bold text-sm text-zinc-900 mb-2">{ex.name}</div>
                        <div className="grid grid-cols-1 gap-1">
                          {ex.sets.map((set, j) => (
                            <div key={j} className="flex items-center justify-between text-xs">
                              <span className="text-zinc-500 font-medium">Série {j + 1}</span>
                              <div className="flex gap-3">
                                {set.weight && <span className="font-bold text-zinc-900">{set.weight} kg</span>}
                                {set.reps && <span className="font-bold text-zinc-900">{set.reps} reps</span>}
                                {set.duration && <span className="font-bold text-zinc-900">{set.duration}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.notes && (
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Notes du Coach</div>
                  <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                    <p className="text-sm text-zinc-600 leading-relaxed italic">"{selectedLog.notes}"</p>
                  </div>
                </div>
              )}

              {selectedLog.rpe && (
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Difficulté ressentie (RPE)</div>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-black text-emerald-500">{selectedLog.rpe}</div>
                    <div className="text-sm text-zinc-500">/ 10</div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {confirmDeleteScanId && createPortal(
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-50 backdrop-blur-xl rounded-3xl p-6 max-w-md w-full shadow-sm border "
          >
            <h3 className="text-xl font-black text-zinc-900 mb-2">Supprimer cette mesure ?</h3>
            <p className="text-zinc-500 mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setConfirmDeleteScanId(null)}>Annuler</Button>
              <Button variant="danger" fullWidth onClick={confirmDeleteScan}>Supprimer</Button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {confirmDeleteMemberId && createPortal(
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-50 backdrop-blur-xl rounded-3xl p-6 max-w-md w-full shadow-sm border "
          >
            <h3 className="text-xl font-black text-zinc-900 mb-2">Supprimer ce membre ?</h3>
            <p className="text-zinc-500 mb-6">Êtes-vous sûr de vouloir supprimer ce membre ? Cette action est irréversible.</p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setConfirmDeleteMemberId(null)}>Annuler</Button>
              <Button variant="danger" fullWidth onClick={confirmDeleteMember}>Supprimer</Button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

    </div>
  );
};
