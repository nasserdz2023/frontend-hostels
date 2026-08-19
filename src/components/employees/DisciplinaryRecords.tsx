"use client";

import { useState, useEffect } from "react";
import { Scale, AlertTriangle, Plus } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api/client";
import { toast } from "sonner";

const PENALTY_LABELS: Record<string, string> = {
    WARNING: "إنذار",
    REPRIMAND: "توبيخ",
    SUSPENSION_1_3: "توقيف 1-3 أيام",
    SUSPENSION_4_8: "توقيف 4-8 أيام",
    DEMOTION_ECHELON: "تنزيل درجة",
    DEMOTION_GRADE: "تنزيل رتبة",
    DISQUALIFICATION: "شطب من قائمة التأهيل",
    DISMISSAL: "تسريح",
};

const DEGREE_COLORS = ["", "bg-yellow-100 text-yellow-800", "bg-orange-100 text-orange-800", "bg-red-100 text-red-800", "bg-red-200 text-red-900"];

interface DisciplinaryRecord {
    id: string;
    degree: number;
    penalty_type: string;
    reason: string;
    decision_date: string;
    is_cancelled: boolean;
}

interface DisciplinaryRecordsProps {
    employeeId: string;
    canEdit?: boolean;
}

export function DisciplinaryRecords({ employeeId, canEdit = false }: DisciplinaryRecordsProps) {
    const [records, setRecords] = useState<DisciplinaryRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get<{ items: DisciplinaryRecord[] }>(`/employees/${employeeId}/disciplinary`);
                setRecords(res.data.items);
            } catch (error) {
                toast.error("فشل في تحميل سجل التأديب");
            } finally {
                setLoading(false);
            }
        };
        if (employeeId) fetchData();
    }, [employeeId]);

    if (loading) return <Skeleton className="h-24 w-full" />;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Scale className="h-5 w-5" />
                    سجل التأديب
                    {records.length > 0 && <Badge variant="secondary">{records.length}</Badge>}
                </CardTitle>
                {canEdit && (
                    <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 me-1" />
                        إضافة
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {records.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                        <Scale className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>لا توجد عقوبات تأديبية</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {records.map((record) => (
                            <div key={record.id} className={`p-3 rounded-lg border ${record.is_cancelled ? 'opacity-50' : ''}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge className={DEGREE_COLORS[record.degree]}>
                                            الدرجة {record.degree}
                                        </Badge>
                                        <span className="font-medium">
                                            {PENALTY_LABELS[record.penalty_type] || record.penalty_type}
                                        </span>
                                        {record.is_cancelled && <Badge variant="outline">ملغاة</Badge>}
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                        {format(new Date(record.decision_date), 'dd/MM/yyyy', { locale: ar })}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{record.reason}</p>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default DisciplinaryRecords;
