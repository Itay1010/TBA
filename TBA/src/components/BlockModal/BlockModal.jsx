import React from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { THEMES } from '../../constants/calendar';
import TimeSlotCard from './TimeSlotCard';

export default function BlockModal({
  isOpen,
  isEditing,
  formData,
  onClose,
  onSave,
  onDelete,
  onTitleChange,
  onColorChange,
  onToggleDay,
  onUpdateSlotTime,
  onAddSlot,
  onRemoveSlot
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" dir="rtl" onClick={ev => ev.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? 'עריכת בלוק' : 'בלוק חדש'}</h3>
          <button onClick={onClose} className="btn-close">
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="form-group">
          <label>שם האירוע</label>
          <input
            autoFocus
            type="text"
            placeholder="לדוגמה: עבודה, חדר כושר..."
            className="form-input"
            value={formData.title}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </div>

        <div className="form-group">
          <span>זמנים וימים</span>
          <div className="time-slots-container">
            {formData.timeSlots.map((slot, index) => (
              <TimeSlotCard
                key={slot.id}
                slot={slot}
                index={index}
                totalSlots={formData.timeSlots.length}
                onToggleDay={onToggleDay}
                onUpdateSlotTime={onUpdateSlotTime}
                onRemoveSlot={onRemoveSlot}
              />
            ))}
            <button
              type="button"
              className="btn-add-slot"
              onClick={onAddSlot}
            >
              <Plus size={16} /> הוסף זמנים נוספים
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>צבע</label>
          <div className="color-picker">
            {THEMES.map((theme) => (
              <button
                key={theme}
                onClick={() => onColorChange(theme)}
                className={`color-btn theme-${theme} ${formData.color === theme ? 'active' : ''}`}
              />
            ))}
          </div>
        </div>

        <div className="modal-actions">
          {isEditing ? (
            <button onClick={onDelete} className="btn-delete">
              <Trash2 size={16} /> מחק
            </button>
          ) : (
            <div />
          )}
          <div className="action-group">
            <button onClick={onClose} className="btn-cancel">
              ביטול
            </button>
            <button
              onClick={onSave}
              disabled={!formData.title.trim()}
              className="btn-save"
            >
              שמור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
