import React from 'react';
import { DAYS_OF_WEEK, HOURS } from '../../constants/calendar';
import DayHeader from './DayHeader';
import TimeAxis from './TimeAxis';
import DayColumn from './DayColumn';

export default function CalendarGrid({
  scrollRef,
  schedule,
  currentTimeMins,
  today,
  onGridClick,
  onBlockClick
}) {
  return (
    <div ref={scrollRef} className="grid-scroll-area">
      <div className="grid-wrapper">
        {/* Grid Header (Days) */}
        <div className="grid-header">
          <div className="corner-block" />
          {DAYS_OF_WEEK.map((day) => (
            <DayHeader key={day} day={day} isToday={day === today} />
          ))}
        </div>

        {/* Grid Body */}
        <div className="grid-body">
          {/* Y-Axis (Time Labels) */}
          <TimeAxis currentTimeMins={currentTimeMins} />

          {/* Main Grid Area */}
          <div className="grid-content">
            <div className="horizontal-lines">
              {HOURS.map((hour) => (
                <div key={hour} className="line" />
              ))}
            </div>

            <div className="current-time-line" style={{ top: `${currentTimeMins}px` }} />

            {/* Day Columns */}
            {DAYS_OF_WEEK.map((day) => (
              <DayColumn
                key={day}
                day={day}
                isToday={day === today}
                dayBlocks={schedule[day]}
                onGridClick={onGridClick}
                onBlockClick={onBlockClick}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
