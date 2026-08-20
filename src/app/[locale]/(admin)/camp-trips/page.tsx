"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { campTripsApi, CampTrip } from "@/lib/api/camp-trips";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, CalendarDays, ExternalLink, Activity, Plus, Trash2, Loader2, Crop } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampTripsStats } from "@/components/dashboard/CampTripsStats";
import { useAuthStore } from "@/lib/stores/auth";
import { PermissionGuard } from "@/hooks/useRequirePermission";

export default function CampTripsPage() {
  const t = useTranslations("camp-trips");
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const [trips, setTrips] = useState<CampTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    capacity: 0,
    scouts_quota: 0,
    associations_quota: 0,
    institutions_quota: 0,
    start_date: '',
    end_date: '',
  });

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const response = await campTripsApi.listTrips({ page_size: 100 });
      setTrips(response.data.items);
    } catch (error) {
      console.error("Failed to load trips", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleDeleteTrip = async (id: string) => {
    setDeletingId(id);
    try {
      await campTripsApi.deleteTrip(id);
      await fetchTrips();
    } catch (e) {
      console.error("Failed to delete trip", e);
      alert(t("failed_delete"));
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateTrip = async () => {
    if (!createForm.name.trim()) {
      alert("يرجى إدخال اسم الفوج");
      return;
    }
    setIsCreating(true);
    try {
      await campTripsApi.createTrip({
        name: createForm.name,
        description: createForm.description || undefined,
        capacity: createForm.capacity,
        scouts_quota: createForm.scouts_quota,
        associations_quota: createForm.associations_quota,
        institutions_quota: createForm.institutions_quota,
        start_date: createForm.start_date || undefined,
        end_date: createForm.end_date || undefined,
        members: [],
      });
      setShowCreateDialog(false);
      setCreateForm({
        name: '', description: '', capacity: 0,
        scouts_quota: 0, associations_quota: 0, institutions_quota: 0,
        start_date: '', end_date: '',
      });
      await fetchTrips();
    } catch (e) {
      console.error("Failed to create trip", e);
      alert("فشل إنشاء الفوج");
    } finally {
      setIsCreating(false);
    }
  };


  return (
  <PermissionGuard module="camp_trips" action="view">
          

        <div className="space-y-6 max-w-[1600px] mx-auto pb-20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-white rounded-2xl border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-100/50 rounded-xl">
            <Activity className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">{t("page_title")}</h1>
            <p className="text-slate-500 font-medium">{t("page_description")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission('camp_trips', 'crop_settings') && (
            <Link href="/camp-trips/settings">
              <Button variant="outline" className="gap-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200">
                <Crop className="h-4 w-4" /> {t("crop_settings")}
              </Button>
            </Link>
          )}
          {hasPermission('camp_trips', 'create') && (
            <Button onClick={() => setShowCreateDialog(true)} variant="outline" className="gap-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200">
              <Plus className="h-4 w-4" /> {t("new_trip")}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <CampTripsStats />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="h-64 animate-pulse bg-slate-100/50 border-slate-100" />
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">{t("no_trips")}</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">{t("no_trips_desc")}</p>
          {hasPermission('camp_allocation', 'view') && (
          <Link href="/camp-registration/allocation">
            <Button className="bg-emerald-600 hover:bg-emerald-700">{t("go_to_allocation")}</Button>
          </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <Card key={trip.id} className="shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden border-slate-200 group">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className={`mb-2 ${
                      trip.status === 'DRAFT'
                        ? 'bg-slate-100 text-slate-700 border-slate-200'
                        : trip.status === 'IN_CAMP'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : trip.status === 'COMPLETED'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : trip.status === 'CANCELLED'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {trip.status === 'DRAFT' ? t("status_draft") : trip.status === 'IN_CAMP' ? t("status_in_camp") : trip.status === 'COMPLETED' ? t("status_completed") : trip.status === 'CANCELLED' ? t("status_cancelled") : trip.status}
                    </Badge>
                    <CardTitle className="text-lg font-bold text-slate-800">{trip.name}</CardTitle>
                  </div>
                  {trip.status !== 'COMPLETED' && hasPermission('camp_trips', 'delete') ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 -mr-2">
                          {deletingId === trip.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent dir="rtl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("delete_trip_title")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("delete_trip_desc")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-row-reverse sm:space-x-reverse space-x-2">
                          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteTrip(trip.id)} className="bg-red-600 hover:bg-red-700">
                            {t("delete_trip_confirm")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : trip.status === 'COMPLETED' ? (
                    <Button variant="ghost" size="icon" className="text-red-300 cursor-not-allowed -mr-2" disabled>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                <CardDescription className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed">
                  {trip.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span>{t("total_capacity")}</span>
                  </div>
                  <span className="font-black text-slate-900">{trip.capacity} {t("seat")}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-slate-100">
                  <div className="text-center">
                    <div className="text-[10px] text-slate-500 font-bold mb-1">{t("scouts")}</div>
                    <div className="text-sm font-black text-orange-600">{trip.scouts_quota}</div>
                  </div>
                  <div className="text-center border-r border-slate-100">
                    <div className="text-[10px] text-slate-500 font-bold mb-1">{t("associations")}</div>
                    <div className="text-sm font-black text-purple-600">{trip.associations_quota}</div>
                  </div>
                  <div className="text-center border-r border-slate-100">
                    <div className="text-[10px] text-slate-500 font-bold mb-1">{t("institutions")}</div>
                    <div className="text-sm font-black text-blue-600">{trip.institutions_quota}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>{trip.start_date || t("not_specified")}</span>
                  </div>
                  <Link href={`/camp-trips/${trip.id}`}>
                    <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 font-bold gap-1 group-hover:underline">
                      {t("trip_details")} <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Trip Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>{t("new_trip")}</DialogTitle>
            <DialogDescription>
              {t("new_trip_desc") || "أدخل معلومات الفوج الجديد"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("name") || "اسم الفوج"} *</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder={t("name_placeholder") || "أدخل اسم الفوج"}
                className="text-right"
                dir="rtl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">{t("description") || "الوصف"}</Label>
              <Input
                id="description"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder={t("description_placeholder") || "وصف الفوج (اختياري)"}
                className="text-right"
                dir="rtl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="capacity">{t("total_capacity") || "السعة الإجمالية"}</Label>
              <Input
                id="capacity"
                type="number"
                min={0}
                value={createForm.capacity || ''}
                onChange={(e) => setCreateForm({ ...createForm, capacity: parseInt(e.target.value) || 0 })}
                className="text-right"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="scouts_quota">{t("scouts_quota") || "حصة الكشافة"}</Label>
                <Input
                  id="scouts_quota"
                  type="number"
                  min={0}
                  value={createForm.scouts_quota || ''}
                  onChange={(e) => setCreateForm({ ...createForm, scouts_quota: parseInt(e.target.value) || 0 })}
                  className="text-right"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="associations_quota">{t("associations_quota") || "حصة الجمعيات"}</Label>
                <Input
                  id="associations_quota"
                  type="number"
                  min={0}
                  value={createForm.associations_quota || ''}
                  onChange={(e) => setCreateForm({ ...createForm, associations_quota: parseInt(e.target.value) || 0 })}
                  className="text-right"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="institutions_quota">{t("institutions_quota") || "حصة المؤسسات"}</Label>
                <Input
                  id="institutions_quota"
                  type="number"
                  min={0}
                  value={createForm.institutions_quota || ''}
                  onChange={(e) => setCreateForm({ ...createForm, institutions_quota: parseInt(e.target.value) || 0 })}
                  className="text-right"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_date">{t("start_date") || "تاريخ البداية"}</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={createForm.start_date}
                  onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
                  className="text-right"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_date">{t("end_date") || "تاريخ النهاية"}</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={createForm.end_date}
                  onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
                  className="text-right"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-row-reverse sm:space-x-reverse gap-2">
            <Button onClick={handleCreateTrip} disabled={isCreating} className="bg-emerald-600 hover:bg-emerald-700">
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              {t("create") || "إنشاء"}
            </Button>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t("cancel") || "إلغاء"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </PermissionGuard>
  );
}