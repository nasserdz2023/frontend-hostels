"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { activitiesApi } from "@/lib/api/activities";
import type { NationalEvent, EventFormValues, Translator } from "./types";

interface EventFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingEvent: NationalEvent | null;
  t: Translator;
  tCommon: Translator;
  months: string[];
  onSuccess: () => void;
}

const defaultFormValues: EventFormValues = {
  name_ar: "",
  name_fr: "",
  event_type: "NATIONAL",
  month: 1,
  day: 1,
  description: "",
  suggested_activities: "",
};

export function EventFormDialog({
  isOpen,
  onOpenChange,
  editingEvent,
  t,
  tCommon,
  months,
  onSuccess,
}: EventFormDialogProps) {
  const eventSchema = useMemo(
    () =>
      z.object({
        name_ar: z.string().min(1, t("events.validation.name_required")),
        name_fr: z.string().optional(),
        event_type: z.string().min(1, t("events.validation.type_required")),
        month: z
          .number()
          .min(1, t("events.validation.month_invalid"))
          .max(12),
        day: z
          .number()
          .min(1, t("events.validation.day_invalid"))
          .max(31),
        description: z.string().optional(),
        suggested_activities: z.string().optional(),
      }),
    [t]
  );

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: defaultFormValues,
  });

  // Reset form when dialog opens or editing event changes
  useEffect(() => {
    if (!isOpen) return;

    if (editingEvent) {
      form.reset({
        name_ar: editingEvent.name_ar,
        name_fr: editingEvent.name_fr || "",
        event_type: editingEvent.event_type,
        month: editingEvent.month ?? 1,
        day: editingEvent.day ?? 1,
        description: editingEvent.description || "",
        suggested_activities:
          editingEvent.suggested_activities?.join("\n") || "",
      });
    } else {
      form.reset(defaultFormValues);
    }
  }, [editingEvent, isOpen, form]);

  const onSubmit = async (data: EventFormValues) => {
    try {
      const payload = {
        ...data,
        suggested_activities: data.suggested_activities
          ? data.suggested_activities.split("\n").filter((s) => s.trim())
          : [],
      };

      if (editingEvent) {
        await activitiesApi.updateNationalEvent(editingEvent.id, payload);
        toast.success(t("events.messages.update_success"));
      } else {
        await activitiesApi.createNationalEvent(payload);
        toast.success(t("events.messages.create_success"));
      }

      onSuccess();
    } catch (error) {
      console.error("Failed to save event:", error);
      toast.error(t("events.messages.save_error"));
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingEvent ? t("events.form.edit") : t("events.form.new")}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name_ar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("events.form.labels.name_ar")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("events.form.placeholders.name_ar")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name_fr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("events.form.labels.name_fr")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("events.form.placeholders.name_fr")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="event_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("events.form.labels.type")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("events.form.labels.month")}</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(parseInt(v))}
                      defaultValue={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {months.map((m, i) => (
                          <SelectItem key={i} value={String(i + 1)}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("events.form.labels.day")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("events.form.labels.description")}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t("events.form.placeholders.description")}
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="suggested_activities"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("events.form.labels.suggested_activities")}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t(
                        "events.form.placeholders.suggested_activities"
                      )}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                )}
                {tCommon("save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
