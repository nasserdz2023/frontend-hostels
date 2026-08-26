"use client";

import { useState, useEffect, use } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { arDZ } from "date-fns/locale";
import { Check, X, Eye, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { activitiesApi, ActivityListItem, ActivityStatus } from "@/lib/api/activities";
import { PermissionGuard } from "@/hooks/useRequirePermission";
import { useAuthStore } from "@/lib/stores/auth";

const rejectionSchema = z.object({
    notes: z.string().min(5, "يرجى ذكر سبب الرفض (5 أحرف على الأقل)"),
});

type RejectionFormValues = z.infer<typeof rejectionSchema>;

export default function ApprovalsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = use(params);
    const t = useTranslations("activities");
    const tCommon = useTranslations("common");
    const router = useRouter();

    const [activities, setActivities] = useState<ActivityListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Dialog states
    const [isRejectOpen, setIsRejectOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const form = useForm<RejectionFormValues>({
        resolver: zodResolver(rejectionSchema) as any,
        defaultValues: { notes: "" }
    });

    const { hasPermission } = useAuthStore();
    const canApprove = hasPermission('activities', 'approve.department') || hasPermission('activities', 'approve.final');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            // Fetch activities with PENDING statuses (Department or Director)
            const response = await activitiesApi.getActivities({
                status: `${ActivityStatus.PENDING_DEPARTMENT},${ActivityStatus.PENDING_DIRECTOR}` as any, // Cast to any to bypass strict type check until client updated
                size: 100
            });
            setActivities(response.items);
        } catch (error) {
            console.error("Failed to load approvals:", error);
            toast.error(t("messages.error_loading_data"));
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        if (!confirm("هل أنت متأكد من قبول هذا النشاط؟")) return;

        try {
            setProcessingId(id);
            await activitiesApi.approveActivity(id, 'DEPARTMENT');
            toast.success("تم قبول النشاط بنجاح");
            loadData(); // Reload list
        } catch (error) {
            console.error("Approve failed:", error);
            toast.error("فشل قبول النشاط");
        } finally {
            setProcessingId(null);
        }
    };

    const handleRejectClick = (id: string) => {
        setSelectedId(id);
        form.reset({ notes: "" });
        setIsRejectOpen(true);
    };

    const onRejectSubmit = async (data: RejectionFormValues) => {
        if (!selectedId) return;

        try {
            setProcessingId(selectedId);
            await activitiesApi.rejectActivity(selectedId, data.notes);
            toast.success("تم رفض النشاط");
            setIsRejectOpen(false);
            loadData();
        } catch (error) {
            console.error("Reject failed:", error);
            toast.error("فشل رفض النشاط");
        } finally {
            setProcessingId(null);
            setSelectedId(null);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "-";
        return format(new Date(dateStr), "PPP", { locale: arDZ });
    };

    return (
        <PermissionGuard module="activities" action="approve.department">
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">الموافقات المعلقة</h1>
                        <p className="text-gray-500">مراجعة وقبول الأنشطة المقترحة</p>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("table.code")}</TableHead>
                                    <TableHead>{t("table.title")}</TableHead>
                                    <TableHead>{t("table.institution")}</TableHead>
                                    <TableHead>المصلحة</TableHead>
                                    <TableHead>{t("form.coordinator")}</TableHead>
                                    <TableHead>{t("table.startDate")}</TableHead>
                                    <TableHead className="text-end">إجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                                        </TableCell>
                                    </TableRow>
                                ) : activities.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <AlertCircle className="w-8 h-8 text-gray-300" />
                                                <p>لا توجد أنشطة بانتظار الموافقة</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    activities.map((activity) => (
                                        <TableRow key={activity.id}>
                                            <TableCell className="font-mono text-xs">{activity.code}</TableCell>
                                            <TableCell className="font-medium">
                                                <div>{activity.title_ar}</div>
                                                <div className="text-xs text-gray-500">
                                                    {activity.category?.name_ar}
                                                </div>
                                            </TableCell>
                                            <TableCell>{activity.institution?.name_ar}</TableCell>
                                            <TableCell>
                                                {activity.department_type ? (
                                                    <Badge variant="outline" className={activity.department_type === 'YOUTH' ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-green-50 text-green-700 border-green-200"}>
                                                        {activity.department_type === 'YOUTH' ? 'الشباب' : 'الرياضة'}
                                                    </Badge>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>-</TableCell>
                                            {/* Coordinator info might need populating in backend if needed here, or accessed via separate call. Using placeholder for now as list item might not have it deeply populated */}
                                            <TableCell>{formatDate(activity.start_date)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => router.push(`/${locale}/activities/${activity.id}`)}
                                                    >
                                                        <Eye className="w-4 h-4 me-1" />
                                                        عرض
                                                    </Button>
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700"
                                                        onClick={() => handleApprove(activity.id)}
                                                        disabled={processingId === activity.id}
                                                    >
                                                        {processingId === activity.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 me-1" />}
                                                        {t("actions.approve")}
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleRejectClick(activity.id)}
                                                        disabled={processingId === activity.id}
                                                    >
                                                        <X className="w-4 h-4 me-1" />
                                                        {t("actions.reject")}
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

                <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>رفض النشاط</DialogTitle>
                            <DialogDescription>
                                يرجى ذكر سبب الرفض ليتم إرساله للمنسق.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onRejectSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>سبب الرفض</FormLabel>
                                            <FormControl>
                                                <Textarea {...field} placeholder="اكتب سبب الرفض هنا..." rows={4} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <Button variant="outline" type="button" onClick={() => setIsRejectOpen(false)}>
                                        إلغاء
                                    </Button>
                                    <Button type="submit" variant="destructive">
                                        رفض النشاط
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
        </PermissionGuard>
    );
}
