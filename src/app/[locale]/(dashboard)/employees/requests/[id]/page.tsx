"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ArrowRight,
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
    Home,
    Check,
    X,
    Trash2,
    Loader2,
    RotateCcw
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { locationsApi } from "@/lib/api/locations";

interface EmployeeRequest {
    id: string;
    firstname_ar?: string;
    lastname_ar?: string;
    firstname_fr?: string;
    lastname_fr?: string;
    gender?: string;
    birth_date?: string;
    birth_place?: string;
    birth_wilaya_code?: string;
    birth_municipality_id?: string;
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
    profile_photo?: string;
}

const MONTHS_DZ = [
    'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
    'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
        const date = new Date(dateStr);
        const day = date.getDate();
        const month = MONTHS_DZ[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    } catch {
        return dateStr;
    }
};

const genderLabel = (gender?: string) => {
    if (gender === "male") return "ذكر";
    if (gender === "female") return "أنثى";
    return "-";
};

const familyStatusLabel = (status?: string) => {
    const labels: Record<string, string> = {
        single: "أعزب/عزباء",
        married: "متزوج/ة",
        divorced: "مطلق/ة",
        widowed: "أرمل/ة"
    };
    return labels[status || ""] || status || "-";
};

const appointmentTypeLabel = (type?: string) => {
    if (type === "appointed") return "معين";
    if (type === "assigned") return "مكلف";
    return "-";
};

const statusBadge = (status?: string) => {
    if (status === "approved") return <Badge className="bg-green-100 text-green-700">مقبول</Badge>;
    if (status === "rejected") return <Badge className="bg-red-100 text-red-700">مرفوض</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-700">قيد المراجعة</Badge>;
};

export default function RequestDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const requestId = params.id as string;

    const [request, setRequest] = useState<EmployeeRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [actionType, setActionType] = useState<"approve" | "reject" | "delete" | "reset" | null>(null);

    useEffect(() => {
        const fetchRequest = async () => {
            try {
                const response = await api.get(`/employees/requests/${requestId}`);
                setRequest(response.data);
            } catch (error) {
                console.error("Failed to fetch request:", error);
                toast.error("فشل في تحميل بيانات الطلب");
            } finally {
                setLoading(false);
            }
        };

        if (requestId) {
            fetchRequest();
        }
    }, [requestId]);

    const [locationText, setLocationText] = useState<string>("");

    useEffect(() => {
        const fetchLocation = async () => {
            if (!request?.birth_wilaya_code) return;

            try {
                // Fetch Wilayas to find the name
                // Ideally this should be cached or fetched once, but this works for details page
                const wilayas = await locationsApi.getWilayas();
                const wilaya = wilayas.find(w => w.code === request.birth_wilaya_code);

                let muniName = "";
                if (request.birth_municipality_id && wilaya) {
                    const munis = await locationsApi.getMunicipalities(wilaya.code);
                    const muni = munis.find(m => m.id === request.birth_municipality_id);
                    if (muni) muniName = muni.name_ar;
                }

                if (wilaya) {
                    setLocationText(muniName ? `${muniName} - ${wilaya.name_ar}` : wilaya.name_ar);
                }
            } catch (error) {
                console.error("Failed to fetch location details", error);
            }
        };

        if (request) {
            fetchLocation();
        }
    }, [request]);

    const handleAction = async () => {
        if (!actionType || !request) return;

        setProcessing(true);
        try {
            if (actionType === "delete") {
                await api.delete(`/employees/requests/${request.id}`);
                toast.success("تم حذف الطلب بنجاح");
                router.push("/ar/employees/requests");
            } else {
                let newStatus = "pending";
                if (actionType === "approve") newStatus = "approved";
                if (actionType === "reject") newStatus = "rejected";

                await api.patch(`/employees/requests/${request.id}`, {
                    status: newStatus
                });

                let successMsg = "تم إعادة تعيين حالة الطلب";
                if (actionType === "approve") successMsg = "تم قبول الطلب بنجاح";
                if (actionType === "reject") successMsg = "تم رفض الطلب";

                toast.success(successMsg);
                // Refresh request data
                const response = await api.get(`/employees/requests/${requestId}`);
                setRequest(response.data);
            }
        } catch (error) {
            console.error("Error updating request:", error);
            toast.error("فشل في تنفيذ الإجراء");
        } finally {
            setProcessing(false);
            setActionType(null);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto py-6 space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    if (!request) {
        return (
            <div className="container mx-auto py-6 text-center">
                <p className="text-muted-foreground">الطلب غير موجود</p>
                <Button onClick={() => router.push("/ar/employees/requests")} className="mt-4">
                    العودة للقائمة
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    onClick={() => router.push("/ar/employees/requests")}
                    className="gap-2"
                >
                    <ArrowRight className="w-4 h-4" />
                    العودة للقائمة
                </Button>

                <div className="flex gap-2">
                    {request.status !== "pending" && (
                        <Button
                            variant="outline"
                            onClick={() => setActionType("reset")}
                            disabled={processing}
                        >
                            <RotateCcw className="w-4 h-4 ms-2" />
                            إعادة تعيين
                        </Button>
                    )}
                    {request.status === "pending" && (
                        <>
                            <Button
                                variant="destructive"
                                onClick={() => setActionType("delete")}
                                disabled={processing}
                            >
                                <Trash2 className="w-4 h-4 ms-2" />
                                حذف
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => setActionType("reject")}
                                disabled={processing}
                                className="bg-orange-100 text-orange-700 hover:bg-orange-200"
                            >
                                <X className="w-4 h-4 ms-2" />
                                رفض
                            </Button>
                            <Button
                                onClick={() => setActionType("approve")}
                                disabled={processing}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {processing ? <Loader2 className="w-4 h-4 animate-spin ms-2" /> : <Check className="w-4 h-4 ms-2" />}
                                قبول
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Status Header */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {request.profile_photo ? (
                                <img
                                    src={request.profile_photo}
                                    alt="صورة شخصية"
                                    className="w-20 h-20 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                                    <User className="w-10 h-10 text-muted-foreground" />
                                </div>
                            )}
                            <div>
                                <h1 className="text-2xl font-bold">
                                    {request.firstname_ar} {request.lastname_ar}
                                </h1>
                                <p className="text-muted-foreground">
                                    {request.firstname_fr} {request.lastname_fr}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            {statusBadge(request.status)}
                            <span className="text-sm text-muted-foreground">
                                تاريخ الطلب: {formatDate(request.created_at)}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Personal Information */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        البيانات الشخصية
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-1 flex items-start gap-2">
                            <Users className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground block">الجنس</span>
                                <p className="font-medium">{genderLabel(request.gender)}</p>
                            </div>
                        </div>
                        <div className="space-y-1 flex items-start gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground block">تاريخ الميلاد</span>
                                <p className="font-medium">{formatDate(request.birth_date)}</p>
                            </div>
                        </div>
                        <div className="space-y-1 flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground block">مكان الميلاد</span>
                                <p className="font-medium">
                                    {locationText || request.birth_place || "-"}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-1 flex items-start gap-2">
                            <CreditCard className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground block">رقم التعريف الوطني (NIN)</span>
                                <p className="font-medium font-mono">{request.nin || "-"}</p>
                            </div>
                        </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-1 flex items-start gap-2">
                            <Users className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground block">الحالة العائلية</span>
                                <p className="font-medium">{familyStatusLabel(request.family_status)}</p>
                            </div>
                        </div>
                        <div className="space-y-1 flex items-start gap-2">
                            <Baby className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground block">عدد الأولاد</span>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-1 flex items-start gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground block">رقم الهاتف</span>
                                <p className="font-medium font-mono" dir="ltr">{request.phone || "-"}</p>
                            </div>
                        </div>
                        <div className="space-y-1 flex items-start gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground block">البريد الإلكتروني</span>
                                <p className="font-medium">{request.email || "-"}</p>
                            </div>
                        </div>
                        <div className="space-y-1 flex items-start gap-2">
                            <Home className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground block">العنوان</span>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-1 flex items-start gap-2">
                            <GraduationCap className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground block">الرتبة</span>
                                <p className="font-medium">{request.grade?.name_ar || "-"}</p>
                            </div>
                        </div>
                        <div className="space-y-1 flex items-start gap-2">
                            <Briefcase className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground block">المنصب</span>
                                <p className="font-medium">{request.position?.name_ar || "-"}</p>
                            </div>
                        </div>
                        <div className="space-y-1 flex items-start gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground block">القسم/المصلحة</span>
                                <p className="font-medium">{request.department?.name_ar || "-"}</p>
                            </div>
                        </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-1 flex items-start gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground block">المؤسسة</span>
                                <p className="font-medium">{request.institution?.name_ar || "-"}</p>
                            </div>
                        </div>
                        <div className="space-y-1 flex items-start gap-2">
                            <GraduationCap className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground block">المستوى الدراسي للتوظيف</span>
                                <p className="font-medium">{request.hiring_education_level?.name_ar || "-"}</p>
                            </div>
                        </div>
                        <div className="space-y-1 flex items-start gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <span className="text-sm text-muted-foreground block">تاريخ التوظيف المقترح</span>
                                <p className="font-medium">{formatDate(request.hiring_date)}</p>
                            </div>
                        </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            {/* Confirmation Dialog */}
            <AlertDialog open={!!actionType} onOpenChange={(open) => !open && setActionType(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {actionType === "approve" ? "تأكيد قبول الطلب" :
                                actionType === "reject" ? "تأكيد رفض الطلب" :
                                    actionType === "reset" ? "تأكيد إعادة التعيين" :
                                        "تأكيد حذف الطلب"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {actionType === "approve" ? "هل أنت متأكد من قبول هذا الطلب؟" :
                                actionType === "reject" ? "هل أنت متأكد من رفض هذا الطلب؟" :
                                    actionType === "reset" ? "هل أنت متأكد من إعادة تعيين حالة الطلب إلى (قيد المراجعة)؟" :
                                        "هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={processing}>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleAction}
                            disabled={processing}
                            className={actionType === "approve" ? "bg-green-600 hover:bg-green-700" :
                                actionType === "reject" ? "bg-orange-600 hover:bg-orange-700" :
                                    actionType === "reset" ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
                        >
                            {processing && <Loader2 className="w-4 h-4 animate-spin ms-2" />}
                            {actionType === "approve" ? "قبول" :
                                actionType === "reject" ? "رفض" :
                                    actionType === "reset" ? "إعادة تعيين" : "حذف"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
