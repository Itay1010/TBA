import React from 'react';
import { Trash2 } from 'lucide-react';
import { DAYS_OF_WEEK, HEBREW_DAYS } from '../../constants/calendar';

export default function TimeSlotCard({
  slot,
  index,
  totalSlots,
  onToggleDay,
  onUpdateSlotTime,
  onRemoveSlot
}) {
  return (
    <div className="time-slot-card">
      <div className="days-row">
        {DAYS_OF_WEEK.map((d) => {
          const isSelected = slot.days.includes(d);
          return (
            <button
              key={d}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onToggleDay(index, d);
              }}
              className={`day-btn ${isSelected ? 'selected' : ''}`}
            >
              {HEBREW_DAYS[d]}
            </button>
          );
        })}
      </div>

      <div className="form-row" style={{ alignItems: 'flex-end', marginBottom: 0 }}>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label style={{ fontSize: '12px' }}>התחלה</label>
          <input
            type="time"
            className="form-input"
            value={slot.startTime}
            onChange={(e) => onUpdateSlotTime(index, 'startTime', e.target.value)}
          />
        </div>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label style={{ fontSize: '12px' }}>סיום</label>
          <input
            type="time"
            className="form-input"
            value={slot.endTime}
            onChange={(e) => onUpdateSlotTime(index, 'endTime', e.target.value)}
          />
        </div>
        {totalSlots > 1 && (
          <button
            type="button"
            className="btn-remove-slot"
            onClick={() => onRemoveSlot(index)}
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

