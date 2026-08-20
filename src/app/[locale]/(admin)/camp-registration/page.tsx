"use client";

import { useAuthStore } from "@/lib/stores/auth";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Play, Trash2, RefreshCw, Users, CheckCircle, XCircle,
  Clock, Loader2, Eye, Search, CalendarDays, Layers, BarChart3,
  TrendingUp, Activity, ArrowUp, ArrowDown, Download,
  Landmark, GraduationCap, LayoutList, LayoutGrid, ChevronDown, ChevronUp, Brain, User,
  AlertTriangle, ListFilter, MapPin
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { campRegistrationApi, RegistrationBatch, BatchStatistics, CampRegistration } from "@/lib/api/camp-registration";
import { ControlPanel } from "@/components/odoo/ControlPanel";
import { cn } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

import { PermissionGuard } from "@/hooks/useRequirePermission";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: "في الانتظار", color: "bg-amber-100 text-amber-800", icon: Clock },
  PROCESSING: { label: "قيد المعالجة", color: "bg-blue-100 text-blue-800", icon: Loader2 },
  COMPLETED: { label: "مكتمل", color: "bg-green-100 text-green-800", icon: CheckCircle },
  FAILED: { label: "فشل", color: "bg-red-100 text-red-800", icon: XCircle },
};

const CHILD_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "في الانتظار", color: "bg-amber-100 text-amber-800" },
  PROCESSING: { label: "قيد المعالجة", color: "bg-blue-100 text-blue-800" },
  SUCCESS: { label: "ناجح", color: "bg-green-100 text-green-800" },
  FAILED: { label: "فشل", color: "bg-red-100 text-red-800" },
  ERROR: { label: "خطأ", color: "bg-red-100 text-red-800" },
};

// ─── Helper components ───────────────────────────────────────────────────────

/** Mini stat block for the summary strip */
const StatBlock = React.memo(function StatBlock({ icon: Icon, label, value, sub, trend }: {
  icon: any; label: string; value: string | number; sub?: string; trend?: 'up' | 'down' | null;
}) {

  return (

        <div className="flex items-center gap-3 px-5 py-3 border-l border-border/40 first:border-l-0">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums leading-tight">{value}</span>
          {sub && <span className="text-sm text-muted-foreground">{sub}</span>}
          {trend === 'up' && <ArrowUp className="h-3.5 w-3.5 text-emerald-500" />}
          {trend === 'down' && <ArrowDown className="h-3.5 w-3.5 text-red-500" />}
        </div>
      </div>
    </div>
  );
});

/** Inline segmented bar (gender / success vs failed) */
const SegmentedBar = React.memo(function SegmentedBar({ segments }: {
  segments: { label: string; count: number; color: string; textColor: string }[];
}) {
  const total = segments.reduce((a, s) => a + s.count, 0);
  if (total === 0) return <div className="text-xs text-muted-foreground py-2">لا توجد بيانات</div>;
  return (
    <div className="space-y-2">
      <div className="flex h-8 w-full overflow-hidden rounded-lg bg-muted">
        {segments.map((s, i) => (
          s.count > 0 && (
            <div
              key={i}
              className={cn("flex items-center justify-center text-xs font-bold text-white transition-all", s.color)}
              style={{ width: `${(s.count / total) * 100}%` }}
            >
              {((s.count / total) * 100).toFixed(0)}%
            </div>
          )
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", s.color)} />
            <span className="text-muted-foreground">{s.label}</span>
            <span className={cn("font-semibold", s.textColor)}>{s.count.toLocaleString('ar-DZ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

/** Horizontal bar for commune distribution */
const CommuneBar = React.memo(function CommuneBar({ name, count, max }: { name: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3 group">
      <span className="w-28 text-xs truncate text-left shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
        {name}
      </span>
      <div className="flex-1 h-5 bg-muted rounded-md overflow-hidden relative">
        <div
          className="h-full rounded-md transition-all duration-700"
          style={{
            width: `${Math.max(pct, 2)}%`,
            background: 'linear-gradient(90deg, var(--primary), var(--primary)/70%)',
          }}
        />
      </div>
      <span className="w-14 text-right text-xs font-semibold tabular-nums">{count}</span>
    </div>
  );
});

/** Animated gradient progress bar */
const AnimatedProgress = React.memo(function AnimatedProgress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className="h-full w-full rounded-full transition-all duration-700"
        style={{
          width: `${Math.min(value, 100)}%`,
          background: 'linear-gradient(90deg, var(--primary), var(--primary)/60%, var(--primary))',
        }}
      />
    </div>
  );
});

/** Child card for search results */
const ChildCard = React.memo(function ChildCard({ child, batches }: { child: CampRegistration; batches: RegistrationBatch[] }) {
  const statusCfg = CHILD_STATUS_CONFIG[child.status] || CHILD_STATUS_CONFIG.PENDING;
  return (
    <div className="group bg-card border border-border/60 rounded-xl p-4 hover:shadow-md hover:border-border transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
            {child.child_first_name?.charAt(0) || '?'}
          </div>
          <div>
            <h4 className="font-semibold text-sm leading-tight">{child.child_first_name} {child.child_last_name}</h4>
            <p className="text-xs text-muted-foreground">{child.gender === 'MALE' ? 'ذكر' : child.gender === 'FEMALE' ? 'أنثى' : '—'}</p>
          </div>
        </div>
        <Badge className={cn("text-[10px] px-2 py-0", statusCfg.color)}>
          {statusCfg.label}
        </Badge>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Users className="h-3 w-3 shrink-0" />
          <span className="truncate">{child.parent_first_name} {child.parent_last_name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Layers className="h-3 w-3 shrink-0" />
          <span className="truncate">{batches.find(b => b.id === child.batch_id)?.name || '...'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Landmark className="h-3 w-3 shrink-0" />
          <span className="truncate">{child.residence_commune || '—'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3 w-3 shrink-0" />
          <span>{child.birth_date}</span>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-border/40 flex gap-2">
        <Link href={`/camp-registration/child/${child.id}`} className="flex-1">
          <Button size="sm" variant="default" className="w-full text-xs h-8">
            <User className="h-3 w-3 ml-1.5" />
            تفاصيل الطفل
          </Button>
        </Link>
        <Link href={`/camp-registration/${child.batch_id}`} className="flex-1">
          <Button size="sm" variant="outline" className="w-full text-xs h-8">
            <Layers className="h-3 w-3 ml-1.5" />
            الدفعة
          </Button>
        </Link>
      </div>
    </div>
  );
});

/** List view for children */
const ChildrenListView = React.memo(function ChildrenListView({ childrenItems, batches }: { childrenItems: CampRegistration[]; batches: RegistrationBatch[] }) {
  if (childrenItems.length === 0) return null;
  return (
    <div className="rounded-md border border-border/40 overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[50px] whitespace-nowrap text-center">#</TableHead>
              <TableHead className="whitespace-nowrap">الطفل</TableHead>
              <TableHead className="whitespace-nowrap">الجنس</TableHead>
              <TableHead className="whitespace-nowrap">تاريخ الميلاد</TableHead>
              <TableHead className="whitespace-nowrap">ولي الأمر</TableHead>
              <TableHead className="whitespace-nowrap">الدفعة</TableHead>
              <TableHead className="whitespace-nowrap">بلدية الإقامة</TableHead>
              <TableHead className="whitespace-nowrap">الحالة</TableHead>
              <TableHead className="text-end whitespace-nowrap">إجراء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {childrenItems.map((child, index) => {
              const statusCfg = CHILD_STATUS_CONFIG[child.status] || CHILD_STATUS_CONFIG.PENDING;
              const batchName = batches.find(b => b.id === child.batch_id)?.name || '...';
              return (
                <TableRow key={child.id} className="hover:bg-muted/30">
                  <TableCell className="text-center text-muted-foreground font-mono text-xs">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold shrink-0">
                        {child.child_first_name?.charAt(0) || '?'}
                      </div>
                      <span>{child.child_first_name} {child.child_last_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {child.gender === 'MALE' ? 'ذكر' : child.gender === 'FEMALE' ? 'أنثى' : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{child.birth_date}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3 w-3 shrink-0 opacity-50" />
                      {child.parent_first_name} {child.parent_last_name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[150px] truncate" title={batchName}>
                    {batchName}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{child.residence_commune || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge className={cn("text-[10px] px-2 py-0", statusCfg.color)}>
                      {statusCfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end whitespace-nowrap">
                    <Link href={`/camp-registration/child/${child.id}`}>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="تفاصيل الطفل">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
});

/** Collapsible Group Section */
const GroupSection = React.memo(function GroupSection({ groupName, childrenInGroup, viewType, batches }: { groupName: string; childrenInGroup: CampRegistration[]; viewType: string; batches: RegistrationBatch[] }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mb-2">
      <div 
        className="flex items-center gap-2 mb-3 cursor-pointer select-none group py-1.5 px-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="h-1 w-6 rounded-full bg-primary/40 transition-colors group-hover:bg-primary" />
        <h3 className="text-sm font-bold">{groupName}</h3>
        <Badge variant="secondary" className="text-[10px] h-5">
          {childrenInGroup.length}
        </Badge>
        <div className="mr-auto">
          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" /> : <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />}
        </div>
      </div>
      
      {isExpanded && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          {viewType === "list" ? (
            <ChildrenListView childrenItems={childrenInGroup} batches={batches} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {childrenInGroup.map((child) => <ChildCard key={child.id} child={child} batches={batches} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function CampRegistrationDashboard() {
  const router = useRouter();
  const [batches, setBatches] = useState<RegistrationBatch[]>([]);
  const [statistics, setStatistics] = useState<BatchStatistics | null>(null);
  const [detailedStats, setDetailedStats] = useState<any>(null);
  const [matchingChildren, setMatchingChildren] = useState<CampRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [processingBatches, setProcessingBatches] = useState<Set<string>>(new Set());
  const [viewType, setViewType] = useState<"list" | "kanban">("kanban");
  const hasPermission = useAuthStore((state) => state.hasPermission);

  const [duplicateChildren, setDuplicateChildren] = useState<any[]>([]);
  const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = useState(false);
  const [isDeletingChild, setIsDeletingChild] = useState<string | null>(null);

  useEffect(() => {
    const fetchDuplicates = async () => {
      try {
        let allChildren: any[] = [];
        let currentPage = 1;
        let hasMore = true;
        while (hasMore) {
          const res = await campRegistrationApi.searchChildren(undefined, currentPage, 1000);
          const items = res.data.items || [];
          allChildren = [...allChildren, ...items];
          if (items.length < 1000 || allChildren.length >= 10000) hasMore = false;
          else currentPage++;
        }
        
        const grouped = new Map<string, any[]>();
        allChildren.forEach(c => {
           const uniqueKey = `${c.child_first_name?.trim()}_${c.child_last_name?.trim()}_${c.parent_first_name?.trim()}_${c.parent_last_name?.trim()}`.toLowerCase();
           if (!grouped.has(uniqueKey)) {
               grouped.set(uniqueKey, []);
           }
           grouped.get(uniqueKey)!.push(c);
        });
        
        const duplicates: any[] = [];
        grouped.forEach(group => {
           if (group.length > 1) {
               duplicates.push(...group);
           }
        });
        setDuplicateChildren(duplicates);
      } catch (err) {
        console.error("Failed to fetch duplicates", err);
      }
    };
    fetchDuplicates();
  }, []);

  const handleDeleteDuplicate = async (batchId: string, childId: string) => {
    if (!batchId) {
       toast.error("لا يمكن حذف التسجيل لأنه غير مرتبط بدفعة.");
       return;
    }
    if (!confirm("هل أنت متأكد من حذف هذا التسجيل؟ لا يمكن التراجع عن هذا الإجراء.")) return;
    setIsDeletingChild(childId);
    try {
      await campRegistrationApi.deleteChild(batchId, childId);
      toast.success("تم حذف التسجيل بنجاح");
      setDuplicateChildren(prev => {
        const next = prev.filter(c => c.id !== childId);
        const counts = new Map<string, number>();
        next.forEach(c => {
           const key = `${c.child_first_name?.trim()}_${c.child_last_name?.trim()}_${c.parent_first_name?.trim()}_${c.parent_last_name?.trim()}`.toLowerCase();
           counts.set(key, (counts.get(key) || 0) + 1);
        });
        return next.filter(c => {
           const key = `${c.child_first_name?.trim()}_${c.child_last_name?.trim()}_${c.parent_first_name?.trim()}_${c.parent_last_name?.trim()}`.toLowerCase();
           return counts.get(key)! > 1;
        });
      });
      loadData();
    } catch (err) {
      toast.error("فشل في حذف التسجيل");
    } finally {
      setIsDeletingChild(null);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, activeFilters, activeGroup]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const shouldSearchChildren = searchQuery.length >= 2 || Object.keys(activeFilters).length > 0 || activeGroup;
      
      const [batchesRes, statsRes, detailedRes, childrenRes] = await Promise.all([
        campRegistrationApi.listBatches({ 
          page: 1, 
          page_size: 1000,
          search: searchQuery || undefined
        }),
        campRegistrationApi.getStatistics(),
        campRegistrationApi.getDetailedStatistics(),
        shouldSearchChildren
          ? campRegistrationApi.searchChildren(searchQuery || undefined, 1, 1000)
          : Promise.resolve({ data: { items: [], total: 0, page: 1, page_size: 20 } })
      ]);
      setBatches(batchesRes.data.items);
      setStatistics(statsRes.data);
      setDetailedStats(detailedRes.data);
      setMatchingChildren(childrenRes.data.items);
    } catch {
      toast.error("فشل في تحميل البيانات");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartBatch = async (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    setProcessingBatches(prev => new Set(prev).add(batchId));
    try {
      const isApiMethod = batch?.registration_method !== 'bot';
      await campRegistrationApi.startBatch(batchId, !isApiMethod);
      toast.success("تم بدء معالجة الدفعة");
      
      if (!isApiMethod) {
        try {
          const headless = batch?.headless_mode ? "true" : "false";
          const workers = batch?.delay_between_registrations || 1;
          const email = localStorage.getItem('default_email') || '';
          window.location.href = `djs-bot://start?headless=${headless}&workers=${workers}&email=${email}`;
          toast.info("تم طلب تشغيل البوت المحلي.");
        } catch {}
      } else {
        toast.info("تم تفعيل التسجيل المباشر (API) على الخادم.");
      }
      
      loadData();
    } catch {
      toast.error("فشل في بدء المعالجة");
    } finally {
      setProcessingBatches(prev => {
        const next = new Set(prev);
        next.delete(batchId);
        return next;
      });
    }
  };

  const handleDeleteBatch = async (batchId: string, batchStatus?: string) => {
    const isProcessing = batchStatus === "processing";
    const message = isProcessing 
      ? "⚠️ هذه الدفعة قيد المعالجة! هل أنت متأكد من الحذف الإجباري؟"
      : "هل أنت متأكد من حذف هذه الدفعة؟";
    if (!confirm(message)) return;
    try {
      await campRegistrationApi.deleteBatch(batchId, isProcessing);
      toast.success("تم حذف الدفعة");
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "فشل في الحذف");
    }
  };

  const communeOptions = detailedStats?.communes?.map((c: any) => ({
    label: c.name,
    value: c.name
  })) || [];

  const searchFilters = [
    {
      id: 'gender',
      label: 'الجنس',
      type: 'multiselect' as const,
      options: [
        { label: 'ذكر', value: 'MALE' },
        { label: 'أنثى', value: 'FEMALE' }
      ]
    },
    {
      id: 'age_group',
      label: 'الفئة العمرية',
      type: 'multiselect' as const,
      options: [
        { label: 'أقل من 6 سنوات', value: 'under_6' },
        { label: '6 - 14 سنة', value: '6-14' },
        { label: '15 - 17 سنة', value: '15-17' },
        { label: 'فوق 17 سنة', value: 'over_17' }
      ]
    },
    {
      id: 'residence_commune',
      label: 'بلدية الإقامة',
      type: 'multiselect' as const,
      options: communeOptions
    },
    {
      id: 'status',
      label: 'الحالة',
      type: 'multiselect' as const,
      options: [
        { label: 'في الانتظار', value: 'PENDING' },
        { label: 'قيد المعالجة', value: 'PROCESSING' },
        { label: 'ناجح', value: 'SUCCESS' },
        { label: 'فشل', value: 'FAILED' },
        { label: 'خطأ', value: 'ERROR' }
      ]
    }
  ];

  const searchGrouping = [
    { id: 'gender', label: 'الجنس' },
    { id: 'age_group', label: 'الفئة العمرية' },
    { id: 'residence_commune', label: 'بلدية الإقامة' },
    { id: 'status', label: 'الحالة' }
  ];

  // Process matchingChildren based on filters and groups
  const getAge = (birthDate: string) => {
    if (!birthDate) return 0;
    const today = new Date();
    const birthDateObj = new Date(birthDate);
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const month = today.getMonth() - birthDateObj.getMonth();
    if (month < 0 || (month === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    return age;
  };

  const getAgeGroup = (age: number) => {
    if (age < 6) return 'under_6';
    if (age <= 14) return '6-14';
    if (age <= 17) return '15-17';
    return 'over_17';
  };

  let processedChildren = matchingChildren || [];

  if (activeFilters.gender && activeFilters.gender.length > 0) {
    processedChildren = processedChildren.filter(c => 
      activeFilters.gender.includes(c.gender)
    );
  }

  if (activeFilters.age_group && activeFilters.age_group.length > 0) {
    processedChildren = processedChildren.filter(c => 
      activeFilters.age_group.includes(getAgeGroup(getAge(c.birth_date)))
    );
  }

  if (activeFilters.residence_commune && activeFilters.residence_commune.length > 0) {
    processedChildren = processedChildren.filter(c => 
      activeFilters.residence_commune.includes(c.residence_commune)
    );
  }
  
  if (activeFilters.status && activeFilters.status.length > 0) {
    processedChildren = processedChildren.filter(c => 
      activeFilters.status.includes(c.status)
    );
  }

  let groupedChildren: Record<string, CampRegistration[]> | null = null;
  if (activeGroup) {
      const grouped: Record<string, CampRegistration[]> = {};
      processedChildren.forEach(child => {
          let groupKey = "غير محدد";
          if (activeGroup === "gender") groupKey = child.gender || "غير محدد";
          else if (activeGroup === "age_group") groupKey = getAgeGroup(getAge(child.birth_date));
          else if (activeGroup === "residence_commune") {
              groupKey = child.residence_commune || "غير محدد";
          }
          else if (activeGroup === "status") {
              groupKey = CHILD_STATUS_CONFIG[child.status]?.label || child.status;
          }
          
          if (!grouped[groupKey]) grouped[groupKey] = [];
          grouped[groupKey].push(child);
      });
      groupedChildren = grouped;
  }

  const shouldShowChildren = searchQuery.length >= 2 || Object.keys(activeFilters).length > 0 || activeGroup !== null;

  const filteredBatches = batches;

  const handleExportExcel = async () => {
    if (!processedChildren || processedChildren.length === 0) {
      toast.error("لا يوجد بيانات لتصديرها");
      return;
    }
    try {
      const loadingToast = toast.loading("جاري تصدير الملف...");
      const childIds = processedChildren.map(c => c.id);
      await campRegistrationApi.exportToExcel(childIds, searchQuery || undefined);
      toast.dismiss(loadingToast);
      toast.success("تم التصدير بصيغة Excel بنجاح");
    } catch (error) {
      console.error("Excel export error:", error);
      toast.error("حدث خطأ أثناء إنشاء ملف Excel");
    }
  };

  return (
    <PermissionGuard module="camp_registration" action="view">
      <div className="space-y-6">
      <ControlPanel
        title="التسجيل في المخيم"
        hideBreadcrumbs
        searchPlaceholder="البحث باسم الطفل، الولي أو الدفعة..."
        searchQuery={searchQuery}
        onSearch={(q) => setSearchQuery(q)}
        searchFilters={searchFilters}
        searchGrouping={searchGrouping}
        activeGroupBy={activeGroup}
        onFilterChange={setActiveFilters}
        onGroupChange={setActiveGroup}
        onCreateClick={hasPermission('camp_registration', 'create') ? () => router.push('/camp-registration/create') : undefined}
        createLabel={hasPermission('camp_registration', 'create') ? "دفعة جديدة" : undefined}
        viewType={viewType}
        onViewChange={setViewType}
        actions={
          <div className="flex items-center gap-2">
            {hasPermission('camp_registration', 'export') && (
            <Button onClick={handleExportExcel} variant="outline" size="sm" className="text-green-700 border-green-200 bg-green-50 hover:bg-green-100 hover:text-green-800">
              <Download className="w-4 h-4 mr-2" />
              تصدير Excel
            </Button>
            )}
            {hasPermission('camp_allocation', 'view') && (
            <Link href="/camp-registration/allocation">
              <Button variant="default" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm border-0">
                <Brain className="w-4 h-4" />
                التوزيع الذكي
              </Button>
            </Link>
            )}
            <Button onClick={loadData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              تحديث
            </Button>
          </div>
        }
      />

      {/* Duplicates Alert */}
      {duplicateChildren.length > 0 && hasPermission('camp_registration', 'manage_duplicates') && (() => {
        const uniqueDuplicatesCount = new Set(duplicateChildren.map(c => `${c.child_first_name?.trim()}_${c.child_last_name?.trim()}_${c.parent_first_name?.trim()}_${c.parent_last_name?.trim()}`.toLowerCase())).size;
        return (
        <div className="bg-orange-50/80 backdrop-blur-md border border-orange-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 mt-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-orange-100 rounded-xl text-orange-600 shrink-0 shadow-inner">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-orange-950 text-base">تنبيه: يوجد تسجيلات مكررة!</h3>
              <p className="text-sm text-orange-900/80 mt-1">
                لقد وجدنا <span className="font-bold bg-orange-200 px-2 py-0.5 rounded-md">{uniqueDuplicatesCount}</span> مسجلاً مكرراً (أطفال تم تسجيلهم أكثر من مرة). 
                يُرجى مراجعتها وحذف التكرارات الوهمية لضمان صحة الإحصائيات وعدالة التوزيع.
              </p>
            </div>
          </div>
          {hasPermission('camp_registration', 'manage_duplicates') && (
          <Button onClick={() => setIsDuplicatesModalOpen(true)} variant="outline" className="w-full md:w-auto shrink-0 bg-white border-orange-200 text-orange-700 hover:bg-orange-100 hover:text-orange-800 rounded-xl h-10 font-bold shadow-sm">
            <ListFilter className="h-4 w-4 ml-2" />
            استعراض المكررين للتنظيف
          </Button>
          )}
        </div>
        );
      })()}

      {/* ─── Statistics Bar ──────────────────────────────────────────────── */}
      {statistics && (
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden divide-y divide-border/40 md:divide-y-0 md:flex md:flex-wrap">
          {/* Overall metrics */}
          <div className="flex flex-wrap md:flex-nowrap divide-x-0 md:divide-x divide-border/40">
            <StatBlock
              icon={Layers}
              label="إجمالي الدفعات"
              value={statistics.total_batches}
            />
            <StatBlock
              icon={Users}
              label="إجمالي التسجيلات"
              value={statistics.total_registrations.toLocaleString('ar-DZ')}
            />
            <StatBlock
              icon={CheckCircle}
              label="ناجح"
              value={statistics.successful_registrations.toLocaleString('ar-DZ')}
              sub={`من ${statistics.total_registrations.toLocaleString('ar-DZ')}`}
            />
            <StatBlock
              icon={TrendingUp}
              label="نسبة النجاح"
              value={`${statistics.success_rate.toFixed(1)}%`}
              trend={statistics.success_rate >= 80 ? 'up' : statistics.success_rate >= 50 ? undefined : 'down'}
            />
          </div>
          {/* Timeline metrics */}
          <div className="flex flex-wrap md:flex-nowrap divide-x-0 md:divide-x divide-border/40 bg-muted/20">
            <StatBlock
              icon={Activity}
              label="تسجيلات اليوم"
              value={statistics.registrations_today}
            />
            <StatBlock
              icon={CalendarDays}
              label="هذا الأسبوع"
              value={statistics.registrations_this_week}
            />
            <StatBlock
              icon={BarChart3}
              label="هذا الشهر"
              value={statistics.registrations_this_month}
            />
          </div>
        </div>
      )}

      {/* ─── Detailed Statistics ──────────────────────────────────────────── */}
      {detailedStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Gender Distribution */}
          <Card className="rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="h-3.5 w-3.5" />
                </div>
                توزيع حسب الجنس
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {(() => {
                const male = (detailedStats.gender?.['MALE'] || 0);
                const female = (detailedStats.gender?.['FEMALE'] || 0);
                return (
                  <SegmentedBar
                    segments={[
                      { label: 'ذكور', count: male, color: 'bg-sky-500', textColor: 'text-sky-600' },
                      { label: 'إناث', count: female, color: 'bg-rose-400', textColor: 'text-rose-600' },
                    ]}
                  />
                );
              })()}
            </CardContent>
          </Card>

          {/* Age Groups */}
          <Card className="rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <GraduationCap className="h-3.5 w-3.5" />
                </div>
                توزيع حسب الفئة العمرية
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {(() => {
                const ag = detailedStats.age_groups || {};
                const items = [
                  { label: 'أقل من 6', count: ag['under_6'] || 0, color: 'bg-cyan-500', textColor: 'text-cyan-600' },
                  { label: '6 - 14 سنة', count: ag['6-14'] || 0, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
                  { label: '15 - 17 سنة', count: ag['15-17'] || 0, color: 'bg-orange-500', textColor: 'text-orange-600' },
                  { label: 'فوق 17 سنة', count: ag['over_17'] || 0, color: 'bg-violet-500', textColor: 'text-violet-600' },
                ];
                const total = items.reduce((a, i) => a + i.count, 0);
                if (total === 0) return <div className="text-xs text-muted-foreground py-2">لا توجد بيانات</div>;
                return (
                  <div className="space-y-3">
                    {/* Stacked mini bar */}
                    <div className="flex h-4 w-full overflow-hidden rounded-md bg-muted">
                      {items.map((item, i) => (
                        item.count > 0 && (
                          <div
                            key={i}
                            className={item.color}
                            style={{ width: `${(item.count / total) * 100}%` }}
                          />
                        )
                      ))}
                    </div>
                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                      {items.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className={cn("h-2 w-2 rounded-full shrink-0", item.color)} />
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className={cn("font-semibold mr-auto", item.textColor)}>
                            {item.count}
                            <span className="text-muted-foreground font-normal mr-1">
                              ({total > 0 ? ((item.count / total) * 100).toFixed(1) : 0}%)
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Communes */}
          <Card className="rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Landmark className="h-3.5 w-3.5" />
                </div>
                توزيع حسب بلدية الإقامة
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {(() => {
                const communes = detailedStats.communes || [];
                const max = Math.max(...communes.map((c: any) => c.count), 1);
                return (
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar -mr-2 pr-2">
                    {communes.length === 0 ? (
                      <div className="text-xs text-muted-foreground py-2">لا توجد بيانات</div>
                    ) : (
                      communes
                        .sort((a: any, b: any) => b.count - a.count)
                        .map((c: any, i: number) => (
                          <CommuneBar key={i} name={c.name} count={c.count} max={max} />
                        ))
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Children / Batches ───────────────────────────────────────────── */}
      {shouldShowChildren ? (
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-3.5 w-3.5" />
              </div>
              الأطفال
              <Badge variant="secondary" className="mr-auto text-xs">
                {processedChildren.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-3" />
                <p className="text-sm">جاري التحميل...</p>
              </div>
            ) : processedChildren.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">لا يوجد نتائج مطابقة للبحث أو التصفية</p>
              </div>
            ) : (
              <div className="space-y-5">
                {groupedChildren ? (
                  Object.entries(groupedChildren).map(([groupName, childrenInGroup]) => (
                    <GroupSection 
                      key={groupName}
                      groupName={groupName}
                      childrenInGroup={childrenInGroup}
                      viewType={viewType}
                      batches={batches}
                    />
                  ))
                ) : (
                  viewType === "list" ? (
                    <ChildrenListView childrenItems={processedChildren} batches={batches} />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {processedChildren.map((child) => <ChildCard key={child.id} child={child} batches={batches} />)}
                    </div>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
        {/* ─── Batches List ────────────────────────────────────────────────── */}
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {viewType === "kanban" ? <LayoutGrid className="h-3.5 w-3.5" /> : <LayoutList className="h-3.5 w-3.5" />}
              </div>
              {viewType === "kanban" ? "بطاقات الدفعات" : "قائمة الدفعات"}
              <Badge variant="secondary" className="mr-auto text-xs">
                {filteredBatches.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              viewType === "kanban" ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="h-10 w-10 animate-spin mb-3" />
                  <p className="text-sm">جاري التحميل...</p>
                </div>
              ) : (
                <div className="animate-pulse" role="status" aria-label="جاري التحميل">
                  <div className="p-4">
                    <div className="h-6 w-36 bg-muted rounded mb-4" />
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-4 h-12">
                          <div className="h-4 w-40 bg-muted rounded" />
                          <div className="h-5 w-20 bg-muted rounded-full" />
                          <div className="h-4 w-16 bg-muted rounded" />
                          <div className="h-4 w-16 bg-muted rounded" />
                          <div className="h-4 w-16 bg-muted rounded" />
                          <div className="h-4 w-28 bg-muted rounded mr-auto" />
                          <div className="h-8 w-20 bg-muted rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            ) : filteredBatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                  <Layers className="h-8 w-8 opacity-40" />
                </div>
                <p className="font-semibold mb-1">لا توجد دفعات</p>
                <p className="text-sm">قم بإنشاء دفعة جديدة للبدء في تسجيل الأطفال</p>
              </div>
            ) : viewType === "kanban" ? (
              <div className="space-y-3">
                {filteredBatches.map((batch) => {
                  const statusKey = Object.keys(STATUS_CONFIG).find(
                    k => k === batch.status || k === batch.status?.toUpperCase()
                  ) || 'PENDING';
                  const statusConfig = STATUS_CONFIG[statusKey];
                  const StatusIcon = statusConfig.icon;
                  const isProcessing = processingBatches.has(batch.id);
                  const progress = batch.total_children > 0
                    ? Math.round((batch.processed_count / batch.total_children) * 100)
                    : 0;

                  const statusBg: Record<string, string> = {
                    PENDING: 'bg-amber-50/60 dark:bg-amber-950/10',
                    PROCESSING: 'bg-blue-50/60 dark:bg-blue-950/10',
                    COMPLETED: 'bg-green-50/60 dark:bg-green-950/10',
                    FAILED: 'bg-red-50/60 dark:bg-red-950/10',
                  };

                  return (
                    <div
                      key={batch.id}
                      className={cn(
                        'group relative rounded-xl border border-border/60 p-4 md:p-5 transition-all duration-200 hover:shadow-md hover:border-border',
                        statusBg[batch.status?.toUpperCase()] || statusBg.PENDING
                      )}
                    >
                      {/* Decorative top gradient line */}
                      <div
                        className="absolute top-0 left-3 right-3 h-0.5 rounded-full opacity-60"
                        style={{
                          background: batch.status === 'completed'
                            ? 'linear-gradient(90deg, var(--primary), var(--primary)/40%)'
                            : batch.status === 'processing'
                            ? 'linear-gradient(90deg, #3b82f6, #60a5fa)'
                            : batch.status === 'failed' || batch.status === 'error'
                            ? 'linear-gradient(90deg, #ef4444, #f87171)'
                            : 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                        }}
                      />

                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-base leading-tight truncate">{batch.name}</h3>
                                <Badge className={cn('text-[10px] px-2 py-0 shrink-0', statusConfig.color)}>
                                  <StatusIcon className="h-3 w-3 ml-1" />
                                  {statusConfig.label}
                                </Badge>
                              </div>
                              {batch.description && (
                                <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{batch.description}</p>
                              )}
                            </div>
                          </div>

                          {/* Stats row */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="h-3.5 w-3.5" />
                              {batch.total_children} طفل
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                              <CheckCircle className="h-3.5 w-3.5" />
                              {batch.success_count} ناجح
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-red-500 font-medium">
                              <XCircle className="h-3.5 w-3.5" />
                              {batch.failed_count} فاشل
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Activity className="h-3.5 w-3.5" />
                              {batch.processed_count}/{batch.total_children} معالج
                            </span>
                          </div>

                          {/* Progress bar */}
                          {batch.total_children > 0 && (
                            <div className="mt-3 flex items-center gap-3">
                              <AnimatedProgress value={progress} className="flex-1" />
                              <span className="text-xs font-semibold tabular-nums text-muted-foreground w-10 text-right">
                                {progress}%
                              </span>
                            </div>
                          )}

                          <div className="mt-2 text-[10px] text-muted-foreground/60">
                            {new Date(batch.created_at).toLocaleString('ar-DZ')}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {hasPermission('camp_registration', 'process') && ["pending", "error", "failed"].includes(batch.status?.toLowerCase() ?? "") && (
                            <Button
                              size="sm"
                              onClick={() => handleStartBatch(batch.id)}
                              disabled={isProcessing}
                              variant={["error", "failed"].includes(batch.status?.toLowerCase() ?? "") ? "destructive" : "default"}
                              className="h-9 px-3"
                            >
                              {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : ["error", "failed"].includes(batch.status?.toLowerCase() ?? "") ? (
                                <RefreshCw className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                          )}

                          <Link href={`/camp-registration/${batch.id}`}>
                            <Button size="sm" variant="outline" className="h-9 px-3">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>

                          {hasPermission('camp_registration', 'delete') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteBatch(batch.id, batch.status)}
                            className="h-9 px-3 text-muted-foreground hover:text-red-600 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
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
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-right font-semibold text-xs">اسم الدفعة</TableHead>
                      <TableHead className="text-right font-semibold text-xs">الحالة</TableHead>
                      <TableHead className="text-right font-semibold text-xs">الأطفال</TableHead>
                      <TableHead className="text-right font-semibold text-xs">ناجح</TableHead>
                      <TableHead className="text-right font-semibold text-xs">فاشل</TableHead>
                      <TableHead className="text-right font-semibold text-xs">تاريخ الإنشاء</TableHead>
                      <TableHead className="text-right font-semibold text-xs">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBatches.map((batch) => {
                      const statusKey = Object.keys(STATUS_CONFIG).find(
                        k => k === batch.status || k === batch.status?.toUpperCase()
                      ) || 'PENDING';
                      const statusConfig = STATUS_CONFIG[statusKey];
                      const isProcessing = processingBatches.has(batch.id);
                      return (
                        <TableRow key={batch.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{batch.name}</p>
                              {batch.description && (
                                <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{batch.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn('text-[11px] px-2 py-0.5', statusConfig.color)}>
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{batch.total_children}</TableCell>
                          <TableCell className="text-sm text-emerald-600 font-medium">{batch.success_count}</TableCell>
                          <TableCell className="text-sm text-red-500 font-medium">{batch.failed_count}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(batch.created_at).toLocaleString('ar-DZ')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {hasPermission('camp_registration', 'process') && ["pending", "error", "failed"].includes(batch.status?.toLowerCase() ?? "") && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStartBatch(batch.id)}
                                  disabled={isProcessing}
                                  variant={["error", "failed"].includes(batch.status?.toLowerCase() ?? "") ? "destructive" : "default"}
                                  className="h-8 w-8 p-0"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : ["error", "failed"].includes(batch.status?.toLowerCase() ?? "") ? (
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  ) : (
                                    <Play className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              )}
                              <Link href={`/camp-registration/${batch.id}`}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                              {hasPermission('camp_registration', 'delete') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteBatch(batch.id, batch.status)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        </>
      )}
      
      {/* Duplicates Clean-up Dialog */}
      <Dialog open={isDuplicatesModalOpen} onOpenChange={setIsDuplicatesModalOpen}>
        <DialogContent className="max-w-4xl sm:max-w-4xl md:max-w-5xl lg:max-w-6xl p-0 overflow-hidden bg-white/90 backdrop-blur-xl border border-orange-100/50 shadow-2xl rounded-3xl" dir="rtl">
          <DialogHeader className="p-6 pb-4 border-b border-orange-100/50 bg-orange-50/50">
            <DialogTitle className="text-xl font-bold text-orange-950 flex items-center gap-3">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-xl shadow-inner">
                <AlertTriangle className="h-5 w-5" />
              </div>
              تنظيف التسجيلات المكررة
            </DialogTitle>
            <DialogDescription className="text-orange-900/60 font-medium">
              هذه القائمة تحتوي على الأطفال الذين تم تسجيلهم أكثر من مرة (نفس اسم الطفل والولي). يُرجى حذف التكرار للإبقاء على تسجيل واحد فقط لكل طفل.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 bg-white/50 min-h-[300px] max-h-[60vh] flex flex-col">
            {duplicateChildren.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                <CheckCircle className="h-12 w-12 text-emerald-500 mb-3 opacity-80" />
                <h3 className="font-bold text-emerald-950 text-lg">قاعدة البيانات نظيفة!</h3>
                <p className="text-emerald-900/60 mt-1">لا يوجد أي تسجيلات مكررة حالياً.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-orange-100/80 bg-white/60 overflow-hidden shadow-inner flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1" dir="rtl">
                  <Table>
                    <TableHeader className="bg-orange-50/80 backdrop-blur-sm sticky top-0 z-10">
                      <TableRow className="border-orange-100/50 hover:bg-transparent">
                        <TableHead className="w-[60px] font-bold text-orange-900 text-center py-4">#</TableHead>
                        <TableHead className="font-bold text-orange-900 text-right py-4 whitespace-nowrap">الاسم الكامل</TableHead>
                        <TableHead className="font-bold text-orange-900 text-right py-4 whitespace-nowrap">الولي</TableHead>
                        <TableHead className="font-bold text-orange-900 text-right py-4 whitespace-nowrap">الجنس</TableHead>
                        <TableHead className="font-bold text-orange-900 text-right py-4 whitespace-nowrap">البلدية</TableHead>
                        <TableHead className="font-bold text-orange-900 text-right py-4 whitespace-nowrap">الدفعة</TableHead>
                        <TableHead className="font-bold text-orange-900 text-right py-4 whitespace-nowrap">الحالة</TableHead>
                        <TableHead className="font-bold text-orange-900 text-left py-4 whitespace-nowrap">إجراء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {duplicateChildren.map((child: any, idx: number) => (
                        <TableRow key={child.id} className="transition-colors hover:bg-orange-50/80 border-b border-orange-50/50">
                          <TableCell className="text-center font-mono text-orange-900/50 text-sm font-bold py-3">{idx + 1}</TableCell>
                          <TableCell className="font-bold text-orange-950 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                                <AvatarFallback className="bg-orange-100 text-orange-700 font-bold">
                                  {child.child_first_name?.substring(0, 1) || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <span>{child.child_first_name} {child.child_last_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-orange-900/80 py-3 whitespace-nowrap font-medium">
                            {child.parent_first_name} {child.parent_last_name}
                          </TableCell>
                          <TableCell className="py-3 whitespace-nowrap text-orange-900/80 font-medium">
                            {child.gender === 'MALE' || child.gender === 'ذكر' ? 'ذكر' : child.gender === 'FEMALE' || child.gender === 'أنثى' ? 'أنثى' : child.gender}
                          </TableCell>
                          <TableCell className="font-bold text-orange-900/80 py-3 whitespace-nowrap">
                            <span className="flex items-center gap-2 bg-white/50 px-2.5 py-1 rounded-lg w-fit border border-orange-100/50">
                              <MapPin className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                              <span className="truncate max-w-[150px] block">{child.residence_commune || '—'}</span>
                            </span>
                          </TableCell>
                          <TableCell className="py-3 whitespace-nowrap text-orange-900/80 font-medium">
                            {batches.find(b => b.id === child.batch_id)?.name || '—'}
                          </TableCell>
                          <TableCell className="py-3 whitespace-nowrap">
                            {child.status === 'success' ? (
                              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200">مكتمل</Badge>
                            ) : child.status === 'failed' || child.status === 'error' ? (
                              <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200">فشل</Badge>
                            ) : child.status === 'processing' ? (
                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200">يعالج</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200">قيد الانتظار</Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-3 whitespace-nowrap text-left">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/camp-registration/child/${child.id}`}>
                                <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-orange-200 text-orange-700 hover:bg-orange-100" title="تفاصيل الطفل">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              {hasPermission('camp_registration', 'delete') && (
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={isDeletingChild === child.id}
                                onClick={() => handleDeleteDuplicate(child.batch_id, child.id)}
                                className="h-8 rounded-lg shadow-sm"
                              >
                                {isDeletingChild === child.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 ml-1.5" />}
                                حذف التكرار
                              </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
          </div>
          <div className="p-4 bg-orange-50/30 border-t border-orange-100/50 flex justify-end">
            <Button onClick={() => setIsDuplicatesModalOpen(false)} variant="outline" className="border-orange-200 text-orange-800 rounded-xl px-6 font-bold hover:bg-orange-100">
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </PermissionGuard>
              );
}