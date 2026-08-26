"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Expand, Video, Folder, ExternalLink, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { activitiesApi } from "@/lib/api/activities";
import { PhotoSelector } from "@/components/photos/PhotoSelector";
import { AlbumSelector } from "@/components/photos/AlbumSelector";
import { ImmichAsset, photosApi, ImmichAlbum } from "@/lib/api/photos";

interface ActivityGalleryProps {
    activityId: string;
}

interface AlbumContent {
    id: string; // The link ID (backend)
    immich_album_id: string;
    created_at: string;
    name?: string;
    assets: ImmichAsset[];
}

export function ActivityGallery({ activityId }: ActivityGalleryProps) {
    const [photos, setPhotos] = useState<any[]>([]);
    const [albums, setAlbums] = useState<any[]>([]); // Raw links from backend
    const [albumContents, setAlbumContents] = useState<AlbumContent[]>([]); // Detailed content with assets
    const [loading, setLoading] = useState(true);

    // Selectors state
    const [photoSelectorOpen, setPhotoSelectorOpen] = useState(false);
    const [albumSelectorOpen, setAlbumSelectorOpen] = useState(false);
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        loadContent();
    }, [activityId]);

    const loadContent = async () => {
        setLoading(true);
        try {
            // 1. Fetch linked items from backend
            const [photosData, linkedAlbums] = await Promise.all([
                activitiesApi.getPhotos(activityId),
                activitiesApi.getAlbums(activityId)
            ]);
            setPhotos(photosData);
            setAlbums(linkedAlbums);

            // 2. If there are linked albums, fetch their details and assets from Immich
            if (linkedAlbums.length > 0) {
                // Fetch all albums to match names
                const allImmichAlbums = await photosApi.getAlbums();

                const contents = await Promise.all(linkedAlbums.map(async (link: any) => {
                    const immichAlbum = allImmichAlbums.find(a => a.id === link.immich_album_id);
                    let assets: ImmichAsset[] = [];
                    try {
                        assets = await photosApi.getAlbumAssets(link.immich_album_id);
                    } catch (e) {
                        console.error(`Failed to load assets for album ${link.immich_album_id}`, e);
                    }

                    return {
                        id: link.id,
                        immich_album_id: link.immich_album_id,
                        created_at: link.created_at,
                        name: immichAlbum?.albumName || "ألبوم غير معروف",
                        assets: assets
                    };
                }));
                setAlbumContents(contents);
            } else {
                setAlbumContents([]);
            }

        } catch (error) {
            console.error("Failed to load gallery content:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPhotos = async (assetIds: string[]) => {
        setAdding(true);
        let added = 0;
        let failed = 0;

        try {
            for (const assetId of assetIds) {
                try {
                    await activitiesApi.addPhoto(activityId, assetId);
                    added++;
                } catch (e: any) {
                    if (e?.response?.data?.status !== 'exists') {
                        failed++;
                    }
                }
            }

            if (added > 0) {
                toast.success(`تم إضافة ${added} صور`);
                // Only reload photos
                const data = await activitiesApi.getPhotos(activityId);
                setPhotos(data);
            }
        } catch (error) {
            toast.error("حدث خطأ أثناء إضافة الصور");
        } finally {
            setAdding(false);
        }
    };

    const handleAddAlbums = async (albumIds: string[]) => {
        setAdding(true);
        let added = 0;

        try {
            for (const albumId of albumIds) {
                try {
                    await activitiesApi.addAlbum(activityId, albumId);
                    added++;
                } catch (e: any) {
                    // Ignore dupes
                }
            }

            if (added > 0) {
                toast.success(`تم ربط ${added} ألبومات`);
                loadContent(); // Reload everything to fetch new album assets
            }
        } catch (error) {
            toast.error("حدث خطأ أثناء ربط الألبومات");
        } finally {
            setAdding(false);
        }
    };

    const handleRemovePhoto = async (assetId: string) => {
        if (!confirm("هل أنت متأكد من حذف هذه الصورة من المعرض؟")) return;
        try {
            await activitiesApi.removePhoto(activityId, assetId);
            toast.success("تم حذف الصورة");
            setPhotos(prev => prev.filter(p => p.immich_asset_id !== assetId));
        } catch (error) {
            toast.error("فشل حذف الصورة");
        }
    };

    const handleRemoveAlbum = async (immichAlbumId: string) => {
        if (!confirm("هل أنت متأكد من إلغاء ربط هذا الألبوم؟")) return;
        try {
            await activitiesApi.removeAlbum(activityId, immichAlbumId);
            toast.success("تم إلغاء ربط الألبوم");
            setAlbums(prev => prev.filter(a => a.immich_album_id !== immichAlbumId));
            setAlbumContents(prev => prev.filter(a => a.immich_album_id !== immichAlbumId));
        } catch (error) {
            toast.error("فشل إلغاء ربط الألبوم");
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* 1. Linked Albums Management (Condensed) */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                        <CardTitle className="text-lg">إدارة الألبومات</CardTitle>
                        <CardDescription>الألبومات المرتبطة بهذا النشاط</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setAlbumSelectorOpen(true)} disabled={adding}>
                        <Folder className="w-4 h-4 me-2" />
                        ربط ألبوم جديد
                    </Button>
                </CardHeader>
                <CardContent>
                    {albums.length === 0 ? (
                        <p className="text-sm text-gray-500">لا توجد ألبومات مرتبطة</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {albumContents.map((album) => (
                                <div key={album.id} className="flex items-center gap-2 bg-gray-50 border rounded px-3 py-2 text-sm">
                                    <Folder className="w-4 h-4 text-blue-500" />
                                    <span className="font-medium">{album.name}</span>
                                    <span className="text-gray-400 text-xs">({album.assets.length} صورة)</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-red-500 hover:bg-red-50 -me-1"
                                        onClick={() => handleRemoveAlbum(album.immich_album_id)}
                                        title="إلغاء الربط"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                                        <a href={`/photos/albums/${album.immich_album_id}`} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 2. Photos from Albums Display */}
            {albumContents.map(album => (
                <Card key={album.id} className="overflow-hidden">
                    <CardHeader className="bg-gray-50/50 border-b pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100/50 rounded-lg">
                                <Folder className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <CardTitle className="text-base">{album.name}</CardTitle>
                                <CardDescription>صور من الألبوم المرتبط ({album.assets.length})</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {album.assets.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                الألبوم فارغ
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {album.assets.map((asset) => (
                                    <div key={asset.id} className="group relative aspect-square rounded-md overflow-hidden bg-gray-100 border">
                                        <img
                                            src={`/api/v1/photos/assets/${asset.id}/thumbnail`}
                                            alt="Album Photo"
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            loading="lazy"
                                        />

                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}


            {/* 3. Individual Photos Section */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <ImageIcon className="w-5 h-5" />
                            صور فردية
                        </CardTitle>
                        <CardDescription>صور مختارة يدوياً للنشاط</CardDescription>
                    </div>
                    <Button onClick={() => setPhotoSelectorOpen(true)} disabled={adding}>
                        <Plus className="w-4 h-4 me-2" />
                        إضافة صور
                    </Button>
                </CardHeader>
                <CardContent>
                    {photos.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                            <p>لا توجد صور فردية</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {photos.map((photo) => (
                                <div key={photo.id} className="group relative aspect-square rounded-md overflow-hidden bg-gray-100 border">
                                    <img
                                        src={`/api/v1/photos/assets/${photo.immich_asset_id}/thumbnail`}
                                        alt="Activity Photo"
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        loading="lazy"
                                    />

                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handleRemovePhoto(photo.immich_asset_id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <PhotoSelector
                open={photoSelectorOpen}
                onOpenChange={setPhotoSelectorOpen}
                onSelect={handleAddPhotos}
                title="اختر صور لإضافتها للنشاط"
            />

            <AlbumSelector
                open={albumSelectorOpen}
                onOpenChange={setAlbumSelectorOpen}
                onSelect={handleAddAlbums}
            />
        </div>
    );
}
