"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, CheckCircle2, UserPlus, MapPin, Building2 } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { membersApi } from "@/lib/api/members";
import { institutionsApi, YouthInstitution } from "@/lib/api/institutions";

interface MagicalGenerationDialogProps {
  onSuccess?: () => void;
}

const municipalities = [
  "بوسعادة",
  "جبل امساعد",
  "ولتام",
  "عين الريش",
  "امجدل",
  "أولاد سيدي ابراهيم",
  "سيدي عامر",
  "الخبانة",
  "اولاد سليمان",
  "عين الملح"
];

export function MagicalGenerationDialog({ onSuccess }: MagicalGenerationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [institutions, setInstitutions] = useState<YouthInstitution[]>([]);
  const [count, setCount] = useState<number>(10);
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>("بوسعادة");
  const [selectedInstitution, setSelectedInstitution] = useState<string>("");
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadInstitutions();
    }
  }, [isOpen]);

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

  const handleGenerate = async () => {
    if (count < 1 || count > 100) {
      toast.error("العدد يجب أن يكون بين 1 و 100");
      return;
    }
    if (!selectedInstitution) {
      toast.error("يرجى اختيار المؤسسة أولاً");
      return;
    }

    setIsGenerating(true);
    setGenerationResult(null);
    try {
      const result = await membersApi.magicalGenerate({
        count,
        institution: selectedInstitution,
        municipality: selectedMunicipality,
        save_to_db: true
      });
      
      setGenerationResult(result.data);
      toast.success(result.data.message || `تم توليد ${result.data.total_generated} منخرط بنجاح`);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "فشل في التوليد السحري");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 text-purple-700">
          <Sparkles className="w-4 h-4" />
          توليد سحري (AI)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-700">
            <Sparkles className="w-5 h-5" />
            التوليد السحري للمنخرطين
          </DialogTitle>
          <DialogDescription>
            استخدم الذكاء الاصطناعي لتوليد منخرطين وهميين ببيانات جزائرية منطقية (NIN، عناوين، مستويات دراسية) وحفظهم مباشرة.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-muted-foreground" />
              العدد المطلوب (Max 100)
            </label>
            <Input 
              type="number" 
              min={1} 
              max={100} 
              value={count} 
              onChange={(e) => setCount(parseInt(e.target.value))}
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              المؤسسة المستهدفة
            </label>
            <Select
              value={selectedInstitution}
              onValueChange={setSelectedInstitution}
              disabled={isLoadingInstitutions || isGenerating}
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
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              البلدية (الإقامة والميلاد)
            </label>
            <Select
              value={selectedMunicipality}
              onValueChange={setSelectedMunicipality}
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر البلدية" />
              </SelectTrigger>
              <SelectContent>
                {municipalities.map((mun) => (
                  <SelectItem key={mun} value={mun}>
                    {mun}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {generationResult && (
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-100 space-y-2 animate-in fade-in zoom-in duration-300">
              <div className="flex items-center gap-2 text-purple-700 font-bold">
                <CheckCircle2 className="w-5 h-5" />
                <span>نجحت العملية!</span>
              </div>
              <p className="text-sm text-purple-600">
                تم توليد وحفظ <strong>{generationResult.total_generated}</strong> منخرط في قاعدة البيانات بنجاح.
              </p>
              {generationResult.provider_used && (
                <div className="text-[10px] text-purple-400 italic">
                  تم التوليد بواسطة: {generationResult.provider_used}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setIsOpen(false);
              setGenerationResult(null);
            }}
            disabled={isGenerating}
          >
            إغلاق
          </Button>
          {!generationResult && (
            <Button
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md"
              onClick={handleGenerate}
              disabled={!selectedInstitution || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  جاري تحضير السحر...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  توليد الآن 🚀
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
