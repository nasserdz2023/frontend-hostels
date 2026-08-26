"use client";

import { Calendar, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CountdownBadge } from "./CountdownBadge";
import type { NationalEvent, Translator } from "./types";

const EVENT_TYPE_COLORS: Record<string, string> = {
  NATIONAL:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  RELIGIOUS:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  INTERNATIONAL:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

const DEFAULT_BADGE_COLOR =
  "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";

interface EventTableProps {
  events: NationalEvent[];
  isLoading: boolean;
  t: Translator;
  hasPermission: (module: string, permission: string) => boolean;
  months: string[];
  onEdit: (event: NationalEvent) => void;
  onDelete: (event: NationalEvent) => void;
}

function LoadingSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24 mt-1" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-16 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-20 mt-1" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-48" />
          </TableCell>
          <TableCell>
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function EventTable({
  events,
  isLoading,
  t,
  hasPermission,
  months,
  onEdit,
  onDelete,
}: EventTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("events.table.event")}</TableHead>
          <TableHead>{t("events.table.type")}</TableHead>
          <TableHead>{t("events.table.date")}</TableHead>
          <TableHead>{t("events.table.description")}</TableHead>
          <TableHead className="w-[140px]">
            {t("events.table.actions")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <LoadingSkeleton />
        ) : events.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={5}
              className="text-center py-10 text-gray-500"
            >
              {t("events.empty")}
            </TableCell>
          </TableRow>
        ) : (
          events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="font-medium">
                <div>{event.name_ar}</div>
                {event.name_fr && (
                  <div className="text-xs text-gray-500">
                    {event.name_fr}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  className={
                    EVENT_TYPE_COLORS[event.event_type] ??
                    DEFAULT_BADGE_COLOR
                  }
                >
                  {t(`events.types.${event.event_type}`)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>
                    {event.day ?? "-"} {months[(event.month ?? 1) - 1]}
                  </span>
                </div>
                <CountdownBadge
                  month={event.month}
                  day={event.day}
                  t={t}
                />
              </TableCell>
              <TableCell className="max-w-xs truncate">
                {event.description || "-"}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {hasPermission("activities", "events.edit") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("actions.edit")}
                      onClick={() => onEdit(event)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                  {hasPermission("activities", "events.delete") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      aria-label={t("actions.delete")}
                      onClick={() => onDelete(event)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
