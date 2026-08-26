"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { badgeService } from "@/lib/api/badges";
import { BadgeTemplate } from "@/lib/types/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { fontsService, CustomFont } from "@/lib/api/fonts";
import { toast } from "sonner";
import { ArrowLeft, Save, Code, Image as ImageIcon, Loader2, Type, Plus, Trash2, Eye, Copy } from "lucide-react";
import { MediaRequest } from "@/lib/api/media";

// Google Fonts for Arabic typography
const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;700&display=swap';

// --- Visual Designer Types ---
interface TextLine {
    id: string;
    content: string;
    fontSize: number;
    fontWeight: string;
    color: string;
    topPercent: number; // position from top (0-100%)
    rightPercent: number; // padding from right (0-50%)
    leftPercent: number; // padding from left (0-50%)
    textAlign: string;
    fontFamily: string;
    // Variable styling (like {{name}})
    hasVarStyle?: boolean;
    varColor?: string;
    varFontFamily?: string;
    varFontWeight?: string;
    varFontSize?: number;
    isVertical?: boolean;
}

const DEFAULT_LINES: TextLine[] = [
    { id: "line-1", content: "شهادة تكريم", fontSize: 28, fontWeight: "bold", color: "#333333", topPercent: 20, rightPercent: 0, leftPercent: 0, textAlign: "center", fontFamily: "serif" },
    { id: "line-2", content: "تُمنح هذه الشهادة إلى", fontSize: 16, fontWeight: "normal", color: "#555555", topPercent: 40, rightPercent: 0, leftPercent: 0, textAlign: "center", fontFamily: "serif" },
    { id: "line-3", content: "{{name}}", fontSize: 32, fontWeight: "bold", color: "#1a1a1a", topPercent: 52, rightPercent: 0, leftPercent: 0, textAlign: "center", fontFamily: "serif" },
    { id: "line-4", content: "تقديراً لجهوده المتميزة", fontSize: 14, fontWeight: "normal", color: "#555555", topPercent: 65, rightPercent: 0, leftPercent: 0, textAlign: "center", fontFamily: "serif" },
];

function generateHtmlFromLines(lines: TextLine[], customFonts: CustomFont[] = []): string {
    const linesHtml = lines.map(line => {
        // Convert px to mm (1px ≈ 0.2646mm at 96 DPI)
        const fontSizeMm = (line.fontSize * 0.2646).toFixed(2);

        let content = line.content;
        if (line.hasVarStyle) {
            const varFontSizeMm = line.varFontSize ? (line.varFontSize * 0.2646).toFixed(2) : null;
            const fontSizeStr = varFontSizeMm ? `font-size:${varFontSizeMm}mm;` : '';
            const varStyle = `color:${line.varColor || line.color};font-weight:${line.varFontWeight || line.fontWeight};font-family:${line.varFontFamily || line.fontFamily};${fontSizeStr}`;
            content = content.replace(/\{\{(.*?)\}\}/g, `<span style="${varStyle}">{{$1}}</span>`);
        }
        if (line.isVertical) {
            content = `<div style="display:inline-block; transform: rotate(-90deg); transform-origin: center; white-space: nowrap;">${content}</div>`;
        }

        return `<div style="position:absolute;top:${line.topPercent}%;left:0;right:0;text-align:${line.textAlign};font-size:${fontSizeMm}mm;font-weight:${line.fontWeight};color:${line.color};font-family:${line.fontFamily};padding-right:${line.rightPercent}%;padding-left:${line.leftPercent}%;box-sizing:border-box;direction:rtl;white-space:pre-wrap;">${content}</div>`;
    }).join("\n");

    const fontFaces = customFonts.map(f => `@font-face { font-family: "${f.font_family}"; src: url("${f.file_url}"); }`).join("\n");

    return `<link rel="stylesheet" href="${GOOGLE_FONTS_URL}" />
<style>
${fontFaces}
</style>
<div style="position:relative;width:100%;height:100%;">
${linesHtml}
</div>`;
}

function generateCssFromLines(lines: TextLine[]): string {
    // Store textLines config as JSON so it can be restored when editing
    return `/* VISUAL_LINES:${JSON.stringify(lines)}:END_VISUAL */`;
}

function parseTextLinesFromCss(css: string): TextLine[] | null {
    const match = css.match(/\/\* VISUAL_LINES:(.*?):END_VISUAL \*\//);
    if (match) {
        try {
            return JSON.parse(match[1]);
        } catch { return null; }
    }
    return null;
}

export default function TemplateEditorPage() {
    const params = useParams();
    const router = useRouter();
    const isNew = params.id === "create";
    const templateId = isNew ? null : (params.id as string);

    const [loading, setLoading] = useState(!isNew);
    const [uploadingBg, setUploadingBg] = useState(false);
    const [scale, setScale] = useState(0.5);
    const [editorMode, setEditorMode] = useState<"visual" | "html">("visual");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Visual designer state
    const [textLines, setTextLines] = useState<TextLine[]>(DEFAULT_LINES);

    // Fonts state
    const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
    const [uploadFontOpen, setUploadFontOpen] = useState(false);
    const [fontNameInput, setFontNameInput] = useState("");
    const [fontFile, setFontFile] = useState<File | null>(null);
    const [uploadingFont, setUploadingFont] = useState(false);

    useEffect(() => {
        const fetchFonts = async () => {
            try {
                const fonts = await fontsService.getFonts();
                setCustomFonts(fonts);
            } catch (err) {
                console.error("Failed to fetch fonts", err);
            }
        };
        fetchFonts();
    }, []);

    const [template, setTemplate] = useState<Partial<BadgeTemplate>>({
        name: "",
        width_mm: 297,
        height_mm: 210,
        orientation: "landscape",
        html_content: generateHtmlFromLines(DEFAULT_LINES),
        css_content: generateCssFromLines(DEFAULT_LINES),
        background_opacity: 1.0,
        is_active: true
    });

    // Sync visual lines to HTML when lines change
    useEffect(() => {
        if (editorMode === "visual") {
            setTemplate(prev => ({
                ...prev,
                html_content: generateHtmlFromLines(textLines, customFonts),
                css_content: generateCssFromLines(textLines),
            }));
        }
    }, [textLines, editorMode, customFonts]);

    const handleSave = async () => {
        try {
            // Force-sync visual mode to HTML before saving
            const saveData = { ...template };
            if (editorMode === "visual") {
                saveData.html_content = generateHtmlFromLines(textLines, customFonts);
                saveData.css_content = generateCssFromLines(textLines);
            }

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, created_at, updated_at, ...payload } = saveData as any;

            if (isNew) {
                await badgeService.createTemplate(payload);
                toast.success("تم إنشاء القالب بنجاح");
            } else if (templateId) {
                await badgeService.updateTemplate(templateId, payload);
                toast.success("تم تحديث القالب بنجاح");
            }
            router.push("/badges");
        } catch (error: any) {
            console.error("Save error:", error);
            // If the error is about background_image_url column not existing, retry without it
            if (error.response?.status === 500 && String(error.response?.data?.detail || '').includes('background_image_url')) {
                try {
                    const saveData = { ...template };
                    if (editorMode === "visual") {
                        saveData.html_content = generateHtmlFromLines(textLines, customFonts);
                        saveData.css_content = generateCssFromLines(textLines);
                    }
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { id, created_at, updated_at, background_image_url, ...retryPayload } = saveData as any;
                    if (isNew) {
                        await badgeService.createTemplate(retryPayload);
                    } else if (templateId) {
                        await badgeService.updateTemplate(templateId, retryPayload);
                    }
                    toast.success("تم حفظ القالب (بدون الخلفية - يرجى تطبيق migration 303)");
                    router.push("/badges");
                    return;
                } catch (retryError) {
                    console.error("Retry save error:", retryError);
                }
            }
            const detail = error.response?.data?.detail
                || (typeof error.response?.data === 'object' ? JSON.stringify(error.response?.data) : null)
                || error.message
                || "فشل حفظ القالب";
            toast.error(`فشل حفظ القالب: ${detail}`);
        }
    };

    useEffect(() => {
        if (!isNew && templateId) {
            badgeService.getTemplate(templateId)
                .then((t) => {
                    setTemplate(t);
                    // Try to restore visual mode text lines from saved css_content
                    const savedLines = parseTextLinesFromCss(t.css_content || '');
                    if (savedLines && savedLines.length > 0) {
                        setTextLines(savedLines);
                        setEditorMode("visual");
                    } else {
                        setEditorMode("html");
                    }
                })
                .catch(() => toast.error("فشل تحميل القالب"))
                .finally(() => setLoading(false));
        }
    }, [isNew, templateId]);

    const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingBg(true);
        try {
            const uploaded = await MediaRequest.upload(file);
            const bgUrl = uploaded.file_url;

            setTemplate(prev => ({
                ...prev,
                background_image_url: bgUrl
            }));

            toast.success("تم رفع الخلفية بنجاح");
        } catch (error) {
            console.error(error);
            toast.error("فشل رفع الصورة");
        } finally {
            setUploadingBg(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleUploadFont = async () => {
        if (!fontNameInput.trim() || !fontFile) {
            toast.error("يرجى إدخال اسم الخط واختيار الملف");
            return;
        }

        setUploadingFont(true);
        try {
            const font = await fontsService.uploadFont(fontNameInput, fontFile);
            setCustomFonts(prev => [font, ...prev]);
            toast.success("تم رفع الخط بنجاح");
            setUploadFontOpen(false);
            setFontNameInput("");
            setFontFile(null);
        } catch (error) {
            console.error(error);
            toast.error("فشل رفع الخط");
        } finally {
            setUploadingFont(false);
        }
    };

    // --- Visual Designer Helpers ---
    const addLine = () => {
        setTextLines(prev => [...prev, {
            id: `line-${Date.now()}`,
            content: "نص جديد",
            fontSize: 16,
            fontWeight: "normal",
            color: "#333333",
            topPercent: 75,
            rightPercent: 0,
            leftPercent: 0,
            textAlign: "center",
            fontFamily: "serif"
        }]);
    };

    const updateLine = (id: string, field: keyof TextLine, value: any) => {
        setTextLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const removeLine = (id: string) => {
        setTextLines(prev => prev.filter(l => l.id !== id));
    };

    const duplicateLine = (line: TextLine) => {
        setTextLines(prev => {
            const newLines = [...prev];
            const index = newLines.findIndex(l => l.id === line.id);
            if (index !== -1) {
                newLines.splice(index + 1, 0, {
                    ...line,
                    id: `line-${Date.now()}`,
                    topPercent: Math.min(line.topPercent + 5, 95) // Offset slightly so it's visible as duplicate
                });
            }
            return newLines;
        });
    };

    // Helper to separate Front/Back/CSS from pasted full HTML
    const parsePastedCode = (pastedContent?: string) => {
        const fullCode = pastedContent || template.html_content || "";
        if (!fullCode.includes("<html") && !fullCode.includes("<!DOCTYPE")) return;

        const styleMatch = fullCode.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        const css = styleMatch ? styleMatch[1].trim() : "";
        const headMatch = fullCode.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
        const headContent = headMatch ? headMatch[1] : "";
        const linkTags = headContent.match(/<link[^>]*>/gi) || [];
        const linksHtml = linkTags.join("\n");
        const bodyMatch = fullCode.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        let bodyContent = bodyMatch ? bodyMatch[1].trim() : fullCode;

        if (!bodyMatch) {
            bodyContent = fullCode.replace(/<style[^>]*>[\s\S]*?<\/style>/i, "")
                .replace(/<!DOCTYPE[^>]*>/i, "")
                .replace(/<html[^>]*>/i, "").replace(/<\/html>/i, "")
                .replace(/<head[^>]*>[\s\S]*?<\/head>/i, "").trim();
        }

        const finalBodyContent = (linksHtml + "\n" + bodyContent).trim();

        let frontHtml = "";
        let backHtml = "";

        if (finalBodyContent.includes("badge-front") && finalBodyContent.includes("badge-back")) {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(`<html><body>${finalBodyContent}</body></html>`, "text/html");
                const frontEl = doc.querySelector(".badge-front");
                const backEl = doc.querySelector(".badge-back");
                if (frontEl) frontHtml = linksHtml + "\n" + frontEl.outerHTML;
                if (backEl) backHtml = linksHtml + "\n" + backEl.outerHTML;
                if (frontHtml && backHtml) {
                    setTemplate(prev => ({ ...prev, css_content: css || prev.css_content, html_content: frontHtml, html_content_back: backHtml }));
                    toast.success("تم استخراج التنسيق وتوزيع الوجهين بنجاح");
                    return;
                }
            } catch (e) { console.error("DOM Parse Error", e); }
        }

        setTemplate(prev => ({ ...prev, css_content: css, html_content: finalBodyContent }));
        toast.success("تم فصل HTML عن CSS بنجاح");
    };

    useEffect(() => {
        if (editorMode !== "html" || !template.html_content) return;
        if (template.html_content.trim().startsWith("<!DOCTYPE") || template.html_content.trim().startsWith("<html")) {
            const timer = setTimeout(() => { parsePastedCode(template.html_content); }, 800);
            return () => clearTimeout(timer);
        }
    }, [template.html_content, editorMode]);

    if (loading) return <div>Loading...</div>;

    // --- Preview dimensions ---
    const widthPx = (template.width_mm || 297) * 3.7795;
    const heightPx = (template.height_mm || 210) * 3.7795;

    return (
        <div className="container mx-auto py-6 h-[calc(100vh-80px)] flex flex-col">
            {/* Google Fonts for Arabic typography */}
            { }
            <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-2xl font-bold">{isNew ? "إنشاء قالب جديد" : "تعديل القالب"}</h1>
                </div>
                <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleBackgroundUpload} />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingBg}>
                        {uploadingBg ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : <ImageIcon className="ms-2 h-4 w-4" />}
                        رفع خلفية
                    </Button>
                    {editorMode === "html" && (
                        <Button variant="outline" onClick={() => parsePastedCode()}>
                            <Code className="ms-2 h-4 w-4" />
                            تنسيق الكود
                        </Button>
                    )}
                    <Button onClick={handleSave}>
                        <Save className="ms-2 h-4 w-4" />
                        حفظ
                    </Button>
                </div>
            </div>

            {/* Background Indicator */}
            {template.background_image_url && (
                <div className="flex items-center gap-3 px-4 py-2 bg-green-50 border border-green-200 rounded-lg mb-3">
                    <img src={template.background_image_url} alt="خلفية" className="h-8 w-14 object-cover rounded border" />
                    <span className="text-sm text-green-700 flex-1">✅ تم تعيين صورة الخلفية</span>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setTemplate(prev => ({ ...prev, background_image_url: undefined }))}>
                        إزالة الخلفية
                    </Button>
                </div>
            )}

            {/* Mode Tabs */}
            <Tabs value={editorMode} onValueChange={(v: any) => {
                if (v === "html" && editorMode === "visual") {
                    // Switching TO HTML: sync visual lines into template
                    setTemplate(prev => ({
                        ...prev,
                        html_content: generateHtmlFromLines(textLines),
                        css_content: generateCssFromLines(textLines),
                    }));
                } else if (v === "visual" && editorMode === "html") {
                    // Switching TO visual: try to restore lines from css_content
                    const savedLines = parseTextLinesFromCss(template.css_content || '');
                    if (savedLines && savedLines.length > 0) {
                        setTextLines(savedLines);
                    }
                }
                setEditorMode(v);
            }} className="flex flex-col flex-1 overflow-hidden">
                <TabsList className="grid w-full grid-cols-2 mb-3">
                    <TabsTrigger value="visual" className="flex items-center gap-2">
                        <Type className="h-4 w-4" />
                        مصمم بصري (سهل)
                    </TabsTrigger>
                    <TabsTrigger value="html" className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        محرر HTML (متقدم)
                    </TabsTrigger>
                </TabsList>

                {/* ===== VISUAL DESIGNER MODE ===== */}
                <TabsContent value="visual" className="flex-1 overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 h-full overflow-hidden">
                        {/* Controls Panel */}
                        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3 overflow-y-auto pe-2 max-h-full">
                            {/* Template Name & Dimensions */}
                            <div className="space-y-2 p-3 border rounded-lg bg-card">
                                <div className="space-y-1">
                                    <Label className="text-xs">اسم القالب</Label>
                                    <Input value={template.name} onChange={e => setTemplate({ ...template, name: e.target.value })} placeholder="مثال: شهادة تكريم 2026" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">مقاس جاهز</Label>
                                    <Select onValueChange={(v) => {
                                        if (v === "id_card_l") setTemplate(t => ({ ...t, width_mm: 85, height_mm: 54, orientation: "landscape" }));
                                        if (v === "id_card_p") setTemplate(t => ({ ...t, width_mm: 54, height_mm: 85, orientation: "portrait" }));
                                        if (v === "a4_cert_l") setTemplate(t => ({ ...t, width_mm: 297, height_mm: 210, orientation: "landscape" }));
                                        if (v === "a4_cert_p") setTemplate(t => ({ ...t, width_mm: 210, height_mm: 297, orientation: "portrait" }));
                                    }}>
                                        <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="a4_cert_l">شهادة A4 أفقي (297x210)</SelectItem>
                                            <SelectItem value="a4_cert_p">شهادة A4 عمودي (210x297)</SelectItem>
                                            <SelectItem value="id_card_l">بطاقة أفقي (85x54)</SelectItem>
                                            <SelectItem value="id_card_p">بطاقة عمودي (54x85)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-xs">العرض (mm)</Label>
                                        <Input type="number" value={template.width_mm} onChange={e => setTemplate({ ...template, width_mm: Number(e.target.value) })} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">الارتفاع (mm)</Label>
                                        <Input type="number" value={template.height_mm} onChange={e => setTemplate({ ...template, height_mm: Number(e.target.value) })} />
                                    </div>
                                </div>
                                <div className="space-y-1 pt-3 border-t mt-3">
                                    <div className="flex justify-between items-center px-1 mb-1">
                                        <Label className="text-xs">شفافية الخلفية</Label>
                                        <span className="font-mono bg-muted px-1 rounded text-xs">{Math.round((template.background_opacity ?? 1) * 100)}%</span>
                                    </div>
                                    <Slider
                                        value={[template.background_opacity ?? 1]}
                                        min={0} max={1} step={0.01}
                                        onValueChange={([v]) => setTemplate(t => ({ ...t, background_opacity: v }))}
                                    />
                                </div>
                            </div>

                            {/* Text Lines */}
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold">سطور النص</h3>
                                <Button size="sm" variant="outline" onClick={addLine}>
                                    <Plus className="ms-1 h-3 w-3" />
                                    إضافة سطر
                                </Button>
                            </div>

                            <p className="text-xs text-muted-foreground -mt-2">
                                استخدم <code className="bg-muted px-1 rounded">{'{{name}}'}</code> لإدراج اسم المُكرَّم تلقائياً، و<code className="bg-muted px-1 rounded">{'{{role}}'}</code> للمنصب، و<code className="bg-muted px-1 rounded">{'{{serial_number}}'}</code> للرقم التسلسلي.
                            </p>

                            {textLines.map((line, idx) => (
                                <div key={line.id} className="p-3 border rounded-lg bg-card space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold">سطر {idx + 1}</Label>
                                        <div className="flex gap-1">
                                            <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-primary h-6 w-6 p-0" onClick={() => duplicateLine(line)}>
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                            <Button size="sm" variant="ghost" className="text-red-500 h-6 w-6 p-0" onClick={() => removeLine(line.id)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    <Input
                                        value={line.content}
                                        onChange={e => updateLine(line.id, "content", e.target.value)}
                                        placeholder="النص..."
                                        className="text-sm"
                                        dir="rtl"
                                    />

                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-[10px]">الحجم</Label>
                                            <Input type="number" min={8} max={120} value={line.fontSize} onChange={e => updateLine(line.id, "fontSize", Number(e.target.value))} className="text-xs" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px]">الوزن</Label>
                                            <Select value={line.fontWeight} onValueChange={v => updateLine(line.id, "fontWeight", v)}>
                                                <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="normal">عادي</SelectItem>
                                                    <SelectItem value="bold">سميك</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px]">اللون</Label>
                                            <Input type="color" value={line.color} onChange={e => updateLine(line.id, "color", e.target.value)} className="h-9 p-1 cursor-pointer" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-[10px]">الخط</Label>
                                            <Select value={line.fontFamily} onValueChange={v => {
                                                if (v === "UPLOAD") {
                                                    setUploadFontOpen(true);
                                                } else {
                                                    updateLine(line.id, "fontFamily", v);
                                                }
                                            }}>
                                                <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="'Amiri', serif">عربي - أميري</SelectItem>
                                                    <SelectItem value="'Cairo', sans-serif">عربي - القاهرة</SelectItem>
                                                    <SelectItem value="serif">كلاسيكي (Serif)</SelectItem>
                                                    <SelectItem value="sans-serif">حديث (Sans)</SelectItem>

                                                    {customFonts.length > 0 && <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 mt-1 mb-1">الخطوط المخصصة</div>}
                                                    {customFonts.map(font => (
                                                        <SelectItem key={font.id} value={`'${font.font_family}'`}>{font.name}</SelectItem>
                                                    ))}

                                                    <div className="px-2 py-1 border-t mt-1"></div>
                                                    <SelectItem value="UPLOAD" className="font-bold text-primary">➕ رفع خط جديد...</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px]">المحاذاة</Label>
                                            <Select value={line.textAlign} onValueChange={v => updateLine(line.id, "textAlign", v)}>
                                                <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="center">وسط</SelectItem>
                                                    <SelectItem value="right">يمين</SelectItem>
                                                    <SelectItem value="left">يسار</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Variable Styling Toggle */}
                                    <div className="pt-2 border-t mt-2">
                                        <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => updateLine(line.id, "hasVarStyle", !line.hasVarStyle)}>
                                            <Label className="text-[10px] font-bold text-primary cursor-pointer">✨ تخصيص لون المتغيرات {'{{...}}'}</Label>
                                            <Switch checked={line.hasVarStyle || false} onCheckedChange={(v) => updateLine(line.id, "hasVarStyle", v)} />
                                        </div>

                                        {line.hasVarStyle && (
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-muted/30 p-2 rounded-md">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px]">حجم المتغير</Label>
                                                    <Input type="number" value={line.varFontSize || ""} onChange={e => updateLine(line.id, "varFontSize", e.target.value ? Number(e.target.value) : undefined)} className="h-8 text-xs" placeholder="تلقائي" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px]">لون المتغير</Label>
                                                    <Input type="color" value={line.varColor || line.color} onChange={e => updateLine(line.id, "varColor", e.target.value)} className="h-8 p-1 cursor-pointer" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px]">وزن المتغير</Label>
                                                    <Select value={line.varFontWeight || line.fontWeight} onValueChange={v => updateLine(line.id, "varFontWeight", v)}>
                                                        <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="normal">عادي</SelectItem>
                                                            <SelectItem value="bold">سميك</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px]">خط المتغير</Label>
                                                    <Select value={line.varFontFamily || line.fontFamily} onValueChange={v => {
                                                        if (v === "UPLOAD") {
                                                            setUploadFontOpen(true);
                                                        } else {
                                                            updateLine(line.id, "varFontFamily", v);
                                                        }
                                                    }}>
                                                        <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="'Amiri', serif">عربي - أميري</SelectItem>
                                                            <SelectItem value="'Cairo', sans-serif">عربي - القاهرة</SelectItem>
                                                            <SelectItem value="serif">كلاسيكي (Serif)</SelectItem>

                                                            {customFonts.length > 0 && <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 mt-1 mb-1">الخطوط المخصصة</div>}
                                                            {customFonts.map(font => (
                                                                <SelectItem key={font.id} value={`'${font.font_family}'`}>{font.name}</SelectItem>
                                                            ))}

                                                            <div className="px-2 py-1 border-t mt-1"></div>
                                                                <SelectItem value="UPLOAD" className="font-bold text-primary">➕ رفع خط جديد...</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                                            <Switch
                                                checked={line.isVertical || false}
                                                onCheckedChange={(checked) => updateLine(line.id, 'isVertical', checked)}
                                                id={`vertical-${line.id}`}
                                            />
                                            <Label htmlFor={`vertical-${line.id}`} className="text-xs cursor-pointer">كتابة عمودية (Vertical)</Label>
                                        </div>

                                    <div className="space-y-1 pt-2 border-t">
                                        <div className="flex justify-between">
                                            <Label className="text-[10px]">↕ الموقع من الأعلى</Label>
                                            <span className="text-[10px] font-mono">{line.topPercent}%</span>
                                        </div>
                                        <Slider value={[line.topPercent]} onValueChange={([v]) => updateLine(line.id, "topPercent", v)} min={0} max={95} step={1} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <div className="flex justify-between">
                                                <Label className="text-[10px]">→ هامش يمين</Label>
                                                <span className="text-[10px] font-mono">{line.rightPercent}%</span>
                                            </div>
                                            <Slider value={[line.rightPercent]} onValueChange={([v]) => updateLine(line.id, "rightPercent", v)} min={0} max={50} step={1} />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between">
                                                <Label className="text-[10px]">← هامش يسار</Label>
                                                <span className="text-[10px] font-mono">{line.leftPercent}%</span>
                                            </div>
                                            <Slider value={[line.leftPercent]} onValueChange={([v]) => updateLine(line.id, "leftPercent", v)} min={0} max={50} step={1} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Live Preview */}
                        <div className="col-span-12 lg:col-span-8 bg-muted/30 rounded-lg p-4 flex flex-col gap-3 overflow-hidden border">
                            <div className="flex justify-between items-center bg-background p-2 rounded-md border shadow-sm">
                                <Label>المعاينة المباشرة</Label>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" onClick={() => setScale(s => Math.max(0.15, s - 0.05))}>
                                        <span className="text-lg">-</span>
                                    </Button>
                                    <span className="text-sm font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
                                    <Button variant="outline" size="icon" onClick={() => setScale(s => Math.min(1.5, s + 0.05))}>
                                        <span className="text-lg">+</span>
                                    </Button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto bg-gray-200/50 p-4 rounded-md flex items-start justify-center">
                                <div
                                    className="relative bg-white shadow-2xl border"
                                    style={{
                                        width: widthPx * scale,
                                        height: heightPx * scale,
                                        overflow: 'hidden',
                                    }}
                                >
                                    {/* Background Image */}
                                    {template.background_image_url && (
                                        <img
                                            src={template.background_image_url}
                                            alt=""
                                            style={{
                                                position: 'absolute', top: 0, left: 0,
                                                width: '100%', height: '100%',
                                                objectFit: 'fill',
                                                opacity: template.background_opacity ?? 1,
                                            }}
                                        />
                                    )}
                                    {/* Text Lines Overlay */}
                                    <div style={{ position: 'relative', width: '100%', height: '100%', transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                                        <style dangerouslySetInnerHTML={{ __html: customFonts.map(f => `@font-face { font-family: "${f.font_family}"; src: url("${f.file_url}"); }`).join("\n") }} />
                                        <div style={{ width: widthPx, height: heightPx, position: 'relative' }}>
                                            {textLines.map(line => (
                                                <div
                                                    key={line.id}
                                                    style={{
                                                        position: 'absolute',
                                                        top: `${line.topPercent}%`,
                                                        left: 0, right: 0,
                                                        textAlign: line.textAlign as any,
                                                        fontSize: `${line.fontSize}px`,
                                                        fontWeight: line.fontWeight,
                                                        color: line.color,
                                                        fontFamily: line.fontFamily,
                                                        paddingRight: `${line.rightPercent}%`,
                                                        paddingLeft: `${line.leftPercent}%`,
                                                        direction: 'rtl',
                                                        whiteSpace: 'pre-wrap',
                                                    }}
                                                    dangerouslySetInnerHTML={{
                                                        __html: (() => {
                                                            let c = line.content
                                                                .replace(/\{\{name\}\}/g, 'اسم تجريبي')
                                                                .replace(/\{\{role\}\}/g, 'موظف')
                                                                .replace(/\{\{department\}\}/g, 'مصلحة')
                                                                .replace(/\{\{grade\}\}/g, 'رتبة')
                                                                .replace(/\{\{serial_number\}\}/g, '<span dir="ltr" style="unicode-bidi: isolate; font-family: \'Inter\', Arial, sans-serif;">DJS-CERT-2026-000001</span>');

                                                            if (line.hasVarStyle) {
                                                                const fontSizeStr = line.varFontSize ? `font-size:${line.varFontSize}px;` : '';
                                                                const vStyle = `color:${line.varColor || line.color};font-weight:${line.varFontWeight || line.fontWeight};font-family:${line.varFontFamily || line.fontFamily};${fontSizeStr}`;
                                                                c = c.replace(/(اسم تجريبي|موظف|مصلحة|رتبة|DJS-CERT-2026-000001)/g, `<span style="${vStyle}">$1</span>`);
                                                            }

                                                            if (line.isVertical) {
                                                                c = `<div style="display:inline-block; transform: rotate(-90deg); transform-origin: center; white-space: nowrap;">${c}</div>`;
                                                            }
                                                            return c;
                                                        })()
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* ===== HTML EDITOR MODE ===== */}
                <TabsContent value="html" className="flex-1 overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 h-full overflow-hidden">
                        {/* Editor Panel */}
                        <div className="col-span-12 lg:col-span-5 flex flex-col gap-3 overflow-y-auto pe-2 max-h-full">
                            <div className="space-y-2 p-3 border rounded-lg bg-card">
                                <div className="space-y-1">
                                    <Label className="text-xs">اسم القالب</Label>
                                    <Input value={template.name} onChange={e => setTemplate({ ...template, name: e.target.value })} placeholder="مثال: شارة موظف 2024" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">مقاس جاهز</Label>
                                    <Select onValueChange={(v) => {
                                        if (v === "id_card_p") setTemplate(t => ({ ...t, width_mm: 54, height_mm: 85, orientation: "portrait" }));
                                        if (v === "id_card_l") setTemplate(t => ({ ...t, width_mm: 85, height_mm: 54, orientation: "landscape" }));
                                        if (v === "a4_cert_p") setTemplate(t => ({ ...t, width_mm: 210, height_mm: 297, orientation: "portrait" }));
                                        if (v === "a4_cert_l") setTemplate(t => ({ ...t, width_mm: 297, height_mm: 210, orientation: "landscape" }));
                                    }}>
                                        <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="id_card_l">شارة أفقي (85x54)</SelectItem>
                                            <SelectItem value="id_card_p">شارة عمودي (54x85)</SelectItem>
                                            <SelectItem value="a4_cert_l">شهادة A4 أفقي (297x210)</SelectItem>
                                            <SelectItem value="a4_cert_p">شهادة A4 عمودي (210x297)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-xs">العرض (mm)</Label>
                                        <Input type="number" value={template.width_mm} onChange={e => setTemplate({ ...template, width_mm: Number(e.target.value) })} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">الارتفاع (mm)</Label>
                                        <Input type="number" value={template.height_mm} onChange={e => setTemplate({ ...template, height_mm: Number(e.target.value) })} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">الاتجاه</Label>
                                    <Select value={template.orientation} onValueChange={(v: any) => setTemplate({ ...template, orientation: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="portrait">عمودي</SelectItem>
                                            <SelectItem value="landscape">أفقي</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Tabs defaultValue="front" className="flex flex-col gap-2 flex-1">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="front">الوجه الأمامي</TabsTrigger>
                                    <TabsTrigger value="back">الوجه الخلفي</TabsTrigger>
                                </TabsList>

                                <TabsContent value="front" className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <Label className="text-xs">HTML (Front)</Label>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => { navigator.clipboard.writeText(template.html_content || ""); toast.success("تم نسخ الكود"); }}>نسخ</Button>
                                            <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setTemplate({ ...template, html_content: "" })}>مسح</Button>
                                        </div>
                                    </div>
                                    <Textarea className="font-mono text-xs h-[180px]" value={template.html_content} onChange={e => setTemplate({ ...template, html_content: e.target.value })} />
                                    <p className="text-[10px] text-muted-foreground mt-1">المتغيرات: {'{{name}}, {{role}}, {{department}}, {{grade}}, {{employee_number}}, {{hire_date}}, {{photo_url}}, {{serial_number}}, {{qr_code_url}}'}</p>
                                </TabsContent>

                                <TabsContent value="back" className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <Label className="text-xs">HTML (Back)</Label>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => { navigator.clipboard.writeText(template.html_content_back || ""); toast.success("تم نسخ الكود"); }}>نسخ</Button>
                                            <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setTemplate({ ...template, html_content_back: "" })}>مسح</Button>
                                        </div>
                                    </div>
                                    <Textarea className="font-mono text-xs h-[180px]" value={template.html_content_back || ""} onChange={e => setTemplate({ ...template, html_content_back: e.target.value })} placeholder="<!-- محتوى الظهر -->" />
                                </TabsContent>
                            </Tabs>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <Label className="text-xs">CSS (Shared)</Label>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => { navigator.clipboard.writeText(template.css_content || ""); toast.success("تم نسخ CSS"); }}>نسخ</Button>
                                        <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setTemplate({ ...template, css_content: "" })}>مسح</Button>
                                    </div>
                                </div>
                                <Textarea className="font-mono text-xs h-[150px]" value={template.css_content} onChange={e => setTemplate({ ...template, css_content: e.target.value })} />
                            </div>
                        </div>

                        {/* Preview Panel */}
                        <div className="col-span-12 lg:col-span-7 bg-muted/30 rounded-lg p-4 flex flex-col gap-3 overflow-hidden border">
                            <div className="flex justify-between items-center bg-background p-2 rounded-md border shadow-sm">
                                <Label>المعاينة</Label>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" onClick={() => setScale(s => Math.max(0.15, s - 0.05))}>
                                        <span className="text-lg">-</span>
                                    </Button>
                                    <span className="text-sm font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
                                    <Button variant="outline" size="icon" onClick={() => setScale(s => Math.min(1.5, s + 0.05))}>
                                        <span className="text-lg">+</span>
                                    </Button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto bg-gray-200/50 p-4 rounded-md flex items-start justify-center">
                                <div className="flex flex-col items-center gap-8">
                                    <div className="flex flex-col items-center gap-2">
                                        <h3 className="font-semibold text-muted-foreground text-sm">الوجه الأمامي</h3>
                                        <div
                                            className="bg-white shadow-xl relative overflow-hidden"
                                            style={{
                                                width: widthPx * scale,
                                                height: heightPx * scale,
                                            }}
                                        >
                                            {template.background_image_url && (
                                                <img src={template.background_image_url} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'fill', opacity: template.background_opacity ?? 1 }} />
                                            )}
                                            <div style={{ position: 'relative', zIndex: 1, transform: `scale(${scale})`, transformOrigin: 'top left', width: widthPx, height: heightPx }}>
                                                <style dangerouslySetInnerHTML={{ __html: customFonts.map(f => `@font-face { font-family: "${f.font_family}"; src: url("${f.file_url}"); }`).join("\n") }} />
                                                <div
                                                    style={{ position: 'relative', width: '100%', height: '100%' }}
                                                    dangerouslySetInnerHTML={{
                                                        __html: (template.html_content || '')
                                                            .replace(/\{\{name\}\}/g, 'اسم تجريبي')
                                                            .replace(/\{\{role\}\}/g, 'موظف')
                                                            .replace(/\{\{department\}\}/g, 'مصلحة')
                                                            .replace(/\{\{grade\}\}/g, 'رتبة')
                                                            .replace(/\{\{serial_number\}\}/g, '<span dir="ltr" style="unicode-bidi: isolate; font-family: \'Inter\', Arial, sans-serif;">DJS-CERT-2026-000001</span>')
                                                    }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <Dialog open={uploadFontOpen} onOpenChange={setUploadFontOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>رفع خط مخصص جديد</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>اسم الخط (للظهور في القائمة)</Label>
                            <Input placeholder="مثال: خط مؤسستي العريض" value={fontNameInput} onChange={e => setFontNameInput(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>ملف الخط (.ttf أو .woff)</Label>
                            <Input type="file" accept=".ttf,.woff,.woff2,.otf" onChange={e => setFontFile(e.target.files?.[0] || null)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUploadFontOpen(false)}>إلغاء</Button>
                        <Button onClick={handleUploadFont} disabled={uploadingFont || !fontNameInput || !fontFile}>
                            {uploadingFont && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            رفع وحفظ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
