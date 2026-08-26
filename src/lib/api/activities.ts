/**
 * Activities API Service
 * خدمة API للأنشطة
 */
import api, { PaginatedResponse } from '@/lib/api/client';

// ============== Enums ==============

export enum ActivityNature {
    PERMANENT = 'PERMANENT',
    TEMPORARY = 'TEMPORARY'
}

export enum ActivityDomain {
    SCIENTIFIC_TECHNOLOGICAL = 'SCIENTIFIC_TECHNOLOGICAL',
    ARTISTIC_CULTURAL = 'ARTISTIC_CULTURAL',
    MOBILITY_AND_LEISURE_SPORTS = 'MOBILITY_AND_LEISURE_SPORTS',
    PSYCHOLOGICAL_SUPPORT_AND_HEALTH = 'PSYCHOLOGICAL_SUPPORT_AND_HEALTH',
    CITIZENSHIP_AND_VOLUNTEERING = 'CITIZENSHIP_AND_VOLUNTEERING',
    YOUTH_CAPACITY_EMPOWERMENT = 'YOUTH_CAPACITY_EMPOWERMENT'
}

export enum ActivityType {
    // 1. Scientific & Technological
    IT_PROGRAMMING = 'IT_PROGRAMMING',
    ROBOTICS_AI = 'ROBOTICS_AI',
    CONTENT_CREATION = 'CONTENT_CREATION',
    PODCAST = 'PODCAST',
    ASTRONOMY = 'ASTRONOMY',
    RENEWABLE_ENERGY = 'RENEWABLE_ENERGY',
    MENTAL_MATH = 'MENTAL_MATH',
    RECYCLING_AQUACULTURE = 'RECYCLING_AQUACULTURE',
    DIGITAL_ARTS = 'DIGITAL_ARTS',
    ELECTRONIC_MAINTENANCE = 'ELECTRONIC_MAINTENANCE',

    // 2. Artistic & Cultural
    MULTIMEDIA_LIBRARY = 'MULTIMEDIA_LIBRARY',
    CONTEMPORARY_ART = 'CONTEMPORARY_ART',
    MUSIC = 'MUSIC',
    DRAMATIC_ARTS = 'DRAMATIC_ARTS',
    PHOTOGRAPHY_CINEMA = 'PHOTOGRAPHY_CINEMA',
    CINEMATHEQUE = 'CINEMATHEQUE',
    LITERARY_INTELLECTUAL = 'LITERARY_INTELLECTUAL',
    ENTREPRENEURSHIP = 'ENTREPRENEURSHIP',
    GIRL_EMPOWERMENT = 'GIRL_EMPOWERMENT',
    PERFORMANCE_ARTS = 'PERFORMANCE_ARTS',
    CREATIVE_WRITING = 'CREATIVE_WRITING',
    CRAFTS = 'CRAFTS',

    // 3. Mobility & Sports
    ESPORTS = 'ESPORTS',
    VR_GAMES = 'VR_GAMES',
    CINEMA_3D_9D = 'CINEMA_3D_9D',
    HIKING_CAMPING = 'HIKING_CAMPING',
    MOUNTAIN_SPORTS = 'MOUNTAIN_SPORTS',
    RECREATIONAL_SPORTS = 'RECREATIONAL_SPORTS',
    SCOUTING = 'SCOUTING',
    GEOCACHING = 'GEOCACHING',

    // 4. Psychological Support
    PSYCHOLOGICAL_COUNSELING = 'PSYCHOLOGICAL_COUNSELING',
    HEALTH_PREVENTION = 'HEALTH_PREVENTION',
    SOCIAL_SUPPORT = 'SOCIAL_SUPPORT',
    SELF_DEVELOPMENT = 'SELF_DEVELOPMENT',

    // 5. Citizenship
    VOLUNTEERING = 'VOLUNTEERING',
    NEIGHBORHOOD_MEDIATION = 'NEIGHBORHOOD_MEDIATION',

    // 6. Capacity Empowerment
    SELF_LEARNING = 'SELF_LEARNING',
    DISTINGUISHED_YOUTH = 'DISTINGUISHED_YOUTH',
    DIGITAL_LEARNING = 'DIGITAL_LEARNING',
    YOUTH_GALLERY = 'YOUTH_GALLERY',
    SCIENCE_CAFE = 'SCIENCE_CAFE',
    SCIENTIFIC_EXPEDITIONS = 'SCIENTIFIC_EXPEDITIONS',
    CITIZENSHIP_AMBASSADORS = 'CITIZENSHIP_AMBASSADORS',
    FUTURE_LEADERS = 'FUTURE_LEADERS',
    DEBATES = 'DEBATES',
    LANGUAGES = 'LANGUAGES',
    ENTREPRENEUR_PROGRAM = 'ENTREPRENEUR_PROGRAM',
    TALENT_INCUBATORS = 'TALENT_INCUBATORS',
    DIGITAL_MARKETING = 'DIGITAL_MARKETING',
    TALENT_FORUM = 'TALENT_FORUM',
    MINI_FESTIVALS = 'MINI_FESTIVALS',
    APP_DEVELOPMENT = 'APP_DEVELOPMENT',
    LISTENING_SESSIONS = 'LISTENING_SESSIONS'
}

export enum ActivityStatus {
    DRAFT = 'DRAFT',
    PENDING_DEPARTMENT = 'PENDING_DEPARTMENT',
    PENDING_DIRECTOR = 'PENDING_DIRECTOR',
    PUBLISHED = 'PUBLISHED',
    ONGOING = 'ONGOING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    REJECTED = 'REJECTED',
    POSTPONED = 'POSTPONED',
    RESERVATION = 'RESERVATION',
    APPROVED = 'APPROVED'

}

export enum SeasonStatus {
    DRAFT = 'DRAFT',
    OPEN = 'OPEN',
    CLOSED = 'CLOSED'
}

export enum SessionStatus {
    SCHEDULED = 'SCHEDULED',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

export enum RegistrationStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    CANCELLED = 'CANCELLED'
}

export enum PaymentStatus {
    PENDING = 'PENDING',
    PAID = 'PAID',
    EXEMPT = 'EXEMPT'
}

export enum AttendanceStatus {
    PRESENT = 'PRESENT',
    ABSENT = 'ABSENT',
    LATE = 'LATE',
    EXCUSED = 'EXCUSED'
}

export enum Gender {
    MALE = 'MALE',
    FEMALE = 'FEMALE'
}

export enum RecurrenceType {
    NONE = 'NONE',
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY'
}

export enum DepartmentType {
    YOUTH = 'YOUTH',
    SPORTS = 'SPORTS'
}

export enum ActivityTimeSlot {
    MORNING = 'MORNING',
    EVENING = 'EVENING',
    NIGHT = 'NIGHT'
}

// ============== Labels ==============

export const ACTIVITY_NATURE_LABELS: Record<ActivityNature, { ar: string; fr: string }> = {
    [ActivityNature.PERMANENT]: { ar: 'دائم (نوادي/ورشات)', fr: 'Permanent (Clubs/Ateliers)' },
    [ActivityNature.TEMPORARY]: { ar: 'مؤقت (تظاهرات/ولوج حر)', fr: 'Temporaire (Événements/Accès Libre)' }
};

export const ACTIVITY_DOMAIN_LABELS: Record<ActivityDomain, { ar: string; fr: string }> = {
    [ActivityDomain.SCIENTIFIC_TECHNOLOGICAL]: { ar: 'النشاطات العلمية، التكنولوجية، وتطوير البرمجيات', fr: 'Activités Scientifiques, Technologiques et Développement Logiciel' },
    [ActivityDomain.ARTISTIC_CULTURAL]: { ar: 'نشاطات الإبداع الفني والثقافي والإعلامي', fr: 'Créativité Artistique, Culturelle et Médiatique' },
    [ActivityDomain.MOBILITY_AND_LEISURE_SPORTS]: { ar: 'نشاطات الحركية والسياحة الشبابية والرياضة الترفيهية', fr: 'Mobilité des Jeunes, Tourisme et Sports Récréatifs' },
    [ActivityDomain.PSYCHOLOGICAL_SUPPORT_AND_HEALTH]: { ar: 'نشاطات الدعم النفسي، والوقاية وصحة الشباب', fr: 'Soutien Psychologique, Prévention et Santé des Jeunes' },
    [ActivityDomain.CITIZENSHIP_AND_VOLUNTEERING]: { ar: 'نشاطات المواطنة وأعمال التطوع', fr: 'Citoyenneté et Action Bénévole' },
    [ActivityDomain.YOUTH_CAPACITY_EMPOWERMENT]: { ar: 'نشاطات تمكين قدرات الشباب', fr: 'Renforcement des Capacités des Jeunes' }
};

// Mapping of Domains to their Activities
export const DOMAIN_ACTIVITIES: Record<ActivityDomain, ActivityType[]> = {
    [ActivityDomain.SCIENTIFIC_TECHNOLOGICAL]: [
        ActivityType.IT_PROGRAMMING, ActivityType.ROBOTICS_AI, ActivityType.CONTENT_CREATION,
        ActivityType.PODCAST, ActivityType.ASTRONOMY, ActivityType.RENEWABLE_ENERGY,
        ActivityType.MENTAL_MATH, ActivityType.RECYCLING_AQUACULTURE, ActivityType.DIGITAL_ARTS,
        ActivityType.ELECTRONIC_MAINTENANCE
    ],
    [ActivityDomain.ARTISTIC_CULTURAL]: [
        ActivityType.MULTIMEDIA_LIBRARY, ActivityType.CONTEMPORARY_ART, ActivityType.MUSIC,
        ActivityType.DRAMATIC_ARTS, ActivityType.PHOTOGRAPHY_CINEMA, ActivityType.CINEMATHEQUE,
        ActivityType.LITERARY_INTELLECTUAL, ActivityType.ENTREPRENEURSHIP, ActivityType.GIRL_EMPOWERMENT,
        ActivityType.PERFORMANCE_ARTS, ActivityType.CREATIVE_WRITING, ActivityType.CRAFTS
    ],
    [ActivityDomain.MOBILITY_AND_LEISURE_SPORTS]: [
        ActivityType.ESPORTS, ActivityType.VR_GAMES, ActivityType.CINEMA_3D_9D,
        ActivityType.HIKING_CAMPING, ActivityType.MOUNTAIN_SPORTS, ActivityType.RECREATIONAL_SPORTS,
        ActivityType.SCOUTING, ActivityType.GEOCACHING
    ],
    [ActivityDomain.PSYCHOLOGICAL_SUPPORT_AND_HEALTH]: [
        ActivityType.PSYCHOLOGICAL_COUNSELING, ActivityType.HEALTH_PREVENTION,
        ActivityType.SOCIAL_SUPPORT, ActivityType.SELF_DEVELOPMENT
    ],
    [ActivityDomain.CITIZENSHIP_AND_VOLUNTEERING]: [
        ActivityType.VOLUNTEERING, ActivityType.NEIGHBORHOOD_MEDIATION
    ],
    [ActivityDomain.YOUTH_CAPACITY_EMPOWERMENT]: [
        ActivityType.SELF_LEARNING, ActivityType.DISTINGUISHED_YOUTH, ActivityType.DIGITAL_LEARNING,
        ActivityType.YOUTH_GALLERY, ActivityType.SCIENCE_CAFE, ActivityType.SCIENTIFIC_EXPEDITIONS,
        ActivityType.CITIZENSHIP_AMBASSADORS, ActivityType.FUTURE_LEADERS, ActivityType.DEBATES,
        ActivityType.LANGUAGES, ActivityType.ENTREPRENEUR_PROGRAM, ActivityType.TALENT_INCUBATORS,
        ActivityType.DIGITAL_MARKETING, ActivityType.TALENT_FORUM, ActivityType.MINI_FESTIVALS,
        ActivityType.APP_DEVELOPMENT, ActivityType.LISTENING_SESSIONS
    ]
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, { ar: string; fr: string }> = {
    // 1. Scientific & Technological
    [ActivityType.IT_PROGRAMMING]: { ar: 'الإعلام الآلي والبرمجة الرقمية', fr: 'Informatique et Programmation' },
    [ActivityType.ROBOTICS_AI]: { ar: 'الروبوتيك والذكاء الاصطناعي', fr: 'Robotique et IA' },
    [ActivityType.CONTENT_CREATION]: { ar: 'صناع المحتوى', fr: 'Créateurs de Contenu' },
    [ActivityType.PODCAST]: { ar: 'البودكاست', fr: 'Podcast' },
    [ActivityType.ASTRONOMY]: { ar: 'علوم الفضاء والفلك', fr: 'Astronomie et Espace' },
    [ActivityType.RENEWABLE_ENERGY]: { ar: 'الطاقات المتجددة', fr: 'Énergies Renouvelables' },
    [ActivityType.MENTAL_MATH]: { ar: 'الحساب الذهني وألعاب الذكاء', fr: 'Calcul Mental et Jeux d\'Intelligence' },
    [ActivityType.RECYCLING_AQUACULTURE]: { ar: 'الرسكلة وتربية المائيات', fr: 'Recyclage et Aquaculture' },
    [ActivityType.DIGITAL_ARTS]: { ar: 'الفنون الرقمية والطباعة ثلاثية الأبعاد', fr: 'Arts Numériques et Impression 3D' },
    [ActivityType.ELECTRONIC_MAINTENANCE]: { ar: 'الصيانة الإلكترونية', fr: 'Maintenance Électronique' },

    // 2. Artistic & Cultural
    [ActivityType.MULTIMEDIA_LIBRARY]: { ar: 'مكتبة الوسائط المتعددة', fr: 'Médiathèque' },
    [ActivityType.CONTEMPORARY_ART]: { ar: 'الفن التشكيلي المعاصر', fr: 'Art Plastique Contemporain' },
    [ActivityType.MUSIC]: { ar: 'الموسيقى والفنون الغنائية', fr: 'Musique et Arts Lyriques' },
    [ActivityType.DRAMATIC_ARTS]: { ar: 'الفنون الدرامية', fr: 'Arts Dramatiques' },
    [ActivityType.PHOTOGRAPHY_CINEMA]: { ar: 'التصوير الفوتوغرافي والصناعة السينمائية', fr: 'Photographie et Cinéma' },
    [ActivityType.CINEMATHEQUE]: { ar: 'السينماتيك', fr: 'Cinémathèque' },
    [ActivityType.LITERARY_INTELLECTUAL]: { ar: 'الفكري الأدبي', fr: 'Littéraire et Intellectuel' },
    [ActivityType.ENTREPRENEURSHIP]: { ar: 'المقاولاتية وريادة الأعمال', fr: 'Entrepreneuriat' },
    [ActivityType.GIRL_EMPOWERMENT]: { ar: 'تمكين الفتاة', fr: 'Autonomisation des Filles' },
    [ActivityType.PERFORMANCE_ARTS]: { ar: 'فنون الأداء الاستعراضي', fr: 'Arts de la Performance' },
    [ActivityType.CREATIVE_WRITING]: { ar: 'الكتابة الإبداعية المعاصرة', fr: 'Écriture Créative' },
    [ActivityType.CRAFTS]: { ar: 'الفنون الحرفية الإبداعية', fr: 'Artisanat Créatif' },

    // 3. Mobility & Sports
    [ActivityType.ESPORTS]: { ar: 'الرياضة الإلكترونية المبتكرة', fr: 'E-Sports' },
    [ActivityType.VR_GAMES]: { ar: 'الألعاب التعليمية والواقع الافتراضي', fr: 'Jeux Éducatifs et VR' },
    [ActivityType.CINEMA_3D_9D]: { ar: 'الترفيه السينمائي 3D/9D', fr: 'Cinéma 3D/9D' },
    [ActivityType.HIKING_CAMPING]: { ar: 'الشباب الجوال (التخييم والتجوال)', fr: 'Randonnée et Camping' },
    [ActivityType.MOUNTAIN_SPORTS]: { ar: 'الرياضات الجبلية والمغامرات', fr: 'Sports de Montagne' },
    [ActivityType.RECREATIONAL_SPORTS]: { ar: 'الرياضة الترفيهية', fr: 'Sports Récréatifs' },
    [ActivityType.SCOUTING]: { ar: 'التكشيف والرحلات', fr: 'Scoutisme et Voyages' },
    [ActivityType.GEOCACHING]: { ar: 'البراري مع تقنية الجيوكاشينغ', fr: 'Geocaching' },

    // 4. Psychological Support
    [ActivityType.PSYCHOLOGICAL_COUNSELING]: { ar: 'الإصغاء والإرشاد النفسي', fr: 'Écoute et Orientation Psychologique' },
    [ActivityType.HEALTH_PREVENTION]: { ar: 'وقاية صحة الشباب', fr: 'Prévention Santé Jeunesse' },
    [ActivityType.SOCIAL_SUPPORT]: { ar: 'الدعم الاجتماعي والسلوكي', fr: 'Soutien Social et Comportemental' },
    [ActivityType.SELF_DEVELOPMENT]: { ar: 'التطوير الذاتي', fr: 'Développement Personnel' },

    // 5. Citizenship
    [ActivityType.VOLUNTEERING]: { ar: 'الاجتماعية والتطوع', fr: 'Volontariat et Action Sociale' },
    [ActivityType.NEIGHBORHOOD_MEDIATION]: { ar: 'الوساطة الجوارية', fr: 'Médiation de Quartier' },

    // 6. Capacity Empowerment
    [ActivityType.SELF_LEARNING]: { ar: 'مهارات التعلم الذاتي', fr: 'Auto-apprentissage' },
    [ActivityType.DISTINGUISHED_YOUTH]: { ar: 'الشباب المتميز', fr: 'Jeunes Distingués' },
    [ActivityType.DIGITAL_LEARNING]: { ar: 'مهارات التعلم الرقمي', fr: 'Apprentissage Numérique' },
    [ActivityType.YOUTH_GALLERY]: { ar: 'غاليري الشباب', fr: 'Galerie Jeunesse' },
    [ActivityType.SCIENCE_CAFE]: { ar: 'ساينس كافيه', fr: 'Science Café' },
    [ActivityType.SCIENTIFIC_EXPEDITIONS]: { ar: 'الرحلات الاستكشافية العلمية', fr: 'Expéditions Scientifiques' },
    [ActivityType.CITIZENSHIP_AMBASSADORS]: { ar: 'سفراء المواطنة', fr: 'Ambassadeurs de Citoyenneté' },
    [ActivityType.FUTURE_LEADERS]: { ar: 'قادة المستقبل', fr: 'Futurs Leaders' },
    [ActivityType.DEBATES]: { ar: 'المناظرات وتنمية التفكير', fr: 'Débats et Pensée Critique' },
    [ActivityType.LANGUAGES]: { ar: 'اللغات وفن التواصل', fr: 'Langues et Communication' },
    [ActivityType.ENTREPRENEUR_PROGRAM]: { ar: 'رائد الأعمال', fr: 'Programme Entrepreneur' },
    [ActivityType.TALENT_INCUBATORS]: { ar: 'حاضنات المواهب', fr: 'Incubateurs de Talents' },
    [ActivityType.DIGITAL_MARKETING]: { ar: 'التسويق الرقمي', fr: 'Marketing Numérique' },
    [ActivityType.TALENT_FORUM]: { ar: 'منتدى المواهب الشابة', fr: 'Forum des Talents' },
    [ActivityType.MINI_FESTIVALS]: { ar: 'المهرجانات الشبابية المصغرة', fr: 'Mini-Festivals' },
    [ActivityType.APP_DEVELOPMENT]: { ar: 'تطوير المنصات والتطبيقات', fr: 'Dév. Apps et Plateformes' },
    [ActivityType.LISTENING_SESSIONS]: { ar: 'جلسات الإصغاء والحوار', fr: 'Sessions d\'Écoute' }
};

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, { ar: string; fr: string }> = {
    [ActivityStatus.DRAFT]: { ar: 'مسودة', fr: 'Brouillon' },
    [ActivityStatus.PENDING_DEPARTMENT]: { ar: 'بانتظار رئيس المصلحة', fr: 'Attente Chef Service' },
    [ActivityStatus.PENDING_DIRECTOR]: { ar: 'بانتظار المدير', fr: 'Attente Directeur' },
    [ActivityStatus.PUBLISHED]: { ar: 'منشور', fr: 'Publié' },
    [ActivityStatus.ONGOING]: { ar: 'قيد التنفيذ', fr: 'En cours' },
    [ActivityStatus.COMPLETED]: { ar: 'مكتمل', fr: 'Terminé' },
    [ActivityStatus.CANCELLED]: { ar: 'ملغي', fr: 'Annulé' },
    [ActivityStatus.REJECTED]: { ar: 'مرفوض', fr: 'Rejeté' },
    [ActivityStatus.POSTPONED]: { ar: 'مؤجل', fr: 'Reporté' },
    [ActivityStatus.RESERVATION]: { ar: 'تحفظ', fr: 'Réservé' },
    [ActivityStatus.APPROVED]: { ar: 'موافق عليه', fr: 'Approuvé' }
};

export const SEASON_STATUS_LABELS: Record<SeasonStatus, { ar: string; fr: string }> = {
    [SeasonStatus.DRAFT]: { ar: 'مسودة', fr: 'Brouillon' },
    [SeasonStatus.OPEN]: { ar: 'مفتوح', fr: 'Ouvert' },
    [SeasonStatus.CLOSED]: { ar: 'مغلق', fr: 'Fermé' }
};

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, { ar: string; fr: string }> = {
    [RegistrationStatus.PENDING]: { ar: 'قيد الانتظار', fr: 'En attente' },
    [RegistrationStatus.APPROVED]: { ar: 'مقبول', fr: 'Approuvée' },
    [RegistrationStatus.REJECTED]: { ar: 'مرفوض', fr: 'Rejetée' },
    [RegistrationStatus.CANCELLED]: { ar: 'ملغي', fr: 'Annulée' }
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, { ar: string; fr: string }> = {
    [PaymentStatus.PENDING]: { ar: 'لم يدفع', fr: 'En attente' },
    [PaymentStatus.PAID]: { ar: 'مدفوع', fr: 'Payé' },
    [PaymentStatus.EXEMPT]: { ar: 'معفى', fr: 'Exempté' }
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, { ar: string; fr: string }> = {
    [AttendanceStatus.PRESENT]: { ar: 'حاضر', fr: 'Présent' },
    [AttendanceStatus.ABSENT]: { ar: 'غائب', fr: 'Absent' },
    [AttendanceStatus.LATE]: { ar: 'متأخر', fr: 'En retard' },
    [AttendanceStatus.EXCUSED]: { ar: 'غائب بعذر', fr: 'Excusé' }
};

export enum PartnerType {
    ASSOCIATION = "ASSOCIATION",
    CLUB = "CLUB",
    SCOUTS = "SCOUTS",
    GOVERNMENT = "GOVERNMENT",
    COMPANY = "COMPANY",
    INSTITUTION = "INSTITUTION",
    OTHER = "OTHER"
}

export const PARTNER_TYPE_LABELS: Record<PartnerType, { ar: string, fr: string }> = {
    [PartnerType.ASSOCIATION]: { ar: "جمعية", fr: "Association" },
    [PartnerType.CLUB]: { ar: "نادي", fr: "Club" },
    [PartnerType.SCOUTS]: { ar: "كشافة", fr: "Scouts" },
    [PartnerType.GOVERNMENT]: { ar: "جهة حكومية", fr: "Institution Publique" },
    [PartnerType.COMPANY]: { ar: "شركة / ممول", fr: "Entreprise / Sponsor" },
    [PartnerType.INSTITUTION]: { ar: "مؤسسة (قطاع الشباب)", fr: "Institution (Jeunesse)" },
    [PartnerType.OTHER]: { ar: "أخرى", fr: "Autre" }
};

// ============== Types ==============

export interface ActivitySeason {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    theme?: string;
    objectives?: string[];
    status: SeasonStatus;
    opened_at?: string;
    closed_at?: string;
}

export interface AnnualProgram {
    id: string;
    title: string;
    description?: string;
    season_id: string;
    institution_id?: string;
    season?: ActivitySeason;
    institution?: InstitutionBasic;
    objectives?: string[];
    target_activities_count: number;
    status: string;
    is_active: boolean;
}

export interface ActivityCategory {
    id: string;
    code: string;
    name_ar: string;
    name_fr?: string;
    name_en?: string;
    description?: string;
    icon?: string;
    color: string;
    display_order: number;
    is_active: boolean;
    created_at: string;
}

// ============== Dynamic Configuration Types ==============

export interface ActivityDomainConfig {
    id: string;
    code: string;
    name_ar: string;
    name_fr?: string;
    description?: string;
    is_active: boolean;
    created_at: string;
}

export interface ActivityTypeConfig {
    id: string;
    domain_id: string;
    code: string;
    name_ar: string;
    name_fr?: string;
    description?: string;
    is_active: boolean;
    created_at: string;
}

export interface ActivityTargetCategory {
    id: string;
    code: string;
    name_ar: string;
    name_fr?: string;
    min_age?: number;
    max_age?: number;
    is_active: boolean;
    created_at: string;
}

export enum ActivityLocationType {
    INTERNAL = 'INTERNAL',
    EXTERNAL = 'EXTERNAL',
    HYBRID = 'HYBRID'
}

export const ACTIVITY_LOCATION_TYPE_LABELS: Record<ActivityLocationType, { ar: string; fr: string }> = {
    [ActivityLocationType.INTERNAL]: { ar: 'داخلي', fr: 'Interne' },
    [ActivityLocationType.EXTERNAL]: { ar: 'خارجي', fr: 'Externe' },
    [ActivityLocationType.HYBRID]: { ar: 'مختلط', fr: 'Hybride' }
};

export interface InstitutionBasic {
    id: string;
    name_ar: string;
    name_fr?: string;
    short_name?: string;
}

export interface EmployeeBasic {
    id: string;
    firstname_ar: string;
    lastname_ar: string;
}

export interface UserBasic {
    id: string;
    firstname_ar?: string;
    lastname_ar?: string;
    email: string;
}

export interface RoomBasic {
    id: string;
    name: string;
    institution?: InstitutionBasic;
}

export interface ActivityCoordinator {
    id: string;
    employee_id: string;
    role: string;
    employee?: EmployeeBasic;
}

export interface ActivityPartner {
    id: string;
    partner_type: PartnerType;
    partner_name?: string;
    institution_id?: string;
    institution?: InstitutionBasic;
    contact_person?: string;
    contact_phone?: string;
    contribution?: string;
    notes?: string;
    created_at?: string;
}

export interface ActivityGroup {
    id: string;
    name: string;
    max_participants: number;
    min_age?: number;
    max_age?: number;
    target_gender?: string;
    schedule?: { day: string; start_time: string; end_time: string }[];
    instructor_id?: string;
    instructor?: EmployeeBasic;
}

export interface CommitteeMember {
    id: string;
    committee_id: string;
    employee_id: string;
    employee?: EmployeeBasic;
    role?: string;
    is_head: boolean;
    joined_at: string;
}

export interface ActivityCommittee {
    id: string;
    activity_id: string;
    name: string;
    description?: string;
    members?: CommitteeMember[];
}

export interface ActivityRoom {
    id: string;
    room_id: string;
    room?: RoomBasic;
    usage_notes?: string;
}


export interface Activity {
    id: string;
    code: string;
    title_ar: string;
    title_fr?: string;
    slug?: string;
    description_ar?: string;
    description_fr?: string;
    cover_image?: string;
    gallery_images: string[];

    category_id?: string;
    category?: ActivityCategory;

    program_id?: string;
    program?: AnnualProgram;
    season_id?: string;
    season?: ActivitySeason;

    nature: ActivityNature;
    domain_id?: string;
    domain?: ActivityDomainConfig;
    activity_type_id?: string;
    activity_type?: ActivityTypeConfig;
    target_categories?: ActivityTargetCategory[];
    department_type?: DepartmentType;

    institution_id: string;
    institution?: InstitutionBasic;
    room_id?: string;
    room?: RoomBasic;
    location_type: ActivityLocationType;
    location_details?: string;

    start_date?: string;
    end_date?: string;
    time_slot?: string;
    objectives?: string[];
    duration_minutes?: number;
    registration_start?: string;
    registration_deadline?: string;

    recurrence_type?: RecurrenceType;
    recurrence_interval?: number;
    recurrence_end_date?: string;

    max_participants: number;
    min_age?: number;
    max_age?: number;
    target_gender?: string;

    is_free: boolean;
    fee_amount: number;

    status: ActivityStatus;
    approval_status?: string;
    postponement_reason?: string;

    is_public: boolean;
    is_featured: boolean;
    is_major_event: boolean;

    // External Registration
    external_website_url?: string;
    api_key_id?: string;
    is_external_registration_open: boolean;
    custom_fields_schema?: Record<string, unknown>;

    // Google Sheets Sync
    google_sheets_sync_url?: string;
    google_sheets_sync_mode?: string;

    coordinator_id?: string;
    created_by?: UserBasic;

    estimated_budget: number;

    views_count: number;
    registrations_count: number;

    created_at: string;
    updated_at?: string;

    // Sub-lists
    coordinators?: ActivityCoordinator[];
    groups?: ActivityGroup[];
    approvals?: Approval[];
    committees?: ActivityCommittee[];
    partners?: ActivityPartner[];
}

export interface SyncGoogleSheetsResponse {
    added: number;
    skipped: number;
    errors: number;
    total: number;
    details: Array<{
        row?: number;
        status?: string;
        reason?: string;
        error?: string;
        phone?: string;
        name?: string;
    }>;
    message: string;
}

export interface ActivityListItem {
    id: string;
    code: string;
    title_ar: string;
    title_fr?: string;
    cover_image?: string;
    category?: ActivityCategory;
    institution?: InstitutionBasic;
    season?: ActivitySeason;
    start_date?: string;
    status: ActivityStatus;
    approval_status?: string;
    nature?: ActivityNature;
    department_type?: string;
    is_free: boolean;
    max_participants: number;
    registrations_count: number;
    is_featured: boolean;
    is_major_event: boolean;
    external_website_url?: string;
    is_external_registration_open?: boolean;
}

export interface CreateActivityDTO {
    title_ar: string;
    title_fr?: string;
    description_ar?: string;
    description_fr?: string;
    cover_image?: string;
    gallery_images?: string[];

    category_id?: string;
    program_id?: string;
    season_id?: string;

    nature?: ActivityNature;
    domain_id?: string;
    activity_type_id?: string;
    target_category_ids?: string[];
    department_type?: string;

    institution_id: string;
    room_id?: string;
    location_type?: ActivityLocationType;
    location_details?: string;

    start_date?: string;
    end_date?: string;
    time_slot?: string;
    objectives?: string[];
    duration_minutes?: number;
    registration_start?: string;
    registration_deadline?: string;

    recurrence_type?: RecurrenceType;
    recurrence_interval?: number;
    recurrence_end_date?: string;

    max_participants?: number;
    min_age?: number;
    max_age?: number;
    target_gender?: string;

    is_free?: boolean;
    fee_amount?: number;
    is_public?: boolean;
    is_featured?: boolean;
    is_major_event?: boolean;

    // External Registration
    external_website_url?: string;
    api_key_id?: string;
    is_external_registration_open?: boolean;
    custom_fields_schema?: Record<string, unknown>;

    // Google Sheets Sync
    google_sheets_sync_url?: string;
    google_sheets_sync_mode?: string;

    coordinator_id?: string;
    estimated_budget?: number;

    coordinators?: CreateCoordinatorDTO[];
    groups?: CreateGroupDTO[];
}

export interface UpdateActivityDTO extends Partial<CreateActivityDTO> {
    status?: ActivityStatus;
    approval_status?: string;
}

export interface Session {
    id: string;
    activity_id: string;
    session_date: string;
    start_time: string;
    end_time?: string;
    room_id?: string;
    room?: RoomBasic;
    location_override?: string;
    instructor_id?: string;
    instructor?: EmployeeBasic;
    status: SessionStatus;
    topic?: string;
    notes?: string;
    created_at: string;
}

export interface CreateSessionDTO {
    session_date: string;
    start_time: string;
    end_time?: string;
    room_id?: string;
    location_override?: string;
    instructor_id?: string;
    topic?: string;
    notes?: string;
}

export interface Participant {
    id: string;
    user_id?: string;
    firstname_ar: string;
    lastname_ar: string;
    firstname_fr?: string;
    lastname_fr?: string;
    birth_date?: string;
    gender?: Gender;
    phone?: string;
    email?: string;
    address?: string;
    guardian_name?: string;
    guardian_phone?: string;
    guardian_relation?: string;
    emergency_contact?: string;
    emergency_phone?: string;
    medical_notes?: string;
    blood_type?: string;
    is_active: boolean;
    created_at: string;
}

export interface CreateParticipantDTO {
    user_id?: string;
    firstname_ar: string;
    lastname_ar: string;
    firstname_fr?: string;
    lastname_fr?: string;
    birth_date?: string;
    gender?: Gender;
    phone?: string;
    email?: string;
    address?: string;
    guardian_name?: string;
    guardian_phone?: string;
    guardian_relation?: string;
    emergency_contact?: string;
    emergency_phone?: string;
    medical_notes?: string;
    blood_type?: string;
}

export interface Registration {
    id: string;
    activity_id: string;
    participant_id: string;
    participant?: Participant;
    registration_date: string;
    status: RegistrationStatus;
    payment_status: PaymentStatus;
    payment_date?: string;
    payment_reference?: string;
    notes?: string;
    custom_data?: Record<string, unknown>;
    rejection_reason?: string;
    processed_at?: string;
}

export interface CreateRegistrationDTO {
    activity_id: string;
    participant_id?: string;
    participant_data?: CreateParticipantDTO;
    notes?: string;
}

export interface UpdateRegistrationDTO {
    status?: RegistrationStatus;
    payment_status?: PaymentStatus;
    payment_reference?: string;
    notes?: string;
    rejection_reason?: string;
}

export interface Attendance {
    id: string;
    session_id: string;
    participant_id: string;
    participant?: Participant;
    status: AttendanceStatus;
    check_in_time?: string;
    notes?: string;
    created_at: string;
}

export interface AttendanceRecord {
    participant_id: string;
    status: AttendanceStatus;
    notes?: string;
}

export interface AttendanceBulkCreate {
    session_id: string;
    records: AttendanceRecord[];
}

export interface PublicRegistrationDTO {
    activity_id: string;
    firstname_ar: string;
    lastname_ar: string;
    firstname_fr?: string;
    lastname_fr?: string;
    birth_date?: string;
    gender?: Gender;
    phone: string;
    email?: string;
    guardian_name?: string;
    guardian_phone?: string;
}

export interface ActivityFilters {
    search?: string;
    category_id?: string;
    institution_id?: string;
    program_id?: string;
    season_id?: string;
    status?: ActivityStatus;
    nature?: ActivityNature;
    domain_id?: string;
    activity_type_id?: string;
    is_public?: boolean;
    is_free?: boolean;
    date_from?: string;
    date_to?: string;
}

// ============== Dynamic/Sub-Entity Types ==============

export interface SeasonAward {
    id: string;
    institution_id: string;
    institution_name?: string;
    activity_count?: number;
    total_participants?: number;
    score?: number;
    rank?: number;
    award_type?: string;
    created_at: string;
}

export interface NationalEvent {
    id: string;
    name_ar: string;
    name_fr?: string;
    event_type: string;
    date_type?: string;
    month?: number;
    day?: number;
    description?: string;
    is_active: boolean;
    created_at: string;
}

export interface Approval {
    id: string;
    activity_id: string;
    approved_by?: string;
    approver?: UserBasic;
    notes?: string;
    status: string;
    created_at: string;
}

export interface CommitteeTask {
    id: string;
    committee_id: string;
    title: string;
    description?: string;
    assigned_to?: string;
    assignee?: EmployeeBasic;
    status: string;
    due_date?: string;
    created_at: string;
}

export interface ActivityBudgetItem {
    id: string;
    activity_id: string;
    description: string;
    category?: string;
    estimated_amount: number;
    actual_amount?: number;
    status?: string;
    notes?: string;
    created_at: string;
}

export interface Photo {
    id: string;
    activity_id: string;
    immich_asset_id: string;
    is_cover: boolean;
    url?: string;
    created_at: string;
}

export interface Album {
    id: string;
    activity_id: string;
    immich_album_id: string;
    name?: string;
    created_at: string;
}

export interface ActivityComment {
    id: string;
    activity_id: string;
    user_id?: string;
    user?: UserBasic;
    content: string;
    created_at: string;
}

export interface Rating {
    id: string;
    activity_id: string;
    user_id?: string;
    user?: UserBasic;
    rating: number;
    feedback?: string;
    created_at: string;
}

// ============== Create DTOs ==============

export interface CreateDomainDTO {
    code: string;
    name_ar: string;
    name_fr?: string;
    description?: string;
    is_active?: boolean;
}

export interface CreateActivityTypeDTO {
    domain_id: string;
    code: string;
    name_ar: string;
    name_fr?: string;
    description?: string;
    is_active?: boolean;
}

export interface CreateTargetCategoryDTO {
    code: string;
    name_ar: string;
    name_fr?: string;
    min_age?: number;
    max_age?: number;
    is_active?: boolean;
}

export interface CreateNationalEventDTO {
    name_ar: string;
    name_fr?: string;
    event_type: string;
    date_type?: string;
    month?: number;
    day?: number;
    description?: string;
    is_active?: boolean;
}

export interface CreateGroupDTO {
    name: string;
    max_participants: number;
    min_age?: number;
    max_age?: number;
    target_gender?: string;
    schedule?: { day: string; start_time: string; end_time: string }[];
    instructor_id?: string;
}

export interface CreateCoordinatorDTO {
    employee_id: string;
    role: string;
}

export interface CreatePartnerDTO {
    partner_type: PartnerType;
    partner_name?: string;
    institution_id?: string;
    contact_person?: string;
    contact_phone?: string;
    contribution?: string;
    notes?: string;
}

export interface CreateCommitteeMemberDTO {
    employee_id: string;
    role?: string;
    is_head?: boolean;
}

export interface CreateCommitteeTaskDTO {
    title: string;
    description?: string;
    assigned_to?: string;
    due_date?: string;
}

export interface CreateBudgetItemDTO {
    description: string;
    category?: string;
    estimated_amount: number;
    notes?: string;
}

// ============== Activity Statistics ==============

export interface ActivityStatistics {
    total_registrations: number;
    status_distribution: Record<string, number>;
    gender_distribution: Record<string, number>;
    age_distribution: Record<string, number>;
    monthly_registrations: { month: string; count: number }[];
    daily_registrations: { date: string; count: number }[];
    custom_field_statistics: Record<string, { value: string; count: number }[]>;
    total_males: number;
    total_females: number;
    average_age: number | null;
}

// ============== API Functions ==============

export const activitiesApi = {
    // Dynamic Configuration
    getDomains: async (includeInactive: boolean = false): Promise<ActivityDomainConfig[]> => {
        const res = await api.get('/activities/domains', {
            params: { include_inactive: includeInactive }
        });
        return res.data;
    },

    createDomain: async (data: CreateDomainDTO): Promise<ActivityDomainConfig> => {
        const res = await api.post('/activities/domains', data);
        return res.data;
    },

    updateDomain: async (id: string, data: Partial<CreateDomainDTO>): Promise<ActivityDomainConfig> => {
        const res = await api.patch(`/activities/domains/${id}`, data);
        return res.data;
    },

    deleteDomain: async (id: string): Promise<void> => {
        await api.delete(`/activities/domains/${id}`);
    },

    getActivityTypes: async (domainId?: string, includeInactive: boolean = false): Promise<ActivityTypeConfig[]> => {
        const params: { domain_id?: string; include_inactive?: boolean } = {};
        if (domainId) params.domain_id = domainId;
        if (includeInactive) params.include_inactive = true;

        const res = await api.get('/activities/types', { params });
        return res.data;
    },

    createActivityType: async (data: CreateActivityTypeDTO): Promise<ActivityTypeConfig> => {
        const res = await api.post('/activities/types', data);
        return res.data;
    },

    updateActivityType: async (id: string, data: Partial<CreateActivityTypeDTO>): Promise<ActivityTypeConfig> => {
        const res = await api.patch(`/activities/types/${id}`, data);
        return res.data;
    },

    deleteActivityType: async (id: string): Promise<void> => {
        await api.delete(`/activities/types/${id}`);
    },

    getTargetCategories: async (includeInactive: boolean = false): Promise<ActivityTargetCategory[]> => {
        const res = await api.get('/activities/target-categories', {
            params: { include_inactive: includeInactive }
        });
        return res.data;
    },

    createTargetCategory: async (data: CreateTargetCategoryDTO): Promise<ActivityTargetCategory> => {
        const res = await api.post('/activities/target-categories', data);
        return res.data;
    },

    updateTargetCategory: async (id: string, data: Partial<CreateTargetCategoryDTO>): Promise<ActivityTargetCategory> => {
        const res = await api.patch(`/activities/target-categories/${id}`, data);
        return res.data;
    },

    deleteTargetCategory: async (id: string): Promise<void> => {
        await api.delete(`/activities/target-categories/${id}`);
    },

    // Seasons
    getSeasons: async (): Promise<ActivitySeason[]> => {
        const res = await api.get('/activities/seasons');
        return res.data;
    },

    createSeason: async (data: Partial<ActivitySeason>): Promise<ActivitySeason> => {
        const res = await api.post('/activities/seasons', data);
        return res.data;
    },

    updateSeason: async (id: string, data: Partial<ActivitySeason>): Promise<ActivitySeason> => {
        const res = await api.patch(`/activities/seasons/${id}`, data);
        return res.data;
    },

    openSeason: async (id: string): Promise<ActivitySeason> => {
        const res = await api.post(`/activities/seasons/${id}/open`, {});
        return res.data;
    },

    closeSeason: async (id: string): Promise<ActivitySeason> => {
        const res = await api.post(`/activities/seasons/${id}/close`, {});
        return res.data;
    },

    deleteSeason: async (id: string, permanent = false): Promise<void> => {
        await api.delete(`/activities/seasons/${id}`, {
            params: { permanent }
        });
    },

    // Season Awards
    getSeasonAwards: async (seasonId: string): Promise<SeasonAward[]> => {
        const res = await api.get(`/activities/seasons/${seasonId}/awards`);
        return res.data;
    },

    calculateSeasonAwards: async (seasonId: string): Promise<SeasonAward[]> => {
        const res = await api.post(`/activities/seasons/${seasonId}/calculate-awards`, {});
        return res.data;
    },

    // National Events
    getNationalEvents: async (filters?: { event_type?: string; month?: number }): Promise<NationalEvent[]> => {
        const res = await api.get('/activities/events', {
            params: filters
        });
        return res.data;
    },

    createNationalEvent: async (data: CreateNationalEventDTO): Promise<NationalEvent> => {
        const res = await api.post('/activities/events', data);
        return res.data;
    },

    updateNationalEvent: async (id: string, data: Partial<CreateNationalEventDTO>): Promise<NationalEvent> => {
        const res = await api.patch(`/activities/events/${id}`, data);
        return res.data;
    },

    deleteNationalEvent: async (id: string): Promise<void> => {
        await api.delete(`/activities/events/${id}`);
    },

    // Programs
    getPrograms: async (seasonId?: string, institutionId?: string): Promise<AnnualProgram[]> => {
        const res = await api.get('/activities/programs', {
            params: { season_id: seasonId, institution_id: institutionId }
        });
        return res.data;
    },

    createProgram: async (data: Partial<AnnualProgram>): Promise<AnnualProgram> => {
        const res = await api.post('/activities/programs', data);
        return res.data;
    },

    updateProgram: async (id: string, data: Partial<AnnualProgram>): Promise<AnnualProgram> => {
        const res = await api.patch(`/activities/programs/${id}`, data);
        return res.data;
    },

    deleteProgram: async (id: string, permanent = false): Promise<void> => {
        await api.delete(`/activities/programs/${id}`, {
            params: { permanent }
        });
    },

    // Categories
    getCategories: async (includeInactive = false): Promise<ActivityCategory[]> => {
        const res = await api.get('/activities/categories', {
            params: { include_inactive: includeInactive }
        });
        return res.data;
    },

    createCategory: async (data: Partial<ActivityCategory>): Promise<ActivityCategory> => {
        const res = await api.post('/activities/categories', data);
        return res.data;
    },

    updateCategory: async (id: string, data: Partial<ActivityCategory>): Promise<ActivityCategory> => {
        const res = await api.patch(`/activities/categories/${id}`, data);
        return res.data;
    },

    // Activities
    getActivities: async (filters: ActivityFilters & { page?: number; size?: number } = {}): Promise<PaginatedResponse<ActivityListItem>> => {
        const res = await api.get('/activities', {
            params: filters
        });
        return res.data;
    },

    getActivity: async (id: string): Promise<Activity> => {
        const res = await api.get(`/activities/${id}`);
        return res.data;
    },

    createActivity: async (data: CreateActivityDTO): Promise<Activity> => {
        const res = await api.post('/activities', data);
        return res.data;
    },

    updateActivity: async (id: string, data: UpdateActivityDTO): Promise<Activity> => {
        const res = await api.patch(`/activities/${id}`, data);
        return res.data;
    },

    submitForApproval: async (id: string): Promise<Activity> => {
        const res = await api.post(`/activities/${id}/submit`, {});
        return res.data;
    },

    approveActivity: async (id: string, notes?: string): Promise<Activity> => {
        const res = await api.post(`/activities/${id}/approve`, { notes });
        return res.data;
    },

    rejectActivity: async (id: string, notes: string): Promise<Activity> => {
        const res = await api.post(`/activities/${id}/reject`, { notes });
        return res.data;
    },

    reserveActivity: async (id: string, notes: string): Promise<Activity> => {
        const res = await api.post(`/activities/${id}/reserve`, { notes });
        return res.data;
    },

    changeActivityStatus: async (id: string, new_status: ActivityStatus, reason?: string): Promise<Activity> => {
        const res = await api.patch(`/activities/${id}/status`, { new_status, reason });
        return res.data;
    },

    deleteActivity: async (id: string): Promise<void> => {
        await api.delete(`/activities/${id}`);
    },

    // Sessions
    getSessions: async (activityId: string): Promise<Session[]> => {
        const res = await api.get(`/activities/${activityId}/sessions`);
        return res.data;
    },

    createSession: async (activityId: string, data: CreateSessionDTO): Promise<Session> => {
        const res = await api.post(`/activities/${activityId}/sessions`, data);
        return res.data;
    },

    updateSession: async (sessionId: string, data: Partial<CreateSessionDTO> & { status?: SessionStatus }): Promise<Session> => {
        const res = await api.patch(`/activities/sessions/${sessionId}`, data);
        return res.data;
    },

    // Registrations
    getRegistrations: async (activityId: string): Promise<Registration[]> => {
        const res = await api.get(`/activities/${activityId}/registrations`);
        return res.data;
    },

    createRegistration: async (data: CreateRegistrationDTO): Promise<Registration> => {
        const res = await api.post('/activities/registrations', data);
        return res.data;
    },

    updateRegistration: async (registrationId: string, data: UpdateRegistrationDTO): Promise<Registration> => {
        const res = await api.patch(`/activities/registrations/${registrationId}`, data);
        return res.data;
    },

    deleteRegistration: async (registrationId: string): Promise<void> => {
        await api.delete(`/activities/registrations/${registrationId}/hard`);
    },

    softDeleteRegistration: async (registrationId: string): Promise<void> => {
        await api.delete(`/activities/registrations/${registrationId}`);
    },

    syncGoogleSheets: async (activityId: string): Promise<SyncGoogleSheetsResponse> => {
        const res = await api.post(`/activities/${activityId}/sync-google-sheets`);
        return res.data;
    },

    // Participants
    getParticipants: async (search?: string, page = 1, size = 50): Promise<PaginatedResponse<Participant>> => {
        const res = await api.get('/activities/participants', {
            params: { search, page, size }
        });
        return res.data;
    },

    createParticipant: async (data: CreateParticipantDTO): Promise<Participant> => {
        const res = await api.post('/activities/participants', data);
        return res.data;
    },

    updateParticipant: async (participantId: string, data: Partial<CreateParticipantDTO>): Promise<Participant> => {
        const res = await api.patch(`/activities/participants/${participantId}`, data);
        return res.data;
    },

    // Rooms
    getActivityRooms: async (activityId: string): Promise<ActivityRoom[]> => {
        const res = await api.get(`/activities/${activityId}/rooms`);
        return res.data;
    },

    addActivityRoom: async (activityId: string, data: { room_id: string, usage_notes?: string }): Promise<ActivityRoom> => {
        const res = await api.post(`/activities/${activityId}/rooms`, data);
        return res.data;
    },

    deleteActivityRoom: async (activityId: string, roomId: string): Promise<void> => {
        await api.delete(`/activities/${activityId}/rooms/${roomId}`);
    },

    // Attendance
    getSessionAttendance: async (sessionId: string): Promise<Attendance[]> => {
        const res = await api.get(`/activities/sessions/${sessionId}/attendance`);
        return res.data;
    },

    recordAttendance: async (data: AttendanceBulkCreate): Promise<Attendance[]> => {
        const res = await api.post('/activities/attendance', data);
        return res.data;
    },

    // Public Portal
    getPublicActivities: async (params: { category_id?: string; search?: string; page?: number; size?: number } = {}): Promise<PaginatedResponse<ActivityListItem>> => {
        const res = await api.get('/activities/public/list', { params });
        return res.data;
    },

    getPublicActivity: async (slug: string): Promise<Activity> => {
        const res = await api.get(`/activities/public/${slug}`);
        return res.data;
    },

    publicRegister: async (data: PublicRegistrationDTO): Promise<Registration> => {
        const res = await api.post('/activities/public/register', data);
        return res.data;
    },

    getPublicCategories: async (): Promise<ActivityCategory[]> => {
        const res = await api.get('/activities/public/categories');
        return res.data;
    },

    getPublicEvents: async (filters?: { event_type?: string; month?: number }): Promise<NationalEvent[]> => {
        const res = await api.get('/activities/public/events', {
            params: filters
        });
        return res.data;
    },

    getActivityById: async (id: string): Promise<Activity> => {
        return activitiesApi.getActivity(id);
    },

    getActivitySessions: async (activityId: string): Promise<Session[]> => {
        return activitiesApi.getSessions(activityId);
    },

    getActivityRegistrations: async (activityId: string): Promise<Registration[]> => {
        return activitiesApi.getRegistrations(activityId);
    },

    getActivityStatistics: async (activityId: string): Promise<ActivityStatistics> => {
        const res = await api.get(`/activities/${activityId}/statistics`);
        return res.data;
    },

    registerGuest: async (activityId: string, data: { participant_data: CreateParticipantDTO; notes?: string }): Promise<Registration> => {
        const payload = {
            activity_id: activityId,
            firstname_ar: data.participant_data.firstname_ar,
            lastname_ar: data.participant_data.lastname_ar,
            firstname_fr: data.participant_data.firstname_fr,
            lastname_fr: data.participant_data.lastname_fr,
            birth_date: data.participant_data.birth_date,
            gender: data.participant_data.gender,
            phone: data.participant_data.phone,
            email: data.participant_data.email,
            guardian_name: data.participant_data.guardian_name,
            guardian_phone: data.participant_data.guardian_phone
        };
        const res = await api.post('/activities/public/register', payload);
        return res.data;
    },

    deleteSession: async (activityId: string, sessionId: string): Promise<void> => {
        await api.delete(`/activities/${activityId}/sessions/${sessionId}`);
    },

    // Activity Groups
    getActivityGroups: async (activityId: string): Promise<ActivityGroup[]> => {
        const res = await api.get(`/activities/${activityId}/groups`);
        return res.data;
    },

    addActivityGroup: async (activityId: string, data: CreateGroupDTO): Promise<ActivityGroup> => {
        const res = await api.post(`/activities/${activityId}/groups`, data);
        return res.data;
    },

    deleteActivityGroup: async (activityId: string, groupId: string): Promise<void> => {
        await api.delete(`/activities/${activityId}/groups/${groupId}`);
    },

    // Activity Coordinators
    getActivityCoordinators: async (activityId: string): Promise<ActivityCoordinator[]> => {
        const res = await api.get(`/activities/${activityId}/coordinators`);
        return res.data;
    },

    addActivityCoordinator: async (activityId: string, data: CreateCoordinatorDTO): Promise<ActivityCoordinator> => {
        const res = await api.post(`/activities/${activityId}/coordinators`, data);
        return res.data;
    },

    deleteActivityCoordinator: async (activityId: string, coordinatorId: string): Promise<void> => {
        await api.delete(`/activities/${activityId}/coordinators/${coordinatorId}`);
    },

    // Activity Partners
    getActivityPartners: async (activityId: string): Promise<ActivityPartner[]> => {
        const res = await api.get(`/activities/${activityId}/partners`);
        return res.data;
    },

    addActivityPartner: async (activityId: string, data: CreatePartnerDTO): Promise<ActivityPartner> => {
        const res = await api.post(`/activities/${activityId}/partners`, data);
        return res.data;
    },

    deleteActivityPartner: async (activityId: string, partnerId: string): Promise<void> => {
        await api.delete(`/activities/${activityId}/partners/${partnerId}`);
    },

    // Committees
    getActivityCommittees: async (activityId: string): Promise<ActivityCommittee[]> => {
        const res = await api.get(`/activities/${activityId}/committees`);
        return res.data;
    },

    createActivityCommittee: async (activityId: string, data: Partial<ActivityCommittee>): Promise<ActivityCommittee> => {
        const res = await api.post(`/activities/${activityId}/committees`, data);
        return res.data;
    },

    deleteActivityCommittee: async (activityId: string, committeeId: string): Promise<void> => {
        await api.delete(`/activities/${activityId}/committees/${committeeId}`);
    },

    addCommitteeMember: async (committeeId: string, data: CreateCommitteeMemberDTO): Promise<CommitteeMember> => {
        const res = await api.post(`/activities/committees/${committeeId}/members`, data);
        return res.data;
    },

    removeCommitteeMember: async (memberId: string): Promise<void> => {
        await api.delete(`/activities/committees/members/${memberId}`);
    },

    addCommitteeTask: async (committeeId: string, data: CreateCommitteeTaskDTO): Promise<CommitteeTask> => {
        const res = await api.post(`/activities/committees/${committeeId}/tasks`, data);
        return res.data;
    },

    updateTaskStatus: async (taskId: string, status: string): Promise<CommitteeTask> => {
        const res = await api.patch(`/activities/tasks/${taskId}/status`, { status });
        return res.data;
    },

    // Budget
    getActivityBudget: async (activityId: string): Promise<ActivityBudgetItem[]> => {
        const res = await api.get(`/activities/${activityId}/budget`);
        return res.data;
    },

    addBudgetItem: async (activityId: string, data: CreateBudgetItemDTO): Promise<ActivityBudgetItem> => {
        const res = await api.post(`/activities/${activityId}/budget`, data);
        return res.data;
    },

    updateBudgetItem: async (activityId: string, itemId: string, data: Partial<CreateBudgetItemDTO>): Promise<ActivityBudgetItem> => {
        const res = await api.patch(`/activities/${activityId}/budget/${itemId}`, data);
        return res.data;
    },

    deleteBudgetItem: async (activityId: string, itemId: string): Promise<void> => {
        await api.delete(`/activities/${activityId}/budget/${itemId}`);
    },

    // Photos
    getPhotos: async (activityId: string): Promise<Photo[]> => {
        const res = await api.get(`/activities/${activityId}/photos`);
        return res.data;
    },

    addPhoto: async (activityId: string, immichAssetId: string, isCover: boolean = false): Promise<Photo> => {
        const res = await api.post(`/activities/${activityId}/photos`, {
            immich_asset_id: immichAssetId,
            is_cover: isCover
        });
        return res.data;
    },

    removePhoto: async (activityId: string, immichAssetId: string): Promise<void> => {
        await api.delete(`/activities/${activityId}/photos/${immichAssetId}`);
    },

    // Albums
    getAlbums: async (activityId: string): Promise<Album[]> => {
        const res = await api.get(`/activities/${activityId}/albums`);
        return res.data;
    },

    addAlbum: async (activityId: string, immichAlbumId: string): Promise<Album> => {
        const res = await api.post(`/activities/${activityId}/albums`, {
            immich_album_id: immichAlbumId
        });
        return res.data;
    },

    removeAlbum: async (activityId: string, immichAlbumId: string): Promise<void> => {
        await api.delete(`/activities/${activityId}/albums/${immichAlbumId}`);
    },

    // Comments & Ratings
    getActivityComments: async (activityId: string): Promise<ActivityComment[]> => {
        const res = await api.get(`/activities/${activityId}/comments`);
        return res.data;
    },

    addActivityComment: async (activityId: string, data: { content: string }): Promise<ActivityComment> => {
        const res = await api.post(`/activities/${activityId}/comments`, data);
        return res.data;
    },

    rateActivity: async (activityId: string, rating: number, feedback?: string): Promise<Rating> => {
        const res = await api.post(`/activities/${activityId}/rate`, { rating, feedback });
        return res.data;
    },
};

export default activitiesApi;
