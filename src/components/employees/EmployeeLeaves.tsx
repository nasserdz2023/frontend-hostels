"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, Plus, Check, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import CalendarPicker from "@/components/ui/calendar";
import { toast } from "sonner";
import api from "@/lib/api/client";

// Leave Types and Labels
export const LEAVE_TYPES = {
    ANNUAL: { label: "راحة سنوية", days: 30, icon: "🌴" },
    SICK: { label: "رخصة مرضية", days: null, icon: "🏥" },
    MATERNITY: { label: "رخصة أمومة", days: 98, icon: "👶" },
    PATERNITY: { label: "رخصة أبوة", days: 3, icon: "👨‍👦" },
    MARRIAGE: { label: "رخصة زواج", days: 3, icon: "💒" },
    DEATH_SPOUSE: { label: "وفاة الزوج/ة", days: 3, icon: "🖤" },
    DEATH_PARENT: { label: "وفاة الوالدين", days: 3, icon: "🖤" },
    DEATH_CHILD: { label: "وفاة ابن/ة", days: 3, icon: "🖤" },
    DEATH_OTHER: { label: "وفاة قريب", days: 1, icon: "🖤" },
    HAJJ: { label: "رخصة الحج", days: 30, icon: "🕋" },
    STUDY: { label: "رخصة دراسية", days: null, icon: "📚" },
    UNPAID: { label: "استيداع", days: null, icon: "⏸️" }
};

// Algerian Month Names
const ALGERIAN_MONTHS = [
    "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
    "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

const formatDateDZ = (date: Date | string, includeYear = true) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = d.getDate();
    const month = ALGERIAN_MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return includeYear ? `${day} ${month} ${year}` : `${day} ${month}`;
};

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    PENDING: { label: "قيد الانتظار", variant: "secondary" },
    APPROVED: { label: "مقبول", variant: "default" },
    REJECTED: { label: "مرفوض", variant: "destructive" },
    CANCELLED: { label: "ملغى", variant: "outline" }
};

interface LeaveRequest {
    id: string;
    leave_type: string;
    status: string;
    start_date: string;
    end_date: string;
    days_count: number;
    reason?: string;
    created_at: string;
}

interface LeaveBalance {
    annual_total: number;
    annual_used: number;
    annual_remaining: number;
    hajj_used: boolean;
}

interface EmployeeLeavesProps {
    employeeId: string;
    canEdit?: boolean;
}

export function EmployeeLeaves({ employeeId, canEdit = false }: EmployeeLeavesProps) {
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [balance, setBalance] = useState<LeaveBalance | null>(null);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [leaveType, setLeaveType] = useState("");
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [reason, setReason] = useState("");

    const fetchData = async () => {
        try {
            setLoading(true);
            const [leavesRes, balanceRes] = await Promise.all([
                api.get<{ items: LeaveRequest[] }>(`/employees/${employeeId}/leaves`),
                api.get<LeaveBalance>(`/employees/${employeeId}/leave-balance`)
            ]);
            setLeaves(leavesRes.data.items);
            setBalance(balanceRes.data);
        } catch (error) {
            toast.error("فشل في تحميل الرخص");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (employeeId) fetchData();
    }, [employeeId]);

    const handleSubmit = async () => {
        if (!leaveType || !startDate || !endDate) {
            toast.error("يرجى ملء جميع الحقول المطلوبة");
            return;
        }

        setSubmitting(true);
        try {
            await api.post(`/employees/${employeeId}/leaves`, {
                leave_type: leaveType,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                reason
            });
            toast.success("تم إنشاء طلب الرخصة بنجاح");
            setDialogOpen(false);
            resetForm();
            fetchData();
        } catch (error) {
            toast.error("فشل في إنشاء الطلب");
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setLeaveType("");
        setStartDate(undefined);
        setEndDate(undefined);
        setReason("");
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Balance Card */}
            {balance && (
                <Card className="bg-gradient-to-l from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-600 dark:text-blue-400">رصيد الراحة السنوية</p>
                                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                                    {balance.annual_remaining} <span className="text-lg font-normal">يوم</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    استهلكت {balance.annual_used} من {balance.annual_total} يوم
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {balance.hajj_used && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                        🕋 تم استخدام رخصة الحج
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Leaves List */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        طلبات الرخص
                        <Badge variant="secondary">{leaves.length}</Badge>
                    </CardTitle>
                    {canEdit && (
                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                    <Plus className="h-4 w-4 me-1" />
                                    طلب رخصة
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md" dir="rtl">
                                <DialogHeader>
                                    <DialogTitle>طلب رخصة جديد</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <Select value={leaveType} onValueChange={setLeaveType}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="اختر نوع الرخصة" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(LEAVE_TYPES).map(([key, val]) => (
                                                <SelectItem key={key} value={key}>
                                                    {val.icon} {val.label} {val.days && `(${val.days} يوم)`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm mb-1 block">من تاريخ</label>
                                            <CalendarPicker
                                                mode="single"
                                                selected={startDate}
                                                onSelect={setStartDate}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm mb-1 block">إلى تاريخ</label>
                                            <CalendarPicker
                                                mode="single"
                                                selected={endDate}
                                                onSelect={setEndDate}
                                            />
                                        </div>
                                    </div>

                                    <Textarea
                                        placeholder="سبب الطلب (اختياري)"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                    />

                                    <Button
                                        className="w-full"
                                        onClick={handleSubmit}
                                        disabled={submitting || !leaveType || !startDate || !endDate}
                                    >
                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
                                        إرسال الطلب
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </CardHeader>
                <CardContent>
                    {leaves.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>لا توجد طلبات رخص</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {leaves.map((leave) => (
                                <div
                                    key={leave.id}
                                    className="flex items-center justify-between p-4 border rounded-lg"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                                            {LEAVE_TYPES[leave.leave_type as keyof typeof LEAVE_TYPES]?.icon || "📅"}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-medium">
                                                    {LEAVE_TYPES[leave.leave_type as keyof typeof LEAVE_TYPES]?.label || leave.leave_type}
                                                </h4>
                                                <Badge variant={STATUS_BADGES[leave.status]?.variant || "outline"}>
                                                    {STATUS_BADGES[leave.status]?.label || leave.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                <Clock className="h-3 w-3" />
                                                <span>
                                                    {formatDateDZ(leave.start_date, false)}
                                                    {" - "}
                                                    {formatDateDZ(leave.end_date)}
                                                </span>
                                                <span className="mx-1">•</span>
                                                <span>{leave.days_count} يوم</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default EmployeeLeaves;
