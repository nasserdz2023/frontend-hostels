import api from './client';

export enum ProficiencyLevel {
    BEGINNER = "BEGINNER",
    INTERMEDIATE = "INTERMEDIATE",
    ADVANCED = "ADVANCED",
    EXPERT = "EXPERT"
}

export enum CompetencyType {
    TECHNICAL = "TECHNICAL",
    BEHAVIORAL = "BEHAVIORAL",
    MANAGERIAL = "MANAGERIAL"
}

export interface SkillCategory {
    id: string;
    name_ar: string;
    name_en?: string;
    name_fr?: string;
    description_ar?: string;
    description_en?: string;
    description_fr?: string;
    icon?: string;
    display_order: number;
    skills_count?: number;
}

export interface Skill {
    id: string;
    category_id: string;
    code?: string;
    name_ar: string;
    name_en?: string;
    name_fr?: string;
    description_ar?: string;
    description_en?: string;
    description_fr?: string;
    is_required: boolean;
    display_order: number;
    category_name_ar?: string;
    category?: {
        id: string;
        name_ar: string;
        name_en?: string;
        name_fr?: string;
    };
}

export interface EmployeeSkill {
    id: string;
    employee_id: string;
    skill_id: string;
    proficiency_level: ProficiencyLevel;
    years_of_experience: number;
    last_used_date?: string;
    certificate_url?: string;
    verified_by_id?: string;
    verified_at?: string;
    notes?: string;
    created_at: string;
    updated_at?: string;
    skill?: Skill;
}

export interface CompetencyEvaluation {
    id: string;
    employee_id: string;
    evaluator_id?: string;
    evaluation_date: string;
    competency_type: CompetencyType;
    score: number;
    comments?: string;
    created_at: string;
    evaluator_name?: string;
}

export interface SkillGapAnalysis {
    skill_id: string;
    skill_name_ar: string;
    current_level?: ProficiencyLevel;
    required_level: ProficiencyLevel;
    gap: string;
    gap_description: string;
}

export interface CreateSkillCategoryDTO {
    name_ar: string;
    name_en?: string;
    name_fr?: string;
    description_ar?: string;
    description_en?: string;
    description_fr?: string;
    icon?: string;
    display_order?: number;
}

export interface CreateSkillDTO {
    category_id: string;
    code?: string;
    name_ar: string;
    name_en?: string;
    name_fr?: string;
    description_ar?: string;
    description_en?: string;
    description_fr?: string;
    is_required?: boolean;
    display_order?: number;
}

export interface AddEmployeeSkillDTO {
    skill_id: string;
    proficiency_level: ProficiencyLevel;
    years_of_experience?: number;
    last_used_date?: string;
    certificate_url?: string;
    notes?: string;
}

export interface UpdateEmployeeSkillDTO {
    proficiency_level?: ProficiencyLevel;
    years_of_experience?: number;
    last_used_date?: string;
    certificate_url?: string;
    notes?: string;
}

export interface CreateCompetencyEvaluationDTO {
    employee_id: string;
    competency_type: CompetencyType;
    score: number;
    comments?: string;
    evaluation_date?: string;
}

export const PROFICIENCY_LABELS: Record<string, { ar: string; en: string; fr: string }> = {
    BEGINNER: { ar: 'مبتدئ', en: 'Beginner', fr: 'Débutant' },
    INTERMEDIATE: { ar: 'متوسط', en: 'Intermediate', fr: 'Intermédiaire' },
    ADVANCED: { ar: 'متقدم', en: 'Advanced', fr: 'Avancé' },
    EXPERT: { ar: 'خبير', en: 'Expert', fr: 'Expert' },
};

export const COMPETENCY_LABELS: Record<string, { ar: string; en: string; fr: string }> = {
    TECHNICAL: { ar: 'تقنية', en: 'Technical', fr: 'Technique' },
    BEHAVIORAL: { ar: 'سلوكية', en: 'Behavioral', fr: 'Comportemental' },
    MANAGERIAL: { ar: 'إدارية', en: 'Managerial', fr: 'Managerial' },
};

export const GAP_LABELS: Record<string, { ar: string; en: string }> = {
    NONE: { ar: 'لا يوجد فجوة', en: 'No Gap' },
    MINOR: { ar: 'فجوة بسيطة', en: 'Minor Gap' },
    MODERATE: { ar: 'فجوة متوسطة', en: 'Moderate Gap' },
    SIGNIFICANT: { ar: 'فجوة كبيرة', en: 'Significant Gap' },
};

export const skillsApi = {
    // Categories
    async getCategories(): Promise<SkillCategory[]> {
        const response = await api.get<SkillCategory[]>('/skills/categories');
        return response.data;
    },

    async createCategory(data: CreateSkillCategoryDTO): Promise<SkillCategory> {
        const response = await api.post<SkillCategory>('/skills/categories', data);
        return response.data;
    },

    async updateCategory(id: string, data: Partial<CreateSkillCategoryDTO>): Promise<SkillCategory> {
        const response = await api.put<SkillCategory>(`/skills/categories/${id}`, data);
        return response.data;
    },

    async deleteCategory(id: string): Promise<void> {
        await api.delete(`/skills/categories/${id}`);
    },

    // Skills
    async getSkills(categoryId?: string): Promise<Skill[]> {
        const params = categoryId ? { category_id: categoryId } : {};
        const response = await api.get<Skill[]>('/skills', { params });
        return response.data;
    },

    async createSkill(data: CreateSkillDTO): Promise<Skill> {
        const response = await api.post<Skill>('/skills', data);
        return response.data;
    },

    async updateSkill(id: string, data: Partial<CreateSkillDTO>): Promise<Skill> {
        const response = await api.put<Skill>(`/skills/${id}`, data);
        return response.data;
    },

    async deleteSkill(id: string): Promise<void> {
        await api.delete(`/skills/${id}`);
    },

    // Employee Skills
    async getEmployeeSkills(employeeId: string): Promise<EmployeeSkill[]> {
        const response = await api.get<EmployeeSkill[]>(`/skills/employees/${employeeId}`);
        return response.data;
    },

    async addEmployeeSkill(employeeId: string, data: AddEmployeeSkillDTO): Promise<EmployeeSkill> {
        const response = await api.post<EmployeeSkill>(`/skills/employees/${employeeId}`, data);
        return response.data;
    },

    async updateEmployeeSkill(employeeId: string, skillId: string, data: UpdateEmployeeSkillDTO): Promise<EmployeeSkill> {
        const response = await api.put<EmployeeSkill>(`/skills/employees/${employeeId}/skills/${skillId}`, data);
        return response.data;
    },

    async removeEmployeeSkill(employeeId: string, skillId: string): Promise<void> {
        await api.delete(`/skills/employees/${employeeId}/skills/${skillId}`);
    },

    // Gap Analysis
    async getSkillGapAnalysis(employeeId: string): Promise<SkillGapAnalysis[]> {
        const response = await api.get<SkillGapAnalysis[]>(`/skills/gap-analysis/${employeeId}`);
        return response.data;
    },

    // Department Matrix
    async getDepartmentSkills(departmentId: string): Promise<Record<string, unknown>[]> {
        const response = await api.get<Record<string, unknown>[]>(`/skills/department-matrix/${departmentId}`);
        return response.data;
    },

    // Search
    async searchEmployeesBySkill(skillId: string, level?: string): Promise<Record<string, unknown>[]> {
        const params: Record<string, string> = { skill_id: skillId };
        if (level) params.level = level;
        const response = await api.get<Record<string, unknown>[]>('/skills/search', { params });
        return response.data;
    },

    // Statistics
    async getStats(): Promise<Record<string, unknown>> {
        const response = await api.get<Record<string, unknown>>('/skills/stats');
        return response.data;
    },

    // Competency Evaluations
    async getEvaluations(employeeId: string): Promise<CompetencyEvaluation[]> {
        const response = await api.get<CompetencyEvaluation[]>(`/skills/evaluations/${employeeId}`);
        return response.data;
    },

    async createEvaluation(data: CreateCompetencyEvaluationDTO): Promise<CompetencyEvaluation> {
        const response = await api.post<CompetencyEvaluation>('/skills/evaluations', data);
        return response.data;
    },
};
