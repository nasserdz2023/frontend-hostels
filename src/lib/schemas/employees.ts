import * as z from "zod";

// Age validation helper (18-70 years)
const validateAge = (date: string | undefined) => {
    if (!date) return true;
    if (date === 'DD-MM-YYYY') return true; // Allow placeholder

    const parts = date.split('-');
    if (parts.length !== 3) return true;

    let day, month, year;

    // Check if it's YYYY-MM-DD (first part is 4 digits) or DD-MM-YYYY
    if (parts[0].length === 4) {
        year = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        day = parseInt(parts[2]);
    } else {
        day = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        year = parseInt(parts[2]);
    }

    const birthDate = new Date(year, month, day);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age >= 18 && age <= 70;
};

export const employeeSchema = z.object({
    // Personal Info - Required fields
    firstname_ar: z.string().min(2, "الاسم الأول مطلوب"),
    lastname_ar: z.string().min(2, "الاسم الأخير مطلوب"),
    firstname_fr: z.string().optional().nullable(),
    lastname_fr: z.string().optional().nullable(),
    father_name: z.string().optional().nullable(),  // اسم الأب
    mother_fullname: z.string().optional().nullable(),  // اسم ولقب الأم
    national_id: z.string()
        .min(1, "رقم التعريف الوطني مطلوب")
        .regex(/^\d{18}$/, "رقم التعريف الوطني يجب أن يكون 18 رقماً"),
    birth_date: z.string()
        .min(1, "تاريخ الازدياد مطلوب")
        .refine(validateAge, "العمر يجب أن يكون بين 18 و 70 سنة"),
    birth_place: z.string().optional().nullable(),
    birth_wilaya_code: z.string().min(1, "ولاية الميلاد مطلوبة"),
    birth_municipality_id: z.string().min(1, "بلدية الميلاد مطلوبة"),
    gender: z.string().min(1, "الجنس مطلوب"),
    marital_status: z.string().min(1, "الحالة العائلية مطلوبة"),
    children_count: z.coerce.number().min(0).default(0).optional(),
    profile_photo: z.string().optional().nullable(),
    is_birth_date_estimated: z.boolean().default(false).optional(),

    // Job Info - Required fields
    employee_number: z.string().min(1, "رقم الموظف مطلوب"),
    department: z.string().optional().nullable(),
    department_id: z.string().optional().nullable(),
    office_id: z.string().optional().nullable(),
    position_id: z.string().min(1, "المنصب مطلوب"),
    position: z.string().optional().nullable(),
    grade_id: z.string().optional().nullable(),
    grade: z.string().optional().nullable(),
    institution_id: z.string().optional().nullable(), // Optional for municipal delegate/attaché positions
    rank: z.string().optional().nullable(),
    original_administration_type: z.string().optional().nullable(),
    original_department: z.string().optional().nullable(),
    employment_type: z.string().optional().nullable(),
    hire_date: z.string().optional().nullable(),
    confirmation_date: z.string().optional().nullable(),
    last_promotion_date: z.string().optional().nullable(),

    // Geographic Assignment
    work_location_type: z.string().optional().nullable(), // institution, municipality, district
    work_district_id: z.string().optional().nullable(),
    work_municipality_id: z.string().optional().nullable(),

    // Legal Position (Administrative Status)
    legal_position: z.string().optional().nullable(), // ACTIVE, SECONDMENT, AVAILABILITY, DETACHMENT, etc.
    legal_position_start: z.string().optional().nullable(),
    legal_position_destination: z.string().optional().nullable(),
    legal_position_notes: z.string().optional().nullable(),
    appointment_type: z.string().optional().nullable(), // APPOINTED, ASSIGNED
    
    // Secondary Position (Dual Position)
    secondary_position_id: z.union([z.string().uuid(), z.literal(""), z.null()]).optional(),
    secondary_appointment_type: z.union([z.enum(['APPOINTED', 'ASSIGNED']), z.literal(""), z.null()]).optional(),
    secondary_institution_id: z.union([z.string().uuid(), z.literal(""), z.null()]).optional(),
    secondary_district_id: z.union([z.string().uuid(), z.literal(""), z.null()]).optional(),
    secondary_municipality_id: z.union([z.string().uuid(), z.literal(""), z.null()]).optional(),
    secondary_department_id: z.string().optional().nullable(),
    secondary_office_id: z.string().optional().nullable(),

    // Contact Info - Optional with validation
    phone: z.string().optional().nullable().or(z.literal("")),
    mobile: z.string()
        .min(1, "رقم الهاتف النقال مطلوب")
        .regex(/^0[567]\d{8}$/, "رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 05 أو 06 أو 07"),
    email: z.string().min(1, "البريد الإلكتروني مطلوب").email("بريد إلكتروني غير صحيح"),
    address: z.string().optional().nullable(),
    wilaya_code: z.string().optional().nullable(),
    city: z.string().optional().nullable(),

    // Emergency Contact - Optional with validation
    emergency_contact_name: z.string().optional().nullable(),
    emergency_contact_phone: z.union([
        z.string().regex(/^0[567]\d{8}$/, "رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 05 أو 06 أو 07"),
        z.literal(""),
        z.null(),
    ]).optional(),
    emergency_contact_relationship: z.string().optional().nullable(),

    // Education Info
    hiring_education_level_id: z.string().optional().nullable(),
    certificates: z.preprocess(
        (val) => val ?? [],
        z.array(z.object({
            name: z.string(),
            institution: z.string(),
            year: z.string(),
            specialty: z.string().optional().nullable(),
        })).default([])
    ),
    experiences: z.preprocess(
        (val) => val ?? [],
        z.array(z.object({
            company: z.string(),
            position: z.string(),
            start_year: z.string(),
            end_year: z.string().optional().nullable(),
            description: z.string().optional().nullable(),
        })).default([])
    ),
    languages: z.preprocess(
        (val) => val ?? [],
        z.array(z.object({
            name: z.string(),
            level: z.string(),
        })).default([])
    ),

    // Bank Info - Optional with validation
    nif: z.string().optional().nullable(),
    bank_name: z.string().optional().nullable(),
    bank_account: z.union([
        z.string().regex(/^\d{20}$/, "رقم الحساب البنكي (RIP) يجب أن يتكون من 20 رقماً"),
        z.literal(""),
        z.null(),
    ]).optional(),
    social_security_number: z.union([
        z.string().regex(/^\d{12}$/, "رقم الضمان الاجتماعي يجب أن يتكون من 12 رقماً"),
        z.literal(""),
        z.null(),
    ]).optional(),

    // Wilaya Choice
    wilaya_choice: z.string().optional().nullable(),
    is_archived: z.boolean().optional(),
    
    // Account
    create_user_account: z.boolean().default(false),
    user_role_id: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
    // Cross-field validation: Dual Position Appointed Check
    const secType = data.secondary_appointment_type;
    const secPosId = data.secondary_position_id;
    const secInstId = data.secondary_institution_id;
    const secDistId = data.secondary_district_id;
    const secMunId = data.secondary_municipality_id;

    if (secPosId) {
        if (!secType) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "يرجى تحديد طبيعة التعيين للمنصب الثاني",
                path: ["secondary_appointment_type"]
            });
        }

        // Either institution, district, or municipality must be provided (depends on UI logic, but generally at least one)
        // If neither is provided and position is selected, it's partial data. We can enforce at the schema level if we want.
    }

    // Cross-field validation: Hire Date vs Birth Date
    if (data.birth_date && data.hire_date) {
        const birthDate = new Date(data.birth_date);
        const hireDate = new Date(data.hire_date);
        const today = new Date();

        // 1. Hire date cannot be in the future
        if (hireDate > today) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "تاريخ التوظيف لا يمكن أن يكون في المستقبل",
                path: ["hire_date"]
            });
        }

        // 2. Hire date must be at least 18 years after birth date
        const minHireDate = new Date(birthDate);
        minHireDate.setFullYear(minHireDate.getFullYear() + 18);

        if (hireDate < minHireDate) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "تاريخ التوظيف يجب أن يكون بعد 18 سنة من تاريخ الازدياد",
                path: ["hire_date"]
            });
        }
    }

    // National ID vs Birth Year & Gender Validation
    if (data.national_id && data.national_id.length === 18) {
        // 1. Validate Gender (2nd digit: index 1)
        // User observation: 0 = Female, 1 = Male
        if (data.gender) {
            const genderDigit = data.national_id.charAt(1);
            // We map our gender values to expected digits.
            // Updated User Observation: 0 = Male, 1 = Female
            if (data.gender === 'MALE' && genderDigit !== '0') {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "الجنس لا يطابق رقم التعريف الوطني (الخانة 2 يجب أن تكون 0 للذكر)",
                    path: ["gender"]
                });
            } else if (data.gender === 'FEMALE' && genderDigit !== '1') {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "الجنس لا يطابق رقم التعريف الوطني (الخانة 2 يجب أن تكون 1 للأنثى)",
                    path: ["gender"]
                });
            }
        }

        // 2. Validate Birth Year (3rd, 4th, 5th digits: indices 2,3,4)
        // User observation: 3rd digit is usually 9 for 19xx, 4th/5th are YY.
        // We compare the whole 3-digit block with the last 3 digits of the birth year.
        if (data.birth_date) {
            const ninYearSuffix = data.national_id.substring(2, 5); // Indices 2,3,4
            const birthYear = data.birth_date.split('-')[0]; // YYYY

            if (birthYear && birthYear.length === 4) {
                const birthYearSuffix = birthYear.substring(1); // Last 3 digits (e.g. 1981 -> 981)

                if (ninYearSuffix !== birthYearSuffix) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `سنة الميلاد (${birthYear}) لا تطابق رقم التعريف الوطني (الخانات 3-5: ${ninYearSuffix})`,
                        path: ["birth_date"]
                    });
                }
            }
        }
    }
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;
