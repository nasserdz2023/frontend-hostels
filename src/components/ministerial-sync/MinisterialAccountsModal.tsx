'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Loader2,
  KeyRound,
  Building2,
  Mail,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  ministerialSyncApi,
  MinisterialAccount,
} from '@/lib/api/ministerial_sync';

interface MinisterialAccountsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY_FORM = { label: '', wilaya_name: '', email: '', password: '' };

export function MinisterialAccountsModal({
  open,
  onOpenChange,
}: MinisterialAccountsModalProps) {
  const [accounts, setAccounts] = useState<MinisterialAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add-account dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addSaving, setAddSaving] = useState(false);

  // Edit-account dialog
  const [editAccount, setEditAccount] = useState<MinisterialAccount | null>(
    null,
  );
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ministerialSyncApi.getAccounts();
      setAccounts(res.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر تحميل حسابات المنصة الوزارية',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAccounts();
    }
  }, [open]);

  // ---- Add ----
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !addForm.label.trim() ||
      !addForm.wilaya_name.trim() ||
      !addForm.email.trim() ||
      !addForm.password
    ) {
      toast.error('يرجى تعبئة جميع الحقول (التسمية، الولاية، البريد، كلمة المرور)');
      return;
    }
    setAddSaving(true);
    try {
      await ministerialSyncApi.createAccount(addForm);
      toast.success('تمت إضافة الحساب الوزاري بنجاح');
      setAddOpen(false);
      setAddForm(EMPTY_FORM);
      fetchAccounts();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'فشل إضافة الحساب الوزاري',
      );
    } finally {
      setAddSaving(false);
    }
  };

  // ---- Edit ----
  const handleEditClick = (account: MinisterialAccount) => {
    setEditAccount(account);
    setEditForm({
      label: account.label,
      wilaya_name: account.wilaya_name,
      email: account.email,
      password: '',
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAccount) return;
    if (
      !editForm.label.trim() ||
      !editForm.wilaya_name.trim() ||
      !editForm.email.trim()
    ) {
      toast.error('يرجى تعبئة التسمية والولاية والبريد الإلكتروني');
      return;
    }
    setEditSaving(true);
    try {
      const data: Record<string, string> = {
        label: editForm.label.trim(),
        wilaya_name: editForm.wilaya_name.trim(),
        email: editForm.email.trim(),
      };
      // كلمة المرور اختيارية عند التعديل — تُرسل فقط إذا أُدخلت قيمة جديدة
      if (editForm.password) {
        if (editForm.password.length < 4) {
          toast.error('كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل');
          setEditSaving(false);
          return;
        }
        data.password = editForm.password;
      }
      await ministerialSyncApi.updateAccount(editAccount.id, data);
      toast.success('تم تحديث الحساب الوزاري بنجاح');
      setEditAccount(null);
      setEditForm(EMPTY_FORM);
      fetchAccounts();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'فشل تحديث الحساب الوزاري',
      );
    } finally {
      setEditSaving(false);
    }
  };

  // ---- Delete ----
  const handleDelete = async (account: MinisterialAccount) => {
    if (
      !window.confirm(
        `هل أنت متأكد من حذف الحساب "${account.label}" (${account.email})؟`,
      )
    ) {
      return;
    }
    try {
      await ministerialSyncApi.deleteAccount(account.id);
      toast.success('تم حذف الحساب الوزاري');
      fetchAccounts();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'فشل حذف الحساب الوزاري',
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-4xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-indigo-600" />
            حسابات المنصة الوزارية
          </DialogTitle>
          <DialogDescription>
            إدارة حسابات الدخول إلى منصة الشباب الوزارية (المراسلة عبر هذه
            الحسابات تُستخدم عند الاستيراد والمزامنة)
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <Badge variant="secondary" className="gap-1">
            <Building2 className="h-3 w-3" />
            {accounts.length} حساب
          </Badge>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            إضافة حساب
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin ml-2" />
            جارٍ التحميل...
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التسمية</TableHead>
                <TableHead>الولاية</TableHead>
                <TableHead>البريد الإلكتروني</TableHead>
                <TableHead>كلمة المرور</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-gray-400">
                    لا توجد حسابات وزارية — أضف حساباً للبدء
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((acc) => (
                  <TableRow key={acc.id}>
                    <TableCell className="font-medium">{acc.label}</TableCell>
                    <TableCell>{acc.wilaya_name}</TableCell>
                    <TableCell dir="ltr" className="text-left">
                      {acc.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="gap-1 border-amber-200 text-amber-700 bg-amber-50"
                      >
                        <KeyRound className="h-3 w-3" />
                        مشفّرة
                      </Badge>
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1"
                          onClick={() => handleEditClick(acc)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          تعديل
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(acc)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          حذف
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* ---------- Add dialog ---------- */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="!max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة حساب وزاري</DialogTitle>
            <DialogDescription>
              سيتم تشفير كلمة المرور وتخزينها بأمان
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="acc-label">التسمية</Label>
              <Input
                id="acc-label"
                value={addForm.label}
                onChange={(e) =>
                  setAddForm({ ...addForm, label: e.target.value })
                }
                placeholder="مثال: ولاية بوسعادة"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acc-wilaya">اسم الولاية</Label>
              <Input
                id="acc-wilaya"
                value={addForm.wilaya_name}
                onChange={(e) =>
                  setAddForm({ ...addForm, wilaya_name: e.target.value })
                }
                placeholder="مثال: بوسعادة"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acc-email">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="acc-email"
                  dir="ltr"
                  className="pr-9 text-left"
                  value={addForm.email}
                  onChange={(e) =>
                    setAddForm({ ...addForm, email: e.target.value })
                  }
                  placeholder="djs.xxx@mjeunesse.gov.dz"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="acc-password">كلمة المرور</Label>
              <Input
                id="acc-password"
                type="password"
                value={addForm.password}
                onChange={(e) =>
                  setAddForm({ ...addForm, password: e.target.value })
                }
                placeholder="••••••••"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={addSaving} className="gap-2">
                {addSaving && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                حفظ
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------- Edit dialog ---------- */}
      <Dialog
        open={!!editAccount}
        onOpenChange={(v) => {
          if (!v) {
            setEditAccount(null);
            setEditForm(EMPTY_FORM);
          }
        }}
      >
        <DialogContent className="!max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل حساب وزاري</DialogTitle>
            <DialogDescription>
              كلمة المرور اختيارية — اتركها فارغة للإبقاء على الحالية
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-label">التسمية</Label>
              <Input
                id="edit-label"
                value={editForm.label}
                onChange={(e) =>
                  setEditForm({ ...editForm, label: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-wilaya">اسم الولاية</Label>
              <Input
                id="edit-wilaya"
                value={editForm.wilaya_name}
                onChange={(e) =>
                  setEditForm({ ...editForm, wilaya_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">البريد الإلكتروني</Label>
              <Input
                id="edit-email"
                dir="ltr"
                className="text-left"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">كلمة مرور جديدة (اختياري)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editForm.password}
                onChange={(e) =>
                  setEditForm({ ...editForm, password: e.target.value })
                }
                placeholder="اتركه فارغاً للإبقاء على الحالية"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditAccount(null);
                  setEditForm(EMPTY_FORM);
                }}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={editSaving} className="gap-2">
                {editSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                حفظ التعديلات
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
