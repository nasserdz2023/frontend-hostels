"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DynamicListInputProps {
    value?: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    addButtonLabel?: string;
}

export function DynamicListInput({
    value = [],
    onChange,
    placeholder = "أدخل قيمة...",
    addButtonLabel = "إضافة"
}: DynamicListInputProps) {
    const [inputValue, setInputValue] = useState("");

    const handleAdd = () => {
        if (inputValue.trim()) {
            onChange([...value, inputValue.trim()]);
            setInputValue("");
        }
    };

    const handleRemove = (index: number) => {
        const newValue = [...value];
        newValue.splice(index, 1);
        onChange(newValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAdd();
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="flex-1"
                />
                <Button type="button" onClick={handleAdd} variant="secondary">
                    <Plus className="w-4 h-4 ms-2" />
                    {addButtonLabel}
                </Button>
            </div>

            {value && value.length > 0 && (
                <ul className="space-y-2">
                    {value.map((item, index) => (
                        <li key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border text-sm">
                            <span className="flex-1">{item}</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemove(index)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
