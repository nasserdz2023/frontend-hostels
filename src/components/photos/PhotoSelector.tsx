"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Search, Loader2, Image as ImageIcon, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { photosApi, ImmichAsset } from "@/lib/api/photos";
import { cn } from "@/lib/utils";

interface PhotoSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (selectedIds: string[]) => void;
    multiple?: boolean;
    title?: string;
}

export function PhotoSelector({
    open,
    onOpenChange,
    onSelect,
    multiple = true,
    title = "اختر صور"
}: PhotoSelectorProps) {
    const [assets, setAssets] = useState<ImmichAsset[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadAssets = async (pageNum: number = 1, search: string = "") => {
        setLoading(true);
        try {
            // For now, search supports only if photosApi supports it, usually we filter locally or rely on recent
            // photosApi.getAssets returns recent assets
            // photosApi.search(query) returns specific
            let newAssets: ImmichAsset[] = [];

            if (search.trim().length > 2) {
                const res = await photosApi.search(search);
                newAssets = res.assets.items;
                setHasMore(false); // Search usually returns all reasonable matches
            } else {
                newAssets = await photosApi.getAssets(pageNum, 50);
                setHasMore(newAssets.length === 50);
            }

            if (pageNum === 1) {
                setAssets(newAssets);
            } else {
                setAssets(prev => [...prev, ...newAssets]);
            }
        } catch (error) {
            console.error("Failed to load assets", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            setPage(1);
            setAssets([]);
            setSelectedIds(new Set());
            loadAssets(1, "");
        }
    }, [open]);

    // Simple search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (open) loadAssets(1, searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSelect = (id: string) => {
        const newSelected = new Set(multiple ? selectedIds : []);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleConfirm = () => {
        onSelect(Array.from(selectedIds));
        onOpenChange(false);
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        
        setUploading(true);
        try {
            const files = Array.from(e.target.files);
            const newUploadedIds: string[] = [];
            
            for (const file of files) {
                const result = await photosApi.uploadPhoto(file);
                if (result && result.id) {
                    newUploadedIds.push(result.id);
                }
            }
            
            // Add new uploaded ids to selection
            const newSelected = new Set(multiple ? selectedIds : []);
            newUploadedIds.forEach(id => {
                if (multiple || newSelected.size === 0) {
                    newSelected.add(id);
                }
            });
            setSelectedIds(newSelected);
            
            // Reload assets to show the new ones at the top
            loadAssets(1, "");
        } catch (error) {
            console.error("Failed to upload photos:", error);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Reset input
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between">
                    <DialogTitle>{title}</DialogTitle>
                    <div>
                        <input 
                            type="file" 
                            multiple={multiple} 
                            accept="image/*" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handleUpload} 
                        />
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2" 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            <span>رفع من الجهاز</span>
                        </Button>
                    </div>
                </DialogHeader>

                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="بحث عن صور..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pe-9"
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                    {loading && page === 1 ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                            {assets.map((asset) => (
                                <div
                                    key={asset.id}
                                    className={cn(
                                        "relative aspect-square cursor-pointer rounded-md overflow-hidden border-2 transition-all",
                                        selectedIds.has(asset.id)
                                            ? "border-primary ring-2 ring-primary ring-offset-1"
                                            : "border-transparent hover:border-muted-foreground/50"
                                    )}
                                    onClick={() => handleSelect(asset.id)}
                                >
                                    <img
                                        src={`/api/v1/photos/assets/${asset.id}/thumbnail`}
                                        alt={asset.originalFileName}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    {selectedIds.has(asset.id) && (
                                        <div className="absolute top-2 end-2 bg-primary text-primary-foreground rounded-full p-0.5">
                                            <Check className="h-3 w-3" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && assets.length === 0 && (
                        <div className="text-center p-8 text-muted-foreground">
                            لا توجد صور
                        </div>
                    )}

                    {hasMore && !loading && (
                        <div className="p-4 text-center">
                            <Button variant="ghost" onClick={() => {
                                const nextPage = page + 1;
                                setPage(nextPage);
                                loadAssets(nextPage, searchQuery);
                            }}>
                                تحميل المزيد
                            </Button>
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter className="px-6 py-4 border-t">
                    <div className="flex w-full items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                            تم تحديد {selectedIds.size} صورة
                        </span>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                إلغاء
                            </Button>
                            <Button onClick={handleConfirm} disabled={selectedIds.size === 0}>
                                إضافة ({selectedIds.size})
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
