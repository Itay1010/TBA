import { HttpRes, RequestBlock, ScheduleReq, Day } from './apiModels';
import { UISchedule } from './indexedDB.h';

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
 * Handles both snake_case (start_time, end_time, block_id) from Go Block model and camelCase from UI.
 */
export function normalizeSchedule(input: any): UISchedule {
    const result: UISchedule = {};
    for (const d of DAYS_OF_WEEK) {
        result[d] = [];
    }

    if (!input || typeof input !== 'object') {
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

    if ('data' in raw && raw.data) {
        raw = raw.data;
    }

    // Check if `blocks` container exists (as in backend Schedule model)
    const blocksMap = raw.blocks && typeof raw.blocks === 'object' ? raw.blocks : raw;
    const userId = raw.user_id || '';

    // If blocks is an array (e.g. ScheduleReq format), group by day
    if (Array.isArray(blocksMap)) {
        for (const b of blocksMap) {
            const dayName = b.day || 'Sunday';
            if (!result[dayName]) result[dayName] = [];
            result[dayName].push({
                id: b.id || b.block_id || '',
                title: b.title || '',
                day: dayName,
                color: b.color || 'blue',
                startTime: b.startTime || b.start_time || '09:00',
                endTime: b.endTime || b.end_time || '10:00',
                userId: b.user_id || userId
            });
        }
        return result;
    }

    // Otherwise it is a map of day -> blocks array
    for (const d of DAYS_OF_WEEK) {
        const list = blocksMap[d];
        if (Array.isArray(list)) {
            result[d] = list.map((b: any) => ({
                id: b.id || b.block_id || '',
                title: b.title || '',
                day: b.day || d,
                color: b.color || 'blue',
                startTime: b.startTime || b.start_time || '09:00',
                endTime: b.endTime || b.end_time || '10:00',
                userId: b.user_id || userId
            }));
        }
    }

    return result;
}

/**
 * Converts normalized UI schedule state into backend ScheduleReq payload format.
 */
export function toScheduleReq(uiSchedule: UISchedule, userId: string = ''): ScheduleReq {
    const flatBlocks: RequestBlock[] = [];

    if (uiSchedule && typeof uiSchedule === 'object') {
        for (const day of Object.keys(uiSchedule)) {
            const dayBlocks = uiSchedule[day];
            if (Array.isArray(dayBlocks)) {
                for (const b of dayBlocks) {
                    flatBlocks.push({
                        id: b.id || (b as any).block_id || '',
                        title: b.title || '',
                        day: b.day || day,
                        color: b.color || 'blue',
                        startTime: b.startTime || (b as any).start_time || '',
                        endTime: b.endTime || (b as any).end_time || ''
                    });
                }
            }
        }
    }

    return {
        user_id: userId,
        blocks: flatBlocks
    };
}
