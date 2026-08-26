import api from './client';
import { PaginatedResponse } from './client';

// Types
export enum TalentDomain {
    SPORTS = 'SPORTS',
    CULTURE = 'CULTURE',
    SCIENCE = 'SCIENCE',
    ART = 'ART',
    TECHNOLOGY = 'TECHNOLOGY',
    OTHER = 'OTHER'
}

export enum AchievementLevel {
    PARTICIPATION = 'PARTICIPATION',
    HONORABLE_MENTION = 'HONORABLE_MENTION',
    BRONZE = 'BRONZE',
    SILVER = 'SILVER',
    GOLD = 'GOLD',
    WINNER = 'WINNER'
}

export enum AchievementScope {
    LOCAL = 'LOCAL',
    MUNICIPAL = 'MUNICIPAL',
    STATE = 'STATE',
    NATIONAL = 'NATIONAL',
    INTERNATIONAL = 'INTERNATIONAL'
}

export interface Achievement {
    id: string;
    talent_id: string;
    talent?: TalentProfile;
    title: string;
    description?: string;
    date: string;
    level: AchievementLevel;
    scope: AchievementScope;
    proof_file?: string;
    activity_id?: string;
    created_at: string;
}

export interface AchievementCreate {
    talent_id: string;
    title: string;
    description?: string;
    date: string;
    level: AchievementLevel;
    scope: AchievementScope;
    proof_file?: string;
    activity_id?: string;
}

export interface Honor {
    id: string;
    talent_id: string;
    title: string;
    honored_by?: string;
    description?: string;
    date: string;
    article_url?: string;
    images?: string[];
    created_at: string;
}

export interface HonorCreate {
    talent_id: string;
    title: string;
    honored_by?: string;
    description?: string;
    date: string;
    article_url?: string;
    images?: string[];
}

export interface TalentProfile {
    id: string;
    participant_id: string;
    participant?: any; // Full participant object
    domain: TalentDomain;
    specialization?: string;
    bio?: string;
    is_active: boolean;
    achievements: Achievement[];
    honors: Honor[];
    created_at: string;
    updated_at: string;
}

export interface TalentProfileCreate {
    participant_id?: string;
    participant_data?: any; // CreateParticipantDTO
    domain: TalentDomain;
    specialization?: string;
    bio?: string;
    is_active?: boolean;
}

export interface TalentProfileUpdate {
    domain?: TalentDomain;
    specialization?: string;
    bio?: string;
    is_active?: boolean;
}

// API
export const talentsApi = {
    getTalents: async (params: { search?: string; domain?: string; page?: number; size?: number } = {}): Promise<PaginatedResponse<TalentProfile>> => {
        const res = await api.get('/talents', { params });
        return res.data;
    },

    getAchievements: async (params: { search?: string; page?: number; size?: number } = {}): Promise<PaginatedResponse<Achievement>> => {
        const res = await api.get('/talents/achievements', { params });
        return res.data;
    },

    getTalent: async (id: string): Promise<TalentProfile> => {
        const res = await api.get(`/talents/${id}`);
        return res.data;
    },

    createTalent: async (data: TalentProfileCreate): Promise<TalentProfile> => {
        const res = await api.post('/talents', data);
        return res.data;
    },

    updateTalent: async (id: string, data: TalentProfileUpdate): Promise<TalentProfile> => {
        const res = await api.patch(`/talents/${id}`, data);
        return res.data;
    },

    deleteTalent: async (id: string, permanent: boolean = false): Promise<void> => {
        await api.delete(`/talents/${id}`, { params: { permanent } });
    },

    addAchievement: async (talentId: string, data: AchievementCreate): Promise<Achievement> => {
        const res = await api.post(`/talents/${talentId}/achievements`, data);
        return res.data;
    },

    deleteAchievement: async (achievementId: string): Promise<void> => {
        const res = await api.delete(`/talents/achievements/${achievementId}`);
    },

    addHonor: async (talentId: string, data: HonorCreate): Promise<Honor> => {
        const res = await api.post(`/talents/${talentId}/honors`, data);
        return res.data;
    },

    deleteHonor: async (honorId: string): Promise<void> => {
        const res = await api.delete(`/talents/honors/${honorId}`);
    }
};
