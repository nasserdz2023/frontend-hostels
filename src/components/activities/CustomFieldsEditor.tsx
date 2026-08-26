import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2 } from 'lucide-react';

interface CustomField {
    name: string;
    type: string;
    required: boolean;
    options?: string;
}

interface Props {
    value?: Record<string, any>;
    onChange: (val: Record<string, any>) => void;
}

export function CustomFieldsEditor({ value = {}, onChange }: Props) {
    const [fields, setFields] = useState<CustomField[]>([]);
    
    // Only set initial value once
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        if (!initialized && value && Object.keys(value).length > 0) {
            const initialFields = Object.entries(value).map(([key, val]) => ({
                name: key,
                type: val?.type || 'string',
                required: val?.required || false,
                options: Array.isArray(val?.options) ? val.options.join(', ') : '',
            }));
            setFields(initialFields);
            setInitialized(true);
        }
    }, [value, initialized]);

    const handleChange = (newFields: CustomField[]) => {
        const result: Record<string, any> = {};
        newFields.forEach(f => {
            if (f.name.trim()) {
                const fieldConfig: any = { type: f.type, required: f.required };
                if (f.type === 'select' || f.type === 'multiselect') {
                    fieldConfig.options = f.options ? f.options.split(',').map(o => o.trim()).filter(Boolean) : [];
                }
                result[f.name.trim()] = fieldConfig;
            }
        });
        onChange(result);
    };

    const addField = () => {
        const newFields = [...fields, { name: '', type: 'string', required: false, options: '' }];
        setFields(newFields);
        handleChange(newFields);
    };

    const updateField = (index: number, key: keyof CustomField, val: any) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], [key]: val };
        setFields(newFields);
        handleChange(newFields);
    };

    const removeField = (index: number) => {
        const newFields = fields.filter((_, i) => i !== index);
        setFields(newFields);
        handleChange(newFields);
    };

    return (
        <div className="space-y-4">
            {fields.map((field, index) => (
            <React.Fragment key={index}>
                <div className={`flex items-center gap-3 p-3 border ${field.type === 'select' || field.type === 'multiselect' ? 'rounded-t-lg border-b-0' : 'rounded-lg'} bg-gray-50/50`}>
                    <div className="flex-1 space-y-2">
                        <Label>اسم الحقل (بالانجليزية - بدون مسافات)</Label>
                        <Input 
                            value={field.name} 
                            onChange={(e) => updateField(index, 'name', e.target.value)}
                            placeholder="مثال: birth_place"
                            dir="ltr"
                        />
                    </div>
                    <div className="flex-1 space-y-2">
                        <Label>نوع الحقل</Label>
                        <Select 
                            value={field.type} 
                            onValueChange={(v) => updateField(index, 'type', v)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="string">نص (String)</SelectItem>
                                <SelectItem value="number">رقم (Number)</SelectItem>
                                <SelectItem value="date">تاريخ (Date)</SelectItem>
                                <SelectItem value="boolean">نعم/لا (Boolean)</SelectItem>
                                <SelectItem value="select">اختيار وحيد (Select)</SelectItem>
                                <SelectItem value="multiselect">اختيار متعدد (Multi-select)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col items-center justify-center space-y-2 pt-6">
                        <Label>إلزامي؟</Label>
                        <Switch 
                            checked={field.required} 
                            onCheckedChange={(v) => updateField(index, 'required', v)}
                        />
                    </div>
                    <div className="pt-6">
                        <Button type="button" variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => removeField(index)}>
                            <Trash2 className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
                {(field.type === 'select' || field.type === 'multiselect') && (
                    <div className="flex items-center gap-3 p-3 pt-2 border border-t-0 rounded-b-lg bg-gray-50/50 -mt-1">
                        <div className="flex-1 space-y-2">
                            <Label>الخيارات المتاحة (افصل بينها بفاصلة ,)</Label>
                            <Input 
                                value={field.options || ''} 
                                onChange={(e) => updateField(index, 'options', e.target.value)}
                                placeholder="مثال: ذكر, أنثى"
                            />
                        </div>
                    </div>
                )}
            </React.Fragment>
            ))}
            
            <Button type="button" variant="outline" className="w-full" onClick={addField}>
                <PlusCircle className="w-4 h-4 me-2" />
                إضافة حقل جديد
            </Button>
        </div>
    );
}
