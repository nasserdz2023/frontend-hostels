'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, Calendar, User } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { campRegistrationApi } from '@/lib/api/camp-registration';
import { PermissionGuard } from "@/hooks/useRequirePermission";

interface Screenshot {
  id: string;
  batch_id: string;
  registration_id: string;
  step_name: string;
  screenshot_url: string;
  created_at: string;
  child_name?: string;
}

export default function ScreenshotsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const batchId = params.id as string;
  const childId = searchParams.get('childId') || undefined;
  
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (batchId) {
      fetchScreenshots();
    }
  }, [batchId, childId]);

  const fetchScreenshots = async () => {
    try {
      setLoading(true);
      const response = await campRegistrationApi.getScreenshots(batchId, childId);
      setScreenshots(response.data);
    } catch (error) {
      console.error('Error fetching screenshots:', error);
      toast.error('فشل في تحميل لقطات الشاشة');
    } finally {
      setLoading(false);
    }
  };

  const getStepLabel = (stepName: string) => {
    const labels: Record<string, string> = {
      '01_form_loaded': 'النموذج محمّل',
      '02_page1_child_info_filled': 'الصفحة 1 - معلومات الطفل',
      '03_page2_parent_loaded': 'الصفحة 2 - معلومات الولي',
      '04_page2_parent_filled': 'الصفحة 2 - معلومات الولي مملوءة',
      '05_final_form_before_submit': 'قبل الإرسال',
      '06_form_submitted': 'تم الإرسال',
      '07_submission_failed': 'فشل الإرسال',
    };
    return labels[stepName] || stepName;
  };

  const getStepColor = (stepName: string) => {
    if (stepName.includes('failed')) return 'destructive';
    if (stepName.includes('success') || stepName.includes('submitted')) return 'default';
    return 'secondary';
  };

  if (loading) {

    return (
            
            <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
      ;
  }

  return (
  <PermissionGuard module="camp_registration" action="view">
      <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            رجوع
          </Button>
          <div>
            <h1 className="text-3xl font-bold">لقطات شاشة للتسجيل</h1>
            <p className="text-muted-foreground">عرض جميع لقطات الشاشة لعملية التسجيل</p>
          </div>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {screenshots.length} لقطة شاشة
        </Badge>
      </div>

      {/* Screenshots Grid */}
      {screenshots.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-lg">لا توجد لقطات شاشة</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {screenshots.map((screenshot) => (
            <Card key={screenshot.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {getStepLabel(screenshot.step_name)}
                  </CardTitle>
                  <Badge variant={getStepColor(screenshot.step_name)}>
                    {screenshot.step_name}
                  </Badge>
                </div>
                {screenshot.child_name && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>{screenshot.child_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(screenshot.created_at).toLocaleString('ar-DZ')}</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div
                  className="relative cursor-pointer group"
                  onClick={() => setSelectedImage(screenshot.screenshot_url)}
                >
                  <img
                    src={screenshot.screenshot_url}
                    alt={screenshot.step_name}
                    className="w-full h-64 object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                    <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-2xl"
            >
              ✕
            </button>
            <img
              src={selectedImage}
              alt="Screenshot"
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  </PermissionGuard>
              );
}