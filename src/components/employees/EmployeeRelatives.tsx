"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Search, Trash2, AlertTriangle, X } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { toast } from "sonner";
import api from "@/lib/api/client";

// Types
interface Relative {
    id: string;
    employee_id: string;
    relative_employee_id: string;
    relationship_type: string;
    notes?: string;
    created_at?: string;
    relative_name?: string;
    relative_position?: string;
    relative_institution?: string;
    relative_grade?: string;
    has_conflict: boolean;
}

interface SearchResult {
    id: string;
    name: string;
    grade?: string;
    position?: string;
}

// Relationship types labels
const RELATIONSHIP_LABELS: Record<string, string> = {
    SPOUSE: "زوج/زوجة",
    FATHER: "الأب",
    MOTHER: "الأم",
    SON: "ابن",
    DAUGHTER: "ابنة",
    BROTHER: "أخ",
    SISTER: "أخت",
    UNCLE: "عم/خال",
    AUNT: "عمة/خالة",
    COUSIN: "ابن عم/خال",
    NEPHEW: "ابن أخ/أخت",
    NIECE: "ابنة أخ/أخت"
};

interface EmployeeRelativesProps {
    employeeId: string;
    canEdit?: boolean;
}

export function EmployeeRelatives({ employeeId, canEdit = false }: EmployeeRelativesProps) {
    const [relatives, setRelatives] = useState<Relative[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [selectedRelative, setSelectedRelative] = useState<SearchResult | null>(null);
    const [relationshipType, setRelationshipType] = useState("");
    const [searching, setSearching] = useState(false);

    const fetchRelatives = async () => {
        try {
            setLoading(true);
            const response = await api.get<{ items: Relative[] }>(`/employees/${employeeId}/relatives`);
            setRelatives(response.data.items);
        } catch (error) {
            toast.error("فشل في تحميل قائمة الأقارب");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (employeeId) {
            fetchRelatives();
        }
    }, [employeeId]);

    const searchPotentialRelatives = async (query: string) => {
        try {
            setSearching(true);
            const response = await api.get<{ items: SearchResult[] }>(
                `/employees/${employeeId}/search-relatives${query ? `?search=${query}` : ''}`
            );
            setSearchResults(response.data.items);
        } catch (error) {
            toast.error("فشل في البحث عن أقارب");
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        if (dialogOpen && searchQuery === "") {
            // Show same last name by default
            searchPotentialRelatives("");
        }
    }, [dialogOpen]);

    const handleSearch = () => {
        if (searchQuery.trim().length >= 2) {
            searchPotentialRelatives(searchQuery);
        }
    };

    const handleAddRelative = async () => {
        if (!selectedRelative || !relationshipType) {
            toast.error("يرجى اختيار القريب ونوع العلاقة");
            return;
        }

        try {
            await api.post(`/employees/${employeeId}/relatives`, {
                relative_employee_id: selectedRelative.id,
                relationship_type: relationshipType
            });
            toast.success("تمت إضافة القريب بنجاح");
            setDialogOpen(false);
            setSelectedRelative(null);
            setRelationshipType("");
            setSearchQuery("");
            fetchRelatives();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "فشل في إضافة القريب");
        }
    };

    const handleRemoveRelative = async (relativeId: string) => {
        if (!confirm("هل أنت متأكد من حذف هذه العلاقة؟")) return;

        try {
            await api.delete(`/employees/${employeeId}/relatives/${relativeId}`);
            toast.success("تم حذف العلاقة بنجاح");
            fetchRelatives();
        } catch (error) {
            toast.error("فشل في حذف العلاقة");
        }
    };

    if (loading && relatives.length === 0) {
        return (
            <div className="space-y-4">
                {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                ))}
            </div>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    الأقارب في القطاع
                    <Badge variant="secondary">{relatives.length}</Badge>
                </CardTitle>
                {canEdit && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                                <Plus className="h-4 w-4 me-1" />
                                إضافة قريب
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg" dir="rtl">
                            <DialogHeader>
                                <DialogTitle>إضافة قريب</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                {/* Search */}
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="ابحث باسم الموظف..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                    />
                                    <Button onClick={handleSearch} disabled={searching}>
                                        <Search className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Search Results */}
                                <div className="max-h-48 overflow-y-auto border rounded-lg">
                                    {searchResults.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-4">
                                            {searching ? "جاري البحث..." : "لا توجد نتائج"}
                                        </p>
                                    ) : (
                                        <div className="divide-y">
                                            {searchResults.map((result) => (
                                                <div
                                                    key={result.id}
                                                    className={`p-3 cursor-pointer hover:bg-muted/50 ${selectedRelative?.id === result.id ? 'bg-primary/10' : ''
                                                        }`}
                                                    onClick={() => setSelectedRelative(result)}
                                                >
                                                    <p className="font-medium">{result.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {result.position} {result.grade && `- ${result.grade}`}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Selected */}
                                {selectedRelative && (
                                    <div className="flex items-center justify-between bg-primary/10 p-2 rounded">
                                        <span>المختار: <strong>{selectedRelative.name}</strong></span>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => setSelectedRelative(null)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}

                                {/* Relationship Type */}
                                <Select value={relationshipType} onValueChange={setRelationshipType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر صلة القرابة" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(RELATIONSHIP_LABELS).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Button
                                    className="w-full"
                                    onClick={handleAddRelative}
                                    disabled={!selectedRelative || !relationshipType}
                                >
                                    إضافة القريب
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </CardHeader>
            <CardContent>
                {relatives.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>لا يوجد أقارب مسجلين في القطاع</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {relatives.map((rel) => (
                            <div
                                key={rel.id}
                                className={`flex items-center justify-between p-4 border rounded-lg ${rel.has_conflict ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20' : ''
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                                        👤
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-medium">{rel.relative_name}</h4>
                                            <Badge variant="outline">
                                                {RELATIONSHIP_LABELS[rel.relationship_type] || rel.relationship_type}
                                            </Badge>
                                            {rel.has_conflict && (
                                                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                                                    <AlertTriangle className="h-3 w-3 me-1" />
                                                    تضارب مصالح
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            {rel.relative_position && <span>{rel.relative_position}</span>}
                                            {rel.relative_grade && <span> • {rel.relative_grade}</span>}
                                            {rel.relative_institution && <span> • {rel.relative_institution}</span>}
                                        </div>
                                    </div>
                                </div>

                                {canEdit && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => handleRemoveRelative(rel.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default EmployeeRelatives;
