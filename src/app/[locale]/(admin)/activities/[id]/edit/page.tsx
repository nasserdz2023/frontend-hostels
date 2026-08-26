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
import { TranslatableInput } from "@/components/ui/translatable-input";
import { TranslatableTextarea } from "@/components/ui/translatable-textarea";
import { activitySchema, ActivityFormValues } from "@/lib/schemas/activities";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Checkbox } from "@/components/ui/checkbox";

export default function EditActivityPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = use(params);
    const t = useTranslations("activities");
    const tCommon = useTranslations("common");
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [categories, setCategories] = useState<ActivityCategory[]>([]);
    const [seasons, setSeasons] = useState<ActivitySeason[]>([]);
    const [programs, setPrograms] = useState<AnnualProgram[]>([]);
    const [domains, setDomains] = useState<ActivityDomainConfig[]>([]);
    const [activityTypes, setActivityTypes] = useState<ActivityTypeConfig[]>([]);
    const [targetCategories, setTargetCategories] = useState<ActivityTargetCategory[]>([]);

    const { fetchInstitutions, institutions } = useInstitutionsStore();

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
            is_free: true,
            fee_amount: 0,
            is_public: true,
            is_featured: false,
            is_major_event: false,
            recurrence_type: RecurrenceType.NONE,
            recurrence_interval: 1,
            // Additional defaults
            program_id: "",
            season_id: "",
            location_type: ActivityLocationType.INTERNAL,
            location_details: "",


            partner_institution_ids: [],

            // Google Sheets Sync
            google_sheets_sync_url: "",
            google_sheets_sync_mode: "add_only",
        },
    });

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setIsFetching(true);
            const [activity, cats, szns, doms, tCats] = await Promise.all([
                activitiesApi.getActivity(id),
                activitiesApi.getCategories(),
                activitiesApi.getSeasons(),
                activitiesApi.getDomains(true),
                activitiesApi.getTargetCategories(),
                fetchInstitutions({ size: 100, sector: 'YOUTH' })
            ]);

            setCategories(cats);
            setSeasons(szns);
            setDomains(doms);
            setTargetCategories(tCats);

            console.log("Loaded Activity:", activity);
            console.log("Loaded Domains:", doms);
            console.log("Activity Domain ID:", activity.domain_id);

            // If activity has season, load programs
            if (activity.season_id) {
                try {
                    const progs = await activitiesApi.getPrograms(activity.season_id, activity.institution_id);
                    setPrograms(progs);
                } catch (e) {
                    console.error("Failed to load programs for activity season", e);
                }
            }

            // If activity has domain, load types
            if (activity.domain_id) {
                try {
                    const types = await activitiesApi.getActivityTypes(activity.domain_id);
                    setActivityTypes(types);
                } catch (e) {
                    console.error("Failed to load activity types", e);
                }
            }


            // Fill form with activity data
            form.reset({
                title_ar: activity.title_ar,
                title_fr: activity.title_fr || "",
                description_ar: activity.description_ar || "",
                description_fr: activity.description_fr || "",
                category_id: activity.category_id || "",
                nature: activity.nature,
                domain_id: activity.domain_id || undefined,
                activity_type_id: activity.activity_type_id || undefined,
                department_type: activity.department_type as DepartmentType || DepartmentType.YOUTH,
                room_id: activity.room_id || "", // Assuming room_id is valid
                season_id: activity.season_id || "",
                program_id: activity.program_id || "",
                location_type: activity.location_type || ActivityLocationType.INTERNAL,
                location_details: activity.location_details || "",

                start_date: activity.start_date ? new Date(activity.start_date).toISOString().slice(0, 16) : "",
                end_date: activity.end_date ? new Date(activity.end_date).toISOString().slice(0, 16) : "",
                registration_start: activity.registration_start ? new Date(activity.registration_start).toISOString().slice(0, 16) : "",
                registration_deadline: activity.registration_deadline ? new Date(activity.registration_deadline).toISOString().slice(0, 16) : "",

                max_participants: activity.max_participants,
                min_age: activity.min_age || undefined,
                max_age: activity.max_age || undefined,
                target_gender: activity.target_gender || "ALL",

                is_free: activity.is_free,
                fee_amount: activity.fee_amount,


                is_public: activity.is_public,
                is_featured: activity.is_featured,
                is_major_event: activity.is_major_event || false,

                // External Registration
                external_website_url: activity.external_website_url || "",
                api_key_id: activity.api_key_id || "",
                is_external_registration_open: activity.is_external_registration_open || false,
                custom_fields_schema: activity.custom_fields_schema || {},

                // Google Sheets Sync
                google_sheets_sync_url: activity.google_sheets_sync_url || "",
                google_sheets_sync_mode: activity.google_sheets_sync_mode || "add_only",

                recurrence_type: activity.recurrence_type || RecurrenceType.NONE,
                recurrence_interval: activity.recurrence_interval || 1,
                recurrence_end_date: activity.recurrence_end_date ? new Date(activity.recurrence_end_date).toISOString().slice(0, 10) : "",

                time_slot: activity.time_slot || undefined,

                objectives: activity.objectives || [],
                target_category_ids: (activity.target_categories as any[])?.map((tc: any) => tc.category_id ?? tc.id) || [],
                institution_ids: [
                    activity.institution_id,
                    ...(activity.partners
                        ?.filter(p => p.partner_type === 'INSTITUTION' && p.institution_id)
                        .map(p => p.institution_id!) || [])
                ].filter(Boolean),
                partner_institution_ids: [],
            });

        } catch (error) {
            console.error("Failed to load initial data:", error);
            toast.error(t("messages.error_loading_data"));
        } finally {
            setIsFetching(false);
        }
    };

    // Watch for changes
    const watchedSeasonId = form.watch("season_id");
    const watchedInstitutionIds = form.watch("institution_ids");
    const watchedInstitutionId = watchedInstitutionIds?.[0];
    const watchedDomainId = form.watch("domain_id");

    useEffect(() => {
        // Only load if changed and not initial load (to avoid double loading or overwriting initial programs)
        if (watchedSeasonId && !isFetching) {
            loadPrograms(watchedSeasonId, watchedInstitutionId);
        } else if (!watchedSeasonId) {
            setPrograms([]);
        }
    }, [watchedSeasonId, watchedInstitutionId, isFetching]);

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
            const data = await activitiesApi.getPrograms(seasonId, institutionId);
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
            // Convert empty strings to undefined or null for API
            const cleanData = Object.fromEntries(
                Object.entries(data).map(([key, value]) => [key, value === "" ? null : value])
            );

            // Handle Institution IDs (Split into primary and partners)
            if (data.institution_ids && data.institution_ids.length > 0) {
                // Primary
                cleanData.institution_id = data.institution_ids[0];
                // Partners
                cleanData.partner_institution_ids = data.institution_ids.slice(1);
            }
            delete cleanData.institution_ids;

            await activitiesApi.updateActivity(id, cleanData as any);

            // Handle Partner Institutions syncing
            // Use the calculated partner IDs
            const newInstIds = (cleanData.partner_institution_ids || []) as string[];

            if (true) { // scoping block
                const currentPartners = (await activitiesApi.getActivity(id)).partners || [];
                const currentInstPartners = currentPartners.filter(p => p.partner_type === 'INSTITUTION');
                const currentInstIds = currentInstPartners.map(p => p.institution_id);

                // To Add
                const toAdd = newInstIds.filter((instId: string) => !currentInstIds.includes(instId));
                for (const instId of toAdd) {
                    await activitiesApi.addActivityPartner(id, {
                        partner_type: 'INSTITUTION' as PartnerType,
                        institution_id: instId,
                        partner_name: '', // Optional
                        contribution: 'شريك منظم'
                    });
                }

                // To Remove
                const toRemove = currentInstPartners.filter(p => p.institution_id && !newInstIds.includes(p.institution_id));
                for (const partner of toRemove) {
                    if (partner.id) {
                        await activitiesApi.deleteActivityPartner(id, partner.id);
                    }
                }
            }

            toast.success(t("messages.updated"));
            router.push(`/${locale}/activities`);
        } catch (error) {
            console.error("Failed to update activity:", error);
            toast.error(t("messages.error"));
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowRight className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{t("form.edit")}</h1>
                        <p className="text-gray-500">{t("list.subtitle")}</p>
                    </div>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Tabs defaultValue="basic" className="space-y-4" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
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


                                        <FormField
                                            control={form.control}
                                            name="is_major_event"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center gap-2 pt-8">
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
                                                    <Select onValueChange={field.onChange} value={field.value}>
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
                                                            {programs.map((prog) => (
                                                                <SelectItem key={prog.id} value={prog.id}>
                                                                    {prog.title}
                                                                </SelectItem>
                                                            ))}
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
                                                            placeHolder="تاريخ ووقت البداية"
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
                                                            placeHolder="تاريخ ووقت النهاية"
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

                                    <FormField
                                        control={form.control}
                                        name="target_category_ids"
                                        render={() => (
                                            <FormItem>
                                                <div className="mb-4">
                                                    <FormLabel className="text-base">{t("form.target_categories")}</FormLabel>
                                                    <FormDescription>
                                                        اختر الفئات المستهدفة لهذا النشاط (يمكن اختيار أكثر من فئة)
                                                    </FormDescription>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border p-4 rounded-lg bg-gray-50/50">
                                                    {targetCategories.map((category) => (
                                                        <FormField
                                                            key={category.id}
                                                            control={form.control}
                                                            name="target_category_ids"
                                                            render={({ field }) => {
                                                                return (
                                                                    <FormItem
                                                                        key={category.id}
                                                                        className="flex flex-row items-start space-x-3 space-x-reverse"
                                                                    >
                                                                        <FormControl>
                                                                            <Checkbox
                                                                                checked={field.value?.includes(category.id)}
                                                                                onCheckedChange={(checked) => {
                                                                                    return checked
                                                                                        ? field.onChange([...(field.value || []), category.id])
                                                                                        : field.onChange(
                                                                                            (field.value || []).filter(
                                                                                                (value) => value !== category.id
                                                                                            )
                                                                                        )
                                                                                }}
                                                                            />
                                                                        </FormControl>
                                                                        <FormLabel className="font-normal cursor-pointer">
                                                                            {category.name_ar}
                                                                        </FormLabel>
                                                                    </FormItem>
                                                                )
                                                            }}
                                                        />
                                                    ))}
                                                </div>
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

                                    {/* Google Sheets Sync Section */}
                                    <div className="border-t pt-6 mt-6">
                                        <h3 className="text-lg font-semibold mb-4">بوابة التسجيل الخارجي</h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            يستخدم هذا النشاط بوابة تسجيل خارجية (تطبيق React منفصل) تتصل بقوقل شيتس عبر Google Apps Script.
                                            يمكنك ربط النشاط برابط Google Apps Script لمزامنة التسجيلات.
                                        </p>

                                        <FormField
                                            control={form.control}
                                            name="google_sheets_sync_url"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>رابط Google Apps Script</FormLabel>
                                                    <FormDescription>
                                                        رابط Web App من Google Apps Script — انسخه من مشروع الـ script.google.com بعد النشر كـ Web App
                                                    </FormDescription>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="https://script.google.com/macros/s/.../exec"
                                                            {...field}
                                                            value={field.value ?? ""}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="google_sheets_sync_mode"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>وضع المزامنة عند الجلب من قوقل شيتس</FormLabel>
                                                    <FormDescription>
                                                        عند النقر على "مزامنة" في صفحة التسجيلات، هل نضيف المسجلين الجدد فقط أم نحدث الكل؟
                                                    </FormDescription>
                                                    <FormControl>
                                                        <Select value={field.value || "add_only"} onValueChange={field.onChange}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="اختر وضع المزامنة" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="add_only">إضافة فقط - إضافة الجدد دون تعديل الموجودين</SelectItem>
                                                                <SelectItem value="full">مزامنة كاملة - إضافة وتحديث بيانات الموجودين</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    
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
    );
}
