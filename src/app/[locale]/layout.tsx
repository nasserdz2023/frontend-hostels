import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, defaultLocale } from "@/i18n";
import { Tajawal, Inter } from "next/font/google";
import Providers from "@/providers";

import "../globals.css";

const tajawal = Tajawal({
    subsets: ["arabic", "latin"],
    variable: "--font-tajawal",
    display: "swap",
    weight: ["200", "300", "400", "500", "700", "800", "900"],
});

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
    weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "common" });

    return {
        title: "DJS - إدارة المخيمات الشبابية",
        description: t("description") || "نظام إدارة المخيمات الشبابية - مديرية الشباب والرياضة",
    };
}

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    // Validate locale
    if (!locales.includes(locale as any)) {
        notFound();
    }

    const messages = await getMessages();

    return (
        <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} suppressHydrationWarning>
            <body className={`${tajawal.variable} ${inter.variable} antialiased`}>
                <Providers>
                    <NextIntlClientProvider messages={messages}>
                        {children}
                    </NextIntlClientProvider>
                </Providers>
            </body>
        </html>
    );
}
