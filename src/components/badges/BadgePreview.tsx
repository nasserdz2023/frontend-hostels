"use client";

import { useEffect, useRef, useState, memo } from "react";
import { BadgePersonData, BadgeTemplate } from "@/lib/types/badges";
import { generateQRCodeDataURL } from "@/lib/utils/qrcode";

interface BadgePreviewProps {
    template: Partial<BadgeTemplate>;
    data?: BadgePersonData;
    className?: string;
    scale?: number;
    face?: 'front' | 'back';
}

const DEFAULT_PERSON: BadgePersonData = {
    id: "preview-id",
    name: "اسم تجريبي",
    role: "موظف",
    photo_url: "https://via.placeholder.com/150",
    qr_code_content: "QR_MOCK_CONTENT",
    extra_fields: {
        department: "مصلحة الإعلام الآلي",
        activity: "نشاط تجريبي"
    }
};

export const BadgePreview = memo(function BadgePreview({ template, data = DEFAULT_PERSON, className, scale = 1, face = 'front' }: BadgePreviewProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

    // Generate QR code locally (offline)
    useEffect(() => {
        if (data.qr_code_content) {
            generateQRCodeDataURL(data.qr_code_content, 150).then(setQrCodeUrl);
        }
    }, [data.qr_code_content]);

    const contentSource = face === 'front' ? (template.html_content || "") : (template.html_content_back || "");

    // Fallback for back side if empty: show a placeholder or blank
    const effectiveHtml = contentSource || (face === 'back' ? '<div style="display:flex;justify-content:center;align-items:center;height:100%;color:#ccc;">Face Back (Empty)</div>' : "");

    const htmlContent = effectiveHtml
        .replace(/{{name}}/g, data.name || "الاسم الكامل")
        .replace(/{{role}}/g, data.role || "المنصب")
        .replace(/{{photo_url}}/g, data.photo_url || "")
        .replace(/{{department}}/g, data.extra_fields?.department || "")
        .replace(/{{activity}}/g, data.extra_fields?.activity || "")
        .replace(/{{grade}}/g, data.extra_fields?.grade || "")
        .replace(/{{employee_number}}/g, data.extra_fields?.employee_number || "")
        .replace(/{{hire_date}}/g, data.extra_fields?.hire_date || "")
        .replace(/{{email}}/g, data.extra_fields?.email || "")
        .replace(/{{phone}}/g, data.extra_fields?.phone || "")
        .replace(/{{mobile}}/g, data.extra_fields?.mobile || "")
        // QR Code - now using local generation (data URL)
        .replace(/{{qr_code_url}}/g, qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data.qr_code_content)}`)
        .replace(/{{qr_code_content}}/g, data.qr_code_content);

    const cssContent = template.css_content || "";

    // Build background image HTML tag (more reliable than CSS background-image in iframes)
    const bgImageHtml = template.background_image_url
        ? `<img src="${template.background_image_url}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:fill;z-index:0;pointer-events:none;" />`
        : '';

    const fullDoc = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    width: ${template.width_mm}mm;
                    height: ${template.height_mm}mm;
                    overflow: hidden;
                    box-sizing: border-box;
                    position: relative;
                }
                body > *:not(img) {
                    position: relative;
                    z-index: 1;
                }
                ${cssContent}
            </style>
        </head>
        <body>
            ${bgImageHtml}
            ${htmlContent}
        </body>
        </html>
    `;

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const doc = iframe.contentDocument;
        if (!doc) return;

        doc.open();
        doc.write(fullDoc);
        doc.close();
    }, [fullDoc, template.width_mm, template.height_mm]);

    // Calculate pixel dimensions for the iframe based on mm usually 1mm approx 3.78px
    // But for preview scaling, we handle it via CSS transform or container sizing.
    // Let's use standard assumption: 96 DPI -> 1mm = 3.7795px
    const widthPx = (template.width_mm || 85) * 3.7795;
    const heightPx = (template.height_mm || 54) * 3.7795;

    return (
        <div
            className={`relative overflow-hidden shadow-lg bg-white ${className}`}
            style={{
                width: widthPx * scale,
                height: heightPx * scale
            }}
        >
            <iframe
                ref={iframeRef}
                title="Badge Preview"
                style={{
                    width: `${widthPx}px`,
                    height: `${heightPx}px`,
                    border: 'none',
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                    pointerEvents: 'none' // Disable interaction within preview
                }}
            />
        </div>
    );
});
