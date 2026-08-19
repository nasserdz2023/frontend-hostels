"use client";

import { useState } from "react";
import { skillsApi, CompetencyType, COMPETENCY_LABELS, CreateCompetencyEvaluationDTO } from "@/lib/api/skills";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";

export function CompetencyEvaluationForm({ employeeId, onSuccess }: { employeeId: string; onSuccess: () => void }) {
    const [type, setType] = useState<CompetencyType>(CompetencyType.TECHNICAL);
    const [score, setScore] = useState<number>(3);
    const [comments, setComments] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        setSaving(true);
        try {
            const data: CreateCompetencyEvaluationDTO = {
                employee_id: employeeId,
                competency_type: type,
                score,
                comments: comments || undefined,
            };
            await skillsApi.createEvaluation(data);
            toast.success("تم تسجيل التقييم");
            setScore(3);
            setComments("");
            onSuccess();
        } catch { toast.error("فشل تسجيل التقييم"); }
        finally { setSaving(false); }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">تقييم كفاءة جديد</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>نوع الكفاءة</Label>
                    <Select value={type} onValueChange={(v) => setType(v as CompetencyType)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {Object.values(CompetencyType).map((t) => (
                                <SelectItem key={t} value={t}>{COMPETENCY_LABELS[t]?.ar || t}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>التقييم (1-5)</Label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((v) => (
                            <button
                                key={v}
                                type="button"
                                onClick={() => setScore(v)}
                                className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
                                    score >= v ? "bg-amber-400 text-amber-900" : "bg-muted text-muted-foreground"
                                }`}
                            >
                                <Star className={`h-5 w-5 ${score >= v ? "fill-current" : ""}`} />
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>ملاحظات</Label>
                    <Textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} />
                </div>
                <Button onClick={handleSubmit} disabled={saving} className="w-full">
                    {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                    تسجيل التقييم
                </Button>
            </CardContent>
        </Card>
    );
}
