import { useEffect, useMemo, useRef, useState } from 'react';

const MONTH_NAMES = [
  'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
  'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول',
];
const WEEKDAY_NAMES = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

function getTodayParts() {
  const today = new Date();
  return { year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() };
}

function getValueParts(value, mode) {
  const match = mode === 'month'
    ? /^(\d{4})-(\d{2})$/.exec(value || '')
    : /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return getTodayParts();
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: mode === 'month' ? 1 : Number(match[3]),
  };
}

function formatValue(value, mode) {
  if (!value) return '';
  if (mode === 'month') {
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (!match) return '';
    return `${MONTH_NAMES[Number(match[2]) - 1]} ${new Intl.NumberFormat('ar-IQ').format(Number(match[1]))}`;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return '';
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Intl.DateTimeFormat('ar-IQ', {
    calendar: 'gregory',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function DatePicker({
  value = '',
  onChange,
  name,
  required = false,
  disabled = false,
  mode = 'date',
  style,
  className = '',
  ariaLabel,
}) {
  const rootRef = useRef(null);
  const initialParts = getValueParts(value, mode);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleYear, setVisibleYear] = useState(initialParts.year);
  const [visibleMonth, setVisibleMonth] = useState(initialParts.month);

  useEffect(() => {
    const parts = getValueParts(value, mode);
    setVisibleYear(parts.year);
    setVisibleMonth(parts.month);
  }, [value, mode]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const calendarDays = useMemo(() => {
    if (mode === 'month') return [];
    const firstWeekday = new Date(visibleYear, visibleMonth - 1, 1).getDay();
    const daysInMonth = new Date(visibleYear, visibleMonth, 0).getDate();
    return [
      ...Array(firstWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
  }, [mode, visibleMonth, visibleYear]);

  const selectedParts = getValueParts(value, mode);
  const moveMonth = (amount) => {
    const date = new Date(visibleYear, visibleMonth - 1 + amount, 1);
    setVisibleYear(date.getFullYear());
    setVisibleMonth(date.getMonth() + 1);
  };
  const moveYear = (amount) => setVisibleYear((year) => year + amount);

  const selectValue = (nextValue) => {
    onChange?.({ target: { name, value: nextValue } });
    setIsOpen(false);
  };

  const selectDay = (day) => {
    const nextValue = `${visibleYear}-${String(visibleMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    selectValue(nextValue);
  };

  const selectMonth = (month) => {
    selectValue(`${visibleYear}-${String(month).padStart(2, '0')}`);
  };

  return (
    <div className={`localized-date-picker ${className}`} ref={rootRef}>
      <div className="localized-date-control">
        <input
          type="text"
          value={formatValue(value, mode)}
          readOnly
          required={required}
          disabled={disabled}
          aria-label={ariaLabel || (mode === 'month' ? 'اختيار الشهر' : 'اختيار التاريخ')}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          placeholder={mode === 'month' ? 'اختر الشهر' : 'اختر التاريخ'}
          style={style}
        />
        <button
          type="button"
          className="localized-date-toggle"
          aria-label={mode === 'month' ? 'فتح قائمة الأشهر' : 'فتح التقويم'}
          aria-expanded={isOpen}
          disabled={disabled}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span aria-hidden="true">▦</span>
        </button>
      </div>
      {isOpen && (
        <div className="localized-date-popover" role="dialog" aria-label={mode === 'month' ? 'اختيار الشهر' : 'اختيار التاريخ'}>
          <div className="localized-date-header">
            <button
              type="button"
              aria-label={mode === 'month' ? 'السنة السابقة' : 'الشهر السابق'}
              onClick={() => (mode === 'month' ? moveYear(-1) : moveMonth(-1))}
            >
              ‹
            </button>
            <strong>
              {mode === 'month'
                ? new Intl.NumberFormat('ar-IQ').format(visibleYear)
                : `${MONTH_NAMES[visibleMonth - 1]} ${new Intl.NumberFormat('ar-IQ').format(visibleYear)}`}
            </strong>
            <button
              type="button"
              aria-label={mode === 'month' ? 'السنة التالية' : 'الشهر التالي'}
              onClick={() => (mode === 'month' ? moveYear(1) : moveMonth(1))}
            >
              ›
            </button>
          </div>
          {mode === 'month' ? (
            <div className="localized-month-grid">
              {MONTH_NAMES.map((monthName, index) => (
                <button
                  type="button"
                  key={monthName}
                  className={selectedParts.year === visibleYear && selectedParts.month === index + 1 ? 'selected' : ''}
                  onClick={() => selectMonth(index + 1)}
                >
                  {monthName}
                </button>
              ))}
            </div>
          ) : (
            <div className="localized-calendar-grid" role="grid">
              {WEEKDAY_NAMES.map((weekday) => (
                <span className="localized-calendar-weekday" key={weekday} role="columnheader">{weekday}</span>
              ))}
              {calendarDays.map((day, index) => (
                day ? (
                  <button
                    type="button"
                    role="gridcell"
                    key={`${visibleYear}-${visibleMonth}-${day}`}
                    className={
                      selectedParts.year === visibleYear
                      && selectedParts.month === visibleMonth
                      && selectedParts.day === day
                        ? 'selected'
                        : ''
                    }
                    onClick={() => selectDay(day)}
                  >
                    {new Intl.NumberFormat('ar-IQ').format(day)}
                  </button>
                ) : <span className="localized-calendar-empty" key={`empty-${index}`} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DatePicker;
