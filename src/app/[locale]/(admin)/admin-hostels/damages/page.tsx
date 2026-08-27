"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { youthHostelsApi, YouthHostel, DamageReport } from "@/lib/api/youth-hostels";
import {
  ShieldAlert,
  Plus,
  Printer,
  Package,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  FileWarning,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function DamageReportsPage() {
  const t = useTranslations("youth_hostels");
  const router = useRouter();

  const [hostels, setHostels] = useState<YouthHostel[]>([]);
  const [selectedHostel, setSelectedHostel] = useState<string>("");
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newReport, setNewReport] = useState({
    description: "",
    estimated_cost: 0,
    is_paid_by_guest: false,
    room_id: "",
    reservation_id: "",
  });

  useEffect(() => {
    loadHostels();
  }, []);

  useEffect(() => {
    if (selectedHostel) {
      loadReports();
    }
  }, [selectedHostel]);

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

  const loadReports = async () => {
    if (!selectedHostel) return;
    setIsLoading(true);
    try {
      const data = await youthHostelsApi.getDamageReports(selectedHostel);
      setReports(data);
    } catch (error) {
      console.error("Error loading damage reports:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newReport.description) {
      toast.error(t("fill_damage_description"));
      return;
    }
    try {
      await youthHostelsApi.createDamageReport(selectedHostel, {
        description: newReport.description,
        hostel_id: selectedHostel,
        estimated_cost: newReport.estimated_cost || undefined,
        is_paid_by_guest: newReport.is_paid_by_guest,
        room_id: newReport.room_id || undefined,
        reservation_id: newReport.reservation_id || undefined,
      });
      setIsCreateDialogOpen(false);
      setNewReport({ description: "", estimated_cost: 0, is_paid_by_guest: false, room_id: "", reservation_id: "" });
      loadReports();
      toast.success(t("damage_report_created"));
    } catch (error) {
      console.error("Error creating damage report:", error);
      toast.error(t("damage_report_create_error"));
    }
  };

  const handleSyncInventory = async (reportId: string) => {
    try {
      await youthHostelsApi.syncDamageToInventory(reportId);
      loadReports();
      toast.success(t("inventory_synced"));
    } catch (error) {
      console.error("Error syncing to inventory:", error);
      toast.error(t("inventory_sync_error"));
    }
  };

  const handlePrintReport = (report: DamageReport) => {
    const hostel = hostels.find(h => h.id === selectedHostel);
    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`
      <html dir="rtl" lang="ar">
      <head>
        <title>${t("damage_report_title")} - PV de Dégradation - ${report.report_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; font-size: 14px; }
          h1 { text-align: center; font-size: 18px; margin-bottom: 5px; }
          h2 { text-align: center; color: #555; font-size: 14px; }
          .field { margin: 10px 0; padding: 8px; border-bottom: 1px dashed #ccc; }
          .field label { font-weight: bold; display: inline-block; min-width: 180px; }
          .box { border: 1px solid #000; padding: 15px; margin: 20px 0; }
          .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
          .sig-box { text-align: center; width: 200px; }
          .sig-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 5px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>${t("algerian_republic")}</h1>
        <h2>${t("damage_report_public_property")}</h2>
        <h2>Procès-Verbal de Dégradation</h2>
        <hr style="margin: 15px 0; border-top: 2px solid #000;" />
        
        <div class="field">
          <label>${t("report_number")}:</label> ${report.report_number}
        </div>
        <div class="field">
          <label>${t("institution")}:</label> ${hostel?.name_ar || ""}
        </div>
        <div class="field">
          <label>${t("date")}:</label> ${format(new Date(report.created_at), "dd/MM/yyyy")}
        </div>
        
        <div class="box">
          <h3>${t("damage_description")}:</h3>
          <p style="min-height: 80px; line-height: 2;">${report.description}</p>
        </div>

        <div class="field">
          <label>${t("estimated_cost")}:</label> ${report.estimated_cost ? report.estimated_cost.toLocaleString('ar-DZ') + ` ${t("dzd")}` : t("not_specified")}
        </div>
        <div class="field">
          <label>${t("paid_by_guest")}:</label> ${report.is_paid_by_guest ? t("yes") + ' ✓' : t("no") + ' ✗'}
        </div>
        <div class="field">
          <label>${t("synced_to_inventory")}:</label> ${report.is_synced_to_inventory ? t("synced_yes") + ' ✓' : t("not_synced_yet")}
        </div>

        <p style="margin-top: 30px; font-size: 12px; color: #555;">
          ${t("damage_legal_notice")}
        </p>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-line">${t("guest_signature")}</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">${t("reception_officer")}</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">${t("institution_director")}</div>
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

  const totalDamage = reports.reduce((sum, r) => sum + (r.estimated_cost || 0), 0);
  const paidReports = reports.filter(r => r.is_paid_by_guest);
  const syncedReports = reports.filter(r => r.is_synced_to_inventory);

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-orange-600" />
            {t("page_title")}
          </h1>
          <p className="text-muted-foreground">
            {t("page_description")}
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!selectedHostel}>
              <Plus className="h-4 w-4 mr-2" />
              {t("new_report")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("create_damage_report")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("damage_description")} *</Label>
                <Textarea
                  value={newReport.description}
                  onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                  placeholder={t("description_placeholder")}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("estimated_cost_dzd")}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={newReport.estimated_cost}
                    onChange={(e) => setNewReport({ ...newReport, estimated_cost: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("paid_by_guest_question")}</Label>
                  <Select
                    value={newReport.is_paid_by_guest ? "yes" : "no"}
                    onValueChange={(v) => setNewReport({ ...newReport, is_paid_by_guest: v === "yes" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">{t("no")}</SelectItem>
                      <SelectItem value="yes">{t("yes")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full">
                <FileWarning className="h-4 w-4 mr-2" />
                {t("create_report")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Hostel Selector */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 max-w-xs">
          <Select value={selectedHostel} onValueChange={setSelectedHostel}>
            <SelectTrigger>
              <SelectValue placeholder={t("select_hostel")} />
            </SelectTrigger>
            <SelectContent>
              {hostels.map(h => (
                <SelectItem key={h.id} value={h.id}>{h.name_ar}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reports.length}</p>
                <p className="text-xs text-muted-foreground">{t("total_reports")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{totalDamage.toLocaleString('ar-DZ')} {t("dzd")}</p>
                <p className="text-xs text-muted-foreground">{t("total_damages")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{paidReports.length}</p>
                <p className="text-xs text-muted-foreground">{t("paid_by_guest_stat")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{syncedReports.length}</p>
                <p className="text-xs text-muted-foreground">{t("synced_with_inventory")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("no_damage_reports")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-mono">
                    {report.report_number}
                  </CardTitle>
                  <div className="flex gap-1">
                    {report.is_paid_by_guest ? (
                      <Badge className="bg-green-500 text-xs">{t("paid")}</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">{t("unpaid")}</Badge>
                    )}
                    {report.is_synced_to_inventory ? (
                      <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">{t("synced")}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">{t("unsynced")}</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                  {report.description}
                </p>
                {report.estimated_cost && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{t("estimated_cost")}:</span>
                    <span className="font-bold text-red-600">
                      {report.estimated_cost.toLocaleString('ar-DZ')} {t("dzd")}
                    </span>
                  </div>
                )}
                <div className="text-xs text-muted-foreground mb-3">
                  {format(new Date(report.created_at), "dd/MM/yyyy HH:mm")}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePrintReport(report)}
                  >
                    <Printer className="h-3 w-3 mr-1" />
                    {t("print")}
                  </Button>
                  {!report.is_synced_to_inventory && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSyncInventory(report.id)}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {t("sync_inventory")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
