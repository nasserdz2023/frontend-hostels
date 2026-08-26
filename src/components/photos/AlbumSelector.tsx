"use client";

import { useState, useEffect } from "react";
import { Check, Search, Loader2, Folder, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { photosApi, ImmichAlbum } from "@/lib/api/photos";
import { cn } from "@/lib/utils";

interface AlbumSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (selectedIds: string[]) => void;
    multiple?: boolean;
    title?: string;
}

export function AlbumSelector({
    open,
    onOpenChange,
    onSelect,
    multiple = true,
    title = "اختر ألبومات"
}: AlbumSelectorProps) {
    const [albums, setAlbums] = useState<ImmichAlbum[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");

    const loadAlbums = async () => {
        setLoading(true);
        try {
            const data = await photosApi.getAlbums();
            setAlbums(data);
        } catch (error) {
            console.error("Failed to load albums", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            setAlbums([]);
            setSelectedIds(new Set());
            loadAlbums();
        }
    }, [open]);

    const filteredAlbums = albums.filter(album =>
        album.albumName.toLowerCase().includes(searchQuery.toLowerCase())
    );

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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="بحث عن ألبومات..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pe-9"
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {filteredAlbums.map((album) => (
                                <div
                                    key={album.id}
                                    className={cn(
                                        "relative cursor-pointer rounded-md overflow-hidden border-2 transition-all hover:bg-muted/50",
                                        selectedIds.has(album.id)
                                            ? "border-primary ring-2 ring-primary ring-offset-1 bg-muted"
                                            : "border-transparent border-gray-100"
                                    )}
                                    onClick={() => handleSelect(album.id)}
                                >
                                    <div className="aspect-video bg-gray-100 relative">
                                        {album.albumThumbnailAssetId ? (
                                            <img
                                                src={`/api/v1/photos/assets/${album.albumThumbnailAssetId}/thumbnail`}
                                                alt={album.albumName}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                <ImageIcon className="h-10 w-10 opacity-20" />
                                            </div>
                                        )}
                                        {selectedIds.has(album.id) && (
                                            <div className="absolute top-2 end-2 bg-primary text-primary-foreground rounded-full p-0.5">
                                                <Check className="h-3 w-3" />
                                            </div>
                                        )}

                                        <div className="absolute bottom-2 start-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                            <ImageIcon className="h-3 w-3" />
                                            {album.assetCount}
                                        </div>
                                    </div>

                                    <div className="p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Folder className="h-4 w-4 text-blue-500 fill-blue-100" />
                                            <h3 className="font-medium truncate text-sm" title={album.albumName}>{album.albumName}</h3>
                                        </div>
                                        {album.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-1">{album.description}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && filteredAlbums.length === 0 && (
                        <div className="text-center p-8 text-muted-foreground">
                            لا توجد ألبومات
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter className="px-6 py-4 border-t">
                    <div className="flex w-full items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                            تم تحديد {selectedIds.size} ألبوم
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
