import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, X, CalendarDays, Save } from 'lucide-react';
import './App.scss'
import { fetchSchedule, saveScheduleToApi } from '../services/fetch';
import { IDBGetSchedule, IDBSetSchedule } from '../services/indexedDb';

// ==========================================
// Constants & Utilities
// ============================================
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

const generateId = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);

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
// ==============================================
export default function App() {
  const scrollContainerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STROAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
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
    originalBlockId: null,
    formData: {
      title: '',
      color: 'blue',
      timeSlots: []
    }
  });

  // Effect to save to local storage whenever schedule changes (for immediate UI feedback)
  useEffect(() => {
    localStorage.setItem(LOCAL_STROAGE_KEY, JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    const getState = async () => {
      try {
        // FIX: Directly fetch from API to bypass the Service Worker race condition
        // If the SW hasn't finished dumping to IDB, this ensures we get the freshest state on load.
        const freshScheduleRes = await fetchSchedule();
        let freshSchedule;
        if(freshScheduleRes && typeof(freshScheduleRes) === 'string')
          freshSchedule = JSON.parse(freshScheduleRes);
        else
          freshSchedule = freshScheduleRes;
        if (freshSchedule && Object.keys(freshSchedule).length !== 0) {
          await IDBSetSchedule(freshSchedule); // Sync DB so SW stays happy
          setSchedule(() => ({ ...freshSchedule }));
          return;
        }
      } catch (apiError) {
        console.warn("API fetch failed, falling back to local persistence layers.", apiError);
      }

      // Fallback: Read from IndexedDB / LocalStorage if offline or direct fetch failed
      try {
        const dbSchedule = await IDBGetSchedule();

        if (dbSchedule && Object.keys(dbSchedule).length !== 0) {
          return setSchedule(() => ({ ...dbSchedule }));
        }

        console.log("IndexedDB empty, attempting localStorage fallback.");
        const localSchedule = localStorage.getItem(LOCAL_STROAGE_KEY);
        if (localSchedule) {
          const parsedSched = JSON.parse(localSchedule);
          return setSchedule(() => ({ ...parsedSched }));
        }
      } catch (e) {
        console.error("Error reading schedule from local persistence layers.", e);
      }
    }
        
    getState().finally(() => setLoading(false))
  }, []);

  // Effect to handle time ticking
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTimeMins(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Effect to handle Ctrl+S shortcut
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event instanceof KeyboardEvent) {
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
          event.preventDefault();
          handleSaveSchedule()
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [schedule]);

  // Effect for scrolling to current time
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
      originalBlockId: null,
      formData: {
        title: '',
        color: 'blue',
        timeSlots: [{
          id: generateId(),
          days: [day],
          startTime: startStr,
          endTime: endStr
        }]
      }
    });
  };

  const openEdit = (data) => {
    // Collect all blocks that share this event's ID to populate time slots accurately
    const allOccurrences = [];
    for (const d of DAYS_OF_WEEK) {
      schedule[d].forEach(b => {
        if (b.id === data.id) {
          allOccurrences.push({ ...b, day: d });
        }
      });
    }

    // Re-group occurrences into timeSlots based on matching time bounds
    const slotsMap = {};
    allOccurrences.forEach(occ => {
      const key = `${occ.startTime}-${occ.endTime}`;
      if (!slotsMap[key]) {
        slotsMap[key] = {
          id: generateId(),
          startTime: occ.startTime,
          endTime: occ.endTime,
          days: []
        };
      }
      if (!slotsMap[key].days.includes(occ.day)) {
        slotsMap[key].days.push(occ.day);
      }
    });

    setModalState({
      isOpen: true,
      isEditing: true,
      originalBlockId: data.id,
      formData: {
        title: data.title,
        color: data.color,
        timeSlots: Object.values(slotsMap)
      }
    });
  };

  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  // Time Slot Modifiers
  const toggleDay = (slotIndex, day) => {
    setModalState(prev => {
      const newSlots = prev.formData.timeSlots.map((slot, index) => {
        // Only modify the target slot
        if (index === slotIndex) {
          return {
            ...slot,
            // Create a new array reference for 'days'
            days: slot.days.includes(day)
              ? slot.days.filter(d => d !== day)
              : [...slot.days, day]
          };
        }
        // Return unchanged slots as-is
        return slot;
      });

      return {
        ...prev,
        formData: { ...prev.formData, timeSlots: newSlots }
      };
    });
  };

  const updateSlotTime = (slotIndex, field, value) => {
    setModalState(prev => {
      const newSlots = prev.formData.timeSlots.map((slot, index) => {
        if (index === slotIndex) {
          return { ...slot, [field]: value }; // Return new object reference
        }
        return slot;
      });

      return {
        ...prev,
        formData: { ...prev.formData, timeSlots: newSlots }
      };
    });
  };

  const addSlot = () => {
    setModalState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        timeSlots: [
          ...prev.formData.timeSlots,
          { id: generateId(), days: [], startTime: '09:00', endTime: '10:00' }
        ]
      }
    }));
  };

  const removeSlot = (slotIndex) => {
    setModalState(prev => {
      const newSlots = prev.formData.timeSlots.filter((_, i) => i !== slotIndex);
      return { ...prev, formData: { ...prev.formData, timeSlots: newSlots } };
    });
  };

  const saveBlock = () => {
    const { formData, isEditing, originalBlockId } = modalState;
    if (!formData.title.trim()) return;

    // Validate that every time slot has at least one associated day
    const isValid = formData.timeSlots.every(slot => slot.days.length > 0);
    if (!isValid) {
      alert("נא לבחור לפחות יום אחד לכל זמן (Please select at least one day for each time slot)");
      return;
    }

    const groupId = isEditing ? originalBlockId : generateId();

    setSchedule(prev => {
      const newSchedule = { ...prev };

      // Wipe old blocks associated with this group ID
      if (isEditing) {
        DAYS_OF_WEEK.forEach(day => {
          newSchedule[day] = newSchedule[day].filter(b => b.id !== originalBlockId);
        });
      }

      // Distribute new time-slots into schedule day-columns
      formData.timeSlots.forEach(slot => {
        let finalStart = slot.startTime;
        let finalEnd = slot.endTime;
        if (timeToMinutes(finalEnd) <= timeToMinutes(finalStart)) {
          finalEnd = minutesToTimeStr(Math.min(timeToMinutes(finalStart) + 60, 1439));
        }

        slot.days.forEach(day => {
          newSchedule[day] = [...newSchedule[day], {
            id: groupId,
            title: formData.title,
            color: formData.color,
            startTime: finalStart,
            endTime: finalEnd,
            day: day
          }];
        });
      });

      return newSchedule;
    });

    closeModal();
  };

  const deleteBlock = () => {
    const { originalBlockId } = modalState;
    if (!originalBlockId) return;

    setSchedule(prev => {
      const newSchedule = { ...prev };
      DAYS_OF_WEEK.forEach(day => {
        newSchedule[day] = newSchedule[day].filter(b => b.id !== originalBlockId);
      });
      return newSchedule;
    });

    closeModal();
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // Main handler for saving the entire schedule
  const handleSaveSchedule = async () => {
    console.log("Attempting to save schedule:", schedule);
    const success = await saveScheduleToApi(schedule);

    if (success) {
      console.log("Schedule saved successfully.");
      alert("Schedule saved successfully! (Checks network/local cache)");
    } else {
      console.error("Failed to sync schedule to API.");
      alert("Failed to sync schedule to the server. Changes saved locally.");
    }
  }

  if (loading) return <div>Loading...</div>

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
            onClick={() => setModalState({
              isOpen: true,
              isEditing: false,
              originalBlockId: null,
              formData: {
                title: '',
                color: 'blue',
                timeSlots: [{ id: generateId(), days: [today], startTime: '09:00', endTime: '10:00' }]
              }
            })}
          >
            <Plus size={16} strokeWidth={2.5} /> <span>הוסף בלוק</span>
          </button>
          <button className='btn-save' onClick={() => handleSaveSchedule()}>
            <Save size={16} strokeWidth={2.5} /> <span>שמור</span>
          </button>
        </header>

        {/* Calendar Grid Container */}
        <div ref={scrollContainerRef} className="grid-scroll-area">
          <div className="grid-wrapper">

            {/* Grid Header (Days) */}
            <div className="grid-header">
              <div className="corner-block" />
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="day-header">
                  <span className={`day-label ${day === today ? 'is-today' : ''}`}>
                    יום {HEBREW_DAYS[day]}
                  </span>
                </div>
              ))}
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
                <div className="current-time-dot" style={{ top: `${currentTimeMins}px` }} />
              </div>

              {/* Main Grid Area */}
              <div className="grid-content">
                <div className="horizontal-lines">
                  {HOURS.map(hour => <div key={hour} className="line" />)}
                </div>

                <div className="current-time-line" style={{ top: `${currentTimeMins}px` }} />

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
                          <span className="duration-badge" dir="rtl">{formatDurationHebrew(height)}</span>
                        </div>
                      );
                    })}

                    {/* Time Blocks */}
                    {schedule[day].map(block => {
                      const startMins = timeToMinutes(block.startTime);
                      const durationMins = timeToMinutes(block.endTime) - startMins;
                      const height = Math.max(durationMins, 20);

                      return (
                        <div
                          key={block.id + startMins}
                          onClick={(e) => { e.stopPropagation(); openEdit(block); }}
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
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div >
        </div>

        {/* Modal */}
        {modalState.isOpen && (
          <div className="modal-overlay">
            <div className="modal-content" dir="rtl">
              <div className="modal-header">
                <h3>{modalState.isEditing ? 'עריכת בלוק' : 'בלוק חדש'}</h3>
                <button onClick={closeModal} className="btn-close"><X size={18} strokeWidth={2.5} /></button>
              </div >

              <div className="form-group">
                <label>שם האירוע</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="לדוגמה: עבודה, חדר כושר..."
                  className="form-input"
                  value={modalState.formData.title}
                  onChange={(e) => setModalState(prev => ({ ...prev, formData: { ...prev.formData, title: e.target.value } }))}
                />
              </div >

              <div className="form-group">
                <span>זמנים וימים</span>
                <div className="time-slots-container">
                  {modalState.formData.timeSlots.map((slot, index) => (
                    <div key={slot.id} className="time-slot-card">
                      <div className="days-row" style={{ display: 'flex', gap: '4px', marginBottom: '10px', direction: 'rtl' }}>
                        {DAYS_OF_WEEK.map(d => {
                          const isSelected = slot.days.includes(d);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={(e) => { e.preventDefault(); toggleDay(index, d); }}
                              style={{
                                flex: 1, padding: '6px 2px', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s',
                                border: `1px solid ${isSelected ? '#3b82f6' : '#d1d5db'}`,
                                backgroundColor: isSelected ? '#3b82f6' : 'transparent',
                                color: isSelected ? '#fff' : 'inherit',
                              }}
                            >
                              {HEBREW_DAYS[d]}
                            </button>
                          )
                        })}
                      </div>

                      <div className="form-row" style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: 0 }}>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                          <label style={{ fontSize: '12px' }}>התחלה</label>
                          <input type="time" className="form-input" value={slot.startTime} onChange={(e) => updateSlotTime(index, 'startTime', e.target.value)} />
                        </div>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                          <label style={{ fontSize: '12px' }}>סיום</label>
                          <input type="time" className="form-input" value={slot.endTime} onChange={(e) => updateSlotTime(index, 'endTime', e.target.value)} />
                        </div>
                        {modalState.formData.timeSlots.length > 1 && (
                          <button type="button" onClick={() => removeSlot(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '10px' }}>
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={(e) => addSlot()}
                    style={{ background: 'none', border: '1px dashed #3b82f6', color: '#3b82f6', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}
                  >
                    <Plus size={16} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '5px' }} /> הוסף זמנים נוספים
                  </button>
                </div>
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
                </div >
              </div >

              <div className="modal-actions">
                {modalState.isEditing ? (
                  <button onClick={e => deleteBlock()} className="btn-delete">
                    <Trash2 size={16} /> מחק
                  </button>
                ) : <div />}
                <div className="action-group">
                  <button onClick={closeModal} className="btn-cancel">ביטול</button>
                  <button onClick={saveBlock} disabled={!modalState.formData.title.trim()} className="btn-save">שמור</button>
                </div >
              </div>
            </div>
          </div>
        )}
      </div >
    </>
  );
}