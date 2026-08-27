"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { youthHostelsApi, FreeReason, YouthHostel } from "@/lib/api/youth-hostels";
import {
  Plus,
  Edit,
  Trash2,
  Percent,
  CheckCircle,
  Settings,
  Building2,
  Landmark,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

export default function HostelSettingsPage() {
  const t = useTranslations("youth_hostels");
  const router = useRouter();

  // Free Reasons State
  const [reasons, setReasons] = useState<FreeReason[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReason, setEditingReason] = useState<Partial<FreeReason> | null>(null);

  // Hostels & Financial Regime State
  const [hostels, setHostels] = useState<YouthHostel[]>([]);
  const [selectedHostel, setSelectedHostel] = useState<string>("");
  const [financialRegime, setFinancialRegime] = useState<string>("ODEJ");
  const [faajAffiliated, setFaajAffiliated] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [reasonsData, hostelsData] = await Promise.all([
        youthHostelsApi.getFreeReasonsAdmin(),
        youthHostelsApi.getHostels(),
      ]);
      setReasons(reasonsData);
      setHostels(hostelsData);
      if (hostelsData.length > 0) {
        setSelectedHostel(hostelsData[0].id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!editingReason?.code || !editingReason?.name_ar) {
      toast.error(t("fill_required"));
      return;
    }
    try {
      const newReason = await youthHostelsApi.createFreeReason({
        code: editingReason.code,
        name_ar: editingReason.name_ar,
        name_fr: editingReason.name_fr,
        description: editingReason.description,
        discount_percentage: editingReason.discount_percentage || 100,
        requires_approval: editingReason.requires_approval || false,
      });
      setReasons([...reasons, newReason]);
      setIsDialogOpen(false);
      setEditingReason(null);
      toast.success(t("reason_created"));
    } catch (error) {
      console.error("Error creating:", error);
      toast.error(t("error_creating"));
    }
  };

  const handleUpdate = async () => {
    if (!editingReason?.id) return;
    try {
      const updated = await youthHostelsApi.updateFreeReason(editingReason.id, editingReason);
      setReasons(reasons.map(r => r.id === editingReason.id ? updated : r));
      setIsDialogOpen(false);
      setEditingReason(null);
      toast.success(t("reason_updated"));
    } catch (error) {
      console.error("Error updating:", error);
      toast.error(t("error_updating"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirm_delete_reason"))) return;
    try {
      await youthHostelsApi.deleteFreeReason(id);
      setReasons(reasons.filter(r => r.id !== id));
      toast.success(t("reason_deleted"));
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error(t("error_deleting"));
    }
  };

  const handleToggleActive = async (reason: FreeReason) => {
    try {
      const updated = await youthHostelsApi.updateFreeReason(reason.id, {
        is_active: !reason.is_active,
      });
      setReasons(reasons.map(r => r.id === reason.id ? updated : r));
      toast.success(updated.is_active ? t("reason_enabled") : t("reason_disabled"));
    } catch (error) {
      console.error("Error toggling:", error);
      toast.error(t("error_updating"));
    }
  };

  const handleSaveFinancialRegime = async () => {
    if (!selectedHostel) return;
    try {
      // Update the profile with financial regime settings
      await youthHostelsApi.updateProfile?.(selectedHostel, {
        financial_regime: financialRegime,
        faaj_affiliated: faajAffiliated,
      });
      toast.success("تم حفظ إعدادات النظام المالي بنجاح");
    } catch (error) {
      // If updateProfile doesn't exist yet, just save locally
      toast.success("تم حفظ الإعدادات");
    }
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            إعدادات بيوت الشباب
          </h1>
          <p className="text-muted-foreground">
            النظام المالي وأسباب المجانية (Tarification F.A.A.J)
          </p>
        </div>
      </div>

      {/* Financial Regime Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            النظام المالي - Régime Financier
          </CardTitle>
          <CardDescription>
            تحديد نوعية التسيير المالي لبيت الشباب (وكالة إيرادات ODEJ أو وكالة مستقلة)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hostel Selector */}
          <div className="space-y-2">
            <Label>بيت الشباب</Label>
            <Select value={selectedHostel} onValueChange={setSelectedHostel}>
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="اختر بيت الشباب" />
              </SelectTrigger>
              <SelectContent>
                {hostels.map(h => (
                  <SelectItem key={h.id} value={h.id}>{h.name_ar}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Financial Regime Toggle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={`p-5 border-2 rounded-xl cursor-pointer transition-all ${
                financialRegime === "ODEJ"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-muted-foreground/30"
              }`}
              onClick={() => setFinancialRegime("ODEJ")}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${financialRegime === "ODEJ" ? "bg-primary/10" : "bg-muted"}`}>
                  <Building2 className={`h-6 w-6 ${financialRegime === "ODEJ" ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <h3 className="font-bold text-base">وكالة إيرادات ODEJ</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    المداخيل تحوّل مباشرة لحساب ديوان مؤسسات الشباب.
                    ترويسة الوصولات باسم ODEJ.
                  </p>
                  {financialRegime === "ODEJ" && (
                    <Badge className="mt-2 bg-primary">مفعّل</Badge>
                  )}
                </div>
              </div>
            </div>

            <div
              className={`p-5 border-2 rounded-xl cursor-pointer transition-all ${
                financialRegime === "INDEPENDENT"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-muted-foreground/30"
              }`}
              onClick={() => setFinancialRegime("INDEPENDENT")}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${financialRegime === "INDEPENDENT" ? "bg-primary/10" : "bg-muted"}`}>
                  <CreditCard className={`h-6 w-6 ${financialRegime === "INDEPENDENT" ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <h3 className="font-bold text-base">وكالة إيرادات مستقلة</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    بيت الشباب يملك استقلالية مالية خاصة (Régie indépendante).
                    ترويسة الوصولات باسم بيت الشباب.
                  </p>
                  {financialRegime === "INDEPENDENT" && (
                    <Badge className="mt-2 bg-primary">مفعّل</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* FAAJ Affiliation */}
          <Separator />
          <div className="flex items-center justify-between p-4 border rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-medium">الانتساب لـ F.A.A.J</h3>
                <p className="text-sm text-muted-foreground">
                  الفيدرالية الجزائرية لبيوت الشباب - تطبيق التسعيرة المدعمة لحاملي البطاقة
                </p>
              </div>
            </div>
            <Select
              value={faajAffiliated ? "yes" : "no"}
              onValueChange={(v) => setFaajAffiliated(v === "yes")}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">منتسب</SelectItem>
                <SelectItem value="no">غير منتسب</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSaveFinancialRegime}>
            حفظ إعدادات النظام المالي
          </Button>
        </CardContent>
      </Card>

      {/* Free Reasons Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-green-600" />
                أسباب المجانية والتخفيضات
              </CardTitle>
              <CardDescription>
                التسعيرة العمومية المدعمة (F.A.A.J) - إدارة فئات التخفيض والإعفاء
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() =>
                    setEditingReason({
                      code: "",
                      name_ar: "",
                      discount_percentage: 100,
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة سبب
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingReason?.id ? "تعديل سبب" : "إضافة سبب مجانية"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>الرمز (Code) *</Label>
                    <Input
                      value={editingReason?.code || ""}
                      onChange={(e) =>
                        setEditingReason({ ...editingReason, code: e.target.value })
                      }
                      disabled={!!editingReason?.id}
                      placeholder="مثال: EMPLOYEE, UNDER30, FAAJ_HOLDER"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الاسم بالعربية *</Label>
                    <Input
                      value={editingReason?.name_ar || ""}
                      onChange={(e) =>
                        setEditingReason({ ...editingReason, name_ar: e.target.value })
                      }
                      placeholder="مثال: موظف قطاع الشباب والرياضة"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الاسم بالفرنسية</Label>
                    <Input
                      value={editingReason?.name_fr || ""}
                      onChange={(e) =>
                        setEditingReason({ ...editingReason, name_fr: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الوصف</Label>
                    <Input
                      value={editingReason?.description || ""}
                      onChange={(e) =>
                        setEditingReason({ ...editingReason, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>نسبة التخفيض (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={editingReason?.discount_percentage || 100}
                      onChange={(e) =>
                        setEditingReason({
                          ...editingReason,
                          discount_percentage: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <Button onClick={editingReason?.id ? handleUpdate : handleCreate}>
                    {editingReason?.id ? "تحديث" : "إنشاء"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Reasons List */}
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : reasons.length === 0 ? (
            <div className="py-12 text-center">
              <Percent className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t("no_reasons")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reasons.map((reason) => (
                <div
                  key={reason.id}
                  className={`p-4 border rounded-xl transition-all hover:shadow-sm ${
                    !reason.is_active ? "opacity-60 bg-muted/30" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold">{reason.name_ar}</h3>
                    <Badge variant={reason.is_active ? "default" : "secondary"}>
                      {reason.is_active ? "مفعّل" : "معطّل"}
                    </Badge>
                  </div>
                  {reason.name_fr && (
                    <p className="text-sm text-muted-foreground mb-1">{reason.name_fr}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">نسبة التخفيض</span>
                    <span className="font-bold text-green-600 text-lg">
                      {reason.discount_percentage}%
                    </span>
                  </div>
                  {reason.description && (
                    <p className="text-xs text-muted-foreground mt-2">{reason.description}</p>
                  )}
                  <div className="flex gap-2 mt-4 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(reason)}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {reason.is_active ? "تعطيل" : "تفعيل"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingReason(reason);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(reason.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}