"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { youthHostelsApi, YouthHostelDetail } from "@/lib/api/youth-hostels";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Bed,
  Users,
  Save,
  Settings,
  PaintBucket,
  DoorOpen,
  Calendar,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export default function YouthHostelDetailPage() {
  const t = useTranslations("youth_hostels");
  const locale = useLocale();
  const isRTL = locale === "ar";
  const params = useParams();
  const router = useRouter();
  const hostelId = params.id as string;

  const [hostel, setHostel] = useState<YouthHostelDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const [profileData, setProfileData] = useState({
    has_male_wing: true,
    has_female_wing: true,
    has_vip_rooms: false,
    has_special_housing: false,
    male_wing_name: "جناح الذكور",
    female_wing_name: "جناح الإناث",
    check_in_time: "14:00",
    check_out_time: "10:00",
    cancellation_policy: "",
    rules: "",
    financial_regime: "ODEJ",
    faaj_affiliated: true,
  });

  useEffect(() => {
    if (hostelId) {
      loadHostel();
    }
  }, [hostelId]);

  const loadHostel = async () => {
    setIsLoading(true);
    try {
      const data = await youthHostelsApi.getHostel(hostelId);
      setHostel(data);
      if (data) {
        setProfileData({
          has_male_wing: data.has_male_wing ?? true,
          has_female_wing: data.has_female_wing ?? true,
          has_vip_rooms: data.has_vip_rooms ?? false,
          has_special_housing: data.has_special_housing ?? false,
          male_wing_name: data.male_wing_name ?? "جناح الذكور",
          female_wing_name: data.female_wing_name ?? "جناح الإناث",
          check_in_time: data.check_in_time ?? "14:00",
          check_out_time: data.check_out_time ?? "10:00",
          cancellation_policy: data.cancellation_policy ?? "",
          rules: data.rules ?? "",
          financial_regime: data.financial_regime ?? "ODEJ",
          faaj_affiliated: data.faaj_affiliated ?? true,
        });
      }
    } catch (error) {
      console.error("Error loading hostel:", error);
      toast.error(t("error_loading"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await youthHostelsApi.updateProfile(hostelId, profileData);
      toast.success(t("saved_successfully"));
    } catch (error) {
      console.error("Error saving:", error);
      toast.error(t("error_saving"));
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DIRTY":
        return "bg-red-100 text-red-800 border-red-200";
      case "CLEANING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "MAINTENANCE":
        return "bg-gray-200 text-gray-800 border-gray-300";
      default:
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "DIRTY":
        return t("dirty");
      case "CLEANING":
        return t("cleaning");
      case "MAINTENANCE":
        return t("maintenance");
      default:
        return t("clean");
    }
  };

  const getRoomTypeLabel = (roomType: string) => {
    switch (roomType) {
      case "STANDARD":
        return t("standard");
      case "VIP":
        return t("vip_rooms");
      case "SPECIAL":
        return t("special");
      default:
        return roomType;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hostel) {
    return (
      <div className="container py-8">
        <p>{t("not_found")}</p>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.push("/admin-hostels")} className="mb-4">
        {isRTL ? <ArrowRight className="h-4 w-4 ms-2" /> : <ArrowLeft className="h-4 w-4 ms-2" />}
        {t("back")}
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{hostel.name_ar}</h1>
          {hostel.name_fr && (
            <p className="text-muted-foreground">{hostel.name_fr}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">
            {hostel.available_beds} / {hostel.total_beds} {t("beds_available")}
          </Badge>
          <Badge variant={hostel.occupancy_rate > 80 ? "destructive" : "default"}>
            {t("occupancy")}: {hostel.occupancy_rate}%
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{hostel.total_beds}</p>
                <p className="text-xs text-muted-foreground">{t("total_beds")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{hostel.available_beds}</p>
                <p className="text-xs text-muted-foreground">{t("available")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Bed className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  {hostel.total_beds - hostel.available_beds}/{hostel.total_beds}
                </p>
                <p className="text-xs text-muted-foreground">
                  {hostel.occupancy_rate}% {t("occupied")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-2xl font-bold">{hostel.wings?.length || 0}</p>
                <p className="text-xs text-muted-foreground">{t("wings")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <Link href={`/admin-hostels/${hostelId}/wings`}>
          <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <DoorOpen className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium">{t("wings")}</span>
            </CardContent>
          </Card>
        </Link>
        <Card
          className="hover:bg-accent transition-colors cursor-pointer h-full"
          onClick={() => setActiveTab("housekeeping")}
        >
          <CardContent className="p-4 flex flex-col items-center text-center gap-2">
            <PaintBucket className="h-6 w-6 text-green-600" />
            <span className="text-sm font-medium">{t("housekeeping")}</span>
          </CardContent>
        </Card>
        <Link href={`/admin-hostels/reservations?hostel_id=${hostelId}`}>
          <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <Calendar className="h-6 w-6 text-purple-600" />
              <span className="text-sm font-medium">{t("reservations")}</span>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/admin-hostels/financial?hostel_id=${hostelId}`}>
          <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <DollarSign className="h-6 w-6 text-yellow-600" />
              <span className="text-sm font-medium">{t("financial")}</span>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/admin-hostels/damages?hostel_id=${hostelId}`}>
          <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <span className="text-sm font-medium">{t("damage_reports_title")}</span>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/admin-hostels/settings?hostel_id=${hostelId}`}>
          <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <Settings className="h-6 w-6 text-gray-600" />
              <span className="text-sm font-medium">{t("settings")}</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} dir={isRTL ? "rtl" : "ltr"}>
        <TabsList>
          <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
          <TabsTrigger value="housekeeping">{t("housekeeping")}</TabsTrigger>
          <TabsTrigger value="settings">{t("settings")}</TabsTrigger>
          <TabsTrigger value="contact">{t("contact_info")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("hostel_info")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>{t("name_ar")}</Label>
                  <p className="text-lg font-medium">{hostel.name_ar}</p>
                </div>
                {hostel.name_fr && (
                  <div>
                    <Label>{t("name_fr")}</Label>
                    <p className="text-lg font-medium">{hostel.name_fr}</p>
                  </div>
                )}
                <div>
                  <Label>{t("address")}</Label>
                  <p className="font-medium">{hostel.address || "-"}</p>
                </div>
                <div>
                  <Label>{t("check_times")}</Label>
                  <p className="font-medium">
                    {t("check_in")}: {hostel.check_in_time} - {t("check_out")}: {hostel.check_out_time}
                  </p>
                </div>
              </div>

              {hostel.description && (
                <div className="mt-4">
                  <Label>{t("description")}</Label>
                  <p>{hostel.description}</p>
                </div>
              )}

              {hostel.rules && (
                <div className="mt-4">
                  <Label>{t("rules")}</Label>
                  <p>{hostel.rules}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Wings Overview */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{t("wings")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {hostel.wings?.map((wing) => (
                  <div key={wing.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">
                        {wing.wing_type === "MALE" && t("male_wing")}
                        {wing.wing_type === "FEMALE" && t("female_wing")}
                        {wing.wing_type === "VIP" && t("vip_rooms")}
                        {wing.wing_type === "SPECIAL" && t("special_housing")}
                      </span>
                      <Badge variant={wing.is_active ? "default" : "secondary"}>
                        {wing.is_active ? t("active") : t("inactive")}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("floor")}: {wing.floor}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {wing.total_beds} / {wing.available_beds} {t("beds")}
                    </div>
                  </div>
                )) || (
                  <p className="text-muted-foreground col-span-4 text-center py-4">
                    {t("no_wings")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="housekeeping" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("housekeeping_dashboard")}</CardTitle>
              <CardDescription>{t("housekeeping_description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {hostel.wings?.map((wing) => (
                  <div key={wing.id} className="p-4 border rounded-lg bg-gray-50/50">
                    <h3 className="font-bold mb-4 flex items-center gap-2 border-b pb-2">
                      {wing.wing_type === "MALE" && t("male_wing")}
                      {wing.wing_type === "FEMALE" && t("female_wing")}
                      {wing.wing_type === "VIP" && t("vip_rooms")}
                      {wing.wing_type === "SPECIAL" && t("special_housing")}
                      <span className="text-sm text-muted-foreground me-auto">
                        {t("floor")} {wing.floor}
                      </span>
                    </h3>
                    <div className="space-y-3">
                      {wing.rooms?.map((room) => (
                        <div
                          key={room.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-white border rounded shadow-sm gap-2"
                        >
                          <div>
                            <p className="font-bold">
                              {t("room")} {room.room_number}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {getRoomTypeLabel(room.room_type)} - {room.available_beds}/{room.total_beds}{" "}
                              {t("beds")}
                            </p>
                          </div>
                          <select
                            value={room.housekeeping_status || "CLEAN"}
                            onChange={async (e) => {
                              try {
                                await youthHostelsApi.updateRoomHousekeeping(
                                  room.id,
                                  e.target.value as "CLEAN" | "DIRTY" | "CLEANING" | "MAINTENANCE"
                                );
                                await loadHostel();
                                toast.success(t("status_updated"));
                              } catch {
                                toast.error(t("status_update_error"));
                              }
                            }}
                            className={`text-sm border rounded px-2 py-1 outline-none ${getStatusColor(room.housekeeping_status || "CLEAN")}`}
                          >
                            <option value="CLEAN">{getStatusLabel("CLEAN")}</option>
                            <option value="DIRTY">{getStatusLabel("DIRTY")}</option>
                            <option value="CLEANING">{getStatusLabel("CLEANING")}</option>
                            <option value="MAINTENANCE">{getStatusLabel("MAINTENANCE")}</option>
                          </select>
                        </div>
                      ))}
                      {(!wing.rooms || wing.rooms.length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          {t("no_rooms_in_wing")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("hostel_settings")}</CardTitle>
              <CardDescription>{t("settings_description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Wing Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{t("male_wing")}</p>
                    <p className="text-sm text-muted-foreground">{t("male_wing_desc")}</p>
                  </div>
                  <Badge variant={profileData.has_male_wing ? "default" : "secondary"}>
                    {profileData.has_male_wing ? t("enabled") : t("disabled")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{t("female_wing")}</p>
                    <p className="text-sm text-muted-foreground">{t("female_wing_desc")}</p>
                  </div>
                  <Badge variant={profileData.has_female_wing ? "default" : "secondary"}>
                    {profileData.has_female_wing ? t("enabled") : t("disabled")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{t("vip_rooms")}</p>
                    <p className="text-sm text-muted-foreground">{t("vip_rooms_desc")}</p>
                  </div>
                  <Badge variant={profileData.has_vip_rooms ? "default" : "secondary"}>
                    {profileData.has_vip_rooms ? t("enabled") : t("disabled")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{t("special_housing")}</p>
                    <p className="text-sm text-muted-foreground">{t("special_housing_desc")}</p>
                  </div>
                  <Badge variant={profileData.has_special_housing ? "default" : "secondary"}>
                    {profileData.has_special_housing ? t("enabled") : t("disabled")}
                  </Badge>
                </div>
              </div>

              {/* Time Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("check_in_time")}</Label>
                  <Input
                    type="time"
                    value={profileData.check_in_time}
                    onChange={(e) => setProfileData({ ...profileData, check_in_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("check_out_time")}</Label>
                  <Input
                    type="time"
                    value={profileData.check_out_time}
                    onChange={(e) => setProfileData({ ...profileData, check_out_time: e.target.value })}
                  />
                </div>
              </div>

              {/* Policy */}
              <div className="space-y-2">
                <Label>{t("cancellation_policy")}</Label>
                <Input
                  value={profileData.cancellation_policy}
                  onChange={(e) => setProfileData({ ...profileData, cancellation_policy: e.target.value })}
                  placeholder={t("cancellation_policy_placeholder")}
                />
              </div>

              {/* Rules */}
              <div className="space-y-2">
                <Label>{t("rules")}</Label>
                <Input
                  value={profileData.rules}
                  onChange={(e) => setProfileData({ ...profileData, rules: e.target.value })}
                  placeholder={t("rules_placeholder")}
                />
              </div>

              {/* Financial & FAAJ Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>{t("financial_regime")}</Label>
                  <select
                    value={profileData.financial_regime}
                    onChange={(e) => setProfileData({ ...profileData, financial_regime: e.target.value })}
                    className="w-full h-10 px-3 py-2 text-sm border rounded-md border-input bg-background"
                  >
                    <option value="ODEJ">ODEJ</option>
                    <option value="INDEPENDENT">{t("independent")}</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{t("faaj_affiliated")}</p>
                    <p className="text-sm text-muted-foreground">{t("faaj_affiliated_desc")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfileData({ ...profileData, faaj_affiliated: !profileData.faaj_affiliated })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      profileData.faaj_affiliated ? "bg-primary" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        profileData.faaj_affiliated ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <Button onClick={handleSaveProfile} disabled={isSaving}>
                <Save className="h-4 w-4 ms-2" />
                {isSaving ? t("saving") : t("save")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("contact_information")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>{t("phone")}</Label>
                  <p className="font-medium">{hostel.phone || "-"}</p>
                </div>
                <div>
                  <Label>{t("email")}</Label>
                  <p className="font-medium">{hostel.email || "-"}</p>
                </div>
                <div className="md:col-span-2">
                  <Label>{t("address")}</Label>
                  <p className="font-medium">{hostel.address || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
