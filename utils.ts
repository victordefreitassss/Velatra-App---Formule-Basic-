
export function genCode(name: string): string {
  return name.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9.]/g, "");
}

export function genAvatar(name: string): string {
  const parts = name.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function getCurrentWeek(completedWeeks: number[]): number {
  if (completedWeeks.length === 0) return 1;
  const max = Math.max(...completedWeeks);
  return max + 1;
}

export function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function calculate8RM(oneRM: number): number {
  return Math.round(oneRM * 0.80 * 10) / 10;
}

export function calculate12RM(oneRM: number): number {
  return Math.round(oneRM * 0.70 * 10) / 10;
}

export function getLevel(xpPoints: number) {
  // 1000 XP par niveau
  const level = Math.floor(xpPoints / 10) || 1; 
  const currentLevelXp = xpPoints % 1000;
  const progress = (currentLevelXp / 1000) * 100;

  if (level >= 50) return { curr: "LÉGENDE", next: "MAX", progress: 100, icon: "👑" };
  if (level >= 25) return { curr: "ÉLITE", next: "LÉGENDE", progress, icon: "🔥" };
  if (level >= 10) return { curr: "VÉTÉRAN", next: "ÉLITE", progress, icon: "💪" };
  if (level >= 5) return { curr: "AVANCÉ", next: "VÉTÉRAN", progress, icon: "🏋️" };
  return { curr: "DÉBUTANT", next: "AVANCÉ", progress, icon: "🌱" };
}

export function formatDate(dateStr: string): string {
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateStr).toLocaleDateString('fr-FR', options);
}

export function blobToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
