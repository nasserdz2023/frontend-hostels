"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useAuthStore } from "@/lib/stores/auth";
import { Link } from "@/i18n/routing";
import {
    Star, Search, Plus,
    Filter, Paperclip
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { talentsApi, Achievement, AchievementLevel, AchievementScope, TalentProfile } from "@/lib/api/talents";

/* ─── Row color by level ─── */
const rowLevelColor: Record<string, string> = {
    GOLD: "bg-yellow-50/60 dark:bg-yellow-950/10 hover:bg-yellow-100/80 dark:hover:bg-yellow-950/30",
    SILVER: "bg-slate-50/60 dark:bg-slate-950/10 hover:bg-slate-100/80 dark:hover:bg-slate-950/30",
    BRONZE: "bg-amber-50/60 dark:bg-amber-950/10 hover:bg-amber-100/80 dark:hover:bg-amber-950/30",
    WINNER: "bg-green-50/60 dark:bg-green-950/10 hover:bg-green-100/80 dark:hover:bg-green-950/30",
    HONORABLE_MENTION: "bg-blue-50/60 dark:bg-blue-950/10 hover:bg-blue-100/80 dark:hover:bg-blue-950/30",
    PARTICIPATION: "",
};

/* ─── Level badge style ─── */
const getLevelBadgeColor = (level: AchievementLevel) => {
    switch (level) {
        case AchievementLevel.GOLD: return "bg-yellow-500 hover:bg-yellow-600 text-white";
        case AchievementLevel.SILVER: return "bg-slate-400 hover:bg-slate-500 text-white";
        case AchievementLevel.BRONZE: return "bg-amber-700 hover:bg-amber-800 text-white";
        case AchievementLevel.WINNER: return "bg-green-500 hover:bg-green-600 text-white";
        default: return "bg-blue-500 hover:bg-blue-600 text-white";
    }
};

/* ─── Format date by locale ─── */
function formatDateByLocale(dateStr: string, locale: string): string {
    try {
        const localeMap: Record<string, string> = {
            ar: "ar-DZ",
            fr: "fr-FR",
            en: "en-US",
        };
        return new Date(dateStr).toLocaleDateString(localeMap[locale] || "en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return dateStr;
    }
}

/* ─── Main Page ─── */
export default function AchievementsPage() {
    const t = useTranslations("talents");
    const locale = useLocale();
    const { hasPermission } = useAuthStore();
    const canManage = hasPermission("talents", "achievements.manage");

    const [loading, setLoading] = useState(true);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [search, setSearch] = useState("");
    const [levelFilter, setLevelFilter] = useState<string>("ALL");
    const [scopeFilter, setScopeFilter] = useState<string>("ALL");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Add Dialog State
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [talentOptions, setTalentOptions] = useState<{ value: string, label: string }[]>([]);
    const [formData, setFormData] = useState({
        talent_id: "",
        title: "",
        level: AchievementLevel.PARTICIPATION,
        scope: AchievementScope.LOCAL,
        date: new Date().toISOString().split("T")[0],
        description: "",
        proof_file: ""
    });

    const fetchAchievements = async () => {
        try {
            setLoading(true);
            const res = await talentsApi.getAchievements({
                search: search || undefined,
                page,
                size: 20
            });
            let items = res.items;
            setTotalPages(res.pages || 1);

            // Client-side filter by level & scope
            if (levelFilter !== "ALL") {
                items = items.filter(a => a.level === levelFilter);
            }
            if (scopeFilter !== "ALL") {
                items = items.filter(a => a.scope === scopeFilter);
            }

            setAchievements(items);
        } catch (error) {
            console.error("Failed to fetch achievements", error);
        } finally {
            setLoading(false);
        }
    };

    // Load Talents for dropdown
    useEffect(() => {
        if (open) {
            talentsApi.getTalents({ size: 100 }).then(res => {
                setTalentOptions(res.items.map((t: TalentProfile) => ({
                    value: t.id,
                    label: t.participant?.firstname_ar + " " + t.participant?.lastname_ar + " - " + t.domain
                })));
            });
        }
    }, [open]);

    useEffect(() => {
        fetchAchievements();
    }, [page, search, levelFilter, scopeFilter]);

    const handleSave = async () => {
        if (!formData.title || !formData.date || !formData.talent_id) {
            toast.error(t("fill_required_fields"));
            return;
        }

        try {
            setSaving(true);
            await talentsApi.addAchievement(formData.talent_id, {
                ...formData,
                talent_id: formData.talent_id
            } as any);
            toast.success(t("talent_created_success"));
            setOpen(false);
            setFormData({
                talent_id: "",
                title: "",
                level: AchievementLevel.PARTICIPATION,
                scope: AchievementScope.LOCAL,
                date: new Date().toISOString().split("T")[0],
                description: "",
                proof_file: ""
            });
            fetchAchievements();
        } catch (error) {
            console.error(error);
            toast.error(t("create_failed"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Star className="h-8 w-8 text-yellow-500" />
                        {t("achievements_log")}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {t("track_record_of_excellence")}
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-72">
                        <Search className="absolute end-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t("search_placeholder")}
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="pe-9"
                        />
                    </div>

                    {canManage && (
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="ms-2 h-4 w-4" />
                                    {t("add_achievement")}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>{t("add_new_achievement")}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label className="after:content-['*'] after:ms-0.5 after:text-red-500">
                                            {t("talent_details")}
                                        </Label>
                                        <SearchableSelect
                                            options={talentOptions}
                                            value={formData.talent_id}
                                            onValueChange={v => setFormData({ ...formData, talent_id: v })}
                                            placeholder={t("search_placeholder")}
                                            searchPlaceholder={t("search_placeholder")}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="after:content-['*'] after:ms-0.5 after:text-red-500">
                                            {t("title")}
                                        </Label>
                                        <Input
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            placeholder={t("achievement_title_placeholder")}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>{t("level")}</Label>
                                            <Select
                                                value={formData.level}
                                                onValueChange={(v: any) => setFormData({ ...formData, level: v })}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {Object.values(AchievementLevel).map(l => (
                                                        <SelectItem key={l} value={l}>{t(`levels.${l}`)}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t("scope")}</Label>
                                            <Select
                                                value={formData.scope}
                                                onValueChange={(v: any) => setFormData({ ...formData, scope: v })}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {Object.values(AchievementScope).map(s => (
                                                        <SelectItem key={s} value={s}>{t(`scopes.${s}`)}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t("date")}</Label>
                                        <DateTimePicker
                                            value={formData.date || undefined}
                                            onChange={(value) => setFormData({ ...formData, date: value })}
                                            showTime={false}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t("description")}</Label>
                                        <Textarea
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setOpen(false)}>
                                        {t("cancel")}
                                    </Button>
                                    <Button onClick={handleSave} disabled={saving}>
                                        {saving ? t("saving") : t("save")}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            {/* ── Filters (Level + Scope) ── */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        {t("search_and_filter")}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Select
                            value={levelFilter}
                            onValueChange={(v) => {
                                setLevelFilter(v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder={t("filter_level")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">{t("all_levels")}</SelectItem>
                                {Object.values(AchievementLevel).map(l => (
                                    <SelectItem key={l} value={l}>{t(`levels.${l}`)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={scopeFilter}
                            onValueChange={(v) => {
                                setScopeFilter(v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder={t("filter_scope")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">{t("all_scopes")}</SelectItem>
                                {Object.values(AchievementScope).map(s => (
                                    <SelectItem key={s} value={s}>{t(`scopes.${s}`)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* ── Table ── */}
            <div className="border rounded-lg bg-card overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">{t("title")}</TableHead>
                            <TableHead>{t("level")}</TableHead>
                            <TableHead>{t("scope")}</TableHead>
                            <TableHead>{t("date")}</TableHead>
                            <TableHead>{t("talent_details")}</TableHead>
                            <TableHead className="text-center">{t("attachment")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                    {t("loading")}
                                </TableCell>
                            </TableRow>
                        ) : achievements.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    {t("no_achievements_yet")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            achievements.map((item) => (
                                <TableRow
                                    key={item.id}
                                    className={`transition-colors ${rowLevelColor[item.level] || ""
                                        }`}
                                >
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <span className="truncate max-w-[180px]">{item.title}</span>
                                            {item.description && (
                                                <span className="text-xs text-muted-foreground truncate max-w-[120px] block sm:hidden">
                                                    {item.description}
                                                </span>
                                            )}
                                        </div>
                                        {item.description && (
                                            <p className="text-xs text-muted-foreground truncate max-w-[200px] hidden sm:block">
                                                {item.description}
                                            </p>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={getLevelBadgeColor(item.level)}>
                                            {t(`levels.${item.level}`)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {t(`scopes.${item.scope}`)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        {formatDateByLocale(item.date, locale)}
                                    </TableCell>
                                    <TableCell>
                                        {item.talent?.participant ? (
                                            <Link
                                                href={`/talents/${item.talent_id}`}
                                                className="hover:underline text-primary font-medium"
                                            >
                                                {item.talent.participant.firstname_ar} {item.talent.participant.lastname_ar}
                                            </Link>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {item.proof_file ? (
                                            <Badge variant="secondary" className="gap-1 cursor-pointer" asChild>
                                                <a href={item.proof_file} target="_blank" rel="noopener noreferrer">
                                                    <Paperclip className="h-3 w-3" />
                                                    <span className="hidden sm:inline">{t("attachment")}</span>
                                                </a>
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">—</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        {t("previous")}
                    </Button>
                    <span className="py-2 px-4 text-sm">{page} / {totalPages}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        {t("next")}
                    </Button>
                </div>
            )}
        </div>
    );
}
