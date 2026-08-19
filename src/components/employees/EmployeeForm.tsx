"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Loader2, Save, User, Phone, Briefcase, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

import { useEmployeesStore } from "@/lib/stores/employees";
import { useInstitutionsStore } from "@/lib/stores/institutions"; // For linking to institution
import { Employee } from "@/lib/api/employees";
import { locationsApi, District, Municipality } from "@/lib/api/locations";
import { getErrorMessage } from "@/lib/api/client";

interface EmployeeFormProps {
    initialData?: Employee;
    isEdit?: boolean;
}

export function EmployeeForm({ initialData, isEdit = false }: EmployeeFormProps) {
    const t = useTranslations("employees");
    const tCommon = useTranslations("common");
    const router = useRouter();

    // Stores
    const { createEmployee, updateEmployee, departments, fetchReferences } = useEmployeesStore();
    const { fetchInstitutions, institutions } = useInstitutionsStore(); // Need this to select institution

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [districts, setDistricts] = useState<District[]>([]);
    const [municipalities, setMunicipalities] = useState<Municipality[]>([]);

    // Determine if fields are read only (for edits, maybe some fields like birth info shouldn't change?)
    // But for this task request, no restrictions mentioned.

    // Fetch data on mount
    useEffect(() => {
        fetchInstitutions({ size: 100 });
        fetchReferences();

        // Fetch locations
        locationsApi.getDistricts().then(setDistricts).catch(() => toast.error("فشل في جلب المقاطعات"));
        locationsApi.getMunicipalities().then(setMunicipalities).catch(() => toast.error("فشل في جلب البلديات"));
    }, [fetchInstitutions, fetchReferences]);

    const formSchema = z.object({
        // Personal
        firstname_ar: z.string().min(2, tCommon("required")),
        lastname_ar: z.string().min(2, tCommon("required")),
        firstname_fr: z.string().optional(),
        lastname_fr: z.string().optional(),
        national_id: z.string().optional(),

        // Contact
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        address: z.string().optional(),

        // Professional
        employee_number: z.string().optional(),
        grade: z.string().optional(),
        department: z.string().optional(), // Enum
        position: z.string().optional(),
        institution_id: z.string().optional(), // UUID

        // New Geographic Assignment
        work_location_type: z.string().optional(),
        work_district_id: z.string().optional(),
        work_municipality_id: z.string().optional(),

        // New Status
        work_status: z.string().optional(),
        work_status_date: z.string().optional(),
        work_status_reason: z.string().optional(),
        appointment_type: z.string().optional(),

        is_active: z.boolean(),
        hire_date: z.string().optional(),
        create_user_account: z.boolean(),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            firstname_ar: initialData?.firstname_ar || "",
            lastname_ar: initialData?.lastname_ar || "",
            firstname_fr: initialData?.firstname_fr || "",
            lastname_fr: initialData?.lastname_fr || "",
            national_id: initialData?.national_id || "",
            phone: initialData?.phone || "",
            // email: initialData?.email || "", // Not in schema yet, add to schema if needed or map to backend
            address: initialData?.address || "",
            employee_number: initialData?.employee_number || "",
            grade: initialData?.grade_id ?? (typeof initialData?.grade === 'object' ? initialData?.grade?.id : "") ?? "",
            department: typeof initialData?.department === 'object' ? initialData?.department?.id : initialData?.department ?? "",
            position: initialData?.position_id ?? (typeof initialData?.position === 'object' ? initialData?.position?.id : "") ?? "",
            institution_id: initialData?.institution_id || "",

            work_location_type: initialData?.work_location_type || "institution",
            work_district_id: initialData?.work_district_id || "",
            work_municipality_id: initialData?.work_municipality_id || "",

            work_status: initialData?.work_status || "active",
            work_status_date: initialData?.work_status_date ? new Date(initialData.work_status_date).toISOString().split('T')[0] : "",
            work_status_reason: initialData?.work_status_reason || "",
            appointment_type: initialData?.appointment_type || "",

            is_active: initialData?.is_active ?? true,
            hire_date: initialData?.hire_date ? new Date(initialData.hire_date).toISOString().split('T')[0] : "",
            create_user_account: false,
        },
    });

    const workLocationType = form.watch("work_location_type");
    const workStatus = form.watch("work_status");

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true);

        try {
            if (isEdit && initialData) {
                // Remove create_user_account from update payload as it's only for creation
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { create_user_account, ...updateValues } = values;
                await updateEmployee(initialData.id, updateValues);
                toast.success(tCommon("success"));
            } else {
                await createEmployee(values);
                toast.success(tCommon("success"));
            }
            router.push("/employees");
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }

    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                <Tabs defaultValue="personal" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="personal" className="gap-2">
                            <User className="h-4 w-4" />
                            {t("steps.personal")}
                        </TabsTrigger>
                        <TabsTrigger value="contact" className="gap-2">
                            <Phone className="h-4 w-4" />
                            {t("steps.contact")}
                        </TabsTrigger>
                        <TabsTrigger value="professional" className="gap-2">
                            <Briefcase className="h-4 w-4" />
                            {t("steps.professional")}
                        </TabsTrigger>
                    </TabsList>

                    {/* Personal Info Tab */}
                    <TabsContent value="personal" className="space-y-4 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t("steps.personal")}</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="firstname_ar"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("fields.nameAr")}</FormLabel>
                                            <FormControl>
                                                <Input {...field} dir="rtl" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="lastname_ar"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("fields.name")} ({tCommon("languages.ar")})</FormLabel>
                                            <FormControl>
                                                <Input {...field} dir="rtl" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="firstname_fr"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("fields.nameFr")}</FormLabel>
                                            <FormControl>
                                                <Input {...field} dir="ltr" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="lastname_fr"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("fields.name")} ({tCommon("languages.fr")})</FormLabel>
                                            <FormControl>
                                                <Input {...field} dir="ltr" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="national_id"
                                    render={({ field }) => {
                                        // Detect encryption broadly: Starts with 'g', long (>30 chars), and no spaces (Base64-like)
                                        const isEncrypted = field.value && typeof field.value === 'string' && field.value.length > 30 && field.value.startsWith('g') && !field.value.includes(' ');
                                        return (
                                            <FormItem>
                                                <FormLabel>{t("fields.nationalId")}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        dir="ltr"
                                                        className={isEncrypted ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-xs font-mono" : ""}
                                                    />
                                                </FormControl>
                                                {isEncrypted && (
                                                    <p className="text-[0.8rem] font-medium text-amber-600 dark:text-amber-500 mt-1">
                                                        ⚠️ لم يتم فك تشفير البيانات (النص المشفر معروض)
                                                    </p>
                                                )}
                                                <FormMessage />
                                            </FormItem>
                                        );
                                    }}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Contact Tab */}
                    <TabsContent value="contact" className="space-y-4 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t("steps.contact")}</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => {
                                        // Detect encryption broadly: Starts with 'g', long (>30 chars), and no spaces (Base64-like)
                                        const isEncrypted = field.value && typeof field.value === 'string' && field.value.length > 30 && field.value.startsWith('g') && !field.value.includes(' ');
                                        return (
                                            <FormItem>
                                                <FormLabel>{t("fields.phone")}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        dir="ltr"
                                                        type={isEncrypted ? "text" : "tel"}
                                                        className={isEncrypted ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-xs font-mono" : ""}
                                                    />
                                                </FormControl>
                                                {isEncrypted && (
                                                    <p className="text-[0.8rem] font-medium text-amber-600 dark:text-amber-500 mt-1">
                                                        ⚠️ لم يتم فك تشفير البيانات (النص المشفر معروض)
                                                    </p>
                                                )}
                                                <FormMessage />
                                            </FormItem>
                                        );
                                    }}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("fields.email")}</FormLabel>
                                            <FormControl>
                                                <Input {...field} dir="ltr" type="email" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => {
                                        // Detect encryption broadly: Starts with 'g', long (>30 chars), and no spaces (Base64-like)
                                        const isEncrypted = field.value && typeof field.value === 'string' && field.value.length > 30 && field.value.startsWith('g') && !field.value.includes(' ');
                                        return (
                                            <FormItem className="md:col-span-2">
                                                <FormLabel>{t("fields.address")}</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        {...field}
                                                        className={isEncrypted ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-xs font-mono" : ""}
                                                    />
                                                </FormControl>
                                                {isEncrypted && (
                                                    <p className="text-[0.8rem] font-medium text-amber-600 dark:text-amber-500 mt-1">
                                                        ⚠️ لم يتم فك تشفير البيانات (النص المشفر معروض)
                                                    </p>
                                                )}
                                                <FormMessage />
                                            </FormItem>
                                        );
                                    }}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Professional Tab */}
                    <TabsContent value="professional" className="space-y-4 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t("steps.professional")}</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="employee_number"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>رقم الموظف</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="appointment_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("fields.appointmentType")}</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={tCommon("select")} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="appointed">{t("appointmentTypes.appointed")}</SelectItem>
                                                    <SelectItem value="assigned">{t("appointmentTypes.assigned")}</SelectItem>
                                                    <SelectItem value="elected">{t("appointmentTypes.elected")}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="grade"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("fields.grade")}</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="position"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("fields.position")}</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="col-span-1 md:col-span-2 border-t pt-4 mt-2">
                                    <h4 className="text-sm font-medium mb-3 text-muted-foreground">مكان العمل</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="work_location_type"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("fields.workLocationType")}</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder={tCommon("select")} />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="institution">{t("locationTypes.institution")}</SelectItem>
                                                            <SelectItem value="municipality">{t("locationTypes.municipality")}</SelectItem>
                                                            <SelectItem value="district">{t("locationTypes.district")}</SelectItem>
                                                            <SelectItem value="central">{t("locationTypes.central")}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Dynamic Location Select */}
                                        {workLocationType === 'institution' && (
                                            <FormField
                                                control={form.control}
                                                name="institution_id"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("fields.institution")}</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder={tCommon("select")} />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {institutions.map((inst) => (
                                                                    <SelectItem key={inst.id} value={inst.id}>
                                                                        {inst.name_ar}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}

                                        {workLocationType === 'district' && (
                                            <FormField
                                                control={form.control}
                                                name="work_district_id"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("fields.workDistrict")}</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder={tCommon("select")} />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {districts.map((dist) => (
                                                                    <SelectItem key={dist.id} value={dist.id}>
                                                                        {dist.name_ar}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}

                                        {workLocationType === 'municipality' && (
                                            <FormField
                                                control={form.control}
                                                name="work_municipality_id"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("fields.workMunicipality")}</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder={tCommon("select")} />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {municipalities.map((mun) => (
                                                                    <SelectItem key={mun.id} value={mun.id}>
                                                                        {mun.name_ar}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}

                                        {/* Department is relevant for Central or Institution */}
                                        {(workLocationType === 'institution' || workLocationType === 'central') && (
                                            <FormField
                                                control={form.control}
                                                name="department"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("fields.department")}</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder={tCommon("select")} />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {departments.map((dept) => (
                                                                    <SelectItem key={dept.id} value={dept.id}>
                                                                        {dept.name_ar}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="col-span-1 md:col-span-2 border-t pt-4 mt-2">
                                    <h4 className="text-sm font-medium mb-3 text-muted-foreground">الوضعية الإدارية</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="work_status"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("fields.workStatus")}</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder={tCommon("select")} />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="active">{t("workStatuses.active")}</SelectItem>
                                                            <SelectItem value="disponibility">{t("workStatuses.disponibility")}</SelectItem>
                                                            <SelectItem value="detached">{t("workStatuses.detached")}</SelectItem>
                                                            <SelectItem value="secondment">{t("workStatuses.secondment")}</SelectItem>
                                                            <SelectItem value="suspended">{t("workStatuses.suspended")}</SelectItem>
                                                            <SelectItem value="retired">{t("workStatuses.retired")}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {workStatus && workStatus !== 'active' && (
                                            <>
                                                <FormField
                                                    control={form.control}
                                                    name="work_status_date"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>{t("fields.workStatusDate")}</FormLabel>
                                                            <FormControl>
                                                                <Input {...field} type="date" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="work_status_reason"
                                                    render={({ field }) => (
                                                        <FormItem className="md:col-span-2">
                                                            <FormLabel>{t("fields.workStatusReason")}</FormLabel>
                                                            <FormControl>
                                                                <Input {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </>
                                        )}

                                        <FormField
                                            control={form.control}
                                            name="is_active"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center space-x-2 space-x-reverse rounded-lg border p-3 shadow-sm mt-8">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-0.5">
                                                        <FormLabel className="text-sm font-medium cursor-pointer">
                                                            تفعيل حساب المستخدم (يمكن الدخول للنظام)
                                                        </FormLabel>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                </Tabs>

                <div className="flex justify-end gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        disabled={isSubmitting}
                    >
                        {tCommon("cancel")}
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="me-2 h-4 w-4" />
                        )}
                        {tCommon("save")}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
