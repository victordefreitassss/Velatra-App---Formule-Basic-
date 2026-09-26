
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppState, User, UserDocument, Performance, BodyData, Program, Gender, Goal, Subscription, Plan, NutritionPlan, Payment, Invoice, SessionLog, DriveFile } from '../types';
import { Card, Button, Input, Badge } from '../components/UI';
import { 
  SearchIcon, InfoIcon, UserIcon, ActivityIcon, DollarSignIcon,
  XIcon, DumbbellIcon, BarChartIcon, CheckIcon, SaveIcon, LayersIcon, MessageCircleIcon, Edit2Icon, BotIcon, TargetIcon, CalendarIcon, CreditCardIcon, FileTextIcon, BellIcon, DownloadIcon, LinkIcon, UploadIcon, FolderIcon, FileIcon, EyeIcon, Trash2Icon, MailIcon, ImageIcon, SparklesIcon, PlusIcon, PlayCircleIcon, SettingsIcon, PhoneIcon
} from '../components/Icons';
import { apiFetch, createMemberProfile, db, doc, setDoc, updateDoc, deleteDoc, auth, secondaryAuth, createUserWithEmailAndPassword, sendPasswordResetEmail, collection, query, where, getDocs, getStorageClient, addDoc } from '../firebase';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable, deleteObject } from 'firebase/storage';
import { GOALS } from '../constants';
import { calculateNutritionPlan, updateNutritionPlanForWeight } from '../utils';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { MemberNutritionView } from '../components/MemberNutritionView';

const itemVariants: any = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

import { ErrorBoundary } from '../components/ErrorBoundary';

const createTemporaryPassword = () => {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  return `${Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('')}aA1!`;
};

export const MembersPage: React.FC<{ state: AppState, setState: any, showToast: any }> = ({ state, setState, showToast }) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(state.memberFilter || "Tous");
  const [selectedProfile, setSelectedProfile] = useState<User | null>(state.selectedMember || null);
  const [memberTab, setMemberTab] = useState<string>('overview');
  const [selectedLog, setSelectedLog] = useState<SessionLog | null>(null);
  const [selectedEvolutionPhoto, setSelectedEvolutionPhoto] = useState<string | null>(null);

  const [coachingNotes, setCoachingNotes] = useState("");
  const [coachingNoteDate, setCoachingNoteDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSavingCoachingNotes, setIsSavingCoachingNotes] = useState(false);
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');
  const [bookingTypeFilter, setBookingTypeFilter] = useState<string>('all');
  const [measurementsSubTab, setMeasurementsSubTab] = useState<'scans' | 'biometrics'>('scans');
  const [selectedDateForPhoto, setSelectedDateForPhoto] = useState<string>('');
  const [showProgramOptions, setShowProgramOptions] = useState<boolean>(false);

  useEffect(() => {
    if (state.memberFilter) {
      setFilter(state.memberFilter);
    }
  }, [state.memberFilter]);

  useEffect(() => {
    if (state.selectedMember) {
      setSelectedProfile(state.selectedMember);
      setMemberTab('overview');
    }
  }, [state.selectedMember]);

  useEffect(() => {
    if (selectedProfile) {
      setMemberTab('overview');
      setCoachAssignment(selectedProfile.assignedCoachUid || '');
    }
  }, [selectedProfile?.id]);

  const closeProfile = () => {
    setSelectedProfile(null);
    if (state.selectedMember) {
      setState((prev: AppState) => ({ ...prev, selectedMember: null }));
    }
  };
  const [newScan, setNewScan] = useState({ weight: "", fat: "", muscle: "" });
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editInfoData, setEditInfoData] = useState<Partial<User>>({});
  const [coachAssignment, setCoachAssignment] = useState('');
  const [isSavingCoachAssignment, setIsSavingCoachAssignment] = useState(false);
  const [isAssigningPlan, setIsAssigningPlan] = useState(false);
  const [isEditingSub, setIsEditingSub] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [subStartDate, setSubStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [subCommitmentDate, setSubCommitmentDate] = useState('');
  const [subContractUrl, setSubContractUrl] = useState('');
  const [isGeneratingNutrition, setIsGeneratingNutrition] = useState(false);
  
  // Modals for template assignment
  const [showAssignProgramTemplateModal, setShowAssignProgramTemplateModal] = useState(false);
  const [showAssignNutritionTemplateModal, setShowAssignNutritionTemplateModal] = useState(false);
  const [showSaveNutritionTemplateModal, setShowSaveNutritionTemplateModal] = useState(false);
  const [newNutritionTemplateName, setNewNutritionTemplateName] = useState('');
  const [programPresetSearch, setProgramPresetSearch] = useState('');
  const [nutritionPresetSearch, setNutritionPresetSearch] = useState('');
  
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [isDetectingStagnation, setIsDetectingStagnation] = useState(false);
  const [stagnationResult, setStagnationResult] = useState<any>(null);
  const [showOnboardingEmailModal, setShowOnboardingEmailModal] = useState(false);
  const [onboardingEmailData, setOnboardingEmailData] = useState({ paymentLink: '', contractLink: '' });
  const [isSendingOnboardingEmail, setIsSendingOnboardingEmail] = useState(false);
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

  const [isCsvImportModalOpen, setIsCsvImportModalOpen] = useState(false);
  const [isParsingCsv, setIsParsingCsv] = useState(false);
  const [parsedClients, setParsedClients] = useState<any[]>([]);
  const [selectedClientsToImport, setSelectedClientsToImport] = useState<number[]>([]);
  const [isImportingClients, setIsImportingClients] = useState(false);
  const [importSearch, setImportSearch] = useState("");
  const [isConfirmingImport, setIsConfirmingImport] = useState(false);
  const [visibleCoachingLogs, setVisibleCoachingLogs] = useState(5);

  useEffect(() => {
    if (selectedProfile) {
      setVisibleCoachingLogs(5);
      setCoachingNotes(selectedProfile.notes || "");
      setCoachingNoteDate(new Date().toISOString().split('T')[0]);
      setSelectedDateForPhoto("");
      setMeasurementsSubTab('scans');
    }
  }, [selectedProfile?.id]);

  const handleParseCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingCsv(true);
    setParsedClients([]);
    setSelectedClientsToImport([]);
    setImportSearch("");
    setIsConfirmingImport(false);
    setIsCsvImportModalOpen(true);

    try {
      const text = await file.text();
      const { parseClientsCSV } = await import('../services/aiService');
      const clients = await parseClientsCSV(text);
      if (Array.isArray(clients) && clients.length > 0) {
        setParsedClients(clients);
        setSelectedClientsToImport(clients.map((_, i) => i)); // Select all by default
      } else {
        showToast("Aucun client trouvé dans le fichier.", "error");
        setIsCsvImportModalOpen(false);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Erreur de lecture du fichier CSV.", "error");
      setIsCsvImportModalOpen(false);
    } finally {
      setIsParsingCsv(false);
      e.target.value = ''; // Reset file input
    }
  };

  const handleImportSelectedClients = async () => {
    if (selectedClientsToImport.length === 0) return;
    setIsImportingClients(true);

    let successCount = 0;
    let duplicateCount = 0;
    
    // Process sequentially to not hammer Firebase too hard
    for (const index of selectedClientsToImport) {
      const client = parsedClients[index];
      if (!client || !client.email) continue;
      
      try {
        const dummyPwd = createTemporaryPassword();
        let userCred;
        try {
          userCred = await createUserWithEmailAndPassword(secondaryAuth, client.email, dummyPwd);
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            duplicateCount++;
            continue;
          }
          throw authErr;
        }
        
        const newUser: User = {
          id: Date.now() + Math.floor(Math.random() * 1000), // Fake sequential ID for now
          clubId: state.user?.clubId || '1',
          code: Math.random().toString(36).slice(-6).toUpperCase(),
          pwd: '',
          avatar: '',
          xp: 0,
          streak: 0,
          pointsFidelite: 0,
          createdAt: new Date().toISOString(),
          role: 'member',
          firebaseUid: userCred.user.uid,
          name: client.name || "Nouveau Membre",
          email: client.email,
          phone: client.phone || undefined,
          address: client.address || undefined,
          gender: client.gender?.toUpperCase() === 'F' ? 'F' : 'M',
          age: client.age || 30,
          birthDate: client.birthDate || undefined,
          weight: client.weight || 70,
          height: client.height || 175,
          objectifs: client.objectifs || [],
          notes: client.notes || "",
          status: 'active'
        };

        // Create doc in users
        await createMemberProfile(userCred.user.uid, newUser as unknown as Record<string, unknown>);
        
        // Immediately send reset email via primary auth so they can set their password
        await sendPasswordResetEmail(auth, client.email);
        
        successCount++;
      } catch (err: any) {
        console.error("Error creating user from CSV:", client.email, err);
        if (err.code === 'auth/email-already-in-use') {
          duplicateCount++;
        }
      }
    }

    setIsImportingClients(false);
    setIsCsvImportModalOpen(false);
    setIsConfirmingImport(false);
    
    if (duplicateCount > 0) {
      showToast(`${successCount} comptes créés. ${duplicateCount} ignorés (email déjà utilisé).`, successCount > 0 ? "success" : "error");
    } else {
      showToast(`${successCount} comptes clients créés avec envoi d'emails de réinitialisation !`, "success");
    }
  };

  const members = state.users.filter(u => {
    if (u.role !== 'member') return false;
    const searchTerm = search.trim().toLowerCase();
    if (searchTerm && ![u.name, u.email, u.phone].some(value => value?.toLowerCase().includes(searchTerm))) return false;
    
    if (filter === "En pause") return u.status === 'paused';
    
    // Exclude paused members from other specific filters
    if (filter !== "Tous" && u.status === 'paused') return false;

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

  const handleAssignCoach = async () => {
    if (!selectedProfile?.firebaseUid) return;
    setIsSavingCoachAssignment(true);
    try {
      const response = await apiFetch('/api/assign-member-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberUid: selectedProfile.firebaseUid, coachUid: coachAssignment || null })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "L'affectation n'a pas pu être enregistrée.");
      const assignedCoachUid = result.assignedCoachUid || undefined;
      setSelectedProfile(previous => previous ? { ...previous, assignedCoachUid } : previous);
      setState((previous: AppState) => ({
        ...previous,
        users: previous.users.map(user => user.firebaseUid === selectedProfile.firebaseUid ? { ...user, assignedCoachUid } : user)
      }));
      showToast(assignedCoachUid ? 'Coach affecté à cet adhérent.' : 'Adhérent retiré de son affectation.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : "L'affectation n'a pas pu être enregistrée.", 'error');
    } finally {
      setIsSavingCoachAssignment(false);
    }
  };

  const handleSaveCoachingNotes = async () => {
    if (!selectedProfile || !selectedProfile.firebaseUid) return;
    if (!coachingNotes.trim()) {
      showToast("Veuillez saisir une note avant d'enregistrer", "error");
      return;
    }
    setIsSavingCoachingNotes(true);
    try {
      const userRef = doc(db, "users", selectedProfile.firebaseUid);
      
      const dateObj = new Date(coachingNoteDate);
      const now = new Date();
      dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

      const newNote = {
        id: Math.random().toString(36).substring(2, 9),
        date: dateObj.toISOString(),
        content: coachingNotes.trim(),
      };
      
      const updatedHistory = [newNote, ...(selectedProfile.coachingNotesHistory || [])]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      await updateDoc(userRef, { 
        notes: coachingNotes.trim(),
        coachingNotesHistory: updatedHistory 
      });
      
      showToast("Note enregistrée avec succès !");
      setSelectedProfile(prev => prev ? ({ 
        ...prev, 
        notes: coachingNotes.trim(),
        coachingNotesHistory: updatedHistory 
      }) : null);
      
      setCoachingNotes("");
      setCoachingNoteDate(new Date().toISOString().split('T')[0]);
    } catch (err) {
      console.error("Error saving coaching notes:", err);
      showToast("Erreur lors de l'enregistrement de la note", "error");
    } finally {
      setIsSavingCoachingNotes(false);
    }
  };

  const handleDeleteCoachingNote = async (noteId: string) => {
    if (!selectedProfile || !selectedProfile.firebaseUid) return;
    if (!confirm("Voulez-vous vraiment supprimer cette note ?")) return;
    try {
      const userRef = doc(db, "users", selectedProfile.firebaseUid);
      const updatedHistory = (selectedProfile.coachingNotesHistory || []).filter(note => note.id !== noteId);
      
      await updateDoc(userRef, { 
        coachingNotesHistory: updatedHistory 
      });
      
      showToast("Note supprimée.");
      setSelectedProfile(prev => prev ? ({ 
        ...prev, 
        coachingNotesHistory: updatedHistory 
      }) : null);
    } catch (err) {
      console.error("Error deleting coaching note:", err);
      showToast("Erreur lors de la suppression", "error");
    }
  };

  const [confirmDeleteMemberId, setConfirmDeleteMemberId] = useState<string | null>(null);

  const confirmDeleteMember = async () => {
    if (!confirmDeleteMemberId) return;
    try {
      const response = await apiFetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: confirmDeleteMemberId, email: selectedProfile?.email })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "La suppression du compte a échoué.");
      showToast("Membre et compte de connexion supprimés avec succès", "success");

      setIsEditingInfo(false);
      closeProfile();
    } catch (err) {
      console.error("Error deleting member:", err);
      showToast(err instanceof Error ? err.message : "Erreur lors de la suppression", "error");
    } finally {
      setConfirmDeleteMemberId(null);
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedProfile) return;
    const uid = selectedProfile.firebaseUid || selectedProfile.id?.toString();
    if (!uid) return;
    setConfirmDeleteMemberId(uid);
  };

  const handleResetMemberPassword = async () => {
    if (!selectedProfile?.email) {
      showToast("L'adresse email du membre est introuvable.", "error");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, selectedProfile.email);
      showToast("Email de réinitialisation envoyé avec succès à " + selectedProfile.email, "success");
    } catch (err: any) {
      console.error("Error sending reset email:", err);
      showToast("Erreur lors de l'envoi de l'email.", "error");
    }
  };

  const handleTogglePauseMember = async () => {
    if (!selectedProfile || !selectedProfile.firebaseUid) return;
    const newStatus = selectedProfile.status === 'paused' ? 'active' : 'paused';
    
    try {
      await updateDoc(doc(db, "users", selectedProfile.firebaseUid), {
        status: newStatus
      });
      
      setSelectedProfile({ ...selectedProfile, status: newStatus });
      setState((s: AppState) => ({
        ...s,
        users: s.users.map(u => u.id === selectedProfile.id ? { ...u, status: newStatus } : u)
      }));
      
      showToast(newStatus === 'paused' ? "Profil mis en pause" : "Profil réactivé", "success");
    } catch (err) {
      console.error("Error toggling pause status:", err);
      showToast("Erreur lors de la modification du statut", "error");
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

  const [isUploadingOfficialDocument, setIsUploadingOfficialDocument] = useState(false);
  const [officialDocumentCategory, setOfficialDocumentCategory] = useState<'Certificat médical' | 'Formulaire d\'inscription' | 'Consentement parent' | 'Pièce d\'identité' | 'Autre'>('Certificat médical');

  const handleOfficialDocumentUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedProfile || !selectedProfile.firebaseUid) return;

    setIsUploadingOfficialDocument(true);
    const file = files[0]; // Only handle one at a time for explicit categorization

    try {
      const storage = await getStorageClient();
      const fileId = Math.random().toString(36).substring(2, 15);
      const storageRef = ref(storage, `users/${selectedProfile.firebaseUid}/documents/${fileId}_${file.name}`);
      
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          // progress could be tracked
        }, 
        (error) => {
          console.error("Error uploading official document:", error);
          showToast("Erreur lors de l'upload.", "error");
          setIsUploadingOfficialDocument(false);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          const newDoc: UserDocument = {
            id: fileId,
            name: file.name,
            category: officialDocumentCategory,
            url: downloadURL,
            type: file.type || 'application/octet-stream',
            uploadDate: new Date().toISOString()
          };

          const updatedDocs = [...(selectedProfile.documents || []), newDoc];
          const userRef = doc(db, 'users', selectedProfile.firebaseUid!);
          await updateDoc(userRef, { documents: updatedDocs });
          
          setSelectedProfile({ ...selectedProfile, documents: updatedDocs });
          showToast("Document administratif ajouté avec succès");
          setIsUploadingOfficialDocument(false);
        }
      );
    } catch (error) {
      console.error("Error initiating official doc upload:", error);
      showToast("Erreur lors de l'upload.", "error");
      setIsUploadingOfficialDocument(false);
    }
  };

  const handleDeleteOfficialDocument = async (docId: string) => {
    if (!selectedProfile || !selectedProfile.firebaseUid) return;
    
    try {
      const docToDelete = selectedProfile.documents?.find(d => d.id === docId);
      if (docToDelete) {
        // Optionnel : Supprimer le fichier de Storage si on a sauvegardé le chemin complet (ici on a juste l'URL)
        // Mais pour simplifier, on supprime juste la référence du profil.
      }
      
      const updatedDocs = selectedProfile.documents?.filter(d => d.id !== docId) || [];
      const userRef = doc(db, 'users', selectedProfile.firebaseUid);
      await updateDoc(userRef, { documents: updatedDocs });
      
      setSelectedProfile({ ...selectedProfile, documents: updatedDocs });
      showToast("Document supprimé.");
    } catch (error) {
      console.error("Error deleting document:", error);
      showToast("Erreur lors de la suppression.", "error");
    }
  };

  const handleDriveFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !state.currentClub?.id || !state.user || !selectedProfile) return;

    setIsUploadingDriveFile(true);
    setUploadProgress(0);

    const totalFiles = files.length;
    let completedFiles = 0;
    const storage = await getStorageClient();

    const uploadPromises = Array.from(files).map((file) => {
      return new Promise<void>((resolve, reject) => {
        const fileId = doc(collection(db, 'driveFiles')).id;
        const storageRef = ref(storage, `drive/${state.currentClub!.id}/${auth.currentUser!.uid}/${fileId}/${file.name}`);
        
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
      const storage = await getStorageClient();
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

  const [isAIGeneratorModalOpen, setIsAIGeneratorModalOpen] = useState(false);
  const [aiGeneratorParams, setAiGeneratorParams] = useState({ 
    nbDays: 3, 
    goals: '', 
    intensity: 'Normal', 
    extraNotes: '',
    includeWarmup: false,
    includeCardioFinisher: false,
    includeCoreFocus: false,
    timeConstraint: ''
  });

  const openAIGeneratorModal = () => {
    if (!selectedProfile) return;
    setAiGeneratorParams({
      nbDays: selectedProfile.trainingDays || 3,
      goals: (selectedProfile.objectifs || []).join(', ') || '',
      intensity: 'Normal',
      extraNotes: '',
      includeWarmup: false,
      includeCardioFinisher: false,
      includeCoreFocus: false,
      timeConstraint: ''
    });
    setIsAIGeneratorModalOpen(true);
  };

  const handleGenerateProgram = async () => {
    if (!selectedProfile) return;
    setIsGeneratingProgram(true);
    setIsAIGeneratorModalOpen(false);
    try {
      const { generateSportsProgram } = await import('../services/aiService');
      
      const generatedData = await generateSportsProgram(selectedProfile, state.exercises, aiGeneratorParams);
      
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
      
      showToast("Programme généré ! Vous pouvez maintenant le modifier et l'enregistrer.", "success");
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

  // Modèles de nutrition de base
  const STANDARD_NUTRITION_PRESETS = [
    {
      id: "s1",
      name: "Sèche Extrême / Low Carb (1600 kcal)",
      targetCalories: 1600,
      protein: 160,
      carbs: 100,
      fat: 60,
      meals: [
        { id: "s1_m1", name: "Petit Déjeuner", description: "3 œufs entiers brouillés, 50g d'épinards frais, 40g de flocons d'avoine cuits à l'eau", calories: 420, protein: 30, carbs: 26, fat: 22 },
        { id: "s1_m2", name: "Déjeuner", description: "150g de filet de poulet cuit sans matière grasse, 150g de riz basmati cuit, 200g de haricots verts cuits à la vapeur", calories: 380, protein: 42, carbs: 40, fat: 4 },
        { id: "s1_m3", name: "Collation", description: "1 dose (30g) de Whey protéine isolée mélangée à l'eau, 30g d'amandes entières", calories: 290, protein: 31, carbs: 6, fat: 16 },
        { id: "s1_m4", name: "Dîner", description: "150g de pavé de saumon frais grillé, 250g de brocolis vapeur, 1 cuillère à café d'huile d'olive extra-vierge", calories: 510, protein: 37, carbs: 12, fat: 34 }
      ],
      liste_courses: [
        { id: "c1_1", name: "Œufs entiers bios", checked: false },
        { id: "c1_2", name: "Flocons d'avoine", checked: false },
        { id: "c1_3", name: "Filets de poulet frais", checked: false },
        { id: "c1_4", name: "Riz basmati", checked: false },
        { id: "c1_5", name: "Épinards frais", checked: false },
        { id: "c1_6", name: "Haricots verts bios", checked: false },
        { id: "c1_7", name: "Whey protéine isolée", checked: false },
        { id: "c1_8", name: "Amandes entières", checked: false },
        { id: "c1_9", name: "Pavés de saumon frais", checked: false },
        { id: "c1_10", name: "Brocolis", checked: false }
      ],
      dietPreference: "Low Carb",
      goal: "Perte de poids"
    },
    {
      id: "s2",
      name: "Perte de poids / Sèche Modérée (1900 kcal)",
      targetCalories: 1900,
      protein: 175,
      carbs: 160,
      fat: 62,
      meals: [
        { id: "s2_m1", name: "Petit Déjeuner", description: "150g de fromage blanc 0%, 50g de framboises fraîches, 50g de muesli sans sucre ajouté", calories: 350, protein: 24, carbs: 45, fat: 5 },
        { id: "s2_m2", name: "Déjeuner", description: "150g de steak de bœuf haché 5% MG, 200g de patate douce au four, 150g de courgettes poêlées", calories: 520, protein: 44, carbs: 54, fat: 12 },
        { id: "s2_m3", name: "Collation", description: "1 bol de skyr nature, 1 pomme, 20g de noix de grenoble", calories: 310, protein: 20, carbs: 28, fat: 13 },
        { id: "s2_m4", name: "Dîner", description: "150g de filet de cabillaud, 200g de quinoa cuit chaud, salade verte mixte arrosée de citron et 1 cuillère à soupe d'huile de colza", calories: 720, protein: 38, carbs: 70, fat: 32 }
      ],
      liste_courses: [
        { id: "c2_1", name: "Fromage blanc 0%", checked: false },
        { id: "c2_2", name: "Framboises fraîches", checked: false },
        { id: "c2_3", name: "Muesli sans sucre", checked: false },
        { id: "c2_4", name: "Steak de bœuf 5% MG", checked: false },
        { id: "c2_5", name: "Patates douces", checked: false },
        { id: "c2_6", name: "Quinoa", checked: false },
        { id: "c2_7", name: "Filets de cabillaud", checked: false },
        { id: "c2_8", name: "Huile de colza", checked: false }
      ],
      dietPreference: "Standard",
      goal: "Perte de poids"
    },
    {
      id: "s3",
      name: "Maintien & Équilibre (2200 kcal)",
      targetCalories: 2200,
      protein: 165,
      carbs: 230,
      fat: 65,
      meals: [
        { id: "s3_m1", name: "Petit Déjeuner", description: "Omelette de 2 œufs et 3 blancs d'œufs, 2 tranches de pain de seigle complet toasté, 1 kiwi", calories: 420, protein: 32, carbs: 35, fat: 13 },
        { id: "s3_m2", name: "Déjeuner", description: "140g d'escalope de dinde, 180g de pâtes complètes cuites chaudes, ratatouille de légumes cuite", calories: 650, protein: 45, carbs: 78, fat: 11 },
        { id: "s3_m3", name: "Collation", description: "1 banane bien mûre, 1/2 tasse d'oléagineux, 1 shake de Whey", calories: 430, protein: 40, carbs: 42, fat: 10 },
        { id: "s3_m4", name: "Dîner", description: "120g de pavé de thon frais poêlé, purée de carottes, salade d'endives avec 1 cuillère d'huile de noix", calories: 700, protein: 48, carbs: 75, fat: 21 }
      ],
      liste_courses: [
        { id: "c3_1", name: "Pain de seigle", checked: false },
        { id: "c3_2", name: "Escalopes de dinde", checked: false },
        { id: "c3_3", name: "Pâtes complètes", checked: false },
        { id: "c3_4", name: "Pavés de thon frais", checked: false }
      ],
      dietPreference: "Standard",
      goal: "Sport santé bien-être"
    },
    {
      id: "s4",
      name: "Prise de Masse Propre (2600 kcal)",
      targetCalories: 2600,
      protein: 180,
      carbs: 310,
      fat: 72,
      meals: [
        { id: "s4_m1", name: "Petit Déjeuner", description: "90g de flocons d'avoine, 250ml de lait d'amande, 20g de beurre de cacahuète bio, 1 banane coupée", calories: 630, protein: 22, carbs: 88, fat: 23 },
        { id: "s4_m2", name: "Déjeuner", description: "160g de blanc de poulet rôti au four, 250g de riz basmati cuit, 200g d'asperges poêlées au citron", calories: 710, protein: 55, carbs: 90, fat: 12 },
        { id: "s4_m3", name: "Collation", description: "300g de fromage blanc nature, 30g de Whey goût chocolat, de la purée d'oléagineux", calories: 450, protein: 48, carbs: 22, fat: 18 },
        { id: "s4_m4", name: "Dîner", description: "180g de cabillaud à la provençale, 250g de purée de pommes de terre de campagne maison", calories: 810, protein: 55, carbs: 110, fat: 19 }
      ],
      liste_courses: [
        { id: "c4_1", name: "Beurre de cacahuète bio", checked: false },
        { id: "c4_2", name: "Lait d'amandes", checked: false },
        { id: "c4_3", name: "Purée d'arachides", checked: false },
        { id: "c4_4", name: "Pommes de terre", checked: false }
      ],
      dietPreference: "Standard",
      goal: "Prise de masse"
    }
  ];

  const handleAssignProgramPreset = async (preset: any) => {
    if (!selectedProfile) return;
    try {
      const mid = Number(selectedProfile.id);
      const existingProg = state.programs.find(p => Number(p.memberId) === mid && !p.isPlannedSession);
      if (existingProg) {
        await deleteDoc(doc(db, "programs", existingProg.id.toString()));
      }
      
      const newProgId = Date.now();
      const newProgram: Program = {
        id: newProgId,
        clubId: selectedProfile.clubId,
        memberId: mid,
        name: preset.name,
        presetId: preset.id,
        nbDays: preset.nbDays,
        durationWeeks: preset.durationWeeks || 4,
        startDate: new Date().toISOString().split('T')[0],
        completedWeeks: [],
        currentDayIndex: 0,
        days: preset.days || []
      };
      
      await setDoc(doc(db, "programs", newProgId.toString()), newProgram);
      showToast(`Modèle "${preset.name}" assigné avec succès !`, "success");
      setShowAssignProgramTemplateModal(false);
    } catch (error: any) {
      console.error(error);
      showToast("Erreur lors de l'assignation du modèle : " + error.message, "error");
    }
  };

  const handleAssignNutritionPreset = async (preset: any) => {
    if (!selectedProfile) return;
    try {
      const mid = Number(selectedProfile.id);
      const existingPlan = state.nutritionPlans?.find(p => p.memberId === mid);
      const planId = existingPlan?.id?.toString() || Date.now().toString();
      
      const weight = selectedProfile.weight || 70;
      const height = selectedProfile.height || 175;
      const age = selectedProfile.age || 30;
      const gender = selectedProfile.gender || 'M';
      
      let bmr = (10 * weight) + (6.25 * height) - (5 * age);
      bmr += gender === 'M' ? 5 : -161;
      let tdee = bmr * 1.55;

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
        goal: (selectedProfile.objectifs?.[0] as any) || "Perte de poids",
        durationWeeks: 4,
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        targetCalories: preset.targetCalories,
        protein: preset.protein,
        carbs: preset.carbs,
        fat: preset.fat,
        meals: preset.meals || [],
        liste_courses: preset.liste_courses || [],
        aiGenerated: false
      };
      
      await setDoc(doc(db, "nutritionPlans", planId), newPlan);
      setNutritionPlan(newPlan);
      showToast(`Modèle nutritionnel "${preset.name}" assigné avec succès !`, "success");
      setShowAssignNutritionTemplateModal(false);
    } catch (error: any) {
      console.error(error);
      showToast("Erreur lors de l'assignation du modèle : " + error.message, "error");
    }
  };

  const handleSaveAsNutritionPreset = async () => {
    if (!selectedProfile || !newNutritionTemplateName.trim()) return;
    const currentPlan = state.nutritionPlans?.find(p => p.memberId === Number(selectedProfile.id));
    if (!currentPlan) return;
    
    try {
      const presetId = Date.now().toString();
      const newPreset: any = {
        id: presetId,
        clubId: selectedProfile.clubId,
        name: newNutritionTemplateName.trim(),
        targetCalories: currentPlan.targetCalories,
        protein: currentPlan.protein,
        carbs: currentPlan.carbs,
        fat: currentPlan.fat,
        meals: currentPlan.meals || [],
        liste_courses: currentPlan.liste_courses || [],
        dietPreference: currentPlan.dietPreference || 'Standard',
        goal: currentPlan.goal || 'Standard'
      };
      
      await setDoc(doc(db, "nutritionPresets", presetId), newPreset);
      showToast(`Modèle nutritionnel "${newPreset.name}" enregistré avec succès !`, "success");
      setShowSaveNutritionTemplateModal(false);
      setNewNutritionTemplateName('');
    } catch (error: any) {
      console.error(error);
      showToast("Erreur lors de l'enregistrement du modèle : " + error.message, "error");
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
          let multiplier = 1;
          if (plan.billingCycle === 'monthly' && plan.creditsInterval === 'weekly') multiplier = 4;
          if (plan.billingCycle === 'yearly' && plan.creditsInterval === 'monthly') multiplier = 12;
          if (plan.billingCycle === 'yearly' && plan.creditsInterval === 'weekly') multiplier = 52;
          
          updates.credits = (selectedProfile.credits || 0) + (plan.credits * multiplier);
        }
        if (plan.sessionCredits) {
          Object.entries(plan.sessionCredits).forEach(([typeId, amount]) => {
            if (amount) {
              const interval = plan.sessionCreditsIntervals?.[typeId] || 'cycle';
              let multiplier = 1;
              if (plan.billingCycle === 'monthly' && interval === 'weekly') multiplier = 4;
              if (plan.billingCycle === 'yearly' && interval === 'monthly') multiplier = 12;
              if (plan.billingCycle === 'yearly' && interval === 'weekly') multiplier = 52;
              
              updates[`sessionCredits.${typeId}`] = (selectedProfile.sessionCredits?.[typeId] || 0) + (amount * multiplier);
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

  const handleSendOnboardingEmail = async () => {
    if (!selectedProfile || !selectedProfile.email) {
      showToast("Le membre n'a pas d'adresse email renseignée.", "error");
      return;
    }
    
    if (!onboardingEmailData.paymentLink || !onboardingEmailData.contractLink) {
      showToast("Veuillez renseigner le lien de paiement et le lien du contrat.", "error");
      return;
    }

    setIsSendingOnboardingEmail(true);
    try {
      const response = await apiFetch('/api/send-onboarding-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedProfile.email,
          memberName: selectedProfile.name,
          paymentLink: onboardingEmailData.paymentLink,
          contractLink: onboardingEmailData.contractLink,
          clubName: state.currentClub?.name || 'Velatra'
        })
      });

      const data = await response.json();
      if (response.ok) {
        showToast("Email envoyé avec succès !", "success");
        setShowOnboardingEmailModal(false);
        setOnboardingEmailData({ paymentLink: '', contractLink: '' });
      } else {
        showToast(data.error || "Erreur lors de l'envoi de l'email.", "error");
      }
    } catch (err) {
      console.error("Error sending onboarding email:", err);
      showToast("Erreur de connexion au serveur.", "error");
    } finally {
      setIsSendingOnboardingEmail(false);
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
      if (!selectedProfile.firebaseUid) throw new Error('Le compte adhérent n’est pas relié à une identité Firebase.');
      const storage = await getStorageClient();
      const storageRef = ref(storage, `contracts/${selectedProfile.firebaseUid}/${Date.now()}_${file.name}`);
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
      let passwordSetupEmailErrorCount = 0;

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
          // Create each imported account with a unique, undisclosed temporary password.
          const temporaryPassword = createTemporaryPassword();
          let userCredential;
          try {
            userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, temporaryPassword);
          } catch (authErr: any) {
            throw authErr;
          }
          const firebaseUid = userCredential.user.uid;

          const newUserId = Date.now() + i; // Ensure unique ID
          const newUser: User = {
            id: newUserId,
            clubId: state.user?.clubId || '',
            code: "",
            pwd: "", // Handled by Firebase Auth
            avatar: "",
            xp: 0,
            streak: 0,
            pointsFidelite: 0,
            name: name,
            email: email,
            phone: phone || '',
            role: 'member',
            gender: 'M',
            age: 30,
            weight: 70,
            height: 175,
            objectifs: ['Perte de poids'],
            experienceLevel: 'Débutant',
            trainingDays: 3,
            createdAt: new Date().toISOString(),
            notes: ''
          };

          await createMemberProfile(firebaseUid, newUser as unknown as Record<string, unknown>);
          successCount++;
          try {
            await sendPasswordResetEmail(secondaryAuth, email);
          } catch {
            passwordSetupEmailErrorCount++;
          }
        } catch (err) {
          console.error(`Error importing user ${email}:`, err);
          errorCount++;
        }
      }

      const passwordSetupNotice = passwordSetupEmailErrorCount > 0
        ? `, ${passwordSetupEmailErrorCount} e-mail(s) de création de mot de passe non envoyé(s)`
        : "";
      showToast(`Import terminé : ${successCount} ajoutés, ${errorCount} erreurs${passwordSetupNotice}`, successCount > 0 ? "success" : "error");
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
      // Create Firebase Auth user with potential orphaned account cleanup/retry
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(secondaryAuth, newMemberData.email, newMemberData.password);
      } catch (authErr: any) {
        throw authErr;
      }
      const firebaseUid = userCredential.user.uid;

      let calculatedAge = 30;
      if (newMemberData.birthDate) {
        const birthDate = new Date(newMemberData.birthDate);
        const today = new Date();
        calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
      }

      const newUserId = Date.now();
      const newUser: User = {
        id: newUserId,
        clubId: state.user.clubId,
        code: "", // Not used anymore
        pwd: "", // We use Firebase Auth
        avatar: "",
        xp: 0,
        streak: 0,
        pointsFidelite: 0,
        name: newMemberData.name,
        email: newMemberData.email,
        phone: newMemberData.phone || '',
        role: 'member',
        gender: newMemberData.gender as Gender || 'M',
        age: calculatedAge,
        birthDate: newMemberData.birthDate || '',
        weight: newMemberData.weight || 70,
        height: newMemberData.height || 175,
        objectifs: newMemberData.objectifs || [],
        notes: newMemberData.notes || '',
        createdAt: new Date().toISOString(),
        firebaseUid: firebaseUid
      };

      await createMemberProfile(firebaseUid, newUser as unknown as Record<string, unknown>);
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

  const isStripeConnected = Boolean(state.currentClub?.settings?.payment?.stripeConnected);

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
      const res = await apiFetch('/api/stripe/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan.stripePriceId
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erreur lors de la génération du lien");
      }

      const data = await res.json();
      const url = new URL(data.link);
      url.searchParams.append('client_reference_id', selectedProfile.id.toString());
      if (selectedProfile.email) {
        url.searchParams.append('prefilled_email', selectedProfile.email);
      }
      navigator.clipboard.writeText(url.toString());
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
      // We create a one-off product and price for this specific payment
      const resPrice = await apiFetch('/api/stripe/create-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payment.category === 'subscription' ? 'Abonnement' : payment.category === 'coaching' ? 'Coaching' : 'Paiement',
          price: payment.amount,
          billingCycle: 'once',
          description: `Paiement pour ${state.currentClub?.name || 'Club'}`
        })
      });

      if (!resPrice.ok) throw new Error("Erreur lors de la création du prix Stripe");
      const priceData = await resPrice.json();

      const resLink = await apiFetch('/api/stripe/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: priceData.priceId
        })
      });

      if (!resLink.ok) throw new Error("Erreur lors de la génération du lien");
      const linkData = await resLink.json();

      const url = new URL(linkData.link);
      url.searchParams.append('client_reference_id', selectedProfile.id.toString());
      if (selectedProfile.email) {
        url.searchParams.append('prefilled_email', selectedProfile.email);
      }

      navigator.clipboard.writeText(url.toString());
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
      const res = await apiFetch('/api/stripe/charge-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
    const paymentGuidance = isStripeConnected
      ? " Pour régler, utilisez le lien de paiement sécurisé transmis par votre club."
      : " Contactez votre coach pour connaître les modalités de règlement.";
    const msg = `Bonjour ${member.name}, sauf erreur de notre part, nous sommes en attente du règlement de ${payment.amount}€ pour votre abonnement.${paymentGuidance} Merci !`;
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
    <div className="space-y-5 page-transition">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 px-1">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-zinc-900">Membres</h1>
          <p className="mt-1 text-sm text-zinc-600">Retrouvez les dossiers et le suivi de vos adhérents.</p>
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            id="import-clients-csv" 
            onChange={handleParseCsvFile} 
          />
          <label 
            htmlFor="import-clients-csv" 
            className="hidden sm:flex bg-white text-zinc-800 px-4 py-3 rounded-xl font-semibold text-sm cursor-pointer hover:bg-zinc-50 transition-colors items-center gap-2 border border-zinc-200 whitespace-nowrap"
          >
            <UploadIcon size={16} />
            Importer
          </label>
          <Button variant="primary" onClick={() => setIsAddingMember(true)} className="!py-3 !px-4 sm:!px-5 !rounded-xl !text-sm font-semibold whitespace-nowrap flex-1 sm:flex-none">
            <PlusIcon size={16} className="mr-2" /> Ajouter un membre
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

      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input aria-label="Rechercher un membre" placeholder="Nom, email ou téléphone…" className="pl-11 \!bg-zinc-50 \!border-zinc-200 !rounded-xl text-sm text-zinc-900 placeholder-zinc-500" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="text-sm text-zinc-600 md:px-2"><span className="font-semibold text-zinc-900">{members.length}</span> membre{members.length !== 1 ? 's' : ''}</div>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar" role="group" aria-label="Filtrer les membres">
          {["Tous", "Demande de Plan", "Actifs", "Inactifs", "En pause", "Avec Programme", "Sans Programme"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${filter === f ? 'bg-emerald-700 text-white' : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100 border border-zinc-200'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="hidden lg:grid grid-cols-[minmax(220px,1.5fr)_minmax(130px,1fr)_minmax(150px,1fr)_minmax(140px,1fr)_auto] items-center gap-4 border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-xs font-semibold text-zinc-600">
          <span>Membre</span><span>Statut</span><span>Programme</span><span>Dernière activité</span><span className="sr-only">Actions</span>
        </div>
        {members.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600"><UserIcon size={22} /></div>
            <p className="font-semibold text-zinc-900">Aucun membre trouvé</p>
            <p className="mt-1 text-sm text-zinc-600">Modifiez la recherche ou choisissez un autre filtre.</p>
          </div>
        ) : members.map(u => {
          const stats = getMemberStats(u.id);
          const hasFeedback = Boolean(stats.program?.memberRemarks);
          const coach = state.users.find(person => person.firebaseUid === u.assignedCoachUid || String(person.id) === u.assignedCoachUid);
          const isRecentlyActive = Boolean(u.lastWorkoutDate && (Date.now() - new Date(u.lastWorkoutDate).getTime()) < 30 * 24 * 60 * 60 * 1000);
          const programName = stats.program?.name;
          const lastActivity = u.lastWorkoutDate ? new Date(u.lastWorkoutDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : null;
          return (
            <motion.button
              key={u.id}
              type="button"
              variants={itemVariants}
              onClick={() => setSelectedProfile(u)}
              className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-zinc-100 px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700 lg:grid-cols-[minmax(220px,1.5fr)_minmax(130px,1fr)_minmax(150px,1fr)_minmax(140px,1fr)_auto] lg:gap-4 lg:px-5"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 text-sm font-semibold text-zinc-700">
                  {u.avatar?.startsWith('http') ? <img src={u.avatar} alt="" className="h-full w-full object-cover" /> : u.avatar || u.name.substring(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-zinc-900">{u.name}</span>
                  <span className="block truncate text-sm text-zinc-600">{u.email || u.phone || 'Coordonnées non renseignées'}</span>
                </span>
              </span>
              <span className="col-start-2 row-start-1 flex items-center justify-end gap-2 lg:col-auto lg:row-auto">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${u.status === 'paused' ? 'bg-zinc-100 text-zinc-700' : isRecentlyActive ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${u.status === 'paused' ? 'bg-zinc-500' : isRecentlyActive ? 'bg-emerald-700' : 'bg-amber-600'}`} />
                  {u.status === 'paused' ? 'En pause' : isRecentlyActive ? 'Actif' : 'À suivre'}
                </span>
              </span>
              <span className="col-start-1 row-start-2 min-w-0 pl-14 text-sm text-zinc-700 lg:col-auto lg:row-auto lg:pl-0">
                <span className="block truncate">{programName || 'Aucun programme'}</span>
                {u.planRequested && <span className="text-xs font-medium text-amber-800">Programme demandé</span>}
              </span>
              <span className="hidden min-w-0 text-sm text-zinc-700 lg:block">
                <span>{lastActivity || 'Aucune séance'}</span>
                {coach?.name && <span className="mt-0.5 block truncate text-xs text-zinc-600">Coach · {coach.name}</span>}
              </span>
              <span className="col-start-2 row-start-2 flex items-center justify-end gap-2 text-zinc-600 lg:col-auto lg:row-auto">
                {hasFeedback && <span className="hidden rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 sm:inline">À lire</span>}
                <span className="text-sm font-medium text-emerald-800 group-hover:text-emerald-900">Ouvrir <span aria-hidden="true">→</span></span>
              </span>
            </motion.button>
          );
        })}
      </div>

      {createPortal(
        <AnimatePresence>
        {selectedProfile && (() => {
        const stats = getMemberStats(selectedProfile.id);
        const memberId = Number(selectedProfile.id);
        const nextBooking = [...(state.bookings || [])]
          .filter(booking => Number(booking.memberId) === memberId && booking.status === 'confirmed' && new Date(booking.startTime).getTime() >= Date.now())
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
        const lastActivity = [...(state.logs || [])]
          .filter(log => Number(log.memberId) === memberId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const assignedCoach = (state.users || []).find(user => user.role === 'coach' && (user.firebaseUid === selectedProfile.assignedCoachUid || String(user.id) === selectedProfile.assignedCoachUid));
        const hasDuration = stats.program && stats.program.durationWeeks;
        const totalSessions = hasDuration ? (stats.program?.nbDays || 1) * (stats.program?.durationWeeks || 1) : 0;
        const progCompletion = hasDuration && totalSessions > 0 ? Math.min(100, Math.round(((stats.program?.currentDayIndex || 0) / totalSessions) * 100)) : 0;
        const currentWeek = stats.program ? Math.floor((stats.program.currentDayIndex || 0) / (stats.program.nbDays || 1)) + 1 : 1;
        const currentSession = stats.program ? ((stats.program.currentDayIndex || 0) % (stats.program.nbDays || 1)) + 1 : 1;

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
                    <span className="text-xs font-black uppercase text-zinc-500" style={{ color: entry.color }}>{entry.name}</span>
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
                className="w-full max-w-[1450px] bg-zinc-100 backdrop-blur-2xl min-h-screen md:min-h-0 md:rounded-3xl border border-zinc-200 shadow-2xl relative overflow-hidden my-0 md:my-8"
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

                <div className="flex flex-col md:flex-row h-full min-h-[85vh]">
                  {/* SIDEBAR */}
                  <div className="w-full md:w-72 lg:w-80 bg-zinc-50 border-r border-zinc-200 p-4 md:p-6 flex flex-col gap-3 md:gap-6 shrink-0 md:h-[calc(100vh)] md:sticky top-0 overflow-y-auto hide-scrollbar pt-20 md:pt-10">
                  <div className="relative flex items-center gap-3 text-left md:block md:text-center">
                    <div className="w-12 h-12 md:w-24 md:h-24 shrink-0 rounded-2xl md:rounded-[32px] bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-lg md:text-4xl font-black md:mx-auto md:mb-6 shadow-2xl overflow-hidden">
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
                      className="absolute top-0 left-8 md:left-auto md:right-1/4 p-1.5 md:p-2 bg-white rounded-full text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-all border border-zinc-200 shadow-sm"
                      title="Modifier les infos"
                    >
                      <Edit2Icon size={16} />
                    </button>
                    <h2 className="min-w-0 truncate text-base md:text-3xl font-semibold md:font-black text-zinc-900 md:uppercase md:italic tracking-normal md:tracking-tighter flex items-center md:justify-center gap-2">
                      {selectedProfile.name}
                      {selectedProfile.status === 'paused' && <Badge variant="dark" className="!bg-zinc-800 !text-white !border-zinc-800 !px-2 !py-0.5 !text-[10px] not-italic">EN PAUSE</Badge>}
                    </h2>
                    {(() => {
                      const lastAutonomousSession = state.logs
                        ?.filter(log => log.memberId === Number(selectedProfile.id) && !log.isCoaching)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                      
                      return lastAutonomousSession ? (
                        <div className="hidden md:inline-flex text-[10px] font-bold text-emerald-800 uppercase tracking-widest mt-2 items-center justify-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                          Dernière séance en autonomie : {new Date(lastAutonomousSession.date).toLocaleDateString('fr-FR')}
                        </div>
                      ) : null;
                    })()}
                    <div className="hidden md:block mt-3">
                      <Badge variant="accent" className="!px-4 !py-1.5">ÉVOLUTION</Badge>
                    </div>
                  </div>
                  <nav className="flex flex-row md:flex-col gap-1.5 mt-1 md:mt-4 overflow-x-auto md:overflow-visible pb-1 md:pb-0 hide-scrollbar scrollbar-none">
                    {[
                      { id: 'overview', label: "Vue d'ensemble", icon: <LayersIcon size={16} /> },
                      { id: 'profile', label: "Profil", icon: <UserIcon size={16} /> },
                      { id: 'measurements', label: "Mensurations", icon: <ActivityIcon size={16} /> },
                      { id: 'training', label: "Entraînement", icon: <DumbbellIcon size={16} /> },
                      { id: 'bookings', label: "Agenda", icon: <CalendarIcon size={16} /> },
                      { id: 'billing', label: "Facturation", icon: <DollarSignIcon size={16} /> },
                      { id: 'documents', label: "Documents", icon: <FolderIcon size={16} /> }
                    ].map(tab => (
                      <button 
                        key={tab.id}
                        onClick={() => setMemberTab(tab.id as any)}
                        aria-current={memberTab === tab.id ? 'page' : undefined}
                        className={`flex min-h-11 items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium tracking-normal transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 ${memberTab === tab.id ? 'bg-emerald-800 text-white' : 'text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200/70'}`}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                  </nav>

                  

                  

                  
                </div>

                {/* MAIN GRAPHS & AI */}
                <div className="flex-1 min-w-0 bg-white p-4 sm:p-6 md:p-10 lg:p-12 overflow-y-auto space-y-8 custom-scrollbar md:h-[calc(100vh)]">
                    <div className="sticky top-0 z-30 -mx-4 -mt-4 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white/95 px-4 py-3 pr-16 backdrop-blur-sm sm:-mx-6 sm:-mt-6 sm:px-6 sm:pr-16 md:-mx-10 md:-mt-10 md:px-10 md:pr-32 lg:-mx-12 lg:-mt-12 lg:px-12 lg:pr-32">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-zinc-700">{assignedCoach ? `Coach · ${assignedCoach.name}` : 'Coach non attribué'}{stats.program?.name ? ` · ${stats.program.name}` : ' · Aucun programme'}</p>
                      <div className="flex min-w-0 items-center gap-2">
                        <h2 className="truncate text-base font-semibold text-zinc-900 sm:text-lg">{selectedProfile.name}</h2>
                        {selectedProfile.status === 'paused' && <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">En pause</span>}
                      </div>
                    </div>
                    <Button variant="primary" onClick={() => handleEditProgram(selectedProfile)} className="!shrink-0 !rounded-xl !px-3 !py-2 !text-xs sm:!px-4 sm:!py-2.5 sm:!text-sm">
                      <DumbbellIcon size={15} className="mr-1.5" /> Programme
                    </Button>
                  </div>
                  
                  
                  {/* VELATRA AI ENGINE SECTION */}
                  {memberTab === 'overview' && (
                  <section className="space-y-8">
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-zinc-700">Repères utiles pour le suivi</p>
                          <h3 className="mt-1 text-lg font-semibold text-zinc-900">Vue d’ensemble</h3>
                        </div>
                        {selectedProfile.status === 'paused' ? (
                          <span className="rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-800">En pause</span>
                        ) : <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900">Actif</span>}
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-xl border border-zinc-200 bg-white p-3.5">
                          <p className="text-xs font-medium text-zinc-700">Programme actuel</p>
                          <p className="mt-1 truncate text-sm font-semibold text-zinc-900">{stats.program?.name || 'Aucun programme attribué'}</p>
                          {stats.program && <p className="mt-1 text-xs text-zinc-700">{stats.program.days?.length || 0} séances par cycle{stats.program.durationWeeks ? ` · ${stats.program.durationWeeks} semaines` : ''}</p>}
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-white p-3.5">
                          <p className="text-xs font-medium text-zinc-700">Prochaine séance</p>
                          {nextBooking ? <><p className="mt-1 text-sm font-semibold text-zinc-900">{new Date(nextBooking.startTime).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(nextBooking.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p><p className="mt-1 text-xs text-zinc-700">{nextBooking.type === 'trial' ? 'Séance découverte' : 'Coaching confirmé'}</p></> : <p className="mt-1 text-sm font-medium text-zinc-800">Aucune réservation confirmée à venir</p>}
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-white p-3.5">
                          <p className="text-xs font-medium text-zinc-700">Dernière activité</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900">{lastActivity ? new Date(lastActivity.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Aucune séance enregistrée'}</p>
                          {lastActivity && <p className="mt-1 text-xs text-zinc-700">{lastActivity.dayName || 'Séance'}</p>}
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-white p-3.5">
                          <p className="text-xs font-medium text-zinc-700">Abonnement</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900">{stats.subscription?.planName || 'Aucun abonnement actif'}</p>
                          {stats.subscription && <p className="mt-1 text-xs text-zinc-700">{stats.subscription.price.toFixed(2)} € · {stats.subscription.billingCycle === 'yearly' ? 'annuel' : stats.subscription.billingCycle === 'monthly' ? 'mensuel' : 'paiement unique'}</p>}
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-white p-3.5">
                          <p className="text-xs font-medium text-zinc-700">Coach référent</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900">{assignedCoach?.name || 'Non attribué'}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-white p-3.5">
                          <p className="text-xs font-medium text-zinc-700">Objectif principal</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900">{selectedProfile.objectifs?.[0] || 'À définir'}</p>
                        </div>
                      </div>
                      {selectedProfile.notes?.trim() && <p className="mt-3 line-clamp-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-800"><span className="font-semibold">Note coach · </span>{selectedProfile.notes}</p>}
                    </div>

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
                          <p className="text-[10px] text-zinc-500 mb-6 leading-relaxed">Générez un programme d'entraînement complet et sur-mesure basé sur les objectifs et le niveau du membre.</p>
                        </div>
                        <div className="space-y-2 relative z-10 w-full">
                          <Button 
                            variant="secondary" 
                            fullWidth 
                            onClick={openAIGeneratorModal} 
                            disabled={isGeneratingProgram} 
                            className={`!py-3 !text-[10px] !rounded-xl border-emerald-500/30 !bg-emerald-500/10 !text-emerald-500 hover:!bg-emerald-500/20 transition-all ${isGeneratingProgram ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <SparklesIcon size={14} className="mr-2 inline" />
                            {isGeneratingProgram ? 'GÉNÉRATION EN COURS...' : 'GÉNÉRER VIA IA'}
                          </Button>
                          <Button 
                            variant="secondary" 
                            fullWidth 
                            onClick={() => setShowAssignProgramTemplateModal(true)} 
                            className="!py-3 !text-[10px] !rounded-xl border-emerald-500/30 !bg-zinc-100 !text-zinc-700 hover:!bg-zinc-200 transition-all"
                          >
                            <PlusIcon size={14} className="mr-2 inline" />
                            ASSIGNER UN MODÈLE
                          </Button>
                        </div>
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
                          <Button variant="secondary" fullWidth className="!py-3 !text-[10px] !rounded-xl border-emerald-500/30 hover:border-emerald-500 !bg-zinc-100 !text-zinc-700 hover:!bg-zinc-200 transition-all" onClick={() => setShowAssignNutritionTemplateModal(true)}>
                            <PlusIcon size={14} className="mr-2 inline" /> ASSIGNER UN MODÈLE
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
                            <span className={`text-xs font-medium uppercase tracking-wider ${stagnationResult.hasStagnation ? 'text-red-500' : 'text-green-500'}`}>
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

                    {/* NOTES DE SUIVI SECTION */}
                    <div className="bg-zinc-50 border border-zinc-200 rounded-[32px] p-8 mt-8 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-200/60 pb-3">
                        <div className="flex items-center gap-2">
                          <FileTextIcon size={20} className="text-emerald-500" />
                          <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest">
                            Notes de suivi du client
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                          Coach
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-normal">
                        Utilisez cet espace pour noter les forces, faiblesses, ressentis, et adaptations pour {selectedProfile.name}.
                      </p>
                      <textarea
                        value={coachingNotes}
                        onChange={(e) => setCoachingNotes(e.target.value)}
                        placeholder="Saisissez une nouvelle note (ex : restriction d'amplitude, blessures passées, ressentis, objectifs à court terme)..."
                        className="w-full h-24 bg-white border border-zinc-200 rounded-2xl p-4 text-xs text-zinc-800 outline-none focus:border-emerald-500 transition-colors resize-none shadow-sm animate-in fade-in"
                      />
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Date de la note :</span>
                          <input 
                            type="date"
                            value={coachingNoteDate}
                            onChange={(e) => setCoachingNoteDate(e.target.value)}
                            className="bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-zinc-800 outline-none focus:border-emerald-500 cursor-pointer shadow-sm"
                          />
                        </div>
                        <Button 
                          variant="success" 
                          onClick={handleSaveCoachingNotes} 
                          disabled={isSavingCoachingNotes}
                          className="!py-2.5 !px-6 !text-[11px] w-full sm:w-auto"
                        >
                          {isSavingCoachingNotes ? "ENREGISTREMENT..." : "AJOUTER LA NOTE"}
                        </Button>
                      </div>

                      {/* HISTORIQUE DES NOTES */}
                      <div className="pt-6 border-t border-zinc-200/60 space-y-4">
                        <h5 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                          <FileTextIcon size={14} className="text-emerald-500" /> Notes enregistrées ({(selectedProfile.coachingNotesHistory || []).length})
                        </h5>

                        {/* Legacy note or default display if history is empty but notes string is not empty */}
                        {(!selectedProfile.coachingNotesHistory || selectedProfile.coachingNotesHistory.length === 0) && selectedProfile.notes && (
                          <div className="bg-white border border-zinc-200 rounded-2xl p-4 text-xs shadow-sm flex justify-between items-start">
                            <div className="space-y-1 w-full">
                              <p className="text-zinc-400 text-[9px] uppercase font-bold tracking-wider">Note globale existante</p>
                              <p className="text-zinc-800 whitespace-pre-wrap font-medium">{selectedProfile.notes}</p>
                            </div>
                          </div>
                        )}

                        {selectedProfile.coachingNotesHistory && selectedProfile.coachingNotesHistory.length > 0 ? (
                          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                            {selectedProfile.coachingNotesHistory.map((note) => (
                              <div key={note.id} className="bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl p-4 text-xs shadow-sm space-y-2 relative group transition-colors">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded tracking-wide uppercase">
                                    {new Date(note.date).toLocaleString('fr-FR', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                  <button
                                    onClick={() => handleDeleteCoachingNote(note.id)}
                                    className="text-zinc-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors"
                                    title="Supprimer la note"
                                  >
                                    <Trash2Icon size={14} />
                                  </button>
                                </div>
                                <p className="text-zinc-800 leading-relaxed font-semibold whitespace-pre-wrap">{note.content}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          !selectedProfile.notes && (
                            <div className="text-center py-6 bg-zinc-100/50 border border-dashed border-zinc-200 rounded-2xl">
                              <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">Aucune note enregistrée pour le moment.</p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </section>
                  )}

                  {/* AGENDA & RÉSERVATIONS TAB */}
                  {memberTab === 'bookings' && (
                  <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><CalendarIcon size={24} /></div>
                       <div>
                         <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">Agenda & Réservations</h3>
                         <p className="text-xs text-zinc-500 mt-0.5">Consultez, filtrez et gérez les réservations et le forfait d'abonnement actif pour {selectedProfile.name}.</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                      {/* SIDEBAR FILTERS AND STATS */}
                      <div className="lg:col-span-1 space-y-6">
                        {/* 1. Subscription Stats Card */}
                        <div className="bg-zinc-50 border border-zinc-200 rounded-[32px] p-6 shadow-sm space-y-4">
                          <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-200 pb-2">
                            Abonnement & Forfait
                          </h4>
                          {(() => {
                            const activeSub = state.subscriptions?.find(s => s.memberId === Number(selectedProfile?.id) && s.status === 'active');
                            const activePlan = activeSub ? state.plans?.find(p => p.id === activeSub.planId) : null;
                            const memberBookings = state.bookings?.filter(b => b.memberId === Number(selectedProfile?.id) && b.status !== 'cancelled') || [];
                            const totalBookings = memberBookings.length;
                            
                            if (!activeSub) {
                              return (
                                <div className="space-y-2">
                                  <div className="text-xs font-bold text-red-500 bg-red-50 border border-red-100 rounded-2xl p-3 text-center space-y-1">
                                    <div className="font-extrabold uppercase tracking-wide">⚠️ Pas d'abonnement en cours</div>
                                    <div className="text-[10px] text-red-400 font-medium normal-case">Aucune formule active trouvée pour ce membre.</div>
                                  </div>
                                  <div className="pt-2 border-t border-zinc-200/60 flex justify-between items-center text-[11px]">
                                    <span className="font-bold text-zinc-500 uppercase tracking-wider">Réservations totales</span>
                                    <span className="font-black text-zinc-900 bg-zinc-200 px-2 py-0.5 rounded-full">{totalBookings}</span>
                                  </div>
                                </div>
                              );
                            }

                            const creditsText = activePlan?.credits !== undefined ? String(activePlan.credits) : 'Illimité';
                            return (
                              <div className="space-y-4">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full inline-block">
                                    ACTIF
                                  </span>
                                  <h5 className="font-black text-zinc-950 text-xs leading-tight uppercase font-display italic">
                                    {activeSub.planName || 'Formule Active'}
                                  </h5>
                                  <p className="text-[10px] text-zinc-500 font-medium">
                                    Débute le : {new Date(activeSub.startDate).toLocaleDateString('fr-FR')}
                                  </p>
                                </div>

                                <div className="pt-3 border-t border-zinc-200/60 space-y-3">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Réservations totales</span>
                                    <span className="font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                                      {totalBookings}
                                    </span>
                                  </div>

                                  <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Séances forfait</span>
                                    <span className="font-black text-zinc-800 bg-zinc-200 px-2.5 py-0.5 rounded-full">
                                      {creditsText}
                                    </span>
                                  </div>

                                  {activePlan?.credits !== undefined && activePlan.credits > 0 && (
                                    <div className="space-y-1 pt-1">
                                      <div className="w-full bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                                        <div 
                                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                          style={{ width: `${Math.min(100, (totalBookings / activePlan.credits) * 100)}%` }}
                                        />
                                      </div>
                                      <div className="flex justify-between text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
                                        <span>Utilisé : {totalBookings}</span>
                                        <span>Quota : {activePlan.credits}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* 2. Filters Card */}
                        <div className="bg-zinc-50 border border-zinc-200 rounded-[32px] p-6 shadow-sm space-y-4">
                          <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-200 pb-2">
                            Filtres de l'Agenda
                          </h4>
                          
                          {/* Status Filter */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                              Statut
                            </label>
                            <select
                              value={bookingStatusFilter}
                              onChange={(e) => setBookingStatusFilter(e.target.value)}
                              className="w-full text-xs font-bold bg-white border border-zinc-200 rounded-xl px-2.5 py-2 outline-none focus:border-emerald-500 text-zinc-800 cursor-pointer"
                            >
                              <option value="all">Tous les statuts</option>
                              <option value="confirmed">Confirmées / Actives</option>
                              <option value="pending">En attente</option>
                              <option value="completed">Terminées</option>
                              <option value="cancelled">Annulées / Rejetées</option>
                            </select>
                          </div>

                          {/* Type Filter */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                              Type de séance
                            </label>
                            <select
                              value={bookingTypeFilter}
                              onChange={(e) => setBookingTypeFilter(e.target.value)}
                              className="w-full text-xs font-bold bg-white border border-zinc-200 rounded-xl px-2.5 py-2 outline-none focus:border-emerald-500 text-zinc-800 cursor-pointer"
                            >
                              <option value="all">Tous les types</option>
                              <option value="coaching">Coaching individuel</option>
                              <option value="trial">Séance d'essai</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* MAIN RESERVATIONS TIMELINE */}
                      <div className="lg:col-span-3 space-y-4">
                        {(() => {
                          const rawBookings = state.bookings?.filter(b => b.memberId === Number(selectedProfile?.id)) || [];
                          
                          // Filter bookings based on state
                          const filteredBookings = rawBookings.filter(b => {
                            // Status filter
                            if (bookingStatusFilter === 'confirmed' && b.status !== 'confirmed') return false;
                            if (bookingStatusFilter === 'pending' && b.status !== 'pending') return false;
                            if (bookingStatusFilter === 'completed' && b.status !== 'completed') return false;
                            if (bookingStatusFilter === 'cancelled' && b.status !== 'cancelled' && b.status !== 'rejected') return false;
                            
                            // Type filter
                            if (bookingTypeFilter === 'coaching' && b.type !== 'coaching') return false;
                            if (bookingTypeFilter === 'trial' && b.type !== 'trial') return false;

                            return true;
                          });

                          // Sort chronologically (upcoming first, then past)
                          const sortedBookings = [...filteredBookings].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

                          if (sortedBookings.length === 0) {
                            return (
                              <div className="bg-zinc-50 border border-zinc-200 rounded-[32px] p-12 text-center space-y-4 shadow-sm animate-in fade-in duration-300">
                                <div className="p-4 bg-zinc-200/50 rounded-full text-zinc-400 inline-block">
                                  <CalendarIcon size={32} />
                                </div>
                                <div className="space-y-1 max-w-sm mx-auto">
                                  <h4 className="font-black text-zinc-900 text-sm uppercase">Aucune réservation trouvée</h4>
                                  <p className="text-xs text-zinc-500 leading-normal">
                                    Aucun créneau de réservation ne correspond à vos filtres actuels ou le membre n'a aucun enregistrement.
                                  </p>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-3">
                              {sortedBookings.map(booking => {
                                const coachName = state.users?.find(u => String(u.id) === booking.coachId)?.name || 'Coach Indéfini';
                                const start = new Date(booking.startTime);
                                const end = new Date(booking.endTime);
                                
                                // Format nicer French dates
                                const dayName = start.toLocaleDateString('fr-FR', { weekday: 'short' });
                                const dayNum = start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                                const timeStr = `${start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

                                return (
                                  <div 
                                    key={booking.id}
                                    className="bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl p-4 sm:p-5 shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                                  >
                                    <div className="flex items-center gap-4">
                                      {/* Date indicator block */}
                                      <div className="bg-zinc-100 border border-zinc-200/60 rounded-xl px-3.5 py-2.5 text-center min-w-[70px]">
                                        <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{dayName}</div>
                                        <div className="text-sm font-black text-zinc-900 uppercase font-display italic tracking-tighter">{dayNum}</div>
                                      </div>

                                      <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-xs font-black text-zinc-950 uppercase">
                                            {booking.type === 'coaching' ? 'Coaching Privé' : 'Séance d\'Essai'}
                                          </span>
                                           <Badge 
                                            variant={
                                              booking.status === 'confirmed' ? 'success' :
                                              booking.status === 'completed' ? 'accent' :
                                              booking.status === 'pending' ? 'orange' :
                                              'dark'
                                            }
                                            className="uppercase !text-[9px] !px-2 !py-0.5 font-bold tracking-widest"
                                          >
                                            {
                                              booking.status === 'confirmed' ? 'Confirmé' :
                                              booking.status === 'completed' ? 'Complété' :
                                              booking.status === 'pending' ? 'En attente' :
                                              booking.status === 'cancelled' ? 'Annulé' :
                                              booking.status === 'rejected' ? 'Rejeté' : booking.status
                                            }
                                          </Badge>
                                        </div>
                                        <div className="text-[11px] text-zinc-500 font-bold flex items-center gap-1.5">
                                          <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-700">{timeStr}</span>
                                          <span>• Dirigé par : <strong className="text-zinc-700 font-extrabold">{coachName}</strong></span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Action button */}
                                    {booking.status === 'confirmed' && (
                                      <Button 
                                        variant="secondary"
                                        className="!py-1.5 !px-3 font-bold !text-[9px] !rounded-lg border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                                        onClick={async () => {
                                          if (confirm(`Voulez-vous vraiment annuler la réservation de ${selectedProfile.name} le ${dayNum} à ${timeStr} ?`)) {
                                            try {
                                              await updateDoc(doc(db, "bookings", booking.id), { status: 'cancelled' });
                                              showToast("Réservation annulée avec succès");
                                            } catch (err) {
                                              console.error(err);
                                              showToast("Erreur lors de l'annulation", "error");
                                            }
                                          }
                                        }}
                                      >
                                        <XIcon size={12} className="mr-1 inline-block" /> ANNULER
                                      </Button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </section>
                  )}

                  {/* DOCUMENTS (OFFICIELS & DRIVE) */}
                  {memberTab === 'documents' && (
                  <section className="space-y-8">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500"><FolderIcon size={24} /></div>
                       <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">Documents</h3>
                    </div>

                    {/* DOCUMENTS ADMINISTRATIFS */}
                    <div className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-[40px] p-8 shadow-sm">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <div>
                          <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Documents Administratifs</h4>
                          <p className="text-[10px] text-zinc-500 mt-1">Certificats médicaux, formulaires d'inscription...</p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <select 
                            value={officialDocumentCategory}
                            onChange={(e) => setOfficialDocumentCategory(e.target.value as any)}
                            className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-emerald-500 shrink-0"
                          >
                            <option value="Certificat médical">Certificat médical</option>
                            <option value="Formulaire d'inscription">Formulaire d'inscription</option>
                            <option value="Consentement parent">Consentement parent</option>
                            <option value="Pièce d'identité">Pièce d'identité</option>
                            <option value="Autre">Autre</option>
                          </select>
                          <label className="cursor-pointer shrink-0">
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => handleOfficialDocumentUpload(e.target.files)}
                              disabled={isUploadingOfficialDocument}
                              accept="image/*,.pdf"
                            />
                            <Button variant="secondary" className="!py-2 !px-4 !text-[10px] !rounded-xl pointer-events-none" disabled={isUploadingOfficialDocument}>
                              {isUploadingOfficialDocument ? (
                                <span>...</span>
                              ) : (
                                <>
                                  <UploadIcon size={14} className="mr-2 inline" />
                                  IMPORTER
                                </>
                              )}
                            </Button>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {selectedProfile.documents && selectedProfile.documents.length > 0 ? (
                          selectedProfile.documents
                            .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
                            .map(doc => (
                              <div key={doc.id} className="flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-2xl hover:border-emerald-500/30 transition-colors shadow-sm">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-500/20">
                                    <FileTextIcon size={20} />
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-zinc-900">{doc.category}</div>
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                                      {doc.name} • {new Date(doc.uploadDate).toLocaleDateString('fr-FR')}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-2 text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-colors">
                                    <EyeIcon size={18} />
                                  </a>
                                  <button onClick={() => handleDeleteOfficialDocument(doc.id)} className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors">
                                    <Trash2Icon size={18} />
                                  </button>
                                </div>
                              </div>
                            ))
                        ) : (
                          <div className="text-center py-8 text-zinc-500 text-sm">
                            Aucun document administratif pour le moment.
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* DOCUMENTS PARTAGÉS GÉNÉRIQUES */}
                    <div className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-[40px] p-8 shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Fichiers partagés</h4>
                          <p className="text-[10px] text-zinc-500 mt-1">Vidéos, bilans PDF, historiques partagés...</p>
                        </div>
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
                  )}

                  {/* FINANCES & FACTURATION */}
                  {memberTab === 'billing' && (
<div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
    <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest text-emerald-500">Crédits Coaching</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between bg-zinc-50 backdrop-blur-xl p-3 rounded-2xl border border-zinc-200 shadow-sm">
                        <div>
                          <div className="text-xl font-black text-zinc-900">{selectedProfile.credits || 0}</div>
                          <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Standard</div>
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
                            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{type.name}</div>
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
                    <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest text-emerald-500">Fidélité & Achats</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Points</div>
                        <div className="text-xl font-black text-zinc-900">{selectedProfile.pointsFidelite || 0}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Achats</div>
                        <div className="text-xl font-black text-emerald-500">{stats.totalSpent}€</div>
                      </div>
                    </div>
                  </div>
                      <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                       <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest text-emerald-500">Abonnement</h3>
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
                              <label className="text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 ml-1">Date de début</label>
                              <Input type="date" value={subStartDate} onChange={e => setSubStartDate(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 ml-1">Fin d'engagement (optionnel)</label>
                              <Input type="date" value={subCommitmentDate} onChange={e => setSubCommitmentDate(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 ml-1">Importer un contrat (PDF, Image)</label>
                              <input 
                                type="file" 
                                accept=".pdf,image/*" 
                                onChange={handleFileUpload}
                                className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-emerald-500/10 file:text-emerald-500 hover:file:bg-emerald-500/20 transition-colors"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 ml-1">Ou lien du contrat (optionnel)</label>
                              <Input type="url" placeholder="https://..." value={subContractUrl} onChange={e => setSubContractUrl(e.target.value)} />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 pt-2 sticky bottom-0 bg-white pb-2 z-10">
                              <button onClick={() => setIsEditingSub(false)} className="flex-1 px-3 py-2 text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors">Annuler</button>
                              <button onClick={handleUpdateSubscription} className="flex-1 bg-emerald-500 text-zinc-900 px-3 py-2 rounded-xl text-xs font-black uppercase text-zinc-500 tracking-wider">Enregistrer</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => {
                            setSubStartDate(stats.subscription!.startDate.split('T')[0]);
                            setSubCommitmentDate(stats.subscription!.commitmentEndDate ? stats.subscription!.commitmentEndDate.split('T')[0] : '');
                            setSubContractUrl(stats.subscription!.contractUrl || '');
                            setIsEditingSub(true);
                          }} className="w-full mt-4 border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 rounded-xl py-2 text-xs font-black uppercase text-zinc-500 tracking-wider transition-colors">
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
                              <label className="text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 ml-1">Date de début</label>
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
                              <label className="text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 ml-1">Fin d'engagement (optionnel)</label>
                              <Input type="date" value={subCommitmentDate} onChange={e => setSubCommitmentDate(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 ml-1">Importer un contrat (PDF, Image)</label>
                              <input 
                                type="file" 
                                accept=".pdf,image/*" 
                                onChange={handleFileUpload}
                                className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-emerald-500/10 file:text-emerald-500 hover:file:bg-emerald-500/20 transition-colors"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 ml-1">Ou lien du contrat (optionnel)</label>
                              <Input type="url" placeholder="https://..." value={subContractUrl} onChange={e => setSubContractUrl(e.target.value)} />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 pt-2 sticky bottom-0 bg-zinc-50 pb-2 z-10">
                              <button onClick={() => setIsAssigningPlan(false)} className="flex-1 px-3 py-2 text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors">Annuler</button>
                              <button onClick={handleAssignSubscription} disabled={!selectedPlanId} className="flex-1 bg-emerald-500 text-zinc-900 px-3 py-2 rounded-xl text-xs font-black uppercase text-zinc-500 tracking-wider disabled:opacity-50">Confirmer</button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <button onClick={() => setIsAssigningPlan(true)} className="w-full border border-dashed  text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 rounded-3xl py-4 text-xs font-black uppercase text-zinc-500 tracking-wider transition-colors">
                              + Assigner une formule
                            </button>
                            <button onClick={() => setShowOnboardingEmailModal(true)} className="w-full bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 rounded-3xl py-4 text-xs font-black uppercase text-zinc-500 tracking-wider transition-colors flex items-center justify-center gap-2">
                              <MailIcon size={14} /> ENVOYER CONTRAT & PAIEMENT
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
    
  </div>
  {/* The rest of billing was already here...? Oh wait, let's keep the existing stuff if there was any... wait, billing was only containing payments list actually. */}

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
</div>
                  )}

                  {/* COACHING HISTORY */}
                  {memberTab === 'profile' && (
<section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
  <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">Profil Adhérent</h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* Profile & Notes */}
    <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl space-y-4 shadow-sm">
                    <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest text-emerald-500">Profil & Objectifs</h3>
                    
                    {(selectedProfile.email || selectedProfile.phone) && (
                      <div className="space-y-3 mb-6 pb-4 border-b ">
                        {selectedProfile.email && (
                          <div>
                            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Email</div>
                            <div className="text-sm font-bold text-zinc-900">{selectedProfile.email}</div>
                          </div>
                        )}
                        {selectedProfile.phone && (
                          <div>
                            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Téléphone</div>
                            <div className="text-sm font-bold text-zinc-900">{selectedProfile.phone}</div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Âge</div>
                        <div className="text-sm font-bold text-zinc-900">{selectedProfile.age} ans</div>
                      </div>
                      {selectedProfile.birthDate && (
                        <div>
                          <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Date de naissance</div>
                          <div className="text-sm font-bold text-zinc-900">{new Date(selectedProfile.birthDate).toLocaleDateString()}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Sexe</div>
                        <div className="text-sm font-bold text-zinc-900">{selectedProfile.gender === 'M' ? 'Homme' : selectedProfile.gender === 'F' ? 'Femme' : 'Autre'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Taille</div>
                        <div className="text-sm font-bold text-zinc-900">{selectedProfile.height} cm</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Poids Initial</div>
                        <div className="text-sm font-bold text-zinc-900">{selectedProfile.weight} kg</div>
                      </div>
                    </div>
                    {selectedProfile.objectifs && selectedProfile.objectifs.length > 0 && (
                      <div>
                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Objectifs</div>
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
                      <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest text-emerald-500">Notes d'Inscription</h3>
                      <p className="text-xs text-zinc-500 leading-relaxed italic">"{selectedProfile.notes}"</p>
                    </div>
                  )}

                  {/* Remarks Display */}
                  {stats.program?.memberRemarks && (
                    <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-3xl space-y-3">
                       <div className="flex items-center gap-2 text-orange-500">
                          <MessageCircleIcon size={18} />
                          <span className="text-xs font-black uppercase text-zinc-500 tracking-wider">Feedback Adhérent</span>
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

    
  </div>
</section>
)}
{memberTab === 'measurements' && (
<section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
    <div>
      <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">Suivi & Mensurations</h3>
      <p className="text-xs text-zinc-500 mt-1">Gérez le scan corporel, l'évolution en photos et l'historique biométrique.</p>
    </div>
    <div className="flex gap-2 bg-zinc-100 p-1 rounded-xl">
      <button
        onClick={() => setMeasurementsSubTab('scans')}
        className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${measurementsSubTab === 'scans' ? 'bg-emerald-500 text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
      >
        Scans & Évolution
      </button>
      <button
        onClick={() => setMeasurementsSubTab('biometrics')}
        className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${measurementsSubTab === 'biometrics' ? 'bg-emerald-500 text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
      >
        Journaux Biométriques
      </button>
    </div>
  </div>

  {measurementsSubTab === 'scans' ? (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="space-y-6 bg-zinc-50 p-8 rounded-[32px] border border-zinc-200">
        <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest text-emerald-500 mb-2">Nouveau Scan</h3>
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

      <div className="space-y-4">
        {(() => {
          const memberPhotos = state.progressPhotos?.filter(p => p.memberId === Number(selectedProfile.id) && p.visibility === 'coach') || [];
          const photosByDate = memberPhotos.reduce((acc, photo) => {
            const date = photo.date.split('T')[0];
            if (!acc[date]) acc[date] = photo;
            return acc;
          }, {} as Record<string, import('../types').ProgressPhoto>);
          const sortedDates = Object.keys(photosByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
          const latestDate = sortedDates[0];
          
          const activeDate = selectedDateForPhoto || latestDate;
          const activePhoto = activeDate ? photosByDate[activeDate] : null;

          if (!activePhoto) {
            return (
              <div className="bg-zinc-50 border border-zinc-200 rounded-[32px] p-8 shadow-sm text-center">
                <ImageIcon size={32} className="mx-auto text-zinc-300 mb-3" />
                <h4 className="font-black text-zinc-900 text-sm uppercase mb-1">Aucune photo d'évolution</h4>
                <p className="text-xs text-zinc-500">Le membre n'a pas encore partagé ses photos d'évolution avec vous.</p>
              </div>
            );
          }

          return (
            <div className="bg-zinc-50 border border-zinc-200 rounded-[32px] p-8 shadow-sm space-y-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-black text-zinc-900 text-sm uppercase font-display italic">Évolution corporelle</span>
                
                {sortedDates.length > 1 ? (
                  <select 
                    value={activeDate} 
                    onChange={(e) => setSelectedDateForPhoto(e.target.value)}
                    className="text-xs bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 font-bold outline-none focus:border-emerald-500 cursor-pointer text-zinc-800"
                  >
                    {sortedDates.map(d => (
                      <option key={d} value={d}>
                        {new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[10px] font-bold text-zinc-500 uppercase bg-zinc-200 px-2 py-1 rounded">
                    {new Date(activeDate).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {['frontUrl', 'sideUrl', 'backUrl'].map((type) => {
                  const url = (activePhoto as any)[type];
                  return (
                    <div 
                      key={type} 
                      className="aspect-[3/4] bg-zinc-200 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border border-zinc-300/50 shadow-sm relative group" 
                      onClick={() => url && setSelectedEvolutionPhoto(url)}
                    >
                      {url ? (
                        <>
                          <img src={url} alt={type} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[10px] text-white font-bold uppercase tracking-wider">Agrandir</span>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400">
                          <ImageIcon size={16} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {activePhoto.measurements && Object.keys(activePhoto.measurements).length > 0 && (
                <div className="bg-white rounded-2xl p-4 border border-zinc-200">
                  <h4 className="text-xs font-black uppercase text-zinc-500 tracking-wider mb-3">Mensurations (cm)</h4>
                  <div className="grid grid-cols-3 gap-y-3 gap-x-2">
                    {[
                      { key: 'chest', label: 'Poitrine' },
                      { key: 'waist', label: 'Taille' },
                      { key: 'hips', label: 'Hanches' },
                      { key: 'arm', label: 'Bras' },
                      { key: 'thigh', label: 'Cuisse' },
                      { key: 'calf', label: 'Mollet' }
                    ].map(m => activePhoto.measurements?.[m.key as any] ? (
                      <div key={m.key}>
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{m.label}</div>
                        <div className="text-sm font-black text-zinc-900">{activePhoto.measurements[m.key as any] || '--'}</div>
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}

              {sortedDates.length > 1 && (
                <div className="text-center pt-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{sortedDates.length} relevés photos disponibles</span>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  ) : (
    <div className="space-y-6 bg-zinc-50 border border-zinc-200 rounded-[32px] p-6 sm:p-8 animate-in fade-in duration-300">
      <div>
        <h4 className="text-sm font-black text-zinc-950 uppercase tracking-widest mb-1 flex items-center gap-2">
          <FileTextIcon size={18} className="text-emerald-500" /> Journaux Biométriques & Alimentation
        </h4>
        <p className="text-[11px] text-zinc-500 leading-normal">
          Consultez et complétez les relevés nutritionnels quotidiens, l'apport en eau, le sommeil et le poids du membre pour optimiser son suivi de près.
        </p>
      </div>
      <div className="bg-white border border-zinc-200 rounded-2xl p-2 sm:p-6 shadow-inner">
        <MemberNutritionView state={state} showToast={showToast} memberId={Number(selectedProfile.id)} readOnly={false} />
      </div>
    </div>
  )}
</section>
)}
{memberTab === 'training' && (
                  <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                                        <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                       <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest text-emerald-500">Plan Actif</h3>
                    </div>
                    {stats.program ? (
                      <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
                        {/* Title & Phase Badge in a single line */}
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="font-black text-zinc-900 text-lg uppercase italic tracking-tight leading-tight shrink">
                            {stats.program.name}
                          </div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-100/80 px-2.5 py-1 rounded-full shrink-0">
                            {hasDuration ? `${progCompletion}% complété` : `Semaine ${currentWeek} • Jour ${currentSession}`}
                          </div>
                        </div>

                        {/* Progress Bar (Thinner and sleeker) */}
                        <div className="my-3">
                          {hasDuration ? (
                            <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/50">
                              <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${progCompletion}%` }} />
                            </div>
                          ) : (
                            <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/50 flex">
                               <div className="h-full bg-emerald-500/80 w-full rounded-full" />
                            </div>
                          )}
                        </div>

                        {/* Surcharge Progressive IA (Clean modern switch list item) */}
                        <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-8 h-4 bg-emerald-500 rounded-full relative cursor-pointer transition-colors" 
                              onClick={() => showToast("Surcharge active : progression de charge automatique réglée à +2.5kg", "info")}
                            >
                              <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all" />
                            </div>
                            <div>
                              <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest block leading-tight">Surcharge Progressive IA</span>
                              <span className="text-[8px] text-zinc-400 font-extrabold uppercase tracking-widest block mt-0.5">+2.5kg automatique par séance validée</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons: 1 Giant CTA, 2 auxiliary actions */}
                        <div className="mt-5 space-y-2">
                          {/* Play Action */}
                          <Button 
                            variant="primary" 
                            onClick={() => {
                              setState(s => ({ ...s, workout: stats.program, workoutMember: selectedProfile }));
                            }} 
                            className="!py-3.5 !text-xs w-full !rounded-2xl shadow-md font-black uppercase tracking-wider flex items-center justify-center gap-2 text-zinc-900 !bg-emerald-500 hover:!bg-emerald-600 border-none select-none cursor-pointer"
                          >
                            <PlayCircleIcon size={16} />
                            LANCER SÉANCE COACHING
                          </Button>

                          {/* Auxiliary controls */}
                          <div className="flex gap-2">
                            {/* Aperçu */}
                            <button 
                              type="button"
                              onClick={() => setState({...state, viewingProg: stats.program})} 
                              className="flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-800 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <EyeIcon size={12} />
                              Aperçu du plan
                            </button>

                            {/* Gérer (Saves space by bundling edit/ai/assign and whatsapp) */}
                            <button 
                              type="button"
                              onClick={() => setShowProgramOptions(!showProgramOptions)} 
                              className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest border rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                showProgramOptions 
                                  ? 'bg-zinc-900 border-zinc-900 text-white shadow-inner' 
                                  : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-800'
                              }`}
                            >
                              <SettingsIcon size={12} />
                              {showProgramOptions ? 'Masquer Options' : 'Options & Gérer'}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Program Actions (Clean grid, extremely professional) */}
                        {showProgramOptions && (
                          <div className="mt-4 pt-4 border-t border-zinc-105 grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 duration-200">
                            <button
                              type="button"
                              onClick={() => {
                                setShowAssignProgramTemplateModal(true);
                                setShowProgramOptions(false);
                              }}
                              className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-50 hover:bg-emerald-500/10 border border-zinc-150 text-left transition-all hover:border-emerald-500/20 cursor-pointer group"
                            >
                              <PlusIcon size={14} className="text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
                              <div>
                                <div className="text-[9px] font-black uppercase text-zinc-900 tracking-wider">Assigner Modèle</div>
                                <div className="text-[7px] text-zinc-400 font-bold uppercase mt-0.5">Importer de la base</div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                openAIGeneratorModal();
                                setShowProgramOptions(false);
                              }}
                              disabled={isGeneratingProgram}
                              className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-50 hover:bg-amber-500/10 border border-zinc-150 text-left transition-all hover:border-amber-500/20 cursor-pointer group disabled:opacity-50"
                            >
                              <SparklesIcon size={14} className="text-amber-500 shrink-0 group-hover:scale-110 transition-transform" />
                              <div>
                                <div className="text-[9px] font-black uppercase text-zinc-900 tracking-wider">Générer via IA</div>
                                <div className="text-[7px] text-zinc-400 font-bold uppercase mt-0.5">Moteur Velatra AI</div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                handleEditProgram(selectedProfile);
                                setShowProgramOptions(false);
                              }}
                              className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-50 hover:bg-indigo-500/10 border border-zinc-150 text-left transition-all hover:border-indigo-500/20 cursor-pointer group"
                            >
                              <LayersIcon size={14} className="text-indigo-500 shrink-0 group-hover:scale-110 transition-transform" />
                              <div>
                                <div className="text-[9px] font-black uppercase text-zinc-900 tracking-wider">Créer/Modifier Ext.</div>
                                <div className="text-[7px] text-zinc-400 font-bold uppercase mt-0.5">Éditeur à la carte</div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setShowProgramOptions(false);
                                if (!selectedProfile.phone) return showToast("Adhérent sans numéro de téléphone", "error");
                                const text = encodeURIComponent(`Salut ${selectedProfile.name} ! Ton nouveau programme ${stats.program?.name} est disponible sur l'application. Bon entraînement ! 💪`);
                                window.open(`https://wa.me/${selectedProfile.phone.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
                              }}
                              className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-50 hover:bg-teal-500/10 border border-zinc-150 text-left transition-all hover:border-teal-500/20 cursor-pointer group"
                            >
                              <PhoneIcon size={14} className="text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
                              <div>
                                <div className="text-[9px] font-black uppercase text-zinc-900 tracking-wider">Alerte WhatsApp</div>
                                <div className="text-[7px] text-zinc-400 font-bold uppercase mt-0.5">Partagé avec l'athlète</div>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white border border-dashed border-zinc-200 rounded-3xl p-6 text-center shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 mx-auto mb-3 border border-zinc-100">
                          <DumbbellIcon size={20} />
                        </div>
                        <h4 className="font-extrabold text-zinc-900 text-sm uppercase tracking-wider mb-1">Aucun cycle en cours</h4>
                        <p className="text-[11px] text-zinc-500 max-w-xs mx-auto mb-5 leading-normal">
                          Planifiez le parcours d'entraînement pour cet athlète en créant son programme.
                        </p>

                        <div className="grid grid-cols-3 gap-2">
                          <button 
                            type="button"
                            onClick={() => handleEditProgram(selectedProfile)} 
                            className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 transition-all text-center cursor-pointer group"
                          >
                            <LayersIcon size={14} className="text-zinc-600 mb-1.5 group-hover:scale-110 transition-transform" />
                            <span className="text-[8px] font-black uppercase tracking-wider text-zinc-700 leading-tight">À la carte</span>
                            <span className="text-[7px] text-zinc-400 font-extrabold uppercase mt-0.5">Créer</span>
                          </button>

                          <button 
                            type="button"
                            onClick={openAIGeneratorModal} 
                            disabled={isGeneratingProgram} 
                            className={`flex flex-col items-center justify-center p-3 rounded-xl bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 hover:from-emerald-500/15 hover:to-emerald-600/15 border border-emerald-500/10 hover:border-emerald-500/20 transition-all text-center cursor-pointer group ${isGeneratingProgram ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <SparklesIcon size={14} className="text-emerald-500 mb-1.5 group-hover:scale-110 transition-transform" />
                            <span className="text-[8px] font-black uppercase tracking-wider text-emerald-600 leading-tight">Moteur IA</span>
                            <span className="text-[7px] text-emerald-400 font-extrabold uppercase mt-0.5">Générer</span>
                          </button>

                          <button 
                            type="button"
                            onClick={() => setShowAssignProgramTemplateModal(true)} 
                            className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 transition-all text-center cursor-pointer group"
                          >
                            <PlusIcon size={14} className="text-zinc-600 mb-1.5 group-hover:scale-110 transition-transform" />
                            <span className="text-[8px] font-black uppercase tracking-wider text-zinc-700 leading-tight">Modèle</span>
                            <span className="text-[7px] text-zinc-400 font-extrabold uppercase mt-0.5">Importer</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><CalendarIcon size={24} /></div>
                       <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">Historique des Séances</h3>
                    </div>
                    
                      <div className="bg-zinc-50 border border-zinc-200 rounded-[40px] p-8 shadow-sm">
                        {(() => {
                          const allLogs = (state.logs || []).filter(log => log.memberId === Number(selectedProfile.id)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                          if (allLogs.length === 0) {
                            return (
                              <div className="text-center py-8 text-zinc-500 text-sm italic">
                                Aucune séance enregistrée pour ce membre.
                              </div>
                            );
                          }
                          return (
                          <div className="space-y-4">
                            {allLogs.slice(0, visibleCoachingLogs).map(log => {
                              const isAutonomous = !log.isCoaching;
                              const colorTheme = isAutonomous ? 'blue' : 'emerald';
                              const bgColorClass = isAutonomous ? 'bg-blue-50 border-blue-200' : 'bg-emerald-50 border-emerald-200';
                              const labelColors = isAutonomous ? 'bg-blue-500/20 text-blue-600' : 'bg-emerald-500/20 text-emerald-600';
                              
                              return (
                                <div key={log.id} className={`flex flex-col gap-3 p-4 backdrop-blur-xl border rounded-2xl shadow-sm ${bgColorClass}`}>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-sm font-bold text-zinc-900">{new Date(log.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                                        {isAutonomous ? 'Séance en Autonomie' : 'Séance Coaching'} • {log.dayName || 'Jour libre'} • Semaine {log.week}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase text-zinc-500 tracking-wider ${labelColors}`}>
                                        Terminée
                                      </span>
                                      <Button variant="secondary" className="!py-1 !px-2 !text-[10px] !rounded-lg bg-white/50 hover:bg-white" onClick={() => setSelectedLog(log)}>
                                        VOIR RÉCAP
                                      </Button>
                                    </div>
                                  </div>
                                  {log.notes && (
                                    <div className="mt-2 p-3 bg-white/50 rounded-lg border border-black/5">
                                      <div className="flex items-start gap-2">
                                        <MessageCircleIcon size={14} className={`mt-0.5 shrink-0 text-${colorTheme}-500`} />
                                        <p className="text-xs text-zinc-600 leading-relaxed italic line-clamp-2">"{log.notes}"</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {allLogs.length > visibleCoachingLogs && (
                              <Button variant="secondary" fullWidth onClick={() => setVisibleCoachingLogs(prev => prev + 5)} className="!mt-4 !py-3 !text-[10px] !rounded-xl">
                                VOIR PLUS DE SÉANCES
                              </Button>
                            )}
                          </div>
                          );
                        })()}
                      </div>
                  </section>
                  )}

                  {memberTab === 'profile' && (
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
                  )}

                  {memberTab === 'training' && (
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
                        <div className="col-span-full py-12 text-center bg-zinc-50 backdrop-blur-xl border border-dashed  rounded-[32px] text-[10px] uppercase font-black text-zinc-500 tracking-widest italic shadow-sm">Aucun PR enregistré</div>
                      )}
                    </div>
                  </section>
                  )}

                  {memberTab === 'profile' && (
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
                                <span className="text-[10px] text-zinc-900 font-black uppercase tracking-widest">Scan effectué en club</span>
                                <button onClick={() => handleDeleteScan(b.id)} className="text-[10px] text-red-500/40 hover:text-red-500 font-black uppercase tracking-widest transition-colors opacity-0 group-hover:opacity-100">Supprimer</button>
                              </div>
                            </div>
                            <div className="flex gap-10">
                               <div className="text-center group-hover:scale-110 transition-transform">
                                  <div className="text-[10px] font-black uppercase text-zinc-900 tracking-widest mb-1">POIDS</div>
                                  <div className="text-xl font-black text-zinc-900">{b.weight}<span className="text-xs ml-0.5 opacity-50">KG</span></div>
                               </div>
                               <div className="text-center group-hover:scale-110 transition-transform">
                                  <div className="text-[10px] font-black uppercase text-zinc-900 tracking-widest mb-1">GRAS</div>
                                  <div className="text-xl font-black text-emerald-500">{b.fat}<span className="text-xs ml-0.5 opacity-50">%</span></div>
                               </div>
                               <div className="text-center group-hover:scale-110 transition-transform">
                                  <div className="text-[10px] font-black uppercase text-zinc-900 tracking-widest mb-1">MUSCLE</div>
                                  <div className="text-xl font-black text-emerald-500">{b.muscle}<span className="text-xs ml-0.5 opacity-50">KG</span></div>
                               </div>
                            </div>
                         </div>
                       )) : (
                         <div className="py-12 text-center bg-zinc-50 backdrop-blur-xl border border-dashed  rounded-[32px] text-[10px] uppercase font-black text-zinc-500 tracking-widest italic shadow-sm">Aucun historique biométrique</div>
                       )}
                    </div>
                  </section>
                  )}
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
            className="w-full max-w-2xl"
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
                    <span className="text-white text-xs font-medium uppercase tracking-wider">Photo</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file && selectedProfile) {
                          try {
                            showToast("Téléchargement de la photo...", "success");
                            if (!selectedProfile.firebaseUid) throw new Error('Le compte adhérent n’est pas relié à une identité Firebase.');
                            const storage = await getStorageClient();
                            const avatarRef = ref(storage, `avatars/${selectedProfile.firebaseUid}/${Date.now()}`);
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
                  <label className="text-xs font-black uppercase text-zinc-500 text-zinc-500 tracking-widest ml-1">Nom Complet</label>
                  <Input 
                    value={editInfoData.name}
                    onChange={e => setEditInfoData({...editInfoData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-zinc-500 text-zinc-500 tracking-widest ml-1">Genre</label>
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
                  <label className="text-xs font-black uppercase text-zinc-500 text-zinc-500 tracking-widest ml-1">Âge</label>
                  <Input 
                    type="number"
                    value={editInfoData.age || ''}
                    onChange={e => setEditInfoData({...editInfoData, age: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-zinc-500 text-zinc-500 tracking-widest ml-1">Date de naissance</label>
                  <Input 
                    type="date"
                    value={editInfoData.birthDate || ''}
                    onChange={e => setEditInfoData({...editInfoData, birthDate: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-zinc-500 text-zinc-500 tracking-widest ml-1">Poids (kg)</label>
                  <Input 
                    type="number"
                    value={editInfoData.weight || ''}
                    onChange={e => setEditInfoData({...editInfoData, weight: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-zinc-500 text-zinc-500 tracking-widest ml-1">Taille (cm)</label>
                  <Input 
                    type="number"
                    value={editInfoData.height || ''}
                    onChange={e => setEditInfoData({...editInfoData, height: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              {(state.user?.role === 'owner' || state.user?.role === 'superadmin') && (
                <div className="space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <label className="text-xs font-black uppercase text-zinc-500 tracking-widest">Coach responsable</label>
                  <div className="flex gap-2">
                    <select
                      className="min-w-0 flex-1 bg-white border border-zinc-200 rounded-xl p-3 text-sm text-zinc-900 focus:border-emerald-500 outline-none"
                      value={coachAssignment}
                      onChange={event => setCoachAssignment(event.target.value)}
                    >
                      <option value="">Aucun coach affecté</option>
                      {state.users.filter(user => user.role === 'coach').map(coach => (
                        <option key={coach.firebaseUid} value={coach.firebaseUid}>{coach.name}</option>
                      ))}
                    </select>
                    <Button variant="secondary" onClick={handleAssignCoach} disabled={isSavingCoachAssignment}>
                      {isSavingCoachAssignment ? 'Enregistrement…' : 'Affecter'}
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-500">Seul le propriétaire et le coach affecté pourront consulter les programmes et le suivi de cet adhérent.</p>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-zinc-500 text-zinc-500 tracking-widest ml-1">Objectifs</label>
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase text-zinc-500 transition-all border ${isSelected ? 'bg-emerald-500 border-emerald-500 text-zinc-900' : 'bg-zinc-50 backdrop-blur-xl  text-zinc-900 hover:border-emerald-500/50 shadow-sm'}`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-zinc-500 text-zinc-500 tracking-widest ml-1">Notes d'Inscription</label>
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
            <div className="pt-2 shrink-0 flex flex-col gap-2">
              <Button 
                variant="secondary" 
                fullWidth 
                onClick={handleResetMemberPassword} 
                className="!bg-blue-500/10 !text-blue-600 hover:!bg-blue-500/20"
              >
                RÉINITIALISER LE MOT DE PASSE
              </Button>
              <Button 
                variant="secondary" 
                fullWidth 
                onClick={handleTogglePauseMember} 
                className={selectedProfile?.status === 'paused' ? "!bg-emerald-500/10 !text-emerald-600 hover:!bg-emerald-500/20" : "!bg-orange-500/10 !text-orange-600 hover:!bg-orange-500/20"}
              >
                {selectedProfile?.status === 'paused' ? "RÉACTIVER LE PROFIL" : "METTRE EN PAUSE"}
              </Button>
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
            className="w-full max-w-xl"
          >
            <Card className="w-full !p-8 bg-zinc-100 backdrop-blur-xl  relative shadow-2xl">
              <button onClick={() => setIsAdjustingTargets(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-zinc-900 bg-zinc-50 backdrop-blur-xl border border-zinc-200 p-2 rounded-full transition-colors shadow-sm">
                <XIcon size={20} />
              </button>
              
              <h2 className="text-2xl font-black mb-1 text-zinc-900 uppercase italic">Cibles Nutritionnelles</h2>
              <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mb-8">Ajuster avant génération</p>

            <div className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-zinc-500 text-zinc-500 tracking-widest ml-1">Calories Totales (kcal)</label>
                <Input 
                  type="number"
                  value={nutritionTargets.calories || ''}
                  onChange={e => setNutritionTargets({...nutritionTargets, calories: parseInt(e.target.value) || 0})}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-zinc-500 text-zinc-500 tracking-widest ml-1">Protéines (g)</label>
                  <Input 
                    type="number"
                    value={nutritionTargets.protein || ''}
                    onChange={e => setNutritionTargets({...nutritionTargets, protein: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-zinc-500 text-zinc-500 tracking-widest ml-1">Glucides (g)</label>
                  <Input 
                    type="number"
                    value={nutritionTargets.carbs || ''}
                    onChange={e => setNutritionTargets({...nutritionTargets, carbs: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-zinc-500 text-zinc-500 tracking-widest ml-1">Lipides (g)</label>
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
            className="w-full max-w-2xl"
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
                  <label className="text-xs font-black uppercase text-zinc-500 text-zinc-500 tracking-widest ml-1">Nom Complet</label>
                  <Input 
                    value={newMemberData.name}
                    onChange={e => setNewMemberData({...newMemberData, name: e.target.value})}
                    placeholder="Jean Dupont"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-zinc-500 text-zinc-500 tracking-widest ml-1">Email</label>
                  <Input 
                    type="email"
                    value={newMemberData.email}
                    onChange={e => setNewMemberData({...newMemberData, email: e.target.value})}
                    placeholder="jean@email.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-zinc-500 text-zinc-500 tracking-widest ml-1">Mot de passe provisoire</label>
                <Input 
                  type="text"
                  value={newMemberData.password}
                  onChange={e => setNewMemberData({...newMemberData, password: e.target.value})}
                  placeholder="Ex: password2026"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-zinc-500 tracking-widest ml-1">Date de naissance</label>
                <Input 
                  type="date"
                  value={newMemberData.birthDate || ''}
                  onChange={e => setNewMemberData({...newMemberData, birthDate: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-zinc-500 text-zinc-500 tracking-widest ml-1">Poids (kg)</label>
                  <Input 
                    type="number"
                    value={newMemberData.weight || ''}
                    onChange={e => setNewMemberData({...newMemberData, weight: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-zinc-500 text-zinc-500 tracking-widest ml-1">Taille (cm)</label>
                  <Input 
                    type="number"
                    value={newMemberData.height || ''}
                    onChange={e => setNewMemberData({...newMemberData, height: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-zinc-500 text-zinc-500 tracking-widest ml-1">Expérience</label>
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
                  <label className="text-xs font-black uppercase text-zinc-500 text-zinc-500 tracking-widest ml-1">Équipement</label>
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
                  <label className="text-xs font-black uppercase text-zinc-500 text-zinc-500 tracking-widest ml-1">Jours / Semaine</label>
                  <Input 
                    type="number" min="1" max="7"
                    value={newMemberData.trainingDays || ''}
                    onChange={e => setNewMemberData({...newMemberData, trainingDays: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-zinc-500 text-zinc-500 tracking-widest ml-1">Durée (min)</label>
                  <Input 
                    type="number" step="15"
                    value={newMemberData.sessionDuration || ''}
                    onChange={e => setNewMemberData({...newMemberData, sessionDuration: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-zinc-500 text-zinc-500 tracking-widest ml-1">Blessures / Douleurs</label>
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
            className="w-full max-w-[1450px] bg-zinc-100 backdrop-blur-2xl min-h-screen md:min-h-0 md:rounded-[48px] border border-emerald-500/20 shadow-[0_0_100px_rgba(16,185,129,0.1)] relative overflow-hidden my-0 md:my-8 p-8 md:p-12"
          >
            <button onClick={() => setNutritionPlan(null)} className="fixed top-4 right-4 md:top-10 md:right-10 p-4 bg-zinc-100 backdrop-blur-md rounded-full text-zinc-500 hover:text-zinc-900 z-[800] border border-zinc-200 hover:bg-red-50 hover:border-red-200 transition-all shadow-xl"><XIcon size={24} /></button>
            
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl text-zinc-900 shadow-[0_0_20px_rgba(16,185,129,0.4)]"><CheckIcon size={24} /></div>
                  <div>
                    <h2 className="text-3xl font-black text-zinc-900 uppercase italic tracking-tight">Plan Nutritionnel</h2>
                    <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">
                      {nutritionPlan.aiGenerated ? "Généré par Velatra AI Engine" : "Plan Actif de l'adhérent"}
                    </p>
                  </div>
               </div>
               <Button 
                 variant="secondary" 
                 onClick={() => {
                   setNewNutritionTemplateName(`Modèle ${selectedProfile?.name?.split(' ')[0] || ''} - ${nutritionPlan.targetCalories}kcal`);
                   setShowSaveNutritionTemplateModal(true);
                 }} 
                 className="!py-3 !text-[11px] !rounded-xl !bg-emerald-500/10 hover:!bg-emerald-500/20 !text-emerald-600 border border-emerald-500/30 whitespace-nowrap self-start md:self-auto font-black italic tracking-wider"
               >
                 <SaveIcon size={14} className="mr-2 inline" /> SAUVEGARDER COMME MODÈLE
               </Button>
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

      {showOnboardingEmailModal && selectedProfile && createPortal(
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-50 rounded-3xl p-8 max-w-xl w-full shadow-2xl border"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-black text-zinc-900 uppercase italic tracking-tight">Envoyer Contrat & Paiement</h3>
                <p className="text-sm text-zinc-500">À : {selectedProfile.email}</p>
              </div>
              <button onClick={() => setShowOnboardingEmailModal(false)} className="p-2 bg-zinc-100 rounded-full hover:bg-zinc-200 text-zinc-500 transition-colors">
                <XIcon size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-indigo-500/10 text-indigo-600 p-4 rounded-2xl text-[10px] flex items-start gap-2 border border-indigo-500/20">
                <InfoIcon size={14} className="shrink-0 mt-0.5" />
                <p>Un email automatique sera envoyé au membre avec les liens ci-dessous pour finaliser son inscription.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 ml-1">Lien de paiement (Stripe)</label>
                <Input 
                  type="url" 
                  placeholder="https://buy.stripe.com/..." 
                  value={onboardingEmailData.paymentLink} 
                  onChange={e => setOnboardingEmailData({...onboardingEmailData, paymentLink: e.target.value})} 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 ml-1">Lien du contrat (DocuSign, Yousign...)</label>
                <Input 
                  type="url" 
                  placeholder="https://..." 
                  value={onboardingEmailData.contractLink} 
                  onChange={e => setOnboardingEmailData({...onboardingEmailData, contractLink: e.target.value})} 
                />
              </div>

              <div className="pt-4 flex gap-3">
                <Button variant="secondary" fullWidth onClick={() => setShowOnboardingEmailModal(false)}>Annuler</Button>
                <Button 
                  variant="primary" 
                  fullWidth 
                  onClick={handleSendOnboardingEmail}
                  disabled={isSendingOnboardingEmail || !onboardingEmailData.paymentLink || !onboardingEmailData.contractLink}
                  className="bg-indigo-500 hover:bg-indigo-600 border-indigo-500 text-white"
                >
                  {isSendingOnboardingEmail ? "ENVOI..." : "ENVOYER L'EMAIL"}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {showNutritionLog && selectedProfile && createPortal(
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setShowNutritionLog(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-100 rounded-3xl p-6 max-w-6xl w-full shadow-2xl max-h-[90vh] overflow-y-auto border "
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
            className="bg-zinc-100 rounded-3xl p-6 max-w-2xl w-full shadow-2xl border "
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
                <div className="text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 mb-2">Séance</div>
                <div className="font-bold text-zinc-900">{selectedLog.dayName}</div>
                <div className="text-sm text-zinc-500">Semaine {selectedLog.week}</div>
              </div>

              {selectedLog.exercises && selectedLog.exercises.length > 0 && (
                <div>
                  <div className="text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 mb-2">Exercices réalisés</div>
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
                  <div className="text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 mb-2">Notes du Coach</div>
                  <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                    <p className="text-sm text-zinc-600 leading-relaxed italic">"{selectedLog.notes}"</p>
                  </div>
                </div>
              )}

              {selectedLog.rpe && (
                <div>
                  <div className="text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 mb-2">Difficulté ressentie (RPE)</div>
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
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

      <AnimatePresence>
        {selectedEvolutionPhoto && createPortal(
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedEvolutionPhoto(null)}
          >
            <button 
              className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
              onClick={() => setSelectedEvolutionPhoto(null)}
            >
              <XIcon size={32} />
            </button>
            <img src={selectedEvolutionPhoto} alt="Evolution" className="max-w-full max-h-full object-contain rounded-lg" />
          </motion.div>,
          document.body
        )}
      </AnimatePresence>

      {/* AI GENERATOR MODAL */}
      {isAIGeneratorModalOpen && selectedProfile && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="text-lg font-black text-zinc-900 uppercase italic flex items-center gap-2">
                <BotIcon size={20} className="text-emerald-500" /> Paramètres IA
              </h3>
              <button onClick={() => setIsAIGeneratorModalOpen(false)} className="text-zinc-400 hover:text-zinc-900">
                <XIcon size={20} />
              </button>
            </div>
            
            <div className="space-y-4 relative z-10">
              <div>
                <label className="block text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 mb-1 ml-1">Jours d'entraînement / sem</label>
                <Input type="number" min="1" max="7" value={aiGeneratorParams.nbDays} onChange={(e) => setAiGeneratorParams({...aiGeneratorParams, nbDays: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 mb-1 ml-1">Objectifs (séparés par des virgules)</label>
                <Input type="text" value={aiGeneratorParams.goals} onChange={(e) => setAiGeneratorParams({...aiGeneratorParams, goals: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 mb-1 ml-1">Intensité de la programmation</label>
                <select 
                  className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm rounded-xl px-4 py-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                  value={aiGeneratorParams.intensity} 
                  onChange={(e) => setAiGeneratorParams({...aiGeneratorParams, intensity: e.target.value})}
                >
                  <option value="Normal">Normale (Séries classiques)</option>
                  <option value="Supersets / Bisets (Haute densité)">Supersets / Bisets (Haute densité)</option>
                  <option value="Trisets / Giant sets (Intensité extrême)">Trisets / Giant sets (Intensité extrême)</option>
                  <option value="Dropsets / Rest-pause (Hypertrophie max)">Dropsets / Rest-pause (Hypertrophie max)</option>
                  <option value="Force (Temps de repos longs)">Force (Temps de repos longs)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 mb-1 ml-1">Instructions supplémentaires</label>
                <textarea 
                  placeholder="Ex: Éviter les mouvements avec haltères lourds, accent sur les fessiers..."
                  className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm rounded-xl px-4 py-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium min-h-[80px]"
                  value={aiGeneratorParams.extraNotes}
                  onChange={(e) => setAiGeneratorParams({...aiGeneratorParams, extraNotes: e.target.value})}
                />
              </div>

              <div className="pt-2">
                <label className="block text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 mb-2 ml-1">Options supplémentaires</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${aiGeneratorParams.includeWarmup ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100'}`}>
                    <input type="checkbox" className="hidden" checked={aiGeneratorParams.includeWarmup} onChange={(e) => setAiGeneratorParams({...aiGeneratorParams, includeWarmup: e.target.checked})} />
                    <div className={`w-4 h-4 rounded shadow-sm border flex shrink-0 items-center justify-center transition-all ${aiGeneratorParams.includeWarmup ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-zinc-300'}`}>
                      {aiGeneratorParams.includeWarmup && <CheckIcon size={12} className="text-white" />}
                    </div>
                    <span className="text-[9px] font-bold text-zinc-900 uppercase">Échauffement / Mobilité</span>
                  </label>
                  
                  <label className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${aiGeneratorParams.includeCardioFinisher ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100'}`}>
                    <input type="checkbox" className="hidden" checked={aiGeneratorParams.includeCardioFinisher} onChange={(e) => setAiGeneratorParams({...aiGeneratorParams, includeCardioFinisher: e.target.checked})} />
                    <div className={`w-4 h-4 rounded shadow-sm border flex shrink-0 items-center justify-center transition-all ${aiGeneratorParams.includeCardioFinisher ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-zinc-300'}`}>
                      {aiGeneratorParams.includeCardioFinisher && <CheckIcon size={12} className="text-white" />}
                    </div>
                    <span className="text-[9px] font-bold text-zinc-900 uppercase">Finisher Cardio</span>
                  </label>
                  
                  <label className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${aiGeneratorParams.includeCoreFocus ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100'}`}>
                    <input type="checkbox" className="hidden" checked={aiGeneratorParams.includeCoreFocus} onChange={(e) => setAiGeneratorParams({...aiGeneratorParams, includeCoreFocus: e.target.checked})} />
                    <div className={`w-4 h-4 rounded shadow-sm border flex shrink-0 items-center justify-center transition-all ${aiGeneratorParams.includeCoreFocus ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-zinc-300'}`}>
                      {aiGeneratorParams.includeCoreFocus && <CheckIcon size={12} className="text-white" />}
                    </div>
                    <span className="text-[9px] font-bold text-zinc-900 uppercase">Focus Abdos</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 mb-1 ml-1">Durée cible de la séance</label>
                <select 
                  className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm rounded-xl px-4 py-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                  value={aiGeneratorParams.timeConstraint} 
                  onChange={(e) => setAiGeneratorParams({...aiGeneratorParams, timeConstraint: e.target.value})}
                >
                  <option value="">Celle du profil ({selectedProfile.sessionDuration || 60}m)</option>
                  <option value="30">-30 min (Séance Flash)</option>
                  <option value="45">-45 min (Express)</option>
                  <option value="60">~60 min (Classique)</option>
                  <option value="90">+90 min (Volume important / Force)</option>
                </select>
              </div>
              
              <Button variant="primary" fullWidth onClick={handleGenerateProgram} className="!py-4 !mt-6 shadow-xl shadow-emerald-500/20 text-xs">
                <SparklesIcon size={16} className="mr-2 inline" /> LANCER LA GÉNÉRATION
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CSV IMPORT MODAL */}
      {isCsvImportModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-4xl shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black text-zinc-900 uppercase italic">Importer des clients</h3>
                <p className="text-xs text-zinc-500 font-medium">L'IA a extrait ces informations de votre fichier.</p>
              </div>
              <button 
                onClick={() => !isImportingClients && setIsCsvImportModalOpen(false)} 
                className={`text-zinc-400 hover:text-zinc-900 ${isImportingClients ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isImportingClients}
              >
                <XIcon size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-2 mb-6">
              {!isConfirmingImport ? (
                <>
                  {parsedClients.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-zinc-50 p-3 rounded-xl border border-zinc-200 sticky top-0 z-10 gap-3">
                        <div className="flex-1 w-full relative">
                          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <input 
                            className="w-full bg-white border border-zinc-200 rounded-lg pl-9 pr-3 py-2 text-xs font-medium focus:border-emerald-500 outline-none"
                            placeholder="Rechercher par nom ou email..."
                            value={importSearch}
                            onChange={(e) => setImportSearch(e.target.value)}
                          />
                        </div>
                        <div className="flex justify-between items-center w-full sm:w-auto gap-4">
                          <span className="text-xs font-black uppercase text-zinc-500 text-zinc-500 tracking-widest shrink-0">
                            ({selectedClientsToImport.length}/{parsedClients.length})
                          </span>
                          <button 
                            onClick={() => {
                              if (selectedClientsToImport.length === parsedClients.length) {
                                setSelectedClientsToImport([]);
                              } else {
                                setSelectedClientsToImport(parsedClients.map((_, i) => i));
                              }
                            }}
                            className="text-[10px] font-bold text-emerald-500 hover:text-emerald-600 underline uppercase shrink-0"
                          >
                            {selectedClientsToImport.length === parsedClients.length ? 'Tout décocher' : 'Tout cocher'}
                          </button>
                        </div>
                      </div>
                      
                      {parsedClients
                        .map((client, index) => ({ client, index }))
                        .filter(item => 
                          !importSearch || 
                          item.client.name?.toLowerCase().includes(importSearch.toLowerCase()) || 
                          item.client.email?.toLowerCase().includes(importSearch.toLowerCase())
                        )
                        .slice(0, 100).map(({ client, index }) => {
                        const isSelected = selectedClientsToImport.includes(index);
                        const hasEmail = !!client.email;
                        
                        return (
                          <div 
                            key={index} 
                            className={`p-4 rounded-2xl border transition-all flex items-start gap-4 ${isSelected ? 'border-emerald-500 bg-emerald-500/5' : 'border-zinc-200 bg-white opacity-60'} ${!hasEmail ? 'opacity-50 border-red-200 bg-red-50' : 'cursor-pointer hover:border-emerald-500/40'}`}
                            onClick={() => {
                              if (!hasEmail) return;
                              setSelectedClientsToImport(prev => 
                                prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
                              );
                            }}
                          >
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 shrink-0 transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-300'}`}>
                              {isSelected && <CheckIcon size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-zinc-900 truncate">{client.name || 'Nom inconnu'}</span>
                                {client.gender && <span className="text-[10px] px-2 py-0.5 bg-zinc-100 rounded-lg text-zinc-500 font-bold uppercase">{client.gender}</span>}
                              </div>
                              <div className={`text-xs ${hasEmail ? 'text-zinc-500 truncate' : 'text-red-500 font-bold'}`}>
                                {hasEmail ? client.email : '⚠️ Email manquant - Import impossible'}
                              </div>
                              
                              {(client.age || client.weight || client.height || client.phone || client.address || (client.objectifs && client.objectifs.length > 0)) && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {client.age && <Badge variant="dark" className="!bg-zinc-100 !text-zinc-500 !border-none !text-[9px]">{client.birthDate ? `${client.birthDate} ` : ''}({client.age} ans)</Badge>}
                                  {client.phone && <Badge variant="dark" className="!bg-zinc-100 !text-zinc-500 !border-none !text-[9px]">📞 {client.phone}</Badge>}
                                  {client.address && <Badge variant="dark" className="!bg-zinc-100 !text-zinc-500 !border-none !text-[9px] max-w-[200px] truncate">🏠 {client.address}</Badge>}
                                  {client.weight && <Badge variant="dark" className="!bg-zinc-100 !text-zinc-500 !border-none !text-[9px]">{client.weight} kg</Badge>}
                                  {client.height && <Badge variant="dark" className="!bg-zinc-100 !text-zinc-500 !border-none !text-[9px]">{client.height} cm</Badge>}
                                  {(client.objectifs || []).map((o: string, idx: number) => (
                                    <Badge key={idx} variant="orange" className="!text-[9px]">{o}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      
                      {parsedClients.length > 100 && (
                        <div className="p-4 text-center rounded-2xl border border-zinc-200 bg-zinc-50">
                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                            + {parsedClients.length - 100} autres clients masqués pour la fluidité (mais bien sélectionnés pour l'import)
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 mb-4 animate-pulse">
                        <SparklesIcon size={24} className="text-zinc-400" />
                      </div>
                      <h4 className="text-lg font-bold text-zinc-900">Analyse IA en cours...</h4>
                      <p className="text-sm text-zinc-500 mt-2">Nous lisons votre fichier pour identifier les clients.</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                    <p className="text-sm font-medium">Vous êtes sur le point de créer un compte et d'envoyer un email de configuration de mot de passe aux {selectedClientsToImport.length} membres ci-dessous :</p>
                  </div>
                  <div className="space-y-2">
                    {selectedClientsToImport.map(index => {
                      const client = parsedClients[index];
                      return (
                        <div key={index} className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 bg-white">
                          <span className="font-bold text-sm text-zinc-900">{client.name}</span>
                          <span className="text-xs text-zinc-500">{client.email}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {parsedClients.length > 0 && !isConfirmingImport && (
              <div className="pt-4 border-t border-zinc-100 shrink-0">
                <Button 
                  variant="primary" 
                  fullWidth 
                  onClick={() => setIsConfirmingImport(true)}
                  disabled={selectedClientsToImport.length === 0}
                  className="!py-4 shadow-xl"
                >
                  SUIVANT ({selectedClientsToImport.length} SÉLECTIONNÉS)
                </Button>
              </div>
            )}

            {isConfirmingImport && (
              <div className="pt-4 border-t border-zinc-100 shrink-0 flex gap-3">
                <Button 
                  variant="secondary" 
                  onClick={() => setIsConfirmingImport(false)}
                  disabled={isImportingClients}
                  className="!py-4"
                >
                  RETOUR
                </Button>
                <Button 
                  variant="success" 
                  className="flex-1 !py-4 shadow-xl" 
                  onClick={handleImportSelectedClients}
                  disabled={isImportingClients}
                >
                  {isImportingClients 
                    ? `IMPORTATION EN COURS...` 
                    : `VALIDER ET ENVOYER LES EMAILS`}
                </Button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* MODAL ASSIGNATION DE PROGRAMME DE SEANCE */}
      {showAssignProgramTemplateModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            
            <div className="flex justify-between items-center mb-6 relative z-10">
              <div>
                <h3 className="text-xl font-black text-zinc-900 uppercase italic flex items-center gap-2">
                  <LayersIcon size={20} className="text-emerald-500" /> Modèles de programmes
                </h3>
                <p className="text-xs text-zinc-500 font-medium mt-1">Assignez un programme type en 1 clic à cet adhérent.</p>
              </div>
              <button onClick={() => { setShowAssignProgramTemplateModal(false); setProgramPresetSearch(''); }} className="text-zinc-400 hover:text-zinc-900 p-1 hover:bg-zinc-100 rounded-lg transition-colors">
                <XIcon size={20} />
              </button>
            </div>

            {/* Barre de Recherche */}
            <div className="relative mb-4 z-10">
              <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text"
                placeholder="Rechercher un modèle d'entraînement (Split, Full-Body, Force...)"
                value={programPresetSearch}
                onChange={(e) => setProgramPresetSearch(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs rounded-xl pl-10 pr-4 py-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-bold"
              />
            </div>

            {/* Liste scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-1 space-y-3 z-10 pb-4">
              {state.presets && state.presets.filter(p => !programPresetSearch || p.name.toLowerCase().includes(programPresetSearch.toLowerCase()) || (p.remarks || '').toLowerCase().includes(programPresetSearch.toLowerCase())).length > 0 ? (
                state.presets.filter(p => !programPresetSearch || p.name.toLowerCase().includes(programPresetSearch.toLowerCase()) || (p.remarks || '').toLowerCase().includes(programPresetSearch.toLowerCase())).map((preset) => (
                  <div key={preset.id} className="p-4 rounded-2xl border border-zinc-200 bg-white hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="font-extrabold text-sm text-zinc-900 uppercase tracking-tight">{preset.name}</span>
                        <Badge variant="dark" className="!bg-zinc-100 !text-zinc-600 !border-none !text-[9px] font-black">{preset.nbDays} j/sem</Badge>
                        {preset.durationWeeks && <Badge variant="dark" className="!bg-zinc-100 !text-zinc-600 !border-none !text-[9px] font-black">{preset.durationWeeks} semaines</Badge>}
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed font-medium mb-2">{preset.remarks || "Aucune description fournie"}</p>
                      
                      {preset.objectifs && preset.objectifs.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {preset.objectifs.map((objecti, idx) => (
                            <Badge key={idx} variant="orange" className="!text-[9px] !px-2 py-0.5">{objecti}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button 
                      variant="success"
                      onClick={() => handleAssignProgramPreset(preset)}
                      className="!py-2.5 !px-5 !text-[10px] w-full sm:w-auto font-black shrink-0 tracking-widest uppercase italic"
                    >
                      ASSIGNER
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 border border-dashed border-zinc-200 rounded-3xl bg-zinc-50">
                  <DumbbellIcon size={32} className="mx-auto text-zinc-300 mb-3" />
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Aucun modèle de programme disponible</p>
                  <p className="text-[10px] text-zinc-400 mt-1">Créez des modèles dans la section 'Modèles de Séances'</p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL ASSIGNATION DE PROGRAMME NUTRITIONNEL */}
      {showAssignNutritionTemplateModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            
            <div className="flex justify-between items-center mb-6 relative z-10">
              <div>
                <h3 className="text-xl font-black text-zinc-900 uppercase italic flex items-center gap-2">
                  <CheckIcon size={20} className="text-emerald-500" /> Modèles nutritionnels
                </h3>
                <p className="text-xs text-zinc-500 font-medium mt-1">Choisissez un plan nutritionnel parmi les modèles existants.</p>
              </div>
              <button onClick={() => { setShowAssignNutritionTemplateModal(false); setNutritionPresetSearch(''); }} className="text-zinc-400 hover:text-zinc-900 p-1 hover:bg-zinc-100 rounded-lg transition-colors">
                <XIcon size={20} />
              </button>
            </div>

            {/* Barre de Recherche */}
            <div className="relative mb-4 z-10">
              <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text"
                placeholder="Rechercher un modèle de nutrition (Sèche, Prise de masse, Low Carb...)"
                value={nutritionPresetSearch}
                onChange={(e) => setNutritionPresetSearch(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs rounded-xl pl-10 pr-4 py-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-bold"
              />
            </div>

            {/* Liste scrollable des presets (STANDARDS + SAUVEGARDÉS) */}
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-1 space-y-3 z-10 pb-4">
              {(() => {
                const allNutritionPresets = [
                  ...STANDARD_NUTRITION_PRESETS,
                  ...(state.nutritionPresets || [])
                ];
                
                const filtered = allNutritionPresets.filter(p => 
                  !nutritionPresetSearch || 
                  p.name.toLowerCase().includes(nutritionPresetSearch.toLowerCase()) ||
                  (p.dietPreference || '').toLowerCase().includes(nutritionPresetSearch.toLowerCase()) ||
                  (p.goal || '').toLowerCase().includes(nutritionPresetSearch.toLowerCase())
                );

                if (filtered.length > 0) {
                  return filtered.map((preset, idx) => (
                    <div key={preset.id || idx} className="p-4 rounded-2xl border border-zinc-200 bg-white hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-extrabold text-sm text-zinc-900 uppercase tracking-tight">{preset.name}</span>
                          {preset.id && !preset.id.startsWith('s') ? (
                            <Badge variant="orange" className="!text-[9px] font-black uppercase">MODÈLE ENREGISTRÉ</Badge>
                          ) : (
                            <Badge variant="dark" className="!bg-zinc-100 !text-zinc-600 !border-none !text-[9px] font-black uppercase">STANDARD</Badge>
                          )}
                        </div>
                        
                        {/* Valeurs Nutritionnelles */}
                        <div className="grid grid-cols-4 gap-2 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 mb-2 max-w-sm">
                          <div className="text-center">
                            <div className="text-[10px] text-zinc-400 font-bold mb-0.5">Kcal</div>
                            <div className="text-xs font-black text-zinc-800">{preset.targetCalories}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] text-emerald-500 font-bold mb-0.5">Prot</div>
                            <div className="text-xs font-black text-emerald-600">{preset.protein}g</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] text-blue-500 font-bold mb-0.5">Gluc</div>
                            <div className="text-xs font-black text-blue-600">{preset.carbs}g</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] text-orange-500 font-bold mb-0.5">Lip</div>
                            <div className="text-xs font-black text-orange-600">{preset.fat}g</div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {preset.dietPreference && <Badge variant="dark" className="!bg-zinc-100 !text-zinc-600 !border-none !text-[9px]">{preset.dietPreference}</Badge>}
                          {preset.meals && <Badge variant="dark" className="!bg-zinc-100 !text-zinc-600 !border-none !text-[9px]">{preset.meals.length} repas</Badge>}
                          {preset.goal && <Badge variant="orange" className="!text-[9px]">{preset.goal}</Badge>}
                        </div>
                      </div>
                      <Button 
                        variant="success"
                        onClick={() => handleAssignNutritionPreset(preset)}
                        className="!py-2.5 !px-5 !text-[10px] w-full sm:w-auto font-black shrink-0 tracking-widest uppercase italic"
                      >
                        ASSIGNER
                      </Button>
                    </div>
                  ));
                } else {
                  return (
                    <div className="text-center py-10 border border-dashed border-zinc-200 rounded-3xl bg-zinc-50">
                      <CheckIcon size={32} className="mx-auto text-zinc-300 mb-3" />
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Aucun modèle nutritionnel trouvé</p>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL ENREGISTRER UN MODÈLE NUTRITIONNEL DEPUIS LE PLAN ACTUEL */}
      {showSaveNutritionTemplateModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            
            <div className="flex justify-between items-center mb-4 relative z-10">
              <h3 className="text-sm font-black text-zinc-900 uppercase italic flex items-center gap-2">
                <SaveIcon size={18} className="text-emerald-500" /> Sauvegarder comme modèle
              </h3>
              <button onClick={() => setShowSaveNutritionTemplateModal(false)} className="text-zinc-400 hover:text-zinc-900">
                <XIcon size={18} />
              </button>
            </div>
            
            <p className="text-xs text-zinc-500 mb-4 font-medium leading-relaxed">
              Enregistrez le plan de nutrition de cet adhérent pour pouvoir le réassigner facilement à d'autres membres par la suite.
            </p>

            <div className="space-y-4 relative z-10 mb-6">
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider mb-1">Nom du modèle</label>
                <Input 
                  type="text" 
                  value={newNutritionTemplateName} 
                  onChange={(e) => setNewNutritionTemplateName(e.target.value)} 
                  placeholder="Ex: Sèche Modérée 1800kcal..." 
                  className="font-bold"
                />
              </div>
            </div>

            <div className="flex gap-3 relative z-10">
              <Button 
                variant="secondary" 
                onClick={() => setShowSaveNutritionTemplateModal(false)}
                className="flex-1 !py-3 !text-[11px]"
              >
                ANNULER
              </Button>
              <Button 
                variant="success" 
                onClick={handleSaveAsNutritionPreset}
                disabled={!newNutritionTemplateName.trim()}
                className="flex-1 !py-3 !text-[11px]"
              >
                ENREGISTRER
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
