import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware({
    locales,
    defaultLocale,
    localePrefix: 'always',
});

export default function middleware(request: NextRequest) {
    return intlMiddleware(request);
}

export const config = {
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
