"use client";

import React, { useState, useEffect, use, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    ArrowRight, CheckCircle, XCircle, MoreHorizontal, Users, Loader2,
    Mail, Phone, Calendar, Search, Download, Trash2, RefreshCw, Clock,
    UserCheck, UserX, FileSpreadsheet,
} from "lucide-react";
import { format } from "date-fns";
import type { Locale } from "date-fns";
import { ar, enUS, fr } from "date-fns/locale";

import { useAuthStore } from "@/lib/stores/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
    activitiesApi, Activity, Registration, RegistrationStatus, REGISTRATION_STATUS_LABELS,
} from "@/lib/api/activities";

const CUSTOM_FIELD_LABELS: Record<string, string> = {
    municipality: "البلدية",
    education_level: "المستوى التعليمي",
    educationLevel: "المستوى التعليمي",
    nearest_institution: "أقرب مؤسسة",
    nearestInstitution: "أقرب مؤسسة",
    interests: "المواهب / الاهتمامات",
    pass_id: "رقم المشاركة",
    passId: "رقم المشاركة",
    email: "البريد الإلكتروني",
    school: "المدرسة",
    club: "النادي",
    team: "الفريق",
    category: "الفئة",
    level: "المستوى",
    position: "المنصب",
    specialization: "التخصص",
    experience: "الخبرة",
    notes: "ملاحظات",
};

const STATUS_BADGE_CLASSES: Record<RegistrationStatus, string> = {
    [RegistrationStatus.PENDING]: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/50 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
    [RegistrationStatus.APPROVED]: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
    [RegistrationStatus.REJECTED]: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/50 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
    [RegistrationStatus.CANCELLED]: "bg-muted text-muted-foreground ring-1 ring-border/50",
};

const STAT_ICONS: Record<string, React.ElementType> = {
    total: Users,
    pending: Clock,
    approved: UserCheck,
    rejected: UserX,
};

const STAT_COLORS: Record<string, { icon: string; value: string; bg: string }> = {
    total: { icon: "text-primary", value: "text-primary", bg: "bg-primary/10" },
    pending: { icon: "text-amber-600", value: "text-amber-600", bg: "bg-amber-500/10" },
    approved: { icon: "text-emerald-600", value: "text-emerald-600", bg: "bg-emerald-500/10" },
    rejected: { icon: "text-rose-600", value: "text-rose-600", bg: "bg-rose-500/10" },
};

const RegistrationsStats = React.memo(function RegistrationsStats({
    total, pending, approved, rejected,
}: {
    total: number; pending: number; approved: number; rejected: number;
}) {
    const t = useTranslations("activities");

    const items = [
        { key: "total", label: t("registrations.total"), value: total },
        { key: "pending", label: t("registrations.pending"), value: pending },
        { key: "approved", label: t("registrations.approved"), value: approved },
        { key: "rejected", label: t("registrations.rejected"), value: rejected },
    ] as const;

    return (
        <div className="flex items-stretch bg-card rounded-xl border shadow-sm overflow-hidden mb-6">
            {items.map((item, idx) => {
                const Icon = STAT_ICONS[item.key];
                const colors = STAT_COLORS[item.key];
                return (
                    <React.Fragment key={item.key}>
                        {idx > 0 && <div className="w-px bg-border shrink-0" />}
                        <div className="flex-1 flex items-center gap-3 px-5 py-4 min-w-0">
                            <div className={`shrink-0 w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center`}>
                                <Icon className={`w-4.5 h-4.5 ${colors.icon}`} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground font-medium tracking-wide truncate">
                                    {item.label}
                                </p>
                                <p className={`text-xl font-bold tabular-nums ${colors.value}`}>
                                    {item.value}
                                </p>
                            </div>
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
});

function getErrorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === "object") {
        const err = error as { response?: { data?: { detail?: string } }; message?: string };
        return err.response?.data?.detail || err.message || fallback;
    }
    return fallback;
}

function getStatusLabel(status: RegistrationStatus, t: ReturnType<typeof useTranslations>): string {
    switch (status) {
        case RegistrationStatus.PENDING: return t("registrations.pending");
        case RegistrationStatus.APPROVED: return t("registrations.approved");
        case RegistrationStatus.REJECTED: return t("registrations.rejected");
        case RegistrationStatus.CANCELLED: return t("registrations.cancelled");
    }
}

function getPaymentLabel(paymentStatus: string, t: ReturnType<typeof useTranslations>): string {
    switch (paymentStatus) {
        case "EXEMPT": return t("payment.exempt");
        case "PAID": return t("payment.paid");
        default: return t("payment.pending");
    }
}

const DATE_LOCALES: Record<string, Locale> = { ar, en: enUS, fr };

const ActivityRegistrationsPage = React.memo(function ActivityRegistrationsPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = use(params);
    const t = useTranslations("activities");
    const router = useRouter();
    const hasPermission = useAuthStore((state) => state.hasPermission);

    const [activity, setActivity] = useState<Activity | null>(null);
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<string>("all");
    const [isSyncing, setIsSyncing] = useState(false);
    const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false);
    const [urlInput, setUrlInput] = useState("");

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [activityData, registrationsData] = await Promise.all([
                activitiesApi.getActivityById(id),
                activitiesApi.getActivityRegistrations(id),
            ]);
            setActivity(activityData);

            const normalized = registrationsData.map((reg: Registration) => {
                if (reg.custom_data && typeof reg.custom_data === "object") {
                    const normalizedData = { ...reg.custom_data };
                    if ("educationLevel" in normalizedData) {
                        normalizedData.education_level = normalizedData.educationLevel;
                        delete normalizedData.educationLevel;
                    }
                    if ("nearestInstitution" in normalizedData) {
                        normalizedData.nearest_institution = normalizedData.nearestInstitution;
                        delete normalizedData.nearestInstitution;
                    }
                    if ("passId" in normalizedData) {
                        normalizedData.pass_id = normalizedData.passId;
                        delete normalizedData.passId;
                    }
                    return { ...reg, custom_data: normalizedData };
                }
                return reg;
            });

            setRegistrations(normalized);
        } catch (error: unknown) {
            console.error("Failed to load data:", error);
            toast.error(getErrorMessage(error, t("messages.error_loading_data")));
        } finally {
            setIsLoading(false);
        }
    }, [id, t]);

    useEffect(() => { loadData(); }, [loadData]);

    const dateLocale = useMemo(() => DATE_LOCALES[locale] || ar, [locale]);

    const customDataKeys = useMemo(() => {
        const keySet = new Set<string>();
        registrations.forEach((reg) => {
            if (reg.custom_data && typeof reg.custom_data === "object") {
                Object.keys(reg.custom_data).forEach((key) => keySet.add(key));
            }
        });
        keySet.delete("email");
        keySet.delete("source");
        return Array.from(keySet);
    }, [registrations]);

    const pendingCount = useMemo(
        () => registrations.filter((r) => r.status === RegistrationStatus.PENDING).length,
        [registrations],
    );
    const approvedCount = useMemo(
        () => registrations.filter((r) => r.status === RegistrationStatus.APPROVED).length,
        [registrations],
    );
    const rejectedCount = useMemo(
        () => registrations.filter((r) => r.status === RegistrationStatus.REJECTED).length,
        [registrations],
    );

    const doSync = useCallback(async () => {
        setIsSyncing(true);
        toast.loading(t("registrations.sync_loading"), { id: "sync" });
        try {
            const result = await activitiesApi.syncGoogleSheets(id);
            toast.success(result.message, { id: "sync" });
            if (result.errors > 0) {
                console.warn("Sync errors:", result.details.filter((d) => d.error));
            }
            if (result.added > 0) loadData();
        } catch {
            toast.error(t("registrations.sync_failed"), { id: "sync" });
        } finally {
            setIsSyncing(false);
        }
    }, [id, t, loadData]);

    const handleSyncGoogleSheets = useCallback(() => {
        if (!activity?.google_sheets_sync_url) {
            setIsUrlDialogOpen(true);
            return;
        }
        doSync();
    }, [activity, doSync]);

    const handleSaveUrl = useCallback(async () => {
        if (!urlInput.trim()) return;
        try {
            await activitiesApi.updateActivity(id, { google_sheets_sync_url: urlInput.trim() });
            setActivity((prev) => prev ? { ...prev, google_sheets_sync_url: urlInput.trim() } : prev);
            setIsUrlDialogOpen(false);
            setUrlInput("");
            doSync();
        } catch {
            toast.error(t("registrations.sync_save_error"));
        }
    }, [id, urlInput, doSync, t]);

    const handleApprove = useCallback(async (registrationId: string) => {
        try {
            await activitiesApi.updateRegistration(registrationId, { status: RegistrationStatus.APPROVED });
            toast.success(t("registrations.approve_success"));
            loadData();
        } catch {
            toast.error(t("registrations.approve_error"));
        }
    }, [loadData, t]);

    const handleReject = useCallback(async (registrationId: string) => {
        try {
            await activitiesApi.updateRegistration(registrationId, { status: RegistrationStatus.REJECTED });
            toast.success(t("registrations.reject_success"));
            loadData();
        } catch {
            toast.error(t("registrations.reject_error"));
        }
    }, [loadData, t]);

    const handleCancel = useCallback(async (registrationId: string) => {
        try {
            await activitiesApi.softDeleteRegistration(registrationId);
            toast.success(t("registrations.cancel_success"));
            loadData();
        } catch {
            toast.error(t("registrations.cancel_error"));
        }
    }, [loadData, t]);

    const handleDelete = useCallback(async (registrationId: string) => {
        if (!window.confirm(t("registrations.confirm_delete"))) return;
        try {
            await activitiesApi.deleteRegistration(registrationId);
            toast.success(t("registrations.delete_success"));
            loadData();
        } catch {
            toast.error(t("registrations.delete_error"));
        }
    }, [loadData, t]);

    const filteredRegistrations = useMemo(() => {
        return registrations.filter((reg) => {
            const q = searchQuery.toLowerCase();
            const matchesSearch =
                !searchQuery ||
                reg.participant?.firstname_ar?.toLowerCase().includes(q) ||
                reg.participant?.lastname_ar?.toLowerCase().includes(q) ||
                reg.participant?.phone?.includes(searchQuery) ||
                reg.participant?.email?.toLowerCase().includes(q) ||
                reg.participant?.address?.toLowerCase().includes(q) ||
                (reg.custom_data && Object.values(reg.custom_data).some(
                    (v) => typeof v === "string" && v.toLowerCase().includes(q),
                ));

            const matchesTab =
                activeTab === "all" ||
                (activeTab === "pending" && reg.status === RegistrationStatus.PENDING) ||
                (activeTab === "approved" && reg.status === RegistrationStatus.APPROVED) ||
                (activeTab === "rejected" && reg.status === RegistrationStatus.REJECTED);

            return matchesSearch && matchesTab;
        });
    }, [registrations, searchQuery, activeTab]);

    const handleExportCSV = useCallback(() => {
        const headers = [
            t("table.number"),
            t("registrants"),
            t("csv.header_name"),
            t("csv.header_lastname"),
            t("csv.header_birth_date"),
            t("csv.header_phone"),
            t("csv.header_email"),
            t("csv.header_address"),
            ...customDataKeys.map((k) => CUSTOM_FIELD_LABELS[k] || k),
            t("csv.header_registration_date"),
            t("csv.header_status"),
            t("csv.header_payment"),
        ];
        const rows = filteredRegistrations.map((reg, i) => [
            reg.custom_data?.pass_id || i + 1,
            `${reg.participant?.firstname_ar || ""} ${reg.participant?.lastname_ar || ""}`,
            reg.participant?.firstname_ar || "",
            reg.participant?.lastname_ar || "",
            reg.participant?.birth_date || "",
            reg.participant?.phone || "",
            reg.participant?.email || reg.custom_data?.email || "",
            reg.participant?.address || "",
            ...customDataKeys.map((k) => reg.custom_data?.[k]?.toString() || ""),
            reg.registration_date ? format(new Date(reg.registration_date), "yyyy-MM-dd") : "",
            REGISTRATION_STATUS_LABELS[reg.status]?.ar || reg.status,
            getPaymentLabel(reg.payment_status, t),
        ]);
        const csvContent = "\uFEFF" + [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `registrations_${activity?.code || id}.csv`;
        link.click();
    }, [filteredRegistrations, customDataKeys, activity, id, t]);

    if (isLoading) {
        return (
            <div className="p-6 space-y-6" role="status" aria-label={t("registrations.loading")}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-muted animate-pulse" />
                        <div className="space-y-2">
                            <div className="h-6 w-36 rounded-md bg-muted animate-pulse" />
                            <div className="h-4 w-64 rounded-md bg-muted/60 animate-pulse" />
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-24 rounded-xl border bg-card animate-pulse" />
                    ))}
                </div>
                <div className="rounded-xl border bg-card">
                    <div className="p-4 border-b">
                        <div className="h-5 w-24 rounded-md bg-muted animate-pulse" />
                    </div>
                    <div className="p-4 space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-12 rounded-lg bg-muted/40 animate-pulse" />
                        ))}
                    </div>
                </div>
                <span className="sr-only">{t("registrations.loading")}</span>
            </div>
        );
    }

    return (
        <div className="p-6">
            <Dialog open={isUrlDialogOpen} onOpenChange={setIsUrlDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("registrations.sync_google")}</DialogTitle>
                        <DialogDescription>{t("registrations.sync_prompt")}</DialogDescription>
                    </DialogHeader>
                    <Input
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://script.google.com/..."
                        dir="ltr"
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsUrlDialogOpen(false)}>
                            {t("actions.cancel")}
                        </Button>
                        <Button onClick={handleSaveUrl} disabled={!urlInput.trim()}>
                            {t("registrations.sync_save_url")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowRight className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{t("registrations.title")}</h1>
                        <p className="text-gray-500">{activity?.title_ar}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {hasPermission('activities', 'registrations.sync_google_sheets') && (
                        <Button variant="outline" size="sm" onClick={handleSyncGoogleSheets} disabled={isSyncing} className="gap-2">
                            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            {t("registrations.sync_google")}
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
                        <Download className="w-4 h-4" />
                        {t("registrations.export_csv")}
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <RegistrationsStats
                total={registrations.length}
                pending={pendingCount}
                approved={approvedCount}
                rejected={rejectedCount}
            />

            {/* Registrations Table */}
            <div className="relative rounded-xl border bg-card shadow-sm overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-primary/60 before:via-primary/30 before:to-transparent">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-5 py-4 border-b">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
                        <h2 className="text-sm font-medium text-foreground">{t("registrants")}</h2>
                        {customDataKeys.length > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                                {customDataKeys.length} {t("registrations.additional_fields")}
                            </Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                            {filteredRegistrations.length} {t("showing")} {registrations.length}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-none sm:w-56">
                            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                                placeholder={t("registrations.search")}
                                className="ps-8 h-9 text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Tabs + Table */}
                <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
                    <div className="px-5 pt-3 pb-1">
                        <TabsList className="w-full sm:w-auto justify-start overflow-x-auto h-auto p-0.5 gap-0 bg-muted/50">
                            <TabsTrigger value="all" className="text-xs px-3 py-1.5 data-[state=active]:shadow-sm">
                                {t("registrations.all")} <span className="ms-1 text-muted-foreground">{registrations.length}</span>
                            </TabsTrigger>
                            <TabsTrigger value="pending" className="text-xs px-3 py-1.5 data-[state=active]:shadow-sm">
                                {t("registrations.pending")} <span className="ms-1 text-amber-600">{pendingCount}</span>
                            </TabsTrigger>
                            <TabsTrigger value="approved" className="text-xs px-3 py-1.5 data-[state=active]:shadow-sm">
                                {t("registrations.approved")} <span className="ms-1 text-emerald-600">{approvedCount}</span>
                            </TabsTrigger>
                            <TabsTrigger value="rejected" className="text-xs px-3 py-1.5 data-[state=active]:shadow-sm">
                                {t("registrations.rejected")} <span className="ms-1 text-rose-600">{rejectedCount}</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value={activeTab} className="m-0">
                        {filteredRegistrations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 px-4">
                                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <Users className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <p className="text-sm font-medium text-foreground mb-1">
                                    {searchQuery ? t("registrations.no_results") : t("registrations.no_registrations")}
                                </p>
                                <p className="text-xs text-muted-foreground text-center max-w-xs">
                                    {searchQuery
                                        ? t("registrations.no_results_hint")
                                        : t("registrations.no_registrations_hint")}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto" dir="rtl">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-b-muted/50">
                                            <TableHead className="text-xs font-medium text-muted-foreground w-8">{t("table.number")}</TableHead>
                                            <TableHead className="text-xs font-medium text-muted-foreground">{t("table.participant")}</TableHead>
                                            <TableHead className="text-xs font-medium text-muted-foreground">{t("table.contact")}</TableHead>
                                            {customDataKeys.map((key) => (
                                                <TableHead key={key} className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                                                    {CUSTOM_FIELD_LABELS[key] || key}
                                                </TableHead>
                                            ))}
                                            <TableHead className="text-xs font-medium text-muted-foreground whitespace-nowrap">{t("table.registration_date")}</TableHead>
                                            <TableHead className="text-xs font-medium text-muted-foreground">{t("table.status")}</TableHead>
                                            <TableHead className="text-xs font-medium text-muted-foreground">{t("table.payment")}</TableHead>
                                            <TableHead className="w-10"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredRegistrations.map((reg, index) => (
                                            <TableRow key={reg.id} className="group border-b-muted/30 hover:bg-primary/5 hover:shadow-sm transition-all">
                                                <TableCell>
                                                    <span className="text-xs text-muted-foreground/60 font-mono">
                                                        {index + 1}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
                                                            {reg.participant?.firstname_ar?.charAt(0) || "?"}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium truncate max-w-[160px]">
                                                                {reg.participant?.firstname_ar} {reg.participant?.lastname_ar}
                                                            </p>
                                                            {reg.participant?.birth_date && (
                                                                <p className="text-[11px] text-muted-foreground">
                                                                    {format(new Date(reg.participant.birth_date), "yyyy/MM/dd")}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-0.5 min-w-0 max-w-[180px]">
                                                        {reg.participant?.phone && (
                                                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground truncate" dir="ltr">
                                                                <Phone className="w-3 h-3 flex-shrink-0" />
                                                                {reg.participant.phone}
                                                            </p>
                                                        )}
                                                        {(reg.participant?.email || reg.custom_data?.email as string) && (
                                                             <p className="flex items-center gap-1.5 text-xs text-muted-foreground truncate" dir="ltr">
                                                                 <Mail className="w-3 h-3 flex-shrink-0" />
                                                                 {reg.participant?.email || reg.custom_data?.email as string}
                                                             </p>
                                                         )}
                                                    </div>
                                                </TableCell>
                                                {customDataKeys.map((key) => (
                                                    <TableCell key={key}>
                                                        <span
                                                            className="text-sm max-w-[180px] block truncate"
                                                            title={reg.custom_data?.[key]?.toString()}
                                                        >
                                                            {reg.custom_data?.[key]?.toString() || <span className="text-muted-foreground/40">—</span>}
                                                        </span>
                                                    </TableCell>
                                                ))}
                                                <TableCell>
                                                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {format(new Date(reg.registration_date), "dd MMMM yyyy", { locale: dateLocale })}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGE_CLASSES[reg.status] || STATUS_BADGE_CLASSES[RegistrationStatus.CANCELLED]}`}>
                                                        {getStatusLabel(reg.status, t)}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground border-muted-foreground/20">
                                                        {getPaymentLabel(reg.payment_status, t)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="w-7 h-7 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity">
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="min-w-[160px]">
                                                            {reg.status !== RegistrationStatus.APPROVED && hasPermission('activities', 'registrations.approve') && (
                                                                <DropdownMenuItem onClick={() => handleApprove(reg.id)} className="text-xs">
                                                                    <CheckCircle className="w-3.5 h-3.5 me-2 text-emerald-600" />
                                                                    <span className="text-emerald-600">{t("registrations.approve_action")}</span>
                                                                </DropdownMenuItem>
                                                            )}
                                                            {reg.status !== RegistrationStatus.REJECTED && hasPermission('activities', 'registrations.reject') && (
                                                                <DropdownMenuItem onClick={() => handleReject(reg.id)} className="text-xs">
                                                                    <XCircle className="w-3.5 h-3.5 me-2 text-amber-600" />
                                                                    <span className="text-amber-600">{t("registrations.reject_action")}</span>
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuSeparator />
                                                            {hasPermission('activities', 'registrations.delete') && (
                                                                <DropdownMenuItem onClick={() => handleCancel(reg.id)} className="text-xs text-muted-foreground">
                                                                    <Trash2 className="w-3.5 h-3.5 me-2" />
                                                                    {t("registrations.cancel_action")}
                                                                </DropdownMenuItem>
                                                            )}
                                                            {hasPermission('activities', 'registrations.delete_hard') && (
                                                                <DropdownMenuItem onClick={() => handleDelete(reg.id)} className="text-xs text-rose-600 font-medium">
                                                                    <Trash2 className="w-3.5 h-3.5 me-2" />
                                                                    {t("registrations.delete_action")}
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
});

export default ActivityRegistrationsPage;
