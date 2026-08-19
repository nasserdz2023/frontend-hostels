import { create } from 'zustand';
import { institutionsApi, InstitutionFilters, YouthInstitution, Municipality, Wilaya } from '@/lib/api/institutions';

interface InstitutionsState {
    institutions: YouthInstitution[];
    currentInstitution: YouthInstitution | null;
    wilayas: Wilaya[];
    municipalities: Municipality[];
    isLoading: boolean;
    error: string | null;
    total: number;
    filters: InstitutionFilters;

    // Actions
    fetchInstitutions: (filters?: InstitutionFilters) => Promise<void>;
    fetchInstitution: (id: string) => Promise<void>;
    fetchWilayas: () => Promise<void>;
    fetchMunicipalities: (wilayaCode?: string) => Promise<void>;
    setFilters: (filters: InstitutionFilters) => void;
    createInstitution: (data: any) => Promise<void>;
    updateInstitution: (id: string, data: any) => Promise<void>;
    deleteInstitution: (id: string, permanent?: boolean) => Promise<void>;
    getInstitutionStats: (id: string) => Promise<{ employees: number; activities: number; presentations: number }>;
}

export const useInstitutionsStore = create<InstitutionsState>((set, get) => ({
    institutions: [],
    currentInstitution: null,
    wilayas: [],
    municipalities: [],
    isLoading: false,
    error: null,
    total: 0,
    filters: {
        page: 1,
        size: 1000
    },

    fetchInstitutions: async (filters) => {
        set({ isLoading: true, error: null });
        try {
            const currentFilters = { ...get().filters, ...filters };
            const response = await institutionsApi.getAll(currentFilters);
            set({
                institutions: response.items || [],
                total: response.total || 0,
                filters: currentFilters,
                isLoading: false
            });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    fetchInstitution: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const data = await institutionsApi.getById(id);
            set({ currentInstitution: data, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    fetchWilayas: async () => {
        if (get().wilayas.length > 0) return;
        try {
            const data = await institutionsApi.getWilayas();
            set({ wilayas: data });
        } catch (error) {
            console.error('Failed to fetch wilayas', error);
        }
    },

    fetchMunicipalities: async (wilayaCode?: string) => {
        try {
            const data = await institutionsApi.getMunicipalities(wilayaCode);
            set({ municipalities: data });
        } catch (error) {
            console.error('Failed to fetch municipalities', error);
        }
    },

    setFilters: (filters) => {
        set((state) => ({ filters: { ...state.filters, ...filters } }));
        get().fetchInstitutions();
    },

    createInstitution: async (data) => {
        set({ isLoading: true, error: null });
        try {
            await institutionsApi.create(data);
            await get().fetchInstitutions();
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    updateInstitution: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
            await institutionsApi.update(id, data);
            await get().fetchInstitutions();
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    deleteInstitution: async (id, permanent = false) => {
        set({ isLoading: true, error: null });
        try {
            await institutionsApi.delete(id, permanent);
            await get().fetchInstitutions();
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    getInstitutionStats: async (id) => {
        try {
            return await institutionsApi.getStats(id);
        } catch (error: any) {
            console.error('Failed to fetch stats', error);
            throw error;
        }
    }
}));
