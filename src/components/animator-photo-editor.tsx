"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RotateCcw, RotateCw, Check, X, Loader2 } from "lucide-react";
import { getCroppedImg } from "@/lib/crop-image";

interface AnimatorPhotoEditorProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  onConfirm: (blob: Blob) => void;
}

export default function AnimatorPhotoEditor({
  open,
  onClose,
  imageSrc,
  onConfirm,
}: AnimatorPhotoEditorProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback(
    (_: unknown, croppedAreaPixels: { x: number; y: number; width: number; height: number }) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      onConfirm(blob);
      onClose();
    } catch (e) {
      console.error("Crop failed:", e);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>تعديل الصورة الشخصية</DialogTitle>
        </DialogHeader>

        {/* Cropper area */}
        <div className="relative h-[350px] w-full rounded-lg overflow-hidden bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Controls */}
        <div className="space-y-4 pt-2">
          {/* Zoom slider */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-8">زوم</span>
            <Slider
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
              min={1}
              max={3}
              step={0.1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-10 text-left">
              {zoom.toFixed(1)}x
            </span>
          </div>

          {/* Rotate buttons */}
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRotation((r) => r - 90)}
            >
              <RotateCcw className="h-4 w-4 ml-1" />
              تدوير يسار
            </Button>
            <span className="text-xs text-muted-foreground">{rotation}°</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRotation((r) => r + 90)}
            >
              تدوير يمين
              <RotateCw className="h-4 w-4 mr-1" />
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={processing}>
            <X className="h-4 w-4 ml-1" />
            إلغاء
          </Button>
          <Button onClick={handleConfirm} disabled={processing}>
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin ml-1" />
            ) : (
              <Check className="h-4 w-4 ml-1" />
            )}
            تأكيد القص
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
