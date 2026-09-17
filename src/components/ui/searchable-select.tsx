"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface SearchableSelectProps {
    options?: { value: string; label: string }[];
    value?: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    className?: string;
    onOpen?: () => void;
    // New async search props
    onSearch?: (query: string) => Promise<{ value: string; label: string }[]>;
    // New infinite scroll props
    fetchOptions?: (params: { search?: string; page: number; size: number }) => Promise<{
        items: { value: string; label: string }[];
        total: number;
        hasMore: boolean;
    }>;
    pageSize?: number;
    minSearchLength?: number;
    debounceMs?: number;
    isLoading?: boolean;
}

export function SearchableSelect({
    options = [],
    value,
    onValueChange,
    placeholder = "Select...",
    searchPlaceholder = "Search...",
    emptyMessage = "No results found.",
    disabled = false,
    className,
    onOpen,
    onSearch,
    fetchOptions,
    pageSize = 100,
    minSearchLength = 2,
    debounceMs = 300,
    isLoading: externalLoading,
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");

    // Async/Infinite scroll state
    const [asyncOptions, setAsyncOptions] = React.useState<{ value: string; label: string }[]>([]);
    const [isSearching, setIsSearching] = React.useState(false);
    const [isLoadingMore, setIsLoadingMore] = React.useState(false);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [hasMore, setHasMore] = React.useState(true);
    const [initialLoaded, setInitialLoaded] = React.useState(false);

    const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const isAsyncMode = !!fetchOptions;

    const handleOpenChange = async (newOpen: boolean) => {
        setOpen(newOpen);
        if (newOpen) {
            onOpen?.();
            // Load initial data when opening in async mode
            if (isAsyncMode && !initialLoaded) {
                await loadInitialData();
            }
        } else {
            // Reset search on close
            setSearchQuery("");
            if (isAsyncMode) {
                // Reset to initial state
                setAsyncOptions([]);
                setCurrentPage(1);
                setHasMore(true);
                setInitialLoaded(false);
            }
        }
    };

    // Load initial data (first page)
    const loadInitialData = async () => {
        if (!fetchOptions) return;

        setIsSearching(true);
        try {
            const result = await fetchOptions({ page: 1, size: pageSize });
            setAsyncOptions(result.items);
            setHasMore(result.hasMore);
            setCurrentPage(1);
            setInitialLoaded(true);
        } catch (error) {
            console.error("Failed to load initial data:", error);
            setAsyncOptions([]);
        } finally {
            setIsSearching(false);
        }
    };

    // Load more data (next page)
    const loadMoreData = async () => {
        if (!fetchOptions || !hasMore || isLoadingMore || isSearching) return;

        setIsLoadingMore(true);
        try {
            const nextPage = currentPage + 1;
            const result = await fetchOptions({
                search: searchQuery || undefined,
                page: nextPage,
                size: pageSize
            });
            setAsyncOptions(prev => [...prev, ...result.items]);
            setHasMore(result.hasMore);
            setCurrentPage(nextPage);
        } catch (error) {
            console.error("Failed to load more data:", error);
        } finally {
            setIsLoadingMore(false);
        }
    };

    // Handle scroll for infinite loading
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (!isAsyncMode) return;

        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        // Load more when scrolled to bottom (with 50px threshold)
        if (scrollHeight - scrollTop - clientHeight < 50 && hasMore && !isLoadingMore && !isSearching) {
            loadMoreData();
        }
    };

    // Handle search with debouncing
    React.useEffect(() => {
        if (!isAsyncMode || !fetchOptions) return;

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // If search query is cleared, reload initial data
        if (searchQuery === "" && initialLoaded) {
            loadInitialData();
            return;
        }

        // If search query is too short, don't search
        if (searchQuery.length > 0 && searchQuery.length < minSearchLength) {
            return;
        }

        if (searchQuery.length >= minSearchLength) {
            setIsSearching(true);

            debounceRef.current = setTimeout(async () => {
                try {
                    const result = await fetchOptions({
                        search: searchQuery,
                        page: 1,
                        size: pageSize
                    });
                    setAsyncOptions(result.items);
                    setHasMore(result.hasMore);
                    setCurrentPage(1);
                } catch (error) {
                    console.error("Search error:", error);
                    setAsyncOptions([]);
                } finally {
                    setIsSearching(false);
                }
            }, debounceMs);
        }

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [searchQuery, fetchOptions, minSearchLength, debounceMs, pageSize, initialLoaded]);

    // Backward compatible: Handle simple async search (non-paginated)
    React.useEffect(() => {
        if (!onSearch || isAsyncMode) return;

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (searchQuery.length < minSearchLength) {
            setAsyncOptions([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);

        debounceRef.current = setTimeout(async () => {
            try {
                const results = await onSearch(searchQuery);
                setAsyncOptions(results);
            } catch (error) {
                console.error("Search error:", error);
                setAsyncOptions([]);
            } finally {
                setIsSearching(false);
            }
        }, debounceMs);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [searchQuery, onSearch, minSearchLength, debounceMs, isAsyncMode]);

    // Determine which options to display
    const displayOptions = React.useMemo(() => {
        if (isAsyncMode || onSearch) {
            // If we have a query, use the async options. Otherwise, fallback to static options if provided.
            if (searchQuery.length > 0) {
                return asyncOptions;
            }
            return options;
        }
        // Static options with client-side filtering
        return options.filter((option) => {
            const label = option.label || "";
            return label.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [isAsyncMode, onSearch, asyncOptions, options, searchQuery]);

    const selectedOption = [...options, ...asyncOptions].find((option) => option.value === value);
    const showLoading = externalLoading || isSearching;

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between h-10", className)}
                    disabled={disabled}
                >
                    <span className="truncate">
                        {selectedOption ? String(selectedOption.label) : value ? String(value) : placeholder}
                    </span>
                    <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 max-w-[95vw]" align="start">
                <div className="p-2 border-b">
                    <div className="flex items-center gap-2">
                        {showLoading ? (
                            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                        ) : (
                            <Search className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Input
                            placeholder={searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (displayOptions.length > 0) {
                                        onValueChange(displayOptions[0].value);
                                        setOpen(false);
                                        setSearchQuery("");
                                    }
                                }
                            }}
                            className="h-8 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-end"
                        />
                    </div>
                </div>
                <div
                    ref={scrollContainerRef}
                    className="max-h-60 overflow-auto p-1"
                    onScroll={handleScroll}
                >
                    {showLoading && displayOptions.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            <Loader2 className="h-5 w-5 mx-auto animate-spin mb-2" />
                            جاري التحميل...
                        </div>
                    ) : displayOptions.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            {emptyMessage}
                        </div>
                    ) : (
                        <>
                            {displayOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        onValueChange(option.value);
                                        setOpen(false);
                                        setSearchQuery("");
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all duration-200 text-end mb-1",
                                        value === option.value ? "bg-primary/10 text-primary font-semibold" : "text-popover-foreground"
                                    )}
                                >
                                    <span className="flex-1 whitespace-normal break-words leading-snug">{String(option.label)}</span>
                                    {value === option.value && (
                                        <Check className="h-4 w-4 shrink-0 me-2 text-primary" />
                                    )}
                                </button>
                            ))}
                            {/* Load more indicator */}
                            {isLoadingMore && (
                                <div className="py-3 text-center text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 mx-auto animate-spin" />
                                </div>
                            )}
                            {isAsyncMode && hasMore && !isLoadingMore && !isSearching && (
                                <div className="py-2 text-center text-xs text-muted-foreground">
                                    ↓ مرر للأسفل لتحميل المزيد
                                </div>
                            )}
                        </>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
