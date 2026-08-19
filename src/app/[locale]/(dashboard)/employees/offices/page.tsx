"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
    Plus,
    Building,
    MoreHorizontal,
    Pencil,
    Trash2,
    Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { useEmployeesStore } from "@/lib/stores/employees";
import api from "@/lib/api/client";
import { OfficeType } from "@/lib/api/employees";

export default function OfficesPage() {
    const t = useTranslations("offices");
    const locale = useLocale();
    const { offices, departments, fetchReferences, fetchOffices } = useEmployeesStore();
    const [isLoading, setIsLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingOffice, setEditingOffice] = useState<OfficeType | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        code: "",
        name_ar: "",
        name_fr: "",
        name_en: "",
        department_id: "",
        is_active: true,
        display_order: 0
    });

    useEffect(() => {
        fetchReferences();
        fetchOffices();
    }, [fetchReferences, fetchOffices]);

    const resetForm = () => {
        setFormData({
            code: "",
            name_ar: "",
            name_fr: "",
            name_en: "",
            department_id: "",
            is_active: true,
            display_order: offices.length + 1
        });
        setEditingOffice(null);
    };

    const openCreateDialog = () => {
        resetForm();
        setFormData(f => ({ ...f, display_order: offices.length + 1 }));
        setIsDialogOpen(true);
    };

    const openEditDialog = (office: OfficeType) => {
        setEditingOffice(office);
        setFormData({
            code: office.code,
            name_ar: office.name_ar,
            name_fr: office.name_fr || "",
            name_en: office.name_en || "",
            department_id: office.department_id,
            is_active: office.is_active,
            display_order: office.display_order
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.code || !formData.name_ar || !formData.department_id) {
            toast.error(t('alerts.requiredFields'));
            return;
        }

        setIsLoading(true);
        try {
            if (editingOffice) {
                // Update
                await api.patch(`/employees/offices/${editingOffice.id}`, formData);
                toast.success(t('alerts.updateSuccess'));
            } else {
                // Create
                await api.post("/employees/offices", formData);
                toast.success(t('alerts.createSuccess'));
            }
            setIsDialogOpen(false);
            resetForm();
            fetchOffices(); // Refresh list
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || t('alerts.genericError'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('alerts.deleteConfirm'))) return;

        try {
            await api.delete(`/employees/offices/${id}`);
            toast.success(t('alerts.deleteSuccess'));
            fetchOffices();
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || t('alerts.genericError'));
        }
    };

    const getDepartmentName = (deptId: string) => {
        const dept = departments.find(d => d.id === deptId);
        if (!dept) return "-";
        return locale === 'ar' ? dept.name_ar : (dept.name_fr || dept.name_ar);
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Briefcase className="h-5 w-5" />
                            {t('title')}
                        </CardTitle>
                        <CardDescription>
                            {t('subtitle')}
                        </CardDescription>
                    </div>
                    <Button onClick={openCreateDialog} className="gap-2">
                        <Plus className="h-4 w-4" />
                        {t('alerts.addNew')}
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>{t('table.columns.code')}</TableHead>
                                <TableHead>{t('table.columns.name')}</TableHead>
                                <TableHead>{t('table.columns.department')}</TableHead>
                                <TableHead>{t('table.columns.status')}</TableHead>
                                <TableHead className="w-20"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {offices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        {t('alerts.noOffices')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                offices.map((office) => (
                                    <TableRow key={office.id}>
                                        <TableCell className="text-muted-foreground">
                                            {office.display_order}
                                        </TableCell>
                                        <TableCell>
                                            <code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-sm">
                                                {office.code}
                                            </code>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div>{office.name_ar}</div>
                                            {office.name_fr && (
                                                <div className="text-xs text-muted-foreground">{office.name_fr}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {getDepartmentName(office.department_id)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={office.is_active ? "default" : "secondary"}>
                                                {office.is_active ? t('status.active') : t('status.inactive')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEditDialog(office)}>
                                                        <Pencil className="me-2 h-4 w-4" />
                                                        {t('alerts.edit')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => handleDelete(office.id)}
                                                    >
                                                        <Trash2 className="me-2 h-4 w-4" />
                                                        {t('alerts.delete')}
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
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingOffice ? t('dialog.edit') : t('dialog.add')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">{t('form.code')} <span className="text-red-500">*</span></Label>
                            <Input
                                id="code"
                                placeholder={t('form.codePlaceholder')}
                                value={formData.code}
                                onChange={(e) => setFormData(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                                disabled={!!editingOffice}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="department">{t('form.department')} <span className="text-red-500">*</span></Label>
                            <Select
                                value={formData.department_id}
                                onValueChange={(val) => setFormData(f => ({ ...f, department_id: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('form.selectDepartment')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments.map(dept => (
                                        <SelectItem key={dept.id} value={dept.id}>
                                            {dept.name_ar}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name_ar">{t('form.nameAr')} <span className="text-red-500">*</span></Label>
                            <Input
                                id="name_ar"
                                placeholder={t('form.nameArPlaceholder')}
                                value={formData.name_ar}
                                onChange={(e) => setFormData(f => ({ ...f, name_ar: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name_fr">{t('form.nameFr')}</Label>
                            <Input
                                id="name_fr"
                                placeholder={t('form.nameFrPlaceholder')}
                                value={formData.name_fr}
                                onChange={(e) => setFormData(f => ({ ...f, name_fr: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name_en">{t('form.nameEn')}</Label>
                            <Input
                                id="name_en"
                                placeholder={t('form.nameEnPlaceholder')}
                                value={formData.name_en}
                                onChange={(e) => setFormData(f => ({ ...f, name_en: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="display_order">{t('form.displayOrder')}</Label>
                            <Input
                                id="display_order"
                                type="number"
                                value={formData.display_order}
                                onChange={(e) => setFormData(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch
                                id="is_active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData(f => ({ ...f, is_active: checked }))}
                            />
                            <Label htmlFor="is_active">{t('status.active')}</Label>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            {t('buttons.cancel')}
                        </Button>
                        <Button onClick={handleSubmit} disabled={isLoading}>
                            {isLoading ? t('buttons.saving') : editingOffice ? t('buttons.saveEdit') : t('buttons.add')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
