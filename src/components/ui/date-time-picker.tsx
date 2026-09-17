"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import Calendar from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DateTimePickerProps {
    value?: string;
    onChange: (value: string) => void;
    placeHolder?: string;
    disabled?: boolean;
    showTime?: boolean; // إظهار الوقت أو لا
}

/** تحويل آمن لتاريخ - يعيد undefined إذا كان المدخل غير صالح */
function tryParseDate(v: string | undefined): Date | undefined {
    if (!v) return undefined;
    try {
        const d = new Date(v);
        return isNaN(d.getTime()) ? undefined : d;
    } catch { return undefined; }
}

export function DateTimePicker({
    value,
    onChange,
    placeHolder = "اختر التاريخ",
    disabled = false,
    showTime = false // افتراضياً تاريخ فقط
}: DateTimePickerProps) {
    const initialDate = tryParseDate(value);
    const [date, setDate] = React.useState<Date | undefined>(initialDate);
    const [inputDay, setInputDay] = React.useState<string>(
        initialDate ? format(initialDate, "dd") : ""
    );
    const [inputMonth, setInputMonth] = React.useState<string>(
        initialDate ? format(initialDate, "MM") : ""
    );
    const [inputYear, setInputYear] = React.useState<string>(
        initialDate ? format(initialDate, "yyyy") : ""
    );
    const [inputMinutes, setInputMinutes] = React.useState<string>(
        initialDate && showTime ? format(initialDate, "mm") : ""
    );
    const [inputHours, setInputHours] = React.useState<string>(
        initialDate && showTime ? format(initialDate, "HH") : ""
    );
    const [isOpen, setIsOpen] = React.useState(false);

    const dayInputRef = React.useRef<HTMLInputElement>(null);
    const monthInputRef = React.useRef<HTMLInputElement>(null);
    const yearInputRef = React.useRef<HTMLInputElement>(null);
    const minutesInputRef = React.useRef<HTMLInputElement>(null);
    const hoursInputRef = React.useRef<HTMLInputElement>(null);

    // Sync internal state if external value changes
    React.useEffect(() => {
        if (value) {
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
                setDate(d);
                setInputDay(format(d, "dd"));
                setInputMonth(format(d, "MM"));
                setInputYear(format(d, "yyyy"));
                if (showTime) {
                    setInputMinutes(format(d, "mm"));
                    setInputHours(format(d, "HH"));
                }
            }
        } else {
            setDate(undefined);
            setInputDay("");
            setInputMonth("");
            setInputYear("");
            setInputMinutes("");
            setInputHours("");
        }
    }, [value, showTime]);

    const formatOutput = (d: Date): string => {
        if (showTime) {
            return format(d, "yyyy-MM-dd'T'HH:mm:ss");
        }
        return format(d, "yyyy-MM-dd");
    };

    const updateDateTime = (day: string, month: string, year: string, minutes: string, hours: string) => {
        if (day && month && year) {
            const dayNum = parseInt(day);
            const monthNum = parseInt(month) - 1;
            const yearNum = parseInt(year);
            const minutesNum = showTime ? (parseInt(minutes) || 0) : 0;
            const hoursNum = showTime ? (parseInt(hours) || 0) : 0;

            if (dayNum >= 1 && dayNum <= 31 && monthNum >= 0 && monthNum <= 11 && yearNum >= 1900 && yearNum <= 2100) {
                const newDateTime = new Date(yearNum, monthNum, dayNum, hoursNum, minutesNum, 0);
                if (newDateTime.getMonth() === monthNum && newDateTime.getDate() === dayNum) {
                    setDate(newDateTime);
                    onChange(formatOutput(newDateTime));
                }
            }
        }
    };

    const handleDateSelect = (selectedDate: Date | undefined) => {
        if (!selectedDate) {
            setDate(undefined);
            setInputDay("");
            setInputMonth("");
            setInputYear("");
            onChange("");
            return;
        }

        setDate(selectedDate);
        setInputDay(format(selectedDate, "dd"));
        setInputMonth(format(selectedDate, "MM"));
        setInputYear(format(selectedDate, "yyyy"));

        const minutesNum = showTime ? (parseInt(inputMinutes) || 0) : 0;
        const hoursNum = showTime ? (parseInt(inputHours) || 0) : 0;
        const newDateTime = new Date(selectedDate);
        newDateTime.setHours(hoursNum);
        newDateTime.setMinutes(minutesNum);

        onChange(formatOutput(newDateTime));
        if (!showTime) {
            setIsOpen(false);
        }
    };

    const handleInputChange = (value: string, type: string) => {
        if (type === 'day') {
            if (value === '' || (/^\d{0,2}$/.test(value) && (value === '' || Number(value) <= 31))) {
                setInputDay(value);
                if (value.length === 2 && value !== '00') {
                    monthInputRef.current?.focus();
                    updateDateTime(value, inputMonth, inputYear, inputMinutes, inputHours);
                }
            }
        } else if (type === 'month') {
            if (value === '' || (/^\d{0,2}$/.test(value) && (value === '' || Number(value) <= 12))) {
                setInputMonth(value);
                if (value.length === 2 && value !== '00') {
                    yearInputRef.current?.focus();
                    updateDateTime(inputDay, value, inputYear, inputMinutes, inputHours);
                }
            }
        } else if (type === 'year') {
            if (value === '' || (/^\d{0,4}$/.test(value))) {
                setInputYear(value);
                if (value.length === 4) {
                    if (showTime) {
                        minutesInputRef.current?.focus();
                    }
                    updateDateTime(inputDay, inputMonth, value, inputMinutes, inputHours);
                }
            }
        } else if (type === 'minutes') {
            if (value === '' || (/^\d{0,2}$/.test(value) && (value === '' || Number(value) <= 59))) {
                setInputMinutes(value);
                if (value.length === 2) {
                    hoursInputRef.current?.focus();
                    updateDateTime(inputDay, inputMonth, inputYear, value, inputHours);
                }
            }
        } else if (type === 'hours') {
            if (value === '' || (/^\d{0,2}$/.test(value) && (value === '' || Number(value) <= 23))) {
                setInputHours(value);
                if (value.length === 2) {
                    updateDateTime(inputDay, inputMonth, inputYear, inputMinutes, value);
                }
            }
        }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.select();
    };

    const handleKeyDown = (e: React.KeyboardEvent, type: string) => {
        if (e.key === 'Enter' || e.key === '/' || e.key === ':') {
            e.preventDefault();
            if (type === 'day' && inputDay) {
                monthInputRef.current?.focus();
            } else if (type === 'month' && inputMonth) {
                yearInputRef.current?.focus();
            } else if (type === 'year' && inputYear && showTime) {
                minutesInputRef.current?.focus();
            } else if (type === 'minutes' && inputMinutes) {
                hoursInputRef.current?.focus();
            }
        } else if (e.key === 'Backspace' && (e.target as HTMLInputElement).value === '') {
            if (type === 'month') {
                dayInputRef.current?.focus();
            } else if (type === 'year') {
                monthInputRef.current?.focus();
            } else if (type === 'minutes') {
                yearInputRef.current?.focus();
            } else if (type === 'hours') {
                minutesInputRef.current?.focus();
            }
        }
    };

    return (
        <div className="w-full" dir="rtl">
            <div className="flex items-center gap-2 border border-border rounded-md px-3 py-2 bg-card hover:border-primary/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                {/* حقول الإدخال اليدوي */}
                <div className="flex-1 flex items-center gap-1">
                    <input
                        ref={dayInputRef}
                        type="text"
                        inputMode="numeric"
                        value={inputDay}
                        onChange={(e) => handleInputChange(e.target.value, 'day')}
                        onKeyDown={(e) => handleKeyDown(e, 'day')}
                        onFocus={handleFocus}
                        placeholder="DD"
                        disabled={disabled}
                        className="w-8 text-center text-sm outline-none bg-transparent disabled:opacity-50"
                        maxLength={2}
                    />
                    <span className="text-sm text-muted-foreground">/</span>
                    <input
                        ref={monthInputRef}
                        type="text"
                        inputMode="numeric"
                        value={inputMonth}
                        onChange={(e) => handleInputChange(e.target.value, 'month')}
                        onKeyDown={(e) => handleKeyDown(e, 'month')}
                        onFocus={handleFocus}
                        placeholder="MM"
                        disabled={disabled}
                        className="w-8 text-center text-sm outline-none bg-transparent disabled:opacity-50"
                        maxLength={2}
                    />
                    <span className="text-sm text-muted-foreground">/</span>
                    <input
                        ref={yearInputRef}
                        type="text"
                        inputMode="numeric"
                        value={inputYear}
                        onChange={(e) => handleInputChange(e.target.value, 'year')}
                        onKeyDown={(e) => handleKeyDown(e, 'year')}
                        onFocus={handleFocus}
                        placeholder="YYYY"
                        disabled={disabled}
                        className="w-14 text-center text-sm outline-none bg-transparent disabled:opacity-50"
                        maxLength={4}
                    />

                    {/* حقول الوقت - تظهر فقط عند showTime */}
                    {showTime && (
                        <>
                            <span className="text-sm text-muted-foreground/50 mx-1">•</span>
                            <input
                                ref={minutesInputRef}
                                type="text"
                                inputMode="numeric"
                                value={inputMinutes}
                                onChange={(e) => handleInputChange(e.target.value, 'minutes')}
                                onKeyDown={(e) => handleKeyDown(e, 'minutes')}
                                onFocus={handleFocus}
                                placeholder="MM"
                                disabled={disabled}
                                className="w-8 text-center text-sm outline-none bg-transparent disabled:opacity-50"
                                maxLength={2}
                            />
                            <span className="text-sm text-muted-foreground">:</span>
                            <input
                                ref={hoursInputRef}
                                type="text"
                                inputMode="numeric"
                                value={inputHours}
                                onChange={(e) => handleInputChange(e.target.value, 'hours')}
                                onKeyDown={(e) => handleKeyDown(e, 'hours')}
                                onFocus={handleFocus}
                                placeholder="HH"
                                disabled={disabled}
                                className="w-8 text-center text-sm outline-none bg-transparent disabled:opacity-50"
                                maxLength={2}
                            />
                        </>
                    )}
                </div>

                {/* زر فتح التقويم */}
                <Popover open={isOpen} onOpenChange={setIsOpen}>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            disabled={disabled}
                            className={cn(
                                "p-1 hover:bg-muted rounded transition-colors",
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start" dir="rtl">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={handleDateSelect}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    )
}
