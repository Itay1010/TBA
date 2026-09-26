// IndexedDB storage type definitions

export type UIBlock = {
    id: string;
    title: string;
    day: string;
    color: string;
    startTime: string;
    endTime: string;
    userId?: string;
};

export type UISchedule = Record<string, UIBlock[]>;

export interface IDBRecord {
    IDBKey: string;
    data: UISchedule | any;
}
