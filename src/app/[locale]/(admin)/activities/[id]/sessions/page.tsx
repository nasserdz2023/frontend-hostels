"use client";

import { useState, useEffect, use } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    ArrowRight,
    Plus,
    Edit,
    Trash2,
    Clock,
    MapPin,
    User,
    CheckCircle,
    XCircle,
    MoreHorizontal,
    Calendar,
    Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

import { Button } from "@/components/ui/button";
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/date-time-picker";

import {
    activitiesApi,
    Activity,
    Session,
    SessionStatus,
} from "@/lib/api/activities";

export default function ActivitySessionsPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = use(params);
    const t = useTranslations("activities");
    const tCommon = useTranslations("common");
    const router = useRouter();

    const [activity, setActivity] = useState<Activity | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [editingSession, setEditingSession] = useState<Session | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        session_date: "",
        start_time: "",
        end_time: "",
        topic: "",
        notes: "",
    });

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [activityData, sessionsData] = await Promise.all([
                activitiesApi.getActivityById(id),
                activitiesApi.getActivitySessions(id),
            ]);
            setActivity(activityData);
            setSessions(sessionsData);
        } catch (error) {
            console.error("Failed to load data:", error);
            toast.error("فشل في تحميل البيانات");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenDialog = (session?: Session) => {
        if (session) {
            setEditingSession(session);
            setFormData({
                session_date: session.session_date,
                start_time: session.start_time,
                end_time: session.end_time || "",
                topic: session.topic || "",
                notes: session.notes || "",
            });
        } else {
            setEditingSession(null);
            setFormData({
                session_date: "",
                start_time: "",
                end_time: "",
                topic: "",
                notes: "",
            });
        }
        setShowDialog(true);
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            if (editingSession) {
                await activitiesApi.updateSession(editingSession.id, formData);
                toast.success("تم تحديث الحصة");
            } else {
                await activitiesApi.createSession(id, formData);
                toast.success("تم إضافة الحصة");
            }
            setShowDialog(false);
            loadData();
        } catch (error) {
            console.error("Failed to save session:", error);
            toast.error("فشل في الحفظ");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (sessionId: string) => {
        if (!confirm("هل أنت متأكد من حذف هذه الحصة؟")) return;
        try {
            await activitiesApi.deleteSession(id, sessionId);
            toast.success("تم حذف الحصة");
            loadData();
        } catch (error) {
            console.error("Failed to delete session:", error);
            toast.error("فشل في الحذف");
        }
    };

    const getStatusColor = (status: SessionStatus) => {
        switch (status) {
            case SessionStatus.SCHEDULED:
                return "bg-blue-100 text-blue-800";
            case SessionStatus.COMPLETED:
                return "bg-green-100 text-green-800";
            case SessionStatus.CANCELLED:
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const getStatusLabel = (status: SessionStatus) => {
        switch (status) {
            case SessionStatus.SCHEDULED:
                return "مجدولة";
            case SessionStatus.COMPLETED:
                return "مكتملة";
            case SessionStatus.CANCELLED:
                return "ملغاة";
            default:
                return status;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowRight className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{t("sessions.title")}</h1>
                        <p className="text-gray-500">{activity?.title_ar}</p>
                    </div>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="w-4 h-4 me-2" />
                    {t("sessions.add")}
                </Button>
            </div>

            {/* Sessions Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        الحصص ({sessions.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {sessions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>لا توجد حصص</p>
                            <Button variant="outline" className="mt-4" onClick={() => handleOpenDialog()}>
                                <Plus className="w-4 h-4 me-2" />
                                إضافة أول حصة
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>التاريخ</TableHead>
                                    <TableHead>الوقت</TableHead>
                                    <TableHead>الموضوع</TableHead>
                                    <TableHead>المدرب</TableHead>
                                    <TableHead>الحالة</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sessions.map((session) => (
                                    <TableRow key={session.id}>
                                        <TableCell>
                                            {format(new Date(session.session_date), "dd MMMM yyyy", { locale: ar })}
                                        </TableCell>
                                        <TableCell>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                {session.start_time}
                                                {session.end_time && ` - ${session.end_time}`}
                                            </span>
                                        </TableCell>
                                        <TableCell>{session.topic || "-"}</TableCell>
                                        <TableCell>
                                            {session.instructor ? (
                                                <span className="flex items-center gap-1">
                                                    <User className="w-4 h-4 text-gray-400" />
                                                    {session.instructor.firstname_ar} {session.instructor.lastname_ar}
                                                </span>
                                            ) : (
                                                "-"
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getStatusColor(session.status)}>
                                                {getStatusLabel(session.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleOpenDialog(session)}>
                                                        <Edit className="w-4 h-4 me-2" />
                                                        تعديل
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(session.id)}
                                                        className="text-red-600"
                                                    >
                                                        <Trash2 className="w-4 h-4 me-2" />
                                                        حذف
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingSession ? "تعديل الحصة" : "إضافة حصة جديدة"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 flex flex-col">
                                <Label>التاريخ *</Label>
                                <DateTimePicker
                                    value={formData.session_date}
                                    onChange={(v) => setFormData({ ...formData, session_date: v })}
                                    placeHolder="اختر التاريخ"
                                    showTime={false}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>وقت البداية *</Label>
                                <Input
                                    type="time"
                                    value={formData.start_time}
                                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>وقت النهاية</Label>
                            <Input
                                type="time"
                                value={formData.end_time}
                                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>الموضوع</Label>
                            <Input
                                value={formData.topic}
                                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                                placeholder="موضوع الحصة"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>ملاحظات</Label>
                            <Textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>
                            {tCommon("cancel")}
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                            {tCommon("save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
