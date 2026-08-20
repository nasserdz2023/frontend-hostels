'use client';

import { useState } from "react";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { membersApi, Member } from "@/lib/api/members";
import { 
  Search, 
  Users, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Bot, 
  Loader2,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import api from "@/lib/api/client";

interface CreateBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBatchDialog({ open, onOpenChange }: CreateBatchDialogProps) {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchName, setBatchName] = useState("");
  const [batchDesc, setBatchDesc] = useState("");
  const [headless, setHeadless] = useState(true);
  const [concurrentWorkers, setConcurrentWorkers] = useState(1);
  const [registrationMethod, setRegistrationMethod] = useState("hybrid");
  const queryClient = useQueryClient();

  // Fetch members
  const { data: membersData, isLoading: isLoadingMembers } = useQuery({
    queryKey: ["members-for-batch", searchQuery],
    queryFn: async () => {
      const res = await membersApi.list({ search: searchQuery, size: 50 });
      return res.data.items;
    },
    enabled: open && step === 1,
  });

  const createBatchMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/youth-connect/batches", {
        name: batchName,
        description: batchDesc,
        member_ids: selectedIds,
        headless: headless,
        use_uc_mode: true,
        concurrent_workers: concurrentWorkers,
        registration_method: registrationMethod,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("تم إنشاء الدفعة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["youth-connect-batches"] });
      onOpenChange(false);
      reset();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.message || "حدث خطأ أثناء الإنشاء");
    },
  });

  const reset = () => {
    setStep(1);
    setSelectedIds([]);
    setBatchName("");
    setBatchDesc("");
    setHeadless(true);
    setConcurrentWorkers(1);
    setRegistrationMethod("hybrid");
  };

  const toggleMember = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (membersData) {
      const allIds = membersData.map((m: any) => m.id);
      setSelectedIds(allIds);
    }
  };

  const nextStep = () => {
    if (step === 1 && selectedIds.length === 0) {
      toast.error("يرجى اختيار منخرط واحد على الأقل");
      return;
    }
    setStep(prev => prev + 1);
  };

  const prevStep = () => setStep(prev => prev - 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden p-0 gap-0 border-border/60 rounded-2xl shadow-2xl backdrop-blur-sm">
        <DialogHeader className="p-6 bg-gradient-to-l from-primary/[0.04] to-transparent border-b border-border/40">
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <span>إنشاء دفعة تسجيل جديدة</span>
          </DialogTitle>
        </DialogHeader>

        <div className="p-0">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 py-4 border-b border-border/40 bg-muted/10">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  step === s ? 'bg-primary text-primary-foreground scale-110 ring-2 ring-primary/20' : 
                  step > s ? 'bg-emerald-500 text-white' : 'bg-muted/50 text-muted-foreground'
                }`}>
                  {step > s ? <Check className="w-4 h-4" /> : s}
                </div>
                <span className={`text-xs font-medium ${step === s ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s === 1 ? 'اختيار المنخرطين' : s === 2 ? 'الإعدادات' : 'تأكيد'}
                </span>
                {s < 3 && <div className="w-8 h-px bg-border" />}
              </div>
            ))}
          </div>

          <div className="p-6 h-[400px]">
            {step === 1 && (
              <div className="space-y-4 h-full flex flex-col">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="ابحث عن منخرط بالاسم أو اللقب..." 
                    className="pr-10 rounded-xl"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-medium">
                    تم اختيار <span className="text-primary">{selectedIds.length}</span> منخرط
                  </span>
                  <Button variant="link" size="sm" onClick={selectAll} className="h-auto p-0 text-xs">
                    اختيار الكل في هذه الصفحة
                  </Button>
                </div>

                <ScrollArea className="flex-1 border border-border/50 rounded-xl p-2">
                  {isLoadingMembers ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground py-10">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="text-sm">جاري التحميل...</span>
                    </div>
                  ) : membersData?.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">لا يوجد نتائج</div>
                  ) : (
                    <div className="space-y-1">
                      {membersData?.map((member: any) => (
                        <div 
                          key={member.id}
                          className={`flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors ${
                            selectedIds.includes(member.id) ? 'bg-primary/5 border border-primary/10' : 'border border-transparent'
                          }`}
                          onClick={() => toggleMember(member.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox checked={selectedIds.includes(member.id)} className="border-border/60" />
                            <div>
                              <p className="text-sm font-medium">{member.first_name} {member.last_name}</p>
                              <p className="text-xs text-muted-foreground">{member.birth_date || 'تاريخ غير محدد'}</p>
                            </div>
                          </div>
                          {member.ministry_number && (
                            <Badge variant="outline" className="text-emerald-500 bg-emerald-500/5 border-emerald-500/20 text-[10px] rounded-lg">
                              مسجل مسبقاً
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}

            {step === 2 && (
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
                <div className="space-y-2">
                  <Label className="text-sm font-medium">عدد المسجلين في نفس الوقت (Workers)</Label>
                  <div className="flex gap-3 items-start">
                    <Input 
                      type="number"
                      min="1"
                      max="10"
                      className="w-24 rounded-xl"
                      value={concurrentWorkers}
                      onChange={(e) => setConcurrentWorkers(parseInt(e.target.value) || 1)}
                    />
                    <p className="text-sm text-muted-foreground pt-1.5">
                      كم عدد النوافذ المتزامنة التي تريد أن يستخدمها البوت لتسجيل هذه الدفعة؟ (من 1 إلى 10)
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">طريقة التسجيل</Label>
                  <select 
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background"
                    value={registrationMethod}
                    onChange={(e) => setRegistrationMethod(e.target.value)}
                  >
                    <option value="hybrid">⚡ سريع جداً (API + تدخل البوت عند الحاجة)</option>
                    <option value="bot">🤖 موثوق (التسجيل التقليدي عبر البوت بالكامل)</option>
                    <option value="api">💻 واجهة برمجية فقط (API Only - اختبار)</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-4 border border-border/50 rounded-xl bg-accent/20">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">وضع التشغيل الخفي (Headless)</Label>
                    <p className="text-xs text-muted-foreground">تشغيل المتصفح في الخلفية دون عرض الواجهة الرسومية</p>
                  </div>
                  <Switch checked={headless} onCheckedChange={setHeadless} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col items-center justify-center h-full space-y-5 text-center">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold">جاهز للبدء؟</h3>
                  <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                    سيتم إنشاء دفعة باسم <span className="font-semibold text-foreground">"{batchName}"</span> تحتوي على <span className="font-semibold text-foreground">{selectedIds.length}</span> منخرط.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm pt-2">
                  <div className="p-3.5 border border-border/50 rounded-xl bg-accent/20">
                    <p className="text-xs text-muted-foreground mb-1">عدد المنخرطين</p>
                    <p className="font-bold text-lg">{selectedIds.length}</p>
                  </div>
                  <div className="p-3.5 border border-border/50 rounded-xl bg-accent/20">
                    <p className="text-xs text-muted-foreground mb-1">وضع المتصفح</p>
                    <p className="font-bold text-sm">{headless ? 'خفي (Headless)' : 'مرئي (UC Mode)'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 border-t border-border/40 bg-gradient-to-l from-primary/[0.02] to-transparent flex items-center justify-between">
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={prevStep} className="rounded-xl">
                <ChevronRight className="w-4 h-4 ml-1.5" /> السابق
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">إلغاء</Button>
            {step < 3 ? (
              <Button onClick={nextStep} className="rounded-xl gap-1.5">
                التالي <ChevronLeft className="w-4 h-4 mr-1.5" />
              </Button>
            ) : (
              <Button 
                onClick={() => createBatchMutation.mutate()} 
                disabled={createBatchMutation.isPending || !batchName}
                className="rounded-xl"
              >
                {createBatchMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> جاري الإنشاء...</>
                ) : (
                  <>إنشاء الدفعة وبدء التسجيل</>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
