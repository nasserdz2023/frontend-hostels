"use client";

import { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import { type Area, type Point } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ZoomIn, RotateCw, Loader2 } from "lucide-react";
import getCroppedImg from "@/lib/utils/canvasUtils";

interface ImageCropperProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    imageSrc: string;
    onCropComplete: (croppedImage: Blob) => Promise<void>;
    aspect?: number;
}

export function ImageCropper({
    open,
    onOpenChange,
    imageSrc,
    onCropComplete,
    aspect = 4 / 3, // Default banner aspect ratio
}: ImageCropperProps) {
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [loading, setLoading] = useState(false);
    const [currentAspect, setCurrentAspect] = useState<number | undefined>(aspect);
    const [naturalAspect, setNaturalAspect] = useState<number>(1);

    useEffect(() => {
        setCurrentAspect(aspect);
    }, [aspect]);

    const onCropChange = (crop: Point) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom: number) => {
        setZoom(zoom);
    };

    const onRotationChange = (rotation: number) => {
        setRotation(rotation);
    };

    const onCropCompleteHandler = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const onMediaLoaded = (mediaSize: { width: number; height: number; naturalWidth: number; naturalHeight: number }) => {
        const natAspect = mediaSize.naturalWidth / mediaSize.naturalHeight;
        setNaturalAspect(natAspect);
    };

    const handleSave = async () => {
        if (!croppedAreaPixels) return;
        setLoading(true);
        try {
            const croppedImage = await getCroppedImg(
                imageSrc,
                croppedAreaPixels,
                rotation
            );
            if (croppedImage) {
                await onCropComplete(croppedImage);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>تعديل الصورة</DialogTitle>
                </DialogHeader>

                <div className="relative flex-1 bg-black w-full overflow-hidden">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={currentAspect}
                        onCropChange={onCropChange}
                        onCropComplete={onCropCompleteHandler}
                        onZoomChange={onZoomChange}
                        onRotationChange={onRotationChange}
                        onMediaLoaded={onMediaLoaded}
                        objectFit="contain" // Fit image within container to start
                    />
                </div>

                <div className="p-6 space-y-6 bg-background border-t">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 min-w-24">
                                <ZoomIn className="w-4 h-4 text-muted-foreground" />
                                <Label>التقريب</Label>
                            </div>
                            <Slider
                                value={[zoom]}
                                min={1}
                                max={3}
                                step={0.1}
                                onValueChange={(vals) => setZoom(vals[0])}
                                className="flex-1"
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 min-w-24">
                                <RotateCw className="w-4 h-4 text-muted-foreground" />
                                <Label>الدوران</Label>
                            </div>
                            <Slider
                                value={[rotation]}
                                min={0}
                                max={360}
                                step={1}
                                onValueChange={(vals) => setRotation(vals[0])}
                                className="flex-1"
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 min-w-24 text-muted-foreground">
                                <Label>أبعاد القص</Label>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={currentAspect === aspect ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                        setCurrentAspect(aspect);
                                        setZoom(1);
                                        setCrop({ x: 0, y: 0 });
                                    }}
                                >
                                    {aspect === 1 ? "مربع (1:1)" : `افتراضي (${aspect ? aspect.toFixed(1) : ''})`}
                                </Button>
                                <Button
                                    type="button"
                                    variant={currentAspect === naturalAspect ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                        setCurrentAspect(naturalAspect);
                                        setZoom(1);
                                        setCrop({ x: 0, y: 0 });
                                    }}
                                >
                                    كامل الصورة (الأصلي)
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            إلغاء
                        </Button>
                        <Button onClick={handleSave} disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                            قص وحفظ
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
