"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { TrendingUp, Award, AlertCircle, Scale, ExternalLink, Rocket, GitFork } from "lucide-react";
import { format, addMonths } from "date-fns";
import { arDZ } from "date-fns/locale";
import { Link } from "@/i18n/routing";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import api from "@/lib/api/client";
import { toast } from "sonner";

// تسميات الوتائر وفق المرسوم الرئاسي 07-304
const PACE_DATA: Record<string, { durationMonths: number; label: string; color: string; bg: string }> = {
    FAST: { durationMonths: 30, label: "FAST", color: "text-green-600", bg: "bg-green-50" },
    MIN: { durationMonths: 30, label: "MIN", color: "text-green-600", bg: "bg-green-50" },
    MEDIUM: { durationMonths: 36, label: "MEDIUM", color: "text-blue-600", bg: "bg-blue-50" },
    MAX: { durationMonths: 42, label: "MAX", color: "text-orange-600", bg: "bg-orange-50" },
    SLOW: { durationMonths: 42, label: "SLOW", color: "text-orange-600", bg: "bg-orange-50" },
};

interface EchelonData {
    current_echelon: number;
    next_echelon: number | null;
    echelon_date: string | null;
    next_promotion_date: string | null;
    days_remaining: number | null;
    is_max: boolean;
    progression_pace: string;
    duration_years: number | null;
}

interface EchelonProgressionProps {
    employeeId: string;
}

export function EchelonProgression({ employeeId }: EchelonProgressionProps) {
    const t = useTranslations("hr");
    const [data, setData] = useState<EchelonData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get<EchelonData>(`/employees/${employeeId}/echelon-progression`);
                setData(res.data);
            } catch (error) {
                toast.error("فشل في تحميل معلومات الترقية");
            } finally {
                setLoading(false);
            }
        };
        if (employeeId) fetchData();
    }, [employeeId]);

    if (loading) {
        return <Skeleton className="h-40 w-full" />;
    }

    if (!data) return null;

    const pace = PACE_DATA[data.progression_pace] || PACE_DATA.MEDIUM;
    const paceLabel = t(`echelon.paceTypes.${data.progression_pace}`) || data.progression_pace;
    const progressPercent = (data.current_echelon / 12) * 100;
    const echelonDate = data.echelon_date ? new Date(data.echelon_date) : null;

    // Build future echelon projection from current to 12
    const futureEchelons: { echelon: number; date: Date | null; isCurrent: boolean; isNext: boolean }[] = [];
    if (echelonDate && !data.is_max) {
        let baseDate = echelonDate;
        for (let e = data.current_echelon; e <= 12; e++) {
            if (e === data.current_echelon) {
                // Current grade — use the actual next promotion date if available
                const currentDate = data.next_promotion_date
                    ? new Date(data.next_promotion_date)
                    : baseDate;
                futureEchelons.push({
                    echelon: e,
                    date: currentDate,
                    isCurrent: true,
                    isNext: false,
                });
            } else {
                // Future grades — calculate projected dates
                const projectedDate = addMonths(baseDate, pace.durationMonths);
                futureEchelons.push({
                    echelon: e,
                    date: projectedDate,
                    isCurrent: false,
                    isNext: e === data.current_echelon + 1,
                });
                baseDate = projectedDate;
            }
        }
    }

    return (
        <Card className="bg-gradient-to-l from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-purple-600" />
                        {t("echelon.title")}
                    </CardTitle>
                    <Link href="/hr/promotion-laws">
                        <Button variant="ghost" size="sm" className="text-xs gap-1 text-purple-600 hover:text-purple-800">
                            <Scale className="h-3.5 w-3.5" />
                            {t("echelon.legalFramework")}
                            <ExternalLink className="h-3 w-3" />
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="space-y-5">
                {/* Current Status — HEADER */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">{t("echelon.currentGrade")}</p>
                        <p className="text-4xl font-bold text-purple-700 dark:text-purple-300">
                            {data.current_echelon}
                            <span className="text-lg font-normal text-muted-foreground">/12</span>
                        </p>
                    </div>
                    <div className="text-start space-y-1">
                        <Badge className={`${pace.bg} ${pace.color} border-0`}>
                            {t("echelon.pace")}: {paceLabel}
                        </Badge>
                        {!data.is_max && data.duration_years && (
                            <p className="text-xs text-muted-foreground">
                                {data.duration_years} {t("echelon.perGrade")}
                            </p>
                        )}
                        {data.is_max && (
                            <Badge className="mt-1 bg-amber-50 text-amber-700 border-0">
                                <Award className="h-3 w-3 me-1" />
                                {t("echelon.maxGrade")}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                    <Progress value={progressPercent} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>1</span>
                        <span>12</span>
                    </div>
                </div>

                {/* Next Promotion — highlighted */}
                {!data.is_max && data.next_promotion_date && (
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-100/80 to-violet-100/80 dark:from-purple-800/30 dark:to-violet-800/30 rounded-lg border border-purple-200/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-200/60 dark:bg-purple-700/40 rounded-full">
                                <Rocket className="h-5 w-5 text-purple-700 dark:text-purple-300" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">{t("echelon.nextPromotion")}</p>
                                <p className="text-xs text-muted-foreground">
                                    {t("echelon.toGrade")} {data.current_echelon + 1}
                                </p>
                            </div>
                        </div>
                        <div className="text-start">
                            <p className="font-bold text-purple-700 dark:text-purple-300">
                                {format(new Date(data.next_promotion_date), 'dd MMMM yyyy', { locale: arDZ })}
                            </p>
                            {data.days_remaining !== null && data.days_remaining > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    {t("echelon.daysRemaining")}: {data.days_remaining}
                                </p>
                            )}
                            {data.days_remaining === 0 && (
                                <Badge variant="default" className="bg-green-500 text-white">
                                    <AlertCircle className="h-3 w-3 me-1" />
                                    {t("echelon.dueNow")}
                                </Badge>
                            )}
                        </div>
                    </div>
                )}

                {/* Future Echelons — BODY: Projection Table */}
                {futureEchelons.length > 1 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <GitFork className="h-4 w-4" />
                            <span>{t("echelon.projectionTable")}</span>
                        </div>
                        <div className="rounded-lg border bg-white/60 dark:bg-white/5 overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs w-12 text-center">#</TableHead>
                                        <TableHead className="text-xs">{t("echelon.gradeLabel")}</TableHead>
                                        <TableHead className="text-xs text-start">{t("echelon.expectedDate")}</TableHead>
                                        <TableHead className="text-xs text-center">{t("echelon.status")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {futureEchelons.slice(0, 8).map((item) => (
                                        <TableRow key={item.echelon} className={item.isCurrent ? "bg-purple-50/80 dark:bg-purple-900/20" : ""}>
                                            <TableCell className="text-center text-xs font-mono">{item.echelon}</TableCell>
                                            <TableCell className="text-xs">
                                                {t("echelon.gradeLevel")} {item.echelon}
                                            </TableCell>
                                            <TableCell className="text-xs font-mono" dir="ltr">
                                                {item.date ? format(item.date, 'yyyy/MM/dd') : "—"}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {item.isCurrent && (
                                                    <Badge variant="outline" className="text-[10px] bg-purple-100 text-purple-700 border-purple-200">
                                                        {t("echelon.current")}
                                                    </Badge>
                                                )}
                                                {item.isNext && !data.is_max && (
                                                    <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200">
                                                        <Rocket className="h-2.5 w-2.5 me-0.5" />
                                                        {t("echelon.next")}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                {/* Legal Reference */}
                <p className="text-[10px] text-muted-foreground/60 pt-1">
                    {t("echelon.legalReferenceFull")}
                </p>
            </CardContent>
        </Card>
    );
}

export default EchelonProgression;
