import { ClientBlock, HttpRes, ScheduleReq } from './apiModels';
import { UISchedule } from './indexedDB.h';
import { normalizeSchedule, toScheduleReq } from './apiUtils';
import { IDBGetSchedule } from './indexedDb';

export const defaultGetHeaders = { 'Accept': 'application/json' };
export const defaultPostHeaders = { 'Content-Type': 'application/json' };
export const SCHEDULE_API_PATH = '/api/schedule';

type DefaultOptionsType = { headers: HeadersInit; method: string; body: any };

export async function fetchFromApi<T = any>(
    reqPath: RequestInfo | URL,
    options: Record<string, any> = {}
): Promise<HttpRes<T> | T | null> {
    const defaultOptions: DefaultOptionsType = { headers: defaultGetHeaders, method: 'get', body: null };
    options = { ...defaultOptions, ...options };
    try {
        const res = await fetch(reqPath, options);
        const contentType = res.headers.get('Content-Type') || '';
        const isJson = contentType.includes('application/json');

        if (res.ok) {
            return isJson ? await res.json() : (await res.text() as unknown as T);
        } else {
            if (isJson) {
                const errJson = await res.json();
                console.error(`API Error (${res.status}):`, errJson);
                return errJson;
            } else {
                const errText = await res.text();
                console.error(`API Error (${res.status}):`, errText);
                return { error: errText || `HTTP ${res.status}` } as HttpRes<T>;
            }
        }
    } catch (error) {
        console.error(`Error: "${options.method}" to "${reqPath}" failed.\n`, error);
        return { error: error instanceof Error ? error.message : String(error) } as HttpRes<T>;
    }
}

export async function fetchSchedule(): Promise<UISchedule | null> {
    const rawRes = await fetchFromApi(SCHEDULE_API_PATH, { method: 'get' });
    if (!rawRes) return null;

    if (typeof rawRes === 'object' && 'error' in rawRes && rawRes.error && !('data' in rawRes && rawRes.data)) {
        console.error("fetchSchedule returned error:", rawRes.error);
        return null;
    }

    return normalizeSchedule(rawRes);
}

export async function saveScheduleToApi(schedule: UISchedule, userId: string = '', serverBaseline: UISchedule | null = null): Promise<boolean> {
    console.log("save sync payload:", schedule);
    const payload: ScheduleReq = toScheduleReq(schedule, userId);
    const oldSchedule: UISchedule | null = serverBaseline || await IDBGetSchedule();

    // 1. Delete removed blocks first if an old schedule exists
    console.log(oldSchedule);
    
    if (oldSchedule) {
        const didDelete = await deleteEmptyBlocks(userId, payload, oldSchedule);
        if (!didDelete) {
            console.warn("Failed to delete removed blocks, continuing to save current blocks.");
        }
    }

    // 2. Save / update current blocks
    const apiResponse = await fetchFromApi(SCHEDULE_API_PATH, {
        body: JSON.stringify(payload),
        method: "post",
        headers: defaultPostHeaders
    });

    if (apiResponse) {
        if (typeof apiResponse === 'object' && 'error' in apiResponse && apiResponse.error) {
            console.error("Failed to save schedule:", apiResponse.error);
            return false;
        }
        return true;
    }
    return false;
}

// Return all the blocks in blocksA that are not in blocksB by comparing their IDs
export function getBlocksDiff(blocksA: ClientBlock[], blocksB: ClientBlock[]): ClientBlock[] {
    const setB = new Set(blocksB.map(b => b.id));
    return blocksA.filter(block => !setB.has(block.id));
}

function isScheduleReq(schedule: any): schedule is ScheduleReq {
    return Boolean(schedule && typeof schedule === 'object' && 'user_id' in schedule && 'blocks' in schedule && Array.isArray(schedule.blocks));
}

export async function deleteEmptyBlocks(userId: string, newSchedule: UISchedule, oldSchedule: UISchedule): Promise<boolean>;
export async function deleteEmptyBlocks(userId: string, newSchedule: ScheduleReq, oldSchedule: UISchedule): Promise<boolean>;

export async function deleteEmptyBlocks(
    userId: string = '',
    newSchedule: UISchedule | ScheduleReq,
    oldSchedule: UISchedule
): Promise<boolean> {
    if (!oldSchedule || typeof oldSchedule !== 'object') {
        return true;
    }

    let newBlocks: ClientBlock[];
    if (isScheduleReq(newSchedule)) {
        newBlocks = newSchedule.blocks;
    } else {
        newBlocks = toScheduleReq(newSchedule, userId).blocks;
    }

    const oldBlocks = toScheduleReq(oldSchedule, userId).blocks;
    if (!oldBlocks || !newBlocks) {
        return false;
    }
    
    const blocksToDelete = getBlocksDiff(oldBlocks, newBlocks);
    console.log("diff: ", blocksToDelete);
    if (blocksToDelete.length === 0) {
        return true;
    }

    const deletePayload: ScheduleReq = {
        user_id: userId,
        blocks: blocksToDelete
    };

    const apiRes = await fetchFromApi(SCHEDULE_API_PATH, {
        body: JSON.stringify(deletePayload),
        method: "delete",
        headers: defaultPostHeaders
    });

    if (apiRes !== null) {
        if (typeof apiRes === 'object' && 'error' in apiRes && apiRes.error) {
            console.error("Failed to delete blocks:", apiRes.error);
            return false;
        }
        return true;
    }
    return false;
}
