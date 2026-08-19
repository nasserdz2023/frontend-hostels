"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Calendar, Briefcase, Clock, AlertTriangle, Hourglass, Sun, Umbrella } from "lucide-react";
import { format } from "date-fns";
import { arDZ } from "date-fns/locale";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api/client";
import { toast } from "sonner";

interface RetirementData {
    birth_date: string;
    hire_date: string;
    retirement_age: number;
    retirement_date: string;
    years_of_service: number;
    days_to_retirement: number;
    is_retired: boolean;
}

interface RetirementInfoProps {
    employeeId: string;
}

export function RetirementInfo({ employeeId }: RetirementInfoProps) {
    const t = useTranslations("hr");
    const [data, setData] = useState<RetirementData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get<RetirementData>(`/employees/${employeeId}/retirement`);
                setData(res.data);
            } catch (error) {
                toast.error(t("retirement.loadError"));
            } finally {
                setLoading(false);
            }
        };
        if (employeeId) fetchData();
    }, [employeeId]);

    if (loading) return <Skeleton className="h-40 w-full" />;
    if (!data) return null;

    const yearsToRetirement = Math.floor(data.days_to_retirement / 365);
    const monthsToRetirement = Math.floor((data.days_to_retirement % 365) / 30);
    const remainingDays = data.days_to_retirement % 30;
    const progressPercent = Math.min(100, (data.years_of_service / 32) * 100);

    // Determine color scheme based on proximity
    const getStatusColors = () => {
        if (data.is_retired) return { card: "border-red-200 bg-red-50/50", icon: "text-red-600", bar: "bg-red-500" };
        if (data.days_to_retirement <= 365) return { card: "border-amber-200 bg-amber-50/50", icon: "text-amber-600", bar: "bg-amber-500" };
        if (data.days_to_retirement <= 1825) return { card: "border-orange-200 bg-orange-50/50", icon: "text-orange-600", bar: "bg-orange-500" };
        return { card: "border-emerald-200 bg-emerald-50/50", icon: "text-emerald-600", bar: "bg-emerald-500" };
    };

    const colors = getStatusColors();

    return (
        <Card className={colors.card}>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Umbrella className={`h-5 w-5 ${colors.icon}`} />
                    {t("retirement.info")}
                    {data.is_retired && (
                        <Badge variant="destructive" className="gap-1">
                            <Clock className="h-3 w-3" />
                            {t("retirement.retired")}
                        </Badge>
                    )}
                    {!data.is_retired && data.days_to_retirement <= 365 && (
                        <Badge className="bg-amber-100 text-amber-700 border-0 gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {t("retirement.impending")}
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Stats Grid — 3 columns */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-white/60 dark:bg-white/10 rounded-lg">
                        <Briefcase className={`h-6 w-6 mx-auto ${colors.icon} mb-1`} />
                        <p className="text-2xl font-bold">{data.years_of_service}</p>
                        <p className="text-xs text-muted-foreground">{t("retirement.yearsOfService")}</p>
                    </div>
                    <div className="text-center p-3 bg-white/60 dark:bg-white/10 rounded-lg">
                        <Hourglass className={`h-6 w-6 mx-auto ${colors.icon} mb-1`} />
                        <p className="text-2xl font-bold">{data.is_retired ? "0" : `${yearsToRetirement}y`}</p>
                        <p className="text-xs text-muted-foreground">{t("retirement.remainingYear")}</p>
                    </div>
                    <div className="text-center p-3 bg-white/60 dark:bg-white/10 rounded-lg">
                        <Calendar className={`h-6 w-6 mx-auto ${colors.icon} mb-1`} />
                        <p className="text-2xl font-bold">{data.retirement_age}</p>
                        <p className="text-xs text-muted-foreground">{t("retirement.retirementAge")}</p>
                    </div>
                </div>

                {/* Detailed remaining time with progress */}
                {!data.is_retired && data.days_to_retirement > 0 && (
                    <div className="p-3 bg-white/40 dark:bg-white/5 rounded-lg">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-muted-foreground">{t("retirement.detailedRemaining")}</span>
                            <span className="font-medium text-foreground">
                                {yearsToRetirement} {t("retirement.years")} · {monthsToRetirement} {t("retirement.months")} · {remainingDays} {t("retirement.days")}
                            </span>
                        </div>
                        <Progress value={progressPercent} className={`h-2 ${colors.bar}`} />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>0 {t("retirement.years")}</span>
                            <span>{Math.round(progressPercent)}%</span>
                            <span>32 {t("retirement.years")}</span>
                        </div>
                    </div>
                )}

                {/* Expected retirement date */}
                {!data.is_retired && (
                    <div className="flex items-center justify-between pt-2 border-t border-white/40">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Sun className="h-4 w-4" />
                            <span>{t("retirement.expectedDate")}</span>
                        </div>
                        <p className="font-bold text-lg">
                            {format(new Date(data.retirement_date), 'dd MMMM yyyy', { locale: arDZ })}
                        </p>
                    </div>
                )}

                {/* Approaching warning */}
                {data.days_to_retirement <= 365 && !data.is_retired && (
                    <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg text-sm border border-amber-200/50">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{t("retirement.approaching")}</span>
                    </div>
                )}

                {/* Retired message */}
                {data.is_retired && (
                    <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-200/50">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span>{t("retirement.retiredDate")}: {format(new Date(data.retirement_date), 'dd MMMM yyyy', { locale: arDZ })}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default RetirementInfo;
