import React from 'react';
import { HEBREW_DAYS } from '../../constants/calendar';

export default function DayHeader({ day, isToday }) {
  return (
    <div className="day-header">
      <span className={`day-label ${isToday ? 'is-today' : ''}`}>
        יום {HEBREW_DAYS[day]}
      </span>
    </div>
  );
}
