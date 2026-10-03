import React, { useState, useEffect, useRef } from 'react';
import './App.scss';
import { fetchSchedule, saveScheduleToApi } from '../services/fetch';
import { IDBGetSchedule, IDBSetSchedule } from '../services/indexedDb';
import { normalizeSchedule } from '../services/apiUtils';
import { getStoredUser, triggerOAuthLogin, fetchCurrentUser, logoutUser } from '../services/auth';
import { DAYS_OF_WEEK } from './constants/calendar';
import { generateId, timeToMinutes, minutesToTimeStr } from './utils/timeUtils';
import Header from './components/Header';
import CalendarGrid from './components/CalendarGrid/CalendarGrid';
import BlockModal from './components/BlockModal/BlockModal';
import LoginModal from './components/LoginModal/LoginModal';
import { useNotification } from './contexts/NotificationContext';

export default function App() {
  const { Notify } = useNotification();
  const [loginFormPending, setLoginFormPending] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const scrollContainerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [schedule, setSchedule] = useState(() => {
    return DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day]: [] }), {});
  });

  const lastSyncedScheduleRef = useRef(null);

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

  // Effect to save to IndexedDB whenever schedule changes (for local persistence)
  useEffect(() => {
    IDBSetSchedule(schedule);
  }, [schedule]);

  useEffect(() => {
    const getState = async () => {
      // 1. Fetch current user session from server /api/me
      try {
        const user = await fetchCurrentUser();
        setCurrentUser(user);
      } catch (authErr) {
        console.warn('Failed to verify session on mount:', authErr);
      }

      // 2. Load cached schedule from IndexedDB for immediate UI availability
      try {
        const dbSchedule = await IDBGetSchedule();
        if (dbSchedule && Object.keys(dbSchedule).length !== 0) {
          setSchedule(dbSchedule);
        }
      } catch (idbErr) {
        console.warn('Error reading from IndexedDB on mount:', idbErr);
      }

      // 3. Fetch fresh schedule from API
      try {
        const freshSchedule = await fetchSchedule();
        if (freshSchedule && Object.keys(freshSchedule).length !== 0) {
          await IDBSetSchedule(freshSchedule);
          setSchedule(freshSchedule);
          lastSyncedScheduleRef.current = freshSchedule;
        }
      } catch (apiError) {
        console.warn('API fetch failed, using IndexedDB schedule.', apiError);
      }
    };

    getState().finally(() => setLoading(false));
  }, []);

  // Effect to handle time ticking
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTimeMins(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Main handler for saving the entire schedule
  const handleSaveSchedule = async () => {
    console.log('Attempting to save schedule:', schedule);
    const userId = currentUser?.id || '';
    const success = await saveScheduleToApi(schedule, userId, lastSyncedScheduleRef.current);

    if (success) {
      lastSyncedScheduleRef.current = schedule;
      console.log('Schedule saved successfully.');
      Notify({
        title: 'שמירה בוצעה',
        text: 'לוח הזמנים נשמר בהצלחה!',
      });
    } else {
      console.error('Failed to sync schedule to API.');
      Notify({
        title: 'שגיאה בשמירה',
        text: 'לא ניתן לסנכרן את לוח הזמנים מול השרת. השינויים נשמרו מקומית.',
      });
    }
  };

  // Effect to handle Ctrl+S shortcut
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event instanceof KeyboardEvent) {
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
          event.preventDefault();
          handleSaveSchedule();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [schedule, currentUser]);

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
        timeSlots: [
          {
            id: generateId(),
            days: [day],
            startTime: startStr,
            endTime: endStr
          }
        ]
      }
    });
  };

  const openEdit = (data) => {
    // Collect all blocks that share this event's ID to populate time slots accurately
    const allOccurrences = [];
    for (const d of DAYS_OF_WEEK) {
      schedule[d].forEach((b) => {
        if (b.id === data.id) {
          allOccurrences.push({ ...b, day: d });
        }
      });
    }

    // Re-group occurrences into timeSlots based on matching time bounds
    const slotsMap = {};
    allOccurrences.forEach((occ) => {
      const key = `${occ.startTime}-${occ.endTime}`;
      if (!slotsMap[key]) {
        const initialDays = Array.isArray(occ.days) ? [...occ.days] : [];
        slotsMap[key] = {
          id: generateId(),
          startTime: occ.startTime,
          endTime: occ.endTime,
          days: initialDays
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

  const closeModal = () => setModalState((prev) => ({ ...prev, isOpen: false }));

  // Time Slot Modifiers
  const toggleDay = (slotIndex, day) => {
    setModalState((prev) => {
      const newSlots = prev.formData.timeSlots.map((slot, index) => {
        if (index === slotIndex) {
          return {
            ...slot,
            days: slot.days.includes(day)
              ? slot.days.filter((d) => d !== day)
              : [...slot.days, day]
          };
        }
        return slot;
      });

      return {
        ...prev,
        formData: { ...prev.formData, timeSlots: newSlots }
      };
    });
  };

  const updateSlotTime = (slotIndex, field, value) => {
    setModalState((prev) => {
      const newSlots = prev.formData.timeSlots.map((slot, index) => {
        if (index === slotIndex) {
          return { ...slot, [field]: value };
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
    setModalState((prev) => ({
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
    setModalState((prev) => {
      const newSlots = prev.formData.timeSlots.filter((_, i) => i !== slotIndex);
      return { ...prev, formData: { ...prev.formData, timeSlots: newSlots } };
    });
  };

  const saveBlock = () => {
    const { formData, isEditing, originalBlockId } = modalState;
    if (!formData.title.trim()) return;

    // Validate that every time slot has at least one associated day
    const isValid = formData.timeSlots.every((slot) => slot.days.length > 0);
    if (!isValid) {
      alert('נא לבחור לפחות יום אחד לכל זמן (Please select at least one day for each time slot)');
      return;
    }

    const groupId = isEditing ? originalBlockId : generateId();

    setSchedule((prev) => {
      const newSchedule = { ...prev };

      // Wipe old blocks associated with this group ID
      if (isEditing) {
        DAYS_OF_WEEK.forEach((day) => {
          newSchedule[day] = newSchedule[day].filter((b) => b.id !== originalBlockId);
        });
      }

      // Distribute new time-slots into schedule day-columns
      formData.timeSlots.forEach((slot) => {
        let finalStart = slot.startTime;
        let finalEnd = slot.endTime;
        if (timeToMinutes(finalEnd) <= timeToMinutes(finalStart)) {
          finalEnd = minutesToTimeStr(Math.min(timeToMinutes(finalStart) + 60, 1439));
        }

        slot.days.forEach((day) => {
          newSchedule[day] = [
            ...newSchedule[day],
            {
              id: groupId,
              title: formData.title,
              color: formData.color,
              startTime: finalStart,
              endTime: finalEnd,
              days: slot.days
            }
          ];
        });
      });

      return newSchedule;
    });

    closeModal();
  };

  const deleteBlock = () => {
    const { originalBlockId } = modalState;
    if (!originalBlockId) return;

    setSchedule((prev) => {
      const newSchedule = { ...prev };
      DAYS_OF_WEEK.forEach((day) => {
        newSchedule[day] = newSchedule[day].filter((b) => b.id !== originalBlockId);
      });
      return newSchedule;
    });

    closeModal();
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const handleLogin = async (provider) => {
    try {
      setLoginFormPending(true);
      await triggerOAuthLogin(provider);
    } catch (error) {
      setLoginFormPending(false);
      const errorMsg = error instanceof Error ? error.message : 'לא ניתן לבצע התחברות כעת.';
      Notify({
        title: 'שגיאה',
        text: errorMsg,
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
      Notify({
        title: 'התנתקות',
        text: 'התנתקת בהצלחה מלוח הזמנים.',
      });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div dir="rtl" className="app-container">
      {/* Header Component */}
      <Header
        onAddBlock={() =>
          setModalState({
            isOpen: true,
            isEditing: false,
            originalBlockId: null,
            formData: {
              title: '',
              color: 'blue',
              timeSlots: [
                { id: generateId(), days: [today], startTime: '09:00', endTime: '10:00' }
              ]
            }
          })
        }
        onSaveSchedule={handleSaveSchedule}
        onOpenLogin={() => setIsLoginOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Calendar Grid Component */}
      <CalendarGrid
        scrollRef={scrollContainerRef}
        schedule={schedule}
        currentTimeMins={currentTimeMins}
        today={today}
        onGridClick={handleGridClick}
        onBlockClick={openEdit}
      />

      {/* Modal Dialog Component */}
      <BlockModal
        isOpen={modalState.isOpen}
        isEditing={modalState.isEditing}
        formData={modalState.formData}
        onClose={closeModal}
        onSave={saveBlock}
        onDelete={deleteBlock}
        onTitleChange={(title) =>
          setModalState((prev) => ({
            ...prev,
            formData: { ...prev.formData, title }
          }))
        }
        onColorChange={(color) =>
          setModalState((prev) => ({
            ...prev,
            formData: { ...prev.formData, color }
          }))
        }
        onToggleDay={toggleDay}
        onUpdateSlotTime={updateSlotTime}
        onAddSlot={addSlot}
        onRemoveSlot={removeSlot}
      />

      {/* Login Modal Component */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLogin={handleLogin}
        isPending={loginFormPending}
      />
    </div>
  );
}