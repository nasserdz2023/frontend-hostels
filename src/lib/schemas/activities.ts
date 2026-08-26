import { z } from 'zod';
import { ActivityNature, ActivityStatus, RecurrenceType, DepartmentType, ActivityLocationType } from '@/lib/api/activities';

// Helper to convert empty string to undefined (for optional fields)
const emptyStringToUndefined = (val: unknown) =>
    val === '' ? undefined : val;

export const activitySchema = z.object({
    // Basic Info
    title_ar: z.string().min(3, 'العنوان بالعربية مطلوب (3 أحرف على الأقل)'),
    title_fr: z.string().optional(),
    description_ar: z.string().optional(),
    description_fr: z.string().optional(),
    objectives: z.array(z.string()).optional(),

    // Classification
    category_id: z.string().optional(),
    program_id: z.string().optional(),
    season_id: z.string().optional(),

    nature: z.nativeEnum(ActivityNature).default(ActivityNature.PERMANENT),
    domain_id: z.string().optional(),
    activity_type_id: z.string().nullable().optional(),

    department_type: z.nativeEnum(DepartmentType).optional(), // YOUTH only now
    time_slot: z.string().optional(),

    // Location & Organization
    // Location & Organization
    institution_ids: z.array(z.string().uuid()).min(1, 'يجب اختيار مؤسسة واحدة على الأقل'),
    // partner_institution_ids removed as it's merged into institution_ids
    partner_institution_ids: z.array(z.string().uuid()).optional().default([]), // Kept for types but unused in UI
    room_id: z.string().optional(),
    location_type: z.nativeEnum(ActivityLocationType).default(ActivityLocationType.INTERNAL),
    location_details: z.string().optional(),

    // Timing
    start_date: z.string().min(1, 'تاريخ البداية مطلوب'),  // ISO Date string
    end_date: z.string().optional(),
    duration_minutes: z.coerce.number().optional(),

    // Registration
    registration_start: z.string().optional(),
    registration_deadline: z.string().optional(),

    // Recurrence (if applicable)
    recurrence_type: z.nativeEnum(RecurrenceType).optional(),
    recurrence_interval: z.coerce.number().min(1).default(1),
    recurrence_end_date: z.string().optional(),

    // Participants & Target
    max_participants: z.coerce.number().min(0).default(0), // 0 means unlimited
    min_age: z.coerce.number().optional(),
    max_age: z.coerce.number().optional(),
    target_gender: z.string().optional(), // MALE, FEMALE, or null
    target_category_ids: z.array(z.string()).optional(),

    // Cost
    is_free: z.boolean().default(true),
    fee_amount: z.coerce.number().min(0).default(0),
    estimated_budget: z.coerce.number().min(0).default(0),

    // Flags
    status: z.nativeEnum(ActivityStatus).optional(),
    is_public: z.boolean().default(true),
    is_featured: z.boolean().default(false),
    is_major_event: z.boolean().default(false),

    // External Registration
    external_website_url: z.string().optional(),
    api_key_id: z.string().optional(),
    is_external_registration_open: z.boolean().default(false),
    custom_fields_schema: z.record(z.string(), z.any()).default({}),

    // Google Sheets Sync
    google_sheets_sync_url: z.string().optional(),
    google_sheets_sync_mode: z.string().optional(),

    // Management
    coordinator_id: z.string().optional(),

    // Media
    cover_image: z.string().optional(),
    gallery_images: z.array(z.string()).optional(),

}).refine(data => {
    if (!data.is_free && data.fee_amount <= 0) {
        return false;
    }
    return true;
}, {
    message: "يجب تحديد مبلغ الاشتراك إذا لم يكن النشاط مجاني",
    path: ["fee_amount"]
}).refine(data => {
    if (data.end_date && data.start_date && new Date(data.end_date) < new Date(data.start_date)) {
        return false;
    }
    return true;
}, {
    message: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية",
    path: ["end_date"]
}).refine((data) => {
    if (data.registration_start && data.registration_deadline) {
        return new Date(data.registration_deadline) >= new Date(data.registration_start);
    }
    return true;
}, {
    message: "تاريخ نهاية التسجيل يجب أن يكون بعد تاريخ البداية",
    path: ["registration_deadline"],
}).refine((data) => {
    if (data.registration_deadline && data.end_date) {
        return new Date(data.registration_deadline) <= new Date(data.end_date);
    }
    return true;
}, {
    message: "تاريخ نهاية التسجيل يجب أن يكون قبل انتهاء النشاط",
    path: ["registration_deadline"],
});

export type ActivityFormValues = z.infer<typeof activitySchema>;


// Schema for sub-models
export const activityCoordinatorSchema = z.object({
    employee_id: z.string().min(1, 'الموظف مطلوب'),
    role: z.string().min(1, 'الدور مطلوب'),
    is_active: z.boolean().default(true)
});

export const activityGroupSchema = z.object({
    name: z.string().min(1, 'اسم الفوج مطلوب'),
    max_participants: z.coerce.number().min(0),
    min_age: z.coerce.number().optional(),
    max_age: z.coerce.number().optional(),
    target_gender: z.string().optional(),
    instructor_id: z.string().optional()
});
