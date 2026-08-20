"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Download, AlertTriangle, CheckCircle2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { membersApi } from "@/lib/api/members";
import { campRegistrationApi } from "@/lib/api/camp-registration";
import { institutionsApi, YouthInstitution } from "@/lib/api/institutions";

interface ImportFromCampDialogProps {
  onSuccess?: () => void;
}

export function ImportFromCampDialog({ onSuccess }: ImportFromCampDialogProps) {
  const t = useTranslations("members");
  const [isOpen, setIsOpen] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<YouthInstitution[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedInstitution, setSelectedInstitution] = useState<string>("");
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadBatches();
      loadInstitutions();
    }
  }, [isOpen]);

  const loadBatches = async () => {
    setIsLoadingBatches(true);
    try {
      const response = await campRegistrationApi.listBatches({ page: 1, page_size: 100 });
      setBatches(response.data.items || []);
    } catch (error) {
      toast.error("فشل في تحميل دفعات المخيم");
    } finally {
      setIsLoadingBatches(false);
    }
  };

  const loadInstitutions = async () => {
    setIsLoadingInstitutions(true);
    try {
      const response = await institutionsApi.getAll({ sector: 'YOUTH', size: 1000 });
      setInstitutions(response.items || []);
    } catch (error) {
      toast.error("فشل في تحميل المؤسسات");
    } finally {
      setIsLoadingInstitutions(false);
    }
  };

  const handleImport = async () => {
    if (!selectedBatchId) {
      toast.error("يرجى اختيار دفعة أولاً");
      return;
    }
    if (!selectedInstitution) {
      toast.error("يرجى اختيار المؤسسة أولاً");
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    try {
      const result = await membersApi.importFromCampBatch(selectedBatchId, selectedInstitution);
      setImportResult(result);
      toast.success(`تم استيراد ${result.successful} منخرط بنجاح`);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "فشل في الاستيراد");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          جلب من المخيم
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>جلب المسجلين من المخيم</DialogTitle>
          <DialogDescription>
            اختر دفعة من دفعات المخيم لاستيراد كافة المسجلين فيها كمنخرطين رسميين في المنصة.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">دفعة المخيم</label>
            <Select
              value={selectedBatchId}
              onValueChange={setSelectedBatchId}
              disabled={isLoadingBatches || isImporting}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingBatches ? "جاري التحميل..." : "اختر الدفعة"} />
              </SelectTrigger>
              <SelectContent>
                {batches.map((batch) => (
                  <SelectItem key={batch.id} value={batch.id}>
                    {batch.name} ({batch.total_children} طفل)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">المؤسسة المستهدفة</label>
            <Select
              value={selectedInstitution}
              onValueChange={setSelectedInstitution}
              disabled={isLoadingInstitutions || isImporting}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingInstitutions ? "جاري التحميل..." : "اختر المؤسسة"} />
              </SelectTrigger>
              <SelectContent>
                {institutions.map((inst) => (
                  <SelectItem key={inst.id} value={inst.name_ar}>
                    {inst.name_ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground italic">
              ملاحظة: سيتم توليد نشاطات عشوائية لكل منخرط مستورد
            </p>
          </div>

          {importResult && (
            <div className="p-3 rounded-md bg-green-50 border border-green-200 space-y-1">
              <div className="flex items-center gap-2 text-green-700 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>نتيجة الاستيراد:</span>
              </div>
              <ul className="text-sm text-green-600 space-y-1">
                <li>إجمالي المسجلين: {importResult.total}</li>
                <li>تم استيرادهم بنجاح: {importResult.successful}</li>
                <li>تخطي (موجودين مسبقاً): {importResult.skipped}</li>
              </ul>
            </div>
          )}

          {!importResult && !isImporting && (
            <div className="p-3 rounded-md bg-amber-50 border border-amber-200 flex gap-2 text-amber-700 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <p>
                سيتم التحقق من كل طفل قبل استيراده لمنع التكرار (الاعتماد على الاسم واللقب وتاريخ الميلاد).
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setIsOpen(false)}
            disabled={isImporting}
          >
            إغلاق
          </Button>
          {!importResult && (
            <Button
              onClick={handleImport}
              disabled={!selectedBatchId || !selectedInstitution || isImporting}
            >
              {isImporting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              بدء الاستيراد
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
