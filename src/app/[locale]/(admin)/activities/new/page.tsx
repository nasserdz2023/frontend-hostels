"use client";

import { useState, useEffect, use } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowRight, Loader2, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { DynamicListInput } from "@/components/ui/dynamic-list-input";
import { CustomFieldsEditor } from "@/components/activities/CustomFieldsEditor";


import { Checkbox } from "@/components/ui/checkbox";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { MultiSelect } from "@/components/ui/multi-select";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    activitiesApi,
    ActivityCategory,
    ActivitySeason,
    AnnualProgram,
    ActivityNature,
    ActivityDomainConfig,
    ActivityTypeConfig,
    ActivityTargetCategory,
    ActivityLocationType,
    ACTIVITY_NATURE_LABELS,
    ACTIVITY_LOCATION_TYPE_LABELS,
    DepartmentType,
    RecurrenceType,
    PartnerType
} from "@/lib/api/activities";
import { useInstitutionsStore } from "@/lib/stores/institutions";
import { useAuthStore } from "@/lib/stores/auth";
import { TranslatableInput } from "@/components/ui/translatable-input";
import { TranslatableTextarea } from "@/components/ui/translatable-textarea";
import { activitySchema, ActivityFormValues } from "@/lib/schemas/activities";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { PermissionGuard } from "@/hooks/useRequirePermission";

export default function NewActivityPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = use(params);
    const t = useTranslations("activities");
    const tCommon = useTranslations("common");
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(false);
    const [categories, setCategories] = useState<ActivityCategory[]>([]);
    const [seasons, setSeasons] = useState<ActivitySeason[]>([]);
    const [programs, setPrograms] = useState<AnnualProgram[]>([]);
    const [domains, setDomains] = useState<ActivityDomainConfig[]>([]);
    const [activityTypes, setActivityTypes] = useState<ActivityTypeConfig[]>([]);
    const [targetCategories, setTargetCategories] = useState<ActivityTargetCategory[]>([]);

    const { fetchInstitutions, institutions } = useInstitutionsStore();
    const { user, hasPermission } = useAuthStore();

    // Check if user can modify department_type and major_event (managers only)
    const canModifyAdvancedSettings = hasPermission('activities', 'set_major_event') ||
        hasPermission('activities', 'approve.institution') ||
        hasPermission('activities', 'approve.department') ||
        hasPermission('activities', 'approve.final');

    // Check if user can select any institution (managers and department heads)
    const canSelectAnyInstitution = hasPermission('activities', 'select_any_institution') ||
        hasPermission('activities', 'approve.department') ||
        hasPermission('activities', 'approve.final');


    const loadInitialData = async () => {
        try {
            const [cats, szns, doms, tCats] = await Promise.all([
                activitiesApi.getCategories(),
                activitiesApi.getSeasons(),
                activitiesApi.getDomains(true),
                activitiesApi.getTargetCategories(),
                fetchInstitutions({ size: 100, sector: 'YOUTH' })
            ]);
            console.log("Loaded domains:", doms);
            setCategories(cats);
            setSeasons(szns);
            setDomains(doms);
            setTargetCategories(tCats);

            // Fetch fresh user data from /me to get institution_id
            // The auth store may have stale data without institution_id
            const { authApi } = await import("@/lib/api/auth");
            const freshUserData = await authApi.getCurrentUser();
            console.log("Fresh user data from /me:", freshUserData);
            console.log("User institution_id:", freshUserData?.institution_id);

            let institutionId = '';
            if (freshUserData?.institution_id) {
                institutionId = freshUserData.institution_id;
                form.setValue("institution_ids", [institutionId]);
            }

            // Auto-select the current open season and load programs
            const openSeason = szns.find(s => s.status === 'OPEN');
            if (openSeason) {
                form.setValue("season_id", openSeason.id);
                // Load programs directly since watch may not trigger immediately
                const programsData = await activitiesApi.getPrograms(openSeason.id, institutionId || undefined);
                setPrograms(programsData);
            }
        } catch (error) {
            console.error("Failed to load initial data:", error);
            toast.error(t("messages.error_loading_data"));
        }
    };

    const form = useForm<ActivityFormValues>({
        resolver: zodResolver(activitySchema) as any as any,
        defaultValues: {
            title_ar: "",
            title_fr: "",
            description_ar: "",
            description_fr: "",
            category_id: "",

            nature: ActivityNature.PERMANENT,
            domain_id: undefined,
            activity_type_id: undefined,
            department_type: DepartmentType.YOUTH,
            institution_ids: [],
            max_participants: 0,
            target_gender: "ALL",
            target_category_ids: [],
            partner_institution_ids: [],
            is_free: true,
            fee_amount: 0,
            is_public: true,
            is_featured: false,
            is_major_event: false,
            recurrence_type: RecurrenceType.NONE,
            recurrence_interval: 1,
            location_type: ActivityLocationType.INTERNAL,
            location_details: "",
            start_date: "",
            end_date: "",
            registration_start: "",
            registration_deadline: "",
            recurrence_end_date: ""
        },
    });

    // Watch for season change to load programs
    const watchedSeasonId = form.watch("season_id");
    const watchedInstitutionIds = form.watch("institution_ids");
    const watchedInstitutionId = watchedInstitutionIds?.[0];
    const watchedDomainId = form.watch("domain_id");

    // Load initial data when component mounts
    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (watchedSeasonId) {
            loadPrograms(watchedSeasonId, watchedInstitutionId);
        } else {
            setPrograms([]);
        }
    }, [watchedSeasonId, watchedInstitutionId]);

    // Fetch Activity Types when Domain changes
    useEffect(() => {
        if (watchedDomainId) {
            const fetchTypes = async () => {
                try {
                    const types = await activitiesApi.getActivityTypes(watchedDomainId);
                    setActivityTypes(types);
                } catch (error) {
                    console.error("Failed to load activity types:", error);
                }
            };
            fetchTypes();
        } else {
            setActivityTypes([]);
        }
    }, [watchedDomainId]);

    // Auto-calculate age based on target categories
    const watchedTargetCategories = form.watch("target_category_ids");
    useEffect(() => {
        if (watchedTargetCategories && watchedTargetCategories.length > 0 && targetCategories.length > 0) {
            const selectedCategories = targetCategories.filter(c => watchedTargetCategories.includes(c.id));

            if (selectedCategories.length > 0) {
                // Find min of min_ages ignoring undefined/null
                const minAges = selectedCategories.map(c => c.min_age).filter((age): age is number => age !== undefined && age !== null);
                const maxAges = selectedCategories.map(c => c.max_age).filter((age): age is number => age !== undefined && age !== null);

                if (minAges.length > 0) {
                    const calculatedMin = Math.min(...minAges);
                    form.setValue("min_age", calculatedMin);
                }

                if (maxAges.length > 0) {
                    const calculatedMax = Math.max(...maxAges);
                    form.setValue("max_age", calculatedMax);
                }
            }
        }
    }, [watchedTargetCategories, targetCategories, form.setValue]);


    const loadPrograms = async (seasonId: string, institutionId?: string) => {
        try {
            // Only pass institutionId if it has a valid value
            const data = await activitiesApi.getPrograms(seasonId, institutionId || undefined);
            setPrograms(data);
        } catch (error) {
            console.error("Failed to load programs:", error);
        }
    }

    const isFree = form.watch("is_free");
    const nature = form.watch("nature");
    const isRecurring = nature === ActivityNature.PERMANENT;

    const onSubmit = async (data: ActivityFormValues) => {
        try {
            setIsLoading(true);
            // Convert empty strings to undefined
            const cleanData = Object.fromEntries(
                Object.entries(data).map(([key, value]) => [key, value === "" ? undefined : value])
            );

            // Handle Institution IDs (Split into primary and partners)
            if (data.institution_ids && data.institution_ids.length > 0) {
                // Primary
                cleanData.institution_id = data.institution_ids[0];
            }
            delete cleanData.institution_ids; // Remove array from API payload

            const newActivity = await activitiesApi.createActivity(cleanData as any);

            // Handle Partner Institutions syncing
            // Use existing partner_institution_ids logic if needed, or if we want to combine them
            // Currently the schema has both institution_ids (for primary) and partner_institution_ids (explicit partners)
            // But usually in the UI we might want to select multiple institutions where first is primary

            // If the user selected multiple institutions in the main selector, add them as partners
            if (data.institution_ids && data.institution_ids.length > 1) {
                const extraPartners = data.institution_ids.slice(1);
                for (const instId of extraPartners) {
                    await activitiesApi.addActivityPartner(newActivity.id, {
                        partner_type: 'INSTITUTION' as PartnerType,
                        institution_id: instId,
                        partner_name: '',
                        contribution: 'شريك منظم'
                    });
                }
            }

            // Handle explicit Partner Institutions syncing (from separate field if any)
            if (data.partner_institution_ids && data.partner_institution_ids.length > 0) {
                for (const instId of data.partner_institution_ids) {
                    await activitiesApi.addActivityPartner(newActivity.id, {
                        partner_type: 'INSTITUTION' as PartnerType,
                        institution_id: instId,
                        partner_name: '',
                        contribution: 'شريك منظم'
                    });
                }
            }

            toast.success(t("messages.created"));
            router.push(`/${locale}/activities`);
        } catch (error) {
            console.error("Failed to create activity:", error);
            toast.error(t("messages.error"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PermissionGuard module="activities" action="create">
            <div className="p-6 max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ArrowRight className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">{t("form.new")}</h1>
                            <p className="text-gray-500">{t("list.subtitle")}</p>
                        </div>
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <Tabs defaultValue="basic" className="space-y-4" dir="rtl">
                            <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto">
                                <TabsTrigger value="basic">{t("form.basicInfo")}</TabsTrigger>
                                <TabsTrigger value="classification">{t("form.classification")}</TabsTrigger>
                                <TabsTrigger value="timing">{t("form.timing")}</TabsTrigger>
                                <TabsTrigger value="target">{t("form.target_audience")}</TabsTrigger>
                                <TabsTrigger value="fees">{t("form.fees")}</TabsTrigger>
                                <TabsTrigger value="external">التسجيل الخارجي</TabsTrigger>
                            </TabsList>

                            {/* Basic Info */}
                            <TabsContent value="basic">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t("form.basicInfo")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="title_ar"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <TranslatableInput
                                                            label={t("form.title_ar")}
                                                            required
                                                            value={{
                                                                ar: field.value,
                                                                fr: form.watch("title_fr") || "",
                                                                en: ""
                                                            }}
                                                            onChange={(value) => {
                                                                field.onChange(value.ar);
                                                                form.setValue("title_fr", value.fr);
                                                            }}
                                                            placeholder="عنوان النشاط"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="description_ar"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <TranslatableTextarea
                                                            label={t("form.description")}
                                                            value={{
                                                                ar: field.value || "",
                                                                fr: form.watch("description_fr") || "",
                                                                en: ""
                                                            }}
                                                            onChange={(value) => {
                                                                field.onChange(value.ar);
                                                                form.setValue("description_fr", value.fr);
                                                            }}
                                                            placeholder="وصف النشاط..."
                                                            rows={4}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="objectives"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("seasons.objectives")}</FormLabel>
                                                    <FormControl>
                                                        <DynamicListInput
                                                            value={field.value || []}
                                                            onChange={field.onChange}
                                                            placeholder="أضف هدفا..."
                                                            addButtonLabel="إضافة هدف"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Nature */}
                                            <FormField
                                                control={form.control}
                                                name="nature"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("form.nature")}</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="اختر طابع النشاط" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {Object.entries(ACTIVITY_NATURE_LABELS).map(([key, labels]) => (
                                                                    <SelectItem key={key} value={key}>
                                                                        {labels.ar}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Domain */}
                                            <FormField
                                                control={form.control}
                                                name="domain_id"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("form.domain")}</FormLabel>
                                                        <Select
                                                            onValueChange={(val) => {
                                                                field.onChange(val);
                                                                // Reset activity type when domain changes
                                                                form.setValue("activity_type_id", undefined);
                                                            }}
                                                            value={field.value}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="اختر الميدان" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {domains.map((domain) => (
                                                                    <SelectItem key={domain.id} value={domain.id}>
                                                                        {domain.name_ar}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Activity Type - Shows types related to selected domain */}
                                            <FormField
                                                control={form.control}
                                                name="activity_type_id"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>نوع النشاط</FormLabel>
                                                        <Select
                                                            onValueChange={field.onChange}
                                                            value={field.value ?? undefined}
                                                            disabled={!watchedDomainId || activityTypes.length === 0}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder={watchedDomainId ? "اختر نوع النشاط" : "اختر الميدان أولاً"} />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {activityTypes.map((type) => (
                                                                    <SelectItem key={type.id} value={type.id}>
                                                                        {type.name_ar}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />



                                            {/* Major Event - Only for managers */}
                                            {canModifyAdvancedSettings && (
                                                <FormField
                                                    control={form.control}
                                                    name="is_major_event"
                                                    render={({ field }) => (
                                                        <FormItem className="flex items-center space-x-2 space-x-reverse pt-8">
                                                            <FormControl>
                                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                            </FormControl>
                                                            <div className="space-y-0.5">
                                                                <FormLabel className="text-base">نشاط رئيسي (كبرى)</FormLabel>
                                                                <FormDescription>
                                                                    تحديد هذا النشاط كحدث رئيسي للمؤسسة
                                                                </FormDescription>
                                                            </div>
                                                        </FormItem>
                                                    )}
                                                />
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Classification */}
                            <TabsContent value="classification">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t("form.classification")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="institution_ids"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("form.institution")} *</FormLabel>
                                                        <MultiSelect
                                                            options={institutions.map(inst => ({
                                                                value: inst.id,
                                                                label: inst.name_ar
                                                            }))}
                                                            selected={field.value || []}
                                                            onChange={field.onChange}
                                                            placeholder="اختر المؤسسات المنظمة..."
                                                        />
                                                        <FormDescription>
                                                            المؤسسة الأولى المختارة ستكون هي المنظم الرئيسي
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="season_id"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("form.season")}</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value} disabled>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="اختر الموسم" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {seasons.map((season) => (
                                                                    <SelectItem key={season.id} value={season.id}>
                                                                        {season.name} ({new Date(season.start_date).getFullYear()})
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="program_id"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("form.program")}</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value} disabled={!watchedSeasonId}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder={watchedSeasonId ? "اختر البرنامج" : "اختر الموسم أولاً"} />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {programs.length === 0 ? (
                                                                    <SelectItem value="no-programs" disabled>
                                                                        لا توجد برامج متاحة لهذا الموسم
                                                                    </SelectItem>
                                                                ) : (
                                                                    programs.map((prog) => (
                                                                        <SelectItem key={prog.id} value={prog.id}>
                                                                            {prog.title}
                                                                        </SelectItem>
                                                                    ))
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormDescription>
                                                            برنامج سنوي مرتبط بالموسم والمؤسسة
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>


                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Timing */}
                            <TabsContent value="timing">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t("form.timing")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="start_date"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col">
                                                        <FormLabel>{t("form.start_date")}</FormLabel>
                                                        <FormControl>
                                                            <DateTimePicker
                                                                value={field.value}
                                                                onChange={field.onChange}
                                                                placeHolder="اختر تاريخ ووقت البداية"
                                                                showTime={true}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="end_date"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col">
                                                        <FormLabel>{t("form.end_date")}</FormLabel>
                                                        <FormControl>
                                                            <DateTimePicker
                                                                value={field.value}
                                                                onChange={field.onChange}
                                                                placeHolder="اختر تاريخ ووقت النهاية"
                                                                showTime={true}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="time_slot"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("form.time_slot")}</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="اختر التوقيت" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="MORNING">{t("time_slot.MORNING")}</SelectItem>
                                                                <SelectItem value="EVENING">{t("time_slot.EVENING")}</SelectItem>
                                                                <SelectItem value="NIGHT">{t("time_slot.NIGHT")}</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="registration_start"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col">
                                                        <FormLabel>{t("form.registration_start")}</FormLabel>
                                                        <FormControl>
                                                            <DateTimePicker
                                                                value={field.value}
                                                                onChange={field.onChange}
                                                                placeHolder="بداية التسجيل"
                                                                showTime={true}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="registration_deadline"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col">
                                                        <FormLabel>{t("form.registration_deadline")}</FormLabel>
                                                        <FormControl>
                                                            <DateTimePicker
                                                                value={field.value}
                                                                onChange={field.onChange}
                                                                placeHolder="نهاية التسجيل"
                                                                showTime={true}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {isRecurring && (
                                            <div className="p-4 border rounded-md bg-gray-50 border-blue-100">
                                                <h4 className="mb-3 text-sm font-semibold text-blue-800">إعدادات التكرار</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="recurrence_type"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>{t("form.recurrence_type")}</FormLabel>
                                                                <Select onValueChange={field.onChange} value={field.value}>
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        <SelectItem value={RecurrenceType.DAILY}>يومي</SelectItem>
                                                                        <SelectItem value={RecurrenceType.WEEKLY}>أسبوعي</SelectItem>
                                                                        <SelectItem value={RecurrenceType.MONTHLY}>شهري</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="recurrence_interval"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>كل (عدد)</FormLabel>
                                                                <FormControl>
                                                                    <Input type="number" {...field} min={1} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="recurrence_end_date"
                                                        render={({ field }) => (
                                                            <FormItem className="flex flex-col">
                                                                <FormLabel>تاريخ انتهاء التكرار</FormLabel>
                                                                <FormControl>
                                                                    <DateTimePicker
                                                                        value={field.value}
                                                                        onChange={field.onChange}
                                                                        placeHolder="تاريخ نهاية التكرار"
                                                                        showTime={false}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Target Audience */}
                            <TabsContent value="target">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t("form.target_audience")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="mb-6">
                                            <FormLabel className="mb-3 block">الفئات المستهدفة</FormLabel>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                {targetCategories.map((category) => (
                                                    <FormField
                                                        key={category.id}
                                                        control={form.control}
                                                        name="target_category_ids"
                                                        render={({ field }) => {
                                                            return (
                                                                <FormItem
                                                                    key={category.id}
                                                                    className="flex flex-row items-center space-x-3 space-x-reverse space-y-0 rounded-md border p-3 bg-white"
                                                                >
                                                                    <FormControl>
                                                                        <Checkbox
                                                                            checked={field.value?.includes(category.id)}
                                                                            onCheckedChange={(checked) => {
                                                                                const currentValue = field.value || [];
                                                                                return checked
                                                                                    ? field.onChange([...currentValue, category.id])
                                                                                    : field.onChange(
                                                                                        currentValue.filter(
                                                                                            (value) => value !== category.id
                                                                                        )
                                                                                    )
                                                                            }}
                                                                        />
                                                                    </FormControl>
                                                                    <div className="space-y-1 leading-none me-2">
                                                                        <FormLabel className="font-normal cursor-pointer">
                                                                            {category.name_ar}
                                                                        </FormLabel>
                                                                        {(category.min_age || category.max_age) && (
                                                                            <p className="text-[0.8rem] text-muted-foreground">
                                                                                {category.min_age ? `من ${category.min_age} ` : ''}
                                                                                {category.max_age ? `إلى ${category.max_age} ` : ''}
                                                                                سنة
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </FormItem>
                                                            )
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name="target_gender"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("form.target_gender")}</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="ALL">{t("gender.all")}</SelectItem>
                                                            <SelectItem value="MALE">{t("gender.male")}</SelectItem>
                                                            <SelectItem value="FEMALE">{t("gender.female")}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="grid grid-cols-3 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="max_participants"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("form.max_participants")}</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} min={0} />
                                                        </FormControl>
                                                        <FormDescription>0 = غير محدود</FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="min_age"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("form.min_age")}</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} min={0} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="max_age"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("form.max_age")}</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} min={0} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Fees & Visibility */}
                            <TabsContent value="fees">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t("form.fees")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="is_free"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                                                    <div>
                                                        <FormLabel>{t("form.is_free")}</FormLabel>
                                                        <FormDescription>النشاط مجاني للمشاركين</FormDescription>
                                                    </div>
                                                    <FormControl>
                                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        {!isFree && (
                                            <FormField
                                                control={form.control}
                                                name="fee_amount"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("form.fee_amount")}</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} min={0} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}



                                        <FormField
                                            control={form.control}
                                            name="is_public"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                                                    <div>
                                                        <FormLabel>{t("form.is_public")}</FormLabel>
                                                        <FormDescription>عرض النشاط في البوابة العامة</FormDescription>
                                                    </div>
                                                    <FormControl>
                                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="is_featured"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                                                    <div>
                                                        <FormLabel>{t("form.is_featured")}</FormLabel>
                                                        <FormDescription>عرض النشاط في المميزات</FormDescription>
                                                    </div>
                                                    <FormControl>
                                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* External Registration */}
                            <TabsContent value="external">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>إعدادات التسجيل الخارجي</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="is_external_registration_open"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                                                    <div>
                                                        <FormLabel>تفعيل التسجيل الخارجي</FormLabel>
                                                        <FormDescription>السماح بالتسجيل عبر منصات خارجية</FormDescription>
                                                    </div>
                                                    <FormControl>
                                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="external_website_url"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>رابط الموقع الخارجي (اختياري)</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="https://example.com" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="api_key_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>مفتاح API الخاص بالتسجيل (اختياري)</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="أدخل ID المفتاح هنا" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        
                                        <FormField
                                            control={form.control}
                                            name="custom_fields_schema"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>الحقول المخصصة للتسجيل</FormLabel>
                                                    <FormDescription>قم بإضافة حقول إضافية يطلب من المشارك إدخالها عند التسجيل الخارجي.</FormDescription>
                                                    <FormControl>
                                                        <CustomFieldsEditor value={field.value} onChange={field.onChange} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>

                        {/* Actions */}
                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={() => router.back()}>
                                <X className="w-4 h-4 me-2" />
                                {tCommon("cancel")}
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 me-2" />
                                )}
                                {tCommon("save")}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </PermissionGuard>
    );
}
