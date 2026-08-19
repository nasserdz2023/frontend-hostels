"use client";

import { useEffect, useState, use } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    UserPlus,
    BadgeCheck,
    ArrowUp,
    ArrowRightLeft,
    Briefcase,
    ChevronUp,
    GitBranch,
    ToggleLeft,
    Sunset,
    LogOut,
    Calendar,
    FileText,
    Scale,
    Building2,
    Stamp,
    CalendarCheck,
    AlertTriangle,
    Pencil,
    Trash2,
    Upload,
    X,
    Download,
    Plus,
    ArrowRight,
    ArrowLeft,
    Loader2,
    Route,
    History
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

import {
    careerApi,
    CareerEvent,
    EVENT_TYPE_LABELS,
    EVENT_TYPE_COLORS,
} from "@/lib/api/career";
import { employeesApi, Employee } from "@/lib/api/employees";

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

export default function EmployeeCareerPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = use(params);
    const t = useTranslations("hr");
    const router = useRouter();

    // Data state
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [events, setEvents] = useState<CareerEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dialog state (delete only)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [uploading, setUploading] = useState<string | null>(null);

    const fetchHistory = async () => {
        try {
            setError(null);
            const [emp, careerData] = await Promise.all([
                employeesApi.getById(id),
                careerApi.getCareerHistory(id)
            ]);
            setEmployee(emp);
            setEvents(careerData);
        } catch (err) {
            toast.error(t("career.loadError"));
            setError(t("career.loadError"));
        }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);

                const [emp, careerData] = await Promise.all([
                    employeesApi.getById(id),
                    careerApi.getCareerHistory(id)
                ]);

                setEmployee(emp);
                setEvents(careerData);
            } catch (err) {
                setError(t("career.loadError"));
                toast.error(t("career.loadError"));
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            loadData();
        }
    }, [id, t]);

    const handleDelete = async (eventId: string) => {
        try {
            await careerApi.deleteCareerEvent(id, eventId);
            toast.success(t("career.deleteSuccess"));
            setDeleteConfirm(null);
            fetchHistory();
        } catch (err) {
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
            await careerApi.uploadDocument(id, eventId, file);
            toast.success(t("career.uploadSuccess"));
            fetchHistory();
        } catch (err) {
            toast.error(t("career.uploadError"));
        } finally {
            setUploading(null);
        }
    };

    const handleDeleteDocument = async (eventId: string) => {
        try {
            await careerApi.deleteDocument(id, eventId);
            toast.success(t("career.deleteDocumentSuccess"));
            fetchHistory();
        } catch (err) {
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

    // ---------- Loading State ----------
    if (loading) {
        return (
            <div className="container mx-auto py-8 px-4 max-w-5xl">
                <div className="flex items-center gap-4 mb-8">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-9 w-28" />
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-5 w-36" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex gap-4">
                                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-1/3" />
                                        <Skeleton className="h-3 w-2/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ---------- Error State ----------
    if (error && !employee) {
        return (
            <div className="container mx-auto py-8 px-4 max-w-5xl">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        {locale === 'ar' ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
                    </button>
                    <h1 className="text-2xl font-bold">{t("career.title")}</h1>
                </div>
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive/70" />
                            <p className="text-lg font-medium text-destructive mb-2">
                                {t("career.loadError")}
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => window.location.reload()}
                            >
                                إعادة المحاولة
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const employeeName = employee ? `${employee.firstname_ar} ${employee.lastname_ar}` : '';

    return (
        <div className="container mx-auto py-8 px-4 max-w-5xl">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push(`/${locale}/employees/${id}`)}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        {locale === 'ar' ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <History className="h-6 w-6 text-primary" />
                            {t("career.title")}
                        </h1>
                        {employee && (
                            <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
                                <Route className="h-4 w-4" />
                                {employeeName}
                            </p>
                        )}
                    </div>
                </div>
                <Button
                    onClick={() => router.push(`/${locale}/employees/${id}/career/new`)}
                    size="sm"
                >
                    <Plus className="h-4 w-4 me-1" />
                    {t("career.addEvent")}
                </Button>
            </div>

            {/* Timeline Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">{t("career.title")}</CardTitle>
                    <span className="text-sm text-muted-foreground">
                        {events.length > 0 && t("career.totalEvents") + `: ${events.length}`}
                    </span>
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

                    {/* Empty State */}
                    {events.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Calendar className="h-16 w-16 mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium mb-1">{t("career.noEvents")}</p>
                            <p className="text-sm mb-6">
                                {t("career.addEvent")}
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => router.push(`/${locale}/employees/${id}/career/new`)}
                            >
                                <Plus className="h-4 w-4 me-1" />
                                {t("career.addEvent")}
                            </Button>
                        </div>
                    ) : (
                        /* Timeline */
                        <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute top-0 bottom-0 start-5 w-0.5 bg-muted" />

                            <div className="space-y-6">
                                {events.map((event) => {
                                    const IconComponent = EVENT_LUCIDE_ICONS[event.event_type] || Calendar;
                                    return (
                                        <div key={event.id} className="relative flex gap-4 group">
                                            {/* Circle indicator */}
                                            <div
                                                className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full text-white shrink-0 ${EVENT_TYPE_COLORS[event.event_type] || 'bg-gray-500'
                                                    }`}
                                            >
                                                <IconComponent className="h-5 w-5" />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 pb-4 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <span className="font-semibold">
                                                        {t(`career.eventTypes.${event.event_type}`) || EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                                                    </span>
                                                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                                                        {event.event_date && formatDateDZ(event.event_date)}
                                                    </span>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ms-auto">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => router.push(`/${locale}/employees/${id}/career/${event.id}/edit`)}
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
                                                        <FileText className="h-3 w-3 shrink-0" />
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
                                                                <Stamp className="h-3 w-3 shrink-0" />
                                                                <span>{t("career.controllerVisa")}: {event.controller_visa}</span>
                                                            </div>
                                                        )}
                                                        {event.legal_basis && (
                                                            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                <Scale className="h-3 w-3 shrink-0" />
                                                                <span><span className="font-medium">{t("career.legalBasis")}:</span> {event.legal_basis}</span>
                                                            </div>
                                                        )}
                                                        {event.issuing_authority && (
                                                            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                <Building2 className="h-3 w-3 shrink-0" />
                                                                <span><span className="font-medium">{t("career.issuingAuthority")}:</span> {event.issuing_authority}</span>
                                                            </div>
                                                        )}
                                                        {event.decision_date && (
                                                            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                <CalendarCheck className="h-3 w-3 shrink-0" />
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
                                                                <span className="text-sm truncate">{event.document_filename || t("career.document")}</span>
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
                                                                <button
                                                                    onClick={() => handleDeleteDocument(event.id)}
                                                                    className="inline-flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors px-2 py-1 rounded-md hover:bg-destructive/5"
                                                                >
                                                                    <X className="h-3.5 w-3.5" />
                                                                    <span className="hidden sm:inline">{t('career.deleteDocument')}</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Upload Document Button */}
                                                {!event.document_path && (
                                                    <div className="mt-3">
                                                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md border border-dashed hover:border-primary/30">
                                                            {uploading === event.id ? (
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            ) : (
                                                                <Upload className="h-3.5 w-3.5" />
                                                            )}
                                                            <span>{t('career.uploadDocument')}</span>
                                                            <input
                                                                type="file"
                                                                className="hidden"
                                                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                                                disabled={uploading === event.id}
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) handleUploadDocument(event.id, file);
                                                                    e.target.value = '';
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
        </div>
    );
}
