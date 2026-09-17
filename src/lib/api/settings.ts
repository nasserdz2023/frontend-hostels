import api from '@/lib/api/client';

export interface SystemSetting {
    id: string;
    key: string;
    value: any;
    type: 'string' | 'boolean' | 'number' | 'json';
    group: 'general' | 'modules' | 'features';
    label_ar?: string;
    label_fr?: string;
    description?: string;
    is_public: boolean;
    is_system?: boolean;
    updated_at?: string;
}

export const settingsApi = {
    getAll: async () => {
        const response = await api.get<SystemSetting[]>('/settings/');
        return response.data;
    },

    getPublic: async () => {
        const response = await api.get<Record<string, any>>('/settings/public');
        return response.data;
    },

    updateBulk: async (settings: Record<string, any>) => {
        const response = await api.put<SystemSetting[]>('/settings/bulk', { settings });
        return response.data;
    }
};

// Default Settings Constants
export const DEFAULT_SETTINGS = {
    'modules.hr.enabled': true,
    'modules.institutions.enabled': true,
    'modules.municipalities.enabled': true,
    'modules.cms.enabled': true,
    'modules.documents.enabled': true,
    'features.virus_scan.enabled': true,
    'features.maintenance_mode.enabled': false,
};
