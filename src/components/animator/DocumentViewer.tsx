"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  RotateCcw,
  RotateCw,
  FileText,
  Image as ImageIcon,
  File,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DocumentItem {
  name: string;
  url: string | null;
}

interface DocumentViewerProps {
  documents: DocumentItem[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isImage(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url);
}

function isPdf(url: string): boolean {
  return /\.pdf$/i.test(url);
}

function getFileIcon(url: string) {
  if (isImage(url)) return <ImageIcon className="h-6 w-6" />;
  if (isPdf(url)) return <FileText className="h-6 w-6" />;
  return <File className="h-6 w-6" />;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function DocumentViewer({ documents }: DocumentViewerProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);

  const visibleDocs = documents.filter((d) => d.url);

  const handleOpen = useCallback((index: number) => {
    setSelectedIndex(index);
    setRotation(0);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedIndex(null);
    setRotation(0);
  }, []);

  const rotateLeft = useCallback(() => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  }, []);

  const rotateRight = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const selectedDoc =
    selectedIndex !== null ? visibleDocs[selectedIndex] : null;

  if (visibleDocs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed border-border/60 rounded-xl">
        <FileText className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">لا توجد وثائق مرفوعة</p>
      </div>
    );
  }

  return (
    <>
      {/* ─── Document Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {visibleDocs.map((doc, index) => (
          <button
            key={doc.name}
            type="button"
            onClick={() => handleOpen(index)}
            className="group border border-border/60 rounded-xl overflow-hidden text-center transition-all hover:border-primary/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {/* Thumbnail */}
            <div className="relative h-36 bg-muted/40 overflow-hidden">
              {isImage(doc.url!) ? (
                <img
                  src={doc.url!}
                  alt={doc.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                  {getFileIcon(doc.url!)}
                  <span className="text-[10px] uppercase tracking-wider font-medium">
                    {doc.url!.split(".").pop()}
                  </span>
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 text-xs font-medium bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm transition-opacity">
                  اضغط للمشاهدة
                </span>
              </div>
            </div>
            {/* Label */}
            <div className="px-3 py-2.5 border-t border-border/40">
              <p className="text-xs font-medium truncate">{doc.name}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ─── Viewer Modal ───────────────────────────────────────────────── */}
      <Dialog
        open={selectedIndex !== null}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <DialogContent
          className="sm:max-w-3xl lg:max-w-5xl max-h-[90vh] p-0 gap-0 overflow-hidden"
          showCloseButton={false}
        >
          {/* Modal header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/40">
            <DialogTitle className="text-sm font-semibold truncate">
              {selectedDoc?.name}
            </DialogTitle>
            <div className="flex items-center gap-1.5">
              {/* Rotation controls — only for images */}
              {selectedDoc && isImage(selectedDoc.url!) && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={rotateLeft}
                    title="دوران لليسار"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground min-w-[3ch] text-center tabular-nums">
                    {rotation}°
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={rotateRight}
                    title="دوران لليمين"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-5 bg-border/60 mx-1" />
                </>
              )}
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleClose}
                title="إغلاق"
              >
                <span className="text-lg leading-none">&times;</span>
              </Button>
            </div>
          </div>

          {/* Content area */}
          <div className="relative flex items-center justify-center bg-muted/20 overflow-auto min-h-[300px] max-h-[calc(90vh-60px)]">
            {selectedDoc && isImage(selectedDoc.url!) ? (
              <img
                src={selectedDoc.url!}
                alt={selectedDoc.name}
                className="max-w-full max-h-[calc(90vh-80px)] object-contain transition-transform duration-200 ease-out"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
            ) : selectedDoc && isPdf(selectedDoc.url!) ? (
              <iframe
                src={selectedDoc.url!}
                title={selectedDoc.name}
                className="w-full h-[calc(90vh-80px)] border-0"
              />
            ) : selectedDoc ? (
              <div className="flex flex-col items-center gap-4 p-8 text-muted-foreground">
                <FileText className="h-16 w-16 opacity-30" />
                <p className="text-sm">لا يمكن عرض هذا الملف في المتصفح</p>
                <a
                  href={selectedDoc.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  تحميل الملف
                </a>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
