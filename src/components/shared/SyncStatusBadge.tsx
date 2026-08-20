"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type SyncStatus = "SYNCED" | "PENDING" | "CONFLICT" | "ERROR";

const SYNC_STATUS_CONFIG = {
  SYNCED: {
    label: {
      ar: "مُزامَن",
      fr: "Synchronisé",
      en: "Synced",
    },
    color: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
    dotColor: "bg-emerald-500",
  },
  PENDING: {
    label: {
      ar: "في انتظار المزامنة",
      fr: "En attente",
      en: "Pending",
    },
    color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
    dotColor: "bg-amber-500",
  },
  CONFLICT: {
    label: {
      ar: "تعارض",
      fr: "Conflit",
      en: "Conflict",
    },
    color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
    dotColor: "bg-red-500",
  },
  ERROR: {
    label: {
      ar: "خطأ في المزامنة",
      fr: "Erreur",
      en: "Error",
    },
    color: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300",
    dotColor: "bg-rose-500",
  },
};

interface SyncStatusBadgeProps {
  status: SyncStatus;
  locale?: "ar" | "fr" | "en";
  showDot?: boolean;
  className?: string;
}

export function SyncStatusBadge({ status, locale = "ar", showDot = true, className }: SyncStatusBadgeProps) {
  const config = SYNC_STATUS_CONFIG[status] || SYNC_STATUS_CONFIG.PENDING;

  return (
    <Badge variant="outline" className={cn(config.color, "border-none gap-1.5", className)}>
      {showDot && <span className={cn("w-1.5 h-1.5 rounded-full inline-block", config.dotColor)} />}
      {config.label[locale]}
    </Badge>
  );
}
