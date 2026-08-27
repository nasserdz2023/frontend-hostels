"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { youthHostelsApi, YouthHostel, FinancialReceipt } from "@/lib/api/youth-hostels";
import {
  Wallet,
  Receipt,
  Printer,
  Calendar,
  ArrowLeft,
  Plus,
  Ban,
  TrendingUp,
  FileText,
  CreditCard,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function FinancialRegistryPage() {
  const t = useTranslations("youth_hostels");
  const router = useRouter();

  const [hostels, setHostels] = useState<YouthHostel[]>([]);
  const [selectedHostel, setSelectedHostel] = useState<string>("");
  const [receipts, setReceipts] = useState<FinancialReceipt[]>([]);
  const [journal, setJournal] = useState<{
    date: string;
    hostel_id: string;
    receipts_count: number;
    total_amount: number;
    receipts: any[];
  } | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReceiptId, setCancelReceiptId] = useState<string>("");
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    loadHostels();
  }, []);

  useEffect(() => {
    if (selectedHostel) {
      loadData();
    }
  }, [selectedHostel, selectedDate]);

  const loadHostels = async () => {
    try {
      const data = await youthHostelsApi.getHostels();
      setHostels(data);
      if (data.length > 0) {
        setSelectedHostel(data[0].id);
      }
    } catch (error) {
      console.error("Error loading hostels:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    if (!selectedHostel) return;
    setIsLoading(true);
    try {
      const [receiptsData, journalData] = await Promise.all([
        youthHostelsApi.getReceipts(selectedHostel),
        youthHostelsApi.getDailyJournal(selectedHostel, selectedDate),
      ]);
      setReceipts(receiptsData);
      setJournal(journalData);
    } catch (error) {
      console.error("Error loading financial data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelReceipt = async () => {
    if (!cancelReceiptId || !cancelReason) return;
    try {
      await youthHostelsApi.cancelReceipt(cancelReceiptId, cancelReason);
      setIsCancelDialogOpen(false);
      setCancelReceiptId("");
      setCancelReason("");
      loadData();
      toast.success(t("receipt_cancelled"));
    } catch (error) {
      console.error("Error cancelling receipt:", error);
      toast.error(t("receipt_cancel_error"));
    }
  };

  const handlePrintJournal = () => {
    if (!journal || !selectedHostel) return;
    const hostel = hostels.find(h => h.id === selectedHostel);
    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`
      <html dir="rtl" lang="ar">
      <head>
        <title>${t("daily_journal_title")} - ${selectedDate}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: right; }
          th { background-color: #f0f0f0; }
          h1 { text-align: center; margin-bottom: 5px; font-size: 18px; }
          h2 { text-align: center; color: #555; font-size: 14px; }
          .header-info { display: flex; justify-content: space-between; margin-bottom: 20px; border: 1px solid #ccc; padding: 10px; }
          .total-box { margin-top: 20px; padding: 15px; border: 2px solid #000; text-align: center; font-size: 18px; font-weight: bold; }
          .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
          .sig-box { text-align: center; width: 200px; }
          .sig-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 5px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>${t("algerian_republic")}</h1>
        <h2>${t("daily_journal_title")}</h2>
        <hr style="margin: 15px 0;" />
        
        <div class="header-info">
          <div><strong>${t("institution")}:</strong> ${hostel?.name_ar || ""}</div>
          <div><strong>${t("date")}:</strong> ${selectedDate}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>${t("receipt_number")}</th>
              <th>${t("amount_dzd")}</th>
              <th>${t("payment_method")}</th>
              <th>${t("time")}</th>
              <th>${t("status")}</th>
            </tr>
          </thead>
          <tbody>
            ${journal.receipts?.map((r: any) => `
              <tr style="${r.is_cancelled ? 'text-decoration: line-through; color: #999;' : ''}">
                <td>${r.receipt_number || '-'}</td>
                <td>${r.amount?.toLocaleString('ar-DZ')} دج</td>
                <td>${r.payment_method === 'CASH' ? t('cash') : r.payment_method === 'BANK_TRANSFER' ? t('bank_transfer') : r.payment_method || '-'}</td>
                <td>${r.issued_at ? new Date(r.issued_at).toLocaleTimeString('ar-DZ') : '-'}</td>
                <td>${r.is_cancelled ? t('cancelled') : t('valid')}</td>
              </tr>
            `).join('') || '<tr><td colspan="5" style="text-align:center;">' + t('no_receipts_today') + '</td></tr>'}
          </tbody>
        </table>

        <div class="total-box">
          ${t("total")}: ${journal.total_amount?.toLocaleString('ar-DZ') || 0} دج
          <br/>
          <small style="font-size: 12px; color: #555;">${t("receipts_count")}: ${journal.receipts_count || 0}</small>
        </div>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-line">${t("accountant_signature")}</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">${t("director_signature")}</div>
          </div>
        </div>

        <script>
          setTimeout(() => { window.print(); }, 500);
        </script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const activeReceipts = receipts.filter(r => !r.is_cancelled);
  const cancelledReceipts = receipts.filter(r => r.is_cancelled);
  const totalAmount = activeReceipts.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            السجل المالي - يومية الصندوق
          </h1>
          <p className="text-muted-foreground">
            Brouillard de Caisse - وصولات الدفع والمداخيل اليومية
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs mb-1 block">بيت الشباب</Label>
          <Select value={selectedHostel} onValueChange={setSelectedHostel}>
            <SelectTrigger>
              <SelectValue placeholder="اختر بيت الشباب" />
            </SelectTrigger>
            <SelectContent>
              {hostels.map(h => (
                <SelectItem key={h.id} value={h.id}>{h.name_ar}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[180px]">
          <Label className="text-xs mb-1 block">تاريخ اليومية</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        <div className="flex items-end gap-2">
          <Button variant="outline" onClick={handlePrintJournal} disabled={!journal}>
            <Printer className="h-4 w-4 mr-2" />
            طباعة يومية الصندوق
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{totalAmount.toLocaleString('ar-DZ')} دج</p>
                <p className="text-xs text-muted-foreground">إجمالي المداخيل</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{activeReceipts.length}</p>
                <p className="text-xs text-muted-foreground">وصولات صالحة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Ban className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{cancelledReceipts.length}</p>
                <p className="text-xs text-muted-foreground">وصولات ملغاة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Banknote className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {journal?.total_amount?.toLocaleString('ar-DZ') || 0} دج
                </p>
                <p className="text-xs text-muted-foreground">مداخيل اليوم المحدد</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Receipts Table */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : receipts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">لا توجد وصولات مالية بعد</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              سجل الوصولات المالية
            </CardTitle>
            <CardDescription>
              Registre des quittances - القائمة الكاملة مع مسار التدقيق
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-right p-3 font-medium">رقم الوصل</th>
                    <th className="text-right p-3 font-medium">المبلغ</th>
                    <th className="text-right p-3 font-medium">طريقة الدفع</th>
                    <th className="text-right p-3 font-medium">تاريخ الإصدار</th>
                    <th className="text-right p-3 font-medium">الحالة</th>
                    <th className="text-right p-3 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((receipt) => (
                    <tr
                      key={receipt.id}
                      className={`border-b hover:bg-muted/30 ${receipt.is_cancelled ? 'opacity-50 line-through' : ''}`}
                    >
                      <td className="p-3">
                        <span className="font-mono font-bold">{receipt.receipt_number}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-green-600">
                          {receipt.amount.toLocaleString('ar-DZ')} دج
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          {receipt.payment_method === 'CASH' ? (
                            <><Banknote className="h-3 w-3" /> نقدي</>
                          ) : receipt.payment_method === 'BANK_TRANSFER' ? (
                            <><CreditCard className="h-3 w-3" /> تحويل بنكي</>
                          ) : (
                            receipt.payment_method
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        {format(new Date(receipt.issued_at), "dd/MM/yyyy HH:mm")}
                      </td>
                      <td className="p-3">
                        {receipt.is_cancelled ? (
                          <Badge variant="destructive">ملغى</Badge>
                        ) : (
                          <Badge className="bg-green-500">صالح</Badge>
                        )}
                        {receipt.cancellation_reason && (
                          <p className="text-xs text-red-500 mt-1">{receipt.cancellation_reason}</p>
                        )}
                      </td>
                      <td className="p-3">
                        {!receipt.is_cancelled && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => {
                              setCancelReceiptId(receipt.id);
                              setIsCancelDialogOpen(true);
                            }}
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            إلغاء
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إلغاء وصل الدفع</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              ⚠️ إلغاء الوصل لا يحذفه بل يجعله غير صالح مع الحفاظ على مسار التدقيق (Audit Trail).
              يرجى ذكر سبب الإلغاء.
            </p>
            <div className="space-y-2">
              <Label>سبب الإلغاء *</Label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="مثال: خطأ في المبلغ، إلغاء الحجز..."
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
                تراجع
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelReceipt}
                disabled={!cancelReason}
              >
                تأكيد الإلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
