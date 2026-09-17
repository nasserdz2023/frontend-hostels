import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { settingsApi } from '@/lib/api/settings';

let _fetchPromise: Promise<void> | null = null;
let _fetchedOnce = false;

interface SettingsState {
    settings: Record<string, any>; // Key-Value map
    loading: boolean;
    fetchSettings: () => Promise<void>;
    isModuleEnabled: (moduleName: string) => boolean;
    getDefaultWilayaCode: () => string;
    navigationMode: 'classic' | 'grid' | 'dock' | 'minimal';
    themeColor: 'zinc' | 'blue' | 'green' | 'orange' | 'rose' | 'violet' | 'red' | 'amber' | 'cyan' | 'indigo' | 'pink' | 'teal';
    setNavigationMode: (mode: 'classic' | 'grid' | 'dock' | 'minimal') => void;
    setThemeColor: (color: 'zinc' | 'blue' | 'green' | 'orange' | 'rose' | 'violet' | 'red' | 'amber' | 'cyan' | 'indigo' | 'pink' | 'teal') => void;
}

// Default enabled modules if not fetched yet
const DEFAULT_MODULES = {
    'modules.hr.enabled': true,
    'modules.institutions.enabled': true,
    'modules.municipalities.enabled': true,
    'modules.documents.enabled': true,
    'modules.cms.enabled': true,
    'modules.inventory.enabled': true,
    'modules.activities.enabled': true,
};

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            settings: DEFAULT_MODULES,
            loading: false,
            navigationMode: 'classic',
            themeColor: 'zinc',

            setNavigationMode: (mode) => set({ navigationMode: mode }),
            setThemeColor: (color) => set({ themeColor: color }),

            fetchSettings: async () => {
                // Already fetched once — return immediately, no re-fetch
                if (_fetchedOnce) return;
                if (_fetchPromise) return _fetchPromise;
                set({ loading: true });
                _fetchPromise = (async () => {
                    try {
                        try {
                            const data = await settingsApi.getAll();
                            const settingsMap: Record<string, any> = {};
                            data.forEach(s => settingsMap[s.key] = s.value);
                            set({ settings: { ...DEFAULT_MODULES, ...settingsMap }, loading: false });
                            _fetchedOnce = true;
                        } catch (e) {
                            // Fallback to public
                            const publicData = await settingsApi.getPublic();
                            set({ settings: { ...DEFAULT_MODULES, ...publicData }, loading: false });
                            _fetchedOnce = true;
                        }
                    } catch (error) {
                        console.error('Failed to fetch settings store:', error);
                        set({ loading: false });
                        _fetchedOnce = true; // Still mark as fetched to prevent infinite retries
                    } finally {
                        _fetchPromise = null;
                    }
                })();
                return _fetchPromise;
            },

            isModuleEnabled: (moduleName: string) => {
                const key = `modules.${moduleName}.enabled`;
                // Default to true if not found/loaded yet
                return get().settings[key] !== false;
            },

            getDefaultWilayaCode: () => {
                return get().settings['general.default_wilaya_code'] || '68';
            }
        }),
        {
            name: 'system-settings',
            partialize: (state) => ({ settings: state.settings, navigationMode: state.navigationMode, themeColor: state.themeColor }), // Persist specific fields
        }
    )
);
