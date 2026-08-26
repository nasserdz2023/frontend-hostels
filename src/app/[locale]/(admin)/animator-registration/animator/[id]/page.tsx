"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Loader2,
  Save,
  Send,
  User,
  Briefcase,
  FileText,
  AlertCircle,
  CheckCircle,
  Upload,
  ScanLine,
  Copy,
  KeyRound,
  Zap,
  CalendarDays,
  Hash,
  LogIn,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  animatorRegistrationApi,
  AnimatorRegistration,
} from "@/lib/api/animator-registration";
import { locationsApi, type Wilaya, type Municipality } from "@/lib/api/locations";
import { getApiBaseUrl } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/auth";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG, REGISTRATION_STEPS } from "@/lib/constants/animator";
import DocumentViewer from "@/components/animator/DocumentViewer";
import AnimatorPhotoEditor from "@/components/animator-photo-editor";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { AccessDenied } from "@/hooks/useRequirePermission";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PermissionGuard } from "@/hooks/useRequirePermission";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStorageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("blob:") ||
    path.startsWith("data:")
  )
    return path;
  const base = getApiBaseUrl().replace("/api/v1", "");
  return `${base}/storage/${path}`;
}

// ─── Wilaya/Commune value helpers ───────────────────────────────────────────
// DB stores name_ar, Select uses code/id. These helpers convert for display.
const wilayaNameToCode = (name: string, list: Wilaya[]): string => {
  const found = list.find((w) => w.name_ar === name);
  return found ? found.code : name; // fallback to original if not found
};

const wilayaCodeToName = (code: string, list: Wilaya[]): string => {
  const found = list.find((w) => w.code === code);
  return found ? found.name_ar : code;
};

const communeNameToId = (name: string, list: Municipality[]): string => {
  const found = list.find((m) => m.name_ar === name);
  return found ? (found.id || found.code || name) : name;
};

const communeIdToName = (id: string, list: Municipality[]): string => {
  const found = list.find((m) => m.id === id || m.code === id);
  return found ? found.name_ar : id;
};

const GENDER_OPTIONS = [
  { value: "male", label: "ذكر" },
  { value: "female", label: "أنثى" },
];

// Helper: get wilaya name by code
const getWilayaName = (wilayasList: Wilaya[], code: string) => {
  const w = wilayasList.find((w) => w.code === code);
  return w ? `${w.name_ar} (${w.code})` : code;
};

// Helper: get municipality name by id
const getMunicipalityName = (list: Municipality[], id: string) => {
  const m = list.find((m) => m.id === id || m.code === id);
  return m ? m.name_ar : id;
};

const MARITAL_STATUS_OPTIONS = [
  { value: "single", label: "أعزب" },
  { value: "married", label: "متزوج" },
  { value: "divorced", label: "مطلق" },
  { value: "widowed", label: "أرمل" },
];

const POSITION_OPTIONS = [
  { value: "animator", label: "منشط" },
  { value: "lifeguard", label: "حارس سباحة" },
  { value: "financial_manager", label: "مسير مالي" },
  { value: "director", label: "مدير" },
];

const POSITION_TYPE_OPTIONS = [
  { value: "trainee", label: "متربص" },
  { value: "appointed", label: "مرسم" },
];

// ─── Document field definitions ─────────────────────────────────────────────

const DOCUMENT_FIELDS = [
  { key: "photo_path", labelKey: "photo", icon: "📷" },
  { key: "residence_card_path", labelKey: "residenceCard", icon: "🪪" },
  { key: "certificate_path", labelKey: "certificate", icon: "📜" },
  { key: "student_card_path", labelKey: "studentCard", icon: "🎓" },
  { key: "medical_cert_path", labelKey: "medicalCert", icon: "🏥" },
  { key: "chest_cert_path", labelKey: "chestCert", icon: "🫁" },
] as const;

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AnimatorDetailPage() {
  const t = useTranslations("animator-registration");
  const tc = useTranslations("common");
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const animatorId = params.id as string;

  // ── Form state ──────────────────────────────────────────────────────────
  const [form, setForm] = useState<Partial<AnimatorRegistration>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // ── Location state ──────────────────────────────────────────────────────
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [birthMunicipalities, setBirthMunicipalities] = useState<Municipality[]>([]);
  const [residenceMunicipalities, setResidenceMunicipalities] = useState<Municipality[]>([]);

  // ── Data fetching ───────────────────────────────────────────────────────
  const {
    data: animator,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["animator", animatorId],
    queryFn: async () => {
      const res = await animatorRegistrationApi.getAnimator(animatorId);
      return res.data;
    },
    enabled: !!animatorId,
  });

  // Initialize form when data loads
  useEffect(() => {
    if (animator) {
      setForm({ ...animator });
      setHasChanges(false);
    }
  }, [animator]);

  // ── Fetch wilayas on mount ──────────────────────────────────────────────
  useEffect(() => {
    locationsApi.getWilayas().then(setWilayas).catch(console.error);
  }, []);

  // ── Fetch municipalities when wilayas are loaded (for existing data) ─────
  useEffect(() => {
    if (wilayas.length > 0) {
      if (form.birth_wilaya) {
        const code = wilayaNameToCode(form.birth_wilaya, wilayas);
        fetchBirthMunicipalities(code);
      }
      if (form.residence_wilaya) {
        const code = wilayaNameToCode(form.residence_wilaya, wilayas);
        fetchResidenceMunicipalities(code);
      }
    }
  }, [wilayas]);

  // ── Municipality fetchers ───────────────────────────────────────────────
  const fetchBirthMunicipalities = async (wilayaCode: string) => {
    try {
      const data = await locationsApi.getMunicipalities(wilayaCode);
      setBirthMunicipalities(data || []);
    } catch (err) {
      console.error("Failed to load birth municipalities:", err);
    }
  };

  const fetchResidenceMunicipalities = async (wilayaCode: string) => {
    try {
      const data = await locationsApi.getMunicipalities(wilayaCode);
      setResidenceMunicipalities(data || []);
    } catch (err) {
      console.error("Failed to load residence municipalities:", err);
    }
  };

  // ── Mutations ───────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async (payload: Partial<AnimatorRegistration>) => {
      const res = await animatorRegistrationApi.updateAnimator(animatorId, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animator", animatorId] });
      queryClient.invalidateQueries({
        queryKey: ["animator-batch", animator?.batch_id],
      });
      setHasChanges(false);
      toast.success(tc("success"));
    },
    onError: () => {
      toast.error(tc("error"));
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (force: boolean = false) => {
      const res = await animatorRegistrationApi.registerToMinistry(animatorId, force);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["animator", animatorId] });
      toast.success(data.message || tc("success"));
    },
    onError: () => {
      toast.error(tc("error"));
    },
  });

  const replaceDocMutation = useMutation({
    mutationFn: async ({ docType, file }: { docType: string; file: File }) => {
      const res = await animatorRegistrationApi.uploadDocument(animatorId, docType, file);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["animator", animatorId] });
      toast.success(data.message || tc("success"));
    },
    onError: () => {
      toast.error(tc("error"));
    },
  });

  // ── Handlers ────────────────────────────────────────────────────────────
  const updateField = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`تم نسخ ${label}`);
  };

  // ── Permission check ────────────────────────────────────────────────────
  if (!hasPermission("animator_registration", "view")) {
    return <AccessDenied module="animator_registration" action="view" />;
  }
  // ── Loading / Error states ──────────────────────────────────────────────
  if (isLoading) {

    return (
            
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p className="text-sm">{tc("loading")}</p>
      </div>
    )
      ;
  }

  if (error || !animator) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <p className="text-lg">{t("error")}</p>
        <Link href="/animator-registration">
          <Button className="mt-4">{tc("back")}</Button>
        </Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[animator.status] || STATUS_CONFIG.pending;

  return (
  <PermissionGuard module="animator_registration" action="view">
      <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <Card className="rounded-2xl overflow-hidden">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  router.push(`/animator-registration/${animator.batch_id}`)
                }
                className="shrink-0 mt-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              {/* Avatar */}
              <Avatar className="h-14 w-14 shrink-0 ring-2 ring-primary/10 ring-offset-2">
                <AvatarImage
                  src={getStorageUrl(animator.photo_path) || undefined}
                  alt={`${animator.first_name} ${animator.last_name}`}
                />
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                  {animator.first_name?.[0]}{animator.last_name?.[0]}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
                  {animator.first_name} {animator.last_name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <Badge
                    className={cn(
                      "text-xs px-2.5 py-0.5 border",
                      statusCfg.color
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full inline-block", statusCfg.dot)} />
                    {statusCfg.label}
                  </Badge>
                  {animator.ministry_sync_status && (
                    <Badge variant="outline" className="text-[11px] px-2 py-0">
                      مزامنة: {animator.ministry_sync_status}
                    </Badge>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    {new Date(animator.created_at).toLocaleDateString("ar-DZ", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons — top-right */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              {hasPermission("animator_registration", "edit") && (
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="ml-2 h-4 w-4" />
                  )}
                  {tc("save")}
                </Button>
              )}
            </div>
          </div>

          {/* Ministry sync buttons row */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncMutation.mutate(false)}
              disabled={syncMutation.isPending}
              className="gap-2"
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {t("registerToMinistry")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => syncMutation.mutate(true)}
              disabled={syncMutation.isPending}
            >
              <Zap className="h-3.5 w-3.5 ml-1" />
              تسجيل قسري
            </Button>

            {/* Mobile save button */}
            {hasPermission("animator_registration", "edit") && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || updateMutation.isPending}
                className="sm:hidden gap-2"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {tc("save")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Progress Steps ────────────────────────────────────────────── */}
      <Card className="rounded-2xl">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-2">
            {REGISTRATION_STEPS.map((step, idx) => {
              const currentIdx = REGISTRATION_STEPS.findIndex((s) => s.key === animator.status);
              const isActive = idx <= currentIdx;
              const isCurrent = step.key === animator.status;
              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border",
                        isCurrent && "ring-2 ring-primary/30 ring-offset-2"
                      )}
                    >
                      {isActive ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span className={cn(
                      "text-xs text-center leading-tight",
                      isCurrent ? "text-primary font-semibold" : "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>
                  </div>
                  {idx < REGISTRATION_STEPS.length - 1 && (
                    <div className={cn(
                      "h-0.5 flex-1 mx-2 rounded-full transition-colors",
                      idx < currentIdx ? "bg-primary" : "bg-border"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList className="bg-muted/50 h-auto p-1.5 gap-1">
          <TabsTrigger
            value="personal"
            className="gap-2 py-2.5 px-4 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{t("personalInfo")}</span>
            <span className="sm:hidden">شخصي</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 min-w-[20px] justify-center">
              {[
                form.first_name, form.last_name, form.national_id,
                form.birth_date, form.gender, form.marital_status,
                form.phone, form.email,
              ].filter(Boolean).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="professional"
            className="gap-2 py-2.5 px-4 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">{t("professionalInfo")}</span>
            <span className="sm:hidden">مهني</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 min-w-[20px] justify-center">
              {[
                form.position, form.position_type,
                form.certificate_date, form.responsibilities,
              ].filter(Boolean).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="documents"
            className="gap-2 py-2.5 px-4 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t("documents")}</span>
            <span className="sm:hidden">مستندات</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 min-w-[20px] justify-center">
              {DOCUMENT_FIELDS.filter(
                ({ key }) => (animator as any)[key]
              ).length}/{DOCUMENT_FIELDS.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ─── Personal Info Tab ───────────────────────────────────────────── */}
        <TabsContent value="personal">
          <Card className="rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <User className="h-3.5 w-3.5" />
                </div>
                {t("personalInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* First Name */}
                <div className="space-y-2">
                  <Label>{t("firstName")}</Label>
                  <Input
                    value={form.first_name || ""}
                    onChange={(e) => updateField("first_name", e.target.value)}
                  />
                </div>

                {/* Last Name */}
                <div className="space-y-2">
                  <Label>{t("lastName")}</Label>
                  <Input
                    value={form.last_name || ""}
                    onChange={(e) => updateField("last_name", e.target.value)}
                  />
                </div>

                {/* National ID */}
                <div className="space-y-2">
                  <Label>{t("nationalId")}</Label>
                  <Input
                    value={form.national_id || ""}
                    onChange={(e) => updateField("national_id", e.target.value)}
                    dir="ltr"
                    className="text-left"
                  />
                </div>

                {/* Birth Date */}
                <div className="space-y-2">
                  <Label>{t("birthDate")}</Label>
                  <DateTimePicker
                    value={form.birth_date || ""}
                    onChange={(val) => updateField("birth_date", val)}
                    placeHolder="اختر تاريخ الميلاد"
                  />
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <Label>{t("gender")}</Label>
                  <SearchableSelect
                    options={GENDER_OPTIONS}
                    value={form.gender || ""}
                    onValueChange={(v) => updateField("gender", v)}
                    placeholder={t("gender")}
                    searchPlaceholder="بحث..."
                    emptyMessage="لا توجد نتائج"
                  />
                </div>

                {/* Marital Status */}
                <div className="space-y-2">
                  <Label>{t("maritalStatus")}</Label>
                  <SearchableSelect
                    options={MARITAL_STATUS_OPTIONS}
                    value={form.marital_status || ""}
                    onValueChange={(v) => updateField("marital_status", v)}
                    placeholder={t("maritalStatus")}
                    searchPlaceholder="بحث..."
                    emptyMessage="لا توجد نتائج"
                  />
                </div>

                {/* Birth Wilaya */}
                <div className="space-y-2">
                  <Label>{t("birthWilaya")}</Label>
                  <SearchableSelect
                    options={wilayas.map((w) => ({ value: w.code, label: `${w.name_ar} (${w.code})` }))}
                    value={wilayaNameToCode(form.birth_wilaya || "", wilayas)}
                    onValueChange={(val) => {
                      updateField("birth_wilaya", wilayaCodeToName(val, wilayas));
                      updateField("birth_commune", "");
                      fetchBirthMunicipalities(val);
                    }}
                    placeholder="اختر الولاية"
                    searchPlaceholder="بحث في الولايات..."
                    emptyMessage="لا توجد ولاية"
                  />
                </div>

                {/* Birth Commune */}
                <div className="space-y-2">
                  <Label>{t("birthCommune")}</Label>
                  <SearchableSelect
                    options={birthMunicipalities.map((m) => ({ value: m.id || m.code || '', label: m.name_ar }))}
                    value={communeNameToId(form.birth_commune || "", birthMunicipalities)}
                    onValueChange={(val) => updateField("birth_commune", communeIdToName(val, birthMunicipalities))}
                    placeholder="اختر البلدية"
                    searchPlaceholder="بحث في البلديات..."
                    emptyMessage="لا توجد بلدية"
                    disabled={!form.birth_wilaya}
                  />
                </div>

                {/* Residence Wilaya */}
                <div className="space-y-2">
                  <Label>{t("residenceWilaya")}</Label>
                  <SearchableSelect
                    options={wilayas.map((w) => ({ value: w.code, label: `${w.name_ar} (${w.code})` }))}
                    value={wilayaNameToCode(form.residence_wilaya || "", wilayas)}
                    onValueChange={(val) => {
                      updateField("residence_wilaya", wilayaCodeToName(val, wilayas));
                      updateField("residence_commune", "");
                      fetchResidenceMunicipalities(val);
                    }}
                    placeholder="اختر الولاية"
                    searchPlaceholder="بحث في الولايات..."
                    emptyMessage="لا توجد ولاية"
                  />
                </div>

                {/* Residence Commune */}
                <div className="space-y-2">
                  <Label>{t("residenceCommune")}</Label>
                  <SearchableSelect
                    options={residenceMunicipalities.map((m) => ({ value: m.id || m.code || '', label: m.name_ar }))}
                    value={communeNameToId(form.residence_commune || "", residenceMunicipalities)}
                    onValueChange={(val) => updateField("residence_commune", communeIdToName(val, residenceMunicipalities))}
                    placeholder="اختر البلدية"
                    searchPlaceholder="بحث في البلديات..."
                    emptyMessage="لا توجد بلدية"
                    disabled={!form.residence_wilaya}
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label>{t("phone")}</Label>
                  <Input
                    value={form.phone || ""}
                    onChange={(e) => updateField("phone", e.target.value)}
                    dir="ltr"
                    className="text-left"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label>{t("email")}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="email"
                      value={form.email || ""}
                      onChange={(e) => updateField("email", e.target.value)}
                      dir="ltr"
                      className="text-left"
                    />
                    {form.email && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(form.email || "", "البريد الإلكتروني")}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        title="نسخ"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Professional Info Tab ────────────────────────────────────────── */}
        <TabsContent value="professional">
          <Card className="rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Briefcase className="h-3.5 w-3.5" />
                </div>
                {t("professionalInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Position */}
                <div className="space-y-2">
                  <Label>{t("position")}</Label>
                  <SearchableSelect
                    options={POSITION_OPTIONS}
                    value={form.position || ""}
                    onValueChange={(v) => updateField("position", v)}
                    placeholder={t("position")}
                    searchPlaceholder="بحث..."
                    emptyMessage="لا توجد نتائج"
                  />
                </div>

                {/* Position Type */}
                <div className="space-y-2">
                  <Label>{t("positionType")}</Label>
                  <SearchableSelect
                    options={POSITION_TYPE_OPTIONS}
                    value={form.position_type || ""}
                    onValueChange={(v) => updateField("position_type", v)}
                    placeholder={t("positionType")}
                    searchPlaceholder="بحث..."
                    emptyMessage="لا توجد نتائج"
                  />
                </div>

                {/* Certificate Date */}
                <div className="space-y-2">
                  <Label>{t("certificateDate")}</Label>
                  <DateTimePicker
                    value={form.certificate_date || ""}
                    onChange={(val) => updateField("certificate_date", val)}
                    placeHolder="اختر تاريخ الشهادة"
                  />
                </div>

                {/* Languages */}
                <div className="space-y-2">
                  <Label>{t("languages")}</Label>
                  <div className="flex flex-wrap gap-4">
                    {[
                      { value: "Français", label: "Français" },
                      { value: "English", label: "English" },
                    ].map((lang) => (
                      <label
                        key={lang.value}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={Array.isArray(form.languages) && form.languages.includes(lang.value)}
                          onCheckedChange={(checked) => {
                            const current = Array.isArray(form.languages) ? [...form.languages] : [];
                            if (checked) {
                              updateField("languages", [...current, lang.value]);
                            } else {
                              updateField("languages", current.filter((l) => l !== lang.value));
                            }
                          }}
                        />
                        {lang.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Previous Centers */}
                <div className="space-y-2">
                  <Label>{t("previousCenters")}</Label>
                  <Input
                    value={
                      Array.isArray(form.previous_centers)
                        ? form.previous_centers.join(", ")
                        : ""
                    }
                    onChange={(e) =>
                      updateField(
                        "previous_centers",
                        e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                    placeholder="مركز 1, مركز 2"
                  />
                </div>
              </div>

              {/* Responsibilities */}
              <div className="mt-4 space-y-2">
                <Label>{t("responsibilities")}</Label>
                <Textarea
                  value={form.responsibilities || ""}
                  onChange={(e) =>
                    updateField("responsibilities", e.target.value)
                  }
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Documents Tab ────────────────────────────────────────────────── */}
        <TabsContent value="documents">
          <Card className="rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                {t("documents")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Document replace buttons */}
              {hasPermission("animator_registration", "edit") && (
                <div className="flex flex-wrap gap-2">
                  {DOCUMENT_FIELDS.map(({ key, labelKey, icon }) => {
                    const docType = key.replace("_path", "");
                    return (
                      <div key={key} className="flex items-center gap-1 rounded-lg border border-border/40 bg-muted/20 px-2.5 py-1.5">
                        <span className="text-xs text-muted-foreground select-none">
                          {icon} {t(labelKey)}
                        </span>
                        <input
                          type="file"
                          id={`replace-${key}`}
                          className="hidden"
                          accept={key === "photo_path" ? ".jpg,.jpeg,.png,.webp" : ".pdf,.jpg,.jpeg,.png,.webp"}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (key === "photo_path" && file.type.startsWith("image/")) {
                              const reader = new FileReader();
                              reader.onload = () => {
                                setPhotoPreview(reader.result as string);
                                setPhotoEditorOpen(true);
                              };
                              reader.readAsDataURL(file);
                            } else {
                              replaceDocMutation.mutate({ docType, file });
                            }
                            e.target.value = "";
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] gap-1"
                          onClick={() =>
                            document.getElementById(`replace-${key}`)?.click()
                          }
                          disabled={replaceDocMutation.isPending}
                        >
                          {replaceDocMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Upload className="h-3 w-3" />
                          )}
                          رفع
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] gap-1"
                          onClick={() => {
                            window.location.href = `djs-animator-scan://${animatorId}/${docType}`;
                          }}
                        >
                          <ScanLine className="h-3 w-3" />
                          مسح
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Existing document viewer */}
              <DocumentViewer
                documents={DOCUMENT_FIELDS.map(({ key, labelKey }) => ({
                  name: t(labelKey),
                  url: getStorageUrl((animator as any)[key] as string | undefined),
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Ministry Account Info ──────────────────────────────────────────── */}
      {animator.ministry_number && (
        <Card className="rounded-2xl overflow-hidden bg-gradient-to-br from-blue-50/80 via-blue-50/40 to-transparent border-blue-200/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <KeyRound className="h-4 w-4" />
              </div>
              معلومات الحساب في المنصة الوزارية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Ministry Number */}
              <div className="flex items-center gap-3 rounded-xl bg-white/70 border border-blue-100 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100/80 text-blue-600 shrink-0">
                  <Hash className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-blue-500/80 font-medium">رقم المنشط</p>
                  <div className="flex items-center gap-1.5">
                    <code className="text-sm font-mono font-semibold text-foreground truncate">
                      {animator.ministry_number}
                    </code>
                    <button
                      onClick={() => copyToClipboard(animator.ministry_number || '', "رقم المنشط")}
                      className="shrink-0 text-muted-foreground hover:text-blue-600 transition-colors"
                      title="نسخ"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Ministry User ID */}
              {animator.ministry_user_id && (
                <div className="flex items-center gap-3 rounded-xl bg-white/70 border border-blue-100 px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100/80 text-blue-600 shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-blue-500/80 font-medium">معرف المستخدم</p>
                    <div className="flex items-center gap-1.5">
                      <code className="text-sm font-mono font-semibold text-foreground truncate">
                        {animator.ministry_user_id}
                      </code>
                      <button
                        onClick={() => copyToClipboard(animator.ministry_user_id || '', "معرف المستخدم")}
                        className="shrink-0 text-muted-foreground hover:text-blue-600 transition-colors"
                        title="نسخ"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Ministry Password */}
              {animator.ministry_password && (
                <div className="flex items-center gap-3 rounded-xl bg-white/70 border border-blue-100 px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100/80 text-blue-600 shrink-0">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-blue-500/80 font-medium">كلمة المرور</p>
                    <div className="flex items-center gap-1.5">
                      <code className="text-sm font-mono font-semibold text-foreground truncate select-all">
                        {animator.ministry_password}
                      </code>
                      <button
                        onClick={() => copyToClipboard(animator.ministry_password || '', "كلمة السر")}
                        className="shrink-0 text-muted-foreground hover:text-blue-600 transition-colors"
                        title="نسخ كلمة المرور"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Login Link */}
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                asChild
              >
                <a
                  href="https://youthcamp.mjeunesse.gov.dz/portal/login"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <LogIn className="h-4 w-4" />
                  الدخول للمنصة الوزارية
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Editor Modal */}
      <AnimatorPhotoEditor
        open={photoEditorOpen}
        onClose={() => {
          setPhotoEditorOpen(false);
          setPhotoPreview(null);
        }}
        imageSrc={photoPreview || ""}
        onConfirm={(blob) => {
          const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
          replaceDocMutation.mutate({ docType: "photo", file });
        }}
      />

      {/* Save indicator */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 bg-primary text-primary-foreground px-5 py-3 rounded-2xl shadow-xl shadow-primary/20 backdrop-blur-sm border border-primary/20">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap">يوجد تغييرات غير محفوظة</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="h-8 bg-white/20 hover:bg-white/30 text-white border-0"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3 ml-1" />
              )}
              {tc("save")}
            </Button>
          </div>
        </div>
      )}
    </div>
  </PermissionGuard>
              );
}