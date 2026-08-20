"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Crop, Save, Loader2, Plus, Minus, Upload, FileImage, X, Scissors, Download, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  getCropSettings,
  updateCropSettings,
  type CropSetting,
} from "@/lib/api/camp-trips";
import { getErrorMessage } from "@/lib/api/client";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { PermissionGuard } from "@/hooks/useRequirePermission";

// ── Default values (left column 50% / 3 equal thirds) ──
const DEFAULT_PARENTAL_CONSENT = {
  x_offset_pct: 0,
  y_offset_pct: 0,
  width_pct: 50,
  height_pct: 33.33,
};

const DEFAULT_MEDICAL_CERTIFICATE = {
  x_offset_pct: 0,
  y_offset_pct: 33.33,
  width_pct: 50,
  height_pct: 33.33,
};

// ── Helpers ──

function findSetting(
  settings: CropSetting[] | undefined,
  docType: string,
): CropSetting | undefined {
  return settings?.find((s) => s.document_type === docType);
}

/** Render a PDF page to a blob URL using an already-loaded PDFDocumentProxy */
async function pdfPageToBlobUrl(
  pdfDoc: PDFDocumentProxy,
  pageNum: number,
  scale = 2,
): Promise<{ url: string; width: number; height: number }> {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvas: canvas,
    canvasContext: canvas.getContext("2d")!,
    viewport,
  }).promise;

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve({
          url: URL.createObjectURL(blob),
          width: canvas.width,
          height: canvas.height,
        });
      }
    }, "image/png");
  });
}

// ── Reusable number input with +/- precision buttons ──

function NumberInput({
  value,
  onChange,
  label,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  step?: number;
}) {
  const clamp = (v: number) => Math.min(100, Math.max(0, Number(v.toFixed(2))));


  return (


        <div className="space-y-1">
      <Label className="text-xs font-medium text-slate-500">{label} (%)</Label>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onChange(clamp(value - step))}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Input
          type="number"
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) {
              onChange(clamp(v));
            }
          }}
          className="h-8 text-center text-sm font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          step={step}
          min={0}
          max={100}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onChange(clamp(value + step))}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ── SVG Preview ──

function CropPreview({
  parentalConsent,
  medicalCert,
  parentalLabel,
  medicalLabel,
  imageUrl,
}: {
  parentalConsent: { x_offset_pct: number; y_offset_pct: number; width_pct: number; height_pct: number };
  medicalCert: { x_offset_pct: number; y_offset_pct: number; width_pct: number; height_pct: number };
  parentalLabel: string;
  medicalLabel: string;
  imageUrl?: string | null;
}) {
  // Landscape A4: 141.4 × 100 (ratio 1.414:1)
  const PW = 141.4;
  const PH = 100;

  // Convert percentage to viewBox coordinates
  const pctToX = (pct: number) => (pct / 100) * PW;
  const pctToY = (pct: number) => (pct / 100) * PH;

  const pc = {
    x: pctToX(parentalConsent.x_offset_pct),
    y: pctToY(parentalConsent.y_offset_pct),
    w: pctToX(parentalConsent.width_pct),
    h: pctToY(parentalConsent.height_pct),
  };
  const mc = {
    x: pctToX(medicalCert.x_offset_pct),
    y: pctToY(medicalCert.y_offset_pct),
    w: pctToX(medicalCert.width_pct),
    h: pctToY(medicalCert.height_pct),
  };

  return (
    <div className="relative w-full max-w-[320px] mx-auto overflow-hidden rounded-lg border border-slate-200" style={{ aspectRatio: "141.4 / 100" }}>
      {/* Rendered document (image or PDF page converted to image) */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Document preview"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ zIndex: 0 }}
        />
      )}
      {/* Empty state when no image */}
      {!imageUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50" style={{ zIndex: 0 }}>
          <span className="text-slate-300 text-sm">A4 أفقي</span>
        </div>
      )}
      {/* SVG overlay for dividers + crop rectangles */}
      <svg
        viewBox={`0 0 ${PW} ${PH}`}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 1 }}
      >
        {/* Page border */}
        <rect x="0" y="0" width={PW} height={PH} fill="none" stroke="#94a3b8" strokeWidth="0.4" rx="2" />

        {/* Vertical column separator at 50% */}
        <line x1={PW / 2} y1="0" x2={PW / 2} y2={PH} stroke="#cbd5e1" strokeWidth="0.4" strokeDasharray="2,2" />

        {/* Horizontal dividers (left column: 3 equal thirds) */}
        <line x1="0" y1={PH / 3} x2={PW / 2} y2={PH / 3} stroke="#cbd5e1" strokeWidth="0.4" strokeDasharray="2,2" />
        <line x1="0" y1={(PH / 3) * 2} x2={PW / 2} y2={(PH / 3) * 2} stroke="#cbd5e1" strokeWidth="0.4" strokeDasharray="2,2" />

        {/* Right column label */}
        <text x={PW * 0.75} y={PH / 2} textAnchor="middle" dominantBaseline="middle" fill="#94a3b8" fontSize="3.5" fontWeight="500">
          العمود الأيمن
        </text>

        {/* Parental consent crop area */}
        <rect x={pc.x} y={pc.y} width={pc.w} height={pc.h} fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" strokeWidth="1.2" rx="1.5" />
        <text x={pc.x + pc.w / 2} y={pc.y + pc.h / 2} textAnchor="middle" dominantBaseline="middle" fill="#047857" fontSize="3.5" fontWeight="700">
          {parentalLabel}
        </text>

        {/* Medical certificate crop area */}
        <rect x={mc.x} y={mc.y} width={mc.w} height={mc.h} fill="rgba(244, 114, 182, 0.2)" stroke="#f472b6" strokeWidth="1.2" rx="1.5" />
        <text x={mc.x + mc.w / 2} y={mc.y + mc.h / 2} textAnchor="middle" dominantBaseline="middle" fill="#be185d" fontSize="3.5" fontWeight="700">
          {medicalLabel}
        </text>
      </svg>
    </div>
  );
}

// ── Crop Tester (test crop & download) ──

function CropTester({
  imageUrl,
  parentalConsent,
  medicalCert,
  parentalLabel,
  medicalLabel,
  open,
  onClose,
  fileType,
  pdfDoc,
  pdfPageNum,
}: {
  imageUrl: string;
  parentalConsent: { x_offset_pct: number; y_offset_pct: number; width_pct: number; height_pct: number };
  medicalCert: { x_offset_pct: number; y_offset_pct: number; width_pct: number; height_pct: number };
  parentalLabel: string;
  medicalLabel: string;
  open: boolean;
  onClose: () => void;
  fileType: "image" | "pdf" | null;
  pdfDoc: PDFDocumentProxy | null;
  pdfPageNum: number;
}) {
  const [pcDataUrl, setPcDataUrl] = useState<string | null>(null);
  const [mcDataUrl, setMcDataUrl] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);
  const [naturalWidth, setNaturalWidth] = useState(0);
  const [naturalHeight, setNaturalHeight] = useState(0);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !imageUrl) return;

    setCropping(true);
    setPcDataUrl(null);
    setMcDataUrl(null);
    setNaturalWidth(0);
    setNaturalHeight(0);

    // ── PDF crop path (uses pre-loaded pdfDoc from parent ref) ──
    if (fileType === "pdf" && pdfDoc) {
      (async () => {
        try {
          const page = await pdfDoc.getPage(pdfPageNum);

          // Render at 2x for quality
          const scale = 2;
          const viewport = page.getViewport({ scale });
          const pdfCanvas = document.createElement("canvas");
          pdfCanvas.width = viewport.width;
          pdfCanvas.height = viewport.height;

          await page.render({
            canvas: pdfCanvas,
            canvasContext: pdfCanvas.getContext("2d")!,
            viewport,
          }).promise;

          const w = pdfCanvas.width;
          const h = pdfCanvas.height;
          setNaturalWidth(w);
          setNaturalHeight(h);

          // Helper: percentage → pixel
          const pctToPx = (pct: number, dim: number) => Math.round((pct / 100) * dim);

          const cropCanvas = document.createElement("canvas");
          const ctx = cropCanvas.getContext("2d")!;

          // ── Crop parental consent ──
          const pcX = pctToPx(parentalConsent.x_offset_pct, w);
          const pcY = pctToPx(parentalConsent.y_offset_pct, h);
          const pcW = pctToPx(parentalConsent.width_pct, w);
          const pcH = pctToPx(parentalConsent.height_pct, h);

          cropCanvas.width = pcW;
          cropCanvas.height = pcH;
          ctx.drawImage(pdfCanvas, pcX, pcY, pcW, pcH, 0, 0, pcW, pcH);
          setPcDataUrl(cropCanvas.toDataURL("image/png"));

          // ── Crop medical certificate ──
          const mcX = pctToPx(medicalCert.x_offset_pct, w);
          const mcY = pctToPx(medicalCert.y_offset_pct, h);
          const mcW = pctToPx(medicalCert.width_pct, w);
          const mcH = pctToPx(medicalCert.height_pct, h);

          cropCanvas.width = mcW;
          cropCanvas.height = mcH;
          ctx.drawImage(pdfCanvas, mcX, mcY, mcW, mcH, 0, 0, mcW, mcH);
          setMcDataUrl(cropCanvas.toDataURL("image/png"));
        } catch (err) {
          console.error("PDF crop failed:", err);
        } finally {
          setCropping(false);
        }
      })();
      return;
    }

    // ── Image crop path (existing) ──
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setNaturalWidth(img.naturalWidth);
      setNaturalHeight(img.naturalHeight);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const w = img.naturalWidth;
      const h = img.naturalHeight;

      // Helper: percentage → pixel
      const pctToPx = (pct: number, dim: number) => Math.round((pct / 100) * dim);

      // --- Crop parental consent ---
      const pcX = pctToPx(parentalConsent.x_offset_pct, w);
      const pcY = pctToPx(parentalConsent.y_offset_pct, h);
      const pcW = pctToPx(parentalConsent.width_pct, w);
      const pcH = pctToPx(parentalConsent.height_pct, h);

      canvas.width = pcW;
      canvas.height = pcH;
      ctx.drawImage(img, pcX, pcY, pcW, pcH, 0, 0, pcW, pcH);
      setPcDataUrl(canvas.toDataURL("image/png"));

      // --- Crop medical certificate ---
      const mcX = pctToPx(medicalCert.x_offset_pct, w);
      const mcY = pctToPx(medicalCert.y_offset_pct, h);
      const mcW = pctToPx(medicalCert.width_pct, w);
      const mcH = pctToPx(medicalCert.height_pct, h);

      canvas.width = mcW;
      canvas.height = mcH;
      ctx.drawImage(img, mcX, mcY, mcW, mcH, 0, 0, mcW, mcH);
      setMcDataUrl(canvas.toDataURL("image/png"));

      setCropping(false);
    };
    img.onerror = () => {
      setCropping(false);
    };
    img.src = imageUrl;
  }, [open, imageUrl, parentalConsent, medicalCert, fileType, pdfDoc, pdfPageNum]);

  const download = (dataUrl: string, filename: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-emerald-600" />
            نتيجة القص
            {naturalWidth > 0 && (
              <span className="text-sm font-normal text-slate-400 mr-2">
                ({naturalWidth}×{naturalHeight}px)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {cropping ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-4">
            {/* Parental consent result */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {parentalLabel}
              </h4>
              {pcDataUrl ? (
                <>
                  <img
                    src={pcDataUrl}
                    alt={parentalLabel}
                    className="w-full border border-emerald-200 rounded-lg shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setZoomedImage(pcDataUrl)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    onClick={() => download(pcDataUrl, "parental_consent.png")}
                  >
                    <Download className="h-4 w-4" />
                    تحميل
                  </Button>
                </>
              ) : (
                <div className="h-40 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 text-sm">فشل القص</div>
              )}
            </div>

            {/* Medical certificate result */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-pink-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-500" />
                {medicalLabel}
              </h4>
              {mcDataUrl ? (
                <>
                  <img
                    src={mcDataUrl}
                    alt={medicalLabel}
                    className="w-full border border-pink-200 rounded-lg shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setZoomedImage(mcDataUrl)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-pink-700 border-pink-200 hover:bg-pink-50"
                    onClick={() => download(mcDataUrl, "medical_certificate.png")}
                  >
                    <Download className="h-4 w-4" />
                    تحميل
                  </Button>
                </>
              ) : (
                <div className="h-40 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 text-sm">فشل القص</div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إغلاق</Button>
        </DialogFooter>

        {/* Zoom modal */}
        <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
          <DialogContent className="max-w-[90vw] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>عرض الصورة</DialogTitle>
            </DialogHeader>
            {zoomedImage && (
              <div className="overflow-auto max-h-[70vh] flex items-center justify-center">
                <img
                  src={zoomedImage}
                  alt="Zoomed"
                  className="max-w-full h-auto object-contain"
                />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setZoomedImage(null)}>إغلاق</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──

export default function CropSettingsPage() {
  const t = useTranslations("camp-trips");
  const queryClient = useQueryClient();

  // Form state
  const [parentalConsent, setParentalConsent] = useState(DEFAULT_PARENTAL_CONSENT);
  const [medicalCert, setMedicalCert] = useState(DEFAULT_MEDICAL_CERTIFICATE);
  const [isInitialized, setIsInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"image" | "pdf" | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // PDF-specific state
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const [pdfPageNum, setPdfPageNum] = useState(2);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);

  /** Render a PDF page to an image and set as preview */
  const renderPdfPage = useCallback(async (pageNum: number) => {
    const pdfDoc = pdfDocRef.current;
    if (!pdfDoc) return;
    setPdfLoading(true);
    try {
      if (previewImage) URL.revokeObjectURL(previewImage);
      const result = await pdfPageToBlobUrl(pdfDoc, pageNum, 1.5);
      setPreviewImage(result.url);
    } catch (err) {
      console.error("PDF render failed:", err);
      toast.error("فشل عرض صفحة PDF");
    } finally {
      setPdfLoading(false);
    }
  }, [previewImage]);

  const handleUploadPreview = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Revoke previous URL
    if (previewImage) URL.revokeObjectURL(previewImage);

    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");

    if (isPdf) {
      try {
        const buffer = await file.arrayBuffer();

        // Get total pages
        const pdfjsLib = await import("@/lib/pdfjs");
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            "/pdf.worker.min.mjs";
        }
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const totalPages = pdf.numPages;
        setPdfTotalPages(totalPages);

        // Store the pdfDoc in a ref for reuse (avoids re-calling getDocument which detaches the buffer)
        pdfDocRef.current = pdf;

        // Default to page 2 if available, otherwise page 1
        const targetPage = totalPages >= 2 ? 2 : 1;
        setPdfPageNum(targetPage);

        setFileType("pdf");

        // Render the page to an image
        if (previewImage) URL.revokeObjectURL(previewImage);
        setPdfLoading(true);
        const result = await pdfPageToBlobUrl(pdf, targetPage, 1.5);
        setPreviewImage(result.url);
      } catch (err) {
        console.error("PDF upload failed:", err);
        toast.error("فشل تحميل ملف PDF");
        setPreviewImage(null);
        setFileType(null);
        pdfDocRef.current?.cleanup();
        pdfDocRef.current = null;
      } finally {
        setPdfLoading(false);
      }
    } else {
      // Image file
      setFileType("image");
      pdfDocRef.current?.cleanup();
      pdfDocRef.current = null;
      setPdfPageNum(1);
      setPdfTotalPages(0);
      const url = URL.createObjectURL(file);
      setPreviewImage(url);
    }

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const changePdfPage = async (delta: number) => {
    const newPage = pdfPageNum + delta;
    if (newPage < 1 || newPage > pdfTotalPages || !pdfDocRef.current) return;
    setPdfPageNum(newPage);
    await renderPdfPage(newPage);
  };

  const clearPreviewImage = () => {
    if (previewImage) URL.revokeObjectURL(previewImage);
    pdfDocRef.current?.cleanup();
    setPreviewImage(null);
    setFileType(null);
    pdfDocRef.current = null;
    setPdfPageNum(2);
    setPdfTotalPages(0);
  };

  const [showCropTest, setShowCropTest] = useState(false);

  // Fetch existing settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["camp-trips", "crop-settings"],
    queryFn: getCropSettings,
  });

  // Populate form from API data once
  useEffect(() => {
    if (!settings || isInitialized) return;
    const pc = findSetting(settings, "parental_consent");
    if (pc) {
      setParentalConsent({
        x_offset_pct: pc.x_offset_pct,
        y_offset_pct: pc.y_offset_pct,
        width_pct: pc.width_pct,
        height_pct: pc.height_pct,
      });
    }
    const mc = findSetting(settings, "medical_certificate");
    if (mc) {
      setMedicalCert({
        x_offset_pct: mc.x_offset_pct,
        y_offset_pct: mc.y_offset_pct,
        width_pct: mc.width_pct,
        height_pct: mc.height_pct,
      });
    }
    setIsInitialized(true);
  }, [settings, isInitialized]);

  // Save mutation
  const mutation = useMutation({
    mutationFn: updateCropSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(["camp-trips", "crop-settings"], data);
      toast.success(t("settings_saved"));
    },
    onError: (error) => {
      toast.error(getErrorMessage(error) || t("settings_error") || "حدث خطأ أثناء حفظ الإعدادات");
    },
  });

  const handleSave = () => {
    mutation.mutate({
      settings: [
        {
          document_type: "parental_consent",
          ...parentalConsent,
        },
        {
          document_type: "medical_certificate",
          ...medicalCert,
        },
      ],
    });
  };

  return (
  <PermissionGuard module="camp_trips" action="view">
              <div className="space-y-6 max-w-[1400px] mx-auto pb-20">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-white rounded-2xl border shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/camp-trips">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-slate-100"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Button>
          </Link>
          <div className="p-3 bg-emerald-100/50 rounded-xl">
            <Crop className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              {t("crop_settings")}
            </h1>
            <p className="text-slate-500 font-medium">
              {t("crop_settings_description")}
            </p>
          </div>
        </div>
        <Link href="/camp-trips">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("back_to_trips")}
          </Button>
        </Link>
      </div>

      {/* ─── Loading ─── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-sm text-slate-500">{t("loading")}</p>
          </div>
        </div>
      ) : (
        <>
          {/* ─── Main Content ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: Cards */}
            <div className="lg:col-span-2 space-y-6">
              {/* Parental Consent Card */}
              <Card className="border-emerald-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-white border-b border-emerald-100">
                  <CardTitle className="flex items-center gap-2 text-emerald-800">
                    <div className="p-1.5 bg-emerald-100 rounded-lg">
                      <Crop className="h-5 w-5 text-emerald-600" />
                    </div>
                    {t("parental_consent")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <NumberInput
                      label={t("x_offset")}
                      value={parentalConsent.x_offset_pct}
                      onChange={(v) =>
                        setParentalConsent((prev) => ({
                          ...prev,
                          x_offset_pct: v,
                        }))
                      }
                      step={1}
                    />
                    <NumberInput
                      label={t("y_offset")}
                      value={parentalConsent.y_offset_pct}
                      onChange={(v) =>
                        setParentalConsent((prev) => ({
                          ...prev,
                          y_offset_pct: v,
                        }))
                      }
                      step={1}
                    />
                    <NumberInput
                      label={t("width")}
                      value={parentalConsent.width_pct}
                      onChange={(v) =>
                        setParentalConsent((prev) => ({
                          ...prev,
                          width_pct: v,
                        }))
                      }
                      step={0.5}
                    />
                    <NumberInput
                      label={t("height")}
                      value={parentalConsent.height_pct}
                      onChange={(v) =>
                        setParentalConsent((prev) => ({
                          ...prev,
                          height_pct: v,
                        }))
                      }
                      step={0.5}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Medical Certificate Card */}
              <Card className="border-pink-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-pink-50 to-white border-b border-pink-100">
                  <CardTitle className="flex items-center gap-2 text-pink-800">
                    <div className="p-1.5 bg-pink-100 rounded-lg">
                      <Crop className="h-5 w-5 text-pink-600" />
                    </div>
                    {t("medical_certificate")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <NumberInput
                      label={t("x_offset")}
                      value={medicalCert.x_offset_pct}
                      onChange={(v) =>
                        setMedicalCert((prev) => ({
                          ...prev,
                          x_offset_pct: v,
                        }))
                      }
                      step={1}
                    />
                    <NumberInput
                      label={t("y_offset")}
                      value={medicalCert.y_offset_pct}
                      onChange={(v) =>
                        setMedicalCert((prev) => ({
                          ...prev,
                          y_offset_pct: v,
                        }))
                      }
                      step={1}
                    />
                    <NumberInput
                      label={t("width")}
                      value={medicalCert.width_pct}
                      onChange={(v) =>
                        setMedicalCert((prev) => ({
                          ...prev,
                          width_pct: v,
                        }))
                      }
                      step={0.5}
                    />
                    <NumberInput
                      label={t("height")}
                      value={medicalCert.height_pct}
                      onChange={(v) =>
                        setMedicalCert((prev) => ({
                          ...prev,
                          height_pct: v,
                        }))
                      }
                      step={0.5}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right column: Preview */}
            <div className="lg:col-span-1">
              <Card className="shadow-sm border-slate-200 sticky top-6">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-slate-800">
                      <Crop className="h-5 w-5 text-slate-600" />
                      {t("crop_preview")}
                    </CardTitle>
                    {previewImage ? (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={clearPreviewImage}>
                        <X className="h-4 w-4" />
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => fileInputRef.current?.click()}>
                          <Upload className="h-3 w-3" />
                          ارفع وثيقة
                        </Button>
                        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUploadPreview} />
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {pdfLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                    </div>
                  ) : previewImage ? (
                    <>
                      <CropPreview
                        parentalConsent={parentalConsent}
                        medicalCert={medicalCert}
                        parentalLabel={t("parental_consent")}
                        medicalLabel={t("medical_certificate")}
                        imageUrl={previewImage}
                      />

                      {/* PDF page navigator */}
                      {fileType === "pdf" && pdfTotalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled={pdfPageNum <= 1}
                            onClick={() => changePdfPage(-1)}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm font-mono text-slate-600 min-w-[4rem] text-center">
                            {pdfPageNum} / {pdfTotalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled={pdfPageNum >= pdfTotalPages}
                            onClick={() => changePdfPage(1)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      <Button
                        variant="default"
                        size="sm"
                        className="w-full mt-3 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => setShowCropTest(true)}
                      >
                        <Scissors className="h-4 w-4" />
                        تجربة القص
                      </Button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                      <FileImage className="h-12 w-12 mb-3" />
                      <p className="text-xs text-center">
                        ارفع صورة أو PDF للصفحة الخلفية<br />
                        لمعاينة القص مباشرة
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 text-center mt-4">
                    A4 أُفقي &mdash; {t("crop_preview")}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ─── Save Button ─── */}
          <div className="flex justify-end gap-3">
            <Link href="/camp-trips">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t("back_to_trips")}
              </Button>
            </Link>
            <Button
              onClick={handleSave}
              disabled={mutation.isPending}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t("save_settings")}
            </Button>
          </div>

          {/* Crop Test Dialog */}
          {previewImage && (
            <CropTester
              imageUrl={previewImage}
              parentalConsent={parentalConsent}
              medicalCert={medicalCert}
              parentalLabel={t("parental_consent")}
              medicalLabel={t("medical_certificate")}
              open={showCropTest}
              onClose={() => setShowCropTest(false)}
              fileType={fileType}
              pdfDoc={pdfDocRef.current}
              pdfPageNum={pdfPageNum}
            />
          )}
        </>
      )}
    </div>
  </PermissionGuard>
  );
}