'use client';

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft, Printer, Download, Loader2, User,
  Building2, Hash, CalendarDays, ShieldCheck,
  Barcode, QrCode
} from "lucide-react";
import { membersApi, MemberCard } from "@/lib/api/members";
import { getApiBaseUrl } from "@/lib/api/client";
import { PermissionGuard } from "@/hooks/useRequirePermission";

/** Convert storage path to full URL */
function getStorageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = getApiBaseUrl().replace('/api/v1', '');
  return `${base}/storage/${path}`;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "نشط", color: "text-green-700 bg-green-50 border-green-200" },
  EXPIRED: { label: "منتهي", color: "text-gray-600 bg-gray-50 border-gray-200" },
  CANCELLED: { label: "ملغي", color: "text-red-700 bg-red-50 border-red-200" },
};

export default function MemberCardPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;
  const printRef = useRef<HTMLDivElement>(null);

  const [cardData, setCardData] = useState<MemberCard | null>(null);
  const [memberFull, setMemberFull] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    loadData();
  }, [memberId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load both card data and full member data for status/extra info
      const [cardRes, memberRes] = await Promise.all([
        membersApi.getCard(memberId),
        membersApi.get(memberId),
      ]);
      setCardData(cardRes.data);
      setMemberFull(memberRes.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "فشل في تحميل بيانات البطاقة");
      router.push(`/members/${memberId}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    // Wait for any rendering, then print
    setTimeout(() => {
      window.print();
      setTimeout(() => setIsPrinting(false), 1000);
    }, 300);
  };

  if (isLoading) {

    return (
            
            <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-9 w-9 rounded-lg bg-muted" />
            <div className="space-y-2">
              <div className="h-6 w-40 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-muted rounded-lg" />
            <div className="h-9 w-24 bg-muted rounded-lg" />
          </div>
        </div>
        {/* Card skeleton */}
        <div className="max-w-md mx-auto animate-pulse">
          <div className="rounded-2xl border-2 bg-card overflow-hidden">
            <div className="h-3 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
            <div className="p-8 space-y-6">
              <div className="flex justify-center">
                <div className="w-28 h-28 rounded-full bg-muted" />
              </div>
              <div className="space-y-3 text-center">
                <div className="h-6 w-48 bg-muted rounded mx-auto" />
                <div className="h-4 w-36 bg-muted rounded mx-auto" />
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-4 w-32 bg-muted rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
      ;
  }

  if (!cardData || !memberFull) return null;

  const statusInfo = STATUS_LABELS[memberFull.membership_status] || STATUS_LABELS.ACTIVE;
  const photoUrl = cardData.photo_url || memberFull.photo_path;
  const fullPhotoUrl = getStorageUrl(photoUrl) || null;
  const initials = `${cardData.first_name?.[0] || ''}${cardData.last_name?.[0] || ''}`.toUpperCase() || '?';

  return (
  <PermissionGuard module="members" action="view">
      <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">بطاقة المنخرط</h1>
            <p className="text-muted-foreground text-sm">
              {cardData.first_name} {cardData.last_name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePrint} disabled={isPrinting}>
            {isPrinting ? (
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
            ) : (
              <Printer className="w-4 h-4 ml-2" />
            )}
            طباعة
          </Button>
          <Button variant="outline" onClick={() => router.push(`/members/${memberId}`)}>
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة للتفاصيل
          </Button>
        </div>
      </div>

      {/* ===== MEMBERSHIP CARD ===== */}
      <div className="flex justify-center" ref={printRef}>
        <div
          id="member-card"
          className="w-full max-w-sm print:max-w-sm print:mx-auto print:shadow-none"
        >
          {/* Card */}
          <div className="rounded-2xl border-2 bg-card overflow-hidden shadow-lg print:shadow-none print:border-2 relative">
            {/* Top accent bar */}
            <div className={`h-2 bg-gradient-to-l ${
              memberFull.membership_status === 'ACTIVE'
                ? 'from-green-500 via-emerald-400 to-green-300'
                : memberFull.membership_status === 'EXPIRED'
                ? 'from-gray-400 via-gray-300 to-gray-200'
                : 'from-red-500 via-red-400 to-red-300'
            }`} />

            {/* Card content */}
            <div className="p-6 space-y-5">
              {/* Logo & Title */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-2">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-sm font-bold text-foreground">مديرية الشباب والرياضة</h2>
                <p className="text-[10px] text-muted-foreground">بوسعادة</p>
              </div>

              {/* Photo & Name */}
              <div className="flex flex-col items-center gap-3">
                {/* Photo */}
                {fullPhotoUrl ? (
                  <div className="w-28 h-28 rounded-full border-4 border-muted/50 overflow-hidden shadow-sm">
                    <img
                      src={fullPhotoUrl}
                      alt={cardData.first_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div
                      className="w-full h-full items-center justify-center bg-muted hidden"
                      aria-hidden="true"
                    >
                      <span className="text-2xl font-bold text-muted-foreground">{initials}</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-28 h-28 rounded-full border-4 border-muted/50 bg-muted flex items-center justify-center shadow-sm">
                    <User className="w-10 h-10 text-muted-foreground/60" />
                  </div>
                )}

                {/* Name */}
                <div className="text-center">
                  <h3 className="text-xl font-bold text-foreground">
                    {cardData.first_name} {cardData.last_name}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5" dir="ltr">
                    {cardData.local_number}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex justify-center">
                <Badge className={`${statusInfo.color} border text-xs px-3 py-1 font-medium`} variant="outline">
                  {statusInfo.label}
                </Badge>
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-border" />

              {/* Details */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    المؤسسة
                  </span>
                  <span className="font-medium text-foreground text-left max-w-[60%] truncate">
                    {cardData.institution || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" />
                    سنة الانخراط
                  </span>
                  <span className="font-semibold text-foreground">
                    {cardData.membership_year || '—'}
                  </span>
                </div>
                {cardData.card_url && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Barcode className="w-3.5 h-3.5" />
                      الرقم التسلسلي
                    </span>
                    <span className="font-mono text-xs text-foreground" dir="ltr">
                      {cardData.card_url.split('/').pop()?.slice(0, 12) || '—'}
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom QR / Serial */}
              <div className="flex justify-between items-center pt-2 border-t border-dashed border-border">
                <div className="text-[9px] text-muted-foreground/60">
                  <p>DJS Bousaada</p>
                  <p>عضو منذ {cardData.membership_year || '—'}</p>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/60">
                  <QrCode className="w-3.5 h-3.5" />
                  <span dir="ltr">{cardData.local_number}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== PRINT INSTRUCTIONS ===== */}
      <div className="max-w-sm mx-auto no-print">
        <div className="p-4 rounded-lg border bg-muted/30 text-center">
          <p className="text-xs text-muted-foreground">
            استخدم زر <strong>طباعة</strong> للحصول على نسخة مطبوعة من البطاقة
          </p>
        </div>
      </div>

      {/* ===== PRINT STYLES ===== */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #member-card {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            min-height: 100vh !important;
            padding: 2rem !important;
          }
          #member-card > div {
            box-shadow: none !important;
            border: 2px solid #e5e7eb !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
          img {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: auto;
            margin: 0;
          }
        }
      `}</style>
    </div>
  </PermissionGuard>
              );
}