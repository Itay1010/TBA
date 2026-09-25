import React from 'react';
import { CalendarDays, Plus, Save, LogIn } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';

export default function Header({ onAddBlock, onSaveSchedule, onOpenLogin }) {
  const { Notify } = useNotification()
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
      <div className="header-actions">
        <button className="btn-login" onClick={onOpenLogin}>
          <LogIn size={16} strokeWidth={2.5} /> <span>התחבר</span>
        </button>
        <button className="btn-add" onClick={onAddBlock}>
          <Plus size={16} strokeWidth={2.5} /> <span>הוסף בלוק</span>
        </button>
        <button className="btn-save" onClick={onSaveSchedule}>
          <Save size={16} strokeWidth={2.5} /> <span>שמור</span>
        </button>
      </div>
    </header>
  );
}
