export interface DailyCheckInInput {
  waterLitres: number;
  sleepHours: number;
  proteinTargetMet: boolean;
  mood: number;
}

export interface DailyCheckInProfile {
  xp?: number;
  streak?: number;
  lastCheckInDate?: string;
}

export function parseDailyCheckInInput(value: unknown): DailyCheckInInput | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const waterLitres = Number(input.waterLitres);
  const sleepHours = Number(input.sleepHours);
  const mood = Number(input.mood);

  if (!Number.isFinite(waterLitres) || waterLitres < 0 || waterLitres > 10) return null;
  if (!Number.isFinite(sleepHours) || sleepHours < 0 || sleepHours > 24) return null;
  if (typeof input.proteinTargetMet !== 'boolean') return null;
  if (!Number.isInteger(mood) || mood < 1 || mood > 5) return null;

  return {
    waterLitres: Math.round(waterLitres * 10) / 10,
    sleepHours: Math.round(sleepHours * 10) / 10,
    proteinTargetMet: input.proteinTargetMet,
    mood
  };
}

export function calculateCheckInReward(profile: DailyCheckInProfile, today: string) {
  const xp = Number.isSafeInteger(profile.xp) && Number(profile.xp) >= 0 ? Number(profile.xp) : 0;
  const streak = Number.isSafeInteger(profile.streak) && Number(profile.streak) >= 0 ? Number(profile.streak) : 0;
  const yesterdayDate = new Date(`${today}T00:00:00.000Z`);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);

  return {
    xp: xp + 50,
    streak: profile.lastCheckInDate === yesterday ? streak + 1 : 1,
    lastCheckInDate: today
  };
}
