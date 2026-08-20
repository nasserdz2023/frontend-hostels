import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { campTripsApi, CampTrip } from '@/lib/api/camp-trips';
import { Member } from '@/lib/api/members';

interface AddToCampTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMembers: Member[];
  onSuccess: () => void;
}

export function AddToCampTripModal({ isOpen, onClose, selectedMembers, onSuccess }: AddToCampTripModalProps) {
  const [trips, setTrips] = useState<CampTrip[]>([]);
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [newTripName, setNewTripName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTrips();
      setSelectedTripId('');
      setNewTripName('');
      setMode('existing');
    }
  }, [isOpen]);

  const loadTrips = async () => {
    try {
      const res = await campTripsApi.listTrips({ page: 1, page_size: 100 });
      setTrips(res.data.items || []);
    } catch (error) {
      console.error(error);
      toast.error('فشل في تحميل الدفعات');
    }
  };

  const handleSubmit = async () => {
    if (mode === 'existing' && !selectedTripId) {
      toast.error('الرجاء اختيار الدفعة');
      return;
    }
    if (mode === 'new' && !newTripName.trim()) {
      toast.error('الرجاء كتابة اسم الدفعة');
      return;
    }

    setIsLoading(true);
    try {
      const eligibleMembers = selectedMembers.filter(m => !m.camp_rejection_reason);
      if (eligibleMembers.length === 0) {
        toast.error('لا يوجد أي منخرط مؤهل لإضافته للمخيم.');
        setIsLoading(false);
        return;
      }

      const payload = eligibleMembers.map(m => ({
        member_id: m.id,
        member_type: 'main',
        is_standby: false,
        first_name: m.first_name,
        last_name: m.last_name,
        gender: m.gender,
        birth_date: m.birth_date,
        municipality: m.residence_commune,
        youth_institution: m.institution,
        residence_wilaya: m.residence_wilaya,
        address: m.address,
        ministry_number: m.ministry_number,
        photo_path: m.photo_path,
      } as any));

      if (mode === 'existing') {
        await campTripsApi.addMembers(selectedTripId, payload);
        toast.success('تمت إضافة المنخرطين للدفعة بنجاح');
      } else {
        await campTripsApi.createTrip({
          name: newTripName.trim(),
          capacity: Math.max(50, payload.length),
          scouts_quota: 0,
          associations_quota: 0,
          institutions_quota: 0,
          members: payload
        });
        toast.success('تم إنشاء الدفعة وإضافة المنخرطين بنجاح');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.detail || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>إضافة إلى دفعة التخييم</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <p className="text-sm text-gray-500">
            تم تحديد {selectedMembers.length} منخرط.
            {selectedMembers.some(m => m.camp_rejection_reason) && (
              <span className="block mt-2 text-red-600 font-bold bg-red-50 p-2 rounded-md">
                تم استبعاد {selectedMembers.filter(m => m.camp_rejection_reason).length} منخرط بسبب مشاكل سابقة في التخييم ({selectedMembers.find(m => m.camp_rejection_reason)?.camp_rejection_reason}). لن تتم إضافتهم للدفعة.
              </span>
            )}
          </p>

          <Tabs value={mode} onValueChange={(v) => setMode(v as 'existing' | 'new')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">اختيار دفعة</TabsTrigger>
              <TabsTrigger value="new">إنشاء دفعة جديدة</TabsTrigger>
            </TabsList>
            
            <TabsContent value="existing" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>اختر الدفعة</Label>
                <Select value={selectedTripId} onValueChange={setSelectedTripId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الدفعة من القائمة..." />
                  </SelectTrigger>
                  <SelectContent>
                    {trips.length > 0 ? (
                      trips.map(trip => (
                        <SelectItem key={trip.id} value={trip.id}>
                          {trip.name} ({trip.status})
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-sm text-gray-500">لا توجد دفعات حالياً</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="new" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>اسم الدفعة الجديدة</Label>
                <Input 
                  placeholder="مثال: الدفعة الأولى - جويلية 2026"
                  value={newTripName}
                  onChange={(e) => setNewTripName(e.target.value)}
                />
              </div>
            </TabsContent>
          </Tabs>

        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || (mode === 'existing' && !selectedTripId) || (mode === 'new' && !newTripName)}>
            {isLoading ? 'جاري الحفظ...' : (mode === 'new' ? 'إنشاء وإضافة' : 'إضافة للدفعة')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
