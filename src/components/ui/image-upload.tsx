"use client";

import * as React from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
    value?: string | File | null;
    onChange: (file: File | null) => void;
    onRemove?: () => void;
    className?: string;
    previewUrl?: string; // Optional external preview URL (e.g. from backend)
    labels?: {
        upload?: string;
        select?: string;
        change?: string;
    }
}

export function ImageUpload({
    value,
    onChange,
    onRemove,
    className,
    previewUrl,
    labels
}: ImageUploadProps) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [internalPreview, setInternalPreview] = React.useState<string | null>(null);

    // Generate preview when file changes
    React.useEffect(() => {
        if (value instanceof File) {
            const url = URL.createObjectURL(value);
            setInternalPreview(url);
            return () => URL.revokeObjectURL(url);
        } else if (typeof value === "string") {
            setInternalPreview(value);
        } else {
            setInternalPreview(null);
        }
    }, [value]);

    const displayUrl = internalPreview || previewUrl;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("File too large. Max 5MB.");
                return;
            }
            onChange(file);
        }
    };

    const handleRemove = () => {
        if (inputRef.current) inputRef.current.value = "";
        onChange(null);
        onRemove?.();
    };

    return (
        <div className={cn("flex flex-col items-center gap-4", className)}>
            <div
                className={cn(
                    "relative flex h-40 w-40 flex-col items-center justify-center overflow-hidden rounded-full border-2 border-dashed bg-muted/50 transition-colors hover:bg-muted",
                    displayUrl ? "border-primary" : "border-muted-foreground/25"
                )}
            >
                {displayUrl ? (
                    <>
                        <img
                            src={displayUrl}
                            alt="Logo Preview"
                            className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                            <Button type="button" variant="destructive" size="icon" onClick={handleRemove} className="rounded-full">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground" onClick={() => inputRef.current?.click()}>
                        <ImageIcon className="h-10 w-10" />
                        <span className="text-xs font-medium">{labels?.upload || "Upload Logo"}</span>
                    </div>
                )}
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
            />

            {!displayUrl && (
                <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                    <Upload className="me-2 h-4 w-4" /> {labels?.select || "Select Image"}
                </Button>
            )}
        </div>
    );
}
