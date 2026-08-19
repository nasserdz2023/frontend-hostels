"use client";

import { useEffect, useState, use } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { employeesApi } from "@/lib/api/employees";
import { ArrowRight, ArrowLeft, FileText, Loader2, ScrollText, Coins, BookOpen, Briefcase } from "lucide-react";
import { EmployeeDocuments } from "@/components/employees/EmployeeDocuments";
import { useAuthStore } from "@/lib/stores/auth";
import { documentsApi } from "@/lib/api/documents";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const COLOR_MAP = {
  emerald: {
    bg: "bg-gradient-to-br from-emerald-500/[0.03] to-emerald-500/[0.08] dark:from-emerald-500/[0.01] dark:to-emerald-500/[0.05]",
    border: "border-emerald-500/20 dark:border-emerald-500/10 hover:border-emerald-500/40 dark:hover:border-emerald-500/30",
    icon: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20",
    btn: "bg-emerald-600 hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-500/20",
  },
  blue: {
    bg: "bg-gradient-to-br from-blue-500/[0.03] to-blue-500/[0.08] dark:from-blue-500/[0.01] dark:to-blue-500/[0.05]",
    border: "border-blue-500/20 dark:border-blue-500/10 hover:border-blue-500/40 dark:hover:border-blue-500/30",
    icon: "text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/20",
    btn: "bg-blue-600 hover:bg-blue-700 hover:shadow-md hover:shadow-blue-500/20",
  },
  purple: {
    bg: "bg-gradient-to-br from-purple-500/[0.03] to-purple-500/[0.08] dark:from-purple-500/[0.01] dark:to-purple-500/[0.05]",
    border: "border-purple-500/20 dark:border-purple-500/10 hover:border-purple-500/40 dark:hover:border-purple-500/30",
    icon: "text-purple-600 dark:text-purple-400 bg-purple-500/10 dark:bg-purple-500/20",
    btn: "bg-purple-600 hover:bg-purple-700 hover:shadow-md hover:shadow-purple-500/20",
  },
  amber: {
    bg: "bg-gradient-to-br from-amber-500/[0.03] to-amber-500/[0.08] dark:from-amber-500/[0.01] dark:to-amber-500/[0.05]",
    border: "border-amber-500/20 dark:border-amber-500/10 hover:border-amber-500/40 dark:hover:border-amber-500/30",
    icon: "text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20",
    btn: "bg-amber-600 hover:bg-amber-700 hover:shadow-md hover:shadow-amber-500/20",
  },
} as const;

const QUICK_DOC_TYPES: { type: string; icon: React.ComponentType<{ className?: string }>; labelAr: string; desc: string; color: keyof typeof COLOR_MAP }[] = [
  { type: "WORK_CERTIFICATE", icon: ScrollText, labelAr: "شهادة العمل", desc: "شهادة تثبت عمل الموظف", color: "emerald" },
  { type: "SALARY_CERT", icon: Coins, labelAr: "شهادة الراتب", desc: "شهادة الراتب الشهري", color: "blue" },
  { type: "EXPERIENCE_CERT", icon: BookOpen, labelAr: "شهادة الخبرة", desc: "شهادة الخبرة المهنية", color: "purple" },
  { type: "SERVICE_CERT", icon: Briefcase, labelAr: "شهادة الخدمة", desc: "شهادة أداء الخدمة", color: "amber" },
];

export default function EmployeeDocumentsPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = use(params);
    const t = useTranslations("employees");
    const router = useRouter();
    const { hasPermission, user } = useAuthStore();

    const canEdit = hasPermission("employees", "edit") || user?.role === "dev_admin";

    const [employee, setEmployee] = useState<{ firstname_ar: string; lastname_ar: string; } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingCards, setLoadingCards] = useState<Record<string, boolean>>({});
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        employeesApi.getById(id)
            .then(setEmployee)
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [id]);

    const handleQuickCreate = async (type: string, labelAr: string) => {
        setLoadingCards(prev => ({ ...prev, [type]: true }));
        try {
            const response = await documentsApi.quickCreate(id, type);
            toast.success(`✅ تم إنشاء ${labelAr} بنجاح`);
            if (response.file_url) {
                window.open(response.file_url, '_blank');
            }
            setRefreshKey(prev => prev + 1);
        } catch (error: unknown) {
            const apiError = error as { response?: { data?: { detail?: string } } };
            toast.error(apiError?.response?.data?.detail || `❌ فشل في إنشاء ${labelAr}`);
        } finally {
            setLoadingCards(prev => ({ ...prev, [type]: false }));
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const nameAr = employee ? `${employee.firstname_ar} ${employee.lastname_ar}` : "";

    return (
        <div className="container relative mx-auto py-8 px-4 max-w-6xl">
            {/* Background decorative orb */}
            <div className="absolute top-0 right-0 -z-10 w-72 h-72 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

            {/* Header Section */}
            <div className="mb-8 flex items-center justify-between p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
                        aria-label="Back"
                    >
                        {locale === 'ar' ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <FileText className="h-6 w-6" />
                            </div>
                            {t("documents")}
                        </h1>
                        {employee && (
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                    {nameAr}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Create Cards */}
            {canEdit && (
                <section className="mb-10">
                    <div className="flex items-center gap-2 mb-5">
                        <span className="text-2xl">🎯</span>
                        <h2 className="text-lg font-semibold">الوصول السريع — إنشاء وثيقة بنقرة واحدة</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {QUICK_DOC_TYPES.map(({ type, icon: Icon, labelAr, desc, color }) => {
                            const isLoading = loadingCards[type];
                            const colors = COLOR_MAP[color];
                            return (
                                <button
                                    key={type}
                                    onClick={() => handleQuickCreate(type, labelAr)}
                                    disabled={isLoading}
                                    className={cn(
                                        "group relative flex flex-col items-center justify-between p-6 rounded-2xl border transition-all duration-300 text-center",
                                        colors.bg,
                                        colors.border,
                                        isLoading ? "opacity-60 cursor-not-allowed" : "cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-1.5"
                                    )}
                                >
                                    {/* Animated glow spotlight behind card */}
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_100%)] pointer-events-none rounded-2xl" />

                                    <div className="flex flex-col items-center w-full">
                                        {/* Styled Icon Container */}
                                        <div className={cn("p-4 rounded-full transition-transform duration-300 group-hover:scale-110 mb-4", colors.icon)}>
                                            {isLoading ? (
                                                <Loader2 className="h-7 w-7 animate-spin" />
                                            ) : (
                                                <Icon className="h-7 w-7" />
                                            )}
                                        </div>
                                        
                                        <span className="font-bold text-slate-800 dark:text-slate-100 text-base mb-1.5">{labelAr}</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[180px]">{desc}</span>
                                    </div>

                                    <span className={cn(
                                        "mt-5 text-xs font-semibold text-white px-4 py-2 rounded-xl transition-all duration-300 w-full flex items-center justify-center gap-1.5",
                                        colors.btn,
                                        isLoading && "opacity-0 pointer-events-none"
                                    )}>
                                        <span>انقر للإنشاء</span>
                                        <span className="text-[10px] opacity-80 group-hover:translate-x-[-2px] transition-transform duration-300">←</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Existing Documents */}
            <section>
                <EmployeeDocuments key={refreshKey} employeeId={id} canEdit={canEdit} />
            </section>
        </div>
    );
}
