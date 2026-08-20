"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { CloudDownload, Eye, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { ministerialSyncApi, MinisterialSyncImport, MinisterialSyncImportDetail } from "@/lib/api/ministerial_sync";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  success: "default",
  completed: "default",
  pending: "secondary",
  running: "outline",
  failed: "destructive",
  partial: "secondary",
};

interface MinisterialSyncHistoryProps {
  refreshTrigger?: number;
}

export function MinisterialSyncHistory({ refreshTrigger = 0 }: MinisterialSyncHistoryProps) {
  const t = useTranslations("ministerial-sync");
  const [imports, setImports] = useState<MinisterialSyncImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImport, setSelectedImport] = useState<MinisterialSyncImportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  const fetchImports = async () => {
    try {
      setLoading(true);
      const response = await ministerialSyncApi.getImports();
      setImports(response.data.items ?? []);
    } catch (err) {
      console.error("Failed to load sync imports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImports();
  }, [refreshTrigger]);

  useEffect(() => {
    const hasRunning = imports.some(imp => imp.status === 'RUNNING');
    if (hasRunning) {
      const interval = setInterval(() => {
        fetchImports();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [imports]);

  const handleViewDetails = async (id: string) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const response = await ministerialSyncApi.getImportDetail(id);
      setSelectedImport(response.data);
    } catch (err) {
      console.error("Failed to load import details", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = STATUS_VARIANTS[status] || "secondary";
    const statusKey = `status_${status}`;
    return <Badge variant={variant}>{t(statusKey)}</Badge>;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleString("ar-DZ", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Pagination
  const totalPages = Math.ceil(imports.length / pageSize);
  const paginatedImports = imports.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (imports.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        <CloudDownload className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-700">{t("history_empty")}</h3>
        <p className="text-slate-500 mb-2 max-w-sm mx-auto">{t("history_empty_desc")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80">
              <TableHead className="font-bold text-slate-700">{t("history_table_date")}</TableHead>
              <TableHead className="font-bold text-slate-700">{t("history_table_status")}</TableHead>
              <TableHead className="font-bold text-slate-700 text-center">{t("history_table_fetched")}</TableHead>
              <TableHead className="font-bold text-slate-700 text-center">{t("history_table_new")}</TableHead>
              <TableHead className="font-bold text-slate-700 text-center">{t("history_table_duplicates")}</TableHead>
              <TableHead className="font-bold text-slate-700 text-center">{t("history_table_errors")}</TableHead>
              <TableHead className="font-bold text-slate-700">{t("history_table_by")}</TableHead>
              <TableHead className="font-bold text-slate-700 text-center">{t("history_table_actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedImports.map((imp) => (
              <TableRow key={imp.id} className="hover:bg-slate-50 transition-colors">
                <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                  {formatDate(imp.started_at || imp.completed_at)}
                </TableCell>
                <TableCell>{getStatusBadge(imp.status)}</TableCell>
                <TableCell className="text-center font-medium">{imp.total_fetched}</TableCell>
                <TableCell className="text-center font-medium text-emerald-600">{imp.total_new}</TableCell>
                <TableCell className="text-center font-medium text-amber-600">{imp.total_duplicates}</TableCell>
                <TableCell className="text-center font-medium">
                  {imp.total_errors > 0 ? (
                    <span className="text-red-600">{imp.total_errors}</span>
                  ) : (
                    <span className="text-slate-400">0</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {imp.created_by_name || "-"}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-8"
                    onClick={() => handleViewDetails(imp.id)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {t("history_view_details")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            className="gap-1"
          >
            <ChevronRight className="h-4 w-4" />
            السابق
          </Button>
          <span className="text-sm text-slate-500">
            صفحة {currentPage + 1} من {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            className="gap-1"
          >
            التالي
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>{t("details_title")}</DialogTitle>
            <DialogDescription />
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : selectedImport ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-bold text-slate-600">{t("details_id")}:</span>
                  <p className="text-slate-500 font-mono text-xs mt-0.5">{selectedImport.id}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-600">{t("history_table_status")}:</span>
                  <div className="mt-0.5">{getStatusBadge(selectedImport.status)}</div>
                </div>
                <div>
                  <span className="font-bold text-slate-600">{t("details_started")}:</span>
                  <p className="text-slate-500 mt-0.5">{formatDate(selectedImport.started_at)}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-600">{t("details_completed")}:</span>
                  <p className="text-slate-500 mt-0.5">{formatDate(selectedImport.completed_at)}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 py-3 border-t border-b border-slate-100">
                <div className="text-center">
                  <div className="text-xs text-slate-500 font-bold mb-1">{t("history_table_fetched")}</div>
                  <div className="text-lg font-black text-slate-900">{selectedImport.total_fetched}</div>
                </div>
                <div className="text-center border-r border-slate-100">
                  <div className="text-xs text-slate-500 font-bold mb-1">{t("history_table_new")}</div>
                  <div className="text-lg font-black text-emerald-600">{selectedImport.total_new}</div>
                </div>
                <div className="text-center border-r border-slate-100">
                  <div className="text-xs text-slate-500 font-bold mb-1">{t("history_table_duplicates")}</div>
                  <div className="text-lg font-black text-amber-600">{selectedImport.total_duplicates}</div>
                </div>
                <div className="text-center border-r border-slate-100">
                  <div className="text-xs text-slate-500 font-bold mb-1">{t("history_table_errors")}</div>
                  <div className="text-lg font-black text-red-600">{selectedImport.total_errors}</div>
                </div>
              </div>

              {selectedImport.error_message && (
                <div>
                  <span className="font-bold text-red-600">{t("details_error")}:</span>
                  <p className="text-red-500 bg-red-50 p-3 rounded-lg mt-1 text-xs leading-relaxed">
                    {selectedImport.error_message}
                  </p>
                </div>
              )}

              {selectedImport.accounts_used && selectedImport.accounts_used.length > 0 && (
                <div>
                  <span className="font-bold text-slate-600">{t("details_accounts")}:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedImport.accounts_used.map((acc, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {acc}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedImport.municipalities_filtered && selectedImport.municipalities_filtered.length > 0 && (
                <div>
                  <span className="font-bold text-slate-600">{t("details_municipalities")}:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedImport.municipalities_filtered.map((mun, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {mun}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedImport.imported_child_ids && selectedImport.imported_child_ids.length > 0 && (
                <div>
                  <span className="font-bold text-slate-600">{t("details_imported_children")}:</span>
                  <p className="text-slate-500 mt-0.5">{selectedImport.imported_child_ids.length} طفل</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-slate-500 py-4">لا توجد تفاصيل</p>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              {t("details_close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
