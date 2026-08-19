"use client";

import { useEffect, useState, use } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { employeesApi, Employee, EmployeeChild, CreateEmployeeChildDTO } from "@/lib/api/employees";
import { skillsApi } from "@/lib/api/skills";
import { toast } from "sonner";
import {
    ArrowRight, ArrowLeft, Loader2, Edit, Phone, Mail, MapPin,
    User, Briefcase, Users, CreditCard, FileText, History, Calendar,
    AlertTriangle, Heart, Baby, Droplet, Shield, Plus, Trash2, Pencil, GraduationCap, UserPlus, Copy, Check, Info, Star
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { CareerTimeline } from "@/components/employees/CareerTimeline";
import { EmployeeDocuments } from "@/components/employees/EmployeeDocuments";
import { EmployeeRelatives } from "@/components/employees/EmployeeRelatives";
import { EmployeeLeaves } from "@/components/employees/EmployeeLeaves";
import { EchelonProgression } from "@/components/employees/EchelonProgression";
import { LegalPositionStatus } from "@/components/employees/LegalPositionStatus";
import { RetirementInfo } from "@/components/employees/RetirementInfo";
import { DisciplinaryRecords } from "@/components/employees/DisciplinaryRecords";
import { AnnualEvaluations } from "@/components/employees/AnnualEvaluations";
import { SkillMatrix } from "@/components/skills/SkillMatrix";
import { SkillGapAnalysis } from "@/components/skills/SkillGapAnalysis";
import { CompetencyEvaluationForm } from "@/components/skills/CompetencyEvaluationForm";
import { useAuthStore } from "@/lib/stores/auth";

export default function EmployeeDetailsPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = use(params);
    const t = useTranslations("employees");
    const tFields = useTranslations("employees.fields");
    const tOptions = useTranslations("employees.options");
    const router = useRouter();
    const { hasPermission, user } = useAuthStore();

    // Permission checks
    const canEditEmployee = hasPermission("employees", "edit") || user?.role === "dev_admin";
    const canViewSensitive = hasPermission("employees", "view_sensitive") || user?.role === "dev_admin";
    const canCreateUser = hasPermission("users", "create") || user?.role === "dev_admin";
    const canCreateCorrespondence = hasPermission("correspondence", "create") || user?.role === "dev_admin";

    const [employee, setEmployee] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [spouseConflict, setSpouseConflict] = useState(false);
    const [children, setChildren] = useState<EmployeeChild[]>([]);
    const [childrenLoading, setChildrenLoading] = useState(false);
    const [childDialogOpen, setChildDialogOpen] = useState(false);
    const [editingChild, setEditingChild] = useState<EmployeeChild | null>(null);
    const [childForm, setChildForm] = useState<CreateEmployeeChildDTO>({
        firstname: '',
        lastname: '',
        birth_date: '',
        gender: '',
        is_student: false,
        school_name: '',
        has_disability: false,
        notes: ''
    });

    // User creation state
    const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
    const [creatingUser, setCreatingUser] = useState(false);
    const [userCredentials, setUserCredentials] = useState<{ email: string; password: string } | null>(null);
    const [copiedPassword, setCopiedPassword] = useState(false);

    const loadChildren = async () => {
        setChildrenLoading(true);
        try {
            const data = await employeesApi.getChildren(id);
            setChildren(data);
        } catch (error) {
            console.error("Failed to load children:", error);
        } finally {
            setChildrenLoading(false);
        }
    };

    const loadEmployeeData = async () => {
        try {
            const data = await employeesApi.getById(id);
            setEmployee(data);

            // Check for spouse conflict (director working with spouse in same institution)
            if (data.spouse_employee_id && data.position?.is_senior) {
                setSpouseConflict(true);
            }
        } catch (error) {
            console.error("Failed to load employee:", error);
            toast.error(t("messages.loadError"));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadEmployeeData();
        loadChildren();
    }, [id, t]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="text-center py-20 text-muted-foreground">
                {t("messages.notFound")}
            </div>
        );
    }

    const nameAr = `${employee.firstname_ar} ${employee.lastname_ar}`;
    const nameFr = employee.firstname_fr && employee.lastname_fr
        ? `${employee.firstname_fr} ${employee.lastname_fr}`
        : null;

    const gradeName = employee.grade?.name_ar || "—";
    const positionName = employee.position?.name_ar || "—";
    const institutionName = employee.institution?.name_ar || "—";
    const departmentName = employee.department?.name_ar || "—";

    const initials = `${employee.firstname_ar?.[0] || ''}.${employee.lastname_ar?.[0] || ''}`;

    // Algerian Month Names
    const ALGERIAN_MONTHS = [
        "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
        "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];

    const formatDate = (dateStr: string, isEstimated: boolean = false) => {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        const year = d.getFullYear();

        if (isEstimated) {
            return `${year} (مفترض)`;
        }

        const day = d.getDate();
        const month = ALGERIAN_MONTHS[d.getMonth()];
        return `${day} ${month} ${year}`;
    };

    const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon?: any }) => (
        <div className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
            {Icon && <Icon className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />}
            <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
                <p className="text-base font-medium text-slate-800 dark:text-slate-200 truncate">
                    {value || "—"}
                </p>
            </div>
        </div>
    );

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        {locale === 'ar' ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
                    </button>
                    <h1 className="text-2xl font-bold">{t("actions.view")}</h1>
                </div>
                {canEditEmployee && (
                    <Button onClick={() => router.push(`/${locale}/employees/${id}/edit`)}>
                        <Edit className="h-4 w-4 me-2" />
                        {t("actions.edit")}
                    </Button>
                )}
            </div>

            {/* Spouse Conflict Alert */}
            {spouseConflict && (
                <Alert className="mb-6 bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-600">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <AlertTitle className="text-amber-800 dark:text-amber-200">
                        تنبيه: تضارب مصالح محتمل
                    </AlertTitle>
                    <AlertDescription className="text-amber-700 dark:text-amber-300">
                        هذا الموظف يشغل منصباً إدارياً ويعمل مع زوجته/زوجه في نفس المؤسسة.
                    </AlertDescription>
                </Alert>
            )}

            {/* Dual Position Alert */}
            {employee.secondary_position && (
                <Alert className="mb-6 bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-600">
                    <Info className="h-5 w-5 text-blue-600" />
                    <AlertTitle className="text-blue-800 dark:text-blue-200">
                        معلومات التكليف المزدوج
                    </AlertTitle>
                    <AlertDescription className="text-blue-700 dark:text-blue-300">
                        هذا الموظف يشغل منصبين:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>
                                <strong>{positionName}</strong>
                                {employee.appointment_type === 'APPOINTED' ? ' (معيّن)' : ' (مكلّف)'}
                                {/* @ts-ignore - nested relationships usually expanded but TS might complain */}
                                في {employee.institution?.name_ar || institutionName}
                            </li>
                            <li>
                                <strong>{locale === 'ar' ? employee.secondary_position.name_ar : employee.secondary_position.name_fr || employee.secondary_position.name_ar}</strong>
                                {employee.secondary_appointment_type === 'APPOINTED' ? ' (معيّن)' : ' (مكلّف)'}
                                {employee.secondary_institution && (
                                    <span> في المؤسسة: {locale === 'ar' ? employee.secondary_institution.name_ar : employee.secondary_institution.name_fr || employee.secondary_institution.name_ar}</span>
                                )}
                                {!employee.secondary_institution && employee.secondary_municipality && (
                                    <span> ببلدية {locale === 'ar' ? employee.secondary_municipality.name_ar : employee.secondary_municipality.name_fr || employee.secondary_municipality.name_ar}</span>
                                )}
                                {!employee.secondary_institution && !employee.secondary_municipality && employee.secondary_district && (
                                    <span> بمقاطعة {locale === 'ar' ? employee.secondary_district.name_ar : employee.secondary_district.name_fr || employee.secondary_district.name_ar}</span>
                                )}
                            </li>
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            {/* Profile Card */}
            <Card className="mb-6 overflow-hidden">
                <div className="bg-gradient-to-l from-emerald-600 to-emerald-700 h-32" />
                <CardContent className="relative pt-0">
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-16">
                        {/* Avatar */}
                        <div
                            className="relative rounded-full p-[4px] bg-card shadow-xl"
                        >
                            <Avatar className="h-32 w-32">
                                {employee.profile_photo ? (
                                    <AvatarImage src={employee.profile_photo} alt={nameAr} className="object-cover" />
                                ) : null}
                                <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 text-slate-600 dark:text-slate-300 text-3xl font-bold">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <span
                                className={cn(
                                    "absolute bottom-2 end-2 h-5 w-5 rounded-full border-[3px] border-white dark:border-slate-900",
                                    employee.is_active ? "bg-emerald-500" : "bg-slate-400"
                                )}
                            />
                        </div>

                        {/* Info */}
                        <div className="flex-1 pb-4">
                            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                                {nameAr}
                            </h2>
                            {nameFr && (
                                <p className="text-lg text-slate-600 dark:text-slate-400">{nameFr}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-3">
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                    {positionName}
                                </Badge>
                                {employee.secondary_position && (
                                    <>
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200" title="منصب ثاني">
                                            📌 {locale === 'ar' ? employee.secondary_position.name_ar : employee.secondary_position.name_fr || employee.secondary_position.name_ar}
                                        </Badge>
                                        {employee.secondary_institution && (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200" title="مؤسسة المنصب الثاني">
                                                {locale === 'ar' ? employee.secondary_institution.name_ar : employee.secondary_institution.name_fr || employee.secondary_institution.name_ar}
                                            </Badge>
                                        )}
                                        {!employee.secondary_institution && employee.secondary_municipality && (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200" title="بلدية المنصب الثاني">
                                                بلدية {locale === 'ar' ? employee.secondary_municipality.name_ar : employee.secondary_municipality.name_fr || employee.secondary_municipality.name_ar}
                                            </Badge>
                                        )}
                                        {!employee.secondary_institution && !employee.secondary_municipality && employee.secondary_district && (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200" title="مقاطعة المنصب الثاني">
                                                مقاطعة {locale === 'ar' ? employee.secondary_district.name_ar : employee.secondary_district.name_fr || employee.secondary_district.name_ar}
                                            </Badge>
                                        )}
                                    </>
                                )}
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    {gradeName}
                                </Badge>
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                    {institutionName}
                                </Badge>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-2 pb-4">
                            {/* Create User Button - only show if no user_id and has permission */}
                            {!employee.user_id && canCreateUser && (
                                <Button
                                    variant="default"
                                    size="sm"
                                    className="rounded-full bg-primary hover:bg-primary/90"
                                    onClick={() => setCreateUserDialogOpen(true)}
                                >
                                    <UserPlus className="h-4 w-4 me-2" />
                                    إنشاء حساب
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="icon"
                                className="rounded-full"
                                onClick={() => employee.mobile && window.open(`tel:${employee.mobile}`)}
                            >
                                <Phone className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="rounded-full"
                                onClick={() => employee.email && window.open(`mailto:${employee.email}`)}
                            >
                                <Mail className="h-4 w-4" />
                            </Button>
                            {canCreateCorrespondence && (
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="rounded-full"
                                    title="إنشاء مراسلة"
                                    onClick={() => router.push(`/${locale}/correspondence/new?employee_id=${id}`)}
                                >
                                    <FileText className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="personal" className="w-full" dir="rtl">
                <TabsList className="grid w-full grid-cols-7 mb-6">
                    <TabsTrigger value="personal" className="gap-2">
                        <User className="h-4 w-4" />
                        <span className="hidden sm:inline">شخصية</span>
                    </TabsTrigger>
                    <TabsTrigger value="job" className="gap-2">
                        <Briefcase className="h-4 w-4" />
                        <span className="hidden sm:inline">وظيفية</span>
                    </TabsTrigger>
                    {canViewSensitive && (
                        <>
                            <TabsTrigger value="family" className="gap-2">
                                <Users className="h-4 w-4" />
                                <span className="hidden sm:inline">عائلية</span>
                            </TabsTrigger>
                            <TabsTrigger value="financial" className="gap-2">
                                <CreditCard className="h-4 w-4" />
                                <span className="hidden sm:inline">مالية</span>
                            </TabsTrigger>
                            <TabsTrigger value="skills" className="gap-2">
                                <Star className="h-4 w-4" />
                                <span className="hidden sm:inline">مهارات</span>
                            </TabsTrigger>
                            <TabsTrigger value="documents" className="gap-2">
                                <FileText className="h-4 w-4" />
                                <span className="hidden sm:inline">وثائق</span>
                            </TabsTrigger>
                            <TabsTrigger value="leaves" className="gap-2">
                                <Calendar className="h-4 w-4" />
                                <span className="hidden sm:inline">الرخص</span>
                            </TabsTrigger>
                        </>
                    )}

                </TabsList>

                {/* Personal Tab */}
                <TabsContent value="personal">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <User className="h-5 w-5 text-emerald-600" />
                                    الهوية
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <InfoRow label="الاسم الكامل" value={`${employee.firstname_ar} ${employee.lastname_ar}`} />
                                <InfoRow label="اسم الأب" value={employee.father_name} />
                                <InfoRow label="اسم ولقب الأم" value={employee.mother_fullname} />
                                {canViewSensitive && (
                                    <InfoRow label="رقم التعريف الوطني" value={employee.national_id} />
                                )}
                                <InfoRow label="الجنس" value={employee.gender ? t(`options.gender.${employee.gender.toUpperCase()}`) : '—'} />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <MapPin className="h-5 w-5 text-emerald-600" />
                                    الميلاد والإقامة
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <InfoRow label="تاريخ الميلاد" value={formatDate(employee.birth_date, employee.is_birth_date_estimated)} />
                                <InfoRow label="مكان الميلاد" value={employee.birth_municipality?.name_ar || employee.birth_place} />
                                <InfoRow label="ولاية الميلاد" value={employee.birth_wilaya?.name_ar} />
                                <InfoRow label="العنوان" value={employee.address} />
                                <InfoRow label="المدينة" value={employee.city} />
                            </CardContent>
                        </Card>

                        {canViewSensitive && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Droplet className="h-5 w-5 text-red-500" />
                                        معلومات إضافية
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <InfoRow label="فصيلة الدم" value={employee.blood_type} icon={Droplet} />
                                    <InfoRow
                                        label="وضعية الخدمة الوطنية"
                                        value={employee.military_service_status ? t(`options.militaryStatus.${employee.military_service_status.toUpperCase()}`) : '-'}
                                        icon={Shield}
                                    />
                                    <InfoRow label="رقم شهادة الخدمة" value={employee.military_service_number} />
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Phone className="h-5 w-5 text-emerald-600" />
                                    الاتصال
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <InfoRow label="الهاتف النقال" value={employee.mobile} icon={Phone} />
                                <InfoRow label="الهاتف الثابت" value={employee.phone} />
                                <InfoRow label="البريد الإلكتروني" value={employee.email} icon={Mail} />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Job Tab */}
                <TabsContent value="job">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Briefcase className="h-5 w-5 text-emerald-600" />
                                    المسار المهني
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <InfoRow label="رقم التسجيل" value={employee.employee_number} />
                                <InfoRow label="الرتبة" value={employee.grade?.name_ar} />
                                <InfoRow label="الدرجة" value={employee.rank} />
                                <InfoRow label="المنصب" value={employee.position?.name_ar} />
                                <InfoRow label="المصلحة" value={employee.department?.name_ar} />
                                <InfoRow label="المكتب" value={employee.office?.name_ar} />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <History className="h-5 w-5 text-emerald-600" />
                                    التواريخ المهنية
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <InfoRow label="تاريخ التوظيف" value={formatDate(employee.hire_date)} />
                                <InfoRow label="تاريخ الترسيم" value={formatDate(employee.confirmation_date)} />
                                <InfoRow label="تاريخ آخر ترقية" value={formatDate(employee.last_promotion_date)} />
                                <InfoRow
                                    label="نوع التوظيف"
                                    value={employee.employment_type ? t(`options.employmentType.${employee.employment_type.toUpperCase()}`) : '-'}
                                />
                                <InfoRow label="المؤسسة" value={employee.institution?.name_ar} />
                            </CardContent>
                        </Card>

                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-lg">الإدارة الأصلية</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <InfoRow
                                    label="نوع الإدارة"
                                    value={employee.original_administration_type ? tOptions(`orgAdminType.${employee.original_administration_type.toUpperCase()}`) : null}
                                />
                                <InfoRow label="الإدارة الأصلية" value={employee.original_department} />
                            </CardContent>
                        </Card>

                        {employee.secondary_position_id && (
                            <Card className="md:col-span-2 border-primary/20 bg-primary/5">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Briefcase className="h-5 w-5 text-primary" />
                                        المنصب الثاني (مزدوج)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InfoRow label="المنصب" value={employee.secondary_position?.name_ar} />
                                    <InfoRow
                                        label="طبيعة التعيين"
                                        value={
                                            employee.secondary_appointment_type === 'APPOINTED' ? 'معين (بقرار)' :
                                            employee.secondary_appointment_type === 'ASSIGNED' ? 'مكلف (مؤقت)' :
                                            employee.secondary_appointment_type
                                        }
                                    />
                                    {employee.secondary_institution && (
                                        <InfoRow label="المؤسسة" value={employee.secondary_institution?.name_ar} />
                                    )}
                                    {employee.secondary_district && (
                                        <InfoRow label="المقاطعة" value={employee.secondary_district?.name_ar} />
                                    )}
                                    {employee.secondary_municipality && (
                                        <InfoRow label="البلدية" value={employee.secondary_municipality?.name_ar} />
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Detailed job info - requires view_sensitive permission */}
                        {canViewSensitive && (
                            <>
                                <div className="md:col-span-2">
                                    <RetirementInfo employeeId={id} />
                                </div>

                                <div className="md:col-span-2">
                                    <EchelonProgression employeeId={id} />
                                </div>

                                <div className="md:col-span-2">
                                    <LegalPositionStatus employeeId={id} currentPosition={employee.legal_position || "ACTIVE"} canEdit={canEditEmployee} />
                                </div>

                                <div className="md:col-span-2">
                                    <DisciplinaryRecords employeeId={id} canEdit={canEditEmployee} />
                                </div>

                                <div className="md:col-span-2">
                                    <AnnualEvaluations employeeId={id} canEdit={canEditEmployee} />
                                </div>

                                <div className="md:col-span-2">
                                    <CareerTimeline employeeId={id} canEdit={canEditEmployee} onEventChange={loadEmployeeData} />
                                </div>
                            </>
                        )}
                    </div>
                </TabsContent>

                {/* Family Tab */}
                <TabsContent value="family">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Heart className="h-5 w-5 text-pink-500" />
                                    الحالة العائلية
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <InfoRow
                                    label="الحالة"
                                    value={employee.marital_status ? tOptions(`maritalStatus.${employee.marital_status.toUpperCase()}`) : null}
                                />
                                <InfoRow label="عدد الأطفال" value={employee.children_count?.toString()} />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Users className="h-5 w-5 text-emerald-600" />
                                    الزوج/الزوجة
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <InfoRow label="الاسم" value={employee.spouse_name} />
                                <InfoRow label="المهنة" value={employee.spouse_profession} />
                                <InfoRow label="جهة العمل" value={employee.spouse_employer} />
                                {employee.spouse_employee_id && (
                                    <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                                            ✓ الزوج/ة موظف/ة في نفس القطاع
                                        </p>
                                        <div className="mt-2 flex items-start gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                                            <Info className="h-4 w-4 shrink-0" />
                                            <span>تنبيه: هذا الموظف يشغل منصبين في نفس القطاع.</span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Baby className="h-5 w-5 text-blue-500" />
                                    الأبناء ({children.length})
                                </CardTitle>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        setEditingChild(null);
                                        setChildForm({
                                            firstname: '',
                                            lastname: '',
                                            birth_date: '',
                                            gender: '',
                                            is_student: false,
                                            school_name: '',
                                            has_disability: false,
                                            notes: ''
                                        });
                                        setChildDialogOpen(true);
                                    }}
                                >
                                    <Plus className="h-4 w-4 me-1" />
                                    إضافة
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {childrenLoading ? (
                                    <div className="flex justify-center py-4">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                ) : children.length === 0 ? (
                                    <p className="text-slate-500 text-center py-4">
                                        لا يوجد أبناء مسجلون
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {children.map((child) => (
                                            <div key={child.id} className="p-3 bg-muted rounded-lg flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "h-10 w-10 rounded-full flex items-center justify-center",
                                                        child.gender === 'MALE' ? "bg-blue-100 text-blue-600" : "bg-pink-100 text-pink-600"
                                                    )}>
                                                        <Baby className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">
                                                            {child.firstname} {child.lastname || ''}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                                            {child.birth_date && (
                                                                <span>{formatDate(child.birth_date)}</span>
                                                            )}
                                                            {child.is_student && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    <GraduationCap className="h-3 w-3 me-1" />
                                                                    طالب
                                                                </Badge>
                                                            )}
                                                            {child.has_disability && (
                                                                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
                                                                    ذوي احتياجات خاصة
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            setEditingChild(child);
                                                            setChildForm({
                                                                firstname: child.firstname,
                                                                lastname: child.lastname || '',
                                                                birth_date: child.birth_date?.split('T')[0] || '',
                                                                gender: child.gender || '',
                                                                is_student: child.is_student,
                                                                school_name: child.school_name || '',
                                                                has_disability: child.has_disability,
                                                                notes: child.notes || ''
                                                            });
                                                            setChildDialogOpen(true);
                                                        }}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-700"
                                                        onClick={async () => {
                                                            if (confirm('هل أنت متأكد من حذف هذا الابن؟')) {
                                                                try {
                                                                    await employeesApi.deleteChild(id, child.id);
                                                                    toast.success('تم الحذف بنجاح');
                                                                    loadChildren();
                                                                } catch (error) {
                                                                    toast.error('فشل الحذف');
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <EmployeeRelatives employeeId={id} canEdit={canEditEmployee} />





                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Phone className="h-5 w-5 text-red-500" />
                                    جهة اتصال الطوارئ
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <InfoRow label="الاسم" value={employee.emergency_contact_name} />
                                <InfoRow label="الهاتف" value={employee.emergency_contact_phone} />
                                <InfoRow label="صلة القرابة" value={employee.emergency_contact_relationship ? tOptions(`relationships.${employee.emergency_contact_relationship.toUpperCase()}`) : null} />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Financial Tab - only for users with view_sensitive permission */}
                {canViewSensitive && (
                    <TabsContent value="financial">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <CreditCard className="h-5 w-5 text-emerald-600" />
                                        المعلومات البنكية
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <InfoRow label="اسم البنك" value={employee.bank_name} />
                                    <InfoRow label="رقم الحساب (RIP)" value={employee.bank_account} />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Shield className="h-5 w-5 text-blue-600" />
                                        الأرقام الإدارية
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <InfoRow label="رقم الضمان الاجتماعي (CNAS)" value={employee.social_security_number} />
                                    <InfoRow label="الرقم الجبائي (NIF)" value={employee.nif} />
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                )}

                {/* Skills Tab */}
                <TabsContent value="skills">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Star className="h-5 w-5 text-amber-500" />
                                        المهارات المسجلة
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <SkillMatrix employeeId={id} />
                                </CardContent>
                            </Card>

                            <SkillGapAnalysis employeeId={id} />

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <GraduationCap className="h-5 w-5 text-blue-500" />
                                        تقييمات الكفاءات
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CompetencyEvaluationsList employeeId={id} />
                                </CardContent>
                            </Card>
                        </div>
                        <div className="space-y-6">
                            <CompetencyEvaluationForm employeeId={id} onSuccess={() => window.location.reload()} />
                        </div>
                    </div>
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents">
                    <EmployeeDocuments employeeId={id} canEdit={canEditEmployee} />
                </TabsContent>

                {/* Leaves Tab */}
                <TabsContent value="leaves">
                    <EmployeeLeaves employeeId={id} canEdit={canEditEmployee} />
                </TabsContent>


            </Tabs>

            {/* Child Dialog */}
            <Dialog open={childDialogOpen} onOpenChange={setChildDialogOpen}>
                <DialogContent className="max-w-md" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingChild ? 'تعديل بيانات الابن/ة' : 'إضافة ابن/ة جديد'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstname">الاسم *</Label>
                                <Input
                                    id="firstname"
                                    value={childForm.firstname}
                                    onChange={(e) => setChildForm({ ...childForm, firstname: e.target.value })}
                                    placeholder="الاسم"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastname">اللقب</Label>
                                <Input
                                    id="lastname"
                                    value={childForm.lastname}
                                    onChange={(e) => setChildForm({ ...childForm, lastname: e.target.value })}
                                    placeholder="اللقب"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="birth_date">تاريخ الميلاد</Label>
                                <DateTimePicker
                                    value={childForm.birth_date}
                                    onChange={(value) => setChildForm({ ...childForm, birth_date: value })}
                                    placeHolder="اختر تاريخ الميلاد"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gender">الجنس</Label>
                                <Select
                                    value={childForm.gender}
                                    onValueChange={(value) => setChildForm({ ...childForm, gender: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MALE">ذكر</SelectItem>
                                        <SelectItem value="FEMALE">أنثى</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="is_student"
                                    checked={childForm.is_student}
                                    onCheckedChange={(checked) => setChildForm({ ...childForm, is_student: !!checked })}
                                />
                                <Label htmlFor="is_student" className="cursor-pointer">طالب/ة</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="has_disability"
                                    checked={childForm.has_disability}
                                    onCheckedChange={(checked) => setChildForm({ ...childForm, has_disability: !!checked })}
                                />
                                <Label htmlFor="has_disability" className="cursor-pointer">ذوي احتياجات خاصة</Label>
                            </div>
                        </div>
                        {childForm.is_student && (
                            <div className="space-y-2">
                                <Label htmlFor="school_name">اسم المؤسسة التعليمية</Label>
                                <Input
                                    id="school_name"
                                    value={childForm.school_name}
                                    onChange={(e) => setChildForm({ ...childForm, school_name: e.target.value })}
                                    placeholder="اسم المدرسة / الجامعة"
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="notes">ملاحظات</Label>
                            <Input
                                id="notes"
                                value={childForm.notes}
                                onChange={(e) => setChildForm({ ...childForm, notes: e.target.value })}
                                placeholder="ملاحظات إضافية"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setChildDialogOpen(false)}>
                            إلغاء
                        </Button>
                        <Button
                            onClick={async () => {
                                if (!childForm.firstname) {
                                    toast.error('الاسم مطلوب');
                                    return;
                                }
                                try {
                                    if (editingChild) {
                                        await employeesApi.updateChild(id, editingChild.id, childForm);
                                        toast.success('تم التحديث بنجاح');
                                    } else {
                                        await employeesApi.createChild(id, childForm);
                                        toast.success('تمت الإضافة بنجاح');
                                    }
                                    setChildDialogOpen(false);
                                    loadChildren();
                                } catch (error) {
                                    toast.error('حدث خطأ');
                                }
                            }}
                        >
                            {editingChild ? 'تحديث' : 'إضافة'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create User Dialog */}
            <Dialog open={createUserDialogOpen} onOpenChange={(open) => {
                setCreateUserDialogOpen(open);
                if (!open) {
                    setUserCredentials(null);
                    setCopiedPassword(false);
                }
            }}>
                <DialogContent className="sm:max-w-md" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>
                            {userCredentials ? 'تم إنشاء الحساب بنجاح' : 'إنشاء حساب مستخدم'}
                        </DialogTitle>
                    </DialogHeader>

                    {userCredentials ? (
                        <div className="space-y-4">
                            <Alert className="bg-green-50 border-green-200">
                                <Check className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800">
                                    تم إنشاء الحساب وإرسال بيانات الدخول للبريد الإلكتروني
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                                <div>
                                    <Label className="text-sm text-slate-500">البريد الإلكتروني</Label>
                                    <p className="font-mono text-sm">{userCredentials.email}</p>
                                </div>
                                <div>
                                    <Label className="text-sm text-slate-500">كلمة المرور المؤقتة</Label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 p-2 bg-white rounded border font-mono text-sm">
                                            {userCredentials.password}
                                        </code>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => {
                                                navigator.clipboard.writeText(userCredentials.password);
                                                setCopiedPassword(true);
                                                toast.success('تم النسخ');
                                            }}
                                        >
                                            {copiedPassword ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button onClick={() => {
                                    setCreateUserDialogOpen(false);
                                    // Refresh employee data to show user_id
                                    window.location.reload();
                                }}>
                                    إغلاق
                                </Button>
                            </DialogFooter>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-slate-600">
                                سيتم إنشاء حساب مستخدم للموظف <strong>{employee?.firstname_ar} {employee?.lastname_ar}</strong>
                            </p>

                            {!employee?.email && (
                                <Alert className="bg-amber-50 border-amber-200">
                                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                                    <AlertDescription className="text-amber-800">
                                        يجب إضافة بريد إلكتروني للموظف قبل إنشاء الحساب
                                    </AlertDescription>
                                </Alert>
                            )}

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setCreateUserDialogOpen(false)}>
                                    إلغاء
                                </Button>
                                <Button
                                    disabled={creatingUser || !employee?.email}
                                    onClick={async () => {
                                        setCreatingUser(true);
                                        try {
                                            const result = await employeesApi.createUserForEmployee(id);
                                            setUserCredentials({
                                                email: result.email,
                                                password: result.password
                                            });
                                            toast.success(result.message);
                                        } catch (error: any) {
                                            toast.error(error?.response?.data?.detail || 'فشل في إنشاء الحساب');
                                        } finally {
                                            setCreatingUser(false);
                                        }
                                    }}
                                >
                                    {creatingUser && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                                    إنشاء الحساب
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function CompetencyEvaluationsList({ employeeId }: { employeeId: string }) {
    const [evals, setEvals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const data = await skillsApi.getEvaluations(employeeId);
                setEvals(data);
            } catch { /* ignore */ }
            finally { setLoading(false); }
        };
        load();
    }, [employeeId]);

    if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>;

    if (evals.length === 0) return <p className="text-center text-muted-foreground py-4">لا توجد تقييمات</p>;

    const getStars = (score: number) => "★".repeat(score) + "☆".repeat(5 - score);

    return (
        <div className="space-y-3">
            {evals.map((e: any) => (
                <div key={e.id} className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-amber-500">{getStars(e.score)}</span>
                            <Badge variant="outline" className="text-xs">{e.competency_type}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {new Date(e.evaluation_date).toLocaleDateString("ar-DZ")}
                        </span>
                    </div>
                    {e.comments && <p className="text-sm mt-2 text-muted-foreground">{e.comments}</p>}
                    {e.evaluator_name && (
                        <p className="text-xs text-muted-foreground mt-1">المقيم: {e.evaluator_name}</p>
                    )}
                </div>
            ))}
        </div>
    );
}
