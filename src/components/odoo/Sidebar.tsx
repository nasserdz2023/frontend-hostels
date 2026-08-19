"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import {
    Users,
    MapPin,
    Medal,
    Briefcase,
    Heart,
    UserPlus,
    Settings,
} from "lucide-react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

import { useSettingsStore } from "@/lib/stores/settings";
import { useAuthStore } from "@/lib/stores/auth";
import { useEffect } from "react";

export function Sidebar({ className, isCollapsed, onItemClick }: { className?: string; isCollapsed?: boolean; onItemClick?: () => void }) {
    const t = useTranslations("nav");
    const pathname = usePathname();
    const { fetchSettings, isModuleEnabled } = useSettingsStore();
    const { hasPermission, _hasHydrated } = useAuthStore();

    useEffect(() => {
        fetchSettings();
    }, []);

    // Navigation config — only employees-related items
    const navConfig = [
        // Employees
        {
            type: "group",
            id: "employees",
            titleKey: "employees",
            icon: Users,
            visible: isModuleEnabled("hr"),
            items: [
                {
                    titleKey: "employees",
                    href: "/employees",
                    icon: Users,
                    visible: hasPermission("employees", "view"),
                },
                {
                    titleKey: "wishes",
                    href: "/employees/wishes",
                    icon: Heart,
                    visible: hasPermission("employees", "wishes.view") || hasPermission("employees", "view") || hasPermission("employees", "edit") || hasPermission("employees", "wishes.master_pdf") || hasPermission("employees", "wishes.export"),
                },
                {
                    titleKey: "employee_requests",
                    href: "/employees/requests",
                    icon: UserPlus,
                    visible: hasPermission("employees", "requests.view") || hasPermission("employees", "requests.manage"),
                },
            ]
        },

        // Grades & Positions
        {
            type: "group",
            id: "grades",
            titleKey: "grades",
            icon: Medal,
            visible: hasPermission("employees", "grades.view") || hasPermission("employees", "grades.manage"),
            items: [
                {
                    titleKey: "grades",
                    href: "/employees/grades",
                    icon: Medal,
                    visible: hasPermission("employees", "grades.view") || hasPermission("employees", "grades.manage"),
                },
                {
                    titleKey: "positions",
                    href: "/employees/positions",
                    icon: Briefcase,
                    visible: hasPermission("employees", "positions.view"),
                },
                {
                    titleKey: "districts",
                    href: "/employees/districts",
                    icon: MapPin,
                    visible: hasPermission("employees", "districts.view"),
                },
                {
                    titleKey: "offices",
                    href: "/employees/offices",
                    icon: Briefcase,
                    visible: hasPermission("settings", "manage"),
                },
            ]
        },
    ];

    // Filter Items — respect hydration state like frontend-v2
    const filteredConfig = _hasHydrated ? navConfig.map(group => {
        if (!group.visible) return null;

        if (group.type === "group") {
            const visibleItems = group.items?.filter(item => item.visible) || [];
            if (visibleItems.length === 0) return null;
            return { ...group, items: visibleItems };
        }
        return group;
    }).filter(Boolean) : [];

    // Mapping for Labels (Fallback)
    const getLabel = (key: string) => {
        if (t?.has?.(key)) return t(key);
        const labels: Record<string, string> = {
            employees: "الموظفون",
            wishes: "الرغبات",
            employee_requests: "طلبات الموظفين",
            grades: "الرتب والأجور",
            positions: "المناصب",
            districts: "الأقاليم",
            offices: "المكاتب",
        };
        return labels[key] || key.charAt(0).toUpperCase() + key.slice(1);
    };

    return (
        <div className={cn("flex flex-col h-full bg-card dark:bg-card border-e border-border transition-all duration-300 ease-in-out", isCollapsed ? "w-[64px]" : "w-[256px]", className)}>
            <div className="flex-1 overflow-y-auto py-4">
                <nav className="grid gap-1 px-2">
                    <Accordion type="multiple" className="w-full">
                        {filteredConfig.map((item: any, index) => {
                            if (item.type === 'item') {
                                const isActive = pathname.includes(item.href);
                                return (
                                    <Link
                                        key={index}
                                        href={item.href}
                                        onClick={onItemClick}
                                        className={cn(
                                            "flex items-center gap-3 rounded-md py-2.5 px-3 text-sm font-medium transition-colors mb-1 overflow-hidden whitespace-nowrap",
                                            isActive
                                                ? "bg-primary/10 text-primary"
                                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                            isCollapsed && "justify-center px-0"
                                        )}
                                        title={isCollapsed ? getLabel(item.titleKey) : undefined}
                                    >
                                        <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                                        {!isCollapsed && <span>{getLabel(item.titleKey)}</span>}
                                    </Link>
                                );
                            } else {
                                // Group (Accordion)
                                return (
                                    <AccordionItem key={index} value={item.id} className="border-none">
                                        <AccordionTrigger className={cn(
                                            "py-2.5 px-3 hover:bg-accent hover:text-accent-foreground rounded-md hover:no-underline text-muted-foreground",
                                            isCollapsed && "justify-center px-0"
                                        )}>
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <item.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                                                {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap">{getLabel(item.titleKey)}</span>}
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-0" dir="rtl">
                                            <div className={cn("flex flex-col gap-1", !isCollapsed && "me-4 border-e border-border pe-2")}>
                                                {item.items.map((subItem: any, subIndex: number) => {
                                                    const isSubActive = pathname.includes(subItem.href);
                                                    return (
                                                        <Link
                                                            key={subIndex}
                                                            href={subItem.href}
                                                            onClick={onItemClick}
                                                            className={cn(
                                                                "flex items-center gap-3 rounded-md py-2 px-3 text-sm transition-colors overflow-hidden whitespace-nowrap",
                                                                isSubActive
                                                                    ? "text-primary font-medium bg-primary/5"
                                                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                                                                isCollapsed && "justify-center px-0"
                                                            )}
                                                            title={isCollapsed ? getLabel(subItem.titleKey) : undefined}
                                                        >
                                                            <subItem.icon className={cn("h-4 w-4 shrink-0", isSubActive ? "text-primary" : "text-muted-foreground/70")} />
                                                            {!isCollapsed && <span>{getLabel(subItem.titleKey)}</span>}
                                                        </Link>
                                                    )
                                                })}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            }
                        })}
                    </Accordion>
                </nav>
            </div>

            {/* Bottom Section (Settings) */}
            <div className="mt-auto p-2 border-t border-border/50">
                <Link
                    href="/settings"
                    onClick={onItemClick}
                    className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground overflow-hidden whitespace-nowrap",
                        isCollapsed && "justify-center px-0"
                    )}
                    title={isCollapsed ? "Settings" : undefined}
                >
                    <Settings className="h-5 w-5 shrink-0 text-muted-foreground" />
                    {!isCollapsed && <span>{t.has('settings') ? t('settings') : 'Settings'}</span>}
                </Link>
            </div>
        </div>
    );
}
