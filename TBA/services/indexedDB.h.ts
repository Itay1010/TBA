// IndexedDB storage type definitions

export type UIBlock = {
    color: string;
    days: string[];
    endTime: string;
    id: string;
    startTime: string;
    title: string;
};

export type UISchedule = Record<string, UIBlock[]>;

export interface IDBRecord {
    IDBKey: string;
    data: UISchedule | any;
}
