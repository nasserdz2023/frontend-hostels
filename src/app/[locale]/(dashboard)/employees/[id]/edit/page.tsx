"use client";

import { useEffect, useState, use } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { employeesApi, Employee } from "@/lib/api/employees";
import { toast } from "sonner";
import {
    ArrowRight, ArrowLeft, Loader2, Save, X,
    User, Briefcase, Users, CreditCard, FileText,
    Phone, Mail, MapPin, Droplet, Shield, Heart, Baby
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { locationsApi, Wilaya, Municipality } from "@/lib/api/locations";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Checkbox } from "@/components/ui/checkbox";
import { useSettingsStore } from "@/lib/stores/settings";

export default function EmployeeEditPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = use(params);
    const t = useTranslations("employees");
    const tFields = useTranslations("employees.fields");
    const tOptions = useTranslations("employees.options");
    const router = useRouter();

    const [employee, setEmployee] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm({
        defaultValues: {} as any
    });

    useEffect(() => {
        let isMounted = true;

        const loadEmployee = async () => {
            try {
                const data = await employeesApi.getById(id);
                console.log("Loaded employee data:", JSON.stringify(data, null, 2));

                if (!isMounted) return;

                setEmployee(data);

                // Prepare form data with date conversion
                const formData = {
                    ...data,
                    birth_date: data.birth_date ? data.birth_date.split('T')[0] : '',
                    confirmation_date: data.confirmation_date ? data.confirmation_date.split('T')[0] : '',
                    last_promotion_date: data.last_promotion_date ? data.last_promotion_date.split('T')[0] : '',
                    is_birth_date_estimated: data.is_birth_date_estimated || false,
                    // Ensure birth_wilaya_code is present (it should be from API)
                };

                console.log("Setting form data:", formData);

                // Use reset with keepDefaultValues false
                form.reset(formData, { keepDefaultValues: false });

            } catch (error) {
                console.error("Failed to load employee:", error);
                if (isMounted) toast.error(t("messages.loadError"));
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadEmployee();

        return () => { isMounted = false; };
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Locations State
    const [wilayas, setWilayas] = useState<Wilaya[]>([]);
    const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
    const [loadingWilayas, setLoadingWilayas] = useState(false);
    const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);

    const birthWilayaCode = form.watch('birth_wilaya_code');
    const isBirthDateEstimated = form.watch('is_birth_date_estimated');

    // Fetch Wilayas
    useEffect(() => {
        async function fetchWilayasData() {
            try {
                setLoadingWilayas(true);
                const data = await locationsApi.getWilayas();
                setWilayas(data);
            } catch (error) {
                console.error("Failed to fetch wilayas", error);
            } finally {
                setLoadingWilayas(false);
            }
        }
        fetchWilayasData();
    }, []);

    // Fetch Municipalities when Wilaya changes
    useEffect(() => {
        async function fetchMunicipalitiesData() {
            if (!birthWilayaCode) {
                setMunicipalities([]);
                return;
            }
            try {
                setLoadingMunicipalities(true);
                const data = await locationsApi.getMunicipalities(birthWilayaCode);
                setMunicipalities(data);
            } catch (error) {
                console.error("Failed to fetch municipalities", error);
            } finally {
                setLoadingMunicipalities(false);
            }
        }
        fetchMunicipalitiesData();
    }, [birthWilayaCode]);

    // Residence Locations State
    const [residenceMunicipalities, setResidenceMunicipalities] = useState<Municipality[]>([]);
    const [loadingResidenceMunicipalities, setLoadingResidenceMunicipalities] = useState(false);
    const residenceWilayaCode = form.watch('residence_wilaya_code' as any); // Type cast as extra field

    // Auto-select default wilaya for residence if not set
    const defaultWilayaCode = useSettingsStore(s => s.getDefaultWilayaCode());
    useEffect(() => {
        if (!residenceWilayaCode) {
            form.setValue('residence_wilaya_code', defaultWilayaCode);
        }
    }, [residenceWilayaCode, form, defaultWilayaCode]);
    // Fetch Residence Municipalities
    useEffect(() => {
        async function fetchResidenceMunicipalities() {
            if (!residenceWilayaCode) {
                setResidenceMunicipalities([]);
                return;
            }
            try {
                setLoadingResidenceMunicipalities(true);
                const data = await locationsApi.getMunicipalities(residenceWilayaCode);
                setResidenceMunicipalities(data);
            } catch (error) {
                console.error("Failed to fetch residence municipalities", error);
            } finally {
                setLoadingResidenceMunicipalities(false);
            }
        }
        fetchResidenceMunicipalities();
    }, [residenceWilayaCode]);

    const wilayaOptions = wilayas.map(w => ({ value: w.code, label: `${w.code} - ${w.name_ar}` }));
    const municipalityOptions = municipalities.map(m => ({ value: m.id, label: m.name_ar }));

    const onSubmit = async (data: any) => {
        setIsSaving(true);
        try {
            // Remove auxiliary fields
            const { residence_wilaya_code, ...submitData } = data;

            await employeesApi.update(id, submitData);
            toast.success(t("messages.updateSuccess"));
            router.push(`/${locale}/employees/${id}`);
        } catch (error) {
            console.error("Failed to update employee:", error);
            toast.error("حدث خطأ أثناء الحفظ");
        } finally {
            setIsSaving(false);
        }
    };

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
    const initials = `${employee.firstname_ar?.[0] || ''}.${employee.lastname_ar?.[0] || ''}`;

    const InputField = ({ name, label, type = "text", required = false }: { name: string; label: string; type?: string; required?: boolean }) => (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label} {required && <span className="text-destructive">*</span>}</FormLabel>
                    <FormControl>
                        <Input type={type} {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );

    const DateField = ({ name, label, required = false }: { name: string; label: string; required?: boolean }) => (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label} {required && <span className="text-destructive">*</span>}</FormLabel>
                    <FormControl>
                        <DateTimePicker
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            placeHolder={`اختر ${label}`}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );

    const SelectField = ({ name, label, options, required = false }: { name: string; label: string; options: { value: string; label: string }[]; required?: boolean }) => (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label} {required && <span className="text-destructive">*</span>}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={`اختر ${label}`} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {options.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
        />
    );

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    {/* Header */}
                    <div className="mb-8 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                {locale === 'ar' ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
                            </button>
                            <h1 className="text-2xl font-bold">{t("actions.edit")}: {nameAr}</h1>
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => router.back()}>
                                <X className="h-4 w-4 me-2" />
                                إلغاء
                            </Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
                                حفظ التغييرات
                            </Button>
                        </div>
                    </div>

                    {/* Profile Header */}
                    <Card className="mb-6">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-6">
                                <Avatar className="h-20 w-20">
                                    {employee.profile_photo ? (
                                        <AvatarImage src={employee.profile_photo} alt={nameAr} />
                                    ) : null}
                                    <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h2 className="text-xl font-bold">{nameAr}</h2>
                                    <p className="text-muted-foreground">{employee.position?.name_ar} - {employee.institution?.name_ar}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tabs */}
                    <Tabs defaultValue="personal" className="w-full" dir="rtl">
                        <TabsList className="grid w-full grid-cols-5 mb-6">
                            <TabsTrigger value="personal" className="gap-2">
                                <User className="h-4 w-4" />
                                <span className="hidden sm:inline">شخصية</span>
                            </TabsTrigger>
                            <TabsTrigger value="job" className="gap-2">
                                <Briefcase className="h-4 w-4" />
                                <span className="hidden sm:inline">وظيفية</span>
                            </TabsTrigger>
                            <TabsTrigger value="family" className="gap-2">
                                <Users className="h-4 w-4" />
                                <span className="hidden sm:inline">عائلية</span>
                            </TabsTrigger>
                            <TabsTrigger value="contact" className="gap-2">
                                <Phone className="h-4 w-4" />
                                <span className="hidden sm:inline">اتصال</span>
                            </TabsTrigger>
                            <TabsTrigger value="financial" className="gap-2">
                                <CreditCard className="h-4 w-4" />
                                <span className="hidden sm:inline">مالية</span>
                            </TabsTrigger>
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
                                    <CardContent className="grid grid-cols-2 gap-4">
                                        <InputField name="firstname_ar" label="الاسم (عربي)" required />
                                        <InputField name="lastname_ar" label="اللقب (عربي)" required />
                                        <InputField name="firstname_fr" label="الاسم (فرنسي)" />
                                        <InputField name="lastname_fr" label="اللقب (فرنسي)" />
                                        <InputField name="father_name" label="اسم الأب" />
                                        <InputField name="mother_fullname" label="اسم ولقب الأم" />
                                        <InputField name="national_id" label="رقم التعريف الوطني" />
                                        <SelectField
                                            name="gender"
                                            label="الجنس"
                                            options={[
                                                { value: 'MALE', label: tOptions("gender.MALE") },
                                                { value: 'FEMALE', label: tOptions("gender.FEMALE") }
                                            ]}
                                        />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <MapPin className="h-5 w-5 text-emerald-600" />
                                            الميلاد
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2 md:col-span-1">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label>{t("fields.birthDate")}</Label>
                                                    <FormField
                                                        control={form.control}
                                                        name="is_birth_date_estimated"
                                                        render={({ field: checkboxField }) => (
                                                            <div className="flex items-center gap-2">
                                                                <Checkbox
                                                                    id="estimated-date"
                                                                    checked={checkboxField.value}
                                                                    onCheckedChange={(checked) => {
                                                                        checkboxField.onChange(checked);
                                                                        // Reset birth date if switching modes to avoid confusion
                                                                        if (checked) {
                                                                            // If switching to estimated, try to keep the year if date exists
                                                                            const currentDate = form.getValues('birth_date');
                                                                            if (currentDate) {
                                                                                const year = currentDate.split('-')[0];
                                                                                form.setValue('birth_date', `${year}-01-01`);
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                                <label
                                                                    htmlFor="estimated-date"
                                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                                >
                                                                    {t("fields.birthDateEstimated")}
                                                                </label>
                                                            </div>
                                                        )}
                                                    />
                                                </div>

                                                <FormField
                                                    control={form.control}
                                                    name="birth_date"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            {isBirthDateEstimated ? (
                                                                <Select
                                                                    value={field.value ? field.value.split('-')[0] : ""}
                                                                    onValueChange={(year) => {
                                                                        field.onChange(`${year}-01-01`);
                                                                    }}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="اختر سنة الميلاد" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent className="max-h-60">
                                                                        {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 18 - i).map((year) => (
                                                                            <SelectItem key={year} value={year.toString()}>
                                                                                {year}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            ) : (
                                                                <FormControl>
                                                                    <DateTimePicker
                                                                        value={field.value ?? ''}
                                                                        onChange={field.onChange}
                                                                        placeHolder={t("fields.birthDate")}
                                                                    />
                                                                </FormControl>
                                                            )}
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="birth_wilaya_code"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("fields.birthWilaya") || "ولاية الميلاد"}</FormLabel>
                                                    <FormControl>
                                                        <SearchableSelect
                                                            options={wilayaOptions}
                                                            value={field.value}
                                                            onValueChange={field.onChange}
                                                            placeholder="اختر الولاية"
                                                            searchPlaceholder="بحث..."
                                                            emptyMessage="لا توجد نتائج"
                                                            disabled={loadingWilayas}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="birth_municipality_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("fields.birthMunicipality") || "بلدية الميلاد"}</FormLabel>
                                                    <FormControl>
                                                        <SearchableSelect
                                                            options={municipalityOptions}
                                                            value={field.value}
                                                            onValueChange={field.onChange}
                                                            placeholder="اختر البلدية"
                                                            searchPlaceholder="بحث..."
                                                            emptyMessage="لا توجد نتائج"
                                                            disabled={!birthWilayaCode || loadingMunicipalities}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="col-span-2">
                                            <InputField name="address" label="العنوان" />
                                        </div>

                                        {/* Residence Wilaya & Municipality */}
                                        <div className="col-span-2 grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="residence_wilaya_code"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>ولاية الإقامة</FormLabel>
                                                        <FormControl>
                                                            <SearchableSelect
                                                                options={wilayas.map(w => ({ value: w.code, label: `${w.code} - ${w.name_ar}` }))}
                                                                value={field.value}
                                                                onValueChange={(val) => {
                                                                    field.onChange(val);
                                                                    // Reset city when wilaya changes
                                                                    form.setValue('city', '');
                                                                }}
                                                                placeholder="اختر الولاية"
                                                                searchPlaceholder="بحث..."
                                                                emptyMessage="لا توجد نتائج"
                                                                disabled={loadingWilayas}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="city"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{tFields("city") || "البلدية"}</FormLabel>
                                                        <FormControl>
                                                            <SearchableSelect
                                                                options={residenceMunicipalities.map(m => ({ value: m.name_ar, label: m.name_ar }))}
                                                                value={field.value}
                                                                onValueChange={field.onChange}
                                                                placeholder="اختر البلدية"
                                                                searchPlaceholder="بحث..."
                                                                emptyMessage={!form.watch('residence_wilaya_code') ? "اختر الولاية أولاً" : "لا توجد نتائج"}
                                                                disabled={!form.watch('residence_wilaya_code') || loadingResidenceMunicipalities}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Droplet className="h-5 w-5 text-red-500" />
                                            معلومات إضافية
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-2 gap-4">
                                        <SelectField
                                            name="blood_type"
                                            label="فصيلة الدم"
                                            options={[
                                                { value: 'A+', label: 'A+' },
                                                { value: 'A-', label: 'A-' },
                                                { value: 'B+', label: 'B+' },
                                                { value: 'B-', label: 'B-' },
                                                { value: 'O+', label: 'O+' },
                                                { value: 'O-', label: 'O-' },
                                                { value: 'AB+', label: 'AB+' },
                                                { value: 'AB-', label: 'AB-' }
                                            ]}
                                        />
                                        <SelectField
                                            name="military_service_status"
                                            label="وضعية الخدمة الوطنية"
                                            options={[
                                                { value: 'COMPLETED', label: tOptions("militaryStatus.COMPLETED") },
                                                { value: 'EXEMPTED', label: tOptions("militaryStatus.EXEMPTED") },
                                                { value: 'DEFERRED', label: tOptions("militaryStatus.DEFERRED") },
                                                { value: 'IN_PROGRESS', label: tOptions("militaryStatus.IN_PROGRESS") },
                                                { value: 'NOT_CONCERNED', label: tOptions("militaryStatus.NOT_CONCERNED") }
                                            ]}
                                        />
                                        <div className="col-span-2">
                                            <InputField name="military_service_number" label="رقم شهادة الخدمة" />
                                        </div>
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
                                    <CardContent className="grid grid-cols-2 gap-4">
                                        <InputField name="employee_number" label="رقم التسجيل" />
                                        <InputField name="rank" label="الدرجة" />
                                        <SelectField
                                            name="employment_type"
                                            label="نوع التوظيف"
                                            options={[
                                                { value: 'FULL_TIME', label: tOptions("employmentType.FULL_TIME") },
                                                { value: 'PART_TIME', label: tOptions("employmentType.PART_TIME") },
                                                { value: 'CONTRACT', label: tOptions("employmentType.CONTRACT") },
                                                { value: 'INTERN', label: tOptions("employmentType.INTERN") },
                                                { value: 'TEMPORARY', label: tOptions("employmentType.TEMPORARY") },
                                                { value: 'FREELANCE', label: tOptions("employmentType.FREELANCE") }
                                            ]}
                                        />
                                        <SelectField
                                            name="original_administration_type"
                                            label="الإدارة الأصلية"
                                            options={[
                                                { value: 'DJS', label: 'مديرية الشباب والرياضة' },
                                                { value: 'ODEJ', label: 'ديوان مؤسسات الشباب' },
                                                { value: 'OPOW', label: 'ديوان المركب الرياضي' },
                                                { value: 'OTHER', label: 'أخرى' }
                                            ]}
                                        />
                                        <div className="col-span-2">
                                            <InputField name="original_department" label="تفاصيل الإدارة الأصلية" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">التواريخ المهنية</CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-2 gap-4">
                                        <DateField name="hire_date" label="تاريخ التوظيف" />
                                        <DateField name="confirmation_date" label="تاريخ الترسيم" />
                                        <DateField name="last_promotion_date" label="تاريخ آخر ترقية" />
                                    </CardContent>
                                </Card>
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
                                    <CardContent className="grid grid-cols-2 gap-4">
                                        <SelectField
                                            name="marital_status"
                                            label="الحالة"
                                            options={[
                                                { value: 'SINGLE', label: tOptions("maritalStatus.SINGLE") },
                                                { value: 'MARRIED', label: tOptions("maritalStatus.MARRIED") },
                                                { value: 'DIVORCED', label: tOptions("maritalStatus.DIVORCED") },
                                                { value: 'WIDOWED', label: tOptions("maritalStatus.WIDOWED") }
                                            ]}
                                        />
                                        <InputField name="children_count" label="عدد الأطفال" type="number" />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Users className="h-5 w-5 text-emerald-600" />
                                            الزوج/الزوجة
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <InputField name="spouse_name" label="الاسم الكامل" />
                                        </div>
                                        <InputField name="spouse_profession" label="المهنة" />
                                        <InputField name="spouse_employer" label="جهة العمل" />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Phone className="h-5 w-5 text-red-500" />
                                            جهة اتصال الطوارئ
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-2 gap-4">
                                        <InputField name="emergency_contact_name" label="الاسم" />
                                        <InputField name="emergency_contact_phone" label="الهاتف" />
                                        <div className="col-span-2">
                                            <InputField name="emergency_contact_relationship" label="صلة القرابة" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* Contact Tab */}
                        <TabsContent value="contact">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Phone className="h-5 w-5 text-emerald-600" />
                                        معلومات الاتصال
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-4">
                                    <InputField name="mobile" label="الهاتف النقال" />
                                    <InputField name="phone" label="الهاتف الثابت" />
                                    <div className="col-span-2">
                                        <InputField name="email" label="البريد الإلكتروني" type="email" />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Financial Tab */}
                        <TabsContent value="financial">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <CreditCard className="h-5 w-5 text-emerald-600" />
                                        المعلومات البنكية
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-4">
                                    <InputField name="bank_name" label="اسم البنك" />
                                    <InputField name="bank_account" label="رقم الحساب (RIP)" />
                                    <InputField name="social_security_number" label="رقم الضمان الاجتماعي" />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    {/* Fixed Save Button */}
                    <div className="fixed bottom-0 start-0 end-0 p-4 bg-card border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 z-50">
                        <Button type="button" variant="outline" onClick={() => router.back()}>
                            إلغاء
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
                            حفظ التغييرات
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
