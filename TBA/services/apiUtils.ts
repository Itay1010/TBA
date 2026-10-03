import { HttpRes, ClientBlock, ScheduleReq, Day } from './apiModels';
import { UIBlock, UISchedule } from './indexedDB.h';

export const DAYS_OF_WEEK: Day[] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
];

/**
 * Normalizes any day name string into a capitalized Day type ("Sunday", "Monday", ...).
 */
export function normalizeDayName(name: string): Day | null {
    if (!name || typeof name !== 'string') return null;
    const lower = name.trim().toLowerCase();
    const match = DAYS_OF_WEEK.find(d => d.toLowerCase() === lower);
    return match || null;
}

/**
 * Extracts and normalizes an array of capitalized day names from various block formats:
 * - JSON-stringified array (e.g. '["Sunday","Monday"]') from server ClientBlock
 * - Array of day strings (e.g. ['Sunday', 'Monday']) from server Block / UIBlock
 * - Comma-separated strings (e.g. 'Sunday, Monday')
 * - Legacy singular day string (e.g. block.day = 'Sunday')
 */
export function extractDays(b: any): Day[] {
    if (!b || typeof b !== 'object') return [];
    const rawDays = b.days !== undefined && b.days !== null ? b.days : b.day;
    const resultDays: Day[] = [];

    if (Array.isArray(rawDays)) {
        for (const item of rawDays) {
            const normalized = normalizeDayName(String(item));
            if (normalized && !resultDays.includes(normalized)) {
                resultDays.push(normalized);
            }
        }
    } else if (typeof rawDays === 'string') {
        const trimmed = rawDays.trim();
        if (trimmed) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    for (const item of parsed) {
                        const normalized = normalizeDayName(String(item));
                        if (normalized && !resultDays.includes(normalized)) {
                            resultDays.push(normalized);
                        }
                    }
                } else if (typeof parsed === 'string') {
                    const normalized = normalizeDayName(parsed);
                    if (normalized && !resultDays.includes(normalized)) {
                        resultDays.push(normalized);
                    }
                }
            } catch {
                // If not JSON, try splitting by comma
                const parts = trimmed.split(',');
                for (const p of parts) {
                    const normalized = normalizeDayName(p);
                    if (normalized && !resultDays.includes(normalized)) {
                        resultDays.push(normalized);
                    }
                }
            }
        }
    }

    return resultDays;
}

/**
 * Safely unpacks HttpRes wrapper if present.
 */
export function unpackHttpRes<T>(res: HttpRes<T> | T | null | undefined): T | null {
    if (!res) return null;
    if (typeof res === 'object' && ('data' in res || 'error' in res)) {
        const httpRes = res as HttpRes<T>;
        if (httpRes.error) {
            console.error('HttpRes Error:', httpRes.error, httpRes.metadata);
            return httpRes.data ?? null;
        }
        return httpRes.data ?? null;
    }
    return res as T;
}

/**
 * Transforms server Schedule or HttpRes<Schedule> or local object into normalized UISchedule.
 * Ensures the output shape is:
 * {
 *   [Day: "Sunday" | "Monday" | ...]: [
 *     {
 *       color: string,
 *       days: string[],
 *       endTime: string ("HH:MM"),
 *       id: string,
 *       startTime: string ("HH:MM"),
 *       title: string
 *     }
 *   ]
 * }
 */
export function normalizeSchedule(input: any): UISchedule {
    const result: UISchedule = {
        Sunday: [],
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: []
    };

    if (!input) {
        return result;
    }

    let raw = input;
    if (typeof raw === 'string') {
        try {
            raw = JSON.parse(raw);
        } catch {
            return result;
        }
    }
    if (raw && typeof raw === 'object' && 'data' in raw && raw.data) {
        raw = raw.data;
    }
    if (!raw) {
        return result;
    }

    // Check if `blocks` container exists (as in backend ClientSchedule or Schedule model)
    const blocksSource = raw.blocks !== undefined && raw.blocks !== null ? raw.blocks : raw;
    const userId = raw.user_id || raw.userId || '';

    // If blocks is an array (e.g. ScheduleReq or ClientSchedule.blocks format)
    if (Array.isArray(blocksSource)) {
        for (const b of blocksSource) {
            if (!b || typeof b !== 'object') continue;
            let days = extractDays(b);
            if (days.length === 0) {
                days = ["Sunday"];
            }

            const uiBlock: UIBlock = {
                color: b.color || 'blue',
                days: days,
                endTime: b.endTime || b.end_time || '10:00',
                id: b.id || b.block_id || '',
                startTime: b.startTime || b.start_time || '09:00',
                title: b.title || '',
                ...(userId || b.userId || b.user_id ? { userId: b.userId || b.user_id || userId } : {})
            };

            for (const d of days) {
                if (result[d]) {
                    // Avoid duplicate insertion of the same block id in the same day column
                    if (!result[d].some(existing => existing.id === uiBlock.id)) {
                        result[d].push({ ...uiBlock });
                    }
                }
            }
        }
        return result;
    }

    // Otherwise blocksSource is a day -> blocks map (e.g. UISchedule or legacy BlockDays)
    if (typeof blocksSource === 'object') {
        for (const d of DAYS_OF_WEEK) {
            const dayContent = blocksSource[d];
            if (Array.isArray(dayContent)) {
                for (const b of dayContent) {
                    if (!b || typeof b !== 'object') continue;
                    let days = extractDays(b);
                    if (days.length === 0) {
                        days = [d];
                    } else if (!days.includes(d)) {
                        days.push(d);
                    }

                    const uiBlock: UIBlock = {
                        color: b.color || 'blue',
                        days: days,
                        endTime: b.endTime || b.end_time || '10:00',
                        id: b.id || b.block_id || '',
                        startTime: b.startTime || b.start_time || '09:00',
                        title: b.title || '',
                        ...(userId || b.userId || b.user_id ? { userId: b.userId || b.user_id || userId } : {})
                    };

                    if (!result[d].some(existing => existing.id === uiBlock.id)) {
                        result[d].push(uiBlock);
                    }
                }
            } else if (dayContent && typeof dayContent === 'object') {
                // Single block object placed directly on the day key
                const b = dayContent;
                let days = extractDays(b);
                if (days.length === 0) {
                    days = [d];
                } else if (!days.includes(d)) {
                    days.push(d);
                }

                const uiBlock: UIBlock = {
                    color: b.color || 'blue',
                    days: days,
                    endTime: b.endTime || b.end_time || '10:00',
                    id: b.id || b.block_id || '',
                    startTime: b.startTime || b.start_time || '09:00',
                    title: b.title || '',
                    ...(userId || b.userId || b.user_id ? { userId: b.userId || b.user_id || userId } : {})
                };

                if (!result[d].some(existing => existing.id === uiBlock.id)) {
                    result[d].push(uiBlock);
                }
            }
        }
    }

    return result;
}

/**
 * Converts normalized UI schedule state into backend ScheduleReq payload format.
 * Deduplicates blocks by ID across the week and serializes days as a JSON string.
 */
export function toScheduleReq(uiSchedule: UISchedule, userId: string = ''): ScheduleReq {
    const newBlocks = new Map<string, UIBlock>();

    if (uiSchedule && typeof uiSchedule === 'object') {
        DAYS_OF_WEEK.forEach(dayName => {
            const dayBlocks = uiSchedule[dayName];
            if (Array.isArray(dayBlocks)) {
                dayBlocks.forEach(block => {
                    const id = block?.id || (block as any)?.block_id;
                    if (!id) return;

                    const existing = newBlocks.get(id);
                    if (!existing) {
                        // First time seeing this block: extract or initialize its days list with dayName
                        const rawDays = Array.isArray(block.days)
                            ? [...block.days]
                            : (typeof block.days === 'string' ? extractDays(block) : []);
                        if (!rawDays.includes(dayName)) {
                            rawDays.push(dayName);
                        }
                        newBlocks.set(id, {
                            ...block,
                            id,
                            days: rawDays
                        });
                    } else {
                        // Already seen on another day: ensure dayName is included in its days list
                        if (!existing.days.includes(dayName)) {
                            existing.days.push(dayName);
                        }
                    }
                });
            }
        });
    }

    const clientBlocks: ClientBlock[] = Array.from(newBlocks.values()).map(b => ({
        id: b.id,
        title: b.title || '',
        days: JSON.stringify(b.days || []),
        color: b.color || 'blue',
        startTime: b.startTime || (b as any).start_time || '09:00',
        endTime: b.endTime || (b as any).end_time || '10:00'
    }));

    return {
        user_id: userId,
        blocks: clientBlocks
    };
}
