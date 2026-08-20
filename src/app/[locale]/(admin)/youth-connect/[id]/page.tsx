"use client";

import React, { useRef, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  ArrowRight, 
  Bot, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Activity,
  Image as ImageIcon,
  ExternalLink,
  Play,
  RefreshCw,
  Send,
  LogIn,
  Users,
  Loader2,
  XCircle,
  Terminal,
  Building
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import api from '@/lib/api/client';
import { CaptchaSolver } from '@/components/youth-connect/CaptchaSolver';
import { PermissionGuard } from "@/hooks/useRequirePermission";

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; gradient: string; icon: any }> = {
  pending: { label: "في الانتظار", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", gradient: "from-amber-500 to-orange-500", icon: Clock },
  processing: { label: "قيد المعالجة", color: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500", gradient: "from-sky-500 to-blue-500", icon: Activity },
  completed: { label: "مكتمل", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", gradient: "from-emerald-500 to-teal-500", icon: CheckCircle2 },
  failed: { label: "فشل", color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", gradient: "from-red-500 to-rose-500", icon: XCircle },
};

const REG_STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: "في الانتظار", color: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  processing: { label: "قيد المعالجة", color: "bg-sky-100 text-sky-700", dot: "bg-sky-500" },
  success: { label: "ناجح", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  failed: { label: "فشل", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
  error: { label: "خطأ", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
  awaiting_captcha: { label: "بانتظار الكابتشا", color: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
};

function AnimatedGradientBar({ value }: { value: number }) {

  return (

        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-l from-primary via-primary/80 to-primary/60 transition-all duration-700 ease-out"
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

export default function BatchDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.id as string;
  const queryClient = useQueryClient();
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [activeCaptchaReg, setActiveCaptchaReg] = useState<{id: string, imageUrl: string, memberName: string} | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const { data: batch, isLoading } = useQuery({
    queryKey: ['youth-connect-batch', batchId],
    queryFn: async () => {
      const res = await api.get(`/youth-connect/batches/${batchId}`);
      return res.data;
    },
    refetchInterval: 2000,
  });

  const runBatchMutation = useMutation({
    mutationFn: async (method?: string) => {
      let url = `/youth-connect/batches/${batchId}/run`;
      if (method) url += `?method=${method}`;
      const res = await api.post(url);
      return res.data;
    },
    onSuccess: () => {
      toast.success("بدأت عملية التسجيل بنجاح");
      queryClient.invalidateQueries({ queryKey: ["youth-connect-batch", batchId] });
      queryClient.invalidateQueries({ queryKey: ["youth-connect-batches"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.message || "فشل بدء المعالجة");
    }
  });

  const resetBatchMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/youth-connect/batches/${batchId}/reset`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("تم إعادة تعيين التسجيلات الفاشلة لتكون جاهزة للمحاولة");
      queryClient.invalidateQueries({ queryKey: ["youth-connect-batch", batchId] });
      queryClient.invalidateQueries({ queryKey: ["youth-connect-batches"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.message || "فشل إعادة التعيين");
    }
  });

  const manualLoginMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      const res = await api.post(`/youth-connect/registrations/${registrationId}/manual-login`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("تم إرسال طلب الدخول. سيفتح المتصفح على السيرفر قريباً.");
      queryClient.invalidateQueries({ queryKey: ["youth-connect-batch", batchId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.message || "فشل إرسال الطلب");
    }
  });

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [batch?.logs]);

  // Auto-detect awaiting captcha
  useEffect(() => {
    if (!batch) return;
    const awaitingReg = batch.registrations?.find((r: any) => r.status?.toLowerCase() === 'awaiting_captcha');
    if (awaitingReg) {
      if (awaitingReg.id === dismissedId) return;
      const memberName = awaitingReg.member ? `${awaitingReg.member.first_name} ${awaitingReg.member.last_name}` : "غير معروف";
      if (activeCaptchaReg?.id !== awaitingReg.id || activeCaptchaReg?.imageUrl !== awaitingReg.captcha_image) {
        setActiveCaptchaReg({ id: awaitingReg.id, imageUrl: awaitingReg.captcha_image, memberName });
      }
    } else {
      if (activeCaptchaReg) setActiveCaptchaReg(null);
      if (dismissedId) setDismissedId(null);
    }
  }, [batch?.registrations, activeCaptchaReg?.id, dismissedId]);

  if (isLoading) {
    return (
                  <div className="flex items-center justify-center min-h-[60vh]">
        <Activity className="w-8 h-8 animate-pulse text-primary" />
      </div>
    )
      ;
  }

  if (!batch) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        الدفعة غير موجودة
      </div>
    );
  }

  const progress = batch.total_count > 0
    ? Math.round(((batch.success_count + batch.failed_count) / batch.total_count) * 100)
    : 0;

  const statusStr = batch.status?.toLowerCase() || 'pending';
  const cfg = STATUS_CONFIG[statusStr] || STATUS_CONFIG.pending;
  const awaitingCaptchaCount = batch.registrations?.filter((r: any) => r.status?.toLowerCase() === 'awaiting_captcha').length || 0;
  const pendingCount = batch.registrations?.filter((r: any) => r.status?.toLowerCase() === 'pending').length || 0;

  return (
  <PermissionGuard module="youth_connect" action="view">
      <div className="p-6 space-y-6">
      {/* Header with gradient background */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${cfg.gradient} shadow-xl`}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative px-6 py-5 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/youth-connect')}
            className="text-white/80 hover:text-white hover:bg-white/20 shrink-0 rounded-xl">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white truncate">{batch.name}</h1>
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${cfg.color}`}>{cfg.label}</span>
            </div>
            <p className="text-sm text-white/70 mt-0.5 truncate">{batch.description || 'لا يوجد وصف'}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Awaiting captcha button */}
            {awaitingCaptchaCount > 0 && (
              <Button onClick={() => {
                const firstAwaiting = batch.registrations?.find((r: any) => r.status?.toLowerCase() === 'awaiting_captcha');
                if (firstAwaiting) {
                  setDismissedId(null);
                  setActiveCaptchaReg({
                    id: firstAwaiting.id, imageUrl: firstAwaiting.captcha_image,
                    memberName: firstAwaiting.member ? `${firstAwaiting.member.first_name} ${firstAwaiting.member.last_name}` : "غير معروف"
                  });
                }
              }}
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm gap-1.5 h-8 rounded-xl text-xs">
                <RefreshCw className="w-3 h-3" />
                حل الكابتشا ({awaitingCaptchaCount})
              </Button>
            )}

            {statusStr !== 'processing' && statusStr !== 'completed' && (
              <>
                <Button size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm gap-1.5 h-8 rounded-xl text-xs"
                  onClick={() => runBatchMutation.mutate("api")} disabled={runBatchMutation.isPending}>
                  {runBatchMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  {runBatchMutation.isPending ? 'جاري التشغيل...' : 'تسجيل سريع (API)'}
                </Button>
                <Button size="sm"
                  className="bg-emerald-500/80 hover:bg-emerald-600/90 text-white border-0 backdrop-blur-sm gap-1.5 h-8 rounded-xl text-xs"
                  onClick={() => runBatchMutation.mutate("institution_account")} disabled={runBatchMutation.isPending}>
                  {runBatchMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Building className="w-3 h-3" />}
                  {runBatchMutation.isPending ? 'جاري التشغيل...' : 'تسجيل من حساب المؤسسة'}
                </Button>
              </>
            )}

            {(statusStr === 'completed' || statusStr === 'failed') && (
              <Button size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm gap-1.5 h-8 rounded-xl text-xs"
                onClick={() => { if (window.confirm('هل تريد إعادة محاولة تسجيل الأفراد الذين فشلوا؟')) { resetBatchMutation.mutate(); } }}
                disabled={resetBatchMutation.isPending}>
                {resetBatchMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                {resetBatchMutation.isPending ? 'جاري التحضير...' : 'إعادة الفاشلين'}
              </Button>
            )}
          </div>
        </div>

        {/* Mini stats row in header */}
        <div className="relative px-6 pb-4 pt-2 flex items-center gap-6 text-white/80 text-xs">
          <span>الإجمالي: <strong className="text-white">{batch.total_count}</strong></span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-300" /> ناجح: <strong className="text-white">{batch.success_count}</strong>
          </span>
          {batch.failed_count > 0 && (
            <span className="flex items-center gap-1">
              <XCircle className="w-3 h-3 text-red-300" /> فشل: <strong className="text-white">{batch.failed_count}</strong>
            </span>
          )}
          {awaitingCaptchaCount > 0 && (
            <span className="flex items-center gap-1">
              <ImageIcon className="w-3 h-3 text-orange-300" /> كابتشا: <strong className="text-white">{awaitingCaptchaCount}</strong>
            </span>
          )}
          {pendingCount > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-300" /> انتظار: <strong className="text-white">{pendingCount}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Progress bar below header */}
      <div className="bg-white dark:bg-slate-900 border border-border/60 rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">تقدم العملية</span>
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground/70 tabular-nums">{progress}%</span>
            <span className="mx-1.5">·</span>
            {batch.success_count + batch.failed_count} من {batch.total_count}
          </div>
        </div>
        <AnimatedGradientBar value={progress} />
      </div>

      {/* Registrations Table */}
      <div className="bg-white dark:bg-slate-900 border border-border/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold">قائمة التسجيلات</h2>
              <p className="text-xs text-muted-foreground">{batch.registrations?.length || 0} منخرط</p>
            </div>
          </div>
        </div>
        <div className="p-5">
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-bold text-muted-foreground">المنخرط</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground">المؤسسة</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground">اسم المستخدم</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground">كلمة المرور</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground">الرقم الوزاري</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground">الحالة</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground">الخطأ</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batch.registrations?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">
                      لا توجد تسجيلات في هذه الدفعة
                    </TableCell>
                  </TableRow>
                ) : (
                  batch.registrations?.map((reg: any) => {
                    const regCfg = REG_STATUS_CONFIG[reg.status?.toLowerCase()] || REG_STATUS_CONFIG.pending;
                    return (
                      <TableRow key={reg.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                              {reg.member?.first_name?.[0] || '?'}
                            </div>
                            <span className="text-sm">{reg.member?.first_name} {reg.member?.last_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                          {reg.member?.institution || '-'}
                        </TableCell>
                        <TableCell>
                          <code className="text-[11px] bg-muted px-2 py-0.5 rounded-md font-mono">
                            {reg.member?.username || reg.external_username || '-'}
                          </code>
                        </TableCell>
                        <TableCell>
                          <code className="text-[11px] font-mono text-muted-foreground">
                            {reg.member?.password || '-'}
                          </code>
                        </TableCell>
                        <TableCell>
                          {reg.ministry_number ? (
                            <span dir="ltr" className="inline-block text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-mono font-medium text-right">
                              {reg.ministry_number}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${regCfg.color}`}>
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${regCfg.dot} ml-1 align-middle`} />
                            {reg.status?.toLowerCase() === 'success' ? 'ناجح' :
                             reg.status?.toLowerCase() === 'failed' ? 'فشل' :
                             reg.status?.toLowerCase() === 'error' ? 'خطأ' :
                             reg.status?.toLowerCase() === 'processing' ? 'قيد المعالجة' :
                             reg.status?.toLowerCase() === 'awaiting_captcha' ? 'كابتشا' : 'في الانتظار'}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[160px]">
                          {reg.error_message ? (
                            <span className="text-[11px] text-red-500 truncate block" title={reg.error_message}>
                              {reg.error_message}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex items-center gap-1">
                            {reg.status?.toLowerCase() === 'awaiting_captcha' && (
                              <Button size="sm" variant="ghost"
                                className="h-7 px-2 gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg text-[11px]"
                                onClick={() => {
                                  setDismissedId(null);
                                  setActiveCaptchaReg({
                                    id: reg.id, imageUrl: reg.captcha_image,
                                    memberName: reg.member ? `${reg.member.first_name} ${reg.member.last_name}` : "غير معروف"
                                  });
                                }}>
                                <Send className="w-3 h-3" />
                                كابتشا
                              </Button>
                            )}
                            <Button size="sm" variant="ghost"
                              className="h-7 px-2 gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg text-[11px]"
                              onClick={() => manualLoginMutation.mutate(reg.id)}
                              disabled={manualLoginMutation.isPending}
                              title="فتح المتصفح وتسجيل الدخول يدوياً">
                              <LogIn className="w-3 h-3" />
                              دخول
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Live Logs */}
      <div className="border border-border/60 rounded-2xl shadow-sm overflow-hidden bg-slate-950">
        <div className="flex items-center gap-2.5 px-6 py-3.5 border-b border-slate-800">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold text-slate-200">سجل العمليات المباشر</span>
          {batch.logs?.length > 0 && (
            <span className="text-[11px] text-slate-500 font-mono">{batch.logs.length} سطر</span>
          )}
        </div>
        <div ref={logContainerRef} className="p-4 h-80 overflow-y-auto space-y-1 font-mono text-[12px] leading-relaxed">
          {batch.logs?.length > 0 ? (
            batch.logs.map((log: any, i: number) => (
              <div key={i} className={`
                ${log.level === 'error' ? 'text-rose-300' :
                  log.level === 'warning' ? 'text-amber-300' :
                  log.level === 'success' ? 'text-emerald-300 font-medium' : 'text-slate-400'}
              `}>
                <span className="text-slate-600">[{new Date(log.timestamp).toLocaleTimeString('ar-DZ')}]</span> {log.message}
              </div>
            ))
          ) : (
            <div className="text-slate-600 text-center py-10 text-sm">لا توجد سجلات بعد</div>
          )}
        </div>
      </div>

      {/* Captcha Solver */}
      <CaptchaSolver
        batchId={batchId}
        registrationId={activeCaptchaReg?.id || null}
        memberName={activeCaptchaReg?.memberName || null}
        imageUrl={activeCaptchaReg?.imageUrl || ''}
        onClose={() => {
          if (activeCaptchaReg) setDismissedId(activeCaptchaReg.id);
          setActiveCaptchaReg(null);
        }}
      />
    </div>
  </PermissionGuard>
              );
}