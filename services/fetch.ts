export const defaultGetHeaders = { 'Accept': 'application/json' };
export const defaultPostHeaders = { 'Content-Type': 'application/json' };
export const SCHEDULE_API_PATH = '/api/schedule';

type defaultOptionsType = { headers: HeadersInit, method: string, body: any }
export async function fetchFromApi(reqPath: RequestInfo | URL, options: Record<string, any> = {}) {
    const defaultOptions: defaultOptionsType = { headers: defaultGetHeaders, method: 'get', body: null };
    options = { ...defaultOptions, ...options };
    try {
        const res = await fetch(reqPath, options);
        if (res.ok)
            return res.headers.get('Content-Type') === 'application/json' ? await res.json() : await res.text();
        else
            throw res.status;
    } catch (error) {
        console.error(`Error; "${options.method}" to "${reqPath}" failed.\n `, error);
        return null;
    }
}

export function fetchSchedule() {
    return fetchFromApi(SCHEDULE_API_PATH, { method: 'get' })
}


export function saveScheduleToApi(schedule: Schedule) {
    return fetchFromApi(SCHEDULE_API_PATH, { body: JSON.stringify(schedule), method: "post", headers: { 'Content-Type': 'application/json' } })
}
