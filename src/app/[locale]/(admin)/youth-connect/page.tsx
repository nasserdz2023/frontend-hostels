"use client";

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Plus, 
  Search,
  MoreVertical,
  Activity,
  ExternalLink,
  Bot,
  Loader2,
  Trash2,
  Edit,
  Eye,
  RefreshCw,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from '@/i18n/routing';
import { Link } from "@/i18n/routing";

import api from "@/lib/api/client";
import { CreateBatchDialog } from "@/components/youth-connect/CreateBatchDialog";
import { EditBatchDialog } from "@/components/youth-connect/EditBatchDialog";
import { PermissionGuard } from "@/hooks/useRequirePermission";

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; gradient: string }> = {
  pending: { label: "في الانتظار", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", gradient: "from-amber-500 to-orange-500" },
  processing: { label: "قيد المعالجة", color: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500", gradient: "from-sky-500 to-blue-500" },
  completed: { label: "مكتمل", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", gradient: "from-emerald-500 to-teal-500" },
  failed: { label: "فشل", color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", gradient: "from-red-500 to-rose-500" },
};

function StatBlock({ icon: Icon, label, value, sub, trend }: {
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
}

/** Mini progress bar for batch cards */
function MiniProgress({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

export default function YouthConnectDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<any>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: batchesData, isLoading } = useQuery({
    queryKey: ["youth-connect-batches"],
    queryFn: async () => {
      const res = await api.get("/youth-connect/batches?limit=20");
      return res.data;
    },
    refetchInterval: 10000,
  });

  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      await api.delete(`/youth-connect/batches/${batchId}`);
    },
    onSuccess: () => {
      toast.success("تم حذف الدفعة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["youth-connect-batches"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "فشل حذف الدفعة");
    }
  });

  const handleDeleteBatch = (batchId: string) => {
    if (window.confirm('هل أنت متأكد من أنك تريد حذف هذه الدفعة؟')) {
      deleteBatchMutation.mutate(batchId);
    }
  };

  const batches = batchesData?.items || [];

  const totalStats = batches.reduce((acc: any, b: any) => ({
    total: acc.total + b.total_count,
    success: acc.success + b.success_count,
    failed: acc.failed + b.failed_count,
  }), { total: 0, success: 0, failed: 0 });

  const processingCount = batches.filter((b: any) => b.status === 'processing').reduce((acc: number, b: any) => {
    return acc + (b.total_count - b.success_count - b.failed_count);
  }, 0);

  const filteredBatches = batches.filter((b: any) =>
    !searchQuery || b.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
  <PermissionGuard module="youth_connect" action="view">
              <div className="p-6 space-y-6 bg-background/50 min-h-screen">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">تكامل منصة YouthConnect</h1>
              <p className="text-sm text-muted-foreground mt-0.5">أتمتة ومتابعة تسجيل المنخرطين في البوابة الوطنية للوزارة</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="https://youthconnect.dz" target="_blank">
            <Button variant="outline" size="sm" className="h-9 rounded-xl">
              <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              فتح المنصة الخارجية
            </Button>
          </Link>
          <Button size="sm" className="h-9 rounded-xl gap-1.5"
            onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            إنشاء دفعة
          </Button>
        </div>
      </div>

      {/* Create + Edit Dialogs */}
      <CreateBatchDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
      <EditBatchDialog batch={editingBatch} open={!!editingBatch} onOpenChange={(open) => !open && setEditingBatch(null)} />

      {/* Stats Bar — unified, no identical cards */}
      <div className="bg-white dark:bg-slate-900 border border-border/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex flex-wrap">
          <StatBlock icon={Users} label="إجمالي المسجلين" value={totalStats.total} />
          <StatBlock icon={CheckCircle2} label="عمليات ناجحة" value={totalStats.success}
            trend={totalStats.success > 0 ? 'up' : null} />
          <StatBlock icon={Activity} label="قيد التنفيذ" value={processingCount} />
          <StatBlock icon={AlertCircle} label="فشل التسجيل" value={totalStats.failed}
            trend={totalStats.failed > 0 ? 'down' : null} />
        </div>
      </div>

      {/* Batches */}
      <div className="bg-white dark:bg-slate-900 border border-border/60 rounded-2xl shadow-sm overflow-hidden">
        {/* Section header */}
        <div className="px-6 pt-5 pb-4 border-b border-border/40 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Clock className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold">الدُفعات</h2>
              <p className="text-xs text-muted-foreground">{batches.length} دفعة</p>
            </div>
          </div>
          <div className="relative w-56">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="بحث عن دفعة..." className="pr-9 h-9 text-sm rounded-xl border-border/70"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        {/* Batch list */}
        <div className="p-5 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <p className="text-sm">جاري تحميل الدفعات...</p>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Bot className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-foreground/70 mb-1">
                {searchQuery ? 'لا توجد دفعات مطابقة للبحث' : 'لا توجد دفعات حالياً'}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                {searchQuery ? 'جرب تغيير كلمة البحث' : 'ابدأ بإنشاء دفعة تسجيل جديدة'}
              </p>
              {!searchQuery && (
                <Button size="sm" variant="outline" className="rounded-xl"
                  onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-3.5 h-3.5 ml-1.5" />
                  إنشاء دفعة
                </Button>
              )}
            </div>
          ) : (
            filteredBatches.map((batch: any) => {
              const progress = batch.total_count > 0
                ? Math.round(((batch.success_count + batch.failed_count) / batch.total_count) * 100)
                : 0;
              const statusStr = batch.status?.toLowerCase() || 'pending';
              const cfg = STATUS_CONFIG[statusStr] || STATUS_CONFIG.pending;

              return (
                <div key={batch.id}
                  className="group bg-white dark:bg-slate-900 border border-border/60 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden">

                  {/* Top accent gradient and status dot */}
                  <div className={`h-1 w-full bg-gradient-to-r ${cfg.gradient}`} />

                  <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    {/* Left: icon + info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.color}`}>
                        <Bot className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm truncate">{batch.name}</h4>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          <span className="text-xs text-muted-foreground/60">
                            {new Date(batch.created_at).toLocaleDateString('ar-DZ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Center: progress */}
                    <div className="flex-1 w-full sm:max-w-[200px]">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-foreground/70">{progress}%</span>
                        <span className="text-muted-foreground">
                          <span className="text-emerald-600 font-medium tabular-nums">{batch.success_count}</span>
                          {batch.failed_count > 0 && <><span className="text-muted-foreground mx-0.5">/</span><span className="text-red-500 font-medium tabular-nums">{batch.failed_count}</span></>}
                          <span className="text-muted-foreground mx-0.5">/</span>
                          <span className="tabular-nums">{batch.total_count}</span>
                        </span>
                      </div>
                      <MiniProgress value={progress} color="bg-primary" />
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {statusStr === 'pending' && (
                        <Button size="sm" variant="ghost" className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1"
                          onClick={() => router.push(`/youth-connect/${batch.id}`)}>
                          <Play className="w-3.5 h-3.5" />
                          <span className="text-xs">تشغيل</span>
                        </Button>
                      )}
                      {(statusStr === 'processing' || statusStr === 'completed' || statusStr === 'failed') && (
                        <Button size="sm" variant="ghost" className="h-8 gap-1"
                          onClick={() => router.push(`/youth-connect/${batch.id}`)}>
                          <Eye className="w-3.5 h-3.5" />
                          <span className="text-xs">متابعة</span>
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[140px]">
                          <DropdownMenuItem onClick={() => setEditingBatch(batch)}>
                            <Edit className="w-3.5 h-3.5 ml-2" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteBatch(batch.id)}
                            className="text-red-500 hover:text-red-600 focus:text-red-600 focus:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5 ml-2" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  </PermissionGuard>
  );
}
