"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
    Plus,
    Briefcase,
    MoreHorizontal,
    Pencil,
    Trash2,
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useEmployeesStore } from "@/lib/stores/employees";
import { employeesApi, Position } from "@/lib/api/employees";

export default function PositionsPage() {
    const locale = useLocale();
    const tCommon = useTranslations("common");
    const { positions, fetchReferences } = useEmployeesStore();

    const [isLoading, setIsLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPosition, setEditingPosition] = useState<Position | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        code: "",
        name_ar: "",
        name_fr: "",
        name_en: "",
        is_senior: false,
        display_order: 0
    });

    useEffect(() => {
        fetchReferences();
    }, [fetchReferences]);

    const resetForm = () => {
        setFormData({
            code: "",
            name_ar: "",
            name_fr: "",
            name_en: "",
            is_senior: false,
            display_order: 0
        });
        setEditingPosition(null);
    };

    const openCreateDialog = () => {
        resetForm();
        setIsDialogOpen(true);
    };

    const openEditDialog = (pos: Position) => {
        setEditingPosition(pos);
        setFormData({
            code: pos.code,
            name_ar: pos.name_ar,
            name_fr: pos.name_fr || "",
            name_en: pos.name_en || "",
            is_senior: pos.is_senior,
            display_order: pos.display_order || 0
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name_ar) {
            toast.error("الاسم بالعربية مطلوب");
            return;
        }
        if (!formData.code) {
            toast.error("الرمز مطلوب");
            return;
        }

        setIsLoading(true);
        try {
            if (editingPosition) {
                // Update
                await employeesApi.updatePosition(editingPosition.id, formData);
                toast.success("تم تحديث المنصب بنجاح");
            } else {
                // Create
                await employeesApi.createPosition(formData);
                toast.success("تم إضافة المنصب بنجاح");
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
            await employeesApi.deletePosition(id);
            toast.success("تم الحذف بنجاح");
            fetchReferences();
        } catch (error: any) {
            console.error(error);
            toast.error(error?.response?.data?.detail || "حدث خطأ");
        }
    };

    // Sort positions by display_order then name
    const sortedPositions = [...positions].sort((a, b) => {
        if ((a.display_order || 0) !== (b.display_order || 0)) {
            return (a.display_order || 0) - (b.display_order || 0);
        }
        return a.name_ar.localeCompare(b.name_ar);
    });

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Briefcase className="h-5 w-5" />
                            إدارة المناصب
                        </CardTitle>
                        <CardDescription>
                            إدارة قائمة المناصب وترتيب ظهورها
                        </CardDescription>
                    </div>
                    <Button onClick={openCreateDialog} className="gap-2">
                        <Plus className="h-4 w-4" />
                        {tCommon("add") || "إضافة"}
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-20">الترتيب</TableHead>
                                <TableHead>الرمز</TableHead>
                                <TableHead>الاسم بالعربية</TableHead>
                                <TableHead>الاسم بالفرنسية</TableHead>
                                <TableHead>منصب عالي</TableHead>
                                <TableHead className="w-20"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedPositions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        لا توجد مناصب
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedPositions.map((pos) => (
                                    <TableRow key={pos.id}>
                                        <TableCell className="font-mono text-center bg-background">
                                            {pos.display_order || 0}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {pos.code}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {locale === 'ar' ? pos.name_ar : pos.name_fr || pos.name_ar}
                                        </TableCell>
                                        <TableCell>
                                            {pos.name_fr || "-"}
                                        </TableCell>
                                        <TableCell>
                                            <span className={pos.is_senior ? "text-purple-600 font-bold" : "text-slate-500"}>
                                                {pos.is_senior ? "نعم" : "لا"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEditDialog(pos)}>
                                                        <Pencil className="me-2 h-4 w-4" />
                                                        {tCommon("edit") || "تعديل"}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => handleDelete(pos.id)}
                                                    >
                                                        <Trash2 className="me-2 h-4 w-4" />
                                                        {tCommon("delete") || "حذف"}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingPosition ? "تعديل منصب" : "إضافة منصب جديد"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="name_ar">الاسم بالعربية <span className="text-red-500">*</span></Label>
                            <Input
                                id="name_ar"
                                value={formData.name_ar}
                                onChange={(e) => setFormData(f => ({ ...f, name_ar: e.target.value }))}
                                placeholder="مثال: مدير عام"
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="name_fr">الاسم بالفرنسية</Label>
                            <Input
                                id="name_fr"
                                value={formData.name_fr || ""}
                                onChange={(e) => setFormData(f => ({ ...f, name_fr: e.target.value }))}
                                placeholder="Ex: Directeur Général"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="code">الرمز <span className="text-red-500">*</span></Label>
                            <Input
                                id="code"
                                value={formData.code || ""}
                                onChange={(e) => setFormData(f => ({ ...f, code: e.target.value }))}
                                placeholder="DG"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="display_order">ترتيب العرض</Label>
                            <Input
                                id="display_order"
                                type="number"
                                value={formData.display_order}
                                onChange={(e) => setFormData(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))}
                                placeholder="0"
                            />
                            <p className="text-[10px] text-muted-foreground">الرقم الأصغر يظهر أولاً</p>
                        </div>

                        <div className="col-span-2 flex items-center space-x-2 space-x-reverse pt-4 border-t mt-2">
                            <Checkbox
                                id="is_senior"
                                checked={formData.is_senior}
                                onCheckedChange={(checked) => setFormData(f => ({ ...f, is_senior: !!checked }))}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="is_senior">
                                    منصب عالي
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    تحديد هذا الخيار إذا كان المنصب يعتبر وظيفة عليا
                                </p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            {tCommon("cancel") || "إلغاء"}
                        </Button>
                        <Button onClick={handleSubmit} disabled={isLoading}>
                            {isLoading ? (tCommon("saving") || "جاري الحفظ...") : (tCommon("save") || "حفظ")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
