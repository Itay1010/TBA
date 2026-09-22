import React from 'react';
import { getUnallottedBlocks, timeToMinutes } from '../../utils/timeUtils';
import UnallottedBlock from './UnallottedBlock';
import TimeBlock from './TimeBlock';

export default function DayColumn({
  day,
  isToday,
  dayBlocks,
  onGridClick,
  onBlockClick
}) {
  const unallottedGaps = getUnallottedBlocks(dayBlocks);

  return (
    <div
      className={`day-column ${isToday ? 'is-today' : ''}`}
      onClick={(e) => onGridClick(day, e)}
    >
      {/* Unallotted Gaps */}
      {unallottedGaps.map((gap, i) => {
        const height = gap.end - gap.start;
        return (
          <UnallottedBlock key={`gap-${i}`} start={gap.start} height={height} />
        );
      })}

      {/* Time Blocks */}
      {(dayBlocks || []).map((block) => {
        const startMins = timeToMinutes(block.startTime);
        return (
          <TimeBlock
            key={block.id + startMins}
            block={block}
            onClick={onBlockClick}
          />
        );
      })}
    </div>
  );
}
