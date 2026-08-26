/**
 * National Events Types
 * أنواع المناسبات الوطنية
 */

export interface NationalEvent {
  id: string;
  name_ar: string;
  name_fr?: string;
  event_type: string;
  month?: number;
  day?: number;
  description?: string;
  suggested_activities?: string[];
  is_active: boolean;
}

export interface EventFormValues {
  name_ar: string;
  name_fr?: string;
  event_type: string;
  month: number;
  day: number;
  description?: string;
  suggested_activities?: string;
}

/**
 * Shared translator type that matches useTranslations return type
 * Supports both simple keys and keys with ICU interpolation values
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Translator = (key: string, values?: Record<string, any>) => string;
