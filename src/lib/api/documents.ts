import api, { PaginatedResponse } from './client';

// Types matches Backend Schemas
export enum DocumentStatus {
    DRAFT = "DRAFT",
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    ARCHIVED = "ARCHIVED"
}

export enum DocumentCategory {
    RECRUITMENT = "RECRUITMENT",
    QUALIFICATIONS = "QUALIFICATIONS",
    DECISIONS = "DECISIONS",
    PROFESSIONAL = "PROFESSIONAL",
    FAMILY = "FAMILY",
    OTHER = "OTHER"
}

export enum DocumentType {
    // وثائق التوظيف
    ID_COPY = "ID_COPY",
    BIRTH_CERT = "BIRTH_CERT",
    RESIDENCE_CERT = "RESIDENCE_CERT",
    CRIMINAL_RECORD = "CRIMINAL_RECORD",
    MILITARY_SERVICE = "MILITARY_SERVICE",
    MEDICAL_CERT = "MEDICAL_CERT",
    PHOTOS = "PHOTOS",
    // المؤهلات
    DIPLOMA = "DIPLOMA",
    TRANSCRIPT = "TRANSCRIPT",
    TRAINING_CERT = "TRAINING_CERT",
    COMPETENCY_CERT = "COMPETENCY_CERT",
    // القرارات
    APPOINTMENT_DECISION = "APPOINTMENT_DECISION",
    INSTALLATION_PV = "INSTALLATION_PV",
    CONFIRMATION_DECISION = "CONFIRMATION_DECISION",
    PROMOTION_DECISION = "PROMOTION_DECISION",
    RANK_PROMOTION = "RANK_PROMOTION",
    TRANSFER_DECISION = "TRANSFER_DECISION",
    SECONDMENT_DECISION = "SECONDMENT_DECISION",
    ASSIGNMENT_DECISION = "ASSIGNMENT_DECISION",
    LEAVE_DECISION = "LEAVE_DECISION",
    REINSTATEMENT = "REINSTATEMENT",
    RETIREMENT_DECISION = "RETIREMENT_DECISION",
    TERMINATION = "TERMINATION",
    // الشهادات المهنية
    WORK_CERTIFICATE = "WORK_CERTIFICATE",
    EXPERIENCE_CERT = "EXPERIENCE_CERT",
    SALARY_CERT = "SALARY_CERT",
    SERVICE_CERT = "SERVICE_CERT",
    // الحالة العائلية
    FAMILY_CERT = "FAMILY_CERT",
    MARRIAGE_CERT = "MARRIAGE_CERT",
    CHILDREN_BIRTH = "CHILDREN_BIRTH",
    // أخرى
    BANK_ACCOUNT = "BANK_ACCOUNT",
    SOCIAL_SECURITY = "SOCIAL_SECURITY",
    EVALUATION_SHEET = "EVALUATION_SHEET",
    DISCIPLINARY = "DISCIPLINARY",
    CORRESPONDENCE = "CORRESPONDENCE",
    // Legacy
    ATTESTATION = "ATTESTATION",
    REPORT = "REPORT",
    CONTRACT = "CONTRACT",
    INVOICE = "INVOICE",
    DECISION = "DECISION",
    OTHER = "OTHER"
}

// Labels in Arabic
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
    ID_COPY: 'نسخة من بطاقة التعريف الوطنية',
    BIRTH_CERT: 'شهادة الميلاد S12',
    RESIDENCE_CERT: 'شهادة الإقامة',
    CRIMINAL_RECORD: 'صحيفة السوابق العدلية',
    MILITARY_SERVICE: 'شهادة الخدمة الوطنية',
    MEDICAL_CERT: 'الشهادة الطبية',
    PHOTOS: 'الصور الشمسية',
    DIPLOMA: 'الشهادة الدراسية',
    TRANSCRIPT: 'كشف النقاط',
    TRAINING_CERT: 'شهادة التكوين',
    COMPETENCY_CERT: 'شهادة الكفاءة',
    APPOINTMENT_DECISION: 'قرار التعيين',
    INSTALLATION_PV: 'محضر التنصيب',
    CONFIRMATION_DECISION: 'قرار الترسيم',
    PROMOTION_DECISION: 'قرار الترقية',
    RANK_PROMOTION: 'ترقية في الرتبة',
    TRANSFER_DECISION: 'قرار النقل',
    SECONDMENT_DECISION: 'قرار الانتداب',
    ASSIGNMENT_DECISION: 'قرار الإلحاق',
    LEAVE_DECISION: 'قرار الاستيداع',
    REINSTATEMENT: 'قرار إعادة الإدماج',
    RETIREMENT_DECISION: 'قرار التقاعد',
    TERMINATION: 'قرار إنهاء المهام',
    WORK_CERTIFICATE: 'شهادة العمل',
    EXPERIENCE_CERT: 'شهادة الخبرة',
    SALARY_CERT: 'شهادة الراتب',
    SERVICE_CERT: 'شهادة أداء الخدمة',
    FAMILY_CERT: 'شهادة الحالة العائلية',
    MARRIAGE_CERT: 'عقد الزواج',
    CHILDREN_BIRTH: 'شهادات ميلاد الأبناء',
    BANK_ACCOUNT: 'الحساب البنكي (RIB)',
    SOCIAL_SECURITY: 'الضمان الاجتماعي',
    EVALUATION_SHEET: 'بطاقة التقييم',
    DISCIPLINARY: 'قرارات تأديبية',
    CORRESPONDENCE: 'مراسلات إدارية',
    ATTESTATION: 'شهادة',
    REPORT: 'تقرير',
    CONTRACT: 'عقد',
    INVOICE: 'فاتورة',
    DECISION: 'قرار',
    OTHER: 'أخرى'
};

export const CATEGORY_LABELS: Record<string, string> = {
    RECRUITMENT: 'وثائق التوظيف',
    QUALIFICATIONS: 'المؤهلات',
    DECISIONS: 'القرارات الإدارية',
    PROFESSIONAL: 'الشهادات المهنية',
    FAMILY: 'الحالة العائلية',
    OTHER: 'أخرى'
};

export const CATEGORY_ICONS: Record<string, string> = {
    RECRUITMENT: '📋',
    QUALIFICATIONS: '🎓',
    DECISIONS: '📜',
    PROFESSIONAL: '💼',
    FAMILY: '👨‍👩‍👧',
    OTHER: '📁'
};

export const CATEGORY_DOCUMENT_TYPES: Record<DocumentCategory, DocumentType[]> = {
    [DocumentCategory.RECRUITMENT]: [
        DocumentType.ID_COPY,
        DocumentType.BIRTH_CERT,
        DocumentType.RESIDENCE_CERT,
        DocumentType.CRIMINAL_RECORD,
        DocumentType.MILITARY_SERVICE,
        DocumentType.MEDICAL_CERT,
        DocumentType.PHOTOS
    ],
    [DocumentCategory.QUALIFICATIONS]: [
        DocumentType.DIPLOMA,
        DocumentType.TRANSCRIPT,
        DocumentType.TRAINING_CERT,
        DocumentType.COMPETENCY_CERT
    ],
    [DocumentCategory.DECISIONS]: [
        DocumentType.APPOINTMENT_DECISION,
        DocumentType.INSTALLATION_PV,
        DocumentType.CONFIRMATION_DECISION,
        DocumentType.PROMOTION_DECISION,
        DocumentType.RANK_PROMOTION,
        DocumentType.TRANSFER_DECISION,
        DocumentType.SECONDMENT_DECISION,
        DocumentType.ASSIGNMENT_DECISION,
        DocumentType.LEAVE_DECISION,
        DocumentType.REINSTATEMENT,
        DocumentType.RETIREMENT_DECISION,
        DocumentType.TERMINATION
    ],
    [DocumentCategory.PROFESSIONAL]: [
        DocumentType.WORK_CERTIFICATE,
        DocumentType.EXPERIENCE_CERT,
        DocumentType.SALARY_CERT,
        DocumentType.SERVICE_CERT
    ],
    [DocumentCategory.FAMILY]: [
        DocumentType.FAMILY_CERT,
        DocumentType.MARRIAGE_CERT,
        DocumentType.CHILDREN_BIRTH
    ],
    [DocumentCategory.OTHER]: [
        DocumentType.BANK_ACCOUNT,
        DocumentType.SOCIAL_SECURITY,
        DocumentType.EVALUATION_SHEET,
        DocumentType.DISCIPLINARY,
        DocumentType.CORRESPONDENCE,
        DocumentType.ATTESTATION,
        DocumentType.REPORT,
        DocumentType.CONTRACT,
        DocumentType.INVOICE,
        DocumentType.DECISION,
        DocumentType.OTHER
    ]
};

export interface Document {
    id: string;
    title: string;
    description?: string;
    reference_number?: string;
    type: DocumentType | string;
    category?: DocumentCategory | string;
    status: DocumentStatus | string;
    file_path?: string;
    file_name?: string;
    file_size?: string;
    file_url?: string;
    expires_at?: string;
    created_by_id: string;
    employee_id?: string;
    institution_id?: string;
    created_at: string;
    updated_at: string;
}

export interface DocumentFilters {
    search?: string;
    status?: string | DocumentStatus;
    type?: string | DocumentType;
    category?: string | DocumentCategory;
    page?: number;
    size?: number;
}

export interface CreateDocumentDTO {
    title: string;
    description?: string;
    type: DocumentType;
    category?: DocumentCategory;
    status?: DocumentStatus;
    employee_id?: string;
    institution_id?: string;
    expires_at?: string;
}

export interface UpdateDocumentDTO extends Partial<CreateDocumentDTO> { }

export const documentsApi = {
    /**
     * Get paginated list of documents
     */
    async getAll(filters?: DocumentFilters): Promise<PaginatedResponse<Document>> {
        const params = new URLSearchParams();
        if (filters?.search) params.append('search', filters.search);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.type) params.append('type', filters.type);
        if (filters?.category) params.append('category', filters.category);
        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.size) params.append('size', filters.size.toString());

        const response = await api.get<PaginatedResponse<Document>>(
            `/documents?${params.toString()}`
        );
        return response.data;
    },

    /**
     * Get documents for a specific employee
     */
    async getByEmployee(employeeId: string, category?: string): Promise<{ items: Document[]; total: number }> {
        const params = new URLSearchParams();
        if (category) params.append('category', category);

        const response = await api.get<{ items: Document[]; total: number }>(
            `/employees/${employeeId}/documents?${params.toString()}`
        );
        return response.data;
    },

    /**
     * Get single document by ID
     */
    async getById(id: string): Promise<Document> {
        const response = await api.get<Document>(`/documents/${id}`);
        return response.data;
    },

    /**
     * Create new document
     */
    async create(data: CreateDocumentDTO): Promise<Document> {
        const response = await api.post<Document>('/documents', data);
        return response.data;
    },

    /**
     * Upload document file for an employee
     */
    async uploadForEmployee(employeeId: string, formData: FormData): Promise<Document> {
        const response = await api.post<Document>(
            `/employees/${employeeId}/documents`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
    },

    /**
     * Update document
     */
    async update(id: string, data: UpdateDocumentDTO): Promise<Document> {
        const response = await api.put<Document>(`/documents/${id}`, data);
        return response.data;
    },

    /**
     * Delete document
     */
    async delete(id: string): Promise<void> {
        await api.delete(`/documents/${id}`);
    },

    /**
     * Quick create a document with auto-generated PDF
     * Creates document + generates PDF + uploads to MinIO in one call
     */
    async quickCreate(employeeId: string, type: string): Promise<Document> {
        const response = await api.post<Document>(
            `/documents/quick-create?employee_id=${employeeId}`,
            { type }
        );
        return response.data;
    },
};
