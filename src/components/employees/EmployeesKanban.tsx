"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Employee } from "@/lib/api/employees";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Building2, FileText, ChevronDown, ChevronUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";

import { Daira } from "@/lib/api/locations";

interface EmployeesKanbanProps {
    employees: Employee[];
    dairas?: Daira[];
    onEdit: (employee: Employee) => void;
    onDelete: (id: string) => void;
    locale?: string;
    groupBy?: string | null;
    filters?: {
        position_id?: string;
        position_type?: string[];
    };
}

interface GroupedEmployees {
    [key: string]: {
        name: string;
        employees: Employee[];
    };
}

export function EmployeesKanban({ employees, dairas = [], onEdit, onDelete, locale = 'ar', groupBy = null, filters }: EmployeesKanbanProps) {
    const t = useTranslations("employees.fields");
    const tDepts = useTranslations("employees.departments");
    const tCommon = useTranslations("common");
    const currentLocale = useLocale();
    const router = useRouter();
    const tEmp = useTranslations("employees");
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('employees_kanban_collapsed_groups');
            if (saved) {
                try {
                    return new Set(JSON.parse(saved));
                } catch (e) {
                    // Silently handle malformed localStorage data
                }
            }
        }
        return new Set();
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('employees_kanban_collapsed_groups', JSON.stringify(Array.from(collapsedGroups)));
        }
    }, [collapsedGroups]);

    // Group employees when groupBy is set
    const groupedEmployees = useMemo((): GroupedEmployees | null => {
        if (!groupBy) return null;

        const groups: GroupedEmployees = {};

        employees.forEach(employee => {
            const keysToGroup: { key: string, name: string, isSecondary?: boolean }[] = [];

            if (groupBy === 'department') {
                const groupKey = employee.department?.id || 'no-department';
                const groupName = employee.department
                    ? (currentLocale === 'ar' ? employee.department.name_ar : employee.department.name_fr || employee.department.name_ar)
                    : 'غير مصنف';
                keysToGroup.push({ key: groupKey, name: groupName });
            } else if (groupBy === 'institution') {
                const groupKey = employee.institution?.id || 'no-institution';
                const groupName = employee.institution
                    ? (currentLocale === 'ar' ? employee.institution.name_ar : employee.institution.name_fr || employee.institution.name_ar)
                    : 'غير مصنف';
                keysToGroup.push({ key: groupKey, name: groupName });
            } else if (groupBy === 'position') {
                const primaryKey = employee.position?.id || 'no-position';
                const primaryName = employee.position
                    ? (currentLocale === 'ar' ? employee.position.name_ar : employee.position.name_fr || employee.position.name_ar)
                    : 'بدون منصب';
                keysToGroup.push({ key: primaryKey, name: primaryName, isSecondary: false });

                // Add secondary position if exists
                if (employee.secondary_position?.id) {
                    keysToGroup.push({
                        key: employee.secondary_position.id,
                        name: currentLocale === 'ar' ? employee.secondary_position.name_ar : employee.secondary_position.name_fr || employee.secondary_position.name_ar,
                        isSecondary: true
                    });
                }
            } else if (groupBy === 'grade') {
                const groupKey = employee.grade?.id || 'no-grade';
                const groupName = employee.grade
                    ? (currentLocale === 'ar' ? employee.grade.name_ar : employee.grade.name_fr || employee.grade.name_ar)
                    : 'بدون رتبة';
                keysToGroup.push({ key: groupKey, name: groupName });
            } else if (groupBy === 'institution_municipality') {
                const municipality = employee.institution?.municipality || employee.work_municipality;
                let groupKey, groupName;
                if (municipality) {
                    groupKey = municipality.id;
                    groupName = currentLocale === 'ar' ? municipality.name_ar : municipality.name_fr || municipality.name_ar;
                } else {
                    groupKey = 'no-municipality';
                    groupName = 'غير محددة';
                }
                keysToGroup.push({ key: groupKey, name: groupName, isSecondary: false });

                // Add secondary municipality if exists and different
                const secMuni = (employee.secondary_institution as any)?.municipality || employee.secondary_municipality;
                if (employee.secondary_position?.id && secMuni) {
                    if (secMuni.id !== groupKey) {
                        keysToGroup.push({
                            key: secMuni.id,
                            name: currentLocale === 'ar' ? secMuni.name_ar : secMuni.name_fr || secMuni.name_ar,
                            isSecondary: true
                        });
                    }
                }
            } else if (groupBy === 'original_admin') {
                const groupKey = employee.original_administration_type || 'no-original-admin';
                const adminTypeLabels: Record<string, string> = {
                    'DJS': 'DJS',
                    'ODEJ': 'ODEJ',
                    'OPOW': 'OPOW',
                    'OTHER': 'أخرى'
                };
                const groupName = employee.original_administration_type
                    ? adminTypeLabels[employee.original_administration_type] || employee.original_administration_type
                    : 'غير محددة';
                keysToGroup.push({ key: groupKey, name: groupName });
            } else if (groupBy === 'daira') {
                const municipality = employee.institution?.municipality || employee.work_municipality;
                const primaryDairaCode = municipality?.daira_code;
                const secMunicipality = (employee.secondary_institution as any)?.municipality || employee.secondary_municipality;
                const secDairaCode = secMunicipality?.daira_code || (employee.secondary_institution as any)?.daira_code;
                const hasSecondaryPosition = !!employee.secondary_position?.id;

                // Check if filtering by position
                const isFilteredByPositionId = filters?.position_id;
                const isFilteredByPositionType = filters?.position_type && filters.position_type.length > 0;

                if ((isFilteredByPositionId || isFilteredByPositionType) && hasSecondaryPosition && secDairaCode) {

                    const checkPosMatch = (pos: any | undefined) => {
                        if (!pos) return false;
                        if (isFilteredByPositionId && pos.id === isFilteredByPositionId) return true;
                        if (isFilteredByPositionType && filters!.position_type) {
                            if (pos.position_type && filters!.position_type.includes(pos.position_type)) return true;
                            // Fallback heuristics
                            const nameAndCode = `${pos.name_ar || ''} ${pos.code || ''}`.toLowerCase();
                            if (filters!.position_type.includes('director') && nameAndCode.includes('مدير')) return true;
                            if (filters!.position_type.includes('delegate') && nameAndCode.includes('مندوب')) return true;
                            if (filters!.position_type.includes('district_advisor') && nameAndCode.includes('مستشار')) return true;
                            if (filters!.position_type.includes('attache') && nameAndCode.includes('ملحق')) return true;
                        }
                        return false;
                    };

                    const secondaryMatchesFilter = checkPosMatch(employee.secondary_position);
                    const primaryMatchesFilter = checkPosMatch(employee.position);

                    if (secondaryMatchesFilter && !primaryMatchesFilter) {
                        // Only secondary matches - show ONLY in secondary daira
                        const secDaira = dairas?.find(d => d.code === secDairaCode);
                        keysToGroup.push({
                            key: secDairaCode,
                            name: secDaira
                                ? (currentLocale === 'ar' ? secDaira.name_ar : secDaira.name_fr || secDaira.name_ar)
                                : `دائرة ${secDairaCode}`,
                            isSecondary: true
                        });
                    } else if (secondaryMatchesFilter && primaryMatchesFilter) {
                        // Both match - show in both dairas
                        const secDaira = dairas?.find(d => d.code === secDairaCode);
                        keysToGroup.push({
                            key: secDairaCode,
                            name: secDaira
                                ? (currentLocale === 'ar' ? secDaira.name_ar : secDaira.name_fr || secDaira.name_ar)
                                : `دائرة ${secDairaCode}`,
                            isSecondary: true
                        });

                        // Add primary as well
                        if (primaryDairaCode) {
                            const daira = dairas?.find(d => d.code === primaryDairaCode);
                            keysToGroup.push({
                                key: primaryDairaCode,
                                name: daira
                                    ? (currentLocale === 'ar' ? daira.name_ar : daira.name_fr || daira.name_ar)
                                    : `دائرة ${primaryDairaCode}`,
                                isSecondary: false
                            });
                        } else {
                            keysToGroup.push({ key: 'no-daira', name: 'غير محددة', isSecondary: false });
                        }
                    } else {
                        // Either ONLY primary matches, OR neither matches heuristically.
                        // If neither matches, we default to showing them in primary daira ONLY.
                        if (primaryDairaCode) {
                            const daira = dairas?.find(d => d.code === primaryDairaCode);
                            keysToGroup.push({
                                key: primaryDairaCode,
                                name: daira
                                    ? (currentLocale === 'ar' ? daira.name_ar : daira.name_fr || daira.name_ar)
                                    : `دائرة ${primaryDairaCode}`,
                                isSecondary: false
                            });
                        } else {
                            keysToGroup.push({ key: 'no-daira', name: 'غير محددة', isSecondary: false });
                        }
                    }
                } else {
                    // No position filter or no secondary position - use normal logic
                    // Add secondary daira if exists
                    if (hasSecondaryPosition && secDairaCode) {
                        const secDaira = dairas?.find(d => d.code === secDairaCode);
                        keysToGroup.push({
                            key: secDairaCode,
                            name: secDaira
                                ? (currentLocale === 'ar' ? secDaira.name_ar : secDaira.name_fr || secDaira.name_ar)
                                : `دائرة ${secDairaCode}`,
                            isSecondary: true
                        });
                    }

                    // Add primary daira
                    if (primaryDairaCode) {
                        const daira = dairas?.find(d => d.code === primaryDairaCode);
                        keysToGroup.push({
                            key: primaryDairaCode,
                            name: daira
                                ? (currentLocale === 'ar' ? daira.name_ar : daira.name_fr || daira.name_ar)
                                : `دائرة ${primaryDairaCode}`,
                            isSecondary: false
                        });
                    } else {
                        keysToGroup.push({ key: 'no-daira', name: 'غير محددة', isSecondary: false });
                    }
                }
            } else if (groupBy === 'gender') {
                const groupKey = employee.gender || 'no-gender';
                const genderLabels: Record<string, string> = {
                    'MALE': 'ذكر',
                    'FEMALE': 'أنثى'
                };
                const groupName = employee.gender
                    ? genderLabels[employee.gender] || employee.gender
                    : 'غير محدد';
                keysToGroup.push({ key: groupKey, name: groupName });
            } else if (groupBy === 'legal_position') {
                const groupKey = employee.legal_position || 'no-legal-position';
                const groupName = employee.legal_position
                    ? t(`legalPositions.${employee.legal_position.toUpperCase()}`)
                    : 'غير محدد';
                keysToGroup.push({ key: groupKey, name: groupName });
            } else {
                keysToGroup.push({ key: 'all', name: 'الكل' });
            }

            keysToGroup.forEach(({ key, name }) => {
                if (!groups[key]) {
                    groups[key] = { name: name, employees: [] };
                }
                // Avoid duplicating the employee in the exact same group
                const exists = groups[key].employees.some(e => e.id === employee.id);
                if (!exists) {
                    groups[key].employees.push(employee);
                }
            });
        });

        if (groupBy === 'position') {
            Object.values(groups).forEach(group => {
                group.employees.sort((a, b) => {
                    const levelA = a.grade?.level ?? -999;
                    const levelB = b.grade?.level ?? -999;
                    if (levelA !== levelB) {
                        return levelB - levelA;
                    }
                    const nameA = `${a.firstname_ar || ''} ${a.lastname_ar || ''}`.trim();
                    const nameB = `${b.firstname_ar || ''} ${b.lastname_ar || ''}`.trim();
                    return nameA.localeCompare(nameB, currentLocale);
                });
            });
        }

        return groups;
    }, [employees, groupBy, currentLocale, dairas]);

    const toggleGroup = (groupKey: string) => {
        setCollapsedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupKey)) {
                newSet.delete(groupKey);
            } else {
                newSet.add(groupKey);
            }
            return newSet;
        });
    };

    if (employees.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-full blur-2xl" />
                    <div className="relative bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 p-6 rounded-full shadow-inner">
                        <Building2 className="h-12 w-12 text-slate-400" strokeWidth={1.5} />
                    </div>
                </div>
                <h3 className="font-semibold text-xl mb-2 text-slate-700 dark:text-slate-200">{tCommon("noResults")}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs text-center">
                    لا يوجد موظفين مطابقين للبحث
                </p>
            </div>
        );
    }

    // Function to render a single employee card
    const renderEmployeeCard = (employee: Employee, isSecondaryPosition: boolean = false) => {
        const nameAr = `${employee.firstname_ar} ${employee.lastname_ar}`;
        const nameFr = employee.firstname_fr && employee.lastname_fr
            ? `${employee.firstname_fr} ${employee.lastname_fr}`
            : null;

        const gradeName = employee.grade
            ? (locale === 'ar' ? employee.grade.name_ar : employee.grade.name_fr || employee.grade.name_ar)
            : null;

        const positionName = employee.position
            ? (locale === 'ar' ? employee.position.name_ar : employee.position.name_fr || employee.position.name_ar)
            : null;

        const institutionName = employee.institution
            ? (locale === 'ar' ? employee.institution.name_ar : employee.institution.name_fr || employee.institution.name_ar)
            : null;

        const initials = currentLocale === 'ar'
            ? `${employee.firstname_ar?.[0] || ''}.${employee.lastname_ar?.[0] || ''}`
            : (employee.firstname_fr?.[0] || employee.firstname_ar?.[0] || '') + (employee.lastname_fr?.[0] || employee.lastname_ar?.[0] || '');

        return (
            <div
                key={employee.id}
                onClick={() => onEdit(employee)}
                className={cn(
                    "group relative bg-card rounded-2xl cursor-pointer",
                    "border border-slate-100 dark:border-slate-800",
                    "shadow-sm hover:shadow-xl",
                    "transition-all duration-300 ease-out",
                    "hover:-translate-y-1",
                    "py-8 px-6",
                    isSecondaryPosition && "border-amber-300 dark:border-amber-700 border-s-4 border-s-amber-400 bg-amber-50/20 dark:bg-amber-900/10"
                )}
            >
                {/* Profile Photo with Elegant Green Ring */}
                <div className="flex justify-center mb-6">
                    <div className="relative inline-block">
                        {/* Outer Ring Container */}
                        <div
                            className="relative rounded-full p-[3px]"
                            style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)',
                                boxShadow: '0 8px 25px -5px rgba(16, 185, 129, 0.4)'
                            }}
                        >
                            {/* White Gap */}
                            <div className="rounded-full p-[4px] bg-card">
                                {/* Avatar */}
                                <Avatar className="h-28 w-28">
                                    {employee.profile_photo ? (
                                        <AvatarImage src={employee.profile_photo} alt={nameAr} className="object-cover" />
                                    ) : null}
                                    <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 text-slate-600 dark:text-slate-300 text-3xl font-bold">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                        </div>

                        {/* Status Dot */}
                        <span
                            className={cn(
                                "absolute h-5 w-5 rounded-full border-[3px] border-white dark:border-slate-900",
                                employee.is_active ? "bg-emerald-500" : "bg-slate-400"
                            )}
                            style={{ top: '8px', right: '8px' }}
                        />
                    </div>
                </div>

                {/* Name in Arabic (Bold) */}
                <div className="flex items-center justify-center gap-2 mb-1">
                    <h3 className="text-center font-bold text-2xl text-slate-800 dark:text-slate-100">
                        {nameAr}
                    </h3>
                    {isSecondaryPosition && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-600 shrink-0">
                            🔄 منصب ثانوي
                        </Badge>
                    )}
                </div>

                {/* Position (المنصب) - Right under name */}
                {positionName && (
                    <p className="text-center text-base font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                        {positionName}
                    </p>
                )}

                {/* Secondary Position */}
                {employee.secondary_position && (
                    <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                        {locale === 'ar' ? employee.secondary_position.name_ar : employee.secondary_position.name_ar}
                    </p>
                )}

                {/* Name in French/English (Smaller) */}
                {nameFr && (
                    <p className="text-center text-lg text-slate-600 dark:text-slate-400 mb-2">
                        {nameFr}
                    </p>
                )}

                {/* Grade (الرتبة) */}
                <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6">
                    {gradeName || "—"}
                </p>

                {/* Institution Badge (المؤسسة) and Secondary Municipality */}
                <div className="flex flex-col items-center justify-center gap-2 mb-6 px-4">
                    {institutionName ? (
                        <Badge
                            variant="outline"
                            className="px-4 py-2 text-sm font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 rounded-xl max-w-full whitespace-normal text-center h-auto leading-snug block"
                        >
                            {institutionName}
                        </Badge>
                    ) : (
                        <span className="text-slate-400">—</span>
                    )}

                    {employee.secondary_institution && (
                        <Badge
                            variant="outline"
                            className="px-4 py-2 text-sm font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 rounded-xl max-w-full whitespace-normal text-center h-auto leading-snug block mt-1"
                        >
                            {locale === 'ar' ? employee.secondary_institution.name_ar : employee.secondary_institution.name_fr || employee.secondary_institution.name_ar}
                        </Badge>
                    )}

                    {employee.secondary_district && (
                        <Badge
                            variant="outline"
                            className="px-4 py-2 text-sm font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800 rounded-xl max-w-full whitespace-normal text-center h-auto leading-snug block mt-1"
                        >
                            مقاطعة {locale === 'ar' ? employee.secondary_district.name_ar : employee.secondary_district.name_fr || employee.secondary_district.name_ar}
                        </Badge>
                    )}

                    {employee.secondary_municipality && (
                        <Badge
                            variant="outline"
                            className="px-4 py-2 text-sm font-medium bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800 rounded-xl max-w-full whitespace-normal text-center h-auto leading-snug block mt-1"
                        >
                            بلدية: {locale === 'ar' ? employee.secondary_municipality.name_ar : employee.secondary_municipality.name_fr || employee.secondary_municipality.name_ar}
                        </Badge>
                    )}
                </div>

                {/* Action Icons Row */}
                <div className="flex justify-center gap-4 mb-6">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-full border-slate-200 dark:border-slate-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 dark:hover:bg-emerald-900/20"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (employee.mobile || employee.phone) {
                                window.open(`tel:${employee.mobile || employee.phone}`);
                            }
                        }}
                    >
                        <Phone className="h-5 w-5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-full border-slate-200 dark:border-slate-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 dark:hover:bg-emerald-900/20"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (employee.email) {
                                window.open(`mailto:${employee.email}`);
                            }
                        }}
                    >
                        <Mail className="h-5 w-5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-full border-slate-200 dark:border-slate-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 dark:hover:bg-emerald-900/20"
                        onClick={(e) => {
                            e.stopPropagation();
                            // Open institution map if institution exists
                            if (employee.institution?.id) {
                                window.open(`/${locale}/institutions/map?highlight=${employee.institution.id}&zoom=18`, '_blank');
                            }
                        }}
                        title={employee.institution ? `عرض موقع ${institutionName}` : 'لا توجد مؤسسة'}
                    >
                        <MapPin className="h-5 w-5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-full border-slate-200 dark:border-slate-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 dark:hover:bg-emerald-900/20"
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/${locale}/employees/${employee.id}/documents`);
                        }}
                        title={tEmp("documents")}
                    >
                        <FileText className="h-5 w-5" />
                    </Button>
                </div>

                {/* Employee ID */}
                <p className="text-center text-sm font-mono text-slate-400">
                    ID: {employee.employee_number || "—"}
                </p>
            </div>
        );
    };

    // Render grouped view
    if (groupedEmployees) {
        return (
            <div className="space-y-6">
                {Object.entries(groupedEmployees)
                    .sort((a, b) => {
                        if (groupBy === 'position') {
                            if (a[0] === 'no-position') return 1;
                            if (b[0] === 'no-position') return -1;
                            const getPosOrder = (groupKey: string, g: { name: string; employees: Employee[] }) => {
                                for (const emp of g.employees) {
                                    if (emp.position && emp.position.id === groupKey) {
                                        return emp.position.display_order ?? 9999;
                                    }
                                    if (emp.secondary_position && emp.secondary_position.id === groupKey) {
                                        return (emp.secondary_position as any).display_order ?? 9999;
                                    }
                                }
                                return g.employees[0]?.position?.display_order ?? 9999;
                            };
                            const orderA = getPosOrder(a[0], a[1]);
                            const orderB = getPosOrder(b[0], b[1]);
                            if (orderA !== orderB) {
                                return orderA - orderB;
                            }
                        }
                        if (groupBy === 'grade') {
                            if (a[0] === 'no-grade') return 1;
                            if (b[0] === 'no-grade') return -1;
                            const getGradeLevel = (g: { name: string; employees: Employee[] }) => {
                                return g.employees[0]?.grade?.level ?? -999;
                            };
                            const levelA = getGradeLevel(a[1]);
                            const levelB = getGradeLevel(b[1]);
                            if (levelA !== levelB) {
                                return levelB - levelA; // Descending (highest to lowest)
                            }
                        }
                        if (groupBy === 'institution') {
                            const getMuniName = (g: { name: string; employees: Employee[] }) => {
                                const emp = g.employees[0];
                                return emp?.institution?.municipality?.name_ar || '';
                            };
                            const muniA = getMuniName(a[1]);
                            const muniB = getMuniName(b[1]);
                            if (muniA !== muniB) {
                                return muniA.localeCompare(muniB, currentLocale);
                            }
                        }
                        return a[1].name.localeCompare(b[1].name, currentLocale);
                    })
                    .map(([groupKey, group]) => {
                    const isCollapsed = collapsedGroups.has(groupKey);
                    return (
                        <div key={groupKey} className="bg-card/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            {/* Group Header */}
                            <button
                                onClick={() => toggleGroup(groupKey)}
                                className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-l from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-900 hover:from-emerald-100 dark:hover:from-emerald-900/30 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                                        <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div className="text-end">
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                            {group.name}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
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
                            {!isCollapsed && (
                                <div className="p-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {group.employees.map((employee) => {
                                            const isSecondary = employee.secondary_position &&
                                                (employee.secondary_position.id === groupKey ||
                                                 employee.secondary_municipality?.id === groupKey ||
                                                 employee.secondary_municipality?.daira_code === groupKey);
                                            return renderEmployeeCard(employee, !!isSecondary);
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    // Render flat view (no grouping)
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {employees.map((emp) => renderEmployeeCard(emp, false))}
        </div>
    );
}
