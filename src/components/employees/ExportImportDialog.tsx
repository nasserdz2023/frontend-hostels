"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
    Download,
    Upload,
    FileSpreadsheet,
    Check,
    X,
    Loader2,
    AlertCircle,
} from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { employeesApi, EmployeeFilters } from "@/lib/api/employees";
import { useAuthStore } from "@/lib/stores/auth";

// Type for export fields
interface ExportField {
    key: string;
    label: string;
    category: string;
    sensitive?: boolean;
}

// Available fields for export
const EXPORT_FIELDS: ExportField[] = [
    // بيانات شخصية
    { key: "full_name_ar", label: "الاسم الكامل (عربي)", category: "بيانات شخصية" },
    { key: "full_name_fr", label: "الاسم الكامل (لاتيني)", category: "بيانات شخصية" },
    { key: "firstname_ar", label: "الاسم (عربي)", category: "بيانات شخصية" },
    { key: "lastname_ar", label: "اللقب (عربي)", category: "بيانات شخصية" },
    { key: "firstname_fr", label: "الاسم (لاتيني)", category: "بيانات شخصية" },
    { key: "lastname_fr", label: "اللقب (لاتيني)", category: "بيانات شخصية" },
    { key: "father_name", label: "اسم الأب", category: "بيانات شخصية", sensitive: true },
    { key: "mother_fullname", label: "اسم ولقب الأم", category: "بيانات شخصية", sensitive: true },
    { key: "gender", label: "الجنس", category: "بيانات شخصية" },
    { key: "birth_date", label: "تاريخ الميلاد", category: "بيانات شخصية", sensitive: true },
    { key: "birth_place", label: "مكان الميلاد", category: "بيانات شخصية", sensitive: true },
    { key: "birth_wilaya", label: "ولاية الميلاد", category: "بيانات شخصية", sensitive: true },
    { key: "birth_municipality", label: "بلدية الميلاد", category: "بيانات شخصية", sensitive: true },
    { key: "marital_status", label: "الحالة العائلية", category: "بيانات شخصية", sensitive: true },
    { key: "children_count", label: "عدد الأطفال", category: "بيانات شخصية", sensitive: true },
    { key: "blood_type", label: "فصيلة الدم", category: "بيانات شخصية", sensitive: true },
    { key: "military_service_status", label: "وضعية الخدمة الوطنية", category: "بيانات شخصية", sensitive: true },
    { key: "national_id", label: "رقم التعريف الوطني", category: "بيانات شخصية", sensitive: true },

    // معلومات الاتصال
    { key: "phone", label: "الهاتف", category: "معلومات الاتصال", sensitive: true },
    { key: "mobile", label: "الهاتف النقال", category: "معلومات الاتصال", sensitive: true },
    { key: "email", label: "البريد الإلكتروني", category: "معلومات الاتصال" },
    { key: "address", label: "العنوان", category: "معلومات الاتصال", sensitive: true },
    { key: "city", label: "المدينة", category: "معلومات الاتصال" },
    { key: "emergency_contact_name", label: "اسم شخص للطوارئ", category: "معلومات الاتصال", sensitive: true },
    { key: "emergency_contact_phone", label: "هاتف الطوارئ", category: "معلومات الاتصال", sensitive: true },
    { key: "emergency_contact_relationship", label: "علاقة شخص الطوارئ", category: "معلومات الاتصال", sensitive: true },

    // بيانات وظيفية
    { key: "employee_number", label: "رقم الموظف", category: "بيانات وظيفية" },
    { key: "grade_text", label: "الرتبة", category: "بيانات وظيفية" },
    { key: "grade_group", label: "المجموعة", category: "بيانات وظيفية" },
    { key: "position_text", label: "المنصب", category: "بيانات وظيفية" },
    { key: "department", label: "المصلحة", category: "بيانات وظيفية" },
    { key: "office", label: "المكتب", category: "بيانات وظيفية" },
    { key: "institution", label: "المؤسسة", category: "بيانات وظيفية" },
    { key: "institution_municipality", label: "بلدية المؤسسة", category: "بيانات وظيفية" },
    { key: "work_location_type", label: "نوع مكان العمل", category: "بيانات وظيفية" },
    { key: "work_district", label: "مقاطعة العمل", category: "بيانات وظيفية" },
    { key: "work_municipality", label: "بلدية العمل", category: "بيانات وظيفية" },
    { key: "original_administration_type", label: "نوع الإدارة الأصلية", category: "بيانات وظيفية" },
    { key: "original_department", label: "القسم الأصلي", category: "بيانات وظيفية" },
    { key: "appointment_type", label: "نوع التعيين", category: "بيانات وظيفية" },
    { key: "rank", label: "الرتبة الوظيفية", category: "بيانات وظيفية" },
    { key: "employment_type", label: "طبيعة التوظيف", category: "بيانات وظيفية" },
    { key: "secondary_position", label: "المنصب الثاني (يدمج المعلومات في سطرين)", category: "بيانات وظيفية" },

    // تواريخ
    { key: "hire_date", label: "تاريخ التوظيف", category: "تواريخ" },
    { key: "confirmation_date", label: "تاريخ الترسيم", category: "تواريخ" },
    { key: "last_promotion_date", label: "تاريخ آخر ترقية", category: "تواريخ" },
    { key: "created_at", label: "تاريخ الإنشاء", category: "تواريخ" },

    // الدرجات
    { key: "current_echelon", label: "الدرجة الحالية", category: "الدرجات" },
    { key: "echelon_date", label: "تاريخ الدرجة", category: "الدرجات" },
    { key: "progression_pace", label: "وتيرة الترقي", category: "الدرجات" },

    // الوضعية القانونية
    { key: "legal_position", label: "الوضعية القانونية", category: "الوضعية القانونية" },
    { key: "legal_position_start", label: "تاريخ بداية الوضعية", category: "الوضعية القانونية" },
    { key: "legal_position_end", label: "تاريخ نهاية الوضعية", category: "الوضعية القانونية" },
    { key: "legal_position_destination", label: "الجهة المستقبلة", category: "الوضعية القانونية" },

    // بيانات مالية
    { key: "bank_name", label: "اسم البنك", category: "بيانات مالية", sensitive: true },
    { key: "bank_account", label: "الحساب البنكي", category: "بيانات مالية", sensitive: true },
    { key: "social_security_number", label: "رقم الضمان الاجتماعي", category: "بيانات مالية", sensitive: true },

    // التعليم
    { key: "hiring_education_level", label: "المستوى التعليمي", category: "التعليم" },

    // بيانات عائلية
    { key: "spouse_name", label: "اسم الزوج/الزوجة", category: "بيانات عائلية", sensitive: true },
    { key: "spouse_profession", label: "مهنة الزوج/الزوجة", category: "بيانات عائلية", sensitive: true },
    { key: "spouse_employer", label: "جهة عمل الزوج/الزوجة", category: "بيانات عائلية", sensitive: true },

    // أخرى
    { key: "is_active", label: "حالة النشاط", category: "أخرى" }
];

// Group fields by category
// Note: Categories are now computed dynamically in the component based on filtered fields

interface ExportImportDialogProps {
    filters?: EmployeeFilters;
    trigger?: React.ReactNode;
    groupBy?: string | null;  // Current grouping from the page
    canImport?: boolean;  // Permission to import employees
}

export function ExportImportDialog({
    filters,
    trigger,
    groupBy: initialGroupBy,
    canImport = true,
}: ExportImportDialogProps) {
    const t = useTranslations("employees"); // Assuming exist or fallback
    const [open, setOpen] = useState(false);

    // Get permission directly from auth store
    const { hasPermission, user } = useAuthStore();
    const canViewSensitive = hasPermission('employees', 'view_sensitive') || user?.role === 'dev_admin';
    const canExport = hasPermission('employees', 'export') || user?.role === 'dev_admin';



    // Filter fields based on permission
    const availableFields = useMemo(() => {
        return canViewSensitive
            ? EXPORT_FIELDS
            : EXPORT_FIELDS.filter(f => !f.sensitive);
    }, [canViewSensitive]);

    // Group fields by category (after filtering)
    const availableCategories = useMemo(() => {
        return [...new Set(availableFields.map((f) => f.category))];
    }, [availableFields]);

    const [selectedFields, setSelectedFields] = useState<string[]>([]);

    // Reset selected fields when available fields change
    useEffect(() => {
        setSelectedFields(availableFields.map((f) => f.key));
    }, [availableFields]);

    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [updateExisting, setUpdateExisting] = useState(false);
    const [importResult, setImportResult] = useState<{
        success: boolean;
        created: number;
        updated: number;
        errors: string[];
        total_errors: number;
        message: string;
    } | null>(null);
    const [groupBy, setGroupBy] = useState<string>(initialGroupBy || "");  // Use page's grouping as default
    const fileInputRef = useRef<HTMLInputElement>(null);

    const toggleField = (key: string) => {
        setSelectedFields((prev) =>
            prev.includes(key)
                ? prev.filter((f) => f !== key)
                : [...prev, key]
        );
    };

    const selectAll = () => {
        setSelectedFields(availableFields.map((f) => f.key));
    };

    const deselectAll = () => {
        setSelectedFields([]);
    };

    const handleExport = async () => {
        if (selectedFields.length === 0) {
            toast.error("يرجى اختيار حقل واحد على الأقل");
            return;
        }

        setIsExporting(true);
        try {
            await employeesApi.exportToExcel(selectedFields, filters, groupBy || undefined);
            toast.success("تم تصدير الموظفين بنجاح");
        } catch (error) {
            toast.error("فشل التصدير");
        } finally {
            setIsExporting(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            await employeesApi.downloadTemplate();
            toast.success("تم تحميل القالب");
        } catch (error) {
            toast.error("فشل تحميل القالب");
        }
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setImportResult(null);

        try {
            const result = await employeesApi.importFromExcel(
                file,
                updateExisting
            );
            setImportResult(result);
            if (result.created > 0 || result.updated > 0) {
                toast.success(result.message);
            } else if (result.total_errors > 0) {
                toast.warning("لم يتم استيراد أي سجلات، يرجى مراجعة الأخطاء");
            }
        } catch (error) {
            toast.error("فشل الاستيراد");
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        <FileSpreadsheet className="h-4 w-4 me-2" />
                        تصدير/استيراد
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5" />
                        تصدير واستيراد الموظفين
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue={canExport ? "export" : "import"} className="mt-4">
                    <TabsList className="w-full">
                        {canExport && (
                            <TabsTrigger value="export" className="flex-1">
                                <Download className="h-4 w-4 me-2" />
                                تصدير
                            </TabsTrigger>
                        )}
                        {canImport && (
                            <TabsTrigger value="import" className="flex-1">
                                <Upload className="h-4 w-4 me-2" />
                                استيراد
                            </TabsTrigger>
                        )}
                    </TabsList>

                    {/* Export Tab */}
                    {canExport && (
                        <TabsContent value="export" className="space-y-4 mt-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                    اختر الحقول التي ترغب في تصديرها
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={selectAll}
                                    >
                                        تحديد الكل
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={deselectAll}
                                    >
                                        إلغاء الكل
                                    </Button>
                                </div>
                            </div>

                            {/* Group By Selector */}
                            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                                <Label className="text-sm font-medium">تجميع حسب:</Label>
                                <select
                                    value={groupBy}
                                    onChange={(e) => setGroupBy(e.target.value)}
                                    className="flex-1 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-card text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="">بدون تجميع</option>
                                    <option value="department">المصلحة</option>
                                    <option value="institution">المؤسسة</option>
                                    <option value="municipality">البلدية</option>
                                    <option value="daira">الدائرة</option>
                                    <option value="grade">الرتبة</option>
                                    <option value="position">المنصب</option>
                                </select>
                            </div>

                            <div className="space-y-4">
                                {availableCategories.map((category) => (
                                    <div key={category}>
                                        <h4 className="font-medium text-sm mb-2 text-muted-foreground">
                                            {category}
                                        </h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {availableFields.filter(
                                                (f) => f.category === category
                                            ).map((field) => (
                                                <div
                                                    key={field.key}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Checkbox
                                                        id={field.key}
                                                        checked={selectedFields.includes(
                                                            field.key
                                                        )}
                                                        onCheckedChange={() =>
                                                            toggleField(field.key)
                                                        }
                                                    />
                                                    <Label
                                                        htmlFor={field.key}
                                                        className="text-sm cursor-pointer flex items-center gap-2"
                                                    >
                                                        {field.label}
                                                        {selectedFields.includes(field.key) && (
                                                            <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-emerald-500 rounded-full">
                                                                {selectedFields.indexOf(field.key) + 1}
                                                            </span>
                                                        )}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {selectedFields.length > 0 && (
                                <div className="mt-6 pt-4 border-t">
                                    <h4 className="font-medium text-sm mb-3">الترتيب النهائي للأعمدة:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedFields.map((fieldKey, index) => {
                                            const fieldLabel = availableFields.find(f => f.key === fieldKey)?.label || fieldKey;
                                            return (
                                                <div key={fieldKey} className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md px-2 py-1 text-sm">
                                                    <span className="font-bold me-1 text-emerald-600 dark:text-emerald-400">{index + 1}.</span>
                                                    <span>{fieldLabel}</span>
                                                    <div className="flex flex-col gap-0.5 ms-1">
                                                        <button
                                                            disabled={index === 0}
                                                            onClick={() => {
                                                                const newFields = [...selectedFields];
                                                                [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
                                                                setSelectedFields(newFields);
                                                            }}
                                                            className="text-slate-400 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                                                        </button>
                                                        <button
                                                            disabled={index === selectedFields.length - 1}
                                                            onClick={() => {
                                                                const newFields = [...selectedFields];
                                                                [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
                                                                setSelectedFields(newFields);
                                                            }}
                                                            className="text-slate-400 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end pt-4 border-t mt-4">
                                <Button
                                    onClick={handleExport}
                                    disabled={
                                        isExporting || selectedFields.length === 0
                                    }
                                >
                                    {isExporting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 me-2 animate-spin" />
                                            جاري التصدير...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="h-4 w-4 me-2" />
                                            تصدير ({selectedFields.length} حقل)
                                        </>
                                    )}
                                </Button>
                            </div>
                        </TabsContent>
                    )}

                    {/* Import Tab */}
                    {canImport && (
                        <TabsContent value="import" className="space-y-4 mt-4">
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    يمكنك استيراد الموظفين من ملف Excel. قم بتحميل
                                    القالب أولاً للتعرف على التنسيق المطلوب.
                                </AlertDescription>
                            </Alert>

                            <div className="flex items-center gap-4">
                                <Button
                                    variant="outline"
                                    onClick={handleDownloadTemplate}
                                >
                                    <Download className="h-4 w-4 me-2" />
                                    تحميل القالب
                                </Button>

                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="update-existing"
                                        checked={updateExisting}
                                        onCheckedChange={(checked) =>
                                            setUpdateExisting(!!checked)
                                        }
                                    />
                                    <Label
                                        htmlFor="update-existing"
                                        className="text-sm"
                                    >
                                        تحديث السجلات الموجودة
                                    </Label>
                                </div>
                            </div>

                            <div className="border-2 border-dashed rounded-lg p-8 text-center">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleImport}
                                    className="hidden"
                                    id="import-file"
                                />
                                <label
                                    htmlFor="import-file"
                                    className="cursor-pointer"
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <Upload className="h-10 w-10 text-muted-foreground" />
                                        <p className="text-sm">
                                            {isImporting
                                                ? "جاري الاستيراد..."
                                                : "اضغط لاختيار ملف Excel"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            .xlsx أو .xls
                                        </p>
                                    </div>
                                </label>
                            </div>

                            {/* Import Results */}
                            {importResult && (
                                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-4">
                                        {importResult.created > 0 && (
                                            <div className="flex items-center gap-1 text-green-600">
                                                <Check className="h-4 w-4" />
                                                <span className="text-sm">
                                                    تم إنشاء {importResult.created}
                                                </span>
                                            </div>
                                        )}
                                        {importResult.updated > 0 && (
                                            <div className="flex items-center gap-1 text-blue-600">
                                                <Check className="h-4 w-4" />
                                                <span className="text-sm">
                                                    تم تحديث {importResult.updated}
                                                </span>
                                            </div>
                                        )}
                                        {importResult.total_errors > 0 && (
                                            <div className="flex items-center gap-1 text-red-600">
                                                <X className="h-4 w-4" />
                                                <span className="text-sm">
                                                    {importResult.total_errors} أخطاء
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {importResult.errors.length > 0 && (
                                        <div className="text-sm space-y-1">
                                            <p className="font-medium text-red-600">
                                                الأخطاء:
                                            </p>
                                            <ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                                                {importResult.errors.map(
                                                    (err, idx) => (
                                                        <li key={idx}>• {err}</li>
                                                    )
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>
                    )}
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
