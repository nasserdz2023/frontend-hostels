"use client";

import { useState, useEffect, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
    Plus,
    Medal,
    MoreHorizontal,
    Pencil,
    Trash2,
    Layers,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useEmployeesStore } from "@/lib/stores/employees";
import { employeesApi, Grade, CreateGradeDTO } from "@/lib/api/employees";
import { PermissionGuard } from "@/hooks/useRequirePermission";
import { useAuthStore } from "@/lib/stores/auth";

export default function GradesPage() {
    const locale = useLocale();
    const t = useTranslations("employees.grades");
    const tCommon = useTranslations("common");
    const { grades, gradeGroups, fetchReferences, fetchGradeGroups } = useEmployeesStore();
    const { hasPermission } = useAuthStore();
    const canViewGrades = hasPermission('employees', 'grades.view') || hasPermission('employees', 'grades.manage');
    const canEditGrades = hasPermission('employees', 'grades.edit') || hasPermission('employees', 'grades.manage');
    const canDeleteGrades = hasPermission('employees', 'grades.delete') || hasPermission('employees', 'grades.manage');

    const [isLoading, setIsLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

    // Grade Groups dialog state
    const [isGroupsDialogOpen, setIsGroupsDialogOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<{ id: string; name_ar: string; name_fr: string; display_order: number } | null>(null);
    const [groupFormData, setGroupFormData] = useState({ name_ar: "", name_fr: "", display_order: 0 });

    // Form state
    const [formData, setFormData] = useState<CreateGradeDTO>({
        name_ar: "",
        name_fr: "",
        name_en: "",
        code: "",
        level: 0,
        group_id: "",
        is_full_time: true
    });

    useEffect(() => {
        fetchReferences(); // Fetches grades
        fetchGradeGroups();
    }, [fetchReferences, fetchGradeGroups]);

    const toggleSort = () => {
        setSortOrder(prev => {
            if (prev === null) return 'desc';
            if (prev === 'desc') return 'asc';
            return null;
        });
    };

    const sortedGrades = useMemo(() => {
        if (sortOrder === null) return grades;
        return [...grades].sort((a, b) => {
            const levelA = a.level ?? 0;
            const levelB = b.level ?? 0;
            return sortOrder === 'desc' ? levelB - levelA : levelA - levelB;
        });
    }, [grades, sortOrder]);

    const resetForm = () => {
        setFormData({
            name_ar: "",
            name_fr: "",
            name_en: "",
            code: "",
            level: 0,
            group_id: "",
            is_full_time: true
        });
        setEditingGrade(null);
    };

    const openCreateDialog = () => {
        resetForm();
        setIsDialogOpen(true);
    };

    const openEditDialog = (grade: Grade) => {
        setEditingGrade(grade);
        setFormData({
            name_ar: grade.name_ar,
            name_fr: grade.name_fr || "",
            name_en: grade.name_en || "",
            code: grade.code,
            level: grade.level || 0,
            group_id: grade.group_id || "",
            is_full_time: grade.is_full_time ?? true
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name_ar) {
            toast.error("الاسم بالعربية مطلوب");
            return;
        }
        if (!formData.code) {
            toast.error("رمز الرتبة مطلوب");
            return;
        }

        setIsLoading(true);
        try {
            if (editingGrade) {
                // Update
                await employeesApi.updateGrade(editingGrade.id, formData);
                toast.success(tCommon("successUpdate") || "تم التحديث بنجاح");
            } else {
                // Create
                await employeesApi.createGrade(formData);
                toast.success(tCommon("successCreate") || "تم الإنشاء بنجاح");
            }
            setIsDialogOpen(false);
            resetForm();
            fetchReferences(); // Refresh list
        } catch (error: any) {
            console.error(error);
            toast.error(error?.response?.data?.detail || "حدث خطأ");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(tCommon("confirmDelete") || "هل أنت متأكد من الحذف؟")) return;

        try {
            await employeesApi.deleteGrade(id);
            toast.success(tCommon("successDelete") || "تم الحذف بنجاح");
            fetchReferences();
        } catch (error: any) {
            console.error(error);
            toast.error(error?.response?.data?.detail || "حدث خطأ");
        }
    };

    // Grade Groups CRUD handlers
    const resetGroupForm = () => {
        setGroupFormData({ name_ar: "", name_fr: "", display_order: 0 });
        setEditingGroup(null);
    };

    const handleGroupSubmit = async () => {
        if (!groupFormData.name_ar) {
            toast.error("الاسم مطلوب");
            return;
        }
        setIsLoading(true);
        try {
            if (editingGroup) {
                await employeesApi.updateGradeGroup(editingGroup.id, groupFormData);
                toast.success("تم التحديث بنجاح");
            } else {
                await employeesApi.createGradeGroup(groupFormData);
                toast.success("تم الإنشاء بنجاح");
            }
            resetGroupForm();
            fetchGradeGroups();
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "حدث خطأ");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGroupDelete = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذه المجموعة؟")) return;
        try {
            await employeesApi.deleteGradeGroup(id);
            toast.success("تم الحذف بنجاح");
            fetchGradeGroups();
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "حدث خطأ");
        }
    };

    return (
        <PermissionGuard module="employees" action="view">
            <div className="p-6 max-w-6xl mx-auto space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Medal className="h-5 w-5" />
                                {t("title")}
                            </CardTitle>
                            <CardDescription>
                                {t("subtitle")}
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            {canViewGrades && (
                                <>
                                    {canEditGrades && (
                                        <Button variant="outline" onClick={() => setIsGroupsDialogOpen(true)} className="gap-2">
                                            <Layers className="h-4 w-4" />
                                            إدارة التصنيفات
                                        </Button>
                                    )}
                                    {canEditGrades && (
                                        <Button onClick={openCreateDialog} className="gap-2">
                                            <Plus className="h-4 w-4" />
                                            {t("add")}
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("code")}</TableHead>
                                    <TableHead>{tCommon("name")}</TableHead>
                                    <TableHead>{t("group")}</TableHead>
                                    <TableHead className="cursor-pointer select-none" onClick={toggleSort}>
                                        <div className="flex items-center gap-1">
                                            {t("level")}
                                            {sortOrder === 'asc' ? (
                                                <ArrowUp className="h-4 w-4" />
                                            ) : sortOrder === 'desc' ? (
                                                <ArrowDown className="h-4 w-4" />
                                            ) : (
                                                <ArrowUpDown className="h-4 w-4" />
                                            )}
                                        </div>
                                    </TableHead>
                                    <TableHead>{t("fullTime")}</TableHead>
                                    <TableHead className="w-20"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {grades.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            {tCommon("noResults") || "لا توجد نتائج"}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedGrades.map((grade) => (
                                        <TableRow key={grade.id}>
                                            <TableCell className="font-mono text-xs">
                                                {grade.code}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {locale === 'ar' ? grade.name_ar : grade.name_fr || grade.name_ar}
                                            </TableCell>
                                            <TableCell>
                                                {grade.group ? (locale === 'ar' ? grade.group.name_ar : grade.group.name_fr || grade.group.name_ar) : "-"}
                                            </TableCell>
                                            <TableCell>
                                                {grade.level || "-"}
                                            </TableCell>
                                            <TableCell>
                                                <span className={grade.is_full_time ? "text-green-600" : "text-amber-600"}>
                                                    {grade.is_full_time ? "✓" : "✗"}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {(canEditGrades || canDeleteGrades) && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {canEditGrades && (
                                                                <DropdownMenuItem onClick={() => openEditDialog(grade)}>
                                                                    <Pencil className="me-2 h-4 w-4" />
                                                                    {t("edit")}
                                                                </DropdownMenuItem>
                                                            )}
                                                            {canDeleteGrades && (
                                                                <DropdownMenuItem
                                                                    className="text-destructive"
                                                                    onClick={() => handleDelete(grade.id)}
                                                                >
                                                                    <Trash2 className="me-2 h-4 w-4" />
                                                                    {tCommon("delete")}
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Create/Edit Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>
                                {editingGrade ? t("edit") : t("add")}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name_ar">الاسم بالعربية <span className="text-red-500">*</span></Label>
                                <Input
                                    id="name_ar"
                                    value={formData.name_ar}
                                    onChange={(e) => setFormData(f => ({ ...f, name_ar: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name_fr">الاسم بالفرنسية</Label>
                                <Input
                                    id="name_fr"
                                    value={formData.name_fr || ""}
                                    onChange={(e) => setFormData(f => ({ ...f, name_fr: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="code">{t("code")} <span className="text-red-500">*</span></Label>
                                <Input
                                    id="code"
                                    value={formData.code || ""}
                                    onChange={(e) => setFormData(f => ({ ...f, code: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="group_id">{t("group")}</Label>
                                <Select
                                    value={formData.group_id}
                                    onValueChange={(val) => setFormData(f => ({ ...f, group_id: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر التصنيف" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {gradeGroups.map(group => (
                                            <SelectItem key={group.id} value={group.id}>
                                                {locale === 'ar' ? group.name_ar : group.name_fr || group.name_ar}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="level">{t("level")}</Label>
                                <Input
                                    id="level"
                                    type="number"
                                    value={formData.level || 0}
                                    onChange={(e) => setFormData(f => ({ ...f, level: parseInt(e.target.value) || 0 }))}
                                />
                            </div>

                            <div className="col-span-2 flex items-center space-x-2 space-x-reverse pt-2">
                                <Checkbox
                                    id="is_full_time"
                                    checked={formData.is_full_time}
                                    onCheckedChange={(checked) => setFormData(f => ({ ...f, is_full_time: !!checked }))}
                                />
                                <Label htmlFor="is_full_time">{t("fullTime")}</Label>
                            </div>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                {tCommon("cancel")}
                            </Button>
                            <Button onClick={handleSubmit} disabled={isLoading}>
                                {isLoading ? tCommon("saving") : tCommon("save")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Grade Groups Management Dialog */}
                <Dialog open={isGroupsDialogOpen} onOpenChange={(open) => { setIsGroupsDialogOpen(open); if (!open) resetGroupForm(); }}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Layers className="h-5 w-5" />
                                إدارة تصنيفات الرتب
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                            {/* Form */}
                            <div className="p-4 bg-muted/50 rounded-lg border">
                                <h4 className="font-medium mb-3">{editingGroup ? "تعديل التصنيف" : "إضافة تصنيف جديد"}</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>الاسم بالعربية <span className="text-red-500">*</span></Label>
                                        <Input
                                            value={groupFormData.name_ar}
                                            onChange={(e) => setGroupFormData(f => ({ ...f, name_ar: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>الاسم بالفرنسية</Label>
                                        <Input
                                            value={groupFormData.name_fr}
                                            onChange={(e) => setGroupFormData(f => ({ ...f, name_fr: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>ترتيب العرض</Label>
                                        <Input
                                            type="number"
                                            value={groupFormData.display_order}
                                            onChange={(e) => setGroupFormData(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    {editingGroup && (
                                        <Button variant="ghost" onClick={resetGroupForm}>إلغاء التعديل</Button>
                                    )}
                                    <Button onClick={handleGroupSubmit} disabled={isLoading}>
                                        {editingGroup ? "تحديث" : "إضافة"}
                                    </Button>
                                </div>
                            </div>

                            {/* List */}
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>الترتيب</TableHead>
                                        <TableHead>الاسم بالعربية</TableHead>
                                        <TableHead>الاسم بالفرنسية</TableHead>
                                        <TableHead className="w-24"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {gradeGroups.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                لا توجد تصنيفات
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        gradeGroups.map((group) => (
                                            <TableRow key={group.id}>
                                                <TableCell>{group.display_order}</TableCell>
                                                <TableCell className="font-medium">{group.name_ar}</TableCell>
                                                <TableCell>{group.name_fr || "-"}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditingGroup({ id: group.id, name_ar: group.name_ar, name_fr: group.name_fr || "", display_order: group.display_order });
                                                                setGroupFormData({ name_ar: group.name_ar, name_fr: group.name_fr || "", display_order: group.display_order });
                                                            }}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-destructive"
                                                            onClick={() => handleGroupDelete(group.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </PermissionGuard>
    );
}
