"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CloudDownload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ministerialSyncApi, MinisterialSyncImport } from "@/lib/api/ministerial_sync";
import { getErrorMessage } from "@/lib/api/client";

interface MinisterialSyncButtonProps {
  onSyncComplete?: (result: MinisterialSyncImport) => void;
}

export function MinisterialSyncButton({ onSyncComplete }: MinisterialSyncButtonProps) {
  const t = useTranslations("ministerial-sync");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const response = await ministerialSyncApi.triggerSync();
      const result = response.data;
      setSyncResult({
        success: true,
        message: t("sync_success_desc", { total: result.total_new }),
      });
      if (onSyncComplete) {
        onSyncComplete(result);
      }
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setSyncResult({
        success: false,
        message: errorMsg || t("sync_error_desc"),
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="lg"
            disabled={syncing}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            {syncing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("syncing")}
              </>
            ) : (
              <>
                <CloudDownload className="h-5 w-5" />
                {t("sync_now")}
              </>
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sync_confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("sync_confirm_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse sm:space-x-reverse space-x-2">
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSync} className="bg-indigo-600 hover:bg-indigo-700">
              {t("sync_confirm_yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {syncResult && (
        <Alert variant={syncResult.success ? "default" : "destructive"}>
          {syncResult.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {syncResult.success ? t("sync_success") : t("sync_error")}
          </AlertTitle>
          <AlertDescription>
            {syncResult.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
