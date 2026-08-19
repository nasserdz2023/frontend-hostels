"use client";

import { useEffect, useState } from "react";
import { skillsApi, SkillGapAnalysis as GapType, GAP_LABELS, PROFICIENCY_LABELS } from "@/lib/api/skills";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const gapConfig: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
    NONE: { color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: CheckCircle },
    MINOR: { color: "text-blue-600 bg-blue-50 border-blue-200", icon: AlertCircle },
    MODERATE: { color: "text-amber-600 bg-amber-50 border-amber-200", icon: AlertTriangle },
    SIGNIFICANT: { color: "text-red-600 bg-red-50 border-red-200", icon: AlertTriangle },
};

export function SkillGapAnalysis({ employeeId }: { employeeId: string }) {
    const [gaps, setGaps] = useState<GapType[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const data = await skillsApi.getSkillGapAnalysis(employeeId);
                setGaps(data);
            } catch { toast.error("فشل تحليل الفجوات"); }
            finally { setLoading(false); }
        };
        load();
    }, [employeeId]);

    if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>;

    const significant = gaps.filter(g => g.gap === "SIGNIFICANT").length;
    const moderate = gaps.filter(g => g.gap === "MODERATE").length;
    const none_ = gaps.filter(g => g.gap === "NONE").length;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">تحليل فجوة المهارات</CardTitle>
                <div className="flex gap-3 mt-2 text-sm">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700">{none_} مكتملة</Badge>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700">{moderate} متوسطة</Badge>
                    <Badge variant="outline" className="bg-red-50 text-red-700">{significant} كبيرة</Badge>
                </div>
            </CardHeader>
            <CardContent>
                {gaps.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">لا توجد مهارات إجبارية محددة</p>
                ) : (
                    <div className="space-y-3">
                        {gaps.map((gap) => {
                            const cfg = gapConfig[gap.gap] || gapConfig.SIGNIFICANT;
                            const Icon = cfg.icon;
                            const curLabel = gap.current_level ? PROFICIENCY_LABELS[gap.current_level]?.ar || gap.current_level : "غير مسجل";
                            const reqLabel = PROFICIENCY_LABELS[gap.required_level]?.ar || gap.required_level;
                            return (
                                <div key={gap.skill_id} className={`p-3 rounded-lg border ${cfg.color}`}>
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4 shrink-0" />
                                        <span className="font-medium">{gap.skill_name_ar}</span>
                                        <Badge variant="outline" className="text-xs">
                                            {GAP_LABELS[gap.gap]?.ar || gap.gap}
                                        </Badge>
                                    </div>
                                    <p className="text-xs mt-1 opacity-75">
                                        الحالي: {curLabel} ← المطلوب: {reqLabel}
                                    </p>
                                    <p className="text-xs mt-0.5 opacity-60">{gap.gap_description}</p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
