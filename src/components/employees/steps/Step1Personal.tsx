"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, User } from "lucide-react";
import { ImageCropper } from "@/components/ui/image-cropper";
import { locationsApi, Wilaya, Municipality } from "@/lib/api/locations";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { TranslatableInput } from "@/components/ui/translatable-input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";


export function Step1Personal() {
    const t = useTranslations("employees.fields");
    const tOptions = useTranslations("employees.options");
    const { control, setValue, watch, register, trigger } = useFormContext();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [showCropper, setShowCropper] = useState(false);
    const [tempImage, setTempImage] = useState<string | null>(null);

    // Locations state
    const [wilayas, setWilayas] = useState<Wilaya[]>([]);
    const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
    const [loadingWilayas, setLoadingWilayas] = useState(false);
    const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);

    const profilePhoto = watch('profile_photo');
    const birthWilayaCode = watch('birth_wilaya_code');
    const isBirthDateEstimated = watch('is_birth_date_estimated');

    useEffect(() => {
        if (profilePhoto) {
            setPhotoPreview(profilePhoto);
        }
    }, [profilePhoto]);

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

    // Fetch Municipalities when Wilaya changes
    useEffect(() => {
        async function fetchMunicipalitiesData() {
            if (!birthWilayaCode) {
                setMunicipalities([]);
                return;
            }
            try {
                setLoadingMunicipalities(true);
                const data = await locationsApi.getMunicipalities(birthWilayaCode);
                setMunicipalities(data);
            } catch (error) {
                toast.error("فشل في تحميل قائمة البلديات");
            } finally {
                setLoadingMunicipalities(false);
            }
        }
        fetchMunicipalitiesData();
    }, [birthWilayaCode]);

    const wilayaOptions = wilayas.map(w => ({ value: w.code, label: `${w.code} - ${w.name_ar}` }));
    const municipalityOptions = municipalities.map(m => ({ value: m.id, label: m.name_ar }));

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('Please upload an image file');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('Max file size is 5MB');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setTempImage(reader.result as string);
                setShowCropper(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        return new Promise<void>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setPhotoPreview(base64String);
                setValue('profile_photo', base64String, { shouldDirty: true });
                setShowCropper(false);
                setTempImage(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                resolve();
            };
            reader.readAsDataURL(croppedBlob);
        });
    };

    const removePhoto = () => {
        setPhotoPreview(null);
        setValue('profile_photo', '', { shouldDirty: true });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Photo Upload Section */}
            <div className="flex flex-col items-center gap-4 p-6 bg-muted/50 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
                <div className="relative">
                    {photoPreview ? (
                        <div className="relative">
                            <img
                                src={photoPreview}
                                alt="Profile"
                                className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-md"
                            />
                            <button
                                type="button"
                                onClick={removePhoto}
                                className="absolute -top-1 -end-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors shadow-sm"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="w-32 h-32 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-inner">
                            <User className="h-16 w-16 text-slate-400" />
                        </div>
                    )}
                </div>

                <div className="text-center">
                    <Label htmlFor="photo-upload" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium">
                            <Upload className="h-4 w-4" />
                            <span>{photoPreview ? t("changePhoto") || "Change Photo" : t("uploadPhoto") || "Upload Photo"}</span>
                        </div>
                    </Label>
                    <Input
                        ref={fileInputRef}
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                        PNG, JPG, GIF max 5MB
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name - Translatable */}
                <FormField
                    control={control}
                    name="firstname_ar"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <TranslatableInput
                                    label={t("firstName")}
                                    required
                                    hideEnglish
                                    value={{
                                        ar: field.value || "",
                                        fr: watch('firstname_fr') || "",
                                    }}
                                    onChange={(v) => {
                                        field.onChange(v.ar);
                                        setValue('firstname_fr', v.fr);
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Last Name - Translatable */}
                <FormField
                    control={control}
                    name="lastname_ar"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <TranslatableInput
                                    label={t("lastName")}
                                    required
                                    hideEnglish
                                    value={{
                                        ar: field.value || "",
                                        fr: watch('lastname_fr') || "",
                                    }}
                                    onChange={(v) => {
                                        field.onChange(v.ar);
                                        setValue('lastname_fr', v.fr);
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Father and Mother Names */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={control}
                    name="father_name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("fatherName") || "اسم الأب"}</FormLabel>
                            <FormControl>
                                <Input {...field} value={field.value ?? ''} placeholder={t("fatherName") || "اسم الأب"} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="mother_fullname"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("motherFullname") || "اسم ولقب الأم"}</FormLabel>
                            <FormControl>
                                <Input {...field} value={field.value ?? ''} placeholder={t("motherFullname") || "اسم ولقب الأم"} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Personal Details */}
                <FormField
                    control={control}
                    name="national_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("nationalId")} <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    value={field.value ?? ''}
                                    maxLength={18}
                                    onChange={(e) => {
                                        // Allow only digits
                                        const val = e.target.value.replace(/\D/g, '');
                                        field.onChange(val);

                                        // Auto-detect gender
                                        if (val.length >= 2) {
                                            const genderDigit = val.charAt(1);
                                            if (genderDigit === '0') {
                                                setValue('gender', 'MALE', { shouldValidate: true });
                                            } else if (genderDigit === '1') {
                                                setValue('gender', 'FEMALE', { shouldValidate: true });
                                            }
                                        }

                                        // Auto-detect birth year
                                        if (val.length >= 5) {
                                            const yearSuffix = val.substring(2, 5); // Indices 2,3,4
                                            const century = yearSuffix.charAt(0) === '9' ? '1' : (yearSuffix.charAt(0) === '0' ? '2' : '');

                                            if (century) {
                                                const fullYear = century + yearSuffix;
                                                const currentBirthDate = watch('birth_date');

                                                if (currentBirthDate) {
                                                    // Preserve month/day
                                                    const parts = currentBirthDate.split('-');
                                                    if (parts.length === 3) {
                                                        const newDate = `${fullYear}-${parts[1]}-${parts[2]}`;
                                                        setValue('birth_date', newDate, { shouldValidate: true });
                                                    }
                                                } else {
                                                    // Default to Jan 1st
                                                    setValue('birth_date', `${fullYear}-01-01`, { shouldValidate: true });
                                                }
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
                    name="birth_date"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center justify-between">
                                <FormLabel>{t("birthDate")} <span className="text-destructive">*</span></FormLabel>
                                <FormField
                                    control={control}
                                    name="is_birth_date_estimated"
                                    render={({ field: checkboxField }) => (
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id="estimated-date"
                                                checked={checkboxField.value}
                                                onCheckedChange={(checked) => {
                                                    checkboxField.onChange(checked);
                                                    // Reset birth date if switching modes to avoid confusion
                                                    if (checked) {
                                                        // If switching to estimated, try to keep the year if date exists
                                                        const currentDate = field.value;
                                                        if (currentDate) {
                                                            const year = currentDate.split('-')[0];
                                                            field.onChange(`${year}-01-01`);
                                                        }
                                                    }
                                                }}
                                            />
                                            <label
                                                htmlFor="estimated-date"
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                                {t("birthDateEstimated")}
                                            </label>
                                        </div>
                                    )}
                                />
                            </div>

                            {isBirthDateEstimated ? (
                                <Select
                                    value={field.value ? field.value.split('-')[0] : ""}
                                    onValueChange={(year) => {
                                        field.onChange(`${year}-01-01`);
                                        trigger("national_id");
                                    }}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="اختر سنة الميلاد" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="max-h-60">
                                        {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 18 - i).map((year) => (
                                            <SelectItem key={year} value={year.toString()}>
                                                {year}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <FormControl>
                                    <DateTimePicker
                                        value={field.value || ""}
                                        onChange={(value) => {
                                            field.onChange(value);
                                            trigger("national_id");
                                        }}
                                        placeHolder={t("birthDate")}
                                    />
                                </FormControl>
                            )}
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Birth Place - Wilaya */}
                <FormField
                    control={control}
                    name="birth_wilaya_code"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("birthWilaya")} <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                                <SearchableSelect
                                    options={wilayaOptions}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    placeholder={t("birthWilaya")}
                                    searchPlaceholder="بحث..."
                                    emptyMessage="لا توجد نتائج"
                                    disabled={loadingWilayas}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Birth Place - Municipality */}
                <FormField
                    control={control}
                    name="birth_municipality_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("birthMunicipality")} <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                                <SearchableSelect
                                    options={municipalityOptions}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    placeholder={t("birthMunicipality")}
                                    searchPlaceholder="بحث..."
                                    emptyMessage="لا توجد نتائج"
                                    disabled={!birthWilayaCode || loadingMunicipalities}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="gender"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("gender")} <span className="text-destructive">*</span></FormLabel>
                            <Select
                                onValueChange={(val) => {
                                    field.onChange(val);
                                    trigger("national_id");
                                }}
                                value={field.value}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("gender")} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="MALE">{tOptions("gender.MALE")}</SelectItem>
                                    <SelectItem value="FEMALE">{tOptions("gender.FEMALE")}</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="marital_status"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("maritalStatus")} <span className="text-destructive">*</span></FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("maritalStatus")} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="SINGLE">{tOptions("maritalStatus.SINGLE")}</SelectItem>
                                    <SelectItem value="MARRIED">{tOptions("maritalStatus.MARRIED")}</SelectItem>
                                    <SelectItem value="DIVORCED">{tOptions("maritalStatus.DIVORCED")}</SelectItem>
                                    <SelectItem value="WIDOWED">{tOptions("maritalStatus.WIDOWED")}</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {/* Children Count - Only show if not single */}
                {watch('marital_status') && watch('marital_status') !== 'SINGLE' && (
                    <FormField
                        control={control}
                        name="children_count"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("childrenCount")}</FormLabel>
                                <FormControl>
                                    <Input type="number" min="0" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </div>

            {/* Image Cropper Dialog */}
            {showCropper && tempImage && (
                <ImageCropper
                    open={showCropper}
                    onOpenChange={(open) => {
                        setShowCropper(open);
                        if (!open) {
                            setTempImage(null);
                            if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                            }
                        }
                    }}
                    imageSrc={tempImage}
                    onCropComplete={handleCropComplete}
                    aspect={1}
                />
            )}
        </div>
    );
}
