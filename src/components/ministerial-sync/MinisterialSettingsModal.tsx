"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Loader2, AlertCircle, Building2, Users, X, MapPin, Activity, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface MinisterialSettings {
  success: boolean;
  data: {
    isOpen: boolean;
    eligibleWilayas?: {
      wilayaId: {
        code: number;
        nameArabic: string;
      };
      quota: number;
      allocated: number;
    }[];
    eligibleEntities?: {
      entityId: {
        name: string;
      };
      quota: number;
      allocated: number;
    }[];
  };
  message?: string;
}

export function MinisterialSettingsModal() {
  const [open, setOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ministerial-settings"],
    queryFn: async () => {
      const response = await api.get<MinisterialSettings>("/ministerial-sync/ministerial-settings");
      return response.data;
    },
    enabled: open,
    staleTime: 60 * 1000,
  });

  const settings = data?.data;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
          <BarChart3 className="w-4 h-4" />
          إحصائيات الوزارة
        </Button>
      </DialogTrigger>
      <DialogContent className="!max-w-7xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            إحصائيات وإعدادات المنصة الوزارية
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-6">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-pulse">
              <div className="w-3 h-3 rounded-full bg-slate-300" />
              <div className="h-5 w-48 bg-slate-200 rounded" />
            </div>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 p-3 flex gap-4 animate-pulse">
                <div className="h-4 w-16 bg-slate-200 rounded" />
                <div className="h-4 w-24 bg-slate-200 rounded" />
                <div className="h-4 w-16 bg-slate-200 rounded" />
                <div className="h-4 w-16 bg-slate-200 rounded" />
                <div className="h-4 w-20 bg-slate-200 rounded" />
              </div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3 border-t border-slate-100 flex gap-4 animate-pulse">
                  <div className="h-4 w-16 bg-slate-100 rounded" />
                  <div className="h-4 w-24 bg-slate-100 rounded" />
                  <div className="h-4 w-16 bg-slate-100 rounded" />
                  <div className="h-5 w-28 bg-slate-100 rounded-full" />
                  <div className="h-4 w-12 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        ) : error || data?.success === false ? (
          <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-xl border border-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="font-medium">{data?.message || "حدث خطأ أثناء جلب البيانات من المنصة الوزارية."}</p>
          </div>
        ) : settings ? (
          <div className="space-y-6 py-2">
            {/* ─── بطاقة الحالة ─────────────────────────────────────── */}
            <div className={cn(
              "flex items-center gap-3 px-5 py-4 rounded-xl border shadow-sm",
              settings.isOpen
                ? "bg-gradient-to-l from-emerald-50 to-white border-emerald-200"
                : "bg-gradient-to-l from-red-50 to-white border-red-200"
            )}>
              <div className={cn(
                "w-3 h-3 rounded-full",
                settings.isOpen ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500"
              )} />
              <div className="flex items-center gap-2">
                <Activity className={cn("w-4 h-4", settings.isOpen ? "text-emerald-600" : "text-red-600")} />
                <span className="font-semibold text-slate-700">
                  حالة المنصة الوزارية:
                </span>
                <Badge variant={settings.isOpen ? "default" : "destructive"} className={settings.isOpen ? "bg-emerald-500" : ""}>
                  {settings.isOpen ? "🟢 مفتوحة للتسجيل" : "🔴 مغلقة"}
                </Badge>
              </div>
              <a
                href="https://youthcamp.mjeunesse.gov.dz"
                target="_blank"
                rel="noopener noreferrer"
                className="mr-auto text-xs text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                youthcamp.mjeunesse.gov.dz
              </a>
            </div>

            {/* ─── جدول الولايات ─────────────────────────────────────── */}
            {settings.eligibleWilayas && settings.eligibleWilayas.length > 0 && (
              <div>
                <h3 className="text-base font-bold flex items-center gap-2 text-slate-800 mb-3">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  حصص الولايات
                  <Badge variant="secondary" className="mr-auto text-xs">
                    {settings.eligibleWilayas.length} ولاية
                  </Badge>
                </h3>
                <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-l from-slate-50 to-slate-100/60">
                        <TableHead className="font-bold text-slate-700 w-16 text-center">#</TableHead>
                        <TableHead className="font-bold text-slate-700">الولاية</TableHead>
                        <TableHead className="font-bold text-slate-700 text-center">المسجلون</TableHead>
                        <TableHead className="font-bold text-slate-700 text-center">الحصة</TableHead>
                        <TableHead className="font-bold text-slate-700 min-w-[140px]">نسبة الإنجاز</TableHead>
                        <TableHead className="font-bold text-slate-700 text-center">المتبقي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settings.eligibleWilayas
                        .sort((a, b) => b.quota - a.quota)
                        .map((w, idx) => {
                          const percentage = w.quota > 0 ? Math.round((w.allocated / w.quota) * 100) : 0;
                          const remaining = Math.max(0, w.quota - w.allocated);
                          return (
                            <TableRow key={idx} className="hover:bg-slate-50/80 transition-colors">
                              <TableCell className="text-center text-muted-foreground font-mono text-xs">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="font-semibold whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-100 text-indigo-700 text-xs font-bold shrink-0">
                                    {w.wilayaId.code}
                                  </div>
                                  <span>{w.wilayaId.nameArabic}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-bold tabular-nums">
                                {w.allocated.toLocaleString("ar-DZ")}
                              </TableCell>
                              <TableCell className="text-center text-slate-500 tabular-nums">
                                {w.quota.toLocaleString("ar-DZ")}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all duration-700",
                                        percentage >= 100 ? "bg-red-500" : percentage >= 80 ? "bg-amber-500" : "bg-emerald-500"
                                      )}
                                      style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                  </div>
                                  <span className={cn(
                                    "text-xs font-bold tabular-nums w-12 text-left",
                                    percentage >= 100 ? "text-red-600" : percentage >= 80 ? "text-amber-600" : "text-emerald-600"
                                  )}>
                                    {percentage}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={remaining === 0 ? "destructive" : "outline"}
                                  className={cn(
                                    "font-mono text-xs",
                                    remaining > 0 && remaining <= 10 ? "bg-amber-50 text-amber-700 border-amber-200" : "",
                                    remaining > 10 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""
                                  )}
                                >
                                  {remaining === 0 ? "اكتمل" : remaining.toLocaleString("ar-DZ")}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
            )}

            {/* ─── جدول الهيئات ─────────────────────────────────────── */}
            {settings.eligibleEntities && settings.eligibleEntities.length > 0 && (
              <div>
                <h3 className="text-base font-bold flex items-center gap-2 text-slate-800 mb-3">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  حصص الهيئات والمنظمات
                  <Badge variant="secondary" className="mr-auto text-xs">
                    {settings.eligibleEntities.length} هيئة
                  </Badge>
                </h3>
                <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-l from-slate-50 to-slate-100/60">
                        <TableHead className="font-bold text-slate-700 w-16 text-center">#</TableHead>
                        <TableHead className="font-bold text-slate-700">الهيئة / المنظمة</TableHead>
                        <TableHead className="font-bold text-slate-700 text-center">المسجلون</TableHead>
                        <TableHead className="font-bold text-slate-700 text-center">الحصة</TableHead>
                        <TableHead className="font-bold text-slate-700 min-w-[140px]">نسبة الإنجاز</TableHead>
                        <TableHead className="font-bold text-slate-700 text-center">المتبقي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settings.eligibleEntities
                        .sort((a, b) => b.quota - a.quota)
                        .map((e, idx) => {
                          const percentage = e.quota > 0 ? Math.round((e.allocated / e.quota) * 100) : 0;
                          const remaining = Math.max(0, e.quota - e.allocated);
                          return (
                            <TableRow key={idx} className="hover:bg-slate-50/80 transition-colors">
                              <TableCell className="text-center text-muted-foreground font-mono text-xs">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="font-semibold whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-700 text-xs font-bold shrink-0">
                                    <Building2 className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="truncate max-w-[250px]" title={e.entityId?.name}>
                                    {e.entityId?.name || 'غير معروف'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-bold tabular-nums">
                                {e.allocated.toLocaleString("ar-DZ")}
                              </TableCell>
                              <TableCell className="text-center text-slate-500 tabular-nums">
                                {e.quota.toLocaleString("ar-DZ")}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all duration-700",
                                        percentage >= 100 ? "bg-red-500" : percentage >= 80 ? "bg-amber-500" : "bg-emerald-500"
                                      )}
                                      style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                  </div>
                                  <span className={cn(
                                    "text-xs font-bold tabular-nums w-12 text-left",
                                    percentage >= 100 ? "text-red-600" : percentage >= 80 ? "text-amber-600" : "text-emerald-600"
                                  )}>
                                    {percentage}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={remaining === 0 ? "destructive" : "outline"}
                                  className={cn(
                                    "font-mono text-xs",
                                    remaining > 0 && remaining <= 10 ? "bg-amber-50 text-amber-700 border-amber-200" : "",
                                    remaining > 10 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""
                                  )}
                                >
                                  {remaining === 0 ? "اكتمل" : remaining.toLocaleString("ar-DZ")}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
            )}

            {/* ملخص سفلي */}
            {settings.eligibleWilayas && settings.eligibleWilayas.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-500 bg-slate-50/80 rounded-xl border border-slate-200">
                <span>
                  إجمالي الحصص: <strong className="text-slate-700">
                    {settings.eligibleWilayas.reduce((s, w) => s + w.quota, 0).toLocaleString("ar-DZ")}
                  </strong>
                </span>
                <span>
                  إجمالي المسجلين: <strong className="text-indigo-600">
                    {settings.eligibleWilayas.reduce((s, w) => s + w.allocated, 0).toLocaleString("ar-DZ")}
                  </strong>
                </span>
                <span>
                  نسبة الإنجاز الإجمالية: <strong className={cn(
                    (() => {
                      const totalQ = settings.eligibleWilayas.reduce((s, w) => s + w.quota, 0);
                      const totalA = settings.eligibleWilayas.reduce((s, w) => s + w.allocated, 0);
                      return totalQ > 0 ? Math.round((totalA / totalQ) * 100) : 0;
                    })() >= 80 ? "text-emerald-600" : "text-amber-600"
                  )}>
                    {(() => {
                      const totalQ = settings.eligibleWilayas.reduce((s, w) => s + w.quota, 0);
                      const totalA = settings.eligibleWilayas.reduce((s, w) => s + w.allocated, 0);
                      return totalQ > 0 ? Math.round((totalA / totalQ) * 100) : 0;
                    })()}%
                  </strong>
                </span>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
