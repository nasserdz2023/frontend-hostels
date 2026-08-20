'use client';

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  ArrowRight, Phone, Mail, Shield, MapPin, 
  User, Calendar, Users, Loader2, Eye, Upload, FileText
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useRouter } from "@/i18n/routing";
import { membersApi, GuardianDetail } from "@/lib/api/members";
import { getApiBaseUrl } from "@/lib/api/client";
import { PermissionGuard } from "@/hooks/useRequirePermission";

function getStorageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = getApiBaseUrl().replace('/api/v1', '');
  return `${base}/storage/${path}`;
}

export default function GuardianDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [guardian, setGuardian] = useState<GuardianDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadGuardian();
    }
  }, [params.id]);

  const loadGuardian = async () => {
    setIsLoading(true);
    try {
      const response = await membersApi.getGuardianDetail(params.id as string);
      setGuardian(response.data);
    } catch (error) {
      toast.error("فشل في تحميل تفاصيل الولي");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadNationalId = async (file: File) => {
    if (!guardian) return;
    setIsUploading(true);
    try {
      await membersApi.uploadGuardianNationalId(guardian.id, file);
      toast.success("تم رفع بطاقة التعريف بنجاح");
      loadGuardian();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "فشل في رفع الملف");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {

    return (
            
            <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-muted-foreground">جاري تحميل تفاصيل الولي...</p>
      </div>
    )
      ;
  }

  if (!guardian) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
        <h2 className="text-2xl font-bold">الولي غير موجود</h2>
        <Button onClick={() => router.back()} className="mt-4">العودة للخلف</Button>
      </div>
    );
  }

  return (
  <PermissionGuard module="guardians" action="view">
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowRight className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{guardian.first_name} {guardian.last_name}</h1>
            <p className="text-muted-foreground">ملف ولي الأمر والمنخرطين التابعين له</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Guardian Info Card */}
        <Card className="lg:col-span-1 shadow-sm border-t-4 border-t-blue-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              المعلومات الشخصية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Shield className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-xs text-muted-foreground">رقم التعريف الوطني</p>
                  <p className="font-medium">{guardian.national_id || "غير مسجل"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                  <p className="font-medium">{guardian.phone || "غير مسجل"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                  <p className="font-medium">{guardian.email || "غير مسجل"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-xs text-muted-foreground">مكان الميلاد / الإقامة</p>
                  <p className="font-medium">{guardian.birth_wilaya || "غير محدد"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-xs text-muted-foreground">تاريخ التسجيل في النظام</p>
                  <p className="font-medium">{new Date(guardian.created_at).toLocaleDateString('ar-DZ')}</p>
                </div>
              </div>

              {/* National ID Card */}
              <div className="border-t pt-3 mt-3">
                <p className="text-xs text-muted-foreground mb-2">بطاقة التعريف الوطنية</p>
                {guardian.national_id_path ? (
                  <a href={getStorageUrl(guardian.national_id_path) || ''} target="_blank" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                    <FileText className="w-4 h-4 text-green-600" />
                    عرض بطاقة التعريف
                  </a>
                ) : (
                  <label className="flex items-center gap-2 px-3 py-2 border-2 border-dashed rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm">
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-gray-400" />}
                    <span className="text-gray-400">{isUploading ? 'جاري الرفع...' : 'رفع بطاقة التعريف'}</span>
                    <input type="file" className="hidden" accept="image/*,.pdf" disabled={isUploading}
                      onChange={(e) => e.target.files?.[0] && handleUploadNationalId(e.target.files[0])} />
                  </label>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Linked Members Card */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  المنخرطون التابعون ({guardian.members.length})
                </CardTitle>
                <CardDescription>قائمة الأبناء أو المكفولين المرتبطين بهذا الولي</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {guardian.members.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>لا يوجد منخرطون مرتبطون بهذا الولي حالياً.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {guardian.members.map((member) => (
                  <div key={member.id} className="p-4 border rounded-xl hover:bg-slate-50 transition-colors group relative">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <User className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-lg truncate">{member.first_name} {member.last_name}</h4>
                        <p className="text-xs text-muted-foreground font-mono">{member.local_number}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] h-5">
                            {member.membership_status === 'ACTIVE' ? 'نشط' : 'غير نشط'}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {member.birth_date}
                          </span>
                        </div>
                      </div>
                      <Link href={`/members/${member.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  </PermissionGuard>
              );
}
