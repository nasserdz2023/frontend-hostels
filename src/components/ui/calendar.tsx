import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Check, ChevronUp, ChevronDown } from 'lucide-react';

// View modes for the calendar
type CalendarView = 'days' | 'months' | 'years';

// Props interface for the Calendar component used with DateTimePicker
interface CalendarProps {
    mode?: 'single' | 'multiple' | 'range';
    selected?: Date;
    onSelect?: (date: Date | undefined) => void;
    initialFocus?: boolean;
    disabled?: (date: Date) => boolean;
}

const Calendar = ({ mode = 'single', selected, onSelect, initialFocus, disabled }: CalendarProps) => {
    const [selectedDate, setSelectedDate] = useState<Date>(selected || new Date());
    const [currentMonth, setCurrentMonth] = useState<Date>(selected || new Date());
    const [tempSelectedDate, setTempSelectedDate] = useState<Date | undefined>(selected);
    // ... existing state ...

    // ... existing code ...

    // Render the days view
    const renderDaysView = () => (
        <>
            {/* أيام الأسبوع */}
            <div className="grid grid-cols-7 gap-1 mb-1">
                {arabicDays.map((day) => (
                    <div key={day} className="text-center font-bold text-xs text-muted-foreground py-1">
                        {day.substring(0, 2)}
                    </div>
                ))}
            </div>

            {/* أيام الشهر */}
            <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => {
                    const dayIsToday = isToday(day.date);
                    const dayIsSelected = isSelected(day.date);
                    const isDisabled = disabled ? disabled(day.date) : false;

                    return (
                        <button
                            key={index}
                            type="button"
                            onClick={() => !isDisabled && handleDateClick(day.date)}
                            disabled={isDisabled}
                            className={`
                                aspect-square p-1 rounded text-center transition-all text-sm font-medium
                                ${!day.isCurrentMonth ? 'text-muted-foreground/50 hover:bg-muted' : 'text-foreground'}
                                ${isDisabled ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : ''}
                                ${dayIsToday && !dayIsSelected && !isDisabled ? 'bg-blue-50 border border-blue-300 text-blue-600' : ''}
                                ${dayIsSelected ? 'bg-primary text-primary-foreground hover:bg-primary/90' : (!isDisabled ? 'hover:bg-muted' : '')}
                            `}
                        >
                            {day.date.getDate()}
                        </button>
                    );
                })}
            </div>
        </>
    );
    const [view, setView] = useState<CalendarView>('days');
    const [yearRangeStart, setYearRangeStart] = useState<number>(Math.floor((selected || new Date()).getFullYear() / 20) * 20);

    const yearsContainerRef = useRef<HTMLDivElement>(null);

    // أسماء الأشهر حسب التقويم المستخدم في الجزائر
    const arabicMonths = [
        'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
        'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    // أيام الأسبوع - تبدأ من السبت في الجزائر
    const arabicDays = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

    // تحديث التاريخ المختار عند تغيير selected من الخارج
    useEffect(() => {
        if (selected) {
            setSelectedDate(selected);
            setTempSelectedDate(selected);
            setCurrentMonth(selected);
            setYearRangeStart(Math.floor(selected.getFullYear() / 20) * 20);
        }
    }, [selected]);

    // الحصول على أيام الشهر (الأسبوع يبدأ من السبت في الجزائر)
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        let startingDayOfWeek = firstDay.getDay();
        startingDayOfWeek = (startingDayOfWeek + 1) % 7;

        const days: { date: Date; isCurrentMonth: boolean }[] = [];

        for (let i = 0; i < startingDayOfWeek; i++) {
            const prevMonthDay = new Date(year, month, -startingDayOfWeek + i + 1);
            days.push({ date: prevMonthDay, isCurrentMonth: false });
        }

        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ date: new Date(year, month, i), isCurrentMonth: true });
        }

        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
        }

        return days;
    };

    // Generate years for the year picker
    const getYearsInRange = () => {
        const years: number[] = [];
        for (let i = yearRangeStart; i < yearRangeStart + 20; i++) {
            years.push(i);
        }
        return years;
    };

    const handlePrevMonth = () => {
        if (view === 'years') {
            setYearRangeStart(yearRangeStart - 20);
        } else {
            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
        }
    };

    const handleNextMonth = () => {
        if (view === 'years') {
            setYearRangeStart(yearRangeStart + 20);
        } else {
            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
        }
    };

    const handleDateClick = (date: Date) => {
        setTempSelectedDate(date);
        setSelectedDate(date);
    };

    const handleMonthClick = (monthIndex: number) => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), monthIndex, 1));
        setView('days');
    };

    const handleYearClick = (year: number) => {
        setCurrentMonth(new Date(year, currentMonth.getMonth(), 1));
        setView('months');
    };

    const handleConfirm = () => {
        if (tempSelectedDate && onSelect) {
            onSelect(tempSelectedDate);
        }
    };

    const handleQuickSelect = (date: Date) => {
        setTempSelectedDate(date);
        setSelectedDate(date);
        setCurrentMonth(date);
    };

    const handleHeaderClick = () => {
        if (view === 'days') {
            setView('months');
        } else if (view === 'months') {
            setView('years');
        }
    };

    const days = getDaysInMonth(currentMonth);
    const years = getYearsInRange();
    const currentYear = new Date().getFullYear();

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const isSelected = (date: Date) => {
        return tempSelectedDate ? date.toDateString() === tempSelectedDate.toDateString() : false;
    };



    // Render the months view
    const renderMonthsView = () => (
        <div className="grid grid-cols-3 gap-2">
            {arabicMonths.map((month, index) => {
                const isCurrentMonth = currentMonth.getMonth() === index;
                const isThisMonth = new Date().getMonth() === index && currentMonth.getFullYear() === currentYear;

                return (
                    <button
                        key={month}
                        type="button"
                        onClick={() => handleMonthClick(index)}
                        className={`
                            py-3 px-2 rounded-lg text-sm font-medium transition-all
                            ${isCurrentMonth ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-muted text-foreground'}
                            ${isThisMonth && !isCurrentMonth ? 'bg-blue-50 border border-blue-300 text-blue-600' : ''}
                        `}
                    >
                        {month}
                    </button>
                );
            })}
        </div>
    );

    // Render the years view
    const renderYearsView = () => (
        <div ref={yearsContainerRef}>
            <div className="grid grid-cols-4 gap-2">
                {years.map((year) => {
                    const isCurrentYear = currentMonth.getFullYear() === year;
                    const isThisYear = currentYear === year;

                    return (
                        <button
                            key={year}
                            type="button"
                            onClick={() => handleYearClick(year)}
                            className={`
                                py-2.5 px-1 rounded-lg text-sm font-medium transition-all
                                ${isCurrentYear ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-muted text-foreground'}
                                ${isThisYear && !isCurrentYear ? 'bg-blue-50 border border-blue-300 text-blue-600' : ''}
                            `}
                        >
                            {year}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    // Get header title based on current view
    const getHeaderTitle = () => {
        if (view === 'years') {
            return `${yearRangeStart} - ${yearRangeStart + 19}`;
        } else if (view === 'months') {
            return currentMonth.getFullYear().toString();
        }
        return `${arabicMonths[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
    };

    return (
        <div className="bg-card rounded-lg p-3 w-72 border border-border" dir="rtl">
            {/* رأس التقويم */}
            <div className="flex items-center justify-between mb-3">
                <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 hover:bg-muted rounded transition-colors"
                    aria-label={view === 'years' ? 'السنوات التالية' : 'الشهر التالي'}
                >
                    <ChevronLeft className="w-5 h-5 text-foreground" />
                </button>

                <button
                    type="button"
                    onClick={handleHeaderClick}
                    className="text-sm font-bold text-foreground hover:bg-muted px-3 py-1 rounded-md transition-colors flex items-center gap-1"
                >
                    {getHeaderTitle()}
                    {view !== 'years' && <ChevronUp className="w-3 h-3 text-muted-foreground" />}
                </button>

                <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 hover:bg-muted rounded transition-colors"
                    aria-label={view === 'years' ? 'السنوات السابقة' : 'الشهر السابق'}
                >
                    <ChevronRight className="w-5 h-5 text-foreground" />
                </button>
            </div>

            {/* عرض المحتوى حسب الوضع */}
            {view === 'days' && renderDaysView()}
            {view === 'months' && renderMonthsView()}
            {view === 'years' && renderYearsView()}

            {/* أزرار سريعة - تظهر فقط في وضع الأيام */}
            {view === 'days' && (
                <div className="flex gap-2 mt-3">
                    <button
                        type="button"
                        onClick={() => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            handleQuickSelect(today);
                        }}
                        className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-semibold transition-colors"
                    >
                        اليوم
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            tomorrow.setHours(0, 0, 0, 0);
                            handleQuickSelect(tomorrow);
                        }}
                        className="flex-1 py-1.5 px-2 bg-green-50 hover:bg-green-100 text-green-700 rounded text-xs font-semibold transition-colors"
                    >
                        غداً
                    </button>
                </div>
            )}

            {/* زر الرجوع - يظهر في وضع الشهور والسنوات */}
            {view !== 'days' && (
                <button
                    type="button"
                    onClick={() => setView(view === 'years' ? 'months' : 'days')}
                    className="w-full mt-3 py-1.5 px-2 bg-muted hover:bg-muted/80 text-foreground rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                >
                    <ChevronDown className="w-3 h-3" />
                    رجوع
                </button>
            )}

            {/* زر التأكيد */}
            <button
                type="button"
                onClick={handleConfirm}
                disabled={!tempSelectedDate}
                className={`
                    w-full mt-3 py-2 px-4 rounded-md text-sm font-semibold transition-all flex items-center justify-center gap-2
                    ${tempSelectedDate
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800'
                        : 'bg-muted text-muted-foreground cursor-not-allowed'}
                `}
            >
                <Check className="w-4 h-4" />
                تأكيد التاريخ
            </button>

            {/* عرض التاريخ المختار */}
            {tempSelectedDate && (
                <div className="mt-2 text-center text-xs text-muted-foreground">
                    {arabicDays[(tempSelectedDate.getDay() + 1) % 7]}، {tempSelectedDate.getDate()} {arabicMonths[tempSelectedDate.getMonth()]} {tempSelectedDate.getFullYear()}
                </div>
            )}
        </div>
    );
};

export default Calendar;
