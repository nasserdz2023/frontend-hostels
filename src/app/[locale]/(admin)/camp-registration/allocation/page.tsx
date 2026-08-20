"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { campRegistrationApi } from "@/lib/api/camp-registration";
import { campTripsApi, SimulationResult } from "@/lib/api/camp-trips";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Brain, Wand2, Users, MapPin, CalendarDays, Clock, Play, RotateCcw, Save, CheckCircle2, AlertCircle, Loader2, BarChart3, Layers, Gauge, Sparkles, Scale } from "lucide-react";
import { Link } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import { locationsApi } from "@/lib/api/locations";
import { Municipality } from "@/lib/api/locations";
import { deduplicateChildren, calculateAge, getAgeGroup, getAgeGroups, normalizeGender } from "@/lib/camp-allocation-utils";
import { PermissionGuard } from "@/hooks/useRequirePermission";

export default function SmartAllocationPage() {
 const t = useTranslations("camp-registration");
 const locale = useLocale();
 const [totalChildren, setTotalChildren] = useState(350);
 const [childrenPerBatch, setChildrenPerBatch] = useState(50);
 const [scoutsQuota, setScoutsQuota] = useState(10);
 const [associationsQuota, setAssociationsQuota] = useState(10);
 const [institutionsQuota, setInstitutionsQuota] = useState(0);
 const [enableStandby, setEnableStandby] = useState(false);
 const [standbyCountPerBatch, setStandbyCountPerBatch] = useState(5);
 const [firstBatchDate, setFirstBatchDate] = useState("2026-07-15");
  const [daysBetweenBatches, setDaysBetweenBatches] = useState(10);

  // Weights
  const [genderMale, setGenderMale] = useState([50]);

  const [selectedAgeGroups, setSelectedAgeGroups] = useState<Record<string, boolean>>({
   'under_6': false,
   '6_14': true,
   '15_17': true,
   'over_17': false
  });

  // === New lottery configuration fields ===
  const [enableSmallMunProtection, setEnableSmallMunProtection] = useState(true);
  const [smallMunThreshold, setSmallMunThreshold] = useState(10);
  const [minChildrenPerBatch, setMinChildrenPerBatch] = useState(4);
  const [maxChildrenPerBatch, setMaxChildrenPerBatch] = useState(15);
  const [reunificationSlots, setReunificationSlots] = useState(5);
  const [minFemalesPerBatch, setMinFemalesPerBatch] = useState(5);

  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [municipalityMap, setMunicipalityMap] = useState<Record<string, string>>({});
  const [selectedMunicipalityIds, setSelectedMunicipalityIds] = useState<string[]>([]);
  const [municipalityNameMap, setMunicipalityNameMap] = useState<Record<string, string>>({});

 // Statistics
 const [registeredStats, setRegisteredStats] = useState<Record<string, { male: number, female: number }>>({});

 useEffect(() => {
  const fetchMunicipalities = async () => {
   try {
    // جلب البلديات المسموح الانتقاء منها (التي فيها أطفال SUCCESS)
    const [muns, availableMuns] = await Promise.all([
     locationsApi.getMunicipalities(),
     campTripsApi.getAvailableMunicipalities().then(r => r.data).catch(() => null),
    ]);
    
    // بناء مجموعة IDs البلديات المتاحة
    const availableIds = new Set(availableMuns?.map((m: { id: string }) => m.id) || []);
    
    // تصفية البلديات: فقط المتاحة
    const filteredMuns = availableIds.size > 0
     ? muns.filter(m => availableIds.has(m.id))
     : muns;
    
    setMunicipalities(filteredMuns);
    const idToName: Record<string, string> = {};
    const nameToId: Record<string, string> = {};
    filteredMuns.forEach(m => {
     idToName[m.id] = locale === 'ar' ? m.name_ar : (locale === 'fr' ? (m.name_fr || m.name_ar) : (m.name_en || m.name_ar));
     nameToId[m.id] = m.id;
     // Build name->ID mappings for reverse lookup
     nameToId[m.name_ar] = m.id;
     if (m.name_fr) nameToId[m.name_fr] = m.id;
     if (m.name_en) nameToId[m.name_en] = m.id;
    });
    setMunicipalityMap(nameToId);
    setMunicipalityNameMap(idToName);
    setSelectedMunicipalityIds(filteredMuns.map(m => m.id));
   } catch (err) {
    console.error("Failed to fetch municipalities", err);
   }
  };
  fetchMunicipalities();
 }, [locale]);

 useEffect(() => {
  const fetchStats = async () => {
   try {
    let allChildren: any[] = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
     const response = await campRegistrationApi.searchChildren(undefined, currentPage, 1000);
     const items = response.data.items || [];
     allChildren = [...allChildren, ...items];
     
     if (items.length < 1000 || allChildren.length >= 10000) {
      hasMore = false;
     } else {
      currentPage++;
     }
    }
    
    const children = deduplicateChildren(allChildren);
    const stats: Record<string, { male: number, female: number }> = {
     'under_6': { male: 0, female: 0 },
     '6_14': { male: 0, female: 0 },
     '15_17': { male: 0, female: 0 },
     'over_17': { male: 0, female: 0 }
    };
    
    children.forEach((c: any) => {
     if (!c.birth_date) return;
     const age = calculateAge(c.birth_date);
     const isMale = normalizeGender(c.gender) === 'male';
     
     const groupId = getAgeGroup(age);

     if (isMale) stats[groupId].male++;
     else stats[groupId].female++;
    });
    
    setRegisteredStats(stats);
   } catch (err) {
    console.error(err);
   }
  };
  fetchStats();
 }, []);
 
 // Simulation State
 const [isSimulating, setIsSimulating] = useState(false);
 const [simulationResult, setSimulationResult] = useState<any>(null);
 const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSaveBatches = async () => {
   if (!simulationResult || !simulationResult.batches) return;
   
   setIsSaving(true);
   const loadingToast = toast.loading(t('saving_toast'));
   
   try {
    const mapChild = (c: any, isStandby: boolean) => ({
     child_id: c.id,
     member_type: 'main' as const,
     is_standby: isStandby,
     first_name: c.name?.split(' ')[0] || '',
     last_name: c.name?.split(' ').slice(1).join(' ') || '',
     gender: c.gender,
     municipality: c.municipality,
    });

    for (let i = 0; i < simulationResult.batches.length; i++) {
     const batch = simulationResult.batches[i];
     
     const mainChildren = batch.children.filter((c: any) => !c.isStandby).map((c: any) => mapChild(c, false));
     const standbyChildren = batch.children.filter((c: any) => c.isStandby).map((c: any) => mapChild(c, true));
     
     await campTripsApi.createTrip({
      name: batch.name,
      description: `دفعة ذكية من نظام التوزيع (تتضمن ${batch.smartCount} من المديرية و ${batch.scoutsQuota} كشافة و ${batch.associationsQuota} جمعيات و ${batch.institutionsQuota} مؤسسات و ${batch.standbyCount} احتياط)`,
      capacity: batch.count,
      scouts_quota: batch.scoutsQuota,
      associations_quota: batch.associationsQuota,
      institutions_quota: batch.institutionsQuota,
      start_date: batch.startDate,
      members: [...mainChildren, ...standbyChildren]
     });
    }
    
    toast.dismiss(loadingToast);
    toast.success(t('success_saved'));
    router.push("/camp-trips");
   } catch (error) {
    console.error("Failed to save trips", error);
    toast.dismiss(loadingToast);
    toast.error(t('error_save_failed'));
   } finally {
    setIsSaving(false);
   }
  };

  const runSimulation = useCallback(async () => {
   setIsSimulating(true);
   setError(null);

   try {
    // Prepare the request payload matching the API interface
    const request = {
      total_children: totalChildren,
      children_per_batch: childrenPerBatch,
      scouts_quota: scoutsQuota,
      associations_quota: associationsQuota,
      institutions_quota: institutionsQuota,
      enable_standby: enableStandby,
      standby_count_per_batch: standbyCountPerBatch,
      first_batch_date: firstBatchDate,
      days_between_batches: daysBetweenBatches,
      gender_male_percentage: genderMale[0],
      selected_age_groups: selectedAgeGroups,
      selected_municipality_ids: selectedMunicipalityIds,
      // New fields
      enable_small_mun_protection: enableSmallMunProtection,
      small_mun_threshold: smallMunThreshold,
      min_children_per_batch: minChildrenPerBatch,
      max_children_per_batch: maxChildrenPerBatch,
      reunification_slots: reunificationSlots,
      min_females_per_batch: minFemalesPerBatch,
    };

    const response = await campTripsApi.simulateAllocation(request);
    const data: SimulationResult = response.data;

    if (!data.success) {
      throw new Error(t('simulation_failed'));
    }

    // Transform API snake_case response to camelCase format expected by the UI
    const transformedBatches = data.batches.map((batch: any) => ({
      id: batch.id,
      name: batch.name,
      count: batch.count,
      smartCount: batch.smart_count,
      reservedCount: batch.reserved_count,
      scoutsQuota: batch.scouts_quota,
      associationsQuota: batch.associations_quota,
      institutionsQuota: batch.institutions_quota,
      standbyCount: batch.standby_count,
      startDate: batch.start_date,
      stats: batch.stats,
      imbalanceReasons: batch.imbalance_reasons || [],
      children: batch.children.map((child: any) => ({
        id: child.id,
        name: child.name,
        gender: child.gender,
        age: child.age,
        municipality: child.municipality,
        isSibling: false,
        siblingStyling: null,
        isStandby: child.is_standby,
        familyKey: child.family_key,
        imbalanceReason: child.imbalance_reason,
        _raw: {},
      }))
    }));

    // Transform overall_mun_stats keys to use municipality display names
    const overallMunStats: Record<string, { registered: number; distributed: number }> = {};
    Object.entries(data.overall_mun_stats || {}).forEach(([munKey, stats]: [string, any]) => {
      const displayName = municipalityNameMap[munKey] || munKey;
      overallMunStats[displayName] = stats;
    });

    setSimulationResult({
      batches: transformedBatches,
      overallMunStats,
      reunificationLog: data.reunification_log || [],
    });
  } catch (err: any) {
    console.error('Simulation failed:', err);
    setError(err?.message || t('simulation_failed'));
    toast.error(err?.message || t('simulation_failed'));
  } finally {
    setIsSimulating(false);
  }
 }, [
  totalChildren, childrenPerBatch, scoutsQuota, associationsQuota,
  institutionsQuota, enableStandby, standbyCountPerBatch,
  firstBatchDate, daysBetweenBatches,
  genderMale, selectedAgeGroups,
  selectedMunicipalityIds,
  enableSmallMunProtection, smallMunThreshold,
  minChildrenPerBatch, maxChildrenPerBatch,
  reunificationSlots, minFemalesPerBatch, municipalityNameMap, t
 ]);

 const calculatedBatchCount = childrenPerBatch > 0 ? Math.ceil(totalChildren / childrenPerBatch) : 0;
 let lastBatchDate = "";
 if (calculatedBatchCount > 0 && firstBatchDate) {
  const d = new Date(firstBatchDate);
  d.setDate(d.getDate() + ((calculatedBatchCount - 1) * daysBetweenBatches));
  lastBatchDate = d.toISOString().split('T')[0];
 }


 return (
 <PermissionGuard module="camp_registration" action="view">
      

     <div className="space-y-6 pb-20 max-w-[1600px] mx-auto">
   {/* Header */}
   <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-white/60 backdrop-blur-xl border border-white/60 rounded-3xl shadow-sm relative overflow-hidden">
    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
    <div className="flex items-center gap-4 relative z-10">
     <Link href="/camp-registration">
      <Button variant="outline" size="icon" className="rounded-full shadow-sm hover:shadow-md transition-all hover:-translate-x-1 border-indigo-100 bg-white/80 h-12 w-12">
       <ArrowLeft className="h-5 w-5 text-indigo-700" />
      </Button>
     </Link>
     <div>
      <h1 className="text-2xl md:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-l from-indigo-950 via-indigo-800 to-indigo-600 flex items-center gap-3 tracking-tight">
       <div className="p-2.5 bg-indigo-100/50 rounded-2xl shadow-inner border border-white/50">
        <Brain className="h-7 w-7 text-indigo-600 drop-shadow-sm" />
       </div>
       {t('allocation_title')}
      </h1>
      <p className="text-indigo-900/60 mt-2 font-medium text-sm md:text-base">{t('allocation_description')}</p>
     </div>
    </div>
    <div className="flex items-center gap-2 relative z-10 w-full md:w-auto mt-4 md:mt-0">
     {simulationResult && (
      <Button 
       variant="default" 
       onClick={handleSaveBatches}
       disabled={isSaving}
       className="w-full md:w-auto gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/25 shadow-xl text-white font-bold px-8 h-12 rounded-2xl transition-all hover:scale-[1.02] border border-emerald-400/50"
      >
       {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
       {isSaving ? t('saving') : t('save_allocation')}
      </Button>
     )}
    </div>
   </div>

   <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
    {/* Left Column: Settings */}
    <div className="xl:col-span-1 space-y-6">
     <Card className="shadow-xl shadow-indigo-900/5 border-indigo-100/60 bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden relative group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors duration-500"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl"></div>
      <CardHeader className="pb-4 border-b border-indigo-100/50 bg-gradient-to-b from-indigo-50/30 to-transparent">
       <CardTitle className="text-lg flex items-center gap-3 font-bold text-indigo-950">
        <div className="p-2 bg-amber-100/80 text-amber-600 rounded-xl shadow-inner border border-white">
         <Wand2 className="h-5 w-5" />
        </div>
        {t('basic_criteria')}
       </CardTitle>
       <CardDescription className="text-indigo-900/60 font-medium">{t('basic_criteria_desc')}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
       <div className="divide-y divide-indigo-100/50 space-y-0">
        {/* Section: Total Children */}
        <div className="pb-6 first:pt-0">
         <div className="space-y-4">
          <div className="flex items-center justify-between">
           <Label className="text-sm font-bold flex items-center gap-2 text-indigo-900">
            <Users className="h-4 w-4 text-indigo-500" />
            {t('total_children')}
           </Label>
           <div className="flex items-center gap-2">
            <Input 
             type="number" 
             value={totalChildren}
             onChange={(e) => setTotalChildren(Number(e.target.value))}
             className="w-24 h-10 text-center font-bold text-lg font-mono bg-indigo-50/50 border-indigo-200 text-indigo-950 shadow-inner rounded-xl focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-shadow"
            />
           </div>
          </div>
          <Slider
           value={[totalChildren]}
           onValueChange={(v) => setTotalChildren(v[0])}
           max={2000}
           step={50}
           className="py-2 [&_[role=slider]]:shadow-lg [&_[role=slider]]:shadow-indigo-500/30 [&_[role=slider]]:border-indigo-400 [&_[role=slider]]:focus-visible:ring-2 [&_[role=slider]]:focus-visible:ring-indigo-500/50"
          />
         </div>
        </div>

        {/* Section: Per Batch & Days */}
        <div className="pt-6 pb-6">
         <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2.5">
           <Label className="text-sm font-semibold text-indigo-900/80">{t('children_per_batch')}</Label>
           <Input 
            type="number" 
            value={childrenPerBatch} 
            onChange={(e) => setChildrenPerBatch(Number(e.target.value))}
            className="bg-white border-indigo-100 shadow-sm rounded-xl focus-visible:ring-2 focus-visible:ring-indigo-500/50 font-medium h-11 transition-shadow"
           />
          </div>
          <div className="space-y-2.5">
           <Label className="text-sm font-semibold text-indigo-900/80">{t('days_between_batches')}</Label>
           <Input 
            type="number" 
            value={daysBetweenBatches} 
            onChange={(e) => setDaysBetweenBatches(Number(e.target.value))}
            className="bg-white border-indigo-100 shadow-sm rounded-xl focus-visible:ring-2 focus-visible:ring-indigo-500/50 font-medium h-11 transition-shadow"
           />
          </div>
         </div>
        </div>

        {/* Section: Quotas */}
        <div className="pt-6 pb-6">
         <div className="space-y-4">
          <h3 className="font-bold text-indigo-900 text-sm flex items-center gap-2">
           <Users className="h-4 w-4" /> {t('quotas')}
          </h3>
          <div className="grid grid-cols-3 gap-4">
           <div className="space-y-2.5">
            <Label className="text-[11px] font-bold text-indigo-900/80">{t('scouts')}</Label>
            <Input type="number" value={scoutsQuota} onChange={(e) => setScoutsQuota(Number(e.target.value))} className="bg-white border-indigo-100 shadow-sm rounded-xl h-10 text-sm focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-shadow" />
           </div>
           <div className="space-y-2.5">
            <Label className="text-[11px] font-bold text-indigo-900/80">{t('associations')}</Label>
            <Input type="number" value={associationsQuota} onChange={(e) => setAssociationsQuota(Number(e.target.value))} className="bg-white border-indigo-100 shadow-sm rounded-xl h-10 text-sm focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-shadow" />
           </div>
           <div className="space-y-2.5">
            <Label className="text-[11px] font-bold text-indigo-900/80">{t('institutions')}</Label>
            <Input type="number" value={institutionsQuota} onChange={(e) => setInstitutionsQuota(Number(e.target.value))} className="bg-white border-indigo-100 shadow-sm rounded-xl h-10 text-sm focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-shadow" />
           </div>
          </div>
         </div>
        </div>

        {/* Section: Standby */}
        <div className="pt-6 pb-6">
         <div className="space-y-4">
          <div className="flex items-center justify-between">
           <h3 className="font-bold text-indigo-900 text-sm flex items-center gap-2">
            <Users className="h-4 w-4" /> {t('standby_list')}
           </h3>
           <div className="flex items-center gap-2">
            <Label htmlFor="enable-standby" className="text-sm font-semibold cursor-pointer select-none">{t('enable')}</Label>
            <Checkbox id="enable-standby" checked={enableStandby} onCheckedChange={(c) => setEnableStandby(c as boolean)} className="transition-all duration-200 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" />
           </div>
          </div>
          {enableStandby && (
           <div className="space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <Label className="text-[11px] font-bold text-indigo-900/80">{t('standby_count')}</Label>
            <Input type="number" value={standbyCountPerBatch} onChange={(e) => setStandbyCountPerBatch(Number(e.target.value))} className="bg-white border-indigo-100 shadow-sm rounded-xl h-10 text-sm focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-shadow" />
           </div>
          )}
         </div>
        </div>

        {/* Section: Dates */}
        <div className="pt-6 pb-6">
         <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2.5 col-span-1">
           <Label className="text-sm font-semibold text-indigo-900/80">{t('first_batch_date')}</Label>
           <Input 
            type="date" 
            value={firstBatchDate} 
            onChange={(e) => setFirstBatchDate(e.target.value)}
            className="bg-white border-indigo-100 shadow-sm rounded-xl focus-visible:ring-2 focus-visible:ring-indigo-500/50 font-medium h-11 transition-shadow"
           />
          </div>
          <div className="space-y-2.5 col-span-1">
           <Label className="text-sm font-semibold text-indigo-900/80">{t('last_batch_date')}</Label>
           <div className="flex items-center px-3 bg-indigo-50/50 border border-indigo-100 shadow-inner rounded-xl h-11 text-indigo-900/60 font-medium cursor-not-allowed">
            {lastBatchDate || "-"}
           </div>
          </div>
         </div>
        </div>

        {/* Section: Calculated Batches */}
        <div className="pt-6 pb-2">
         <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-2xl flex items-center justify-between border border-indigo-100/60 shadow-inner hover:shadow-md transition-all duration-300 group">
          <Label className="text-sm text-indigo-900 font-bold flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
           {t('calculated_batches')}
          </Label>
          <div className="font-mono font-black text-2xl text-indigo-600 drop-shadow-sm group-hover:scale-110 transition-transform duration-300">
           {childrenPerBatch > 0 ? Math.ceil(totalChildren / childrenPerBatch) : 0} <span className="text-sm font-bold text-indigo-900/60 mr-1">{t('batch_unit')}</span>
          </div>
         </div>
        </div>
       </div>
      </CardContent>
     </Card>

     <Tabs defaultValue="demographics" className="w-full" dir="rtl">
      <TabsList className="grid w-full grid-cols-2 mb-4 bg-indigo-100/50 p-1 rounded-2xl shadow-inner">
       <TabsTrigger value="demographics" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-indigo-900 font-bold text-sm transition-all duration-200">{t('demographics')}</TabsTrigger>
       <TabsTrigger value="municipalities" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-indigo-900 font-bold text-sm transition-all duration-200">{t('municipalities')}</TabsTrigger>
      </TabsList>
      
      <TabsContent value="demographics">
       <Card className="shadow-sm border-indigo-100/60 bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
        <CardContent className="pt-6 space-y-8">
         {/* Gender */}
         <div className="space-y-4 p-4 bg-gradient-to-br from-indigo-50/30 to-white rounded-xl border border-indigo-100/50">
          <div className="flex items-center justify-between">
           <Label className="font-bold text-indigo-950 flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-500" />
            {t('gender_distribution')}
           </Label>
           <span className="text-xs font-bold text-indigo-700 bg-indigo-100/60 px-2.5 py-1 rounded-lg border border-indigo-200/50">{genderMale[0]}% {t('male')} / {100 - genderMale[0]}% {t('female')}</span>
          </div>
          <Slider value={genderMale} onValueChange={setGenderMale} max={100} step={5} className="[&_[role=slider]]:shadow-lg [&_[role=slider]]:shadow-indigo-500/30 [&_[role=slider]]:border-indigo-400" />
          <div className="flex justify-between text-xs font-medium text-indigo-900/60">
           <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400"></span> {t('female')}</span>
           <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> {t('male')}</span>
          </div>
         </div>

         {/* Age */}
          <div className="space-y-5 pt-4 border-t border-indigo-100">
          <Label className="font-bold text-lg text-indigo-950 flex items-center gap-2">
           <Users className="h-5 w-5 text-indigo-500" />
           {t('age_groups')}
          </Label>
          <div className="space-y-3">
           {getAgeGroups().map((group) => {
            const isSelected = selectedAgeGroups[group.id];
            const activeCount = Object.values(selectedAgeGroups).filter(Boolean).length;
            return (
             <div key={group.id} className={`space-y-3 p-4 border rounded-xl transition-all duration-300 group ${isSelected ? 'bg-gradient-to-br from-white to-indigo-50/50 border-indigo-200 shadow-md shadow-indigo-500/5' : 'bg-white border-indigo-100/50 hover:border-indigo-200 hover:shadow-sm'}`}>
              <div className="flex items-center gap-3">
               <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 shrink-0 ${isSelected ? 'bg-indigo-500 border-indigo-500 shadow-sm shadow-indigo-500/30' : 'border-indigo-200 bg-white group-hover:border-indigo-300'}`}>
                {isSelected && (
                 <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                )}
               </div>
               <Label 
                onClick={() => setSelectedAgeGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                className={`flex-1 cursor-pointer font-bold text-base transition-colors duration-200 ${isSelected ? 'text-indigo-900' : 'text-indigo-900/60 group-hover:text-indigo-900'}`}
               >
                {t(group.labelKey)}
               </Label>
              </div>
              
              {/* Display Registered Stats */}
              <div className="flex items-center gap-4 px-1 pt-2 pb-2">
               <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-200 shadow-sm">{t('registered_males')}: {registeredStats[group.id]?.male || 0}</Badge>
               <Badge variant="outline" className="bg-rose-50/50 text-rose-700 border-rose-200 shadow-sm">{t('registered_females')}: {registeredStats[group.id]?.female || 0}</Badge>
              </div>

              {isSelected && activeCount > 1 && (
                <div className="pr-7 pt-3 pb-1 border-t mt-1 border-indigo-100/50 animate-in fade-in slide-in-from-top-2 duration-200">
                 <span className="text-sm text-indigo-700 font-bold">مجموعات عمرية متعددة — يتم احتساب التوزيع تلقائياً</span>
                </div>
               )}
              
              {isSelected && activeCount === 1 && (
               <div className="pr-7 pt-3 pb-1 border-t mt-1 border-indigo-100/50 animate-in fade-in slide-in-from-top-2 duration-200">
                <span className="text-sm text-indigo-700 font-bold">{t('only_group')}</span>
               </div>
              )}
             </div>
            );
           })}
          </div>
         </div>

         </CardContent>
       </Card>
      </TabsContent>
      
      <TabsContent value="municipalities">
       <Card className="shadow-sm border-indigo-100/60 bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
        <CardContent className="pt-6">
          <div className="space-y-6">
           <div className="space-y-4">
           <p className="text-sm font-bold text-indigo-950 mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-indigo-500" />
            {t('select_municipalities')}
           </p>
           <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pl-1">
            {municipalities.map((mun) => {
             const isSelected = selectedMunicipalityIds.includes(mun.id);
             return (
              <label 
               key={mun.id} 
               className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200 group ${isSelected ? 'bg-gradient-to-br from-indigo-50/80 to-white border-indigo-300 shadow-sm' : 'bg-white border-indigo-100/60 hover:border-indigo-200 hover:bg-indigo-50/30 hover:shadow-sm'}`}
              >
               <span className={`text-sm font-medium flex items-center gap-2 transition-colors duration-200 ${isSelected ? 'text-indigo-900' : 'text-indigo-900/70 group-hover:text-indigo-900'}`}>
                <MapPin className={`h-3.5 w-3.5 shrink-0 transition-colors duration-200 ${isSelected ? 'text-indigo-500' : 'text-indigo-300 group-hover:text-indigo-400'}`} />
                {mun.name_ar}
               </span>
               <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 shrink-0 ${isSelected ? 'bg-indigo-500 border-indigo-500 shadow-sm shadow-indigo-500/30' : 'border-indigo-200 bg-white group-hover:border-indigo-300'}`}>
                {isSelected && (
                 <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                )}
               </div>
              </label>
             );
            })}
           </div>
          </div>
         </div>
        </CardContent>
       </Card>
      </TabsContent>
      </Tabs>

      {/* ===== معايير العدالة والتوزيع ===== */}
      <Card className="shadow-xl shadow-indigo-900/5 border-indigo-100/60 bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden">
        <CardHeader className="pb-4 border-b border-indigo-100/50 bg-gradient-to-b from-amber-50/30 to-transparent">
          <CardTitle className="text-lg flex items-center gap-3 font-bold text-indigo-950">
            <div className="p-2 bg-amber-100/80 text-amber-600 rounded-xl shadow-inner border border-white">
              <Scale className="h-5 w-5" />
            </div>
            معايير العدالة والتوزيع
          </CardTitle>
          <CardDescription className="text-indigo-900/60 font-medium">
            ضبط معايير التوزيع العادل للأطفال على الدفعات
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          
          {/* 1. حماية البلديات الصغيرة */}
          <div className="flex items-start justify-between p-4 bg-gradient-to-br from-emerald-50/80 to-emerald-50/20 rounded-xl border border-emerald-100/50 shadow-sm">
            <div className="space-y-3 flex-1">
              <Label htmlFor="small-mun-protection" className="font-bold text-base text-emerald-950 cursor-pointer flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" />
                حماية البلديات الصغيرة (مناطق الظل)
              </Label>
              <p className="text-xs text-emerald-900/60 leading-relaxed max-w-[350px]">
                ضمان تمثيل البلديات ذات العدد المحدود من المسجلين
              </p>
              {enableSmallMunProtection && (
                <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-emerald-100 w-fit shadow-sm">
                  <span className="text-xs font-bold text-emerald-900">حد البلدية الصغيرة</span>
                  <Input type="number" value={smallMunThreshold} onChange={(e) => setSmallMunThreshold(Number(e.target.value) || 1)} className="w-16 h-8 text-center font-bold border-emerald-200" min={1} />
                  <span className="text-xs text-emerald-700 font-semibold">أطفال</span>
                </div>
              )}
            </div>
            <Switch
              id="small-mun-protection"
              checked={enableSmallMunProtection}
              onCheckedChange={setEnableSmallMunProtection}
              className="mt-1 data-[state=checked]:bg-emerald-600"
            />
          </div>

          {/* 2. الحد الأدنى والأقصى للبلدية في الدفعة */}
          <div className="p-4 bg-gradient-to-br from-indigo-50/80 to-indigo-50/20 rounded-xl border border-indigo-100/50 shadow-sm">
            <Label className="font-bold text-sm text-indigo-950 flex items-center gap-2 mb-4">
              <MapPin className="h-4 w-4 text-indigo-600" />
              نطاق تمثيل البلدية في الدفعة
            </Label>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-indigo-900/80">الحد الأدنى (أطفال)</Label>
                <Input type="number" value={minChildrenPerBatch} onChange={(e) => setMinChildrenPerBatch(Number(e.target.value) || 0)} className="bg-white border-indigo-200" min={0} />
                <p className="text-[10px] text-indigo-900/50">لا يقل عدد أطفال البلدية في الدفعة عن هذا العدد</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-indigo-900/80">الحد الأقصى (أطفال)</Label>
                <Input type="number" value={maxChildrenPerBatch} onChange={(e) => setMaxChildrenPerBatch(Number(e.target.value) || 1)} className="bg-white border-indigo-200" min={1} />
                <p className="text-[10px] text-indigo-900/50">لا يزيد عدد أطفال البلدية في الدفعة عن هذا العدد</p>
              </div>
            </div>
          </div>

          {/* 3. لم الشمل */}
          <div className="p-4 bg-gradient-to-br from-rose-50/80 to-rose-50/20 rounded-xl border border-rose-100/50 shadow-sm">
            <Label className="font-bold text-sm text-rose-950 flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-rose-600" />
              لم شمل الإخوة (القرعة)
            </Label>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Label className="text-xs font-bold text-rose-900/80 shrink-0">إجمالي مقاعد لم الشمل للعملية:</Label>
                <Input type="number" value={reunificationSlots} onChange={(e) => setReunificationSlots(Number(e.target.value) || 0)} className="w-20 h-9 text-center font-bold border-rose-200 bg-white" min={0} />
              </div>
              <p className="text-[10px] text-rose-900/50 leading-relaxed">
                إذا تفرقت عائلة على أكثر من دفعة، يدخلون قرعة ضمن هذا العدد من المقاعد. عند الزحام — قرعة.
              </p>
            </div>
          </div>

          {/* 4. الحد الأدنى للإناث */}
          <div className="p-4 bg-gradient-to-br from-pink-50/80 to-pink-50/20 rounded-xl border border-pink-100/50 shadow-sm">
            <Label className="font-bold text-sm text-pink-950 flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-pink-600" />
              توازن الجنس
            </Label>
            <div className="flex items-center gap-3">
              <Label className="text-xs font-bold text-pink-900/80 shrink-0">الحد الأدنى للإناث في كل دفعة:</Label>
              <Input type="number" value={minFemalesPerBatch} onChange={(e) => setMinFemalesPerBatch(Number(e.target.value) || 0)} className="w-20 h-9 text-center font-bold border-pink-200 bg-white" min={0} />
            </div>
          </div>

        </CardContent>
      </Card>

      <Button 
       className="w-full gap-3 h-14 text-lg font-bold shadow-xl shadow-indigo-600/20 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 active:scale-[0.98] rounded-2xl transition-all hover:-translate-y-0.5 border border-indigo-500/50 disabled:opacity-80 disabled:cursor-not-allowed disabled:hover:translate-y-0" 
       size="lg"
       onClick={runSimulation}
       disabled={isSimulating}
      >
       {isSimulating ? (
        <>
         <Loader2 className="h-6 w-6 animate-spin text-white" />
         <span className="text-white drop-shadow-sm">{t('simulating')}</span>
        </>
       ) : (
        <>
         <Play className="h-6 w-6 fill-current text-white drop-shadow-sm" />
         <span className="text-white drop-shadow-sm">{t('start_simulation')}</span>
        </>
       )}
      </Button>
    </div>

    {/* Right Column: Results Preview */}
    <div className="xl:col-span-2 space-y-6">
     <Card className="shadow-2xl shadow-indigo-900/5 border-indigo-100/60 h-full flex flex-col bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden relative"><div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400"></div>
      <CardHeader className="pb-5 border-b border-indigo-100/50 flex flex-row items-center justify-between bg-gradient-to-b from-indigo-50/50 to-transparent px-8 pt-8">
       <div>
        <CardTitle className="text-xl font-bold text-indigo-950">{t('simulation_results')}</CardTitle>
        <CardDescription className="text-indigo-900/60 font-medium mt-1">{t('simulation_results_desc')}</CardDescription>
       </div>
       {simulationResult && (
        <Badge className="bg-emerald-100/80 text-emerald-800 border-emerald-200 shadow-sm px-3 py-1.5 rounded-xl font-bold">
         <CheckCircle2 className="h-3 w-3 mr-1" /> {t('simulation_success')}
        </Badge>
       )}
      </CardHeader>
      <CardContent className="pt-8 flex-1 bg-gradient-to-b from-transparent to-indigo-50/20 px-8 pb-8">
       {!simulationResult && !isSimulating ? (
        <div className="flex flex-col items-center justify-center h-full text-indigo-900/40 py-24">
         <div className="relative mb-10 group">
          <div className="absolute inset-0 bg-indigo-200/40 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '3s' }}></div>
          <div className="absolute inset-4 bg-indigo-300/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0.5s', animationDuration: '3s' }}></div>
          <div className="relative z-10 p-6 bg-gradient-to-br from-indigo-100/60 to-indigo-50/30 rounded-full border border-indigo-200/40 shadow-lg shadow-indigo-200/50">
           <Brain className="h-24 w-24 text-indigo-400 drop-shadow-md animate-pulse" style={{ animationDuration: '4s' }} />
          </div>
         </div>
         <h3 className="text-2xl font-black mb-3 text-indigo-950">{t('ready_title')}</h3>
         <p className="text-sm text-center max-w-sm leading-relaxed text-indigo-900/60">{t('ready_desc')}</p>
        </div>
       ) : isSimulating ? (
        <div className="flex flex-col items-center justify-center h-full py-20">
         {/* Animated bouncing dots */}
         <div className="flex items-center gap-2 mb-6" dir="ltr">
          <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '0.8s' }}></div>
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s', animationDuration: '0.8s' }}></div>
          <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '0.8s' }}></div>
         </div>
         {/* Spinner with glow */}
         <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full blur-xl bg-indigo-200/40 animate-pulse"></div>
          <div className="relative z-10 p-4 bg-gradient-to-br from-indigo-100/40 to-white/40 rounded-full border border-indigo-200/30">
           <Loader2 className="h-14 w-14 animate-spin text-indigo-600 drop-shadow-sm" />
          </div>
         </div>
         {/* Indeterminate progress bar */}
         <div className="w-64 h-1.5 bg-indigo-100/80 rounded-full overflow-hidden mb-6 relative shadow-inner">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400 to-transparent rounded-full animate-pulse" style={{ animationDuration: '1.5s' }}></div>
         </div>
         <h3 className="text-xl font-black mt-1 mb-3 text-indigo-950">{t('simulating_title')}</h3>
         <p className="text-sm text-indigo-900/60 max-w-xs text-center leading-relaxed">{t('simulating_desc')}</p>
        </div>
       ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
         {/* Stats Overview */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="bg-gradient-to-br from-indigo-50/80 to-white border border-indigo-100/80 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-0.5">
           <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-100/50 rounded-full blur-2xl group-hover:bg-indigo-200/50 transition-colors duration-500"></div>
           <div className="p-2.5 bg-indigo-100/60 rounded-xl text-indigo-600 mb-3 relative z-10 shadow-sm border border-white/50 group-hover:scale-110 transition-transform duration-300">
            <Users className="h-5 w-5" />
           </div>
           <p className="text-sm font-bold text-indigo-900/60 mb-2 relative z-10">{t('total_distributed')}</p>
           <p className="text-4xl font-black text-indigo-950 relative z-10 drop-shadow-sm">{totalChildren}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50/80 to-white border border-blue-100/80 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-0.5">
           <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-100/50 rounded-full blur-2xl group-hover:bg-blue-200/50 transition-colors duration-500"></div>
           <div className="p-2.5 bg-blue-100/60 rounded-xl text-blue-600 mb-3 relative z-10 shadow-sm border border-white/50 group-hover:scale-110 transition-transform duration-300">
            <BarChart3 className="h-5 w-5" />
           </div>
           <p className="text-sm font-bold text-blue-900/60 mb-2 relative z-10">{t('total_registered')}</p>
           <p className="text-4xl font-black text-blue-950 relative z-10 drop-shadow-sm">{(simulationResult.overallMunStats ? Object.values(simulationResult.overallMunStats).reduce((sum: number, stat: any) => sum + stat.registered, 0) : 0)}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50/80 to-white border border-amber-100/80 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 hover:-translate-y-0.5">
           <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-100/50 rounded-full blur-2xl group-hover:bg-amber-200/50 transition-colors duration-500"></div>
           <div className="p-2.5 bg-amber-100/60 rounded-xl text-amber-600 mb-3 relative z-10 shadow-sm border border-white/50 group-hover:scale-110 transition-transform duration-300">
            <Layers className="h-5 w-5" />
           </div>
           <p className="text-sm font-bold text-amber-900/60 mb-2 relative z-10">{t('total_batches')}</p>
           <p className="text-4xl font-black text-amber-600 relative z-10 drop-shadow-sm">{simulationResult.batches.length}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50/80 to-white border border-emerald-100/80 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-0.5">
           <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-100/50 rounded-full blur-2xl group-hover:bg-emerald-200/50 transition-colors duration-500"></div>
           <div className="p-2.5 bg-emerald-100/60 rounded-xl text-emerald-600 mb-3 relative z-10 shadow-sm border border-white/50 group-hover:scale-110 transition-transform duration-300">
            <Gauge className="h-5 w-5" />
           </div>
           <p className="text-sm font-bold text-emerald-900/60 mb-2 relative z-10">{t('max_per_batch')}</p>
           <p className="text-4xl font-black text-emerald-600 relative z-10 drop-shadow-sm">{childrenPerBatch}</p>
          </div>
         </div>

         {/* Overall Municipalities Stats */}
         {simulationResult.overallMunStats && (
          <div className="mt-6 bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
           <h4 className="text-sm font-bold text-indigo-950 mb-5 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-indigo-600" />
            {t('municipality_stats')}
            <span className="text-xs font-normal text-indigo-900/50 bg-indigo-100/60 px-2 py-0.5 rounded-full">{Object.entries(simulationResult.overallMunStats).filter(([_, s]: any) => s.registered > 0).length} {t('municipalities')}</span>
           </h4>
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Object.entries(simulationResult.overallMunStats)
             .filter(([_, stats]: any) => stats.registered > 0)
             .sort((a: any, b: any) => b[1].registered - a[1].registered)
             .map(([mun, stats]: any) => {
              const percent = Math.min(100, Math.round((stats.distributed / Math.max(1, stats.registered)) * 100));
              return (
               <div key={mun} className="bg-white border border-indigo-100/60 rounded-2xl p-4 flex flex-col items-center text-center justify-center shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-indigo-200 transition-all duration-200 group">
                <span className="text-sm font-bold text-indigo-950 mb-2 group-hover:text-indigo-700 transition-colors duration-200">{mun}</span>
                <div className="flex items-center gap-1.5 text-xs bg-indigo-50/50 px-3 py-1.5 rounded-lg border border-indigo-100/50 mb-3 shadow-sm group-hover:bg-indigo-100/50 transition-colors duration-200">
                 <span className="text-indigo-700 font-black text-sm">{stats.distributed} <span className="text-[10px] font-normal">{t('candidate')}</span></span>
                 <span className="text-indigo-300">/</span>
                 <span className="text-indigo-900/60 font-bold">{stats.registered} <span className="text-[10px] font-normal">{t('registered')}</span></span>
                </div>
                <div className="w-full bg-indigo-50/80 h-2.5 rounded-full overflow-hidden relative shadow-inner">
                 <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${percent === 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-indigo-500 to-blue-500'}`} 
                  style={{ width: `${percent}%` }}
                 />
                </div>
                <span className="text-[10px] font-bold text-indigo-400 mt-1.5">{percent}% {t('accepted_percent')}</span>
               </div>
              );
             })}
           </div>
          </div>
         )}

          {/* Reunification Log */}
          {simulationResult?.reunificationLog && simulationResult.reunificationLog.length > 0 && (
            <div className="mt-6 bg-gradient-to-br from-rose-50/50 to-white border border-rose-100 rounded-3xl p-6 shadow-sm">
              <h4 className="text-sm font-bold text-rose-950 mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-rose-600" />
                سجل لم شمل الإخوة
                <span className="text-xs font-normal text-rose-900/50 bg-rose-100/60 px-2 py-0.5 rounded-full">
                  {simulationResult.reunificationLog.length} عملية
                </span>
              </h4>
              <div className="space-y-2">
                {simulationResult.reunificationLog.map((log: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-rose-50/50 rounded-xl border border-rose-100 text-sm">
                    <Badge className="bg-rose-100 text-rose-800 border-rose-200">{log.family_name || log.family_key}</Badge>
                    <span className="text-rose-900/70">→ تم لم شمل</span>
                    <Badge variant="outline" className="bg-rose-50/50">{log.members_count} أفراد</Badge>
                    <span className="text-rose-900/70">في الدفعة {log.target_batch}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Batches Preview */}
          <h3 className="font-black text-lg flex items-center gap-3 mb-5 text-indigo-950 mt-8">
          <div className="p-1.5 bg-indigo-100/80 rounded-xl text-indigo-600 shadow-inner border border-white/50"><CalendarDays className="h-5 w-5" /></div>
          {t('proposed_batches')}
          <span className="text-xs font-normal text-indigo-900/50 bg-indigo-100/60 px-2.5 py-0.5 rounded-full">{simulationResult.batches.length} {t('batch_unit')}</span>
         </h3>
         
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {simulationResult.batches.map((batch: any, index: number) => (
           <div 
            key={batch.id} 
            className="bg-white border border-indigo-100/80 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:shadow-indigo-500/15 transition-all duration-300 hover:-translate-y-1.5 relative overflow-hidden group cursor-pointer"
            onClick={() => setSelectedBatch(batch)}
           >
            {/* Gradient border strip on right that fades in on hover */}
            <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 via-blue-500 to-emerald-400 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
            <div className="flex justify-between items-start mb-3 relative z-10">
             <div>
              <h4 className="font-bold text-base text-indigo-950 group-hover:text-indigo-700 transition-colors duration-300">{batch.name}</h4>
              <div className="flex items-center gap-1.5 text-xs text-indigo-900/50 mt-1">
               <Clock className="h-3 w-3" /> {t('starts_on')} <span dir="ltr" className="font-semibold text-indigo-900/70">{batch.startDate}</span>
              </div>
             </div>
             <Badge variant="outline" className="bg-indigo-50/80 border-indigo-200 text-indigo-700 font-black px-3.5 py-1.5 rounded-xl shadow-sm text-sm group-hover:bg-indigo-100/80 group-hover:border-indigo-300 transition-all duration-300">{batch.count} {t('child_unit')}</Badge>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-3 relative z-10">
             <div className="bg-gradient-to-br from-emerald-50/80 to-white rounded-xl p-2.5 text-center border border-emerald-100/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <Brain className="h-3.5 w-3.5 text-emerald-600 mx-auto mb-1" />
              <div className="text-[10px] font-bold text-emerald-700 mb-0.5">{t('directorate_smart')}</div>
              <div className="font-black text-emerald-900 text-base drop-shadow-sm">{batch.smartCount}</div>
             </div>
             <div className="bg-gradient-to-br from-orange-50/80 to-white rounded-xl p-2.5 text-center border border-orange-100/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <Wand2 className="h-3.5 w-3.5 text-orange-600 mx-auto mb-1" />
              <div className="text-[10px] font-bold text-orange-700 mb-0.5">{t('reserved_scouts')}</div>
              <div className="font-black text-orange-900 text-base drop-shadow-sm">{batch.scoutsQuota}</div>
             </div>
             <div className="bg-gradient-to-br from-purple-50/80 to-white rounded-xl p-2.5 text-center border border-purple-100/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <Users className="h-3.5 w-3.5 text-purple-600 mx-auto mb-1" />
              <div className="text-[10px] font-bold text-purple-700 mb-0.5">{t('reserved_associations')}</div>
              <div className="font-black text-purple-900 text-base drop-shadow-sm">{batch.associationsQuota}</div>
             </div>
             <div className="bg-gradient-to-br from-blue-50/80 to-white rounded-xl p-2.5 text-center border border-blue-100/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <BarChart3 className="h-3.5 w-3.5 text-blue-600 mx-auto mb-1" />
              <div className="text-[10px] font-bold text-blue-700 mb-0.5">{t('reserved_institutions')}</div>
              <div className="font-black text-blue-900 text-base drop-shadow-sm">{batch.institutionsQuota}</div>
             </div>
            </div>

            {batch.standbyCount > 0 && (
             <div className="bg-gradient-to-r from-slate-50 to-slate-50/50 border border-slate-200/80 text-slate-700 text-xs font-bold py-1.5 px-3 rounded-lg mb-3 flex items-center gap-2 relative z-10 shadow-sm">
              <AlertCircle className="h-3.5 w-3.5 text-slate-500" />
              <span>{t('standby_children', { count: batch.standbyCount })}</span>
             </div>
            )}
            
            <div className="pt-3 border-t border-indigo-100/40 mt-3 relative z-10">
             <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-indigo-900/50 font-semibold">{t('gender_breakdown')}</span>
              <span className="font-bold text-indigo-900/80">{batch.stats.male} {t('male')} / {batch.stats.female} {t('female')}</span>
             </div>
             <div className="w-full h-2 bg-rose-100/80 rounded-full overflow-hidden flex shadow-inner">
              <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-full rounded-r-full transition-all duration-500" style={{ width: `${batch.smartCount > 0 ? (batch.stats.male / batch.smartCount) * 100 : 0}%` }}></div>
              <div className="bg-gradient-to-r from-pink-400 to-pink-500 h-full rounded-l-full flex-1 transition-all duration-500"></div>
             </div>
            </div>
           </div>
          ))}
         </div>


        </div>
       )}
      </CardContent>
     </Card>
    </div>
   </div>

   {/* Batch Details Dialog */}
   <Dialog open={!!selectedBatch} onOpenChange={(open) => !open && setSelectedBatch(null)}>
    <DialogContent className="!max-w-[1000px] w-[95vw] h-[85vh] flex flex-col overflow-hidden bg-white/95 backdrop-blur-xl border-indigo-100 shadow-2xl p-0" dir="rtl">
     {selectedBatch && (
      <>
       <DialogHeader className="px-8 pt-8 pb-5 border-b border-indigo-100/50 bg-gradient-to-b from-indigo-50/60 via-indigo-50/20 to-transparent relative overflow-hidden">
        {/* Decorative accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl"></div>
        <div className="flex justify-between items-start relative z-10">
         <div>
          <DialogTitle className="text-2xl font-black text-indigo-950 flex items-center gap-3">
           <div className="p-2.5 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-xl text-indigo-600 shadow-inner border border-white/60">
            <CalendarDays className="h-6 w-6" />
           </div>
           {selectedBatch.name}
          </DialogTitle>
           <DialogDescription className="text-indigo-900/60 font-medium mt-2.5">
            <div className="flex items-center gap-4 mb-3">
              <span className="flex items-center gap-1.5 bg-white/60 px-3 py-1 rounded-lg border border-indigo-100/50 shadow-sm"><Clock className="h-4 w-4 text-indigo-500" /> {t('starts_on')} <span className="font-bold text-indigo-900">{selectedBatch.startDate}</span></span>
              <span className="flex items-center gap-1.5 bg-white/60 px-3 py-1 rounded-lg border border-indigo-100/50 shadow-sm"><Users className="h-4 w-4 text-indigo-500" /> {selectedBatch.count} {t('child_unit')}</span>
            </div>
            {selectedBatch?.imbalanceReasons?.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-sm font-bold text-amber-800 mb-2">تنبيهات الخلخلة:</p>
                {selectedBatch.imbalanceReasons.map((reason: string, i: number) => (
                  <p key={i} className="text-xs text-amber-700">• {reason}</p>
                ))}
              </div>
            )}
           </DialogDescription>
         </div>
         <Badge className="bg-indigo-50/80 border-indigo-200 text-indigo-700 font-bold px-4 py-2 text-sm shadow-sm rounded-xl">
          {selectedBatch.stats.male} {t('male')} / {selectedBatch.stats.female} {t('female')}
         </Badge>
        </div>
       </DialogHeader>
       
       <div className="flex-1 overflow-hidden bg-gradient-to-b from-transparent to-indigo-50/20 px-8 pb-8 pt-4 flex flex-col">
        {(() => {
         const munCounts: Record<string, number> = {};
         const siblingSets = new Set<string>();

         selectedBatch.children.forEach((c: any) => {
          munCounts[c.municipality] = (munCounts[c.municipality] || 0) + 1;
          if (c.isSibling && c._raw) {
           const getParentKey = (child: any) => `${child.parent_first_name?.trim()}_${child.parent_last_name?.trim()}_${child.parent_phone?.trim()}`.toLowerCase();
           siblingSets.add(getParentKey(c._raw));
          }
         });
         
         return (
          <div className="mb-4 flex flex-col gap-3 shrink-0">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-blue-50/80 to-white border border-blue-100/60 p-3.5 rounded-xl shadow-sm flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
             <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div className="text-xs font-bold text-blue-900/60">{t('male')}</div>
             </div>
             <div className="text-xl font-black text-blue-600 group-hover:scale-110 transition-transform duration-200">{selectedBatch.stats.male}</div>
            </div>
            <div className="bg-gradient-to-br from-rose-50/80 to-white border border-rose-100/60 p-3.5 rounded-xl shadow-sm flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
             <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-rose-500" />
              <div className="text-xs font-bold text-rose-900/60">{t('female')}</div>
             </div>
             <div className="text-xl font-black text-rose-600 group-hover:scale-110 transition-transform duration-200">{selectedBatch.stats.female}</div>
            </div>
            <div className="bg-gradient-to-br from-amber-50/80 to-white border border-amber-100/60 p-3.5 rounded-xl shadow-sm flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
             <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" />
              <div className="text-xs font-bold text-amber-900/60">{t('families_count')}</div>
             </div>
             <div className="text-xl font-black text-amber-600 group-hover:scale-110 transition-transform duration-200">{siblingSets.size}</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50/80 to-white border border-emerald-100/60 p-3.5 rounded-xl shadow-sm flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
             <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-500" />
              <div className="text-xs font-bold text-emerald-900/60">{t('municipalities_represented')}</div>
             </div>
             <div className="text-xl font-black text-emerald-600 group-hover:scale-110 transition-transform duration-200">{Object.keys(munCounts).length}</div>
            </div>
           </div>
           
           <div className="flex flex-wrap gap-2">
            {Object.entries(munCounts).sort((a,b) => b[1] - a[1]).map(([mun, count]) => (
             <div key={mun} className="bg-white/80 border border-indigo-100/50 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
              <MapPin className="h-3 w-3 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
              <span className="text-indigo-950">{mun}</span>
              <span className="bg-indigo-100 text-indigo-700 font-bold px-1.5 rounded group-hover:bg-indigo-200 transition-colors">{count}</span>
             </div>
            ))}
           </div>
          </div>
         );
        })()}

        <h4 className="font-bold text-indigo-950 mb-3 mt-2 flex items-center gap-2 shrink-0">
         <div className="p-1 bg-indigo-100 rounded-lg text-indigo-600">
          <Users className="h-5 w-5" />
         </div>
         {t('children_list')}
         <span className="text-xs font-normal text-indigo-900/50 bg-indigo-100/60 px-2 py-0.5 rounded-full">{selectedBatch.smartCount} {t('child_unit')}</span>
        </h4>
        
        <div className="rounded-2xl border border-indigo-100/80 bg-white/60 overflow-hidden shadow-inner flex-1 flex flex-col min-h-0 relative">
         <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 z-10"></div>
         <ScrollArea className="flex-1" dir="rtl">
          <Table>
           <TableHeader className="bg-indigo-50/80 backdrop-blur-sm sticky top-0 z-10">
            <TableRow className="border-indigo-100/50 hover:bg-transparent">
             <TableHead className="w-[60px] font-bold text-indigo-900 text-center py-4">{t('table_number')}</TableHead>
             <TableHead className="font-bold text-indigo-900 text-right py-4 whitespace-nowrap w-[35%]">{t('table_full_name')}</TableHead>
             <TableHead className="font-bold text-indigo-900 text-right py-4 whitespace-nowrap">{t('table_gender')}</TableHead>
             <TableHead className="font-bold text-indigo-900 text-right py-4 whitespace-nowrap">{t('table_age')}</TableHead>
             <TableHead className="font-bold text-indigo-900 text-right py-4 whitespace-nowrap w-[25%]">{t('table_municipality')}</TableHead>
            </TableRow>
           </TableHeader>
           <TableBody>
            {selectedBatch.children.filter((c: any) => !c.isStandby).map((child: any, idx: number) => (
             <TableRow 
              key={child.id} 
              className={`transition-all duration-300 animate-in fade-in slide-in-from-bottom-1 group ${idx % 2 === 0 ? 'bg-white' : 'bg-indigo-50/20'} ${child.isSibling ? child.siblingStyling.row + ' border-b border-indigo-200/50' : 'border-indigo-50/50 hover:bg-indigo-50/80 border-b'}`}
              style={{ animationDelay: `${idx * 20}ms`, animationFillMode: 'both' }}
             >
              <TableCell className="text-center font-mono text-indigo-900/50 text-sm font-bold py-3">{idx + 1}</TableCell>
              <TableCell className="font-bold text-indigo-950 py-3 whitespace-nowrap">
               <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border-2 border-white shadow-sm group-hover:scale-110 transition-transform duration-200">
                 <AvatarFallback className={child.gender === 'ذكر' ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-rose-100 text-rose-700 font-bold'}>
                  {child.name.substring(0, 1)}
                 </AvatarFallback>
                </Avatar>
                 <div className="flex flex-col">
                  <span className="font-bold text-indigo-950">{child.name}</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {child.isSibling && <span className={`text-[10px] w-fit px-1.5 py-0.5 rounded-sm border shadow-sm ${child.siblingStyling.badge}`}>{t('sibling_badge')}</span>}
                    {child.imbalanceReason && (
                      <span className="text-[10px] w-fit px-1.5 py-0.5 rounded-sm border shadow-sm bg-amber-100 text-amber-800 border-amber-200 font-bold">
                        {child.imbalanceReason}
                      </span>
                    )}
                  </div>
                 </div>
               </div>
              </TableCell>
              <TableCell className="py-3 whitespace-nowrap">
               <Badge variant="outline" className={child.gender === 'ذكر' ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold px-3 py-1 shadow-sm' : 'bg-rose-50 border-rose-200 text-rose-700 font-bold px-3 py-1 shadow-sm'}>
                {child.gender}
               </Badge>
              </TableCell>
              <TableCell className="font-bold text-indigo-900/80 py-3 whitespace-nowrap">{child.age} {t('years_old')}</TableCell>
              <TableCell className="font-bold text-indigo-900/80 py-3 whitespace-nowrap">
               <span className="flex items-center gap-2 bg-white/70 px-2.5 py-1 rounded-lg w-fit border border-indigo-100/50 shadow-sm">
                <MapPin className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span className="truncate max-w-[200px] block">{child.municipality}</span>
               </span>
              </TableCell>
             </TableRow>
            ))}
            {(() => {
              const rows = [];
              let indexOffset = selectedBatch.smartCount + 1;
              
              for (let i = 0; i < (selectedBatch.scoutsQuota || 0); i++) {
               rows.push(
                <TableRow key={`scout-${i}`} className="bg-gradient-to-r from-orange-50/60 to-orange-50/20 hover:bg-orange-50/80 border-b border-orange-100 transition-all duration-200">
                 <TableCell className="text-center font-mono text-orange-900/50 text-sm font-bold py-3">{indexOffset++}</TableCell>
                 <TableCell className="font-bold text-orange-900 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                   <div className="h-9 w-9 rounded-full border-2 border-white shadow-sm flex items-center justify-center bg-orange-100 text-orange-600"><Sparkles className="h-4 w-4" /></div>
                   <span>{t('seat_scout')}</span>
                  </div>
                 </TableCell>
                 <TableCell className="py-3 text-center text-orange-900/30">-</TableCell>
                 <TableCell className="py-3 text-center text-orange-900/30">-</TableCell>
                 <TableCell className="py-3 text-center text-orange-900/30">-</TableCell>
                </TableRow>
               );
              }

              for (let i = 0; i < (selectedBatch.associationsQuota || 0); i++) {
               rows.push(
                <TableRow key={`assoc-${i}`} className="bg-gradient-to-r from-purple-50/60 to-purple-50/20 hover:bg-purple-50/80 border-b border-purple-100 transition-all duration-200">
                 <TableCell className="text-center font-mono text-purple-900/50 text-sm font-bold py-3">{indexOffset++}</TableCell>
                 <TableCell className="font-bold text-purple-900 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                   <div className="h-9 w-9 rounded-full border-2 border-white shadow-sm flex items-center justify-center bg-purple-100 text-purple-600"><Sparkles className="h-4 w-4" /></div>
                   <span>{t('seat_association')}</span>
                  </div>
                 </TableCell>
                 <TableCell className="py-3 text-center text-purple-900/30">-</TableCell>
                 <TableCell className="py-3 text-center text-purple-900/30">-</TableCell>
                 <TableCell className="py-3 text-center text-purple-900/30">-</TableCell>
                </TableRow>
               );
              }

              for (let i = 0; i < (selectedBatch.institutionsQuota || 0); i++) {
               rows.push(
                <TableRow key={`inst-${i}`} className="bg-gradient-to-r from-blue-50/60 to-blue-50/20 hover:bg-blue-50/80 border-b border-blue-100 transition-all duration-200">
                 <TableCell className="text-center font-mono text-blue-900/50 text-sm font-bold py-3">{indexOffset++}</TableCell>
                 <TableCell className="font-bold text-blue-900 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                   <div className="h-9 w-9 rounded-full border-2 border-white shadow-sm flex items-center justify-center bg-blue-100 text-blue-600"><Sparkles className="h-4 w-4" /></div>
                   <span>{t('seat_institution')}</span>
                  </div>
                 </TableCell>
                 <TableCell className="py-3 text-center text-blue-900/30">-</TableCell>
                 <TableCell className="py-3 text-center text-blue-900/30">-</TableCell>
                 <TableCell className="py-3 text-center text-blue-900/30">-</TableCell>
                </TableRow>
               );
              }

              return rows;
            })()}
            {selectedBatch.children.filter((c: any) => c.isStandby).map((child: any, idx: number) => (
             <TableRow 
              key={child.id} 
              className="bg-slate-50/80 hover:bg-slate-100/80 border-b border-slate-200/80 transition-all duration-200 group animate-in fade-in slide-in-from-bottom-1"
              style={{ animationDelay: `${(selectedBatch.children.filter((c: any) => !c.isStandby).length + idx) * 20}ms`, animationFillMode: 'both' }}
             >
              <TableCell className="text-center font-mono text-slate-900/40 text-sm font-bold py-3">-</TableCell>
              <TableCell className="font-bold text-slate-800 py-3 whitespace-nowrap">
               <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border-2 border-white shadow-sm group-hover:scale-110 transition-transform duration-200 opacity-60">
                 <AvatarFallback className="bg-slate-200 text-slate-600 font-bold">
                  {child.name.substring(0, 1)}
                 </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                 <span className="text-slate-700">{child.name}</span>
                 <span className="text-[10px] w-fit px-1.5 py-0.5 rounded-sm mt-0.5 border bg-slate-100 text-slate-600 border-slate-300 font-bold flex items-center gap-1 shadow-sm">
                  <AlertCircle className="h-3 w-3" /> {t('standby_badge')}
                 </span>
                </div>
               </div>
              </TableCell>
              <TableCell className="py-3 whitespace-nowrap">
               <Badge variant="outline" className="bg-slate-100 border-slate-200 text-slate-600 font-bold px-3 py-1 shadow-sm">
                {child.gender}
               </Badge>
              </TableCell>
              <TableCell className="font-bold text-slate-500 py-3 whitespace-nowrap">{child.age} {t('years_old')}</TableCell>
              <TableCell className="font-bold text-slate-500 py-3 whitespace-nowrap">
               <span className="flex items-center gap-2 bg-white/50 px-2.5 py-1 rounded-lg w-fit border border-slate-200 shadow-sm">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate max-w-[200px] block">{child.municipality}</span>
               </span>
              </TableCell>
             </TableRow>
            ))}
           </TableBody>
          </Table>
         </ScrollArea>
        </div>
       </div>
      </>
     )}
    </DialogContent>
   </Dialog>
  </div>
 </PermissionGuard>
       );
}
   