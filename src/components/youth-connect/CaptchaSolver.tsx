'use client';

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
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Send, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api, { getApiBaseUrl } from "@/lib/api/client";

interface CaptchaSolverProps {
  batchId: string;
  registrationId: string | null;
  memberName: string | null;
  imageUrl: string | null;
  onClose: () => void;
}

export function CaptchaSolver({ batchId, registrationId, memberName, imageUrl, onClose }: CaptchaSolverProps) {
  const [solution, setSolution] = useState("");
  const [isWaitingForNext, setIsWaitingForNext] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setIsWaitingForNext(false);
  }, [registrationId, imageUrl]);

  useEffect(() => {
    if (isWaitingForNext) {
      const timer = setTimeout(() => setIsWaitingForNext(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [isWaitingForNext]);

  const solveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/youth-connect/registrations/${registrationId}/solve`, { solution });
      return res.data;
    },
    onSuccess: () => {
      toast.success("تم إرسال الحل بنجاح، جاري المتابعة...");
      queryClient.invalidateQueries({ queryKey: ["youth-connect-batch", batchId] });
      queryClient.invalidateQueries({ queryKey: ["youth-connect-batches"] });
      setIsWaitingForNext(true);
      setSolution("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.message || "حدث خطأ أثناء الإرسال");
    }
  });

  return (
    <Dialog open={!!registrationId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md border-border/60 rounded-2xl shadow-2xl backdrop-blur-sm">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
              </div>
              <span>تحقق الأمان (Captcha) مطلوب</span>
            </div>
            {memberName && (
              <Badge variant="outline" className="text-[11px] font-normal border-border/60 rounded-lg px-2.5 py-0.5">
                {memberName}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-center text-muted-foreground max-w-xs">
              {isWaitingForNext ? "جاري تحميل الكابتشا الموالية..." : "يرجى إدخال الرمز الذي تراه في الصورة أدناه لمتابعة عملية التسجيل."}
            </p>
            
            <div className="relative group overflow-hidden rounded-xl border-2 border-primary/10 shadow-lg bg-white p-2">
              {isWaitingForNext ? (
                <div className="w-64 h-24 flex items-center justify-center bg-accent/10">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : imageUrl ? (
                <img 
                  src={`${imageUrl}?t=${new Date().getTime()}`} 
                  alt="Captcha" 
                  className="max-h-48 object-contain rounded"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.dataset.retried) {
                      target.dataset.retried = 'true';
                      setTimeout(() => {
                        target.src = `${imageUrl}?t=${new Date().getTime()}`;
                      }, 2000);
                    }
                  }}
                />
              ) : (
                <div className="w-64 h-24 flex items-center justify-center bg-accent/10 animate-pulse">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 text-xs h-8 rounded-lg"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["youth-connect-batch"] });
                setIsWaitingForNext(true);
                setTimeout(() => setIsWaitingForNext(false), 1000);
              }}
            >
              <RefreshCw className="w-3 h-3" /> تحديث الصورة
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="captcha" className="text-sm font-medium">الرمز الظاهر</Label>
            <Input 
              id="captcha"
              placeholder="أدخل الرمز هنا..."
              className="text-center text-2xl tracking-[0.5em] font-bold h-12 uppercase rounded-xl"
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && solution && solveMutation.mutate()}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <div className="flex items-center gap-2 w-full">
            <Button variant="ghost" onClick={onClose} className="rounded-xl">إلغاء</Button>
            <Button 
              className="gap-2 rounded-xl flex-1" 
              onClick={() => solveMutation.mutate()}
              disabled={!solution || solveMutation.isPending}
            >
              {solveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              تأكيد الحل والمتابعة
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
