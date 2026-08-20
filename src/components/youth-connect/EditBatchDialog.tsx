"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api/client";

interface EditBatchDialogProps {
  batch: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBatchDialog({ batch, open, onOpenChange }: EditBatchDialogProps) {
  const [batchName, setBatchName] = useState("");
  const [batchDesc, setBatchDesc] = useState("");
  const [headless, setHeadless] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (batch && open) {
      setBatchName(batch.name || "");
      setBatchDesc(batch.description || "");
      setHeadless(batch.headless ?? true);
    }
  }, [batch, open]);

  const editBatchMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put(`/youth-connect/batches/${batch.id}`, {
        name: batchName,
        description: batchDesc,
        headless: headless,
        use_uc_mode: true,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("تم تحديث الدفعة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["youth-connect-batches"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.message || "حدث خطأ أثناء التحديث");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border/60 rounded-2xl shadow-2xl backdrop-blur-sm">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Edit className="w-5 h-5 text-primary" />
            </div>
            تعديل بيانات الدفعة
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">اسم الدفعة</Label>
            <Input 
              placeholder="مثال: دفعة مخيم الوفاء 2026" 
              className="rounded-xl"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">وصف إضافي (اختياري)</Label>
            <Textarea 
              placeholder="ملاحظات حول هذه الدفعة..." 
              className="h-24 rounded-xl resize-none"
              value={batchDesc}
              onChange={(e) => setBatchDesc(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between p-4 border border-border/50 rounded-xl bg-accent/20">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">وضع التشغيل الخفي (Headless)</Label>
              <p className="text-xs text-muted-foreground">تشغيل المتصفح في الخلفية دون عرض الواجهة الرسومية</p>
            </div>
            <Switch checked={headless} onCheckedChange={setHeadless} />
          </div>
        </div>

        <DialogFooter className="flex items-center gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">إلغاء</Button>
          <Button 
            onClick={() => editBatchMutation.mutate()} 
            disabled={editBatchMutation.isPending || !batchName}
            className="rounded-xl"
          >
            {editBatchMutation.isPending ? (
              <><Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> جاري التحديث...</>
            ) : (
              <>حفظ التعديلات</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
