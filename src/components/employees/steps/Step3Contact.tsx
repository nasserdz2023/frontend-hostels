"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { locationsApi, Wilaya, Municipality } from "@/lib/api/locations";
import { employeesApi } from "@/lib/api/employees";
import { toast } from "sonner";

export function Step3Contact() {
    const t = useTranslations("employees");
    const tOptions = useTranslations("employees.options");
    const { control, watch, setValue, clearErrors } = useFormContext();

    const relationships = ['FATHER', 'MOTHER', 'HUSBAND', 'WIFE', 'SON', 'DAUGHTER', 'BROTHER', 'SISTER', 'OTHER'];

    // Location state for city (municipality)
    const [wilayas, setWilayas] = useState<Wilaya[]>([]);
    const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
    const [loadingWilayas, setLoadingWilayas] = useState(false);
    const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);

    // Watch wilaya_code from form state
    const selectedWilaya = watch("wilaya_code");

    // Fetch Wilayas
    useEffect(() => {
        async function fetchWilayasData() {
            try {
                setLoadingWilayas(true);
                const data = await locationsApi.getWilayas();
                setWilayas(data);
            } catch (error) {
                toast.error("فشل في تحميل قائمة الولايات");
            } finally {
                setLoadingWilayas(false);
            }
        }
        fetchWilayasData();
    }, []);

    // Effect to set default Wilaya from Env if not set
    useEffect(() => {
        if (wilayas.length > 0 && !selectedWilaya) {
            const defaultCode = process.env.NEXT_PUBLIC_DEFAULT_WILAYA_CODE;
            if (defaultCode && wilayas.some(w => w.code === defaultCode)) {
                setValue("wilaya_code", defaultCode);
            }
        }
    }, [wilayas, selectedWilaya, setValue]);

    // Fetch Municipalities when Wilaya changes
    useEffect(() => {
        async function fetchMunicipalitiesData() {
            if (!selectedWilaya) {
                setMunicipalities([]);
                return;
            }
            try {
                setLoadingMunicipalities(true);
                const data = await locationsApi.getMunicipalities(selectedWilaya);
                setMunicipalities(data);
            } catch (error) {
                toast.error("فشل في تحميل قائمة البلديات");
            } finally {
                setLoadingMunicipalities(false);
            }
        }
        fetchMunicipalitiesData();
    }, [selectedWilaya]);

    const wilayaOptions = wilayas.map(w => ({ value: w.code, label: `${w.code} - ${w.name_ar}` }));
    const municipalityOptions = municipalities.map(m => ({ value: m.name_ar, label: m.name_ar }));

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">{t("steps.contact")}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={control}
                    name="mobile"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("fields.mobile")} <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    value={field.value ?? ''}
                                    placeholder="07 XX XX XX XX"
                                    maxLength={10}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        field.onChange(val);
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("fields.email")} <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    type="email"
                                    onBlur={async (e) => {
                                        field.onBlur();
                                        if (e.target.value) {
                                            try {
                                                const result = await employeesApi.checkExistence('email', e.target.value);
                                                if (result.exists) {
                                                    control.setError("email", {
                                                        type: "manual",
                                                        message: result.message || "البريد الإلكتروني مستخدم بالفعل"
                                                    });
                                                } else {
                                                    // Clear error if it was previously set and now the email is unique
                                                    if (control.getFieldState("email").error) {
                                                        clearErrors("email");
                                                    }
                                                }
                                            } catch (err) {
                                                // Silently handle uniqueness check failure
                                            }
                                        }
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="address"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("fields.address")}</FormLabel>
                            <FormControl>
                                <Input {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Wilaya Selection for City */}
                <FormItem>
                    <FormLabel>{t("fields.wilaya") || "الولاية"}</FormLabel>
                    <SearchableSelect
                        options={wilayaOptions}
                        value={selectedWilaya}
                        onValueChange={(val) => {
                            setValue("wilaya_code", val);
                            setValue("city", ""); // Reset municipality when wilaya changes
                        }}
                        placeholder={t("fields.wilaya") || "اختر الولاية"}
                        searchPlaceholder="بحث..."
                        emptyMessage="لا توجد نتائج"
                        disabled={loadingWilayas}
                    />
                </FormItem>

                {/* Municipality as City */}
                <FormField
                    control={control}
                    name="city"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("fields.city")}</FormLabel>
                            <FormControl>
                                <SearchableSelect
                                    options={municipalityOptions}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    placeholder={t("fields.city")}
                                    searchPlaceholder="بحث..."
                                    emptyMessage={!selectedWilaya ? "اختر الولاية أولاً" : "لا توجد نتائج"}
                                    disabled={!selectedWilaya || loadingMunicipalities}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">{t("sections.emergencyContact")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={control}
                        name="emergency_contact_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("fields.emergencyContactName")}</FormLabel>
                                <FormControl>
                                    <Input {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="emergency_contact_phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("fields.emergencyContactPhone")}</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        value={field.value ?? ''}
                                        maxLength={10}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            field.onChange(val);
                                        }}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="emergency_contact_relationship"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("fields.emergencyContactRelationship")}</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t("fields.emergencyContactRelationship")} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {relationships.map((rel) => (
                                            <SelectItem key={rel} value={rel}>
                                                {tOptions(`relationships.${rel.toUpperCase()}`)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>
        </div>
    );
}
