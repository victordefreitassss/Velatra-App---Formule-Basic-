import { useLocation, useNavigate } from 'react-router-dom';
import type { AppState } from '../types';
import type { HomeDestination } from './experienceHomeSelectors';
import { getAllContextItems } from './appShellHelpers';
import { createOnboardingLocationState, createRetentionLocationState, createPlanningLocationState, createClient360LocationState, createDashboardLocationState, createMessageLocationState, createPlanningBookingLocationState, createTaskLocationState } from './dashboardNavigation';
export function useHomeDestination(state: AppState, setState: React.Dispatch<React.SetStateAction<AppState>>) {
  const navigate = useNavigate(), location = useLocation();
  return (destination: HomeDestination) => {
    const allowed = getAllContextItems({ role: state.user?.role || 'member', club: state.currentClub }).map(item => item.id);
    if (!allowed.includes(destination.page)) return;
    const member = destination.memberId ? state.users.find(item => item.role === 'member' && item.clubId === state.user?.clubId && Number(item.id) === destination.memberId &&
      (state.user?.role !== 'coach' || !!state.user.firebaseUid && item.assignedCoachUid === state.user.firebaseUid)) : null;
    if (destination.memberId && !member) return;
    const routeState = destination.page === 'onboarding' && member ? createOnboardingLocationState(member.id)
      : destination.page === 'retention' && member ? createRetentionLocationState(member.id)
      : destination.page === 'calendar' && member && !destination.bookingId ? createPlanningLocationState(member.id)
      : destination.bookingId ? createPlanningBookingLocationState(destination.bookingId)
      : destination.taskId ? createTaskLocationState(destination.taskId)
        : destination.page === 'chat' && member ? createMessageLocationState(member.id)
          : destination.page === 'users' && member ? { ...createClient360LocationState(member.id, destination.section, destination.focusNote, destination.adminSection), ...(destination.focusCoachAssignment ? { focusCoachAssignment: true } : {}) }
            : createDashboardLocationState(destination.page);
    setState(previous => ({ ...previous, page: destination.page, selectedMember: null, memberFilter: undefined, pendingProspectUid: destination.prospectUid }));
    navigate(`${location.pathname}${location.search}`, { state: routeState });
  };
}
