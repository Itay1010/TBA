// API response and request shapes matching server

export type Day = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

export type Block = {
    block_id: string;
    user_id: string;
    day: Day | string;
    title: string;
    color: string;
    start_time: string;
    end_time: string;
};

export type BlockDays = Partial<Record<Day | string, Block[]>>;

export type Schedule = {
    user_id: string;
    blocks?: BlockDays;
};

export type RequestBlock = {
    id: string;
    title: string;
    day: string;
    color: string;
    startTime: string;
    endTime: string;
};

export type ScheduleReq = {
    user_id: string;
    blocks: RequestBlock[];
};

export type HttpRes<T> = {
    data?: T;
    error?: string;
    metadata?: Record<string, any>;
};
