"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";

export default function SettingsPage() {
    const t = useTranslations("settings");

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <Card>
                <CardHeader>
                    <CardTitle>{t("general.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{t("general.desc")}</p>
                </CardContent>
            </Card>
        </div>
    );
}
