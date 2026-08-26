"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import {
    Users, Plus, Search, Filter, Trophy, Star,
    Medal, Sparkles, ArrowUpDown, Palette, FlaskConical,
    Music, Code
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination-custom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { talentsApi, TalentProfile, TalentDomain } from "@/lib/api/talents";
import { PermissionGuard } from "@/hooks/useRequirePermission";

/* ─── Domain color map ─── */
const domainBackground: Record<string, string> = {
    SPORTS: "bg-orange-50 dark:bg-orange-950/20 border-l-orange-400 dark:border-l-orange-600",
    CULTURE: "bg-purple-50 dark:bg-purple-950/20 border-l-purple-400 dark:border-l-purple-600",
    SCIENCE: "bg-blue-50 dark:bg-blue-950/20 border-l-blue-400 dark:border-l-blue-600",
    TECHNOLOGY: "bg-cyan-50 dark:bg-cyan-950/20 border-l-cyan-400 dark:border-l-cyan-600",
    ART: "bg-pink-50 dark:bg-pink-950/20 border-l-pink-400 dark:border-l-pink-600",
    OTHER: "bg-gray-50 dark:bg-gray-950/20 border-l-gray-400 dark:border-l-gray-600",
};

const domainIcon: Record<string, React.ReactNode> = {
    SPORTS: <Trophy className="h-4 w-4 text-orange-500" />,
    CULTURE: <Palette className="h-4 w-4 text-purple-500" />,
    SCIENCE: <FlaskConical className="h-4 w-4 text-blue-500" />,
    TECHNOLOGY: <Code className="h-4 w-4 text-cyan-500" />,
    ART: <Music className="h-4 w-4 text-pink-500" />,
    OTHER: <Sparkles className="h-4 w-4 text-gray-500" />,
};

/* ─── Skeleton component ─── */
function TalentCardSkeleton() {
    return (
        <Card className="h-full">
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    </div>
                </div>
                <div className="mt-4 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex items-center gap-2 pt-2">
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

/* ─── Stat card ─── */
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
    return (
        <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{label}</p>
                    <p className="text-xl font-bold">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}

/* ─── Main page ─── */
export default function TalentsPage() {
    return (
        <PermissionGuard module="talents" action="view">
            <TalentsPageContent />
        </PermissionGuard>
    );
}

type SortField = "name" | "date" | "achievements";

function TalentsPageContent() {
    const t = useTranslations("talents");
    const [loading, setLoading] = useState(true);
    const [talents, setTalents] = useState<TalentProfile[]>([]);
    const [search, setSearch] = useState("");
    const [domain, setDomain] = useState<string>("ALL");
    const [sort, setSort] = useState<SortField>("date");
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [total, setTotal] = useState(0);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await talentsApi.getTalents({
                search: search || undefined,
                domain: domain === "ALL" ? undefined : domain,
                page,
                size: pageSize,
            });
            setTalents(res.items);
            setTotal(res.total);
        } catch (error) {
            toast.error("Failed to load talents");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            loadData();
        }, 500);
        return () => clearTimeout(timer);
    }, [search, domain, page]);

    // Sort locally
    const sortedTalents = [...talents].sort((a, b) => {
        switch (sort) {
            case "name": {
                const na = (a.participant?.firstname_ar ?? "") + (a.participant?.lastname_ar ?? "");
                const nb = (b.participant?.firstname_ar ?? "") + (b.participant?.lastname_ar ?? "");
                return na.localeCompare(nb);
            }
            case "achievements":
                return (b.achievements?.length || 0) - (a.achievements?.length || 0);
            case "date":
            default:
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
    });

    // Aggregate stats
    const totalAchievements = talents.reduce((acc, t) => acc + (t.achievements?.length || 0), 0);
    const goldAchievements = talents.reduce(
        (acc, t) => acc + (t.achievements?.filter((a) => a.level === "GOLD").length || 0),
        0
    );

    const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const endRecord = Math.min(page * pageSize, total);

    const getDomainColor = (d: string) => {
        switch (d) {
            case "SPORTS": return "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300";
            case "CULTURE": return "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300";
            case "SCIENCE": return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
            case "TECHNOLOGY": return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300";
            case "ART": return "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300";
            default: return "bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300";
        }
    };

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Trophy className="h-8 w-8 text-primary" />
                        {t("talents_directory")}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {t("manage_and_track_talents")}
                    </p>
                </div>
                <Link href="/talents/new">
                    <Button>
                        <Plus className="me-2 h-4 w-4" />
                        {t("add_talent")}
                    </Button>
                </Link>
            </div>

            {/* ── Stats bar ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    icon={<Users className="h-5 w-5 text-primary" />}
                    label={t("total_talents")}
                    value={t("talents_count", { count: total })}
                />
                <StatCard
                    icon={<Medal className="h-5 w-5 text-blue-500" />}
                    label={t("total_achievements")}
                    value={t("achievements_count", { count: totalAchievements })}
                />
                <StatCard
                    icon={<Star className="h-5 w-5 text-yellow-500" />}
                    label={t("gold_achievements")}
                    value={t("gold_count", { count: goldAchievements })}
                />
            </div>

            {/* ── Search & Filter ── */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        {t("search_and_filter")}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("search_placeholder")}
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="ps-9"
                            />
                        </div>
                        <Select
                            value={domain}
                            onValueChange={(v) => {
                                setDomain(v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder={t("filter_domain")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">{t("all_domains")}</SelectItem>
                                {Object.values(TalentDomain).map((d) => (
                                    <SelectItem key={d} value={d}>{t(`domains.${d}`)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Sort */}
                        <div className="flex items-center gap-2">
                            <ArrowUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
                            <Select value={sort} onValueChange={(v: SortField) => setSort(v)}>
                                <SelectTrigger className="w-full sm:w-[170px]">
                                    <SelectValue placeholder={t("sort_by")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="date">{t("sort_date")}</SelectItem>
                                    <SelectItem value="name">{t("sort_name")}</SelectItem>
                                    <SelectItem value="achievements">{t("sort_achievements")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Talent grid ── */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <TalentCardSkeleton key={i} />
                    ))}
                </div>
            ) : sortedTalents.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <Trophy className="h-10 w-10 text-primary/60" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">{t("no_talents_yet")}</h3>
                        <p className="text-muted-foreground mb-6 max-w-sm">
                            {t("no_talents_found")}
                        </p>
                        <Link href="/talents/new">
                            <Button>
                                <Plus className="me-2 h-4 w-4" />
                                {t("add_first_talent")}
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Record count hint */}
                    <p className="text-sm text-muted-foreground">
                        {t("showing")} {startRecord} {t("to")} {endRecord} {t("of")} {total}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedTalents.map((talent) => (
                            <Link href={`/talents/${talent.id}`} key={talent.id}>
                                <Card
                                    className={`h-full border-l-4 hover:shadow-lg transition-all duration-200 cursor-pointer ${domainBackground[talent.domain] || domainBackground.OTHER
                                        }`}
                                >
                                    <CardContent className="pt-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                                                                {talent.participant?.firstname_ar?.[0]}
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom">
                                                            <p>{talent.participant?.firstname_ar} {talent.participant?.lastname_ar}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-lg truncate">
                                                        {talent.participant?.firstname_ar} {talent.participant?.lastname_ar}
                                                    </h3>
                                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                                        <Badge
                                                            variant="secondary"
                                                            className={`text-xs ${getDomainColor(talent.domain)}`}
                                                        >
                                                            {t(`domains.${talent.domain}`)}
                                                        </Badge>
                                                        {talent.specialization && (
                                                            <Badge variant="outline" className="text-xs">
                                                                {talent.specialization}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 space-y-2">
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {talent.bio || t("no_bio")}
                                            </p>
                                            <div className="flex items-center gap-2 text-sm font-medium pt-2">
                                                <Star className="h-4 w-4 text-yellow-500" />
                                                <span>{talent.achievements?.length || 0} {t("achievements")}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>

                    {/* ── Pagination ── */}
                    <Pagination
                        total={total}
                        pageSize={pageSize}
                        currentPage={page}
                        onPageChange={setPage}
                        className="mt-4"
                    />
                </>
            )}
        </div>
    );
}
