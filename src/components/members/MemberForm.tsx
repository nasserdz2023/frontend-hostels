"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Loader2, Save, ArrowLeft, ArrowRight, User, Phone, Shield, Building2, MapPin, Calendar, CreditCard, Lock, Mail } from "lucide-react";
import { useRouter } from "@/i18n/routing";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Stepper } from "@/components/ui/stepper";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { membersApi } from "@/lib/api/members";
import { institutionsApi, YouthInstitution } from "@/lib/api/institutions";
import { locationsApi, Wilaya, Municipality } from "@/lib/api/locations";
import { getErrorMessage } from "@/lib/api/client";

const ACTIVITIES_OPTIONS = [
  { value: "ميدان النشاطات العلمية، التكنولوجية، وتطوير البرمجيات", label: "ميدان النشاطات العلمية، التكنولوجية، وتطوير البرمجيات" },
  { value: "ميدان نشاطات الإبداع الفني، الثقافي والإعلامي", label: "ميدان نشاطات الإبداع الفني، الثقافي والإعلامي" },
  { value: "ميدان نشاطات الحركية والسياحة الشبابية والرياضة الترفيهية", label: "ميدان نشاطات الحركية والسياحة الشبابية والرياضة الترفيهية" },
  { value: "ميدان نشاطات الدعم النفسي والوقاية وصحة الشباب", label: "ميدان نشاطات الدعم النفسي والوقاية وصحة الشباب" },
  { value: "ميــدان نشاطــــــات المواطنة وأعمــــال التطــــوع.", label: "ميــدان نشاطــــــات المواطنة وأعمــــال التطــــوع." },
  { value: "ميـــدان نشاطــات تمكيـــن قـــدرات الشبــاب", label: "ميـــدان نشاطــات تمكيـــن قـــدرات الشبــاب" },
];

interface MemberFormProps {
  initialData?: any;
  isEdit?: boolean;
}

export function MemberForm({ initialData, isEdit = false }: MemberFormProps) {
  const t = useTranslations("members");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [guardianSearchResults, setGuardianSearchResults] = useState<any[]>([]);
  const [isSearchingGuardian, setIsSearchingGuardian] = useState(false);
  const [institutions, setInstitutions] = useState<YouthInstitution[]>([]);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(false);
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingInstitutions(true);
      setIsLoadingLocations(true);
      try {
        const [instRes, wilayaRes] = await Promise.all([
          institutionsApi.getAll({ size: 200 }),
          locationsApi.getWilayas()
        ]);
        setInstitutions(instRes.items || []);
        setWilayas(wilayaRes || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoadingInstitutions(false);
        setIsLoadingLocations(false);
      }
    };
    fetchData();
  }, []);

  const fetchMunicipalities = async (wilayaCode: string) => {
    try {
      const response = await locationsApi.getMunicipalities(wilayaCode);
      setMunicipalities(response || []);
    } catch (error) {
      console.error("Error fetching municipalities:", error);
    }
  };

  const searchGuardians = async (firstName: string, lastName: string) => {
    // التحقق من أن إجمالي طول البحث (الاسم + اللقب) 3 أحرف على الأقل
    if (firstName.length < 3) {
      setGuardianSearchResults([]);
      return;
    }
    setIsSearchingGuardian(true);
    try {
      // البحث بالاسم واللقب معاً
      const query = `${firstName} ${lastName}`.trim();
      if (query.length < 3) {
        setGuardianSearchResults([]);
        return;
      }
      const response = await membersApi.searchGuardians(query);
      setGuardianSearchResults(response.data || []);
    } catch (error) {
      console.error("Search error", error);
    } finally {
      setIsSearchingGuardian(false);
    }
  };

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".guardian-search-container")) {
        setGuardianSearchResults([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formSchema = z.object({
    // Personal Info
    first_name: z.string().min(2, tCommon("required")),
    last_name: z.string().min(2, tCommon("required")),
    first_name_fr: z.string().optional(),
    last_name_fr: z.string().optional(),
    national_id: z.string().optional(),
    birth_date: z.string().optional(),
    gender: z.enum(["MALE", "FEMALE"]).optional(),
    has_disabilities: z.boolean().default(false),
    
    // Account Info
    username: z.string().optional(),
    email: z.string().optional(),
    password: z.string().optional(),
    
    // Membership Info
    membership_year: z.number().int().min(1900).max(2100).default(new Date().getFullYear()),
    ministry_number: z.string().optional(),
    institution: z.string().optional(),
    academic_level: z.string().optional(),
    
    // Location Info
    birth_wilaya: z.string().optional(),
    birth_commune: z.string().optional(),
    residence_wilaya: z.string().optional(),
    residence_commune: z.string().optional(),
    address: z.string().optional(),
    
    favorite_activities: z.array(z.string()).optional(),
    
    // Guardian Info
    guardian_first_name: z.string().min(2, tCommon("required")),
    guardian_last_name: z.string().min(2, tCommon("required")),
    guardian_national_id: z.string().optional(),
    guardian_phone: z.string().optional(),
    guardian_email: z.string().optional(),
    guardian_relationship: z.string().optional(),
    candidate_phone: z.string().optional(),
    
    // Document Paths
    photo_path: z.string().optional(),
    birth_certificate_path: z.string().optional(),
    national_id_path: z.string().optional(),
    guardian_national_id_path: z.string().optional(),
  });

  type FormData = z.infer<typeof formSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as any as any,
    defaultValues: {
      first_name: initialData?.first_name || "",
      last_name: initialData?.last_name || "",
      first_name_fr: initialData?.first_name_fr || "",
      last_name_fr: initialData?.last_name_fr || "",
      username: initialData?.username || "",
      email: initialData?.email || "",
      password: initialData?.password || "",
      national_id: initialData?.national_id || "",
      birth_date: initialData?.birth_date || "",
      gender: initialData?.gender || "MALE",
      has_disabilities: initialData?.has_disabilities || false,
      membership_year: initialData?.membership_year || new Date().getFullYear(),
      ministry_number: initialData?.ministry_number || "",
      institution: initialData?.institution || "",
      academic_level: initialData?.academic_level || "",
      birth_wilaya: initialData?.birth_wilaya || "بوسعادة",
      birth_commune: initialData?.birth_commune || "",
      residence_wilaya: initialData?.residence_wilaya || "بوسعادة",
      residence_commune: initialData?.residence_commune || "",
      address: initialData?.address || "",
      favorite_activities: initialData?.favorite_activities || [],
      guardian_first_name: initialData?.guardians?.[0]?.first_name || "",
      guardian_last_name: initialData?.guardians?.[0]?.last_name || "",
      guardian_national_id: initialData?.guardians?.[0]?.national_id || "",
      guardian_phone: initialData?.guardians?.[0]?.phone || "",
      guardian_email: initialData?.guardians?.[0]?.email || "",
      guardian_relationship: initialData?.guardians?.[0]?.relationship_type || "",
      candidate_phone: initialData?.guardians?.[0]?.candidate_phone || "",
      
      photo_path: initialData?.photo_path || "",
      birth_certificate_path: initialData?.birth_certificate_path || "",
      national_id_path: initialData?.national_id_path || "",
      guardian_national_id_path: initialData?.guardians?.[0]?.national_id_path || "",
    },
  });

  const steps = [
    { id: 1, label: t("steps.personal"), description: t("personalInfo") },
    { id: 2, label: t("steps.location"), description: t("contactInfo") },
    { id: 3, label: t("steps.guardian"), description: t("guardianInfo") },
    { id: 4, label: t("steps.account"), description: t("accountInfo") },
  ];

  const onSubmit = async (values: FormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        first_name: values.first_name,
        last_name: values.last_name,
        first_name_fr: values.first_name_fr || undefined,
        last_name_fr: values.last_name_fr || undefined,
        username: values.username || undefined,
        email: values.email || values.guardian_email || undefined,
        password: values.password || undefined,
        national_id: values.national_id || undefined,
        birth_date: values.birth_date || undefined,
        gender: values.gender,
        has_disabilities: values.has_disabilities,
        membership_year: values.membership_year,
        ministry_number: values.ministry_number || undefined,
        institution: values.institution || undefined,
        academic_level: values.academic_level || undefined,
        birth_wilaya: values.birth_wilaya || undefined,
        birth_commune: values.birth_commune || undefined,
        residence_wilaya: values.residence_wilaya || undefined,
        residence_commune: values.residence_commune || undefined,
        address: values.address || undefined,
        favorite_activities: values.favorite_activities || undefined,
        photo_path: values.photo_path || undefined,
        birth_certificate_path: values.birth_certificate_path || undefined,
        national_id_path: values.national_id_path || undefined,
        guardian: {
          first_name: values.guardian_first_name,
          last_name: values.guardian_last_name,
          national_id: values.guardian_national_id || undefined,
          phone: values.guardian_phone || undefined,
          email: values.guardian_email || undefined,
          national_id_path: values.guardian_national_id_path || undefined,
          relationship_type: values.guardian_relationship || undefined,
          candidate_phone: values.candidate_phone || undefined,
        }
      };

      if (isEdit && initialData) {
        await membersApi.update(initialData.id, payload as any);
        toast.success(t("messages.updated"));
      } else {
        await membersApi.create(payload as any);
        toast.success(t("messages.created"));
      }
      router.push('/members');
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    let fields: any[] = [];
    if (currentStep === 1) fields = ["first_name", "last_name", "first_name_fr", "last_name_fr", "gender"];
    if (currentStep === 2) fields = ["residence_wilaya", "institution"];
    if (currentStep === 4) fields = ["username", "email", "password"];
    
    const isValid = await form.trigger(fields as any);
    if (isValid) setCurrentStep(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <Stepper steps={steps} currentStep={currentStep} />
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{steps[currentStep-1].label}</CardTitle>
              <CardDescription>{steps[currentStep-1].description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentStep === 1 && (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("firstName")}</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("lastName")}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              // نسخ اللقب للولي تلقائياً إذا كان الحقل فارغاً أو يتبع لقب الطفل
                              form.setValue("guardian_last_name", e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="first_name_fr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("firstNameFr")}</FormLabel>
                        <FormControl><Input {...field} placeholder="Prenom" className="text-left font-sans" dir="ltr" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="last_name_fr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("lastNameFr")}</FormLabel>
                        <FormControl><Input {...field} placeholder="Nom" className="text-left font-sans" dir="ltr" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("gender")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder={tCommon("select")} /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ذكر">ذكر</SelectItem>
                            <SelectItem value="أنثى">أنثى</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birth_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("birthDate")}</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birth_wilaya"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("birthWilaya")}</FormLabel>
                        <Select 
                          onValueChange={(val) => {
                            field.onChange(val);
                            const selectedWilaya = wilayas.find(w => w.name_ar === val);
                            if (selectedWilaya) {
                              fetchMunicipalities(selectedWilaya.code);
                            }
                          }} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={isLoadingLocations ? "جاري التحميل..." : tCommon("select")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {wilayas.map((w) => (
                              <SelectItem key={w.code} value={w.name_ar}>
                                {w.name_ar}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birth_commune"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("birthCommune")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={municipalities.length === 0 ? "اختر الولاية أولاً" : tCommon("select")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {municipalities.map((m) => (
                              <SelectItem key={m.id} value={m.name_ar}>
                                {m.name_ar}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="national_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("nationalId")}</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="has_disabilities"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t("hasDisabilities")}</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-bold mb-4 text-blue-800">وثائق المنخرط (مسارات الملفات)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="photo_path"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>مسار الصورة</FormLabel>
                          <FormControl><Input {...field} dir="ltr" placeholder="/path/to/photo.jpg" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="birth_certificate_path"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>مسار شهادة الميلاد</FormLabel>
                          <FormControl><Input {...field} dir="ltr" placeholder="/path/to/birth_cert.pdf" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="national_id_path"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>مسار بطاقة التعريف</FormLabel>
                          <FormControl><Input {...field} dir="ltr" placeholder="/path/to/national_id.pdf" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                </>
              )}

              {currentStep === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="residence_wilaya"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("wilaya")}</FormLabel>
                        <Select 
                          onValueChange={(val) => {
                            field.onChange(val);
                            const selectedWilaya = wilayas.find(w => w.name_ar === val);
                            if (selectedWilaya) {
                              fetchMunicipalities(selectedWilaya.code);
                            }
                          }} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={isLoadingLocations ? "جاري التحميل..." : tCommon("select")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {wilayas.map((w) => (
                              <SelectItem key={w.code} value={w.name_ar}>
                                {w.name_ar}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birth_commune"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("commune")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={municipalities.length === 0 ? "اختر الولاية أولاً" : tCommon("select")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {municipalities.map((m) => (
                              <SelectItem key={m.id} value={m.name_ar}>
                                {m.name_ar}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="residence_wilaya"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("residenceWilaya")}</FormLabel>
                        <Select 
                          onValueChange={(val) => {
                            field.onChange(val);
                            const selectedWilaya = wilayas.find(w => w.name_ar === val);
                            if (selectedWilaya) {
                              fetchMunicipalities(selectedWilaya.code);
                            }
                          }} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={isLoadingLocations ? "جاري التحميل..." : tCommon("select")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {wilayas.map((w) => (
                              <SelectItem key={w.code} value={w.name_ar}>
                                {w.name_ar}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="residence_commune"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("residenceCommune")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={municipalities.length === 0 ? "اختر الولاية أولاً" : tCommon("select")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {municipalities.map((m) => (
                              <SelectItem key={m.id} value={m.name_ar}>
                                {m.name_ar}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("address")}</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="institution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("institution")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={isLoadingInstitutions ? "جاري التحميل..." : tCommon("select")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {institutions.map((inst) => (
                              <SelectItem key={inst.id} value={inst.name_ar}>
                                {inst.name_ar}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="academic_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("academicLevel")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={tCommon("select")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="إبتدائي">إبتدائي</SelectItem>
                            <SelectItem value="متوسط">متوسط</SelectItem>
                            <SelectItem value="ثانوي">ثانوي</SelectItem>
                            <SelectItem value="جامعي">جامعي</SelectItem>
                            <SelectItem value="آخر">آخر</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="membership_year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("membershipYear")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ministry_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("ministryNumber")}</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {currentStep === 3 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="guardian_first_name"
                    render={({ field }) => (
                      <FormItem className="relative guardian-search-container">
                        <FormLabel>{t("guardian.firstName")}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              searchGuardians(e.target.value, form.getValues("guardian_last_name"));
                            }}
                            placeholder="ابحث بالاسم الشخصي..."
                          />
                        </FormControl>
                        {isSearchingGuardian && (
                          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg p-2 text-center text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
                            جاري البحث...
                          </div>
                        )}
                        {guardianSearchResults.length > 0 && (
                          <div className="absolute top-full left-0 z-[100] w-full mt-2 bg-white border rounded-md shadow-xl max-h-60 overflow-y-auto min-w-[300px]">
                            <div className="p-2 border-b bg-gray-50 flex justify-between items-center sticky top-0 z-20">
                              <span className="text-xs font-bold text-gray-500">نتائج البحث</span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0" 
                                onClick={() => setGuardianSearchResults([])}
                              >
                                <ArrowLeft className="w-3 h-3 rotate-180" />
                              </Button>
                            </div>
                            {guardianSearchResults.map((g) => (
                              <div
                                key={g.id}
                                className="p-3 cursor-pointer hover:bg-blue-50 border-b last:border-0 transition-colors"
                                onClick={() => {
                                  form.setValue("guardian_first_name", g.first_name);
                                  form.setValue("guardian_last_name", g.last_name);
                                  form.setValue("guardian_phone", g.phone || "");
                                  form.setValue("guardian_national_id", g.national_id || "");
                                  setGuardianSearchResults([]);
                                  toast.success(`تم اختيار الولي: ${g.first_name} ${g.last_name}`);
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="font-bold text-blue-900">{g.first_name} {g.last_name}</div>
                                  <Badge variant="outline" className="text-[10px]">ولي موجود</Badge>
                                </div>
                                <div className="flex flex-col gap-1 mt-1 text-xs text-muted-foreground">
                                  {g.national_id && (
                                    <div className="flex items-center gap-1">
                                      <Shield className="w-3 h-3" />
                                      {g.national_id}
                                    </div>
                                  )}
                                  {g.phone && (
                                    <div className="flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      {g.phone}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="guardian_last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("guardian.lastName")}</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="guardian_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("guardian.phone")}</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="guardian_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("email")} (الولي)</FormLabel>
                        <FormControl><Input {...field} type="email" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="guardian_relationship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("guardian.relationship")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder={tCommon("select")} /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="أب">أب</SelectItem>
                            <SelectItem value="أم">أم</SelectItem>
                            <SelectItem value="أخ">أخ</SelectItem>
                            <SelectItem value="أخت">أخت</SelectItem>
                            <SelectItem value="جد">جد</SelectItem>
                            <SelectItem value="جدة">جدة</SelectItem>
                            <SelectItem value="خال">خال</SelectItem>
                            <SelectItem value="خالة">خالة</SelectItem>
                            <SelectItem value="عم">عم</SelectItem>
                            <SelectItem value="عمة">عمة</SelectItem>
                            <SelectItem value="أخرى">أخرى</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="guardian_national_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("guardian.nationalId")}</FormLabel>
                        <div className="flex gap-2">
                          <FormControl><Input {...field} placeholder="البحث برقم التعريف الوطني..." /></FormControl>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={async () => {
                              if (!field.value) {
                                toast.error("يرجى إدخال رقم التعريف الوطني للبحث");
                                return;
                              }
                              try {
                                const response = await membersApi.getGuardianByNationalId(field.value);
                                const g = response.data;
                                if (g) {
                                  form.setValue("guardian_first_name", g.first_name);
                                  form.setValue("guardian_last_name", g.last_name);
                                  form.setValue("guardian_phone", g.phone || "");
                                  toast.success("تم العثور على بيانات الولي");
                                }
                              } catch (error) {
                                toast.error("لم يتم العثور على ولي بهذا الرقم");
                              }
                            }}
                          >
                            <User className="w-4 h-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="candidate_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("guardian.candidatePhone")}</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="guardian_national_id_path"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>مسار بطاقة تعريف الولي</FormLabel>
                        <FormControl><Input {...field} dir="ltr" placeholder="/path/to/guardian_id.pdf" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {currentStep === 4 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("username")}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input {...field} className="pl-10 text-left font-sans" dir="ltr" placeholder="john.doe.1234" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("email")}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input {...field} type="email" className="pl-10 text-left font-sans" dir="ltr" placeholder="example@email.com" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("password")}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input {...field} className="pl-10 text-left font-sans" dir="ltr" placeholder="••••••••" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="md:col-span-2 p-4 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-bold mb-1">ملاحظة حول البيانات الرقمية:</p>
                      <p>إذا تركت هذه الحقول فارغة، سيقوم النظام بتوليدها تلقائياً عند الحفظ لضمان إمكانية التسجيل في منصة YouthConnect لاحقاً.</p>
                      <p className="mt-1 text-xs font-medium">سيتم استخدام بريد الولي تلقائياً إذا لم توفر بريداً للمنخرط.</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : router.back()}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {currentStep === 1 ? tCommon("cancel") : tCommon("previous")}
              </Button>
              
              {currentStep < 4 ? (
                <Button type="button" onClick={nextStep}>
                  {tCommon("next")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {isEdit ? tCommon("save") : tCommon("create")}
                </Button>
              )}
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
