/**
 * Animator Registration — Shared Constants
 * ثوابت مشتركة بين صفحات تسجيل المنشطين
 */

// ─── Type-safe Enums ─────────────────────────────────────────────────────────

export type AnimatorStatus = "pending" | "extracted" | "registered" | "synced" | "failed";
export type BatchStatus = "draft" | "active" | "completed" | "closed";
export type AnimatorPosition = "animator" | "lifeguard" | "financial_manager" | "director";
export type AnimatorPositionType = "trainee" | "appointed";
export type Gender = "MALE" | "FEMALE";

// ─── Status Config ───────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; dot: string }
> = {
  // Animator statuses
  pending: {
    label: "قيد الانتظار",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  extracted: {
    label: "تم الاستخراج",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  registered: {
    label: "مسجل",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  synced: {
    label: "ممزامن",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
  },
  failed: {
    label: "فشل",
    color: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  // Batch statuses
  draft: {
    label: "مسودة",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  active: {
    label: "نشط",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  completed: {
    label: "مكتمل",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  closed: {
    label: "مغلق",
    color: "bg-slate-50 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
};

// ─── Position Labels ─────────────────────────────────────────────────────────

export const POSITION_LABELS: Record<string, string> = {
  animator: "منشط",
  lifeguard: "حارس سباحة",
  financial_manager: "مسير مالي",
  director: "مدير",
};

// ─── Registration Progress Steps ─────────────────────────────────────────────

export const REGISTRATION_STEPS: Array<{
  key: AnimatorStatus;
  label: string;
  order: number;
}> = [
  { key: "pending", label: "قيد الانتظار", order: 0 },
  { key: "extracted", label: "تم الاستخراج", order: 1 },
  { key: "synced", label: "ممزامن مع الوزارة", order: 2 },
];

// ─── Gender Labels ───────────────────────────────────────────────────────────

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: "ذكر",
  FEMALE: "أنثى",
};
