import { useState, useEffect } from "react";
import { Shield, Plus, Building2, FileText, Clock } from "lucide-react";
import { format } from "date-fns";
import { arDZ } from "date-fns/locale";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api/client";

const POSITION_LABELS = {
    ACTIVE: { label: "القيام بالعمل", icon: "🟢", variant: "default" as const },
    SECONDMENT: { label: "الانتداب", icon: "📤", variant: "secondary" as const },
    AVAILABILITY: { label: "الاستيداع", icon: "⏸️", variant: "outline" as const },
    DETACHMENT: { label: "خارج الإطار", icon: "🔄", variant: "secondary" as const },
    MILITARY_SERVICE: { label: "الخدمة الوطنية", icon: "⭐", variant: "outline" as const },
};

interface LegalPositionRecord {
    id: string;
    position_type: string;
    start_date: string;
    end_date: string | null;
    destination: string | null;
    document_reference: string | null;
    notes: string | null;
    created_at: string;
}

interface LegalPositionStatusProps {
    employeeId: string;
    currentPosition?: string;
    canEdit?: boolean;
    onUpdate?: () => void;
}

export function LegalPositionStatus({ employeeId, currentPosition = "ACTIVE", canEdit = false, onUpdate }: LegalPositionStatusProps) {
    const [history, setHistory] = useState<LegalPositionRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        position_type: "ACTIVE",
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: "",
        destination: "",
        document_reference: "",
        notes: ""
    });

    const fetchData = async () => {
        try {
            const res = await api.get<{ items: LegalPositionRecord[] }>(`/employees/${employeeId}/legal-positions`);
            setHistory(res.data.items);
        } catch (error) {
            toast.error("فشل في تحميل الوضعيات القانونية");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (employeeId) fetchData();
    }, [employeeId]);

    const handleSubmit = async () => {
        if (!formData.position_type || !formData.start_date) {
            toast.error("يرجى ملء الحقول الإجبارية");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post(`/employees/${employeeId}/legal-positions`, formData);
            toast.success("تم تحديث الوضعية القانونية بنجاح");
            setIsDialogOpen(false);
            fetchData();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error("فشل في تحديث الوضعية");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <Skeleton className="h-32 w-full" />;
    }

    const posInfo = POSITION_LABELS[(currentPosition || "ACTIVE").toUpperCase() as keyof typeof POSITION_LABELS] || POSITION_LABELS.ACTIVE;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    الوضعية القانونية
                </CardTitle>
                {canEdit && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                                <Plus className="h-4 w-4 me-1" />
                                تغيير
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>تغيير الوضعية القانونية</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>نوع الوضعية</Label>
                                    <Select
                                        value={formData.position_type}
                                        onValueChange={(val) => setFormData({ ...formData, position_type: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(POSITION_LABELS).map(([key, info]) => (
                                                <SelectItem key={key} value={key}>
                                                    {info.icon} {info.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>تاريخ البداية</Label>
                                        <Input
                                            type="date"
                                            value={formData.start_date}
                                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>تاريخ النهاية</Label>
                                        <Input
                                            type="date"
                                            value={formData.end_date}
                                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {(formData.position_type === 'SECONDMENT' || formData.position_type === 'DETACHMENT') && (
                                    <div className="grid gap-2">
                                        <Label>الوجهة / المؤسسة المستقبلة</Label>
                                        <Input
                                            value={formData.destination}
                                            onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                                            placeholder="اسم المؤسسة..."
                                        />
                                    </div>
                                )}

                                <div className="grid gap-2">
                                    <Label>مرجع السند القانوني (رقم المقرر)</Label>
                                    <Input
                                        value={formData.document_reference}
                                        onChange={(e) => setFormData({ ...formData, document_reference: e.target.value })}
                                        placeholder="رقم القرار..."
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label>ملاحظات</Label>
                                    <Textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="أي تفاصيل إضافية..."
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
                                <Button onClick={handleSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? "جاري الحفظ..." : "حفظ التغييرات"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Current Status */}
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <span className="text-2xl">{posInfo.icon}</span>
                    <div>
                        <Badge variant={posInfo.variant} className="text-base px-3 py-1">
                            {posInfo.label}
                        </Badge>
                    </div>
                </div>

                {/* History */}
                {history.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">سجل الوضعيات</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {history.map((record) => {
                                const info = POSITION_LABELS[record.position_type as keyof typeof POSITION_LABELS] || POSITION_LABELS.ACTIVE;
                                return (
                                    <div key={record.id} className="flex items-center justify-between p-2 border rounded text-sm">
                                        <div className="flex items-center gap-2">
                                            <span>{info.icon}</span>
                                            <span>{info.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            <span>{format(new Date(record.start_date), 'dd/MM/yyyy', { locale: arDZ })}</span>
                                            {record.destination && (
                                                <span className="flex items-center gap-1">
                                                    <Building2 className="h-3 w-3" />
                                                    {record.destination}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default LegalPositionStatus;
