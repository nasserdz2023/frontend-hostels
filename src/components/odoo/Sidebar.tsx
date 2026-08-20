"use client";

import { useEffect } from "react";
import { Tent, MapPin, CloudDownload, Users, IdCard, Bot, Settings, type LucideIcon } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/lib/stores/settings";
import { useAuthStore } from "@/lib/stores/auth";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavItem {
    titleKey: string;
    href: string;
    icon: LucideIcon;
    visible?: boolean;
    badge?: string;
}

interface NavGroup {
    type: "group";
    id: string;
    titleKey: string;
    icon: LucideIcon;
    visible?: boolean;
    items: NavItem[];
}

type NavConfigItem = NavGroup;

export function Sidebar({ className, isCollapsed, onItemClick }: { className?: string; isCollapsed?: boolean; onItemClick?: () => void }) {
    const t = useTranslations("nav");
    const locale = useLocale();
    const pathname = usePathname();
    const { fetchSettings, isModuleEnabled } = useSettingsStore();
    const { hasPermission, _hasHydrated } = useAuthStore();

    const navConfig: NavConfigItem[] = [
        // Members Group
        {
            type: "group",
            id: "members",
            titleKey: "members",
            icon: Users,
            visible: isModuleEnabled("members"),
            items: [
                {
                    titleKey: "members",
                    href: "/members",
                    icon: Users,
                    visible: isModuleEnabled("members") && hasPermission("members", "view"),
                },
            ]
        },
        // Camp Management Group
        {
            type: "group",
            id: "camp",
            titleKey: "camp_management",
            icon: Tent,
            visible: isModuleEnabled("camp_registration") || isModuleEnabled("ministerial_sync"),
            items: [
                {
                    titleKey: "camp_registration",
                    href: "/camp-registration",
                    icon: Tent,
                    visible: isModuleEnabled("camp_registration") && hasPermission("camp_registration", "view"),
                },
                {
                    titleKey: "camp_trips",
                    href: "/camp-trips",
                    icon: MapPin,
                    visible: isModuleEnabled("camp_trips") && hasPermission("camp_trips", "view"),
                },
                {
                    titleKey: "ministerial_sync",
                    href: "/ministerial-sync",
                    icon: CloudDownload,
                    visible: isModuleEnabled("ministerial_sync") && hasPermission("ministerial_sync", "view"),
                },
                {
                    titleKey: "members",
                    href: "/members",
                    icon: IdCard,
                    visible: hasPermission("members", "view"),
                },
                {
                    titleKey: "guardians",
                    href: "/guardians",
                    icon: Users,
                    visible: hasPermission("guardians", "view"),
                },
                {
                    titleKey: "youth_connect",
                    href: "/youth-connect",
                    icon: Bot,
                    visible: hasPermission("youth_connect", "view"),
                },
            ]
        },
    ];

    useEffect(() => {
        fetchSettings();
    }, []);

    // Filter Items — respect hydration state.
    const filteredConfig = _hasHydrated
        ? navConfig
              .map((item): NavConfigItem | null => {
                  if (item.visible === false) return null;

                  const visibleItems = item.items.filter(
                      (subItem) => subItem.visible !== false
                  );
                  if (visibleItems.length === 0) return null;
                  return { ...item, items: visibleItems };
              })
              .filter((item): item is NavConfigItem => item !== null)
        : [];

    // Mapping for Labels (Fallback if translation missing)
    const getLabel = (key: string) => {
        if (t?.has?.(key)) return t(key);
        return key.charAt(0).toUpperCase() + key.slice(1);
    };

    return (
        <div className={cn("flex flex-col h-full bg-card dark:bg-card border-e border-border transition-all duration-300 ease-in-out", isCollapsed ? "w-[64px]" : "w-[256px]", className)}>
            <div className="flex-1 overflow-y-auto py-4">
                <nav className="grid gap-1 px-2">
                    <Accordion type="multiple" className="w-full">
                        {filteredConfig.map((item) => (
                            <AccordionItem key={item.id} value={item.id} className="border-none">
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
                                        {item.items.map((subItem) => {
                                            const isSubActive = pathname.includes(subItem.href);
                                            return (
                                                <Link
                                                    key={subItem.href}
                                                    href={`/${locale}${subItem.href}`}
                                                    onClick={onItemClick}
                                                    className={cn(
                                                        "relative flex items-center gap-3 rounded-md py-2 px-3 text-sm transition-colors overflow-hidden whitespace-nowrap",
                                                        isSubActive
                                                            ? "text-primary font-medium bg-primary/5"
                                                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                                                        isCollapsed && "justify-center px-0"
                                                    )}
                                                    title={isCollapsed ? getLabel(subItem.titleKey) : undefined}
                                                >
                                                    <subItem.icon className={cn("h-4 w-4 shrink-0", isSubActive ? "text-primary" : "text-muted-foreground/70")} />
                                                    {!isCollapsed && <span>{getLabel(subItem.titleKey)}</span>}
                                                    {!isCollapsed && subItem.badge ? (
                                                        <span className="ms-auto rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium leading-none text-primary">
                                                            {subItem.badge}
                                                        </span>
                                                    ) : null}
                                                    {isCollapsed && subItem.badge ? (
                                                        <span className="absolute end-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                                                    ) : null}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </nav>
            </div>

            {/* Bottom Section (Settings) */}
            <div className="mt-auto p-2 border-t border-border/50">
                <Link
                    href={`/${locale}/settings`}
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
