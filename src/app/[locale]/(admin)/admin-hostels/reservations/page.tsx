"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { youthHostelsApi, Reservation, YouthHostel } from "@/lib/api/youth-hostels";
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Printer,
  Calendar,
  Plus,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ReservationsPage() {
  const t = useTranslations("youth_hostels");
  const router = useRouter();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [hostels, setHostels] = useState<YouthHostel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    hostel_id: "",
    status: "",
    page: 1,
    size: 20
  });
  const [total, setTotal] = useState(0);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [resData, hostelData] = await Promise.all([
        youthHostelsApi.getReservations({
          hostel_id: filters.hostel_id || undefined,
          status: filters.status || undefined,
          page: filters.page,
          size: filters.size
        }),
        youthHostelsApi.getHostels()
      ]);
      setReservations(resData.items);
      setTotal(resData.total);
      setHostels(hostelData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const updated = await youthHostelsApi.approveReservation(id);
      setReservations(reservations.map(r => r.id === id ? updated : r));
      toast.success(t("reservation_approved"));
    } catch (error) {
      console.error("Error approving:", error);
      toast.error(t("error_approving"));
    }
  };

  const handleReject = async () => {
    if (!selectedReservation || !rejectReason) return;
    try {
      await youthHostelsApi.rejectReservation(selectedReservation.id, rejectReason);
      setIsRejectDialogOpen(false);
      setSelectedReservation(null);
      setRejectReason("");
      loadData();
      toast.success(t("reservation_rejected"));
    } catch (error) {
      console.error("Error rejecting:", error);
      toast.error(t("error_rejecting"));
    }
  };

  const handleCheckIn = async (id: string) => {
    try {
      const updated = await youthHostelsApi.checkIn(id);
      setReservations(reservations.map(r => r.id === id ? updated : r));
      toast.success(t("checked_in"));
    } catch (error) {
      console.error("Error check-in:", error);
      toast.error(t("error_checkin"));
    }
  };

  const handleCheckOut = async (id: string) => {
    try {
      const updated = await youthHostelsApi.checkOut(id);
      setReservations(reservations.map(r => r.id === id ? updated : r));
      toast.success(t("checked_out"));
    } catch (error) {
      console.error("Error check-out:", error);
      toast.error(t("error_checkout"));
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm(t("confirm_cancel"))) return;
    try {
      const updated = await youthHostelsApi.cancelReservation(id);
      setReservations(reservations.map(r => r.id === id ? updated : r));
      toast.success(t("reservation_cancelled"));
    } catch (error) {
      console.error("Error cancelling:", error);
      toast.error(t("error_cancelling"));
    }
  };

  const handlePrintPoliceForm = async (id: string, guestName: string) => {
    try {
      const data = await youthHostelsApi.getPoliceForm(id);
      const win = window.open('', '_blank');
      if(!win) return;
      win.document.write(`
          <html dir="rtl" lang="ar">
          <head><title>استمارة الشرطة - Fiche de Police</title>
          <style>
             body { font-family: Arial, sans-serif; padding: 40px; }
             table { width: 100%; border-collapse: collapse; margin-top: 20px; }
             th, td { border: 1px solid #000; padding: 10px; text-align: right; }
             h1 { text-align: center; margin-bottom: 5px; }
             h2 { text-align: center; color: #555; }
             .info-grid { display: grid; grid-template-columns: 1fr 1fr; margin-bottom: 20px; gap: 10px; }
          </style>
          </head>
          <body>
             <h1>الجمهورية الجزائرية الديمقراطية الشعبية</h1>
             <h2>استمارة الشرطة - Fiche de Police</h2>
             <hr style="margin: 20px 0;" />
             <h3>معلومات الحجز</h3>
             <div class="info-grid">
               <p><strong>اسم النزيل الرئيسي:</strong> ${guestName}</p>
               <p><strong>رقم الحجز:</strong> ${id.slice(0,8)}</p>
               <p><strong>تاريخ الدخول:</strong> ${new Date(data.reservation.check_in_date).toLocaleDateString('ar-DZ')}</p>
               <p><strong>تاريخ الخروج:</strong> ${new Date(data.reservation.check_out_date).toLocaleDateString('ar-DZ')}</p>
             </div>

             <h3>قائمة النزلاء (${data.guests.length})</h3>
             <table>
                <tr><th>الاسم واللقب</th><th>نوع الوثيقة</th><th>رقم الهوية</th><th>تاريخ ومكان الميلاد</th><th>الجنسية</th></tr>
                ${data.guests.map((g: any) => `
                   <tr>
                      <td>${g.full_name}</td>
                      <td>${g.id_document_type || '-'}</td>
                      <td>${g.id_document_number || '-'}</td>
                      <td>${g.date_of_birth || '-'} بـ ${g.place_of_birth || '-'}</td>
                      <td>${g.nationality || '-'}</td>
                   </tr>
                `).join('')}
                ${data.guests.length === 0 ? '<tr><td colspan="5" style="text-align:center;">لا يوجد مرافقين، النزيل بمفرده.</td></tr>' : ''}
             </table>

             <div style="margin-top: 50px; display: flex; justify-content: space-between;">
                <div style="text-align: center;"><p><strong>توقيع النزيل</strong></p></div>
                <div style="text-align: center;"><p><strong>توقيع مكتب الاستقبال</strong></p></div>
             </div>
             <script>
               setTimeout(() => { window.print(); window.close(); }, 500);
             </script>
          </body>
          </html>
      `);
      win.document.close();
    } catch(err) {
      console.error(err);
      toast.error("حدث خطأ أثناء تحميل بيانات الاستمارة");
    }
  };

  const handleIssueReceipt = async (reservation: Reservation) => {
    if (!reservation.hostel_id) return;
    try {
      await youthHostelsApi.createReceipt(reservation.hostel_id, {
        reservation_id: reservation.id,
        hostel_id: reservation.hostel_id,
        amount: reservation.total_price,
        payment_method: "CASH",
      });
      toast.success("تم إصدار وصل الدفع بنجاح");
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء إصدار الوصل");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{t("pending")}</Badge>;
      case 'CONFIRMED':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />{t("confirmed")}</Badge>;
      case 'CHECKED_IN':
        return <Badge className="bg-blue-500">{t("checked_in")}</Badge>;
      case 'CHECKED_OUT':
        return <Badge className="bg-gray-500">{t("checked_out")}</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{t("cancelled")}</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">{t("rejected")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("reservations")}</h1>
          <p className="text-muted-foreground">{t("manage_reservations")}</p>
        </div>
        <Button onClick={() => router.push('/admin-hostels/reservations/create')}>
          <Plus className="h-4 w-4 mr-2" />
          {t("new_reservation")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            className="pl-10"
          />
        </div>
        <Select
          value={filters.hostel_id || "all"}
          onValueChange={(v) => setFilters({...filters, hostel_id: v === "all" ? "" : v})}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("all_hostels")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all_hostels")}</SelectItem>
            {hostels.map(h => (
              <SelectItem key={h.id} value={h.id}>{h.name_ar}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status || "all"}
          onValueChange={(v) => setFilters({...filters, status: v === "all" ? "" : v})}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("all_statuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all_statuses")}</SelectItem>
            <SelectItem value="PENDING">{t("pending")}</SelectItem>
            <SelectItem value="CONFIRMED">{t("confirmed")}</SelectItem>
            <SelectItem value="CHECKED_IN">{t("checked_in")}</SelectItem>
            <SelectItem value="CHECKED_OUT">{t("checked_out")}</SelectItem>
            <SelectItem value="CANCELLED">{t("cancelled")}</SelectItem>
            <SelectItem value="REJECTED">{t("rejected")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{reservations.filter(r => r.status === 'PENDING').length}</p>
            <p className="text-xs text-muted-foreground">{t("pending")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-green-600">{reservations.filter(r => r.status === 'CONFIRMED').length}</p>
            <p className="text-xs text-muted-foreground">{t("confirmed")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-blue-600">{reservations.filter(r => r.status === 'CHECKED_IN').length}</p>
            <p className="text-xs text-muted-foreground">{t("checked_in")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-gray-600">{reservations.filter(r => r.status === 'CHECKED_OUT').length}</p>
            <p className="text-xs text-muted-foreground">{t("checked_out")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-orange-600">{total}</p>
            <p className="text-xs text-muted-foreground">{t("total")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Reservations List */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : reservations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("no_reservations")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right p-3">{t("guest")}</th>
                    <th className="text-right p-3">{t("hostel")}</th>
                    <th className="text-right p-3">{t("dates")}</th>
                    <th className="text-right p-3">{t("beds")}</th>
                    <th className="text-right p-3">{t("price")}</th>
                    <th className="text-right p-3">{t("status")}</th>
                    <th className="text-right p-3">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((res) => (
                    <tr key={res.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div className="font-medium">{res.guest_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {res.phone && <span className="ml-2">{res.phone}</span>}
                        </div>
                      </td>
                      <td className="p-3">
                        {hostels.find(h => h.id === res.hostel_id)?.name_ar || '-'}
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          {format(new Date(res.check_in_date), "dd/MM/yyyy")} - 
                          {format(new Date(res.check_out_date), "dd/MM/yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {res.number_of_nights} {t("nights")}
                        </div>
                      </td>
                      <td className="p-3">{res.number_of_beds}</td>
                      <td className="p-3">
                        <div className="font-medium">{res.total_price} {t("currency")}</div>
                        {res.is_free && <Badge variant="outline" className="text-xs">{t("free")}</Badge>}
                      </td>
                      <td className="p-3">{getStatusBadge(res.status)}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {res.status === 'PENDING' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleApprove(res.id)}
                              >
                                {t("approve")}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedReservation(res);
                                  setIsRejectDialogOpen(true);
                                }}
                              >
                                {t("reject")}
                              </Button>
                            </>
                          )}
                          {res.status === 'CONFIRMED' && (
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => handleCheckIn(res.id)}
                            >
                              {t("check_in")}
                            </Button>
                          )}
                          {res.status === 'CHECKED_IN' && (
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => handleCheckOut(res.id)}
                            >
                              {t("check_out")}
                            </Button>
                          )}
                          {['PENDING', 'CONFIRMED'].includes(res.status) && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleCancel(res.id)}
                            >
                              {t("cancel")}
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handlePrintPoliceForm(res.id, res.guest_name)}
                            title="استخراج استمارة الشرطة"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          {res.status === 'CHECKED_IN' && res.payment_status === 'PENDING' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-200"
                              onClick={() => handleIssueReceipt(res)}
                              title="إصدار وصل دفع"
                            >
                              <Receipt className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {total > filters.size && (
        <div className="flex justify-center gap-2 mt-4">
          <Button 
            variant="outline" 
            disabled={filters.page === 1}
            onClick={() => setFilters({...filters, page: filters.page - 1})}
          >
            {t("previous")}
          </Button>
          <span className="flex items-center px-4">
            {filters.page} / {Math.ceil(total / filters.size)}
          </span>
          <Button 
            variant="outline" 
            disabled={filters.page >= Math.ceil(total / filters.size)}
            onClick={() => setFilters({...filters, page: filters.page + 1})}
          >
            {t("next")}
          </Button>
        </div>
      )}

      {/* Reject Dialog */}
      {isRejectDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[400px]">
            <CardHeader>
              <CardTitle>{t("reject_reservation")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("reason")}</Label>
                <Input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t("reject_reason_placeholder")}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button onClick={handleReject} disabled={!rejectReason}>
                  {t("reject")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
