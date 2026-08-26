"use client";

import { useState, useEffect, use } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, Pencil, Save, Building2, Calendar, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { activitiesApi, AnnualProgram, ActivitySeason, SeasonStatus } from "@/lib/api/activities";
import { useInstitutionsStore } from "@/lib/stores/institutions";
import { useAuthStore } from "@/lib/stores/auth";
import { Checkbox } from "@/components/ui/checkbox";
import { PermissionGuard } from "@/hooks/useRequirePermission";

const programSchema = z.object({
    title: z.string().min(3, "العنوان يجب أن يكون 3 أحرف على الأقل"),
    description: z.string().optional(),
    season_id: z.string().min(1, "الموسم مطلوب"),
    institution_id: z.string().optional(), // Make optional
    target_activities_count: z.coerce.number().min(0).default(0),
    is_active: z.boolean().default(true),
});

type ProgramFormValues = z.infer<typeof programSchema>;

export default function ProgramsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = use(params);
    const t = useTranslations("activities");
    const tCommon = useTranslations("common");

    const [programs, setPrograms] = useState<AnnualProgram[]>([]);
    const [seasons, setSeasons] = useState<ActivitySeason[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProgram, setEditingProgram] = useState<AnnualProgram | null>(null);
    const [programToDelete, setProgramToDelete] = useState<AnnualProgram | null>(null);
    const { hasPermission } = useAuthStore();

    const { fetchInstitutions, institutions } = useInstitutionsStore();

    const form = useForm<ProgramFormValues>({
        resolver: zodResolver(programSchema) as any as any,
        defaultValues: {
            title: "",
            description: "",
            season_id: "",
            institution_id: "ALL", // Use "ALL" to represent null/global in UI if needed, or just empty string
            target_activities_count: 0,
            is_active: true,
        },
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [progs, szns] = await Promise.all([
                activitiesApi.getPrograms(),
                activitiesApi.getSeasons(),
                fetchInstitutions({ size: 100 })
            ]);
            setPrograms(progs);
            setSeasons(szns);
        } catch (error) {
            console.error("Failed to load data:", error);
            toast.error(t("messages.error_loading_data"));
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenDialog = (program?: AnnualProgram) => {
        if (program) {
            setEditingProgram(program);
            form.reset({
                title: program.title,
                description: program.description || "",
                season_id: program.season_id,
                institution_id: program.institution_id || "ALL",
                target_activities_count: program.target_activities_count,
                is_active: program.is_active,
            });
        } else {
            setEditingProgram(null);
            // Auto-select active season if available
            const activeSeason = seasons.find(s => s.status === SeasonStatus.OPEN);

            form.reset({
                title: "",
                description: "",
                season_id: activeSeason?.id || "",
                institution_id: "ALL",
                target_activities_count: 0,
                is_active: true,
            });
        }
        setIsDialogOpen(true);
    };

    const onSubmit = async (data: ProgramFormValues) => {
        try {
            // Handle "ALL" or empty string for institution_id => null
            const payload = {
                ...data,
                institution_id: (data.institution_id === "ALL" || data.institution_id === "") ? undefined : data.institution_id
            };

            if (editingProgram) {
                await activitiesApi.updateProgram(editingProgram.id, payload);
                toast.success(t("messages.updated"));
            } else {
                await activitiesApi.createProgram(payload);
                toast.success(t("messages.created"));
            }
            setIsDialogOpen(false);
            loadData(); // Reload all to be safe
        } catch (error) {
            console.error("Failed to save program:", error);
            toast.error(t("messages.error"));
        }
    };

    const confirmDelete = async (permanent: boolean) => {
        if (!programToDelete) return;
        try {
            await activitiesApi.deleteProgram(programToDelete.id, permanent);
            toast.success(permanent ? "تم حذف البرنامج نهائياً" : "تم حذف البرنامج");
            setProgramToDelete(null);
            loadData();
        } catch (error) {
            console.error("Failed to delete program:", error);
            toast.error("فشل حذف البرنامج");
        }
    };

    return (
        <PermissionGuard module="activities" action="programs.view">
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{t("programs.title")}</h1>
                        <p className="text-gray-500">{t("list.subtitle")}</p>
                    </div>
                    {hasPermission('activities', 'programs.create') && (
                        <Button onClick={() => handleOpenDialog()}>
                            <Plus className="w-4 h-4 me-2" />
                            {t("programs.add")}
                        </Button>
                    )}
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("programs.title_field")}</TableHead>
                                    <TableHead>{t("form.season")}</TableHead>
                                    <TableHead>{t("form.institution")}</TableHead>
                                    <TableHead>{t("programs.target_activities")}</TableHead>
                                    <TableHead>{t("seasons.status")}</TableHead>
                                    <TableHead className="w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                                        </TableCell>
                                    </TableRow>
                                ) : programs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                                            {t("programs.noPrograms")}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    programs.map((program) => (
                                        <TableRow key={program.id}>
                                            <TableCell className="font-medium">
                                                <div>{program.title}</div>
                                                {program.description && (
                                                    <div className="text-xs text-gray-500 truncate max-w-[300px]">{program.description}</div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-3 h-3 text-gray-400" />
                                                    {program.season?.name || '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-3 h-3 text-gray-400" />
                                                    {program.institution?.name_ar || 'كل المؤسسات'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {program.target_activities_count}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={program.is_active ? "default" : "secondary"}>
                                                    {program.is_active ? t("status.active") : t("status.archived")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    {hasPermission('activities', 'programs.edit') && (
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(program)}>
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {hasPermission('activities', 'programs.delete') && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => setProgramToDelete(program)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
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
                                {editingProgram ? t("programs.edit") : t("programs.add")}
                            </DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("programs.title_field")}</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="عنوان البرنامج" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

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
                                                            {season.name}
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
                                    name="institution_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("form.institution")}</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="اختر المؤسسة" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="ALL">-- عام (كل المؤسسات) --</SelectItem>
                                                    {institutions.map((inst) => (
                                                        <SelectItem key={inst.id} value={inst.id}>
                                                            {inst.name_ar}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>اتركه عاماً إذا كان البرنامج ينطبق على جميع المؤسسات</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="target_activities_count"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("programs.target_activities")}</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} min={0} />
                                            </FormControl>
                                            <FormDescription>العدد المستهدف للأنشطة في هذا البرنامج</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("form.description")}</FormLabel>
                                            <FormControl>
                                                <Textarea {...field} placeholder="وصف البرنامج وأهدافه..." />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="is_active"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>
                                                    {t("status.active")}
                                                </FormLabel>
                                                <FormDescription>
                                                    تفعيل أو تعطيل هذا البرنامج
                                                </FormDescription>
                                            </div>
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

                <Dialog open={!!programToDelete} onOpenChange={(open) => !open && setProgramToDelete(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>تأكيد الحذف</DialogTitle>
                            <DialogDescription>
                                هل أنت متأكد من رغبتك في حذف البرنامج "{programToDelete?.title}"؟
                            </DialogDescription>
                        </DialogHeader>

                        {hasPermission('activities', 'programs.delete_permanent') && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex items-start gap-2">
                                <AlertTriangle className="w-5 h-5 shrink-0" />
                                <div>
                                    <strong>تحذير:</strong> الحذف النهائي سيؤدي إلى فك ارتباط جميع الأنشطة التابعة لهذا البرنامج وحذف البرنامج نهائياً.
                                </div>
                            </div>
                        )}

                        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
                            <Button variant="outline" onClick={() => setProgramToDelete(null)}>إلغاء</Button>

                            <div className="flex gap-2 w-full sm:w-auto justify-end">
                                {hasPermission('activities', 'programs.delete') && (
                                    <Button variant="destructive" onClick={() => confirmDelete(false)}>
                                        حذف (أرشيف)
                                    </Button>
                                )}

                                {hasPermission('activities', 'programs.delete_permanent') && (
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
