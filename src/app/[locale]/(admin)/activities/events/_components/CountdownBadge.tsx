"use client";

import { Badge } from "@/components/ui/badge";
import type { Translator } from "./types";

interface CountdownBadgeProps {
  month?: number;
  day?: number;
  t: Translator;
}

function getDaysUntil(month?: number, day?: number): number | null {
  if (!month || !day) return null;
  const now = new Date();
  const currentYear = now.getFullYear();

  // Create date for this year's occurrence
  let eventDate = new Date(currentYear, month - 1, day);
  eventDate.setHours(0, 0, 0, 0);

  // If it's already passed this year, use next year
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (eventDate < todayStart) {
    eventDate = new Date(currentYear + 1, month - 1, day);
    eventDate.setHours(0, 0, 0, 0);
  }

  const diffMs = eventDate.getTime() - todayStart.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function CountdownBadge({ month, day, t }: CountdownBadgeProps) {
  const days = getDaysUntil(month, day);

  if (days === null) return null;

  if (days === 0) {
    return (
      <Badge variant="destructive" className="text-xs whitespace-nowrap">
        {t("events.countdown.today")}
      </Badge>
    );
  }

  if (days < 0) {
    return (
      <Badge
        variant="secondary"
        className="text-xs whitespace-nowrap bg-gray-100 text-gray-500"
      >
        {t("events.countdown.past")}
      </Badge>
    );
  }

  if (days <= 7) {
    return (
      <Badge variant="destructive" className="text-xs whitespace-nowrap">
        {t("events.countdown.days", { days })}
      </Badge>
    );
  }

  if (days <= 30) {
    return (
      <Badge
        variant="default"
        className="text-xs whitespace-nowrap bg-amber-500 hover:bg-amber-600"
      >
        {t("events.countdown.days", { days })}
      </Badge>
    );
  }

  return (
    <Badge
      variant="default"
      className="text-xs whitespace-nowrap bg-green-600 hover:bg-green-700"
    >
      {t("events.countdown.days", { days })}
    </Badge>
  );
}
