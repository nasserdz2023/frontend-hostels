'use client';

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft, Edit, Trash2, Loader2, Phone, Mail, MapPin,
  Calendar, User, CreditCard, Home, Building2, Shield, Lock,
  Upload, FileText, X, Image as ImageIcon, AlertTriangle,
  Cake, BookOpen, MapPinned, IdCard, CalendarDays,
  TreePine, Users, ChevronLeft, Download, Eye, Camera,
  FileUp, FolderOpen, School, Hash, Globe, RefreshCw,
  Fingerprint
} from "lucide-react";
import { membersApi, MemberDetail, Guardian } from "@/lib/api/members";
import { institutionsApi, YouthInstitution } from "@/lib/api/institutions";
import { locationsApi, Wilaya, Municipality } from "@/lib/api/locations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { getApiBaseUrl } from "@/lib/api/client";
import { SyncStatusBadge } from "@/components/shared/SyncStatusBadge";
import { PermissionGuard } from "@/hooks/useRequirePermission";

/** Convert MinIO relative path to full URL via backend proxy */
function getStorageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = getApiBaseUrl().replace('/api/v1', '');
  return `${base}/storage/${path}`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
  ACTIVE: { label: "نشط", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", dotColor: "bg-green-500" },
  EXPIRED: { label: "منتهي", color: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400", dotColor: "bg-gray-400" },
  CANCELLED: { label: "ملغي", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", dotColor: "bg-red-500" },
};

const ACTIVITIES_OPTIONS = [
  { value: "ميدان النشاطات العلمية، التكنولوجية، وتطوير البرمجيات", label: "ميدان النشاطات العلمية، التكنولوجية، وتطوير البرمجيات" },
  { value: "ميدان نشاطات الإبداع الفني، الثقافي والإعلامي", label: "ميدان نشاطات الإبداع الفني، الثقافي والإعلامي" },
  { value: "ميدان نشاطات الحركية والسياحة الشبابية والرياضة الترفيهية", label: "ميدان نشاطات الحركية والسياحة الشبابية والرياضة الترفيهية" },
  { value: "ميدان نشاطات الدعم النفسي والوقاية وصحة الشباب", label: "ميدان نشاطات الدعم النفسي والوقاية وصحة الشباب" },
  { value: "ميــدان نشاطــــــات المواطنة وأعمــــال التطــــوع.", label: "ميــدان نشاطــــــات المواطنة وأعمــــال التطــــوع." },
  { value: "ميـــدان نشاطــات تمكيـــن قـــدرات الشبــاب", label: "ميـــدان نشاطــات تمكيـــن قـــدرات الشبــاب" },
];

function calculateAge(birthDate: string | undefined | null): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.[0] || '';
  const l = lastName?.[0] || '';
  return (f + l).toUpperCase() || '?';
}

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<MemberDetail>>({});
  const [institutions, setInstitutions] = useState<YouthInstitution[]>([]);
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [birthMunicipalities, setBirthMunicipalities] = useState<Municipality[]>([]);
  const [residenceMunicipalities, setResidenceMunicipalities] = useState<Municipality[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [isRenewingYouth, setIsRenewingYouth] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const handleFileUpload = async (
    docType: 'photo' | 'birth-certificate' | 'national-id',
    file: File
  ) => {
    setIsUploading(docType);
    try {
      if (docType === 'photo') {
        await membersApi.uploadPhoto(memberId, file);
      } else if (docType === 'birth-certificate') {
        await membersApi.uploadBirthCertificate(memberId, file);
      } else {
        await membersApi.uploadNationalId(memberId, file);
      }
      toast.success("تم رفع الملف بنجاح");
      loadMember();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "فشل في رفع الملف");
    } finally {
      setIsUploading(null);
    }
  };

  const handleDeleteDocument = async (docType: 'photo' | 'birth-certificate' | 'national-id') => {
    if (!confirm("هل أنت متأكد من حذف هذه الوثيقة؟")) return;
    try {
      await membersApi.deleteDocument(memberId, docType);
      toast.success("تم حذف الوثيقة بنجاح");
      loadMember();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "فشل في الحذف");
    }
  };

  useEffect(() => {
    loadMember();
    fetchInitialData();
  }, [memberId]);

  useEffect(() => {
    if (member && wilayas.length > 0) {
      const bWilaya = wilayas.find((w: Wilaya) => w.name_ar === member.birth_wilaya);
      if (bWilaya) fetchBirthMunicipalities(bWilaya.code);

      const rWilaya = wilayas.find((w: Wilaya) => w.name_ar === member.residence_wilaya);
      if (rWilaya) fetchResidenceMunicipalities(rWilaya.code);
    }
  }, [member, wilayas]);

  const fetchInitialData = async () => {
    setIsLoadingData(true);
    try {
      const [instRes, wilayaRes] = await Promise.all([
        institutionsApi.getAll({ size: 200 }),
        locationsApi.getWilayas()
      ]);
      setInstitutions(instRes.items || []);
      setWilayas(wilayaRes || []);
    } catch (error) {
      console.error("Error fetching initial data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchBirthMunicipalities = async (wilayaCode: string) => {
    try {
      const response = await locationsApi.getMunicipalities(wilayaCode);
      setBirthMunicipalities(response || []);
    } catch (error) {
      console.error("Error fetching birth municipalities:", error);
    }
  };

  const fetchResidenceMunicipalities = async (wilayaCode: string) => {
    try {
      const response = await locationsApi.getMunicipalities(wilayaCode);
      setResidenceMunicipalities(response || []);
    } catch (error) {
      console.error("Error fetching residence municipalities:", error);
    }
  };

  const loadMember = async () => {
    setIsLoading(true);
    try {
      const response = await membersApi.get(memberId);
      const m = response.data;
      setMember(m);
      setEditData(m);
    } catch (error) {
      toast.error("فشل في تحميل بيانات المنخرط");
      router.push('/members');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await membersApi.update(memberId, editData);
      toast.success("تم تحديث البيانات بنجاح");
      setIsEditing(false);
      loadMember();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "فشل في التحديث");
    }
  };

  const handleDelete = async () => {
    if (!confirm("هل أنت متأكد من حذف هذا المنخرط؟")) return;
    try {
      await membersApi.delete(memberId);
      toast.success("تم حذف المنخرط بنجاح");
      router.push('/members');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "فشل في الحذف");
    }
  };

  const isLoadingOrEditing = isLoading || isEditing;

  if (isLoading) {

    return (
    <PermissionGuard module="members" action="view">
            
            <div className="space-y-6" role="status" aria-label="جاري التحميل">
        {/* Header skeleton */}
        <div className="flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-9 w-9 rounded-lg bg-muted" />
            <div className="space-y-2">
              <div className="h-6 w-48 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 bg-muted rounded-lg" />
            <div className="h-9 w-20 bg-muted rounded-lg" />
            <div className="h-9 w-20 bg-muted rounded-lg" />
          </div>
        </div>
        {/* Stats bar skeleton */}
        <div className="flex rounded-xl border bg-card overflow-hidden animate-pulse">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex-1 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-20 bg-muted rounded" />
                <div className="h-5 w-16 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
        {/* Main card skeleton */}
        <div className="rounded-xl border bg-card overflow-hidden animate-pulse">
          <div className="h-1 w-full bg-gradient-to-r from-muted/60 via-muted/30 to-transparent" />
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-muted" />
              <div className="h-5 w-36 bg-muted rounded" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-20 bg-muted rounded" />
                  <div className="h-5 w-40 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Documents skeleton */}
        <div className="rounded-xl border bg-card overflow-hidden animate-pulse">
          <div className="p-6 space-y-4">
            <div className="h-5 w-32 bg-muted rounded" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-32 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </PermissionGuard>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed border-muted-300">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-5">
          <User className="w-7 h-7 text-muted-foreground/60" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">المنخرط غير موجود</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
          قد يكون هذا المنخرط قد تم حذفه أو الرابط غير صحيح
        </p>
        <Button onClick={() => router.push('/members')} variant="outline">
          <ArrowLeft className="w-4 h-4 ml-2" />
          العودة لقائمة المنخرطين
        </Button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[member.membership_status] || STATUS_CONFIG.ACTIVE;
  const age = calculateAge(member.birth_date);
  const isYouthConnected = !!(member.ministry_number || (member as any).youth_connect_status === "success");

  const handleRenewYouth = async () => {
    setIsRenewingYouth(true);
    try {
      const loadingToast = toast.loading(isYouthConnected ? 'جاري تجديد الانخراط في YouthConnect...' : 'جاري إنشاء الانخراط في YouthConnect...');
      const result = await membersApi.renewYouthconnect(memberId);
      if (result.data?.ministry_number) {
        toast.success(`تم ${isYouthConnected ? 'تجديد' : 'إنشاء'} الانخراط بنجاح - الرقم: ${result.data.ministry_number}`, { id: loadingToast });
      } else {
        toast.success(result.data?.message || `تم ${isYouthConnected ? 'تجديد' : 'إنشاء'} الانخراط بنجاح`, { id: loadingToast });
      }
      loadMember();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'فشل في الاتصال بمنصة YouthConnect');
    } finally {
      setIsRenewingYouth(false);
    }
  };

  return (
      <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/members')} className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">
                {member.first_name} {member.last_name}
              </h1>
              <Badge className={`${statusConfig.color} border-none`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor} ml-1.5 inline-block`} />
                {statusConfig.label}
              </Badge>
              {member.sync_status && <SyncStatusBadge status={member.sync_status} locale="ar" />}
              {isYouthConnected && (
                <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800 text-[11px]">
                  <Globe className="w-3 h-3 ml-1" />
                  YouthConnect
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">{member.local_number}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/members/${memberId}/card`)}
          >
            <CreditCard className="w-4 h-4 ml-1.5" />
            البطاقة
          </Button>
          <Button
            variant={isEditing ? "secondary" : "outline"}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit className="w-4 h-4 ml-1.5" />
            {isEditing ? "إلغاء التعديل" : "تعديل"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRenewYouth}
            disabled={isRenewingYouth}
            className="text-emerald-600 hover:text-emerald-700 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50"
          >
            {isRenewingYouth ? <Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 ml-1.5" />}
            {isYouthConnected ? 'تجديد YouthConnect' : 'انخراط YouthConnect'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isYouthConnected}
            title={isYouthConnected ? "لا يمكن حذف منخرط مسجل في منصة الوزارة" : ""}
            className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/50"
          >
            <Trash2 className="w-4 h-4 ml-1.5" />
            حذف
          </Button>
        </div>
      </div>

      {/* ===== STATS BAR ===== */}
      <div className="flex items-stretch bg-card rounded-xl border shadow-sm overflow-hidden">
        <DetailStatBlock
          icon={Hash}
          label="رقم الانخراط"
          value={member.local_number}
          color="text-primary"
        />
        <div className="w-px bg-border shrink-0" />
        <DetailStatBlock
          icon={Globe}
          label="رقم الانخراط الموحد"
          value={member.unified_member_number || '—'}
          color={member.unified_member_number ? "text-green-600" : "text-muted-foreground"}
        />
        <div className="w-px bg-border shrink-0" />
        <DetailStatBlock
          icon={Fingerprint}
          label="الرقم الوزاري"
          value={member.ministry_number || '—'}
          color={member.ministry_number ? "text-blue-600" : "text-muted-foreground"}
        />
        <div className="w-px bg-border shrink-0" />
        <DetailStatBlock
          icon={CalendarDays}
          label="سنة الانخراط"
          value={String(member.membership_year || '—')}
          color="text-emerald-600"
        />
        <div className="w-px bg-border shrink-0" />
        <DetailStatBlock
          icon={TreePine}
          label="المخيمات"
          value={String(member.camp_count || 0)}
          color="text-orange-600"
        />
      </div>

      {/* ===== PERSONAL INFO CARD ===== */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              المعلومات الشخصية
            </CardTitle>
            {isEditing && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800">
                وضع التعديل
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Row 1: Basic info */}
              <div>
                <label className="text-sm font-medium">الاسم</label>
                <Input
                  value={editData.first_name || ''}
                  onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">اللقب</label>
                <Input
                  value={editData.last_name || ''}
                  onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">الاسم (بالفرنسية)</label>
                <Input
                  value={editData.first_name_fr || ''}
                  className="text-left" dir="ltr"
                  onChange={(e) => setEditData({ ...editData, first_name_fr: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">اللقب (بالفرنسية)</label>
                <Input
                  value={editData.last_name_fr || ''}
                  className="text-left" dir="ltr"
                  onChange={(e) => setEditData({ ...editData, last_name_fr: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">رقم التعريف الوطني</label>
                <Input
                  value={editData.national_id || ''}
                  className="text-left" dir="ltr"
                  onChange={(e) => setEditData({ ...editData, national_id: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">تاريخ الميلاد</label>
                <Input
                  value={editData.birth_date || ''}
                  onChange={(e) => setEditData({ ...editData, birth_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">الجنس</label>
                <Select
                  onValueChange={(val) => setEditData({ ...editData, gender: val })}
                  value={editData.gender || ''}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الجنس" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">ذكر</SelectItem>
                    <SelectItem value="FEMALE">أنثى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">الرقم الوزاري</label>
                <Input
                  value={editData.ministry_number || ''}
                  onChange={(e) => setEditData({ ...editData, ministry_number: e.target.value })}
                />
              </div>

              {/* Select fields */}
              <div>
                <label className="text-sm font-medium">المؤسسة</label>
                <Select
                  onValueChange={(val) => setEditData({ ...editData, institution: val })}
                  value={editData.institution || ''}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingData ? "جاري التحميل..." : "اختر المؤسسة"} />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions.map((inst) => (
                      <SelectItem key={inst.id} value={inst.name_ar}>
                        {inst.name_ar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">المستوى الدراسي</label>
                <Select
                  onValueChange={(val) => setEditData({ ...editData, academic_level: val })}
                  value={editData.academic_level || ''}
                >
                  <SelectTrigger><SelectValue placeholder="اختر المستوى" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="إبتدائي">إبتدائي</SelectItem>
                    <SelectItem value="متوسط">متوسط</SelectItem>
                    <SelectItem value="ثانوي">ثانوي</SelectItem>
                    <SelectItem value="جامعي">جامعي</SelectItem>
                    <SelectItem value="آخر">آخر</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location Section */}
              <div className="md:col-span-2">
                <Separator className="my-2" />
                <h4 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  بيانات الميلاد والإقامة
                </h4>
              </div>

              <div>
                <label className="text-sm font-medium">ولاية الميلاد</label>
                <Select
                  onValueChange={(val) => {
                    setEditData({ ...editData, birth_wilaya: val });
                    const w = wilayas.find(w => w.name_ar === val);
                    if (w) fetchBirthMunicipalities(w.code);
                  }}
                  value={editData.birth_wilaya || ''}
                >
                  <SelectTrigger><SelectValue placeholder="اختر الولاية" /></SelectTrigger>
                  <SelectContent>
                    {wilayas.map((w) => (
                      <SelectItem key={w.code} value={w.name_ar}>{w.name_ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">بلدية الميلاد</label>
                <Select
                  onValueChange={(val) => setEditData({ ...editData, birth_commune: val })}
                  value={editData.birth_commune || ''}
                >
                  <SelectTrigger><SelectValue placeholder="اختر البلدية" /></SelectTrigger>
                  <SelectContent>
                    {birthMunicipalities.map((m) => (
                      <SelectItem key={m.id} value={m.name_ar}>{m.name_ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">ولاية الإقامة</label>
                <Select
                  onValueChange={(val) => {
                    setEditData({ ...editData, residence_wilaya: val });
                    const w = wilayas.find(w => w.name_ar === val);
                    if (w) fetchResidenceMunicipalities(w.code);
                  }}
                  value={editData.residence_wilaya || ''}
                >
                  <SelectTrigger><SelectValue placeholder="اختر الولاية" /></SelectTrigger>
                  <SelectContent>
                    {wilayas.map((w) => (
                      <SelectItem key={w.code} value={w.name_ar}>{w.name_ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">بلدية الإقامة</label>
                <Select
                  onValueChange={(val) => setEditData({ ...editData, residence_commune: val })}
                  value={editData.residence_commune || ''}
                >
                  <SelectTrigger><SelectValue placeholder="اختر البلدية" /></SelectTrigger>
                  <SelectContent>
                    {residenceMunicipalities.map((m) => (
                      <SelectItem key={m.id} value={m.name_ar}>{m.name_ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">العنوان</label>
                <Input
                  value={editData.address || ''}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">النشاطات المفضلة</label>
                <MultiSelect
                  options={ACTIVITIES_OPTIONS}
                  selected={editData.favorite_activities || []}
                  onChange={(selected) => setEditData({ ...editData, favorite_activities: selected })}
                  placeholder="اختر النشاطات..."
                />
              </div>

              {/* Digital Account Section */}
              <div className="md:col-span-2">
                <Separator className="my-2" />
                <h4 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  بيانات الحساب الرقمي (YouthConnect)
                </h4>
              </div>

              <div>
                <label className="text-sm font-medium">اسم المستخدم</label>
                <Input
                  value={editData.username || ''}
                  className="text-left font-mono text-sm" dir="ltr"
                  onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">البريد الإلكتروني</label>
                <Input
                  value={editData.email || ''}
                  className="text-left font-mono text-sm" dir="ltr"
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">كلمة المرور</label>
                <Input
                  value={editData.password || ''}
                  className="text-left font-mono text-sm" dir="ltr"
                  onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                />
              </div>

              {/* Save / Cancel */}
              <div className="md:col-span-2 flex items-center gap-3 pt-4 border-t">
                <Button onClick={handleSave} size="lg" className="px-8">
                  <Download className="w-4 h-4 ml-2" />
                  حفظ التغييرات
                </Button>
                <Button variant="outline" onClick={() => {
                  setIsEditing(false);
                  setEditData(member);
                }}>
                  إلغاء
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              <InfoItem icon={User} label="الاسم واللقب" value={`${member.first_name} ${member.last_name}`} />
              <InfoItem icon={User} label="الاسم واللقب (بالفرنسية)" value={`${member.first_name_fr || '-'} ${member.last_name_fr || '-'}`} />
              <InfoItem icon={IdCard} label="رقم التعريف الوطني" value={member.national_id || '-'} />
              <InfoItem
                icon={Cake}
                label="تاريخ الميلاد"
                value={`${member.birth_date || '-'}${age !== null ? ` (${age} سنة)` : ''}`}
              />
              <InfoItem icon={User} label="الجنس" value={member.gender === 'MALE' ? 'ذكر' : member.gender === 'FEMALE' ? 'أنثى' : member.gender || '-'} />
              <InfoItem icon={Building2} label="المؤسسة" value={member.institution || '-'} />
              <InfoItem icon={BookOpen} label="المستوى الدراسي" value={member.academic_level || '-'} />
              <InfoItem icon={MapPinned} label="ولاية الميلاد" value={member.birth_wilaya || '-'} />
              <InfoItem icon={MapPin} label="بلدية الميلاد" value={member.birth_commune || '-'} />
              <InfoItem icon={Home} label="ولاية الإقامة" value={member.residence_wilaya || '-'} />
              <InfoItem icon={MapPin} label="بلدية الإقامة" value={member.residence_commune || '-'} />
              <div className="md:col-span-2">
                <InfoItem icon={MapPin} label="العنوان" value={member.address || '-'} />
              </div>

              {/* Favorite Activities */}
              <div className="md:col-span-2">
                <Separator className="my-1" />
                <div className="flex items-start gap-3 mt-4">
                  <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground font-medium mb-2">النشاطات المفضلة</p>
                    {member.favorite_activities && member.favorite_activities.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {member.favorite_activities.map((act: string) => (
                          <Badge key={act} variant="secondary" className="text-[11px] font-normal px-2.5 py-0.5">
                            {act}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/60 text-sm">لا توجد نشاطات محددة</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== DOCUMENTS CARD ===== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            الوثائق والملفات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Photo */}
            <DocumentCard
              title="صورة المنخرط"
              icon={Camera}
              isImage
              filePath={member.photo_path}
              getUrl={getStorageUrl}
              isUploading={isUploading === 'photo'}
              onUpload={(file) => handleFileUpload('photo', file)}
              onDelete={() => handleDeleteDocument('photo')}
              accept="image/*"
            />

            {/* Birth Certificate */}
            <DocumentCard
              title="شهادة الميلاد"
              icon={FileText}
              isImage={false}
              filePath={member.birth_certificate_path}
              getUrl={getStorageUrl}
              isUploading={isUploading === 'birth-certificate'}
              onUpload={(file) => handleFileUpload('birth-certificate', file)}
              onDelete={() => handleDeleteDocument('birth-certificate')}
              accept="image/*,.pdf"
            />

            {/* National ID */}
            <DocumentCard
              title="بطاقة التعريف الوطنية"
              icon={IdCard}
              isImage={false}
              filePath={member.national_id_path}
              getUrl={getStorageUrl}
              isUploading={isUploading === 'national-id'}
              onUpload={(file) => handleFileUpload('national-id', file)}
              onDelete={() => handleDeleteDocument('national-id')}
              accept="image/*,.pdf"
            />
          </div>
        </CardContent>
      </Card>

      {/* ===== DIGITAL IDENTITY CARD ===== */}
      <Card className="border-primary/10 bg-primary/[0.02]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            الهوية الرقمية (YouthConnect)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InfoItem icon={User} label="اسم المستخدم" value={member.username || 'لم يولد بعد'} />
            <InfoItem icon={Mail} label="البريد الإلكتروني" value={member.email || '-'} />
            <InfoItem icon={Lock} label="كلمة المرور" value={member.password || '••••••••'} />
          </div>
          {!member.username && (
            <div className="mt-4 p-3 bg-primary/[0.03] rounded-lg border border-primary/10 text-xs text-muted-foreground flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>سيتم توليد هذه البيانات تلقائياً عند حفظ الملف لضمان التوافق مع منصة YouthConnect.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== GUARDIANS CARD ===== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            الأولياء
            <span className="text-muted-foreground text-base font-normal">({member.guardians?.length || 0})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {member.guardians && member.guardians.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {member.guardians.map((guardian: Guardian) => (
                <GuardianCard
                  key={guardian.id}
                  guardian={guardian}
                  getUrl={getStorageUrl}
                  onUploadCard={async (file) => {
                    try {
                      await membersApi.uploadGuardianNationalId(guardian.id, file);
                      toast.success("تم رفع بطاقة تعريف الولي");
                      loadMember();
                    } catch (err: any) {
                      toast.error(err?.response?.data?.detail || "فشل في رفع الملف");
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Users className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm text-muted-foreground">لا يوجد أولياء مسجلين لهذا المنخرط</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== CAMPS CARD ===== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <TreePine className="w-5 h-5 text-primary" />
            المخيمات
            <span className="text-muted-foreground text-base font-normal">({member.camp_count || 0})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {member.camp_count > 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center">
                <TreePine className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="font-medium text-foreground">مسجل في {member.camp_count} مخيم{member.camp_count > 1 ? 'ات' : ''}</p>
                <p className="text-sm text-muted-foreground mt-1">يمكنك عرض تفاصيل المخيمات المسجل فيها</p>
              </div>
              <Button variant="outline" onClick={() => router.push(`/members/${memberId}/camps`)} className="mt-1">
                <ChevronLeft className="w-4 h-4 ml-2" />
                عرض المخيمات
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <TreePine className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">لم يسجل هذا المنخرط في أي مخيم بعد</p>
                <p className="text-xs text-muted-foreground/60 mt-1">يمكن تسجيله في مخيم من صفحة تسجيل المخيمات</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ===== SUB-COMPONENTS ===== */

interface InfoItemProps {
  icon: React.ElementType;
  label: string;
  value: string;
}

function InfoItem({ icon: Icon, label, value }: InfoItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="font-semibold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

interface DetailStatBlockProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}

function DetailStatBlock({ icon: Icon, label, value, color }: DetailStatBlockProps) {
  return (
    <div className="flex-1 flex items-center gap-3 px-5 py-4 min-w-0">
      <div className="shrink-0 w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center">
        <Icon className={`w-4.5 h-4.5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
        <p className={`text-lg font-bold tabular-nums truncate ${color}`}>{value}</p>
      </div>
    </div>
  );
}

interface DocumentCardProps {
  title: string;
  icon: React.ElementType;
  isImage: boolean;
  filePath?: string | null;
  getUrl: (path?: string | null) => string | null;
  isUploading: boolean;
  onUpload: (file: File) => void;
  onDelete: () => void;
  accept: string;
}

function DocumentCard({ title, icon: Icon, isImage, filePath, getUrl, isUploading, onUpload, onDelete, accept }: DocumentCardProps) {
  const fileUrl = getUrl(filePath);
  const fileExtension = filePath?.split('.').pop()?.toLowerCase();
  const isPdf = fileExtension === 'pdf';

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Document Preview Area */}
      <div className="aspect-[4/3] bg-muted/30 flex items-center justify-center relative overflow-hidden">
        {fileUrl && isImage ? (
          <>
            <img
              src={fileUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors" />
            <a
              href={fileUrl}
              target="_blank"
              className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20"
            >
              <div className="bg-background/90 rounded-full p-2 shadow-sm">
                <Eye className="w-5 h-5" />
              </div>
            </a>
          </>
        ) : fileUrl && isPdf ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <FileText className="w-10 h-10 text-red-500" />
            <span className="text-xs font-medium">PDF</span>
            <a
              href={fileUrl}
              target="_blank"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Eye className="w-3 h-3" />
              عرض الملف
            </a>
          </div>
        ) : fileUrl ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <FileText className="w-10 h-10 text-blue-500" />
            <span className="text-xs font-medium">مستند</span>
            <a
              href={fileUrl}
              target="_blank"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Eye className="w-3 h-3" />
              عرض الملف
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
            <Icon className="w-10 h-10" />
            <span className="text-xs">لا يوجد ملف</span>
          </div>
        )}

        {/* Delete button */}
        {fileUrl && (
          <button
            onClick={onDelete}
            className="absolute top-2 right-2 bg-background/80 hover:bg-destructive hover:text-destructive-foreground rounded-full p-1.5 shadow-sm transition-colors"
            title="حذف الملف"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Document Info & Upload */}
      <div className="p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
        <label className={`flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors text-xs ${
          isUploading
            ? 'border-muted bg-muted/30'
            : 'border-muted-300 hover:border-primary/40 hover:bg-primary/[0.02]'
        }`}>
          {isUploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>جاري الرفع...</span>
            </>
          ) : (
            <>
              <FileUp className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">اختر ملفاً</span>
            </>
          )}
          <input
            type="file"
            className="hidden"
            accept={accept}
            disabled={isUploading}
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
        </label>
      </div>
    </div>
  );
}

interface GuardianCardProps {
  guardian: Guardian;
  getUrl: (path?: string | null) => string | null;
  onUploadCard: (file: File) => Promise<void>;
}

function GuardianCard({ guardian, getUrl, onUploadCard }: GuardianCardProps) {
  const [isUploadingCard, setIsUploadingCard] = useState(false);

  const handleUpload = async (file: File) => {
    setIsUploadingCard(true);
    try {
      await onUploadCard(file);
    } finally {
      setIsUploadingCard(false);
    }
  };

  return (
    <div className="p-4 rounded-lg border bg-card hover:border-border/80 transition-colors">
      <div className="flex items-start gap-3">
        <Avatar className="w-10 h-10 border border-border/50 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
            {getInitials(guardian.first_name, guardian.last_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="font-semibold text-foreground">
                {guardian.first_name} {guardian.last_name}
              </h4>
              <p className="text-xs text-muted-foreground">
                {guardian.relationship_type || 'ولي'}
              </p>
            </div>
          </div>

          <div className="mt-2 space-y-1.5">
            {guardian.phone && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground" dir="ltr">
                <Phone className="w-3.5 h-3.5 text-foreground/60 shrink-0" />
                <span dir="ltr" className="text-left">{guardian.phone}</span>
              </p>
            )}
            {guardian.email && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground" dir="ltr">
                <Mail className="w-3.5 h-3.5 text-foreground/60 shrink-0" />
                <span className="text-left truncate">{guardian.email}</span>
              </p>
            )}
            {guardian.national_id && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <IdCard className="w-3.5 h-3.5 text-foreground/60 shrink-0" />
                <span dir="ltr" className="text-left font-mono text-xs">{guardian.national_id}</span>
                {guardian.national_id_path ? (
                  <a
                    href={getUrl(guardian.national_id_path) || ''}
                    target="_blank"
                    className="text-xs text-primary hover:underline mr-1"
                  >
                    (عرض البطاقة)
                  </a>
                ) : (
                  <label className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 cursor-pointer mr-1">
                    (رفع البطاقة)
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      disabled={isUploadingCard}
                      onChange={async (e) => {
                        if (!e.target.files?.[0]) return;
                        await handleUpload(e.target.files[0]);
                      }}
                    />
                  </label>
                )}
              </p>
            )}
            {!guardian.phone && !guardian.email && !guardian.national_id && (
              <p className="text-xs text-muted-foreground/60">لا توجد معلومات إضافية</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Star icon - not exported from lucide by default in some setups, we inline one */
function Star({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}