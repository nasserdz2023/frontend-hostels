"use client";

import * as React from "react";
import { Languages } from "lucide-react";
import { useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface TranslatableInputProps {
    label: string;
    value: { ar: string; fr?: string; en?: string };
    onChange: (value: { ar: string; fr: string; en: string }) => void;
    placeholder?: string;
    className?: string;
    required?: boolean;
    helperText?: string;
    hideEnglish?: boolean;
}

export function TranslatableInput({
    label,
    value,
    onChange,
    placeholder,
    className,
    required = false,
    helperText,
    hideEnglish = false,
}: TranslatableInputProps) {
    const locale = useLocale();
    const [isOpen, setIsOpen] = React.useState(false);

    // Determine which value to show in the main input based on current locale
    const displayValue = React.useMemo(() => {
        if (locale === "ar") return value.ar;
        if (locale === "fr") return value.fr || "";
        if (locale === "en") return value.en || "";
        return value.ar;
    }, [locale, value]);

    const handleMainInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        onChange({
            ar: locale === "ar" ? newValue : value.ar,
            fr: locale === "fr" ? newValue : (value.fr || ""),
            en: locale === "en" ? newValue : (value.en || ""),
        });
    };

    const handleDialogChange = (lang: "ar" | "fr" | "en", text: string) => {
        onChange({
            ar: value.ar,
            fr: value.fr || "",
            en: value.en || "",
            [lang]: text,
        });
    };

    const languageNames = {
        ar: { ar: "العربية", fr: "Arabe", en: "Arabic" },
        fr: { ar: "الفرنسية", fr: "Français", en: "French" },
        en: { ar: "الإنجليزية", fr: "Anglais", en: "English" }
    };

    // Determine the label language suffix
    const currentLangLabel = languageNames[locale as keyof typeof languageNames]?.[locale as keyof typeof languageNames['ar']] || locale;

    return (
        <div className={cn("space-y-2", className)}>
            <Label>
                {label} ({currentLangLabel}) {required && <span className="text-destructive">*</span>}
            </Label>
            <div className="relative flex items-center">
                <Input
                    value={displayValue}
                    onChange={handleMainInputChange}
                    placeholder={placeholder}
                    className={cn(locale === "ar" ? "ps-10" : "pe-10")}
                    dir={locale === "ar" ? "rtl" : "ltr"}
                />
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "absolute h-7 w-7 hover:text-primary",
                                required ? "text-destructive" : "text-muted-foreground",
                                locale === "ar" ? "start-1" : "end-1"
                            )}
                        >
                            <Languages className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Languages className="h-5 w-5" />
                                {label} - Translations
                            </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Arabic (العربية)</Label>
                                <Input
                                    value={value.ar}
                                    onChange={(e) => handleDialogChange("ar", e.target.value)}
                                    dir="rtl"
                                    placeholder="النص بالعربية"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>French (Français)</Label>
                                <Input
                                    value={value.fr || ""}
                                    onChange={(e) => handleDialogChange("fr", e.target.value)}
                                    dir="ltr"
                                    placeholder="Texte en Français"
                                />
                            </div>
                            {!hideEnglish && (
                                <div className="space-y-2">
                                    <Label>English (English)</Label>
                                    <Input
                                        value={value.en || ""}
                                        onChange={(e) => handleDialogChange("en", e.target.value)}
                                        dir="ltr"
                                        placeholder="Text in English"
                                    />
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
            {helperText && (
                <p className="text-[0.8rem] text-muted-foreground pt-1">
                    {helperText}
                </p>
            )}
        </div>
    );
}
