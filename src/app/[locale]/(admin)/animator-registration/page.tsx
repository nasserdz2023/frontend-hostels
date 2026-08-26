"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ControlPanel } from "@/components/odoo/ControlPanel";
import { OdooSearch } from "@/components/odoo/OdooSearch";
import type { FilterOption, GroupOption } from "@/components/odoo/OdooSearch";
import {
  Plus,
  Users,
  Calendar,
  Loader2,
  Layers,
  Eye,
  Trash2,
  RefreshCw,
  Download,
  User,
  Briefcase,
  MapPin,
} from "lucide-react";
import {
  animatorRegistrationApi,
  AnimatorBatch,
} from "@/lib/api/animator-registration";
import { useAuthStore } from "@/lib/stores/auth";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG, POSITION_LABELS, GENDER_LABELS } from "@/lib/constants/animator";

import { PermissionGuard } from "@/hooks/useRequirePermission";

// ─── Hoisted Static Icons (rendering-hoist-jsx) ────────────────────────────
const EmptyStateIcon = (
  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/60 mb-5">
    <Layers className="h-10 w-10 text-muted-foreground/30" />
  </div>
);

// ─── Helpers ────────────────────────────────────────────────────────────────

function getProgressPercent(status: string): number {
  switch (status) {
    case "draft":
      return 10;
    case "active":
      return 55;
    case "completed":
      return 100;
    case "closed":
      return 100;
    default:
      return 0;
  }
}

function getProgressColor(status: string): string {
  switch (status) {
    case "active":
      return "bg-emerald-500";
    case "completed":
      return "bg-blue-500";
    case "closed":
      return "bg-slate-400";
    default:
      return "bg-amber-500";
  }
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AnimatorRegistrationPage() {
  const t = useTranslations("animator-registration");
  const tc = useTranslations("common");
  const router = useRouter();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((state) => state.hasPermission);

  // ── Dialog state ────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [description, setDescription] = useState("");

  // ── Data fetching ───────────────────────────────────────────────────────
  const {
    data: batches,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["animator-batches"],
    queryFn: async () => {
      const res = await animatorRegistrationApi.getBatches();
      return res.data;
    },
  });

  // ── Derived data (useMemo) ──────────────────────────────────────────────
  const totalAnimators = useMemo(
    () => batches?.reduce((sum, b) => sum + b.total_animators, 0) ?? 0,
    [batches]
  );

  const canCreate = hasPermission("animator_registration", "create");
  const canDelete = hasPermission("animator_registration", "delete");
  const canSync = hasPermission("animator_registration", "manage");

  // ── Mutations ───────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      year: number;
      description?: string;
    }) => {
      const res = await animatorRegistrationApi.createBatch(payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["animator-batches"] });
      setOpen(false);
      resetForm();
      router.push(`/${locale}/animator-registration/${data.id}`);
      toast.success(tc("success"));
    },
    onError: () => {
      toast.error(tc("error"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await animatorRegistrationApi.deleteBatch(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animator-batches"] });
      toast.success(tc("delete"));
    },
    onError: () => {
      toast.error(tc("error"));
    },
  });

  // ── Stable callbacks (useCallback) ──────────────────────────────────────
  const resetForm = useCallback(() => {
    setName("");
    setYear(new Date().getFullYear());
    setDescription("");
  }, []);

  const handleCreate = useCallback(() => {
    if (!name.trim()) return;
    createMutation.mutate({
      name: name.trim(),
      year,
      description: description.trim() || undefined,
    });
  }, [name, year, description, createMutation]);

  const handleNavigateToBatch = useCallback(
    (batchId: string) => {
      router.push(`/${locale}/animator-registration/${batchId}`);
    },
    [router, locale]
  );

  const handleDeleteBatch = useCallback(
    (batch: AnimatorBatch) => {
      if (confirm(t("confirmDeleteBatch"))) {
        deleteMutation.mutate(batch.id);
      }
    },
    [deleteMutation, t]
  );

  const handleSync = useCallback(() => {
    router.push(`/${locale}/animator-registration/sync`);
  }, [router, locale]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleOpenCreateDialog = useCallback(() => {
    setOpen(true);
  }, []);

  const handleDialogClose = useCallback(
    (v: boolean) => {
      setOpen(v);
      if (!v) resetForm();
    },
    [resetForm]
  );

  // ── Animator search state ──────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [activeGroupBy, setActiveGroupBy] = useState<string | null>(null);

  // ── Animated search query ──────────────────────────────────────────
  const { data: animatorResults, isLoading: isSearching } = useQuery({
    queryKey: ["animator-search", searchQuery, activeFilters, activeGroupBy],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (searchQuery) params.q = searchQuery;
      if (activeFilters.gender) params.gender = activeFilters.gender;
      if (activeFilters.position) params.position = activeFilters.position;
      if (activeFilters.position_type) params.position_type = activeFilters.position_type;
      if (activeFilters.residence_wilaya) params.residence_wilaya = activeFilters.residence_wilaya;
      if (activeFilters.birth_wilaya) params.birth_wilaya = activeFilters.birth_wilaya;
      if (activeFilters.batch_id) params.batch_id = activeFilters.batch_id;
      if (activeFilters.status) params.status = activeFilters.status;
      if (activeGroupBy) params.group_by = activeGroupBy;
      const hasAny = Object.keys(params).length > 0;
      if (!hasAny) return null;
      const res = await animatorRegistrationApi.searchAnimators(params);
      return res.data;
    },
    enabled: true,
  });

  const hasActiveSearch = !!searchQuery || Object.values(activeFilters).some(Boolean);
  const flatResults = useMemo(() => {
    if (!animatorResults) return [];
    if (animatorResults.items) return animatorResults.items;
    if (animatorResults.grouped) {
      return Object.values(animatorResults.grouped).flat();
    }
    return [];
  }, [animatorResults]);

  // ── Filter definitions for OdooSearch ──────────────────────────────
  const searchFilters: FilterOption[] = useMemo(() => [
    {
      id: "gender",
      label: "الجنس",
      type: "select",
      icon: <User className="w-4 h-4" />,
      options: [
        { label: "ذكر", value: "MALE" },
        { label: "أنثى", value: "FEMALE" },
      ],
    },
    {
      id: "position",
      label: "المنصب",
      type: "select",
      icon: <Briefcase className="w-4 h-4" />,
      options: [
        { label: "منشط", value: "animator" },
        { label: "حارس سباحة", value: "lifeguard" },
        { label: "مسير مالي", value: "financial_manager" },
        { label: "مدير", value: "director" },
      ],
    },
    {
      id: "position_type",
      label: "نوع المنصب",
      type: "select",
      options: [
        { label: "متدرب", value: "trainee" },
        { label: "معيّن", value: "appointed" },
      ],
    },
    {
      id: "residence_wilaya",
      label: "ولاية الإقامة",
      type: "select",
      icon: <MapPin className="w-4 h-4" />,
      options: Array.from({ length: 58 }, (_, i) => {
        const num = String(i + 1).padStart(2, "0");
        return { label: `${num} - ولاية ${num}`, value: num };
      }),
    },
    {
      id: "birth_wilaya",
      label: "ولاية الميلاد",
      type: "select",
      icon: <MapPin className="w-4 h-4" />,
      options: Array.from({ length: 58 }, (_, i) => {
        const num = String(i + 1).padStart(2, "0");
        return { label: `${num} - ولاية ${num}`, value: num };
      }),
    },
    {
      id: "status",
      label: "الحالة",
      type: "select",
      options: [
        { label: "قيد الانتظار", value: "pending" },
        { label: "تم الاستخراج", value: "extracted" },
        { label: "مسجل", value: "registered" },
        { label: "ممزامن", value: "synced" },
        { label: "فشل", value: "failed" },
      ],
    },
    {
      id: "batch_id",
      label: "الدفعة",
      type: "select",
      options: batches?.map(b => ({ label: b.name, value: b.id })) ?? [],
    },
  ], [batches]);

  const searchGroupByOptions: GroupOption[] = [
    { id: "gender", label: "حسب الجنس" },
    { id: "position", label: "حسب المنصب" },
    { id: "position_type", label: "حسب نوع المنصب" },
    { id: "residence_wilaya", label: "حسب ولاية الإقامة" },
    { id: "birth_wilaya", label: "حسب ولاية الميلاد" },
    { id: "status", label: "حسب الحالة" },
    { id: "batch_id", label: "حسب الدفعة" },
  ];

  // ── Action buttons for ControlPanel ─────────────────────────────────────
  const controlPanelActions = (
    <>
      <Button variant="outline" size="sm" onClick={handleRefresh}>
        <RefreshCw className="h-4 w-4" />
      </Button>
      {canSync && (
        <Button variant="outline" size="sm" onClick={handleSync}>
          <Download className="h-4 w-4 ms-1.5" />
          {t("registerToMinistry")}
        </Button>
      )}
      {canCreate && (
        <Button size="sm" onClick={handleOpenCreateDialog}>
          <Plus className="h-4 w-4 ms-1.5" />
          {t("createBatch")}
        </Button>
      )}
    </>
  );

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <PermissionGuard module="animator_registration" action="view">
        <div className="flex flex-col h-full bg-background">
      {/* Header — ControlPanel */}
      <ControlPanel
        title={t("title")}
        breadcrumbs={[]}
        actions={controlPanelActions}
        hideSearch
      />

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-3" />
            <p className="text-sm">{tc("loading")}</p>
          </div>
        ) : !batches?.length ? (
          /* Empty State — improved with create button */
          <Card className="rounded-2xl border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-20">
              {EmptyStateIcon}
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {t("noBatches")}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center">
                {t("subtitle")}
              </p>
              {canCreate && (
                <Button onClick={handleOpenCreateDialog}>
                  <Plus className="h-4 w-4 ms-1.5" />
                  {t("createBatch")}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Batch List */
          <div className="space-y-3">
            {/* OdooSearch — centered with filters & groupBy */}
            <div className="relative max-w-3xl mx-auto mb-6">
              <OdooSearch
                initialSearch={searchQuery}
                onSearch={setSearchQuery}
                placeholder="ابحث عن منشط بالاسم أو رقم التعريف..."
                filters={searchFilters}
                groupByOptions={searchGroupByOptions}
                onFilterChange={setActiveFilters}
                onGroupChange={setActiveGroupBy}
              />
            </div>

            {/* Search Results */}
            {hasActiveSearch && (
              <Card className="rounded-2xl border-border/50 bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      نتائج البحث ({animatorResults?.total ?? 0})
                    </h3>
                    {activeGroupBy && (
                      <Badge variant="outline" className="text-xs">
                        تجميع حسب: {searchGroupByOptions.find(g => g.id === activeGroupBy)?.label}
                      </Badge>
                    )}
                  </div>

                  {isSearching ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : !flatResults.length ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      لا توجد نتائج مطابقة
                    </p>
                  ) : activeGroupBy && animatorResults?.grouped ? (
                    /* Grouped results */
                    <div className="space-y-4">
                      {Object.entries(animatorResults.grouped).map(([groupKey, items]) => (
                        <div key={groupKey}>
                          <h4 className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                            {groupKey} ({items.length})
                          </h4>
                          <div className="space-y-1">
                            {items.map((a) => (
                              <div
                                key={a.id}
                                onClick={() => router.push(`/${locale}/animator-registration/animator/${a.id}`)}
                                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                    {a.first_name[0]}{a.last_name[0]}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{a.first_name} {a.last_name}</p>
                                    <p className="text-[10px] text-muted-foreground">{a.national_id || "بدون رقم"}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={cn("text-[10px] px-2 py-0 border", STATUS_CONFIG[a.status]?.color ?? STATUS_CONFIG.pending.color)}>
                                    {STATUS_CONFIG[a.status]?.label ?? a.status}
                                  </Badge>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Flat results */
                    <div className="space-y-1">
                      {flatResults.map((a) => (
                        <div
                          key={a.id}
                          onClick={() => router.push(`/${locale}/animator-registration/animator/${a.id}`)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {a.first_name[0]}{a.last_name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{a.first_name} {a.last_name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {a.national_id || "بدون رقم"} · {a.gender === "MALE" ? "ذكر" : a.gender === "FEMALE" ? "أنثى" : ""} · {POSITION_LABELS[a.position] ?? a.position}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={cn("text-[10px] px-2 py-0 border", STATUS_CONFIG[a.status]?.color ?? STATUS_CONFIG.pending.color)}>
                              {STATUS_CONFIG[a.status]?.label ?? a.status}
                            </Badge>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Summary bar */}
            <div className="flex items-center gap-4 px-1 text-xs text-muted-foreground">
              <span className="font-medium">
                {batches.length} {locale === "ar" ? "دفعة" : "batches"}
              </span>
              {totalAnimators > 0 && (
                <>
                  <span className="text-border">|</span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {totalAnimators} {t("animators")}
                  </span>
                </>
              )}
            </div>

            {batches.map((batch) => {
              const statusCfg =
                STATUS_CONFIG[batch.status] || STATUS_CONFIG.draft;
              const progressPercent = getProgressPercent(batch.status);
              const progressColor = getProgressColor(batch.status);

              return (
                <div
                  key={batch.id}
                  className={cn(
                    "group relative rounded-2xl border border-border/50 p-5",
                    "transition-all duration-200 hover:shadow-md hover:border-border/80",
                    "bg-card"
                  )}
                >
                  {/* Decorative top gradient line */}
                  <div
                    className={cn(
                      "absolute top-0 start-4 end-4 h-0.5 rounded-full opacity-50 transition-opacity duration-200",
                      "group-hover:opacity-80",
                      progressColor
                    )}
                  />

                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Main info */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleNavigateToBatch(batch.id)}
                    >
                      <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                        <h3 className="font-bold text-base leading-tight text-foreground">
                          {batch.name}
                        </h3>
                        <Badge
                          className={cn(
                            "text-[10px] px-2 py-0 shrink-0 border",
                            statusCfg.color
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full inline-block ms-1",
                              statusCfg.dot
                            )}
                          />
                          {statusCfg.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground/50 font-mono hidden sm:inline">
                          #{batch.id.slice(0, 8)}
                        </span>
                      </div>

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {batch.year}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          {batch.total_animators} {t("animators")}
                        </span>
                      </div>

                      {/* Progress bar */}
                      {batch.total_animators > 0 && (
                        <div className="mt-3 flex items-center gap-3">
                          <Progress
                            value={progressPercent}
                            className="h-1.5 w-40"
                          />
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {progressPercent}%
                          </span>
                        </div>
                      )}

                      {batch.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                          {batch.description}
                        </p>
                      )}

                      <div className="mt-1.5 text-[10px] text-muted-foreground/50">
                        {new Date(batch.created_at).toLocaleString("ar-DZ")}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 px-3"
                        onClick={() => handleNavigateToBatch(batch.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 px-3 text-muted-foreground hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                          onClick={() => handleDeleteBatch(batch)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Batch Dialog */}
      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("createBatch")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>{t("batchName")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("batchNamePlaceholder")}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>{t("year")}</Label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("description")}</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || createMutation.isPending}
              className="w-full"
            >
              {createMutation.isPending && (
                <Loader2 className="ms-2 h-4 w-4 animate-spin" />
              )}
              {tc("save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </PermissionGuard>
      )
    ;
      }