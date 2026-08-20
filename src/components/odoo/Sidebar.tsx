"use client";

import { useEffect } from "react";
import { Tent, MapPin, CloudDownload, Users, IdCard, Bot } from "lucide-react";
import { useSettingsStore } from "@/lib/stores/settings";
import { useAuthStore } from "@/lib/stores/auth";
import { Sidebar as SharedSidebar, type NavConfigItem } from "@djs/shared/odoo";

export function Sidebar({ className, isCollapsed, onItemClick }: { className?: string; isCollapsed?: boolean; onItemClick?: () => void }) {
    const { isModuleEnabled } = useSettingsStore();
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

    return (
        <SharedSidebar
            navConfig={navConfig}
            isCollapsed={isCollapsed}
            className={className}
            onItemClick={onItemClick}
        />
    );
}
