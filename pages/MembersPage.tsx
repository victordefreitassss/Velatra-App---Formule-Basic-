import { AddMemberDialog } from '../components/AddMemberDialog';
import { billingRequest,downloadReceipt } from '../components/billingClient';
import { subscriptionStatusLabels } from '../components/billingMetrics';
import { CoachFollowup } from '../components/CoachingFollowup';
import { createNumericId,localDateKey } from '../components/dataHelpers';
import { Member360Header } from '../components/member360/Member360Header';
import { canOpenMember,type CoachingView } from '../components/member360/member360Model';
import { Member360Mount,Member360Navigation,useMemberDesktop } from '../components/member360/Member360Workspace';
import { MemberBilling } from '../components/member360/MemberBilling';
import { MemberCoaching } from '../components/member360/MemberCoaching';
import { MemberDocuments } from '../components/member360/MemberDocuments';
import { MemberFollowup } from '../components/member360/MemberFollowup';
import { MemberMessages } from '../components/member360/MemberMessages';
import { MemberNutrition } from '../components/member360/MemberNutrition';
import { MemberOverview } from '../components/member360/MemberOverview';
import { MemberPlanning } from '../components/member360/MemberPlanning';
import { MemberProfile } from '../components/member360/MemberProfile';
import { MemberProgress } from '../components/member360/MemberProgress';
import { createMemberAndSendAccess,getMemberCreationCoachOptions } from '../components/memberAccess';
import { OnboardingDetail } from '../onboarding/OnboardingDetail';
import { getProductCapabilities,resolveAccountType } from '../productCapabilities';
import { RetentionDetail } from '../retention/RetentionDetail';
import { authorizationActor,canAssignMembers } from '../server/authorization';
import { finalizeDriveFile } from '../services/driveAccess';

import { deleteObject,getDownloadURL,ref,uploadBytes,uploadBytesResumable } from 'firebase/storage';
import { AnimatePresence,motion } from 'framer-motion';
import React,{ useEffect,useRef,useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation,useNavigate } from 'react-router-dom';
import { canShowClient360AccountActions,getClient360AdminSections,getClient360CoachingContact,getClient360Facts,getClient360QuickActions,getClient360Sections,type Client360AdminSectionId,type Client360SectionId } from '../components/client360';
import { getMemberActivationStatus,hasAssignedProgram } from '../components/coachOnboardingHelpers';
import { createClient360LocationState,createPlanningLocationState,getClient360AdminSection,getClient360MemberId,getClient360Section,resolveClient360Member,shouldFocusClientNote } from '../components/dashboardNavigation';
import { 
BellIcon,
BotIcon,
CalendarIcon,
CheckIcon,
DumbbellIcon,
Edit2Icon,
FileTextIcon,
InfoIcon,
LayersIcon,MessageCircleIcon,
PlusIcon,
SaveIcon,
SearchIcon,
SparklesIcon,
Trash2Icon,
UploadIcon,
UserIcon,
XIcon
} from '../components/Icons';
import { requestClubInviteDialog,trackProductEventOnce } from '../components/productEvents';
import { Badge,Button,Card,Input } from '../components/UI';
import { GOALS } from '../constants';
import { addDoc,apiFetch,auth,collection,createMemberAccount,db,deleteDoc,doc,getStorageClient,sendPasswordResetEmail,setDoc,updateDoc } from '../firebase';
import { AppState,BodyData,Gender,Invoice,NutritionPlan,Payment,Performance,Program,SessionLog,User,UserDocument } from '../types';
import { updateNutritionPlanForWeight } from '../utils';

const ClientConversation = React.lazy(() => import('./MessagesPage').then(module => ({ default: module.MessagesPage })));
const ClientNutritionView = React.lazy(() => import('../components/MemberNutritionView').then(module => ({ default: module.MemberNutritionView })));

const itemVariants: any = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

import { ErrorBoundary } from '../components/ErrorBoundary';

export const MembersPage: React.FC<{ state: AppState, setState: any, showToast: any }> = ({ state, setState, showToast }) => {
  const desktop = useMemberDesktop();
  const [coachingView, setCoachingView] = useState<CoachingView>('program');
  const location = useLocation();
  const navigate = useNavigate();
  const clientHistoryEntryRef = useRef(false);
  const closingHistoryRef = useRef(false);
  const lastLocationKeyRef = useRef(location.key);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(state.memberFilter || "Tous");
  const [selectedProfile, setSelectedProfile] = useState<User | null>(state.selectedMember && canOpenMember(state.selectedMember, state) ? state.selectedMember : null);
  const [memberTab, setMemberTab] = useState<Client360SectionId>('overview');
  const [adminSection, setAdminSection] = useState<Client360AdminSectionId>('profile');
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);
  const [selectedLog, setSelectedLog] = useState<SessionLog | null>(null);
  const [selectedEvolutionPhoto, setSelectedEvolutionPhoto] = useState<string | null>(null);

  const [coachingNotes, setCoachingNotes] = useState("");
  const [coachingNoteDate, setCoachingNoteDate] = useState<string>(localDateKey());
  const [isSavingCoachingNotes, setIsSavingCoachingNotes] = useState(false);
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');
  const [bookingTypeFilter, setBookingTypeFilter] = useState<string>('all');
  const [selectedDateForPhoto, setSelectedDateForPhoto] = useState<string>('');
  const [showProgramOptions, setShowProgramOptions] = useState<boolean>(false);

  useEffect(() => {
    if (state.memberFilter) {
      setFilter(state.memberFilter);
    }
  }, [state.memberFilter]);

  useEffect(() => {
    if (state.pendingUiAction !== 'add-member') return;
    setIsAddingMember(true);
    setState((previous: AppState) => ({ ...previous, pendingUiAction: undefined }));
  }, [state.pendingUiAction, setState]);

  useEffect(() => {
    if (state.selectedMember && canOpenMember(state.selectedMember, state)) {
      setSelectedProfile(state.selectedMember);
      setMemberTab('overview');
    }
  }, [state.selectedMember]);

  useEffect(() => {
    if (selectedProfile) {
      const requestedSection = getClient360Section(location.state);
      const allowed = getClient360Sections(state.currentClub, state.user || {});
      setMemberTab(requestedSection && allowed.some(section => section.id === requestedSection) ? requestedSection : 'overview');
      setCoachAssignment(selectedProfile.assignedCoachUid || '');
      requestAnimationFrame(() => closeButtonRef.current?.focus());
    }
  }, [selectedProfile?.id]);

  // Financial balances come from the canonical roster subscription, including
  // grants after assignment and Booking V2 consumption/refunds.
  useEffect(()=>{
    if(!selectedProfile)return;
    const canonical=state.users.find(u=>Number(u.id)===Number(selectedProfile.id)&&u.clubId===selectedProfile.clubId);
    if(canonical)setSelectedProfile(previous=>previous?{...previous,credits:canonical.credits,sessionCredits:canonical.sessionCredits,stripeCustomerId:canonical.stripeCustomerId}:previous);
  },[state.users,selectedProfile?.id]);

  const openProfile = (member: User, trigger: HTMLElement) => {
    if (!canOpenMember(member, state)) return;
    returnFocusRef.current = trigger;
    closingHistoryRef.current = false;
    clientHistoryEntryRef.current = true;
    setSelectedProfile(member);
    navigate(`${location.pathname}${location.search}`, { state: createClient360LocationState(Number(member.id)) });
  };

  useEffect(() => {
    const locationChanged = lastLocationKeyRef.current !== location.key;
    lastLocationKeyRef.current = location.key;
    const memberId = getClient360MemberId(location.state);
    if (!memberId) {
      if (locationChanged && (clientHistoryEntryRef.current || closingHistoryRef.current)) {
        clientHistoryEntryRef.current = false;
        closingHistoryRef.current = false;
        setSelectedProfile(null);
        setState((previous: AppState) => previous.selectedMember ? { ...previous, selectedMember: null } : previous);
        requestAnimationFrame(() => returnFocusRef.current?.focus());
      }
      return;
    }
    if (closingHistoryRef.current) return;
    const member = resolveClient360Member(state.users, state.user?.clubId, location.state, state.user);
    if (member && canOpenMember(member, state)) {
      clientHistoryEntryRef.current = true;
      if (locationChanged) {
        const requestedAdmin = getClient360AdminSection(location.state);
        setAdminSection(requestedAdmin && getClient360AdminSections(state.currentClub, state.user || {}).some(item => item.id === requestedAdmin) ? requestedAdmin : 'profile');
        const section = getClient360Section(location.state);
        setMemberTab(section && getClient360Sections(state.currentClub, state.user || {}).some(item => item.id === section) ? section : 'overview');
      }
      setSelectedProfile(previous => Number(previous?.id) === memberId ? previous : member);
    } else {
      setSelectedProfile(null);
    }
  }, [location.key, state.users, state.user, state.currentClub]);

  useEffect(() => {
    if (selectedProfile && memberTab === 'followup' && shouldFocusClientNote(location.state)) {
      const frame = requestAnimationFrame(() => notesRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [selectedProfile?.id, location.key, memberTab]);

  useEffect(() => {
    if (selectedProfile && !canOpenMember(selectedProfile, state)) {
      setSelectedProfile(null);
      setIsEditingInfo(false);
      setSelectedLog(null);
      setSelectedEvolutionPhoto(null);
    }
  }, [state.users, state.user, state.currentClub, selectedProfile?.id]);

  const closeProfile = () => {
    const hadHistoryEntry = clientHistoryEntryRef.current;
    clientHistoryEntryRef.current = false;
    closingHistoryRef.current = hadHistoryEntry;
    setSelectedProfile(null);
    if (state.selectedMember) {
      setState((prev: AppState) => ({ ...prev, selectedMember: null }));
    }
    requestAnimationFrame(() => returnFocusRef.current?.focus());
    if (hadHistoryEntry) navigate(-1);
  };
  const navigateMemberSection = (section: Client360SectionId, admin: Client360AdminSectionId = 'profile') => {
    setMemberTab(section); setAdminSection(admin);
    if (selectedProfile) navigate(`${location.pathname}${location.search}`, { replace: true, state: createClient360LocationState(Number(selectedProfile.id), section, false, admin) });
  };
  const openPlanningForMember = () => {
    if (!selectedProfile || !canOpenMember(selectedProfile, state)) return;
    clientHistoryEntryRef.current = false;
    setSelectedProfile(null);
    setState((previous: AppState) => ({ ...previous, page: 'calendar', selectedMember: null }));
    navigate(`${location.pathname}${location.search}`, { state: createPlanningLocationState(Number(selectedProfile.id)) });
  };
  const openMemberEditor = (member: User) => {
    setEditInfoData({
      name: member.name, phone: member.phone || '', address: member.address || '', age: member.profileMeasurementsPending ? 0 : member.age, birthDate: member.birthDate || '', gender: member.gender,
      weight: member.profileMeasurementsPending ? 0 : member.weight, height: member.profileMeasurementsPending ? 0 : member.height, objectifs: member.objectifs, notes: member.notes, avatar: member.avatar,
    });
    setIsEditingInfo(true);
  };

  useEffect(() => {
    if (!selectedProfile || !canOpenMember(selectedProfile, state)) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('[role="dialog"][aria-modal="true"]:not(.va-member-dossier)')) closeProfile();
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [selectedProfile, state.selectedMember]);
  useEffect(() => {
    if (!selectedProfile || memberTab !== 'followup') return;
    const keepNoteVisible = () => {
      if (document.activeElement === notesRef.current) notesRef.current?.scrollIntoView({ block: 'center' });
    };
    window.addEventListener('resize', keepNoteVisible);
    window.visualViewport?.addEventListener('resize', keepNoteVisible);
    return () => {
      window.removeEventListener('resize', keepNoteVisible);
      window.visualViewport?.removeEventListener('resize', keepNoteVisible);
    };
  }, [selectedProfile?.id, memberTab]);
  const [newScan, setNewScan] = useState({ weight: "", fat: "", muscle: "" });
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editInfoData, setEditInfoData] = useState<Partial<User>>({});
  const [coachAssignment, setCoachAssignment] = useState('');
  const [isSavingCoachAssignment, setIsSavingCoachAssignment] = useState(false);
  const [isAssigningPlan, setIsAssigningPlan] = useState(false);
  const [isEditingSub, setIsEditingSub] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [billingMode, setBillingMode] = useState<'manual'|'stripe'>('manual');
  const [billingBusy, setBillingBusy] = useState(false);
  const billingKeys = useRef<Record<string,string>>({});
  const billingKey = (k:string) => billingKeys.current[k] ||= crypto.randomUUID();
  const [subStartDate, setSubStartDate] = useState(localDateKey());
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
  const [newAccessMemberId, setNewAccessMemberId] = useState<number | null>(null);
  const [newAccessEmailStatus, setNewAccessEmailStatus] = useState<'sent' | 'failed' | null>(null);
  const [isSendingAccessEmail, setIsSendingAccessEmail] = useState(false);
  const [newMemberData, setNewMemberData] = useState<Partial<User> & { coachUid?: string }>({
    name: '', email: '', phone: '', gender: 'M', age: 30, birthDate: '', weight: 70, height: 175, objectifs: [], notes: ''
  });
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [newPayment, setNewPayment] = useState<Partial<Payment>>({ amount: 0, method: 'cash', status: 'pending', date: localDateKey() });
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
      setCoachingNotes("");
      setCoachingNoteDate(localDateKey());
      setSelectedDateForPhoto("");
      setGeneratedReport(null);
      setStagnationResult(null);
      setCoachingView('program');
      const requestedAdmin = getClient360AdminSection(location.state);
        setAdminSection(requestedAdmin && getClient360AdminSections(state.currentClub, state.user || {}).some(item => item.id === requestedAdmin) ? requestedAdmin : 'profile');
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
    let errorCount = 0;
    let emailFailureCount = 0;
    
    // Process sequentially to not hammer Firebase too hard
    for (const index of selectedClientsToImport) {
      const client = parsedClients[index];
      if (!client || !client.email) continue;
      
      try {
        const newUser: User = {
          id: 0, // The authenticated server endpoint allocates the actual member ID.
          clubId: state.user?.clubId || '1',
          code: '',
          pwd: '',
          avatar: '',
          xp: 0,
          streak: 0,
          pointsFidelite: 0,
          createdAt: new Date().toISOString(),
          role: 'member',
          firebaseUid: '',
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
        await createMemberAccount(newUser as unknown as Record<string, unknown>);
        
        // Immediately send reset email via primary auth so they can set their password
        successCount++;
        try { await sendPasswordResetEmail(auth, client.email); }
        catch { emailFailureCount++; }
      } catch (err: any) {
        console.error("Error creating user from CSV:", client.email, err);
        errorCount++;
      }
    }

    setIsImportingClients(false);
    setIsCsvImportModalOpen(false);
    setIsConfirmingImport(false);

    if (successCount > 0) trackProductEventOnce('first_member_created', state.user?.firebaseUid || state.user?.id, { source: 'csv_import' });
    
    showToast(`${successCount} comptes créés, ${successCount - emailFailureCount} emails d’accès envoyés, ${emailFailureCount} emails non envoyés, ${errorCount} non créés.`, successCount > 0 ? "success" : "error");
  };

  const members = state.users.filter(u => {
    if (u.role !== 'member' || u.clubId !== state.user?.clubId ||
      (state.user?.role === 'coach' && (!state.user.firebaseUid || u.assignedCoachUid !== state.user.firebaseUid))) return false;
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
      id: createNumericId(),
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
      const plan = state.nutritionPlans?.find(p => p.clubId === state.user?.clubId && (p.memberId === Number(selectedProfile.id)));
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
    if (!selectedProfile || !selectedProfile.firebaseUid || !canOpenMember(selectedProfile, state)) return;
    if (selectedProfile.profileMeasurementsPending && (!editInfoData.age || !editInfoData.weight || !editInfoData.height)) {
      showToast('Renseignez âge, poids et taille avant de valider les mesures.', 'error');
      return;
    }
    
    try {
      const userRef = doc(db, "users", selectedProfile.firebaseUid);
      const updates = selectedProfile.profileMeasurementsPending ? { ...editInfoData, profileMeasurementsPending: false } : editInfoData;
      await updateDoc(userRef, updates);
      showToast("Informations mises à jour");
      setSelectedProfile({ ...selectedProfile, ...updates } as User);
      setIsEditingInfo(false);
    } catch (err) {
      console.error("Error updating member info:", err);
      showToast("Erreur lors de la mise à jour", "error");
    }
  };

  const assignmentActor = { role: state.user?.role, clubId: state.user?.clubId, trustedSuperAdmin: auth.currentUser?.emailVerified === true && auth.currentUser?.email === 'victor.defreitas.pro@gmail.com' };
  const clientSections = getClient360Sections(state.currentClub, assignmentActor);
  const adminSections = getClient360AdminSections(state.currentClub, assignmentActor);
  const quickActions = getClient360QuickActions(clientSections);
  const canUseAI = getProductCapabilities(state.currentClub, assignmentActor).aiAssistance.usable;
  const canAssignCoach = canAssignMembers(authorizationActor(assignmentActor, state.currentClub, assignmentActor.trustedSuperAdmin), state.currentClub?.id) &&
    getProductCapabilities(state.currentClub, assignmentActor).coachAssignments.usable;
  const assignmentEntry = useRef<string | null>(null);
  useEffect(() => { if (selectedProfile && canAssignCoach && (location.state as any)?.focusCoachAssignment === true && assignmentEntry.current !== location.key) { assignmentEntry.current = location.key; openMemberEditor(selectedProfile); } }, [selectedProfile, canAssignCoach, location.key]);
  const handleAssignCoach = async () => {
    if (!canAssignCoach) return;
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
    if (!selectedProfile || !selectedProfile.firebaseUid || !canOpenMember(selectedProfile, state)) return;
    if (!coachingNotes.trim()) {
      showToast("Veuillez saisir une note avant d'enregistrer", "error");
      return;
    }
    if ((selectedProfile.coachingNotesHistory?.length || 0) >= 200) {
      showToast('La limite de 200 notes est atteinte. Supprimez une note avant d’en ajouter une.', 'error'); return;
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
        ...(state.user?.firebaseUid ? { authorUid: state.user.firebaseUid, authorName: state.user.name } : {}),
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
      setCoachingNoteDate(localDateKey());
    } catch (err) {
      console.error("Error saving coaching notes:", err);
      showToast("Erreur lors de l'enregistrement de la note", "error");
    } finally {
      setIsSavingCoachingNotes(false);
    }
  };

  const handleDeleteCoachingNote = async (noteId: string) => {
    if (!selectedProfile || !selectedProfile.firebaseUid || !canOpenMember(selectedProfile, state)) return;
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
    if (!selectedProfile || !canOpenMember(selectedProfile, state)) return;
    const uid = selectedProfile.firebaseUid || selectedProfile.id?.toString();
    if (!uid) return;
    setConfirmDeleteMemberId(uid);
  };

  const handleResetMemberPassword = async () => {
    if (isSendingAccessEmail) return;
    if (!selectedProfile?.email) {
      showToast("L'adresse email du membre est introuvable.", "error");
      return;
    }
    setIsSendingAccessEmail(true);
    try {
      await sendPasswordResetEmail(auth, selectedProfile.email);
      if (newAccessMemberId === Number(selectedProfile.id)) setNewAccessEmailStatus('sent');
      showToast("Email d’accès envoyé à " + selectedProfile.email, "success");
    } catch (err: any) {
      if (newAccessMemberId === Number(selectedProfile.id)) setNewAccessEmailStatus('failed');
      showToast("Compte conservé, email d’accès non envoyé. Réessayez.", "error");
    } finally { setIsSendingAccessEmail(false); }
  };

  const handleCopyLoginLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/login`);
      showToast('Lien de connexion copié.', 'success');
    } catch { showToast('Impossible de copier le lien automatiquement.', 'error'); }
  };

  const handleTogglePauseMember = async () => {
    if (!selectedProfile || !selectedProfile.firebaseUid || !canOpenMember(selectedProfile, state)) return;
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

  const handleUpdateCredits = async (member: User, delta: number) => {
    try { const result = await billingRequest(`/api/billing/members/${member.id}/credits`, {delta,requestId:billingKey(`credits-${member.id}`)}); setSelectedProfile({...member,...result}); delete billingKeys.current[`credits-${member.id}`]; showToast('Crédits mis à jour'); }
    catch(e:any){showToast(e.message,'error');}
  };
  const handleUpdateSessionCredits = async (member: User, sessionTypeId: string, delta: number) => {
    try { const result = await billingRequest(`/api/billing/members/${member.id}/credits`, {delta,sessionTypeId,requestId:billingKey(`session-${member.id}-${sessionTypeId}`)}); setSelectedProfile({...member,...result}); delete billingKeys.current[`session-${member.id}-${sessionTypeId}`]; showToast('Crédits séance mis à jour'); }
    catch(e:any){showToast(e.message,'error');}
  };

  const handleEditProgram = (member: User) => {
    if (!canOpenMember(member, state)) return;
    const mid = Number(member.id);
    const existingProg = state.programs.find(p => p.clubId === state.user?.clubId && (Number(p.memberId) === mid && !p.isPlannedSession));
    if (existingProg) {
      setState((prev: AppState) => ({ ...prev, editingProg: existingProg }));
    } else {
      const newProg: Program = {
        id: createNumericId(),
        clubId: member.clubId,
        ...(member.assignedCoachUid ? { assignedCoachUid: member.assignedCoachUid } : {}),
        memberId: Number(member.id),
        name: `Plan - ${member.name.split(' ')[0]}`,
        presetId: null,
        nbDays: 1,
        startDate: localDateKey(),
        completedWeeks: [],
        currentDayIndex: 0,
        days: [{ name: "Jour 1", isCoaching: false, exercises: [] }]
      };
      setState((prev: AppState) => ({ ...prev, editingProg: newProg }));
    }
    closeProfile(); 
  };

  const handleAddPayment = async () => {
    if(!selectedProfile||billingBusy)return;setBillingBusy(true);
    try { await billingRequest('/api/billing/payments',{...newPayment,amount:Number(newPayment.amount),memberId:Number(selectedProfile.id),requestId:billingKey('payment')}); delete billingKeys.current.payment; showToast('Paiement en attente créé. L’encaissement se confirme séparément.');setIsAddingPayment(false);setNewPayment({amount:0,method:'cash',status:'pending',date:localDateKey(),category:'other'}); }
    catch(e:any){showToast(e.message,'error');}finally{setBillingBusy(false);}
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
    if (!selectedProfile || !selectedProfile.firebaseUid || !canOpenMember(selectedProfile, state)) return;
    
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
        const storageRef = ref(storage, `driveUploads/${state.currentClub!.id}/${auth.currentUser!.uid}/${fileId}/${file.name}`);
        
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
              await finalizeDriveFile(fileId, {
                clubId: state.currentClub!.id, name: file.name,
                folderId: null, sharedWith: [Number(selectedProfile.id)],
              });

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
    if (!selectedProfile || !canOpenMember(selectedProfile, state)) return;
    if (selectedProfile.profileMeasurementsPending) { showToast('Complétez les mesures réelles avant de générer un bilan IA.', 'info'); return; }
    setIsGeneratingReport(true);
    setGeneratedReport(null);
    try {
      const { generateAutoReport } = await import('../services/aiService');
      const mid = Number(selectedProfile.id);
      const memberBody = state.bodyData.filter(b => b.clubId === state.user?.clubId && (Number(b.memberId) === mid));
      const memberPerfs = state.performances.filter(p => p.clubId === state.user?.clubId && (Number(p.memberId) === mid));
      
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
    if (!selectedProfile || !canOpenMember(selectedProfile, state)) return;
    setIsDetectingStagnation(true);
    setStagnationResult(null);
    try {
      const { detectStagnation } = await import('../services/aiService');
      const mid = Number(selectedProfile.id);
      const memberPerfs = state.performances.filter(p => p.clubId === state.user?.clubId && (Number(p.memberId) === mid));
      
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
    if (!selectedProfile || !canOpenMember(selectedProfile, state)) return;
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
    if (!selectedProfile || !canOpenMember(selectedProfile, state)) return;
    if (selectedProfile.profileMeasurementsPending) { showToast('Complétez le profil réel avant de générer un programme IA.', 'info'); return; }
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
      const existingProg = state.programs.find(p => p.clubId === state.user?.clubId && (Number(p.memberId) === mid && !p.isPlannedSession));
      const progId = existingProg ? existingProg.id : createNumericId();
      
      const newProg: Program = {
        id: progId,
        clubId: selectedProfile.clubId,
        memberId: mid,
        name: generatedData.name || `Programme IA - ${(selectedProfile.name || 'Membre').split(' ')[0]}`,
        presetId: null,
        nbDays: validDays.length,
        startDate: existingProg ? existingProg.startDate : localDateKey(),
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
    if (!selectedProfile || !canOpenMember(selectedProfile, state)) return;
    if (selectedProfile.profileMeasurementsPending) { showToast('Complétez les mesures réelles avant de calculer les objectifs nutritionnels.', 'info'); return; }
    const mid = Number(selectedProfile.id);
    const memberBody = state.bodyData.filter(b => b.clubId === state.user?.clubId && (Number(b.memberId) === mid));
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
    if (!selectedProfile || !canOpenMember(selectedProfile, state)) return;
    if (selectedProfile.profileMeasurementsPending) { showToast('Complétez les mesures réelles avant de générer un plan nutritionnel.', 'info'); return; }
    setIsAdjustingTargets(false);
    setIsGeneratingNutrition(true);
    setNutritionPlan(null);
    try {
      const mid = Number(selectedProfile.id);
      const memberBody = state.bodyData.filter(b => b.clubId === state.user?.clubId && (Number(b.memberId) === mid));
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
      
      const existingPlan = state.nutritionPlans?.find(p => p.clubId === state.user?.clubId && (p.memberId === mid));
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
    if (!selectedProfile || !canOpenMember(selectedProfile, state)) return;
    try {
      const mid = Number(selectedProfile.id);
      const existingProg = state.programs.find(p => p.clubId === state.user?.clubId && (Number(p.memberId) === mid && !p.isPlannedSession));
      if (existingProg) {
        if (state.user?.role === 'manager') {
          const archiveId = createNumericId();
          await setDoc(doc(db, 'archivedPrograms', String(archiveId)), { ...existingProg, id: archiveId, endDate: localDateKey(), status: 'replaced' });
        } else await deleteDoc(doc(db, "programs", existingProg.id.toString()));
      }
      const newProgId = state.user?.role === 'manager' && existingProg ? existingProg.id : createNumericId();
      const newProgram: Program = {
        id: newProgId,
        clubId: selectedProfile.clubId,
        memberId: mid,
        ...(selectedProfile.assignedCoachUid ? { assignedCoachUid: selectedProfile.assignedCoachUid } : {}),
        name: preset.name,
        presetId: preset.id,
        nbDays: preset.nbDays,
        durationWeeks: preset.durationWeeks || 4,
        startDate: localDateKey(),
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
    if (!selectedProfile || !canOpenMember(selectedProfile, state)) return;
    if (selectedProfile.profileMeasurementsPending) { showToast('Complétez les mesures réelles avant de préparer un plan nutritionnel.', 'info'); return; }
    try {
      const mid = Number(selectedProfile.id);
      const existingPlan = state.nutritionPlans?.find(p => p.clubId === state.user?.clubId && (p.memberId === mid));
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
    const currentPlan = state.nutritionPlans?.find(p => p.clubId === state.user?.clubId && (p.memberId === Number(selectedProfile.id)));
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
    const memberPerfs = (state.performances || []).filter(p => p.clubId === state.user?.clubId && (Number(p.memberId) === mid));
    const memberBody = (state.bodyData || []).filter(b => b.clubId === state.user?.clubId && (Number(b.memberId) === mid));
    const program = (state.programs || []).find(p => p.clubId === state.user?.clubId && (Number(p.memberId) === mid && !p.isPlannedSession));

    const topPerfs = memberPerfs.reduce((acc: any, curr) => {
      if (!acc[curr.exId] || acc[curr.exId].weight < curr.weight) {
        acc[curr.exId] = curr;
      }
      return acc;
    }, {});

    const memberOrders = (state.supplementOrders || []).filter(o => o.clubId === state.user?.clubId && (Number(o.adherentId) === mid));
    const totalSpent = memberOrders.filter(o => o.status === 'completed').reduce((acc, curr) => acc + curr.total, 0);
    const subscription = (state.subscriptions || []).find(s => s.clubId === state.user?.clubId && (s.memberId === mid && ['active','pending','past_due','unpaid'].includes(s.status)));

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
    if(!selectedProfile||!selectedPlanId||billingBusy)return;setBillingBusy(true);
    try { await billingRequest('/api/billing/subscriptions/assign',{memberId:Number(selectedProfile.id),planId:selectedPlanId,startDate:subStartDate,commitmentEndDate:subCommitmentDate||undefined,contractUrl:subContractUrl||undefined,collectionMode:billingMode,requestId:billingKey('assign')}); delete billingKeys.current.assign; showToast(billingMode==='stripe'?'Abonnement en attente de confirmation Stripe.':'Abonnement assigné et crédits appliqués.');setIsAssigningPlan(false);setSelectedPlanId('');setSubCommitmentDate('');setSubContractUrl(''); }
    catch(e:any){showToast(e.message,'error');}finally{setBillingBusy(false);}
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
    if (!selectedProfile || !canOpenMember(selectedProfile, state)) return;
    const subscription = state.subscriptions.find(s => s.clubId === state.user?.clubId && (s.memberId === Number(selectedProfile.id) && ['active','pending','past_due','unpaid'].includes(s.status)));
    if (!subscription) return;

    try {
      await billingRequest(`/api/billing/subscriptions/${subscription.id}`, {
        startDate: subStartDate, commitmentEndDate: subCommitmentDate || null, contractUrl: subContractUrl || null
      }, 'PATCH');
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
          const newUser: User = {
            id: 0,
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

          await createMemberAccount(newUser as unknown as Record<string, unknown>);
          successCount++;
          try {
            await sendPasswordResetEmail(auth, email);
          } catch {
            passwordSetupEmailErrorCount++;
          }
        } catch (err) {
          console.error(`Error importing user ${email}:`, err);
          errorCount++;
        }
      }

      showToast(`Import terminé : ${successCount} créés, ${successCount - passwordSetupEmailErrorCount} emails d’accès envoyés, ${passwordSetupEmailErrorCount} emails non envoyés, ${errorCount} erreurs.`, successCount > 0 ? "success" : "error");
      // Reset file input
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const [isCreatingMember, setIsCreatingMember] = useState(false);
  const handleCreateMember = async () => {
    if (isCreatingMember) return;
    if (!newMemberData.name?.trim() || !newMemberData.email?.trim() || !state.user?.clubId) {
      showToast("Veuillez renseigner le nom et l'email", "error");
      return;
    }
    
    setIsCreatingMember(true);
    try {
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

      const newUser: User = {
        id: 0,
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
        experienceLevel: newMemberData.experienceLevel || 'Débutant',
        equipment: newMemberData.equipment || 'Salle complète',
        trainingDays: newMemberData.trainingDays || 3,
        sessionDuration: newMemberData.sessionDuration || 60,
        injuries: newMemberData.injuries || '',
        notes: newMemberData.notes || '',
        createdAt: new Date().toISOString(),
        firebaseUid: ''
      };

      const studioCoachUid = ['owner', 'manager'].includes(state.user.role) && resolveAccountType(state.currentClub) === 'studio'
        ? newMemberData.coachUid || null : null;
      const { created, emailStatus } = await createMemberAndSendAccess(
        () => createMemberAccount(newUser as unknown as Record<string, unknown>, undefined, studioCoachUid),
        email => sendPasswordResetEmail(auth, email),
      );
      trackProductEventOnce('first_member_created', state.user.firebaseUid || state.user.id, { source: 'member_form' });
      showToast(emailStatus === 'sent' ? 'Adhérent créé. Email d’accès envoyé.' : 'Adhérent créé, email d’accès non envoyé.', emailStatus === 'sent' ? 'success' : 'error');
      setIsAddingMember(false);
      setNewMemberData({ name: '', email: '', phone: '', gender: 'M', age: 30, birthDate: '', weight: 70, height: 175, objectifs: [], notes: '' });
      setState((previous: AppState) => ({
        ...previous,
        users: previous.users.some(user => user.firebaseUid === created.uid) ? previous.users : [...previous.users, created.member],
      }));
      // Select the new member automatically
      setSelectedProfile(created.member);
      setNewAccessMemberId(Number(created.member.id));
      setNewAccessEmailStatus(emailStatus);
    } catch (err: any) {
      console.error("Error creating member", err);
      throw new Error(err.message || "Erreur lors de la création");
    } finally { setIsCreatingMember(false); }
  };

  const [isStripeConnected,setIsStripeConnected] = useState(false);
  useEffect(()=>{let alive=true;if(state.user?.role==='manager')return;apiFetch('/api/stripe/status').then(r=>r.ok?r.json():{}).then((r:any)=>{if(alive)setIsStripeConnected(r.connected===true);}).catch(()=>{});return()=>{alive=false;};},[state.user?.clubId]);

  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const handleCopyPaymentLink = async () => {
    const sub=state.subscriptions.find(s=>s.clubId === state.user?.clubId && (s.memberId===Number(selectedProfile?.id)&&s.status==='pending'));
    if(!sub){showToast('Choisissez un abonnement Stripe en attente de paiement.','error');return;}
    setIsGeneratingLink(true);try{const result=await billingRequest('/api/billing/checkout',{subscriptionId:sub.id});await navigator.clipboard.writeText(result.link);showToast('Lien personnalisé copié.');}catch(e:any){showToast(e.message,'error');}finally{setIsGeneratingLink(false);}
  };

  const [isCharging, setIsCharging] = useState<string | null>(null);

  const [isGeneratingLinkForPayment, setIsGeneratingLinkForPayment] = useState<string | null>(null);

  const handleGeneratePaymentLink = async (payment: Payment) => {
    setIsGeneratingLinkForPayment(payment.id);try{const result=await billingRequest('/api/billing/checkout',{paymentId:payment.id});await navigator.clipboard.writeText(result.link);showToast('Lien personnalisé copié.');}catch(e:any){showToast(e.message,'error');}finally{setIsGeneratingLinkForPayment(null);}
  };
  const handleCharge = async (payment: Payment) => {
    setIsCharging(payment.id);try{const result=await billingRequest(`/api/billing/payments/${payment.id}/charge`);showToast(result.success?'Encaissement confirmé par Stripe.':'Stripe attend une confirmation.');}catch(e:any){showToast(e.message,'error');}finally{setIsCharging(null);}
  };
  const handleManualPayment = async (payment: Payment) => {
    try{await billingRequest(`/api/billing/payments/${payment.id}/manual`,{method:payment.method,date:new Date().toISOString()});showToast('Encaissement manuel enregistré.');}catch(e:any){showToast(e.message,'error');}
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
    try{const receipt=await billingRequest(`/api/billing/payments/${payment.id}/receipt`);await downloadReceipt(receipt);showToast('Justificatif généré.');}catch(e:any){showToast(e.message,'error');}
  };
  const handleDownloadInvoice = async (invoice: Invoice) => {
    try{await downloadReceipt(invoice);}catch{showToast('Le téléchargement a échoué.','error');}
  };

  const expiringSubscriptions = state.subscriptions.filter(sub => {
    if (!sub.commitmentEndDate || sub.status !== 'active') return false;
    const daysUntilEnd = (new Date(sub.commitmentEndDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return daysUntilEnd <= 30 && daysUntilEnd >= -30; // Show if expiring within 30 days or expired up to 30 days ago
  });

  return (
    <div className={`va-members-page va-polish-page space-y-5 page-transition ${desktop && selectedProfile ? 'm360-page' : ''}`}>
      <div className="m360-member-list space-y-5" hidden={desktop && !!selectedProfile}>
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
                    onClick={event => openProfile(member, event.currentTarget)}
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
              className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${filter === f ? 'bg-emerald-700 lg:bg-indigo-700 text-white' : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100 border border-zinc-200'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="va-members-columns hidden lg:grid grid-cols-[minmax(220px,1.5fr)_minmax(130px,1fr)_minmax(150px,1fr)_minmax(140px,1fr)_auto] items-center gap-4 border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-xs font-semibold text-zinc-600">
          <span>Membre</span><span>Statut</span><span>Programme</span><span>Dernière activité</span><span className="sr-only">Actions</span>
        </div>
        {members.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600"><UserIcon size={22} /></div>
            {state.users.some(user => user.role === 'member' && user.clubId === state.user?.clubId) ? (
              <>
                <p className="font-semibold text-zinc-900">Aucun membre trouvé</p>
                <p className="mt-1 text-sm text-zinc-600">Modifiez la recherche ou choisissez un autre filtre.</p>
                <Button variant="secondary" className="mx-auto mt-4" onClick={() => { setSearch(''); setFilter('Tous'); }}>Réinitialiser les filtres</Button>
              </>
            ) : (
              <>
                <p className="font-semibold text-zinc-900">Aucun adhérent pour le moment</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-zinc-600">Ajoutez votre premier adhérent ou partagez votre code d’accès pour qu’il rejoigne votre espace.</p>
                <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
                  <Button variant="primary" onClick={() => setIsAddingMember(true)} className="min-h-11">Ajouter un adhérent</Button>
                  <Button variant="secondary" onClick={requestClubInviteDialog} className="min-h-11">Inviter avec le code</Button>
                </div>
              </>
            )}
          </div>
        ) : members.map(u => {
          const stats = getMemberStats(u.id);
          const hasFeedback = Boolean(stats.program?.memberRemarks);
          const coach = getClient360CoachingContact(u, state.currentClub, [...state.users, ...(state.user ? [state.user] : [])]);
          const programName = stats.program?.name;
          const memberLogs = (state.logs || []).filter(log => log.clubId === state.user?.clubId && (Number(log.memberId) === Number(u.id)));
          const lastActivityAt = memberLogs.reduce<string | undefined>((latest, log) => !latest || new Date(log.date).getTime() > new Date(latest).getTime() ? log.date : latest, u.lastWorkoutDate);
          const activationStatus = getMemberActivationStatus(Boolean(stats.program && hasAssignedProgram([u], [stats.program])), lastActivityAt);
          const activationLabel = {
            'programme-a-creer': 'Programme à créer',
            pret: 'Prêt',
            actif: 'Actif',
            'a-relancer': 'À relancer',
          }[activationStatus];
          const lastActivity = u.lastWorkoutDate ? new Date(u.lastWorkoutDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : null;
          return (
            <motion.button
              key={u.id}
              type="button"
              variants={itemVariants}
              onClick={event => openProfile(u, event.currentTarget)}
              className="va-members-row group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-zinc-100 px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700 lg:focus-visible:ring-indigo-700 lg:grid-cols-[minmax(220px,1.5fr)_minmax(130px,1fr)_minmax(150px,1fr)_minmax(140px,1fr)_auto] lg:gap-4 lg:px-5"
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
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${u.status === 'paused' ? 'bg-zinc-100 text-zinc-700' : activationStatus === 'actif' ? 'bg-emerald-50 lg:bg-indigo-50 text-emerald-800 lg:text-indigo-800' : activationStatus === 'pret' ? 'bg-blue-50 text-blue-800' : 'bg-amber-50 text-amber-800'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${u.status === 'paused' ? 'bg-zinc-500' : activationStatus === 'actif' ? 'bg-emerald-700 lg:bg-indigo-700' : activationStatus === 'pret' ? 'bg-blue-700' : 'bg-amber-600'}`} />
                  {u.status === 'paused' ? 'En pause' : activationLabel}
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
                <span className="text-sm font-medium text-emerald-800 lg:text-indigo-800 group-hover:text-emerald-900 lg:group-hover:text-indigo-900">Ouvrir <span aria-hidden="true">→</span></span>
              </span>
            </motion.button>
          );
        })}
      </div>

      </div>
      <Member360Mount desktop={desktop}>
        <AnimatePresence>
        {selectedProfile && canOpenMember(selectedProfile, state) && (() => {
        const stats = getMemberStats(selectedProfile.id);
        const memberId = Number(selectedProfile.id);
        const clientFacts = getClient360Facts(selectedProfile, state);
        const { nextBooking, lastActivity } = clientFacts;
        const assignedCoach = getClient360CoachingContact(selectedProfile, state.currentClub, [...state.users, ...(state.user ? [state.user] : [])]);
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
              initial={desktop ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={desktop ? "m360-workspace vi-page" : "fixed inset-0 bg-black/30 backdrop-blur-sm z-[500] flex items-start justify-center p-0 md:p-8 overflow-y-auto"}
            >
              <motion.div 
                initial={desktop ? false : { opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="va-member-dossier w-full max-w-[1600px] bg-white min-h-screen md:min-h-0 md:rounded-3xl border border-zinc-200 shadow-2xl relative overflow-hidden my-0 md:my-4" role={desktop ? "region" : "dialog"} aria-modal={desktop ? undefined : true} aria-label={`Dossier de ${selectedProfile.name}`}
              >
                <button ref={desktop ? undefined : closeButtonRef} onClick={closeProfile} aria-label="Fermer le dossier adhérent" className="va-dossier-close fixed top-4 right-4 md:absolute md:top-10 md:right-10 p-3 md:p-4 bg-zinc-100 backdrop-blur-md rounded-full text-zinc-500 hover:text-zinc-900 z-[600] border border-zinc-200 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all shadow-xl"><XIcon size={20} className="md:w-6 md:h-6" /></button>

                {desktop && <><Member360Header closeRef={closeButtonRef} member={selectedProfile} state={state} onClose={closeProfile} onEdit={() => openMemberEditor(selectedProfile)} actions={<>                  <div className="va-client-360-actions grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" aria-label="Actions pour cet adhérent">
                    {quickActions.includes('message') && <button type="button" onClick={() => navigateMemberSection('communication')} className="va-client-360-action"><MessageCircleIcon size={16} /> Message</button>}
                    {quickActions.includes('program') && <button type="button" onClick={() => handleEditProgram(selectedProfile)} className="va-client-360-action"><DumbbellIcon size={16} /> Programme</button>}
                    {quickActions.includes('plan') && <button type="button" onClick={openPlanningForMember} className="va-client-360-action va-client-360-secondary"><CalendarIcon size={16} /> Planifier</button>}
                    {quickActions.includes('note') && <button type="button" onClick={() => { navigateMemberSection('followup'); requestAnimationFrame(() => notesRef.current?.focus()); }} className="va-client-360-action va-client-360-secondary"><FileTextIcon size={16} /> Ajouter une note</button>}
                    <details className="va-client-360-more"><summary aria-label="Actions supplémentaires">Plus ···</summary><div>
                      {quickActions.includes('plan') && <button type="button" className="va-client-360-xs-action" onClick={openPlanningForMember}>Planifier une séance</button>}
                      {quickActions.includes('note') && <button type="button" className="va-client-360-xs-action" onClick={() => { navigateMemberSection('followup'); requestAnimationFrame(() => notesRef.current?.focus()); }}>Ajouter une note</button>}
                      <button type="button" onClick={() => { navigateMemberSection('administrative', 'profile'); }}>Profil et administration</button>
                      <button type="button" onClick={() => openMemberEditor(selectedProfile)}>Modifier le profil</button>
                    </div></details>
                  </div>
</>} />
                <Member360Navigation state={state} section={memberTab} admin={adminSection} coachingView={coachingView} setCoachingView={setCoachingView} onChange={navigateMemberSection} /></>}
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
                  <div className="va-dossier-sidebar w-full md:w-72 lg:w-80 bg-zinc-50 border-r border-zinc-200 p-4 md:p-6 flex flex-col gap-3 md:gap-6 shrink-0 md:h-[calc(100vh)] md:sticky top-0 overflow-y-auto hide-scrollbar pt-20 md:pt-10">
                  <div className="relative flex items-center gap-3 text-left md:block md:text-center">
                    <div className="va-dossier-avatar w-12 h-12 md:w-16 md:h-16 shrink-0 rounded-2xl bg-emerald-900 lg:bg-indigo-900 text-white flex items-center justify-center text-lg md:text-2xl font-semibold md:mx-auto md:mb-4 overflow-hidden">
                      {selectedProfile.avatar?.startsWith('http') ? (
                        <img src={selectedProfile.avatar} alt={selectedProfile.name} className="w-full h-full object-cover" />
                      ) : (
                        selectedProfile.avatar || selectedProfile.name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <button 
                      onClick={() => openMemberEditor(selectedProfile)}
                      className="hidden md:block absolute top-0 right-1/4 p-2 bg-white rounded-full text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-all border border-zinc-200 shadow-sm"
                      title="Modifier les infos"
                      aria-label="Modifier le profil de l’adhérent"
                    >
                      <Edit2Icon size={16} />
                    </button>
                    <h2 className="min-w-0 truncate text-base md:text-xl font-semibold text-zinc-900 tracking-normal flex items-center md:justify-center gap-2">
                      {selectedProfile.name}
                      {selectedProfile.status === 'paused' && <Badge variant="dark" className="!bg-zinc-800 !text-white !border-zinc-800 !px-2 !py-0.5 !text-[10px] not-italic">EN PAUSE</Badge>}
                    </h2>
                    <p className="md:hidden min-w-0 truncate text-xs text-zinc-700">{selectedProfile.objectifs?.[0] || stats.program?.name || 'Objectif à définir'}</p>
                    {(() => {
                      const lastAutonomousSession = state.logs
                        ?.filter(log => log.clubId === state.user?.clubId && (log.memberId === Number(selectedProfile.id) && !log.isCoaching))
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                      
                      return lastAutonomousSession ? (
                        <div className="hidden md:inline-flex text-xs font-medium text-emerald-800 lg:text-indigo-800 mt-2 items-center justify-center gap-1.5 bg-emerald-50 lg:bg-indigo-50 px-3 py-1.5 rounded-full border border-emerald-100 lg:border-indigo-100">
                          Dernière séance : {new Date(lastAutonomousSession.date).toLocaleDateString('fr-FR')}
                        </div>
                      ) : null;
                    })()}
                    <div className="hidden md:block mt-3">
                      <p className="text-sm leading-5 text-zinc-600">{selectedProfile.objectifs?.join(', ') || 'Objectif à définir'}</p>
                    </div>
                  </div>
                  <label className="md:hidden text-xs font-semibold text-zinc-700" htmlFor="client-360-section">Espace du client</label>
                  <select id="client-360-section" className="md:hidden min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900" value={memberTab} onChange={event => setMemberTab(event.target.value as Client360SectionId)}>
                    {clientSections.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
                  </select>
                  <nav aria-label="Sections du dossier client" className="hidden md:flex md:flex-col gap-1.5 mt-1 md:mt-4">
                    {clientSections.map(tab => (
                      <button 
                        key={tab.id}
                        onClick={() => setMemberTab(tab.id)}
                        aria-current={memberTab === tab.id ? 'page' : undefined}
                        className={`flex min-h-11 items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 lg:focus-visible:ring-indigo-800 ${memberTab === tab.id ? 'bg-emerald-800 lg:bg-indigo-800 text-white' : 'text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200/70'}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>

                </div>

                {/* MAIN GRAPHS & AI */}
                <div className="va-dossier-content flex-1 min-w-0 bg-white p-4 sm:p-6 md:p-10 lg:p-12 overflow-y-auto space-y-8 custom-scrollbar md:h-[calc(100vh)]">
                  <ErrorBoundary key={`${memberTab}-${adminSection}`}>
                    <div className="m360-legacy-heading sticky top-0 z-30 -mx-4 -mt-4 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white/95 px-4 py-3 pr-16 backdrop-blur-sm sm:-mx-6 sm:-mt-6 sm:px-6 sm:pr-16 md:-mx-10 md:-mt-10 md:px-10 md:pr-32 lg:-mx-12 lg:-mt-12 lg:px-12 lg:pr-32">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-zinc-700">{assignedCoach ? `Coach · ${assignedCoach.name}` : resolveAccountType(state.currentClub) === 'studio' ? 'Coach à attribuer' : 'Référent indisponible'}{stats.program?.name ? ` · ${stats.program.name}` : ' · Aucun programme'}</p>
                      <div className="flex min-w-0 items-center gap-2">
                        <h2 className="truncate text-base font-semibold text-zinc-900 sm:text-lg">{clientSections.find(section => section.id === memberTab)?.label || 'Dossier client'}</h2>
                        {selectedProfile.status === 'paused' && <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">En pause</span>}
                      </div>
                    </div>
                  </div>
                  {!desktop && (<>
                  <div className="va-client-360-actions grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" aria-label="Actions pour cet adhérent">
                    {quickActions.includes('message') && <button type="button" onClick={() => setMemberTab('communication')} className="va-client-360-action"><MessageCircleIcon size={16} /> Message</button>}
                    {quickActions.includes('program') && <button type="button" onClick={() => handleEditProgram(selectedProfile)} className="va-client-360-action"><DumbbellIcon size={16} /> Programme</button>}
                    {quickActions.includes('plan') && <button type="button" onClick={openPlanningForMember} className="va-client-360-action va-client-360-secondary"><CalendarIcon size={16} /> Planifier</button>}
                    {quickActions.includes('note') && <button type="button" onClick={() => { setMemberTab('followup'); requestAnimationFrame(() => notesRef.current?.focus()); }} className="va-client-360-action va-client-360-secondary"><FileTextIcon size={16} /> Ajouter une note</button>}
                    <details className="va-client-360-more"><summary aria-label="Actions supplémentaires">Plus ···</summary><div>
                      {quickActions.includes('plan') && <button type="button" className="va-client-360-xs-action" onClick={openPlanningForMember}>Planifier une séance</button>}
                      {quickActions.includes('note') && <button type="button" className="va-client-360-xs-action" onClick={() => { setMemberTab('followup'); requestAnimationFrame(() => notesRef.current?.focus()); }}>Ajouter une note</button>}
                      <button type="button" onClick={() => { setMemberTab('administrative'); setAdminSection('profile'); }}>Profil et administration</button>
                      <button type="button" onClick={() => openMemberEditor(selectedProfile)}>Modifier le profil</button>
                    </div></details>
                  </div>
                  </>)}
                  
                  
                  {newAccessMemberId === Number(selectedProfile.id) && <div role="status" className="rounded-xl border border-emerald-200 lg:border-indigo-200 bg-emerald-50 lg:bg-indigo-50 p-4 text-sm text-emerald-950 lg:text-indigo-950">
                    <p className="font-semibold">✓ Adhérent créé · {selectedProfile.name}</p>
                    <p className="mt-1 break-all">{selectedProfile.email}</p>
                    <p className="mt-1">Coach référent : {assignedCoach?.name || (resolveAccountType(state.currentClub) === 'studio' ? 'À attribuer' : 'Indisponible')}</p>
                    <p className="mt-2 leading-6">{newAccessEmailStatus === 'sent' ? 'Email d’accès envoyé : l’adhérent peut définir son mot de passe.' : 'Compte créé, email d’accès non envoyé. Le compte reste disponible ; renvoyez l’email ci-dessous.'}</p>
                    <p className="mt-2 break-all">Lien de connexion : {window.location.origin}/login</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" onClick={handleCopyLoginLink} className="min-h-11 rounded-lg px-3 font-semibold underline focus-visible:ring-2 focus-visible:ring-emerald-800 lg:focus-visible:ring-indigo-800">Copier le lien de connexion</button>
                      <button type="button" onClick={handleResetMemberPassword} disabled={isSendingAccessEmail || !selectedProfile.email} aria-busy={isSendingAccessEmail} className="min-h-11 rounded-lg px-3 font-semibold underline focus-visible:ring-2 focus-visible:ring-emerald-800 lg:focus-visible:ring-indigo-800 disabled:opacity-50">{isSendingAccessEmail ? 'Envoi…' : 'Renvoyer l’accès'}</button>
                      <button type="button" onClick={() => { setMemberTab('administrative'); setAdminSection('profile'); setNewAccessMemberId(null); }} className="min-h-11 rounded-lg px-3 font-semibold underline focus-visible:ring-2 focus-visible:ring-emerald-800 lg:focus-visible:ring-indigo-800">Voir l’accès dans le dossier</button>
                    </div>
                  </div>}
                  {/* Assistants IA */}
                  {desktop && memberTab === 'overview' && <MemberOverview member={selectedProfile} state={state} setState={setState} onNavigate={navigateMemberSection} onPlan={openPlanningForMember} onProgram={() => handleEditProgram(selectedProfile)} />}
                  {!desktop && memberTab === 'overview' && (
                  <section className="space-y-8">
                    {selectedProfile.firebaseUid && <CoachFollowup memberUid={selectedProfile.firebaseUid} programs={[]} section="summary" />}
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-zinc-700">Repères utiles pour le suivi</p>
                          <h3 className="mt-1 text-lg font-semibold text-zinc-900">Vue d’ensemble</h3>
                        </div>
                        {selectedProfile.status === 'paused' ? (
                          <span className="rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-800">En pause</span>
                        ) : <span className="rounded-full bg-emerald-100 lg:bg-indigo-100 px-2.5 py-1 text-xs font-medium text-emerald-900 lg:text-indigo-900">{stats.subscription ? subscriptionStatusLabels[stats.subscription.status] : 'Actif'}</span>}
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
                        {adminSections.some(section => section.id === 'billing') && <div className="rounded-xl border border-zinc-200 bg-white p-3.5">
                          <p className="text-xs font-medium text-zinc-700">Abonnement</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900">{stats.subscription?.planName || 'Aucun abonnement actif'}</p>
                          {stats.subscription && <p className="mt-1 text-xs text-zinc-700">{stats.subscription.price.toFixed(2)} € · {stats.subscription.billingCycle === 'yearly' ? 'annuel' : stats.subscription.billingCycle === 'monthly' ? 'mensuel' : 'paiement unique'}</p>}
                        </div>}
                        <div className="rounded-xl border border-zinc-200 bg-white p-3.5">
                          <p className="text-xs font-medium text-zinc-700">Coach référent</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900">{assignedCoach?.name || (resolveAccountType(state.currentClub) === 'studio' ? 'Coach à attribuer' : 'Référent indisponible')}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-white p-3.5">
                          <p className="text-xs font-medium text-zinc-700">Objectif principal</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900">{selectedProfile.objectifs?.[0] || 'À définir'}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-white p-3.5">
                          <p className="text-xs font-medium text-zinc-700">Dernière mesure</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900">{clientFacts.lastBodyRecord ? `${clientFacts.lastBodyRecord.weight} kg` : 'Aucune mesure enregistrée'}</p>
                          {clientFacts.lastBodyRecord && <p className="mt-1 text-xs text-zinc-700">{new Date(clientFacts.lastBodyRecord.date).toLocaleDateString('fr-FR')}</p>}
                        </div>
                      </div>
                      {(clientFacts.lastNote?.content || selectedProfile.notes?.trim()) && <p className="mt-3 line-clamp-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-800"><span className="font-semibold">Dernière note · </span>{clientFacts.lastNote?.content || selectedProfile.notes}</p>}
                    </div>

                  </section>
                  )}
                  {memberTab === 'onboarding' && selectedProfile.firebaseUid && <OnboardingDetail state={state} setState={setState} memberUid={selectedProfile.firebaseUid} />}
                  {memberTab === 'retention' && selectedProfile.firebaseUid && <RetentionDetail state={state} setState={setState} memberUid={selectedProfile.firebaseUid} light={!desktop} />}
                  <MemberFollowup
memberTab={memberTab}
                    selectedProfile={selectedProfile}
                    state={state}
                    notesRef={notesRef}
                    coachingNotes={coachingNotes}
                    setCoachingNotes={setCoachingNotes}
                    coachingNoteDate={coachingNoteDate}
                    setCoachingNoteDate={setCoachingNoteDate}
                    handleSaveCoachingNotes={handleSaveCoachingNotes}
                    isSavingCoachingNotes={isSavingCoachingNotes}
                    handleDeleteCoachingNote={handleDeleteCoachingNote}
                  />

                  <MemberNutrition
memberTab={memberTab}
                    isGeneratingNutrition={isGeneratingNutrition}
                    state={state}
                    selectedProfile={selectedProfile}
                    setNutritionPlan={setNutritionPlan}
                    setShowNutritionLog={setShowNutritionLog}
                    openNutritionTargetsModal={openNutritionTargetsModal}
                    setShowAssignNutritionTemplateModal={setShowAssignNutritionTemplateModal}
                    showToast={showToast}
                  />
                  {/* AGENDA & RÉSERVATIONS TAB */}
                  <MemberPlanning
memberTab={memberTab}
                    selectedProfile={selectedProfile}
                    openPlanningForMember={openPlanningForMember}
                    state={state}
                    bookingStatusFilter={bookingStatusFilter}
                    setBookingStatusFilter={setBookingStatusFilter}
                    bookingTypeFilter={bookingTypeFilter}
                    setBookingTypeFilter={setBookingTypeFilter}
                    showToast={showToast}
                  />

                  {/* DOCUMENTS (OFFICIELS & DRIVE) */}
                  {memberTab === 'administrative' && (
                    <nav className="va-client-360-admin-nav m360-legacy-admin" aria-label="Rubriques administratives">
                      {adminSections.map(section => <button type="button" key={section.id} onClick={() => setAdminSection(section.id)} aria-current={adminSection === section.id ? 'page' : undefined}>{section.label}</button>)}
                    </nav>
                  )}
                  <MemberDocuments
memberTab={memberTab}
                    adminSection={adminSection}
                    officialDocumentCategory={officialDocumentCategory}
                    setOfficialDocumentCategory={setOfficialDocumentCategory}
                    handleOfficialDocumentUpload={handleOfficialDocumentUpload}
                    isUploadingOfficialDocument={isUploadingOfficialDocument}
                    selectedProfile={selectedProfile}
                    state={state}
                    handleDeleteOfficialDocument={handleDeleteOfficialDocument}
                    handleDriveFileUpload={handleDriveFileUpload}
                    isUploadingDriveFile={isUploadingDriveFile}
                    uploadProgress={uploadProgress}
                    showToast={showToast}
                    setConfirmDeleteFileId={setConfirmDeleteFileId}
                  />

                  {/* FINANCES & FACTURATION */}
                  <MemberBilling
state={state}
                    memberTab={memberTab}
                    adminSection={adminSection}
                    selectedProfile={selectedProfile}
                    billingBusy={billingBusy}
                    handleUpdateCredits={handleUpdateCredits}
                    handleUpdateSessionCredits={handleUpdateSessionCredits}
                    stats={stats}
                    isEditingSub={isEditingSub}
                    subStartDate={subStartDate}
                    setSubStartDate={setSubStartDate}
                    subCommitmentDate={subCommitmentDate}
                    setSubCommitmentDate={setSubCommitmentDate}
                    handleFileUpload={handleFileUpload}
                    subContractUrl={subContractUrl}
                    setSubContractUrl={setSubContractUrl}
                    setIsEditingSub={setIsEditingSub}
                    handleUpdateSubscription={handleUpdateSubscription}
                    isAssigningPlan={isAssigningPlan}
                    billingMode={billingMode}
                    setBillingMode={setBillingMode}
                    selectedPlanId={selectedPlanId}
                    setSelectedPlanId={setSelectedPlanId}
                    setIsAssigningPlan={setIsAssigningPlan}
                    handleAssignSubscription={handleAssignSubscription}
                    setShowOnboardingEmailModal={setShowOnboardingEmailModal}
                    handleCopyPaymentLink={handleCopyPaymentLink}
                    isGeneratingLink={isGeneratingLink}
                    setIsAddingPayment={setIsAddingPayment}
                    isAddingPayment={isAddingPayment}
                    newPayment={newPayment}
                    setNewPayment={setNewPayment}
                    handleAddPayment={handleAddPayment}
                    isStripeConnected={isStripeConnected}
                    handleCharge={handleCharge}
                    isCharging={isCharging}
                    handleGeneratePaymentLink={handleGeneratePaymentLink}
                    isGeneratingLinkForPayment={isGeneratingLinkForPayment}
                    handleRemind={handleRemind}
                    handleManualPayment={handleManualPayment}
                    handleDownloadInvoice={handleDownloadInvoice}
                    handleGenerateInvoice={handleGenerateInvoice}
                  />

                  {/* COACHING HISTORY */}
                  <MemberProfile
memberTab={memberTab}
                    adminSection={adminSection}
                    selectedProfile={selectedProfile}
                    assignedCoach={assignedCoach}
                    state={state}
                    handleCopyLoginLink={handleCopyLoginLink}
                    handleResetMemberPassword={handleResetMemberPassword}
                    isSendingAccessEmail={isSendingAccessEmail}
                    stats={stats}
                    handleEditProgram={handleEditProgram}
                  />
<MemberProgress
desktop={desktop}
                    memberTab={memberTab}
                    newScan={newScan}
                    setNewScan={setNewScan}
                    handleSaveScan={handleSaveScan}
                    state={state}
                    selectedProfile={selectedProfile}
                    selectedDateForPhoto={selectedDateForPhoto}
                    setSelectedDateForPhoto={setSelectedDateForPhoto}
                    setSelectedEvolutionPhoto={setSelectedEvolutionPhoto}
                    weightHistory={weightHistory}
                    chartData={chartData}
                    CustomTooltip={CustomTooltip}
                    stats={stats}
                    handleDeleteScan={handleDeleteScan}
                  />
<MemberCoaching
desktop={desktop}
                    coachingView={coachingView}
                    memberTab={memberTab}
                    selectedProfile={selectedProfile}
                    state={state}
                    stats={stats}
                    hasDuration={hasDuration}
                    progCompletion={progCompletion}
                    currentWeek={currentWeek}
                    currentSession={currentSession}
                    showToast={showToast}
                    setState={setState}
                    setShowProgramOptions={setShowProgramOptions}
                    showProgramOptions={showProgramOptions}
                    setShowAssignProgramTemplateModal={setShowAssignProgramTemplateModal}
                    canUseAI={canUseAI}
                    openAIGeneratorModal={openAIGeneratorModal}
                    isGeneratingProgram={isGeneratingProgram}
                    handleEditProgram={handleEditProgram}
                    visibleCoachingLogs={visibleCoachingLogs}
                    setSelectedLog={setSelectedLog}
                    setVisibleCoachingLogs={setVisibleCoachingLogs}
                    isGeneratingReport={isGeneratingReport}
                    generatedReport={generatedReport}
                    handleGenerateReport={handleGenerateReport}
                    isDetectingStagnation={isDetectingStagnation}
                    stagnationResult={stagnationResult}
                    handleDetectStagnation={handleDetectStagnation}
                  />
                    
                  <MemberMessages
memberTab={memberTab}
                    selectedProfile={selectedProfile}
                    state={state}
                    setState={setState}
                    showToast={showToast}
                  />
                  </ErrorBoundary>
                </div>
              </div>

            </motion.div>
          </motion.div>
        );
      })()}
      </AnimatePresence>
      </Member360Mount>

      {!desktop && selectedProfile && memberTab === 'followup' && coachingNotes.trim() && createPortal(
        <div className="va-client-360-floating-save">
          <button type="button" onClick={handleSaveCoachingNotes} disabled={isSavingCoachingNotes || !coachingNotes.trim()} className="min-h-11 w-full rounded-xl bg-emerald-800 lg:bg-indigo-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-950 lg:focus-visible:ring-indigo-950">
            {isSavingCoachingNotes ? 'Enregistrement…' : 'Enregistrer la note'}
          </button>
        </div>, document.body
      )}

      {createPortal(
      <AnimatePresence>
      {isEditingInfo && selectedProfile && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="m360-overlay fixed inset-0 bg-black/30 backdrop-blur-sm z-[600] flex items-center justify-center p-4"
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
                <p className="text-[10px] text-emerald-500 lg:text-indigo-500 font-black uppercase tracking-widest mb-6">Informations de base de l'athlète</p>
              </div>

            <div className="space-y-5 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0 pb-4">
              <div className="flex justify-center mb-6">
                <div className="relative group w-24 h-24 rounded-[32px] bg-gradient-to-br from-emerald-500 lg:from-indigo-500 to-emerald-600 lg:to-indigo-600 flex items-center justify-center text-4xl font-black shadow-2xl overflow-hidden">
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
                    className="w-full bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-xl p-4 text-sm text-zinc-900 focus:border-emerald-500 lg:focus:border-indigo-500 outline-none appearance-none shadow-sm"
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

              {desktop && <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1 text-xs font-semibold text-zinc-600">Téléphone<Input type="tel" value={editInfoData.phone || ''} onChange={e => setEditInfoData({...editInfoData, phone:e.target.value})} /></label>
                <label className="space-y-1 text-xs font-semibold text-zinc-600">Adresse<Input value={editInfoData.address || ''} onChange={e => setEditInfoData({...editInfoData, address:e.target.value})} /></label>
              </div>}
              {canAssignCoach && (
                <div className="space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <label className="text-xs font-black uppercase text-zinc-500 tracking-widest">Coach responsable</label>
                  <div className="flex gap-2">
                    <select
                      className="min-w-0 flex-1 bg-white border border-zinc-200 rounded-xl p-3 text-sm text-zinc-900 focus:border-emerald-500 lg:focus:border-indigo-500 outline-none"
                      value={coachAssignment}
                      onChange={event => setCoachAssignment(event.target.value)}
                    >
                      <option value="">Aucun coach affecté</option>
                      {state.users.filter(user => user.role === 'coach' && user.clubId === state.currentClub?.id && !user.isSuspended && user.status !== 'paused').map(coach => (
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase text-zinc-500 transition-all border ${isSelected ? 'bg-emerald-500 lg:bg-indigo-500 border-emerald-500 lg:border-indigo-500 text-zinc-900' : 'bg-zinc-50 backdrop-blur-xl  text-zinc-900 hover:border-emerald-500/50 lg:hover:border-indigo-500/50 shadow-sm'}`}
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
                  className="w-full bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-xl p-4 text-sm text-zinc-900 focus:border-emerald-500 lg:focus:border-indigo-500 outline-none h-24 resize-none shadow-sm"
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
            {canShowClient360AccountActions(state.currentClub, assignmentActor) && <div className="pt-2 shrink-0 flex flex-col gap-2">
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
                className={selectedProfile?.status === 'paused' ? "!bg-emerald-500/10 lg:!bg-indigo-500/10 !text-emerald-600 lg:!text-indigo-600 hover:!bg-emerald-500/20 lg:hover:!bg-indigo-500/20" : "!bg-orange-500/10 !text-orange-600 hover:!bg-orange-500/20"}
              >
                {selectedProfile?.status === 'paused' ? "RÉACTIVER LE PROFIL" : "METTRE EN PAUSE"}
              </Button>
              <Button variant="secondary" fullWidth onClick={handleDeleteMember} className="!bg-red-500/10 !text-red-500 hover:!bg-red-500/20">
                SUPPRIMER LE MEMBRE
              </Button>
            </div>}
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
          className="m360-overlay fixed inset-0 bg-black/30 backdrop-blur-sm z-[600] flex items-center justify-center p-4"
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
              <p className="text-[10px] text-emerald-500 lg:text-indigo-500 font-black uppercase tracking-widest mb-8">Ajuster avant génération</p>

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
          className="m360-overlay fixed inset-0 bg-black/30 backdrop-blur-sm z-[600] flex items-center justify-center p-4"
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

      {isAddingMember && <AddMemberDialog data={newMemberData} setData={setNewMemberData}
        coachOptions={getMemberCreationCoachOptions(state.currentClub, state.user, state.users)}
        busy={isCreatingMember} onSave={handleCreateMember} onClose={() => setIsAddingMember(false)} />}

      {createPortal(
      <AnimatePresence>
      {nutritionPlan && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="m360-overlay fixed inset-0 bg-black/30 backdrop-blur-sm z-[700] flex items-start justify-center p-0 md:p-8 overflow-y-auto"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-[1450px] bg-zinc-100 backdrop-blur-2xl min-h-screen md:min-h-0 md:rounded-[48px] border border-emerald-500/20 lg:border-indigo-500/20 shadow-[0_0_100px_rgba(16,185,129,0.1)] relative overflow-hidden my-0 md:my-8 p-8 md:p-12"
          >
            <button onClick={() => setNutritionPlan(null)} className="m360-overlay fixed top-4 right-4 md:top-10 md:right-10 p-4 bg-zinc-100 backdrop-blur-md rounded-full text-zinc-500 hover:text-zinc-900 z-[800] border border-zinc-200 hover:bg-red-50 hover:border-red-200 transition-all shadow-xl"><XIcon size={24} /></button>
            
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-emerald-400 lg:from-indigo-400 to-emerald-600 lg:to-indigo-600 rounded-2xl text-zinc-900 shadow-[0_0_20px_rgba(16,185,129,0.4)]"><CheckIcon size={24} /></div>
                  <div>
                    <h2 className="text-3xl font-black text-zinc-900 uppercase italic tracking-tight">Plan Nutritionnel</h2>
                    <p className="text-[10px] text-emerald-400 lg:text-indigo-400 font-black uppercase tracking-widest">
                      {nutritionPlan.aiGenerated ? "Préparé avec Velatra AI" : "Plan actif de l’adhérent"}
                    </p>
                  </div>
               </div>
               <Button 
                 variant="secondary" 
                 onClick={() => {
                   setNewNutritionTemplateName(`Modèle ${selectedProfile?.name?.split(' ')[0] || ''} - ${nutritionPlan.targetCalories}kcal`);
                   setShowSaveNutritionTemplateModal(true);
                 }} 
                 className="!py-3 !text-[11px] !rounded-xl !bg-emerald-500/10 lg:!bg-indigo-500/10 hover:!bg-emerald-500/20 lg:hover:!bg-indigo-500/20 !text-emerald-600 lg:!text-indigo-600 border border-emerald-500/30 lg:border-indigo-500/30 whitespace-nowrap self-start md:self-auto font-black italic tracking-wider"
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
                <div className="text-2xl font-black text-emerald-500 lg:text-indigo-500">{nutritionPlan.protein}g</div>
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
                      <span className="text-[10px] font-black text-emerald-400 lg:text-indigo-400 bg-emerald-500/10 lg:bg-indigo-500/10 px-3 py-1 rounded-full uppercase tracking-widest">{repas.calories} kcal</span>
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
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${item.checked ? 'bg-emerald-500 lg:bg-indigo-500 border-emerald-500 lg:border-indigo-500 text-white' : 'border-zinc-200 bg-zinc-50'}`}>
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
        <div className="m360-overlay fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
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
        <div className="m360-overlay fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setShowNutritionLog(false)}>
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
              <button onClick={() => setShowNutritionLog(false)} className="p-2 bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-full hover:bg-emerald-500/10 lg:hover:bg-indigo-500/10 hover:text-emerald-500 lg:hover:text-indigo-500 transition-colors text-zinc-500 shadow-sm">
                <XIcon size={20} />
              </button>
            </div>
            
            <React.Suspense fallback={<p role="status" className="p-5 text-sm text-zinc-700">Ouverture du journal nutritionnel…</p>}>
              <ClientNutritionView state={state} showToast={showToast} memberId={Number(selectedProfile.id)} readOnly={true} />
            </React.Suspense>
          </motion.div>
        </div>,
        document.body
      )}

      {selectedLog && createPortal(
        <div className="m360-overlay fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedLog(null)}>
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
              <button onClick={() => setSelectedLog(null)} className="p-2 bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-full hover:bg-emerald-500/10 lg:hover:bg-indigo-500/10 hover:text-emerald-500 lg:hover:text-indigo-500 transition-colors text-zinc-500 shadow-sm">
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
                  <div className="p-4 bg-emerald-500/5 lg:bg-indigo-500/5 rounded-2xl border border-emerald-500/10 lg:border-indigo-500/10">
                    <p className="text-sm text-zinc-600 leading-relaxed italic">"{selectedLog.notes}"</p>
                  </div>
                </div>
              )}

              {selectedLog.rpe && (
                <div>
                  <div className="text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 mb-2">Difficulté ressentie (RPE)</div>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-black text-emerald-500 lg:text-indigo-500">{selectedLog.rpe}</div>
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
        <div className="m360-overlay fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
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
        <div className="m360-overlay fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
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
            className="m360-overlay fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
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
        <div className="m360-overlay fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 lg:bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="text-lg font-black text-zinc-900 uppercase italic flex items-center gap-2">
                <BotIcon size={20} className="text-emerald-500 lg:text-indigo-500" /> Paramètres IA
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
                  className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm rounded-xl px-4 py-3 outline-none focus:border-emerald-500 lg:focus:border-indigo-500 focus:ring-1 focus:ring-emerald-500 lg:focus:ring-indigo-500 transition-all font-medium"
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
                  className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm rounded-xl px-4 py-3 outline-none focus:border-emerald-500 lg:focus:border-indigo-500 focus:ring-1 focus:ring-emerald-500 lg:focus:ring-indigo-500 transition-all font-medium min-h-[80px]"
                  value={aiGeneratorParams.extraNotes}
                  onChange={(e) => setAiGeneratorParams({...aiGeneratorParams, extraNotes: e.target.value})}
                />
              </div>

              <div className="pt-2">
                <label className="block text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 mb-2 ml-1">Options supplémentaires</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${aiGeneratorParams.includeWarmup ? 'border-emerald-500 lg:border-indigo-500 bg-emerald-500/10 lg:bg-indigo-500/10' : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100'}`}>
                    <input type="checkbox" className="hidden" checked={aiGeneratorParams.includeWarmup} onChange={(e) => setAiGeneratorParams({...aiGeneratorParams, includeWarmup: e.target.checked})} />
                    <div className={`w-4 h-4 rounded shadow-sm border flex shrink-0 items-center justify-center transition-all ${aiGeneratorParams.includeWarmup ? 'bg-emerald-500 lg:bg-indigo-500 border-emerald-500 lg:border-indigo-500' : 'bg-white border-zinc-300'}`}>
                      {aiGeneratorParams.includeWarmup && <CheckIcon size={12} className="text-white" />}
                    </div>
                    <span className="text-[9px] font-bold text-zinc-900 uppercase">Échauffement / Mobilité</span>
                  </label>
                  
                  <label className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${aiGeneratorParams.includeCardioFinisher ? 'border-emerald-500 lg:border-indigo-500 bg-emerald-500/10 lg:bg-indigo-500/10' : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100'}`}>
                    <input type="checkbox" className="hidden" checked={aiGeneratorParams.includeCardioFinisher} onChange={(e) => setAiGeneratorParams({...aiGeneratorParams, includeCardioFinisher: e.target.checked})} />
                    <div className={`w-4 h-4 rounded shadow-sm border flex shrink-0 items-center justify-center transition-all ${aiGeneratorParams.includeCardioFinisher ? 'bg-emerald-500 lg:bg-indigo-500 border-emerald-500 lg:border-indigo-500' : 'bg-white border-zinc-300'}`}>
                      {aiGeneratorParams.includeCardioFinisher && <CheckIcon size={12} className="text-white" />}
                    </div>
                    <span className="text-[9px] font-bold text-zinc-900 uppercase">Finisher Cardio</span>
                  </label>
                  
                  <label className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${aiGeneratorParams.includeCoreFocus ? 'border-emerald-500 lg:border-indigo-500 bg-emerald-500/10 lg:bg-indigo-500/10' : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100'}`}>
                    <input type="checkbox" className="hidden" checked={aiGeneratorParams.includeCoreFocus} onChange={(e) => setAiGeneratorParams({...aiGeneratorParams, includeCoreFocus: e.target.checked})} />
                    <div className={`w-4 h-4 rounded shadow-sm border flex shrink-0 items-center justify-center transition-all ${aiGeneratorParams.includeCoreFocus ? 'bg-emerald-500 lg:bg-indigo-500 border-emerald-500 lg:border-indigo-500' : 'bg-white border-zinc-300'}`}>
                      {aiGeneratorParams.includeCoreFocus && <CheckIcon size={12} className="text-white" />}
                    </div>
                    <span className="text-[9px] font-bold text-zinc-900 uppercase">Focus Abdos</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 mb-1 ml-1">Durée cible de la séance</label>
                <select 
                  className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm rounded-xl px-4 py-3 outline-none focus:border-emerald-500 lg:focus:border-indigo-500 focus:ring-1 focus:ring-emerald-500 lg:focus:ring-indigo-500 transition-all font-medium"
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
              
              <Button variant="primary" fullWidth onClick={handleGenerateProgram} className="!py-4 !mt-6 shadow-xl shadow-emerald-500/20 lg:shadow-indigo-500/20 text-xs">
                <SparklesIcon size={16} className="mr-2 inline" /> LANCER LA GÉNÉRATION
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CSV IMPORT MODAL */}
      {isCsvImportModalOpen && createPortal(
        <div className="m360-overlay fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
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
                            className="w-full bg-white border border-zinc-200 rounded-lg pl-9 pr-3 py-2 text-xs font-medium focus:border-emerald-500 lg:focus:border-indigo-500 outline-none"
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
                            className="text-[10px] font-bold text-emerald-500 lg:text-indigo-500 hover:text-emerald-600 lg:hover:text-indigo-600 underline uppercase shrink-0"
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
                            className={`p-4 rounded-2xl border transition-all flex items-start gap-4 ${isSelected ? 'border-emerald-500 lg:border-indigo-500 bg-emerald-500/5 lg:bg-indigo-500/5' : 'border-zinc-200 bg-white opacity-60'} ${!hasEmail ? 'opacity-50 border-red-200 bg-red-50' : 'cursor-pointer hover:border-emerald-500/40 lg:hover:border-indigo-500/40'}`}
                            onClick={() => {
                              if (!hasEmail) return;
                              setSelectedClientsToImport(prev => 
                                prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
                              );
                            }}
                          >
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 shrink-0 transition-colors ${isSelected ? 'bg-emerald-500 lg:bg-indigo-500 border-emerald-500 lg:border-indigo-500 text-white' : 'border-zinc-300'}`}>
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
                  <div className="p-5 rounded-2xl bg-emerald-50 lg:bg-indigo-50 border border-emerald-200 lg:border-indigo-200 text-emerald-800 lg:text-indigo-800">
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
        <div className="m360-overlay fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 lg:bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            
            <div className="flex justify-between items-center mb-6 relative z-10">
              <div>
                <h3 className="text-xl font-black text-zinc-900 uppercase italic flex items-center gap-2">
                  <LayersIcon size={20} className="text-emerald-500 lg:text-indigo-500" /> Modèles de programmes
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
                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs rounded-xl pl-10 pr-4 py-3 outline-none focus:border-emerald-500 lg:focus:border-indigo-500 focus:ring-1 focus:ring-emerald-500 lg:focus:ring-indigo-500 transition-all font-bold"
              />
            </div>

            {/* Liste scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-1 space-y-3 z-10 pb-4">
              {state.presets && state.presets.filter(p => !programPresetSearch || p.name.toLowerCase().includes(programPresetSearch.toLowerCase()) || (p.remarks || '').toLowerCase().includes(programPresetSearch.toLowerCase())).length > 0 ? (
                state.presets.filter(p => !programPresetSearch || p.name.toLowerCase().includes(programPresetSearch.toLowerCase()) || (p.remarks || '').toLowerCase().includes(programPresetSearch.toLowerCase())).map((preset) => (
                  <div key={preset.id} className="p-4 rounded-2xl border border-zinc-200 bg-white hover:border-emerald-500/50 lg:hover:border-indigo-500/50 hover:shadow-md transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
        <div className="m360-overlay fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 lg:bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            
            <div className="flex justify-between items-center mb-6 relative z-10">
              <div>
                <h3 className="text-xl font-black text-zinc-900 uppercase italic flex items-center gap-2">
                  <CheckIcon size={20} className="text-emerald-500 lg:text-indigo-500" /> Modèles nutritionnels
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
                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs rounded-xl pl-10 pr-4 py-3 outline-none focus:border-emerald-500 lg:focus:border-indigo-500 focus:ring-1 focus:ring-emerald-500 lg:focus:ring-indigo-500 transition-all font-bold"
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
                    <div key={preset.id || idx} className="p-4 rounded-2xl border border-zinc-200 bg-white hover:border-emerald-500/50 lg:hover:border-indigo-500/50 hover:shadow-md transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
                            <div className="text-[10px] text-emerald-500 lg:text-indigo-500 font-bold mb-0.5">Prot</div>
                            <div className="text-xs font-black text-emerald-600 lg:text-indigo-600">{preset.protein}g</div>
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
        <div className="m360-overlay fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 lg:bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            
            <div className="flex justify-between items-center mb-4 relative z-10">
              <h3 className="text-sm font-black text-zinc-900 uppercase italic flex items-center gap-2">
                <SaveIcon size={18} className="text-emerald-500 lg:text-indigo-500" /> Sauvegarder comme modèle
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
