import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { SearchableSelect } from "@/components/ui/searchable-select";

export function Step4Bank() {
    const t = useTranslations("employees");
    const tCommon = useTranslations("common");
    const { control } = useFormContext();

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">{t("steps.bank")}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={control}
                    name="bank_name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("fields.bankName")}</FormLabel>
                            <FormControl>
                                <SearchableSelect
                                    options={[
                                        { value: "حساب بريدي جاري", label: "حساب بريدي جاري (CCP)" },
                                        { value: "بنك الجزائر الخارجي", label: "بنك الجزائر الخارجي (BEA)" },
                                        { value: "القرض الشعبي الجزائري", label: "القرض الشعبي الجزائري (CPA)" },
                                        { value: "البنك الوطني الجزائري", label: "البنك الوطني الجزائري (BNA)" },
                                        { value: "بنك التنمية المحلية", label: "بنك التنمية المحلية (BDL)" },
                                        { value: "بنك الفلاحة والتنمية الريفية", label: "بنك الفلاحة والتنمية الريفية (BADR)" },
                                        { value: "بنك البركة", label: "بنك البركة" },
                                        { value: "بنك السلام", label: "بنك السلام" },
                                        { value: "بنك الخليج", label: "بنك الخليج" },
                                        { value: "سوسيتيه جنرال الجزائر", label: "سوسيتيه جنرال الجزائر" },
                                        { value: "بنك ABC الجزائر", label: "بنك ABC الجزائر" },
                                        { value: "أخرى", label: "أخرى" }
                                    ]}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    placeholder={t("fields.bankName")}
                                    searchPlaceholder={tCommon("search")}
                                    emptyMessage={tCommon("noResults")}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="bank_account"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("fields.bankAccount")}</FormLabel>
                            <FormControl>
                                <Input {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="social_security_number"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("fields.ssn")}</FormLabel>
                            <FormControl>
                                <Input {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="nif"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>الرقم الجبائي (NIF)</FormLabel>
                            <FormControl>
                                <Input {...field} value={field.value ?? ''} placeholder="مثال: 000028001234567" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>
    );
}
