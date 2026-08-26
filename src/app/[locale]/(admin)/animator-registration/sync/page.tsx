"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Loader2,
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { animatorRegistrationApi } from "@/lib/api/animator-registration";
import { PermissionGuard } from "@/hooks/useRequirePermission";

// ─── Sync Page ─────────────────────────────────────────────────────────────

export default function AnimatorMinistrySyncPage() {
  const router = useRouter();

  const queryClient = useQueryClient();

  // ── Controls state ─────────────────────────────────────────────────────
  const [fetchAll, setFetchAll] = useState(true);
  const [limit, setLimit] = useState<number>(10);

  // ── Poll sync status ───────────────────────────────────────────────────
  const {
    data: status,
    isLoading: statusLoading,
  } = useQuery({
    queryKey: ["ministry-sync-status"],
    queryFn: async () => {
      const res = await animatorRegistrationApi.getMinistrySyncStatus();
      return res.data;
    },
    refetchInterval: (query) => {
      // Poll every 2s while running, stop when done
      const data = query.state.data;
      if (data?.is_running) return 2000;
      return false;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // ── Start sync mutation ────────────────────────────────────────────────
  const startMutation = useMutation({
    mutationFn: async () => {
      const effectiveLimit = fetchAll ? null : limit;
      const res = await animatorRegistrationApi.startMinistrySync(effectiveLimit);
      return res.data;
    },
    onSuccess: () => {
      toast.success("تم بدء المزامنة بنجاح");
      // Force refetch status so polling picks up is_running=true
      queryClient.invalidateQueries({ queryKey: ["ministry-sync-status"] });
    },
    onError: () => {
      toast.error("فشل في بدء المزامنة");
    },
  });

  // ── Cancel sync mutation ───────────────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await animatorRegistrationApi.cancelMinistrySync();
      return res.data;
    },
    onSuccess: () => {
      toast.success("تم إلغاء المزامنة");
    },
    onError: () => {
      toast.error("فشل في إلغاء المزامنة");
    },
  });

  const isRunning = status?.is_running ?? false;
  const isDone = status?.done ?? false;
  const progressPercent =
    status && status.total > 0
      ? Math.round((status.progress / status.total) * 100)
      : 0;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
  <PermissionGuard module="animator_registration" action="view">
          
        <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/animator-registration")}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            مزامنة المنشطن من المنصة الوزارية
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            استيراد بيانات المنشطن من قاعدة بيانات المنصة الوزارية
          </p>
        </div>
      </div>

      {/* Sync Controls Card */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-5 w-5" />
            إعدادات المزامنة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Limit controls */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="fetch-all"
                checked={fetchAll}
                onCheckedChange={(checked) => setFetchAll(checked === true)}
                disabled={isRunning}
              />
              <Label htmlFor="fetch-all" className="cursor-pointer">
                جلب الكل
              </Label>
            </div>

            {!fetchAll && (
              <div className="space-y-2 mr-8">
                <Label htmlFor="limit-input">عدد السجلات</Label>
                <Input
                  id="limit-input"
                  type="number"
                  min={1}
                  value={limit}
                  onChange={(e) => setLimit(Math.max(1, Number(e.target.value)))}
                  disabled={isRunning}
                  placeholder="أدخل العدد"
                  className="w-48"
                />
              </div>
            )}
          </div>

          {/* Start button */}
          <Button
            onClick={() => startMutation.mutate()}
            disabled={isRunning || startMutation.isPending}
            className="w-full"
          >
            {startMutation.isPending ? (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="ml-2 h-4 w-4" />
            )}
            بدء المزامنة
          </Button>
        </CardContent>
      </Card>

      {/* Progress Card — shown while running, done, or has errors */}
      {(isRunning || isDone || (status?.errors && status.errors.length > 0) || (status?.total ?? 0) > 0) && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {isRunning ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : isDone && !isRunning ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <RefreshCw className="h-5 w-5" />
              )}
              حالة المزامنة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Message */}
            {status?.message && (
              <p className="text-sm text-muted-foreground">{status.message}</p>
            )}

            {/* Progress bar */}
            {isRunning && status && (
              <div className="space-y-2">
                <Progress value={progressPercent} className="h-3" />
                <p className="text-sm text-center text-muted-foreground">
                  {status.progress}/{status.total} منشط — {progressPercent}%
                </p>
                {status.current_step && (
                  <p className="text-xs text-center text-muted-foreground/70">
                    {status.current_step}
                  </p>
                )}
              </div>
            )}

            {/* Done state */}
            {isDone && !isRunning && status && (
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="text-lg font-semibold">اكتملت المزامنة بنجاح</p>
                {status.batch_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(`/animator-registration/${status!.batch_id}`)
                    }
                  >
                    عرض الدفعة
                    <ArrowRight className="mr-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Errors */}
            {status?.errors && status.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    أخطاء ({status.errors.length})
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-1">
                  {status.errors.map((err, i) => (
                    <p key={i} className="text-xs text-destructive/80">
                      {err}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Cancel button */}
            {isRunning && (
              <Button
                variant="destructive"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="w-full"
              >
                {cancelMutation.isPending ? (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <X className="ml-2 h-4 w-4" />
                )}
                إلغاء المزامنة
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Running badge (visible even before status loads) */}
      {isRunning && (
        <div className="fixed bottom-6 left-6 z-50">
          <Badge className="bg-primary text-primary-foreground px-4 py-2 text-sm shadow-lg animate-pulse">
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            جاري المزامنة...
          </Badge>
        </div>
      )}
    </div>
  </PermissionGuard>
  );
}