"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { youthHostelsApi, YouthHostel } from "@/lib/api/youth-hostels";
import {
  ArrowLeft,
  ArrowRight,
  User,
  Calendar,
  Bed,
  Phone,
  Mail,
  IdCard,
  Plus,
  Trash2,
  Users,
  Building2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CreateReservationPage() {
  const t = useTranslations("youth_hostels");
  const locale = useLocale();
  const router = useRouter();

  const isRTL = locale === "ar";

  const [newBooking, setNewBooking] = useState({
    hostel_id: "",
    booking_type: "INDIVIDUAL",
    guest_name: "",
    guest_type: "VISITOR",
    nationality: t("algerian"),
    phone: "",
    email: "",
    check_in_date: format(new Date(), "yyyy-MM-dd"),
    check_out_date: format(new Date(Date.now() + 86400000), "yyyy-MM-dd"),
    number_of_beds: 1,
    association_name: "",
    mission_order_ref: "",
    faaj_card_number: "",
    special_requests: "",
    is_free: false,
    id_document_type: "CNI",
    id_document_number: "",
    id_issue_date: "",
    id_issue_place: "",
    date_of_birth: "",
    place_of_birth: "",
  });
  const [additionalGuests, setAdditionalGuests] = useState<
    {
      full_name: string;
      date_of_birth: string;
      place_of_birth: string;
      nationality: string;
      id_document_type: string;
      id_document_number: string;
      id_issue_date: string;
      id_issue_place: string;
    }[]
  >([]);
  const [hostels, setHostels] = useState<YouthHostel[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    youthHostelsApi.getHostels().then(setHostels).catch(console.error);
  }, []);

  const selectedHostel = hostels.find((h) => h.id === newBooking.hostel_id);
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const calcNights = () => {
    const start = new Date(newBooking.check_in_date);
    const end = new Date(newBooking.check_out_date);
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  };

  const getBookingTypeName = (type: string) => {
    switch (type) {
      case "INDIVIDUAL":
        return t("individual");
      case "GROUP":
        return t("group");
      case "OFFICIAL":
        return t("official");
      default:
        return type;
    }
  };

  const addGuest = () => {
    setAdditionalGuests([
      ...additionalGuests,
      {
        full_name: "",
        date_of_birth: "",
        place_of_birth: "",
        nationality: t("algerian"),
        id_document_type: "CNI",
        id_document_number: "",
        id_issue_date: "",
        id_issue_place: "",
      },
    ]);
  };

  const removeGuest = (index: number) => {
    setAdditionalGuests(additionalGuests.filter((_, i) => i !== index));
  };

  const updateGuest = (index: number, field: string, value: string) => {
    const updated = [...additionalGuests];
    (updated[index] as Record<string, string>)[field] = value;
    setAdditionalGuests(updated);
  };

  const handleCreateReservation = async () => {
    if (!newBooking.guest_name || !newBooking.hostel_id) {
      toast.error(t("fill_guest_and_hostel"));
      return;
    }
    if (!newBooking.id_document_number) {
      toast.error(t("require_id_document"));
      return;
    }

    setIsSubmitting(true);
    try {
      const guests = [
        {
          full_name: newBooking.guest_name,
          date_of_birth: newBooking.date_of_birth || undefined,
          place_of_birth: newBooking.place_of_birth || undefined,
          nationality: newBooking.nationality,
          id_document_type: newBooking.id_document_type,
          id_document_number: newBooking.id_document_number,
          id_issue_date: newBooking.id_issue_date || undefined,
          id_issue_place: newBooking.id_issue_place || undefined,
        },
        ...additionalGuests.map((g) => ({
          full_name: g.full_name,
          date_of_birth: g.date_of_birth || undefined,
          place_of_birth: g.place_of_birth || undefined,
          nationality: g.nationality || t("algerian"),
          id_document_type: g.id_document_type || undefined,
          id_document_number: g.id_document_number || undefined,
          id_issue_date: g.id_issue_date || undefined,
          id_issue_place: g.id_issue_place || undefined,
        })),
      ];

      await youthHostelsApi.createReservation({
        hostel_id: newBooking.hostel_id,
        booking_type: newBooking.booking_type,
        guest_name: newBooking.guest_name,
        guest_type: newBooking.guest_type,
        nationality: newBooking.nationality,
        phone: newBooking.phone || undefined,
        email: newBooking.email || undefined,
        check_in_date: newBooking.check_in_date,
        check_out_date: newBooking.check_out_date,
        number_of_beds: newBooking.number_of_beds,
        association_name: newBooking.association_name || undefined,
        mission_order_ref: newBooking.mission_order_ref || undefined,
        faaj_card_number: newBooking.faaj_card_number || undefined,
        special_requests: newBooking.special_requests || undefined,
        is_free: newBooking.is_free,
        guests,
      });

      router.push("/admin-hostels/reservations");
      toast.success(t("reservation_created_with_security"));
    } catch (err) {
      console.error(err);
      toast.error(t("reservation_create_error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid =
    newBooking.guest_name.trim().length > 0 &&
    newBooking.hostel_id.length > 0 &&
    newBooking.id_document_number.trim().length > 0;

  const bookingTypeIcon = (type: string) => {
    switch (type) {
      case "INDIVIDUAL":
        return <User className="h-6 w-6" />;
      case "GROUP":
        return <Users className="h-6 w-6" />;
      case "OFFICIAL":
        return <IdCard className="h-6 w-6" />;
      default:
        return null;
    }
  };

  return (
    <div className="container py-8 max-w-7xl pb-24 lg:pb-8" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin-hostels/reservations")}
        >
          <BackIcon className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t("create_reservation")}</h1>
          <p className="text-muted-foreground">{t("create_reservation_desc")}</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ===== LEFT COLUMN - FORM ===== */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Booking Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {t("booking_type")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {["INDIVIDUAL", "GROUP", "OFFICIAL"].map((type) => (
                  <Card
                    key={type}
                    className={`cursor-pointer transition-all ${
                      newBooking.booking_type === type
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "hover:border-muted-foreground/30"
                    }`}
                    onClick={() =>
                      setNewBooking({ ...newBooking, booking_type: type })
                    }
                  >
                    <CardContent className="p-4 text-center space-y-2">
                      <div className="flex justify-center">
                        {bookingTypeIcon(type)}
                      </div>
                      <p className="font-medium text-sm">
                        {getBookingTypeName(type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {type === "INDIVIDUAL" && t("individual_desc")}
                        {type === "GROUP" && t("group_desc")}
                        {type === "OFFICIAL" && t("official_desc")}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Hostel & Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t("hostel_info")}
              </CardTitle>
              <CardDescription>{t("stay_details")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Hostel Select */}
              <div className="space-y-2">
                <Label>
                  {t("hostel")} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={newBooking.hostel_id || "placeholder"}
                  onValueChange={(v) =>
                    setNewBooking({
                      ...newBooking,
                      hostel_id: v === "placeholder" ? "" : v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("select_hostel")} />
                  </SelectTrigger>
                  <SelectContent>
                    {hostels.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name_ar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dates & Beds Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    {t("check_in_date")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={newBooking.check_in_date}
                    onChange={(e) =>
                      setNewBooking({
                        ...newBooking,
                        check_in_date: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {t("check_out_date")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={newBooking.check_out_date}
                    onChange={(e) =>
                      setNewBooking({
                        ...newBooking,
                        check_out_date: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("number_of_beds")}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={newBooking.number_of_beds}
                    onChange={(e) =>
                      setNewBooking({
                        ...newBooking,
                        number_of_beds: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
              </div>

              {/* Conditional: Association Name */}
              {newBooking.booking_type === "GROUP" && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
                  <Label>
                    {t("association_name")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={newBooking.association_name}
                    onChange={(e) =>
                      setNewBooking({
                        ...newBooking,
                        association_name: e.target.value,
                      })
                    }
                    placeholder={t("association_name_placeholder")}
                  />
                </div>
              )}

              {/* Conditional: Mission Order Ref */}
              {newBooking.booking_type === "OFFICIAL" && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 space-y-2">
                  <Label>
                    {t("mission_order_ref")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={newBooking.mission_order_ref}
                    onChange={(e) =>
                      setNewBooking({
                        ...newBooking,
                        mission_order_ref: e.target.value,
                      })
                    }
                    placeholder={t("mission_order_ref_placeholder")}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Main Guest Data (Fiche de Police) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <IdCard className="h-4 w-4" />
                {t("main_guest_data")}
              </CardTitle>
              <CardDescription className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {t("require_id_document")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    {t("full_name")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={newBooking.guest_name}
                    onChange={(e) =>
                      setNewBooking({
                        ...newBooking,
                        guest_name: e.target.value,
                      })
                    }
                    placeholder={t("guest_name_placeholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("nationality")}</Label>
                  <Input
                    value={newBooking.nationality}
                    onChange={(e) =>
                      setNewBooking({
                        ...newBooking,
                        nationality: e.target.value,
                      })
                    }
                    placeholder={t("nationality_placeholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("date_of_birth")}</Label>
                  <Input
                    type="date"
                    value={newBooking.date_of_birth}
                    onChange={(e) =>
                      setNewBooking({
                        ...newBooking,
                        date_of_birth: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("place_of_birth")}</Label>
                  <Input
                    value={newBooking.place_of_birth}
                    onChange={(e) =>
                      setNewBooking({
                        ...newBooking,
                        place_of_birth: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("document_type")}</Label>
                  <Select
                    value={newBooking.id_document_type}
                    onValueChange={(v) =>
                      setNewBooking({ ...newBooking, id_document_type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CNI">
                        {t("document_cni")}
                      </SelectItem>
                      <SelectItem value="PASSPORT">
                        {t("passport")}
                      </SelectItem>
                      <SelectItem value="PERMIS">
                        {t("driving_license")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    {t("id_number")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={newBooking.id_document_number}
                    onChange={(e) =>
                      setNewBooking({
                        ...newBooking,
                        id_document_number: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("id_issue_date")}</Label>
                  <Input
                    type="date"
                    value={newBooking.id_issue_date}
                    onChange={(e) =>
                      setNewBooking({
                        ...newBooking,
                        id_issue_date: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("id_issue_place")}</Label>
                  <Input
                    value={newBooking.id_issue_place}
                    onChange={(e) =>
                      setNewBooking({
                        ...newBooking,
                        id_issue_place: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("phone")}</Label>
                  <Input
                    type="tel"
                    value={newBooking.phone}
                    onChange={(e) =>
                      setNewBooking({ ...newBooking, phone: e.target.value })
                    }
                    placeholder={t("phone_placeholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("email")}</Label>
                  <Input
                    type="email"
                    value={newBooking.email}
                    onChange={(e) =>
                      setNewBooking({ ...newBooking, email: e.target.value })
                    }
                    placeholder={t("email_placeholder")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Accompanying Guests */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t("accompanying_guests")}
                  <Badge variant="secondary" className="me-2">
                    {additionalGuests.length}
                  </Badge>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addGuest}
                >
                  <Plus className="h-4 w-4 me-1" />
                  {t("add_guest")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {additionalGuests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>{t("no_accompanying_guests")}</p>
                </div>
              ) : (
                additionalGuests.map((guest, idx) => (
                  <Card key={idx} className="border-dashed">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {t("accompanying_guests")} {idx + 1}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeGuest(idx)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">
                            {t("full_name")}{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            value={guest.full_name}
                            onChange={(e) =>
                              updateGuest(idx, "full_name", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            {t("document_type")}
                          </Label>
                          <Select
                            value={guest.id_document_type || "CNI"}
                            onValueChange={(v) =>
                              updateGuest(idx, "id_document_type", v)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CNI">
                                {t("document_cni")}
                              </SelectItem>
                              <SelectItem value="PASSPORT">
                                {t("passport")}
                              </SelectItem>
                              <SelectItem value="PERMIS">
                                {t("driving_license")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            {t("id_number")}
                          </Label>
                          <Input
                            value={guest.id_document_number}
                            onChange={(e) =>
                              updateGuest(
                                idx,
                                "id_document_number",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            {t("date_of_birth")}
                          </Label>
                          <Input
                            type="date"
                            value={guest.date_of_birth}
                            onChange={(e) =>
                              updateGuest(
                                idx,
                                "date_of_birth",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            {t("place_of_birth")}
                          </Label>
                          <Input
                            value={guest.place_of_birth}
                            onChange={(e) =>
                              updateGuest(
                                idx,
                                "place_of_birth",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          {/* Section 5: Special Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("special_requests")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder={t("special_requests_placeholder")}
                value={newBooking.special_requests}
                onChange={(e) =>
                  setNewBooking({
                    ...newBooking,
                    special_requests: e.target.value,
                  })
                }
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_free"
                  checked={newBooking.is_free}
                  onChange={(e) =>
                    setNewBooking({
                      ...newBooking,
                      is_free: e.target.checked,
                    })
                  }
                  className="rounded border-input h-4 w-4"
                />
                <Label htmlFor="is_free" className="cursor-pointer">
                  {t("free_booking")}
                </Label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===== RIGHT COLUMN - BOOKING SUMMARY ===== */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {t("booking_summary")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Hostel */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {t("hostel")}
                  </span>
                  <span className="text-sm font-medium text-end">
                    {selectedHostel?.name_ar || (
                      <span className="text-muted-foreground">
                        {t("not_selected")}
                      </span>
                    )}
                  </span>
                </div>

                <Separator />

                {/* Dates */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {t("check_in_date")}
                    </span>
                    <span className="text-sm">
                      {newBooking.check_in_date}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {t("check_out_date")}
                    </span>
                    <span className="text-sm">
                      {newBooking.check_out_date}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("nights")}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {calcNights()} {t("nights")}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Beds */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Bed className="h-3.5 w-3.5" />
                    {t("beds")}
                  </span>
                  <span className="text-sm font-medium">
                    {newBooking.number_of_beds}
                  </span>
                </div>

                {/* Booking Type */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("booking_type")}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {getBookingTypeName(newBooking.booking_type)}
                  </Badge>
                </div>

                <Separator />

                {/* Main Guest */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {t("main_guest")}
                  </span>
                  <span className="text-sm font-medium text-end truncate max-w-[140px]">
                    {newBooking.guest_name || (
                      <span className="text-muted-foreground">&mdash;</span>
                    )}
                  </span>
                </div>

                {/* Accompanying Guests */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {t("accompanying_guests")}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {additionalGuests.length}
                  </Badge>
                </div>

                <Separator />

                {/* Total Price */}
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>{t("total")}</span>
                  <span className="text-muted-foreground">
                    --- {t("currency")}
                  </span>
                </div>

                <Separator />

                {/* Submit Button */}
                <Button
                  className="w-full"
                  size="lg"
                  disabled={!isValid || isSubmitting}
                  onClick={handleCreateReservation}
                >
                  <CheckCircle className="h-4 w-4 me-2" />
                  {isSubmitting ? t("submitting") : t("confirm_booking")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Footer */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-background border-t z-50 lg:hidden">
        <Button
          className="w-full"
          size="lg"
          disabled={!isValid || isSubmitting}
          onClick={handleCreateReservation}
        >
          <CheckCircle className="h-4 w-4 me-2" />
          {isSubmitting ? t("submitting") : t("confirm_booking")}
        </Button>
      </div>
    </div>
  );
}
