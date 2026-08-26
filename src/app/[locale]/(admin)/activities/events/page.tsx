"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { activitiesApi } from "@/lib/api/activities";
import { useAuthStore } from "@/lib/stores/auth";

import {
  EventFilters,
  EventTable,
  EventFormDialog,
  DeleteConfirmDialog,
  EventQuickStats,
} from "./_components";
import type { NationalEvent } from "./_components";

export default function NationalEventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const t = useTranslations("activities");
  const tCommon = useTranslations("common");

  const [events, setEvents] = useState<NationalEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<NationalEvent | null>(
    null
  );
  const [editingEvent, setEditingEvent] = useState<NationalEvent | null>(
    null
  );
  const { hasPermission } = useAuthStore();

  // Filter states
  const [filters, setFilters] = useState({
    event_type: "ALL",
    month: "ALL",
  });

  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const query: { event_type?: string; month?: number } = {};
      if (filters.event_type !== "ALL") query.event_type = filters.event_type;
      if (filters.month !== "ALL") query.month = parseInt(filters.month);

      const data = await activitiesApi.getNationalEvents(query);
      setEvents(data);
    } catch (error) {
      console.error("Failed to load events:", error);
      toast.error(t("events.messages.load_error"));
    } finally {
      setIsLoading(false);
    }
  }, [filters, t]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleDelete = useCallback(async () => {
    if (!eventToDelete) return;
    try {
      await activitiesApi.deleteNationalEvent(eventToDelete.id);
      toast.success(t("events.messages.delete_success"));
      setEventToDelete(null);
      loadEvents();
    } catch (error) {
      console.error("Failed to delete event:", error);
      toast.error(t("events.messages.delete_error"));
    }
  }, [eventToDelete, loadEvents, t]);

  const handleOpenAddDialog = useCallback(() => {
    setEditingEvent(null);
    setIsDialogOpen(true);
  }, []);

  const handleEdit = useCallback((event: NationalEvent) => {
    setEditingEvent(event);
    setIsDialogOpen(true);
  }, []);

  const handleDeleteRequest = useCallback((event: NationalEvent) => {
    setEventToDelete(event);
  }, []);

  const handleDialogSuccess = useCallback(() => {
    setIsDialogOpen(false);
    setEditingEvent(null);
    loadEvents();
  }, [loadEvents]);

  const months = t.raw("events.months") as string[];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir={locale === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("events.title")}</h1>
          <p className="text-gray-500">{t("events.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <EventFilters
            filters={filters}
            onFilterChange={setFilters}
            t={t}
            months={months}
          />

          {hasPermission("activities", "events.create") && (
            <Button onClick={handleOpenAddDialog}>
              <Plus className="w-4 h-4 me-2" />
              {t("events.add")}
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <EventQuickStats events={events} t={t} />

      {/* Events Table */}
      <Card>
        <CardContent className="p-0">
          <EventTable
            events={events}
            isLoading={isLoading}
            t={t}
            hasPermission={hasPermission}
            months={months}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
          />
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <EventFormDialog
        isOpen={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingEvent(null);
        }}
        editingEvent={editingEvent}
        t={t}
        tCommon={tCommon}
        months={months}
        onSuccess={handleDialogSuccess}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        eventToDelete={eventToDelete}
        onClose={() => setEventToDelete(null)}
        onConfirm={handleDelete}
        t={t}
        tCommon={tCommon}
      />
    </div>
  );
}
