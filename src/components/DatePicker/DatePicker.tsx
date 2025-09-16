'use client';

import React, { FC, useEffect, useRef, useState } from 'react';

import './DatePicker.css';
import { Calendar } from '@/components/Icons/Calendar';

interface IProps {
  value?: Date;
  onChange: (date: Date) => void;
  placeholder?: string;
}

const getDaysInMonth = (month: number, year: number): Date[] => {
  const date = new Date(year, month, 1);
  const days: Date[] = [];

  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }

  return days;
};

export const DatePicker: FC<IProps> = ({ value, onChange, placeholder }) => {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const days = getDaysInMonth(month, year);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setShow(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function formatDate(date?: Date) {
    if (!date) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${mm}-${dd}-${yyyy}`;
  }
  return (
    <div className="date-picker" ref={ref}>
      <div className="text-field cursor-pointer" onClick={() => setShow(true)}>
        <input
          readOnly
          type="text"
          value={value ? formatDate(value) : ''}
          placeholder={placeholder}
        />
        <Calendar className="w-5 h-5 text-gray-400 absolute right-3 pointer-events-none" />
      </div>

      {show && (
        <div className="absolute mt-2 w-64 bg-surface-raised shadow-lg rounded-md z-10">
          <div className="flex justify-between items-center p-2">
            <div
              onClick={() => {
                if (month === 0) {
                  setMonth(11);
                  setYear((y) => y - 1);
                } else {
                  setMonth((m) => m - 1);
                }
              }}
              className="px-2 cursor-pointer"
            >
              ‹
            </div>
            <div className="font-medium">
              {new Date(year, month).toLocaleString('default', {
                month: 'long',
                year: 'numeric',
              })}
            </div>
            <div
              onClick={() => {
                if (month === 11) {
                  setMonth(0);
                  setYear((y) => y + 1);
                } else {
                  setMonth((m) => m + 1);
                }
              }}
              className="px-2 cursor-pointer"
            >
              ›
            </div>
          </div>

          <div className="grid grid-cols-7 text-center text-sm text-gray-500 border-t pt-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <div key={day} className="font-semibold">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 text-center text-sm p-2">
            {Array(days[0].getDay())
              .fill(null)
              .map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
            {days.map((day) => {
              const isSelected =
                value &&
                value.getDate() === day.getDate() &&
                value.getMonth() === day.getMonth() &&
                value.getFullYear() === day.getFullYear();

              return (
                <div
                  key={day.toDateString()}
                  className={`p-2 rounded-full cursor-pointer hover:bg-red-900 ${
                    isSelected ? 'bg-red-900 text-white' : ''
                  }`}
                  onClick={() => {
                    onChange(day);
                    setShow(false);
                  }}
                >
                  {day.getDate()}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
