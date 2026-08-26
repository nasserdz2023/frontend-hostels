import { BadgeTemplate, BadgeGenerationRequest, BadgePersonData } from "@/lib/types/badges";
import api from "./client";

export const badgeService = {
    getTemplates: async () => {
        const response = await api.get<BadgeTemplate[]>("/media-office/templates");
        return response.data;
    },

    getTemplate: async (id: string) => {
        const response = await api.get<BadgeTemplate>(`/media-office/templates/${id}`);
        return response.data;
    },

    createTemplate: async (data: Partial<BadgeTemplate>) => {
        const response = await api.post<BadgeTemplate>("/media-office/templates", data);
        return response.data;
    },

    updateTemplate: async (id: string, data: Partial<BadgeTemplate>) => {
        const response = await api.put<BadgeTemplate>(`/media-office/templates/${id}`, data);
        return response.data;
    },

    deleteTemplate: async (id: string) => {
        await api.delete(`/media-office/templates/${id}`);
    },

    fetchBadgeData: async (request: BadgeGenerationRequest) => {
        const response = await api.post<BadgePersonData[]>("/media-office/badge-data", request);
        return response.data;
    },
};
