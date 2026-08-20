import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import api from "@/lib/api/client";
import { useRouter } from "@/i18n/routing";

export function CreateBatchDialog({ isOpen, onClose, selectedMembers, onSuccess }: any) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [headless, setHeadless] = useState(true);
  const [workers, setWorkers] = useState(1);
  const [taskType, setTaskType] = useState("registration");
  const [registrationMethod, setRegistrationMethod] = useState("institution_account");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async () => {
    if (!name) return toast.error("الرجاء إدخال اسم الدفعة");
    if (workers < 1 || workers > 10) return toast.error("عدد العمال يجب أن يكون بين 1 و 10");
    
    setIsLoading(true);
    try {
      const response = await api.post("/youth-connect/batches", {
        name,
        description,
        headless,
        use_uc_mode: true,
        concurrent_workers: Number(workers),
        task_type: taskType,
        registration_method: registrationMethod,
        member_ids: Array.from(selectedMembers)
      });
      
      const batchId = response.data?.id;
      if (batchId) {
        // Automatically start the processing for this batch
        await api.post(`/youth-connect/batches/${batchId}/run?method=${registrationMethod}`);
      }
      
      toast.success("تم إنشاء الدفعة وإرسالها للبوت بنجاح");
      onSuccess();
      onClose();
      
      // Redirect to the bot batch details page to view progress
      if (batchId) {
        router.push(`/youth-connect/${batchId}`);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "حدث خطأ أثناء إنشاء الدفعة");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إرسال لمنصة الوزارة (YouthConnect)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
            <p className="text-sm text-gray-500">تم تحديد {selectedMembers.size} منخرط للإرسال كدفعة تسجيل.</p>
            <div>
                <label className="text-sm font-medium mb-1 block">اسم الدفعة</label>
                <Input placeholder="مثال: تسجيلات شهر ماي" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
                <label className="text-sm font-medium mb-1 block">وصف (اختياري)</label>
                <Input placeholder="أدخل وصفاً للدفعة" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            
            <div>
                <label className="text-sm font-medium mb-1 block">نوع المهمة</label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={taskType}
                  onChange={e => setTaskType(e.target.value)}
                >
                  <option value="registration">التسجيل الأولي (انشاء الحساب)</option>
                  <option value="complete_data">إكمال البيانات الشخصية</option>
                  <option value="fetch_number">جلب رقم الانخراط</option>
                  <option value="subscribe_institution">الانخراط في المؤسسة</option>
                  <option value="auto">تلقائي (حسب حالة كل منخرط)</option>
                </select>
            </div>
            
            <div>
                <label className="text-sm font-medium mb-1 block">طريقة التسجيل</label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
                  value={registrationMethod}
                  onChange={e => setRegistrationMethod(e.target.value)}
                >
                  <option value="institution_account">عبر حساب المؤسسة (آلي، بدون كابتشا) - 🚀 يوصى به</option>
                  <option value="api">سريع (API)</option>
                  <option value="hybrid">هجين (Bot + API)</option>
                </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium mb-1 block">عدد العمال (للبوت فقط)</label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="10" 
                      value={workers} 
                      onChange={e => setWorkers(parseInt(e.target.value) || 1)} 
                      disabled={registrationMethod !== 'hybrid'}
                    />
                </div>
                <div className="flex flex-col justify-center pt-6">
                    <div className="flex items-center gap-2">
                        <Checkbox 
                          id="headless-mode" 
                          checked={headless} 
                          onCheckedChange={(checked) => setHeadless(!!checked)} 
                        />
                        <label htmlFor="headless-mode" className="text-sm font-medium cursor-pointer">
                            تشغيل مخفي (Headless)
                        </label>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 mr-6">إلغاء التحديد سيظهر المتصفح</p>
                </div>
            </div>

            <div className="pt-2">
                <Button className="w-full" onClick={handleSubmit} disabled={isLoading || selectedMembers.size === 0}>
                    {isLoading ? "جاري الإنشاء..." : "تأكيد وإرسال للبوت"}
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
