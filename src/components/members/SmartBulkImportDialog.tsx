import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wand2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { membersApi } from "@/lib/api/members";

export function SmartBulkImportDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetDir, setTargetDir] = useState("/home/nasser/CAMP_2026/bousaada2");

  const handleSubmit = async () => {
    if (!targetDir.trim()) {
      toast.error("يرجى إدخال المسار");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await membersApi.smartBulkImport(targetDir);
      toast.success(res.message || "تم بدء عملية الاستيراد في الخلفية");
      setOpen(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "فشل في بدء عملية الاستيراد");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
          <Wand2 className="w-4 h-4 mr-2" />
          الاستيراد السحري
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>الاستيراد الذكي المجمع (Smart Bulk Import)</DialogTitle>
          <DialogDescription>
            سيتم قراءة جميع المجلدات داخل المسار المحدد واستخراج بيانات الأطفال والأولياء آلياً باستخدام الذكاء الاصطناعي.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="target-dir">مسار المجلد الرئيسي (المربوط في Docker)</Label>
            <Input
              id="target-dir"
              value={targetDir}
              onChange={(e) => setTargetDir(e.target.value)}
              placeholder="/home/nasser/CAMP_2026/batch_name"
              dir="ltr"
              className="text-left font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              يجب أن يحتوي المجلد على مجلدات فرعية بأسماء الأطفال، وبداخل كل منها صورة `jpg` وملفات الوثائق `pdf`.
            </p>
          </div>
        </div>
        <DialogFooter className="flex justify-between items-center w-full sm:justify-between">
          <Button 
            variant="destructive" 
            onClick={async () => {
              try {
                await membersApi.stopSmartBulkImport(targetDir);
                toast.success("تم إرسال أمر التوقف بنجاح");
              } catch (e) {
                toast.error("حدث خطأ أثناء محاولة الإيقاف");
              }
            }}
          >
            إيقاف العملية الجارية
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
              بدء الاستخراج
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
