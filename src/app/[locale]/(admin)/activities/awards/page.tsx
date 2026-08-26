"use client";

import { useState, useEffect, use } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Trophy, Medal } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { activitiesApi, ActivitySeason, SeasonStatus } from "@/lib/api/activities";
import { PermissionGuard } from "@/hooks/useRequirePermission";

interface SeasonAward {
    id: string;
    season_id: string;
    award_type: string;
    category: string;
    rank: number;
    winner_institution_id?: string;
    winner_employee_id?: string;
    points: number;
    notes?: string;
}

const AWARD_CATEGORIES = {
    most_activities: { ar: "أكثر نشاطاً", icon: "🏆" },
    best_attendance: { ar: "أفضل حضور", icon: "📊" },
    most_participants: { ar: "أكثر مشاركة", icon: "👥" },
    innovation: { ar: "الابتكار", icon: "💡" },
    partnership: { ar: "أفضل شراكة", icon: "🤝" },
};

const RANK_LABELS: Record<number, string> = {
    1: "🥇 المركز الأول",
    2: "🥈 المركز الثاني",
    3: "🥉 المركز الثالث",
};

export default function AwardsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = use(params);
    const t = useTranslations("activities");

    const [seasons, setSeasons] = useState<ActivitySeason[]>([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
    const [awards, setAwards] = useState<SeasonAward[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadSeasons();
    }, []);

    const loadSeasons = async () => {
        try {
            const data = await activitiesApi.getSeasons();
            setSeasons(data);
            // Select first closed season by default
            const closedSeason = data.find(s => s.status === SeasonStatus.CLOSED);
            if (closedSeason) {
                setSelectedSeasonId(closedSeason.id);
            } else if (data.length > 0) {
                setSelectedSeasonId(data[0].id);
            }
        } catch (error) {
            console.error("Failed to load seasons:", error);
            toast.error("فشل تحميل المواسم");
        } finally {
            setIsLoading(false);
        }
    };

    // Load awards when season changes
    useEffect(() => {
        if (selectedSeasonId) {
            loadAwards(selectedSeasonId);
        }
    }, [selectedSeasonId]);

    const loadAwards = async (seasonId: string) => {
        try {
            const data = await activitiesApi.getSeasonAwards(seasonId);
            setAwards(data as any);
        } catch (error) {
            console.error("Failed to load awards:", error);
        }
    };

    const calculateAwards = async () => {
        if (!selectedSeasonId) return;
        setIsLoading(true);
        try {
            toast.info("جاري حساب التكريمات...");
            const data = await activitiesApi.calculateSeasonAwards(selectedSeasonId);
            setAwards(data as any);
            toast.success(`تم حساب التكريمات بنجاح - ${data.length} تكريم`);
        } catch (error) {
            console.error("Failed to calculate awards:", error);
            toast.error("فشل حساب التكريمات");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PermissionGuard module="activities" action="awards.view">
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Trophy className="w-6 h-6 text-yellow-500" />
                            التكريمات
                        </h1>
                        <p className="text-gray-500">تكريم المؤسسات والأطر المتميزين في نهاية الموسم</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
                            <SelectTrigger className="w-[250px]">
                                <SelectValue placeholder="اختر الموسم" />
                            </SelectTrigger>
                            <SelectContent>
                                {seasons.map((season) => (
                                    <SelectItem key={season.id} value={season.id}>
                                        {season.name}
                                        {season.status === SeasonStatus.CLOSED && (
                                            <Badge variant="secondary" className="me-2">مغلق</Badge>
                                        )}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={calculateAwards}>
                            <Medal className="w-4 h-4 me-2" />
                            حساب التكريمات
                        </Button>
                    </div>
                </div>

                {/* Award Categories */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {Object.entries(AWARD_CATEGORIES).map(([key, value]) => (
                        <Card key={key} className="text-center">
                            <CardHeader className="pb-2">
                                <div className="text-4xl">{value.icon}</div>
                                <CardTitle className="text-lg">{value.ar}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Button variant="outline" size="sm" className="w-full">
                                    عرض النتائج
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Awards Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>قائمة التكريمات</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>الفئة</TableHead>
                                    <TableHead>المركز</TableHead>
                                    <TableHead>الفائز</TableHead>
                                    <TableHead>النقاط</TableHead>
                                    <TableHead>ملاحظات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-10">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                                        </TableCell>
                                    </TableRow>
                                ) : awards.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-10 text-gray-500">
                                            لم يتم حساب التكريمات بعد. اضغط على "حساب التكريمات" للبدء.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    awards.map((award) => (
                                        <TableRow key={award.id}>
                                            <TableCell>
                                                {AWARD_CATEGORIES[award.category as keyof typeof AWARD_CATEGORIES]?.ar || award.category}
                                            </TableCell>
                                            <TableCell>
                                                {RANK_LABELS[award.rank] || `المركز ${award.rank}`}
                                            </TableCell>
                                            <TableCell>
                                                {/* TODO: Show institution/employee name */}
                                                {award.winner_institution_id || award.winner_employee_id || "-"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{award.points} نقطة</Badge>
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate">
                                                {award.notes || "-"}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Info Card */}
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                        <h3 className="font-bold text-blue-800 mb-2">كيف يتم الحساب؟</h3>
                        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                            <li><strong>أكثر نشاطاً:</strong> أكبر عدد أنشطة مكتملة</li>
                            <li><strong>أفضل حضور:</strong> أعلى نسبة حضور للمسجلين</li>
                            <li><strong>أكثر مشاركة:</strong> أكبر عدد مشاركين مسجلين</li>
                            <li><strong>الابتكار:</strong> أفضل فكرة نشاط (تقييم لجنة)</li>
                            <li><strong>أفضل شراكة:</strong> أفضل تعاون مع الشركاء</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </PermissionGuard>
    );
}
