"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { districtsApi, District } from "@/lib/api/districts";
import { locationsApi, Municipality } from "@/lib/api/locations";
import { municipalitiesApi } from "@/lib/api/municipalities";
import { getErrorMessage } from "@/lib/api/client";
import { useSettingsStore } from "@/lib/stores/settings";

const formSchema = z.object({
    name_ar: z.string().min(2, "Required"),
    name_fr: z.string().optional(),
    wilaya_code: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export default function DistrictsPage() {
    const t = useTranslations("employees.districts");
    const tCommon = useTranslations("common");
    const defaultWilayaCode = useSettingsStore(s => s.getDefaultWilayaCode());

    const [districts, setDistricts] = useState<District[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Dialog states
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete states
    const [districtToDelete, setDistrictToDelete] = useState<District | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name_ar: "",
            name_fr: "",
            wilaya_code: defaultWilayaCode,
        },
    });

    const fetchDistricts = async () => {
        setIsLoading(true);
        try {
            const data = await districtsApi.getAll();
            setDistricts(data);
        } catch (error) {
            toast.error(tCommon("error"));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDistricts();
    }, []);

    const handleOpenDialog = (district?: District) => {
        if (district) {
            setEditingDistrict(district);
            form.reset({
                name_ar: district.name_ar,
                name_fr: district.name_fr || "",
                wilaya_code: district.wilaya_code || defaultWilayaCode,
            });
        } else {
            setEditingDistrict(null);
            form.reset({
                name_ar: "",
                name_fr: "",
                wilaya_code: defaultWilayaCode,
            });
        }
        setIsDialogOpen(true);
    };

    const onSubmit = async (values: FormValues) => {
        setIsSubmitting(true);
        try {
            if (editingDistrict) {
                await districtsApi.update(editingDistrict.id, values);
                toast.success(tCommon("success"));
            } else {
                await districtsApi.create(values);
                toast.success(tCommon("success"));
            }
            setIsDialogOpen(false);
            fetchDistricts();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!districtToDelete) return;
        try {
            await districtsApi.delete(districtToDelete.id);
            toast.success(tCommon("success"));
            setDistrictToDelete(null);
            fetchDistricts();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const filteredDistricts = districts.filter(d =>
        d.name_ar.includes(searchQuery) || (d.name_fr && d.name_fr.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Municipalities Management
    const [isMuniDialogOpen, setIsMuniDialogOpen] = useState(false);
    const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
    const [wilayaMunicipalities, setWilayaMunicipalities] = useState<Municipality[]>([]);
    const [selectedMuniIds, setSelectedMuniIds] = useState<Set<string>>(new Set());
    const [isSavingMuni, setIsSavingMuni] = useState(false);

    const handleOpenMuniDialog = async (district: District) => {
        setSelectedDistrict(district);
        // Initialize with currently assigned municipalities
        const currentIds = new Set(district.municipalities?.map(m => m.id) || []);
        setSelectedMuniIds(currentIds);

        // Fetch all municipalities for this wilaya
        try {
            // Need to import getMunicipalities
            const munis = await locationsApi.getMunicipalities(district.wilaya_code || defaultWilayaCode);
            setWilayaMunicipalities(munis);
            setIsMuniDialogOpen(true);
        } catch (error) {
            toast.error(tCommon("error"));
        }
    };

    const toggleMuniSelection = (muniId: string) => {
        setSelectedMuniIds(prev => {
            const next = new Set(prev);
            if (next.has(muniId)) {
                next.delete(muniId);
            } else {
                next.add(muniId);
            }
            return next;
        });
    };

    const handleSaveMunicipalities = async () => {
        if (!selectedDistrict) return;
        setIsSavingMuni(true);
        try {
            const originalIds = new Set(selectedDistrict.municipalities?.map(m => m.id) || []);

            // Find added
            const added = Array.from(selectedMuniIds).filter(id => !originalIds.has(id));
            // Find removed
            const removed = Array.from(originalIds).filter(id => !selectedMuniIds.has(id));

            // Execute updates
            // Using promise all for concurrency
            const updates = [
                ...added.map(id => municipalitiesApi.update(id, { district_id: selectedDistrict.id })),
                ...removed.map(id => municipalitiesApi.update(id, { district_id: null }))
            ];

            await Promise.all(updates);

            toast.success(tCommon("success"));
            setIsMuniDialogOpen(false);
            fetchDistricts();
        } catch (error) {
            toast.error(tCommon("error"));
        } finally {
            setIsSavingMuni(false);
        }
    };

    return (
        <div className="container py-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                    <p className="text-muted-foreground">{t("subtitle")}</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="me-2 h-4 w-4" />
                    {t("add")}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>{t("title")}</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground rtl:end-2 rtl:start-auto" />
                            <Input
                                placeholder={tCommon("search")}
                                className="ps-8 rtl:pe-8 rtl:ps-4"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("nameAr")}</TableHead>
                                    <TableHead>{t("nameFr")}</TableHead>
                                    <TableHead>البلديات</TableHead>
                                    <TableHead className="text-end">{tCommon("actions.label")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDistricts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            {tCommon("noResults")}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredDistricts.map((district) => (
                                        <TableRow key={district.id}>
                                            <TableCell className="font-medium">{district.name_ar}</TableCell>
                                            <TableCell>{district.name_fr || "-"}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {district.municipalities && district.municipalities.length > 0 ? (
                                                        district.municipalities.map(m => (
                                                            <span key={m.id} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                                                {m.name_ar}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">-</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-end">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleOpenMuniDialog(district)}>
                                                        البلديات
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(district)}>
                                                        <Pencil className="h-4 w-4 text-blue-500" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => setDistrictToDelete(district)}>
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingDistrict ? t("edit") : t("add")}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name_ar"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("nameAr")}</FormLabel>
                                        <FormControl>
                                            <Input {...field} dir="rtl" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="name_fr"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("nameFr")}</FormLabel>
                                        <FormControl>
                                            <Input {...field} dir="ltr" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    {tCommon("cancel")}
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                    {tCommon("save")}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Municipalities Management Dialog */}
            <Dialog open={isMuniDialogOpen} onOpenChange={setIsMuniDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>تخصيص البلديات</DialogTitle>
                        <CardDescription>
                            تحديد البلديات التابعة لدائرة {selectedDistrict?.name_ar}
                        </CardDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2 max-h-[300px] overflow-y-auto">
                        {wilayaMunicipalities.length === 0 ? (
                            <p className="text-center text-muted-foreground p-4">لا توجد بلديات متاحة</p>
                        ) : (
                            wilayaMunicipalities.map(muni => (
                                <div key={muni.id} className="flex items-center space-x-2 space-x-reverse p-2 hover:bg-slate-50 rounded border">
                                    <div className="flex items-center h-5">
                                        <input
                                            id={`muni-${muni.id}`}
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            checked={selectedMuniIds.has(muni.id)}
                                            onChange={() => toggleMuniSelection(muni.id)}
                                            // Disable if assigned to ANOTHER district (not this one)
                                            disabled={!!muni.district_id && muni.district_id !== selectedDistrict?.id && !selectedMuniIds.has(muni.id)}
                                        />
                                    </div>
                                    <label htmlFor={`muni-${muni.id}`} className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none">
                                        {muni.name_ar}
                                        {muni.district_id && muni.district_id !== selectedDistrict?.id && (
                                            <span className="text-xs text-red-500 me-2">(مخصصة لدائرة أخرى)</span>
                                        )}
                                    </label>
                                </div>
                            ))
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsMuniDialogOpen(false)}>
                            {tCommon("cancel")}
                        </Button>
                        <Button onClick={handleSaveMunicipalities} disabled={isSavingMuni}>
                            {isSavingMuni && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                            {tCommon("save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!districtToDelete} onOpenChange={(open) => !open && setDistrictToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{tCommon("confirmDelete")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("deleteConfirm")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            {tCommon("delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
