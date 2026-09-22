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
      <div
        className="days-row"
        style={{ display: 'flex', gap: '4px', marginBottom: '10px', direction: 'rtl' }}
      >
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
              style={{
                flex: 1,
                padding: '6px 2px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'all 0.2s',
                border: `1px solid ${isSelected ? '#3b82f6' : '#d1d5db'}`,
                backgroundColor: isSelected ? '#3b82f6' : 'transparent',
                color: isSelected ? '#fff' : 'inherit'
              }}
            >
              {HEBREW_DAYS[d]}
            </button>
          );
        })}
      </div>

      <div
        className="form-row"
        style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: 0 }}
      >
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
            onClick={() => onRemoveSlot(index)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              padding: '10px'
            }}
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
