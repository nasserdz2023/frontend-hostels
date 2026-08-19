"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserPlus, Mail, Shield } from "lucide-react";
import { usersApi } from "@/lib/api/users";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";

export function Step5Account() {
    const t = useTranslations("employees");
    const { control, watch, setValue } = useFormContext();
    const createAccount = watch("create_user_account");

    // Roles state
    const [roles, setRoles] = useState<any[]>([]);
    const [rolesLoading, setRolesLoading] = useState(false);

    // Fetch roles when component mounts
    useEffect(() => {
        const loadRoles = async () => {
            setRolesLoading(true);
            try {
                // Fetch RBAC roles (which have IDs)
                const data = await usersApi.getRolesList();

                const roleOptions = data.map((r: any) => ({
                    // Valid fallback: name_ar -> name -> translation?
                    // Since backend returns "name", we should rely on that or handle translation in frontend if needed.
                    // For now, assume "name" is English system name if description is missing.
                    label: r.name_ar || r.name,
                    value: r.id
                }));
                setRoles(roleOptions);

                // Set default role to "Employee" if not set
                const employeeRole = data.find((r: any) => {
                    const name = (r.name || '').toLowerCase();
                    const nameEn = (r.name_en || '').toLowerCase();
                    return name === 'employee' || nameEn === 'employee';
                });

                if (employeeRole) {
                    const currentRole = watch('user_role_id');
                    if (!currentRole) {
                        setValue('user_role_id', employeeRole.id);
                    }
                }
            } catch (error) {
                toast.error("فشل في تحميل الأدوار");
            } finally {
                setRolesLoading(false);
            }
        };
        loadRoles();
    }, [setValue, watch]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Create Account Toggle */}
            <FormField
                control={control}
                name="create_user_account"
                render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-x-4 bg-card p-4 rounded-lg border">
                        <div className="flex flex-col space-y-1">
                            <FormLabel className="text-base font-medium">
                                {t("messages.createUserAccount")}
                            </FormLabel>
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                {t("messages.createUserAccountDesc")}
                            </span>
                        </div>
                        <FormControl>
                            <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        </FormControl>
                    </FormItem>
                )}
            />

            {createAccount && (
                <div className="space-y-4 pt-4 border-t">

                    {/* Role Selection */}
                    <div className="bg-card p-4 rounded-lg border space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Shield className="h-5 w-5 text-primary" />
                            <h3 className="font-medium">صلاحيات المستخدم</h3>
                        </div>

                        <FormField
                            control={control}
                            name="user_role_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>الدور (الصلاحيات) <span className="text-destructive">*</span></FormLabel>
                                    <FormControl>
                                        <SearchableSelect
                                            options={roles}
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            placeholder="اختر الدور..."
                                            searchPlaceholder="بحث عن دور..."
                                            emptyMessage="لا يوجد أدوار"
                                            disabled={rolesLoading}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Alert className="bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800">
                            <UserPlus className="h-4 w-4 text-blue-500" />
                            <AlertTitle className="text-blue-700 dark:text-blue-300">توليد تلقائي</AlertTitle>
                            <AlertDescription className="text-blue-600 dark:text-blue-400 text-sm mt-1">
                                سيتم إنشاء حساب مستخدم للموظف تلقائياً باستخدام بريده الإلكتروني كاسم مستخدم.
                            </AlertDescription>
                        </Alert>
                        <Alert className="bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800">
                            <Mail className="h-4 w-4 text-green-500" />
                            <AlertTitle className="text-green-700 dark:text-green-300">إرسال كلمة المرور</AlertTitle>
                            <AlertDescription className="text-green-600 dark:text-green-400 text-sm mt-1">
                                سيتم توليد كلمة مرور آمنة وإرسالها إلى البريد الإلكتروني الخاص بالموظف.
                            </AlertDescription>
                        </Alert>
                    </div>
                </div>
            )}
        </div>
    );
}
