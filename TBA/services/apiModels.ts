// API response and request shapes matching server

export type Day = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

export type ClientBlock = {
    id: string;
    title: string;
    days: string;
    color: string;
    startTime: string;
    endTime: string;
};

export type RequestBlock = ClientBlock;

export type ClientSchedule = {
    user_id: string;
    blocks: ClientBlock[];
};

export type ScheduleReq = {
    user_id: string;
    blocks: ClientBlock[];
};

export type HttpRes<T> = {
    data?: T;
    error?: string;
    metadata?: Record<string, any>;
};
