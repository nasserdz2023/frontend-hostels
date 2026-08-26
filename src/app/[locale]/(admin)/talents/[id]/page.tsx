"use client";

import { useState, useEffect, use } from "react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/routing";
import {
    Mail, Phone, Trophy, Calendar, Plus, Trash2, Medal,
    ExternalLink, MoreVertical, ArrowRight, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
    talentsApi, TalentProfile, AchievementLevel, AchievementScope, TalentDomain
} from "@/lib/api/talents";
import { useAuthStore } from "@/lib/stores/auth";

/* ─── Types ─── */
interface PageProps {
    params: Promise<{ id: string; locale: string }>;
}

/* ─── Achievement dot color map ─── */
const achievementDotColor: Record<string, string> = {
    GOLD: "bg-yellow-400 ring-yellow-200 dark:ring-yellow-900",
    SILVER: "bg-slate-300 ring-slate-200 dark:ring-slate-700",
    BRONZE: "bg-amber-600 ring-amber-200 dark:ring-amber-800",
    WINNER: "bg-green-500 ring-green-200 dark:ring-green-800",
    HONORABLE_MENTION: "bg-blue-400 ring-blue-200 dark:ring-blue-800",
    PARTICIPATION: "bg-gray-400 ring-gray-200 dark:ring-gray-700",
};

/* ─── Achievement level badge color ─── */
const levelBadgeVariant = (level: AchievementLevel): "default" | "secondary" | "outline" | "destructive" => {
    switch (level) {
        case AchievementLevel.GOLD: return "default";
        case AchievementLevel.SILVER: return "secondary";
        case AchievementLevel.BRONZE: return "outline";
        case AchievementLevel.WINNER: return "default";
        default: return "outline";
    }
};

const levelBadgeClass = (level: AchievementLevel): string => {
    switch (level) {
        case AchievementLevel.GOLD: return "bg-yellow-500 hover:bg-yellow-600 text-white";
        case AchievementLevel.SILVER: return "bg-slate-400 hover:bg-slate-500 text-white";
        case AchievementLevel.BRONZE: return "bg-amber-700 hover:bg-amber-800 text-white";
        case AchievementLevel.WINNER: return "bg-green-500 hover:bg-green-600 text-white";
        default: return "";
    }
};

/* ─── Skeleton components ─── */
function ProfileCardSkeleton() {
    return (
        <Card className="md:col-span-1">
            <CardContent className="pt-6 text-center space-y-4">
                <Skeleton className="h-24 w-24 rounded-full mx-auto" />
                <div className="space-y-2">
                    <Skeleton className="h-6 w-32 mx-auto" />
                    <Skeleton className="h-4 w-24 mx-auto" />
                </div>
                <div className="space-y-3 pt-4 border-t">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            </CardContent>
        </Card>
    );
}

function BioCardSkeleton() {
    return (
        <Card className="md:col-span-2">
            <CardHeader>
                <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </CardContent>
        </Card>
    );
}

function TimelineSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex gap-4">
                            <Skeleton className="h-3 w-3 rounded-full mt-1 shrink-0" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-5 w-48" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

/* ─── Image Lightbox ─── */
function ImageLightbox({ src, alt }: { src: string; alt: string }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="block w-20 h-20 rounded border bg-muted overflow-hidden hover:opacity-80 transition-opacity shrink-0"
            >
                <img src={src} alt={alt} className="w-full h-full object-cover" />
            </button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-3xl p-2">
                    <DialogClose className="absolute top-2 end-2 z-10 h-8 w-8 rounded-full bg-background/80 flex items-center justify-center hover:bg-background">
                        <X className="h-4 w-4" />
                    </DialogClose>
                    <img src={src} alt={alt} className="w-full h-auto max-h-[80vh] object-contain rounded" />
                </DialogContent>
            </Dialog>
        </>
    );
}

/* ─── Main Page ─── */
export default function TalentProfilePage(props: PageProps) {
    const params = use(props.params);
    const { id } = params;

    const t = useTranslations("talents");
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [talent, setTalent] = useState<TalentProfile | null>(null);

    // Achievement Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newAchievement, setNewAchievement] = useState({
        title: "",
        date: new Date().toISOString().split('T')[0],
        level: AchievementLevel.PARTICIPATION,
        scope: AchievementScope.LOCAL,
        description: ""
    });

    // Honor Dialog State
    const [isHonorDialogOpen, setIsHonorDialogOpen] = useState(false);
    const [newHonor, setNewHonor] = useState({
        title: "",
        honored_by: "",
        date: new Date().toISOString().split('T')[0],
        description: "",
        article_url: "",
        images_text: ""
    });

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await talentsApi.getTalent(id);
            setTalent(data);
        } catch (error) {
            toast.error("Failed to load talent profile");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const handleAddAchievement = async () => {
        if (!newAchievement.title) return;
        try {
            await talentsApi.addAchievement(id, {
                talent_id: id,
                ...newAchievement
            });
            toast.success("Achievement added");
            setIsDialogOpen(false);
            loadData();
        } catch (error) {
            toast.error("Failed to add achievement");
        }
    };

    const handleDeleteAchievement = async (achievementId: string) => {
        if (!confirm(t("confirm_delete"))) return;
        try {
            await talentsApi.deleteAchievement(achievementId);
            toast.success("Achievement deleted");
            loadData();
        } catch (error) {
            toast.error("Failed to delete achievement");
        }
    };

    const handleAddHonor = async () => {
        if (!newHonor.title) return;
        try {
            await talentsApi.addHonor(id, {
                talent_id: id,
                title: newHonor.title,
                honored_by: newHonor.honored_by,
                date: newHonor.date,
                description: newHonor.description,
                article_url: newHonor.article_url,
                images: newHonor.images_text.split('\n').map(s => s.trim()).filter(Boolean)
            });
            toast.success("Honor added");
            setIsHonorDialogOpen(false);
            loadData();
        } catch (error) {
            toast.error("Failed to add honor");
        }
    };

    const handleDeleteHonor = async (honorId: string) => {
        if (!confirm(t("confirm_delete"))) return;
        try {
            await talentsApi.deleteHonor(honorId);
            toast.success("Honor deleted");
            loadData();
        } catch (error) {
            toast.error("Failed to delete honor");
        }
    };

    const { hasPermission } = useAuthStore();

    const handleDeleteTalent = async () => {
        if (!confirm(t("confirm_delete_talent"))) return;
        try {
            await talentsApi.deleteTalent(id, false);
            toast.success(t("talent_deleted"));
            router.push("/talents");
        } catch (error) {
            toast.error("Failed to delete talent");
        }
    };

    const handleDeletePermanent = async () => {
        if (!confirm(t("confirm_delete_permanent"))) return;
        try {
            await talentsApi.deleteTalent(id, true);
            toast.success(t("talent_deleted_permanent"));
            router.push("/talents");
        } catch (error) {
            toast.error("Failed to delete talent permanently");
        }
    };

    /* ─── Loading state ─── */
    if (loading) {
        return (
            <div className="space-y-6">
                {/* Back button skeleton */}
                <Skeleton className="h-10 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <ProfileCardSkeleton />
                    <BioCardSkeleton />
                </div>
                <TimelineSkeleton />
                <TimelineSkeleton />
            </div>
        );
    }

    if (!talent) return <div className="p-10 text-center">{t("not_found")}</div>;

    /* ─── Render ─── */
    return (
        <div className="space-y-6">
            {/* ── Back button ── */}
            <Link href="/talents">
                <Button variant="ghost" className="gap-2 -ms-2">
                    <ArrowRight className="h-4 w-4" />
                    {t("back_to_directory")}
                </Button>
            </Link>

            {/* ── Header / Bio ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Card */}
                <Card className="md:col-span-1 relative">
                    <CardContent className="pt-6 text-center space-y-4">
                        {/* DropdownMenu for actions */}
                        {(hasPermission('talents', 'delete') || hasPermission('talents', 'delete_permanent')) && (
                            <div className="absolute top-3 end-3">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        {hasPermission('talents', 'delete') && (
                                            <DropdownMenuItem
                                                variant="destructive"
                                                onClick={handleDeleteTalent}
                                                className="cursor-pointer"
                                            >
                                                <Trash2 className="h-4 w-4 me-2" />
                                                {t("delete_talent")}
                                            </DropdownMenuItem>
                                        )}
                                        {hasPermission('talents', 'delete_permanent') && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    variant="destructive"
                                                    onClick={handleDeletePermanent}
                                                    className="cursor-pointer"
                                                >
                                                    <Trash2 className="h-4 w-4 me-2" />
                                                    {t("delete_talent_permanent")}
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}

                        <div className="h-24 w-24 rounded-full bg-primary/10 mx-auto flex items-center justify-center text-primary font-bold text-3xl">
                            {talent.participant?.firstname_ar?.[0]}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">
                                {talent.participant?.firstname_ar} {talent.participant?.lastname_ar}
                            </h2>
                            <p className="text-muted-foreground">{talent.specialization}</p>
                            <div className="mt-2">
                                <Badge>{t(`domains.${talent.domain}`)}</Badge>
                            </div>
                        </div>

                        <div className="text-start space-y-2 pt-4 border-t">
                            <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{talent.participant?.email || "-"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{talent.participant?.phone || "-"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>{talent.participant?.birth_date || "-"}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Bio Card */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>{t("biography")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-lg leading-relaxed text-muted-foreground">
                            {talent.bio || t("no_bio_provided")}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* ── Achievements Timeline ── */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-yellow-500" />
                            {t("achievements_timeline")}
                        </CardTitle>
                        <CardDescription>
                            {t("track_record_of_excellence")}
                        </CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="me-2 h-4 w-4" />
                                {t("add_achievement")}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t("add_new_achievement")}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>{t("title")}</Label>
                                    <Input
                                        value={newAchievement.title}
                                        onChange={e => setNewAchievement({ ...newAchievement, title: e.target.value })}
                                        placeholder={t("achievement_title_placeholder")}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t("level")}</Label>
                                        <Select
                                            value={newAchievement.level}
                                            onValueChange={(v: any) => setNewAchievement({ ...newAchievement, level: v })}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {Object.values(AchievementLevel).map(v => (
                                                    <SelectItem key={v} value={v}>{t(`levels.${v}`)}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t("scope")}</Label>
                                        <Select
                                            value={newAchievement.scope}
                                            onValueChange={(v: any) => setNewAchievement({ ...newAchievement, scope: v })}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {Object.values(AchievementScope).map(v => (
                                                    <SelectItem key={v} value={v}>{t(`scopes.${v}`)}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("date")}</Label>
                                    <DateTimePicker
                                        value={newAchievement.date || undefined}
                                        onChange={(value) => setNewAchievement({ ...newAchievement, date: value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("description")}</Label>
                                    <Textarea
                                        value={newAchievement.description}
                                        onChange={e => setNewAchievement({ ...newAchievement, description: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddAchievement}>{t("save")}</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <div className="relative border-e border-gray-200 dark:border-gray-800 pe-4 space-y-8">
                        {talent.achievements?.map((achievement) => (
                            <div key={achievement.id} className="relative">
                                {/* Colored timeline dot */}
                                <div
                                    className={`absolute -end-[21px] top-1 h-3 w-3 rounded-full border border-background ring-4 transition-colors ${achievementDotColor[achievement.level] || achievementDotColor.PARTICIPATION
                                        }`}
                                />

                                <div className="bg-muted/30 p-4 rounded-lg border flex justify-between items-start group">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="text-sm text-muted-foreground bg-background px-2 py-0.5 rounded border whitespace-nowrap">
                                                {achievement.date}
                                            </span>
                                            <Badge
                                                variant={levelBadgeVariant(achievement.level)}
                                                className={levelBadgeClass(achievement.level) || undefined}
                                            >
                                                {t(`levels.${achievement.level}`)}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                                {t(`scopes.${achievement.scope}`)}
                                            </Badge>
                                        </div>
                                        <h4 className="text-lg font-bold">{achievement.title}</h4>
                                        {achievement.description && (
                                            <p className="text-muted-foreground mt-1 text-sm">
                                                {achievement.description}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive shrink-0 ms-2"
                                        onClick={() => handleDeleteAchievement(achievement.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {(!talent.achievements || talent.achievements.length === 0) && (
                            <div className="text-center text-muted-foreground py-4">
                                {t("no_achievements_yet")}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ── Honors Section ── */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Medal className="h-5 w-5 text-purple-500" />
                            {t("honors")}
                        </CardTitle>
                        <CardDescription>
                            {t("honors_description")}
                        </CardDescription>
                    </div>
                    <Dialog open={isHonorDialogOpen} onOpenChange={setIsHonorDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Plus className="me-2 h-4 w-4" />
                                {t("add_honor")}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t("add_new_honor")}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>{t("title")}</Label>
                                    <Input
                                        value={newHonor.title}
                                        onChange={e => setNewHonor({ ...newHonor, title: e.target.value })}
                                        placeholder={t("honor_title_placeholder")}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("honored_by")}</Label>
                                    <Input
                                        value={newHonor.honored_by}
                                        onChange={e => setNewHonor({ ...newHonor, honored_by: e.target.value })}
                                        placeholder={t("honored_by_placeholder")}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("date")}</Label>
                                    <DateTimePicker
                                        value={newHonor.date || undefined}
                                        onChange={(value) => setNewHonor({ ...newHonor, date: value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("description")}</Label>
                                    <Textarea
                                        value={newHonor.description}
                                        onChange={e => setNewHonor({ ...newHonor, description: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("article_url")}</Label>
                                    <Input
                                        value={newHonor.article_url}
                                        onChange={e => setNewHonor({ ...newHonor, article_url: e.target.value })}
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("image_urls")}</Label>
                                    <Textarea
                                        value={newHonor.images_text}
                                        onChange={e => setNewHonor({ ...newHonor, images_text: e.target.value })}
                                        placeholder={t("image_urls_placeholder")}
                                        className="font-mono text-xs"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddHonor}>{t("save")}</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {talent.honors?.map((honor) => (
                            <div key={honor.id} className="bg-muted/30 p-4 rounded-lg border flex justify-between items-start group">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-sm text-muted-foreground bg-background px-2 py-0.5 rounded border">
                                            {honor.date}
                                        </span>
                                        {honor.honored_by && (
                                            <Badge variant="secondary">
                                                {honor.honored_by}
                                            </Badge>
                                        )}
                                    </div>
                                    <h4 className="text-lg font-bold">{honor.title}</h4>
                                    {honor.description && (
                                        <p className="text-muted-foreground mt-1 text-sm">
                                            {honor.description}
                                        </p>
                                    )}

                                    <div className="mt-3 space-y-3">
                                        {honor.article_url && (
                                            <a
                                                href={honor.article_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-sm text-primary hover:underline w-fit"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                                {t("read_article")}
                                            </a>
                                        )}

                                        {honor.images && honor.images.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {honor.images.map((img, i) => (
                                                    <ImageLightbox key={i} src={img} alt={`Honor ${i + 1}`} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive shrink-0 ms-2"
                                    onClick={() => handleDeleteHonor(honor.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        {(!talent.honors || talent.honors.length === 0) && (
                            <div className="text-center text-muted-foreground py-4">
                                {t("no_honors_yet")}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
