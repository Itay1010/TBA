import React from 'react';
import { HOURS } from '../../constants/calendar';

export default function TimeAxis({ currentTimeMins }) {
  return (
    <div className="time-axis">
      {HOURS.map(hour => (
        <div key={hour} className="time-label">
          <span>{hour.toString().padStart(2, '0')}:00</span>
        </div>
      ))}
      <div className="current-time-dot" style={{ top: `${currentTimeMins}px` }} />
    </div>
  );
}
