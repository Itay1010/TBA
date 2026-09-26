import { HttpRes, ScheduleReq } from './apiModels';
import { UISchedule } from './indexedDB.h';
import {
    normalizeSchedule,
    toScheduleReq,
} from './apiUtils';

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

export async function saveScheduleToApi(schedule: UISchedule, userId: string = ''): Promise<boolean> {
    console.log("save sync payload:", schedule);
    const payload: ScheduleReq = toScheduleReq(schedule, userId);

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
        return true; // Indicate success
    }
    return false; // Indicate failure
}
