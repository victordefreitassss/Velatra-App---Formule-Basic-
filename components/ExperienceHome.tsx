import React, { useEffect, useMemo, useState } from 'react';
import type { AppState, Booking, User } from '../types';
import { resolvePresentationStrategy, resolveProductExperience, type HomeSection, type ProductFormat } from '../productExperience';
import { resolveExperienceCapabilities } from '../productExperience';
import { getAllContextItems } from './appShellHelpers';
import { useHomeDestination } from './useHomeDestination';
import { usePulse } from '../pulse/usePulse';
import { PulseList } from '../pulse/PulseList';
import { selectHomeData, selectHomeFinance, selectCurrentProgram, type FollowupPriority, type HomeDestination } from './experienceHomeSelectors';
import { useProductFormat } from './useProductFormat';
import { Card, Button, Input } from './UI';
import { apiFetch } from '../firebase';
import './experience-home.css';
import { Users, CalendarDays, ClipboardList, Activity, Target, Dumbbell, MessageCircle, FolderOpen, ArrowUpRight, LayoutGrid, FileText } from 'lucide-react';
import { DesktopDashboard } from './desktop/DesktopDashboard';
import { SectionHeader, KpiCard, ActionPill, DashboardCard, EmptyState } from './desktop/DesktopUI';

const LegacyHome = React.lazy(() => import('./CoachDashboard').then(module => ({ default: module.CoachDashboard })));
interface Props { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; showToast: (message: string, type?: 'success' | 'error' | 'info') => void; }
type Data = ReturnType<typeof selectHomeData>;
type Sections = Partial<Record<HomeSection, React.ReactNode>>;
const readableDate = (date: string) => new Date(date).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'short' });
const readableTime = (date: string) => new Date(date).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
const euros = (amount: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);

function Section({ id, title, children, action }: { id: HomeSection; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  const icon = { agenda: CalendarDays, actions: Activity, clients: Users, sales: Target, business: Activity, coaching: Dumbbell, messages: MessageCircle, tasks: ClipboardList, team: Users, shortcuts: LayoutGrid }[id];
  const Icon = icon;
  return <section className="min-w-0" data-home-section={id} aria-labelledby={`home-${id}`}><Card className="h-full min-w-0 space-y-4">
    <SectionHeader id={`home-${id}`} title={title} action={action} icon={<Icon size={19} />} />{children}
  </Card></section>;
}
const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-zinc-600">{children}</p>;
const LinkButton = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => <Button variant="ghost" className="min-h-11 text-sm" onClick={onClick}>{children}</Button>;

function HomeComposition({ title, description, experience, format, sections }: {
  title: string; description: string; experience: Data['experience']; format: ProductFormat; sections: Sections;
}) {
  const strategy = resolvePresentationStrategy(experience, format);
  const keys = strategy.sections.filter(key => sections[key]);
  const side = format === 'largeDesktop' ? keys.filter(key => ['agenda', 'messages', 'shortcuts'].includes(key)) : [];
  return <div className="va-experience-home space-y-5 pb-20" data-experience={experience} data-format={format} data-density={strategy.density}>
    <header className="space-y-2"><h1>{title}</h1><p className="text-sm text-zinc-600">{description}</p></header>
    <div className={format === 'largeDesktop' ? 'va-experience-large-grid' : 'grid min-w-0 gap-5 md:grid-cols-2'}>
      {format === 'largeDesktop' ? <>
        <div className="min-w-0 space-y-5" data-home-zone="work">{keys.filter(key => !side.includes(key)).map(key => <React.Fragment key={key}>{sections[key]}</React.Fragment>)}</div>
        <aside className="min-w-0 space-y-5" aria-label="Agenda et accès rapides" data-home-zone="agenda">{side.map(key => <React.Fragment key={key}>{sections[key]}</React.Fragment>)}</aside>
      </> : keys.map(key => <div key={key} className={key === 'clients' && experience === 'STUDIO_COACH' && format !== 'phone' ? 'min-w-0 md:col-span-2' : 'min-w-0'}>{sections[key]}</div>)}
    </div>
  </div>;
}

export function SoloOwnerHome(props: { format: ProductFormat; sections: Sections; name: string }) {
  return <HomeComposition {...props} experience="SOLO_OWNER" title={`Bonjour, ${props.name}`} description={props.format === 'phone' ? 'Votre prochaine séance, vos clients et vos relances, à portée de main.' : 'Votre cockpit : actions du jour, vente, activité et coaching.'} />;
}
export function StudioManagerHome(props: { format: ProductFormat; sections: Sections; name: string; ownerVariant?: boolean }) {
  return <HomeComposition {...props} experience={props.ownerVariant ? 'STUDIO_OWNER' : 'STUDIO_MANAGER'} title={props.ownerVariant ? 'Piloter mon Studio' : 'Superviser le Studio'} description={props.format === 'phone' ? 'Actions à traiter, planning du jour et équipe.' : 'L’activité du Studio, les clients à suivre, les prospects et les affectations de l’équipe.'} />;
}
export function StudioCoachHome(props: { format: ProductFormat; sections: Sections; name: string }) {
  return <HomeComposition {...props} experience="STUDIO_COACH" title={props.format === 'phone' ? 'Ma journée de coaching' : 'Préparer mon coaching'} description={props.format === 'phone' ? 'Votre agenda, vos actions et vos messages.' : 'Vos clients affectés, leurs programmes et votre planning.'} />;
}

function ResolvedHome({ state, setState, showToast }: Props) {
  const format = useProductFormat();
  const open = useHomeDestination(state, setState);
  const pulse = usePulse(state, { limit: format === 'phone' ? 5 : 8 });
  const [now, setNow] = useState(() => new Date());
  const [query, setQuery] = useState('');
  const [portfolioPage, setPortfolioPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const identity = `${state.user?.clubId}/${state.user?.firebaseUid}/${state.user?.role}`;
  const [followup, setFollowup] = useState<{ identity: string; items: FollowupPriority[]; status: 'loading' | 'ready' | 'error' }>({ identity: '', items: [], status: 'loading' });
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 60_000);
    window.addEventListener('focus', update);
    return () => { clearInterval(timer); window.removeEventListener('focus', update); };
  }, []);
  useEffect(() => {
    if (!resolveExperienceCapabilities(state.currentClub, state.user || {}).clients.runtimeUsable) {
      setFollowup({ identity, items: [], status: 'ready' });
      return;
    }
    const controller = new AbortController();
    setFollowup({ identity, items: [], status: 'loading' });
    apiFetch('/api/followup/priorities', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Suivi indisponible');
      const result = await response.json();
      if (!controller.signal.aborted) setFollowup({ identity, items: Array.isArray(result.priorities) ? result.priorities : [], status: 'ready' });
    }).catch(() => { if (!controller.signal.aborted) setFollowup({ identity, items: [], status: 'error' }); });
    return () => controller.abort();
  }, [identity, retry]);
  useEffect(() => { setQuery(''); setPortfolioPage(0); }, [identity]);
  const priorities = useMemo(() => followup.identity === identity ? followup.items : [], [followup, identity]);
  const data = useMemo(() => selectHomeData(state, priorities, now), [state.user, state.currentClub, state.users, state.programs, state.logs, state.tasks, state.bookings, state.prospects, state.messages, priorities, now]);
  const canSeeFinance = state.user?.role === 'owner' && data.caps.finances.usable;
  const finance = useMemo(() => selectHomeFinance(state, now), [state.user, state.currentClub, canSeeFinance ? state.subscriptions : null, canSeeFinance ? state.payments : null, now]);
  const allowedPages = getAllContextItems({ role: state.user?.role || 'member', club: state.currentClub }).map(item => item.id);
  const launch = (member: User) => {
    if (!data.caps.coaching.usable || state.user?.role === 'manager' || !data.members.some(item => item.id === member.id)) return;
    const program = selectCurrentProgram(data.programs, Number(member.id), now);
    if (!program) { open({ page: 'users', memberId: member.id, section: 'coaching' }); return; }
    setState(previous => ({ ...previous, workout: program, workoutMember: member, workoutData: {}, validatedExercises: [], workoutIsProgramSession: false }));
  };
  const link = (page: HomeDestination['page'], label: string) => allowedPages.includes(page) ? <LinkButton onClick={() => open({ page })}>{label}</LinkButton> : undefined;
  if (state.onboardingDataReady === false) return <div role="status" className="p-6 text-sm text-zinc-600">Chargement de votre espace…</div>;
  const compact = format === 'phone';
  const desktop = format === 'desktop' || format === 'largeDesktop';
  const coach = data.experience === 'STUDIO_COACH';
  const supervisor = data.experience === 'STUDIO_MANAGER' || data.experience === 'STUDIO_OWNER';
  const bookingLabel = (booking: Booking) => data.members.find(member => Number(member.id) === Number(booking.memberId))?.name ||
    data.prospects.find(prospect => prospect.id === booking.prospectId)?.name || 'Séance';
  const memberLinks = (member: User) => <div className="flex flex-wrap gap-1">
    <LinkButton onClick={() => open({ page: 'users', memberId: member.id })}>Ouvrir {member.name}</LinkButton>
    {data.caps.messages.usable && <LinkButton onClick={() => open({ page: 'chat', memberId: member.id })}>Message</LinkButton>}
    <LinkButton onClick={() => open({ page: 'users', memberId: member.id, section: 'followup', focusNote: true })}>Ajouter une note</LinkButton>
  </div>;
  const agenda = <Section id="agenda" title={supervisor ? 'Planning du Studio' : compact ? 'Aujourd’hui' : 'Mon planning'} action={link('calendar', 'Ouvrir le planning')}>
    {data.todayBookings.length === 0 && <Empty>Aucun rendez-vous confirmé restant aujourd’hui.</Empty>}
    {data.todayBookings.slice(0, compact ? 4 : 8).map(booking => {
      const member = data.members.find(item => Number(item.id) === Number(booking.memberId));
      const sessionName = state.currentClub?.settings?.booking?.sessionTypes?.find(item => item.id === booking.sessionTypeId)?.name || (booking.type === 'trial' ? 'Essai' : 'Coaching');
      return <article key={booking.id} data-home-booking={booking.id} className="min-w-0 border-b border-zinc-100 pb-3 last:border-0">
        <Button variant="ghost" className="min-h-11 w-full justify-start whitespace-normal text-left" onClick={() => open({ page: 'calendar', bookingId: booking.id })}><span className="mr-3 shrink-0">{readableTime(booking.startTime)}</span><span className="min-w-0 break-words">{bookingLabel(booking)} · {sessionName}</span></Button>
        {member && <div className="flex flex-wrap gap-1">{memberLinks(member)}{!supervisor && data.caps.coaching.usable && <LinkButton onClick={() => launch(member)}>{selectCurrentProgram(data.programs, Number(member.id), now) ? 'Lancer le programme' : 'Préparer le programme'}</LinkButton>}</div>}
      </article>;
    })}
    {data.nextBooking && !data.todayBookings.some(booking => booking.id === data.nextBooking!.id) && <Button variant="secondary" className="min-h-11 w-full whitespace-normal text-left" onClick={() => open({ page: 'calendar', bookingId: data.nextBooking!.id })}>Prochain rendez-vous · {bookingLabel(data.nextBooking)} · {readableDate(data.nextBooking.startTime)} à {readableTime(data.nextBooking.startTime)}</Button>}
    {!compact && data.bookings.length > data.todayBookings.length && <Empty>{data.bookings.filter(booking => new Date(booking.startTime).getTime() < now.getTime() + 7 * 86_400_000).length} rendez-vous confirmé(s) sur les 7 prochains jours.</Empty>}
  </Section>;
  const actionCenter = <Section id="actions" title="Pulse · À traiter" action={link('pulse', 'Voir toutes les actions')}>
    {!!pulse.result?.onboardingSummary && <div data-home-onboarding className="rounded-lg bg-zinc-50 p-3 space-y-2"><p className="text-sm">{pulse.result.onboardingSummary} {state.user?.role === 'coach' ? 'de vos clients à préparer' : state.user?.role === 'manager' ? 'onboarding à poursuivre' : 'clients en onboarding'}</p><LinkButton onClick={() => open({ page: 'onboarding' })}>Voir l’onboarding</LinkButton></div>}
    {pulse.result?.retentionSummary && <div data-home-retain className="rounded-lg bg-emerald-50 p-3 space-y-2"><p className="text-sm">{pulse.result.retentionSummary.critical + pulse.result.retentionSummary.attention} {state.user?.role === 'coach' ? 'de vos clients nécessitent une action' : state.user?.role === 'manager' ? 'clients à traiter dans le Studio' : 'clients nécessitent votre attention'}</p><LinkButton onClick={() => open({ page: 'retention' })}>Ouvrir Velatra Retain</LinkButton></div>}
    <PulseList feed={pulse} open={open} />
    {pulse.result && <p className="text-sm text-zinc-600">{pulse.result.total} action(s) à traiter dans votre périmètre.</p>}
  </Section>;
  const facts = coach && !compact ? data.clientFacts : data.clientFacts.filter(fact => fact.needsProgram || fact.inactiveDays !== null || fact.followups.length || fact.unassigned);
  const filteredFacts = facts.filter(fact => fact.member.name.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')));
  const pageSize = compact ? 4 : 12;
  const pageCount = Math.max(1, Math.ceil(filteredFacts.length / pageSize));
  const currentPage = Math.min(portfolioPage, pageCount - 1);
  const clients = <Section id="clients" title={coach && !compact ? 'Mes clients' : 'Clients à suivre'} action={link('users', `Tous les clients (${data.members.length})`)}>
    {coach && !compact && <label className="block space-y-1 text-sm font-medium">Rechercher dans mes clients<Input value={query} onChange={event => { setQuery(event.target.value); setPortfolioPage(0); }} /></label>}
    {filteredFacts.length === 0 ? <Empty>{data.members.length === 0 ? coach ? 'Aucun client ne vous est affecté pour le moment.' : 'Aucun client pour le moment. Ajoutez votre premier client depuis Clients.' : query ? 'Aucun client ne correspond à cette recherche.' : 'Aucune intervention détectée pour vos clients.'}</Empty> :
      <ul className="space-y-4">{filteredFacts.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map(fact => <li key={fact.member.id} className="min-w-0 border-b border-zinc-100 pb-3 last:border-0" data-home-member={fact.member.id}>
        <h3 className="vd-client-name break-words font-semibold"><span className="vd-initials" aria-hidden="true">{fact.member.name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('')}</span>{fact.member.name}</h3><p className="text-sm text-zinc-600">{[fact.needsProgram ? fact.member.planRequested ? 'Programme demandé' : 'Programme à préparer' : fact.currentProgram ? 'Programme actif' : 'Aucun programme actif', fact.inactiveDays !== null ? `${fact.inactiveDays} jours sans séance` : null, fact.followups.length ? 'Bilan / check-in attendu' : null, fact.unassigned ? 'Sans coach affecté' : null].filter(Boolean).join(' · ')}</p>
        {memberLinks(fact.member)}
        {fact.needsProgram && <LinkButton onClick={() => open({ page: 'users', memberId: fact.member.id, section: 'coaching' })}>Préparer le programme</LinkButton>}
        {fact.followups.length > 0 && <LinkButton onClick={() => open({ page: 'users', memberId: fact.member.id, section: 'followup' })}>Ouvrir le bilan</LinkButton>}
        {fact.unassigned && <LinkButton onClick={() => open({ page: 'users', memberId: fact.member.id, section: 'coaching' })}>Affecter un coach</LinkButton>}
      </li>)}</ul>}
    {pageCount > 1 && <nav aria-label="Pages des clients de l’accueil" className="flex flex-wrap items-center justify-between gap-2"><Button variant="secondary" disabled={currentPage === 0} onClick={() => setPortfolioPage(currentPage - 1)}>Précédents</Button><span className="text-sm">{currentPage + 1} / {pageCount}</span><Button variant="secondary" disabled={currentPage + 1 >= pageCount} onClick={() => setPortfolioPage(currentPage + 1)}>Suivants</Button></nav>}
  </Section>;
  const sales = allowedPages.includes('crm_pipeline') ? <Section id="sales" title="Prospects et relances" action={link('crm_pipeline', 'Ouvrir le CRM')}>
    {!compact && <dl className="grid grid-cols-2 gap-3">{[['lead', 'Nouveaux'], ['contacted', 'Contactés'], ['trial', 'En essai'], ['call_pending', 'À rappeler']].map(([status, label]) => <div key={status}><dt className="text-sm text-zinc-600">{label}</dt><dd className="font-semibold">{data.activeProspects.filter(prospect => prospect.status === status).length}</dd></div>)}</dl>}
    {data.prospectsToFollowUp.length ? <ul className="space-y-2">{data.prospectsToFollowUp.slice(0, 5).map(prospect => <li key={prospect.id}><Button variant="secondary" className="min-h-11 w-full whitespace-normal text-left" onClick={() => open({ page: 'crm_pipeline', prospectUid: prospect.firebaseUid })}>{prospect.name} · À relancer</Button></li>)}</ul> : <Empty>Aucune relance prospect arrivée à échéance.</Empty>}
    <p className="text-sm text-zinc-600">{data.bookings.filter(booking => booking.type === 'trial' && new Date(booking.startTime).getTime() < now.getTime() + 7 * 86_400_000).length} essai(s) confirmé(s) sur les 7 prochains jours.</p>
  </Section> : undefined;
  const team = allowedPages.includes('team') ? <Section id="team" title={compact ? 'Équipe aujourd’hui' : 'Équipe et affectations'} action={link('team', 'Ouvrir l’équipe')}>
    {data.team.length ? <ul className="space-y-3">{data.team.map(({ user, assignedClients, tasksDue, todayBookings }) => <li key={user.firebaseUid || user.id} className="min-w-0"><h3 className="break-words font-semibold">{user.name}{user.isSuspended ? ' · Suspendu' : ''}</h3><p className="text-sm text-zinc-600">{assignedClients} client(s) affecté(s) · {todayBookings} rendez-vous aujourd’hui · {tasksDue} tâche(s) à traiter</p></li>)}</ul> : <Empty>Aucun coach enregistré dans le Studio.</Empty>}
    <Button variant="secondary" className="min-h-11" onClick={() => { const first = data.clientFacts.find(fact => fact.unassigned); open(first ? { page: 'users', memberId: first.member.id, section: 'coaching' } : { page: 'users' }); }}>Affectations clients · {data.clientFacts.filter(fact => fact.unassigned).length} sans coach</Button>
  </Section> : undefined;
  const businessBody = finance ? <>
    {finance.hasRecords ? <dl className="grid grid-cols-2 gap-4"><div><dt className="text-sm text-zinc-600">MRR · EUR</dt><dd className="font-semibold">{euros(finance.mrr)}</dd></div><div><dt className="text-sm text-zinc-600">ARPU récurrent</dt><dd className="font-semibold">{euros(finance.arpu)}</dd></div><div><dt className="text-sm text-zinc-600">Encaissé net ce mois</dt><dd className="font-semibold">{euros(finance.revenue)}</dd></div><div><dt className="text-sm text-zinc-600">Encaissé net sur 7 jours</dt><dd className="font-semibold">{euros(finance.weekRevenue)}</dd></div><div><dt className="text-sm text-zinc-600">Encaissé net cette année</dt><dd className="font-semibold">{euros(finance.yearRevenue)}</dd></div></dl> : <Empty>Aucune donnée de facturation disponible pour le moment.</Empty>}
    <p className="text-sm text-zinc-600">Billing V2 · Encaissements après remboursements, en EUR. Les devises ne sont pas additionnées.</p>
    {finance.endingSubscriptions.length > 0 && <p className="text-sm">{finance.endingSubscriptions.length} abonnement(s) à échéance dans les 30 jours.</p>}
    {link('crm_finances', 'Ouvrir les finances')}
  </> : null;
  const business = finance ? compact ? <details className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5" data-home-section="business"><summary className="min-h-11 cursor-pointer font-semibold">Business · Indicateurs secondaires</summary><div className="mt-4 space-y-4">{businessBody}</div></details> : <Section id="business" title={desktop ? "Chiffre d’affaires" : "Business · Billing V2"}>{businessBody}</Section> : undefined;
  const coaching = data.caps.programs.usable ? <Section id="coaching" title={desktop ? supervisor ? 'Activité du club' : 'Activité récente' : 'Coaching et préparation'} action={link('presets', 'Programmes')}>
    <p className="text-sm">{data.clientFacts.filter(fact => fact.currentProgram).length} client(s) avec programme actif · {data.clientFacts.filter(fact => fact.needsProgram).length} programme(s) à préparer</p>
    {data.logs.length ? <ul className="space-y-2">{[...data.logs].sort((a, b) => new Date(b.completedAt || b.date).getTime() - new Date(a.completedAt || a.date).getTime()).slice(0, 4).map(log => <li key={log.id}><LinkButton onClick={() => open({ page: 'users', memberId: Number(log.memberId), section: 'followup' })}>{data.members.find(member => member.id === Number(log.memberId))?.name} · Séance du {readableDate(log.date)}</LinkButton></li>)}</ul> : <Empty>Aucune séance enregistrée dans ce portefeuille.</Empty>}
  </Section> : undefined;
  const messages = data.caps.messages.usable ? <Section id="messages" title="Messages" action={link('chat', 'Ouvrir les messages')}>
    {data.unreadMessages.length ? <><p className="text-sm">{data.unreadMessages.length} message(s) non lu(s).</p><ul className="space-y-2">{Array.from(new Set(data.unreadMessages.map(message => message.from))).slice(0, 4).map(id => {
      const member = data.members.find(item => item.id === id);
      return <li key={id}><Button variant="secondary" className="min-h-11 w-full whitespace-normal text-left" onClick={() => open(member ? { page: 'chat', memberId: member.id } : { page: 'chat' })}>{member?.name || 'Ouvrir la messagerie'} · Message non lu</Button></li>;
    })}</ul></> : <Empty>Aucun message non lu dans vos conversations.</Empty>}
  </Section> : undefined;
  const tasks = data.caps.tasks.usable ? <Section id="tasks" title="Mes tâches" action={link('crm_tasks', 'Toutes mes tâches')}>
    {data.tasks.length ? <ul className="space-y-2">{data.tasks.slice(0, 5).map(task => <li key={task.id}><Button variant="secondary" className="min-h-11 w-full whitespace-normal text-left" onClick={() => open({ page: 'crm_tasks', taskId: task.id })}>{task.title}{task.dueDate ? ` · ${readableDate(task.dueDate)}` : ''}</Button></li>)}</ul> : <Empty>Aucune tâche opérationnelle ouverte.</Empty>}
  </Section> : undefined;
  const shortcuts = <Section id="shortcuts" title="Accès rapides"><div className="flex flex-wrap gap-2">{link('users', 'Clients')}{link('calendar', 'Planning')}{link('coaching', 'Séance coach')}{link('presets', 'Programmes')}{link('crm_pipeline', 'CRM')}{link('team', 'Équipe')}{link('crm_tasks', coach ? 'Mes tâches' : 'Tâches')}{link('chat', 'Messages')}{state.user?.role === 'owner' && link('settings', 'Paramètres Owner')}</div></Section>;
  const sections = { agenda, actions: actionCenter, clients, sales, team, business, coaching, messages, tasks, shortcuts };
  if (desktop) {
    // Presentation uses the same scoped selectors and authorized destinations as the existing Home.
    // No invented retention/progression rates or additional subscriptions/API calls.
    const action = (page: HomeDestination['page'], label: string) => allowedPages.includes(page) ? <ActionPill key={page} onClick={() => open({ page })}>{label}</ActionPill> : null;
    const kpis = supervisor ? <>
      <KpiCard label="Membres suivis" value={data.members.length} detail="Dans votre club" icon={<Users size={20} />} />
      <KpiCard label="Prospects en cours" value={data.activeProspects.length} detail="Dans votre pipeline" icon={<Target size={20} />} tone="violet" />
      <KpiCard label="Coachs de l’équipe" value={data.team.length} detail="Effectif enregistré" icon={<Dumbbell size={20} />} tone="rose" />
      <KpiCard label="Séances à venir" value={data.todayBookings.length} detail="Confirmées aujourd’hui" icon={<CalendarDays size={20} />} tone="indigo" />
    </> : <>
      <KpiCard label="Clients suivis" value={data.members.length} detail="Votre portefeuille" icon={<Users size={20} />} />
      <KpiCard label="Séances à venir" value={data.todayBookings.length} detail="Confirmées aujourd’hui" icon={<CalendarDays size={20} />} tone="violet" />
      <KpiCard label="Tâches ouvertes" value={data.tasks.length} detail="Dans votre périmètre" icon={<ClipboardList size={20} />} tone="rose" />
      <KpiCard label="Programmes actifs" value={data.clientFacts.filter(fact => fact.currentProgram).length} detail="Clients accompagnés" icon={<Activity size={20} />} tone="indigo" />
    </>;
    const files = data.caps.documents.usable ? state.driveFiles.filter(file => file.clubId === state.currentClub?.id).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3) : [];
    const documents = allowedPages.includes('drive') && data.caps.documents.usable ? <DashboardCard title="Mes derniers documents" icon={<FolderOpen size={19} />} action={link('drive', 'Ouvrir le Drive')} className="vd-documents">
      {files.length ? <ul>{files.map(file => <li key={file.id}><button type="button" onClick={() => open({ page: 'drive' })}><span className="vd-file-icon"><FileText size={20} aria-hidden="true" /></span><span><strong>{file.name}</strong><small>Ajouté le {readableDate(file.createdAt)}</small></span><ArrowUpRight size={17} aria-hidden="true" /></button></li>)}</ul> : <EmptyState>Retrouvez vos documents et vos partages dans votre espace Drive.</EmptyState>}
    </DashboardCard> : undefined;
    return <DesktopDashboard name={state.user?.name || 'Coach'} manager={supervisor} experience={data.experience} format={format} sections={sections} order={resolvePresentationStrategy(data.experience, format).sections}
      kpis={kpis} actions={<>{action('calendar', 'Voir mon planning')}{action('users', supervisor ? 'Suivre les membres' : 'Retrouver un client')}{supervisor ? action('team', 'Voir mon équipe') : action('presets', 'Mes programmes')}</>} documents={documents}
      date={now.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' })} />;
  }
  const props = { format, sections, name: state.user?.name || 'Coach' };
  return coach ? <StudioCoachHome {...props} /> : supervisor ? <StudioManagerHome {...props} ownerVariant={data.experience === 'STUDIO_OWNER'} /> : <SoloOwnerHome {...props} />;
}

export function ExperienceHome(props: Props) {
  const experience = resolveProductExperience(props.state.currentClub, props.state.user || {});
  return ['SOLO_OWNER', 'STUDIO_OWNER', 'STUDIO_MANAGER', 'STUDIO_COACH'].includes(experience)
    ? <ResolvedHome {...props} />
    : <LegacyHome {...props} onExport={() => {}} onToggleTimer={() => {}} />;
}
