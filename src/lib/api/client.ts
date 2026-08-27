import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// API Port (can be configured in .env)
const API_PORT = process.env.NEXT_PUBLIC_API_PORT || '8000';

// Dynamic API Base URL - uses same host as browser
export function getApiBaseUrl(): string {
    // 1. SSR - Server Side Routing (Prioritize Internal Docker Network)
    if (typeof window === 'undefined') {
        const internalUrl = process.env.INTERNAL_API_URL;
        if (internalUrl) {
            if (internalUrl.endsWith('/api/v1')) return internalUrl;
            if (internalUrl.endsWith('/api')) return `${internalUrl}/v1`;
            return `${internalUrl.endsWith('/') ? internalUrl.slice(0, -1) : internalUrl}/api/v1`;
        }
        // Fallback to NEXT_PUBLIC_API_URL
        const envUrl = process.env.NEXT_PUBLIC_API_URL;
        if (envUrl) {
            const cleanUrl = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
            if (cleanUrl.endsWith('/api/v1')) return cleanUrl;
            if (cleanUrl.endsWith('/api')) return `${cleanUrl}/v1`;
            return `${cleanUrl}/api/v1`;
        }
        return 'http://backend:8000/api/v1'; // Default Docker internal
    }

    // 2. Client Side - Browser
    const currentProtocol = window.location.protocol;
    const currentHostname = window.location.hostname;

    let apiBaseUrl = '';

    // PRIORITY 1: Environment Variable (User Preference)
    // If NEXT_PUBLIC_API_URL is set in .env, use it!
    let envUrl = process.env.NEXT_PUBLIC_API_URL;

    if (envUrl && envUrl.trim() !== '' && envUrl !== '/') {
        // Fix protocol mismatch (mixed content prevention)
        if (currentProtocol === 'https:' && envUrl.startsWith('http://')) {
            envUrl = envUrl.replace('http://', 'https://');
        } else if (currentProtocol === 'http:' && envUrl.startsWith('https://')) {
            envUrl = envUrl.replace('https://', 'http://');
        }

        // Ensure /api/v1 suffix without doubling up
        const cleanUrl = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
        
        if (cleanUrl.endsWith('/api/v1')) {
            apiBaseUrl = cleanUrl;
        } else if (cleanUrl.endsWith('/api')) {
            apiBaseUrl = `${cleanUrl}/v1`;
        } else {
            apiBaseUrl = `${cleanUrl}/api/v1`;
        }
    }
    else {
        // PRIORITY 2: Dynamic Auto-Configuration (Professional Fallback)

        const PRODUCTION_DOMAINS = ['djs68.com', 'djs-bousaada.com'];
        const FALLBACK_API      = 'https://api.djs68.com/api/v1';

        // True local dev (only pure localhost)
        const isDevLocalhost = currentHostname === 'localhost' ||
            currentHostname === '127.0.0.1';

        // Local network IPs (server accessed via LAN - nginx on same machine)
        const isLanIp = currentHostname.startsWith('192.168.') ||
            currentHostname.startsWith('10.');

        // Tailscale/WireGuard IPs (100.x.x.x CGNAT range)
        const isTailscaleIp = currentHostname.startsWith('100.');
        const isTailscaleDomain = currentHostname.endsWith(".ts.net");

        let targetDomain = currentHostname;
        if (targetDomain.startsWith('www.')) targetDomain = targetDomain.substring(4);

        // Extract root domain for subdomain matching (e.g. employees.djs68.com → djs68.com)
        const domainParts = targetDomain.split('.');
        const rootDomain = domainParts.length >= 2 ? domainParts.slice(-2).join('.') : targetDomain;

        const isProductionDomain = PRODUCTION_DOMAINS.includes(rootDomain);

        if (isProductionDomain) {
            // ✅ Production domain → api.{rootDomain}
            const apiDomain = targetDomain.startsWith('api.')
                ? targetDomain
                : `api.${rootDomain}`;
            apiBaseUrl = `${currentProtocol}//${apiDomain}/api/v1`;

        } else if (isDevLocalhost) {
            // ✅ True dev machine → direct backend port (no nginx)
            const port = process.env.NEXT_PUBLIC_API_PORT || '8000';
            apiBaseUrl = `${currentProtocol}//${currentHostname}:${port}/api/v1`;

        } else if (isLanIp) {
            // ✅ LAN access → nginx on same server handles /api proxy
            apiBaseUrl = `${currentProtocol}//${currentHostname}/api/v1`;

        } else if (isTailscaleIp) {
            // ✅ Tailscale access → same host, nginx handles /api
            apiBaseUrl = `${currentProtocol}//${currentHostname}/api/v1`;
        } else if (isTailscaleDomain) {
            // ✅ Tailscale Funnel domain (*.ts.net) → same host, nginx handles /api
            apiBaseUrl = `${currentProtocol}//${currentHostname}/api/v1`;

        } else {
            // ✅ Unknown external domain (Vercel, staging, fedora.ddns.net…)
            apiBaseUrl = FALLBACK_API;
        }
    }

    // FINAL SAFETY CHECK: Enforce HTTPS on HTTPS pages
    if (currentProtocol === 'https:' && apiBaseUrl.startsWith('http://')) {
        apiBaseUrl = apiBaseUrl.replace('http://', 'https://');
    }

    if (process.env.NEXT_PUBLIC_DEV_LOGGING === 'true') {
        console.log(`🌐 Calculated API Base URL: ${apiBaseUrl}`);
    }

    return apiBaseUrl;
}

// --- Auth refresh loop prevention (module-level state) ---
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason?: unknown) => void }> = [];

function processQueue(error: unknown) {
    failedQueue.forEach(({ reject }) => reject(error));
    failedQueue = [];
}

// Create axios instance with dynamic baseURL
const api: AxiosInstance = axios.create({
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
    withCredentials: true, // Enable sending cookies with requests (httpOnly cookie auth)
    paramsSerializer: {
        serialize: (params: Record<string, unknown>) => {
            const searchParams = new URLSearchParams();
            for (const [key, value] of Object.entries(params)) {
                if (Array.isArray(value)) {
                    // FastAPI expects: key=val1&key=val2 (NOT key[]=val1&key[]=val2)
                    for (const item of value) {
                        searchParams.append(key, String(item));
                    }
                } else if (value !== undefined && value !== null) {
                    searchParams.append(key, String(value));
                }
            }
            return searchParams.toString();
        }
    },
});

// Request interceptor - dynamically set baseURL and inject token
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Set baseURL dynamically on each request to ensure HTTPS upgrade works
        config.baseURL = getApiBaseUrl();

        // Convert camelCase request body to snake_case for backend
        // (Removed to preserve exact schema mappings like firstname_ar)

        // Get token from auth store
        // We need to import the store here. Circular dependency risk?
        // Ideally we pass it or read from localStorage directly if needed, but store is safer.
        // Let's try dynamic import or reading from localStorage directly as fallback to avoid circular dep with store->api->store

        // Token is handled via HttpOnly Cookie automatically
        // No need to inject Header manually from localStorage

        // Dev Logging
        if (process.env.NEXT_PUBLIC_DEV_LOGGING === 'true') {
            console.groupCollapsed(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
            console.log('Headers:', config.headers);
            console.log('Data:', config.data);
            console.log('Params:', config.params);
            console.groupEnd();
        }

        return config;
    },
    (error: AxiosError) => {
        if (process.env.NEXT_PUBLIC_DEV_LOGGING === 'true') {
            console.error('❌ Request Error:', error);
        }
        return Promise.reject(error);
    }
);



api.interceptors.response.use(
    (response) => {
        // Dev Logging
        if (process.env.NEXT_PUBLIC_DEV_LOGGING === 'true') {
            console.groupCollapsed(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`);
            console.log('Status:', response.status);
            console.log('Data:', response.data);
            console.groupEnd();
        }
        return response;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Dev Logging
        if (process.env.NEXT_PUBLIC_DEV_LOGGING === 'true') {
            console.groupCollapsed(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
            console.log('Status:', error.response?.status);
            console.log('Message:', error.message);
            console.groupEnd();
        }

        // Handle 401 - Refresh Token Logic (queue-based to prevent infinite loops)
        const SKIP_REFRESH_URLS = ['/auth/login', '/auth/refresh', '/auth/register', '/auth/me'];
        const shouldRetry = error.response?.status === 401
            && !originalRequest._retry
            && !SKIP_REFRESH_URLS.some(url => originalRequest.url?.includes(url));

        if (shouldRetry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(() => api(originalRequest));
            }

            isRefreshing = true;
            originalRequest._retry = true;

            try {
                await api.post('/auth/refresh');
                processQueue(null);
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError);
                if (typeof window !== 'undefined') {
                    const isAuthPage = window.location.pathname.includes('/login')
                        || window.location.pathname.includes('/register');
                    if (!isAuthPage) {
                        const pathSegments = window.location.pathname.split('/');
                        const currentLocale = pathSegments[1] || 'ar';
                        window.location.href = `/${currentLocale}/login`;
                    }
                }
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;

// Helper types
export interface ApiResponse<T> {
    data: T;
    message?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    size: number;
    pages?: number;
}

export interface ApiError {
    detail: string;
    code?: string;
}

// Error handler helper
export function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        const detail = axiosError.response?.data?.detail;

        if (typeof detail === 'string') {
            return detail;
        }

        // Handle Pydantic validation errors (array of objects)
        if (Array.isArray(detail)) {
            const messages = detail.map((err: any) => err.msg || JSON.stringify(err));
            return messages.join('. ');
        }

        // Handle object detail
        if (typeof detail === 'object' && detail !== null) {
            return JSON.stringify(detail);
        }

        return axiosError.message || 'An error occurred';
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'An unknown error occurred';
}
