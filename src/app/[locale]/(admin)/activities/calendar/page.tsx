"use client";

import { useState, useEffect, use } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Calendar as CalendarIcon,
    Loader2,
    Clock,
    MapPin,
} from "lucide-react";
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    getDay,
    isToday,
} from "date-fns";
import { ar } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
    activitiesApi,
    ActivityListItem,
    ACTIVITY_STATUS_LABELS,
} from "@/lib/api/activities";

export default function ActivitiesCalendarPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = use(params);
    const t = useTranslations("activities");
    const router = useRouter();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [activities, setActivities] = useState<ActivityListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    useEffect(() => {
        loadActivities();
    }, [currentDate]);

    const loadActivities = async () => {
        try {
            setIsLoading(true);
            const response = await activitiesApi.getActivities({ size: 100 });
            setActivities(response.items);
        } catch (error) {
            console.error("Failed to load activities:", error);
            toast.error("فشل في تحميل الأنشطة");
        } finally {
            setIsLoading(false);
        }
    };

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Get padding days for the start of the month
    const startDayOfWeek = getDay(monthStart);
    // Adjust for Saturday as the first day of the week in Arabic calendar
    const paddingDays = startDayOfWeek === 6 ? 0 : startDayOfWeek + 1;

    const getActivitiesForDate = (date: Date) => {
        return activities.filter((activity) => {
            if (!activity.start_date) return false;
            return isSameDay(new Date(activity.start_date), date);
        });
    };

    const selectedDayActivities = selectedDate ? getActivitiesForDate(selectedDate) : [];

    const weekDays = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <CalendarIcon className="w-6 h-6" />
                        {t("nav.calendar")}
                    </h1>
                    <p className="text-gray-500">{t("list.subtitle")}</p>
                </div>
                <Button onClick={() => router.push(`/${locale}/activities/new`)}>
                    <Plus className="w-4 h-4 me-2" />
                    {t("list.add")}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                            <CardTitle>
                                {format(currentDate, "MMMM yyyy", { locale: ar })}
                            </CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin" />
                            </div>
                        ) : (
                            <>
                                {/* Week Days Header */}
                                <div className="grid grid-cols-7 mb-2">
                                    {weekDays.map((day) => (
                                        <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar Grid */}
                                <div className="grid grid-cols-7 gap-1">
                                    {/* Padding days */}
                                    {Array.from({ length: paddingDays }).map((_, i) => (
                                        <div key={`padding-${i}`} className="h-24 border rounded-lg bg-gray-50" />
                                    ))}

                                    {/* Actual days */}
                                    {daysInMonth.map((day) => {
                                        const dayActivities = getActivitiesForDate(day);
                                        const isSelected = selectedDate && isSameDay(selectedDate, day);

                                        return (
                                            <div
                                                key={day.toISOString()}
                                                className={cn(
                                                    "h-24 border rounded-lg p-1 cursor-pointer transition-colors overflow-hidden",
                                                    isToday(day) && "border-primary border-2",
                                                    isSelected && "bg-primary/5 border-primary",
                                                    !isSameMonth(day, currentDate) && "opacity-50",
                                                    "hover:bg-gray-50"
                                                )}
                                                onClick={() => setSelectedDate(day)}
                                            >
                                                <div className="text-sm font-medium mb-1">
                                                    {format(day, "d")}
                                                </div>
                                                <div className="space-y-0.5">
                                                    {dayActivities.slice(0, 2).map((activity) => (
                                                        <div
                                                            key={activity.id}
                                                            className="text-xs bg-primary/10 text-primary rounded px-1 py-0.5 truncate"
                                                        >
                                                            {activity.title_ar}
                                                        </div>
                                                    ))}
                                                    {dayActivities.length > 2 && (
                                                        <div className="text-xs text-gray-500 px-1">
                                                            +{dayActivities.length - 2} أخرى
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Selected Day Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {selectedDate
                                ? format(selectedDate, "EEEE dd MMMM", { locale: ar })
                                : "اختر يوماً"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!selectedDate ? (
                            <div className="text-center py-8 text-gray-500">
                                <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>اختر يوماً لعرض الأنشطة</p>
                            </div>
                        ) : selectedDayActivities.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>لا توجد أنشطة في هذا اليوم</p>
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    onClick={() => router.push(`/${locale}/activities/new`)}
                                >
                                    <Plus className="w-4 h-4 me-2" />
                                    إضافة نشاط
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {selectedDayActivities.map((activity) => (
                                    <div
                                        key={activity.id}
                                        className="p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                                        onClick={() => router.push(`/${locale}/activities/${activity.id}`)}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="font-semibold">{activity.title_ar}</h3>
                                            <Badge className="text-xs">
                                                {ACTIVITY_STATUS_LABELS[activity.status]?.ar}
                                            </Badge>
                                        </div>
                                        <div className="space-y-1 text-sm text-gray-500">
                                            <p className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {format(new Date(activity.start_date!), "HH:mm")}
                                            </p>
                                            {activity.institution && (
                                                <p className="flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" />
                                                    {activity.institution.name_ar}
                                                </p>
                                            )}
                                        </div>
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="text-xs text-gray-400">
                                                {activity.category?.name_ar}
                                            </span>
                                            <span className="text-xs">
                                                {activity.registrations_count}/{activity.max_participants || "∞"} مسجل
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
