"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Upload,
  Loader2,
  Send,
  Trash2,
  Eye,
  Calendar,
  Users,
  AlertCircle,
  ScanLine,
  RotateCw,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import {
  animatorRegistrationApi,
  AnimatorRegistration,
} from "@/lib/api/animator-registration";
import { useAuthStore } from "@/lib/stores/auth";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG, POSITION_LABELS, GENDER_LABELS } from "@/lib/constants/animator";
import { OdooSearch } from "@/components/odoo/OdooSearch";
import type { FilterOption, GroupOption } from "@/components/odoo/OdooSearch";

import { PermissionGuard, AccessDenied } from "@/hooks/useRequirePermission";

/* ═══════════════════════════════════════════════════════════════════════════
   Platform Design System — Light Theme
   White card backgrounds • rounded-2xl • border-border/50 • font-sans
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── Static data (hoisted outside component: rendering-hoist-jsx) ─────────

const FILE_FIELDS = [
  { key: "photo", labelKey: "photo", icon: "📷", accept: ".jpg,.jpeg,.png" },
  { key: "residence_card", labelKey: "residenceCard", icon: "🪪", accept: ".pdf,.jpg,.jpeg,.png" },
  { key: "certificate", labelKey: "certificate", icon: "📜", accept: ".pdf,.jpg,.jpeg,.png" },
  { key: "student_card", labelKey: "studentCard", icon: "🎓", accept: ".pdf,.jpg,.jpeg,.png" },
  { key: "medical_cert", labelKey: "medicalCert", icon: "🏥", accept: ".pdf,.jpg,.jpeg,.png" },
  { key: "chest_cert", labelKey: "chestCert", icon: "🫁", accept: ".pdf,.jpg,.jpeg,.png" },
] as const;

const STATUS_FILTERS = [
  { value: "all", labelKey: "all", icon: Users },
  { value: "pending", labelKey: "pending", icon: Clock },
  { value: "extracted", labelKey: "extracted", icon: FileText },
  { value: "synced", labelKey: "synced", icon: CheckCircle2 },
  { value: "failed", labelKey: "failed", icon: XCircle },
] as const;

// ─── Stat card config (static, no re-renders) ─────────────────────────────

const STAT_CARDS = [
  { key: "total", labelKey: "total", icon: Users, accent: "primary" },
  { key: "pending", labelKey: "pending", icon: Clock, accent: "amber" },
  { key: "extracted", labelKey: "extracted", icon: FileText, accent: "blue" },
  { key: "synced", labelKey: "synced", icon: CheckCircle2, accent: "emerald" },
] as const;

const ACCENT_MAP: Record<
  string,
  { border: string; bg: string; text: string; iconBg: string; iconText: string }
> = {
  primary: {
    border: "border-primary/20",
    bg: "bg-primary/5",
    text: "text-foreground",
    iconBg: "bg-primary/10",
    iconText: "text-primary",
  },
  amber: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-700",
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
  },
  blue: {
    border: "border-blue-200",
    bg: "bg-blue-50",
    text: "text-blue-700",
    iconBg: "bg-blue-100",
    iconText: "text-blue-600",
  },
  emerald: {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
  },
};

// ─── Hoisted static sub-components (rendering-hoist-jsx) ──────────────────

const EmptyTableIcon = () => (
  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
    <Users className="h-8 w-8 text-muted-foreground/40" />
  </div>
);

const NoResultsIcon = () => (
  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-3">
    <Search className="h-6 w-6 text-muted-foreground/40" />
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function BatchDetailPage() {
  const t = useTranslations("animator-registration");
  const tc = useTranslations("common");
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const batchId = params.id as string;


  // ── UI state ─────────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Data fetching ───────────────────────────────────────────────────────
  const { data: batch, isLoading } = useQuery({
    queryKey: ["animator-batch", batchId],
    queryFn: async () => {
      const res = await animatorRegistrationApi.getBatch(batchId);
      return res.data;
    },
    enabled: !!batchId,
  });

  // ── Animators list ──────────────────────────────────────────────────────
  const animators = batch?.animators || [];

  // ── Single-pass stats (js-combine-iterations) ───────────────────────────
  const stats = useMemo(() => {
    let total = 0;
    let pending = 0;
    let extracted = 0;
    let synced = 0;
    let failed = 0;
    for (const a of animators) {
      total++;
      if (a.status === "pending") pending++;
      else if (a.status === "extracted") extracted++;
      else if (a.status === "synced" || a.status === "registered") synced++;
      else if (a.status === "failed") failed++;
    }
    return { total, pending, extracted, synced, failed };
  }, [animators]);

  // ── Derived booleans (rerender-derived-state) ───────────────────────────
  const hasAnimators = stats.total > 0;

  // ── Completion % ────────────────────────────────────────────────────────
  const completionPercent = useMemo(() => {
    if (stats.total === 0) return 0;
    return Math.round(((stats.extracted + stats.synced) / stats.total) * 100);
  }, [stats.total, stats.extracted, stats.synced]);

  // ── Filtered animators ──────────────────────────────────────────────────
  const filteredAnimators = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const fStatus = activeFilters.status || statusFilter;
    const fGender = activeFilters.gender;
    const fPosition = activeFilters.position;
    const fPositionType = activeFilters.position_type;
    const fResidence = activeFilters.residence_wilaya;
    const fBirth = activeFilters.birth_wilaya;
    const hasAny = q || (fStatus && fStatus !== "all") || fGender || fPosition || fPositionType || fResidence || fBirth;
    if (!hasAny) return animators;

    const result: AnimatorRegistration[] = [];
    for (const a of animators) {
      if (fStatus && fStatus !== "all" && a.status !== fStatus) continue;
      if (fGender && a.gender !== fGender) continue;
      if (fPosition && a.position !== fPosition) continue;
      if (fPositionType && a.position_type !== fPositionType) continue;
      if (fResidence && a.residence_wilaya !== fResidence) continue;
      if (fBirth && a.birth_wilaya !== fBirth) continue;
      if (q) {
        const fullName = `${a.first_name} ${a.last_name}`.toLowerCase();
        const natId = (a.national_id || "").toLowerCase();
        const posLabel = (POSITION_LABELS[a.position] || a.position || "").toLowerCase();
        if (!fullName.includes(q) && !natId.includes(q) && !posLabel.includes(q)) continue;
      }
      result.push(a);
    }
    return result;
  }, [animators, searchQuery, statusFilter, activeFilters]);

  // ── OdooSearch filter definitions ─────────────────────────────────────
  const batchDetailFilters: FilterOption[] = useMemo(() => [
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
      id: "gender",
      label: "الجنس",
      type: "select",
      options: [
        { label: "ذكر", value: "MALE" },
        { label: "أنثى", value: "FEMALE" },
      ],
    },
    {
      id: "position",
      label: "المنصب",
      type: "select",
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
      options: Array.from({ length: 58 }, (_, i) => {
        const num = String(i + 1).padStart(2, "0");
        return { label: `${num} - ولاية ${num}`, value: num };
      }),
    },
    {
      id: "birth_wilaya",
      label: "ولاية الميلاد",
      type: "select",
      options: Array.from({ length: 58 }, (_, i) => {
        const num = String(i + 1).padStart(2, "0");
        return { label: `${num} - ولاية ${num}`, value: num };
      }),
    },
  ], []);

  const batchDetailGroupBy: GroupOption[] = [
    { id: "gender", label: "حسب الجنس" },
    { id: "position", label: "حسب المنصب" },
    { id: "position_type", label: "حسب نوع المنصب" },
    { id: "residence_wilaya", label: "حسب ولاية الإقامة" },
    { id: "birth_wilaya", label: "حسب ولاية الميلاد" },
    { id: "status", label: "حسب الحالة" },
  ];

  // ── File count ──────────────────────────────────────────────────────────
  const fileCount = useMemo(
    () => Object.values(files).filter((f) => f !== null).length,
    [files]
  );

  // ── Mutations ───────────────────────────────────────────────────────────
  const scanMutation = useMutation({
    mutationFn: async (data: {
      first_name: string;
      last_name: string;
      photo?: File;
      residence_card?: File;
      certificate?: File;
      student_card?: File;
      medical_cert?: File;
      chest_cert?: File;
    }) => {
      const res = await animatorRegistrationApi.scanDocuments(batchId, data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["animator-batch", batchId] });
      setFirstName("");
      setLastName("");
      setFiles({});
      setIsScannerOpen(false);
      toast.success(data.message || tc("success"));
    },
    onError: () => {
      toast.error(tc("error"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (animatorId: string) => {
      await animatorRegistrationApi.deleteAnimator(animatorId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animator-batch", batchId] });
      toast.success(tc("delete"));
    },
    onError: () => {
      toast.error(tc("error"));
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (animatorId: string) => {
      const res = await animatorRegistrationApi.registerToMinistry(animatorId);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["animator-batch", batchId] });
      toast.success(data.message || tc("success"));
    },
    onError: () => {
      toast.error(tc("error"));
    },
  });

  const reExtractMutation = useMutation({
    mutationFn: async (animatorId: string) => {
      const res = await animatorRegistrationApi.reExtractAnimator(animatorId);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["animator-batch", batchId] });
      if (data.status === "processing") {
        toast.info(data.message || "جاري إعادة الاستخراج...");
      } else {
        toast.success(data.message || tc("success"));
      }
    },
    onError: () => {
      toast.error(tc("error"));
    },
  });

  const reExtractAllMutation = useMutation({
    mutationFn: async () => {
      const res = await animatorRegistrationApi.reExtractAllAnimators(batchId);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["animator-batch", batchId] });
      if (data.status === "processing") {
        toast.info(data.message || "جاري إعادة استخراج جميع المنشطين...");
      } else {
        toast.success(data.message || tc("success"));
      }
    },
    onError: () => {
      toast.error(tc("error"));
    },
  });

  // ── Handlers (rerender-functional-setstate) ─────────────────────────────
  const handleScan = useCallback(() => {
    if (!firstName.trim() || !lastName.trim()) return;
    scanMutation.mutate({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      ...Object.fromEntries(
        Object.entries(files).filter(([, v]) => v !== null)
      ) as Record<string, File>,
    });
  }, [firstName, lastName, files, scanMutation]);

  const handleFileChange = useCallback((key: string, file: File | null) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
  }, []);

  // ── Permission check ────────────────────────────────────────────────────
  if (!hasPermission("animator_registration", "view")) {
    return <AccessDenied module="animator_registration" action="view" />;
  }
  // ── Loading state ──────────────────────────────────────────────────────
  if (isLoading) {

    return (
            
            <div className="flex flex-col items-center justify-center py-24 min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground mt-3">{tc("loading")}</p>
      </div>
    )
      ;
  }

  // ── Error / not-found ──────────────────────────────────────────────────
  if (!batch) {
    return (
      <div className="flex flex-col items-center justify-center py-24 min-h-[60vh]">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <p className="text-lg font-semibold mb-1">{t("error")}</p>
        <p className="text-sm text-muted-foreground mb-5">
          الدفعة المطلوبة غير موجودة
        </p>
        <Link href="/animator-registration">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 ml-2" />
            {tc("back")}
          </Button>
        </Link>
      </div>
    );
  }

  const batchStatusCfg = STATUS_CONFIG[batch.status] || STATUS_CONFIG.draft;

  return (
    <PermissionGuard module="animator_registration" action="view">
      <div className="flex flex-col h-full bg-background">
      {/* ════════════════════════════════════════════════════════════════════
          SECTION 1 — HEADER with Breadcrumb
          ════════════════════════════════════════════════════════════════════ */}
      <div className="bg-card border-b border-border px-6 py-4">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm font-medium text-muted-foreground mb-3">
          <Link href="/dashboard" className="hover:text-primary transition-colors">{tc("home")}</Link>
          <span className="mx-2 text-muted-foreground/50">/</span>
          <Link href="/animator-registration" className="hover:text-primary transition-colors">{t("title")}</Link>
          <span className="mx-2 text-muted-foreground/50">/</span>
          <span className="text-foreground font-semibold">{batch.name}</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">{batch.name}</h1>
              <Badge className={cn("text-[10px] px-2 py-0.5 border shrink-0", batchStatusCfg.color)}>
                <span className={cn("h-1.5 w-1.5 rounded-full inline-block ml-1", batchStatusCfg.dot)} />
                {batchStatusCfg.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{batch.year}</span>
              <span className="text-muted-foreground/40">•</span>
              <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{stats.total} {t("animators")}</span>
              {hasAnimators && (<><span className="text-muted-foreground/40">•</span><span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />{completionPercent}% مكتمل</span></>)}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/animator-registration"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 ml-1" />{tc("back")}</Button></Link>
            {hasPermission("animator_registration", "edit") && hasAnimators ? (
              <Button variant="outline" size="sm" onClick={() => { if (confirm(t("confirmReExtractAll", { count: String(animators.length) }))) { reExtractAllMutation.mutate(); } }} disabled={reExtractAllMutation.isPending}>
                {reExtractAllMutation.isPending ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <RotateCw className="h-4 w-4 ml-1" />}
                إعادة استخراج الكل
              </Button>
            ) : null}
            {hasPermission("animator_registration", "scan") ? (
              <Button variant="outline" size="sm" onClick={() => { window.location.href = `djs-animator://${batchId}`; toast.info("تم طلب فتح الماسح الضوئي..."); }}>
                <ScanLine className="h-4 w-4 ml-1" /> مسح بالبوت
              </Button>
            ) : null}
          </div>
        </div>
        {hasAnimators ? (
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-700 ease-out rounded-full" style={{ width: `${completionPercent}%` }} />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums shrink-0">{completionPercent}%</span>
          </div>
        ) : null}
      </div>
      {/* ════════════════════════════════════════════════════════════════════
          CONTENT AREA
          ════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 p-6 overflow-auto space-y-5">
        {/* SECTION 2 — STAT CARDS */}
        {hasAnimators ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STAT_CARDS.map((card) => {
              const value = stats[card.key];
              const accent = ACCENT_MAP[card.accent];
              return (
                <div key={card.key} className={cn("rounded-2xl border p-4 transition-all hover shadow-sm bg-card", accent.border)}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", accent.iconBg)}>
                      <card.icon className={cn("h-4 w-4", accent.iconText)} />
                    </div>
                    <span className="text-xs text-muted-foreground">{card.key === "total" ? "الإجمالي" : STATUS_CONFIG[card.key]?.label}</span>
                  </div>
                  <p className={cn("text-2xl font-bold tracking-tight", accent.text)}>{value}</p>
                </div>
              );
            })}
          </div>
        ) : null}
        {/* SECTION 3 — SCANNER */}
        {hasPermission("animator_registration", "create") ? (
          <Card className="rounded-2xl border-border/50 overflow-hidden">
            <button type="button" onClick={() => setIsScannerOpen(!isScannerOpen)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><Upload className="h-4 w-4 text-primary" /></div>
                <div>
                  <span className="text-sm font-semibold">{t("scanDocuments")}</span>
                  {!isScannerOpen && fileCount > 0 ? <span className="mr-2 text-xs text-muted-foreground">({fileCount} ملف)</span> : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isScannerOpen && firstName && lastName ? <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">{firstName} {lastName}</Badge> : null}
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isScannerOpen && "rotate-180")} />
              </div>
            </button>
            {isScannerOpen ? (
              <CardContent className="pt-0 pb-5 px-5 space-y-4 border-t border-border/40">
                <div className="pt-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("firstName")}</Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={t("firstNamePlaceholder")} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("lastName")}</Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={t("lastNamePlaceholder")} className="h-9" />
                  </div>
                </div>
                <div className="h-px bg-border/40" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {FILE_FIELDS.map(({ key, labelKey, icon, accept }) => (
                    <div key={key} className={cn("group relative border rounded-xl p-3 text-center transition-all cursor-pointer hover:border-primary/40 hover:bg-primary/5 active:scale-[0.97]", files[key] ? "border-emerald-300 bg-emerald-50" : "border-border/50 bg-background")}>
                      <input ref={(el) => { fileInputRefs.current[key] = el; }} type="file" accept={accept} className="hidden" onChange={(e) => handleFileChange(key, e.target.files?.[0] || null)} />
                      <button type="button" onClick={() => fileInputRefs.current[key]?.click()} className="w-full flex flex-col items-center gap-1.5">
                        <span className="text-lg">{icon}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{t(labelKey)}</span>
                        {files[key] ? <span className="text-[9px] text-emerald-600 truncate max-w-full">✓ {files[key]!.name.slice(0, 12)}</span> : <span className="text-[9px] text-muted-foreground/60">{t("chooseFile")}</span>}
                      </button>
                      {files[key] ? (
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleFileChange(key, null); }} className="absolute -top-1.5 -left-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                      ) : null}
                    </div>
                  ))}
                </div>
                <Button onClick={handleScan} disabled={!firstName.trim() || !lastName.trim() || scanMutation.isPending} className="w-full h-10 font-semibold text-sm" size="lg">
                  {scanMutation.isPending ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" />جاري الاستخراج...</> : <><ScanLine className="ml-2 h-4 w-4" />{t("scanAndExtract")}</>}
                </Button>
              </CardContent>
            ) : null}
          </Card>
        ) : null}
        {/* SECTION 4 — ANIMATORS TABLE */}
        <Card className="rounded-2xl border-border/50 overflow-hidden">
          <div className="px-5 py-3 border-b border-border/40">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{t("registeredAnimators")}</span>
                <Badge variant="secondary" className="text-[10px] px-2 py-0">
                  {filteredAnimators.length}{filteredAnimators.length !== stats.total ? <span className="text-muted-foreground">/{stats.total}</span> : null}
                </Badge>
              </div>
            </div>
            {hasAnimators && (
              <div className="max-w-3xl mx-auto">
                <OdooSearch initialSearch={searchQuery} onSearch={setSearchQuery} placeholder="ابحث عن منشط بالاسم أو رقم التعريف..." filters={batchDetailFilters} groupByOptions={batchDetailGroupBy} onFilterChange={setActiveFilters} />
              </div>
            )}
          </div>
          <div className="px-5 pb-5 pt-3">
            {!hasAnimators ? (
              <div className="flex flex-col items-center justify-center py-16">
                <EmptyTableIcon />
                <p className="font-semibold text-sm mb-1">{t("noAnimators")}</p>
                <p className="text-xs text-muted-foreground text-center max-w-[280px] leading-relaxed">ارفع الوثائق عبر الماسح الضوئي أعلاه لبدء استخراج بيانات المنشطين</p>
              </div>
            ) : filteredAnimators.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <NoResultsIcon />
                <p className="font-semibold text-sm text-muted-foreground">لا توجد نتائج</p>
                <p className="text-xs text-muted-foreground/70 mt-1">جرّب تغيير معايير البحث أو الفلتر</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border/40 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[40px] text-center text-xs">#</TableHead>
                        <TableHead className="text-xs">{t("name")}</TableHead>
                        <TableHead className="text-xs hidden md:table-cell">{t("nationalId")}</TableHead>
                        <TableHead className="text-xs hidden lg:table-cell">{t("position")}</TableHead>
                        <TableHead className="text-xs hidden lg:table-cell">{t("positionType")}</TableHead>
                        <TableHead className="text-xs">{t("status")}</TableHead>
                        <TableHead className="text-end text-xs">{t("actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAnimators.map((animator, index) => {
                        const statusCfg = STATUS_CONFIG[animator.status] || STATUS_CONFIG.pending;
                        return (
                          <TableRow key={animator.id} className="group/row cursor-pointer" onClick={() => router.push(`/animator-registration/animator/${animator.id}`)}>
                            <TableCell className="text-center text-xs text-muted-foreground w-[40px]">{index + 1}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary text-xs font-bold shrink-0">{animator.first_name?.charAt(0) || "?"}</div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium leading-tight truncate">{animator.first_name} {animator.last_name}</p>
                                  <p className="text-[10px] text-muted-foreground md:hidden" dir="ltr">{animator.national_id || "—"}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground whitespace-nowrap text-xs hidden md:table-cell font-mono" dir="ltr">{animator.national_id || "—"}</TableCell>
                            <TableCell className="text-muted-foreground whitespace-nowrap text-xs hidden lg:table-cell">{POSITION_LABELS[animator.position] || animator.position}</TableCell>
                            <TableCell className="text-muted-foreground whitespace-nowrap text-xs hidden lg:table-cell">
                              <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", animator.position_type === "trainee" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-purple-50 text-purple-700 border border-purple-200")}>
                                {animator.position_type === "trainee" ? "متربص" : animator.position_type === "appointed" ? "مرسم" : animator.position_type || "—"}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge className={cn("text-[10px] px-2 py-0 border", statusCfg.color)}>
                                <span className={cn("h-1.5 w-1.5 rounded-full inline-block ml-1", statusCfg.dot)} />
                                {statusCfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-end whitespace-nowrap">
                              <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title={tc("view")} onClick={(e) => { e.stopPropagation(); router.push(`/animator-registration/animator/${animator.id}`); }}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title={t("registerToMinistry")} onClick={(e) => { e.stopPropagation(); syncMutation.mutate(animator.id); }} disabled={syncMutation.isPending}>
                                  <Send className="h-3.5 w-3.5" />
                                </Button>
                                {hasPermission("animator_registration", "edit") ? (
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="إعادة استخراج" onClick={(e) => { e.stopPropagation(); reExtractMutation.mutate(animator.id); }} disabled={reExtractMutation.isPending}>
                                    {reExtractMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
                                  </Button>
                                ) : null}
                                {hasPermission("animator_registration", "edit") ? (
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive/70 hover:text-destructive" title={tc("delete")} onClick={(e) => { e.stopPropagation(); if (confirm(tc("confirmDelete"))) { deleteMutation.mutate(animator.id); } }}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  </PermissionGuard>
  );
}