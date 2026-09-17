import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
    locales,
    defaultLocale,
    localePrefix: 'always',
});

export default function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Redirect /login requests to the main CMS site
    // Extract locale from path (e.g., /ar/login → ar)
    const localeMatch = pathname.match(/^\/([a-z]{2})\/login/);
    const locale = localeMatch ? localeMatch[1] : defaultLocale;

    if (pathname.endsWith('/login') || pathname.includes('/login?')) {
        return NextResponse.redirect(
            new URL(`https://djs68.com/${locale}/login`, request.url)
        );
    }

    return intlMiddleware(request);
}

export const config = {
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
