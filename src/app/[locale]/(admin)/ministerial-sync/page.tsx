'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  RefreshCw,
  Download,
  Loader2,
  AlertCircle,
  Filter,
  Calendar,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Users,
  AlertTriangle,
  FileX,
  KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ministerialSyncApi,
  type ChildRegistrationDashboardItem,
  type PaginatedRegistrationsResponse,
  type RegistrationsStats,
} from '@/lib/api/ministerial_sync';
import { getErrorMessage } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { PermissionGuard } from "@/hooks/useRequirePermission";
import { MinisterialAccountsModal } from "@/components/ministerial-sync/MinisterialAccountsModal";

// =============================================================================
// Wilaya Map — لتحويل رموز الولايات إلى أسماء
// =============================================================================
const WILAYA_MAP: Record<string, string> = {
  '01': 'أدرار',
  '02': 'الشلف',
  '03': 'الأغواط',
  '04': 'أم البواقي',
  '05': 'باتنة',
  '06': 'بجاية',
  '07': 'بسكرة',
  '08': 'بشار',
  '09': 'البليدة',
  '10': 'البويرة',
  '11': 'تمنراست',
  '12': 'تبسة',
  '13': 'تلمسان',
  '14': 'تيارت',
  '15': 'تيزي وزو',
  '16': 'الجزائر',
  '17': 'الجلفة',
  '18': 'جيجيل',
  '19': 'سطيف',
  '20': 'سعيدة',
  '21': 'سكيكدة',
  '22': 'سيدي بلعباس',
  '23': 'عنابة',
  '24': 'قالمة',
  '25': 'قسنطينة',
  '26': 'المدية',
  '27': 'مستغانم',
  '28': 'المسيلة',
  '29': 'معسكر',
  '30': 'ورقلة',
  '31': 'وهران',
  '32': 'البيض',
  '33': 'إليزي',
  '34': 'برج بوعريريج',
  '35': 'بومرداس',
  '36': 'الطارف',
  '37': 'تندوف',
  '38': 'تيسمسيلت',
  '39': 'الوادي',
  '40': 'خنشلة',
  '41': 'سوق أهراس',
  '42': 'تيبازة',
  '43': 'ميلة',
  '44': 'عين الدفلى',
  '45': 'نعامة',
  '46': 'عين تموشنت',
  '47': 'غرداية',
  '48': 'غليزان',
  '49': 'تيميمون',
  '50': 'بني عباس',
  '51': 'عين صالح',
  '52': 'عين قزام',
  '53': 'تقرت',
  '54': 'جانت',
  '55': 'المغير',
  '56': 'المنيعة',
  '57': 'أولاد جلال',
  '58': 'برج باجي مختار',
  '68': 'بوسعادة',
};

function formatWilaya(w: string | null | undefined): string {
  if (!w) return '—';
  // If it's a known code, resolve to name
  if (WILAYA_MAP[w]) return WILAYA_MAP[w];
  // If it's a code starting with 0 that's not in map, try without leading zero
  if (w.length === 3 && w.startsWith('0')) {
    const withoutZero = w.substring(1);
    if (WILAYA_MAP[withoutZero]) return WILAYA_MAP[withoutZero];
  }
  // Already a name
  return w;
}

// =============================================================================
// Helper Functions
// =============================================================================

function calculateAge(birthDate: string | null | undefined): number {
  if (!birthDate) return 0;
  try {
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return Math.max(0, age);
  } catch {
    return 0;
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

function getAgeCategory(age: number): string {
  if (age <= 0) return '';
  return age <= 13 ? 'طفل' : 'يافع';
}

function getInitials(
  firstName?: string | null,
  lastName?: string | null,
): string {
  const first = firstName ? firstName.charAt(0) : '';
  const last = lastName ? lastName.charAt(0) : '';
  return (first + last).toUpperCase() || '?';
}

function getGenderSymbol(gender?: string | null): string {
  if (!gender) return '';
  const g = gender.toUpperCase();
  if (g === 'MALE' || g === 'M' || g === 'ذكر') return '♂';
  if (g === 'FEMALE' || g === 'F' || g === 'أنثى') return '♀';
  return '';
}

// =============================================================================
// Status Configuration
// =============================================================================

type StatusKey = 'all' | 'accepted' | 'under_review' | 'failed';

const STATUS_OPTIONS: { key: StatusKey; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'accepted', label: 'مقبول' },
  { key: 'under_review', label: 'قيد المراجعة' },
  { key: 'failed', label: 'فشل' },
];

const STATUS_BADGE_STYLES: Record<string, string> = {
  accepted: 'bg-sky-100 text-sky-700 border-sky-200',
  under_review: 'bg-amber-100 text-amber-700 border-amber-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_BADGE_LABELS: Record<string, string> = {
  accepted: 'الملف مقبول',
  under_review: 'قيد المراجعة',
  failed: 'فشل',
  rejected: 'فشل',
};

function getStatusBadgeClass(status: string): string {
  return STATUS_BADGE_STYLES[status] || 'bg-gray-100 text-gray-600 border-gray-200';
}

function getStatusLabel(status: string): string {
  return STATUS_BADGE_LABELS[status] || status;
}

// =============================================================================
// Page Component
// =============================================================================

export default function MinisterialSyncPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [registrations, setRegistrations] =
    useState<PaginatedRegistrationsResponse | null>(null);
  const [stats, setStats] = useState<RegistrationsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusKey>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [withoutParentalDeclaration, setWithoutParentalDeclaration] =
    useState(false);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [accountsOpen, setAccountsOpen] = useState(false);

  const pageSize = 15;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // ---- Debounce search input (500ms) ----
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // ---- Fetch registrations + stats ----
  const loadAll = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      setError(null);
      try {
        const params: Record<string, unknown> = {
          source: 'ministerial',
          wilaya: 'بوسعادة',
          page,
          page_size: pageSize,
        };
        if (debouncedSearch) params.search = debouncedSearch;
        if (statusFilter !== 'all') params.status = statusFilter;
        if (withoutParentalDeclaration)
          params.without_parental_declaration = true;

        const [regRes, statsRes] = await Promise.all([
          ministerialSyncApi.getRegistrations(params as any),
          ministerialSyncApi.getRegistrationsStats(),
        ]);
        setRegistrations(regRes.data);
        setStats(statsRes.data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [debouncedSearch, statusFilter, withoutParentalDeclaration, page],
  );

  // Initial load + re-fetch whenever search/filter/page changes
  useEffect(() => {
    loadAll(true);
  }, [loadAll]);

  // ---- Sync handler ----
  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      await ministerialSyncApi.triggerSync();
      // Wait 3 seconds for the backend to process, then refresh
      setTimeout(() => {
        loadAll(true);
      }, 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  };

  // ---- Selection handlers ----
  const handleSelectAll = () => {
    if (!registrations?.items.length) return;
    if (selectedIds.size === registrations.items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(registrations.items.map((r) => r.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // ---- Derived values ----
  const totalCount = registrations?.total ?? stats?.total_files ?? 0;
  const totalPages = registrations?.total_pages ?? 1;
  const unguidedCount = stats?.unguided_count ?? 0;

  // ---- Show filter panel (based on current status) ----
  const activeStatusLabel =
    statusFilter !== 'all'
      ? STATUS_OPTIONS.find((o) => o.key === statusFilter)?.label
      : null;

  // =========================================================================
  // Render
  // =========================================================================

  return (
  <PermissionGuard module="ministerial_sync" action="view">
  
        <div dir="rtl" className="bg-gray-50 min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* ================================================================ */}
        {/* HEADER                                                          */}
        {/* ================================================================ */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              قائمة تسجيلات الأطفال واليافعين
              <span className="text-gray-400 mx-2">·</span>
              <span className="text-emerald-600">{totalCount}</span>
              <span className="text-gray-500 mr-1 text-lg font-normal">
                ملف
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAccountsOpen(true)}
              className="gap-2"
            >
              <KeyRound className="h-4 w-4" />
              حسابات الوزارة
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/${locale}/ministerial-sync/years`)}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              إدارة السنوات
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAll(true)}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              تحديث
            </Button>
            <Button
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {syncing ? 'جارٍ المزامنة...' : 'مزامنة'}
            </Button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* ERROR ALERT                                                      */}
        {/* ================================================================ */}
        {error && (
          <Alert
            variant="destructive"
            className="bg-red-50 border-red-200 text-red-800"
          >
            <AlertCircle className="h-5 w-5 text-red-500" />
            <AlertTitle className="text-red-700">حدث خطأ</AlertTitle>
            <AlertDescription className="text-red-600">
              <p className="mb-2">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadAll(true)}
              >
                إعادة المحاولة
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* ================================================================ */}
        {/* UNGUIDED ALERT BANNER                                            */}
        {/* ================================================================ */}
        {unguidedCount > 0 && (
          <Alert
            variant="warning"
            className="bg-amber-50 border-amber-200 text-amber-800"
          >
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <AlertTitle className="text-amber-800">
              لديك أطفال مقبولون لم تُوجّههم بعد إلى دورة
            </AlertTitle>
            <AlertDescription className="text-amber-700">
              <p>
                القبول لا يكفي — يجب توجيه كل طفل مقبول إلى دورة ليلتحق
                بالمخيم.
              </p>
              <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                <span className="font-semibold text-amber-800">
                  {stats?.unguided_count ?? 0} طفل بانتظار التوجيه
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-300 text-amber-700 hover:bg-amber-100"
                  onClick={() => {
                    setStatusFilter('accepted');
                    setPage(1);
                  }}
                >
                  عرض غير الموجَّهين
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* ================================================================ */}
        {/* SEARCH + FILTER                                                  */}
        {/* ================================================================ */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[250px] max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="بحث بالاسم أو اللقب أو الرمز"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pr-10 bg-white border-gray-200"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="مسح البحث"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'gap-2',
              showFilters && 'bg-gray-100 border-gray-300',
            )}
          >
            <Filter className="h-4 w-4" />
            تصفية
            {activeStatusLabel && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full mr-1">
                {activeStatusLabel}
              </span>
            )}
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500 ml-2">الحالة:</span>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => {
                  setStatusFilter(opt.key);
                  setPage(1);
                }}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-full border transition-colors',
                  statusFilter === opt.key
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-medium'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
                )}
              >
                {opt.label}
              </button>
            ))}
            {statusFilter !== 'all' && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setPage(1);
                }}
                className="px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 mr-2 flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                إلغاء التصفية
              </button>
            )}
            <span className="text-sm text-gray-300 mx-1">|</span>
            <button
              onClick={() => {
                setWithoutParentalDeclaration(!withoutParentalDeclaration);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                withoutParentalDeclaration
                  ? 'bg-red-100 text-red-700 border-red-300 ring-2 ring-red-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <FileX className="w-4 h-4 inline-block ml-1.5" />
              لم يرسل التصريح الأبوي
            </button>
          </div>
        )}

        {/* ================================================================ */}
        {/* TABLE                                                            */}
        {/* ================================================================ */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {/* ---- Loading State ---- */}
          {loading && (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-4 rounded shrink-0" />
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16 shrink-0" />
                  <Skeleton className="h-4 w-24 shrink-0" />
                  <Skeleton className="h-4 w-20 shrink-0" />
                  <Skeleton className="h-5 w-24 rounded-full shrink-0" />
                  <Skeleton className="h-8 w-28 shrink-0" />
                </div>
              ))}
              <div className="flex flex-col items-center justify-center pt-6 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <p className="text-sm text-gray-400">جاري التحميل...</p>
              </div>
            </div>
          )}

          {/* ---- Error State (no data loaded) ---- */}
          {!loading && error && !registrations && (
            <div className="text-center py-16">
              <AlertCircle className="h-12 w-12 text-red-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">{error}</p>
              <Button
                variant="outline"
                onClick={() => loadAll(true)}
              >
                إعادة المحاولة
              </Button>
            </div>
          )}

          {/* ---- Empty State ---- */}
          {!loading && !error && registrations && registrations.items.length === 0 && (
            <div className="text-center py-16">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">
                لا توجد تسجيلات
              </p>
              <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                {debouncedSearch || statusFilter !== 'all'
                  ? 'لم يتم العثور على نتائج تطابق معايير البحث'
                  : 'لم يتم استيراد أي تسجيلات بعد من منصة وزارة الشباب'}
              </p>
              {!debouncedSearch && statusFilter === 'all' && (
                <Button
                  onClick={handleSync}
                  disabled={syncing}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  بدء المزامنة
                </Button>
              )}
            </div>
          )}

          {/* ---- Data Table ---- */}
          {!loading &&
            registrations &&
            registrations.items.length > 0 && (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-10">
                        <Checkbox
                          checked={
                            registrations.items.length > 0 &&
                            selectedIds.size ===
                              registrations.items.length
                          }
                          onCheckedChange={handleSelectAll}
                          aria-label="تحديد الكل"
                        />
                      </TableHead>
                      <TableHead className="text-gray-600 font-medium whitespace-nowrap">
                        الطفل
                      </TableHead>
                      <TableHead className="text-gray-600 font-medium whitespace-nowrap">
                        الجنس / العمر
                      </TableHead>
                      <TableHead className="text-gray-600 font-medium whitespace-nowrap">
                        ولاية الإقامة
                      </TableHead>
                      <TableHead className="text-gray-600 font-medium whitespace-nowrap">
                        تاريخ التسجيل
                      </TableHead>
                      <TableHead className="text-gray-600 font-medium whitespace-nowrap">
                        حالة الملف
                      </TableHead>
                      <TableHead className="text-gray-600 font-medium whitespace-nowrap">
                        إجراءات
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrations.items.map((item) => {
                      const age = calculateAge(item.birth_date);
                      const ageCategory = getAgeCategory(age);
                      const genderSym = getGenderSymbol(item.gender);
                      const fullName =
                        item.child_full_name ||
                        `${item.child_first_name ?? ''} ${item.child_last_name ?? ''}`.trim();
                      const initials = getInitials(
                        item.child_first_name,
                        item.child_last_name,
                      );

                      return (
                        <TableRow
                          key={item.id}
                          className={cn(
                            'hover:bg-gray-50 transition-colors',
                            selectedIds.has(item.id) && 'bg-sky-50/40',
                          )}
                        >
                          {/* Checkbox */}
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(item.id)}
                              onCheckedChange={() =>
                                handleSelectOne(item.id)
                              }
                              aria-label={`تحديد ${fullName}`}
                            />
                          </TableCell>

                          {/* Child Info */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 border border-gray-200 shrink-0">
                                {item.photo_url ? (
                                  <AvatarImage
                                    src={item.photo_url}
                                    alt={fullName}
                                  />
                                ) : null}
                                <AvatarFallback className="text-xs font-medium bg-emerald-50 text-emerald-700">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 text-sm truncate max-w-[180px]">
                                  {fullName}
                                </p>
                                {item.has_member && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Badge
                                      variant="success"
                                      className="text-[10px] px-1.5 py-0 h-5 gap-0.5"
                                    >
                                      <ShieldCheck className="h-3 w-3" />
                                      منخرط
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Gender / Age */}
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {genderSym && (
                                <span className="text-base font-bold text-gray-500">
                                  {genderSym}
                                </span>
                              )}
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                  {ageCategory && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-1.5 py-0 h-5 text-gray-500 border-gray-200"
                                    >
                                      {ageCategory}
                                    </Badge>
                                  )}
                                  {age > 0 && (
                                    <span className="text-sm text-gray-500">
                                      {age} سنة
                                    </span>
                                  )}
                                </div>
                                {item.birth_date && (
                                  <span className="text-[11px] text-gray-400 mt-0.5">
                                    ({formatDate(item.birth_date)})
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Wilaya */}
                          <TableCell>
                            <span className="text-sm text-gray-700">
                              {formatWilaya(item.residence_wilaya)}
                            </span>
                          </TableCell>

                          {/* Registration Date */}
                          <TableCell>
                            <span className="text-sm text-gray-500">
                              {formatDate(item.created_at)}
                            </span>
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <span
                              className={cn(
                                'inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border',
                                getStatusBadgeClass(item.status),
                              )}
                            >
                              {getStatusLabel(item.status)}
                            </span>
                          </TableCell>

                          {/* Actions */}
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                                title="فتح الملف"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              {item.status === 'under_review' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs gap-1 text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                  <span className="hidden sm:inline">
                                    قبول الملف
                                  </span>
                                </Button>
                              )}
                              {item.status === 'accepted' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                  <span className="hidden sm:inline">
                                    موافقة نهائية
                                  </span>
                                </Button>
                              )}
                              {(item.status === 'under_review' ||
                                item.status === 'accepted') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs gap-1 text-red-500 hover:text-red-600 hover:bg-red-50"
                                >
                                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                                  <span className="hidden sm:inline">
                                    رفض
                                  </span>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* ---- Pagination ---- */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                    <p className="text-sm text-gray-500">
                      صفحة {page} / {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPage((p) => Math.max(1, p - 1))
                        }
                        disabled={page <= 1}
                        className="gap-1"
                      >
                        <ChevronRight className="h-4 w-4" />
                        السابق
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPage((p) =>
                            Math.min(totalPages, p + 1),
                          )
                        }
                        disabled={page >= totalPages}
                        className="gap-1"
                      >
                        التالي
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
        </div>

        {/* ================================================================ */}
        {/* FOOTER                                                           */}
        {/* ================================================================ */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">
            © 2026 وزارة الشباب. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </div>
    <MinisterialAccountsModal
      open={accountsOpen}
      onOpenChange={setAccountsOpen}
    />
  </PermissionGuard>
              );
}