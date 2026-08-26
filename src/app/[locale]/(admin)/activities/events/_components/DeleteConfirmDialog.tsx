"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { NationalEvent, Translator } from "./types";

interface DeleteConfirmDialogProps {
  eventToDelete: NationalEvent | null;
  onClose: () => void;
  onConfirm: () => void;
  t: Translator;
  tCommon: Translator;
}

export function DeleteConfirmDialog({
  eventToDelete,
  onClose,
  onConfirm,
  t,
  tCommon,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog
      open={!!eventToDelete}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("events.delete.title")}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {t("events.delete.confirm", {
            name: eventToDelete?.name_ar ?? "",
          })}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {tCommon("cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {tCommon("delete")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
