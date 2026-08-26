"use client";

import { useState, useEffect, use } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { arDZ } from "date-fns/locale";
import { Loader2, Plus, Pencil, Calendar, Save, Trash2, PlayCircle, StopCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { activitiesApi, ActivitySeason, SeasonStatus, SEASON_STATUS_LABELS } from "@/lib/api/activities";
import { useAuthStore } from "@/lib/stores/auth";
import { PermissionGuard } from "@/hooks/useRequirePermission";

const seasonSchema = z.object({
    name: z.string().min(3, "الاسم يجب أن يكون 3 أحرف على الأقل"),
    start_date: z.string().min(1, "تاريخ البداية مطلوب"),
    end_date: z.string().min(1, "تاريخ النهاية مطلوب"),
    status: z.nativeEnum(SeasonStatus),
    theme: z.string().optional(),
    objectives: z.string().optional(),
});

type SeasonFormValues = z.infer<typeof seasonSchema>;

export default function SeasonsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = use(params);
    const t = useTranslations("activities");
    const tCommon = useTranslations("common");

    const [seasons, setSeasons] = useState<ActivitySeason[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSeason, setEditingSeason] = useState<ActivitySeason | null>(null);
    const [seasonToDelete, setSeasonToDelete] = useState<ActivitySeason | null>(null);
    const { hasPermission } = useAuthStore();

    // Permission checks
    const canManage = hasPermission('activities', 'seasons.manage');
    const canOpenClose = hasPermission('activities', 'seasons.open_close');

    const form = useForm<SeasonFormValues>({
        resolver: zodResolver(seasonSchema) as any,
        defaultValues: {
            name: "",
            start_date: "",
            end_date: "",
            status: SeasonStatus.DRAFT,
            theme: "",
            objectives: "",
        },
    });

    useEffect(() => {
        loadSeasons();
    }, []);

    const loadSeasons = async () => {
        try {
            setIsLoading(true);
            const data = await activitiesApi.getSeasons();
            setSeasons(data);
        } catch (error) {
            console.error("Failed to load seasons:", error);
            toast.error(t("messages.error_loading_data"));
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenDialog = (season?: ActivitySeason) => {
        if (season) {
            setEditingSeason(season);
            form.reset({
                name: season.name,
                start_date: season.start_date.split("T")[0],
                end_date: season.end_date.split("T")[0],
                status: season.status,
                theme: season.theme || "",
                objectives: Array.isArray(season.objectives) ? season.objectives.join("\n") : (season.objectives || ""),
            });
        } else {
            setEditingSeason(null);
            form.reset({
                name: "",
                start_date: "",
                end_date: "",
                status: SeasonStatus.DRAFT,
                theme: "",
            });
        }
        setIsDialogOpen(true);
    };

    const onSubmit = async (data: SeasonFormValues) => {
        try {
            const payload = {
                ...data,
                // Split objectives string into array
                objectives: data.objectives ? data.objectives.split("\n").filter(line => line.trim() !== "") : [],
            };

            if (editingSeason) {
                await activitiesApi.updateSeason(editingSeason.id, payload);
                toast.success(t("messages.updated"));
            } else {
                await activitiesApi.createSeason(payload);
                toast.success(t("messages.created"));
            }
            setIsDialogOpen(false);
            loadSeasons();
        } catch (error) {
            console.error("Failed to save season:", error);
            toast.error(t("messages.error"));
        }
    };

    const handleOpenSeason = async (seasonId: string) => {
        if (!confirm("هل أنت متأكد من افتتاح هذا الموسم؟")) return;
        try {
            await activitiesApi.openSeason(seasonId);
            toast.success("تم افتتاح الموسم بنجاح");
            loadSeasons();
        } catch (error) {
            console.error("Failed to open season:", error);
            toast.error("فشل افتتاح الموسم");
        }
    };

    const handleCloseSeason = async (seasonId: string) => {
        if (!confirm("هل أنت متأكد من إغلاق هذا الموسم؟")) return;
        try {
            await activitiesApi.closeSeason(seasonId);
            toast.success("تم إغلاق الموسم بنجاح");
            loadSeasons();
        } catch (error) {
            console.error("Failed to close season:", error);
            toast.error("فشل إغلاق الموسم");
        }

    };

    const confirmDelete = async (permanent: boolean) => {
        if (!seasonToDelete) return;
        try {
            await activitiesApi.deleteSeason(seasonToDelete.id, permanent);
            toast.success(permanent ? "تم حذف الموسم نهائياً" : "تم حذف الموسم");
            setSeasonToDelete(null);
            loadSeasons();
        } catch (error) {
            console.error("Failed to delete season:", error);
            toast.error("فشل حذف الموسم");
        }
    };

    const formatDate = (dateStr: string) => {
        return format(new Date(dateStr), "PPP", { locale: arDZ });
    };

    return (
        <PermissionGuard module="activities" action="seasons.view">
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{t("seasons.title")}</h1>
                        <p className="text-gray-500">إدارة المواسم الرياضية والشبابية</p>
                    </div>
                    {canManage && (
                        <Button onClick={() => handleOpenDialog()}>
                            <Plus className="w-4 h-4 me-2" />
                            {t("seasons.add")}
                        </Button>
                    )}
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("seasons.name")}</TableHead>
                                    <TableHead>{t("seasons.start_date")}</TableHead>
                                    <TableHead>{t("seasons.end_date")}</TableHead>
                                    <TableHead>{t("seasons.status")}</TableHead>
                                    <TableHead className="w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-10">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                                        </TableCell>
                                    </TableRow>
                                ) : seasons.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-10 text-gray-500">
                                            {t("seasons.noSeasons")}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    seasons.map((season) => (
                                        <TableRow key={season.id}>
                                            <TableCell className="font-medium">
                                                <div>{season.name}</div>
                                                {season.theme && (
                                                    <div className="text-xs text-gray-500">{season.theme}</div>
                                                )}
                                            </TableCell>
                                            <TableCell>{formatDate(season.start_date)}</TableCell>
                                            <TableCell>{formatDate(season.end_date)}</TableCell>
                                            <TableCell>
                                                <Badge variant={season.status === SeasonStatus.OPEN ? "default" : "secondary"}>
                                                    {SEASON_STATUS_LABELS[season.status]?.ar || season.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    {/* Open Season Button - Show for DRAFT status */}
                                                    {canOpenClose && season.status === SeasonStatus.DRAFT && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-green-600 hover:bg-green-50"
                                                            onClick={() => handleOpenSeason(season.id)}
                                                            title="افتتاح الموسم"
                                                        >
                                                            <PlayCircle className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {/* Close Season Button - Show for ACTIVE status */}
                                                    {canOpenClose && season.status === SeasonStatus.OPEN && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-600 hover:bg-red-50"
                                                            onClick={() => handleCloseSeason(season.id)}
                                                            title="إغلاق الموسم"
                                                        >
                                                            <StopCircle className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {/* Edit Button */}
                                                    {canManage && (
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(season)}>
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => setSeasonToDelete(season)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editingSeason ? t("seasons.edit") : t("seasons.add")}
                            </DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("seasons.name")}</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="مثال: الموسم الرياضي 2024-2025" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="start_date"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>{t("seasons.start_date")}</FormLabel>
                                                <FormControl>
                                                    <DateTimePicker
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        placeHolder={t("seasons.start_date")}
                                                        showTime={false}
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
                                                <FormLabel>{t("seasons.end_date")}</FormLabel>
                                                <FormControl>
                                                    <DateTimePicker
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        placeHolder={t("seasons.end_date")}
                                                        showTime={false}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="theme"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("seasons.theme")}</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="شعار الموسم (اختياري)" />
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
                                            <FormLabel>الأهداف الاستراتيجية</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    placeholder="اكتب الأهداف الاستراتيجية للموسم (كل هدف في سطر)..."
                                                    rows={4}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                حدد الاستراتيجيات الكبرى التي ستندرج تحتها الأنشطة
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("seasons.status")}</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {Object.entries(SEASON_STATUS_LABELS).map(([key, labels]) => (
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

                                <DialogFooter>
                                    <Button type="submit">
                                        <Save className="w-4 h-4 me-2" />
                                        {tCommon("save")}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>

                <Dialog open={!!seasonToDelete} onOpenChange={(open) => !open && setSeasonToDelete(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>تأكيد الحذف</DialogTitle>
                            <DialogDescription>
                                هل أنت متأكد من رغبتك في حذف الموسم "{seasonToDelete?.name}"؟
                            </DialogDescription>
                        </DialogHeader>

                        {hasPermission('activities', 'seasons.delete_permanent') && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex items-start gap-2">
                                <AlertTriangle className="w-5 h-5 shrink-0" />
                                <div>
                                    <strong>تحذير:</strong> الحذف النهائي غير قابل للاسترجاع وسيقوم بحذف جميع البيانات المرتبطة (الأنشطة، الجوائز، البرامج).
                                </div>
                            </div>
                        )}

                        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
                            <Button variant="outline" onClick={() => setSeasonToDelete(null)}>إلغاء</Button>

                            <div className="flex gap-2 w-full sm:w-auto justify-end">
                                {hasPermission('activities', 'seasons.delete') && (
                                    <Button variant="destructive" onClick={() => confirmDelete(false)}>
                                        حذف (أرشيف)
                                    </Button>
                                )}

                                {hasPermission('activities', 'seasons.delete_permanent') && (
                                    <Button className="bg-red-900 hover:bg-red-950 text-white" onClick={() => confirmDelete(true)}>
                                        حذف نهائي
                                    </Button>
                                )}
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </PermissionGuard>
    );
}
