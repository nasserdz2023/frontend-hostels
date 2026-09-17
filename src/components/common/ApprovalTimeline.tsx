"use client";

import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import { ar, fr } from "date-fns/locale";
import { CheckCircle, Clock, MessageSquare, User, XCircle, AlertCircle, ArrowRightCircle, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface TimelineEvent {
    id: string;
    status: string; // "APPROVED", "REJECTED", "PENDING", "RESERVATION", "STATUS_CHANGE", etc.
    level: string; // "DEPARTMENT", "DIRECTOR", "INSTITUTION", etc.
    actorName?: string;
    date?: string | Date;
    comments?: string;
    titleKey?: string; // Optional override for the timeline title
}

interface ApprovalTimelineProps {
    events: TimelineEvent[];
    title?: string;
    className?: string;
}

export function ApprovalTimeline({ events, title, className }: ApprovalTimelineProps) {
    const t = useTranslations("common.approvals"); // We might need to add these translations
    const locale = useLocale();
    const dateLocale = locale === "ar" ? ar : fr;

    if (!events || events.length === 0) return null;

    const getStatusIcon = (status: string) => {
        const s = status.toUpperCase();
        if (s === "SUBMITTED") {
            return <FileText className="w-5 h-5 text-blue-500" />;
        }
        if (s.includes("APPROVE") || s === "PUBLISHED" || s === "COMPLETED" || s === "DELIVERED" || s === "READY") {
            return <CheckCircle className="w-5 h-5 text-green-500" />;
        }
        if (s.includes("REJECT") || s === "CANCELLED") {
            return <XCircle className="w-5 h-5 text-red-500" />;
        }
        if (s === "RESERVATION" || s.includes("CHANGE_REQUEST")) {
            return <AlertCircle className="w-5 h-5 text-orange-500" />;
        }
        if (s === "STATUS_CHANGE" || s === "PROCESSING") {
            return <ArrowRightCircle className="w-5 h-5 text-blue-500" />;
        }
        // Default PENDING
        return <Clock className="w-5 h-5 text-yellow-500" />;
    };

    const getStatusColor = (status: string) => {
        const s = status.toUpperCase();
        if (s.includes("APPROVE") || s === "PUBLISHED" || s === "DELIVERED" || s === "READY") return "text-green-700 dark:text-green-400";
        if (s.includes("REJECT") || s === "CANCELLED") return "text-red-700 dark:text-red-400";
        if (s === "RESERVATION") return "text-orange-700 dark:text-orange-400";
        if (s === "SUBMITTED" || s === "PROCESSING") return "text-blue-700 dark:text-blue-400";
        return "text-foreground";
    };

    return (
        <Card className={cn("mt-6", className)}>
            <CardHeader className="pb-2">
                <CardTitle>{title || t("timelineTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-0 relative">
                    {/* Continuous Vertical Line */}
                    <div className="absolute top-2 bottom-6 left-[19px] w-0.5 bg-gray-200 dark:bg-gray-800 z-0" dir="ltr" />

                    {[...events].sort((a, b) => {
                        const dateA = a.date ? new Date(a.date).getTime() : 0;
                        const dateB = b.date ? new Date(b.date).getTime() : 0;
                        return dateA - dateB;
                    }).map((event, index, array) => {
                        const isLast = index === array.length - 1;
                        return (
                            <div key={event.id} className="relative flex items-start gap-4 pb-8 last:pb-0">
                                {/* Icon Marker */}
                                <div className="relative z-10 flex items-center justify-center shrink-0">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center border-2 bg-background",
                                        getStatusColor(event.status).replace("text-", "border-").replace("dark:text-", "dark:border-")
                                    )}>
                                        {getStatusIcon(event.status)}
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0 pt-1">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                        <h4 className={cn("font-bold text-base", getStatusColor(event.status))}>
                                            {event.titleKey ? t(event.titleKey) : (
                                                <>
                                                    {t(`levels.${event.level}`, { defaultValue: event.level })}
                                                    <span className="text-xs font-normal text-muted-foreground mx-2 px-2 py-0.5 rounded-full bg-secondary">
                                                        {t(`status.${event.status}`, { defaultValue: event.status })}
                                                    </span>
                                                </>
                                            )}
                                        </h4>
                                        {event.date && (
                                            <time className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {format(new Date(event.date), "dd MMM yyyy, HH:mm", { locale: dateLocale })}
                                            </time>
                                        )}
                                    </div>

                                    {event.actorName && (
                                        <div className="flex items-center gap-2 mt-1.5 text-sm text-foreground/80 font-medium">
                                            <User className="w-4 h-4 text-muted-foreground" />
                                            <span>{event.actorName}</span>
                                        </div>
                                    )}

                                    {event.comments && (
                                        <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm border border-border/50 shadow-sm">
                                            <div className="flex items-start gap-2">
                                                <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                                                <p className="whitespace-pre-wrap leading-relaxed">{event.comments}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
