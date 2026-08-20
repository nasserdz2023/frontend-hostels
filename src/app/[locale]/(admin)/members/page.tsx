'use client';

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus, Trash2, RefreshCw, Users, Search, Loader2, Eye, 
  Download, CreditCard, ChevronDown, ChevronUp, UserCheck, UserX, UserMinus,
  LayoutList, LayoutGrid
} from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { membersApi, Member, MemberStatistics } from "@/lib/api/members";
import { ControlPanel } from "@/components/odoo/ControlPanel";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ImportFromCampDialog } from "@/components/members/ImportFromCampDialog";
import { SmartBulkImportDialog } from "@/components/members/SmartBulkImportDialog";
import { MagicalGenerationDialog } from "@/components/members/MagicalGenerationDialog";
import { CreateBatchDialog } from "@/components/members/CreateBatchDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { getApiBaseUrl } from "@/lib/api/client";
import { AddToCampTripModal } from "./components/AddToCampTripModal";

import { PermissionGuard } from "@/hooks/useRequirePermission";

/** تحويل مسار MinIO النسبي إلى URL كامل عبر الـ backend proxy */
function getStorageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = getApiBaseUrl().replace('/api/v1', '');
  return `${base}/storage/${path}`;
}

/** الحصول على رابط الصورة المصغرة */
function getThumbnailUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  
  // إذا كانت الصورة مخزنة في النظام، نحاول الوصول للمصغرة
  // النمط: path/to/image.ext -> path/to/image_thumb.webp
  const dotIndex = path.lastIndexOf('.');
  if (dotIndex !== -1) {
    const basePath = path.substring(0, dotIndex);
    return getStorageUrl(`${basePath}_thumb.webp`);
  }
  return getStorageUrl(path);
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "نشط", color: "bg-green-100 text-green-800" },
  EXPIRED: { label: "منتهي", color: "bg-gray-100 text-gray-800" },
  CANCELLED: { label: "ملغي", color: "bg-red-100 text-red-800" },
};

export default function MembersDashboard() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [statistics, setStatistics] = useState<MemberStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<any>({
    status: null,
    institution: null,
    year: null,
    commune: null,
    daira: null,
    gender: null,
    age_group: null,
    youth_connect: null,
  });
  const [groupBy, setGroupBy] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const isFetching = useRef(false);

  // References
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selectedMembers, setSelectedMembers] = useState<Map<string, Member>>(new Map());
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [isCampTripModalOpen, setIsCampTripModalOpen] = useState(false);
  const [viewType, setViewType] = useState<"list" | "kanban">("kanban");

  // Group members when groupBy is set
  const groupedMembers = useMemo(() => {
    if (!groupBy) return null;

    const groups: Record<string, { name: string, items: Member[] }> = {};

    members.forEach(member => {
      let groupKey = "other";
      let groupName = "غير محدد";

      if (groupBy === "institution") {
        groupKey = member.institution || "no-institution";
        groupName = member.institution || "بدون مؤسسة";
      } else if (groupBy === "commune") {
        groupKey = member.residence_commune || "no-commune";
        groupName = member.residence_commune || "بدون بلدية";
      } else if (groupBy === "gender") {
        groupKey = member.gender || "no-gender";
        groupName = member.gender || "غير محدد";
      } else if (groupBy === "status") {
        groupKey = member.membership_status || "ACTIVE";
        const s = (member.membership_status || '').toLowerCase();
        groupName = s === 'active' ? 'نشط' : s === 'expired' ? 'منتهي' : 'ملغي';
      } else if (groupBy === "youth_connect") {
        groupKey = (member as any).youth_connect_status || "not-registered";
        groupName = (member as any).youth_connect_status || "غير مسجل";
      }

      if (!groups[groupKey]) {
        groups[groupKey] = { name: groupName, items: [] };
      }
      groups[groupKey].items.push(member);
    });

    return groups;
  }, [members, groupBy]);

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(true);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filters, groupBy]);

  const loadInitialData = async () => {
    try {
      const [statsRes, instRes, commRes] = await Promise.all([
        membersApi.getStatistics(),
        membersApi.groupBy("institution"),
        membersApi.groupBy("commune"),
      ]);
      setStatistics(statsRes.data);
      setInstitutions(instRes.data.items.map(i => ({ label: i.label || i.key, value: i.key })));
      setMunicipalities(commRes.data.items.map(i => ({ label: i.label || i.key, value: i.key })));
    } catch (error) {
      console.error("Failed to load statistics", error);
    }
  };

  const loadData = async (reset = false) => {
    if (isFetching.current && !reset) return;
    
    isFetching.current = true;
    if (reset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const page = reset ? 1 : currentPage;
      const size = groupBy ? 1000 : 20; // Fetch all if grouping, else paginate
      
      const res = await membersApi.list({
        search: searchQuery || undefined,
        status: filters.status?.[0] as any || undefined,
        institution: filters.institution?.[0] || undefined,
        year: filters.year?.[0] ? parseInt(filters.year[0]) : undefined,
        commune: filters.commune?.[0] || undefined,
        daira: filters.daira?.[0] || undefined,
        gender: filters.gender?.[0] || undefined,
        age_group: filters.age_group?.[0] || undefined,
        youth_connect: filters.youth_connect?.[0] === "true" ? true : filters.youth_connect?.[0] === "false" ? false : undefined,
        page: page,
        size: size,
      });
      
      const newItems = res.data.items || [];
      
      if (reset) {
        setMembers(newItems);
        setCurrentPage(2);
      } else {
        setMembers(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const uniqueNewItems = newItems.filter(m => !existingIds.has(m.id));
          return [...prev, ...uniqueNewItems];
        });
        setCurrentPage(prev => prev + 1);
      }
      
      setTotalItems(res.data.total || 0);
      setHasMore(newItems.length === size); 
      
    } catch {
      toast.error("فشل في تحميل البيانات");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      isFetching.current = false;
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100 && !isFetching.current && hasMore) {
      loadData(false);
    }
  };

  const toggleSelection = (member: Member) => {
    setSelectedMembers(prev => {
      const newMap = new Map(prev);
      if (newMap.has(member.id)) newMap.delete(member.id);
      else newMap.set(member.id, member);
      return newMap;
    });
  };

  const selectAllGroup = (groupMembers: Member[]) => {
    setSelectedMembers(prev => {
      const newMap = new Map(prev);
      const allSelected = groupMembers.every(m => newMap.has(m.id));
      if (allSelected) {
        groupMembers.forEach(m => newMap.delete(m.id));
      } else {
        groupMembers.forEach(m => newMap.set(m.id, m));
      }
      return newMap;
    });
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنخرط؟")) return;
    try {
      await membersApi.delete(memberId);
      toast.success("تم حذف المنخرط بنجاح");
      loadData(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "فشل في الحذف");
    }
  };

  const handleExport = async () => {
    try {
      const blob = await membersApi.export({ 
        status: filters.status?.[0] as any || undefined,
        institution: filters.institution?.[0] || undefined,
        year: filters.year?.[0] ? parseInt(filters.year[0]) : undefined,
        created_period: filters.created_period?.[0] || undefined,
        ids: selectedMembers.size > 0 ? Array.from(selectedMembers).join(',') : undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `members_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("تم تصدير البيانات بنجاح");
    } catch {
      toast.error("فشل في التصدير");
    }
  };

  const searchFilters = [
    {
      id: 'status',
      label: 'الحالة',
      type: 'multiselect' as const,
      options: [
        { label: 'نشط', value: 'ACTIVE' },
        { label: 'منتهي', value: 'EXPIRED' },
        { label: 'ملغي', value: 'CANCELLED' },
      ]
    },
    {
      id: 'institution',
      label: 'المؤسسة',
      type: 'multiselect' as const,
      options: institutions
    },
    {
      id: 'commune',
      label: 'البلدية',
      type: 'multiselect' as const,
      options: municipalities
    },
    {
      id: 'gender',
      label: 'الجنس',
      type: 'multiselect' as const,
      options: [
        { label: 'ذكر', value: 'MALE' },
        { label: 'أنثى', value: 'FEMALE' },
      ]
    },
    {
      id: 'age_group',
      label: 'الفئة العمرية',
      type: 'multiselect' as const,
      options: [
        { label: 'طفل (أقل من 12)', value: 'child' },
        { label: 'مراهق (12-18)', value: 'teen' },
        { label: 'شاب (18-35)', value: 'youth' },
        { label: 'بالغ (أكثر من 35)', value: 'adult' },
      ]
    },
    {
      id: 'youth_connect',
      label: 'المنصة الوزارية',
      type: 'multiselect' as const,
      options: [
        { label: 'مسجل', value: 'true' },
        { label: 'غير مسجل', value: 'false' },
      ]
    },
    {
      id: 'created_period',
      label: 'تاريخ التسجيل',
      type: 'multiselect' as const,
      options: [
        { label: 'اخر ساعة', value: 'last_hour' },
        { label: 'اليوم', value: 'today' },
        { label: 'الامس', value: 'yesterday' },
        { label: 'هذا الاسبوع', value: 'this_week' },
        { label: 'هذا الشهر', value: 'this_month' },
        { label: 'هذا العام', value: 'this_year' },
      ]
    }
  ];

  const groupByOptions = [
    { id: "institution", label: "المؤسسة" },
    { id: "commune", label: "البلدية" },
    { id: "daira", label: "الدائرة" },
    { id: "gender", label: "الجنس" },
    { id: "age_group", label: "الفئة العمرية" },
    { id: "year", label: "سنة الانخراط" },
    { id: "status", label: "وضعية الانخراط" },
    { id: "youth_connect", label: "المنصة الوزارية" },
  ];


  return (
    <PermissionGuard module="members" action="view">
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-slate-50/50">
      <ControlPanel
        title="المنخرطين"
        hideBreadcrumbs
        searchPlaceholder="البحث بالاسم أو رقم الانخراط أو رقم التعريف..."
        searchQuery={searchQuery}
        onSearch={(q) => {
          setSearchQuery(q);
        }}
        searchFilters={searchFilters}
        searchGrouping={groupByOptions}
        activeGroupBy={groupBy}
        onGroupChange={setGroupBy}
        onFilterChange={(f) => {
          setFilters(f);
        }}
        onCreateClick={() => router.push('/members/create')}
        createLabel="منخرط جديد"
        viewType={viewType}
        onViewChange={setViewType}
        actions={
          <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
            {selectedMembers.size > 0 && (
              <>
                <Button 
                  onClick={() => setIsBatchDialogOpen(true)} 
                  variant="default" 
                  className="bg-blue-600 hover:bg-blue-700 shadow-sm"
                >
                  إرسال للوزارة ({selectedMembers.size})
                </Button>
                <Button 
                  onClick={() => setIsCampTripModalOpen(true)} 
                  variant="outline" 
                  className="shadow-sm"
                >
                  إضافة لدفعة المخيم ({selectedMembers.size})
                </Button>
              </>
            )}
            <MagicalGenerationDialog onSuccess={() => loadData(true)} />
            <SmartBulkImportDialog onSuccess={() => loadData(true)} />
            <ImportFromCampDialog onSuccess={() => loadData(true)} />
            <Button onClick={() => loadData(true)} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              تحديث
            </Button>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              تصدير
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6" onScroll={handleScroll}>
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Stats Bar — unified inline stat blocks instead of hero-metric cards */}
          {statistics && !groupBy && (
            <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 divide-x rtl:divide-x-reverse divide-border bg-card rounded-xl border shadow-sm overflow-hidden">
              <StatBlock
                label="إجمالي المنخرطين"
                value={statistics.total_members}
                icon={Users}
                color="text-primary"
              />
              <StatBlock
                label="نشط"
                value={statistics.active_members}
                icon={UserCheck}
                color="text-green-600"
              />
              <StatBlock
                label="منتهي"
                value={statistics.expired_members}
                icon={UserMinus}
                color="text-gray-500"
              />
              <StatBlock
                label="ملغي"
                value={statistics.cancelled_members}
                icon={UserX}
                color="text-red-500"
              />
            </div>
          )}

          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                {viewType === "kanban" ? <LayoutGrid className="w-5 h-5 text-muted-foreground" /> : <LayoutList className="w-5 h-5 text-muted-foreground" />}
                {viewType === "kanban" ? "بطاقات المنخرطين" : "قائمة المنخرطين"}
                <span className="text-muted-foreground text-base font-normal">({totalItems})</span>
              </h2>
            </div>
            
            {isLoading ? (
              viewType === "kanban" ? (
                <div className="space-y-3" role="status" aria-label="جاري التحميل">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl border bg-card overflow-hidden animate-pulse">
                      <div className="h-1 w-full bg-gradient-to-r from-muted/60 via-muted/30 to-transparent" />
                      <div className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="w-5 h-5 rounded bg-muted shrink-0" />
                          <div className="w-12 h-12 rounded-full bg-muted shrink-0" />
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="h-5 w-40 bg-muted rounded" />
                              <div className="h-5 w-16 bg-muted rounded-full" />
                            </div>
                            <div className="flex gap-4">
                              <div className="h-4 w-24 bg-muted rounded" />
                              <div className="h-4 w-28 bg-muted rounded" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <div className="h-9 w-9 rounded-full bg-muted" />
                            <div className="h-9 w-9 rounded-full bg-muted" />
                            <div className="h-9 w-9 rounded-full bg-muted" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border bg-card overflow-hidden animate-pulse" role="status" aria-label="جاري التحميل">
                  <div className="p-6">
                    <div className="h-6 w-48 bg-muted rounded mb-4" />
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4 h-14">
                          <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                          <div className="h-4 w-36 bg-muted rounded" />
                          <div className="h-4 w-24 bg-muted rounded" />
                          <div className="h-4 w-28 bg-muted rounded" />
                          <div className="h-5 w-16 bg-muted rounded-full" />
                          <div className="h-4 w-20 bg-muted rounded" />
                          <div className="h-8 w-20 bg-muted rounded mr-auto" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed border-muted-300">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-5">
                  <Search className="w-7 h-7 text-muted-foreground/60" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">لم نعثر على منخرطين</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                  {searchQuery || Object.values(filters).some(f => f !== null)
                    ? "حاول تعديل معايير البحث أو إعادة تعيين الفلاتر"
                    : "لم يتم تسجيل أي منخرطين بعد. ابدأ بإضافة منخرط جديد."}
                </p>
                <div className="flex items-center gap-3">
                  {(searchQuery || Object.values(filters).some(f => f !== null)) && (
                    <Button onClick={() => {
                      setSearchQuery("");
                      setFilters({ status: null, institution: null, year: null, commune: null, daira: null, gender: null, age_group: null, youth_connect: null });
                    }} variant="outline" size="sm">
                      <RefreshCw className="w-3.5 h-3.5 ml-2" />
                      إعادة تعيين
                    </Button>
                  )}
                  <Button onClick={() => router.push('/members/create')} size="sm">
                    <Plus className="w-3.5 h-3.5 ml-2" />
                    إضافة منخرط
                  </Button>
                </div>
              </div>
            ) : groupBy && groupedMembers ? (
                <div className="space-y-4">
                    {Object.entries(groupedMembers).map(([groupKey, group]) => {
                        const isCollapsed = collapsedGroups.has(groupKey);
                        return (
                            <div key={groupKey} className="rounded-xl border bg-card shadow-sm overflow-hidden transition-all">
                                {/* Group Header */}
                                <div className="w-full flex items-center border-b">
                                    <button
                                        onClick={() => toggleGroup(groupKey)}
                                        className="flex-1 flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                                                <Users className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="text-right">
                                                <h3 className="text-base font-bold text-foreground">
                                                    {group.name}
                                                </h3>
                                                <p className="text-xs text-muted-foreground">
                                                    {group.items.length} منخرط
                                                </p>
                                            </div>
                                        </div>
                                        {isCollapsed ? (
                                            <ChevronDown className="h-5 w-5 text-muted-foreground/60" />
                                        ) : (
                                            <ChevronUp className="h-5 w-5 text-muted-foreground/60" />
                                        )}
                                    </button>
                                    <div className="px-4 flex items-center border-r border-border" onClick={e => e.stopPropagation()}>
                                        <Checkbox 
                                          checked={group.items.length > 0 && group.items.every(m => selectedMembers.has(m.id))}
                                          onCheckedChange={() => selectAllGroup(group.items)}
                                          title="تحديد كل المجموعة"
                                        />
                                    </div>
                                </div>

                                {/* Group Content */}
                                {!isCollapsed && (
                                    <div className="p-4 space-y-3 bg-muted/10">
                                        {group.items.map((member) => (
                                            <MemberCard 
                                                key={member.id} 
                                                member={member}
                                                isSelected={selectedMembers.has(member.id)}
                                                onSelect={() => toggleSelection(member)}
                                                onDelete={() => handleDeleteMember(member.id)} 
                                                onView={() => router.push(`/members/${member.id}`)}
                                                onCard={() => router.push(`/members/${member.id}/card`)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : viewType === "kanban" ? (
              <div className="grid grid-cols-1 gap-4">
                {members.map((member) => (
                  <MemberCard 
                    key={member.id} 
                    member={member}
                    isSelected={selectedMembers.has(member.id)}
                    onSelect={() => toggleSelection(member)}
                    onDelete={() => handleDeleteMember(member.id)} 
                    onView={() => router.push(`/members/${member.id}`)}
                    onCard={() => router.push(`/members/${member.id}/card`)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-right font-semibold text-xs">المنخرط</TableHead>
                      <TableHead className="text-right font-semibold text-xs">رقم الانخراط</TableHead>
                      <TableHead className="text-right font-semibold text-xs">المؤسسة</TableHead>
                      <TableHead className="text-right font-semibold text-xs">البلديّة</TableHead>
                      <TableHead className="text-right font-semibold text-xs">الحالة</TableHead>
                      <TableHead className="text-right font-semibold text-xs">تاريخ الميلاد</TableHead>
                      <TableHead className="text-right font-semibold text-xs">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => {
                      const statusConfig = STATUS_CONFIG[member.membership_status] || STATUS_CONFIG.ACTIVE;
                      const initials = ((member.first_name?.[0] || '') + (member.last_name?.[0] || '')).toUpperCase() || '?';
                      return (
                        <TableRow key={member.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <Checkbox 
                                  checked={selectedMembers.has(member.id)}
                                  onCheckedChange={() => toggleSelection(member)}
                                  className="ml-2"
                                />
                              </div>
                              <Avatar className="h-9 w-9 border border-border/60">
                                <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">
                                  {member.last_name} {member.first_name}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {member.local_number || '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                            {member.institution || '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {member.residence_commune || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("text-[11px] px-2 py-0.5", statusConfig.color)}>
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {member.birth_date || '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => router.push(`/members/${member.id}`)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => router.push(`/members/${member.id}/card`)}>
                                <CreditCard className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600" onClick={() => handleDeleteMember(member.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Load More Trigger */}
            {hasMore && !isLoading && (
              <div className="flex justify-center py-8">
                {isLoadingMore ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : (
                  <Button variant="outline" onClick={() => loadData(false)}>عرض المزيد</Button>
                )}
              </div>
            )}
            
            {!hasMore && members.length > 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm border-t border-dashed mt-8">
                    نهاية القائمة. تم عرض {totalItems} منخرط.
                </div>
            )}
          </div>
        </div>
      </div>
      <CreateBatchDialog 
        isOpen={isBatchDialogOpen} 
        onClose={() => setIsBatchDialogOpen(false)} 
        selectedMembers={new Set(selectedMembers.keys())} 
        onSuccess={() => {
          setSelectedMembers(new Map());
          loadData(true);
        }} 
      />
      <AddToCampTripModal 
        isOpen={isCampTripModalOpen} 
        onClose={() => setIsCampTripModalOpen(false)} 
        selectedMembers={Array.from(selectedMembers.values())}
        onSuccess={() => {
          setSelectedMembers(new Map());
          loadData(true);
        }}
      />
    </div>
    </PermissionGuard>
  );
}

// Reusable Member Card Component
const MemberCard = React.memo(function MemberCard({ member, isSelected, onSelect, onDelete, onView, onCard }: { 
    member: Member, 
    isSelected: boolean,
    onSelect: () => void,
    onDelete: () => void, 
    onView: () => void, 
    onCard: () => void 
}) {
    const statusConfig = STATUS_CONFIG[member.membership_status] || STATUS_CONFIG.ACTIVE;
    
    const accentColors: Record<string, string> = {
      ACTIVE: "from-green-500/70 via-green-400/30 to-transparent",
      EXPIRED: "from-gray-400/60 via-gray-300/25 to-transparent",
      CANCELLED: "from-red-500/60 via-red-400/25 to-transparent",
    };
    
    return (
        <div
            className={`group relative overflow-hidden rounded-xl border bg-card transition-all ${
              isSelected 
                ? 'ring-2 ring-primary/40 bg-primary/[0.03]' 
                : 'hover:shadow-sm hover:border-border/80'
            }`}
        >
            {/* Top accent bar instead of side-stripe */}
            <div className={`absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r ${accentColors[member.membership_status] || accentColors.ACTIVE}`} />
            
            <div className="p-4 lg:p-5">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 lg:gap-4 min-w-0 w-full lg:w-auto">
                        <Checkbox 
                          checked={isSelected} 
                          onCheckedChange={onSelect} 
                          className="shrink-0 mt-0.5" 
                        />
                        <div className="relative shrink-0">
                            {member.photo_path ? (
                                <img 
                                    src={getThumbnailUrl(member.photo_path) || ""} 
                                    alt={member.first_name}
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (target.src.includes('_thumb.webp')) {
                                            target.src = getStorageUrl(member.photo_path) || "";
                                          }
                                    }}
                                    className="w-11 h-11 rounded-full object-cover border-2 border-border/40"
                                />
                            ) : (
                                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center border border-primary/10">
                                    <span className="text-primary font-bold text-sm">
                                        {member.first_name?.[0]}{member.last_name?.[0]}
                                    </span>
                                </div>
                            )}
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${member.membership_status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400'}`} />
                        </div>
                        
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <h3 className="font-bold text-foreground truncate max-w-[200px]">
                                    {member.first_name} {member.last_name}
                                </h3>
                                <Badge className={`${statusConfig.color} border-none shadow-none text-[10px] px-2 py-0 h-5 shrink-0`}>
                                    {statusConfig.label}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2.5 text-sm text-muted-foreground flex-wrap">
                                <span className="font-mono text-xs bg-muted/60 px-1.5 py-0.5 rounded">
                                    #{member.local_number}
                                </span>
                                {member.unified_member_number && (
                                    <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 text-xs font-medium">
                                        رقم الانخراط الموحد: <span dir="ltr">{member.unified_member_number}</span>
                                    </span>
                                )}
                                {member.has_disabilities && (
                                    <Badge variant="destructive" className="text-[10px] py-0 h-4.5">احتياجات خاصة</Badge>
                                )}
                                {member.camp_rejection_reason && (
                                    <Badge variant="destructive" className="text-[10px] py-0 h-4.5 border-none shadow-none bg-red-100 text-red-800 hover:bg-red-200">
                                        مستبعد من المخيم: {member.camp_rejection_reason}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between w-full lg:w-auto gap-6 lg:gap-5 text-sm mr-9 lg:mr-0">
                        <div className="hidden lg:flex items-center gap-5">
                            <MiniStat label="المؤسسة" value={member.institution || '—'} />
                            <MiniStat label="البلدية" value={member.residence_commune || '—'} />
                            <MiniStat label="المواليد" value={member.birth_date || '—'} />
                            <MiniStat label="سنة الانخراط" value={member.membership_year || '—'} color="text-emerald-600 dark:text-emerald-400" />
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                            <Button onClick={onView} size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary">
                                <Eye className="w-4 h-4" />
                            </Button>
                            <Button onClick={onCard} size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600">
                                <CreditCard className="w-4 h-4" />
                            </Button>
                            <Button onClick={onDelete} size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-muted-foreground hover:text-red-600">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
                
                {/* Mobile stat row */}
                <div className="lg:hidden grid grid-cols-4 gap-2 mt-3 mr-9 pt-3 border-t border-border/50">
                    <MobileMiniStat label="المؤسسة" value={member.institution || '—'} />
                    <MobileMiniStat label="البلدية" value={member.residence_commune || '—'} />
                    <MobileMiniStat label="المواليد" value={member.birth_date || '—'} />
                    <MobileMiniStat label="سنة الانخراط" value={member.membership_year || '—'} />
                </div>
            </div>
        </div>
    );
});

/** Small inline stat for desktop */
const MiniStat = React.memo(function MiniStat({ label, value, color }: { label: string; value: string | number; color?: string }) {
    return (
        <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">{label}</span>
            <span className={`font-medium text-foreground/80 truncate max-w-[120px] ${color || ''}`}>{value}</span>
        </div>
    );
});

/** Even smaller stat for mobile */
const MobileMiniStat = React.memo(function MobileMiniStat({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="flex flex-col min-w-0">
            <span className="text-[9px] text-muted-foreground/70 font-semibold tracking-wider truncate">{label}</span>
            <span className="text-xs font-medium text-foreground/70 truncate">{value}</span>
        </div>
    );
});

/** Stat block for the unified stats bar */
const StatBlock = React.memo(function StatBlock({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
    return (
        <div className="flex-1 flex items-center gap-3 px-5 py-4 min-w-0">
            <div className="shrink-0 w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center">
                <Icon className={`w-4.5 h-4.5 ${color}`} />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
                <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
            </div>
        </div>
    );
});