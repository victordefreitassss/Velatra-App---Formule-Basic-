import type { Booking } from '../types';

export const getMobileTabForPage = (page: string, role: string) => {
  if (role === 'superadmin') return page === 'admin' ? 'admin' : 'plus';
  if (role === 'coach' || role === 'owner') {
    if (page === 'home') return 'home';
    if (['users', 'chat', 'calendar'].includes(page)) return 'users';
    if (['coaching', 'presets', 'nutrition', 'drive'].includes(page)) return 'coaching';
    if (['crm_pipeline', 'crm_finances'].includes(page)) return 'crm_pipeline';
    return 'plus';
  }
  if (page === 'home') return 'home';
  if (['calendar', 'planning'].includes(page)) return 'calendar';
  if (['performances', 'evolution'].includes(page)) return 'performances';
  if (page === 'nutrition') return 'nutrition';
  return 'plus';
};

export const countTodayUpcomingSessions = (bookings: Pick<Booking, 'startTime' | 'status'>[], now = new Date()) => {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const nowTimestamp = now.getTime();

  return bookings.filter(booking => {
    const sessionTime = new Date(booking.startTime).getTime();
    return booking.status === 'confirmed' && sessionTime >= nowTimestamp && sessionTime < startOfTomorrow.getTime();
  }).length;
};
