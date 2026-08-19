"use client";

import { useState, useEffect } from "react";
import { Star, Plus, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api/client";
import { toast } from "sonner";

interface Evaluation {
    id: string;
    year: number;
    performance_score: number;
    behavior_score: number;
    punctuality_score: number;
    initiative_score: number;
    total_score: number;
}

interface AnnualEvaluationsProps {
    employeeId: string;
    canEdit?: boolean;
}

export function AnnualEvaluations({ employeeId, canEdit = false }: AnnualEvaluationsProps) {
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get<{ items: Evaluation[] }>(`/employees/${employeeId}/evaluations`);
                setEvaluations(res.data.items);
            } catch (error) {
                toast.error("فشل في تحميل التقييمات");
            } finally {
                setLoading(false);
            }
        };
        if (employeeId) fetchData();
    }, [employeeId]);

    if (loading) return <Skeleton className="h-32 w-full" />;

    const getScoreColor = (score: number) => {
        if (score >= 16) return "text-green-600";
        if (score >= 12) return "text-blue-600";
        if (score >= 8) return "text-yellow-600";
        return "text-red-600";
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    التقييم السنوي
                </CardTitle>
                {canEdit && (
                    <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 me-1" />
                        تقييم جديد
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {evaluations.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                        <Star className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>لا توجد تقييمات</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {evaluations.slice(0, 3).map((eval_) => (
                            <div key={eval_.id} className="p-3 rounded-lg border">
                                <div className="flex items-center justify-between mb-3">
                                    <Badge variant="secondary">{eval_.year}</Badge>
                                    <span className={`text-2xl font-bold ${getScoreColor(eval_.total_score)}`}>
                                        {eval_.total_score.toFixed(1)}/20
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">الأداء</span>
                                        <span>{eval_.performance_score}/20</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">السلوك</span>
                                        <span>{eval_.behavior_score}/20</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">الانضباط</span>
                                        <span>{eval_.punctuality_score}/20</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">المبادرة</span>
                                        <span>{eval_.initiative_score}/20</span>
                                    </div>
                                </div>
                                <Progress value={(eval_.total_score / 20) * 100} className="mt-2 h-2" />
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default AnnualEvaluations;
