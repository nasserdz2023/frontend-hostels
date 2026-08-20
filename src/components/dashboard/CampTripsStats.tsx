"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { campTripsApi, CampTripStats as CampTripStatsData } from "@/lib/api/camp-trips";
import { Tent, Users, Activity, Telescope } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardItem {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: "emerald" | "blue" | "purple" | "orange" | "cyan" | "slate";
  suffix?: string;
  format?: boolean;
}

const colorVariants = {
  emerald: {
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    border: "border-emerald-200 dark:border-emerald-500/20",
  },
  blue: {
    text: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    border: "border-blue-200 dark:border-blue-500/20",
  },
  purple: {
    text: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-500/10",
    border: "border-purple-200 dark:border-purple-500/20",
  },
  orange: {
    text: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-500/10",
    border: "border-orange-200 dark:border-orange-500/20",
  },
  cyan: {
    text: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-500/10",
    border: "border-cyan-200 dark:border-cyan-500/20",
  },
  slate: {
    text: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-800",
    border: "border-slate-200 dark:border-slate-700",
  },
};

function MiniStatCard({ title, value, icon: Icon, color = "blue", suffix, format }: StatCardItem) {
  const colors = colorVariants[color] || colorVariants.blue;
  const displayValue =
    typeof value === "number" && format
      ? value.toLocaleString("ar-DZ")
      : typeof value === "number"
        ? value
        : value;

  return (
    <div className={cn(
      "relative p-4 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm transition-shadow hover:shadow-md flex flex-col gap-2",
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{title}</span>
        <div className={cn("p-1.5 rounded-lg border", colors.bg, colors.border, colors.text)}>
          <Icon size={14} />
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          {displayValue}
        </h3>
        {suffix && (
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{suffix}</span>
        )}
      </div>
    </div>
  );
}

interface CampTripsStatsProps {
  className?: string;
}

export function CampTripsStats({ className }: CampTripsStatsProps) {
  const t = useTranslations("camp-trips");
  const [stats, setStats] = useState<CampTripStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function fetchStats() {
      try {
        setLoading(true);
        const response = await campTripsApi.getStats();
        if (alive) {
          setStats(response.data);
          setError(null);
        }
      } catch (err) {
        console.error("Failed to load camp trips stats", err);
        if (alive) {
          setError("فشل تحميل الإحصائيات");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    fetchStats();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-3", className)}>
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="h-24 animate-pulse bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800"
          />
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return null; // Gracefully hide on error
  }

  const cards: StatCardItem[] = [
    {
      title: t("stats_total_trips"),
      value: stats.total_trips,
      icon: Tent,
      color: "blue",
    },
    {
      title: t("stats_active_trips"),
      value: stats.active_trips,
      icon: Activity,
      color: "emerald",
    },
    {
      title: t("stats_total_members"),
      value: stats.total_members,
      icon: Users,
      color: "purple",
      format: true,
    },
    {
      title: t("stats_occupancy_rate"),
      value: stats.occupancy_rate,
      icon: Telescope,
      color: "orange",
      suffix: "%",
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-3", className)}>
      {cards.map((card, i) => (
        <MiniStatCard key={i} {...card} />
      ))}
    </div>
  );
}
