"use client";

import { useTranslations, useLocale } from "next-intl";
import { Employee } from "@/lib/api/employees";
import { Daira } from "@/lib/api/locations"; // Import Daira
import { useMemo, useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, Trash2, Eye, FileText, ChevronDown, ChevronUp, Users } from "lucide-react";
import { useRouter } from "next/navigation";

interface EmployeesListProps {
    employees: Employee[];
    dairas?: Daira[]; // Add dairas prop
    onEdit: (employee: Employee) => void;
    onDelete: (id: string) => void;
    groupBy?: string | null;
    canEdit?: boolean;
    canDelete?: boolean;
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

export function EmployeesList({ employees, dairas = [], onEdit, onDelete, groupBy = null, canEdit = true, canDelete = true, filters }: EmployeesListProps) {
    const t = useTranslations("employees.fields");
    const tDepts = useTranslations("employees.departments");
    const tOptions = useTranslations("employees.options");
    const tCommon = useTranslations("common");
    const locale = useLocale();
    const router = useRouter();
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('employees_collapsed_groups');
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

    // Save to localStorage whenever collapsedGroups changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('employees_collapsed_groups', JSON.stringify(Array.from(collapsedGroups)));
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
                    ? (locale === 'ar' ? employee.department.name_ar : employee.department.name_fr || employee.department.name_ar)
                    : 'غير مصنف';
                keysToGroup.push({ key: groupKey, name: groupName });
            } else if (groupBy === 'institution') {
                const groupKey = employee.institution?.id || 'no-institution';
                const groupName = employee.institution
                    ? (locale === 'ar' ? employee.institution.name_ar : employee.institution.name_fr || employee.institution.name_ar)
                    : 'غير مصنف';
                keysToGroup.push({ key: groupKey, name: groupName });
            } else if (groupBy === 'position') {
                const primaryKey = employee.position?.id || 'no-position';
                const primaryName = employee.position
                    ? (locale === 'ar' ? employee.position.name_ar : employee.position.name_fr || employee.position.name_ar)
                    : 'بدون منصب';
                keysToGroup.push({ key: primaryKey, name: primaryName, isSecondary: false });

                // Add secondary position if exists
                if (employee.secondary_position?.id) {
                    keysToGroup.push({
                        key: employee.secondary_position.id,
                        name: locale === 'ar' ? employee.secondary_position.name_ar : employee.secondary_position.name_fr || employee.secondary_position.name_ar,
                        isSecondary: true
                    });
                }
            } else if (groupBy === 'grade') {
                const groupKey = employee.grade?.id || 'no-grade';
                const groupName = employee.grade
                    ? (locale === 'ar' ? employee.grade.name_ar : employee.grade.name_fr || employee.grade.name_ar)
                    : 'بدون رتبة';
                keysToGroup.push({ key: groupKey, name: groupName });
            } else if (groupBy === 'institution_municipality') {
                const municipality = employee.institution?.municipality || employee.work_municipality;
                let groupKey, groupName;
                if (municipality) {
                    groupKey = municipality.id;
                    groupName = locale === 'ar' ? municipality.name_ar : municipality.name_fr || municipality.name_ar;
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
                            name: locale === 'ar' ? secMuni.name_ar : secMuni.name_fr || secMuni.name_ar,
                            isSecondary: true
                        });
                    }
                }
            } else if (groupBy === 'employee_city') {
                const groupKey = employee.city || 'no-city';
                const groupName = employee.city || 'غير محددة';
                keysToGroup.push({ key: groupKey, name: groupName });
            } else if (groupBy === 'original_admin') {
                const groupKey = employee.original_administration_type || 'no-original-admin';
                const adminTypeLabels: Record<string, string> = {
                    'DJS': 'DJS',
                    'ODEJ': 'ODEJ',
                    'OPOW': 'OPOW',
                    'OTHER': 'أخرى',
                    'djs': 'DJS',
                    'odej': 'ODEJ',
                    'opow': 'OPOW',
                    'other': 'أخرى'
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
                                ? (locale === 'ar' ? secDaira.name_ar : secDaira.name_fr || secDaira.name_ar)
                                : `دائرة ${secDairaCode}`,
                            isSecondary: true
                        });
                    } else if (secondaryMatchesFilter && primaryMatchesFilter) {
                        // Both match - show in both dairas
                        const secDaira = dairas?.find(d => d.code === secDairaCode);
                        keysToGroup.push({
                            key: secDairaCode,
                            name: secDaira
                                ? (locale === 'ar' ? secDaira.name_ar : secDaira.name_fr || secDaira.name_ar)
                                : `دائرة ${secDairaCode}`,
                            isSecondary: true
                        });

                        // Add primary as well
                        if (primaryDairaCode) {
                            const daira = dairas?.find(d => d.code === primaryDairaCode);
                            keysToGroup.push({
                                key: primaryDairaCode,
                                name: daira
                                    ? (locale === 'ar' ? daira.name_ar : daira.name_fr || daira.name_ar)
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
                                    ? (locale === 'ar' ? daira.name_ar : daira.name_fr || daira.name_ar)
                                    : `دائرة ${primaryDairaCode}`,
                                isSecondary: false
                            });
                        } else {
                            keysToGroup.push({ key: 'no-daira', name: 'غير محددة', isSecondary: false });
                        }
                    }
                } else {
                    // Normal case: no position filter or no secondary position
                    // Add secondary daira if exists
                    if (hasSecondaryPosition && secDairaCode) {
                        const secDaira = dairas?.find(d => d.code === secDairaCode);
                        keysToGroup.push({
                            key: secDairaCode,
                            name: secDaira
                                ? (locale === 'ar' ? secDaira.name_ar : secDaira.name_fr || secDaira.name_ar)
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
                                ? (locale === 'ar' ? daira.name_ar : daira.name_fr || daira.name_ar)
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
                    'FEMALE': 'أنثى',
                    'male': 'ذكر',
                    'female': 'أنثى'
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

        // Sort employees within groups
        if (groupBy === 'grade') {
            Object.values(groups).forEach(group => {
                group.employees.sort((a, b) => {
                    const getLocName = (e: Employee) => {
                        if (e.work_location_type === 'municipality') return e.work_municipality?.name_ar || '';
                        if (e.work_location_type === 'district') return e.work_district?.name_ar || '';
                        if (e.work_location_type === 'institution') return e.institution?.name_ar || '';
                        return e.department?.name_ar || '';
                    };
                    return getLocName(a).localeCompare(getLocName(b), 'ar');
                });
            });
        } else if (groupBy === 'position') {
            Object.values(groups).forEach(group => {
                group.employees.sort((a, b) => {
                    const levelA = a.grade?.level ?? -999;
                    const levelB = b.grade?.level ?? -999;
                    if (levelA !== levelB) {
                        return levelB - levelA;
                    }
                    const nameA = `${a.firstname_ar || ''} ${a.lastname_ar || ''}`.trim();
                    const nameB = `${b.firstname_ar || ''} ${b.lastname_ar || ''}`.trim();
                    return nameA.localeCompare(nameB, locale);
                });
            });
        }

        return groups;
    }, [employees, groupBy, locale]);

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
            <div className="text-center py-12 text-muted-foreground">
                {tCommon("noResults")}
            </div>
        );
    }

    // Function to render table rows for employees - color by gender
    const getRowClass = (gender?: string) => {
        if (gender === 'FEMALE') return "bg-pink-100 hover:bg-pink-200 dark:bg-pink-900/30 dark:hover:bg-pink-900/50 border-e-4 border-e-pink-400";
        if (gender === 'MALE') return "bg-sky-50 hover:bg-sky-100 dark:bg-sky-900/20 dark:hover:bg-sky-900/40";
        return "hover:bg-muted/50";
    };

    const renderEmployeeRows = (employeesList: Employee[], startIndex: number = 0, currentGroupKey?: string) => (
        <>
            {employeesList.map((employee, index) => {
                const isSecondaryPosition = currentGroupKey &&
                    employee.secondary_position &&
                    (currentGroupKey === employee.secondary_position.id ||
                     currentGroupKey === employee.secondary_municipality?.id ||
                     currentGroupKey === employee.secondary_municipality?.daira_code);

                return (
                <TableRow
                    key={employee.id}
                    className={`${getRowClass(employee.gender)} ${isSecondaryPosition ? 'border-s-4 border-s-amber-400 bg-amber-50/30 dark:bg-amber-900/10' : ''}`}
                    style={employee.gender === 'FEMALE' && !isSecondaryPosition ? { backgroundColor: '#fce7f3' } : undefined}
                >
                    <TableCell className="font-mono text-xs text-center text-slate-500 w-12">{startIndex + index + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{employee.employee_number || "-"}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                                {employee.profile_photo ? (
                                    <AvatarImage src={employee.profile_photo} alt={locale === 'ar' ? `${employee.firstname_ar} ${employee.lastname_ar}` : `${employee.firstname_fr} ${employee.lastname_fr}`} className="object-cover" />
                                ) : null}
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {locale === 'ar'
                                        ? (employee.firstname_ar?.[0] || 'A')
                                        : (employee.firstname_fr?.[0] || 'A')}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">
                                        {locale === 'ar'
                                            ? `${employee.firstname_ar} ${employee.lastname_ar}`
                                            : `${employee.firstname_fr} ${employee.lastname_fr}`}
                                    </span>
                                    {isSecondaryPosition && (
                                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-600">
                                            🔄 منصب ثانوي
                                        </Badge>
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {employee.grade ? (locale === 'ar' ? employee.grade.name_ar : employee.grade.name_fr || employee.grade.name_ar) : "-"}
                                </span>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                            {employee.position ? (locale === 'ar' ? employee.position.name_ar : employee.position.name_fr || employee.position.name_ar) : "-"}
                            {employee.secondary_position && (
                                <Badge variant="secondary" className="text-xs mt-1">
                                    {locale === 'ar' ? employee.secondary_position.name_ar : employee.secondary_position.name_ar}
                                </Badge>
                            )}
                        </div>
                    </TableCell>
                    {groupBy !== 'institution' && (
                        <TableCell>
                            <div className="flex flex-col gap-1 items-start">
                                {/* Primary Work Location */}
                                {employee.legal_position && employee.legal_position !== 'ACTIVE' && employee.legal_position_destination ? (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700">
                                        {employee.legal_position_destination}
                                    </Badge>
                                ) : employee.position?.name_ar?.includes('مستشار مقاطعة') && employee.work_district ? (
                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700">
                                        مقاطعة {locale === 'ar' ? employee.work_district.name_ar : employee.work_district.name_fr || employee.work_district.name_ar}
                                    </Badge>
                                ) : (employee.position?.name_ar?.includes('ملحق بلدي') || employee.position?.name_ar?.includes('ملحق رياضة') || employee.position?.name_ar?.includes('مندوب')) && employee.work_municipality ? (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
                                        بلدية {employee.work_municipality.name_ar}
                                    </Badge>
                                ) : employee.work_location_type === 'municipality' && employee.work_municipality ? (
                                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700">
                                        {tOptions("locationTypes.municipality")}: {employee.work_municipality.name_ar}
                                    </Badge>
                                ) : employee.work_location_type === 'district' && employee.work_district ? (
                                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700">
                                        مقاطعة {locale === 'ar' ? employee.work_district.name_ar : employee.work_district.name_fr || employee.work_district.name_ar}
                                    </Badge>
                                ) : employee.work_location_type === 'institution' && employee.institution ? (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700">
                                        {locale === 'ar' ? employee.institution.name_ar : employee.institution.name_ar}
                                    </Badge>
                                ) : employee.institution ? (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700">
                                        {locale === 'ar' ? employee.institution.name_ar : employee.institution.name_ar}
                                    </Badge>
                                ) : employee.department ? (
                                    <Badge variant="outline">{locale === 'ar' ? employee.department.name_ar : employee.department.name_fr || employee.department.name_ar}</Badge>
                                ) : (
                                    "-"
                                )}

                                {/* Secondary Work Locations (e.g., Delegate Municipality, Secondary Institution) */}
                                {employee.secondary_institution && (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700 mt-1">
                                        {locale === 'ar' ? employee.secondary_institution.name_ar : employee.secondary_institution.name_fr || employee.secondary_institution.name_ar}
                                    </Badge>
                                )}
                                {employee.secondary_district && (
                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700 mt-1">
                                        مقاطعة {locale === 'ar' ? employee.secondary_district.name_ar : employee.secondary_district.name_fr || employee.secondary_district.name_ar}
                                    </Badge>
                                )}
                                {employee.secondary_municipality && (
                                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700 mt-1">
                                        {tOptions("locationTypes.municipality")}: {locale === 'ar' ? employee.secondary_municipality.name_ar : employee.secondary_municipality.name_fr || employee.secondary_municipality.name_ar}
                                    </Badge>
                                )}
                            </div>
                        </TableCell>
                    )}
                    <TableCell>
                        <div className="flex flex-col gap-1">
                            {employee.legal_position && employee.legal_position !== 'ACTIVE' ? (
                                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700">
                                    {t(`legalPositions.${employee.legal_position.toUpperCase()}`)}
                                </Badge>
                            ) : (
                                <Badge variant={employee.is_active ? "success" : "secondary"}>
                                    {employee.is_active ? tCommon("active") : tCommon("inactive")}
                                </Badge>
                            )}
                        </div>
                    </TableCell>
                    <TableCell className="text-end">
                        <div className="flex items-center justify-end gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push(`/${locale}/employees/${employee.id}`)}
                                title={tCommon("view")}
                            >
                                <Eye className="h-4 w-4 text-emerald-500" />
                            </Button>
                            {canEdit && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onEdit(employee)}
                                    title={tCommon("edit")}
                                >
                                    <Edit className="h-4 w-4 text-blue-500" />
                                </Button>
                            )}
                            {canEdit && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => router.push(`/${locale}/employees/${employee.id}/documents`)}
                                    title={t("documents")}
                                >
                                    <FileText className="h-4 w-4 text-emerald-600" />
                                </Button>
                            )}
                            {canDelete && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onDelete(employee.id)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    title={tCommon("delete")}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </TableCell>
                </TableRow>
            );
            })}
        </>
    );

    // Render grouped view
    if (groupedEmployees) {
        return (
            <div className="space-y-4">
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
                                return muniA.localeCompare(muniB, locale);
                            }
                        }
                        return a[1].name.localeCompare(b[1].name, locale);
                    })
                    .map(([groupKey, group]) => {
                    const isCollapsed = collapsedGroups.has(groupKey);
                    return (
                        <div key={groupKey} className="rounded-lg border bg-card shadow-sm overflow-hidden">
                            {/* Group Header */}
                            <button
                                onClick={() => toggleGroup(groupKey)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-l from-emerald-50 to-transparent dark:from-emerald-900/20 dark:to-transparent hover:from-emerald-100 dark:hover:from-emerald-900/30 transition-colors border-b border-border"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                                        <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
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

                            {/* Group Content - Table */}
                            {!isCollapsed && (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12 text-center">#</TableHead>
                                            <TableHead>{t("employeeNumber")}</TableHead>
                                            <TableHead>{tCommon("name")}</TableHead>
                                            <TableHead>{t("position")}</TableHead>
                                            {groupBy !== 'institution' && <TableHead>مكان العمل</TableHead>}
                                            <TableHead>{t("status")}</TableHead>
                                            <TableHead className="text-end">إجراءات</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {renderEmployeeRows(group.employees, 0, groupKey)}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    // Render flat view (no grouping)
    return (
        <div className="rounded-md border bg-card shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12 text-center">#</TableHead>
                        <TableHead>{t("employeeNumber")}</TableHead>
                        <TableHead>{tCommon("name")}</TableHead>
                        <TableHead>{t("position")}</TableHead>
                        {groupBy !== 'institution' && <TableHead>مكان العمل</TableHead>}
                        <TableHead>{t("status")}</TableHead>
                        <TableHead className="text-end">إجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {renderEmployeeRows(employees)}
                </TableBody>
            </Table>
        </div>
    );
}
