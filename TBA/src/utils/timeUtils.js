export const generateId = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2));

export const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
};

export const minutesToTimeStr = (minutes) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

export const formatTime12h = (time24) => {
  if (!time24) return '';
  const [hour, minute] = time24.split(':');
  const h = parseInt(hour, 10);
  return `${h.toString().padStart(2, '0')}:${minute}`;
};

export const formatDurationHebrew = (totalMinutes) => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h > 0 && m > 0) return `${h} ש׳ ${m} דק׳`;
  if (h > 0) return `${h} ש׳`;
  return `${m} דק׳`;
};

export const getUnallottedBlocks = (dayBlocks) => {
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
