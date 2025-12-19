import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import clsx from 'clsx';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const isValidDateString = (value: string) => {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = dayjs(value);
  return parsed.isValid() && parsed.format('YYYY-MM-DD') === value;
};

const buildCalendarDays = (month: dayjs.Dayjs) => {
  const start = month.startOf('month');
  const startOffset = start.day();
  const days = [];
  for (let i = 0; i < 42; i += 1) {
    days.push(start.add(i - startOffset, 'day'));
  }
  return days;
};

type DatePickerProps = {
  id: string;
  value: string;
  onChange: (next: string) => void;
  className?: string;
  ariaLabel?: string;
};

export function DatePicker({ id, value, onChange, className, ariaLabel }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [viewMonth, setViewMonth] = useState(() => {
    const initial = isValidDateString(value) ? dayjs(value) : dayjs();
    return initial.startOf('month');
  });
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
    if (isValidDateString(value)) {
      setViewMonth(dayjs(value).startOf('month'));
    }
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selected = isValidDateString(value) ? dayjs(value) : null;
  const calendarDays = useMemo(() => buildCalendarDays(viewMonth), [viewMonth]);
  const monthLabel = `${MONTHS[viewMonth.month()]} ${viewMonth.year()}`;

  const handleInputChange = (next: string) => {
    setInputValue(next);
    if (isValidDateString(next)) {
      onChange(next);
    }
  };

  const handleInputBlur = () => {
    if (!isValidDateString(inputValue)) {
      setInputValue(value);
    }
  };

  const handleSelectDay = (day: dayjs.Dayjs) => {
    const next = day.format('YYYY-MM-DD');
    setInputValue(next);
    onChange(next);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        id={id}
        type="text"
        placeholder="YYYY-MM-DD"
        aria-label={ariaLabel}
        value={inputValue}
        onChange={(event) => handleInputChange(event.target.value)}
        onFocus={() => setIsOpen(true)}
        onBlur={handleInputBlur}
        className={clsx(
          'border-slate-200 border p-2 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white/90 text-slate-700',
          className
        )}
      />
      {isOpen && (
        <div
          role="dialog"
          aria-label="Choose date"
          className="absolute z-50 mt-2 w-72 rounded-xl border border-white/60 bg-white shadow-lg p-4"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="p-2 text-sm font-semibold text-slate-600 hover:text-slate-900 focus-ring"
              onClick={() => setViewMonth((current) => current.subtract(1, 'month'))}
              aria-label="Previous month"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <div className="text-sm font-semibold text-slate-800">{monthLabel}</div>
            <button
              type="button"
              className="p-2 text-sm font-semibold text-slate-600 hover:text-slate-900 focus-ring"
              onClick={() => setViewMonth((current) => current.add(1, 'month'))}
              aria-label="Next month"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-xs text-slate-500 mt-3">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 mt-2">
            {calendarDays.map((day) => {
              const isCurrentMonth = day.month() === viewMonth.month();
              const isSelected = selected ? day.isSame(selected, 'day') : false;
              return (
                <button
                  key={day.format('YYYY-MM-DD')}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={clsx(
                    'h-8 w-8 rounded-lg text-xs font-medium focus-ring',
                    isCurrentMonth ? 'text-slate-800' : 'text-slate-400',
                    isSelected ? 'bg-emerald-600 text-white' : 'hover:bg-emerald-50'
                  )}
                >
                  {day.date()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
