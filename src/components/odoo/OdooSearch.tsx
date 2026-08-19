"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from "next-intl";
import { Search, ChevronDown, Filter, Layers, X, Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * OdooSearch Component - Unified Smart Search Bar
 * Design ported from AdminDashboard.tsx (lines 1636-1743)
 */

export interface FilterOption {
    id: string;
    label: string;
    type: 'select' | 'multiselect' | 'date' | 'daterange' | 'text' | 'number' | 'boolean';
    options?: Array<{ label: string; value: string }>;
    value?: any;
    defaultValue?: any; // For multiselect default values
    icon?: React.ReactNode;
}

export interface GroupOption {
    id: string;
    label: string;
}

export interface Favorite {
    id: string;
    label: string; // adapted from 'name' in old code to match new interface usage
    filters: Record<string, any>;
    groupBy: string | null;
    searchQuery: string;
}

interface OdooSearchProps {
    placeholder?: string;
    filters?: FilterOption[];
    groupByOptions?: GroupOption[];
    favorites?: Favorite[];
    onSearch?: (value: string) => void;
    onFilterChange?: (activeFilters: Record<string, any>) => void;
    onGroupChange?: (group: string | null) => void;
    onFavoriteSelect?: (favorite: Favorite) => void;
    onSaveFavorite?: (name: string, filters: any, groupBy: string | null, query: string) => void;
    onDeleteFavorite?: (id: string) => void;
    initialSearch?: string;
    initialGroupBy?: string | null;
    className?: string;
}

export function OdooSearch({
    placeholder = 'Search...',
    filters = [],
    groupByOptions = [],
    favorites = [],
    onSearch,
    onFilterChange,
    onGroupChange,
    onFavoriteSelect,
    onSaveFavorite,
    onDeleteFavorite,
    initialSearch = "",
    initialGroupBy = null,
    className = '',
}: OdooSearchProps) {
    // Pastel color variants for filter groups
    const colorVariants = [
        "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20",
        "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20",
        "bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/20",
        "bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/20",
        "bg-pink-50 dark:bg-pink-900/10 border-pink-100 dark:border-pink-900/20",
        "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900/20",
        "bg-teal-50 dark:bg-teal-900/10 border-teal-100 dark:border-teal-900/20",
    ];

    const t = useTranslations("common");
    const [searchValue, setSearchValue] = useState(initialSearch);
    const [showMenu, setShowMenu] = useState(false);
    const [newFavoriteName, setNewFavoriteName] = useState("");

    // State for Active Filters & Grouping
    // We treat 'boolean' filters as simple toggles in the 'filterValues' map.
    // For 'select' or 'text' filters, we might need a more complex UI in the dropdown,
    // but AdminDashboard example mainly showed simple toggles.
    // We will adapt to support the generic types.

    // Initialize with default values from filters
    const getInitialFilterValues = () => {
        const initial: Record<string, any> = {};
        filters.forEach(f => {
            if (f.defaultValue !== undefined && f.defaultValue !== null) {
                initial[f.id] = f.defaultValue;
            }
        });
        return initial;
    };

    const [filterValues, setFilterValues] = useState<Record<string, any>>(getInitialFilterValues);
    const [activeGroup, setActiveGroup] = useState<string | null>(initialGroupBy);
    const [hasInitialized, setHasInitialized] = useState(false);

    // Trigger onFilterChange on mount with initial values
    useEffect(() => {
        if (!hasInitialized && Object.keys(getInitialFilterValues()).length > 0) {
            onFilterChange?.(getInitialFilterValues());
            setHasInitialized(true);
        }
    }, [hasInitialized, onFilterChange]);

    const menuRef = useRef<HTMLDivElement>(null);
    const favNameInputRef = useRef<HTMLInputElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSearchChange = (val: string) => {
        setSearchValue(val);
        // If typing, maybe close menu? AdminDashboard logic closes on type.
        if (val.length > 0) setShowMenu(false);
        onSearch?.(val);
    };

    const handleFilterToggle = (id: string, val: any) => {
        const newValues = { ...filterValues };

        // If value is null/false/empty, remove it (toggle off)
        // For boolean toggles: if exists -> remove, if not -> add.
        // But for select/text, we set the value.
        // Let's implement smart toggle logic:

        const filterDef = filters.find(f => f.id === id);
        if (!filterDef) return;

        if (filterDef.type === 'boolean') {
            // Toggle logic for boolean
            if (newValues[id]) {
                delete newValues[id];
            } else {
                newValues[id] = true;
            }
        } else if (filterDef.type === 'multiselect') {
            // Multiselect toggle logic - toggle value in array
            const currentArr: string[] = Array.isArray(newValues[id]) ? newValues[id] : [];
            const valueIndex = currentArr.indexOf(val);
            if (valueIndex > -1) {
                // Remove value from array
                currentArr.splice(valueIndex, 1);
                if (currentArr.length === 0) {
                    delete newValues[id];
                } else {
                    newValues[id] = [...currentArr];
                }
            } else {
                // Add value to array
                newValues[id] = [...currentArr, val];
            }
        } else {
            // For Select/Text, just set the value.
            // If value matches existing, maybe toggle off?
            if (newValues[id] === val && val !== undefined) {
                delete newValues[id];
            } else if (val === "" || val === null || val === undefined) {
                delete newValues[id];
            } else {
                newValues[id] = val;
            }
        }

        setFilterValues(newValues);
        onFilterChange?.(newValues);
    };

    // Specific handler for removing a tag
    const removeFilter = (id: string) => {
        const newValues = { ...filterValues };
        delete newValues[id];
        setFilterValues(newValues);
        onFilterChange?.(newValues);
    };

    const handleGroupToggle = (id: string | null) => {
        const newVal = activeGroup === id ? null : id;
        setActiveGroup(newVal);
        onGroupChange?.(newVal);
        setShowMenu(false); // AdminDashboard behavior: close on select
    };

    const handleFavoriteClick = (fav: Favorite) => {
        setSearchValue(fav.searchQuery);
        setFilterValues(fav.filters);
        setActiveGroup(fav.groupBy);

        onSearch?.(fav.searchQuery);
        onFilterChange?.(fav.filters);
        onGroupChange?.(fav.groupBy);
        onFavoriteSelect?.(fav);
        setShowMenu(false);
    };

    // Helper to get label for active filter tag
    const getFilterLabel = (id: string, value: any) => {
        const f = filters.find(filter => filter.id === id);
        if (!f) return id;
        if (f.type === 'boolean') return f.label;
        if (f.type === 'select') {
            const opt = f.options?.find(o => o.value === value);
            return `${f.label}: ${opt?.label || value}`;
        }
        if (f.type === 'multiselect' && Array.isArray(value)) {
            const labels = value.map(v => {
                const opt = f.options?.find(o => o.value === v);
                return opt?.label || v;
            });
            return `${f.label}: ${labels.join(', ')}`;
        }
        return `${f.label}: ${value}`;
    };

    return (
        <div className={`w-full ${className}`} ref={menuRef}>
            <div className="relative">
                {/* Unified Input Container */}
                <div className="flex flex-wrap items-center gap-2 w-full px-3 py-2 border border-border rounded-lg bg-card focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all duration-200 shadow-sm hover:shadow-md">

                    {/* Active Filters Tags */}
                    {Object.entries(filterValues).map(([id, value]) => (
                        <span key={id} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 animate-in fade-in zoom-in duration-200">
                            {getFilterLabel(id, value)}
                            <button
                                onClick={() => removeFilter(id)}
                                className="ms-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 focus:outline-none"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}

                    {/* Search Input */}
                    <div className="flex-1 min-w-[120px] flex items-center">
                        <Search className="h-4 w-4 text-muted-foreground ms-2 rtl:ms-0 rtl:me-2" />
                        <input
                            type="text"
                            value={searchValue}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder={placeholder}
                            className="w-full border-none bg-transparent p-1 text-sm focus:ring-0 text-foreground placeholder-muted-foreground focus:outline-none"
                        />
                    </div>

                    {/* Filter Menu Toggle */}
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className={`p-1 rounded hover:bg-muted transition-colors ${showMenu ? 'bg-muted text-primary' : 'text-muted-foreground'}`}
                    >
                        <ChevronDown className="h-4 w-4" />
                    </button>
                </div>

                {/* Dropdown Menu */}
                {showMenu && (
                    <div className="absolute top-full start-0 end-0 mt-2 p-4 bg-card rounded-lg shadow-xl border border-border z-50 grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-150">

                        {/* Filters Section */}
                        <div className="space-y-4 flex flex-col h-full">
                            <h4 className="flex items-center text-sm font-semibold text-foreground mb-3 shrink-0">
                                <Filter className="h-4 w-4 ms-2 rtl:ms-0 rtl:me-2" />
                                {t("filter")}
                            </h4>
                            <div className="space-y-2 flex-1 min-h-[250px] max-h-[350px] overflow-y-auto pe-2 custom-scrollbar">
                                {filters.map((filter, index) => {
                                    const colorClass = colorVariants[index % colorVariants.length];
                                    return (
                                        <div key={filter.id} className={cn("space-y-1 p-2 rounded-md border", colorClass)}>
                                            {/* Boolean Filter */}
                                            {filter.type === 'boolean' && (
                                                <button
                                                    onClick={() => handleFilterToggle(filter.id, true)}
                                                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm ${filterValues[filter.id]
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'text-foreground hover:bg-muted'
                                                        }`}
                                                >
                                                    <span>{filter.label}</span>
                                                    {filterValues[filter.id] && <Check className="h-4 w-4" />}
                                                </button>
                                            )}

                                            {/* Select Filter - Render options as list items for quick access or use nested visible logic */}
                                            {filter.type === 'select' && (
                                                <div className="ps-2 rtl:pe-2 border-s-2 rtl:border-s-0 rtl:border-e-2 border-border ms-1 rtl:me-1">
                                                    <p className="text-xs font-medium text-muted-foreground mb-1 px-2">{filter.label}</p>
                                                    {filter.options?.map(opt => (
                                                        <button
                                                            key={opt.value}
                                                            onClick={() => handleFilterToggle(filter.id, opt.value)}
                                                            className={`w-full flex items-center justify-between px-2 py-1 rounded text-sm ${filterValues[filter.id] === opt.value
                                                                ? 'bg-primary/10 text-primary'
                                                                : 'text-muted-foreground hover:bg-muted'
                                                                }`}
                                                        >
                                                            <span>{opt.label}</span>
                                                            {filterValues[filter.id] === opt.value && <Check className="h-3 w-3" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Multiselect Filter - Render options as checkboxes */}
                                            {filter.type === 'multiselect' && (
                                                <div className="ps-2 rtl:pe-2 border-s-2 rtl:border-s-0 rtl:border-e-2 border-border ms-1 rtl:me-1">
                                                    <p className="text-xs font-medium text-muted-foreground mb-1 px-2">{filter.label}</p>
                                                    {filter.options?.map(opt => {
                                                        const isSelected = Array.isArray(filterValues[filter.id]) && filterValues[filter.id].includes(opt.value);
                                                        return (
                                                            <button
                                                                key={opt.value}
                                                                onClick={() => handleFilterToggle(filter.id, opt.value)}
                                                                className={`w-full flex items-center justify-between px-2 py-1 rounded text-sm ${isSelected
                                                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                                    }`}
                                                            >
                                                                <span>{opt.label}</span>
                                                                {isSelected && <Check className="h-3 w-3" />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {/* Text Filter - Input field */}
                                            {filter.type === 'text' && (
                                                <div className="px-2">
                                                    <input
                                                        type="text"
                                                        placeholder={filter.label}
                                                        value={filterValues[filter.id] || ''}
                                                        onChange={(e) => handleFilterToggle(filter.id, e.target.value)}
                                                        className="w-full px-2 py-1 text-sm border border-border rounded focus:ring-1 focus:ring-primary bg-muted/50"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right Column: Group By & Favorites */}
                        <div className="space-y-6 flex flex-col h-full">
                            <div className="flex-1 min-h-[250px] max-h-[350px] overflow-y-auto pe-2 custom-scrollbar">
                                {/* Group By Section */}
                                {groupByOptions.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="flex items-center text-sm font-semibold text-foreground mb-3 sticky top-0 bg-card z-10 py-1">
                                            <Layers className="h-4 w-4 ms-2 rtl:ms-0 rtl:me-2" />
                                            {t("groupBy")}
                                        </h4>
                                        <div className="space-y-2">
                                            {groupByOptions.map(group => (
                                                <button
                                                    key={group.id}
                                                    onClick={() => handleGroupToggle(group.id)}
                                                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm ${activeGroup === group.id
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'text-foreground hover:bg-muted'
                                                        }`}
                                                >
                                                    <span>{group.label}</span>
                                                    {activeGroup === group.id && <Check className="h-4 w-4" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Favorites Section */}
                                <div>
                                    <div className="border-t border-border my-4"></div>
                                    <h4 className="flex items-center text-sm font-semibold text-foreground mb-3 sticky top-0 bg-card z-10 py-1">
                                        <Star className="h-4 w-4 ms-2 rtl:ms-0 rtl:me-2 text-yellow-500" />
                                        {t("favorites")}
                                    </h4>
                                    <div className="space-y-2">
                                        {favorites.map(fav => (
                                            <div
                                                key={fav.id}
                                                className="group flex items-center justify-between w-full px-2 py-1.5 rounded text-sm hover:bg-yellow-50 dark:hover:bg-yellow-900/10"
                                            >
                                                <button
                                                    onClick={() => handleFavoriteClick(fav)}
                                                    className="flex-1 flex items-center text-muted-foreground group-hover:text-yellow-700 dark:group-hover:text-yellow-400"
                                                >
                                                    <Star className="h-3 w-3 me-2 text-muted-foreground/50 group-hover:text-yellow-500" />
                                                    <span>{fav.label}</span>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteFavorite?.(fav.id);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-500 transition-all"
                                                    title={t("delete")}
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}

                                        {/* Save Current Search UI */}
                                        <div className="pt-2 mt-2 border-t border-border">
                                            <div className="text-xs text-muted-foreground mb-2 px-1">
                                                {t("saveCurrentSearch")}
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="text"
                                                    value={newFavoriteName}
                                                    onChange={(e) => setNewFavoriteName(e.target.value)}
                                                    placeholder={t("enterName")}
                                                    className="w-full min-w-0 flex-1 px-2 py-1 text-sm border border-border rounded bg-muted focus:outline-none focus:ring-1 focus:ring-primary"
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (newFavoriteName && onSaveFavorite) {
                                                            onSaveFavorite(newFavoriteName, {}, activeGroup, searchValue);
                                                            setNewFavoriteName("");
                                                        }
                                                    }}
                                                    disabled={!newFavoriteName.trim()}
                                                    className="p-1.5 text-primary hover:bg-primary/10 rounded disabled:opacity-50 shrink-0"
                                                    title={t("save")}
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
