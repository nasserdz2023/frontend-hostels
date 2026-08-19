"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
    Plus, Calendar, FileText, Trash2, Pencil, Upload, Download, X,
    UserPlus, BadgeCheck, ArrowUp, ArrowRightLeft,
    Briefcase, ChevronUp, GitBranch, ToggleLeft,
    Sunset, LogOut, AlertTriangle, Stamp, Scale,
    Building2, CalendarCheck
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

import {
    careerApi,
    CareerEvent,
    EVENT_TYPE_LABELS,
    EVENT_TYPE_ICONS,
    EVENT_TYPE_COLORS
} from "@/lib/api/career";

// Lucide icon map
const EVENT_LUCIDE_ICONS: Record<string, React.ElementType> = {
    HIRE: UserPlus,
    CONFIRMATION: BadgeCheck,
    PROMOTION: ArrowUp,
    TRANSFER: ArrowRightLeft,
    POSITION_CHANGE: Briefcase,
    GRADE_CHANGE: ChevronUp,
    DEPARTMENT_CHANGE: GitBranch,
    STATUS_CHANGE: ToggleLeft,
    RETIREMENT: Sunset,
    END_OF_SERVICE: LogOut,
};

// Algerian Month Names
const ALGERIAN_MONTHS = [
    "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
    "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

const formatDateDZ = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = d.getDate();
    const month = ALGERIAN_MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
};


interface CareerTimelineProps {
    employeeId: string;
    canEdit?: boolean;
    /** يُستدعى بعد إنشاء/تعديل/حذف حدث لتحديث بيانات الموظف في الصفحة الأم */
    onEventChange?: () => void;
}

export function CareerTimeline({ employeeId, canEdit = false, onEventChange }: CareerTimelineProps) {
    const t = useTranslations("hr");
    const router = useRouter();
    const [events, setEvents] = useState<CareerEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [uploading, setUploading] = useState<string | null>(null);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const data = await careerApi.getCareerHistory(employeeId);
            setEvents(data);
        } catch (error) {
            toast.error(t("career.loadError"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (employeeId) {
            fetchHistory();
        }
    }, [employeeId]);

    const handleDelete = async (eventId: string) => {
        try {
            await careerApi.deleteCareerEvent(employeeId, eventId);
            toast.success(t("career.deleteSuccess"));
            setDeleteConfirm(null);
            fetchHistory();
            onEventChange?.();
        } catch (error) {
            toast.error(t("career.deleteError"));
        }
    };

    const handleUploadDocument = async (eventId: string, file: File) => {
        if (file.size > 10 * 1024 * 1024) {
            toast.error(t("career.fileTooLarge"));
            return;
        }
        try {
            setUploading(eventId);
            await careerApi.uploadDocument(employeeId, eventId, file);
            toast.success(t("career.uploadSuccess"));
            fetchHistory();
            onEventChange?.();
        } catch (error) {
            toast.error(t("career.uploadError"));
        } finally {
            setUploading(null);
        }
    };

    const handleDeleteDocument = async (eventId: string) => {
        try {
            await careerApi.deleteDocument(employeeId, eventId);
            toast.success(t("career.deleteDocumentSuccess"));
            fetchHistory();
            onEventChange?.();
        } catch (error) {
            toast.error(t("career.deleteDocumentError"));
        }
    };

    const getEventDescription = (event: CareerEvent): string => {
        const parts: string[] = [];

        switch (event.event_type) {
            case 'GRADE_CHANGE':
                if (event.old_grade && event.new_grade) {
                    parts.push(`${t("career.from")} "${event.old_grade.name_ar}" ${t("career.to")} "${event.new_grade.name_ar}"`);
                } else if (event.new_grade) {
                    parts.push(`${t("career.to")} "${event.new_grade.name_ar}"`);
                }
                break;

            case 'POSITION_CHANGE':
                if (event.old_position && event.new_position) {
                    parts.push(`${t("career.from")} "${event.old_position.name_ar}" ${t("career.to")} "${event.new_position.name_ar}"`);
                } else if (event.new_position) {
                    parts.push(`${t("career.to")} "${event.new_position.name_ar}"`);
                }
                break;

            case 'TRANSFER':
            case 'DEPARTMENT_CHANGE':
                if (event.old_institution && event.new_institution) {
                    parts.push(`${t("career.from")} "${event.old_institution.name_ar}" ${t("career.to")} "${event.new_institution.name_ar}"`);
                } else if (event.old_department && event.new_department) {
                    parts.push(`${t("career.from")} "${event.old_department.name_ar}" ${t("career.to")} "${event.new_department.name_ar}"`);
                }
                break;

            case 'STATUS_CHANGE':
                if (event.old_status && event.new_status) {
                    parts.push(`${t("career.from")} "${event.old_status}" ${t("career.to")} "${event.new_status}"`);
                }
                break;

            case 'HIRE':
                if (event.new_grade) {
                    parts.push(`${t("career.newGrade")}: "${event.new_grade.name_ar}"`);
                }
                if (event.new_institution) {
                    parts.push(t("career.newInstitution") + `: "${event.new_institution.name_ar}"`);
                }
                break;

            case 'PROMOTION':
                if (event.new_grade) {
                    parts.push(`${t("career.to")} "${event.new_grade.name_ar}"`);
                }
                break;

            case 'CONFIRMATION':
                parts.push(t("career.descriptions.CONFIRMATION"));
                break;

            case 'RETIREMENT':
                parts.push(t("career.descriptions.RETIREMENT"));
                break;

            case 'END_OF_SERVICE':
                parts.push(t("career.descriptions.END_OF_SERVICE"));
                break;
        }

        return parts.join(' ');
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-2/3" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">{t("career.title")}</CardTitle>
                {canEdit && (
                    <Button size="sm" variant="outline" onClick={() => router.push(`/employees/${employeeId}/career`)}>
                        <Plus className="h-4 w-4 me-1" />
                        {t("career.addEvent")}
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {/* Delete confirmation dialog */}
                <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                    <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                            <DialogTitle>{t("career.deleteEvent")}</DialogTitle>
                        </DialogHeader>
                        <p className="text-muted-foreground">
                            {t("career.confirmDelete")}
                        </p>
                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                                {t("career.cancel")}
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                            >
                                {t("career.deleteEvent")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {events.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>{t("career.noEvents")}</p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute top-0 bottom-0 start-5 w-0.5 bg-muted" />

                        {/* Events */}
                        <div className="space-y-6">
                            {events.map((event) => {
                                const IconComponent = EVENT_LUCIDE_ICONS[event.event_type] || Calendar;
                                return (
                                    <div key={event.id} className="relative flex gap-4 group">
                                        {/* Circle indicator */}
                                        <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full text-white ${EVENT_TYPE_COLORS[event.event_type] || 'bg-gray-500'}`}>
                                            <IconComponent className="h-5 w-5" />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 pb-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold">
                                                    {t(`career.eventTypes.${event.event_type}`) || EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    {event.event_date && formatDateDZ(event.event_date)}
                                                </span>
                                                {canEdit && (
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ms-auto">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => router.push(`/employees/${employeeId}/career/${event.id}/edit`)}
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => setDeleteConfirm(event.id)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Description */}
                                            {getEventDescription(event) && (
                                                <p className="text-sm text-muted-foreground">
                                                    {getEventDescription(event)}
                                                </p>
                                            )}

                                            {/* Document reference */}
                                            {event.document_reference && (
                                                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                                    <FileText className="h-3 w-3" />
                                                    <span>{event.document_reference}</span>
                                                </div>
                                            )}

                                            {/* Notes */}
                                            {event.notes && (
                                                <p className="text-sm text-muted-foreground mt-1 italic">
                                                    {event.notes}
                                                </p>
                                            )}

                                            {/* Legal info section */}
                                            {(event.controller_visa || event.legal_basis || event.issuing_authority || event.decision_date) && (
                                                <div className="mt-2 p-2 bg-muted/30 rounded-md border border-border/50">
                                                    {event.controller_visa && (
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                                                            <Stamp className="h-3 w-3 flex-shrink-0" />
                                                            <span>{t("career.controllerVisa")}: {event.controller_visa}</span>
                                                        </div>
                                                    )}
                                                    {event.legal_basis && (
                                                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                            <Scale className="h-3 w-3 flex-shrink-0" />
                                                            <span><span className="font-medium">{t("career.legalBasis")}:</span> {event.legal_basis}</span>
                                                        </div>
                                                    )}
                                                    {event.issuing_authority && (
                                                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                            <Building2 className="h-3 w-3 flex-shrink-0" />
                                                            <span><span className="font-medium">{t("career.issuingAuthority")}:</span> {event.issuing_authority}</span>
                                                        </div>
                                                    )}
                                                    {event.decision_date && (
                                                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                            <CalendarCheck className="h-3 w-3 flex-shrink-0" />
                                                            <span><span className="font-medium">{t("career.decisionDate")}:</span> {formatDateDZ(event.decision_date)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Document Attachment */}
                                            {event.document_path && (
                                                <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-dashed">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <FileText className="h-4 w-4 shrink-0 text-primary" />
                                                            <span className="text-sm truncate">{event.document_filename || 'ملف القرار'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <a
                                                                href={`/storage/${event.document_path}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-md hover:bg-primary/5"
                                                            >
                                                                <Download className="h-3.5 w-3.5" />
                                                                <span className="hidden sm:inline">{t('career.download')}</span>
                                                            </a>
                                                            {canEdit && (
                                                                <button
                                                                    onClick={() => handleDeleteDocument(event.id)}
                                                                    className="inline-flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors px-2 py-1 rounded-md hover:bg-destructive/5"
                                                                >
                                                                    <X className="h-3.5 w-3.5" />
                                                                    <span className="hidden sm:inline">{t('career.deleteDocument')}</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Upload Document Button */}
                                            {!event.document_path && canEdit && (
                                                <div className="mt-3">
                                                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md border border-dashed hover:border-primary/30">
                                                        <Upload className="h-3.5 w-3.5" />
                                                        <span>{t('career.uploadDocument')}</span>
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleUploadDocument(event.id, file);
                                                            }}
                                                        />
                                                    </label>
                                                </div>
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

export default CareerTimeline;
