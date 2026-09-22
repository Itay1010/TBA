import React from 'react';
import { formatDurationHebrew } from '../../utils/timeUtils';

export default function UnallottedBlock({ start, height }) {
  if (height <= 0) return null;

  return (
    <div
      className="unallotted-block"
      style={{ top: `${start}px`, height: `${height}px` }}
    >
      <span className="duration-badge" dir="rtl">
        {formatDurationHebrew(height)}
      </span>
    </div>
  );
}
