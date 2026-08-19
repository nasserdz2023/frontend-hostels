"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { employeesApi, Employee, Grade, Position, MasterPDF } from "@/lib/api/employees";
import { OdooSearch } from "@/components/odoo/OdooSearch";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Archive, CheckCircle2, AlertCircle, Search, ChevronUp, ChevronDown, Download, Users, Upload, X, FileText, Trash2, FileUp, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/stores/auth";


// ==================== Delete Confirmation Dialog ====================

interface DeleteDocumentDialogProps {
    employeeId: string;
    employeeName: string;
    onConfirm: (employeeId: string) => Promise<void>;
}

function DeleteDocumentDialog({ employeeId, employeeName, onConfirm }: DeleteDocumentDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm(employeeId);
            setOpen(false);
        } catch {
            // Error already handled by parent (toast)
        } finally {
            setLoading(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <button
                    className="text-red-500 hover:text-red-700 p-0.5"
                    title="حذف الوثيقة"
                >
                    <X className="h-3 w-3" />
                </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>تأكيد حذف الوثيقة</AlertDialogTitle>
                    <AlertDialogDescription>
                        هل أنت متأكد من حذف وثيقة {employeeName}؟ لا يمكن التراجع عن هذا الإجراء.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>إلغاء</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleConfirm();
                        }}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin ml-1" />}
                        {loading ? 'جاري الحذف...' : 'نعم، احذف'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// ==================== Helper Components ====================

interface WishesTableProps {
    employees: Employee[];
    onWishChange: (employeeId: string, value: string) => Promise<void>;
    onUploadDocument: (employeeId: string, file: File) => Promise<void>;
    onDeleteDocument: (employeeId: string) => Promise<void>;
    onExtractDocument: (employeeId: string, pageNumber: number) => Promise<void>;
    pageNumbers: Record<string, string>;
    onPageNumberChange: (employeeId: string, value: string) => Promise<void>;
    hasMasterPdf: boolean;
    canViewDocuments: boolean;
    canUploadDocuments: boolean;
    canDeleteDocuments: boolean;
    canEditWish: boolean;
}

function WishesFlatTable({ employees, onWishChange, onUploadDocument, onDeleteDocument, onExtractDocument, pageNumbers, onPageNumberChange, hasMasterPdf, canViewDocuments, canUploadDocuments, canDeleteDocuments, canEditWish }: WishesTableProps) {
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    const EmployeeRow = ({ emp, idx }: { emp: Employee; idx: number }) => (
        <TableRow className={emp.is_archived ? "opacity-60 bg-muted/50" : ""}>
            <TableCell className="text-center text-muted-foreground text-xs w-10">{idx + 1}</TableCell>
            <TableCell>
                <div className="flex flex-col">
                    <span className="font-medium">{emp.firstname_ar} {emp.lastname_ar}</span>
                    {emp.firstname_fr && (
                        <span className="text-xs text-muted-foreground">{emp.firstname_fr} {emp.lastname_fr}</span>
                    )}
                </div>
            </TableCell>
            <TableCell>
                <div className="flex flex-col">
                    <span>{emp.grade?.name_ar || "-"}</span>
                    <span className="text-xs text-muted-foreground">{emp.position?.name_ar || ""}</span>
                </div>
            </TableCell>
            <TableCell>
                {['SECONDMENT', 'OUT_OF_FRAME', 'DETACHMENT', 'MISE_A_DISPOSITION'].includes(emp.legal_position || '') && emp.legal_position_destination ? (
                    <div className="flex flex-col truncate max-w-[260px]">
                        <span className="font-medium text-amber-700 dark:text-amber-500 truncate" title={`${emp.legal_position === 'OUT_OF_FRAME' ? 'خارج الإطار' : emp.legal_position === 'MISE_A_DISPOSITION' ? 'تحت التصرف' : 'انتداب'}: ${emp.legal_position_destination}`}>
                            {emp.legal_position === 'OUT_OF_FRAME' ? 'خارج الإطار' : emp.legal_position === 'MISE_A_DISPOSITION' ? 'تحت التصرف' : 'انتداب'}: {emp.legal_position_destination}
                        </span>
                        {emp.institution?.name_ar && <span className="text-xs text-muted-foreground line-through opacity-70 truncate" title={emp.institution.name_ar}>{emp.institution.name_ar}</span>}
                    </div>
                ) : emp.position?.name_ar?.includes('مستشار مقاطعة') && emp.work_district ? (
                    <span className="font-medium text-blue-700 dark:text-blue-500 truncate block max-w-[260px]" title={`مقاطعة ${emp.work_district.name_ar}`}>
                        مقاطعة {emp.work_district.name_ar}
                    </span>
                ) : (emp.position?.name_ar?.includes('ملحق بلدي') || emp.position?.name_ar?.includes('ملحق رياضة') || emp.position?.name_ar?.includes('مندوب')) && emp.work_municipality ? (
                    <span className="font-medium text-green-700 dark:text-green-500 truncate block max-w-[260px]" title={`بلدية ${emp.work_municipality.name_ar}`}>
                        بلدية {emp.work_municipality.name_ar}
                    </span>
                ) : (
                    <span className="truncate block max-w-[260px]" title={emp.institution?.name_ar || ''}>
                        {emp.institution?.name_ar || "-"}
                    </span>
                )}
            </TableCell>
            <TableCell>
                {(!emp.wilaya_choice || emp.wilaya_choice === 'PENDING') ? (
                    <span className="text-xs text-muted-foreground">—</span>
                ) : (
                    <div className="flex items-center gap-1">
                        {emp.wish_document_path ? (
                            <>
                                {canViewDocuments && (
                                <a 
                                    href={emp.wish_document_url || '#'} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                    title={emp.wish_document_name || 'عرض الوثيقة'}
                                >
                                    <FileText className="h-3.5 w-3.5" />
                                    <span className="truncate max-w-[80px]">{emp.wish_document_name || 'وثيقة'}</span>
                                </a>
                                )}
                                {canDeleteDocuments && (
                                <DeleteDocumentDialog
                                    employeeId={emp.id}
                                    employeeName={`${emp.firstname_ar} ${emp.lastname_ar}`}
                                    onConfirm={onDeleteDocument}
                                />
                                )}
                            </>
                        ) : hasMasterPdf ? (
                            canUploadDocuments && (
                            <>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="رقم الصفحة"
                                    value={pageNumbers[emp.id] || ''}
                                    onChange={(e) => onPageNumberChange(emp.id, e.target.value)}
                                    className="w-20 h-7 text-xs px-1.5 rounded border border-input bg-background text-right"
                                />
                                <button
                                    onClick={() => {
                                        const page = parseInt(pageNumbers[emp.id] || '');
                                        if (page && page > 0) onExtractDocument(emp.id, page);
                                    }}
                                    disabled={!pageNumbers[emp.id] || parseInt(pageNumbers[emp.id]) < 1}
                                    className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <FileUp className="h-3 w-3" />
                                    <span>استخراج</span>
                                </button>
                            </>
                            )
                        ) : (
                            canUploadDocuments && (
                            <label className="cursor-pointer inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary p-1 rounded border border-dashed border-border hover:border-primary/50">
                                <Upload className="h-3.5 w-3.5" />
                                <span>رفع</span>
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) onUploadDocument(emp.id, file);
                                        e.target.value = '';
                                    }}
                                />
                            </label>
                            )
                        )}
                    </div>
                )}
            </TableCell>
            <TableCell>
                    <Select
                        defaultValue={emp.wilaya_choice || "PENDING"}
                        onValueChange={(value) => onWishChange(emp.id, value)}
                        disabled={!canEditWish}
                    >
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="اختر الرغبة" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PENDING">قيد الانتظار</SelectItem>
                            <SelectItem value="MSILA">المسيلة</SelectItem>
                            <SelectItem value="BOU_SAADA">بوسعادة</SelectItem>
                        </SelectContent>
                    </Select>
            </TableCell>
            <TableCell>
                {emp.is_archived ? (
                    <Badge variant="secondary" className="flex w-fit items-center gap-1">
                        <Archive className="h-3 w-3" /> مؤرشف (المسيلة)
                    </Badge>
                ) : emp.wilaya_choice === 'BOU_SAADA' ? (
                    <Badge variant="default" className="flex w-fit items-center gap-1 bg-emerald-600 hover:bg-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> نشط (بوسعادة)
                    </Badge>
                ) : (
                    <Badge variant="outline" className="flex w-fit items-center gap-1 text-amber-600 border-amber-600">
                        <AlertCircle className="h-3 w-3" /> لم يحدد
                    </Badge>
                )}
            </TableCell>
        </TableRow>
    );

    if (employees.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <Search className="h-8 w-8 text-muted-foreground/50" />
                <span>لا يوجد موظفين مطابقين لمعايير البحث</span>
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-10 text-center">#</TableHead>
                        <TableHead>الاسم واللقب</TableHead>
                        <TableHead>الرتبة/المنصب</TableHead>
                        <TableHead>المؤسسة</TableHead>
                        <TableHead>الوثيقة</TableHead>
                        <TableHead>الرغبة (الولاية)</TableHead>
                        <TableHead>حالة الملف</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {employees.map((emp, idx) => (
                        <EmployeeRow key={emp.id} emp={emp} idx={idx} />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function GroupedFieldTable({ employees, onWishChange, onUploadDocument, onDeleteDocument, onExtractDocument, pageNumbers, onPageNumberChange, hasMasterPdf, canViewDocuments, canUploadDocuments, canDeleteDocuments, canEditWish, groupBy }: WishesTableProps & { groupBy: string }) {
    const locale = useLocale();
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    
    const groupedEmployees = useMemo(() => {
        const groups: Record<string, { name: string; employees: Employee[] }> = {};
        const getGroupKey = (emp: Employee): { key: string; name: string } | null => {
            if (groupBy === 'grade') {
                const grade = emp.grade;
                if (!grade) return { key: 'no-grade', name: 'بدون رتبة' };
                return {
                    key: grade.id,
                    name: locale === 'ar' ? grade.name_ar : grade.name_fr || grade.name_ar
                };
            }
            if (groupBy === 'position') {
                const pos = emp.position;
                if (!pos) return { key: 'no-position', name: 'بدون منصب' };
                return {
                    key: pos.id,
                    name: locale === 'ar' ? pos.name_ar : pos.name_fr || pos.name_ar
                };
            }
            return null;
        };

        employees.forEach(emp => {
            const info = getGroupKey(emp);
            if (!info) return;
            if (!groups[info.key]) {
                groups[info.key] = { name: info.name, employees: [] };
            }
            groups[info.key].employees.push(emp);
        });

        return groups;
    }, [employees, groupBy, locale]);

    const toggleGroup = (groupKey: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupKey)) {
                next.delete(groupKey);
            } else {
                next.add(groupKey);
            }
            return next;
        });
    };

    const groupKeys = useMemo(() => {
        return Object.keys(groupedEmployees).sort((a, b) => {
            return groupedEmployees[a].name.localeCompare(groupedEmployees[b].name, 'ar');
        });
    }, [groupedEmployees]);

    if (groupKeys.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <Search className="h-8 w-8 text-muted-foreground/50" />
                <span>لا يوجد موظفين مطابقين لمعايير البحث</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {groupKeys.map((groupKey) => {
                const group = groupedEmployees[groupKey];
                if (group.employees.length === 0) return null;
                const isCollapsed = collapsedGroups.has(groupKey);

                return (
                    <div key={groupKey} className="rounded-lg border bg-card shadow-sm overflow-hidden">
                        {/* Group Header */}
                        <button
                            onClick={() => toggleGroup(groupKey)}
                            className="w-full flex items-center justify-between px-4 py-3
                                       bg-gradient-to-l from-slate-50 to-transparent
                                       dark:from-slate-800/20 dark:to-transparent
                                       hover:from-slate-100 dark:hover:from-slate-800/30
                                       transition-colors border-b border-border"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full
                                                bg-slate-100 dark:bg-slate-800/50">
                                    <Users className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                                </div>
                                <div className="text-end">
                                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                                        {group.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {group.employees.length} موظف
                                    </p>
                                </div>
                            </div>
                            {isCollapsed ? (
                                <ChevronDown className="h-5 w-5 text-slate-400" />
                            ) : (
                                <ChevronUp className="h-5 w-5 text-slate-400" />
                            )}
                        </button>

                        {/* Group Content */}
                        {!isCollapsed && <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10 text-center">#</TableHead>
                                        <TableHead>الاسم واللقب</TableHead>
                                        <TableHead>الرتبة/المنصب</TableHead>
                                        <TableHead>المؤسسة</TableHead>
                                        <TableHead>الوثيقة</TableHead>
                                        <TableHead>الرغبة (الولاية)</TableHead>
                                        <TableHead>حالة الملف</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {group.employees.map((emp, idx) => (
                                        <TableRow key={emp.id} className={emp.is_archived ? "opacity-60 bg-muted/50" : ""}>
                                            <TableCell className="text-center text-muted-foreground text-xs w-10">{idx + 1}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{emp.firstname_ar} {emp.lastname_ar}</span>
                                                    {emp.firstname_fr && (
                                                        <span className="text-xs text-muted-foreground">{emp.firstname_fr} {emp.lastname_fr}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span>{emp.grade?.name_ar || "-"}</span>
                                                    <span className="text-xs text-muted-foreground">{emp.position?.name_ar || ""}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {['SECONDMENT', 'OUT_OF_FRAME', 'DETACHMENT', 'MISE_A_DISPOSITION'].includes(emp.legal_position || '') && emp.legal_position_destination ? (
                                                    <div className="flex flex-col truncate max-w-[260px]">
                                                        <span className="font-medium text-amber-700 dark:text-amber-500 truncate" title={`${emp.legal_position === 'OUT_OF_FRAME' ? 'خارج الإطار' : emp.legal_position === 'MISE_A_DISPOSITION' ? 'تحت التصرف' : 'انتداب'}: ${emp.legal_position_destination}`}>
                                                            {emp.legal_position === 'OUT_OF_FRAME' ? 'خارج الإطار' : emp.legal_position === 'MISE_A_DISPOSITION' ? 'تحت التصرف' : 'انتداب'}: {emp.legal_position_destination}
                                                        </span>
                                                        {emp.institution?.name_ar && <span className="text-xs text-muted-foreground line-through opacity-70 truncate" title={emp.institution.name_ar}>{emp.institution.name_ar}</span>}
                                                    </div>
                                                ) : emp.position?.name_ar?.includes('مستشار مقاطعة') && emp.work_district ? (
                                                    <span className="font-medium text-blue-700 dark:text-blue-500 truncate block max-w-[260px]" title={`مقاطعة ${emp.work_district.name_ar}`}>
                                                        مقاطعة {emp.work_district.name_ar}
                                                    </span>
                                                ) : (emp.position?.name_ar?.includes('ملحق بلدي') || emp.position?.name_ar?.includes('ملحق رياضة') || emp.position?.name_ar?.includes('مندوب')) && emp.work_municipality ? (
                                                    <span className="font-medium text-green-700 dark:text-green-500 truncate block max-w-[260px]" title={`بلدية ${emp.work_municipality.name_ar}`}>
                                                        بلدية {emp.work_municipality.name_ar}
                                                    </span>
                                                ) : (
                                                    <span className="truncate block max-w-[260px]" title={emp.institution?.name_ar || ''}>
                                                        {emp.institution?.name_ar || "-"}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {(!emp.wilaya_choice || emp.wilaya_choice === 'PENDING') ? (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        {emp.wish_document_path ? (
                                                            <>
                                                                {canViewDocuments && (
                                                                <a 
                                                                    href={emp.wish_document_url || '#'} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                                                    title={emp.wish_document_name || 'عرض الوثيقة'}
                                                                >
                                                                    <FileText className="h-3.5 w-3.5" />
                                                                    <span className="truncate max-w-[80px]">{emp.wish_document_name || 'وثيقة'}</span>
                                                                </a>
                                                                )}
                                                                {canDeleteDocuments && (
                                                                <DeleteDocumentDialog
                                                                    employeeId={emp.id}
                                                                    employeeName={`${emp.firstname_ar} ${emp.lastname_ar}`}
                                                                    onConfirm={onDeleteDocument}
                                                                />
                                                                )}
                                                            </>
                                                        ) : hasMasterPdf ? (
                                                            canUploadDocuments && (
                                                            <>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    placeholder="رقم الصفحة"
                                                                    value={pageNumbers[emp.id] || ''}
                                                                    onChange={(e) => onPageNumberChange(emp.id, e.target.value)}
                                                                    className="w-20 h-7 text-xs px-1.5 rounded border border-input bg-background text-right"
                                                                />
                                                                <button
                                                                    onClick={() => {
                                                                        const page = parseInt(pageNumbers[emp.id] || '');
                                                                        if (page && page > 0) onExtractDocument(emp.id, page);
                                                                    }}
                                                                    disabled={!pageNumbers[emp.id] || parseInt(pageNumbers[emp.id]) < 1}
                                                                    className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    <FileUp className="h-3 w-3" />
                                                                    <span>استخراج</span>
                                                                </button>
                                                            </>
                                                            )
                                                        ) : (
                                                            canUploadDocuments && (
                                                            <label className="cursor-pointer inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary p-1 rounded border border-dashed border-border hover:border-primary/50">
                                                                <Upload className="h-3.5 w-3.5" />
                                                                <span>رفع</span>
                                                                <input
                                                                    type="file"
                                                                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                                                                    className="hidden"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) onUploadDocument(emp.id, file);
                                                                        e.target.value = '';
                                                                    }}
                                                                />
                                                            </label>
                                                            )
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                    <Select
                                                        defaultValue={emp.wilaya_choice || "PENDING"}
                                                        onValueChange={(value) => onWishChange(emp.id, value)}
                                                        disabled={!canEditWish}
                                                    >
                                                        <SelectTrigger className="w-[160px]">
                                                            <SelectValue placeholder="اختر الرغبة" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="PENDING">قيد الانتظار</SelectItem>
                                                            <SelectItem value="MSILA">المسيلة</SelectItem>
                                                            <SelectItem value="BOU_SAADA">بوسعادة</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                            </TableCell>
                                            <TableCell>
                                                {emp.is_archived ? (
                                                    <Badge variant="secondary" className="flex w-fit items-center gap-1">
                                                        <Archive className="h-3 w-3" /> مؤرشف (المسيلة)
                                                    </Badge>
                                                ) : emp.wilaya_choice === 'BOU_SAADA' ? (
                                                    <Badge variant="default" className="flex w-fit items-center gap-1 bg-emerald-600 hover:bg-emerald-700">
                                                        <CheckCircle2 className="h-3 w-3" /> نشط (بوسعادة)
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="flex w-fit items-center gap-1 text-amber-600 border-amber-600">
                                                        <AlertCircle className="h-3 w-3" /> لم يحدد
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>}
                    </div>
                    );
                })}
        </div>
    );
}

// ==================== Second Delete Button Instance ====================

function GroupedWishesTable({ employees, onWishChange, onUploadDocument, onDeleteDocument, onExtractDocument, pageNumbers, onPageNumberChange, hasMasterPdf, canViewDocuments, canUploadDocuments, canDeleteDocuments, canEditWish }: WishesTableProps) {
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    
    const groupedEmployees = useMemo(() => {
        const groups: Record<string, { name: string; employees: Employee[]; icon: React.ReactNode; badge: React.ReactNode }> = {
            PENDING: { 
                name: 'قيد الانتظار', 
                employees: [],
                icon: <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
                badge: <Badge variant="outline" className="text-amber-600 border-amber-600">قيد الانتظار</Badge>
            },
            MSILA: { 
                name: 'المسيلة', 
                employees: [],
                icon: <Archive className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
                badge: <Badge variant="secondary">المسيلة</Badge>
            },
            BOU_SAADA: { 
                name: 'بوسعادة', 
                employees: [],
                icon: <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
                badge: <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">بوسعادة</Badge>
            }
        };

        employees.forEach(emp => {
            const key = emp.wilaya_choice || 'PENDING';
            if (groups[key]) {
                groups[key].employees.push(emp);
            }
        });

        return groups;
    }, [employees]);

    const toggleGroup = (groupKey: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupKey)) {
                next.delete(groupKey);
            } else {
                next.add(groupKey);
            }
            return next;
        });
    };

    const groupKeys = ['PENDING', 'MSILA', 'BOU_SAADA'] as const;
    
    // Check if all groups are empty
    const hasAnyEmployees = groupKeys.some(key => groupedEmployees[key].employees.length > 0);
    
    if (!hasAnyEmployees) {
        return (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <Search className="h-8 w-8 text-muted-foreground/50" />
                <span>لا يوجد موظفين مطابقين لمعايير البحث</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {groupKeys.map((groupKey) => {
                const group = groupedEmployees[groupKey];
                if (group.employees.length === 0) return null;
                const isCollapsed = collapsedGroups.has(groupKey);

                return (
                    <div key={groupKey} className="rounded-lg border bg-card shadow-sm overflow-hidden">
                        {/* Group Header */}
                        <button
                            onClick={() => toggleGroup(groupKey)}
                            className="w-full flex items-center justify-between px-4 py-3
                                        bg-gradient-to-l from-emerald-50 to-transparent
                                        dark:from-emerald-900/20 dark:to-transparent
                                        hover:from-emerald-100 dark:hover:from-emerald-900/30
                                        transition-colors border-b border-border"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full
                                                            bg-emerald-100 dark:bg-emerald-900/50">
                                                {group.icon}
                                            </div>
                                            <div className="text-end">
                                                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                                                    {group.name}
                                                </h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    {group.employees.length} موظف
                                                </p>
                                            </div>
                                        </div>
                                        {isCollapsed ? (
                                            <ChevronDown className="h-5 w-5 text-slate-400" />
                                        ) : (
                                            <ChevronUp className="h-5 w-5 text-slate-400" />
                                        )}
                                    </button>

                                    {/* Group Content */}
                                    {!isCollapsed && <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-10 text-center">#</TableHead>
                                                    <TableHead>الاسم واللقب</TableHead>
                                                    <TableHead>الرتبة/المنصب</TableHead>
                                                    <TableHead>المؤسسة</TableHead>
                                                    <TableHead>الوثيقة</TableHead>
                                                    <TableHead>الرغبة (الولاية)</TableHead>
                                                    <TableHead>حالة الملف</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {group.employees.map((emp, idx) => (
                                                    <TableRow key={emp.id} className={emp.is_archived ? "opacity-60 bg-muted/50" : ""}>
                                                        <TableCell className="text-center text-muted-foreground text-xs w-10">{idx + 1}</TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{emp.firstname_ar} {emp.lastname_ar}</span>
                                                                {emp.firstname_fr && (
                                                                    <span className="text-xs text-muted-foreground">{emp.firstname_fr} {emp.lastname_fr}</span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span>{emp.grade?.name_ar || "-"}</span>
                                                                <span className="text-xs text-muted-foreground">{emp.position?.name_ar || ""}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {['SECONDMENT', 'OUT_OF_FRAME', 'DETACHMENT', 'MISE_A_DISPOSITION'].includes(emp.legal_position || '') && emp.legal_position_destination ? (
                                                                <div className="flex flex-col truncate max-w-[260px]">
                                                                    <span className="font-medium text-amber-700 dark:text-amber-500 truncate" title={`${emp.legal_position === 'OUT_OF_FRAME' ? 'خارج الإطار' : emp.legal_position === 'MISE_A_DISPOSITION' ? 'تحت التصرف' : 'انتداب'}: ${emp.legal_position_destination}`}>
                                                                        {emp.legal_position === 'OUT_OF_FRAME' ? 'خارج الإطار' : emp.legal_position === 'MISE_A_DISPOSITION' ? 'تحت التصرف' : 'انتداب'}: {emp.legal_position_destination}
                                                                    </span>
                                                                    {emp.institution?.name_ar && <span className="text-xs text-muted-foreground line-through opacity-70 truncate" title={emp.institution.name_ar}>{emp.institution.name_ar}</span>}
                                                                </div>
                                                            ) : emp.position?.name_ar?.includes('مستشار مقاطعة') && emp.work_district ? (
                                                                <span className="font-medium text-blue-700 dark:text-blue-500 truncate block max-w-[260px]" title={`مقاطعة ${emp.work_district.name_ar}`}>
                                                                    مقاطعة {emp.work_district.name_ar}
                                                                </span>
                                                            ) : (emp.position?.name_ar?.includes('ملحق بلدي') || emp.position?.name_ar?.includes('ملحق رياضة') || emp.position?.name_ar?.includes('مندوب')) && emp.work_municipality ? (
                                                                <span className="font-medium text-green-700 dark:text-green-500 truncate block max-w-[260px]" title={`بلدية ${emp.work_municipality.name_ar}`}>
                                                                    بلدية {emp.work_municipality.name_ar}
                                                                </span>
                                                            ) : (
                                                                <span className="truncate block max-w-[260px]" title={emp.institution?.name_ar || ''}>
                                                                    {emp.institution?.name_ar || "-"}
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {(!emp.wilaya_choice || emp.wilaya_choice === 'PENDING') ? (
                                                                <span className="text-xs text-muted-foreground">—</span>
                                                            ) : (
                                                                <div className="flex items-center gap-1">
                                                                    {emp.wish_document_path ? (
                                                                        <>
                                                                            {canViewDocuments && (
                                                                            <a 
                                                                                href={emp.wish_document_url || '#'} 
                                                                                target="_blank" 
                                                                                rel="noopener noreferrer"
                                                                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                                                                title={emp.wish_document_name || 'عرض الوثيقة'}
                                                                            >
                                                                                <FileText className="h-3.5 w-3.5" />
                                                                                <span className="truncate max-w-[80px]">{emp.wish_document_name || 'وثيقة'}</span>
                                                                            </a>
                                                                            )}
                                                                            {canDeleteDocuments && (
                                                                            <DeleteDocumentDialog
                                                                                employeeId={emp.id}
                                                                                employeeName={`${emp.firstname_ar} ${emp.lastname_ar}`}
                                                                                onConfirm={onDeleteDocument}
                                                                            />
                                                                            )}
                                                                        </>
                                                                    ) : hasMasterPdf ? (
                                                                        canUploadDocuments && (
                                                                        <>
                                                                            <input
                                                                                type="number"
                                                                                min="1"
                                                                                placeholder="رقم الصفحة"
                                                                                value={pageNumbers[emp.id] || ''}
                                                                                onChange={(e) => onPageNumberChange(emp.id, e.target.value)}
                                                                                className="w-20 h-7 text-xs px-1.5 rounded border border-input bg-background text-right"
                                                                            />
                                                                            <button
                                                                                onClick={() => {
                                                                                    const page = parseInt(pageNumbers[emp.id] || '');
                                                                                    if (page && page > 0) onExtractDocument(emp.id, page);
                                                                                }}
                                                                                disabled={!pageNumbers[emp.id] || parseInt(pageNumbers[emp.id]) < 1}
                                                                                className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            >
                                                                                <FileUp className="h-3 w-3" />
                                                                                <span>استخراج</span>
                                                                            </button>
                                                                        </>
                                                                        )
                                                                    ) : (
                                                                        canUploadDocuments && (
                                                                        <label className="cursor-pointer inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary p-1 rounded border border-dashed border-border hover:border-primary/50">
                                                                            <Upload className="h-3.5 w-3.5" />
                                                                            <span>رفع</span>
                                                                            <input
                                                                                type="file"
                                                                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                                                                className="hidden"
                                                                                onChange={(e) => {
                                                                                    const file = e.target.files?.[0];
                                                                                    if (file) onUploadDocument(emp.id, file);
                                                                                    e.target.value = '';
                                                                                }}
                                                                            />
                                                                        </label>
                                                                        )
                                                                    )}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                    <Select
                                                        defaultValue={emp.wilaya_choice || "PENDING"}
                                                        onValueChange={(value) => onWishChange(emp.id, value)}
                                                        disabled={!canEditWish}
                                                    >
                                                        <SelectTrigger className="w-[160px]">
                                                            <SelectValue placeholder="اختر الرغبة" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="PENDING">قيد الانتظار</SelectItem>
                                                            <SelectItem value="MSILA">المسيلة</SelectItem>
                                                            <SelectItem value="BOU_SAADA">بوسعادة</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                            </TableCell>
                                            <TableCell>
                                                {emp.is_archived ? (
                                                    <Badge variant="secondary" className="flex w-fit items-center gap-1">
                                                        <Archive className="h-3 w-3" /> مؤرشف (المسيلة)
                                                    </Badge>
                                                ) : emp.wilaya_choice === 'BOU_SAADA' ? (
                                                    <Badge variant="default" className="flex w-fit items-center gap-1 bg-emerald-600 hover:bg-emerald-700">
                                                        <CheckCircle2 className="h-3 w-3" /> نشط (بوسعادة)
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="flex w-fit items-center gap-1 text-amber-600 border-amber-600">
                                                        <AlertCircle className="h-3 w-3" /> لم يحدد
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>}
                    </div>
                    );
                })}
        </div>
    );
}

// ==================== Employee Row Component (reusable) ====================

interface EmployeeRowProps {
    emp: Employee;
    idx: number;
    onWishChange: (employeeId: string, value: string) => Promise<void>;
    onUploadDocument: (employeeId: string, file: File) => Promise<void>;
    onDeleteDocument: (employeeId: string) => Promise<void>;
    onExtractDocument: (employeeId: string, pageNumber: number) => Promise<void>;
    pageNumbers: Record<string, string>;
    onPageNumberChange: (employeeId: string, value: string) => Promise<void>;
    hasMasterPdf: boolean;
    canViewDocuments: boolean;
    canUploadDocuments: boolean;
    canDeleteDocuments: boolean;
    canEditWish: boolean;
}

function EmployeeRowInTable({ emp, idx, onWishChange, onUploadDocument, onDeleteDocument, onExtractDocument, pageNumbers, onPageNumberChange, hasMasterPdf, canViewDocuments, canUploadDocuments, canDeleteDocuments, canEditWish }: EmployeeRowProps) {
    return (
        <TableRow className={emp.is_archived ? "opacity-60 bg-muted/50" : ""}>
            <TableCell className="text-center text-muted-foreground text-xs w-10">{idx + 1}</TableCell>
            <TableCell>
                <div className="flex flex-col">
                    <span className="font-medium">{emp.firstname_ar} {emp.lastname_ar}</span>
                    {emp.firstname_fr && (
                        <span className="text-xs text-muted-foreground">{emp.firstname_fr} {emp.lastname_fr}</span>
                    )}
                </div>
            </TableCell>
            <TableCell>
                <div className="flex flex-col">
                    <span>{emp.grade?.name_ar || "-"}</span>
                    <span className="text-xs text-muted-foreground">{emp.position?.name_ar || ""}</span>
                </div>
            </TableCell>
            <TableCell>
                {(!emp.wilaya_choice || emp.wilaya_choice === 'PENDING') ? (
                    <span className="text-xs text-muted-foreground">—</span>
                ) : (
                    <div className="flex items-center gap-1">
                        {emp.wish_document_path ? (
                            <>
                                {canViewDocuments && (
                                <a 
                                    href={emp.wish_document_url || '#'} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                    title={emp.wish_document_name || 'عرض الوثيقة'}
                                >
                                    <FileText className="h-3.5 w-3.5" />
                                    <span className="truncate max-w-[80px]">{emp.wish_document_name || 'وثيقة'}</span>
                                </a>
                                )}
                                {canDeleteDocuments && (
                                <DeleteDocumentDialog
                                    employeeId={emp.id}
                                    employeeName={`${emp.firstname_ar} ${emp.lastname_ar}`}
                                    onConfirm={onDeleteDocument}
                                />
                                )}
                            </>
                        ) : hasMasterPdf ? (
                            canUploadDocuments && (
                            <>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="رقم الصفحة"
                                    value={pageNumbers[emp.id] || ''}
                                    onChange={(e) => onPageNumberChange(emp.id, e.target.value)}
                                    className="w-20 h-7 text-xs px-1.5 rounded border border-input bg-background text-right"
                                />
                                <button
                                    onClick={() => {
                                        const page = parseInt(pageNumbers[emp.id] || '');
                                        if (page && page > 0) onExtractDocument(emp.id, page);
                                    }}
                                    disabled={!pageNumbers[emp.id] || parseInt(pageNumbers[emp.id]) < 1}
                                    className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <FileUp className="h-3 w-3" />
                                    <span>استخراج</span>
                                </button>
                            </>
                            )
                        ) : (
                            canUploadDocuments && (
                            <label className="cursor-pointer inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary p-1 rounded border border-dashed border-border hover:border-primary/50">
                                <Upload className="h-3.5 w-3.5" />
                                <span>رفع</span>
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) onUploadDocument(emp.id, file);
                                        e.target.value = '';
                                    }}
                                />
                            </label>
                            )
                        )}
                    </div>
                )}
            </TableCell>
            <TableCell>
                    <Select
                        defaultValue={emp.wilaya_choice || "PENDING"}
                        onValueChange={(value) => onWishChange(emp.id, value)}
                        disabled={!canEditWish}
                    >
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="اختر الرغبة" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PENDING">قيد الانتظار</SelectItem>
                            <SelectItem value="MSILA">المسيلة</SelectItem>
                            <SelectItem value="BOU_SAADA">بوسعادة</SelectItem>
                        </SelectContent>
                    </Select>
            </TableCell>
        </TableRow>
    );
}

// ==================== Grouped Document Status Table ====================

function GroupedDocumentStatusTable({
    employees,
    onWishChange,
    onUploadDocument,
    onDeleteDocument,
    onExtractDocument,
    pageNumbers,
    onPageNumberChange,
    hasMasterPdf,
    canViewDocuments,
    canUploadDocuments,
    canDeleteDocuments,
    canEditWish
}: WishesTableProps) {
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    const groupedEmployees = useMemo(() => {
        const groups: Record<string, { name: string; employees: Employee[] }> = {
            uploaded: { name: 'مرفوعة', employees: [] },
            not_uploaded: { name: 'غير مرفوعة', employees: [] },
        };

        employees.forEach(emp => {
            if (emp.wish_document_path) {
                groups.uploaded.employees.push(emp);
            } else {
                groups.not_uploaded.employees.push(emp);
            }
        });

        return groups;
    }, [employees]);

    const toggleCollapse = (key: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    if (employees.length === 0) {
        return <p className="text-center text-muted-foreground py-8">لا يوجد موظفون</p>;
    }

    return (
        <div className="space-y-4">
            {Object.entries(groupedEmployees).map(([key, group]) => {
                if (group.employees.length === 0) return null;
                const isCollapsed = collapsedGroups.has(key);

                return (
                    <Card key={key}>
                        <CardHeader
                            className="cursor-pointer select-none py-3 px-4"
                            onClick={() => toggleCollapse(key)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                                    <CardTitle className="text-base font-medium">
                                        {key === 'uploaded' ? (
                                            <span className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-green-600" />
                                                {group.name}
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                <FileUp className="h-4 w-4 text-amber-600" />
                                                {group.name}
                                            </span>
                                        )}
                                    </CardTitle>
                                </div>
                                <Badge variant="secondary">{group.employees.length}</Badge>
                            </div>
                        </CardHeader>
                        {!isCollapsed && (
                            <CardContent className="px-0 pb-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-center w-10">#</TableHead>
                                            <TableHead>الموظف</TableHead>
                                            <TableHead>الرتبة / المنصب</TableHead>
                                            <TableHead>الرغبة</TableHead>
                                            <TableHead>الوثيقة</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {group.employees.map((emp, idx) => (
                                            <EmployeeRowInTable
                                                key={emp.id}
                                                emp={emp}
                                                idx={idx}
                                                onWishChange={onWishChange}
                                                onUploadDocument={onUploadDocument}
                                                onDeleteDocument={onDeleteDocument}
                                                onExtractDocument={onExtractDocument}
                                                pageNumbers={pageNumbers}
                                                onPageNumberChange={onPageNumberChange}
                                                hasMasterPdf={hasMasterPdf}
                                                canViewDocuments={canViewDocuments}
                                                canUploadDocuments={canUploadDocuments}
                                                canDeleteDocuments={canDeleteDocuments}
                                                canEditWish={canEditWish}
                                            />
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        )}
                    </Card>
                );
            })}
        </div>
    );
}

export default function WishesPage() {
    const t = useTranslations("employees");
    const { hasPermission } = useAuthStore();
    const canManageMasterPdf = hasPermission("employees", "wishes.master_pdf");
    const canExport = hasPermission("employees", "wishes.export");
    const canViewDocuments = hasPermission("employees", "wishes.documents.view");
    const canUploadDocuments = hasPermission("employees", "wishes.documents.upload");
    const canDeleteDocuments = hasPermission("employees", "wishes.documents.delete");
    const canEditWish = hasPermission("employees", "wishes.edit");
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [showProgress, setShowProgress] = useState(false);
    const [progressData, setProgressData] = useState({ current: 0, total: 0, employeeName: '' });
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<string>('grade');
    const [activeFilters, setActiveFilters] = useState<Record<string, any>>({ original_admin: 'DJS' });
    const [groupBy, setGroupBy] = useState<string | null>('wilaya_choice');
    const [grades, setGrades] = useState<Grade[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [masterPdfs, setMasterPdfs] = useState<MasterPDF[]>([]);
    const [uploadingMasterPdf, setUploadingMasterPdf] = useState(false);
    const [pageNumbers, setPageNumbers] = useState<Record<string, string>>({});
    const [extractingId, setExtractingId] = useState<string | null>(null);

    const fetchEmployees = useCallback(async () => {
        setLoading(true);
        try {
            // Include archived so we see the M\'sila choices as well
            const params: Record<string, any> = { size: 1000, include_archived: true, sort_by: "import_order" };
            if (searchQuery) params.search = searchQuery;
            if (activeFilters.original_admin) params.original_admin = activeFilters.original_admin;
            const data = await employeesApi.getAll(params as any);
            setEmployees(data.items);
        } catch (error) {
            toast.error("حدث خطأ أثناء جلب قائمة الموظفين");
        } finally {
            setLoading(false);
        }
    }, [searchQuery]);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    const fetchMasterPdfs = useCallback(async () => {
        try {
            const data = await employeesApi.listMasterPdfs();
            setMasterPdfs(data);
        } catch (error) {
            console.error("Failed to fetch master PDFs:", error);
        }
    }, []);
    
    useEffect(() => {
        if (canManageMasterPdf) {
            fetchMasterPdfs();
        }
    }, [canManageMasterPdf, fetchMasterPdfs]);

    // Fetch grades and positions for filter dropdowns
    useEffect(() => {
        const fetchReferences = async () => {
            try {
                const [gradesData, positionsData] = await Promise.all([
                    employeesApi.getGrades(),
                    employeesApi.getPositions()
                ]);
                setGrades(gradesData);
                setPositions(positionsData);
            } catch (error) {
                // Silently fail - filters won't be available
            }
        };
        if (hasPermission("employees", "view") || hasPermission("employees", "edit")) {
            fetchReferences();
        }
    }, [hasPermission]);

    // Client-side filtering for wilaya_choice (not supported by backend API)
    const filteredEmployees = useMemo(() => {
        let result = employees;

        // Filter by wilaya_choice
        if (activeFilters.wilaya_choice) {
            result = result.filter(emp => emp.wilaya_choice === activeFilters.wilaya_choice);
        }

        // Filter by original administration
        if (activeFilters.original_admin) {
            result = result.filter(emp => emp.original_administration_type === activeFilters.original_admin);
        }

        // Filter by sector (as a complement to backend filtering)
        if (activeFilters.sector) {
            result = result.filter(emp => {
                const instSector = (emp.institution as any)?.sector || '';
                if (activeFilters.sector === 'youth') return instSector === 'YOUTH' || instSector === 'youth';
                if (activeFilters.sector === 'sports') return instSector === 'SPORTS' || instSector === 'sports';
                return true;
            });
        }

        // Filter by grade (الرتبة) - client-side multiselect
        if (activeFilters.grade_id && Array.isArray(activeFilters.grade_id) && activeFilters.grade_id.length > 0) {
            result = result.filter(emp => emp.grade?.id && activeFilters.grade_id.includes(emp.grade.id));
        }

        // Filter by position (المنصب) - client-side multiselect
        if (activeFilters.position_id && Array.isArray(activeFilters.position_id) && activeFilters.position_id.length > 0) {
            result = result.filter(emp => {
                const primaryMatch = emp.position?.id && activeFilters.position_id.includes(emp.position.id);
                const secondaryMatch = (emp as any).secondary_position?.id && activeFilters.position_id.includes((emp as any).secondary_position.id);
                return primaryMatch || secondaryMatch;
            });
        }

        // Filter by document status (uploaded / not uploaded)
        if (activeFilters.document_status) {
            if (activeFilters.document_status === 'uploaded') {
                result = result.filter(emp => emp.wish_document_path != null);
            } else if (activeFilters.document_status === 'not_uploaded') {
                result = result.filter(emp => emp.wish_document_path == null);
            }
        }

        // Apply sorting based on sortBy
        const sorted = [...result];
        if (sortBy === 'grade') {
            sorted.sort((a, b) => {
                const aLevel = (a.grade as any)?.level ?? 0;
                const bLevel = (b.grade as any)?.level ?? 0;
                if (aLevel !== bLevel) return bLevel - aLevel;
                const aName = (a.grade as any)?.name_ar || '';
                const bName = (b.grade as any)?.name_ar || '';
                return aName.localeCompare(bName, 'ar');
            });
        } else if (sortBy === 'alphabetical') {
            sorted.sort((a, b) => {
                const aName = `${a.lastname_ar || ''} ${a.firstname_ar || ''}`.trim();
                const bName = `${b.lastname_ar || ''} ${b.firstname_ar || ''}`.trim();
                return aName.localeCompare(bName, 'ar');
            });
        } else if (sortBy === 'position') {
            sorted.sort((a, b) => {
                const aOrder = (a.position as any)?.display_order ?? 999;
                const bOrder = (b.position as any)?.display_order ?? 999;
                if (aOrder !== bOrder) return aOrder - bOrder;
                const aPos = (a.position as any)?.name_ar || '';
                const bPos = (b.position as any)?.name_ar || '';
                const cmp = aPos.localeCompare(bPos, 'ar');
                if (cmp !== 0) return cmp;
                return `${a.lastname_ar || ''} ${a.firstname_ar || ''}`.localeCompare(`${b.lastname_ar || ''} ${b.firstname_ar || ''}`, 'ar');
            });
        }
        // If sortBy is '' or any other value, keep backend order (import_order ASC)
        result = sorted;

        // Exclude only the general director (المدير العام) - position code DIR
        result = result.filter(emp => {
            const posCode = emp.position?.code || '';
            return posCode !== 'DIR';
        });

        return result;
    }, [employees, activeFilters, sortBy]);

    const handleWishChange = async (employeeId: string, value: string) => {
        try {
            const res = await employeesApi.updateWish(employeeId, value);
            toast.success(res.message);
            // Update local state to reflect change without refetching
            setEmployees(prev => prev.map(emp => {
                if (emp.id === employeeId) {
                    return { ...emp, wilaya_choice: value as Employee["wilaya_choice"], is_archived: res.is_archived };
                }
                return emp;
            }));
        } catch (error) {
            toast.error("فشل تحديث الرغبة");
        }
    };

    const handleUploadDocument = async (employeeId: string, file: File) => {
        try {
            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                toast.error("حجم الملف يجب أن لا يتجاوز 10 ميغابايت");
                return;
            }
            const res = await employeesApi.uploadWishDocument(employeeId, file);
            toast.success(res.message);
            // Update local state
            setEmployees(prev => prev.map(emp => {
                if (emp.id === employeeId) {
                    return { 
                        ...emp, 
                        wish_document_path: res.file_path,
                        wish_document_name: res.file_name,
                        wish_document_url: res.file_url,
                    };
                }
                return emp;
            }));
        } catch (error) {
            toast.error("فشل رفع الوثيقة");
        }
    };

    const handleDeleteDocument = async (employeeId: string) => {
        try {
            const res = await employeesApi.deleteWishDocument(employeeId);
            toast.success(res.message);
            // Update local state
            setEmployees(prev => prev.map(emp => {
                if (emp.id === employeeId) {
                    return { 
                        ...emp, 
                        wish_document_path: null,
                        wish_document_name: null,
                        wish_document_url: null,
                    };
                }
                return emp;
            }));
        } catch (error) {
            toast.error("فشل حذف الوثيقة");
        }
    };

    const handleUploadMasterPdf = async (file: File) => {
        setUploadingMasterPdf(true);
        try {
            if (file.size > 200 * 1024 * 1024) {
                toast.error("حجم الملف يجب أن لا يتجاوز 200 ميغابايت");
                return;
            }
            const result = await employeesApi.uploadMasterPdf(file);
            toast.success(`تم رفع الملف الرئيسي: ${result.original_filename}`);
            await fetchMasterPdfs();
        } catch (error) {
            toast.error("فشل رفع الملف الرئيسي");
        } finally {
            setUploadingMasterPdf(false);
        }
    };

    const handleDeleteMasterPdf = async (id: string) => {
        try {
            await employeesApi.deleteMasterPdf(id);
            toast.success("تم حذف الملف الرئيسي");
            await fetchMasterPdfs();
        } catch (error) {
            toast.error("فشل حذف الملف الرئيسي");
        }
    };

    const handlePageNumberChange = async (employeeId: string, value: string) => {
        setPageNumbers(prev => ({ ...prev, [employeeId]: value }));
    };

    const handleExtractDocument = async (employeeId: string, pageNumber: number) => {
        if (!activeMasterPdf) {
            toast.error("الرجاء رفع ملف PDF رئيسي أولاً");
            return;
        }
        setExtractingId(employeeId);
        try {
            const res = await employeesApi.extractAndUploadWishDocument(
                employeeId, 
                activeMasterPdf.id, 
                pageNumber
            );
            toast.success(res.message);
            // Update local state
            setEmployees(prev => prev.map(emp => {
                if (emp.id === employeeId) {
                    return { 
                        ...emp, 
                        wish_document_path: res.file_path,
                        wish_document_name: res.file_name,
                        wish_document_url: res.file_url,
                    };
                }
                return emp;
            }));
            setPageNumbers(prev => {
                const next = { ...prev };
                delete next[employeeId];
                return next;
            });
        } catch (error) {
            toast.error("فشل استخراج الوثيقة");
        } finally {
            setExtractingId(null);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const fields = [
                'full_name_ar', 'full_name_fr', 'employee_number',
                'grade_text', 'position_text', 'institution',
                'sector', 'wilaya_choice', 'is_archived'
            ];
            const filters: Record<string, any> = {
                original_admin: activeFilters.original_admin || undefined,
                include_archived: true,
            };
            if (searchQuery) filters.search = searchQuery;

            // ⚠️ Important: These filters must stay in sync with filteredEmployees (lines ~1164-1249)
            // Add all client-side filters that affect the visible data so the export matches the UI
            if (activeFilters.wilaya_choice) filters.wilaya_choice = activeFilters.wilaya_choice;
            if (activeFilters.sector) filters.sector = activeFilters.sector;
            if (activeFilters.grade_id && Array.isArray(activeFilters.grade_id) && activeFilters.grade_id.length > 0) {
                filters.grade_id = activeFilters.grade_id;
            }
            if (activeFilters.position_id && Array.isArray(activeFilters.position_id) && activeFilters.position_id.length > 0) {
                filters.position_id = activeFilters.position_id;
            }
            // document_status is a client-side-only filter — not passed to backend

            // Exclude the general director (المدير العام) from export
            filters.exclude_position_codes = 'DIR';
            filters.sort_by = sortBy;
            await employeesApi.exportToExcel(fields, filters as any, 'wilaya_choice');
            toast.success("تم تصدير الرغبات بنجاح");
        } catch (error) {
            toast.error("فشل تصدير الرغبات");
        } finally {
            setExporting(false);
        }
    };

    const handleExportPdf = async () => {
        // ترتيب الموظفين بنفس الترتيب المرئي في الواجهة (PENDING ← MSILA ← BOU_SAADA)
        const visualGroupOrder = ['PENDING', 'MSILA', 'BOU_SAADA'];
        const orderedEmployees: typeof filteredEmployees = [];

        for (const group of visualGroupOrder) {
            const groupEmployees = filteredEmployees.filter(
                emp => (emp.wilaya_choice || 'PENDING') === group
            );
            orderedEmployees.push(...groupEmployees);
        }

        const employeeIds = orderedEmployees
            .filter(emp => emp.wish_document_path != null)
            .map(emp => emp.id);
        
        if (employeeIds.length === 0) {
            toast.error("لا توجد وثائق رغبات لتصديرها");
            return;
        }
        
        setShowProgress(true);
        setProgressData({ current: 0, total: employeeIds.length, employeeName: '' });
        
        await employeesApi.exportMergedWishPdfStream(
            employeeIds,
            // onProgress
            (current, total, employeeName) => {
                setProgressData({ current, total, employeeName });
            },
            // onComplete
            (downloadUrl) => {
                setShowProgress(false);
                toast.success("تم تصدير بطاقات الرغبات بنجاح");
                // Download the file
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.setAttribute('download', `wish_cards_merged_${new Date().toISOString().split('T')[0]}.pdf`);
                document.body.appendChild(link);
                link.click();
                link.remove();
            },
            // onError
            (message) => {
                setShowProgress(false);
                toast.error(message || "فشل تصدير بطاقات الرغبات");
            }
        );
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    const handleFilterChange = (filters: Record<string, any>) => {
        setActiveFilters(filters);
    };

    const handleGroupChange = (group: string | null) => {
        setGroupBy(group);
    };

    // Search filters for Odoo-style search
    const searchFilters = [
        {
            id: 'original_admin',
            label: 'الإدارة الأصلية',
            type: 'select' as const,
            defaultValue: 'DJS',
            options: [
                { label: 'مديرية الشباب والرياضة', value: 'DJS' },
                { label: 'ديوان مؤسسات الشباب', value: 'ODEJ' },
                { label: 'ديوان المركب الرياضي', value: 'OPOW' },
                { label: 'جهات أخرى', value: 'OTHER' }
            ]
        },
        {
            id: 'wilaya_choice',
            label: 'الرغبة',
            type: 'select' as const,
            options: [
                { label: 'قيد الانتظار', value: 'PENDING' },
                { label: 'المسيلة', value: 'MSILA' },
                { label: 'بوسعادة', value: 'BOU_SAADA' }
            ]
        },
        {
            id: 'sector',
            label: 'القطاع',
            type: 'select' as const,
            options: [
                { label: 'الكل', value: '' },
                { label: 'مؤسسات الشباب', value: 'youth' },
                { label: 'مؤسسات الرياضة', value: 'sports' }
            ]
        },
        {
            id: 'grade_id',
            label: 'الرتبة',
            type: 'multiselect' as const,
            options: grades.map(g => ({
                label: g.name_ar || g.name_fr || '',
                value: g.id
            }))
        },
        {
            id: 'position_id',
            label: 'المنصب',
            type: 'multiselect' as const,
            options: positions.map(p => ({
                label: p.name_ar || p.name_fr || '',
                value: p.id
            }))
        },
        {
            id: 'document_status',
            label: 'حالة الوثيقة',
            type: 'select' as const,
            options: [
                { value: 'uploaded', label: 'مرفوعة' },
                { value: 'not_uploaded', label: 'غير مرفوعة' },
            ]
        }
    ];

    // Group by options
    const groupByOptions = [
        { id: 'wilaya_choice', label: 'الرغبة' },
        { id: 'document_status', label: 'حالة الوثيقة' },
        { id: 'grade', label: 'الرتبة' },
        { id: 'position', label: 'المنصب' }
    ];

    const hasActiveMasterPdf = masterPdfs.length > 0;
    const activeMasterPdf = masterPdfs[0] || null;

    // Stats
    const stats = useMemo(() => {
        const total = filteredEmployees.length;
        const pending = filteredEmployees.filter(e => !e.wilaya_choice || e.wilaya_choice === 'PENDING').length;
        const msila = filteredEmployees.filter(e => e.wilaya_choice === 'MSILA').length;
        const bouSaada = filteredEmployees.filter(e => e.wilaya_choice === 'BOU_SAADA').length;
        return { total, pending, msila, bouSaada };
    }, [filteredEmployees]);

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Odoo Search Panel */}
            <div className="bg-card border-b border-border sticky top-0 z-40">
                <div className="flex flex-col gap-2 p-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">إدارة رغبات الموظفين</h1>
                            <p className="text-sm text-muted-foreground">
                                تحديد ولاية التبعية للموظف (المسيلة أو بوسعادة)
                            </p>
                        </div>
                        {canExport && (
                        <Button
                            onClick={handleExport}
                            disabled={exporting || loading}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                        >
                            {exporting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            {exporting ? 'جاري التصدير...' : 'تصدير Excel'}
                        </Button>
                        )}
                        {canExport && (
                        <Button
                            onClick={handleExportPdf}
                            disabled={exportingPdf || loading}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                        >
                            {exportingPdf ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <FileText className="h-4 w-4" />
                            )}
                            {exportingPdf ? 'جاري التصدير...' : 'تصدير بطاقة الرغبات PDF'}
                        </Button>
                        )}
                    </div>
                    <div className="flex justify-center">
                        <div className="w-full max-w-2xl">
                            <OdooSearch
                                placeholder="ابحث باسم الموظف، رقم التسجيل..."
                                filters={searchFilters}
                                groupByOptions={groupByOptions}
                                onSearch={handleSearch}
                                onFilterChange={handleFilterChange}
                                onGroupChange={handleGroupChange}
                                initialSearch={searchQuery}
                                initialGroupBy={groupBy}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-6 overflow-auto space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4">
                    <Card className="bg-card">
                        <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm font-medium text-muted-foreground">الإجمالي</CardTitle>
                        </CardHeader>
                        <CardContent className="py-2 px-4">
                            <div className="text-2xl font-bold">{stats.total}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                        <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">قيد الانتظار</CardTitle>
                        </CardHeader>
                        <CardContent className="py-2 px-4">
                            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.pending}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                        <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">المسيلة</CardTitle>
                        </CardHeader>
                        <CardContent className="py-2 px-4">
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.msila}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                        <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400">بوسعادة</CardTitle>
                        </CardHeader>
                        <CardContent className="py-2 px-4">
                            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.bouSaada}</div>
                        </CardContent>
                    </Card>
                </div>

                {canManageMasterPdf && (
                /* Master PDF Section */
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <FolderOpen className="h-4 w-4" />
                            إدارة الملف الرئيسي للرغبات
                        </CardTitle>
                        <CardDescription>
                            ارفع ملف PDF واحد يحتوي على جميع وثائق الرغبات، ثم أدخل رقم الصفحة لكل موظف لاستخراج وثيقته
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4 flex-wrap">
                            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium">
                                {uploadingMasterPdf ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Upload className="h-4 w-4" />
                                )}
                                {uploadingMasterPdf ? 'جاري الرفع...' : 'رفع ملف PDF رئيسي'}
                                <input
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleUploadMasterPdf(file);
                                        e.target.value = '';
                                    }}
                                />
                            </label>
                            
                            {masterPdfs.length > 0 && (
                                <div className="flex flex-wrap gap-2 items-center">
                                    {masterPdfs.map((pdf) => (
                                        <div key={pdf.id} className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md text-xs">
                                            <FileText className="h-3.5 w-3.5 text-primary" />
                                            <span className="font-medium truncate max-w-[200px]">{pdf.original_filename}</span>
                                            {pdf.total_pages && (
                                                <span className="text-muted-foreground">({pdf.total_pages} صفحة)</span>
                                            )}
                                            <button
                                                onClick={() => handleDeleteMasterPdf(pdf.id)}
                                                className="text-red-500 hover:text-red-700 p-0.5"
                                                title="حذف الملف الرئيسي"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
                )}

                {/* Main Table */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle>قائمة الموظفين</CardTitle>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">ترتيب:</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-card text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="">حسب ترتيب الإكسل</option>
                                    <option value="grade">حسب الرتبة</option>
                                    <option value="alphabetical">أبجدياً</option>
                                    <option value="position">حسب المنصب</option>
                                </select>
                            </div>
                        </div>
                        <CardDescription>
                            إجمالي: {filteredEmployees.length}
                            {activeFilters.wilaya_choice && ` • مرشح حسب: ${activeFilters.wilaya_choice === 'PENDING' ? 'قيد الانتظار' : activeFilters.wilaya_choice === 'MSILA' ? 'المسيلة' : 'بوسعادة'}`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex h-[30vh] items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <>
                                {groupBy === 'wilaya_choice' ? (
                                    <GroupedWishesTable
                                        employees={filteredEmployees}
                                        onWishChange={handleWishChange}
                                        onUploadDocument={handleUploadDocument}
                                        onDeleteDocument={handleDeleteDocument}
                                        onExtractDocument={handleExtractDocument}
                                        pageNumbers={pageNumbers}
                                        onPageNumberChange={handlePageNumberChange}
                                        hasMasterPdf={hasActiveMasterPdf}
                                        canViewDocuments={canViewDocuments}
                                        canUploadDocuments={canUploadDocuments}
                                        canDeleteDocuments={canDeleteDocuments}
                                        canEditWish={canEditWish}
                                    />
                                ) : groupBy === 'document_status' ? (
                                    <GroupedDocumentStatusTable
                                        employees={filteredEmployees}
                                        onWishChange={handleWishChange}
                                        onUploadDocument={handleUploadDocument}
                                        onDeleteDocument={handleDeleteDocument}
                                        onExtractDocument={handleExtractDocument}
                                        pageNumbers={pageNumbers}
                                        onPageNumberChange={handlePageNumberChange}
                                        hasMasterPdf={hasActiveMasterPdf}
                                        canViewDocuments={canViewDocuments}
                                        canUploadDocuments={canUploadDocuments}
                                        canDeleteDocuments={canDeleteDocuments}
                                        canEditWish={canEditWish}
                                    />
                                ) : groupBy === 'grade' || groupBy === 'position' ? (
                                    <GroupedFieldTable
                                        employees={filteredEmployees}
                                        onWishChange={handleWishChange}
                                        onUploadDocument={handleUploadDocument}
                                        onDeleteDocument={handleDeleteDocument}
                                        onExtractDocument={handleExtractDocument}
                                        pageNumbers={pageNumbers}
                                        onPageNumberChange={handlePageNumberChange}
                                        hasMasterPdf={hasActiveMasterPdf}
                                        canViewDocuments={canViewDocuments}
                                        canUploadDocuments={canUploadDocuments}
                                        canDeleteDocuments={canDeleteDocuments}
                                        canEditWish={canEditWish}
                                        groupBy={groupBy}
                                    />
                                ) : (
                                    <WishesFlatTable
                                        employees={filteredEmployees}
                                        onWishChange={handleWishChange}
                                        onUploadDocument={handleUploadDocument}
                                        onDeleteDocument={handleDeleteDocument}
                                        onExtractDocument={handleExtractDocument}
                                        pageNumbers={pageNumbers}
                                        onPageNumberChange={handlePageNumberChange}
                                        hasMasterPdf={hasActiveMasterPdf}
                                        canViewDocuments={canViewDocuments}
                                        canUploadDocuments={canUploadDocuments}
                                        canDeleteDocuments={canDeleteDocuments}
                                        canEditWish={canEditWish}
                                    />
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

                {/* Progress Modal */}
                <Dialog open={showProgress} onOpenChange={(open) => { if (!open) setShowProgress(false); }}>
                    <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                جاري تصدير بطاقات الرغبات
                            </DialogTitle>
                            <DialogDescription>
                                يتم دمج وثائق الرغبات في ملف PDF واحد...
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-6 space-y-4">
                            {/* Progress bar */}
                            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                                <div 
                                    className="h-full bg-primary rounded-full transition-all duration-300 ease-in-out"
                                    style={{ 
                                        width: progressData.total > 0 
                                            ? `${(progressData.current / progressData.total) * 100}%` 
                                            : '0%' 
                                    }}
                                />
                            </div>
                            
                            {/* Progress text */}
                            <div className="text-center space-y-1">
                                <p className="text-sm font-medium">
                                    {progressData.current} / {progressData.total}
                                </p>
                                {progressData.employeeName && (
                                    <p className="text-xs text-muted-foreground">
                                        جاري معالجة: {progressData.employeeName}
                                    </p>
                                )}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
        </div>
    );
}
