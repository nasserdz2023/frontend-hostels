'use client';

import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore, getDisplayName, ROLE_NAMES } from '@/lib/stores/auth';
import { Moon, Sun, Monitor, Globe, User, ShieldCheck, Mail } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const LOCALES = [
  { value: 'ar', label: 'العربية', flag: '🇩🇿' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
] as const;

const THEME_OPTIONS = ['light', 'dark', 'system'] as const;

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tNav = useTranslations('nav');
  const theme = useTheme();
  const locale = useLocale();
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();

  // Prevent hydration mismatch for theme
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? (theme.theme as string | undefined) ?? 'system' : 'system';

  const handleThemeChange = useCallback(
    (value: string) => {
      theme.setTheme(value);
    },
    [theme],
  );

  const handleLocaleChange = useCallback(
    (value: string) => {
      router.replace('/', { locale: value });
    },
    [router],
  );

  const displayName = _hasHydrated ? getDisplayName(user, locale) : '';
  const roleKey = user?.role as keyof typeof ROLE_NAMES | undefined;

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-20">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-4 p-6 bg-white rounded-2xl border shadow-sm">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Globe className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            {t('title')}
          </h1>
          <p className="text-slate-500 font-medium">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* ─── Appearance Card ─── */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <div className="p-1.5 bg-slate-100 rounded-lg">
              <Sun className="h-5 w-5 text-slate-600" />
            </div>
            {t('general.appearance.label')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <p className="text-sm text-slate-500">
            {t('general.appearance.desc')}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map((option) => {
              const isActive = currentTheme === option;
              const Icon =
                option === 'light' ? Sun : option === 'dark' ? Moon : Monitor;
              const label =
                option === 'light'
                  ? t('general.appearance.light')
                  : option === 'dark'
                    ? t('general.appearance.dark')
                    : t('general.appearance.system');

              return (
                <button
                  key={option}
                  onClick={() => handleThemeChange(option)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    isActive
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── Language Card ─── */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <div className="p-1.5 bg-slate-100 rounded-lg">
              <Globe className="h-5 w-5 text-slate-600" />
            </div>
            {t('general.language.label')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <p className="text-sm text-slate-500">
            {t('general.language.desc')}
          </p>
          <Select value={locale} onValueChange={handleLocaleChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCALES.map((loc) => (
                <SelectItem key={loc.value} value={loc.value}>
                  <span className="flex items-center gap-2">
                    <span>{loc.flag}</span>
                    <span>{loc.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* ─── Profile Card ─── */}
      {user && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <div className="p-1.5 bg-slate-100 rounded-lg">
                <User className="h-5 w-5 text-slate-600" />
              </div>
              {t('personal.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Name */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <User className="h-5 w-5 text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                    {t('personal.preferences.display_name')}
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {displayName || user.email}
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Mail className="h-5 w-5 text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                    Email
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {user.email}
                  </p>
                </div>
              </div>

              {/* Role */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                    Role
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {roleKey ? ROLE_NAMES[roleKey]?.[locale as keyof typeof ROLE_NAMES[typeof roleKey]] ?? roleKey : '—'}
                  </p>
                </div>
              </div>

              {/* 2FA Status */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                    {t('personal.security.2fa_status')}
                  </p>
                  <p className={`text-sm font-semibold ${user.is_2fa_enabled ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {user.is_2fa_enabled
                      ? t('personal.security.2fa_enabled')
                      : t('personal.security.2fa_disabled')}
                  </p>
                </div>
              </div>

              {/* Institution */}
              {user.institution_name && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Globe className="h-5 w-5 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                      Institution
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      {user.institution_name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Footer ─── */}
      <div className="text-center py-4">
        <p className="text-xs text-slate-400">
          © 2026 وزارة الشباب. جميع الحقوق محفوظة.
        </p>
      </div>
    </div>
  );
}
