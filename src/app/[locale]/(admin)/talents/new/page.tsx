"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import {
    Save, ArrowRight, ArrowLeft, User, Activity,
    Phone, Mail, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    RadioGroup,
    RadioGroupItem,
} from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ui/image-upload";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { toast } from "sonner";
import { talentsApi, TalentDomain } from "@/lib/api/talents";

/* ─── Validation helpers ─── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+?\d{1,3})?[\s\-]?\d{8,15}$/;

export default function NewTalentPage() {
    const t = useTranslations("talents");
    const router = useRouter();
    const locale = useLocale();
    const isRtl = locale === "ar";

    /* ─── Zod schema with i18n error messages ─── */
    const formSchema = useMemo(() => z.object({
        firstname_ar: z.string().min(1, t("required")),
        lastname_ar: z.string().min(1, t("required")),
        firstname_fr: z.string().optional().default(""),
        lastname_fr: z.string().optional().default(""),
        phone: z.string().optional().default(""),
        email: z.string().optional().default(""),
        gender: z.enum(["MALE", "FEMALE"]),
        birth_date: z.string().optional().default(""),
        domain: z.nativeEnum(TalentDomain),
        specialization: z.string().optional().default(""),
        bio: z.string().optional().default(""),
        is_active: z.boolean(),
        photo: z.any().optional(),
    }).refine((data) => !data.email || EMAIL_RE.test(data.email), {
        message: t("invalid_email"),
        path: ["email"],
    }).refine((data) => !data.phone || PHONE_RE.test(data.phone), {
        message: t("invalid_phone"),
        path: ["phone"],
    }), [t]);

    type FormValues = z.infer<typeof formSchema>;

    const form = useForm<FormValues>({
        // @ts-ignore - zodResolver types differ between zod v3/v4
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            firstname_ar: "",
            lastname_ar: "",
            firstname_fr: "",
            lastname_fr: "",
            phone: "",
            email: "",
            gender: "MALE",
            birth_date: "",
            domain: TalentDomain.SPORTS,
            specialization: "",
            bio: "",
            is_active: true,
            photo: null,
        },
    });

    const isSubmitting = form.formState.isSubmitting;

    /* ─── Ctrl+S shortcut ─── */
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                form.handleSubmit(handleSubmit)();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ─── Submit handler ─── */
    const handleSubmit = async (data: FormValues) => {
        try {
            await talentsApi.createTalent({
                domain: data.domain,
                specialization: data.specialization || undefined,
                bio: data.bio || undefined,
                is_active: data.is_active,
                participant_data: {
                    firstname_ar: data.firstname_ar,
                    lastname_ar: data.lastname_ar,
                    firstname_fr: data.firstname_fr || undefined,
                    lastname_fr: data.lastname_fr || undefined,
                    phone: data.phone || undefined,
                    email: data.email || undefined,
                    gender: data.gender,
                    birth_date: data.birth_date || undefined,
                }
            });
            toast.success(t("talent_created_success"));
            router.push("/talents");
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.detail || t("create_failed"));
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-4xl mx-auto space-y-6">

                {/* ── Header ── */}
                <div className="flex items-center gap-4">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        aria-label={t("back_to_directory")}
                    >
                        {isRtl
                            ? <ArrowRight className="h-5 w-5" />
                            : <ArrowLeft className="h-5 w-5" />
                        }
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{t("add_talent")}</h1>
                        <p className="text-muted-foreground">{t("register_new_talent_profile")}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* ── Personal Information Card ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                {t("personal_information")}
                            </CardTitle>
                            <CardDescription>
                                {t("personal_info_description")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Photo */}
                            <FormField
                                control={form.control}
                                name="photo"
                                render={({ field: { onChange, value, ...field } }) => (
                                    <FormItem className="flex flex-col items-center">
                                        <FormLabel>{t("photo")}</FormLabel>
                                        <FormControl>
                                            <ImageUpload
                                                value={value ?? null}
                                                onChange={onChange}
                                                labels={{
                                                    upload: t("photo"),
                                                    select: t("photo"),
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Names - Arabic */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="firstname_ar"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="after:content-['*'] after:ms-0.5 after:text-red-500">
                                                {t("firstname_ar")}
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    dir="rtl"
                                                    required
                                                    name="firstname_ar"
                                                />
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
                                            <FormLabel className="after:content-['*'] after:ms-0.5 after:text-red-500">
                                                {t("lastname_ar")}
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    dir="rtl"
                                                    required
                                                    name="lastname_ar"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Names - French */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="firstname_fr"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("firstname_fr")}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    dir="ltr"
                                                    name="firstname_fr"
                                                />
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
                                            <FormLabel>{t("lastname_fr")}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    dir="ltr"
                                                    name="lastname_fr"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Birth date + Gender */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="birth_date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("birth_date")}</FormLabel>
                                            <FormControl>
                                                <DateTimePicker
                                                    value={field.value || undefined}
                                                    onChange={field.onChange}
                                                    showTime={false}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="gender"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("gender")}</FormLabel>
                                            <FormControl>
                                                <RadioGroup
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                    className="flex gap-4 pt-2"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <RadioGroupItem value="MALE" id="gender-male" />
                                                        <Label htmlFor="gender-male" className="text-sm font-normal cursor-pointer">
                                                            {t("male")}
                                                        </Label>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <RadioGroupItem value="FEMALE" id="gender-female" />
                                                        <Label htmlFor="gender-female" className="text-sm font-normal cursor-pointer">
                                                            {t("female")}
                                                        </Label>
                                                    </div>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Phone & Email */}
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-1">
                                                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                                {t("phone")}
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="tel"
                                                    placeholder={t("phone_placeholder")}
                                                    name="phone"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-1">
                                                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                                {t("email")}
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="email"
                                                    placeholder={t("email_placeholder")}
                                                    name="email"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Talent Details Card ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-primary" />
                                {t("talent_details")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="domain"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="after:content-['*'] after:ms-0.5 after:text-red-500">
                                            {t("domain")}
                                        </FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger name="domain">
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Object.values(TalentDomain).map(d => (
                                                    <SelectItem key={d} value={d}>{t(`domains.${d}`)}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="specialization"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("specialization")}</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder={t("specialization_placeholder")}
                                                name="specialization"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="bio"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("bio")}</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                rows={5}
                                                placeholder={t("bio")}
                                                name="bio"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* is_active */}
                            <FormField
                                control={form.control}
                                name="is_active"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel>{t("is_active")}</FormLabel>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* ── Actions ── */}
                <div className="flex justify-end gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                    >
                        {t("cancel")}
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? t("saving") : t("save")}
                        <Save className="ms-2 h-4 w-4" />
                    </Button>
                </div>
            </form>
        </Form>
    );
}
