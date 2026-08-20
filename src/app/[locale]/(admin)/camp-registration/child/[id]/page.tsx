"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, User, Phone, MapPin, Loader2, CheckCircle, Clock, FileText, Image as ImageIcon, FolderOpen, Download, ShieldAlert as ShieldAlertIcon, UserCheck, UserPlus } from "lucide-react";
import { Link } from "@/i18n/routing";
import { campRegistrationApi, CampRegistration, RegistrationBatch } from "@/lib/api/camp-registration";
import { SyncStatusBadge, type SyncStatus } from "@/components/shared/SyncStatusBadge";
import { getApiBaseUrl } from "@/lib/api/client";
import { toast } from "sonner";
import { PermissionGuard } from "@/hooks/useRequirePermission";

function getStorageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:") || path.startsWith("data:")) return path;
  const base = getApiBaseUrl().replace('/api/v1', '');
  return `${base}/storage/${path}`;
}

export default function ChildDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations();
  const childId = params.id as string;
  
  const [child, setChild] = useState<CampRegistration | null>(null);
  const [batch, setBatch] = useState<RegistrationBatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [folderFiles, setFolderFiles] = useState<Array<{ name: string; path: string; size: number | null; last_modified: string | null; url: string }>>([]);
  const [isFolderLoading, setIsFolderLoading] = useState(false);
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [isSyncingFiles, setIsSyncingFiles] = useState(false);

  const fetchFolderFiles = async () => {
    if (!child) return;
    try {
      setIsFolderLoading(true);
      const res = await campRegistrationApi.getChildFiles(child.batch_id, child.id);
      setFolderFiles(res.data.files || []);
    } catch (err) {
      console.error("Error fetching folder files:", err);
    } finally {
      setIsFolderLoading(false);
    }
  };

  const handleSyncFiles = async () => {
    if (!child) return;
    if (!confirm("هل تريد إعادة تحميل الصورة وشهادة الميلاد من المنصة الوزارية؟ لن يتم تغيير البيانات الشخصية.")) return;
    
    setIsSyncingFiles(true);
    try {
      const res = await campRegistrationApi.syncChildFilesFromLocal(child.id);
      toast.success(res.data.message || "تم إعادة تحميل الملفات بنجاح");
      // Reload child data to reflect changes
      const updatedRes = await campRegistrationApi.getChild(childId);
      setChild(updatedRes.data);
      // Also refresh folder files
      try {
        const filesRes = await campRegistrationApi.getChildFiles(updatedRes.data.batch_id, updatedRes.data.id);
        setFolderFiles(filesRes.data.files || []);
      } catch (fErr) { /* ignore */ }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "فشل في إعادة تحميل الملفات");
    } finally {
      setIsSyncingFiles(false);
    }
  };

  useEffect(() => {
    const fetchChildAndFiles = async () => {
      try {
        setIsLoading(true);
        const res = await campRegistrationApi.getChild(childId);
        const childData = res.data;
        setChild(childData);

        // Fetch batch details to get batch name
        try {
          const batchRes = await campRegistrationApi.getBatch(childData.batch_id);
          setBatch(batchRes.data);
        } catch (bErr) {
          console.error("Error fetching batch:", bErr);
        }
        
        // Fetch folder files automatically to enable dynamic attachment linking
        try {
           setIsFolderLoading(true);
           const filesRes = await campRegistrationApi.getChildFiles(childData.batch_id, childData.id);
           setFolderFiles(filesRes.data.files || []);
        } catch (fErr) {
           console.error("Error fetching folder files:", fErr);
        } finally {
           setIsFolderLoading(false);
        }
      } catch (err) {
        console.error("Error fetching child:", err);
      } finally {
        setIsLoading(false);
      }
    };
    if (childId) fetchChildAndFiles();
  }, [childId]);

  if (isLoading) {

    return (
            
            <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
      ;
  }

  if (!child) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <h2 className="text-xl font-bold mb-4">الطفل غير موجود</h2>
        <Link href="/camp-registration">
          <Button variant="outline">العودة للتسجيلات</Button>
        </Link>
      </div>
    );
  }

  const getDynamicUrl = (dbPath: string | null | undefined, keywords: string[]) => {
    if (dbPath) return getStorageUrl(dbPath);
    if (!folderFiles) return null;
    const found = folderFiles.find(f => keywords.some(k => f.name.toLowerCase().includes(k.toLowerCase())));
    if (found) return found.url;
    return null;
  };

  const photoUrl = getDynamicUrl(child.child_photo_path, ['.jpg', '.png', '.jpeg', 'صورة']);
  const birthCertUrl = getDynamicUrl(child.birth_certificate_path, ['clean', 'id', 'شهادة', 'ميلاد']);
  const receiptUrl = getDynamicUrl(child.screenshot_path, ['وصل', 'receipt', 'screenshot']);

  return (
  <PermissionGuard module="camp_registration" action="view">
      <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/camp-registration/${child.batch_id}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{child.child_first_name} {child.child_last_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">تفاصيل الطفل المسجل في المخيم</p>
            {batch && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <Badge variant="outline" className="font-normal bg-primary/5">{batch.name}</Badge>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 shadow-sm border-border/40">
          <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              المعلومات الشخصية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex flex-col sm:flex-row gap-8">
              {/* Photo */}
              <div className="shrink-0 flex justify-center sm:justify-start">
                {photoUrl ? (
                  <a href={photoUrl} target="_blank" rel="noreferrer" className="block relative h-36 w-36 rounded-2xl overflow-hidden border border-border/60 shadow-sm hover:shadow-md transition-shadow group">
                    <img src={photoUrl} alt="صورة الطفل" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                  </a>
                ) : (
                  <div className="flex flex-col items-center justify-center h-36 w-36 rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 text-muted-foreground">
                    <User className="h-10 w-10 opacity-30 mb-2" />
                    <span className="text-xs opacity-60">بدون صورة</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">الاسم واللقب</p>
                  <p className="font-medium text-lg">{child.child_first_name} {child.child_last_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">تاريخ الميلاد</p>
                  <p className="font-medium">{child.birth_date}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">الجنس</p>
                  <p className="font-medium">{child.gender === 'MALE' ? 'ذكر' : child.gender === 'FEMALE' ? 'أنثى' : 'غير محدد'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">مكان الميلاد</p>
                  <p className="font-medium">{child.birth_commune} ({child.birth_wilaya})</p>
                </div>
                {child.unified_member_number && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">رقم الانخراط الموحد</p>
                    <p className="font-medium font-mono text-sm" dir="ltr">{child.unified_member_number}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-border/50">
              <h3 className="font-bold mb-4 text-base flex items-center gap-2">
                <UsersIcon /> معلومات الولي
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">اسم الولي</p>
                  <p className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground/70" />
                    {child.parent_first_name} {child.parent_last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">رقم الهاتف</p>
                  <p className="font-medium flex items-center gap-2" dir="ltr">
                    {child.parent_phone}
                    <Phone className="h-4 w-4 text-muted-foreground/70" />
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground mb-1">عنوان الإقامة</p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground/70" />
                    {child.address ? `${child.address} - ` : ''}{child.residence_commune} ({child.residence_wilaya})
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/40">
          <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
            <CardTitle className="text-lg">الوثائق والحالة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div>
              <p className="text-sm text-muted-foreground mb-2">حالة التسجيل</p>
              <Badge className={
                child.status === 'success' || child.status === 'completed' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' :
                child.status === 'pending' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' :
                child.status === 'processing' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' :
                'bg-red-100 text-red-800 hover:bg-red-100'
              }>
                {child.status === 'success' || child.status === 'completed' ? 'مكتمل / ناجح' : 
                 child.status === 'pending' ? 'في الانتظار' : 
                 child.status === 'processing' ? 'قيد المعالجة' :
                 'فشل / خطأ'}
              </Badge>
            </div>

            {/* Force Registration Info */}
            {child.force_registration && (
              <div className="space-y-3 pt-2">
                <div className="col-span-full">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-bold">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364A9 9 0 1112 3a9 9 0 017.364 4.636z" /></svg>
                    {t('camp-registration.force_registered')}
                  </span>
                </div>
                {child.force_registered_first_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <ShieldAlertIcon className="w-4 h-4 text-red-500" />
                    <span className="text-muted-foreground">{t('camp-registration.force_registered_first_name')}:</span>
                    <span className="font-mono text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded" dir="ltr">{child.force_registered_first_name}</span>
                    <span className="text-[10px] text-gray-400 italic">(UNICODE: {child.force_registered_first_name.split('').map(c => 'U+' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ')})</span>
                  </div>
                )}
                {child.force_registered_last_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <ShieldAlertIcon className="w-4 h-4 text-red-500" />
                    <span className="text-muted-foreground">{t('camp-registration.force_registered_last_name')}:</span>
                    <span className="font-mono text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">{child.force_registered_last_name}</span>
                  </div>
                )}
                {child.force_registered_number && !String(child.force_registered_number).startsWith('RCPT-') && (
                  <div className="flex items-center gap-2 text-sm">
                    <ShieldAlertIcon className="w-4 h-4 text-green-500" />
                    <span className="text-muted-foreground">{t('camp-registration.force_registered_number')}:</span>
                    <span className="font-mono text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">{child.force_registered_number}</span>
                  </div>
                )}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-700">
                  <p>{t('camp-registration.force_registered_info')}</p>
                </div>
              </div>
            )}

            {/* رابط المنخرط */}
            {child.member_id && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {t('camp-registration.linked_member')}
                  </span>
                  <Link
                    href={`/${params.locale}/members/${child.member_id}`}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline mr-auto"
                  >
                    {t('camp-registration.view_member')}
                  </Link>
                </div>
                {child.sync_status && (
                  <div className="mt-2 flex items-center gap-2">
                    <SyncStatusBadge status={child.sync_status as SyncStatus} locale={params.locale as "ar" | "fr" | "en"} />
                    {child.last_synced_at && (
                      <span className="text-[11px] text-muted-foreground/60" dir="ltr">
                        {new Date(child.last_synced_at).toLocaleDateString(params.locale === "ar" ? "ar-DZ" : params.locale === "fr" ? "fr-DZ" : "en-DZ", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* زر تحويل لمنخرط - يظهر فقط إذا لم يكن مربوطاً */}
            {!child.member_id && child.status === 'success' && (
              <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      {t('camp-registration.convert_to_member_title') || 'إنشاء منخرط من هذا التسجيل'}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                      {t('camp-registration.convert_to_member_desc') || 'سينشئ منخرطاً جديداً في النظام ويربطه بهذا التسجيل، مما يتيح مزامنة البيانات تلقائياً'}
                    </p>
                  </div>
                  <Button 
                    variant="default" 
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={async () => {
                      try {
                        await campRegistrationApi.convertToMember(childId);
                        toast.success(t('camp-registration.convert_success') || 'تم إنشاء المنخرط وربطه بنجاح');
                        router.refresh(); // لتحديث الصفحة وعرض رابط المنخرط
                      } catch (error) {
                        console.error(error);
                        toast.error(t('camp-registration.convert_error') || 'فشل في إنشاء المنخرط');
                      }
                    }}
                  >
                    <UserPlus className="h-4 w-4 ml-2" />
                    {t('camp-registration.convert_to_member_btn') || 'تحويل لمنخرط'}
                  </Button>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-border/50 space-y-3">
              <h3 className="font-bold mb-3 text-sm">الملفات المرفقة</h3>
              
              <a 
                href={photoUrl || '#'} 
                target={photoUrl ? "_blank" : undefined}
                rel="noreferrer"
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${photoUrl ? 'hover:bg-primary/5 hover:border-primary/30 border-border/60 bg-card' : 'opacity-60 bg-muted/30 border-dashed cursor-not-allowed'}`}
                onClick={(e) => !photoUrl && e.preventDefault()}
              >
                <div className={`p-2 rounded-md ${photoUrl ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">الصورة الشخصية</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{photoUrl ? 'اضغط للعرض' : 'غير متوفر'}</p>
                </div>
              </a>

              <a 
                href={birthCertUrl || '#'} 
                target={birthCertUrl ? "_blank" : undefined}
                rel="noreferrer"
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${birthCertUrl ? 'hover:bg-primary/5 hover:border-primary/30 border-border/60 bg-card' : 'opacity-60 bg-muted/30 border-dashed cursor-not-allowed'}`}
                onClick={(e) => !birthCertUrl && e.preventDefault()}
              >
                <div className={`p-2 rounded-md ${birthCertUrl ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">شهادة الميلاد</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{birthCertUrl ? 'اضغط للعرض' : 'غير متوفر'}</p>
                </div>
              </a>

              <a 
                href={receiptUrl || '#'} 
                target={receiptUrl ? "_blank" : undefined}
                rel="noreferrer"
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${receiptUrl ? 'hover:bg-primary/5 hover:border-primary/30 border-border/60 bg-card' : 'opacity-60 bg-muted/30 border-dashed cursor-not-allowed'}`}
                onClick={(e) => !receiptUrl && e.preventDefault()}
              >
                <div className={`p-2 rounded-md ${receiptUrl ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">وصل التسجيل</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{receiptUrl ? 'اضغط للعرض' : 'غير متوفر'}</p>
                </div>
              </a>
            </div>

            <button
              onClick={handleSyncFiles}
              disabled={isSyncingFiles}
              className="w-full mt-2 py-2.5 px-4 rounded-lg border border-dashed border-primary/30 bg-primary/5 text-primary text-sm font-medium hover:bg-primary/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncingFiles ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري إعادة التحميل...
                </>
              ) : (
                <>
                  🔄 إعادة تحميل الصورة وشهادة الميلاد من المنصة الوزارية
                </>
              )}
            </button>

            {/* Folder Browser Dialog */}
            <Dialog open={isFolderOpen} onOpenChange={isOpen => {
              setIsFolderOpen(isOpen);
              if (isOpen && folderFiles.length === 0) fetchFolderFiles();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full mt-4 h-11 border-dashed">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  الاطلاع على مجلد تخزين الطفل
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl sm:max-w-2xl md:max-w-3xl w-[95vw] max-h-[80vh] overflow-hidden flex flex-col" dir="rtl">
                <DialogHeader>
                  <DialogTitle>ملفات المجلد الخاص بالطفل</DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 mt-4 pr-2">
                  {isFolderLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : folderFiles.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground bg-muted/20 rounded-md border border-dashed">
                      <FolderOpen className="h-10 w-10 mx-auto opacity-20 mb-3" />
                      لا يوجد أي ملفات في مجلد التخزين
                    </div>
                  ) : (
                    folderFiles.map((file, i) => (
                      <div key={i} className="grid grid-cols-[auto_1fr_auto] items-center p-3 border rounded-lg hover:bg-muted/30 transition-colors gap-3 w-full">
                        <div className="relative w-10 h-10 bg-primary/10 text-primary rounded-md flex items-center justify-center overflow-hidden shrink-0 border border-primary/20">
                          {file.name.match(/\.(jpe?g|png|webp|gif|jfif)$/i) ? (
                            <img src={file.url} alt={file.name} className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" loading="lazy" />
                          ) : (
                            <FileText className="h-5 w-5 z-20 relative" />
                          )}
                        </div>
                        <div className="min-w-0 flex flex-col" dir="ltr">
                          <p className="font-medium text-sm truncate text-left" title={file.name}>{file.name}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate text-left" title={file.path}>{file.path}</p>
                        </div>
                        <a 
                          href={file.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-2 shrink-0 hover:bg-primary/10 rounded-md transition-colors"
                          title="تحميل / عرض"
                        >
                          <Download className="h-5 w-5 text-primary" />
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>

          </CardContent>
        </Card>
      </div>
    </div>
  </PermissionGuard>
            );
}

function UsersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users h-5 w-5 text-primary"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  )
}
