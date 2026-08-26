"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Flag, Moon, Globe } from "lucide-react";
import type { NationalEvent, Translator } from "./types";

interface EventQuickStatsProps {
  events: NationalEvent[];
  t: Translator;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  colorClass: string;
}

function StatCard({ icon, label, count, colorClass }: StatCardProps) {
  return (
    <Card className="flex-1">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`p-2 rounded-lg ${colorClass}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold">{count}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function EventQuickStats({ events, t }: EventQuickStatsProps) {
  const total = events.length;
  const national = events.filter((e) => e.event_type === "NATIONAL").length;
  const religious = events.filter((e) => e.event_type === "RELIGIOUS").length;
  const international = events.filter(
    (e) => e.event_type === "INTERNATIONAL"
  ).length;

  return (
    <div className="flex gap-4 flex-wrap">
      <StatCard
        icon={<Calendar className="w-5 h-5 text-blue-600" />}
        label={t("events.stats.total")}
        count={total}
        colorClass="bg-blue-100 text-blue-600"
      />
      <StatCard
        icon={<Flag className="w-5 h-5 text-green-600" />}
        label={t("events.stats.national")}
        count={national}
        colorClass="bg-green-100 text-green-600"
      />
      <StatCard
        icon={<Moon className="w-5 h-5 text-indigo-600" />}
        label={t("events.stats.religious")}
        count={religious}
        colorClass="bg-indigo-100 text-indigo-600"
      />
      <StatCard
        icon={<Globe className="w-5 h-5 text-purple-600" />}
        label={t("events.stats.international")}
        count={international}
        colorClass="bg-purple-100 text-purple-600"
      />
    </div>
  );
}
