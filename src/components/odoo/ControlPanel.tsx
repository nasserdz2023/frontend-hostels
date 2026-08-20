"use client";

import React from "react";
import { ChevronRight, LayoutList, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { OdooSearch, FilterOption, GroupOption, Favorite } from "./OdooSearch";

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface ControlPanelProps {
    title: string;
    breadcrumbs?: BreadcrumbItem[];
    searchPlaceholder?: string;
    // Search Options
    searchFilters?: FilterOption[];
    searchGrouping?: GroupOption[];
    onSearch?: (value: string) => void;
    onFilterChange?: (filters: any) => void; // Updated to accept Record definition
    onGroupChange?: (group: string | null) => void;
    searchQuery?: string;
    activeGroupBy?: string | null;
    // Favorites
    favorites?: Favorite[];
    onSaveFavorite?: (name: string, filters: any, groupBy: string | null, query: string) => void;
    onDeleteFavorite?: (id: string) => void;
    onFavoriteSelect?: (favorite: Favorite) => void;

    // Actions are usually buttons like "New", "Upload", etc.
    actions?: React.ReactNode;
    // View Switcher props
    viewType?: "list" | "kanban";
    onViewChange?: (view: "list" | "kanban") => void;
    onCreateClick?: () => void;
    createLabel?: string;
    className?: string;
    hideBreadcrumbs?: boolean;
    hideSearch?: boolean;
}

export function ControlPanel({
    title,
    breadcrumbs = [],
    searchPlaceholder = "Search...",
    searchFilters,
    searchGrouping,
    onSearch,
    onFilterChange,
    onGroupChange,
    searchQuery,
    activeGroupBy,
    favorites = [],
    onSaveFavorite,
    onDeleteFavorite,
    onFavoriteSelect,
    actions,
    viewType = "list",
    onViewChange,
    onCreateClick,
    createLabel,
    className,
    hideBreadcrumbs = false,
    hideSearch = false
}: ControlPanelProps) {
    const t = useTranslations("common"); // Use common translations for 'home'

    return (
        <div className={cn("bg-card border-b border-border sticky top-0 z-40", className)}>
            {/* Top Row: Breadcrumbs, Actions & View Switcher */}
            <div className="flex flex-col md:flex-row md:items-center justify-between p-2 gap-2 min-h-[50px]">
                {/* Left Side: Breadcrumbs & Actions */}
                <div className="flex items-center gap-4 flex-1">
                    {/* Breadcrumbs */}
                    {hideBreadcrumbs ? (
                        <div className="font-semibold text-lg text-foreground px-2">
                            {title}
                        </div>
                    ) : (
                        <nav className="flex items-center text-sm font-medium text-muted-foreground overflow-hidden whitespace-nowrap">
                            <Link href="/camp-registration" className="hover:text-primary transition-colors">
                                {t("home")}
                            </Link>
                            {breadcrumbs.map((crumb, index) => (
                                <React.Fragment key={index}>
                                    <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground/50" />
                                    {crumb.href ? (
                                        <Link href={crumb.href} className="hover:text-primary transition-colors">
                                            {crumb.label}
                                        </Link>
                                    ) : (
                                        <span className="text-foreground font-semibold">{crumb.label}</span>
                                    )}
                                </React.Fragment>
                            ))}
                            {!breadcrumbs.length && (
                                <>
                                    <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground/50" />
                                    <span className="text-foreground font-semibold">{title}</span>
                                </>
                            )}
                        </nav>
                    )}

                    {/* Actions (New Button, etc) - Placed next to breadcrumbs/title */}
                    <div className="flex items-center gap-2">
                        {onCreateClick && (
                            <Button size="sm" onClick={onCreateClick} className="gap-1">
                                <span className="text-lg leading-none mb-0.5">+</span>
                                {createLabel || t("new")}
                            </Button>
                        )}
                        {actions}
                    </div>
                </div>

                {/* Right Side: View Switcher */}
                <div className="flex items-center bg-muted rounded-lg p-0.5 shrink-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-7 px-2 rounded-md", viewType === "list" ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
                        onClick={() => onViewChange?.("list")}
                    >
                        <LayoutList className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-7 px-2 rounded-md", viewType === "kanban" ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
                        onClick={() => onViewChange?.("kanban")}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Bottom Row: Advanced Search (Odoo Style) */}
            {!hideSearch && (
                <div className="px-2 pb-2 w-full flex justify-center">
                    <div className="w-full max-w-2xl">
                        <OdooSearch
                            placeholder={searchPlaceholder}
                            filters={searchFilters}
                            groupByOptions={searchGrouping}
                            favorites={favorites}
                            onSearch={onSearch}
                            onFilterChange={onFilterChange}
                            onGroupChange={onGroupChange}
                            initialSearch={searchQuery}
                            initialGroupBy={activeGroupBy}
                            onFavoriteSelect={onFavoriteSelect}
                            onSaveFavorite={onSaveFavorite}
                            onDeleteFavorite={onDeleteFavorite}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
