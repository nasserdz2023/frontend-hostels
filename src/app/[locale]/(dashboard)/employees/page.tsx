"use client";

import { useState, useEffect, use } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEmployeesStore } from "@/lib/stores/employees";
import { ControlPanel } from "@/components/odoo/ControlPanel";
import { Favorite } from "@/components/odoo/OdooSearch";
import { EmployeesList } from "@/components/employees/EmployeesList";
import { EmployeesKanban } from "@/components/employees/EmployeesKanban";
import { useInstitutions } from "@/hooks/useInstitutions";
import { useAuthStore } from "@/lib/stores/auth";
import { useSettingsStore } from "@/lib/stores/settings";
import { ExportImportDialog } from "@/components/employees/ExportImportDialog";
import { EmployeeFormSteps } from "@/components/employees/EmployeeFormSteps";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Employee, EmployeeFilters, employeesApi, Daira } from "@/lib/api/employees";
import type { EmployeeFormValues } from "@/lib/schemas/employees";
import { toast } from "sonner";
import { PermissionGuard } from "@/hooks/useRequirePermission";

export default function EmployeesPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = use(params);
    const t = useTranslations("employees");
    const tCommon = useTranslations("common");
    const router = useRouter();

    const {
        employees,
        isLoading,
        filters,
        total,
        fetchEmployees,
        fetchReferences,
        setFilters,
        clearFilters,
        deleteEmployee,
        updateEmployee,
        departments,
        gradeGroups
    } = useEmployeesStore();

    // We need institutions to filter by institution
    const { data: institutionsData } = useInstitutions({ size: 100 });
    const institutions = institutionsData?.items || [];

    // Settings
    const { getDefaultWilayaCode } = useSettingsStore();

    // Dairas state
    const [dairas, setDairas] = useState<Daira[]>([]);
    const [municipalities, setMunicipalities] = useState<any[]>([]);

    // Permission checks
    const { hasPermission, user } = useAuthStore();
    const canCreate = hasPermission('employees', 'create');
    const canEdit = hasPermission('employees', 'edit');
    const canDelete = hasPermission('employees', 'delete');
    const canExport = hasPermission('employees', 'export');
    const canViewSensitive = hasPermission('employees', 'view_sensitive') || user?.role === 'dev_admin';

    // Load saved preferences from localStorage
    const [viewType, setViewType] = useState<"list" | "kanban">(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('employees_view_type') as "list" | "kanban") || "kanban";
        }
        return "kanban";
    });
    const [selectedIds, setSelectedIds] = useState<string[]>([]); // For multi-select if needed
    const [sortBy, setSortBy] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('employees_sort_by') || "position";
        }
        return "position";
    });
    const [groupBy, setGroupBy] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('employees_group_by') || null;
        }
        return null;
    });

    // Edit Mode State
    const [editMode, setEditMode] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleEditClick = async (employee: Employee) => {
        // Fetch full employee data from API instead of using limited list data
        try {
            const fullEmployee = await employeesApi.getById(employee.id);
            console.log("Fetched full employee data:", fullEmployee);
            setSelectedEmployee(fullEmployee);
            setEditMode(true);
        } catch (error) {
            console.error("Failed to fetch employee:", error);
            toast.error("فشل في تحميل بيانات الموظف");
        }
    };

    const handleEditComplete = async (data: any) => {
        if (!selectedEmployee) return;
        setIsSubmitting(true);
        try {
            await updateEmployee(selectedEmployee.id, data);
            toast.success(t("messages.updateSuccess"));
            setEditMode(false);
            setSelectedEmployee(null);
            fetchEmployees();
        } catch (error) {
            toast.error(t("messages.updateError"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditCancel = () => {
        setEditMode(false);
        setSelectedEmployee(null);
    };

    // Save view type when changed
    const handleViewChange = (newView: "list" | "kanban") => {
        setViewType(newView);
        if (typeof window !== 'undefined') {
            localStorage.setItem('employees_view_type', newView);
        }
    };

    // Save sort when changed
    const handleSortChange = (newSort: string) => {
        setSortBy(newSort);
        if (typeof window !== 'undefined') {
            localStorage.setItem('employees_sort_by', newSort);
        }
    };

    // Handle group change
    const handleGroupChange = (group: string | null) => {
        setGroupBy(group);
        if (typeof window !== 'undefined') {
            if (group) {
                localStorage.setItem('employees_group_by', group);
            } else {
                localStorage.removeItem('employees_group_by');
            }
        }
    };

    // Sort options - filter sensitive options based on permissions
    const allSortOptions = [
        { value: 'newest', label: 'الأحدث أولاً' },
        { value: 'oldest', label: 'الأقدم أولاً' },
        { value: 'alphabetical', label: 'أبجدياً (أ-ي)' },
        { value: 'employee_number', label: 'حسب رقم التسجيل' },
        { value: 'age_desc', label: 'الأكبر سناً أولاً', sensitive: true },
        { value: 'age_asc', label: 'الأصغر سناً أولاً', sensitive: true },
        { value: 'position', label: 'حسب المنصب' },
        { value: 'grade', label: 'حسب الرتبة' },
    ];
    const sortOptions = allSortOptions.filter(opt => !opt.sensitive || canViewSensitive);

    useEffect(() => {
        // We do NOT clear filters here anymore, to keep persistence as requested.
        // Just refresh the data with current filters.
        fetchEmployees();

        fetchReferences(); // Fetch departments

        // Load dairas and municipalities using wilaya code from settings
        const wilayaCode = getDefaultWilayaCode();
        employeesApi.getDairas(wilayaCode).then(setDairas).catch(console.error);
        employeesApi.getMunicipalities(wilayaCode).then(setMunicipalities).catch(console.error);
    }, []);

    // Refetch when sort changes
    useEffect(() => {
        setFilters({ sort_by: sortBy as EmployeeFilters['sort_by'] });
    }, [sortBy, setFilters]);

    // Favorites Logic
    const [favorites, setFavorites] = useState<Favorite[]>([]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('employee_favorites');
            if (saved) {
                setFavorites(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load favorites", e);
        }
    }, []);

    const handleSaveFavorite = (name: string, filterValues: any, activeGroup: string | null, query: string) => {
        const newFav: Favorite = {
            id: Date.now().toString(),
            label: name,
            filters: filterValues,
            groupBy: activeGroup,
            searchQuery: query
        };
        const newFavs = [...favorites, newFav];
        setFavorites(newFavs);
        localStorage.setItem('employee_favorites', JSON.stringify(newFavs));
        toast.success(tCommon("savedSuccessfully"));
    };

    const handleDeleteFavorite = (id: string) => {
        const newFavs = favorites.filter(f => f.id !== id);
        setFavorites(newFavs);
        localStorage.setItem('employee_favorites', JSON.stringify(newFavs));
    };

    const handleSelectFavorite = (fav: Favorite) => {
        // Apply favorite filters
        setFilters({
            ...filters,
            ...fav.filters,
            search: fav.searchQuery,
            page: 1
        });
        if (fav.groupBy) {
            setGroupBy(fav.groupBy);
        } else {
            setGroupBy("none"); // or null depending on implementation
        }
    };

    // 1. Prepare Search Filters
    const searchFilters = [
        {
            id: 'gender',
            label: 'الجنس',
            type: 'select' as const,
            options: [
                { label: 'ذكر', value: 'MALE' },
                { label: 'أنثى', value: 'FEMALE' }
            ],
            defaultValue: filters.gender
        },
        {
            id: 'sector',
            label: 'القطاع',
            type: 'select' as const,
            options: [
                { label: 'مؤسسات الشباب', value: 'youth' },
                { label: 'مؤسسات الرياضة', value: 'sports' }
            ],
            defaultValue: filters.sector
        },
        {
            id: 'department',
            label: t("fields.department"),
            type: 'multiselect' as const,
            options: departments.map(dept => ({
                label: dept.name_ar,
                value: dept.id
            })),
            defaultValue: filters.department
        },
        {
            id: 'institution_id',
            label: t("fields.institution"),
            type: 'multiselect' as const,
            options: institutions.map(inst => ({
                label: inst.name_ar,
                value: inst.id
            })),
            defaultValue: filters.institution_id
        },
        {
            id: 'grade_group_id',
            label: t("grades.classification"),
            type: 'multiselect' as const,
            options: gradeGroups.map(group => ({
                label: locale === 'ar' ? group.name_ar : group.name_fr || group.name_ar,
                value: group.id
            })),
            defaultValue: filters.grade_group_id
        },
        {
            id: 'position_type',
            label: 'نوع المنصب',
            type: 'multiselect' as const,
            options: [
                { label: 'مستشاري المقاطعات', value: 'district_advisor' },
                { label: 'المندوبين المحليين', value: 'delegate' },
                { label: 'الملحقين البلديين', value: 'attache' },
                { label: 'مدراء المؤسسات', value: 'director' }
            ],
            defaultValue: filters.position_type
        },
        {
            id: 'original_admin',
            label: 'الإدارة الأصلية',
            type: 'multiselect' as const,
            options: [
                { label: 'مديرية الشباب والرياضة', value: 'DJS' },
                { label: 'ديوان مؤسسات الشباب', value: 'ODEJ' },
                { label: 'ديوان المركب الرياضي', value: 'OPOW' },
                { label: 'جهات أخرى', value: 'OTHER' }
            ],
            defaultValue: filters.original_admin
        },
        {
            id: 'daira_code',
            label: 'الدائرة',
            type: 'multiselect' as const,
            options: dairas.map(d => ({
                label: d.name_ar,
                value: d.code
            })),
            defaultValue: filters.daira_code
        },
        {
            id: 'municipality_id',
            label: 'البلدية',
            type: 'multiselect' as const,
            options: municipalities.map(m => ({
                label: locale === 'ar' ? m.name_ar : m.name_fr || m.name_ar,
                value: m.id
            })),
            defaultValue: filters.municipality_id
        },
        {
            id: 'legal_position',
            label: t("fields.legalPosition"),
            type: 'select' as const,
            options: [
                { label: 'في حالة نشاط', value: 'ACTIVE' },
                { label: 'انتداب', value: 'SECONDMENT' },
                { label: 'إحالة على الاستيداع', value: 'AVAILABILITY' },
                { label: 'خارج الإطار', value: 'DETACHMENT' },
                { label: 'تحت التصرف', value: 'MISE_A_DISPOSITION' },
                { label: 'الخدمة الوطنية', value: 'MILITARY_SERVICE' },
                { label: 'متقاعد', value: 'RETIRED' },
                { label: 'موقف', value: 'SUSPENDED' },
                { label: 'معفى', value: 'EXEMPTED' },
                { label: 'خارج الإطار', value: 'OUT_OF_FRAME' }
            ],
            defaultValue: filters.legal_position
        }
    ];

    // 2. Prepare Group By Options
    const groupByOptions = [
        { id: "department", label: t("fields.department") },
        { id: "institution", label: t("fields.institution") },
        { id: "position", label: t("fields.position") },
        { id: "grade", label: t("fields.grade") },
        { id: "gender", label: t("fields.gender") },
        { id: "original_admin", label: "الإدارة الأصلية" },
        { id: "daira", label: "الدائرة" },
        { id: "institution_municipality", label: "بلدية المؤسسة" },
        { id: "employee_city", label: "بلدية إقامة الموظف" },
        { id: "legal_position", label: t("fields.legalPosition") }
    ];

    // 3. Handle Search Actions
    const handleSearch = (query: string) => {
        setFilters({ search: query, page: 1 });
    };

    const handleFilterChange = (activeFilters: Record<string, any>) => {
        // Preserve existing search and only update filter fields
        setFilters({
            ...filters,  // Keep existing filters including search
            gender: activeFilters['gender'] || undefined,
            sector: activeFilters['sector'] || undefined,
            department: activeFilters['department'] || undefined,
            institution_id: activeFilters['institution_id'] || undefined,
            grade_group_id: activeFilters['grade_group_id'] || undefined,
            position_type: activeFilters['position_type'] || undefined,
            original_admin: activeFilters['original_admin'] || undefined,
            daira_code: activeFilters['daira_code'] || undefined,
            municipality_id: activeFilters['municipality_id'] || undefined,
            legal_position: activeFilters['legal_position'] || undefined,
            page: 1
        });
    };

    const handleDelete = async (id: string) => {
        const { user } = useAuthStore.getState();
        const isDevAdmin = user?.role?.toLowerCase() === 'dev_admin';

        if (isDevAdmin) {
            // Show options for DEV_ADMIN
            const choice = prompt(
                "اختر نوع الحذف:\n" +
                "1 - حذف مؤقت (تعطيل الموظف فقط)\n" +
                "2 - حذف نهائي (حذف الموظف وحساب المستخدم نهائياً)\n\n" +
                "أدخل 1 أو 2:"
            );

            if (choice === "1") {
                await deleteEmployee(id, false);
            } else if (choice === "2") {
                if (confirm("⚠️ تحذير: سيتم حذف الموظف وجميع بياناته وحساب المستخدم المرتبط به نهائياً. هل أنت متأكد؟")) {
                    await deleteEmployee(id, true);
                }
            }
        } else {
            // Normal users - soft delete only
            if (confirm(t("messages.confirmDelete"))) {
                await deleteEmployee(id, false);
            }
        }
    };

    // If in edit mode, show the edit form instead of the list
    if (editMode && selectedEmployee) {
        return (
            <div className="flex flex-col h-full bg-background">
                <div className="container mx-auto py-8 px-4 max-w-5xl">
                    <div className="mb-6 flex items-center gap-4">
                        <button
                            onClick={handleEditCancel}
                            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <ArrowRight className="h-5 w-5" />
                        </button>
                        <h1 className="text-2xl font-bold">
                            تعديل الموظف: {selectedEmployee.firstname_ar} {selectedEmployee.lastname_ar}
                        </h1>
                    </div>
                    <EmployeeFormSteps
                        initialData={selectedEmployee as unknown as Partial<EmployeeFormValues>}
                        institutions={institutions}
                        onSubmit={handleEditComplete}
                        isSubmitting={isSubmitting}
                        onCancel={handleEditCancel}
                    />
                </div>
            </div>
        );
    }

    return (
        <PermissionGuard module="employees" action="view">
            <div className="flex flex-col h-full bg-background">
                <ControlPanel
                    title=""
                    viewType={viewType}
                    onViewChange={handleViewChange}
                    onSearch={handleSearch}
                    searchFilters={searchFilters}
                    searchGrouping={groupByOptions}
                    searchPlaceholder={t("search")}
                    onFilterChange={handleFilterChange}
                    onGroupChange={handleGroupChange}
                    searchQuery={filters.search}
                    activeGroupBy={groupBy}
                    favorites={favorites}
                    onSaveFavorite={handleSaveFavorite}
                    onDeleteFavorite={handleDeleteFavorite}
                    onFavoriteSelect={handleSelectFavorite}
                    onCreateClick={canCreate ? () => router.push(`/${locale}/employees/new`) : undefined}
                    createLabel={canCreate ? t("newEmployee") : undefined}
                    hideBreadcrumbs
                    actions={
                        (canExport || canCreate) ? (
                            <ExportImportDialog
                                filters={filters}
                                groupBy={groupBy}
                                canImport={canCreate}
                            />
                        ) : undefined
                    }
                />

                <div className="flex-1 p-6 overflow-auto">
                    {/* Sort Dropdown */}
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            {tCommon("total")}: <span className="text-emerald-600 dark:text-emerald-400">{total}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600 dark:text-slate-400">ترتيب:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => handleSortChange(e.target.value)}
                                className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-card text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                {sortOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <>
                            {viewType === "list" ? (
                                <EmployeesList
                                    employees={employees}
                                    dairas={dairas}
                                    onEdit={handleEditClick}
                                    onDelete={handleDelete}
                                    groupBy={groupBy}
                                    canEdit={canEdit}
                                    canDelete={canDelete}
                                    filters={{
                                        position_id: filters.position_id as string | undefined,
                                        position_type: filters.position_type as string[] | undefined
                                    }}
                                />
                            ) : (
                                <EmployeesKanban
                                    employees={employees}
                                    dairas={dairas}
                                    onEdit={(emp) => router.push(`/${locale}/employees/${emp.id}`)}
                                    onDelete={handleDelete}
                                    locale={locale}
                                    groupBy={groupBy}
                                    filters={{
                                        position_id: filters.position_id as string | undefined,
                                        position_type: filters.position_type as string[] | undefined
                                    }}
                                />
                            )}
                        </>
                    )}

                    {/* Pagination */}
                    {!isLoading && total > 0 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                <span>عرض {employees.length} من {total} موظف</span>
                                <span className="mx-2">|</span>
                                <span>عدد الصفوف:</span>
                                <select
                                    value={filters.size || 20}
                                    onChange={(e) => setFilters({ size: parseInt(e.target.value), page: 1 })}
                                    className="px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded bg-card"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={150}>150</option>
                                    <option value={200}>200</option>
                                    <option value={250}>250</option>
                                    <option value={300}>300</option>
                                    <option value={10000}>الكل</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFilters({ page: (filters.page || 1) - 1 })}
                                    disabled={(filters.page || 1) <= 1}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                    السابق
                                </Button>

                                <span className="px-3 py-1 text-sm bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-md font-medium">
                                    صفحة {filters.page || 1} من {Math.ceil(total / (filters.size || 20))}
                                </span>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFilters({ page: (filters.page || 1) + 1 })}
                                    disabled={(filters.page || 1) >= Math.ceil(total / (filters.size || 20))}
                                >
                                    التالي
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PermissionGuard>
    );
}
