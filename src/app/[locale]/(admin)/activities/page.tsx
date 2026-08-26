"use client";

import { useState, useEffect, use } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ControlPanel } from "@/components/odoo/ControlPanel";
import { useInstitutionsStore } from "@/lib/stores/institutions";
import { useAuthStore } from "@/lib/stores/auth";
import { PermissionGuard } from "@/hooks/useRequirePermission";
import {
    activitiesApi,
    ActivityListItem,
    ActivityCategory,
    ActivityStatus,
    ACTIVITY_STATUS_LABELS,
    ACTIVITY_TYPE_LABELS,
    ActivityType
} from "@/lib/api/activities";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Users, Star, Calendar } from "lucide-react";

// Status badge colors
const statusColors: Record<ActivityStatus, string> = {
    [ActivityStatus.DRAFT]: 'bg-gray-100 text-gray-800',

    [ActivityStatus.PENDING_DEPARTMENT]: 'bg-yellow-100 text-yellow-800',
    [ActivityStatus.PENDING_DIRECTOR]: 'bg-orange-100 text-orange-800',
    [ActivityStatus.APPROVED]: 'bg-blue-100 text-blue-800',
    [ActivityStatus.PUBLISHED]: 'bg-indigo-100 text-indigo-800',
    [ActivityStatus.ONGOING]: 'bg-green-100 text-green-800',
    [ActivityStatus.COMPLETED]: 'bg-purple-100 text-purple-800',
    [ActivityStatus.CANCELLED]: 'bg-red-100 text-red-800',
    [ActivityStatus.REJECTED]: 'bg-red-100 text-red-800',
    [ActivityStatus.POSTPONED]: 'bg-orange-100 text-orange-800',
    [ActivityStatus.RESERVATION]: 'bg-blue-50 text-blue-600',
};

export default function ActivitiesPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = use(params);
    const t = useTranslations("activities");
    const tCommon = useTranslations("common");
    const router = useRouter();

    // Data state
    const [activities, setActivities] = useState<ActivityListItem[]>([]);
    const [categories, setCategories] = useState<ActivityCategory[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [viewType, setViewType] = useState<"list" | "kanban">("list");

    // Filters state
    const [filters, setFilters] = useState<{
        search?: string;
        category_id?: string;
        institution_id?: string;
        status?: string;
        page: number;
    }>({ page: 1 });

    // Get institutions from store
    // Get institutions from store
    const { fetchInstitutions, institutions } = useInstitutionsStore();
    const { user, hasPermission } = useAuthStore();

    // Permission checks
    const canCreate = hasPermission('activities', 'create');
    const canEdit = hasPermission('activities', 'edit') || hasPermission('activities', 'edit_own');
    const canDelete = hasPermission('activities', 'delete') || hasPermission('activities', 'delete_own_draft');

    // Load initial data and set defaults
    useEffect(() => {
        loadCategories();
        fetchInstitutions({ size: 100 });

        // Default filter for DEV_ADMIN to their institution (Directorate) if set
        if (user?.role === 'dev_admin' && user?.institution_id && !filters.institution_id) {
            setFilters(prev => ({ ...prev, institution_id: user.institution_id }));
        }
    }, [fetchInstitutions, user?.role, user?.institution_id]);

    // Load activities when filters change
    useEffect(() => {
        loadActivities();
    }, [filters]);

    const loadCategories = async () => {
        try {
            const data = await activitiesApi.getCategories();
            setCategories(data);
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    };

    const loadActivities = async () => {
        try {
            setIsLoading(true);
            const response = await activitiesApi.getActivities({
                search: filters.search,
                category_id: filters.category_id,
                institution_id: filters.institution_id,
                status: filters.status as ActivityStatus | undefined,
                page: filters.page,
                size: 20,
            });
            setActivities(response.items);
            setTotal(response.total);
        } catch (error) {
            console.error('Failed to load activities:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Prepare Search Filters for ControlPanel
    const searchFilters = [
        {
            id: 'institution_id',
            label: t("form.institution"),
            type: 'select' as const,
            options: institutions.map(inst => ({
                label: inst.name_ar,
                value: inst.id
            }))
        },
        {
            id: 'status',
            label: t("table.status"),
            type: 'select' as const,
            options: Object.entries(ACTIVITY_STATUS_LABELS).map(([key, labels]) => ({
                label: labels.ar,
                value: key
            }))
        }
    ];

    // Group By Options
    const groupByOptions = [
        { id: "category", label: t("form.category") },
        { id: "status", label: t("table.status") }
    ];

    // Handle Search
    const handleSearch = (query: string) => {
        setFilters(prev => ({ ...prev, search: query, page: 1 }));
    };

    const handleFilterChange = (activeFilters: Record<string, any>) => {
        setFilters(prev => ({
            ...prev,
            category_id: activeFilters['category_id'] || undefined,
            institution_id: activeFilters['institution_id'] || undefined,
            status: activeFilters['status'] || undefined,
            page: 1
        }));
    };

    const handleDelete = async (id: string) => {
        if (confirm(t("actions.confirmDelete"))) {
            try {
                await activitiesApi.deleteActivity(id);
                loadActivities();
            } catch (error) {
                console.error('Failed to delete activity:', error);
            }
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('ar-DZ', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="flex flex-col h-full bg-background">
            <ControlPanel
                title={t("title")}
                viewType={viewType}
                onViewChange={setViewType}
                onSearch={handleSearch}
                searchFilters={searchFilters}
                searchGrouping={groupByOptions}
                onFilterChange={handleFilterChange}
                onGroupChange={() => { }}
                favorites={[]}
                onCreateClick={canCreate ? () => router.push(`/${locale}/activities/new`) : undefined}
            />

            <div className="flex-1 p-6 overflow-auto">
                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : activities.length === 0 ? (
                    <Card className="p-12 text-center">
                        <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium mb-2">{t("list.noActivities")}</h3>
                        <p className="text-gray-500 mb-4">{t("list.addFirst")}</p>
                        {canCreate && (
                            <Button onClick={() => router.push(`/${locale}/activities/new`)}>
                                {t("list.add")}
                            </Button>
                        )}
                    </Card>
                ) : viewType === "list" ? (
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("table.code")}</TableHead>
                                    <TableHead>{t("table.title")}</TableHead>

                                    <TableHead>{t("table.institution")}</TableHead>
                                    <TableHead>{t("table.startDate")}</TableHead>
                                    <TableHead>{t("table.status")}</TableHead>
                                    <TableHead>{t("table.participants")}</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activities.map((activity) => (
                                    <TableRow
                                        key={activity.id}
                                        className="cursor-pointer hover:bg-gray-50"
                                        onClick={() => router.push(`/${locale}/activities/${activity.id}`)}
                                    >
                                        <TableCell className="font-mono text-sm">
                                            {activity.is_featured && (
                                                <Star className="w-3 h-3 text-yellow-500 inline me-1" />
                                            )}
                                            {activity.code}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {activity.title_ar}
                                        </TableCell>

                                        <TableCell>
                                            {activity.institution?.name_ar}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(activity.start_date)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={statusColors[activity.status]}>
                                                {ACTIVITY_STATUS_LABELS[activity.status]?.ar}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="flex items-center gap-1">
                                                <Users className="w-4 h-4" />
                                                {activity.registrations_count}
                                                {activity.max_participants > 0 && `/${activity.max_participants}`}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/${locale}/activities/${activity.id}`);
                                                    }}>
                                                        {t("actions.view")}
                                                    </DropdownMenuItem>
                                                    {canEdit && (
                                                        <DropdownMenuItem onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/${locale}/activities/${activity.id}/edit`);
                                                        }}>
                                                            {t("actions.edit")}
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/${locale}/activities/${activity.id}/registrations`);
                                                    }}>
                                                        {t("registrations.title")}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/${locale}/activities/${activity.id}/sessions`);
                                                    }}>
                                                        {t("sessions.title")}
                                                    </DropdownMenuItem>
                                                    {canDelete && (
                                                        <DropdownMenuItem
                                                            className="text-red-600"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(activity.id);
                                                            }}
                                                        >
                                                            {t("actions.delete")}
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                ) : (
                    // Kanban View - Simple Grid for now
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {activities.map((activity) => (
                            <Card
                                key={activity.id}
                                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => router.push(`/${locale}/activities/${activity.id}`)}
                            >
                                {activity.cover_image && (
                                    <img
                                        src={activity.cover_image}
                                        alt={activity.title_ar}
                                        className="w-full h-32 object-cover rounded mb-3"
                                    />
                                )}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono text-gray-500">{activity.code}</span>
                                        {activity.is_featured && <Star className="w-4 h-4 text-yellow-500" />}
                                    </div>
                                    <h3 className="font-semibold">{activity.title_ar}</h3>
                                    {activity.category && (
                                        <Badge style={{ backgroundColor: activity.category.color + '20', color: activity.category.color }}>
                                            {activity.category.name_ar}
                                        </Badge>
                                    )}
                                    <div className="flex items-center justify-between text-sm text-gray-500">
                                        <span>{formatDate(activity.start_date)}</span>
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {activity.registrations_count}
                                        </span>
                                    </div>
                                    <Badge className={statusColors[activity.status]}>
                                        {ACTIVITY_STATUS_LABELS[activity.status]?.ar}
                                    </Badge>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {total > 20 && (
                <div className="flex justify-center gap-2 p-4 border-t">
                    <Button
                        variant="outline"
                        disabled={filters.page === 1}
                        onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                        {tCommon("previous")}
                    </Button>
                    <span className="flex items-center px-4">
                        {filters.page} / {Math.ceil(total / 20)}
                    </span>
                    <Button
                        variant="outline"
                        disabled={filters.page >= Math.ceil(total / 20)}
                        onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                        {tCommon("next")}
                    </Button>
                </div>
            )}
        </div>
    );
}
