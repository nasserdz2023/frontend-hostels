"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Search, User } from "lucide-react";
import { employeesApi, Employee } from "@/lib/api/employees";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface EmployeeSelectorProps {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export function EmployeeSelector({ value, onChange, placeholder = "Select employee...", className }: EmployeeSelectorProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);

    // Derived state for the selected employee label (to show when closed)
    // Ideally we would fetch the specific selected employee if not in list,
    // but for simplicity we assume if it was selected it was in the list or we just show ID if missing.
    // Enhanced: We track the selected employee object even if the list changes.
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    // Initial fetch if value exists and we don't have the object
    useEffect(() => {
        if (value && !selectedEmployee) {
            employeesApi.getById(value).then(setSelectedEmployee).catch(() => { });
        }
    }, [value]);

    // Search logic
    useEffect(() => {
        if (!open) return;

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const response = await employeesApi.getAll({
                    search: search,
                    page: 1,
                    size: 20,
                    is_active: true
                });
                setEmployees(response.items);
            } catch (err) {
                console.error("Failed to search employees", err);
            } finally {
                setLoading(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [search, open]);

    const handleSelect = (employee: Employee) => {
        onChange(employee.id);
        setSelectedEmployee(employee);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between", className)}
                >
                    {selectedEmployee ? (
                        <span className="flex items-center gap-2 truncate">
                            <span className="font-semibold">{selectedEmployee.firstname_ar} {selectedEmployee.lastname_ar}</span>
                            {selectedEmployee.department && (
                                <Badge variant="secondary" className="text-xs h-5 px-1 font-normal text-muted-foreground me-1">
                                    {String(selectedEmployee.department)}
                                </Badge>
                            )}
                        </span>
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                    <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <div className="flex items-center border-b px-3">
                    <Search className="me-2 h-4 w-4 shrink-0 opacity-50" />
                    <Input
                        placeholder="Search by name, matricular..."
                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 px-0"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="max-h-[300px] overflow-y-auto p-1">
                    {loading ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">Loading...</div>
                    ) : employees.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">No employee found.</div>
                    ) : (
                        <div className="space-y-1">
                            {employees.map((employee) => (
                                <div
                                    key={employee.id}
                                    onClick={() => handleSelect(employee)}
                                    className={cn(
                                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                        value === employee.id ? "bg-accent/50" : ""
                                    )}
                                >
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 me-2">
                                        <User className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col flex-1 overflow-hidden">
                                        <div className="font-medium truncate">
                                            {employee.firstname_ar} {employee.lastname_ar}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate flex gap-2">
                                            <span>{employee.firstname_fr} {employee.lastname_fr}</span>
                                            {employee.employee_number && (
                                                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">#{employee.employee_number}</span>
                                            )}
                                        </div>
                                    </div>
                                    {value === employee.id && (
                                        <Check className="ms-auto h-4 w-4 opacity-100 text-primary" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
