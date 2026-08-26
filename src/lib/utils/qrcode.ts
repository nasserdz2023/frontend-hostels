"use client";

import QRCode from "qrcode";

/**
 * Generate a QR code as a base64 data URL
 * This runs entirely offline - no external API needed
 */
export async function generateQRCodeDataURL(content: string, size: number = 150): Promise<string> {
    try {
        const dataUrl = await QRCode.toDataURL(content, {
            width: size,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });
        return dataUrl;
    } catch (err) {
        console.error("QR Code generation failed:", err);
        return "";
    }
}

/**
 * Generate a QR code as SVG string (for inline rendering)
 */
export async function generateQRCodeSVG(content: string): Promise<string> {
    try {
        const svg = await QRCode.toString(content, { type: 'svg' });
        return svg;
    } catch (err) {
        console.error("QR Code generation failed:", err);
        return "";
    }
}
