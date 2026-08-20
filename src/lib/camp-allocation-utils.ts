import { differenceInYears } from "date-fns";

// ========== Age Calculation ==========
export function calculateAge(birthDate: string | Date | null | undefined): number {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return 0;
  return differenceInYears(new Date(), birth);
}

export function getAgeGroup(age: number): string {
  if (age < 6) return 'under_6';
  if (age >= 6 && age <= 14) return '6_14';
  if (age >= 15 && age <= 17) return '15_17';
  return 'over_17';
}

export function formatAge(birthDate: string | Date | null | undefined): string | number {
  const age = calculateAge(birthDate);
  return age > 0 ? age : 'غير محدد';
}

export function formatAgePrecise(birthDate: string | null | undefined): string {
  if (!birthDate) return '';
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return '';
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) {
    months--;
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  return `${years}س ${months}ش`; // e.g. 14س 4ش
}

// ========== Gender Helpers ==========
export function normalizeGender(gender: string | null | undefined): 'male' | 'female' {
  if (!gender) return 'male';
  return (gender === 'MALE' || gender === 'ذكر' || gender === 'male') ? 'male' : 'female';
}

export function formatGender(gender: string | null | undefined): string {
  return normalizeGender(gender) === 'male' ? 'ذكر' : 'أنثى';
}

// ========== Parent Key (for sibling grouping) ==========
export function getParentKey(raw: { parent_first_name?: string; parent_last_name?: string; parent_phone?: string } | null | undefined): string {
  if (!raw) return '';
  return `${raw.parent_first_name?.trim() || ''}_${raw.parent_last_name?.trim() || ''}_${raw.parent_phone?.trim() || ''}`.toLowerCase();
}

// ========== Shuffle ==========
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ========== Sibling Styling ==========
export interface SiblingStyle {
  row: string;
  badge: string;
}

export const SIBLING_COLORS: SiblingStyle[] = [
  { row: 'bg-amber-50/70 hover:bg-amber-100/80', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
  { row: 'bg-emerald-50/70 hover:bg-emerald-100/80', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { row: 'bg-purple-50/70 hover:bg-purple-100/80', badge: 'bg-purple-100 text-purple-800 border-purple-300' },
  { row: 'bg-pink-50/70 hover:bg-pink-100/80', badge: 'bg-pink-100 text-pink-800 border-pink-300' },
  { row: 'bg-cyan-50/70 hover:bg-cyan-100/80', badge: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  { row: 'bg-orange-50/70 hover:bg-orange-100/80', badge: 'bg-orange-100 text-orange-800 border-orange-300' }
];

export function assignSiblingStyles<T extends { isSibling?: boolean; siblingStyling?: SiblingStyle | null; [key: string]: any }>(
  children: T[],
  getParentKeyFn: (item: T) => string,
): void {
  const parentFreq: Record<string, number> = {};
  children.forEach(c => {
    const k = getParentKeyFn(c);
    parentFreq[k] = (parentFreq[k] || 0) + 1;
  });

  children.forEach(c => {
    c.isSibling = false;
    c.siblingStyling = null;
  });

  let colorIndex = 0;
  const assignedColors: Record<string, SiblingStyle> = {};

  children.forEach(c => {
    const k = getParentKeyFn(c);
    if (parentFreq[k] > 1) {
      if (!assignedColors[k]) {
        assignedColors[k] = SIBLING_COLORS[colorIndex % SIBLING_COLORS.length];
        colorIndex++;
      }
      c.siblingStyling = assignedColors[k];
      c.isSibling = true;
    }
  });
}

export function sortByParentKey<T>(children: T[], getParentKeyFn: (item: T) => string): T[] {
  return [...children].sort((a, b) => {
    const keyA = getParentKeyFn(a);
    const keyB = getParentKeyFn(b);
    return keyA.localeCompare(keyB);
  });
}

// ========== Deduplication ==========
export function deduplicateChildren<T extends { child_first_name?: string; child_last_name?: string; parent_first_name?: string; parent_last_name?: string }>(
  children: T[],
): T[] {
  const uniqueMap = new Map<string, T>();
  children.forEach(c => {
    const uniqueKey = `${c.child_first_name?.trim() || ''}_${c.child_last_name?.trim() || ''}_${c.parent_first_name?.trim() || ''}_${c.parent_last_name?.trim() || ''}`.toLowerCase();
    if (!uniqueMap.has(uniqueKey)) {
      uniqueMap.set(uniqueKey, c);
    }
  });
  return Array.from(uniqueMap.values());
}

// ========== Municipality Resolution ==========
export function resolveMunicipalityName(
  residenceCommune: string | null | undefined,
  municipalityMap: Record<string, string>,
  fallback: string,
): string {
  if (!residenceCommune) return fallback;
  // If it's a UUID, look up in the map
  if (residenceCommune.includes('-') && residenceCommune.length === 36) {
    return municipalityMap[residenceCommune] || residenceCommune;
  }
  return residenceCommune;
}

// ========== Stats Helpers ==========
export function calculatePercentage(value: number, total: number): number {
  return Math.min(100, Math.round((value / Math.max(1, total)) * 100));
}

export function getAgeGroups() {
  return [
    { id: 'under_6', labelKey: 'age_under_6' },
    { id: '6_14', labelKey: 'age_6_14' },
    { id: '15_17', labelKey: 'age_15_17' },
    { id: 'over_17', labelKey: 'age_over_17' },
  ];
}
