import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';

export const locales = ['ar', 'fr', 'en'] as const;
export const defaultLocale = 'ar' as const;

export type Locale = (typeof locales)[number];

// Youth-related translation modules
async function loadMessages(locale: Locale) {
    const modules = [
        'common',
        'auth',
        'nav',
        'activities',
        'talents',
        'animator-registration',
        'badges',
        'institutions',
        'locations',
        'settings',
        'notifications',
        'metadata',
    ];

    const messages: Record<string, unknown> = {};

    for (const module of modules) {
        try {
            const moduleMessages = (await import(`./messages/${locale}/${module}.json`)).default as Record<string, unknown>;
            messages[module] = moduleMessages;
        } catch {
            console.warn(`Translation file not found: ${locale}/${module}.json`);
        }
    }

    return messages;
}

export default getRequestConfig(async ({ requestLocale }) => {
    const requested = await requestLocale;
    const locale = hasLocale(locales, requested) ? requested : defaultLocale;

    return {
        locale,
        messages: await loadMessages(locale as Locale),
    };
});
