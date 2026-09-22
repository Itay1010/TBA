import React from 'react';
import { CalendarDays, Plus, Save } from 'lucide-react';

export default function Header({ onAddBlock, onSaveSchedule }) {
  return (
    <header className="app-header">
      <div className="header-title-group">
        <div className="icon-box">
          <CalendarDays size={20} strokeWidth={2.5} />
        </div>
        <div>
          <h1>לוח שבועי</h1>
          <p>ניהול זמנים</p>
        </div>
      </div>
      <button className="btn-add" onClick={onAddBlock}>
        <Plus size={16} strokeWidth={2.5} /> <span>הוסף בלוק</span>
      </button>
      <button className="btn-save" onClick={onSaveSchedule}>
        <Save size={16} strokeWidth={2.5} /> <span>שמור</span>
      </button>
    </header>
  );
}
