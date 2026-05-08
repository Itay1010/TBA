import React, { useState, useEffect, useRef, use } from 'react';
import { Plus, Trash2, X, CalendarDays, Save } from 'lucide-react';
import './App.scss'
import { fetchSchedule, saveScheduleToApi } from '../services/fetch';

// ==========================================
// Constants & Utilities
// ==========================================
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HEBREW_DAYS = {
  'Sunday': 'א׳',
  'Monday': 'ב׳',
  'Tuesday': 'ג׳',
  'Wednesday': 'ד׳',
  'Thursday': 'ה׳',
  'Friday': 'ו׳',
  'Saturday': 'שבת'
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const THEMES = ['blue', 'green', 'purple', 'orange', 'rose', 'gray'];

const LOCAL_STROAGE_KEY = 'calendarSchedule';

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h * 60) + (m || 0);
};

const minutesToTimeStr = (minutes) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

const formatTime12h = (time24) => {
  if (!time24) return '';
  const [hour, minute] = time24.split(':');
  const h = parseInt(hour, 10);
  return `${h.toString().padStart(2, '0')}:${minute}`;
};

const formatDurationHebrew = (totalMinutes) => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h > 0 && m > 0) return `${h} ש׳ ${m} דק׳`;
  if (h > 0) return `${h} ש׳`;
  return `${m} דק׳`;
};

const getUnallottedBlocks = (dayBlocks) => {
  if (!dayBlocks || dayBlocks.length === 0) return [];

  let merged = [];
  let sorted = [...dayBlocks].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  for (let b of sorted) {
    let start = timeToMinutes(b.startTime);
    let end = timeToMinutes(b.endTime);
    if (merged.length === 0) {
      merged.push({ start, end });
    } else {
      let last = merged[merged.length - 1];
      if (start <= last.end) {
        last.end = Math.max(last.end, end);
      } else {
        merged.push({ start, end });
      }
    }
  }

  let gaps = [];
  let current = 0;
  for (let m of merged) {
    if (m.start > current) {
      gaps.push({ start: current, end: m.start });
    }
    current = Math.max(current, m.end);
  }

  if (current < 1440) {
    gaps.push({ start: current, end: 1440 });
  }

  return gaps;
};

// ==========================================
// Main Application Component
// ==========================================
export default function App() {
  const scrollContainerRef = useRef(null);
  const [schedule, setSchedule] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STROAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day]: [] }), {});
  });
  const [currentTimeMins, setCurrentTimeMins] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  const [modalState, setModalState] = useState({
    isOpen: false,
    isEditing: false,
    originalDay: null,
    formData: {
      id: '',
      title: '',
      startTime: '09:00',
      endTime: '10:00',
      day: 'Sunday',
      color: 'blue'
    }
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_STROAGE_KEY, JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTimeMins(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {


    const handleKeyDown = (event) => {
      if (event instanceof KeyboardEvent) {
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
          event.preventDefault();
          saveScheduleToApi(schedule)
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup the listener when the component unmounts
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [])

  useEffect(() => {
    if (scrollContainerRef.current) {
      const targetScroll = Math.max(0, currentTimeMins - 120);
      scrollContainerRef.current.scrollTop = targetScroll;
    }
  }, [currentTimeMins]);
    
  const handleGridClick = (day, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;

    const hourClicked = Math.floor(y / 60);
    const startStr = minutesToTimeStr(hourClicked * 60);
    const endStr = minutesToTimeStr((hourClicked + 1) * 60);

    setModalState({
      isOpen: true,
      isEditing: false,
      originalDay: null,
      formData: {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        title: '',
        startTime: startStr,
        endTime: endStr,
        day: day,
        color: 'blue'
      }
    });
  };

  const openEditModal = (e, day, block) => {
    e.stopPropagation();
    setModalState({
      isOpen: true,
      isEditing: true,
      originalDay: day,
      formData: { ...block, day }
    });
  };

  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setModalState(prev => ({
      ...prev,
      formData: { ...prev.formData, [name]: value }
    }));
  };

  const saveBlock = () => {
    const { formData, isEditing, originalDay } = modalState;
    if (!formData.title.trim()) return;

    let finalStart = formData.startTime;
    let finalEnd = formData.endTime;
    if (timeToMinutes(finalEnd) <= timeToMinutes(finalStart)) {
      finalEnd = minutesToTimeStr(Math.min(timeToMinutes(finalStart) + 60, 1439));
    }

    const newBlock = { ...formData, startTime: finalStart, endTime: finalEnd };

    setSchedule(prev => {
      const newSchedule = { ...prev };
      if (isEditing) {
        newSchedule[originalDay] = newSchedule[originalDay].filter(b => b.id !== formData.id);
      }
      newSchedule[formData.day] = [...newSchedule[formData.day], newBlock];
      return newSchedule;
    });

    closeModal();
  };

  const deleteBlock = () => {
    const { formData, originalDay } = modalState;
    if (!originalDay) return;

    setSchedule(prev => {
      const newSchedule = { ...prev };
      newSchedule[originalDay] = newSchedule[originalDay].filter(b => b.id !== formData.id);
      return newSchedule;
    });

    closeModal();
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // if (!scheduleFromServer && !schedule)
  // return (
  // <div>Loading...</div>
  // )
  return (
    <>
      <div dir="rtl" className="app-container">

        {/* Header */}
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
          <button
            className="btn-add"
            onClick={() => setModalState(prev => ({
              ...prev,
              isOpen: true,
              isEditing: false,
              formData: { ...prev.formData, id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2), title: '', startTime: '09:00', endTime: '10:00', day: today }
            }))}
          >
            <Plus size={16} strokeWidth={2.5} /> <span>הוסף בלוק</span>
          </button>
          <button
            className='btn-save'
            onClick={ev => saveScheduleToApi(schedule)}
          >
            <Save size={16} strokeWidth={2.5} /> <span>שמור</span>
          </button>
        </header>

        {/* Calendar Grid Container */}
        <div ref={scrollContainerRef} className="grid-scroll-area">
          <div className="grid-wrapper">

            {/* Grid Header (Days) */}
            <div className="grid-header">
              <div className="corner-block" />
              {DAYS_OF_WEEK.map((day) => {
                const isToday = day === today;
                return (
                  <div key={day} className="day-header">
                    <span className={`day-label ${isToday ? 'is-today' : ''}`}>
                      יום {HEBREW_DAYS[day]}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Grid Body */}
            <div className="grid-body">

              {/* Y-Axis (Time Labels) */}
              <div className="time-axis">
                {HOURS.map(hour => (
                  <div key={hour} className="time-label">
                    <span>{hour.toString().padStart(2, '0')}:00</span>
                  </div>
                ))}
                <div
                  className="current-time-dot"
                  style={{ top: `${currentTimeMins}px` }}
                />
              </div>

              {/* Main Grid Area */}
              <div className="grid-content">
                <div className="horizontal-lines">
                  {HOURS.map(hour => <div key={hour} className="line" />)}
                </div>

                <div
                  className="current-time-line"
                  style={{ top: `${currentTimeMins}px` }}
                />

                {/* Day Columns */}
                {DAYS_OF_WEEK.map(day => (
                  <div
                    key={day}
                    className={`day-column ${day === today ? 'is-today' : ''}`}
                    onClick={(e) => handleGridClick(day, e)}
                  >
                    {/* Unallotted Gaps */}
                    {getUnallottedBlocks(schedule[day]).map((gap, i) => {
                      const height = gap.end - gap.start;
                      if (height <= 0) return null;
                      return (
                        <div
                          key={`gap-${i}`}
                          className="unallotted-block"
                          style={{ top: `${gap.start}px`, height: `${height}px` }}
                        >
                          {(
                            <span className="duration-badge" dir="rtl">
                              {formatDurationHebrew(height)}
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {/* Time Blocks */}
                    {schedule[day].map(block => {
                      const startMins = timeToMinutes(block.startTime);
                      const endMins = timeToMinutes(block.endTime);
                      const durationMins = endMins - startMins;

                      const height = Math.max(durationMins, 20);
                      const isSmallBlock = durationMins <= 30;

                      return (
                        <div
                          key={block.id}
                          onClick={(e) => openEditModal(e, day, block)}
                          className={`user-block theme-${block.color}`}
                          style={{ top: `${startMins}px`, height: `${height}px` }}
                        >
                          <span className="block-title">{block.title}</span>
                          {!isSmallBlock && (
                            <span className="block-time">
                              {formatTime12h(block.startTime)} - {formatTime12h(block.endTime)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>

        {/* Modal */}
        {modalState.isOpen && (
          <div className="modal-overlay">
            <div className="modal-content" dir="rtl">
              <div className="modal-header">
                <h3>{modalState.isEditing ? 'עריכת בלוק' : 'בלוק חדש'}</h3>
                <button onClick={closeModal} className="btn-close">
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              <div className="form-group">
                <label>שם האירוע</label>
                <input
                  autoFocus
                  type="text"
                  name="title"
                  placeholder="לדוגמה: עבודה, חדר כושר..."
                  className="form-input"
                  value={modalState.formData.title}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>התחלה</label>
                  <input
                    type="time"
                    name="startTime"
                    className="form-input"
                    value={modalState.formData.startTime}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="form-group">
                  <label>סיום</label>
                  <input
                    type="time"
                    name="endTime"
                    className="form-input"
                    value={modalState.formData.endTime}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>יום בשבוע</label>
                <select
                  name="day"
                  className="form-input"
                  value={modalState.formData.day}
                  onChange={handleFormChange}
                >
                  {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{HEBREW_DAYS[d]}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>צבע</label>
                <div className="color-picker">
                  {THEMES.map(theme => (
                    <button
                      key={theme}
                      onClick={() => setModalState(prev => ({ ...prev, formData: { ...prev.formData, color: theme } }))}
                      className={`color-btn theme-${theme} ${modalState.formData.color === theme ? 'active' : ''}`}
                    />
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                {modalState.isEditing ? (
                  <button onClick={deleteBlock} className="btn-delete">
                    <Trash2 size={16} /> מחק
                  </button>
                ) : <div />}
                <div className="action-group">
                  <button onClick={closeModal} className="btn-cancel">ביטול</button>
                  <button
                    onClick={saveBlock}
                    disabled={!modalState.formData.title.trim()}
                    className="btn-save"
                  >
                    שמור
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}