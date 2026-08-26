"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Translator } from "./types";

interface EventFiltersProps {
  filters: { event_type: string; month: string };
  onFilterChange: (filters: { event_type: string; month: string }) => void;
  t: Translator;
  months: string[];
}

export function EventFilters({
  filters,
  onFilterChange,
  t,
  months,
}: EventFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <Select
        value={filters.event_type}
        onValueChange={(val) =>
          onFilterChange({ ...filters, event_type: val })
        }
      >
        <SelectTrigger
          className="w-[150px]"
          aria-label={t("events.filters.type")}
        >
          <SelectValue placeholder={t("events.filters.type")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("events.all")}</SelectItem>
          <SelectItem value="NATIONAL">
            {t("events.types.NATIONAL")}
          </SelectItem>
          <SelectItem value="RELIGIOUS">
            {t("events.types.RELIGIOUS")}
          </SelectItem>
          <SelectItem value="INTERNATIONAL">
            {t("events.types.INTERNATIONAL")}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.month}
        onValueChange={(val) =>
          onFilterChange({ ...filters, month: val })
        }
      >
        <SelectTrigger
          className="w-[150px]"
          aria-label={t("events.filters.month")}
        >
          <SelectValue placeholder={t("events.filters.month")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("events.allMonths")}</SelectItem>
          {months.map((m, i) => (
            <SelectItem key={i} value={String(i + 1)}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
