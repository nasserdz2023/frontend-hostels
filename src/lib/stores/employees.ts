import { create } from 'zustand';
import { Employee, EmployeeFilters, Grade, GradeGroup, Position, DepartmentType, OfficeType, employeesApi } from '@/lib/api/employees';

interface EmployeesState {
    employees: Employee[];
    grades: Grade[];
    positions: Position[];
    departments: DepartmentType[];
    gradeGroups: GradeGroup[];
    offices: OfficeType[];
    isLoading: boolean;
    error: string | null;
    total: number;
    filters: EmployeeFilters;

    // Actions
    setFilters: (filters: Partial<EmployeeFilters>) => void;
    clearFilters: () => void;
    fetchEmployees: (newFilters?: Partial<EmployeeFilters>) => Promise<void>;
    fetchReferences: () => Promise<void>;
    fetchOffices: (departmentId?: string) => Promise<void>;
    createEmployee: (data: any) => Promise<Employee>;
    updateEmployee: (id: string, data: any) => Promise<Employee>;
    deleteEmployee: (id: string, hard?: boolean) => Promise<void>;
    importEmployees: (file: File) => Promise<any>;
    fetchGradeGroups: () => Promise<void>;
}

const DEFAULT_FILTERS: EmployeeFilters = {
    page: 1,
    size: 20,
};

export const useEmployeesStore = create<EmployeesState>((set, get) => ({
    employees: [],
    grades: [],
    positions: [],
    departments: [],
    gradeGroups: [],
    offices: [],
    isLoading: false,
    error: null,
    total: 0,
    filters: DEFAULT_FILTERS,

    setFilters: (newFilters) => {
        set((state) => ({
            filters: { ...state.filters, ...newFilters },
        }));
        // Auto-fetch on filter change
        get().fetchEmployees();
    },

    clearFilters: () => {
        set({ filters: DEFAULT_FILTERS });
        get().fetchEmployees();
    },

    fetchEmployees: async (newFilters) => {
        set({ isLoading: true, error: null });
        const currentFilters = { ...get().filters, ...newFilters };

        // Update state with merged filters
        set({ filters: currentFilters });

        try {
            const data = await employeesApi.getAll(currentFilters);
            set({
                employees: data.items || [],
                total: data.total || 0,
                isLoading: false
            });
        } catch (error: any) {
            set({ error: error.message || 'Failed to fetch employees', isLoading: false });
        }
    },

    fetchReferences: async () => {
        // Can be optimized to not fetch if already loaded
        try {
            const [grades, positions, departments, gradeGroups] = await Promise.all([
                employeesApi.getGrades(),
                employeesApi.getPositions(),
                employeesApi.getDepartments(),
                employeesApi.getGradeGroups()
            ]);
            set({ grades, positions, departments, gradeGroups });
        } catch (error: any) {
            console.error("Failed to fetch references:", error);
            // Don't block UI but log error
        }
    },

    fetchGradeGroups: async () => {
        try {
            const gradeGroups = await employeesApi.getGradeGroups();
            set({ gradeGroups });
        } catch (error: any) {
            console.error("Failed to fetch grade groups:", error);
        }
    },

    fetchOffices: async (departmentId) => {
        try {
            const offices = await employeesApi.getOffices(departmentId);
            set({ offices });
        } catch (error: any) {
            console.error("Failed to fetch offices:", error);
        }
    },

    createEmployee: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const employee = await employeesApi.create(data);
            await get().fetchEmployees(); // Refresh list
            return employee;
        } catch (error: any) {
            set({ error: error.message || 'Failed to create employee', isLoading: false });
            throw error;
        }
    },

    updateEmployee: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
            const employee = await employeesApi.update(id, data);
            await get().fetchEmployees(); // Refresh list
            return employee;
        } catch (error: any) {
            set({ error: error.message || 'Failed to update employee', isLoading: false });
            throw error;
        }
    },

    deleteEmployee: async (id, hard = false) => {
        set({ isLoading: true, error: null });
        try {
            await employeesApi.delete(id, hard);
            await get().fetchEmployees(); // Refresh list
        } catch (error: any) {
            set({ error: error.message || 'Failed to delete employee', isLoading: false });
            throw error;
        }
    },

    importEmployees: async (file) => {
        set({ isLoading: true, error: null });
        try {
            // @ts-ignore - Assuming API has this method, or I need to add it involved
            // const result = await employeesApi.importEmployees(file);
            // await get().fetchEmployees(); // Refresh list
            // return result;
            throw new Error("Import not implemented yet");
        } catch (error: any) {
            set({ error: error.message || 'Failed to import employees', isLoading: false });
            throw error;
        }
    }
}));
