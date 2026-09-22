import React from 'react';
import { timeToMinutes, formatTime12h } from '../../utils/timeUtils';

export default function TimeBlock({ block, onClick }) {
  const startMins = timeToMinutes(block.startTime);
  const durationMins = timeToMinutes(block.endTime) - startMins;
  const height = Math.max(durationMins, 20);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick(block);
      }}
      className={`user-block theme-${block.color}`}
      style={{ top: `${startMins}px`, height: `${height}px` }}
    >
      <span className="block-title">{block.title}</span>
      {durationMins > 30 && (
        <span className="block-time">
          {formatTime12h(block.startTime)} - {formatTime12h(block.endTime)}
        </span>
      )}
    </div>
  );
}
