"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    User,
    Phone,
    Mail,
    MapPin,
    Calendar,
    Building2,
    GraduationCap,
    Briefcase,
    Users,
    Baby,
    CreditCard,
    Home
} from "lucide-react";
import { format } from "date-fns";
import { arDZ } from "date-fns/locale";

interface RequestDetailsViewProps {
    request: {
        firstname_ar?: string;
        lastname_ar?: string;
        firstname_fr?: string;
        lastname_fr?: string;
        gender?: string;
        birth_date?: string;
        birth_place?: string;
        family_status?: string;
        children_count?: number;
        phone?: string;
        email?: string;
        nin?: string;
        address?: string;
        grade?: { name_ar?: string };
        position?: { name_ar?: string };
        department?: { name_ar?: string };
        institution?: { name_ar?: string };
        hiring_education_level?: { name_ar?: string };
        hiring_date?: string;
        original_administration_type?: string;
        original_department?: string;
        appointment_type?: string;
        status?: string;
        created_at?: string;
    };
}

const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
        return format(new Date(dateStr), "dd MMMM yyyy", { locale: arDZ });
    } catch {
        return dateStr;
    }
};

const genderLabel = (gender?: string) => {
    if (gender === "MALE" || gender === "male") return "ذكر";
    if (gender === "FEMALE" || gender === "female") return "أنثى";
    return "-";
};

const familyStatusLabel = (status?: string) => {
    const labels: Record<string, string> = {
        SINGLE: "أعزب/عزباء",
        single: "أعزب/عزباء",
        MARRIED: "متزوج/ة",
        married: "متزوج/ة",
        DIVORCED: "مطلق/ة",
        divorced: "مطلق/ة",
        WIDOWED: "أرمل/ة",
        widowed: "أرمل/ة"
    };
    return labels[status || ""] || status || "-";
};

const appointmentTypeLabel = (type?: string) => {
    if (type === "APPOINTED" || type === "appointed") return "معين";
    if (type === "ASSIGNED" || type === "assigned") return "مكلف";
    return "-";
};

const statusBadge = (status?: string) => {
    if (status === "approved") return <Badge className="bg-green-100 text-green-700">مقبول</Badge>;
    if (status === "rejected") return <Badge className="bg-red-100 text-red-700">مرفوض</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-700">قيد المراجعة</Badge>;
};

export default function RequestDetailsView({ request }: RequestDetailsViewProps) {
    return (
        <div className="space-y-6">
            {/* Status Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">
                        {request.firstname_ar} {request.lastname_ar}
                    </h2>
                    <p className="text-muted-foreground">
                        {request.firstname_fr} {request.lastname_fr}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {statusBadge(request.status)}
                    <span className="text-sm text-muted-foreground">
                        {formatDate(request.created_at)}
                    </span>
                </div>
            </div>

            <Separator />

            {/* Personal Information */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        البيانات الشخصية
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">الاسم (عربي)</span>
                            <p className="font-medium">{request.firstname_ar || "-"}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">اللقب (عربي)</span>
                            <p className="font-medium">{request.lastname_ar || "-"}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">الاسم (لاتيني)</span>
                            <p className="font-medium">{request.firstname_fr || "-"}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">اللقب (لاتيني)</span>
                            <p className="font-medium">{request.lastname_fr || "-"}</p>
                        </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1 flex items-start gap-2">
                            <Users className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground">الجنس</span>
                                <p className="font-medium">{genderLabel(request.gender)}</p>
                            </div>
                        </div>
                        <div className="space-y-1 flex items-start gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground">تاريخ الميلاد</span>
                                <p className="font-medium">{formatDate(request.birth_date)}</p>
                            </div>
                        </div>
                        <div className="space-y-1 flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground">مكان الميلاد</span>
                                <p className="font-medium">{request.birth_place || "-"}</p>
                            </div>
                        </div>
                        <div className="space-y-1 flex items-start gap-2">
                            <CreditCard className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground">رقم التعريف الوطني (NIN)</span>
                                <p className="font-medium font-mono">{request.nin || "-"}</p>
                            </div>
                        </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1 flex items-start gap-2">
                            <Users className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground">الحالة العائلية</span>
                                <p className="font-medium">{familyStatusLabel(request.family_status)}</p>
                            </div>
                        </div>
                        <div className="space-y-1 flex items-start gap-2">
                            <Baby className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground">عدد الأولاد</span>
                                <p className="font-medium">{request.children_count ?? 0}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Phone className="w-5 h-5 text-primary" />
                        معلومات الاتصال
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-1 flex items-start gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground">رقم الهاتف</span>
                                <p className="font-medium font-mono" dir="ltr">{request.phone || "-"}</p>
                            </div>
                        </div>
                        <div className="space-y-1 flex items-start gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground">البريد الإلكتروني</span>
                                <p className="font-medium">{request.email || "-"}</p>
                            </div>
                        </div>
                        <div className="space-y-1 flex items-start gap-2">
                            <Home className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground">العنوان</span>
                                <p className="font-medium">{request.address || "-"}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Career Information */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-primary" />
                        البيانات المهنية
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-1 flex items-start gap-2">
                            <GraduationCap className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground">الرتبة</span>
                                <p className="font-medium">{request.grade?.name_ar || "-"}</p>
                            </div>
                        </div>
                        <div className="space-y-1 flex items-start gap-2">
                            <Briefcase className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground">المنصب</span>
                                <p className="font-medium">{request.position?.name_ar || "-"}</p>
                            </div>
                        </div>
                        <div className="space-y-1 flex items-start gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground">القسم/المصلحة</span>
                                <p className="font-medium">{request.department?.name_ar || "-"}</p>
                            </div>
                        </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-1 flex items-start gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground">المؤسسة</span>
                                <p className="font-medium">{request.institution?.name_ar || "-"}</p>
                            </div>
                        </div>
                        <div className="space-y-1 flex items-start gap-2">
                            <GraduationCap className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground">المستوى الدراسي للتوظيف</span>
                                <p className="font-medium">{request.hiring_education_level?.name_ar || "-"}</p>
                            </div>
                        </div>
                        <div className="space-y-1 flex items-start gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground">تاريخ التوظيف</span>
                                <p className="font-medium">{formatDate(request.hiring_date)}</p>
                            </div>
                        </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">الإدارة الأصلية</span>
                            <p className="font-medium">
                                {request.original_administration_type === "OTHER"
                                    ? request.original_department
                                    : request.original_administration_type || "-"}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">نوع التعيين</span>
                            <p className="font-medium">{appointmentTypeLabel(request.appointment_type)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
