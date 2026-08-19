"use client";

import { useEffect, useState } from "react";
import { skillsApi, EmployeeSkill, PROFICIENCY_LABELS } from "@/lib/api/skills";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export function SkillMatrix({ employeeId }: { employeeId: string }) {
    const [skills, setSkills] = useState<EmployeeSkill[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [levelFilter, setLevelFilter] = useState<string>("all");

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const data = await skillsApi.getEmployeeSkills(employeeId);
                setSkills(data);
            } catch { toast.error("فشل تحميل المهارات"); }
            finally { setLoading(false); }
        };
        load();
    }, [employeeId]);

    const filtered = skills.filter((s) => {
        const matchSearch = s.skill?.name_ar?.includes(search) || s.skill?.name_en?.includes(search);
        const matchLevel = levelFilter === "all" || s.proficiency_level === levelFilter;
        return matchSearch && matchLevel;
    });

    const byCategory: Record<string, EmployeeSkill[]> = {};
    filtered.forEach((s) => {
        const cat = s.skill?.category?.name_ar || "أخرى";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(s);
    });

    if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>;

    return (
        <div className="space-y-4">
            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="بحث في المهارات..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pe-9"
                    />
                </div>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="كل المستويات" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">كل المستويات</SelectItem>
                        {Object.entries(PROFICIENCY_LABELS).map(([key, val]) => (
                            <SelectItem key={key} value={key}>{val.ar}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {Object.entries(byCategory).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد مهارات مسجلة</p>
            ) : (
                Object.entries(byCategory).map(([cat, items]) => (
                    <Card key={cat}>
                        <CardHeader>
                            <CardTitle className="text-base">{cat} <span className="text-sm text-muted-foreground">({items.length})</span></CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {items.map((s) => (
                                    <div key={s.id} className="p-3 rounded-lg border">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-sm">{s.skill?.name_ar || "—"}</span>
                                            <Badge variant="outline" className="text-xs">
                                                {PROFICIENCY_LABELS[s.proficiency_level]?.ar}
                                            </Badge>
                                        </div>
                                        {s.years_of_experience > 0 && (
                                            <p className="text-xs text-muted-foreground mt-1">{s.years_of_experience} سنة خبرة</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
}
