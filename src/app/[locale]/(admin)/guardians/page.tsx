'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  RefreshCw, Users, Eye, Search,
  Shield, Phone, Mail, MapPin, Calendar,
  ChevronLeft, ChevronRight,
  Fingerprint, CreditCard, LayoutList, LayoutGrid
} from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { membersApi, Guardian } from "@/lib/api/members";
import { ControlPanel } from "@/components/odoo/ControlPanel";
import { PermissionGuard } from "@/hooks/useRequirePermission";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.[0] || '';
  const l = lastName?.[0] || '';
  return (f + l).toUpperCase() || '?';
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('ar-DZ', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

type ViewType = "kanban" | "list";

export default function GuardiansDashboard() {
  const router = useRouter();
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [viewType, setViewType] = useState<ViewType>("kanban");
  const PAGE_SIZE = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, currentPage]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const response = await membersApi.listGuardians({
        search: searchQuery || undefined,
        page: currentPage,
        page_size: PAGE_SIZE,
      });

      setGuardians(response.data.items);
      setTotalItems(response.data.total);
      setTotalPages(Math.ceil(response.data.total / PAGE_SIZE) || 1);
    } catch {
      toast.error("فشل في تحميل بيانات الأولياء");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (

            <div className="flex items-center justify-center gap-2 mt-6">
        <Button
          variant="outline" size="sm"
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="h-9 px-3"
        >
          <ChevronRight className="w-4 h-4 ml-1" />
          السابق
        </Button>
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, idx) =>
            typeof page === 'string' ? (
              <span key={`e-${idx}`} className="px-2 text-muted-foreground text-sm">{page}</span>
            ) : (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "ghost"} size="sm"
                className={`h-9 min-w-9 px-2 ${page === currentPage ? 'shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            )
          )}
        </div>
        <Button
          variant="outline" size="sm"
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="h-9 px-3"
        >
          التالي
          <ChevronLeft className="w-4 h-4 mr-1" />
        </Button>
      </div>
    );
  };

  return (
  <PermissionGuard module="guardians" action="view">
      <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-slate-50/50">
      <ControlPanel
        title="الأولياء"
        hideBreadcrumbs
        searchPlaceholder="البحث باسم الولي، رقمه الوطني أو هاتفه..."
        searchQuery={searchQuery}
        onSearch={handleSearch}
        viewType={viewType}
        onViewChange={setViewType}
        actions={
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 ml-2" />
            تحديث
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Stats Bar */}
          {!isLoading && (
            <div className="flex items-stretch bg-card rounded-xl border shadow-sm overflow-hidden">
              <GuardianStatBlock label="إجمالي الأولياء" value={totalItems} icon={Users} color="text-primary" />
              <div className="w-px bg-border shrink-0" />
              <GuardianStatBlock label="الصفحة الحالية" value={currentPage} icon={CreditCard} color="text-blue-600" />
              <div className="w-px bg-border shrink-0" />
              <GuardianStatBlock label="إجمالي الصفحات" value={totalPages} icon={Fingerprint} color="text-emerald-600" />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                {viewType === "kanban" ? <LayoutGrid className="w-5 h-5 text-muted-foreground" /> : <LayoutList className="w-5 h-5 text-muted-foreground" />}
                {viewType === "kanban" ? "بطاقات الأولياء" : "قائمة الأولياء"}
                {!isLoading && (
                  <span className="text-muted-foreground text-base font-normal">({totalItems})</span>
                )}
              </h2>
            </div>

            {/* Loading State */}
            {isLoading && (
              viewType === "kanban" ? <KanbanSkeleton /> : <ListViewSkeleton />
            )}

            {/* Empty State */}
            {!isLoading && guardians.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed border-muted-300">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-5">
                  <Search className="w-7 h-7 text-muted-foreground/60" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {searchQuery ? "لم نعثر على ولي" : "لا يوجد أولياء مسجلين"}
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                  {searchQuery
                    ? "لم نجد أي ولي يطابق بحثك. حاول تعديل معايير البحث."
                    : "يتم إنشاء الأولياء تلقائياً عند إضافة منخرط جديد."}
                </p>
                <div className="flex items-center gap-3">
                  {searchQuery && (
                    <Button onClick={() => handleSearch("")} variant="outline" size="sm">
                      <RefreshCw className="w-3.5 h-3.5 ml-2" />
                      إعادة تعيين
                    </Button>
                  )}
                  {!searchQuery && (
                    <Button onClick={() => router.push('/members')} size="sm">
                      <Users className="w-3.5 h-3.5 ml-2" />
                      الذهاب للمنخرطين
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Kanban / Card View */}
            {!isLoading && guardians.length > 0 && viewType === "kanban" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {guardians.map((guardian) => (
                    <GuardianCard
                      key={guardian.id}
                      guardian={guardian}
                      onView={() => router.push(`/guardians/${guardian.id}`)}
                    />
                  ))}
                </div>
                {renderPagination()}
              </>
            )}

            {/* List / Table View */}
            {!isLoading && guardians.length > 0 && viewType === "list" && (
              <>
                <div className="rounded-xl border bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pr-4">الاسم</TableHead>
                        <TableHead>رقم التعريف</TableHead>
                        <TableHead>الهاتف</TableHead>
                        <TableHead className="hidden md:table-cell">البريد</TableHead>
                        <TableHead className="hidden lg:table-cell">الولاية</TableHead>
                        <TableHead className="hidden md:table-cell">تاريخ التسجيل</TableHead>
                        <TableHead className="pl-4 text-left">
                          <span className="sr-only">إجراءات</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {guardians.map((guardian) => (
                        <GuardianTableRow
                          key={guardian.id}
                          guardian={guardian}
                          onView={() => router.push(`/guardians/${guardian.id}`)}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {renderPagination()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  </PermissionGuard>
  );
}

/* ===== Kanban / Card View ===== */

interface GuardianCardProps {
  guardian: Guardian;
  onView: () => void;
}

function GuardianCard({ guardian, onView }: GuardianCardProps) {
  const initials = getInitials(guardian.first_name, guardian.last_name);
  const hasContactInfo = !!(guardian.phone || guardian.email);
  const hasLocation = !!guardian.birth_wilaya;

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card transition-all hover:shadow-sm hover:border-border/80">
      <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-primary/50 via-primary/30 to-transparent" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="w-10 h-10 border border-border/30 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="font-bold text-foreground truncate">
                {guardian.first_name} {guardian.last_name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {guardian.relationship_type || 'ولي أمر'}
              </p>
            </div>
          </div>
          <Button onClick={onView} size="icon" variant="ghost"
            className="h-8 w-8 rounded-lg shrink-0 hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2 text-sm">
          {guardian.national_id && (
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Shield className="w-3.5 h-3.5 shrink-0 text-foreground/50" />
              <span className="font-mono text-xs truncate" dir="ltr">{guardian.national_id}</span>
            </div>
          )}
          {guardian.phone && (
            <div className="flex items-center gap-2.5 text-muted-foreground" dir="ltr">
              <Phone className="w-3.5 h-3.5 shrink-0 text-foreground/50" />
              <span className="text-left text-xs" dir="ltr">{guardian.phone}</span>
            </div>
          )}
          {guardian.email && (
            <div className="flex items-center gap-2.5 text-muted-foreground" dir="ltr">
              <Mail className="w-3.5 h-3.5 shrink-0 text-foreground/50" />
              <span className="text-left text-xs truncate">{guardian.email}</span>
            </div>
          )}
          {hasLocation && (
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-foreground/50" />
              <span className="text-xs truncate">{guardian.birth_wilaya}</span>
            </div>
          )}
          {!hasContactInfo && !hasLocation && (
            <div className="text-xs text-muted-foreground/60 italic">لا توجد معلومات إضافية</div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
          <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground px-2 py-0.5 h-5 border-border/60">
            <Calendar className="w-3 h-3 ml-1 text-muted-foreground/70" />
            {formatDate(guardian.created_at)}
          </Badge>
          <Button variant="link" size="sm" onClick={onView}
            className="h-auto p-0 text-xs font-medium text-primary hover:text-primary/80"
          >
            عرض التفاصيل
            <ChevronLeft className="w-3 h-3 mr-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ===== List / Table View ===== */

interface GuardianTableRowProps {
  guardian: Guardian;
  onView: () => void;
}

function GuardianTableRow({ guardian, onView }: GuardianTableRowProps) {
  const initials = getInitials(guardian.first_name, guardian.last_name);

  return (
    <TableRow className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={onView}>
      <TableCell className="pr-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8 border border-border/20 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm truncate max-w-[180px]">
              {guardian.first_name} {guardian.last_name}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {guardian.relationship_type || 'ولي أمر'}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {guardian.national_id ? (
          <span className="font-mono text-xs text-muted-foreground" dir="ltr">
            {guardian.national_id}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </TableCell>
      <TableCell>
        {guardian.phone ? (
          <span className="text-xs text-muted-foreground font-mono" dir="ltr">{guardian.phone}</span>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {guardian.email ? (
          <span className="text-xs text-muted-foreground truncate max-w-[180px] block" dir="ltr">
            {guardian.email}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <span className="text-xs text-muted-foreground">
          {guardian.birth_wilaya || '—'}
        </span>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <span className="text-xs text-muted-foreground">
          {formatDate(guardian.created_at)}
        </span>
      </TableCell>
      <TableCell className="pl-4 text-left">
        <Button variant="ghost" size="icon"
          className="h-7 w-7 rounded-md hover:bg-primary/10 hover:text-primary"
          onClick={(e) => { e.stopPropagation(); onView(); }}
        >
          <Eye className="w-3.5 h-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

/* ===== Skeletons ===== */

function KanbanSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" role="status" aria-label="جاري التحميل">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="rounded-xl border bg-card overflow-hidden animate-pulse">
          <div className="h-1 w-full bg-gradient-to-r from-muted/60 via-muted/30 to-transparent" />
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
              <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
            </div>
            <div className="space-y-2.5">
              <div className="h-3 w-full bg-muted rounded" />
              <div className="h-3 w-3/4 bg-muted rounded" />
              <div className="h-3 w-1/2 bg-muted rounded" />
            </div>
            <div className="flex justify-between pt-2 border-t border-border/50">
              <div className="h-5 w-24 bg-muted rounded-full" />
              <div className="h-4 w-20 bg-muted rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ListViewSkeleton() {
  return (
    <div className="rounded-xl border bg-card overflow-hidden animate-pulse" role="status" aria-label="جاري التحميل">
      {/* Table header skeleton */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border/50 bg-muted/20">
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="h-4 w-28 bg-muted rounded" />
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-4 w-40 bg-muted rounded hidden md:block" />
        <div className="h-4 w-20 bg-muted rounded hidden lg:block" />
        <div className="flex-1" />
      </div>
      {/* Table rows skeleton */}
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border/30">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
            <div className="space-y-1.5">
              <div className="h-4 w-36 bg-muted rounded" />
              <div className="h-3 w-16 bg-muted rounded" />
            </div>
          </div>
          <div className="h-3 w-28 bg-muted rounded hidden md:block" />
          <div className="h-3 w-20 bg-muted rounded" />
          <div className="h-8 w-8 rounded-md bg-muted shrink-0" />
        </div>
      ))}
    </div>
  );
}

/* ===== Stat Block ===== */

function GuardianStatBlock({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number; color: string;
}) {
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
}
