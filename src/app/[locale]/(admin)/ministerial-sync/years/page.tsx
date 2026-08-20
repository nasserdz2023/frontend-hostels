"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Archive,
  Loader2,
  Package,
  Users,
  FileInput,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";
import { ministerialSyncApi } from "@/lib/api/ministerial_sync";
import { cn } from "@/lib/utils";
import { PermissionGuard } from "@/hooks/useRequirePermission";

export default function YearsManagementPage() {
  const t = useTranslations("ministerial-sync");
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const queryClient = useQueryClient();

  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear() + 1);

  // ── Fetch years overview ──────────────────────────────────────────
  const { data: overview, isLoading } = useQuery({
    queryKey: ["ministerial-years-overview"],
    queryFn: async () => {
      const res = await ministerialSyncApi.getYearsOverview();
      return res.data;
    },
  });

  // ── Archive mutation ──────────────────────────────────────────────
  const archiveMutation = useMutation({
    mutationFn: async (year: number) => {
      const res = await ministerialSyncApi.archiveYear(year);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`تم أرشفة سنة ${data.archived_year} وفتح سنة ${data.new_year}`);
      setShowArchiveConfirm(false);
      queryClient.invalidateQueries({ queryKey: ["ministerial-years-overview"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "خطأ في الأرشفة");
    },
  });

  if (isLoading) {

    return (
            
            <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
      ;
  }

  if (!overview) return null;

  return (
  <PermissionGuard module="ministerial_sync" action="view">
      <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* ════════════════════════════════════════════════════════════════
          HEADER
          ════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/${locale}/ministerial-sync`)}
          className="h-8 w-8 p-0 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-foreground">إدارة سنوات العمل</h1>
          <p className="text-xs text-muted-foreground">
            أرشفة السنوات القديمة وفتح سنوات جديدة
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          CURRENT YEAR CARD
          ════════════════════════════════════════════════════════════════ */}
      <Card className="rounded-2xl border-border/50 bg-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">السنة النشطة</p>
                <p className="text-2xl font-bold text-foreground">
                  {overview.current_year}
                </p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
              <CheckCircle2 className="h-3 w-3 ml-1" />
              نشطة
            </Badge>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 rounded-xl bg-muted/30">
              <Package className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold text-foreground">
                {overview.current_stats.batches_count}
              </p>
              <p className="text-[10px] text-muted-foreground">دفعة</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/30">
              <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold text-foreground">
                {overview.current_stats.registrations_count}
              </p>
              <p className="text-[10px] text-muted-foreground">تسجيل</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/30">
              <FileInput className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold text-foreground">
                {overview.current_stats.imports_count}
              </p>
              <p className="text-[10px] text-muted-foreground">عملية استيراد</p>
            </div>
          </div>

          {/* Archive Button */}
          {!showArchiveConfirm ? (
            <Button
              variant="outline"
              className="w-full rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50"
              onClick={() => {
                setNewYear(overview.current_year + 1);
                setShowArchiveConfirm(true);
              }}
            >
              <Archive className="h-4 w-4 ml-2" />
              أرشفة السنة وفتح سنة جديدة
            </Button>
          ) : (
            <div className="border border-orange-200 rounded-xl p-4 bg-orange-50/50">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <p className="text-sm font-semibold text-orange-800">
                  تأكيد الأرشفة
                </p>
              </div>
              <p className="text-xs text-orange-700 mb-3">
                سيتم أرشفة جميع بيانات سنة <strong>{overview.current_year}</strong> وفتح سنة <strong>{newYear}</strong> جديدة.
                جميع التسجيلات والدفعات ستمر بوضع &quot;مؤرشف&quot; ولن تظهر في الصفحة الرئيسية.
              </p>

              <div className="flex items-center gap-2 mb-3">
                <label className="text-xs text-orange-700">السنة الجديدة:</label>
                <input
                  type="number"
                  value={newYear}
                  onChange={(e) => setNewYear(parseInt(e.target.value) || overview.current_year + 1)}
                  min={overview.current_year + 1}
                  max={overview.current_year + 10}
                  className="h-8 w-24 rounded-lg border border-orange-300 bg-white px-2 text-sm text-center"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
                  disabled={archiveMutation.isPending || newYear <= overview.current_year}
                  onClick={() => archiveMutation.mutate(newYear)}
                >
                  {archiveMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" />
                  ) : (
                    <Archive className="h-3.5 w-3.5 ml-1" />
                  )}
                  أرشفة وفتح {newYear}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl"
                  onClick={() => setShowArchiveConfirm(false)}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ════════════════════════════════════════════════════════════════
          ARCHIVED YEARS
          ════════════════════════════════════════════════════════════════ */}
      {overview.archived_years.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Archive className="h-4 w-4 text-muted-foreground" />
            السنوات المؤرشفة
          </h2>
          <div className="space-y-3">
            {overview.archived_years.map((yr) => (
              <Card key={yr.year} className="rounded-2xl border-border/50 bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
                        <Archive className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {yr.year}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {yr.batches_count} دفعة · {yr.registrations_count} تسجيل · {yr.imports_count} استيراد
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      مؤرشفة
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {overview.archived_years.length === 0 && (
        <Card className="rounded-2xl border-border/50 bg-card">
          <CardContent className="p-8 text-center">
            <Archive className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              لا توجد سنوات مؤرشفة بعد
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              عند أرشفة السنة الحالية، ستظهر هنا
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  </PermissionGuard>
              );
}