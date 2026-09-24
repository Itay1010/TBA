type Days = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

type Block = {
    block_id: string,
    user_id: string,
    day: string,
    title: string,
    color: string,
    start_time: string,
    end_time: string,
}

type Schedule = {
    user_id: string,
    blocks: { [K in Days]: Block[] }
};